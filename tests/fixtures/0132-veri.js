// Spec 0132: kıyas ve test verisi. Altın (tests/fixtures/0132-once.json) bu veriyle spec ÖNCESİ koddan üretildi (C8, AC-56,
// AC-57); veriyi değiştirmek altını geçersiz kılar. Hiçbir parçada malzeme satırı yok; malzeme listesi doludur ki "liste verilse de
// malzemesiz parçanın rakamı aynı" ölçülsün.
export const MALZEMELER = [
  { id: 501, ad: "304 Paslanmaz", alasim: "AISI 304", ozgulAgirlik: 7.9, kiloFiyati: 2.95, paraBirimi: "USD", kur: 50 },
  { id: 502, ad: "8620", ozgulAgirlik: 7.85, kiloFiyati: 95, paraBirimi: "TRY" },
];
export const PARCALAR = [
  { id: 1, ad: "Rulman", kod: "R1", tip: "Standart", fiyatTRY: "450", maliyet: 120.5 },
  { id: 2, ad: "Hediye vida", maliyet: 0 },
  { id: 3, ad: "Pul", maliyet: 7.5, maliyetGecmisi: [{ gecerli: "", kurus: 500 }, { gecerli: "2026-06-01", kurus: 750 }] },
  { id: 4, ad: "Maliyetsiz" },
  { id: 5, ad: "Kırılımlı mil", hammaddeler: [{ tedarikciId: 11, tutar: 300 }, { tedarikciId: 12, tutar: 45.25 }], maliyet: 999 },
  { id: 6, ad: "Kırılımı boş", hammaddeler: [{ tedarikciId: 11, tutar: null }], maliyet: 12 },
  { id: 7, ad: "Çöpte", maliyet: 99, deletedAt: "2026-10-01T10:00:00.000Z" },
  { id: 8, ad: "Set", fiyatTRY: "900", setIcerigi: [{ partId: 1, miktar: 2 }, { partId: 5, miktar: 1 }] },
  { id: 9, ad: "Eksik set", setIcerigi: [{ partId: 4, miktar: 1 }] },
];
export const MODELLER = {
  standardModels: [{ model: "AK100", defaultParcalar: [{ partId: "1", miktar: 2 }, { partId: "3", miktar: 3 }, { partId: "5", miktar: 1 }, { partId: "8", miktar: 1 }],
    ekMaliyetler: [{ ad: "Büküm", tutar: 90 }], karKatsayisi: 1.4 }],
  customModels: [{ model: "OZEL", defaultParcalar: [{ partId: "4", miktar: 1 }, { partId: "9", miktar: 2 }, { partId: "99", miktar: 1 }] }],
};
export const TARIHLER = [undefined, "2026-03-01", "2026-07-01", ""];
