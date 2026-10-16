// Spec 0088 (AC-44, C8): rolü verilmemiş tür, katsayısız model ve planlanan adedi olmayan partinin OKUNAN gövdesi spec öncesi
// koddan `tests/fixtures/0088-govde-once.json`'a yazıldı (`scripts/tests/0088-govde-fikstur.cjs`); yeni kodla birebir aynı olmalı.
const GOVDE_GIRDISI = {
  giderTurleri: [{ id: 1, ad: "Genel", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }],
  standardModels: [{ model: "AK100_DS", sogutma: "Soğutmalı", kapasite: "100", kalip: "", tanim: "", tanimEN: "", urunAdi: "", urunAdiEN: "", defaultParcalar: [], defaultBantlar: [], resim: null }],
  customModels: [{ model: "OZEL_1", sogutma: "Soğutmasız", kapasite: "50", kalip: "", tanim: "", tanimEN: "", urunAdi: "", urunAdiEN: "", defaultParcalar: [], defaultBantlar: [], resim: null }],
  uretimPartileri: [{ id: 801, ad: "Parti 1", baslangicAy: "2026-05", bitisAy: null, aciklama: "", kapanmaZamani: null, kapanisOrtaklari: null }],
  appSettings: { kdvRates: [{ baslangic: "2000-01-01", oran: 20 }] },
};
module.exports = { GOVDE_GIRDISI };
