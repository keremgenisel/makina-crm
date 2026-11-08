// Spec 0135: parça maliyetinde tek kip, çok malzeme ve işlem kalemi. Saf motor (türetme, toplam, doğrulama, tarihli okuma,
// geçmiş kapısı), sipariş ihtiyacı ve emniyet payı, malzeme ve tedarikçi korumaları, zam etkisi, birleştirme, Excel ve kaynak
// taramaları. Ekran kriterleri tests/ui/maliyet-kalemleri-0135.test.jsx, korumaların ekranları -koruma, gerçek App -app,
// kalem alanı olmayan veride spec öncesiyle aynılık -kiyas, gidiş dönüş scripts/tests/db-roundtrip.cjs ve db-clean-install.cjs.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import {
  parcaMaliyetKurus, maliyetKaynagi, maliyetKalemleriOzeti, formKalemOzeti, kalemlerDogrula, kalemleriFormu, maliyetGecmisiYaz,
  maliyetGirildiMi, SET_ADET_HATASI, ADET_UST_HATASI, MALZEME_SECILMEDI, ISLEM_AD_HATASI, ISLEM_TUTAR_UYARISI, KALEM_EXCEL_HATASI,
  TURETILEN_KALEM_ADI as _yok,
} from "../src/lib/urunAgaci";
import { maliyetKalemleriOf, malzemeKalemiVarMi, kalemVarMi, TURETILEN_KALEM_ADI, MALIYET_KALEM_SINIRI } from "../src/lib/maliyetKalemleri";
import { malzemeKatalogu, malzemeOzeti, kullanilanMalzemeler, malzemeKullanimi, fiyatEtkisi, BELIRSIZ_HATASI } from "../src/lib/malzeme";
import { kalemdeGecenTedarikciler, tedarikciKullanim } from "../src/lib/gider";
import { siparisIhtiyaci, emniyetPayiOf } from "../src/lib/siparisIhtiyaci";
import { buildMergePlan } from "../src/lib/merge";
import { uid } from "../src/lib/utils";
import { parcaDisaAktarmaSatiri, parcaSatirlariniCoz, parcaIceAktarmaUygula, PARCA_AKTARMA_BASLIKLARI } from "../src/lib/parcaAktarma";
import { topluKipOzeti, fiyatBaglamiKur, KIP_MALIYET } from "../src/lib/parcaFiyati";

const BUGUN = "2026-11-08";
const P304 = { id: 501, ad: "304 Paslanmaz", ozgulAgirlik: 7.9, kiloFiyati: 2.95, paraBirimi: "USD", kur: 50, geldigiBoy: 6, emniyetPayi: 5,
  fiyatGecmisi: [{ gecerli: "", kiloFiyati: 2.5, paraBirimi: "USD", kur: 40 }, { gecerli: "2026-03-01", kiloFiyati: 2.95, paraBirimi: "USD", kur: 50 }] };
const SAC = { id: 502, ad: "DKP Sac", ozgulAgirlik: 7.85, kiloFiyati: 38, emniyetPayi: 12 };
const DOVIZ = { id: 503, ad: "Kursuz", ozgulAgirlik: 7.85, kiloFiyati: 3, paraBirimi: "EUR" };
const FIYATSIZ = { id: 504, ad: "Fiyatsız", ozgulAgirlik: 7.85 };
const BOYLU = { id: 505, ad: "Boru", ozgulAgirlik: 7.9, boyFiyati: 600, geldigiBoy: 6 };
const MALZEMELER = [P304, SAC, DOVIZ, FIYATSIZ, BOYLU];
const KAT = malzemeKatalogu(MALZEMELER);
const MIL = { tur: "malzeme", malzemeId: 501, bicim: "mil", cap: 140, boy: 78, payCap: 4, payBoy: 5, fire: 8, adet: 1 };
const SACK = { tur: "malzeme", malzemeId: 502, bicim: "sac", kalinlik: 3, en: 200, boy: 300, adet: 1 };
const islem = (ad, tutar, tedarikciId) => ({ tur: "islem", ad, ...(tedarikciId != null ? { tedarikciId } : {}), tutar });
const parca = (o = {}) => ({ id: 1, ad: "Parça", models: [], ...o });
const birim = (k, tarih) => malzemeOzeti(k, KAT, tarih).maliyetK;

