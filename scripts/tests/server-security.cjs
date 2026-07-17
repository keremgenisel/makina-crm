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
// Kısmi yetki: müşteri ekle+düzenle var, SİLME yok (gerçek eylem id'leri). Diğer gruplar boş.
const PARTIAL  = JSON.stringify({ customerActions: ["cust_add", "cust_edit"], dealerActions: [], evrakActions: [], stockActions: [], notActions: [], settings: ["server"] });
// Arayüzün "Kullanıcı Ekle" formunun ürettiği gövde: YALNIZ tabs (UserManager.jsx handleAdd).
// Varsayılan sekmeler = serverPermissionDefs.js DEFAULT_USER_TABS (Finans/Harita/Ayarlar kapalı).
const SEKME_ONLY = JSON.stringify({ tabs: ["dashboard", "customers", "dealers", "stock", "evrak", "notes"] });
// Bayi sorumlusu: müşteri tarafına hiç yazma yok, bayi tarafı açık (dosya IDOR senaryosu).
const BAYICI = JSON.stringify({ customerActions: [], dealerActions: ["dealer_add", "dealer_edit", "dealer_dosya_del"], evrakActions: [], stockActions: [], notActions: [], settings: ["server"] });

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
  dbmod.createUser("sekme", bcrypt.hashSync("sekme123", 10), "user", SEKME_ONLY);
  dbmod.createUser("bayici", bcrypt.hashSync("bayi123", 10), "user", BAYICI);

  // Başlangıç verisi
  dbmod.writeBlobToDb({
    customers: [{ id: 1, name: "İlk Müşteri", model: "AK100" }],
    dealers: [{ id: 2, name: "Bayi" }],
    teklifler: [{ id: 3, type: "teklif", no: "T-1", firma: "F", satirlar: [] }],
    notes: [{ id: 4, text: "not" }],
    appSettings: { kdvRates: { tr: 20 }, pinnedPartIds: [], autoBackup: false, lastBackup: null },
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
  // ── Eylem düzeyi: "düzenle var, sil yok" → SİLME reddedilir, EKLEME serbest ───
  const partDelete = await postData({ customers: [{ id: 1, name: "Part Yazdı", model: "AK100", deletedAt: new Date().toISOString() }] }, await curVer(partTok), partTok);
  check("kısmi yetkili müşteri SİLEMEZ (sil izni yok) → 403", partDelete.status === 403);
  const stillThere = await (await api("/api/data", {}, adminTok)).json();
  check("silme reddedildi, müşteri duruyor", stillThere.customers.find(c => c.id === 1)?.deletedAt == null);
  const partAdd = await postData({ customers: [{ id: 1, name: "Part Yazdı", model: "AK100" }, { id: 99, name: "Yeni Müşteri", model: "AK100" }] }, await curVer(partTok), partTok);
  check("kısmi yetkili müşteri EKLEYEBİLİR (ekle izni var) → 200", partAdd.status === 200);

  // ── Arayüzle oluşturulan kullanıcı (yalnız tabs) sunucuda GERÇEKTEN kısıtlı mı? ──
  // REGRESYON: sunucu tabs'ı tanımadığı için bu kullanıcıda kisitliMi false dönüyor, üç katmanlı
  // denetimin tamamı atlanıyordu. "Ayarlar sekmesi kapalı" diye oluşturulan kullanıcı curl ile
  // KDV oranını değiştirebiliyor, izni olmadan müşteri silebiliyordu.
  const sekmeTok = (await login("sekme", "sekme123")).body.token;
  const sekmeData = await (await api("/api/data", {}, sekmeTok)).json();
  const kdvEz = await postData({ appSettings: { ...sekmeData.appSettings, kdvRates: { tr: 1 } } }, sekmeData.dataVersion, sekmeTok);
  check("sekme-kısıtlı kullanıcı KDV oranını değiştiremez → 403", kdvEz.status === 403);
  const kdvSonra = await (await api("/api/data", {}, adminTok)).json();
  check("KDV oranı değişmedi", kdvSonra.appSettings?.kdvRates?.tr === 20);
  check("sekme-kısıtlı kullanıcı model tanımlarını yazamaz → 403",
    (await postData({ customModels: [{ model: "HACK" }] }, await curVer(sekmeTok), sekmeTok)).status === 403);
  check("sekme-kısıtlı kullanıcı fabrika bilgisini yazamaz → 403",
    (await postData({ factory: { name: "HACK" } }, await curVer(sekmeTok), sekmeTok)).status === 403);
  // Meşru kullanım kırılmamalı: açık sekmelerin verisi ve Stok'a ait pinnedPartIds yazılabilir.
  check("sekme-kısıtlı kullanıcı müşteri yazabilir (sekmesi açık) → 200",
    (await postData({ customers: [{ id: 1, name: "Sekme Yazdı", model: "AK100" }] }, await curVer(sekmeTok), sekmeTok)).status === 200);
  check("sekme-kısıtlı kullanıcı not yazabilir (sekmesi açık) → 200",
    (await postData({ notes: [{ id: 4, text: "not güncel" }] }, await curVer(sekmeTok), sekmeTok)).status === 200);
  const pinVer = await curVer(sekmeTok);
  const pinData = await (await api("/api/data", {}, sekmeTok)).json();
  check("sekme-kısıtlı kullanıcı parça sabitleyebilir (Stok sekmesi açık, appSettings alan düzeyi) → 200",
    (await postData({ appSettings: { ...pinData.appSettings, pinnedPartIds: ["7"] } }, pinVer, sekmeTok)).status === 200);

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

  // ── Rol düşürme ANINDA etkili olmalı (bayat rol regresyonu) ─────────────────
  // REGRESYON: requireAdmin rolü JWT payload'ından okuyordu ve updateUser token_version'ı yalnız
  // ŞİFRE değişiminde artırıyordu. Rolü düşürülen admin, jetonun doğal ömrü (30 gün) boyunca
  // yönetici kalıyordu: kullanıcı ekleyip silebilir, denetim kayıtlarını temizleyebilirdi.
  const ikinciAdmin = await api("/api/users", { method: "POST", body: JSON.stringify({ username: "admin2", password: "admin234", role: "admin" }) }, adminTok);
  const admin2Id = (await ikinciAdmin.json()).id;
  const admin2Tok = (await login("admin2", "admin234")).body.token;
  check("ikinci admin kendi jetonuyla /api/users görebiliyor (ön koşul)", (await api("/api/users", {}, admin2Tok)).status === 200);
  check("iki admin varken rol düşürme kabul edilir → 200", (await api(`/api/users/${admin2Id}`, { method: "PATCH", body: JSON.stringify({ role: "user" }) }, adminTok)).status === 200);
  check("rolü düşürülen adminin ESKİ jetonu artık yönetici değil", (await api("/api/users", {}, admin2Tok)).status !== 200);
  check("rolü düşürülen admin yeni kullanıcı oluşturamaz",
    (await api("/api/users", { method: "POST", body: JSON.stringify({ username: "arka_kapi", password: "hunter22", role: "admin" }) }, admin2Tok)).status !== 201);
  check("rolü düşürülen admin denetim kaydını silemez", (await api("/api/audit", { method: "DELETE" }, admin2Tok)).status !== 200);

  // ── Şifre uzunluğu ──────────────────────────────────────────────────────────
  check("kısa şifreyle kullanıcı ekleme → 400", (await api("/api/users", { method: "POST", body: JSON.stringify({ username: "yeni", password: "123", role: "user" }) }, adminTok)).status === 400);
  check("geçerli şifreyle kullanıcı ekleme → 201", (await api("/api/users", { method: "POST", body: JSON.stringify({ username: "yeni", password: "abcdef", role: "user" }) }, adminTok)).status === 201);

  // ── Sunucu admin jetonu: HTTP ucu yok, yalnız süreç-içi modül çağrısı ────────
  // REGRESYON: POST /auth/refresh-internal şifresiz + 2FA'sız 30 günlük admin jetonu veriyordu ve
  // tek koruması isteğin loopback'ten gelmesiydi. Sunucu PC'sinde oturum açabilen ikinci bir OS
  // kullanıcısı (data.db'yi DPAPI yüzünden okuyamayan biri) curl ile admin olabiliyordu; Host
  // doğrulanmadığı için DNS rebinding ile tarayıcıdan da sızdırılabiliyordu. Uç nokta kaldırıldı.
  const refGone = await api("/auth/refresh-internal", { method: "POST", body: JSON.stringify({ username: "admin" }) });
  check("refresh-internal ucu artık yok (loopback'ten bile admin jetonu dağıtmıyor)", refGone.status === 404);
  const icTok = server.issueAdminToken("admin");
  check("issueAdminToken admin için çalışan jeton üretir", !!icTok && (await api("/api/users", {}, icTok)).status === 200);
  check("issueAdminToken admin olmayan için null", server.issueAdminToken("ro") === null);
  check("issueAdminToken olmayan kullanıcı için null", server.issueAdminToken("yok-boyle-biri") === null);

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
  // 2FA açılınca token_version arttı: enable isteğini yapan ESKİ jeton artık geçersiz (diğer cihazlar düşer)
  check("2fa açılınca eski oturum jetonu düşer (401)", (await api("/api/version", {}, tfaTok)).status === 401);
  check("2fa/enable taze jeton döndürür ve çalışır", !!enableBody.token && (await api("/api/version", {}, enableBody.token)).status === 200);
  const noCode = await login("tfa", "tfapass1");
  check("2fa açık: kodsuz login → 401 requires2fa", noCode.status === 401 && noCode.body.requires2fa === true);
  const withCode = await login2fa("tfa", "tfapass1", totp.currentToken(setupBody.secret));
  check("2fa: doğru TOTP ile login başarılı", withCode.status === 200 && !!withCode.body.token);
  const withRec = await login2fa("tfa", "tfapass1", enableBody.recovery[0]);
  check("2fa: kurtarma kodu ile login başarılı", withRec.status === 200 && !!withRec.body.token);
  check("2fa: kullanılmış kurtarma kodu tekrar → 401", (await login2fa("tfa", "tfapass1", enableBody.recovery[0])).status === 401);
  // Step-up: 2FA sıfırlama admin'in KENDİ şifresini ister (kilitsiz oturum tek tıkla 2FA soyamasın).
  check("admin 2fa sıfırla: şifresiz → 401 (step-up)", (await api(`/api/users/${tfaId}/2fa`, { method: "DELETE" }, adminTok)).status === 401);
  check("admin 2fa sıfırla: yanlış admin şifresi → 401", (await api(`/api/users/${tfaId}/2fa`, { method: "DELETE", body: JSON.stringify({ password: "yanlis" }) }, adminTok)).status === 401);
  check("admin 2fa sıfırla: doğru admin şifresi → 200", (await api(`/api/users/${tfaId}/2fa`, { method: "DELETE", body: JSON.stringify({ password: "admin123" }) }, adminTok)).status === 200);
  check("sıfırlama sonrası kodsuz login çalışır", (await login("tfa", "tfapass1")).status === 200);

  // ── Sunucu KURULUM yolu login korumalarını atlayamaz (ortak authenticateLogin) ──
  // REGRESYON: setupAdmin eskiden bcrypt.compare + refresh-internal ile doğruluyordu; bu yol
  // 2FA'yı, kademeli kilidi ve güvenlik kaydını TAMAMEN baypas ediyordu (2FA açık admin şifresi
  // sınırsız denenebiliyordu). Artık setupAdmin da server.authenticateLogin kullanır — burada o
  // fonksiyonun korumaları doğrulanır. İzole IP (10.0.0.99) kullanılır ki 127.0.0.1 sayaçlarını
  // (aşağıdaki DoS/kaba-kuvvet testleri) bozmasın.
  const createSetup = await api("/api/users", { method: "POST", body: JSON.stringify({ username: "setup", password: "setup123", role: "user" }) }, adminTok);
  check("kurulum testi kullanıcısı oluşturuldu", createSetup.status === 201);
  const setupTok = (await login("setup", "setup123")).body.token;
  const setup2fa = await (await api("/auth/2fa/setup", { method: "POST" }, setupTok)).json();
  await api("/auth/2fa/enable", { method: "POST", body: JSON.stringify({ code: totp.currentToken(setup2fa.secret) }) }, setupTok);
  // Doğru şifre ama 2FA açık + kod yok → token YOK, requires2fa (kurulum ekranı 2FA'yı atlayamaz)
  const authNo2fa = await server.authenticateLogin({ username: "setup", password: "setup123", ip: "10.0.0.99" });
  check("authenticateLogin: 2FA açıkken kodsuz → requires2fa, token yok", authNo2fa.status === 401 && authNo2fa.requires2fa === true && !authNo2fa.token);
  // Yanlış şifre → token yok
  check("authenticateLogin: yanlış şifre → 401, token yok", (await server.authenticateLogin({ username: "setup", password: "yanlis", ip: "10.0.0.99" })).status === 401);
  // Doğru şifre + doğru kod → token
  const authOk = await server.authenticateLogin({ username: "setup", password: "setup123", totpCode: totp.currentToken(setup2fa.secret), ip: "10.0.0.99" });
  check("authenticateLogin: doğru şifre+2FA → token", authOk.status === 200 && !!authOk.token);
  // Yanlış şifreyi defalarca dene → kademeli kilit (429): kurulum ekranı sınırsız deneyemez
  let setup429 = -1;
  for (let i = 1; i <= 8; i++) {
    const r = await server.authenticateLogin({ username: "setup", password: "yine-yanlis", ip: "10.0.0.99" });
    if (r.status === 429) { setup429 = i; break; }
  }
  check("authenticateLogin: birkaç yanlıştan sonra kademeli kilit (429)", setup429 >= 3 && setup429 <= 8);

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
  const ingestGoruntu = await (await api("/api/security-log?action=uygulama_kilidi_basarisiz", {}, adminTok)).json();
  check("ingest edilen app-lock kaydı görünür", ingestGoruntu.total >= 1);
  check("ingest'te gönderen kullanıcı adı target'a yazıldı", ingestGoruntu.rows.some(r => r.actor === "Cihaz: TEST" && r.target === "admin"));
  // Temizle (admin) → temizlik sonrası tek "gecmis_temizlendi" kaydı kalır
  check("admin DELETE /api/security-log → 200", (await api("/api/security-log", { method: "DELETE" }, adminTok)).status === 200);
  const secAfterClear = await (await api("/api/security-log", {}, adminTok)).json();
  check("temizlik sonrası yalnız 'gecmis_temizlendi' kaydı kalır", secAfterClear.total === 1 && secAfterClear.rows[0].action === "gecmis_temizlendi");

  // ── Dosya arşivi uçları (Faz 2, çok kullanıcılı): yükle → indir → sil ──────────
  const upBuf = Buffer.from("PDF-benzeri-icerik-123");
  const upRes = await fetch(`${base}/api/files/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminTok}`, "Content-Type": "application/octet-stream", "X-Dosya-Adi": encodeURIComponent("rapor.pdf"), "X-Dosya-Firma": encodeURIComponent("ABC Makina") },
    body: upBuf,
  });
  const upBody = await upRes.json().catch(() => ({}));
  check("dosya yükleme → depoAdi + boyut döner", upRes.status === 200 && !!upBody.dosyaAdi && upBody.boyut === upBuf.length && upBody.tur === "PDF");
  // Okunur depo adı: firma önde, uzantı sonda, yol ayracı yok (indirme guard'ından geçer).
  check("okunur depo adı: firma önde + .pdf sonda + / yok", /^ABC Makina - rapor - .+\.pdf$/.test(upBody.dosyaAdi) && !upBody.dosyaAdi.includes("/"));
  check("token'sız yükleme → 401", (await fetch(`${base}/api/files/upload`, { method: "POST", headers: { "Content-Type": "application/octet-stream", "X-Dosya-Adi": "x.pdf" }, body: upBuf })).status === 401);
  check("izin verilmeyen tür yükleme → 400", (await fetch(`${base}/api/files/upload`, { method: "POST", headers: { Authorization: `Bearer ${adminTok}`, "Content-Type": "application/octet-stream", "X-Dosya-Adi": encodeURIComponent("virus.exe") }, body: Buffer.from("x") })).status === 400);
  const dl = await fetch(`${base}/api/files/${encodeURIComponent(upBody.dosyaAdi)}`, { headers: { Authorization: `Bearer ${adminTok}` } });
  const dlBuf = Buffer.from(await dl.arrayBuffer());
  check("dosya indirme içeriği yüklenenle eşleşir", dl.status === 200 && dlBuf.equals(upBuf));
  check("token'sız indirme → 401", (await fetch(`${base}/api/files/${encodeURIComponent(upBody.dosyaAdi)}`)).status === 401);
  check("path traversal indirme reddedilir", (await fetch(`${base}/api/files/${encodeURIComponent("../gizli")}`, { headers: { Authorization: `Bearer ${adminTok}` } })).status === 400);
  check("olmayan dosya indirme → 404", (await fetch(`${base}/api/files/yok-123.pdf`, { headers: { Authorization: `Bearer ${adminTok}` } })).status === 404);
  // Yetki: salt-okunur kullanıcı fiziksel dosya YÜKLEYEMEZ/SİLEMEZ (yalnız requireAuth yeterli değil).
  check("salt-okunur dosya yükleme → 403", (await fetch(`${base}/api/files/upload`, { method: "POST", headers: { Authorization: `Bearer ${roTok}`, "Content-Type": "application/octet-stream", "X-Dosya-Adi": encodeURIComponent("ro.pdf") }, body: upBuf })).status === 403);
  check("salt-okunur dosya silme → 403", (await fetch(`${base}/api/files/${encodeURIComponent(upBody.dosyaAdi)}`, { method: "DELETE", headers: { Authorization: `Bearer ${roTok}` } })).status === 403);
  check("salt-okunur indirme (okuma) izinli → 200", (await fetch(`${base}/api/files/${encodeURIComponent(upBody.dosyaAdi)}`, { headers: { Authorization: `Bearer ${roTok}` } })).status === 200);
  check("müşteri işlemi olan kullanıcı dosya yükleyebilir → 200", (await fetch(`${base}/api/files/upload`, { method: "POST", headers: { Authorization: `Bearer ${partTok}`, "Content-Type": "application/octet-stream", "X-Dosya-Adi": encodeURIComponent("part.pdf") }, body: upBuf })).status === 200);
  // ── Fiziksel silmede nesne (künye) düzeyi yetki ─────────────────────────────
  // REGRESYON (IDOR): dosyaIslemYetkisi yalnız "müşteri VEYA bayi yazma tümden kapalı mı" diye
  // soruyor, HANGİ dosyanın silindiğine bakmıyordu. customerActions:[] olan bayi sorumlusu,
  // künyesine hiç dokunamadığı müşteri sözleşmelerini geri dönüşsüz silebiliyordu: künye yazma
  // 403 verirken fiziksel silme 200 veriyordu. Depo adını tahmin etmesi de gerekmiyor, blob veriyor.
  const bayiciTok = (await login("bayici", "bayi123")).body.token;
  const kunye = { id: 500, customerId: 1, ad: "sozlesme.pdf", dosyaAdi: upBody.dosyaAdi, boyut: upBuf.length, tur: "PDF", tarih: "2026-07-17" };
  check("müşteri dosyası künyesi eklendi (admin)", (await postData({ dosyalar: [kunye] }, await curVer(adminTok), adminTok)).status === 200);
  check("bayici künyeyi yazamaz (kontrol: iki yol aynı kararı vermeli) → 403",
    (await postData({ dosyalar: [] }, await curVer(bayiciTok), bayiciTok)).status === 403);
  check("bayici müşteri dosyasını FİZİKSEL silemez → 403",
    (await fetch(`${base}/api/files/${encodeURIComponent(upBody.dosyaAdi)}`, { method: "DELETE", headers: { Authorization: `Bearer ${bayiciTok}` } })).status === 403);
  check("reddedilen silmeden sonra dosya hâlâ duruyor → 200",
    (await fetch(`${base}/api/files/${encodeURIComponent(upBody.dosyaAdi)}`, { headers: { Authorization: `Bearer ${adminTok}` } })).status === 200);
  // Simetri: müşteri sorumlusu (dealerActions:[]) bayi dosyasına dokunamaz.
  const bayiUp = await fetch(`${base}/api/files/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminTok}`, "Content-Type": "application/octet-stream", "X-Dosya-Adi": encodeURIComponent("bayi.pdf"), "X-Dosya-Firma": encodeURIComponent("Bayi") },
    body: upBuf,
  });
  const bayiDosya = (await bayiUp.json()).dosyaAdi;
  await postData({ dosyalar: [kunye, { id: 501, dealerId: 2, ad: "bayi.pdf", dosyaAdi: bayiDosya, tur: "PDF", tarih: "2026-07-17" }] }, await curVer(adminTok), adminTok);
  check("müşteri sorumlusu (dealerActions boş) bayi dosyasını silemez → 403",
    (await fetch(`${base}/api/files/${encodeURIComponent(bayiDosya)}`, { method: "DELETE", headers: { Authorization: `Bearer ${partTok}` } })).status === 403);
  check("bayici kendi tarafındaki bayi dosyasını silebilir → 200",
    (await fetch(`${base}/api/files/${encodeURIComponent(bayiDosya)}`, { method: "DELETE", headers: { Authorization: `Bearer ${bayiciTok}` } })).status === 200);

  check("dosya silme → 200", (await fetch(`${base}/api/files/${encodeURIComponent(upBody.dosyaAdi)}`, { method: "DELETE", headers: { Authorization: `Bearer ${adminTok}` } })).status === 200);
  check("silinen dosya indirme → 404", (await fetch(`${base}/api/files/${encodeURIComponent(upBody.dosyaAdi)}`, { headers: { Authorization: `Bearer ${adminTok}` } })).status === 404);

  // ── TLS + sertifika sabitleme (pinning), tek portta hibrit ───────────────────
  const pf = require(path.join(root, "electron", "pinnedFetch.cjs"));
  const stls = require(path.join(root, "electron", "serverTls.cjs"));
  const httpsBase = base.replace("http://", "https://");
  const srvFp = server.getCertFingerprint();
  check("sunucu bir TLS parmak izi üretti", typeof srvFp === "string" && /^[0-9A-F:]+$/.test(srvFp));
  const healthJson = await (await fetch(`${base}/health`)).json();
  check("/health tls:true ve sunucu fp'sini döner", healthJson.tls === true && healthJson.fp === srvFp);
  check("hibrit: eski http yolu hâlâ çalışır (aynı port)", (await fetch(`${base}/health`)).status === 200);
  const grab = await pf.sertifikaParmakIziAl(httpsBase);
  check("TLS peer parmak izi = sunucu fp", grab.fp === srvFp);
  const pinliOk = await pf.pinliFetch(`${httpsBase}/health`, { dispatcher: pf.pinliDispatcher(grab.pem) });
  check("pinlenmiş https ile /health → 200", pinliOk.status === 200);
  // Ortadaki-adam: başka bir self-signed sertifika pinlenirse el sıkışma reddedilmeli
  const wrongDir = fs.mkdtempSync(path.join(os.tmpdir(), "wrongcert-"));
  const { cert: wrongCert } = await stls.sertifikaUretVeyaYukle({ getPath: () => wrongDir });
  let mitmReddedildi = false;
  try { await pf.pinliFetch(`${httpsBase}/health`, { dispatcher: pf.pinliDispatcher(wrongCert) }); }
  catch { mitmReddedildi = true; }
  check("yanlış sertifika pinlenirse https reddedilir (MITM engellenir)", mitmReddedildi);
  fs.rmSync(wrongDir, { recursive: true, force: true });

  // ── Yalnız-HTTPS modu (hibriti kapatma); loopback muaf ───────────────────────
  server.setTlsOnly(true);
  check("tlsOnly açıldı", server.getTlsOnly() === true);
  check("tlsOnly: loopback http /health hâlâ 200 (muaf, sunucu kendi refresh'i çalışsın)", (await fetch(`${base}/health`)).status === 200);
  const pinliHealth2 = await pf.pinliFetch(`${httpsBase}/health`, { dispatcher: pf.pinliDispatcher(grab.pem) });
  check("tlsOnly: pinli https /health hâlâ 200", pinliHealth2.status === 200);
  // Dıştan düz http reddi (best-effort): erişilebilir bir LAN IP varsa doğrula, yoksa atla.
  const dışFetch = async (url) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), 3000); try { return await fetch(url, { signal: c.signal }); } finally { clearTimeout(t); } };
  let dışYapildi = false, dışReddedildi = false;
  for (const ip of server.getLocalIps().filter((ip) => ip !== "127.0.0.1")) {
    server.setTlsOnly(false);
    let acik = false;
    try { acik = (await dışFetch(`http://${ip}:${port}/health`)).ok; } catch { acik = false; }
    if (!acik) continue; // bu IP sandbox/firewall'da erişilemiyor → atla
    server.setTlsOnly(true);
    dışYapildi = true;
    try { await dışFetch(`http://${ip}:${port}/health`); dışReddedildi = false; } catch { dışReddedildi = true; }
    break;
  }
  if (dışYapildi) check("tlsOnly: dıştan düz http bağlantısı reddedilir", dışReddedildi);
  else console.log("SKIP  tlsOnly dış reddi (erişilebilir harici LAN IP yok)");
  server.setTlsOnly(false); // sonraki kontrolleri etkilemesin

  // ── Tek oturum (admin hariç) + admin "tüm cihazlardan çıkar" ──────────────────
  const createSess = await api("/api/users", { method: "POST", body: JSON.stringify({ username: "sess", password: "sess123", role: "user" }) }, adminTok);
  const sessId = (await createSess.json()).id;
  const sess1 = (await login("sess", "sess123")).body.token;
  const sess2 = (await login("sess", "sess123")).body.token;
  check("tek oturum: ikinci giriş ilk jetonu düşürür (401)", (await api("/api/version", {}, sess1)).status === 401);
  check("tek oturum: en son jeton çalışır", (await api("/api/version", {}, sess2)).status === 200);
  const adminB = (await login("admin", "admin123")).body.token;
  check("admin tek oturuma MUAF: hem eski hem yeni admin jetonu geçerli", (await api("/api/version", {}, adminTok)).status === 200 && (await api("/api/version", {}, adminB)).status === 200);
  check("logout-all: salt-okunur → 403 (yalnız admin)", (await api(`/api/users/${sessId}/logout-all`, { method: "POST" }, roTok)).status === 403);
  check("logout-all: admin → 200", (await api(`/api/users/${sessId}/logout-all`, { method: "POST" }, adminTok)).status === 200);
  check("logout-all sonrası kullanıcının jetonu düşer (401)", (await api("/api/version", {}, sess2)).status === 401);

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
  let ilk429 = -1, kilitCevap = null;
  for (let i = 1; i <= 6; i++) {
    const r = await login("admin", "yanlisSifre");
    if (r.status === 429) { ilk429 = i; kilitCevap = r; break; }
  }
  check("ilk 2 deneme kademeli kilide takılmaz (401)", ilk429 === -1 || ilk429 >= 3);
  check("birkaç yanlıştan sonra 429 (kademeli kilit devreye girer)", ilk429 >= 3 && ilk429 <= 6);
  // İstemci giriş ekranı geri sayımı bu alandan besleniyor — gövdede retryAfterSec olmalı.
  check("429 gövdesi retryAfterSec döner (istemci geri sayımı)", kilitCevap && typeof kilitCevap.body.retryAfterSec === "number" && kilitCevap.body.retryAfterSec > 0);

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
