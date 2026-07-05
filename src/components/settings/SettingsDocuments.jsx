import { useState } from "react";
import { Btn, Icon, Modal, Field } from "../ui";
import { Section } from "./Section";
import { DEFAULT_TRANSLATIONS } from "../../lib/printTemplates";
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
  fatura: {
    hiddenFields: { alici: [], belge: [], paketleme: [] },
    customFields: [],
    fieldDefaults: {},
  },
};

const BUILTIN_ALICI = [
  { key: "yetkili",      label: "Yetkili",      enDefault: "Authority" },
  { key: "tel",          label: "Telefon",       enDefault: "Phone" },
  { key: "vergiNo",      label: "Vergi No",      enDefault: "Tax No" },
  { key: "vergiDairesi", label: "Vergi Dairesi", enDefault: "Tax Office" },
  { key: "adres",        label: "Adres",         enDefault: "Address" },
  { key: "email",        label: "E-posta",       enDefault: "Email" },
  { key: "country",      label: "Ülke",          enDefault: "Country" },
  { key: "city",         label: "Şehir",         enDefault: "City" },
];

const BUILTIN_BELGE = {
  teklif: [
    { key: "no",              label: "Teklif No",            enDefault: "Quotation No" },
    { key: "tarih",           label: "Tarih",                enDefault: "Date" },
    { key: "dil",             label: "Dil",                  enDefault: "Language" },
    { key: "currency",        label: "Para Birimi",          enDefault: "Currency" },
    { key: "kdvOrani",        label: "KDV Oranı (%)",        enDefault: "VAT Rate (%)" },
    { key: "forwarder",       label: "Gönderen (Forwarder)", enDefault: "Forwarder" },
    { key: "gtipNo",          label: "GTIP No",              enDefault: "GTIP No" },
    { key: "modelYiliDegeri", label: "Model Yılı",           enDefault: "Model Year" },
    { key: "kur",             label: "Kur",                  enDefault: "Exchange Rate" },
  ],
  proforma: [
    { key: "tarih",           label: "Tarih",                enDefault: "Date" },
    { key: "dil",             label: "Dil",                  enDefault: "Language" },
    { key: "currency",        label: "Para Birimi",          enDefault: "Currency" },
    { key: "kdvOrani",        label: "KDV Oranı (%)",        enDefault: "VAT Rate (%)" },
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

const BUILTIN_FATURA_ALICI = [
  { key: "firma",      label: "Firma Adı",             enDefault: "Company Name" },
  { key: "adres",      label: "Adres",                 enDefault: "Address" },
  { key: "ulke",       label: "Ülke",                  enDefault: "Country" },
  { key: "sehir",      label: "Şehir",                 enDefault: "City" },
  { key: "vatId",      label: "Uluslararası Vergi No", enDefault: "VAT ID" },
  { key: "localTaxNo", label: "Yerel Vergi No",        enDefault: "Local Tax No" },
];
const BUILTIN_FATURA_BELGE = [
  { key: "no",       label: "Fatura No",     enDefault: "Invoice No" },
  { key: "tarih",    label: "Tarih",         enDefault: "Date" },
  { key: "currency", label: "Para Birimi",   enDefault: "Currency" },
  { key: "payment",  label: "Ödeme Şekli",   enDefault: "Payment Terms" },
  { key: "delivery", label: "Teslim Şekli",  enDefault: "Delivery Method" },
  { key: "gtipNo",   label: "GTİP No",       enDefault: "GTIP No" },
  { key: "origin",   label: "Menşei",        enDefault: "Country of Origin" },
  { key: "kur",      label: "Döviz Kuru",    enDefault: "Exchange Rate" },
];
const BUILTIN_FATURA_PAKETLEME = [
  { key: "paketAdedi",  label: "Paket Adedi",  enDefault: "No. of Packages" },
  { key: "brutAgirlik", label: "Brüt Ağırlık", enDefault: "Gross Weight" },
  { key: "olculer",     label: "Ölçüler",      enDefault: "Dimensions" },
  { key: "not",         label: "Not",          enDefault: "Notes" },
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
  fatura: [
    { key: "alici",     label: "Alıcı Bilgileri",  builtins: BUILTIN_FATURA_ALICI },
    { key: "belge",     label: "Fatura Bilgileri",  builtins: BUILTIN_FATURA_BELGE },
    { key: "paketleme", label: "Paketleme & Not",   builtins: BUILTIN_FATURA_PAKETLEME },
  ],
};

// Hangi bölümlerde hangi alanların varsayılan değeri düzenlenebilir
const FIELD_DEFAULTS_META = {
  teklif: {
    belge: [],
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
      { key: "odemeSekli",  label: "Ödeme Şekli",  biDil: true },
      { key: "teslimSekli", label: "Teslim Şekli", biDil: true },
      { key: "teslimYeri",  label: "Teslim Yeri",  biDil: true, multiline: true },
      { key: "not",         label: "Not (Proforma)", biDil: true, multiline: true },
      { key: "ek",          label: "Ek Bilgi",     biDil: true, multiline: true },
    ],
  },
  fatura: {
    belge: [
      { key: "payment",  label: "Ödeme Şekli",  biDil: true },
      { key: "delivery", label: "Teslim Şekli", biDil: true },
      { key: "gtipNo",   label: "GTİP No",      biDil: false },
      { key: "origin",   label: "Menşei",       biDil: false },
    ],
    paketleme: [
      { key: "paketAdedi",  label: "Paket Adedi",  biDil: false },
      { key: "brutAgirlik", label: "Brüt Ağırlık", biDil: false },
      { key: "olculer",     label: "Ölçüler",      biDil: false },
    ],
  },
};

// Mevcut hardcoded varsayılanlar — fieldDefaults kaydedilmemişse ilk açılışta buradan doldurulur
const FIELD_INITIAL_DEFAULTS = {
  teklif: {
    teslimSuresi: { TR: "SİPARİŞ ONAYINIZA İSTİNADEN OPSİYONLUDUR.", EN: "OPTIONAL UPON ORDER CONFIRMATION." },
    teklifGecerlilik: { TR: "TEKLİF TARİHİNDEN İTİBAREN 3 GÜN GEÇERLİDİR.", EN: "VALID FOR 3 DAYS FROM THE DATE OF QUOTATION." },
    not: { TR: "TÜRKİYE TESLİM FİYATIDIR. YURTDIŞI NAKLİYE, GÜMRÜK, ARDİYE VE VERGİLERİ HARİÇTİR.", EN: "TURKEY DELIVERY PRICE. OVERSEAS FREIGHT, CUSTOMS, WAREHOUSE AND TAXES ARE NOT INCLUDED." },
  },
  proforma: {
    teslimYeri: { TR: "İSTANBUL TUZLA TESLİMDİR. TÜRKİYE GÜMRÜĞÜ GÖNDERİCİYE AİTTİR.", EN: "ISTANBUL TUZLA DELIVERY. TURKEY CUSTOMS BELONGS TO SENDER." },
    ek: { TR: "SİZLERE TESLİMAT İLE İLGİLİ BİLDİRİLEN TARİHTEN İTİBAREN 7 GÜN İÇİNDE ÖDEMESİ YAPILMAYAN SİPARİŞLER İPTAL EDİLECEKTİR.", EN: "ORDERS NOT PAID WITHIN 7 DAYS FROM THE NOTIFIED DATE WILL BE CANCELLED." },
  },
  fatura: {
    payment:     { TR: "T/T in advance", EN: "T/T in advance" },
    delivery:    { TR: "CIF Istanbul",   EN: "CIF Istanbul" },
    origin:      { TR: "Türkiye" },
    paketAdedi:  { TR: "1" },
    brutAgirlik: { TR: "180 KG" },
    olculer:     { TR: "70x100x80 CM" },
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
    const initFd = (type) => {
      const fd = { ...FIELD_INITIAL_DEFAULTS[type], ...(saved?.[type]?.fieldDefaults || {}) };
      delete fd.forwarder;
      return fd;
    };

    return {
      teklif: {
        hiddenFields: { alici: [], belge: [], kosullar: [], ...saved?.teklif?.hiddenFields },
        customFields: saved?.teklif?.customFields || [],
        fieldDefaults: initFd("teklif"),
        fieldLabels: saved?.teklif?.fieldLabels || {},
        fieldOrder: { alici: [], belge: [], kosullar: [], ...(saved?.teklif?.fieldOrder || {}) },
        deletedFields: { alici: [], belge: [], kosullar: [], ...(saved?.teklif?.deletedFields || {}) },
        sartlar: migratedSartlar,
        notAlt: saved?.teklif?.notAlt || migratedNotAlt,
      },
      proforma: {
        hiddenFields: { alici: [], belge: [], ...saved?.proforma?.hiddenFields },
        customFields: saved?.proforma?.customFields || [],
        fieldDefaults: initFd("proforma"),
        fieldLabels: saved?.proforma?.fieldLabels || {},
        fieldOrder: { alici: [], belge: [], ...(saved?.proforma?.fieldOrder || {}) },
        deletedFields: { alici: [], belge: [], ...(saved?.proforma?.deletedFields || {}) },
        notAlt: saved?.proforma?.notAlt || migratedNotAlt,
      },
      fatura: {
        hiddenFields: { alici: [], belge: [], paketleme: [], ...(saved?.fatura?.hiddenFields || {}) },
        customFields: saved?.fatura?.customFields || [],
        fieldDefaults: initFd("fatura"),
        fieldLabels: saved?.fatura?.fieldLabels || {},
        fieldOrder: { alici: [], belge: [], paketleme: [], ...(saved?.fatura?.fieldOrder || {}) },
        deletedFields: { alici: [], belge: [], paketleme: [], ...(saved?.fatura?.deletedFields || {}) },
      },
    };
  });

  const [cfModal, setCfModal] = useState(null);
  const [fieldLabelModal, setFieldLabelModal] = useState(null);
  const [openSections, setOpenSections] = useState(new Set());
  const [proformaConfirm, setProformaConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { label, onConfirm }

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

  // ── Mevcut alan sıralama / silme ─────────────────────────────────────────
  const getUnifiedOrder = (sectionKey) => {
    const sec = SECTIONS[docType]?.find(s => s.key === sectionKey);
    const builtins = sec?.builtins || [];
    const cfs = (draft[docType]?.customFields || []).filter(f => f.section === sectionKey);
    const deletedBuiltins = new Set(draft[docType]?.deletedFields?.[sectionKey] || []);
    const allKeys = [
      ...builtins.filter(b => !deletedBuiltins.has(b.key)).map(b => b.key),
      ...cfs.map(f => String(f.id)),
    ];
    const savedOrder = draft[docType]?.fieldOrder?.[sectionKey] || [];
    const inOrder = new Set(savedOrder);
    const unified = [
      ...savedOrder.filter(k => allKeys.includes(k)),
      ...allKeys.filter(k => !inOrder.has(k)),
    ];
    return unified.map(k => {
      const b = builtins.find(f => f.key === k);
      if (b) return { kind: "builtin", key: k, ...b };
      const cf = cfs.find(f => String(f.id) === k);
      if (cf) return { kind: "cf", key: k, cf };
      return null;
    }).filter(Boolean);
  };

  const getDeletedBuiltins = (sectionKey) => {
    const sec = SECTIONS[docType]?.find(s => s.key === sectionKey);
    const builtins = sec?.builtins || [];
    const deleted = new Set(draft[docType]?.deletedFields?.[sectionKey] || []);
    return builtins.filter(f => deleted.has(f.key));
  };

  const autoSaveDraft = (newDraft) => setTimeout(() => setAppSettings(p => ({ ...p, evrakFormConfig: newDraft })), 0);

  const deleteBuiltin = (sectionKey, fieldKey) => {
    let newDraft;
    setDraft(p => {
      const deleted = p[docType].deletedFields?.[sectionKey] || [];
      if (deleted.includes(fieldKey)) return p;
      const order = (p[docType]?.fieldOrder?.[sectionKey] || []).filter(k => k !== fieldKey);
      newDraft = { ...p, [docType]: { ...p[docType],
        deletedFields: { ...(p[docType].deletedFields || {}), [sectionKey]: [...deleted, fieldKey] },
        fieldOrder: { ...(p[docType].fieldOrder || {}), [sectionKey]: order },
      }};
      return newDraft;
    });
    setTimeout(() => { if (newDraft) autoSaveDraft(newDraft); }, 0);
  };

  const restoreBuiltin = (sectionKey, fieldKey) => {
    let newDraft;
    setDraft(p => {
      const deletedNew = (p[docType]?.deletedFields?.[sectionKey] || []).filter(k => k !== fieldKey);
      const order = [...(p[docType]?.fieldOrder?.[sectionKey] || []).filter(k => k !== fieldKey), fieldKey];
      newDraft = { ...p, [docType]: { ...p[docType],
        deletedFields: { ...(p[docType].deletedFields || {}), [sectionKey]: deletedNew },
        fieldOrder: { ...(p[docType].fieldOrder || {}), [sectionKey]: order },
      }};
      return newDraft;
    });
    setTimeout(() => { if (newDraft) autoSaveDraft(newDraft); }, 0);
  };

  const moveField = (sectionKey, key, dir) => {
    let newDraft;
    setDraft(p => {
      const sec = SECTIONS[docType]?.find(s => s.key === sectionKey);
      const builtins = sec?.builtins || [];
      const cfs = (p[docType]?.customFields || []).filter(f => f.section === sectionKey);
      const deletedBuiltins = new Set(p[docType]?.deletedFields?.[sectionKey] || []);
      const allKeys = [
        ...builtins.filter(b => !deletedBuiltins.has(b.key)).map(b => b.key),
        ...cfs.map(f => String(f.id)),
      ];
      const savedOrder = p[docType]?.fieldOrder?.[sectionKey] || [];
      const inOrder = new Set(savedOrder);
      const unified = [
        ...savedOrder.filter(k => allKeys.includes(k)),
        ...allKeys.filter(k => !inOrder.has(k)),
      ];
      const idx = unified.indexOf(key);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= unified.length) return p;
      const next = [...unified];
      [next[idx], next[target]] = [next[target], next[idx]];
      newDraft = { ...p, [docType]: { ...p[docType], fieldOrder: { ...(p[docType].fieldOrder || {}), [sectionKey]: next } } };
      return newDraft;
    });
    setTimeout(() => { if (newDraft) autoSaveDraft(newDraft); }, 0);
  };

  // ── Özel alanlar ──────────────────────────────────────────────────────────
  const openAddCf = (section) =>
    setCfModal({ isNew: true, cf: { ...EMPTY_CF, section, id: String(uid()) } });

  const openEditCf = (cf) =>
    setCfModal({ isNew: false, cf: { ...cf, options: cf.options ? [...cf.options] : [] } });

  const saveCf = () => {
    const { cf, isNew } = cfModal;
    if (!cf.label.TR.trim()) return;
    let newDraft;
    setDraft(p => {
      const fields = p[docType].customFields;
      const next = isNew ? [...fields, cf] : fields.map(f => f.id === cf.id ? cf : f);
      let fieldOrder = p[docType]?.fieldOrder || {};
      if (isNew) {
        const secOrder = [...(fieldOrder[cf.section] || []).filter(k => k !== String(cf.id)), String(cf.id)];
        fieldOrder = { ...fieldOrder, [cf.section]: secOrder };
      }
      newDraft = { ...p, [docType]: { ...p[docType], customFields: next, fieldOrder } };
      return newDraft;
    });
    setCfModal(null);
    setTimeout(() => {
      if (newDraft) {
        setAppSettings(p => ({ ...p, evrakFormConfig: newDraft }));
        flash("ok", "Özel alan kaydedildi.");
      }
    }, 0);
    if (isNew && docType === "teklif" && cf.section !== "kosullar") {
      setProformaConfirm(cf);
    }
  };

  const addCfToProforma = () => {
    if (!proformaConfirm) return;
    const cf = proformaConfirm;
    const newCf = { ...cf, id: String(uid()) };
    setDraft(p => {
      const fields = p.proforma.customFields;
      const secOrder = [...(p.proforma?.fieldOrder?.[cf.section] || []).filter(k => k !== String(newCf.id)), String(newCf.id)];
      const newDraft = { ...p, proforma: { ...p.proforma, customFields: [...fields, newCf], fieldOrder: { ...(p.proforma.fieldOrder || {}), [cf.section]: secOrder } } };
      setAppSettings(prev => ({ ...prev, evrakFormConfig: newDraft }));
      return newDraft;
    });
    setProformaConfirm(null);
    flash("ok", "Özel alan proformaya da eklendi.");
  };

  const deleteCf = (id) => {
    let newDraft;
    setDraft(p => {
      const sectionKey = (p[docType]?.customFields || []).find(f => String(f.id) === String(id))?.section;
      const cfs = (p[docType]?.customFields || []).filter(f => String(f.id) !== String(id));
      let fieldOrder = p[docType]?.fieldOrder || {};
      if (sectionKey) {
        const order = (fieldOrder[sectionKey] || []).filter(k => k !== String(id));
        fieldOrder = { ...fieldOrder, [sectionKey]: order };
      }
      newDraft = { ...p, [docType]: { ...p[docType], customFields: cfs, fieldOrder } };
      return newDraft;
    });
    setTimeout(() => { if (newDraft) autoSaveDraft(newDraft); }, 0);
  };

  const inputStyle = { width: "100%", boxSizing: "border-box", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#f8fafc", outline: "none", resize: "vertical" };

  const sections = SECTIONS[docType] || [];
  const cfsBySection = (sec) => (draft[docType]?.customFields || []).filter(f => f.section === sec);

  return (
    <Section title="Teklif / Proforma / Yurt Dışı Fatura" icon="settings">
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
        Form bölümlerindeki alanları gizleyin, varsayılan değerleri düzenleyin veya özel alanlar ekleyin.
        Gizlenen alanlar yazılı çıktıda da görünmez.
      </div>

      {/* Alt sekme */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid #f1f5f9" }}>
        {[["teklif", "Teklif"], ["proforma", "Proforma"], ["fatura", "Yurt Dışı Fatura"]].map(([id, label]) => (
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

      {/* Alt Not (teklif ve proforma için, fatura için yok) */}
      {docType !== "fatura" && <Accordion
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
      </Accordion>}

      {/* Alan bölümleri */}
      {sections.map(sec => {
        const cfs = cfsBySection(sec.key);
        const fdFields = FIELD_DEFAULTS_META[docType]?.[sec.key] || [];
        return (
          <Accordion key={sec.key} label={sec.label} sKey={sec.key} openSections={openSections} toggle={toggleSection}
            badge={cfs.length > 0 ? `${cfs.length} özel alan` : null}>

            {/* Alanlar (mevcut + özel, birleşik sıra) */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>
                Alanlar <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(↑↓ ile sırala; yerleşik alanlara tıkla gizle/göster)</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {getUnifiedOrder(sec.key).map((item, idx, arr) => {
                  if (item.kind === "builtin") {
                    const hidden = isHidden(sec.key, item.key);
                    const chipLabel = getChipLabel(sec.key, item.key, item.label);
                    const isCustomLabel = chipLabel !== item.label;
                    const borderColor = hidden ? "#fca5a5" : "#bbf7d0";
                    const textColor = hidden ? "#b91c1c" : "#166534";
                    return (
                      <div key={item.key} style={{ display: "flex", alignItems: "center", borderRadius: 20, border: `1px solid ${borderColor}`, background: hidden ? "#fff1f2" : "#f0fdf4", overflow: "hidden", transition: "all .1s" }}>
                        <div onClick={() => toggleHide(sec.key, item.key)}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 8px 5px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: textColor, userSelect: "none", flex: 1 }}>
                          <span style={{ fontSize: 11 }}>{hidden ? "✕" : "✓"}</span>
                          {chipLabel}
                          {isCustomLabel && <span style={{ fontSize: 10, color: textColor, opacity: 0.6 }}>(özel)</span>}
                        </div>
                        <button onClick={e => { e.stopPropagation(); openLabelEdit(sec.key, item.key, item.label, item.enDefault || ""); }}
                          title="Etiketi düzenle"
                          style={{ background: "transparent", border: "none", borderLeft: `1px solid ${borderColor}`, padding: "5px 6px", cursor: "pointer", fontSize: 12, color: textColor, opacity: 0.7, lineHeight: 1 }}>✏</button>
                        <button onClick={() => moveField(sec.key, item.key, -1)} disabled={idx === 0}
                          title="Yukarı taşı"
                          style={{ background: "transparent", border: "none", borderLeft: `1px solid ${borderColor}`, padding: "5px 6px", cursor: idx === 0 ? "default" : "pointer", fontSize: 12, color: textColor, opacity: idx === 0 ? 0.3 : 0.7, lineHeight: 1 }}>↑</button>
                        <button onClick={() => moveField(sec.key, item.key, 1)} disabled={idx === arr.length - 1}
                          title="Aşağı taşı"
                          style={{ background: "transparent", border: "none", borderLeft: `1px solid ${borderColor}`, padding: "5px 6px", cursor: idx === arr.length - 1 ? "default" : "pointer", fontSize: 12, color: textColor, opacity: idx === arr.length - 1 ? 0.3 : 0.7, lineHeight: 1 }}>↓</button>
                        <button onClick={() => setDeleteConfirm({ label: chipLabel, onConfirm: () => deleteBuiltin(sec.key, item.key) })}
                          title="Kaldır"
                          style={{ background: "transparent", border: "none", borderLeft: `1px solid ${borderColor}`, padding: "5px 7px", cursor: "pointer", fontSize: 11, color: "#b91c1c", opacity: 0.7, lineHeight: 1 }}>✕</button>
                      </div>
                    );
                  } else {
                    const cf = item.cf;
                    return (
                      <div key={cf.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{cf.label.TR || "—"}</span>
                          {cf.label.EN && <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}>/ {cf.label.EN}</span>}
                          <span style={{ fontSize: 11, marginLeft: 8, padding: "1px 6px", borderRadius: 5, background: cf.type === "select" ? "#dbeafe" : "#f1f5f9", color: cf.type === "select" ? "#1d4ed8" : "#64748b" }}>
                            {cf.type === "select" ? `Seçim (${(cf.options || []).length} seç.)` : "Metin"}
                          </span>
                          <span style={{ fontSize: 10, marginLeft: 6, color: "#94a3b8" }}>• Özel</span>
                        </div>
                        <button onClick={() => moveField(sec.key, String(cf.id), -1)} disabled={idx === 0}
                          title="Yukarı taşı"
                          style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: 4, padding: "3px 7px", cursor: idx === 0 ? "default" : "pointer", fontSize: 12, color: "#64748b", opacity: idx === 0 ? 0.3 : 1, lineHeight: 1 }}>↑</button>
                        <button onClick={() => moveField(sec.key, String(cf.id), 1)} disabled={idx === arr.length - 1}
                          title="Aşağı taşı"
                          style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: 4, padding: "3px 7px", cursor: idx === arr.length - 1 ? "default" : "pointer", fontSize: 12, color: "#64748b", opacity: idx === arr.length - 1 ? 0.3 : 1, lineHeight: 1 }}>↓</button>
                        <Btn small variant="ghost" onClick={() => openEditCf(cf)}><Icon name="edit" size={12} /></Btn>
                        <Btn small variant="danger" onClick={() => setDeleteConfirm({ label: cf.label.TR || cf.label.EN, onConfirm: () => deleteCf(cf.id) })}><Icon name="trash" size={12} /></Btn>
                      </div>
                    );
                  }
                })}
              </div>
              {getDeletedBuiltins(sec.key).length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Kaldırılanlar:</span>
                  {getDeletedBuiltins(sec.key).map(f => (
                    <button key={f.key} onClick={() => restoreBuiltin(sec.key, f.key)}
                      style={{ fontSize: 11, color: "#64748b", background: "#f1f5f9", border: "1px dashed #cbd5e1", borderRadius: 20, padding: "3px 10px", cursor: "pointer" }}>
                      + {f.label}
                    </button>
                  ))}
                </div>
              )}
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

            {/* Özel alan ekle */}
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
              <Btn small onClick={() => openAddCf(sec.key)}><Icon name="plus" size={12} /> Özel Alan Ekle</Btn>
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

      {deleteConfirm && (
        <Modal title="Alanı kaldır?" onClose={() => setDeleteConfirm(null)}>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
            <b>"{deleteConfirm.label}"</b> alanı formdan kaldırılsın mı?
            <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>Kaldırılan alan formda ve çıktıda görünmez. İstediğinizde geri yükleyebilirsiniz.</div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setDeleteConfirm(null)}>Vazgeç</Btn>
            <Btn variant="danger" onClick={() => { deleteConfirm.onConfirm(); setDeleteConfirm(null); }}>
              <Icon name="trash" size={14} /> Kaldır
            </Btn>
          </div>
        </Modal>
      )}

      {proformaConfirm && (
        <Modal title="Proformada da göster?" onClose={() => setProformaConfirm(null)}>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
            <b>"{proformaConfirm.label.TR}"</b> alanı proformada da gösterilsin mi?
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setProformaConfirm(null)}>Hayır</Btn>
            <Btn onClick={addCfToProforma}><Icon name="check" size={14} /> Evet, ekle</Btn>
          </div>
        </Modal>
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
