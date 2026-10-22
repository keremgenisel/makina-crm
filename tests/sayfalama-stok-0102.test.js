// Spec 0102: kaynak taramaları. Makina Stoğu sayfalanmaz (yasak kimlikler, kap, kanca kalır), panonun beşinci sayısının adı
// ve ipucu tek yerde, değişmeyen dosyalar. Ekran ve hız kriterleri tests/ui/sayfalama-stok-0102.test.jsx'te.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PANO_KALAN_ADI, PANO_KALAN_IPUCU } from "../src/lib/stokDurumu";

const kok = path.resolve(__dirname, "..");
const oku = (p) => fs.readFileSync(path.join(kok, p), "utf-8");
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const TAB = "src/components/stock/MakinaStokTab.jsx";
const PANO = "src/components/stock/PartiUretimPanosu.jsx";

describe("Spec 0102: Makina Stoğu'nun kaynağı (R1, R1/2, R3, C1–C4/2)", () => {
  it("AC-12 (Karar 25): sayfalama kimlikleri dosyada yok (kelime sınırıyla, yorumlar atılarak)", () => {
    const k = yorumsuz(oku(TAB));
    for (const ad of ["Pagination", "usePagination", "page", "setPage", "perPage", "paged", "PER_PAGE"]) {
      expect(k, ad).not.toMatch(new RegExp(`\\b${ad}\\b`));
    }
    expect(k).not.toMatch(/hooks\/usePagination/);
    expect(oku(TAB)).toMatch(/Anasayfa kutusuyla/); // "sayfa" sözcüğü taranmaz: yorum yerinde, alarm vermez (ölçüm 13)
  });
  it("AC-13: elle pager yok (sayfa dilimi ve önceki/sonraki metinleri)", () => {
    const k = oku(TAB);
    expect(k).not.toMatch(/\.slice\(\(page/);
    expect(k).not.toMatch(/‹ Önceki|Sonraki ›/);
  });
  it("AC-14: paylaşılan kanca kalır ve ekran tam kümeyi çizer", () => {
    const k = oku(TAB);
    expect(k).toMatch(/const \{ search, setSearch, filtered, oncesi \} = useFilteredList\(stock, \{/);
    expect(k).toMatch(/\{filtered\.map\(s => \(/);
  });
  it("AC-15: useFilteredList bu işte değişmedi (imza ve dilim satırı)", () => {
    const k = oku("src/hooks/useFilteredList.js");
    expect(k).toMatch(/export const useFilteredList = \(data, \{ searchFields, searchFn, filterFn, ikinciFiltre, sortFn, perPage = 10 \} = \{\}\) =>/);
    expect(k).toMatch(/const paged = filtered\.slice\(\(page - 1\) \* perPage, page \* perPage\);/);
    expect(k).toMatch(/return \{ search, setSearch, page, setPage, filtered, paged, perPage, oncesi \};/);
  });
  it("AC-16 (R7): Parça Stoğu ve Yedek Parça Satışı sayfalı kalır", () => {
    for (const f of ["src/components/stock/PartStokTab.jsx", "src/components/stock/YedekParcaSatisTab.jsx"]) {
      expect((oku(f).match(/<Pagination\b/g) || []).length, f).toBe(1);
    }
  });
  it("AC-37 (R3): liste kabı bugünkü çağrı; yükseklik sınırı, ikinci kaydırma, 'daha fazla göster' yok", () => {
    const k = oku(TAB);
    expect(k).toMatch(/<KartBolum varyant="kart" style=\{\{ padding: 0, overflow: "auto" \}\}>/);
    expect(k).not.toMatch(/maxHeight|overflowY|[Dd]aha fazla göster/);
  });
  it("R1/2 (AC-38'in kaynak yarısı): iki süzgeç işleyicisi işini yapar, setPage çağırmaz", () => {
    const k = oku(TAB);
    expect(k).toMatch(/onClick=\{\(\) => setModelFilter\(active \? null : m\)\}/);
    expect(k).toMatch(/onChange=\{v => setDurumSuzgec\(v\)\}/);
  });
  it("AC-41 (X9): liste sanallaştırılmaz, pencereleme bağımlılığı yok", () => {
    const pkg = JSON.parse(oku("package.json"));
    const bagimliliklar = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(bagimliliklar.filter(d => /react-window|react-virtual|virtuoso|virtualized/.test(d))).toEqual([]);
    expect(oku(TAB)).not.toMatch(/react-window|react-virtual|virtuoso|FixedSizeList|VariableSizeList/);
  });
  it("AC-18 (R8): sözlükte Makina Stoğu istisnası üçüncü madde, gerekçe ve geri dönüş notuyla", () => {
    const s = oku("docs/tasarim-sozlugu.md");
    const b = s.slice(s.indexOf("## Sayfalama (spec 0062)"), s.indexOf("## Bilinen borç"));
    const maddeler = b.split("\n").filter(l => l.startsWith("- **İstisna"));
    expect(maddeler.map(l => /spec (\d+)/.exec(l)[1])).toEqual(["0080", "0084", "0102"]);
    const madde = b.slice(b.indexOf("- **İstisna (spec 0102)"));
    expect(madde).toMatch(/Makina Stoğu/);
    expect(madde).toMatch(/sayım listesi/);
    expect(madde).toMatch(/Yavaşlama\s+görülürse sayfalama ayrı bir spec'le geri gelir/);
    expect(b).toMatch(/elle `setPage\(1\)` yazılmaz/); // kural maddesi dokunulmadı
  });
});

describe("Spec 0102: panonun beşinci sayısı (R10–R15/2, C5, C6)", () => {
  it("AC-40 / AC-25: ad ve ipucu stokDurumu.js'te iki sabit; cümle adı sabitten kurar; pano ikisini okur, kendi yazmaz", () => {
    expect(PANO_KALAN_ADI).toBe("Planlanandan kalan");
    expect(PANO_KALAN_IPUCU).toBe("Planlanandan kalan = planlanan − (montajda + satışa hazır + satıldı). Satılan makina partiye bağlı müşteri kayıtlarından sayılır.");
    expect(oku("src/lib/stokDurumu.js")).toMatch(/export const PANO_KALAN_IPUCU = `\$\{PANO_KALAN_ADI\} = /);
    const p = oku(PANO);
    expect(p).toMatch(/import \{[^}]*\bPANO_KALAN_ADI\b[^}]*\bPANO_KALAN_IPUCU\b[^}]*\} from "\.\.\/\.\.\/lib\/stokDurumu"/);
    expect(p).toMatch(/\["kalan", PANO_KALAN_ADI\]/);
    expect(p).toMatch(/<Ipucu>\{PANO_KALAN_IPUCU\}<\/Ipucu>/);
    expect(p).not.toMatch(/Planlanandan kalan|planlanan −/);
    const kopyalar = ["src", "scripts"].flatMap(function gez(d) {
      return fs.readdirSync(path.join(kok, d), { withFileTypes: true }).flatMap(e =>
        e.isDirectory() ? gez(path.join(d, e.name)) : /\.(jsx?|mjs|cjs)$/.test(e.name) && oku(path.join(d, e.name)).includes("Planlanandan kalan") ? [path.join(d, e.name)] : []);
    });
    expect(kopyalar).toEqual([path.join("src", "lib", "stokDurumu.js")]);
  });
  it("AC-24 (Karar 26): pano kaynağında tek başına \"Kalan\" dizesi yok", () => {
    expect(oku(PANO)).not.toMatch(/"Kalan"|>Kalan\b/);
  });
  it("AC-26 (R15/2): öteki dört ad bugünkü yerinde", () => {
    expect(oku(PANO)).toMatch(/\["planlanan", "Planlanan"\], \["montajda", DURUM_ADLARI\.montaj\], \["hazir", DURUM_ADLARI\.hazir\], \["satildi", "Satıldı"\], \["kalan", PANO_KALAN_ADI\],/);
  });
  it("AC-30 (R14): ölçüm kimlikleri aynı", () => {
    const p = oku(PANO);
    for (const id of ["pano-sayi-${k}", "pano-satir", "pano-toplam", "pano-fazla", "parti-uretim-panosu"]) expect(p, id).toContain(id);
  });
});

describe("Spec 0102: değişmeyenler (R16–R18, Karar 27)", () => {
  it("AC-33 / AC-34: veri, sunucu, birleştirme ve izin dosyaları bu işin sabitlerini ve listeyi anmaz", () => {
    for (const f of ["electron/db.cjs", "electron/serverAuth.cjs", "src/lib/merge.js", "src/components/settings/serverPermissionDefs.js"]) {
      expect(oku(f), f).not.toMatch(/PANO_KALAN|Planlanandan kalan/);
    }
  });
  it("AC-44 (R18): parti seçeneğinin adı ve Üretim Partileri görünümü etkilenmez", () => {
    expect(oku("src/lib/stokDurumu.js")).toMatch(/export const partiSecenekAdi = \(p\) => `\$\{p\.ad\}\$\{partiAcikMi\(p\) \? " \(açık\)" : ""\}`;/);
    expect(oku("src/components/gider/UretimPartileri.jsx")).not.toMatch(/PANO_KALAN|Planlanandan kalan/);
  });
  it("AC-43 (Karar 14): yeni kanıt ekranının fikstürü on dört makina satırı", () => {
    const k = oku("scripts/evidence/0009-sayfa.jsx");
    expect(k).toMatch(/const STOK_0102 = Array\.from\(\{ length: 14 \}/);
    expect(k).toMatch(/"stok-0102-uzun-liste": \[stok0100\("makina", \{ stock: STOK_0102 \}\), \[\]\],/);
  });
  it("triyaj (bulgu 3): MakinaStokTab'ın yorumu düşen R15/4'ü geçerliymiş gibi anmaz", () => {
    const k = oku(TAB);
    for (const l of k.split("\n").filter(l => l.includes("R15/4"))) expect(l).toMatch(/spec 0102 ile düştü/);
  });
  it("triyaj (bulgu 4): CLAUDE.md'nin 0062 satırı LISTELER tablosunun çağrı sayısını (on) yazar", () => {
    const c = oku("CLAUDE.md");
    expect(c).toMatch(/tabloda beş dosya, on çağrı kaldı/);
    expect(c).not.toMatch(/dokuz çağrı/);
    expect(oku("tests/sayfalama-0062.test.js")).toMatch(/toBe\(10\)/);
  });
});
