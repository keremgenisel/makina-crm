import { useState, useEffect, useRef, useMemo } from "react";
import LOGO from "./assets/logo.avif?inline";
import {
  APP_VERSION, DEFAULT_KDV_RATES, BACKUP_APP_TAG, BACKUP_SCHEMA_VERSION,
  ALTUNMAK_MODELS, INIT_CUSTOMERS, INIT_DEALERS, INIT_SERVICES, INIT_STOCK, INIT_KALIPLAR,
} from "./lib/constants";
import { today, setIdCounter, getIdCounter, uid, bumpId, clearMintedIds, parseMoney, calcCiro, calcKalanBorc, normalizeKdvRates, safeStandardModels, purgeOldTrash, withoutDeleted, isTailscaleServerUrl, serverKonumEtiketi } from "./lib/utils";
import { buildMergePlan } from "./lib/merge";
import { setAuditUsername } from "./lib/audit";
import { READONLY_SERVER_PERMISSIONS } from "./lib/permissions";
import { Icon } from "./components/ui";
import { LockScreen } from "./components/LockScreen";
import { ServerLogin } from "./components/ServerLogin";
import { Dashboard } from "./components/Dashboard";
import { Customers } from "./components/Customers";
import { SimpleDealers } from "./components/SimpleDealers";
import { Stock } from "./components/Stock";
import { Finance } from "./components/Finance";
import { Notes } from "./components/Notes";
import { Settings } from "./components/Settings";
import { Documents } from "./components/Documents";
import { GlobalSearch } from "./components/GlobalSearch";

