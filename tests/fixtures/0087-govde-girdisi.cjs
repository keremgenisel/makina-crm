// Spec 0087 (AC-4, AC-25): maliyetsiz parça ve ek kalemsiz model (iki bölümde). Bu girdinin okunan gövdesi spec öncesi
// koddan `tests/fixtures/0087-govde-once.json`'a yazıldı (`scripts/tests/0087-govde-fikstur.cjs`); yeni kodla birebir aynı olmalı.
const GOVDE_GIRDISI = {
  parts: [
    { id: 7, ad: "Rulman", adEN: "Bearing", kod: "R-6204", tanim: "", tanimEN: "", fiyatTRY: "450", fiyatUSD: "", fiyatEUR: "", models: ["AK100_DS"], tip: "Standart", resim: "" },
    { id: 8, ad: "Silinen parça", models: [], deletedAt: "2026-10-01T10:00:00.000Z" },
  ],
  standardModels: [
    { model: "AK100_DS", sogutma: "Soğutmalı", kapasite: "100", kalip: "14 cm", tanim: "", tanimEN: "", urunAdi: "", urunAdiEN: "", defaultParcalar: [{ partId: "7", ad: "Rulman", miktar: 2 }], defaultBantlar: [], resim: null },
  ],
  customModels: [
    { model: "OZEL_1", sogutma: "Soğutmasız", kapasite: "50", kalip: "", tanim: "", tanimEN: "", urunAdi: "", urunAdiEN: "", defaultParcalar: [], defaultBantlar: [], resim: null },
  ],
};
module.exports = { GOVDE_GIRDISI };
