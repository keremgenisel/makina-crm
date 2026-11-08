// Spec 0137: dış işlem kataloğu ve işlem bedelinin zam zinciri. Motor (katalog doğrulaması, fiyat geçmişi, kalem tutarı, kilo tabanı,
// yuvarlama, çözülememe, tarihli okuma, geçmiş kapısı, tüketiciler, koruma) ve kaynak taramaları. Arayüz `tests/ui/dis-islem-0137*`.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import * as D from "../src/lib/disIslem";
import { disIslemFiyatEtkisi, etkiMetni, fiyatEtkiMetni, BAGLI_PARCA_YOK } from "../src/lib/disIslemEtkisi";
import {
  parcaMaliyetKurus, parcaMaliyetiVar, setKatalogu, setOzeti, maliyetKalemleriOzeti, maliyetGecmisiYaz, gecmisliKayit, kalemlerDogrula,
  formKalemOzeti, kalemFormu, kalemCesidiDegistir, katalogIslemSec, cesitVerisiDolu, CESIT, ISLEM_SECILMEDI, SET_ADET_HATASI, ADET_UST_HATASI,
  maliyetKaynagi, kalemKaynakMetni, MALIYET_KALEM_SINIRI as _S, KALEM_SINIRI_NEDENI,
} from "../src/lib/urunAgaci";
import { malzemeKatalogu, fiyatEtkisi, islenmisKg, parcaIslenmisKg, malzemeOzeti, NEDEN_BOY_AGIRLIK, NEDEN_OLCU_EKSIK, NEDEN_MALZEME_KALEMI_YOK, EKSIK_OZGUL, BELIRSIZ_HATASI } from "../src/lib/malzeme";
import { KALEM_TUR, MALIYET_KALEM_SINIRI, kalemIslemIdleri, katalogIslemVarMi, kalemYoluMu, kalemTedarikciIdleri } from "../src/lib/maliyetKalemleri";
import { kalemdeGecenTedarikciler, tedarikciKullanim, tedarikciKorumaNedeni, KALEMDE_TEDARIKCI_NEDENI, KALEMDE_VE_KATALOGDA_TEDARIKCI_NEDENI } from "../src/lib/gider";
import { modelMaliyetleri } from "../src/lib/makinaStandartMaliyet";
import { parcaSatisFiyati, fiyatBaglamiKur } from "../src/lib/parcaFiyati";
import { parcaDisaAktarmaSatiri, parcaSatirlariniCoz } from "../src/lib/parcaAktarma";
import { buildMergePlan } from "../src/lib/merge";
import { uid } from "../src/lib/utils";

const kod = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const dosyalar = (dir) => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? (f === "map" ? [] : dosyalar(p)) : /\.(js|jsx)$/.test(f) ? [p] : []; }).map(f => f.replace(/\\/g, "/"));

// ── Ortak veri ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// Lama 10 × 100 × 250 mm, özgül ağırlık 8 → işlenmiş ağırlık tam 2 kg; paylar ve fire ham ağırlığı büyütür.
const LAMA_M = { id: 1, ad: "St37 Lama", ozgulAgirlik: 8, kiloFiyati: 50 };
const LAMA = { tur: "malzeme", malzemeId: 1, bicim: "lama", yontem: "kilo", kalinlik: 10, genislik: 100, boy: 250, payKalinlik: 1, payGenislik: 2, payBoy: 5, fire: 10, adet: 1 };
const MALZ = [LAMA_M, { id: 2, ad: "Boy malzemesi", ozgulAgirlik: 7.85, boyFiyati: 600, geldigiBoy: 6 }, { id: 3, ad: "Özgülsüz", kiloFiyati: 30 }];
const mk = () => malzemeKatalogu(MALZ);
const ADET = { id: 11, ad: "ISIL İŞLEM", birim: "adet", birimFiyati: 20 };
const KILO = { id: 12, ad: "Galvano", birim: "kilo", birimFiyati: 30 };
const USD = { id: 13, ad: "Lazer", birim: "adet", birimFiyati: 2, paraBirimi: "USD", kur: 50 };
const TARIHLI = { id: 14, ad: "Kama açma", birim: "adet", birimFiyati: 25, fiyatGecmisi: [{ gecerli: "", birimFiyati: 20 }, { gecerli: "2026-09-01", birimFiyati: 25 }] };
const ISLEMLER = [ADET, KILO, USD, TARIHLI];
const ik = (liste = ISLEMLER) => D.disIslemKatalogu(liste);
const kat = (islemId, miktar) => ({ tur: "islem", islemId, ...(miktar === undefined ? {} : { miktar }) });
const serbest = (ad, tutar, tedarikciId) => ({ tur: "islem", ad, tutar, ...(tedarikciId != null ? { tedarikciId } : {}) });
const parca = (o) => ({ id: 1, ad: "P", models: [], ...o });
const maliyet = (kalemler, tarih, liste = ISLEMLER) => maliyetKalemleriOzeti(kalemler, mk(), tarih, ik(liste));

