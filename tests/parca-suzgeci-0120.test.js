// Spec 0120: servis formunun parça arama süzgeci. Saf yardımcı (parcaSuzgeci), metin sabitleri, kaynak taramaları,
// tasarım sözlüğünün borç maddesi, kanıt eşlemesi ve kapanış belge düzeni.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { parcaSuzgeci, parcaKalipIsiMi, KALIP_ISI_BAYRAGI, TUM_PARCALAR, PARCA_SUZGEC_IBARESI, PARCA_SUZGEC_NEDENI } from "../src/lib/kalipTamiri";

const oku = (p) => readFileSync(p, "utf-8");
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const TIPLER = [
  { id: "standart", ad: "Standart", sistem: true },
  { id: "bant", ad: "Bant", sistem: true },
  { id: "kalip", ad: "Kalıp Revize", kalipIsi: true },
  { id: "eski", ad: "Eski Kalıp", kalipIsi: true, deletedAt: "2026-10-01" },
];
const PARCALAR = [
  { id: 1, ad: "100_ERKEK KALIPLAR REVİZE", tip: "Kalıp Revize" },
  { id: 2, ad: "KALIP MİLİ", tip: "Standart" },
  { id: 3, ad: "Bant", tip: "Bant" },
  { id: 4, ad: "Tipsiz rulman" },
  { id: 5, ad: "140_DİŞİ KALIP REVİZE", tip: "Kalıp Revize" },
  { id: 6, ad: "Çöp tipli", tip: "Eski Kalıp" },
];

describe("Spec 0120 saf yardımcı parcaSuzgeci", () => {
  it("AC-2, AC-27: kalıp işi kümesi, sayısı ve karar tek çağrıda; dört alan", () => {
    const r = parcaSuzgeci(PARCALAR, TIPLER, false);
    expect(Object.keys(r).sort()).toEqual(["kalipSayisi", "liste", "suzulebilir", "suzuluMu"]);
    expect(r.liste.map(p => p.id)).toEqual([1, 5]);
    expect(r).toMatchObject({ kalipSayisi: 2, suzulebilir: true, suzuluMu: true });
  });
  it("AC-5: tumu doğruysa tam katalog, sayı yine kalıp işi sayısı", () => {
    const r = parcaSuzgeci(PARCALAR, TIPLER, true);
    expect(r.liste).toBe(PARCALAR);
    expect(r).toMatchObject({ kalipSayisi: 2, suzulebilir: true, suzuluMu: false });
  });
  it("AC-18, R10: ölçüt parçanın tipi; boş tip Standart, çöpteki tip kalıp işi değil, ad ölçüt değil", () => {
    const r = parcaSuzgeci(PARCALAR, TIPLER, false);
    expect(r.liste.every(p => parcaKalipIsiMi(p, TIPLER))).toBe(true);
    expect(r.liste.map(p => p.ad)).not.toContain("KALIP MİLİ");
    expect(r.liste.map(p => p.ad)).not.toContain("Çöp tipli");
  });
  it.each([["AC-9 boş dizi", []], ["AC-21 null", null], ["AC-21 undefined", undefined], ["AC-10 işaretsiz tipler", TIPLER.map(t => ({ ...t, kalipIsi: false }))]])(
    "%s: süzme uygulanmaz, küme boşalmaz", (_, tipler) => {
      const r = parcaSuzgeci(PARCALAR, tipler, false);
      expect(r).toEqual({ liste: PARCALAR, kalipSayisi: 0, suzulebilir: false, suzuluMu: false });
    });
  it("AC-16, AC-24: boş ya da dizi olmayan katalog güvenli; sayı sıfırken süzülemez", () => {
    expect(parcaSuzgeci([], TIPLER, false)).toEqual({ liste: [], kalipSayisi: 0, suzulebilir: false, suzuluMu: false });
    expect(parcaSuzgeci(null, TIPLER, false).liste).toEqual([]);
  });
});

// ── Kaynak taramaları ────────────────────────────────────────────────────────────────────────────────────────────────
const SF = oku("src/components/ServiceForm.jsx");
const SFK = yorumsuz(SF);
const KT = oku("src/lib/kalipTamiri.js");

