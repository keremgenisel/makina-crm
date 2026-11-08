// Spec 0136 ortak veri: 0097'nin parti verisi (rakamları o dosyanın başlığında) ve iki ek parti. Kış (2026-01 – 2026-03) 0090 ay
// havuzu görüntüsüyle kapanmış (Şubat'ın havuzu kapanışta 1.800 TL, bugün 2.000 TL: sapma kutusu çıkar); "Eski" (2025-11 – 2025-12)
// 0090 öncesi kapanmış (yalnız `kapanisOrtaklari`). Hiçbirinde maliyet görüntüsü (`kapanisMaliyeti`) yok: kıyas altını bu veriyle
// spec öncesi koddan üretildi (tests/fixtures/0136-once.json).
import * as V from "./0097-veri";
export * from "./0097-veri";
export const PARTILER = [
  { ...V.PARTILER[0], kapanmaZamani: "2026-04-02T09:00:00", kapanisGenelHavuzlari: { "2026-01": 100001, "2026-02": 180000, "2026-03": 300000 } },
  V.PARTILER[1], V.PARTILER[2],
  { id: 4, ad: "Eski", baslangicAy: "2025-11", bitisAy: "2025-12", kapanmaZamani: "2026-01-05T10:00:00", kapanisOrtaklari: { "2025-11": 5 } },
];
export const STOCK = [...V.STOCK, { id: 6, model: "OZ", serialNo: "E6", partiId: 4, uretimTarihi: "2025-11-20" }, { id: 7, model: "AK100", serialNo: "P7", uretimTarihi: "2026-05-20" }];
export const veri = (o = {}) => V.veri({ uretimPartileri: PARTILER, stock: STOCK, ...o });
