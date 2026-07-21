// ÜRETİLMİŞ DOSYA — elle düzenlemeyin.
// Kaynak: scripts/gen-map-paths.cjs (Natural Earth + GeoNames). Yeniden üretmek için:
//   node scripts/gen-map-paths.cjs
export const W = 1000;
export const H = 1745;
export const BOLGE_ADLARI = ["Vava'u","Eua","Tongatapu","Haʻapai"];
export const BOLGELER = ["M982.1,0L1000,12.8L996.7,31.9L969.2,47.6L967.2,63.3L955.7,44.1L937.3,44.1L931.6,30.6L952.1,17.2L961.3,1.6ZM678.6,114.9L678.6,114.9L678.6,114.9Z","M565.1,1261.3L567.8,1278.7L562.7,1337.0L535.1,1310.6L538.1,1292.8Z","M499.5,1182.8L501.7,1201.4L476.9,1219.7L478.4,1238.9L463.3,1250.0L436.8,1225.0L386.2,1206.0L369.2,1178.2L373.4,1166.8L394.9,1154.2L379.7,1172.9L394.6,1181.8L419.3,1176.9L432.8,1185.7L424.3,1198.9L460.6,1205.1L488.5,1182.3ZM0,1744.9L0,1744.9L0,1744.9Z","M806.0,568.5L821.4,549.3L830.0,552.7L823.8,576.8ZM497.8,527.2L507.2,559.2L490.0,562.2L484.7,544.7ZM830.1,536.9L851.1,514.6L844.9,544.4ZM849.6,489.6L849.6,489.6L849.6,489.6Z"];
// sadeAd -> bölge sırası (BOLGELER dizisindeki indeks)
export const SEHIR = {"veitongo":2,"vaini":2,"utulau":2,"tokomololo":2,"tefisi":0,"teekiu":2,"taanea":0,"puke":2,"pea":2,"pangai":3,"pangaimotu":0,"ohonua":1,"nukunuku":2,"nukualofa":2,"niutoua":2,"neiafu":0,"navutoka":2,"mua":2,"mataika":0,"matahau":2,"malapo":2,"longoteme":2,"longomapu":0,"leimatua":0,"lapaha":2,"kolovai":2,"kolonga":2,"houma":2,"holonga":2,"hofoa":2,"haveluloto":2,"haateiho":2,"haasini":2,"haalalo":2,"haakame":2,"fuaamotu":2,"foui":2,"fangaleounga":3,"folaha":2,"pelehake":2,"tatakamotonga":2,"tofoakoloua":2,"siaatoutai":2,"popua":2,"tukutonga":2,"haatua":1,"vavau":0,"eua":1,"tongatapu":2,"haapai":3};
// sadeAd -> [dünyaX, dünyaY, ülkeX, ülkeY] — yalnız pin konabilecek şehirler
export const KONUM = {"nukualofa":[17.7,323.9,440.5,1188.9]};
