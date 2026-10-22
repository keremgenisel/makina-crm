// Spec 0009 (AC-12, plan T9): önce/sonra ekran görüntüsü sayfası. Gerçek ekran bileşenlerini örnek veriyle çizer.
// Yalnız ekran düzeyindeki bileşenleri içe aktarır (Giderler, Documents, Settings, Finance), böylece aynı sayfa
// dönüşümden önce ve sonra değişmeden derlenir. Adres: #ekran=<ad>&tema=light|dark
import "./sabit-zaman.js";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/ui.css";
import { applyTheme } from "../../src/lib/theme.js";
import { Giderler } from "../../src/components/Giderler";
import { Documents } from "../../src/components/Documents";
import { Settings } from "../../src/components/Settings";
import { Finance } from "../../src/components/Finance";
import { Customers } from "../../src/components/Customers";
import { SimpleDealers } from "../../src/components/SimpleDealers";
import { Stock } from "../../src/components/Stock";
import { KargoDetayModal } from "../../src/components/KargoPanosu";
import { Notes } from "../../src/components/Notes";
import { Analiz } from "../../src/components/Analiz";
import { MailComposeModal } from "../../src/components/MailCompose";
import { CalisanManager } from "../../src/components/CalisanManager";
import { GiderForm } from "../../src/components/GiderForm";
import { Dashboard } from "../../src/components/Dashboard";
import { ServisPanosu } from "../../src/components/ServisPanosu";
import { ServiceForm } from "../../src/components/ServiceForm";
import { PartSaleForm } from "../../src/components/PartSaleForm";
import { YedekParcaSatisForm } from "../../src/components/YedekParcaSatisForm";
import { SettingsGiderTanimlari } from "../../src/components/settings/SettingsGiderTanimlari";
import { TANIM_UZUN, TANIM_TURLERI, TANIM_TEDARIKCI, TANIM_CALISAN } from "../tests/layout/gider-tanim-veri.js";
import { hesaplaMakinaMaliyetleri } from "../../src/lib/makinaMaliyeti";
import * as Tasarim from "../../src/components/tasarim";
import { Kasa } from "../../src/components/Kasa";
import { MakinaMaliyeti } from "../../src/components/MakinaMaliyeti";
import { GiderTurManager } from "../../src/components/settings/GiderTurManager";
import * as M88 from "../../tests/fixtures/0088-veri.js";
import * as V97 from "../../tests/fixtures/0097-veri.js";
import { OdemeKayitPenceresi } from "../../src/components/gider/OdemeKayitPenceresi";
import { odemeleriUygula, turHaritasi, giderKalemDogrula } from "../../src/lib/gider";
import { cekleriUygula } from "../../src/lib/cek";
import { giderKasaRaporu, buildGiderKasaRaporuHtml } from "../../src/lib/giderRaporu";
import { girdi as RAPOR_0059_GIRDI } from "../../tests/fixtures/0059-veri";
import { hesaplaAylikRapor } from "../../src/lib/aylikRapor";
import { buildAylikRaporHtml, buildServiceFormHtml } from "../../src/lib/printTemplates";
import App from "../../src/App";
import { KayitPerdesi } from "../../src/components/KayitPerdesi";
import { SettingsTrash } from "../../src/components/settings/SettingsTrash";
import LOGO from "../../src/assets/logo.avif?inline";
import { UserManager } from "../../src/components/settings/UserManager";
import { GlobalSearch } from "../../src/components/GlobalSearch";
import { Harita } from "../../src/components/Harita";

const q = new URLSearchParams(location.hash.slice(1));
const ekran = q.get("ekran") || "giderler-rapor";
if (ekran === "ayarlar-0068-auditlog") {
  // Spec 0068 R1: İşlem Geçmişi'nde üretim partisi satırı okunur adla (yerel IPC köprüsü sahte).
  const SATIRLAR = [
    { ts: "2026-09-23T09:30:00.000Z", username: "muhasebe", role: "user", action: "silindi", entity: "uretim_partisi", entity_id: 901, entity_name: "2026-1", detail: "" },
    { ts: "2026-09-23T09:10:00.000Z", username: "muhasebe", role: "user", action: "olusturuldu", entity: "uretim_partisi", entity_id: 902, entity_name: "2026-2", detail: "" },
    { ts: "2026-09-22T16:00:00.000Z", username: "admin", role: "admin", action: "silindi", entity: "tedarikci", entity_id: 13, entity_name: "Akın Hırdavat", detail: "" },
  ];
  window.auditLog = { get: async (q = {}) => ({ ok: true, rows: SATIRLAR.slice(q.offset || 0, (q.offset || 0) + (q.limit || 10)), total: SATIRLAR.length }) };
}
// Spec 0085 (R23, revizyon 3 P1): Kullanıcı Geçmişi'nde sürüm rozeti ve sunucu PC'deki "Bağlı bilgisayarlar ve sürümleri"
// kartı. Araçta köprü yok: güvenlik geçmişi (yerel IPC) ve sunucu kipindeki appServer sahte kurulur. Araç Settings'e
// version="3.39.0" verdiği için kartın tabanı v3.39.0; satırlar biri eski, biri güncel, biri sürümsüz, biri geri döngü (sayılmaz).
if (ekran === "ayarlar-guvenlik-gecmisi" || ekran === "ayarlar-server-sunucu") {
  const SATIRLAR = [
    { id: 9, ts: "2026-09-23T09:40:00.000Z", actor: "muhasebe", action: "oturum_yenilendi", target: "muhasebe", ip: "192.168.1.21", detail: JSON.stringify({ istemciSurum: "3.39.0" }) },
    { id: 8, ts: "2026-09-23T09:10:00.000Z", actor: "servis", action: "giris_basarili", target: null, ip: "192.168.1.30", detail: JSON.stringify({ rol: "user", ikiAdimli: false, istemciSurum: "3.38.0" }) },
    { id: 7, ts: "2026-09-23T08:50:00.000Z", actor: "deneme", action: "giris_basarisiz", target: null, ip: "192.168.1.44", detail: JSON.stringify({ sebep: "Yanlış şifre", istemciSurum: "3.39.0" }) },
    { id: 6, ts: "2026-09-22T17:20:00.000Z", actor: "depo", action: "oturum_yenilendi", target: "depo", ip: "100.64.0.7", detail: null },
    { id: 5, ts: "2026-09-22T08:00:00.000Z", actor: "admin", action: "giris_basarili", target: null, ip: "127.0.0.1", detail: JSON.stringify({ rol: "admin", ikiAdimli: false }) },
    { id: 4, ts: "2026-09-21T16:00:00.000Z", actor: "admin", action: "kullanici_eklendi", target: "depo", ip: "192.168.1.10", detail: null },
  ];
  window.securityLog = { get: async (q = {}) => { const r = SATIRLAR.filter(x => !q.action || x.action === q.action); return { ok: true, rows: r.slice(q.offset || 0, (q.offset || 0) + (q.limit || 10)), total: r.length }; }, clear: async () => ({ ok: true }) };
  if (ekran === "ayarlar-server-sunucu") {
    const t = {
      getConfig: async () => ({ isServer: true, running: true, port: 3000, ips: ["192.168.1.10"] }),
      apiRequest: async ({ path = "" } = {}) => ({ ok: true, status: 200, data: /2fa/.test(path) ? { enabled: false } : [] }),
    };
    window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  }
}
if (ekran.startsWith("kullanici-izin-kasa")) {
  // Spec 0052: izin ekranı. Geri doldurulmuş (Kasa'lı) ve Kasa'sı kaldırılmış iki kullanıcı; ikincisi düzenlemede açılır.
  const KULLANICILAR = [
    { id: 1, username: "muhasebe", role: "user", is_active: 1, permissions: JSON.stringify({ tabs: ["dashboard", "finance", "gider", "kasa"] }) },
    { id: 2, username: "satinalma", role: "user", is_active: 1, permissions: JSON.stringify({ tabs: ["dashboard", "finance", "gider"], giderActions: ["gider_add", "gider_odeme", "kasa_hesap", "virman"] }) },
  ];
  window.appServer = { apiRequest: async ({ method } = {}) => ({ ok: true, status: 200, data: method === "GET" ? KULLANICILAR : {} }) };
}
if (ekran.startsWith("kullanici-izin-0098")) {
  // Spec 0098: işlem izinleri özelleştirilmiş iki kullanıcı; Kasa'lıda etkisizlik ipucusu yok, Kasa'sızda Kasa grubunda var. İkisinde de
  // "Tahsilat hesabı" grubu kendi notuyla önde.
  const kasali = ekran.endsWith("kasali");
  const KULLANICILAR = [{ id: 1, username: kasali ? "muhasebe" : "satis", role: "user", is_active: 1,
    permissions: JSON.stringify(kasali ? { tabs: ["dashboard", "finance", "gider", "kasa"], giderActions: ["gider_add", "kasa_hesap", "tahsilat_hesap"] }
      : { tabs: ["dashboard", "customers", "stock", "servis"], giderActions: ["tahsilat_hesap"] }) }];
  window.appServer = { apiRequest: async ({ method } = {}) => ({ ok: true, status: 200, data: method === "GET" ? KULLANICILAR : {} }) };
}
if (ekran === "ayarlar-server-istemci") {
  // Sunucuya bağlı istemci: Sunucu Bağlantısı + İki Adımlı Doğrulama bölümleri. Yalnız okuma çağrıları yanıtlanır.
  const t = {
    getConfig: async () => ({ isActive: true, serverUrl: "http://10.0.0.2:3000", username: "kerem", role: "admin" }),
    getServerStatus: async () => ({ hasAdmin: true }),
    // Okuma uçları: 2FA durumu nesne, listeler (kullanıcılar vb.) boş dizi döner.
    apiRequest: async ({ path = "" } = {}) => ({ ok: true, status: 200, data: /2fa/.test(path) ? { enabled: false } : [] }),
  };
  // Diğer çağrılar etkisiz: on* abonelikleri boş iptal fonksiyonu, geri kalanı null döndürür.
  window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
}
// Spec 0064 R34: kilitli ekranlar. Görüntü aracı ikinci kullanıcıyı simüle edemez; kilit köprüsü sahte kurulur ve listelenen
// alanlar (ayar panelinde panel kimliğiyle) başka kullanıcının ("ayse") elindedir. Yalnız "kilit-*" ekranlarında.
if (ekran.startsWith("kilit-")) {
  const KILITLI = { "kilit-gider-formu": ["gider"], "kilit-odeme-penceresi": ["gider"], "kilit-katalog-paneli": ["ayar:models"], "kilit-cop-kutusu": ["ayar:trash"], "kilit-geri-yukleme": [] }[ekran] || [];
  const kilitli = (t, id) => KILITLI.includes(t) || KILITLI.includes(`${t}:${id}`);
  window.crmLocks = {
    acquire: async (t, id, force) => (kilitli(t, id) && !force ? { ok: false, lockedBy: "ayse", lockedAt: "2026-09-23T09:55:00" } : { ok: true }),
    release: async () => {}, releaseAll: async () => {},
    list: async () => (ekran === "kilit-geri-yukleme" ? [{ entity_type: "gider", entity_id: "9001", locked_by: "ayse" }, { entity_type: "ayar", entity_id: "trash", locked_by: "mehmet" }] : []),
  };
  if (ekran === "kilit-geri-yukleme") {
    // Yalnız geri yükleme dosya seçicisi yanıtlanır; diğer çağrılar etkisiz (null).
    const yedek = { app: "altunmak-crm", schemaVersion: 3, exportedAt: "2026-09-20T10:00:00Z", customers: [], services: [], dealers: [], stock: [] };
    window.crmStorage = new Proxy({ restore: async () => yedek }, { get: (o, k) => o[k] ?? (async () => null) });
  }
}
// Spec 0086 (R12, revizyon 3 P1): seçmeli geri yüklemenin paket listesi yalnız bir yedek seçilince çizilir; üç ekran sahte
// yedekle "Yedekten Geri Yükle" adımına kadar gider (Kasa'lı varsayılan, Kasa'sız, gidersiz). Aynı yedek kilit-geri-yukleme'de.
if (ekran.startsWith("ayarlar-backup-paketler")) {
  const yedek = { app: "altunmak-crm", schemaVersion: 3, exportedAt: "2026-09-20T10:00:00Z", customers: [], services: [], dealers: [], stock: [] };
  window.crmStorage = new Proxy({ restore: async () => yedek }, { get: (o, k) => o[k] ?? (async () => null) });
}
// Spec 0043: kenar çubuğu yalnız App kabuğunda çizilir; "uygulama-menu-*" ekranları gerçek App'i örnek veriyle açar.
// Makine yereli menü tercihleri (dar kip, grup durumu) ve tek çocuklu kullanıcı App ilk çizilmeden kurulur.
const UYGULAMA = ekran.startsWith("uygulama-menu");
if (UYGULAMA) {
  try { localStorage.clear(); if (ekran === "uygulama-menu-dar") localStorage.setItem("sidebarDar", "1"); } catch { /* yoksay */ }
  window.crmStorage = { load: async () => ({ customers: [], payments: [], giderler: [], giderTurleri: [], kasaHesaplari: [], hesapHareketleri: [], cekler: [],
    appSettings: { giderAyarlari: { yururlukAy: "2026-01" } }, dataVersion: 1 }), save: async () => true, getVersion: async () => 1 };
  // Spec 0052: Kasa sekme izni. Kasasız kullanıcıda Mali İşler grubu Finans + Giderler; kasalıda Kasa da.
  const SEKME_0052 = ["dashboard", "customers", "dealers", "stock", "finance", "gider", "evrak", "notes", "settings"];
  if (ekran === "uygulama-menu-kasasiz" || ekran === "uygulama-menu-kasali") {
    const tabs = ekran === "uygulama-menu-kasali" ? [...SEKME_0052, "kasa"] : SEKME_0052;
    const t = { getConfig: async () => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role: "user", username: "u", permissions: JSON.stringify({ tabs }) }) };
    window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  }
  if (ekran === "uygulama-menu-tek-cocuk") {
    const t = { getConfig: async () => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role: "user", username: "u",
      permissions: JSON.stringify({ tabs: ["dashboard", "customers", "dealers", "stock", "finance", "evrak", "notes", "settings"] }) }) };
    window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  }
}
applyTheme(q.get("tema") === "dark" ? "dark" : "light");
const bos = () => {};

const TURLER = [
  { id: 1, ad: "Fabrika kirası", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" },
  { id: 4, ad: "Elektrik", davranis: "normal" }, { id: 5, ad: "Hammadde", davranis: "normal" },
];
const TED = [{ id: 11, ad: "Yıldız Gayrimenkul" }, { id: 12, ad: "Bölge Elektrik" }];
const CAL = [{ id: 21, ad: "Hasan Çelik", resmiMaliyet: 30000, eldenMaliyet: 20000 }, { id: 22, ad: "Zeynep Arslan" }];
const MODELLER = [{ model: "AK120_DSC" }, { model: "AK100" }];
// Spec 0087: maliyetli ve maliyetsiz parçalar, adetli kit ve ek maliyet kalemli model.
const PARCA_0087 = [
  { id: 7, ad: "Rulman 6204", kod: "R-6204", tip: "Standart", fiyatTRY: 450, models: ["AK120_DSC", "AK100"], maliyet: 120.5 },
  { id: 8, ad: "Konveyör bant", kod: "KB-1", tip: "Standart", fiyatTRY: 900, models: ["AK120_DSC"] },
  { id: 9, ad: "Perçin", kod: "P-4", tip: "Standart", models: [], maliyet: 0 },
  { id: 10, ad: "Pleksi kapak", kod: "PK-2", tip: "Standart", fiyatTRY: 300, models: [] },
];
// Spec 0096: hammadde tedarikçileri (üçü işaretli) ve kırılımlı parçalar (tutarlı, tutarsız).
const TED_0096 = [{ id: 31, ad: "Demir Çelik A.Ş.", hammadde: true }, { id: 32, ad: "Sac Ltd", hammadde: true }, { id: 33, ad: "Döküm Sanayi", hammadde: true }, ...TED];
const AYNA_0096 = { id: 11, ad: "Ayna mahruti dişlisi takımı", kod: "AM-1", tip: "Standart", models: [], hammaddeler: [{ tedarikciId: 31, tutar: 7000 }, { tedarikciId: 32, tutar: 9000 }, { tedarikciId: 33, tutar: 1000 }] };
const MIL_0096 = { id: 12, ad: "Tahrik mili", kod: "TM-3", tip: "Standart", models: [], maliyet: 300, hammaddeler: [{ tedarikciId: 31, tutar: 4250 }, { tedarikciId: 32, tutar: null }] };
const PARCA_0096 = [AYNA_0096, MIL_0096, ...PARCA_0087];
// Spec 0097: maliyeti iki kez değişmiş parça (başlangıçtan beri 10, 2026-02-01'den 15, 2026-05-01'de boşaltıldı, 2026-06-01'den 18).
const RULMAN_0097 = { id: 13, ad: "Ana rulman", kod: "AR-1", tip: "Standart", fiyatTRY: 900, models: ["AK100"], maliyet: 18,
  maliyetGecmisi: [{ gecerli: "", kurus: 1000 }, { gecerli: "2026-02-01", kurus: 1500 }, { gecerli: "2026-05-01", kurus: null }, { gecerli: "2026-06-01", kurus: 1800 }] };
const PARCA_0097 = [RULMAN_0097, ...PARCA_0096];
const MODELLER_0087 = [
  { model: "AK120_DSC", defaultParcalar: [{ partId: "7", ad: "Rulman 6204", miktar: 4 }],
    ekMaliyetler: [{ ad: "Büküm işçiliği", tutar: 90 }, { ad: "Helis dişli açımı", tutar: 145.6 }] },
  { model: "AK100", defaultParcalar: [{ partId: "7", ad: "Rulman 6204", miktar: 2 }] },
];
const MUSTERILER = [
  { id: 500, name: "Kutu Gıda", model: "AK120_DSC", serialNo: "S-1", currency: "TRY", faturali: "Faturalı Yurtiçi", faturaBedeli: 250000, fabrikaSatisBedeli: 240000, installDate: "2026-08-10", uretimTarihi: "2026-07-15", kalanBorc: 0 },
  { id: 501, name: "Ege Köfte", model: "AK100", serialNo: "S-2", currency: "TRY", faturali: "Faturalı Yurtiçi", faturaBedeli: 180000, installDate: "2026-09-05", uretimTarihi: "2026-08-20", kalanBorc: 20000 },
];
// Spec 0098: panoya düşmüş ücretli servis (müşteri Kutu Gıda).
const PANO_SERVIS_0098 = { id: 9801, customerId: 500, type: "Garanti Dışı", repairPlace: "Yerinde Onarım", servisUcreti: 1500, currency: "TRY", faturaTipi: "Faturalı Yurtiçi",
  date: "2026-09-20", durum: "Bekliyor", islemFirma: "Altuntaş Makina", degisenParcalar: [], odendi: false };
const k = (id, o) => ({ id, tarih: "2026-09-10", turId: 4, tutar: 10000, kdvOrani: 20, odendi: false, ...o });
// Spec 0070: SGK ve yol parası girilmiş iki çalışan (kart) ve iki personel kalemi (resmi + elden satırlı).
// Spec 0074 R18 ile güncellendi: personel kaleminde SGK yok; ayın SGK'sı SGK davranışlı türde tek kalem (kart SGK'sı yalnız öneri).
// Tarih görüntü aracının sabit bugününden (2026-09-23) önce: gelecek tarihli kalem borç kapsamına girmez.
const CAL_0070 = [{ id: 21, ad: "Hasan Çelik", resmiMaliyet: 30000, sgkMaliyet: 9000, eldenMaliyet: 10000, yolParasiMaliyet: 1000 }, { id: 22, ad: "Zeynep Arslan", resmiMaliyet: 25000, sgkMaliyet: 7000, eldenMaliyet: 5000 }];
const TURLER_0074 = [...TURLER, { id: 6, ad: "SGK", davranis: "sgk" }];
const SGK_0074 = { id: 703, tarih: "2026-09-15", turId: 6, tutar: 16000, kdvOrani: 0, kdvYonu: null, tedarikciId: null, aciklama: "Eylül SGK bildirgesi", sonOdemeTarihi: "2026-09-30", ekOdemeler: [], taksitler: [] };
const SGK_0070 = [
  { id: 701, tarih: "2026-09-15", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 10000, yolParasi: 1000, tutar: null, kdvOrani: 0, sonOdemeTarihi: "2026-10-05", ekOdemeler: [],
    taksitler: [{ id: 7011, hedef: "ana", sira: 1, vade: "2026-10-05", tutar: 30000, odendi: false }, { id: 7012, hedef: "elden", sira: 1, vade: "2026-10-05", tutar: 11000, odendi: false }] },
  { id: 702, tarih: "2026-09-15", turId: 3, calisanId: 22, calisanAd: "Zeynep Arslan", resmiTutar: 25000, eldenTutar: 5000, tutar: null, kdvOrani: 0, sonOdemeTarihi: "2026-10-05", ekOdemeler: [],
    taksitler: [{ id: 7021, hedef: "ana", sira: 1, vade: "2026-10-05", tutar: 25000, odendi: false }, { id: 7022, hedef: "elden", sira: 1, vade: "2026-10-05", tutar: 5000, odendi: false }] },
  SGK_0074,
];
const SGK_TANIM_0074 = { id: 74, ad: "SGK", turId: 6, tutar: 0, kdvOrani: 0, kdvYonu: null, tedarikciId: null, baslangicAy: "2026-06", uretilenAylar: [] };
const GIDERLER = [
  k(1, { tedarikciId: 12, aciklama: "Eylül elektrik", sonOdemeTarihi: "2026-09-28" }),
  k(2, { turId: 5, tutar: 42000, tedarikciId: 11, aciklama: "Sac levha", atamaTur: "model", modelSatirlari: [{ modelAd: "AK120_DSC", tutar: 42000 }], odendi: true, odemeTarihi: "2026-09-12" }),
  k(3, { turId: 1, tutar: 25000, kdvOrani: 0, tedarikciId: 11, aciklama: "Eylül kira", tanimId: 71, donem: "2026-09" }),
  k(4, { turId: 1, tutar: 25000, kdvOrani: 0, tedarikciId: 11, aciklama: "Eylül kira", tanimId: 71, donem: "2026-09" }),
  k(5, { turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 20000, tutar: 50000, kdvOrani: 0 }),
  k(6, { turId: 4, tutar: 8000, tarih: "2026-08-10", tedarikciId: 12, aciklama: "Ağustos elektrik", odendi: true }),
  k(7, { turId: 5, tutar: 15000, tarih: "2026-08-12", atamaTur: "makina", makinaTur: "musteri", makinaId: 500, aciklama: "Özel parça" }),
];
// Spec 0075: tevkifatlı kalem (matrah 20.000, %20, 5/10; kayıttaki gibi satırlı: tedarikçiye 22.000, vergi dairesine 2.000),
// Finans KDV kartı için Ağustos'ta bir eşi ve tevkifatlı tanım.
const tvKalem = (id, tarih, vade, tvVade, o = {}) => ({ id, tarih, turId: 4, tutar: 20000, kdvOrani: 20, kdvYonu: "haric", tedarikciId: 12, aciklama: "Nakliye (tevkifatlı)",
  sonOdemeTarihi: vade, odendi: false, tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10, ekOdemeler: [], modelSatirlari: [], atamaTur: "",
  taksitler: [{ id: id * 10 + 1, hedef: "ana", sira: 1, vade, tutar: 22000, odendi: false, odemeTarihi: null }, { id: id * 10 + 2, hedef: "tevkifat", sira: 1, vade: tvVade, tutar: 2000, odendi: false, odemeTarihi: null }], ...o });
const TV_0075 = tvKalem(751, "2026-09-10", "2026-09-30", "2026-10-26");
const TV_AGU_0075 = tvKalem(752, "2026-08-14", "2026-08-31", "2026-09-26");
const TANIM_0075 = { id: 75, ad: "Aylık nakliye", turId: 4, tutar: 12000, kdvOrani: 20, kdvYonu: "haric", tedarikciId: 12, baslangicAy: "2026-06", uretilenAylar: [], tevkifatli: true, tevkifatPay: 2, tevkifatPayda: 10 };
// Spec 0076: kısıtlı (binek araç) yakıt kalemi (matrah 1.000, %20, oran %70; 3 aya dağıtılmış: dağıtım ve kısıt rozeti aynı
// satırda), Ağustos'ta ortak bir kısıtlı kalem (makina maliyeti notu) ve kısıtlı tanım. Yeni sabit içe alınmaz: aynı sayfa
// "önce" çekiminde eski kodla da çizilir (eski kod alanları yok sayar).
const KIS_0076 = { id: 761, tarih: "2026-09-08", turId: 4, tutar: 1000, kdvOrani: 20, kdvYonu: "haric", tedarikciId: 12, aciklama: "Binek araç yakıtı", sonOdemeTarihi: "2026-09-30",
  odendi: false, kisitliGider: true, indirilebilirOran: 70, dagitimAy: 3, ekOdemeler: [], modelSatirlari: [], atamaTur: "", taksitler: [] };
const TANIM_0076 = { id: 76, ad: "Araç yakıtı (binek)", turId: 4, tutar: 3000, kdvOrani: 20, kdvYonu: "haric", tedarikciId: 12, baslangicAy: "2026-06", uretilenAylar: [], kisitliGider: true };
const TANIMLAR = [{ id: 71, ad: "Fabrika kirası", turId: 1, tutar: 25000, kdvOrani: 0, tedarikciId: 11, baslangicAy: "2026-06", uretilenAylar: ["2026-09"] }];
const AYAR = { giderAyarlari: { yururlukAy: "2026-06", stopajOrani: 20, hatirlatmaEsikGun: 7 } };
const SATIS = { customers: MUSTERILER, services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] };
// Spec 0079: tevkifatlı satış faturası. Kutu Gıda'nın makina satışı 5/10, servisi 7/10, kalıbı 2/10, yedek parçası 9/10 tevkifatlı.
// Eski kod alanları yok sayar (önce çekimi aynı sayfayla).
const T79 = (pay) => ({ tevkifatli: true, tevkifatPay: pay, tevkifatPayda: 10 });
const KK_0079 = { bsmv: 5, satirlar: [{ taksit: 1, oran: 3.15, katkiPayi: 0.1, blokajGun: 0 }] };
const MUSTERI_0079 = MUSTERILER.map(c => (c.id === 500 ? { ...c, ...T79(5) } : c));
const SERVIS_0079 = [{ id: 7901, customerId: 500, date: "2026-09-12", type: "Garanti Dışı", repairPlace: "Yerinde Onarım", servisUcreti: 10000, currency: "TRY",
  islemFirma: "Altuntaş Makina", faturaTipi: "Faturalı Yurtiçi", odendi: false, durum: "Bekliyor", degisenParcalar: [], ...T79(7) }];
