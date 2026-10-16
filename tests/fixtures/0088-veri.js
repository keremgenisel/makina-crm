// Spec 0088: Makina Maliyet Hesabı motoru ve ekranı için ortak veri. Gider tutarları bilinçli olarak yuvarlak (elle doğrulanır).
export const TURLER = [
  { id: 1, ad: "Genel giderler", davranis: "normal", maliyetRolu: "genel" },
  { id: 2, ad: "Tedarik", davranis: "normal", maliyetRolu: "urunAgaci" },
  { id: 3, ad: "Personel", davranis: "personel", maliyetRolu: "genel" },
  { id: 4, ad: "Kira", davranis: "kira" },
  { id: 5, ad: "Silinen tür", davranis: "normal", maliyetRolu: "genel", deletedAt: "2026-09-01T00:00:00.000Z" },
];
export const GIDERLER = [
  { id: 1, tarih: "2026-01-10", turId: 1, tutar: 10000, kdvOrani: 20 },
  { id: 2, tarih: "2026-02-10", turId: 2, tutar: 4000, kdvOrani: 20 },
  { id: 3, tarih: "2026-01-31", turId: 3, calisanId: 21, calisanAd: "Zeynep Gizlisoy", resmiTutar: 30000, eldenTutar: 5000 },
  { id: 4, tarih: "2026-03-01", turId: 4, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0 },
  { id: 5, tarih: "2026-03-05", tutar: 777, kdvOrani: 20 },
  { id: 6, tarih: "2025-12-15", turId: 1, tutar: 5000, kdvOrani: 20 },
  { id: 7, tarih: "2026-05-10", turId: 2, tutar: 1000, kdvOrani: 20 },
];
export const PARCALAR = [
  { id: 7, ad: "Rulman", models: ["AK100"], maliyet: 7.5 },
  { id: 8, ad: "Bant", models: ["AK100"], maliyet: 145.6 },
  { id: 9, ad: "Pul", models: ["AK100"] },
  { id: 10, ad: "Çöpteki", models: [], maliyet: 50, deletedAt: "2026-10-01T00:00:00.000Z" },
];
export const MODELLER = [
  { model: "AK100", defaultParcalar: [{ partId: "7", ad: "Rulman", miktar: 46 }, { partId: "8", ad: "Bant", miktar: 2 }],
    ekMaliyetler: [{ ad: "Büküm işçiliği", tutar: 90 }], karKatsayisi: 2.19498, kalipListeFiyati: 4500 },
  { model: "AK120", defaultParcalar: [{ partId: "9", ad: "Pul", miktar: 3 }, { partId: "10", ad: "Çöpteki", miktar: 1 }, { partId: "99", ad: "Yok", miktar: 1 }] },
  { model: "AK200", defaultParcalar: [] },
];
export const OZEL = [{ model: "COP", deletedAt: "2026-09-01T00:00:00.000Z", defaultParcalar: [] }];
export const PARTILER = [
  { id: 801, ad: "1. Parti", baslangicAy: "2026-01", bitisAy: "2026-06" },
  { id: 802, ad: "2. Parti", baslangicAy: "2026-05", bitisAy: null },
  { id: 803, ad: "Planlı", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK100: 10, ESKI_AD: 4 } },
];
export const STOCK = [
  { id: 501, model: "AK100", serialNo: "T1", partiId: 801, uretimTarihi: "2026-02-01" },
  { id: 502, model: "AK100", serialNo: "T2", uretimTarihi: "2026-03-01" },
];
export const CUSTOMERS = [
  { id: 601, name: "A", model: "AK100", serialNo: "S1", partiId: 801, uretimTarihi: "2026-02-02", installDate: "2026-04-01", fabrikaSatisBedeli: 100000, currency: "TRY" },
  { id: 602, name: "B", model: "AK100", serialNo: "S2", partiId: 801, uretimTarihi: "2026-02-03", installDate: "2026-04-02", fabrikaSatisBedeli: 1000, currency: "USD", satisKuru: 40 },
  { id: 603, name: "C", model: "AK100", serialNo: "S3", partiId: 801, uretimTarihi: "2026-02-04", installDate: "2026-04-03", fabrikaSatisBedeli: 500, currency: "EUR" },
  { id: 604, name: "D", model: "AK100", serialNo: "S4", partiId: 801, uretimTarihi: "2026-02-05", installDate: "2026-04-04" },
  { id: 605, name: "E", model: "AK120", serialNo: "S5", installDate: "2026-04-05" },
];
export const AYAR = { baslangicAy: "2026-01", bitisAy: "2026-12", varsayilanAdet: 120 };
export const BUGUN = "2026-10-16";
export const veri = (ek = {}) => ({ giderler: GIDERLER, giderTurleri: TURLER, tedarikciler: [], stock: STOCK, customers: CUSTOMERS, partStockLog: [],
  uretimPartileri: PARTILER, yururlukAy: "2026-01", ...ek });
