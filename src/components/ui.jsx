import React, { useId, useState, useEffect, useRef, cloneElement, isValidElement, Children } from "react";
import { COUNTRIES, COUNTRY_EN, COUNTRY_ALT, staticCities, ODEME_YONTEMLERI } from "../lib/constants";
import { aramaNormalize } from "../lib/utils";

export const Icon = ({ name, size = 16 }) => {
  const paths = {
    dashboard: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 3h2v-2h2v2h2v2h-2v2h-2v-2h-2z",
    customers:  "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
    machine:    "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    service:    "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3-3a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-3 3zM5 8l4 4-6 6 2 2 6-6 4 4 1-1-4.5-4.5",
    plus:       "M12 5v14M5 12h14",
    edit:       "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    trash:      "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
    close:      "M18 6L6 18M6 6l12 12",
    search:     "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
    check:      "M20 6L9 17l-5-5",
    print:      "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
    store:      "M3 9l1-5h16l1 5M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M4 9h16M9 21v-6h6v6",
    box:        "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12",
    finance:    "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    settings:   "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
    download:   "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
    upload:     "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
    refresh:    "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
    catalog:    "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z",
    notes:      "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
    parts:      "M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l6-6a4 4 0 0 0 5.4-5.4l-2.5 2.5-2-2 2.5-2.5z",
    mail:       "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6",
    lock:       "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
    eye:        "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M9 12a3 3 0 1 0 6 0 3 3 0 1 0 -6 0z",
    eyeOff:     "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22",
    evrak:      "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
    arrowRight: "M5 12h14M12 5l7 7-7 7",
    stamp:      "M10 4V2h4v2M7 4h10v8H7zM5 12h14v2H5zM4 17h16",
    userPlus:   "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11h-6",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name] || ""} />
    </svg>
  );
};

