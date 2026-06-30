import { useState } from "react";
import { Btn, Icon, Modal, Field } from "../ui";
import { Section } from "./Section";
import { DEFAULT_TRANSLATIONS } from "../Documents";
import { uid } from "../../lib/utils";

export const DEFAULT_EVRAK_FORM_CONFIG = {
  teklif: {
    hiddenFields: { alici: [], belge: [], kosullar: [] },
    customFields: [],
    fieldDefaults: {},
    sartlar: [
      { TR: DEFAULT_TRANSLATIONS.TR.sart1, EN: DEFAULT_TRANSLATIONS.EN.sart1 },
      { TR: DEFAULT_TRANSLATIONS.TR.sart2, EN: DEFAULT_TRANSLATIONS.EN.sart2 },
      { TR: DEFAULT_TRANSLATIONS.TR.sart3, EN: DEFAULT_TRANSLATIONS.EN.sart3 },
    ],
    notAlt: { TR: DEFAULT_TRANSLATIONS.TR.notAlt, EN: DEFAULT_TRANSLATIONS.EN.notAlt },
  },
  proforma: {
    hiddenFields: { alici: [], belge: [] },
    customFields: [],
    fieldDefaults: {},
    notAlt: { TR: DEFAULT_TRANSLATIONS.TR.notAlt, EN: DEFAULT_TRANSLATIONS.EN.notAlt },
  },
};

const BUILTIN_ALICI = [
  { key: "yetkili",      label: "Yetkili",      enDefault: "Authority" },
  { key: "tel",          label: "Telefon",       enDefault: "Phone" },
  { key: "vergiNo",      label: "Vergi No",      enDefault: "Tax No" },
  { key: "vergiDairesi", label: "Vergi Dairesi", enDefault: "Tax Office" },
  { key: "adres",        label: "Adres",         enDefault: "Address" },
  { key: "email",        label: "E-posta",       enDefault: "Email" },
];

const BUILTIN_BELGE = {
  teklif: [
    { key: "forwarder",       label: "Gönderen (Forwarder)", enDefault: "Forwarder" },
    { key: "gtipNo",          label: "GTIP No",              enDefault: "GTIP No" },
    { key: "modelYiliDegeri", label: "Model Yılı",           enDefault: "Model Year" },
    { key: "kur",             label: "Kur",                  enDefault: "Exchange Rate" },
  ],
  proforma: [
    { key: "forwarder",       label: "Gönderen (Forwarder)", enDefault: "Forwarder" },
    { key: "gtipNo",          label: "GTIP No",              enDefault: "GTIP No" },
    { key: "modelYiliDegeri", label: "Model Yılı",           enDefault: "Model Year" },
    { key: "kur",             label: "Kur",                  enDefault: "Exchange Rate" },
    { key: "teslimYeri",      label: "Teslim Yeri",          enDefault: "Delivery Point" },
    { key: "not",             label: "Not (Proforma)",       enDefault: "Note" },
    { key: "ek",              label: "Ek Bilgi",             enDefault: "Additional Info" },
  ],
};

const BUILTIN_KOSULLAR = [
  { key: "odemeSekli",       label: "Ödeme Şekli",            enDefault: "Payment Terms" },
  { key: "teslimSekli",      label: "Teslim Şekli",           enDefault: "Delivery Method" },
  { key: "teslimYeri",       label: "Teslim Yeri / Gümrük Notu", enDefault: "Delivery Point" },
  { key: "teslimSuresi",     label: "Teslim Süresi",          enDefault: "Lead Time" },
  { key: "teslimTarihi",     label: "Teslim Tarihi",          enDefault: "Delivery Date" },
  { key: "teklifGecerlilik", label: "Geçerlilik Süresi",      enDefault: "Quote Validity" },
  { key: "kur",              label: "Kur",                    enDefault: "Exchange Rate" },
  { key: "not",              label: "Not",                    enDefault: "Note" },
];

