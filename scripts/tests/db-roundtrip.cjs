// SQLite katmanı tam tur testi — Electron altında koşar (better-sqlite3 Electron ABI'siyle
// derli olduğundan node ile çalışmaz; tests/db-electron.test.js bunu Electron ile başlatır).
// Kapsam: eski şema migration'ı, kritik alanların yazma/okuma turu (satisTamam, üretim formu
// işaretleri, teklif bağlantıları), tablo-atlama bütünlüğü ve audit_log 12 ay temizliği.
const path = require("path");
const os = require("os");
const fs = require("fs");
const Module = require("module");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-dbtest-"));
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "electron") return { app: { getPath: () => tmpDir } };
  return origLoad(request, parent, isMain);
};

const root = path.join(__dirname, "..", "..");
let fail = 0;
const check = (name, ok) => { console.log((ok ? "PASS" : "FAIL") + "  " + name); if (!ok) fail++; };

// ── Eski şema: satisTamam kolonu ve audit retention öncesi durum ─────────────
const Database = require(path.join(root, "node_modules", "better-sqlite3"));
{
  const raw = new Database(path.join(tmpDir, "data.db"));
  raw.exec(`
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE teklifler (
      id INTEGER PRIMARY KEY, type TEXT, no TEXT, tarih TEXT, dil TEXT, currency TEXT,
      customer_id INTEGER, firma TEXT, yetkili TEXT, tel TEXT, vergiNo TEXT, vergiDairesi TEXT, adres TEXT,
      email TEXT, authority TEXT, forwarder TEXT, satirlar TEXT, iskonto REAL, kdvOrani REAL,
      odemeSekli TEXT, teslimSekli TEXT, teslimSuresi TEXT, teslimTarihi TEXT,
      notField TEXT, ek TEXT, teklifGecerlilik TEXT, kur TEXT, kurRate TEXT,
      teslimYeri TEXT, gtipNo TEXT, durum TEXT, createdAt TEXT, deletedAt TEXT, parentTeklifId INTEGER
    );
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, username TEXT, role TEXT,
      action TEXT, entity TEXT, entity_id INTEGER, entity_name TEXT, detail TEXT
    );
  `);
  raw.prepare(`INSERT INTO teklifler (id, type, no, firma, durum, customer_id) VALUES (101, 'teklif', 'T-1', 'Firma', 'onaylandi', 500)`).run();
  const eski = new Date(); eski.setMonth(eski.getMonth() - 14);
  const ins = raw.prepare(`INSERT INTO audit_log (ts, username, role, action, entity) VALUES (?, 'k', 'admin', 'olusturuldu', 'musteri')`);
  ins.run(eski.toISOString());
  ins.run(new Date().toISOString());
  raw.close();
}

// Beklenmeyen hata Electron'u açık bırakıp test zaman aşımına yol açmasın
process.on("uncaughtException", (e) => { console.error("FAIL (uncaught):", e.message); process.exit(1); });

const dbmod = require(path.join(root, "electron", "db.cjs"));
dbmod.migrateFromJsonIfNeeded();
check("sqlite aktif", dbmod.isActive());

// Migration: eski kayıtta satisTamam undefined kalmalı (tri-state)
let blob = dbmod.readBlobFromDb();
check("migration: eski teklif satisTamam undefined", blob.teklifler.find(t => t.id === 101)?.satisTamam === undefined);
// Audit retention: 14 aylık silindi, güncel kaldı
check("audit temizliği: 1 kayıt kaldı", dbmod.getAuditLog({}).total === 1);
// Genel arama (q): entity_name/detay içinde geçen metinle filtreler
dbmod.writeAuditEntry({ ts: new Date().toISOString(), username: "kerem", role: "admin", action: "duzenlendi", entity: "musteri", entity_id: 500, entity_name: "Genisel Catering", detail: null });
check("audit genel arama (q) eşleşir", dbmod.getAuditLog({ q: "Genisel" }).total === 1);
check("audit genel arama (q) eşleşmezse boş", dbmod.getAuditLog({ q: "olmayanmetin" }).total === 0);

