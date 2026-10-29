// Spec 0116: ihraç kayıtlı açıklama kutusu kalkar. Kaynak taramaları (yedi sabit, bileşen adı, testid'ler, ölü içe aktarmalar,
// yorumlar, seçiciye ipucu yasağı), dosyanın yeni adı, kanıt eşlemesi ve aracı, 0114 testlerinin içe aktarmaları, done kopyasının
// tarihselliği ve kapanış belge düzeni.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const oku = (f) => readFileSync(f, "utf8");
const dosyalar = (kok) => readdirSync(kok).flatMap(a => { const p = path.join(kok, a); return statSync(p).isDirectory() ? dosyalar(p) : /\.(jsx?|cjs|mjs)$/.test(a) ? [p] : []; });
const SRC = dosyalar("src");
const srcIcinde = (desen) => SRC.filter(f => desen.test(oku(f)));
const FORMLAR = ["src/components/customers/CustomerAddEditForm.jsx", "src/components/PartSaleForm.jsx", "src/components/YedekParcaSatisForm.jsx"];
const YENI = "src/components/IhracKayitliOzet.jsx";
const ESKI = "src/components/IhracKayitliAlani.jsx";

describe("Spec 0116 C: kaynak (AC-18, AC-19, AC-22 – AC-25, AC-30, AC-31, AC-33)", () => {
  it("AC-18: kaldırılan yedi sabitin adı ve metni src'de hiç geçmez", () => {
    expect(srcIcinde(/\bIHRAC_(ACIKLAMA|IBARE|FATURA_NOTU|KOPYALA|KOPYALANDI|KOPYALANAMADI|PARCA_SINIRI)\b/)).toEqual([]);
    for (const m of ["hükümlerine göre ihraç edilmek şartıyla teslim edildiğinden", "Fatura KDV'li kesilir ama", "e-fatura yazılımında", "İbare kopyalandı", "Kopyalanamadı, metni seçip", "hazır alıp sattığımız parçada"]) {
      expect(srcIcinde(new RegExp(m.replace(/[/.()]/g, "\\$&"))), m).toEqual([]);
    }
  });
  it("AC-19: IhracKayitliAlani adı src'de hiç geçmez ve eski dosya yok", () => {
    expect(srcIcinde(/IhracKayitliAlani/)).toEqual([]);
    expect(existsSync(ESKI)).toBe(false);
  });
  it("AC-22: dosya yeni adıyla durur, iki kardeşi dışa verir; beş içe aktarma yeni adı gösterir", () => {
    expect(oku(YENI)).toMatch(/export const IhracKayitliOzetSatirlari\b/);
    expect(oku(YENI)).toMatch(/export const IhracKayitliRozeti\b/);
    const iceAlan = srcIcinde(/from "(\.\/|(\.\.\/)+)IhracKayitliOzet"/);
    expect(iceAlan.sort()).toEqual([
      "src/components/PartSaleForm.jsx", "src/components/YedekParcaSatisForm.jsx", "src/components/customers/CustomerAddEditForm.jsx",
      "src/components/customers/detail/MachineTimeline.jsx", "src/components/stock/YedekParcaSatisTab.jsx",
    ].sort());
  });
  it("AC-24 (plan Ö8): üç formda ihracKayitliEtkinMi adı hiç geçmez; fonksiyonun beş canlı çağrısı yerinde", () => {
    for (const f of FORMLAR) expect(oku(f), f).not.toMatch(/ihracKayitliEtkinMi/);
    const cagri = (f) => (oku(f).match(/ihracKayitliEtkinMi\(/g) || []).length;
    expect(cagri("src/components/SatisTevkifatAlani.jsx") + cagri("src/lib/satisTevkifat.js") + cagri("src/lib/utils.js")).toBeGreaterThanOrEqual(5);
  });
  it("AC-25: yeni adlı dosya useState'i ve ./tasarim'ı içe almaz", () => {
    expect(oku(YENI)).not.toMatch(/useState|from "\.\/tasarim"/);
  });
  it("AC-30: üç çağrı satırının açıklama yorumu kalmaz", () => {
    for (const f of FORMLAR) expect(oku(f), f).not.toMatch(/Spec 0114 R22/);
  });
  it("AC-31: kutunun altı testid'i ve ibarenin erişilebilir adı src'de hiç geçmez", () => {
    for (const t of ["ihrac-kayitli-alani", "ihrac-aciklama", "ihrac-ibare", "ihrac-ibare-kopyala", "ihrac-kopya-durumu", "ihrac-parca-siniri", "Faturaya yazılacak ibare"]) {
      expect(srcIcinde(new RegExp(`["'\`]${t}["'\`]`)), t).toEqual([]);
    }
  });
  it("AC-33 (X7): satış tipi seçicisine ipucu, title ya da açıklama satırı eklenmedi; yalnız seçenekleri çizer", () => {
    const k = oku("src/components/SatisTipiSecici.jsx");
    expect(k).not.toMatch(/title=|Ipucu|HataMetni|<div|<span|<small|<p\b/);
    expect(k.match(/<option /g)).toHaveLength(1);
  });
});

describe("Spec 0116 C: kanıt, testler ve belgeler (AC-23, AC-26 – AC-29, AC-32, AC-34, AC-35)", () => {
  const esleme = JSON.parse(oku("docs/evidence/kanit-eslemesi.json")).dosyalar;
  it("AC-23: kontrast testi, 0114 taraması ve sözlüğün rozet satırı yeni dosya adını gösterir", () => {
    expect(oku("tests/tasarim-kontrast.test.js")).toContain(YENI);
    expect(oku("tests/ihrac-kayitli-0114.test.js")).toContain(YENI);
    expect(oku("docs/tasarim-sozlugu.md")).toContain(`\`${YENI}\` \`IhracKayitliRozeti\``);
    for (const f of ["tests/tasarim-kontrast.test.js", "tests/ihrac-kayitli-0114.test.js", "docs/tasarim-sozlugu.md"]) expect(oku(f), f).not.toContain(ESKI);
  });
  it("AC-26: kanıt eşlemesinde eski bileşen anahtarı yok", () => {
    expect(ESKI in esleme).toBe(false);
  });
  it("AC-27: raporu /0114- olan hiçbir kayıt degisti ya da onay taşımaz", () => {
    const k = Object.values(esleme).flat().filter(x => x.rapor.includes("/0114-"));
    expect(k.length).toBeGreaterThan(0);
    expect(k.filter(x => x.beklenen === "degisti" || x.onay)).toEqual([]);
  });
  it("AC-28: 0116 kayıtları üç formun ve Stok satırının anahtarında; degisti olanlar spec 0116 onayını taşır", () => {
    const kayitli = Object.entries(esleme).flatMap(([f, v]) => v.filter(x => /\/0116-/.test(x.rapor)).map(x => ({ f, ...x })));
    expect(new Set(kayitli.map(x => x.f))).toEqual(new Set([...FORMLAR, "src/components/stock/YedekParcaSatisTab.jsx"]));
    for (const x of kayitli.filter(x => x.beklenen === "degisti")) expect(x.onay, x.ekran).toMatch(/^Takım Yöneticisi · \d{4}-\d{2}-\d{2} · spec 0116 /);
    expect(kayitli.map(x => x.ekran).sort()).toEqual(["kalip-formu-0114-ihrac", "kalip-formu-0114-kart-uyari", "kalip-formu-0114-ozet",
      "musteri-formu-0114", "stok-yedek-0114", "yedek-parca-formu-0114-ihrac", "yedek-parca-formu-0114-ozet"]);
  });
  it("AC-29: kanıt aracının iki adımı pasif tevkifat kutusuna kayar; üç -ihrac ekranı durur", () => {
    const a = oku("scripts/evidence/0009-sayfa.jsx");
    expect(a).not.toContain("kaydir:Fatura KDV'li kesilir");
    for (const e of ["yedek-parca-formu-0114-ihrac", "musteri-formu-0114"]) {
      const satir = a.slice(a.indexOf(`"${e}":`), a.indexOf("\n  \"", a.indexOf(`"${e}":`) + 1));
      expect(satir, e).toContain("kaydir:Bu fatura tevkifatlı");
    }
    for (const e of ["kalip-formu-0114-ihrac", "yedek-parca-formu-0114-ihrac", "musteri-formu-0114"]) expect(a, e).toContain(`"${e}":`);
  });
  it("AC-32: iki 0114 test dosyası silinen sabitleri içe almaz; describe başlığı kalan kriterleri gösterir", () => {
    for (const f of ["tests/ui/ihrac-kayitli-0114.test.jsx", "tests/ihrac-kayitli-0114.test.js"]) {
      expect(oku(f), f).not.toMatch(/\bIHRAC_(ACIKLAMA|IBARE|FATURA_NOTU|KOPYALA|KOPYALANDI|KOPYALANAMADI|PARCA_SINIRI)\b/);
    }
    expect(oku("tests/ui/ihrac-kayitli-0114.test.jsx")).toContain('describe("Spec 0114 A: işaret açıkken form (AC-9, AC-35, AC-56)"');
  });
  it("AC-34 (plan Ö4): 0114'ün done kopyası tarihsel kalır, kutunun anlatımı yerinde", () => {
    const d = oku("specs/done/0114-ihrac-kayitli-fatura.md");
    expect(d).toContain("**R23/2.** İbarenin metni burada sabitlenir");
    expect(d).toContain("Kopyala");
    expect(d).toContain("11/1-c");
  });
  it("AC-28 (triyaj): spec'in AC-28'i ve DoD satırı kapanış raporu için Karar 31'e (taban raporu) atıf yapar", () => {
    const sp = ["specs/0116-ihrac-kayitli-ibare-kutusu-kalkar.md", "specs/done/0116-ihrac-kayitli-ibare-kutusu-kalkar.md"].find(existsSync);
    const metin = oku(sp);
    const ac28 = metin.split("\n").find(l => l.startsWith("- **AC-28.**"));
    const dod = metin.split("\n").find(l => l.startsWith("- [") && l.includes("0116-kapanis-piksel-raporu.json"));
    for (const [ad, l] of [["AC-28", ac28], ["DoD", dod]]) expect(l, ad).toMatch(/Karar 31 ile taban raporu:.*0116-taban-piksel-raporu\.json/);
  });
  it("AC-35: çeviri ekranına ve sözlüklerine ihraç anahtarı eklenmedi", () => {
    expect(oku("src/components/settings/SettingsTranslations.jsx")).not.toMatch(/ihrac/i);
  });
});

// Kapanış belge düzeni (0114 emsali; plan Ö2: 0116 bölümü CLAUDE.md'de 0114'ün önünde, dilim 0114 başlığında biter).
describe("Spec 0116: kapanış belge düzeni (AC-36)", () => {
  it("plan done'daysa: 'Tamamlandı: commit', TASINACAK'ta 0116 yok, eski kopya yok, README Tamamlandı, kanıt ayni", () => {
    if (!existsSync("specs/done/0116-uygulama-plani.md")) return;
    const claude = oku("CLAUDE.md");
    const bolum = claude.slice(claude.indexOf("(spec 0116, plan"), claude.indexOf("(spec 0114, plan"));
    expect(bolum).toMatch(/Tamamlandı: commit `[0-9a-f]{7}`/);
    expect(bolum).not.toMatch(/specs\/0116-/);
    expect(oku("tests/spec-atiflari.test.js")).not.toMatch(/TASINACAK = \[[^\]]*0116/);
    expect(existsSync("specs/0116-ihrac-kayitli-ibare-kutusu-kalkar.md")).toBe(false);
    expect(oku("specs/README.md")).toMatch(/\| \*\*0116\*\* \| [^|]*\(Tamamlandı\)/);
    const k = Object.values(JSON.parse(oku("docs/evidence/kanit-eslemesi.json")).dosyalar).flat().filter(x => /\/0116-/.test(x.rapor));
    expect(k.filter(x => x.beklenen === "degisti" || x.onay)).toEqual([]);
  });
});
