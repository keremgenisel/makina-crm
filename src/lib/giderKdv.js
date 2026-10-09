// Satışlardan hesaplanan KDV'nin gider tarafına TEK kaynağı (spec 0001 C10, plan K1).
// Finans'taki "KDV Karşılaştırması" kartı ve Giderler sekmesi bu fonksiyonu kullanır; ikisi de aylık
// rapor motorunun (hesaplaAylikRapor) toplamKdv'sini alır, KDV'yi yeniden hesaplamaz. Böylece
// Finans ile gider ekranı aynı ay için aynı rakamı verir (tests/gider-kdv-capraz.test.js).
// Karşılaştırma ay bazlıdır: çok aylı aralıkta motor her ay için ayrı çağrılıp toplanır.
import { hesaplaAylikRapor } from "./aylikRapor";
import { kdvObjTopla } from "./gider";

// Spec 0079 R22, R31: aynı motor çağrısından tevkifatlı satışta alıcının beyan edeceği KDV (bilgi rakamı, farka girmez).
export const satisKdvAylar = (veri, aylar = [], secenekler = {}) => {
  const raporlar = aylar.map(ay => hesaplaAylikRapor(veri, ay, secenekler));
  return { kdv: kdvObjTopla(...raporlar.map(r => r.toplamKdv)), aliciBeyan: kdvObjTopla(...raporlar.map(r => r.tevkifatliSatis?.aliciBeyan)) };
};
export const hesaplananKdvAylar = (veri, aylar = [], secenekler = {}) => satisKdvAylar(veri, aylar, secenekler).kdv;
