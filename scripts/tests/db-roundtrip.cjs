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

// ── security_log (Kullanıcı Geçmişi): yaz/oku, filtre, temizle ────────────────
dbmod.writeSecurityEntry({ ts: new Date().toISOString(), actor: "kerem", action: "giris_basarili", ip: "192.168.1.5", detail: JSON.stringify({ rol: "admin" }) });
dbmod.writeSecurityEntry({ ts: new Date().toISOString(), actor: "deneme", action: "giris_basarisiz", ip: "192.168.1.9", detail: JSON.stringify({ sebep: "Yanlış şifre" }) });
dbmod.writeSecurityEntry({ ts: new Date().toISOString(), actor: "Cihaz: PC1", action: "uygulama_kilidi_basarisiz", detail: JSON.stringify({ sebep: "Yanlış şifre" }) });
check("security_log: 3 kayıt yazıldı", dbmod.getSecurityLog({}).total === 3);
check("security_log: action filtresi", dbmod.getSecurityLog({ action: "giris_basarisiz" }).total === 1);
check("security_log: actor filtresi", dbmod.getSecurityLog({ actor: "kerem" }).total === 1);
check("security_log: q IP ile eşleşir", dbmod.getSecurityLog({ q: "192.168.1.9" }).total === 1);
check("security_log: q sebep ile eşleşir", dbmod.getSecurityLog({ q: "Yanlış şifre" }).total === 2);
check("security_log: temizle 3 satır siler", dbmod.clearSecurityLog() === 3);
check("security_log: temizlik sonrası boş", dbmod.getSecurityLog({}).total === 0);

