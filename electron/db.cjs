// ── SQLite depolama katmanı (data.json'dan tek seferlik geçiş + okuma/yazma) ──
// crm:load/crm:save'in arkasında çalışır; renderer hiçbir şey bilmez, aynı blob şeklini görür.
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

let Database = null;
try {
  Database = require("better-sqlite3");
} catch (err) {
  console.error("better-sqlite3 yüklenemedi, eski JSON depolamaya devam ediliyor:", err);
}

let db = null;
let active = false;

const getJsonPath = () => path.join(app.getPath("userData"), "data.json");
const getDbPath = () => path.join(app.getPath("userData"), "data.db");
const getTmpDbPath = () => path.join(app.getPath("userData"), "data.db.tmp-migrating");
const getMigratedBackupPath = () => path.join(app.getPath("userData"), "data.migrated-backup.json");
const getFailMarkerPath = () => path.join(app.getPath("userData"), "data.migration-failed.json");

const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  name TEXT, phone TEXT, email TEXT, adres TEXT, city TEXT, country TEXT,
  yetkili1Ad TEXT, yetkili1Tel TEXT, yetkili2Ad TEXT, yetkili2Tel TEXT,
  contact TEXT, aciklama TEXT,
  model TEXT, serialNo TEXT, kalipCapi TEXT, seriNoBekliyor INTEGER,
  satisYapan TEXT, installDate TEXT, warrantyEnd TEXT,
  faturali TEXT, faturaBedeli REAL, fabrikaSatisBedeli REAL, komisyon REAL, currency TEXT,
  kalanBorc REAL, isResale INTEGER, prevOwners TEXT,
  kalip TEXT, kalipSayisi INTEGER, extraKalipFiyati TEXT, deletedAt TEXT,
  konveyorSacId TEXT, bantSecimiId TEXT, sourceStockId INTEGER
);

CREATE TABLE IF NOT EXISTS customer_kaliplar (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  ad TEXT, olcu TEXT, fiyat REAL, part_sale_id INTEGER, sort_order INTEGER
);
CREATE INDEX IF NOT EXISTS idx_kaliplar_customer ON customer_kaliplar(customer_id);

CREATE TABLE IF NOT EXISTS dealers (
  id INTEGER PRIMARY KEY,
  name TEXT, contact TEXT, phone TEXT, email TEXT, adres TEXT, country TEXT, city TEXT, note TEXT,
  bayiMi INTEGER, anlasmaliServisMi INTEGER, deletedAt TEXT
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  type TEXT, repairPlace TEXT, date TEXT, tech TEXT, yapilanIsler TEXT, musteriTalimati TEXT,
  servisUcreti REAL, currency TEXT, faturaTipi TEXT, odendi INTEGER,
  degisenParcalar TEXT, parcaUcretsizMi INTEGER, parcaUcreti REAL, parcaCurrency TEXT, parcaGarantiDisi INTEGER,
  islemFirma TEXT, parcaAltuntastanMi INTEGER, deletedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_services_customer ON services(customer_id);

CREATE TABLE IF NOT EXISTS stock (
  id INTEGER PRIMARY KEY, model TEXT, serialNo TEXT, addedDate TEXT, note TEXT, parcalar TEXT, deletedAt TEXT
);

CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, content TEXT, updatedAt TEXT, deletedAt TEXT);
CREATE TABLE IF NOT EXISTS parts (id INTEGER PRIMARY KEY, ad TEXT, adEN TEXT, kod TEXT, tanim TEXT, tanimEN TEXT, fiyatTRY REAL, fiyatUSD REAL, fiyatEUR REAL, models TEXT, deletedAt TEXT, tip TEXT, resim TEXT);

CREATE TABLE IF NOT EXISTS part_stock (
  id INTEGER PRIMARY KEY,
  part_id INTEGER,
  miktar INTEGER,
  notlar TEXT,
  sonGuncelleme TEXT
);
CREATE TABLE IF NOT EXISTS part_stock_log (
  id INTEGER PRIMARY KEY,
  part_id INTEGER,
  miktar INTEGER,
  tip TEXT,
  referans_id INTEGER,
  tarih TEXT,
  notlar TEXT
);

CREATE TABLE IF NOT EXISTS part_sales (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  tur TEXT, ad TEXT, olcu TEXT, tarih TEXT, ucret REAL, currency TEXT,
  odendi INTEGER, faturaTipi TEXT, ucretsizMi INTEGER, batchId INTEGER, deletedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_partsales_customer ON part_sales(customer_id);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  tarih TEXT, tutar REAL, currency TEXT, note TEXT,
  yontem TEXT, vadeTarihi TEXT, tahsilEdildi INTEGER, deletedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);