describe("Spec 0120 kaynak taramaları", () => {
  it("AC-18: parcaSuzgeci parcaKalipIsiMi'yi çağırır; ServiceForm tip karşılaştırması ve kalipIsi okuması yazmaz", () => {
    const govde = KT.slice(KT.indexOf("export const parcaSuzgeci"), KT.indexOf("// ── Servis kaydı"));
    expect(govde).toContain("parcaKalipIsiMi(");
    expect(SFK).not.toMatch(/kalipIsi\b/);
    expect(SFK).not.toMatch(/\.tip\b/);
    expect(SFK).not.toMatch(/partTypeDefs\.(find|filter|some)\(/);
  });
  it("AC-19: tam katalog yalnız YedekParcaSatisForm'un iki kutusunda; ServiceForm süzülmüş kümeyi alır; öteki seçiciler aynen", () => {
    const yp = oku("src/components/YedekParcaSatisForm.jsx");
    expect(yp.match(/<SearchPick items=\{parts\}/g)).toHaveLength(2);
    expect(SFK).not.toContain("items={parts}");
    expect(SFK).toContain("<SearchPick items={parcaKumesi.liste}");
    expect(oku("src/components/ModelsManager.jsx")).toContain("<SearchPick items={parts.filter(p => p.models?.includes(mForm.model))}");
    const ps = oku("src/components/stock/PartStokTab.jsx");
    expect(ps).toContain("options={parts.map(p => ({ value: String(p.id), label: p.ad }))}");
    expect(ps).not.toMatch(/\bitems=/);
    expect(oku("src/components/Analiz.jsx")).not.toMatch(/SearchPick|\bitems=/);
    const sayilar = readdirSync("src/components", { recursive: true }).filter(f => /\.jsx$/.test(f))
      .filter(f => oku(path.join("src/components", f)).includes("<SearchPick items={parts}"));
    expect(sayilar.sort()).toEqual(["YedekParcaSatisForm.jsx"]);
  });
  it("AC-20: (a) dört metin ServiceForm'da düz yok; (b) iki yeni cümle depo genelinde tek kopya", () => {
    for (const m of [KALIP_ISI_BAYRAGI, TUM_PARCALAR, PARCA_SUZGEC_IBARESI, PARCA_SUZGEC_NEDENI]) expect(SFK.includes(m), m).toBe(false);
    const kok = ["src", "electron", "scripts"];
    const dosyalar = kok.flatMap(d => readdirSync(d, { recursive: true }).map(f => path.join(d, f))).filter(f => /\.(m?js|jsx|cjs)$/.test(f) && !f.includes(`${path.sep}map${path.sep}`));
    const cumleKaynak = (c) => c.replace(/"/g, "\\\"");
    for (const c of [PARCA_SUZGEC_IBARESI, PARCA_SUZGEC_NEDENI]) {
      const bulunan = dosyalar.filter(f => { const t = oku(f); return t.includes(c) || t.includes(cumleKaynak(c)); });
      expect(bulunan, c).toEqual([path.join("src", "lib", "kalipTamiri.js")]);
    }
    // "Tüm parçalar" düz metni yalnız PartManager'ın kendi seçeneği (gerekçeli istisna) ve sabitin kendisi.
    const tum = dosyalar.filter(f => { const t = yorumsuz(oku(f)); return t.includes(`"${TUM_PARCALAR}"`) || t.includes(`>${TUM_PARCALAR}<`); });
    expect(tum.sort()).toEqual([path.join("src", "components", "PartManager.jsx"), path.join("src", "lib", "kalipTamiri.js")].sort());
  });
  it("AC-26: ilk seçenek KALIP_ISI_BAYRAGI'ndan; aynı değerli ikinci sabit yok", () => {
    expect(SFK).toMatch(/label: KALIP_ISI_BAYRAGI/);
    const src = readdirSync("src", { recursive: true }).map(f => path.join("src", f)).filter(f => /\.(js|jsx)$/.test(f));
    const sabitler = src.flatMap(f => (oku(f).match(/=\s*"Kalıp işi"/g) || []).map(() => f));
    expect(sabitler).toEqual([path.join("src", "lib", "kalipTamiri.js")]);
  });
  it("AC-27: ServiceForm rozet sayısını ayrıca türetmez; tek parcaSuzgeci çağrısı", () => {
    expect(SFK.match(/parcaSuzgeci\(/g)).toHaveLength(1);
    expect(SFK).toContain("sayi: parcaKumesi.kalipSayisi");
    expect(SFK).toContain("sayi: parts.length");
    expect(SFK).not.toMatch(/parts\.filter\(/);
  });
  it("AC-28: varsayılana dönüş kutu kapanınca ServiceForm'daki tek efektle; KalipAtolyeAlani süzgeci bilmez", () => {
    expect(SFK).toContain("const kalipKutusu = kutuAcikMi(form);");
    expect(SFK).toContain("useEffect(() => { if (!kalipKutusu) setTumParcalar(false); }, [kalipKutusu]);");
    expect(SFK.match(/setTumParcalar\(/g)).toHaveLength(2);
    const ka = oku("src/components/KalipAtolyeAlani.jsx");
    expect(ka).not.toMatch(/tumParcalar|parcaSuzgeci|TUM_PARCALAR/);
    expect(ka).toContain("kutuDegistir");
  });
  it("AC-29, R16: SearchPick imzası aynı; ServiceForm'un çağrısı yalnız bugünkü prop'ları geçirir", () => {
    expect(oku("src/components/ui.jsx")).toContain(
      'export const SearchPick = ({ items, onPick, getLabel = (x) => String(x), getKey = (x) => getLabel(x), placeholder = "Ara...", emptyText = "Bulunamadı." }) => {');
    const i = SF.indexOf("<SearchPick items={parcaKumesi.liste}");
    const cagri = SF.slice(i, SF.indexOf("/>", SF.indexOf("disTedarik: false", i)) + 2);
    const proplar = [...cagri.matchAll(/\s([a-zA-Z]+)=\{|\s([a-zA-Z]+)="/g)].map(m => m[1] || m[2]);
    expect(proplar.sort()).toEqual(["getKey", "getLabel", "items", "onPick", "placeholder"]);
  });
  it("AC-30: köprünün yazılabilir listesi ve partTypeDefs satırı değişmedi", () => {
    const sp = oku("src/components/ServisPencere.jsx");
    expect(sp).toContain('const YAZILABILIR = ["services", "yedekParcaSatislar", "partSales", "partStock", "partStockLog", "dosyalar"];');
    expect(sp).toContain("uretimFormlari: [], partTypeDefs: null, // spec 0115 R11/2, R32: salt okunur (YAZILABILIR'e girmez, C13)");
  });
  it("R12, C2: servis kaydına, sunucuya ve izinlere hiçbir şey eklenmez", () => {
    for (const f of ["electron/serverAuth.cjs", "electron/db.cjs", "src/lib/merge.js", "src/components/settings/serverPermissionDefs.js"])
      expect(oku(f), f).not.toMatch(/tumParcalar|parcaSuzgeci|PARCA_SUZGEC/);
  });
});

describe("Spec 0120 belge ve kanıt", () => {
  it("AC-31: tasarım sözlüğünün borç bölümünde MakinaStokTab'ın onay kutusu yakın kopya, üçüncü kopyada taşınma cümlesi", () => {
    const doc = oku("docs/tasarim-sozlugu.md");
    const borc = doc.slice(doc.indexOf("## Bilinen borç"), doc.indexOf("### Ödenen borç"));
    const madde = borc.split("\n").find(l => l.includes("spec 0120"));
    expect(madde).toBeTruthy();
    for (const p of ["src/components/stock/MakinaStokTab.jsx", "showAllParts", "src/components/ServiceForm.jsx", "Üçüncü kopya"]) expect(madde, p).toContain(p);
  });
  it("AC-32, AC-33: üç yeni ekran ServiceForm.jsx anahtarında 0120 raporuyla; raporda adım uyarısı yok", () => {
    const e = JSON.parse(oku("docs/evidence/kanit-eslemesi.json"));
    const k = (e.dosyalar || e)["src/components/ServiceForm.jsx"];
    const yeni = k.filter(x => /0120-(taban-)?piksel-raporu\.json$/.test(x.rapor)).map(x => x.ekran);
    for (const ad of ["servis-formu-0120-suzulu", "servis-formu-0120-tum", "servis-formu-0120-suzgecsiz"]) expect(yeni, ad).toContain(ad);
    const rapor = JSON.parse(oku("docs/evidence/0120-piksel-raporu.json"));
    expect(JSON.stringify(rapor)).not.toContain("adimUyarilari");
  });
});

describe("Spec 0120 CLAUDE.md maddesinin yeri (triyaj)", () => {
  it("0120 maddesi 0115 bölümünün sonunda, 0115'in sürüm notu ve test listesinin arkasında (0120'nin sürüm notu yok)", () => {
    const claude = oku("CLAUDE.md");
    const b = claude.slice(claude.indexOf("(spec 0115, plan"), claude.indexOf("### Finans: ödeme işareti"));
    const satirlar = b.split("\n").filter(l => l.startsWith("- **"));
    expect(satirlar.at(-1)).toContain("(spec 0120, plan");
    expect(satirlar.at(-2)).toMatch(/^- \*\*Sürüm notu \(plan §7\):\*\*/);
  });
});

// Kapanış belge düzeni: 0120'nin maddesi CLAUDE.md'nin 0115 bölümünde (DoD), ayrı bölüm açılmaz.
describe("Spec 0120: kapanış belge düzeni", () => {
  it("plan done'daysa: 0115 bölümündeki 0120 maddesi commit taşır, eski kopya yok, README Tamamlandı", () => {
    if (!existsSync("specs/done/0120-uygulama-plani.md")) return;
    const claude = oku("CLAUDE.md");
    const b = claude.slice(claude.indexOf("(spec 0115, plan"), claude.indexOf("### Finans: ödeme işareti"));
    const satirlar = b.split("\n");
    const madde = satirlar.find(l => l.includes("(spec 0120, plan"));
    expect(madde).toMatch(/Tamamlandı: commit `[0-9a-f]{7}`/);
    expect(madde).not.toMatch(/specs\/0120-/);
    expect(existsSync("specs/0120-parca-aramasi-kalip-isi-suzgeci.md")).toBe(false);
    expect(oku("specs/README.md")).toMatch(/\| \*\*0120\*\* \| [^|]*\(Tamamlandı\)/);
  });
});