describe("Spec 0137: katalog kartı doğrulaması (R1–R5)", () => {
  it("AC-3: adı boş işlem kaydedilmez, neden ad alanında", () => {
    expect(D.disIslemDogrula({ ad: "  " }).hatalar.ad).toBe(D.AD_BOS_HATASI);
  });
  it("AC-4: Türkçe küçültmeyle ad çakışması (\"ISIL İŞLEM\" ↔ \"ısıl işlem\")", () => {
    expect(D.disIslemDogrula({ ad: "ısıl işlem" }, ISLEMLER).hatalar.ad).toBe(D.AD_AYNI_HATASI);
  });
  it("AC-5: düzenlenen işlemin kendi adı çakışma sayılmaz", () => {
    expect(D.disIslemDogrula({ ad: "ISIL İŞLEM" }, ISLEMLER, 11).gecerli).toBe(true);
  });
  it("AC-130: çöpteki aynı adlı işlem yeni kaydı engellemez (tekillik yalnız canlılar arasında)", () => {
    expect(D.disIslemDogrula({ ad: "Isıl işlem" }, [{ ...ADET, deletedAt: "x" }]).gecerli).toBe(true);
  });
  it("AC-6 (motor): birim iki değerlidir, varsayılan adet ve kayda her zaman yazılır (Karar 41)", () => {
    expect(D.BIRIMLER).toEqual(["adet", "kilo"]);
    expect(D.disIslemFormu({}).birim).toBe("adet");
    expect(D.disIslemDogrula({ ad: "X" }).kayit.birim).toBe("adet");
    expect(D.disIslemDogrula({ ad: "X", birim: "dakika" }).hatalar.birim).toBe(D.BIRIM_HATASI);
  });
  it("AC-7 / AC-69 / AC-85 (motor): TL para birimi ve boş alanlar kayda yazılmaz", () => {
    const k = D.disIslemDogrula({ ad: "X", paraBirimi: "TRY", birimFiyati: "", kur: "", tedarikciId: "" }).kayit;
    expect(k).toEqual({ ad: "X", birim: "adet" });
  });
  it("AC-8: dövizde kur boşsa reddedilir, neden kur alanında", () => {
    expect(D.disIslemDogrula({ ad: "X", paraBirimi: "USD", birimFiyati: "3" }).hatalar.kur).toBe(D.EKSIK_KUR_HATASI);
  });
  it("AC-9 (motor): EUR, kur 48, birim fiyatı 12 kaydedilir ve özeti \"12,00 €\" taşır", () => {
    const v = D.disIslemDogrula({ ad: "X", paraBirimi: "EUR", kur: "48", birimFiyati: "12" });
    expect(v.kayit).toEqual({ ad: "X", birim: "adet", paraBirimi: "EUR", kur: 48, birimFiyati: 12 });
    expect(D.kumeOzeti(D.fiyatKumesi(v.kayit))).toMatch(/^12,00 €/);
  });
  it("AC-10: belirsiz sayı (\"2.955\") reddedilir", () => {
    expect(D.disIslemDogrula({ ad: "X", birimFiyati: "2.955" }).hatalar.birimFiyati).toBe(BELIRSIZ_HATASI);
  });
  it("AC-11: negatif birim fiyatı reddedilir", () => {
    expect(D.disIslemDogrula({ ad: "X", birimFiyati: "-1" }).hatalar.birimFiyati).toBe(D.NEGATIF_HATASI);
  });
});

describe("Spec 0137: fiyat geçmişi (R6, R9, R9/2)", () => {
  const B = "2026-06-15";
  it("AC-20: ilk fiyat girişi geçmiş kaydı doğurmaz", () => {
    expect(D.fiyatGecmisiYaz({ id: 1, ad: "X" }, { id: 1, ad: "X", birimFiyati: 20 }, { tarih: B, bugun: B }).gecmis).toEqual([]);
  });
  it("AC-21: 20 → 25 geçmişe eski kümeyi (20) taşıyan bir satır yazar", () => {
    const r = D.fiyatGecmisiYaz(ADET, { ...ADET, birimFiyati: 25 }, { tarih: "2026-06-01", bugun: B });
    expect(r.gecmis).toEqual([{ birimFiyati: 20, paraBirimi: "TRY", gecerli: "" }, { birimFiyati: 25, paraBirimi: "TRY", gecerli: "2026-06-01" }]);
  });
  it("AC-22: aynı gün ikinci değişiklik son satırın üstüne yazar", () => {
    const bir = { ...ADET, birimFiyati: 25, fiyatGecmisi: D.fiyatGecmisiYaz(ADET, { ...ADET, birimFiyati: 25 }, { tarih: B, bugun: B }).gecmis };
    const iki = D.fiyatGecmisiYaz(bir, { ...bir, birimFiyati: 27 }, { tarih: B, bugun: B }).gecmis;
    expect(iki).toHaveLength(2);
    expect(iki[1]).toMatchObject({ gecerli: B, birimFiyati: 27 });
  });
  it("AC-23: yalnız kur değişirse de geçmişe satır yazılır", () => {
    expect(D.fiyatGecmisiYaz(USD, { ...USD, kur: 52 }, { tarih: B, bugun: B }).gecmis).toHaveLength(2);
  });
  it("AC-24 (motor): geçerlilik tarihi yarın verilirse reddedilir", () => {
    expect(D.fiyatGecmisiYaz(ADET, { ...ADET, birimFiyati: 25 }, { tarih: "2026-06-16", bugun: B }).hata).toBeTruthy();
  });
  it("AC-25: küme değişmeyen kayıtta geçmiş aynen kalır", () => {
    expect(D.fiyatGecmisiYaz(TARIHLI, { ...TARIHLI, ad: "Başka" }, { tarih: B, bugun: B }).gecmis).toEqual(D.fiyatGecmisiOf(TARIHLI));
  });
  it("AC-128: birim kümeye girmez; yalnız birim değişince geçmiş yazılmaz", () => {
    expect(D.FIYAT_ALANLARI).toEqual(["birimFiyati", "paraBirimi", "kur"]);
    expect(D.fiyatGecmisiYaz(ADET, { ...ADET, birim: "kilo" }, { tarih: B, bugun: B }).gecmis).toEqual([]);
  });
});

