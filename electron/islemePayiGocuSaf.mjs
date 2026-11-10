// Spec 0141 A-R1/2, A-R1/3, A-R2/2, D-R3, D-R3/2, C5 (plan turu kararlar 31, 33): kaldırılan işleme payının TEK katlama kuralı.
// Pay anahtarı taşıyan malzeme kaleminde pay ölçünün üstüne eklenir, sonuç ölçü ile payın ondalık hane sayısının büyüğüne
// yuvarlanır (yalnız kayan nokta artığı silinir: 10,1 + 0,2 = 10,3; 99,9996 + 4 = 103,9996, triyaj bulgu 2), pay
// anahtarı silinir. Aynı fonksiyonu üç yer çağırır: yerel veritabanı göçü (`db.cjs` `islemePayiGocu`), tek türetme
// (`src/lib/maliyetKalemleri.js` `maliyetKalemleriOf`) ve form açılışı (`src/lib/malzeme.js` `malzemeSatiriFormu`); parça
// kartının dokunulmamış kayıt yolu `islemePayiParcaKatla`'yı çağırır.
//
// Saf ES modülüdür, hiçbir şey içe almaz (paketlenmiş uygulamada `src/` okunamaz; `kasaGocuSaf.mjs`, `kalipTamiriGocuSaf.mjs`,
// 0138 göçünün çekirdeği emsali). Pay anahtarı ile ölçü adının eşlemesi burada kendi sabitidir (C5). Pay taşımayan nesne AYNI
// nesne olarak döner (değişmezlik ölçülebilsin, göç yazmasın).

export const PAY_ESLEME = Object.freeze({ cap: "payCap", kalinlik: "payKalinlik", genislik: "payGenislik", en: "payEn", boy: "payBoy" });
const PAY_ANAHTARLARI = Object.values(PAY_ESLEME);

const sayiOf = (v) => {
  if (v == null || v === "") return null;
  // Kayıtta sayı; formda metin ("10,1" ya da "10.1"). Virgül varsa ondalık virgüldür ve nokta binliktir.
  const t = String(v).trim();
  const n = typeof v === "number" ? v : Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : null;
};
// Triyaj (bulgu 2): sabit üç ondalık, üç ondalıktan hassas girilmiş ölçüde maliyeti kuruşlarca değiştiriyordu. Hane sayısı
// iki toplananın büyüğüdür; üstel gösterimli (çok küçük/büyük) sayıda yuvarlama yapılmaz.
const haneSayisi = (x) => { const t = String(x); if (/e/i.test(t)) return null; const i = t.indexOf("."); return i < 0 ? 0 : t.length - i - 1; };
const artiksizTopla = (v, p) => {
  const h = [haneSayisi(v), haneSayisi(p)];
  if (h.includes(null)) return v + p;
  return Number((v + p).toFixed(Math.min(Math.max(...h), 15)));
};

export const payVarMi = (s) => !!s && typeof s === "object" && PAY_ANAHTARLARI.some(a => a in s);

// Tek satırın (malzeme kalemi ya da eski `malzemeSatiri`) katlaması. Sayıya çevrilemeyen ya da sıfır pay ölçüyü değiştirmez,
// anahtarı yine silinir. Ölçü boşken pay ölçü olmaz (boş ölçü boş kalır; kayıt doğrulaması bugünkü gibi reddeder).
export const islemePayiKatla = (s) => {
  if (!payVarMi(s)) return s;
  const out = { ...s };
  for (const [olcu, pay] of Object.entries(PAY_ESLEME)) {
    if (!(pay in out)) continue;
    const p = sayiOf(out[pay]);
    const v = sayiOf(out[olcu]);
    if (p && v != null) out[olcu] = artiksizTopla(v, p);
    delete out[pay];
  }
  return out;
};

// Parçanın iki alanı birlikte (D-R3/2): `maliyetKalemleri[]` (yalnız malzeme kalemleri) ve 0132'den kalan `malzemeSatiri`.
// Değişiklik yoksa aynı parça nesnesi döner.
export const islemePayiParcaKatla = (p) => {
  if (!p || typeof p !== "object") return p;
  let degisti = false;
  const out = { ...p };
  if (Array.isArray(p.maliyetKalemleri)) {
    const k = p.maliyetKalemleri.map(x => (x && x.tur === "malzeme" ? islemePayiKatla(x) : x));
    if (k.some((x, i) => x !== p.maliyetKalemleri[i])) { out.maliyetKalemleri = k; degisti = true; }
  }
  if (p.malzemeSatiri && typeof p.malzemeSatiri === "object") {
    const m = islemePayiKatla(p.malzemeSatiri);
    if (m !== p.malzemeSatiri) { out.malzemeSatiri = m; degisti = true; }
  }
  return degisti ? out : p;
};

// Göç planı (D-R3, D-R3/2, D-R4): ham satırlar `{ id, maliyetKalemleri, malzemeSatiri }` (JSON metin ya da ayrıştırılmış).
// Yalnız değişecek parçaları döndürür; her biri yazılacak iki sütunun yeni JSON metnini taşır (değişmeyen sütun `undefined`).
const ayristir = (v) => {
  if (v == null || v === "") return null;
  if (typeof v !== "string") return v;
  try { return JSON.parse(v); } catch { return null; }
};
export const islemePayiGocPlani = (satirlar = []) => {
  const plan = [];
  for (const r of satirlar || []) {
    const kalemler = ayristir(r.maliyetKalemleri);
    const satir = ayristir(r.malzemeSatiri);
    const p = { maliyetKalemleri: Array.isArray(kalemler) ? kalemler : undefined, malzemeSatiri: satir && typeof satir === "object" ? satir : undefined };
    const k = islemePayiParcaKatla(p);
    if (k === p) continue;
    plan.push({
      id: r.id,
      maliyetKalemleri: k.maliyetKalemleri !== p.maliyetKalemleri ? JSON.stringify(k.maliyetKalemleri) : undefined,
      malzemeSatiri: k.malzemeSatiri !== p.malzemeSatiri ? JSON.stringify(k.malzemeSatiri) : undefined,
    });
  }
  return plan;
};