// ── Tam tur: kritik alanlar ──────────────────────────────────────────────────
dbmod.writeBlobToDb({
  customers: [{ id: 500, name: "Müşteri", model: "AK100_DS", fromTeklifId: 101, brutKg: 850,
    odemePlani: [{ id: 1, vadeTarihi: "2026-08-30", tutar: 100000, odemeId: null }],
    kaliplar: [{ ad: "Hamburger", olcu: "10", uretimFormGonder: true, uretimFormId: 77 }] }],
  services: [{ id: 2, customerId: 500, type: "Garanti İçi", odendi: false }],
  partSales: [{ id: 600, customerId: 500, tur: "Kalıp", ad: "Adana", ucret: 100, odendi: false, teklifId: 101, uretimFormGonder: true, uretimFormId: 88 }],
  payments: [], dealers: [{ id: 3, name: "Bayi X" }],
  gorusmeler: [
    { id: 7, customerId: 500, tarih: "2026-07-01", tur: "Telefon", not: "Fiyat bekliyor", takipTarihi: "2026-07-10", tamamlandi: false, kullanici: "kerem" },
    { id: 8, customerId: 500, tarih: "2026-07-02", tur: "Ziyaret", not: "Silinen görüşme", deletedAt: "2026-07-03T10:00:00.000Z" },
  ],
  stock: [{ id: 4, model: "AK100_DS", serialNo: "S-1" }], notes: [], parts: [],
  factory: { name: "Altuntaş Makina", email: "info@altunmak.com", web: "www.altunmak.com", faturaFirmaAdi: "ALTUNMAK MACHINERY LTD." },
  teklifler: [
    { id: 101, type: "teklif", no: "T-1", firma: "Firma", durum: "onaylandi", customerId: 500, satisTamam: true, tur: "makina", satirlar: [] },
    { id: 102, type: "teklif", no: "T-2", firma: "F2", durum: "taslak", satirlar: [] },
  ],
  appSettings: { autoBackup: false, teklifTakipGun: 1, tahsilatTakipGun: 14, autoLockMinutes: 5,
    translations: { fatura: { title: "COMMERCIAL INVOICE" } },
    mailTemplates: { teklifProforma: { konu: "Özel Konu {no}", metin: "Özel metin" } } },
});
blob = dbmod.readBlobFromDb();
check("satisTamam true korunur", blob.teklifler.find(t => t.id === 101)?.satisTamam === true);
check("satisTamam undefined korunur", blob.teklifler.find(t => t.id === 102)?.satisTamam === undefined);
check("factory.web tam turu", blob.factory?.web === "www.altunmak.com");
check("factory.faturaFirmaAdi tam turu", blob.factory?.faturaFirmaAdi === "ALTUNMAK MACHINERY LTD.");
check("customer.brutKg tam turu", (blob.customers || []).find(c => c.id === 500)?.brutKg === 850);
check("customer.fromTeklifId", blob.customers[0]?.fromTeklifId === 101);
check("kalıp uretimFormGonder/Id", blob.customers[0]?.kaliplar[0]?.uretimFormGonder === true && blob.customers[0]?.kaliplar[0]?.uretimFormId === 77);
check("partSale teklifId + uretim alanları", (() => { const ps = blob.partSales.find(p => p.id === 600); return ps?.teklifId === 101 && ps?.uretimFormGonder === true && ps?.uretimFormId === 88; })());
check("odemePlani JSON tam turu", blob.customers[0]?.odemePlani?.[0]?.vadeTarihi === "2026-08-30");
check("gorusme tam turu", (() => { const g = (blob.gorusmeler || []).find(x => x.id === 7); return g?.customerId === 500 && g?.not === "Fiyat bekliyor" && g?.takipTarihi === "2026-07-10" && g?.tamamlandi === false && g?.kullanici === "kerem"; })());
check("gorusme deletedAt tam turu", (() => { const g = (blob.gorusmeler || []).find(x => x.id === 8); return g?.deletedAt === "2026-07-03T10:00:00.000Z" && (blob.gorusmeler || []).find(x => x.id === 7)?.deletedAt == null; })());
check("appSettings translations/mailTemplates tam turu", blob.appSettings?.translations?.fatura?.title === "COMMERCIAL INVOICE" && blob.appSettings?.mailTemplates?.teklifProforma?.konu === "Özel Konu {no}");
check("appSettings takip alanları tam turu", blob.appSettings?.teklifTakipGun === 1 && blob.appSettings?.tahsilatTakipGun === 14 && blob.appSettings?.autoLockMinutes === 5);

// ── Tablo atlama bütünlüğü ───────────────────────────────────────────────────
const v2 = { ...JSON.parse(JSON.stringify(blob)), teklifler: blob.teklifler.map(t => t.id === 102 ? { ...t, durum: "gonderildi" } : t) };
delete v2.dataVersion;
dbmod.writeBlobToDb(v2); // sadece teklifler değişti
const out = dbmod.readBlobFromDb();
check("değişen bölüm yazıldı", out.teklifler.find(t => t.id === 102)?.durum === "gonderildi");
check("atlanan bölüm korundu (customer)", out.customers[0]?.name === "Müşteri");
check("atlanan bölüm korundu (dealer)", out.dealers[0]?.name === "Bayi X");
check("FK zinciri: service korundu", out.services[0]?.type === "Garanti İçi");

fs.rmSync(tmpDir, { recursive: true, force: true });
if (fail) { console.error(`${fail} kontrol BASARISIZ`); process.exit(1); }
console.log("TUM KONTROLLER GECTI");
process.exit(0);
