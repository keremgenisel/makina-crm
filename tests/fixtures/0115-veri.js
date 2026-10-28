// Spec 0115: kalıp tamiri test verisi (kıyas altını, saf testler, ekran testleri ve görsel kanıt aynı kümeyi okur).
// Spec öncesi altın (tests/fixtures/0115-once.json) bu veriyle üretildi; veriyi değiştirmek altını geçersiz kılar.
// İki müşteri (biri ayna satırlı), bir Extra Kalıp satışı, bir üretim formu (müşteri ve Extra Kalıp satırı), kalıp revize
// kalemli ve kalemsiz servisler, "KALIP MİLİ" gibi kalıp dışı kalem; parça tipleri bugünkü üç sistem tipi.
export const KDV = [{ from: "2008-01-01", rate: 18 }, { from: "2023-07-07", rate: 20 }];
export const FAB = { name: "Altuntaş Makina", adres: "OSB 1. Cad. No 5", city: "Konya", country: "Türkiye", phone: "0332 000 00 00" };
export const FY = "Faturalı Yurtiçi";

export const PART_TYPES = [
  { id: "standart", ad: "Standart", renk: "slate", makinaSecici: false, stokDus: false, raporGoster: false, sistem: true },
  { id: "konveyor", ad: "Konveyör Saç", renk: "blu", makinaSecici: true, stokDus: true, raporGoster: false, sistem: true, rol: "konveyor" },
  { id: "bant", ad: "Bant", renk: "grn", makinaSecici: true, stokDus: true, raporGoster: true, sistem: true, rol: "bant" },
];
export const PARTS = [
  { id: 81, ad: "100_ERKEK KALIPLAR REVİZE", tip: "Standart", fiyatTRY: 4000 },
  { id: 82, ad: "KALIP MİLİ", tip: "Standart", fiyatTRY: 1500 },
  { id: 83, ad: "KAZAN REVİZE", tip: "Standart", fiyatTRY: 9000 },
  { id: 84, ad: "Rulman", fiyatTRY: 250 },
];

export const CUSTOMERS = [
  { id: 1, name: "Anadolu Köfte", model: "AK100", serialNo: "S1", installDate: "2024-03-10", currency: "TRY", faturali: FY, city: "Konya",
    adres: "Mevlana Cad. 10", phone: "0332 111 11 11", yetkili1Ad: "Ali Bey", warrantyEnd: "2026-03-10",
    kalipCapi: { en: "200", yukseklik: "121", boy: "48" },
    kaliplar: [{ ad: "HAMBURGER", olcu: "Ø98" }, { ad: "KASAP KÖFTE", olcu: "46*80" }, { ad: "PİDE", olcu: "1", partSaleId: 21 }], kalipSayisi: 3 },
  { id: 2, name: "Bafra Gıda", model: "AK120_DS", serialNo: "S2", installDate: "2014-05-02", currency: "TRY", faturali: FY, city: "Samsun",
    adres: "Sanayi Sitesi 4", phone: "0362 222 22 22", warrantyEnd: "2016-05-02",
    kaliplar: [{ ad: "İNEGÖL", olcu: "15*72", uretimFormGonder: true }], kalipSayisi: 1 },
];
export const PART_SALES = [
  { id: 21, customerId: 1, tur: "Kalıp", ad: "PİDE", olcu: "1", tarih: "2026-09-14", ucret: 8000, currency: "TRY", faturaTipi: FY,
    odendi: true, satisFirma: "Altuntaş Makina", uretimFormGonder: true, uretimFormId: 31 },
];
const satir = (o) => ({ id: o.id, kalipDefId: null, kalipKodu: "", kalipAdi: "", kalipResim: "", musteriId: null, musteriAdi: "", sehir: "",
  makinaKodu: "", torna: "", kalipOlcusu: "", makinaKalipCapi: "", tamamlandi: false, kaynakTip: null, kaynakId: null, kalipIdx: null, ...o });
export const URETIM_FORMLARI = [
  { id: 31, baslangicTarihi: "2026-10-26", bitisTarihi: "2026-10-26", kapali: false, not: "", createdAt: "2026-10-26",
    satirlar: [
      satir({ id: 3101, kalipAdi: "PİDE", kalipOlcusu: "1", musteriId: 1, musteriAdi: "Anadolu Köfte", sehir: "Konya", makinaKodu: "AK100",
        kaynakTip: "extra_kalip", kaynakId: 21 }),
      satir({ id: 3102, kalipAdi: "İNEGÖL", kalipOlcusu: "15*72", musteriId: 2, musteriAdi: "Bafra Gıda", sehir: "Samsun", makinaKodu: "AK120_DS",
        kaynakTip: "musteri", kaynakId: 2, kalipIdx: 0, tamamlandi: true }),
    ] },
];
export const SERVICES = [
  { id: 41, customerId: 1, date: "2026-10-12", type: "Garanti Dışı", repairPlace: "Fabrikada Onarım", islemFirma: "Altuntaş Makina",
    faturaTipi: FY, currency: "TRY", servisUcreti: 0, odendi: true, durum: "Yapılıyor", tech: "Ali Veli",
    degisenParcalar: [{ partId: "81", ad: "100_ERKEK KALIPLAR REVİZE", miktar: 1, fiyat: 4000 }, { partId: "84", ad: "Rulman", miktar: 2, fiyat: 250 }] },
  { id: 42, customerId: 2, date: "2026-10-20", type: "Periyodik Bakım", repairPlace: "Yerinde Onarım", islemFirma: "Altuntaş Makina",
    faturaTipi: FY, currency: "TRY", servisUcreti: 3000, odendi: false, durum: "Bekliyor",
    degisenParcalar: [{ partId: "82", ad: "KALIP MİLİ", miktar: 1, fiyat: 1500 }] },
];
export const KALIP_DEFS = [{ id: 51, ad: "HAMBURGER", kod: "HB-98" }];
