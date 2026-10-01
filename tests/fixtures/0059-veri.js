// Spec 0059: Aylık Gider ve Kasa Raporu ile Aylık Faaliyet Raporu için ortak test verisi. 0047 düzeneğinin genişletilmiş
// hâli: EUR hesap ve tahsilat, ay içinde tahsil / ciro / karşılıksız / aynı ay iptal edilen ciro çekleri, vadesi geçmiş
// kalem (adında "<" olan tedarikçi), önceki ay (ağustos) kalemi ve ödemesi. Altın çıktılar (tests/fixtures/0059-*) bu
// veriyle, değişiklikten ÖNCEKİ kodla üretildi; veriyi değiştirmek altınları geçersiz kılar.
import { giderKalemDogrula, turHaritasi, HEDEF } from "../../src/lib/gider";

export const turler = [{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Maaşlar", davranis: "personel" }];
export const turMap = turHaritasi(turler);
export const tedarikciler = [{ id: 11, ad: "Demir Bant" }, { id: 12, ad: "Yıldız Gayrimenkul" }, { id: 13, ad: "A<B Ticaret" }];
let n = 7000;
const uid = () => ++n;
const kayit = (form) => {
  const r = giderKalemDogrula(form, { turMap, tedarikciler, uid });
  if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar));
  return r.kayit;
};
export const AD = "Zümrüt Kaplanoğlu";
export const K1 = kayit({ id: 1, tarih: "2026-09-05", turId: 1, tutar: 10000, kdvOrani: 20, tedarikciId: 11, aciklama: "Sac levha", sonOdemeTarihi: "2026-09-20" });
export const K2 = kayit({ id: 2, tarih: "2026-09-01", turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 12, aciklama: "Eylül kirası", sonOdemeTarihi: "2026-09-10" });
export const K3 = kayit({ id: 3, tarih: "2026-09-15", turId: 1, tutar: 1000, kdvOrani: 0, aciklama: "Temizlik", sonOdemeTarihi: "2026-10-03" });
export const K4 = kayit({ id: 4, tarih: "2026-09-30", turId: 3, calisanId: 21, calisanAd: AD, resmiTutar: 31111, eldenTutar: 17777,
  ekOdemeler: [{ tur: "prim", aciklama: "Eylül primi", resmiTutar: 2345, eldenTutar: "" }], sonOdemeTarihi: "2026-10-05" });
