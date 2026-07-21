// ÜRETİLMİŞ DOSYA — elle düzenlemeyin.
// Kaynak: scripts/gen-map-paths.cjs (Natural Earth + GeoNames). Yeniden üretmek için:
//   node scripts/gen-map-paths.cjs
export const W = 1000;
export const H = 2454;
export const BOLGE_ADLARI = ["Grenadines","Saint Andrew","Saint George","Charlotte","Saint David","Saint Patrick"];
export const BOLGELER = ["M788.9,1061.5L643.0,1230.3L622.5,1124.9L766.3,1017.2ZM43.7,2386.6L88.2,2436.1L0,2453.9ZM411.2,1997.9L367.5,2122.1L363.1,2018.3ZM795.6,1582.7L795.6,1582.7L795.6,1582.7Z","M656.6,670.2L555.9,598.6L711.1,451.5L774.3,435.3L792.6,505.3Z","M965.0,563.6L815.4,765.7L656.6,670.2L792.6,505.3Z","M857.4,0L939.4,18.1L1000,221.9L998.5,411.6L965.0,563.6L792.6,505.3L774.3,435.3L807.9,362.3L847.3,370.4L853.3,177.6L886.8,76.2Z","M564.8,353.0L558.8,278.1L640.1,264.9L734.6,34.2L857.4,0L886.8,76.2L853.3,177.6L847.3,370.4L807.9,362.3L768.4,321.7L686.8,385.7Z","M555.9,598.6L531.8,507.7L564.8,353.0L686.8,385.7L768.4,321.7L807.9,362.3L774.3,435.3L711.1,451.5Z"];
// sadeAd -> bölge sırası (BOLGELER dizisindeki indeks)
export const SEHIR = {"vermont":1,"rosehall":4,"questelles":1,"portelizabeth":0,"peruvianvale":2,"newmontrose":2,"layou":5,"kingstown":2,"greiggs":3,"georgetown":3,"dovers":0,"chateaubelair":4,"byeravillage":3,"biabou":2,"barrouallie":5,"edinboro":1,"redemption":2,"calliaqua":2,"petitbordel":4,"sionhill":2,"oldmontrose":2,"gomea":2,"diamond":2,"friendlyvillage":3,"bottleandglass":5,"montrose":2,"richmond":4,"grenadines":0,"saintandrew":1,"saintgeorge":2,"charlotte":3,"saintdavid":4,"saintpatrick":5};
// sadeAd -> [dünyaX, dünyaY, ülkeX, ülkeY] — yalnız pin konabilecek şehirler
export const KONUM = {"kingstown":[329.2,212.2,688.3,695.3],"calliaqua":[329.3,212.3,795.6,777.6]};