// ── UI Primitives ──────────────────────────────────────────────────────────
// Erişilebilirlik: label'ı ilk çocuğa (basit bir Input/Select/MoneyInput/textarea ise) htmlFor/id ile
// bağlar — ekran okuyucu ve "label'a tıkla, input'a odaklan" davranışı için. Karmaşık/çoklu çocuklu
// Field'lar (PickOrType, PaymentRowsEditor, özel dropdown'lar) bu eşleşmeye girmez, etiketsiz kalır —
// önceki davranışla aynı, yeni bir regresyon yok.
const LABELABLE_TYPES = new Set(["input", "select", "textarea"]);
export const Field = ({ label, children }) => {
  const autoId = useId();
  const kids = Children.toArray(children);
  const [first, ...rest] = kids;
  const isSimpleComponent = isValidElement(first) && (first.type === Input || first.type === Select || first.type === MoneyInput);
  const isNativeField = isValidElement(first) && typeof first.type === "string" && LABELABLE_TYPES.has(first.type);
  const canLabel = (isSimpleComponent || isNativeField) && !first.props.id;
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={canLabel ? autoId : undefined} style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 5 }}>{label}</label>
      {canLabel ? cloneElement(first, { id: autoId }) : first}
      {rest}
    </div>
  );
};
export const Input = (props) => (
  <input lang={props.type === "date" ? "tr" : undefined} {...props} style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#f8fafc" }} />
);
// Şifre alanı — sağda göz ikonuyla göster/gizle. `Input` ile aynı props (value/onChange/placeholder/
// autoFocus/onKeyDown), type="password" sabit (toggle iç state'le yönetiliyor, dışarıdan verilmez).
export const PasswordInput = (props) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input {...props} type={show ? "text" : "password"}
        style={{ width: "100%", padding: "8px 36px 8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#f8fafc" }} />
      <button type="button" tabIndex={-1} onClick={() => setShow(s => !s)} title={show ? "Şifreyi gizle" : "Şifreyi göster"}
        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4, display: "flex", alignItems: "center" }}>
        <Icon name={show ? "eyeOff" : "eye"} size={16} />
      </button>
    </div>
  );
};
// Hiçbir alan zorunlu değil — bu sadece bilgilendirme amaçlı, kaydı engellemez
export const Warn = ({ children }) => children ? (
  <div style={{ fontSize: 11, color: "#b45309", marginTop: 4 }}>⚠ {children}</div>
) : null;
// Elektrik kesintisi/çökme sonrası bulunan form taslağını geri yükleme şeridi (bkz. useFormDraft)
export const DraftRestoreBar = ({ draft, onRestore, onDiscard }) => {
  if (!draft) return null;
  let saat = "";
  try { saat = new Date(draft.ts).toLocaleString("tr-TR"); } catch { /* yoksay */ }
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", background: "#fef9c3", border: "1px solid #fde047", borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
      <span style={{ fontSize: 12, color: "#854d0e", fontWeight: 600 }}>
        ⚡ Yarım kalan taslak bulundu{saat ? ` (${saat})` : ""}. Devam etmek ister misiniz?
      </span>
      <div style={{ display: "flex", gap: 6 }}>
        <Btn small onClick={onRestore}>Geri Yükle</Btn>
        <Btn small variant="ghost" onClick={onDiscard}>Yoksay</Btn>
      </div>
    </div>
  );
};
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^[0-9+()\s-]{7,}$/;
export const Select = ({ children, ...props }) => (
  <select {...props} style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", boxSizing: "border-box" }}>
    {children}
  </select>
);
// Hızlı seç (kayıtlı firmalardan) + serbest yazım — tek değeri tutan input asıl kaynak,
// Select sadece onu doldurmak için bir kısayol. "Satış Yapan" / "Satan Firma" gibi
// kayıtlı olmayan bir isim de (örn. özel satılmış önceki sahip) girilebilen alanlarda kullanılır.
export const PickOrType = ({ value, onChange, options = [], placeholder = "" }) => (
  <div>
    <Select value="" onChange={e => { if (e.target.value) onChange(e.target.value); }}>
      <option value="">Hızlı seç... (veya aşağıya elle yazın)</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Select>
    <Input value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ marginTop: 6 }} />
  </div>
);
// Arama kutulu liste seçici — tanımlı bir listeden (parça/kalıp gibi) arayarak ve tıklayarak seçim
// yapılır, PickOrType'taki gibi serbest yazım yok. Liste, formu uzatmasın diye input'un altına
// kayan bir panel (overlay) olarak açılır — sadece input'a odaklanınca (tıklanınca) görünür. Bir
// öğeye tıklamak onu hemen seçer/ekler, kısa bir "eklendi" onayı gösterir ve paneli kapatır — yeniden
// eklemek için input'a tekrar tıklanması gerekir (her seçim ayrı, kapanan bir işlem). 150+ öğelik
// kataloglarda (örn. yedek parça listesi) formun büyümeden kullanılabilmesi için bu davranış önemli.
export const SearchPick = ({ items, onPick, getLabel = (x) => String(x), getKey = (x) => getLabel(x), placeholder = "Ara...", emptyText = "Bulunamadı." }) => {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(null);
  // Sonuç sayısı sınırlanmıyor — panel zaten scrollable (maxHeight:220, overflowY:auto); eski sabit
  // limit (8) bazı öğelerin (örn. 150 parçalık listede 8'den sonrası) hiç görünmemesine yol açıyordu.
  const filtered = q.trim() ? items.filter(it => aramaNormalize(getLabel(it)).includes(aramaNormalize(q))) : items;
  const pick = (it) => {
    onPick(it);
    setQ("");
    setOpen(false);
    setJustAdded(getLabel(it));
    setTimeout(() => setJustAdded(null), 2000);
  };
  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={14} /></span>
        <input value={q} onChange={e => setQ(e.target.value)}
          onFocus={() => { setOpen(true); setJustAdded(null); }}
          onClick={() => { setOpen(true); setJustAdded(null); }}
          onBlur={() => setOpen(false)}
          placeholder={placeholder}
          style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", boxSizing: "border-box", outline: "none" }} />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", maxHeight: 220, overflowY: "auto", boxShadow: "0 10px 28px rgba(0,0,0,.14)" }}>
          {filtered.map(it => (
            <div key={getKey(it)} onMouseDown={e => { e.preventDefault(); pick(it); }}
              style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 13, fontWeight: 600, background: "#fff" }}
              onMouseEnter={e => e.currentTarget.style.background = "#fff7ed"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              {getLabel(it)}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "10px 12px", fontSize: 13, color: "#94a3b8" }}>{emptyText}</div>
          )}
        </div>
      )}
      {justAdded && (
        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: "#065f46", background: "#d1fae5", padding: "6px 10px", borderRadius: 6 }}>
          ✓ "{justAdded}" eklendi
        </div>
      )}
    </div>
  );
};
// Kapora/Ödeme satırları: PartSaleForm'daki çoklu-kalıp ekleme deseninin genelleştirilmiş hali
// (Select + MoneyInput + sil butonu, "+ Satır Ekle"). Yöntem "Çek" seçilince ek bir Vade Tarihi
// alanı çıkar. Bu bileşen sadece satırları düzenler — her satırdan ayrı bir kayıt üretmek
// (customerId/tarih bağlamı farklı olduğu için) çağıran tarafın işi.
export const PaymentRowsEditor = ({ rows, onChange, sym = "₺" }) => {
  const satirlar = rows || [];
  const toplam = satirlar.reduce((s, r) => s + (Number(r.tutar) || 0), 0);
  const satirGuncelle = (i, patch) => onChange(satirlar.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const satirSil = (i) => onChange(satirlar.filter((_, idx) => idx !== i));
  const satirEkle = () => onChange([...satirlar, { yontem: "Nakit", tutar: "", vadeTarihi: "" }]);
  return (
    <div>
      {satirlar.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: r.yontem === "Çek" ? "1fr 1fr 1fr 36px" : "1fr 1fr 36px", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <Select value={r.yontem || "Nakit"} onChange={e => satirGuncelle(i, { yontem: e.target.value })}>
            {ODEME_YONTEMLERI.map(y => <option key={y}>{y}</option>)}
          </Select>
          <MoneyInput value={r.tutar} sym={sym} onChange={v => satirGuncelle(i, { tutar: v })} />
          {r.yontem === "Çek" && (
            <Input type="date" value={r.vadeTarihi || ""} placeholder="Vade Tarihi" onChange={e => satirGuncelle(i, { vadeTarihi: e.target.value })} />
          )}
          <button type="button" title="Bu satırı kaldır" onClick={() => satirSil(i)}
            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🗑</button>
        </div>
      ))}
      <button type="button" onClick={satirEkle}
        style={{ marginTop: 4, padding: "8px 16px", borderRadius: 8, border: "1px dashed #e85d1a", background: "#fff7ed", color: "#e85d1a", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
        + Ödeme Ekle
      </button>
      {toplam > 0 && (
        <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>
          Toplam: {new Intl.NumberFormat("tr-TR").format(toplam)}{sym}
        </div>
      )}
    </div>
  );
};
// Para girişi: değer SAYI olarak tutulur, ekranda binlik ayraçlı + ₺ gösterilir
// Aranabilir açılır liste: uzun seçenek listelerinde (kalıp tanımları gibi) native
// select yerine kullanılır. Üstte arama kutusu, altta en fazla ~10 satır görünür liste
// (fazlası kaydırılır). options: [{ value, label }].
export const SearchSelect = ({ value, onChange, options = [], placeholder = "Seçin...", searchPlaceholder = "Ara..." }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => {
    if (!open) { setQ(""); return; }
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    setTimeout(() => inputRef.current?.focus(), 30);
    return () => { document.removeEventListener("mousedown", onDoc); window.removeEventListener("keydown", onKey); };
  }, [open]);
  const filtered = q.trim() ? options.filter(o => aramaNormalize(o.label).includes(aramaNormalize(q))) : options;
  const secili = options.find(o => o.value === value);
  const satir = { display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", fontSize: 13, cursor: "pointer", background: "none" };
  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#f8fafc", textAlign: "left", cursor: "pointer", color: secili ? "#0f172a" : "#94a3b8", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{secili ? secili.label : placeholder}</span>
        <span style={{ fontSize: 9, color: "#94a3b8", flexShrink: 0 }}>▼</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 1300, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 12px 32px rgba(0,0,0,.14)", overflow: "hidden" }}>
          <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={13} /></span>
              <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder={searchPlaceholder}
                style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px 7px 28px", border: "1.5px solid #e85d1a", borderRadius: 7, fontSize: 13, outline: "none" }} />
            </div>
          </div>
          <div style={{ maxHeight: 330, overflowY: "auto" }}>
            {value && (
              <button type="button" style={{ ...satir, color: "#94a3b8", fontSize: 12 }}
                onClick={() => { onChange(""); setOpen(false); }}>— Seçimi kaldır —</button>
            )}
            {filtered.length === 0 && <div style={{ padding: "10px 12px", fontSize: 12.5, color: "#94a3b8" }}>Sonuç bulunamadı.</div>}
            {filtered.map(o => (
              <button key={o.value} type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                onMouseEnter={e => e.currentTarget.style.background = "#fff7ed"}
                onMouseLeave={e => e.currentTarget.style.background = o.value === value ? "#fff7ed" : "none"}
                style={{ ...satir, background: o.value === value ? "#fff7ed" : "none", fontWeight: o.value === value ? 700 : 400 }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const MoneyInput = ({ value, onChange, placeholder = "0", sym = "₺", id }) => {
  const display = (value === "" || value == null || isNaN(value)) ? "" : new Intl.NumberFormat("tr-TR").format(value);
  const handle = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, ""); // sadece rakam
    onChange(raw === "" ? "" : parseInt(raw, 10));
  };
  return (
    <div style={{ position: "relative" }}>
      <input id={id} value={display} onChange={handle} placeholder={placeholder} inputMode="numeric"
        style={{ width: "100%", padding: "8px 28px 8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#f8fafc", textAlign: "right", fontWeight: 600 }} />
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 14, pointerEvents: "none" }}>{sym}</span>
    </div>
  );
};
export const Btn = ({ children, onClick, variant = "primary", small, disabled, title }) => {
  const styles = {
    primary: { background: "#e85d1a", color: "#fff", border: "none" },
    danger:  { background: "#ef4444", color: "#fff", border: "none" },
    ghost:   { background: "transparent", color: "#64748b", border: "1px solid #e2e8f0" },
  };
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{ ...styles[variant], padding: small ? "5px 12px" : "9px 18px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", fontSize: small ? 12 : 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, opacity: disabled ? .5 : 1, whiteSpace: "nowrap", flexShrink: 0 }}>
      {children}
    </button>
  );
};

