// ÜRETİLMİŞ DOSYA — elle düzenlemeyin.
// Kaynak: scripts/gen-map-paths.cjs (Natural Earth + GeoNames). Yeniden üretmek için:
//   node scripts/gen-map-paths.cjs
export const W = 1000;
export const H = 866;
export const BOLGE_ADLARI = ["Ordino","Canillo","Encamp","La Massana","Sant Julià de Lòria","Escaldes-Engordany","Andorra la Vella"];
export const BOLGELER = ["M551.3,107.7L555.3,203.1L486.6,226.4L430.7,340.2L273.9,308.1L216,211.9L129.8,185.7L174.3,31.0L394.6,0Z","M551.3,107.7L911.3,155.0L886.2,234.7L1000,285.2L897.1,429.5L798.0,293.5L430.7,340.2L486.6,226.4L555.3,203.1Z","M897.1,429.5L868.0,574.9L723.5,595.0L643.4,497.6L538.1,500.5L432.9,436.4L430.7,340.2L798.0,293.5Z","M129.8,185.7L216,211.9L273.9,308.1L430.7,340.2L432.9,436.4L233.1,515.1L125.6,569.8L65.0,462.5L0,471.2L65.9,211.8Z","M125.6,569.8L233.1,515.1L267.5,628.7L486.6,646.2L480.0,769.5L294.6,865.0L119.7,841.7L3.2,637.6Z","M723.5,595.0L673.1,717.3L480.0,769.5L486.6,646.2L267.5,628.7L432.9,436.4L538.1,500.5L643.4,497.6Z","M432.9,436.4L267.5,628.7L233.1,515.1Z"];
// sadeAd -> bölge sırası (BOLGELER dizisindeki indeks)
export const SEHIR = {"vila":5,"soldeu":1,"sispony":3,"eltarter":1,"santjuliadeloria":4,"santacoloma":6,"pasdelacasa":2,"ordino":0,"lesescaldes":5,"lesbons":2,"lamassana":3,"laldosa":3,"lacortinada":0,"erts":3,"encamp":2,"canillo":1,"arinsal":3,"anyos":3,"andorralavella":6,"aixirivall":4,"escaldesengordany":5};
// sadeAd -> [dünyaX, dünyaY, ülkeX, ülkeY] — yalnız pin konabilecek şehirler
export const KONUM = {"lesescaldes":[503.9,116.3,368.8,557.3],"andorralavella":[503.9,116.3,331.1,555.3],"escaldesengordany":[503.9,116.3,368.8,557.3]};