const SECTIONS = {
  teklif: [
    { key: "alici", label: "Alıcı Bilgileri", builtins: BUILTIN_ALICI },
    { key: "belge", label: "Belge Detayları", builtins: BUILTIN_BELGE.teklif },
    { key: "kosullar", label: "Teklif Koşulları (2. Sayfa)", builtins: BUILTIN_KOSULLAR },
  ],
  proforma: [
    { key: "alici", label: "Alıcı Bilgileri", builtins: BUILTIN_ALICI },
    { key: "belge", label: "Belge Detayları", builtins: BUILTIN_BELGE.proforma },
  ],
};

// Hangi bölümlerde hangi alanların varsayılan değeri düzenlenebilir
const FIELD_DEFAULTS_META = {
  teklif: {
    belge: [
      { key: "forwarder", label: "Gönderen (Forwarder)", biDil: true, multiline: true },
    ],
    kosullar: [
      { key: "odemeSekli", label: "Ödeme Şekli", biDil: true },
      { key: "teslimSekli", label: "Teslim Şekli", biDil: true },
      { key: "teslimYeri", label: "Teslim Yeri / Gümrük Notu", biDil: true, multiline: true },
      { key: "teslimSuresi", label: "Teslim Süresi", biDil: true },
      { key: "teklifGecerlilik", label: "Geçerlilik Süresi", biDil: true },
      { key: "not", label: "Not", biDil: true, multiline: true },
    ],
  },
  proforma: {
    belge: [
      { key: "forwarder", label: "Gönderen (Forwarder)", biDil: true, multiline: true },
      { key: "teslimYeri", label: "Teslim Yeri", biDil: true, multiline: true },
      { key: "not", label: "Not (Proforma)", biDil: true, multiline: true },
      { key: "ek", label: "Ek Bilgi", biDil: true, multiline: true },
    ],
  },
};

// Mevcut hardcoded varsayılanlar — fieldDefaults kaydedilmemişse ilk açılışta buradan doldurulur
const FIELD_INITIAL_DEFAULTS = {
  teklif: {
    forwarder: { TR: "Huriye ALTUNTAŞ - Makina Dişli ve Yedek Parça İmali", EN: "Huriye ALTUNTAŞ - Makina Dişli ve Yedek Parça İmali" },
    teslimSuresi: { TR: "SİPARİŞ ONAYINIZA İSTİNADEN OPSİYONLUDUR.", EN: "OPTIONAL UPON ORDER CONFIRMATION." },
    teklifGecerlilik: { TR: "TEKLİF TARİHİNDEN İTİBAREN 3 GÜN GEÇERLİDİR.", EN: "VALID FOR 3 DAYS FROM THE DATE OF QUOTATION." },
    not: { TR: "TÜRKİYE TESLİM FİYATIDIR. YURTDIŞI NAKLİYE, GÜMRÜK, ARDİYE VE VERGİLERİ HARİÇTİR.", EN: "TURKEY DELIVERY PRICE. OVERSEAS FREIGHT, CUSTOMS, WAREHOUSE AND TAXES ARE NOT INCLUDED." },
  },
  proforma: {
    forwarder: { TR: "Huriye ALTUNTAŞ - Makina Dişli ve Yedek Parça İmali", EN: "Huriye ALTUNTAŞ - Makina Dişli ve Yedek Parça İmali" },
    teslimYeri: { TR: "İSTANBUL TUZLA TESLİMDİR. TÜRKİYE GÜMRÜĞÜ GÖNDERİCİYE AİTTİR.", EN: "ISTANBUL TUZLA DELIVERY. TURKEY CUSTOMS BELONGS TO SENDER." },
    ek: { TR: "SİZLERE TESLİMAT İLE İLGİLİ BİLDİRİLEN TARİHTEN İTİBAREN 7 GÜN İÇİNDE ÖDEMESİ YAPILMAYAN SİPARİŞLER İPTAL EDİLECEKTİR.", EN: "ORDERS NOT PAID WITHIN 7 DAYS FROM THE NOTIFIED DATE WILL BE CANCELLED." },
  },
};

