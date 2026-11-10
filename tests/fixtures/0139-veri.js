// Spec 0139 kıyas verisi (C1, AC-1, AC-18, AC-50). Altın (tests/fixtures/0139-once.json) bu veriyle spec ÖNCESİ koddan üretildi;
// veriyi değiştirmek altını geçersiz kılar. Malzemelerin hiçbirinde kilogram fire tablosu (`fireBantlari`) yok. TABLOLU_MALZEMELER
// aynı kartların tablolu hâlidir: AC-50 boy adedi hesaplanan kesitin sipariş kilosunu ikisi arasında karşılaştırır.
export const MALZEMELER = [
  { id: 501, ad: "304 Çubuk", ozgulAgirlik: 7.9, paraBirimi: "USD", kur: 50, kiloFiyati: 3.2, geldigiBoy: 6, fire: 8, asgariSiparis: 20,
    bantlar: [{ alt: 0, fiyat: 2.85 }, { alt: 101, fiyat: 2.95 }, { alt: 151, fiyat: 3.4 }] },
  { id: 502, ad: "Delrin levha", ozgulAgirlik: 1.42, kiloFiyati: 190, fire: 10 },
  { id: 503, ad: "Boru 304", ozgulAgirlik: 8, paraBirimi: "USD", kur: 50, kiloFiyati: 4.08, geldigiBoy: 6 },
  { id: 504, ad: "Boy fiyatlı", boyFiyati: 1600, geldigiBoy: 6, fire: 5 },
];
export const TABLO = [{ alt: 0, kg: 0 }, { alt: 21, kg: 0.05 }, { alt: 36, kg: 0.3 }, { alt: 91, kg: 0.35 }, { alt: 101, kg: 1 }, { alt: 141, kg: 1.75 }];
export const TABLOLU_MALZEMELER = MALZEMELER.map(m => (m.id === 504 ? m : { ...m, fireBantlari: TABLO }));
const mk = (o) => ({ tur: "malzeme", yontem: "kilo", adet: 1, ...o });
export const PARCALAR = [
  { id: 1, ad: "Kalın mil", fiyatKipi: "maliyet", maliyetKalemleri: [mk({ malzemeId: 501, bicim: "mil", cap: 62, boy: 178 })] },
  { id: 2, ad: "İnce mil", maliyetKalemleri: [mk({ malzemeId: 501, bicim: "mil", cap: 16, boy: 235, adet: 3 })] },
  { id: 3, ad: "Yatak", fiyatKipi: "maliyet", maliyetKalemleri: [mk({ malzemeId: 501, bicim: "mil", cap: 144, boy: 78, fire: 2 })] },
  { id: 4, ad: "Boru", maliyetKalemleri: [mk({ malzemeId: 503, bicim: "boru", cap: 19, et: 1.5, boy: 173 })] },
  { id: 5, ad: "Lama", maliyetKalemleri: [mk({ malzemeId: 501, bicim: "lama", kalinlik: 10, genislik: 20, boy: 125, adet: 2 })] },
  { id: 6, ad: "Levha", fiyatKipi: "maliyet", maliyetKalemleri: [mk({ malzemeId: 502, bicim: "sac", kalinlik: 30, en: 60, boy: 130 })] },
  { id: 7, ad: "Boy mil", maliyetKalemleri: [mk({ malzemeId: 504, bicim: "mil", yontem: "boy", cap: 30, boy: 400 })] },
  { id: 8, ad: "Karma", maliyetKalemleri: [mk({ malzemeId: 501, bicim: "mil", cap: 50, boy: 138 }), { tur: "islem", ad: "Torna", tutar: 40 }] },
  { id: 9, ad: "Elle", maliyet: 15 },
];
export const MODELLER = {
  standardModels: [{ model: "AK100_DS", defaultParcalar: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => ({ partId: String(i), miktar: i === 2 ? 2 : 1 })), karKatsayisi: 2.77 }],
  customModels: [],
};
export const TARIHLER = [undefined, "2026-01-01"];
export const FIYAT_AYARLARI = { karKati: 2.77 };
