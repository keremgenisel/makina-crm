// Spec 0141 C2/2, C2/3 (AC-41): kaldırmadan sonra altınlarla kalan iki fark iki taraftan ayıklanır.
// (1) Sipariş motorunun parça satırındaki `pay` anahtarı (C8: satırdan kalktı; altınlarda `"pay": null` ya da sayı duruyor).
//     Yalnız sipariş parça satırından (hem `partId` hem `ihtiyac` taşıyan nesne) silinir; tevkifat oranı gibi başka `pay`
//     alanlarına dokunulmaz.
// (2) `0138-once.json`'un kayıt gövdesi işleme payını taşıyor; aynı katlama kuralı (göçün ve formun fonksiyonu) altına uygulanır,
//     dosya diskte değişmez.
import { islemePayiParcaKatla } from "../../electron/islemePayiGocuSaf.mjs";

const siparisSatiri = (o) => "partId" in o && "ihtiyac" in o;
const payAt = (x) => {
  if (Array.isArray(x)) return x.map(payAt);
  if (x && typeof x === "object") {
    const o = {};
    const sil = siparisSatiri(x);
    for (const [k, v] of Object.entries(x)) if (!(sil && k === "pay")) o[k] = payAt(v);
    return o;
  }
  return x;
};
export const ayikla0141 = (s) => {
  const c = payAt(JSON.parse(JSON.stringify(s)));
  if (c && Array.isArray(c.kayitGovdesi)) c.kayitGovdesi = c.kayitGovdesi.map(islemePayiParcaKatla);
  return c;
};
