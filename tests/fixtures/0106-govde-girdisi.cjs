// Spec 0106 (plan adım 3, AC-30): durum alanları olmayan müşteri kayıtlarının, kalıplarının ve Extra Kalıp satışlarının
// girdisi. Bu girdinin OKUNAN gövdesi spec öncesi koddan `tests/fixtures/0106-govde-once.json`'a yazıldı
// (`scripts/tests/0106-govde-fikstur.cjs`); yeni kodla birebir aynı olmalı (boş durum gövdede yok, `null` olarak da değil).
const GOVDE_GIRDISI = {
  customers: [
    { id: 601, name: "A AŞ", model: "AK100", serialNo: "S-601", installDate: "2026-03-05", warrantyEnd: "2028-03-05",
      kaliplar: [{ ad: "Y55", olcu: "55x125" }, { ad: "K40", olcu: "40x40", uretimFormGonder: true }, { ad: "O70", olcu: "70x140", uretimFormId: 900 }, { ad: "Y45", olcu: "45x110", partSaleId: 701 }] },
    { id: 602, name: "B AŞ", model: "AK120_DSC", serialNo: "", seriNoBekliyor: true, installDate: "2026-04-01", kaliplar: [], partiId: 902, uretimTarihi: "2026-03-20" },
    { id: 603, name: "C AŞ", model: "AK100", serialNo: "S-603", installDate: "2026-05-01", kaliplar: [], deletedAt: "2026-10-01T10:00:00.000Z" },
  ],
  partSales: [
    { id: 701, customerId: 601, tur: "Kalıp", ad: "Y45", olcu: "45x110", fiyat: 1000, ucret: 1000, currency: "TRY", tarih: "2026-05-02", odendi: false },
    { id: 702, customerId: 601, tur: "Kalıp", ad: "Y50", olcu: "50x110", fiyat: 1200, ucret: 1200, currency: "TRY", tarih: "2026-05-03", odendi: true, uretimFormGonder: true },
    { id: 703, customerId: 602, tur: "Kalıp", ad: "K30", olcu: "30x30", ucret: 900, currency: "TRY", tarih: "2026-06-01", deletedAt: "2026-10-02T10:00:00.000Z" },
  ],
};
module.exports = { GOVDE_GIRDISI };
