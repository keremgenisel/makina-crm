// Spec 0143 C2/3 (AC-66): dar ortak ayıklama. Hazırlıktan sonra sayılar birebir tutar; yalnız adı değişen ya da kalkan alanlar
// normalleşir: kesit anahtarı yeni biçime çevrilir (silinmez, satır gruplaması kıyasta kalır), eski `yontem: "kilo"` ile yeni
// `boydanSiparis: false` aynı şeyi söyler ve ikisi de düşer (altınlarda boy yöntemli satır yok, hazırlık C2/3), iki kalkan neden metni (geldiği boy girilmedi, lama ve sacda hesaplanmaz) null olur,
// `artanKg`, `kgNeden` (boy yönteminin "kilo hesaplanmaz" alanı) ve `malzemeOzeti`'nin `oran` alanı silinir, yeni `cubukBoyu` ve `tamKg` alanları çıkarılır. Sayısal bir alana dokunulmaz.
export const KALKAN_NEDENLER = Object.freeze([
  "Malzemenin geldiği boy girilmedi; boy adedi hesaplanmaz.",
  "Lama ve sacda boy adedi hesaplanmaz (kesit kartta yok); sipariş kilosu net ihtiyaç ile firenin toplamı.",
]);
export const SAYISAL_ALANLAR_DOKUNULMAZ = true;
const eskiAnahtar = /^([^|]+)\|(kilo|boy)\|(mil|boru|lama|sac)\|(.*)$/;
const yeniAnahtar = (v) => { const m = eskiAnahtar.exec(v); return m ? `${m[1]}|${m[2]}||${m[3]}|${m[4]}` : v; };
const cevir = (x) => {
  if (Array.isArray(x)) return x.map(cevir);
  if (!x || typeof x !== "object") return x;
  const o = {};
  for (const [k, v] of Object.entries(x)) {
    if (k === "artanKg" || k === "kgNeden" || k === "oran" || k === "cubukBoyu" || k === "tamKg") continue;
    if (k === "yontem" && v === "kilo") continue;
    if (k === "boydanSiparis" && v === false) continue;
    if (k === "boyNeden" && KALKAN_NEDENLER.includes(v)) { o[k] = null; continue; }
    if (k === "anahtar" && typeof v === "string") { o[k] = yeniAnahtar(v); continue; }
    o[k] = cevir(v);
  }
  return o;
};
export const ayikla0143 = (x) => cevir(JSON.parse(JSON.stringify(x)));
