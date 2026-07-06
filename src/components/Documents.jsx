import { useState, useMemo } from "react";
import { today, uid, parseMoney, trLower, stripAutoPrint, fmtTR, withoutDeleted, numberToWordsEN, effectiveTeklifTur, teklifKullanildiMi } from "../lib/utils";
import { parsePermissions } from "../lib/permissions";
import { logAction } from "../lib/audit";
import { Icon, Field, Input, Warn, Select, Btn, Modal, ConfirmDialog, Pagination, EMAIL_RE, LockConflict } from "./ui";
import { useFilteredList } from "../hooks/useFilteredList";
import { useLock } from "../hooks/useLock";
import LOGO_B64 from "../assets/logo.avif?inline";
import { COUNTRIES, COUNTRY_EN, COUNTRY_ALT, CITIES_TR, CURRENCIES } from "../lib/constants";
import { buildPrintHtml, buildFaturaHtml } from "../lib/printTemplates";
import { FaturaFormModal } from "./documents/FaturaFormModal";

const PER_PAGE = 15;
const CUR_LABEL = { TRY: "TL", EUR: "EURO", USD: "USD" };

const DURUM_OPTS = ["taslak", "gonderildi", "onaylandi", "iptal"];
const DURUM_LABEL = { taslak: "Taslak", gonderildi: "Gönderildi", onaylandi: "Onaylandı", iptal: "İptal" };
const DURUM_STYLE = {
  taslak:     { bg: "#f1f5f9", color: "#475569" },
  gonderildi: { bg: "#dbeafe", color: "#1d4ed8" },
  onaylandi:  { bg: "#d1fae5", color: "#065f46" },
  iptal:      { bg: "#fee2e2", color: "#991b1b" },
};

const DurumBadge = ({ durum }) => {
  const s = DURUM_STYLE[durum] || DURUM_STYLE.taslak;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: s.bg, color: s.color }}>
      {DURUM_LABEL[durum] || durum}
    </span>
  );
};

const MailModal = ({ mailDraft, setMailDraft, mailSendState, sendMailDraft, previewMailAttachment }) => (
  <Modal title="E-posta Gönder" onClose={() => setMailDraft(null)}>
    {!window.appMail ? (
      <div style={{ fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "10px 14px", borderRadius: 10, border: "1px dashed #e2e8f0" }}>
        Bu özellik yalnızca kurulu uygulamada çalışır.
      </div>
    ) : (
      <>
        <Field label="Kime">
          <Input value={mailDraft.to} onChange={e => setMailDraft(p => ({ ...p, to: e.target.value }))} placeholder="ornek@firma.com" />
          <Warn>{mailDraft.to && !EMAIL_RE.test(mailDraft.to) ? "Geçersiz e-posta formatı" : ""}</Warn>
        </Field>
        <Field label="Konu">
          <Input value={mailDraft.subject} onChange={e => setMailDraft(p => ({ ...p, subject: e.target.value }))} />
        </Field>
        <Field label="Mesaj">
          <textarea value={mailDraft.text} onChange={e => setMailDraft(p => ({ ...p, text: e.target.value }))}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 110, boxSizing: "border-box", fontFamily: "inherit" }} />
        </Field>
        <div style={{ fontSize: 11.5, color: "#94a3b8", marginBottom: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          📎 {mailDraft.pdfFileName} otomatik ek olarak gönderilecek.
          <button onClick={previewMailAttachment} type="button"
            style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "2px 9px", cursor: "pointer" }}>
            Eki Önizle
          </button>
        </div>
        {mailSendState.state === "error" && (
          <div style={{ fontSize: 13, fontWeight: 600, color: "#991b1b", marginTop: 12, marginBottom: 12 }}>✗ {mailSendState.error}</div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <Btn variant="ghost" onClick={() => setMailDraft(null)}>İptal</Btn>
          <Btn onClick={sendMailDraft} disabled={mailSendState.state === "sending"}>
            <Icon name="mail" size={14} /> {mailSendState.state === "sending" ? "Gönderiliyor..." : "Gönder"}
          </Btn>
        </div>
      </>
    )}
  </Modal>
);

const fmtMoney = (val, currency) => {
  const num = parseMoney(val);
  if (!num && num !== 0) return "—";
  const isWhole = num % 1 === 0;
  return num.toLocaleString("tr-TR", { minimumFractionDigits: isWhole ? 0 : 2, maximumFractionDigits: 2 }) + " " + (CUR_LABEL[currency] || currency);
};

// Form içerik alanlarının TR/EN varsayılan değerleri (print etiketlerinden bağımsız)
const FORM_DEFAULTS = {
  TR: {
    odemeSekli: "",
    teslimSekli: "",
    teslimSuresi: "SİPARİŞ ONAYINIZA İSTİNADEN OPSİYONLUDUR.",
    notTeklif: "TÜRKİYE TESLİM FİYATIDIR. YURTDIŞI NAKLİYE, GÜMRÜK, ARDİYE VE VERGİLERİ HARİÇTİR.",
    ek: "SİZLERE TESLİMAT İLE İLGİLİ BİLDİRİLEN TARİHTEN İTİBAREN 7 GÜN İÇİNDE ÖDEMESİ YAPILMAYAN SİPARİŞLER İPTAL EDİLECEKTİR.",
    teklifGecerlilik: "TEKLİF TARİHİNDEN İTİBAREN 3 GÜN GEÇERLİDİR.",
    teslimYeri: "İSTANBUL TUZLA TESLİMDİR. TÜRKİYE GÜMRÜĞÜ GÖNDERİCİYE AİTTİR.",
  },
  EN: {
    odemeSekli: "",
    teslimSekli: "",
    teslimSuresi: "OPTIONAL UPON ORDER CONFIRMATION.",
    notTeklif: "TURKEY DELIVERY PRICE. OVERSEAS FREIGHT, CUSTOMS, WAREHOUSE AND TAXES ARE NOT INCLUDED.",
    ek: "ORDERS NOT PAID WITHIN 7 DAYS FROM THE NOTIFIED DATE WILL BE CANCELLED.",
    teklifGecerlilik: "VALID FOR 3 DAYS FROM THE DATE OF QUOTATION.",
    teslimYeri: "ISTANBUL TUZLA DELIVERY. TURKEY CUSTOMS BELONGS TO SENDER.",
  },
};

