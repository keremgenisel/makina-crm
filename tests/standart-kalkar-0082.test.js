// Spec 0082: Standart Genel Giderler kalkar, Tedarikçiler görünümü "Tedarikler ve Ekstre" olur. Motor eşitliği (AC-7, AC-8, C1),
// kaynak taramaları (AC-24, AC-26, AC-29, AC-31, AC-34, AC-35), haritalar (AC-22) ve AC adı kapsamı.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { resolve } from "node:path";
import { hesaplaMakinaMaliyetleri, karlilikOzeti, fiyatOnerisi, makinaKarlilik } from "../src/lib/makinaMaliyeti";
import { CUSTOMERS, STOCK, GIDERLER, TURLER, MODELLER, PARTILER, BUGUN } from "./fixtures/0076-veri";
import { ayikla, OLU_BICIM } from "./fixtures/0082-olu-anahtar";

const kok = resolve(__dirname, "..");
const oku = (f) => fs.readFileSync(resolve(kok, f), "utf8");
const duz = (x) => JSON.parse(JSON.stringify(x, (k, v) => (v instanceof Map ? [...v.entries()] : v instanceof Set ? [...v] : v)));

// Kısıtlı (binek araç) kalemle genişletilmiş 0076 verisi: dağıtım, parti, stok, model, kısıtlı dalları birlikte.
const VERI = [...GIDERLER, { id: 12, tarih: "2026-05-20", turId: 1, tutar: 8000, kdvOrani: 20, kisitliGider: true, indirilebilirOran: 70, tedarikciId: 11 }];
// Standart gider satırı DOLU (0082'den önce okunan bölüm); ayar "gercek".
const STD = [{ id: 901, grupId: 901, ad: "Elektrik", tutar: 4000, baslangicAy: "2026-01" }, { id: 902, grupId: 902, ad: "Su", tutar: 700, baslangicAy: "2026-04", bitisAy: "2026-05" }];
const girdi = (ek = {}) => ({ customers: CUSTOMERS, stock: STOCK, giderler: VERI, giderTurleri: TURLER, standardModels: MODELLER, uretimPartileri: PARTILER,
  standartGiderler: STD, giderAyarlari: { yururlukAy: "2026-01", ortakGiderKaynagi: "gercek" }, ...ek });
export const motorCiktisi = (g = girdi()) => {
  const s = hesaplaMakinaMaliyetleri(g, { bugun: BUGUN });
  const aralik = { baslangic: "2026-01-01", bitis: "2026-12-31" };
  return duz({
    sonuc: s,
    satirlar: [...s.makinalar.keys()].map(a => makinaKarlilik(s, a, null)),
    karlilik: karlilikOzeti(s, aralik),
    mart: karlilikOzeti(s, { baslangic: "2026-03-01", bitis: "2026-03-31" }),
    fiyat: fiyatOnerisi(s, { model: "AK100", ...aralik, yontem: "marj", deger: 20 }),
  });
};

const DOSYA = "tests/fixtures/0082-maliyet-once.json";
describe("Spec 0082 C1: makina maliyeti gerçekleşen kaynaktan, rakamlar birebir aynı", () => {
  it("AC-8: standart satırı dolu, ayarı 'gercek' veride motor çıktısı bu spec'ten önceki kodla aynı (ölü anahtarlar iki tarafta ayıklanır)", () => {
    const simdi = motorCiktisi();
    if (process.env.YAZ_0082 === "1") { fs.writeFileSync(resolve(kok, DOSYA), JSON.stringify(simdi, null, 1)); return; }
    const once = JSON.parse(oku(DOSYA));
    const ay1 = [], ay2 = [];
    expect(ayikla(simdi, ay1)).toEqual(ayikla(once, ay2));
    // Ayıklamanın kapsamı: önce tarafında yalnız beklenen biçimdeki değerler ayıklandı; şimdiki çıktıda ölü anahtar hiç yok.
    expect(ay2.length).toBeGreaterThan(0);
    for (const [k, v] of ay2) expect(OLU_BICIM[k](v), `${k}=${JSON.stringify(v)}`).toBe(true);
    expect(ay1).toEqual([]);
  });
});

describe("Spec 0082 AC-7: eski 'standart' ayarı ve dolu standart satırı sonucu değiştirmez", () => {
  it("AC-7: ayar 'standart' kayıtlı veride maliyet gerçekleşen kayıtlardan; alan hiç yokken aynı veriyle birebir aynı", () => {
    const eski = motorCiktisi(girdi({ giderAyarlari: { yururlukAy: "2026-01", ortakGiderKaynagi: "standart" } }));
    const temiz = motorCiktisi({ ...girdi(), standartGiderler: undefined, giderAyarlari: { yururlukAy: "2026-01" } });
    expect(eski).toEqual(temiz);
    const once = JSON.parse(oku(DOSYA));
    expect(ayikla(eski)).toEqual(ayikla(once)); // gerçekleşen kaynağın 0082 öncesi rakamları
  });
});

