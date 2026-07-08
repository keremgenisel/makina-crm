const path            = require("path");
const fs              = require("fs");
const bcrypt          = require("bcryptjs");
const { BrowserWindow, safeStorage } = require("electron");
const embeddedServer  = require("../server.cjs");

const getDataPath         = (app) => path.join(app.getPath("userData"), "data.json");
const getServerConfigPath = (app) => path.join(app.getPath("userData"), "server-config.json");

// ── Token şifreleme (safeStorage: Windows DPAPI / macOS Keychain) ────────────
// Oturum token'ları diskte düz metin durmasın; dosyayı kopyalayan biri oturumu
// ele geçiremesin. Bellekte ve tüm çağıranlarda düz alan adları (token/adminToken)
// kullanılmaya devam eder: yazarken şifrelenir, okurken çözülür. safeStorage
// kullanılamıyorsa düz metne düşülür; eski düz metin config'ler okunmaya devam eder
// ve ilk kayıtta şifreli biçime geçer.
const TOKEN_FIELDS = ["token", "adminToken"];
function encryptTokens(cfg) {
  if (!cfg) return cfg;
  let available = false;
  try { available = safeStorage?.isEncryptionAvailable?.(); } catch { /* app hazır değil */ }
  if (!available) return cfg;
  const out = { ...cfg };
  for (const f of TOKEN_FIELDS) {
    if (typeof out[f] === "string" && out[f]) {
      try {
        out[f + "Enc"] = safeStorage.encryptString(out[f]).toString("base64");
        delete out[f];
      } catch { /* şifrelenemedi — düz bırak */ }
    }
  }
  return out;
}
function decryptTokens(cfg) {
  if (!cfg) return cfg;
  const out = { ...cfg };
  for (const f of TOKEN_FIELDS) {
    const enc = out[f + "Enc"];
    if (enc && !out[f]) {
      try { out[f] = safeStorage.decryptString(Buffer.from(enc, "base64")); }
      catch { /* çözülemedi (örn. başka makinaya kopyalanmış) — alan boş kalır, yeniden giriş gerekir */ }
    }
    delete out[f + "Enc"];
  }
  return out;
}

// ── server-config.json yardımcıları ──────────────────────────────────────────
function loadServerConfig(app) {
  try {
    const p = getServerConfigPath(app);
    if (fs.existsSync(p)) return decryptTokens(JSON.parse(fs.readFileSync(p, "utf-8")));
  } catch {}
  return null;
}
function saveServerConfig(app, cfg) {
  try { fs.writeFileSync(getServerConfigPath(app), JSON.stringify(encryptTokens(cfg), null, 2), "utf-8"); }
  catch (err) { console.error("server-config kaydedilemedi:", err); }
}

// ── Yerel JSON fallback ───────────────────────────────────────────────────────
function loadData(app) {
  try {
    const p = getDataPath(app);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (err) { console.error("Veri okunamadı:", err); }
  return null;
}
function saveData(app, data) {
  try {
    const p = getDataPath(app);
    const tmp = p + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmp, p);
    return true;
  } catch (err) { console.error("Veri kaydedilemedi:", err); return false; }
}

// ── Sunucu verisi yerel önbelleği (istemci modu, salt okunur mod için) ────────
// Sunucudan başarılı her yüklemede blob buraya yazılır; sunucuya ulaşılamayınca
// (laptop evde, sunucu kapalı, ağ arızası) uygulama boş açılmak yerine bu
// önbellekten __fromCache işaretiyle yüklenir ve renderer salt okunur moda geçer.
const getServerCachePath = (app) => path.join(app.getPath("userData"), "server-cache.json");
let lastCacheWrite = 0;
const CACHE_WRITE_MIN_MS = 60000; // blob büyük olabilir — her dataChanged yüklemesinde diske yazma

