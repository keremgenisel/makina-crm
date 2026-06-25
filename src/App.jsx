import { useState, useEffect, useRef, useMemo } from "react";
import LOGO from "./assets/logo.avif?inline";
import {
  APP_VERSION, DEFAULT_KDV_RATES, BACKUP_APP_TAG, BACKUP_SCHEMA_VERSION,
  ALTUNMAK_MODELS, INIT_CUSTOMERS, INIT_DEALERS, INIT_SERVICES, INIT_STOCK, INIT_KALIPLAR,
} from "./lib/constants";
import { today, setIdCounter, getIdCounter, uid, bumpId, parseMoney, calcCiro, calcKalanBorc, normalizeKdvRates, safeStandardModels, purgeOldTrash } from "./lib/utils";
import { Icon } from "./components/ui";
import { LockScreen } from "./components/LockScreen";
import { Dashboard } from "./components/Dashboard";
import { Customers } from "./components/Customers";
import { SimpleDealers } from "./components/SimpleDealers";
import { Stock } from "./components/Stock";
import { Finance } from "./components/Finance";
import { Notes } from "./components/Notes";
import { Settings } from "./components/Settings";

const TABS = [
  { id: "dashboard", label: "Anasayfa",     icon: "dashboard" },
  { id: "customers", label: "Müşteriler",   icon: "customers" },
  { id: "dealers",   label: "Bayiler",      icon: "store"     },
  { id: "stock",     label: "Stok",         icon: "box"       },
  { id: "finance",   label: "Finans",       icon: "finance"   },
  { id: "notes",     label: "Notlar",       icon: "notes"     },
  { id: "settings",  label: "Ayarlar",      icon: "settings"  },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const notesRef = useRef(null); // Notlar'da kaydedilmemiş taslak varken başka sekmeye geçişi onaya bağlamak için
  const [custFilter, setCustFilter] = useState("all"); // dashboard'dan filtreyle gelme: all|warranty|warranty-active|debt|serial-pending
  const [custDetailId, setCustDetailId] = useState(null); // dashboard'dan belirli bir müşterinin detayını açarak gelme
  const [dealerFilter, setDealerFilter] = useState("all"); // dashboard'dan filtreyle gelme: all|borclu
  const [appVersion, setAppVersion] = useState(APP_VERSION);
  const [appSettings, setAppSettings] = useState({ autoBackup: false, backupFolder: "", frequency: "weekly", lastBackup: null, kdvRates: DEFAULT_KDV_RATES });
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  // ── Uygulama şifresi (açılış kilidi) — isteğe bağlı, Ayarlar'dan açılır. Veri yüklemesinden
  // bağımsız çalışır, sadece bir UI kapısı. null = durum henüz kontrol edilmedi (kısa an için
  // boş ekran, kilitli/kilitsiz arasında flicker olmasın diye).
  const [unlocked, setUnlocked] = useState(null);
  useEffect(() => {
    if (!window.appLock) { setUnlocked(true); return; }
    window.appLock.status().then(s => setUnlocked(!s?.enabled)).catch(() => setUnlocked(true));
  }, []);

  // ── Global bildirim (toast) ──
  const [toast, setToast] = useState(null); // { type: "ok"|"err", text }
  const showToast = (text, type = "ok") => {
    setToast({ type, text });
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => setToast(null), 3000);
  };

  // Sürümü kurulu uygulamadan oku (package.json'daki version otomatik yansır)
  useEffect(() => {
    if (window.appUpdater?.version) {
      window.appUpdater.version().then(v => { if (v) setAppVersion(v); }).catch(() => {});
    }
  }, []);
  const [customers, setCustomers] = useState(INIT_CUSTOMERS);
  const [dealers,   setDealers]   = useState(INIT_DEALERS);
  const [standardModels, setStandardModels] = useState(ALTUNMAK_MODELS); // düzenlenebilir standart modeller
  const [customModels, setCustomModels] = useState([]); // Ayarlar'dan eklenen modeller (nesne listesi)
  const liveCustomModels = useMemo(() => customModels.filter(m => !m.deletedAt), [customModels]);
  const allModels = [...standardModels, ...liveCustomModels];
  const [factory, setFactory] = useState({ name: "Altuntaş Makina", contact: "", phone: "", email: "", adres: "", country: "Türkiye", city: "", note: "Ana üretici" });

  // ── Ülke & şehir verisi: tek noktadan çekilir, tüm formlara dağıtılır ──
  const [geoData, setGeoData] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoadingGeo(true);
    fetch("https://countriesnow.space/api/v0.1/countries")
      .then(r => r.json())
      .then(res => {
        if (cancelled) return;
        const map = {};
        (res?.data || []).forEach(item => {
          const name = item.country === "Turkey" ? "Türkiye" : item.country;
          map[name] = (item.cities || []).sort();
        });
        if (Object.keys(map).length > 0) setGeoData(map);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingGeo(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Döviz kurları (ücretsiz API) — tek noktadan çekilir, Dashboard ve Finans'a props ile dağıtılır ──
  const [rates, setRates] = useState(null); // { usd, eur } → 1 birim kaç TL
  const [ratesErr, setRatesErr] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const fetchRates = async () => {
      try {
        const r = await fetch("https://open.er-api.com/v6/latest/USD");
        const j = await r.json();
        if (cancelled) return;
        if (j && j.rates && j.rates.TRY) {
          const usdTry = j.rates.TRY;
          const eurTry = j.rates.EUR ? (j.rates.TRY / j.rates.EUR) : null;
          setRates({ usd: usdTry, eur: eurTry });
          setRatesErr(false);
        } else { setRatesErr(true); }
      } catch { if (!cancelled) setRatesErr(true); }
    };
    fetchRates();
    const t = setInterval(fetchRates, 60 * 60 * 1000); // 1 saatte bir güncelle
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const [services,  setServices]  = useState(INIT_SERVICES);
  const [stock,     setStock]     = useState(INIT_STOCK);
  const [notes,     setNotes]     = useState([]); // serbest notlar [{id, content, updatedAt}]
  const [parts,     setParts]     = useState([]); // yedek parça tanım kataloğu (Servis ve Yedek Parça → Değişen Parçalar seçimi için) [{id, ad}]
  const [partSales, setPartSales] = useState([]); // Extra Kalıp sekmesinde verilen/satılan kalıplar [{id, customerId, ad, olcu, tarih, ucret, currency, odendi}]
  const [payments,  setPayments]  = useState([]); // Kapora/Ödeme geçmişi [{id, customerId, tarih, tutar, currency, not}]
  const [kalipDefs, setKalipDefs] = useState(INIT_KALIPLAR);

  // ── Çöp Kutusu: her dizinin deletedAt'i olmayan ("canlı") kopyası — özellik bileşenleri
  // (Dashboard, Customers, SimpleDealers, Stock, Finance, Notes) hep bunları görür, soft-delete
  // edilmiş kayıtlar bu bileşenlere hiç ulaşmaz. Ayarlar'daki Çöp Kutusu bölümü ise ham (raw)
  // dizilerin kendisini kullanır — bkz. render'daki Settings çağrısı.
  const liveCustomers = useMemo(() => customers.filter(c => !c.deletedAt), [customers]);
  const liveDealers = useMemo(() => dealers.filter(d => !d.deletedAt), [dealers]);
  const liveServices = useMemo(() => services.filter(s => !s.deletedAt), [services]);
  const liveStock = useMemo(() => stock.filter(s => !s.deletedAt), [stock]);
  const liveNotes = useMemo(() => notes.filter(n => !n.deletedAt), [notes]);
  const liveParts = useMemo(() => parts.filter(p => !p.deletedAt), [parts]);
  const livePartSales = useMemo(() => partSales.filter(p => !p.deletedAt), [partSales]);
  const livePayments = useMemo(() => payments.filter(p => !p.deletedAt), [payments]);
  const liveKalipDefs = useMemo(() => kalipDefs.filter(k => !k.deletedAt), [kalipDefs]);

  useEffect(() => {
    const load = async () => {
      try {
        if (window.crmStorage) {
          const data = await window.crmStorage.load();
          if (data) {
            // Çöp Kutusu: retention süresinden eski deletedAt'li kayıtlar yüklenirken kalıcı olarak süzülür
            if (Array.isArray(data.customers)) data.customers = purgeOldTrash(data.customers);
            if (Array.isArray(data.payments)) data.payments = purgeOldTrash(data.payments);
            if (Array.isArray(data.dealers)) data.dealers = purgeOldTrash(data.dealers);
            if (Array.isArray(data.stock)) data.stock = purgeOldTrash(data.stock);
            if (Array.isArray(data.kalipDefs)) data.kalipDefs = purgeOldTrash(data.kalipDefs);
            if (Array.isArray(data.customModels)) data.customModels = purgeOldTrash(data.customModels);
            if (Array.isArray(data.services)) data.services = purgeOldTrash(data.services);
            if (Array.isArray(data.notes)) data.notes = purgeOldTrash(data.notes);
            if (Array.isArray(data.parts)) data.parts = purgeOldTrash(data.parts);
            if (Array.isArray(data.partSales)) data.partSales = purgeOldTrash(data.partSales);
            // KDV oranı artık tek bir sayı değil, tarihe bağlı dönemler listesi — eski tekil
            // appSettings.kdvRate'den göç edilir. Aşağıdaki Kalan Borç hesapları (hem eski veri
            // göçü hem de normal yükleme) bu dönemlerle, kaydın KENDİ tarihine göre yapılır; bu
            // sayede oran değişikliği geçmiş kayıtlara da geriye dönük doğru şekilde yansır.
            const kdvRates = normalizeKdvRates(data.appSettings);
            if (Array.isArray(data.customers)) {
              if (Array.isArray(data.payments)) {
                // NOT: Burada artık TÜM müşterilerin Kalan Borç'unu calcKalanBorc ile yeniden
                // hesaplamıyoruz — bu, KDV dönemleri eklenmeden önce (eski sabit %20 oranıyla)
                // girilmiş ödeme kayıtlarıyla çakışıp, dokunulmamış (zaten "ödendi" sayılmış)
                // kayıtlarda her açılışta sürpriz negatif "fazla ödeme" bakiyeleri üretiyordu.
                // Kalan Borç artık sadece o müşteri elle düzenlenince veya ödeme eklenince/
                // silinince yeniden hesaplanır (bkz. Customers.jsx). Burada sadece kayıtlı
                // değerdeki kuruş artıkları temizlenir ve negatife düşmüşse 0'a çekilir.
                setCustomers(data.customers.map(c => ({ ...c, kalanBorc: Math.max(0, Math.round(parseMoney(c.kalanBorc))) })));
                setPayments(data.payments);
              } else {
                // Eski veri (payments alanı hiç yok) — önceki manuel "Kalan Borç" değerini referans
                // alıp, o değere göre "zaten ödenmiş" sayılan tutarı tek bir geçmiş ödeme kaydına
                // dönüştürür. (extraKalipFiyati'na göre migrate etmek eski kalanBorc'u görmezden
                // gelip herkesi "hiç ödenmemiş" sayardı — borcu yanlışlıkla tam Ciro'ya şişirirdi.)
                bumpId(data.customers);
                const migratedPayments = [];
                data.customers.forEach(c => {
                  const ciro = calcCiro(c, kdvRates);
                  const zatenOdenen = Math.max(ciro - parseMoney(c.kalanBorc), 0);
                  if (zatenOdenen > 0) {
                    migratedPayments.push({ id: uid(), customerId: c.id, tarih: c.installDate || today(), tutar: zatenOdenen, currency: c.currency || "TRY", not: "Geçmiş ödeme (otomatik migrasyon)" });
                  }
                });
                setCustomers(data.customers.map(c => ({ ...c, kalanBorc: calcKalanBorc(c, migratedPayments, kdvRates) })));
                setPayments(migratedPayments);
              }
            } else if (Array.isArray(data.payments)) {
              setPayments(data.payments);
            }
            if (Array.isArray(data.dealers)) setDealers(data.dealers);
            if (Array.isArray(data.stock)) setStock(data.stock);
            if (Array.isArray(data.kalipDefs)) setKalipDefs(data.kalipDefs);
            setStandardModels(safeStandardModels(data.standardModels));
            if (Array.isArray(data.customModels)) setCustomModels(data.customModels);
            if (data.factory) setFactory(f => ({ ...f, ...data.factory }));
            if (Array.isArray(data.services)) setServices(data.services);
            if (Array.isArray(data.notes)) setNotes(data.notes);
            if (Array.isArray(data.parts)) setParts(data.parts);
            if (Array.isArray(data.partSales)) setPartSales(data.partSales);
            setAppSettings(s => ({ ...s, ...data.appSettings, kdvRates }));
            if (typeof data.nextId === "number") setIdCounter(data.nextId);
          }
        }
      } catch (err) { console.error(err); } finally { setLoaded(true); }
    };
    load();
  }, []);

  useEffect(() => {
    if (!loaded || !window.crmStorage) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      window.crmStorage.save({ customers, dealers, stock, kalipDefs, standardModels, customModels, factory, services, notes, parts, partSales, payments, appSettings, nextId: getIdCounter() });
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [customers, dealers, stock, kalipDefs, standardModels, customModels, factory, services, notes, parts, partSales, payments, appSettings, loaded]);

  // ── Otomatik yedekleme: açılışta ve ayar değişince vakti geldiyse yedek yaz ──
  useEffect(() => {
    const s = appSettings;
    if (!s?.autoBackup || !s.backupFolder || !window.crmStorage?.writeBackup) return;
    const isDue = () => {
      if (!s.lastBackup) return true;
      const days = (new Date() - new Date(s.lastBackup)) / 86400000;
      if (s.frequency === "daily") return days >= 1;
      if (s.frequency === "weekly") return days >= 7;
      return days >= 30; // monthly
    };
    if (isDue()) {
      window.crmStorage
        .writeBackup(s.backupFolder, { app: BACKUP_APP_TAG, schemaVersion: BACKUP_SCHEMA_VERSION, version: appVersion, exportDate: today(), customers, services, dealers, stock, customModels, standardModels, factory, kalipDefs })
        .then(ok => { if (ok) setAppSettings(p => ({ ...p, lastBackup: today() })); })
        .catch(() => {});
    }
  }, [appSettings.autoBackup, appSettings.backupFolder, appSettings.frequency]);

  if (unlocked === null) return null; // durum kontrol edilirken kısa an boş ekran (flicker önleme)
  if (!unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background: "#f1f5f9" }}>
      {/* Global bildirim (toast) */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 99999,
          background: toast.type === "err" ? "#dc2626" : "#16a34a", color: "#fff",
          padding: "13px 26px", borderRadius: 10, fontSize: 14, fontWeight: 700,
          boxShadow: "0 6px 24px rgba(0,0,0,.22)", display: "flex", alignItems: "center", gap: 10,
          animation: "toastIn .25s ease",
        }}>
          <span style={{ fontSize: 16 }}>{toast.type === "err" ? "⚠" : "✓"}</span>
          {toast.text}
        </div>
      )}
      <style>{`@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
      {/* Sidebar */}
      <style>{`
        .nav-btn { transition: all .18s ease; }
        .nav-btn:hover { background: rgba(232,93,26,.10) !important; color: #f0b690 !important; }
        .nav-btn:hover .nav-ico { background: rgba(232,93,26,.18) !important; color: #f0b690 !important; }
      `}</style>
      <div style={{
        width: 236,
        background: "linear-gradient(180deg, #160900 0%, #1f0d02 55%, #281104 100%)",
        display: "flex", flexDirection: "column", flexShrink: 0,
        borderRight: "1px solid rgba(232,93,26,.16)",
        boxShadow: "6px 0 28px rgba(0,0,0,.30)",
        position: "relative",
      }}>
        {/* Üst ışık çizgisi */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #e85d1a, transparent)", opacity: .7 }} />

        {/* Logo alanı */}
        <div style={{ padding: "26px 18px 20px", borderBottom: "1px solid rgba(232,93,26,.12)" }}>
          <div style={{
            background: "linear-gradient(180deg, #ffffff, #f6f1ec)",
            borderRadius: 12, padding: "12px 16px",
            display: "flex", justifyContent: "center",
            boxShadow: "0 8px 28px rgba(0,0,0,.40), inset 0 1px 0 rgba(255,255,255,.95)",
          }}>
            <img src={LOGO} alt="Altuntaş Makina" style={{ width: "100%", maxHeight: 42, objectFit: "contain" }} />
          </div>
          <div style={{ fontSize: 10, color: "#bd8257", marginTop: 13, textAlign: "center", letterSpacing: 3.5, textTransform: "uppercase", fontWeight: 700 }}>
            CRM Sistemi
          </div>
        </div>

        {/* Menü */}
        <nav style={{ padding: "16px 12px", flex: 1, overflowY: "auto" }}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} className="nav-btn" onClick={() => {
                const go = () => { if (t.id === "customers") { setCustFilter("all"); setCustDetailId(null); } if (t.id === "dealers") setDealerFilter("all"); setTab(t.id); };
                if (tab === "notes" && t.id !== "notes" && notesRef.current) notesRef.current.guardNavigation(go);
                else go();
              }} style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px",
                background: active ? "linear-gradient(90deg, rgba(232,93,26,.26), rgba(232,93,26,.04))" : "transparent",
                border: "none",
                borderLeft: active ? "3px solid #e85d1a" : "3px solid transparent",
                borderRadius: 10, cursor: "pointer",
                color: active ? "#ff9d5c" : "#a3846f",
                fontWeight: active ? 700 : 500, fontSize: 13.5, marginBottom: 5, textAlign: "left",
                boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,.06)" : "none",
              }}>
                <span className="nav-ico" style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 30, height: 30, borderRadius: 8, transition: "all .18s ease",
                  background: active ? "rgba(232,93,26,.24)" : "rgba(255,255,255,.045)",
                  color: active ? "#ff9d5c" : "#8d6f5c",
                }}>
                  <Icon name={t.icon} size={15} />
                </span>
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Alt bilgi */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(232,93,26,.12)", fontSize: 11, color: "#7d614e", textAlign: "center", letterSpacing: .6 }}>
          {`altunmak.com · v${appVersion}`}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
        {tab === "dashboard" && <Dashboard customers={liveCustomers} dealers={liveDealers} services={liveServices} stock={liveStock} partSales={livePartSales} payments={livePayments} rates={rates} ratesErr={ratesErr} factory={factory} onGoStock={() => setTab("stock")} onGoCustomers={() => { setCustFilter("all"); setCustDetailId(null); setTab("customers"); }} onGoDealers={() => { setDealerFilter("all"); setTab("dealers"); }} onGoDealerDebtors={() => { setDealerFilter("borclu"); setTab("dealers"); }} onGoExpired={() => { setCustFilter("warranty"); setCustDetailId(null); setTab("customers"); }} onGoDebtors={() => { setCustFilter("debt"); setCustDetailId(null); setTab("customers"); }} onGoCustomerDetail={(id) => { setCustFilter("all"); setCustDetailId(id); setTab("customers"); }} onGoWarrantyActive={() => { setCustFilter("warranty-active"); setCustDetailId(null); setTab("customers"); }} onGoSerialPending={() => { setCustFilter("serial-pending"); setCustDetailId(null); setTab("customers"); }} />}
        {tab === "customers" && <Customers customers={liveCustomers} setCustomers={setCustomers} services={liveServices} setServices={setServices} dealers={liveDealers} models={allModels} factory={factory} geoData={geoData} loadingGeo={loadingGeo} stock={liveStock} setStock={setStock} partSales={livePartSales} setPartSales={setPartSales} parts={liveParts} payments={livePayments} setPayments={setPayments} initialFilter={custFilter} initialDetailId={custDetailId} kalipDefs={liveKalipDefs} showToast={showToast} kdvRates={appSettings.kdvRates} />}
        {tab === "dealers" && <SimpleDealers dealers={liveDealers} setDealers={setDealers} factory={factory} setFactory={setFactory} geoData={geoData} loadingGeo={loadingGeo} services={liveServices} customers={liveCustomers} setServices={setServices} setCustomers={setCustomers} kdvRates={appSettings.kdvRates} initialFilter={dealerFilter} onGoCustomerDetail={(id) => { setCustFilter("all"); setCustDetailId(id); setTab("customers"); }} showToast={showToast} />}
        {tab === "stock"     && <Stock stock={liveStock} setStock={setStock} models={allModels} showToast={showToast} />}
        {tab === "finance"   && <Finance   customers={liveCustomers} services={liveServices} dealers={liveDealers} partSales={livePartSales} factory={factory} kdvRates={appSettings.kdvRates} rates={rates} />}
        {tab === "notes"     && <Notes ref={notesRef} notes={liveNotes} setNotes={setNotes} showToast={showToast} />}
        {tab === "settings"  && <Settings  customers={liveCustomers} services={liveServices} dealers={liveDealers} stock={liveStock} setStock={setStock} setCustomers={setCustomers} setServices={setServices} setDealers={setDealers} version={appVersion} appSettings={appSettings} setAppSettings={setAppSettings} customModels={liveCustomModels} setCustomModels={setCustomModels} standardModels={standardModels} setStandardModels={setStandardModels} factory={factory} setFactory={setFactory} kalipDefs={liveKalipDefs} setKalipDefs={setKalipDefs} notes={liveNotes} setNotes={setNotes} parts={liveParts} setParts={setParts} partSales={livePartSales} setPartSales={setPartSales} payments={livePayments} setPayments={setPayments} showToast={showToast} rawCustomers={customers} rawServices={services} rawDealers={dealers} rawStock={stock} rawNotes={notes} rawParts={parts} rawPartSales={partSales} rawPayments={payments} rawKalipDefs={kalipDefs} rawCustomModels={customModels} />}
      </div>
    </div>
  );
}