const nextDocNo = (teklifler, type) => {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;
  const max = teklifler
    .filter(t => t.type === type && (t.no || "").startsWith(prefix))
    .reduce((m, t) => Math.max(m, parseInt((t.no || "").slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(5, "0")}`;
};

const makeEmpty = (type, teklifler, factory, dil = "TR", evrakFormConfig = null) => {
  const D = FORM_DEFAULTS[dil] || FORM_DEFAULTS.TR;
  const fd = evrakFormConfig?.[type]?.fieldDefaults || {};
  const fv = (key, fallback) => fd[key]?.[dil] ?? fd[key]?.TR ?? fallback;
  return {
    id: null, type,
    no: nextDocNo(teklifler, type),
    tarih: today(), dil,
    currency: dil === "EN" ? "EUR" : "TRY",
    customerId: null,
    firma: "", yetkili: "", tel: "", vergiNo: "", vergiDairesi: "", adres: "", email: "", country: "", city: "", tur: "",
    authority: "", forwarder: fv("forwarder", ""),
    satirlar: [],
    iskonto: "", kdvOrani: dil === "EN" ? "0" : "20",
    odemeSekli: fv("odemeSekli", D.odemeSekli),
    teslimSekli: fv("teslimSekli", D.teslimSekli),
    teslimSuresi: fv("teslimSuresi", D.teslimSuresi),
    teslimTarihi: "",
    not: type === "proforma" ? fv("not", "") : fv("not", D.notTeklif),
    ek: fv("ek", type === "proforma" ? D.ek : ""),
    teklifGecerlilik: type === "teklif" ? fv("teklifGecerlilik", D.teklifGecerlilik) : "",
    kur: "",
    teslimYeri: fv("teslimYeri", type === "proforma" ? D.teslimYeri : ""),
    gtipNo: factory?.gtipNo || "",
    modelYiliDegeri: "",
    durum: "taslak",
    createdAt: today(),
    customFieldValues: Object.fromEntries(
      (evrakFormConfig?.[type]?.customFields || [])
        .filter(cf => cf.defaultValue)
        .map(cf => [cf.id, cf.defaultValue])
    ),
  };
};

const makeSubItem = (type) => ({ id: String(uid()), type, kod: "", makinaAdi: "", tanim: "", miktar: 1, birimFiyat: "", tlKarsiligi: "" });
const makeRow = () => ({ rowId: String(uid()), selectedModel: "", selectedKalip: "", selectedPart: "", subItems: [makeSubItem("makina")] });

const migrateRow = (r) => {
  if (r.subItems) return { ...r, subItems: r.subItems.filter(i => i.type !== "bant") };
  return { rowId: r.rowId, selectedModel: r.selectedModel || "", selectedKalip: r.selectedKalip || "", selectedPart: r.selectedPart || "",
    subItems: [{ id: String(uid()), type: "makina", kod: r.kod || "", makinaAdi: r.makinaAdi || "", tanim: r.tanim || "", miktar: r.miktar || 1, birimFiyat: r.birimFiyat || "", tlKarsiligi: r.tlKarsiligi || "" }] };
};

// ── Özel alan input bileşeni ──────────────────────────────────────────────────
const CfInput = ({ cf, dil, value, onChange, inputStyle }) => {
  const label = cf.label.TR;
  if (cf.type === "select") {
    const options = cf.options || [];
    return (
      <Field label={label}>
        <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
          <option value="">—</option>
          {options.map((opt, i) => (
            <option key={i} value={opt.TR}>{opt.TR}</option>
          ))}
        </select>
      </Field>
    );
  }
  const suggestions = (cf.suggestions || "").trim();
  const listId = suggestions ? `cf-datalist-${cf.id}` : undefined;
  return (
    <Field label={label}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        style={inputStyle}
        autoComplete="off"
        {...(listId ? { list: listId } : {})}
      />
      {listId && (
        <datalist id={listId}>
          {suggestions.split(",").map(s => s.trim()).filter(Boolean).map(s => <option key={s} value={s} />)}
        </datalist>
      )}
    </Field>
  );
};

export const Documents = ({
  teklifler, setTeklifler,
  faturalar = [], setFaturalar,
  customers,
  partSales = [],
  allModels = [],
  factory,
  appSettings = {},
  showToast = () => {},
  kalipDefs = [],
  parts = [],
  geoData = null,
  loadingGeo = false,
  onDonusturTeklif = null,
  onDonusturMakina = null,
  onKaydetSatis = null,
  serverPermissions = null,
}) => {
  const effectiveTur = effectiveTeklifTur;
  const evrakFormConfig = appSettings?.evrakFormConfig || null;

  const _perms = parsePermissions(serverPermissions);
  const _isAdmin = !_perms;
  const _allowedEvrakActions = _perms ? (_perms.evrakActions ?? null) : null;
  const canDoEvrak = action => !_allowedEvrakActions || _allowedEvrakActions.includes(action);

  const isFieldHidden = (type, section, key) =>
    (evrakFormConfig?.[type]?.hiddenFields?.[section] || []).includes(key);

  const isFieldDeleted = (type, section, key) =>
    (evrakFormConfig?.[type]?.deletedFields?.[section] || []).includes(key);

  const canShow = (type, section, key) =>
    !isFieldHidden(type, section, key) && !isFieldDeleted(type, section, key);

  const getFieldLabel = (type, section, key, fallbackTR) => {
    const lbl = evrakFormConfig?.[type]?.fieldLabels?.[section]?.[key];
    return lbl?.TR || fallbackTR;
  };

  const getUnifiedOrder = (type, section, builtinKeys) => {
    const savedOrder = evrakFormConfig?.[type]?.fieldOrder?.[section] || [];
    const cfs = (evrakFormConfig?.[type]?.customFields || []).filter(cf => cf.section === section);
    const cfKeys = cfs.map(cf => String(cf.id));
    const allKeys = [...builtinKeys, ...cfKeys];
    const inOrder = new Set(savedOrder);
    return [
      ...savedOrder.filter(k => allKeys.includes(k)),
      ...allKeys.filter(k => !inOrder.has(k)),
    ];
  };

  const cfById = (type, id) =>
    (evrakFormConfig?.[type]?.customFields || []).find(cf => String(cf.id) === String(id));

  const getCfValue = (cfId) => form?.customFieldValues?.[cfId] ?? "";
  const setCfValue = (cfId, val) =>
    setForm(p => p ? ({ ...p, customFieldValues: { ...(p.customFieldValues || {}), [cfId]: val } }) : p);

  const [subTab, setSubTab] = useState("teklif"); // "teklif" | "proforma" | "fatura"
  const [form, setForm] = useState(null); // null = form kapalı
  const [confirmDel, setConfirmDel] = useState(null);
  const [donusturBanner, setDonusturBanner] = useState(null); // onaylı teklif → müşteri çevirme bildirimi
  const { lockLoading: teklifLockLoading, lockConflict: teklifLock, forceAcquire: forceTeklifLock } = useLock("teklif", form?.id ?? null);

  // ── Yurt Dışı Fatura state ──
  const [faturaForm, setFaturaForm] = useState(null);
  const { lockLoading: faturaLockLoading, lockConflict: faturaLock, forceAcquire: forceFaturaLock } = useLock("fatura", faturaForm?.id ?? null);
  const [faturaConfirmDel, setFaturaConfirmDel] = useState(null);
  const liveFaturalar = useMemo(() => withoutDeleted(faturalar).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")), [faturalar]);
  const [faturaSearch, setFaturaSearch] = useState("");
  const filteredFaturalar = useMemo(() => {
    if (!faturaSearch.trim()) return liveFaturalar;
    const q = trLower(faturaSearch.trim());
    return liveFaturalar.filter(f => trLower(f.firma || "").includes(q) || trLower(f.no || "").includes(q));
  }, [liveFaturalar, faturaSearch]);

  const makeEmptyFatura = () => {
    const fCfg = appSettings?.evrakFormConfig?.fatura;
    const fd = fCfg?.fieldDefaults || {};
    const fv = (key, fallback) => fd[key]?.EN ?? fd[key]?.TR ?? fd[key] ?? fallback;
    return {
      id: null,
      no: "",
      tarih: today(),
      firma: "",
      adres: "",
      ulke: "",
      sehir: "",
      vatId: "",
      localTaxNo: "",
      satirlar: [{ id: uid(), model: "", aciklama: "", seriNo: "", adet: "1", birimFiyat: "" }],
      currency: "USD",
      kur: "",
      origin:      fv("origin",      "Türkiye"),
      payment:     fv("payment",     "T/T in advance"),
      delivery:    fv("delivery",    "CIF Istanbul"),
      paketAdedi:  fv("paketAdedi",  "1"),
      brutAgirlik: fv("brutAgirlik", "180 KG"),
      olculer:     fv("olculer",     "70x100x80 CM"),
      gtipNo:      factory?.gtipNo  || fv("gtipNo", ""),
      not: "",
      createdAt: today(),
    };
  };

  const faturaCityList = useMemo(() => {
    const ulke = faturaForm?.ulke || "";
    if (!ulke) return [];
    const cands = [COUNTRY_EN[ulke], ulke, COUNTRY_ALT?.[ulke]].filter(Boolean);
    let cities = [];
    if (geoData) { for (const c of cands) { if (geoData[c]?.length) { cities = geoData[c]; break; } } }
    if (!cities.length && ulke === "Türkiye") cities = CITIES_TR;
    return cities;
  }, [faturaForm?.ulke, geoData]);

  const calcFaturaTotal = (f) =>
    (f?.satirlar || []).reduce((s, r) => s + (parseMoney(r.birimFiyat) || 0) * (parseFloat(r.adet) || 0), 0);

  const saveFatura = () => {
    if (!faturaForm) return;
    if (!faturaForm.firma.trim()) { showToast("Firma adı girilmedi.", "err"); return; }
    const entry = { ...faturaForm };
    if (!entry.id) { entry.id = uid(); entry.createdAt = today(); }
    setFaturalar(p => {
      const idx = p.findIndex(f => f.id === entry.id);
      return idx >= 0 ? p.map(f => f.id === entry.id ? entry : f) : [...p, entry];
    });
    const isFaturaUpdate = !!faturaForm.id && liveFaturalar.some(f => f.id === faturaForm.id);
    setFaturaForm(null);
    logAction({ serverPermissions, action: isFaturaUpdate ? "duzenlendi" : "olusturuldu", entity: "fatura", entityId: entry.id, entityName: entry.firma });
    showToast("Fatura kaydedildi.");
  };

  const delFatura = (id) => {
    const fat = liveFaturalar.find(f => f.id === id);
    setFaturalar(p => p.map(f => f.id === id ? { ...f, deletedAt: today() } : f));
    setFaturaConfirmDel(null);
    logAction({ serverPermissions, action: "silindi", entity: "fatura", entityId: id, entityName: fat?.firma });
    showToast("Fatura silindi.");
  };

  const fetchFaturaRate = async (currency) => {
    if (!currency || currency === "TRY") { setFaturaForm(p => p ? ({ ...p, kur: "" }) : p); return; }
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${currency}`);
      const data = await res.json();
      const rate = data?.rates?.TRY;
      if (rate) {
        const todayFmt = new Date().toLocaleDateString("tr-TR");
        const rateStr = rate.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        setFaturaForm(p => p ? ({ ...p, kur: `1 ${currency} = ${rateStr} TL (${todayFmt})` }) : p);
      }
    } catch {}
  };

  const printFatura = (f) => {
    const total = calcFaturaTotal(f);
    const kase = appSettings?.kaseResmi || "";
    const fCfg = appSettings?.evrakFormConfig?.fatura || null;
    const html = buildFaturaHtml(f, factory, total, LOGO_B64, kase, appSettings?.translations?.fatura || {}, fCfg);
    if (window.appPrint?.printHtml) {
      window.appPrint.printHtml(html, null, `Invoice-${(f.firma || "").replace(/\s+/g, "-")}-${f.no || f.tarih || ""}.pdf`);
    } else {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `invoice-${f.no || f.tarih || "belge"}.html`; a.click();
    }
  };

  // ── Müşteri arama (alıcı alanlarını doldurmak için) ──
  const [custSearch, setCustSearch] = useState("");
  const custResults = useMemo(() => {
    if (!custSearch.trim()) return [];
    const q = trLower(custSearch.trim());
    const seen = new Set();
    return customers.filter(c => {
      if (!trLower(c.name || "").includes(q)) return false;
      const key = trLower(c.name || "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 6);
  }, [custSearch, customers]);

  // ── Liste filtresi ──
  const liveTeklifler = useMemo(() => withoutDeleted(teklifler), [teklifler]);
  // Açık formdaki teklif daha önce CRM'e aktarılmış mı — form snapshot'ı yerine canlı kayıt
  // üzerinden bakılır ki modal açıkken başka yerden yapılan dönüştürme de anında yansısın
  const formKullanildi = form?.type === "teklif" && form.id
    ? teklifKullanildiMi(liveTeklifler.find(x => x.id === form.id) || form, customers, partSales)
    : false;
  const filtered = useMemo(() =>
    liveTeklifler.filter(t => t.type === subTab).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
  [liveTeklifler, subTab]);
  const { search, setSearch, page, setPage, filtered: searched, paged } = useFilteredList(filtered, {
    searchFn: (t, q) => trLower(t.firma || "").includes(q) || trLower(t.no || "").includes(q),
    perPage: PER_PAGE,
  });

  // ── Totaller ──
  const calcTotals = (f) => {
    const toplam = (f?.satirlar || []).reduce((s, r) =>
      s + (r.subItems || []).reduce((s2, item) => s2 + (parseMoney(item.birimFiyat) || 0) * (parseFloat(item.miktar) || 0), 0), 0);
    const iskonto = parseMoney(f?.iskonto) || 0;
    const araToplam = toplam - iskonto;
    const kdv = araToplam * (parseFloat(f?.kdvOrani) || 0) / 100;
    return { toplam, iskonto, araToplam, kdv, genelToplam: araToplam + kdv };
  };

  // ── Döviz kuru API'den çek ──
  const calcTL = (birimFiyat, rate) => {
    const num = parseMoney(birimFiyat);
    if (!num || !rate) return "";
    const tl = num * rate;
    const isWhole = tl % 1 === 0;
    return tl.toLocaleString("tr-TR", { minimumFractionDigits: isWhole ? 0 : 2, maximumFractionDigits: 2 });
  };

  const fetchAndSetRate = async (currency) => {
    if (!currency || currency === "TRY") return;
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${currency}`);
      const data = await res.json();
      const rate = data?.rates?.TRY;
      if (rate) {
        const todayFmt = new Date().toLocaleDateString("tr-TR");
        const rateStr = rate.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        setForm(p => p ? ({
          ...p,
          kur: `1 ${currency} = ${rateStr} TL (${todayFmt})`,
          kurRate: rate,
          satirlar: (p.satirlar || []).map(r => ({ ...r, subItems: (r.subItems || []).map(item => ({ ...item, tlKarsiligi: calcTL(item.birimFiyat, rate) })) })),
        }) : p);
      }
    } catch {}
  };

  // ── Form açma ──
  const openNew = (type) => {
    setForm(makeEmpty(type, liveTeklifler, factory, "TR", evrakFormConfig));
    setCustSearch("");
  };

  const openEdit = (t) => {
    setForm({ ...t, satirlar: (t.satirlar || []).map(migrateRow) });
    setCustSearch("");
  };

  const convertToProforma = (t) => {
    const existingProforma = liveTeklifler.find(p => p.type === "proforma" && p.parentTeklifId === t.id);
    if (existingProforma) {
      showToast("Bu teklif için zaten bir proforma oluşturulmuş.", "err");
      return;
    }
    const dil = t.dil || "TR";
    const D = FORM_DEFAULTS[dil] || FORM_DEFAULTS.TR;
    const fdP = evrakFormConfig?.proforma?.fieldDefaults || {};
    const fvP = (key, fallback) => fdP[key]?.[dil] ?? fdP[key]?.TR ?? fallback;
    const newForm = {
      ...t,
      id: null,
      type: "proforma",
      no: nextDocNo(liveTeklifler, "proforma"),
      parentTeklifId: t.id,
      dil,
      kdvOrani: dil === "EN" ? "0" : t.kdvOrani,
      odemeSekli: fvP("odemeSekli", D.odemeSekli),
      teslimSekli: fvP("teslimSekli", D.teslimSekli),
      teslimSuresi: fvP("teslimSuresi", D.teslimSuresi),
      ek: fvP("ek", D.ek),
      not: "",
      teslimYeri: t.teslimYeri || fvP("teslimYeri", D.teslimYeri),
      gtipNo: t.gtipNo || factory?.gtipNo || "",
      teklifGecerlilik: "",
      durum: "taslak",
      createdAt: today(),
      satirlar: (t.satirlar || []).map(r => ({ ...migrateRow(r), rowId: String(uid()) })),
    };
    setForm(newForm);
    setCustSearch("");
    setSubTab("proforma");
    if (newForm.currency !== "TRY") fetchAndSetRate(newForm.currency);
  };

  const convertToFatura = (proforma) => {
    const existingFatura = liveFaturalar.find(f => f.parentProformaId === proforma.id);
    if (existingFatura) { showToast("Bu proforma için zaten bir fatura oluşturulmuş.", "err"); return; }
    const base = makeEmptyFatura();
    const cur = proforma.currency !== "TRY" ? proforma.currency : "USD";
    const satirlar = (proforma.satirlar || [])
      .flatMap(r => (r.subItems || [])
        .filter(item => item.kod || item.makinaAdi || parseMoney(item.birimFiyat) > 0)
        .map(item => ({
          id: String(uid()),
          model: item.kod || "",
          aciklama: [item.makinaAdi, item.tanim].filter(Boolean).join(", "),
          seriNo: "",
          adet: String(item.miktar || 1),
          birimFiyat: item.birimFiyat || "",
        }))
      );
    setFaturaForm({
      ...base,
      parentProformaId: proforma.id,
      firma:      proforma.firma         || "",
      adres:      proforma.adres         || "",
      ulke:       proforma.country       || "",
      sehir:      proforma.city          || "",
      vatId:      proforma.vergiNo       || "",
      localTaxNo: proforma.vergiDairesi  || "",
      currency:   cur,
      kur:        proforma.kur           || "",
      gtipNo:     proforma.gtipNo        || base.gtipNo,
      payment:    proforma.odemeSekli    || base.payment,
      delivery:   [proforma.teslimSekli, proforma.teslimYeri].filter(Boolean).join(" – ") || base.delivery,
      satirlar:   satirlar.length > 0 ? satirlar : base.satirlar,
    });
    setSubTab("fatura");
    if (cur !== "TRY") fetchFaturaRate(cur);
  };

  // ── Kaydet ──
  const PROFORMA_SYNC_FIELDS = ["firma", "yetkili", "tel", "vergiNo", "vergiDairesi", "adres", "email", "authority", "forwarder", "satirlar", "iskonto", "currency", "kur", "kurRate", "gtipNo", "teslimYeri"];

  const save = () => {
    if (!form.firma.trim()) { showToast("Firma adı girilmedi.", "err"); return; }
    if (form.type === "teklif" && !form.no.trim()) { showToast("Teklif numarası girilmedi.", "err"); return; }
    const entry = { ...form };
    const isUpdate = !!form.id;
    if (!entry.id) entry.id = uid();
    const prevEntry = isUpdate ? liveTeklifler.find(t => t.id === entry.id) : null;
    // satisTamam tek yönlüdür: form açıkken teklif başka yerden dönüştürülmüş olabilir,
    // eski form snapshot'ının true değerini false'a geri çevirmesine izin verme
    if (prevEntry?.satisTamam && !entry.satisTamam) entry.satisTamam = true;
    let linkedUpdated = false;
    setTeklifler(p => {
      const idx = p.findIndex(t => t.id === entry.id);
      let updated = idx >= 0 ? p.map(t => t.id === entry.id ? entry : t) : [...p, entry];
      if (isUpdate) {
        const syncPatch = Object.fromEntries(PROFORMA_SYNC_FIELDS.map(f => [f, entry[f]]));
        if (entry.type === "teklif") {
          updated = updated.map(t => {
            if (t.type !== "proforma" || t.parentTeklifId !== entry.id || t.deletedAt) return t;
            linkedUpdated = true;
            return { ...t, ...syncPatch };
          });
        } else if (entry.type === "proforma" && entry.parentTeklifId) {
          updated = updated.map(t => {
            if (t.type !== "teklif" || t.id !== entry.parentTeklifId || t.deletedAt) return t;
            linkedUpdated = true;
            return { ...t, ...syncPatch };
          });
        }
      }
      return updated;
    });
    const linkedLabel = entry.type === "teklif" ? "Bağlı proforma da güncellendi." : "Bağlı teklif de güncellendi.";
    const logEntity = entry.type === "teklif" ? "teklif" : "proforma";
    logAction({ serverPermissions, action: isUpdate ? "duzenlendi" : "olusturuldu", entity: logEntity, entityId: entry.id, entityName: entry.firma, detail: { no: entry.no, durum: entry.durum } });
    showToast(isUpdate ? (linkedUpdated ? `Belge güncellendi. ${linkedLabel}` : "Belge güncellendi.") : "Belge kaydedildi.");
    if (entry.type === "teklif" && entry.durum === "onaylandi") {
      const tur = effectiveTur(entry);
      // makina + bağlı müşteri: satisTamam'ı explicit false yaparak Dashboard'da görünmesini sağla
      if (tur === "makina" && entry.customerId && entry.satisTamam === undefined) {
        entry.satisTamam = false;
        setTeklifler(p => p.map(t => t.id === entry.id ? entry : t));
      }
      if (!teklifKullanildiMi(entry, customers, partSales) && prevEntry?.durum !== "onaylandi") {
        if (tur === "makina" || ((tur === "parca" || tur === "kalip") && entry.customerId)) {
          setDonusturBanner(entry);
        }
      }
    }
    setForm(null);
  };

  // ── Sil ──
  const del = (id) => {
    const doc = liveTeklifler.find(t => t.id === id);
    setTeklifler(p => p.map(t => t.id === id ? { ...t, deletedAt: today() } : t));
    logAction({ serverPermissions, action: "silindi", entity: doc?.type === "proforma" ? "proforma" : "teklif", entityId: id, entityName: doc?.firma });
    showToast("Belge silindi.");
    setConfirmDel(null);
  };

  // ── Satır işlemleri ──
  const addRow = () => setForm(p => ({ ...p, satirlar: [...(p.satirlar || []), makeRow()] }));
  const removeRow = (rowId) => setForm(p => ({ ...p, satirlar: p.satirlar.filter(r => r.rowId !== rowId) }));
  const updateSubItem = (rowId, itemId, field, val) =>
    setForm(p => ({ ...p, satirlar: p.satirlar.map(r => r.rowId !== rowId ? r : { ...r, subItems: r.subItems.map(item => item.id === itemId ? { ...item, [field]: val } : item) }) }));

  const pickModel = (rowId, modelName) => {
    setForm(p => ({ ...p, satirlar: p.satirlar.map(r => {
      if (r.rowId !== rowId) return r;
      if (!modelName) return { ...r, selectedModel: "" };
      const m = allModels.find(x => x.model === modelName);
      if (!m) return r;
      const tanim = form.dil === "EN" ? (m.tanimEN || m.tanim || "") : (m.tanim || "");
      const makinaAdi = form.dil === "EN" ? (m.urunAdiEN || m.urunAdi || "") : (m.urunAdi || "");
      const existing = r.subItems.find(i => i.type === "makina");
      const updated = { ...(existing || makeSubItem("makina")), kod: m.model, makinaAdi, tanim, resim: m.resim || "" };
      const subItems = existing ? r.subItems.map(i => i.type === "makina" ? updated : i) : [updated, ...r.subItems];
      return { ...r, selectedModel: m.model, subItems };
    }) }));
  };

  const pickKalip = (rowId, kalipAd) => {
    setForm(p => ({ ...p, satirlar: p.satirlar.map(r => {
      if (r.rowId !== rowId) return r;
      if (!kalipAd) return { ...r, selectedKalip: "", subItems: r.subItems.filter(i => i.type !== "kalip") };
      const k = kalipDefs.find(x => x.ad === kalipAd);
      const makinaAdi = p.dil === "EN" ? (k?.urunAdiEN || k?.urunAdi || kalipAd) : (k?.urunAdi || kalipAd);
      const tanim = p.dil === "EN" ? (k?.tanimEN || k?.tanim || "") : (k?.tanim || "");
      const existing = r.subItems.find(i => i.type === "kalip");
      const updated = { ...(existing || makeSubItem("kalip")), kod: k?.kod || "", makinaAdi, tanim, resim: k?.resim || "" };
      const subItems = existing ? r.subItems.map(i => i.type === "kalip" ? updated : i) : [...r.subItems, updated];
      return { ...r, selectedKalip: kalipAd, subItems };
    }) }));
  };

  const pickPart = (rowId, partId) => {
    setForm(p => ({ ...p, satirlar: p.satirlar.map(r => {
      if (r.rowId !== rowId) return r;
      if (!partId) return { ...r, selectedPart: "", subItems: r.subItems.filter(i => i.type !== "parca") };
      const part = parts.find(pt => String(pt.id) === String(partId));
      if (!part) return r;
      const cur = p?.currency || "TRY";
      const raw = cur === "USD" ? part.fiyatUSD : cur === "EUR" ? part.fiyatEUR : part.fiyatTRY;
      const num = parseMoney(raw);
      const birimFiyat = num > 0 ? num.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : "";
      const tl = calcTL(birimFiyat, p?.kurRate);
      const makinaAdi = p.dil === "EN" ? (part.adEN || part.ad) : part.ad;
      const tanim = p.dil === "EN" ? (part.tanimEN || part.tanim || "") : (part.tanim || "");
      const existing = r.subItems.find(i => i.type === "parca");
      const updated = { ...(existing || makeSubItem("parca")), kod: part.kod || "", makinaAdi, tanim, birimFiyat, tlKarsiligi: tl || "", resim: part.resim || "" };
      const subItems = existing ? r.subItems.map(i => i.type === "parca" ? updated : i) : [...r.subItems, updated];
      return { ...r, selectedPart: String(partId), subItems };
    }) }));
  };


  // ── Yazdır ──
  const docDefaultName = (doc) =>
    `${doc.type === "proforma" ? "Proforma" : "Teklif"}-${(doc.firma || "").replace(/\s+/g, "-") || "belge"}-${doc.no || doc.tarih || ""}.pdf`;

  const printDoc = (doc) => {
    const kase = appSettings?.kaseResmi || "";
    const htmlPrint = buildPrintHtml(doc, factory, appSettings?.translations, "", evrakFormConfig);
    const htmlPdf   = kase ? buildPrintHtml(doc, factory, appSettings?.translations, kase, evrakFormConfig) : null;
    if (window.appPrint?.printHtml) {
      window.appPrint.printHtml(htmlPrint, htmlPdf, docDefaultName(doc));
    } else {
      const blob = new Blob([htmlPrint], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${doc.type}-${doc.no || doc.tarih}.html`; a.click();
    }
  };

  // ── E-posta ──
  const [mailDraft, setMailDraft] = useState(null);
  const [mailSendState, setMailSendState] = useState({ state: "idle", error: null });

  const openMailDoc = (doc) => {
    const html = stripAutoPrint(buildPrintHtml(doc, factory, appSettings?.translations, appSettings?.kaseResmi || "", evrakFormConfig));
    const typeLabel = doc.type === "proforma" ? "Proforma" : "Teklif";
    setMailDraft({
      to: doc.email || "",
      subject: `${typeLabel} — ${doc.firma || ""} — ${doc.no || doc.tarih || ""}`,
      text: `Sayın ${doc.firma || ""},\n\n${typeLabel} formunuz ekte yer almaktadır.\n\nİyi günler dileriz.\n${factory?.firmaAdi || "Altuntaş Makina"}`,
      pdfHtml: html,
      pdfFileName: `${doc.type}-${(doc.no || doc.tarih || "belge").replace(/\s+/g, "-")}.pdf`,
      type: doc.type,
    });
    setMailSendState({ state: "idle", error: null });
  };

  const previewMailAttachment = () => {
    if (!mailDraft?.pdfHtml) return;
    if (window.appPrint) { window.appPrint.printHtml(mailDraft.pdfHtml); return; }
    const blob = new Blob([mailDraft.pdfHtml], { type: "text/html;charset=utf-8" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  const sendMailDraft = async () => {
    if (!window.appMail || !mailDraft) return;
    if (!EMAIL_RE.test(mailDraft.to || "")) { setMailSendState({ state: "error", error: "Geçerli bir alıcı e-posta adresi girin." }); return; }
    setMailSendState({ state: "sending", error: null });
    const res = await window.appMail.send({ to: mailDraft.to.trim(), subject: mailDraft.subject, text: mailDraft.text, pdfHtml: mailDraft.pdfHtml, pdfFileName: mailDraft.pdfFileName, type: mailDraft.type });
    if (res?.ok) {
      setMailSendState({ state: "idle", error: null });
      setMailDraft(null);
      showToast("E-posta gönderildi.");
    } else {
      setMailSendState({ state: "error", error: res?.error || "Gönderilemedi." });
    }
  };

  const f = (key) => ({ value: form?.[key] ?? "", onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });
  const totals = form ? calcTotals(form) : null;
  const showTL = form?.currency !== "TRY";

  // ── FORM MODAL ────────────────────────────────────────────────────────────────
  const inputStyle = { width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#f8fafc", outline: "none" };
  const taStyle = { ...inputStyle, resize: "vertical", minHeight: 60 };

  // ── LİSTE GÖRÜNÜMÜ ──────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Evrak Yönetimi</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {subTab !== "fatura" ? (
            <>
              {canDoEvrak("evrak_teklif_add") && <Btn onClick={() => openNew("teklif")}><Icon name="plus" size={14} /> Yeni Teklif</Btn>}
              {canDoEvrak("evrak_proforma_add") && (
                <button onClick={() => openNew("proforma")} style={{ padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", whiteSpace: "nowrap" }}>
                  <Icon name="plus" size={14} /> Yeni Proforma
                </button>
              )}
            </>
          ) : (
            canDoEvrak("evrak_fatura_add") && <Btn onClick={() => { const f = makeEmptyFatura(); setFaturaForm(f); fetchFaturaRate(f.currency); }}><Icon name="plus" size={14} /> Yeni Fatura</Btn>
          )}
        </div>
      </div>

      {/* Dönüştür Banner */}
      {donusturBanner && (() => {
        const bTur = effectiveTur(donusturBanner);
        return (
          <div style={{ background: "#d1fae5", border: "1.5px solid #34d399", borderRadius: 10, padding: "11px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#065f46" }}>Teklif onaylandı:</span>
              <span style={{ fontSize: 13, color: "#065f46" }}>{donusturBanner.firma || "—"}</span>
              <span style={{ fontSize: 12, color: "#059669" }}>·
                {bTur === "makina" && !donusturBanner.customerId && " Müşteri kaydı oluşturulsun mu?"}
                {bTur === "makina" && donusturBanner.customerId && " Bu firmaya yeni makina eklensin mi?"}
                {(bTur === "parca" || bTur === "kalip") && " CRM'e satış kaydedilsin mi?"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {canDoEvrak("evrak_teklif_convert") && bTur === "makina" && !donusturBanner.customerId && onDonusturTeklif && (
                <Btn small onClick={() => { onDonusturTeklif(donusturBanner); setDonusturBanner(null); }}
                  style={{ background: "#059669", color: "#fff" }}>
                  <Icon name="userPlus" size={12} /> Yeni Müşteri Ekle
                </Btn>
              )}
              {canDoEvrak("evrak_teklif_convert") && bTur === "makina" && donusturBanner.customerId && onDonusturMakina && (
                <Btn small onClick={() => { onDonusturMakina(donusturBanner); setDonusturBanner(null); }}
                  style={{ background: "#059669", color: "#fff" }}>
                  <Icon name="userPlus" size={12} /> Bu Firmaya Makina Ekle
                </Btn>
              )}
              {canDoEvrak("evrak_teklif_convert") && (bTur === "parca" || bTur === "kalip") && donusturBanner.customerId && onKaydetSatis && (
                <Btn small onClick={() => { onKaydetSatis(donusturBanner); setDonusturBanner(null); }}
                  style={{ background: "#059669", color: "#fff" }}>
                  Satışa Dönüştür
                </Btn>
              )}
              <Btn small variant="ghost" onClick={() => setDonusturBanner(null)}>×</Btn>
            </div>
          </div>
        );
      })()}

      {/* Alt sekme */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "2px solid #f1f5f9", paddingBottom: 0 }}>
        {[["teklif","Teklifler"],["proforma","Proformalar"],["fatura","Yurt Dışı Fatura"]].map(([id, label]) => (
          <button key={id} onClick={() => { setSubTab(id); setPage(1); setSearch(""); }} style={{
            padding: "8px 18px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13.5,
            borderBottom: subTab === id ? "2px solid #e85d1a" : "2px solid transparent",
            color: subTab === id ? "#e85d1a" : "#94a3b8",
            background: "transparent", marginBottom: -2,
          }}>{label}</button>
        ))}
      </div>

      {subTab !== "fatura" ? (<>
      {/* Arama */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Firma adı veya belge no ara..."
          style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
      </div>

      {/* Tablo */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "auto" }}>
        {searched.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            {filtered.length === 0 ? `Henüz ${subTab === "teklif" ? "teklif" : "proforma"} yok.` : "Arama sonucu bulunamadı."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["No / Tarih", "Firma", "Dil", "Toplam", "Durum", ""].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: h === "" ? "right" : "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map(t => {
                const totals = calcTotals(t);
                const hasProforma = subTab === "teklif" && liveTeklifler.some(p => p.type === "proforma" && p.parentTeklifId === t.id);
                return (
                  <tr key={t.id}
                    onClick={canDoEvrak(subTab === "teklif" ? "evrak_teklif_edit" : "evrak_proforma_edit") ? () => openEdit(t) : undefined}
                    style={{ borderBottom: "1px solid #f1f5f9", cursor: canDoEvrak(subTab === "teklif" ? "evrak_teklif_edit" : "evrak_proforma_edit") ? "pointer" : "default" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{t.no || "—"}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtTR(t.tarih)}</div>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 13 }}>{t.firma || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: t.dil === "EN" ? "#dbeafe" : "#f0fdf4", color: t.dil === "EN" ? "#1d4ed8" : "#166534" }}>{t.dil}</span>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>{fmtMoney(totals.genelToplam, t.currency)}</td>
                    <td style={{ padding: "10px 12px" }}><DurumBadge durum={t.durum} /></td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
                        {canDoEvrak(subTab === "teklif" ? "evrak_teklif_edit" : "evrak_proforma_edit") && <Btn small variant="ghost" onClick={() => openEdit(t)}><Icon name="edit" size={12} /></Btn>}
                        {canDoEvrak(subTab === "teklif" ? "evrak_teklif_print" : "evrak_proforma_print") && <Btn small variant="ghost" onClick={() => printDoc(t)} title="Yazdır / PDF Kaydet"><Icon name="print" size={12} /></Btn>}
                        {canDoEvrak(subTab === "teklif" ? "evrak_teklif_mail" : "evrak_proforma_mail") && <Btn small variant="ghost" onClick={() => openMailDoc(t)} title="E-posta ile Gönder"><Icon name="mail" size={12} /></Btn>}
                        {subTab === "proforma" && canDoEvrak("evrak_proforma_convert") && t.dil === "EN" && (() => {
                          const hasFatura = liveFaturalar.some(f => f.parentProformaId === t.id);
                          return (
                            <Btn small variant="ghost" onClick={() => !hasFatura && convertToFatura(t)}
                              title={hasFatura ? "Fatura oluşturuldu" : "Faturaya Dönüştür"}
                              style={{ color: hasFatura ? "#94a3b8" : "#0369a1", opacity: hasFatura ? 0.5 : 1, cursor: hasFatura ? "default" : "pointer" }}>
                              <Icon name="arrowRight" size={12} />
                            </Btn>
                          );
                        })()}
                        {subTab === "teklif" && canDoEvrak("evrak_teklif_convert") && (
                          <Btn small variant="ghost" onClick={() => convertToProforma(t)}
                            title={hasProforma ? "Proforma mevcut" : "Proformaya Dönüştür"}
                            style={{ color: hasProforma ? "#94a3b8" : "#0369a1", opacity: hasProforma ? 0.5 : 1 }}>
                            <Icon name="arrowRight" size={12} />
                          </Btn>
                        )}
                        {subTab === "teklif" && canDoEvrak("evrak_teklif_convert") && t.durum === "onaylandi" && !teklifKullanildiMi(t, customers, partSales) && (() => {
                          const rTur = effectiveTur(t);
                          if (rTur === "makina" && !t.customerId && onDonusturTeklif)
                            return <Btn small variant="ghost" onClick={() => { setDonusturBanner(null); onDonusturTeklif(t); }} title="Yeni müşteri kaydı oluştur" style={{ color: "#16a34a" }}><Icon name="userPlus" size={12} /></Btn>;
                          if (rTur === "makina" && t.customerId && onDonusturMakina)
                            return <Btn small variant="ghost" onClick={() => { setDonusturBanner(null); onDonusturMakina(t); }} title="Bu firmaya makina ekle" style={{ color: "#16a34a" }}><Icon name="userPlus" size={12} /></Btn>;
                          if ((rTur === "parca" || rTur === "kalip") && t.customerId && onKaydetSatis)
                            return <Btn small variant="ghost" onClick={() => onKaydetSatis(t)} title="CRM'e satış kaydet" style={{ color: "#0891b2" }}><Icon name="check" size={12} /></Btn>;
                          return null;
                        })()}
                        {subTab === "teklif" && (teklifKullanildiMi(t, customers, partSales) || t.customerId) && (
                          <span title={teklifKullanildiMi(t, customers, partSales) ? "CRM'e kaydedildi" : "Müşteriye bağlandı"} style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: "#d1fae5", color: "#065f46", lineHeight: 1.6 }}>✓ {teklifKullanildiMi(t, customers, partSales) ? "Kaydedildi" : "Bağlı"}</span>
                        )}
                        {canDoEvrak(subTab === "teklif" ? "evrak_teklif_delete" : "evrak_proforma_delete") && <Btn small variant="danger" onClick={() => setConfirmDel(t.id)}><Icon name="trash" size={12} /></Btn>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <Pagination total={searched.length} page={page} setPage={setPage} perPage={PER_PAGE} />
      </>) : (<>
        {/* Fatura Arama */}
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
          <input value={faturaSearch} onChange={e => setFaturaSearch(e.target.value)} placeholder="Firma adı veya fatura no ara..."
            style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
        </div>
        {/* Fatura Listesi */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "auto" }}>
          {filteredFaturalar.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
              {liveFaturalar.length === 0 ? "Henüz fatura yok." : "Arama sonucu bulunamadı."}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Fatura No / Tarih", "Firma", "Toplam", ""].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: h === "" ? "right" : "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredFaturalar.map(fat => {
                  const total = calcFaturaTotal(fat);
                  const cur = fat.currency || "USD";
                  return (
                    <tr key={fat.id}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{fat.no || "—"}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtTR(fat.tarih)}</div>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13 }}>
                        <div>{fat.firma || "—"}</div>
                        {(fat.ulke || fat.sehir) && <div style={{ fontSize: 11, color: "#94a3b8" }}>{[fat.ulke, fat.sehir].filter(Boolean).join(" / ")}</div>}
                        {fat.parentProformaId && (() => { const src = liveTeklifler.find(t => t.id === fat.parentProformaId); return src ? <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>← {src.no}</div> : null; })()}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700 }}>
                        {total > 0 ? total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + cur : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
                          {canDoEvrak("evrak_fatura_edit") && <Btn small variant="ghost" onClick={() => setFaturaForm({ ...fat })}><Icon name="edit" size={12} /></Btn>}
                          {canDoEvrak("evrak_fatura_print") && <Btn small variant="ghost" onClick={() => printFatura(fat)} title="Yazdır / PDF Kaydet"><Icon name="print" size={12} /></Btn>}
                          {canDoEvrak("evrak_fatura_delete") && <Btn small variant="danger" onClick={() => setFaturaConfirmDel(fat.id)}><Icon name="trash" size={12} /></Btn>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </>)}

      {confirmDel && (
        <ConfirmDialog
          message="Bu belge silinecek. Bu işlem geri alınamaz."
          onConfirm={() => del(confirmDel)}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {mailDraft && <MailModal mailDraft={mailDraft} setMailDraft={setMailDraft} mailSendState={mailSendState} sendMailDraft={sendMailDraft} previewMailAttachment={previewMailAttachment} />}

      {faturaConfirmDel && (
        <ConfirmDialog
          message="Bu fatura silinecek. Bu işlem geri alınamaz."
          onConfirm={() => delFatura(faturaConfirmDel)}
          onCancel={() => setFaturaConfirmDel(null)}
        />
      )}

      {faturaForm && <FaturaFormModal
        faturaForm={faturaForm}
        setFaturaForm={setFaturaForm}
        faturaLock={faturaLock}
        forceFaturaLock={forceFaturaLock}
        saveFatura={saveFatura}
        faturaCityList={faturaCityList}
        fetchFaturaRate={fetchFaturaRate}
        appSettings={appSettings}
        allModels={allModels}
      />}

      {/* ── FORM MODAL ──────────────────────────────────────────────────────── */}
      {form && (
      <Modal wide maxWidth={1180} maxHeight="88vh"
        title={form.id ? "Belgeyi Düzenle" : (form.type === "teklif" ? "Yeni Teklif" : "Yeni Proforma")}
        onClose={() => setForm(null)}>
        {(teklifLock && form.id) ? (
          <LockConflict lockedBy={teklifLock.lockedBy} lockedAt={teklifLock.lockedAt}
            onForce={forceTeklifLock} onCancel={() => setForm(null)} />
        ) : <>
        {/* Durum + Kaydet */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {form.type === "teklif" && form.durum === "onaylandi" && form.id && !formKullanildi && (() => {
            const fTur = effectiveTur(form);
            const saved = liveTeklifler.find(x => x.id === form.id);
            if (fTur === "makina" && !form.customerId && onDonusturTeklif)
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#d1fae5", border: "1.5px solid #34d399", borderRadius: 8, padding: "6px 12px" }}>
                  <span style={{ fontSize: 12, color: "#065f46", fontWeight: 600 }}>Teklif onaylandı</span>
                  <Btn small onClick={() => { if (saved) { setForm(null); onDonusturTeklif(saved); } }} style={{ background: "#059669", color: "#fff" }}>
                    <Icon name="userPlus" size={12} /> Yeni Müşteri Ekle
                  </Btn>
                </div>
              );
            if (fTur === "makina" && form.customerId && onDonusturMakina)
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#d1fae5", border: "1.5px solid #34d399", borderRadius: 8, padding: "6px 12px" }}>
                  <span style={{ fontSize: 12, color: "#065f46", fontWeight: 600 }}>Teklif onaylandı</span>
                  <Btn small onClick={() => { if (saved) { setForm(null); onDonusturMakina(saved); } }} style={{ background: "#059669", color: "#fff" }}>
                    <Icon name="userPlus" size={12} /> Bu Firmaya Makina Ekle
                  </Btn>
                </div>
              );
            if ((fTur === "parca" || fTur === "kalip") && form.customerId && onKaydetSatis)
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#d1fae5", border: "1.5px solid #34d399", borderRadius: 8, padding: "6px 12px" }}>
                  <span style={{ fontSize: 12, color: "#065f46", fontWeight: 600 }}>Teklif onaylandı</span>
                  <Btn small onClick={() => { if (saved) { setForm(null); onKaydetSatis(saved); } }} style={{ background: "#059669", color: "#fff" }}>
                    Satışa Dönüştür
                  </Btn>
                </div>
              );
            if ((fTur === "parca" || fTur === "kalip") && !form.customerId)
              return <span style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, background: "#fef9c3", color: "#854d0e", fontWeight: 600 }}>Kaydetmek için müşteri seçin</span>;
            return <div />;
          })()}
          {formKullanildi && <span style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, background: "#d1fae5", color: "#065f46", fontWeight: 700 }}>✓ CRM'e kaydedildi</span>}
          {!formKullanildi && form.type === "teklif" && form.customerId && effectiveTur(form) === "makina" && (
            <span style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, background: "#d1fae5", color: "#065f46", fontWeight: 700 }}>✓ Müşteriye Bağlı</span>
          )}
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <select value={form.tur || ""} onChange={e => setForm(p => ({ ...p, tur: e.target.value }))}
              style={{ padding: "9px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#f8fafc", boxSizing: "border-box" }}>
              <option value="">Otomatik ({["makina","parca","kalip","diger"].includes(effectiveTur(form)) ? {makina:"Makina",parca:"Yedek Parça",kalip:"Kalıp",diger:"Diğer"}[effectiveTur(form)] : ""})</option>
              <option value="makina">Makina Satışı</option>
              <option value="parca">Yedek Parça</option>
              <option value="kalip">Kalıp</option>
              <option value="diger">Diğer</option>
            </select>
            <select value={form.durum} onChange={e => setForm(p => ({ ...p, durum: e.target.value }))}
              style={{ width: 130, padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", boxSizing: "border-box" }}>
              {DURUM_OPTS.map(d => <option key={d} value={d}>{DURUM_LABEL[d]}</option>)}
            </select>
            <Btn onClick={save}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Alıcı Bilgileri */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .6, marginBottom: 14 }}>Alıcı Bilgileri</div>

          {/* Müşteri arama */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <input value={custSearch} onChange={e => setCustSearch(e.target.value)}
              placeholder="Mevcut müşteriden ara (firma adı)..."
              style={{ ...inputStyle, paddingLeft: 32 }} />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={13} /></span>
            {custResults.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.10)", zIndex: 100, marginTop: 2 }}>
                {custResults.map(c => (
                  <div key={c.id} onClick={() => {
                    setForm(p => ({ ...p, customerId: c.id, firma: c.name || "", yetkili: c.yetkili1Ad || "", tel: c.yetkili1Tel || c.phone || "", adres: c.adres || "", country: c.country || "", city: c.city || "" }));
                    setCustSearch("");
                  }} style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f1f5f9" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}
                  >
                    <b>{c.name}</b>{c.yetkili1Ad ? ` — ${c.yetkili1Ad}` : ""}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Field label="Firma Adı"><input {...f("firma")} style={inputStyle} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {getUnifiedOrder(form.type, "alici", ["yetkili","tel","vergiNo","vergiDairesi","adres","email","country","city"]).map(key => {
              const cf = cfById(form.type, key);
              if (cf) return <div key={key}><CfInput cf={cf} dil={form.dil} value={getCfValue(cf.id)} onChange={v => setCfValue(cf.id, v)} inputStyle={inputStyle} /></div>;
              if (!canShow(form.type, "alici", key)) return null;
              const wide = key === "adres" || key === "email";
              const ws = wide ? { gridColumn: "1 / -1" } : {};
              if (key === "yetkili") return <div key={key} style={ws}><Field label={getFieldLabel(form.type, "alici", "yetkili", "Yetkili")}><input {...f("yetkili")} style={inputStyle} /></Field></div>;
              if (key === "tel") return <div key={key} style={ws}><Field label={getFieldLabel(form.type, "alici", "tel", "Telefon")}><input {...f("tel")} style={inputStyle} /></Field></div>;
              if (key === "vergiNo") return <div key={key} style={ws}><Field label={getFieldLabel(form.type, "alici", "vergiNo", "Vergi No")}><input {...f("vergiNo")} style={inputStyle} /></Field></div>;
              if (key === "vergiDairesi") return <div key={key} style={ws}><Field label={getFieldLabel(form.type, "alici", "vergiDairesi", "Vergi Dairesi")}><input {...f("vergiDairesi")} style={inputStyle} /></Field></div>;
              if (key === "adres") return <div key={key} style={ws}><Field label={getFieldLabel(form.type, "alici", "adres", "Adres")}><textarea {...f("adres")} style={taStyle} /></Field></div>;
              if (key === "email") return <div key={key} style={ws}><Field label={getFieldLabel(form.type, "alici", "email", "E-posta")}><input {...f("email")} style={inputStyle} /></Field></div>;
              if (key === "country") return (
                <div key={key}>
                  <Field label={getFieldLabel(form.type, "alici", "country", "Ülke")}>
                    <select value={form.country || ""} onChange={e => setForm(p => ({ ...p, country: e.target.value, city: "" }))} style={inputStyle}>
                      <option value="">{loadingGeo ? "Yükleniyor..." : "Ülke seçin..."}</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                </div>
              );
              if (key === "city") {
                const cands = form.country ? [COUNTRY_EN[form.country], form.country, COUNTRY_ALT[form.country]].filter(Boolean) : [];
                let cityList = [];
                if (geoData) { for (const cand of cands) { if (geoData[cand]?.length) { cityList = geoData[cand]; break; } } }
                if (!cityList.length && form.country === "Türkiye") cityList = CITIES_TR;
                return (
                  <div key={key}>
                    <Field label={getFieldLabel(form.type, "alici", "city", "Şehir")}>
                      {cityList.length > 0 ? (
                        <select value={form.city || ""} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} style={inputStyle}>
                          <option value="">Şehir seçin...</option>
                          {cityList.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : (
                        <input value={form.city || ""} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} style={inputStyle} placeholder={loadingGeo ? "Şehirler yükleniyor..." : "Şehir yazın"} />
                      )}
                    </Field>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>

        {/* Belge Detayları */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .6, marginBottom: 14 }}>Belge Detayları</div>
          {/* Belge alanları — tümü birleşik sırada */}
          {(() => {
            const teklif_keys = ["no", "tarih", "dil", "currency", "kdvOrani", "gtipNo", "modelYiliDegeri", "kur"];
            const proforma_keys = ["tarih", "dil", "currency", "kdvOrani", "gtipNo", "modelYiliDegeri", "kur", "teslimYeri", "not", "ek"];
            const defaultKeys = form.type === "proforma" ? proforma_keys : teklif_keys;
            const BELGE_WIDE = new Set(["forwarder", "teslimYeri", "not", "ek", "modelYiliDegeri"]);
            const ordered = getUnifiedOrder(form.type, "belge", defaultKeys);
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {ordered.map(key => {
                  const cf = cfById(form.type, key);
                  if (cf) return <div key={key}><CfInput cf={cf} dil={form.dil} value={getCfValue(cf.id)} onChange={v => setCfValue(cf.id, v)} inputStyle={inputStyle} /></div>;
                  if (key === "no" && form.type !== "teklif") return null;
                  if (!canShow(form.type, "belge", key)) return null;
                  if ((key === "gtipNo" || key === "teslimYeri" || key === "not" || key === "ek") && form.type !== "proforma") return null;
                  if (key === "kur" && form.type === "proforma" && form.currency === "TRY") return null;
                  if (key === "kur" && form.type !== "proforma") return null;
                  const wide = BELGE_WIDE.has(key);
                  const ws = wide ? { gridColumn: "1 / -1" } : {};
                  if (key === "no") return <div key={key}><Field label="Teklif No"><input {...f("no")} style={inputStyle} /></Field></div>;
                  if (key === "tarih") return <div key={key}><Field label="Tarih"><input type="date" {...f("tarih")} style={inputStyle} /></Field></div>;
                  if (key === "dil") return (
                    <div key={key}><Field label="Dil">
                      <select value={form.dil} onChange={e => {
                        const dil = e.target.value;
                        const D = FORM_DEFAULTS[dil] || FORM_DEFAULTS.TR;
                        const fd = evrakFormConfig?.[form.type]?.fieldDefaults || {};
                        const fv = (key, fallback) => fd[key]?.[dil] ?? fd[key]?.TR ?? fallback;
                        setForm(p => ({
                          ...p, dil,
                          kdvOrani: dil === "EN" ? "0" : p.kdvOrani,
                          odemeSekli: fv("odemeSekli", D.odemeSekli),
                          teslimSekli: fv("teslimSekli", D.teslimSekli),
                          teslimSuresi: fv("teslimSuresi", D.teslimSuresi),
                          not: p.type === "proforma" ? p.not : fv("not", D.notTeklif),
                          ek: fv("ek", D.ek),
                          teklifGecerlilik: p.type === "teklif" ? fv("teklifGecerlilik", D.teklifGecerlilik) : "",
                          teslimYeri: p.type === "proforma" ? fv("teslimYeri", D.teslimYeri) : p.teslimYeri,
                        }));
                      }} style={inputStyle}>
                        <option value="TR">Türkçe (TR)</option>
                        <option value="EN">English (EN)</option>
                      </select>
                    </Field></div>
                  );
                  if (key === "currency") return (
                    <div key={key}><Field label="Para Birimi">
                      <select value={form.currency} onChange={e => {
                        const cur = e.target.value;
                        setForm(p => ({ ...p, currency: cur }));
                        fetchAndSetRate(cur);
                      }} style={inputStyle}>
                        {CURRENCIES.map(c => <option key={c} value={c}>{c} — {CUR_LABEL[c]}</option>)}
                      </select>
                    </Field></div>
                  );
                  if (key === "kdvOrani") return <div key={key}><Field label="KDV Oranı (%)"><input {...f("kdvOrani")} type="number" min="0" max="100" style={inputStyle} /></Field></div>;
                  if (key === "gtipNo") return <div key={key} style={ws}><Field label={getFieldLabel(form.type, "belge", "gtipNo", "GTIP No")}><input {...f("gtipNo")} style={inputStyle} placeholder="8438 50 00 00 00" /></Field></div>;
                  if (key === "modelYiliDegeri") return <div key={key} style={ws}><Field label={getFieldLabel(form.type, "belge", "modelYiliDegeri", "Model Yılı")}><input {...f("modelYiliDegeri")} style={inputStyle} placeholder={`${new Date().getFullYear()} — Yeni ve Kullanılmamıştır`} /></Field></div>;
                  if (key === "kur") return <div key={key} style={ws}><Field label={getFieldLabel(form.type, "belge", "kur", "Kur (Bugün)")}><input {...f("kur")} style={inputStyle} placeholder="1 EUR = 38,50 TL" /></Field></div>;
                  if (key === "teslimYeri") return <div key={key} style={ws}><Field label={getFieldLabel(form.type, "belge", "teslimYeri", "Teslim Yeri / Gümrük Notu")}><textarea {...f("teslimYeri")} style={taStyle} /></Field></div>;
                  if (key === "not") return <div key={key} style={ws}><Field label={getFieldLabel(form.type, "belge", "not", "Not (Proforma)")}><textarea {...f("not")} style={taStyle} /></Field></div>;
                  if (key === "ek") return <div key={key} style={ws}><Field label={getFieldLabel(form.type, "belge", "ek", "Ek Bilgi")}><textarea {...f("ek")} style={taStyle} /></Field></div>;
                  return null;
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Satırlar */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 18, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .6 }}>Ürün / Hizmet Satırları</div>
          <Btn small onClick={addRow}><Icon name="plus" size={12} /> Satır Ekle</Btn>
        </div>

        {(form.satirlar || []).length === 0 ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Henüz satır eklenmedi. "Satır Ekle" butonunu kullanın.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569", width: 170 }}>Ürün Seç</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569", width: 90 }}>KOD</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569", width: 150 }}>Ürün Adı</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569", minWidth: 180 }}>Tanım</th>
                  <th style={{ padding: "6px 8px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#475569", width: 60 }}>Miktar</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569", width: 130 }}>Birim Fiyat</th>
                  {showTL && <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569", width: 120 }}>TL Karşılığı</th>}
                  <th style={{ width: 32 }} />
                </tr>
              </thead>
              <tbody>
                {form.satirlar.map((row) => {
                  const makinaItem = row.subItems?.find(i => i.type === "makina");
                  const kalipItem  = row.subItems?.find(i => i.type === "kalip");
                  const parcaItem  = row.subItems?.find(i => i.type === "parca");
                  const hasModel = !!row.selectedModel;
                  const hasAnySelected = !!(row.selectedModel || row.selectedKalip || row.selectedPart);
                  const slots = [
                    ...(hasModel || !hasAnySelected ? [{ type: "makina", item: makinaItem }] : []),
                    ...(kalipDefs.length > 0 && (row.selectedKalip || hasModel || !hasAnySelected) ? [{ type: "kalip", item: kalipItem }] : []),
                    ...(parts.length > 0 && (row.selectedPart || hasModel || !hasAnySelected) ? [{ type: "parca", item: parcaItem }] : []),
                  ];
                  const visibleSlots = slots.length > 0 ? slots : [{ type: "makina", item: makinaItem }];
                  const totalSpan = visibleSlots.length;

                  const renderDataCells = (item) => item ? (
                    <>
                      <td style={{ padding: "6px 8px" }}>
                        <input value={item.kod} onChange={e => updateSubItem(row.rowId, item.id, "kod", e.target.value)}
                          placeholder="KOD" style={{ ...inputStyle, fontSize: 12 }} />
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <input value={item.makinaAdi} onChange={e => updateSubItem(row.rowId, item.id, "makinaAdi", e.target.value)}
                          placeholder="Ürün Adı" style={{ ...inputStyle, fontSize: 12 }} />
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <textarea value={item.tanim} onChange={e => updateSubItem(row.rowId, item.id, "tanim", e.target.value)}
                          style={{ ...taStyle, minHeight: item.type === "makina" ? 72 : 40, fontSize: 12 }} />
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "center" }}>
                        <input type="number" min="1" value={item.miktar} onChange={e => updateSubItem(row.rowId, item.id, "miktar", e.target.value)}
                          style={{ ...inputStyle, textAlign: "center", width: 56 }} />
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <input value={item.birimFiyat}
                          onChange={e => {
                            const raw = e.target.value;
                            if (raw === "" || raw.endsWith(",") || /,\d$/.test(raw)) { updateSubItem(row.rowId, item.id, "birimFiyat", raw); return; }
                            const num = parseMoney(raw);
                            if (num <= 0 && raw.trim() !== "0") { updateSubItem(row.rowId, item.id, "birimFiyat", raw); return; }
                            const [int, dec] = num.toFixed(2).split(".");
                            const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                            const formatted = dec === "00" ? intFmt : `${intFmt},${dec.replace(/0+$/, "")}`;
                            const tl = calcTL(formatted, form.kurRate);
                            setForm(p => ({ ...p, satirlar: p.satirlar.map(r => r.rowId !== row.rowId ? r : { ...r, subItems: r.subItems.map(si => si.id !== item.id ? si : { ...si, birimFiyat: formatted, tlKarsiligi: tl }) }) }));
                          }}
                          placeholder="0" style={inputStyle} />
                      </td>
                      {showTL && (
                        <td style={{ padding: "6px 8px" }}>
                          <input value={item.tlKarsiligi} onChange={e => updateSubItem(row.rowId, item.id, "tlKarsiligi", e.target.value)}
                            placeholder={form.kurRate ? "Hesaplanıyor..." : "TL karşılığı"}
                            style={{ ...inputStyle, fontSize: 12, background: item.tlKarsiligi ? "#f0fdf4" : "#f8fafc" }} />
                        </td>
                      )}
                    </>
                  ) : (
                    <td colSpan={showTL ? 5 : 4} style={{ padding: "8px", color: "#cbd5e1", fontSize: 11 }}>— seçilmedi —</td>
                  );

                  return visibleSlots.map(({ type, item }, idx) => (
                    <tr key={`${row.rowId}-${type}`} style={{ borderBottom: idx === totalSpan - 1 ? "1px solid #e2e8f0" : "1px dashed #f1f5f9", verticalAlign: "middle" }}>
                      <td style={{ padding: "6px 8px", verticalAlign: "middle", borderRight: "1px solid #f1f5f9" }}>
                        {type === "makina" && (
                          <select value={row.selectedModel || ""} onChange={e => pickModel(row.rowId, e.target.value)}
                            style={{ ...inputStyle, fontSize: 12 }}>
                            <option value="">— Model Seç —</option>
                            {allModels.map(m => <option key={m.model} value={m.model}>{m.model}</option>)}
                          </select>
                        )}
                        {type === "kalip" && (
                          <select value={row.selectedKalip || ""} onChange={e => pickKalip(row.rowId, e.target.value)}
                            style={{ ...inputStyle, fontSize: 12 }}>
                            <option value="">— Kalıp Seç —</option>
                            {kalipDefs.map(k => <option key={k.id} value={k.ad}>{k.ad}</option>)}
                          </select>
                        )}
                        {type === "parca" && (
                          <select value={row.selectedPart || ""} onChange={e => pickPart(row.rowId, e.target.value)}
                            style={{ ...inputStyle, fontSize: 12 }}>
                            <option value="">— Yedek Parça Seç —</option>
                            {parts.map(p => <option key={p.id} value={String(p.id)}>{p.ad}</option>)}
                          </select>
                        )}
                      </td>
                      {renderDataCells(item)}
                      {idx === 0 && (
                        <td rowSpan={totalSpan} style={{ padding: "6px 8px", verticalAlign: "top" }}>
                          <Btn small variant="danger" onClick={() => removeRow(row.rowId)}><Icon name="trash" size={11} /></Btn>
                        </td>
                      )}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Toplam özeti */}
        {(form.satirlar || []).length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <div style={{ minWidth: 280, background: "#f8fafc", borderRadius: 10, padding: 14, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#64748b" }}>Toplam</span>
                <span style={{ fontWeight: 600 }}>{fmtMoney(totals.toplam, form.currency)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ color: "#64748b" }}>İskonto</span>
                <input
                  value={(form.iskonto === "" || form.iskonto == null || form.iskonto === 0) ? "" : new Intl.NumberFormat("tr-TR").format(form.iskonto)}
                  onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ""); setForm(p => ({ ...p, iskonto: raw === "" ? "" : parseInt(raw, 10) })); }}
                  placeholder="0" inputMode="numeric"
                  style={{ ...inputStyle, width: 120, textAlign: "right", fontSize: 12, fontWeight: 400 }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, paddingTop: 6, borderTop: "1px solid #e2e8f0" }}>
                <span style={{ color: "#64748b" }}>Ara Toplam</span>
                <span style={{ fontWeight: 600 }}>{fmtMoney(totals.araToplam, form.currency)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#64748b" }}>KDV %{form.kdvOrani}</span>
                <span style={{ fontWeight: 600 }}>{fmtMoney(totals.kdv, form.currency)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 14, paddingTop: 8, borderTop: "2px solid #e2e8f0" }}>
                <span>Genel Toplam</span>
                <span style={{ color: "#e85d1a" }}>{fmtMoney(totals.genelToplam, form.currency)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Koşullar (Teklif için) */}
      {form.type === "teklif" && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 18, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .6, marginBottom: 14 }}>Teklif Koşulları (2. Sayfa)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {getUnifiedOrder("teklif", "kosullar", ["odemeSekli","teslimSekli","teslimYeri","teslimSuresi","teslimTarihi","teklifGecerlilik","kur","not"]).map(key => {
              const cf = cfById("teklif", key);
              if (cf) return <div key={key}><CfInput cf={cf} dil={form.dil} value={getCfValue(cf.id)} onChange={v => setCfValue(cf.id, v)} inputStyle={inputStyle} /></div>;
              if (!canShow("teklif", "kosullar", key)) return null;
              const wide = key === "teslimYeri" || key === "not";
              const ws = wide ? { gridColumn: "1 / -1" } : {};
              if (key === "odemeSekli") return <div key={key} style={ws}><Field label={getFieldLabel("teklif", "kosullar", "odemeSekli", "Ödeme Şekli")}><input {...f("odemeSekli")} style={inputStyle} /></Field></div>;
              if (key === "teslimSekli") return <div key={key} style={ws}><Field label={getFieldLabel("teklif", "kosullar", "teslimSekli", "Teslim Şekli")}><input {...f("teslimSekli")} style={inputStyle} /></Field></div>;
              if (key === "teslimYeri") return <div key={key} style={ws}><Field label={getFieldLabel("teklif", "kosullar", "teslimYeri", "Teslim Yeri / Gümrük Notu")}><textarea {...f("teslimYeri")} style={taStyle} /></Field></div>;
              if (key === "teslimSuresi") return <div key={key} style={ws}><Field label={getFieldLabel("teklif", "kosullar", "teslimSuresi", "Teslim Süresi")}><input {...f("teslimSuresi")} style={inputStyle} /></Field></div>;
              if (key === "teslimTarihi") return <div key={key} style={ws}><Field label={getFieldLabel("teklif", "kosullar", "teslimTarihi", "Teslim Tarihi")}><input type="date" {...f("teslimTarihi")} style={inputStyle} /></Field></div>;
              if (key === "teklifGecerlilik") return <div key={key} style={ws}><Field label={getFieldLabel("teklif", "kosullar", "teklifGecerlilik", "Teklif Geçerlilik Süresi")}><input {...f("teklifGecerlilik")} style={inputStyle} /></Field></div>;
              if (key === "kur") return <div key={key} style={ws}><Field label={getFieldLabel("teklif", "kosullar", "kur", "Kur (Bugün)")}><input {...f("kur")} style={inputStyle} placeholder="1 EUR = 52,00 TL" /></Field></div>;
              if (key === "not") return <div key={key} style={ws}><Field label={getFieldLabel("teklif", "kosullar", "not", "Not")}><textarea {...f("not")} style={taStyle} /></Field></div>;
              return null;
            })}
          </div>
        </div>
      )}

      {/* Alt kaydet */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingBottom: 20 }}>
        <Btn variant="ghost" onClick={() => setForm(null)}>Vazgeç</Btn>
        <Btn onClick={save}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>
      </>}
      </Modal>
      )}
    </div>
  );
};

// ── Varsayılan çeviriler — Ayarlar → Çeviriler'den override edilebilir ────────
