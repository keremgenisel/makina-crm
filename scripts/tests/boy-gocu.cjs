// Spec 0143 D-R3–D-R4/2, AC-27–AC-30, AC-56–AC-59: boy fiyatı yönteminin göçü gerçek veritabanıyla. Electron altında koşar
// (tests/db-electron.test.js başlatır). Doğrular: temiz kurulumda hiçbir şey yazılmaz ve yedek alınmaz; `yontem: "boy"` kalem (iki
// alanda, çöpteki parça dahil) yerel açılışta işaretli kaleme çevrilir, çubuk boyu kartın geldiği boyundan (metre → mm); kartında
// geldiği boy olmayan kalem yalnız kilo kalemi olur; yalnız iki JSON sütunu UPDATE edilir; yedek yalnız çevrilecek kalem varken;
// ikinci açılış hiçbir şeyi değiştirmez (bayrak yok, sonradan gelen kalem de çevrilir); üç açılış dalında, JSON dalında harita gövdeden.
const path = require("path");
const os = require("os");
const fs = require("fs");
const Module = require("module");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-boy-gocu-"));
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
const yedekler = () => fs.readdirSync(tmpDir).filter(f => /\.boy-gocu-.*\.bak$/.test(f));
const esit = (a, b) => JSON.stringify(a) === JSON.stringify(b);

