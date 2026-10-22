// Spec 0101 (plan adım 2, AC-5, AC-50): kalıp çapı olmayan stok satırlarının girdisi (serili, serisiz, partili, üretim tarihli,
// kitli, durumlu, çöpte). Bu girdinin OKUNAN gövdesi spec öncesi koddan `tests/fixtures/0101-govde-once.json`'a yazıldı
// (`scripts/tests/0101-govde-fikstur.cjs`); yeni kodla birebir aynı olmalı (boş çap gövdede yok, `null` olarak da değil).
// Girdiye bilinçli olarak çaplı satır konmadı (Karar 32): eski kod alanı bilmez; çaplı satırlar roundtrip'te ayrı blokta.
const GOVDE_GIRDISI = {
  stock: [
    { id: 80, model: "AK100", serialNo: "K-80", addedDate: "2026-03-05", note: "Not", parcalar: [{ partId: "7", miktar: 2 }] },
    { id: 81, model: "AK120_DSC", serialNo: "", addedDate: "2026-04-01", note: "", parcalar: [], partiId: 902 },
    { id: 82, model: "AK100", serialNo: "K-82", addedDate: "2026-05-01", uretimTarihi: "2026-02-10", partiId: 901, uretimDurumu: "hazir" },
    { id: 83, model: "AK100", serialNo: "K-83", addedDate: "2026-06-01", deletedAt: "2026-10-01T10:00:00.000Z" },
    { id: 84, model: "AK100", serialNo: "", addedDate: "2026-07-01", uretimDurumu: "montaj" },
  ],
};
module.exports = { GOVDE_GIRDISI };
