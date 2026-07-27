import { kargoPlanlandiMi } from "./yedekParcaSatis";

// Servis Panosu yeni-servis alarmı — saf tespit mantığı (test edilir).
//
// "Yeni" = bilinen id kümesinde OLMAYAN, durumu "Bekliyor" ve panoda gizli olmayan servis.
// Çağıran (ServisPanosu) bilinen kümeyi ilk yüklemede tüm servis id'leriyle tohumlar (backlog
// ötmesin) ve her döngüde tümünü ekler; ayrıca kiosk'un kendi eklediği id'leri ayrıca eler.
// Servis "planlanmış" mı? = ileri bir zamana alınmış, henüz panoya DÜŞMEMİŞ Bekliyor servisi.
// Kural: durum "Bekliyor" VE fabrikaGirisZamani (giriş/düşme anı) şu andan (nowIso) ileride.
// Yalnız planlanmış Bekliyor kartları panoda gizlenir; zamanı gelince (nowIso >= giriş) düşer.
// Damgalar yerel duvar-saati string'i; new Date(str) yerel parse eder (mesaiDk/sureDk ile aynı taban).
export function servisPlanlandiMi(s, nowIso) {
  if (!s || s.durum !== "Bekliyor" || !s.fabrikaGirisZamani || !nowIso) return false;
  const g = new Date(s.fabrikaGirisZamani).getTime();
  const n = new Date(nowIso).getTime();
  if (isNaN(g) || isNaN(n)) return false;
  return g > n;
}

// "Yeni" bekleyen servis id'leri. Planlanmış (ileri zamanlı, henüz düşmemiş) servisler
// "yeni" sayılmaz — düşene kadar ne yanıp söner ne bildirir; nowIso giriş anını geçince
// otomatik "yeni" olur → düşüş anında alarm/bildirim tetiklenir. nowIso verilmezse süzme yok.
export function yeniBekleyenler(bilinenIdSet, services = [], nowIso = null) {
  if (!Array.isArray(services)) return [];
  const bilinen = bilinenIdSet instanceof Set ? bilinenIdSet : new Set(bilinenIdSet || []);
  const yeni = [];
  for (const s of services) {
    if (!s || s.id == null) continue;
    if (s.durum === "Bekliyor" && s.panoGizli !== true && !bilinen.has(s.id) && !servisPlanlandiMi(s, nowIso)) yeni.push(s.id);
  }
  return yeni;
}

// Yeni "panoya düşen" kargo id'leri — servisteki yeniBekleyenler'in kargo karşılığı (alarm/bildirim
// servisle AYNI). Kargo, ilk sütuna (Bekliyor) karşılık gelen "Hazırlanıyor" durumunda, silinmemiş,
// planlanmamış (panoya düşme zamanı gelmiş) ve bilinen kümede değilse "yeni" sayılır.
export function yeniKargolar(bilinenIdSet, satislar = [], nowIso = null) {
  if (!Array.isArray(satislar)) return [];
  const bilinen = bilinenIdSet instanceof Set ? bilinenIdSet : new Set(bilinenIdSet || []);
  const yeni = [];
  for (const s of satislar) {
    if (!s || s.id == null) continue;
    if (s.kargoDurum === "Hazırlanıyor" && s.deletedAt == null && !bilinen.has(s.id) && !kargoPlanlandiMi(s, nowIso)) yeni.push(s.id);
  }
  return yeni;
}

// Uygulama GENELİ (pano dışı) yeni-servis bildirimi verilsin mi?
// - Panodayken (aktifTab === "servis") verilmez: orada kartın kendi alarmı (yanıp sönme + ses +
//   şerit) zaten devrede, ikinci bir bildirim gereksiz olur.
// - Alarm ayarı kapalıysa (alarmAcik !== true) veya yeni bekleyen yoksa verilmez.
export function panoDisiBildirimVerilsinMi(aktifTab, alarmAcik, yeniSayisi) {
  return alarmAcik === true && aktifTab !== "servis" && (Number(yeniSayisi) || 0) > 0;
}
