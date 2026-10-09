// Spec 0079 AC-31 (plan adım 0): tevkifatsız veri kümesi. "Önce" çıktıları (tests/fixtures/0079-tevkifatsiz-once.json ve
// 0079-ekran-once.json) bu veriyle, spec 0079'dan ÖNCEKİ kodla üretildi; veriyi değiştirmek altını geçersiz kılar.
// Makina (faturalı yurtiçi, eski biçimli tip, USD, faturasız, yurtdışı), kartla ödeme (yansıtmalı ve değil), çek, servis
// (kendi, anlaşmalı, kartlı, tipsiz), Extra Kalıp (fabrika, bayi aracılı, ücretsiz, kartlı), yedek parça (müşteri, bayi,
// dış firma, kartlı, toplu) birlikte bulunur.
import { calcCiro, calcKalanBorc } from "../../src/lib/utils";
import { hesaplaAylikRapor } from "../../src/lib/aylikRapor";
import { buildAylikRaporHtml, buildServiceFormHtml } from "../../src/lib/printTemplates";
import { hesaplananKdvAylar } from "../../src/lib/giderKdv";
import { kdvKarsilastir } from "../../src/lib/gider";
import { satisTahsilatKalemleri } from "../../src/lib/satisTahsilat";
import { finansOzetiHesapla, finansOzetiSatirlari, yedekParcaExportRow } from "../../src/components/settings/SettingsExport";
import { kalipKartHesabi } from "../../src/lib/kalipSatisi";
import { yedekParcaRec } from "../../src/lib/yedekParcaSatis";
import { ilkSatisOdemeleri } from "../../src/lib/makinaOdeme";

export const KDV = [{ from: "2000-01-01", rate: 20 }];
export const FAB = { name: "Altuntaş Makina" };
export const DEALERS = [{ id: 71, name: "Ege Bayi", bayiMi: true, anlasmaliServisMi: true }];
export const PARTS = [{ id: 81, ad: "Rulman" }, { id: 82, ad: "Kayış" }];
const kk = (toplamKesinti, yansitildi, hesabaGecis = "2026-09-20", blokajGun = 0) =>
  ({ taksit: 1, oran: 3, toplamKesinti, yansitildi, blokajGun, hesabaGecis, bazTarih: "2026-09-10" });