// ── Tam tur: kritik alanlar ──────────────────────────────────────────────────
dbmod.writeBlobToDb({
  customers: [{ id: 500, name: "Müşteri", model: "AK100_DS", fromTeklifId: 101, brutKg: 850, currency: "USD", satisKuru: 41.2345, uretimTarihi: "2026-03-14", partiId: 95,
    faturali: "Faturalı Yurtiçi", faturaBedeli: 600000,
    odemePlani: [{ id: 1, vadeTarihi: "2026-08-30", tutar: 100000, odemeId: null }],
    tipSecimleri: { konveyor: "9", bant: "8", filtre_1: "5" },
    city: "İstanbul", ilce: "Kadıköy",
    kaliplar: [{ ad: "Hamburger", olcu: "10", uretimFormGonder: true, uretimFormId: 77 }] },
    // Faturalı → Faturasıza çevrilmiş kayıt: uygulama faturaBedeli'ni "" yapar. Kapat/aç sonrası
    // eski bedel GERİ GELMEMELİ (falsy kalmalı).
    { id: 501, name: "Faturasız Müşteri", model: "AK100_DS", faturali: "Faturasız Yurtiçi", faturaBedeli: "", fabrikaSatisBedeli: 500000 }],
  partTypeDefs: [
    { id: "standart", ad: "Standart", renk: "slate", makinaSecici: false, stokDus: false, raporGoster: false, sistem: true },
    { id: "konveyor", ad: "Konveyör Saç", renk: "blu", makinaSecici: true, stokDus: true, raporGoster: false, sistem: true, rol: "konveyor" },
    { id: "bant", ad: "Bant", renk: "grn", makinaSecici: true, stokDus: true, raporGoster: true, sistem: true, rol: "bant" },
    { id: "filtre_1", ad: "Filtre", renk: "amb", makinaSecici: true, stokDus: true, raporGoster: true, sistem: false },
  ],
  services: [{ id: 2, customerId: 500, type: "Garanti İçi", odendi: false, hesapId: 97, durum: "Yapılıyor", tech: "Ahmet Yılmaz", panoGizli: false,
    fabrikaGirisZamani: "2026-07-20T09:15:00", bakimBaslangicZamani: "2026-07-20T11:30:00", bitisZamani: "2026-07-20T14:45:00",
    islemFirma: "Diğer", islemFirmaAd: "Harici Servis Ltd", islemFirmaYetkili: "Ahmet Yılmaz", islemFirmaTel: "05551234567", islemFirmaAdres: "Organize Sanayi 5. Cadde No:12", islemFirmaUlke: "Türkiye", islemFirmaSehir: "Bursa" },
    { id: 3, customerId: 500, type: "Periyodik Bakım", odendi: true, durum: "Tamamlandı", tech: "Mehmet Demir", panoGizli: true,
      // Servise ödeme yöntemi: kredi kartı + taksit komisyonu snapshot (satış tarafıyla aynı alanlar).
      yontem: "Kredi Kartı", taksitSayisi: 3, kartKomisyonu: { taksit: 3, oran: 7.47, toplamKesinti: 1435, blokajGun: 0, hesabaGecis: "2026-07-20", yansitildi: false },
      // Değişen parçalar JSON olarak saklanır (miktar/fiyat dahil); parça ücreti = miktar × fiyat = 18000.
      tahsilatTarihi: "2026-10-05",
      degisenParcalar: [{ partId: "7", ad: "aaaaaa", miktar: 2, fiyat: 9000, disTedarik: false }], parcaUcreti: 18000, parcaCurrency: "TRY", parcaGarantiDisi: true }],
  calisanlar: [{ id: 71, ad: "Ahmet Yılmaz", resmiMaliyet: 39223.13, eldenMaliyet: 15000 }, { id: 72, ad: "Mehmet Demir" }],
  // Gider kaydı (spec 0001): tür (meta JSON), tedarikçi, tekrarlayan tanım (JSON satırlar), kalem (model alt tablosu), standart gider.
  giderTurleri: [{ id: 41, ad: "Fabrika kirası", davranis: "kira" }, { id: 42, ad: "Personel", davranis: "personel" }, { id: 43, ad: "Hammadde", davranis: "normal" },
    { id: 44, ad: "SGK", davranis: "sgk" }], // spec 0074 AC-33: SGK davranışı meta JSON'da
  tedarikciler: [{ id: 51, ad: "Demir Bant San.", yetkili: "Serkan", telefon: "0332", eposta: "a@b.c", vergiDairesi: "Selçuk", vergiNo: "123", adres: "OSB", not: "vadeli", deletedAt: "2026-10-01T09:00:00.000Z" }], // spec 0068 R9b: çöpteki tedarikçi
  giderTanimlari: [
    { id: 61, turId: 43, ad: "Sarf", tutar: 12000, kdvOrani: 20, kdvYonu: "dahil", dagitimAy: 12, baslangicAy: "2026-06", bitisAy: null, tedarikciId: 51, odemeYontemi: "Havale",
      atamaTur: "model", modelSatirlari: [{ modelAd: "AK100_DS", birimMaliyet: 600, adet: 20 }], uretilenAylar: ["2026-06", "2026-07"], kapatildi: false, tevkifatli: true, tevkifatPay: 2, tevkifatPayda: 10 }, // spec 0075 AC-34
    { id: 62, turId: 42, ad: "Murat", calisanId: 72, baslangicAy: "2026-06", bitisAy: "2026-08", uretilenAylar: ["2026-06"], kapatildi: true },
  ],
  giderler: [
    { id: 81, tarih: "2026-07-10", turId: 43, aciklama: "Bant 70 adet", tedarikciId: 51, tutar: 140000, kdvOrani: 20, kdvYonu: "dahil", dagitimAy: 12, odemeYontemi: "Çek", sonOdemeTarihi: "2026-08-15", odendi: false, odemeTarihi: null,
      atamaTur: "model", modelSatirlari: [{ modelAd: "AK120_DSC", birimMaliyet: 3000, adet: 30 }, { modelAd: "AK100_DS", birimMaliyet: 1000, adet: 20 }], tanimId: null, donem: null },
    { id: 82, tarih: "2026-07-01", turId: 41, aciklama: "Kira", tutar: 20000, netTutar: 16000, girisYonu: "net", kdvYonu: "haric", stopajOrani: 20, kdvOrani: 20, odendi: true, odemeTarihi: "2026-07-05", tanimId: 61, donem: "2026-07", atamaTur: "", modelSatirlari: [],
      // Spec 0021: iki ödeme hedefi, stopaj taksitli; kimlikli alt satırlar.
      taksitler: [{ id: 9001, hedef: "ana", sira: 1, vade: "2026-07-05", tutar: 20000, odendi: true, odemeTarihi: "2026-07-05" },
        { id: 9002, hedef: "stopaj", sira: 1, vade: "2026-08-26", tutar: 2000, odendi: true, odemeTarihi: "2026-08-20" },
        { id: 9003, hedef: "stopaj", sira: 2, vade: "2026-09-26", tutar: 2000, odendi: false, odemeTarihi: null }] },
    { id: 83, tarih: "2026-07-01", turId: 42, calisanId: 71, calisanAd: "Ahmet Yılmaz", resmiTutar: 39223.13, eldenTutar: 15000, tutar: null, kdvOrani: 0, odendi: false, atamaTur: "", modelSatirlari: [], deletedAt: "2026-07-20T10:00:00.000Z",
      // Spec 0023: ek ödemeler (aynı türden iki satır), kimliksiz.
      ekOdemeler: [{ tur: "fazlaCalisma", aciklama: "Temmuz yoğunluğu", resmiTutar: 4000, eldenTutar: 1000 }, { tur: "prim", aciklama: "Teslim", resmiTutar: null, eldenTutar: 2500 }, { tur: "prim", aciklama: "", resmiTutar: 700, eldenTutar: null }],
      // Spec 0042: personelin iki ödeme hedefi (resmi = ana, elden); elden vadesi satırda (yeni sütun yok).
      taksitler: [{ id: 9011, hedef: "ana", sira: 1, vade: "2026-07-31", tutar: 43923.13, odendi: false, odemeTarihi: null },
        { id: 9012, hedef: "elden", sira: 1, vade: "2026-07-28", tutar: 18500, odendi: false, odemeTarihi: null }] },
    // Spec 0054 AC-21: ek ödemenin iki ayrı hedefi (ekResmi, ekElden) taksit satırında; yeni sütun yok.
    { id: 85, tarih: "2026-08-01", turId: 42, calisanId: 71, calisanAd: "Ahmet Yılmaz", resmiTutar: 30000, eldenTutar: 20000, tutar: null, kdvOrani: 0, odendi: false, atamaTur: "", modelSatirlari: [],
      ekOdemeler: [{ tur: "prim", aciklama: "Ağustos", resmiTutar: 5000, eldenTutar: 4500 }],
      taksitler: [{ id: 9021, hedef: "ana", sira: 1, vade: "2026-08-31", tutar: 30000, odendi: false, odemeTarihi: null },
        { id: 9022, hedef: "elden", sira: 1, vade: "2026-08-28", tutar: 20000, odendi: false, odemeTarihi: null },
        { id: 9023, hedef: "ekResmi", sira: 1, vade: "2026-08-31", tutar: 5000, odendi: false, odemeTarihi: null },
        { id: 9024, hedef: "ekElden", sira: 1, vade: "2026-08-31", tutar: 4500, odendi: false, odemeTarihi: null }] },
    // Spec 0070 R20 (Q2): SGK ve yol parası sütunları; SGK hedefi satırı vadesiyle (sgkVade sütunu yok).
    { id: 86, tarih: "2026-09-01", turId: 42, calisanId: 71, calisanAd: "Ahmet Yılmaz", resmiTutar: 30000, eldenTutar: null, sgkTutar: 9000.5, yolParasi: 1500, tutar: null, kdvOrani: 0, odendi: false, atamaTur: "", modelSatirlari: [],
      taksitler: [{ id: 9031, hedef: "ana", sira: 1, vade: "2026-09-30", tutar: 31500, odendi: false, odemeTarihi: null },
        { id: 9025, hedef: "sgk", sira: 1, vade: "2026-09-15", tutar: 9000.5, odendi: false, odemeTarihi: null }] },
    // Spec 0074 AC-33: SGK davranışlı kalem tek tutar, KDV'siz, tedarikçisiz; bugünkü sütunlarla roundtrip eder.
    { id: 87, tarih: "2026-09-30", turId: 44, aciklama: "Eylül SGK", tutar: 9333.25, kdvOrani: 0, kdvYonu: null, tedarikciId: null, odendi: false, atamaTur: "", modelSatirlari: [], sonOdemeTarihi: "2026-10-31" },
    // Spec 0075 AC-34, AC-35: tevkifatlı kalem (üç sütun) ve hedefi "tevkifat" olan taksit satırı.
    { id: 84, tarih: "2026-07-03", turId: 43, aciklama: "Makina nakliye", tutar: 6500, kdvOrani: 20, odendi: false, atamaTur: "makina", makinaTur: "stok", makinaId: 4, modelSatirlari: [],
      tevkifatli: true, tevkifatPay: 2, tevkifatPayda: 10,
      taksitler: [{ id: 9041, hedef: "ana", sira: 1, vade: "2026-07-31", tutar: 7540, odendi: false, odemeTarihi: null }, { id: 9042, hedef: "tevkifat", sira: 1, vade: "2026-08-26", tutar: 260, odendi: false, odemeTarihi: null }] },
  ],
  // Spec 0024 A: kasa hesapları ve hareketler.
  kasaHesaplari: [{ id: 97, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000.5, acilisTarihi: "2026-01-01", kapali: false },
    { id: 98, ad: "Kart", tur: "kart", paraBirimi: "TRY", acilisBakiyesi: -2000, acilisTarihi: null, kapali: true }],
  hesapHareketleri: [{ id: 971, tur: "odeme", tarih: "2026-07-05", tutar: 1234.56, yontem: "Havale", hesapId: 97, karsiHesapId: null, giderId: 81, taksitId: null, tamKapatir: false, kaynak: null, gocKaynak: null, aciklama: "kısmi" },
    { id: 972, tur: "virman", tarih: "2026-07-06", tutar: 500, hesapId: 97, karsiHesapId: 98, aciklama: "" },
    { id: 973, tur: "odeme", tarih: "2026-07-07", tutar: null, giderId: 82, taksitId: 9002, tamKapatir: true, kaynak: "goc", gocKaynak: "taksit:82:9002" },
    { id: 974, tur: "avans", tarih: "2026-07-08", tutar: 3000, calisanId: 55, hesapId: null },
    { id: 975, tur: "mahsup", tarih: "2026-07-09", tutar: 1000, calisanId: 55, giderId: 81, taksitId: null },
    { id: 976, tur: "odeme", tarih: "2026-07-10", tutar: 500, giderId: 81, yontem: "Çek (ciro)", hesapId: null, cekId: 991 }],
  // Spec 0058: kasa iş listesinden kapsam dışı bırakılanlar (tahsilat ve hareket girişi).
  kasaKapsamDisi: [{ id: 9581, tur: "tahsilat", kaynak: "servis", kayitId: 4242, zaman: "2026-10-01T10:00:00.000Z" },
    { id: 9582, tur: "hareket", kaynak: null, kayitId: 976, zaman: "2026-10-01T10:05:00.000Z" }],
  // Spec 0040: çek kaydı (yalnız kendi alanları, geçmiş JSON).
  cekler: [{ id: 991, paymentId: 900, no: "123456", banka: "Ziraat", kesideci: "Ali Veli", tur: "resmi", durum: "ciro",
    gecmis: [{ tarih: "2026-07-01", durum: "portfoy", not: "Alındı" }, { tarih: "2026-07-10", durum: "ciro", not: "Ciro: Demir Bant" }] },
    // Spec 0049: bağsız alınan çek (kendi tutar/para birimi/vade/kimden) ve verilen çek (alacaklı, banka hesabı).
    { id: 992, yon: "alinan", paymentId: null, no: "555", banka: "İş", kesideci: "Mehmet", tur: "hamiline", durum: "portfoy", tutar: 12500.5, currency: "TRY",
      vadeTarihi: "2026-11-30", tarih: "2026-09-01", kimden: "Eski müşteri", gecmis: [{ tarih: "2026-09-01", durum: "portfoy", not: "Portföye elle eklendi" }] },
    { id: 993, yon: "verilen", paymentId: null, no: "A-7", banka: "Ziraat", tur: "hamiline", durum: "yazildi", tutar: 3000, currency: "TRY", vadeTarihi: "2026-10-15",
      tarih: "2026-09-02", alacakliTur: "tedarikci", alacakliId: 71, alacakliAd: "Demir Bant", hesapId: 97, aciklama: "Eylül", gecmis: [] }],
  // Spec 0022: üretim partileri (biri kapalı, kapanış anlık görüntüsüyle).
  uretimPartileri: [{ id: 95, ad: "2026-1", baslangicAy: "2026-01", bitisAy: "2026-03", aciklama: "70 makina", kapanmaZamani: "2026-04-01T10:00:00", kapanisOrtaklari: { "2026-01": 100000, "2026-02": 150050 } },
    { id: 96, ad: "Açık", baslangicAy: "2026-08", bitisAy: null, aciklama: "", deletedAt: "2026-10-01T09:00:00.000Z" }], // spec 0068 R9b: çöpteki parti
  standartGiderler: [{ id: 91, grupId: 91, ad: "Kira", tutar: 20000, baslangicAy: "2026-01", bitisAy: "2026-06" }, { id: 92, grupId: 91, ad: "Kira", tutar: 25000, baslangicAy: "2026-07", bitisAy: null }],
  partSales: [{ id: 600, customerId: 500, tur: "Kalıp", ad: "Adana", olcu: "55x125", ucret: 100, odendi: false, hesapId: 98, teklifId: 101, teklifKalemId: "k-kalip-1", uretimFormGonder: true, uretimFormId: 88,
    satisFirma: "Diğer", satisFirmaAd: "Aracı Firma", satisFirmaYetkili: "Mehmet Demir", satisFirmaTel: "05559876543", satisFirmaUlke: "Türkiye", satisFirmaSehir: "İzmir",
    kargoDurum: "Kargoya Verildi", kargoFirma: "Yurtiçi", kargoTakipNo: "KL-1", kargoTarih: "2026-07-20", kargoSorumlusu: "Ahmet", panoDusmeZamani: "2026-07-25T08:00", panoGizli: true, olusturmaZamani: "2026-07-20T14:35:10", fabrikaTeslim: true, teslimSekli: "fabrika",
    teslimatFarkli: true, teslimatAd: "Şube Deposu", teslimatTel: "02123334455", teslimatAdres: "Sanayi Mah. 5. Sok No:12", teslimatUlke: "Türkiye", teslimatSehir: "İstanbul", teslimatIlce: "Tuzla",
    yontem: "Kredi Kartı", vadeTarihi: "", tahsilEdildi: false,
    taksitSayisi: 3, kartKomisyonu: { taksit: 3, oran: 7.47, toplamKesinti: 7.97, netTutar: 92.03, blokajGun: 0, hesabaGecis: "2026-07-20", yansitildi: false }, tahsilatTarihi: "2026-11-02" }],
  payments: [
    { id: 900, customerId: 500, tarih: "2026-07-22", tutar: 132690.52, currency: "TRY", not: "Kart", yontem: "Kredi Kartı",
      taksitSayisi: 1, kartKomisyonu: { taksit: 1, oran: 3.1, toplamKesinti: 2880, netTutar: 129810, blokajGun: 40, hesabaGecis: "2026-08-31", yansitildi: true, bazTarih: "2026-07-22" }, hesapId: 97 },
  ],
  dealers: [{ id: 3, name: "Bayi X", country: "Türkiye", city: "Kocaeli", ilce: "Gebze" }],
  yedekParcaSatislar: [
    { id: 650, dealerId: 3, aliciTipi: "bayi", hesapId: 97, teklifId: 103, teklifKalemId: "k-parca-1", partId: "7", miktar: 5, birimFiyat: 120, currency: "TRY", tarih: "2026-07-15", odendi: false, faturaTipi: "Faturalı Yurtiçi",
      kargoFirma: "Yurtiçi Kargo", kargoTakipNo: "TK123", kargoTarih: "2026-07-16", kargoDurum: "Kargoya Verildi", kargoSorumlusu: "Ahmet Yılmaz", panoDusmeZamani: "2026-07-28T08:00", olusturmaZamani: "2026-07-15T10:20:30", batchId: 777001,
      teslimatFarkli: true, teslimatAd: "Şantiye Deposu", teslimatTel: "03121112233", teslimatAdres: "Başkent OSB 15. Cad No:8", teslimatUlke: "Türkiye", teslimatSehir: "Ankara", teslimatIlce: "Sincan",
      yontem: "Kredi Kartı", taksitSayisi: 6, kartKomisyonu: { taksit: 6, oran: 9.34, toplamKesinti: 60.54, netTutar: 539.46, blokajGun: 0, hesabaGecis: "2026-07-15", yansitildi: false },
      tahsisler: [ { miktar: 2, customerId: 500, serialNo: "S-1", makinaSerbest: "", tarih: "2026-07-20" },
                   { miktar: 1, customerId: null, serialNo: "", makinaSerbest: "Bayi X kendi müşterisi", tarih: "2026-07-21" } ] },
    // Alıcı müşteri (bayiye değil son müşteriye satış) — musteriId dolu, dealerId boş; panoGizli (arşiv) true; fabrika teslim
    { id: 651, aliciTipi: "musteri", musteriId: 500, partId: "8", miktar: 3, birimFiyat: 50, currency: "TRY", tarih: "2026-07-18", odendi: true, yontem: "Çek", vadeTarihi: "2026-10-01", tahsilEdildi: true, tahsilatTarihi: "2026-10-03", kargoDurum: "Teslim Edildi", panoGizli: true, fabrikaTeslim: true, tahsisler: [] },
    // Anlaşmasız dış firma alıcı (kayıtlı bayi değil) — bilgiler kayda yazılır
    { id: 652, aliciTipi: "bayi", dealerId: null, disFirma: true, disFirmaAd: "Harici Parça Ltd", disFirmaYetkili: "Veli Kaya", disFirmaTel: "05553334455", disFirmaAdres: "Sanayi Sitesi 3. Blok No:7", disFirmaUlke: "Türkiye", disFirmaSehir: "Ankara", partId: "8", miktar: 2, birimFiyat: 75, currency: "TRY", tarih: "2026-07-19", odendi: false, tahsisler: [] },
  ],
  gorusmeler: [
    { id: 7, customerId: 500, tarih: "2026-07-01", tur: "Telefon", not: "Fiyat bekliyor", takipTarihi: "2026-07-10", tamamlandi: false, kullanici: "kerem" },
    { id: 8, customerId: 500, tarih: "2026-07-02", tur: "Ziyaret", not: "Silinen görüşme", deletedAt: "2026-07-03T10:00:00.000Z" },
  ],
  dosyalar: [
    { id: 20, customerId: 500, refType: "servis", refId: 2, ad: "imzali-form.pdf", dosyaAdi: "k1-imzali-form.pdf", boyut: 12345, tur: "PDF", tarih: "2026-07-05", ekleyen: "kerem" },
    { id: 21, customerId: 500, refType: "makina", refId: null, ad: "sozlesme.pdf", dosyaAdi: "k2-sozlesme.pdf", boyut: 999, tur: "PDF", tarih: "2026-07-06", ekleyen: "kerem", deletedAt: "2026-07-07T10:00:00.000Z" },
    { id: 22, dealerId: 3, ad: "bayi-sozlesmesi.pdf", dosyaAdi: "k3-bayi-sozlesmesi.pdf", boyut: 500, tur: "PDF", tarih: "2026-07-08", ekleyen: "kerem" },
  ],
  stock: [{ id: 4, model: "AK100_DS", serialNo: "S-1" }, { id: 5, model: "AK100_DS", serialNo: "S-2", addedDate: "2026-09-20", note: "Silinen müşteriden geri döndü", uretimTarihi: "2026-02-11", partiId: 95 }], parts: [],
  // Yedek parça stoğu: eski sürümden kalmış NEGATİF satır (miktar -3) okumada/migration'da 0'a çekilmeli.
  partStock: [
    { id: 70, partId: "7", miktar: 12, notlar: "" },
    { id: 71, partId: "8", miktar: -3, notlar: "eski negatif" },
  ],
  // Spec 0065 (AC-18): karşı hareket ayrı tip ama şema aynı; satırlar yeni sütun olmadan saklanır.
  partStockLog: [
    { id: 72, partId: "7", miktar: -3, tip: "servis", referansId: 3, tarih: "2026-09-01", notlar: "" },
    { id: 73, partId: "7", miktar: 3, tip: "servis_iade", referansId: 3, tarih: "2026-09-02", notlar: "Servis kaydı silindi ya da düzenlendi" },
  ],
  notes: [
    { id: 30, content: "Kerem'in notu", updatedAt: "1", olusturan: "kerem" },
    { id: 31, content: "Eski sahipsiz not", updatedAt: "2" },
  ],
  factory: { city: "İstanbul", ilce: "Beşiktaş", name: "Altuntaş Makina", email: "info@altunmak.com", web: "www.altunmak.com", faturaFirmaAdi: "ALTUNMAK MACHINERY LTD.", haritaKonum: { il: "İstanbul", x: 123.4, y: 567.8 } },
  teklifler: [
    { id: 101, type: "teklif", no: "T-1", firma: "Firma", durum: "onaylandi", customerId: 500, satisTamam: true, tur: "makina", satirlar: [] },
    { id: 102, type: "teklif", no: "T-2", firma: "F2", durum: "taslak", satirlar: [] },
    // Spec 0006: bayi alıcı, nihai müşteri ve üretilmiş alt kalem listesi.
    { id: 103, type: "teklif", no: "T-3", firma: "Bayi", durum: "onaylandi", aliciTipi: "bayi", dealerId: 3, nihaiMusteriId: 500, uretilenKalemler: ["k-parca-1", "k-kalip-1"], satirlar: [] },
  ],
  appSettings: { autoBackup: false, teklifTakipGun: 1, tahsilatTakipGun: 14, autoLockMinutes: 5,
    translations: { fatura: { title: "COMMERCIAL INVOICE" } },
    mailTemplates: { teklifProforma: { konu: "Özel Konu {no}", metin: "Özel metin" } },
    calismaSaatleri: { baslangic: "09:00", bitis: "18:30", gunler: [1, 2, 3, 4, 5, 6],
      molalar: [{ baslangic: "12:30", bitis: "13:30" }, { baslangic: "16:00", bitis: "16:15" }] },
    servisAlarm: { acik: true, sesSn: 30, yanipSn: 45 },
    musteriSutunlari: { faturaBedeli: true, fabrikaSatis: false, komisyon: true, extraKalip: true },
    analizGizliModeller: ["AK-100", "AK-160"],
    giderAyarlari: { stopajOrani: 20, yururlukAy: "2026-06", varsayilanResmiMaliyet: 39223.13, ortakGiderKaynagi: "standart", hatirlatmaEsikGun: 15, hesapsizBaslangic: "2026-06-01" },
    krediKartiKomisyonlari: { bsmv: 5, satirlar: [{ taksit: 1, oran: 3.1, katkiPayi: 0.5, blokajGun: 40 }, { taksit: 3, oran: 7.47, katkiPayi: 0.5, blokajGun: 0 }] } },
});
blob = dbmod.readBlobFromDb();
check("satisTamam true korunur", blob.teklifler.find(t => t.id === 101)?.satisTamam === true);
check("satisTamam undefined korunur", blob.teklifler.find(t => t.id === 102)?.satisTamam === undefined);
check("factory.web tam turu", blob.factory?.web === "www.altunmak.com");
check("factory.faturaFirmaAdi tam turu", blob.factory?.faturaFirmaAdi === "ALTUNMAK MACHINERY LTD.");
check("spec 0006: teklif aliciTipi/dealerId/nihaiMusteriId/uretilenKalemler tam turu", (() => {
  const t = (blob.teklifler || []).find(x => x.id === 103);
  return t?.aliciTipi === "bayi" && t?.dealerId === 3 && t?.nihaiMusteriId === 500 && JSON.stringify(t?.uretilenKalemler) === JSON.stringify(["k-parca-1", "k-kalip-1"]);
})());
check("spec 0006: eski teklifte uretilenKalemler/dealerId alanı yok (liste yoksa eski davranış)", (() => {
  const t = (blob.teklifler || []).find(x => x.id === 102);
  return t && !("uretilenKalemler" in t) && !("dealerId" in t);
})());
check("spec 0006: yedek parça teklifId/teklifKalemId ve Extra Kalıp teklifKalemId tam turu", (() => {
  const y = (blob.yedekParcaSatislar || []).find(x => x.id === 650);
  const k = (blob.partSales || []).find(x => x.id === 600);
  return y?.teklifId === 103 && y?.teklifKalemId === "k-parca-1" && k?.teklifKalemId === "k-kalip-1";
})());
check("customer.brutKg tam turu", (blob.customers || []).find(c => c.id === 500)?.brutKg === 850);
// Spec 0002 C4: satış kuru (REAL) ve üretim tarihi (TEXT) satış kaydında; geri dönen stok satırının özgün üretim tarihi.
check("spec 0068 AC-20: tedarikçi ve üretim partisi deletedAt tam turu; canlı partide null", (() => {
  const t = (blob.tedarikciler || [])[0], p = (blob.uretimPartileri || []);
  return t?.deletedAt === "2026-10-01T09:00:00.000Z" && p.find(x => x.id === 96)?.deletedAt === "2026-10-01T09:00:00.000Z" && p.find(x => x.id === 95)?.deletedAt == null;
})());
check("spec 0022: üretim partileri tam turu (kapanış anlık görüntüsü JSON, açık partide null)", (() => {
  const p = (blob.uretimPartileri || []);
  const k = p.find(x => x.id === 95), a = p.find(x => x.id === 96);
  return p.length === 2 && k?.ad === "2026-1" && k.baslangicAy === "2026-01" && k.bitisAy === "2026-03" && k.aciklama === "70 makina"
    && k.kapanmaZamani === "2026-04-01T10:00:00" && k.kapanisOrtaklari?.["2026-02"] === 150050 && a?.bitisAy == null && a.kapanisOrtaklari == null;
})());
check("spec 0024: kasa hesapları (kapali boolean) ve hareketler (tamKapatir boolean) tam turu", (() => {
  const h = blob.kasaHesaplari || [], m = blob.hesapHareketleri || [];
  const z = h.find(x => x.id === 97), k = h.find(x => x.id === 98), o = m.find(x => x.id === 971), v = m.find(x => x.id === 972), g = m.find(x => x.id === 973);
  check("spec 0040: çek kaydı (geçmiş JSON) ve ciro hareketinin cekId'si tam turu", (() => {
    const c = (blob.cekler || []).find(x => x.id === 991);
    return c?.paymentId === 900 && c.no === "123456" && c.banka === "Ziraat" && c.kesideci === "Ali Veli" && c.tur === "resmi" && c.durum === "ciro"
      && c.gecmis?.length === 2 && c.gecmis[1].not === "Ciro: Demir Bant" && m.find(x => x.id === 976)?.cekId === 991;
  })());
  check("spec 0049: bağsız alınan ve verilen çekin kendi alanları tam turu; bağlı çekte yeni alan yazılmaz (AC-25)", (() => {
    const c = blob.cekler || [], b = c.find(x => x.id === 992), v = c.find(x => x.id === 993), eski = c.find(x => x.id === 991);
    return b?.yon === "alinan" && b.paymentId == null && b.tutar === 12500.5 && b.currency === "TRY" && b.vadeTarihi === "2026-11-30" && b.tarih === "2026-09-01" && b.kimden === "Eski müşteri"
      && v?.yon === "verilen" && v.durum === "yazildi" && v.alacakliTur === "tedarikci" && v.alacakliId === 71 && v.alacakliAd === "Demir Bant" && v.hesapId === 97 && v.aciklama === "Eylül"
      && !("yon" in eski) && !("tutar" in eski) && !("hesapId" in eski);
  })());
  check("spec 0024 B: avans ve mahsup çalışan bağıyla tam turu", m.find(x => x.id === 974)?.calisanId === 55 && m.find(x => x.id === 974)?.hesapId == null
    && m.find(x => x.id === 975)?.tur === "mahsup" && m.find(x => x.id === 975)?.giderId === 81 && m.find(x => x.id === 975)?.calisanId === 55);
  return h.length === 2 && z?.acilisBakiyesi === 100000.5 && z.kapali === false && k?.kapali === true && k.acilisBakiyesi === -2000
    && o?.tutar === 1234.56 && o.hesapId === 97 && o.giderId === 81 && o.tamKapatir === false && o.aciklama === "kısmi"
    && v?.tur === "virman" && v.karsiHesapId === 98 && g?.tamKapatir === true && g.tutar == null && g.gocKaynak === "taksit:82:9002";
})());
check("spec 0022: stock.partiId ve customers.partiId tam turu", (blob.stock || []).find(x => x.id === 5)?.partiId === 95 && (blob.customers || []).find(x => x.id === 500)?.partiId === 95);
check("customer.satisKuru + uretimTarihi tam turu (spec 0002)", (() => {
  const c = (blob.customers || []).find(x => x.id === 500);
  return c?.satisKuru === 41.2345 && c?.uretimTarihi === "2026-03-14" && c?.currency === "USD";
})());
check("kursuz / üretim tarihsiz eski kayıt boş döner (yaklaşık hesaba ve çözüm zincirine düşer)", (() => {
  const c = (blob.customers || []).find(x => x.id === 501);
  return c && c.satisKuru == null && c.uretimTarihi == null;
})());
check("stock.uretimTarihi tam turu (spec 0002 plan M3)", (blob.stock || []).find(s => s.id === 5)?.uretimTarihi === "2026-02-11");
check("customer.fromTeklifId", blob.customers[0]?.fromTeklifId === 101);
check("kalıp uretimFormGonder/Id", blob.customers[0]?.kaliplar[0]?.uretimFormGonder === true && blob.customers[0]?.kaliplar[0]?.uretimFormId === 77);
check("spec 0044 AC-19: servis, Extra Kalıp ve yedek parça tahsilat hesabı (hesapId) roundtrip", blob.services.find(x => x.id === 2)?.hesapId === 97 && blob.partSales.find(x => x.id === 600)?.hesapId === 98 && (blob.yedekParcaSatislar || []).find(x => x.id === 650)?.hesapId === 97);
check("partSale teklifId + uretim alanları", (() => { const ps = blob.partSales.find(p => p.id === 600); return ps?.teklifId === 101 && ps?.uretimFormGonder === true && ps?.uretimFormId === 88; })());
// Anlaşmasız dış firma alanları (servis "İşlemi Yapan Firma"=Diğer, kalıp "Satış Yapan Firma"=Diğer)
check("service islemFirma* (Diğer dış servis) roundtrip", (() => { const s = blob.services.find(x => x.id === 2); return s?.islemFirma === "Diğer" && s?.islemFirmaAd === "Harici Servis Ltd" && s?.islemFirmaYetkili === "Ahmet Yılmaz" && s?.islemFirmaTel === "05551234567" && s?.islemFirmaAdres === "Organize Sanayi 5. Cadde No:12" && s?.islemFirmaUlke === "Türkiye" && s?.islemFirmaSehir === "Bursa"; })());
check("service durum (Servis Panosu) roundtrip", blob.services.find(x => x.id === 2)?.durum === "Yapılıyor");
check("service zaman damgaları (giriş/başlangıç/bitiş) roundtrip", (() => { const s = blob.services.find(x => x.id === 2); return s?.fabrikaGirisZamani === "2026-07-20T09:15:00" && s?.bakimBaslangicZamani === "2026-07-20T11:30:00" && s?.bitisZamani === "2026-07-20T14:45:00"; })());
check("service panoGizli (arşiv) boolean roundtrip", (() => { const a = blob.services.find(x => x.id === 2); const b = blob.services.find(x => x.id === 3); return a?.panoGizli === false && b?.panoGizli === true && b?.durum === "Tamamlandı"; })());
// ── Gider kaydı (spec 0001) ──
check("gider: çalışan resmi/elden maliyeti (meta JSON) roundtrip", (() => { const a = (blob.calisanlar || []).find(c => c.id === 71); return a?.resmiMaliyet === 39223.13 && a?.eldenMaliyet === 15000; })());
check("gider: giderAyarlari (appSettings JSON) roundtrip", (() => { const g = blob.appSettings?.giderAyarlari; return g?.stopajOrani === 20 && g?.yururlukAy === "2026-06" && g?.varsayilanResmiMaliyet === 39223.13; })());
// Spec 0002 C4-3 ve 0003 C1: yeni alanlar yeni sütun açmadan giderAyarlari JSON'unda taşınır.
check("spec 0051 AC-29: giderAyarlari.hesapsizBaslangic roundtrip (yeni sütun yok)", blob.appSettings?.giderAyarlari?.hesapsizBaslangic === "2026-06-01");
check("giderAyarlari.ortakGiderKaynagi + hatirlatmaEsikGun roundtrip (spec 0002/0003)", blob.appSettings?.giderAyarlari?.ortakGiderKaynagi === "standart" && blob.appSettings?.giderAyarlari?.hatirlatmaEsikGun === 15);
check("gider: türler (meta JSON, davranış) roundtrip", (blob.giderTurleri || []).length === 4 && blob.giderTurleri.find(t => t.id === 41)?.davranis === "kira");
check("gider: tedarikçi tüm alanlar roundtrip", (() => { const t = (blob.tedarikciler || [])[0]; return t?.id === 51 && t.ad === "Demir Bant San." && t.yetkili === "Serkan" && t.telefon === "0332" && t.eposta === "a@b.c" && t.vergiDairesi === "Selçuk" && t.vergiNo === "123" && t.adres === "OSB" && t.not === "vadeli"; })());
check("gider: kalem alanları + odendi boolean roundtrip", (() => { const k = (blob.giderler || []).find(x => x.id === 81); const kira = (blob.giderler || []).find(x => x.id === 82); return k?.odendi === false && k.tutar === 140000 && k.odemeYontemi === "Çek" && k.sonOdemeTarihi === "2026-08-15" && k.tedarikciId === 51 && k.atamaTur === "model" && kira?.odendi === true && kira.girisYonu === "net" && kira.netTutar === 16000 && kira.stopajOrani === 20 && kira.tanimId === 61 && kira.donem === "2026-07"; })());
check("gider: model alt satırları sırasıyla roundtrip ve id taşımıyor", (() => { const m = (blob.giderler || []).find(x => x.id === 81)?.modelSatirlari || []; return m.length === 2 && m[0].modelAd === "AK120_DSC" && m[0].birimMaliyet === 3000 && m[0].adet === 30 && m[1].modelAd === "AK100_DS" && m.every(x => x.id === undefined); })());
check("spec 0042 AC-25 / AC-27: personelin elden hedef satırı (hedef, vade) roundtrip; kira satırları bozulmadı", (() => { const t = (blob.giderler || []).find(x => x.id === 83)?.taksitler || []; return t.length === 2 && t.map(x => x.hedef).join() === "ana,elden" && t[1].id === 9012 && t[1].vade === "2026-07-28" && t[1].tutar === 18500; })());
check("spec 0021: gider ödeme satırları kimlik, hedef, sıra, vade, tutar ve durumlarıyla roundtrip (C8)", (() => { const t = (blob.giderler || []).find(x => x.id === 82)?.taksitler || []; return t.length === 3 && t.map(x => x.id).join() === "9001,9002,9003" && t[1].hedef === "stopaj" && t[1].sira === 1 && t[1].vade === "2026-08-26" && t[1].tutar === 2000 && t[1].odendi === true && t[1].odemeTarihi === "2026-08-20" && t[2].odendi === false && t[2].odemeTarihi === null; })());
check("spec 0021: satırsız gider kalemi boş taksit dizisi döner", ((blob.giderler || []).find(x => x.id === 81)?.taksitler || null)?.length === 0);
check("spec 0054 AC-21: dört hedefli personel satırları (ana, elden, ekResmi, ekElden) kimlik, vade ve tutarla roundtrip", (() => { const t = (blob.giderler || []).find(x => x.id === 85)?.taksitler || []; return t.map(x => x.hedef).join() === "ana,elden,ekResmi,ekElden" && t.map(x => x.id).join() === "9021,9022,9023,9024" && t[2].tutar === 5000 && t[3].tutar === 4500 && t[3].vade === "2026-08-31"; })());
check("spec 0023: ek ödeme satırları sırasıyla, alanlarıyla ve kimliksiz roundtrip (AC-13, C7)", (() => { const e = (blob.giderler || []).find(x => x.id === 83)?.ekOdemeler || []; return e.length === 3 && e[0].tur === "fazlaCalisma" && e[0].aciklama === "Temmuz yoğunluğu" && e[0].resmiTutar === 4000 && e[0].eldenTutar === 1000 && e[1].resmiTutar == null && e[1].eldenTutar === 2500 && e[2].tur === "prim" && e.every(x => x.id === undefined); })());
check("spec 0023: ek ödemesiz kalem boş dizi döner", ((blob.giderler || []).find(x => x.id === 81)?.ekOdemeler || null)?.length === 0);
check("gider: satırsız kalem boş dizi döner", ((blob.giderler || []).find(x => x.id === 82)?.modelSatirlari || null)?.length === 0);
check("gider: personel resmi/elden + soft-delete roundtrip", (() => { const p = (blob.giderler || []).find(x => x.id === 83); return p?.resmiTutar === 39223.13 && p.eldenTutar === 15000 && p.calisanAd === "Ahmet Yılmaz" && p.deletedAt === "2026-07-20T10:00:00.000Z"; })());
check("spec 0074 AC-33: SGK türü (davranış sgk) ve SGK kalemi roundtrip eder; kalemde sgkTutar/kdvYonu yazılmaz", (() => {
  const t = (blob.giderTurleri || []).find(x => x.id === 44), k = (blob.giderler || []).find(x => x.id === 87);
  return t?.davranis === "sgk" && k?.turId === 44 && k.tutar === 9333.25 && k.kdvOrani === 0 && k.tedarikciId == null && k.sonOdemeTarihi === "2026-10-31" && !("sgkTutar" in k) && !("kdvYonu" in k);
})());
check("spec 0075 AC-34, AC-35: tevkifat üç alanı iki tabloda roundtrip eder; 'tevkifat' hedefli satır vadesiyle korunur; kapalı kalem ve tanımda alan yazılmaz", (() => {
  const k = (blob.giderler || []).find(x => x.id === 84), e = (blob.giderler || []).find(x => x.id === 83);
  const t = (blob.giderTanimlari || []).find(x => x.id === 61), t2 = (blob.giderTanimlari || []).find(x => x.id === 62);
  const tv = (k?.taksitler || []).find(x => x.hedef === "tevkifat");
  return k?.tevkifatli === true && k.tevkifatPay === 2 && k.tevkifatPayda === 10 && tv?.id === 9042 && tv.vade === "2026-08-26" && tv.tutar === 260
    && t?.tevkifatli === true && t.tevkifatPay === 2 && t.tevkifatPayda === 10
    && ["tevkifatli", "tevkifatPay", "tevkifatPayda"].every(a => !(a in e) && !(a in t2));
})());
check("gider: makina ataması roundtrip", (() => { const k = (blob.giderler || []).find(x => x.id === 84); return k?.atamaTur === "makina" && k.makinaTur === "stok" && k.makinaId === 4; })());
check("spec 0070 AC-5: sgkTutar ve yolParasi roundtrip eder, SGK satırı (hedef sgk) vadesiyle korunur; alanı olmayan kalemde alan yazılmaz", (() => {
  const k = (blob.giderler || []).find(x => x.id === 86), e = (blob.giderler || []).find(x => x.id === 83);
  const sgk = (k?.taksitler || []).find(x => x.hedef === "sgk");
  return k?.sgkTutar === 9000.5 && k.yolParasi === 1500 && sgk?.id === 9025 && sgk.vade === "2026-09-15" && sgk.tutar === 9000.5 && e && !("sgkTutar" in e) && !("yolParasi" in e);
})());
check("spec 0072 AC-23: dagitimAy iki tabloda roundtrip eder; alanı olmayan kalemde blob'a yazılmaz (R19)", (() => {
  const k = (blob.giderler || []).find(x => x.id === 81), kira = (blob.giderler || []).find(x => x.id === 82), t = (blob.giderTanimlari || []).find(x => x.id === 61);
  return k?.dagitimAy === 12 && t?.dagitimAy === 12 && kira && !("dagitimAy" in kira);
})());
check("spec 0071 AC-16: kdvYonu iki tabloda roundtrip eder, kira girisYonu ile yan yana durur; boş alan blob'a yazılmaz (R27)", (() => {
  const k = (blob.giderler || []).find(x => x.id === 81), kira = (blob.giderler || []).find(x => x.id === 82);
  const t = (blob.giderTanimlari || []).find(x => x.id === 61), p = (blob.giderTanimlari || []).find(x => x.id === 62);
  return k?.kdvYonu === "dahil" && kira?.kdvYonu === "haric" && kira.girisYonu === "net" && t?.kdvYonu === "dahil" && p && !("kdvYonu" in p);
})());
check("gider: tanım modelSatirlari/uretilenAylar (JSON) + kapatildi roundtrip", (() => { const t = (blob.giderTanimlari || []).find(x => x.id === 61); const k = (blob.giderTanimlari || []).find(x => x.id === 62); return t?.modelSatirlari?.[0]?.adet === 20 && t.uretilenAylar.join(",") === "2026-06,2026-07" && t.tedarikciId === 51 && t.kapatildi === false && k?.kapatildi === true && k.bitisAy === "2026-08"; })());
check("gider: standart genel gider sürümleri roundtrip", (() => { const s2 = blob.standartGiderler || []; return s2.length === 2 && s2.find(x => x.id === 92)?.grupId === 91 && s2.find(x => x.id === 91)?.bitisAy === "2026-06" && s2.find(x => x.id === 92)?.bitisAy == null; })());
check("firma çalışanları (calisanlar meta) roundtrip", (() => { const a = (blob.calisanlar || []).find(c => c.id === 71); const b = (blob.calisanlar || []).find(c => c.id === 72); return a?.ad === "Ahmet Yılmaz" && b?.ad === "Mehmet Demir" && blob.calisanlar.length === 2; })());
check("partSale satisFirma* (Diğer aracı firma) roundtrip", (() => { const p = blob.partSales.find(x => x.id === 600); return p?.satisFirma === "Diğer" && p?.satisFirmaAd === "Aracı Firma" && p?.satisFirmaYetkili === "Mehmet Demir" && p?.satisFirmaTel === "05559876543" && p?.satisFirmaUlke === "Türkiye" && p?.satisFirmaSehir === "İzmir"; })());
check("partSale kargo alanları (Extra Kalıp panosu) roundtrip; panoGizli boolean", (() => { const p = blob.partSales.find(x => x.id === 600); return p?.kargoDurum === "Kargoya Verildi" && p?.kargoFirma === "Yurtiçi" && p?.kargoTakipNo === "KL-1" && p?.kargoTarih === "2026-07-20" && p?.kargoSorumlusu === "Ahmet" && p?.panoDusmeZamani === "2026-07-25T08:00" && p?.panoGizli === true; })());
check("partSale fabrikaTeslim (Extra Kalıp fabrika teslim, boolean) roundtrip", (() => { const p = blob.partSales.find(x => x.id === 600); return p?.fabrikaTeslim === true; })());
check("partSale teslimSekli (açık teslim şekli işareti) roundtrip", (() => { const p = blob.partSales.find(x => x.id === 600); return p?.teslimSekli === "fabrika"; })());
check("spec 0065 AC-18: karşı hareket (servis_iade) şema değişmeden roundtrip", (() => { const l = blob.partStockLog || []; const a = l.find(x => x.id === 72); const b = l.find(x => x.id === 73); return a?.tip === "servis" && a.miktar === -3 && b?.tip === "servis_iade" && b.miktar === 3 && b.referansId === 3 && b.notlar === "Servis kaydı silindi ya da düzenlendi"; })());
check("partStock negatif satır 0'a çekilir (stok eksiye düşmez); pozitif satır korunur", (() => { const neg = (blob.partStock || []).find(x => x.id === 71); const pos = (blob.partStock || []).find(x => x.id === 70); return neg?.miktar === 0 && pos?.miktar === 12; })());
check("Faturalı müşteride faturaBedeli persist; Faturasıza çevrilende temizlenmiş bedel geri gelmez (falsy)", (() => { const fatura = blob.customers.find(c => c.id === 500); const faturasiz = blob.customers.find(c => c.id === 501); return Number(fatura?.faturaBedeli) === 600000 && !faturasiz?.faturaBedeli && Number(faturasiz?.fabrikaSatisBedeli) === 500000; })());
check("servis degisenParcalar (miktar/fiyat) + parcaUcreti (miktar×fiyat) roundtrip", (() => { const sv = (blob.services || []).find(x => x.id === 3); const p = sv?.degisenParcalar?.[0]; return p?.miktar === 2 && Number(p?.fiyat) === 9000 && p?.partId === "7" && p?.disTedarik === false && sv?.parcaUcreti === 18000 && sv?.parcaCurrency === "TRY"; })());
check("servis ödeme yöntemi + kredi kartı taksit/komisyon snapshot roundtrip", (() => { const sv = (blob.services || []).find(x => x.id === 3); return sv?.yontem === "Kredi Kartı" && sv?.taksitSayisi === 3 && sv?.kartKomisyonu?.oran === 7.47 && sv?.kartKomisyonu?.toplamKesinti === 1435 && sv?.kartKomisyonu?.yansitildi === false; })());
check("partSale farklı teslimat adresi (Extra Kalıp) roundtrip; teslimatFarkli boolean", (() => { const p = blob.partSales.find(x => x.id === 600); return p?.teslimatFarkli === true && p?.teslimatAd === "Şube Deposu" && p?.teslimatTel === "02123334455" && p?.teslimatAdres === "Sanayi Mah. 5. Sok No:12" && p?.teslimatUlke === "Türkiye" && p?.teslimatSehir === "İstanbul" && p?.teslimatIlce === "Tuzla"; })());
check("partSale ödeme yöntemi (Extra Kalıp) roundtrip", (() => { const p = blob.partSales.find(x => x.id === 600); return p?.yontem === "Kredi Kartı" && p?.tahsilEdildi === false; })());
check("partSale kredi kartı taksit + komisyon snapshot (JSON) roundtrip", (() => { const p = blob.partSales.find(x => x.id === 600); return p?.taksitSayisi === 3 && p?.kartKomisyonu?.oran === 7.47 && p?.kartKomisyonu?.toplamKesinti === 7.97 && p?.kartKomisyonu?.yansitildi === false; })());
check("spec 0058 AC-14: kapsam dışı girişleri (tahsilat ve hareket) alanlarıyla tam turu", (() => {
  const k = blob.kasaKapsamDisi || [];
  const t = k.find(x => x.id === 9581), h = k.find(x => x.id === 9582);
  return k.length === 2 && t?.tur === "tahsilat" && t.kaynak === "servis" && t.kayitId === 4242 && t.zaman === "2026-10-01T10:00:00.000Z"
    && h?.tur === "hareket" && h.kaynak == null && h.kayitId === 976;
})());
check("spec 0024 R6: tahsilatın hesapId'si tam turu", (blob.payments || []).find(x => x.id === 900)?.hesapId === 97);
check("payment kredi kartı taksit + komisyon snapshot (blokaj, yansitildi, bazTarih) roundtrip", (() => { const p = (blob.payments || []).find(x => x.id === 900); return p?.taksitSayisi === 1 && p?.kartKomisyonu?.blokajGun === 40 && p?.kartKomisyonu?.hesabaGecis === "2026-08-31" && p?.kartKomisyonu?.yansitildi === true && p?.kartKomisyonu?.bazTarih === "2026-07-22"; })());
check("yedek parça satışı kredi kartı taksit + komisyon snapshot roundtrip", (() => { const s = (blob.yedekParcaSatislar || []).find(x => x.id === 650); return s?.taksitSayisi === 6 && s?.kartKomisyonu?.oran === 9.34 && s?.kartKomisyonu?.toplamKesinti === 60.54; })());
check("appSettings krediKartiKomisyonlari (JSON) roundtrip", (() => { const a = blob.appSettings?.krediKartiKomisyonlari; return a?.bsmv === 5 && Array.isArray(a?.satirlar) && a.satirlar.length === 2 && a.satirlar[1]?.taksit === 3 && a.satirlar[1]?.oran === 7.47; })());
check("yedek parça ödeme yöntemi + çek tahsil (boolean) roundtrip", (() => { const s = (blob.yedekParcaSatislar || []).find(x => x.id === 651); return s?.yontem === "Çek" && s?.vadeTarihi === "2026-10-01" && s?.tahsilEdildi === true; })());
check("tahsilatTarihi roundtrip (servis/kalıp/yedek parça)", (() => {
  const sv = (blob.services || []).find(x => x.id === 3);
  const p = (blob.partSales || []).find(x => x.id === 600);
  const yp = (blob.yedekParcaSatislar || []).find(x => x.id === 651);
  return sv?.tahsilatTarihi === "2026-10-05" && p?.tahsilatTarihi === "2026-11-02" && yp?.tahsilatTarihi === "2026-10-03";
})());
check("partSale olusturmaZamani roundtrip (pano sıralaması: en son eklenen üstte)", (() => { const p = blob.partSales.find(x => x.id === 600); return p?.olusturmaZamani === "2026-07-20T14:35:10"; })());
check("yedek parça satışı roundtrip (parent alanları + kargo)", (() => { const s = (blob.yedekParcaSatislar || []).find(x => x.id === 650); return s?.dealerId === 3 && String(s?.partId) === "7" && s?.miktar === 5 && s?.birimFiyat === 120 && s?.odendi === false && s?.kargoTakipNo === "TK123" && s?.kargoDurum === "Kargoya Verildi" && (blob.yedekParcaSatislar || []).length === 3; })());
check("yedek parça tahsisleri (child tablo) roundtrip", (() => { const s = (blob.yedekParcaSatislar || []).find(x => x.id === 650); const t = s?.tahsisler || []; return t.length === 2 && t[0].miktar === 2 && t[0].customerId === 500 && t[0].serialNo === "S-1" && t[1].customerId == null && t[1].makinaSerbest === "Bayi X kendi müşterisi"; })());
check("yedek parça satışı tahsissiz kayıt (boş tahsisler) roundtrip", (() => { const s = (blob.yedekParcaSatislar || []).find(x => x.id === 651); return s?.miktar === 3 && s?.odendi === true && (s?.tahsisler || []).length === 0; })());
check("yedek parça satışı panoGizli (arşiv, boolean) roundtrip", (() => { const arsivli = (blob.yedekParcaSatislar || []).find(x => x.id === 651); const acik = (blob.yedekParcaSatislar || []).find(x => x.id === 650); return arsivli?.panoGizli === true && acik?.panoGizli === false; })());
check("yedek parça satışı alıcı tipi (bayi/müşteri) roundtrip", (() => { const bayi = (blob.yedekParcaSatislar || []).find(x => x.id === 650); const mus = (blob.yedekParcaSatislar || []).find(x => x.id === 651); return bayi?.aliciTipi === "bayi" && bayi?.dealerId === 3 && mus?.aliciTipi === "musteri" && mus?.musteriId === 500 && mus?.dealerId == null; })());
check("yedek parça satışı kargo sorumlusu + panoya düşme zamanı roundtrip", (() => { const s = (blob.yedekParcaSatislar || []).find(x => x.id === 650); return s?.kargoSorumlusu === "Ahmet Yılmaz" && s?.panoDusmeZamani === "2026-07-28T08:00"; })());
check("yedek parça satışı oluşturma zamanı roundtrip (pano sıralaması)", (() => { const s = (blob.yedekParcaSatislar || []).find(x => x.id === 650); return s?.olusturmaZamani === "2026-07-15T10:20:30"; })());
check("yedek parça satışı batchId roundtrip (toplu satış gruplaması)", (() => { const s = (blob.yedekParcaSatislar || []).find(x => x.id === 650); return s?.batchId === 777001; })());
check("yedek parça satışı fabrikaTeslim (boolean) roundtrip", (() => { const mus = (blob.yedekParcaSatislar || []).find(x => x.id === 651); const bayi = (blob.yedekParcaSatislar || []).find(x => x.id === 650); return mus?.fabrikaTeslim === true && bayi?.fabrikaTeslim === false; })());
check("yedek parça satışı disFirma (anlaşmasız dış firma alıcı) roundtrip", (() => { const s = (blob.yedekParcaSatislar || []).find(x => x.id === 652); return s?.disFirma === true && s?.disFirmaAd === "Harici Parça Ltd" && s?.disFirmaYetkili === "Veli Kaya" && s?.disFirmaTel === "05553334455" && s?.disFirmaAdres === "Sanayi Sitesi 3. Blok No:7" && s?.disFirmaUlke === "Türkiye" && s?.disFirmaSehir === "Ankara" && s?.dealerId == null; })());
check("yedek parça satışı farklı teslimat adresi roundtrip", (() => { const s = (blob.yedekParcaSatislar || []).find(x => x.id === 650); const mus = (blob.yedekParcaSatislar || []).find(x => x.id === 651); return s?.teslimatFarkli === true && s?.teslimatAd === "Şantiye Deposu" && s?.teslimatTel === "03121112233" && s?.teslimatAdres === "Başkent OSB 15. Cad No:8" && s?.teslimatUlke === "Türkiye" && s?.teslimatSehir === "Ankara" && s?.teslimatIlce === "Sincan" && mus?.teslimatFarkli === false; })());
check("odemePlani JSON tam turu", blob.customers[0]?.odemePlani?.[0]?.vadeTarihi === "2026-08-30");
// Fabrika da ilçe taşır: "Bayiler" sekmesi fabrikayı da düzenliyor ve iki form aynı alanları
// paylaşıyor. Sütun eklenmeden form ilçeyi soruyordu ve kayıt sessizce siliniyordu.
check("factory.ilce roundtrip", blob.factory?.ilce === "Beşiktaş");
check("factory.haritaKonum roundtrip (elle fabrika pin konumu)", (() => { const h = blob.factory?.haritaKonum; return h?.il === "İstanbul" && h?.x === 123.4 && h?.y === 567.8; })());
check("customer.ilce roundtrip (Harita ilçe kırılımı)", (blob.customers || []).find(c => c.id === 500)?.ilce === "Kadıköy");
check("dealer.ilce roundtrip", (blob.dealers || []).find(d => d.id === 3)?.ilce === "Gebze");
check("customer.tipSecimleri roundtrip (genel parça tipi seçimleri)", (() => { const t = (blob.customers || []).find(c => c.id === 500)?.tipSecimleri; return t?.konveyor === "9" && t?.bant === "8" && t?.filtre_1 === "5"; })());
check("partTypeDefs roundtrip (kullanıcı tipi + davranış bayrakları)", (() => { const f = (blob.partTypeDefs || []).find(t => t.id === "filtre_1"); return f?.ad === "Filtre" && f?.makinaSecici === true && f?.stokDus === true && f?.raporGoster === true && f?.sistem === false && (blob.partTypeDefs || []).length === 4; })());
check("gorusme tam turu", (() => { const g = (blob.gorusmeler || []).find(x => x.id === 7); return g?.customerId === 500 && g?.not === "Fiyat bekliyor" && g?.takipTarihi === "2026-07-10" && g?.tamamlandi === false && g?.kullanici === "kerem"; })());
check("gorusme deletedAt tam turu", (() => { const g = (blob.gorusmeler || []).find(x => x.id === 8); return g?.deletedAt === "2026-07-03T10:00:00.000Z" && (blob.gorusmeler || []).find(x => x.id === 7)?.deletedAt == null; })());
check("dosya künyesi roundtrip (servis bağı)", (() => { const d = (blob.dosyalar || []).find(x => x.id === 20); return d?.customerId === 500 && d?.refType === "servis" && d?.refId === 2 && d?.ad === "imzali-form.pdf" && d?.dosyaAdi === "k1-imzali-form.pdf" && d?.boyut === 12345 && d?.tur === "PDF" && d?.ekleyen === "kerem"; })());
check("dosya deletedAt roundtrip", (() => { const d = (blob.dosyalar || []).find(x => x.id === 21); return d?.deletedAt === "2026-07-07T10:00:00.000Z" && (blob.dosyalar || []).find(x => x.id === 20)?.deletedAt == null; })());
check("bayi dosyası roundtrip (dealerId, customerId yok)", (() => { const d = (blob.dosyalar || []).find(x => x.id === 22); return d?.dealerId === 3 && d?.customerId == null && d?.ad === "bayi-sozlesmesi.pdf"; })());
check("not olusturan roundtrip (sahipli + sahipsiz)", (() => { const a = (blob.notes || []).find(x => x.id === 30); const b = (blob.notes || []).find(x => x.id === 31); return a?.olusturan === "kerem" && a?.content === "Kerem'in notu" && b?.olusturan == null && b?.content === "Eski sahipsiz not"; })());
check("appSettings translations/mailTemplates tam turu", blob.appSettings?.translations?.fatura?.title === "COMMERCIAL INVOICE" && blob.appSettings?.mailTemplates?.teklifProforma?.konu === "Özel Konu {no}");
check("appSettings takip alanları tam turu", blob.appSettings?.teklifTakipGun === 1 && blob.appSettings?.tahsilatTakipGun === 14 && blob.appSettings?.autoLockMinutes === 5);
check("appSettings calismaSaatleri tam turu", blob.appSettings?.calismaSaatleri?.baslangic === "09:00" && blob.appSettings?.calismaSaatleri?.gunler?.length === 6 && blob.appSettings?.calismaSaatleri?.molalar?.length === 2 && blob.appSettings?.calismaSaatleri?.molalar?.[1]?.bitis === "16:15");
check("appSettings servisAlarm tam turu", blob.appSettings?.servisAlarm?.acik === true && blob.appSettings?.servisAlarm?.sesSn === 30 && blob.appSettings?.servisAlarm?.yanipSn === 45);
check("appSettings musteriSutunlari (JSON) roundtrip", (() => { const m = blob.appSettings?.musteriSutunlari; return m?.faturaBedeli === true && m?.fabrikaSatis === false && m?.komisyon === true && m?.extraKalip === true; })());
check("appSettings analizGizliModeller (JSON) roundtrip", (() => { const a = blob.appSettings?.analizGizliModeller; return Array.isArray(a) && a.length === 2 && a.includes("AK-100") && a.includes("AK-160"); })());

