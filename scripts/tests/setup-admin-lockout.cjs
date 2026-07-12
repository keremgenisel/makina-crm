// Sunucu KURULUM (server:setupAdmin) yolunun kademeli giriş kilidine takıldığını doğrular.
// Electron altında koşar (better-sqlite3 Electron ABI'siyle derli). GERÇEK setupAdmin IPC
// handler'ı arka arkaya yanlış şifreyle çağrılır ve birkaç denemeden sonra kilit ("Çok fazla")
// devreye girmelidir. REGRESYON: setupAdmin doğrulamayı embeddedServer.start() ile yapıyordu;
// start() her çağrıda pruneRateBuckets çalıştırıp henüz kilitlenmemiş (reset_at=now) kademeli
// sayacı sildiği için sayaç asla 3'e ulaşamıyor, kilit HİÇ devreye girmiyor ve admin şifresi
// sınırsız denenebiliyordu. Düzeltme: db başlatmadan bağlanır, doğrulama önce yapılır, sunucu
// yalnız başarıda başlatılır.
const path = require("path");
const os = require("os");
const fs = require("fs");
const Module = require("module");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-setuplock-"));
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

let fail = 0;
const check = (name, ok) => { console.log((ok ? "PASS" : "FAIL") + "  " + name); if (!ok) fail++; };
process.on("uncaughtException", (e) => { console.error("FAIL (uncaught):", e && e.stack || e); process.exit(1); });

(async () => {
  dbmod.migrateFromJsonIfNeeded();
  if (!dbmod.isActive()) { console.error("FAIL: sqlite aktif değil"); process.exit(1); }
  dbmod.createUser("admin", bcrypt.hashSync("dogruSifre1", 10), "admin", null);

  // Gerçek IPC handler'larını yakala
  const handlers = {};
  const fakeIpc = { handle: (name, fn) => { handlers[name] = fn; }, on: () => {} };
  const fakeApp = { getPath: () => tmpDir };
  dataMod.registerDataHandlers(fakeIpc, fakeApp, null, dbmod);
  const setupAdmin = handlers["server:setupAdmin"];
  check("server:setupAdmin handler'ı kayıtlı", typeof setupAdmin === "function");

  // Arka arkaya yanlış şifre → birkaç denemeden sonra kilit ("Çok fazla") gelmeli (sınırsız DEĞİL)
  let blocked = -1;
  for (let i = 1; i <= 10; i++) {
    const r = await setupAdmin(null, { username: "admin", password: "yanlisSifre", port: 0 });
    if (r?.error && /çok fazla/i.test(r.error)) { blocked = i; break; }
  }
  check("setupAdmin: birkaç yanlıştan sonra kilit devreye girer (sınırsız deneme engellendi)", blocked >= 3 && blocked <= 10);

  // Başarısız denemeler Kullanıcı Geçmişi'ne (security_log) yazıldı mı?
  check("setupAdmin başarısız denemeleri güvenlik kaydına yazıldı",
    dbmod.getSecurityLog({ action: "giris_basarisiz", actor: "admin" }).total >= 3);

  // Kilit süresi dolduktan sonra DOĞRU şifreyle sunucu başlar (kademeli sayaç 5sn sonra açılır)
  await new Promise(r => setTimeout(r, 5200));
  const okRes = await setupAdmin(null, { username: "admin", password: "dogruSifre1", port: 34567 });
  check("kilit süresi sonrası doğru şifreyle sunucu başlar", okRes?.ok === true);
  check("başarılı kurulum güvenlik kaydına giris_basarili yazdı",
    dbmod.getSecurityLog({ action: "giris_basarili", actor: "admin" }).total >= 1);

  await server.stop();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (fail) { console.error(`${fail} kontrol BASARISIZ`); process.exit(1); }
  console.log("TUM KONTROLLER GECTI");
  process.exit(0);
})();
