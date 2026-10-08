// Spec 0076 AC-36 (plan Q3): bayraksız veri kümesi. "Önce" çıktısı (tests/fixtures/0076-bayraksiz-once.json) bu veriyle,
// spec 0076'dan ÖNCEKİ kodla üretildi; veriyi değiştirmek altını geçersiz kılar. Her atama türü, kira, personel, SGK,
// tevkifat, dağıtım, parti ve KDV dâhil giriş birlikte bulunur (maliyet tabanının bütün kolları).
import { hesaplaGiderRaporu, kovaDagilimi, kdvKarsilastir, canliModelSeti, turHaritasi, davranisOf } from "../../src/lib/gider";
import { hesaplaMakinaMaliyetleri, karlilikOzeti, fiyatOnerisi } from "../../src/lib/makinaMaliyeti";

export const TURLER = [
  { id: 1, ad: "Genel", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" },
  { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "SGK", davranis: "sgk" },
];
export const MODELLER = [{ model: "AK100" }, { model: "AK200" }];
export const STOCK = [{ id: 501, model: "AK100", serialNo: "T501", addedDate: "2026-03-08" }];
export const CUSTOMERS = [
  { id: 601, name: "Firma A", model: "AK100", serialNo: "S601", installDate: "2026-03-20", fabrikaSatisBedeli: 500000, currency: "TRY", uretimTarihi: "2026-03-05" },
  { id: 602, name: "Firma B", model: "AK200", serialNo: "S602", installDate: "2026-04-20", fabrikaSatisBedeli: 650000, currency: "TRY", uretimTarihi: "2026-04-10" },
  { id: 603, name: "Firma C", model: "AK100", serialNo: "S603", installDate: "2026-05-20", fabrikaSatisBedeli: 480000, currency: "TRY", uretimTarihi: "2026-05-02", partiId: 801 },
];
export const PARTILER = [{ id: 801, ad: "Parti 1", baslangicAy: "2026-05", bitisAy: "2026-06" }];
export const GIDERLER = [
  { id: 1, tarih: "2026-03-10", turId: 1, tutar: 12345.67, kdvOrani: 20, tedarikciId: 11, aciklama: "Ortak" },
  { id: 2, tarih: "2026-03-11", turId: 1, tutar: 5000, kdvOrani: 20, atamaTur: "makina", makinaTur: "musteri", makinaId: 601 },
  { id: 3, tarih: "2026-03-12", turId: 1, tutar: 7000, kdvOrani: 10, atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 1000, adet: 4 }] },
  { id: 4, tarih: "2026-03-13", turId: 1, tutar: 2500, kdvOrani: 20, atamaTur: "dagitma" },
  { id: 5, tarih: "2026-04-01", turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 12 },
  { id: 6, tarih: "2026-04-30", turId: 3, calisanId: 21, calisanAd: "X", resmiTutar: 30000, eldenTutar: 5000, yolParasi: 1000 },
  { id: 7, tarih: "2026-04-15", turId: 4, tutar: 9000 },
  { id: 8, tarih: "2026-04-05", turId: 1, tutar: 10000, kdvOrani: 20, tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10, tedarikciId: 11 },
  { id: 9, tarih: "2026-05-03", turId: 1, tutar: 24000, kdvOrani: 20, dagitimAy: 6, tedarikciId: 11 },
  { id: 10, tarih: "2026-05-07", turId: 1, tutar: 1000, kdvOrani: 20, kdvYonu: "dahil", atamaTur: "makina", makinaTur: "stok", makinaId: 501 },
  { id: 11, tarih: "2026-06-07", turId: 1, tutar: 333.33, kdvOrani: 18, odendi: true },
];
export const TEDARIKCILER = [{ id: 11, ad: "Akaryakıt A.Ş." }, { id: 12, ad: "Gayrimenkul" }];
export const BUGUN = "2026-07-15";

const duz = (x) => JSON.parse(JSON.stringify(x, (k, v) => (v instanceof Map ? [...v.entries()] : v instanceof Set ? [...v] : v)));

// Bayraksız veride değişmemesi gereken bütün motor çıktıları (AC-36): dönem raporu (iki dönem), kova, makina maliyeti
// (gerçek ve standart kaynak), kârlılık özeti, fiyat önerisi, KDV karşılaştırması.
export const motorCiktilari = (giderler = GIDERLER) => {
  const turMap = turHaritasi(TURLER);
  const canliModeller = canliModelSeti(MODELLER, []);
  const rapor = (bas, bit) => hesaplaGiderRaporu({ giderler, turler: TURLER, tedarikciler: TEDARIKCILER, stock: STOCK, customers: CUSTOMERS, canliModeller, yururlukAy: "2026-01" }, { baslangic: bas, bitis: bit }, { bugun: BUGUN });
  const maliyet = (kaynak) => hesaplaMakinaMaliyetleri({ customers: CUSTOMERS, stock: STOCK, giderler, giderTurleri: TURLER, standardModels: MODELLER, uretimPartileri: PARTILER,
    standartGiderler: [{ id: 901, grupId: 901, ad: "Elektrik", tutar: 4000, baslangicAy: "2026-01" }], giderAyarlari: { yururlukAy: "2026-01", ortakGiderKaynagi: kaynak } }, { bugun: BUGUN });
  const gercek = maliyet("gercek"), standart = maliyet("standart");
  const yil = rapor("2026-01-01", "2026-12-31");
  return duz({
    raporYil: yil, raporMart: rapor("2026-03-01", "2026-03-31"),
    kovalar: giderler.map(k => kovaDagilimi(k, { davranis: davranisOf(k, turMap), stock: STOCK, customers: CUSTOMERS, canliModeller })),
    maliyetGercek: gercek, maliyetStandart: standart,
    karlilik: karlilikOzeti(gercek, { baslangic: "2026-01-01", bitis: "2026-12-31" }),
    fiyat: fiyatOnerisi(gercek, { model: "AK100", baslangic: "2026-01-01", bitis: "2026-12-31", yontem: "marj", deger: 20 }),
    kdv: kdvKarsilastir(50000, yil.indirilecekKdv),
  });
};
