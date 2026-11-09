// Spec 0138 ortak veri. Kıyas (C1, C1/2, AC-13–AC-16) için katalog bağlı işlem kalemi OLMAYAN veri: 0137'nin kıyas verisi
// (0135'in eski biçimli parçaları; yalnız serbest işlem kalemli, malzeme + serbest karma, boş tutarlı serbest, geçmişli serbest,
// karma set). Aylık rapor ve Finans Özeti parçanın alış maliyetini OKUMAZ (C1/2): o iki yarı yapısal olarak bu işten etkilenmez,
// kıyas yalnız gerileme bekçisidir. Boş geçmesin diye satır üreten müşteri, servis, Extra Kalıp ve yedek parça satışı vardır.
export * from "./0137-veri.js";

export const RAPOR_AYI = "2026-05";
export const RAPOR_VERI = {
  customers: [{ id: 9001, name: "Örnek Gıda", model: "AK100", seriNo: "S1", installDate: "2026-05-04", fabrikaSatisBedeli: 400000, faturaBedeli: 400000, currency: "TRY", faturali: "Faturalı Yurtiçi", kalanBorc: 50000 }],
  services: [{ id: 9101, customerId: 9001, date: "2026-05-10", type: "Bakım", servisUcreti: 3000, parcaUcreti: 1200, currency: "TRY", parcaCurrency: "TRY", faturaTipi: "Faturalı Yurtiçi", odendi: true, tahsilatTarihi: "2026-05-11", islemFirma: "Altuntaş Makina", degisenParcalar: [{ partId: 81, miktar: 1 }] }],
  partSales: [{ id: 9201, customerId: 9001, tur: "Kalıp", tarih: "2026-05-12", ucret: 8000, miktar: 1, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", odendi: false }],
  payments: [{ id: 9301, customerId: 9001, tarih: "2026-05-05", tutar: 100000, currency: "TRY", yontem: "Havale" }],
  teklifler: [], dealers: [{ id: 9401, name: "Bayi A" }],
  yedekParcaSatislar: [{ id: 9501, aliciTipi: "bayi", dealerId: 9401, partId: 82, miktar: 2, birimFiyat: 750, currency: "TRY", tarih: "2026-05-20", faturaTipi: "Faturalı Yurtiçi", odendi: false }],
};
