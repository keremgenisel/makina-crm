// Spec 0143 D-R3–D-R4/2, C4: kaldırılan boy fiyatı yönteminin göçü (saf ES modülü; kaynak klasörünü okumaz, `islemePayiGocuSaf.mjs`
// emsali). `yontem: "boy"` taşıyan malzeme kalemi işaretli kaleme çevrilir: `yontem` anahtarı silinir, `boydanSiparis: true` ve
// `cubukBoyu` (malzeme kartının geldiği boyu, metreden milimetreye, üç ondalık) yazılır. Kartında geldiği boy yoksa kalem yalnız kilo
// kalemi olur (`yontem` silinir, işaret yazılmaz; D-R3, AC-28). Triyaj (bulgu 3): `yontem` anahtarı HER değerde silinir (0139'un içe
// aktarması `"kilo"` yazıyordu; ölü anahtar veride kalmasın). Anahtarsız kalem dokunulmaz (değişiklik yok).
// İki alan birlikte çevrilir: `maliyetKalemleri[]` ve 0132'den kalan `malzemeSatiri` (D-R3/2). Çağıranlar: `db.cjs` (üç açılış dalı)
// ve yedekten geri yükleme (D-R3/4; yedek dosyası kartın geldiği boyunu taşır).
const ucOndalik = (n) => Number(Number(n).toFixed(3));
const sayi = (v) => { const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v); return Number.isFinite(n) ? n : null; };

// `harita`: Map(String(malzemeId) → geldiği boy, metre). Dönüş: değişmediyse AYNI nesne.
export const boyKalemiCevir = (k, harita) => {
  if (!k || typeof k !== "object" || !("yontem" in k)) return k;
  const { yontem: _y, ...rest } = k;
  if (k.yontem !== "boy") return rest;
  const m = sayi(harita?.get(String(k.malzemeId)));
  return m != null && m > 0 ? { ...rest, boydanSiparis: true, cubukBoyu: ucOndalik(m * 1000) } : rest;
};
export const boyParcaCevir = (p, harita) => {
  if (!p || typeof p !== "object") return p;
  let degisti = false; const out = { ...p };
  if (Array.isArray(p.maliyetKalemleri)) {
    const yeni = p.maliyetKalemleri.map(k => boyKalemiCevir(k, harita));
    if (yeni.some((k, i) => k !== p.maliyetKalemleri[i])) { out.maliyetKalemleri = yeni; degisti = true; }
  }
  if (p.malzemeSatiri && typeof p.malzemeSatiri === "object") {
    const s = boyKalemiCevir(p.malzemeSatiri, harita);
    if (s !== p.malzemeSatiri) { out.malzemeSatiri = s; degisti = true; }
  }
  return degisti ? out : p;
};
// Malzeme dizisinden harita (yedek ve JSON gövdesi için).
export const geldigiBoyHaritasi = (malzemeler = []) => new Map((malzemeler || []).filter(m => m && m.geldigiBoy != null && m.geldigiBoy !== "").map(m => [String(m.id), m.geldigiBoy]));

const ayristir = (v) => {
  if (v == null || v === "") return null;
  if (typeof v !== "string") return v;
  try { return JSON.parse(v); } catch { return null; }
};
// Göç planı: ham satırlar `{ id, maliyetKalemleri, malzemeSatiri }` (JSON metin ya da ayrıştırılmış). Yalnız değişecek parçalar;
// her biri yazılacak iki sütunun yeni JSON metnini taşır (değişmeyen sütun `undefined`).
export const boyGocPlani = (satirlar = [], harita = new Map()) => {
  const plan = [];
  for (const r of satirlar || []) {
    const kalemler = ayristir(r.maliyetKalemleri);
    const satir = ayristir(r.malzemeSatiri);
    const p = { maliyetKalemleri: Array.isArray(kalemler) ? kalemler : undefined, malzemeSatiri: satir && typeof satir === "object" ? satir : undefined };
    const k = boyParcaCevir(p, harita);
    if (k === p) continue;
    plan.push({
      id: r.id,
      maliyetKalemleri: k.maliyetKalemleri !== p.maliyetKalemleri ? JSON.stringify(k.maliyetKalemleri) : undefined,
      malzemeSatiri: k.malzemeSatiri !== p.malzemeSatiri ? JSON.stringify(k.malzemeSatiri) : undefined,
    });
  }
  return plan;
};
