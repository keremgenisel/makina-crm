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
  customers: [{ id: 500, name: "Müşteri", model: "AK100_DS", fromTeklifId: 101, brutKg: 850,
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
  services: [{ id: 2, customerId: 500, type: "Garanti İçi", odendi: false, durum: "Yapılıyor", tech: "Ahmet Yılmaz", panoGizli: false,
    fabrikaGirisZamani: "2026-07-20T09:15:00", bakimBaslangicZamani: "2026-07-20T11:30:00", bitisZamani: "2026-07-20T14:45:00",
    islemFirma: "Diğer", islemFirmaAd: "Harici Servis Ltd", islemFirmaYetkili: "Ahmet Yılmaz", islemFirmaTel: "05551234567", islemFirmaAdres: "Organize Sanayi 5. Cadde No:12", islemFirmaUlke: "Türkiye", islemFirmaSehir: "Bursa" },
    { id: 3, customerId: 500, type: "Periyodik Bakım", odendi: true, durum: "Tamamlandı", tech: "Mehmet Demir", panoGizli: true,
      // Servise ödeme yöntemi: kredi kartı + taksit komisyonu snapshot (satış tarafıyla aynı alanlar).
      yontem: "Kredi Kartı", taksitSayisi: 3, kartKomisyonu: { taksit: 3, oran: 7.47, toplamKesinti: 1435, blokajGun: 0, hesabaGecis: "2026-07-20", yansitildi: false },
      // Değişen parçalar JSON olarak saklanır (miktar/fiyat dahil); parça ücreti = miktar × fiyat = 18000.
      degisenParcalar: [{ partId: "7", ad: "aaaaaa", miktar: 2, fiyat: 9000, disTedarik: false }], parcaUcreti: 18000, parcaCurrency: "TRY", parcaGarantiDisi: true }],
  calisanlar: [{ id: 71, ad: "Ahmet Yılmaz" }, { id: 72, ad: "Mehmet Demir" }],
  partSales: [{ id: 600, customerId: 500, tur: "Kalıp", ad: "Adana", olcu: "55x125", ucret: 100, odendi: false, teklifId: 101, uretimFormGonder: true, uretimFormId: 88,
    satisFirma: "Diğer", satisFirmaAd: "Aracı Firma", satisFirmaYetkili: "Mehmet Demir", satisFirmaTel: "05559876543", satisFirmaUlke: "Türkiye", satisFirmaSehir: "İzmir",
    kargoDurum: "Kargoya Verildi", kargoFirma: "Yurtiçi", kargoTakipNo: "KL-1", kargoTarih: "2026-07-20", kargoSorumlusu: "Ahmet", panoDusmeZamani: "2026-07-25T08:00", panoGizli: true, olusturmaZamani: "2026-07-20T14:35:10", fabrikaTeslim: true, teslimSekli: "fabrika",
    teslimatFarkli: true, teslimatAd: "Şube Deposu", teslimatTel: "02123334455", teslimatAdres: "Sanayi Mah. 5. Sok No:12", teslimatUlke: "Türkiye", teslimatSehir: "İstanbul", teslimatIlce: "Tuzla",
    yontem: "Kredi Kartı", vadeTarihi: "", tahsilEdildi: false,
    taksitSayisi: 3, kartKomisyonu: { taksit: 3, oran: 7.47, toplamKesinti: 7.97, netTutar: 92.03, blokajGun: 0, hesabaGecis: "2026-07-20", yansitildi: false } }],
  payments: [
    { id: 900, customerId: 500, tarih: "2026-07-22", tutar: 132690.52, currency: "TRY", not: "Kart", yontem: "Kredi Kartı",
      taksitSayisi: 1, kartKomisyonu: { taksit: 1, oran: 3.1, toplamKesinti: 2880, netTutar: 129810, blokajGun: 40, hesabaGecis: "2026-08-31", yansitildi: true, bazTarih: "2026-07-22" } },
  ],
  dealers: [{ id: 3, name: "Bayi X", country: "Türkiye", city: "Kocaeli", ilce: "Gebze" }],
  yedekParcaSatislar: [
    { id: 650, dealerId: 3, aliciTipi: "bayi", partId: "7", miktar: 5, birimFiyat: 120, currency: "TRY", tarih: "2026-07-15", odendi: false, faturaTipi: "Faturalı Yurtiçi",
      kargoFirma: "Yurtiçi Kargo", kargoTakipNo: "TK123", kargoTarih: "2026-07-16", kargoDurum: "Kargoya Verildi", kargoSorumlusu: "Ahmet Yılmaz", panoDusmeZamani: "2026-07-28T08:00", olusturmaZamani: "2026-07-15T10:20:30", batchId: 777001,
      teslimatFarkli: true, teslimatAd: "Şantiye Deposu", teslimatTel: "03121112233", teslimatAdres: "Başkent OSB 15. Cad No:8", teslimatUlke: "Türkiye", teslimatSehir: "Ankara", teslimatIlce: "Sincan",
      yontem: "Kredi Kartı", taksitSayisi: 6, kartKomisyonu: { taksit: 6, oran: 9.34, toplamKesinti: 60.54, netTutar: 539.46, blokajGun: 0, hesabaGecis: "2026-07-15", yansitildi: false },
      tahsisler: [ { miktar: 2, customerId: 500, serialNo: "S-1", makinaSerbest: "", tarih: "2026-07-20" },
                   { miktar: 1, customerId: null, serialNo: "", makinaSerbest: "Bayi X kendi müşterisi", tarih: "2026-07-21" } ] },
    // Alıcı müşteri (bayiye değil son müşteriye satış) — musteriId dolu, dealerId boş; panoGizli (arşiv) true; fabrika teslim
    { id: 651, aliciTipi: "musteri", musteriId: 500, partId: "8", miktar: 3, birimFiyat: 50, currency: "TRY", tarih: "2026-07-18", odendi: true, yontem: "Çek", vadeTarihi: "2026-10-01", tahsilEdildi: true, kargoDurum: "Teslim Edildi", panoGizli: true, fabrikaTeslim: true, tahsisler: [] },
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
  stock: [{ id: 4, model: "AK100_DS", serialNo: "S-1" }], parts: [],
  // Yedek parça stoğu: eski sürümden kalmış NEGATİF satır (miktar -3) okumada/migration'da 0'a çekilmeli.
  partStock: [
    { id: 70, partId: "7", miktar: 12, notlar: "" },
    { id: 71, partId: "8", miktar: -3, notlar: "eski negatif" },
  ],
  notes: [
    { id: 30, content: "Kerem'in notu", updatedAt: "1", olusturan: "kerem" },
    { id: 31, content: "Eski sahipsiz not", updatedAt: "2" },
  ],
  factory: { city: "İstanbul", ilce: "Beşiktaş", name: "Altuntaş Makina", email: "info@altunmak.com", web: "www.altunmak.com", faturaFirmaAdi: "ALTUNMAK MACHINERY LTD.", haritaKonum: { il: "İstanbul", x: 123.4, y: 567.8 } },
  teklifler: [
    { id: 101, type: "teklif", no: "T-1", firma: "Firma", durum: "onaylandi", customerId: 500, satisTamam: true, tur: "makina", satirlar: [] },
    { id: 102, type: "teklif", no: "T-2", firma: "F2", durum: "taslak", satirlar: [] },
  ],
  appSettings: { autoBackup: false, teklifTakipGun: 1, tahsilatTakipGun: 14, autoLockMinutes: 5,
    translations: { fatura: { title: "COMMERCIAL INVOICE" } },
    mailTemplates: { teklifProforma: { konu: "Özel Konu {no}", metin: "Özel metin" } },
    calismaSaatleri: { baslangic: "09:00", bitis: "18:30", gunler: [1, 2, 3, 4, 5, 6],
      molalar: [{ baslangic: "12:30", bitis: "13:30" }, { baslangic: "16:00", bitis: "16:15" }] },
    servisAlarm: { acik: true, sesSn: 30, yanipSn: 45 },
    krediKartiKomisyonlari: { bsmv: 5, satirlar: [{ taksit: 1, oran: 3.1, katkiPayi: 0.5, blokajGun: 40 }, { taksit: 3, oran: 7.47, katkiPayi: 0.5, blokajGun: 0 }] } },
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
// Anlaşmasız dış firma alanları (servis "İşlemi Yapan Firma"=Diğer, kalıp "Satış Yapan Firma"=Diğer)
check("service islemFirma* (Diğer dış servis) roundtrip", (() => { const s = blob.services.find(x => x.id === 2); return s?.islemFirma === "Diğer" && s?.islemFirmaAd === "Harici Servis Ltd" && s?.islemFirmaYetkili === "Ahmet Yılmaz" && s?.islemFirmaTel === "05551234567" && s?.islemFirmaAdres === "Organize Sanayi 5. Cadde No:12" && s?.islemFirmaUlke === "Türkiye" && s?.islemFirmaSehir === "Bursa"; })());
check("service durum (Servis Panosu) roundtrip", blob.services.find(x => x.id === 2)?.durum === "Yapılıyor");
check("service zaman damgaları (giriş/başlangıç/bitiş) roundtrip", (() => { const s = blob.services.find(x => x.id === 2); return s?.fabrikaGirisZamani === "2026-07-20T09:15:00" && s?.bakimBaslangicZamani === "2026-07-20T11:30:00" && s?.bitisZamani === "2026-07-20T14:45:00"; })());
check("service panoGizli (arşiv) boolean roundtrip", (() => { const a = blob.services.find(x => x.id === 2); const b = blob.services.find(x => x.id === 3); return a?.panoGizli === false && b?.panoGizli === true && b?.durum === "Tamamlandı"; })());
check("firma çalışanları (calisanlar meta) roundtrip", (() => { const a = (blob.calisanlar || []).find(c => c.id === 71); const b = (blob.calisanlar || []).find(c => c.id === 72); return a?.ad === "Ahmet Yılmaz" && b?.ad === "Mehmet Demir" && blob.calisanlar.length === 2; })());
check("partSale satisFirma* (Diğer aracı firma) roundtrip", (() => { const p = blob.partSales.find(x => x.id === 600); return p?.satisFirma === "Diğer" && p?.satisFirmaAd === "Aracı Firma" && p?.satisFirmaYetkili === "Mehmet Demir" && p?.satisFirmaTel === "05559876543" && p?.satisFirmaUlke === "Türkiye" && p?.satisFirmaSehir === "İzmir"; })());
check("partSale kargo alanları (Extra Kalıp panosu) roundtrip; panoGizli boolean", (() => { const p = blob.partSales.find(x => x.id === 600); return p?.kargoDurum === "Kargoya Verildi" && p?.kargoFirma === "Yurtiçi" && p?.kargoTakipNo === "KL-1" && p?.kargoTarih === "2026-07-20" && p?.kargoSorumlusu === "Ahmet" && p?.panoDusmeZamani === "2026-07-25T08:00" && p?.panoGizli === true; })());
check("partSale fabrikaTeslim (Extra Kalıp fabrika teslim, boolean) roundtrip", (() => { const p = blob.partSales.find(x => x.id === 600); return p?.fabrikaTeslim === true; })());
check("partSale teslimSekli (açık teslim şekli işareti) roundtrip", (() => { const p = blob.partSales.find(x => x.id === 600); return p?.teslimSekli === "fabrika"; })());
check("partStock negatif satır 0'a çekilir (stok eksiye düşmez); pozitif satır korunur", (() => { const neg = (blob.partStock || []).find(x => x.id === 71); const pos = (blob.partStock || []).find(x => x.id === 70); return neg?.miktar === 0 && pos?.miktar === 12; })());
check("Faturalı müşteride faturaBedeli persist; Faturasıza çevrilende temizlenmiş bedel geri gelmez (falsy)", (() => { const fatura = blob.customers.find(c => c.id === 500); const faturasiz = blob.customers.find(c => c.id === 501); return Number(fatura?.faturaBedeli) === 600000 && !faturasiz?.faturaBedeli && Number(faturasiz?.fabrikaSatisBedeli) === 500000; })());
check("servis degisenParcalar (miktar/fiyat) + parcaUcreti (miktar×fiyat) roundtrip", (() => { const sv = (blob.services || []).find(x => x.id === 3); const p = sv?.degisenParcalar?.[0]; return p?.miktar === 2 && Number(p?.fiyat) === 9000 && p?.partId === "7" && p?.disTedarik === false && sv?.parcaUcreti === 18000 && sv?.parcaCurrency === "TRY"; })());
check("servis ödeme yöntemi + kredi kartı taksit/komisyon snapshot roundtrip", (() => { const sv = (blob.services || []).find(x => x.id === 3); return sv?.yontem === "Kredi Kartı" && sv?.taksitSayisi === 3 && sv?.kartKomisyonu?.oran === 7.47 && sv?.kartKomisyonu?.toplamKesinti === 1435 && sv?.kartKomisyonu?.yansitildi === false; })());
check("partSale farklı teslimat adresi (Extra Kalıp) roundtrip; teslimatFarkli boolean", (() => { const p = blob.partSales.find(x => x.id === 600); return p?.teslimatFarkli === true && p?.teslimatAd === "Şube Deposu" && p?.teslimatTel === "02123334455" && p?.teslimatAdres === "Sanayi Mah. 5. Sok No:12" && p?.teslimatUlke === "Türkiye" && p?.teslimatSehir === "İstanbul" && p?.teslimatIlce === "Tuzla"; })());
check("partSale ödeme yöntemi (Extra Kalıp) roundtrip", (() => { const p = blob.partSales.find(x => x.id === 600); return p?.yontem === "Kredi Kartı" && p?.tahsilEdildi === false; })());
check("partSale kredi kartı taksit + komisyon snapshot (JSON) roundtrip", (() => { const p = blob.partSales.find(x => x.id === 600); return p?.taksitSayisi === 3 && p?.kartKomisyonu?.oran === 7.47 && p?.kartKomisyonu?.toplamKesinti === 7.97 && p?.kartKomisyonu?.yansitildi === false; })());
check("payment kredi kartı taksit + komisyon snapshot (blokaj, yansitildi, bazTarih) roundtrip", (() => { const p = (blob.payments || []).find(x => x.id === 900); return p?.taksitSayisi === 1 && p?.kartKomisyonu?.blokajGun === 40 && p?.kartKomisyonu?.hesabaGecis === "2026-08-31" && p?.kartKomisyonu?.yansitildi === true && p?.kartKomisyonu?.bazTarih === "2026-07-22"; })());
check("yedek parça satışı kredi kartı taksit + komisyon snapshot roundtrip", (() => { const s = (blob.yedekParcaSatislar || []).find(x => x.id === 650); return s?.taksitSayisi === 6 && s?.kartKomisyonu?.oran === 9.34 && s?.kartKomisyonu?.toplamKesinti === 60.54; })());
check("appSettings krediKartiKomisyonlari (JSON) roundtrip", (() => { const a = blob.appSettings?.krediKartiKomisyonlari; return a?.bsmv === 5 && Array.isArray(a?.satirlar) && a.satirlar.length === 2 && a.satirlar[1]?.taksit === 3 && a.satirlar[1]?.oran === 7.47; })());
check("yedek parça ödeme yöntemi + çek tahsil (boolean) roundtrip", (() => { const s = (blob.yedekParcaSatislar || []).find(x => x.id === 651); return s?.yontem === "Çek" && s?.vadeTarihi === "2026-10-01" && s?.tahsilEdildi === true; })());
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

// ── Tablo atlama bütünlüğü ───────────────────────────────────────────────────
const v2 = { ...JSON.parse(JSON.stringify(blob)), teklifler: blob.teklifler.map(t => t.id === 102 ? { ...t, durum: "gonderildi" } : t) };
delete v2.dataVersion;
dbmod.writeBlobToDb(v2); // sadece teklifler değişti
const out = dbmod.readBlobFromDb();
check("değişen bölüm yazıldı", out.teklifler.find(t => t.id === 102)?.durum === "gonderildi");
check("atlanan bölüm korundu (customer)", out.customers[0]?.name === "Müşteri");
check("atlanan bölüm korundu (dealer)", out.dealers[0]?.name === "Bayi X");
check("FK zinciri: service korundu", out.services[0]?.type === "Garanti İçi");

// ── KAPAT → YENİDEN AÇ (uygulama restart) → veri kalıcı mı? (yedek parça satışı regresyonu) ──
dbmod.close();
dbmod.migrateFromJsonIfNeeded();
check("reopen: sqlite yeniden aktif", dbmod.isActive());
const reopen = dbmod.readBlobFromDb();
check("reopen: yedek parça satışları KAYBOLMADI", (reopen.yedekParcaSatislar || []).length === 3);
check("reopen: yedek parça alanları + tahsis korundu", (() => { const s = (reopen.yedekParcaSatislar || []).find(x => x.id === 650); return s?.miktar === 5 && s?.kargoSorumlusu === "Ahmet Yılmaz" && s?.olusturmaZamani === "2026-07-15T10:20:30" && (s?.tahsisler || []).length === 2; })());
check("reopen: servisler korundu", (reopen.services || []).find(x => x.id === 2)?.durum === "Yapılıyor");
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
