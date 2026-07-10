// Gömülü HTTP sunucusu güvenlik testi — Electron altında koşar (better-sqlite3 Electron
// ABI'siyle derli; tests/server-security.test.js bunu Electron ile başlatır).
// Gerçek sunucuyu geçici bir DB ile rastgele portta başlatır, bir admin + bir salt-okunur
// + bir kısmi yetkili kullanıcı oluşturur ve HTTP ile kimlik doğrulama, yetki ve kaba
// kuvvet davranışlarını doğrular. En kritik kontrol: salt-okunur kullanıcı elle POST ile
// veriyi ezemez (403).
const path = require("path");
const os = require("os");
const fs = require("fs");
const Module = require("module");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-sectest-"));
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  // db.cjs → app.getPath; server.cjs → BrowserWindow.getAllWindows (broadcast no-op)
  if (request === "electron") return { app: { getPath: () => tmpDir }, BrowserWindow: { getAllWindows: () => [] } };
  return origLoad(request, parent, isMain);
};

const root = path.join(__dirname, "..", "..");
const bcrypt = require(path.join(root, "node_modules", "bcryptjs"));
const dbmod = require(path.join(root, "electron", "db.cjs"));
const server = require(path.join(root, "electron", "server.cjs"));

// Salt-okunur ve kısmi yetki izin dizeleri (src/lib/permissions.js ile aynı biçim).
const READONLY = JSON.stringify({ customerActions: [], dealerActions: [], evrakActions: [], stockActions: [], notActions: [], settings: ["server"] });
const PARTIAL  = JSON.stringify({ customerActions: ["ekle", "duzenle", "sil"], dealerActions: [], evrakActions: [], stockActions: [], notActions: [], settings: ["server"] });

let fail = 0;
const check = (name, ok) => { console.log((ok ? "PASS" : "FAIL") + "  " + name); if (!ok) fail++; };

process.on("uncaughtException", (e) => { console.error("FAIL (uncaught):", e && e.stack || e); process.exit(1); });

