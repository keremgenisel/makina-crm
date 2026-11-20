// Spec 0150: sipariş listesinde işlem kalemleri. Küçük, kendi başına bir katalog: üç fason firma (biri yalnız işlemde, biri
// çöpte), bir hammadde tedarikçisi, bir hazır parça tedarikçisi; her sınır durumu için bir parça.
const mk = (o) => ({ tur: "malzeme", adet: 1, ...o });
const is = (ad, tedarikciId, tutar) => ({ tur: "islem", ad, ...(tedarikciId != null ? { tedarikciId } : {}), tutar });

export const TEDARIKCILER = [
  { id: 21, ad: "Alfa Çelik", hammadde: true },
  { id: 22, ad: "Kaplamacı" }, // R5/2, AC-25: hammadde işaretsiz, kimsenin Ana tedarikçisi değil; yalnız işlem kaleminde
  { id: 23, ad: "Isıl İşlem" },
  { id: 24, ad: "Çöpteki Fason", deletedAt: "2026-11-01T00:00:00.000Z" },
  { id: 25, ad: "Hazırcı" },
  { id: 26, ad: "Yalnız setin işlemcisi" }, // P4: seçiciye girmez
  { id: 27, ad: "Yalnız çöpteki parçanın işlemcisi" }, // P4: seçiciye girmez
];
export const MALZEMELER = [{ id: 601, ad: "Çelik", ozgulAgirlik: 7.85, kiloFiyati: 40, tedarikciId: 21, asgariSiparis: 1000 }];

export const PARCALAR = [
  // AC-12, AC-32: Ana tedarikçisiz malzemeli parça; iki işlem kalemi, biri tutarsız (AC-6).
  { id: 1, ad: "Mil A", maliyetKalemleri: [mk({ malzemeId: 601, bicim: "mil", cap: 30, boy: 100 }), is("Kaplama", 22, 15), is("Taşlama", 22, "")] },
  // AC-37: kendi hammadde tedarikçisine de bir işlem (aynı bölümde grup tablosu + işlemler + fark notu).
  { id: 2, ad: "Mil B", tedarikciId: 21, maliyetKalemleri: [mk({ malzemeId: 601, bicim: "mil", cap: 30, boy: 120 }), is("Kaplama", 22, 10), is("Tavlama", 21, 1)] },
  // AC-14: Ana tedarikçi Hazırcı, işlem Isıl İşlem'de.
  { id: 3, ad: "Hazır C", tedarikciId: 25, maliyetKalemleri: [is("Isıl işlem", 23, 7)] },
  // AC-15, AC-16: tedarikçisiz işlem.
  { id: 4, ad: "Tedarikçisiz işlemli", tedarikciId: 25, maliyetKalemleri: [is("Torna", null, 3)] },
  // AC-9: stokta yeten parçanın işlemi düşer.
  { id: 5, ad: "Stokta yeten", tedarikciId: 25, maliyetKalemleri: [is("Kaplama", 22, 1)] },
  // AC-33: spec 0138'in eski katalog kalemi.
  { id: 6, ad: "Eski katalog", tedarikciId: 25, maliyet: 5, maliyetKalemleri: [{ tur: "islem", islemId: 5, tedarikciId: 22 }] },
  // AC-27: eski `hammaddeler` kırılımından türeyen "Hammadde alımı".
  { id: 7, ad: "Kırılımlı", tedarikciId: 25, hammaddeler: [{ tedarikciId: 23, tutar: 2 }] },
  // AC-32 / R3/5 (P1): patlatılmayan set (içeriği listede yok) ve patlatılan set; ikisinin de işlemi okunmaz.
  { id: 8, ad: "Patlatılmayan set", tedarikciId: 25, setIcerigi: [{ partId: 999, miktar: 1 }], maliyetKalemleri: [is("Kaplama", 26, 9)] },
  { id: 9, ad: "Patlatılan set", tedarikciId: 25, setIcerigi: [{ partId: 3, miktar: 1 }], maliyetKalemleri: [is("Kaplama", 26, 9)] },
  // AC-32: çöpteki parça.
  { id: 10, ad: "Çöpteki parça", deletedAt: "2026-11-01T00:00:00.000Z", maliyetKalemleri: [is("Kaplama", 27, 1)] },
  // AC-31: boydan sipariş edilen parça.
  { id: 11, ad: "Boydan", tedarikciId: 21, maliyetKalemleri: [mk({ malzemeId: 601, bicim: "mil", cap: 40, boy: 100, boydanSiparis: true, cubukBoyu: 3000 }), is("Kaplama", 22, 2)] },
  // AC-40: kaçışlanacak işlem adı.
  { id: 12, ad: "Özel", tedarikciId: 25, maliyetKalemleri: [is("Nikel <kaplama> & cila", 22, 4)] },
  // Çöpteki fason firma: pencerede silinmiş kartı, belgede basılmaz.
  { id: 13, ad: "Fasonu çöpte", tedarikciId: 25, maliyetKalemleri: [is("Krom", 24, 1)] },
];
export const MODELLER = [{ model: "AK100", defaultParcalar: PARCALAR.map(p => ({ partId: String(p.id), miktar: 1, ad: p.ad })) }];
export const STOK = [{ id: 1, partId: "5", miktar: 100 }];
export const veri = (o = {}) => ({ modeller: MODELLER, satirlar: [{ model: "AK100", adet: "10" }], parts: PARCALAR.filter(p => !p.deletedAt),
  hamParts: PARCALAR, partStock: STOK, malzemeler: MALZEMELER, tedarikciler: TEDARIKCILER.filter(t => !t.deletedAt), hamTedarikciler: TEDARIKCILER, ...o });
// AC-8: aynı katalog, işlem kalemleri olmadan.
export const islemsiz = (parts) => parts.map(p => {
  if (!Array.isArray(p.maliyetKalemleri)) { const { hammaddeler: _h, ...r } = p; return r; }
  return { ...p, maliyetKalemleri: p.maliyetKalemleri.filter(k => k.tur !== "islem") };
});