// ── Tablo atlama bütünlüğü ───────────────────────────────────────────────────
const v2 = { ...JSON.parse(JSON.stringify(blob)), teklifler: blob.teklifler.map(t => t.id === 102 ? { ...t, durum: "gonderildi" } : t) };
delete v2.dataVersion;
dbmod.writeBlobToDb(v2); // sadece teklifler değişti
const out = dbmod.readBlobFromDb();
check("değişen bölüm yazıldı", out.teklifler.find(t => t.id === 102)?.durum === "gonderildi");
check("atlanan bölüm korundu (customer)", out.customers[0]?.name === "Müşteri");
check("atlanan bölüm korundu (dealer)", out.dealers[0]?.name === "Bayi X");
check("FK zinciri: service korundu", out.services[0]?.type === "Garanti İçi");
check("atlanan bölüm korundu (gider model satırları)", (out.giderler.find(x => x.id === 81)?.modelSatirlari || []).length === 2);
check("atlanan bölüm korundu (gider ödeme satırları, spec 0021)", (out.giderler.find(x => x.id === 82)?.taksitler || []).length === 3);

// ── KAPAT → YENİDEN AÇ (uygulama restart) → veri kalıcı mı? (yedek parça satışı regresyonu) ──
dbmod.close();
dbmod.migrateFromJsonIfNeeded();
check("reopen: sqlite yeniden aktif", dbmod.isActive());
const reopen = dbmod.readBlobFromDb();
check("reopen: yedek parça satışları KAYBOLMADI", (reopen.yedekParcaSatislar || []).length === 3);
check("reopen: yedek parça alanları + tahsis korundu", (() => { const s = (reopen.yedekParcaSatislar || []).find(x => x.id === 650); return s?.miktar === 5 && s?.kargoSorumlusu === "Ahmet Yılmaz" && s?.olusturmaZamani === "2026-07-15T10:20:30" && (s?.tahsisler || []).length === 2; })());
check("reopen: servisler korundu", (reopen.services || []).find(x => x.id === 2)?.durum === "Yapılıyor");
check("reopen: gider kalemleri ve model satırları korundu", (() => { const g = reopen.giderler || []; return g.length === 7 && /* spec 0054 kalemi 85 ile 5, spec 0070 kalemi 86 ile 6, spec 0074 kalemi 87 ile 7 */  (g.find(x => x.id === 81)?.modelSatirlari || []).length === 2; })());
check("reopen: ek ödeme satırları kalıcı (spec 0023 AC-13)", ((reopen.giderler || []).find(x => x.id === 83)?.ekOdemeler || []).length === 3);
check("reopen: gider ödeme satırlarının kimlikleri kalıcı (spec 0021 C8)", ((reopen.giderler || []).find(x => x.id === 82)?.taksitler || []).map(x => x.id).join() === "9001,9002,9003");
check("spec 0068 AC-21: yeniden açılışta çöpteki tedarikçi ve parti çöpte kalır", (reopen.tedarikciler || [])[0]?.deletedAt === "2026-10-01T09:00:00.000Z" && (reopen.uretimPartileri || []).find(x => x.id === 96)?.deletedAt === "2026-10-01T09:00:00.000Z");
check("reopen: tedarikçi, tanım, tür, standart gider korundu", (reopen.tedarikciler || []).length === 1 && (reopen.giderTanimlari || []).length === 2 && (reopen.giderTurleri || []).length === 4 && (reopen.standartGiderler || []).length === 2);
check("reopen: müşteriler korundu", (reopen.customers || []).find(c => c.id === 500)?.name === "Müşteri");

