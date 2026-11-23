// Spec 0159 C7, C7/2 (AC-16): kıyas verisi. Alım ve işlem kalemleriyle kurulmuş parçalar (lira, döviz, tedarikçisiz kalem, geçmişli),
// elle lira ve elle döviz parça, malzemeli parça. 0157'nin verisinden türer. Altın (`0159-once.json`) bu veriyle spec ÖNCESİ koddan
// `YAZ_0159=1` ile üretildi; veriyi değiştirmek altını geçersiz kılar. A firması Aksu CNC (22), B firması Fason Kaplama (23).
import * as V157 from "./0157-veri.js";

export const { MALZEMELER, TEDARIKCILER, BUGUN, FACTORY } = V157;
export const DIS_YAY = { id: 50, ad: "DIŞ YAY", tedarikciId: 22, maliyetKalemleri: [{ tur: "islem", ad: "Parça alımı", tedarikciId: 22, tutar: 40 }, { tur: "islem", ad: "Kalaylama", tedarikciId: 23, tutar: 10 }] };
export const PARCALAR = [
  ...V157.PARCALAR,
  { id: 30, ad: "İthal rulman", tedarikciId: 22, maliyet: 120, maliyetParaBirimi: "USD", maliyetKuru: 40 },
  DIS_YAY,
  { id: 51, ad: "İthal yay", tedarikciId: 22, maliyetKalemleri: [{ tur: "islem", ad: "İthal alım", tedarikciId: 21, tutar: 2.5, paraBirimi: "EUR", kur: 50 }, { tur: "islem", ad: "Paketleme", tutar: 5 }] },
  { id: 52, ad: "Fasonlu geçmişli", tedarikciId: 22, maliyetKalemleri: [{ tur: "islem", ad: "Taşlama", tedarikciId: 23, tutar: 25 }],
    maliyetGecmisi: [{ gecerli: "", kurus: 2000 }, { gecerli: "2026-06-01", kurus: 2500 }] },
];
export const veri = (o = {}) => V157.veri({ parts: PARCALAR, modeller: [{ model: "AK", defaultParcalar: PARCALAR.map(p => ({ partId: String(p.id), miktar: 1 })) }], ...o });
// R6/2'den etkilenen parçalar: maliyeti yalnız alım ve işlem kalemlerinden gelen (malzemesiz) parçalar. Kıyas bunların hazır parça
// satırının tutarını ve bölümlerinin toplamlarını iki taraftan düşer (P3); yeni değerler kendi testinde ölçülür.
export const R62_PARCALAR = PARCALAR.filter(p => (p.maliyetKalemleri || []).length && p.maliyetKalemleri.every(k => k.tur === "islem")).map(p => p.id);