const EMPTY_CF = {
  label: { TR: "", EN: "" },
  section: "belge",
  type: "text",
  suggestions: "",
  options: [],
  defaultValue: "",
};

// ── Ana bileşen ────────────────────────────────────────────────────────────────
export const SettingsDocuments = ({ appSettings, setAppSettings, flash }) => {
  const [docType, setDocType] = useState("teklif");

  const [draft, setDraft] = useState(() => {
    const saved = appSettings?.evrakFormConfig;
    const t = appSettings?.translations;

    // Migrate sartlar from old translations format if not yet in evrakFormConfig
    const migratedSartlar = saved?.teklif?.sartlar ?? [
      { TR: t?.TR?.sart1 ?? DEFAULT_TRANSLATIONS.TR.sart1, EN: t?.EN?.sart1 ?? DEFAULT_TRANSLATIONS.EN.sart1 },
      { TR: t?.TR?.sart2 ?? DEFAULT_TRANSLATIONS.TR.sart2, EN: t?.EN?.sart2 ?? DEFAULT_TRANSLATIONS.EN.sart2 },
      { TR: t?.TR?.sart3 ?? DEFAULT_TRANSLATIONS.TR.sart3, EN: t?.EN?.sart3 ?? DEFAULT_TRANSLATIONS.EN.sart3 },
    ];
    const migratedNotAlt = {
      TR: t?.TR?.notAlt ?? DEFAULT_TRANSLATIONS.TR.notAlt,
      EN: t?.EN?.notAlt ?? DEFAULT_TRANSLATIONS.EN.notAlt,
    };

    // Kaydedilen fieldDefaults yoksa FIELD_INITIAL_DEFAULTS'tan doldur (saved değerler öncelikli)
    const initFd = (type) => ({ ...FIELD_INITIAL_DEFAULTS[type], ...(saved?.[type]?.fieldDefaults || {}) });

    return {
      teklif: {
        hiddenFields: { alici: [], belge: [], kosullar: [], ...saved?.teklif?.hiddenFields },
        customFields: saved?.teklif?.customFields || [],
        fieldDefaults: initFd("teklif"),
        fieldLabels: saved?.teklif?.fieldLabels || {},
        sartlar: migratedSartlar,
        notAlt: saved?.teklif?.notAlt || migratedNotAlt,
      },
      proforma: {
        hiddenFields: { alici: [], belge: [], ...saved?.proforma?.hiddenFields },
        customFields: saved?.proforma?.customFields || [],
        fieldDefaults: initFd("proforma"),
        fieldLabels: saved?.proforma?.fieldLabels || {},
        notAlt: saved?.proforma?.notAlt || migratedNotAlt,
      },
    };
  });

  const [cfModal, setCfModal] = useState(null);
  const [fieldLabelModal, setFieldLabelModal] = useState(null);
  const [openSections, setOpenSections] = useState(new Set());

  const toggleSection = (key) =>
    setOpenSections(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const save = () => {
    setAppSettings(p => ({ ...p, evrakFormConfig: draft }));
    flash("ok", "Evrak form ayarları kaydedildi.");
  };

  // ── Alan etiket düzenleme ─────────────────────────────────────────────────
  const getChipLabel = (sectionKey, fieldKey, defaultLabel) =>
    draft[docType]?.fieldLabels?.[sectionKey]?.[fieldKey]?.TR || defaultLabel;

  const openLabelEdit = (sectionKey, fieldKey, defaultLabel, defaultLabelEN = "") => {
    const saved = draft[docType]?.fieldLabels?.[sectionKey]?.[fieldKey] || {};
    setFieldLabelModal({ sectionKey, fieldKey, defaultLabel, defaultLabelEN, trValue: saved.TR || defaultLabel, enValue: saved.EN || defaultLabelEN });
  };

  const saveLabelEdit = () => {
    const { sectionKey, fieldKey, trValue, enValue } = fieldLabelModal;
    setDraft(p => ({
      ...p,
      [docType]: {
        ...p[docType],
        fieldLabels: {
          ...(p[docType].fieldLabels || {}),
          [sectionKey]: {
            ...(p[docType].fieldLabels?.[sectionKey] || {}),
            [fieldKey]: { TR: trValue.trim(), EN: enValue.trim() },
          },
        },
      },
    }));
    setFieldLabelModal(null);
  };

  const resetLabel = (sectionKey, fieldKey) => {
    setDraft(p => {
      const labels = { ...(p[docType].fieldLabels?.[sectionKey] || {}) };
      delete labels[fieldKey];
      return { ...p, [docType]: { ...p[docType], fieldLabels: { ...(p[docType].fieldLabels || {}), [sectionKey]: labels } } };
    });
  };

  // ── Alan gizleme ──────────────────────────────────────────────────────────
  const toggleHide = (section, fieldKey) => {
    setDraft(p => {
      const hidden = p[docType].hiddenFields[section] || [];
      const next = hidden.includes(fieldKey) ? hidden.filter(k => k !== fieldKey) : [...hidden, fieldKey];
      return { ...p, [docType]: { ...p[docType], hiddenFields: { ...p[docType].hiddenFields, [section]: next } } };
    });
  };

  const isHidden = (section, fieldKey) =>
    (draft[docType]?.hiddenFields?.[section] || []).includes(fieldKey);

  // ── Varsayılan değerler ───────────────────────────────────────────────────
  const getFd = (key, lang) => draft[docType]?.fieldDefaults?.[key]?.[lang] ?? "";
  const setFd = (key, lang, val) =>
    setDraft(p => ({
      ...p,
      [docType]: {
        ...p[docType],
        fieldDefaults: {
          ...(p[docType].fieldDefaults || {}),
          [key]: { ...(p[docType].fieldDefaults?.[key] || {}), [lang]: val },
        },
      },
    }));

  // ── Genel şartlar (teklif) ────────────────────────────────────────────────
  const addSart = () =>
    setDraft(p => ({
      ...p,
      teklif: { ...p.teklif, sartlar: [...(p.teklif.sartlar || []), { TR: "", EN: "" }] },
    }));

  const removeSart = (idx) =>
    setDraft(p => ({
      ...p,
      teklif: { ...p.teklif, sartlar: p.teklif.sartlar.filter((_, i) => i !== idx) },
    }));

  const updateSart = (idx, lang, val) =>
    setDraft(p => ({
      ...p,
      teklif: {
        ...p.teklif,
        sartlar: p.teklif.sartlar.map((s, i) => i === idx ? { ...s, [lang]: val } : s),
      },
    }));

  // ── Alt not ───────────────────────────────────────────────────────────────
  const getNotAlt = (lang) => draft[docType]?.notAlt?.[lang] ?? "";
  const setNotAlt = (lang, val) =>
    setDraft(p => ({
      ...p,
      [docType]: { ...p[docType], notAlt: { ...(p[docType].notAlt || {}), [lang]: val } },
    }));

  // ── Özel alanlar ──────────────────────────────────────────────────────────
  const openAddCf = (section) =>
    setCfModal({ isNew: true, cf: { ...EMPTY_CF, section, id: String(uid()) } });

  const openEditCf = (cf) =>
    setCfModal({ isNew: false, cf: { ...cf, options: cf.options ? [...cf.options] : [] } });

  const saveCf = () => {
    const { cf, isNew } = cfModal;
    if (!cf.label.TR.trim()) return;
    setDraft(p => {
      const fields = p[docType].customFields;
      const next = isNew ? [...fields, cf] : fields.map(f => f.id === cf.id ? cf : f);
      return { ...p, [docType]: { ...p[docType], customFields: next } };
    });
    setCfModal(null);
  };

  const deleteCf = (id) =>
    setDraft(p => ({ ...p, [docType]: { ...p[docType], customFields: p[docType].customFields.filter(f => f.id !== id) } }));

  const moveCf = (id, dir) => {
    setDraft(p => {
      const fields = [...p[docType].customFields];
      const idx = fields.findIndex(f => f.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= fields.length) return p;
      [fields[idx], fields[target]] = [fields[target], fields[idx]];
      return { ...p, [docType]: { ...p[docType], customFields: fields } };
    });
  };

  const inputStyle = { width: "100%", boxSizing: "border-box", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#f8fafc", outline: "none", resize: "vertical" };

  const sections = SECTIONS[docType] || [];
  const cfsBySection = (sec) => (draft[docType]?.customFields || []).filter(f => f.section === sec);

  return (
    <Section title="Teklif / Proforma Formu" icon="settings">
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
        Form bölümlerindeki alanları gizleyin, varsayılan değerleri düzenleyin veya özel alanlar ekleyin.
        Gizlenen alanlar yazılı çıktıda da görünmez.
      </div>

      {/* Alt sekme */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid #f1f5f9" }}>
        {[["teklif", "Teklif"], ["proforma", "Proforma"]].map(([id, label]) => (
          <button key={id} onClick={() => setDocType(id)} style={{
            padding: "7px 18px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
            borderBottom: docType === id ? "2px solid #e85d1a" : "2px solid transparent",
            color: docType === id ? "#e85d1a" : "#94a3b8",
            background: "transparent", marginBottom: -2,
          }}>{label}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 16 }}>
        <Btn onClick={save}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>

      {/* Genel Şartlar + Alt Not (sadece teklif) */}
      {docType === "teklif" && (
        <Accordion label="Genel Şartlar" sKey="sartlar" openSections={openSections} toggle={toggleSection}
          badge={(draft.teklif.sartlar || []).length > 0 ? `${draft.teklif.sartlar.length} şart` : null}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
            Teklifin 1. sayfasının altında gösterilir. İstediğiniz kadar şart ekleyebilirsiniz.
          </div>
          {(draft.teklif.sartlar || []).map((sart, idx) => (
            <div key={idx} style={{ marginBottom: 14, padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Şart {idx + 1}</span>
                <Btn small variant="danger" onClick={() => removeSart(idx)}><Icon name="trash" size={11} /> Kaldır</Btn>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <LangTextarea label="Türkçe (TR)" value={sart.TR} onChange={v => updateSart(idx, "TR", v)} inputStyle={inputStyle} />
                <LangTextarea label="İngilizce (EN)" value={sart.EN} onChange={v => updateSart(idx, "EN", v)} inputStyle={inputStyle} />
              </div>
            </div>
          ))}
          <Btn small onClick={addSart}><Icon name="plus" size={12} /> Yeni Şart Ekle</Btn>
        </Accordion>
      )}

      {/* Alt Not (her iki belge türü için) */}
      <Accordion
        label={docType === "teklif" ? "Sayfa Alt Notu (\"Bu belge gizlidir...\")" : "Alt Not"}
        sKey="altnot" openSections={openSections} toggle={toggleSection}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
          {docType === "teklif"
            ? "Teklifin 2. sayfasının en altında küçük yazıyla gösterilir."
            : "Proforma sayfasının en altında gösterilir."}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <LangTextarea label="Türkçe (TR)" value={getNotAlt("TR")} onChange={v => setNotAlt("TR", v)} inputStyle={inputStyle} />
          <LangTextarea label="İngilizce (EN)" value={getNotAlt("EN")} onChange={v => setNotAlt("EN", v)} inputStyle={inputStyle} />
        </div>
      </Accordion>

      {/* Alan bölümleri */}
      {sections.map(sec => {
        const cfs = cfsBySection(sec.key);
        const fdFields = FIELD_DEFAULTS_META[docType]?.[sec.key] || [];
        return (
          <Accordion key={sec.key} label={sec.label} sKey={sec.key} openSections={openSections} toggle={toggleSection}
            badge={cfs.length > 0 ? `${cfs.length} özel alan` : null}>

            {/* Mevcut alanlar */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>
                Mevcut Alanlar <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(tıklayarak gizle/göster)</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {sec.builtins.map(f => {
                  const hidden = isHidden(sec.key, f.key);
                  const chipLabel = getChipLabel(sec.key, f.key, f.label);
                  const isCustomLabel = chipLabel !== f.label;
                  return (
                    <div key={f.key} style={{ display: "flex", alignItems: "center", borderRadius: 20, border: `1px solid ${hidden ? "#fca5a5" : "#bbf7d0"}`, background: hidden ? "#fff1f2" : "#f0fdf4", overflow: "hidden", transition: "all .1s" }}>
                      <div onClick={() => toggleHide(sec.key, f.key)}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px 5px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: hidden ? "#b91c1c" : "#166534", userSelect: "none" }}>
                        <span style={{ fontSize: 11 }}>{hidden ? "✕" : "✓"}</span>
                        {chipLabel}
                        {isCustomLabel && <span style={{ fontSize: 10, color: hidden ? "#b91c1c" : "#166534", opacity: 0.6 }}>(özel)</span>}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); openLabelEdit(sec.key, f.key, f.label, f.enDefault || ""); }}
                        title="Etiketi düzenle"
                        style={{ background: "transparent", border: "none", borderLeft: `1px solid ${hidden ? "#fca5a5" : "#bbf7d0"}`, padding: "5px 8px", cursor: "pointer", fontSize: 12, color: hidden ? "#b91c1c" : "#166534", opacity: 0.7, lineHeight: 1 }}>
                        ✏
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Varsayılan değerler */}
            {fdFields.length > 0 && (
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>
                  Varsayılan Değerler <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(yeni belgede otomatik dolu gelir)</span>
                </div>
                {fdFields.map(fd => (
                  <div key={fd.key} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>{fd.label}</div>
                    {fd.biDil ? (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <LangTextarea label="Türkçe (TR)" value={getFd(fd.key, "TR")} onChange={v => setFd(fd.key, "TR", v)} inputStyle={{ ...inputStyle, minHeight: fd.multiline ? 68 : 36 }} />
                        <LangTextarea label="İngilizce (EN)" value={getFd(fd.key, "EN")} onChange={v => setFd(fd.key, "EN", v)} inputStyle={{ ...inputStyle, minHeight: fd.multiline ? 68 : 36 }} />
                      </div>
                    ) : (
                      <LangTextarea label="Değer" value={getFd(fd.key, "TR")} onChange={v => setFd(fd.key, "TR", v)} inputStyle={{ ...inputStyle, minHeight: 36 }} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Özel alanlar */}
            <div style={{ borderTop: fdFields.length > 0 ? "1px solid #f1f5f9" : "1px solid #f1f5f9", paddingTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5 }}>Özel Alanlar</div>
                <Btn small onClick={() => openAddCf(sec.key)}><Icon name="plus" size={12} /> Alan Ekle</Btn>
              </div>
              {cfs.length === 0 ? (
                <div style={{ fontSize: 12, color: "#cbd5e1", padding: "4px 0" }}>Henüz özel alan eklenmedi.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {cfs.map(cf => {
                    const allCfs = draft[docType].customFields;
                    const globalIdx = allCfs.findIndex(f => f.id === cf.id);
                    return (
                      <div key={cf.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{cf.label.TR || "—"}</span>
                          {cf.label.EN && <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}>/ {cf.label.EN}</span>}
                          <span style={{ fontSize: 11, marginLeft: 8, padding: "1px 6px", borderRadius: 5, background: cf.type === "select" ? "#dbeafe" : "#f1f5f9", color: cf.type === "select" ? "#1d4ed8" : "#64748b" }}>
                            {cf.type === "select" ? `Seçim (${(cf.options || []).length} seç.)` : "Metin"}
                          </span>
                        </div>
                        <Btn small variant="ghost" onClick={() => moveCf(cf.id, -1)} disabled={globalIdx === 0} title="Yukarı taşı">↑</Btn>
                        <Btn small variant="ghost" onClick={() => moveCf(cf.id, 1)} disabled={globalIdx === allCfs.length - 1} title="Aşağı taşı">↓</Btn>
                        <Btn small variant="ghost" onClick={() => openEditCf(cf)}><Icon name="edit" size={12} /></Btn>
                        <Btn small variant="danger" onClick={() => deleteCf(cf.id)}><Icon name="trash" size={12} /></Btn>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Accordion>
        );
      })}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <Btn onClick={save}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>

      {cfModal && (
        <CfModal
          cf={cfModal.cf}
          isNew={cfModal.isNew}
          sections={sections}
          onChange={cf => setCfModal(p => ({ ...p, cf }))}
          onSave={saveCf}
          onClose={() => setCfModal(null)}
        />
      )}

      {fieldLabelModal && (
        <FieldLabelModal
          modal={fieldLabelModal}
          onChange={setFieldLabelModal}
          onSave={saveLabelEdit}
          onReset={() => { resetLabel(fieldLabelModal.sectionKey, fieldLabelModal.fieldKey); setFieldLabelModal(null); }}
          onClose={() => setFieldLabelModal(null)}
        />
      )}
    </Section>
  );
};

// ── Yardımcı bileşenler ────────────────────────────────────────────────────────
const Accordion = ({ label, sKey, openSections, toggle, badge, children }) => {
  const isOpen = openSections.has(sKey);
  return (
    <div style={{ marginBottom: 10 }}>
      <div onClick={() => toggle(sKey)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: isOpen ? "8px 8px 0 0" : 8, cursor: "pointer", userSelect: "none" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {badge && <span style={{ fontSize: 11, fontWeight: 700, background: "#e85d1a", color: "#fff", borderRadius: 8, padding: "1px 7px" }}>{badge}</span>}
          <span style={{ fontSize: 11, color: "#94a3b8" }}>{isOpen ? "▲" : "▼"}</span>
        </div>
      </div>
      {isOpen && (
        <div style={{ border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "14px 16px" }}>
          {children}
        </div>
      )}
    </div>
  );
};

const LangTextarea = ({ label, value, onChange, inputStyle }) => (
  <div>
    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>{label}</div>
    <textarea value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, minHeight: inputStyle?.minHeight ?? 52 }} />
  </div>
);

// ── Özel Alan Modal ────────────────────────────────────────────────────────────
const CfModal = ({ cf, isNew, sections, onChange, onSave, onClose }) => {
  const [optionInput, setOptionInput] = useState({ TR: "", EN: "" });
  const options = cf.options || [];

  const inputStyle = { width: "100%", boxSizing: "border-box", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#f8fafc", outline: "none" };

  const addOption = () => {
    if (!optionInput.TR.trim()) return;
    onChange({ ...cf, options: [...options, { TR: optionInput.TR.trim(), EN: optionInput.EN.trim() }] });
    setOptionInput({ TR: "", EN: "" });
  };

  const removeOption = (idx) =>
    onChange({ ...cf, options: options.filter((_, i) => i !== idx) });

  return (
    <Modal title={isNew ? "Özel Alan Ekle" : "Özel Alanı Düzenle"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <Field label="Etiket (TR)">
          <input value={cf.label.TR} onChange={e => onChange({ ...cf, label: { ...cf.label, TR: e.target.value } })} style={inputStyle} placeholder="Ör: İhracat Çeşidi" />
        </Field>
        <Field label="Etiket (EN)">
          <input value={cf.label.EN} onChange={e => onChange({ ...cf, label: { ...cf.label, EN: e.target.value } })} style={inputStyle} placeholder="Ör: Export Type" />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <Field label="Bölüm">
          <select value={cf.section} onChange={e => onChange({ ...cf, section: e.target.value })} style={inputStyle}>
            {sections.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Tip">
          <select value={cf.type} onChange={e => onChange({ ...cf, type: e.target.value, options: [], suggestions: "" })} style={inputStyle}>
            <option value="text">Metin</option>
            <option value="select">Seçim Listesi</option>
          </select>
        </Field>
      </div>

      {cf.type === "text" && (
        <Field label="Öneri Listesi — virgülle ayır (opsiyonel)">
          <input value={cf.suggestions || ""} onChange={e => onChange({ ...cf, suggestions: e.target.value })} style={inputStyle} placeholder="Ör: Dahili, Harici, Transit" />
        </Field>
      )}

      {cf.type === "select" && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>Seçenekler</div>
          {options.length > 0 && (
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 7, marginBottom: 8, overflow: "hidden" }}>
              {options.map((opt, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: idx % 2 === 0 ? "#f8fafc" : "#fff", borderBottom: idx < options.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{opt.TR}</span>
                  {opt.EN && <span style={{ fontSize: 12, color: "#94a3b8" }}>/ {opt.EN}</span>}
                  <Btn small variant="danger" onClick={() => removeOption(idx)}><Icon name="trash" size={11} /></Btn>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6, alignItems: "center" }}>
            <input value={optionInput.TR} onChange={e => setOptionInput(p => ({ ...p, TR: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && addOption()} style={inputStyle} placeholder="Türkçe seçenek" />
            <input value={optionInput.EN} onChange={e => setOptionInput(p => ({ ...p, EN: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && addOption()} style={inputStyle} placeholder="İngilizce (opsiyonel)" />
            <Btn small onClick={addOption}><Icon name="plus" size={12} /> Ekle</Btn>
          </div>
        </div>
      )}

      <Field label="Varsayılan Değer (opsiyonel)">
        <input value={cf.defaultValue || ""} onChange={e => onChange({ ...cf, defaultValue: e.target.value })} style={inputStyle} placeholder="Boş bırakılabilir" />
      </Field>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose}>İptal</Btn>
        <Btn onClick={onSave} disabled={!cf.label.TR.trim()}>
          <Icon name="check" size={14} /> {isNew ? "Ekle" : "Güncelle"}
        </Btn>
      </div>
    </Modal>
  );
};

// ── Alan Etiket Düzenleme Modal ────────────────────────────────────────────────
const FieldLabelModal = ({ modal, onChange, onSave, onReset, onClose }) => {
  const inputStyle = { width: "100%", boxSizing: "border-box", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#f8fafc", outline: "none" };
  const hasCustom = modal.trValue.trim() || modal.enValue.trim();
  return (
    <Modal title={`"${modal.defaultLabel}" Etiketini Düzenle`} onClose={onClose}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14, lineHeight: 1.6 }}>
        Boş bırakılırsa varsayılan etiket (<b>{modal.defaultLabel}</b>) kullanılır.
        Değişiklik kaydedildikten sonra hem form alanında hem baskı çıktısında yeni etiket görünür.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <Field label="Etiket (TR)">
          <input value={modal.trValue} onChange={e => onChange({ ...modal, trValue: e.target.value })}
            style={inputStyle} placeholder={modal.defaultLabel} />
        </Field>
        <Field label="Etiket (EN) — opsiyonel">
          <input value={modal.enValue} onChange={e => onChange({ ...modal, enValue: e.target.value })}
            style={inputStyle} placeholder="" />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
        <div>
          {hasCustom && (
            <Btn small variant="danger" onClick={onReset}>Varsayılana sıfırla</Btn>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>İptal</Btn>
          <Btn onClick={onSave}><Icon name="check" size={14} /> Uygula</Btn>
        </div>
      </div>
    </Modal>
  );
};
