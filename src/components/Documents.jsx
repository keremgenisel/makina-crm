import { useState, useMemo } from "react";
import { today, uid, parseMoney, trLower, stripAutoPrint, fmtTR, withoutDeleted } from "../lib/utils";
import { Icon, Field, Input, Warn, Select, Btn, Modal, ConfirmDialog, Pagination, EMAIL_RE } from "./ui";
import { useFilteredList } from "../hooks/useFilteredList";
import LOGO_B64 from "../assets/logo.avif?inline";

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
    firma: "", yetkili: "", tel: "", vergiNo: "", vergiDairesi: "", adres: "", email: "",
    authority: "", forwarder: fv("forwarder", "Huriye ALTUNTAŞ - Makina Dişli ve Yedek Parça İmali"),
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
  const label = (dil === "EN" && cf.label.EN) ? cf.label.EN : cf.label.TR;
  if (cf.type === "select") {
    const options = cf.options || [];
    return (
      <Field label={label}>
        <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
          <option value="">—</option>
          {options.map((opt, i) => {
            const display = (dil === "EN" && opt.EN) ? opt.EN : opt.TR;
            return <option key={i} value={opt.TR}>{display}</option>;
          })}
        </select>
      </Field>
    );
  }
  const listId = cf.suggestions ? `cf-datalist-${cf.id}` : undefined;
  return (
    <Field label={label}>
      <input value={value} onChange={e => onChange(e.target.value)} style={inputStyle} list={listId} />
      {listId && (
        <datalist id={listId}>
          {cf.suggestions.split(",").map(s => s.trim()).filter(Boolean).map(s => <option key={s} value={s} />)}
        </datalist>
      )}
    </Field>
  );
};