describe("Spec 0135: türetme (R2/2, R22–R24, R23/2, R45)", () => {
  it("AC-5 / AC-43 / AC-44: tutarı girilmiş kırılım satırları işlem kalemi olur; ad sabit, tedarikçi kalemin alanında", () => {
    const p = parca({ maliyet: 99, hammaddeler: [{ tedarikciId: 31, tutar: 120 }, { tedarikciId: 999, tutar: 80 }, { tedarikciId: 32, tutar: null }] });
    expect(maliyetKalemleriOf(p)).toEqual([islem(TURETILEN_KALEM_ADI, 120, 31), islem(TURETILEN_KALEM_ADI, 80, 999)]);
    expect(TURETILEN_KALEM_ADI).toBe("Hammadde alımı");
    expect(kalemVarMi(p)).toBe(true);
  });
  it("AC-4: malzeme satırı tek malzeme kalemi olur (adet 1); Karar 31: malzeme satırı varken kırılım türetilmez", () => {
    const ms = { malzemeId: 501, bicim: "mil", cap: 140, boy: 78 };
    expect(maliyetKalemleriOf(parca({ malzemeSatiri: ms, hammaddeler: [{ tedarikciId: 31, tutar: 5 }] }))).toEqual([{ tur: "malzeme", ...ms, adet: 1 }]);
  });
  it("AC-6 / Karar 32: yalnız elle maliyet ya da yalnız tutarsız kırılım kalem üretmez; kayıtlı liste eski alanların önüne geçer", () => {
    expect(kalemVarMi(parca({ maliyet: 5 }))).toBe(false);
    expect(kalemVarMi(parca({ maliyet: 5, hammaddeler: [{ tedarikciId: 31, tutar: null }] }))).toBe(false);
    expect(maliyetKalemleriOf(parca({ maliyetKalemleri: [islem("Lazer", 10)], malzemeSatiri: { malzemeId: 501, bicim: "mil" } }))).toEqual([islem("Lazer", 10)]);
  });
  it("R9/2: yirmiden çok kalem taşıyan kayıt okumada kırpılmaz ve bütün kalemleriyle hesaplanır", () => {
    const kalemler = Array.from({ length: MALIYET_KALEM_SINIRI + 5 }, (_, i) => islem(`İş ${i}`, 1));
    expect(maliyetKalemleriOf(parca({ maliyetKalemleri: kalemler }))).toHaveLength(25);
    expect(parcaMaliyetKurus(parca({ maliyetKalemleri: kalemler }))).toBe(2500);
  });
});

describe("Spec 0135: toplam (R8, R14, R16, R19, R27/2, C10)", () => {
  it("AC-23 / C10: adedi 2 olan kalemin tutarı adet 1 tutarının tam iki katı (kuruşa yuvarlanmış birim × adet)", () => {
    const bir = maliyetKalemleriOzeti([MIL], KAT).toplamK;
    expect(bir).toBe(birim(MIL));
    expect(maliyetKalemleriOzeti([{ ...MIL, adet: 2 }], KAT).toplamK).toBe(2 * bir);
  });
  it("AC-26 / AC-15: aynı malzemeden iki farklı kesit iki kalem; tutarlar ayrı hesaplanıp toplanır", () => {
    const ikinci = { ...MIL, cap: 60, boy: 40, payCap: 0, payBoy: 0, fire: 0 };
    expect(parcaMaliyetKurus(parca({ maliyetKalemleri: [MIL, ikinci] }), undefined, undefined, KAT)).toBe(birim(MIL) + birim(ikinci));
  });
  it("AC-37 / AC-38 / AC-102: karma toplam; yalnız işlem; aynı tedarikçi iki işlem kaleminde, ikisi de toplama girer", () => {
    const p = parca({ maliyetKalemleri: [SACK, islem("Lazer kesim", 125.5, 31), islem("Büküm", 40, 31)] });
    expect(parcaMaliyetKurus(p, undefined, undefined, KAT)).toBe(birim(SACK) + 12550 + 4000);
    expect(parcaMaliyetKurus(parca({ maliyetKalemleri: [islem("A", 10), islem("B", 0.2)] }))).toBe(1020);
  });
  it("AC-27 / AC-28 / AC-29: malzemesi seçilmemiş, kilo fiyatı ya da kuru eksik kalem varken maliyet girilmedi (kısmi toplam yok, sıfır yok)", () => {
    for (const k of [{ ...MIL, malzemeId: "" }, { ...SACK, malzemeId: 504 }, { ...SACK, malzemeId: 503 }]) {
      expect(parcaMaliyetKurus(parca({ maliyetKalemleri: [k, islem("Lazer", 100)] }), undefined, undefined, KAT)).toBeNull();
    }
    expect(formKalemOzeti([{ tur: "malzeme", malzemeId: "", adet: "1" }, { tur: "islem", ad: "Lazer", tutar: "100" }], KAT).toplamK).toBeNull();
  });
  it("AC-31: boy yönteminde kalemin tutarı 0132'nin boy kuralıyla, adetle çarpılır", () => {
    const k = { tur: "malzeme", malzemeId: 505, bicim: "boru", yontem: "boy", cap: 60, et: 5, boy: 400, adet: 3 };
    expect(maliyetKalemleriOzeti([k], KAT).toplamK).toBe(3 * birim(k));
    expect(birim(k)).toBe(Math.round((400 / 6000) * 600 * 100));
  });
  it("AC-35 / AC-98 / R27/2: tutarı boş işlem kalemi toplama girmez; hepsi boşsa maliyet girilmedi ve eski elle tutar okunmaz", () => {
    expect(parcaMaliyetKurus(parca({ maliyetKalemleri: [islem("Lazer", 50), islem("Kaplama", null)] }))).toBe(5000);
    expect(parcaMaliyetKurus(parca({ maliyet: 777, maliyetKalemleri: [islem("Kaplama", null)] }))).toBeNull();
    expect(maliyetGirildiMi(parca({ maliyet: 777, maliyetKalemleri: [islem("Kaplama", null)] }))).toBe(false);
  });
  it("R27: kaynak üç türdür; kalem türü kaç malzeme ve kaç işlem kalemi olduğunu taşır", () => {
    expect(maliyetKaynagi(parca({ maliyetKalemleri: [MIL, islem("A", 1), islem("B", 2)] }), undefined, undefined, KAT)).toEqual({ tur: "kalem", malzeme: 1, islem: 2 });
    expect(maliyetKaynagi(parca({ maliyet: 3 }))).toEqual({ tur: "elle" });
  });
});

