// Spec 0158: dolu senaryo verisi (bilgi alanları, kalem adedi birden büyük, karışık boy ve kilo, işlem kalemleri, döviz). Kıyas verisi
// değildir; kıyas `0158-veri.js`'tedir (C9/4).
export const TEDARIKCILER = [
  { id: 21, ad: "İkizler Paslanmaz", hammadde: true }, { id: 22, ad: "Aksu CNC" }, { id: 23, ad: "Fason Kaplama" }, { id: 24, ad: "Kursuz Çelik", hammadde: true },
];
export const MALZEMELER = [
  { id: 601, ad: "Paslanmaz", ozgulAgirlik: 7.9, paraBirimi: "USD", kur: 40, kiloFiyati: 10, tedarikciId: 21 },
  { id: 602, ad: "Pirinç", ozgulAgirlik: 8.5, paraBirimi: "EUR", kur: 50, kiloFiyati: 8, tedarikciId: 21 },
  { id: 603, ad: "Fiyatsız çelik", ozgulAgirlik: 7.85, tedarikciId: 24 },
  { id: 604, ad: "Çubuk çelik", ozgulAgirlik: 7.85, kiloFiyati: 100, tedarikciId: 21 },
  { id: 605, ad: "Fiyatsız paslanmaz", ozgulAgirlik: 7.9, tedarikciId: 21 },
];
const mk = (o) => ({ tur: "malzeme", adet: 1, ...o });
const islem = (ad, tedarikciId, tutar) => ({ tur: "islem", ad, tedarikciId, tutar });
export const PARCALAR = [
  { id: 1, ad: "100_AYNA MAHRUTİ DİŞLİSİ TAKIM", kod: "AYN-100", olcu: "elle yazılmış eski ölçü", hammaddeAdi: "AISI 304", tedarikciId: 22,
    maliyetKalemleri: [mk({ malzemeId: 601, bicim: "mil", cap: 65, boy: 27, adet: 2 })] },
  { id: 2, ad: "Ara mil", maliyetKalemleri: [mk({ malzemeId: 601, bicim: "mil", cap: 30, boy: 100, adet: 3 })] },
  { id: 3, ad: "İki ölçülü", maliyetKalemleri: [mk({ malzemeId: 601, bicim: "mil", cap: 40, boy: 50, adet: 2 }), mk({ malzemeId: 601, bicim: "mil", cap: 40, boy: 80 })] },
  { id: 4, ad: "Cıvata M8", kod: "CV-8", olcu: "M8 × 40", hammaddeAdi: "Paslanmaz A2", cins: "DIN 933", tedarikciId: 22, maliyet: 2 },
  { id: 5, ad: "Rulman", tedarikciId: 22, maliyet: 50 },
  { id: 6, ad: "Pirinç burç", maliyetKalemleri: [mk({ malzemeId: 602, bicim: "mil", cap: 20, boy: 30 }), islem("Kaplama", 21, 100)] },
  { id: 7, ad: "Karışık", maliyetKalemleri: [mk({ malzemeId: 604, bicim: "mil", cap: 30, boy: 150, boydanSiparis: true, cubukBoyu: 1000 }), mk({ malzemeId: 604, bicim: "mil", cap: 50, boy: 60, adet: 2 })] },
  { id: 8, ad: "Fason parça", tedarikciId: 22, maliyetKalemleri: [islem("Galvaniz", 23, 40)] },
  { id: 9, ad: "Kursuz parça", maliyetKalemleri: [mk({ malzemeId: 603, bicim: "mil", cap: 20, boy: 50 }), islem("Taşlama", 24, 30)] },
  { id: 10, ad: "Eksikli", maliyetKalemleri: [mk({ malzemeId: 601, bicim: "mil", cap: 25 }), mk({ malzemeId: 601, bicim: "mil", cap: 25, boy: 40, adet: 2 })] },
  { id: 11, ad: "Tek ölçülü", maliyetKalemleri: [mk({ malzemeId: 601, bicim: "mil", cap: 22, boy: 33 })] },
  { id: 13, ad: "Boy çubuk", maliyetKalemleri: [mk({ malzemeId: 604, bicim: "mil", cap: 40, boy: 200, boydanSiparis: true, cubukBoyu: 1000 })] },
  { id: 14, ad: "Malzemesiz", tedarikciId: 22, maliyetKalemleri: [mk({ malzemeId: 999, bicim: "mil", cap: 20, boy: 40, adet: 2 })] },
];
export const FIYATSIZ_PARCA = { id: 12, ad: "Fiyatsız paslanmaz parça", maliyetKalemleri: [mk({ malzemeId: 605, bicim: "mil", cap: 20, boy: 40 })] };
export const kit = (parts) => [{ model: "AK", defaultParcalar: parts.map(p => ({ partId: String(p.id), miktar: 1 })) }];
export const veri = (o = {}) => {
  const parts = o.parts || PARCALAR;
  return { modeller: kit(parts), satirlar: [{ model: "AK", adet: "70" }], parts, partStock: [], malzemeler: MALZEMELER, tedarikciler: TEDARIKCILER, ...o };
};
export const BUGUN = "2026-11-23";
export const FACTORY = { name: "Altuntaş Makina", city: "Konya" };
