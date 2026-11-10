// Spec 0141 D-R3–D-R6, AC-33–AC-37, AC-53–AC-57: işleme payı göçü gerçek veritabanıyla. Electron altında koşar
// (tests/db-electron.test.js başlatır). Doğrular: temiz kurulumda hiçbir şey yazılmaz ve yedek alınmaz; pay taşıyan kalem (iki
// alanda, çöpteki parça dahil) yerel açılışta katlanır, maliyet kuruşuna aynı; yalnız iki JSON sütunu UPDATE edilir; yedek yalnız
// değişecek kalem varken alınır; ikinci açılış hiçbir şeyi değiştirmez ve bayrak yoktur (sonradan gelen pay da katlanır); üç açılış
// dalında çağrılır, JSON dalında da koşar.
const path = require("path");
const os = require("os");
const fs = require("fs");
const Module = require("module");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-isleme-payi-gocu-"));
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
const yedekler = () => fs.readdirSync(tmpDir).filter(f => /\.isleme-payi-gocu-.*\.bak$/.test(f));
const esit = (a, b) => JSON.stringify(a) === JSON.stringify(b);

(async () => {
  // Maliyetin kuruş eşitliği (AC-34) saf testte ölçülür (tests/isleme-payi-gocu-0141.test.js); `src/` ESM modülleri Electron'un
  // CommonJS yükleyicisinde içe alınamaz. Burada göçün yazdığı ölçü, saf testin maliyetini 1.701,12 ₺ verdiği ölçüdür (Ø144 × 83).

  // 1) Temiz kurulum: katlanacak kalem yok, hiçbir şey yazılmaz, yedek alınmaz (AC-35, AC-55, AC-56).
  dbmod.migrateFromJsonIfNeeded();
  const dbPath = dbmod.getDbPath();
  check("AC-55 / AC-56: temiz kurulumda göç çalıştı, yedek alınmadı", yedekler().length === 0);

  // 2) Pay taşıyan veritabanı (sürüm arası pencerede güncellenmemiş bir bilgisayarın yazdığı satırlar ham SQL ile).
  const KALEM = { tur: "malzeme", malzemeId: 501, bicim: "mil", yontem: "kilo", cap: 96, payCap: 4, boy: 100, payBoy: 2, adet: 1 };
  const SATIR = { malzemeId: 501, bicim: "mil", cap: 140, payCap: 4, boy: 78, payBoy: 5, fire: 8 };
  const ISLEM = { tur: "islem", ad: "Torna", tutar: 40 };
  dbmod.writeBlobToDb({ parts: [
    { id: 1, ad: "Kalemli", kod: "K1", fiyatTRY: 900, models: ["AK100"], maliyetKalemleri: [{ tur: "malzeme", malzemeId: 501, bicim: "mil", yontem: "kilo", cap: 1, boy: 1, adet: 1 }, ISLEM] },
    { id: 2, ad: "Eski satırlı", maliyet: 12, malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 1, boy: 1 } },
    { id: 3, ad: "Çöpteki", deletedAt: "2026-10-01T10:00:00", malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 1, boy: 1 } },
    { id: 4, ad: "Paysız", maliyetKalemleri: [{ tur: "malzeme", malzemeId: 501, bicim: "mil", yontem: "kilo", cap: 50, boy: 50, adet: 1 }] },
  ], malzemeler: [{ id: 501, ad: "304" }] });
  dbmod.close();
  {
    const c = new Database(dbPath);
    c.prepare(`UPDATE parts SET maliyetKalemleri = ? WHERE id = 1`).run(JSON.stringify([KALEM, ISLEM]));
    c.prepare(`UPDATE parts SET malzemeSatiri = ? WHERE id = 2`).run(JSON.stringify(SATIR));
    c.prepare(`UPDATE parts SET malzemeSatiri = ? WHERE id = 3`).run(JSON.stringify(SATIR));
    c.close();
  }
  const sutunlarOnce = (() => { const c = new Database(dbPath); const r = c.prepare(`SELECT id, ad, kod, fiyatTRY, models, maliyet, deletedAt, tip FROM parts ORDER BY id`).all(); const m = c.prepare(`SELECT * FROM malzemeler`).all(); c.close(); return { r, m }; })();
  dbmod.migrateFromJsonIfNeeded();
  const b = dbmod.readBlobFromDb();
  const p = (id) => b.parts.find(x => x.id === id);
  check("AC-33: kalem listesindeki pay ölçüye eklendi, pay anahtarı silindi; işlem kalemi aynen",
    esit(p(1).maliyetKalemleri, [{ tur: "malzeme", malzemeId: 501, bicim: "mil", yontem: "kilo", cap: 100, boy: 102, adet: 1 }, ISLEM]));
  check("AC-33 / AC-53: eski malzemeSatiri alanındaki pay da katlandı", esit(p(2).malzemeSatiri, { malzemeId: 501, bicim: "mil", cap: 144, boy: 83, fire: 8 }));
  check("AC-37: çöpteki parçanın alanı da göçten geçti", esit(p(3).malzemeSatiri, { malzemeId: 501, bicim: "mil", cap: 144, boy: 83, fire: 8 }) && !!p(3).deletedAt);
  check("AC-34: göçün yazdığı ölçü ham ölçünün aynısı (140 + 4, 78 + 5); maliyet eşitliği saf testte", p(2).malzemeSatiri.cap === SATIR.cap + SATIR.payCap && p(2).malzemeSatiri.boy === SATIR.boy + SATIR.payBoy);
  check("AC-35: paysız parça değişmedi", esit(p(4).maliyetKalemleri, [{ tur: "malzeme", malzemeId: 501, bicim: "mil", yontem: "kilo", cap: 50, boy: 50, adet: 1 }]));
  check("AC-56: değişecek kalem varken göçten önce bir yedek alındı", yedekler().length === 1);
  const sutunlarSonra = (() => { const c = new Database(dbPath); const r = c.prepare(`SELECT id, ad, kod, fiyatTRY, models, maliyet, deletedAt, tip FROM parts ORDER BY id`).all(); const m = c.prepare(`SELECT * FROM malzemeler`).all(); c.close(); return { r, m }; })();
  check("AC-54: göç yalnız iki JSON sütununu yazdı; parçanın öteki sütunları ve malzemeler tablosu aynı", esit(sutunlarOnce, sutunlarSonra));

  // 3) İkinci açılış (AC-36): pay kalmadığı için hiçbir şey değişmez, yeni yedek yok.
  const oncekiGovde = JSON.stringify(dbmod.readBlobFromDb().parts);
  dbmod.close();
  dbmod.migrateFromJsonIfNeeded();
  check("AC-36: ikinci açılış hiçbir şeyi değiştirmedi, yedek alınmadı", JSON.stringify(dbmod.readBlobFromDb().parts) === oncekiGovde && yedekler().length === 1);

  // 4) Bayraksız (Kararlar 1, D-R4): sonradan bir istemcinin yazdığı pay bir sonraki açılışta yine katlanır.
  dbmod.close();
  { const c = new Database(dbPath); c.prepare(`UPDATE parts SET maliyetKalemleri = ? WHERE id = 4`).run(JSON.stringify([{ ...KALEM, cap: 10.1, payCap: 0.2, payBoy: undefined }])); c.close(); }
  dbmod.migrateFromJsonIfNeeded();
  check("D-R4 / A-R2/2: sonradan gelen pay da katlandı (10,1 + 0,2 = 10,3), ikinci yedek alındı",
    dbmod.readBlobFromDb().parts.find(x => x.id === 4).maliyetKalemleri[0].cap === 10.3 && yedekler().length === 2);

  // 5) AC-55: üç açılış dalında çağrı; sunucu ve istemci veri yolunda yok.
  const db = fs.readFileSync(path.join(root, "electron", "db.cjs"), "utf-8");
  check("AC-55: göç üç açılış dalında çağrılıyor", (db.match(/^\s*islemePayiGocu\((db|conn)(, dbPath)?\);/gm) || []).length === 3);
  const kaynaklar = ["electron/server.cjs", "electron/ipc/data.cjs", "src/App.jsx"].map(f => fs.readFileSync(path.join(root, f), "utf-8"));
  check("D-R4/2: göç sunucu ve istemci veri yolunda çağrılmıyor", kaynaklar.every(s => !/islemePayiGocu/.test(s)));

  // 6) JSON dalı gerçekten koşar: data.db yok, data.json pay taşıyan parça veriyor.
  dbmod.close();
  for (const f of fs.readdirSync(tmpDir)) if (/^data\.db/.test(f)) fs.rmSync(path.join(tmpDir, f), { force: true });
  fs.writeFileSync(dbmod.getJsonPath(), JSON.stringify({ customers: [], payments: [], parts: [{ id: 21, ad: "JSON parça", malzemeSatiri: SATIR }] }));
  dbmod.migrateFromJsonIfNeeded();
  check("AC-55: JSON dalında göç koştu", esit(dbmod.readBlobFromDb().parts.find(x => x.id === 21)?.malzemeSatiri, { malzemeId: 501, bicim: "mil", cap: 144, boy: 83, fire: 8 }));

  dbmod.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (fail) { console.error(`${fail} kontrol BASARISIZ`); process.exit(1); return; }
  console.log("TUM KONTROLLER GECTI");
  process.exit(0);
})();
