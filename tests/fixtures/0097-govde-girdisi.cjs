// Spec 0097 (AC-33, plan adım 0): maliyet geçmişi olmayan parçaların girdisi (elle maliyetli, maliyetsiz, kırılımlı, çöpte).
// Bu girdinin OKUNAN gövdesi spec öncesi koddan `tests/fixtures/0097-govde-once.json`'a yazıldı
// (`scripts/tests/0097-govde-fikstur.cjs`); yeni kodla birebir aynı olmalı (boş geçmiş gövdede yok).
const GOVDE_GIRDISI = {
  parts: [
    { id: 7, ad: "Rulman", adEN: "Bearing", kod: "R-6204", tanim: "", tanimEN: "", fiyatTRY: "450", fiyatUSD: "", fiyatEUR: "", models: ["AK100_DS"], tip: "Standart", resim: "", maliyet: 120.5 },
    { id: 8, ad: "Maliyetsiz parça", models: [] },
    { id: 9, ad: "Silinen parça", models: [], maliyet: 3, deletedAt: "2026-10-01T10:00:00.000Z" },
    { id: 10, ad: "Ayna", models: [], hammaddeler: [{ tedarikciId: 31, tutar: 170 }, { tedarikciId: 32, tutar: null }] },
  ],
};
module.exports = { GOVDE_GIRDISI };
