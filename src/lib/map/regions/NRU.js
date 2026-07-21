// ÜRETİLMİŞ DOSYA — elle düzenlemeyin.
// Kaynak: scripts/gen-map-paths.cjs (Natural Earth + GeoNames). Yeniden üretmek için:
//   node scripts/gen-map-paths.cjs
export const W = 1000;
export const H = 1220;
export const BOLGE_ADLARI = ["Anetan","Ewa","Baiti","Uaboe","Nibok","Denigomodu","Aiwo","Boe","Yaren","Meneng","Anibare","İyuv","Anabar","Buada"];
export const BOLGELER = ["M480.2,58.1L631.2,0L634.7,273.2Z","M359.7,104.4L480.2,58.1L634.7,273.2L616.1,398.9Z","M219.7,158.3L359.7,104.4L616.1,398.9L600.0,517.9Z","M127.5,193.7L219.7,158.3L600.0,517.9L591.3,591.0Z","M65.8,430.4L127.5,193.7L591.3,591.0L578.1,690.1L265.5,600.6Z","M0,682.9L65.8,430.4L265.5,600.6L195.8,670.3Z","M99.1,923.6L0,682.9L195.8,670.3L216.7,886.3Z","M185.6,1133.4L99.1,923.6L216.7,886.3L259.9,960.0Z","M508.8,1195.5L185.6,1133.4L259.9,960.0L363.0,872.3Z","M916.8,852.5L879.9,967.1L631.2,1219.0L508.8,1195.5L363.0,872.3L565.0,781.8Z","M1000,415.0L916.8,852.5L565.0,781.8L578.1,690.1L591.3,591.0L600.0,517.9L616.1,398.9L634.7,273.2Z","M963.8,150.1L1000,415.0L634.7,273.2Z","M631.2,0L963.8,150.1L634.7,273.2Z","M578.1,690.1L565.0,781.8L363.0,872.3L259.9,960.0L216.7,886.3L195.8,670.3L265.5,600.6Z"];
// sadeAd -> bölge sırası (BOLGELER dizisindeki indeks)
export const SEHIR = {"yangor":6,"uaboe":3,"ronave":11,"baiti":2,"ijuw":10,"arubo":2,"anibare":10,"anabar":12,"yaren":8,"arijejen":6,"arenibek":13,"boe":7,"menen":9,"nibok":4,"denigomodu":5,"yarendistrict":8,"baitsidistrict":2,"anetan":0,"ewa":1,"aiwo":6,"meneng":9,"iyuv":11,"buada":13};
// sadeAd -> [dünyaX, dünyaY, ülkeX, ülkeY] — yalnız pin konabilecek şehirler
export const KONUM = {};
