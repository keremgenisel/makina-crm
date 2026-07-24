// Servis Panosu yeni-servis alarmı — saf tespit mantığı (test edilir).
//
// "Yeni" = bilinen id kümesinde OLMAYAN, durumu "Bekliyor" ve panoda gizli olmayan servis.
// Çağıran (ServisPanosu) bilinen kümeyi ilk yüklemede tüm servis id'leriyle tohumlar (backlog
// ötmesin) ve her döngüde tümünü ekler; ayrıca kiosk'un kendi eklediği id'leri ayrıca eler.
export function yeniBekleyenler(bilinenIdSet, services = []) {
  if (!Array.isArray(services)) return [];
  const bilinen = bilinenIdSet instanceof Set ? bilinenIdSet : new Set(bilinenIdSet || []);
  const yeni = [];
  for (const s of services) {
    if (!s || s.id == null) continue;
    if (s.durum === "Bekliyor" && s.panoGizli !== true && !bilinen.has(s.id)) yeni.push(s.id);
  }
  return yeni;
}