export const CUSTOMERS = [
  { id: 1001, name: "Anadolu Gıda", model: "AK100", serialNo: "S1001", installDate: "2026-09-05", currency: "TRY", faturali: "Faturalı Yurtiçi",
    fabrikaSatisBedeli: 120000, faturaBedeli: 100000, komisyon: 5000, satisYapan: "Altuntaş Makina" },
  { id: 1002, name: "Bal Köfte", model: "AK100", serialNo: "S1002", installDate: "2026-09-12", currency: "TRY", faturali: "Faturalı Yurtiçi",
    fabrikaSatisBedeli: 200000, faturaBedeli: 200000, satisYapan: "Altuntaş Makina" },
  { id: 1003, name: "Ceviz Ltd", model: "AK200", serialNo: "S1003", installDate: "2026-09-20", currency: "USD", faturali: "Faturalı Yurt İçi",
    fabrikaSatisBedeli: 10000, faturaBedeli: 9000, satisYapan: "Ege Bayi" },
  { id: 1004, name: "Defne Yemek", model: "AK100", serialNo: "S1004", installDate: "2026-10-02", currency: "TRY", faturali: "Faturasız Yurtiçi",
    fabrikaSatisBedeli: 90000, satisYapan: "Altuntaş Makina" },
  { id: 1005, name: "Euro Foods", model: "AK200", serialNo: "S1005", installDate: "2026-10-03", currency: "EUR", faturali: "Faturalı Yurtdışı",
    fabrikaSatisBedeli: 15000, faturaBedeli: 15000, satisYapan: "Altuntaş Makina" },
  { id: 1006, name: "Fındık Ev", model: "AK100", serialNo: "S1006", installDate: "2026-10-04", currency: "TRY",
    fabrikaSatisBedeli: 50000, faturaBedeli: 50000, satisYapan: "Altuntaş Makina" },
];
export const PAYMENTS = [
  { id: 2001, customerId: 1001, tarih: "2026-09-05", tutar: 30000, currency: "TRY", yontem: "Nakit" },
  { id: 2002, customerId: 1002, tarih: "2026-09-12", tutar: 123456.78, currency: "TRY", yontem: "Kredi Kartı", taksitSayisi: 1, kartKomisyonu: kk(3456.78, true) },
  { id: 2003, customerId: 1002, tarih: "2026-09-13", tutar: 60000, currency: "TRY", yontem: "Kredi Kartı", taksitSayisi: 1, kartKomisyonu: kk(1800, false) },
  { id: 2004, customerId: 1001, tarih: "2026-09-15", tutar: 20000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-11-01", tahsilEdildi: false },
  { id: 2005, customerId: 1003, tarih: "2026-09-21", tutar: 4000, currency: "USD", yontem: "Havale" },
  { id: 2006, customerId: 1006, tarih: "2026-10-04", tutar: 10000, currency: "TRY", yontem: "Kredi Kartı", taksitSayisi: 3, kartKomisyonu: kk(500, true, "2026-11-15", 40) },
];
export const SERVICES = [
  { id: 3001, customerId: 1001, date: "2026-09-08", type: "Garanti Dışı", servisUcreti: 5000, parcaUcreti: 2500, currency: "TRY", parcaCurrency: "TRY",
    islemFirma: "Altuntaş Makina", faturaTipi: "Faturalı Yurtiçi", odendi: false, parcaUcretsizMi: false, parcaUcretiAltuntastan: true, durum: "Tamamlandı" },
  { id: 3002, customerId: 1001, date: "2026-09-09", type: "Garanti Dışı", servisUcreti: 4000, parcaUcreti: 1500, currency: "TRY", parcaCurrency: "TRY",
    islemFirma: "Ege Bayi", faturaTipi: "Faturalı Yurtiçi", odendi: false, parcaUcretsizMi: false, parcaUcretiAltuntastan: true },
  { id: 3003, customerId: 1002, date: "2026-09-14", type: "Periyodik Bakım", servisUcreti: 3333.33, currency: "TRY", islemFirma: "Altuntaş Makina",
    faturaTipi: "Faturalı Yurtiçi", odendi: true, yontem: "Kredi Kartı", taksitSayisi: 1, kartKomisyonu: kk(120, true), tahsilatTarihi: "2026-09-14" },
  { id: 3004, customerId: 1003, date: "2026-09-22", type: "Garanti Dışı", servisUcreti: 300, currency: "USD", islemFirma: "Altuntaş Makina",
    faturaTipi: "Faturalı Yurtiçi", odendi: true, yontem: "Nakit", tahsilatTarihi: "2026-09-25" },
  { id: 3005, customerId: 1006, date: "2026-10-05", type: "Garanti Dışı", servisUcreti: 1000, currency: "TRY", islemFirma: "Altuntaş Makina", odendi: false },
  { id: 3006, customerId: 1002, date: "2026-10-06", type: "Garanti Dışı", servisUcreti: 2000, currency: "TRY", islemFirma: "Altuntaş Makina",
    faturaTipi: "Faturalı Yurtiçi", odendi: true, yontem: "Çek", vadeTarihi: "2026-12-01", tahsilEdildi: false },
];
export const PART_SALES = [
  { id: 4001, customerId: 1001, tur: "Kalıp", ad: "Burger", olcu: "100", tarih: "2026-09-10", ucret: 8000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi",
    odendi: false, satisFirma: "Altuntaş Makina" },
  { id: 4002, customerId: 1001, tur: "Kalıp", ad: "Köfte", olcu: "60", tarih: "2026-09-11", ucret: 6000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi",
    odendi: false, satisFirma: "Ege Bayi" },
  { id: 4003, customerId: 1002, tur: "Kalıp", ad: "Hediye", olcu: "50", tarih: "2026-09-16", ucret: 0, ucretsizMi: true, currency: "TRY", odendi: true },
  { id: 4004, customerId: 1002, tur: "Kalıp", ad: "Pide", olcu: "120", tarih: "2026-09-17", ucret: 10309.28, currency: "TRY", faturaTipi: "Faturalı Yurtiçi",
    odendi: true, yontem: "Kredi Kartı", taksitSayisi: 1, kartKomisyonu: kk(309.28, true), tahsilatTarihi: "2026-09-17", satisFirma: "Altuntaş Makina" },
  { id: 4005, customerId: 1006, tur: "Kalıp", ad: "Lahmacun", olcu: "200", tarih: "2026-10-07", ucret: 4000, currency: "TRY", odendi: false, satisFirma: "Altuntaş Makina" },
];
export const YEDEK = [
  { id: 5001, aliciTipi: "musteri", musteriId: 1001, partId: "81", miktar: 2, birimFiyat: 750, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-09-18", odendi: false, tahsisler: [] },
  { id: 5002, aliciTipi: "bayi", dealerId: 71, partId: "82", miktar: 10, birimFiyat: 120, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-09-19", odendi: false, tahsisler: [], batchId: 9 },
  { id: 5003, aliciTipi: "bayi", dealerId: 71, partId: "81", miktar: 1, birimFiyat: 999.99, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-09-19", odendi: false, tahsisler: [], batchId: 9 },
  { id: 5004, aliciTipi: "bayi", disFirma: true, disFirmaAd: "Kuzey Servis", partId: "81", miktar: 3, birimFiyat: 400, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-10-01", odendi: true, yontem: "Nakit", tahsilatTarihi: "2026-10-01", tahsisler: [] },
  { id: 5005, aliciTipi: "musteri", musteriId: 1002, partId: "82", miktar: 1, birimFiyat: 2061.86, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-10-03", odendi: true,
    yontem: "Kredi Kartı", taksitSayisi: 1, kartKomisyonu: kk(61.86, true, "2026-10-03"), tahsilatTarihi: "2026-10-03", tahsisler: [] },
  { id: 5006, aliciTipi: "musteri", musteriId: 1003, partId: "81", miktar: 4, birimFiyat: 25, currency: "USD", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-10-04", odendi: false, tahsisler: [] },
];
export const KK_AYAR = { bsmv: 5, satirlar: [{ taksit: 1, oran: 3.15, katkiPayi: 0.1, blokajGun: 0 }, { taksit: 3, oran: 6.3, katkiPayi: 0.1, blokajGun: 40 }] };
// Kart tabanı (R13): formların kayıt kurucuları bugünkü tabanla; tevkifatsız formda önce/sonra aynı.
export const kartTabanlari = (ek = {}) => {
  const kalipForm = (yansit, tip = "Faturalı Yurtiçi") => ({ yontem: "Kredi Kartı", taksitSayisi: 1, kkYansit: yansit, faturaTipi: tip, tarih: "2026-09-10", ...ek });
  const yp = (yansit) => yedekParcaRec({ aliciTipi: "musteri", musteriId: 1001, partId: "81", miktar: 3, birimFiyat: "1.333,33", faturaTipi: "Faturalı Yurtiçi",
    tarih: "2026-09-10", yontem: "Kredi Kartı", taksitSayisi: 3, kkYansit: yansit, ...ek }, KK_AYAR, KDV);
  const ilk = (yansit) => ilkSatisOdemeleri([{ yontem: "Kredi Kartı", tutar: "100.000", taksitSayisi: 1, kkYansit: yansit }],
    { customerId: 1, currency: "TRY", tarih: "2026-09-10", ayar: KK_AYAR, kdvOran: 20, yeniId: () => 1 }).kayitlar[0];
  return {
    kalipYansit: kalipKartHesabi(kalipForm(true), "2026-09-10", KK_AYAR, KDV)(8000),
    kalipDuz: kalipKartHesabi(kalipForm(false), "2026-09-10", KK_AYAR, KDV)(8000),
    kalipYurtdisi: kalipKartHesabi(kalipForm(true, "Faturalı Yurtdışı"), "2026-09-10", KK_AYAR, KDV)(8000),
    ypYansit: yp(true).rec && { birimFiyat: yp(true).rec.birimFiyat, kartKomisyonu: yp(true).rec.kartKomisyonu },
    ypDuz: yp(false).rec && { birimFiyat: yp(false).rec.birimFiyat, kartKomisyonu: yp(false).rec.kartKomisyonu },
    ilkYansit: ilk(true), ilkDuz: ilk(false),
  };
};
export const VERI = { customers: CUSTOMERS, services: SERVICES, partSales: PART_SALES, payments: PAYMENTS, teklifler: [], dealers: DEALERS, yedekParcaSatislar: YEDEK };
export const SECENEK = { factoryName: FAB.name, kdvRates: KDV, factory: FAB };

// Bilgi rakamı alanı yalnız tevkifatlı satış varken eklenir (R22/2); tevkifatsız veride önce/sonra eşitliği alanın yokluğunu da sınar.
export const motorCiktilari = (veri = VERI) => {
  const borc = veri.customers.map(c => ({ id: c.id, ciro: calcCiro(c, KDV, veri.payments), kalan: calcKalanBorc(c, veri.payments, KDV) }));
  const tahsilat = satisTahsilatKalemleri(veri, { factoryName: FAB.name, kdvRates: KDV })
    .map(k => ({ kaynak: k.kaynak, id: k.kayit.id, bedel: k.bedel, kdv: k.kdv, tutar: k.tutar, currency: k.currency, tarih: k.tarih }));
  const rapor = (ay) => hesaplaAylikRapor(veri, ay, SECENEK);
  const eylul = rapor("2026-09"), ekim = rapor("2026-10");
  const hesaplanan = hesaplananKdvAylar(veri, ["2026-09", "2026-10"], SECENEK);
  const oz = finansOzetiHesapla({ customers: veri.customers, services: veri.services, partSales: veri.partSales, kdvRates: KDV, factoryName: FAB.name });
  const servisFormlari = veri.services.map(s => buildServiceFormHtml(s, veri.customers, KDV, { factory: FAB }));
  return JSON.parse(JSON.stringify({
    borc, tahsilat, eylul, ekim, eylulHtml: buildAylikRaporHtml(eylul, FAB), ekimHtml: buildAylikRaporHtml(ekim, FAB),
    hesaplanan, karsilastir: kdvKarsilastir(hesaplanan, 5000),
    finansOzeti: finansOzetiSatirlari(oz, veri.services, "T"),
    yedekExport: veri.yedekParcaSatislar.map(s => yedekParcaExportRow(s, { dealers: DEALERS, customers: veri.customers, parts: PARTS })),
    servisFormlari, kart: kartTabanlari(),
  }));
};
