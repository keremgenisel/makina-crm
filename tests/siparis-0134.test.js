// Spec 0134: sipariş ihtiyacı saf motoru (lib/siparisIhtiyaci.js), yazdırma kurucusu, kit doğrulayıcıları ve kaynak taramaları.
// Rakamlar spec'in Context tablosundan ve Ölçüm S'den (Ø140 × 78, pay 4/5, ρ 7,90, 6 m boy, 2,95 $, kur 50). Spec 0143 ile 6 m boy
// malzeme kartından kalktı; boy beklentileri işaretli kalemde çubuk boyu 6000 mm ile.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as S from "../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml } from "../src/lib/siparisRaporu";
import { kitAdediDogrula, setAdediDogrula, setIcerigiDogrula, partiAdediCevir, kitStokAdedi, kitAdetMetni, KIT_ADET_HATASI, SET_ADET_HATASI, PARTI_BUYUKLUGU_HATASI } from "../src/lib/urunAgaci";
import { ucOndalik } from "../src/lib/malzeme";
import { modelMaliyeti } from "../src/lib/makinaStandartMaliyet";
import { BOLUM_SEKMELERI, SECTION_GROUP } from "../electron/serverAuth.cjs";
import * as F from "./fixtures/0134-veri.js";

const kod = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const hesap = (o) => S.siparisIhtiyaci(F.veri(o));
const parca = (r, ad) => r.parcalar.find(p => p.ad === ad);
const tek = (kit, adet = 70, o = {}) => hesap({ modeller: [F.model("M1", kit)], satirlar: [{ model: "M1", adet: String(adet) }], ...o });
const u3 = (x) => ucOndalik(x);

describe("Spec 0134: kit adedi (R6/2, R6a, R6c, C1/2)", () => {
  it("AC-11a / AC-11b: kit adedi en çok üç ondalık; 0,114 kabul, 0,1143 ret; virgül ve nokta ondalık (Karar 35)", () => {
    expect(kitAdediDogrula("0,114").deger).toBe(0.114);
    expect(kitAdediDogrula("0.114").deger).toBe(0.114);
    expect(kitAdediDogrula("0,1143").hata).toBe(KIT_ADET_HATASI);
    expect(kitAdediDogrula("0").hata).toBe(KIT_ADET_HATASI);
    expect(kitAdetMetni(0.114)).toBe("0,114");
    expect(kitAdetMetni(3)).toBe("3");
  });
  it("AC-11c / AC-75: setin içeriği tam sayı; ayrı doğrulayıcı ve setin kendi metni", () => {
    expect(setAdediDogrula("1,5").hata).toBe(SET_ADET_HATASI);
    const r = setIcerigiDogrula([{ partId: 42, miktar: "1,5" }], { parts: [F.PUL] });
    expect(r.hatalar[0]).toBe(SET_ADET_HATASI);
    expect(SET_ADET_HATASI).not.toBe(KIT_ADET_HATASI);
  });
  it("AC-11f / AC-11g / AC-93: 8 adet ve 70 makina → 0,114 (üç ondalığa en yakın); büyüklük boş ya da sıfırsa neden", () => {
    expect(partiAdediCevir("8", "70").deger).toBe(0.114);
    expect(partiAdediCevir("1", "8").deger).toBe(0.125);
    expect(partiAdediCevir("1", "3").deger).toBe(0.333);
    expect(partiAdediCevir("2", "3").deger).toBe(0.667);
    expect(partiAdediCevir("8", "").hata).toBe(PARTI_BUYUKLUGU_HATASI);
    expect(partiAdediCevir("8", "0").hata).toBe(PARTI_BUYUKLUGU_HATASI);
  });
  it("AC-72 (saf): stoktan düşülecek adet yukarı yuvarlanır (0,114 → 1, 1,5 → 2, 3 → 3)", () => {
    expect(kitStokAdedi(0.114)).toBe(1);
    expect(kitStokAdedi("1,5")).toBe(2);
    expect(kitStokAdedi(3)).toBe(3);
    expect(kitStokAdedi(0.1 * 30)).toBe(3);
  });
  it("Karar 34: ondalık kitte maliyet satırı kuruşa yuvarlanır; tam sayı kitte çarpım aynen", () => {
    const pm = new Map([["42", F.PUL]]);
    expect(modelMaliyeti({ model: "X", defaultParcalar: [{ partId: "42", miktar: 0.114 }] }, pm).kit[0].satirK).toBe(57); // 500 × 0,114 = 57
    expect(modelMaliyeti({ model: "X", defaultParcalar: [{ partId: "42", miktar: 0.333 }] }, pm).kit[0].satirK).toBe(167); // 166,5 → 167
    expect(modelMaliyeti({ model: "X", defaultParcalar: [{ partId: "42", miktar: 3 }] }, pm).kit[0].satirK).toBe(1500);
  });
});

