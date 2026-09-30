// Spec 0052 R12, AC-6, AC-17, AC-18, AC-19: Kasa sekme izni geri doldurması. Electron altında koşar
// (tests/db-electron.test.js başlatır). 0052 öncesi hâli kurar (kullanıcılar, işaret YOK), yerel veritabanı açılışını
// çalıştırır ve şunları doğrular: gider + finance olup kasa olmayan kullanıcıya "kasa" eklenir (listenin geri kalanı ve
// öteki izinler aynen); başka hiçbir kullanıcıya dokunulmaz; ikinci açılış ikinci "kasa" eklemez; kullanıcısız (yerel
// mod) veritabanında hata vermez ve yalnız işaret yazılır; kullanıcı tablosu dışında hiçbir veri değişmez (AC-16).
const path = require("path");
const os = require("os");
const fs = require("fs");
const Module = require("module");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-kasa-sekme-"));
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "electron") return { app: { getPath: () => tmpDir } };
  return origLoad(request, parent, isMain);
};
const root = path.join(__dirname, "..", "..");
let fail = 0;
const check = (name, ok) => { console.log((ok ? "PASS" : "FAIL") + "  " + name); if (!ok) fail++; };
process.on("uncaughtException", (e) => { console.error("FAIL (uncaught):", e && e.stack || e); process.exit(1); });

let Database;
try { Database = require("better-sqlite3-multiple-ciphers"); } catch { Database = require("better-sqlite3"); }
const dbmod = require(path.join(root, "electron", "db.cjs"));
const BAYRAK = "kasaSekmeGocu0052";

// 1) Yerel mod: temiz kurulum, kullanıcı yok. Hata yok, işaret yazılır, kullanıcı tablosu boş kalır (AC-19).
let hata = null;
try { dbmod.migrateFromJsonIfNeeded(); } catch (e) { hata = e; }
check("AC-19: kullanıcısız (yerel) veritabanında geri doldurma hata vermez", hata === null && dbmod.isActive());
check("AC-19: işaret yazıldı, kullanıcı tablosu boş", !!dbmod.getMetaValue(BAYRAK) && dbmod.getAllUsers().length === 0);

// 2) 0052 öncesi sunucu veritabanı: kullanıcılar + veri, işaret YOK.
const izin = (o) => JSON.stringify(o);
const K = {
  eski:       ["eski", "user", izin({ tabs: ["dashboard", "gider", "finance"], giderActions: ["kasa_hesap"], customerActions: ["cust_add"] })],
  yalnizGider:["yalnizGider", "user", izin({ tabs: ["dashboard", "gider"] })],
  yalnizFin:  ["yalnizFin", "user", izin({ tabs: ["finance", "customers"] })],
  zatenKasa:  ["zatenKasa", "user", izin({ tabs: ["gider", "kasa", "finance"] })],
  tanimsiz:   ["tanimsiz", "user", izin({ customerActions: [] })],
  izinsiz:    ["izinsiz", "user", null],
  bozuk:      ["bozuk", "user", "{bozuk"],
  yonetici:   ["yonetici", "admin", izin({ tabs: ["gider", "finance"] })],
};
for (const [ad, rol, p] of Object.values(K)) dbmod.createUser(ad, "x", rol, p);
dbmod.writeBlobToDb({
  customers: [{ id: 700, name: "FİRMA", model: "AK120" }], dealers: [], services: [], stock: [], notes: [], parts: [], partSales: [], payments: [],
  kalipDefs: [], giderTurleri: [{ id: 1, ad: "Malzeme", davranis: "normal" }], giderler: [], hesapHareketleri: [],
  kasaHesaplari: [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 1000, acilisTarihi: "2026-01-01", kapali: false }],
});
const dbPath = dbmod.getDbPath();
const oncekiVeri = JSON.stringify(dbmod.readBlobFromDb());
const oncekiIzinler = Object.fromEntries(dbmod.getAllUsers().map(u => [u.username, u.permissions]));
dbmod.close();
const bayrakSil = () => { const c = new Database(dbPath); c.prepare(`DELETE FROM meta WHERE key = ?`).run(BAYRAK); c.close(); };
bayrakSil();

// 3) Sunucu PC açılışı: geri doldurma çalışır.
dbmod.migrateFromJsonIfNeeded();
const kullanici = (ad) => dbmod.getAllUsers().find(u => u.username === ad);
const eski = JSON.parse(kullanici("eski").permissions);
check("AC-6: gider + finance'lı eski kullanıcının listesine 'kasa' eklendi",
  JSON.stringify(eski.tabs) === JSON.stringify(["dashboard", "gider", "finance", "kasa"]));
check("AC-6: öteki izinleri aynen korundu", JSON.stringify(eski.giderActions) === JSON.stringify(["kasa_hesap"]) && JSON.stringify(eski.customerActions) === JSON.stringify(["cust_add"]));
const dokunulmayanlar = ["yalnizGider", "yalnizFin", "zatenKasa", "tanimsiz", "izinsiz", "bozuk", "yonetici"];
check("AC-18: başka hiçbir kullanıcının izin kaydı değişmedi (yalnız gider, yalnız finans, zaten kasalı, tanımsız, izinsiz, bozuk, yönetici)",
  dokunulmayanlar.every(ad => kullanici(ad).permissions === oncekiIzinler[ad]));
check("AC-16: kullanıcı tablosu dışında hiçbir veri değişmedi", JSON.stringify(dbmod.readBlobFromDb()) === oncekiVeri);
check("R12: işaret yazıldı", !!dbmod.getMetaValue(BAYRAK));

// 4) İkinci açılış (işaret var): ikinci "kasa" yok. İşaret varken yönetici kasayı kaldırırsa geri eklenmez (AC-7, X5).
dbmod.close();
dbmod.migrateFromJsonIfNeeded();
check("AC-17: ikinci açılışta aynı kullanıcıya ikinci 'kasa' eklenmedi",
  JSON.parse(kullanici("eski").permissions).tabs.filter(t => t === "kasa").length === 1);
dbmod.updateUser(kullanici("eski").id, { permissions: izin({ ...eski, tabs: ["dashboard", "gider", "finance"] }) });
dbmod.close();
dbmod.migrateFromJsonIfNeeded();
check("AC-7 / AC-17: yönetici kaldırdıktan sonra açılış hakkı geri vermedi (bir kerelik)",
  !JSON.parse(kullanici("eski").permissions).tabs.includes("kasa"));

// 5) Geri doldurma yalnız yerel veritabanı katmanında; HTTP ve istemci yolunda çağrılmaz.
const kaynaklar = ["electron/server.cjs", "electron/ipc/data.cjs", "src/App.jsx"].map(f => fs.readFileSync(path.join(root, f), "utf-8"));
check("R12: geri doldurma sunucu ve istemci veri yolunda çağrılmıyor", kaynaklar.every(s => !/kasaSekmeGocu/.test(s)));
const db = fs.readFileSync(path.join(root, "electron", "db.cjs"), "utf-8");
check("R12: üç açılış dalında da çağrılıyor", (db.match(/^\s*kasaSekmeGocu\((db|conn)\);/gm) || []).length === 3);

dbmod.close();
fs.rmSync(tmpDir, { recursive: true, force: true });
if (fail) { console.error(`${fail} kontrol BASARISIZ`); process.exit(1); }
console.log("TUM KONTROLLER GECTI");
process.exit(0);
