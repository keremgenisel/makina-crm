// Spec 0161: sipariş listesinde cins blokları. 0158'in dolu verisinden türer (tedarikçiler, malzemeler, kalem şekli) ve cinsi farklı
// yazılmış hazır parçalar ("Rulman", "RULMAN", boşluklu " rulman ", "Rulmanlar", "Keçe", "Vida"), cinsi boş hazır parçalar, aynı kesitte
// farklı cinsli iki malzemeli parça ve cinsi boş malzemeli parça ekler. Hepsinin Ana tedarikçisi 22 (pencerede aynı bölüm).
import { TEDARIKCILER, MALZEMELER } from "./0158-dolu.js";
export { TEDARIKCILER, MALZEMELER };
const mk = (o) => ({ tur: "malzeme", adet: 1, ...o });
export const PARCALAR = [
  { id: 101, ad: "Pim", tedarikciId: 22, maliyet: 1 },
  { id: 102, ad: "Keçe 40", cins: "Keçe", tedarikciId: 22, maliyet: 3 },
  { id: 103, ad: "Rulman 6204", cins: "Rulman", tedarikciId: 22, maliyet: 50 },
  { id: 104, ad: "Ayar vidası", cins: "Vida", tedarikciId: 22, maliyet: 2 },
  { id: 105, ad: "Rulman 6205", cins: "RULMAN", tedarikciId: 22, maliyet: 55 },
  { id: 106, ad: "Kayış", tedarikciId: 22, maliyet: 20 },
  { id: 107, ad: "Rulman kutusu", cins: "Rulmanlar", tedarikciId: 22, maliyet: 9 },
  { id: 108, ad: "Rulman 6206", cins: " rulman ", tedarikciId: 22, maliyet: 60 },
  { id: 109, ad: "Keçe 50", cins: "keçe", tedarikciId: 22, maliyet: 4 },
  // Aynı kesit (Paslanmaz Ø30 mil), farklı cins; ve cinsi boş malzemeli parça. Ana tedarikçi 22 (pencere), belge malzemenin firması 21.
  { id: 110, ad: "Mil A", cins: "Mil", tedarikciId: 22, maliyetKalemleri: [mk({ malzemeId: 601, bicim: "mil", cap: 30, boy: 100 })] },
  { id: 111, ad: "Ara burç", tedarikciId: 22, maliyetKalemleri: [mk({ malzemeId: 601, bicim: "mil", cap: 50, boy: 40 })] },
  { id: 112, ad: "Mil B", cins: "Aks", tedarikciId: 22, maliyetKalemleri: [mk({ malzemeId: 601, bicim: "mil", cap: 30, boy: 120 })] },
  // Ana tedarikçisi olmayan hazır parçalar ("Tedarikçi belirtilmemiş" kutusu).
  { id: 113, ad: "Somun", maliyet: 1 },
  { id: 114, ad: "Rulman 6300", cins: "Rulman", maliyet: 40 },
];
export const kit = (parts) => [{ model: "AK", defaultParcalar: parts.map(p => ({ partId: String(p.id), miktar: 1 })) }];
export const veri = (o = {}) => {
  const parts = o.parts || PARCALAR;
  return { modeller: kit(parts), satirlar: [{ model: "AK", adet: "10" }], parts, partStock: [], malzemeler: MALZEMELER, tedarikciler: TEDARIKCILER, ...o };
};
export const cinssiz = (parts = PARCALAR) => parts.map(({ cins: _c, ...p }) => p);
