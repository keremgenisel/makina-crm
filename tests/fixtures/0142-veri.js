// Spec 0142 C6 (AC-32, AC-33): kıyas verisi. `0141-veri.js`'in kopyası; malzemelere tedarikçi, parçaların bir kısmına Ana
// tedarikçi eklendi (B-R1/2 ve B-R2/2'nin iki hâli), ayrıca iki firmalı, aynı ölçülü, aynı kesitli farklı boylu, boyu eksik,
// malzemesi çöpte ve malzemesi bulunamayan parçalar. Altın (`0142-once.json`) bu veriyle spec ÖNCESİ koddan `YAZ_0142=1` ile
// üretildi; veriyi değiştirmek altını geçersiz kılar.
import * as V141 from "./0141-veri.js";

export const TEDARIKCILER = [
  { id: 11, ad: "Alfa Çelik", hammadde: true }, { id: 12, ad: "Beta Plastik", hammadde: true },
  { id: 13, ad: "Gama Boru", hammadde: true }, { id: 14, ad: "Delta Hırdavat" },
];
const TED = { 501: 11, 502: 12, 503: 13, 504: 13 };
export const MALZEMELER = [
  ...V141.MALZEMELER.map(m => ({ ...m, tedarikciId: TED[m.id] })),
  { id: 505, ad: "Çöpteki çelik", ozgulAgirlik: 7.85, kiloFiyati: 40, tedarikciId: 11, deletedAt: "2026-11-01T00:00:00.000Z" },
];
const mk = (o) => ({ tur: "malzeme", yontem: "kilo", adet: 1, ...o });
const ANA = { 1: 12, 9: 14, 4: 13 }; // 1: malzemesi Alfa, kendisi Beta (AC-34); 9: hazır (AC-37); 4: aynı firma
export const PARCALAR = [
  ...V141.PARCALAR.map(p => (ANA[p.id] ? { ...p, tedarikciId: ANA[p.id] } : p)),
  { id: 11, ad: "Çift malzemeli", maliyetKalemleri: [mk({ malzemeId: 501, bicim: "mil", cap: 40, boy: 90 }), mk({ malzemeId: 502, bicim: "sac", kalinlik: 10, en: 100, boy: 200 })] },
  { id: 12, ad: "Aynı ölçülü", maliyetKalemleri: [mk({ malzemeId: 501, bicim: "mil", cap: 25.5, boy: 60 }), mk({ malzemeId: 501, bicim: "mil", cap: 25.5, boy: 60 })] },
  { id: 13, ad: "Aynı kesit farklı boy", maliyetKalemleri: [mk({ malzemeId: 501, bicim: "mil", cap: 62, boy: 50 }), mk({ malzemeId: 501, bicim: "mil", cap: 62, boy: 75 })] },
  { id: 14, ad: "Boyu eksik", maliyetKalemleri: [mk({ malzemeId: 501, bicim: "mil", cap: 30 })] },
  { id: 15, ad: "Çöpteki malzemeli", tedarikciId: 14, maliyetKalemleri: [mk({ malzemeId: 505, bicim: "mil", cap: 20, boy: 40 })] },
  { id: 16, ad: "Malzemesi yok", maliyetKalemleri: [mk({ malzemeId: 999, bicim: "mil", cap: 20, boy: 40 })] },
];
export const MODELLER = {
  standardModels: [{ model: "AK100_DS", karKatsayisi: 2.77,
    defaultParcalar: PARCALAR.map(p => ({ partId: String(p.id), miktar: p.id === 2 ? 2 : 1 })) }],
  customModels: [],
};
export const veri = (o = {}) => ({ modeller: MODELLER.standardModels, satirlar: [{ model: "AK100_DS", adet: "70" }], parts: PARCALAR, partStock: [],
  malzemeler: MALZEMELER, tedarikciler: TEDARIKCILER, ...o });
export const SENARYOLAR = () => ({
  temel: [veri(), undefined],
  odakli: [veri(), { tedarikciOdakli: true }],
  stoklu: [veri({ partStock: [{ id: 1, partId: 1, miktar: 500 }, { id: 2, partId: 9, miktar: 30 }] }), { tedarikciOdakli: true }],
  duzenleme: [veri(), { tedarikciOdakli: true, duzenleme: { parca: { 2: { adet: "100" }, 12: { kapali: true }, 9: { adet: "x" } }, kesit: {} } }],
  secim: [veri(), { tedarikciOdakli: true, secilenTedarikciler: ["11"] }],
});
