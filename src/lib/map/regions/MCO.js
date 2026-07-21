// ÜRETİLMİŞ DOSYA — elle düzenlemeyin.
// Kaynak: scripts/gen-map-paths.cjs (Natural Earth + GeoNames). Yeniden üretmek için:
//   node scripts/gen-map-paths.cjs
export const W = 1000;
export const H = 788;
export const BOLGE_ADLARI = ["Monaco-Ville"];
export const BOLGELER = ["M574.8,0L1000,388.9L0,787.1Z"];
// sadeAd -> bölge sırası (BOLGELER dizisindeki indeks)
export const SEHIR = {"montecarlo":0,"monaco":0,"lacondamine":0,"fontvieille":0,"saintroman":0,"moneghetti":0,"monacoville":0,"jardinexotique":0,"larousse":0,"larvotto":0};
// sadeAd -> [dünyaX, dünyaY, ülkeX, ülkeY] — yalnız pin konabilecek şehirler
export const KONUM = {"montecarlo":[518.9,112.3,858.7,458.5],"monaco":[518.9,112.3,776.8,508.3]};