const KALIP_0079 = [{ id: 7902, customerId: 500, tur: "Kalıp", ad: "Hamburger", olcu: "100", tarih: "2026-09-14", ucret: 8000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi",
  odendi: false, satisFirma: "Altuntaş Makina", ...T79(2) }];
const YP_0079 = [{ id: 7903, aliciTipi: "musteri", musteriId: 500, partId: "7", miktar: 2, birimFiyat: 750, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-09-15",
  odendi: false, tahsisler: [], ...T79(9) }];
// Spec 0095: garanti içi ücretsiz yedek parça satışı. Kutu Gıda'ya iki kalemli ücretsiz kargo partisi (birim fiyat saklı, R12),
// Ege Bayi'ye ücretsiz satış, Akdeniz Servis'e ücretsiz fabrika teslim; garantisi bitmiş makina uyarı ekranı için.
const UCZ_0095 = { ucretsizMi: true, faturaTipi: "", yontem: "", vadeTarihi: "", tahsilEdildi: false, taksitSayisi: null, kartKomisyonu: null, hesapId: null, tahsilatTarihi: null, odendi: false };
const YP_0095 = [
  { id: 9501, aliciTipi: "musteri", musteriId: 500, partId: "7", miktar: 2, birimFiyat: 750, currency: "TRY", tarih: "2026-10-15", batchId: 950, kargoDurum: "Hazırlanıyor", tahsisler: [{ miktar: 2, customerId: 500, serialNo: "", makinaSerbest: "", tarih: "2026-10-15" }], ...UCZ_0095 },
  { id: 9502, aliciTipi: "musteri", musteriId: 500, partId: "7", miktar: 1, birimFiyat: 1200, currency: "TRY", tarih: "2026-10-15", batchId: 950, kargoDurum: "Hazırlanıyor", tahsisler: [{ miktar: 1, customerId: 500, serialNo: "", makinaSerbest: "", tarih: "2026-10-15" }], ...UCZ_0095 },
  { id: 9503, aliciTipi: "bayi", dealerId: 3, partId: "7", miktar: 4, birimFiyat: 350, currency: "TRY", tarih: "2026-10-12", tahsisler: [], ...UCZ_0095 },
  { id: 9504, aliciTipi: "bayi", dealerId: 4, partId: "7", miktar: 1, birimFiyat: 0, currency: "TRY", tarih: "2026-10-10", fabrikaTeslim: true, tahsisler: [], ...UCZ_0095 },
];
const MUSTERI_0095_BITMIS = MUSTERILER.map(c => (c.id === 500 ? { ...c, warrantyEnd: "2025-08-10" } : c));
const MUSTERI_0095_AKTIF = MUSTERILER.map(c => (c.id === 500 ? { ...c, warrantyEnd: "2028-08-10" } : c));
const SATIS_0079 = { ...SATIS, customers: MUSTERI_0079, services: SERVIS_0079, partSales: KALIP_0079, yedekParcaSatislar: YP_0079 };
// Spec 0060 R1, R2: taksitli stopajlı kira, taksitsiz stopajlı kira, tek hedefli taksitli kalem, dört hedefli personel.
let n0060 = 9600;
const k0060 = (f) => giderKalemDogrula(f, { turMap: turHaritasi(TURLER), tedarikciler: TED, uid: () => ++n0060 }).kayit;
const G0060 = [
  k0060({ id: 601, tarih: "2026-09-01", turId: 1, girisYonu: "brut", tutar: 25000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 11, aciklama: "Eylül kira", sonOdemeTarihi: "2026-09-10", stopajTaksitSayisi: 2, stopajVade: "2026-09-20" }),
  k0060({ id: 602, tarih: "2026-09-02", turId: 1, girisYonu: "brut", tutar: 10000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 11, aciklama: "Depo kirası", sonOdemeTarihi: "2026-09-10" }),
  k0060({ id: 603, tarih: "2026-09-03", turId: 5, tutar: 6000, kdvOrani: 0, tedarikciId: 12, aciklama: "Sac", taksitSayisi: 3, sonOdemeTarihi: "2026-09-10" }),
  k0060({ id: 604, tarih: "2026-09-04", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 10000, taksitSayisi: 6, sonOdemeTarihi: "2026-09-30",
    ekOdemeler: [{ tur: "prim", aciklama: "", resmiTutar: 2000, eldenTutar: 1000 }, { tur: "ikramiye", aciklama: "", resmiTutar: 0, eldenTutar: 500 }] }),
];
// Spec 0061 R24: açık kalemler kipi için vadesi girilmemiş eski bir kalem (yaş 90+).
const G0061 = [...G0060, k0060({ id: 605, tarih: "2026-06-15", turId: 5, tutar: 4000, kdvOrani: 0, tedarikciId: 12, aciklama: "Eski sac" })];
const t0060 = (id, h) => G0060.find(x => x.id === id).taksitler.filter(t => t.hedef === h);
const H0060 = [
  { id: 1, tur: "odeme", tarih: "2026-09-15", tutar: t0060(601, "stopaj")[0].tutar, hesapId: 1, giderId: 601, taksitId: t0060(601, "stopaj")[0].id, yontem: "Havale" },
  { id: 2, tur: "odeme", tarih: "2026-09-15", tutar: t0060(602, "stopaj")[0].tutar, hesapId: 1, giderId: 602, taksitId: t0060(602, "stopaj")[0].id, yontem: "Havale" },
  { id: 3, tur: "odeme", tarih: "2026-09-15", tutar: t0060(604, "ana")[0].tutar, hesapId: 1, giderId: 604, taksitId: t0060(604, "ana")[0].id, yontem: "Havale" },
  { id: 4, tur: "odeme", tarih: "2026-09-15", tutar: t0060(603, "ana")[0].tutar, hesapId: 1, giderId: 603, taksitId: t0060(603, "ana")[0].id, yontem: "Havale" },
];

function GiderEkrani({ g0 = GIDERLER, turler = TURLER, ayar = AYAR, t0 = TANIMLAR, p0 = [], musteriler = MUSTERILER, stok = [], h0 = null, rapor = null, cekli = false, tedler = TED, satis = SATIS, parcalar = [] }) {
  const [giderler, setGiderler] = useState(g0);
  // Spec 0024: h0 verilirse ödeme durumu hareketlerden türer (App gibi); verilmezse eski ekranlar saklı durumu okur.
  const [hareketler, setHareketler] = useState(h0);
  const [partiler, setPartiler] = useState(p0);
  const [tanimlar, setTanimlar] = useState(t0);
  const [ted, setTed] = useState(tedler);
  return <Giderler giderler={giderler} setGiderler={setGiderler} giderTanimlari={tanimlar} setGiderTanimlari={setTanimlar}
    giderTurleri={turler} tedarikciler={ted} setTedarikciler={setTed}
    calisanlar={CAL} standardModels={MODELLER} customModels={[]} appSettings={ayar} serverPermissions={null}
    satisVerisi={satis} showToast={bos} customers={musteriler} stock={stok} factory={{ name: "Altuntaş Makina" }} rates={{}} parts={parcalar}
    uretimPartileri={partiler} setUretimPartileri={setPartiler}
    setHesapHareketleri={setHareketler} {...(h0 ? { hesapHareketleri: hareketler, kasaHesaplari: KASA_HESAPLAR, kasaYetki: true } : {})}
    {...(rapor ? { giderKasaRaporVerisi: rapor, kasaYetki: true } : {})}
    {...(cekli ? { cekler: [], setCekler: bos, payments: [], ...(cekli.cekler ? cekli : {}) } : {})} />;
}

const DEALERS = [{ id: 3, name: "Ege Bayi", contact: "Veli Usta", phone: "0232 111", email: "ege@bayi.com", adres: "Bornova", country: "Türkiye", city: "İzmir", bayiMi: true }];
const alt = (id, type, fiyat) => ({ id, type, kod: "", makinaAdi: "", tanim: "", miktar: "1", birimFiyat: String(fiyat), tlKarsiligi: "" });
const T0 = (o = {}) => ({ id: 900, type: "teklif", no: "2026-00001", tarih: "2026-09-20", createdAt: "2026-09-20", dil: "TR", currency: "TRY", durum: "taslak", firma: "Kutu Gıda", satirlar: [
  { rowId: "r1", pickTip: "makina", selectedModel: "AK100", selectedKalip: "", selectedPart: "", subItems: [alt("m1", "makina", 60000)] },
], ...o });
function EvrakEkrani({ teklif }) {
  const [teklifler, setTeklifler] = useState(teklif ? [teklif] : []);
  return <Documents teklifler={teklifler} setTeklifler={setTeklifler} faturalar={[]} setFaturalar={bos} customers={MUSTERILER} partSales={[]}
    allModels={[{ model: "AK100" }]} factory={{ name: "Altuntaş" }} appSettings={{}} showToast={bos} kalipDefs={[{ ad: "Hamburger" }]} parts={[]}
    geoData={{}} loadingGeo={false} serverPermissions={null} dealers={DEALERS} yedekParcaSatislar={[]} onEvrakKaydet={bos} />;
}

const ayarlar = (tab, o = {}) => (
  <Settings initialTab={tab} onInitialTabConsumed={bos} customers={MUSTERILER} services={[]} dealers={DEALERS} stock={[]} setStock={bos} setCustomers={bos}
    setServices={bos} setDealers={bos} version="3.39.0" appSettings={AYAR} setAppSettings={bos} customModels={[]} setCustomModels={bos}
    standardModels={MODELLER} setStandardModels={bos} factory={{ name: "Altuntaş Makina", city: "Konya" }} setFactory={bos} kalipDefs={[{ id: 1, ad: "Hamburger" }]} setKalipDefs={bos}
    calisanlar={CAL} setCalisanlar={bos} rawCalisanlar={CAL} parts={[{ id: 7, ad: "Rulman" }]} setParts={bos} partTypeDefs={[]} setPartTypeDefs={bos} rawPartTypeDefs={[]}
    notes={[]} setNotes={bos} partSales={[]} setPartSales={bos} payments={[]} setPayments={bos} partStock={[]} setPartStock={bos} partStockLog={[]} setPartStockLog={bos}
    showToast={bos} rawCustomers={MUSTERILER} rawServices={[]} rawDealers={DEALERS} rawStock={[]} rawNotes={[]} rawParts={[]} rawPartSales={[]} rawPayments={[]}
    rawKalipDefs={[]} rawCustomModels={[]} rawTeklifler={[]} setTeklifler={bos} faturalar={[]} setFaturalar={bos} rawFaturalar={[]} rawUretimFormlari={[]} setUretimFormlari={bos}
    rawGorusmeler={[]} setGorusmeler={bos} rawDosyalar={[]} setDosyalar={bos} yedekParcaSatislar={[]} setYedekParcaSatislar={bos} rawYedekParcaSatislar={[]}
    serverPermissions={null} giderYetki giderVeriYetki giderler={GIDERLER} setGiderler={bos} rawGiderler={[...GIDERLER, k(99, { deletedAt: "2026-09-20T10:00:00Z", aciklama: "Silinen" })]}
    giderTanimlari={TANIMLAR} setGiderTanimlari={bos} giderTurleri={TURLER} setGiderTurleri={bos} tedarikciler={TED} setTedarikciler={bos}
    appUpd={{}} onCheckUpdate={bos} onStartUpdate={bos} {...o} />
);

const FINANS = ({ rapor = null, g = GIDERLER, musteriler = MUSTERILER }) => (
  <Finance customers={musteriler} services={[]} dealers={[]} partSales={[]} yedekParcaSatislar={[]} factory={{ name: "Altuntaş Makina" }} rates={{}}
    payments={[]} teklifler={[]} serverPermissions={null} giderYetki giderler={g} giderTurleri={TURLER} giderYururlukAy="2026-06"
    {...(rapor ? { giderKasaRaporVerisi: rapor, kasaYetki: true } : {})} />
);

// Spec 0014: sekme ve süzgeç çubuklarının yedi ekranı. Müşteriler süzgeçlerin sayılarını göstersin diye çeşitli durumlar.
const MUSTERI_LISTE = [
  ...MUSTERILER,
  { id: 502, name: "Garantili Gıda", model: "AK100", serialNo: "S-3", currency: "TRY", installDate: "2025-11-02", warrantyEnd: "2027-11-02" },
  { id: 503, name: "Eski Fırın", model: "AK120_DSC", serialNo: "S-4", currency: "TRY", installDate: "2020-04-01", warrantyEnd: "2022-04-01" },
  { id: 504, name: "Seri Bekleyen", model: "AK100", serialNo: "", seriNoBekliyor: true, currency: "TRY", installDate: "2026-09-01" },
];
const BAYI_LISTE = [...DEALERS, { id: 4, name: "Akdeniz Servis", bayiMi: false, anlasmaliServisMi: true, city: "Antalya", country: "Türkiye" }];
const BAYI_KALIP = [{ id: 9, customerId: 500, tur: "Kalıp", ad: "Hamburger", ucret: 1000, currency: "TRY", tarih: "2026-07-10", faturaTipi: "Faturasız Yurtiçi", odendi: false, satisFirma: "Ege Bayi" }];
const YP_SATIS = [
  { id: 31, aliciTipi: "bayi", dealerId: 3, partId: 7, miktar: 2, birimFiyat: 350, currency: "TRY", tarih: "2026-09-01", faturaTipi: "Faturasız Yurtiçi", odendi: false, tahsisler: [] },
  { id: 32, aliciTipi: "bayi", dealerId: 3, partId: 7, miktar: 1, birimFiyat: 350, currency: "TRY", tarih: "2026-09-02", faturaTipi: "Faturasız Yurtiçi", odendi: true, tahsisler: [{ miktar: 1, makinaSerbest: "AK100 · S-9", tarih: "2026-09-03" }] },
];
const NOTLAR = [
  { id: 41, content: "Ege Bayi ile fiyat görüşmesi", updatedAt: 3, olusturan: "kerem" },
  { id: 42, content: "Servis ekibi toplantısı", updatedAt: 2, olusturan: "admin" },
];
const stokEkrani = (alt) => <Stock factory={{ name: "Altuntaş Makina" }} stock={[]} setStock={bos} customers={MUSTERILER} setCustomers={bos} parts={[{ id: 7, ad: "Rulman" }]}
  dealers={DEALERS} yedekParcaSatislar={YP_SATIS} defaultSubTab={alt} showToast={bos} />;

// Spec 0015: formlar (pencere açılmış hâlde).
const musteriDetay = () => <Customers customers={MUSTERI_LISTE} setCustomers={bos} partSales={[]} services={[]} payments={[]} dealers={DEALERS}
  parts={[{ id: 7, ad: "Rulman" }]} setServices={bos} setPartSales={bos} setYedekParcaSatislar={bos} calisanlar={CAL} kalipDefs={[{ id: 1, ad: "Hamburger" }]} initialDetailId={500} />;
function EpostaEkrani() {
  const [draft, setDraft] = useState({ to: "kutu@gida.com.tr", subject: "Teklif", body: "Merhaba,\n\nTeklifimiz ekte.", ek: null });
  return <MailComposeModal draft={draft} setDraft={setDraft} sendState={null} onSend={bos} />;
}

// Spec 0016: boş durumlar, uyarılar ve bölümler.
const BAYI_SERVIS = [
  { id: 61, customerId: 500, date: "2026-08-12", type: "Periyodik Bakım", repairPlace: "Yerinde Onarım", islemFirma: "Akdeniz Servis" },
  { id: 62, customerId: 500, date: "2026-07-03", type: "Arıza", repairPlace: "Fabrikada Onarım", islemFirma: "Akdeniz Servis" },
];
const bayiDetay = (id, o = {}) => <SimpleDealers dealers={BAYI_LISTE} setDealers={bos} factory={{ name: "Altuntaş Makina" }} setFactory={bos} partSales={BAYI_KALIP}
  services={[]} customers={MUSTERILER} showToast={bos} openDetailId={id} yedekParcaSatislar={YP_SATIS} parts={[{ id: 7, ad: "Rulman" }]} {...o} />;
// Spec 0065: bir servisin düşümü, silinince karşı hareketi ve yeni bir satış.
const STOK_LOG_0065 = [
  { id: 9101, partId: "7", miktar: 10, tip: "stok_girisi", tarih: "2026-09-01", notlar: "Fatura 2026/118" },
  { id: 9102, partId: "7", miktar: -3, tip: "servis", referansId: 40, tarih: "2026-09-10", notlar: "" },
  { id: 9103, partId: "7", miktar: 3, tip: "servis_iade", referansId: 40, tarih: "2026-09-12", notlar: "Servis kaydı silindi ya da düzenlendi" },
  { id: 9107, partId: "7", miktar: -1, tip: "bayi_satis", referansId: 41, tarih: "2026-09-15", notlar: "" },
];
const stokBos = (alt, o = {}) => <Stock factory={{ name: "Altuntaş Makina" }} stock={[]} setStock={bos} customers={MUSTERILER} setCustomers={bos} parts={[]}
  dealers={DEALERS} yedekParcaSatislar={[]} defaultSubTab={alt} showToast={bos} {...o} />;

// Spec 0016 Aşama 2: müşteri detay penceresinin bölümleri.
const DETAY_MAKINA = { id: 601, name: "Detay Gıda", model: "AK100", serialNo: "D-1", currency: "TRY", faturali: "Faturalı Yurtiçi", faturaBedeli: 200000,
  fabrikaSatisBedeli: 200000, installDate: "2025-01-10", warrantyEnd: "2027-01-10", kalanBorc: 50000, kaliplar: [{ ad: "Hamburger", olcu: "55x125" }],
  prevOwners: [{ name: "Eski Sahip Ltd", city: "Konya", country: "Türkiye", saleDate: "2024-06-01" }] };
const DETAY_IKINCI = { id: 602, name: "Detay Gıda", model: "AK120_DSC", serialNo: "D-2", currency: "TRY", installDate: "2025-03-01" };
const DETAY_BOS = { id: 603, name: "Olaysız Firma", model: "AK100", serialNo: "D-3", currency: "TRY" };
const DETAY_SERVIS = [
  { id: 611, customerId: 601, date: "2026-05-10", type: "Periyodik Bakım", repairPlace: "Yerinde Onarım", islemFirma: "Altuntaş Makina" },
  { id: 612, customerId: 601, date: "2025-08-02", type: "Garanti Dışı", repairPlace: "Fabrikada Onarım", islemFirma: "Altuntaş Makina", servisUcreti: "100", currency: "USD", odendi: false, faturaTipi: "Faturasız Yurtiçi" },
];
const DETAY_KALIP = [{ id: 621, tur: "Kalıp", customerId: 601, ad: "Köfte Kalıbı", tarih: "2026-03-04", ucret: 500, currency: "TRY", odendi: true, faturaTipi: "Faturasız Yurtiçi" }];
const DETAY_GORUSME = [{ id: 631, customerId: 601, tarih: "2026-09-01", tur: "Gelen Arama", not: "Yeni kalıp fiyatı sordu", takipTarihi: "2026-09-10", tamamlandi: false }];
const DETAY_DOSYA = [{ id: 641, customerId: 601, refType: "makina", refId: 601, ad: "fatura.pdf", tur: "PDF", boyut: 120000, tarih: "2026-09-02" }];
// Spec 0067 R20: gider yetkisi ve maliyet verisiyle açılan müşteri detayı. "Önce" çekiminde (eski kod) bu veriyle
// "Maliyet ve Kâr" kutusu çizilir; yeni kod prop'u almaz, kutu yoktur. Fark kaldırmanın kanıtıdır.
const MALIYET_0067 = hesaplaMakinaMaliyetleri({ customers: [{ ...DETAY_MAKINA, uretimTarihi: "2025-01-05", komisyon: 10000 }], stock: [], partStockLog: [],
  giderler: [{ id: 50501, tarih: "2025-01-12", turId: 5, tutar: 40000, kdvOrani: 0 }], giderTurleri: TURLER, standardModels: MODELLER, customModels: [],
  giderAyarlari: { yururlukAy: "2024-12" }, uretimPartileri: [] }, { bugun: "2026-09-23" });
const detay = (id, o = {}) => <Customers customers={[DETAY_MAKINA, DETAY_IKINCI, DETAY_BOS]} setCustomers={bos} services={DETAY_SERVIS} setServices={bos}
  partSales={DETAY_KALIP} setPartSales={bos} payments={[]} dealers={DEALERS} parts={[{ id: 7, ad: "Rulman" }]} factory={{ name: "Altuntaş Makina" }}
  gorusmeler={DETAY_GORUSME} setGorusmeler={bos} dosyalar={DETAY_DOSYA} setDosyalar={bos} yedekParcaSatislar={[]} setYedekParcaSatislar={bos}
  calisanlar={CAL} kalipDefs={[{ id: 1, ad: "Hamburger" }]} initialDetailId={id} {...o} />;

// Spec 0030: karanlık tema renk borcu ve tahsis satırının etiket düğmesi.
const KK_ODEME = [{ id: 701, customerId: 500, tarih: "2026-09-20", tutar: "50000", yontem: "Kredi Kartı", currency: "TRY", kartKomisyonu: { blokajGun: 40, hesabaGecis: "2030-01-01" } }];
const DIS_FIRMA_YP = [{ id: 711, aliciTipi: "bayi", disFirma: true, disFirmaAd: "Usta Servis", partId: 7, miktar: 3, birimFiyat: 350, currency: "TRY", tarih: "2026-09-10", faturaTipi: "Faturasız Yurtiçi", odendi: false, tahsisler: [] }];
const PANO_KALIP = [{ id: 721, tur: "Kalıp", customerId: 500, ad: "Köfte Kalıbı", tarih: "2026-09-18", ucret: 500, currency: "TRY", odendi: false, faturaTipi: "Faturasız Yurtiçi", kargoDurum: "Hazırlanıyor", olusturmaZamani: "2026-09-18T09:00:00" }];
const PANO_YP = [{ id: 731, aliciTipi: "bayi", dealerId: 3, partId: 7, miktar: 2, birimFiyat: 350, currency: "TRY", tarih: "2026-09-19", faturaTipi: "Faturasız Yurtiçi", odendi: false, tahsisler: [],
  kargoDurum: "Hazırlanıyor", teslimatFarkli: true, teslimatAd: "Şube Deposu", teslimatSehir: "İzmir", teslimatIlce: "Bornova" }];
const TAHSIS_YP = [
  { id: 741, batchId: 740, aliciTipi: "bayi", dealerId: 3, partId: 7, miktar: 2, birimFiyat: 350, currency: "TRY", tarih: "2026-09-05", faturaTipi: "Faturasız Yurtiçi", odendi: true, tahsisler: [{ miktar: 2, customerId: 601, serialNo: "D-1", tarih: "2026-09-06" }] },
  { id: 742, batchId: 740, aliciTipi: "bayi", dealerId: 3, partId: 7, miktar: 1, birimFiyat: 350, currency: "TRY", tarih: "2026-09-05", faturaTipi: "Faturasız Yurtiçi", odendi: true, tahsisler: [] },
];

// Spec 0020: makinaya ve modele atanmış personel kalemleri. Açıklamalar çalışan adı ya da boş: ekranda
// "Personel gideri" görünmeli, ad görünmemeli.
const per = (id, o) => k(id, { turId: 3, tutar: null, kdvOrani: 0, ...o });
const PERSONEL_ATAMALI = [
  per(8, { calisanId: 22, calisanAd: "Zeynep Arslan", aciklama: "Zeynep Arslan", resmiTutar: 28000, eldenTutar: 12000, atamaTur: "makina", makinaTur: "musteri", makinaId: 501 }),
  per(9, { calisanId: 21, calisanAd: "Hasan Çelik", aciklama: "", resmiTutar: 20000, eldenTutar: 10000, atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 10000, adet: 2 }] }),
];