describe("Spec 0135: doğrulama (R13, R13/2, R17–R19/2, R43, R45)", () => {
  const malzeme = (o = {}) => ({ ...kalemleriFormu([MIL])[0], ...o });
  it("AC-24: adet 0, eksi, kesirli ya da harf reddedilir (setin tam sayı metni)", () => {
    for (const v of ["0", "-1", "1,5", "abc", ""]) expect(kalemlerDogrula([malzeme({ adet: v })]).hatalar[0].adet).toBe(SET_ADET_HATASI);
  });
  it("AC-25 / AC-115: '1001' üst sınır metniyle, '1.000' tam sayı metniyle reddedilir; '1000' geçerli", () => {
    expect(kalemlerDogrula([malzeme({ adet: "1001" })]).hatalar[0].adet).toBe(ADET_UST_HATASI);
    expect(kalemlerDogrula([malzeme({ adet: "1.000" })]).hatalar[0].adet).toBe(SET_ADET_HATASI);
    expect(kalemlerDogrula([malzeme({ adet: "1000" })]).gecerli).toBe(true);
  });
  it("R43: malzemesi seçilmemiş malzeme kalemi kaydı engeller", () => {
    expect(kalemlerDogrula([malzeme({ malzemeId: "" })]).hatalar[0].malzemeId).toBe(MALZEME_SECILMEDI);
  });
  it("AC-33 / AC-34 / AC-35 / AC-36: ad zorunlu, tedarikçi isteğe bağlı, boş tutar uyarı ve null, negatif ya da sayı olmayan tutar hata", () => {
    const r = kalemlerDogrula([{ tur: "islem", ad: " ", tutar: "5" }, { tur: "islem", ad: "Büküm", tedarikciId: "", tutar: "" }, { tur: "islem", ad: "X", tutar: "-3" }, { tur: "islem", ad: "Y", tutar: "abc" }]);
    expect(r.hatalar[0].ad).toBe(ISLEM_AD_HATASI);
    expect(r.hatalar[1]).toBeUndefined();
    expect(r.uyarilar[1]).toBe(ISLEM_TUTAR_UYARISI);
    expect(r.hatalar[2].tutar).toBeTruthy(); expect(r.hatalar[3].tutar).toBeTruthy();
  });
  it("AC-103 / R19/2: '2.400' belirsiz sayı olarak reddedilir; '2,40' 2,40 TL saklanır; iki ondalığa yuvarlanır", () => {
    expect(kalemlerDogrula([{ tur: "islem", ad: "Lazer", tutar: "2.400" }]).hatalar[0].tutar).toBe(BELIRSIZ_HATASI);
    expect(kalemlerDogrula([{ tur: "islem", ad: "Lazer", tutar: "2,40" }]).kayit[0].tutar).toBe(2.4);
    expect(kalemlerDogrula([{ tur: "islem", ad: "Lazer", tutar: "1,239" }]).kayit[0].tutar).toBe(1.24);
  });
  it("AC-90 / AC-91 / R18/2: tür ayırıcısı ve düz malzeme alanları; tedarikçisiz kalemde anahtar yok, boş tutar null; ad kırpılır", () => {
    const r = kalemlerDogrula([malzeme({ adet: "2" }), { tur: "islem", ad: "  Kaplama  ", tedarikciId: "", tutar: "" }, { tur: "islem", ad: "Kaplama", tedarikciId: "31", tutar: "5" }]);
    expect(r.kayit[0]).toEqual({ ...MIL, adet: 2 });
    expect(r.kayit[1]).toEqual({ tur: "islem", ad: "Kaplama", tutar: null });
    expect(r.kayit[2]).toEqual({ tur: "islem", ad: "Kaplama", tedarikciId: 31, tutar: 5 });
  });
});

