const path            = require("path");
const fs              = require("fs");
const bcrypt          = require("bcryptjs");
const { BrowserWindow, safeStorage } = require("electron");
const embeddedServer  = require("../server.cjs");
const { buildCandidates } = require("../failover.cjs");
const { pinliDispatcher, sertifikaParmakIziAl, pinliFetch } = require("../pinnedFetch.cjs");
const knownServers = require("../knownServers.cjs");
const { encryptBackup, decryptBackup, isEncryptedBackup } = require("../backupCrypto.cjs");
const files = require("../files.cjs");
const jsonStore = require("../jsonStore.cjs");
const securityQueue   = require("../securityQueue.cjs");

const getSecurityQueuePath = (app) => path.join(app.getPath("userData"), "security-queue.json");

// İstemci PC'de biriken app-lock denemelerini sunucuya gönderir. Login yalnızca ilk
// kurulumda çağrıldığı için (sonraki açılışlar önbellek token'la bağlanır) bu, bağlantının
// doğrulandığı her noktadan tetiklenir: boot, token yenileme ve polling. apiFetch failover'lı,
// yani Tailscale ölse de LAN yedeğine düşer. Başarılı gönderimde kuyruk temizlenir; hata olursa
// kuyruk korunur, bir sonraki tetikte tekrar denenir. Eşzamanlı çift gönderim in-flight ile önlenir.
let securityFlushInFlight = false;
async function flushSecurityQueue(app, serverUrl, token) {
  if (securityFlushInFlight || !serverUrl || !token) return;
  const p = getSecurityQueuePath(app);
  const entries = securityQueue.readQueue(p);
  if (!entries.length) return; // kuyruk temizlendiyse dosya yok → hızlı çıkış
  securityFlushInFlight = true;
  try {
    const res = await apiFetch(serverUrl, token, "/api/security-log/ingest", {
      method: "POST", body: JSON.stringify({ entries }),
    });
    if (res.ok) securityQueue.clearQueue(p);
  } catch (err) { console.error("Güvenlik kuyruğu gönderilemedi:", err); }
  finally { securityFlushInFlight = false; }
}

// ── Otomatik yedek parolası (safeStorage ile o makinede şifreli saklanır) ─────
// Belirlenmişse otomatik yedekler bununla şifrelenir; yoksa şifresiz yazılır.
const getBackupPassPath = (app) => path.join(app.getPath("userData"), "backup-pass.enc");
function canEncryptSafe() { try { return !!safeStorage?.isEncryptionAvailable?.(); } catch { return false; } }
function saveAutoBackupPassword(app, password) {
  const p = getBackupPassPath(app);
  if (!password) { try { fs.unlinkSync(p); } catch { /* zaten yok */ } return { ok: true, cleared: true }; }
  if (!canEncryptSafe()) return { ok: false, error: "Bu bilgisayarda güvenli depolama kullanılamıyor." };
  try { fs.writeFileSync(p, safeStorage.encryptString(String(password))); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
}
function readAutoBackupPassword(app) {
  try {
    const p = getBackupPassPath(app);
    if (fs.existsSync(p) && canEncryptSafe()) return safeStorage.decryptString(fs.readFileSync(p));
  } catch { /* okunamadı */ }
  return null;
}
function hasAutoBackupPassword(app) { try { return fs.existsSync(getBackupPassPath(app)); } catch { return false; } }

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

// İstemci önbelleği tüm veri blob'unu diskte tutar; at-rest sızmaması için jsonStore
// (safeStorage) ile şifreli yazılır. Detay: electron/jsonStore.cjs.
function writeServerCache(app, blob) {
  const now = Date.now();
  if (now - lastCacheWrite < CACHE_WRITE_MIN_MS) return;
  try {
    jsonStore.writeJson(getServerCachePath(app), blob);
    lastCacheWrite = now;
  } catch (err) { console.error("Sunucu önbelleği yazılamadı:", err); }
}
function readServerCache(app) {
  try {
    const p = getServerCachePath(app);
    if (fs.existsSync(p)) return jsonStore.readJson(p);
  } catch (err) { console.error("Sunucu önbelleği okunamadı:", err); }
  return null;
}

// ── Event yayını ─────────────────────────────────────────────────────────────
function broadcast(channel, ...args) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, ...args);
  }
}