export const StatCard = ({ label, value, sub, color, onClick }) => (
  <div onClick={onClick} style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", borderLeft: `4px solid ${color}`, cursor: onClick ? "pointer" : "default", transition: "box-shadow .15s" }}
    onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,.12)"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.08)"; }}>
    <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 700, color: "#0f172a" }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
  </div>
);

export const Modal = ({ title, onClose, children, footer, wide, maxWidth, maxHeight }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    {footer ? (
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: maxWidth ?? (wide ? 900 : 520), maxHeight: maxHeight ?? (wide ? "94vh" : "90vh"), display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ padding: "28px 28px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{title}</div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><Icon name="close" /></button>
          </div>
        </div>
        <div style={{ padding: "0 28px 20px", overflowY: "auto", flex: 1 }}>
          {children}
        </div>
        <div style={{ padding: "12px 28px 16px", flexShrink: 0, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
          {footer}
        </div>
      </div>
    ) : (
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: maxWidth ?? (wide ? 900 : 520), maxHeight: maxHeight ?? (wide ? "94vh" : "90vh"), overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><Icon name="close" /></button>
        </div>
        {children}
      </div>
    )}
  </div>
  );
};

export const ConfirmDialog = ({ message, onConfirm, onCancel, confirmLabel = "Evet, Sil", confirmIcon = "trash" }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,.2)", textAlign: "center" }}>
      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <Icon name="trash" size={22} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Emin misiniz?</div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 22 }}>{message}</div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <Btn variant="ghost" onClick={onCancel}>Vazgeç</Btn>
        <Btn variant="danger" onClick={onConfirm}><Icon name={confirmIcon} size={14} /> {confirmLabel}</Btn>
      </div>
    </div>
  </div>
  );
};


