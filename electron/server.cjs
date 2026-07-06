// Gömülü HTTP sunucusu — Electron ana sürecinin içinde çalışır.
// PostgreSQL gerekmez; mevcut SQLite (electron/db.cjs) kullanılır.
// Yalnızca "sunucu PC"de çalışır; diğer PC'ler HTTP ile bağlanır.
const express  = require("express");
const compression = require("compression");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");
const os       = require("os");
const { BrowserWindow } = require("electron");

let httpServer = null;
let db         = null; // electron/db.cjs referansı

// ── JWT ───────────────────────────────────────────────────────────────────────
function getSecret() {
  let s = db.getMetaValue("jwtSecret");
  if (!s) { s = crypto.randomBytes(32).toString("hex"); db.setMetaValue("jwtSecret", s); }
  return s;
}
function signToken(payload) { return jwt.sign(payload, getSecret(), { expiresIn: "8h" }); }

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

// ── Giriş denemesi sınırı (brute-force koruması) ─────────────────────────────
// IP başına 5 dakikalık pencerede en fazla 10 BAŞARISIZ deneme; başarılı giriş sayacı
// sıfırlar. Bellek içi tutulur (sunucu yeniden başlayınca sıfırlanır, LAN için yeterli).
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_MAX_FAILS = 10;
const loginFails = new Map(); // ip → { count, resetAt }
function loginRateCheck(ip) {
  const now = Date.now();
  const rec = loginFails.get(ip);
  if (!rec || now > rec.resetAt) return true;
  return rec.count < LOGIN_MAX_FAILS;
}
function loginRateFail(ip) {
  const now = Date.now();
  const rec = loginFails.get(ip);
  if (!rec || now > rec.resetAt) loginFails.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  else rec.count += 1;
}
function loginRateSuccess(ip) { loginFails.delete(ip); }

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
  // Büyük gövde yalnızca veri kaydetmede gerekli; diğer tüm endpoint'ler küçük JSON alır
  app.use("/api/data", express.json({ limit: "50mb" }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true, active: db?.isActive?.() ?? false }));

  // POST /auth/login
  app.post("/auth/login", async (req, res) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || "?";
      if (!loginRateCheck(ip)) return res.status(429).json({ error: "Çok fazla başarısız deneme. 5 dakika sonra tekrar deneyin." });
      const { username, password } = req.body || {};
      if (!username || !password) return res.status(400).json({ error: "Kullanıcı adı ve şifre gerekli" });
      if (!db || !db.isActive()) return res.status(503).json({ error: "Veritabanı henüz hazır değil" });
      const user = db.getUserByUsername(username);
      if (!user || !user.is_active) { loginRateFail(ip); return res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı" }); }
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) { loginRateFail(ip); return res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı" }); }
      loginRateSuccess(ip);
      const token = signToken({ id: user.id, username: user.username, role: user.role, tv: user.token_version ?? 1 });
      res.json({ token, user: { id: user.id, username: user.username, role: user.role, permissions: user.permissions ?? null } });
    } catch (err) {
      console.error("[server] /auth/login hatası:", err);
      res.status(500).json({ error: "Giriş işlemi başarısız: " + (err.message || "bilinmeyen hata") });
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
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /auth/me/password — kendi şifresini değiştir
  app.patch("/auth/me/password", requireAuth, async (req, res) => {
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
      res.status(500).json({ error: err.message });
    }
  });

  // POST /auth/refresh-internal — yalnızca loopback; sunucu PC kendi admin tokenini yeniler (şifre gerekmez)
  app.post("/auth/refresh-internal", (req, res) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || "";
      if (!ip.includes("127.0.0.1") && !ip.includes("::1") && ip !== "::ffff:127.0.0.1") {
        return res.status(403).json({ error: "Yalnızca yerel erişim" });
      }
      const { username } = req.body || {};
      if (!username) return res.status(400).json({ error: "username gerekli" });
      const user = db?.getUserByUsername(username);
      if (!user || user.role !== "admin") return res.status(403).json({ error: "Admin kullanıcı bulunamadı" });
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role, tv: user.token_version ?? 1 }, getSecret(), { expiresIn: "30d" });
      res.json({ token });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/version — hafif polling endpoint: versiyon + güncel izinler
  app.get("/api/version", requireAuth, (req, res) => {
    try {
      const u = db?.getUserByUsername(req.user.username);
      res.json({ dataVersion: db?.getDataVersion?.() ?? null, role: u?.role ?? req.user.role, permissions: u?.permissions ?? null });
    }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/data
  app.get("/api/data", requireAuth, (_req, res) => {
    try {
      if (!db || !db.isActive()) return res.status(503).json({ error: "Veritabanı henüz hazır değil" });
      const blob = db.readBlobFromDb();
      res.json({ ...blob, dataVersion: db.getDataVersion() });
    } catch (err) {
      console.error("[server] /api/data GET hatası:", err);
      res.status(500).json({ error: "Veri okunamadı: " + (err.message || "bilinmeyen hata") });
    }
  });

  // POST /api/data — optimistic locking
  app.post("/api/data", requireAuth, (req, res) => {
    const { data, dataVersion: clientVersion } = req.body || {};
    if (!data || typeof data !== "object") return res.status(400).json({ error: "Geçersiz veri" });
    try {
      if (!db || !db.isActive()) return res.status(503).json({ error: "Veritabanı henüz hazır değil" });
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
      res.status(500).json({ error: "Veri kaydedilemedi: " + (err.message || "bilinmeyen hata") });
    }
  });

  // GET /api/users (admin)
  app.get("/api/users", requireAuth, requireAdmin, (_req, res) => {
    try { res.json(db.getAllUsers()); }
    catch (err) { console.error("[server] /api/users GET hatası:", err); res.status(500).json({ error: err.message }); }
  });

  // POST /api/users (admin)
  app.post("/api/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { username, password, role = "user", permissions } = req.body || {};
      if (!username?.trim() || !password || !["admin", "user"].includes(role)) return res.status(400).json({ error: "Geçersiz parametre" });
      if (db.getUserByUsername(username.trim())) return res.status(409).json({ error: "Bu kullanıcı adı zaten mevcut" });
      const id = db.createUser(username.trim(), await bcrypt.hash(password, 10), role, permissions ?? null);
      res.status(201).json({ id, username: username.trim(), role, is_active: 1, permissions: permissions ?? null });
    } catch (err) {
      console.error("[server] /api/users POST hatası:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/users/:id (admin)
  app.patch("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { is_active, role, password, permissions } = req.body || {};
      const fields = {};
      if (is_active !== undefined)  fields.is_active = is_active;
      if (role && ["admin", "user"].includes(role)) fields.role = role;
      if (password)                 fields.password = await bcrypt.hash(password, 10);
      if (permissions !== undefined) fields.permissions = permissions;
      db.updateUser(id, fields);
      res.json({ ok: true });
    } catch (err) {
      console.error("[server] /api/users PATCH hatası:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/users/:id (admin)
  app.delete("/api/users/:id", requireAuth, requireAdmin, (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (id === req.user?.id) return res.status(400).json({ error: "Kendi hesabınızı silemezsiniz" });
      db.deleteUser(id);
      res.json({ ok: true });
    } catch (err) {
      console.error("[server] /api/users DELETE hatası:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/locks — aktif kilitler
  app.get("/api/locks", requireAuth, (_req, res) => {
    try { res.json(db.listLocks()); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/lock — kilit al
  app.post("/api/lock", requireAuth, (req, res) => {
    try {
      const { entityType, entityId, force = false } = req.body || {};
      if (!entityType || entityId == null) return res.status(400).json({ error: "entityType ve entityId gerekli" });
      const result = db.acquireLock(entityType, String(entityId), req.user.username, force);
      if (result.ok) { broadcast("server:locksChanged"); res.json({ ok: true }); }
      else res.status(423).json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // DELETE /api/lock — kilit bırak
  app.delete("/api/lock", requireAuth, (req, res) => {
    try {
      const { entityType, entityId } = req.body || {};
      if (!entityType || entityId == null) return res.status(400).json({ error: "entityType ve entityId gerekli" });
      db.releaseLock(entityType, String(entityId), req.user.username);
      broadcast("server:locksChanged");
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // DELETE /api/locks/all — kullanıcının tüm kilitlerini bırak
  app.delete("/api/locks/all", requireAuth, (req, res) => {
    try {
      db.releaseAllLocksByUser(req.user.username);
      broadcast("server:locksChanged");
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/audit — istemci tarafından çağrılır; username JWT'den alınır
  app.post("/api/audit", requireAuth, (req, res) => {
    try {
      const { action, entity, entity_id, entity_name, detail } = req.body;
      db.writeAuditEntry({ ts: new Date().toISOString(), username: req.user.username, role: req.user.role, action, entity, entity_id, entity_name, detail });
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/audit — sadece admin
  app.get("/api/audit", requireAuth, requireAdmin, (req, res) => {
    try {
      const { limit, offset, username, entity, dateFrom, dateTo } = req.query;
      const result = db.getAuditLog({ limit: Number(limit) || 100, offset: Number(offset) || 0, username: username || undefined, entity: entity || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
      res.json({ ok: true, ...result });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // DELETE /api/audit — işlem geçmişini tamamen temizler, sadece admin
  app.delete("/api/audit", requireAuth, requireAdmin, (req, res) => {
    try {
      const deleted = db.clearAuditLog();
      // Kimin temizlediği izlensin diye temizlik sonrası tek kayıt bırakılır
      db.writeAuditEntry({ ts: new Date().toISOString(), username: req.user.username, role: req.user.role, action: "temizlendi", entity: "islem_gecmisi", entity_id: null, entity_name: `${deleted} kayıt silindi`, detail: null });
      res.json({ ok: true, deleted });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Global hata yakalayıcı (Express 4 fallback)
   
  app.use((err, _req, res, _next) => {
    console.error("[server] Beklenmeyen hata:", err);
    res.status(500).json({ error: err.message || "Sunucu hatası" });
  });

  return app;
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