describe("Spec 0135: tarihli okuma ve geçmiş (R35–R36, Karar 11)", () => {
  it("AC-86 / AC-87: karma parçada malzeme o tarihin fiyatıyla, işlem bugünkü tutarıyla; işlem tutarı değişince geçmiş sorgu da değişir", () => {
    const p = parca({ maliyetKalemleri: [MIL, islem("Lazer", 100)] });
    expect(parcaMaliyetKurus(p, "2026-01-15", undefined, KAT)).toBe(birim(MIL, "2026-01-15") + 10000);
    expect(birim(MIL, "2026-01-15")).not.toBe(birim(MIL));
    const zamli = parca({ maliyetKalemleri: [MIL, islem("Lazer", 150)] });
    expect(parcaMaliyetKurus(zamli, "2026-01-15", undefined, KAT)).toBe(birim(MIL, "2026-01-15") + 15000);
  });
  it("AC-68 / AC-83 (motor): yalnız işlem kalemi olan parçada geçmiş yazılır ve tarihli okuma geçmişten", () => {
    const eski = parca({ maliyetKalemleri: [islem("Lazer", 100)], maliyetGecmisi: [] });
    const r = maliyetGecmisiYaz(eski, 20000, { tarih: "2026-10-01", bugun: BUGUN });
    expect(r.gecmis).toEqual([{ gecerli: "", kurus: 10000 }, { gecerli: "2026-10-01", kurus: 20000 }]);
    const yeni = { ...eski, maliyetKalemleri: [islem("Lazer", 200)], maliyetGecmisi: r.gecmis };
    expect(parcaMaliyetKurus(yeni, "2026-09-01")).toBe(10000);
    expect(parcaMaliyetKurus(yeni)).toBe(20000);
  });
  it("AC-67 / AC-85 / AC-116 (motor): malzeme kalemi olan kayıtta geçmiş motoru çalışmaz; saklı geçmiş silinmez, okunmaz", () => {
    const g = [{ gecerli: "", kurus: 5000 }, { gecerli: "2026-05-01", kurus: 9000 }];
    const p = parca({ maliyetKalemleri: [MIL, islem("Lazer", 90)], maliyetGecmisi: g });
    expect(maliyetGecmisiYaz(p, 1, { tarih: BUGUN, bugun: BUGUN, malzeme: malzemeKalemiVarMi(p) })).toEqual({ gecmis: g, hata: null });
    expect(parcaMaliyetKurus(p, "2026-01-01", undefined, KAT)).toBe(birim(MIL, "2026-01-01") + 9000);
  });
  it("AC-69 / R36 (motor): malzeme kalemleri kaldırılıp elle değere geçilince geçmişe o güne kadarki çözülmüş maliyet yazılır", () => {
    const eski = parca({ maliyetKalemleri: [MIL, islem("Lazer", 100)] });
    const r = maliyetGecmisiYaz(eski, 50000, { tarih: "2026-10-01", bugun: BUGUN, malzemeKat: KAT });
    expect(r.gecmis).toEqual([{ gecerli: "", kurus: birim(MIL) + 10000 }, { gecerli: "2026-10-01", kurus: 50000 }]);
  });
});

