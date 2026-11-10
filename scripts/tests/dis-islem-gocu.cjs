// Spec 0138 R15–R16/2, R17, C4, Karar 29–32; AC-22–AC-29, AC-33, AC-34, AC-43, AC-44: dış işlem kalemlerinin bir kerelik göçü.
// Electron altında koşar (tests/db-electron.test.js başlatır). Yerel veritabanı açılışını çalıştırır ve şunları doğrular: temiz
// kurulumda bayrak yazılır, yedek alınmaz; katalog bağlı kalem serbest kaleme çevrilir (adet tutarlı, kilo/çöp/fiyatsız/kayıtsız
// tutarsız, yer tutucu ad); kalem sırası ve parçanın öteki alanları değişmez; değişecek parça varken yedek alınır, yokken alınmaz;
// ikinci açılışta göç çalışmaz; ölü tablo satırları yerinde kalır.
const path = require("path");
const os = require("os");
const fs = require("fs");
const Module = require("module");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-dis-islem-gocu-"));
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
const BAYRAK = "disIslemGocu0138";
const yedekler = () => fs.readdirSync(tmpDir).filter(f => /\.dis-islem-gocu-.*\.bak$/.test(f));
const esit = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 1) Temiz kurulum: taşınacak kalem yok, bayrak yine yazılır (R16/2, AC-34), yedek alınmaz (AC-28).
dbmod.migrateFromJsonIfNeeded();
const dbPath = dbmod.getDbPath();
check("AC-34: temiz kurulumda bayrak yazıldı", !!dbmod.getMetaValue(BAYRAK));
check("AC-34: temiz kurulumda blob'da dış işlem bölümü yok, tablo şemada duruyor", !("disIslemler" in dbmod.readBlobFromDb())
  && !!new Database(dbPath).prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='dis_islemler'`).get());
check("AC-28: temiz kurulumda yedek alınmadı", yedekler().length === 0);

// 2) Bu sürümden önce başka bir bilgisayarda katalog bağlı kalem eklenmiş veritabanı (bayrak yok).
const MALZEME = { tur: "malzeme", malzemeId: 501, bicim: "mil", yontem: "kilo", cap: 50, boy: 120, adet: 2 };
const SERBEST = { tur: "islem", ad: "Lazer kesim", tedarikciId: 802, tutar: 42.5 };
const PARTS = [
  { id: 1, ad: "Karma", kod: "K1", fiyatTRY: 900, models: ["AK100"], emniyetPayi: 5, maliyetKalemleri: [MALZEME, { tur: "islem", islemId: 701, miktar: 2 }, SERBEST] },
  { id: 2, ad: "Kilo", maliyetKalemleri: [{ tur: "islem", islemId: 704, miktar: 5 }] },
  { id: 3, ad: "Çözülemeyen", maliyetKalemleri: [{ tur: "islem", islemId: 705, miktar: 1 }, { tur: "islem", islemId: 706, miktar: 1 }, { tur: "islem", islemId: 9999, miktar: 1 }] },
  { id: 4, ad: "Çöpteki parça", deletedAt: "2026-10-02T09:00:00", maliyetKalemleri: [{ tur: "islem", islemId: 703, miktar: 1 }] },
  { id: 5, ad: "Dokunulmayan", maliyetKalemleri: [MALZEME, SERBEST] },
  { id: 6, ad: "Kalemsiz", maliyet: 12 },
];
const ISLEMLER = [
  [701, "Ayna mahruti dişli takımı", "adet", 2465, null, null, 801, null],
  [703, "Helis dişli açımı", "adet", 187.5, "", null, null, null],
  [704, "Isıl işlem", "kilo", 30, null, null, 803, null],
  [705, "Çöpteki işlem", "adet", 50, null, null, 801, "2026-10-01T10:00:00"],
  [706, "Tel erezyon", "adet", null, null, null, 802, null],
];
dbmod.writeBlobToDb({ parts: PARTS, disIslemler: [{ id: 999, ad: "Yazılmamalı" }] }); // eski istemci gövdesi: dış işlem bölümü yok sayılır
const gocOncesi = dbmod.readBlobFromDb();
dbmod.close();
{
  const c = new Database(dbPath);
  check("R17/2: yazma yolu yok; eski istemcinin gövdesindeki bölüm ölü tabloya yazılmadı", c.prepare(`SELECT COUNT(*) n FROM dis_islemler`).get().n === 0);
  const ins = c.prepare(`INSERT INTO dis_islemler (id, ad, birim, birimFiyati, paraBirimi, kur, tedarikciId, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const r of ISLEMLER) ins.run(...r);
  c.prepare(`DELETE FROM meta WHERE key = ?`).run(BAYRAK);
  c.close();
}
dbmod.migrateFromJsonIfNeeded();
const sonra = dbmod.readBlobFromDb();
const p = (id) => sonra.parts.find(x => x.id === id);
check("AC-23 / AC-44: adet birimli kalem serbest kaleme; ad, tedarikçi, TL tutar (2 × 2.465 = 4.930)",
  esit(p(1).maliyetKalemleri[1], { tur: "islem", ad: "Ayna mahruti dişli takımı", tedarikciId: 801, tutar: 4930 }));
