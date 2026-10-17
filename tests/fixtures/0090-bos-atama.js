// Spec 0090 R5/2 (C16, C17 deseni): spec öncesi doğrulayıcı ve tekrarlayan üretim, atama taşımayan her kaleme dört anahtarı BOŞ
// değerle yazıyordu (atamaTur "", makinaTur null, makinaId null, modelSatirlari []). 0090'dan beri bu anahtarlar hiç yazılmaz.
// Spec öncesi koddan üretilmiş altın dosyalar YENİLENMEZ; karşılaştırmadan önce altından yalnız bu BOŞ değerler ayıklanır.
// Dolu bir atama (ör. "model" ve satırları) ayıklanmaz: o veri birebir korunur ve altınla aynen karşılaştırılır.
// Yeni yazımın aynası (gider.atamaVerisiKoru): makina alanları yalnız makina atamasında, model satırları yalnız model atamasında.
const BOS = {
  atamaTur: (v) => v === "",
  makinaTur: (v, x) => v == null && x.atamaTur !== "makina",
  makinaId: (v, x) => v == null && x.atamaTur !== "makina",
  modelSatirlari: (v, x) => Array.isArray(v) && v.length === 0 && x.atamaTur !== "model",
};
export const bosAtamaAyikla = (x) => {
  if (Array.isArray(x)) return x.map(bosAtamaAyikla);
  if (!x || typeof x !== "object") return x;
  const r = {};
  for (const [k, v] of Object.entries(x)) {
    if (k in BOS && BOS[k](v, x)) continue;
    r[k] = bosAtamaAyikla(v);
  }
  return r;
};
