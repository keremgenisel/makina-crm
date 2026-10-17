// Spec 0091: üretimde olmayan modeller. Saf katman (lib/uretimdekiModeller, makinaStandartMaliyet'in iki seçeneği ve
// modelSayilari), birleştirme ve makinaya özgü ayar süzmesi, kaynak taramaları. Veri tests/fixtures/0091-veri.js (K10).
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { URETIM_ALANI, uretimdeMi, uretimIsaretiDegistir, uretimIsaretiTasi, uretimIsaretiDusur } from "../src/lib/uretimdekiModeller";
import { gercekUretim, genelGiderPayi, modelMaliyetleri, modelSayilari, MODEL_ISARET } from "../src/lib/makinaStandartMaliyet";
import { mergeAppSettings, disAppSettingsSuz } from "../src/lib/utils";
import { YEDEK_PAKETLERI, paketNotlari, MALIYET_AYAR_NOTU, YEREL_AYAR_NOTU } from "../src/lib/yedekPaketleri";
import * as V from "./fixtures/0091-veri";

const kod = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
const tara = (d) => readdirSync(d).flatMap(e => { const p = `${d}/${e}`; return statSync(p).isDirectory() ? tara(p) : /\.(jsx?|cjs|mjs)$/.test(e) ? [p] : []; });
const uretim = (o = {}) => gercekUretim(V.veri(o), V.AYARLAR, 0, { modelKirilimi: true, katalog: V.KATALOG });
const satirlar = (o = {}) => modelMaliyetleri({ standardModels: V.STANDART, customModels: V.OZEL, parts: [] }, 0, { uretimdeDisi: V.URETIMDE_DISI, uretim: uretim(o) });
const satir = (s, model) => s.find(m => m.model === model);

describe("Spec 0091: işaret kütüphanesi (R3–R5, R24, R24/2–R24/4)", () => {
  it("AC-3: işareti hiç verilmemiş model üretimdedir; alan hiç yokken bütün modeller üretimde", () => {
    expect(V.KATALOG.every(ad => uretimdeMi({}, ad))).toBe(true);
    expect(uretimdeMi({ [URETIM_ALANI]: ["AK160"] }, "AK100")).toBe(true);
    expect(uretimdeMi({ [URETIM_ALANI]: ["AK160"] }, "AK160")).toBe(false);
  });
  it("AC-30/2 (R24/3): işaret listesi ile katalog adı birebir karşılaştırılır (Türkçe küçültme yok)", () => {
    const a = uretimIsaretiDegistir({}, "İNOX");
    expect(a[URETIM_ALANI]).toEqual(["İNOX"]);
    expect(uretimdeMi(a, "İNOX")).toBe(false);
    expect(uretimdeMi(a, "inox")).toBe(true);
  });
  it("AC-9/3 (R24/4): son işaret kalkınca değer undefined olur (bellekte boş dizi yok, JSON gövdesinde anahtar yok)", () => {
    const a = uretimIsaretiDegistir(uretimIsaretiDegistir({ kdvRate: 20 }, "AK160"), "AK160");
    expect(a[URETIM_ALANI]).toBeUndefined();
    expect(Array.isArray(a[URETIM_ALANI])).toBe(false);
    expect(JSON.parse(JSON.stringify(a))).toEqual({ kdvRate: 20 });
    expect(uretimIsaretiDusur({ [URETIM_ALANI]: ["OZ05"] }, "OZ05")[URETIM_ALANI]).toBeUndefined();
  });
  it("AC-9/3 (R24/4, K1): son işareti kaldıran PC'nin değeri birleştirmede sunucudaki eski listeyi ezer, işaret geri gelmez", () => {
    const sunucu = { kdvRate: 20, [URETIM_ALANI]: ["AK160"] };
    const yerel = uretimIsaretiDegistir({ kdvRate: 20, [URETIM_ALANI]: ["AK160"] }, "AK160");
    const b = mergeAppSettings(sunucu, yerel);
    expect(b[URETIM_ALANI]).toBeUndefined();
    expect(uretimdeMi(b, "AK160")).toBe(true);
    // Mutasyon tanığı: anahtar silinseydi eski liste geri gelirdi.
    const silinmis = { ...yerel }; delete silinmis[URETIM_ALANI];
    expect(mergeAppSettings(sunucu, silinmis)[URETIM_ALANI]).toEqual(["AK160"]);
  });
  it("AC-6 (R4, motor yarısı): yeniden adlandırma işareti taşır; listede olmayan adda ayar aynen döner", () => {
    const a = { [URETIM_ALANI]: ["OZ05", "OZ06"] };
    expect(uretimIsaretiTasi(a, "OZ05", "OZ05B")[URETIM_ALANI]).toEqual(["OZ05B", "OZ06"]);
    expect(uretimIsaretiTasi(a, "AK100", "AK100B")).toBe(a);
  });
  it("AC-10: alan makinaya özgü ayar süzmesine girmez (başka bilgisayardan gelen işaret gövdede kalır)", () => {
    expect(disAppSettingsSuz({ [URETIM_ALANI]: ["AK160"], backupFolder: "/x" })).toEqual({ [URETIM_ALANI]: ["AK160"] });
  });
  it("AC-10/2: çakışma birleştirmesinde bu PC'nin gönderilmemiş işareti yaşar; birleştirme nesne bütündür (ada göre değil, bilinen sınır)", () => {
    const b = mergeAppSettings({ [URETIM_ALANI]: ["AK200"] }, { [URETIM_ALANI]: ["AK160"] });
    expect(b[URETIM_ALANI]).toEqual(["AK160"]); // AK200 (öteki PC) kaybolur: X8
  });
});