export const K5 = kayit({ id: 5, tarih: "2026-10-02", turId: 1, tutar: 999, kdvOrani: 0, aciklama: "Ekim kalemi" });
export const K6 = kayit({ id: 6, tarih: "2026-09-06", turId: 1, tutar: 2000, kdvOrani: 0, tedarikciId: 11, aciklama: "Bant" });
export const K7 = kayit({ id: 7, tarih: "2026-09-03", turId: 1, tutar: 3000, kdvOrani: 0, tedarikciId: 13, aciklama: "Vida & somun", sonOdemeTarihi: "2026-09-12" });
export const K8 = kayit({ id: 8, tarih: "2026-08-12", turId: 1, tutar: 4000, kdvOrani: 20, tedarikciId: 11, aciklama: "Ağustos sacı", sonOdemeTarihi: "2026-08-25" });
export const GIDERLER = [K1, K2, K3, K4, K5, K6, K7, K8];
export const ana = (k) => k.taksitler.find(t => t.hedef === HEDEF.ANA);
export const stopaj = (k) => k.taksitler.find(t => t.hedef === HEDEF.STOPAJ);
export const HESAPLAR = [
  { id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, acilisTarihi: "2026-01-01", kapali: false },
  { id: 52, ad: "Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 20000, acilisTarihi: "2026-09-10", kapali: false },
  { id: 53, ad: "Döviz", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 1000, acilisTarihi: "2026-01-01", kapali: false },
  { id: 54, ad: "Eski", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2026-01-01", kapali: true },
  { id: 55, ad: "Yeni", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 500, acilisTarihi: "2026-11-01", kapali: false },
  { id: 56, ad: "Euro Hesap", tur: "banka", paraBirimi: "EUR", acilisBakiyesi: 0, acilisTarihi: "2026-01-01", kapali: false },
];
export const H = [
  { id: 101, tur: "odeme", tarih: "2026-09-18", tutar: 12000, yontem: "Havale", hesapId: 51, giderId: 1, taksitId: null },
  { id: 102, tur: "odeme", tarih: "2026-10-05", tutar: 16000, yontem: "Havale", hesapId: 51, giderId: 2, taksitId: ana(K2).id }, // ay sonrası
  { id: 103, tur: "odeme", tarih: "2026-09-30", tutar: 33456, yontem: "Nakit", hesapId: 52, giderId: 4, taksitId: ana(K4).id },
  { id: 104, tur: "odeme", tarih: "2026-09-20", tutar: 1000, yontem: "", hesapId: null, giderId: 3, taksitId: null }, // hesapsız
  { id: 105, tur: "virman", tarih: "2026-09-12", tutar: 5000, hesapId: 51, karsiHesapId: 52 },
  { id: 106, tur: "avans", tarih: "2026-09-08", tutar: 3000, calisanId: 21, hesapId: 52 },
  { id: 107, tur: "mahsup", tarih: "2026-09-29", tutar: 1000, calisanId: 21, giderId: 4, taksitId: K4.taksitler.find(t => t.hedef === HEDEF.ELDEN).id, hesapId: null },
  { id: 108, tur: "avans", tarih: "2026-09-25", tutar: 500, calisanId: 21, hesapId: null }, // hesapsız avans
  { id: 109, tur: "odeme", tarih: "2026-08-10", tutar: 5000, yontem: "Havale", hesapId: 51, giderId: 99, taksitId: null }, // önceki ay, silinmiş kalem
  { id: 110, tur: "odeme", tarih: "2026-09-22", tutar: 2000, yontem: "Çek (ciro)", hesapId: null, giderId: 6, taksitId: null, cekId: 200 }, // ciro
  { id: 111, tur: "odeme", tarih: "2026-08-20", tutar: 4800, yontem: "Havale", hesapId: 51, giderId: 8, taksitId: null }, // ağustos kalemi
  { id: 112, tur: "odeme", tarih: "2026-09-11", tutar: 4000, yontem: "Havale", hesapId: 51, giderId: 2, taksitId: stopaj(K2).id }, // vergi dairesi
];
export const PAYMENTS = [
  { id: 300, customerId: 1, tarih: "2026-09-01", tutar: 2000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-10-01" },
  { id: 301, customerId: 1, tarih: "2026-09-03", tutar: 5000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-10-05" },
  { id: 302, customerId: 1, tarih: "2026-09-14", tutar: 7000, currency: "TRY", yontem: "Havale", hesapId: 51 },
  { id: 303, customerId: 1, tarih: "2026-07-01", tutar: 4000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-12-01" },
  { id: 304, customerId: 1, tarih: "2026-09-17", tutar: 1500, currency: "EUR", yontem: "Havale", hesapId: 56 },
  { id: 305, customerId: 1, tarih: "2026-09-02", tutar: 3000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-09-24" },
  { id: 306, customerId: 1, tarih: "2026-09-04", tutar: 2500, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-11-04" },
  { id: 307, customerId: 1, tarih: "2026-09-05", tutar: 4000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-09-27", hesapId: 51 },
];
export const CEKLER = [
  { id: 200, paymentId: 300, no: "C-200", banka: "Ziraat", durum: "ciro", gecmis: [{ tarih: "2026-09-01", durum: "portfoy" }, { tarih: "2026-09-22", durum: "ciro", not: "Ciro: Demir Bant" }] },
  { id: 201, paymentId: 301, no: "C-201", banka: "Garanti", durum: "tahsil", gecmis: [{ tarih: "2026-09-03", durum: "portfoy" }, { tarih: "2026-10-05", durum: "tahsil" }] },
  { id: 202, paymentId: 303, no: "C-202", banka: "Akbank", durum: "portfoy", gecmis: [] }, // geçmişsiz eski çek
  { id: 203, paymentId: 305, no: "C-203", banka: "Halkbank", durum: "karsiliksiz", gecmis: [{ tarih: "2026-09-02", durum: "portfoy" }, { tarih: "2026-09-25", durum: "karsiliksiz" }] },
  { id: 204, paymentId: 306, no: "C-204", banka: "Vakıf", durum: "portfoy", gecmis: [{ tarih: "2026-09-04", durum: "portfoy" }, { tarih: "2026-09-10", durum: "ciro" }, { tarih: "2026-09-12", durum: "portfoy" }] }, // aynı ay iptal
  { id: 205, paymentId: 307, no: "C-205", banka: "İş Bankası", durum: "tahsil", gecmis: [{ tarih: "2026-09-05", durum: "portfoy" }, { tarih: "2026-09-28", durum: "tahsil" }] },
];
export const CUSTOMERS = [{ id: 1, name: "Kutu Gıda" }];
export const SERVICES = [{ id: 400, customerId: 1, type: "Garanti Dışı", servisUcreti: 1000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", date: "2026-09-16", odendi: true, tahsilatTarihi: "2026-09-16", yontem: "Nakit", hesapId: 51 }];
export const PART_SALES = [{ id: 410, customerId: 1, tur: "Kalıp", ad: "K", ucret: 500, currency: "TRY", faturaTipi: "Faturasız Yurtiçi", tarih: "2026-09-19", odendi: true, tahsilatTarihi: "2026-09-19", yontem: "Nakit", hesapId: null }];
export const girdi = (o = {}) => ({
  giderler: GIDERLER, hareketler: H, turler, tedarikciler, stock: [], customers: CUSTOMERS, canliModeller: new Set(), yururlukAy: "2026-01", esikGun: 7,
  satisVerisi: { customers: CUSTOMERS, services: SERVICES, partSales: PART_SALES, payments: PAYMENTS, teklifler: [], dealers: [], yedekParcaSatislar: [] },
  kdvSecenek: { factoryName: "Altuntaş Makina" },
  hesaplar: HESAPLAR, cekler: CEKLER, payments: PAYMENTS, services: SERVICES, partSales: PART_SALES, yedekParcaSatislar: [], dealers: [],
  factory: { name: "Altuntaş Makina", adres: "Organize Sanayi", city: "Konya", country: "Türkiye" }, ...o,
});

// ── Aylık Faaliyet Raporu girdisi: bütün detay tabloları dolu (değişmezlik testi her yardımcıyı kullanmalı) ──
export const kdvRates = [{ from: "2000-01-01", rate: 20 }];
export const faaliyetSecenek = { factoryName: "Altuntaş Makina", kdvRates, factory: { name: "Altuntaş Makina" } };
export const faaliyetVeri = {
  customers: [
    { id: 1, name: "A & <Ortak>", model: "AK100", installDate: "2026-06-10", currency: "TRY", fabrikaSatisBedeli: 800000, faturaBedeli: 600000, faturali: "Faturalı Yurtiçi", komisyon: 20000, kalanBorc: 100000, satisYapan: "Altuntaş Makina" },
    { id: 2, name: "B", model: "AK100", installDate: "2026-05-28", currency: "USD", fabrikaSatisBedeli: 15000, faturali: "Faturalı Yurtdışı", kalanBorc: 0, satisYapan: "Ege Bayi" },
    { id: 4, name: "D (2.el)", model: "AK100", installDate: "2026-06-15", isResale: true, currency: "TRY", kalanBorc: 0 },
    { id: 5, name: "E", model: "AK140", installDate: "2026-06-18", currency: "TRY", fabrikaSatisBedeli: 700000, faturali: "Faturasız Yurtiçi", kalanBorc: 50000, satisYapan: "Ege Bayi" },
  ],
  services: [
    { id: 10, customerId: 1, date: "2026-06-12", type: "Garanti Dışı", servisUcreti: 5000, currency: "TRY", islemFirma: "Altuntaş Makina", repairPlace: "Fabrikada Onarım", odendi: false, faturaTipi: "Faturalı Yurtiçi" },
    { id: 11, customerId: 1, date: "2026-06-13", type: "Garanti İçi", servisUcreti: 4000, currency: "TRY", islemFirma: "Altuntaş Makina", repairPlace: "Yerinde Onarım", odendi: true, tahsilatTarihi: "2026-06-13" },
    { id: 12, customerId: 5, date: "2026-06-14", type: "Garanti Dışı", servisUcreti: 3000, currency: "TRY", islemFirma: "Ege Bayi", repairPlace: "Yerinde Onarım", odendi: false,
      degisenParcalar: [{ partId: 7, miktar: 1, birimFiyat: 1200 }], parcaUcreti: 1200, parcaUcretiAltuntastan: true, parcaCurrency: "TRY", faturaTipi: "Faturalı Yurtiçi" },
  ],
  partSales: [
    { id: 20, customerId: 1, tur: "Kalıp", tarih: "2026-06-05", ucret: 25000, currency: "TRY", faturaTipi: "Faturasız Yurtiçi", odendi: true, kargoDurum: "Teslim Edildi" },
    { id: 21, customerId: 5, tur: "Kalıp", tarih: "2026-06-21", ucret: 8000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", odendi: false, satisFirma: "Ege Bayi" },
  ],
  payments: [
    { id: 30, customerId: 1, tarih: "2026-06-08", tutar: 200000, currency: "TRY", yontem: "Nakit" },
    { id: 31, customerId: 1, tarih: "2026-06-09", tutar: 150000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-09-01", tahsilEdildi: false },
    { id: 32, customerId: 1, tarih: "2026-06-10", tutar: 50000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-06-20", tahsilEdildi: true },
    { id: 34, customerId: 5, tarih: "2026-05-11", tutar: 30000, currency: "TRY", yontem: "Havale" },
  ],
  teklifler: [
    { id: 40, type: "teklif", tarih: "2026-06-02", durum: "gonderildi", firma: "A & <Ortak>", currency: "TRY", satirlar: [{ subItems: [{ birimFiyat: "300000", miktar: 1 }] }] },
    { id: 41, type: "teklif", tarih: "2026-06-03", durum: "onaylandi", firma: "E", currency: "TRY", satirlar: [{ subItems: [{ birimFiyat: "120000", miktar: 2 }] }] },
    { id: 42, type: "teklif", tarih: "2026-05-03", durum: "gonderildi", firma: "B", currency: "USD", satirlar: [{ subItems: [{ birimFiyat: "9000", miktar: 1 }] }] },
  ],
  dealers: [{ id: 3, name: "Ege Bayi", bayiMi: true, anlasmaliServisMi: true }],
  yedekParcaSatislar: [
    { id: 50, aliciTipi: "bayi", dealerId: 3, partId: 7, miktar: 4, birimFiyat: 350, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-06-22", odendi: false, kargoDurum: "Kargoya Verildi", tahsisler: [] },
    { id: 51, aliciTipi: "musteri", musteriId: 1, partId: 7, miktar: 1, birimFiyat: 900, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-06-23", odendi: true, tahsilatTarihi: "2026-06-23", tahsisler: [] },
  ],
};
