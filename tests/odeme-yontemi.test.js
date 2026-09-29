// Spec 0041: gider ödemesinin yöntemi ödemenin alanıdır; kalemin yöntemi ödemelerden türetilir (saf motor) ve tek
// pencerede çok satırlı ödeme (hedef başına üç katmanlı sınır, ya hep ya hiç).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { yontemKirilimi, yontemKirilimlari, hareketPaylari, hareketGruplari, donemYontemKirilimi, YONTEM_MAHSUP, YONTEM_BELIRSIZ } from "../src/lib/odemeYontemi";
import { cokluOdemeDogrula, COKLU_ODEME_MAX_SATIR, tedarikciEkstresi } from "../src/lib/kasa";
import { giderKalemDogrula, turHaritasi, odemeleriUygula, borcOzeti } from "../src/lib/gider";
import { odemeHatirlatmalari } from "../src/lib/odemeHatirlatma";
import { hesaplaMakinaMaliyetleri } from "../src/lib/makinaMaliyeti";

const TUR = [{ id: 1, ad: "Elektrik", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }];
const turMap = turHaritasi(TUR);
let n = 9000;
const uid = () => ++n;
const kayit = (form) => { const r = giderKalemDogrula(form, { turMap, tedarikciler: [{ id: 10, ad: "T" }], uid }); expect(r.hatalar).toEqual([]); return r.kayit; };
// 10.000 + %20 = 12.000 ödenecek, taksitsiz
const KALEM = { id: 1, tarih: "2026-09-01", turId: 1, tutar: 10000, kdvOrani: 20, tedarikciId: 10, odemeYontemi: "Havale" };
const TAKSITLI = kayit({ id: 2, tarih: "2026-09-01", turId: 1, tutar: 12000, kdvOrani: 0, tedarikciId: 10, taksitSayisi: 3, sonOdemeTarihi: "2026-09-10" });
const [T1, T2] = TAKSITLI.taksitler;
const od = (id, tutar, yontem, o = {}) => ({ id, tur: "odeme", tarih: "2026-09-10", tutar, yontem, giderId: 1, ...o });
const uygula = (k, h) => odemeleriUygula([k], h, turMap)[0];
const satir = (tutar, yontem = "Nakit", o = {}) => ({ tutar, yontem, hesapId: "", aciklama: "", ...o });
const dogrula = (k, satirlar, hareketler = [], o = {}) =>
  cokluOdemeDogrula({ tarih: "2026-09-12", satirlar }, { kalem: uygula(k, hareketler), turMap, hesaplar: [], hedefAdi: (id) => (id == null ? "Kalem" : `${k.taksitler.find(r => r.id === id).sira}. taksit`), ...o });

