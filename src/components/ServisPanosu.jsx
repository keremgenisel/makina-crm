import { useMemo, useState, useEffect, useRef } from "react";
import { today, fmtTR, uid, bumpId, parseMoney, normalizeSaleType, simdiYerel, sureDk, sureBicim, sureBicimSaat, fmtZaman, fmtZamanTam, isAltuntasServisi, islemFirmaGoster, disServisMi, parcaAdi } from "../lib/utils";
import { servisSureleri } from "../lib/servisAnaliz";
import { servisParcaDus, servisParcaGeriAl } from "../lib/servisStok";
import { yeniBekleyenler, servisPlanlandiMi, yeniKargolar } from "../lib/servisAlarm";
import { yerelServisEkle } from "../lib/yerelServis";
import { createAlarm, kilidiAc } from "../lib/alarmSes";
import { SERVIS_ALARM_VARSAYILAN } from "../lib/constants";
import { logAction, getAuditUsername } from "../lib/audit";
import { makeCanDo } from "../lib/permissions";
import { Icon, Btn, Modal, ConfirmDialog, LockConflict } from "./ui";
import { ServiceForm } from "./ServiceForm";
import { KargoKart, KargoDetayModal } from "./KargoPanosu";
import { aliciAd } from "./stock/TahsisModal";
import { YedekParcaSatisForm } from "./YedekParcaSatisForm";
import { yeniYedekParcaSatisCoklu, kargoPlanlandiMi } from "../lib/yedekParcaSatis";
import { useLock } from "../hooks/useLock";
import { printServiceForm as printServiceFormTemplate } from "../lib/printTemplates";

// Servis Panosu (Kanban) — servisin iş durumu: Bekliyor / Yapılıyor / Tamamlandı. Kartlar
// sürükle-bırakla sütun değiştirir (durum), her kartta teknisyen (firma çalışanı) seçilir.
// Servis katı bilgisayarında "kiosk" olarak tam ekran açılır; ana uygulamada normal sekmedir.
// Yalnız `durum`u olan servisler panoda görünür (eski/durumsuz kayıtlar müşteri kartında yönetilir).

// key = saklanan `durum` değeri (değiştirilemez; sürükle-bırak, geçmiş rozetleri, DB'ye bağlı).
// baslik = sütunda görünen ad (serbestçe değişebilir).
const DURUMLAR = [
  { key: "Bekliyor", baslik: "Bekliyor", alt: [["Servis", "Fabrikaya Giriş"], ["Kargo · Fabrika Teslim", "Hazırlanıyor"]], renk: "var(--amb600, #d97706)", bg: "var(--ambBg, #fffbeb)", br: "var(--ambBr, #fde68a)", bos: "Yeni servisler burada belirir." },
  { key: "Yapılıyor", baslik: "İşlemde", alt: [["Servis", "Bakım-Onarım Yapılıyor"], ["Kargo", "Kargoya Verildi"], ["Fabrika Teslim", "Teslime Hazır"]], renk: "var(--blu600, #2563eb)", bg: "var(--bluBg, #eff6ff)", br: "var(--bluBr, #bfdbfe)", bos: "Kart yok. Buraya sürükle." },
  { key: "Tamamlandı", baslik: "Tamamlandı", alt: [["Servis", "Bakım-Onarım Bitti"], ["Kargo · Fabrika Teslim", "Teslim Edildi"]], renk: "var(--grn600, #16a34a)", bg: "var(--grnBg, #f0fdf4)", br: "var(--grnBr, #bbf7d0)", bos: "Kart yok. Buraya sürükle." },
];
const [DURUM_BEK, DURUM_YAP, DURUM_TAM] = DURUMLAR;
// Kargo (yedek parça satışı) durumu ↔ servis sütunu eşlemesi. Kargolar servis kartlarıyla AYNI
// sütunlarda görünür; bir kargo kartı sütun değiştirince kargoDurum'u karşılık gelen değere döner.
const KARGO_SUTUN = { "Hazırlanıyor": "Bekliyor", "Kargoya Verildi": "Yapılıyor", "Teslim Edildi": "Tamamlandı" };
const SUTUN_KARGO = { "Bekliyor": "Hazırlanıyor", "Yapılıyor": "Kargoya Verildi", "Tamamlandı": "Teslim Edildi" };
// Toplu satış (aynı batchId) kayıtlarını tek karta indir. Kart = grubun ilk kaydı + `_grup` (tüm kayıtlar).
// batchId'siz kayıt kendi başına bir grup. Kart id'si ilk kaydın id'si; işlemler tüm gruba uygulanır.
const grupla = (arr) => {
  const m = new Map();
  for (const s of arr) { const k = s.batchId != null ? "b:" + s.batchId : "s:" + s.id; if (!m.has(k)) m.set(k, []); m.get(k).push(s); }
  return [...m.values()].map(g => ({ ...g[0], _grup: g }));
};
// Bir kaydın (id) ait olduğu gruptaki TÜM kayıt id'leri (toplu işlemler için: durum/sorumlu/arşiv).
const grupIdleri = (arr, id) => {
  const hedef = arr.find(s => s.id === id);
  if (!hedef) return [id];
  return hedef.batchId != null ? arr.filter(s => s.batchId === hedef.batchId).map(s => s.id) : [id];
};
// Aşama zaman kutusu — "Periyodik Bakım" rozetiyle aynı biçim, ilgili aşamanın renginde.
const pilStil = (d) => ({ fontSize: 11, fontWeight: 700, borderRadius: 7, padding: "3px 8px", color: d.renk, background: d.bg, border: `1px solid ${d.br}` });

const TUR_STIL = {
  "Periyodik Bakım": { fg: "var(--n600, #475569)", bg: "var(--n150, #f1f5f9)", br: "var(--n200, #e2e8f0)" },
  "Garanti İçi": { fg: "var(--grn700, #15803d)", bg: "var(--grnBg, #f0fdf4)", br: "var(--grnBr, #bbf7d0)" },
  "Garanti Dışı": { fg: "var(--amb700, #b45309)", bg: "var(--ambBg, #fffbeb)", br: "var(--ambBr, #fde68a)" },
  "İlk Çalıştırma": { fg: "var(--blu700, #1d4ed8)", bg: "var(--bluBg, #eff6ff)", br: "var(--bluBr, #bfdbfe)" },
};

// Yeni servis formu başlangıcı — müşteri detayındaki openAddService ile birebir aynı alanlar,
// tek fark customerId boş (pano herhangi bir müşteriyi form içindeki seçiciden seçtirir).
const bosForm = (factoryName) => ({
  customerId: "", type: "Periyodik Bakım", repairPlace: "Yerinde Onarım", yapilanIsler: "",
  musteriTalimati: "", fabrikaNotu: "", servisUcreti: "", date: today(), tech: "",
  islemFirma: factoryName, islemFirmaAd: "", islemFirmaYetkili: "", islemFirmaTel: "",
  islemFirmaUlke: "", islemFirmaSehir: "", odendi: false, degisenParcalar: [], parcaUcreti: "",
  currency: "TRY", parcaGarantiDisi: false, durum: "Bekliyor", faturaTipi: "",
});

