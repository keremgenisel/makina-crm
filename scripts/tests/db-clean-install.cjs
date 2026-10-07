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
    customers: [{ id: 1, name: "İlk", model: "AK100", brutKg: 500, satisKuru: 38.5, uretimTarihi: "2026-08-01",
      odemePlani: [{ id: 1, vadeTarihi: "2026-09-01", tutar: 1000, odemeId: null }] }],
    teklifler: [{ id: 9, type: "teklif", no: "T-9", firma: "B", aliciTipi: "bayi", dealerId: 2, nihaiMusteriId: 1, uretilenKalemler: ["a"], satirlar: [] }],
    stock: [{ id: 3, model: "AK100", serialNo: "D-1", addedDate: "2026-09-01", note: "Silinen müşteriden geri döndü", uretimTarihi: "2026-05-05", partiId: 35 }],
    uretimFormlari: [{ id: 7, baslangicTarihi: "2026-07-01", bitisTarihi: "2026-07-05", kapali: true, not: "n", satirlar: [] }],
    // Yeni ensureColumns sütunları: anlaşmasız dış firma alanları + servis panosu durumu temiz kurulumda oluşmalı
    services: [{ id: 5, customerId: 1, type: "Periyodik Bakım", islemFirma: "Diğer", islemFirmaAd: "Dış Servis", islemFirmaTel: "0500", durum: "Bekliyor", tech: "Ali Veli", panoGizli: true, fabrikaGirisZamani: "2026-07-20T08:00:00",
      odendi: true, yontem: "Kredi Kartı", taksitSayisi: 1, kartKomisyonu: { taksit: 1, oran: 3.1, toplamKesinti: 200, blokajGun: 40, hesabaGecis: "2026-08-31", yansitildi: false } }],
    partSales: [{ id: 6, customerId: 1, tur: "Kalıp", ad: "K1", hesapId: 5, satisFirma: "Diğer", satisFirmaAd: "Aracı",
      teslimSekli: "kargo",
      teslimatFarkli: true, teslimatAd: "Depo", teslimatAdres: "Cad 1", teslimatSehir: "Bursa", teslimatIlce: "Nilüfer", teslimatUlke: "Türkiye",
      odendi: true, yontem: "Çek", vadeTarihi: "2026-11-01", tahsilEdildi: true }],
    // Temiz kurulumda yedek parça satışı + tahsis child tablosu oluşmalı (yazma çökmemeli)
    yedekParcaSatislar: [{ id: 8, dealerId: 2, teklifId: 9, teklifKalemId: "a", partId: "3", miktar: 5, birimFiyat: 90, currency: "TRY", tarih: "2026-07-15", odendi: true, yontem: "Kredi Kartı", taksitSayisi: 6, kartKomisyonu: { taksit: 6, oran: 9.34, toplamKesinti: 54, blokajGun: 0, yansitildi: false }, kargoDurum: "Hazırlanıyor", tahsisler: [{ miktar: 2, customerId: 1, serialNo: "SN", makinaSerbest: "", tarih: "2026-07-16" }] }],
    calisanlar: [{ id: 9, ad: "Ali Veli" }],
    // Gider kaydı (spec 0001): temiz kurulumda gider tabloları + model alt tablosu + giderAyarlari kolonu oluşmalı
    giderTurleri: [{ id: 30, ad: "Hammadde", davranis: "normal" }, { id: 38, ad: "SGK", davranis: "sgk" }], // spec 0074 AC-33
    tedarikciler: [{ id: 31, ad: "Tedarikçi A" }, { id: 39, ad: "Çöpteki", deletedAt: "2026-10-01T09:00:00.000Z" }], // spec 0068 R9b
    giderTanimlari: [{ id: 32, turId: 30, ad: "Sarf", tutar: 100, kdvYonu: "dahil", dagitimAy: 6, baslangicAy: "2026-07", uretilenAylar: [], modelSatirlari: [], tevkifatli: true, tevkifatPay: 9, tevkifatPayda: 10 }], // spec 0075 AC-37
    giderler: [{ id: 33, tarih: "2026-07-10", turId: 30, tutar: 1000, kdvOrani: 20, kdvYonu: "dahil", dagitimAy: 12, odendi: false, tedarikciId: 31, atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 100, adet: 5 }],
      ekOdemeler: [{ tur: "ikramiye", aciklama: "Bayram", resmiTutar: 500, eldenTutar: null }],
      taksitler: [{ id: 7001, hedef: "ana", sira: 1, vade: "2026-07-15", tutar: 600, odendi: true, odemeTarihi: "2026-07-15" }, { id: 7002, hedef: "ana", sira: 2, vade: "2026-08-15", tutar: 600, odendi: false, odemeTarihi: null }] },
      // Spec 0074 AC-33: SGK davranışlı kalem temiz kurulumda da yazılır.
      // Spec 0075 AC-37: tevkifatlı kalem temiz kurulumda da yazılır.
      { id: 35, tarih: "2026-07-20", turId: 30, aciklama: "Temizlik", tutar: 1000, kdvOrani: 20, odendi: false, atamaTur: "", modelSatirlari: [], tevkifatli: true, tevkifatPay: 9, tevkifatPayda: 10,
        taksitler: [{ id: 7021, hedef: "ana", sira: 1, vade: "2026-07-31", tutar: 1020, odendi: false, odemeTarihi: null }, { id: 7022, hedef: "tevkifat", sira: 1, vade: "2026-08-26", tutar: 180, odendi: false, odemeTarihi: null }] },
      { id: 36, tarih: "2026-07-31", turId: 38, aciklama: "Temmuz SGK", tutar: 4200, kdvOrani: 0, tedarikciId: null, odendi: false, atamaTur: "", modelSatirlari: [] },
      // Spec 0054 AC-21: ek ödeme hedefleri temiz kurulumda da yazılır.
      { id: 37, tarih: "2026-07-31", turId: 30, resmiTutar: 1000, eldenTutar: 800, sgkTutar: 300, yolParasi: 50, tutar: null, kdvOrani: 0, odendi: false, atamaTur: "", modelSatirlari: [],
        ekOdemeler: [{ tur: "prim", aciklama: "", resmiTutar: 200, eldenTutar: 100 }],
        taksitler: [{ id: 7011, hedef: "ana", sira: 1, vade: "2026-07-31", tutar: 1000, odendi: false, odemeTarihi: null }, { id: 7012, hedef: "elden", sira: 1, vade: "2026-07-31", tutar: 800, odendi: false, odemeTarihi: null },
          { id: 7013, hedef: "ekResmi", sira: 1, vade: "2026-07-31", tutar: 200, odendi: false, odemeTarihi: null }, { id: 7014, hedef: "ekElden", sira: 1, vade: "2026-07-31", tutar: 100, odendi: false, odemeTarihi: null },
          { id: 7015, hedef: "sgk", sira: 1, vade: "2026-08-15", tutar: 300, odendi: false, odemeTarihi: null }] }],
    standartGiderler: [{ id: 34, grupId: 34, ad: "Kira", tutar: 20000, baslangicAy: "2026-07" }],
    uretimPartileri: [{ id: 35, ad: "P1", baslangicAy: "2026-07", bitisAy: null }, { id: 40, ad: "P0", baslangicAy: "2026-06", bitisAy: null, deletedAt: "2026-10-01T09:00:00.000Z" }], // spec 0068 R9b
    // Spec 0058: temiz kurulumda kasa_kapsam_disi tablosu.
    kasaKapsamDisi: [{ id: 39, tur: "hareket", kaynak: null, kayitId: 38, zaman: "2026-10-01T10:00:00.000Z" }],
    // Spec 0040: temiz kurulumda cekler tablosu ve hesap_hareketleri.cekId sütunu.
    cekler: [{ id: 36, paymentId: 37, no: "1", banka: "Z", tur: "hamiline", durum: "portfoy", gecmis: [] },
      // Spec 0049: temiz kurulumda çek tablosunun yeni sütunları.
      { id: 38, yon: "verilen", paymentId: null, no: "2", banka: "Z", tur: "hamiline", durum: "yazildi", tutar: 100, vadeTarihi: "2026-12-01", hesapId: 5, alacakliAd: "X", gecmis: [] }],
    hesapHareketleri: [{ id: 38, tur: "odeme", tarih: "2026-07-01", tutar: 1, giderId: 1, cekId: 36 }],
    payments: [{ id: 10, customerId: 1, tarih: "2026-07-22", tutar: 5000, currency: "TRY", yontem: "Kredi Kartı", taksitSayisi: 1, kartKomisyonu: { taksit: 1, oran: 3.1, toplamKesinti: 200, blokajGun: 40, hesabaGecis: "2026-08-31", yansitildi: false } }],
    appSettings: { autoBackup: false, teklifTakipGun: 3,
      mailTemplates: { teklifProforma: { konu: "K", metin: "M" } },
      krediKartiKomisyonlari: { bsmv: 5, satirlar: [{ taksit: 3, oran: 7.47, katkiPayi: 0.5, blokajGun: 0 }] },
      calismaSaatleri: { baslangic: "08:30", bitis: "19:00", gunler: [1, 2, 3, 4, 5], molalar: [{ baslangic: "12:30", bitis: "13:30" }] },
      giderAyarlari: { stopajOrani: 20, yururlukAy: "2026-07" } },
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
check("temiz kurulumda spec 0006 sütunları oluştu (teklif alıcı/üretim, yedek parça belge bağı)", (() => {
  const t = (blob.teklifler || []).find(x => x.id === 9);
  const y = (blob.yedekParcaSatislar || []).find(x => x.id === 8);
  const ok = t?.aliciTipi === "bayi" && t?.dealerId === 2 && t?.nihaiMusteriId === 1 && t?.uretilenKalemler?.[0] === "a" && y?.teklifId === 9 && y?.teklifKalemId === "a";
  return ok;
})());
check("temiz kurulumda uretim_partileri tablosu ve stock.partiId sütunu oluştu (spec 0022)", (blob.uretimPartileri || []).length === 2 && (blob.stock || []).find(x => x.id === 3)?.partiId === 35);
check("spec 0068 AC-20: temiz kurulumda tedarikciler ve uretim_partileri deletedAt sütunu oluştu", (blob.tedarikciler || []).find(x => x.id === 39)?.deletedAt === "2026-10-01T09:00:00.000Z" && (blob.uretimPartileri || []).find(x => x.id === 40)?.deletedAt === "2026-10-01T09:00:00.000Z");
check("temiz kurulumda üç bölümün hesapId sütunu oluştu (spec 0044)", (blob.partSales || [])[0]?.hesapId === 5);
check("temiz kurulumda cekler tablosunun 0049 sütunları oluştu (AC-25)", (blob.cekler || []).find(c => c.id === 38)?.hesapId === 5 && (blob.cekler || []).find(c => c.id === 38)?.tutar === 100);
check("temiz kurulumda cekler tablosu ve hesap_hareketleri.cekId sütunu oluştu (spec 0040)", (blob.cekler || [])[0]?.no === "1" && (blob.hesapHareketleri || [])[0]?.cekId === 36);
check("temiz kurulumda stock.uretimTarihi sütunu oluştu (spec 0002)", (blob.stock || []).find(x => x.id === 3)?.uretimTarihi === "2026-05-05");
check("temiz kurulumda satisKuru/uretimTarihi sütunları oluştu (spec 0002)", (() => {
  const c = (blob.customers || []).find(x => x.id === 1);
  return c?.satisKuru === 38.5 && c?.uretimTarihi === "2026-08-01";
})());
check("appSettings JSON sütunları tam turu", blob.appSettings?.mailTemplates?.teklifProforma?.konu === "K" && blob.appSettings?.teklifTakipGun === 3);
check("temiz kurulumda calismaSaatleri kolonu oluştu + tam turu", blob.appSettings?.calismaSaatleri?.baslangic === "08:30" && blob.appSettings?.calismaSaatleri?.molalar?.[0]?.baslangic === "12:30");
check("temiz kurulumda dış firma sütunları oluştu (service)", (() => { const s = (blob.services || []).find(x => x.id === 5); return s?.islemFirma === "Diğer" && s?.islemFirmaAd === "Dış Servis" && s?.islemFirmaTel === "0500"; })());
check("temiz kurulumda dış firma sütunları oluştu (partSale)", (() => { const p = (blob.partSales || []).find(x => x.id === 6); return p?.satisFirma === "Diğer" && p?.satisFirmaAd === "Aracı"; })());
check("temiz kurulumda Extra Kalıp teslimat sütunları oluştu (partSale)", (() => { const p = (blob.partSales || []).find(x => x.id === 6); return p?.teslimatFarkli === true && p?.teslimatAd === "Depo" && p?.teslimatSehir === "Bursa" && p?.teslimatIlce === "Nilüfer"; })());
check("temiz kurulumda Extra Kalıp teslimSekli sütunu oluştu (partSale)", (() => { const p = (blob.partSales || []).find(x => x.id === 6); return p?.teslimSekli === "kargo"; })());
check("temiz kurulumda ödeme yöntemi sütunları oluştu (partSale çek)", (() => { const p = (blob.partSales || []).find(x => x.id === 6); return p?.yontem === "Çek" && p?.vadeTarihi === "2026-11-01" && p?.tahsilEdildi === true; })());
check("temiz kurulumda servis durum + panoGizli sütunu + çalışanlar (meta)", (() => { const s = (blob.services || []).find(x => x.id === 5); const c = (blob.calisanlar || []).find(x => x.id === 9); return s?.durum === "Bekliyor" && s?.panoGizli === true && c?.ad === "Ali Veli"; })());
check("temiz kurulumda servis zaman damgası sütunu oluştu", (() => { const s = (blob.services || []).find(x => x.id === 5); return s?.fabrikaGirisZamani === "2026-07-20T08:00:00"; })());
check("temiz kurulumda servis ödeme yöntemi + kredi kartı sütunları oluştu", (() => { const s = (blob.services || []).find(x => x.id === 5); return s?.yontem === "Kredi Kartı" && s?.taksitSayisi === 1 && s?.kartKomisyonu?.blokajGun === 40 && s?.kartKomisyonu?.hesabaGecis === "2026-08-31"; })());
check("temiz kurulumda yedek parça satışı + tahsis tabloları oluştu", (() => { const s = (blob.yedekParcaSatislar || []).find(x => x.id === 8); return s?.miktar === 5 && s?.dealerId === 2 && (s?.tahsisler || [])[0]?.customerId === 1 && s?.tahsisler[0]?.serialNo === "SN"; })());
check("temiz kurulumda yedek parça ödeme yöntemi sütunu oluştu", (() => { const s = (blob.yedekParcaSatislar || []).find(x => x.id === 8); return s?.yontem === "Kredi Kartı"; })());
check("temiz kurulumda kredi kartı taksit + komisyon sütunları oluştu (yedek parça)", (() => { const s = (blob.yedekParcaSatislar || []).find(x => x.id === 8); return s?.taksitSayisi === 6 && s?.kartKomisyonu?.oran === 9.34 && s?.kartKomisyonu?.toplamKesinti === 54; })());
check("temiz kurulumda kredi kartı taksit + komisyon sütunları oluştu (payment, blokaj)", (() => { const p = (blob.payments || []).find(x => x.id === 10); return p?.taksitSayisi === 1 && p?.kartKomisyonu?.blokajGun === 40 && p?.kartKomisyonu?.hesabaGecis === "2026-08-31"; })());
check("spec 0075 AC-37: temiz kurulumda tevkifat sütunları iki tabloda var ve 'tevkifat' satırı yazıldı", (() => { const g = (blob.giderler || []).find(x => x.id === 35); const t = (blob.giderTanimlari || []).find(x => x.id === 32); return g?.tevkifatli === true && g.tevkifatPay === 9 && (g.taksitler || []).some(x => x.hedef === "tevkifat" && x.tutar === 180) && t?.tevkifatli === true && t.tevkifatPayda === 10; })());
check("spec 0074 AC-33: temiz kurulumda SGK türü ve SGK kalemi yazıldı", (() => { const g = (blob.giderler || []).find(x => x.id === 36); return (blob.giderTurleri || []).find(t => t.id === 38)?.davranis === "sgk" && g?.turId === 38 && g.tutar === 4200; })());
check("spec 0070 AC-5: temiz kurulumda sgkTutar/yolParasi sütunları ve SGK satırı var", (() => { const g = (blob.giderler || []).find(x => x.id === 37); return g?.sgkTutar === 300 && g.yolParasi === 50 && (g.taksitler || []).some(t => t.hedef === "sgk" && t.vade === "2026-08-15"); })());
check("spec 0072 AC-23: temiz kurulumda dagitimAy sütunu iki tabloda var", (blob.giderler || []).find(x => x.id === 33)?.dagitimAy === 12 && (blob.giderTanimlari || []).find(x => x.id === 32)?.dagitimAy === 6);
check("spec 0071 AC-16: temiz kurulumda kdvYonu sütunu iki tabloda var", (blob.giderler || []).find(x => x.id === 33)?.kdvYonu === "dahil" && (blob.giderTanimlari || []).find(x => x.id === 32)?.kdvYonu === "dahil");
check("temiz kurulumda gider ek ödeme tablosu oluştu (spec 0023)", ((blob.giderler || []).find(x => x.id === 33)?.ekOdemeler || []).length === 1);
check("spec 0054 AC-21: temiz kurulumda ek ödeme hedef satırları (ekResmi, ekElden) yazıldı", ((blob.giderler || []).find(x => x.id === 37)?.taksitler || []).map(x => x.hedef).join() === "ana,elden,ekResmi,ekElden,sgk"); // spec 0070: aynı fikstürde SGK satırı da var
check("spec 0058 AC-14: temiz kurulumda kasa_kapsam_disi tablosu oluştu ve giriş yazıldı", (blob.kasaKapsamDisi || []).map(x => `${x.id}:${x.tur}:${x.kayitId}`).join() === "39:hareket:38");
check("temiz kurulumda gider ödeme satırı tablosu oluştu ve kimlikler yazıldı (spec 0021)", ((blob.giderler || []).find(x => x.id === 33)?.taksitler || []).map(x => x.id).join() === "7001,7002");
check("temiz kurulumda gider tabloları + model alt tablosu + giderAyarlari oluştu", (() => { const g = (blob.giderler || []).find(x => x.id === 33); return g?.tedarikciId === 31 && g?.modelSatirlari?.[0]?.adet === 5 && (blob.tedarikciler || []).length === 2 && (blob.giderTanimlari || []).length === 1 && (blob.giderTurleri || []).length === 2 && (blob.standartGiderler || []).length === 1 && blob.appSettings?.giderAyarlari?.yururlukAy === "2026-07"; })());
check("temiz kurulumda appSettings krediKartiKomisyonlari kolonu oluştu", (() => { const a = blob.appSettings?.krediKartiKomisyonlari; return a?.bsmv === 5 && a?.satirlar?.[0]?.oran === 7.47; })());

// users.permissions (ensureColumns ile gelir) — kullanıcı yazma/okuma çökmemeli
let userHata = null;
try { dbmod.createUser("admin", "hash", "user", JSON.stringify({ customerActions: [] })); }
catch (e) { userHata = e; }
check("permissions sütununa kullanıcı yazımı çökmüyor", userHata === null && dbmod.getUserByUsername("admin")?.permissions === JSON.stringify({ customerActions: [] }));

fs.rmSync(tmpDir, { recursive: true, force: true });
if (fail) { console.error(`${fail} kontrol BASARISIZ`); process.exit(1); }
console.log("TUM KONTROLLER GECTI");
process.exit(0);