describe("Spec 0137: katalog bağlı kalemin tutarı (R11–R15/4, R31, Karar 35)", () => {
  it("AC-29: 20 TL'lik adet birimli işlemden 3 adet 60 TL ekler", () => {
    expect(maliyet([kat(11, 3)]).toplamK).toBe(6000);
  });
  it("AC-30: 2 USD, kur 50 → 1 adet 100 TL", () => {
    expect(maliyet([kat(13, 1)]).toplamK).toBe(10000);
  });
  it("AC-34: kilo başı 30 TL, işlenmiş ağırlığı 2 kg olan tek malzeme kalemli parçaya 60 TL ekler", () => {
    const oz = maliyet([LAMA, kat(12)]);
    expect(oz.satirlar[1].tutarK).toBe(6000);
    expect(oz.satirlar[1].kg).toBe(2);
  });
  it("AC-35: aynı işlem, adedi 3 olan malzeme kalemli parçaya 180 TL ekler", () => {
    expect(maliyet([{ ...LAMA, adet: 3 }, kat(12)]).satirlar[1].tutarK).toBe(18000);
  });
  it("AC-36: iki malzeme kalemi varsa kilo tabanı işlenmiş ağırlıkların toplamıdır", () => {
    const ikinci = { ...LAMA, boy: 125 }; // 1 kg
    expect(maliyet([LAMA, ikinci, kat(12)]).satirlar[2].kg).toBe(3);
  });
  it("AC-37 / AC-96: kilo tabanı işlenmiş ağırlıktır (işleme payı ve fire hariç; ham ve fireli ağırlıktan küçük)", () => {
    const oz = malzemeOzeti(LAMA, mk());
    expect(islenmisKg(LAMA, mk()).kg).toBe(2);
    expect(oz.hamKg).toBeGreaterThan(2);
    expect(oz.fireliKg).toBeGreaterThan(oz.hamKg);
  });
  it("AC-38: miktarı 5 girilen kilo kalemi parçanın ağırlığını yok sayar", () => {
    const r = maliyet([LAMA, kat(12, 5)]).satirlar[1];
    expect([r.kg, r.tutarK, r.kgTuretildi]).toEqual([5, 15000, false]);
  });
  it("AC-39: miktarı boş kilo kalemi, malzeme kalemi olmayan parçada çözülemez ve maliyet girilmedi", () => {
    const oz = maliyet([kat(12)]);
    expect(oz.toplamK).toBeNull();
    expect(oz.satirlar[0].eksik).toEqual([NEDEN_MALZEME_KALEMI_YOK]);
  });
  it("AC-40: işlem çöpteyse parçanın maliyeti girilmedi (eski tutar ya da sıfır yok)", () => {
    const oz = maliyet([kat(11, 3), serbest("X", 10)], undefined, [{ ...ADET, deletedAt: "x" }]);
    expect(oz.toplamK).toBeNull();
    expect(oz.satirlar[0].eksik).toEqual([D.ISLEM_YOK]);
  });
  it("AC-41: fiyatı girilmemiş işlemin kalemi maliyeti girilmedi yapar", () => {
    expect(maliyet([kat(15, 1)], undefined, [{ id: 15, ad: "Fiyatsız", birim: "adet" }]).toplamK).toBeNull();
  });
  it("AC-42: para birimi tanınmayan işlemin kalemi maliyeti girilmedi yapar", () => {
    const oz = maliyet([kat(16, 1)], undefined, [{ id: 16, ad: "GBP", birim: "adet", birimFiyati: 5, paraBirimi: "GBP" }]);
    expect(oz.toplamK).toBeNull();
    expect(oz.satirlar[0].eksik).toEqual([D.EKSIK_PARA]);
  });
  it("AC-43 / AC-89: bir katalog kalemi çözülemiyorsa öteki kalemler çözülse de toplam girilmedi; özet islemEksik döner", () => {
    const oz = maliyet([LAMA, kat(11, 1), kat(99, 1)]);
    expect(oz.satirlar[0].cozuldu && oz.satirlar[1].cozuldu).toBe(true);
    expect(oz.islemEksik).toBe(true);
    expect(oz.toplamK).toBeNull();
  });
  it("AC-44: katalog bağlı ve serbest kalem yan yana toplanır", () => {
    expect(maliyet([kat(11, 2), serbest("Büküm", 7.5)]).toplamK).toBe(4000 + 750);
  });
  it("AC-45 (motor) / AC-90: serbest kalemin boş tutarı islemEksik yapmaz, toplama girmez, ötekiler bozulmaz", () => {
    const oz = maliyet([kat(11, 1), serbest("Boş", null)]);
    expect(oz.islemEksik).toBe(false);
    expect(oz.satirlar[1]).toMatchObject({ bos: true, cozuldu: true, tutarK: null });
    expect(oz.toplamK).toBe(2000);
  });
  it("AC-91: miktarı geçersiz katalog kalemi maliyeti girilmedi yapar (adette sıfır, negatif, ondalık, metin; kiloda negatif)", () => {
    for (const m of [0, -1, 1.5, "abc", 1001]) expect(maliyet([kat(11, m)]).toplamK, String(m)).toBeNull();
    expect(maliyet([LAMA, kat(12, -2)]).toplamK).toBeNull();
    expect(maliyet([LAMA, kat(12, 1.2345)]).toplamK).toBeNull();
  });
  it("AC-92: birim fiyatı 0 çözülür ve 0 TL ekler; boş fiyat çözülemez", () => {
    expect(maliyet([kat(17, 3), serbest("X", 5)], undefined, [{ id: 17, ad: "Bedava", birim: "adet", birimFiyati: 0 }]).toplamK).toBe(500);
    expect(maliyet([kat(17, 3), serbest("X", 5)], undefined, [{ id: 17, ad: "Boş", birim: "adet" }]).toplamK).toBeNull();
  });
  it("AC-93: boy fiyatından hesaplanan malzemede miktarı boş kilo kalemi çözülemez, nedeni ayrı", () => {
    const boyKalemi = { tur: "malzeme", malzemeId: 2, bicim: "mil", yontem: "boy", cap: 20, boy: 300, adet: 1 };
    expect(maliyet([boyKalemi, kat(12)]).satirlar[1].eksik).toEqual([NEDEN_BOY_AGIRLIK]);
  });
  it("AC-94: özgül ağırlığı girilmemiş malzemede kendi nedeni", () => {
    expect(parcaIslenmisKg([{ ...LAMA, malzemeId: 3 }], mk()).neden).toBe(EKSIK_OZGUL);
  });
  it("AC-95: ölçüsü eksik malzeme kaleminde kendi nedeni", () => {
    expect(parcaIslenmisKg([{ ...LAMA, genislik: "" }], mk()).neden).toBe(NEDEN_OLCU_EKSIK);
  });
  it("AC-104: 0,335 TL × 3 adet = 1,02 TL (birim bir kez kuruşa)", () => {
    expect(maliyet([kat(18, 3)], undefined, [{ id: 18, ad: "Ucuz", birim: "adet", birimFiyati: 0.335 }]).toplamK).toBe(102);
  });
  it("AC-105: 0,33 TL × 2,345 kg = 0,77 TL (satır ikinci kez kuruşa)", () => {
    expect(maliyet([kat(19, 2.345)], undefined, [{ id: 19, ad: "Ucuz kilo", birim: "kilo", birimFiyati: 0.33 }]).toplamK).toBe(77);
  });
  it("Karar 35: türetilen kilo üç ondalığa yuvarlanıp çarpılır", () => {
    const m = { ...LAMA, boy: 250.00049 }; // 2,0000039… kg → 2,000
    expect(maliyet([m, kat(12)]).satirlar[1]).toMatchObject({ kg: 2, tutarK: 6000 });
  });
});