describe("Spec 0135: sipariş ihtiyacı ve emniyet payı (R28–R30/2, C9/2)", () => {
  const modeller = (kit) => [{ model: "AK100", defaultParcalar: kit }];
  const sip = (parts, kit, partStock = []) => siparisIhtiyaci({ modeller: modeller(kit), satirlar: [{ model: "AK100", adet: "10" }], parts, partStock, malzemeler: MALZEMELER, tedarikciler: [] });
  it("AC-49 / AC-51: iki malzeme kalemi iki kesit satırı; kalem adedi sipariş adediyle çarpılır", () => {
    const p = parca({ id: 7, ad: "Gövde", emniyetPayi: 0, maliyetKalemleri: [MIL, { ...SACK, adet: 3 }] });
    const s = sip([p], [{ partId: 7, miktar: 1 }]);
    expect(s.kesitler).toHaveLength(2);
    const sac = s.kesitler.find(k => k.malzemeId === "502");
    expect(sac.parcalar).toEqual([expect.objectContaining({ partId: "7", adet: 30 })]);
    expect(s.kesitler.find(k => k.malzemeId === "501").parcalar[0].adet).toBe(10);
  });
  it("AC-50: aynı malzemeden aynı ham kesitte iki ayrı parçanın kalemleri tek satırda toplanır", () => {
    const a = parca({ id: 7, ad: "A", emniyetPayi: 0, maliyetKalemleri: [SACK] });
    const b = parca({ id: 8, ad: "B", emniyetPayi: 0, maliyetKalemleri: [{ ...SACK, boy: 500 }, islem("Büküm", 5)] });
    const s = sip([a, b], [{ partId: 7, miktar: 1 }, { partId: 8, miktar: 1 }]);
    expect(s.kesitler).toHaveLength(1);
    expect(s.kesitler[0].parcalar.map(x => x.partId)).toEqual(["7", "8"]);
  });
  it("Karar 43: aynı parçanın aynı kesitteki eşdeğer iki kalemi dökümde tek satır (adet toplanır, hesap aynı)", () => {
    const p = parca({ id: 7, ad: "A", emniyetPayi: 0, maliyetKalemleri: [SACK, { ...SACK, adet: 2 }] });
    const s = sip([p], [{ partId: 7, miktar: 1 }]);
    expect(s.kesitler[0].parcalar).toEqual([expect.objectContaining({ partId: "7", adet: 30 })]);
  });
  it("AC-52 / AC-53 / AC-54 / AC-92: pay parçanınki; yoksa malzemelerin paylarının en büyüğü (5 ve 12 → 12); hiçbiri yoksa sıfır", () => {
    expect(emniyetPayiOf(parca({ emniyetPayi: 3, maliyetKalemleri: [MIL, SACK] }), KAT)).toBe(3);
    expect(emniyetPayiOf(parca({ maliyetKalemleri: [MIL, SACK] }), KAT)).toBe(12);
    expect(emniyetPayiOf(parca({ maliyetKalemleri: [{ ...SACK, malzemeId: 503 }] }), KAT)).toBe(0);
    const s = sip([parca({ id: 7, ad: "A", maliyetKalemleri: [MIL, SACK] })], [{ partId: 7, miktar: 1 }]);
    expect(s.parcalar[0].pay).toBe(12);
    expect(s.parcalar[0].ihtiyac).toBe(Math.ceil(10 * 1.12));
    expect(s.kesitler.find(k => k.malzemeId === "502").parcalar[0].adet).toBe(Math.ceil(10 * 1.12)); // pay kesit tarafına ikinci kez girmez
  });
  it("AC-55 / AC-56 / AC-109 (motor): işlem kalemi satır üretmez; yalnız işlem kalemli parça parça tablosunda, malzeme tablosunda yok, hazır sayaca girer", () => {
    const s = sip([parca({ id: 9, ad: "Kaplamalı", maliyetKalemleri: [islem("Kaplama", 10)] })], [{ partId: 9, miktar: 1 }]);
    expect(s.parcalar.map(p => p.partId)).toEqual(["9"]);
    expect(s.kesitler).toEqual([]);
    expect(s.hazirSayi).toBe(1);
  });
  it("Triyaj bulgu 3: geçersiz adet (0, 2,5, -1) maliyette 'girilmedi', siparişte eksik; iki taraf aynı kuralla okur", () => {
    for (const adet of [0, 2.5, -1]) {
      const p = parca({ id: 7, ad: "A", emniyetPayi: 0, maliyetKalemleri: [{ ...SACK, adet }] });
      expect(parcaMaliyetKurus(p, undefined, undefined, KAT), String(adet)).toBeNull();
      const s = sip([p], [{ partId: 7, miktar: 1 }]);
      expect(s.eksik.parca, String(adet)).toBe(1);
      expect(s.kesitler, String(adet)).toEqual([]);
    }
    expect(readFileSync("src/lib/siparisIhtiyaci.js", "utf8")).toMatch(/kalemAdetiOf\(satir\)/);
  });
  it("AC-57: bir malzeme kalemi çözülemeyen parça eksik sayısına girer", () => {
    const s = sip([parca({ id: 7, ad: "A", maliyetKalemleri: [MIL, { ...SACK, malzemeId: 999 }] })], [{ partId: 7, miktar: 1 }]);
    expect(s.eksik.parca).toBe(1);
  });
});

