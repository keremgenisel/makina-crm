// Spec 0093: planlanan adetler penceresi yalnız üretimdeki modelleri listeler. Kaynak taramaları ve değişmeyenler; arayüz
// kriterleri tests/ui/plan-adetler-0093.test.jsx'te. Yeni motor testi yok, çünkü motor değişmiyor (C5, AC-22).
// AC-21/3: dört listenin spec öncesi hâli tests/fixtures/0093-tarama-once.json'da (`YAZ_0093=1` ile yeniden yazılır).
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { BLOB_SECTIONS, EYLEM_IDLERI, AYAR_ALAN_SEKMELERI } from "../electron/serverAuth.cjs";
import { MERGE_KEYS } from "../src/lib/merge";
import { URETIM_ISARETI_IPUCU, URETIM_DEGIL_IBARESI, uretimdeMi } from "../src/lib/uretimdekiModeller";
import { URETIM_METIN } from "../src/components/maliyet/ModelMaliyetleri";
import * as PH from "../src/components/maliyet/PartiHesabi";

const kod = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
const tara = (d) => readdirSync(d).flatMap(e => { const p = `${d}/${e}`; return statSync(p).isDirectory() ? tara(p) : /\.(jsx?|cjs|mjs)$/.test(e) ? [p] : []; });
const PARTI = "src/components/maliyet/PartiHesabi.jsx";
const ph = kod(PARTI);
const govde = ph.slice(ph.indexOf("export const PartiHesabi"));
// İşareti OKUYAN adlar (R12/2): modül yolu değil.
const OKUYAN = /uretimdeOlmayanModeller|\bURETIM_ALANI\b|uretimdeMi\b|uretimdeOlmayanlar\b|uretimIsareti(Degistir|Tasi|Dusur)\b/;
const kutuphanedenAlinan = (f) => [...kod(f).matchAll(/import \{([^}]*)\} from "[./]*lib\/uretimdekiModeller"/g)].flatMap(m => m[1].split(",").map(s => s.trim()).filter(Boolean));

