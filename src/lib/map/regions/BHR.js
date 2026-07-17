// ÜRETİLMİŞ DOSYA — elle düzenlemeyin.
// Kaynak: scripts/gen-map-paths.cjs (Natural Earth + GeoNames). Yeniden üretmek için:
//   node scripts/gen-map-paths.cjs
export const W = 1000;
export const H = 1856;
export const BOLGE_ADLARI = ["Al Manāmah","Kuzey Valiliği","Güney Valiliği","Al Wusţá","Muharraq Yönetimi"];
export const BOLGELER = ["M281.8,98.0L380.9,136.1L479.4,96.7L533.0,187.8L395.6,225.2L277.2,167.0Z","M250.7,614.1L160.1,344.1L179.7,142.7L281.8,98.0L277.2,167.0L395.6,225.2L296.2,269.0L330.9,399.0L365.6,592.2ZM28.1,277.1L89.7,422.7L0,414.2Z","M550.1,486.7L555.2,835.3L519.6,1127.8L428.3,1300.3L385.1,1132.1L178.0,780.7L250.7,614.1L365.6,592.2L330.9,399.0L466.6,416.6ZM927.4,1480.3L990.9,1455.1L898.7,1622.8L931.9,1699.9L885.1,1855.8L857.9,1570.9ZM930.4,1398.1L930.4,1398.1L930.4,1398.1ZM1000,1592.7L1000,1592.7L1000,1592.7ZM972.8,1664.7L972.8,1664.7L972.8,1664.7Z","M395.6,225.2L498.6,315.5L558.7,248.5L594.6,434.1L550.1,486.7L466.6,416.6L330.9,399.0L296.2,269.0Z","M515.1,0L643.3,5.7L686.9,202.8L625.3,105.7L540.8,100.0Z"];
// sadeAd -> bölge sırası (BOLGELER dizisindeki indeks)
export const SEHIR = {"sitrah":3,"sanabis":0,"madinatisa":3,"jiddhafs":0,"madinathamad":1,"darkulayb":1,"azzallaq":1,"almuharraq":4,"manama":0,"alhadd":4,"arrifa":3,"almanamah":0,"kuzeyvaliligi":1,"guneyvaliligi":2,"alwusta":3,"muharraqyonetimi":4};
// sadeAd -> [dünyaX, dünyaY, ülkeX, ülkeY] — yalnız pin konabilecek şehirler
export const KONUM = {"sitrah":[637.7,169.7,560.3,330.4],"madinatisa":[637.5,169.7,386.5,280.1],"jiddhafs":[637.5,169.5,386.5,160.4],"madinathamad":[637.5,169.8,289,435.3],"darkulayb":[637.5,170,281.7,559.4],"almuharraq":[637.7,169.4,539.8,57.6],"manama":[637.6,169.5,477,135.7],"arrifa":[637.6,169.8,403.8,396.1]};
