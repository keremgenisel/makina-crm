// Spec 0096 (AC-28, plan adım 0): hammadde işareti olmayan tedarikçilerin ve kırılımı olmayan parçaların girdisi. Bu
// girdinin OKUNAN gövdesi spec öncesi koddan `tests/fixtures/0096-govde-once.json`'a yazıldı
// (`scripts/tests/0096-govde-fikstur.cjs`); yeni kodla birebir aynı olmalı (kapalı işaret ve boş kırılım gövdede yok).
const GOVDE_GIRDISI = {
  tedarikciler: [
    { id: 31, ad: "Demir Çelik A.Ş.", yetkili: "Ali", telefon: "0212", eposta: "", vergiDairesi: "Kartal", vergiNo: "123", adres: "", not: "Sac" },
    { id: 32, ad: "Eski Tedarikçi", deletedAt: "2026-10-01T10:00:00.000Z" },
  ],
  parts: [
    { id: 7, ad: "Rulman", adEN: "Bearing", kod: "R-6204", tanim: "", tanimEN: "", fiyatTRY: "450", fiyatUSD: "", fiyatEUR: "", models: ["AK100_DS"], tip: "Standart", resim: "", maliyet: 120.5 },
    { id: 8, ad: "Maliyetsiz parça", models: [] },
    { id: 9, ad: "Silinen parça", models: [], deletedAt: "2026-10-01T10:00:00.000Z" },
  ],
};
module.exports = { GOVDE_GIRDISI };