// Spec 0021: taksitli kalem (6 taksit, 2'si ödenmiş) ve iki hedefli kira (stopaj 4 taksit, biri ödenmiş).
const tks = (id, hedef, sira, vade, tutar, odendi = false) => ({ id, hedef, sira, vade, tutar, odendi, odemeTarihi: odendi ? vade : null });
const TAKSITLI_K = k(31, { turId: 5, tutar: 10000, kdvOrani: 20, tedarikciId: 12, aciklama: "Kompresör", tarih: "2026-09-12", sonOdemeTarihi: "2026-10-12",
  taksitler: [tks(3101, "ana", 1, "2026-08-12", 2000, true), tks(3102, "ana", 2, "2026-09-12", 2000, true), tks(3103, "ana", 3, "2026-10-12", 2000),
    tks(3104, "ana", 4, "2026-11-12", 2000), tks(3105, "ana", 5, "2026-12-12", 2000), tks(3106, "ana", 6, "2027-01-12", 2000)] });
const KIRA_K = k(32, { turId: 1, tutar: 20000, netTutar: 16000, girisYonu: "brut", stopajOrani: 20, kdvOrani: 0, tedarikciId: 11, aciklama: "Eylül depo kirası", tarih: "2026-09-01", sonOdemeTarihi: "2026-09-25",
  taksitler: [tks(3201, "ana", 1, "2026-09-25", 16000), tks(3202, "stopaj", 1, "2026-08-26", 1000, true), tks(3203, "stopaj", 2, "2026-09-26", 1000),
    tks(3204, "stopaj", 3, "2026-10-26", 1000), tks(3205, "stopaj", 4, "2026-11-26", 1000)] });
const TAKSIT_GIDERLER = [...GIDERLER, TAKSITLI_K, KIRA_K];
// Spec 0084: üçüncü çeyreğin iki stopajlı kirası (stopaj vadesi 20.09.2026, açık; aracın günü 23.09.2026) ve satırsız eski bir depo kirası; hatırlatıcıda
// aynı vade ve dönemdeki iki stopaj tek satırda gruplanır. Eski kod alanları yok sayar (önce çekimi aynı sayfayla).
const kira84 = (id, tarih, ad, ana) => k(id, { turId: 1, tutar: 20000, netTutar: 16000, girisYonu: "brut", stopajOrani: 20, kdvOrani: 0, tedarikciId: 11, aciklama: ad, tarih,
  sonOdemeTarihi: ana, taksitler: [tks(id * 10 + 1, "ana", 1, ana, 16000), tks(id * 10 + 2, "stopaj", 1, "2026-09-20", 4000)] });
const STOPAJ_0084 = [...GIDERLER, kira84(841, "2026-07-01", "Temmuz depo kirası", "2026-07-10"), kira84(842, "2026-08-01", "Ağustos depo kirası", "2026-08-10"),
  k(843, { turId: 1, tutar: 10000, netTutar: 8000, girisYonu: "brut", stopajOrani: 20, kdvOrani: 0, tedarikciId: 11, aciklama: "Eski ambar kirası", tarih: "2026-08-15", taksitler: [] })];

