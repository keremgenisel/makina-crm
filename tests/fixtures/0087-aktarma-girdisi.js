// Spec 0087 (AC-29, AC-30): parça aktarmasının ortak girdisi. Spec öncesi koddan (aynen taşınmış çekirdek) üretilen çıktı
// `tests/fixtures/0087-aktarma-once.json`'dadır.
export const MEVCUT_PARCALAR = [
  { id: 7, ad: "Rulman", adEN: "Bearing", kod: "R-6204", tip: "Standart", tanim: "", tanimEN: "", fiyatTRY: 450, fiyatUSD: "", fiyatEUR: "", models: ["AK100_DS"], resim: "r.jpg", maliyet: 120.5 },
  { id: 8, ad: "Kayış", models: [], fiyatTRY: 90 },
  { id: 9, ad: "Silinen", deletedAt: "2026-10-01T10:00:00.000Z" },
];
// Eski dokuz sütunlu şablonla alınmış dosya (maliyet sütunu yok).
export const ESKI_SATIRLAR = [
  ["Yedek Parça Adı (TR)", "Adı (EN)", "Kod", "Tip", "Tanım (TR)", "Tanım (EN)", "Fiyat (TL)", "Fiyat (USD)", "Fiyat (EUR)"],
  ["Rulman", "", "R-6205", "", "", "", "", "", ""],
  ["Yeni Pul", "Washer", "P-1", "Standart", "", "", "15", "", ""],
  ["", "boş adlı satır"],
];