describe("Spec 0091: motor (R25–R27, C12, C14)", () => {
  it("AC-40: gercekUretim'in seçeneksiz çıktısı birebir eskisidir; model kırılımı yalnız seçenekle", () => {
    const eski = gercekUretim(V.veri(), V.AYARLAR, 1000);
    expect(Object.keys(eski).sort()).toEqual(["adet", "cozulemeyen", "neden", "payK"]);
    const yeni = gercekUretim(V.veri(), V.AYARLAR, 1000, { modelKirilimi: true, katalog: V.KATALOG });
    const { modelAdetleri, modelYokAdet, ...kalan } = yeni;
    expect(kalan).toEqual(eski);
    expect(modelAdetleri).toBeTruthy();
    expect(modelYokAdet).toBe(1);
  });
  it("AC-41: modelMaliyetleri seçeneksiz çağrıldığında bugünkü alanları aynen üretir", () => {
    const s = modelMaliyetleri({ standardModels: V.STANDART, customModels: V.OZEL, parts: [] }, 500);
    for (const m of s) for (const a of ["uretimde", "donemAdet", "adetNeden", "isaret"]) expect(m, a).not.toHaveProperty(a);
    const { uretimde, donemAdet, adetNeden, isaret, ...ayni } = satir(satirlar(), "AK100");
    expect(Object.keys(ayni).sort()).toEqual(Object.keys(satir(s, "AK100")).sort());
    expect([uretimde, donemAdet, adetNeden, isaret]).toEqual([true, 2, null, null]);
  });
  it("AC-23 / AC-38: dönemde iki makinası üretilmiş modelin adedi iki (tam sayı, para değil)", () => {
    expect(satir(satirlar(), "AK100").donemAdet).toBe(2);
    expect(Number.isInteger(satir(satirlar(), "AK100").donemAdet)).toBe(true);
  });
  it("AC-23/3 / AC-24: dönemde hiç üretilmemiş üretimdeki model adedi 0 ve işareti 'eskimiş'", () => {
    expect(satir(satirlar(), "AK120")).toMatchObject({ donemAdet: 0, uretimde: true, isaret: MODEL_ISARET.ESKIMIS });
  });
  it("AC-25: üretimde olmayan ama dönemde üretilmiş modelin işareti 'yanlış'", () => {
    expect(satir(satirlar(), "AK160")).toMatchObject({ donemAdet: 1, uretimde: false, isaret: MODEL_ISARET.YANLIS });
  });
  it("AC-26: üretimde olup dönemde üretilmiş modelde işaret yok", () => {
    expect(satir(satirlar(), "AK100").isaret).toBeNull();
  });
  it("AC-27 / AC-27/2: hesap ayarları girilmemişken adet yok, neden 'ayarsiz', işaret hiç yok", () => {
    const u = gercekUretim(V.veri(), null, 0, { modelKirilimi: true, katalog: V.KATALOG });
    expect(u).toMatchObject({ modelAdetleri: null, modelYokAdet: null });
    const s = modelMaliyetleri({ standardModels: V.STANDART, customModels: V.OZEL, parts: [] }, 0, { uretimdeDisi: V.URETIMDE_DISI, uretim: u });
    for (const m of s) expect(m, m.model).toMatchObject({ donemAdet: null, adetNeden: "ayarsiz", isaret: null });
  });
  it("AC-27/3 (R16/2): dönem gider yürürlüğünden önce olsa da adet sayılır (pay sıfır)", () => {
    const v = V.veri({ yururlukAy: "2027-01" });
    expect(genelGiderPayi(v, V.AYARLAR, "2026-10-17").havuzK).toBe(0);
    const u = gercekUretim(v, V.AYARLAR, 0, { modelKirilimi: true, katalog: V.KATALOG });
    expect(u.modelAdetleri.ak100).toBe(2);
  });
  it("AC-28: dönem dışında üretilmiş makina adete girmez", () => {
    expect(satir(satirlar(), "AK200").donemAdet).toBe(0);
  });
  it("AC-29: üretim tarihi çözülemeyen makina adete girmez ve sayısı bugünkü yerinde (cozulemeyen) kalır", () => {
    expect(uretim().cozulemeyen).toBe(1);
    expect(satir(satirlar(), "AK100").donemAdet).toBe(2);
  });
  it("AC-29/2: modeli kataloğun hiçbir satırıyla eşleşmeyen makina hiçbir adede girmez, sayısı verilir", () => {
    const u = uretim();
    expect(u.modelYokAdet).toBe(1);
    expect(Object.values(u.modelAdetleri).reduce((t, n) => t + n, 0) + u.modelYokAdet).toBe(u.adet);
  });
  it("AC-29/3 (motor yarısı): bütün makinaların modeli katalogda ise sayı sıfır", () => {
    expect(uretim({ stock: V.STOCK.filter(s => s.model !== "BILINMEYEN") }).modelYokAdet).toBe(0);
  });
  it("AC-30/2 (motor yarısı, R24/3): satırın üretim işareti katalog adıyla birebir; harfi farklı liste girdisi o modeli işaretlemez", () => {
    const s = modelMaliyetleri({ standardModels: V.STANDART, customModels: V.OZEL, parts: [] }, 0, { uretimdeDisi: ["inox", "AK160"], uretim: uretim() });
    expect(satir(s, "İNOX").uretimde).toBe(true);
    expect(satir(s, "AK160").uretimde).toBe(false);
  });
  it("AC-30 (C14b): makina ile model eşlemesi Türkçe büyük küçük harften etkilenmez ('inox' → 'İNOX')", () => {
    expect(satir(satirlar(), "İNOX").donemAdet).toBe(1);
  });
  it("AC-31 (R18): makina başına genel gider payı işaretten etkilenmez", () => {
    const pay = genelGiderPayi(V.veri(), V.AYARLAR, "2026-10-17");
    const a = modelMaliyetleri({ standardModels: V.STANDART, customModels: V.OZEL, parts: [] }, pay.payK, { uretimdeDisi: [], uretim: uretim() });
    const b = modelMaliyetleri({ standardModels: V.STANDART, customModels: V.OZEL, parts: [] }, pay.payK, { uretimdeDisi: V.KATALOG, uretim: uretim() });
    expect(a.map(m => [m.payK, m.toplamK])).toEqual(b.map(m => [m.payK, m.toplamK]));
    expect(pay.payK).toBe(100000);
  });
  it("AC-22 (motor yarısı): üretimde olmayan modelin maliyet rakamları işaretsiz hâliyle birebir aynı (R19)", () => {
    const isaretsiz = modelMaliyetleri({ standardModels: V.STANDART, customModels: V.OZEL, parts: [] }, 700, { uretimdeDisi: [], uretim: uretim() });
    const isaretli = modelMaliyetleri({ standardModels: V.STANDART, customModels: V.OZEL, parts: [] }, 700, { uretimdeDisi: V.URETIMDE_DISI, uretim: uretim() });
    const para = (m) => [m.direktK, m.payK, m.toplamK, m.oneriK, m.kalipListeK];
    expect(para(satir(isaretli, "AK160"))).toEqual(para(satir(isaretsiz, "AK160")));
  });
  it("AC-13 / AC-14 (motor yarısı, R26/2): yirmi canlı model, yedisi üretimde, biri yanlış işaretli; çöpteki model sayılmaz", () => {
    expect(modelSayilari(satirlar())).toEqual({ tanimli: 20, uretimde: 7, uretimdeDisi: 13, yanlis: 1 });
  });
});