CREATE TABLE IF NOT EXISTS kalip_defs (id INTEGER PRIMARY KEY, ad TEXT, deletedAt TEXT, kod TEXT, urunAdi TEXT, urunAdiEN TEXT, tanim TEXT, tanimEN TEXT, resim TEXT);
CREATE TABLE IF NOT EXISTS standard_models (model TEXT PRIMARY KEY, sogutma TEXT, kapasite TEXT, kalip TEXT, kompresor TEXT, tanim TEXT, tanimEN TEXT, defaultParcalar TEXT, defaultBantlar TEXT, urunAdi TEXT, urunAdiEN TEXT, resim TEXT);
CREATE TABLE IF NOT EXISTS custom_models (model TEXT PRIMARY KEY, sogutma TEXT, kapasite TEXT, kalip TEXT, kompresor TEXT, deletedAt TEXT, tanim TEXT, tanimEN TEXT, defaultParcalar TEXT, defaultBantlar TEXT, urunAdi TEXT, urunAdiEN TEXT, resim TEXT);
CREATE TABLE IF NOT EXISTS teklifler (
  id INTEGER PRIMARY KEY,
  type TEXT, no TEXT, tarih TEXT, dil TEXT, currency TEXT,
  customer_id INTEGER,
  firma TEXT, yetkili TEXT, tel TEXT, vergiNo TEXT, vergiDairesi TEXT, adres TEXT,
  email TEXT, authority TEXT, forwarder TEXT,
  satirlar TEXT,
  iskonto REAL, kdvOrani REAL,
  odemeSekli TEXT, teslimSekli TEXT, teslimSuresi TEXT, teslimTarihi TEXT,
  notField TEXT, ek TEXT, teklifGecerlilik TEXT, kur TEXT, kurRate TEXT,
  teslimYeri TEXT, gtipNo TEXT,
  durum TEXT, createdAt TEXT, deletedAt TEXT,
  parentTeklifId INTEGER
);

CREATE TABLE IF NOT EXISTS factory (id INTEGER PRIMARY KEY CHECK (id = 1), name TEXT, contact TEXT, phone TEXT, email TEXT, adres TEXT, country TEXT, city TEXT, note TEXT, bankaAdi TEXT, hesapAdi TEXT, swift TEXT, ibanTL TEXT, ibanEUR TEXT, ibanUSD TEXT, gtipNo TEXT);
CREATE TABLE IF NOT EXISTS app_settings (id INTEGER PRIMARY KEY CHECK (id = 1), autoBackup INTEGER, backupFolder TEXT, frequency TEXT, lastBackup TEXT, kdvRate REAL, kdvRates TEXT, kaseResmi TEXT);