// Spec 0024: kasa hesapları ve ödeme hareketleri. Saklı bayraklı ödenmiş satırlar göçteki gibi hareketle temsil edilir;
// 1 numaralı kalem ve kiranın kiraya veren taksiti kısmen ödenmiş.
const KASA_HESAPLAR = [
  { id: 401, ad: "Ziraat Bankası", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 250000, acilisTarihi: "2026-09-01", kapali: false },
  { id: 402, ad: "Merkez Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 15000, acilisTarihi: "2026-09-01", kapali: false },
  { id: 403, ad: "Şirket Kartı", tur: "kart", paraBirimi: "TRY", acilisBakiyesi: -8000, acilisTarihi: "2026-09-01", kapali: false },
  { id: 404, ad: "Döviz Hesabı", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 3000, acilisTarihi: "2026-09-01", kapali: false },
  { id: 405, ad: "Eski Vadesiz", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2026-01-01", kapali: true },
];
const odm = (id, giderId, tutar, tarih, o = {}) => ({ id, tur: "odeme", giderId, taksitId: null, tutar, tarih, hesapId: 401, yontem: "Havale", ...o });
const KASA_HAREKETLER = [
  odm(4001, 2, null, "2026-09-12", { tamKapatir: true, hesapId: null, kaynak: "goc", gocKaynak: "gider:2" }),
  odm(4002, 6, null, "2026-08-20", { tamKapatir: true, hesapId: null, kaynak: "goc", gocKaynak: "gider:6" }),
  odm(4003, 31, 2000, "2026-08-12", { taksitId: 3101 }), odm(4004, 31, 2000, "2026-09-12", { taksitId: 3102 }),
  odm(4005, 32, 1000, "2026-08-26", { taksitId: 3202, hesapId: 402, yontem: "Nakit" }),
  odm(4006, 1, 5000, "2026-09-20"),
  odm(4007, 32, 6000, "2026-09-22", { taksitId: 3201 }),
  { id: 4008, tur: "virman", tarih: "2026-09-15", tutar: 20000, hesapId: 401, karsiHesapId: 402, aciklama: "Kasaya nakit" },
  odm(4009, 5, 12000, "2026-09-24", { hesapId: 403, yontem: "Kredi Kartı" }),
];
const PERSONEL_IKI = k(5, { turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 20000, tutar: 50000, kdvOrani: 0, sonOdemeTarihi: "2026-09-30",
  taksitler: [{ id: 5101, hedef: "ana", sira: 1, vade: "2026-09-30", tutar: 30000, odendi: false, odemeTarihi: null }, { id: 5102, hedef: "elden", sira: 1, vade: "2026-09-28", tutar: 20000, odendi: false, odemeTarihi: null }] });
const KARMA_H = [...KASA_HAREKETLER, odm(4020, 1, 3000, "2026-09-21", { hesapId: 402, yontem: "Nakit" })];
const KASA_TAHSILAT = [{ id: 4101, customerId: 500, tarih: "2026-09-18", tutar: 40000, currency: "TRY", yontem: "Havale", hesapId: 401 },
  { id: 4102, customerId: 501, tarih: "2026-09-25", tutar: 15000, currency: "TRY", yontem: "Çek", tahsilEdildi: false, hesapId: 401 }];
const kasaEkrani = (o = {}) => <Kasa kasaHesaplari={KASA_HESAPLAR} setKasaHesaplari={bos} hesapHareketleri={KASA_HAREKETLER} setHesapHareketleri={bos}
  payments={KASA_TAHSILAT} customers={MUSTERILER} giderler={TAKSIT_GIDERLER} giderTurleri={TURLER} tedarikciler={TED} serverPermissions={null} showToast={bos} {...o} />;
// Spec 0024 B: avans (hesaplı ve hesapsız, silinmiş çalışan dahil) ve maaştan mahsup.
const KASA_B = [...KASA_HAREKETLER,
  { id: 4010, tur: "avans", tarih: "2026-09-05", tutar: 8000, calisanId: 21, hesapId: 402, yontem: "Nakit", aciklama: "Bayram öncesi" },
  { id: 4011, tur: "avans", tarih: "2026-09-08", tutar: 1500, calisanId: 24, hesapId: null },
  { id: 4012, tur: "mahsup", tarih: "2026-09-26", tutar: 5000, calisanId: 21, giderId: 5, hesapId: null }];
const CAL_B = [CAL[0], { id: 24, ad: "Veli Kaya", deletedAt: "2026-09-20T10:00:00Z" }];
const kasaB = (o = {}) => kasaEkrani({ hesapHareketleri: KASA_B, calisanlar: CAL_B, yururlukAy: "2026-06", ...o });
const TUR_MAP = turHaritasi(TURLER);
// Spec 0040: çek portföyü. Bugün (sabit) 2026-09-23: 3401 vadesi geçmiş, 3402 yaklaşan, 3403 tahsilde, 3404 ciro edilmiş (hareketli),
// 3405 karşılıksız, 3406 USD (ciro edilemez).
const cekOdeme = (id, customerId, tutar, vade, o = {}) => ({ id, customerId, tarih: "2026-09-01", tutar, currency: "TRY", yontem: "Çek", vadeTarihi: vade, tahsilEdildi: false, ...o });
const CEK_ODEMELER = [cekOdeme(3301, 500, 45000, "2026-09-15"), cekOdeme(3302, 501, 30000, "2026-09-28"), cekOdeme(3303, 500, 20000, "2026-10-20"),
  cekOdeme(3304, 501, 16000, "2026-10-05"), cekOdeme(3305, 500, 8000, "2026-09-10"), cekOdeme(3306, 501, 2500, "2026-09-20", { currency: "USD" })];
const cekK = (id, paymentId, no, banka, durum, o = {}) => ({ id, paymentId, no, banka, kesideci: "Mehmet Yılmaz", tur: "hamiline", durum,
  gecmis: [{ tarih: "2026-09-01", durum: "portfoy", not: "Alındı" }, ...(durum !== "portfoy" ? [{ tarih: "2026-09-18", durum, not: durum === "ciro" ? "Ciro: Yıldız Gayrimenkul" : "" }] : [])], ...o });
const CEKLER = [cekK(3401, 3301, "0012345", "Ziraat", "portfoy"), cekK(3402, 3302, "0098765", "Garanti", "portfoy", { tur: "resmi" }), cekK(3403, 3303, "5544332", "İş Bankası", "tahsile"),
  cekK(3404, 3304, "7788990", "Akbank", "ciro"), cekK(3405, 3305, "1122334", "Halkbank", "karsiliksiz"), cekK(3406, 3306, "USD-001", "Yapı Kredi", "portfoy")];
// Spec 0049 A: tahsilata bağlı olmayan, elle eklenmiş çek (vadesi en geç: listenin son satırı).
const BAGSIZ_CEK = { id: 3407, yon: "alinan", paymentId: null, no: "0445566", banka: "Vakıfbank", kesideci: "Kaya Ltd.", tur: "hamiline", durum: "portfoy", tutar: 12500, currency: "TRY",
  vadeTarihi: "2026-11-30", tarih: "2026-09-12", kimden: "Kaya Ltd.", gecmis: [{ tarih: "2026-09-12", durum: "portfoy", not: "Portföye elle eklendi" }] };
// Spec 0049 B: kendi çeklerimiz (biri yaklaşan vadeli, yazılmış; biri ödenmiş, Ziraat'ten düşmüş).
const VERILEN_CEKLER = [
  { id: 3408, yon: "verilen", paymentId: null, no: "A-000123", banka: "Ziraat Bankası", tur: "hamiline", durum: "yazildi", tutar: 18000, currency: "TRY", vadeTarihi: "2026-09-26",
    tarih: "2026-09-10", hesapId: 401, alacakliTur: "tedarikci", alacakliId: 11, alacakliAd: "Yıldız Gayrimenkul", aciklama: "Eylül kira", gecmis: [{ tarih: "2026-09-10", durum: "yazildi", not: "Yazıldı: Yıldız Gayrimenkul" }] },
  { id: 3409, yon: "verilen", paymentId: null, no: "A-000122", banka: "Ziraat Bankası", tur: "hamiline", durum: "odendi", tutar: 7500, currency: "TRY", vadeTarihi: "2026-09-15",
    tarih: "2026-08-20", hesapId: 401, alacakliTur: "tedarikci", alacakliId: 12, alacakliAd: "Bölge Elektrik", aciklama: "", gecmis: [{ tarih: "2026-08-20", durum: "yazildi", not: "Yazıldı: Bölge Elektrik" }, { tarih: "2026-09-15", durum: "odendi", not: "Banka ödedi" }] }];
const CIRO_H = [{ id: 4020, tur: "odeme", tarih: "2026-09-18", tutar: 16000, giderId: 32, taksitId: 3201, hesapId: null, cekId: 3404, yontem: "Çek (ciro)", aciklama: "Çek 7788990 · Akbank" }];
const kasaCek = (o = {}) => kasaEkrani({ payments: cekleriUygula([...KASA_TAHSILAT, ...CEK_ODEMELER], CEKLER), cekler: CEKLER, setCekler: bos, giderAyarlari: AYAR.giderAyarlari,
  hesapHareketleri: [...KASA_HAREKETLER, ...CIRO_H], giderler: odemeleriUygula(TAKSIT_GIDERLER, [...KASA_HAREKETLER, ...CIRO_H], TUR_MAP), calisanlar: CAL, ...o });
// Spec 0044: servis, Extra Kalıp ve yedek parça tahsilatlarının hesabı (hesaplı ve hesapsız; tahsil edilmemiş çek hesapsız listede kalır).
const thSv = (id, customerId, date, servisUcreti, o = {}) => ({ id, customerId, date, type: "Garanti Dışı", repairPlace: "Yerinde Onarım", islemFirma: "Altuntaş Makina", servisUcreti,
  currency: "TRY", faturaTipi: "Faturalı Yurtiçi", odendi: true, tahsilatTarihi: date, yontem: "Nakit", degisenParcalar: [], ...o });
const TH_SERVIS = [thSv(4201, 500, "2026-09-16", 3000, { hesapId: 401 }), thSv(4202, 501, "2026-09-19", 1500, { yontem: "Havale", hesapId: null })];
const TH_KALIP = [{ id: 4211, tur: "Kalıp", customerId: 500, ad: "Hamburger", tarih: "2026-09-21", ucret: 2000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", odendi: true, tahsilatTarihi: "2026-09-21", yontem: "Nakit", hesapId: null }];
const TH_YP = [{ id: 4221, aliciTipi: "bayi", dealerId: 3, partId: 7, miktar: 4, birimFiyat: 350, currency: "TRY", tarih: "2026-09-22", faturaTipi: "Faturalı Yurtiçi", odendi: true, tahsilatTarihi: "2026-09-22", yontem: "Havale", hesapId: 401, tahsisler: [] },
  { id: 4222, aliciTipi: "bayi", dealerId: 3, partId: 7, miktar: 2, birimFiyat: 350, currency: "TRY", tarih: "2026-09-24", faturaTipi: "Faturalı Yurtiçi", odendi: true, yontem: "Çek", tahsilEdildi: false, hesapId: null, tahsisler: [] }];
// Spec 0051 B: çok hedefli kalemlere hesaplı ödemeler (satırlı kiranın stopajı ve ana taksidi, satırsız personelde bölünen ödeme)
// ve maaştan mahsup.
const D51_G = [
  { id: 5101, tarih: "2026-09-01", turId: 1, tutar: 25000, kdvOrani: 0, stopajOrani: 20, tedarikciId: 11, aciklama: "Eylül kira", modelSatirlari: [],
    taksitler: [{ id: 51011, hedef: "ana", sira: 1, vade: "2026-09-30", tutar: 20000 }, { id: 51012, hedef: "stopaj", sira: 1, vade: "2026-10-26", tutar: 5000 }] },
  { id: 5102, tarih: "2026-09-01", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 10000, ekOdemeler: [], modelSatirlari: [] }];
const D51_H = [
  { id: 5111, tur: "odeme", tarih: "2026-09-26", tutar: 5000, hesapId: 401, giderId: 5101, taksitId: 51012, yontem: "Havale" },
  { id: 5112, tur: "odeme", tarih: "2026-09-27", tutar: 20000, hesapId: 401, giderId: 5101, taksitId: 51011, yontem: "Havale" },
  { id: 5113, tur: "odeme", tarih: "2026-09-28", tutar: 35000, hesapId: 401, giderId: 5102, taksitId: null, yontem: "Havale" },
  { id: 5114, tur: "avans", tarih: "2026-09-05", tutar: 8000, calisanId: 21, hesapId: 402, yontem: "Nakit" },
  { id: 5115, tur: "mahsup", tarih: "2026-09-29", tutar: 3000, calisanId: 21, giderId: 5102, hesapId: null }];
const kasa51 = (o = {}) => kasaEkrani({ hesapHareketleri: D51_H, giderler: odemeleriUygula(D51_G, D51_H, turHaritasi(TURLER)), calisanlar: [CAL[0]], ...o });
const kasaTahsilat = (o = {}) => kasaEkrani({ services: TH_SERVIS, partSales: TH_KALIP, yedekParcaSatislar: TH_YP, dealers: DEALERS, factory: { name: "Altuntaş Makina" },
  setServices: bos, setPartSales: bos, setYedekParcaSatislar: bos, ...o });
// Spec 0058: kapsam dışı bırakma (durumlu: düğmeler gerçek setter'la çalışır). k0: açılışta kapsam dışı olanlar.
function KasaKapsamEkrani({ k0 = [], ...o }) {
  const [k, setK] = useState(k0);
  return kasaTahsilat({ kasaKapsamDisi: k, setKasaKapsamDisi: setK, ...o });
}
const KAPSAM_K0 = [{ id: 5801, tur: "tahsilat", kaynak: "kalip", kayitId: 4211, zaman: "2026-09-30T10:00:00.000Z" },
  { id: 5802, tur: "hareket", kaynak: null, kayitId: 4002, zaman: "2026-09-30T10:00:00.000Z" }];
const TH_DETAY_SERVIS = thSv(4231, 601, "2026-09-25", 2500, { odendi: false, tahsilatTarihi: null });
// Spec 0046: gider formunun ödeme bölümü (kasa yetkisi, çekler portföyde).
const FORM_ODEME = { giderTurleri: TURLER, tedarikciler: TED, calisanlar: CAL, giderAyarlari: AYAR.giderAyarlari, onSave: bos, onCancel: bos,
  hesaplar: KASA_HESAPLAR, hareketler: KASA_HAREKETLER, hesapSecimi: true, cekler: CEKLER, payments: cekleriUygula(CEK_ODEMELER, CEKLER), ciroYetkisi: true };
// Spec 0048: düzenleme formu, kayıtlı hareketlerle (Giderler'in verdiği gibi zenginleştirilmiş kalem, hareket bölümü var).
const D48_PERS = { id: 4801, tarih: "2026-09-01", turId: 3, calisanId: 21, resmiTutar: 30000, eldenTutar: 0, ekOdemeler: [], sonOdemeTarihi: "2026-09-30", modelSatirlari: [] };
const D48_NORMAL = { id: 4802, tarih: "2026-09-01", turId: 5, tutar: 39500, kdvOrani: 0, tedarikciId: 11, aciklama: "Sac levha", sonOdemeTarihi: "2026-09-30", modelSatirlari: [] };
const D48_BOLUNMEZ = { ...D48_PERS, id: 4803, eldenTutar: 10000, taksitler: [{ id: 48031, hedef: "ana", sira: 1, vade: "2026-09-30", tutar: 20000 }, { id: 48032, hedef: "ana", sira: 2, vade: "2026-10-30", tutar: 20000 }] };
const D48_TAKSITLI = { ...D48_NORMAL, id: 4804, tutar: 12000, taksitler: [1, 2, 3].map(i => ({ id: 48040 + i, hedef: "ana", sira: i, vade: `2026-${String(8 + i).padStart(2, "0")}-30`, tutar: 4000 })) };
const D48_HAR = [
  { id: 48101, tur: "odeme", tarih: "2026-09-15", tutar: 12000, hesapId: 401, giderId: 4801, taksitId: null, yontem: "Havale" },
  { id: 48102, tur: "odeme", tarih: "2026-09-15", tutar: 39500, hesapId: 401, giderId: 4802, taksitId: null, yontem: "Havale" },
  { id: 48103, tur: "odeme", tarih: "2026-09-15", tutar: 20000, hesapId: 401, giderId: 4803, taksitId: 48031, yontem: "Havale" },
  { id: 48104, tur: "odeme", tarih: "2026-09-15", tutar: 4000, hesapId: 401, giderId: 4804, taksitId: 48041, yontem: "Havale" },
];
// Spec 0054: maaşı tamamen ödenmiş satırlı personel kalemi (ana + elden); ek ödeme sonradan eklenir (Intent).
const D54_SATIR = (id, hedef, tutar) => ({ id, hedef, sira: 1, vade: "2026-09-30", tutar });
const D54_PERS = { id: 5401, tarih: "2026-09-01", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 20000, ekOdemeler: [], sonOdemeTarihi: "2026-09-30",
  modelSatirlari: [], taksitler: [D54_SATIR(54011, "ana", 30000), D54_SATIR(54012, "elden", 20000)] };
const D54_EKLI = { ...D54_PERS, ekOdemeler: [{ tur: "prim", aciklama: "Eylül primi", resmiTutar: 9500, eldenTutar: null }], taksitler: [...D54_PERS.taksitler, D54_SATIR(54013, "ekResmi", 9500)] };
const D54_HAR = [
  { id: 54101, tur: "odeme", tarih: "2026-09-15", tutar: 30000, hesapId: 401, giderId: 5401, taksitId: 54011, yontem: "Havale" },
  { id: 54102, tur: "odeme", tarih: "2026-09-15", tutar: 20000, hesapId: 401, giderId: 5401, taksitId: 54012, yontem: "Nakit" },
];
const duzenle48 = (k) => <GiderForm kalem={odemeleriUygula([k], D48_HAR, turHaritasi(TURLER))[0]} {...FORM_ODEME} hareketler={D48_HAR} hareketBolumu onHedefOde={bos} />;
// Spec 0047: Aylık Gider ve Kasa Raporu (App'in tek memosunun karşılığı). Personel kalemleri çalışan adlarıyla verilir;
// belgede yalnız "Personel gideri" görünmeli.
const RAPOR_VERI = { giderler: GIDERLER, hareketler: KASA_HAREKETLER, turler: TURLER, tedarikciler: TED, stock: [], customers: MUSTERILER, canliModeller: new Set(),
  yururlukAy: AYAR.giderAyarlari.yururlukAy, esikGun: 7, satisVerisi: SATIS, kdvSecenek: { factoryName: "Altuntaş Makina" }, hesaplar: KASA_HESAPLAR, cekler: CEKLER,
  payments: cekleriUygula([...KASA_TAHSILAT, ...CEK_ODEMELER], CEKLER), services: [], partSales: [], yedekParcaSatislar: [], dealers: DEALERS, factory: { name: "Altuntaş Makina" } };
const KASA_B_ONCE = KASA_B.filter(h => h.id !== 4012); // mahsup girilmeden önceki hâl
const mahsupPenceresi = () => (
  <OdemeKayitPenceresi kalem={odemeleriUygula([GIDERLER.find(x => x.id === 5)], KASA_B_ONCE, TUR_MAP)[0]} davranis="personel" turAd="Personel" turMap={TUR_MAP}
    hareketler={KASA_B_ONCE} hesaplar={KASA_HESAPLAR} hesapSecimi odemeYetkisi bugun="2026-09-28" giderler={GIDERLER}
    onKaydet={bos} onSil={bos} onClose={bos} />
);

// Spec 0022: üretim partileri. Kapalı parti (Haz–Ağu, iki satılmış makina; Ağustos anlık görüntüsü bugünkünden
// küçük: kapanıştan sonra gider eklenmiş) ve açık parti (Eylül, stokta iki makina).
const P_KAPALI = { id: 901, ad: "2026-1", baslangicAy: "2026-06", bitisAy: "2026-08", aciklama: "Yaz üretimi", kapanmaZamani: "2026-09-01T10:00:00",
  kapanisOrtaklari: { "2026-06": 0, "2026-07": 0, "2026-08": 1500000 }, kapanisGenelHavuzlari: { "2026-06": 0, "2026-07": 0, "2026-08": 1500000 } };
// Spec 0090 R24: değişim kutusu yalnız yeni alandan (kapanisGenelHavuzlari) okunur; eski alan (kapanisOrtaklari) taban çekimi için durur.
const P_ACIK = { id: 902, ad: "2026-2", baslangicAy: "2026-09", bitisAy: null, aciklama: "Sonbahar üretimi" };
const PARTI_MUSTERI = MUSTERILER.map(c => ({ ...c, partiId: 901 }));
const PARTI_STOK = [{ id: 9201, model: "AK100", serialNo: "S-3", addedDate: "2026-09-10", partiId: 902 }, { id: 9202, model: "AK120_DSC", serialNo: "S-4", addedDate: "2026-09-15", partiId: 902 },
  { id: 9203, model: "AK100", serialNo: "S-5", addedDate: "2026-09-18" }];
// Spec 0100: üretim durumlu stok (montajda, açıkça hazır, durumsuz = hazır, kapanmış partiden kalan), planlı açık parti ve satışlar.
const P_ACIK_0100 = { ...P_ACIK, planlananAdetler: { AK100: 6, AK120_DSC: 3 } };
const STOK_0100 = [
  { id: 9301, model: "AK100", serialNo: "S-31", addedDate: "2026-10-02", partiId: 902, uretimDurumu: "montaj" },
  { id: 9302, model: "AK100", serialNo: "S-32", addedDate: "2026-09-25", partiId: 902, uretimDurumu: "hazir" },
  { id: 9303, model: "AK120_DSC", serialNo: "S-33", addedDate: "2026-09-20", partiId: 902 },
  { id: 9304, model: "AK100", serialNo: "S-34", addedDate: "2026-08-12", partiId: 901 },
  { id: 9305, model: "AK120_DSC", serialNo: "S-35", addedDate: "2026-08-20", partiId: 901, uretimDurumu: "montaj" },
  { id: 9306, model: "AK100", serialNo: "", addedDate: "2026-10-05", uretimDurumu: "montaj" },
];
const MUSTERI_0100 = MUSTERILER.map((c, i) => (i < 2 ? { ...c, partiId: 902 } : c));
const stok0100 = (alt, ek = {}) => <Stock factory={{ name: "Altuntaş Makina" }} stock={STOK_0100} setStock={bos} customers={MUSTERI_0100} setCustomers={bos} parts={[]}
  dealers={DEALERS} yedekParcaSatislar={[]} defaultSubTab={alt} showToast={bos} uretimPartileri={[P_KAPALI, P_ACIK_0100]} giderYetki models={MODELLER} {...ek} />;
// Spec 0101: kalıp çapı girilmiş iki satır ve çapsız bir satır (hücrede "—").
const STOK_0101 = [
  { id: 9301, model: "AK100", serialNo: "K-1", addedDate: "2026-09-10", uretimDurumu: "hazir", kalipCapi: { en: "50", yukseklik: "80", boy: "115" } },
  { id: 9302, model: "AK120_DSC", serialNo: "K-2", addedDate: "2026-09-15", uretimDurumu: "montaj", kalipCapi: { en: "60", yukseklik: "90", boy: "120" } },
  { id: 9303, model: "AK100", serialNo: "", addedDate: "2026-09-18" },
];
const anasayfa0100 = <Dashboard customers={MUSTERI_0100} dealers={DEALERS} services={[]} payments={[]} rates={{ usd: 41.25, eur: 48.1 }} factory={{ name: "Altuntaş Makina" }}
  stock={STOK_0100} uretimPartileri={[P_KAPALI, P_ACIK_0100]} />;

// Spec 0088: Makina Maliyeti (dört görünüm). Veri tests/fixtures/0088-veri.js (motor ve ekran testleriyle aynı); `p0`/`musteriler`/`stok`
// verilirse taşınan Üretim Partileri görünümü 0022'nin kanıt verisiyle çizilir (R23/4).
// Spec 0090 R27, R37/3: yeni kod parti hesabını ekranda kendi kurar (`tumMusteriler`) ve `makinaMaliyet`'i okumaz; prop yalnız
// spec öncesi koddan (taban çekimi) aynı ekranın çizilebilmesi için verilir (AC-46'nın gerekçeli istisnası).
// Spec 0091: `a0` uygulama ayarlarına eklenir (üretimde olmayan model listesi).
function MaliyetEkrani({ ayar = M88.AYAR, turler = M88.TURLER, p0 = M88.PARTILER, musteriler = M88.CUSTOMERS, stok = M88.STOCK, giderler = M88.GIDERLER, a0 = {} }) {
  const [giderTurleri, setGiderTurleri] = useState(turler);
  const [standardModels, setStandardModels] = useState(M88.MODELLER);
  const [uretimPartileri, setUretimPartileri] = useState(p0);
  const [appSettings, setAppSettings] = useState({ giderAyarlari: { yururlukAy: "2026-01" }, ...(ayar ? { maliyetAyarlari: ayar } : {}), ...a0 });
  const makinaMaliyet = hesaplaMakinaMaliyetleri({ customers: musteriler, stock: stok, partStockLog: [], giderler, giderTurleri, standardModels: MODELLER, customModels: [],
    giderAyarlari: { yururlukAy: "2026-01" }, uretimPartileri }, { bugun: "2026-09-23" });
  return <MakinaMaliyeti aktifKullanici="kerem" giderler={giderler} giderTurleri={giderTurleri} setGiderTurleri={setGiderTurleri} tedarikciler={[]} stock={stok} customers={musteriler}
    partStockLog={[]} parts={M88.PARCALAR} standardModels={standardModels} customModels={[]} setStandardModels={setStandardModels} setCustomModels={bos}
    uretimPartileri={uretimPartileri} setUretimPartileri={setUretimPartileri} appSettings={appSettings} setAppSettings={setAppSettings} rates={{ usd: 41 }}
    makinaMaliyet={makinaMaliyet} tumMusteriler={musteriler} serverPermissions={null} showToast={bos} />;
}
const maliyetEkrani = (o, adimlar = []) => [<MaliyetEkrani {...o} />, adimlar];
// Spec 0097: Parti Hesabı'nın tarihli satırları ve dönem kilitli pay; veri tests/fixtures/0097-veri.js (motor ve ekran testleriyle aynı).
function MaliyetEkrani0097() {
  const [uretimPartileri, setUretimPartileri] = useState(V97.PARTILER);
  return <MakinaMaliyeti aktifKullanici="kerem" giderler={V97.GIDERLER} giderTurleri={V97.TURLER} setGiderTurleri={bos} tedarikciler={[]} stock={V97.STOCK} customers={V97.CUSTOMERS}
    partStockLog={[]} parts={V97.PARCALAR} standardModels={V97.STANDART} customModels={V97.OZEL} setStandardModels={bos} setCustomModels={bos}
    uretimPartileri={uretimPartileri} setUretimPartileri={setUretimPartileri} appSettings={{ giderAyarlari: { yururlukAy: V97.YURURLUK }, maliyetAyarlari: V97.AYAR }} setAppSettings={bos}
    rates={{}} tumMusteriler={V97.CUSTOMERS} serverPermissions={null} showToast={bos} baslangicGorunum="parti" />;
}
// Spec 0090 R13: parti havuzu yalnız rolü "Genel gidere girer" türlerden; kanıt verisinde bütün türlere bu rol verilir.
const GENEL_TURLER = TURLER.map(t => ({ ...t, maliyetRolu: "genel" }));
const maliyetPartiEkrani = (adimlar) => maliyetEkrani({ p0: [P_KAPALI, P_ACIK], musteriler: PARTI_MUSTERI, stok: PARTI_STOK, giderler: GIDERLER, turler: GENEL_TURLER }, ["Üretim Partileri", ...adimlar]);
// Spec 0090 R17, R18, R21 (AC-31, AC-32, AC-34): neden hücreleri. Türlerin rolü yok (rolYok), gelecek ayda başlayan ve makinası
// olmayan parti.
const maliyetPartiNedenEkrani = () => maliyetEkrani({ p0: [P_KAPALI, P_ACIK, { id: 903, ad: "2026-3", baslangicAy: "2026-12", bitisAy: null, aciklama: "Kış üretimi" },
  { id: 904, ad: "Deneme", baslangicAy: "2026-07", bitisAy: "2026-07" }], musteriler: PARTI_MUSTERI, stok: [...PARTI_STOK, { id: 9204, model: "AK100", serialNo: "S-6", addedDate: "2026-09-20", partiId: 903 }],
  giderler: GIDERLER, turler: TURLER }, ["Üretim Partileri"]);

// Spec 0023: çalışan ek ödemeleri (aynı türden iki prim ve bir fazla mesai).
const EK_ODEMELI = k(41, { turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", aciklama: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 20000, tutar: null, kdvOrani: 0, tarih: "2026-09-05",
  ekOdemeler: [{ tur: "fazlaCalisma", aciklama: "Eylül yoğunluğu", resmiTutar: 4000, eldenTutar: 1000 }, { tur: "prim", aciklama: "Teslim primi", resmiTutar: 2500, eldenTutar: null },
    { tur: "prim", aciklama: "Kalite primi", resmiTutar: null, eldenTutar: 1500 }] });

// Spec 0094: harita müşterileri (iki ilçeli, bir ilçesiz kayıt).
const HARITA_0094 = [
  { id: 9401, name: "Kadıköy Fırın", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" },
  { id: 9402, name: "Moda Pastane", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" },
  { id: 9403, name: "Eski Kayıt", country: "Türkiye", city: "İstanbul" },
];

const HARITA_0094_IL = [
  { id: 9411, name: "Kuşadası Fırın", country: "Türkiye", city: "Aydın", ilce: "Kuşadası" },
  { id: 9412, name: "Didim Pastane", country: "Türkiye", city: "Aydın", ilce: "Didim" },
  { id: 9413, name: "Sakarya Eski", country: "Türkiye", city: "Sakarya" },
  { id: 9414, name: "Eskişehir Eski", country: "Türkiye", city: "Eskişehir" },
  { id: 9415, name: "Antep Eski", country: "Türkiye", city: "Gaziantep" },
  { id: 9416, name: "Yalova Eski", country: "Türkiye", city: "Yalova" },
];

// Formu hazır bir durumla çizer (ör. "ödendi" işaretli, ödeme ayrıntı kutusu açık).
function FormEkrani({ Bilesen, ilk, ...props }) {
  const [form, setForm] = useState(ilk);
  return <Bilesen form={form} setForm={setForm} customers={MUSTERILER} dealers={DEALERS} parts={[{ id: 7, ad: "Rulman" }]} calisanlar={CAL}
    factory={{ name: "Altuntaş Makina" }} kalipDefs={[{ id: 1, ad: "Hamburger" }]} onSave={bos} onCancel={bos} {...props} />;
}

// Ekran → [çizim, tıklanacak metinler (sırayla)]
// Spec 0062: sayfalanan listeler, sayfa boyutunun üstünde satırla (her biri için "Sonraki ›" ile sayfa 2 ekranı). Spec 0080:
// Gider Kalemleri ve Tedarikçiler artık sayfalanmaz, onların sayfa 2 ekranı yok.
const gun62 = (n) => `2026-09-${String(n).padStart(2, "0")}`;
const KASA62 = { kasaHesaplari: [KASA_HESAPLAR[0]], hesapHareketleri: [], giderler: [],
  payments: Array.from({ length: 14 }, (_, i) => ({ id: 6201 + i, customerId: i % 2 ? 500 : 501, tarih: gun62(i + 1), tutar: 1000 * (i + 1), currency: "TRY", yontem: "Havale", hesapId: 401 })) };
const H62 = Array.from({ length: 12 }, (_, i) => odm(6301 + i, 1, 100, gun62(i + 1), { hesapId: null, yontem: "Nakit" }));
const SV62 = Array.from({ length: 12 }, (_, i) => thSv(6401 + i, i % 2 ? 500 : 501, gun62(i + 1), 1000 + 100 * i, { hesapId: null }));
const K62 = SV62.map((x, i) => ({ id: 6501 + i, tur: "tahsilat", kaynak: "servis", kayitId: x.id, zaman: "2026-09-22T10:00:00.000Z" }));
const kasaHesapsiz62 = (o = {}) => <KasaKapsamEkrani services={SV62} partSales={[]} yedekParcaSatislar={[]} hesapHareketleri={H62}
  giderler={odemeleriUygula(TAKSIT_GIDERLER, H62, TUR_MAP)} {...o} />;
const CEK62 = [...CEKLER,
  ...Array.from({ length: 12 }, (_, i) => ({ ...BAGSIZ_CEK, id: 6601 + i, no: `B-${6601 + i}`, vadeTarihi: `2026-11-${String(i + 1).padStart(2, "0")}`, tutar: 5000 + 500 * i })),
  ...Array.from({ length: 12 }, (_, i) => ({ ...VERILEN_CEKLER[0], id: 6701 + i, no: `A-${6701 + i}`, vadeTarihi: `2026-10-${String(i + 1).padStart(2, "0")}`, tutar: 3000 + 250 * i }))];
const MUS62 = Array.from({ length: 12 }, (_, i) => ({ id: 6801 + i, name: `Firma ${String(i + 1).padStart(2, "0")}`, model: i % 2 ? "AK100" : "AK120_DSC", serialNo: `S62-${i + 1}`,
  currency: "TRY", faturali: "Faturalı Yurtiçi", faturaBedeli: 200000 + 5000 * i, fabrikaSatisBedeli: 190000 + 5000 * i, installDate: gun62(i + 2), uretimTarihi: "2026-08-15", kalanBorc: 0 }));
const G62 = [...GIDERLER,
  ...MUS62.map((m, i) => k(6901 + i, { turId: 5, tutar: 3000 + 100 * i, tedarikciId: 11, aciklama: `Özel parça ${i + 1}`, tarih: gun62(i + 1), sonOdemeTarihi: gun62(i + 5),
    atamaTur: "makina", makinaTur: "musteri", makinaId: m.id })),
  ...Array.from({ length: 6 }, (_, i) => k(6951 + i, { turId: 4, tutar: 900 + 10 * i, tedarikciId: 12, aciklama: `Sarf ${i + 1}`, tarih: gun62(14 + i), sonOdemeTarihi: gun62(24 + i) }))];
const TED62 = [...TED, ...Array.from({ length: 11 }, (_, i) => ({ id: 6001 + i, ad: `Tedarikçi ${String(i + 1).padStart(2, "0")}`, yetkili: "Satış", telefon: "0332 000 00 00" }))];
const gider62 = (o = {}) => <GiderEkrani g0={G62} musteriler={[...MUSTERILER, ...MUS62]} h0={[]} {...o} />;
const hatirlatma62 = <Dashboard customers={MUSTERILER} dealers={DEALERS} services={[]} payments={[]} rates={{ usd: 41.25, eur: 48.1 }} factory={{ name: "Altuntaş Makina" }}
  giderYetki giderler={G62} setHesapHareketleri={bos} giderTurleri={TURLER} tedarikciler={TED} giderAyarlari={AYAR.giderAyarlari} />;
const sayfa2 = (adimlar) => [...adimlar, "dugme:Sonraki ›"];
// Spec 0068: Çöp Kutusu'nda tedarikçi ve üretim partisi; Dışa Aktar'da çek raporu (kasa yetkisiyle).
const COP_TED = [...TED, { id: 13, ad: "Akın Hırdavat", yetkili: "Murat", deletedAt: "2026-09-22T16:00:00.000Z" }];
const COP_PARTI = [{ id: 903, ad: "2026-0", baslangicAy: "2026-03", bitisAy: "2026-05", deletedAt: "2026-09-21T11:00:00.000Z" }];
const CEK68 = [{ id: 6801, yon: "alinan", paymentId: null, no: "0445566", banka: "Vakıfbank", kesideci: "Kaya Ltd.", tur: "hamiline", durum: "portfoy", tutar: 12500, currency: "TRY",
  vadeTarihi: "2026-11-30", tarih: "2026-09-12", kimden: "Kaya Ltd.", gecmis: [] }];

// Spec 0026: genel arama paleti; gider modülü kayıtları, kapsam listesi (boş kutu ve sonuç yok), yetki süzmesi.
const ARAMA_VERI = {
  customers: [{ id: 1, name: "Yıldız Kafe", model: "AK100", serialNo: "2026-101" }],
  giderTurleri: [{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }],
  tedarikciler: [{ id: 11, ad: "Yıldız Döküm", yetkili: "Ayşe Kaya", telefon: "0532 111 22 33", vergiNo: "1234567890" }],
  giderler: [
    { id: 101, turId: 1, aciklama: "Bant alımı", tedarikciId: 11, tarih: "2026-03-15", tutar: 20000, kdvOrani: 20, taksitler: [] },
    { id: 103, turId: 2, aciklama: "Depo kirası", tarih: "2026-05-01", tutar: 30000, kdvOrani: 0, stopajOrani: 0, girisYonu: "brut",
      taksitler: [{ id: "t1", hedef: "ana", sira: 1, vade: "2026-06-10", tutar: 15000 }, { id: "t2", hedef: "ana", sira: 2, vade: "2026-07-10", tutar: 15000 }] },
    { id: 104, turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", aciklama: "Hasan Çelik", resmiTutar: 31337, tarih: "2026-03-20", taksitler: [] },
  ],
  giderTanimlari: [{ id: 201, turId: 1, ad: "Yıldız aylık bakım", tedarikciId: 11, baslangicAy: "2026-01" }, { id: 202, turId: 1, ad: "Eski servis", baslangicAy: "2025-01", bitisAy: "2026-02", kapatildi: true }],
  uretimPartileri: [{ id: 401, ad: "Yaz Partisi", baslangicAy: "2026-07", bitisAy: "2026-08", aciklama: "AK100 serisi" }],
  kasaHesaplari: [{ id: 501, ad: "Ziraat Vadesiz", tur: "banka", paraBirimi: "TRY" }, { id: 502, ad: "Eski Kasa", tur: "kasa", paraBirimi: "TRY", kapali: true }],
  cekler: [{ id: 601, yon: "alinan", no: "CK-778899", banka: "Vakıfbank", kesideci: "Yıldız Ticaret", durum: "portfoy" },
    { id: 603, yon: "verilen", no: "VR-1002", banka: "Ziraat", alacakliTur: "tedarikci", alacakliAd: "Yıldız Döküm", durum: "yazildi" }],
};
const aramaEkrani = (ek = {}) => <GlobalSearch {...ARAMA_VERI} giderYetki kasaYetki onOpenCustomer={bos} onGoGider={bos} onGoGiderTanim={bos} onGoKasa={bos} {...ek} />;
// Spec 0072: 12 aya dağıtılmış peşin internet aboneliği (Eylül 2026, görüntü aracının bugününden önce) ve peşin yıllık kira.
const G_0072 = [...GIDERLER,
  k(41, { tedarikciId: 12, aciklama: "İnternet aboneliği", tutar: 12000, tarih: "2026-09-02", dagitimAy: 12 }),
  k(42, { turId: 1, tutar: 60000, kdvOrani: 0, tedarikciId: 11, aciklama: "Depo kirası (yıllık peşin)", tarih: "2026-08-01", dagitimAy: 12 })];
// Spec 0092: aracın sabit bugünü 2026-09-23; Haziran'da (yürürlük ayı) peşin ödenen dört aylık bakım sözleşmesinin kapsamı
// 2026-09-30'da biter (Anasayfa'nın üçüncü sayısında). Maliyet ekranı için 0088 verisine Ocak tarihli yıllık sigorta eklenir.
const K_0092 = k(43, { tedarikciId: 12, aciklama: "Bakım sözleşmesi (peşin)", tutar: 8000, tarih: "2026-06-05", dagitimAy: 4, odendi: true });
const TANIM_0092 = { id: 92, ad: "Yazılım aboneliği (yıllık)", turId: 4, tutar: 6000, kdvOrani: 20, kdvYonu: "haric", tedarikciId: 12, baslangicAy: "2026-06", uretilenAylar: [], dagitimAy: 12 };
const M88_KAPSAM = { id: 92, tarih: "2026-01-10", turId: 1, tutar: 12000, kdvOrani: 20, aciklama: "Yıllık sigorta", dagitimAy: 12 };
const ARAMA_KUTU = "doldur:Müşteri, seri no, teklif no, servis, bayi, not ara...";

const EKRANLAR = {
  "giderler-rapor": [<GiderEkrani />, []],
  // Spec 0081: Dönem Raporu'nun beş yan kutusu kapalı başlar (giderler-rapor kapalı hâldir); bir kutu açık ve hepsi açık hâl.
  "giderler-0081-bir-acik": [<GiderEkrani />, ["tikla:Gider Türü Kırılımı", "kaydir:Gider Türü Kırılımı"]],
  // Spec 0090 R9, R42: kovalar kutusu kalktı, dört kutu açılır.
  "giderler-0081-hepsi-acik": [<GiderEkrani h0={[]} />, ["tikla:Gider Türü Kırılımı", "tikla:KDV Karşılaştırması",
    "tikla:Tedarikçi Kırılımı", "tikla:Ödeme Yöntemi Kırılımı", "kaydir:Gider Türü Kırılımı"]],
  "giderler-bos-tursuz": [<GiderEkrani g0={[]} turler={[]} />, []],
  "giderler-yururluk-oncesi": [<GiderEkrani ayar={{ giderAyarlari: { yururlukAy: "2026-12" } }} />, []],
  "giderler-tedarikciler": [<GiderEkrani />, ["Tedarikler ve Ekstre"]],
  "giderler-aralik": [<GiderEkrani />, ["Tarih Aralığı"]],
  "gider-formu": [<GiderEkrani />, ["Yeni Gider"]],
  "finans": [<FINANS />, ["Göster"]],
  "evrak-musteri": [<EvrakEkrani teklif={T0()} />, ["2026-00001"]],
  "evrak-bayi": [<EvrakEkrani teklif={T0({ aliciTipi: "bayi", dealerId: 3, firma: "Ege Bayi" })} />, ["2026-00001"]],
  ...Object.fromEntries(["app", "musteri", "servispano", "company", "calisanlar", "models", "kaliplar", "yedekparca", "gidertur", "gidertanim", "giderayar",
    "kdv", "kkkomisyon", "evrak", "takip", "backup", "export", "import", "trash", "sahipsiz",
    // Triyaj bulgu 1: yalnız ad değişikliği (Section → KartBolum) alan sekmeler de görüntüyle doğrulanır.
    "danger", "eposta", "mailsablon", "sentmail", "optimize", "security", "server", "ceviri", "parcatipi"].map(t => [`ayarlar-${t}`, [ayarlar(t), []]])),
  // 2FA bölümü (SettingsTwoFactor) yalnız sunucuya bağlıyken çizilir: sahte istemci bağlantısıyla.
  "ayarlar-server-istemci": [ayarlar("server"), []],
  // Spec 0011: uyarı şeridinin altı çağrısının hepsi (tür tanımsız ve mükerrer yukarıdaki ekranlarda).
  "giderler-uretim-bilgi": [<GiderEkrani />, ["~Eylül 2026 tekrarlayan"]],
  "giderler-uretim-basari": [<GiderEkrani t0={[{ ...TANIMLAR[0], id: 72, ad: "Depo kirası", uretilenAylar: [] }]} />, ["~Eylül 2026 tekrarlayan"]],
  "giderler-aralik-gecersiz": [<GiderEkrani />, ["Tarih Aralığı", "doldur:Başlangıç tarihi=2026-09-30", "doldur:Bitiş tarihi=2026-09-01"]],
  "giderler-hatirlatma": [<GiderEkrani />, ["~Hatırlatma kapsamı ("]],
  "giderler-kapsam-disi": [<GiderEkrani />, ["Tarih Aralığı", "doldur:Başlangıç tarihi=2026-05-01", "doldur:Bitiş tarihi=2026-09-30"]],
  // Spec 0014: sekme ve süzgeç çubukları.
  "musteriler-liste": [<Customers customers={MUSTERI_LISTE} setCustomers={bos} partSales={[]} services={[]} payments={[]} />, []],
  "bayiler-liste": [<SimpleDealers dealers={BAYI_LISTE} setDealers={bos} factory={{ name: "Altuntaş Makina" }} setFactory={bos} partSales={BAYI_KALIP} services={[]} customers={MUSTERILER} showToast={bos} />, []],
  "stok-alt-sekme": [stokEkrani("makina"), []],
  "stok-yedek-parca-suzgec": [stokEkrani("yedeksatis"), []],
  "evrak-sekme": [<EvrakEkrani teklif={T0()} />, []],
  "finans-aralik": [<FINANS />, []],
  "notlar-suzgec": [<Notes notes={NOTLAR} setNotes={bos} aktifKullanici="kerem" />, []],
  "analiz-onayar": [<Analiz customers={MUSTERILER} services={[]} partSales={[]} yedekParcaSatislar={YP_SATIS} parts={[{ id: 7, ad: "Rulman" }]} appSettings={{}} />, []],
  // Spec 0015: formlar.
  "musteri-formu": [<Customers customers={MUSTERI_LISTE} setCustomers={bos} partSales={[]} services={[]} payments={[]} stock={[]} setStock={bos} />, ["~Yeni Müşteri"]],
  "musteri-formu-hata": [<Customers customers={MUSTERI_LISTE} setCustomers={bos} partSales={[]} services={[]} payments={[]} stock={[]} setStock={bos} />,
    ["~Yeni Müşteri", "doldur:Yetkili 1 - Telefon=abc", "doldur:E-posta=yanlis"]],
  "bayi-formu": [<SimpleDealers dealers={BAYI_LISTE} setDealers={bos} factory={{ name: "Altuntaş Makina" }} setFactory={bos} partSales={[]} services={[]} customers={MUSTERILER} showToast={bos} />, ["~Bayi/Servis Ekle"]],
  "servis-formu": [musteriDetay(), ["~Yeni Servis Talebi"]],
  "kalip-formu": [musteriDetay(), ["~Extra Kalıp Satışı"]],
  "yedek-parca-formu": [stokEkrani("yedeksatis"), ["~Yeni Satış"]],
  "makina-stok-formu": [stokEkrani("makina"), ["~Stoğa Makina Ekle"]],
  "parca-stok-formu": [stokEkrani("parca"), ["~Stoğa Parça Ekle"]],
  "uretim-formu": [stokEkrani("uretim"), ["~Yeni Form"]],
  "not-formu": [<Notes notes={NOTLAR} setNotes={bos} aktifKullanici="kerem" />, ["~Yeni Not"]],
  "eposta-formu": [<EpostaEkrani />, []],
  "katalog-model": [ayarlar("models"), ["~Yeni Model Ekle"]],
  // Spec 0091 R1, R28: bir model "Üretimde" işaretinden çıkarılmış panel ve kapsam ipucusu.
  "katalog-model-uretimde": [ayarlar("models", { appSettings: { ...AYAR, uretimdeOlmayanModeller: [MODELLER[0].model] } }), []],
  // Spec 0087 R18: parça formu (maliyetli düzenleme ve maliyetsiz yeni kayıt), maliyeti girilmemiş ibaresi, adetli kit ve ek kalem.
  "katalog-parca": [ayarlar("yedekparca", { parts: PARCA_0087, standardModels: MODELLER_0087 }), ["baslik:Düzenle", "kaydir:Kullanıldığı Modeller ve Kit Adetleri"]],
  // Spec 0096: kırılımlı parça kartı (pasif maliyet alanı), tutarsız kırılım uyarısı, boş durum, hata, süzgeç, gider yetkisiz görünüm.
  "katalog-parca-0096-kirilim": [ayarlar("yedekparca", { parts: PARCA_0096, standardModels: MODELLER_0087, tedarikciler: TED_0096 }), ["baslik:Düzenle", "kaydir:Hammadde tedarikçileri"]],
  "katalog-parca-0096-tutarsiz": [ayarlar("yedekparca", { parts: [MIL_0096, ...PARCA_0087], standardModels: MODELLER_0087, tedarikciler: TED_0096 }), ["baslik:Düzenle", "kaydir:Hammadde tedarikçileri"]],
  "katalog-parca-0096-bos": [ayarlar("yedekparca", { parts: PARCA_0087, standardModels: MODELLER_0087 }), ["baslik:Düzenle", "kaydir:Hammadde tedarikçileri"]],
  "katalog-parca-0097-gecmis": [ayarlar("yedekparca", { parts: PARCA_0097, standardModels: MODELLER_0087, tedarikciler: TED_0096 }), ["baslik:Düzenle", "kaydir:Maliyet geçmişi"]],
  "katalog-parca-0097-hata": [ayarlar("yedekparca", { parts: PARCA_0097, standardModels: MODELLER_0087, tedarikciler: TED_0096 }), ["baslik:Düzenle", "doldur:Alış maliyeti=20", "doldur:Geçerlilik tarihi=2026-05-15", "Kaydet", "kaydir:Alış maliyeti"]],
  "katalog-parca-0096-hata": [ayarlar("yedekparca", { parts: PARCA_0096, standardModels: MODELLER_0087, tedarikciler: TED_0096 }), ["baslik:Düzenle", "doldur:Hammadde tutarı 1=-5", "Kaydet", "kaydir:Hammadde tedarikçileri"]],
  "ayarlar-yedekparca-0096-suzgec": [ayarlar("yedekparca", { parts: PARCA_0096, standardModels: MODELLER_0087, tedarikciler: TED_0096 }), ["sec:Hammadde tedarikçisi süzgeci=32"]],
  "ayarlar-yedekparca-0096-yetkisiz": [ayarlar("yedekparca", { parts: PARCA_0096, standardModels: MODELLER_0087, tedarikciler: TED_0096, giderYetki: false }), []],
  "katalog-parca-yeni": [ayarlar("yedekparca", { parts: PARCA_0087, standardModels: MODELLER_0087 }), ["~Parça/Yedek Parça Ekle"]],
  "ayarlar-yedekparca-maliyetsiz": [ayarlar("yedekparca", { parts: PARCA_0087, standardModels: MODELLER_0087 }), []],
  // Spec 0099: kırılım toplamının yeri. Yetkisiz kullanıcının penceresi (C3, değişmez), iki tedarikçili ekleme penceresi (AC-19)
  // ve kırılımsız elle maliyetli parçanın penceresi (R10, değişmez).
  "katalog-parca-0099-yetkisiz": [ayarlar("yedekparca", { parts: PARCA_0096, standardModels: MODELLER_0087, tedarikciler: TED_0096, giderYetki: false }), ["baslik:Düzenle", "kaydir:Alış maliyeti"]],
  "katalog-parca-0099-ekle": [ayarlar("yedekparca", { parts: PARCA_0087, standardModels: MODELLER_0087, tedarikciler: TED_0096 }), ["~Parça/Yedek Parça Ekle", "Tedarikçi ekle", "sec:Hammadde tedarikçisi 1=31", "doldur:Hammadde tutarı 1=7000", "Tedarikçi ekle", "sec:Hammadde tedarikçisi 2=32", "doldur:Hammadde tutarı 2=9000", "kaydir:Hammadde tedarikçileri"]],
  "katalog-parca-0099-elle": [ayarlar("yedekparca", { parts: PARCA_0087, standardModels: MODELLER_0087, tedarikciler: TED_0096 }), ["baslik:Düzenle", "kaydir:Alış maliyeti"]],
  "katalog-model-ekmaliyet": [ayarlar("models", { parts: PARCA_0087, standardModels: MODELLER_0087 }), ["baslik:Düzenle", "kaydir:Ek Maliyet Kalemleri"]],
  "katalog-calisan": [ayarlar("calisanlar"), []],
  "musteri-detay": [musteriDetay(), ["~Yeni Sahip"]],
  // Spec 0011: serbest içerikli şerit örneği (yalnız "sonra"; önceki bileşen children almıyordu). Üç aile.
  "sozluk-serbest-icerik": [<div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 900 }}>
    {Tasarim.UyariSeridi && ["bilgi", "uyari", "basari"].map(a => (
      <Tasarim.UyariSeridi key={a} aile={a}>Firmaya göre gruplu görünüm: <b>12 firma</b> (15 makina kaydı). Birden fazla makinası olan firmaya tıklayınca tüm makinaları listelenir.</Tasarim.UyariSeridi>
    ))}
  </div>, []],
  "ayarlar-company-acik": [ayarlar("company"), ["Firma Bilgileri"]],
  // Spec 0016 (DoD + plan G7).
  "musteriler-bos-arama": [<Customers customers={MUSTERI_LISTE} setCustomers={bos} partSales={[]} services={[]} payments={[]} />, ["doldur:Müşteri ara...=zzz"]],
  "musteriler-bos-kayit": [<Customers customers={[]} setCustomers={bos} partSales={[]} services={[]} payments={[]} />, []],
  "musteriler-gruplu": [<Customers customers={MUSTERI_LISTE} setCustomers={bos} partSales={[]} services={[]} payments={[]} />, ["Firmaya Göre Grupla"]],
  "bayiler-bos": [<SimpleDealers dealers={[]} setDealers={bos} factory={{ name: "Altuntaş Makina" }} setFactory={bos} partSales={[]} services={[]} customers={[]} showToast={bos} />, []],
  "bayi-detay": [bayiDetay(4, { services: BAYI_SERVIS }), []],
  "bayi-detay-bos": [bayiDetay(4), []],
  "stok-bos": [stokBos("makina"), []],
  "stok-bos-parca": [stokBos("parca"), []],
  "stok-bos-yedek": [stokBos("yedeksatis"), []],
  "stok-bos-uretim": [stokBos("uretim"), []],
  // Spec 0065 R18: parça hareketleri (karşı hareket satırıyla) ve stok tutarlılığı (sapmalı + sıra belirsiz, tutarlı).
  "parca-stok-hareketleri": [stokBos("parca", { parts: [{ id: 7, ad: "Rulman" }], partStock: [{ id: 1, partId: "7", miktar: 9 }], partStockLog: STOK_LOG_0065 }), ["dugme:Hareketler"]],
  "parca-stok-tutarlilik": [stokBos("parca", { parts: [{ id: 7, ad: "Rulman" }, { id: 8, ad: "V Kayış" }, { id: 9, ad: "Conta" }],
    partStock: [{ id: 1, partId: "7", miktar: 12 }, { id: 2, partId: "8", miktar: 4 }, { id: 3, partId: "9", miktar: 40 }],
    partStockLog: [...STOK_LOG_0065, { id: 9104, partId: "8", miktar: 5, tip: "manuel_duzelt", tarih: "2026-09-05", notlar: "Sayım düzeltmesi" },
      { id: 9105, partId: "8", miktar: -1, tip: "servis", referansId: 41, tarih: "2026-09-05", notlar: "" },
      { id: 9106, partId: "9", miktar: 40, tip: "stok_girisi", tarih: "2026-09-01", notlar: "" }] }), ["dugme:Stok Tutarlılığı"]],
  "parca-stok-tutarli": [stokBos("parca", { parts: [{ id: 7, ad: "Rulman" }], partStock: [{ id: 1, partId: "7", miktar: 9 }], partStockLog: STOK_LOG_0065 }), ["dugme:Stok Tutarlılığı"]],
  "stok-parca-uyari": [stokBos("parca", { parts: [{ id: 7, ad: "Rulman" }, { id: 8, ad: "V Kayış" }, { id: 9, ad: "Conta" }], partStock: [{ partId: 8, miktar: 3 }, { partId: 9, miktar: 40 }] }), []],
  "finans-bos": [<Finance customers={[]} services={[]} dealers={[]} partSales={[]} yedekParcaSatislar={[]} factory={{ name: "Altuntaş Makina" }} rates={{}}
    payments={[]} teklifler={[]} serverPermissions={null} />, []],
  "evrak-bos": [<EvrakEkrani />, []],
  "evrak-bos-arama": [<EvrakEkrani teklif={T0()} />, ["doldur:Firma adı veya belge no ara...=zzz"]],
  "notlar-bos": [<Notes notes={[]} setNotes={bos} aktifKullanici="kerem" />, []],
  "notlar-bos-arama": [<Notes notes={NOTLAR} setNotes={bos} aktifKullanici="kerem" />, ["doldur:Notlarda ara...=zzz"]],
  "analiz-bos": [<Analiz customers={[]} services={[]} partSales={[]} yedekParcaSatislar={[]} parts={[]} appSettings={{}} />, []],
  // Spec 0016 Aşama 2 (plan H7). Görüşmeler ve Dosyalar başlığa tıklanarak açılır.
  "musteri-detay-bolumler": [detay(601, { dosyaCevrimdisi: true }), ["*Görüşmeler (", "*Dosyalar ("]],
  "musteri-detay-bos": [detay(603), ["*Görüşmeler (", "*Dosyalar ("]],
  "musteri-detay-yeni-sahip": [detay(601), ["~Yeni Sahip"]],
  // Spec 0030 (plan B10). "kaydir:metin" o metni içeren öğeyi görünür alana kaydırır (pencere içi kutular için).
  "gider-formu-personel": [<GiderForm kalem={{ turId: 3, calisanId: 21, tarih: "2026-09-10" }} giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL}
    giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, []],
  // Spec 0090 R1, R42: "gider-formu-personel-makina" silindi (formda atama bölümü yok).
  // Triyaj bulgu 1: dönem raporu kalem listesi, personel grubu açık. Spec 0090 R10 ile atama sütunu kalktı; ekran personel
  // grubunun açık hâlini göstermeye devam eder.
  "giderler-rapor-personel-acik": [<GiderEkrani g0={[...GIDERLER, ...PERSONEL_ATAMALI]} />, ["dugme:Çalışanları göster", "kaydir:Zeynep Arslan"]],
  // Spec 0021: taksit ve vergi dairesi (stopaj) ödemesi.
  "gider-formu-taksit": [<GiderForm kalem={TAKSITLI_K} giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL} giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, ["kaydir:Ödeme planı"]],
  "gider-formu-kira-stopaj": [<GiderForm kalem={{ ...KIRA_K, kdvOrani: 20 }} giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL} giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, ["kaydir:Vergi dairesi (stopaj)"]],
  // Spec 0084: stopaj vadesi ön dolu yeni kira kalemi, Stopaj Dönemleri penceresi, dönemin toplu ödemesi, Anasayfa grup satırı.
  "gider-formu-0084-on-dolu": [<GiderForm kalem={{ ...KIRA_K, id: null, taksitler: [] }} giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL} giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, ["kaydir:Vergi dairesi (stopaj)"]],
  "giderler-0084-stopaj-donemleri": [<GiderEkrani g0={STOPAJ_0084} h0={[]} />, ["dugme:Kira stopajı ("]],
  "giderler-0084-donemi-ode": [<GiderEkrani g0={STOPAJ_0084} h0={[]} />, ["dugme:Kira stopajı (", "dugme:Dönemi öde"]],
  "anasayfa-hatirlatma-0084": [<Dashboard customers={MUSTERILER} dealers={DEALERS} services={[]} payments={[]} rates={{ usd: 41.25, eur: 48.1 }} factory={{ name: "Altuntaş Makina" }}
    giderYetki giderler={STOPAJ_0084} setHesapHareketleri={bos} giderTurleri={TURLER} tedarikciler={TED} giderAyarlari={AYAR.giderAyarlari} />, ["Gider Ödemeleri", "dugme:Kalemleri göster"]],
  "giderler-taksit-liste": [<GiderEkrani g0={TAKSIT_GIDERLER} />, ["kaydir:Gider Kalemleri"]],
  "giderler-taksit-borc": [<GiderEkrani g0={TAKSIT_GIDERLER} />, ["kaydir:Kime Ne Kadar Borçluyuz"]],
  "giderler-odeme-plani": [<GiderEkrani g0={TAKSIT_GIDERLER} />, ["dugme:Ödeme planı"]],
  "anasayfa-hatirlatma-taksit": [<Dashboard customers={MUSTERILER} dealers={DEALERS} services={[]} payments={[]} rates={{ usd: 41.25, eur: 48.1 }} factory={{ name: "Altuntaş Makina" }}
    giderYetki giderler={TAKSIT_GIDERLER} setHesapHareketleri={bos} giderTurleri={TURLER} tedarikciler={TED} giderAyarlari={AYAR.giderAyarlari} />, ["Gider Ödemeleri"]],
  // Spec 0022: üretim partisi.
  // Spec 0088 R23/4: parti yönetimi Makina Maliyeti ekranına taşındı (aynı parti verisi, makinaMaliyet verilir).
  "maliyet-uretim-partileri": maliyetPartiEkrani([]),
  // Spec 0089 R11, R12: parti değişim kutusunun yeni yeri (Makina Maliyeti › Üretim Partileri) ve kovalar kutusunda kopmuş
  // atama sayısı (iki modeli silinmiş tek kalem: "1 kalem").
  "maliyet-0089-parti-degisim": maliyetPartiEkrani(["kaydir:Kapanmış partilerin aylarında"]),
  // Spec 0090 R7, R8, R42: "giderler-0089-kova-dusen" silindi (kovalar kutusu ve kopmuş atama satırı yok). Yerine aynı veriyle
  // Dönem Raporu: atama sütunu ve dağıtım rozeti olmayan kalem listesi, dört yan kutu.
  "giderler-0090-rapor": [<GiderEkrani g0={[...GIDERLER, { ...KIS_0076, id: 891, kisitliGider: false, indirilebilirOran: undefined, dagitimAy: undefined, aciklama: "Eski model kalıbı",
    atamaTur: "model", modelSatirlari: [{ modelAd: "ESKI_A", birimMaliyet: 100, adet: 1 }, { modelAd: "ESKI_B", birimMaliyet: 50, adet: 2 }] }]} />,
    ["kaydir:Gider Kalemleri"]],
  "maliyet-0090-parti-neden": maliyetPartiNedenEkrani(),
  "maliyet-uretim-partisi-formu": maliyetPartiEkrani(["~Yeni Üretim Partisi"]),
  "maliyet-modeller": maliyetEkrani({}),
  "maliyet-modeller-dokum": maliyetEkrani({}, ["dugme:▸ AK100"]),
  "maliyet-katsayi-formu": maliyetEkrani({}, ["baslik:Katsayı ve liste fiyatı"]),
  "maliyet-bos-rol": maliyetEkrani({ turler: M88.TURLER.map(({ maliyetRolu: _r, ...t }) => t) }),
  "maliyet-bos-ayar": maliyetEkrani({ ayar: null }),
  // Spec 0091 R7–R16: üretimde olmayan modeller. 0088 verisinde AK100 dönemde üretilmiş, AK120 ve AK200 üretilmemiş.
  "maliyet-modeller-uretimde-kapali": maliyetEkrani({ a0: { uretimdeOlmayanModeller: ["AK120"] } }),
  "maliyet-modeller-uretimde-acik": maliyetEkrani({ a0: { uretimdeOlmayanModeller: ["AK120"] } }, ["dugme:Üretimde olmayanları da göster"]),
  "maliyet-modeller-isaret-bilgi": maliyetEkrani({}),
  "maliyet-modeller-isaret-uyari": maliyetEkrani({ a0: { uretimdeOlmayanModeller: ["AK100"] } }, ["dugme:Üretimde olmayanları da göster"]),
  "maliyet-modeller-bos-uretimde": maliyetEkrani({ a0: { uretimdeOlmayanModeller: ["AK100", "AK120", "AK200"] } }),
  "maliyet-parti": maliyetEkrani({}, ["Parti Hesabı"]),
  "maliyet-0097-parti-tarihli": [<MaliyetEkrani0097 />, []],
  "maliyet-0097-parti-acik": [<MaliyetEkrani0097 />, ["sec:Üretim partisi=2"]],
  "maliyet-0097-parti-baslamadi": [<MaliyetEkrani0097 />, ["sec:Üretim partisi=3"]],
  "maliyet-parti-planli": maliyetEkrani({}, ["Parti Hesabı", "sec:Üretim partisi=803"]),
  "maliyet-parti-plan-formu": maliyetEkrani({}, ["Parti Hesabı", "sec:Üretim partisi=803", "dugme:Planlanan adetler"]),
  "maliyet-parti-bos": maliyetEkrani({}, ["Parti Hesabı", "sec:Üretim partisi=802"]),
  // Spec 0093 R1, R3, R7: planlanan adetler penceresi yalnız üretimdeki modelleri listeler. 803'ün kayıtlı adetleri AK100: 10 ve
  // modeli bulunamayan ESKI_AD: 4. Süzülmüş ızgara (AK120 gizli, kayıtlı adedi yok); gizli ama adedi kayıtlı model (AK100);
  // hepsi gizli (boş durum, gizli bölüm ve bulunamayan bölümü birlikte).
  "maliyet-0093-plan-suzulmus": maliyetEkrani({ a0: { uretimdeOlmayanModeller: ["AK120"] } }, ["Parti Hesabı", "sec:Üretim partisi=803", "dugme:Planlanan adetler"]),
  "maliyet-0093-plan-gizli-adet": maliyetEkrani({ a0: { uretimdeOlmayanModeller: ["AK100"] } }, ["Parti Hesabı", "sec:Üretim partisi=803", "dugme:Planlanan adetler"]),
  "maliyet-0093-plan-bos": maliyetEkrani({ a0: { uretimdeOlmayanModeller: ["AK100", "AK120", "AK200"] } }, ["Parti Hesabı", "sec:Üretim partisi=803", "dugme:Planlanan adetler"]),
  "maliyet-ayarlar": maliyetEkrani({}, ["Hesap Ayarları"]),
  "maliyet-ayarlar-oneri": maliyetEkrani({ ayar: null }, ["Hesap Ayarları"]),
  "maliyet-ayarlar-hata": maliyetEkrani({ ayar: { baslangicAy: "2026-12", bitisAy: "2026-01", varsayilanAdet: 0 } }, ["Hesap Ayarları", "dugme:Kaydet"]),
  "maliyet-ayarlar-rol-uyari": maliyetEkrani({ turler: M88.TURLER.map(t => (t.id === 3 ? { ...t, maliyetRolu: "urunAgaci" } : t)) }, ["Hesap Ayarları", "kaydir:Gider türlerinin maliyet rolü"]),
  "gider-tur-sil-rol": [<GiderTurManager giderTurleri={[{ id: 1, ad: "Genel", davranis: "normal", maliyetRolu: "genel" }, { id: 2, ad: "Tedarik", davranis: "normal", maliyetRolu: "urunAgaci" }]}
    setGiderTurleri={bos} giderler={[{ id: 9, tarih: "2026-02-01", turId: 1, tutar: 100 }]} setGiderler={bos} giderTanimlari={[]} setGiderTanimlari={bos} />, ["baslik:Sil"]],
  "stok-makina-parti": [<Stock factory={{ name: "Altuntaş Makina" }} stock={PARTI_STOK} setStock={bos} customers={MUSTERILER} setCustomers={bos} parts={[]} dealers={DEALERS}
    yedekParcaSatislar={[]} defaultSubTab="makina" showToast={bos} uretimPartileri={[P_KAPALI, P_ACIK]} giderYetki models={MODELLER} />, ["~Stoğa Makina Ekle", "kaydir:Üretim partisi"]],
  // Spec 0100: durum süzgeçli liste, parti üretim panosu (dolu ve partisiz), Anasayfa kutusu ve penceresi.
  "stok-0100-durum-suzgec": [stok0100("makina"), ["etiket:Montajda (3)"]],
  "stok-0101-kalip-capi": [stok0100("makina", { stock: STOK_0101 }), []],
  "stok-0101-form-capli": [stok0100("makina", { stock: STOK_0101 }), ["~Stoğa Makina Ekle", "doldur:Çap=50", "doldur:Arka Ölçü=80", "doldur:Boy=115"]],
  "stok-0100-pano": [stok0100("pano"), []],
  "stok-0100-pano-bos": [stok0100("pano", { uretimPartileri: [] }), []],
  "anasayfa-0100-kutu": [anasayfa0100, []],
  "anasayfa-0100-pencere": [anasayfa0100, ["~Satışa Hazır Makina"]],
  // Spec 0023: ek ödemeler.
  "gider-formu-ek-odeme": [<GiderForm kalem={EK_ODEMELI} giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL} giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, ["kaydir:Ek ödemeler (bu ay)"]],
  "giderler-personel-ayrinti-kapali": [<GiderEkrani g0={[...GIDERLER.filter(x => x.turId !== 3), EK_ODEMELI]} />, ["tikla:Gider Türü Kırılımı", "kaydir:Gider Türü Kırılımı"]], // spec 0081: kutu kapalı başlar
  // Spec 0042: resmi (ana) + elden iki hedefli personel kalemi; liste, Ödeme planı ve çok satırlı ödeme (Resmi / Elden).
  "giderler-personel-iki-hedef": [<GiderEkrani g0={[PERSONEL_IKI]} h0={[odm(5201, 5, 30000, "2026-09-20", { taksitId: 5101, hesapId: 401 })]} />, ["dugme:Çalışanları göster", "kaydir:Gider Kalemleri"]],
  "giderler-personel-odeme-plani": [<GiderEkrani g0={[PERSONEL_IKI]} h0={[odm(5201, 5, 30000, "2026-09-20", { taksitId: 5101, hesapId: 401 })]} />, ["dugme:Çalışanları göster", "dugme:Ödeme planı"]],
  "giderler-personel-coklu-odeme": [<GiderEkrani g0={[PERSONEL_IKI]} h0={[]} />, ["dugme:Çalışanları göster", "dugme:Ödeme planı", "dugme:Ödeme gir", "sec:Taksit=5101", "sec:Ödeme yöntemi=Havale", "dugme:Başka yöntemle satır ekle", "sec:Taksit 2=5102", "sec:Ödeme yöntemi 2=Nakit"]],
  "giderler-personel-ayrinti-acik": [<GiderEkrani g0={[...GIDERLER.filter(x => x.turId !== 3), EK_ODEMELI]} />, ["tikla:Gider Türü Kırılımı", "dugme:▸ Aç", "kaydir:Gider Türü Kırılımı"]], // spec 0081: kutu kapalı başlar
  "anasayfa-kart-rozetleri": [<Dashboard customers={MUSTERILER} dealers={DEALERS} services={[]} payments={KK_ODEME} rates={{ usd: 41.25, eur: 48.1 }} factory={{ name: "Altuntaş Makina" }} />, []],
  // Spec 0098 R4/2: panonun servis formu, tahsilat hesabı yetkisiyle (App'in verdiği iki prop) ve yetkisiz (prop yok).
  "servis-pano-0098-hesap": [<ServisPanosu services={[PANO_SERVIS_0098]} setServices={bos} customers={MUSTERILER} dealers={DEALERS} parts={[{ id: 7, ad: "Rulman" }]} calisanlar={CAL}
    factory={{ name: "Altuntaş Makina" }} kasaHesaplari={KASA_HESAPLAR} tahsilatHesapVarsayilan={() => 402} />, ["*Kutu Gıda", "*Ücret henüz tahsil edilmedi", "kaydir:Tahsilatın girdiği hesap"]],
  "servis-pano-0098-hesapsiz": [<ServisPanosu services={[PANO_SERVIS_0098]} setServices={bos} customers={MUSTERILER} dealers={DEALERS} parts={[{ id: 7, ad: "Rulman" }]} calisanlar={CAL}
    factory={{ name: "Altuntaş Makina" }} />, ["*Kutu Gıda", "*Ücret henüz tahsil edilmedi", "kaydir:Ücret tahsil edildi"]],
  "servis-pano-kalip": [<ServisPanosu services={[]} setServices={bos} customers={MUSTERILER} dealers={DEALERS} parts={[{ id: 7, ad: "Rulman" }]} calisanlar={CAL}
    partSales={PANO_KALIP} setPartSales={bos} kalipYetki yedekParcaSatislar={PANO_YP} setYedekParcaSatislar={bos} kargoYetki factory={{ name: "Altuntaş Makina" }} />, []],
  "stok-tahsis-modali": [<Stock factory={{ name: "Altuntaş Makina" }} stock={[]} setStock={bos} customers={MUSTERILER} setCustomers={bos} parts={[{ id: 7, ad: "Rulman" }]}
    dealers={DEALERS} yedekParcaSatislar={DIS_FIRMA_YP} setYedekParcaSatislar={bos} defaultSubTab="yedeksatis" showToast={bos} />, ["*Makinaya tahsis et"]],
  "servis-formu-odendi": [<FormEkrani Bilesen={ServiceForm} title="Servis Talebini Düzenle"
    ilk={{ customerId: 500, date: "2026-09-20", type: "Garanti Dışı", repairPlace: "Yerinde Onarım", islemFirma: "Altuntaş Makina", faturaTipi: "Faturalı Yurtiçi", currency: "TRY", servisUcreti: "1500", odendi: true, yontem: "Nakit", degisenParcalar: [] }} />, ["kaydir:Ödeme Yöntemi"]],
  "kalip-formu-odendi": [<FormEkrani Bilesen={PartSaleForm} title="Kaydı Düzenle"
    ilk={{ id: 751, customerId: 500, tur: "Kalıp", tarih: "2026-09-20", currency: "TRY", faturaTipi: "Faturasız Yurtiçi", satisFirma: "Altuntaş Makina", ad: "Hamburger", ucret: "500", odendi: true, yontem: "Nakit", fabrikaTeslim: false, kaliplar: [] }} />, ["kaydir:Ödeme Yöntemi"]],
  "yedek-parca-formu-odendi": [<FormEkrani Bilesen={YedekParcaSatisForm} title="Yedek Parça Satışını Düzenle"
    ilk={{ id: 761, aliciTipi: "bayi", dealerId: 3, partId: 7, miktar: 2, birimFiyat: "350", currency: "TRY", tarih: "2026-09-20", faturaTipi: "Faturasız Yurtiçi", odendi: true, yontem: "Nakit", fabrikaTeslim: false, tahsisler: [] }} />, ["kaydir:Ödeme Yöntemi"]],
  "yedek-parca-formu-kargo": [stokEkrani("yedeksatis"), ["~Yeni Satış", "kaydir:Kargoyu Veren Kişi"]],
  "musteri-detay-tahsis": [detay(601, { yedekParcaSatislar: TAHSIS_YP }), ["kaydir:Yedek Parça (Bayi)"]],
  // Spec 0067 R20: 0050'nin iki maliyet kutusu ekranı kaldırıldı; kutusuz detay gider yetkisiyle (AC-8, AC-14).
  "musteri-detay-0067": [detay(601, { giderYetki: true, makinaMaliyet: MALIYET_0067 }), ["kaydir:Kalıplar ("]],
  // Spec 0024 A: kasa, ödeme penceresi, kısmi ödeme, tahsilat hesabı.
  "kasa-hesaplar": [kasaEkrani(), ["~Ziraat Bankası"]],
  "kasa-hesap-hareketleri-kart": [kasaEkrani(), ["~Şirket Kartı"]],
  "kasa-hesap-formu": [kasaEkrani(), ["dugme:Yeni Hesap"]],
  "kasa-virman": [kasaEkrani(), ["dugme:Virman"]],
  "kasa-bos": [kasaEkrani({ kasaHesaplari: [], hesapHareketleri: [], payments: [] }), []],
  "giderler-kismen-odeme": [<GiderEkrani g0={TAKSIT_GIDERLER} h0={KASA_HAREKETLER} />, ["kaydir:Gider Kalemleri"]],
  "giderler-odeme-kayit": [<GiderEkrani g0={TAKSIT_GIDERLER} h0={KASA_HAREKETLER} />, ["dugme:Kısmen ödendi"]],
  "giderler-odeme-kayit-taksit": [<GiderEkrani g0={TAKSIT_GIDERLER} h0={KASA_HAREKETLER} />, ["dugme:Ödeme planı", "dugme:Ödeme gir"]],
  // Spec 0041: 1 numaralı kalem Havale + Nakit ile kısmen ödenmiş (Karma); çok satırlı ödeme penceresi ve dönem kırılımı.
  "giderler-karma-yontem": [<GiderEkrani g0={TAKSIT_GIDERLER} h0={KARMA_H} />, ["kaydir:Gider Kalemleri"]],
  "giderler-yontem-kirilimi": [<GiderEkrani g0={TAKSIT_GIDERLER} h0={KARMA_H} />, ["tikla:Ödeme Yöntemi Kırılımı", "kaydir:Ödeme Yöntemi Kırılımı"]], // spec 0081: kutu kapalı başlar
  "giderler-coklu-odeme": [<GiderEkrani g0={TAKSIT_GIDERLER} h0={KARMA_H} />, ["dugme:Ödenmedi", "doldur:Ödeme tutarı=4000", "dugme:Başka yöntemle satır ekle", "sec:Ödeme yöntemi 2=Kredi Kartı"]],
  "giderler-coklu-odeme-hata": [<GiderEkrani g0={TAKSIT_GIDERLER} h0={KARMA_H} />, ["dugme:Ödenmedi", "doldur:Ödeme tutarı=4000", "dugme:Başka yöntemle satır ekle", "doldur:Ödeme tutarı 2=999999", "dugme:Ödemeyi Kaydet"]],
  "giderler-odeme-plani-hareket": [<GiderEkrani g0={TAKSIT_GIDERLER} h0={KASA_HAREKETLER} />, ["dugme:Ödeme planı"]],
  "kasa-calisan-avanslari": [kasaB(), ["kaydir:Çalışan avansları"]],
  "kasa-avans-formu": [kasaB(), ["dugme:Avans Ver"]],
  "kasa-calisan-ekstresi": [kasaB({ calisanlar: [CAL[0]] }), ["dugme:Ekstre"]],
  "giderler-mahsup": [mahsupPenceresi(), ["dugme:Avanstan mahsup"]],
  // Spec 0053: yöntem yalnız ödeme satırında, hedef başına çok satır, düzenleme formunda ödeme, çek her yoldan, mahsup formda.
  "gider-formu-0053-iki-satir": [<GiderForm kalem={{ turId: 5, tutar: "30000", kdvOrani: "0", tedarikciId: 12, tarih: "2026-09-20", aciklama: "Sac" }} {...FORM_ODEME} />,
    ["etiket:Tedarikçiye ödendi", "doldur:Tedarikçiye ödeme tutarı=20000", "dugme:Başka yöntemle satır ekle", "sec:Tedarikçiye ödeme yöntemi 2=Nakit", "kaydir:Ödeme tarihi"]],
  "gider-formu-0053-personel-elden": [<GiderForm kalem={{ turId: 3, calisanId: 21, resmiTutar: "30000", eldenTutar: "20000", tarih: "2026-09-20" }} {...FORM_ODEME} />,
    // Spec 0054 R16: çok hedefli personelde hedef adları "Maaş (resmi)" / "Maaş (elden)" (adımların etiketleri buna göre).
    ["etiket:Maaş (elden) ödendi", "doldur:Maaş (elden) ödeme tutarı=15000", "dugme:Başka yöntemle satır ekle", "sec:Maaş (elden) ödeme yöntemi 2=Havale", "kaydir:Maaş (elden) · "]],
  "gider-formu-0053-duzenle": [duzenle48(D48_PERS), ["etiket:Çalışana ödendi", "sec:Çalışana ödeme yöntemi=Nakit", "kaydir:Kayıtlı ödemeler"]],
  "gider-formu-0053-duzenle-ciro": [duzenle48(D48_TAKSITLI), ["etiket:Tedarikçiye ödendi", "sec:Tedarikçiye ödeme yöntemi=Çek (ciro)", "sec:Tedarikçiye çek=3401", "kaydir:Ciro edilecek çek"]],
  "gider-formu-0053-mahsup": [<GiderForm kalem={odemeleriUygula([D48_PERS], D48_HAR, turHaritasi(TURLER))[0]} {...FORM_ODEME} giderler={[D48_PERS]} hareketBolumu
    hareketler={[...D48_HAR, { id: 48105, tur: "avans", tarih: "2026-09-05", tutar: 6000, calisanId: 21, hesapId: 401 }]} />, ["dugme:Avanstan mahsup", "kaydir:Mahsup tarihi"]],
  // Spec 0054: ödenmiş maaşa prim eklenir; maaş hedefleri "Ödendi" kalır, prim kendi hedefinde açık ve formdan ödenir;
  // kaydedilmiş kalemde ek hedef Ödeme planından açılan pencereyle ödenir.
  "gider-formu-0054-ek-hedef": [<GiderForm kalem={odemeleriUygula([D54_PERS], D54_HAR, turHaritasi(TURLER))[0]} {...FORM_ODEME} hareketler={D54_HAR} hareketBolumu onHedefOde={bos} />,
    ["dugme:Ek ödeme ekle", "doldur:Ek ödeme resmi 1=9500", "etiket:Ek ödeme (resmi) ödendi", "kaydir:Kayıtlı ödemeler"]],
  "giderler-0054-ek-pencere": [<GiderEkrani g0={[D54_EKLI]} h0={D54_HAR} />, ["dugme:Çalışanları göster", "dugme:Ödeme planı", "dugme:Ödeme gir"]],
  // Spec 0057: taksitli hedefin taksiti formdan ödenir (yeni kalemde satır + taksit seçici), çek satırında dağıtım notu,
  // düzenlemede taksit sayısı değişince dar pasif durum.
  "gider-formu-0057-taksit-yeni": [<GiderForm kalem={{ turId: 5, tutar: "60000", kdvOrani: "0", tedarikciId: 12, tarih: "2026-09-20", taksitSayisi: "6", sonOdemeTarihi: "2026-09-30" }} {...FORM_ODEME} />,
    ["doldur:Taksit sayısı=6", "etiket:Tedarikçiye ödendi", "kaydir:Ödeme tarihi"]],
  "gider-formu-0057-cek-dagitim": [<GiderForm kalem={{ turId: 5, tutar: "60000", kdvOrani: "0", tedarikciId: 12, tarih: "2026-09-20", taksitSayisi: "6", sonOdemeTarihi: "2026-09-30" }} {...FORM_ODEME} />,
    ["doldur:Taksit sayısı=6", "etiket:Tedarikçiye ödendi", "sec:Tedarikçiye ödeme yöntemi=Çek (ciro)", "sec:Tedarikçiye çek=3401", "kaydir:Ödeme tarihi"]],
  "gider-formu-0057-plan-degisti": [duzenle48(D48_TAKSITLI), ["doldur:Taksit sayısı=4", "kaydir:Ödeme tarihi"]],
  "giderler-odeme-0053-cek": [<GiderEkrani g0={TAKSIT_GIDERLER} h0={KASA_HAREKETLER} cekli={{ cekler: CEKLER, setCekler: bos, payments: cekleriUygula(CEK_ODEMELER, CEKLER) }} />, ["dugme:Kısmen ödendi", "sec:Ödeme yöntemi=Çek (ciro)", "sec:Çek=3401"]],
  "giderler-tedarikci-ekstresi": [<GiderEkrani g0={TAKSIT_GIDERLER} h0={KASA_B} />, ["Tedarikler ve Ekstre", "dugme:Ekstre"]],
  // Spec 0040: çek portföyü, ciro, durum, geçmiş, çekle tahsilat.
  "kasa-cek-portfoyu": [kasaCek(), ["Çek Portföyü"]],
  "kasa-cek-tumu": [kasaCek(), ["Çek Portföyü", "dugme:Tümü"]],
  "kasa-cek-ciro": [kasaCek(), ["Çek Portföyü", "dugme:Ciro Et", "sec:Tedarikçi=11"]],
  "kasa-cek-durum": [kasaCek(), ["Çek Portföyü", "dugme:Durum"]],
  "kasa-cek-gecmis": [kasaCek(), ["Çek Portföyü", "dugme:Ciro edildi", "dugme:Geçmiş"]],
  // Spec 0049 A: portföye elle eklenmiş (tahsilatsız) çek, Çek Ekle penceresi, bağsız çekin durum penceresi.
  "kasa-cek-bagsiz": [kasaCek({ cekler: [...CEKLER, BAGSIZ_CEK] }), ["Çek Portföyü"]],
  "kasa-cek-ekle": [kasaCek(), ["Çek Portföyü", "dugme:Çek Ekle"]],
  "kasa-cek-bagsiz-durum": [kasaCek({ cekler: [...CEKLER, BAGSIZ_CEK] }), ["Çek Portföyü", "dugme:Durum"]],
  // Spec 0049 B: verilen çekler, Çek Yaz penceresi, ödenen çekin bakiyeye düşmesi, gider formunda ve ödeme penceresinde kendi çek.
  "kasa-cek-verilen": [kasaCek({ cekler: [...CEKLER, ...VERILEN_CEKLER] }), ["Çek Portföyü", "Verilen çekler", "dugme:Tümü"]],
  "kasa-cek-yaz": [kasaCek({ cekler: [...CEKLER, ...VERILEN_CEKLER] }), ["Çek Portföyü", "Verilen çekler", "dugme:Çek Yaz", "sec:Tedarikçi=11"]],
  "kasa-verilen-cek-bakiye": [kasaCek({ cekler: [...CEKLER, ...VERILEN_CEKLER] }), []],
  "gider-formu-odeme-kendi": [<GiderForm kalem={{ turId: 5, tutar: "30000", kdvOrani: "0", tedarikciId: 12, tarih: "2026-09-20", aciklama: "Sac" }} {...FORM_ODEME} />,
    ["etiket:Tedarikçiye ödendi", "sec:Tedarikçiye ödeme yöntemi=Çek (kendi)", "doldur:Tedarikçiye çek numarası=A-000124", "sec:Tedarikçiye çek hesabı=401", "kaydir:Ödeme tarihi"]],
  "giderler-kendi-cek-dugmesi": [<GiderEkrani g0={TAKSIT_GIDERLER} h0={KASA_HAREKETLER} cekli />, ["dugme:Kısmen ödendi"]],
  "giderler-kendi-cek-penceresi": [<GiderEkrani g0={TAKSIT_GIDERLER} h0={KASA_HAREKETLER} cekli />, ["dugme:Kısmen ödendi", "dugme:Kendi çekiyle öde"]],
  "musteri-tahsilat-cek": [detay(601, { cekler: CEKLER }), ["dugme:Ödeme Ekle", "dugme:+ Ödeme Ekle", "sec:Ödeme yöntemi 1=Çek"]],
  // Spec 0043: Mali İşler menü grubu (gerçek App kabuğu; önce/sonra aynı sayfa, önce düz menüyü çizer).
  "uygulama-menu-acik": [<App />, ["Giderler"]],
  "uygulama-menu-kapali": [<App />, ["Finans", "Mali İşler"]], // perde bu derlemede inik: Kasa menüde yok
  "uygulama-menu-dar": [<App />, []],
  "uygulama-menu-tek-cocuk": [<App />, ["Finans"]],
  // Spec 0052: Kasa sekme izni (gerçek App kabuğu ve izin ekranı).
  "uygulama-menu-kasasiz": [<App />, ["Giderler"]],
  "uygulama-menu-kasali": [<App />, ["Giderler"]],
  "kullanici-izin-kasa": [<UserManager flash={bos} />, ["dugme:Düzenle"]],
  "kullanici-izin-0098-kasali": [<UserManager flash={bos} />, ["dugme:Düzenle", "tikla:Kasa işlemleri", "kaydir:Tahsilat hesabı"]],
  "kullanici-izin-0098-kasasiz": [<UserManager flash={bos} />, ["dugme:Düzenle", "tikla:Kasa işlemleri", "kaydir:Tahsilat hesabı"]],
  // Spec 0066 R21: kasa kutuları ve ipucu kendi "Kasa işlemleri" akordeonunda.
  "kullanici-izin-kasa-ipucu": [<UserManager flash={bos} />, ["dugme:Düzenle", "tikla:Kasa işlemleri", "kaydir:Hesaplar ve hareketler"]],
  "kullanici-izin-kasa-0066": [<UserManager flash={bos} />, ["dugme:Düzenle", "tikla:Gider işlemleri", "tikla:Kasa işlemleri", "kaydir:Tedarikçi yönetimi"]],
  "musteri-tahsilat-hesap": [detay(601, { kasaHesaplari: KASA_HESAPLAR, kasaYetki: true, tahsilatHesapYetki: true }), ["dugme:Ödeme Ekle", "dugme:+ Ödeme Ekle"]],
  // Spec 0044: tahsilatın hesabı. Kasa hareketlerinde tahsilat satırları, hesapsız tahsilat listesi, Ödendi anahtarının penceresi,
  // formlarda seçici ve bedeli bize ait olmayan serviste açıklama satırı.
  "kasa-tahsilat-hareketleri": [kasaTahsilat(), ["~Ziraat Bankası"]],
  "kasa-hesapsiz-tahsilatlar": [kasaTahsilat(), ["dugme:Listeyi göster", "kaydir:Hesap ata"]],
  // Spec 0056: deneme döneminde hareketli hesabın silinmesi: bağlı kayıtlar türüyle, "Başka hesaba taşı" (hedef seçici) ve
  // virmanı olan hesapta "Hesapsız bırak" engeli. Görüntü aracının bugünü (2026-09-23) varsayılan 01.01.2027'den önce.
  "kasa-0056-sil-tasi": [kasaEkrani({ setPayments: bos }), ["etiket:Hesabı sil: Şirket Kartı"]],
  "kasa-0056-sil-engel": [kasaEkrani({ setPayments: bos }), ["etiket:Hesabı sil: Merkez Kasa", "dugme:Hesapsız bırak"]],
  // Spec 0058: hesapsız ödeme ve tahsilat listeleri, satırda ve topluca kapsam dışı; ayrı bölüm ve geri alma; toplu onay.
  "kasa-0058-listeler": [<KasaKapsamEkrani />, ["dugme:Ödemeleri göster", "dugme:Listeyi göster", "kaydir:Kapsam dışı bırakmak"]],
  "kasa-0058-kapsam-disi": [<KasaKapsamEkrani k0={KAPSAM_K0} />, ["dugme:Göster", "kaydir:Kapsam dışı bırakılanlar"]],
  "kasa-0058-toplu-onay": [<KasaKapsamEkrani />, ["dugme:Ödemeleri göster", "dugme:kaydı kapsam dışı bırak"]], // spec 0062 R17: etiket "Listedeki"; adım iki metinde de bulur
  // Spec 0073: hareketlerin düzenlenmesi (ödeme, virman, avans, göç hareketi; hesapsız liste işlem sütunu).
  "kasa-0073-odeme-duzenle": [kasaEkrani(), ["etiket:Hareketi düzenle: Eylül elektrik"]],
  "kasa-0073-virman-duzenle": [kasaEkrani(), ["etiket:Hareketi düzenle: Ziraat Bankası → Merkez Kasa"]],
  "kasa-0073-avans-duzenle": [kasaB(), ["~Merkez Kasa", "etiket:Hareketi düzenle: Hasan Çelik"]],
  "kasa-0073-hesapsiz-liste": [kasaB(), ["dugme:Ödemeleri göster", "kaydir:Hesabı belirtilmemiş ödemeler"]],
  "kasa-0073-goc-duzenle": [kasaEkrani(), ["dugme:Ödemeleri göster", "etiket:Hareketi düzenle: Sac levha"]],
  // Spec 0072: maliyete dağıtım (form alanı etkin/pasif/kira, tanım, kalem rozeti, Makina ve Model kutusu, kârlılık notu ve detay).
  // Spec 0090 R2, R3, R42: "gider-formu-0072", "-makina", "-kira" ve "ayarlar-gidertanim-0072" silindi (alan yok).
  // Spec 0092 R42/2: ekran bu spec'in adıyla yeniden adlandırıldı (iki peşin kalemin kapsam rozeti).
  "giderler-0092-liste": [<GiderEkrani g0={G_0072} />, ["kaydir:İnternet aboneliği"]],
  // Spec 0092 R42: kapsadığı ay sayısı (form alanı dolu ve hatalı, tanım formu ve listesi), pay özeti ve Üretim Partileri bilgi
  // satırı, Anasayfa kartının üç sayısı ve pencerenin üçüncü bölümü, Gider Ayarları'nın eşik alanı.
  "gider-formu-0092-dolu": [<GiderForm kalem={{ ...K_0092 }} giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL} giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, ["kaydir:Kapsadığı ay sayısı"]],
  "gider-formu-0092-hata": [<GiderForm kalem={{ ...K_0092, id: null, dagitimAy: "61", taksitler: [] }} giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL} giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, ["dugme:Kaydet", "kaydir:Kapsadığı ay sayısı"]],
  "ayarlar-gidertanim-0092": [ayarlar("gidertanim", { giderTanimlari: [TANIM_0092, ...TANIMLAR] }), []],
  "ayarlar-gidertanim-0092-form": [ayarlar("gidertanim", { giderTanimlari: [TANIM_0092, ...TANIMLAR] }), ["baslik:Düzenle", "kaydir:Kapsadığı ay sayısı"]],
  "maliyet-0092-pay": maliyetEkrani({ giderler: [...M88.GIDERLER, M88_KAPSAM] }),
  "maliyet-0092-partiler": maliyetEkrani({ p0: [P_KAPALI, P_ACIK], musteriler: PARTI_MUSTERI, stok: PARTI_STOK, giderler: [...GIDERLER, K_0092], turler: GENEL_TURLER }, ["Üretim Partileri"]),
  "anasayfa-0092-kart": [<Dashboard customers={MUSTERILER} dealers={DEALERS} services={[]} payments={[]} rates={{ usd: 41.25, eur: 48.1 }} factory={{ name: "Altuntaş Makina" }}
    giderYetki giderler={[...GIDERLER, K_0092]} setHesapHareketleri={bos} giderTurleri={TURLER} tedarikciler={TED} giderAyarlari={AYAR.giderAyarlari} />, ["kaydir:Gider Ödemeleri"]],
  "anasayfa-0092-hatirlatma": [<Dashboard customers={MUSTERILER} dealers={DEALERS} services={[]} payments={[]} rates={{ usd: 41.25, eur: 48.1 }} factory={{ name: "Altuntaş Makina" }}
    giderYetki giderler={[...GIDERLER, K_0092]} setHesapHareketleri={bos} giderTurleri={TURLER} tedarikciler={TED} giderAyarlari={AYAR.giderAyarlari} />, ["Gider Ödemeleri", "kaydir:Kapsamı doluyor ("]],
  "ayarlar-giderayar-0092": [ayarlar("giderayar"), ["kaydir:Kapsam bitişi hatırlatma eşiği"]],
  // Spec 0051: başlangıç tarihiyle süzülmüş hesapsız liste, "Hepsini göster", hareket listesinde ve ekstrede ödemenin hedefi.
  "kasa-hesapsiz-esik": [kasaTahsilat({ giderAyarlari: { hesapsizBaslangic: "2026-09-20" } }), ["dugme:Listeyi göster", "kaydir:Hesap ata"]],
  "kasa-hesapsiz-hepsi": [kasaTahsilat({ giderAyarlari: { hesapsizBaslangic: "2026-09-20" } }), ["dugme:Hepsini göster", "dugme:Listeyi göster", "kaydir:Hesap ata"]],
  "kasa-hareket-hedef": [kasa51(), ["~Ziraat Bankası"]],
  "kasa-ekstre-hedef": [kasa51(), ["dugme:Ekstre"]],
  "musteri-tahsilat-hesap-penceresi": [detay(601, { services: [...DETAY_SERVIS, TH_DETAY_SERVIS], kasaHesaplari: KASA_HESAPLAR, kasaYetki: true, tahsilatHesapYetki: true, tahsilatHesapVarsayilan: () => 402 }),
    ["dugme:Ödenmedi · işaretle: Ödendi"]],
  "servis-formu-tahsilat-hesap": [<FormEkrani Bilesen={ServiceForm} title="Servis Talebini Düzenle" kasaHesaplari={KASA_HESAPLAR}
    ilk={{ customerId: 500, date: "2026-09-20", type: "Garanti Dışı", repairPlace: "Yerinde Onarım", islemFirma: "Altuntaş Makina", faturaTipi: "Faturalı Yurtiçi", currency: "TRY", servisUcreti: "1500", odendi: true, yontem: "Nakit", hesapId: 402, degisenParcalar: [] }} />, ["kaydir:Tahsilatın girdiği hesap"]],
  "servis-formu-tahsilat-neden": [<FormEkrani Bilesen={ServiceForm} title="Servis Talebini Düzenle" kasaHesaplari={KASA_HESAPLAR} dealers={[{ ...DEALERS[0], anlasmaliServisMi: true }]}
    ilk={{ customerId: 500, date: "2026-09-20", type: "Garanti Dışı", repairPlace: "Yerinde Onarım", islemFirma: "Ege Bayi", faturaTipi: "Faturalı Yurtiçi", currency: "TRY", servisUcreti: "1500", odendi: true, yontem: "Nakit", degisenParcalar: [] }} />, ["kaydir:Bu bedel anlaşmalı firmaya ait"]],
  "kalip-formu-tahsilat-hesap": [<FormEkrani Bilesen={PartSaleForm} title="Kaydı Düzenle" kasaHesaplari={KASA_HESAPLAR}
    ilk={{ id: 751, customerId: 500, tur: "Kalıp", tarih: "2026-09-20", currency: "TRY", faturaTipi: "Faturasız Yurtiçi", satisFirma: "Altuntaş Makina", ad: "Hamburger", ucret: "500", odendi: true, yontem: "Nakit", hesapId: 401, fabrikaTeslim: false, kaliplar: [{ ad: "Hamburger", olcu: "", fiyat: 500 }] }} />, ["kaydir:Tahsilatın girdiği hesap"]],
  "yedek-parca-formu-tahsilat-hesap": [<FormEkrani Bilesen={YedekParcaSatisForm} title="Yedek Parça Satışını Düzenle" kasaHesaplari={KASA_HESAPLAR}
    ilk={{ id: 761, aliciTipi: "bayi", dealerId: 3, partId: 7, miktar: 2, birimFiyat: "350", currency: "TRY", tarih: "2026-09-20", faturaTipi: "Faturasız Yurtiçi", odendi: true, yontem: "Nakit", hesapId: 401, fabrikaTeslim: false, tahsisler: [] }} />, ["kaydir:Tahsilatın girdiği hesap"]],
  // Spec 0045: tutar alanında binlik ayracı ve pencere alt satırında düğme boşluğu (sarmalayıcısız beş form).
  "gider-formu-tutar": [<GiderForm kalem={{ turId: 5, tarih: "2026-09-20", tutar: "1234567,5", kdvOrani: 20, tedarikciId: 12, aciklama: "Sac" }} giderTurleri={TURLER} tedarikciler={TED}
    calisanlar={CAL} giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, []],
  "giderler-tedarikci-formu": [<GiderEkrani />, ["Tedarikler ve Ekstre", "dugme:Yeni Tedarikçi"]],
  "ayarlar-gidertanim-formu": [ayarlar("gidertanim"), ["dugme:Yeni Tanım"]],
  "ayarlar-gidertur-duzenle": [ayarlar("gidertur"), ["baslik:Düzenle"]],
  "kasa-hesap-formu-tutar": [kasaEkrani(), ["dugme:Yeni Hesap", "doldur:Açılış bakiyesi=150000"]],
  // Spec 0046: gider formundan hedef bazlı ödeme ve çek cirosu.
  "gider-formu-odeme-personel": [<GiderForm kalem={{ turId: 3, calisanId: 21, resmiTutar: "30000", eldenTutar: "20000", tarih: "2026-09-20" }} {...FORM_ODEME} />,
    ["Hepsini ödendi işaretle", "sec:Maaş (elden) ödeme yöntemi=Nakit", "sec:Maaş (resmi) hesabı=401", "kaydir:Ödeme tarihi"]],
  "gider-formu-odeme-kira": [<GiderForm kalem={{ turId: 1, girisYonu: "brut", tutar: "20000", kdvOrani: "0", stopajOrani: "20", tedarikciId: 11, tarih: "2026-09-20", taksitSayisi: "3", sonOdemeTarihi: "2026-09-30" }} {...FORM_ODEME} />,
    ["etiket:Vergi dairesine (stopaj) ödendi", "sec:Vergi dairesine (stopaj) hesabı=402", "kaydir:Ödeme tarihi"]],
  "gider-formu-odeme-ciro": [<GiderForm kalem={{ turId: 5, tutar: "30000", kdvOrani: "0", tedarikciId: 12, tarih: "2026-09-20", aciklama: "Sac" }} {...FORM_ODEME} />,
    ["etiket:Tedarikçiye ödendi", "sec:Tedarikçiye ödeme yöntemi=Çek (ciro)", "sec:Tedarikçiye çek=3401", "kaydir:Ödeme tarihi"]],
  "gider-formu-odeme-taksitli": [<GiderForm kalem={{ turId: 5, tutar: "30000", kdvOrani: "20", tedarikciId: 12, tarih: "2026-09-20", taksitSayisi: "4", sonOdemeTarihi: "2026-09-30" }} {...FORM_ODEME} />,
    // Spec 0057 R9: "bütün ödemeleri taksitli" notu kalktı; ekran ödeme bölümüne kaydırılır. Form taksit sayısını kalem
    // prop'undan almadığı için (yeni kalemde plan alanı formun durumu) sayı adımla girilir.
    ["doldur:Taksit sayısı=4", "kaydir:Ödeme tarihi"]],
  "gider-formu-odeme-duzenle": [<GiderForm kalem={odemeleriUygula([GIDERLER[0]], KASA_HAREKETLER, turHaritasi(TURLER))[0]} {...FORM_ODEME} onHedefOde={bos} />, ["kaydir:Kısmen · kalan"]],
  // Spec 0048: düzenleme formunda canlı ödeme kutusu (ek ödeme öncesi/sonrası, aşım, bölünmezlik nedeni, plan hatası).
  "gider-formu-duzenle-ek-once": [duzenle48(D48_PERS), ["kaydir:Ödemeler gider listesindeki"]],
  "gider-formu-duzenle-ek-sonra": [duzenle48(D48_PERS), ["dugme:Ek ödeme ekle", "doldur:Ek ödeme elden 1=9500", "kaydir:Ödemeler gider listesindeki"]],
  "gider-formu-duzenle-asim": [duzenle48(D48_NORMAL), ["doldur:Tutar=30000", "kaydir:Ödemeler gider listesindeki"]],
  "gider-formu-duzenle-bolunmez": [duzenle48(D48_BOLUNMEZ), ["kaydir:Ödemeler gider listesindeki"]],
  "gider-formu-duzenle-plan-hatasi": [duzenle48(D48_TAKSITLI), ["doldur:Tutar=3000", "kaydir:Ödemeler gider listesindeki"]],
  // Spec 0047: Aylık Gider ve Kasa Raporu belgesi (beyaz kâğıt) ve üç ekrandaki düğme.
  // Spec 0060 R1, R2, R6: kalem listesinde hedef başına rozet ve personel grubunun açılmış kırılımı.
  "giderler-0060-hedef-rozetleri": [<GiderEkrani g0={G0060} h0={H0060} />, ["kaydir:Gider Kalemleri"]],
  "giderler-0060-personel-acik": [<GiderEkrani g0={G0060} h0={H0060} />, ["dugme:Çalışanları göster", "kaydir:Gider Kalemleri"]],
  // Spec 0061 R24: açık kalemler kipi (tüm dönemler) ve bir kovaya süzülmüş hâli.
  // Spec 0062: sayfalama (R1–R10, R23).
  "kasa-0062-hareketler": [kasaEkrani(KASA62), []],
  "kasa-0062-hareketler-sayfa2": [kasaEkrani(KASA62), sayfa2([])],
  "kasa-0062-hesapsiz-odemeler": [kasaHesapsiz62(), ["dugme:Ödemeleri göster"]],
  "kasa-0062-hesapsiz-odemeler-sayfa2": [kasaHesapsiz62(), sayfa2(["dugme:Ödemeleri göster"])],
  "kasa-0062-hesapsiz-tahsilatlar": [kasaHesapsiz62(), ["dugme:Listeyi göster"]],
  "kasa-0062-hesapsiz-tahsilatlar-sayfa2": [kasaHesapsiz62(), sayfa2(["dugme:Listeyi göster"])],
  "kasa-0062-kapsam-disi": [kasaHesapsiz62({ k0: K62 }), ["dugme:Göster", "kaydir:Kapsam dışı bırakılanlar"]],
  "kasa-0062-kapsam-disi-sayfa2": [kasaHesapsiz62({ k0: K62 }), sayfa2(["dugme:Göster"])],
  "kasa-0062-cek-alinan": [kasaCek({ cekler: CEK62 }), ["Çek Portföyü"]],
  "kasa-0062-cek-alinan-sayfa2": [kasaCek({ cekler: CEK62 }), sayfa2(["Çek Portföyü"])],
  "kasa-0062-cek-verilen": [kasaCek({ cekler: CEK62 }), ["Çek Portföyü", "Verilen çekler"]],
  "kasa-0062-cek-verilen-sayfa2": [kasaCek({ cekler: CEK62 }), sayfa2(["Çek Portföyü", "Verilen çekler"])],
  "giderler-0062-kalemler": [gider62(), ["kaydir:Gider Kalemleri"]],
  "giderler-0062-tedarikciler": [gider62({ tedler: TED62 }), ["Tedarikler ve Ekstre"]],
  // Spec 0080: Gider Kalemleri ve Tedarikçiler sayfalanmaz; 0062'nin iki "-sayfa2" ekranı kaldırıldı (düğme yokken adım
  // sessizce sayfa 1'i çekiyordu). Tam liste ekranları listenin sonunu gösterir (son kalem, alt toplam, ardından borç özeti).
  "giderler-0080-kalemler-tam": [gider62(), ["kaydir:Kime Ne Kadar Borçluyuz"]],
  "giderler-0080-kalemler-suzgec-bos": [gider62(), ["doldur:Açıklama ara=yokboyle", "kaydir:Gider Kalemleri"]],
  "giderler-0080-tedarikciler-tam": [gider62({ tedler: TED62 }), ["Tedarikler ve Ekstre", "kaydir:Tedarikçi 11"]],
  "giderler-0080-tedarikciler-bos": [gider62({ tedler: [] }), ["Tedarikler ve Ekstre"]],
  "giderler-0062-acik-kalemler": [gider62(), ["dugme:Açık kalemler (tüm dönemler)", "kaydir:Taraf"]],
  "giderler-0062-acik-kalemler-sayfa2": [gider62(), [...sayfa2(["dugme:Açık kalemler (tüm dönemler)"]), "kaydir:Gider tarihi"]],
  "giderler-0062-ekstre": [gider62(), ["Tedarikler ve Ekstre", "dugme:Ekstre"]],
  "giderler-0062-ekstre-sayfa2": [gider62(), sayfa2(["Tedarikler ve Ekstre", "dugme:Ekstre"])],
  // Spec 0068: Çöp Kutusu satırları ve kalıcı silme bilgi satırı, İşlem Geçmişi parti etiketi, çek raporu, iki silme penceresi.
  "ayarlar-0068-trash": [ayarlar("trash", { tedarikciler: COP_TED, uretimPartileri: COP_PARTI, setUretimPartileri: bos }), []],
  "ayarlar-0068-auditlog": [ayarlar("auditlog"), []],
  // Spec 0085 (R23, P1): sahte köprüyle sunucu kipi (kart) ve Kullanıcı Geçmişi (sürüm rozeti).
  "ayarlar-server-sunucu": [ayarlar("server"), []],
  "ayarlar-guvenlik-gecmisi": [ayarlar("securitylog"), []],
  "ayarlar-0068-export-cek": [ayarlar("export", { kasaVeriYetki: true, cekler: CEK68 }), ["tikla:Müşteri & Servis (5)"]],
  "giderler-0068-tedarikci-sil": [<GiderEkrani tedler={[{ id: 14, ad: "Akın Hırdavat" }, ...TED]} />, ["Tedarikler ve Ekstre", "baslik:Sil"]],
  // Spec 0096: hammadde rozetli tedarikçi listesi (kullanım parça sayar) ve parça sayısını yazan "silinemez" penceresi.
  "giderler-0096-tedarikciler": [<GiderEkrani tedler={TED_0096} parcalar={PARCA_0096} />, ["Tedarikler ve Ekstre"]],
  "giderler-0096-tedarikci-sil": [<GiderEkrani tedler={[TED_0096[0]]} parcalar={PARCA_0096} />, ["Tedarikler ve Ekstre", "baslik:Sil"]],
  "anasayfa-0062-hatirlatma": [hatirlatma62, ["Gider Ödemeleri"]],
  "anasayfa-0062-hatirlatma-sayfa2": [hatirlatma62, [...sayfa2(["Gider Ödemeleri"]), "kaydir:Yaklaşan ("]], // son "Sonraki ›" yaklaşan bölümün
  "giderler-acik-kalemler": [<GiderEkrani g0={G0061} h0={H0060} />, ["dugme:Açık kalemler (tüm dönemler)"]],
  "giderler-acik-kalemler-kova": [<GiderEkrani g0={G0061} h0={H0060} />, ["dugme:Açık kalemler (tüm dönemler)", "dugme:90+ gün"]],
  "gider-kasa-raporu-belge": [<div style={{ background: "#fff", margin: -24, padding: 8 }} dangerouslySetInnerHTML={{ __html: buildGiderKasaRaporuHtml(giderKasaRaporu(RAPOR_VERI, "2026-09")) }} />, []],
  // Spec 0055: kalem listesi seçeneği kalktı; "-kalemsiz" ekranı yerine kalemsiz (boş) ayın belgesi (boş tablo basılmaz).
  "gider-kasa-raporu-bos": [<div style={{ background: "#fff", margin: -24, padding: 8 }} dangerouslySetInnerHTML={{ __html: buildGiderKasaRaporuHtml(giderKasaRaporu({ ...RAPOR_VERI, giderler: [] }, "2026-09")) }} />, []],
  // Spec 0059: detay tabloları (geciken kalem, kira hedefli ödeme, EUR tahsilat, ay içi çekler, virman) ve geçen ay eki.
  "gider-kasa-raporu-detay": [<div style={{ background: "#fff", margin: -24, padding: 8 }} dangerouslySetInnerHTML={{ __html: buildGiderKasaRaporuHtml(giderKasaRaporu(RAPOR_0059_GIRDI(), "2026-09")) }} />, []],
  "giderler-rapor-dugmesi": [<GiderEkrani rapor={RAPOR_VERI} />, []],
  "kasa-rapor-dugmesi": [kasaEkrani({ giderKasaRaporVerisi: RAPOR_VERI }), []],
  "finans-rapor-dugmesi": [<FINANS rapor={RAPOR_VERI} />, []],
  // Tekrarlayan giderler tablosu, yerleşim testinin uzun içerikli verisiyle (1440 genişlikte, Ayarlar menüsü olmadan).
  // Spec 0063: ilk ödeme satırlarında hesap (iki satır, ön seçim), bayi detayından yedek parça ve kalıp satışında hesap alanı.
  "musteri-formu-ilk-odeme": [<Customers customers={MUSTERI_LISTE} setCustomers={bos} partSales={[]} services={[]} payments={[]} stock={[]} setStock={bos}
    kasaHesaplari={KASA_HESAPLAR} kasaYetki tahsilatHesapYetki tahsilatHesapVarsayilan={() => 402} />,
    ["~Yeni Müşteri", "doldur:Satın alan firma / kişi=Yeni Kafe", "dugme:+ Ödeme Ekle", "doldur:Tahsilat tutarı 1=30000", "dugme:+ Ödeme Ekle", "doldur:Tahsilat tutarı 2=70000", "kaydir:İlk Ödeme (Kapora/Ödeme)"]],
  "musteri-tahsilat-hesap-satir": [detay(601, { kasaHesaplari: KASA_HESAPLAR, kasaYetki: true, tahsilatHesapYetki: true, tahsilatHesapVarsayilan: () => 402 }),
    ["dugme:Ödeme Ekle", "dugme:+ Ödeme Ekle", "doldur:Tahsilat tutarı 1=4000", "dugme:+ Ödeme Ekle", "doldur:Tahsilat tutarı 2=6000"]],
  "bayi-yedek-parca-formu": [<SimpleDealers dealers={DEALERS} setDealers={bos} factory={{ name: "Altuntaş Makina" }} setFactory={bos} partSales={[]} services={[]} customers={MUSTERILER}
    showToast={bos} openDetailId={3} parts={[{ id: 7, ad: "Rulman" }]} partStock={[{ partId: 7, miktar: 20 }]} setYedekParcaSatislar={bos} setPartStock={bos} setPartStockLog={bos}
    kasaHesaplari={KASA_HESAPLAR} tahsilatHesapVarsayilan={() => 402} />,
    ["dugme:Yedek Parça Satışı", "ara:Parça ara...=Rul>Rulman", "doldur:Adet=2", "doldur:Birim fiyat 1=1500", "*Ücret henüz tahsil edilmedi", "kaydir:Tahsilatın girdiği hesap"]],
  "bayi-kalip-formu": [<SimpleDealers dealers={DEALERS} setDealers={bos} factory={{ name: "Altuntaş Makina" }} setFactory={bos} partSales={[]} setPartSales={bos} services={[]} customers={MUSTERILER}
    setCustomers={bos} showToast={bos} openDetailId={3} kalipDefs={[{ id: 1, ad: "Hamburger" }]} kasaHesaplari={KASA_HESAPLAR} tahsilatHesapVarsayilan={() => 402} />,
    ["dugme:Bayi Aracılığıyla Kalıp Satışı", "doldur:Firma adı, model veya seri no ile ara...=Kutu", "~Kutu Gıda", "ara:Kalıp ara...=Ham>Hamburger", "doldur:Kalıp fiyatı 1=2000",
      "*Ücret henüz tahsil edilmedi", "kaydir:Tahsilatın girdiği hesap"]],
  // Spec 0064 R34: kilitli gider formu, ödeme penceresi, katalog paneli, Çöp Kutusu ve geri yükleme ön denetimi.
  "kilit-gider-formu": [<GiderEkrani />, ["baslik:Düzenle"]],
  // Spec 0077 D: kayıt perdesi açık bir form penceresinin (Modal 1000) üstünde.
  "kayit-perdesi": [<><GiderEkrani /><KayitPerdesi acik logo={LOGO} durum="yolda" /></>, ["baslik:Düzenle"]],
  // Spec 0078: Çöp Kutusu'nda yeni satır türleri (ödeme, avans, çek, tanım, tür, kasa hesabı; spec 0082 ile standart gider kalktı); çeke bağlı
  // canlı hareketi olan çekte Kalıcı Sil yok ve neden yazılı.
  "cop-kutusu-0078": [<SettingsTrash rawCustomers={[]} rawServices={[]} rawPartSales={[]} rawPayments={[]} rawDealers={[]} rawStock={[]} rawNotes={[]}
    rawKalipDefs={[]} rawParts={[]} rawCustomModels={[]} setCustomers={bos} setServices={bos} setPartSales={bos} setPayments={bos} setDealers={bos} setStock={bos}
    setNotes={bos} setKalipDefs={bos} setParts={bos} setCustomModels={bos} setTeklifler={bos} setFaturalar={bos} appSettings={{}} showToast={bos} giderYetki kasaVeriYetki
    giderTurleri={[{ id: 1, ad: "Personel", davranis: "personel" }, { id: 9, ad: "Elektrik", davranis: "normal" }, { id: 3, ad: "Sigorta", davranis: "normal", deletedAt: "2026-09-20T09:00:00.000Z" }]}
    setGiderTurleri={bos} rawGiderler={[]} setGiderler={bos} rawTedarikciler={[]} setTedarikciler={bos} rawUretimPartileri={[]} setUretimPartileri={bos}
    rawHesapHareketleri={[{ id: 71, tur: "odeme", tarih: "2026-09-05", tutar: 4000, hesapId: 51, giderId: 5, deletedAt: "2026-09-21T09:00:00.000Z" },
      { id: 72, tur: "virman", tarih: "2026-09-06", tutar: 15000, hesapId: 51, karsiHesapId: 52, deletedAt: "2026-09-21T10:00:00.000Z" },
      { id: 73, tur: "odeme", tarih: "2026-09-07", tutar: 500, giderId: 5, cekId: 30 }]} setHesapHareketleri={bos}
    cekler={[{ id: 30, paymentId: null, yon: "alinan", no: "1234567", banka: "Ziraat", tutar: 500, durum: "portfoy", gecmis: [], deletedAt: "2026-09-22T09:00:00.000Z" }]} setCekler={bos}
    rawGiderTanimlari={[{ id: 81, turId: 9, ad: "İnternet", baslangicAy: "2026-01", deletedAt: "2026-09-19T09:00:00.000Z" }]} setGiderTanimlari={bos}
    rawKasaHesaplari={[{ id: 52, ad: "Eski Kasa", tur: "kasa", paraBirimi: "TRY", deletedAt: "2026-09-17T09:00:00.000Z" }]} setKasaHesaplari={bos} />, []],
  "kilit-odeme-penceresi": [<GiderEkrani />, ["baslik:Ödeme kaydet"]],
  "kilit-katalog-paneli": [ayarlar("models"), []],
  "kilit-cop-kutusu": [ayarlar("trash"), []],
  "kilit-geri-yukleme": [ayarlar("backup"), ["dugme:Yedekten Geri Yükle", "dugme:Evet, Geri Yükle"]],
  // Spec 0086 (R12, P1): paket listesi ve notları (Kasa'lı varsayılan; Kasa'sız notu; gider paketi yok).
  "ayarlar-backup-paketler": [ayarlar("backup"), ["dugme:Yedekten Geri Yükle", "kaydir:Geri yüklenecek bölümler"]],
  "ayarlar-backup-paketler-kasasiz": [ayarlar("backup", { kasaVeriYetki: false }), ["dugme:Yedekten Geri Yükle", "kaydir:Geri yüklenecek bölümler"]],
  "ayarlar-backup-paketler-gidersiz": [ayarlar("backup", { giderYetki: false, giderVeriYetki: false }), ["dugme:Yedekten Geri Yükle", "kaydir:Geri yüklenecek bölümler"]],
  "gider-tanim-tablo": [<SettingsGiderTanimlari giderTanimlari={TANIM_UZUN} setGiderTanimlari={bos} giderTurleri={TANIM_TURLERI} tedarikciler={TANIM_TEDARIKCI}
    calisanlar={TANIM_CALISAN} showToast={bos} giderAyarlari={{ yururlukAy: "2025-06" }} />, []],
  // Spec 0026: genel arama paleti (boş kutu, sonuç yok, gider sonuçları, taksit vadesi, kasasız ve gider yetkisiz kullanıcı).
  "arama-bos": [aramaEkrani(), ["baslik:Genel arama (Ctrl+K)"]],
  "arama-sonuc-yok": [aramaEkrani(), ["baslik:Genel arama (Ctrl+K)", `${ARAMA_KUTU}=zzzz`]],
  "arama-gider": [aramaEkrani(), ["baslik:Genel arama (Ctrl+K)", `${ARAMA_KUTU}=Yıldız`]],
  "arama-gider-vade": [aramaEkrani(), ["baslik:Genel arama (Ctrl+K)", `${ARAMA_KUTU}=10.06.2026`]],
  "arama-kasasiz": [aramaEkrani({ kasaYetki: false }), ["baslik:Genel arama (Ctrl+K)", `${ARAMA_KUTU}=Yıldız`]],
  "arama-gidersiz": [aramaEkrani({ giderYetki: false, kasaYetki: false }), ["baslik:Genel arama (Ctrl+K)", `${ARAMA_KUTU}=zzzz`]],
  // Spec 0071: KDV dâhil giriş (normal, yuvarlama farkı, brüt kira, net kira ipucu), tanım formu, "Tutar girilmedi" rozeti ve süzgeci.
  "gider-formu-0071-kdv-dahil": [<GiderForm kalem={{ id: 901, tarih: "2026-09-15", turId: 4, tutar: 983.33, kdvOrani: 20, kdvYonu: "dahil", tedarikciId: 12, aciklama: "Eylül elektrik faturası" }}
    giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL} giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, []],
  "gider-formu-0071-yuvarlama": [<GiderForm kalem={{ tarih: "2026-09-15", turId: 4, kdvOrani: 20, tedarikciId: 12, aciklama: "Küçük fatura" }}
    giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL} giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, ["KDV dâhil", "doldur:Tutar=0,03"]],
  "gider-formu-0071-kira-dahil": [<GiderForm kalem={{ id: 902, tarih: "2026-09-01", turId: 1, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 20, kdvYonu: "dahil", tedarikciId: 11, aciklama: "Eylül kira" }}
    giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL} giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, []],
  "gider-formu-0071-kira-net": [<GiderForm kalem={{ id: 903, tarih: "2026-09-01", turId: 1, girisYonu: "net", tutar: 20000, netTutar: 16000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 11, aciklama: "Eylül kira" }}
    giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL} giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, []],
  "gider-formu-0071-sifir": [<GiderForm kalem={{ id: 904, tarih: "2026-09-01", turId: 4, tutar: 0, kdvOrani: 20, tedarikciId: 12, aciklama: "Eylül su", tanimId: 72, donem: "2026-09" }}
    giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL} giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, []],
  "ayarlar-gidertanim-0071-form": [ayarlar("gidertanim"), ["baslik:Düzenle", "KDV dâhil"]],
  "giderler-0071-tutar-girilmedi": [<GiderEkrani g0={[...GIDERLER, k(8, { tutar: 0, tedarikciId: 12, aciklama: "Eylül su", tanimId: 72, donem: "2026-09" })]} />, []],
  "giderler-0071-tutarsiz-suzgec": [<GiderEkrani g0={[...GIDERLER, k(8, { tutar: 0, tedarikciId: 12, aciklama: "Eylül su", tanimId: 72, donem: "2026-09" })]} />, ["sec:Ödeme filtresi=tutarsiz"]],
  // Spec 0070: çalışan kartında SGK ve yol parası, personel formu (yol parası ipucu), borç özetinde SGK kurum satırı,
  // personel ayrıntısının sütunları. Spec 0074 R18 ile güncellendi: SGK alanları personel formundan kalktı, kurum satırı SGK
  // kaleminden gelir, 0070'in toplu ödeme penceresi silindi.
  "ayarlar-calisanlar-0070": [<CalisanManager calisanlar={CAL_0070} setCalisanlar={bos} giderYetki maliyetDuzenleyebilir showToast={bos} />, []],
  "gider-formu-0070-personel": [<GiderForm kalem={{ turId: 3, calisanId: 21, tarih: "2026-09-30", resmiTutar: "30000", eldenTutar: "10000", yolParasi: "1000", sonOdemeTarihi: "2026-10-05" }}
    giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL_0070} giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, ["kaydir:Ödeme"]],
  "giderler-0070-borc-sgk": [<GiderEkrani g0={[...GIDERLER, ...SGK_0070]} turler={TURLER_0074} h0={[]} />, ["kaydir:Kime Ne Kadar Borçluyuz"]],
  "giderler-0070-personel-ayrinti": [<GiderEkrani g0={[...GIDERLER, ...SGK_0070]} turler={TURLER_0074} h0={[]} />, ["tikla:Gider Türü Kırılımı", "~▸ Aç"]], // spec 0081: kutu kapalı başlar
  // Spec 0074: SGK davranışlı tür (tür yöneticisi), SGK kalem formu (KDV ve tedarikçi yok, öneri düğmesi), sıfır tutarlı SGK
  // tanımı, SGK kaleminin kendi ödeme penceresi.
  "ayarlar-gidertur-0074": [ayarlar("gidertur", { giderTurleri: TURLER_0074 }), []],
  "gider-formu-0074-sgk": [<GiderForm kalem={{ turId: 6, tarih: "2026-09-30", sonOdemeTarihi: "2026-10-31" }}
    giderTurleri={TURLER_0074} tedarikciler={TED} calisanlar={CAL_0070} giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, []],
  "gider-formu-0074-sgk-oneri": [<GiderForm kalem={{ turId: 6, tarih: "2026-09-30", sonOdemeTarihi: "2026-10-31" }}
    giderTurleri={TURLER_0074} tedarikciler={TED} calisanlar={CAL_0070} giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, ["dugme:Çalışanların SGK toplamını kullan"]],
  "ayarlar-gidertanim-0074-sgk": [ayarlar("gidertanim", { giderTurleri: TURLER_0074, giderTanimlari: [...TANIMLAR, SGK_TANIM_0074] }), []],
  "giderler-0074-sgk-odeme": [<GiderEkrani g0={[SGK_0074]} turler={TURLER_0074} h0={[]} />, ["baslik:Ödeme kaydet"]],
  // Spec 0075: tevkifatlı fatura girişi. Kutu açık form (özet sağ sütunda), vergi dairesi (tevkifat) bölümü, kalem listesi
  // ("tevkifat hariç"), borç özetinde vergi dairesi satırı, tevkifat hedefinin ödeme penceresi, tanım formu ve listesi, Finans KDV2.
  "gider-formu-0075-tevkifat": [<GiderForm kalem={{ turId: 4, tarih: "2026-09-10", tutar: "20000", kdvOrani: "20", tedarikciId: 12, aciklama: "Eylül nakliye", sonOdemeTarihi: "2026-09-30",
    tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10, tevkifatVade: "2026-10-26" }} giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL} giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, []],
  "gider-formu-0075-bolum": [<GiderForm kalem={{ turId: 4, tarih: "2026-09-10", tutar: "20000", kdvOrani: "20", tedarikciId: 12, aciklama: "Eylül nakliye", sonOdemeTarihi: "2026-09-30",
    tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10, tevkifatVade: "2026-10-26" }} giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL} giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, ["kaydir:Vergi dairesi (tevkifat)"]],
  "giderler-0075-liste": [<GiderEkrani g0={[...GIDERLER, TV_0075]} h0={[]} />, []],
  "giderler-0075-borc": [<GiderEkrani g0={[...GIDERLER, TV_0075]} h0={[]} />, ["kaydir:Kime Ne Kadar Borçluyuz"]],
  // Triyaj (TY kararı): stopaj ve tevkifat birlikteyken tek "Vergi dairesi" satırında iki ayrı rozet.
  "giderler-0075-borc-iki": [<GiderEkrani g0={[TV_0075, { id: 753, tarih: "2026-09-05", turId: 1, tutar: 25000, kdvOrani: 0, stopajOrani: 20, girisYonu: "brut", netTutar: 20000, tedarikciId: 11,
    aciklama: "Eylül kira (stopajlı)", sonOdemeTarihi: "2026-09-30", odendi: false, ekOdemeler: [], modelSatirlari: [], atamaTur: "",
    taksitler: [{ id: 7531, hedef: "ana", sira: 1, vade: "2026-09-30", tutar: 20000, odendi: false, odemeTarihi: null }, { id: 7532, hedef: "stopaj", sira: 1, vade: "2026-10-26", tutar: 5000, odendi: false, odemeTarihi: null }] }]} h0={[]} />,
    ["kaydir:Kime Ne Kadar Borçluyuz"]],
  "giderler-0075-odeme": [<GiderEkrani g0={[TV_0075]} h0={[]} />, ["dugme:Ödeme planı", "dugme:Ödeme gir"]],
  "ayarlar-gidertanim-0075": [ayarlar("gidertanim", { giderTanimlari: [TANIM_0075, ...TANIMLAR] }), []],
  "ayarlar-gidertanim-0075-form": [ayarlar("gidertanim", { giderTanimlari: [TANIM_0075, ...TANIMLAR] }), ["baslik:Düzenle"]],
  "finans-0075-kdv2": [<FINANS g={[...GIDERLER, TV_AGU_0075]} />, ["Göster"]],
  // Spec 0076: kısıtlı gider (binek araç). Kutu açık form (birleşik özet yedi satır), tevkifatla birlikte tek blok, kalem
  // listesi (gider tutarı, rozet, KDV hücresi, iki alt toplam), KDV kartının bilgi satırları, maliyet notu, tanım formu ve listesi.
  "gider-formu-0076-kisit": [<GiderForm kalem={{ turId: 4, tarih: "2026-09-08", tutar: "1000", kdvOrani: "20", tedarikciId: 12, aciklama: "Binek araç yakıtı", sonOdemeTarihi: "2026-09-30",
    kisitliGider: true, indirilebilirOran: 70 }} giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL} giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, []],
  "gider-formu-0076-tevkifat": [<GiderForm kalem={{ turId: 4, tarih: "2026-09-08", tutar: "1000", kdvOrani: "20", tedarikciId: 12, aciklama: "Binek araç bakımı", sonOdemeTarihi: "2026-09-30",
    kisitliGider: true, indirilebilirOran: 70, tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10 }} giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL} giderAyarlari={AYAR.giderAyarlari} onSave={bos} onCancel={bos} />, []],
  "giderler-0076-liste": [<GiderEkrani g0={[...GIDERLER, KIS_0076]} h0={[]} />, []],
  "giderler-0076-kdv": [<GiderEkrani g0={[...GIDERLER, KIS_0076]} h0={[]} />, ["tikla:KDV Karşılaştırması", "kaydir:KDV Karşılaştırması"]], // spec 0081: kutu kapalı başlar
  "ayarlar-gidertanim-0076": [ayarlar("gidertanim", { giderTanimlari: [TANIM_0076, ...TANIMLAR] }), []],
  "ayarlar-gidertanim-0076-form": [ayarlar("gidertanim", { giderTanimlari: [TANIM_0076, ...TANIMLAR] }), ["baslik:Düzenle"]],
  // Spec 0079: tevkifatlı satış faturası. Dört formda kutu açık (oran, üç not, mevcut KDV kutusunda beş satır), kart yansıtmalı
  // dal, eski tabanlı kart uyarısı, makina formu, müşteri detayında rozet ve borç satırı, Stok rozeti, Finans ve Giderler KDV kartı,
  // aylık rapor kutusu ve Servis Formu çıktısı. Kutu kapalı hâli bugünkü form ekranlarıdır (servis-formu, kalip-formu, ...).
  "servis-formu-0079": [<FormEkrani Bilesen={ServiceForm} title="Yeni Servis Talebi"
    ilk={{ customerId: 500, date: "2026-09-20", type: "Garanti Dışı", repairPlace: "Yerinde Onarım", islemFirma: "Altuntaş Makina", faturaTipi: "Faturalı Yurtiçi", currency: "TRY", servisUcreti: "100000", degisenParcalar: [], ...T79(5) }} />, ["kaydir:Toplam (Servis + Parça)"]],
  "kalip-formu-0079": [<FormEkrani Bilesen={PartSaleForm} title="Extra Kalıp Satışı"
    ilk={{ customerId: 500, tarih: "2026-09-20", currency: "TRY", faturaTipi: "Faturalı Yurtiçi", satisFirma: "Altuntaş Makina", fabrikaTeslim: false, kaliplar: [{ ad: "Hamburger", olcu: "100", fiyat: 100000 }], ...T79(5) }} />, ["kaydir:Fatura toplamı (tahsil edilecek)"]],
  "kalip-formu-0079-kart": [<FormEkrani Bilesen={PartSaleForm} title="Extra Kalıp Satışı" krediKartiKomisyonlari={KK_0079}
    ilk={{ customerId: 500, tarih: "2026-09-20", currency: "TRY", faturaTipi: "Faturalı Yurtiçi", satisFirma: "Altuntaş Makina", fabrikaTeslim: false, kaliplar: [{ ad: "Hamburger", olcu: "100", fiyat: 100000 }],
      odendi: true, yontem: "Kredi Kartı", taksitSayisi: 1, kkYansit: true, ...T79(5) }} />, ["kaydir:Müşteriden çekilecek kart tutarı"]],
  "kalip-formu-0079-kart-uyari": [<FormEkrani Bilesen={PartSaleForm} title="Kaydı Düzenle" krediKartiKomisyonlari={KK_0079}
    ilk={{ id: 7904, customerId: 500, tur: "Kalıp", tarih: "2026-09-20", currency: "TRY", faturaTipi: "Faturalı Yurtiçi", satisFirma: "Altuntaş Makina", ad: "Hamburger", ucret: "8000", fabrikaTeslim: false,
      kaliplar: [], odendi: true, yontem: "Kredi Kartı", taksitSayisi: 1, kartKomisyonu: { taksit: 1, oran: 3.15, toplamKesinti: 312, blokajGun: 0, yansitildi: false }, ...T79(5) }} />, ["kaydir:Bu fatura tevkifatlı"]],
  "yedek-parca-formu-0079": [<FormEkrani Bilesen={YedekParcaSatisForm} title="Yeni Yedek Parça Satışı"
    ilk={{ aliciTipi: "bayi", dealerId: 3, currency: "TRY", tarih: "2026-09-20", faturaTipi: "Faturalı Yurtiçi", fabrikaTeslim: false, satirlar: [{ partId: 7, miktar: 1, birimFiyat: 100000 }], ...T79(5) }} />, ["kaydir:Fatura toplamı (tahsil edilecek)"]],
  "musteri-formu-0079": [<Customers customers={MUSTERI_0079} setCustomers={bos} partSales={[]} services={[]} payments={[]} stock={[]} setStock={bos} dealers={DEALERS} initialDetailId={500} />, ["~Düzenle", "kaydir:Bu fatura tevkifatlı"]],
  "musteri-detay-0079": [<Customers customers={MUSTERI_0079} setCustomers={bos} partSales={KALIP_0079} services={SERVIS_0079} payments={[]} yedekParcaSatislar={YP_0079} dealers={DEALERS}
    parts={[{ id: 7, ad: "Rulman" }]} setServices={bos} setPartSales={bos} setYedekParcaSatislar={bos} calisanlar={CAL} initialDetailId={500} />, ["kaydir:Makina Geçmişi"]],
  "stok-yedek-0079": [<Stock factory={{ name: "Altuntaş Makina" }} stock={[]} setStock={bos} customers={MUSTERI_0079} setCustomers={bos} parts={[{ id: 7, ad: "Rulman" }]}
    dealers={DEALERS} yedekParcaSatislar={YP_0079} defaultSubTab="yedeksatis" showToast={bos} />, ["~Kutu Gıda"]],
  "finans-0079-kdv": [<FINANS musteriler={MUSTERI_0079} />, ["Göster", "kaydir:KDV Karşılaştırması"]],
  // Spec 0095: garanti içi ücretsiz verme (form, garanti uyarısı, Stok satırı, kargo detay penceresi, bayi ve müşteri detayı).
  "yedek-parca-formu-ucretsiz": [<FormEkrani Bilesen={YedekParcaSatisForm} title="Yeni Yedek Parça Satışı" customers={MUSTERI_0095_AKTIF}
    ilk={{ aliciTipi: "musteri", musteriId: 500, currency: "TRY", tarih: "2026-10-20", faturaTipi: "Faturalı Yurtiçi", fabrikaTeslim: false, ucretsizMi: true, satirlar: [{ partId: 7, miktar: 2, birimFiyat: 750 }] }} />, ["kaydir:Garanti içi, ücretsiz verildi"]],
  "yedek-parca-formu-ucretsiz-uyari": [<FormEkrani Bilesen={YedekParcaSatisForm} title="Yeni Yedek Parça Satışı" customers={MUSTERI_0095_BITMIS}
    ilk={{ aliciTipi: "musteri", musteriId: 500, currency: "TRY", tarih: "2026-10-20", faturaTipi: "Faturalı Yurtiçi", fabrikaTeslim: false, ucretsizMi: true, satirlar: [{ partId: 7, miktar: 1, birimFiyat: "" }] }} />, ["kaydir:Garanti içi, ücretsiz verildi"]],
  "stok-yedek-parca-ucretsiz": [<Stock factory={{ name: "Altuntaş Makina" }} stock={[]} setStock={bos} customers={MUSTERILER} setCustomers={bos} parts={[{ id: 7, ad: "Rulman" }]}
    dealers={BAYI_LISTE} yedekParcaSatislar={YP_0095} defaultSubTab="yedeksatis" showToast={bos} />, ["~Kutu Gıda"]],
  "kargo-detay-ucretsiz": [<KargoDetayModal grup={YP_0095.filter(s => s.batchId === 950)} dealers={BAYI_LISTE} parts={[{ id: 7, ad: "Rulman" }]} customers={MUSTERILER}
    factory={{ name: "Altuntaş Makina" }} onClose={bos} />, []],
  "bayi-detay-ucretsiz": [bayiDetay(3, { yedekParcaSatislar: YP_0095 }), ["kaydir:Yedek Parça Geçmişi"]],
  "musteri-detay-ucretsiz": [<Customers customers={MUSTERILER} setCustomers={bos} partSales={[]} services={[]} payments={[]} yedekParcaSatislar={YP_0095} dealers={BAYI_LISTE}
    parts={[{ id: 7, ad: "Rulman" }]} setServices={bos} setPartSales={bos} setYedekParcaSatislar={bos} calisanlar={CAL} initialDetailId={500} />, ["kaydir:Makina Geçmişi"]],

  "giderler-0079-kdv": [<GiderEkrani satis={SATIS_0079} />, ["tikla:KDV Karşılaştırması", "kaydir:KDV Karşılaştırması"]], // spec 0081: kutu kapalı başlar
  "aylik-rapor-0079": [<div style={{ background: "#fff", margin: -24, padding: 8 }} dangerouslySetInnerHTML={{ __html: buildAylikRaporHtml(hesaplaAylikRapor(SATIS_0079, "2026-09", { factoryName: "Altuntaş Makina" }), { name: "Altuntaş Makina" }) }} />, ["kaydir:TEVKİFATLI SATIŞLAR"]],
  "servis-formu-yazdir-0079": [<div style={{ background: "#fff", margin: -24, padding: 8 }} dangerouslySetInnerHTML={{ __html: buildServiceFormHtml(SERVIS_0079[0], MUSTERI_0079, undefined, {}) }} />, []],
  // Spec 0094: Faaliyet Haritası ilçe görünümü. Mevcut il (İstanbul) taban kanıtıdır: kod değişmeden önce ve sonra 0 fark.
  "harita-0094-istanbul": [<div style={{ height: 820 }}><Harita customers={HARITA_0094} dealers={[]} factory={null} baslangicUlke="Türkiye" baslangicIl="İstanbul" /></div>, ['bekle:[data-ad="Kadıköy"]']],
  // Beş yeni il (R5): Aydın'da ilçeli iki kayıt boyanır ve panelde firma adlarıyla; diğer dördünde ilçesi boş kayıtlar.
  "harita-0094-aydin": [<div style={{ height: 820 }}><Harita customers={HARITA_0094_IL} dealers={[]} factory={null} baslangicUlke="Türkiye" baslangicIl="Aydın" /></div>, ['bekle:[data-ad="Kuşadası"]']],
  "harita-0094-sakarya": [<div style={{ height: 820 }}><Harita customers={HARITA_0094_IL} dealers={[]} factory={null} baslangicUlke="Türkiye" baslangicIl="Sakarya" /></div>, ['bekle:[data-ad="Sapanca"]']],
  "harita-0094-eskisehir": [<div style={{ height: 820 }}><Harita customers={HARITA_0094_IL} dealers={[]} factory={null} baslangicUlke="Türkiye" baslangicIl="Eskişehir" /></div>, ['bekle:[data-ad="Tepebaşı"]']],
  "harita-0094-gaziantep": [<div style={{ height: 820 }}><Harita customers={HARITA_0094_IL} dealers={[]} factory={null} baslangicUlke="Türkiye" baslangicIl="Gaziantep" /></div>, ['bekle:[data-ad="Şahinbey"]']],
  "harita-0094-yalova": [<div style={{ height: 820 }}><Harita customers={HARITA_0094_IL} dealers={[]} factory={null} baslangicUlke="Türkiye" baslangicIl="Yalova" /></div>, ['bekle:[data-ad="Çınarcık"]']],
  // R7: ilçesi boş kayıtlar il kartında "ilçesi girilmemiş" (Sakarya'da yalnız ilçesiz kayıt).
  "harita-0094-ilcesiz": [<div style={{ height: 820 }}><Harita customers={HARITA_0094_IL.filter(c => c.city === "Sakarya")} dealers={[]} factory={null} baslangicUlke="Türkiye" baslangicIl="Sakarya" /></div>, ['bekle:[data-ad="Sapanca"]']],
  // R5/2: listede karşılığı olmayan ilçe yazımı ("Kusadasi") boyanmaz, pin almaz, panelde sayılır.
  "harita-0094-eslesmeyen": [<div style={{ height: 820 }}><Harita customers={[...HARITA_0094_IL, { id: 9419, name: "Excel Kaydı", country: "Türkiye", city: "Aydın", ilce: "Kusadasi" }]} dealers={[]} factory={null} baslangicUlke="Türkiye" baslangicIl="Aydın" /></div>, ['bekle:[data-ad="Kuşadası"]']],
  // R6: müşteri formunda Sakarya seçiliyken İlçe alanı.
  "musteri-formu-0094-ilce": [<Customers customers={[{ ...MUSTERI_LISTE[0], country: "Türkiye", city: "Sakarya", ilce: "Sapanca" }]} setCustomers={bos} partSales={[]} services={[]} payments={[]} stock={[]} setStock={bos} dealers={DEALERS} initialDetailId={MUSTERI_LISTE[0].id} />, ["~Düzenle", "kaydir:İlçe"]],
};