describe("Spec 0134: girdi (R2–R5, R8/2, R25)", () => {
  it("AC-3 / AC-5 / AC-95: partinin planlanan adetleri katalog adına Türkçe küçültmeyle eşlenir; bulunamayan ad listelenir", () => {
    const r = S.partidenSatirlar({ planlananAdetler: { "ak100_ds": 70, "YOK_MODEL": 5 } }, [F.AK100]);
    expect(r.satirlar).toEqual([{ model: "AK100_DS", adet: "70" }]);
    expect(r.bulunamayan).toEqual(["YOK_MODEL"]);
  });
  it("AC-4: planlanan adedi olmayan parti boş satır ve neden", () => {
    expect(S.partidenSatirlar({ planlananAdetler: {} }, [F.AK100]).bos).toBe(true);
  });
  it("AC-8 / AC-9 / AC-103 / AC-102: geçersiz adet, aynı model ve 10.000 üstü reddedilir; öteki satırlar hesaplanır", () => {
    const r = hesap({ satirlar: [{ model: "AK100_DS", adet: "70" }, { model: "AK100_DS", adet: "5" }, { model: "AK100_DS", adet: "0" }, { model: "ak100_ds", adet: "10001" }, { model: "", adet: "3" }, { model: "AK100_DS", adet: "abc" }] });
    expect(r.satirlar.map(s => s.hata)).toEqual([null, S.AYNI_MODEL_HATASI, S.ADET_HATASI, S.ADET_UST_HATASI, S.MODEL_SECILMEDI, S.ADET_HATASI]);
    expect(r.hataliSayi).toBe(5);
    expect(parca(r, "Kesme mili").ihtiyac).toBe(70);
    expect(S.hataliSatirMetni(5)).toMatch(/^5 satır hatalı/);
    expect(S.MAKINA_ADET_UST).toBe(10000);
  });
});

