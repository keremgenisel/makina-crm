// Spec 0159 C7/2, C7/3, P3, P4 (AC-16): kıyas ayıklaması. Eski altınlar yenilenmez; iki taraf da aynı biçime çevrilir:
//   - adlar (R1/2, R7/2): belgedeki yeni başlık, sütun ve toplam adları eski adlara döner;
//   - R6/2'nin bilinçli farkı: maliyeti yalnız alım ve işlem kalemlerinden gelen parçanın hazır parça satırının tutar alanları ve o
//     satırın bulunduğu bölümün toplam alanları iki taraftan düşer; fiyatlı belgede o bölümler karşılaştırılmaz.
// Yeni ad → eski ad; uzundan kısaya (R1/2, R1/3, R7/2 envanteri). Ekranın ve belgenin metinleri eski biçime döner.
const ADLAR = [
  ["Henüz maliyet kalemi yok. Malzeme kalemi malzemeden hesaplanır, alım ya da işlem kalemi (parça alımı, lazer kesim, kaplama, nakliye) sabit tutardır.",
    "Henüz maliyet kalemi yok. Malzeme kalemi malzemeden hesaplanır, işlem kalemi (lazer kesim, büküm, kaplama, işçilik) sabit tutardır."],
  ["bir parçanın alım ya da işlem kaleminde geçen (satıcı ya da fason) firmalar var", "bir parçanın işlem kaleminde geçen (fason) firmalar var"],
  ["Alım ve işlem tutarları sabittir", "İşlem tutarları sabittir"], ["alım ve işlem kalemleri bugünkü tutarıyla", "işlem kalemleri bugünkü tutarıyla"],
  ["Alımlar ve işlemler toplamı", "İşlemler toplamı"], ["Alımlar ve işlemler", "İşlemler"],
  ["Alım / işlem kalemini kaldır", "İşlem kalemini kaldır"], ["Alım / işlem tedarikçisi", "İşlem tedarikçisi"], ["Alım / işlem tutarı", "İşlem tutarı"],
  ["Alım / işlem kalemi ", "İşlem kalemi "], ["Alım ya da işlem adı", "İşlem adı"], ["Alım/işlem ekle", "İşlem ekle"],
  ["Örn: Dış yay alımı, kalaylama", "Örn: Lazer kesim"], ["alım/işlem kalemi", "işlem kalemi"], [">Alım / işlem<", ">İşlem<"],
];
export const ayiklaAd0159 = (html) => ADLAR.reduce((h, [y, e]) => h.split(y).join(e), String(html));
const SATIR_ALANLARI = ["tutarK", "tutarNeden", "dovizTutarK", "paraBirimi", "bedelKalemde"];
const BOLUM_ALANLARI = ["toplamlar", "toplamTLK", "dovizVar", "tutarsizSayi", "genelToplamK", "genelTutarsizSayi", "tutarTLK"];
export const ayiklaMotor0159 = (x, partIds) => {
  const ids = new Set(partIds.map(String));
  const ilgili = (o) => ["satirlar", "hazirParcalar"].some(k => Array.isArray(o?.[k]) && o[k].some(s => ids.has(String(s?.partId))));
  const yuru = (o) => {
    if (Array.isArray(o)) return o.map(yuru);
    if (!o || typeof o !== "object") return o;
    const sil = new Set([...(ids.has(String(o.partId)) && !("islemId" in o) && !("parca" in o) ? SATIR_ALANLARI : []), ...(ilgili(o) ? BOLUM_ALANLARI : [])]);
    return Object.fromEntries(Object.entries(o).filter(([k]) => !sil.has(k)).map(([k, v]) => [k, yuru(v)]));
  };
  return yuru(JSON.parse(JSON.stringify(x)));
};
// Fiyatlı belge (triyaj bulgu 2): etkilenen parçanın hazır satırını taşıyan bölüm KARŞILAŞTIRILIR; yalnız o satırın tutar hücresi
// (son hücre), bölümün "Bölüm toplamı" satırı ve genel toplam satırı iki taraftan aynı yer tutucuya çevrilir. Öteki satırlar ve
// tablolar (aynı bölümdeki etkilenmeyen parçaların tutar hücreleri dahil) birebir kalır.
const satirTutariNotr = (tablolar, ad) => tablolar.replace(/<tr>([\s\S]*?)<\/tr>/g, (m, ic) => (ic.includes(`>${ad}`)
  ? `<tr>${ic.replace(/(<td[^>]*>)(?:(?!<td)[\s\S])*?<\/td>$/, "$1§tutar</td>")}</tr>` : m));
const bolumNotr = (b, adlar) => {
  const k = b.indexOf("data-islemler"); const bas = k < 0 ? b : b.slice(0, k); const son = k < 0 ? "" : b.slice(k);
  if (!adlar.some(ad => bas.includes(`>${ad}`))) return b;
  const tablolar = adlar.reduce(satirTutariNotr, bas);
  return (tablolar + son).replace(/<div data-bolum-toplami[^>]*>[\s\S]*?<\/div>/, "§bolum-toplami").replace(/<div data-genel-toplam[^>]*>[\s\S]*?<\/div>/, "§genel-toplam");
};
export const ayiklaBelge0159 = (html, adlar = []) => {
  const parcalar = ayiklaAd0159(html).split('<div class="siparis-bolum"');
  return [parcalar[0], ...parcalar.slice(1).map(b => bolumNotr(b, adlar))].join('<div class="siparis-bolum"');
};
