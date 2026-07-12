// Veritabanı at-rest şifreleme testi — Electron altında koşar (native modül ABI'si).
// Senaryo: (1) safeStorage yokken düz DB oluşur (eski davranış), (2) safeStorage gelince
// bir sonraki açılışta mevcut düz DB yerinde şifrelenir, veri korunur ve dosya artık düz
// metin sızdırmaz, (3) yeniden açılışta saklı anahtarla tekrar okunur.
const path = require("path");
const os = require("os");
const fs = require("fs");
const Module = require("module");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-dbenc-"));
const MARKER = "GIZLI_MUSTERI_MARKER_9F3A";

// safeStorage taklidini çalışma anında aç/kapat: db.cjs require anında yakaladığından,
// faz değişiminde db.cjs require önbelleği temizlenip yeniden yüklenir.
let safeStorageMock; // undefined → şifreleme kapalı
// Gerçek safeStorage opak şifreler; mock, düz metin sızmadığını doğrulayabilmek için
// base64 ile geri-döndürülebilir biçimde gizler (DB tarafında asıl şifrelemeyi SQLCipher yapar).
const gercekSafe = {
  isEncryptionAvailable: () => true,
  encryptString: (s) => Buffer.from("v1:" + Buffer.from(s, "utf-8").toString("base64"), "utf-8"),
  decryptString: (b) => Buffer.from(Buffer.from(b).toString("utf-8").replace(/^v1:/, ""), "base64").toString("utf-8"),
};

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "electron") return { app: { getPath: () => tmpDir }, safeStorage: safeStorageMock };
  return origLoad(request, parent, isMain);
};

const root = path.join(__dirname, "..", "..");
const dbCjs = path.join(root, "electron", "db.cjs");
let fail = 0;
const check = (name, ok) => { console.log((ok ? "PASS" : "FAIL") + "  " + name); if (!ok) fail++; };
process.on("uncaughtException", (e) => { console.error("FAIL (uncaught):", e && e.stack || e); process.exit(1); });

const dosyaIcerir = (p, s) => fs.existsSync(p) && fs.readFileSync(p).includes(Buffer.from(s));
const dbVeWalIcerir = (base, s) => dosyaIcerir(base, s) || dosyaIcerir(base + "-wal", s);
const freshDb = () => { delete require.cache[require.resolve(dbCjs)]; return require(dbCjs); };

const dataDb = path.join(tmpDir, "data.db");

// ── Faz 1: safeStorage yok → düz DB, marker düz metin ────────────────────────
safeStorageMock = undefined;
let dbmod = freshDb();
dbmod.migrateFromJsonIfNeeded(); // temiz kurulum (branch 2)
check("faz1: sqlite aktif (şifrelemesiz)", dbmod.isActive());
dbmod.setMetaValue("marker", MARKER);
check("faz1: dbEncryptionStatus.encrypted=false (şifreleme kapalı)", dbmod.dbEncryptionStatus().encrypted === false);
dbmod.close();
// Tekrar aç: branch 1 journal_mode = WAL yapar → gerçek dünyadaki gibi WAL modunda DÜZ DB.
// (rekey WAL modda desteklenmediğinden bu senaryo şifreleme geçişini test eder.)
dbmod = freshDb();
dbmod.migrateFromJsonIfNeeded();
dbmod.close();
check("faz1: düz DB dosyada marker görünür (WAL modda)", dbVeWalIcerir(dataDb, MARKER));

// ── Faz 2: safeStorage geldi → açılışta yerinde şifrelenir ───────────────────
safeStorageMock = gercekSafe;
dbmod = freshDb();
dbmod.migrateFromJsonIfNeeded();
check("faz2: sqlite aktif (şifreli açıldı)", dbmod.isActive());
check("faz2: veri korunur (marker okunur)", dbmod.getMetaValue("marker") === MARKER);
check("faz2: dosya artık marker'ı DÜZ sızdırmaz", !dbVeWalIcerir(dataDb, MARKER));
check("faz2: anahtar dosyası oluştu (db-key.enc)", fs.existsSync(path.join(tmpDir, "db-key.enc")));
check("faz2: geçiş sonrası DÜZ yedek temizlendi (.pre-encrypt.bak yok)", !fs.existsSync(dataDb + ".pre-encrypt.bak"));
dbmod.close();

// ── Faz 2b: anahtarsız açılış reddedilir (gerçekten şifreli) ─────────────────
let anahtarsizReddedildi = false;
try {
  const D = require(path.join(root, "node_modules", "better-sqlite3-multiple-ciphers"));
  const x = new D(dataDb);
  x.prepare("SELECT count(*) FROM sqlite_master").get();
  x.close();
} catch { anahtarsizReddedildi = true; }
check("faz2b: anahtarsız açılış reddedilir (dosya şifreli)", anahtarsizReddedildi);

// ── Faz 3: yeniden açılış saklı anahtarla okur ───────────────────────────────
dbmod = freshDb();
dbmod.migrateFromJsonIfNeeded();
check("faz3: yeniden açılışta aktif", dbmod.isActive());
check("faz3: saklı anahtarla veri okunur", dbmod.getMetaValue("marker") === MARKER);
check("faz3: dosya hâlâ şifreli (marker sızmaz)", !dbVeWalIcerir(dataDb, MARKER));
check("faz3: dbEncryptionStatus.encrypted=true", dbmod.dbEncryptionStatus().encrypted === true);
dbmod.close();

// ── jsonStore: istemci veri önbelleği at-rest şifreleme ──────────────────────
const jsonStorePath = path.join(root, "electron", "jsonStore.cjs");
const freshJsonStore = () => { delete require.cache[require.resolve(jsonStorePath)]; return require(jsonStorePath); };
const MARKER2 = "ONBELLEK_MARKER_7C1E";

// safeStorage AÇIK → şifreli
safeStorageMock = gercekSafe;
let js = freshJsonStore();
const encFile = path.join(tmpDir, "cache-enc.json");
js.writeJson(encFile, { firma: MARKER2, gizli: true });
check("jsonStore: şifreli dosya marker'ı sızdırmaz", !dosyaIcerir(encFile, MARKER2));
check("jsonStore: şifreli dosya MAGIC ile başlar", fs.readFileSync(encFile).subarray(0, js.MAGIC.length).equals(js.MAGIC));
check("jsonStore: şifreliyi geri okur", js.readJson(encFile).firma === MARKER2);

// safeStorage KAPALI → düz metin (geri uyumluluk), eski düz dosya okunur
safeStorageMock = undefined;
js = freshJsonStore();
const plainFile = path.join(tmpDir, "cache-plain.json");
js.writeJson(plainFile, { firma: MARKER2 });
check("jsonStore: safeStorage yokken düz yazar (marker görünür)", dosyaIcerir(plainFile, MARKER2));
check("jsonStore: düz dosyayı geri okur", js.readJson(plainFile).firma === MARKER2);

fs.rmSync(tmpDir, { recursive: true, force: true });
if (fail) { console.error(`${fail} kontrol BASARISIZ`); process.exit(1); }
console.log("TUM KONTROLLER GECTI");
process.exit(0);