describe("Spec 0134: parça ihtiyacı (R6–R11/2)", () => {
  it("AC-10 / AC-11 / AC-12: 1 → 70, 8 → 560; iki modelde geçen parça toplanır", () => {
    expect(parca(tek([[41, 1]]), "Kesme mili").ihtiyac).toBe(70);
    expect(parca(tek([[42, 8]]), "Pul").ihtiyac).toBe(560);
    const r = hesap({ modeller: [F.model("A", [[42, 8]]), F.model("B", [[42, 2]])], satirlar: [{ model: "A", adet: "70" }, { model: "B", adet: "10" }] });
    expect(parca(r, "Pul").ihtiyac).toBe(580);
  });
  it("AC-11d / AC-11e: 0,114 × 70 → 8; iki satır (70 ve 10) satır satır yuvarlanır → 8 + 2 = 10", () => {
    expect(parca(tek([[42, 0.114]]), "Pul").ihtiyac).toBe(8);
    const r = hesap({ modeller: [F.model("A", [[42, 0.114]]), F.model("B", [[42, 0.114]])], satirlar: [{ model: "A", adet: "70" }, { model: "B", adet: "10" }] });
    expect(parca(r, "Pul").ihtiyac).toBe(10);
  });
  it("AC-13 / AC-14 / AC-77: içinde 2 A geçen set 70 makinada 140 A; set kendi satırında patlatıldı, üç sütunu da var", () => {
    const r = tek([[44, 1]]);
    expect(parca(r, "Pul").ihtiyac).toBe(140);
    expect(parca(r, "Somun").ihtiyac).toBe(210);
    const set = parca(r, "Bağlantı seti");
    expect(set).toMatchObject({ set: true, patlatildi: true, ihtiyac: 70, stok: 0, siparis: 70 });
    expect(set).not.toHaveProperty("pay"); // spec 0141 ile (C8): pay alanı satırdan kalktı
  });
  it("AC-76 / AC-77: stoğu 3 olan setin 70 ihtiyacında 67 set patlatılır; A'nın ihtiyacı 134, çift sayım yok", () => {
    const r = tek([[44, 1]], 70, { partStock: [{ partId: 44, miktar: 3 }] });
    expect(parca(r, "Bağlantı seti")).toMatchObject({ ihtiyac: 70, stok: 3, siparis: 67 });
    expect(parca(r, "Pul").ihtiyac).toBe(134);
    expect(parca(r, "Somun").ihtiyac).toBe(201);
  });
  it("AC-78: makina başı 0,114 set, 1 makina, 3 bileşen → bileşen 3 (set adedi önce yukarı yuvarlanır)", () => {
    const set = { id: 50, ad: "Üçlü", setIcerigi: [{ partId: 42, miktar: 3 }] };
    const r = tek([[50, 0.114]], 1, { parts: [F.PUL, set] });
    expect(parca(r, "Pul").ihtiyac).toBe(3);
  });
  it("AC-15: içeriğindeki parçalar listede olmayan set bileşen üretmez, nedeni yazar", () => {
    const set = { id: 50, ad: "Boş set", setIcerigi: [{ partId: 999, miktar: 2 }] };
    const r = tek([[50, 1]], 10, { parts: [set] });
    expect(parca(r, "Boş set").setNeden).toBe(S.SET_ICERIK_BOS);
    expect(parca(r, "Boş set").patlatildi).toBe(false);
  });
  it("AC-79 / AC-80: kitte hem set hem bileşeni → uyarı, satırda iki kaynak; rakam 0121'in kuralıyla toplanır", () => {
    const r = hesap(); // AK100: Pul 8, set (2 Pul) 1
    expect(r.kesisimler).toEqual([{ setAd: "Bağlantı seti", bilesenAd: "Pul", partId: "42" }]);
    const pul = parca(r, "Pul");
    expect(pul.iki).toBe(true);
    expect(pul.ihtiyac).toBe(560 + 140);
    expect(modelMaliyeti(F.AK100, new Map(F.veri().parts.map(p => [String(p.id), p]))).setKesisimleri).toHaveLength(1);
  });
  it("AC-16 / AC-17 / AC-18: stok 100 ihtiyaç 70 → 0; ihtiyaç 560 → 460; sipariş hiçbir satırda negatif değil", () => {
    expect(parca(tek([[42, 1]], 70, { partStock: [{ partId: 42, miktar: 100 }] }), "Pul").siparis).toBe(0);
    const r = tek([[42, 8]], 70, { partStock: [{ partId: 42, miktar: 100 }] });
    expect(parca(r, "Pul").siparis).toBe(460);
    expect(hesap({ partStock: [{ partId: 42, miktar: 5000 }, { partId: 41, miktar: -3 }] }).parcalar.every(p => p.siparis == null || p.siparis >= 0)).toBe(true);
  });
  // Spec 0141 ile ters çevrildi (B-R3, B-R6, karar 34): emniyet payı kalktı. AC-19/20, AC-21, AC-81/82, Karar 32, AC-83 ve AC-84
  // payın kendisini sınıyordu; aynı veride artık hiçbir yüzde uygulanmaz. Karşılıklar tests/isleme-payi-0141.test.js AC-17–AC-19,
  // AC-26 ve AC-52'de; doğrulayıcı ve iki kartın alanı kalktığı için AC-21 ve AC-81/82'nin karşılığı taramadır (AC-26).
  it("AC-19 / AC-20 (spec 0141 ile): eski kayıttaki %10 emniyet payı uygulanmaz; 560 yine 560, satırda pay alanı yok", () => {
    const r = tek([[42, 8]], 70, { parts: [{ ...F.PUL, emniyetPayi: 10 }] });
    expect(parca(r, "Pul")).toMatchObject({ ham: 560, ihtiyac: 560 });
    expect(parca(r, "Pul")).not.toHaveProperty("pay");
  });
  it("Karar 32 (spec 0141 ile): setin bileşeninde de pay uygulanmaz; patlatılan adet yukarı yuvarlanır", () => {
    const r = tek([[44, 1]], 70, { parts: [{ ...F.PUL, emniyetPayi: 10 }, F.SOMUN, { ...F.SET, emniyetPayi: 50 }] });
    expect(parca(r, "Bağlantı seti")).toMatchObject({ ihtiyac: 70 });
    expect(parca(r, "Pul").ihtiyac).toBe(140);
    expect(parca(r, "Somun").ihtiyac).toBe(210);
  });
  it("AC-83 (spec 0141 ile): 0,114 adet, 70 makina, 2 stok → ihtiyaç 8 (7,98 yukarı), sipariş 6; eski %10 pay okunmaz", () => {
    const r = tek([[42, 0.114]], 70, { parts: [{ ...F.PUL, emniyetPayi: 10 }], partStock: [{ partId: 42, miktar: 2 }] });
    expect(parca(r, "Pul")).toMatchObject({ ihtiyac: 8, siparis: 6 });
  });
  it("AC-84 (spec 0141 ile): malzemedeki eski pay uygulanmaz; kilo parçanın sipariş adedinden türer", () => {
    const r = tek([[41, 1]], 70, { malzemeler: [{ ...F.P304, emniyetPayi: 10 }] });
    expect(parca(r, "Kesme mili").siparis).toBe(70);
    expect(r.kesitler[0].parcalar[0].adet).toBe(70);
    expect(u3(r.kesitler[0].netKg)).toBe(u3(70 * r.kesitler[0].parcalar[0].hamKg));
  });
  it("AC-22 / AC-23 / AC-99: hazır parça parça tablosunda var, malzeme tablosunda yok, eksik sayılmaz; kiti boş model adıyla", () => {
    const r = hesap({ modeller: [F.AK100, F.model("BOS", [])], satirlar: [{ model: "AK100_DS", adet: "70" }, { model: "BOS", adet: "3" }] });
    expect(parca(r, "Pul")).toBeTruthy();
    expect(r.kesitler.flatMap(k => k.parcalar.map(p => p.ad))).toEqual(["Kesme mili"]);
    expect(r.kitBos).toEqual(["BOS"]);
    expect(r.eksik.parca).toBe(0);
    expect(r.hazirSayi).toBe(2); // Pul ve Somun
  });
  it("AC-24 / AC-104: çöpteki parça kit satırının ad kopyasıyla, silinmiş işaretli; ihtiyaç üretmez, eksik sayılır", () => {
    const r = tek([[42, 8, "Eski pul"]], 70, { parts: [{ ...F.PUL, deletedAt: "2026-10-01" }] });
    const p = r.parcalar[0];
    expect(p).toMatchObject({ ad: "Eski pul", silinmis: true, ihtiyac: null, siparis: null });
    expect(r.eksik.parca).toBe(1);
  });
});

