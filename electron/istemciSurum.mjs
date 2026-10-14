// Spec 0085: istemcinin uygulama sürümü sunucuya bir HTTP başlığıyla gider ve güvenlik/işlem kaydının
// JSON `detail`'ine yazılır. Başlık adı ve detay alan adı TEK yerde (C1): istemci köprüsü (ipc/data.cjs,
// require(esm)), sunucu (server.cjs, require(esm)) ve iki ekran (src, doğrudan içe aktarım) buradan okur.
// kasaGocuSaf.mjs emsali: saf ES modülü, Electron'a ve React'a bağlı değil.
//
// GÜVENLİK NOTU (C2): bu bir denetim izi alanıdır, güvenlik sınırı değil. Değer istemcinin beyanıdır;
// sunucu yalnız biçim yönünden kırpar, hiçbir yetki ya da kabul kararını ona göre vermez (R8, R20).

export const ISTEMCI_SURUM_BASLIGI = "X-App-Surum";
// `veri_kaydedildi` detayındaki `surum` anahtarı VERİ sürümüdür (çakışma sayacı) ve dokunulmaz;
// uygulama sürümü bu ayrı anahtarla yan yana durur (R6, X4).
export const ISTEMCI_SURUM_ALANI = "istemciSurum";
export const ISTEMCI_SURUM_UZUNLUK = 32;

// R8: [0-9A-Za-z.+-] dışındaki karakterler düşer, en çok 32 karakter; boş kalırsa null (anahtar yazılmaz, R7).
export function istemciSurumKirp(deger) {
  if (deger == null) return null;
  const temiz = String(deger).replace(/[^0-9A-Za-z.+-]/g, "").slice(0, ISTEMCI_SURUM_UZUNLUK);
  return temiz || null;
}

// İstek seçeneklerine sürüm başlığını ekler (mevcut başlıklar korunur). Sürüm yoksa seçenekler aynen döner.
// Çağıran yalnız iki yer: ipc/data.cjs clientFetch ve giriş isteği (R5, C1; kaynak taraması sabitler).
export function surumBasligiEkle(opts = {}, surum) {
  const s = istemciSurumKirp(surum);
  if (!s) return opts;
  return { ...opts, headers: { ...(opts.headers || {}), [ISTEMCI_SURUM_BASLIGI]: s } };
}

// Sunucu tarafı: istek başlığından kırpılmış sürüm (yoksa null).
export function istektenIstemciSurum(baslikDegeri) {
  return istemciSurumKirp(Array.isArray(baslikDegeri) ? baslikDegeri[0] : baslikDegeri);
}

// Detay nesnesine sürümü yalnız varken ekler (R7: yoksa anahtar hiç yazılmaz, null da yazılmaz).
export function detayaSurumEkle(detay, surum) {
  if (!surum) return detay;
  return { ...(detay || {}), [ISTEMCI_SURUM_ALANI]: surum };
}
