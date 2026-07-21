// ÜRETİLMİŞ DOSYA — elle düzenlemeyin.
// Kaynak: scripts/gen-map-paths.cjs (Natural Earth + GeoNames). Yeniden üretmek için:
//   node scripts/gen-map-paths.cjs
export const W = 1000;
export const H = 1227;
export const BOLGE_ADLARI = ["Saint Paul","Saint Philip Paris","Saint Peter","Saint George","Saint John","Saint Mary","Barbuda","Redonda"];
export const BOLGELER = ["M919.7,1072.4L903.5,1148.9L844.5,1103.4L804.1,1120.8L787.8,1057.7L848.5,1038.7L909.1,1032.3Z","M936.6,987.6L1000,1042.8L979.9,1087.8L919.7,1072.4L909.1,1032.3Z","M874.9,954.8L894.3,912.4L945.9,933.6L936.6,987.6L909.1,1032.3L848.5,1038.7L848.5,1021.2Z","M820.0,875.9L874.9,954.8L848.5,1021.2L816.6,1002.2L801.5,908.7Z","M711.8,997.3L670.3,976.0L747.3,938.9L737.7,900.0L820.0,875.9L801.5,908.7L816.6,1002.2L848.5,1021.2L848.5,1038.7L787.8,1057.7L769.7,1003.8Z","M804.1,1120.8L733.4,1120.3L676.0,1077.2L711.8,997.3L769.7,1003.8L787.8,1057.7Z","M752.3,209.3L733.2,219.9L701.7,26.5L752.3,112.6L763.8,73.5L726.3,41.4L754.0,0L783.1,55.8L833.5,48.8L878.1,91.8L916.0,191.2L904.6,270.6L853.7,283.8L817.9,236.2Z","M0,1226.7L0,1226.7L0,1226.7Z"];
// sadeAd -> bölge sırası (BOLGELER dizisindeki indeks)
export const SEHIR = {"willikies":1,"vernons":3,"urlings":5,"tomlinson":4,"swetes":0,"seaviewfarm":4,"saintjohnstonvillage":4,"saintjohns":4,"pottersvillage":4,"piggotts":4,"parham":3,"pares":2,"oldroad":5,"newwinthorpes":4,"liberta":0,"jennings":5,"herberts":4,"grayshill":4,"freetown":1,"freemans":3,"falmouth":0,"englishharbourtown":0,"crosbies":4,"codrington":6,"cedargrove":4,"carlisle":3,"buckleys":4,"bolands":5,"bendals":5,"barneshill":4,"allsaints":4,"jollyharbour":5,"saintclare":4,"sugarfactory":4,"jackshill":4,"stpaulparish":0,"barbudaparish":6,"stgeorgeparish":3,"stpeterparish":1,"stmaryparish":5,"stphilipparish":1,"saintpaul":0,"saintphilipparis":1,"saintpeter":2,"saintgeorge":3,"saintjohn":4,"saintmary":5,"barbuda":6,"redonda":7};
// sadeAd -> [dünyaX, dünyaY, ülkeX, ülkeY] — yalnız pin konabilecek şehirler
export const KONUM = {"saintjohns":[328.5,199.3,745.9,944.3]};