describe("Spec 0134: malzeme ihtiyacı (R12–R18/2)", () => {
  const k0 = (r) => r.kesitler[0];
  // Spec 0143 ile (C7): kartın geldiği boyu ve boy fiyatı yöntemi kalktı. Boy adedi yalnız "Sipariş boydan verilir" işaretli kalemde,
  // kalemin çubuk boyundan ve tüketim oranından (B-R3); işaretsiz kalem kilogramla (net artı fire, B-R6/2). Aşağıdaki boy
  // beklentileri işaretli kalemle (çubuk 6000 mm, eski "6 m boy") aynı rakamları verir; yerleşim (aşağı(6000 ÷ 83) = 72) ve
  // artan kilo (X4) kalktı.
  const ISARETLI = { ...F.KESME, malzemeSatiri: { ...F.MIL140, boydanSiparis: true, cubukBoyu: 6000 } };
  const isaretli = (adet = 70, o = {}) => tek([[41, 1]], adet, { parts: [ISARETLI, F.PUL, F.SOMUN, F.SET], ...o });
  it("AC-25 / AC-26 / AC-91: ham ağırlık 10,679 kg; 70 adet net 747,512 kg; kesim boyu ham boy (83 mm)", () => {
    const r = tek([[41, 1]]);
    expect(u3(k0(r).parcalar[0].hamKg)).toBe(10.679);
    expect(u3(k0(r).netKg)).toBe(747.512);
    expect(k0(r).parcalar[0].kesimBoyu).toBe(83);
  });
  it("AC-27 / AC-28 / AC-29 / AC-30 (spec 0143 ile): işaretli kalemde 70 × 83 ÷ 6000 → 1 boy; sipariş 771,957 kg; artan kilo yok", () => {
    const k = k0(isaretli());
    expect(k.boyAdedi).toBe(1);
    expect(u3(k.siparisKg)).toBe(771.957);
    expect(k).not.toHaveProperty("artanKg");
  });
  it("AC-31 / AC-92 (spec 0143 ile): 2,95 $ ve kur 50 ile 113.863,68 TL; yuvarlanmamış kilodan (üç ondalıklı kilodan 113.863,66 çıkardı)", () => {
    const k = k0(isaretli());
    expect(k.tutarTLK).toBe(11386368);
    expect(Math.round(u3(k.siparisKg) * 2.95 * 50 * 100)).toBe(11386366);
  });
  it("AC-32 (spec 0143 ile): 150 adet için 3 boy (150 × 83 ÷ 6000 = 2,075)", () => { expect(k0(isaretli(150)).boyAdedi).toBe(3); });
  it("AC-33 (spec 0143 ile): parça çubuk boyundan uzunsa boy hesaplanmaz, nedeni yazar ve sipariş kilogramla (0143 B-R8/3)", () => {
    const kisa = { ...F.KESME, malzemeSatiri: { ...F.MIL140, boydanSiparis: true, cubukBoyu: 50 } };
    const k = k0(tek([[41, 1]], 70, { parts: [kisa] }));
    expect(k.boyAdedi).toBeNull(); expect(k.boyNeden).toBe(S.NEDEN_KESIM_BUYUK);
    expect(k.siparisKg).toBeCloseTo(k.netKg + k.fireKg, 9);
  });
  it("AC-34 / AC-86 (spec 0143 ile): işaretsiz ve firesi sıfır malzemede sipariş kilosu net ihtiyaç; boy adedi ve nedeni yok", () => {
    const k = k0(tek([[41, 1]], 70, { malzemeler: [{ ...F.P304, fire: 0 }] }));
    expect(k.boyNeden).toBeNull(); expect(k.boyAdedi).toBeNull();
    expect(k.siparisKg).toBe(k.netKg);
    const f = k0(tek([[41, 1]], 70));
    expect(u3(f.netKg)).toBe(747.512); expect(u3(f.fireKg)).toBe(59.801); expect(u3(f.siparisKg)).toBe(807.313);
  });
  it("AC-35 / AC-36 (spec 0143 ile): işaretli satırda fire sipariş kilosuna eklenmez; uyarı rakamların kaybını söyler", () => {
    const k = k0(isaretli());
    expect(u3(k.siparisKg)).toBe(771.957);
    expect(k.fireUyarisi).toBe(S.FIRE_BOY_UYARISI);
    expect(k0(isaretli(70, { malzemeler: [{ ...F.P304, fire: 0 }] })).fireUyarisi).toBeNull();
  });
  it("AC-37: kiloyla alınan malzemede %8 fire: 747,512 → 807,313 kg", () => {
    expect(u3(k0(tek([[41, 1]], 70)).siparisKg)).toBe(807.313);
  });
  it("AC-38 / AC-63 / AC-64 / AC-65 / AC-66 (spec 0143 ile): aynı ham kesit tek satır, Ø144 ile Ø60 iki satır; boy ve tutar ayrı; başlıkta boy yok; bant kendi ham çapından", () => {
    const isa = (ms) => ({ ...ms, boydanSiparis: true, cubukBoyu: 6000 });
    const kesme = { ...F.KESME, malzemeSatiri: isa(F.MIL140) };
    const kisa = { id: 45, ad: "Kısa mil", malzemeSatiri: isa({ ...F.MIL140, boy: 40 }) };
    const ince = { id: 46, ad: "İnce mil", malzemeSatiri: isa({ malzemeId: 501, bicim: "mil", cap: 56, boy: 100, payCap: 4 }) };
    const bantli = { ...F.P304, bantlar: [{ alt: 0, fiyat: 2.95 }, { alt: 100, fiyat: 3.2 }] };
    const r = tek([[41, 1], [45, 1], [46, 1]], 70, { parts: [kesme, kisa, ince], malzemeler: [bantli] });
    expect(r.kesitler).toHaveLength(2);
    const k144 = r.kesitler.find(k => k.kesit[0] === 144); const k60 = r.kesitler.find(k => k.kesit[0] === 60);
    expect(k144.parcalar.map(p => p.ad)).toEqual(["Kesme mili", "Kısa mil"]); // AC-38
    expect(k144.boyAdedi).toBe(2); // (70 × 83 + 70 × 40) ÷ 6000 = 1,435 → 2 (tüketim oranı, 0143 B-R3)
    // Oranların toplamı BİR KEZ yuvarlanır (30 × 83 + 30 × 40 = 3690 ÷ 6000 = 0,615 → 1 boy).
    const r30 = tek([[41, 1], [45, 1]], 30, { parts: [kesme, kisa], malzemeler: [bantli] });
    expect(r30.kesitler[0].boyAdedi).toBe(1);
    expect(k60.boyAdedi).toBe(2); // 70 × 100 ÷ 6000 = 1,17 → 2
    expect(k144.fiyat).toBe(3.2); expect(k60.fiyat).toBe(2.95);
    const g = r.malzemeGruplari[0];
    expect(g).not.toHaveProperty("boyAdedi");
    expect(g.tutarTLK).toBe(k144.tutarTLK + k60.tutarTLK);
  });
  it("AC-39: kiloyla alınan malzemede asgari 1000 kg'a yuvarlanır ve fark kendi sütununda", () => {
    const k = k0(tek([[41, 1]], 70, { malzemeler: [{ ...F.P304, fire: 0, asgariSiparis: 1000 }] }));
    expect(k.siparisKg).toBe(1000); expect(u3(k.asgariFark)).toBe(u3(1000 - k.netKg));
  });
  it("AC-40 (spec 0143 ile): boydan alınan malzemede asgari 1000 kg → 2 boy (1.543,914 kg), fark 771,957 kg (Karar 31)", () => {
    const k = k0(isaretli(70, { malzemeler: [{ ...F.P304, asgariSiparis: 1000 }] }));
    expect(k.boyAdedi).toBe(2); expect(u3(k.siparisKg)).toBe(1543.914); expect(u3(k.asgariFark)).toBe(771.957);
  });
  it("AC-41 / AC-43: özgül ağırlığı girilmemiş ya da çöpteki malzemeye bağlı kilo parçası eksik, satırı yok, toplam bozulmaz", () => {
    const r = tek([[41, 1], [42, 1]], 70, { malzemeler: [{ ...F.P304, ozgulAgirlik: undefined }] });
    expect(r.kesitler).toHaveLength(0); expect(r.eksik).toEqual({ parca: 1, malzeme: 1 }); expect(r.toplamTLK).toBe(0);
    const c = tek([[41, 1]], 70, { malzemeler: [{ ...F.P304, deletedAt: "2026-10-01" }] });
    expect(c.kesitler).toHaveLength(0); expect(c.eksik.parca).toBe(1);
  });
  it("AC-42 (spec 0143 ile): kilo fiyatı girilmemiş malzemede kilo ve boy hesaplanır, tutar yazılmaz", () => {
    const k = k0(isaretli(70, { malzemeler: [{ ...F.P304, kiloFiyati: undefined }] }));
    expect(u3(k.siparisKg)).toBe(771.957); expect(k.boyAdedi).toBe(1); expect(k.tutarTLK).toBeNull(); expect(k.tutarNeden).toBe(S.NEDEN_FIYAT_YOK);
    // R22: hiç tutarı olmayan malzeme ve tedarikçi grubunun toplamı sıfır yazılmaz ("—"); genel toplam bozulmaz.
    const r = tek([[41, 1]], 70, { malzemeler: [{ ...F.P304, kiloFiyati: undefined }] });
    expect(r.malzemeGruplari[0].tutarTLK).toBeNull(); expect(r.tedarikciGruplari[0].tutarTLK).toBeNull(); expect(r.toplamTLK).toBe(0);
  });
  // Spec 0143 ile: AC-67–AC-70 (boy fiyatı yöntemi) silindi; yöntem kalktı (0143 A-R1, A-R4), maliyet her zaman kilodan.
  it("AC-90 (spec 0143 ile): işaretsiz lamada boy adedi ve nedeni yok; sipariş net + fire (0143 B-R1/2: işaretli lamada boy hesaplanır)", () => {
    const lama = { id: 47, ad: "Lama", malzemeSatiri: { malzemeId: 501, bicim: "lama", kalinlik: 10, genislik: 20, boy: 125 } };
    const k = k0(tek([[47, 1]], 70, { parts: [lama] }));
    expect(k.boyAdedi).toBeNull(); expect(k.boyNeden).toBeNull();
    expect(k.siparisKg).toBeCloseTo(k.netKg + k.fireKg, 9);
  });
  it("Karar 30 (spec 0143 ile): aynı kesitte işaretli ve işaretsiz kalem iki ayrı satır", () => {
    const boyParca = { ...F.KESME, id: 48, ad: "Boylu", malzemeSatiri: { ...F.MIL140, boydanSiparis: true, cubukBoyu: 6000 } };
    const r = tek([[41, 1], [48, 1]], 70, { parts: [F.KESME, boyParca] });
    expect(r.kesitler.map(k => k.boydanSiparis).sort()).toEqual([false, true]);
  });
  it("AC-97 (spec 0143 ile): malzemenin fiyat geçmişi okunmaz; bugünkü küme", () => {
    const m = { ...F.P304, fiyatGecmisi: [{ gecerli: "", kiloFiyati: 1, paraBirimi: "USD", kur: 10 }, { gecerli: "2026-06-01", kiloFiyati: 2.95, paraBirimi: "USD", kur: 50 }] };
    expect(k0(isaretli(70, { malzemeler: [m] })).tutarTLK).toBe(11386368);
  });
});
describe("Spec 0134: tedarikçi, para (R19, R19/2, C6)", () => {
  it("AC-44 / AC-45 / AC-46 / AC-87: ana tedarikçiye göre grup ve toplam; tedarikçisiz kendi grubunda; çöpteki ham diziden silinmiş adıyla, tutar toplamda", () => {
    const m2 = { id: 502, ad: "8620", ozgulAgirlik: 7.85, kiloFiyati: 100 };
    const m3 = { id: 503, ad: "Pirinç", ozgulAgirlik: 8.5, kiloFiyati: 200, tedarikciId: 99 };
    const p2 = { id: 60, ad: "Pim", malzemeSatiri: { malzemeId: 502, bicim: "mil", cap: 10, boy: 20 } };
    const p3 = { id: 61, ad: "Burç", malzemeSatiri: { malzemeId: 503, bicim: "mil", cap: 20, boy: 30 } };
    const r = tek([[41, 1], [60, 1], [61, 1]], 70, { parts: [F.KESME, p2, p3], malzemeler: [F.P304, m2, m3], hamTedarikciler: [...F.TED, { id: 99, ad: "Eski Döküm", deletedAt: "2026-09-01" }] });
    const adlar = r.tedarikciGruplari.map(t => t.ad);
    expect(adlar).toEqual(["Ana Çelik", "Eski Döküm (silinmiş tedarikçi)", S.TEDARIKCISIZ]);
    expect(r.tedarikciGruplari[1].silinmis).toBe(true);
    expect(r.toplamTLK).toBe(r.tedarikciGruplari.reduce((a, t) => a + t.tutarTLK, 0));
    expect(r.tedarikciGruplari[1].tutarTLK).toBeGreaterThan(0);
  });
  it("AC-47 / AC-48 / AC-49: TL'de kur hesaba girmez; EUR kendi para biriminde ve TL karşılığı (kayıtlı kurla, Karar 40); tanınmayan para birimi toplama girmez", () => {
    const tl = S.siparisIhtiyaci(F.veri({ modeller: [F.model("M1", [[41, 1]])], satirlar: [{ model: "M1", adet: "70" }], malzemeler: [{ ...F.P304, paraBirimi: undefined, kur: undefined, kiloFiyati: 100 }] })).kesitler[0];
    expect(tl.tutarTLK).toBe(tl.tutarK);
    const eur = tek([[41, 1]], 70, { malzemeler: [{ ...F.P304, paraBirimi: "EUR", kur: 52 }] }).kesitler[0];
    expect(eur.paraBirimi).toBe("EUR"); expect(eur.tutarTLK).toBe(Math.round(eur.siparisKg * 2.95 * 52 * 100));
    const x = tek([[41, 1]], 70, { malzemeler: [{ ...F.P304, paraBirimi: "GBP" }] });
    expect(x.kesitler[0].tutarTLK).toBeNull(); expect(x.kesitler[0].tutarNeden).toBe(S.NEDEN_PARA_BIRIMI); expect(x.toplamTLK).toBe(0);
  });
});

