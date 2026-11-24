// Spec 0160: parça aramasının ortak verisi. Kodu, ölçüsü, hammaddesi, cinsi ve İngilizce adı dolu parçalar; hiçbir bilgisi
// olmayan parça; yalnız bir alanı dolu parça; başında ve sonunda boşluk olan kod; `×` ile girilmiş ölçü; 139 karakterlik ad;
// bir set ve bileşenleri. Adlar birbirini içermez (ad sorgusunun kümesi tek anlamlı olsun) ve " · " taşımaz.
export const UZUN_AD = "100_AYNA MAHRUTİ DİŞLİSİ TAKIM PASLANMAZ ÇELİK GÖVDELİ YÜKSEK DEVİRLİ ÇİFT RULMANLI ÖZEL İMALAT UZUN ÖMÜRLÜ SERVİS PARÇASI MODEL SERİSİ A01";
export const PARCALAR = [
  { id: 1, ad: "Rulman 6204", adEN: "Bearing", kod: "625", olcu: "5x16", hammaddeAdi: "Krom çelik", cins: "Bilyalı", tip: "Standart", models: ["AK100"], fiyatTRY: "500", maliyet: 100 },
  { id: 2, ad: "Kayış", kod: "KY-12", tip: "Standart", models: ["AK100"], fiyatTRY: "300", maliyet: 40 },
  { id: 3, ad: "Pim", tip: "Standart", models: [], fiyatTRY: "20" },
  { id: 4, ad: "Cıvata", cins: "DIN 933", tip: "Standart", models: ["AK120"], fiyatTRY: "5" },
  { id: 5, ad: "Somun", kod: "  SM-8  ", tip: "Standart", models: [], fiyatTRY: "3" },
  { id: 6, ad: "Saplama", olcu: "M8 × 40", tip: "Standart", models: [], fiyatTRY: "7" },
  { id: 7, ad: UZUN_AD, kod: "UZ-1", olcu: "Ø30", tip: "Standart", models: [], fiyatTRY: "900" },
  { id: 8, ad: "Dişli Takımı", kod: "DT-1", tip: "Standart", models: [], fiyatTRY: "3000", setIcerigi: [{ partId: 2, miktar: 2 }, { partId: 3, miktar: 4 }] },
  { id: 9, ad: "Eski Mil", kod: "EM-1", tip: "Standart", models: [], deletedAt: "2026-10-01T00:00:00.000Z" },
];
export const canli = (a) => a.filter(x => !x.deletedAt);
// Spec öncesi kodda çalışan (yalnız ad ve Parça Stoğu'nda model) sorgular: R1/4'ün daralmama ölçüsü.
export const AD_SORGULARI = ["rulman", "kay", "pim", "cıvata somun", "", "takım", "ak100", "yok-böyle"];
// Analiz: servislerde değişen parçalar (biri kimliksiz, biri çöpteki parçanın).
export const ANALIZ_VERI = {
  customers: [{ id: 1, name: "EGE", model: "AK100", serialNo: "S1" }],
  services: [
    { id: 101, customerId: 1, date: "2026-03-10", repairPlace: "Yerinde Onarım", degisenParcalar: [{ partId: 1, ad: "Rulman 6204", miktar: 3 }, { partId: 2, ad: "Kayış", miktar: 1 }] },
    { id: 102, customerId: 1, date: "2026-04-10", repairPlace: "Yerinde Onarım", degisenParcalar: [{ ad: "Serbest conta", miktar: 2 }, { partId: 9, ad: "Eski Mil", miktar: 1 }] },
    { id: 103, customerId: 1, date: "2026-05-10", repairPlace: "Yerinde Onarım", degisenParcalar: [{ partId: "4", ad: "Eski Cıvata Adı", miktar: 1 }] },
  ],
  partSales: [], yedekParcaSatislar: [],
};
