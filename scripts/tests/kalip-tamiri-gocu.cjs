// Spec 0115 R4–R4/3, C5, Karar 49, 57; AC-5..AC-9, AC-82..AC-85: kalıp revize parçalarının bir kerelik tip göçü. Electron
// altında koşar (tests/db-electron.test.js başlatır). Yerel veritabanı açılışını çalıştırır ve şunları doğrular: tip listesi
// yokken hiçbir şey yazılmaz ve bayrak da yazılmaz; liste varken yeni tip sona eklenir, eşleşen parçalar taşınır, öteki
// tipler ve parçalar aynen kalır; ikinci açılışta yeniden çalışmaz; elle düzeltilen tip geri alınmaz.
const path = require("path");
const os = require("os");
const fs = require("fs");
const Module = require("module");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-kalip-tamiri-"));
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
const BAYRAK = "kalipTamiriGocu0115";

// 1) Temiz kurulum: tip listesi yok. Hiçbir şey yazılmaz, bayrak da yazılmaz (AC-82).
dbmod.migrateFromJsonIfNeeded();
check("AC-82: tip listesi yokken bayrak yazılmadı", !dbmod.getMetaValue(BAYRAK));
const PARTS = [
  { id: 1, ad: "100_ERKEK KALIPLAR REVİZE", tip: "Standart" },
  { id: 2, ad: "44*80 dişi kalıplar revize", tip: "" },
  { id: 3, ad: "KALIP MİLİ REVİZE", tip: "Standart" },
  { id: 4, ad: "KALIP RULMANI REVİZE" },
  { id: 5, ad: "Kalıp yatağı revize" },
  { id: 6, ad: "KAZAN REVİZE" },
  { id: 7, ad: "KARIŞTIRICI REVİZE" },
  { id: 8, ad: "ERKEK KALIP REVİZE", tip: "Bant" },
  { id: 9, ad: "DİŞİ KALIP REVİZE", deletedAt: "2026-01-01" },
  { id: 10, ad: "Rulman", adEN: "KALIP REVİZE", kod: "KALIP REVİZE", tanim: "KALIP REVİZE" },
];
const TIPLER = [
  { id: "standart", ad: "Standart", renk: "slate", makinaSecici: false, stokDus: false, raporGoster: false, sistem: true },
  { id: "konveyor", ad: "Konveyör Saç", renk: "blu", makinaSecici: true, stokDus: true, raporGoster: false, sistem: true, rol: "konveyor" },
  { id: "bant", ad: "Bant", renk: "grn", makinaSecici: true, stokDus: true, raporGoster: true, sistem: true, rol: "bant" },
  { id: "tip_9", ad: "Motor", renk: "blu", makinaSecici: false, stokDus: false, raporGoster: false, sistem: false },
];
// Tip listesi olmayan veri yazılır (App henüz tohumlamadı) ve yeniden açılır: hâlâ bir şey yazılmaz (AC-82).
dbmod.writeBlobToDb({ parts: PARTS });
dbmod.close(); dbmod.migrateFromJsonIfNeeded();
// Veritabanı tipsiz parçayı "Standart" yazar; karşılaştırma boş tipi Standart sayar (dedektörle aynı kural).
const tipNorm = (t) => t || "Standart";
check("AC-82: parça var, tip listesi yok: bayrak yok, parçalar aynen", !dbmod.getMetaValue(BAYRAK) && dbmod.readBlobFromDb().parts.every(p => tipNorm(p.tip) === tipNorm(PARTS.find(x => x.id === p.id).tip)));

// 2) App sistem tiplerini tohumladı (dolu liste). Sonraki açılışta göç çalışır.
dbmod.writeBlobToDb({ parts: PARTS, partTypeDefs: TIPLER });
const once = dbmod.readBlobFromDb();
dbmod.close(); dbmod.migrateFromJsonIfNeeded();
const sonra = dbmod.readBlobFromDb();
const tip = sonra.partTypeDefs.at(-1);
check("AC-83: yeni tip listenin sonunda, var olan tipler aynen", JSON.stringify(sonra.partTypeDefs.slice(0, TIPLER.length)) === JSON.stringify(TIPLER) && sonra.partTypeDefs.length === TIPLER.length + 1);
check("R4/2: yeni tip kullanıcı tipi, yalnız kalipIsi açık, paletin sıradaki rengi", tip.ad === "Kalıp Revize" && tip.kalipIsi === true && tip.sistem === false
  && !tip.makinaSecici && !tip.stokDus && !tip.raporGoster && tip.renk === "grn" && /^tip_\d+$/.test(tip.id));
