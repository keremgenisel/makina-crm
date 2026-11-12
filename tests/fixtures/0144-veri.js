// Spec 0144 C4 (AC-42): kıyas ve senaryo verisi. `0142-veri.js` üstüne paylaşılan kilo kesidi (asgarili ve asgarisiz), paylaşılan
// ve tek parçalı boy kesidi, kursuz döviz, fiyatsız, tanınmayan para birimi, iki para birimli parça, tedarikçisiz malzeme, bandı
// fiyatsız çaplı malzeme ve maliyetsiz hazır parça eklendi. Altın (`0144-belge-once.json`) bu veriyle spec ÖNCESİ koddan
// `YAZ_0144=1` ile üretildi; veriyi değiştirmek altını geçersiz kılar.
import * as V142 from "./0142-veri.js";

export const TEDARIKCILER = V142.TEDARIKCILER;
export const MALZEMELER = [
  ...V142.MALZEMELER,
  { id: 506, ad: "Kursuz EUR çelik", ozgulAgirlik: 7.85, paraBirimi: "EUR", kiloFiyati: 5, tedarikciId: 11 },
  { id: 507, ad: "Fiyatsız alüminyum", ozgulAgirlik: 2.7, tedarikciId: 11 },
  { id: 508, ad: "GBP çelik", ozgulAgirlik: 7.85, paraBirimi: "GBP", kur: 60, kiloFiyati: 10, tedarikciId: 12 },
  { id: 509, ad: "EUR pirinç", ozgulAgirlik: 8.5, paraBirimi: "EUR", kur: 55, kiloFiyati: 6, asgariSiparis: 50, tedarikciId: 11 },
  { id: 510, ad: "Tedarikçisiz bronz", ozgulAgirlik: 8.8, kiloFiyati: 300 },
  { id: 511, ad: "Bantlı fiyatsız", ozgulAgirlik: 7.9, paraBirimi: "USD", kur: 50, kiloFiyati: 3.5, tedarikciId: 13,
    bantlar: [{ alt: 0, fiyat: null }, { alt: 50, fiyat: 4 }] },
];
const mk = (o) => ({ tur: "malzeme", adet: 1, ...o });
const boy = (o) => mk({ boydanSiparis: true, ...o });
export const PARCALAR = [
  ...V142.PARCALAR,
  { id: 21, ad: "İnce pul", maliyetKalemleri: [mk({ malzemeId: 501, bicim: "mil", cap: 16, boy: 12 })] },
  { id: 22, ad: "Pirinç burç", maliyetKalemleri: [mk({ malzemeId: 509, bicim: "mil", cap: 10, boy: 20 })] },
  { id: 23, ad: "Pirinç pim", maliyetKalemleri: [mk({ malzemeId: 509, bicim: "mil", cap: 10, boy: 30 })] },
  { id: 24, ad: "Uzun çubuk", maliyetKalemleri: [boy({ malzemeId: 504, bicim: "mil", cap: 30, boy: 150, cubukBoyu: 400 })] },
  { id: 25, ad: "Kısa çubuk", maliyetKalemleri: [boy({ malzemeId: 504, bicim: "mil", cap: 30, boy: 100, cubukBoyu: 400 })] },
  { id: 26, ad: "Tek çubuk", maliyetKalemleri: [boy({ malzemeId: 504, bicim: "mil", cap: 40, boy: 300, cubukBoyu: 1000 })] },
  { id: 27, ad: "Kursuz parça", maliyetKalemleri: [mk({ malzemeId: 506, bicim: "mil", cap: 20, boy: 50 })] },
  { id: 28, ad: "Fiyatsız parça", maliyetKalemleri: [mk({ malzemeId: 507, bicim: "mil", cap: 20, boy: 50 })] },
  { id: 29, ad: "GBP parça", maliyetKalemleri: [mk({ malzemeId: 508, bicim: "mil", cap: 20, boy: 50 })] },
  { id: 30, ad: "İki paralı", maliyetKalemleri: [mk({ malzemeId: 501, bicim: "mil", cap: 22, boy: 40 }), mk({ malzemeId: 509, bicim: "mil", cap: 22, boy: 40 })] },
  { id: 31, ad: "Bronz burç", tedarikciId: 14, maliyetKalemleri: [mk({ malzemeId: 510, bicim: "mil", cap: 25, boy: 60 })] },
  { id: 32, ad: "Bantlı parça", maliyetKalemleri: [mk({ malzemeId: 511, bicim: "mil", cap: 20, boy: 40 })] },
  { id: 33, ad: "Maliyetsiz hazır", tedarikciId: 14 },
];
export const MODELLER = {
  standardModels: [{ model: "AK100_DS", karKatsayisi: 2.77,
    defaultParcalar: PARCALAR.map(p => ({ partId: String(p.id), miktar: p.id === 2 ? 2 : 1 })) }],
  customModels: [],
};
export const veri = (o = {}) => ({ modeller: MODELLER.standardModels, satirlar: [{ model: "AK100_DS", adet: "70" }], parts: PARCALAR, partStock: [],
  malzemeler: MALZEMELER, tedarikciler: TEDARIKCILER, ...o });
export const FACTORY = { name: "Altuntaş Makina", city: "Konya", country: "Türkiye" };
export const BUGUN = "2026-11-12";
// Kesit anahtarları (spec 0143 biçimi).
export const K = {
  ince: "501|kilo||mil|16", kalin: "501|kilo||mil|62", yatak: "501|kilo||mil|144", pirinc: "509|kilo||mil|10",
  cubuk30: "504|boy|400|mil|30", cubuk40: "504|boy|1000|mil|40", sac: "502|kilo||sac|10|100",
};
export const SENARYOLAR = () => ({
  odakli: [veri(), { tedarikciOdakli: true }, {}],
  parti: [veri(), { tedarikciOdakli: true }, { partiAd: "Parti 7" }],
  duzenleme: [veri(), { tedarikciOdakli: true, duzenleme: { parca: { 2: { adet: "100" }, 12: { kapali: true } },
    kesit: { [K.ince]: { deger: "50" }, [K.yatak]: { deger: "100" }, [K.sac]: { kapali: true } } } }, {}],
  secim: [veri(), { tedarikciOdakli: true, secilenTedarikciler: ["11", "14"] }, {}],
});
