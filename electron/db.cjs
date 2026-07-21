// ── SQLite depolama katmanı (data.json'dan tek seferlik geçiş + okuma/yazma) ──
// crm:load/crm:save'in arkasında çalışır; renderer hiçbir şey bilmez, aynı blob şeklini görür.
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { app, safeStorage } = require("electron");

// Şifreli-yetenekli sürüm (better-sqlite3-multiple-ciphers, SQLCipher uyumlu) önce denenir;
// yoksa şifrelemesiz better-sqlite3'e düşülür. API aynıdır (drop-in).
let Database = null;
let dbEncryptable = false; // true → şifreli-yetenekli build yüklendi
try {
  Database = require("better-sqlite3-multiple-ciphers");
  dbEncryptable = true;
} catch (errMc) {
  try {
    Database = require("better-sqlite3");
    console.warn("better-sqlite3-multiple-ciphers yok; şifrelemesiz better-sqlite3 kullanılıyor:", errMc.message);
  } catch (err) {
    console.error("SQLite native modülü yüklenemedi, eski JSON depolamaya devam ediliyor:", err);
  }
}

let db = null;
let active = false;

const getJsonPath = () => path.join(app.getPath("userData"), "data.json");
const getDbPath = () => path.join(app.getPath("userData"), "data.db");
const getTmpDbPath = () => path.join(app.getPath("userData"), "data.db.tmp-migrating");
const getMigratedBackupPath = () => path.join(app.getPath("userData"), "data.migrated-backup.json");
const getFailMarkerPath = () => path.join(app.getPath("userData"), "data.migration-failed.json");
const getDbKeyPath = () => path.join(app.getPath("userData"), "db-key.enc");

// ── Veritabanı şifreleme anahtarı (at-rest) ──────────────────────────────────
// DB, AES ile şifreli tutulur (SQLCipher uyumlu). Anahtar OS anahtarlığında (safeStorage:
// Windows DPAPI / macOS Keychain) şifreli bir dosyada durur; ne DB'de ne düz dosyada bırakılır.
// safeStorage yoksa (nadir) şifreleme devre dışı kalır ve DB düz kalır (eski davranış) —
// anahtarı güvenli saklayamadan şifrelemek yanıltıcı olurdu.
let cachedDbKey; // undefined: hesaplanmadı, null: şifreleme yok, string: anahtar
function getDbKey() {
  if (cachedDbKey !== undefined) return cachedDbKey;
  if (!dbEncryptable) return (cachedDbKey = null);
  let canEncrypt = false;
  try { canEncrypt = !!safeStorage?.isEncryptionAvailable?.(); } catch { canEncrypt = false; }
  if (!canEncrypt) return (cachedDbKey = null);
  const p = getDbKeyPath();
  try {
    if (fs.existsSync(p)) return (cachedDbKey = safeStorage.decryptString(fs.readFileSync(p)));
  } catch (e) { console.error("[db] şifreleme anahtarı okunamadı:", e.message); }
  const key = crypto.randomBytes(32).toString("hex");
  try { fs.writeFileSync(p, safeStorage.encryptString(key)); cachedDbKey = key; }
  catch (e) { console.error("[db] anahtar kaydedilemedi, şifreleme devre dışı:", e.message); cachedDbKey = null; }
  return cachedDbKey;
}

// Şifreli-yetenekli açılış: anahtar varsa PRAGMA key uygular (yeni dosyayı şifreli oluşturur,
// var olan şifreliyi açar). Anahtar hex olduğundan enjeksiyon riski yok.
function openDb(dbPath) {
  const conn = new Database(dbPath);
  const key = getDbKey();
  if (key) conn.pragma(`key='${key}'`);
  return conn;
}

// Var olan DÜZ bir data.db'yi yerinde şifreler (tek seferlik geçiş). Zaten şifreliyse dokunmaz.
function ensureEncrypted(dbPath) {
  const key = getDbKey();
  if (!key) return; // şifreleme kapalı → düz kalır (eski davranış)
  const conn = new Database(dbPath);
  let plaintext = false;
  try { conn.prepare("SELECT count(*) FROM sqlite_master").get(); plaintext = true; } // anahtarsız okunabiliyorsa düz
  catch { plaintext = false; } // okunamadı → zaten şifreli (ya da bozuk; açılış aşaması ele alır)
  try {
    if (plaintext) {
      try { fs.copyFileSync(dbPath, dbPath + ".pre-encrypt.bak"); } catch { /* yedek başarısız → yine de dene */ }
      // rekey WAL journal modunda desteklenmiyor ("Rekeying is not supported in WAL journal mode").
      // Önce rollback journal'a geç (bu WAL'ı checkpoint'ler); rekey sonrası açılışta openDb + WAL geri döner.
      try { conn.pragma("journal_mode = DELETE"); } catch { /* yoksay */ }
      conn.pragma(`rekey='${key}'`); // yerinde şifrele
      console.log("[db] mevcut veritabanı at-rest şifrelendi.");
    }
  } finally {
    try { conn.close(); } catch { /* yoksay */ }
  }
}

const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
-- Hız sınırı sayaçları (login brute-force): sunucu yeniden başlasa da kilit korunsun diye kalıcı.
CREATE TABLE IF NOT EXISTS rate_limit (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  name TEXT, phone TEXT, email TEXT, adres TEXT, city TEXT, ilce TEXT, country TEXT,
  yetkili1Ad TEXT, yetkili1Tel TEXT, yetkili2Ad TEXT, yetkili2Tel TEXT,
  contact TEXT, aciklama TEXT,
  model TEXT, serialNo TEXT, kalipCapi TEXT, seriNoBekliyor INTEGER,
  satisYapan TEXT, installDate TEXT, warrantyEnd TEXT,
  faturali TEXT, faturaBedeli REAL, fabrikaSatisBedeli REAL, komisyon REAL, currency TEXT,
  kalanBorc REAL, isResale INTEGER, prevOwners TEXT,
  kalip TEXT, kalipSayisi INTEGER, extraKalipFiyati TEXT, deletedAt TEXT,
  bantlar TEXT,
  konveyorSacId TEXT, bantSecimiId TEXT, sourceStockId INTEGER,
  fromTeklifId INTEGER,
  odemePlani TEXT,
  brutKg REAL,
  tipSecimleri TEXT
);

CREATE TABLE IF NOT EXISTS gorusmeler (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  tarih TEXT, tur TEXT, notField TEXT,
  takipTarihi TEXT, tamamlandi INTEGER, kullanici TEXT, deletedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_gorusmeler_customer ON gorusmeler(customer_id);

CREATE TABLE IF NOT EXISTS dosyalar (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  dealer_id INTEGER,
  refType TEXT, refId INTEGER,
  ad TEXT, dosyaAdi TEXT, boyut INTEGER, tur TEXT,
  tarih TEXT, ekleyen TEXT, aciklama TEXT, deletedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_dosyalar_customer ON dosyalar(customer_id);

CREATE TABLE IF NOT EXISTS customer_kaliplar (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  ad TEXT, olcu TEXT, fiyat REAL, part_sale_id INTEGER, sort_order INTEGER,
  uretimFormGonder INTEGER, uretimFormId INTEGER
);
CREATE INDEX IF NOT EXISTS idx_kaliplar_customer ON customer_kaliplar(customer_id);

CREATE TABLE IF NOT EXISTS dealers (
  id INTEGER PRIMARY KEY,
  name TEXT, contact TEXT, phone TEXT, email TEXT, adres TEXT, country TEXT, city TEXT, ilce TEXT, note TEXT,
  bayiMi INTEGER, anlasmaliServisMi INTEGER, deletedAt TEXT
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  type TEXT, repairPlace TEXT, date TEXT, tech TEXT, yapilanIsler TEXT, musteriTalimati TEXT, fabrikaNotu TEXT,
  servisUcreti REAL, currency TEXT, faturaTipi TEXT, odendi INTEGER,
  degisenParcalar TEXT, parcaUcretsizMi INTEGER, parcaUcreti REAL, parcaCurrency TEXT, parcaGarantiDisi INTEGER,
  islemFirma TEXT, parcaAltuntastanMi INTEGER, deletedAt TEXT,
  islemFirmaAd TEXT, islemFirmaYetkili TEXT, islemFirmaTel TEXT, islemFirmaUlke TEXT, islemFirmaSehir TEXT,
  durum TEXT, panoGizli INTEGER
);
CREATE INDEX IF NOT EXISTS idx_services_customer ON services(customer_id);

CREATE TABLE IF NOT EXISTS stock (
  id INTEGER PRIMARY KEY, model TEXT, serialNo TEXT, addedDate TEXT, note TEXT, parcalar TEXT, deletedAt TEXT
);

CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, content TEXT, updatedAt TEXT, olusturan TEXT, deletedAt TEXT);
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
  odendi INTEGER, faturaTipi TEXT, ucretsizMi INTEGER, batchId INTEGER, deletedAt TEXT,
  teklifId INTEGER, uretimFormGonder INTEGER, uretimFormId INTEGER,
  satisFirma TEXT, satisFirmaAd TEXT, satisFirmaYetkili TEXT, satisFirmaTel TEXT, satisFirmaUlke TEXT, satisFirmaSehir TEXT
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
  parentTeklifId INTEGER,
  satisTamam INTEGER, tur TEXT, country TEXT, city TEXT, modelYiliDegeri TEXT, customFieldValues TEXT,
  takipKapali INTEGER
);