describe("Spec 0134: eksik veri ve stok uyarısı (R10/2, R22, R23/2)", () => {
  const cokParca = (stoklu) => {
    const parts = Array.from({ length: 20 }, (_, i) => ({ id: 100 + i, ad: `P${i}`, maliyet: 1 }));
    const kit = parts.map(p => [p.id, 1]);
    return tek(kit, 1, { parts, partStock: parts.slice(0, stoklu).map(p => ({ partId: p.id, miktar: 1 })) });
  };
  it("AC-55 / AC-85: stoklu parça hesapta geçen parçaların yüzde beşinden azsa uyarı, iki sayıyla", () => {
    expect(cokParca(0).stokUyarisi).toEqual({ stoklu: 0, toplam: 20 });
    expect(S.STOK_UYARISI(0, 20)).toMatch(/20 parçanın yalnız 0/);
  });
  it("AC-56: oran yüzde beşe ulaşınca uyarı yok", () => { expect(cokParca(1).stokUyarisi).toBeNull(); });
  it("R23/2: ölçüt yokluk değil orandır; stoklu parça varken de oran beşin altındaysa uyarı (21 parçada 1)", () => {
    const parts = Array.from({ length: 21 }, (_, i) => ({ id: 200 + i, ad: `Q${i}`, maliyet: 1 }));
    const r = tek(parts.map(p => [p.id, 1]), 1, { parts, partStock: [{ partId: 200, miktar: 4 }] });
    expect(r.stokUyarisi).toEqual({ stoklu: 1, toplam: 21 });
  });
  it("AC-57 / AC-98: eksik sayısı yalnız bu girdide geçen parça ve malzemeler üzerinden", () => {
    const disarida = { id: 504, ad: "Kullanılmayan", kiloFiyati: undefined };
    const r = tek([[41, 1]], 70, { malzemeler: [F.P304, disarida] });
    expect(r.eksik).toEqual({ parca: 0, malzeme: 0 });
    expect(S.siparisIhtiyaci(F.veri({ malzemeler: [{ ...F.P304, kiloFiyati: undefined }] })).eksik).toEqual({ parca: 1, malzeme: 1 });
  });
});