describe("Spec 0041: türetilen yöntem (R3, R4, R11, R15)", () => {
  it("AC-16: hiç ödemesi olmayan kalemde yöntem yazılmaz (kalemin varsayılanı iddia edilmez)", () => {
    const y = yontemKirilimi(KALEM, [], turMap);
    expect(y).toMatchObject({ karar: "yok", etiket: null, satirlar: [] });
  });
  it("AC-4: tek yöntemle ödenen kalemde o yöntem", () => {
    expect(yontemKirilimi(KALEM, [od(1, 12000, "Nakit")], turMap)).toMatchObject({ karar: "tek", etiket: "Nakit" });
  });
  it("AC-1 / AC-5: nakit + kredi kartı ile kapanan kalem Karma, kırılım tutarıyla; kalan sıfır", () => {
    const h = [od(1, 7000, "Nakit"), od(2, 5000, "Kredi kartı")];
    const y = yontemKirilimi(KALEM, h, turMap);
    expect(y).toMatchObject({ karar: "karma", etiket: "Karma", toplamK: 1200000 });
    expect(y.satirlar).toEqual([{ yontem: "Nakit", tutarK: 700000 }, { yontem: "Kredi kartı", tutarK: 500000 }]);
    expect(uygula(KALEM, h).odendi).toBe(true);
  });
  it("AC-23: aynı yöntemin iki ödemesi kırılımda tek satırda toplanır", () => {
    expect(yontemKirilimi(KALEM, [od(1, 2000, "Nakit"), od(2, 3000, "Nakit")], turMap).satirlar).toEqual([{ yontem: "Nakit", tutarK: 500000 }]);
  });
  it("AC-9: yöntemi boş ödeme 'Belirtilmemiş'", () => {
    expect(yontemKirilimi(KALEM, [od(1, 1000, "")], turMap).satirlar).toEqual([{ yontem: YONTEM_BELIRSIZ, tutarK: 100000 }]);
  });
  it("AC-20: avanstan mahsup ayrı satır ve Karma kararında sayılır", () => {
    const y = yontemKirilimi(KALEM, [od(1, 2000, "Nakit"), { id: 2, tur: "mahsup", tarih: "2026-09-11", tutar: 1000, giderId: 1, calisanId: 5 }], turMap);
    expect(y.karar).toBe("karma");
    expect(y.satirlar.map(s => s.yontem)).toEqual(["Nakit", YONTEM_MAHSUP]);
  });
  it("AC-11: ciro hareketi kırılımda 'Çek (ciro)' olarak okunur", () => {
    const y = yontemKirilimi(KALEM, [od(1, 5000, "Çek (ciro)", { cekId: 77, hesapId: null }), od(2, 7000, "Nakit")], turMap);
    expect(y.satirlar.map(s => s.yontem)).toContain("Çek (ciro)");
  });
  it("AC-18 / AC-19: göçten gelen tutarsız (tamKapatir) hareketin payı kapattığı tutardır; toplam ödenenle eşit; göç işareti", () => {
    const h = [od(1, 2000, "Nakit"), { id: 2, tur: "odeme", tarih: "2026-09-11", tutar: null, yontem: null, tamKapatir: true, kaynak: "goc", giderId: 1 }];
    const y = yontemKirilimi(KALEM, h, turMap);
    expect(y.satirlar).toEqual([{ yontem: YONTEM_BELIRSIZ, tutarK: 1000000 }, { yontem: "Nakit", tutarK: 200000 }]);
    expect(y.toplamK).toBe(1200000);
    expect(y.gocVar).toBe(true);
  });
  it("Q1: kirada vergi dairesine giden stopaj ödemesi kırılıma girer; ekstrenin ana hedef payı onu saymaz", () => {
    const KIRA = kayit({ id: 3, tarih: "2026-09-02", turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 10, sonOdemeTarihi: "2026-09-05" });
    const stopaj = KIRA.taksitler.find(r => r.hedef === "stopaj"), ana = KIRA.taksitler.find(r => r.hedef === "ana");
    const h = [{ id: 1, tur: "odeme", tarih: "2026-09-05", tutar: 16000, yontem: "Havale", giderId: 3, taksitId: ana.id },
      { id: 2, tur: "odeme", tarih: "2026-09-07", tutar: 4000, yontem: "Nakit", giderId: 3, taksitId: stopaj.id }];
    expect(yontemKirilimi(KIRA, h, turMap).satirlar).toEqual([{ yontem: "Havale", tutarK: 1600000 }, { yontem: "Nakit", tutarK: 400000 }]);
    expect(hareketPaylari(KIRA, h, turMap, { yalnizAna: true }).map(p => p.payK)).toEqual([1600000]);
  });
  it("AC-8: kalemin varsayılan yöntemi değişse de kırılım ödemelerden gelir", () => {
    expect(yontemKirilimi({ ...KALEM, odemeYontemi: "Kredi kartı" }, [od(1, 1000, "Nakit")], turMap).etiket).toBe("Nakit");
  });
  it("R10 / Q3 / Q4: dönem kırılımı kalemlerin ödemelerini yöntemde toplar; personel ayrı döner", () => {
    const P = { id: 5, tarih: "2026-09-01", turId: 3, calisanId: 7, resmiTutar: 1000, eldenTutar: 500 };
    const r = donemYontemKirilimi([KALEM, P], [od(1, 12000, "Nakit"), { id: 9, tur: "odeme", tarih: "2026-09-30", tutar: 1500, yontem: "Nakit", giderId: 5 }], turMap);
    expect(r.satirlar).toEqual([{ yontem: "Nakit", tutarK: 1200000 }]);
    expect(r).toMatchObject({ personelK: 150000, toplamK: 1350000 });
  });
});

