// Spec 0094: Faaliyet Haritası'na beş ilin ilçe kırılımı. Kaynak taramaları ve değişmeyenler; veri kriterleri
// tests/ilce-veri.test.js, harita kriterleri tests/ui/harita.test.jsx, form kriterleri tests/ui/ilce-formlari-0094.test.jsx.
// AC-10, AC-11, AC-22 ve AC-26 ölçüm kriteridir (AC-32): çıktıları specs/…/0094-uygulama-plani.md §7'de.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { BLOB_SECTIONS, EYLEM_IDLERI, AYAR_ALAN_SEKMELERI } from "../electron/serverAuth.cjs";
import { MERGE_KEYS } from "../src/lib/merge";

const kod = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
const tara = (d) => readdirSync(d).flatMap(e => { const p = `${d}/${e}`; return statSync(p).isDirectory() ? tara(p) : /\.(jsx?|cjs|mjs)$/.test(e) ? [p] : []; });
const URETICI = readFileSync("scripts/gen-map-paths.cjs", "utf8");
const specYolu = ["specs", "specs/done"].map(d => `${d}/0094-harita-bes-il-ilce-kirilimi.md`).find(existsSync);

describe("Spec 0094: üretici (R3, R3/2, C7, C9)", () => {
  it("AC-6/2: ad düzeltme sözlüğüne yalnız 'Yalova merkez' eklendi; 'Çanakkale merkez' düzeltilmedi", () => {
    const sozluk = URETICI.match(/const ILCE_ISIM_DUZELT = (\{[^}]*\});/)[1];
    expect(JSON.parse(sozluk)).toEqual({ "Imbros": "Gökçeada", "Ayvacik": "Ayvacık", "Prince Islands": "Adalar", "Yalova merkez": "Yalova" });
  });
  it("AC-25: ilçesi bulunamayan il üretimi keser (boş dosya yazmaz)", () => {
    expect(URETICI).toContain('throw new Error("İlçesi bulunamayan il: " + il);');
  });
  it("AC-25/2: silme doğrulamadan önce çalışıyor (C9: bu işte değişmedi) ve kurtarma yolu yazılı", () => {
    const sil = URETICI.indexOf('fs.rmSync(path.join(CIKTI, "ilce")');
    const hata = URETICI.indexOf('throw new Error("İlçesi bulunamayan il: ');
    expect(sil).toBeGreaterThan(0);
    expect(sil).toBeLessThan(hata);
    expect(URETICI).toContain("git checkout -- src/lib/map/ilce");
    expect(specYolu).toBeTruthy();
    expect(readFileSync(specYolu, "utf8")).toContain("git checkout -- src/lib/map/ilce");
  });
  it("AC-24: geoBoundaries sürümü sabit (9469f09) ve atıf uygulama içi akordeonda; ATTRIBUTION.md'ye bakılmaz", () => {
    expect(URETICI.match(/geoBoundaries\/raw\/9469f09\//g)).toHaveLength(2);
    const ayar = kod("src/components/settings/SettingsApp.jsx");
    expect(ayar).toMatch(/HARITA_KAYNAKLARI/);
    expect(ayar).toMatch(/\["geoBoundaries", "Türkiye il ve ilçe sınırları", "ODbL 1\.0/);
  });
});

describe("Spec 0094: formlar ve harita öğeleri (R6/2, R6/3)", () => {
  it("AC-19: İlçe alanını çizen dört CountryCityFields çağrısı aynı; 'Yeni Sahip', önceki sahip ve servis işlem firması çağrıları onIlce almaz", () => {
    const onIlce = tara("src").filter(f => /onIlce=\{/.test(kod(f))).sort();
    expect(onIlce).toEqual(["src/components/PartSaleForm.jsx", "src/components/SimpleDealers.jsx", "src/components/YedekParcaSatisForm.jsx", "src/components/customers/CustomerAddEditForm.jsx"]);
    for (const f of ["src/components/customers/CustomerDetailModal.jsx", "src/components/ServiceForm.jsx"]) {
      expect(kod(f), f).toMatch(/<CountryCityFields/);
      expect(kod(f), f).not.toMatch(/onIlce/);
    }
  });
  it("AC-18/2: teslimat ilçesi hiçbir harita öğesine girmez (harita ve özetleri teslimat alanı okumaz)", () => {
    for (const f of ["src/components/Harita.jsx", "src/lib/mapStats.js", "src/components/harita/HaritaSvg.jsx"]) expect(kod(f), f).not.toMatch(/teslimat/i);
  });
});

describe("Spec 0094: değişmeyenler (R7, R12)", () => {
  it("AC-22/2: `ilce` alanını yazan dosyalar spec öncesindekiyle aynı; toplu yazan, türeten ya da göç eden kod yok", () => {
    const yazan = [...tara("src"), ...tara("electron")].filter(f => /\bilce\s*:/.test(kod(f))).sort();
    expect(yazan).toEqual(["electron/db.cjs", "src/components/SimpleDealers.jsx", "src/components/YedekParcaSatisForm.jsx", "src/components/customers/CustomerAddEditForm.jsx",
      "src/components/settings/SettingsCompany.jsx", "src/components/settings/SettingsImport.jsx", "src/lib/mapStats.js", "src/lib/printTemplates.js"]);
    for (const f of tara("src")) expect(kod(f), f).not.toMatch(/\.map\(\s*\w+\s*=>\s*\(\{\s*\.\.\.\w+,\s*ilce\s*:/);
  });
  it("AC-23: yeni veri bölümü, birleştirme anahtarı, izin ve ayar alanı yok (0093'ün spec öncesi fikstürüyle aynı, plan P10)", () => {
    const simdi = JSON.parse(JSON.stringify({ BLOB_SECTIONS, MERGE_KEYS, EYLEM_IDLERI, AYAR_ALAN_SEKMELERI }));
    expect(simdi).toEqual(JSON.parse(readFileSync("tests/fixtures/0093-tarama-once.json", "utf8")));
  });
});

describe("Spec 0094: yorumlar ve CLAUDE.md (R15)", () => {
  it("AC-29: üç eskiyen yorum güncel; CLAUDE.md on dokuz il cümlesini taşır ve ATTRIBUTION.md'ye atıf yapmaz", () => {
    expect(URETICI).not.toMatch(/kalan 70 il/);
    expect(URETICI).toMatch(/kalan 62 il/);
    expect(readFileSync("src/components/Harita.jsx", "utf8")).not.toMatch(/şimdilik 14/);
    expect(readFileSync("tests/ilce-veri.test.js", "utf8")).not.toMatch(/14 il tanımlı/);
    const c = readFileSync("CLAUDE.md", "utf8");
    const harita = c.slice(c.indexOf("### Faaliyet Haritası (the map tab)"), c.indexOf("### Servis Panosu"));
    expect(harita).toMatch(/nineteen provinces|on dokuz il/);
    expect(harita).toMatch(/ILCE_ILLERI/);
    expect(harita).not.toMatch(/and ATTRIBUTION\.md/); // eski talimat: var olmayan dosyayı güncellemek
    expect(harita).toMatch(/HARITA_KAYNAKLARI/);
  });
});

// Triyaj (spec 0094 bulgu 1): README'nin sıra paragrafı ve 0094 metinleri işin gerisinde kalmıştı.
describe("Spec 0094: README (triyaj bulgu 1)", () => {
  const R = readFileSync("specs/README.md", "utf8");
  const metin = [R.match(/^\*\*0094\*\* \(.*$/m)?.[0] || "", R.match(/^\| \*\*0094\*\* \|.*$/m)?.[0] || ""];
  it("sıra paragrafı specs/done'daki bir spec'i 'sırada' saymaz; 'birlikte' cümlesi 0087–0090 zincirine bağlı", () => {
    const sira = (R.match(/^\*\*Bekleyen işlerin yapılma sırası[\s\S]*?\*\*/m) || [""])[0];
    expect(sira.length).toBeGreaterThan(40);
    const sirada = (sira.match(/sırada[^*]*/) || [""])[0].match(/\d{4}/g) || [];
    const done = new Set(readdirSync("specs/done").map(f => f.slice(0, 4)));
    expect(sirada.filter(no => done.has(no))).toEqual([]);
    expect(R).not.toMatch(/sırada iki iş var, 0093 ve 0094/);
    expect(R).toMatch(/\*\*0087–0090\*\* birlikte makina maliyetinin yeniden kurulmasıdır/);
  });
  it("0094 paragrafı ve tablo satırı gerçekleşen boyutu yazar; liste atfı bugünkü satırı ve il sayısını verir", () => {
    const satir = URETICI.split("\n").findIndex(l => l.startsWith("const ILCE_ILLERI")) + 1;
    for (const m of metin) {
      expect(m.length).toBeGreaterThan(100);
      expect(m).not.toMatch(/bugün 14 il/);
      expect(m).toMatch(/64,6 KB/);
      for (const atif of m.match(/gen-map-paths\.cjs:\d+/g) || []) expect(atif).toBe(`gen-map-paths.cjs:${satir}`);
    }
    expect(metin.join(" ")).toContain(`gen-map-paths.cjs:${satir}`);
  });
});