(async () => {
  // 1) Temiz kurulum: çevrilecek kalem yok, hiçbir şey yazılmaz, yedek alınmaz (AC-29, AC-58).
  dbmod.migrateFromJsonIfNeeded();
  const dbPath = dbmod.getDbPath();
  check("AC-29 / AC-58: temiz kurulumda göç çalıştı, yedek alınmadı", yedekler().length === 0);

  // 2) Boy yöntemli kalem taşıyan veritabanı (eski sürümün yazdığı satırlar ham SQL ile; kartların geldiği boyu da ham SQL).
  const BOY = { tur: "malzeme", malzemeId: 501, bicim: "mil", yontem: "boy", cap: 30, boy: 400, adet: 1 };
  const ISLEM = { tur: "islem", ad: "Torna", tutar: 40 };
  dbmod.writeBlobToDb({ parts: [
    { id: 1, ad: "Kalemli", kod: "K1", fiyatTRY: 900, models: ["AK100"], maliyetKalemleri: [{ tur: "malzeme", malzemeId: 501, bicim: "mil", cap: 1, boy: 1, adet: 1 }, ISLEM] },
    { id: 2, ad: "Eski satırlı", maliyet: 12, malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 1, boy: 1 } },
    { id: 3, ad: "Çöpteki", deletedAt: "2026-10-01T10:00:00", malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 1, boy: 1 } },
    { id: 4, ad: "Kilo", maliyetKalemleri: [{ tur: "malzeme", malzemeId: 501, bicim: "mil", yontem: "kilo", cap: 50, boy: 50, adet: 1 }] },
    { id: 5, ad: "Boysuz kart", maliyetKalemleri: [{ tur: "malzeme", malzemeId: 502, bicim: "mil", cap: 1, boy: 1, adet: 1 }] },
  ], malzemeler: [{ id: 501, ad: "304", ozgulAgirlik: 7.9 }, { id: 502, ad: "Boysuz", ozgulAgirlik: 7.9 }] });
  dbmod.close();
  {
    const c = new Database(dbPath);
    c.prepare(`UPDATE malzemeler SET geldigiBoy = 6, boyFiyati = 1600 WHERE id = 501`).run();
    c.prepare(`UPDATE parts SET maliyetKalemleri = ? WHERE id = 1`).run(JSON.stringify([BOY, ISLEM]));
    c.prepare(`UPDATE parts SET malzemeSatiri = ? WHERE id = 2`).run(JSON.stringify({ malzemeId: 501, bicim: "boru", cap: 19, et: 1.5, boy: 173, yontem: "boy", fire: 5 }));
    c.prepare(`UPDATE parts SET malzemeSatiri = ? WHERE id = 3`).run(JSON.stringify({ malzemeId: 501, bicim: "mil", cap: 30, boy: 400, yontem: "boy" }));
    c.prepare(`UPDATE parts SET maliyetKalemleri = ? WHERE id = 5`).run(JSON.stringify([{ ...BOY, malzemeId: 502 }]));
    c.close();
  }
  const sutunlarOnce = (() => { const c = new Database(dbPath); const r = c.prepare(`SELECT id, ad, kod, fiyatTRY, models, maliyet, deletedAt, tip FROM parts ORDER BY id`).all(); const m = c.prepare(`SELECT * FROM malzemeler`).all(); c.close(); return { r, m }; })();
  dbmod.migrateFromJsonIfNeeded();
  const b = dbmod.readBlobFromDb();
  const p = (id) => b.parts.find(x => x.id === id);
  const { yontem: _y, ...BOYSUZ } = BOY;
  check("AC-27: kalem işaretli, çubuk boyu kartın geldiği boyundan (6 m → 6000 mm), yontem silindi; işlem kalemi aynen",
    esit(p(1).maliyetKalemleri, [{ ...BOYSUZ, boydanSiparis: true, cubukBoyu: 6000 }, ISLEM]));
  check("AC-56: eski malzemeSatiri alanındaki yöntem de çevrildi", esit(p(2).malzemeSatiri, { malzemeId: 501, bicim: "boru", cap: 19, et: 1.5, boy: 173, fire: 5, boydanSiparis: true, cubukBoyu: 6000 }));
  check("D-R3/3: çöpteki parçanın alanı da göçten geçti", esit(p(3).malzemeSatiri, { malzemeId: 501, bicim: "mil", cap: 30, boy: 400, boydanSiparis: true, cubukBoyu: 6000 }) && !!p(3).deletedAt);
  check("AC-28: kartında geldiği boy olmayan kalem yalnız kilo kalemi", esit(p(5).maliyetKalemleri, [{ ...BOYSUZ, malzemeId: 502 }]));
  check("triyaj bulgu 3: yontem: \"kilo\" kalemin ölü anahtarı da silindi, işaret yazılmadı", esit(p(4).maliyetKalemleri, [{ tur: "malzeme", malzemeId: 501, bicim: "mil", cap: 50, boy: 50, adet: 1 }]));
  check("AC-58: çevrilecek kalem varken göçten önce bir yedek alındı", yedekler().length === 1);
  const sutunlarSonra = (() => { const c = new Database(dbPath); const r = c.prepare(`SELECT id, ad, kod, fiyatTRY, models, maliyet, deletedAt, tip FROM parts ORDER BY id`).all(); const m = c.prepare(`SELECT * FROM malzemeler`).all(); c.close(); return { r, m }; })();
  check("AC-57: göç yalnız parts'ın iki JSON sütununu yazdı; öteki sütunlar ve malzemeler tablosu aynı", esit(sutunlarOnce, sutunlarSonra));

  // 3) İkinci açılış (AC-30): çevrilecek kalem kalmadığı için hiçbir şey değişmez, yeni yedek yok.
  const oncekiGovde = JSON.stringify(dbmod.readBlobFromDb().parts);
  dbmod.close();
  dbmod.migrateFromJsonIfNeeded();
  check("AC-30: ikinci açılış hiçbir şeyi değiştirmedi, yedek alınmadı", JSON.stringify(dbmod.readBlobFromDb().parts) === oncekiGovde && yedekler().length === 1);

  // 4) Bayraksız (D-R4): sonradan bir istemcinin yazdığı boy kalemi bir sonraki açılışta yine çevrilir.
  dbmod.close();
  { const c = new Database(dbPath); c.prepare(`UPDATE parts SET maliyetKalemleri = ? WHERE id = 4`).run(JSON.stringify([BOY])); c.close(); }
  dbmod.migrateFromJsonIfNeeded();
  check("D-R4: sonradan gelen boy kalemi de çevrildi, ikinci yedek alındı",
    esit(dbmod.readBlobFromDb().parts.find(x => x.id === 4).maliyetKalemleri, [{ ...BOYSUZ, boydanSiparis: true, cubukBoyu: 6000 }]) && yedekler().length === 2);

  // 5) AC-57: üç açılış dalında çağrı; sunucu ve istemci veri yolunda yok.
  const db = fs.readFileSync(path.join(root, "electron", "db.cjs"), "utf-8");
  check("AC-57: göç üç açılış dalında çağrılıyor", (db.match(/^\s*boyGocu\((db|conn)(, dbPath|, null, )?/gm) || []).length === 3);
  const kaynaklar = ["electron/server.cjs", "electron/ipc/data.cjs", "src/App.jsx"].map(f => fs.readFileSync(path.join(root, f), "utf-8"));
  check("D-R4/2: göç sunucu ve istemci veri yolunda çağrılmıyor", kaynaklar.every(s => !/boyGocu/.test(s)));

  // 6) JSON dalı (D-R3/4): data.db yok, data.json boy kalemi ve geldiği boylu malzeme veriyor; harita gövdeden.
  dbmod.close();
  for (const f of fs.readdirSync(tmpDir)) if (/^data\.db/.test(f)) fs.rmSync(path.join(tmpDir, f), { force: true });
  fs.writeFileSync(dbmod.getJsonPath(), JSON.stringify({ customers: [], payments: [], malzemeler: [{ id: 501, ad: "304", geldigiBoy: 3 }], parts: [{ id: 21, ad: "JSON parça", maliyetKalemleri: [BOY] }] }));
  dbmod.migrateFromJsonIfNeeded();
  check("AC-57 / D-R3/4: JSON dalında göç koştu, çubuk boyu gövdenin geldiği boyundan", esit(dbmod.readBlobFromDb().parts.find(x => x.id === 21)?.maliyetKalemleri, [{ ...BOYSUZ, boydanSiparis: true, cubukBoyu: 3000 }]));

  dbmod.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (fail) { console.error(`${fail} kontrol BASARISIZ`); process.exit(1); return; }
  console.log("TUM KONTROLLER GECTI");
  process.exit(0);
})();
