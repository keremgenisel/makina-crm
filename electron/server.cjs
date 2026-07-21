// Gömülü HTTP sunucusu — Electron ana sürecinin içinde çalışır.
// PostgreSQL gerekmez; mevcut SQLite (electron/db.cjs) kullanılır.
// Yalnızca "sunucu PC"de çalışır; diğer PC'ler HTTP ile bağlanır.
const express  = require("express");
const compression = require("compression");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");
const os       = require("os");
const fs       = require("fs");
const path     = require("path");
const http     = require("http");
const https    = require("https");
const net      = require("net");
const serverTls = require("./serverTls.cjs");
// electronApp: Electron uygulama nesnesi. buildApp() içinde express örneği de "app" adını
// aldığından (const app = express()), karışmasın diye burada electronApp olarak alınır.
const { BrowserWindow, safeStorage, app: electronApp } = require("electron");
const { kisitliMi, degisenBolumler, yazmaYetkisiVar, eylemDenetimi, dosyaIslemYetkisi, dosyaSilmeYetkisi, sonAdminiDusururMu } = require("./serverAuth.cjs");
const { planSecret } = require("./jwtSecret.cjs");
const { rateAllow, rateHit, rateRetryAfter, escalatingBlockedMs, escalatingNext } = require("./rateLimit.cjs");
const totp = require("./totp.cjs");
const fsx = require("fs");
const files = require("./files.cjs");
const qrcode = require("qrcode");

// Tek port hem HTTP hem HTTPS dinler: muxServer ilk bayta göre soketi httpsSrv (TLS
// handshake 0x16 ile başlar) veya httpPlain'e yönlendirir. Böylece eski http istemciler
// çalışmaya devam ederken yeni istemciler pinlenmiş HTTPS ile şifreli bağlanır (hibrit).
let muxServer  = null; // net.Server — port'u dinleyen çoğullayıcı
let httpPlain  = null; // http.Server (listen edilmez; mux "connection" emit eder)
let httpsSrv   = null; // https.Server (listen edilmez)
let certFp     = null; // aktif sertifikanın SHA-256 parmak izi (istemci pinning bunu doğrular)
let tlsOnlyMode = false; // true → düz HTTP dış bağlantılar reddedilir (yalnız HTTPS); loopback muaf
let db         = null; // electron/db.cjs referansı

// Loopback (sunucunun kendine http çağrıları: /health yoklaması) yalnız-HTTPS modunda bile
// çalışsın diye muaf tutulur — bu trafik makineden çıkmaz.
const isLoopbackAddr = (a) => a === "127.0.0.1" || a === "::1" || a === "::ffff:127.0.0.1";

// ── JWT imza anahtarı ─────────────────────────────────────────────────────────
// Anahtar OS anahtarlığında (safeStorage: DPAPI/Keychain) şifreli dosyada tutulur; DB'de
// düz metin bırakılmaz. Mevcut kurulumdaki eski DB anahtarı korunarak taşınır (token'lar
// geçersiz olmasın). safeStorage kullanılamıyorsa eski davranışa (DB'de düz metin) düşülür.
let cachedSecret = null;
function jwtSecretFile() { return path.join(electronApp.getPath("userData"), "jwt-secret.enc"); }
function getSecret() {
  if (cachedSecret) return cachedSecret;
  let canEncrypt = false;
  try { canEncrypt = !!safeStorage?.isEncryptionAvailable?.(); } catch { canEncrypt = false; }
  let fileSecret = null;
  try { const p = jwtSecretFile(); if (canEncrypt && fs.existsSync(p)) fileSecret = safeStorage.decryptString(fs.readFileSync(p)); } catch { /* bozuk dosya → yeniden üret */ }
  const dbSecret = db.getMetaValue("jwtSecret") || null;
  const generated = crypto.randomBytes(32).toString("hex");
  const plan = planSecret({ fileSecret, dbSecret, generated, canEncrypt });
  try {
    if (plan.writeFile) fs.writeFileSync(jwtSecretFile(), safeStorage.encryptString(plan.secret));
    if (plan.clearDb) db.setMetaValue("jwtSecret", ""); // DB'deki düz metin anahtarı temizle
    if (plan.dbFallback && !dbSecret) db.setMetaValue("jwtSecret", plan.secret); // safeStorage yoksa eski yol
  } catch (e) { console.error("[server] jwtSecret kaydedilemedi:", e.message); }
  cachedSecret = plan.secret;
  return plan.secret;
}
// İstemci oturum jetonu 30 gün geçerli — böylece PC gece/hafta sonu kapatılıp tekrar
// açıldığında şifre tekrar sorulmaz (açılışta sessizce yenilenip süre kayar, bkz. App.jsx).
// Güvenlik: jeton diskte şifreli saklanır ve şifre değişince token_version tüm eski
// jetonları anında iptal eder. Sunucu PC'nin admin jetonu da (issueAdminToken) 30 gün.
function signToken(payload) { return jwt.sign(payload, getSecret(), { expiresIn: "30d" }); }

// Sunucu PC'nin kendi admin jetonunu üretir (şifre sorulmaz — çağıran zaten bu süreçtir).
// GÜVENLİK/REGRESYON: bu iş eskiden POST /auth/refresh-internal ucuyla yapılıyordu ve tek
// koruması isteğin loopback'ten gelmesiydi. Ama loopback bir kimlik değildir: sunucu PC'de
// oturum açabilen HERHANGİ bir OS kullanıcısı şifresiz, 2FA'sız ve iz bırakmadan 30 günlük
// admin jetonu alabiliyordu. Bu, DPAPI'nin çizdiği sınırı deliyordu; o kullanıcı data.db'yi
// çözemezken, veriyi çözen sürecin kendisi ona ağ üzerinden admin veriyordu. Host başlığı da
// doğrulanmadığı için jeton DNS rebinding ile tarayıcıdan dışarı sızdırılabiliyordu.
// Uç nokta tümden kaldırıldı: tek çağıran (electron/ipc/data.cjs) zaten AYNI süreçte, aradaki
// HTTP katmanı hiçbir şey kazandırmıyor, yalnız saldırı yüzeyi üretiyordu.
// Dönüş: jeton (string) veya null (kullanıcı yok / admin değil).
function issueAdminToken(username) {
  if (!username) return null;
  const user = db?.getUserByUsername?.(username);
  if (!user || user.role !== "admin") return null;
  return signToken({ id: user.id, username: user.username, role: user.role, tv: user.token_version ?? 1 });
}

