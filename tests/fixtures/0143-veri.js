// Spec 0143 C3 (AC-6, AC-33): kıyas verisi. Boy YÖNTEMİ kullanmayan veri, ama 501 numaralı kartın boy fiyatı ve geldiği boyu DOLU
// (AC-6: o kartın kilo kalemi kaldırmadan önceki maliyetiyle birebir aynı kalmalı). Altın (`0143-once.json`) bu veriyle spec
// ÖNCESİ koddan `YAZ_0143=1` ile üretildi; veriyi değiştirmek altını geçersiz kılar. Sipariş ihtiyacı kıyasın dışındadır (C3).
export const MALZEMELER = [
  { id: 501, ad: "304 Çubuk", ozgulAgirlik: 7.9, paraBirimi: "USD", kur: 50, kiloFiyati: 3.2, boyFiyati: 2500, geldigiBoy: 6, fire: 8,
    bantlar: [{ alt: 0, fiyat: 2.85 }, { alt: 101, fiyat: 2.95 }], fireBantlari: [{ alt: 0, kg: 0 }, { alt: 36, kg: 0.3 }],
    fiyatGecmisi: [{ gecerli: "", kiloFiyati: 3, paraBirimi: "USD", kur: 45, bantlar: [], boyFiyati: 2000 }, { gecerli: "2026-06-01", kiloFiyati: 3.2, paraBirimi: "USD", kur: 50, bantlar: [{ alt: 0, fiyat: 2.85 }, { alt: 101, fiyat: 2.95 }], boyFiyati: 2500 }] },
  { id: 502, ad: "Delrin levha", ozgulAgirlik: 1.42, kiloFiyati: 190, fire: 10 },
  { id: 503, ad: "Boru 304", ozgulAgirlik: 8, paraBirimi: "USD", kur: 50, kiloFiyati: 4.08, geldigiBoy: 6 },
];
const mk = (o) => ({ tur: "malzeme", adet: 1, ...o });
export const PARCALAR = [
  { id: 1, ad: "Kalın mil", fiyatKipi: "maliyet", maliyetKalemleri: [mk({ malzemeId: 501, bicim: "mil", cap: 62, boy: 178 })] },
  { id: 2, ad: "İnce mil", maliyetKalemleri: [mk({ malzemeId: 501, bicim: "mil", cap: 16, boy: 235, adet: 3 })] },
  { id: 3, ad: "Yatak", fiyatKipi: "maliyet", maliyetKalemleri: [mk({ malzemeId: 501, bicim: "mil", cap: 144, boy: 78, fire: 2 })] },
  { id: 4, ad: "Boru", maliyetKalemleri: [mk({ malzemeId: 503, bicim: "boru", cap: 19, et: 1.5, boy: 173 })] },
  { id: 5, ad: "Lama", maliyetKalemleri: [mk({ malzemeId: 501, bicim: "lama", kalinlik: 10, genislik: 20, boy: 125, adet: 2 })] },
  { id: 6, ad: "Levha", fiyatKipi: "maliyet", maliyetKalemleri: [mk({ malzemeId: 502, bicim: "sac", kalinlik: 30, en: 60, boy: 130 })] },
  { id: 7, ad: "Karma", maliyetKalemleri: [mk({ malzemeId: 501, bicim: "mil", cap: 50, boy: 138 }), { tur: "islem", ad: "Torna", tutar: 40 }] },
  { id: 8, ad: "Elle", maliyet: 15 },
  { id: 9, ad: "Eski satırlı", malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 40, boy: 90 } },
  { id: 10, ad: "Bağlantı seti", setIcerigi: [{ partId: 5, miktar: 1 }, { partId: 8, miktar: 2 }] },
];
export const MODELLER = {
  standardModels: [{ model: "AK100_DS", defaultParcalar: PARCALAR.map(p => ({ partId: String(p.id), miktar: p.id === 2 ? 2 : 1 })), karKatsayisi: 2.77 }],
  customModels: [],
};
export const TARIHLER = [undefined, "2026-01-01", "2026-07-01"];
export const FIYAT_AYARLARI = { varsayilanKat: 2.77 };
