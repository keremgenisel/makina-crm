// Spec 0100 (plan adım 1, AC-45): üretim durumu olmayan stok satırlarının girdisi (serili, serisiz, partili, üretim tarihli,
// kitli, çöpte). Bu girdinin OKUNAN gövdesi spec öncesi koddan `tests/fixtures/0100-govde-once.json`'a yazıldı
// (`scripts/tests/0100-govde-fikstur.cjs`); yeni kodla birebir aynı olmalı (boş durum gövdede yok, `null` olarak da değil).
const GOVDE_GIRDISI = {
  stock: [
    { id: 70, model: "AK100", serialNo: "T-70", addedDate: "2026-03-05", note: "Not", parcalar: [{ partId: "7", miktar: 2 }] },
    { id: 71, model: "AK120_DSC", serialNo: "", addedDate: "2026-04-01", note: "", parcalar: [], partiId: 902 },
    { id: 72, model: "AK100", serialNo: "T-72", addedDate: "2026-05-01", uretimTarihi: "2026-02-10", partiId: 901 },
    { id: 73, model: "AK100", serialNo: "T-73", addedDate: "2026-06-01", deletedAt: "2026-10-01T10:00:00.000Z" },
  ],
};
module.exports = { GOVDE_GIRDISI };
