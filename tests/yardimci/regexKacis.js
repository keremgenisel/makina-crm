// Testlerde düz metni (bileşen adı, başlık, etiket, cümle) düzenli ifadeye gömmek için: bütün düzenli ifade karakterleri
// kaçışlanır. Yalnız "/" kaçışlamak yetmez; "." her karakterle, "( )" grup olarak eşleşir ve test yanlış geçer
// (CodeQL "Incomplete string escaping", alert #44). Desen olarak yazılmış ifadelerde kullanılmaz.
export const regexKacis = (metin) => String(metin).replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");