const tipi = (id) => sonra.parts.find(p => p.id === id).tip || "";
check("AC-5, AC-84: KALIP + REVİZE iki yazımda da taşındı", tipi(1) === "Kalıp Revize" && tipi(2) === "Kalıp Revize");
check("AC-6: kalıp mili, rulmanı, yatağı taşınmadı", [3, 4, 5].every(id => tipi(id) !== "Kalıp Revize"));
check("AC-7: kalıp dışı revize kalemleri taşınmadı", [6, 7].every(id => tipi(id) !== "Kalıp Revize"));
check("AC-85: tipi Standart olmayan ve çöpteki parça taşınmadı", tipi(8) === "Bant" && tipi(9) !== "Kalıp Revize");
check("AC-84: yalnız ad okunur (adEN, kod, tanım eşleşmez)", tipi(10) !== "Kalıp Revize");
const parcaBaskasi = (b) => b.parts.map(({ tip: _t, ...p }) => p);
check("C5: parçaların tip dışındaki alanları değişmedi", JSON.stringify(parcaBaskasi(sonra)) === JSON.stringify(parcaBaskasi(once)));
check("AC-8: bayrak yazıldı", !!dbmod.getMetaValue(BAYRAK));

// 3) Kullanıcı tipi elle değiştirir; ikinci açılışta göç yeniden çalışmaz ve elle değişikliği geri almaz (AC-8, AC-9).
const elle = sonra.parts.map(p => (p.id === 1 ? { ...p, tip: "Standart" } : p));
dbmod.writeBlobToDb({ parts: elle, partTypeDefs: sonra.partTypeDefs });
dbmod.close(); dbmod.migrateFromJsonIfNeeded();
const ucuncu = dbmod.readBlobFromDb();
check("AC-8: ikinci açılışta tip ikinci kez eklenmedi", ucuncu.partTypeDefs.filter(t => t.ad === "Kalıp Revize").length === 1);
check("AC-9: elle değiştirilen tip geri alınmadı", ucuncu.parts.find(p => p.id === 1).tip === "Standart");

// 4) Aynı adlı tip zaten varsa (Türkçe katlama) göç tip yazmaz, parça taşımaz, yalnız bayrak (Karar 49).
const dbPath = dbmod.getDbPath();
dbmod.writeBlobToDb({ parts: PARTS, partTypeDefs: [...TIPLER, { id: "tip_x", ad: "KALIP REVİZE", renk: "pur", sistem: false }] });
dbmod.close();
{ const c = new Database(dbPath); c.prepare(`DELETE FROM meta WHERE key = ?`).run(BAYRAK); c.close(); }
dbmod.migrateFromJsonIfNeeded();
const dorduncu = dbmod.readBlobFromDb();
check("Karar 49: aynı adlı tip varken liste uzamadı, parça taşınmadı, bayrak yazıldı", dorduncu.partTypeDefs.length === TIPLER.length + 1
  && dorduncu.parts.find(p => p.id === 1).tip === "Standart" && !!dbmod.getMetaValue(BAYRAK));

// 5) Göç yalnız yerel veritabanı açılışında; üç açılış dalında çağrılır; sunucu ve istemci veri yolu çağırmaz (C5, Karar 57).
const kaynaklar = ["electron/server.cjs", "electron/ipc/data.cjs", "src/App.jsx"].map(f => fs.readFileSync(path.join(root, f), "utf-8"));
check("C5: göç sunucu ve istemci veri yolunda çağrılmıyor", kaynaklar.every(s => !/kalipTamiriGocu/.test(s)));
const db = fs.readFileSync(path.join(root, "electron", "db.cjs"), "utf-8");
check("C5: üç açılış dalında da çağrılıyor", (db.match(/^\s*kalipTamiriGocu\((db|conn)\);/gm) || []).length === 3);

dbmod.close();
fs.rmSync(tmpDir, { recursive: true, force: true });
if (fail) { console.error(`${fail} kontrol BASARISIZ`); process.exit(1); }
console.log("TUM KONTROLLER GECTI");
process.exit(0);
