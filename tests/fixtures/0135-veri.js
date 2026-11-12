// Spec 0135 C8 ortak veri: kalem alanı (`maliyetKalemleri`) OLMAYAN eski biçimli parçalar. Kıyas altını bu veriyle spec öncesi
// koddan üretildi (tests/fixtures/0135-once.json, `YAZ_0135=1`). Dört eski biçim: yalnız malzeme satırı, yalnız hammadde
// kırılımı (tutarlı ve tutarsız satırla), ikisi birden (Karar 31: malzeme satırı kırılımı bastırır), yalnız elle maliyet;
// ayrıca set, maliyet geçmişli kırılım ve maliyete bağlı fiyat kipi.
export const M304 = { id: 501, ad: "304 Paslanmaz", ozgulAgirlik: 7.9, kiloFiyati: 2.95, paraBirimi: "USD", kur: 50, fire: 8, // spec 0143 C2/3 hazırlık: geldiği boy kalktı
  fiyatGecmisi: [{ gecerli: "", kiloFiyati: 2.5, paraBirimi: "USD", kur: 40 }, { gecerli: "2026-03-01", kiloFiyati: 2.95, paraBirimi: "USD", kur: 50 }] };
export const MSAC = { id: 502, ad: "DKP Sac", ozgulAgirlik: 7.85, kiloFiyati: 38, paraBirimi: "TRY" };
export const MALZEMELER = [M304, MSAC];
export const TEDARIKCILER = [{ id: 801, ad: "Hammadde A.Ş.", hammadde: true }, { id: 802, ad: "Lazer Ltd." }];
export const PARCALAR = [
  { id: 71, ad: "Kesme mili", kod: "M-71", models: [], fiyatTRY: 4500, malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 144, boy: 83, fire: 8 } },
  { id: 72, ad: "Kapak", kod: "K-72", models: [], fiyatTRY: 900, maliyet: 333, hammaddeler: [{ tedarikciId: 801, tutar: 120.5 }, { tedarikciId: 802, tutar: 80 }, { tedarikciId: 801, tutar: null }],
    maliyetGecmisi: [{ gecerli: "", kurus: 15000 }, { gecerli: "2026-05-01", kurus: 20050 }] },
  { id: 73, ad: "Flanş", kod: "F-73", models: [], fiyatTRY: 700, maliyet: 50, malzemeSatiri: { malzemeId: 502, bicim: "sac", kalinlik: 3, en: 200, boy: 300, fire: 5 }, hammaddeler: [{ tedarikciId: 802, tutar: 45 }] },
  { id: 74, ad: "Rulman", kod: "R-74", models: [], fiyatTRY: 450, maliyet: 100, maliyetGecmisi: [{ gecerli: "", kurus: 8000 }, { gecerli: "2026-04-01", kurus: 10000 }] },
  { id: 75, ad: "Tutarsız kırılım", kod: "T-75", models: [], maliyet: 60, hammaddeler: [{ tedarikciId: 802, tutar: null }] },
  { id: 76, ad: "Bağlantı seti", kod: "S-76", models: [], fiyatTRY: 1000, setIcerigi: [{ partId: 71, miktar: 1 }, { partId: 74, miktar: 2 }] },
  { id: 77, ad: "Maliyete bağlı mil", kod: "B-77", models: [], fiyatTRY: 100, fiyatKipi: "maliyet", karKati: 2.5, malzemeSatiri: { malzemeId: 501, bicim: "boru", cap: 60, et: 5, boy: 400 } }, // spec 0143 C2/3 hazırlık: boy yöntemi kiloya çevrildi
  { id: 78, ad: "Boş parça", kod: "B-78", models: [] },
];
export const MODELLER = { standardModels: [{ model: "AK100", defaultParcalar: [{ partId: 71, miktar: 2 }, { partId: 72, miktar: 1 }, { partId: 73, miktar: 3 }, { partId: 74, miktar: 4 }, { partId: 76, miktar: 1 }, { partId: 77, miktar: 1 }] }], customModels: [] };
export const PART_STOCK = [{ id: 1, partId: 71, miktar: 3 }, { id: 2, partId: 73, miktar: 10 }];
export const FIYAT_AYARLARI = { varsayilanKat: 2 };
