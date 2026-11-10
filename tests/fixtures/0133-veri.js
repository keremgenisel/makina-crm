// Spec 0133 ortak veri: elle sabit (kipsiz) parçalar, set, malzeme satırlı parça ve kuruşlu Excel fiyatı. Kıyas altını bu veriyle
// spec öncesi koddan üretildi (tests/fixtures/0133-once.json).
export const P304 = { id: 501, ad: "304 Paslanmaz", ozgulAgirlik: 7.9, kiloFiyati: 2.95, paraBirimi: "USD", kur: 50, geldigiBoy: 6, fire: 8 };
export const PARCALAR = [
  { id: 61, ad: "Rulman", kod: "R-61", tip: "Standart", models: [], fiyatTRY: 450, fiyatUSD: 12, maliyet: 100 },
  { id: 62, ad: "Kayış", kod: "K-62", tip: "Standart", models: [], fiyatTRY: "1250", fiyatEUR: 30 },
  { id: 63, ad: "Pim", kod: "P-63", tip: "Standart", models: [] },
  { id: 64, ad: "Bağlantı seti", kod: "S-64", tip: "Standart", models: [], fiyatTRY: 1000, setIcerigi: [{ partId: 61, miktar: 2 }, { partId: 62, miktar: 1 }] },
  { id: 65, ad: "Kesme mili", kod: "M-65", tip: "Standart", models: [], fiyatTRY: 4500, malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 144, boy: 83, fire: 8 } },
  { id: 66, ad: "Excel pulu", kod: "E-66", tip: "Standart", models: [], fiyatTRY: 99.5, maliyet: 40 },
];
export const MALZEMELER = [P304];
