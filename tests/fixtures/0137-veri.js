// Spec 0137 ortak veri. Kıyas (C9, AC-80) için katalog bağlı işlem kalemi OLMAYAN veri: 0135'in eski biçimli parçaları ve
// 0135'in kalem listeli parçaları (yalnız serbest işlem kalemi, malzeme + serbest işlem karma, boş tutarlı serbest kalem, geçmişli
// serbest kalem). Altın `tests/fixtures/0137-once.json` bu veriyle spec öncesi koddan üretildi (`YAZ_0137=1`).
import * as V35 from "./0135-veri.js";

export const M304 = V35.M304;
export const MSAC = V35.MSAC;
export const MALZEMELER = V35.MALZEMELER;
export const TEDARIKCILER = [...V35.TEDARIKCILER, { id: 803, ad: "Isıl İşlem Ltd." }];
export const PARCALAR = [
  ...V35.PARCALAR,
  { id: 81, ad: "Yalnız serbest işlem", kod: "S-81", models: [], fiyatTRY: 300, fiyatKipi: "maliyet", maliyetKalemleri: [{ tur: "islem", ad: "Lazer kesim", tedarikciId: 802, tutar: 42.5 }],
    maliyetGecmisi: [{ gecerli: "", kurus: 3000 }, { gecerli: "2026-04-01", kurus: 4250 }] },
  { id: 82, ad: "Karma mil", kod: "K-82", models: [], fiyatTRY: 5000, maliyetKalemleri: [
    { tur: "malzeme", malzemeId: 501, bicim: "mil", yontem: "kilo", cap: 50, boy: 120, payCap: 2, payBoy: 3, adet: 2 },
    { tur: "islem", ad: "Isıl işlem", tedarikciId: 803, tutar: 15 },
    { tur: "islem", ad: "Kaplama", tutar: null }] },
  { id: 83, ad: "Boş serbest", kod: "B-83", models: [], maliyetKalemleri: [{ tur: "islem", ad: "Taşlama", tutar: null }] },
  { id: 84, ad: "Karma sac", kod: "K-84", models: [], fiyatTRY: 900, fiyatKipi: "maliyet", karKati: 1.8, maliyetKalemleri: [
    { tur: "malzeme", malzemeId: 502, bicim: "sac", kalinlik: 2, en: 100, boy: 150, adet: 1 },
    { tur: "islem", ad: "Büküm", tutar: 7.25 }] },
  { id: 85, ad: "Karma set", kod: "S-85", models: [], fiyatTRY: 2000, setIcerigi: [{ partId: 82, miktar: 1 }, { partId: 81, miktar: 3 }] },
];
export const MODELLER = { standardModels: [{ model: "AK100", defaultParcalar: [...V35.MODELLER.standardModels[0].defaultParcalar, { partId: 81, miktar: 2 }, { partId: 82, miktar: 1 }, { partId: 84, miktar: 1.5 }, { partId: 85, miktar: 1 }] }], customModels: [] };
export const PART_STOCK = V35.PART_STOCK;
export const FIYAT_AYARLARI = { varsayilanKat: 2, yuvarlama: "yukari10" };
