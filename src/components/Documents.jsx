import { useState, useMemo } from "react";
import { today, uid, parseMoney, trLower, stripAutoPrint, fmtTR, withoutDeleted, numberToWordsEN } from "../lib/utils";
import { logAction } from "../lib/audit";
import { Icon, Field, Input, Warn, Select, Btn, Modal, ConfirmDialog, Pagination, EMAIL_RE, LockConflict } from "./ui";
import { useFilteredList } from "../hooks/useFilteredList";
import { useLock } from "../hooks/useLock";
import LOGO_B64 from "../assets/logo.avif?inline";
import { COUNTRIES, COUNTRY_EN, COUNTRY_ALT, CITIES_TR } from "../lib/constants";

const PER_PAGE = 15;
const CURRENCIES = ["EUR", "USD", "TRY"];
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
  const effectiveTur = (f) => {
    if (f?.tur) return f.tur;
    const rows = f?.satirlar || [];
    if (rows.some(r => r.selectedModel)) return "makina";
    if (rows.some(r => r.selectedPart)) return "parca";
    if (rows.some(r => r.selectedKalip)) return "kalip";
    return "diger";
  };
  const evrakFormConfig = appSettings?.evrakFormConfig || null;

  const _isAdmin = !serverPermissions || serverPermissions.role === "admin";
  const _allowedEvrakActions = _isAdmin ? null : (() => {
    try { return JSON.parse(serverPermissions?.permissions || "null")?.evrakActions ?? null; }
    catch { return null; }
  })();
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
      if (!entry.satisTamam && prevEntry?.durum !== "onaylandi") {
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
                        {subTab === "teklif" && canDoEvrak("evrak_teklif_convert") && t.durum === "onaylandi" && !t.satisTamam && (() => {
                          const rTur = effectiveTur(t);
                          if (rTur === "makina" && !t.customerId && onDonusturTeklif)
                            return <Btn small variant="ghost" onClick={() => { setDonusturBanner(null); onDonusturTeklif(t); }} title="Yeni müşteri kaydı oluştur" style={{ color: "#16a34a" }}><Icon name="userPlus" size={12} /></Btn>;
                          if (rTur === "makina" && t.customerId && onDonusturMakina)
                            return <Btn small variant="ghost" onClick={() => { setDonusturBanner(null); onDonusturMakina(t); }} title="Bu firmaya makina ekle" style={{ color: "#16a34a" }}><Icon name="userPlus" size={12} /></Btn>;
                          if ((rTur === "parca" || rTur === "kalip") && t.customerId && onKaydetSatis)
                            return <Btn small variant="ghost" onClick={() => onKaydetSatis(t)} title="CRM'e satış kaydet" style={{ color: "#0891b2" }}><Icon name="check" size={12} /></Btn>;
                          return null;
                        })()}
                        {subTab === "teklif" && (t.satisTamam || t.customerId) && (
                          <span title={t.satisTamam ? "CRM'e kaydedildi" : "Müşteriye bağlandı"} style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: "#d1fae5", color: "#065f46", lineHeight: 1.6 }}>✓ {t.satisTamam ? "Kaydedildi" : "Bağlı"}</span>
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

      {/* ── FATURA FORM MODAL ────────────────────────────────────────────────── */}
      {faturaForm && (() => {
        const fCfg = appSettings?.evrakFormConfig?.fatura;
        const isFH = (section, key) => (fCfg?.hiddenFields?.[section] || []).includes(key);
        const fatCFs = fCfg?.customFields || [];
        return (
        <Modal wide maxWidth={1100} maxHeight="90vh"
          title={faturaForm.id ? "Faturayı Düzenle" : "Yeni Yurt Dışı Fatura"}
          onClose={() => setFaturaForm(null)}>
          {(faturaLock && faturaForm.id) ? (
            <LockConflict lockedBy={faturaLock.lockedBy} lockedAt={faturaLock.lockedAt}
              onForce={forceFaturaLock} onCancel={() => setFaturaForm(null)} />
          ) : <>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 }}>
            <Btn onClick={saveFatura}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            {/* Sol: Alıcı bilgileri */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .6, marginBottom: 14 }}>Alıcı Bilgileri</div>
              <Field label="Firma Adı"><input value={faturaForm.firma} onChange={e => setFaturaForm(p => ({ ...p, firma: e.target.value }))} style={inputStyle} /></Field>
              {!isFH("alici", "adres") && <Field label="Adres"><textarea value={faturaForm.adres} onChange={e => setFaturaForm(p => ({ ...p, adres: e.target.value }))} style={{ ...inputStyle, resize: "vertical", minHeight: 54 }} /></Field>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {!isFH("alici", "ulke") && <Field label="Ülke">
                  <select value={faturaForm.ulke} onChange={e => setFaturaForm(p => ({ ...p, ulke: e.target.value, sehir: "" }))} style={inputStyle}>
                    <option value="">Seçiniz</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>}
                {!isFH("alici", "sehir") && <Field label="Şehir">
                  {faturaCityList.length > 0 ? (
                    <select value={faturaForm.sehir} onChange={e => setFaturaForm(p => ({ ...p, sehir: e.target.value }))} style={inputStyle}>
                      <option value="">Seçiniz</option>
                      {faturaCityList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input value={faturaForm.sehir} onChange={e => setFaturaForm(p => ({ ...p, sehir: e.target.value }))} style={inputStyle} />
                  )}
                </Field>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {!isFH("alici", "vatId") && <Field label="Uluslararası Vergi No (VAT ID)"><input value={faturaForm.vatId} onChange={e => setFaturaForm(p => ({ ...p, vatId: e.target.value }))} style={inputStyle} placeholder="EU123456789" /></Field>}
                {!isFH("alici", "localTaxNo") && <Field label="Yerel Vergi No"><input value={faturaForm.localTaxNo} onChange={e => setFaturaForm(p => ({ ...p, localTaxNo: e.target.value }))} style={inputStyle} /></Field>}
              </div>
              {fatCFs.filter(cf => cf.section === "alici").map(cf => (
                <Field key={cf.id} label={cf.label.TR || cf.label.EN}>
                  {cf.type === "select" ? (
                    <select value={faturaForm[`_cf_${cf.id}`] || cf.defaultValue || ""} onChange={e => setFaturaForm(p => ({ ...p, [`_cf_${cf.id}`]: e.target.value }))} style={inputStyle}>
                      <option value="">Seçiniz</option>
                      {(cf.options || []).map((o, i) => <option key={i} value={o.TR}>{o.TR}</option>)}
                    </select>
                  ) : (
                    <input value={faturaForm[`_cf_${cf.id}`] ?? cf.defaultValue ?? ""} onChange={e => setFaturaForm(p => ({ ...p, [`_cf_${cf.id}`]: e.target.value }))} style={inputStyle}
                      list={cf.suggestions ? `cf-sug-${cf.id}` : undefined} />
                  )}
                  {cf.suggestions && <datalist id={`cf-sug-${cf.id}`}>{cf.suggestions.split(",").map(s => <option key={s.trim()} value={s.trim()} />)}</datalist>}
                </Field>
              ))}
            </div>

            {/* Sağ: Fatura bilgileri */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .6, marginBottom: 14 }}>Fatura Bilgileri</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Fatura No"><input value={faturaForm.no} onChange={e => setFaturaForm(p => ({ ...p, no: e.target.value }))} style={inputStyle} placeholder="INV-2024-001" /></Field>
                <Field label="Tarih"><input type="date" value={faturaForm.tarih} onChange={e => setFaturaForm(p => ({ ...p, tarih: e.target.value }))} style={inputStyle} /></Field>
              </div>
              <Field label="Para Birimi">
                <select value={faturaForm.currency} onChange={e => { const cur = e.target.value; setFaturaForm(p => ({ ...p, currency: cur })); fetchFaturaRate(cur); }} style={inputStyle}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              {!isFH("belge", "payment") && <Field label="Ödeme Şekli"><input value={faturaForm.payment} onChange={e => setFaturaForm(p => ({ ...p, payment: e.target.value }))} style={inputStyle} placeholder="T/T in advance" /></Field>}
              {!isFH("belge", "delivery") && <Field label="Teslim Şekli"><input value={faturaForm.delivery} onChange={e => setFaturaForm(p => ({ ...p, delivery: e.target.value }))} style={inputStyle} placeholder="CIF Istanbul" /></Field>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {!isFH("belge", "gtipNo") && <Field label="GTİP No"><input value={faturaForm.gtipNo} onChange={e => setFaturaForm(p => ({ ...p, gtipNo: e.target.value }))} style={inputStyle} placeholder="8438.10.90" /></Field>}
                {!isFH("belge", "origin") && <Field label="Menşei"><input value={faturaForm.origin} onChange={e => setFaturaForm(p => ({ ...p, origin: e.target.value }))} style={inputStyle} placeholder="Türkiye" /></Field>}
              </div>
              {!isFH("belge", "kur") && <Field label="Döviz Kuru"><input value={faturaForm.kur} onChange={e => setFaturaForm(p => ({ ...p, kur: e.target.value }))} style={inputStyle} placeholder="1 USD = 32.50 TRY" /></Field>}
              {fatCFs.filter(cf => cf.section === "belge").map(cf => (
                <Field key={cf.id} label={cf.label.TR || cf.label.EN}>
                  {cf.type === "select" ? (
                    <select value={faturaForm[`_cf_${cf.id}`] || cf.defaultValue || ""} onChange={e => setFaturaForm(p => ({ ...p, [`_cf_${cf.id}`]: e.target.value }))} style={inputStyle}>
                      <option value="">Seçiniz</option>
                      {(cf.options || []).map((o, i) => <option key={i} value={o.TR}>{o.TR}</option>)}
                    </select>
                  ) : (
                    <input value={faturaForm[`_cf_${cf.id}`] ?? cf.defaultValue ?? ""} onChange={e => setFaturaForm(p => ({ ...p, [`_cf_${cf.id}`]: e.target.value }))} style={inputStyle}
                      list={cf.suggestions ? `cf-sug-${cf.id}` : undefined} />
                  )}
                  {cf.suggestions && <datalist id={`cf-sug-${cf.id}`}>{cf.suggestions.split(",").map(s => <option key={s.trim()} value={s.trim()} />)}</datalist>}
                </Field>
              ))}
            </div>
          </div>

          {/* Satırlar */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 18, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .6, marginBottom: 12 }}>Ürünler</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Model", "Ürün Adı", "Seri No", "Adet", `Birim Fiyat (${faturaForm.currency})`, "Tutar", ""].map((h, i) => (
                    <th key={i} style={{ padding: "6px 8px", textAlign: i >= 3 && i <= 5 ? "center" : "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(faturaForm.satirlar || []).map((r, idx) => {
                  const tutar = (parseMoney(r.birimFiyat) || 0) * (parseFloat(r.adet) || 0);
                  const upd = (patch) => setFaturaForm(p => ({ ...p, satirlar: p.satirlar.map((s, i) => i === idx ? { ...s, ...patch } : s) }));
                  return (
                    <tr key={r.id || idx} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "6px 8px", width: 150 }}>
                        <select value={r.model} onChange={e => {
                          const modelVal = e.target.value;
                          const found = allModels.find(m => m.model === modelVal);
                          upd({ model: modelVal, aciklama: found ? (found.urunAdiEN || found.urunAdi || "") : r.aciklama });
                        }} style={{ ...inputStyle, padding: "6px 8px" }}>
                          <option value="">Seçiniz</option>
                          {allModels.map(m => <option key={m.model} value={m.model}>{m.model}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <input value={r.aciklama} onChange={e => upd({ aciklama: e.target.value })}
                          style={{ ...inputStyle, padding: "6px 8px" }} placeholder="Ürün adı (İngilizce)" />
                      </td>
                      <td style={{ padding: "6px 8px", width: 110 }}>
                        <input value={r.seriNo || ""} onChange={e => upd({ seriNo: e.target.value })}
                          style={{ ...inputStyle, padding: "6px 8px" }} placeholder="S/N" />
                      </td>
                      <td style={{ padding: "6px 8px", width: 64 }}>
                        <input type="number" min="1" value={r.adet} onChange={e => upd({ adet: e.target.value })}
                          style={{ ...inputStyle, padding: "6px 8px", textAlign: "center" }} />
                      </td>
                      <td style={{ padding: "6px 8px", width: 140 }}>
                        <input value={r.birimFiyat} onChange={e => upd({ birimFiyat: e.target.value })}
                          style={{ ...inputStyle, padding: "6px 8px", textAlign: "right" }} placeholder="0" />
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", width: 120, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                        {tutar > 0 ? tutar.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                      </td>
                      <td style={{ padding: "6px 8px", width: 32 }}>
                        <button onClick={() => setFaturaForm(p => ({ ...p, satirlar: p.satirlar.filter((_, i) => i !== idx) }))}
                          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button onClick={() => setFaturaForm(p => ({ ...p, satirlar: [...(p.satirlar || []), { id: uid(), model: "", aciklama: "", seriNo: "", adet: "1", birimFiyat: "" }] }))}
              style={{ marginTop: 10, fontSize: 13, color: "#e85d1a", fontWeight: 600, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Icon name="plus" size={13} /> Satır Ekle
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            {/* Sol: Paketleme + Not */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .6, marginBottom: 14 }}>Paketleme</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {!isFH("paketleme", "paketAdedi") && <Field label="Paket Adedi"><input value={faturaForm.paketAdedi} onChange={e => setFaturaForm(p => ({ ...p, paketAdedi: e.target.value }))} style={inputStyle} /></Field>}
                {!isFH("paketleme", "brutAgirlik") && <Field label="Brüt Ağırlık"><input value={faturaForm.brutAgirlik} onChange={e => setFaturaForm(p => ({ ...p, brutAgirlik: e.target.value }))} style={inputStyle} /></Field>}
                {!isFH("paketleme", "olculer") && <Field label="Ölçüler (CM)"><input value={faturaForm.olculer} onChange={e => setFaturaForm(p => ({ ...p, olculer: e.target.value }))} style={inputStyle} /></Field>}
              </div>
              {!isFH("paketleme", "not") && <Field label="Not"><textarea value={faturaForm.not} onChange={e => setFaturaForm(p => ({ ...p, not: e.target.value }))} style={{ ...inputStyle, resize: "vertical", minHeight: 54 }} /></Field>}
              {fatCFs.filter(cf => cf.section === "paketleme").map(cf => (
                <Field key={cf.id} label={cf.label.TR || cf.label.EN}>
                  {cf.type === "select" ? (
                    <select value={faturaForm[`_cf_${cf.id}`] || cf.defaultValue || ""} onChange={e => setFaturaForm(p => ({ ...p, [`_cf_${cf.id}`]: e.target.value }))} style={inputStyle}>
                      <option value="">Seçiniz</option>
                      {(cf.options || []).map((o, i) => <option key={i} value={o.TR}>{o.TR}</option>)}
                    </select>
                  ) : (
                    <input value={faturaForm[`_cf_${cf.id}`] ?? cf.defaultValue ?? ""} onChange={e => setFaturaForm(p => ({ ...p, [`_cf_${cf.id}`]: e.target.value }))} style={inputStyle}
                      list={cf.suggestions ? `cf-sug-${cf.id}` : undefined} />
                  )}
                  {cf.suggestions && <datalist id={`cf-sug-${cf.id}`}>{cf.suggestions.split(",").map(s => <option key={s.trim()} value={s.trim()} />)}</datalist>}
                </Field>
              ))}
            </div>
            {/* Sağ: Banka bilgileri + Toplam */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .6, marginBottom: 14 }}>Banka / Hesap Bilgileri</div>
              <div style={{ fontSize: 12, color: "#64748b", padding: "10px 14px", background: "#f8fafc", borderRadius: 8, border: "1px dashed #e2e8f0" }}>
                Yazdırma sırasında Ayarlar &gt; Firma Bilgileri'ndeki banka hesapları otomatik eklenir.
              </div>
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", textAlign: "right" }}>
                <div style={{ fontSize: 13, color: "#475569", marginBottom: 4 }}>TOTAL</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
                  {calcFaturaTotal(faturaForm).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {faturaForm.currency}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, fontStyle: "italic" }}>
                  {numberToWordsEN(calcFaturaTotal(faturaForm), faturaForm.currency)}
                </div>
              </div>
            </div>
          </div>
          </>}
        </Modal>
        );
      })()}

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
          {form.type === "teklif" && form.durum === "onaylandi" && form.id && !form.satisTamam && (() => {
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
          {form.satisTamam && <span style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, background: "#d1fae5", color: "#065f46", fontWeight: 700 }}>✓ CRM'e kaydedildi</span>}
          {!form.satisTamam && form.type === "teklif" && form.customerId && effectiveTur(form) === "makina" && (
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
export const DEFAULT_TRANSLATIONS = {
  TR: {
    titleTeklif: "TEKLİF FORMU", titleProforma: "PROFORMA FATURA",
    alicrLabel: "ALICI BİLGİLERİ", firmLabel: "Firma", yetkiliLabel: "Yetkili / Tel",
    adresLabel: "Adres", vergiLabel: "Vergi No / Dairesi",
    docLabelTeklif: "TEKLİF BİLGİLERİ", docLabelProforma: "PROFORMA BİLGİLERİ",
    tarihLabel: "Tarih", noLabel: "Teklif No",
    modelYiliLabel: "Model Yılı", modelYiliSuffix: "Yeni ve Kullanılmamıştır",
    kurLabel: "Kur (Bugün)", teslimYeriLabel: "Teslim Yeri",
    authorityLabel: "Yetkili", forwarderLabel: "Gönderen",
    thSira: "#", thKod: "KOD", thAd: "ÜRÜN ADI",
    thTanim: "AÇIKLAMA / ÖZELLİKLER", thMiktar: "ADET", thBirimFiyat: "BİRİM FİYAT", thTutar: "TUTAR",
    subtotalLabel: "ARA TOPLAM", iskontoLabel: "İSKONTO", netLabel: "NET TOPLAM",
    kdvPrefix: "KDV", grandLabel: "GENEL TOPLAM",
    koşullarBaslik: "TEKLİF KOŞULLARI",
    odemeSekli: "Ödeme Şekli", iskontoRow: "İskonto", teslimSekli: "Teslim Şekli",
    teslimSuresi: "Teslim Süresi", teslimTarihi: "Teslim Tarihi",
    gecerlilik: "Geçerlilik Süresi", notLabel: "Not", ekLabel: "Ek Bilgi",
    onayBaslik: "MÜŞTERİ ONAYI", onayAlt: "İsim Soyisim / Kaşe · İmza · Fatura Bilgileri",
    bankaBaslik: "ÖDEME VE BANKA BİLGİLERİ", hesapAdiLabel: "Hesap Adı",
    ibanTLLabel: "IBAN (TL)", ibanEURLabel: "IBAN (EUR)", ibanUSDLabel: "IBAN (USD)",
    sartlarBaslik: "GENEL ŞARTLAR",
    sart1: "Birim fiyatlara KDV dahil değildir.",
    sart2: "Onaylanmayan ve ödemesi yapılmayan sipariş kabul edilmemektedir.",
    sart3: "Teklifimiz, yukarıdaki miktarlarda sipariş verilmesi durumunda bu koşullar dahilinde geçerlidir.",
    notAlt: "Bu belge gizlidir. Yetkisiz kişilerle paylaşılmamalıdır.",
  },
  EN: {
    titleTeklif: "QUOTATION", titleProforma: "PROFORMA INVOICE",
    alicrLabel: "BUYER INFORMATION", firmLabel: "Company", yetkiliLabel: "Contact / Phone",
    adresLabel: "Address", vergiLabel: "Tax No / Office",
    docLabelTeklif: "QUOTATION DETAILS", docLabelProforma: "PROFORMA DETAILS",
    tarihLabel: "Date", noLabel: "Quote No",
    modelYiliLabel: "Model Year", modelYiliSuffix: "New and Unused",
    kurLabel: "Exchange Rate", teslimYeriLabel: "Delivery Point",
    authorityLabel: "Authority", forwarderLabel: "Forwarder",
    thSira: "#", thKod: "CODE", thAd: "PRODUCT NAME",
    thTanim: "DESCRIPTION / SPECIFICATIONS", thMiktar: "QTY", thBirimFiyat: "UNIT PRICE", thTutar: "AMOUNT",
    subtotalLabel: "SUBTOTAL", iskontoLabel: "DISCOUNT", netLabel: "NET TOTAL",
    kdvPrefix: "VAT", grandLabel: "GRAND TOTAL",
    koşullarBaslik: "TERMS & CONDITIONS",
    odemeSekli: "Payment Terms", iskontoRow: "Discount", teslimSekli: "Delivery Method",
    teslimSuresi: "Lead Time", teslimTarihi: "Delivery Date",
    gecerlilik: "Quote Validity", notLabel: "Note", ekLabel: "Additional Info",
    onayBaslik: "CUSTOMER APPROVAL", onayAlt: "Name / Stamp · Signature · Billing Information",
    bankaBaslik: "PAYMENT & BANK INFORMATION", hesapAdiLabel: "Account Name",
    ibanTLLabel: "IBAN (TL)", ibanEURLabel: "IBAN (EUR)", ibanUSDLabel: "IBAN (USD)",
    sartlarBaslik: "GENERAL TERMS",
    sart1: "All unit prices are exclusive of VAT.",
    sart2: "Orders that are not approved and paid will not be accepted.",
    sart3: "This quotation is valid only for the quantities stated above under the specified conditions.",
    notAlt: "This document is confidential. Do not share with unauthorized parties.",
  },
};

export const DEFAULT_SARTLAR = [
  { TR: DEFAULT_TRANSLATIONS.TR.sart1, EN: DEFAULT_TRANSLATIONS.EN.sart1 },
  { TR: DEFAULT_TRANSLATIONS.TR.sart2, EN: DEFAULT_TRANSLATIONS.EN.sart2 },
  { TR: DEFAULT_TRANSLATIONS.TR.sart3, EN: DEFAULT_TRANSLATIONS.EN.sart3 },
];

export const DEFAULT_FATURA_TRANSLATIONS = {
  title: "INVOICE",
  invoiceNoLabel: "Invoice No",
  dateLabel: "Date",
  fromLabel: "FROM",
  billToLabel: "BILL TO",
  thDescription: "Description",
  thSerialNo: "Serial No",
  thQty: "Qty",
  thUnitPrice: "Unit Price",
  thAmount: "Amount",
  paymentLabel: "Payment",
  deliveryLabel: "Delivery",
  packingLabel: "Packing",
  gtipLabel: "GTIP No",
  originLabel: "Country of Origin",
  exchangeRateLabel: "Exchange Rate",
  notesLabel: "Notes",
  bankLabel: "Bank Details",
  totalLabel: "Total",
};

// ── Print HTML ────────────────────────────────────────────────────────────────
function buildPrintHtml(form, factory, translations = {}, kaseResmi = "", evrakFormConfig = null) {
  const f = factory || {};
  const bankalar = (Array.isArray(f.bankalar) && f.bankalar.length > 0)
    ? f.bankalar
    : (f.bankaAdi || f.hesapAdi || f.swift || f.ibanTL || f.ibanEUR || f.ibanUSD)
      ? [{ bankaAdi: f.bankaAdi, hesapAdi: f.hesapAdi, swift: f.swift, ibanTL: f.ibanTL, ibanEUR: f.ibanEUR, ibanUSD: f.ibanUSD }]
      : [];
  const isTR = form.dil !== "EN";
  const isProforma = form.type === "proforma";
  const cur = form.currency || "EUR";
  const curLabel = CUR_LABEL[cur] || cur;
  const BRAND = "#1a1a1a";

  const base = isTR
    ? { ...DEFAULT_TRANSLATIONS.TR, ...(translations?.TR || {}) }
    : { ...DEFAULT_TRANSLATIONS.EN, ...(translations?.EN || {}) };
  const L = {
    ...base,
    title:     isProforma ? base.titleProforma : base.titleTeklif,
    docLabel:  isProforma ? base.docLabelProforma : base.docLabelTeklif,
    newUnused: `${new Date().getFullYear()} — ${base.modelYiliSuffix}`,
    kdvLabel:  `${base.kdvPrefix} %${form.kdvOrani}`,
  };

  const docType = form.type;
  const FL_DEFAULTS = {
    alici: { yetkili: { TR: "Yetkili / Tel", EN: "Authority" }, vergiNo: { TR: "Vergi No / Dairesi", EN: "Tax No / Office" }, adres: { TR: "Adres", EN: "Address" }, country: { TR: "Ülke", EN: "Country" }, city: { TR: "Şehir", EN: "City" } },
    belge:  { forwarder: { TR: "Gönderen", EN: "Forwarder" }, kur: { TR: "Kur (Bugün)", EN: "Exchange Rate" }, teslimYeri: { TR: "Teslim Yeri", EN: "Delivery Point" }, not: { TR: "Not", EN: "Note" } },
    kosullar: { odemeSekli: { TR: "Ödeme Şekli", EN: "Payment Terms" }, teslimSekli: { TR: "Teslim Şekli", EN: "Delivery Method" }, teslimSuresi: { TR: "Teslim Süresi", EN: "Lead Time" }, teslimTarihi: { TR: "Teslim Tarihi", EN: "Delivery Date" }, teslimYeri: { TR: "Teslim Yeri", EN: "Delivery Point" }, teklifGecerlilik: { TR: "Geçerlilik Süresi", EN: "Quote Validity" }, kur: { TR: "Kur (Bugün)", EN: "Exchange Rate" }, not: { TR: "Not", EN: "Note" } },
  };
  const fl = (section, key) => {
    const lbl = evrakFormConfig?.[docType]?.fieldLabels?.[section]?.[key];
    const def = FL_DEFAULTS[section]?.[key];
    return isTR ? (lbl?.TR || def?.TR || "") : (lbl?.EN || def?.EN || def?.TR || "");
  };
  const isHiddenPrint = (section, key) =>
    (evrakFormConfig?.[docType]?.hiddenFields?.[section] || []).includes(key);

  const cfRowsHtml = (section) =>
    (evrakFormConfig?.[docType]?.customFields || [])
      .filter(cf => cf.section === section)
      .map(cf => {
        const label = (!isTR && cf.label.EN) ? cf.label.EN : cf.label.TR;
        const value = form.customFieldValues?.[cf.id];
        if (!value) return "";
        return `<tr>
          <td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;width:30%;">${label}</td>
          <td style="padding:2px 8px;">${value}</td>
        </tr>`;
      }).join("");

  const totals = (() => {
    const toplam = (form.satirlar || []).reduce((s, r) => s + (r.subItems || []).reduce((s2, item) => s2 + (parseMoney(item.birimFiyat) || 0) * (parseFloat(item.miktar) || 0), 0), 0);
    const iskonto = parseMoney(form.iskonto) || 0;
    const araToplam = toplam - iskonto;
    const kdv = araToplam * (parseFloat(form.kdvOrani) || 0) / 100;
    return { toplam, iskonto, araToplam, kdv, genelToplam: araToplam + kdv };
  })();

  const n = (val) => {
    const num = typeof val === "number" ? val : parseMoney(val);
    if ((!num && num !== 0) || val === "" || val === null || val === undefined) return "";
    return num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const fmt2 = (val) => { const s = n(val); return s ? `${s} ${curLabel}` : "—"; };
  const fmt2TL = (val) => { const num = parseMoney(val); return num ? `${num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL` : ""; };

  const companyName = f.evrakFirmaAdi || f.name || "ALTUNTAŞ MAKİNA SANAYİ";
  const companyAddr = f.adres || "Topçular mah. Keresteciler sit. İşgören sok. No:33/2-3 Eyüp / İSTANBUL";
  const companyPhone = f.phone || "";
  const companyEmail = f.email || "";

  // ── HEADER ─────────────────────────────────────────────────────────────────
  const enProforma = !isTR && isProforma;
  const header = `
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
    <tr>
      <td style="vertical-align:top;padding-right:20px;">
        ${!enProforma ? `<img src="${LOGO_B64}" style="height:56px;object-fit:contain;display:block;" alt="logo" />` : ""}
        <div style="font-size:${enProforma ? "13px;font-weight:800;color:#1a1a1a" : "9px;color:#555"};margin-top:${enProforma ? "0" : "4px"};line-height:1.5;">${enProforma ? companyName : companyAddr}</div>
        ${!enProforma && [companyPhone, companyEmail].filter(Boolean).length ? `<div style="font-size:9px;color:#555;">${[companyPhone, companyEmail].filter(Boolean).join("  ·  ")}</div>` : ""}
        ${enProforma ? `<div style="font-size:9px;color:#555;margin-top:3px;line-height:1.5;">${companyAddr}</div>${[companyPhone, companyEmail].filter(Boolean).length ? `<div style="font-size:9px;color:#555;">${[companyPhone, companyEmail].filter(Boolean).join("  ·  ")}</div>` : ""}` : ""}
      </td>
      <td style="text-align:right;vertical-align:middle;white-space:nowrap;">
        <div style="display:inline-block;background:${BRAND};color:#fff;padding:7px 16px;border-radius:6px;text-align:center;">
          <div style="font-size:13px;font-weight:900;letter-spacing:1px;">${L.title}</div>
          ${!isProforma && form.no ? `<div style="font-size:10px;margin-top:3px;opacity:.9;">${form.no}</div>` : ""}
          <div style="font-size:10px;margin-top:3px;opacity:.9;">${fmtTR(form.tarih) || ""}</div>
        </div>
      </td>
    </tr>
  </table>
  <div style="height:3px;background:${BRAND};border-radius:2px;margin-bottom:14px;"></div>`;

  // ── ALICI + BELGE BİLGİLERİ ─────────────────────────────────────────────
  const infoSection = `
  <table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:10px;">
    <tr>
      <td style="width:45%;vertical-align:top;padding-right:8px;">
        <div style="background:#f8f9fa;border-radius:6px;border:1px solid #e2e8f0;overflow:hidden;">
          <div style="background:#475569;color:#fff;font-weight:700;font-size:9.5px;letter-spacing:.5px;padding:4px 8px;">${L.docLabel}</div>
          <table style="width:100%;border-collapse:collapse;font-size:10px;">
            ${!isHiddenPrint("belge", "forwarder") ? `<tr>
              <td style="padding:4px 8px 2px;color:#888;font-size:9px;font-weight:600;width:42%;">${fl("belge", "forwarder")}</td>
              <td style="padding:4px 8px 2px;font-weight:700;">${companyName}</td>
            </tr>` : ""}
            ${!isProforma ? `<tr>
              <td style="padding:${!isHiddenPrint("belge", "forwarder") ? "2px" : "4px"} 8px 2px;color:#888;font-size:9px;font-weight:600;width:42%;">${L.noLabel}</td>
              <td style="padding:${!isHiddenPrint("belge", "forwarder") ? "2px" : "4px"} 8px 2px;font-weight:700;">${form.no || "—"}</td>
            </tr>` : ""}
            <tr>
              <td style="padding:${isProforma && isHiddenPrint("belge", "forwarder") ? "4px" : "2px"} 8px 2px;color:#888;font-size:9px;font-weight:600;">${L.tarihLabel}</td>
              <td style="padding:${isProforma ? "4px" : "2px"} 8px 2px;">${fmtTR(form.tarih) || ""}</td>
            </tr>
            ${!isHiddenPrint("belge", "modelYiliDegeri") ? `<tr>
              <td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">${L.modelYiliLabel}</td>
              <td style="padding:2px 8px;">${form.modelYiliDegeri || L.newUnused}</td>
            </tr>` : ""}
            ${form.currency !== "TRY" && form.kur && !isHiddenPrint("belge", "kur") ? `<tr>
              <td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">${fl("belge", "kur")}</td>
              <td style="padding:2px 8px;">${form.kur}</td>
            </tr>` : ""}
            ${isProforma && form.teslimYeri && !isHiddenPrint("belge", "teslimYeri") ? `<tr>
              <td style="padding:2px 8px 6px;color:#888;font-size:9px;font-weight:600;vertical-align:top;">${fl("belge", "teslimYeri")}</td>
              <td style="padding:2px 8px 6px;font-size:9.5px;">${form.teslimYeri}</td>
            </tr>` : `<tr><td colspan="2" style="padding:3px;"></td></tr>`}
            ${cfRowsHtml("belge")}
          </table>
        </div>
      </td>
      <td style="width:55%;vertical-align:top;">
        <div style="background:#f8f9fa;border-radius:6px;border:1px solid #e2e8f0;overflow:hidden;">
          <div style="background:${BRAND};color:#fff;font-weight:700;font-size:9.5px;letter-spacing:.5px;padding:4px 8px;">${L.alicrLabel}</div>
          <table style="width:100%;border-collapse:collapse;font-size:10px;">
            <tr>
              <td style="padding:4px 8px 2px;color:#888;font-size:9px;font-weight:600;width:30%;">${L.firmLabel}</td>
              <td style="padding:4px 8px 2px;font-weight:700;font-size:11px;color:#1a1a1a;">${form.firma || "—"}</td>
            </tr>
            ${!isHiddenPrint("alici", "yetkili") || !isHiddenPrint("alici", "tel") ? `<tr>
              <td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">${fl("alici", "yetkili")}</td>
              <td style="padding:2px 8px;">${[!isHiddenPrint("alici", "yetkili") ? form.yetkili : "", !isHiddenPrint("alici", "tel") ? form.tel : ""].filter(Boolean).join("  /  ") || "—"}</td>
            </tr>` : ""}
            ${form.authority && !isHiddenPrint("alici", "yetkili") ? `<tr>
              <td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">${fl("alici", "yetkili")}</td>
              <td style="padding:2px 8px;">${form.authority}</td>
            </tr>` : ""}
            ${(form.vergiNo || form.vergiDairesi) && !isHiddenPrint("alici", "vergiNo") && !isHiddenPrint("alici", "vergiDairesi") ? `<tr>
              <td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">${fl("alici", "vergiNo")}</td>
              <td style="padding:2px 8px;">${[form.vergiNo, form.vergiDairesi].filter(Boolean).join("  /  ")}</td>
            </tr>` : ""}
            ${form.adres && !isHiddenPrint("alici", "adres") ? `<tr>
              <td style="padding:2px 8px 2px;color:#888;font-size:9px;font-weight:600;vertical-align:top;">${fl("alici", "adres")}</td>
              <td style="padding:2px 8px 2px;">${form.adres}</td>
            </tr>` : ""}
            ${(() => {
              const showC = form.country && !isHiddenPrint("alici", "country");
              const showS = form.city && !isHiddenPrint("alici", "city");
              if (!showC && !showS) return `<tr><td colspan="2" style="padding:3px;"></td></tr>`;
              const lbl = showC && showS ? `${fl("alici", "country")} / ${fl("alici", "city")}` : showC ? fl("alici", "country") : fl("alici", "city");
              const cityVal = showS ? (isTR ? form.city : form.city.replace(/İ/g,"I").replace(/ı/g,"i").replace(/Ş/g,"S").replace(/ş/g,"s").replace(/Ğ/g,"G").replace(/ğ/g,"g").replace(/Ç/g,"C").replace(/ç/g,"c")) : "";
              const val = [showC ? (isTR ? form.country : (COUNTRY_EN[form.country] || form.country)) : "", cityVal].filter(Boolean).join(", ");
              return `<tr><td style="padding:2px 8px 6px;color:#888;font-size:9px;font-weight:600;">${lbl}</td><td style="padding:2px 8px 6px;">${val}</td></tr>`;
            })()}
            ${cfRowsHtml("alici")}
          </table>
        </div>
      </td>
    </tr>
  </table>`;

  // ── EN PROFORMA BİLGİ TABLOSU ─────────────────────────────────────────────
  const vergiStr = [form.vergiNo, form.vergiDairesi].filter(Boolean).join(" / ");
  const infoSectionEN = `
  <table style="width:100%;border-collapse:collapse;margin-bottom:${(form.currency !== "TRY" && form.kur) || form.teslimYeri ? "6px" : "10px"};font-size:10px;">
    <tr>
      <td style="width:50%;vertical-align:top;padding-right:8px;">
        <div style="background:#f8f9fa;border-radius:6px;border:1px solid #e2e8f0;overflow:hidden;height:100%;">
          <div style="background:#1a1a1a;color:#fff;font-weight:700;font-size:9.5px;letter-spacing:.5px;padding:4px 8px;">FROM</div>
          <div style="padding:10px 12px;">
            <div style="font-weight:700;font-size:11px;margin-bottom:4px;">${companyName}</div>
            ${companyAddr ? `<div style="font-size:9.5px;color:#475569;line-height:1.7;">${companyAddr}</div>` : ""}
            ${[companyPhone, companyEmail].filter(Boolean).length ? `<div style="font-size:9px;color:#64748b;margin-top:4px;">${[companyPhone, companyEmail].filter(Boolean).join("  ·  ")}</div>` : ""}
          </div>
        </div>
      </td>
      <td style="width:50%;vertical-align:top;">
        <div style="background:#f8f9fa;border-radius:6px;border:1px solid #e2e8f0;overflow:hidden;height:100%;">
          <div style="background:#475569;color:#fff;font-weight:700;font-size:9.5px;letter-spacing:.5px;padding:4px 8px;">BILL TO</div>
          <table style="width:100%;border-collapse:collapse;font-size:10px;">
            <tr>
              <td style="padding:4px 8px 2px;color:#888;font-size:9px;font-weight:600;width:35%;">COMPANY</td>
              <td style="padding:4px 8px 2px;font-weight:700;font-size:11px;color:#1a1a1a;">${form.firma || "—"}</td>
            </tr>
            ${form.adres ? `<tr style="background:#fff;"><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">ADDRESS</td><td style="padding:2px 8px;">${form.adres.replace(/\n/g, "<br>")}</td></tr>` : ""}
            ${(form.country || form.city) ? `<tr><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">COUNTRY / CITY</td><td style="padding:2px 8px;">${[COUNTRY_EN[form.country] || form.country, form.city ? form.city.replace(/İ/g,"I").replace(/ı/g,"i").replace(/Ş/g,"S").replace(/ş/g,"s").replace(/Ğ/g,"G").replace(/ğ/g,"g").replace(/Ç/g,"C").replace(/ç/g,"c") : ""].filter(Boolean).join(", ")}</td></tr>` : ""}
            ${vergiStr ? `<tr style="background:#fff;"><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">TAX ADMIN</td><td style="padding:2px 8px;">${vergiStr}</td></tr>` : ""}
            ${(form.authority || form.yetkili) ? `<tr><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">CONTACT</td><td style="padding:2px 8px;">${form.authority || form.yetkili}</td></tr>` : ""}
            ${form.tel ? `<tr style="background:#fff;"><td style="padding:2px 8px 4px;color:#888;font-size:9px;font-weight:600;">TELEPHONE</td><td style="padding:2px 8px 4px;">${form.tel}</td></tr>` : ""}
          </table>
        </div>
      </td>
    </tr>
  </table>
  ${(form.currency !== "TRY" && form.kur && !isHiddenPrint("belge", "kur")) || (form.teslimYeri && !isHiddenPrint("belge", "teslimYeri")) ? `<div style="display:flex;gap:20px;font-size:9.5px;color:#475569;margin-bottom:10px;">${form.currency !== "TRY" && form.kur && !isHiddenPrint("belge", "kur") ? `<span>${fl("belge", "kur")}: <strong>${form.kur}</strong></span>` : ""}${form.teslimYeri && !isHiddenPrint("belge", "teslimYeri") ? `<span>${fl("belge", "teslimYeri")}: <strong>${form.teslimYeri}</strong></span>` : ""}</div>` : ""}`;

  // ── ÜRÜN TABLOSU ──────────────────────────────────────────────────────────
  const allItems = (form.satirlar || [])
    .flatMap(r => r.subItems || [])
    .filter(item => item.kod || item.makinaAdi || (parseMoney(item.birimFiyat) > 0));
  const rowsHtml = allItems.map((item, i) => {
    const tutar = (parseMoney(item.birimFiyat) || 0) * (parseFloat(item.miktar) || 0);
    const tutarTL = item.tlKarsiligi ? (parseMoney(item.tlKarsiligi) || 0) * (parseFloat(item.miktar) || 0) : null;
    const birimHtml = item.tlKarsiligi
      ? `${fmt2(parseMoney(item.birimFiyat))}<br><span style="font-size:9.5px;color:#777;">(${fmt2TL(item.tlKarsiligi)})</span>`
      : fmt2(parseMoney(item.birimFiyat));
    const tutarHtml = item.tlKarsiligi
      ? `${fmt2(tutar)}<br><span style="font-size:9.5px;color:#777;">(${fmt2TL(tutarTL)})</span>`
      : fmt2(tutar);
    const rowBg = i % 2 === 0 ? "#fff" : "#f8fafc";
    return `
    <tr style="background:${rowBg};">
      <td style="text-align:center;padding:5px 4px;border-bottom:1px solid #e8ecf0;color:#888;font-size:9.5px;">${i + 1}</td>
      <td style="padding:5px 6px;border-bottom:1px solid #e8ecf0;font-weight:700;font-size:9.5px;color:${BRAND};">${item.kod || ""}</td>
      <td style="padding:5px 6px;border-bottom:1px solid #e8ecf0;font-weight:600;font-size:10px;">
        ${item.resim ? `<img src="${item.resim}" style="width:60px;height:45px;object-fit:contain;display:block;margin-bottom:4px;border-radius:4px;border:1px solid #e8ecf0;">` : ""}
        ${item.makinaAdi || ""}
      </td>
      <td style="padding:5px 6px;border-bottom:1px solid #e8ecf0;font-size:9px;color:#444;line-height:1.5;">${(item.tanim || "").replace(/\n/g, "<br>")}</td>
      <td style="text-align:center;padding:5px 4px;border-bottom:1px solid #e8ecf0;font-weight:600;">${item.miktar || 1}</td>
      <td style="text-align:right;padding:5px 8px;border-bottom:1px solid #e8ecf0;white-space:nowrap;">${birimHtml}</td>
      <td style="text-align:right;padding:5px 8px;border-bottom:1px solid #e8ecf0;font-weight:700;white-space:nowrap;">${tutarHtml}</td>
    </tr>`;
  }).join("");

  const totalPrintItems = (form.satirlar || []).reduce((s, r) => s + (r.subItems || []).length, 0);
  const emptyRows = Math.max(0, 3 - totalPrintItems);
  const emptyHtml = Array(emptyRows).fill(`<tr style="background:#fff;"><td colspan="7" style="padding:8px;border-bottom:1px solid #e8ecf0;"></td></tr>`).join("");

  const productTable = `
  <div style="border-radius:8px;border:1px solid #dde3ea;overflow:hidden;margin-bottom:10px;">
    <table style="width:100%;border-collapse:collapse;font-size:10px;">
      <thead>
        <tr style="background:${BRAND};">
          <th style="padding:5px 4px;text-align:center;color:#fff;font-size:9px;font-weight:700;width:4%;">${L.thSira}</th>
          <th style="padding:5px 6px;text-align:left;color:#fff;font-size:9px;font-weight:700;width:9%;">${L.thKod}</th>
          <th style="padding:5px 6px;text-align:left;color:#fff;font-size:9px;font-weight:700;width:17%;">${L.thAd}</th>
          <th style="padding:5px 6px;text-align:left;color:#fff;font-size:9px;font-weight:700;">${L.thTanim}</th>
          <th style="padding:5px 4px;text-align:center;color:#fff;font-size:9px;font-weight:700;width:6%;">${L.thMiktar}</th>
          <th style="padding:5px 8px;text-align:right;color:#fff;font-size:9px;font-weight:700;width:14%;">${L.thBirimFiyat}</th>
          <th style="padding:5px 8px;text-align:right;color:#fff;font-size:9px;font-weight:700;width:14%;">${L.thTutar}</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        ${emptyHtml}
      </tbody>
    </table>
  </div>`;

  // ── TOPLAM KUTUSU ─────────────────────────────────────────────────────────
  const totalsBox = `
  <div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
    <div style="min-width:240px;border-radius:8px;border:1px solid #dde3ea;overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        ${totals.iskonto > 0 ? `
        <tr style="background:#f8f9fa;">
          <td style="padding:5px 10px;color:#555;font-weight:600;">${L.subtotalLabel}</td>
          <td style="padding:5px 10px;text-align:right;font-weight:600;">${fmt2(totals.toplam)}</td>
        </tr>
        <tr style="background:#f1f5f9;">
          <td style="padding:5px 10px;color:#475569;font-weight:600;">${L.iskontoLabel}</td>
          <td style="padding:5px 10px;text-align:right;color:#475569;font-weight:600;">− ${fmt2(totals.iskonto)}</td>
        </tr>
        <tr style="background:#f8f9fa;">
          <td style="padding:5px 10px;color:#555;font-weight:600;">${L.netLabel}</td>
          <td style="padding:5px 10px;text-align:right;font-weight:600;">${fmt2(totals.araToplam)}</td>
        </tr>` : `
        <tr style="background:#f8f9fa;">
          <td style="padding:5px 10px;color:#555;font-weight:600;">${L.subtotalLabel}</td>
          <td style="padding:5px 10px;text-align:right;font-weight:600;">${fmt2(totals.toplam)}</td>
        </tr>`}
        ${parseFloat(form.kdvOrani) > 0 ? `
        <tr style="background:#f8f9fa;">
          <td style="padding:5px 10px;color:#555;font-weight:600;">${L.kdvLabel}</td>
          <td style="padding:5px 10px;text-align:right;">${fmt2(totals.kdv)}</td>
        </tr>` : ""}
        <tr style="background:${BRAND};">
          <td style="padding:7px 10px;color:#fff;font-weight:800;font-size:11px;">${L.grandLabel}</td>
          <td style="padding:7px 10px;text-align:right;color:#fff;font-weight:900;font-size:12px;">${fmt2(totals.genelToplam)}</td>
        </tr>
      </table>
    </div>
  </div>`;

  // ── NOTLAR / KOŞULLAR (proforma sayfa 1 altı) ─────────────────────────────
  const proformaNotlar = isProforma ? `
  ${(form.not || form.ek) ? `
  <div style="border-radius:6px;border:1px solid #e2e8f0;padding:8px 12px;font-size:9px;color:#444;margin-bottom:8px;line-height:1.6;">
    ${form.not ? `<div><b>${fl("belge", "not")}:</b> ${form.not}</div>` : ""}
    ${form.ek ? `<div style="margin-top:4px;">${form.ek}</div>` : ""}
  </div>` : ""}
  ${(bankalar.some(b => b.bankaAdi || b.swift || b.ibanTL || b.ibanEUR || b.ibanUSD) || form.gtipNo) ? `
  <div style="border-radius:6px;background:#f8f9fa;border:1px solid #e2e8f0;padding:8px 12px;font-size:9.5px;line-height:1.7;">
    <div style="font-weight:700;color:#1a1a1a;font-size:10px;margin-bottom:4px;">${L.bankaBaslik}</div>
    ${bankalar.map((b, bi) => `
      ${bi > 0 ? `<div style="border-top:1px solid #e2e8f0;margin:4px 0;"></div>` : ""}
      ${b.bankaAdi ? `<div style="color:#444;">${b.bankaAdi}</div>` : ""}
      ${b.hesapAdi ? `<div>${L.hesapAdiLabel}: <b>${b.hesapAdi}</b></div>` : ""}
      ${b.swift ? `<div>SWIFT: <b>${b.swift}</b></div>` : ""}
      ${b.ibanTL ? `<div>${L.ibanTLLabel}: <b style="font-family:monospace;">${b.ibanTL}</b></div>` : ""}
      ${b.ibanEUR ? `<div>${L.ibanEURLabel}: <b style="font-family:monospace;">${b.ibanEUR}</b></div>` : ""}
      ${b.ibanUSD ? `<div>${L.ibanUSDLabel}: <b style="font-family:monospace;">${b.ibanUSD}</b></div>` : ""}
    `).join("")}
    ${form.gtipNo ? `<div style="margin-top:4px;border-top:1px solid #e2e8f0;padding-top:4px;">GTIP NO: <b>${form.gtipNo}</b></div>` : ""}
  </div>` : ""}
  ${enProforma ? `<div style="text-align:right;margin-top:12px;"><img src="${LOGO_B64}" style="height:48px;object-fit:contain;" alt="logo" /></div>` : ""}` : "";

  // ── GENEL ŞARTLAR NOTU (teklif sayfa 1 altı) ──────────────────────────────
  const activeSartlar = (() => {
    const saved = evrakFormConfig?.teklif?.sartlar;
    if (saved && saved.length > 0) return saved.map(s => isTR ? (s.TR || s.EN || "") : (s.EN || s.TR || ""));
    return [L.sart1, L.sart2, L.sart3];
  })().filter(Boolean);

  const notAltText = (() => {
    const alt = evrakFormConfig?.[docType]?.notAlt;
    if (alt) return isTR ? (alt.TR || alt.EN || "") : (alt.EN || alt.TR || "");
    return L.notAlt;
  })();

  const teklifSartlar = !isProforma ? `
  <div style="border-top:2px solid #e2e8f0;margin-top:6px;padding-top:8px;font-size:10px;color:#64748b;line-height:1.7;">
    <b style="color:#475569;">${L.sartlarBaslik}:</b>
    ${activeSartlar.map(s => `<span style="display:inline-block;margin-right:12px;">• ${s}</span>`).join("")}
  </div>` : "";

  const proformaKase = isProforma && kaseResmi
    ? `<div style="margin-top:24px;text-align:right;"><img src="${kaseResmi}" style="max-height:80px;max-width:150px;object-fit:contain;" alt="kaşe"></div>`
    : "";
  const page1 = header + (enProforma ? infoSectionEN : infoSection) + productTable + totalsBox + proformaNotlar + teklifSartlar + proformaKase;

  // ── SAYFA 2 (sadece teklif) ───────────────────────────────────────────────
  const page2 = !isProforma ? `
  <div style="page-break-before:always;">
    ${header}

    <div style="font-size:12px;font-weight:800;color:${BRAND};border-bottom:2px solid ${BRAND};padding-bottom:4px;margin-bottom:10px;">${L.koşullarBaslik}</div>

    <table style="width:100%;border-collapse:collapse;font-size:10px;border-radius:8px;overflow:hidden;border:1px solid #dde3ea;margin-bottom:14px;">
      ${[
        !isHiddenPrint("kosullar", "odemeSekli") && [fl("kosullar", "odemeSekli"), form.odemeSekli],
        [L.iskontoRow, totals.iskonto > 0 ? fmt2(totals.iskonto) : "—"],
        !isHiddenPrint("kosullar", "teslimSekli") && [fl("kosullar", "teslimSekli"), form.teslimSekli],
        !isHiddenPrint("kosullar", "teslimSuresi") && [fl("kosullar", "teslimSuresi"), form.teslimSuresi],
        !isHiddenPrint("kosullar", "teslimTarihi") && [fl("kosullar", "teslimTarihi"), form.teslimTarihi ? fmtTR(form.teslimTarihi) : ""],
        !isHiddenPrint("kosullar", "teslimYeri") && [fl("kosullar", "teslimYeri"), form.teslimYeri],
        !isHiddenPrint("kosullar", "teklifGecerlilik") && [fl("kosullar", "teklifGecerlilik"), form.teklifGecerlilik],
        !isHiddenPrint("kosullar", "kur") && [fl("kosullar", "kur"), form.kur],
        !isHiddenPrint("kosullar", "not") && [fl("kosullar", "not"), form.not],
        ...(evrakFormConfig?.teklif?.customFields || [])
          .filter(cf => cf.section === "kosullar" && form.customFieldValues?.[cf.id])
          .map(cf => [(!isTR && cf.label.EN) ? cf.label.EN : cf.label.TR, form.customFieldValues[cf.id]]),
      ].filter(row => row && row[1]).map(([label, val], i) => `
      <tr style="background:${i % 2 === 0 ? "#f8f9fa" : "#fff"};">
        <td style="padding:6px 10px;font-weight:700;color:#475569;font-size:10px;width:28%;border-right:1px solid #e2e8f0;">${label}</td>
        <td style="padding:6px 10px;color:#1a1a1a;">${val}</td>
      </tr>`).join("")}
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
      <tr>
        <td style="width:50%;padding-right:10px;vertical-align:top;">
          <div style="border-radius:8px;border:2px solid ${BRAND};padding:10px 12px;">
            <div style="font-weight:800;font-size:10px;color:${BRAND};margin-bottom:8px;">${L.onayBaslik}</div>
            <div style="font-size:9px;color:#888;margin-bottom:6px;">${L.onayAlt}</div>
            <div style="height:40px;"></div>
            <div style="border-bottom:1px solid #999;margin-top:4px;"></div>
          </div>
        </td>
        <td style="width:50%;padding-left:10px;vertical-align:top;">
          ${bankalar.length > 0 ? `
          <div style="border-radius:8px;background:#f8f9fa;border:1px solid #e2e8f0;padding:10px 12px;">
            <div style="font-weight:800;font-size:10px;color:#1a1a1a;margin-bottom:8px;">${L.bankaBaslik}</div>
            ${bankalar.map((b, bi) => `
              ${bi > 0 ? `<div style="border-top:1px solid #e2e8f0;margin:4px 0;"></div>` : ""}
              ${b.bankaAdi ? `<div style="font-size:9px;color:#444;margin-bottom:2px;">${b.bankaAdi}${b.swift ? `  ·  SWIFT: <b>${b.swift}</b>` : ""}</div>` : ""}
              ${b.hesapAdi ? `<div style="font-size:9px;margin-bottom:2px;">${L.hesapAdiLabel}: <b>${b.hesapAdi}</b></div>` : ""}
              ${b.ibanTL ? `<div style="font-size:9px;margin-bottom:2px;">${L.ibanTLLabel}: <b style="font-family:monospace;">${b.ibanTL}</b></div>` : ""}
              ${b.ibanEUR ? `<div style="font-size:9px;margin-bottom:2px;">${L.ibanEURLabel}: <b style="font-family:monospace;">${b.ibanEUR}</b></div>` : ""}
              ${b.ibanUSD ? `<div style="font-size:9px;">${L.ibanUSDLabel}: <b style="font-family:monospace;">${b.ibanUSD}</b></div>` : ""}
            `).join("")}
          </div>` : ""}
          ${kaseResmi ? `<div style="margin-top:10px;text-align:right;"><img src="${kaseResmi}" style="max-height:80px;max-width:150px;object-fit:contain;" alt="kaşe"></div>` : ""}
        </td>
      </tr>
    </table>

    <div style="font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:8px;">${notAltText}</div>
  </div>` : "";

  return `<!DOCTYPE html><html lang="${isTR ? "tr" : "en"}"><head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; margin: 0; padding: 20px; color: #1a1a1a; background: #fff; }
    @media print {
      @page { margin: 10mm 12mm; size: A4; }
      body { padding: 0; }
    }
  </style>
  </head><body>
  ${page1}
  ${page2}
  </body></html>`;
}

function buildFaturaHtml(fatura, factory, total, logoB64, kaseResmi = "", faturaT = {}, faturaCfg = null) {
  const L = { ...DEFAULT_FATURA_TRANSLATIONS, ...faturaT };
  const f = factory || {};
  const cur = fatura.currency || "USD";
  const fmt2 = (n) => (parseMoney(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const amountWords = numberToWordsEN(total, cur);
  const isH = (section, key) => (faturaCfg?.hiddenFields?.[section] || []).includes(key);

  // Banka bilgileri — factory.bankalar'dan (teklif/proforma ile aynı kaynak)
  const bankalar = (Array.isArray(f.bankalar) && f.bankalar.length > 0)
    ? f.bankalar
    : (f.bankaAdi || f.hesapAdi || f.swift || f.ibanTL || f.ibanEUR || f.ibanUSD)
      ? [{ bankaAdi: f.bankaAdi, hesapAdi: f.hesapAdi, swift: f.swift, ibanTL: f.ibanTL, ibanEUR: f.ibanEUR, ibanUSD: f.ibanUSD }]
      : [];
  const bankHtml = bankalar.map((b, bi) => `
    ${bi > 0 ? `<div style="border-top:1px solid #e2e8f0;margin:5px 0;"></div>` : ""}
    ${b.bankaAdi ? `<div>${b.bankaAdi}</div>` : ""}
    ${b.swift ? `<div>SWIFT: <b>${b.swift}</b></div>` : ""}
    ${b.hesapAdi ? `<div>Account Name: <b>${b.hesapAdi}</b></div>` : ""}
    ${b.ibanTL  ? `<div>IBAN (TRY): <b style="font-family:monospace;">${b.ibanTL}</b></div>` : ""}
    ${b.ibanEUR ? `<div>IBAN (EUR): <b style="font-family:monospace;">${b.ibanEUR}</b></div>` : ""}
    ${b.ibanUSD ? `<div>IBAN (USD): <b style="font-family:monospace;">${b.ibanUSD}</b></div>` : ""}
  `).join("");

  const hasSeriNo = (fatura.satirlar || []).some(r => r.seriNo);

  const itemRows = (fatura.satirlar || []).filter(r => r.model || r.aciklama).map((r, i) => {
    const adet = parseFloat(r.adet) || 0;
    const fiyat = parseMoney(r.birimFiyat) || 0;
    const tutar = adet * fiyat;
    const desc = r.aciklama || "";
    const modelCode = r.model ? `<b style="font-family:monospace;font-size:9px;">${r.model}</b>${desc ? "<br>" : ""}` : "";
    const bg = i % 2 === 0 ? "#fff" : "#f8fafc";
    return `<tr style="background:${bg};">
      <td style="padding:5px 8px;border-bottom:1px solid #e8ecf0;text-align:center;color:#888;font-size:9.5px;">${i + 1}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e8ecf0;">${modelCode}${desc}</td>
      ${hasSeriNo ? `<td style="padding:5px 8px;border-bottom:1px solid #e8ecf0;text-align:center;font-family:monospace;font-size:9.5px;">${r.seriNo || "—"}</td>` : ""}
      <td style="padding:5px 8px;border-bottom:1px solid #e8ecf0;text-align:center;">${r.adet || 1}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e8ecf0;text-align:right;">${cur} ${fmt2(fiyat)}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e8ecf0;text-align:right;font-weight:700;">${cur} ${fmt2(tutar)}</td>
    </tr>`;
  }).join("");

  const packingParts = [
    !isH("paketleme", "paketAdedi") && fatura.paketAdedi ? `${fatura.paketAdedi} Package` : "",
    !isH("paketleme", "brutAgirlik") && fatura.brutAgirlik ? `Gross Weight: ${fatura.brutAgirlik}` : "",
    !isH("paketleme", "olculer") && fatura.olculer ? `Dim: ${fatura.olculer}` : "",
  ].filter(Boolean);
  const packingText = packingParts.join(" / ");

  const logo = logoB64 ? `<img src="${logoB64}" style="height:56px;object-fit:contain;" alt="logo">` : "";
  const fromLines = [f.evrakFirmaAdi || f.name || "Altuntaş Makina", f.adres || f.address || "", [f.country, f.city].filter(Boolean).join(", "), f.phone || "", f.email || ""].filter(Boolean).join("<br>");
  const toLines = [
    fatura.firma || "—",
    !isH("alici", "adres") && fatura.adres ? fatura.adres.replace(/\n/g, "<br>") : "",
    !isH("alici", "ulke") || !isH("alici", "sehir") ? [!isH("alici", "ulke") ? (COUNTRY_EN[fatura.ulke] || fatura.ulke) : "", !isH("alici", "sehir") ? fatura.sehir : ""].filter(Boolean).join(", ") : "",
    !isH("alici", "vatId") && fatura.vatId ? `VAT ID: ${fatura.vatId}` : "",
    !isH("alici", "localTaxNo") && fatura.localTaxNo ? `Local Tax Number: ${fatura.localTaxNo}` : "",
  ].filter(Boolean).join("<br>");
  const tarihEN = fatura.tarih ? new Date(fatura.tarih + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

  // Özel alan satırları (fatura nesnesinde `_cf_<id>` anahtarlarıyla saklanır)
  const cfRows = (faturaCfg?.customFields || []).map(cf => {
    const val = fatura[`_cf_${cf.id}`] ?? "";
    if (!val) return "";
    const label = cf.label.EN || cf.label.TR || "";
    return `<div style="margin-bottom:10px;"><div class="lbl">${label}</div><div class="val">${val}</div></div>`;
  }).join("");

  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; margin: 0; padding: 20px; color: #1a1a1a; background: #fff; }
    @media print { @page { margin: 10mm 12mm; size: A4; } body { padding: 0; } }
    table.items { width: 100%; border-collapse: collapse; }
    table.items th { background: #1a1a1a; color: #fff; padding: 5px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: .5px; }
    .lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #888; margin-bottom: 3px; }
    .val { font-size: 10.5px; line-height: 1.6; }
  </style></head><body>
  <table style="width:100%;margin-bottom:16px;">
    <tr>
      <td style="vertical-align:top;">${logo}</td>
      <td style="text-align:right;vertical-align:top;">
        <div style="font-size:22px;font-weight:900;letter-spacing:2px;color:#1a1a1a;">${L.title}</div>
        <div style="margin-top:4px;font-size:10px;">
          <span class="lbl">${L.invoiceNoLabel}:&nbsp;</span><b>${fatura.no || "—"}</b>&emsp;
          <span class="lbl">${L.dateLabel}:&nbsp;</span><b>${tarihEN}</b>
        </div>
      </td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10px;">
    <tr>
      <td style="width:50%;vertical-align:top;padding-right:8px;">
        <div style="background:#f8f9fa;border-radius:6px;border:1px solid #e2e8f0;overflow:hidden;height:100%;">
          <div style="background:#1a1a1a;color:#fff;font-weight:700;font-size:9.5px;letter-spacing:.5px;padding:4px 8px;">${L.fromLabel}</div>
          <div style="padding:10px 12px;">
            <div style="font-weight:700;font-size:11px;margin-bottom:4px;">${f.evrakFirmaAdi || f.name || ""}</div>
            ${[f.adres || f.address || "", [f.country, f.city].filter(Boolean).join(", ")].filter(Boolean).length ? `<div style="font-size:9.5px;color:#475569;line-height:1.7;">${[f.adres || f.address || "", [f.country, f.city].filter(Boolean).join(", ")].filter(Boolean).join("<br>")}</div>` : ""}
            ${[f.phone, f.email].filter(Boolean).length ? `<div style="font-size:9px;color:#64748b;margin-top:4px;">${[f.phone, f.email].filter(Boolean).join("  ·  ")}</div>` : ""}
          </div>
        </div>
      </td>
      <td style="width:50%;vertical-align:top;">
        <div style="background:#f8f9fa;border-radius:6px;border:1px solid #e2e8f0;overflow:hidden;height:100%;">
          <div style="background:#475569;color:#fff;font-weight:700;font-size:9.5px;letter-spacing:.5px;padding:4px 8px;">${L.billToLabel}</div>
          <table style="width:100%;border-collapse:collapse;font-size:10px;">
            <tr>
              <td style="padding:4px 8px 2px;color:#888;font-size:9px;font-weight:600;width:35%;">COMPANY</td>
              <td style="padding:4px 8px 2px;font-weight:700;font-size:11px;color:#1a1a1a;">${fatura.firma || "—"}</td>
            </tr>
            ${!isH("alici", "adres") && fatura.adres ? `<tr style="background:#fff;"><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">ADDRESS</td><td style="padding:2px 8px;">${fatura.adres.replace(/\n/g, "<br>")}</td></tr>` : ""}
            ${(!isH("alici", "ulke") || !isH("alici", "sehir")) && (fatura.ulke || fatura.sehir) ? `<tr><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">COUNTRY / CITY</td><td style="padding:2px 8px;">${[!isH("alici", "ulke") ? (COUNTRY_EN[fatura.ulke] || fatura.ulke) : "", !isH("alici", "sehir") ? fatura.sehir : ""].filter(Boolean).join(", ")}</td></tr>` : ""}
            ${!isH("alici", "vatId") && fatura.vatId ? `<tr style="background:#fff;"><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">VAT ID</td><td style="padding:2px 8px;">${fatura.vatId}</td></tr>` : ""}
            ${!isH("alici", "localTaxNo") && fatura.localTaxNo ? `<tr><td style="padding:2px 8px 4px;color:#888;font-size:9px;font-weight:600;">LOCAL TAX NO</td><td style="padding:2px 8px 4px;">${fatura.localTaxNo}</td></tr>` : ""}
          </table>
        </div>
      </td>
    </tr>
  </table>

  <table class="items" style="margin-bottom:14px;">
    <thead><tr>
      <th style="text-align:center;width:32px;">#</th>
      <th style="text-align:left;">${L.thDescription}</th>
      ${hasSeriNo ? `<th style="text-align:center;width:110px;">${L.thSerialNo}</th>` : ""}
      <th style="text-align:center;width:50px;">${L.thQty}</th>
      <th style="text-align:right;width:130px;">${L.thUnitPrice}</th>
      <th style="text-align:right;width:130px;">${L.thAmount}</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <table style="width:100%;margin-bottom:14px;">
    <tr>
      <td style="vertical-align:top;padding-right:16px;width:55%;">
        ${!isH("belge", "payment") && fatura.payment ? `<div style="margin-bottom:8px;"><div class="lbl">${L.paymentLabel}</div><div class="val">${fatura.payment}</div></div>` : ""}
        ${!isH("belge", "delivery") && fatura.delivery ? `<div style="margin-bottom:8px;"><div class="lbl">${L.deliveryLabel}</div><div class="val">${fatura.delivery}</div></div>` : ""}
        ${packingText ? `<div style="margin-bottom:8px;"><div class="lbl">${L.packingLabel}</div><div class="val">${packingText}</div></div>` : ""}
        ${!isH("belge", "gtipNo") && fatura.gtipNo ? `<div style="margin-bottom:8px;"><div class="lbl">${L.gtipLabel}</div><div class="val">${fatura.gtipNo}</div></div>` : ""}
        ${!isH("belge", "origin") && fatura.origin ? `<div style="margin-bottom:8px;"><div class="lbl">${L.originLabel}</div><div class="val">${fatura.origin}</div></div>` : ""}
        ${!isH("belge", "kur") && fatura.kur ? `<div style="margin-bottom:8px;"><div class="lbl">${L.exchangeRateLabel}</div><div class="val">${fatura.kur}</div></div>` : ""}
        ${!isH("paketleme", "not") && fatura.not ? `<div style="margin-bottom:8px;"><div class="lbl">${L.notesLabel}</div><div class="val">${fatura.not}</div></div>` : ""}
        ${cfRows}
      </td>
      <td style="vertical-align:top;">
        ${bankHtml ? `<div style="margin-bottom:12px;"><div class="lbl">${L.bankLabel}</div><div class="val" style="font-size:9.5px;">${bankHtml}</div></div>` : ""}
        <div style="border-top:2px solid #1a1a1a;padding-top:8px;text-align:right;">
          <div style="font-size:9.5px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">${L.totalLabel}</div>
          <div style="font-size:18px;font-weight:900;">${cur} ${fmt2(total)}</div>
          <div style="font-size:9px;color:#555;font-style:italic;margin-top:4px;">${amountWords}</div>
        </div>
        ${kaseResmi ? `<div style="margin-top:24px;text-align:right;"><img src="${kaseResmi}" style="max-height:80px;max-width:150px;object-fit:contain;" alt="kaşe"></div>` : ""}
      </td>
    </tr>
  </table>
  </body></html>`;
}
