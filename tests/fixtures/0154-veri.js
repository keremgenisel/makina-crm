// Spec 0154: parça müşteri kırılımının ortak verisi (motor testleri, kıyas, ekran). Bütün çözüm yollarını taşır:
// aynı firmanın iki makinası, boş model/seri, aynı serviste aynı parçanın iki satırı, aynı makinaya iki servis, miktarı boş
// satır, müşterisi silinmiş servis, onarım yeri "Kargo" eski servis, tarihsiz servis ve kargo, bayi alıcılı tahsisli satış,
// kimliği bulunamayan ama seri numarası tutan tahsis, serbest metinli tahsis, hiçbir şeyi olmayan tahsis, müşteri alıcılı
// kısmi tahsis, dış firma, bayisi bulunamayan satış, aşırı tahsis.
export const CUSTOMERS = [
  { id: 1, name: "EGE ÇİFTLİK ET", model: "AK100", serialNo: "S-100" },
  { id: 2, name: "EGE ÇİFTLİK ET", model: "AK120", serialNo: "S-120" },
  { id: 3, name: "BİRTAT KÖFTE", model: "AK100", serialNo: "S-101" },
  { id: 4, name: "METRO MARKET", model: "", serialNo: "" },
  { id: 5, name: "Ağaç Lokanta", model: "AK200", serialNo: "S-200" },
];
export const DEALERS = [{ id: 50, name: "Kuzey Bayi" }, { id: 51, name: "Güney Bayi" }];
export const PARTS = [{ id: 7, ad: "RULMAN ?" }, { id: 8, ad: "Kayış" }, { id: 9, ad: "Bıçak" }];
export const SERVICES = [
  { id: 101, customerId: 1, date: "2026-03-10", repairPlace: "Yerinde Onarım", degisenParcalar: [{ partId: 7, ad: "RULMAN ?", miktar: 1 }, { partId: 7, ad: "RULMAN ?", miktar: 2 }] },
  { id: 102, customerId: 1, date: "2026-05-02", repairPlace: "Fabrikada Onarım", degisenParcalar: [{ partId: 7, ad: "RULMAN ?", miktar: "" }] },
  { id: 103, customerId: 2, date: "2026-05-02", repairPlace: "Yerinde Onarım", degisenParcalar: [{ partId: 7, ad: "RULMAN ?", miktar: 0 }, { partId: 8, ad: "Kayış", miktar: 1 }] },
  { id: 104, customerId: 3, date: "2026-06-15", repairPlace: "Yerinde Onarım", degisenParcalar: [{ partId: 7, ad: "RULMAN ?", miktar: 1 }] },
  { id: 105, customerId: 4, date: "2026-07-01", repairPlace: "Yerinde Onarım", degisenParcalar: [{ partId: 7, ad: "RULMAN ?", miktar: 1 }] },
  { id: 106, customerId: 999, date: "2026-07-05", repairPlace: "Yerinde Onarım", degisenParcalar: [{ partId: 7, ad: "RULMAN ?", miktar: 2 }] },
  { id: 107, customerId: 3, date: "2026-07-06", repairPlace: "Kargo", degisenParcalar: [{ partId: 7, ad: "RULMAN ?", miktar: 5 }] },
  { id: 108, customerId: 5, date: "", repairPlace: "Yerinde Onarım", degisenParcalar: [{ partId: 7, ad: "RULMAN ?", miktar: 1 }] },
  { id: 109, customerId: 5, date: "2026-08-01", repairPlace: "Yerinde Onarım", degisenParcalar: [{ ad: "Serbest conta", miktar: 1 }] },
];
export const YEDEK = [
  // Bayi alıcı: 3 adet, 2'si makina 3'e (kimlik), 1 tahsissiz.
  { id: 201, aliciTipi: "bayi", dealerId: 50, partId: 7, miktar: 3, tarih: "2026-05-02", tahsisler: [{ miktar: 2, customerId: 3, serialNo: "S-101" }] },
  // Kimliği bulunamayan ama serisi tutan tahsis (makina 5), serbest metinli tahsis, hiçbir şeyi olmayan tahsis.
  { id: 202, aliciTipi: "bayi", dealerId: 51, partId: 7, miktar: 4, tarih: "2026-06-20", tahsisler: [
    { miktar: 1, customerId: 777, serialNo: "S-200" }, { miktar: 2, customerId: null, serialNo: "", makinaSerbest: "ESKİ LOKANTA · S-9 (silinen müşteri)" }, { miktar: 1, customerId: null, serialNo: "" }] },
  // Müşteri alıcı, kısmi tahsis kendi makinasına (iki satır, P1/AC-32).
  { id: 203, aliciTipi: "musteri", musteriId: 2, partId: 7, miktar: 5, tarih: "2026-07-10", tahsisler: [{ miktar: 2, customerId: 2, serialNo: "S-120" }] },
  // Dış firma, tahsissiz.
  { id: 204, aliciTipi: "bayi", disFirma: true, disFirmaAd: "Usta Servis", partId: 7, miktar: 1, tarih: "2026-08-01", tahsisler: [] },
  // Bayisi bulunamayan, tahsissiz; tarihsiz kargo.
  { id: 205, aliciTipi: "bayi", dealerId: 99, partId: 7, miktar: 1, tarih: "", tahsisler: [] },
  // Aynı bayi (50) ikinci satış, tahsissiz (P1: alıcı başına tek satır).
  { id: 206, aliciTipi: "bayi", dealerId: 50, partId: 7, miktar: 2, tarih: "2026-08-03", tahsisler: [] },
  // Aşırı tahsis (Kayış): satış 1, tahsis 2.
  { id: 207, aliciTipi: "bayi", dealerId: 50, partId: 8, miktar: 1, tarih: "2026-08-05", tahsisler: [{ miktar: 2, customerId: 1, serialNo: "S-100" }] },
];
export const VERI = { customers: CUSTOMERS, services: SERVICES, partSales: [], yedekParcaSatislar: YEDEK, parts: PARTS };
export const ARALIK = { baslangic: "2026-05-01", bitis: "2026-07-31" };