(async () => {
  dbmod.migrateFromJsonIfNeeded();
  if (!dbmod.isActive()) { console.error("FAIL: sqlite aktif değil"); process.exit(1); }

  // Kullanıcılar
  dbmod.createUser("admin", bcrypt.hashSync("admin123", 10), "admin", null);
  dbmod.createUser("ro",    bcrypt.hashSync("ro12345", 10), "user", READONLY);
  dbmod.createUser("part",  bcrypt.hashSync("part123", 10), "user", PARTIAL);

  // Başlangıç verisi
  dbmod.writeBlobToDb({
    customers: [{ id: 1, name: "İlk Müşteri", model: "AK100" }],
    dealers: [{ id: 2, name: "Bayi" }],
    teklifler: [{ id: 3, type: "teklif", no: "T-1", firma: "F", satirlar: [] }],
    notes: [{ id: 4, text: "not" }],
  });

  const { port } = await server.start(0, dbmod);
  const base = `http://127.0.0.1:${port}`;
  const api = (p, opts = {}, token) => fetch(base + p, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) },
  });
  const login = async (u, p) => { const r = await api("/auth/login", { method: "POST", body: JSON.stringify({ username: u, password: p }) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
  const login2fa = async (u, p, totpCode) => { const r = await api("/auth/login", { method: "POST", body: JSON.stringify({ username: u, password: p, totpCode }) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
  // Güncel dataVersion (optimistic lock için). Kısmi blob gönderilir — DB katmanı
  // gönderilmeyen bölümleri korur, gönderilen bölümü tam-değiştirir.
  const curVer = async (tok) => (await (await api("/api/data", {}, tok)).json()).dataVersion;
  const postData = (data, dataVersion, tok) => api("/api/data", { method: "POST", body: JSON.stringify({ data, dataVersion }) }, tok);

  // ── Token'sız istekler 401 ──────────────────────────────────────────────────
  check("token'sız GET /api/data → 401", (await api("/api/data")).status === 401);
  check("token'sız POST /api/data → 401", (await api("/api/data", { method: "POST", body: "{}" })).status === 401);
  check("token'sız GET /api/users → 401", (await api("/api/users")).status === 401);
  check("token'sız GET /api/audit → 401", (await api("/api/audit")).status === 401);

  // ── Girişler (başarılı giriş rate sayacını sıfırlar) ────────────────────────
  const adminLogin = await login("admin", "admin123");
  check("admin girişi başarılı", adminLogin.status === 200 && !!adminLogin.body.token);
  const adminTok = adminLogin.body.token;
  // İstemci oturum jetonu uzun ömürlü (30 gün) — PC gece/hafta sonu kapatılıp açıldığında
  // şifre tekrar sorulmasın diye. JWT payload'ının exp-iat farkını doğrula (~30 gün).
  {
    const payload = JSON.parse(Buffer.from(adminTok.split(".")[1], "base64").toString("utf8"));
    const omurGun = (payload.exp - payload.iat) / 86400;
    check("giriş jetonu ~30 gün geçerli (uzun ömürlü oturum)", Math.abs(omurGun - 30) < 0.5);
  }
  const roLogin = await login("ro", "ro12345");
  check("salt-okunur girişi başarılı", roLogin.status === 200 && !!roLogin.body.token);
  const roTok = roLogin.body.token;
  const partLogin = await login("part", "part123");
  const partTok = partLogin.body.token;

  // ── Salt-okunur: okuma serbest, yazma 403 ───────────────────────────────────
  const roGet = await api("/api/data", {}, roTok);
  check("salt-okunur GET /api/data → 200", roGet.status === 200);
  const roData = await roGet.json();
  const roWrite = await postData({ customers: [{ id: 1, name: "HACK", model: "AK100" }] }, roData.dataVersion, roTok);
  check("salt-okunur POST /api/data (müşteri değiştir) → 403", roWrite.status === 403);
  // Veri değişmedi mi?
  const afterRo = await (await api("/api/data", {}, adminTok)).json();
  check("salt-okunur yazma veriyi değiştirmedi", afterRo.customers.find(c => c.id === 1)?.name === "İlk Müşteri");

  // ── Admin: yazma çalışır, version artar ─────────────────────────────────────
  const beforeVer = afterRo.dataVersion;
  const adminWrite = await postData({ customers: [{ id: 1, name: "Admin Değiştirdi", model: "AK100" }] }, beforeVer, adminTok);
  const adminWriteBody = await adminWrite.json();
  check("admin POST /api/data → 200", adminWrite.status === 200);
  check("admin yazınca version arttı", adminWriteBody.newVersion === beforeVer + 1);

  // ── Kısmi yetkili: izinli bölüm yazılır, izinsiz bölüm 403 ───────────────────
  const partCustWrite = await postData({ customers: [{ id: 1, name: "Part Yazdı", model: "AK100" }] }, await curVer(partTok), partTok);
  check("kısmi yetkili müşteri yazabilir → 200", partCustWrite.status === 200);
  const partTeklifWrite = await postData({ teklifler: [{ id: 3, type: "teklif", no: "DEGISTI", firma: "F", satirlar: [] }] }, await curVer(partTok), partTok);
  check("kısmi yetkili evrak yazamaz → 403", partTeklifWrite.status === 403);

  // ── Admin-gating ────────────────────────────────────────────────────────────
  check("salt-okunur GET /api/users → 403", (await api("/api/users", {}, roTok)).status === 403);
  check("salt-okunur GET /api/audit → 403", (await api("/api/audit", {}, roTok)).status === 403);
  check("admin GET /api/users → 200", (await api("/api/users", {}, adminTok)).status === 200);

  // ── /api/version LAN adres bilgisi (aynı-ağ tespiti + LAN failover için) ──────
  // Her kimliği doğrulanmış istemciye verilir (IP kısıtlaması rozet + failover'ı bozuyordu).
  const versionBody = await (await api("/api/version", {}, adminTok)).json();
  check("/api/version serverLanIps dizi döner", Array.isArray(versionBody.serverLanIps));
  check("/api/version serverPort döner", typeof versionBody.serverPort === "number");

  // ── Son-admin koruması: tek aktif admini düşürme/pasifleştirme engellenir ──
  const adminId = adminLogin.body.user.id;
  check("tek admini user yapma → 400", (await api(`/api/users/${adminId}`, { method: "PATCH", body: JSON.stringify({ role: "user" }) }, adminTok)).status === 400);
  check("tek admini pasifleştirme → 400", (await api(`/api/users/${adminId}`, { method: "PATCH", body: JSON.stringify({ is_active: 0 }) }, adminTok)).status === 400);

  // ── Şifre uzunluğu ──────────────────────────────────────────────────────────
  check("kısa şifreyle kullanıcı ekleme → 400", (await api("/api/users", { method: "POST", body: JSON.stringify({ username: "yeni", password: "123", role: "user" }) }, adminTok)).status === 400);
  check("geçerli şifreyle kullanıcı ekleme → 201", (await api("/api/users", { method: "POST", body: JSON.stringify({ username: "yeni", password: "abcdef", role: "user" }) }, adminTok)).status === 201);

  // ── refresh-internal (loopback) ─────────────────────────────────────────────
  const refAdmin = await api("/auth/refresh-internal", { method: "POST", body: JSON.stringify({ username: "admin" }) });
  check("refresh-internal admin → token", refAdmin.status === 200 && !!(await refAdmin.json()).token);
  const refRo = await api("/auth/refresh-internal", { method: "POST", body: JSON.stringify({ username: "ro" }) });
  check("refresh-internal admin olmayan → 403", refRo.status === 403);

  // ── İki adımlı doğrulama (2FA / TOTP) uçtan uca ─────────────────────────────
  const totp = require(path.join(root, "electron", "totp.cjs"));
  const createTfa = await api("/api/users", { method: "POST", body: JSON.stringify({ username: "tfa", password: "tfapass1", role: "user" }) }, adminTok);
  const tfaId = (await createTfa.json()).id;
  const tfaTok = (await login("tfa", "tfapass1")).body.token;
  const setupRes = await api("/auth/2fa/setup", { method: "POST" }, tfaTok);
  const setupBody = await setupRes.json();
  check("2fa/setup secret + QR döner", setupRes.status === 200 && !!setupBody.secret && String(setupBody.qr).startsWith("data:image"));
  check("2fa/enable yanlış kod → 401", (await api("/auth/2fa/enable", { method: "POST", body: JSON.stringify({ code: "000000" }) }, tfaTok)).status === 401);
  const enableRes = await api("/auth/2fa/enable", { method: "POST", body: JSON.stringify({ code: totp.currentToken(setupBody.secret) }) }, tfaTok);
  const enableBody = await enableRes.json();
  check("2fa/enable doğru kod → 8 kurtarma kodu", enableRes.status === 200 && Array.isArray(enableBody.recovery) && enableBody.recovery.length === 8);
  const noCode = await login("tfa", "tfapass1");
  check("2fa açık: kodsuz login → 401 requires2fa", noCode.status === 401 && noCode.body.requires2fa === true);
  const withCode = await login2fa("tfa", "tfapass1", totp.currentToken(setupBody.secret));
  check("2fa: doğru TOTP ile login başarılı", withCode.status === 200 && !!withCode.body.token);
  const withRec = await login2fa("tfa", "tfapass1", enableBody.recovery[0]);
  check("2fa: kurtarma kodu ile login başarılı", withRec.status === 200 && !!withRec.body.token);
  check("2fa: kullanılmış kurtarma kodu tekrar → 401", (await login2fa("tfa", "tfapass1", enableBody.recovery[0])).status === 401);
  check("admin 2fa sıfırla → 200", (await api(`/api/users/${tfaId}/2fa`, { method: "DELETE" }, adminTok)).status === 200);
  check("sıfırlama sonrası kodsuz login çalışır", (await login("tfa", "tfapass1")).status === 200);

  // ── Kullanıcı Geçmişi (security_log): giriş/yönetim/2FA olayları + ingest ────
  check("token'sız GET /api/security-log → 401", (await api("/api/security-log")).status === 401);
  check("salt-okunur GET /api/security-log → 403", (await api("/api/security-log", {}, roTok)).status === 403);
  const secAll = await (await api("/api/security-log?limit=200", {}, adminTok)).json();
  check("admin GET /api/security-log → kayıtlar döner", Array.isArray(secAll.rows) && secAll.total > 0);
  check("giriş başarılı olayı kaydedildi", secAll.rows.some(r => r.action === "giris_basarili" && r.actor === "admin"));
  check("başarısız giriş olayı kaydedildi (yanlış 2FA)", secAll.rows.some(r => r.action === "giris_basarisiz"));
  check("başarılı girişte IP yazıldı", secAll.rows.some(r => r.action === "giris_basarili" && !!r.ip));
  check("kullanıcı ekleme olayı kaydedildi", secAll.rows.some(r => r.action === "kullanici_eklendi" && r.target === "yeni"));
  check("2FA sıfırlama olayı kaydedildi", secAll.rows.some(r => r.action === "2fa_sifirlandi" && r.target === "tfa"));
  const secByAction = await (await api("/api/security-log?action=giris_basarili", {}, adminTok)).json();
  check("action filtresi yalnız giris_basarili döner", secByAction.rows.every(r => r.action === "giris_basarili"));
  // ingest: yalnız app-lock eylemleri kabul edilir; sahte "giris_basarili" enjeksiyonu reddedilir
  const ingest = await (await api("/api/security-log/ingest", { method: "POST", body: JSON.stringify({ entries: [
    { ts: new Date().toISOString(), actor: "Cihaz: TEST", action: "giris_basarili" },
    { ts: new Date().toISOString(), actor: "Cihaz: TEST", action: "uygulama_kilidi_basarisiz", detail: JSON.stringify({ sebep: "Yanlış şifre" }) },
  ] }) }, adminTok)).json();
  check("ingest: sadece app-lock eylemi yazılır (sahte giriş reddedilir)", ingest.ok === true && ingest.yazilan === 1);
  check("ingest edilen app-lock kaydı görünür", (await (await api("/api/security-log?action=uygulama_kilidi_basarisiz", {}, adminTok)).json()).total >= 1);
  // Temizle (admin) → temizlik sonrası tek "gecmis_temizlendi" kaydı kalır
  check("admin DELETE /api/security-log → 200", (await api("/api/security-log", { method: "DELETE" }, adminTok)).status === 200);
  const secAfterClear = await (await api("/api/security-log", {}, adminTok)).json();
  check("temizlik sonrası yalnız 'gecmis_temizlendi' kaydı kalır", secAfterClear.total === 1 && secAfterClear.rows[0].action === "gecmis_temizlendi");

  // ── Yazma hız sınırı (DoS koruması): POST /api/data kullanıcı başına 60/dk ──
  // "yeni" kullanıcısı temiz sayaçla; gövde {} olduğu için handler 400 döner ama limiter
  // handler'dan ÖNCE sayar. 60 istekten sonra 429 gelmeli. (Login IP sayacına dokunmaz.)
  const yeniTok = (await login("yeni", "abcdef")).body.token;
  let rl429 = false, rlLast = 0;
  for (let i = 0; i < 65; i++) {
    rlLast = (await api("/api/data", { method: "POST", body: "{}" }, yeniTok)).status;
    if (rlLast === 429) rl429 = true;
  }
  check("POST /api/data 60/dk üstü → 429 (yazma hız sınırı)", rl429 && rlLast === 429);

  // ── Kaba kuvvet: kademeli (artan) kilit — en son (IP+kullanıcı sayacını tüketir) ──
  // İlk 2 yanlış serbest (401). 3. yanlış kilidi kurar (yine 401 döner ama bundan sonrası
  // kilitli). Sonraki hızlı deneme 429 olmalı.
  let ilk429 = -1;
  for (let i = 1; i <= 6; i++) {
    const st = (await login("admin", "yanlisSifre")).status;
    if (st === 429) { ilk429 = i; break; }
  }
  check("ilk 2 deneme kademeli kilide takılmaz (401)", ilk429 === -1 || ilk429 >= 3);
  check("birkaç yanlıştan sonra 429 (kademeli kilit devreye girer)", ilk429 >= 3 && ilk429 <= 6);

  // ── Kalıcılık: kademeli sayaç DB'de tutulur, sunucu yeniden başlasa da korunur ──
  const bucketOnce = dbmod.getRateBucket("user:admin");
  check("kademeli sayaç DB'ye yazıldı (kullanıcı adı başına)", !!bucketOnce && bucketOnce.count >= 3);
  await server.stop();
  await server.start(0, dbmod);
  const bucketSonra = dbmod.getRateBucket("user:admin");
  check("yeniden başlatmada kademeli sayaç korunur (kalıcı kilit)", !!bucketSonra && bucketSonra.count >= 3);

  await server.stop();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (fail) { console.error(`${fail} kontrol BASARISIZ`); process.exit(1); }
  console.log("TUM KONTROLLER GECTI");
  process.exit(0);
})();
