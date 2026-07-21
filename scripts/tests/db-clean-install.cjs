// Temiz kurulum şema testi — Electron altında koşar (tests/db-electron.test.js başlatır).
// Regresyon: ilk açılışta (data.db ve data.json YOKKEN) yalnızca SCHEMA_SQL çalışıp
// ensureColumns migration'ları atlanıyordu; sonradan eklenen sütunlar (ör.
// uretim_formlari.baslangicTarihi/bitisTarihi/kapali, users.permissions) eksik kalıyor,
// ilk oturumda o alanlara yazan kayıt SQLITE_ERROR ile çöküyordu. Artık applyColumnMigrations
// üç açılış dalında da çağrılıyor. Bu test tam da o boş-dizin (branch 2) yolunu koşturur.
const path = require("path");
const os = require("os");
const fs = require("fs");
const Module = require("module");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-clean-")); // BOŞ: data.db yok, data.json yok
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "electron") return { app: { getPath: () => tmpDir } };
  return origLoad(request, parent, isMain);
};

const root = path.join(__dirname, "..", "..");
let fail = 0;
const check = (name, ok) => { console.log((ok ? "PASS" : "FAIL") + "  " + name); if (!ok) fail++; };

process.on("uncaughtException", (e) => { console.error("FAIL (uncaught):", e && e.stack || e); process.exit(1); });

const dbmod = require(path.join(root, "electron", "db.cjs"));
dbmod.migrateFromJsonIfNeeded();
check("temiz kurulumda sqlite aktif", dbmod.isActive());

// ensureColumns ile eklenen sütunlara yazma ilk oturumda çökmemeli
let hata = null;
try {
  dbmod.writeBlobToDb({
    customers: [{ id: 1, name: "İlk", model: "AK100", brutKg: 500,
      odemePlani: [{ id: 1, vadeTarihi: "2026-09-01", tutar: 1000, odemeId: null }] }],
    uretimFormlari: [{ id: 7, baslangicTarihi: "2026-07-01", bitisTarihi: "2026-07-05", kapali: true, not: "n", satirlar: [] }],
    // Yeni ensureColumns sütunları: anlaşmasız dış firma alanları + servis panosu durumu temiz kurulumda oluşmalı
    services: [{ id: 5, customerId: 1, type: "Periyodik Bakım", islemFirma: "Diğer", islemFirmaAd: "Dış Servis", islemFirmaTel: "0500", durum: "Bekliyor", tech: "Ali Veli", panoGizli: true, fabrikaGirisZamani: "2026-07-20T08:00:00" }],
    partSales: [{ id: 6, customerId: 1, tur: "Kalıp", ad: "K1", satisFirma: "Diğer", satisFirmaAd: "Aracı" }],
    calisanlar: [{ id: 9, ad: "Ali Veli" }],
    appSettings: { autoBackup: false, teklifTakipGun: 3,
      mailTemplates: { teklifProforma: { konu: "K", metin: "M" } },
      calismaSaatleri: { baslangic: "08:30", bitis: "19:00", gunler: [1, 2, 3, 4, 5], molalar: [{ baslangic: "12:30", bitis: "13:30" }] } },
  });
} catch (e) { hata = e; }
check("ilk oturumda üretim formu / yeni sütunlara yazma çökmüyor", hata === null);

const blob = dbmod.readBlobFromDb();
check("uretim formu baslangic/bitis/kapali tam turu", (() => {
  const u = (blob.uretimFormlari || []).find(x => x.id === 7);
  return u?.baslangicTarihi === "2026-07-01" && u?.bitisTarihi === "2026-07-05" && u?.kapali === true;
})());
check("customer brutKg + odemePlani tam turu", (() => {
  const c = (blob.customers || []).find(x => x.id === 1);
  return c?.brutKg === 500 && c?.odemePlani?.[0]?.vadeTarihi === "2026-09-01";
})());
check("appSettings JSON sütunları tam turu", blob.appSettings?.mailTemplates?.teklifProforma?.konu === "K" && blob.appSettings?.teklifTakipGun === 3);
check("temiz kurulumda calismaSaatleri kolonu oluştu + tam turu", blob.appSettings?.calismaSaatleri?.baslangic === "08:30" && blob.appSettings?.calismaSaatleri?.molalar?.[0]?.baslangic === "12:30");
check("temiz kurulumda dış firma sütunları oluştu (service)", (() => { const s = (blob.services || []).find(x => x.id === 5); return s?.islemFirma === "Diğer" && s?.islemFirmaAd === "Dış Servis" && s?.islemFirmaTel === "0500"; })());
check("temiz kurulumda dış firma sütunları oluştu (partSale)", (() => { const p = (blob.partSales || []).find(x => x.id === 6); return p?.satisFirma === "Diğer" && p?.satisFirmaAd === "Aracı"; })());
check("temiz kurulumda servis durum + panoGizli sütunu + çalışanlar (meta)", (() => { const s = (blob.services || []).find(x => x.id === 5); const c = (blob.calisanlar || []).find(x => x.id === 9); return s?.durum === "Bekliyor" && s?.panoGizli === true && c?.ad === "Ali Veli"; })());
check("temiz kurulumda servis zaman damgası sütunu oluştu", (() => { const s = (blob.services || []).find(x => x.id === 5); return s?.fabrikaGirisZamani === "2026-07-20T08:00:00"; })());

// users.permissions (ensureColumns ile gelir) — kullanıcı yazma/okuma çökmemeli
let userHata = null;
try { dbmod.createUser("admin", "hash", "user", JSON.stringify({ customerActions: [] })); }
catch (e) { userHata = e; }
check("permissions sütununa kullanıcı yazımı çökmüyor", userHata === null && dbmod.getUserByUsername("admin")?.permissions === JSON.stringify({ customerActions: [] }));

fs.rmSync(tmpDir, { recursive: true, force: true });
if (fail) { console.error(`${fail} kontrol BASARISIZ`); process.exit(1); }
console.log("TUM KONTROLLER GECTI");
process.exit(0);
