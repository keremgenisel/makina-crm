// ÜRETİLMİŞ DOSYA — elle düzenlemeyin.
// Kaynak: scripts/gen-map-paths.cjs (Natural Earth + GeoNames). Yeniden üretmek için:
//   node scripts/gen-map-paths.cjs
export const W = 1000;
export const H = 1188;
export const BOLGE_ADLARI = ["Serravalle","Domagnano","Faetano","Montegiardino","Fiorentino","Chiesanuova","San Marino","Acquaviva","Borgo Maggiore"];
export const BOLGELER = ["M992.6,229.9L745.0,401.4L671.2,291.7L589.7,366.0L554.0,192.6L393.0,172.9L639.3,46.1L911.6,0Z","M992.6,229.9L1000,439.1L676.3,645.5L559.1,553.5L589.7,366.0L671.2,291.7L745.0,401.4Z","M1000,439.1L872.6,778.5L778.2,786.9L745.0,762.2L676.3,645.5Z","M872.6,778.5L743.8,1081.9L778.2,786.9Z","M743.8,1081.9L525.4,1171.0L467.4,1030.9L523.4,893.0L745.0,762.2L778.2,786.9Z","M525.4,1171.0L413.8,1187.0L131.7,1040.7L40.9,848.1L337.5,910.7L467.4,1030.9Z","M40.9,848.1L0,761.3L271.3,673.8L306.9,550.0L431.7,645.5L523.4,893.0L467.4,1030.9L337.5,910.7Z","M0,761.3L94.6,448.1L292.2,247.6L385.9,412.0L306.9,550.0L271.3,673.8Z","M292.2,247.6L393.0,172.9L554.0,192.6L589.7,366.0L559.1,553.5L676.3,645.5L745.0,762.2L523.4,893.0L431.7,645.5L306.9,550.0L385.9,412.0Z"];
// sadeAd -> bölge sırası (BOLGELER dizisindeki indeks)
export const SEHIR = {"serravalle":0,"sanmarino":6,"poggiodichiesanuova":5,"montegiardino":3,"fiorentino":4,"falciano":0,"faetano":2,"domagnano":1,"dogana":0,"borgomaggiore":8,"acquaviva":7,"fiorina":1,"murata":8,"cailungo":1,"valdragone":1,"chiesanuova":5};
// sadeAd -> [dünyaX, dünyaY, ülkeX, ülkeY] — yalnız pin konabilecek şehirler
export const KONUM = {};