describe("Spec 0041: çok satırlı ödeme doğrulaması (R5, R6, R12–R14)", () => {
  it("AC-2: iki satır iki kayıt üretir; tarih pencerenin, açıklama satırın", () => {
    const r = dogrula(KALEM, [satir("7.000", "Nakit", { aciklama: "kasadan" }), satir("5.000", "Kredi kartı")]);
    expect(r.kayitlar).toHaveLength(2);
    expect(r.kayitlar[0]).toMatchObject({ tur: "odeme", tutar: 7000, yontem: "Nakit", tarih: "2026-09-12", aciklama: "kasadan", giderId: 1 });
    expect(r.kayitlar[1]).toMatchObject({ tutar: 5000, yontem: "Kredi kartı", tarih: "2026-09-12", aciklama: "" });
  });
  it("AC-3a: tek satır kendi hedefini aşarsa satır hatası (bugünkü kural gevşemedi)", () => {
    const r = dogrula(KALEM, [satir("13.000")]);
    expect(r.kayitlar).toBeNull();
    expect(r.hatalar.satirlar[0].tutar).toMatch(/Kalandan fazla ödeme/);
  });
  it("AC-3b / AC-10: aynı taksite giden iki satırın toplamı o taksidi aşarsa hedef adıyla hata; farklı taksitlere satır serbest", () => {
    const asan = dogrula(TAKSITLI, [satir("3.000", "Nakit", { taksitId: T1.id }), satir("2.000", "Havale", { taksitId: T1.id })]);
    expect(asan.kayitlar).toBeNull();
    expect(asan.hatalar.hedefler).toEqual(["1. taksit için girilen toplam kalanı aşıyor (kalan 4.000,00 ₺)."]);
    const iki = dogrula(TAKSITLI, [satir("4.000", "Nakit", { taksitId: T1.id }), satir("4.000", "Havale", { taksitId: T2.id })]);
    expect(iki.kayitlar.map(k => k.taksitId)).toEqual([T1.id, T2.id]);
  });
  it("AC-3 (triyaj bulgu 4): taksitli kalemde aşım taksit adıyla bildirilir, kalem düzeyi mesajı çıkmaz", () => {
    const r = dogrula(TAKSITLI, [satir("3.000", "Nakit", { taksitId: T1.id }), satir("2.000", "Havale", { taksitId: T1.id }), satir("4.000", "Nakit", { taksitId: T2.id })]);
    expect(r.hatalar.hedefler).toEqual(["1. taksit için girilen toplam kalanı aşıyor (kalan 4.000,00 ₺)."]);
  });
  it("AC-3c: satırların toplamı kalemin kalanını aşarsa hata", () => {
    const r = dogrula(KALEM, [satir("7.000"), satir("6.000", "Havale")]);
    expect(r.kayitlar).toBeNull();
    expect(r.hatalar.hedefler).toEqual(["Satırların toplamı kalemin kalanını aşıyor (kalan 12.000,00 ₺)."]);
  });
  it("AC-22: tutarı boş satır atılır; sıfır/negatif hata; 10'dan fazla satır girilemez; hiç dolu satır yoksa hata", () => {
    expect(dogrula(KALEM, [satir("1.000"), satir("")]).kayitlar).toHaveLength(1);
    expect(dogrula(KALEM, [satir("0")]).hatalar.satirlar[0].tutar).toBe("Tutar sıfırdan büyük olmalı.");
    expect(dogrula(KALEM, [satir("-5")]).hatalar.satirlar[0].tutar).toBe("Tutar sıfırdan büyük olmalı.");
    const fazla = dogrula(KALEM, Array.from({ length: COKLU_ODEME_MAX_SATIR + 1 }, () => satir("1")));
    expect(fazla.kayitlar).toBeNull();
    expect(fazla.hatalar.genel).toMatch(/En çok 10 satır/);
    expect(dogrula(KALEM, [satir(""), satir("")]).hatalar.genel).toBe("En az bir satırın tutarını girin.");
  });
  it("AC-24: bir satır geçersizse hiçbir kayıt dönmez, hata o satırda", () => {
    const r = dogrula(KALEM, [satir("1.000"), satir("abc")]);
    expect(r.kayitlar).toBeNull();
    expect(Object.keys(r.hatalar.satirlar)).toEqual(["1"]);
  });
  it("AC-11: satırda 'Çek (ciro)' girilemez", () => {
    expect(dogrula(KALEM, [satir("1.000", "Çek (ciro)")]).hatalar.satirlar[0].yontem).toMatch(/elle seçilemez/);
  });
  it("AC-25: tarih pencere başına zorunlu", () => {
    const r = cokluOdemeDogrula({ tarih: "", satirlar: [satir("1.000")] }, { kalem: KALEM, turMap });
    expect(r.hatalar.tarih).toBe("Ödeme tarihi girilmedi.");
    expect(r.hatalar.satirlar).toEqual({});
  });
});