// ── REGRESYON: tahsis id çakışması TÜM save'i patlatıyordu ──
// Uygulama her değişiklikte okuduğu blob'u geri yazar. Eski kod tahsis id'sini (okumada atanan rowid)
// tekrar yazınca, yeni id'siz tahsislerin aldığı auto-rowid sonraki açık id ile çakışıyor ve
// "UNIQUE constraint failed: yedek_parca_tahsis.id" ile save geri alınıyordu (servis+kargo hiç yazılmıyordu).
const kotu = JSON.parse(JSON.stringify(reopen));
// En kötü durum: iki farklı satışın tahsislerine AYNI açık id (eski okumadan kalma) + id'siz yeni tahsis
kotu.yedekParcaSatislar.find(x => x.id === 650).tahsisler = [{ id: 1, miktar: 2, customerId: 500 }, { miktar: 3, customerId: null, makinaSerbest: "Yedek" }];
kotu.yedekParcaSatislar.find(x => x.id === 651).tahsisler = [{ id: 1, miktar: 1, customerId: 500 }];
let patladi = false;
try { dbmod.writeBlobToDb(kotu); } catch { patladi = true; }
check("tahsis id çakışması save'i patlatmıyor (regresyon)", !patladi);
dbmod.close();
dbmod.migrateFromJsonIfNeeded();
const reopen2 = dbmod.readBlobFromDb();
check("çift-yazma sonrası yedek parça satışları hâlâ 2", (reopen2.yedekParcaSatislar || []).length === 3);
check("çift-yazma sonrası 650 tahsisleri korundu (2 adet)", (reopen2.yedekParcaSatislar.find(x => x.id === 650)?.tahsisler || []).length === 2);
check("çift-yazma sonrası 651 tahsisi korundu (1 adet)", (reopen2.yedekParcaSatislar.find(x => x.id === 651)?.tahsisler || []).length === 1);
check("tahsis artık id taşımıyor (SQLite yönetir)", (reopen2.yedekParcaSatislar.find(x => x.id === 650)?.tahsisler || []).every(t => t.id === undefined));