describe("Spec 0137: kalem formu ve doğrulama (R10–R10/5, R12, R13/2, R17, Karar 36, 37, 41, 42)", () => {
  it("AC-28 (motor): adet birimli işlem seçilince miktar 1; Karar 42 birim değişince varsayılana döner", () => {
    const f = kalemCesidiDegistir({ _anahtar: "k" }, CESIT.KATALOG);
    expect(katalogIslemSec(f, 11, ik())).toMatchObject({ islemId: "11", miktar: "1" });
    expect(katalogIslemSec({ ...f, islemId: "11", miktar: "4" }, 12, ik()).miktar).toBe("");
    expect(katalogIslemSec({ ...f, islemId: "11", miktar: "4" }, 13, ik()).miktar).toBe("4");
  });
  it("AC-31 / AC-32 (motor): adette 0, ondalık ve 1.001 reddedilir, neden kalemde", () => {
    const f = (miktar) => kalemlerDogrula([{ ...kalemFormu(kat(11)), miktar }], ik()).hatalar[0]?.miktar;
    expect(f("0")).toBe(SET_ADET_HATASI);
    expect(f("1,5")).toBe(SET_ADET_HATASI);
    expect(f("1001")).toBe(ADET_UST_HATASI);
    expect(f("1000")).toBeUndefined();
  });
  it("AC-98–AC-103: kilo miktarı boş geçer; belirsiz, negatif, sıfır, 10.001 ve dört ondalık reddedilir", () => {
    expect(D.kiloMiktariDogrula("")).toMatchObject({ deger: null, hata: null });
    expect(kalemlerDogrula([{ ...kalemFormu(kat(12)), miktar: "" }], ik()).kayit).toEqual([{ tur: "islem", islemId: 12 }]);
    expect(D.kiloMiktariDogrula("2.955").hata).toBe(BELIRSIZ_HATASI);
    expect(D.kiloMiktariDogrula("-1").hata).toBe(D.NEGATIF_HATASI);
    expect(D.kiloMiktariDogrula("0").hata).toBe(D.POZITIF_HATASI);
    expect(D.POZITIF_HATASI).toMatch(/Sıfırdan büyük/);
    expect(D.kiloMiktariDogrula("10001").hata).toBe(D.KILO_UST_HATASI);
    expect(D.kiloMiktariDogrula("10000").hata).toBeNull();
    expect(D.kiloMiktariDogrula("1,2345").hata).toBe(D.KILO_ONDALIK_HATASI);
    expect(D.kiloMiktariDogrula("1,234").deger).toBe(1.234);
  });
  it("AC-86 / Karar 41: katalog kalemi kayıtta { tur, islemId, miktar }; serbest alanlar yok; boş kiloda miktar anahtarı yok", () => {
    const d = kalemlerDogrula([{ ...kalemFormu(kat(11)), miktar: "3" }, { ...kalemFormu(kat(12)), miktar: "" }], ik());
    expect(d.kayit).toEqual([{ tur: "islem", islemId: 11, miktar: 3 }, { tur: "islem", islemId: 12 }]);
    for (const k of d.kayit) for (const a of ["ad", "tedarikciId", "tutar"]) expect(a in k).toBe(false);
  });
  it("Triyaj (bulgu 2): çöpteki adet birimli işlemin miktarı ham haritayla adet kuralından geçer (ondalık reddedilir)", () => {
    const liste = [{ ...ADET, deletedAt: "x" }];
    const f = [{ ...kalemFormu(kat(11)), miktar: "2,5" }];
    expect(kalemlerDogrula(f, D.disIslemHamKatalogu(liste)).hatalar[0]?.miktar).toBe(SET_ADET_HATASI);
    expect(kalemlerDogrula(f, D.disIslemKatalogu(liste)).hatalar[0]).toBeUndefined(); // canlı harita birimi bilmezdi
    expect(formKalemOzeti(f, mk(), D.disIslemKatalogu(liste), D.disIslemHamKatalogu(liste)).gecerli).toBe(false);
  });
  it("Karar 36: işlem seçilmemiş katalog kalemi kaydı engeller", () => {
    expect(kalemlerDogrula([kalemCesidiDegistir({}, CESIT.KATALOG)], ik()).hatalar[0].islemId).toBe(ISLEM_SECILMEDI);
  });
  it("AC-46 / AC-47 (motor): çeşit değişince öteki çeşidin alanları düşer; veri doluysa onay gerekir", () => {
    const s = kalemFormu(serbest("Lazer", 10, 5));
    expect(cesitVerisiDolu(s)).toBe(true);
    const k = kalemCesidiDegistir(s, CESIT.KATALOG);
    expect(Object.keys(k).sort()).toEqual(["_anahtar", "_cesit", "islemId", "miktar", "tur"]);
    const geri = kalemCesidiDegistir({ ...k, islemId: "11", miktar: "2" }, CESIT.SERBEST);
    expect("islemId" in geri || "miktar" in geri).toBe(false);
    expect(cesitVerisiDolu(kalemCesidiDegistir({}, CESIT.KATALOG))).toBe(false);
  });
  it("Karar 37: serbest kalemin formu spec öncesiyle aynı şekildedir (çeşit anahtarı yok)", () => {
    expect(Object.keys(kalemFormu(serbest("A", 1))).sort()).toEqual(["_anahtar", "ad", "tedarikciId", "tur", "tutar"]);
  });
  it("AC-126 (motor): kalem sınırı 20 ve iki çeşidi birlikte sayar", () => {
    expect(MALIYET_KALEM_SINIRI).toBe(20);
    expect(KALEM_SINIRI_NEDENI).toMatch(/20 maliyet kalemi/);
  });
  it("AC-48 (motor): formun canlı özeti ile kaydedilen parçanın okuma yolu aynı rakam", () => {
    const form = [kalemFormu(LAMA), { ...kalemFormu(kat(12)), miktar: "" }, { ...kalemFormu(kat(13)), miktar: "2" }, kalemFormu(serbest("B", 3.5))];
    const oz = formKalemOzeti(form, mk(), ik());
    const p = parca({ maliyetKalemleri: oz.kayit });
    expect(parcaMaliyetKurus(p, undefined, setKatalogu([p]), mk(), ik())).toBe(oz.toplamK);
  });
});

