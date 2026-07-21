// ÜRETİLMİŞ DOSYA — elle düzenlemeyin.
// Kaynak: scripts/gen-map-paths.cjs (Natural Earth + GeoNames). Yeniden üretmek için:
//   node scripts/gen-map-paths.cjs
export const W = 1000;
export const H = 2026;
export const BOLGE_ADLARI = ["Gros Islet","Castries","Anse la Raye","Soufrière","Choiseul","Laborie","Vieux Fort","Micoud","Praslin","Dennery","Dauphin"];
export const BOLGELER = ["M502.9,328.4L668.6,18.0L840.2,0L817.3,91.1L907.4,170.6L769.2,277.2L730.3,463.4L615.1,442.7Z","M263.9,625.0L502.9,328.4L615.1,442.7L730.3,463.4L705.0,667.8L602.3,1084.6L602.3,1197.1L499.5,1124.3L480.2,740.6Z","M57.5,1038.8L263.9,625.0L480.2,740.6L499.5,1124.3L448.1,1263.2L345.4,1236.8L191.2,1058.2Z","M51.2,1655.3L0,1246.7L57.5,1038.8L191.2,1058.2L345.4,1236.8L448.1,1263.2L499.5,1124.3L602.3,1197.1L583.0,1375.7L527.2,1407.0L494.6,1425.3L146.3,1580.7Z","M303.3,1844.9L153.4,1786.5L51.2,1655.3L146.3,1580.7L494.6,1425.3L497.9,1451.5Z","M568.9,1980.0L303.3,1844.9L497.9,1451.5L585.4,1741.8Z","M820.2,1751.2L750.0,1823.4L703.7,2025.0L568.9,1980.0L585.4,1741.8L497.9,1451.5L494.6,1425.3L527.2,1407.0Z","M952.6,1438.9L875.3,1733.7L820.2,1751.2L527.2,1407.0L583.0,1375.7Z","M962.7,1041.6L952.6,1438.9L583.0,1375.7L602.3,1197.1L602.3,1084.6L801.3,1097.9Z","M1000,660.6L962.7,1041.6L801.3,1097.9L602.3,1084.6L705.0,667.8Z","M907.4,170.6L962.8,282.4L1000,660.6L705.0,667.8L730.3,463.4L769.2,277.2Z"];
// sadeAd -> bölge sırası (BOLGELER dizisindeki indeks)
export const SEHIR = {"vieuxfort":6,"soufriere":3,"praslin":8,"mornedoudon":1,"monrepos":8,"monchy":0,"micoud":7,"laresource":6,"lapointe":8,"laborie":5,"labbayee":1,"grosislet":0,"forestiere":1,"dennery":9,"corinthe":0,"ciceron":1,"choiseul":4,"castries":1,"capestate":0,"cantonement":5,"canaries":3,"cabiche":1,"bisee":1,"bexon":1,"balata":1,"augier":5,"anselaraye":2,"anseger":7,"bocage":1,"beausejour":0,"granderiviere":0,"laclery":1,"entrepot":1,"bagatelle":1,"pavee":1,"pierrot":6,"tirocher":7,"auleon":9,"dauphin":10};
// sadeAd -> [dünyaX, dünyaY, ülkeX, ülkeY] — yalnız pin konabilecek şehirler
export const KONUM = {"grosislet":[330.2,209.2,656.5,206.2],"castries":[330,209.5,368.8,581.1]};
