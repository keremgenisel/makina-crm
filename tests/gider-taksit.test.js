// Spec 0021: gider taksitlendirme ve vergi dairesi (stopaj) ödemesi, saf motor (src/lib/gider.js).
import { describe, it, expect } from "vitest";
import {
  esitBol, ayEkleGun, taksitPlaniOlustur, planYenidenBol, giderKalemDogrula, odemeHedefleri, odemeDurumu,
  borcOzeti, hesaplaGiderRaporu, tekrarlayanUret,
  turHaritasi, kdvKarsilastir, vadesiGectiMi, HEDEF, DAVRANIS, odemeleriUygula,
} from "../src/lib/gider";
import { hesaplaMakinaMaliyetleri, makinaKarlilik } from "../src/lib/makinaMaliyeti";
import { odemeHatirlatmalari } from "../src/lib/odemeHatirlatma";

const turler = [
  { id: 1, ad: "Elektrik", davranis: "normal" }, { id: 2, ad: "Fabrika kirası", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" },
];
const turMap = turHaritasi(turler);
const tedarikciler = [{ id: 10, ad: "Demir Bant" }, { id: 11, ad: "Yıldız Gayrimenkul" }];
let n = 5000;
const uid = () => ++n;
const BUGUN = "2026-10-20";
const dogrula = (form) => giderKalemDogrula(form, { turMap, tedarikciler, uid });
const kayit = (form) => { const r = dogrula(form); expect(r.hatalar).toEqual([]); return r.kayit; };
// 10.000 + %20 KDV = 12.000 ödenecek, 6 taksit, ilk vade 15 Ekim.
const taksitli = (o = {}) => kayit({ id: 1, tarih: "2026-10-01", turId: 1, tutar: 10000, kdvOrani: 20, tedarikciId: 10, taksitSayisi: 6, sonOdemeTarihi: "2026-10-15", ...o });
// Brüt 20.000, %20 stopaj: kiraya verene 16.000 (+KDV), vergi dairesine 4.000.
const kira = (o = {}) => kayit({ id: 2, tarih: "2026-10-01", turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-10-05", ...o });
const ana = (k) => k.taksitler.filter(r => r.hedef === HEDEF.ANA);
const stp = (k) => k.taksitler.filter(r => r.hedef === HEDEF.STOPAJ);
// Spec 0024 (Q1, C-istisna): ödeme durumu hareketten türer; kaydedilen satır ödeme bayrağı taşımaz. Plan testleri
// ödemeyi hareketle verir ve `odemeleriUygula` ile zenginleştirilmiş kalemi forma geçirir.
const odemeHareketi = (k, r, tarih = "2026-10-18") => ({ id: uid(), tur: "odeme", giderId: k.id, taksitId: r.id, tutar: r.tutar, tarih });
const plan = (r) => ({ id: r.id, hedef: r.hedef, sira: r.sira, vade: r.vade, tutar: r.tutar });
// İlk `adet` ana taksite ödeme hareketi girilmiş kalem (durum hareketten türer; triyaj bulgu 3: eski işaretleyici kalktı).
const isaretle = (k, adet) => odemeleriUygula([k], ana(k).slice(0, adet).map(r => odemeHareketi(k, r)), turMap)[0];

describe("Spec 0021: taksit planı (R1, R12, C1)", () => {
  it("AC-1: 12.000 ödenecek, 6 taksit → her biri 2.000, toplam 12.000", () => {
    expect(esitBol(1200000, 6)).toEqual(Array(6).fill(200000));
    const k = taksitli();
    expect(ana(k).map(r => r.tutar)).toEqual(Array(6).fill(2000));
    expect(ana(k).reduce((a, r) => a + r.tutar * 100, 0)).toBe(1200000);
  });
  it("AC-2: 10.000 / 3 → 3.333,33 + 3.333,33 + son taksit 3.333,34; toplam tam", () => {
    expect(esitBol(1000000, 3)).toEqual([333333, 333333, 333334]);
    const p = taksitPlaniOlustur(1000000, 3, "2026-10-15", { uid });
    expect(p.map(r => r.tutar)).toEqual([3333.33, 3333.33, 3333.34]);
  });
  it("AC-3: vadeler ilk vadeden birer ay arayla; ay sonu kırpılır, gün kaymaz (R12)", () => {
    expect(ana(taksitli()).map(r => r.vade)).toEqual(["2026-10-15", "2026-11-15", "2026-12-15", "2027-01-15", "2027-02-15", "2027-03-15"]);
    expect([0, 1, 2, 3].map(i => ayEkleGun("2026-01-31", i))).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
    expect(ayEkleGun("2027-12-31", 2)).toBe("2028-02-29");
  });
  it("R1: taksitli kalemde ilk vade zorunlu; taksitsiz normal kalem satır taşımaz", () => {
    expect(dogrula({ tarih: "2026-10-01", turId: 1, tutar: 1000, kdvOrani: 0, taksitSayisi: 3 }).hatalar.map(h => h.alan)).toContain("sonOdemeTarihi");
    expect(kayit({ tarih: "2026-10-01", turId: 1, tutar: 1000, kdvOrani: 0, sonOdemeTarihi: "2026-10-10" }).taksitler).toEqual([]);
  });
});

describe("Spec 0021: ödeme durumu (R2, R3)", () => {
  it("AC-4 / AC-5: bir taksit ödenince kısmen, hepsi ödenince ödendi", () => {
    const k = taksitli();
    expect(odemeDurumu(k)).toBe("odenmedi");
    const k1 = isaretle(k, 1);
    expect(odemeDurumu(k1)).toBe("kismen");
    expect(k1.odendi).toBe(false);
    const k6 = isaretle(k, 6);
    expect(odemeDurumu(k6)).toBe("odendi");
    expect(k6).toMatchObject({ odendi: true, odemeTarihi: "2026-10-18" });
  });
  it("AC-6 / AC-25: kalem durumu doğrudan çevrilmez; odendi, odemeTarihi ve sonOdemeTarihi ödeme hareketlerinden türetilir", () => {
    const k = taksitli();
    expect(dogrula({ ...taksitliForm(k), odendi: true }).kayit.odendi).toBe(false);
    const k2 = isaretle(k, 2);
    expect(k2).toMatchObject({ odendi: false, odemeTarihi: null, sonOdemeTarihi: "2026-12-15" });
    // İlk taksitin ödemesi silinince o taksit yeniden açılır, en yakın vade geri gelir.
    const kaldir = odemeleriUygula([k], [odemeHareketi(k, ana(k)[1])], turMap)[0];
    expect(ana(kaldir)[0]).toMatchObject({ odendi: false, odemeTarihi: null });
    expect(kaldir.sonOdemeTarihi).toBe("2026-10-15");
  });
  it("AC-7: 6 taksitin 2'si ödenmişse borç özeti ve tedarikçi borcu kalan 4 taksit (8.000)", () => {
    const k = isaretle(taksitli(), 2);
    const b = borcOzeti([k], { turler, tedarikciler }, BUGUN);
    expect(b.satirlar).toEqual([expect.objectContaining({ tur: "tedarikci", tutar: 8000 })]);
    const r = hesaplaGiderRaporu({ giderler: [k], turler, tedarikciler }, { baslangic: "2026-10-01", bitis: "2026-10-31" }, { bugun: BUGUN });
    expect(r.tedarikciKirilimi.tedarikciBorcu).toBe(8000);
  });
  it("vadesiGectiMi türetilmiş en yakın vadeyi kullanır", () => {
    const k = isaretle(taksitli(), 1); // en yakın ödenmemiş: 15 Kasım
    expect(vadesiGectiMi(k, "2026-11-10")).toBe(false);
    expect(vadesiGectiMi(k, "2026-11-16")).toBe(true);
  });
});
const taksitliForm = (k) => ({ ...k, taksitSayisi: ana(k).length, sonOdemeTarihi: ana(k)[0].vade });

describe("Spec 0021: taksit gider kavramını değiştirmez (R5, C2, C3)", () => {
  const sade = kayit({ id: 1, tarih: "2026-10-01", turId: 1, tutar: 10000, kdvOrani: 20, tedarikciId: 10, sonOdemeTarihi: "2026-10-15" });
  const planli = isaretle(taksitli(), 2);
  const rap = (k) => hesaplaGiderRaporu({ giderler: [k, kira()], turler, tedarikciler }, { baslangic: "2026-10-01", bitis: "2026-10-31" }, { bugun: BUGUN });
  it("AC-10: gider tarihi, dönem toplamı, KDV ve kovalar planlı ve plansız aynı", () => {
    const a = rap(sade), b = rap(planli);
    expect(planli.tarih).toBe(sade.tarih);
    expect([b.toplam, b.indirilecekKdv, b.kovalar, b.kalemler.length]).toEqual([a.toplam, a.indirilecekKdv, a.kovalar, a.kalemler.length]);
  });
  it("AC-11: makina maliyeti ve kârlılık planlı ve plansız aynı", () => {
    const m = (k) => {
      const s = hesaplaMakinaMaliyetleri({ customers: [{ id: 1, name: "F", model: "AK100", serialNo: "S", installDate: "2026-10-20", fabrikaSatisBedeli: 500000, currency: "TRY", uretimTarihi: "2026-10-05" }],
        stock: [], partStockLog: [], giderler: [k], giderTurleri: turler, standartGiderler: [], standardModels: [{ model: "AK100" }], customModels: [], giderAyarlari: { yururlukAy: "2026-01" } }, { bugun: BUGUN });
      return makinaKarlilik(s, "musteri:1");
    };
    expect(m(planli)).toEqual(m(sade));
  });
  it("AC-16: stopaj hiçbir KDV toplamına girmez; KDV karşılaştırması stopajdan etkilenmez", () => {
    const kdvli = kira({ kdvOrani: 20 });
    const r1 = hesaplaGiderRaporu({ giderler: [kdvli], turler }, { baslangic: "2026-10-01", bitis: "2026-10-31" }, { bugun: BUGUN });
    const r0 = hesaplaGiderRaporu({ giderler: [kira({ kdvOrani: 20, stopajOrani: 0 })], turler }, { baslangic: "2026-10-01", bitis: "2026-10-31" }, { bugun: BUGUN });
    expect(r1.indirilecekKdv).toBe(4000);
    expect(r1.indirilecekKdv).toBe(r0.indirilecekKdv);
    expect(kdvKarsilastir({ TRY: 10000 }, r1.indirilecekKdv)).toEqual(kdvKarsilastir({ TRY: 10000 }, r0.indirilecekKdv));
  });
});

describe("Spec 0021: kira kaleminin iki ödeme hedefi (R6, R8, R13)", () => {
  it("AC-12: brüt 20.000, %20 stopaj → kiraya verene 16.000, vergi dairesine 4.000 ayrı izlenir", () => {
    const k = kira();
    expect(odemeHedefleri(k, DAVRANIS.KIRA).map(h => [h.hedef, h.toplamK / 100])).toEqual([["ana", 16000], ["stopaj", 4000]]);
    expect(ana(k)).toHaveLength(1);
    expect(stp(k)).toHaveLength(1);
    expect(ana(k)[0].vade).toBe("2026-10-05");
    expect(stp(k)[0].vade).toBeNull(); // R13: stopaj vadesi varsayılansız
  });
  it("AC-13: stopaj tarafı taksitlenir; kiraya veren tarafı ayrı durum taşır", () => {
    const k = kira({ stopajTaksitSayisi: 4, stopajVade: "2026-11-26" });
    expect(stp(k).map(r => [r.tutar, r.vade])).toEqual([[1000, "2026-11-26"], [1000, "2026-12-26"], [1000, "2027-01-26"], [1000, "2027-02-26"]]);
    const kiraOdemesi = [odemeHareketi(k, ana(k)[0])];
    const k1 = odemeleriUygula([k], kiraOdemesi, turMap)[0];
    expect(ana(k1)[0].odendi).toBe(true);
    expect(stp(k1).every(r => !r.odendi)).toBe(true);
    expect(odemeDurumu(k1)).toBe("kismen");
    const tum = odemeleriUygula([k], [...kiraOdemesi, ...stp(k).map(r => odemeHareketi(k, r))], turMap)[0];
    expect(odemeDurumu(tum)).toBe("odendi");
    expect(tum.odendi).toBe(true);
  });
  it("AC-15 / AC-21: vergi dairesi sentetik satır; genel borç toplamına girer, tedarikçi kartına girmez", () => {
    const k = kira();
    const b = borcOzeti([k], { turler, tedarikciler }, BUGUN);
    expect(b.satirlar.map(s => [s.tur, s.ad, s.tutar])).toEqual([["tedarikci", "Yıldız Gayrimenkul", 16000], ["vergiDairesi", "Vergi dairesi", 4000]]);
    expect(b.toplam).toBe(20000);
    const r = hesaplaGiderRaporu({ giderler: [k], turler, tedarikciler }, { baslangic: "2026-10-01", bitis: "2026-10-31" }, { bugun: BUGUN });
    expect(r.tedarikciKirilimi.tedarikciBorcu).toBe(16000);
    // Kiraya veren ödenince yalnız vergi dairesi kalır.
    const b2 = borcOzeti([odemeleriUygula([k], [odemeHareketi(k, ana(k)[0])], turMap)[0]], { turler, tedarikciler }, BUGUN);
    expect(b2.satirlar.map(s => [s.tur, s.tutar])).toEqual([["vergiDairesi", 4000]]);
  });
  it("R13: satırsız eski kira: ödenmişse vergi dairesi borcu yok, ödenmemişse stopaj borçta; hatırlatıcıya girmez", () => {
    const eski = { id: 9, tarih: "2026-10-01", turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-10-05", odendi: false };
    expect(borcOzeti([eski], { turler, tedarikciler }, BUGUN).satirlar.find(s => s.tur === "vergiDairesi")?.tutar).toBe(4000);
    expect(borcOzeti([{ ...eski, odendi: true, odemeTarihi: "2026-10-04" }], { turler, tedarikciler }, BUGUN).satirlar).toEqual([]);
    const h = odemeHatirlatmalari([eski], { turler, tedarikciler }, BUGUN);
    expect(h.gecmis.map(o => o.hedef)).toEqual(["ana"]);
    // Düzenlenip kaydedilince satırlar kalıcı olur. Spec 0024: satır ödeme bayrağı saklamaz; eski kalemin ödemesi göç
    // hareketiyle (tamKapatir) taşınır ve iki hedefi de kapatır.
    const kaydedildi = kayit({ ...eski, odendi: true, odemeTarihi: "2026-10-04" });
    expect(kaydedildi.taksitler.map(r => [r.hedef, r.odendi, r.odemeTarihi])).toEqual([["ana", false, null], ["stopaj", false, null]]);
    const [z] = odemeleriUygula([kaydedildi], [{ id: 1, tur: "odeme", giderId: 9, tamKapatir: true, tarih: "2026-10-04", kaynak: "goc" }], turMap);
    expect(z.taksitler.map(r => [r.hedef, r.odendi, r.odemeTarihi])).toEqual([["ana", true, "2026-10-04"], ["stopaj", true, "2026-10-04"]]);
    expect(z.odendi).toBe(true);
  });
  it("R6: stopajı olmayan kira satır taşımaz; tekrarlayan üretim stopajlı kirayı iki hedefle üretir", () => {
    expect(kira({ stopajOrani: 0 }).taksitler).toEqual([]);
    const u = tekrarlayanUret([{ id: 1, turId: 2, ad: "Kira", tutar: 20000, girisYonu: "brut", baslangicAy: "2026-06", uretilenAylar: [] }], [], "2026-10",
      { turMap, giderAyarlari: { stopajOrani: 20 }, uid });
    expect(u.yeniKalemler[0].taksitler.map(r => [r.hedef, r.tutar, r.odendi])).toEqual([["ana", 16000 + u.yeniKalemler[0].tutar * u.yeniKalemler[0].kdvOrani / 100, false], ["stopaj", 4000, false]]);
  });
});

describe("Spec 0021: planın değiştirilmesi (R10, T10, T11)", () => {
  const odenmis2 = () => isaretle(taksitli(), 2);
  // Spec 0024: plan değişimi ödeme almış taksitleri hareketten tanır (zenginleştirilmiş kalem).
  const hareketle2 = () => { const k = taksitli(); const h = ana(k).slice(0, 2).map(r => odemeHareketi(k, r)); return { k: odemeleriUygula([k], h, turMap)[0], h }; };
  it("AC-17: taksit sayısı değişince ödenmiş taksitler (kimlik, tutar, tarih) korunur", () => {
    const { k, h } = hareketle2();
    const y = kayit({ ...taksitliForm(k), taksitSayisi: 3 });
    expect(ana(y).slice(0, 2).map(plan)).toEqual(ana(k).slice(0, 2).map(plan));
    expect(odemeleriUygula([y], h, turMap)[0].taksitler.map(r => r.odendi)).toEqual([true, true, false]);
    expect(ana(y).map(r => r.tutar)).toEqual([2000, 2000, 8000]);
    expect(ana(y)[2].id).toBe(ana(k)[2].id); // ödenmemiş satır kimliği yeniden kullanılır
  });
  it("AC-22: iki taksiti ödenmiş planda sayı 1'e indirilemez; nedeni söylenir", () => {
    const r = dogrula({ ...taksitliForm(odenmis2()), taksitSayisi: 1 });
    expect(r.kayit).toBeNull();
    expect(r.hatalar).toEqual([{ alan: "taksitSayisi", mesaj: "Taksit sayısı ödenmiş taksit sayısının (2) altına indirilemez." }]);
  });
  it("AC-23: tutar değişince ödenmişler aynen kalır, ödenmemişler yeniden bölünür, toplam yeni ödenecek tutara eşit", () => {
    const { k } = hareketle2();
    const y = kayit({ ...taksitliForm(k), tutar: 12500 }); // 12.500 + %20 = 15.000
    expect(ana(y).slice(0, 2).map(plan)).toEqual(ana(k).slice(0, 2).map(plan));
    expect(ana(y).map(r => r.tutar)).toEqual([2000, 2000, 2750, 2750, 2750, 2750]);
    expect(ana(y).reduce((a, r) => a + Math.round(r.tutar * 100), 0)).toBe(1500000);
  });
  it("T11: yeni tutar ödenmiş toplamın altındaysa kayıt yok; kalan varken ödenmemiş taksit yoksa bir taksit eklenir", () => {
    expect(dogrula({ ...taksitliForm(odenmis2()), tutar: 3000 }).hatalar[0].mesaj).toMatch(/Ödenmiş taksitlerin toplamı \(4\.000 ₺\) yeni ödenecek tutarı aşıyor/);
    const hepsi = isaretle(taksitli(), 6);
    const r = planYenidenBol(ana(hepsi), 1500000, 6, null, { uid });
    expect(r.satirlar).toHaveLength(7);
    expect(r.satirlar[6]).toMatchObject({ tutar: 3000, odendi: false, vade: "2027-04-15" });
  });
  it("T10: ödenmiş taksiti olmayan planda sayı 1 planı kaldırır", () => {
    const k = taksitli();
    expect(kayit({ ...taksitliForm(k), taksitSayisi: 1 }).taksitler).toEqual([]);
  });
});

describe("Spec 0021 triyaj düzeltmeleri", () => {
  const eskiKira = { id: 9, tarih: "2026-10-01", turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 11, aciklama: "Eski kira",
    sonOdemeTarihi: "2026-10-05", odendi: true, odemeTarihi: "2026-10-04" };
  it("bulgu 1: ödenmiş eski kira düzenlenince satırlar eski durumla doğar ve ana hedefin vadesi korunur", () => {
    const y = kayit({ ...eskiKira, aciklama: "Eski kira (düzeltildi)" });
    // Spec 0024: satırlar planı (vade korunur) taşır; ödeme durumu göç hareketinden gelir.
    expect(y.taksitler.map(r => [r.hedef, r.odendi, r.vade])).toEqual([["ana", false, "2026-10-05"], ["stopaj", false, null]]);
    const [z] = odemeleriUygula([y], [{ id: 1, tur: "odeme", giderId: 9, tamKapatir: true, tarih: "2026-10-04", kaynak: "goc" }], turMap);
    expect(z).toMatchObject({ odendi: true, odemeTarihi: "2026-10-04" });
  });
  it("bulgu 2: stopaj sıfıra çekilince kiraya verene yapılmış ödeme korunur; kalan tutar ödenmemiş satır olur", () => {
    const k0 = kira();
    const h = [odemeHareketi(k0, ana(k0)[0], "2026-10-04")]; // kiraya verene 16.000 ödendi (hareket)
    const k = odemeleriUygula([k0], h, turMap)[0];
    const y = kayit({ ...k, stopajOrani: 0, sonOdemeTarihi: ana(k)[0].vade });
    expect(stp(y)).toEqual([]);
    expect(ana(y).map(r => r.tutar)).toEqual([16000, 4000]);
    const z = odemeleriUygula([y], h, turMap)[0];
    expect(ana(z).map(r => [r.tutar, r.odendi, r.odemeTarihi])).toEqual([[16000, true, "2026-10-04"], [4000, false, null]]);
    expect(odemeDurumu(z)).toBe("kismen");
  });
  it("bulgu 3: taksit sayısı 1–60 arası tam sayı; aşımda ya da kesirde satır üretilmez, neden söylenir", () => {
    const mesaj = "Taksit sayısı 1 ile 60 arasında tam sayı olmalı.";
    for (const v of ["5000", "61", "2.5", "0", "abc"]) expect(dogrula({ tarih: "2026-10-01", turId: 1, tutar: 1000, kdvOrani: 0, sonOdemeTarihi: "2026-10-15", taksitSayisi: v }).hatalar, v).toEqual([{ alan: "taksitSayisi", mesaj }]);
    expect(dogrula({ ...kira(), stopajTaksitSayisi: "100", stopajVade: "2026-10-26" }).hatalar).toEqual([{ alan: "stopajTaksitSayisi", mesaj }]);
    expect(ana(kayit({ tarih: "2026-10-01", turId: 1, tutar: 6000, kdvOrani: 0, sonOdemeTarihi: "2026-10-15", taksitSayisi: "60" }))).toHaveLength(60);
  });
  it("bulgu 5: 'ödenmiş taksit sayısının altına' mesajı motorda tek yerde yazılı", async () => {
    const { readFileSync } = await import("node:fs");
    const kaynak = readFileSync(new URL("../src/lib/gider.js", import.meta.url), "utf-8");
    expect(kaynak.match(/ödenmiş taksit sayısının/g)).toHaveLength(1);
  });
});