describe("Spec 0137: tarihli okuma ve geçmiş kapısı (R18, R29, R29/2)", () => {
  const p = parca({ maliyetKalemleri: [kat(14, 1)] });
  it("AC-49: 2026-07-15 sorgusu 20 ile hesaplanır", () => {
    expect(parcaMaliyetKurus(p, "2026-07-15", null, mk(), ik())).toBe(2000);
  });
  it("AC-50: tarihsiz sorgu bugünkü fiyatla (25)", () => {
    expect(parcaMaliyetKurus(p, undefined, null, mk(), ik())).toBe(2500);
  });
  it("AC-51: serbest kalem tarihli sorguda bugünkü tutarıyla girer", () => {
    const karma = parca({ maliyetKalemleri: [kat(14, 1), serbest("S", 10)] });
    expect(parcaMaliyetKurus(karma, "2026-07-15", null, mk(), ik())).toBe(2000 + 1000);
  });
  it("AC-108: tarihli maliyet katalogdan gelir, parçanın kendi geçmişinden değil", () => {
    const g = { ...p, maliyetGecmisi: [{ gecerli: "", kurus: 99 }, { gecerli: "2026-08-01", kurus: 77 }] };
    expect(kalemYoluMu(g)).toBe(true);
    expect(parcaMaliyetKurus(g, "2026-07-15", null, mk(), ik())).toBe(2000);
  });
  it("AC-106: yalnız katalog işlem kalemli parçanın kendi geçmişine satır yazılmaz (motor ve kayıt adımı)", () => {
    const eski = parca({ maliyetKalemleri: [kat(11, 1)] });
    const yeni = parca({ maliyetKalemleri: [kat(11, 2)] });
    expect(maliyetGecmisiYaz(eski, 4000, { tarih: "2026-06-01", bugun: "2026-06-15", katalogIslem: true }).gecmis).toEqual([]);
    const k = gecmisliKayit(yeni, eski, { tarih: "2026-06-01", bugun: "2026-06-15", tarihElle: false, islemKat: ik(), malzemeKat: mk() });
    expect(k.maliyetGecmisi).toBeUndefined();
  });
  it("R29/2: yalnız serbest kalemli parçada geçmiş motoru eskisi gibi çalışır (kapı dar kalır)", () => {
    const eski = parca({ maliyetKalemleri: [serbest("S", 10)] });
    const r = maliyetGecmisiYaz(eski, 1500, { tarih: "2026-06-01", bugun: "2026-06-15", islemKat: ik() });
    expect(r.gecmis).toHaveLength(2);
  });
});