// ── Otomatik LAN yedeklemesi (failover) durumu ───────────────────────────────
// failoverLanUrl: aynı yerel ağdayken keşfedilip config'e yazılan yedek LAN adresi
//   (uygulama açılışında config'ten yüklenir, checkLan her başarılı yoklamada günceller).
// lastGoodUrl: en son başarıyla ulaşılan adres — sonraki isteklerde önce bu denenir ki
//   düşmüş bir adres (ör. internet kesikken Tailscale) için her seferinde timeout beklenmesin.
let failoverLanUrl = null;
let lastGoodUrl = null;
let appRef = null; // config yazımı için (persistLastGood)
function setFailoverLan(url) { failoverLanUrl = url || null; }
function resetFailover() { failoverLanUrl = null; lastGoodUrl = null; }

// ── Sunucu sertifika sabitleme (TLS pinning) durumu ───────────────────────────
// İstemci sunucuya https + pinlenmiş sertifikayla bağlanır. Pin login anında kurulur
// (config'te serverCertPem). pinnedDispatcher varsa istemci fetch'leri bu dispatcher'la
// gider (yalnız o sertifikayı kabul eder). Pin yoksa (göç etmemiş/eski http istemci)
// düz http ile çalışmaya devam eder — hibrit.
let pinnedDispatcher = null;
let pinnedFp = null;
function refreshPin(app) {
  try {
    const cfg = loadServerConfig(app);
    if (cfg?.mode === "client" && cfg?.serverCertPem) {
      pinnedDispatcher = pinliDispatcher(cfg.serverCertPem);
      pinnedFp = cfg.serverCertFp || null;
      return;
    }
  } catch { /* config yok/bozuk */ }
  pinnedDispatcher = null; pinnedFp = null;
}
// Pinli client fetch: pin varsa undici.fetch + dispatcher, yoksa aynı undici.fetch (http/https
// farketmez). Global fetch yerine undici.fetch: dispatcher aynı undici sürümünden gelmeli.
function clientFetch(url, opts = {}) {
  return pinliFetch(url, pinnedDispatcher ? { ...opts, dispatcher: pinnedDispatcher } : opts);
}
// Son çalışan adresi config'e kaydet — böylece bir sonraki açılışta önce O denenir. Örn. istemci
// Tailscale adresiyle yapılandırılmış ama fabrikada LAN'dan gidiyorsa, açılışta ölü Tailscale
// adresini deneyip timeout beklemek yerine doğrudan LAN'dan bağlanır (kapalı görünme süresi biter).
function persistLastGood(url) {
  try {
    const cfg = loadServerConfig(appRef);
    if (cfg?.mode === "client" && cfg.lastGoodUrl !== url) saveServerConfig(appRef, { ...cfg, lastGoodUrl: url });
  } catch { /* config yok/yazılamadı — önemsiz */ }
}

// ── HTTP yardımcısı (istemci modu) ───────────────────────────────────────────
// serverUrl birincil adres; başarısız olursa (ağ hatası/timeout) bilinen LAN yedeğine
// otomatik geçilir. HTTP yanıtı (200/4xx/5xx) DÖNERSE o adres çalışıyor sayılır ve
// döndürülür — yalnızca bağlantı kurulamadığında sıradaki adaya geçilir.
async function apiFetch(serverUrl, token, endpoint, options = {}) {
  const opts = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  };
  const adaylar = buildCandidates(lastGoodUrl, serverUrl, failoverLanUrl);
  let sonHata;
  for (const base of adaylar) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000); // ölü adres için hızlı vazgeç, sonrakini dene
    try {
      const res = await clientFetch(`${base}${endpoint}`, { ...opts, signal: ctrl.signal });
      if (lastGoodUrl !== base) { lastGoodUrl = base; persistLastGood(base); } // değişince kalıcı kaydet
      return res;
    } catch (e) {
      sonHata = e; // bağlantı kurulamadı → sıradaki adayı (ör. LAN yedeği) dene
    } finally {
      clearTimeout(t);
    }
  }
  throw sonHata || new Error("Sunucuya ulaşılamadı");
}