check("AC-26 / C4: kalem sırası ve öteki kalemler aynı", esit(p(1).maliyetKalemleri[0], MALZEME) && esit(p(1).maliyetKalemleri[2], SERBEST) && p(1).maliyetKalemleri.length === 3);
const govde = (x) => { const { maliyetKalemleri: _k, ...g } = x; return g; };
check("AC-26 / C4: bütün parçaların kalem dışı alanları göçten önceki okumayla birebir", gocOncesi.parts.every(x => esit(govde(x), govde(p(x.id)))) && p(1).fiyatTRY === 900 && !("emniyetPayi" in p(1))); // spec 0141 ile (D-R1): ölü sütun okunmaz
check("AC-25: kilo birimli kalem tutarsız; ad ve tedarikçi korundu", esit(p(2).maliyetKalemleri, [{ tur: "islem", ad: "Isıl işlem", tedarikciId: 803, tutar: null }]));
check("AC-24 / AC-43: çöpteki ve fiyatsız işlem tutarsız; kayıtsız işlem yer tutucu adla",
  esit(p(3).maliyetKalemleri, [{ tur: "islem", ad: "Çöpteki işlem", tedarikciId: 801, tutar: null }, { tur: "islem", ad: "Tel erezyon", tedarikciId: 802, tutar: null }, { tur: "islem", ad: "Dış işlem", tutar: null }]));
check("Karar 29: çöpteki parça da göçe girdi; boş para birimi TL (187,5)", esit(p(4).maliyetKalemleri, [{ tur: "islem", ad: "Helis dişli açımı", tutar: 187.5 }]));
check("AC-22: katalog kalemi olmayan parçalar değişmedi", esit(p(5).maliyetKalemleri, PARTS[4].maliyetKalemleri) && p(6).maliyet === 12 && !("maliyetKalemleri" in p(6)));
check("AC-28: değişecek parça varken göçten önce yedek alındı", yedekler().length === 1);
check("bayrak yazıldı", !!dbmod.getMetaValue(BAYRAK));
check("AC-33: ölü tablonun satırları yerinde; blob'da bölüm yok", new Database(dbPath).prepare(`SELECT COUNT(*) n FROM dis_islemler`).get().n === ISLEMLER.length && !("disIslemler" in sonra));

// 3) İkinci açılış: göç yeniden çalışmaz (AC-27). Bir parçaya katalog kalemi elle konur; bayrak durduğu için dokunulmaz.
dbmod.close();
{
  const c = new Database(dbPath);
  c.prepare(`UPDATE parts SET maliyetKalemleri = ? WHERE id = 5`).run(JSON.stringify([{ tur: "islem", islemId: 701, miktar: 1 }]));
  c.close();
}
dbmod.migrateFromJsonIfNeeded();
check("AC-27: ikinci açılışta göç yeniden çalışmadı", esit(dbmod.readBlobFromDb().parts.find(x => x.id === 5).maliyetKalemleri, [{ tur: "islem", islemId: 701, miktar: 1 }]) && yedekler().length === 1);

// 4) Bayrak silinmiş, katalog kalemi olmayan veritabanı: göç bayrağı yazar, yedek ALMAZ (R16/2, AC-28, AC-22).
dbmod.close();
{
  const c = new Database(dbPath);
  c.prepare(`UPDATE parts SET maliyetKalemleri = ? WHERE id = 5`).run(JSON.stringify([SERBEST]));
  c.prepare(`DELETE FROM meta WHERE key = ?`).run(BAYRAK);
  c.close();
}
dbmod.migrateFromJsonIfNeeded();
check("AC-22 / AC-28: değişecek parça yokken bayrak yazıldı, yedek alınmadı", !!dbmod.getMetaValue(BAYRAK) && yedekler().length === 1);

// 5) AC-29: göç yalnız yerel veritabanı açılışının üç dalında; sunucu ve istemci veri yolu çağırmaz.
const kaynaklar = ["electron/server.cjs", "electron/ipc/data.cjs", "src/App.jsx"].map(f => fs.readFileSync(path.join(root, f), "utf-8"));
check("AC-29: göç sunucu ve istemci veri yolunda çağrılmıyor", kaynaklar.every(s => !/disIslemGocu/.test(s)));
const db = fs.readFileSync(path.join(root, "electron", "db.cjs"), "utf-8");
check("R16/2: üç açılış dalında da çağrılıyor", (db.match(/^\s*disIslemGocu\((db|conn)(, dbPath)?\);/gm) || []).length === 3);

// 6) JSON göç dalı gerçekten koşar (triyaj bilgi 2): data.db yok, data.json katalog kalemi taşıyor. populateAll dış işlem
// yazmadığı için tablo boştur; kalem kaydı bulunmayan işlem gibi yer tutucu adla tutarsız çevrilir, bayrak yazılır.
dbmod.close();
for (const f of fs.readdirSync(tmpDir)) if (/^data\.db/.test(f)) fs.rmSync(path.join(tmpDir, f), { force: true });
fs.writeFileSync(dbmod.getJsonPath(), JSON.stringify({ customers: [], payments: [], disIslemler: [{ id: 701, ad: "Ayna", birim: "adet", birimFiyati: 10 }],
  parts: [{ id: 21, ad: "JSON parça", maliyetKalemleri: [SERBEST, { tur: "islem", islemId: 701, miktar: 2 }] }] }));
dbmod.migrateFromJsonIfNeeded();
const j = dbmod.readBlobFromDb();
check("JSON dalı: göç koştu, katalog kalemi yer tutucu adla tutarsız serbest kaleme çevrildi, sıra korundu",
  esit(j.parts.find(x => x.id === 21)?.maliyetKalemleri, [SERBEST, { tur: "islem", ad: "Dış işlem", tutar: null }]));
check("JSON dalı: bayrak yazıldı, blob'da dış işlem bölümü yok", !!dbmod.getMetaValue(BAYRAK) && !("disIslemler" in j));

dbmod.close();
fs.rmSync(tmpDir, { recursive: true, force: true });
if (fail) { console.error(`${fail} kontrol BASARISIZ`); process.exit(1); }
console.log("TUM KONTROLLER GECTI");
process.exit(0);