describe("Spec 0093: süzme tek yerde (R1/2, C1, C2, C2/2, C6)", () => {
  it("AC-1/2: `modeller` yeniden bağlanmaz; ızgara `cizilen`'i dolaşır; beş yer tam listeyle", () => {
    expect(govde).not.toMatch(/\bmodeller\s*=(?!=)/);
    expect(govde).toMatch(/const cizilen = modeller\.filter\(m => m\.uretimde !== false\)/);
    expect(govde).toMatch(/\{cizilen\.map\(m =>/);
    expect(govde.match(/\bcizilen\b/g).length).toBe(3); // tanım, boş durum kararı, ızgara
    expect(govde).toMatch(/partiHesabi\(parti, veri, \{ payK: pay\.payK, modeller, /); // motor
    expect(govde).toMatch(/const planAc = \(\) => setPlan\(\{ adetler: Object\.fromEntries\(modeller\.map\(/); // tohum
    expect(govde).toMatch(/const planBulunamayan = [^\n]*!modeller\.some\(/);
    expect(govde).toMatch(/const adetler = \{ \.\.\.\(parti\.planlananAdetler \|\| \{\}\) \}/); // planKaydet başlangıcı
    expect(govde).toMatch(/const gizliKayitli = modeller\.filter\(m => m\.uretimde === false && parti\.planlananAdetler\?\.\[m\.model\]\)/); // R3 kaynağı
  });
  it("C6: MakinaMaliyeti.jsx pencereye tam listeyi verir (süzme orada yok)", () => {
    const mm = kod("src/components/MakinaMaliyeti.jsx");
    expect(mm).not.toMatch(/uretimde\s*!==\s*false|uretimde\s*===\s*false/);
    expect(mm).toMatch(/const ortak = \{ pay, gercek, modeller, /);
  });
  it("AC-6/2: R3 bölümü `kaldirilan`'a yazmaz; `kaldirilan` yalnız bulunamayan bölümünde", () => {
    const r3 = govde.slice(govde.indexOf("gizliKayitli.length > 0"), govde.indexOf("planBulunamayan.length > 0"));
    expect(r3.length).toBeGreaterThan(100);
    expect(r3).not.toMatch(/kaldirilan|<Btn/);
    expect(govde.match(/kaldirilan: kaldirildi \?/g)).toHaveLength(1);
  });
  it("AC-9/2: boş durum sayısı motordan (modelSayilari); ekranda ikinci sayaç yok", () => {
    expect(govde).toMatch(/const say = modelSayilari\(modeller\)/);
    expect(govde).toMatch(/PLAN_BOS_URETIMDE\.metin\(say\.uretimdeDisi\)/);
    expect(govde).toMatch(/planGizliEki\(say\.uretimdeDisi\)/);
    expect(govde).not.toMatch(/\.length\s*-|filter\([^)]*uretimde[^)]*\)\.length/);
  });
});

describe("Spec 0093: metinler (R8/2, R11, R11/2, R12)", () => {
  it("AC-16/2: ipucu R8/2'nin birebir metni; Parti Hesabı'nın tablosunu etkilenmeyenler arasında sayar", () => {
    expect(URETIM_ISARETI_IPUCU).toBe("\"Üretimde\" işareti Makina Maliyeti › Model Maliyetleri'ni ve Parti Hesabı'nın planlanan adetler penceresini süzer; Parti Hesabı'nın model-adet tablosu, model seçicileri, Analiz ve makina kayıtları etkilenmez.");
  });
  it("AC-17/2: 'üretimde değil' ibaresi tek yerde; URETIM_METIN onu yeniden dışa verir", () => {
    expect(URETIM_DEGIL_IBARESI).toBe("üretimde değil");
    expect(URETIM_METIN.uretimdeDegil).toBe(URETIM_DEGIL_IBARESI);
    const tanim = tara("src").filter(f => /["'`]üretimde değil["'`]/.test(kod(f)));
    expect(tanim).toEqual(["src/lib/uretimdekiModeller.js"]);
  });
  it("AC-25: yedi metin dosyadan dışa verilir (R11/2) ve metin değerleri spec'in cümleleri", () => {
    expect(PH.PLAN_SUZGEC_CUMLESI).toBe("Liste yalnız Ayarlar › Katalog › Makina Modelleri'nde \"Üretimde\" işaretli modelleri gösterir.");
    expect(PH.planGizliEki(3)).toBe("Üretimde olmayan 3 model listede yok.");
    expect(PH.PLAN_GERI_KOYMA_CUMLESI).toBe("Üretimden kalkmış bir modele adet girmek gerekiyorsa işaret Ayarlar'da geri konur.");
    expect(PH.PLAN_GIZLI_BASLIK).toBe("Üretimde olmayan ama planlanan adedi girilmiş modeller:");
    expect(PH.PLAN_GIZLI_KALDIRMA).toBe("Kaldırmak için alanı boşaltın.");
    expect(PH.PLAN_BOS_MODEL).toEqual({ baslik: "Tanımlı makina modeli yok", metin: "Modeller Ayarlar › Katalog › Makina Modelleri'nde tanımlanır." });
    expect(PH.PLAN_BOS_URETIMDE.baslik).toBe("Üretimde işaretli model yok");
    expect(PH.PLAN_BOS_URETIMDE.metin(6)).toBe("6 model üretimde değil olarak işaretli. İşaret Ayarlar › Katalog › Makina Modelleri'nde değiştirilir.");
  });
  it("AC-25: arayüz testi metinleri sabitlerden okur (cümleleri düz metin olarak yazmaz)", () => {
    const t = readFileSync("tests/ui/plan-adetler-0093.test.jsx", "utf8");
    for (const c of ["Liste yalnız Ayarlar", "listede yok", "işaret Ayarlar'da geri konur", "planlanan adedi girilmiş modeller", "alanı boşaltın", "Üretimde işaretli model yok"]) expect(t, c).not.toContain(c);
    for (const s of ["PLAN_SUZGEC_CUMLESI", "planGizliEki", "PLAN_GERI_KOYMA_CUMLESI", "PLAN_GIZLI_BASLIK", "PLAN_GIZLI_KALDIRMA", "PLAN_BOS_MODEL", "PLAN_BOS_URETIMDE"]) expect(t, s).toContain(s);
  });
});

describe("Spec 0093: işaret okuma yolu (C4, C7, R12/2)", () => {
  it("AC-19: işaret karşılaştırması birebir (harf büyüklüğü ayrı model)", () => {
    expect(uretimdeMi({ uretimdeOlmayanModeller: ["AK100"] }, "ak100")).toBe(true);
    expect(uretimdeMi({ uretimdeOlmayanModeller: ["AK100"] }, "AK100")).toBe(false);
  });
  it("AC-23: PartiHesabi işareti okuyan adları kullanmaz, yalnız satırın `uretimde` alanını; kütüphaneden yalnız ibareyi alır", () => {
    expect(ph).not.toMatch(OKUYAN);
    expect(ph).not.toMatch(/appSettings/);
    expect(govde).toMatch(/m\.uretimde !== false/);
    expect(kutuphanedenAlinan(PARTI)).toEqual(["URETIM_DEGIL_IBARESI"]);
    expect(kutuphanedenAlinan("src/components/maliyet/ModelMaliyetleri.jsx")).toEqual(["URETIM_DEGIL_IBARESI"]);
    const izinli = new Set(["src/lib/uretimdekiModeller.js", "src/components/ModelsManager.jsx", "src/components/MakinaMaliyeti.jsx", "src/components/Settings.jsx", "src/App.jsx"]);
    expect(tara("src").filter(f => OKUYAN.test(kod(f)) && !izinli.has(f))).toEqual([]);
  });
  it("AC-23 / AC-24: 0091'in izinli küme güvencesi silinmedi, daraltıldı; üç test 'spec 0093 ile' notlu", () => {
    const a = readFileSync("tests/uretimdeki-modeller-0091.test.js", "utf8");
    expect(a).toMatch(/const izinli = new Set\(/);
    expect(a).toMatch(/expect\(okuyan\.filter\(f => !izinli\.has\(f\)\)\)\.toEqual\(\[\]\)/);
    expect(a).toMatch(/expect\(okuyan\)\.not\.toContain\("src\/components\/maliyet\/PartiHesabi\.jsx"\)/);
    expect(a).toMatch(/Spec 0093 ile/);
    const u = readFileSync("tests/ui/uretimdeki-modeller-0091.test.jsx", "utf8");
    expect(u.match(/[Ss]pec 0093 ile/g).length).toBeGreaterThanOrEqual(3);
    expect(u).toContain("expect(URETIM_ISARETI_IPUCU).toMatch(/model seçicileri, Analiz/);");
    expect(u).toMatch(/queryByLabelText\("AK160 planlanan adedi"\)\)\.toBeNull\(\)/);
  });
});

describe("Spec 0093: değişmeyenler (R9, C5)", () => {
  const simdi = () => JSON.parse(JSON.stringify({ BLOB_SECTIONS, MERGE_KEYS, EYLEM_IDLERI, AYAR_ALAN_SEKMELERI }));
  it("AC-21 / AC-21/2 / AC-21/3: dört liste spec öncesiyle aynı; PartiHesabi setAppSettings çağırmaz", () => {
    if (process.env.YAZ_0093 === "1") writeFileSync("tests/fixtures/0093-tarama-once.json", JSON.stringify(simdi(), null, 2) + "\n");
    expect(simdi()).toEqual(JSON.parse(readFileSync("tests/fixtures/0093-tarama-once.json", "utf8")));
    expect(ph).not.toMatch(/setAppSettings/);
  });
  it("AC-22: motor bu spec'in adlarını bilmez (imza ve çıktı 0088/0091 motor testleriyle ve arayüzün AC-13 eşitliğiyle)", () => {
    expect(kod("src/lib/makinaStandartMaliyet.js")).not.toMatch(/URETIM_DEGIL|PLAN_GIZLI|cizilen|gizliKayitli/);
  });
  it("AC-29: 0088 pencere testleri ve Electron yerleşim testi bu spec'in adlarını taşımıyor (dokunulmadı)", () => {
    for (const f of ["tests/ui/makina-maliyeti-0088.test.jsx", "tests/maliyet-yerlesim.test.js", "scripts/tests/maliyet-yerlesim.cjs", "scripts/tests/layout/maliyet.jsx"]) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/0093|uretimdeOlmayanModeller/);
    }
  });
});

describe("Spec 0093: README paragrafı (triyaj bulgu 1)", () => {
  it("paragraf işin kapsamını revizyon 4'le anlatır (yedi sabit, kütüphane sabiti), revizyon 2'nin 'bir metin sabiti'ni değil", () => {
    const p = (readFileSync("specs/README.md", "utf8").match(/^\*\*0093\*\* \(.*$/m) || [""])[0];
    expect(p.length).toBeGreaterThan(100);
    expect(p).toMatch(/beş kullanıcı metni \(yedi sabit, R11\/2\) ve bir kütüphane sabiti/);
    expect(p).not.toMatch(/tek bileşen, bir metin sabiti/);
  });
});

describe("Spec 0093: görsel kanıt (AC-30, ölçüm 4)", () => {
  const E = JSON.parse(readFileSync("docs/evidence/kanit-eslemesi.json", "utf8")).dosyalar;
  const k0093 = Object.entries(E).flatMap(([f, l]) => l.filter(x => /\/0093-(taban-)?piksel-raporu\.json$/.test(x.rapor)).map(x => ({ f, ...x })));
  const YENI = ["maliyet-0093-plan-suzulmus", "maliyet-0093-plan-gizli-adet", "maliyet-0093-plan-bos"];
  it("AC-30: üç yeni ekran görüntü aracında ve eşlemede", () => {
    const arac = readFileSync("scripts/evidence/0009-sayfa.jsx", "utf8");
    for (const e of YENI) {
      expect(arac, e).toContain(`"${e}":`);
      expect(k0093.some(x => x.ekran === e && x.f === PARTI), e).toBe(true);
    }
  });
  it("AC-30: değişen üç mevcut ekran 0093 raporunda; 'degisti' ise TY onay dizesi", () => {
    for (const [f, e] of [[PARTI, "maliyet-parti-plan-formu"], ["src/components/ModelsManager.jsx", "katalog-model"], ["src/components/ModelsManager.jsx", "katalog-model-uretimde"]]) {
      const k = k0093.filter(x => x.f === f && x.ekran === e);
      expect(k.length, `${f} ${e}`).toBeGreaterThan(0);
      for (const x of k) if (x.beklenen === "degisti") expect(x.onay, e).toBe("Takım Yöneticisi · 2026-10-19 · spec 0093 R1/R4/R8");
    }
  });
});