export const ServisPanosu = ({
  services = [], setServices, customers = [], calisanlar = [], factory = null,
  parts = [], dealers = [], kdvRates = null, geoData = null, loadingGeo = false,
  setPartStock = null, setPartStockLog = null, partStock = [],
  dosyalar = [], setDosyalar = null, dosyaCevrimdisi = false, appSettings = null,
  showToast = () => {}, serverPermissions = null, kiosk = false, onKilitle = null,
  yedekParcaSatislar = [], setYedekParcaSatislar = null, kargoYetki = false,
  partSales = [], setPartSales = null, kalipYetki = false, aktifKullanici = "",
  onAyriPencere = null,
}) => {
  const canDo = makeCanDo(serverPermissions, "customerActions");
  const canKargoDuzenle = makeCanDo(serverPermissions, "stockActions")("yedek_parca_edit");
  // Extra Kalıp kargo pano işlemleri (kargo desenine paralel; ayrı izinler).
  const canKalipDuzenle = canDo("cust_kalip_edit");
  const canKalipKaldir = canDo("kalip_pano_kaldir");
  const canKalipArsiv = canDo("kalip_pano_arsiv");
  // Kargo pano işlemleri: servislerin pano izinlerinin kargo karşılıkları ("Servis Panosu işlemleri"
  // akordeonu, customerActions). Kaldır/hemen-düşür ve arşiv-gör/geri-al ayrı izinler.
  const canKargoKaldir = canDo("kargo_pano_kaldir");
  const canKargoArsiv = canDo("kargo_pano_arsiv");
  // "Yeni Yedek Parça Satışı" düğmesi: Servis Panosu'na özel izin (customerActions.servis_yedek_parca_add).
  const kargoEkleGoster = canDo("servis_yedek_parca_add") && !!setYedekParcaSatislar;
  const [kargoDetayId, setKargoDetayId] = useState(null); // açık kargo detay modalının satış id'si
  const [kalipDetayId, setKalipDetayId] = useState(null); // açık kalıp kargo detay modalının id'si
  const [ypForm, setYpForm] = useState(null); // yeni yedek parça satışı formu (panodan)
  const openAddYedekParca = () => {
    if (!kargoEkleGoster) return;
    setYpForm({ aliciTipi: "bayi", dealerId: "", musteriId: "", satirlar: [{ partId: "", miktar: "", birimFiyat: "" }], currency: "TRY", tarih: today(), faturaTipi: "Faturalı Yurtiçi", odendi: false, kargoDurum: "Hazırlanıyor" });
  };
  const saveYedekParca = () => {
    const r = yeniYedekParcaSatisCoklu(ypForm, { setYedekParcaSatislar, setPartStock, setPartStockLog, partStock });
    if (!r.ok) { showToast(r.hata, "err"); return; }
    // Hemen düşen kargoyu kendi panomuzda susturur; PLANLANMIŞ kargo düştüğünde yanıp sönsün diye işaretlenmez.
    if (!kargoPlanlandiMi(ypForm, simdiYerel())) r.ids.forEach(id => yerelEklenenRef.current.add(id));
    r.ids.forEach(id => logAction({ serverPermissions, action: "olusturuldu", entity: "yedek_parca_satis", entityId: id }));
    showToast(r.n > 1 ? `${r.n} yedek parça satışı kaydedildi, stoktan düşüldü.` : "Yedek parça satışı kaydedildi, stoktan düşüldü.");
    setYpForm(null);
  };
  const [svModal, setSvModal] = useState(null);   // null | "add" | { edit: sv }
  const [form, setForm] = useState(bosForm(factory?.name || "Altuntaş Makina"));
  const [hoverDurum, setHoverDurum] = useState(null);
  // Kontrol satırına (teknisyen/kim gönderiyor seçici) gelince o kartın sürüklemesini kapatırız:
  // macOS'ta native <select>, draggable=true bir ata içindeyken seçim işlemiyor. React-kontrollü
  // olduğu için 1sn'lik saat yeniden-render'ı geri açamaz (setAttribute yaklaşımı bunu kaybediyordu).
  const [dragKapaliId, setDragKapaliId] = useState(null);
  const [arsivAcik, setArsivAcik] = useState(false);
  const [planAcik, setPlanAcik] = useState(false);
  // Aktif kayıt kilitleri (başka kullanıcı bir kaydı düzenliyorsa). Kutu sürükleme anlık bir işlem
  // olduğu için modal gibi hard-lock TUTMAYIZ; bunun yerine sürükleme anında "başkası düzenliyor mu"
  // diye bu listeye bakıp reddederiz (yumuşak koruma). Liste sunucudan gelir, kilit değişince yenilenir.
  const [kilitler, setKilitler] = useState([]);
  useEffect(() => {
    if (!window.crmLocks?.list) return;
    let active = true;
    const yenile = () => window.crmLocks.list().then(r => { if (active) setKilitler(Array.isArray(r) ? r : []); }).catch(() => {});
    yenile();
    const off = window.appServer?.onLocksChanged?.(yenile);
    return () => { active = false; if (typeof off === "function") off(); };
  }, []);
  // entityType + id kümesi için, AKTİF kullanıcıdan BAŞKASININ tuttuğu kilidi döndürür (yoksa null).
  const baskasiKilitli = (entityType, ids) => {
    const set = new Set((Array.isArray(ids) ? ids : [ids]).map(String));
    return kilitler.find(k => k.entity_type === entityType && set.has(String(k.entity_id)) && k.locked_by !== aktifKullanici) || null;
  };
  const kilitReddet = (k) => showToast(`Bu kayıt "${k.locked_by}" tarafından düzenleniyor, taşınamadı.`, "err");

  // Servis DÜZENLERKEN, o servisin müşterisi için kilit al — müşteri detayındaki düzenlemeyle
  // AYNI kilit alanını ("customer") paylaşır, böylece kiosk + ofis aynı kaydı aynı anda düzenleyemez.
  // Ekleme (yeni servis) modunda kilit alınmaz (taslak kaybı olmasın; 409 optimistik koruma yeterli).
  const svLockId = (svModal && svModal.edit) ? (form.customerId ?? null) : null;
  const { lockConflict: svLock, forceAcquire: forceSvLock } = useLock("customer", svLockId);
  // Kargo/kalıp detay modalları eşzamanlı düzenleme kilidi (Stok'taki yedek parça düzenlemesiyle
  // aynı "yedek_parca" alanını paylaşır → iki kullanıcı aynı satışı aynı anda düzenleyemez).
  const { lockConflict: kargoLock, forceAcquire: forceKargoLock } = useLock("yedek_parca", kargoDetayId);
  const { lockConflict: kalipLock, forceAcquire: forceKalipLock } = useLock("part_sale", kalipDetayId);

  // ── Canlı saat & tarih (Anasayfa ile aynı) ──
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const saat = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const tarih = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  // Canlı işçilik sayacı için `now`u yerel ISO'ya çevir (servisSureleri'ye verilir).
  const nowIso = (() => { const p = (n) => String(n).padStart(2, "0"); return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`; })();
  const [analizSv, setAnalizSv] = useState(null); // per-servis süre analizi modalı

  const custMap = useMemo(() => { const m = {}; for (const c of customers) m[c.id] = c; return m; }, [customers]);
  // İşlem Geçmişi (audit) — panodaki servis ve kargo mutasyonları için kısa yardımcılar.
  const auditServis = (action, id, detail) => { const sv = services.find(s => s.id === id); logAction({ serverPermissions, action, entity: "servis", entityId: id, entityName: custMap[Number(sv?.customerId)]?.name, detail }); };
  const auditKargo = (action, id, detail) => { const s = yedekParcaSatislar.find(x => x.id === id); logAction({ serverPermissions, action, entity: "yedek_parca_satis", entityId: id, entityName: aliciAd(s, dealers, customers), detail }); };
  const auditKalip = (action, id, detail) => { const s = partSales.find(x => x.id === id); logAction({ serverPermissions, action, entity: "kalip_satisi", entityId: id, entityName: custMap[Number(s?.customerId)]?.name, detail }); };
  const factoryName = factory?.name || "Altuntaş Makina";
  const cs = appSettings?.calismaSaatleri; // firma çalışma saatleri → işçilik mesai hesabı

  // ── Yeni-servis alarmı ─────────────────────────────────────────────────────────
  // Uzaktan (sunucudan) eklenen yeni "Bekliyor" servis geldiğinde: kart yanıp söner + ses + şerit.
  // Aç/kapa + süreler kullanıcı-kontrollü (Ayarlar > Uygulama > Servis Panosu → appSettings.servisAlarm);
  // sunucu izin sistemine bağlı değil. İlk yükleme taban çizgisidir (backlog ötmez); kiosk'un kendi
  // eklediği atlanır.
  const alarmAcik = appSettings?.servisAlarm?.acik === true;
  const alarmCfg = useMemo(() => ({ ...SERVIS_ALARM_VARSAYILAN, ...(appSettings?.servisAlarm || {}) }), [appSettings?.servisAlarm]);
  const alarmAcikRef = useRef(alarmAcik); alarmAcikRef.current = alarmAcik;
  const alarmCfgRef = useRef(alarmCfg); alarmCfgRef.current = alarmCfg;
  const custMapRef = useRef(custMap); custMapRef.current = custMap;
  const dealerMap = useMemo(() => { const m = {}; for (const d of dealers) m[d.id] = d; return m; }, [dealers]);
  const dealerMapRef = useRef(dealerMap); dealerMapRef.current = dealerMap;
  const kargoYetkiRef = useRef(kargoYetki); kargoYetkiRef.current = kargoYetki;
  const yedekRef = useRef(yedekParcaSatislar); yedekRef.current = yedekParcaSatislar;
  const kalipYetkiRef = useRef(kalipYetki); kalipYetkiRef.current = kalipYetki;
  const partSalesRef = useRef(partSales); partSalesRef.current = partSales;
  const bilinenRef = useRef(null);              // Set<id> — bilinen tüm servis+kargo id'leri (taban dahil)
  const yerelEklenenRef = useRef(new Set());    // kiosk'un kendi eklediği id'ler → alarm atlanır
  const alarmRef = useRef(null);                // createAlarm örneği (lazy)
  const [yananIds, setYananIds] = useState({}); // { id: bitisZamaniMs } — yanıp sönen kartlar
  const [alarmSeridi, setAlarmSeridi] = useState([]); // bildirim şeridi: [{ id, ad, tur: "servis"|"kargo" }]

  useEffect(() => {
    if (!alarmRef.current) alarmRef.current = createAlarm();
    return () => { alarmRef.current?.durdur?.(); };
  }, []);

  useEffect(() => {
    // Servis + kargo AYNI alarmı paylaşır. Planlanmış (ileri zamanlı, henüz düşmemiş) servis/kargo
    // bilinen kümeye eklenmez → zamanı gelince "yeni" yakalanıp düşüşte tetiklenir. Kargo yalnız
    // kargoYetki varsa panoda göründüğü için yalnız o zaman alarma katılır.
    const kargolar = kargoYetkiRef.current ? yedekRef.current : [];
    const kaliplar = kalipYetkiRef.current ? partSalesRef.current.filter(s => s.tur === "Kalıp") : [];
    const ids = [];
    for (const s of services) if (s?.id != null && !servisPlanlandiMi(s, nowIso)) ids.push(s.id);
    for (const s of kargolar) if (s?.id != null && s.kargoDurum && s.deletedAt == null && !kargoPlanlandiMi(s, nowIso)) ids.push(s.id);
    for (const s of kaliplar) if (s?.id != null && s.kargoDurum && s.deletedAt == null && !kargoPlanlandiMi(s, nowIso)) ids.push(s.id);
    if (bilinenRef.current === null) { bilinenRef.current = new Set(ids); return; } // taban çizgisi
    const bilinen = bilinenRef.current;
    const yeniS = yeniBekleyenler(bilinen, services, nowIso).filter(id => !yerelEklenenRef.current.has(id));
    const yeniK = yeniKargolar(bilinen, kargolar, nowIso).filter(id => !yerelEklenenRef.current.has(id));
    const yeniKl = yeniKargolar(bilinen, kaliplar, nowIso).filter(id => !yerelEklenenRef.current.has(id));
    const yeni = [...yeniS, ...yeniK, ...yeniKl];
    for (const id of ids) bilinen.add(id); // sonraki döngüde tekrar tetiklenmesin
    if (!yeni.length || !alarmAcikRef.current) return;
    const bitis = Date.now() + Math.max(1, Number(alarmCfgRef.current.yanipSn) || 1) * 1000;
    setYananIds(prev => { const n = { ...prev }; for (const id of yeni) n[id] = bitis; return n; });
    const kargoId = new Set(yeniK), kalipId = new Set(yeniKl);
    const kayit = yeni.map(id => {
      if (kargoId.has(id)) {
        const s = yedekRef.current.find(x => x.id === id);
        const ad = s?.aliciTipi === "musteri"
          ? (custMapRef.current[Number(s.musteriId)]?.name || "(müşteri yok)")
          : (dealerMapRef.current[Number(s?.dealerId)]?.name || "(bayi yok)");
        return { id, ad, tur: "kargo" };
      }
      if (kalipId.has(id)) {
        const s = partSalesRef.current.find(x => x.id === id);
        return { id, ad: custMapRef.current[Number(s?.customerId)]?.name || "(müşteri yok)", tur: "kargo" };
      }
      const s = services.find(x => x.id === id);
      return { id, ad: custMapRef.current[Number(s?.customerId)]?.name || "(müşteri yok)", tur: "servis" };
    });
    setAlarmSeridi(prev => [...kayit, ...prev].slice(0, 8));
    alarmRef.current?.baslat?.(alarmCfgRef.current.sesSn);
  }, [services, yedekParcaSatislar, partSales, nowIso]);

  // Yanıp sönme süresi dolan kartları 1 sn'lik saatle düş.
  useEffect(() => {
    setYananIds(prev => {
      const t = Date.now(); const n = {}; let degisti = false;
      for (const k in prev) { if (prev[k] > t) n[k] = prev[k]; else degisti = true; }
      return degisti ? n : prev;
    });
  }, [now]);

  const susturAlarm = () => { alarmRef.current?.durdur?.(); setYananIds({}); setAlarmSeridi([]); };

  // Yalnız durumu olan VE panodan kaldırılmamış (arşivlenmemiş) servisler; sütunlara göre grupla.
  const sutunlar = useMemo(() => {
    const g = { "Bekliyor": [], "Yapılıyor": [], "Tamamlandı": [] };
    // Planlanmış (ileri zamanlı) Bekliyor kartları henüz düşmedi → sütunlarda gösterilmez.
    for (const s of services) if (s.durum && g[s.durum] && !s.panoGizli && !servisPlanlandiMi(s, nowIso)) g[s.durum].push(s);
    for (const k of Object.keys(g)) g[k].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    return g;
  }, [services, nowIso]);

  // Kargo (yedek parça satışı) kartları — yalnız kargoYetki varsa (Stok erişimi) panoda görünür;
  // kargoDurum'u olanlar eşlenen servis sütununa girer (servis-katı kiosk kargo görmez).
  const kargoSutunlar = useMemo(() => {
    const g = { "Bekliyor": [], "Yapılıyor": [], "Tamamlandı": [] };
    if (!kargoYetki) return g;
    // Planlanmış (panoya düşme zamanı ileri) kargolar zamanı gelene kadar sütunlarda görünmez.
    for (const s of yedekParcaSatislar) { const col = KARGO_SUTUN[s.kargoDurum]; if (col && !s.deletedAt && !s.panoGizli && !kargoPlanlandiMi(s, nowIso)) g[col].push(s); }
    // Toplu satış (aynı batchId) tek kart olsun → sütun içinde batchId'ye göre grupla (grup = 1 kart).
    for (const k of Object.keys(g)) g[k] = grupla(g[k]);
    return g;
  }, [yedekParcaSatislar, kargoYetki, nowIso]);
  // Arşivlenen kargolar: "Panodan Kaldır" ile gizlenen Teslim Edildi kargo kartları (servisler gibi).
  const kargoArsivlenenler = useMemo(
    () => (!kargoYetki ? [] : grupla(yedekParcaSatislar.filter(s => s.panoGizli && s.kargoDurum && !s.deletedAt)
      .sort((a, b) => String(b.tarih || "").localeCompare(String(a.tarih || ""))))),
    [yedekParcaSatislar, kargoYetki]
  );
  // Detay: tıklanan kartın grubu (toplu satışta tüm kayıtlar). batchId varsa grubu, yoksa tek kaydı.
  const kargoDetay = useMemo(() => {
    if (kargoDetayId == null) return null;
    const h = yedekParcaSatislar.find(s => s.id === kargoDetayId);
    if (!h) return null;
    return h.batchId != null ? yedekParcaSatislar.filter(s => s.batchId === h.batchId && !s.deletedAt) : [h];
  }, [kargoDetayId, yedekParcaSatislar]);
  // Kargo kartı sütun değiştirince kargoDurum'u o sütunun karşılığına çek.
  const kargoDurumDegistir = (id, sutunKey) => {
    if (!setYedekParcaSatislar || !canKargoDuzenle) return;
    const kargoDurum = SUTUN_KARGO[sutunKey]; if (!kargoDurum) return;
    // Toplu satış tek kart → grubun TÜM kayıtları birlikte hareket eder.
    const idler = new Set(grupIdleri(yedekParcaSatislar, id));
    const k = baskasiKilitli("yedek_parca", [...idler]); if (k) return kilitReddet(k);
    // Tamamlandı (Teslim Edildi) dışına sürüklenirse arşiv bayrağını temizle (kart panoda kalsın).
    setYedekParcaSatislar(p => p.map(s => idler.has(s.id) ? { ...s, kargoDurum, panoGizli: sutunKey === "Tamamlandı" ? s.panoGizli : false } : s));
    auditKargo("durum_degisti", id, { durum: kargoDurum });
  };
  // Kargo kartını panodan kaldır / geri al (servislerdeki panoGizle deseni; ayrı pano izinleri).
  const kargoPanoGizle = (id, gizli) => {
    if (!setYedekParcaSatislar || !(gizli ? canKargoKaldir : canKargoArsiv)) return;
    const idler = new Set(grupIdleri(yedekParcaSatislar, id));
    setYedekParcaSatislar(p => p.map(s => idler.has(s.id) ? { ...s, panoGizli: gizli } : s));
    auditKargo(gizli ? "panodan_kaldirildi" : "panoya_alindi", id);
    showToast(gizli ? "Kargo kartı panodan kaldırıldı (satış kaydı duruyor)." : "Kargo kartı panoya geri alındı.");
  };
  const kargoSorumluDegistir = (id, kargoSorumlusu) => {
    if (!setYedekParcaSatislar || !canKargoDuzenle) return;
    const idler = new Set(grupIdleri(yedekParcaSatislar, id));
    setYedekParcaSatislar(p => p.map(s => idler.has(s.id) ? { ...s, kargoSorumlusu } : s));
    auditKargo("sorumlu_degisti", id, { kargoSorumlusu });
  };

  // ── Extra Kalıp kargo kartları (partSales tur="Kalıp" + kargoDurum) — kargo deseninin aynısı ──
  const kalipSutunlar = useMemo(() => {
    const g = { "Bekliyor": [], "Yapılıyor": [], "Tamamlandı": [] };
    if (!kalipYetki) return g;
    for (const s of partSales) { if (s.tur !== "Kalıp") continue; const col = KARGO_SUTUN[s.kargoDurum]; if (col && !s.deletedAt && !s.panoGizli && !kargoPlanlandiMi(s, nowIso)) g[col].push(s); }
    for (const k of Object.keys(g)) g[k] = grupla(g[k]); // toplu Extra Kalıp (aynı batchId) tek kart
    return g;
  }, [partSales, kalipYetki, nowIso]);
  const kalipArsivlenenler = useMemo(
    () => (!kalipYetki ? [] : grupla(partSales.filter(s => s.tur === "Kalıp" && s.panoGizli && s.kargoDurum && !s.deletedAt)
      .sort((a, b) => String(b.tarih || "").localeCompare(String(a.tarih || ""))))),
    [partSales, kalipYetki]
  );
  const kalipDetay = useMemo(() => {
    if (kalipDetayId == null) return null;
    const h = partSales.find(s => s.id === kalipDetayId);
    if (!h) return null;
    return h.batchId != null ? partSales.filter(s => s.tur === "Kalıp" && s.batchId === h.batchId && !s.deletedAt) : [h];
  }, [kalipDetayId, partSales]);
  const kalipDurumDegistir = (id, sutunKey) => {
    if (!setPartSales || !canKalipDuzenle) return;
    const kargoDurum = SUTUN_KARGO[sutunKey]; if (!kargoDurum) return;
    const idler = new Set(grupIdleri(partSales, id));
    const k = baskasiKilitli("part_sale", [...idler]); if (k) return kilitReddet(k);
    setPartSales(p => p.map(s => idler.has(s.id) ? { ...s, kargoDurum, panoGizli: sutunKey === "Tamamlandı" ? s.panoGizli : false } : s));
    auditKalip("durum_degisti", id, { durum: kargoDurum });
  };
  const kalipPanoGizle = (id, gizli) => {
    if (!setPartSales || !(gizli ? canKalipKaldir : canKalipArsiv)) return;
    const idler = new Set(grupIdleri(partSales, id));
    setPartSales(p => p.map(s => idler.has(s.id) ? { ...s, panoGizli: gizli } : s));
    auditKalip(gizli ? "panodan_kaldirildi" : "panoya_alindi", id);
    showToast(gizli ? "Kalıp kargosu panodan kaldırıldı (satış kaydı duruyor)." : "Kalıp kargosu panoya geri alındı.");
  };
  const kalipSorumluDegistir = (id, kargoSorumlusu) => {
    if (!setPartSales || !canKalipDuzenle) return;
    const idler = new Set(grupIdleri(partSales, id));
    setPartSales(p => p.map(s => idler.has(s.id) ? { ...s, kargoSorumlusu } : s));
    auditKalip("sorumlu_degisti", id, { kargoSorumlusu });
  };
  const kalipHemenDusur = (id) => {
    if (!setPartSales || !canKalipKaldir) return;
    const idler = new Set(grupIdleri(partSales, id));
    setPartSales(p => p.map(s => idler.has(s.id) ? { ...s, panoDusmeZamani: "" } : s));
    auditKalip("hemen_dusuruldu", id);
  };
  const kalipPlanlananlar = useMemo(
    () => (!kalipYetki ? [] : grupla(partSales.filter(s => s.tur === "Kalıp" && !s.panoGizli && !s.deletedAt && s.kargoDurum && kargoPlanlandiMi(s, nowIso))
      .sort((a, b) => String(a.panoDusmeZamani || "").localeCompare(String(b.panoDusmeZamani || ""))))),
    [partSales, kalipYetki, nowIso]
  );
  // Bir sütunun servis + kargo kartları tek listede, EN SON EKLENEN en üstte (tür karışık). Sıralama
  // oluşturma anına göre: servis fabrikaGirisZamani (giriş/oluşturma), kargo olusturmaZamani; ikisi de
  // yoksa gün-bazlı tarihe (T00:00) düşer. id rastgele olduğundan sıralama için kullanılamaz.
  const kartZamani = (x) => x._kargo
    ? (x.olusturmaZamani || (x.tarih ? x.tarih + "T00:00" : ""))
    : x._kalip
      ? (x.olusturmaZamani || (x.kargoTarih || x.tarih || "") + (x.kargoTarih || x.tarih ? "T00:00" : ""))
      : (x.fabrikaGirisZamani || (x.date ? x.date + "T00:00" : ""));
  const birlesikKartlar = (colKey) => {
    const liste = [
      ...sutunlar[colKey],
      ...kargoSutunlar[colKey].map(s => ({ ...s, _kargo: true })),
      ...kalipSutunlar[colKey].map(s => ({ ...s, _kalip: true })),
    ];
    return liste.sort((a, b) => kartZamani(b).localeCompare(kartZamani(a)));
  };

  // Planlananlar: ileri zamana alınmış, panoya düşmesi beklenen Bekliyor servisleri (en yakın önce).
  const planlananlar = useMemo(
    () => services.filter(s => !s.panoGizli && servisPlanlandiMi(s, nowIso))
      .sort((a, b) => String(a.fabrikaGirisZamani || "").localeCompare(String(b.fabrikaGirisZamani || ""))),
    [services, nowIso]
  );
  // Planlanan kargolar: panoya düşme zamanı ileride olan kargolar (servisler gibi Planlananlar'da görünür).
  const kargoPlanlananlar = useMemo(
    () => (!kargoYetki ? [] : grupla(yedekParcaSatislar.filter(s => !s.panoGizli && !s.deletedAt && s.kargoDurum && kargoPlanlandiMi(s, nowIso))
      .sort((a, b) => String(a.panoDusmeZamani || "").localeCompare(String(b.panoDusmeZamani || ""))))),
    [yedekParcaSatislar, kargoYetki, nowIso]
  );

  // Arşivlenenler: "Panodan Kaldır" ile gizlenen (servis kaydı duran) Tamamlandı kartları.
  const arsivlenenler = useMemo(
    () => services.filter(s => s.panoGizli && s.durum).sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))),
    [services]
  );

  const durumDegistir = (id, durum) => {
    if (!setServices || !canDo("cust_service_edit")) return;
    // Servis kaydı, müşteri detayı/servis düzenleme ile aynı "customer" alanını kilitler. O müşteriyi
    // başkası düzenliyorsa (müşteri detayı/kiosk servis formu açık) kartı taşımayı reddet.
    const sv = services.find(s => s.id === id);
    if (sv?.customerId != null) { const k = baskasiKilitli("customer", sv.customerId); if (k) return kilitReddet(k); }
    const ts = simdiYerel();
    // Tamamlandı dışına geri sürüklenirse arşiv bayrağını da temizle (kart yeniden panoda görünsün).
    setServices(p => p.map(s => {
      if (s.id !== id) return s;
      const u = { ...s, durum, panoGizli: durum === "Tamamlandı" ? s.panoGizli : false };
      // Aşama zaman damgaları: giriş/başlangıç boşsa doldurulur (ilk zaman korunur, geri-ileri
      // sürüklemede bozulmaz); Tamamlandı bitişi her girişte güncellenir (en son bitiş anlamlı).
      if (durum === "Bekliyor" && !u.fabrikaGirisZamani) u.fabrikaGirisZamani = ts;
      if (durum === "Yapılıyor" && !u.bakimBaslangicZamani) u.bakimBaslangicZamani = ts;
      if (durum === "Tamamlandı") u.bitisZamani = ts;
      return u;
    }));
    auditServis("durum_degisti", id, { durum });
  };
  const teknisyenDegistir = (id, tech) => {
    if (!setServices || !canDo("cust_service_edit")) return;
    setServices(p => p.map(s => s.id === id ? { ...s, tech } : s));
    auditServis("teknisyen_degisti", id, { tech });
  };
  // Planlanan servisi beklenen zamandan önce hemen panoya düşür (giriş anını şimdiye çeker).
  const hemenDusur = (id) => {
    if (!setServices || !canDo("cust_service_edit")) return;
    const ts = simdiYerel();
    setServices(p => p.map(s => s.id === id ? { ...s, durum: "Bekliyor", fabrikaGirisZamani: ts } : s));
    auditServis("hemen_dusuruldu", id);
  };
  // Planlanan kargoyu hemen panoya düşür (panoya düşme zamanını temizler → Bekliyor sütununa girer).
  const kargoHemenDusur = (id) => {
    if (!setYedekParcaSatislar || !canKargoKaldir) return;
    const idler = new Set(grupIdleri(yedekParcaSatislar, id));
    setYedekParcaSatislar(p => p.map(s => idler.has(s.id) ? { ...s, panoDusmeZamani: "" } : s));
    auditKargo("hemen_dusuruldu", id);
  };
  const panoGizle = (id, gizli) => {
    // Kaldır (arşivle) ve geri-al ayrı izinler: Servis Panosu işlemleri altında (Kullanıcı Yönetimi).
    if (!setServices || !canDo(gizli ? "cust_service_pano_kaldir" : "cust_service_pano_arsiv")) return;
    setServices(p => p.map(s => s.id === id ? { ...s, panoGizli: gizli } : s));
    auditServis(gizli ? "panodan_kaldirildi" : "panoya_alindi", id);
    showToast(gizli ? "Kart panodan kaldırıldı (servis kaydı duruyor)." : "Kart panoya geri alındı.");
  };
  const arsivGorebilir = canDo("cust_service_pano_arsiv");
  const [arsivTemizleOnay, setArsivTemizleOnay] = useState(false);
  // Arşivi temizle: arşivlenen (Tamamlandı + panoGizli) servislerin durum'unu boşaltıp panodan
  // TAMAMEN çıkarır. Servis kaydı ve zaman damgaları müşteri kartında/geçmişte DURUR (silinmez).
  const arsivTemizle = () => {
    if (!setServices || !canDo("cust_service_pano_kaldir")) return;
    const ids = new Set(arsivlenenler.map(s => s.id));
    setServices(p => p.map(s => ids.has(s.id) ? { ...s, durum: "", panoGizli: false } : s));
    setArsivTemizleOnay(false);
    showToast(`${ids.size} arşivlenen servis panodan kaldırıldı (kayıtlar müşteri kartında duruyor).`);
  };

  // Servis Formu yazdır — müşteri detayındaki printServiceForm ile birebir aynı (aynı şablon,
  // aynı çeviri/kaşe/resim bağlamı), böylece iki çıktı asla ayrışmaz.
  const servisT = (lang = "TR") => ({ ...((appSettings?.translations?.servis) || {}), _lang: lang });
  const kaseResmi = appSettings?.kaseResmi || "";
  const servisResimleri = async (sv) => {
    if (!window.appFiles?.dataUrl) return [];
    const RESIM = /\.(jpg|jpeg|png|gif|webp)$/i;
    const ekler = (dosyalar || []).filter(d => !d.deletedAt && d.refType === "servis" && d.refId === sv.id && RESIM.test(d.dosyaAdi || ""));
    const sonuc = [];
    for (const d of ekler) {
      try { const r = await window.appFiles.dataUrl(d.dosyaAdi); if (r?.ok && r.dataUrl) sonuc.push({ dataUrl: r.dataUrl, ad: d.ad || d.dosyaAdi }); }
      catch { /* okunamayan resim çıktıyı engellemesin */ }
    }
    return sonuc;
  };
  const printServiceForm = async (sv, lang = "TR") =>
    printServiceFormTemplate(sv, customers, kdvRates, servisT(lang), kaseResmi, factory, await servisResimleri(sv));

  // Müşteri detayındaki servis ekle/düzenle ile birebir aynı: tam ServiceForm + aynı kayıt/stok mantığı.
  const acEkle = () => { setForm(bosForm(factoryName)); setSvModal("add"); };
  const acDuzenle = (sv) => {
    const eski = (sv.degisenParcalar || []).some(p => typeof p === "string");
    const degisenParcalar = eski
      ? sv.degisenParcalar.map(ad => ({ ad, fiyat: sv.degisenParcalar.length ? parseMoney(sv.parcaUcreti) / sv.degisenParcalar.length : 0 }))
      : (sv.degisenParcalar || []);
    const cust = customers.find(c => c.id === sv.customerId);
    setForm({ parcaUcreti: "", parcaGarantiDisi: false, faturaTipi: normalizeSaleType(cust?.faturali), ...sv, degisenParcalar });
    setSvModal({ edit: sv });
  };

  // Servis formunda eklenen dosya taslaklarını (fiziksel dosya zaten yüklendi) servise bağla —
  // müşteri detayındaki bindServisDosyalari ile birebir aynı.
  const bindServisDosyalari = (servisId, taslaklar) => {
    if (!setDosyalar || !servisId || !taslaklar?.length) return;
    const cust = customers.find(c => c.id === Number(form.customerId));
    bumpId(dosyalar);
    const yeni = taslaklar.map(f => ({ id: uid(), customerId: Number(form.customerId), refType: "servis", refId: servisId, ad: f.ad, dosyaAdi: f.dosyaAdi, boyut: f.boyut, tur: f.tur, tarih: today(), ekleyen: getAuditUsername() }));
    setDosyalar(p => [...yeni, ...p]);
    yeni.forEach(d => logAction({ serverPermissions, action: "olusturuldu", entity: "dosya", entityId: d.id, entityName: cust?.name, detail: { ad: d.ad } }));
  };

  const kaydet = (parcaUcretsizMi, dosyaTaslaklari = []) => {
    if (!setServices) return;
    const cust = customers.find(c => c.id === Number(form.customerId));
    const parcaUcreti = (form.degisenParcalar || []).reduce((s, p) => s + parseMoney(typeof p === "string" ? 0 : p.fiyat), 0);
    const parcaUcretiAltuntastan = (form.degisenParcalar || []).filter(p => typeof p !== "string" && !p.disTedarik).reduce((s, p) => s + parseMoney(p.fiyat), 0);
    const rec = { ...form, customerId: form.customerId ? Number(form.customerId) : null, parcaUcretsizMi, parcaUcreti, parcaUcretiAltuntastan, parcaCurrency: form.currency };
    if (svModal === "add") {
      bumpId(customers, services);
      const newId = uid();
      // Yeni servis "Bekliyor" ile açılır → fabrikaya giriş anı damgalanır (elle girilmişse korunur).
      const yeniRec = { ...rec, id: newId };
      if (yeniRec.durum === "Bekliyor" && !yeniRec.fabrikaGirisZamani) yeniRec.fabrikaGirisZamani = simdiYerel();
      // Hemen düşen servisi "kendi ekledik" işaretle (kendi panomuzda + uygulama genelinde alarm/ses
      // çıkmasın). Planlanmış (ileri zamanlı) servis İŞARETLENMEZ → düştüğünde alarm/bildirim tetiklensin.
      if (!servisPlanlandiMi(yeniRec, simdiYerel())) {
        yerelEklenenRef.current.add(newId);
        yerelServisEkle(newId);
      }
      setServices(p => p.some(s => s.id === newId) ? p : [yeniRec, ...p]);
      servisParcaDus(rec.degisenParcalar, newId, setPartStock, setPartStockLog);
      bindServisDosyalari(newId, dosyaTaslaklari);
      logAction({ serverPermissions, action: "olusturuldu", entity: "servis", entityId: newId, entityName: cust?.name, detail: { type: rec.type } });
      showToast(dosyaTaslaklari.length ? `Servis talebi kaydedildi (${dosyaTaslaklari.length} dosya eklendi).` : "Servis talebi kaydedildi → Bekliyor.");
    } else {
      restoreThenSave(rec);
      bindServisDosyalari(form.id, dosyaTaslaklari);
      logAction({ serverPermissions, action: "duzenlendi", entity: "servis", entityId: form.id, entityName: cust?.name });
      showToast("Servis talebi düzenlendi.");
    }
    setSvModal(null);
  };
  const restoreThenSave = (rec) => {
    servisParcaGeriAl(form.id, setPartStock, setPartStockLog);
    setServices(p => p.map(s => s.id === form.id ? rec : s));
    servisParcaDus(rec.degisenParcalar, form.id, setPartStock, setPartStockLog);
  };

  // Teknisyen seçenekleri (form.tech listede yoksa onu da göster ki eski/serbest değer kaybolmasın)
  const tekAdlari = calisanlar.map(c => c.ad).filter(Boolean);

  // Kart bir BİLEŞEN olarak <Kart/> değil, doğrudan Kart({...}) çağrısıyla render edilir. Böylece her
  // render'da yeni fonksiyon kimliği yüzünden REMOUNT olmaz (1sn'lik saat kartları söküp takıyordu →
  // açık <select> kapanıyor, teknisyen seçilemiyordu). Doğrudan çağrı kartı yerinde günceller. Hook YOK.
  const Kart = ({ sv, arsiv = false, key }) => {
    const c = custMap[Number(sv.customerId)] || {};
    const stil = TUR_STIL[sv.type] || TUR_STIL["Periyodik Bakım"];
    const durumRenk = (DURUMLAR.find(d => d.key === sv.durum) || DURUMLAR[0]).renk;
    const teksBos = !sv.tech;
    const teknListe = sv.tech && !tekAdlari.includes(sv.tech) ? [sv.tech, ...tekAdlari] : tekAdlari;
    const surukle = canDo("cust_service_edit") && !arsiv;
    const tamamlandi = sv.durum === "Tamamlandı";
    const yaniyor = !arsiv && yananIds[sv.id] != null; // yeni gelen servis: alarm süresince yanıp söner
    return (
      <article key={key} draggable={surukle && dragKapaliId !== sv.id}
        className={yaniyor ? "servis-alarm-yanip" : undefined}
        onDragStart={surukle ? (e => { e.dataTransfer.setData("text/plain", "servis:" + sv.id); e.dataTransfer.effectAllowed = "move"; }) : undefined}
        onClick={() => acDuzenle(sv)}
        style={{ background: arsiv ? "var(--n100, #f8fafc)" : "var(--surface, #fff)", border: "1px solid var(--n200, #e2e8f0)", borderLeft: `3px solid ${durumRenk}`, borderRadius: 12, padding: arsiv ? "10px 12px" : "12px 13px 11px", boxShadow: arsiv ? "none" : "0 1px 3px rgba(20,20,30,.07)", opacity: arsiv ? 0.9 : 1, cursor: surukle ? "grab" : "pointer" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: arsiv ? 13 : 14, lineHeight: 1.25, color: "var(--n900, #0f172a)", flex: 1 }}>{c.name || "(müşteri yok)"}</div>
          {!arsiv && <span style={{ color: "var(--n300, #cbd5e1)", fontSize: 14, letterSpacing: -2, userSelect: "none" }}>⠿</span>}
        </div>
        <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{c.model || "Model yok"}{c.serialNo ? ` · S/N ${c.serialNo}` : ""}</div>
        {/* İşlemi yapan firma fabrika değilse (anlaşmalı bayi / anlaşmasız "Diğer") firma rozeti —
            işi kimin yaptığı bir bakışta belli olsun. Teal = bayi, amber = anlaşmasız dış servis. */}
        {!isAltuntasServisi(sv, factoryName) && (() => {
          const disServis = disServisMi(sv);
          const rk = disServis
            ? { fg: "var(--amb700, #b45309)", bg: "var(--ambBg, #fffbeb)", br: "var(--ambBr, #fde68a)" }
            : { fg: "#0d9488", bg: "#f0fdfa", br: "#99f6e4" };
          return (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, fontSize: 11, fontWeight: 700, borderRadius: 7, padding: "3px 8px", color: rk.fg, background: rk.bg, border: `1px solid ${rk.br}` }}>
              <Icon name="store" size={11} /> {disServis ? "Dış Servis" : "Anlaşmalı Servis"}: {islemFirmaGoster(sv)}
            </div>
          );
        })()}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 7, padding: "3px 8px", color: stil.fg, background: stil.bg, border: `1px solid ${stil.br}` }}>{sv.type}</span>
          {sv.repairPlace && <span style={{ fontSize: 11.5, color: "var(--n400, #94a3b8)" }}>{sv.repairPlace}</span>}
          <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--n400, #94a3b8)", fontVariantNumeric: "tabular-nums" }}>{sv.date ? `Talep ${fmtTR(sv.date)}` : "—"}</span>
        </div>
        {/* Aşama zaman göstergesi: giriş (Bekliyor) / canlı işçilik (Yapılıyor) / bitiş+işçilik (Tamamlandı) */}
        {!arsiv && (() => {
          const s = servisSureleri(sv, nowIso, cs);
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7, fontSize: 11, fontVariantNumeric: "tabular-nums", flexWrap: "wrap" }}>
              {/* "Periyodik Bakım" rozeti gibi renkli kutular: her aşama zamanı kendi renginde.
                  Giriş (amber) her sütunda kalır; Başlangıç (mavi) ve Bitiş (yeşil) varsa görünür. */}
              {s.giris && <span style={pilStil(DURUM_BEK)}>Giriş {fmtZamanTam(s.giris)}</span>}
              {s.baslangic && <span style={pilStil(DURUM_YAP)}>Başlangıç {fmtZamanTam(s.baslangic)}</span>}
              {s.bitis && <span style={pilStil(DURUM_TAM)}>Bitiş {fmtZamanTam(s.bitis)}</span>}
              {/* Canlı sayaç: Bekliyor = bekleme, Yapılıyor = işçilik; Tamamlandı = kesin işçilik süresi. */}
              {sv.durum === "Bekliyor" && s.giris && <span style={pilStil(DURUM_BEK)}>⏱ {sureBicim(sureDk(s.giris, nowIso))}</span>}
              {sv.durum === "Yapılıyor" && s.devamEdiyor && <span style={pilStil(DURUM_YAP)}>⏱ {sureBicimSaat(s.isclikDk)}</span>}
              {tamamlandi && s.isclikDk != null && <span style={pilStil(DURUM_TAM)}>İşçilik {sureBicimSaat(s.isclikDk)}</span>}
            </div>
          );
        })()}
        {/* Servis Süre Analizi — "Periyodik Bakım" gibi kutu, kolayca tıklanır (ikon yerine tam kutu) */}
        {!arsiv && (
          <button type="button" onClick={e => { e.stopPropagation(); setAnalizSv(sv); }}
            style={{ display: "block", width: "100%", marginTop: 8, padding: "6px 10px", fontSize: 11.5, fontWeight: 700, borderRadius: 8, cursor: "pointer",
              color: "var(--n600, #475569)", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)" }}>
            Servis Süre Analizi
          </button>
        )}
        {arsiv ? (
          arsivGorebilir && (
            <div style={{ marginTop: 9, paddingTop: 8, borderTop: "1px dashed var(--n200, #e2e8f0)" }} onClick={e => e.stopPropagation()}>
              <button type="button" onClick={() => panoGizle(sv.id, false)}
                style={{ fontSize: 12, fontWeight: 600, color: "var(--blu600, #2563eb)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>↩ Panoya Geri Al</button>
            </div>
          )
        ) : (
          // macOS'ta <select>, draggable=true bir ATA içindeyken açılıyor ama seçim işlenmiyor.
          // Kontrol satırına gelince kartın draggable'ını React-kontrollü kapatıyoruz (dragKapaliId).
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10, paddingTop: 9, borderTop: "1px dashed var(--n200, #e2e8f0)" }}
            onClick={e => e.stopPropagation()}
            onMouseEnter={() => setDragKapaliId(sv.id)}
            onMouseLeave={() => setDragKapaliId(id => id === sv.id ? null : id)}>
            <select value={sv.tech || ""} disabled={!canDo("cust_service_edit")}
              onChange={e => teknisyenDegistir(sv.id, e.target.value)}
              style={{ flex: 1, minWidth: 0, font: "inherit", fontSize: 12.5, fontWeight: teksBos ? 500 : 600, color: teksBos ? "var(--n400, #94a3b8)" : "var(--n800, #1e293b)", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: "5px 8px", cursor: "pointer" }}>
              <option value="">Kim yapıyor?</option>
              {teknListe.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {tamamlandi && (
              <button type="button" title="Servis Formu yazdır" onClick={() => printServiceForm(sv)}
                style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 600, color: "var(--n600, #475569)", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: "5px 9px", cursor: "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="print" size={12} /> Yazdır</button>
            )}
            {tamamlandi && canDo("cust_service_pano_kaldir") && (
              <button type="button" title="Kartı panodan kaldır (servis kaydı silinmez)" onClick={() => panoGizle(sv.id, true)}
                style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 600, color: "var(--n500, #64748b)", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: "5px 9px", cursor: "pointer", whiteSpace: "nowrap" }}>🗄 Kaldır</button>
            )}
          </div>
        )}
      </article>
    );
  };

  return (
    <div onPointerDown={() => kilidiAc()} style={{ display: "flex", flexDirection: "column", height: kiosk ? "100%" : "calc(100vh - 0px)", minHeight: 0 }}>
      {/* Araç çubuğu */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: kiosk ? "12px 18px" : "0 0 14px", flexShrink: 0,
        ...(kiosk ? { background: "linear-gradient(95deg,#160900 0%,#241205 55%,#33180a 100%)", boxShadow: "0 2px 14px rgba(0,0,0,.28)" } : {}) }}>
        {kiosk && <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(150deg,#f07a2c,#e85d1a)", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name="service" size={17} /></div>}
        <div>
          <h2 style={{ margin: 0, fontSize: kiosk ? 15 : 20, fontWeight: 750, letterSpacing: kiosk ? ".08em" : "-.01em", color: kiosk ? "#fff" : "var(--n900, #0f172a)" }}>SERVİS VE KARGO PANOSU</h2>
          {kiosk && <div style={{ fontSize: 11, color: "#c9ab95" }}>{factoryName} · Servis Katı</div>}
        </div>
        <div style={{ flex: 1 }} />
        {/* Sağda dikey istif: üstte tarih & saat (Anasayfa ile aynı, başlıkla aynı hizada), altında butonlar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          <div style={{ background: "linear-gradient(135deg, #1f0d02, #3d1c06)", borderRadius: 12, padding: "8px 16px", boxShadow: "0 4px 16px rgba(0,0,0,.2)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#ff9d5c", fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace", fontVariantNumeric: "tabular-nums", letterSpacing: 1 }}>{saat}</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#d4a584", fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace", fontVariantNumeric: "tabular-nums", letterSpacing: 1 }}>{tarih}</span>
          </div>
          {(canDo("cust_service_add") || kargoEkleGoster || (kiosk && onKilitle) || (onAyriPencere && !kiosk)) && (
            <div style={{ display: "flex", gap: 8 }}>
              {canDo("cust_service_add") && <Btn small onClick={acEkle}><Icon name="plus" size={14} /> Yeni Servis Talebi</Btn>}
              {kargoEkleGoster && <Btn small onClick={openAddYedekParca}><Icon name="parts" size={14} /> Yeni Yedek Parça Satışı</Btn>}
              {/* Yalnız ana penceredeki sekmede görünür; ayrı pencerenin içinde prop geçilmez → çıkmaz. */}
              {onAyriPencere && !kiosk && <Btn small variant="ghost" onClick={onAyriPencere} title="Servis Panosunu ayrı pencerede aç (2. monitör)"><Icon name="expand" size={14} /> Ayrı Pencere</Btn>}
              {kiosk && onKilitle && <Btn small variant="ghost" onClick={onKilitle} title="Kilitle"><Icon name="lock" size={14} /></Btn>}
            </div>
          )}
        </div>
      </div>

      {/* Yeni servis bildirim şeridi — uzaktan gelen yeni "Bekliyor" servis(ler) için */}
      {alarmSeridi.length > 0 && (() => {
        const servisler = alarmSeridi.filter(x => x.tur !== "kargo");
        const kargolar = alarmSeridi.filter(x => x.tur === "kargo");
        const bolum = (etiket, liste) => liste.length ? (
          <span><b style={{ fontWeight: 750 }}>{etiket}</b>{liste.length > 1 ? ` (${liste.length})` : ""}: {liste.map(x => x.ad).join(", ")}</span>
        ) : null;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, margin: kiosk ? "0 18px 8px" : "0 0 12px",
            padding: "10px 14px", background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 10 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>🔔</span>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--amb700, #b45309)" }}>
              {bolum("Yeni Servis Talebi", servisler)}
              {servisler.length > 0 && kargolar.length > 0 ? <span style={{ margin: "0 8px", opacity: .5 }}>·</span> : null}
              {bolum("Yeni Kargo Talebi", kargolar)}
            </div>
            <Btn small variant="ghost" onClick={susturAlarm}>Sustur</Btn>
          </div>
        );
      })()}

      {/* Servis + Kargo sütunları (tek görünüm) */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, padding: kiosk ? 14 : 0, minHeight: 0 }}>
        {DURUMLAR.map(d => {
          const kartlar = birlesikKartlar(d.key); // servis + kargo, tarihe göre en yeni üstte
          const hover = hoverDurum === d.key;
          return (
            <section key={d.key}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (hoverDurum !== d.key) setHoverDurum(d.key); }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setHoverDurum(h => h === d.key ? null : h); }}
              onDrop={e => { e.preventDefault(); setHoverDurum(null); const raw = e.dataTransfer.getData("text/plain"); const [tur, idStr] = raw.includes(":") ? raw.split(":") : ["servis", raw]; const id = Number(idStr); if (!id) return; if (tur === "kargo") kargoDurumDegistir(id, d.key); else if (tur === "kalip") kalipDurumDegistir(id, d.key); else durumDegistir(id, d.key); }}
              style={{ background: hover ? d.bg : "var(--n100, #f8fafc)", border: `1px solid ${hover ? d.br : "var(--n150, #f1f5f9)"}`, borderRadius: 14, display: "flex", flexDirection: "column", minHeight: 0, boxShadow: hover ? `inset 0 0 0 2px ${d.br}` : "none" }}>
              <div style={{ padding: "14px 16px 10px", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: d.renk }} />
                  <h3 style={{ margin: 0, fontSize: 12.5, fontWeight: 750, letterSpacing: ".08em", textTransform: "uppercase", color: d.renk }}>{d.baslik}</h3>
                  <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: d.renk, background: d.bg, border: `1px solid ${d.br}`, borderRadius: 999, padding: "1px 9px", fontVariantNumeric: "tabular-nums" }}>{kartlar.length}</span>
                </div>
                {/* Tür bazlı karşılıklar (servis / kargo / fabrika teslim) — kartlar kendi durumunu zaten gösterir. */}
                <div style={{ marginTop: 7, display: "grid", gap: 2 }}>
                  {d.alt.map(([et, deg], i) => (
                    <div key={i} style={{ fontSize: 10.5, color: "var(--n500, #64748b)", lineHeight: 1.45 }}>
                      <span style={{ fontWeight: 700, color: "var(--n600, #475569)" }}>{et}:</span> {deg}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "2px 12px 14px", display: "flex", flexDirection: "column", gap: 11 }}>
                {kartlar.map(item => item._kargo
                  ? <KargoKart key={"k" + item.id} s={item} dealers={dealers} parts={parts} customers={customers} calisanlar={calisanlar} canKargo={canKargoDuzenle} dragKapali={dragKapaliId === item.id} onKontrolHover={v => setDragKapaliId(v ? item.id : null)} onClick={setKargoDetayId} onSorumluChange={kargoSorumluDegistir} onArsivle={canKargoKaldir ? () => kargoPanoGizle(item.id, true) : undefined} yaniyor={yananIds[item.id] != null} />
                  : item._kalip
                  ? <KargoKart key={"kl" + item.id} s={item} tur="kalip" customers={customers} calisanlar={calisanlar} canKargo={canKalipDuzenle} dragKapali={dragKapaliId === item.id} onKontrolHover={v => setDragKapaliId(v ? item.id : null)} onClick={setKalipDetayId} onSorumluChange={kalipSorumluDegistir} onArsivle={canKalipKaldir ? () => kalipPanoGizle(item.id, true) : undefined} yaniyor={yananIds[item.id] != null} />
                  : Kart({ sv: item, key: item.id }))}
                {!kartlar.length && !(d.key === "Tamamlandı" && ((arsivGorebilir && arsivlenenler.length) || (canKargoArsiv && kargoArsivlenenler.length) || (canKalipArsiv && kalipArsivlenenler.length))) && !(d.key === "Bekliyor" && (planlananlar.length || kargoPlanlananlar.length || kalipPlanlananlar.length)) && <div style={{ margin: "auto", color: "var(--n400, #94a3b8)", fontSize: 12.5, textAlign: "center", padding: "24px 10px", lineHeight: 1.6 }}>{d.bos}</div>}
                {d.key === "Bekliyor" && (planlananlar.length > 0 || kargoPlanlananlar.length > 0 || kalipPlanlananlar.length > 0) && (
                  <div style={{ marginTop: kartlar.length ? 4 : 0 }}>
                    <button type="button" onClick={() => setPlanAcik(a => !a)}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "var(--n500, #64748b)", background: "none", border: "none", cursor: "pointer", padding: "6px 2px" }}>
                      <span>🕒</span>
                      <span>Planlanan ({planlananlar.length + kargoPlanlananlar.length + kalipPlanlananlar.length})</span>
                      <span style={{ marginLeft: "auto", fontSize: 11 }}>{planAcik ? "gizle ▲" : "göster ▼"}</span>
                    </button>
                    {planAcik && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                        {planlananlar.map(sv => {
                          const c = custMap[Number(sv.customerId)];
                          return (
                            <div key={sv.id} style={{ background: "var(--n100, #f8fafc)", border: "1px dashed var(--ambBr, #fde68a)", borderRadius: 10, padding: "9px 11px" }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--n800, #1e293b)" }}>{c?.name || "(müşteri yok)"}</div>
                              {(c?.model || sv.type) && <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 1 }}>{[c?.model, sv.type].filter(Boolean).join(" · ")}</div>}
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--amb600, #d97706)" }}>🕒 {fmtZamanTam(sv.fabrikaGirisZamani)}</span>
                                {canDo("cust_service_edit") && (
                                  <button type="button" onClick={() => hemenDusur(sv.id)}
                                    style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 600, color: "#e85d1a", background: "none", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 8, cursor: "pointer", padding: "4px 9px" }}>
                                    Hemen Düşür
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {/* Planlanan kargolar — servislerle aynı listede, 📦 işaretli */}
                        {kargoPlanlananlar.map(s => {
                          const grup = s._grup && s._grup.length ? s._grup : [s];
                          return (
                            <div key={"k" + s.id} style={{ background: "var(--n100, #f8fafc)", border: "1px dashed var(--ambBr, #fde68a)", borderRadius: 10, padding: "9px 11px", cursor: "pointer" }} onClick={() => setKargoDetayId(s.id)}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--n800, #1e293b)" }}>📦 {aliciAd(s, dealers, customers)}{grup.length > 1 ? ` · ${grup.length} kalem` : ""}</div>
                              <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 1 }}>{grup.map(g => `${parcaAdi((parts || []).find(pp => String(pp.id) === String(g.partId))) || "(parça)"} · ${g.miktar} adet`).join(", ")}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--amb600, #d97706)" }}>🕒 {fmtZamanTam(s.panoDusmeZamani)}</span>
                                {canKargoKaldir && (
                                  <button type="button" onClick={e => { e.stopPropagation(); kargoHemenDusur(s.id); }}
                                    style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 600, color: "#e85d1a", background: "none", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 8, cursor: "pointer", padding: "4px 9px" }}>
                                    Hemen Düşür
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {/* Planlanan kalıp kargoları — 🧩 işaretli */}
                        {kalipPlanlananlar.map(s => {
                          const c = custMap[Number(s.customerId)];
                          const grup = s._grup && s._grup.length ? s._grup : [s];
                          return (
                            <div key={"kl" + s.id} style={{ background: "var(--n100, #f8fafc)", border: "1px dashed var(--ambBr, #fde68a)", borderRadius: 10, padding: "9px 11px", cursor: "pointer" }} onClick={() => setKalipDetayId(s.id)}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: "var(--n800, #1e293b)" }}><Icon name="box" size={13} /> {c?.name || "(müşteri yok)"}{grup.length > 1 ? ` · ${grup.length} kalem` : ""}</div>
                              <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 1 }}>{grup.map(g => [g.ad || "(kalıp)", g.olcu].filter(Boolean).join(" ")).join(", ")}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--amb600, #d97706)" }}>🕒 {fmtZamanTam(s.panoDusmeZamani)}</span>
                                {canKalipKaldir && (
                                  <button type="button" onClick={e => { e.stopPropagation(); kalipHemenDusur(s.id); }}
                                    style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 600, color: "#e85d1a", background: "none", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 8, cursor: "pointer", padding: "4px 9px" }}>
                                    Hemen Düşür
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {d.key === "Tamamlandı" && ((arsivGorebilir && arsivlenenler.length > 0) || (canKargoArsiv && kargoArsivlenenler.length > 0) || (canKalipArsiv && kalipArsivlenenler.length > 0)) && (
                  <div style={{ marginTop: kartlar.length ? 4 : 0 }}>
                    <button type="button" onClick={() => setArsivAcik(a => !a)}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "var(--n500, #64748b)", background: "none", border: "none", cursor: "pointer", padding: "6px 2px" }}>
                      <span>🗄</span>
                      <span>Arşivlenenler ({(arsivGorebilir ? arsivlenenler.length : 0) + (canKargoArsiv ? kargoArsivlenenler.length : 0) + (canKalipArsiv ? kalipArsivlenenler.length : 0)})</span>
                      <span style={{ marginLeft: "auto", fontSize: 11 }}>{arsivAcik ? "gizle ▲" : "göster ▼"}</span>
                    </button>
                    {arsivAcik && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 4 }}>
                        {arsivGorebilir && arsivlenenler.map(sv => Kart({ sv, arsiv: true, key: sv.id }))}
                        {canKargoArsiv && kargoArsivlenenler.map(s => <KargoKart key={"k" + s.id} s={s} dealers={dealers} parts={parts} customers={customers} calisanlar={calisanlar} canKargo={canKargoDuzenle} arsiv onClick={setKargoDetayId} onGeriAl={() => kargoPanoGizle(s.id, false)} />)}
                        {canKalipArsiv && kalipArsivlenenler.map(s => <KargoKart key={"kl" + s.id} s={s} tur="kalip" customers={customers} calisanlar={calisanlar} canKargo={canKalipDuzenle} arsiv onClick={setKalipDetayId} onGeriAl={() => kalipPanoGizle(s.id, false)} />)}
                        {arsivGorebilir && arsivlenenler.length > 0 && canDo("cust_service_pano_kaldir") && (
                          <button type="button" onClick={() => setArsivTemizleOnay(true)}
                            style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: "var(--red600, #dc2626)", background: "none", border: "1px solid var(--redBr, #fecaca)", borderRadius: 8, cursor: "pointer", padding: "6px 10px" }}>
                            🗑 Arşivi Temizle (servisler)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Kargo kartı detayı — kargo bilgisi düzenleme + makinaya tahsis (Stok yetkisi gerektirir) */}
      {kargoDetay && (kargoLock ? (
        <Modal title="Kargo Detayı" onClose={() => setKargoDetayId(null)}>
          <LockConflict lockedBy={kargoLock.lockedBy} lockedAt={kargoLock.lockedAt} onForce={forceKargoLock} onCancel={() => setKargoDetayId(null)} />
        </Modal>
      ) : (
        <KargoDetayModal grup={kargoDetay} setYedekParcaSatislar={setYedekParcaSatislar}
          dealers={dealers} parts={parts} customers={customers} factory={factory} canKargo={canKargoDuzenle}
          onClose={() => setKargoDetayId(null)} showToast={showToast} serverPermissions={serverPermissions} />
      ))}

      {/* Extra Kalıp kargo detayı — kargo bilgisi düzenleme (tahsis yok) */}
      {kalipDetay && (kalipLock ? (
        <Modal title="Kalıp Kargo Detayı" onClose={() => setKalipDetayId(null)}>
          <LockConflict lockedBy={kalipLock.lockedBy} lockedAt={kalipLock.lockedAt} onForce={forceKalipLock} onCancel={() => setKalipDetayId(null)} />
        </Modal>
      ) : (
        <KargoDetayModal grup={kalipDetay} tur="kalip" setPartSales={setPartSales} parts={parts}
          customers={customers} factory={factory} canKargo={canKalipDuzenle}
          onClose={() => setKalipDetayId(null)} showToast={showToast} serverPermissions={serverPermissions} />
      ))}

      {/* Panodan yeni yedek parça satışı (Yeni Servis Talebi düğmesinin yanından) */}
      {ypForm && (
        <YedekParcaSatisForm title="Yeni Yedek Parça Satışı" form={ypForm} setForm={setYpForm}
          dealers={dealers} customers={customers} parts={parts} partStock={partStock} calisanlar={calisanlar} kdvRates={kdvRates}
          geoData={geoData} loadingGeo={loadingGeo}
          onSave={saveYedekParca} onCancel={() => setYpForm(null)} />
      )}

      {/* Yeni / Düzenle servis — müşteri kartındaki servis formunun BİREBİR AYNISI (tam ServiceForm) */}
      {svModal && (svLock ? (
        // Düzenlenen servisin müşterisini başkası düzenliyor: formu açma, kilit uyarısı göster.
        <Modal wide title="Servis Talebini Düzenle" onClose={() => setSvModal(null)}>
          <LockConflict lockedBy={svLock.lockedBy} lockedAt={svLock.lockedAt}
            onForce={forceSvLock} onCancel={() => setSvModal(null)} />
        </Modal>
      ) : (
        <ServiceForm
          title={svModal === "add" ? "Yeni Servis Talebi" : "Servis Talebini Düzenle"}
          form={form} setForm={setForm} customers={customers} parts={parts} dealers={dealers} factory={factory} kdvRates={kdvRates}
          geoData={geoData} loadingGeo={loadingGeo} calisanlar={calisanlar}
          onSave={kaydet} onCancel={() => setSvModal(null)}
          dosyalar={dosyalar} dosyaEkleyebilir={!!setDosyalar && canDo("cust_dosya_add")} dosyaCevrimdisi={dosyaCevrimdisi} showToast={showToast}
        />
      ))}

      {/* Per-servis süre analizi — o kartın kendi zaman çizelgesi ve süreleri */}
      {analizSv && (() => {
        const s = servisSureleri(analizSv, nowIso, cs);
        const c = custMap[Number(analizSv.customerId)] || {};
        const adim = (ikon, ad, zaman, renk) => (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0" }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: zaman ? renk : "var(--n150, #f1f5f9)", color: zaman ? "#fff" : "var(--n400, #94a3b8)", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name={ikon} size={14} /></span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--n700, #334155)", flex: 1 }}>{ad}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: zaman ? "var(--n900, #0f172a)" : "var(--n400, #94a3b8)", fontVariantNumeric: "tabular-nums" }}>{zaman ? fmtZaman(zaman) : "—"}</span>
          </div>
        );
        const sureKart = (etiket, dk, renk, canli, altNot = null, bicim = sureBicim) => (
          <div style={{ flex: 1, minWidth: 96, background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "var(--n500, #64748b)", marginBottom: 3 }}>{etiket}{canli ? " (devam)" : ""}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: renk, fontVariantNumeric: "tabular-nums" }}>{bicim(dk)}</div>
            {altNot && <div style={{ fontSize: 10, color: "var(--n400, #94a3b8)", marginTop: 2 }}>{altNot}</div>}
          </div>
        );
        return (
          <Modal title="Servis Süre Analizi" onClose={() => setAnalizSv(null)}>
            <div style={{ fontSize: 13, color: "var(--n600, #475569)", marginBottom: 4, fontWeight: 700 }}>{c.name || "(müşteri yok)"}</div>
            <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginBottom: 14 }}>
              {c.model || "Model yok"}{c.serialNo ? ` · S/N ${c.serialNo}` : ""} · {analizSv.type}{analizSv.tech ? ` · ${analizSv.tech}` : ""}
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              {sureKart("Bekleme", s.beklemeDk, "var(--amb600, #d97706)", false)}
              {sureKart("İşçilik", s.isclikDk, "var(--blu600, #2563eb)", s.devamEdiyor,
                s.isclikHamDk != null && s.isclikHamDk !== s.isclikDk ? `mesai içi · ham ${sureBicimSaat(s.isclikHamDk)}` : "mesai içi", sureBicimSaat)}
              {sureKart("Toplam", s.toplamDk, "var(--n800, #1e293b)", s.devamEdiyor && !s.bitis)}
            </div>
            <div style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 12, padding: "4px 14px" }}>
              {adim("download", "Fabrikaya Giriş", s.giris, "var(--amb600, #d97706)")}
              <div style={{ borderTop: "1px solid var(--n150, #f1f5f9)" }} />
              {adim("service", "Bakım Onarım Başladı", s.baslangic, "var(--blu600, #2563eb)")}
              <div style={{ borderTop: "1px solid var(--n150, #f1f5f9)" }} />
              {adim("check", "Tamamlandı", s.bitis, "var(--grn600, #16a34a)")}
            </div>
            {s.devamEdiyor && <div style={{ fontSize: 11.5, color: "var(--blu600, #2563eb)", marginTop: 10, textAlign: "center" }}>İşçilik süresi canlı olarak sayılıyor…</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <Btn variant="ghost" onClick={() => setAnalizSv(null)}>Kapat</Btn>
            </div>
          </Modal>
        );
      })()}

      {arsivTemizleOnay && (
        <ConfirmDialog
          title="Arşivi Temizle"
          confirmLabel="Evet, Temizle"
          message={`${arsivlenenler.length} arşivlenen servis panodan tamamen kaldırılacak. Servis kayıtları ve zaman bilgileri müşteri kartında/geçmişinde kalır; yalnız Servis Panosu arşivinden çıkar.`}
          onConfirm={arsivTemizle}
          onCancel={() => setArsivTemizleOnay(false)}
        />
      )}
    </div>
  );
};