describe("Spec 0135: koruma, zam ve birleştirme (R31–R34/2)", () => {
  it("AC-58 / AC-104 (motor): ikinci malzeme kaleminde geçen malzeme korunur ve kullanımda sayılır (parça bir kez)", () => {
    const parts = [parca({ id: 1, maliyetKalemleri: [MIL, SACK, { ...SACK, adet: 2 }] }), parca({ id: 2, deletedAt: "x", maliyetKalemleri: [islem("A", 1), SACK] })];
    expect([...kullanilanMalzemeler(parts)].sort()).toEqual(["501", "502"]);
    // Mutasyon ölçümü: 502 yalnız ikinci malzeme kaleminde geçtiğinde de korunur (birinciyi okuyan koruma onu kaçırırdı).
    expect([...kullanilanMalzemeler([parca({ id: 3, maliyetKalemleri: [MIL, islem("A", 1), SACK] })])].sort()).toEqual(["501", "502"]);
    expect(malzemeKullanimi(502, parts)).toEqual({ canli: 1, cop: 1 });
  });
  it("AC-61 / AC-105 (motor): işlem kaleminde geçen tedarikçi korunur ve parça bir kez sayılır", () => {
    const parts = [parca({ id: 1, maliyetKalemleri: [islem("Lazer", 1, 31), islem("Büküm", 2, 31)] }), parca({ id: 2, deletedAt: "x", maliyetKalemleri: [islem("K", 1, 31)] })];
    expect(kalemdeGecenTedarikciler(parts).get("31")).toEqual({ parca: 2, cop: 1 });
    expect(tedarikciKullanim(31, [], [], parts)).toMatchObject({ parca: 2, parcaCop: 1 });
  });
  it("AC-62 / AC-63: zam önizlemesi malzemeyi ikinci kaleminde kullanan parçayı sayar; maliyet yalnız o kalemin payı kadar artar", () => {
    const p = parca({ id: 1, ad: "Gövde", maliyetKalemleri: [SACK, MIL, islem("Lazer", 50)] });
    const zamli = { ...P304, kiloFiyati: 3.5 };
    const e = fiyatEtkisi(P304, zamli, [p], MALZEMELER);
    expect(e.bagli).toBe(1);
    const yeniKat = malzemeKatalogu([zamli, SAC]);
    expect(e.satirlar[0].sonra - e.satirlar[0].once).toBe(malzemeOzeti(MIL, yeniKat).maliyetK - birim(MIL));
  });
  it("AC-64 / AC-65 / AC-111: birleştirmede kalemlerin malzeme ve tedarikçi bağları ve eski biçimli alanlar yeniden eşlenir", () => {
    const tedId = uid(), malId = uid(), p1 = uid(), p2 = uid();
    const yerel = { tedarikciler: [{ id: tedId, ad: "Yerel Lazer" }], malzemeler: [{ id: malId, ad: "Yerel Sac" }],
      parts: [parca({ id: p1, ad: "Yeni", maliyetKalemleri: [{ ...SACK, malzemeId: malId }, islem("Lazer", 5, tedId)] }),
        parca({ id: p2, ad: "Eski biçimli", malzemeSatiri: { malzemeId: malId, bicim: "sac" }, hammaddeler: [{ tedarikciId: tedId, tutar: 3 }] })] };
    const sunucu = { tedarikciler: [{ id: tedId, ad: "Başka" }], malzemeler: [{ id: malId, ad: "Başka malzeme" }], parts: [] };
    const plan = buildMergePlan(yerel, sunucu);
    const yT = plan.adds.tedarikciler.find(t => t.ad === "Yerel Lazer").id; const yM = plan.adds.malzemeler.find(m => m.ad === "Yerel Sac").id;
    expect(yT).not.toBe(tedId); expect(yM).not.toBe(malId);
    const yeni = plan.adds.parts.find(p => p.ad === "Yeni");
    expect(yeni.maliyetKalemleri[0].malzemeId).toBe(yM);
    expect(yeni.maliyetKalemleri[1].tedarikciId).toBe(yT);
    const eskiBicim = plan.adds.parts.find(p => p.ad === "Eski biçimli");
    expect(eskiBicim.malzemeSatiri.malzemeId).toBe(yM);
    expect(eskiBicim.hammaddeler[0].tedarikciId).toBe(yT);
  });
});