function requireAuth(req, res, next) {
  const h = req.headers["authorization"];
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ error: "Oturum gerekli" });
  try {
    const payload = jwt.verify(h.slice(7), getSecret());
    // Pasif yapılan kullanıcı token süresi dolmadan da kesilsin
    if (db) {
      const u = db.getUserByUsername(payload.username);
      if (!u || !u.is_active) return res.status(401).json({ error: "Oturum gerekli" });
      // Şifre değiştiyse eski token'lar geçersiz: token_version her şifre değişiminde
      // artar, token'daki tv eşleşmiyorsa (eski tv veya tv'siz eski token) oturum düşer
      if ((payload.tv ?? 0) !== (u.token_version ?? 1)) return res.status(401).json({ error: "Oturum gerekli" });
      // Rol jetondan DEĞİL DB'den okunur: tek otorite DB olsun. /api/data izinleri zaten böyle
      // okuyordu, requireAdmin ise jetona bakıyordu; bu asimetri rolü düşürülen bir admin'in
      // eski jetonuyla yönetici kalmasına yol açıyordu. Savunma derinliği: token_version rol
      // değişiminde artık artıyor (db.cjs), bu satır ise jeton yenilense bile rolü taze tutar.
      req.user = { ...payload, role: u.role };
      return next();
    }
    req.user = payload;
    next();
  }
  catch { res.status(401).json({ error: "Oturum süresi doldu" }); }
}
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin yetkisi gerekli" });
  next();
}

// Fiziksel dosya yazma uçları (upload/delete) için yetki: /api/data'daki bölüm denetimiyle
// aynı seviye — salt-okunur/kısıtlı kullanıcı fiziksel dosya ekleyip silemesin.
function requireDosyaYetkisi(req, res, next) {
  const u = db?.getUserByUsername?.(req.user?.username);
  if (!dosyaIslemYetkisi(u?.permissions, req.user?.role)) return res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
  next();
}

// 2FA açık bir kullanıcı için verilen kodu doğrula: önce TOTP (replay: aynı kod iki kez
// kullanılamaz), sonra tek kullanımlık kurtarma kodu (eşleşen hash listeden düşülür). true/false.
function verify2fa(user, code) {
  if (!code) return false;
  const c = String(code).replace(/\s/g, "");
  if (user.totp_secret && totp.verifyToken(c, user.totp_secret)) {
    if (user.totp_last_code && c === user.totp_last_code) return false; // aynı kod tekrar kullanıldı
    db.setUserTotpLastCode(user.id, c);
    return true;
  }
  // Kurtarma kodu (telefon yoksa)
  let hashes = [];
  try { hashes = JSON.parse(user.totp_recovery || "[]"); } catch { hashes = []; }
  const matched = totp.matchRecovery(c, hashes);
  if (matched) {
    db.setUserTotpRecovery(user.id, JSON.stringify(hashes.filter(h => h !== matched)));
    return true;
  }
  return false;
}

// ── Kullanıcı/güvenlik geçmişi kaydı ─────────────────────────────────────────
// Giriş, kullanıcı yönetimi ve 2FA olaylarını security_log'a yazar (sunucu-yetkili).
// Asla şifre/kod içermez. Hata durumunda sessizce yutar — loglama akışı bloklamamalı.
function reqIp(req) {
  const raw = req.socket?.remoteAddress || req.ip || "";
  return String(raw).replace(/^::ffff:/, "") || "?"; // IPv6-eşlemeli IPv4'ü sadeleştir
}
// Blob bölüm anahtarı → okunabilir Türkçe ad (sunucu-tarafı işlem geçmişi kaydında gösterilir).
const BOLUM_ADLARI = {
  customers: "Müşteriler", services: "Servisler", partSales: "Kalıp/Parça Satışları", payments: "Ödemeler",
  dealers: "Bayiler", stock: "Makina Stoğu", notes: "Notlar", parts: "Yedek Parça Tanımları",
  partStock: "Parça Stoğu", partStockLog: "Stok Hareketleri", gorusmeler: "Görüşmeler", dosyalar: "Dosyalar",
  kalipDefs: "Kalıp Tanımları", standardModels: "Standart Modeller", customModels: "Özel Modeller",
  factory: "Firma Bilgileri", appSettings: "Uygulama Ayarları", teklifler: "Teklifler", faturalar: "Faturalar",
  uretimFormlari: "Üretim Formları", partTypeDefs: "Parça Tipleri", calisanlar: "Firma Çalışanları",
};

function logSecurity({ ts, actor, action, target, ip, detail } = {}) {
  try {
    db.writeSecurityEntry({
      ts: ts || new Date().toISOString(),
      actor: actor || null,
      action: action || "",
      target: target || null,
      ip: ip || null,
      detail: detail ? (typeof detail === "string" ? detail : JSON.stringify(detail)) : null,
    });
  } catch (err) { console.error("[server] security_log yazılamadı:", err); }
}

// ── Giriş denemesi sınırı (kademeli/artan kilit — app-lock ile aynı mantık) ───
// İlk 2 yanlış serbest, sonra her yanlış denemede kilit süresi artar (5sn→30sn→2dk→5dk).
// HEM IP HEM kullanıcı adı başına ayrı sayılır — tek IP'den farklı kullanıcı ve aynı
// kullanıcıya farklı IP'lerden brute-force ayrı ayrı yakalanır. Başarılı giriş sayaçları
// tamamen siler; 15 dk hareketsizlikten sonra sayaç sıfırlanır (dürüst kullanıcı kalıcı
// kilitlenmesin). KALICI: sayaçlar SQLite'ta (rate_limit) — sunucu yeniden başlasa da korunur.
const LOGIN_FORGIVE_MS = 15 * 60 * 1000;
function loginLockoutMs(count) {
  if (count < 3) return 0;              // ilk 2 yanlış: gecikme yok
  if (count < 5) return 5 * 1000;       // 3-4: 5 sn
  if (count < 7) return 30 * 1000;      // 5-6: 30 sn
  if (count < 10) return 2 * 60 * 1000; // 7-9: 2 dk
  return 5 * 60 * 1000;                 // 10+: 5 dk
}
const loginKeys = (ip, username) => username ? [`ip:${ip}`, `user:${username}`] : [`ip:${ip}`];
// Engelliyse kalan süre (ms), değilse 0. IP ve kullanıcıdan hangisi daha uzun kilitliyse o döner.
function loginBlockedMs(ip, username, now = Date.now()) {
  let ms = 0;
  for (const key of loginKeys(ip, username)) {
    ms = Math.max(ms, escalatingBlockedMs(db?.getRateBucket?.(key), now));
  }
  return ms;
}
function loginRateFail(ip, username, now = Date.now()) {
  for (const key of loginKeys(ip, username)) {
    const next = escalatingNext(db?.getRateBucket?.(key), now, loginLockoutMs, LOGIN_FORGIVE_MS);
    db?.setRateBucket?.(key, next.count, next.reset_at);
  }
}
function loginRateSuccess(ip, username) {
  for (const key of loginKeys(ip, username)) db?.deleteRateBucket?.(key);
}

