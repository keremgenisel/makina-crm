// Spec 0105: saf yardımcılar (süzme ve stok sayacı) ve kaynak taramaları. Ekran kriterleri tests/ui/model-secici-0105.test.jsx.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { uretimdeSuzulmusModeller, URETIM_ISARETI_IPUCU } from "../src/lib/uretimdekiModeller";
import { modelStokSayaci, modelStokOku, modelStokMetni, STOKTA_YOK, DURUM_ADLARI } from "../src/lib/stokDurumu";
import { ALAN_IZINLERI } from "../electron/serverAuth.cjs";
import { KILIT_ALANLARI } from "../src/lib/kilitAlanlari";
import { MERGE_KEYS } from "../src/lib/merge";

const kok = path.resolve(__dirname, "..");
const oku = (p) => fs.readFileSync(path.join(kok, p), "utf-8");
// Yorumsuz kaynak (0091/0093 taramalarıyla aynı soyma).
const kod = (f) => oku(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
const tara = (d) => fs.readdirSync(path.join(kok, d)).flatMap(e => { const p = `${d}/${e}`; return fs.statSync(path.join(kok, p)).isDirectory() ? tara(p) : /\.(jsx?|cjs|mjs)$/.test(e) ? [p] : []; });
const FORM = "src/components/customers/CustomerAddEditForm.jsx";
const M = (model) => ({ model });
const KATALOG = ["AK100", "AK120", "AKF3701", "ÖZEL"].map(M);
const AYAR = { uretimdeOlmayanModeller: ["AKF3701", "ÖZEL"] };
const adlar = (r) => r.map(x => x.m.model);

describe("Spec 0105: süzme yardımcısı (R1–R7, R23, Karar 31, 32)", () => {
  it("AC-1 / AC-2 / AC-8: üretimde olmayan çıkar, işaretsiz kalır; dönüş katalog sırasıyla { m, uretimde }", () => {
    const r = uretimdeSuzulmusModeller(AYAR, KATALOG);
    expect(r).toEqual([{ m: KATALOG[0], uretimde: true }, { m: KATALOG[1], uretimde: true }]);
  });
  it("AC-3 (R7): ayar yok, liste yok, boş liste, undefined değer: hepsi üretimde", () => {
    for (const a of [undefined, null, {}, { uretimdeOlmayanModeller: [] }, { uretimdeOlmayanModeller: undefined }]) {
      expect(uretimdeSuzulmusModeller(a, KATALOG).map(x => [x.m.model, x.uretimde])).toEqual(KATALOG.map(m => [m.model, true]));
    }
  });
  it("AC-4 / AC-5 / AC-27 (R3, R3/2): korunan küme iki değerin birleşimi; korunan model üretimde değil diye işaretli kalır", () => {
    const r = uretimdeSuzulmusModeller(AYAR, KATALOG, { korunan: ["AKF3701", "ÖZEL"] });
    expect(r.map(x => [x.m.model, x.uretimde])).toEqual([["AK100", true], ["AK120", true], ["AKF3701", false], ["ÖZEL", false]]);
    expect(adlar(uretimdeSuzulmusModeller(AYAR, KATALOG, { korunan: [undefined, "ÖZEL"] }))).toEqual(["AK100", "AK120", "ÖZEL"]);
  });
  it("AC-28 (R3/3): katalogda olmayan korunan ad kurtarılmaz", () => {
    expect(adlar(uretimdeSuzulmusModeller(AYAR, KATALOG, { korunan: ["SILINMIS_OZEL"] }))).toEqual(["AK100", "AK120"]);
  });
  it("AC-6 (R4, Karar 31): stoktaMi doğru olan model kalır; karşılaştırma birebirdir, normalizasyon sayaçtadır", () => {
    const sayac = modelStokSayaci({ stock: [{ id: 1, model: " akf3701 " }] });
    const r = uretimdeSuzulmusModeller(AYAR, KATALOG, { stoktaMi: ad => modelStokOku(sayac, ad).toplam > 0 });
    expect(r.map(x => [x.m.model, x.uretimde])).toEqual([["AK100", true], ["AK120", true], ["AKF3701", false]]);
  });
  it("AC-9 / AC-29: boş sonuç ve boş katalog ayrılabilir", () => {
    expect(uretimdeSuzulmusModeller({ uretimdeOlmayanModeller: ["AK100"] }, [M("AK100")])).toEqual([]);
    expect(uretimdeSuzulmusModeller(AYAR, [])).toEqual([]);
    expect(uretimdeSuzulmusModeller(AYAR, undefined)).toEqual([]);
  });
});

describe("Spec 0105: stok sayacı (R9–R14, R25, Karar 35)", () => {
  const S = [
    { id: 1, model: "AK100" }, { id: 2, model: "AK100", serialNo: "S2" }, { id: 3, model: "AK100", uretimDurumu: "montaj" },
    { id: 4, model: "AK120", uretimDurumu: "montaj" }, { id: 5, model: "AK140", deletedAt: "2026-10-01" }, { id: 6, model: "AK160", uretimDurumu: "hazir", serialNo: "" },
  ];
  const sayac = modelStokSayaci({ stock: S });
  it("AC-10: 2 satışa hazır ve 1 montajda → '2 satışa hazır · 1 montajda'", () => {
    expect(modelStokMetni(modelStokOku(sayac, "AK100"))).toBe("2 satışa hazır · 1 montajda");
  });
  it("AC-11: montajda yoksa yalnız hazır", () => { expect(modelStokMetni(modelStokOku(sayac, "AK160"))).toBe("1 satışa hazır"); });
  it("AC-12: hazır yoksa yalnız montajda", () => { expect(modelStokMetni(modelStokOku(sayac, "AK120"))).toBe("1 montajda"); });
  it("AC-13: satırı olmayan model 'Stokta yok'", () => {
    expect(STOKTA_YOK).toBe("Stokta yok");
    expect(modelStokMetni(modelStokOku(sayac, "AK240"))).toBe(STOKTA_YOK);
    expect(modelStokOku(modelStokSayaci({}), "AK100")).toEqual({ toplam: 0, hazir: 0, montajda: 0 });
  });
  it("AC-14: çöpteki satır sayılmaz", () => { expect(modelStokOku(sayac, "AK140").toplam).toBe(0); });
  it("AC-15: serili ve serisiz satırların ikisi de sayılır", () => { expect(modelStokOku(sayac, "AK100").toplam).toBe(3); });
  it("AC-16: üretim durumu alanı olmayan satır satışa hazır", () => {
    expect(modelStokOku(modelStokSayaci({ stock: [{ id: 9, model: "X" }] }), "X")).toEqual({ toplam: 1, hazir: 1, montajda: 0 });
  });
  it("R4/2: okuma anahtarı stok özetinin normalizasyonu (Türkçe küçültme, kırpma)", () => {
    expect(modelStokOku(modelStokSayaci({ stock: [{ id: 1, model: " İSTANBUL " }] }), "istanbul").toplam).toBe(1);
  });
  it("C5, Karar 35: sözcükler spec 0100 sözlüğünden; metinde ikinci ifade kümesi yok", () => {
    expect(DURUM_ADLARI).toEqual({ montaj: "Montajda", hazir: "Satışa hazır" });
    const k = kod("src/lib/stokDurumu.js");
    const govde = k.slice(k.indexOf("export const modelStokMetni"), k.indexOf("export const PANO_SEKME_ADI"));
    expect(govde).toMatch(/trLower\(DURUM_ADLARI\.hazir\)/);
    expect(govde).toMatch(/trLower\(DURUM_ADLARI\.montaj\)/);
    // Dize parçaları (şablon yer tutucuları çıkarılmış): hiçbiri durum sözcüğü taşımaz.
    const dizeler = [...govde.matchAll(/(["'`])((?:(?!\1)[^\n])*)\1/g)].map(x => x[2].replace(/\$\{[^}]*\}/g, ""));
    expect(dizeler.join("|")).not.toMatch(/satışa hazır|montajda/i);
  });
});

describe("Spec 0105: kaynak taramaları", () => {
  const f = kod(FORM);
  it("AC-26 (C9, Karar 20): form süzme yardımcısını ve stok sayacını çağırır, işaret listesini doğrudan okumaz, stoğu saymaz", () => {
    expect(f).toMatch(/uretimdeSuzulmusModeller\(appSettings, models, \{/);
    expect(f).toMatch(/modelStokSayaci\(\{ stock \}\)/);
    expect(f).not.toMatch(/\bURETIM_ALANI\b|uretimdeOlmayanModeller|uretimdeMi\b|uretimdeOlmayanlar\b/);
    expect(f).not.toMatch(/stock\??\.reduce\(/);
    // Gerekçeli istisna: seri seçicisinin ve parti kapısının bugünkü iki `stock.filter`'ı (spec 0103, 0104); yeni süzme yok.
    expect((f.match(/stock\.filter\(/g) || []).length).toBe(2);
    expect((f.match(/stock\.filter\(s => s\.model === form\.model\)/g) || []).length).toBe(2);
    // Kart ibareyi yardımcının alanından çizer ve metni sayaçtan alır.
    expect(f).toMatch(/\{!uretimde && <span[^>]*> · \{URETIM_DEGIL_IBARESI\}<\/span>\}/);
    expect(f).toMatch(/\{modelStokMetni\(modelStokOku\(stokSayaci, m\.model\)\)\}/);
  });
  it("AC-30 (R9/2, Karar 23): sayaç useMemo ile bir kez, yalnız { stock }; özetin dizisi formda gezilmez", () => {
    expect(f).toMatch(/const stokSayaci = useMemo\(\(\) => modelStokSayaci\(\{ stock \}\), \[stock\]\);/);
    expect((f.match(/modelStokSayaci\(/g) || []).length).toBe(1);
    expect(f).not.toMatch(/stokDurumOzeti|\.modeller\b/);
  });
  it("AC-3 / AC-31 (R24): form prop'u appSettings = {} varsayılanlı; Customers ayarı bütün olarak iletir ve okumaz", () => {
    expect(f).toMatch(/\n {2}appSettings = \{\},\n/);
    const c = kod("src/components/Customers.jsx");
    expect(c).toMatch(/krediKartiKomisyonlari=\{appSettings\?\.krediKartiKomisyonlari\} appSettings=\{appSettings\}/);
    expect(c).not.toMatch(/uretimdekiModeller|uretimde/);
  });
  it("AC-25 (C3, Karar 18): işareti okuyan dosyalar yalnız müşteri formuyla genişler; iki tarama kopyası da formu sayar", () => {
    const OKUYAN = /uretimdeOlmayanModeller|\bURETIM_ALANI\b|uretimdeMi\b|uretimdeOlmayanlar\b|uretimIsareti(Degistir|Tasi|Dusur)\b|uretimdeSuzulmusModeller\b/;
    const okuyan = tara("src").filter(x => OKUYAN.test(kod(x))).sort();
    // Bugün okuyanlar (izinli kümenin Settings.jsx'i okuma yapmıyor); bu spec'le eklenen yalnız form.
    expect(okuyan).toEqual(["src/App.jsx", "src/components/MakinaMaliyeti.jsx", "src/components/ModelsManager.jsx", FORM, "src/lib/uretimdekiModeller.js"].sort());
    for (const t of ["tests/uretimdeki-modeller-0091.test.js", "tests/plan-adetler-0093.test.js"]) {
      const s = oku(t);
      expect(s, t).toContain('"src/components/customers/CustomerAddEditForm.jsx"])');
      expect(s, t).toContain("|uretimdeSuzulmusModeller\\b/");
    }
  });
  it("AC-24 / triyaj bulgu 3: ipucunun yeni metni beş bağlı yerde; eski ifade hiçbir yerde kalmadı; spec beş yer sayar", () => {
    // Bağlı yerler: sabit + dört test konumu (0093 tam dize ve meta-assertion aynı dosyada, 0091 UI iki desen, 0093 UI iki desen).
    // Bu testin kendisi de metni taşıdığı için kümeden çıkarılır.
    const BU = "tests/model-secici-0105.test.js";
    const yeni = [...tara("src"), ...tara("tests")].filter(x => x !== BU && /stok ve Evrak model seçicileri/.test(oku(x))).sort();
    expect(yeni).toEqual(["src/lib/uretimdekiModeller.js", "tests/plan-adetler-0093.test.js", "tests/ui/plan-adetler-0093.test.jsx", "tests/ui/uretimdeki-modeller-0091.test.jsx"]);
    const p93 = oku("tests/plan-adetler-0093.test.js");
    expect(p93).toMatch(/expect\(URETIM_ISARETI_IPUCU\)\.toBe\("\\"Üretimde\\" işareti[^\n]*stok ve Evrak model seçicileri/);
    expect(p93).toContain('expect(u).toContain("expect(URETIM_ISARETI_IPUCU).toMatch(/stok ve Evrak model seçicileri, Analiz/);");');
    expect((oku("tests/ui/plan-adetler-0093.test.jsx").match(/stok ve Evrak model seçicileri|müşteri formunun model seçicisini süzer/g) || []).length).toBe(2);
    expect((oku("tests/ui/uretimdeki-modeller-0091.test.jsx").match(/stok ve Evrak model seçicileri|müşteri formunun model seçicisini süzer/g) || []).length).toBe(2);
    // Eski ifade ("…tablosu, model seçicileri, Analiz") kaynakta ve testlerde kalmadı.
    expect([...tara("src"), ...tara("tests")].filter(x => x !== BU && /tablosu, model seçicileri, Analiz|\/model seçicileri, Analiz\//.test(oku(x)))).toEqual([]);
    const spec = ["specs/0105-model-secicisi-uretimdekiler-ve-stok-adedi.md", "specs/done/0105-model-secicisi-uretimdekiler-ve-stok-adedi.md"].find(x => fs.existsSync(path.join(kok, x)));
    const sp = oku(spec);
    expect(sp).toMatch(/ipucunun \*\*beş\*\* bağlı yeri/);
    expect(sp).toMatch(/\*\*Beş bağlı yer\*\* birlikte güncellenir/);
    expect(sp).toContain("ui/plan-adetler-0093.test.jsx:267-268");
  });
  it("AC-24 (R22/2): ipucu birebir", () => {
    expect(URETIM_ISARETI_IPUCU).toBe("\"Üretimde\" işareti Makina Maliyeti › Model Maliyetleri'ni, Parti Hesabı'nın planlanan adetler penceresini ve müşteri formunun model seçicisini süzer; Parti Hesabı'nın model-adet tablosu, stok ve Evrak model seçicileri, Analiz ve makina kayıtları etkilenmez.");
  });
  it("AC-20 / AC-21 (R18, X1, X2, Karar 27, 39): stok formu ve Evrak dosyaları işareti okumaz, kütüphaneyi ve sayacı içe almaz", () => {
    const dosyalar = ["src/components/stock/MakinaStokTab.jsx", "src/components/Documents.jsx", ...tara("src/components/documents"), ...tara("src/components/evrak")];
    expect(kod("src/components/Documents.jsx")).toMatch(/allModels/);
    for (const d of dosyalar) {
      expect(kod(d), d).not.toMatch(/uretimdekiModeller|uretimdeSuzulmusModeller|modelStokSayaci|modelStokMetni/);
    }
  });
  it("AC-23 (C1, Karar 21): yeni izin, alan denetimi, kilit, birleştirme kuralı ve veritabanı sütunu yok", () => {
    expect(kod("src/components/settings/serverPermissionDefs.js")).not.toMatch(/uretimde|0105|model_?secici/i);
    expect(ALAN_IZINLERI.customers).toBeUndefined();
    expect(Object.keys(KILIT_ALANLARI)).toEqual(["customer", "dealer", "note", "teklif", "fatura", "yedek_parca", "part_sale", "partstock", "stock",
      "stok-seri", "uretim_formu", "gider", "cek", "kasa_hesap", "tedarikci", "uretim_partisi", "calisan", "ayar", "maliyet_ayar"]);
    expect(MERGE_KEYS).toContain("customers");
    expect(oku("src/lib/merge.js")).toMatch(/\.\.\.\(c\.partiId != null \? \{ partiId: remapRef\(maps\.uretimPartileri, c\.partiId\) \} : \{\}\),/);
    const db = oku("electron/db.cjs");
    expect(db).toMatch(/const CUSTOMERS_MALIYET_COLUMNS = \[\["satisKuru", "REAL"\], \["uretimTarihi", "TEXT"\], \["partiId", "INTEGER"\]\];/);
    expect(db).not.toMatch(/0105|STOK_ADEDI|MODEL_SECICI/);
    expect(oku("electron/serverAuth.cjs")).not.toMatch(/0105|uretimdeSuzulmusModeller|modelStok/);
  });
});
