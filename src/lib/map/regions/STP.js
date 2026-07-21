// ÜRETİLMİŞ DOSYA — elle düzenlemeyin.
// Kaynak: scripts/gen-map-paths.cjs (Natural Earth + GeoNames). Yeniden üretmek için:
//   node scripts/gen-map-paths.cjs
export const W = 1000;
export const H = 1670;
export const BOLGE_ADLARI = ["São Tomé","Príncipe"];
export const BOLGELER = ["M219.4,1291.5L284.1,1360.5L298.9,1414.3L278.1,1479.8L198.1,1591.0L116.5,1620.2L95.5,1669.9L54.6,1664.6L0,1476.3L9.1,1430.6L71.2,1350.4L179.9,1287.8Z","M1000,25.2L966.0,51.8L962.8,136.9L938.7,168.4L869.9,134.3L867.4,85.0L901.3,70.3L909.1,22.5L940.3,0Z"];
// sadeAd -> bölge sırası (BOLGELER dizisindeki indeks)
export const SEHIR = {"trindade":0,"saotome":0,"saojoaodosangolares":0,"santoantonio":1,"santoamaro":0,"rosema":0,"agostinhoneto":0,"ribeiraafonso":0,"portoalegre":0,"pontafigo":0,"neves":0,"montecafe":0,"lemos":0,"guadalupe":0,"donaeugenia":0,"diogovaz":0,"bombom":0,"boaentrada":0,"belavista":0,"aguaize":0,"folhafede":0,"almeirim":0,"saomarcal":0,"aguaporca":0,"riboque":0,"micolo":0,"riboquesantana":0,"almas":0,"batepa":0,"belem":0,"capela":0,"changra":0,"covabarro":0,"desejada":0,"diogosimao":0,"maianco":0,"malanza":0,"margaridamanuel":0,"micondo":0,"montaalegre":0,"oboizaquente":0,"obolongo":0,"ototo":0,"pantufo":0,"petepete":0,"praiamorropeixe":0,"ribeirapeixe":0,"torresdias":0,"melhorada":0,"piedade":0,"principe":1};
// sadeAd -> [dünyaX, dünyaY, ülkeX, ülkeY] — yalnız pin konabilecek şehirler
export const KONUM = {"saotome":[518.9,253.9,267.9,1361]};
