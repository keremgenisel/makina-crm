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
import { hesaplaMakinaMaliyetleri } from "../../src/lib/makinaMaliyeti";
import * as Tasarim from "../../src/components/tasarim";

const q = new URLSearchParams(location.hash.slice(1));
const ekran = q.get("ekran") || "giderler-rapor";
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
applyTheme(q.get("tema") === "dark" ? "dark" : "light");
const bos = () => {};

const TURLER = [
  { id: 1, ad: "Fabrika kirası", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" },
  { id: 4, ad: "Elektrik", davranis: "normal" }, { id: 5, ad: "Hammadde", davranis: "normal" },
];
const TED = [{ id: 11, ad: "Yıldız Gayrimenkul" }, { id: 12, ad: "Bölge Elektrik" }];
const CAL = [{ id: 21, ad: "Hasan Çelik", resmiMaliyet: 30000, eldenMaliyet: 20000 }, { id: 22, ad: "Zeynep Arslan" }];
const MODELLER = [{ model: "AK120_DSC" }, { model: "AK100" }];
const MUSTERILER = [
  { id: 500, name: "Kutu Gıda", model: "AK120_DSC", serialNo: "S-1", currency: "TRY", faturali: "Faturalı Yurtiçi", faturaBedeli: 250000, fabrikaSatisBedeli: 240000, installDate: "2026-08-10", uretimTarihi: "2026-07-15", kalanBorc: 0 },
  { id: 501, name: "Ege Köfte", model: "AK100", serialNo: "S-2", currency: "TRY", faturali: "Faturalı Yurtiçi", faturaBedeli: 180000, installDate: "2026-09-05", uretimTarihi: "2026-08-20", kalanBorc: 20000 },
];
const k = (id, o) => ({ id, tarih: "2026-09-10", turId: 4, tutar: 10000, kdvOrani: 20, odendi: false, ...o });
const GIDERLER = [
  k(1, { tedarikciId: 12, aciklama: "Eylül elektrik", sonOdemeTarihi: "2026-09-28" }),
  k(2, { turId: 5, tutar: 42000, tedarikciId: 11, aciklama: "Sac levha", atamaTur: "model", modelSatirlari: [{ modelAd: "AK120_DSC", tutar: 42000 }], odendi: true, odemeTarihi: "2026-09-12" }),
  k(3, { turId: 1, tutar: 25000, kdvOrani: 0, tedarikciId: 11, aciklama: "Eylül kira", tanimId: 71, donem: "2026-09" }),
  k(4, { turId: 1, tutar: 25000, kdvOrani: 0, tedarikciId: 11, aciklama: "Eylül kira", tanimId: 71, donem: "2026-09" }),
  k(5, { turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 20000, tutar: 50000, kdvOrani: 0 }),
  k(6, { turId: 4, tutar: 8000, tarih: "2026-08-10", tedarikciId: 12, aciklama: "Ağustos elektrik", odendi: true }),
  k(7, { turId: 5, tutar: 15000, tarih: "2026-08-12", atamaTur: "makina", makinaTur: "musteri", makinaId: 500, aciklama: "Özel parça" }),
];
const TANIMLAR = [{ id: 71, ad: "Fabrika kirası", turId: 1, tutar: 25000, kdvOrani: 0, tedarikciId: 11, baslangicAy: "2026-06", uretilenAylar: ["2026-09"] }];
const STANDART = [{ id: 81, grupId: 81, ad: "Elektrik (tahmini)", tutar: 9000, baslangicAy: "2026-06" }];
const AYAR = { giderAyarlari: { yururlukAy: "2026-06", stopajOrani: 20, hatirlatmaEsikGun: 7 } };
const SATIS = { customers: MUSTERILER, services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] };

function GiderEkrani({ g0 = GIDERLER, turler = TURLER, ayar = AYAR, t0 = TANIMLAR }) {
  const [giderler, setGiderler] = useState(g0);
  const [tanimlar, setTanimlar] = useState(t0);
  const [ted, setTed] = useState(TED);
  const [standart, setStandart] = useState(STANDART);
  const makinaMaliyet = hesaplaMakinaMaliyetleri({ customers: MUSTERILER, stock: [], partStockLog: [], giderler, giderTurleri: turler, standartGiderler: standart,
    standardModels: MODELLER, customModels: [], giderAyarlari: ayar.giderAyarlari }, { bugun: "2026-09-23" });
  return <Giderler giderler={giderler} setGiderler={setGiderler} giderTanimlari={tanimlar} setGiderTanimlari={setTanimlar}
    giderTurleri={turler} tedarikciler={ted} setTedarikciler={setTed} standartGiderler={standart} setStandartGiderler={setStandart}
    calisanlar={CAL} standardModels={MODELLER} customModels={[]} appSettings={ayar} serverPermissions={null}
    satisVerisi={SATIS} makinaMaliyet={makinaMaliyet} showToast={bos} customers={MUSTERILER} stock={[]} factory={{ name: "Altuntaş Makina" }} rates={{}} />;
}

