import { COUNTRIES, COUNTRY_EN, COUNTRY_ALT, CITIES_TR } from "../lib/constants";

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
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name] || ""} />
    </svg>
  );
};

// ── UI Primitives ──────────────────────────────────────────────────────────
export const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 5 }}>{label}</label>
    {children}
  </div>
);
export const Input = (props) => (
  <input {...props} style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#f8fafc" }} />
);
// Hiçbir alan zorunlu değil — bu sadece bilgilendirme amaçlı, kaydı engellemez
export const Warn = ({ children }) => children ? (
  <div style={{ fontSize: 11, color: "#b45309", marginTop: 4 }}>⚠ {children}</div>
) : null;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^[0-9+()\s-]{7,}$/;
export const Select = ({ children, ...props }) => (
  <select {...props} style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", boxSizing: "border-box" }}>
    {children}
  </select>
);
// Para girişi: değer SAYI olarak tutulur, ekranda binlik ayraçlı + ₺ gösterilir
export const MoneyInput = ({ value, onChange, placeholder = "0", sym = "₺" }) => {
  const display = (value === "" || value == null || isNaN(value)) ? "" : new Intl.NumberFormat("tr-TR").format(value);
  const handle = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, ""); // sadece rakam
    onChange(raw === "" ? "" : parseInt(raw, 10));
  };
  return (
    <div style={{ position: "relative" }}>
      <input value={display} onChange={handle} placeholder={placeholder} inputMode="numeric"
        style={{ width: "100%", padding: "8px 28px 8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#f8fafc", textAlign: "right", fontWeight: 600 }} />
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 14, pointerEvents: "none" }}>{sym}</span>
    </div>
  );
};
export const Btn = ({ children, onClick, variant = "primary", small, disabled }) => {
  const styles = {
    primary: { background: "#e85d1a", color: "#fff", border: "none" },
    danger:  { background: "#ef4444", color: "#fff", border: "none" },
    ghost:   { background: "transparent", color: "#64748b", border: "1px solid #e2e8f0" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...styles[variant], padding: small ? "5px 12px" : "9px 18px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", fontSize: small ? 12 : 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, opacity: disabled ? .5 : 1 }}>
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

export const Modal = ({ title, onClose, children, wide, maxWidth }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: maxWidth ?? (wide ? 900 : 520), maxHeight: wide ? "94vh" : "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{title}</div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><Icon name="close" /></button>
      </div>
      {children}
    </div>
  </div>
);

export const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,.2)", textAlign: "center" }}>
      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <Icon name="trash" size={22} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Emin misiniz?</div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 22 }}>{message}</div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <Btn variant="ghost" onClick={onCancel}>Vazgeç</Btn>
        <Btn variant="danger" onClick={onConfirm}><Icon name="trash" size={14} /> Evet, Sil</Btn>
      </div>
    </div>
  </div>
);


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
  const cityList = fromApi.length > 0 ? fromApi : (country === "Türkiye" ? CITIES_TR : []);
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
