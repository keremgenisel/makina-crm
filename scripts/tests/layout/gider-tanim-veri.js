// Spec 0030 R8 (plan B8): tekrarlayan giderler tablosunun yerleşim ve kanıt verisi. Uzun adlar, uzun tedarikçi, model
// ataması ve her üretimle büyüyen "üretilen aylar" (14 ay) bilerek en zor hâli temsil eder. Yerleşim testi ve kanıt
// düzeneği aynı veriyi kullanır.
const aylar = (bas, n) => Array.from({ length: n }, (_, i) => { const [y, a] = bas.split("-").map(Number); const t = y * 12 + (a - 1) + i; return `${Math.floor(t / 12)}-${String(t % 12 + 1).padStart(2, "0")}`; });
export const TANIM_TURLERI = [
  { id: 1, ad: "Fabrika kirası", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" },
  { id: 4, ad: "Elektrik", davranis: "normal" }, { id: 5, ad: "Hammadde ve sarf malzemesi", davranis: "normal" },
];
export const TANIM_TEDARIKCI = [{ id: 11, ad: "Yıldız Gayrimenkul Yatırım A.Ş." }, { id: 12, ad: "Bölge Elektrik Dağıtım" }, { id: 13, ad: "Anadolu Metal Sanayi" }];
export const TANIM_CALISAN = [{ id: 21, ad: "Hasan Çelik", resmiMaliyet: 30000, eldenMaliyet: 20000 }];
export const TANIM_UZUN = [
  { id: 91, ad: "Fabrika binası kirası (Organize Sanayi Bölgesi)", turId: 1, tutar: 125000, girisYonu: "brut", kdvOrani: 0, tedarikciId: 11, baslangicAy: "2025-06", bitisAy: "2027-05", uretilenAylar: aylar("2025-06", 14) },
  { id: 92, ad: "Hasan Çelik", turId: 3, calisanId: 21, baslangicAy: "2025-08", uretilenAylar: aylar("2025-08", 12) },
  { id: 93, ad: "Sac levha tedarik sözleşmesi", turId: 5, tutar: 48250.5, kdvOrani: 20, tedarikciId: 13, atamaTur: "model", baslangicAy: "2026-01", uretilenAylar: aylar("2026-01", 8),
    modelSatirlari: [{ modelAd: "AK120_DSC", adet: 2, birimMaliyet: 12000 }, { modelAd: "AK100", adet: 1, birimMaliyet: 9000 }] },
  { id: 94, ad: "Elektrik (fabrika)", turId: 4, tutar: 9000, kdvOrani: 20, tedarikciId: 12, baslangicAy: "2026-10", uretilenAylar: [] },
];
