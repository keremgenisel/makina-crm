// Spec 0097: parça maliyeti geçmişi ve Parti Hesabı'nın tarihli satırları için ortak veri (motor ve ekran testleri aynı rakamları
// okur). Rulman 2026-02-01'de 10 TL'den 15 TL'ye çıktı; Vida hiç değişmedi.
//   AK100 = 2 × Rulman + 3 × Vida → Ocak: 2600 kuruş, Şubat'tan sonra: 3600 kuruş. OZ = 1 × Rulman → 1000 / 1500.
// Kış partisi (2026-01 – 2026-03, kapalı): iki Ocak makinası, bir Şubat makinası (satılmış, 10.000 TL), bir tarihsiz makina ve
// planlanan 3 OZ. Havuz: Ocak 1000,01 + Şubat 2000 + Mart 3000 = 600001 kuruş, dört makina → 150000, artık 1 kuruş ilk Ocak
// makinasında. Bahar (2026-04, açık): bir Mayıs makinası (havuz Mayıs 500 TL) ve planlanan 2 OZ. Güz (2026-09, başlamadı): bir
// makina ve planlanan 5 OZ. Hesap ayarları: 2026-01 – 2026-06, 10 adet → 650001 / 10 = 65000 kuruş.
export const BUGUN = "2026-06-15";
export const YURURLUK = "2026-01";
export const TURLER = [{ id: 1, ad: "Elektrik", davranis: "normal", maliyetRolu: "genel" }];
const k = (id, tarih, tutar) => ({ id, tarih, turId: 1, tutar, kdvOrani: 0, modelSatirlari: [], taksitler: [] });
export const GIDERLER = [k(1, "2026-01-10", 1000.01), k(2, "2026-02-10", 2000), k(3, "2026-03-10", 3000), k(4, "2026-05-10", 500)];
export const RULMAN_GECMISI = [{ gecerli: "", kurus: 1000 }, { gecerli: "2026-02-01", kurus: 1500 }];
export const PARCALAR = [
  { id: 1, ad: "Rulman", models: ["AK100", "OZ"], maliyet: 15, maliyetGecmisi: RULMAN_GECMISI },
  { id: 2, ad: "Vida", models: ["AK100"], maliyet: 2 },
];
export const STANDART = [{ model: "AK100", defaultParcalar: [{ partId: "1", ad: "Rulman", miktar: 2 }, { partId: "2", ad: "Vida", miktar: 3 }], karKatsayisi: 1.5 }];
export const OZEL = [{ model: "OZ", defaultParcalar: [{ partId: "1", ad: "Rulman", miktar: 1 }], karKatsayisi: 2 }];
export const PARTILER = [
  { id: 1, ad: "Kış", baslangicAy: "2026-01", bitisAy: "2026-03", planlananAdetler: { OZ: 3 } },
  { id: 2, ad: "Bahar", baslangicAy: "2026-04", bitisAy: null, planlananAdetler: { OZ: 2 } },
  { id: 3, ad: "Güz", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { OZ: 5 } },
];
const stk = (id, o = {}) => ({ id, model: "AK100", serialNo: `S${id}`, ...o });
export const STOCK = [
  stk(1, { partiId: 1, uretimTarihi: "2026-01-10" }),
  stk(2, { partiId: 1, uretimTarihi: "2026-01-25" }),
  stk(3, { partiId: 1 }), // tarihsiz: addedDate de yok (URETIM_KAYNAK.BILINMIYOR)
  stk(4, { partiId: 2, uretimTarihi: "2026-05-02" }),
  stk(5, { partiId: 3, uretimTarihi: "2026-06-01" }),
];
export const CUSTOMERS = [
  { id: 11, name: "Satılan", model: "AK100", serialNo: "C11", partiId: 1, uretimTarihi: "2026-02-15", installDate: "2026-03-01", fabrikaSatisBedeli: 10000, currency: "TRY" },
];
export const AYAR = { baslangicAy: "2026-01", bitisAy: "2026-06", varsayilanAdet: 10 };
export const veri = (o = {}) => ({ giderler: GIDERLER, giderTurleri: TURLER, tedarikciler: [], stock: STOCK, customers: CUSTOMERS, partStockLog: [],
  uretimPartileri: PARTILER, yururlukAy: YURURLUK, ...o });
export const katalog = (o = {}) => ({ parts: PARCALAR, standardModels: STANDART, customModels: OZEL, ...o });
