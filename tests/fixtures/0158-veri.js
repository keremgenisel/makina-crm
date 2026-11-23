// Spec 0158 C9/4 (AC-80): kıyas verisi dokunulmamış profildedir: kalem adedi bir, ölçü/hammadde/cins boş, işlem kalemi yok, kod yok.
// 0144'ün verisinden türetilir: her kalemin adedi 1 yapılır ve aynı malzeme ile ölçüdeki ikinci kalem düşer (0144'te "Lama", "İnce mil"
// ve "Aynı ölçülü" kalem adedi 2 ve 3 taşıyordu; spec'in Ölçüm R'si bunu bir sanıyordu). Altın (`0158-once.json`) bu veriyle spec ÖNCESİ koddan `YAZ_0158=1`
// ile üretildi; veriyi değiştirmek altını geçersiz kılar.
import * as V144 from "./0144-veri.js";

export const { MALZEMELER, TEDARIKCILER, FACTORY, BUGUN } = V144;
const OLCU_ALANLARI = ["bicim", "cap", "et", "kalinlik", "genislik", "en", "boy"];
const tekil = (kalemler) => {
  const gor = new Set();
  return kalemler.filter(k => { const a = [k.malzemeId, ...OLCU_ALANLARI.map(x => k[x])].join("|"); if (gor.has(a)) return false; gor.add(a); return true; })
    .map(k => ({ ...k, adet: 1 }));
};
export const PARCALAR = V144.PARCALAR.map(p => (p.maliyetKalemleri ? { ...p, maliyetKalemleri: tekil(p.maliyetKalemleri) } : p));
export const MODELLER = { standardModels: V144.MODELLER.standardModels.map(m => ({ ...m, defaultParcalar: m.defaultParcalar })), customModels: [] };
export const veri = (o = {}) => V144.veri({ parts: PARCALAR, ...o });
const K = V144.K;
export const SENARYOLAR = () => ({
  odakli: [veri(), { tedarikciOdakli: true }, {}],
  parti: [veri(), { tedarikciOdakli: true }, { partiAd: "Parti 7" }],
  duzenleme: [veri(), { tedarikciOdakli: true, duzenleme: { parca: { 2: { adet: "100" }, 12: { kapali: true } },
    kesit: { [K.ince]: { deger: "50" }, [K.yatak]: { deger: "100" }, [K.sac]: { kapali: true } } } }, {}],
  secim: [veri(), { tedarikciOdakli: true, secilenTedarikciler: ["11", "14"] }, {}],
});
export const PARTI = [{ id: 801, ad: "Güz", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK100_DS: 70 } }];
export const PENCERE_VERI = () => ({ parts: PARCALAR, partStock: [], malzemeler: MALZEMELER, tedarikciler: TEDARIKCILER, hamTedarikciler: TEDARIKCILER,
  standardModels: MODELLER.standardModels, customModels: [], uretimPartileri: PARTI, appSettings: {}, factory: FACTORY });