// ── Yazma uçları hız sınırı (DoS koruması) ────────────────────────────────────
// Kimliği doğrulanmış kullanıcı + uç başına dakikalık üst sınır. Ağır /api/data yazması
// (blob) daha sıkı, küçük yazmalar daha gevşek. requireAuth'tan SONRA kullanılmalı (req.user).
const writeRate = new Map();
function writeLimiter(max, windowMs = 60 * 1000) {
  return (req, res, next) => {
    const key = `${req.path}:${req.user?.username || req.socket?.remoteAddress || "?"}`;
    const now = Date.now();
    if (!rateAllow(writeRate, key, now, max, windowMs)) {
      res.set("Retry-After", String(Math.ceil(rateRetryAfter(writeRate, key, now) / 1000)));
      return res.status(429).json({ error: "Çok fazla istek. Lütfen biraz bekleyin." });
    }
    rateHit(writeRate, key, now, windowMs);
    next();
  };
}

// ── Tüm pencerelere event yayını ──────────────────────────────────────────────
function broadcast(channel, ...args) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, ...args);
  }
}

// ── Ortak giriş doğrulama ──────────────────────────────────────────────────────
// HEM /auth/login rotası HEM de sunucu-kurulum yolu (ipc/data.cjs → setupAdmin) bunu kullanır,
// böylece kademeli kilit + 2FA + güvenlik kaydı tek yerdedir ve kurulum ekranı bu korumaları
// ATLAYAMAZ. REGRESYON: setupAdmin eskiden bcrypt.compare + refresh-internal ile doğrulardı;
// bu yol 2FA'yı, kademeli kilidi ve "giris_basarili/basarisiz" kaydını tamamen baypas ediyordu
// (2FA açık admin şifresi sınırsız denenebiliyordu). ip: oran-sınırı/kayıt anahtarı.
// Sonuç: { status, error?, requires2fa?, retryAfterSec?, token?, user? }.
async function authenticateLogin({ username, password, totpCode, ip } = {}) {
  const cleanIp = String(ip || "").replace(/^::ffff:/, "") || "?"; // gösterim için sadeleştir
  if (!username || !password) return { status: 400, error: "Kullanıcı adı ve şifre gerekli" };
  const blockedMs = loginBlockedMs(ip, username);
  if (blockedMs > 0) {
    logSecurity({ actor: username, action: "giris_basarisiz", ip: cleanIp, detail: { sebep: "Çok fazla deneme (geçici engel)" } });
    return { status: 429, error: "Çok fazla başarısız deneme. Lütfen biraz sonra tekrar deneyin.", retryAfterSec: Math.ceil(blockedMs / 1000) };
  }
  if (!db || !db.isActive()) return { status: 503, error: "Veritabanı henüz hazır değil" };
  const user = db.getUserByUsername(username);
  if (!user || !user.is_active) {
    loginRateFail(ip, username);
    logSecurity({ actor: username, action: "giris_basarisiz", ip: cleanIp, detail: { sebep: user ? "Hesap pasif" : "Kullanıcı adı yok" } });
    return { status: 401, error: "Kullanıcı adı veya şifre hatalı" };
  }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    loginRateFail(ip, username);
    logSecurity({ actor: username, action: "giris_basarisiz", ip: cleanIp, detail: { sebep: "Yanlış şifre" } });
    return { status: 401, error: "Kullanıcı adı veya şifre hatalı" };
  }
  // İkinci faktör (opsiyonel, kullanıcı başına): 2FA açıksa TOTP/kurtarma kodu da gerekir.
  if (user.totp_enabled) {
    if (!totpCode) return { status: 401, error: "İki adımlı doğrulama kodu gerekli", requires2fa: true };
    if (!verify2fa(user, totpCode)) {
      loginRateFail(ip, username);
      logSecurity({ actor: username, action: "giris_basarisiz", ip: cleanIp, detail: { sebep: "Yanlış 2FA kodu" } });
      return { status: 401, error: "Doğrulama kodu hatalı", requires2fa: true };
    }
  }
  loginRateSuccess(ip, username);
  // Tek oturum (admin HARİÇ): her girişte token_version artır → aynı kullanıcının başka cihazlardaki
  // oturumu düşer (son giriş kazanır). Admin muaf: sunucu PC gözetimsiz çalışır ve admin jetonunu
  // issueAdminToken ile kendi süreci içinde yeniler; admin'e tek oturum zorlamak sunucu PC'yi kilitlerdi.
  let tv = user.token_version ?? 1;
  if (user.role !== "admin") tv = db.bumpUserTokenVersion(user.id) ?? (tv + 1);
  logSecurity({ actor: user.username, action: "giris_basarili", ip: cleanIp, detail: { rol: user.role, ikiAdimli: !!user.totp_enabled } });
  const token = signToken({ id: user.id, username: user.username, role: user.role, tv });
  return { status: 200, token, user: { id: user.id, username: user.username, role: user.role, permissions: user.permissions ?? null } };
}