export const Pagination = ({ total, page, setPage, perPage = 10 }) => {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center", padding: "14px 0" }}>
      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
        style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", color: "#64748b", fontSize: 13, opacity: page === 1 ? .5 : 1 }}>‹ Önceki</button>
      {Array.from({ length: pages }, (_, i) => i + 1)
        .filter(n => n === 1 || n === pages || Math.abs(n - page) <= 1)
        .reduce((acc, n, i, arr) => { if (i > 0 && n - arr[i-1] > 1) acc.push("…"); acc.push(n); return acc; }, [])
        .map((n, i) => n === "…"
          ? <span key={"e"+i} style={{ color: "#94a3b8", fontSize: 13 }}>…</span>
          : <button key={n} onClick={() => setPage(n)}
              style={{ minWidth: 32, padding: "5px 8px", borderRadius: 8, border: "1px solid", borderColor: page === n ? "#e85d1a" : "#e2e8f0", background: page === n ? "#e85d1a" : "#fff", color: page === n ? "#fff" : "#64748b", fontWeight: page === n ? 700 : 400, cursor: "pointer", fontSize: 13 }}>{n}</button>
        )}
      <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
        style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: page === pages ? "not-allowed" : "pointer", color: "#64748b", fontSize: 13, opacity: page === pages ? .5 : 1 }}>Sonraki ›</button>
    </div>
  );
};