function writeServerCache(app, blob) {
  const now = Date.now();
  if (now - lastCacheWrite < CACHE_WRITE_MIN_MS) return;
  try {
    const p = getServerCachePath(app);
    const tmp = p + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(blob), "utf-8");
    fs.renameSync(tmp, p);
    lastCacheWrite = now;
  } catch (err) { console.error("Sunucu önbelleği yazılamadı:", err); }
}
function readServerCache(app) {
  try {
    const p = getServerCachePath(app);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (err) { console.error("Sunucu önbelleği okunamadı:", err); }
  return null;
}

// ── Event yayını ─────────────────────────────────────────────────────────────
function broadcast(channel, ...args) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, ...args);
  }
}

// ── HTTP yardımcısı (istemci modu) ───────────────────────────────────────────
async function apiFetch(serverUrl, token, endpoint, options = {}) {
  return fetch(`${serverUrl.replace(/\/$/, "")}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

// Bir adrese kısa timeout'la ulaşılabiliyor mu? (LAN erişilebilirlik yoklaması için)
async function probeReachable(url, timeoutMs = 1500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try { const r = await fetch(url, { signal: ctrl.signal }); return r.ok; }
  catch { return false; }
  finally { clearTimeout(t); }
}

// ─────────────────────────────────────────────────────────────────────────────
function registerDataHandlers(ipcMain, app, dialog, sqliteDb) {

  // ── Yapılandırma okuma ────────────────────────────────────────────────────
  ipcMain.handle("server:getConfig", () => {
    const cfg = loadServerConfig(app);
    if (!cfg) return { isActive: false };
    if (cfg.mode === "server") {
      return {
        isServer: true,
        running:  embeddedServer.isRunning(),
        port:     embeddedServer.getPort() ?? cfg.port,
        ips:      embeddedServer.getLocalIps(),
        username: cfg.username || "admin",
      };
    }
    if (!cfg.serverUrl) return { isActive: false };
    return {
      isActive:    !!cfg.token,
      serverUrl:   cfg.serverUrl,
      username:    cfg.username    ?? null,
      role:        cfg.role        ?? null,
      permissions: cfg.permissions ?? null,
    };
  });

  // ── İstemci: sunucuya giriş ───────────────────────────────────────────────
  ipcMain.handle("server:login", async (_e, { serverUrl, username, password }) => {
    if (!serverUrl || !username || !password) return { error: "Tüm alanlar zorunludur" };
    try {
      const res = await fetch(`${serverUrl.replace(/\/$/, "")}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = await res.json();
      if (!res.ok) return { error: body.error || "Giriş başarısız" };
      saveServerConfig(app, { mode: "client", serverUrl, token: body.token, username: body.user.username, role: body.user.role, permissions: body.user.permissions ?? null });
      return { ok: true, user: body.user };
    } catch (err) {
      console.error("Sunucu giriş hatası:", err);
      return { error: "Sunucuya bağlanılamadı" };
    }
  });

  // ── İstemci: oturum kapat ─────────────────────────────────────────────────
  ipcMain.handle("server:logout", () => {
    const cfg = loadServerConfig(app);
    if (cfg?.mode === "client") {
      const { token, username, role, permissions, ...rest } = cfg;
      saveServerConfig(app, rest);
    }
    return true;
  });

  ipcMain.handle("server:clearConfig", () => {
    try { fs.unlinkSync(getServerConfigPath(app)); } catch {}
    return true;
  });

  // ── Token yenile ──────────────────────────────────────────────────────────
  ipcMain.handle("server:refreshToken", async () => {
    const cfg = loadServerConfig(app);
    if (!cfg?.serverUrl || !cfg?.token) return false;
    try {
      const res = await apiFetch(cfg.serverUrl, cfg.token, "/auth/me");
      if (res.status === 401) { broadcast("server:sessionExpired"); return false; }
      if (!res.ok) return false;
      const body = await res.json();
      saveServerConfig(app, { ...cfg, token: body.token });
      return true;
    } catch { return false; }
  });

  // ── Genel API isteği (kullanıcı yönetimi, admin işlemleri) ───────────────
  ipcMain.handle("server:apiRequest", async (_e, { method, path: apiPath, body }) => {
    const cfg = loadServerConfig(app);
    // Sunucu modundaysa gömülü sunucu üzerinden HTTP çek (localhost)
    const baseUrl = cfg?.mode === "server"
      ? `http://127.0.0.1:${embeddedServer.getPort()}`
      : cfg?.serverUrl;
    const token = cfg?.mode === "server"
      ? cfg?.adminToken  // sunucu PC admin token'ı (aşağıda server:setupAdmin'de set edilir)
      : cfg?.token;
    if (!baseUrl || !token) return { error: "Sunucuya bağlı değil" };
    try {
      const res = await fetch(`${baseUrl}${apiPath}`, {
        method: method || "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        ...(body != null ? { body: JSON.stringify(body) } : {}),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || `HTTP ${res.status}`, status: res.status };
      return { ok: true, data, status: res.status };
    } catch (err) { return { error: err.message }; }
  });

  // ── Sunucu modu: ilk admin kurulumu ──────────────────────────────────────
  ipcMain.handle("server:setupAdmin", async (_e, { username, password, port }) => {
    if (!username?.trim() || !password || password.length < 6) return { error: "Kullanıcı adı ve en az 6 karakterli şifre gerekli" };
    if (!sqliteDb.isActive()) return { error: "Veritabanı henüz hazır değil" };
    if (sqliteDb.hasAnyUser()) {
      // Admin mevcut — şifreyi doğrula ve sunucuyu başlat (yeni kullanıcı oluşturma)
      const existingUser = sqliteDb.getUserByUsername(username.trim());
      if (!existingUser) return { error: `"${username.trim()}" kullanıcısı bulunamadı. Mevcut admin kullanıcı adını girin.` };
      const match = await bcrypt.compare(password, existingUser.password);
      if (!match) return { error: "Şifre hatalı. Mevcut admin şifresini girin." };
    } else {
      const hash = await bcrypt.hash(password, 10);
      sqliteDb.createUser(username.trim(), hash, "admin");
    }
    // Sunucuyu başlat
    const usePort = port || 3000;
    try {
      const { ips } = await embeddedServer.start(usePort, sqliteDb);
      // Admin token al — önce 30 günlük internal endpoint; başarısız olursa normal login (8 saat)
      let adminToken = null;
      try {
        const r = await fetch(`http://127.0.0.1:${usePort}/auth/refresh-internal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim() }),
        });
        const body = await r.json();
        if (body.token) { adminToken = body.token; }
      } catch {}
      if (!adminToken) {
        try {
          const res = await fetch(`http://127.0.0.1:${usePort}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username.trim(), password }),
          });
          const body = await res.json();
          if (res.ok && body.token) adminToken = body.token;
          else console.warn("[setupAdmin] Dahili login başarısız:", body.error);
        } catch (loginErr) {
          console.warn("[setupAdmin] Dahili login isteği başarısız:", loginErr.message);
        }
      }
      saveServerConfig(app, { mode: "server", port: usePort, username: username.trim(), ...(adminToken ? { adminToken } : {}) });
      return { ok: true, ips, port: usePort };
    } catch (err) {
      return { error: `Sunucu başlatılamadı: ${err.message}` };
    }
  });

  // ── Sunucu modu: başlat ───────────────────────────────────────────────────
  ipcMain.handle("server:startServer", async (_e, port) => {
    if (!sqliteDb.isActive()) return { error: "Veritabanı henüz hazır değil" };
    const usePort = port || loadServerConfig(app)?.port || 3000;
    try {
      const { ips } = await embeddedServer.start(usePort, sqliteDb);
      const cfg = loadServerConfig(app) || {};
      // Token yenile
      let adminToken = cfg.adminToken;
      try {
        const r = await fetch(`http://127.0.0.1:${usePort}/auth/refresh-internal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: cfg.username }),
        });
        const body = await r.json();
        if (body.token) adminToken = body.token;
      } catch {}
      saveServerConfig(app, { ...cfg, mode: "server", port: usePort, adminToken });
      return { ok: true, port: usePort, ips };
    } catch (err) { return { error: err.message }; }
  });

  // ── Sunucu modu: durdur ───────────────────────────────────────────────────
  ipcMain.handle("server:stopServer", async () => {
    await embeddedServer.stop();
    return { ok: true };
  });

  // ── Sunucu durumu ─────────────────────────────────────────────────────────
  ipcMain.handle("server:getServerStatus", () => ({
    running: embeddedServer.isRunning(),
    port:    embeddedServer.getPort(),
    ips:     embeddedServer.getLocalIps(),
  }));

  // ── İstemci: sunucuyla aynı yerel ağda mıyız? ─────────────────────────────
  // Tailscale (100.x) adresiyle bağlı olsak bile, sunucunun LAN IP'sine (192.168.x)
  // doğrudan ulaşabiliyorsak aynı ağdayız demektir. Sunucu LAN IP'lerini /api/version
  // ile bildirir; her birini /health üzerinden yoklarız.
  ipcMain.handle("server:checkLan", async () => {
    const cfg = loadServerConfig(app);
    if (cfg?.mode !== "client" || !cfg?.serverUrl || !cfg?.token) return { onLan: false };
    try {
      const res = await apiFetch(cfg.serverUrl, cfg.token, "/api/version");
      if (!res.ok) return { onLan: false };
      const body = await res.json();
      const ips = Array.isArray(body?.serverLanIps) ? body.serverLanIps : [];
      const port = body?.serverPort;
      if (!ips.length || !port) return { onLan: false };
      for (const ip of ips) {
        const lanUrl = `http://${ip}:${port}`;
        if (await probeReachable(`${lanUrl}/health`)) return { onLan: true, lanUrl };
      }
      return { onLan: false };
    } catch { return { onLan: false }; }
  });

  // ── Veri yükleme ──────────────────────────────────────────────────────────
  ipcMain.handle("crm:load", async () => {
    const cfg = loadServerConfig(app);

    // İstemci modu: HTTP
    if (cfg?.mode === "client" && cfg?.serverUrl && cfg?.token) {
      try {
        const res = await apiFetch(cfg.serverUrl, cfg.token, "/api/data");
        if (res.status === 401) { broadcast("server:sessionExpired"); return null; }
        if (!res.ok) {
          let errMsg = `HTTP ${res.status}`;
          try { const b = await res.json(); if (b?.error) errMsg = b.error; } catch {}
          throw new Error(errMsg);
        }
        const blob = await res.json();
        writeServerCache(app, blob); // salt okunur mod için son başarılı veri
        return blob;
      } catch (err) {
        console.error("Sunucudan yüklenemedi:", err);
        broadcast("server:error", err.message);
        // Sunucuya ulaşılamıyor — son başarılı veri önbellekte varsa salt okunur
        // görüntüleme için onu döndür (renderer __fromCache işaretiyle kilitlenir)
        const cached = readServerCache(app);
        if (cached) return { ...cached, __fromCache: true };
        return null;
      }
    }

    // Sunucu/Yerel mod: SQLite veya JSON
    let blob = null;
    if (sqliteDb.isActive()) {
      try { blob = sqliteDb.readBlobFromDb(); } catch (err) { console.error("SQLite okunamadı:", err); }
    } else {
      blob = loadData(app);
    }

    // dataVersion ekle
    if (blob && sqliteDb.isActive()) blob.dataVersion = sqliteDb.getDataVersion();

    // Sunucu modu config varsa gömülü sunucuyu otomatik başlat
    if (blob && cfg?.mode === "server" && cfg?.port && !embeddedServer.isRunning()) {
      embeddedServer.start(cfg.port, sqliteDb).then(async () => {
        // Admin token süresi dolmuş olabilir — loopback üzerinden yenile
        try {
          const r = await fetch(`http://127.0.0.1:${cfg.port}/auth/refresh-internal`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: cfg.username }),
          });
          const body = await r.json();
          if (body.token) saveServerConfig(app, { ...(loadServerConfig(app) || {}), adminToken: body.token });
        } catch (e) { console.warn("Admin token yenileme hatası:", e.message); }
      }).catch(err => console.error("Otomatik sunucu başlatma hatası:", err));
    }

    return blob;
  });

  // ── Veri kaydetme ─────────────────────────────────────────────────────────
  ipcMain.handle("crm:save", async (_e, data) => {
    const cfg = loadServerConfig(app);

    // İstemci modu: HTTP
    if (cfg?.mode === "client" && cfg?.serverUrl && cfg?.token) {
      try {
        const res = await apiFetch(cfg.serverUrl, cfg.token, "/api/data", {
          method: "POST",
          body:   JSON.stringify({ data, dataVersion: data?.__dataVersion }),
        });
        if (res.status === 401) { broadcast("server:sessionExpired"); return false; }
        if (res.status === 409) {
          const body = await res.json();
          broadcast("server:conflict", body.serverVersion);
          return false;
        }
        if (!res.ok) {
          let errMsg = `HTTP ${res.status}`;
          try { const b = await res.json(); if (b?.error) errMsg = b.error; } catch {}
          throw new Error(errMsg);
        }
        const body = await res.json();
        broadcast("server:versionUpdate", body.newVersion);
        return true;
      } catch (err) {
        console.error("Sunucuya yazılamadı:", err);
        broadcast("server:error", err.message);
        return false;
      }
    }

    // Sunucu/Yerel mod: SQLite ile version kontrolü
    if (sqliteDb.isActive()) {
      const clientVersion = data?.__dataVersion;
      if (clientVersion !== undefined && clientVersion !== null) {
        const serverVersion = sqliteDb.getDataVersion();
        if (clientVersion !== serverVersion) {
          broadcast("server:conflict", serverVersion);
          return false;
        }
      }
      try {
        sqliteDb.writeBlobToDb(data);
        const newVersion = sqliteDb.bumpDataVersion();
        broadcast("server:versionUpdate", newVersion);
        return true;
      } catch (err) { console.error("SQLite'a yazılamadı:", err); return false; }
    }

    return saveData(app, data);
  });

  // ── Flush save (beforeunload) ─────────────────────────────────────────────
  ipcMain.on("crm:flush-save", (e, data) => {
    const cfg = loadServerConfig(app);
    if (cfg?.mode === "client" && cfg?.serverUrl && cfg?.token) {
      // Async fire-and-forget; debounce zaten kaydetmiştir
      apiFetch(cfg.serverUrl, cfg.token, "/api/data", {
        method: "POST",
        body:   JSON.stringify({ data, dataVersion: data?.__dataVersion }),
      }).catch(() => {});
      e.returnValue = true;
      return;
    }
    try {
      if (sqliteDb.isActive()) {
        sqliteDb.writeBlobToDb(data);
        sqliteDb.bumpDataVersion();
      } else saveData(app, data);
      e.returnValue = true;
    } catch { e.returnValue = false; }
  });

  // ── Hafif versiyon kontrolü (sunucu PC polling için) ─────────────────────
  ipcMain.handle("crm:getVersion", () => {
    if (!sqliteDb.isActive()) return null;
    return sqliteDb.getDataVersion();
  });

  // ── Manuel yedekleme ──────────────────────────────────────────────────────
  ipcMain.handle("crm:backup", async (_e, data) => {
    const date = new Date().toISOString().split("T")[0];
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Yedek Kaydet",
      defaultPath: `altunmak-crm-yedek-${date}.json`,
      filters: [{ name: "JSON Yedek Dosyası", extensions: ["json"] }],
    });
    if (canceled || !filePath) return false;
    try { fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8"); return true; }
    catch (err) { console.error("Yedek yazılamadı:", err); return false; }
  });

  ipcMain.handle("crm:chooseFolder", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Yedek Klasörü Seç",
      properties: ["openDirectory", "createDirectory"],
    });
    return canceled || !filePaths?.[0] ? null : filePaths[0];
  });

  ipcMain.handle("crm:writeBackup", (_e, folder, data) => {
    try {
      if (!folder?.trim() || !fs.statSync(folder).isDirectory()) return false;
      const date = new Date().toISOString().split("T")[0];
      fs.writeFileSync(path.join(folder, `altunmak-crm-otoyedek-${date}.json`), JSON.stringify(data, null, 2), "utf-8");
      return true;
    } catch (err) { console.error("Otomatik yedek yazılamadı:", err); return false; }
  });

  ipcMain.handle("crm:restore", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Yedek Dosyası Seç",
      filters: [{ name: "JSON Yedek Dosyası", extensions: ["json"] }],
      properties: ["openFile"],
    });
    if (canceled || !filePaths?.[0]) return null;
    try { return JSON.parse(fs.readFileSync(filePaths[0], "utf-8")); }
    catch (err) { console.error("Yedek okunamadı:", err); return null; }
  });
  // ── Kayıt kilitleme ──────────────────────────────────────────────────────────
  function cfgUsername() {
    const cfg = loadServerConfig(app);
    return cfg?.username || "kullanıcı";
  }

  ipcMain.handle("crm:lock:acquire", async (_e, { entityType, entityId, force = false }) => {
    const cfg = loadServerConfig(app);
    if (cfg?.mode === "client" && cfg?.serverUrl && cfg?.token) {
      try {
        const res = await apiFetch(cfg.serverUrl, cfg.token, "/api/lock", {
          method: "POST", body: JSON.stringify({ entityType, entityId, force }),
        });
        const body = await res.json().catch(() => ({}));
        return res.ok ? { ok: true } : body;
      } catch { return { ok: true }; }
    }
    return sqliteDb.acquireLock(entityType, String(entityId), cfgUsername(), force);
  });

  ipcMain.handle("crm:lock:release", async (_e, { entityType, entityId }) => {
    const cfg = loadServerConfig(app);
    if (cfg?.mode === "client" && cfg?.serverUrl && cfg?.token) {
      try {
        await apiFetch(cfg.serverUrl, cfg.token, "/api/lock", {
          method: "DELETE", body: JSON.stringify({ entityType, entityId }),
        });
      } catch {}
      return;
    }
    sqliteDb.releaseLock(entityType, String(entityId), cfgUsername());
  });

  ipcMain.handle("crm:lock:list", async () => {
    const cfg = loadServerConfig(app);
    if (cfg?.mode === "client" && cfg?.serverUrl && cfg?.token) {
      try {
        const res = await apiFetch(cfg.serverUrl, cfg.token, "/api/locks");
        return res.ok ? await res.json() : [];
      } catch { return []; }
    }
    return sqliteDb.listLocks();
  });

  ipcMain.handle("crm:lock:releaseAll", async () => {
    const cfg = loadServerConfig(app);
    const username = cfgUsername();
    if (cfg?.mode === "client" && cfg?.serverUrl && cfg?.token) {
      try {
        await apiFetch(cfg.serverUrl, cfg.token, "/api/locks/all", {
          method: "DELETE", body: JSON.stringify({}),
        });
      } catch {}
      return;
    }
    sqliteDb.releaseAllLocksByUser(username);
  });
}

module.exports = { registerDataHandlers };