// ── Kaynak taramaları ──
const kaynakDosyalari = (d) => fs.readdirSync(resolve(kok, d), { withFileTypes: true })
  .flatMap(e => (e.isDirectory() ? (e.name === "node_modules" ? [] : kaynakDosyalari(`${d}/${e.name}`)) : /\.(jsx?|cjs|mjs|json)$/.test(e.name) ? [`${d}/${e.name}`] : []));
// C9: kimlik bazlı tarama (düz "standart" aranmaz: standardModels'in "Standart Modeller" adı ve db-roundtrip'in { id: "standart" }
// kaydı masumdur) + kullanıcıya görünen "Standart Genel Gider" metni.
const C9 = /standartGiderler|StandartGiderler|standart_giderler|standart_gider\b|standartGider[A-Z]|standartGrup|standartTutar|standartYeni|standartSona|standartAd[A-Z]|standartSonSurum|ortakGiderKaynagi|ORTAK_KAYNAK|ortakStandart|standartFark|standartEksik|DAGITIM_STANDART_NOTU|KISITLI_STANDART_NOTU|standartCopGruplari|standartGeriAlma|standartEslesmesi|standartMeta|[Ss]tandart [Gg]enel [Gg]ider/; // triyaj: metin parçası harfe duyarsız ("standart genel giderler" kaçıyordu)
// Plan P1: tam yollu, gerekçeli istisnalar. Listedeki dosya adı artık içermiyorsa istisna eskimiştir ve test kırılır.
const ISTISNA = {
  "tests/standart-kalkar-0082.test.js": "bu tarama ve AC-7 eski veriyi taklit eder",
  "tests/ui/standart-kalkar-0082.test.jsx": "eski yedek, eski gövde ve yokluk iddiaları",
  "tests/fixtures/0082-olu-anahtar.js": "ölü anahtar ayıklaması (C1/2)",
  "tests/fixtures/0082-maliyet-once.json": "0082 öncesi motor çıktısı (AC-8)",
  "tests/fixtures/0076-bayraksiz-once.json": "0076 altın dosyası, bayt bayt korunur (C1/3)",
  "scripts/tests/db-roundtrip.cjs": "eski istemci gövdesi ve ham SQL (AC-18)",
  "scripts/tests/db-clean-install.cjs": "eski istemci gövdesi, ölü tablonun varlığı (AC-19)",
  "scripts/tests/server-security.cjs": "eski istemci gövdesi, ham SQL (AC-17)",
  "src/components/settings/SettingsGider.jsx": "R2/2: eski ayar anahtarı kayıtta düşürülür",
  "electron/db.cjs": "X1: ölü tablonun tanımı (CREATE TABLE IF NOT EXISTS) kalır",
};