`;

// Daha önce oluşturulmuş bir data.db'ye, şemaya sonradan eklenen sütunları ekler (ALTER TABLE) —
// CREATE TABLE IF NOT EXISTS zaten var olan tabloları değiştirmediği için, yeni alan eklenince
// (örn. payments.yontem) mevcut kullanıcıların veritabanı bu fonksiyon olmadan eski şemada kalır.
function ensureColumns(conn, table, columns) {
  const existing = new Set(conn.prepare(`PRAGMA table_info(${table})`).all().map(r => r.name));
  for (const [name, type] of columns) {
    if (!existing.has(name)) conn.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
  }
}
const PAYMENTS_NEW_COLUMNS = [["yontem", "TEXT"], ["vadeTarihi", "TEXT"], ["tahsilEdildi", "INTEGER"]];
const DEALERS_NEW_COLUMNS = [["bayiMi", "INTEGER"], ["anlasmaliServisMi", "INTEGER"]];
const SERVICES_NEW_COLUMNS = [["islemFirma", "TEXT"], ["parcaAltuntastanMi", "INTEGER"]];
// KDV oranı artık tek bir sayı (kdvRate) değil, tarihe bağlı dönemler listesi (kdvRates, JSON) —
// eski kdvRate sütunu geriye uyumluluk için okunmaya devam eder (bkz. normalizeKdvRates).
const APP_SETTINGS_NEW_COLUMNS = [["kdvRates", "TEXT"]];
// Yedek parça tanımlarına sonradan eklenen TL/USD/EUR fiyat alanları — servis formunda parça
// seçilince fiyatın otomatik dolması için (bkz. partFiyatForCurrency).
const PARTS_NEW_COLUMNS = [["fiyatTRY", "REAL"], ["fiyatUSD", "REAL"], ["fiyatEUR", "REAL"], ["models", "TEXT"]];
const PARTS_EXTRA_COLUMNS = [["adEN", "TEXT"], ["kod", "TEXT"], ["tanim", "TEXT"], ["tanimEN", "TEXT"]];
const STOCK_NEW_COLUMNS = [["parcalar", "TEXT"]];
const MODELS_NEW_COLUMNS = [["tanim", "TEXT"], ["tanimEN", "TEXT"], ["defaultParcalar", "TEXT"]];
const MODELS_URUN_COLUMNS = [["urunAdi", "TEXT"], ["urunAdiEN", "TEXT"]];
const MODELS_RESIM_COLUMN = [["resim", "TEXT"]];
const MODELS_BANTLAR_COLUMN = [["defaultBantlar", "TEXT"]];
const KALIP_DEFS_NEW_COLUMNS = [["kod", "TEXT"], ["urunAdi", "TEXT"], ["urunAdiEN", "TEXT"], ["tanim", "TEXT"], ["tanimEN", "TEXT"]];
const KALIP_DEFS_RESIM_COLUMN = [["resim", "TEXT"]];
const TEKLIFLER_NEW_COLUMNS = [["email", "TEXT"], ["authority", "TEXT"], ["forwarder", "TEXT"], ["kurRate", "TEXT"], ["parentTeklifId", "INTEGER"]];
const CUSTOMERS_BANTLAR_COLUMN = [["bantlar", "TEXT"]];
const CUSTOMERS_PART_SECIMLERI_COLUMNS = [["konveyorSacId", "TEXT"], ["bantSecimiId", "TEXT"]];
const CUSTOMERS_SOURCE_STOCK_COLUMN = [["sourceStockId", "INTEGER"]];
const PARTS_TIP_RESIM_COLUMNS = [["tip", "TEXT"], ["resim", "TEXT"]];
const APP_SETTINGS_KASE_COLUMN = [["kaseResmi", "TEXT"]];
const APP_SETTINGS_PINNED_COLUMN = [["pinnedPartIds", "TEXT"]];
const APP_SETTINGS_EVRAK_COLUMN = [["evrakFormConfig", "TEXT"]];
const FACTORY_NEW_COLUMNS = [["bankaAdi", "TEXT"], ["hesapAdi", "TEXT"], ["swift", "TEXT"], ["ibanTL", "TEXT"], ["ibanEUR", "TEXT"], ["ibanUSD", "TEXT"], ["gtipNo", "TEXT"], ["bankalar", "TEXT"]];
// Çöp Kutusu (soft-delete): sonradan eklenen deletedAt sütunu — mevcut veritabanlarında bu
// sütun olmadığı için, daha önce kaydedilen deletedAt değerleri SQLite'a hiç yazılmıyor ve
// uygulama yeniden açıldığında silinen kayıtlar kendi bölümlerine geri dönüyordu.
const DELETED_AT_COLUMN = [["deletedAt", "TEXT"]];
const TABLES_WITH_TRASH = ["customers", "dealers", "services", "stock", "notes", "parts", "part_sales", "payments", "kalip_defs", "custom_models"];

const toInt = (b) => (b ? 1 : 0);
const toBool = (v) => !!v;
// bayiMi/parcaAltuntastanMi gibi "alan yoksa varsayılan true" mantığı taşıyan alanlar için: SQL'de
// NULL ile false birbirine karıştırılmamalı (toInt/toBool ile undefined her zaman false'a düşer ve
// "tanımsız" durumu kaybolur — eski/dokunulmamış kayıtlar yanlışlıkla false'a sabitlenir). Bu yüzden
// bu iki alan NULL (tanımsız) / 0 (false) / 1 (true) üç durumunu ayrı ayrı korur.
const toIntTriState = (v) => (v === undefined || v === null ? null : (v ? 1 : 0));
const toBoolTriState = (v) => (v === null || v === undefined ? undefined : !!v);
const json = (v) => (v === undefined ? null : JSON.stringify(v));
const parseJsonCol = (v, fallback) => {
  if (v === null || v === undefined) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
};

function maxIdAcross(arrays) {
  let max = 100;
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (typeof item?.id === "number" && item.id > max) max = item.id;
    }
  }
  return max;
}

// ── Şema + tüm tabloları tek transaction'da doldurma (migration ve normal save'te paylaşılır) ──
function populateAll(conn, data) {
  const insertCustomer = conn.prepare(`
    INSERT INTO customers (id, name, phone, email, adres, city, country, yetkili1Ad, yetkili1Tel, yetkili2Ad, yetkili2Tel,
      contact, aciklama, model, serialNo, kalipCapi, seriNoBekliyor, satisYapan, installDate, warrantyEnd, faturali,
      faturaBedeli, fabrikaSatisBedeli, komisyon, currency, kalanBorc, isResale, prevOwners, kalip, kalipSayisi, extraKalipFiyati, deletedAt, bantlar,
      konveyorSacId, bantSecimiId, sourceStockId)
    VALUES (@id, @name, @phone, @email, @adres, @city, @country, @yetkili1Ad, @yetkili1Tel, @yetkili2Ad, @yetkili2Tel,
      @contact, @aciklama, @model, @serialNo, @kalipCapi, @seriNoBekliyor, @satisYapan, @installDate, @warrantyEnd, @faturali,
      @faturaBedeli, @fabrikaSatisBedeli, @komisyon, @currency, @kalanBorc, @isResale, @prevOwners, @kalip, @kalipSayisi, @extraKalipFiyati, @deletedAt, @bantlar,
      @konveyorSacId, @bantSecimiId, @sourceStockId)
  `);
  const insertKalip = conn.prepare(`
    INSERT INTO customer_kaliplar (customer_id, ad, olcu, fiyat, part_sale_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)
  `);

  if (Array.isArray(data.customers)) {
    conn.prepare(`DELETE FROM services`).run();
    conn.prepare(`DELETE FROM part_sales`).run();
    conn.prepare(`DELETE FROM payments`).run();
    conn.prepare(`DELETE FROM customer_kaliplar`).run();
    conn.prepare(`DELETE FROM customers`).run();
    for (const c of data.customers) {
      insertCustomer.run({
        id: c.id, name: c.name ?? null, phone: c.phone ?? null, email: c.email ?? null, adres: c.adres ?? null,
        city: c.city ?? null, country: c.country ?? null,
        yetkili1Ad: c.yetkili1Ad ?? null, yetkili1Tel: c.yetkili1Tel ?? null, yetkili2Ad: c.yetkili2Ad ?? null, yetkili2Tel: c.yetkili2Tel ?? null,
        contact: c.contact ?? null, aciklama: c.aciklama ?? null,
        model: c.model ?? null, serialNo: c.serialNo ?? null, kalipCapi: json(c.kalipCapi), seriNoBekliyor: toInt(c.seriNoBekliyor),
        satisYapan: c.satisYapan ?? null, installDate: c.installDate ?? null, warrantyEnd: c.warrantyEnd ?? null, faturali: c.faturali ?? null,
        faturaBedeli: c.faturaBedeli ?? null, fabrikaSatisBedeli: c.fabrikaSatisBedeli ?? null, komisyon: c.komisyon ?? null, currency: c.currency ?? null,
        kalanBorc: c.kalanBorc ?? null, isResale: toInt(c.isResale), prevOwners: json(c.prevOwners ?? []),
        kalip: c.kalip ?? null, kalipSayisi: c.kalipSayisi ?? null, extraKalipFiyati: c.extraKalipFiyati ?? null,
        deletedAt: c.deletedAt ?? null,
        bantlar: json(c.bantlar ?? []),
        konveyorSacId: c.konveyorSacId ?? null,
        bantSecimiId: c.bantSecimiId ?? null,
        sourceStockId: c.sourceStockId ?? null,
      });
      (c.kaliplar || []).forEach((k, idx) => {
        insertKalip.run(c.id, k.ad ?? null, k.olcu ?? null, k.fiyat ?? null, k.partSaleId ?? null, idx);
      });
    }
  }

  if (Array.isArray(data.services)) {
    conn.prepare(`DELETE FROM services`).run();
    const stmt = conn.prepare(`
      INSERT INTO services (id, customer_id, type, repairPlace, date, tech, yapilanIsler, musteriTalimati,
        servisUcreti, currency, faturaTipi, odendi, degisenParcalar, parcaUcretsizMi, parcaUcreti, parcaCurrency, parcaGarantiDisi,
        islemFirma, parcaAltuntastanMi, deletedAt)
      VALUES (@id, @customer_id, @type, @repairPlace, @date, @tech, @yapilanIsler, @musteriTalimati,
        @servisUcreti, @currency, @faturaTipi, @odendi, @degisenParcalar, @parcaUcretsizMi, @parcaUcreti, @parcaCurrency, @parcaGarantiDisi,
        @islemFirma, @parcaAltuntastanMi, @deletedAt)
    `);
    for (const s of data.services) {
      stmt.run({
        id: s.id, customer_id: s.customerId ?? null, type: s.type ?? null, repairPlace: s.repairPlace ?? null,
        date: s.date ?? null, tech: s.tech ?? null, yapilanIsler: s.yapilanIsler ?? null, musteriTalimati: s.musteriTalimati ?? null,
        servisUcreti: s.servisUcreti ?? null, currency: s.currency ?? null, faturaTipi: s.faturaTipi ?? null, odendi: toInt(s.odendi),
        degisenParcalar: json(s.degisenParcalar ?? []), parcaUcretsizMi: toInt(s.parcaUcretsizMi), parcaUcreti: s.parcaUcreti ?? null,
        parcaCurrency: s.parcaCurrency ?? null, parcaGarantiDisi: toInt(s.parcaGarantiDisi),
        islemFirma: s.islemFirma ?? null, parcaAltuntastanMi: toIntTriState(s.parcaAltuntastanMi),
        deletedAt: s.deletedAt ?? null,
      });
    }
  }

  if (Array.isArray(data.partSales)) {
    conn.prepare(`DELETE FROM part_sales`).run();
    const stmt = conn.prepare(`
      INSERT INTO part_sales (id, customer_id, tur, ad, olcu, tarih, ucret, currency, odendi, faturaTipi, ucretsizMi, batchId, deletedAt)
      VALUES (@id, @customer_id, @tur, @ad, @olcu, @tarih, @ucret, @currency, @odendi, @faturaTipi, @ucretsizMi, @batchId, @deletedAt)
    `);
    for (const p of data.partSales) {
      stmt.run({
        id: p.id, customer_id: p.customerId ?? null, tur: p.tur ?? null, ad: p.ad ?? null, olcu: p.olcu ?? null,
        tarih: p.tarih ?? null, ucret: p.ucret ?? null, currency: p.currency ?? null, odendi: toInt(p.odendi),
        faturaTipi: p.faturaTipi ?? null, ucretsizMi: toInt(p.ucretsizMi), batchId: p.batchId ?? null,
        deletedAt: p.deletedAt ?? null,
      });
    }
  }

  if (Array.isArray(data.payments)) {
    conn.prepare(`DELETE FROM payments`).run();
    const stmt = conn.prepare(`INSERT INTO payments (id, customer_id, tarih, tutar, currency, note, yontem, vadeTarihi, tahsilEdildi, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const p of data.payments) {
      stmt.run(p.id, p.customerId ?? null, p.tarih ?? null, p.tutar ?? null, p.currency ?? null, p.not ?? null, p.yontem ?? null, p.vadeTarihi ?? null, p.yontem === "Çek" ? toInt(p.tahsilEdildi) : null, p.deletedAt ?? null);
    }
  }

  if (Array.isArray(data.dealers)) {
    conn.prepare(`DELETE FROM dealers`).run();
    const stmt = conn.prepare(`INSERT INTO dealers (id, name, contact, phone, email, adres, country, city, note, bayiMi, anlasmaliServisMi, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const d of data.dealers) stmt.run(d.id, d.name ?? null, d.contact ?? null, d.phone ?? null, d.email ?? null, d.adres ?? null, d.country ?? null, d.city ?? null, d.note ?? null, toIntTriState(d.bayiMi), toInt(d.anlasmaliServisMi), d.deletedAt ?? null);
  }

  if (Array.isArray(data.stock)) {
    conn.prepare(`DELETE FROM stock`).run();
    const stmt = conn.prepare(`INSERT INTO stock (id, model, serialNo, addedDate, note, parcalar, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const s of data.stock) stmt.run(s.id, s.model ?? null, s.serialNo ?? null, s.addedDate ?? null, s.note ?? null, json(s.parcalar ?? []), s.deletedAt ?? null);
  }

  if (Array.isArray(data.notes)) {
    conn.prepare(`DELETE FROM notes`).run();
    const stmt = conn.prepare(`INSERT INTO notes (id, content, updatedAt, deletedAt) VALUES (?, ?, ?, ?)`);
    for (const n of data.notes) stmt.run(n.id, n.content ?? null, n.updatedAt ?? null, n.deletedAt ?? null);
  }

  if (Array.isArray(data.parts)) {
    conn.prepare(`DELETE FROM parts`).run();
    const stmt = conn.prepare(`INSERT INTO parts (id, ad, adEN, kod, tanim, tanimEN, fiyatTRY, fiyatUSD, fiyatEUR, models, deletedAt, tip, resim) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const p of data.parts) stmt.run(p.id, p.ad ?? null, p.adEN ?? null, p.kod ?? null, p.tanim ?? null, p.tanimEN ?? null, p.fiyatTRY ?? null, p.fiyatUSD ?? null, p.fiyatEUR ?? null, json(p.models ?? []), p.deletedAt ?? null, p.tip ?? "Standart", p.resim ?? null);
  }

  if (Array.isArray(data.partStock)) {
    conn.prepare(`DELETE FROM part_stock`).run();
    const stmt = conn.prepare(`INSERT INTO part_stock (id, part_id, miktar, notlar, sonGuncelleme) VALUES (?, ?, ?, ?, ?)`);
    for (const s of data.partStock) stmt.run(s.id, s.partId ?? null, s.miktar ?? 0, s.notlar ?? null, s.sonGuncelleme ?? null);
  }

  if (Array.isArray(data.partStockLog)) {
    conn.prepare(`DELETE FROM part_stock_log`).run();
    const stmt = conn.prepare(`INSERT INTO part_stock_log (id, part_id, miktar, tip, referans_id, tarih, notlar) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const l of data.partStockLog) stmt.run(l.id, l.partId ?? null, l.miktar ?? 0, l.tip ?? null, l.referansId ?? null, l.tarih ?? null, l.notlar ?? null);
  }

  if (Array.isArray(data.kalipDefs)) {
    conn.prepare(`DELETE FROM kalip_defs`).run();
    const stmt = conn.prepare(`INSERT INTO kalip_defs (id, ad, deletedAt, kod, urunAdi, urunAdiEN, tanim, tanimEN, resim) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const k of data.kalipDefs) stmt.run(k.id, k.ad ?? null, k.deletedAt ?? null, k.kod ?? null, k.urunAdi ?? null, k.urunAdiEN ?? null, k.tanim ?? null, k.tanimEN ?? null, k.resim ?? null);
  }

  if (Array.isArray(data.standardModels)) {
    conn.prepare(`DELETE FROM standard_models`).run();
    const stmt = conn.prepare(`INSERT INTO standard_models (model, sogutma, kapasite, kalip, kompresor, tanim, tanimEN, defaultParcalar, defaultBantlar, urunAdi, urunAdiEN, resim) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const m of data.standardModels) stmt.run(m.model, m.sogutma ?? null, m.kapasite ?? null, m.kalip ?? null, m["kompresör"] ?? null, m.tanim ?? null, m.tanimEN ?? null, json(m.defaultParcalar ?? []), json(m.defaultBantlar ?? []), m.urunAdi ?? null, m.urunAdiEN ?? null, m.resim ?? null);
  }

  if (Array.isArray(data.customModels)) {
    conn.prepare(`DELETE FROM custom_models`).run();
    const stmt = conn.prepare(`INSERT INTO custom_models (model, sogutma, kapasite, kalip, kompresor, deletedAt, tanim, tanimEN, defaultParcalar, defaultBantlar, urunAdi, urunAdiEN, resim) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const m of data.customModels) stmt.run(m.model, m.sogutma ?? null, m.kapasite ?? null, m.kalip ?? null, m["kompresör"] ?? null, m.deletedAt ?? null, m.tanim ?? null, m.tanimEN ?? null, json(m.defaultParcalar ?? []), json(m.defaultBantlar ?? []), m.urunAdi ?? null, m.urunAdiEN ?? null, m.resim ?? null);
  }

  if (Array.isArray(data.teklifler)) {
    conn.prepare(`DELETE FROM teklifler`).run();
    const stmt = conn.prepare(`INSERT INTO teklifler (id, type, no, tarih, dil, currency, customer_id, firma, yetkili, tel, vergiNo, vergiDairesi, adres, email, authority, forwarder, satirlar, iskonto, kdvOrani, odemeSekli, teslimSekli, teslimSuresi, teslimTarihi, notField, ek, teklifGecerlilik, kur, kurRate, teslimYeri, gtipNo, durum, createdAt, deletedAt, parentTeklifId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const t of data.teklifler) {
      stmt.run(t.id, t.type ?? null, t.no ?? null, t.tarih ?? null, t.dil ?? null, t.currency ?? null, t.customerId ?? null, t.firma ?? null, t.yetkili ?? null, t.tel ?? null, t.vergiNo ?? null, t.vergiDairesi ?? null, t.adres ?? null, t.email ?? null, t.authority ?? null, t.forwarder ?? null, json(t.satirlar ?? []), t.iskonto ?? null, t.kdvOrani ?? null, t.odemeSekli ?? null, t.teslimSekli ?? null, t.teslimSuresi ?? null, t.teslimTarihi ?? null, t.not ?? null, t.ek ?? null, t.teklifGecerlilik ?? null, t.kur ?? null, t.kurRate ?? null, t.teslimYeri ?? null, t.gtipNo ?? null, t.durum ?? null, t.createdAt ?? null, t.deletedAt ?? null, t.parentTeklifId ?? null);
    }
  }

  if (data.factory) {
    conn.prepare(`DELETE FROM factory`).run();
    const f = data.factory;
    conn.prepare(`INSERT INTO factory (id, name, contact, phone, email, adres, country, city, note, bankaAdi, hesapAdi, swift, ibanTL, ibanEUR, ibanUSD, gtipNo, bankalar) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(f.name ?? null, f.contact ?? null, f.phone ?? null, f.email ?? null, f.adres ?? null, f.country ?? null, f.city ?? null, f.note ?? null,
           f.bankaAdi ?? null, f.hesapAdi ?? null, f.swift ?? null, f.ibanTL ?? null, f.ibanEUR ?? null, f.ibanUSD ?? null, f.gtipNo ?? null,
           Array.isArray(f.bankalar) ? json(f.bankalar) : null);
  }

  if (data.appSettings) {
    conn.prepare(`DELETE FROM app_settings`).run();
    const s = data.appSettings;
    conn.prepare(`INSERT INTO app_settings (id, autoBackup, backupFolder, frequency, lastBackup, kdvRate, kdvRates, kaseResmi, pinnedPartIds, evrakFormConfig) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(toInt(s.autoBackup), s.backupFolder ?? null, s.frequency ?? null, s.lastBackup ?? null, s.kdvRate ?? null, json(s.kdvRates), s.kaseResmi ?? null, json(s.pinnedPartIds ?? []), json(s.evrakFormConfig ?? null));
  }

  const nextId = typeof data.nextId === "number"
    ? data.nextId
    : maxIdAcross([data.customers, data.dealers, data.services, data.stock, data.partSales, data.payments, data.kalipDefs, data.partStock, data.partStockLog]) + 1;
  conn.prepare(`INSERT INTO meta (key, value) VALUES ('nextId', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(String(nextId));
}

function writeFailMarker(err) {
  try {
    fs.writeFileSync(getFailMarkerPath(), JSON.stringify({ at: new Date().toISOString(), error: String(err?.message || err) }, null, 2), "utf-8");
  } catch { /* yoksay */ }
}

function migrateFromJsonIfNeeded() {
  if (!Database) return; // native modül yüklenemedi, eski JSON modunda kal

  const dbPath = getDbPath();
  if (fs.existsSync(dbPath)) {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    // Sonradan eklenen yeni tabloları oluşturur (CREATE TABLE IF NOT EXISTS idempotent — var olanları bozmaz).
    db.exec(SCHEMA_SQL);
    ensureColumns(db, "payments", PAYMENTS_NEW_COLUMNS);
    ensureColumns(db, "dealers", DEALERS_NEW_COLUMNS);
    ensureColumns(db, "services", SERVICES_NEW_COLUMNS);
    ensureColumns(db, "app_settings", APP_SETTINGS_NEW_COLUMNS);
    ensureColumns(db, "parts", PARTS_NEW_COLUMNS);
    ensureColumns(db, "parts", PARTS_EXTRA_COLUMNS);
    ensureColumns(db, "standard_models", MODELS_NEW_COLUMNS);
    ensureColumns(db, "custom_models", MODELS_NEW_COLUMNS);
    ensureColumns(db, "standard_models", MODELS_URUN_COLUMNS);
    ensureColumns(db, "custom_models", MODELS_URUN_COLUMNS);
    ensureColumns(db, "standard_models", MODELS_RESIM_COLUMN);
    ensureColumns(db, "custom_models", MODELS_RESIM_COLUMN);
    ensureColumns(db, "standard_models", MODELS_BANTLAR_COLUMN);
    ensureColumns(db, "custom_models", MODELS_BANTLAR_COLUMN);
    ensureColumns(db, "kalip_defs", KALIP_DEFS_NEW_COLUMNS);
    ensureColumns(db, "kalip_defs", KALIP_DEFS_RESIM_COLUMN);
    ensureColumns(db, "teklifler", TEKLIFLER_NEW_COLUMNS);
    ensureColumns(db, "customers", CUSTOMERS_BANTLAR_COLUMN);
    ensureColumns(db, "customers", CUSTOMERS_PART_SECIMLERI_COLUMNS);
    ensureColumns(db, "customers", CUSTOMERS_SOURCE_STOCK_COLUMN);
    ensureColumns(db, "parts", PARTS_TIP_RESIM_COLUMNS);
    ensureColumns(db, "app_settings", APP_SETTINGS_KASE_COLUMN);
    ensureColumns(db, "app_settings", APP_SETTINGS_PINNED_COLUMN);
    ensureColumns(db, "app_settings", APP_SETTINGS_EVRAK_COLUMN);
    ensureColumns(db, "factory", FACTORY_NEW_COLUMNS);
    ensureColumns(db, "stock", STOCK_NEW_COLUMNS);
    for (const table of TABLES_WITH_TRASH) ensureColumns(db, table, DELETED_AT_COLUMN);
    active = true;
    return;
  }

  if (fs.existsSync(getFailMarkerPath())) return; // bilinen-bozuk girdi, eski JSON modunda kal

  const jsonPath = getJsonPath();
  if (!fs.existsSync(jsonPath)) {
    // Temiz kurulum: boş şema oluştur
    const conn = new Database(dbPath);
    conn.exec(SCHEMA_SQL);
    db = conn;
    active = true;
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  } catch (err) {
    console.error("Geçiş: data.json okunamadı/parse edilemedi, eski biçimde devam ediliyor:", err);
    writeFailMarker(err);
    return;
  }
  if (!parsed || typeof parsed !== "object") {
    writeFailMarker(new Error("Geçersiz veri biçimi"));
    return;
  }

  // Eski (v2.7.0 öncesi) veri "payments" alanını hiç içermeyebilir; bu durumda App.jsx'in
  // kendi kalanBorc'tan ödeme geçmişi türeten geçiş mantığının (App.jsx ~satır 98-114) bir kez daha
  // eski JSON yolunda çalışıp data.json'ı "payments" ile birlikte yeniden kaydetmesini bekleriz —
  // bu iş mantığını burada tekrar etmemek için SQLite geçişini bir sonraki açılışa erteliyoruz.
  if (Array.isArray(parsed.customers) && parsed.customers.length > 0 && !Array.isArray(parsed.payments)) {
    console.log("SQLite geçişi bir sonraki açılışa erteleniyor (eski veri 'payments' alanını içermiyor).");
    return;
  }

  const tmpPath = getTmpDbPath();
  if (fs.existsSync(tmpPath)) { try { fs.unlinkSync(tmpPath); } catch { /* yoksay */ } }

  let conn;
  try {
    conn = new Database(tmpPath);
    conn.pragma("journal_mode = WAL");
    conn.exec(SCHEMA_SQL);
    conn.transaction(() => populateAll(conn, parsed))();
    conn.close();

    fs.renameSync(tmpPath, dbPath);
    fs.renameSync(jsonPath, getMigratedBackupPath());

    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    active = true;
    console.log("SQLite geçişi tamamlandı:", dbPath);
  } catch (err) {
    console.error("SQLite geçişi başarısız oldu, eski JSON biçimine devam ediliyor:", err);
    try { conn?.close(); } catch { /* yoksay */ }
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch { /* yoksay */ }
    writeFailMarker(err);
    active = false;
  }
}

function isActive() { return active; }

function readBlobFromDb() {
  // Tüm kaliplar tek sorguda çekilip customer_id'ye göre JS'te gruplanır — müşteri sayısı
  // büyüdükçe müşteri-başına ayrı sorgu (N+1) yerine sabit sayıda sorgu kullanmak için.
  const kaliplarByCustomer = new Map();
  for (const k of db.prepare(`SELECT * FROM customer_kaliplar ORDER BY customer_id, sort_order`).all()) {
    const item = { ad: k.ad, olcu: k.olcu };
    if (k.fiyat !== null && k.fiyat !== undefined) item.fiyat = k.fiyat;
    if (k.part_sale_id !== null && k.part_sale_id !== undefined) item.partSaleId = k.part_sale_id;
    if (!kaliplarByCustomer.has(k.customer_id)) kaliplarByCustomer.set(k.customer_id, []);
    kaliplarByCustomer.get(k.customer_id).push(item);
  }

  const customers = db.prepare(`SELECT * FROM customers`).all().map((c) => ({
    ...c,
    kalipCapi: parseJsonCol(c.kalipCapi, undefined),
    seriNoBekliyor: toBool(c.seriNoBekliyor),
    isResale: toBool(c.isResale),
    prevOwners: parseJsonCol(c.prevOwners, []),
    kaliplar: kaliplarByCustomer.get(c.id) || [],
    bantlar: parseJsonCol(c.bantlar, []),
  }));

  const dealers = db.prepare(`SELECT * FROM dealers`).all().map((d) => ({
    ...d,
    bayiMi: toBoolTriState(d.bayiMi),
    anlasmaliServisMi: toBool(d.anlasmaliServisMi),
  }));

  const services = db.prepare(`SELECT * FROM services`).all().map((row) => {
    const { customer_id, degisenParcalar, odendi, parcaUcretsizMi, parcaGarantiDisi, parcaAltuntastanMi, ...rest } = row;
    return {
      ...rest,
      customerId: customer_id,
      degisenParcalar: parseJsonCol(degisenParcalar, []),
      odendi: toBool(odendi),
      parcaUcretsizMi: toBool(parcaUcretsizMi),
      parcaGarantiDisi: toBool(parcaGarantiDisi),
      parcaAltuntastanMi: toBoolTriState(parcaAltuntastanMi),
    };
  });

  const stock = db.prepare(`SELECT * FROM stock`).all().map((s) => ({
    ...s,
    parcalar: parseJsonCol(s.parcalar, []),
  }));
  const notes = db.prepare(`SELECT * FROM notes`).all();
  const parts = db.prepare(`SELECT * FROM parts`).all().map((p) => ({
    ...p,
    adEN: p.adEN ?? "",
    kod: p.kod ?? "",
    tanim: p.tanim ?? "",
    tanimEN: p.tanimEN ?? "",
    models: parseJsonCol(p.models, []),
    tip: p.tip ?? "Standart",
    resim: p.resim ?? "",
  }));

  const partStock = db.prepare(`SELECT * FROM part_stock`).all().map((s) => ({
    id: s.id, partId: String(s.part_id), miktar: s.miktar, notlar: s.notlar, sonGuncelleme: s.sonGuncelleme,
  }));
  const partStockLog = db.prepare(`SELECT * FROM part_stock_log`).all().map((l) => ({
    id: l.id, partId: String(l.part_id), miktar: l.miktar, tip: l.tip, referansId: l.referans_id, tarih: l.tarih, notlar: l.notlar,
  }));

  const partSales = db.prepare(`SELECT * FROM part_sales`).all().map((row) => {
    const { customer_id, odendi, ucretsizMi, ...rest } = row;
    return { ...rest, customerId: customer_id, odendi: toBool(odendi), ucretsizMi: toBool(ucretsizMi) };
  });

  const payments = db.prepare(`SELECT * FROM payments`).all().map((row) => {
    const { customer_id, note, tahsilEdildi, ...rest } = row;
    // tahsilEdildi sadece Çek ödemelerinde anlamlı; SQLite'tan 0/1/null gelir, isPaymentReceived/
    // isCekVadesiGecmis === true ile kıyasladığı için gerçek boolean'a çevrilmesi gerekiyor.
    return { ...rest, customerId: customer_id, not: note, ...(rest.yontem === "Çek" ? { tahsilEdildi: toBool(tahsilEdildi) } : {}) };
  });

  const kalipDefs = db.prepare(`SELECT * FROM kalip_defs`).all();

  const teklifler = db.prepare(`SELECT * FROM teklifler`).all().map((t) => ({
    ...t,
    customerId: t.customer_id,
    satirlar: parseJsonCol(t.satirlar, []),
    not: t.notField,
  }));

  const standardModels = db.prepare(`SELECT * FROM standard_models`).all().map((m) => ({
    model: m.model, sogutma: m.sogutma, kapasite: m.kapasite, kalip: m.kalip, "kompresör": m.kompresor,
    tanim: m.tanim ?? "", tanimEN: m.tanimEN ?? "",
    urunAdi: m.urunAdi ?? "", urunAdiEN: m.urunAdiEN ?? "",
    defaultParcalar: parseJsonCol(m.defaultParcalar, []),
    defaultBantlar: parseJsonCol(m.defaultBantlar, []),
    resim: m.resim ?? null,
  }));
  const customModels = db.prepare(`SELECT * FROM custom_models`).all().map((m) => ({
    model: m.model, sogutma: m.sogutma, kapasite: m.kapasite, kalip: m.kalip, "kompresör": m.kompresor, deletedAt: m.deletedAt,
    tanim: m.tanim ?? "", tanimEN: m.tanimEN ?? "",
    urunAdi: m.urunAdi ?? "", urunAdiEN: m.urunAdiEN ?? "",
    defaultParcalar: parseJsonCol(m.defaultParcalar, []),
    defaultBantlar: parseJsonCol(m.defaultBantlar, []),
    resim: m.resim ?? null,
  }));

  const factoryRow = db.prepare(`SELECT * FROM factory WHERE id = 1`).get();
  let factory = null;
  if (factoryRow) {
    const { id, ...rest } = factoryRow;
    factory = {
      ...rest,
      bankaAdi: rest.bankaAdi ?? "", hesapAdi: rest.hesapAdi ?? "", swift: rest.swift ?? "",
      ibanTL: rest.ibanTL ?? "", ibanEUR: rest.ibanEUR ?? "", ibanUSD: rest.ibanUSD ?? "",
      gtipNo: rest.gtipNo ?? "",
      bankalar: parseJsonCol(rest.bankalar, null),
    };
  }

  const settingsRow = db.prepare(`SELECT * FROM app_settings WHERE id = 1`).get();
  let appSettings = null;
  if (settingsRow) {
    const { id, autoBackup, kdvRates, pinnedPartIds, evrakFormConfig, ...rest } = settingsRow;
    appSettings = { ...rest, autoBackup: toBool(autoBackup), kdvRates: parseJsonCol(kdvRates, undefined), pinnedPartIds: parseJsonCol(pinnedPartIds, []), evrakFormConfig: parseJsonCol(evrakFormConfig, null) };
  }

  const nextIdRow = db.prepare(`SELECT value FROM meta WHERE key = 'nextId'`).get();
  const nextId = nextIdRow ? Number(nextIdRow.value) : undefined;

  return {
    customers, dealers, stock, kalipDefs, standardModels, customModels, factory,
    services, notes, parts, partSales, payments, teklifler, appSettings, nextId,
    partStock, partStockLog,
  };
}

function writeBlobToDb(data) {
  db.transaction(() => populateAll(db, data))();
}

module.exports = { migrateFromJsonIfNeeded, isActive, readBlobFromDb, writeBlobToDb, getDbPath, getJsonPath };