describe("Spec 0134: yazdırma (R20, R20/2)", () => {
  it("AC-50 / AC-101: liste Türkçe, parça, malzeme ve tedarikçi bölümleri; hücreler kaçışlı; kurucu kendi modülünde", () => {
    // Spec 0140 ile (C-R10, E-R1): belge tedarikçi bölümlerinden kurulur (opt-in çıktı) ve PARÇA İHTİYACI tablosu belgede yok;
    // kaçış denetimi için Pul'un Ana tedarikçisi var (hazır parça tablosunda basılsın).
    const r = S.siparisIhtiyaci(F.veri({ parts: [F.KESME, { ...F.PUL, ad: "Pul <b>", tedarikciId: 13 }, F.SOMUN, F.SET] }), { tedarikciOdakli: true });
    const html = siparisRaporuHtml(r, { bugun: "2026-11-05", factory: { name: "Altuntaş" }, partiAd: "Parti 3" });
    expect(html).not.toContain("PARÇA İHTİYACI"); expect(html).toContain("Ana Çelik"); expect(html).toContain("Ø144");
    expect(html).toContain("Pul &lt;b&gt;"); expect(html).not.toContain("Pul <b>");
    expect(html).toContain("Üretim partisi: Parti 3");
    expect(kod("src/lib/printTemplates.js")).not.toMatch(/siparis/i);
  });
});

