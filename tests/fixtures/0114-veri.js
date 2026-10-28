// Spec 0114: ihraç kayıtlı teslim test verisi (saf testler, ekran testleri ve görsel kanıt aynı kümeyi okur).
// Eylül 2026: işaretli makina (200.000 TL, 150.000 tahsil), işaretli Extra Kalıp, işaretli ve ÜCRETSİZ eski Extra Kalıp (R8/2),
// işaretli yedek parça (TL, USD, EUR ve tanınmayan GBP), işaretsiz ve tevkifatlı komşular, yurtdışı tipte saklı kalmış işaret (R6).
export const KDV = [{ from: "2008-01-01", rate: 18 }, { from: "2023-07-07", rate: 20 }];
export const FAB = { name: "Altuntaş Makina" };
export const FY = "Faturalı Yurtiçi";
export const IK = { ihracKayitli: true };
export const T5 = { tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10 };

export const CUSTOMERS = [
  { id: 1, name: "İhracatçı Dış Ticaret", model: "AK100", serialNo: "S1", installDate: "2026-09-10", currency: "TRY", faturali: FY,
    faturaBedeli: 200000, fabrikaSatisBedeli: 200000, satisYapan: "Altuntaş Makina", kalanBorc: 50000, ...IK },
  { id: 2, name: "Normal Gıda", model: "AK100", serialNo: "S2", installDate: "2026-09-12", currency: "TRY", faturali: FY,
    faturaBedeli: 100000, fabrikaSatisBedeli: 100000, satisYapan: "Altuntaş Makina", kalanBorc: 120000 },
  { id: 3, name: "Tevkifatlı Yemek", model: "AK100", serialNo: "S3", installDate: "2026-09-14", currency: "TRY", faturali: FY,
    faturaBedeli: 100000, fabrikaSatisBedeli: 100000, satisYapan: "Altuntaş Makina", kalanBorc: 110000, ...T5 },
  { id: 4, name: "Eski İhracatçı", model: "AK100", serialNo: "S4", installDate: "2023-05-10", currency: "TRY", faturali: FY,
    faturaBedeli: 100000, fabrikaSatisBedeli: 100000, satisYapan: "Altuntaş Makina", kalanBorc: 0, ...IK },
  { id: 5, name: "Yurtdışı İşaretli", model: "AK100", serialNo: "S5", installDate: "2026-09-15", currency: "EUR", faturali: "Faturalı Yurtdışı",
    faturaBedeli: 10000, fabrikaSatisBedeli: 10000, satisYapan: "Altuntaş Makina", kalanBorc: 10000, ...IK },
];
export const PAYMENTS = [
  { id: 101, customerId: 1, tarih: "2026-09-10", tutar: 150000, currency: "TRY", yontem: "Nakit" },
  { id: 104, customerId: 4, tarih: "2023-05-10", tutar: 100000, currency: "TRY", yontem: "Nakit" },
];
export const PART_SALES = [
  { id: 21, customerId: 1, tur: "Kalıp", ad: "Hamburger", olcu: "100", tarih: "2026-09-16", ucret: 50000, currency: "TRY", faturaTipi: FY,
    odendi: false, satisFirma: "Altuntaş Makina", ...IK },
  { id: 22, customerId: 2, tur: "Kalıp", ad: "Pide", olcu: "1", tarih: "2026-09-17", ucret: 30000, currency: "TRY", faturaTipi: FY,
    odendi: false, ucretsizMi: true, satisFirma: "Altuntaş Makina", ...IK },
  { id: 23, customerId: 2, tur: "Kalıp", ad: "Kasap", olcu: "2", tarih: "2026-09-17", ucret: 40000, currency: "TRY", faturaTipi: FY,
    odendi: true, satisFirma: "Altuntaş Makina" },
  { id: 24, customerId: 1, tur: "Kalıp", ad: "Köfte", olcu: "3", tarih: "2026-09-18", ucret: 20000, currency: "TRY", faturaTipi: FY,
    odendi: true, satisFirma: "Altuntaş Makina", ...IK },
];
const yp = (id, o) => ({ id, aliciTipi: "musteri", musteriId: 2, partId: "81", miktar: 1, birimFiyat: 100, currency: "TRY", faturaTipi: FY,
  tarih: "2026-09-18", odendi: false, yontem: "Nakit", kargoDurum: "", tahsisler: [], ...IK, ...o });
export const YEDEK = [
  yp(31, { musteriId: 1, miktar: 10, birimFiyat: 1000 }),
  yp(32, { currency: "USD", miktar: 2, birimFiyat: 500, tarih: "2026-09-19" }),
  yp(33, { currency: "EUR", birimFiyat: 300, tarih: "2026-09-20" }),
  yp(34, { currency: "GBP", birimFiyat: 100, tarih: "2026-09-21" }),
  yp(35, { birimFiyat: 5000, ihracKayitli: undefined }),
];
export const DEALERS = [];
export const PARTS = [{ id: 81, ad: "Rulman" }];
export const VERI = { customers: CUSTOMERS, services: [], partSales: PART_SALES, payments: PAYMENTS, teklifler: [], dealers: DEALERS, yedekParcaSatislar: YEDEK };
export const SECENEK = { factoryName: FAB.name, kdvRates: KDV, factory: FAB, rates: {} };
