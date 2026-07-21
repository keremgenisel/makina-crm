// ÜRETİLMİŞ DOSYA — elle düzenlemeyin.
// Kaynak: scripts/gen-map-paths.cjs (Natural Earth + GeoNames). Yeniden üretmek için:
//   node scripts/gen-map-paths.cjs
export const W = 1000;
export const H = 1243;
export const BOLGE_ADLARI = ["Railik Adalar Zinciri","Ratak Chain"];
export const BOLGELER = ["M151.1,1020.2L151.1,1020.2L151.1,1020.2ZM277.3,1242.7L277.3,1242.7L277.3,1242.7ZM472.9,976.4L478.7,972.7L483.3,961.4L486.9,945.6L496.6,938.4L504.0,930.3L501.2,938.3L489.0,946.5L482.5,970.3L478.2,976.9ZM293.0,648.7L308.6,648.7L300.2,651.8L279.6,647.5ZM253.9,627.7L248.9,617.7L250.8,614.6ZM370.0,1011.8L370.0,1011.8L370.0,1011.8ZM337.9,590.5L337.9,590.5L337.9,590.5ZM0,428.4L0,428.4L0,428.4ZM71.2,339.5L71.2,339.5L71.2,339.5Z","M934.0,911.1L934.0,911.1L934.0,911.1ZM974.0,694.2L974.0,694.2L974.0,694.2ZM1000,921.4L985.4,921.9L982.4,918.5ZM940.9,721.8L935.2,721.0L926.3,714.3L910.1,714.4L905.5,712.4L902.2,705.4L909.5,711.4L926.4,711.4ZM862.5,691.8L856.7,695.2L840.9,697.5L834.3,701.0L821.1,699.9L790.6,686.2L789.8,684.5L826.4,699.2ZM948.6,703.7L948.6,703.7L948.6,703.7ZM745.4,301.7L745.4,301.7L745.4,301.7ZM613.3,180.8L613.3,180.8L613.3,180.8ZM750.4,0L750.4,0L750.4,0Z"];
// sadeAd -> bölge sırası (BOLGELER dizisindeki indeks)
export const SEHIR = {"jabor":0,"majuro":1,"laura":1,"arno":1,"airuk":0,"mili":1,"kili":0,"dalapuligadorrit":1,"delapuligadjarrit":1,"railikadalarzinciri":0,"ratakchain":1};
// sadeAd -> [dünyaX, dünyaY, ülkeX, ülkeY] — yalnız pin konabilecek şehirler
export const KONUM = {"majuro":[980.8,232,859.7,696.2],"dalapuligadorrit":[980.8,232,858.9,696.8],"delapuligadjarrit":[980.8,232,858.9,696.8]};
