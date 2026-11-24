// Spec 0162: Analiz'de aynı parça tek satırda. Her durum için bir hareket: kimlikli ve kimliksiz aynı parça ("Ön Kam"), ölü kimlikli
// ama adı katalogda olan satır, adı katalogda olmayan iki ölü kimlik (aynı ad), serbest metin, benzer ad, aksan, boşluk ve büyük harf,
// katalogda boşluklu ad, İngilizce ad, aynı adlı iki canlı parça, yer tutucu adlı katalog kayıtları, düz metin satır, çöpteki parça,
// yeniden tanımlanmış parça ve aynı servisin kimlikli ile kimliksiz satırı. Adetler fikstüre özgüdür (canlı rakamlara bağlanmaz).
export const CUSTOMERS = [
  { id: 1, name: "EGE ÇİFTLİK", model: "AK100", serialNo: "S-1" },
  { id: 2, name: "BİRTAT", model: "AK120", serialNo: "S-2" },
];
export const PARTS = [
  { id: 10, ad: "100_ÖN KESTAMİD KAM", kod: "KAM-1", olcu: "Ø40" },
  { id: 11, ad: "Rulman 6204" },
  { id: 12, ad: "  Keçe Takımı  ", adEN: "Seal Kit" },
  { id: 13, ad: "Işık" },
  { id: 14, ad: "Çift Ad" }, { id: 15, ad: "çift ad" }, // aynı katlanmış ada inen iki canlı parça (R1/3)
  { id: 16, ad: "Parça" }, { id: 17, ad: "Yedek parça" }, // yer tutucu adlı katalog kayıtları (R1/5)
  { id: 18, ad: "Eski Kasnak", deletedAt: "2026-10-01T00:00:00Z" }, // çöpte (AC-8, AC-38)
  { id: 19, ad: "Yeni Burç" }, // silinen 90 numaralının yeniden tanımı (AC-28)
  { id: 20, ad: "Kayış", adEN: "Belt" },
];
const sv = (id, customerId, date, parcalar) => ({ id, customerId, date, repairPlace: "Yerinde Onarım", degisenParcalar: parcalar });
export const SERVICES = [
  sv(101, 1, "2026-03-01", [{ partId: 10, ad: "100_ÖN KESTAMİD KAM", miktar: 5 }]),
  sv(102, 2, "2026-03-02", [{ ad: "100_ön kestamid kam", miktar: 2 }]), // kimliksiz, büyük küçük harf farkı (AC-1, AC-7)
  sv(103, 1, "2026-03-03", [{ partId: 999, ad: "  100_ÖN KESTAMİD KAM ", miktar: 1 }]), // ölü kimlik, adı katalogda (AC-3)
  sv(104, 1, "2026-03-04", [{ ad: "Serbest conta", miktar: 3 }]), // adı katalogda yok (AC-4)
  sv(105, 1, "2026-03-05", [{ partId: 900, ad: "Sökülmüş Mil", miktar: 1 }]), // ölü kimlik, adı yok (AC-24)
  sv(106, 2, "2026-03-06", [{ partId: 901, ad: "Sökülmüş Mil", miktar: 1 }]), // aynı adlı ikinci ölü kimlik (AC-25)
  sv(107, 1, "2026-03-07", [{ ad: "Rulman", miktar: 1 }]), // benzer ad (AC-6)
  sv(108, 1, "2026-03-08", [{ ad: "isik", miktar: 1 }]), // aksan katlanmaz (AC-31)
  sv(109, 1, "2026-03-09", [{ ad: "keçe takımı", miktar: 1 }]), // katalogdaki adın boşluğu (AC-32)
  sv(110, 1, "2026-03-10", [{ ad: "Seal Kit", miktar: 1 }]), // adEN eşleşmez (AC-33)
  sv(111, 1, "2026-03-11", [{ ad: "Çift Ad", miktar: 1 }]), // iki canlı aynı ad (AC-5, AC-26)
  sv(112, 1, "2026-03-12", [{ miktar: 1 }]), // adsız satır: yer tutucu (AC-22)
  sv(113, 1, "2026-03-13", ["Kayış", "Pim seti"]), // düz metin satırlar (AC-27)
  sv(114, 1, "2026-03-14", [{ ad: "Eski Kasnak", miktar: 1 }]), // çöpteki parçanın adı (AC-8)
  sv(115, 1, "2026-03-15", [{ partId: 18, ad: "", miktar: 1 }]), // çöpteki kimlik, kayıt adı boş: gösterim katalogdan (AC-38)
  sv(116, 2, "2026-03-16", [{ partId: 90, ad: "Yeni Burç", miktar: 2 }]), // silinen kimlik, aynı adla yeniden tanımlanmış (AC-28)
  sv(117, 2, "2026-03-17", [{ partId: 10, ad: "100_ÖN KESTAMİD KAM", miktar: 1 }, { ad: "100_ön kestamid kam", miktar: 1 }]), // aynı serviste iki satır (AC-29)
  sv(118, 1, "2026-03-18", [{ partId: 11, ad: "Kayış", miktar: 1 }]), // kimlik önceliği: adı başka parçayla eşleşse de (AC-30)
];
export const YEDEK = [
  { id: 201, aliciTipi: "bayi", dealerId: 50, partId: 10, miktar: 4, tarih: "2026-04-01", tahsisler: [{ miktar: 4, customerId: 2 }] }, // kimlikli kargo (AC-9)
  { id: 202, aliciTipi: "bayi", dealerId: 50, partId: 777, miktar: 2, tarih: "2026-04-02", tahsisler: [] }, // ölü kimlikli kargo: "Yedek parça" kaydına katılmaz (AC-23)
];
export const VERI = { customers: CUSTOMERS, services: SERVICES, partSales: [], yedekParcaSatislar: YEDEK, parts: PARTS, dealers: [{ id: 50, name: "Kuzey Bayi" }] };
// AC-14: yeni kuralla ada göre çözülecek hiçbir hareketi olmayan alt küme (ne kimliksiz ne ölü kimlikli ne düz metin satır).
// Triyaj (bulgu 3): adsız kimlikli satır ve aynı parçanın sonra gelen adlı (eski adlı) kimlikli satırı da var; satırı kimlik yolu
// açtığı için ad kuralı spec öncesiyle aynı kalmalıdır (P1/2).
export const ADSIZ_KIMLIKLI = [
  { id: 130, customerId: 1, date: "2026-03-20", repairPlace: "Yerinde Onarım", degisenParcalar: [{ partId: 20, miktar: 1 }] },
  { id: 131, customerId: 2, date: "2026-03-21", repairPlace: "Yerinde Onarım", degisenParcalar: [{ partId: 20, ad: "Eski Kayış Adı", miktar: 2 }] },
  { id: 132, customerId: 1, date: "2026-03-22", repairPlace: "Yerinde Onarım", degisenParcalar: [{ partId: 12, ad: "Keçe (eski)", miktar: 1 }, { partId: 12, miktar: 1 }] },
];
export const COZULECEKSIZ = {
  ...VERI,
  services: [...SERVICES.filter(s => [101, 118].includes(s.id)), ...ADSIZ_KIMLIKLI],
  yedekParcaSatislar: YEDEK.filter(s => s.id === 201),
};
