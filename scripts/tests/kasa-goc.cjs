// Spec 0024 R4, AC-21, AC-22: kasa göçü. Electron altında koşar (tests/db-electron.test.js başlatır).
// Göç öncesi hâli kurar (ödenmiş kalemler + 0021 taksit satırı bayrakları, göç bayrağı YOK), yerel veritabanı açılışını
// çalıştırır ve şunları doğrular: ödenmiş taksitsiz kalem tam kapatan (tutarsız, hesapsız) bir hareket alır; ödenmiş taksit
// satırı kendi tutarıyla bir hareket alır; ödenmemişler hareket almaz; göçten önce yedek alınır; göç ikinci kez (bayrakla
// da, bayraksız da) ikinci kayıt üretmez.
const path = require("path");
const os = require("os");
const fs = require("fs");
const Module = require("module");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-kasa-goc-"));
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

// 1) Temiz kurulum (bayrak yazılır), sonra göç öncesi veriyi yaz ve bayrağı sil: eski sürümden gelen veritabanı.
dbmod.migrateFromJsonIfNeeded();
const blob = {
  customers: [], dealers: [], services: [], stock: [], notes: [], parts: [], partSales: [], payments: [], kalipDefs: [],
  giderTurleri: [{ id: 1, ad: "Elektrik", davranis: "normal" }],
  giderler: [
    { id: 11, tarih: "2026-06-01", turId: 1, tutar: 1000, kdvOrani: 20, odendi: true, odemeTarihi: "2026-06-05", odemeYontemi: "Havale", modelSatirlari: [], taksitler: [] },
    { id: 12, tarih: "2026-06-02", turId: 1, tutar: 500, kdvOrani: 20, odendi: false, modelSatirlari: [], taksitler: [] },
    { id: 13, tarih: "2026-06-03", turId: 1, tutar: 3000, kdvOrani: 0, odendi: false, modelSatirlari: [],
      taksitler: [{ id: 131, hedef: "ana", sira: 1, vade: "2026-06-15", tutar: 1500, odendi: true, odemeTarihi: "2026-06-14" },
        { id: 132, hedef: "ana", sira: 2, vade: "2026-07-15", tutar: 1500, odendi: false, odemeTarihi: null }] },
    { id: 14, tarih: "2026-06-04", turId: 1, tutar: 700, kdvOrani: 0, odendi: true, odemeTarihi: "2026-06-06", deletedAt: "2026-06-20T10:00:00Z", modelSatirlari: [], taksitler: [] },
  ],
  hesapHareketleri: [], kasaHesaplari: [],
};
dbmod.writeBlobToDb(blob);
const dbPath = dbmod.getDbPath();
dbmod.close();
const bayrakSil = () => { const c = new Database(dbPath); c.prepare(`DELETE FROM meta WHERE key = 'kasaGocu0024'`).run(); c.close(); };
bayrakSil();

// 2) Yerel açılış: göç çalışır.
dbmod.migrateFromJsonIfNeeded();
const h1 = dbmod.readBlobFromDb().hesapHareketleri || [];
const k11 = h1.filter(h => h.giderId === 11);
check("AC-21: ödenmiş taksitsiz kalem tam kapatan tek hareket aldı (tutarsız, hesapsız, göç izi)",
  k11.length === 1 && k11[0].tur === "odeme" && k11[0].tamKapatir === true && k11[0].tutar == null && k11[0].hesapId == null
  && k11[0].kaynak === "goc" && k11[0].gocKaynak === "gider:11" && k11[0].tarih === "2026-06-05" && k11[0].yontem === "Havale");
const t131 = h1.filter(h => h.taksitId === 131);
check("AC-21: ödenmiş taksit satırı kendi tutarıyla hareket aldı", t131.length === 1 && t131[0].giderId === 13 && t131[0].tutar === 1500 && t131[0].tamKapatir === false && t131[0].tarih === "2026-06-14");
check("ödenmemiş kalem, ödenmemiş taksit ve çöpteki kalem hareket almadı", h1.length === 2 && !h1.some(h => h.giderId === 12 || h.taksitId === 132 || h.giderId === 14));
check("Q4: göçten önce zaman damgalı yedek alındı", fs.readdirSync(tmpDir).some(f => /data\.db\.kasa-gocu-.*\.bak$/.test(f)));

// 3) Tekrar açılış (bayrak var): ikinci kayıt yok. 4) Bayrak silinse bile göç izi tekrar üretmez (AC-22).
dbmod.close();
dbmod.migrateFromJsonIfNeeded();
check("AC-22: bayrakla ikinci açılış yeni hareket üretmedi", (dbmod.readBlobFromDb().hesapHareketleri || []).length === 2);
dbmod.close();
bayrakSil();
dbmod.migrateFromJsonIfNeeded();
check("AC-22: bayrak silinse de göç izi ikinci hareketi engelledi", (dbmod.readBlobFromDb().hesapHareketleri || []).length === 2);

// 5) R4: göç yalnız yerel veritabanı katmanında; HTTP/istemci yolunda çağrılmaz.
const kaynaklar = ["electron/server.cjs", "electron/ipc/data.cjs", "src/App.jsx"].map(f => fs.readFileSync(path.join(root, f), "utf-8"));
check("R4: göç fonksiyonu sunucu ve istemci veri yolunda çağrılmıyor", kaynaklar.every(s => !/kasaGocu/.test(s)));

dbmod.close();
fs.rmSync(tmpDir, { recursive: true, force: true });
if (fail) { console.error(`${fail} kontrol BASARISIZ`); process.exit(1); }
console.log("TUM KONTROLLER GECTI");
process.exit(0);
