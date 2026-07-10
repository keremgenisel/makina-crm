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
const { BrowserWindow, safeStorage, app } = require("electron");
const { kisitliMi, degisenBolumler, yazmaYetkisiVar, sonAdminiDusururMu } = require("./serverAuth.cjs");
const { planSecret } = require("./jwtSecret.cjs");
const { rateAllow, rateHit, rateRetryAfter, escalatingBlockedMs, escalatingNext } = require("./rateLimit.cjs");
const totp = require("./totp.cjs");
const qrcode = require("qrcode");

let httpServer = null;
let db         = null; // electron/db.cjs referansı

// ── JWT imza anahtarı ─────────────────────────────────────────────────────────
// Anahtar OS anahtarlığında (safeStorage: DPAPI/Keychain) şifreli dosyada tutulur; DB'de
// düz metin bırakılmaz. Mevcut kurulumdaki eski DB anahtarı korunarak taşınır (token'lar
// geçersiz olmasın). safeStorage kullanılamıyorsa eski davranışa (DB'de düz metin) düşülür.
let cachedSecret = null;
function jwtSecretFile() { return path.join(app.getPath("userData"), "jwt-secret.enc"); }
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
// jetonları anında iptal eder. Sunucu PC'nin admin jetonu da (refresh-internal) 30 gün.
function signToken(payload) { return jwt.sign(payload, getSecret(), { expiresIn: "30d" }); }

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
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true, active: db?.isActive?.() ?? false }));

  // POST /auth/login
  app.post("/auth/login", async (req, res) => {
    try {
      const ip = req.socket?.remoteAddress || req.ip || "?";
      const { username, password } = req.body || {};
      if (!username || !password) return res.status(400).json({ error: "Kullanıcı adı ve şifre gerekli" });
      const cleanIp = reqIp(req);
      const blockedMs = loginBlockedMs(ip, username);
      if (blockedMs > 0) {
        logSecurity({ actor: username, action: "giris_basarisiz", ip: cleanIp, detail: { sebep: "Çok fazla deneme (geçici engel)" } });
        res.set("Retry-After", String(Math.ceil(blockedMs / 1000)));
        return res.status(429).json({ error: "Çok fazla başarısız deneme. Lütfen biraz sonra tekrar deneyin." });
      }
      if (!db || !db.isActive()) return res.status(503).json({ error: "Veritabanı henüz hazır değil" });
      const user = db.getUserByUsername(username);
      if (!user || !user.is_active) { loginRateFail(ip, username); logSecurity({ actor: username, action: "giris_basarisiz", ip: cleanIp, detail: { sebep: user ? "Hesap pasif" : "Kullanıcı adı yok" } }); return res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı" }); }
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) { loginRateFail(ip, username); logSecurity({ actor: username, action: "giris_basarisiz", ip: cleanIp, detail: { sebep: "Yanlış şifre" } }); return res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı" }); }
      // İkinci faktör (opsiyonel, kullanıcı başına): 2FA açıksa TOTP/kurtarma kodu da gerekir.
      if (user.totp_enabled) {
        const { totpCode } = req.body || {};
        if (!totpCode) return res.status(401).json({ error: "İki adımlı doğrulama kodu gerekli", requires2fa: true });
        if (!verify2fa(user, totpCode)) { loginRateFail(ip, username); logSecurity({ actor: username, action: "giris_basarisiz", ip: cleanIp, detail: { sebep: "Yanlış 2FA kodu" } }); return res.status(401).json({ error: "Doğrulama kodu hatalı", requires2fa: true }); }
      }
      loginRateSuccess(ip, username);
      logSecurity({ actor: user.username, action: "giris_basarili", ip: cleanIp, detail: { rol: user.role, ikiAdimli: !!user.totp_enabled } });
      const token = signToken({ id: user.id, username: user.username, role: user.role, tv: user.token_version ?? 1 });
      res.json({ token, user: { id: user.id, username: user.username, role: user.role, permissions: user.permissions ?? null } });
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
      res.json({ token: signToken({ id, username, role, tv: u?.token_version ?? 1 }), user: { id, username, role, permissions: u?.permissions ?? null } });
    } catch (err) {
      console.error("[server] /auth/me hatası:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
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
      res.json({ ok: true, recovery }); // düz kodlar yalnızca bir kez gösterilir
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
      res.json({ ok: true });
    } catch (err) { console.error("[server] 2fa/disable:", err); res.status(500).json({ error: "Sunucu hatası" }); }
  });

  // POST /auth/refresh-internal — yalnızca loopback; sunucu PC kendi admin tokenini yeniler (şifre gerekmez)
  // GÜVENLİK: kaynak adres yalnızca gerçek soket adresinden (req.socket.remoteAddress) okunur,
  // asla req.ip/X-Forwarded-For'dan değil. Bu endpoint 30 günlük admin token verdiği için
  // "trust proxy" ASLA açılmamalı; açılırsa XFF sahteleyen uzak biri buradan admin olabilir.
  const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
  app.post("/auth/refresh-internal", (req, res) => {
    try {
      const ip = req.socket?.remoteAddress || "";
      if (!LOOPBACK.has(ip)) {
        return res.status(403).json({ error: "Yalnızca yerel erişim" });
      }
      const { username } = req.body || {};
      if (!username) return res.status(400).json({ error: "username gerekli" });
      const user = db?.getUserByUsername(username);
      if (!user || user.role !== "admin") return res.status(403).json({ error: "Admin kullanıcı bulunamadı" });
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role, tv: user.token_version ?? 1 }, getSecret(), { expiresIn: "30d" });
      res.json({ token });
    } catch (err) { res.status(500).json({ error: "Sunucu hatası" }); }
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
      if (kisitliMi(u?.permissions ?? null, u?.role ?? req.user.role)) {
        const changed = degisenBolumler(db.readBlobFromDb(), data);
        const yetki = yazmaYetkisiVar(u?.permissions ?? null, u?.role ?? req.user.role, changed);
        if (!yetki.ok) return res.status(403).json({ error: "Bu veriyi değiştirme yetkiniz yok" });
      }
      const serverVersion = db.getDataVersion();
      if (clientVersion !== undefined && clientVersion !== null && clientVersion !== serverVersion) {
        return res.status(409).json({ error: "Başka bir kullanıcı veriyi güncelledi.", serverVersion });
      }
      db.writeBlobToDb(data);
      const newVersion = db.bumpDataVersion();
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
  app.delete("/api/users/:id/2fa", requireAuth, requireAdmin, writeLimiter(20), (req, res) => {
    try {
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
      const result = db.acquireLock(entityType, String(entityId), req.user.username, force);
      if (result.ok) { broadcast("server:locksChanged"); res.json({ ok: true }); }
      else res.status(423).json(result);
    } catch (err) { res.status(500).json({ error: "Sunucu hatası" }); }
  });

  // DELETE /api/lock — kilit bırak
  app.delete("/api/lock", requireAuth, writeLimiter(200), (req, res) => {
    try {
      const { entityType, entityId } = req.body || {};
      if (!entityType || entityId == null) return res.status(400).json({ error: "entityType ve entityId gerekli" });
      db.releaseLock(entityType, String(entityId), req.user.username);
      broadcast("server:locksChanged");
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: "Sunucu hatası" }); }
  });

  // DELETE /api/locks/all — kullanıcının tüm kilitlerini bırak
  app.delete("/api/locks/all", requireAuth, writeLimiter(200), (req, res) => {
    try {
      db.releaseAllLocksByUser(req.user.username);
      broadcast("server:locksChanged");
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: "Sunucu hatası" }); }
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
function start(port, sqliteDb) {
  return new Promise((resolve, reject) => {
    if (httpServer) { resolve({ port: getPort(), ips: getLocalIps() }); return; }
    db = sqliteDb;
    try { db?.pruneRateBuckets?.(Date.now()); } catch { /* bakım, önemsiz */ } // süresi dolmuş hız-sınırı kayıtlarını temizle
    const expressApp = buildApp();
    httpServer = expressApp.listen(port, "0.0.0.0", () => {
      console.log(`Altunmak CRM Sunucu: http://0.0.0.0:${port}`);
      resolve({ port: getPort(), ips: getLocalIps() });
    });
    httpServer.on("error", (err) => { httpServer = null; reject(err); });
  });
}

function stop() {
  return new Promise((resolve) => {
    if (!httpServer) { resolve(); return; }
    httpServer.close(() => { httpServer = null; resolve(); });
  });
}

function isRunning() { return httpServer !== null; }
function getPort()   { return httpServer?.address()?.port ?? null; }

module.exports = { start, stop, isRunning, getPort, getLocalIps };