describe("Spec 0041: kapsam (C3, C4)", () => {
  const TED = [{ id: 10, ad: "T" }];
  const iki = () => dogrula(KALEM, [satir("7.000", "Nakit"), satir("2.000", "Kredi Kartı")]).kayitlar.map((k, i) => ({ ...k, id: 100 + i }));
  it("AC-13: iki satırlı ödemeden sonra borç özeti ve hatırlatıcı kalan tutarı (12.000 − 9.000) okur", () => {
    const [k] = odemeleriUygula([KALEM], iki(), turMap);
    expect(borcOzeti([k], { turler: TUR, tedarikciler: TED }, "2026-09-28").satirlar).toEqual([expect.objectContaining({ tur: "tedarikci", tutar: 3000 })]);
    const h = odemeHatirlatmalari([{ ...k, sonOdemeTarihi: "2026-09-20" }], { turler: TUR, tedarikciler: TED, yururlukAy: "2026-01" }, "2026-09-28");
    expect(h.gecmis.map(o => o.odenecek)).toEqual([3000]);
  });
  it("AC-14: makina maliyeti ödeme yönteminden etkilenmez (aynı ödemeler farklı yöntemle aynı sonuç)", () => {
    const hesap = (hareketler) => hesaplaMakinaMaliyetleri({ customers: [{ id: 1, name: "F", model: "AK100", serialNo: "S", installDate: "2026-09-20", uretimTarihi: "2026-09-05", fabrikaSatisBedeli: 1, currency: "TRY" }],
      stock: [], partStockLog: [], giderler: odemeleriUygula([KALEM], hareketler, turMap), giderTurleri: TUR, standartGiderler: [], standardModels: [{ model: "AK100" }], customModels: [], giderAyarlari: { yururlukAy: "2026-01" } }, { bugun: "2026-09-28" }).makinalar.get("musteri:1");
    const a = hesap(iki()), b = hesap(iki().map(h => ({ ...h, yontem: "Havale" })));
    expect(b.uretimMaliyeti).toBe(a.uretimMaliyeti);
    expect(b.ortakPay).toBe(a.ortakPay);
  });
  it("C3 / C4: borç özeti, hatırlatıcı ve makina maliyeti yöntem motorunu okumaz", () => {
    for (const f of ["src/lib/gider.js", "src/lib/odemeHatirlatma.js", "src/lib/makinaMaliyeti.js"]) {
      expect(readFileSync(f, "utf-8")).not.toMatch(/odemeYontemi"|yontemKirilimi/);
    }
  });
});

// Triyaj bulgu 1: kalem tutarı ödemeden sonra düşürülürse (fazla ödeme) kırılım motorun ve ekstrenin "ödenen"iyle aynıdır.
describe("Spec 0041 triyaj: fazla ödenmiş kalem", () => {
  it("5.000'lik kaleme 7.000 Nakit + 5.000 Havale: kırılım 5.000 (Nakit), ekstre 5.000; ikisi aynı", () => {
    const K = { id: 1, tarih: "2026-09-01", turId: 1, tutar: 5000, kdvOrani: 0, tedarikciId: 10 };
    const h = [od(1, 7000, "Nakit"), od(2, 5000, "Havale", { tarih: "2026-09-11" })];
    const y = yontemKirilimi(K, h, turMap);
    expect(y).toMatchObject({ karar: "tek", toplamK: 500000, satirlar: [{ yontem: "Nakit", tutarK: 500000 }] });
    const ana = hareketPaylari(K, h, turMap, { yalnizAna: true }).reduce((a, p) => a + p.payK, 0);
    expect(ana).toBe(y.toplamK);
    const e = tedarikciEkstresi(10, { giderler: [K], hareketler: h, turler: TUR });
    expect(e.satirlar.filter(s => s.tur === "odeme").reduce((a, s) => a + s.tutarK, 0)).toBe(y.toplamK);
    expect(donemYontemKirilimi([K], h, turMap).toplamK).toBe(500000);
  });
});

// Triyaj bulgu 2: hareketler kalem başına bir kez gruplanır; toplu sonuç tek tek hesapla aynıdır ve büyük veride hızlıdır.
describe("Spec 0041 triyaj: toplu hesap", () => {
  it("hareketGruplari kalemi kapatanları giderId'ye göre tarih sırasıyla gruplar; virman ve avans girmez", () => {
    const g = hareketGruplari([od(2, 1, "Nakit", { tarih: "2026-09-12" }), od(1, 1, "Nakit", { tarih: "2026-09-11" }), { id: 3, tur: "virman", tutar: 5 }, { id: 4, tur: "avans", tutar: 5, calisanId: 1 }]);
    expect([...g.keys()]).toEqual(["1"]);
    expect(g.get("1").map(h => h.id)).toEqual([1, 2]);
  });
  it("yontemKirilimlari tek tek yontemKirilimi ile aynı sonucu verir", () => {
    const h = [od(1, 7000, "Nakit"), od(2, 5000, "Kredi kartı"), od(3, 4000, "Havale", { giderId: 2, taksitId: T1.id })];
    const m = yontemKirilimlari([KALEM, TAKSITLI], h, turMap);
    expect(m.get("1")).toEqual(yontemKirilimi(KALEM, h, turMap));
    expect(m.get("2")).toEqual(yontemKirilimi(TAKSITLI, h, turMap));
  });
  it("3.000 kalem × 30.000 hareket 1,5 sn'nin altında", () => {
    const kalemler = Array.from({ length: 3000 }, (_, i) => ({ id: 10000 + i, tarih: "2026-09-01", turId: 1, tutar: 1000, kdvOrani: 0 }));
    const hareketler = Array.from({ length: 30000 }, (_, i) => od(50000 + i, 10, i % 2 ? "Nakit" : "Havale", { giderId: 10000 + (i % 3000) }));
    const t0 = performance.now();
    yontemKirilimlari(kalemler, hareketler, turMap);
    donemYontemKirilimi(kalemler, hareketler, turMap);
    expect(performance.now() - t0).toBeLessThan(1500);
  });
  it("Giderler dönem kırılımını useMemo içinde hesaplar (render başına değil)", () => {
    const src = readFileSync("src/components/Giderler.jsx", "utf-8");
    expect(src).toMatch(/useMemo\(\(\) => \(rapor && Array\.isArray\(hesapHareketleri\) \? donemYontemKirilimi\(/);
    expect(src.match(/donemYontemKirilimi\(/g)).toHaveLength(1);
  });
});
