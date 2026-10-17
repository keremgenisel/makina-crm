// Spec 0090: parti payının yeni hesaptan gelmesi için ortak veri. AC-36 kıyası bu veriyle, spec 0090'dan ÖNCEKİ kodun
// (bugünkü maliyet motoru, makinaMaliyeti.js) ürettiği parti havuzlarıyla karşılaştırılır (tests/fixtures/0090-parti-once.json).
// Kıyasın koşulu (AC-36): atama, dağıtım ve kısıt yok; bütün canlı türlerin rolü "genel gidere girer"; türsüz kalem yok.
// Kapsadığı durumlar: yürürlük öncesi ay (Ocak), çakışan iki parti (Nisan), o ay üretilmiş partisiz makina (Mart, Nisan),
// tarihsiz partili makina, makinası olmayan parti, gelecekte başlayan parti, artık kuruş (tek sayılı tutarlar).
export const TURLER = [
  { id: 1, ad: "Genel", davranis: "normal", maliyetRolu: "genel" },
  { id: 2, ad: "Kira", davranis: "kira", maliyetRolu: "genel" },
  { id: 3, ad: "Personel", davranis: "personel", maliyetRolu: "genel" },
];
const k = (id, tarih, turId, o = {}) => ({ id, tarih, turId, kdvOrani: 0, modelSatirlari: [], taksitler: [], ...o });
export const GIDERLER = [
  k(1, "2026-01-10", 1, { tutar: 1000 }), // yürürlük öncesi
  k(2, "2026-02-10", 1, { tutar: 3000.01 }),
  k(3, "2026-03-05", 1, { tutar: 5000 }),
  k(4, "2026-03-20", 2, { tutar: 10000, girisYonu: "brut", stopajOrani: 20 }),
  k(5, "2026-04-02", 1, { tutar: 7000.03 }),
  k(6, "2026-04-30", 3, { calisanId: 21, calisanAd: "Gizli Kişi", resmiTutar: 30000, eldenTutar: 5000, tutar: null }),
  k(7, "2026-05-15", 1, { tutar: 2000 }),
  k(8, "2026-06-01", 1, { tutar: 999.99 }),
  k(9, "2026-03-07", 1, { tutar: 400, deletedAt: "2026-04-01T00:00:00.000Z" }), // çöpteki kalem hiçbir hesaba girmez
];
export const PARTILER = [
  { id: 901, ad: "Bahar", baslangicAy: "2026-01", bitisAy: "2026-04" }, // Ocak yürürlük öncesi
  { id: 902, ad: "Yaz", baslangicAy: "2026-04", bitisAy: null }, // açık, Nisan çakışması
  { id: 903, ad: "Boş", baslangicAy: "2026-03", bitisAy: "2026-03" }, // makinası yok
  { id: 904, ad: "Güz", baslangicAy: "2026-09", bitisAy: null }, // başlamadı
  { id: 905, ad: "Çöpteki", baslangicAy: "2026-02", bitisAy: "2026-02", deletedAt: "2026-05-01T00:00:00.000Z" },
];
export const STOCK = [
  { id: 1, model: "AK100", serialNo: "B1", partiId: 901, uretimTarihi: "2026-02-05" },
  { id: 2, model: "AK100", serialNo: "B2", partiId: 901, uretimTarihi: "2026-03-01" },
  { id: 3, model: "AK100", serialNo: "Y1", partiId: 902, uretimTarihi: "2026-04-10" },
  { id: 4, model: "AK100", serialNo: "Y2", partiId: 902 }, // tarihsiz partili
  { id: 5, model: "AK100", serialNo: "S1", uretimTarihi: "2026-03-12" }, // partisiz, Mart
  { id: 6, model: "AK100", serialNo: "S2", uretimTarihi: "2026-04-20" }, // partisiz, Nisan
  { id: 7, model: "AK100", serialNo: "G1", partiId: 904, uretimTarihi: "2026-09-01" },
  { id: 8, model: "AK100", serialNo: "C1", partiId: 905, uretimTarihi: "2026-02-20" }, // partisi çöpte: partisiz sayılır
];
export const CUSTOMERS = [
  { id: 11, name: "Satılan", model: "AK100", serialNo: "B3", partiId: 901, uretimTarihi: "2026-02-25", installDate: "2026-05-01" },
];
export const MODELLER = [{ model: "AK100" }];
export const YURURLUK = "2026-02";
export const BUGUN = "2026-06-15";
export const veri = (o = {}) => ({ giderler: GIDERLER, giderTurleri: TURLER, tedarikciler: [], stock: STOCK, customers: CUSTOMERS, partStockLog: [],
  uretimPartileri: PARTILER, yururlukAy: YURURLUK, ...o });
