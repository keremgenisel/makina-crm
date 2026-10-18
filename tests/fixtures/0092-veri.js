// Spec 0092: peşin ödenen giderin kapsadığı aylara yayılması için ortak veri (ölçüm 1, gerçek motorla ölçülen kurulum).
// İnternet 24.000 TL, 15.01.2026 tarihli tek kalem, kapsamı 12 ay (yılın tamamı peşin); yanında her ay 3.000 TL elektrik; iki
// türün de rolü "genel gidere girer"; yürürlük 2026-01; dört çeyrek partisi, her birinde 20 makina.
// Yayma öncesi (spec 0092'den önceki kod, ölçüldü): Ocak havuzu 27.000 TL, diğer aylar 3.000 TL; parti payları 1.650 / 450 / 450 / 450.
// Yayma ile her ay 5.000 TL, her çeyrek 15.000 TL, makina başı 750 TL.
export const TURLER = [
  { id: 1, ad: "İnternet", davranis: "normal", maliyetRolu: "genel" },
  { id: 2, ad: "Elektrik", davranis: "normal", maliyetRolu: "genel" },
];
const ay = (n) => `2026-${String(n).padStart(2, "0")}`;
export const INTERNET = { id: 100, tarih: "2026-01-15", turId: 1, aciklama: "Yıllık internet", tutar: 24000, kdvOrani: 20, dagitimAy: 12, taksitler: [], modelSatirlari: [] };
export const ELEKTRIK = Array.from({ length: 12 }, (_, i) => ({ id: 200 + i, tarih: `${ay(i + 1)}-10`, turId: 2, tutar: 3000, kdvOrani: 20, taksitler: [], modelSatirlari: [] }));
export const GIDERLER = [INTERNET, ...ELEKTRIK];
export const PARTILER = [1, 2, 3, 4].map(c => ({ id: 900 + c, ad: `${c}. Çeyrek`, baslangicAy: ay(c * 3 - 2), bitisAy: ay(c * 3) }));
export const STOCK = PARTILER.flatMap((p, c) => Array.from({ length: 20 }, (_, i) => ({
  id: 1000 + c * 100 + i, model: "AK100", serialNo: `Q${c + 1}-${i + 1}`, partiId: p.id, uretimTarihi: `${ay(c * 3 + 1)}-${String(i + 1).padStart(2, "0")}`,
})));
export const BUGUN = "2026-12-20";
export const YURURLUK = "2026-01";
export const veri = (o = {}) => ({ giderler: GIDERLER, giderTurleri: TURLER, tedarikciler: [], stock: STOCK, customers: [], partStockLog: [],
  uretimPartileri: PARTILER, yururlukAy: YURURLUK, ...o });