describe("Spec 0137: tüketiciler (R20, R30–R34)", () => {
  const P = [
    parca({ id: 1, ad: "Mil", maliyetKalemleri: [LAMA, kat(12)], fiyatKipi: "maliyet", karKati: 2 }),
    parca({ id: 2, ad: "Pim", maliyetKalemleri: [kat(11, 2)] }),
    parca({ id: 3, ad: "Set", setIcerigi: [{ partId: 1, miktar: 1 }, { partId: 2, miktar: 3 }] }),
    parca({ id: 4, ad: "Serbest", maliyetKalemleri: [serbest("S", 4)] }),
  ];
  it("AC-111 / Karar 34: bileşeninde katalog kalemi olan setin maliyeti çözülür (beşinci parametre işlem kataloğu)", () => {
    const o = setOzeti(P[2].setIcerigi, setKatalogu(P), undefined, mk(), ik());
    // Mil: lama 2 kg × (1+0,1) … malzeme + 60 TL galvano; Pim 40 TL × 3
    expect(o.maliyetK).toBe(parcaMaliyetKurus(P[0], undefined, setKatalogu(P), mk(), ik()) + 3 * 4000);
    expect(setOzeti(P[2].setIcerigi, setKatalogu(P), undefined, mk()).maliyetK).toBeNull();
  });
  it("AC-64 (motor): Model Maliyetleri işlem bedelini içerir", () => {
    const m = modelMaliyetleri({ standardModels: [{ model: "A", defaultParcalar: [{ partId: 2, miktar: 1 }] }], parts: P, malzemeler: MALZ, disIslemler: ISLEMLER }, 0);
    expect(m[0].direktK).toBe(4000);
  });
  it("AC-65 (motor): maliyete bağlı satış fiyatı işlem fiyatı değişince değişir; bağlam tek kurucudan", () => {
    const b1 = fiyatBaglamiKur({ parts: P, malzemeler: MALZ, disIslemler: ISLEMLER });
    const b2 = fiyatBaglamiKur({ parts: P, malzemeler: MALZ, disIslemler: ISLEMLER.map(x => (x.id === 12 ? { ...x, birimFiyati: 40 } : x)) });
    const f1 = parcaSatisFiyati(P[0], "TRY", b1).deger; const f2 = parcaSatisFiyati(P[0], "TRY", b2).deger;
    expect(Number(f2) - Number(f1)).toBeCloseTo(2 * 20, 5); // 2 kg × 10 TL zam × kat 2
  });
  it("AC-66 / AC-113 (motor): dışa aktarma çözülmüş maliyeti yazar; içe aktarma hücreyi kayda yazmaz, farkı satır numarasıyla söyler", () => {
    const satir = parcaDisaAktarmaSatiri(P[1], setKatalogu(P), mk(), null, ik());
    expect(satir[9]).toBe(40);
    const r = parcaSatirlariniCoz([["b"], ["Pim", "", "", "", "", "", "", "", "", 41]], P, 1, "2026-06-15", MALZ, null, ISLEMLER);
    expect(r.parts[0].maliyet).toBeUndefined();
    expect(r.errors.join(" ")).toMatch(/Satır 2:/);
    const ayni = parcaSatirlariniCoz([["b"], ["Pim", "", "", "", "", "", "", "", "", 40]], P, 1, "2026-06-15", MALZ, null, ISLEMLER);
    expect(ayni.errors).toEqual([]);
  });
  it("AC-109: hem malzeme hem katalog kalemli parça malzeme zammının etki önizlemesine girer", () => {
    const zamli = { ...LAMA_M, kiloFiyati: 60 };
    expect(fiyatEtkisi(LAMA_M, zamli, P, MALZ).degisen).toBe(0); // katalogsuz: iki hâl de null (gerileme)
    expect(fiyatEtkisi(LAMA_M, zamli, P, MALZ, { disIslemler: ISLEMLER }).degisen).toBeGreaterThan(0);
  });
  it("AC-18 / AC-19 / AC-127 (motor): işlem zammının etkisi parça sayısı, maliyet ve satış fiyatı; bağsız işlemde sıfır", () => {
    const e = disIslemFiyatEtkisi(ADET, { ...ADET, birimFiyati: 25 }, P, { disIslemler: ISLEMLER, malzemeler: MALZ, fiyatAyarlari: { varsayilanKat: 2 } });
    expect(e.bagli).toBe(1);
    expect(e.satirlar.map(r => [r.id, r.once, r.sonra])).toEqual([[2, 4000, 5000], [3, expect.any(Number), expect.any(Number)]]);
    expect(etkiMetni(e)).toMatch(/2 parçanın maliyeti değişecek \(1 bağlı parça\)/);
    const bos = disIslemFiyatEtkisi({ id: 50, ad: "Yok", birim: "adet", birimFiyati: 1 }, { id: 50, ad: "Yok", birim: "adet", birimFiyati: 2 }, P, { disIslemler: [...ISLEMLER, { id: 50, ad: "Yok", birim: "adet", birimFiyati: 1 }] });
    expect([bos.bagli, bos.degisen, etkiMetni(bos)]).toEqual([0, 0, BAGLI_PARCA_YOK]);
    expect(fiyatEtkiMetni({ fiyatDegisen: 3 })).toBe("3 parçanın satış fiyatı değişecek.");
  });
  it("R20/2 / AC-125 (motor): kaynak ibaresi iki çeşidi ayırmaz", () => {
    expect(kalemKaynakMetni(maliyetKaynagi(parca({ maliyetKalemleri: [kat(11, 1), serbest("S", 1)] })))).toBe("Maliyet kalemlerinden hesaplanıyor (0 malzeme, 2 işlem kalemi)");
  });
});