// Ülke + Şehir alanları — API'den gelen şehir listesini kullanır, tüm formlarda ortak
export const CountryCityFields = ({ country, city, onCountry, onCity, geoData, loadingGeo }) => {
  // API ülke adı farklı yazımlarda olabilir; sırayla dene
  const candidates = country ? [COUNTRY_EN[country], country, COUNTRY_ALT[country]].filter(Boolean) : [];
  let fromApi = [];
  if (geoData) {
    for (const cand of candidates) {
      if (geoData[cand] && geoData[cand].length) { fromApi = geoData[cand]; break; }
    }
  }
  // API gelmediyse Türkiye için statik 81 il devreye girer
  const cityList = fromApi.length > 0 ? fromApi : staticCities(country);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <Field label="Ülke">
        <Select value={country || ""} onChange={e => { onCountry(e.target.value); onCity(""); }}>
          <option value="">{loadingGeo ? "Yükleniyor..." : "Ülke seçin..."}</option>
          {COUNTRIES.map(c => <option key={c}>{c}</option>)}
        </Select>
      </Field>
      <Field label="Şehir">
        {cityList.length > 0 ? (
          <Select value={city || ""} onChange={e => onCity(e.target.value)}>
            <option value="">Şehir seçin...</option>
            {cityList.map(c => <option key={c}>{c}</option>)}
          </Select>
        ) : (
          <Input value={city || ""} onChange={e => onCity(e.target.value)}
            placeholder={loadingGeo ? "Şehirler yükleniyor..." : "Şehir yazın"} />
        )}
      </Field>
    </div>
  );
};

export const ImageUpload = ({ value, onChange, maxPx = 250, label = "Resim", preserveFormat = false }) => {
  const ref = React.useRef(null);
  const pick = () => ref.current?.click();
  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // preserveFormat=true: kaşe/imza — alpha kanalı için WebP, 600px sınırı
        const limit = preserveFormat ? 600 : maxPx;
        const scale = Math.min(1, limit / Math.max(img.width, img.height, 1));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        // WebP önce (daha küçük + alpha destekler), fallback JPEG/PNG
        const webp = canvas.toDataURL("image/webp", preserveFormat ? 0.85 : 0.80);
        onChange(webp.startsWith("data:image/webp")
          ? webp
          : canvas.toDataURL(preserveFormat ? "image/png" : "image/jpeg", 0.72));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
      {value ? (
        <img src={value} alt={label}
          style={{ width: 80, height: 60, objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", cursor: "pointer" }}
          onClick={pick} title="Değiştirmek için tıkla" />
      ) : (
        <div onClick={pick} style={{ width: 80, height: 60, border: "1px dashed #e2e8f0", borderRadius: 8, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 11, color: "#94a3b8" }}>
          Resim yok
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button type="button" onClick={pick}
          style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", color: "#475569" }}>
          {value ? "Değiştir" : "Resim Seç"}
        </button>
        {value && (
          <button type="button" onClick={() => onChange("")}
            style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", cursor: "pointer", color: "#dc2626" }}>
            Sil
          </button>
        )}
      </div>
    </div>
  );
};

export const LockConflict = ({ lockedBy, lockedAt, onForce, onCancel }) => {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  useEffect(() => {
    const calc = () => setElapsed(Math.max(0, Math.round((Date.now() - new Date(lockedAt).getTime()) / 60000)));
    calc();
    intervalRef.current = setInterval(calc, 30000);
    return () => clearInterval(intervalRef.current);
  }, [lockedAt]);
  return (
    <div style={{ padding: "40px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: "#0f172a" }}>Bu kayıt şu an düzenleniyor</div>
      <div style={{ color: "#64748b", fontSize: 14, marginBottom: 28 }}>
        <strong style={{ color: "#0f172a" }}>{lockedBy}</strong>
        {" "}bu kaydı {elapsed === 0 ? "az önce" : `${elapsed} dakika önce`} açtı.
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <Btn variant="ghost" onClick={onCancel}>Geri Dön</Btn>
        <Btn onClick={onForce}>Zorla Düzenle</Btn>
      </div>
    </div>
  );
};
