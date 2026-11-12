// Spec 0144 C4, C4/2 (AC-42): fiyatsız nüshanın kıyas ayıklaması. Parça tablosundaki `malzeme · ` ile başlayan satırların TAMAMI
// düşer (satır sayısı değiştiği için yalnız yeni hücreler ayıklanamaz) ve A-R6'nın fark notu birebir metniyle düşer (plan Karar 34).
export const MALZEME_SATIRI = /<tr><td[^>]*><div style="font-size:9\.5px;color:#64748b;">malzeme · .*?<\/tr>/g;
export const ayikla0144 = (html, farkNotu = null) => {
  let s = String(html).replace(MALZEME_SATIRI, "");
  if (farkNotu) s = s.split(`<div style="font-size:9.5px;color:#94a3b8;margin-top:6px;">${farkNotu}</div>`).join("");
  return s;
};