describe("Spec 0091: taramalar ve değişmeyenler", () => {
  // App.jsx yalnız yükleme yolunda alanı gövdeden taşır (triyaj bulgu 1); süzme ve okuma yapmaz.
  const izinli = new Set(["src/lib/uretimdekiModeller.js", "src/components/ModelsManager.jsx", "src/components/MakinaMaliyeti.jsx", "src/components/Settings.jsx", "src/App.jsx"]);
  it("AC-33 / AC-34 / AC-35 / AC-36 / AC-37 / AC-43 (R20–R22, R29): işareti yalnız katalog paneli ve maliyet ekranı okur", () => {
    const okuyan = tara("src").filter(f => /uretimdeOlmayanModeller|uretimdekiModeller|uretimdeMi\b/.test(kod(f)));
    expect(okuyan.filter(f => !izinli.has(f))).toEqual([]);
    expect(kod("src/components/maliyet/PartiHesabi.jsx")).not.toMatch(/uretimde/);
    expect(kod("src/components/Analiz.jsx")).not.toMatch(/uretimde/);
  });
  it("AC-39 (R17): üretim tarihi zinciri tek yerde; motor makinaListesi'ni içe aktarır, maliyet ekranları tarih zinciri yazmaz", () => {
    expect(kod("src/lib/makinaStandartMaliyet.js")).toMatch(/import \{[^}]*\bmakinaListesi\b[^}]*\} from "\.\/makinaMaliyeti"/);
    for (const f of [...tara("src/components/maliyet"), "src/components/MakinaMaliyeti.jsx"]) expect(kod(f), f).not.toMatch(/uretimTarihi|makina_uretimi|addedDate|installDate/);
  });
  it("AC-42 (R26/2, C6, C7): ekran dönem adedini ve işareti türetmez; makina eşlemesi yapmaz", () => {
    const e = kod("src/components/maliyet/ModelMaliyetleri.jsx");
    expect(e).not.toMatch(/donemAdet\s*(===|!==|>|<|>=|<=)\s*\d/);
    expect(e).not.toMatch(/trLower|modelAdetleri|\.length\s*-/);
    expect(e).toMatch(/modelSayilari\(/);
    expect(e).toMatch(/MODEL_ISARET\.(ESKIMIS|YANLIS)/);
  });
  it("AC-44 (R30): MakinaMaliyeti'nde karşılanmayan onAyarlar prop'u kalmadı", () => {
    expect(tara("src").filter(f => /\bonAyarlar\b/.test(kod(f)))).toEqual([]);
  });
  it("AC-45 (C10): Analiz kutusu testinde konumdan okuyan kutu sorgusu kalmadı", () => {
    const t = readFileSync("tests/ui/models-manager-analiz.test.jsx", "utf8");
    expect(t).not.toMatch(/querySelectorAll\(['"]input\[type="checkbox"\]/);
    expect(t).toMatch(/getByRole\("checkbox", \{ name:/);
  });
  it("AC-12 (R23): yeni eylem izni yok, kilit alanları listesi işareti bilmiyor", () => {
    for (const f of ["src/components/settings/serverPermissionDefs.js", "src/lib/permissions.js", "src/lib/kilitAlanlari.js", "src/lib/merge.js"]) expect(kod(f), f).not.toMatch(/uretimde/i);
  });
  it("C4: sunucunun ayar alanı eşlemesinde alan yalnız Ayarlar sekmesine bağlı", () => {
    expect(kod("electron/serverAuth.cjs")).toMatch(/uretimdeOlmayanModeller:\s*\["settings"\]/);
  });
  it("AC-46 (C8, C17): yedek paketleri değişmedi; işaret 'Firma ve ayarlar'da taşınır, not eklenmedi", () => {
    expect(JSON.stringify(YEDEK_PAKETLERI)).not.toMatch(/uretimde/i);
    const firma = YEDEK_PAKETLERI.find(p => p.notlar?.some(n => n.metin === MALIYET_AYAR_NOTU));
    expect(paketNotlari(firma, { kasaVeriYetki: true })).toEqual([MALIYET_AYAR_NOTU, YEREL_AYAR_NOTU]);
  });
  it("AC-9/4 (C11): 0088'in gövde altını yenilenmedi", () => {
    expect(createHash("sha256").update(readFileSync("tests/fixtures/0088-govde-once.json")).digest("hex")).toBe("52b702463de02f9f7ba494167bf4fcc444258952b5a66b895888cfdf97310d9b");
  });
});

// Triyaj (bulgu 2): kanıt eşlemesi yalnız biçimi denetliyordu; spec'in kanıt tablosundaki kayıtlar ve altı yeni ekran burada
// sabitlenir (0090 AC-57 emsali). Kapanışta "degisti" kayıtları 0091-taban raporuna "ayni" olarak çevrilir.
describe("Spec 0091: görsel kanıt kaydı (DoD, Context 'Görsel kanıtın bedeli')", () => {
  const E = JSON.parse(readFileSync("docs/evidence/kanit-eslemesi.json", "utf8")).dosyalar;
  const kayit = (f, ekran) => (E[f] || []).filter(x => x.ekran === ekran && /\/0091-(taban-)?piksel-raporu\.json$/.test(x.rapor));
  const TABLO = [
    ["src/components/ModelsManager.jsx", "katalog-model"], ["src/components/ModelsManager.jsx", "katalog-model-ekmaliyet"], ["src/components/ModelsManager.jsx", "ayarlar-models"],
    ["src/components/maliyet/ModelMaliyetleri.jsx", "maliyet-modeller"], ["src/components/maliyet/ModelMaliyetleri.jsx", "maliyet-modeller-dokum"], ["src/components/maliyet/ModelMaliyetleri.jsx", "maliyet-katsayi-formu"],
    ["src/components/maliyet/PayOzeti.jsx", "maliyet-modeller"], ["src/components/maliyet/PayOzeti.jsx", "maliyet-bos-ayar"], ["src/components/maliyet/PayOzeti.jsx", "maliyet-bos-rol"],
    ["src/components/MakinaMaliyeti.jsx", "maliyet-modeller"],
  ];
  const YENI = ["katalog-model-uretimde", "maliyet-modeller-uretimde-kapali", "maliyet-modeller-uretimde-acik", "maliyet-modeller-isaret-bilgi", "maliyet-modeller-isaret-uyari", "maliyet-modeller-bos-uretimde"];
  it("DoD: tablodaki on kayıt 0091 raporunda; 'degisti' ise onay 'spec 0091'", () => {
    for (const [f, e] of TABLO) {
      const k = kayit(f, e);
      expect(k.length, `${f} ${e}`).toBeGreaterThan(0);
      for (const x of k) if (x.beklenen === "degisti") expect(x.onay, e).toMatch(/^Takım Yöneticisi · \d{4}-\d{2}-\d{2} · spec 0091 /);
    }
  });
  it("DoD: altı yeni ekran kanıt eşlemesinde ve görüntü aracında", () => {
    const arac = readFileSync("scripts/evidence/0009-sayfa.jsx", "utf8");
    const hepsi = Object.values(E).flat().filter(x => /\/0091-(taban-)?piksel-raporu\.json$/.test(x.rapor));
    for (const e of YENI) {
      expect(arac, e).toContain(`"${e}":`);
      expect(hepsi.some(x => x.ekran === e), e).toBe(true);
    }
  });
});
