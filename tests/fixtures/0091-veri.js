// Spec 0091 (K10): motor ve ekran testlerinin ortak verisi. Yirmi canlı model (altı standart, on dört özel), yedisi üretimde.
// Dönem 2026-01 … 2026-12. Kapsadığı durumlar: dönemde iki makinası olan üretimdeki model (AK100), dönemde hiç üretilmemiş
// üretimdeki model (AK120, "eskimiş"), üretimde değil ama dönemde üretilmiş model (AK160, "yanlış"), dönem dışında üretilmiş
// makina (AK200), üretim tarihi çözülemeyen makina, Türkçe harf farkıyla yazılmış makina ("inox" → "İNOX"), modeli kataloğda
// olmayan makina (BILINMEYEN) ve çöpteki özel model (OZ_COP, hiç sayılmaz).
export const STANDART = ["AK100", "AK120", "AK140", "AK160", "AK200", "AK240"].map(model => ({ model, defaultParcalar: [] }));
export const OZEL = [
  ...["İNOX", "OZ02", "OZ03", "OZ04", "OZ05", "OZ06", "OZ07", "OZ08", "OZ09", "OZ10", "OZ11", "OZ12", "OZ13", "OZ14"].map(model => ({ model, defaultParcalar: [] })),
  { model: "OZ_COP", defaultParcalar: [], deletedAt: "2026-09-01T00:00:00.000Z" },
];
export const URETIMDE = ["AK100", "AK120", "AK140", "İNOX", "OZ02", "OZ03", "OZ04"];
export const URETIMDE_DISI = [...STANDART, ...OZEL].filter(m => !m.deletedAt && !URETIMDE.includes(m.model)).map(m => m.model);
const stk = (id, model, uretimTarihi) => ({ id, model, serialNo: `S${id}`, ...(uretimTarihi ? { uretimTarihi } : {}) });
export const STOCK = [
  stk(1, "AK100", "2026-03-10"), stk(2, "AK100", "2026-05-02"),
  stk(3, "AK160", "2026-04-15"),
  stk(4, "AK200", "2025-06-01"), // dönem dışı
  stk(5, "AK100"), // üretim tarihi çözülemez
  stk(6, "inox", "2026-07-01"), // Türkçe küçültmeyle İNOX
  stk(7, "BILINMEYEN", "2026-08-01"), // modeli katalogda yok
];
export const AYARLAR = { baslangicAy: "2026-01", bitisAy: "2026-12", varsayilanAdet: 10 };
export const TURLER = [{ id: 1, ad: "Genel", davranis: "normal", maliyetRolu: "genel" }];
export const GIDERLER = [{ id: 1, tarih: "2026-02-10", turId: 1, tutar: 10000, kdvOrani: 0, modelSatirlari: [], taksitler: [] }];
export const KATALOG = [...STANDART, ...OZEL].filter(m => !m.deletedAt).map(m => m.model);
export const veri = (o = {}) => ({ giderler: GIDERLER, giderTurleri: TURLER, tedarikciler: [], stock: STOCK, customers: [], partStockLog: [], uretimPartileri: [], yururlukAy: "2026-01", ...o });
