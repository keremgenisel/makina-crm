// ÜRETİLMİŞ DOSYA — elle düzenlemeyin.
// Kaynak: scripts/gen-map-paths.cjs (Natural Earth + GeoNames). Yeniden üretmek için:
//   node scripts/gen-map-paths.cjs
export const W = 1000;
export const H = 1488;
export const BOLGE_ADLARI = ["Sain George","Saint David","Saint Andrew","Saint Patrick","Saint Mark","Saint John","Carriacou and Petite Martinique"];
export const BOLGELER = ["M296.6,1424.0L263.6,1487.6L167.9,1450.9L92.6,1485.9L0,1471.9L113.1,1393.1L108.8,1185.0L287.2,1182.7L314.5,1257.0L278.2,1268.6L260.0,1379.9Z","M458.0,1300.8L438.4,1371.2L296.6,1424.0L260.0,1379.9L278.2,1268.6L314.5,1257.0L364.4,1243.0Z","M516.7,997.0L508.1,1118.1L458.0,1300.8L364.4,1243.0L314.5,1257.0L287.2,1182.7L353.0,1048.1L371.2,990.0Z","M299.0,865.4L328.4,829.4L449.2,827.6L516.7,997.0L371.2,990.0Z","M207.9,976.5L299.0,865.4L371.2,990.0L353.0,1048.1Z","M108.8,1185.0L207.9,976.5L353.0,1048.1L287.2,1182.7Z","M1000,212.1L951.3,197.6L811.8,252.4L1000,0Z"];
// sadeAd -> bölge sırası (BOLGELER dizisindeki indeks)
export const SEHIR = {"victoria":4,"upperlataste":3,"tivoli":2,"sauteurs":3,"saintgeorges":0,"saintdavids":1,"hillsborough":6,"grenville":2,"grandroy":5,"gouyave":5,"saintgeorge":0,"saintmark":4,"saingeorge":0,"saintdavid":1,"saintandrew":2,"saintpatrick":3,"saintjohn":5,"carriacouandpetitemartinique":6};
// sadeAd -> [dünyaX, dünyaY, ülkeX, ülkeY] — yalnız pin konabilecek şehirler
export const KONUM = {};