export const Documents = ({
  teklifler, setTeklifler,
  customers,
  allModels = [],
  factory,
  appSettings = {},
  showToast = () => {},
  kalipDefs = [],
  parts = [],
}) => {
  const evrakFormConfig = appSettings?.evrakFormConfig || null;

  const isFieldHidden = (type, section, key) =>
    (evrakFormConfig?.[type]?.hiddenFields?.[section] || []).includes(key);

  const getFieldLabel = (type, section, key, fallbackTR) => {
    const lbl = evrakFormConfig?.[type]?.fieldLabels?.[section]?.[key];
    return lbl?.TR || fallbackTR;
  };

  const cfOf = (type, section) =>
    (evrakFormConfig?.[type]?.customFields || []).filter(cf => cf.section === section);

  const getCfValue = (cfId) => form?.customFieldValues?.[cfId] ?? "";
  const setCfValue = (cfId, val) =>
    setForm(p => p ? ({ ...p, customFieldValues: { ...(p.customFieldValues || {}), [cfId]: val } }) : p);

  const [subTab, setSubTab] = useState("teklif"); // "teklif" | "proforma"
  const [form, setForm] = useState(null); // null = form kapalı
  const [confirmDel, setConfirmDel] = useState(null);

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
    const newForm = {
      ...t,
      id: null,
      type: "proforma",
      no: nextDocNo(liveTeklifler, "proforma"),
      parentTeklifId: t.id,
      dil,
      kdvOrani: dil === "EN" ? "0" : t.kdvOrani,
      odemeSekli: D.odemeSekli,
      teslimSekli: D.teslimSekli,
      teslimSuresi: D.teslimSuresi,
      ek: D.ek,
      not: "",
      teslimYeri: t.teslimYeri || D.teslimYeri,
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

  // ── Kaydet ──
  const PROFORMA_SYNC_FIELDS = ["firma", "yetkili", "tel", "vergiNo", "vergiDairesi", "adres", "email", "authority", "forwarder", "satirlar", "iskonto", "currency", "kur", "kurRate", "gtipNo", "teslimYeri"];

  const save = () => {
    if (!form.firma.trim()) { showToast("Firma adı girilmedi.", "err"); return; }
    if (form.type === "teklif" && !form.no.trim()) { showToast("Teklif numarası girilmedi.", "err"); return; }
    const entry = { ...form };
    const isUpdate = !!form.id;
    if (!entry.id) entry.id = uid();
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
    showToast(isUpdate ? (linkedUpdated ? `Belge güncellendi. ${linkedLabel}` : "Belge güncellendi.") : "Belge kaydedildi.");
    setForm(null);
  };

  // ── Sil ──
  const del = (id) => {
    setTeklifler(p => p.map(t => t.id === id ? { ...t, deletedAt: today() } : t));
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
    const res = await window.appMail.send({ to: mailDraft.to.trim(), subject: mailDraft.subject, text: mailDraft.text, pdfHtml: mailDraft.pdfHtml, pdfFileName: mailDraft.pdfFileName });
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
          <Btn onClick={() => openNew("teklif")}><Icon name="plus" size={14} /> Yeni Teklif</Btn>
          <button onClick={() => openNew("proforma")} style={{ padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", whiteSpace: "nowrap" }}>
            <Icon name="plus" size={14} /> Yeni Proforma
          </button>
        </div>
      </div>

      {/* Alt sekme */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "2px solid #f1f5f9", paddingBottom: 0 }}>
        {[["teklif","Teklifler"],["proforma","Proformalar"]].map(([id, label]) => (
          <button key={id} onClick={() => { setSubTab(id); setPage(1); setSearch(""); }} style={{
            padding: "8px 18px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13.5,
            borderBottom: subTab === id ? "2px solid #e85d1a" : "2px solid transparent",
            color: subTab === id ? "#e85d1a" : "#94a3b8",
            background: "transparent", marginBottom: -2,
          }}>{label}</button>
        ))}
      </div>

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
                    onClick={() => openEdit(t)}
                    style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
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
                        <Btn small variant="ghost" onClick={() => openEdit(t)}><Icon name="edit" size={12} /></Btn>
                        <Btn small variant="ghost" onClick={() => printDoc(t)} title="Yazdır / PDF Kaydet"><Icon name="print" size={12} /></Btn>
                        <Btn small variant="ghost" onClick={() => openMailDoc(t)} title="E-posta ile Gönder"><Icon name="mail" size={12} /></Btn>
                        {subTab === "teklif" && (
                          <Btn small variant="ghost" onClick={() => convertToProforma(t)}
                            title={hasProforma ? "Proforma mevcut" : "Proformaya Dönüştür"}
                            style={{ color: hasProforma ? "#94a3b8" : "#0369a1", opacity: hasProforma ? 0.5 : 1 }}>
                            <Icon name="arrowRight" size={12} />
                          </Btn>
                        )}
                        <Btn small variant="danger" onClick={() => setConfirmDel(t.id)}><Icon name="trash" size={12} /></Btn>
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

      {confirmDel && (
        <ConfirmDialog
          message="Bu belge silinecek. Bu işlem geri alınamaz."
          onConfirm={() => del(confirmDel)}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {mailDraft && <MailModal mailDraft={mailDraft} setMailDraft={setMailDraft} mailSendState={mailSendState} sendMailDraft={sendMailDraft} previewMailAttachment={previewMailAttachment} />}

      {/* ── FORM MODAL ──────────────────────────────────────────────────────── */}
      {form && (
      <Modal wide maxWidth={1180} maxHeight="88vh"
        title={form.id ? "Belgeyi Düzenle" : (form.type === "teklif" ? "Yeni Teklif" : "Yeni Proforma")}
        onClose={() => setForm(null)}>
        {/* Durum + Kaydet */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <select value={form.durum} onChange={e => setForm(p => ({ ...p, durum: e.target.value }))}
            style={{ width: 130, padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", boxSizing: "border-box" }}>
            {DURUM_OPTS.map(d => <option key={d} value={d}>{DURUM_LABEL[d]}</option>)}
          </select>
          <Btn onClick={save}><Icon name="check" size={14} /> Kaydet</Btn>
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
                    setForm(p => ({ ...p, customerId: c.id, firma: c.name || "", yetkili: c.yetkili1Ad || "", tel: c.yetkili1Tel || c.phone || "", adres: c.adres || "" }));
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
            {!isFieldHidden(form.type, "alici", "yetkili") && <Field label={getFieldLabel(form.type, "alici", "yetkili", "Yetkili", "Authority")}><input {...f("yetkili")} style={inputStyle} /></Field>}
            {!isFieldHidden(form.type, "alici", "tel") && <Field label={getFieldLabel(form.type, "alici", "tel", "Telefon", "Phone")}><input {...f("tel")} style={inputStyle} /></Field>}
            {!isFieldHidden(form.type, "alici", "vergiNo") && <Field label={getFieldLabel(form.type, "alici", "vergiNo", "Vergi No", "Tax No")}><input {...f("vergiNo")} style={inputStyle} /></Field>}
            {!isFieldHidden(form.type, "alici", "vergiDairesi") && <Field label={getFieldLabel(form.type, "alici", "vergiDairesi", "Vergi Dairesi", "Tax Office")}><input {...f("vergiDairesi")} style={inputStyle} /></Field>}
          </div>
          {!isFieldHidden(form.type, "alici", "adres") && <Field label={getFieldLabel(form.type, "alici", "adres", "Adres", "Address")}><textarea {...f("adres")} style={taStyle} /></Field>}
          {!isFieldHidden(form.type, "alici", "email") && <Field label={getFieldLabel(form.type, "alici", "email", "E-posta", "Email")}><input {...f("email")} style={inputStyle} /></Field>}
          {cfOf(form.type, "alici").map(cf => (
            <CfInput key={cf.id} cf={cf} dil={form.dil} value={getCfValue(cf.id)} onChange={v => setCfValue(cf.id, v)} inputStyle={inputStyle} />
          ))}
        </div>

        {/* Belge Detayları */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .6, marginBottom: 14 }}>Belge Detayları</div>
          {!isFieldHidden(form.type, "belge", "forwarder") && (
            <Field label={form.dil === "EN" ? "Forwarder" : "Gönderen (Forwarder)"}><input {...f("forwarder")} style={inputStyle} placeholder={form.dil === "EN" ? "Forwarder name" : "Gönderen adı"} /></Field>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {form.type === "teklif" && (
              <Field label="Teklif No"><input {...f("no")} style={inputStyle} /></Field>
            )}
            <Field label="Tarih"><input type="date" {...f("tarih")} style={inputStyle} /></Field>
            <Field label="Dil">
              <select value={form.dil} onChange={e => {
                const dil = e.target.value;
                const D = FORM_DEFAULTS[dil] || FORM_DEFAULTS.TR;
                setForm(p => ({
                  ...p, dil,
                  kdvOrani: dil === "EN" ? "0" : p.kdvOrani,
                  odemeSekli: D.odemeSekli,
                  teslimSekli: D.teslimSekli,
                  teslimSuresi: D.teslimSuresi,
                  not: p.type === "proforma" ? p.not : D.notTeklif,
                  ek: D.ek,
                  teklifGecerlilik: p.type === "teklif" ? D.teklifGecerlilik : "",
                  teslimYeri: p.type === "proforma" ? D.teslimYeri : p.teslimYeri,
                }));
              }} style={inputStyle}>
                <option value="TR">Türkçe (TR)</option>
                <option value="EN">English (EN)</option>
              </select>
            </Field>
            <Field label="Para Birimi">
              <select value={form.currency} onChange={e => {
                const cur = e.target.value;
                setForm(p => ({ ...p, currency: cur }));
                fetchAndSetRate(cur);
              }} style={inputStyle}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c} — {CUR_LABEL[c]}</option>)}
              </select>
            </Field>
            <Field label="KDV Oranı (%)"><input {...f("kdvOrani")} type="number" min="0" max="100" style={inputStyle} /></Field>
            {form.type === "proforma" && !isFieldHidden(form.type, "belge", "gtipNo") && (
              <Field label="GTIP No"><input {...f("gtipNo")} style={inputStyle} placeholder="8438 50 00 00 00" /></Field>
            )}
            {!isFieldHidden(form.type, "belge", "modelYiliDegeri") && (
              <Field label="Model Yılı" style={{ gridColumn: "1 / -1" }}>
                <input {...f("modelYiliDegeri")} style={inputStyle} placeholder={`${new Date().getFullYear()} — Yeni ve Kullanılmamıştır`} />
              </Field>
            )}
            {form.type === "proforma" && form.currency !== "TRY" && !isFieldHidden(form.type, "belge", "kur") && (
              <Field label="Kur (Bugün)"><input {...f("kur")} style={inputStyle} placeholder="1 EUR = 38,50 TL" /></Field>
            )}
          </div>
          {form.type === "proforma" && !isFieldHidden(form.type, "belge", "teslimYeri") && (
            <Field label="Teslim Yeri / Gümrük Notu">
              <textarea {...f("teslimYeri")} style={taStyle} />
            </Field>
          )}
          {form.type === "proforma" && !isFieldHidden(form.type, "belge", "not") && (
            <Field label="Not (Proforma)">
              <textarea {...f("not")} style={taStyle} />
            </Field>
          )}
          {form.type === "proforma" && !isFieldHidden(form.type, "belge", "ek") && (
            <Field label="Ek Bilgi">
              <textarea {...f("ek")} style={taStyle} />
            </Field>
          )}
          {cfOf(form.type, "belge").map(cf => (
            <CfInput key={cf.id} cf={cf} dil={form.dil} value={getCfValue(cf.id)} onChange={v => setCfValue(cf.id, v)} inputStyle={inputStyle} />
          ))}
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
            {!isFieldHidden("teklif", "kosullar", "odemeSekli") && <Field label="Ödeme Şekli"><input {...f("odemeSekli")} style={inputStyle} /></Field>}
            {!isFieldHidden("teklif", "kosullar", "teslimSekli") && <Field label="Teslim Şekli"><input {...f("teslimSekli")} style={inputStyle} /></Field>}
          </div>
          {!isFieldHidden("teklif", "kosullar", "teslimYeri") && (
            <Field label="Teslim Yeri / Gümrük Notu">
              <textarea {...f("teslimYeri")} style={taStyle} />
            </Field>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {!isFieldHidden("teklif", "kosullar", "teslimSuresi") && <Field label="Teslim Süresi"><input {...f("teslimSuresi")} style={inputStyle} /></Field>}
            {!isFieldHidden("teklif", "kosullar", "teslimTarihi") && <Field label="Teslim Tarihi"><input type="date" {...f("teslimTarihi")} style={inputStyle} /></Field>}
            {!isFieldHidden("teklif", "kosullar", "teklifGecerlilik") && <Field label="Teklif Geçerlilik Süresi"><input {...f("teklifGecerlilik")} style={inputStyle} /></Field>}
            {!isFieldHidden("teklif", "kosullar", "kur") && <Field label="Kur (Bugün)"><input {...f("kur")} style={inputStyle} placeholder="1 EUR = 52,00 TL" /></Field>}
          </div>
          {!isFieldHidden("teklif", "kosullar", "not") && <Field label="Not"><textarea {...f("not")} style={taStyle} /></Field>}
          {cfOf("teklif", "kosullar").map(cf => (
            <CfInput key={cf.id} cf={cf} dil={form.dil} value={getCfValue(cf.id)} onChange={v => setCfValue(cf.id, v)} inputStyle={inputStyle} />
          ))}
        </div>
      )}

      {/* Alt kaydet */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingBottom: 20 }}>
        <Btn variant="ghost" onClick={() => setForm(null)}>Vazgeç</Btn>
        <Btn onClick={save}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>
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
    alici: { yetkili: { TR: "Yetkili / Tel", EN: "Authority" }, vergiNo: { TR: "Vergi No / Dairesi", EN: "Tax No / Office" }, adres: { TR: "Adres", EN: "Address" } },
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
          <td style="padding:3px 12px;color:#888;font-size:10.5px;font-weight:600;width:30%;">${label}</td>
          <td style="padding:3px 12px;">${value}</td>
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

  const companyName = f.name || "ALTUNTAŞ MAKİNA SANAYİ";
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
        <div style="font-size:${enProforma ? "15px;font-weight:800;color:#1a1a1a" : "10.5px;color:#555"};margin-top:${enProforma ? "0" : "6px"};line-height:1.6;">${enProforma ? (form.forwarder || companyName) : companyAddr}</div>
        ${!enProforma && [companyPhone, companyEmail].filter(Boolean).length ? `<div style="font-size:10.5px;color:#555;">${[companyPhone, companyEmail].filter(Boolean).join("  ·  ")}</div>` : ""}
        ${enProforma ? `<div style="font-size:10.5px;color:#555;margin-top:4px;line-height:1.6;">${companyAddr}</div>${[companyPhone, companyEmail].filter(Boolean).length ? `<div style="font-size:10.5px;color:#555;">${[companyPhone, companyEmail].filter(Boolean).join("  ·  ")}</div>` : ""}` : ""}
      </td>
      <td style="text-align:right;vertical-align:middle;white-space:nowrap;">
        <div style="display:inline-block;background:${BRAND};color:#fff;padding:10px 20px;border-radius:6px;text-align:center;">
          <div style="font-size:16px;font-weight:900;letter-spacing:1px;">${L.title}</div>
          ${!isProforma && form.no ? `<div style="font-size:12px;margin-top:4px;opacity:.9;">${form.no}</div>` : ""}
          <div style="font-size:12px;margin-top:4px;opacity:.9;">${fmtTR(form.tarih) || ""}</div>
        </div>
      </td>
    </tr>
  </table>
  <div style="height:3px;background:${BRAND};border-radius:2px;margin-bottom:14px;"></div>`;

  // ── ALICI + BELGE BİLGİLERİ ─────────────────────────────────────────────
  const infoSection = `
  <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:12px;">
    <tr>
      <td style="width:55%;vertical-align:top;padding-right:10px;">
        <div style="background:#f8f9fa;border-radius:6px;border:1px solid #e2e8f0;overflow:hidden;">
          <div style="background:${BRAND};color:#fff;font-weight:700;font-size:11px;letter-spacing:.5px;padding:6px 12px;">${L.alicrLabel}</div>
          <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
            <tr>
              <td style="padding:6px 12px 3px;color:#888;font-size:10.5px;font-weight:600;width:30%;">${L.firmLabel}</td>
              <td style="padding:6px 12px 3px;font-weight:700;font-size:13px;color:#1a1a1a;">${form.firma || "—"}</td>
            </tr>
            ${!isHiddenPrint("alici", "yetkili") || !isHiddenPrint("alici", "tel") ? `<tr>
              <td style="padding:3px 12px;color:#888;font-size:10.5px;font-weight:600;">${fl("alici", "yetkili")}</td>
              <td style="padding:3px 12px;">${[!isHiddenPrint("alici", "yetkili") ? form.yetkili : "", !isHiddenPrint("alici", "tel") ? form.tel : ""].filter(Boolean).join("  /  ") || "—"}</td>
            </tr>` : ""}
            ${form.authority && !isHiddenPrint("alici", "yetkili") ? `<tr>
              <td style="padding:3px 12px;color:#888;font-size:10.5px;font-weight:600;">${fl("alici", "yetkili")}</td>
              <td style="padding:3px 12px;">${form.authority}</td>
            </tr>` : ""}
            ${(form.vergiNo || form.vergiDairesi) && !isHiddenPrint("alici", "vergiNo") && !isHiddenPrint("alici", "vergiDairesi") ? `<tr>
              <td style="padding:3px 12px;color:#888;font-size:10.5px;font-weight:600;">${fl("alici", "vergiNo")}</td>
              <td style="padding:3px 12px;">${[form.vergiNo, form.vergiDairesi].filter(Boolean).join("  /  ")}</td>
            </tr>` : ""}
            ${form.adres && !isHiddenPrint("alici", "adres") ? `<tr>
              <td style="padding:3px 12px 8px;color:#888;font-size:10.5px;font-weight:600;vertical-align:top;">${fl("alici", "adres")}</td>
              <td style="padding:3px 12px 8px;">${form.adres}</td>
            </tr>` : `<tr><td colspan="2" style="padding:4px;"></td></tr>`}
            ${cfRowsHtml("alici")}
          </table>
        </div>
      </td>
      <td style="width:45%;vertical-align:top;">
        <div style="background:#f8f9fa;border-radius:6px;border:1px solid #e2e8f0;overflow:hidden;">
          <div style="background:#475569;color:#fff;font-weight:700;font-size:11px;letter-spacing:.5px;padding:6px 12px;">${L.docLabel}</div>
          <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
            ${form.forwarder && !isHiddenPrint("belge", "forwarder") ? `<tr>
              <td style="padding:6px 12px 3px;color:#888;font-size:10.5px;font-weight:600;width:42%;">${fl("belge", "forwarder")}</td>
              <td style="padding:6px 12px 3px;font-weight:700;">${form.forwarder}</td>
            </tr>` : ""}
            ${!isProforma ? `<tr>
              <td style="padding:${form.forwarder ? "3px" : "6px"} 12px 3px;color:#888;font-size:10.5px;font-weight:600;width:42%;">${L.noLabel}</td>
              <td style="padding:${form.forwarder ? "3px" : "6px"} 12px 3px;font-weight:700;">${form.no || "—"}</td>
            </tr>` : ""}
            <tr>
              <td style="padding:${isProforma && !form.forwarder ? "6px" : "3px"} 12px 3px;color:#888;font-size:10.5px;font-weight:600;">${L.tarihLabel}</td>
              <td style="padding:${isProforma ? "6px" : "3px"} 12px 3px;">${fmtTR(form.tarih) || ""}</td>
            </tr>
            ${!isHiddenPrint("belge", "modelYiliDegeri") ? `<tr>
              <td style="padding:3px 12px;color:#888;font-size:10.5px;font-weight:600;">${L.modelYiliLabel}</td>
              <td style="padding:3px 12px;">${form.modelYiliDegeri || L.newUnused}</td>
            </tr>` : ""}
            ${form.currency !== "TRY" && form.kur && !isHiddenPrint("belge", "kur") ? `<tr>
              <td style="padding:3px 12px;color:#888;font-size:10.5px;font-weight:600;">${fl("belge", "kur")}</td>
              <td style="padding:3px 12px;">${form.kur}</td>
            </tr>` : ""}
            ${isProforma && form.teslimYeri && !isHiddenPrint("belge", "teslimYeri") ? `<tr>
              <td style="padding:3px 12px 8px;color:#888;font-size:10.5px;font-weight:600;vertical-align:top;">${fl("belge", "teslimYeri")}</td>
              <td style="padding:3px 12px 8px;font-size:11px;">${form.teslimYeri}</td>
            </tr>` : `<tr><td colspan="2" style="padding:4px;"></td></tr>`}
            ${cfRowsHtml("belge")}
          </table>
        </div>
      </td>
    </tr>
  </table>`;

  // ── EN PROFORMA BİLGİ TABLOSU (4 sütun) ──────────────────────────────────
  const vergiStr = [form.vergiNo, form.vergiDairesi].filter(Boolean).join(" / ");
  const infoSectionEN = `
  <div style="text-align:right;font-size:11px;color:#555;margin-bottom:6px;">Date: ${fmtTR(form.tarih) || ""}</div>
  <table style="width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:14px;border:1px solid #dde3ea;border-radius:6px;overflow:hidden;">
    <tr style="background:#f8f9fa;">
      <td style="padding:7px 12px;font-weight:700;color:#475569;width:14%;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">COMPANY</td>
      <td style="padding:7px 12px;font-weight:700;color:#1a1a1a;width:36%;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">${form.firma || "—"}</td>
      <td style="padding:7px 12px;font-weight:700;color:#475569;width:16%;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">${fl("alici", "yetkili")}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #e2e8f0;">${form.authority || form.yetkili || "—"}</td>
    </tr>
    <tr style="background:#fff;">
      <td style="padding:7px 12px;font-weight:700;color:#475569;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">Tax Administration</td>
      <td style="padding:7px 12px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">${vergiStr || "—"}</td>
      <td style="padding:7px 12px;font-weight:700;color:#475569;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">ADDRESS</td>
      <td style="padding:7px 12px;border-bottom:1px solid #e2e8f0;">${form.adres || "—"}</td>
    </tr>
    <tr style="background:#f8f9fa;">
      <td style="padding:7px 12px;font-weight:700;color:#475569;border-right:1px solid #e2e8f0;${form.teslimYeri ? "border-bottom:1px solid #e2e8f0;" : ""}">Telephone:</td>
      <td style="padding:7px 12px;border-right:1px solid #e2e8f0;${form.teslimYeri ? "border-bottom:1px solid #e2e8f0;" : ""}">${form.tel || "—"}</td>
      <td style="padding:7px 12px;font-weight:700;color:#475569;border-right:1px solid #e2e8f0;${form.teslimYeri ? "border-bottom:1px solid #e2e8f0;" : ""}">${L.forwarderLabel}</td>
      <td style="padding:7px 12px;${form.teslimYeri ? "border-bottom:1px solid #e2e8f0;" : ""}">${form.forwarder || "—"}</td>
    </tr>
    ${form.currency !== "TRY" && form.kur ? `<tr style="background:#fff;">
      <td style="padding:7px 12px;font-weight:700;color:#475569;border-right:1px solid #e2e8f0;${form.teslimYeri ? "border-bottom:1px solid #e2e8f0;" : ""}">${fl("belge", "kur")}</td>
      <td colspan="3" style="padding:7px 12px;${form.teslimYeri ? "border-bottom:1px solid #e2e8f0;" : ""}">${form.kur}</td>
    </tr>` : ""}
    ${form.teslimYeri ? `<tr style="background:${form.currency !== "TRY" && form.kur ? "#f8f9fa" : "#fff"};">
      <td style="padding:7px 12px;font-weight:700;color:#475569;border-right:1px solid #e2e8f0;">${fl("belge", "teslimYeri")}</td>
      <td colspan="3" style="padding:7px 12px;">${form.teslimYeri}</td>
    </tr>` : ""}
  </table>`;

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
      <td style="text-align:center;padding:8px 6px;border-bottom:1px solid #e8ecf0;color:#888;font-size:11px;">${i + 1}</td>
      <td style="padding:8px 8px;border-bottom:1px solid #e8ecf0;font-weight:700;font-size:11px;color:${BRAND};">${item.kod || ""}</td>
      <td style="padding:8px 8px;border-bottom:1px solid #e8ecf0;font-weight:600;font-size:11.5px;">
        ${item.resim ? `<img src="${item.resim}" style="width:60px;height:45px;object-fit:contain;display:block;margin-bottom:4px;border-radius:4px;border:1px solid #e8ecf0;">` : ""}
        ${item.makinaAdi || ""}
      </td>
      <td style="padding:8px 8px;border-bottom:1px solid #e8ecf0;font-size:10.5px;color:#444;line-height:1.5;">${(item.tanim || "").replace(/\n/g, "<br>")}</td>
      <td style="text-align:center;padding:8px 6px;border-bottom:1px solid #e8ecf0;font-weight:600;">${item.miktar || 1}</td>
      <td style="text-align:right;padding:8px 10px;border-bottom:1px solid #e8ecf0;white-space:nowrap;">${birimHtml}</td>
      <td style="text-align:right;padding:8px 10px;border-bottom:1px solid #e8ecf0;font-weight:700;white-space:nowrap;">${tutarHtml}</td>
    </tr>`;
  }).join("");

  const totalPrintItems = (form.satirlar || []).reduce((s, r) => s + (r.subItems || []).length, 0);
  const emptyRows = Math.max(0, 3 - totalPrintItems);
  const emptyHtml = Array(emptyRows).fill(`<tr style="background:#fff;"><td colspan="7" style="padding:14px;border-bottom:1px solid #e8ecf0;"></td></tr>`).join("");

  const productTable = `
  <div style="border-radius:8px;border:1px solid #dde3ea;overflow:hidden;margin-bottom:12px;">
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:${BRAND};">
          <th style="padding:8px 6px;text-align:center;color:#fff;font-size:10.5px;font-weight:700;width:4%;">${L.thSira}</th>
          <th style="padding:8px 8px;text-align:left;color:#fff;font-size:10.5px;font-weight:700;width:9%;">${L.thKod}</th>
          <th style="padding:8px 8px;text-align:left;color:#fff;font-size:10.5px;font-weight:700;width:17%;">${L.thAd}</th>
          <th style="padding:8px 8px;text-align:left;color:#fff;font-size:10.5px;font-weight:700;">${L.thTanim}</th>
          <th style="padding:8px 6px;text-align:center;color:#fff;font-size:10.5px;font-weight:700;width:6%;">${L.thMiktar}</th>
          <th style="padding:8px 10px;text-align:right;color:#fff;font-size:10.5px;font-weight:700;width:14%;">${L.thBirimFiyat}</th>
          <th style="padding:8px 10px;text-align:right;color:#fff;font-size:10.5px;font-weight:700;width:14%;">${L.thTutar}</th>
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
  <div style="display:flex;justify-content:flex-end;margin-bottom:14px;">
    <div style="min-width:280px;border-radius:8px;border:1px solid #dde3ea;overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        ${totals.iskonto > 0 ? `
        <tr style="background:#f8f9fa;">
          <td style="padding:7px 14px;color:#555;font-weight:600;">${L.subtotalLabel}</td>
          <td style="padding:7px 14px;text-align:right;font-weight:600;">${fmt2(totals.toplam)}</td>
        </tr>
        <tr style="background:#f1f5f9;">
          <td style="padding:7px 14px;color:#475569;font-weight:600;">${L.iskontoLabel}</td>
          <td style="padding:7px 14px;text-align:right;color:#475569;font-weight:600;">− ${fmt2(totals.iskonto)}</td>
        </tr>
        <tr style="background:#f8f9fa;">
          <td style="padding:7px 14px;color:#555;font-weight:600;">${L.netLabel}</td>
          <td style="padding:7px 14px;text-align:right;font-weight:600;">${fmt2(totals.araToplam)}</td>
        </tr>` : `
        <tr style="background:#f8f9fa;">
          <td style="padding:7px 14px;color:#555;font-weight:600;">${L.subtotalLabel}</td>
          <td style="padding:7px 14px;text-align:right;font-weight:600;">${fmt2(totals.toplam)}</td>
        </tr>`}
        ${parseFloat(form.kdvOrani) > 0 ? `
        <tr style="background:#f8f9fa;">
          <td style="padding:7px 14px;color:#555;font-weight:600;">${L.kdvLabel}</td>
          <td style="padding:7px 14px;text-align:right;">${fmt2(totals.kdv)}</td>
        </tr>` : ""}
        <tr style="background:${BRAND};">
          <td style="padding:10px 14px;color:#fff;font-weight:800;font-size:13px;">${L.grandLabel}</td>
          <td style="padding:10px 14px;text-align:right;color:#fff;font-weight:900;font-size:14px;">${fmt2(totals.genelToplam)}</td>
        </tr>
      </table>
    </div>
  </div>`;

  // ── NOTLAR / KOŞULLAR (proforma sayfa 1 altı) ─────────────────────────────
  const proformaNotlar = isProforma ? `
  ${(form.not || form.ek) ? `
  <div style="border-radius:6px;border:1px solid #e2e8f0;padding:10px 14px;font-size:10.5px;color:#444;margin-bottom:10px;line-height:1.6;">
    ${form.not ? `<div><b>${fl("belge", "not")}:</b> ${form.not}</div>` : ""}
    ${form.ek ? `<div style="margin-top:4px;">${form.ek}</div>` : ""}
  </div>` : ""}
  ${(bankalar.some(b => b.bankaAdi || b.swift || b.ibanTL || b.ibanEUR || b.ibanUSD) || form.gtipNo) ? `
  <div style="border-radius:6px;background:#f8f9fa;border:1px solid #e2e8f0;padding:10px 14px;font-size:11px;line-height:1.8;">
    <div style="font-weight:700;color:#1a1a1a;font-size:11.5px;margin-bottom:4px;">${L.bankaBaslik}</div>
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

    <div style="font-size:14px;font-weight:800;color:${BRAND};border-bottom:2px solid ${BRAND};padding-bottom:6px;margin-bottom:14px;">${L.koşullarBaslik}</div>

    <table style="width:100%;border-collapse:collapse;font-size:12px;border-radius:8px;overflow:hidden;border:1px solid #dde3ea;margin-bottom:20px;">
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
        <td style="padding:9px 14px;font-weight:700;color:#475569;font-size:11.5px;width:28%;border-right:1px solid #e2e8f0;">${label}</td>
        <td style="padding:9px 14px;color:#1a1a1a;">${val}</td>
      </tr>`).join("")}
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="width:50%;padding-right:12px;vertical-align:top;">
          <div style="border-radius:8px;border:2px solid ${BRAND};padding:14px 16px;">
            <div style="font-weight:800;font-size:12px;color:${BRAND};margin-bottom:10px;">${L.onayBaslik}</div>
            <div style="font-size:10px;color:#888;margin-bottom:8px;">${L.onayAlt}</div>
            <div style="height:40px;"></div>
            <div style="border-bottom:1px solid #999;margin-top:4px;"></div>
          </div>
        </td>
        <td style="width:50%;padding-left:12px;vertical-align:top;">
          ${bankalar.length > 0 ? `
          <div style="border-radius:8px;background:#f8f9fa;border:1px solid #e2e8f0;padding:14px 16px;">
            <div style="font-weight:800;font-size:12px;color:#1a1a1a;margin-bottom:10px;">${L.bankaBaslik}</div>
            ${bankalar.map((b, bi) => `
              ${bi > 0 ? `<div style="border-top:1px solid #e2e8f0;margin:6px 0;"></div>` : ""}
              ${b.bankaAdi ? `<div style="font-size:11px;color:#444;margin-bottom:2px;">${b.bankaAdi}${b.swift ? `  ·  SWIFT: <b>${b.swift}</b>` : ""}</div>` : ""}
              ${b.hesapAdi ? `<div style="font-size:11px;margin-bottom:2px;">${L.hesapAdiLabel}: <b>${b.hesapAdi}</b></div>` : ""}
              ${b.ibanTL ? `<div style="font-size:11px;margin-bottom:2px;">${L.ibanTLLabel}: <b style="font-family:monospace;">${b.ibanTL}</b></div>` : ""}
              ${b.ibanEUR ? `<div style="font-size:11px;margin-bottom:2px;">${L.ibanEURLabel}: <b style="font-family:monospace;">${b.ibanEUR}</b></div>` : ""}
              ${b.ibanUSD ? `<div style="font-size:11px;">${L.ibanUSDLabel}: <b style="font-family:monospace;">${b.ibanUSD}</b></div>` : ""}
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
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; margin: 0; padding: 20px; color: #1a1a1a; background: #fff; }
    @media print {
      @page { margin: 12mm 14mm; size: A4; }
      body { padding: 0; }
    }
  </style>
  </head><body>
  ${page1}
  ${page2}
  </body></html>`;
}
