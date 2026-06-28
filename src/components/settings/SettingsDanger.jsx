import { useState } from "react";
import { DEFAULT_KDV_RATES } from "../../lib/constants";
import { today, fmtTR, getKdvRateForDate } from "../../lib/utils";
import { Icon, Btn, Modal } from "../ui";
import { Section } from "./Section";

export const SettingsDanger = ({ flash }) => {
  const [confirmUninstall, setConfirmUninstall] = useState(false);

  const doUninstall = async () => {
    setConfirmUninstall(false);
    if (window.appControl?.uninstall) {
      const ok = await window.appControl.uninstall();
      if (!ok) flash("err", "Kaldırma aracı bulunamadı. Denetim Masası'ndaki Programlar bölümünden kaldırabilirsiniz.");
    } else {
      flash("err", "Bu özellik yalnızca kurulu uygulamada çalışır.");
    }
  };

  return (
    <>
      <Section title="Tehlikeli Bölge" icon="trash">
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20, lineHeight: 1.6 }}>
          Buradaki işlemler <b>geri alınamaz</b> veya ciddi sonuçlar doğurabilir. Dikkatli ilerleyin.
        </div>

        <div style={{ border: "1.5px solid #fecaca", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ background: "#fef2f2", padding: "12px 18px", borderBottom: "1px solid #fecaca", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="trash" size={15} />
            <span style={{ fontSize: 13, fontWeight: 800, color: "#b91c1c" }}>Uygulamayı Kaldır</span>
          </div>
          <div style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14, lineHeight: 1.6 }}>
              <b>Müşteri ve servis verileriniz silinmez,</b> tekrar
              kurarsanız kayıtlarınız geri gelir. Kaldırmadan önce Ayarlar → Yedekleme'den yedek almanız önerilir.
            </div>
            <Btn variant="danger" onClick={() => setConfirmUninstall(true)}>
              <Icon name="trash" size={14} /> Uygulamayı Kaldır
            </Btn>
          </div>
        </div>
      </Section>

      {confirmUninstall && (
        <Modal title="Uygulamayı Kaldır" onClose={() => setConfirmUninstall(false)}>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 8 }}>
            Altunmak CRM bilgisayarınızdan kaldırılacak ve uygulama kapanacak.
          </div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 20 }}>
            Verileriniz silinmez; tekrar kurulumda geri gelir. Devam etmeden önce
            <b> yedek almanız</b> önerilir.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setConfirmUninstall(false)}>Vazgeç</Btn>
            <Btn variant="danger" onClick={doUninstall}><Icon name="trash" size={14} /> Evet, Kaldır</Btn>
          </div>
        </Modal>
      )}
    </>
  );
};

// KDV oranı zaman içinde değiştiği için (Türkiye: 2023-07-10'a kadar %18, sonrasında %20) tek bir
// sayı yerine tarihe bağlı dönemler listesi tutulur — her kayıt kendi tarihindeki orana göre hesaplanır
// (bkz. src/lib/utils.js getKdvRateForDate/calcKDV). Burada sadece bu dönem listesi düzenlenir.
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
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
        KDV oranı zaman içinde değişebildiği için tek bir oran yerine tarihe bağlı dönemler tutulur.
        Her kayıt (müşteri satışı, servis, Extra Kalıp satışı) <b>kendi tarihinde geçerli olan orana</b> göre hesaplanır.
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#065f46", background: "#d1fae5", borderRadius: 10, padding: "10px 14px", marginBottom: 18 }}>
        Şu an geçerli oran: %{currentRate}{currentPeriod?.from ? ` (${fmtTR(currentPeriod.from)}'ten itibaren)` : ""}
      </div>
      {sorted.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>Geçerli Olduğu Tarih</label>
            <input type="date" value={p.from || ""} onChange={e => updateRow(i, "from", e.target.value)}
              style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#f8fafc" }} />
          </div>
          <div style={{ position: "relative", width: 100 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>Oran (%)</label>
            <input type="number" min="0" max="100" step="1" value={p.rate ?? ""}
              onChange={e => updateRow(i, "rate", e.target.value === "" ? "" : Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
              style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, width: "100%", boxSizing: "border-box", background: "#f8fafc" }} />
          </div>
          <button onClick={() => removeRow(i)} disabled={sorted.length <= 1}
            title={sorted.length <= 1 ? "En az bir dönem olmalı" : "Bu dönemi sil"}
            style={{ padding: 8, background: "none", border: "none", cursor: sorted.length <= 1 ? "not-allowed" : "pointer", color: sorted.length <= 1 ? "#cbd5e1" : "#dc2626" }}>
            <Icon name="trash" size={16} />
          </button>
        </div>
      ))}
      <Btn small variant="ghost" onClick={addRow}><Icon name="plus" size={12} /> Dönem Ekle</Btn>
    </Section>
  );
};