window.__EKRANLAR = Object.keys(EKRANLAR);
window.addEventListener("error", (e) => { document.body.setAttribute("data-hata", String(e.message)); });
const [cizim, adimlar] = EKRANLAR[ekran] || [<div>Bilinmeyen ekran: {ekran}</div>, []];
createRoot(document.getElementById("root")).render(UYGULAMA ? cizim : <div style={{ padding: 24, minHeight: "100vh", boxSizing: "border-box", background: "var(--n100, #f8fafc)" }}>{cizim}</div>);

// Tıklama adımları: metni birebir eşleşen son öğeye tıkla (satır için en yakın tr'ye).
(async () => {
  const bekle = (ms) => new Promise(r => setTimeout(r, ms));
  await bekle(UYGULAMA ? 1500 : 300); // App verisini eşzamansız yükler
  for (const metin of adimlar) {
    if (metin.startsWith("doldur:")) {
      // React kontrollü alanı: yerel value ayarlayıcısı + input olayı.
      const [etiket, deger] = metin.slice(7).split("=");
      const etiketOgesi = [...document.querySelectorAll("label")].find(l => l.textContent.trim() === etiket && l.htmlFor);
      const el = document.querySelector(`input[aria-label="${etiket}"]`) || (etiketOgesi && document.getElementById(etiketOgesi.htmlFor)) || document.querySelector(`input[placeholder="${etiket}"]`);
      if (el) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, deger); el.dispatchEvent(new Event("input", { bubbles: true })); }
      else console.warn("alan yok: " + etiket);
      await bekle(300);
      continue;
    }
    if (metin.startsWith("sec:")) {
      // Açılır liste: aria-label ya da Field etiketiyle bulunur, React'a change olayıyla bildirilir.
      const [etiket, deger] = metin.slice(4).split("=");
      const etiketOgesi = [...document.querySelectorAll("label")].find(l => l.textContent.trim() === etiket && l.htmlFor);
      const el = document.querySelector(`select[aria-label="${etiket}"]`) || (etiketOgesi && document.getElementById(etiketOgesi.htmlFor));
      if (el) { Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(el, deger); el.dispatchEvent(new Event("change", { bubbles: true })); }
      else console.warn("liste yok: " + etiket);
      await bekle(300);
      continue;
    }
    if (metin.startsWith("ara:")) {
      // Arama kutusundan seçim (SearchPick): "ara:<placeholder>=<yazı>><seçenek>"; odaklanır, yazar, seçeneğe mousedown (spec 0063).
      const [yer, kalan] = metin.slice(4).split("=");
      const [yazi, secenek] = kalan.split(">");
      const el = document.querySelector(`input[placeholder="${yer}"]`);
      if (el) {
        el.focus(); el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, yazi); el.dispatchEvent(new Event("input", { bubbles: true }));
        await bekle(300);
        const s = [...document.querySelectorAll("div, span, li, button")].filter(e => e.textContent.trim() === secenek && e.children.length <= 1).pop();
        if (s) { s.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); s.click(); } else console.warn("seçenek yok: " + metin);
      } else console.warn("arama kutusu yok: " + metin);
      await bekle(300);
      continue;
    }
    if (metin.startsWith("kaydir:")) {
      const aranan = metin.slice(7);
      const hedef = [...document.querySelectorAll("label, div, span, h2, h3")].filter(e => e.textContent.trim().startsWith(aranan) && e.children.length <= 3).pop();
      if (hedef) hedef.scrollIntoView({ block: "center" }); else console.warn("kaydırılamadı: " + metin);
      await bekle(300);
      continue;
    }
    if (metin.startsWith("etiket:")) {
      // aria-label'ı birebir eşleşen öğeye tıklar (onay kutusu gibi metinsiz denetimler; spec 0046).
      const hedef = document.querySelector(`[aria-label="${metin.slice(7)}"]`);
      if (hedef) hedef.click(); else console.warn("etiketli öğe yok: " + metin);
      await bekle(300);
      continue;
    }
    if (metin.startsWith("baslik:")) {
      // Yalnız simgeli düğme: title özniteliği birebir eşleşen ilk düğme (spec 0045).
      const hedef = [...document.querySelectorAll("button")].find(e => e.title === metin.slice(7));
      if (hedef) hedef.click(); else console.warn("başlıklı düğme yok: " + metin);
      await bekle(300);
      continue;
    }
    if (metin.startsWith("bekle:")) {
      // Spec 0094: eşzamansız yüklenen içerik (harita verisi) için seçici çıkana kadar yoklar (en çok 20 sn).
      const secici = metin.slice(6);
      for (let i = 0; i < 200 && !document.querySelector(secici); i++) await bekle(100);
      if (!document.querySelector(secici)) console.warn("beklenen öğe gelmedi: " + secici);
      await bekle(500);
      continue;
    }
    if (metin.startsWith("tikla:")) {
      // Metni birebir eşleşen son öğenin kendisine tıklar (tablo satırının içindeki başlık gibi; satıra değil). Spec 0052.
      const aranan = metin.slice(6);
      const hedef = [...document.querySelectorAll("span, div, label")].filter(e => e.textContent.trim() === aranan && e.children.length === 0).pop();
      if (hedef) hedef.click(); else console.warn("tıklanamadı: " + metin);
      await bekle(300);
      continue;
    }
    if (metin.startsWith("dugme:")) {
      // Tablo satırı içindeki düğme: satıra değil düğmenin kendisine tıklanır (metni içeren son düğme).
      const aranan = metin.slice(6);
      const hedef = [...document.querySelectorAll("button")].filter(e => e.textContent.includes(aranan)).pop();
      if (hedef) hedef.click(); else console.warn("düğme yok: " + metin);
      await bekle(300);
      continue;
    }
    // "~metin": metinle başlayan; "*metin": metni içeren (başında simge olan başlıklar için, spec 0016); yoksa birebir.
    const bas = metin.startsWith("~"), icerir = metin.startsWith("*");
    const aranan = bas || icerir ? metin.slice(1) : metin;
    const esles = (t) => (bas ? t.startsWith(aranan) : icerir ? t.includes(aranan) : t === aranan);
    const aday = [...document.querySelectorAll("button, td, span, div, a")].filter(e => esles(e.textContent.trim()) && e.children.length <= 2);
    const hedef = aday.length ? (aday[aday.length - 1].closest("tr") || aday[aday.length - 1].closest("button") || aday[aday.length - 1]) : null;
    if (hedef) hedef.click(); else console.warn("tıklanamadı: " + metin);
    await bekle(300);
  }
  document.body.setAttribute("data-hazir", "1");
})();
