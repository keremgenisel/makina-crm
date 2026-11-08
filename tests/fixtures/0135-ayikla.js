// Spec 0135 R39, R39/2 ayıklaması: maliyetin kaynağı kalem diline geçti ({ tur: "kalem", malzeme, islem } ve tek ibare). Eski
// kıyas altınları (0121, 0132, 0133) spec öncesi kaynak biçimini taşır. Eski veride türetilmiş liste plan turu Karar 31 gereği
// ya yalnız bir malzeme kalemi ya da yalnız işlem kalemleridir; bu yüzden eşleme birebirdir: malzeme kalemi varsa eski
// { tur: "malzeme" }, yalnız işlem kalemi varsa eski { tur: "kirilim", n: işlem sayısı }. Metin tarafında yeni tek ibare eski
// "Malzemeden hesaplanıyor" ibaresine çevrilir. Rakamlara dokunulmaz.
export const kaynakEski = (k) => (k?.tur !== "kalem" ? k : k.malzeme > 0 ? { tur: "malzeme" } : { tur: "kirilim", n: k.islem });
export const kalemMetniEski = (metin) => String(metin).replace(/Maliyet kalemlerinden hesaplanıyor \(\d+ malzeme, 0 işlem kalemi\)/g, "Malzemeden hesaplanıyor");