describe("Spec 0134: kaynak taramaları", () => {
  it("C2 / Karar 43: sipariş motorunda özgül ağırlık ve ağırlık formülü yok (0132 C1 taraması aynı dosyayı aramaz)", () => {
    expect(kod("src/lib/siparisIhtiyaci.js")).not.toMatch(/ozgulAgirlik|Math\.PI/);
  });
  it("AC-71: malzeme kaydına boy katı alanı eklenmez", () => {
    for (const f of ["src/lib/malzeme.js", "electron/db.cjs", "src/components/MalzemeManager.jsx"]) expect(kod(f), f).not.toMatch(/boyKati|boy_kati/i);
  });
  it("AC-62: sunucunun bölüm eşlemesi değişmez (parça ve malzeme yalnız Ayarlar sekmesinde)", () => {
    expect(BOLUM_SEKMELERI.parts).toEqual(["settings"]);
    expect(BOLUM_SEKMELERI.malzemeler).toEqual(["settings"]);
    expect(SECTION_GROUP.parts).toBe("stockActions");
    expect(SECTION_GROUP.malzemeler).toBe("settings");
    expect(kod("electron/serverAuth.cjs")).not.toMatch(/siparis/i);
  });
  it("AC-73: ortak kırpma yardımcısının imzası ve gövdesi değişmez (adet parseInt ile, yuvarlama çağıranda)", () => {
    expect(kod("src/lib/utils.js")).toMatch(/export const stokKirparakDus = \(partStock, kalemler\) => \{[\s\S]*?const istenen = parseInt\(k && k\.miktar\) \|\| 0;/);
    expect(kod("src/components/stock/MakinaStokTab.jsx")).toMatch(/kitStokAdedi\(r\.miktar\)/);
  });
  it("AC-88: ekran eldeki miktarı kendi hesaplamaz; stok motora parametreyle girer", () => {
    // Spec 0140 ile (B-R1/2): ekran stock/SiparisPenceresi.jsx; stok iki giriş noktasında `siparisVeri` ile iner.
    const ekran = kod("src/components/stock/SiparisPenceresi.jsx");
    expect(ekran).not.toMatch(/totalMiktar|\.miktar\b/);
    expect(ekran).toMatch(/siparisIhtiyaci\(\{[^}]*partStock/);
    expect(kod("src/components/Stock.jsx")).toMatch(/siparisVeri=\{\{ parts, hamParts: rawParts, partStock,/);
    expect(kod("src/components/Settings.jsx")).toMatch(/siparisVeri=\{\{ parts, hamParts: rawParts, partStock,/);
  });
  it("AC-61 / C8/2: ekran yazıcı prop'u almaz, kilit almaz; gerekçeli kilitsiz", () => {
    const ekran = kod("src/components/stock/SiparisPenceresi.jsx"); // spec 0140 ile: pencere
    expect(ekran).not.toMatch(/\bset(Parts|Malzemeler|PartStock|PartStockLog|UretimPartileri|StandardModels|CustomModels)\b|useLock|baskasiKilitli/);
    expect(kod("src/lib/kilitAlanlari.js")).toMatch(/"src\/components\/stock\/SiparisPenceresi\.jsx": "salt okunur/);
  });
});

// Triyaj (2026-11-05): her bulgunun bekçisi. Bulgu 5 ekranda (`ui/kit-ondalik-0134.test.jsx`).
describe("Spec 0134 triyaj", () => {
  // Spec 0141 ile: payı taşıyan eski satır tek türetmede katlanır (A-R1/3, A-R2/2); aynı sonuç artık katlamanın üç ondalığından.
  it("Bulgu 1 (spec 0143 ile): aynı ham kesit kayan nokta yüzünden iki satıra bölünmez (Ø10,1 + 0,2 = Ø10,3); tek satır, tek boy, asgari bir kez", () => {
    const isa = { boydanSiparis: true, cubukBoyu: 6000 };
    const a = { id: 70, ad: "Paylı", malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 10.1, payCap: 0.2, boy: 100, ...isa } };
    const b = { id: 71, ad: "Paysız", malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 10.3, boy: 100, ...isa } };
    const r = tek([[70, 1], [71, 1]], 20, { parts: [a, b], malzemeler: [{ ...F.P304, fire: 0, asgariSiparis: 50 }] });
    expect(r.kesitler).toHaveLength(1);
    expect(r.kesitler[0].kesit).toEqual([10.3]);
    expect(r.kesitler[0].kesitMetni).toBe("Ø10,3 · 6.000 mm çubuk"); // spec 0143 C-R4: işaretli satırda çubuk boyu
    expect(r.kesitler[0].boyAdedi).toBeGreaterThanOrEqual(1);
    expect(r.kesitler[0].parcalar.map(p => p.ad)).toEqual(["Paylı", "Paysız"]);
  });
  // Spec 0143 ile (B-R4 ters çevirir): Karar 48'in "boy yönteminde fire orana eklenir" kuralı kalktı; fire boy sayısına girmez.
  it("Bulgu 2 / R17 (spec 0143 ile): işaretli kalemde fire boy sayısına girmez ve uyarı yazar", () => {
    const parca = { id: 72, ad: "Boylu", malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 140, boy: 600, boydanSiparis: true, cubukBoyu: 6000 } };
    const m = { ...F.P304, fire: 10 };
    const k = tek([[72, 1]], 10, { parts: [parca], malzemeler: [m] }).kesitler[0];
    expect(k.boyAdedi).toBe(1); // 10 × 600 ÷ 6000 = 1 (fire eklenseydi 1,1 → 2)
    expect(k.fireUyarisi).toBe(S.FIRE_BOY_UYARISI);
    const firesiz = tek([[72, 1]], 10, { parts: [parca], malzemeler: [{ ...m, fire: 0 }] }).kesitler[0];
    expect(firesiz.boyAdedi).toBe(1); expect(firesiz.fireUyarisi).toBeNull();
  });
  it("Bulgu 3 / R7/2: stokta yeten setin bileşenleri satır açmaz, hazır ve stok sayılarına girmez", () => {
    const r = tek([[44, 1]], 70, { partStock: [{ partId: 44, miktar: 100 }] });
    expect(r.parcalar.map(p => p.ad)).toEqual(["Bağlantı seti"]);
    expect(parca(r, "Bağlantı seti")).toMatchObject({ siparis: 0, patlatildi: false });
    expect(r.hazirSayi).toBe(0);
  });
  // Spec 0141 ile: eski payCap tek türetmede çapa katlanır (Ø98 + 4 = Ø102); bant girilen (katlanmış) çaptan seçilir.
  it("Bulgu 4 / AC-66: bant ham çapla seçilir (net Ø98 sınırın altında, ham Ø102 üstünde → üst bandın fiyatı)", () => {
    const p = { id: 73, ad: "Sınırda", malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 98, payCap: 4, boy: 50 } };
    const m = { ...F.P304, bantlar: [{ alt: 0, fiyat: 2.95 }, { alt: 100, fiyat: 3.2 }] };
    expect(tek([[73, 1]], 10, { parts: [p], malzemeler: [m] }).kesitler[0].fiyat).toBe(3.2);
  });
  it("Bulgu 6: yazdırılan raporda emniyet payı Türkçe ondalıkla (%7,5)", () => {
    // Spec 0140 ile (C-R10): PARÇA İHTİYACI tablosu belgeden çıktı, pay belgede basılmaz (ekranda Türkçe biçim:
    // ui/siparis-0140 "pay" testi); İngilizce ondalık hiçbir yerde basılmaz.
    const v = F.veri({ modeller: [F.model("M1", [[42, 8]])], satirlar: [{ model: "M1", adet: "70" }], parts: [{ ...F.PUL, emniyetPayi: 7.5, tedarikciId: 13 }] });
    const html = siparisRaporuHtml(S.siparisIhtiyaci(v, { tedarikciOdakli: true }), { bugun: "2026-11-05" });
    expect(html).toContain("Beta Metal"); // pay uygulanmış adet hazır parça tablosunda
    expect(html).not.toContain("%7.5");
  });
  it("Bilgi 2: sayı olarak gelen kit adedi de üç ondalık sınırına tabi", () => {
    expect(kitAdediDogrula(0.1143).hata).toBe(KIT_ADET_HATASI);
    expect(kitAdediDogrula(0.114).deger).toBe(0.114);
  });
});
