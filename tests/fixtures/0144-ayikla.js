// Spec 0144 C4, C4/2 (AC-42): fiyatsız nüshanın kıyas ayıklaması. Parça tablosundaki `malzeme · ` ile başlayan satırların TAMAMI
// düşer (satır sayısı değiştiği için yalnız yeni hücreler ayıklanamaz) ve A-R6'nın fark notu birebir metniyle düşer (plan Karar 34).
export const MALZEME_SATIRI = /<tr><td[^>]*><div style="font-size:9\.5px;color:#64748b;">malzeme · .*?<\/tr>/g;
// 2026-11-15 isteğiyle: belgeden "Alınacak malzeme toplamı" tablosu da kalktı; kıyas onu da (iki taraftan) düşer.
export const TOPLAM_TABLOSU = /<div style="font-size:10px;font-weight:700;color:#94a3b8;margin-top:8px;">Alınacak malzeme toplamı<\/div><table>[\s\S]*?<\/table>/g;
// 2026-11-15 isteği (boydan sipariş): parçanın sipariş adedi hücresi "n boy (… mm)" satırları + altında "N parça" yazar; kıyas hücreyi
// spec öncesi biçimine (yalnız N) indirir.
export const BOY_HUCRESI = />(?:[^<]* boy \([^<]* mm\)(?: \(elle\))?(?:<br>)?)+<div style="font-size:9\.5px;color:#64748b;">([\d.]+) parça<\/div><\/td>/g;
// 2026-11-15 kararı: bölüm sonundaki "farklı sipariş edilen malzeme" notu yeni; kıyas onu düşer.
export const SIPARIS_FARK_NOTU = /<div data-siparis-farki[^>]*>[\s\S]*?<\/div><\/div>/g;
export const ayikla0144 = (html, farkNotu = null) => {
  let s = String(html).replace(MALZEME_SATIRI, "").replace(TOPLAM_TABLOSU, "").replace(BOY_HUCRESI, ">$1</td>").replace(SIPARIS_FARK_NOTU, "");
  if (farkNotu) s = s.split(`<div style="font-size:9.5px;color:#94a3b8;margin-top:6px;">${farkNotu}</div>`).join("");
  return s;
};
