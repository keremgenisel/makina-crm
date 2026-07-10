// İstemci app-lock kuyruğunun sunucuya gönderilmesi (flushSecurityQueue) entegrasyon testi.
// Electron altında koşar (better-sqlite3 + gerçek gömülü sunucu). REGRESYON: kuyruk yalnızca
// server:login anında gönderiliyordu; istemci önbellek token'la açılınca login çağrılmadığı
// için app-lock kayıtları Kullanıcı Geçmişi'ne HİÇ ulaşmıyordu. Bu test, login OLMADAN
// doğrudan flushSecurityQueue çağrısının (boot/poll/refresh tetikleyicilerinin yaptığı)
// kuyruğu sunucunun security_log'una işlediğini ve app-lock dışı sahte kayıtları reddettiğini
// doğrular.
const path = require("path");
const os = require("os");
const fs = require("fs");
const Module = require("module");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-flushtest-"));
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "electron") return {
    app: { getPath: () => tmpDir },
    BrowserWindow: { getAllWindows: () => [] },
    safeStorage: { isEncryptionAvailable: () => false },
  };
  return origLoad(request, parent, isMain);
};

const root = path.join(__dirname, "..", "..");
const bcrypt = require(path.join(root, "node_modules", "bcryptjs"));
const dbmod = require(path.join(root, "electron", "db.cjs"));
const server = require(path.join(root, "electron", "server.cjs"));
const dataMod = require(path.join(root, "electron", "ipc", "data.cjs"));
const securityQueue = require(path.join(root, "electron", "securityQueue.cjs"));

let fail = 0;
const check = (name, ok) => { console.log((ok ? "PASS" : "FAIL") + "  " + name); if (!ok) fail++; };
process.on("uncaughtException", (e) => { console.error("FAIL (uncaught):", e && e.stack || e); process.exit(1); });

(async () => {
  dbmod.migrateFromJsonIfNeeded();
  if (!dbmod.isActive()) { console.error("FAIL: sqlite aktif değil"); process.exit(1); }
  dbmod.createUser("admin", bcrypt.hashSync("admin123", 10), "admin", null);

  const { port } = await server.start(0, dbmod);
  const base = `http://127.0.0.1:${port}`;

  const loginRes = await fetch(`${base}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const token = (await loginRes.json()).token;
  check("giriş token'ı alındı", !!token);

  const app = { getPath: () => tmpDir };
  const qp = dataMod.getSecurityQueuePath(app);

  // İstemci PC'nin açılışta biriktirdiği gibi kuyruğa app-lock denemeleri yaz
  securityQueue.enqueue(qp, { ts: "2026-07-10T06:00:00.000Z", actor: "Cihaz: TESTPC", action: "uygulama_kilidi_basarisiz", detail: JSON.stringify({ sebep: "Yanlış şifre" }) });
  securityQueue.enqueue(qp, { ts: "2026-07-10T06:01:00.000Z", actor: "Cihaz: TESTPC", action: "uygulama_kilidi_basarili" });
  check("kuyrukta 2 kayıt var", securityQueue.readQueue(qp).length === 2);

  // LOGIN OLMADAN doğrudan flush (düzeltmenin özü: bağlantı doğrulanan her noktadan tetiklenir)
  await dataMod.flushSecurityQueue(app, base, token);

  const basarisiz = dbmod.getSecurityLog({ action: "uygulama_kilidi_basarisiz" });
  check("app-lock başarısız kaydı sunucuya işlendi (zaman damgası korunur)",
    basarisiz.total === 1 && basarisiz.rows[0].actor === "Cihaz: TESTPC" && basarisiz.rows[0].ts === "2026-07-10T06:00:00.000Z");
  check("app-lock başarılı kaydı da işlendi", dbmod.getSecurityLog({ action: "uygulama_kilidi_basarili" }).total === 1);
  check("gönderim sonrası kuyruk temizlendi", securityQueue.readQueue(qp).length === 0);

  // Sahte enjeksiyon: ingest yalnız app-lock kabul eder (kuyruğa sızan 'giris_basarili' reddedilir)
  securityQueue.enqueue(qp, { ts: "2026-07-10T06:02:00.000Z", actor: "Cihaz: TESTPC", action: "giris_basarili" });
  await dataMod.flushSecurityQueue(app, base, token);
  check("sahte 'giris_basarili' kuyruk kaydı sunucuya yazılmadı",
    dbmod.getSecurityLog({ action: "giris_basarili", actor: "Cihaz: TESTPC" }).total === 0);

  await server.stop();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (fail) { console.error(`${fail} kontrol BASARISIZ`); process.exit(1); }
  console.log("TUM KONTROLLER GECTI");
  process.exit(0);
})();