const TABS = [
  { id: "dashboard", label: "Anasayfa",     icon: "dashboard" },
  { id: "customers", label: "Müşteriler",   icon: "customers" },
  { id: "dealers",   label: "Bayiler",      icon: "store"     },
  { id: "stock",     label: "Stok",         icon: "box"       },
  { id: "finance",   label: "Finans",       icon: "finance"   },
  { id: "evrak",     label: "Evrak Yönetimi", icon: "evrak"   },
  { id: "notes",     label: "Notlar",       icon: "notes"     },
  { id: "settings",  label: "Ayarlar",      icon: "settings"  },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const notesRef = useRef(null); // Notlar'da kaydedilmemiş taslak varken başka sekmeye geçişi onaya bağlamak için
  const [custFilter, setCustFilter] = useState("all"); // dashboard'dan filtreyle gelme: all|warranty|warranty-active|debt|serial-pending
  const [custDetailId, setCustDetailId] = useState(null); // dashboard'dan belirli bir müşterinin detayını açarak gelme
  const [custReturnTab, setCustReturnTab] = useState(null); // detay kapanınca geri dönülecek sekme
  const [custNewPrefill, setCustNewPrefill] = useState(null); // teklif→müşteri dönüşümü: yeni müşteri formu önceden doldurulur
  const [docOpenId, setDocOpenId] = useState(null); // genel arama / teklif takibi: Evrak sekmesinde belirli belgeyi aç
  const [dealerOpenId, setDealerOpenId] = useState(null); // genel arama: Bayiler sekmesinde belirli bayinin detayını aç
  const [dealerFilter, setDealerFilter] = useState("all"); // dashboard'dan filtreyle gelme: all|borclu
  const [stockDefaultSubTab, setStockDefaultSubTab] = useState("makina"); // dashboard'dan üretim sekmesine yönlendirme
  const [savedServerUrl, setSavedServerUrl] = useState(""); // giriş ekranı için önceki sunucu adresi
  const [savedUsername, setSavedUsername] = useState(""); // giriş ekranı için önceki kullanıcı adı
  const [appVersion, setAppVersion] = useState(APP_VERSION);
  const [appSettings, setAppSettings] = useState({ autoBackup: false, backupFolder: "", frequency: "weekly", lastBackup: null, kdvRates: DEFAULT_KDV_RATES, pinnedPartIds: [] });
  const [loaded, setLoaded] = useState(false);
  const [saveTrigger, setSaveTrigger] = useState(0); // load sırasında yerel değer sunucuyu ezdiyse save effect'i yeniden tetikler
  const postLoadNeedsSaveRef = useRef(false); // yükleme, sunucudan farklı yerel veri korudu mu
  const saveTimer = useRef(null);
  const suppressSaveRef = useRef(false); // reload sırasında debounced save'in tetiklenmesini engeller
  const lastAttemptedSaveRef = useRef(null); // çakışmada yerel değişiklikleri birleştirmek için son save datası
  const [serverOnline, setServerOnline] = useState(true);
  const serverOnlineRef = useRef(true); // polling effect closure'ında stale state'den kaçınmak için
  const failedSaveRef = useRef(null);   // sunucu kpalıyken başarısız olan son save datası

  // ── Uygulama şifresi (açılış kilidi) — isteğe bağlı, Ayarlar'dan açılır. Veri yüklemesinden
  // bağımsız çalışır, sadece bir UI kapısı. null = durum henüz kontrol edilmedi (kısa an için
  // boş ekran, kilitli/kilitsiz arasında flicker olmasın diye).
  const [unlocked, setUnlocked] = useState(null);
  useEffect(() => {
    if (!window.appLock) { setUnlocked(true); return; }
    window.appLock.status().then(s => {
      if (!s?.enabled) { setUnlocked(true); return; }
      // lockOnClose=false ise kapatılıp açılınca kilit sorulmaz, sadece hareketsizlik kilidi çalışır
      setUnlocked(s.lockOnClose === false);
    }).catch(() => setUnlocked(true));
  }, []);

  // ── Hareketsizlik sonrası otomatik kilit ──
  useEffect(() => {
    const minutes = appSettings?.autoLockMinutes;
    if (!unlocked || !minutes || !window.appLock) return;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const s = await window.appLock.status().catch(() => null);
        if (s?.enabled) setUnlocked(false);
      }, minutes * 60 * 1000);
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "wheel", "scroll"];
    events.forEach(ev => document.addEventListener(ev, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach(ev => document.removeEventListener(ev, reset));
    };
  }, [unlocked, appSettings?.autoLockMinutes]);

  // ── Sunucu modu: null=kontrol bekleniyor | "none"=yerel mod | "login"=giriş gerekli | "active"=giriş yapıldı ──
  const [serverMode, setServerMode] = useState(null);
  const [serverPermissions, setServerPermissions] = useState(null); // { role, permissions (JSON string | null) }

  // ── Salt okunur mod: istemci sunucuya ulaşamıyorsa (evde/bağlantı koptu) düzenleme kilitlenir ──
  // Veri önbellekten veya son yüklemeden görüntülenmeye devam eder; bağlantı dönünce kendiliğinden açılır.
  const readOnly = serverMode === "active" && !serverOnline;
  // İstemci sunucuya Tailscale (100.x) adresi üzerinden mi bağlı? Menüde göstermek için.
  const serverViaTailscale = isTailscaleServerUrl(savedServerUrl);
  // Tailscale adresiyle bağlı olsak bile sunucuyla aynı yerel ağda mıyız? (LAN yoklaması)
  const [sameLan, setSameLan] = useState(false);
  const effectivePermissions = readOnly ? READONLY_SERVER_PERMISSIONS : serverPermissions;

  // ── Tab izin filtresi: yerel mod / sunucu PC / admin → tüm tablar; user rolü → izin listesi ──
  const visibleTabs = useMemo(() => {
    if (serverMode !== "active") return TABS; // yerel mod veya sunucu PC
    if (!serverPermissions || serverPermissions.role === "admin") return TABS;
    try {
      const allowed = JSON.parse(serverPermissions.permissions || "null")?.tabs;
      if (!Array.isArray(allowed)) return TABS;
      return TABS.filter(t => allowed.includes(t.id));
    } catch { return TABS; }
  }, [serverMode, serverPermissions]);
  // Yetki dışı sekmeye HER geçişi geri çevir: menüde gizlemek yetmez, tab state'i
  // genel arama ve anasayfa kısayolları gibi yerlerden de set ediliyor. Render daima
  // activeTab üzerinden yapılır, izinsiz hedefe tek kare bile içerik çizilmez.
  const activeTab = visibleTabs.find(t => t.id === tab) ? tab : (visibleTabs[0]?.id || "dashboard");
  useEffect(() => {
    if (tab !== activeTab) setTab(activeTab);
  }, [tab, activeTab]);
  const dataVersionRef = useRef(null);
  const loadFromStorageRef = useRef(null);
  useEffect(() => {
    if (!window.appServer) { setServerMode("none"); return; }
    window.appServer.getConfig().then(cfg => {
      if (cfg?.username) { setAuditUsername(cfg.username); setSavedUsername(cfg.username); }
      if (!cfg?.serverUrl) { setServerMode("none"); return; }
      setSavedServerUrl(cfg.serverUrl);
      const active = cfg.isActive ? "active" : "login";
      setServerMode(active);
      if (cfg.isActive) setServerPermissions({ role: cfg.role, permissions: cfg.permissions ?? null });
    }).catch(() => setServerMode("none"));
  }, []);

  // ── Yerel değişiklikleri sunucu verisinin üzerine birleştirir (çakışma/yeniden yükleme sonrası) ──
  // serverData: az önce sunucudan yüklenen blob. Karar mantığı saf ve test edilebilir
  // (src/lib/merge.js buildMergePlan); burada yalnızca plan state'e uygulanır.
  const mergeLocalIntoReloaded = (myData, serverData) => {
    const plan = buildMergePlan(myData, serverData);
    if (!plan) return;
    const { adds, maps, stockDeductIds, serialConflicts } = plan;
    for (const sc of serialConflicts) {
      showToast(`Seri no çakışması: ${sc.serialNo} başka bir müşteriye atandı. "${sc.name}" kaydı seri no bekliyor olarak eklendi.`, "warn");
    }
    const remapRef = (map, val) => (map.has(val) ? map.get(val) : val);

    // Uygula — 750ms bekleme sırasında oluşmuş yerel eklerle çarpışmamak için prev'e karşı
    // ID kontrolü korunur
    const apply = (setter, key) => {
      if (!adds[key].length) return;
      setter(prev => {
        const ids = new Set(prev.map(x => x.id));
        const toAdd = adds[key].filter(x => !ids.has(x.id));
        return toAdd.length ? [...prev, ...toAdd] : prev;
      });
    };
    apply(setCustomers, "customers");
    apply(setTeklifler, "teklifler");
    apply(setPartSales, "partSales");
    apply(setServices, "services");
    apply(setPayments, "payments");
    apply(setGorusmeler, "gorusmeler");
    apply(setUretimFormlari, "uretimFormlari");
    apply(setFaturalar, "faturalar");

    // Birleştirilen müşterilerin kaynak stok satırları düşülür — yoksa sunucudan gelen
    // stok listesi, az önce satılan makinayı tekrar "satılabilir" olarak diriltir
    if (stockDeductIds.size) setStock(prev => prev.filter(s => !stockDeductIds.has(s.id)));

    // Müşterilerde güncellenen kalıp girdileri (mevcut müşteriye yeni kalıp eklendi)
    setCustomers(prev => prev.map(c => {
      const mc = (myData.customers || []).find(x => x.id === c.id);
      if (!mc) return c;
      const eIds = new Set((c.kaliplar || []).map(k => k.partSaleId).filter(Boolean));
      const nks = (mc.kaliplar || [])
        .filter(k => k.partSaleId && !eIds.has(remapRef(maps.partSales, k.partSaleId)))
        .map(k => maps.partSales.has(k.partSaleId) ? { ...k, partSaleId: maps.partSales.get(k.partSaleId) } : k);
      if (!nks.length) return c;
      return { ...c, kaliplar: [...(c.kaliplar || []), ...nks], kalipSayisi: (c.kaliplar || []).length + nks.length };
    }));
    // satisTamam ve deletedAt tek yönlüdür: yereldeki true/silme işaretini sunucu verisi ezmesin
    // (deletedAt olmadan, kullanıcının sildiği teklif çakışma sonrası geri geliyordu)
    setTeklifler(prev => prev.map(t => {
      const mine = (myData.teklifler || []).find(x => x.id === t.id);
      if (!mine) return t;
      let out = t;
      if (mine.satisTamam && !out.satisTamam) out = { ...out, satisTamam: true };
      if (mine.deletedAt && !out.deletedAt) out = { ...out, deletedAt: mine.deletedAt };
      return out;
    }));
  };

  // ── Sunucu olayları: çakışma / oturum sona erme / versiyon güncelleme ──
  useEffect(() => {
    if (!window.appServer) return;
    const u1 = window.appServer.onVersionUpdate(v => { dataVersionRef.current = v; });
    const u2 = window.appServer.onConflict(async () => {
      showToast("Veri çakışması tespit edildi. Birleştiriliyor...", "warn");
      clearTimeout(saveTimer.current);
      const myData = lastAttemptedSaveRef.current;
      lastAttemptedSaveRef.current = null;
      const loadedBlob = await loadFromStorageRef.current?.();
      // Suppress 700ms bittikten sonra merge yap ki save effect tetiklensin
      if (myData) setTimeout(() => mergeLocalIntoReloaded(myData, loadedBlob), 750);
    });
    const u3 = window.appServer.onSessionExpired(() => {
      showToast("Oturum süresi doldu. Lütfen tekrar giriş yapın.", "err");
      setServerMode("login");
    });
    const u4 = window.appServer.onError(_msg => {
      if (serverOnlineRef.current) { serverOnlineRef.current = false; setServerOnline(false); }
    });
    const u5 = window.appServer.onDataChanged?.(async () => {
      clearTimeout(saveTimer.current);
      const myPending = pendingSave.current;
      pendingSave.current = null;
      const loadedBlob = await loadFromStorageRef.current?.();
      if (myPending) setTimeout(() => mergeLocalIntoReloaded(myPending, loadedBlob), 750);
    });
    return () => { u1?.(); u2?.(); u3?.(); u4?.(); u5?.(); };
  }, []);

  // ── Sunucu PC polling: istemci kaydetmelerini 5 saniyede yakala ──────────
  useEffect(() => {
    if (!window.appServer || !window.crmStorage?.getVersion) return;
    let isSvr = false;
    window.appServer.getConfig().then(cfg => { isSvr = !!cfg?.isServer; }).catch(() => {});
    const id = setInterval(async () => {
      if (!isSvr || suppressSaveRef.current) return;
      try {
        const v = await window.crmStorage.getVersion();
        if (typeof v === "number" && v !== dataVersionRef.current) {
          clearTimeout(saveTimer.current);
          const myPending = pendingSave.current;
          pendingSave.current = null;
          const loadedBlob = await loadFromStorageRef.current?.();
          if (myPending) setTimeout(() => mergeLocalIntoReloaded(myPending, loadedBlob), 750);
        }
      } catch (err) { console.warn("Sunucu PC versiyon kontrolü başarısız:", err?.message); }
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // ── Token otomatik yenileme: 8 saatlik JWT'nin dolmasını önlemek için 7 saatte bir ──
  useEffect(() => {
    if (serverMode !== "active" || !window.appServer?.refreshToken) return;
    const id = setInterval(() => window.appServer.refreshToken(), 7 * 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [serverMode]);

  // ── İstemci PC polling: veri sync + izin güncelleme + devre dışı bırakma + offline/online ──
  useEffect(() => {
    if (serverMode !== "active" || !window.appServer?.apiRequest) return;
    const id = setInterval(async () => {
      try {
        const result = await window.appServer.apiRequest({ method: "GET", path: "/api/version" });
        // 401 → kullanıcı pasif yapıldı veya token süresi doldu → giriş ekranına gönder
        if (result?.status === 401 || result?.error === "Oturum gerekli") {
          setServerMode("login");
          return;
        }
        if (!result?.ok) {
          if (serverOnlineRef.current) { serverOnlineRef.current = false; setServerOnline(false); }
          return;
        }
        // Sunucu tekrar erişilebilir — yeniden bağlan
        if (!serverOnlineRef.current) {
          serverOnlineRef.current = true;
          setServerOnline(true);
          if (failedSaveRef.current) {
            const retry = failedSaveRef.current;
            failedSaveRef.current = null;
            window.crmStorage.save(retry);
            showToast("Sunucu bağlantısı yeniden kuruldu — değişiklikler kaydedildi");
          } else {
            showToast("Sunucu bağlantısı yeniden kuruldu");
          }
        }
        // İzinler veya rol değiştiyse güncelle (sekme kısıtları anında yansısın)
        const { role: newRole, permissions: newPerms, dataVersion: sv } = result.data || {};
        if (newRole !== undefined) {
          setServerPermissions(p => (p?.role !== newRole || p?.permissions !== newPerms) ? { role: newRole, permissions: newPerms ?? null } : p);
        }
        // Veri versiyonu değiştiyse state'i yenile
        if (typeof sv === "number" && sv !== dataVersionRef.current) {
          clearTimeout(saveTimer.current);
          const myPending = pendingSave.current;
          pendingSave.current = null;
          const loadedBlob = await loadFromStorageRef.current?.();
          if (myPending) setTimeout(() => mergeLocalIntoReloaded(myPending, loadedBlob), 750);
        }
      } catch {
        // Network error — sunucu erişilemiyor
        if (serverOnlineRef.current) { serverOnlineRef.current = false; setServerOnline(false); }
      }
    }, 10000);
    return () => clearInterval(id);
  }, [serverMode]);

  // ── LAN yoklaması: Tailscale adresiyle bağlıyken aynı ağda mıyız? ──
  // Sunucunun LAN adresine doğrudan ulaşabiliyorsak "Yerel Ağ" göster. Sadece Tailscale
  // adresiyle bağlıyken anlamlı (LAN adresiyle bağlıysak zaten yereliz).
  useEffect(() => {
    if (serverMode !== "active" || !serverViaTailscale || !window.appServer?.checkLan) { setSameLan(false); return; }
    let alive = true;
    const check = async () => { try { const r = await window.appServer.checkLan(); if (alive) setSameLan(!!r?.onLan); } catch { /* yoksay */ } };
    check();
    const id = setInterval(check, 60000);
    return () => { alive = false; clearInterval(id); };
  }, [serverMode, serverViaTailscale, serverOnline]);

  // ── Global bildirim (toast) ──
  const [toast, setToast] = useState(null); // { type: "ok"|"err", text }
  const showToast = (text, type = "ok") => {
    setToast({ type, text });
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => setToast(null), 3000);
  };

  const handleDonusturTeklif = (t) => {
    const kaliplar = (t.satirlar || [])
      .filter(r => r.selectedKalip)
      .map(r => ({ ad: r.selectedKalip, olcu: "" }));
    const model = (t.satirlar || []).find(r => r.selectedModel)?.selectedModel || "";
    const satirToplam = (t.satirlar || []).reduce((s, r) =>
      s + (r.subItems || []).reduce((s2, item) => s2 + (parseMoney(item.birimFiyat) || 0) * (parseFloat(item.miktar) || 0), 0), 0);
    const araToplam = satirToplam - (parseMoney(t.iskonto) || 0);
    setCustNewPrefill({
      name: t.firma || "",
      yetkili1Ad: t.yetkili || "",
      yetkili1Tel: t.tel || "",
      adres: t.adres || "",
      email: t.email || "",
      country: t.country || "",
      city: t.city || "",
      currency: t.currency || "TRY",
      faturali: (t.currency && t.currency !== "TRY") ? "Faturalı Yurtdışı" : "Faturalı Yurtiçi",
      model,
      kaliplar,
      fabrikaSatisBedeli: araToplam > 0 ? String(araToplam) : "",
      fromTeklifId: t.id,
    });
    setCustReturnTab("evrak");
    setCustFilter("all");
    setCustDetailId(null);
    setTab("customers");
  };

  const handleDonusturMakina = (t) => {
    const kaliplar = (t.satirlar || []).filter(r => r.selectedKalip).map(r => ({ ad: r.selectedKalip, olcu: "" }));
    const model = (t.satirlar || []).find(r => r.selectedModel)?.selectedModel || "";
    const satirToplam = (t.satirlar || []).reduce((s, r) =>
      s + (r.subItems || []).reduce((s2, item) => s2 + (parseMoney(item.birimFiyat) || 0) * (parseFloat(item.miktar) || 0), 0), 0);
    const araToplam = satirToplam - (parseMoney(t.iskonto) || 0);
    setCustNewPrefill({
      _addForFirmId: t.customerId,
      model,
      kaliplar,
      fabrikaSatisBedeli: araToplam > 0 ? String(araToplam) : "",
      currency: t.currency || "TRY",
      faturali: (t.currency && t.currency !== "TRY") ? "Faturalı Yurtdışı" : "Faturalı Yurtiçi",
      fromTeklifId: t.id,
    });
    setCustReturnTab("evrak");
    setCustFilter("all");
    setCustDetailId(null);
    setTab("customers");
  };

  const handleKaydetSatis = (t) => {
    if (!t.customerId) return;
    const tur = (() => {
      if (t.tur) return t.tur;
      const rows = t.satirlar || [];
      if (rows.some(r => r.selectedModel)) return "makina";
      if (rows.some(r => r.selectedPart)) return "parca";
      if (rows.some(r => r.selectedKalip)) return "kalip";
      return "diger";
    })();
    const tarih = t.tarih || today();
    const faturaTipi = (t.currency && t.currency !== "TRY") ? "Faturalı Yurtdışı" : "Faturalı Yurtiçi";
    const currency = t.currency || "TRY";
    if (tur === "parca") {
      const yeniKayitlar = (t.satirlar || []).flatMap(r =>
        (r.subItems || []).filter(i => i.type === "parca").map(i => ({
          id: uid(), customerId: t.customerId, tur: "Parça", tarih,
          ad: i.makinaAdi || i.kod || "", olcu: "",
          ucret: (parseMoney(i.birimFiyat) || 0) * (parseFloat(i.miktar) || 1),
          currency, faturaTipi, odendi: false, teklifId: t.id,
        }))
      ).filter(k => k.ad);
      if (!yeniKayitlar.length) { showToast("Teklif satırlarında yedek parça bulunamadı.", "err"); return; }
      setPartSales(p => [...p, ...yeniKayitlar]);
      setTeklifler(p => p.map(x => x.id === t.id ? { ...x, satisTamam: true } : x));
      showToast(`${yeniKayitlar.length} yedek parça satışı CRM'e kaydedildi.`);
    } else if (tur === "kalip") {
      const batchId = uid();
      const yeniKayitlar = (t.satirlar || []).flatMap(r =>
        (r.subItems || []).filter(i => i.type === "kalip").map(i => ({
          id: uid(), batchId, customerId: t.customerId, tur: "Kalıp", tarih,
          ad: r.selectedKalip || i.makinaAdi || "", olcu: "",
          ucret: (parseMoney(i.birimFiyat) || 0) * (parseFloat(i.miktar) || 1),
          currency, faturaTipi, odendi: false, teklifId: t.id,
        }))
      ).filter(k => k.ad);
      if (!yeniKayitlar.length) { showToast("Teklif satırlarında kalıp bulunamadı.", "err"); return; }
      setPartSales(p => [...p, ...yeniKayitlar]);
      setCustomers(p => p.map(c => c.id === t.customerId
        ? { ...c, kaliplar: [...(c.kaliplar || []), ...yeniKayitlar.map(r => ({ ad: r.ad, olcu: "", partSaleId: r.id }))], kalipSayisi: (c.kaliplar || []).length + yeniKayitlar.length }
        : c
      ));
      setTeklifler(p => p.map(x => x.id === t.id ? { ...x, satisTamam: true } : x));
      showToast(`${yeniKayitlar.length} kalıp satışı CRM'e kaydedildi.`);
    }
  };

  const handleDismissTeklif = (t) => {
    setTeklifler(p => p.map(x => x.id === t.id ? { ...x, satisTamam: true } : x));
  };

  const handleCustomerLinked = (customerId, teklifId) => {
    setTeklifler(p => p.map(t => t.id === teklifId ? { ...t, customerId, satisTamam: true } : t));
    setCustNewPrefill(null);
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
  const liveCustomModels = useMemo(() => withoutDeleted(customModels), [customModels]);
  const allModels = [...standardModels, ...liveCustomModels];
  const [factory, setFactory] = useState({ name: "Altuntaş Makina", evrakFirmaAdi: "", contact: "", phone: "", email: "", adres: "", country: "Türkiye", city: "", note: "Ana üretici" });

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
  const [parts,        setParts]        = useState([]); // yedek parça tanım kataloğu [{id, ad, fiyatTRY, fiyatUSD, fiyatEUR, models:[]}]
  const [partSales,    setPartSales]    = useState([]); // Extra Kalıp + yedek parça satışları [{id, customerId|dealerId, tur:"Kalıp"|"YedekParca", ...}]
  const [payments,     setPayments]     = useState([]); // Kapora/Ödeme geçmişi [{id, customerId, tarih, tutar, currency, not}]
  const [gorusmeler,   setGorusmeler]   = useState([]); // müşteri görüşme kayıtları [{id, customerId, tarih, tur, not, takipTarihi, tamamlandi, kullanici}]
  const [kalipDefs,    setKalipDefs]    = useState(INIT_KALIPLAR);
  const [teklifler,    setTeklifler]    = useState([]);
  const [faturalar,    setFaturalar]    = useState([]); // yurt dışı faturalar [{id, no, tarih, firma, ...}]
  const [partStock,       setPartStock]       = useState([]); // yedek parça stok seviyeleri [{id, partId, miktar, notlar, sonGuncelleme}]
  const [partStockLog,    setPartStockLog]    = useState([]); // stok hareket log'u [{id, partId, miktar, tip, referansId, tarih, notlar}]
  const [uretimFormlari,  setUretimFormlari]  = useState([]); // kalıp üretim formları

  // ── Çöp Kutusu: her dizinin deletedAt'i olmayan ("canlı") kopyası — özellik bileşenleri
  // (Dashboard, Customers, SimpleDealers, Stock, Finance, Notes) hep bunları görür, soft-delete
  // edilmiş kayıtlar bu bileşenlere hiç ulaşmaz. Ayarlar'daki Çöp Kutusu bölümü ise ham (raw)
  // dizilerin kendisini kullanır — bkz. render'daki Settings çağrısı.
  const liveCustomers  = useMemo(() => withoutDeleted(customers),  [customers]);
  const liveDealers    = useMemo(() => withoutDeleted(dealers),    [dealers]);
  const liveServices   = useMemo(() => withoutDeleted(services),   [services]);
  const liveStock      = useMemo(() => withoutDeleted(stock),      [stock]);
  const liveNotes      = useMemo(() => withoutDeleted(notes),      [notes]);
  const liveParts      = useMemo(() => withoutDeleted(parts),      [parts]);
  const livePartSales  = useMemo(() => withoutDeleted(partSales),  [partSales]);
  const livePayments   = useMemo(() => withoutDeleted(payments),   [payments]);
  const liveKalipDefs      = useMemo(() => withoutDeleted(kalipDefs),      [kalipDefs]);
  const liveTeklifler      = useMemo(() => withoutDeleted(teklifler),      [teklifler]);
  const liveUretimFormlari = useMemo(() => withoutDeleted(uretimFormlari), [uretimFormlari]);

  // loadFromStorageRef: her render'da güncellenir, hem ilk yükleme hem remote-update soft reload'da kullanılır
  loadFromStorageRef.current = async () => {
    suppressSaveRef.current = true; // yükleme sırasında debounced save tetiklenmesin
    try {
      if (!window.crmStorage) return null;
      const data = await window.crmStorage.load();
      if (!data) return null;
      // Sunucuya ulaşılamadı, veri yerel önbellekten geldi → hemen salt okunur moda geç
      // (10 sn'lik poll'u beklemeden); bağlantı dönünce poll serverOnline'ı geri açar
      if (data.__fromCache) { serverOnlineRef.current = false; setServerOnline(false); }
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
      if (Array.isArray(data.teklifler)) data.teklifler = purgeOldTrash(data.teklifler);
      if (Array.isArray(data.faturalar)) data.faturalar = purgeOldTrash(data.faturalar);
      if (Array.isArray(data.uretimFormlari)) data.uretimFormlari = purgeOldTrash(data.uretimFormlari);
      if (Array.isArray(data.gorusmeler)) data.gorusmeler = purgeOldTrash(data.gorusmeler);
      // KDV oranı artık tek bir sayı değil, tarihe bağlı dönemler listesi — eski tekil
      // appSettings.kdvRate'den göç edilir. Aşağıdaki Kalan Borç hesapları (hem eski veri
      // göçü hem de normal yükleme) bu dönemlerle, kaydın KENDİ tarihine göre yapılır; bu
      // sayede oran değişikliği geçmiş kayıtlara da geriye dönük doğru şekilde yansır.
      const kdvRates = normalizeKdvRates(data.appSettings);
      // Fabrika adı geçmişte değiştiyse (prevNames), tüm referansları güncel adla eşitle
      if (data.factory?.name && Array.isArray(data.factory.prevNames) && data.factory.prevNames.length > 0) {
        const fName = data.factory.name;
        const prevNames = data.factory.prevNames;
        const norm = (val) => prevNames.includes(val) ? fName : val;
        if (Array.isArray(data.customers)) {
          data.customers = data.customers.map(c => ({
            ...c,
            satisYapan: norm(c.satisYapan),
            prevOwners: c.prevOwners?.map(o => ({ ...o, satisYapan: norm(o.satisYapan) })),
          }));
        }
        if (Array.isArray(data.services)) {
          data.services = data.services.map(s => ({ ...s, islemFirma: norm(s.islemFirma) }));
        }
      }
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
      if (Array.isArray(data.gorusmeler)) setGorusmeler(data.gorusmeler);
      // satisTamam tek yönlüdür — yükleme sırasında yerel true değerini sunucunun false'u ezmesin
      if (Array.isArray(data.teklifler)) setTeklifler(prev => {
        const prevMap = new Map(prev.map(t => [t.id, t]));
        return data.teklifler.map(t => {
          if (prevMap.get(t.id)?.satisTamam && !t.satisTamam) {
            postLoadNeedsSaveRef.current = true; // sunucudan farklıyız, yükleme sonrası kaydet
            return { ...t, satisTamam: true };
          }
          return t;
        });
      });
      if (Array.isArray(data.faturalar)) setFaturalar(data.faturalar);
      if (Array.isArray(data.partStock)) setPartStock(data.partStock);
      if (Array.isArray(data.partStockLog)) setPartStockLog(data.partStockLog);
      if (Array.isArray(data.uretimFormlari)) setUretimFormlari(data.uretimFormlari);
      setAppSettings(s => ({ ...s, ...data.appSettings, kdvRates }));
      if (typeof data.nextId === "number") setIdCounter(data.nextId);
      if (typeof data.dataVersion === "number") dataVersionRef.current = data.dataVersion;
      return data; // çakışma birleştirmesi (mergeLocalIntoReloaded) sunucu verisini buradan alır
    } catch (err) { console.error(err); return null; } finally {
      // debounce süresi (500ms) geçtikten sonra tekrar normal kaydetmeye izin ver.
      // saveTrigger SADECE yükleme sırasında sunucu verisi yerel değerle ezildiyse artar
      // (postLoadNeedsSaveRef) — her yüklemede koşulsuz kaydetmek, kayıt→versiyon artışı→
      // diğer PC yeniden yükler→o da kaydeder şeklinde iki PC arasında sonsuz döngü
      // yaratıyor ve kullanıcı kayıtlarını sürekli 409 çakışmasına sokuyordu
      setTimeout(() => {
        suppressSaveRef.current = false;
        if (postLoadNeedsSaveRef.current) { postLoadNeedsSaveRef.current = false; setSaveTrigger(n => n + 1); }
      }, 700);
    }
  };

  useEffect(() => {
    loadFromStorageRef.current().finally(() => setLoaded(true));
  }, []);

  const pendingSave = useRef(null);
  useEffect(() => {
    if (!loaded || !window.crmStorage || suppressSaveRef.current) return;
    // Salt okunur mod: sunucuya ulaşılamıyorken hiçbir şey kaydedilmez/kuyruklanmaz
    // (önbellekten gösterilen veriyi sunucuya geri yazmaya çalışmak veri kaybettirir)
    if (serverMode === "active" && !serverOnlineRef.current) return;
    const data = { customers, dealers, stock, kalipDefs, standardModels, customModels, factory, services, notes, parts, partSales, payments, gorusmeler, teklifler, faturalar, partStock, partStockLog, uretimFormlari, appSettings, nextId: getIdCounter(), __dataVersion: dataVersionRef.current };
    pendingSave.current = data;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const saveData = pendingSave.current;
      pendingSave.current = null;
      lastAttemptedSaveRef.current = saveData;
      const ok = await window.crmStorage.save(saveData || data);
      if (ok) {
        failedSaveRef.current = null; lastAttemptedSaveRef.current = null;
        clearMintedIds(); // bu oturumda üretilen ID'ler artık sunucuda — "yeni kayıt" sayılmasınlar
      }
      else if (serverMode === "active") { failedSaveRef.current = saveData || data; }
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [customers, dealers, stock, kalipDefs, standardModels, customModels, factory, services, notes, parts, partSales, payments, gorusmeler, teklifler, faturalar, partStock, partStockLog, uretimFormlari, appSettings, loaded, saveTrigger]);
  useEffect(() => {
    const flush = () => {
      // Salt okunur modda flush yok: flushSave versiyon kontrolü yapmadan yazar,
      // önbellekten gösterilen bayat verinin sunucuyu ezmesine izin verilmez
      if (serverOnlineRef.current === false) { window.crmLocks?.releaseAll?.().catch?.(() => {}); return; }
      const toFlush = pendingSave.current || lastAttemptedSaveRef.current;
      if (toFlush && window.crmStorage?.flushSave) {
        clearTimeout(saveTimer.current);
        window.crmStorage.flushSave(toFlush);
        pendingSave.current = null;
        lastAttemptedSaveRef.current = null;
      }
      window.crmLocks?.releaseAll?.().catch?.(() => {});
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

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
      (async () => {
        // appLock yedeğe bilerek dahil edilmez — makinaya özgü, şifre özetleri dosyada gezmesin
        const [mailConfig, mailLog] = await Promise.all([
          window.appMail?.getConfigForBackup?.() ?? null,
          window.appMail?.getAllLog?.() ?? [],
        ]).catch(() => [null, []]);
        const ok = await window.crmStorage.writeBackup(s.backupFolder, { app: BACKUP_APP_TAG, schemaVersion: BACKUP_SCHEMA_VERSION, version: appVersion, exportDate: today(), customers, services, dealers, stock, customModels, standardModels, factory, kalipDefs, notes, parts, partSales, payments, teklifler, faturalar, partStock, partStockLog, uretimFormlari, gorusmeler, appSettings, mailConfig, mailLog }).catch(() => false);
        if (ok) setAppSettings(p => ({ ...p, lastBackup: today() }));
      })();
    }
  }, [appSettings.autoBackup, appSettings.backupFolder, appSettings.frequency]);

  // Yerel kilit her zaman önce kontrol edilir — server modu aktif olsa bile atlanmaz.
  if (unlocked === null) return null; // appLock.status() bekleniyor
  if (!unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />;

  if (serverMode === null) return null; // sunucu durumu kontrol edilirken bekle
  if (serverMode === "login") return <ServerLogin onLogin={() => window.location.reload()} initialUrl={savedServerUrl} initialUsername={savedUsername} />;

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
        </div>

        {/* Menü */}
        <div style={{ padding: "12px 12px 0" }}>
          <GlobalSearch
            customers={liveCustomers} teklifler={liveTeklifler} dealers={liveDealers} stock={liveStock}
            allowedTabs={visibleTabs.map(t => t.id)}
            onOpenCustomer={(id) => { setCustReturnTab(null); setCustFilter("all"); setCustDetailId(id); setTab("customers"); }}
            onOpenDoc={(id) => { setDocOpenId(id); setTab("evrak"); }}
            onOpenDealer={(id) => { setDealerOpenId(id); setDealerFilter("all"); setTab("dealers"); }}
            onGoStock={() => { setStockDefaultSubTab("makina"); setTab("stock"); }}
          />
        </div>
        <nav style={{ padding: "16px 12px", flex: 1, overflowY: "auto" }}>
          {visibleTabs.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} className="nav-btn" onClick={() => {
                const go = () => { if (t.id === "customers") { setCustFilter("all"); setCustDetailId(null); } if (t.id === "dealers") setDealerFilter("all"); if (t.id === "stock") setStockDefaultSubTab("makina"); setTab(t.id); };
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
          {`v${appVersion}`}
          {serverMode === "active" && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "5px 10px", borderRadius: 7, background: serverOnline ? "rgba(52,211,153,.13)" : "rgba(248,113,113,.13)", border: `1px solid ${serverOnline ? "rgba(52,211,153,.28)" : "rgba(248,113,113,.28)"}` }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: serverOnline ? "#34d399" : "#f87171", flexShrink: 0, boxShadow: serverOnline ? "0 0 0 2px rgba(52,211,153,.22)" : "0 0 0 2px rgba(248,113,113,.22)" }} />
              <span style={{ color: serverOnline ? "#6ee7b7" : "#fca5a5", fontWeight: 600 }}>
                {serverOnline ? "Sunucu bağlı" : "Sunucu kapalı"}
              </span>
              {serverOnline && (serverKonumEtiketi({ viaTailscale: serverViaTailscale, sameLan }) === "tailscale" ? (
                <span title="Sunucuya internet üzerinden (Tailscale) bağlısınız" style={{ fontSize: 10, fontWeight: 700, color: "#f0a36a", background: "rgba(232,93,26,.18)", border: "1px solid rgba(232,93,26,.35)", borderRadius: 5, padding: "1px 6px", whiteSpace: "nowrap" }}>Tailscale</span>
              ) : (
                <span title={serverViaTailscale ? "Aynı ağdasınız — Tailscale adresiyle bağlısınız ama trafik yerel ağdan gidiyor" : "Sunucuya fabrika içi yerel ağdan bağlısınız"} style={{ fontSize: 10, fontWeight: 700, color: "#c99a76", background: "rgba(232,93,26,.10)", border: "1px solid rgba(232,93,26,.22)", borderRadius: 5, padding: "1px 6px", whiteSpace: "nowrap" }}>Yerel Ağ</span>
              ))}
            </div>
          )}
          {serverMode === "active" && (
            <button onClick={async () => {
              await window.appServer?.logout();
              setServerMode("login");
            }} style={{ display: "block", width: "100%", marginTop: 8, padding: "7px 0", background: "rgba(232,93,26,.13)", border: "1px solid rgba(232,93,26,.25)", borderRadius: 7, color: "#bd8257", fontSize: 11, cursor: "pointer", letterSpacing: .5 }}>
              Çıkış Yap
            </button>
          )}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
        {readOnly && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fef3c7", border: "1.5px solid #f59e0b", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>Sunucuya bağlanılamıyor, salt okunur mod</div>
              <div style={{ fontSize: 12, color: "#a16207", marginTop: 2 }}>Veriler son başarılı bağlantıdan gösteriliyor, değişiklik yapılamaz. Bağlantı kurulunca bu uyarı kendiliğinden kalkar.</div>
            </div>
          </div>
        )}
        {activeTab === "dashboard" && <Dashboard customers={liveCustomers} dealers={liveDealers} services={liveServices} stock={liveStock} partSales={livePartSales} payments={livePayments} rates={rates} ratesErr={ratesErr} factory={factory} onGoStock={() => setTab("stock")} onGoCustomers={() => { setCustFilter("all"); setCustDetailId(null); setTab("customers"); }} onGoDealers={() => { setDealerFilter("all"); setTab("dealers"); }} onGoDealerDebtors={() => { setDealerFilter("borclu"); setTab("dealers"); }} onGoExpired={() => { setCustFilter("warranty"); setCustDetailId(null); setTab("customers"); }} onGoDebtors={() => { setCustFilter("debt"); setCustDetailId(null); setTab("customers"); }} onGoCustomerDetail={(id) => { setCustReturnTab("dashboard"); setCustFilter("all"); setCustDetailId(id); setTab("customers"); }} onGoWarrantyActive={() => { setCustFilter("warranty-active"); setCustDetailId(null); setTab("customers"); }} onGoSerialPending={() => { setCustFilter("serial-pending"); setCustDetailId(null); setTab("customers"); }} teklifler={visibleTabs.some(t => t.id === "evrak") ? liveTeklifler : []} onDonusturTeklif={handleDonusturTeklif} onDonusturMakina={handleDonusturMakina} onKaydetSatis={handleKaydetSatis} onDismissTeklif={handleDismissTeklif} serverPermissions={effectivePermissions} uretimFormlari={liveUretimFormlari} gorusmeler={gorusmeler} setGorusmeler={setGorusmeler} teklifTakipGun={appSettings.teklifTakipGun ?? 7} tahsilatTakipGun={appSettings.tahsilatTakipGun ?? 7} onOpenTeklif={visibleTabs.some(t => t.id === "evrak") ? (id) => { setDocOpenId(id); setTab("evrak"); } : null} onDismissTakip={(t) => setTeklifler(p => p.map(x => x.id === t.id ? { ...x, takipKapali: true } : x))} onGoUretim={() => { setStockDefaultSubTab("uretim"); setTab("stock"); }} />}
        {activeTab === "customers" && <Customers customers={liveCustomers} setCustomers={setCustomers} services={liveServices} setServices={setServices} dealers={liveDealers} models={allModels} factory={factory} geoData={geoData} loadingGeo={loadingGeo} stock={liveStock} setStock={setStock} partSales={livePartSales} setPartSales={setPartSales} parts={liveParts} payments={livePayments} setPayments={setPayments} gorusmeler={gorusmeler} setGorusmeler={setGorusmeler} partStock={partStock} setPartStock={setPartStock} partStockLog={partStockLog} setPartStockLog={setPartStockLog} initialFilter={custFilter} initialDetailId={custDetailId} kalipDefs={liveKalipDefs} showToast={showToast} kdvRates={appSettings.kdvRates} appSettings={appSettings} onDetailClosed={() => { if (custReturnTab) { setTab(custReturnTab); setCustReturnTab(null); } }} openNewPrefill={custNewPrefill} onCustomerLinked={handleCustomerLinked} onPrefillConsumed={() => setCustNewPrefill(null)} serverPermissions={effectivePermissions} />}
        {activeTab === "dealers" && <SimpleDealers dealers={liveDealers} setDealers={setDealers} factory={factory} setFactory={setFactory} geoData={geoData} loadingGeo={loadingGeo} services={liveServices} customers={liveCustomers} setServices={setServices} setCustomers={setCustomers} kdvRates={appSettings.kdvRates} initialFilter={dealerFilter} onGoCustomerDetail={(id) => { setCustReturnTab("dealers"); setCustFilter("all"); setCustDetailId(id); setTab("customers"); }} showToast={showToast} serverPermissions={effectivePermissions} canEditFactory={serverMode !== "active"} openDetailId={dealerOpenId} onOpenDetailConsumed={() => setDealerOpenId(null)} />}
        {activeTab === "stock"     && <Stock factory={factory} stock={liveStock} setStock={setStock} models={allModels} showToast={showToast} parts={liveParts} partStock={partStock} setPartStock={setPartStock} partStockLog={partStockLog} setPartStockLog={setPartStockLog} appSettings={appSettings} setAppSettings={setAppSettings} customers={liveCustomers} setCustomers={setCustomers} kalipDefs={liveKalipDefs} uretimFormlari={liveUretimFormlari} setUretimFormlari={setUretimFormlari} partSales={livePartSales} setPartSales={setPartSales} serverPermissions={effectivePermissions} defaultSubTab={stockDefaultSubTab} />}
        {activeTab === "finance"   && <Finance   customers={liveCustomers} services={liveServices} dealers={liveDealers} partSales={livePartSales} factory={factory} kdvRates={appSettings.kdvRates} rates={rates} payments={livePayments} teklifler={liveTeklifler} serverPermissions={effectivePermissions} />}
        {activeTab === "notes"     && <Notes ref={notesRef} notes={liveNotes} setNotes={setNotes} showToast={showToast} serverPermissions={effectivePermissions} />}
        {activeTab === "evrak"     && <Documents teklifler={teklifler} setTeklifler={setTeklifler} faturalar={faturalar} setFaturalar={setFaturalar} customers={liveCustomers} partSales={livePartSales} allModels={allModels} factory={factory} appSettings={appSettings} showToast={showToast} kalipDefs={liveKalipDefs} parts={liveParts} geoData={geoData} loadingGeo={loadingGeo} onDonusturTeklif={handleDonusturTeklif} onDonusturMakina={handleDonusturMakina} onKaydetSatis={handleKaydetSatis} serverPermissions={effectivePermissions} openDocId={docOpenId} onDocOpenConsumed={() => setDocOpenId(null)} />}
        {activeTab === "settings"  && <Settings  customers={liveCustomers} services={liveServices} dealers={liveDealers} stock={liveStock} setStock={setStock} setCustomers={setCustomers} setServices={setServices} setDealers={setDealers} version={appVersion} appSettings={appSettings} setAppSettings={setAppSettings} customModels={liveCustomModels} setCustomModels={setCustomModels} standardModels={standardModels} setStandardModels={setStandardModels} factory={factory} setFactory={setFactory} kalipDefs={liveKalipDefs} setKalipDefs={setKalipDefs} notes={liveNotes} setNotes={setNotes} parts={liveParts} setParts={setParts} partSales={livePartSales} setPartSales={setPartSales} payments={livePayments} setPayments={setPayments} partStock={partStock} setPartStock={setPartStock} partStockLog={partStockLog} setPartStockLog={setPartStockLog} showToast={showToast} rawCustomers={customers} rawServices={services} rawDealers={dealers} rawStock={stock} rawNotes={notes} rawParts={parts} rawPartSales={partSales} rawPayments={payments} rawKalipDefs={kalipDefs} rawCustomModels={customModels} rawTeklifler={teklifler} setTeklifler={setTeklifler} faturalar={faturalar} setFaturalar={setFaturalar} rawFaturalar={faturalar} rawUretimFormlari={uretimFormlari} setUretimFormlari={setUretimFormlari} rawGorusmeler={gorusmeler} setGorusmeler={setGorusmeler} serverPermissions={effectivePermissions} />}
      </div>
    </div>
  );
}
