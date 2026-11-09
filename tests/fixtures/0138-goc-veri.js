// Spec 0138 göç verisi (R15–R15/4, AC-23–AC-26, AC-43, AC-44). Adet birimli dört işlemin satır tutarı altında 0137 motorunun
// (`disIslem.islemKalemiOzeti`) spec öncesi çıktısıyla sabitlenir (`tests/fixtures/0138-goc-altin.json`).
export const ISLEMLER = [
  { id: 701, ad: "Ayna mahruti dişli takımı", birim: "adet", birimFiyati: 2465, tedarikciId: 801 },
  { id: 702, ad: "Kaplama USD", birim: "adet", birimFiyati: 12.345, paraBirimi: "USD", kur: 41.2378, tedarikciId: 802 },
  { id: 703, ad: "Helis dişli açımı", birim: "adet", birimFiyati: 187.5 },
  { id: 704, ad: "Isıl işlem", birim: "kilo", birimFiyati: 30, tedarikciId: 803 },
  { id: 705, ad: "Çöpteki işlem", birim: "adet", birimFiyati: 50, tedarikciId: 801, deletedAt: "2026-10-01T10:00:00" },
  { id: 706, ad: "Tel erezyon", birim: "adet", tedarikciId: 802 },
  { id: 707, ad: "Euro kursuz", birim: "adet", birimFiyati: 10, paraBirimi: "EUR" },
  { id: 708, ad: "Ondalık fiyat", birim: "adet", birimFiyati: 0.335, paraBirimi: "TRY" },
  { id: 709, ad: "Euro kurlu", birim: "adet", birimFiyati: 1.2, paraBirimi: "EUR", kur: 48.115 },
];
// Altına girecek adet kalemleri (çözülen dört işlem, farklı adetlerle).
export const ADET_KALEMLERI = [
  { tur: "islem", islemId: 701, miktar: 2 }, { tur: "islem", islemId: 702, miktar: 3 }, { tur: "islem", islemId: 703, miktar: 1 },
  { tur: "islem", islemId: 708, miktar: 7 }, { tur: "islem", islemId: 709, miktar: 1000 },
];
const MALZEME = { tur: "malzeme", malzemeId: 501, bicim: "mil", yontem: "kilo", cap: 50, boy: 120, adet: 2 };
const SERBEST = { tur: "islem", ad: "Lazer kesim", tedarikciId: 802, tutar: 42.5 };
export const PARCALAR = [
  { id: 1, maliyetKalemleri: [MALZEME, { tur: "islem", islemId: 701, miktar: 2 }, SERBEST] },
  { id: 2, maliyetKalemleri: [{ tur: "islem", islemId: 704, miktar: 5 }, { tur: "islem", islemId: 704 }] },
  { id: 3, maliyetKalemleri: [{ tur: "islem", islemId: 705, miktar: 1 }, { tur: "islem", islemId: 706, miktar: 1 }, { tur: "islem", islemId: 707, miktar: 1 }] },
  { id: 4, maliyetKalemleri: [{ tur: "islem", islemId: 9999, miktar: 1 }] },
  { id: 5, maliyetKalemleri: [MALZEME, SERBEST] },
  { id: 6, maliyetKalemleri: [{ tur: "islem", islemId: 703, miktar: 1 }, { tur: "islem", islemId: 702, miktar: 0 }, { tur: "islem", islemId: 702, miktar: 1.5 }], deletedAt: "2026-10-02T09:00:00" },
  { id: 7, maliyetKalemleri: ADET_KALEMLERI },
];
