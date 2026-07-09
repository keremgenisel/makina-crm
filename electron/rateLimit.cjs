// Bellek içi kayan-pencere hız sınırı — saf fonksiyonlar (state dışarıdan Map olarak verilir,
// böylece test edilebilir ve I/O yok). Hem login brute-force hem yazma uçları DoS'u için kullanılır.
// LAN/küçük kurulum için bellek içi yeterli (sunucu yeniden başlayınca sıfırlanır).

// key için pencerede daha fazla isteğe izin var mı? (mevcut sayaç max'ın altında mı)
// windowMs imza simetrisi için var ama burada kullanılmaz (pencere resetAt ile tutulur).
function rateAllow(state, key, now, max, _windowMs) {
  const rec = state.get(key);
  if (!rec || now > rec.resetAt) return true;   // pencere yok/dolmuş → serbest
  return rec.count < max;
}

// key için bir istek/deneme say (pencere yoksa/dolmuşsa yenisini başlat)
function rateHit(state, key, now, windowMs) {
  const rec = state.get(key);
  if (!rec || now > rec.resetAt) state.set(key, { count: 1, resetAt: now + windowMs });
  else rec.count += 1;
}

// key şu an sınırdaysa, pencerenin bitmesine kalan süre (ms); değilse 0.
function rateRetryAfter(state, key, now) {
  const rec = state.get(key);
  return rec && now <= rec.resetAt ? Math.max(0, rec.resetAt - now) : 0;
}

function rateReset(state, key) { state.delete(key); }

// ── Kalıcı sayaç çekirdeği (rec üzerinde saf) ────────────────────────────────
// Login brute-force sayacı SQLite'ta saklanır (sunucu yeniden başlasa da kilit korunsun).
// Bu fonksiyonlar bir DB satırı rec = { count, reset_at } | null üzerinde çalışır.
function bucketAllow(rec, now, max) { return !rec || now > rec.reset_at || rec.count < max; }
function bucketNext(rec, now, windowMs) {
  return (!rec || now > rec.reset_at) ? { count: 1, reset_at: now + windowMs } : { count: rec.count + 1, reset_at: rec.reset_at };
}
function bucketRetryAfter(rec, now) { return rec && now <= rec.reset_at ? Math.max(0, rec.reset_at - now) : 0; }

module.exports = { rateAllow, rateHit, rateRetryAfter, rateReset, bucketAllow, bucketNext, bucketRetryAfter };