describe("Spec 0135: Excel (R37–R38)", () => {
  const p = parca({ id: 5, ad: "Gövde", maliyet: 9, maliyetKalemleri: [SACK, islem("Lazer", 125.5)] });
  it("AC-71: dışa aktarmada maliyet hücresi çözülmüş değer", () => {
    expect(parcaDisaAktarmaSatiri(p, undefined, KAT)[9]).toBe((birim(SACK) + 12550) / 100);
  });
  it("AC-72 / AC-113: farklı maliyet içe aktarılınca hücre kayda yazılmaz, tek metin satır numarasıyla; aynı rakam bildirimsiz", () => {
    const rows = [PARCA_AKTARMA_BASLIKLARI, ["Gövde", "", "", "", "", "", "", "", "", "999"]];
    const r = parcaSatirlariniCoz(rows, [p], 100, BUGUN, MALZEMELER);
    expect(r.errors).toEqual([`Satır 2: ${KALEM_EXCEL_HATASI}`]);
    expect(r.parts[0]).not.toHaveProperty("maliyet");
    const ayni = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, parcaDisaAktarmaSatiri(p, undefined, KAT)], [p], 100, BUGUN, MALZEMELER);
    expect(ayni.errors).toEqual([]);
  });
  it("AC-73: şablon on bir sütun, başlıklar değişmedi", () => {
    expect(PARCA_AKTARMA_BASLIKLARI).toHaveLength(11);
    expect(PARCA_AKTARMA_BASLIKLARI.join(" ")).not.toMatch(/kalem/i);
  });
  it("AC-114 / R37/3: eski alanlı parçanın adı Excel'den değişince eski alanlar aynen durur, kalem alanı oluşmaz", () => {
    const eski = parca({ id: 6, ad: "Mil", kod: "M-1", malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 140, boy: 78 }, hammaddeler: [{ tedarikciId: 31, tutar: 5 }] });
    const r = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, ["Mil", "Shaft", "M-1", "", "", "", "", "", "", ""]], [eski], 100, BUGUN, MALZEMELER);
    const son = parcaIceAktarmaUygula([eski], r.parts).find(x => x.id === 6);
    expect(son.malzemeSatiri).toEqual(eski.malzemeSatiri);
    expect(son.hammaddeler).toEqual(eski.hammaddeler);
    expect(son).not.toHaveProperty("maliyetKalemleri");
    expect(son.adEN).toBe("Shaft");
  });
});

describe("Spec 0135: maliyetsiz sayacı (R47)", () => {
  it("AC-118 (motor): toplu kip onayının maliyetsiz sayısı ve panelin sayacı aynı ölçütten; çözülemeyen kalem listesi ikisinde de sayılır", () => {
    const parts = [parca({ id: 1, maliyetKalemleri: [islem("Kaplama", null)] }), parca({ id: 2, maliyetKalemleri: [{ ...SACK, malzemeId: 504 }] }), parca({ id: 3, maliyet: 5 }), parca({ id: 4 })];
    const baglam = fiyatBaglamiKur({ parts, malzemeler: MALZEMELER, fiyatAyarlari: { varsayilanKat: 2 } });
    const panel = parts.filter(p => !maliyetGirildiMi(p, undefined, baglam.setKat, baglam.malzemeKat)).length;
    expect(panel).toBe(3);
    expect(topluKipOzeti(parts, KIP_MALIYET, baglam).maliyetsiz).toBe(panel);
  });
});

// ── Kaynak taramaları ────────────────────────────────────────────────────────────────────────────────────────────────
const kod = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
const tara = (d) => readdirSync(d).flatMap(e => { const p = `${d}/${e}`; return statSync(p).isDirectory() ? (p === "src/lib/map" ? [] : tara(p)) : /\.(jsx?|cjs|mjs)$/.test(e) ? [p] : []; });
const geciyor = (desen, kokler = ["src", "electron"]) => kokler.flatMap(tara).filter(f => desen.test(kod(f))).sort();