CREATE TABLE IF NOT EXISTS factory (id INTEGER PRIMARY KEY CHECK (id = 1), name TEXT, contact TEXT, phone TEXT, email TEXT, adres TEXT, country TEXT, city TEXT, ilce TEXT, note TEXT, bankaAdi TEXT, hesapAdi TEXT, swift TEXT, ibanTL TEXT, ibanEUR TEXT, ibanUSD TEXT, gtipNo TEXT, bankalar TEXT, evrakFirmaAdi TEXT, web TEXT, faturaFirmaAdi TEXT, haritaKonum TEXT);
CREATE TABLE IF NOT EXISTS app_settings (id INTEGER PRIMARY KEY CHECK (id = 1), autoBackup INTEGER, backupFolder TEXT, frequency TEXT, lastBackup TEXT, kdvRate REAL, kdvRates TEXT, kaseResmi TEXT, pinnedPartIds TEXT, evrakFormConfig TEXT);

CREATE TABLE IF NOT EXISTS faturalar (
  id INTEGER PRIMARY KEY,
  no TEXT, tarih TEXT, firma TEXT, adres TEXT, ulke TEXT, sehir TEXT,
  vatId TEXT, localTaxNo TEXT,
  satirlar TEXT,
  currency TEXT, kur TEXT, origin TEXT,
  payment TEXT, delivery TEXT,
  paketAdedi TEXT, brutAgirlik TEXT, olculer TEXT,
  gtipNo TEXT, notField TEXT, createdAt TEXT, deletedAt TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY,
  username    TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user',
  is_active   INTEGER NOT NULL DEFAULT 1,
  permissions TEXT,
  created_at  TEXT,
  token_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS locks (
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  locked_by   TEXT NOT NULL,
  locked_at   TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  PRIMARY KEY (entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS uretim_formlari (
  id INTEGER PRIMARY KEY,
  tarih TEXT,
  notField TEXT,
  createdAt TEXT,
  satirlar TEXT,
  deletedAt TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ts         TEXT NOT NULL,
  username   TEXT NOT NULL,
  role       TEXT,
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  INTEGER,
  entity_name TEXT,
  detail     TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);

CREATE TABLE IF NOT EXISTS security_log (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ts       TEXT NOT NULL,
  actor    TEXT,
  action   TEXT NOT NULL,
  target   TEXT,
  ip       TEXT,
  detail   TEXT
);
CREATE INDEX IF NOT EXISTS idx_security_ts ON security_log(ts);

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
const SERVICES_NEW_COLUMNS = [["islemFirma", "TEXT"], ["parcaAltuntastanMi", "INTEGER"], ["fabrikaNotu", "TEXT"]];
// "İşlemi Yapan Firma" = "Diğer" (anlaşmasız dış servis) seçilince yalnız servise kaydedilen firma
// bilgileri — müşteri/bayi kaydı oluşturulmaz. Bu sütunlar olmadan renderer'ın yazdığı değerler
// sessizce düşer (bkz. INSERT açık sütun listesi).
const SERVICES_DIS_FIRMA_COLUMNS = [["islemFirmaAd", "TEXT"], ["islemFirmaYetkili", "TEXT"], ["islemFirmaTel", "TEXT"], ["islemFirmaUlke", "TEXT"], ["islemFirmaSehir", "TEXT"]];
// Servis Panosu (Kanban) durumu: "Bekliyor" / "Yapılıyor" / "Tamamlandı". Boş = eski kayıt (panoda görünmez).
// panoGizli: Tamamlandı kartını "Panodan Kaldır" ile arşivler; servis kaydı DURUR (silinmez), yalnız
// panoda görünmez olur (durum "Tamamlandı" kalır, geçmiş rozeti korunur). INTEGER (0/1) boolean.
const SERVICES_DURUM_COLUMN = [["durum", "TEXT"], ["panoGizli", "INTEGER"]];
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
// Teklifin CRM'e aktarıldığını işaretleyen satisTamam ve sonradan eklenen form alanları — bu
// kolonlar olmadan renderer'ın kaydettiği değerler yazımda sessizce düşüyor ve uygulama yeniden
// açıldığında onaylı teklif tekrar dönüştürülebilir hale geliyordu (tek-kullanımlık koruma kaybı).
const TEKLIFLER_CONVERT_COLUMNS = [["satisTamam", "INTEGER"], ["tur", "TEXT"], ["country", "TEXT"], ["city", "TEXT"], ["modelYiliDegeri", "TEXT"], ["customFieldValues", "TEXT"]];
// Tekliften doğan kayıtların teklif bağlantısı: makina kaydında fromTeklifId, parça/kalıp
// satışında teklifId — tek-kullanımlık korumanın kalıcı kanıtı olarak saklanır.
const CUSTOMERS_FROM_TEKLIF_COLUMN = [["fromTeklifId", "INTEGER"]];
// Üretim formu takibi: kalıp/parça satırının üretim formuna gönderilme işareti ve bağlandığı form
const PART_SALES_TEKLIF_URETIM_COLUMNS = [["teklifId", "INTEGER"], ["uretimFormGonder", "INTEGER"], ["uretimFormId", "INTEGER"]];
// Extra kalıp satışında "Satış Yapan Firma" (Fabrika / bayi / "Diğer"). "Diğer" iken yalnız satışa
// kaydedilen anlaşmasız firma bilgileri — müşteri/bayi kaydı oluşturulmaz.
const PART_SALES_SATIS_FIRMA_COLUMNS = [["satisFirma", "TEXT"], ["satisFirmaAd", "TEXT"], ["satisFirmaYetkili", "TEXT"], ["satisFirmaTel", "TEXT"], ["satisFirmaUlke", "TEXT"], ["satisFirmaSehir", "TEXT"]];
const KALIPLAR_URETIM_COLUMNS = [["uretimFormGonder", "INTEGER"], ["uretimFormId", "INTEGER"]];
// Ödeme planı (taksit vadeleri, JSON) ve teklif takip hatırlatmasından çıkarma işareti
const CUSTOMERS_ODEME_PLANI_COLUMN = [["odemePlani", "TEXT"]];
const TEKLIFLER_TAKIP_COLUMN = [["takipKapali", "INTEGER"]];
const CUSTOMERS_BANTLAR_COLUMN = [["bantlar", "TEXT"]];
const CUSTOMERS_BRUT_KG_COLUMN = [["brutKg", "REAL"]]; // sandık etiketi brüt ağırlık
const DOSYALAR_DEALER_COLUMN = [["dealer_id", "INTEGER"]]; // bayi/anlaşmalı servis dosyaları için
const NOTES_OLUSTURAN_COLUMN = [["olusturan", "TEXT"]]; // notu oluşturan kullanıcı adı (çok kullanıcıda "Benim Notlarım" filtresi)
const CUSTOMERS_PART_SECIMLERI_COLUMNS = [["konveyorSacId", "TEXT"], ["bantSecimiId", "TEXT"]];
// Kullanıcı-tanımlı parça tiplerinin makina seçimleri (JSON: { [tipId]: partId }) — eski
// konveyorSacId/bantSecimiId'nin genelleşmiş hali (bkz. utils.migrateTipSecimleri).
const CUSTOMERS_TIP_SECIMLERI_COLUMN = [["tipSecimleri", "TEXT"]];
// İlçe kırılımı istenen iller için (Harita). Müşteri ve bayide aynı alan adı.
const ILCE_COLUMN = [["ilce", "TEXT"]];
const CUSTOMERS_SOURCE_STOCK_COLUMN = [["sourceStockId", "INTEGER"]];
const PARTS_TIP_RESIM_COLUMNS = [["tip", "TEXT"], ["resim", "TEXT"]];
const APP_SETTINGS_KASE_COLUMN = [["kaseResmi", "TEXT"]];
const APP_SETTINGS_PINNED_COLUMN = [["pinnedPartIds", "TEXT"]];
const APP_SETTINGS_EVRAK_COLUMN = [["evrakFormConfig", "TEXT"]];
const APP_SETTINGS_AUTOLOCK_COLUMN = [["autoLockMinutes", "INTEGER"]];
// Takip süreleri: teklif hatırlatma eşiği ve beklenen tahsilat penceresi (gün) — Ayarlar > Tanımlar > Takip Süreleri
const APP_SETTINGS_TAKIP_COLUMNS = [["teklifTakipGun", "INTEGER"], ["tahsilatTakipGun", "INTEGER"]];
// translations bugüne kadar hiç kolon olmadığı için kaydedilmiyordu (sessiz alan kaybı) —
// mailTemplates ile birlikte kalıcı hale getirildi.
const APP_SETTINGS_JSON_COLUMNS = [["translations", "TEXT"], ["mailTemplates", "TEXT"]];
const USERS_PERMISSIONS_COLUMN = [["permissions", "TEXT"]];
// Şifre her değiştiğinde artar ve JWT'deki tv alanıyla karşılaştırılır — böylece admin bir
// kullanıcının şifresini değiştirince o kullanıcının eski oturumu (token süresi dolmadan) düşer.
const USERS_TOKEN_VERSION_COLUMN = [["token_version", "INTEGER NOT NULL DEFAULT 1"]];
// İki adımlı doğrulama (TOTP): secret + açık mı + kurtarma kodu hash'leri (JSON) + son kabul
// edilen kod (replay: aynı kod 30 sn içinde iki kez kullanılamasın).
const USERS_TOTP_COLUMNS = [["totp_secret", "TEXT"], ["totp_enabled", "INTEGER NOT NULL DEFAULT 0"], ["totp_recovery", "TEXT"], ["totp_last_code", "TEXT"]];
const URETIM_FORMLARI_DONEM_COLUMNS = [["baslangicTarihi", "TEXT"], ["bitisTarihi", "TEXT"]];
const URETIM_FORMLARI_KAPALI_COLUMN = [["kapali", "INTEGER"]];
const FACTORY_NEW_COLUMNS = [["bankaAdi", "TEXT"], ["hesapAdi", "TEXT"], ["swift", "TEXT"], ["ibanTL", "TEXT"], ["ibanEUR", "TEXT"], ["ibanUSD", "TEXT"], ["gtipNo", "TEXT"], ["bankalar", "TEXT"], ["evrakFirmaAdi", "TEXT"], ["web", "TEXT"], ["faturaFirmaAdi", "TEXT"], ["haritaKonum", "TEXT"]];
// Çöp Kutusu (soft-delete): sonradan eklenen deletedAt sütunu — mevcut veritabanlarında bu
// sütun olmadığı için, daha önce kaydedilen deletedAt değerleri SQLite'a hiç yazılmıyor ve
// uygulama yeniden açıldığında silinen kayıtlar kendi bölümlerine geri dönüyordu.
const DELETED_AT_COLUMN = [["deletedAt", "TEXT"]];
const TABLES_WITH_TRASH = ["customers", "dealers", "services", "stock", "notes", "parts", "part_sales", "payments", "kalip_defs", "custom_models", "uretim_formlari", "gorusmeler", "dosyalar", "teklifler", "faturalar"];

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
function populateAll(conn, data, skip = new Set()) {
  const insertCustomer = conn.prepare(`
    INSERT INTO customers (id, name, phone, email, adres, city, ilce, country, yetkili1Ad, yetkili1Tel, yetkili2Ad, yetkili2Tel,
      contact, aciklama, model, serialNo, kalipCapi, seriNoBekliyor, satisYapan, installDate, warrantyEnd, faturali,
      faturaBedeli, fabrikaSatisBedeli, komisyon, currency, kalanBorc, isResale, prevOwners, kalip, kalipSayisi, extraKalipFiyati, deletedAt, bantlar,
      konveyorSacId, bantSecimiId, sourceStockId, fromTeklifId, odemePlani, brutKg, tipSecimleri)
    VALUES (@id, @name, @phone, @email, @adres, @city, @ilce, @country, @yetkili1Ad, @yetkili1Tel, @yetkili2Ad, @yetkili2Tel,
      @contact, @aciklama, @model, @serialNo, @kalipCapi, @seriNoBekliyor, @satisYapan, @installDate, @warrantyEnd, @faturali,
      @faturaBedeli, @fabrikaSatisBedeli, @komisyon, @currency, @kalanBorc, @isResale, @prevOwners, @kalip, @kalipSayisi, @extraKalipFiyati, @deletedAt, @bantlar,
      @konveyorSacId, @bantSecimiId, @sourceStockId, @fromTeklifId, @odemePlani, @brutKg, @tipSecimleri)
  `);
  const insertKalip = conn.prepare(`
    INSERT INTO customer_kaliplar (customer_id, ad, olcu, fiyat, part_sale_id, sort_order, uretimFormGonder, uretimFormId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  if (Array.isArray(data.customers) && !skip.has("customers")) {
    conn.prepare(`DELETE FROM services`).run();
    conn.prepare(`DELETE FROM part_sales`).run();
    conn.prepare(`DELETE FROM payments`).run();
    conn.prepare(`DELETE FROM gorusmeler`).run();
    conn.prepare(`DELETE FROM dosyalar`).run();
    conn.prepare(`DELETE FROM customer_kaliplar`).run();
    conn.prepare(`DELETE FROM customers`).run();
    for (const c of data.customers) {
      insertCustomer.run({
        id: c.id, name: c.name ?? null, phone: c.phone ?? null, email: c.email ?? null, adres: c.adres ?? null,
        city: c.city ?? null, ilce: c.ilce ?? null, country: c.country ?? null,
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
        fromTeklifId: c.fromTeklifId ?? null,
        odemePlani: json(c.odemePlani ?? []),
        brutKg: c.brutKg ?? null,
        tipSecimleri: json(c.tipSecimleri ?? {}),
      });
      (c.kaliplar || []).forEach((k, idx) => {
        insertKalip.run(c.id, k.ad ?? null, k.olcu ?? null, k.fiyat ?? null, k.partSaleId ?? null, idx, toInt(k.uretimFormGonder), k.uretimFormId ?? null);
      });
    }
  }

  if (Array.isArray(data.services) && !skip.has("services")) {
    conn.prepare(`DELETE FROM services`).run();
    const stmt = conn.prepare(`
      INSERT INTO services (id, customer_id, type, repairPlace, date, tech, yapilanIsler, musteriTalimati, fabrikaNotu,
        servisUcreti, currency, faturaTipi, odendi, degisenParcalar, parcaUcretsizMi, parcaUcreti, parcaCurrency, parcaGarantiDisi,
        islemFirma, parcaAltuntastanMi, deletedAt,
        islemFirmaAd, islemFirmaYetkili, islemFirmaTel, islemFirmaUlke, islemFirmaSehir, durum, panoGizli)
      VALUES (@id, @customer_id, @type, @repairPlace, @date, @tech, @yapilanIsler, @musteriTalimati, @fabrikaNotu,
        @servisUcreti, @currency, @faturaTipi, @odendi, @degisenParcalar, @parcaUcretsizMi, @parcaUcreti, @parcaCurrency, @parcaGarantiDisi,
        @islemFirma, @parcaAltuntastanMi, @deletedAt,
        @islemFirmaAd, @islemFirmaYetkili, @islemFirmaTel, @islemFirmaUlke, @islemFirmaSehir, @durum, @panoGizli)
    `);
    for (const s of data.services) {
      stmt.run({
        id: s.id, customer_id: s.customerId ?? null, type: s.type ?? null, repairPlace: s.repairPlace ?? null,
        date: s.date ?? null, tech: s.tech ?? null, yapilanIsler: s.yapilanIsler ?? null, musteriTalimati: s.musteriTalimati ?? null, fabrikaNotu: s.fabrikaNotu ?? null,
        servisUcreti: s.servisUcreti ?? null, currency: s.currency ?? null, faturaTipi: s.faturaTipi ?? null, odendi: toInt(s.odendi),
        degisenParcalar: json(s.degisenParcalar ?? []), parcaUcretsizMi: toInt(s.parcaUcretsizMi), parcaUcreti: s.parcaUcreti ?? null,
        parcaCurrency: s.parcaCurrency ?? null, parcaGarantiDisi: toInt(s.parcaGarantiDisi),
        islemFirma: s.islemFirma ?? null, parcaAltuntastanMi: toIntTriState(s.parcaAltuntastanMi),
        deletedAt: s.deletedAt ?? null,
        islemFirmaAd: s.islemFirmaAd ?? null, islemFirmaYetkili: s.islemFirmaYetkili ?? null, islemFirmaTel: s.islemFirmaTel ?? null,
        islemFirmaUlke: s.islemFirmaUlke ?? null, islemFirmaSehir: s.islemFirmaSehir ?? null, durum: s.durum ?? null, panoGizli: toInt(s.panoGizli),
      });
    }
  }

  if (Array.isArray(data.partSales) && !skip.has("partSales")) {
    conn.prepare(`DELETE FROM part_sales`).run();
    const stmt = conn.prepare(`
      INSERT INTO part_sales (id, customer_id, tur, ad, olcu, tarih, ucret, currency, odendi, faturaTipi, ucretsizMi, batchId, deletedAt, teklifId, uretimFormGonder, uretimFormId,
        satisFirma, satisFirmaAd, satisFirmaYetkili, satisFirmaTel, satisFirmaUlke, satisFirmaSehir)
      VALUES (@id, @customer_id, @tur, @ad, @olcu, @tarih, @ucret, @currency, @odendi, @faturaTipi, @ucretsizMi, @batchId, @deletedAt, @teklifId, @uretimFormGonder, @uretimFormId,
        @satisFirma, @satisFirmaAd, @satisFirmaYetkili, @satisFirmaTel, @satisFirmaUlke, @satisFirmaSehir)
    `);
    for (const p of data.partSales) {
      stmt.run({
        id: p.id, customer_id: p.customerId ?? null, tur: p.tur ?? null, ad: p.ad ?? null, olcu: p.olcu ?? null,
        tarih: p.tarih ?? null, ucret: p.ucret ?? null, currency: p.currency ?? null, odendi: toInt(p.odendi),
        faturaTipi: p.faturaTipi ?? null, ucretsizMi: toInt(p.ucretsizMi), batchId: p.batchId ?? null,
        deletedAt: p.deletedAt ?? null,
        teklifId: p.teklifId ?? null, uretimFormGonder: toInt(p.uretimFormGonder), uretimFormId: p.uretimFormId ?? null,
        satisFirma: p.satisFirma ?? null, satisFirmaAd: p.satisFirmaAd ?? null, satisFirmaYetkili: p.satisFirmaYetkili ?? null,
        satisFirmaTel: p.satisFirmaTel ?? null, satisFirmaUlke: p.satisFirmaUlke ?? null, satisFirmaSehir: p.satisFirmaSehir ?? null,
      });
    }
  }

  if (Array.isArray(data.payments) && !skip.has("payments")) {
    conn.prepare(`DELETE FROM payments`).run();
    const stmt = conn.prepare(`INSERT INTO payments (id, customer_id, tarih, tutar, currency, note, yontem, vadeTarihi, tahsilEdildi, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const p of data.payments) {
      stmt.run(p.id, p.customerId ?? null, p.tarih ?? null, p.tutar ?? null, p.currency ?? null, p.not ?? null, p.yontem ?? null, p.vadeTarihi ?? null, p.yontem === "Çek" ? toInt(p.tahsilEdildi) : null, p.deletedAt ?? null);
    }
  }

  if (Array.isArray(data.gorusmeler) && !skip.has("gorusmeler")) {
    conn.prepare(`DELETE FROM gorusmeler`).run();
    const stmt = conn.prepare(`INSERT INTO gorusmeler (id, customer_id, tarih, tur, notField, takipTarihi, tamamlandi, kullanici, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const g of data.gorusmeler) {
      stmt.run(g.id, g.customerId ?? null, g.tarih ?? null, g.tur ?? null, g.not ?? null, g.takipTarihi ?? null, toInt(g.tamamlandi), g.kullanici ?? null, g.deletedAt ?? null);
    }
  }

  if (Array.isArray(data.dosyalar) && !skip.has("dosyalar")) {
    conn.prepare(`DELETE FROM dosyalar`).run();
    const stmt = conn.prepare(`INSERT INTO dosyalar (id, customer_id, dealer_id, refType, refId, ad, dosyaAdi, boyut, tur, tarih, ekleyen, aciklama, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const d of data.dosyalar) {
      stmt.run(d.id, d.customerId ?? null, d.dealerId ?? null, d.refType ?? null, d.refId ?? null, d.ad ?? null, d.dosyaAdi ?? null, d.boyut ?? null, d.tur ?? null, d.tarih ?? null, d.ekleyen ?? null, d.aciklama ?? null, d.deletedAt ?? null);
    }
  }

  if (Array.isArray(data.dealers) && !skip.has("dealers")) {
    conn.prepare(`DELETE FROM dealers`).run();
    const stmt = conn.prepare(`INSERT INTO dealers (id, name, contact, phone, email, adres, country, city, ilce, note, bayiMi, anlasmaliServisMi, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const d of data.dealers) stmt.run(d.id, d.name ?? null, d.contact ?? null, d.phone ?? null, d.email ?? null, d.adres ?? null, d.country ?? null, d.city ?? null, d.ilce ?? null, d.note ?? null, toIntTriState(d.bayiMi), toInt(d.anlasmaliServisMi), d.deletedAt ?? null);
  }

  if (Array.isArray(data.stock) && !skip.has("stock")) {
    conn.prepare(`DELETE FROM stock`).run();
    const stmt = conn.prepare(`INSERT INTO stock (id, model, serialNo, addedDate, note, parcalar, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const s of data.stock) stmt.run(s.id, s.model ?? null, s.serialNo ?? null, s.addedDate ?? null, s.note ?? null, json(s.parcalar ?? []), s.deletedAt ?? null);
  }

  if (Array.isArray(data.notes) && !skip.has("notes")) {
    conn.prepare(`DELETE FROM notes`).run();
    const stmt = conn.prepare(`INSERT INTO notes (id, content, updatedAt, olusturan, deletedAt) VALUES (?, ?, ?, ?, ?)`);
    for (const n of data.notes) stmt.run(n.id, n.content ?? null, n.updatedAt ?? null, n.olusturan ?? null, n.deletedAt ?? null);
  }

  if (Array.isArray(data.parts) && !skip.has("parts")) {
    conn.prepare(`DELETE FROM parts`).run();
    const stmt = conn.prepare(`INSERT INTO parts (id, ad, adEN, kod, tanim, tanimEN, fiyatTRY, fiyatUSD, fiyatEUR, models, deletedAt, tip, resim) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const p of data.parts) stmt.run(p.id, p.ad ?? null, p.adEN ?? null, p.kod ?? null, p.tanim ?? null, p.tanimEN ?? null, p.fiyatTRY ?? null, p.fiyatUSD ?? null, p.fiyatEUR ?? null, json(p.models ?? []), p.deletedAt ?? null, p.tip ?? "Standart", p.resim ?? null);
  }

  if (Array.isArray(data.partStock) && !skip.has("partStock")) {
    conn.prepare(`DELETE FROM part_stock`).run();
    const stmt = conn.prepare(`INSERT INTO part_stock (id, part_id, miktar, notlar, sonGuncelleme) VALUES (?, ?, ?, ?, ?)`);
    for (const s of data.partStock) stmt.run(s.id, s.partId ?? null, s.miktar ?? 0, s.notlar ?? null, s.sonGuncelleme ?? null);
  }

  if (Array.isArray(data.partStockLog) && !skip.has("partStockLog")) {
    conn.prepare(`DELETE FROM part_stock_log`).run();
    const stmt = conn.prepare(`INSERT INTO part_stock_log (id, part_id, miktar, tip, referans_id, tarih, notlar) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const l of data.partStockLog) stmt.run(l.id, l.partId ?? null, l.miktar ?? 0, l.tip ?? null, l.referansId ?? null, l.tarih ?? null, l.notlar ?? null);
  }

  if (Array.isArray(data.kalipDefs) && !skip.has("kalipDefs")) {
    conn.prepare(`DELETE FROM kalip_defs`).run();
    const stmt = conn.prepare(`INSERT INTO kalip_defs (id, ad, deletedAt, kod, urunAdi, urunAdiEN, tanim, tanimEN, resim) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const k of data.kalipDefs) stmt.run(k.id, k.ad ?? null, k.deletedAt ?? null, k.kod ?? null, k.urunAdi ?? null, k.urunAdiEN ?? null, k.tanim ?? null, k.tanimEN ?? null, k.resim ?? null);
  }

  if (Array.isArray(data.standardModels) && !skip.has("standardModels")) {
    conn.prepare(`DELETE FROM standard_models`).run();
    const stmt = conn.prepare(`INSERT INTO standard_models (model, sogutma, kapasite, kalip, kompresor, tanim, tanimEN, defaultParcalar, defaultBantlar, urunAdi, urunAdiEN, resim) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const m of data.standardModels) stmt.run(m.model, m.sogutma ?? null, m.kapasite ?? null, m.kalip ?? null, m["kompresör"] ?? null, m.tanim ?? null, m.tanimEN ?? null, json(m.defaultParcalar ?? []), json(m.defaultBantlar ?? []), m.urunAdi ?? null, m.urunAdiEN ?? null, m.resim ?? null);
  }

  if (Array.isArray(data.customModels) && !skip.has("customModels")) {
    conn.prepare(`DELETE FROM custom_models`).run();
    const stmt = conn.prepare(`INSERT INTO custom_models (model, sogutma, kapasite, kalip, kompresor, deletedAt, tanim, tanimEN, defaultParcalar, defaultBantlar, urunAdi, urunAdiEN, resim) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const m of data.customModels) stmt.run(m.model, m.sogutma ?? null, m.kapasite ?? null, m.kalip ?? null, m["kompresör"] ?? null, m.deletedAt ?? null, m.tanim ?? null, m.tanimEN ?? null, json(m.defaultParcalar ?? []), json(m.defaultBantlar ?? []), m.urunAdi ?? null, m.urunAdiEN ?? null, m.resim ?? null);
  }

  // Parça tipleri: küçük ve şeması esnek (davranış bayrakları) olduğu için kendi tablosu
  // yerine meta'da tek JSON satırı olarak saklanır (soft-delete için deletedAt dahil korunur).
  if (Array.isArray(data.partTypeDefs) && !skip.has("partTypeDefs")) {
    conn.prepare(`INSERT INTO meta (key, value) VALUES ('partTypeDefs', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(JSON.stringify(data.partTypeDefs));
  }

  // Firma çalışanları (servis panosu teknisyen seçici + servis formu). Küçük {id, ad} listesi;
  // partTypeDefs gibi meta'da tek JSON satırı (ayrı tablo/kolon migration gerekmez).
  if (Array.isArray(data.calisanlar) && !skip.has("calisanlar")) {
    conn.prepare(`INSERT INTO meta (key, value) VALUES ('calisanlar', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(JSON.stringify(data.calisanlar));
  }

  if (Array.isArray(data.teklifler) && !skip.has("teklifler")) {
    conn.prepare(`DELETE FROM teklifler`).run();
    const stmt = conn.prepare(`INSERT INTO teklifler (id, type, no, tarih, dil, currency, customer_id, firma, yetkili, tel, vergiNo, vergiDairesi, adres, email, authority, forwarder, satirlar, iskonto, kdvOrani, odemeSekli, teslimSekli, teslimSuresi, teslimTarihi, notField, ek, teklifGecerlilik, kur, kurRate, teslimYeri, gtipNo, durum, createdAt, deletedAt, parentTeklifId, satisTamam, tur, country, city, modelYiliDegeri, customFieldValues, takipKapali) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const t of data.teklifler) {
      stmt.run(t.id, t.type ?? null, t.no ?? null, t.tarih ?? null, t.dil ?? null, t.currency ?? null, t.customerId ?? null, t.firma ?? null, t.yetkili ?? null, t.tel ?? null, t.vergiNo ?? null, t.vergiDairesi ?? null, t.adres ?? null, t.email ?? null, t.authority ?? null, t.forwarder ?? null, json(t.satirlar ?? []), t.iskonto ?? null, t.kdvOrani ?? null, t.odemeSekli ?? null, t.teslimSekli ?? null, t.teslimSuresi ?? null, t.teslimTarihi ?? null, t.not ?? null, t.ek ?? null, t.teklifGecerlilik ?? null, t.kur ?? null, t.kurRate ?? null, t.teslimYeri ?? null, t.gtipNo ?? null, t.durum ?? null, t.createdAt ?? null, t.deletedAt ?? null, t.parentTeklifId ?? null, toIntTriState(t.satisTamam), t.tur ?? null, t.country ?? null, t.city ?? null, t.modelYiliDegeri ?? null, json(t.customFieldValues ?? {}), toInt(t.takipKapali));
    }
  }

  if (data.factory && !skip.has("factory")) {
    conn.prepare(`DELETE FROM factory`).run();
    const f = data.factory;
    conn.prepare(`INSERT INTO factory (id, name, contact, phone, email, adres, country, city, ilce, note, bankaAdi, hesapAdi, swift, ibanTL, ibanEUR, ibanUSD, gtipNo, bankalar, evrakFirmaAdi, web, faturaFirmaAdi, haritaKonum) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(f.name ?? null, f.contact ?? null, f.phone ?? null, f.email ?? null, f.adres ?? null, f.country ?? null, f.city ?? null, f.ilce ?? null, f.note ?? null,
           f.bankaAdi ?? null, f.hesapAdi ?? null, f.swift ?? null, f.ibanTL ?? null, f.ibanEUR ?? null, f.ibanUSD ?? null, f.gtipNo ?? null,
           Array.isArray(f.bankalar) ? json(f.bankalar) : null, f.evrakFirmaAdi ?? null, f.web ?? null, f.faturaFirmaAdi ?? null,
           f.haritaKonum ? json(f.haritaKonum) : null);
  }

  if (data.appSettings && !skip.has("appSettings")) {
    conn.prepare(`DELETE FROM app_settings`).run();
    const s = data.appSettings;
    conn.prepare(`INSERT INTO app_settings (id, autoBackup, backupFolder, frequency, lastBackup, kdvRate, kdvRates, kaseResmi, pinnedPartIds, evrakFormConfig, autoLockMinutes, teklifTakipGun, tahsilatTakipGun, translations, mailTemplates) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(toInt(s.autoBackup), s.backupFolder ?? null, s.frequency ?? null, s.lastBackup ?? null, s.kdvRate ?? null, json(s.kdvRates), s.kaseResmi ?? null, json(s.pinnedPartIds ?? []), json(s.evrakFormConfig ?? null), s.autoLockMinutes ?? null, s.teklifTakipGun ?? null, s.tahsilatTakipGun ?? null, json(s.translations ?? null), json(s.mailTemplates ?? null));
  }

  if (Array.isArray(data.faturalar) && !skip.has("faturalar")) {
    conn.prepare(`DELETE FROM faturalar`).run();
    const stmtF = conn.prepare(`INSERT INTO faturalar (id, no, tarih, firma, adres, ulke, sehir, vatId, localTaxNo, satirlar, currency, kur, origin, payment, delivery, paketAdedi, brutAgirlik, olculer, gtipNo, notField, createdAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const f of data.faturalar) {
      stmtF.run(f.id, f.no ?? null, f.tarih ?? null, f.firma ?? null, f.adres ?? null, f.ulke ?? null, f.sehir ?? null, f.vatId ?? null, f.localTaxNo ?? null, json(f.satirlar ?? []), f.currency ?? null, f.kur ?? null, f.origin ?? null, f.payment ?? null, f.delivery ?? null, f.paketAdedi ?? null, f.brutAgirlik ?? null, f.olculer ?? null, f.gtipNo ?? null, f.not ?? null, f.createdAt ?? null, f.deletedAt ?? null);
    }
  }

  if (Array.isArray(data.uretimFormlari) && !skip.has("uretimFormlari")) {
    conn.prepare(`DELETE FROM uretim_formlari`).run();
    const stmtU = conn.prepare(`INSERT INTO uretim_formlari (id, tarih, baslangicTarihi, bitisTarihi, kapali, notField, createdAt, satirlar, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const u of data.uretimFormlari) {
      const bas = u.baslangicTarihi ?? u.tarih ?? null;
      const bit = u.bitisTarihi ?? u.tarih ?? null;
      stmtU.run(u.id, bas, bas, bit, u.kapali ? 1 : 0, u.not ?? null, u.createdAt ?? null, json(u.satirlar ?? []), u.deletedAt ?? null);
    }
  }

  const nextId = typeof data.nextId === "number"
    ? data.nextId
    : maxIdAcross([data.customers, data.dealers, data.services, data.stock, data.partSales, data.payments, data.kalipDefs, data.partStock, data.partStockLog, data.uretimFormlari]) + 1;
  conn.prepare(`INSERT INTO meta (key, value) VALUES ('nextId', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(String(nextId));
}

function writeFailMarker(err) {
  try {
    fs.writeFileSync(getFailMarkerPath(), JSON.stringify({ at: new Date().toISOString(), error: String(err?.message || err) }, null, 2), "utf-8");
  } catch { /* yoksay */ }
}

// Şema oluşturulduktan sonra (SCHEMA_SQL) sonradan eklenen tüm sütunları ekler.
// SCHEMA_SQL'deki CREATE TABLE'lar zamanla eksik kaldığı için bu ayrı adım şart:
// hem mevcut DB açılışında (migration), hem temiz kurulumda, hem de JSON→SQLite
// geçişinde ÇAĞRILMALI — yoksa temiz kurulan bir bilgisayarda ilk oturumda yeni
// sütunlar (ör. uretim_formlari.baslangicTarihi) olmadan kayıt yazma çöker.
// ensureColumns idempotent (var olan sütunu atlar), tekrar çağrılması zararsız.
function applyColumnMigrations(conn) {
  ensureColumns(conn, "payments", PAYMENTS_NEW_COLUMNS);
  ensureColumns(conn, "dealers", DEALERS_NEW_COLUMNS);
  ensureColumns(conn, "services", SERVICES_NEW_COLUMNS);
  ensureColumns(conn, "services", SERVICES_DIS_FIRMA_COLUMNS);
  ensureColumns(conn, "services", SERVICES_DURUM_COLUMN);
  ensureColumns(conn, "app_settings", APP_SETTINGS_NEW_COLUMNS);
  ensureColumns(conn, "parts", PARTS_NEW_COLUMNS);
  ensureColumns(conn, "parts", PARTS_EXTRA_COLUMNS);
  ensureColumns(conn, "standard_models", MODELS_NEW_COLUMNS);
  ensureColumns(conn, "custom_models", MODELS_NEW_COLUMNS);
  ensureColumns(conn, "standard_models", MODELS_URUN_COLUMNS);
  ensureColumns(conn, "custom_models", MODELS_URUN_COLUMNS);
  ensureColumns(conn, "standard_models", MODELS_RESIM_COLUMN);
  ensureColumns(conn, "custom_models", MODELS_RESIM_COLUMN);
  ensureColumns(conn, "standard_models", MODELS_BANTLAR_COLUMN);
  ensureColumns(conn, "custom_models", MODELS_BANTLAR_COLUMN);
  ensureColumns(conn, "kalip_defs", KALIP_DEFS_NEW_COLUMNS);
  ensureColumns(conn, "kalip_defs", KALIP_DEFS_RESIM_COLUMN);
  ensureColumns(conn, "teklifler", TEKLIFLER_NEW_COLUMNS);
  ensureColumns(conn, "teklifler", TEKLIFLER_CONVERT_COLUMNS);
  ensureColumns(conn, "teklifler", TEKLIFLER_TAKIP_COLUMN);
  ensureColumns(conn, "customers", CUSTOMERS_FROM_TEKLIF_COLUMN);
  ensureColumns(conn, "customers", CUSTOMERS_ODEME_PLANI_COLUMN);
  ensureColumns(conn, "customers", CUSTOMERS_BRUT_KG_COLUMN);
  ensureColumns(conn, "part_sales", PART_SALES_TEKLIF_URETIM_COLUMNS);
  ensureColumns(conn, "part_sales", PART_SALES_SATIS_FIRMA_COLUMNS);
  ensureColumns(conn, "customer_kaliplar", KALIPLAR_URETIM_COLUMNS);
  ensureColumns(conn, "customers", CUSTOMERS_BANTLAR_COLUMN);
  ensureColumns(conn, "customers", CUSTOMERS_PART_SECIMLERI_COLUMNS);
  ensureColumns(conn, "customers", CUSTOMERS_TIP_SECIMLERI_COLUMN);
  ensureColumns(conn, "customers", ILCE_COLUMN);
  ensureColumns(conn, "dealers", ILCE_COLUMN);
  ensureColumns(conn, "factory", ILCE_COLUMN);
  ensureColumns(conn, "customers", CUSTOMERS_SOURCE_STOCK_COLUMN);
  ensureColumns(conn, "parts", PARTS_TIP_RESIM_COLUMNS);
  ensureColumns(conn, "app_settings", APP_SETTINGS_KASE_COLUMN);
  ensureColumns(conn, "app_settings", APP_SETTINGS_PINNED_COLUMN);
  ensureColumns(conn, "app_settings", APP_SETTINGS_EVRAK_COLUMN);
  ensureColumns(conn, "app_settings", APP_SETTINGS_AUTOLOCK_COLUMN);
  ensureColumns(conn, "app_settings", APP_SETTINGS_TAKIP_COLUMNS);
  ensureColumns(conn, "app_settings", APP_SETTINGS_JSON_COLUMNS);
  ensureColumns(conn, "factory", FACTORY_NEW_COLUMNS);
  ensureColumns(conn, "stock", STOCK_NEW_COLUMNS);
  for (const table of TABLES_WITH_TRASH) ensureColumns(conn, table, DELETED_AT_COLUMN);
  ensureColumns(conn, "users", USERS_PERMISSIONS_COLUMN);
  ensureColumns(conn, "users", USERS_TOKEN_VERSION_COLUMN);
  ensureColumns(conn, "users", USERS_TOTP_COLUMNS);
  ensureColumns(conn, "uretim_formlari", URETIM_FORMLARI_DONEM_COLUMNS);
  ensureColumns(conn, "uretim_formlari", URETIM_FORMLARI_KAPALI_COLUMN);
  ensureColumns(conn, "dosyalar", DOSYALAR_DEALER_COLUMN);
  ensureColumns(conn, "notes", NOTES_OLUSTURAN_COLUMN);
}

function migrateFromJsonIfNeeded() {
  if (!Database) return; // native modül yüklenemedi, eski JSON modunda kal

  const dbPath = getDbPath();
  if (fs.existsSync(dbPath)) {
    try {
      ensureEncrypted(dbPath); // düz (eski) DB ise yerinde şifrele; zaten şifreliyse dokunmaz
      db = openDb(dbPath);     // anahtar varsa PRAGMA key ile açar
      db.pragma("journal_mode = WAL");
      db.pragma("foreign_keys = ON");
      // Sonradan eklenen yeni tabloları oluşturur (CREATE TABLE IF NOT EXISTS idempotent — var olanları bozmaz).
      db.exec(SCHEMA_SQL);
      applyColumnMigrations(db);
      pruneAuditLog(db);
      pruneSecurityLog(db);
      active = true;
      // Şifreli DB sağlıkla açıldı → migration'ın bıraktığı DÜZ yedeği sil (at-rest sızmasın).
      // Yalnız bu açılış başarısız olursa (crash) yedek kalır ve bir sonraki denemede kurtarır.
      try { fs.rmSync(dbPath + ".pre-encrypt.bak", { force: true }); } catch { /* yoktu */ }
    } catch (err) {
      console.error("SQLite açılamadı, JSON moduna geçiliyor:", err);
      try { db?.close(); } catch { /* yoksay */ }
      db = null;
      active = false;
    }
    return;
  }

  if (fs.existsSync(getFailMarkerPath())) return; // bilinen-bozuk girdi, eski JSON modunda kal

  const jsonPath = getJsonPath();
  if (!fs.existsSync(jsonPath)) {
    // Temiz kurulum: boş şema oluştur + sonradan eklenen sütunları da uygula
    // (yoksa ilk oturumda yeni sütunlar eksik kalır, kayıt yazma çöker).
    const conn = openDb(dbPath); // yeni dosya anahtar varsa şifreli oluşturulur
    conn.pragma("foreign_keys = ON");
    conn.exec(SCHEMA_SQL);
    applyColumnMigrations(conn);
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
    conn = openDb(tmpPath); // yeni dosya anahtar varsa şifreli oluşturulur
    conn.pragma("journal_mode = WAL");
    conn.exec(SCHEMA_SQL);
    applyColumnMigrations(conn); // populateAll yeni sütunlara yazdığı için geçişten ÖNCE şart
    conn.transaction(() => populateAll(conn, parsed))();
    conn.close();

    fs.renameSync(tmpPath, dbPath);
    fs.renameSync(jsonPath, getMigratedBackupPath());

    db = openDb(dbPath);
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

// Bağlantıyı kapat (temiz kapanış / test için). Sonraki migrateFromJsonIfNeeded yeniden açar.
function close() { try { db?.close(); } catch { /* zaten kapalı */ } db = null; active = false; }

// Güvenlik Durumu paneli için: veritabanı at-rest şifreli mi?
// encrypted: bu oturumda DB gerçekten şifreli açıldı mı. canEncrypt: ortam şifrelemeye elverişli mi
// (şifreli-yetenekli build + güvenli anahtar deposu). safeStorage yoksa şifreleme kullanılamaz.
function dbEncryptionStatus() {
  let safe = false;
  try { safe = !!safeStorage?.isEncryptionAvailable?.(); } catch { safe = false; }
  return {
    encrypted: !!(active && dbEncryptable && getDbKey()),
    canEncrypt: !!(dbEncryptable && safe),
  };
}

function readBlobFromDb() {
  // Tüm kaliplar tek sorguda çekilip customer_id'ye göre JS'te gruplanır — müşteri sayısı
  // büyüdükçe müşteri-başına ayrı sorgu (N+1) yerine sabit sayıda sorgu kullanmak için.
  const kaliplarByCustomer = new Map();
  for (const k of db.prepare(`SELECT * FROM customer_kaliplar ORDER BY customer_id, sort_order`).all()) {
    const item = { ad: k.ad, olcu: k.olcu };
    if (k.fiyat !== null && k.fiyat !== undefined) item.fiyat = k.fiyat;
    if (k.part_sale_id !== null && k.part_sale_id !== undefined) item.partSaleId = k.part_sale_id;
    if (k.uretimFormGonder) item.uretimFormGonder = true;
    if (k.uretimFormId !== null && k.uretimFormId !== undefined) item.uretimFormId = k.uretimFormId;
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
    odemePlani: parseJsonCol(c.odemePlani, []),
    tipSecimleri: parseJsonCol(c.tipSecimleri, {}),
  }));

  const dealers = db.prepare(`SELECT * FROM dealers`).all().map((d) => ({
    ...d,
    bayiMi: toBoolTriState(d.bayiMi),
    anlasmaliServisMi: toBool(d.anlasmaliServisMi),
  }));

  const services = db.prepare(`SELECT * FROM services`).all().map((row) => {
    const { customer_id, degisenParcalar, odendi, parcaUcretsizMi, parcaGarantiDisi, parcaAltuntastanMi, panoGizli, ...rest } = row;
    return {
      ...rest,
      customerId: customer_id,
      degisenParcalar: parseJsonCol(degisenParcalar, []),
      odendi: toBool(odendi),
      parcaUcretsizMi: toBool(parcaUcretsizMi),
      parcaGarantiDisi: toBool(parcaGarantiDisi),
      parcaAltuntastanMi: toBoolTriState(parcaAltuntastanMi),
      panoGizli: toBool(panoGizli),
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
    const { customer_id, odendi, ucretsizMi, uretimFormGonder, ...rest } = row;
    return { ...rest, customerId: customer_id, odendi: toBool(odendi), ucretsizMi: toBool(ucretsizMi), uretimFormGonder: toBool(uretimFormGonder) };
  });

  const payments = db.prepare(`SELECT * FROM payments`).all().map((row) => {
    const { customer_id, note, tahsilEdildi, ...rest } = row;
    // tahsilEdildi sadece Çek ödemelerinde anlamlı; SQLite'tan 0/1/null gelir, isPaymentReceived/
    // isCekVadesiGecmis === true ile kıyasladığı için gerçek boolean'a çevrilmesi gerekiyor.
    return { ...rest, customerId: customer_id, not: note, ...(rest.yontem === "Çek" ? { tahsilEdildi: toBool(tahsilEdildi) } : {}) };
  });

  const gorusmeler = db.prepare(`SELECT * FROM gorusmeler`).all().map((row) => {
    const { customer_id, notField, tamamlandi, ...rest } = row;
    return { ...rest, customerId: customer_id, not: notField, tamamlandi: toBool(tamamlandi) };
  });

  const dosyalar = db.prepare(`SELECT * FROM dosyalar`).all().map((row) => {
    const { customer_id, dealer_id, ...rest } = row;
    const kunye = { ...rest, customerId: customer_id };
    if (dealer_id != null) kunye.dealerId = dealer_id;
    return kunye;
  });

  const kalipDefs = db.prepare(`SELECT * FROM kalip_defs`).all();

  const teklifler = db.prepare(`SELECT * FROM teklifler`).all().map((t) => ({
    ...t,
    customerId: t.customer_id,
    satirlar: parseJsonCol(t.satirlar, []),
    not: t.notField,
    // NULL (hiç işaretlenmemiş) ile false (açıkça işaretlenmiş) ayrımı korunur —
    // Documents.jsx satisTamam === undefined kontrolüne dayanıyor
    satisTamam: toBoolTriState(t.satisTamam),
    customFieldValues: parseJsonCol(t.customFieldValues, {}),
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
      haritaKonum: parseJsonCol(rest.haritaKonum, null),
      evrakFirmaAdi: rest.evrakFirmaAdi ?? "",
      faturaFirmaAdi: rest.faturaFirmaAdi ?? "",
    };
  }

  const settingsRow = db.prepare(`SELECT * FROM app_settings WHERE id = 1`).get();
  let appSettings = null;
  if (settingsRow) {
    const { id, autoBackup, kdvRates, pinnedPartIds, evrakFormConfig, translations, mailTemplates, ...rest } = settingsRow;
    appSettings = { ...rest, autoBackup: toBool(autoBackup), kdvRates: parseJsonCol(kdvRates, undefined), pinnedPartIds: parseJsonCol(pinnedPartIds, []), evrakFormConfig: parseJsonCol(evrakFormConfig, null), translations: parseJsonCol(translations, null), mailTemplates: parseJsonCol(mailTemplates, null) };
  }

  const nextIdRow = db.prepare(`SELECT value FROM meta WHERE key = 'nextId'`).get();
  const nextId = nextIdRow ? Number(nextIdRow.value) : undefined;

  const partTypeDefsRow = db.prepare(`SELECT value FROM meta WHERE key = 'partTypeDefs'`).get();
  const partTypeDefs = partTypeDefsRow ? parseJsonCol(partTypeDefsRow.value, []) : [];

  const calisanlarRow = db.prepare(`SELECT value FROM meta WHERE key = 'calisanlar'`).get();
  const calisanlar = calisanlarRow ? parseJsonCol(calisanlarRow.value, []) : [];

  const faturalar = db.prepare(`SELECT * FROM faturalar`).all().map(({ notField, satirlar, ...rest }) => ({
    ...rest,
    not: notField,
    satirlar: parseJsonCol(satirlar, []),
  }));

  const uretimFormlari = db.prepare(`SELECT * FROM uretim_formlari`).all().map(({ notField, satirlar, baslangicTarihi, bitisTarihi, tarih, kapali, ...rest }) => ({
    ...rest,
    tarih: baslangicTarihi || tarih || null,
    baslangicTarihi: baslangicTarihi || tarih || null,
    bitisTarihi: bitisTarihi || tarih || null,
    kapali: !!kapali,
    not: notField,
    satirlar: parseJsonCol(satirlar, []),
  }));

  return {
    customers, dealers, stock, kalipDefs, partTypeDefs, calisanlar, standardModels, customModels, factory,
    services, notes, parts, partSales, payments, gorusmeler, dosyalar, teklifler, appSettings, nextId,
    partStock, partStockLog, faturalar, uretimFormlari,
  };
}

// Değişmeyen bölümleri yeniden yazmamak için son yazılan içeriğin özeti (süreç belleğinde).
// Her kayıt TÜM tabloları DELETE+INSERT ile baştan yazıyordu; resimli tanım tabloları
// büyüdükçe tek karakterlik düzenleme bile pahalıya mal oluyordu. Süreç yeniden
// başlayınca önbellek boş başlar ve ilk kayıt her bölümü yazar (güvenli taraf).
const lastWrittenHash = new Map();
// Tek kaynak: electron/serverAuth.cjs (sunucu yetki denetimi de aynı listeyi kullanır)
const { BLOB_SECTIONS } = require("./serverAuth.cjs");

function writeBlobToDb(data) {
  const skip = new Set();
  const pendingHashes = new Map();
  for (const key of BLOB_SECTIONS) {
    if (data[key] === undefined) continue;
    const h = crypto.createHash("md5").update(JSON.stringify(data[key])).digest("hex");
    if (lastWrittenHash.get(key) === h) skip.add(key);
    else pendingHashes.set(key, h);
  }
  // customers bloğu FK zinciri gereği services/part_sales/payments tablolarını da siler;
  // customers yeniden yazılacaksa bu üçü atlanamaz (yoksa silinip geri yazılmazlar)
  if (!skip.has("customers")) { skip.delete("services"); skip.delete("partSales"); skip.delete("payments"); skip.delete("gorusmeler"); skip.delete("dosyalar"); }
  db.transaction(() => populateAll(db, data, skip))();
  // Özetler yalnızca transaction başarıyla bittikten sonra kesinleşir — hata/rollback
  // durumunda bir sonraki kayıt bölümü yeniden yazar
  for (const [key, h] of pendingHashes) lastWrittenHash.set(key, h);
}

// ── Meta yardımcıları ──────────────────────────────────────────────────────────
function getMetaValue(key) {
  if (!db) return null;
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key);
  return row ? row.value : null;
}
function setMetaValue(key, value) {
  if (!db) return;
  db.prepare("INSERT INTO meta (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, String(value));
}

// ── Hız sınırı sayaçları (kalıcı, login brute-force için) ────────────────────
function getRateBucket(bucket) {
  if (!db) return null;
  return db.prepare("SELECT bucket, count, reset_at FROM rate_limit WHERE bucket = ?").get(bucket) || null;
}
function setRateBucket(bucket, count, resetAt) {
  if (!db) return;
  db.prepare("INSERT INTO rate_limit (bucket,count,reset_at) VALUES (?,?,?) ON CONFLICT(bucket) DO UPDATE SET count=excluded.count, reset_at=excluded.reset_at").run(bucket, count, resetAt);
}
function deleteRateBucket(bucket) {
  if (!db) return;
  db.prepare("DELETE FROM rate_limit WHERE bucket = ?").run(bucket);
}
function pruneRateBuckets(now) {
  if (!db) return;
  db.prepare("DELETE FROM rate_limit WHERE reset_at < ?").run(now);
}
function getDataVersion() {
  const v = getMetaValue("dataVersion");
  return v ? parseInt(v) : 0;
}
function bumpDataVersion() {
  const next = getDataVersion() + 1;
  setMetaValue("dataVersion", String(next));
  return next;
}

// ── Kullanıcı CRUD ────────────────────────────────────────────────────────────
function getUserByUsername(username) {
  if (!db) return null;
  return db.prepare("SELECT * FROM users WHERE username = ?").get(username);
}
function getUserById(id) {
  if (!db) return null;
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}
// ── İki adımlı doğrulama (TOTP) ──────────────────────────────────────────────
// Kurulum: secret'ı yaz ama henüz açma (enable=0). enable ile doğrulanınca aç + kurtarma kodları.
function setUserTotpSecret(id, secret) {
  if (!db) return;
  db.prepare("UPDATE users SET totp_secret=?, totp_enabled=0, totp_recovery=NULL, totp_last_code=NULL WHERE id=?").run(secret, id);
}
function enableUserTotp(id, recoveryJson) {
  if (!db) return;
  // token_version artışı: 2FA açılınca DİĞER cihazlardaki mevcut oturumlar (eski jetonlar) düşsün
  // ve 2FA ile yeniden giriş gereksin. Aksi halde 2FA yalnız yeni girişleri korur, açık oturumları değil.
  db.prepare("UPDATE users SET totp_enabled=1, totp_recovery=?, token_version=COALESCE(token_version,1)+1 WHERE id=?").run(recoveryJson, id);
}
function setUserTotpRecovery(id, recoveryJson) {
  if (!db) return;
  db.prepare("UPDATE users SET totp_recovery=? WHERE id=?").run(recoveryJson, id);
}
function setUserTotpLastCode(id, code) {
  if (!db) return;
  db.prepare("UPDATE users SET totp_last_code=? WHERE id=?").run(code, id);
}
function disableUserTotp(id) {
  if (!db) return;
  // token_version artışı: 2FA kapatılınca/sıfırlanınca da mevcut oturumlar düşsün (yeniden giriş gereksin)
  db.prepare("UPDATE users SET totp_secret=NULL, totp_enabled=0, totp_recovery=NULL, totp_last_code=NULL, token_version=COALESCE(token_version,1)+1 WHERE id=?").run(id);
}
// token_version'ı artırır → o kullanıcının tüm mevcut oturumları (eski jetonları) düşer.
// Tek oturum zorlaması (girişte) ve admin "tüm cihazlardan çıkar" için kullanılır. Yeni tv'yi döndürür.
function bumpUserTokenVersion(id) {
  if (!db) return null;
  db.prepare("UPDATE users SET token_version=COALESCE(token_version,1)+1 WHERE id=?").run(id);
  return getUserById(id)?.token_version ?? null;
}
function getAllUsers() {
  if (!db) return [];
  return db.prepare("SELECT id,username,role,is_active,permissions,created_at,totp_enabled FROM users ORDER BY id").all();
}
function createUser(username, hash, role, permissions) {
  if (!db) throw new Error("DB aktif değil");
  const r = db.prepare("INSERT INTO users (username,password,role,is_active,permissions,created_at) VALUES (?,?,?,1,?,?)").run(username, hash, role, permissions ?? null, new Date().toISOString());
  return r.lastInsertRowid;
}
function updateUser(id, fields) {
  if (!db) return;
  const parts = [], vals = [];
  if (fields.is_active !== undefined)  { parts.push("is_active=?");   vals.push(fields.is_active ? 1 : 0); }
  // Rol değişiminde de token_version artar: yoksa admin'likten düşürülen kullanıcının elindeki
  // eski jeton role:"admin" taşımaya devam ederdi ve jetonun doğal ömrü (30 gün) boyunca
  // yönetici kalırdı (kullanıcı ekleme/silme, denetim kaydı temizleme). Şifre dalıyla aynı mantık.
  if (fields.role)                     { parts.push("role=?");         vals.push(fields.role); parts.push("token_version=COALESCE(token_version,1)+1"); }
  if (fields.password) {
    parts.push("password=?");
    vals.push(fields.password);
    // Şifre değişince mevcut oturumlar düşsün: requireAuth token'daki tv ile karşılaştırır
    parts.push("token_version=COALESCE(token_version,1)+1");
  }
  if (fields.permissions !== undefined){ parts.push("permissions=?");  vals.push(fields.permissions); }
  if (!parts.length) return;
  db.prepare(`UPDATE users SET ${parts.join(",")} WHERE id=?`).run(...vals, id);
}
function deleteUser(id) {
  if (!db) return;
  db.prepare("DELETE FROM users WHERE id=?").run(id);
}
function hasAnyUser() {
  if (!db) return false;
  return db.prepare("SELECT COUNT(*) as c FROM users").get().c > 0;
}

// ── Kayıt kilitleme ───────────────────────────────────────────────────────────
const LOCK_TTL_MS = 2 * 60 * 1000; // 2 dakika

function cleanExpiredLocks() {
  if (!db) return;
  db.prepare("DELETE FROM locks WHERE expires_at < ?").run(new Date().toISOString());
}

function acquireLock(entityType, entityId, username, force = false) {
  if (!db) return { ok: true };
  cleanExpiredLocks();
  const existing = db.prepare("SELECT * FROM locks WHERE entity_type=? AND entity_id=?").get(entityType, String(entityId));
  if (existing && !force && existing.locked_by !== username) {
    return { error: "locked", lockedBy: existing.locked_by, lockedAt: existing.locked_at };
  }
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + LOCK_TTL_MS).toISOString();
  db.prepare(`INSERT INTO locks (entity_type,entity_id,locked_by,locked_at,expires_at) VALUES (?,?,?,?,?)
    ON CONFLICT(entity_type,entity_id) DO UPDATE SET locked_by=excluded.locked_by,locked_at=excluded.locked_at,expires_at=excluded.expires_at`)
    .run(entityType, String(entityId), username, now, expiresAt);
  return { ok: true };
}

function releaseLock(entityType, entityId, username) {
  if (!db) return;
  db.prepare("DELETE FROM locks WHERE entity_type=? AND entity_id=? AND locked_by=?")
    .run(entityType, String(entityId), username);
}

function listLocks() {
  if (!db) return [];
  cleanExpiredLocks();
  return db.prepare("SELECT * FROM locks ORDER BY locked_at").all();
}

function releaseAllLocksByUser(username) {
  if (!db) return;
  db.prepare("DELETE FROM locks WHERE locked_by=?").run(username);
}

function writeAuditEntry({ ts, username, role, action, entity, entity_id, entity_name, detail } = {}) {
  if (!db) return;
  db.prepare(`INSERT INTO audit_log (ts, username, role, action, entity, entity_id, entity_name, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(ts || new Date().toISOString(), username || "yerel", role || null, action || "", entity || "", entity_id ?? null, entity_name || null, detail || null);
}

// İşlem geçmişi otomatik temizliği: retention süresinden eski kayıtlar açılışta silinir —
// tablo sınırsız büyüyüp veritabanı dosyasını şişirmesin (çöp kutusundaki purgeOldTrash
// deseninin audit karşılığı). ts ISO-8601 saklandığı için string karşılaştırması yeterli.
const AUDIT_RETENTION_MONTHS = 12;
function pruneAuditLog(conn) {
  try {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - AUDIT_RETENTION_MONTHS);
    conn.prepare(`DELETE FROM audit_log WHERE ts < ?`).run(cutoff.toISOString());
  } catch (err) { console.error("audit_log temizliği başarısız:", err); }
}

// İşlem geçmişini tamamen temizler (sadece admin çağırır); silinen satır sayısını döndürür
function clearAuditLog() {
  if (!db) return 0;
  return db.prepare(`DELETE FROM audit_log`).run().changes;
}

// ── Kullanıcı/güvenlik geçmişi (security_log) ────────────────────────────────
// Giriş denemeleri (başarılı/başarısız), kullanıcı yönetimi, 2FA ve uygulama
// kilidi olayları. audit_log'dan (veri CRUD'u) bilinçli olarak ayrı tutulur.
function writeSecurityEntry({ ts, actor, action, target, ip, detail } = {}) {
  if (!db) return;
  db.prepare(`INSERT INTO security_log (ts, actor, action, target, ip, detail) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(ts || new Date().toISOString(), actor || null, action || "", target || null, ip || null, detail || null);
}

function pruneSecurityLog(conn) {
  try {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - AUDIT_RETENTION_MONTHS);
    conn.prepare(`DELETE FROM security_log WHERE ts < ?`).run(cutoff.toISOString());
  } catch (err) { console.error("security_log temizliği başarısız:", err); }
}

function clearSecurityLog() {
  if (!db) return 0;
  return db.prepare(`DELETE FROM security_log`).run().changes;
}

function getSecurityLog({ limit = 100, offset = 0, actor, action, dateFrom, dateTo, q } = {}) {
  if (!db) return { rows: [], total: 0 };
  let where = "WHERE 1=1";
  const params = [];
  if (actor)  { where += " AND actor = ?";  params.push(actor); }
  if (action) { where += " AND action = ?"; params.push(action); }
  if (q) { // genel arama: yapan, hedef, IP, detay ve eylemde geçen metin
    where += " AND (actor LIKE ? OR target LIKE ? OR ip LIKE ? OR detail LIKE ? OR action LIKE ?)";
    const pat = `%${String(q).trim()}%`;
    params.push(pat, pat, pat, pat, pat);
  }
  if (dateFrom) { where += " AND ts >= ?"; params.push(dateFrom); }
  if (dateTo)   { where += " AND ts <= ?"; params.push(dateTo + "T23:59:59Z"); }
  const rows = db.prepare(`SELECT * FROM security_log ${where} ORDER BY ts DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM security_log ${where}`).get(...params)?.cnt ?? 0;
  return { rows, total };
}

function getAuditLog({ limit = 100, offset = 0, username, entity, dateFrom, dateTo, q } = {}) {
  if (!db) return { rows: [], total: 0 };
  let where = "WHERE 1=1";
  const params = [];
  if (username) { where += " AND username = ?"; params.push(username); }
  if (entity)   { where += " AND entity = ?";   params.push(entity); }
  if (q) { // genel arama: kayıt adı, kullanıcı, detay, eylem ve bölümde geçen metin
    where += " AND (entity_name LIKE ? OR username LIKE ? OR detail LIKE ? OR action LIKE ? OR entity LIKE ?)";
    const pat = `%${String(q).trim()}%`;
    params.push(pat, pat, pat, pat, pat);
  }
  if (dateFrom) { where += " AND ts >= ?";       params.push(dateFrom); }
  if (dateTo)   { where += " AND ts <= ?";       params.push(dateTo + "T23:59:59Z"); }
  const rows = db.prepare(`SELECT * FROM audit_log ${where} ORDER BY ts DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM audit_log ${where}`).get(...params)?.cnt ?? 0;
  return { rows, total };
}

module.exports = {
  migrateFromJsonIfNeeded, isActive, close, dbEncryptionStatus, readBlobFromDb, writeBlobToDb, getDbPath, getJsonPath,
  getMetaValue, setMetaValue, getDataVersion, bumpDataVersion,
  getRateBucket, setRateBucket, deleteRateBucket, pruneRateBuckets,
  getUserByUsername, getUserById, getAllUsers, createUser, updateUser, deleteUser, hasAnyUser,
  setUserTotpSecret, enableUserTotp, setUserTotpRecovery, setUserTotpLastCode, disableUserTotp, bumpUserTokenVersion,
  acquireLock, releaseLock, listLocks, releaseAllLocksByUser,
  writeAuditEntry, getAuditLog, clearAuditLog,
  writeSecurityEntry, getSecurityLog, clearSecurityLog,
};