// ── REGRESYON: yetim müşteri FK'si (silinmiş müşteriye bağlı görüşme/dosya) TÜM save'i patlatıyordu ──
// SettingsTrash bir müşteriyi kalıcı silerken görüşme/dosyalarını temizlemezse customerId artık olmayan
// bir müşteriye işaret eder → dosyalar/gorusmeler INSERT "FOREIGN KEY constraint failed" ile transaction'ı
// geri alır ve uygulamada HİÇBİR alan kaydedilemez. db.cjs yazımda yetim satırları atlayarak self-heal yapmalı.
const yetim = JSON.parse(JSON.stringify(reopen2));
const YOK_MUSTERI = 999999; // customers'ta olmayan id
yetim.gorusmeler = [
  { id: 7000, customerId: 500, tarih: "2026-08-01", not: "geçerli" },       // geçerli — korunmalı
  { id: 7001, customerId: YOK_MUSTERI, tarih: "2026-08-01", not: "yetim" }, // yetim — atlanmalı
];
yetim.dosyalar = [
  { id: 8000, customerId: 500, refType: "makina", ad: "gecerli.pdf", dosyaAdi: "g.pdf" },     // geçerli — korunmalı
  { id: 8001, customerId: YOK_MUSTERI, refType: "makina", ad: "yetim.pdf", dosyaAdi: "y.pdf" }, // yetim — atlanmalı
  { id: 8002, dealerId: 3, refType: "makina", ad: "bayi.pdf", dosyaAdi: "b.pdf" },             // bayi (customerId yok) — korunmalı
];
let yetimPatladi = false;
try { dbmod.writeBlobToDb(yetim); } catch (e) { yetimPatladi = true; console.error("yetim yazma hatası:", e.message); }
check("yetim müşteri FK'si save'i patlatmıyor (regresyon)", !yetimPatladi);
dbmod.close();
dbmod.migrateFromJsonIfNeeded();
const reopen3 = dbmod.readBlobFromDb();
check("yetim görüşme atlandı, geçerli korundu", (() => {
  const g = reopen3.gorusmeler || [];
  return g.some(x => x.id === 7000) && !g.some(x => x.id === 7001);
})());
check("yetim dosya atlandı, geçerli + bayi dosyası korundu", (() => {
  const d = reopen3.dosyalar || [];
  return d.some(x => x.id === 8000) && d.some(x => x.id === 8002) && !d.some(x => x.id === 8001);
})());

fs.rmSync(tmpDir, { recursive: true, force: true });
if (fail) { console.error(`${fail} kontrol BASARISIZ`); process.exit(1); }
console.log("TUM KONTROLLER GECTI");
process.exit(0);