// ── Express app ───────────────────────────────────────────────────────────────
function buildApp() {
  const app = express();
  // CORS bilinçli olarak yok: istemciler tarayıcı değil, Electron ana sürecinden fetch
  // yapar (Origin başlığı yok) — CORS başlığı yayınlamak yalnızca saldırı yüzeyini büyütür.
  // gzip: veri blob'u JSON+base64 ağırlıklı, sıkıştırma ağ trafiğini ~%70-90 azaltır.
  app.use(compression());
  // Büyük gövde yalnızca veri kaydetmede gerekli; diğer tüm endpoint'ler küçük JSON alır.
  // 32MB: tipik veri (resimler optimize edilince) birkaç MB; bu üst sınır bol marj bırakır
  // ama tek istekte devasa payload ile bellek DoS'unu sınırlar.
  app.use("/api/data", express.json({ limit: "32mb" }));
  // Dosya yükleme binary gövde alır (JSON değil) — json parser'dan ÖNCE ham parser'a bağla.
  app.use("/api/files/upload", express.raw({ type: () => true, limit: "21mb" }));
  app.use(express.json({ limit: "1mb" }));

  // /health kimliksiz: istemci hem erişilebilirlik yoklaması hem TLS keşfi/doğrulaması için kullanır.
  app.get("/health", (_req, res) => res.json({ ok: true, active: db?.isActive?.() ?? false, tls: !!certFp, fp: certFp || null }));

  // POST /auth/login
  app.post("/auth/login", async (req, res) => {
    try {
      const ip = req.socket?.remoteAddress || req.ip || "?";
      const { username, password, totpCode } = req.body || {};
      const r = await authenticateLogin({ username, password, totpCode, ip });
      if (r.retryAfterSec) res.set("Retry-After", String(r.retryAfterSec));
      if (r.status === 200) return res.json({ token: r.token, user: r.user });
      // retryAfterSec gövdeye de konur: istemci giriş ekranı kademeli kilit geri sayımını gösterir.
      return res.status(r.status).json({ error: r.error, ...(r.requires2fa ? { requires2fa: true } : {}), ...(r.retryAfterSec ? { retryAfterSec: r.retryAfterSec } : {}) });
    } catch (err) {
      console.error("[server] /auth/login hatası:", err);
      res.status(500).json({ error: "Giriş işlemi başarısız" });
    }
  });

  // GET /auth/me — token yenile
  app.get("/auth/me", requireAuth, (req, res) => {
    try {
      const { id, username, role } = req.user;
      const u = db?.getUserByUsername(username);
      logSecurity({ actor: username, action: "oturum_yenilendi", target: username, ip: reqIp(req) });
      res.json({ token: signToken({ id, username, role, tv: u?.token_version ?? 1 }), user: { id, username, role, permissions: u?.permissions ?? null } });
    } catch (err) {
      console.error("[server] /auth/me hatası:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // POST /auth/logout — istemci oturumu kapatırken çağırır; yalnız güvenlik günlüğü için
  // (jetonu istemci zaten atar; sunucuda oturum durumu tutulmaz).
  app.post("/auth/logout", requireAuth, writeLimiter(60), (req, res) => {
    logSecurity({ actor: req.user.username, action: "cikis", target: req.user.username, ip: reqIp(req) });
    res.json({ ok: true });
  });

  // PATCH /auth/me/password — kendi şifresini değiştir
  app.patch("/auth/me/password", requireAuth, writeLimiter(20), async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword || newPassword.length < 6) return res.status(400).json({ error: "Geçersiz parametre" });
      const user = db.getUserByUsername(req.user.username);
      if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      if (!await bcrypt.compare(currentPassword, user.password)) return res.status(401).json({ error: "Mevcut şifre hatalı" });
      db.updateUser(user.id, { password: await bcrypt.hash(newPassword, 10) });
      logSecurity({ actor: user.username, action: "sifre_degistirildi", target: user.username, ip: reqIp(req) });
      // Şifre değişimi token_version'ı artırdı — yeni token GÜNCEL tv ile imzalanır,
      // böylece kullanıcı kendi şifresini değiştirince kendi oturumu düşmez
      const fresh = db.getUserByUsername(user.username);
      res.json({ ok: true, token: signToken({ id: user.id, username: user.username, role: user.role, tv: fresh?.token_version ?? 1 }) });
    } catch (err) {
      console.error("[server] /auth/me/password hatası:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // ── İki adımlı doğrulama (2FA / TOTP) — kullanıcı kendi hesabı için ──────────
  // GET durum
  app.get("/auth/2fa/status", requireAuth, (req, res) => {
    try {
      const u = db.getUserByUsername(req.user.username);
      res.json({ enabled: !!u?.totp_enabled });
    } catch { res.status(500).json({ error: "Sunucu hatası" }); }
  });
  // POST kurulum: yeni secret üret (pending, enabled=0) + QR döndür
  app.post("/auth/2fa/setup", requireAuth, writeLimiter(20), async (req, res) => {
    try {
      const u = db.getUserByUsername(req.user.username);
      if (!u) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      const secret = totp.generateSecret();
      db.setUserTotpSecret(u.id, secret);
      logSecurity({ actor: u.username, action: "2fa_kurulum_baslatildi", target: u.username, ip: reqIp(req) });
      const qr = await qrcode.toDataURL(totp.keyuri(u.username, secret));
      res.json({ secret, qr });
    } catch (err) { console.error("[server] 2fa/setup:", err); res.status(500).json({ error: "Sunucu hatası" }); }
  });
  // POST etkinleştir: pending secret ile kodu doğrula, aç + tek seferlik kurtarma kodları ver
  app.post("/auth/2fa/enable", requireAuth, writeLimiter(20), (req, res) => {
    try {
      const { code } = req.body || {};
      const u = db.getUserByUsername(req.user.username);
      if (!u?.totp_secret) return res.status(400).json({ error: "Önce kurulum yapın" });
      if (!totp.verifyToken(code, u.totp_secret)) return res.status(401).json({ error: "Doğrulama kodu hatalı" });
      const recovery = totp.generateRecoveryCodes(8);
      db.enableUserTotp(u.id, JSON.stringify(recovery.map(totp.hashRecovery)));
      logSecurity({ actor: u.username, action: "2fa_acildi", ip: reqIp(req) });
      // token_version arttı (diğer oturumlar düştü) — bu oturum kapanmasın diye GÜNCEL tv'li taze jeton ver
      const fresh = db.getUserByUsername(u.username);
      res.json({ ok: true, recovery, token: signToken({ id: u.id, username: u.username, role: u.role, tv: fresh?.token_version ?? 1 }) });
    } catch (err) { console.error("[server] 2fa/enable:", err); res.status(500).json({ error: "Sunucu hatası" }); }
  });
  // POST kapat: mevcut şifre ile doğrula, 2FA'yı tamamen kaldır
  app.post("/auth/2fa/disable", requireAuth, writeLimiter(20), async (req, res) => {
    try {
      const { password } = req.body || {};
      const u = db.getUserByUsername(req.user.username);
      if (!u) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      if (!password || !await bcrypt.compare(password, u.password)) return res.status(401).json({ error: "Şifre hatalı" });
      db.disableUserTotp(u.id);
      logSecurity({ actor: u.username, action: "2fa_kapatildi", ip: reqIp(req) });
      // token_version arttı — bu oturum kapanmasın diye taze jeton ver (diğer oturumlar düşer)
      const fresh = db.getUserByUsername(u.username);
      res.json({ ok: true, token: signToken({ id: u.id, username: u.username, role: u.role, tv: fresh?.token_version ?? 1 }) });
    } catch (err) { console.error("[server] 2fa/disable:", err); res.status(500).json({ error: "Sunucu hatası" }); }
  });

  // GET /api/version — hafif polling endpoint: versiyon + güncel izinler
  app.get("/api/version", requireAuth, (req, res) => {
    try {
      const u = db?.getUserByUsername(req.user.username);
      // serverLanIps: istemci, aynı yerel ağda olup olmadığını bu adreslere ulaşarak test eder
      // (rozet + LAN failover). Her kimliği doğrulanmış istemciye verilir; çünkü failover aynı ağdayken
      // istekleri zaten LAN adresine kaydırır ve o durumda istek LAN'dan gelir. IP'ye göre kısıtlamak
      // hem "Yerel Ağ" rozetini hem de LAN yedek adresinin keşfini bozuyordu (regresyon). Fabrika iç
      // IP'leri düşük hassasiyetli ve istek zaten kimlik doğrulaması arkasında.
      res.json({
        dataVersion: db?.getDataVersion?.() ?? null, role: u?.role ?? req.user.role, permissions: u?.permissions ?? null,
        serverLanIps: getLocalIps().filter(ip => !isTailscaleIp(ip)), serverPort: getPort(),
      });
    }
    catch (err) { res.status(500).json({ error: "Sunucu hatası" }); }
  });

  // GET /api/data
  app.get("/api/data", requireAuth, (_req, res) => {
    try {
      if (!db || !db.isActive()) return res.status(503).json({ error: "Veritabanı henüz hazır değil" });
      const blob = db.readBlobFromDb();
      res.json({ ...blob, dataVersion: db.getDataVersion() });
    } catch (err) {
      console.error("[server] /api/data GET hatası:", err);
      res.status(500).json({ error: "Veri okunamadı" });
    }
  });

  // POST /api/data — optimistic locking
  app.post("/api/data", requireAuth, writeLimiter(60), (req, res) => {
    const { data, dataVersion: clientVersion } = req.body || {};
    if (!data || typeof data !== "object") return res.status(400).json({ error: "Geçersiz veri" });
    try {
      if (!db || !db.isActive()) return res.status(503).json({ error: "Veritabanı henüz hazır değil" });
      // Yetki: kısıtlı kullanıcı yalnızca izinli olduğu bölümleri değiştirebilir.
      // İzin sistemi arayüzde de var; bu, elle HTTP isteğiyle atlatmayı engeller.
      // Tam yetkili/admin kullanıcı pahalı fark denetimini atlar.
      const u = db.getUserByUsername(req.user.username);
      const perms = u?.permissions ?? null;
      const rol = u?.role ?? req.user.role;
      const kisitli = kisitliMi(perms, rol);
      // Değişen bölümleri HER yazımda bir kez hesapla: hem yetki denetimi (kısıtlıysa) hem de
      // aşağıdaki sunucu-tarafı işlem geçmişi (herkes için) buradan beslenir.
      const mevcut = db.readBlobFromDb();
      const degisen = degisenBolumler(mevcut, data);
      if (kisitli) {
        const yetki = yazmaYetkisiVar(perms, rol, degisen, mevcut, data);
        if (!yetki.ok) return res.status(403).json({ error: "Bu veriyi değiştirme yetkiniz yok" });
        // Eylem düzeyi: kısmi grup bölüm düzeyinde geçse bile (ör. düzenle var, sil yok),
        // izinsiz EKLE/SİL burada yakalanır ve reddedilir.
        const eylem = eylemDenetimi(mevcut, data, perms, rol);
        if (!eylem.ok) return res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
      }
      const serverVersion = db.getDataVersion();
      if (clientVersion !== undefined && clientVersion !== null && clientVersion !== serverVersion) {
        return res.status(409).json({ error: "Başka bir kullanıcı veriyi güncelledi.", serverVersion });
      }
      db.writeBlobToDb(data);
      const newVersion = db.bumpDataVersion();
      // Sunucu-tarafı işlem geçmişi: HER veri yazımı (admin dâhil), istemci ayrıca /api/audit
      // çağırmasa/uydursa bile, gerçekten DEĞİŞEN bölümlerden türetilerek sunucu-yetkili bir
      // iz bırakır — kurcalamaya dayanıklı kayıt. (İstemcinin ayrıntılı /api/audit kaydı ile
      // birlikte durur; bu kaba satır elle HTTP ile atlatmayı da yakalar.)
      if (degisen.length) {
        try {
          db.writeAuditEntry({
            ts: new Date().toISOString(), username: req.user.username, role: rol,
            action: "veri_kaydedildi", entity: "sunucu", entity_id: null,
            entity_name: degisen.map(b => BOLUM_ADLARI[b] || b).join(", "),
            detail: JSON.stringify({ bolumler: degisen, surum: newVersion }),
          });
        } catch (e) { console.error("[server] sunucu işlem kaydı yazılamadı:", e); }
      }
      broadcast("server:versionUpdate", newVersion);
      broadcast("server:dataChanged", newVersion);
      res.json({ ok: true, newVersion });
    } catch (err) {
      console.error("[server] /api/data POST hatası:", err);
      res.status(500).json({ error: "Veri kaydedilemedi" });
    }
  });

  // GET /api/users (admin)
  app.get("/api/users", requireAuth, requireAdmin, (_req, res) => {
    try { res.json(db.getAllUsers()); }
    catch (err) { console.error("[server] /api/users GET hatası:", err); res.status(500).json({ error: "Sunucu hatası" }); }
  });

  // POST /api/users (admin)
  app.post("/api/users", requireAuth, requireAdmin, writeLimiter(60), async (req, res) => {
    try {
      const { username, password, role = "user", permissions } = req.body || {};
      if (!username?.trim() || !password || !["admin", "user"].includes(role)) return res.status(400).json({ error: "Geçersiz parametre" });
      if (password.length < 6) return res.status(400).json({ error: "Şifre en az 6 karakter olmalı" });
      if (db.getUserByUsername(username.trim())) return res.status(409).json({ error: "Bu kullanıcı adı zaten mevcut" });
      const id = db.createUser(username.trim(), await bcrypt.hash(password, 10), role, permissions ?? null);
      logSecurity({ actor: req.user.username, action: "kullanici_eklendi", target: username.trim(), ip: reqIp(req), detail: { rol: role } });
      res.status(201).json({ id, username: username.trim(), role, is_active: 1, permissions: permissions ?? null });
    } catch (err) {
      console.error("[server] /api/users POST hatası:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // PATCH /api/users/:id (admin)
  app.patch("/api/users/:id", requireAuth, requireAdmin, writeLimiter(60), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { is_active, role, password, permissions } = req.body || {};
      if (password && password.length < 6) return res.status(400).json({ error: "Şifre en az 6 karakter olmalı" });
      // Son-admin koruması: sistemi yöneticisiz bırakacak rol düşürme/pasifleştirmeyi engelle
      if (sonAdminiDusururMu(db.getAllUsers(), id, { role, is_active })) {
        return res.status(400).json({ error: "Sistemde en az bir aktif yönetici kalmalı" });
      }
      const fields = {};
      if (is_active !== undefined)  fields.is_active = is_active;
      if (role && ["admin", "user"].includes(role)) fields.role = role;
      if (password)                 fields.password = await bcrypt.hash(password, 10);
      if (permissions !== undefined) fields.permissions = permissions;
      db.updateUser(id, fields);
      // Neyin değiştiğini özetle (şifre değeri asla yazılmaz — sadece "değişti" bilgisi)
      const degisenler = [];
      if (fields.role !== undefined)        degisenler.push(`rol=${fields.role}`);
      if (fields.is_active !== undefined)   degisenler.push(fields.is_active ? "aktifleştirildi" : "pasifleştirildi");
      if (fields.password !== undefined)    degisenler.push("şifre sıfırlandı");
      if (fields.permissions !== undefined) degisenler.push("yetkiler güncellendi");
      logSecurity({ actor: req.user.username, action: "kullanici_guncellendi", target: db.getUserById(id)?.username || `#${id}`, ip: reqIp(req), detail: { degisen: degisenler.join(", ") || "—" } });
      res.json({ ok: true });
    } catch (err) {
      console.error("[server] /api/users PATCH hatası:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // DELETE /api/users/:id (admin)
  app.delete("/api/users/:id", requireAuth, requireAdmin, writeLimiter(60), (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (id === req.user?.id) return res.status(400).json({ error: "Kendi hesabınızı silemezsiniz" });
      const hedef = db.getUserById(id)?.username || `#${id}`;
      db.deleteUser(id);
      logSecurity({ actor: req.user.username, action: "kullanici_silindi", target: hedef, ip: reqIp(req) });
      res.json({ ok: true });
    } catch (err) {
      console.error("[server] /api/users DELETE hatası:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // DELETE /api/users/:id/2fa — admin bir kullanıcının 2FA'sını sıfırlar (telefon kaybı vb.)
  // STEP-UP: sıfırlamadan önce admin KENDİ şifresini doğrular. Kilitsiz bir admin oturumunun
  // başına geçen (ya da token'ı çalınmış) biri tek tıkla 2FA soyamasın diye — kendi-kapatma
  // (/auth/2fa/disable) ile tutarlı. Yalnızca admin + kayıt yeterli değildi.
  app.delete("/api/users/:id/2fa", requireAuth, requireAdmin, writeLimiter(20), async (req, res) => {
    try {
      const { password } = req.body || {};
      const admin = db.getUserByUsername(req.user.username);
      if (!admin || !password || !await bcrypt.compare(password, admin.password)) {
        return res.status(401).json({ error: "Şifre hatalı" });
      }
      const id = parseInt(req.params.id);
      const hedef = db.getUserById(id)?.username || `#${id}`;
      db.disableUserTotp(id);
      logSecurity({ actor: req.user.username, action: "2fa_sifirlandi", target: hedef, ip: reqIp(req) });
      res.json({ ok: true });
    } catch (err) {
      console.error("[server] /api/users/:id/2fa DELETE hatası:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // POST /api/users/:id/logout-all — admin bir kullanıcıyı TÜM cihazlardan çıkarır (token_version artırır).
  // Şüpheli erişim / çalınan hesap için. Erişim vermez, yalnızca mevcut oturumları düşürür → step-up gerekmez.
  app.post("/api/users/:id/logout-all", requireAuth, requireAdmin, writeLimiter(20), (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const hedef = db.getUserById(id)?.username || `#${id}`;
      db.bumpUserTokenVersion(id);
      logSecurity({ actor: req.user.username, action: "oturumlar_kapatildi", target: hedef, ip: reqIp(req) });
      res.json({ ok: true });
    } catch (err) {
      console.error("[server] /api/users/:id/logout-all hatası:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // GET /api/locks — aktif kilitler
  app.get("/api/locks", requireAuth, (_req, res) => {
    try { res.json(db.listLocks()); }
    catch (err) { res.status(500).json({ error: "Sunucu hatası" }); }
  });

  // POST /api/lock — kilit al
  app.post("/api/lock", requireAuth, writeLimiter(200), (req, res) => {
    try {
      const { entityType, entityId, force = false } = req.body || {};
      if (!entityType || entityId == null) return res.status(400).json({ error: "entityType ve entityId gerekli" });
      // force ile başkasının kilidini devralma (steal) güvenlik günlüğüne yazılır.
      let oncekiSahip = null;
      if (force) {
        try { oncekiSahip = db.listLocks().find(l => l.entity_type === entityType && String(l.entity_id) === String(entityId))?.locked_by || null; }
        catch { oncekiSahip = null; }
      }
      const result = db.acquireLock(entityType, String(entityId), req.user.username, force);
      if (result.ok) {
        if (oncekiSahip && oncekiSahip !== req.user.username) {
          logSecurity({ actor: req.user.username, action: "kilit_devralindi", target: oncekiSahip, ip: reqIp(req), detail: { tur: entityType, kayit: String(entityId) } });
        }
        broadcast("server:locksChanged"); res.json({ ok: true });
      }
      else res.status(423).json(result);
    } catch (err) { res.status(500).json({ error: "Sunucu hatası" }); }
  });

  // DELETE /api/lock — kilit bırak
  app.delete("/api/lock", requireAuth, writeLimiter(200), (req, res) => {
    try {
      const { entityType, entityId } = req.body || {};
      if (!entityType || entityId == null) return res.status(400).json({ error: "entityType ve entityId gerekli" });
      db.releaseLock(entityType, String(entityId), req.user.username);
      logSecurity({ actor: req.user.username, action: "kilit_birakildi", ip: reqIp(req), detail: { tur: entityType, kayit: String(entityId) } });
      broadcast("server:locksChanged");
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: "Sunucu hatası" }); }
  });

  // DELETE /api/locks/all — kullanıcının tüm kilitlerini bırak
  app.delete("/api/locks/all", requireAuth, writeLimiter(200), (req, res) => {
    try {
      db.releaseAllLocksByUser(req.user.username);
      logSecurity({ actor: req.user.username, action: "kilit_birakildi", ip: reqIp(req), detail: { tur: "tümü" } });
      broadcast("server:locksChanged");
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: "Sunucu hatası" }); }
  });

  // ── Dosya arşivi (çok kullanıcılı): dosyalar sunucu PC diskinde durur; istemciler yükler/indirir ──
  // Depo adı (params.name) sanitize edilmiş bir dosya adı (yol ayracı yok); path traversal reddedilir.
  // Tek kaynak: aynı kural hem burada hem IPC tarafında geçerli. İki ayrı kopya zamanla
  // ayrışıyor (sunucudaki NUL baytı denetlemiyordu), o yüzden files.cjs'e taşındı.
  const gecerliDepoAd = (name) => files.depoAdiGuvenliMi(name);

  // POST /api/files/upload — binary gövde; başlıkta orijinal ad. Depoya yazar, künye döndürür.
  app.post("/api/files/upload", requireAuth, requireDosyaYetkisi, writeLimiter(60), (req, res) => {
    try {
      const ad = decodeURIComponent(req.get("X-Dosya-Adi") || "dosya");
      // Firma adı: istemci "X-Dosya-Firma" ile yollar → okunur depo adı ("<Firma> - <ad> - <anahtar>").
      let firma = ""; try { firma = decodeURIComponent(req.get("X-Dosya-Firma") || ""); } catch { firma = ""; }
      if (!files.izinliMi(ad)) return res.status(400).json({ error: "Bu dosya türü desteklenmiyor" });
      const buf = req.body;
      if (!Buffer.isBuffer(buf) || buf.length === 0) return res.status(400).json({ error: "Boş dosya" });
      if (buf.length > files.MAX_BOYUT) return res.status(413).json({ error: "Dosya 20 MB sınırını aşıyor" });
      const anahtar = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const depo = files.depoAdi(anahtar, ad, firma);
      fsx.writeFileSync(files.dosyaYolu(electronApp, depo), buf);
      // Sunucu diskine dosya yazımı işlem geçmişine düşer (istemci künyeyi ayrıca /api/data ile
      // müşteri/bayiye bağlar; bu, ham dosya yazımının kendi sunucu-yetkili izidir).
      try {
        db.writeAuditEntry({
          ts: new Date().toISOString(), username: req.user.username, role: req.user.role,
          action: "yuklendi", entity: "dosya", entity_id: null,
          entity_name: `${firma ? firma + " · " : ""}${ad}`,
          detail: JSON.stringify({ boyut: buf.length }),
        });
      } catch { /* loglama akışı bloklamamalı */ }
      res.json({ dosyaAdi: depo, boyut: buf.length, tur: files.turKategori(ad), ad });
    } catch (err) { console.error("[server] dosya yükleme:", err); res.status(500).json({ error: "Sunucu hatası" }); }
  });

  // GET /api/files/:name — dosyayı indir (binary)
  app.get("/api/files/:name", requireAuth, (req, res) => {
    const name = req.params.name;
    if (!gecerliDepoAd(name)) return res.status(400).json({ error: "Geçersiz dosya adı" });
    const yol = files.dosyaYolu(electronApp, name);
    if (!fsx.existsSync(yol)) return res.status(404).json({ error: "Dosya bulunamadı" });
    // Path traversal yok: name yukarıda gecerliDepoAd ile "/","\\",".." reddedilerek
    // doğrulandı, dosyaYolu da sabit dosyalar klasörüne join eder.
    // nosemgrep: javascript.express.security.audit.express-res-sendfile.express-res-sendfile
    res.sendFile(yol);
  });

  // DELETE /api/files/:name — fiziksel dosyayı sil (çöpten kalıcı silme / orphan temizliği)
  // Yetki hedef dosyaya bağlıdır: künye müşteriye mi bayiye mi ait, ona bakılır. Kullanıcı
  // düzeyinde "müşteri VEYA bayi yazabiliyor mu" sorusu yeterli değildi; künyesine dokunamadığı
  // dosyayı fiziksel olarak silebiliyordu.
  app.delete("/api/files/:name", requireAuth, writeLimiter(60), (req, res) => {
    const name = req.params.name;
    if (!gecerliDepoAd(name)) return res.status(400).json({ error: "Geçersiz dosya adı" });
    const u = db?.getUserByUsername?.(req.user?.username);
    let kunye = null;
    try { kunye = (db?.readBlobFromDb?.()?.dosyalar || []).find(d => d.dosyaAdi === name) || null; }
    catch { kunye = null; }
    if (!dosyaSilmeYetkisi(u?.permissions, req.user?.role, kunye)) {
      return res.status(403).json({ error: "Bu dosyayı silme yetkiniz yok" });
    }
    files.sil(electronApp, name);
    // Diskten kalıcı dosya silme sunucu-yetkili işlem geçmişine düşer (künyeden okunur ad türetilir).
    try {
      db.writeAuditEntry({
        ts: new Date().toISOString(), username: req.user.username, role: req.user.role,
        action: "silindi", entity: "dosya", entity_id: null,
        entity_name: kunye?.ad || name,
        detail: JSON.stringify({ dosyaAdi: name }),
      });
    } catch { /* loglama akışı bloklamamalı */ }
    res.json({ ok: true });
  });

  // POST /api/audit — istemci tarafından çağrılır; username JWT'den alınır
  app.post("/api/audit", requireAuth, writeLimiter(300), (req, res) => {
    try {
      const { action, entity, entity_id, entity_name, detail } = req.body;
      db.writeAuditEntry({ ts: new Date().toISOString(), username: req.user.username, role: req.user.role, action, entity, entity_id, entity_name, detail });
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: "Sunucu hatası" }); }
  });

  // GET /api/audit — sadece admin
  app.get("/api/audit", requireAuth, requireAdmin, (req, res) => {
    try {
      const { limit, offset, username, entity, dateFrom, dateTo, q } = req.query;
      const result = db.getAuditLog({ limit: Number(limit) || 100, offset: Number(offset) || 0, username: username || undefined, entity: entity || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, q: q || undefined });
      res.json({ ok: true, ...result });
    } catch (err) { res.status(500).json({ error: "Sunucu hatası" }); }
  });

  // DELETE /api/audit — işlem geçmişini tamamen temizler, sadece admin
  app.delete("/api/audit", requireAuth, requireAdmin, writeLimiter(20), (req, res) => {
    try {
      const deleted = db.clearAuditLog();
      // Kimin temizlediği izlensin diye temizlik sonrası tek kayıt bırakılır
      db.writeAuditEntry({ ts: new Date().toISOString(), username: req.user.username, role: req.user.role, action: "temizlendi", entity: "islem_gecmisi", entity_id: null, entity_name: `${deleted} kayıt silindi`, detail: null });
      res.json({ ok: true, deleted });
    } catch (err) { res.status(500).json({ error: "Sunucu hatası" }); }
  });

  // ── Kullanıcı/güvenlik geçmişi uçları ──────────────────────────────────────
  // GET /api/security-log — sadece admin
  app.get("/api/security-log", requireAuth, requireAdmin, (req, res) => {
    try {
      const { limit, offset, actor, action, dateFrom, dateTo, q } = req.query;
      const result = db.getSecurityLog({ limit: Number(limit) || 100, offset: Number(offset) || 0, actor: actor || undefined, action: action || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, q: q || undefined });
      res.json({ ok: true, ...result });
    } catch (err) { res.status(500).json({ error: "Sunucu hatası" }); }
  });

  // DELETE /api/security-log — tüm kullanıcı geçmişini temizler, sadece admin
  app.delete("/api/security-log", requireAuth, requireAdmin, writeLimiter(20), (req, res) => {
    try {
      const deleted = db.clearSecurityLog();
      logSecurity({ actor: req.user.username, action: "gecmis_temizlendi", ip: reqIp(req), detail: { silinen: deleted } });
      res.json({ ok: true, deleted });
    } catch (err) { res.status(500).json({ error: "Sunucu hatası" }); }
  });

  // POST /api/security-log/ingest — istemci PC'nin biriktirdiği app-lock denemelerini alır.
  // GÜVENLİK: yalnızca app-lock eylemlerine izin verilir; istemci buradan sahte "giriş" veya
  // yönetim olayı enjekte edemez. actor cihaz etiketidir; IP isteğin gerçek adresinden yazılır.
  const APPLOCK_ACTIONS = new Set(["uygulama_kilidi_basarili", "uygulama_kilidi_basarisiz"]);
  app.post("/api/security-log/ingest", requireAuth, writeLimiter(60), (req, res) => {
    try {
      const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
      const ip = reqIp(req);
      let yazilan = 0;
      for (const e of entries.slice(0, 500)) {
        if (!APPLOCK_ACTIONS.has(e?.action)) continue;
        // actor = cihaz adı (istemciden), target = o istemcinin giriş yaptığı kullanıcı adı
        // (JWT'den) — sunucuda cihaz adları anlamsız, kullanıcı adı kimliği belli eder.
        logSecurity({
          ts: e.ts, actor: e.actor || "İstemci cihaz", action: e.action,
          target: req.user.username, ip, detail: e.detail || null,
        });
        yazilan++;
      }
      res.json({ ok: true, yazilan });
    } catch (err) { res.status(500).json({ error: "Sunucu hatası" }); }
  });

  // Global hata yakalayıcı (Express 4 fallback)
   
  app.use((err, _req, res, _next) => {
    console.error("[server] Beklenmeyen hata:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  });

  return app;
}

// Tailscale CGNAT aralığı (100.64.0.0/10) — src/lib/utils.js'teki isTailscaleIp'in CJS eşi.
// LAN IP'lerini (fabrika içi) Tailscale IP'sinden ayırmak için.
function isTailscaleIp(ip) {
  const p = String(ip || "").split(".");
  if (p.length !== 4 || p[0] !== "100") return false;
  const o = Number(p[1]);
  return o >= 64 && o <= 127;
}

// ── Ağ IP'lerini listele ──────────────────────────────────────────────────────
function getLocalIps() {
  const ips = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === "IPv4" && !iface.internal) ips.push(iface.address);
    }
  }
  return ips;
}

// ── Başlat / durdur ───────────────────────────────────────────────────────────
async function start(port, sqliteDb, opts = {}) {
  if (typeof opts.tlsOnly === "boolean") tlsOnlyMode = opts.tlsOnly;
  if (muxServer) return { port: getPort(), ips: getLocalIps(), fp: certFp };
  db = sqliteDb;
  try { db?.pruneRateBuckets?.(Date.now()); } catch { /* bakım, önemsiz */ } // süresi dolmuş hız-sınırı kayıtlarını temizle

  // TLS sertifikasını hazırla (yoksa üretilir). Başarısız olursa yalnız HTTP ile devam.
  let tls = null;
  try { tls = await serverTls.sertifikaUretVeyaYukle(electronApp); certFp = tls.fp; }
  catch (e) { certFp = null; console.error("[server] TLS sertifikası hazırlanamadı, yalnız HTTP:", e.message); }

  const expressApp = buildApp();
  httpPlain = http.createServer(expressApp);
  httpsSrv  = tls ? https.createServer({ key: tls.key, cert: tls.cert }, expressApp) : null;

  return new Promise((resolve, reject) => {
    // İlk bayta bakıp yönlendir: TLS ClientHello 0x16 (22) ile başlar.
    muxServer = net.createServer((socket) => {
      socket.once("data", (chunk) => {
        const useTls = httpsSrv && chunk[0] === 0x16;
        // Yalnız-HTTPS modunda dıştan gelen düz HTTP bağlantısı reddedilir (loopback muaf).
        if (!useTls && tlsOnlyMode && !isLoopbackAddr(socket.remoteAddress)) { try { socket.destroy(); } catch { /* zaten kapalı */ } return; }
        const target = useTls ? httpsSrv : httpPlain;
        socket.pause();
        socket.unshift(chunk);           // baytı akışa geri koy
        target.emit("connection", socket); // ilgili sunucu bağlantıyı devralsın
        process.nextTick(() => socket.resume());
      });
      socket.on("error", () => { try { socket.destroy(); } catch { /* zaten kapalı */ } });
    });
    muxServer.on("error", (err) => { muxServer = null; reject(err); });
    muxServer.listen(port, "0.0.0.0", () => {
      console.log(`Altunmak CRM Sunucu: http(s)://0.0.0.0:${port} (TLS ${tls ? "açık" : "kapalı"})`);
      resolve({ port: getPort(), ips: getLocalIps(), fp: certFp });
    });
  });
}

function stop() {
  return new Promise((resolve) => {
    const srv = muxServer;
    muxServer = null;
    try { httpPlain?.close?.(); } catch { /* dinlemiyordu */ }
    try { httpsSrv?.close?.(); } catch { /* dinlemiyordu */ }
    httpPlain = null; httpsSrv = null;
    if (!srv) { resolve(); return; }
    srv.close(() => resolve());
  });
}

function isRunning() { return muxServer !== null; }
function getPort()   { return muxServer?.address()?.port ?? null; }
function getCertFingerprint() { return certFp; }
function getTlsOnly() { return tlsOnlyMode; }
function setTlsOnly(v) { tlsOnlyMode = !!v; } // canlı etki eder (mux bağlantı anında okur)

// Sertifikayı yenile (parmak izi değişir). Çalışan sunucu eski sertifikayı kullanmaya
// devam eder; çağıran, etkili olması için stop()+start() yapmalıdır.
async function regenerateCert() {
  const t = await serverTls.yenile(electronApp);
  certFp = t.fp;
  return certFp;
}

// db'yi sunucuyu BAŞLATMADAN bağla. setupAdmin, sunucuyu açmadan önce şifreyi authenticateLogin
// ile doğrular (kademeli kilit + 2FA + kayıt). start() her çağrıldığında pruneRateBuckets çalışıp
// henüz kilitlenmemiş kademeli sayacı sildiği için, doğrulamayı start ile yapmak kilidi bozuyordu.
function attachDb(sqliteDb) { if (sqliteDb) db = sqliteDb; }

module.exports = { start, stop, isRunning, getPort, getLocalIps, getCertFingerprint, getTlsOnly, setTlsOnly, regenerateCert, authenticateLogin, attachDb, issueAdminToken };