// Dosya transferi (binary): apiFetch JSON + 5sn timeout'a bağlı; büyük dosya için ayrı, uzun
// timeout'lu ve içerik-türü serbest bir sürüm. Failover (Tailscale→LAN) yine geçerli.
async function fileFetch(serverUrl, token, endpoint, { method = "GET", body = null, headers = {}, timeoutMs = 60000 } = {}) {
  const adaylar = buildCandidates(lastGoodUrl, serverUrl, failoverLanUrl);
  let sonHata;
  for (const base of adaylar) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await clientFetch(`${base}${endpoint}`, { method, body, headers: { Authorization: `Bearer ${token}`, ...headers }, signal: ctrl.signal });
      if (lastGoodUrl !== base) { lastGoodUrl = base; persistLastGood(base); }
      return res;
    } catch (e) { sonHata = e; } finally { clearTimeout(t); }
  }
  throw sonHata || new Error("Sunucuya ulaşılamadı");
}

// İstemci modunda dosya işlemleri sunucuya gider. Dosya IPC bu köprüyü kullanır (yerel modda net=null).
function makeFileNet(app) {
  const cfgOf = () => loadServerConfig(app);
  return {
    isClient: () => { const c = cfgOf(); return !!(c?.mode === "client" && c?.serverUrl && c?.token); },
    async upload(ad, buffer, entityAd = "") {
      const c = cfgOf();
      const res = await fileFetch(c.serverUrl, c.token, "/api/files/upload", {
        method: "POST", body: buffer,
        headers: { "Content-Type": "application/octet-stream", "X-Dosya-Adi": encodeURIComponent(ad), "X-Dosya-Firma": encodeURIComponent(entityAd || "") },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data; // { dosyaAdi, boyut, tur, ad }
    },
    async download(depoAd) {
      const c = cfgOf();
      const res = await fileFetch(c.serverUrl, c.token, `/api/files/${encodeURIComponent(depoAd)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    },
    async remove(depoAd) {
      const c = cfgOf();
      try { await fileFetch(c.serverUrl, c.token, `/api/files/${encodeURIComponent(depoAd)}`, { method: "DELETE" }); } catch { /* çöpten kalıcı silmede sessiz */ }
    },
  };
}

// Bir adrese kısa timeout'la ulaşılabiliyor mu? (LAN erişilebilirlik yoklaması için)
async function probeReachable(url, timeoutMs = 1500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try { const r = await clientFetch(url, { signal: ctrl.signal }); return r.ok; }
  catch { return false; }
  finally { clearTimeout(t); }
}

// ─────────────────────────────────────────────────────────────────────────────
function registerDataHandlers(ipcMain, app, dialog, sqliteDb) {

  // Açılışta önbellekteki LAN yedeği + son çalışan adresi yükle — böylece uygulama internet
  // kesikken (Tailscale düşmüşken) açılsa bile aynı ağdaki sunucuya doğrudan (ölü adresi
  // beklemeden) ulaşabilir.
  appRef = app;
  refreshPin(app); // pinlenmiş sunucu sertifikası varsa istemci fetch'leri https+pin ile gitsin
  try {
    const boot = loadServerConfig(app);
    if (boot?.mode === "client") {
      // Mevcut config pinini kalıcı bilinen-sunucu deposuna taşı (bir kereye mahsus göç):
      // böylece config sıfırlansa bile bu sunucu bilinen kalır.
      if (boot.serverCertFp && boot.serverUrl) { try { knownServers.kaydet(app, new URL(boot.serverUrl).host, boot.serverCertFp); } catch { /* geçersiz url */ } }
      if (boot.lanUrl) setFailoverLan(boot.lanUrl);
      if (boot.lastGoodUrl) lastGoodUrl = boot.lastGoodUrl;
      // Açılıştaki app-lock denemeleri önbellek token'la bağlıysa hemen gönderilsin
      // (login çağrılmadığı için tek dayanak buydu). Erişilemezse polling tekrar dener.
      if (boot.token) flushSecurityQueue(app, boot.serverUrl, boot.token);
    }
  } catch { /* config yok */ }

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
        fp:       embeddedServer.getCertFingerprint?.() ?? null, // bu sunucunun TLS parmak izi (elle doğrulama için gösterilir)
        tlsOnly:  embeddedServer.getTlsOnly?.() ?? !!cfg.tlsOnly, // yalnız-HTTPS modu açık mı
      };
    }
    if (!cfg.serverUrl) return { isActive: false };
    return {
      isActive:    !!cfg.token,
      serverUrl:   cfg.serverUrl,
      username:    cfg.username    ?? null,
      role:        cfg.role        ?? null,
      permissions: cfg.permissions ?? null,
      lastGoodUrl: cfg.lastGoodUrl ?? null, // rozeti açılışta doğru göstermek için (LAN mı Tailscale mi)
      tls:         !!cfg.serverCertFp,       // istemci pinlenmiş https ile mi bağlı
      fp:          cfg.serverCertFp ?? null, // pinlenen sunucu parmak izi
    };
  });

  // ── İstemci: sunucuya giriş ───────────────────────────────────────────────
  // trust: kullanıcı ilk bağlantıda parmak izini onayladı. force: kimlik değişti uyarısına
  // rağmen yeni sertifikayı kabul et (sunucu yeniden kurulduysa). İkisi de yoksa ve pin
  // gerekiyorsa needTrust/certMismatch döndürülür; UI onay/uyarı diyaloğu gösterir.
  ipcMain.handle("server:login", async (_e, { serverUrl, username, password, totpCode, trust, force }) => {
    if (!serverUrl || !username || !password) return { error: "Tüm alanlar zorunludur" };
    // Şemayı normalize et: yoksa http varsay (eski/http-only sunucu için geri uyumluluk).
    let base = String(serverUrl).trim().replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(base)) base = "http://" + base;
    const httpsBase = base.replace(/^http:\/\//i, "https://");

    // Sunucunun TLS sertifikasını al (varsa). Aynı port hem http hem https dinliyor (hibrit).
    let cert = null;
    try { cert = await sertifikaParmakIziAl(httpsBase); } catch { cert = null; }

    let dispatcher = undefined;
    let loginUrl = base;                 // TLS yoksa http'ye düş (geri uyumluluk)
    let pinToSave = null;
    if (cert) {
      const existing = loadServerConfig(app);
      const configFp = (existing?.mode === "client" && existing?.serverCertFp) ? existing.serverCertFp : null;
      const host = (() => { try { return new URL(httpsBase).host; } catch { return null; } })();
      // Kalıcı bilinen-sunucu deposu (SSH known_hosts): bir kez doğrulanan sunucu, "Yerel Moda Dön"
      // sonrası bile tekrar sorulmaz; yalnız sertifika gerçekten değişirse "kimlik değişti" çıkar.
      const karar = knownServers.guvenKarari({
        certFp: cert.fp, hostFp: knownServers.hostFp(app, host), configFp,
        fpKnown: knownServers.fpBilinir(app, cert.fp), trust, force,
      });
      if (karar === "mismatch") return { certMismatch: true, fp: cert.fp };
      if (karar === "needTrust") return { needTrust: true, fp: cert.fp };
      // Güvenildi: https + pin ile bağlan ve bu host'u kalıcı depoya kaydet.
      dispatcher = pinliDispatcher(cert.pem);
      loginUrl = httpsBase;
      pinToSave = { serverCertPem: cert.pem, serverCertFp: cert.fp };
      if (host) knownServers.kaydet(app, host, cert.fp);
    }

    try {
      const res = await pinliFetch(`${loginUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, totpCode }),
        ...(dispatcher ? { dispatcher } : {}),
      });
      const body = await res.json();
      // 2FA açıksa sunucu requires2fa döner — renderer kod alanını gösterir.
      // retryAfterSec: kademeli kilit (429) aktifse kalan süre — giriş ekranı geri sayım gösterir.
      if (!res.ok) return { error: body.error || "Giriş başarısız", requires2fa: !!body.requires2fa, ...(body.retryAfterSec ? { retryAfterSec: body.retryAfterSec } : {}) };
      resetFailover(); // yeni sunucu — eski LAN yedeği/aktif adres geçersiz
      saveServerConfig(app, { mode: "client", serverUrl: loginUrl, token: body.token, username: body.user.username, role: body.user.role, permissions: body.user.permissions ?? null, ...(pinToSave || {}) });
      refreshPin(app); // sonraki tüm istemci fetch'leri pin ile gitsin
      flushSecurityQueue(app, loginUrl, body.token); // biriken app-lock denemelerini sunucuya yolla (fire-and-forget)
      return { ok: true, user: body.user, ...(pinToSave ? { tls: true, fp: cert.fp } : {}) };
    } catch (err) {
      console.error("Sunucu giriş hatası:", err);
      return { error: "Sunucuya bağlanılamadı" };
    }
  });

  // ── İstemci: oturum kapat ─────────────────────────────────────────────────
  ipcMain.handle("server:logout", () => {
    resetFailover();
    const cfg = loadServerConfig(app);
    if (cfg?.mode === "client") {
      const { token, username, role, permissions, lanUrl, lastGoodUrl: _lg, ...rest } = cfg;
      saveServerConfig(app, rest);
    }
    return true;
  });

  ipcMain.handle("server:clearConfig", () => {
    try { fs.unlinkSync(getServerConfigPath(app)); } catch {}
    refreshPin(app); // config gitti → pin'i temizle
    return true;
  });

  // 2FA aç/kapat token_version'ı artırıp diğer oturumları düşürür; bu oturum kapanmasın diye
  // uç taze jeton döndürür ve burada saklanır (istemci → token, sunucu PC → adminToken).
  ipcMain.handle("server:updateToken", (_e, token) => {
    if (!token) return { ok: false };
    const cfg = loadServerConfig(app);
    if (!cfg) return { ok: false };
    if (cfg.mode === "server") saveServerConfig(app, { ...cfg, adminToken: token });
    else if (cfg.token) saveServerConfig(app, { ...cfg, token });
    return { ok: true };
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
      flushSecurityQueue(app, cfg.serverUrl, body.token); // bağlantı doğrulandı — bekleyen app-lock kayıtlarını gönder
      return true;
    } catch { return false; }
  });

  // ── Genel API isteği (polling, kullanıcı yönetimi, 2FA, admin işlemleri) ────
  ipcMain.handle("server:apiRequest", async (_e, { method, path: apiPath, body }) => {
    const cfg = loadServerConfig(app);
    const opts = { method: method || "GET", ...(body != null ? { body: JSON.stringify(body) } : {}) };
    try {
      let res;
      if (cfg?.mode === "server") {
        // Sunucu PC: gömülü sunucuya loopback + admin token
        if (!cfg?.adminToken) return { error: "Sunucuya bağlı değil" };
        res = await fetch(`http://127.0.0.1:${embeddedServer.getPort()}${apiPath}`, {
          ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.adminToken}` },
        });
      } else {
        // İstemci: apiFetch failover'lı — Tailscale ölse de LAN yedeğine düşer (polling "Sunucu
        // kapalı" göstermez). Düz fetch kullanılırsa yalnız cfg.serverUrl denenir ve failover atlanır.
        if (!cfg?.serverUrl || !cfg?.token) return { error: "Sunucuya bağlı değil" };
        res = await apiFetch(cfg.serverUrl, cfg.token, apiPath, opts);
        // Bağlantı çalışıyor (polling/admin isteği başarılı) — bekleyen app-lock kuyruğunu gönder.
        // ingest yolunu tetiklemez (o apiFetch ile doğrudan gider), sonsuz döngü olmaz.
        if (apiPath !== "/api/security-log/ingest") flushSecurityQueue(app, cfg.serverUrl, cfg.token);
      }
      const data = await res.json();
      if (!res.ok) return { error: data.error || `HTTP ${res.status}`, status: res.status };
      return { ok: true, data, status: res.status };
    } catch (err) { return { error: err.message }; }
  });

  // ── Sunucu modu: ilk admin kurulumu ──────────────────────────────────────
  ipcMain.handle("server:setupAdmin", async (_e, { username, password, port, totpCode }) => {
    if (!username?.trim() || !password || password.length < 6) return { error: "Kullanıcı adı ve en az 6 karakterli şifre gerekli" };
    if (!sqliteDb.isActive()) return { error: "Veritabanı henüz hazır değil" };
    const uname = username.trim();
    const ilkKurulum = !sqliteDb.hasAnyUser();
    if (ilkKurulum) {
      // Hiç kullanıcı yok: bu ilk kurulum — admini oluştur (doğrulanacak eski şifre yok).
      const hash = await bcrypt.hash(password, 10);
      sqliteDb.createUser(uname, hash, "admin");
    } else if (!sqliteDb.getUserByUsername(uname)) {
      return { error: `"${uname}" kullanıcısı bulunamadı. Mevcut admin kullanıcı adını girin.` };
    }
    const usePort = port || 3000;
    // Şifreyi (ve varsa 2FA'yı) GERÇEK giriş yolundan doğrula: kademeli kilit + 2FA + güvenlik
    // kaydı hepsi authenticateLogin içinde. Sunucu YALNIZCA doğrulama başarılıysa başlatılır.
    // ÖNEMLİ: sunucuyu her denemede başlatıp durdurmak, start() → pruneRateBuckets çağırdığı ve bu
    // fonksiyon henüz kilitlenmemiş (reset_at=now) kademeli sayacı sildiği için kilidi bozuyordu
    // (bildirilen "pes pese sınırsız deneme" hatası buydu). Bu yüzden db'yi başlatmadan bağlayıp
    // doğruluyoruz, start yalnız başarıda çağrılıyor.
    embeddedServer.attachDb(sqliteDb);
    const auth = await embeddedServer.authenticateLogin({ username: uname, password, totpCode, ip: "127.0.0.1" });
    if (auth.status !== 200) {
      // retryAfterSec: kademeli kilit aktifse kalan süre — form geri sayım gösterir (app-lock gibi)
      return { error: auth.error || "Giriş doğrulanamadı", ...(auth.requires2fa ? { requires2fa: true } : {}), ...(auth.retryAfterSec ? { retryAfterSec: auth.retryAfterSec } : {}) };
    }
    try {
      const { ips } = await embeddedServer.start(usePort, sqliteDb);
      // Doğrulandı — 30 günlük sunucu admin tokenini üret, olmazsa login tokenini kullan.
      // Aynı süreçteyiz: doğrudan modül çağrısı (eski loopback HTTP ucu güvenlik nedeniyle kaldırıldı).
      let adminToken = auth.token;
      try { adminToken = embeddedServer.issueAdminToken(uname) || adminToken; } catch {}
      saveServerConfig(app, { mode: "server", port: usePort, username: uname, ...(adminToken ? { adminToken } : {}) });
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
      const { ips } = await embeddedServer.start(usePort, sqliteDb, { tlsOnly: !!loadServerConfig(app)?.tlsOnly });
      const cfg = loadServerConfig(app) || {};
      // Token yenile (aynı süreçte doğrudan modül çağrısı)
      let adminToken = cfg.adminToken;
      try { adminToken = embeddedServer.issueAdminToken(cfg.username) || adminToken; } catch {}
      saveServerConfig(app, { ...cfg, mode: "server", port: usePort, adminToken });
      return { ok: true, port: usePort, ips };
    } catch (err) { return { error: err.message }; }
  });

  // ── Sunucu modu: durdur ───────────────────────────────────────────────────
  ipcMain.handle("server:stopServer", async () => {
    await embeddedServer.stop();
    return { ok: true };
  });

  // ── Sunucu modu: Yalnız-HTTPS (hibriti kapat) ─────────────────────────────
  // Açıkken dıştan gelen düz HTTP bağlantıları reddedilir (loopback muaf). Canlı etki eder,
  // yeniden başlatma gerekmez; ayar config'e yazılır ki sonraki açılışta korunsun.
  ipcMain.handle("server:setTlsOnly", (_e, value) => {
    const v = !!value;
    embeddedServer.setTlsOnly(v);
    const cfg = loadServerConfig(app);
    if (cfg?.mode === "server") saveServerConfig(app, { ...cfg, tlsOnly: v });
    return { ok: true, tlsOnly: v };
  });

  // ── Sunucu modu: TLS sertifikasını yenile ─────────────────────────────────
  // Parmak izi değişir → tüm istemciler bir sonraki bağlantıda yeniden güven ister.
  // Çalışan sunucu eski sertifikayı kullandığından, açıksa durdurup yeniden başlatarak uygular.
  ipcMain.handle("server:regenerateCert", async () => {
    try {
      const wasRunning = embeddedServer.isRunning();
      const cfg = loadServerConfig(app) || {};
      const port = embeddedServer.getPort() || cfg.port || 3000;
      if (wasRunning) await embeddedServer.stop();
      const fp = await embeddedServer.regenerateCert();
      if (wasRunning) await embeddedServer.start(port, sqliteDb);
      return { ok: true, fp };
    } catch (err) { return { error: err.message }; }
  });

  // ── Sunucu durumu ─────────────────────────────────────────────────────────
  ipcMain.handle("server:getServerStatus", () => ({
    running: embeddedServer.isRunning(),
    port:    embeddedServer.getPort(),
    ips:     embeddedServer.getLocalIps(),
    fp:      embeddedServer.getCertFingerprint?.() ?? null, // bu sunucunun TLS parmak izi
    tlsOnly: embeddedServer.getTlsOnly?.() ?? false,
    // hasAdmin: kurulum sihirbazı, ilk kurulum mu (admin oluştur) yoksa mevcut admini
    // doğrulama mı (giriş) olduğunu bilsin. Doğrulamada "Şifre Tekrar" istenmez ve her
    // deneme sunucuya gider (kademeli kilit + güvenlik kaydı devreye girsin).
    hasAdmin: sqliteDb.isActive() ? sqliteDb.hasAnyUser() : false,
  }));

  // ── İstemci: sunucuyla aynı yerel ağda mıyız? ─────────────────────────────
  // Tailscale (100.x) adresiyle bağlı olsak bile, sunucunun LAN IP'sine (192.168.x)
  // doğrudan ulaşabiliyorsak aynı ağdayız demektir. Sunucu LAN IP'lerini /api/version
  // ile bildirir; her birini /health üzerinden yoklarız.
  ipcMain.handle("server:checkLan", async () => {
    const cfg = loadServerConfig(app);
    if (cfg?.mode !== "client" || !cfg?.serverUrl || !cfg?.token) return { onLan: false };
    // LAN doğrulanınca yalnız failover adresini değil lastGoodUrl'i de LAN yap: böylece polling/apiFetch
    // ölü Tailscale adresini beklemeden hemen LAN'a yönelir ("Yerel Ağ ama Sunucu kapalı" durumu biter).
    const markLan = (lanUrl) => {
      setFailoverLan(lanUrl);
      if (lastGoodUrl !== lanUrl) { lastGoodUrl = lanUrl; persistLastGood(lanUrl); }
      const cur = loadServerConfig(app);
      if (cur && cur.lanUrl !== lanUrl) saveServerConfig(app, { ...cur, lanUrl });
    };
    // 1) Bilinen LAN yedeğini DOĞRUDAN yokla (hızlı /health) — ölü Tailscale'e /api/version atmadan.
    const cachedLan = cfg.lanUrl || failoverLanUrl;
    if (cachedLan && await probeReachable(`${cachedLan}/health`)) { markLan(cachedLan); return { onLan: true, lanUrl: cachedLan }; }
    // 2) Bilinen yoksa/erişilemezse: /api/version ile sunucunun LAN IP'lerini öğren ve her birini yokla.
    try {
      const res = await apiFetch(cfg.serverUrl, cfg.token, "/api/version");
      if (!res.ok) return { onLan: false };
      const body = await res.json();
      const ips = Array.isArray(body?.serverLanIps) ? body.serverLanIps : [];
      const port = body?.serverPort;
      if (!ips.length || !port) return { onLan: false };
      // Pin varsa LAN yedeği de https olsun (aynı sunucu = aynı sertifika, pin IP'den bağımsız çalışır).
      const scheme = pinnedFp ? "https" : "http";
      for (const ip of ips) {
        const lanUrl = `${scheme}://${ip}:${port}`;
        if (await probeReachable(`${lanUrl}/health`)) { markLan(lanUrl); return { onLan: true, lanUrl }; }
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
      embeddedServer.start(cfg.port, sqliteDb, { tlsOnly: !!cfg.tlsOnly }).then(async () => {
        // Admin token süresi dolmuş olabilir — aynı süreçte doğrudan yenile
        try {
          const token = embeddedServer.issueAdminToken(cfg.username);
          if (token) saveServerConfig(app, { ...(loadServerConfig(app) || {}), adminToken: token });
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
  // password verilirse yedek şifrelenir (manuel yedek; kullanıcı o an parola girer)
  ipcMain.handle("crm:backup", async (_e, data, password) => {
    const date = new Date().toISOString().split("T")[0];
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Yedek Kaydet",
      defaultPath: `altunmak-crm-yedek-${date}.json`,
      filters: [{ name: "JSON Yedek Dosyası", extensions: ["json"] }],
    });
    if (canceled || !filePath) return false;
    try {
      const payload = password ? encryptBackup(data, password) : data;
      fs.writeFileSync(filePath, JSON.stringify(payload, null, password ? 0 : 2), "utf-8");
      files.yedekleDosyaKlasoru(app, filePath, password || null); // arşiv dosyaları — parola varsa şifreli
      return true;
    }
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
      const pass = readAutoBackupPassword(app); // ayarlarda kayıtlıysa otomatik yedek şifrelenir
      const payload = pass ? encryptBackup(data, pass) : data;
      const date = new Date().toISOString().split("T")[0];
      const jsonPath = path.join(folder, `altunmak-crm-otoyedek-${date}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(payload, null, pass ? 0 : 2), "utf-8");
      files.yedekleDosyaKlasoru(app, jsonPath, pass || null); // arşiv dosyaları — parola varsa şifreli
      return true;
    } catch (err) { console.error("Otomatik yedek yazılamadı:", err); return false; }
  });

  // Otomatik yedek parolası yönetimi
  ipcMain.handle("backup:setAutoPassword", (_e, password) => saveAutoBackupPassword(app, password));
  ipcMain.handle("backup:autoPasswordStatus", () => ({ set: hasAutoBackupPassword(app), canEncrypt: canEncryptSafe() }));
  // Şifreli yedeğin dosya klasörü parola gelene kadar (backup:decrypt) çözülemez — yolunu burada beklet.
  let bekleyenSifreliRestoreYolu = null;
  // Şifreli yedeği parola ile çöz (geri yüklerken)
  ipcMain.handle("backup:decrypt", (_e, envelope, password) => {
    try {
      const data = decryptBackup(envelope, password);
      // Parola doğru → yedekteki şifreli arşiv dosyalarını da aynı parolayla çöz ve geri yükle.
      if (bekleyenSifreliRestoreYolu) { files.geriYukleDosyaKlasoru(app, bekleyenSifreliRestoreYolu, password); bekleyenSifreliRestoreYolu = null; }
      return { ok: true, data };
    }
    catch { return { ok: false, error: "Parola yanlış veya dosya bozuk." }; }
  });

  ipcMain.handle("crm:restore", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Yedek Dosyası Seç",
      filters: [{ name: "JSON Yedek Dosyası", extensions: ["json"] }],
      properties: ["openFile"],
    });
    if (canceled || !filePaths?.[0]) return null;
    // Şifreli yedekse zarf nesnesi döner; renderer parola sorup backup:decrypt ile çözer.
    try {
      const veri = JSON.parse(fs.readFileSync(filePaths[0], "utf-8"));
      if (isEncryptedBackup(veri)) {
        // Dosyalar da şifreli; parola backup:decrypt'te gelince geri yüklenecek.
        bekleyenSifreliRestoreYolu = filePaths[0];
      } else {
        bekleyenSifreliRestoreYolu = null;
        files.geriYukleDosyaKlasoru(app, filePaths[0]); // düz yedek → dosyalar hemen geri gelir
      }
      return veri;
    }
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

module.exports = { registerDataHandlers, flushSecurityQueue, getSecurityQueuePath, makeFileNet };