describe("Spec 0137: kullanım, koruma, birleştirme (R1/2, R2/2, R21, R22, C4)", () => {
  const P = [parca({ id: 1, maliyetKalemleri: [kat(11, 1), serbest("S", 1, 801)] }), parca({ id: 2, deletedAt: "x", maliyetKalemleri: [kat(12)] })];
  it("AC-117 / AC-59 (motor): kullanım canlı ve çöpteki parçaları ayrı sayar; koruma kümesi çöptekileri de içerir", () => {
    expect(D.disIslemKullanimi(11, P, kalemIslemIdleri)).toEqual({ canli: 1, cop: 0 });
    expect(D.disIslemKullanimi(12, P, kalemIslemIdleri)).toEqual({ canli: 0, cop: 1 });
    expect([...D.kullanilanDisIslemler(P, kalemIslemIdleri)].sort()).toEqual(["11", "12"]);
    expect(D.kullanimMetni({ canli: 1, cop: 1 })).toBe("1 parçanın maliyet kaleminde kullanılıyor (1 parça çöpte).");
  });
  it("AC-60 (motor): hiçbir parçada geçmeyen işlem koruma kümesinde değil", () => {
    expect(D.kullanilanDisIslemler(P, kalemIslemIdleri).has("13")).toBe(false);
  });
  it("AC-129: çöp satırının etiketi \"ad · birim\", tedarikçi yok", () => {
    expect(D.disIslemCopEtiketi({ ...KILO, tedarikciId: 801 })).toBe("Galvano · kilo");
  });
  it("AC-116 (motor): fiyatı girilmemiş canlı işlem sayısı", () => {
    expect(D.eksikDisIslemSayisi([ADET, { id: 9, ad: "F" }, { id: 10, ad: "G", deletedAt: "x" }, { id: 11, ad: "D", paraBirimi: "USD", birimFiyati: 1 }])).toBe(2);
  });
  it("AC-62 / AC-63 / AC-131 / AC-132 (motor): katalog işleminin tedarikçisi aynı haritada; neden iki adresi söyler", () => {
    const disIslemler = [{ ...ADET, tedarikciId: 802 }, { ...KILO, tedarikciId: 803, deletedAt: "x" }];
    const h = kalemdeGecenTedarikciler(P, disIslemler);
    expect(h.get("801")).toEqual({ parca: 1, cop: 0 });
    expect(h.get("802")).toEqual({ parca: 0, cop: 0, islem: 1 });
    expect(h.get("803")).toEqual({ parca: 0, cop: 0, islem: 1, islemCop: 1 });
    expect(tedarikciKullanim(802, [], [], P, h)).toMatchObject({ islem: 1, parca: 0 });
    expect(tedarikciKorumaNedeni(h.get("801"))).toBe(KALEMDE_TEDARIKCI_NEDENI);
    expect(tedarikciKorumaNedeni(h.get("802"))).toBe(KALEMDE_VE_KATALOGDA_TEDARIKCI_NEDENI);
    expect(KALEMDE_VE_KATALOGDA_TEDARIKCI_NEDENI).toMatch(/Parça\/Yedek Parça[\s\S]*Dış İşlemler/);
  });
  it("R10/4: katalog kaleminin tedarikçisi yoktur; serbest kalemin tedarikçisi korunur", () => {
    expect(kalemTedarikciIdleri(parca({ maliyetKalemleri: [{ ...kat(11, 1), tedarikciId: 9 }, serbest("S", 1, 7)] }))).toEqual(["7"]);
  });
  it("AC-72 / AC-73 / AC-74: birleştirmede eklenen işlem korunur; yeniden kimliklendirilen işlem ve tedarikçi bağları güncellenir", () => {
    // Bu oturumda üretilen kimlikler eklenti sayılır (0132 AC-59 kurgusu).
    const iid = uid(), tid = uid(), pid = uid();
    const sunucu = { disIslemler: [{ id: iid, ad: "Başka" }], tedarikciler: [{ id: tid, ad: "Sunucunun" }], parts: [] };
    const yerel = { disIslemler: [{ id: iid, ad: "Yerel", tedarikciId: tid }], tedarikciler: [{ id: tid, ad: "Yerelin" }], parts: [parca({ id: pid, maliyetKalemleri: [kat(iid, 2)] })] };
    const plan = buildMergePlan(yerel, sunucu, {});
    const islem = plan.adds.disIslemler[0];
    expect(islem.ad).toBe("Yerel");
    expect(islem.id).not.toBe(iid);
    expect(String(islem.tedarikciId)).toBe(String(plan.adds.tedarikciler[0].id));
    expect(String(plan.adds.parts[0].maliyetKalemleri[0].islemId)).toBe(String(islem.id));
  });
});

