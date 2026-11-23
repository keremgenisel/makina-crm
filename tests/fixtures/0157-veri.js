// Spec 0157 C6/3, AC-61: kıyas verisi LİRA profilindedir: parçada maliyet para birimi ve kuru yok, işlem kalemlerinde para birimi
// ve kur yok, geçmiş satırları yalnız lira. 0158'in dolu verisinden türer (elle lira maliyet, lira işlem kalemleri, döviz malzeme
// kalemleri; malzemenin dövizi X5 gereği değişmez) ve iki parça ekler: geçmişi olan elle maliyetli parça ve bir set. İki parça
// maliyete bağlı fiyat kipindedir (satış fiyatı kıyası). Altın (`0157-once.json`) bu veriyle spec ÖNCESİ koddan `YAZ_0157=1` ile
// üretildi; veriyi değiştirmek altını geçersiz kılar. Profil ayrıca ölçülür (kıyas testi, 0158 dersi).
import * as DOLU from "./0158-dolu.js";

export const { MALZEMELER, TEDARIKCILER, BUGUN, FACTORY } = DOLU;
export const PARCALAR = [
  ...DOLU.PARCALAR.map(p => (p.id === 4 ? { ...p, fiyatKipi: "maliyet", karKati: 2.5 } : p.id === 6 ? { ...p, fiyatKipi: "maliyet" } : p)),
  { id: 20, ad: "Geçmişli", kod: "GC-1", maliyet: 75.4, tedarikciId: 22, maliyetGecmisi: [{ gecerli: "", kurus: 5000 }, { gecerli: "2026-06-01", kurus: 7540 }] },
  { id: 21, ad: "Cıvata seti", setIcerigi: [{ partId: 4, miktar: 4 }, { partId: 20, miktar: 1 }] },
];
export const MODELLER = { standardModels: [{ model: "AK", defaultParcalar: PARCALAR.map(p => ({ partId: String(p.id), miktar: 1 })), ekMaliyetler: [{ ad: "Büküm", tutar: 90 }], karKatsayisi: 1.4 }], customModels: [] };
export const veri = (o = {}) => DOLU.veri({ parts: PARCALAR, modeller: MODELLER.standardModels, ...o });
export const FIYAT_AYARLARI = { varsayilanKat: 2, yuvarlama: "" };
export const PARTI = { id: 801, ad: "Güz", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK: 10 } };
