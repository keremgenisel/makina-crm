import { DEFAULT_KDV_RATES } from "../../lib/constants";
import { today, fmtTR, getKdvRateForDate } from "../../lib/utils";
import { Icon, Btn } from "../ui";
import { Section } from "./Section";

export const SettingsKdv = ({ appSettings, setAppSettings }) => {
  const kdvRates = appSettings.kdvRates ?? DEFAULT_KDV_RATES;
  const sorted = [...kdvRates].sort((a, b) => (a.from || "").localeCompare(b.from || ""));
  const currentRate = getKdvRateForDate(today(), kdvRates);
  const currentPeriod = [...sorted].reverse().find(p => (p.from || "") <= today()) || sorted[0];

  const update = (next) => setAppSettings(p => ({ ...p, kdvRates: next }));
  const updateRow = (idx, field, value) => update(sorted.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  const addRow = () => update([...sorted, { from: today(), rate: currentRate }]);
  const removeRow = (idx) => { if (sorted.length <= 1) return; update(sorted.filter((_, i) => i !== idx)); };

  return (
    <Section title="KDV Oranı" icon="settings">
      <div style={{ fontSize: 13, color: "var(--n500, #64748b)", marginBottom: 16, lineHeight: 1.6 }}>
        KDV oranı zaman içinde değişebildiği için tek bir oran yerine tarihe bağlı dönemler tutulur.
        Her kayıt (müşteri satışı, servis, Extra Kalıp satışı) <b>kendi tarihinde geçerli olan orana</b> göre hesaplanır.
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--grn800, #065f46)", background: "var(--grnBg3, #d1fae5)", borderRadius: 10, padding: "10px 14px", marginBottom: 18 }}>
        Şu an geçerli oran: %{currentRate}{currentPeriod?.from ? ` (${fmtTR(currentPeriod.from)}'ten itibaren)` : ""}
      </div>
      {sorted.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)", display: "block", marginBottom: 4 }}>Geçerli Olduğu Tarih</label>
            <input type="date" value={p.from || ""} onChange={e => updateRow(i, "from", e.target.value)}
              style={{ padding: "8px 10px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13, background: "var(--n100, #f8fafc)" }} />
          </div>
          <div style={{ position: "relative", width: 100 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)", display: "block", marginBottom: 4 }}>Oran (%)</label>
            <input type="number" min="0" max="100" step="1" value={p.rate ?? ""}
              onChange={e => updateRow(i, "rate", e.target.value === "" ? "" : Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
              style={{ padding: "8px 10px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13, width: "100%", boxSizing: "border-box", background: "var(--n100, #f8fafc)" }} />
          </div>
          <button onClick={() => removeRow(i)} disabled={sorted.length <= 1}
            title={sorted.length <= 1 ? "En az bir dönem olmalı" : "Bu dönemi sil"}
            style={{ padding: 8, background: "none", border: "none", cursor: sorted.length <= 1 ? "not-allowed" : "pointer", color: sorted.length <= 1 ? "var(--n300, #cbd5e1)" : "var(--red600, #dc2626)" }}>
            <Icon name="trash" size={16} />
          </button>
        </div>
      ))}
      <Btn small variant="ghost" onClick={addRow}><Icon name="plus" size={12} /> Dönem Ekle</Btn>
    </Section>
  );
};