const DEALERS = [{ id: 3, name: "Ege Bayi", contact: "Veli Usta", phone: "0232 111", email: "ege@bayi.com", adres: "Bornova", country: "Türkiye", city: "İzmir", bayiMi: true }];
const alt = (id, type, fiyat) => ({ id, type, kod: "", makinaAdi: "", tanim: "", miktar: "1", birimFiyat: String(fiyat), tlKarsiligi: "" });
const T0 = (o = {}) => ({ id: 900, type: "teklif", no: "2026-00001", tarih: "2026-09-20", createdAt: "2026-09-20", dil: "TR", currency: "TRY", durum: "taslak", firma: "Kutu Gıda", satirlar: [
  { rowId: "r1", pickTip: "makina", selectedModel: "AK100", selectedKalip: "", selectedPart: "", subItems: [alt("m1", "makina", 60000)] },
], ...o });
function EvrakEkrani({ teklif }) {
  const [teklifler, setTeklifler] = useState([teklif]);
  return <Documents teklifler={teklifler} setTeklifler={setTeklifler} faturalar={[]} setFaturalar={bos} customers={MUSTERILER} partSales={[]}
    allModels={[{ model: "AK100" }]} factory={{ name: "Altuntaş" }} appSettings={{}} showToast={bos} kalipDefs={[{ ad: "Hamburger" }]} parts={[]}
    geoData={{}} loadingGeo={false} serverPermissions={null} dealers={DEALERS} yedekParcaSatislar={[]} onEvrakKaydet={bos} />;
}

const ayarlar = (tab) => (
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
    standartGiderler={STANDART} setStandartGiderler={bos} appUpd={{}} onCheckUpdate={bos} onStartUpdate={bos} />
);

const FINANS = () => (
  <Finance customers={MUSTERILER} services={[]} dealers={[]} partSales={[]} yedekParcaSatislar={[]} factory={{ name: "Altuntaş Makina" }} rates={{}}
    payments={[]} teklifler={[]} serverPermissions={null} giderYetki giderler={GIDERLER} giderTurleri={TURLER} giderYururlukAy="2026-06" />
);

// Ekran → [çizim, tıklanacak metinler (sırayla)]
const EKRANLAR = {
  "giderler-rapor": [<GiderEkrani />, []],
  "giderler-bos-tursuz": [<GiderEkrani g0={[]} turler={[]} />, []],
  "giderler-yururluk-oncesi": [<GiderEkrani ayar={{ giderAyarlari: { yururlukAy: "2026-12" } }} />, []],
  "giderler-model": [<GiderEkrani />, ["Makina ve Model"]],
  "giderler-karlilik": [<GiderEkrani />, ["Makina Kârlılığı"]],
  "giderler-tedarikciler": [<GiderEkrani />, ["Tedarikçiler"]],
  "giderler-standart": [<GiderEkrani />, ["Standart Genel Giderler"]],
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
  // Spec 0011: serbest içerikli şerit örneği (yalnız "sonra"; önceki bileşen children almıyordu). Üç aile.
  "sozluk-serbest-icerik": [<div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 900 }}>
    {Tasarim.UyariSeridi && ["bilgi", "uyari", "basari"].map(a => (
      <Tasarim.UyariSeridi key={a} aile={a}>Firmaya göre gruplu görünüm: <b>12 firma</b> (15 makina kaydı). Birden fazla makinası olan firmaya tıklayınca tüm makinaları listelenir.</Tasarim.UyariSeridi>
    ))}
  </div>, []],
  "ayarlar-company-acik": [ayarlar("company"), ["Firma Bilgileri"]],
};

window.__EKRANLAR = Object.keys(EKRANLAR);
window.addEventListener("error", (e) => { document.body.setAttribute("data-hata", String(e.message)); });
const [cizim, adimlar] = EKRANLAR[ekran] || [<div>Bilinmeyen ekran: {ekran}</div>, []];
createRoot(document.getElementById("root")).render(<div style={{ padding: 24, minHeight: "100vh", boxSizing: "border-box", background: "var(--n100, #f8fafc)" }}>{cizim}</div>);

// Tıklama adımları: metni birebir eşleşen son öğeye tıkla (satır için en yakın tr'ye).
(async () => {
  const bekle = (ms) => new Promise(r => setTimeout(r, ms));
  await bekle(300);
  for (const metin of adimlar) {
    if (metin.startsWith("doldur:")) {
      // React kontrollü alanı: yerel value ayarlayıcısı + input olayı.
      const [etiket, deger] = metin.slice(7).split("=");
      const el = document.querySelector(`input[aria-label="${etiket}"]`);
      if (el) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, deger); el.dispatchEvent(new Event("input", { bubbles: true })); }
      else console.warn("alan yok: " + etiket);
      await bekle(300);
      continue;
    }
    const bas = metin.startsWith("~");
    const aranan = bas ? metin.slice(1) : metin;
    const aday = [...document.querySelectorAll("button, td, span, div, a")].filter(e => (bas ? e.textContent.trim().startsWith(aranan) : e.textContent.trim() === aranan) && e.children.length <= 2);
    const hedef = aday.length ? (aday[aday.length - 1].closest("tr") || aday[aday.length - 1].closest("button") || aday[aday.length - 1]) : null;
    if (hedef) hedef.click(); else console.warn("tıklanamadı: " + metin);
    await bekle(300);
  }
  document.body.setAttribute("data-hazir", "1");
})();