describe("Spec 0082: kaynak taramaları", () => {
  it("AC-31: C9 kimlikleri ve 'Standart Genel Gider' metni kaynakta, araçlarda ve testlerde geçmez (gerekçeli istisnalar hariç)", () => {
    const ihlal = ["src", "electron", "scripts", "tests"].flatMap(kaynakDosyalari)
      .filter(f => !ISTISNA[f] && C9.test(oku(f)));
    expect(ihlal).toEqual([]);
    for (const f of Object.keys(ISTISNA)) expect(C9.test(oku(f)), `eskimiş istisna: ${f}`).toBe(true);
    // Masum kullanımlar yanlış alarm üretmez.
    expect(C9.test(oku("electron/server.cjs"))).toBe(false);
    expect(oku("electron/server.cjs")).toMatch(/Standart Modeller/);
    expect(oku("scripts/tests/db-roundtrip.cjs")).toMatch(/\{ id: "standart"/);
    // db.cjs'te yalnız tablo tanımı kalır (okuma ve yazma yolu yok, R6).
    expect(oku("electron/db.cjs").split("\n").filter(l => C9.test(l))).toEqual(["CREATE TABLE IF NOT EXISTS standart_giderler ("]);
    expect(oku("src/components/settings/SettingsGider.jsx").split("\n").filter(l => C9.test(l)).join("\n")).not.toMatch(/form\.ortakGiderKaynagi|<Segment/);
  });
  it("AC-22: bölüm altı haritanın hiçbirinde yok; her veri bölümü bir gruba ve en az bir sekmeye eşli; bölüm adı haritası veri bölümlerinin alt kümesi", async () => {
    const sa = await import("../electron/serverAuth.cjs");
    const { BLOB_SECTIONS, SECTION_GROUP, BOLUM_SEKMELERI, GIDER_BOLUMLERI, EYLEM_IDLERI } = sa.default || sa;
    const B = "standart" + "Giderler"; // aranacak ad (dosya istisnada; birleştirme yalnız okunurluk için)
    expect(BLOB_SECTIONS).not.toContain(B);
    for (const h of [SECTION_GROUP, BOLUM_SEKMELERI, EYLEM_IDLERI]) expect(Object.keys(h)).not.toContain(B);
    expect(GIDER_BOLUMLERI.has(B)).toBe(false);
    for (const b of BLOB_SECTIONS) {
      expect(SECTION_GROUP[b], b).toBeTruthy();
      expect((BOLUM_SEKMELERI[b] || []).length, b).toBeGreaterThan(0);
    }
    const s = oku("electron/server.cjs"); const i = s.indexOf("const BOLUM_ADLARI = {"); const j = s.indexOf("};", i);
    const adlar = [...s.slice(i, j).matchAll(/\b([A-Za-z0-9_]+):\s*"/g)].map(m => m[1]);
    expect(adlar.length).toBeGreaterThan(20);
    expect(adlar.filter(a => !BLOB_SECTIONS.includes(a))).toEqual([]);
  });
  it("AC-23: çakışma birleştirmesi bölümü birleştirmez; kalan bölümler bugünkü gibi", async () => {
    const { MERGE_KEYS, buildMergePlan } = await import("../src/lib/merge.js");
    expect(MERGE_KEYS).not.toContain("standartGiderler");
    const plan = buildMergePlan({ standartGiderler: [{ id: 5, grupId: 5, ad: "Kira" }], tedarikciler: [{ id: 6, ad: "A" }] }, { standartGiderler: [], tedarikciler: [] });
    expect("standartGiderler" in plan.adds).toBe(false);
    expect(plan.adds.tedarikciler).toHaveLength(1);
  });
  it("AC-24, AC-25 (tarama): Çöp Kutusu bölümü almaz, listeyi kuran ve boşaltan kod onu anmaz; Ayarlar geçirmez", () => {
    for (const f of ["src/components/settings/SettingsTrash.jsx", "src/components/Settings.jsx", "src/lib/copKutusu.js"]) expect(C9.test(oku(f)), f).toBe(false);
  });
  it("AC-26: otuz günlük temizlik çağrıları arasında bölüm yok", () => {
    const app = oku("src/App.jsx");
    expect(app.match(/data\.(\w+) = purgeOldTrash\(/g).join()).not.toMatch(/standart/);
    expect(C9.test(app)).toBe(false);
  });
  it("AC-29: kayıt kilidi alan listesinde standart gider yok", async () => {
    const { KILIT_ALANLARI } = await import("../src/lib/kilitAlanlari.js");
    expect(Object.keys(KILIT_ALANLARI)).not.toContain("standart_gider");
  });
  it("AC-34: Giderler üç ölü prop'u almaz, App geçirmez", () => {
    const g = oku("src/components/Giderler.jsx");
    const imza = g.slice(g.indexOf("export const Giderler = ({"), g.indexOf("}) => {", g.indexOf("export const Giderler = ({")));
    expect(imza).not.toMatch(/aktifKullanici|standartGiderler|setStandartGiderler/);
    const app = oku("src/App.jsx"); const c = app.slice(app.indexOf("<Giderler "), app.indexOf("/>", app.indexOf("<Giderler ")));
    expect(c).not.toMatch(/aktifKullanici|standartGiderler|setStandartGiderler/);
  });
  // Triyaj: CLAUDE.md'de düzenlemeden kalan yarım parantez kaldırılmayan kaynağı anlatıyordu.
  it("AC-31 (belge): CLAUDE.md artık var olmayan standart kaynağı anlatan ibare taşımaz", () => {
    const c = oku("CLAUDE.md");
    expect(c).not.toMatch(/ay tutarı standart tablodan/);
    expect(c).not.toMatch(/kaynak tek\) \(/);
  });
  // Triyaj: "önce" görüntüleri HEAD'deki araçla (standart veriyle) çekildi; Çöp Kutusu satırının ve izin etiketinin kalkışı görünür.
  it("DoD (kanıt): Çöp Kutusu ve izin ekranı 0082 raporunda değişti; Çöp Kutusu kaydı 'degisti' + onaylı", () => {
    const rapor = JSON.parse(oku("docs/evidence/0082-piksel-raporu.json"));
    const esl = JSON.parse(oku("docs/evidence/kanit-eslemesi.json")).dosyalar;
    // UserManager sözlüğü kullanmadığı için eşlemede kaydı olamaz (küme eşitliği; 0052, 0066 emsali): değişimi yalnız raporda ölçülür.
    for (const ekran of ["cop-kutusu-0078", "kullanici-izin-kasa-0066"]) {
      for (const tema of ["aydinlik", "karanlik"]) expect(rapor.find(x => x.ad === `${ekran}-${tema}.png`)?.piksel, `${ekran} ${tema}`).toBeGreaterThan(0);
    }
    for (const [dosya, ekran] of [["src/components/settings/SettingsTrash.jsx", "cop-kutusu-0078"]]) {
      // Uygulama sırasında 0082 raporuna karşı "degisti" + onay; spec done'a taşınınca taban rapora karşı "ayni" (kanıt eşlemesi kuralı).
      const k = (esl[dosya] || []).find(x => /docs\/evidence\/0082-(taban-)?piksel-raporu\.json/.test(x.rapor) && x.ekran === ekran);
      if (k?.rapor === "docs/evidence/0082-piksel-raporu.json") { expect(k.beklenen, ekran).toBe("degisti"); expect(k.onay, ekran).toMatch(/spec 0082/); }
      else expect(k?.beklenen ?? "ayni", ekran).toBe("ayni");
      expect(k, ekran).toBeTruthy();
    }
  });
  it("AC-35: tasarım sözlüğünün iki satırı güncellendi", () => {
    const s = oku("docs/tasarim-sozlugu.md");
    expect(s).not.toMatch(/Standart Gider işlemi/);
    expect(s).toMatch(/\*\*Tedarikler ve Ekstre\*\* listesi sayfalanmaz/);
  });
  it("AC-33: silinen dosyanın yolu hiçbir testte yok; sekmeyi adıyla tıklayan testler yeni adı kullanır; 0001 AC-93 testi silindi", () => {
    const testler = kaynakDosyalari("tests").filter(f => /\.test\.jsx?$/.test(f) && !ISTISNA[f]);
    for (const f of testler) expect(oku(f), f).not.toMatch(/gider\/StandartGiderler\.jsx/);
    expect(oku("tests/ui/gider-yetkisiz-gorunum.test.jsx")).toMatch(/name: "Tedarikler ve Ekstre"/);
    expect(oku("tests/ui/gider-perdesi.test.jsx")).toMatch(/"Tedarikler ve Ekstre"\]\) gorunur/);
    expect(oku("tests/gider.test.js")).not.toMatch(/it\("AC-93/);
  });
  it("AC-17 / AC-18 / AC-19 / AC-25 (Electron kanıtı): ham SQL ve karışık sürüm kontrolleri betiklerde adıyla duruyor", () => {
    const rt = oku("scripts/tests/db-roundtrip.cjs"), ci = oku("scripts/tests/db-clean-install.cjs"), ss = oku("scripts/tests/server-security.cjs");
    expect(rt).toMatch(/spec 0082 AC-18: bölümü boş dizi olarak GÖNDEREN/);
    expect(rt).toMatch(/spec 0082 AC-18, AC-25: bölümü GÖNDERMEYEN/);
    expect(ci).toMatch(/spec 0082 AC-19: temiz kurulumda/);
    expect(ss).toMatch(/spec 0082 AC-17: eski istemci gövdesi \(boş standart bölüm\)/);
    expect(ss).toMatch(/spec 0082 AC-17, AC-18: tablo yazılmadı/);
  });
  it("DoD: AC-1…AC-35'in her biri bir test adında (0082 dosyalarında 'AC-n', başka dosyalarda 'spec 0082 AC-n')", () => {
    const bulunan = new Set();
    for (const f of kaynakDosyalari("tests").filter(f => /\.test\.jsx?$/.test(f))) {
      const kendi = f.includes("0082");
      for (const [, baslik] of oku(f).matchAll(/(?:\bit\(|\]\)\()\s*"([^"]+)"/g)) { // it("…") ve it.each([…])("…")
        if (kendi) for (const [, n] of baslik.matchAll(/AC-(\d+)/g)) bulunan.add(Number(n));
        else for (const [, grup] of baslik.matchAll(/spec 0082 ((?:AC-\d+(?: \/ )?)+)/g)) for (const [, n] of grup.matchAll(/AC-(\d+)/g)) bulunan.add(Number(n));
      }
    }
    expect(Array.from({ length: 35 }, (_, i) => i + 1).filter(n => !bulunan.has(n))).toEqual([]);
  });
});