describe("Spec 0135: kaynak taramaları", () => {
  it("AC-110 / C1/2 / R23/2: eski iki alanı doğrudan okuyan yer yalnız türetme modülü ve gerekçeli istisnalar (Karar 40)", () => {
    // Gerekçeli istisnalar: db.cjs (kalıcılık, dört nokta), merge.js (eski üç eşleme, R34/2). Parça kartı eski alanları ortak
    // sabitten kopyalar (ESKI_MALIYET_ANAHTARLARI), adlarını anmaz.
    expect(geciyor(/\.malzemeSatiri\b|\.hammaddeler\b/)).toEqual(["electron/db.cjs", "src/lib/maliyetKalemleri.js", "src/lib/merge.js"]);
    expect(kod("src/components/PartManager.jsx")).not.toMatch(/malzemeSatiri|hammaddeler/);
    for (const f of ["src/lib/urunAgaci.js", "src/lib/malzeme.js", "src/lib/gider.js", "src/lib/siparisIhtiyaci.js", "src/lib/parcaAktarma.js"]) {
      expect(kod(f), f).toMatch(/maliyetKalemleri/);
    }
  });
  it("C1 / tuzak 2: kalemleri toplayan tek yer urunAgaci'nin maliyetKalemleriOzeti; kart çarpım ve toplama yapmaz (C2)", () => {
    expect(kod("src/lib/urunAgaci.js")).toMatch(/export const maliyetKalemleriOzeti = /);
    for (const f of ["src/components/MaliyetKalemleriAlani.jsx", "src/components/MalzemeSatiriAlani.jsx", "src/components/PartManager.jsx"]) {
      const k = kod(f);
      expect(k, f).not.toMatch(/\.reduce\(|tutarK\s*\*|birimK\s*\*|\*\s*adet\b/);
    }
  });
  it("AC-117 / R39/3: kalkması kararlaştırılan metin sabitleri kaynakta hiçbir yerde geçmez", () => {
    const kalkan = ["KAYNAK_KIRILIM", "KAYNAK_MALZEME", "kirilimdanGeliyorMetni", "kaynakListeMetni", "HAMMADDE_BOLUM_BASLIGI", "HAMMADDE_IPUCU",
      "HAMMADDE_BOS_METNI", "HAMMADDE_TOPLAM_ETIKETI", "hammaddeToplamSayisi", "HAMMADDE_TOPLAM_HATALI", "HAMMADDE_TUTARSIZ_UYARI", "HAMMADDE_EXCEL_HATASI",
      "MALZEME_EXCEL_HATASI", "KULLANIMDA_MALZEME_NEDENI", "KULLANIMDA_MALZEME_RED", "KIRILIMDA_TEDARIKCI_NEDENI", "maliyet-kirilimdan", "parca-maliyet-kaynak",
      "parca-maliyet-malzeme", "hammadde-toplam", "Malzemeden hesaplanıyor", "Hammadde kırılımından geliyor"];
    const dosyalar = ["src", "electron", "scripts/evidence"].flatMap(tara);
    for (const ad of kalkan) expect(dosyalar.filter(f => readFileSync(f, "utf8").includes(ad)), ad).toEqual([]);
    // Gerekçeli kalanlar: "Hammadde tedarikçisi" işareti (0096 R1, Tedarikler formu) ve onun rozeti işaretin kendisidir, kalır.
    expect(readFileSync("src/components/gider/Tedarikciler.jsx", "utf8")).toMatch(/HAMMADDE_ISARET_ETIKETI = "Hammadde tedarikçisi"/);
  });
  it("C6: yeni eylem izni, bölüm ve sunucu kuralı yok", () => {
    expect(kod("electron/serverAuth.cjs")).not.toMatch(/maliyetKalemleri/);
    expect(kod("electron/server.cjs")).not.toMatch(/maliyetKalemleri/);
  });
  it("Karar 39: türetme modülü hiçbir lib modülünü içe almaz (döngüsel içe aktarma olmasın)", () => {
    expect(readFileSync("src/lib/maliyetKalemleri.js", "utf8")).not.toMatch(/^import /m);
  });
  it("AC-116 / C7 / C7/2: sürüm notu planda; iki bilinen sonuç ve plan turu Karar 31/32'nin sonucu yazılı", () => {
    const plan = readFileSync(existsSync("specs/done/0135-uygulama-plani.md") ? "specs/done/0135-uygulama-plani.md" : "specs/0135-uygulama-plani.md", "utf8");
    expect(plan).toMatch(/Önce sunucu PC, sonra bütün istemciler/);
    expect(plan).toMatch(/maliyet geçmişi okunmaz olur/);
    expect(plan).toMatch(/zamla güncellenmez/);
    expect(plan).toMatch(/kırılım, kartta maliyet bölümüne dokunulup kaydedilince silinir/);
  });
  it("AC-81 / AC-106: kart ekranlarının kanıtı (iki kip, boş, dolu, hata) var; değişen kart kayıtları 'degisti' ve onaylı, yeni bileşenin kaydı var", () => {
    const { dosyalar } = JSON.parse(readFileSync("docs/evidence/kanit-eslemesi.json", "utf8"));
    const R = "docs/evidence/0135-piksel-raporu.json";
    const rapor = JSON.parse(readFileSync(R, "utf8")).map(x => x.ad);
    for (const e of ["elle", "hesapla-bos", "dolu", "hata", "onay"]) expect(rapor).toContain(`katalog-parca-0135-${e}-aydinlik.png`);
    const yeni = dosyalar["src/components/MaliyetKalemleriAlani.jsx"].filter(k => k.rapor === R);
    expect(yeni.length).toBeGreaterThan(0);
    const pm = dosyalar["src/components/PartManager.jsx"].filter(k => k.rapor === R && k.ekran === "katalog-parca-0096-kirilim");
    expect(pm).toEqual([expect.objectContaining({ beklenen: expect.stringMatching(/degisti|ayni/) })]);
  });
  it("_yok: eski urunAgaci sabit adı dışa verilmez (türetme modülünde tek tanım)", () => {
    expect(_yok).toBeUndefined();
  });
});