describe("Spec 0137: kaynak taramaları", () => {
  const src = dosyalar("src");
  it("AC-81 / C3: işlem bedelinden tutar türeten çarpım yalnız disIslem.js'te", () => {
    const desen = /birimFiyati\s*\*|\*\s*[\w.?]*birimFiyati/;
    expect(src.filter(f => desen.test(kod(f)))).toEqual(["src/lib/disIslem.js"]);
  });
  it("AC-82 / C8: kod adı denetim izi, izin ekranı ve kasa hareketleriyle karışmaz", () => {
    for (const f of ["src/components/settings/serverPermissionDefs.js", "src/lib/kasa.js", "src/lib/audit.js", "src/lib/permissions.js", "src/components/settings/UserManager.jsx"])
      expect(kod(f), f).not.toMatch(/disIslem|dis_islem/);
    expect(kod("src/lib/disIslem.js")).not.toMatch(/hesapHareket|giderActions|kasaActions|logAction/);
    // Denetim izinde yalnız entity etiketi ("Dış İşlem"), eylem adları bugünküler (R24/3).
    expect(kod("src/components/settings/SettingsAuditLog.jsx")).toMatch(/dis_islem: "Dış İşlem"/);
  });
  it("AC-84: kalıcı adlar", () => {
    expect(kod("electron/serverAuth.cjs")).toMatch(/"disIslemler"/);
    expect(kod("electron/db.cjs")).toMatch(/CREATE TABLE IF NOT EXISTS dis_islemler/);
    expect(kod("src/components/Settings.jsx")).toMatch(/\{ id: "disislemler", label: "Dış İşlemler"/);
    expect(statSync("src/lib/disIslem.js").isFile()).toBe(true);
    expect(kod("src/lib/kilitAlanlari.js")).toMatch(/disislemler: "Dış İşlemler"/);
  });
  it("AC-87: parts tablosuna yeni sütun yok; kalem maliyetKalemleri JSON'unda", () => {
    const db = kod("electron/db.cjs");
    const parts = db.match(/CREATE TABLE IF NOT EXISTS parts \(([^)]*)\)/)[1];
    expect(parts).not.toMatch(/islem/i);
    expect(db).not.toMatch(/ensureColumns\(conn, "parts", [^)]*ISLEM/);
  });
  it("AC-88: KALEM_TUR iki değerde; kaynakta üçüncü tür yok", () => {
    expect(Object.values(KALEM_TUR)).toEqual(["malzeme", "islem"]);
    const ucuncu = src.filter(f => /KALEM_TUR\.(?!MALZEME\b|ISLEM\b)\w+/.test(kod(f)));
    expect(ucuncu).toEqual([]);
  });
  it("AC-96: dış işlem motorunda ağırlık çarpımı yok; işlenmiş ağırlık malzeme.js'te", () => {
    const d = kod("src/lib/disIslem.js");
    expect(d).not.toMatch(/ozgulAgirlik|agirlikKg|Math\.PI/);
    expect(kod("src/lib/malzeme.js")).toMatch(/export const islenmisKg = /);
    expect(src.filter(f => /export const islenmisKg/.test(kod(f)))).toEqual(["src/lib/malzeme.js"]);
  });
  it("AC-97: yeni kavram netKg adını kullanmaz; 0134'ün netKg'si yerinde", () => {
    expect(src.filter(f => /\bnetKg\b/.test(kod(f))).sort()).toEqual(["src/components/maliyet/SiparisIhtiyaci.jsx", "src/lib/siparisIhtiyaci.js", "src/lib/siparisRaporu.js"]);
  });
  it("AC-115 / R30: dört fonksiyonun bütün çağrıları yeni kataloğu taşır (gerekçeli istisnalar tam yollu)", () => {
    // Çağrının üst düzey argüman sayısı: parcaMaliyetKurus/parcaMaliyetiVar/maliyetGirildiMi ≥ 5, setOzeti ≥ 5.
    const argSay = (metin, bas) => {
      let d = 0, n = 1, i = bas;
      for (; i < metin.length; i++) {
        const c = metin[i];
        if (c === "(" || c === "[" || c === "{") d++;
        else if (c === ")" || c === "]" || c === "}") { if (d === 0) break; d--; }
        else if (c === "," && d === 0) n++;
      }
      return metin.slice(bas, i).trim() === "" ? 0 : n;
    };
    // İstisnalar (tam yol, gerekçe): tek okuma yolunun kendi gövdesi beş parametreyi geçirir; parçanın eksik maliyet sayacı yok.
    const eksik = [];
    for (const f of src) {
      const k = kod(f);
      for (const m of k.matchAll(/\b(parcaMaliyetKurus|parcaMaliyetiVar|maliyetGirildiMi|setOzeti)\(/g)) {
        const once = k.slice(Math.max(0, m.index - 20), m.index);
        if (/export const\s*$/.test(once) || /const\s+$/.test(once)) continue; // tanımın kendisi
        const n = argSay(k, m.index + m[0].length);
        if (n < 5) eksik.push(`${f}: ${m[1]} (${n})`);
      }
    }
    expect(eksik).toEqual([]);
  });
  it("R30: bağlam tek kurucudan; ekranlar fiyat bağlamına dış işlem listesini verir", () => {
    expect(kod("src/lib/parcaFiyati.js")).toMatch(/islemKat: disIslemKatalogu\(disIslemler\)/);
    for (const f of ["Customers", "SimpleDealers", "Stock", "Documents", "ServisPanosu", "PartManager"])
      expect(kod(`src/components/${f}.jsx`), f).toMatch(/fiyatBaglamiKur\(\{ parts, malzemeler, disIslemler,/);
    // Ekranlar kendi işlem haritasını yalnız PartManager'da (tek okuma yolunun listesi için) kurar.
    expect(src.filter(f => f.startsWith("src/components") && /disIslemKatalogu\(/.test(kod(f))).sort())
      .toEqual(["src/components/PartManager.jsx", "src/components/settings/SettingsExport.jsx"]);
  });
  it("Karar 38: disIslem.js tek okuma yolunu, malzemeyi ve satış fiyatını içe almaz", () => {
    const d = readFileSync("src/lib/disIslem.js", "utf8");
    expect(d).not.toMatch(/from "\.\/(urunAgaci|malzeme|parcaFiyati|maliyetKalemleri)"/);
  });
  it("R29 / R29/2: geçmiş kapısının üç çağıranı katalogIslem'i geçirir", () => {
    expect(kod("src/lib/urunAgaci.js")).toMatch(/katalogIslem: maliyetKalemleriOf\(temel\)\.some\(katalogIslemMi\)/);
    expect(kod("src/components/PartManager.jsx")).toMatch(/katalogIslem: maliyetKalemleriOf\(temel\)\.some\(katalogIslemMi\)/);
    expect(kod("src/lib/parcaAktarma.js")).toMatch(/katalogIslem: katalogIslemVarMi\(mevcut\)/);
  });
  it("AC-83: panelin ve pencerenin kullanıcıya görünen metinleri Türkçe (İngilizce kelime yok)", () => {
    for (const f of ["src/components/DisIslemManager.jsx", "src/components/DisIslemFiyatPenceresi.jsx"]) {
      const metinler = [...kod(f).matchAll(/>([^<>{}]+)</g)].map(m => m[1].trim()).filter(Boolean);
      for (const m of metinler) expect(m, `${f}: ${m}`).not.toMatch(/\b(Save|Cancel|Delete|Edit|Price|Unit|Supplier|Name)\b/);
    }
  });
});
