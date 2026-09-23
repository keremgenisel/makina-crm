// Satışlardan hesaplanan KDV'nin gider tarafına TEK kaynağı (spec 0001 C10, plan K1).
// Finans'taki "KDV Karşılaştırması" kartı ve Giderler sekmesi bu fonksiyonu kullanır; ikisi de aylık
// rapor motorunun (hesaplaAylikRapor) toplamKdv'sini alır, KDV'yi yeniden hesaplamaz. Böylece
// Finans ile gider ekranı aynı ay için aynı rakamı verir (tests/gider-kdv-capraz.test.js).
// Karşılaştırma ay bazlıdır: çok aylı aralıkta motor her ay için ayrı çağrılıp toplanır.
import { hesaplaAylikRapor } from "./aylikRapor";
import { kdvObjTopla } from "./gider";

export const hesaplananKdvAylar = (veri, aylar = [], secenekler = {}) =>
  kdvObjTopla(...aylar.map(ay => hesaplaAylikRapor(veri, ay, secenekler).toplamKdv));
