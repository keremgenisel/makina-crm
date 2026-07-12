import { useState } from "react";
import { Icon, Btn } from "../ui";
import { Section } from "./Section";

// ── Takip Süreleri ────────────────────────────────────────────────────────────
// Dashboard hatırlatma kutularının zaman eşikleri. Bilerek canlı onChange değil:
// değerler yerel tutulur, Kaydet ile appSettings'e (dolayısıyla veritabanına) yazılır.
export const SettingsTakip = ({ appSettings = {}, setAppSettings = null, flash = () => {} }) => {
  const [teklifGun, setTeklifGun] = useState(String(appSettings.teklifTakipGun ?? 7));
  const [tahsilatGun, setTahsilatGun] = useState(String(appSettings.tahsilatTakipGun ?? 7));

  const kaydet = () => {
    const t1 = Math.min(90, Math.max(1, parseInt(teklifGun) || 7));
    const t2 = Math.min(90, Math.max(1, parseInt(tahsilatGun) || 7));
    setTeklifGun(String(t1)); setTahsilatGun(String(t2));
    setAppSettings?.(p => ({ ...p, teklifTakipGun: t1, tahsilatTakipGun: t2 }));
    flash("ok", "Takip süreleri kaydedildi.");
  };

  const inp = { width: 80, padding: "8px 10px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13, background: "var(--n100, #f8fafc)" };
  const degisti = String(appSettings.teklifTakipGun ?? 7) !== teklifGun || String(appSettings.tahsilatTakipGun ?? 7) !== tahsilatGun;

  return (
    <Section title="Takip Süreleri" icon="notes">
      <div style={{ fontSize: 13, color: "var(--n500, #64748b)", marginBottom: 16, lineHeight: 1.6 }}>
        Anasayfadaki hatırlatma kutularının zaman eşikleri. Değişiklikler Kaydet'e basınca uygulanır
        ve tüm kullanıcılar için geçerli olur.
      </div>

      {/* Sabit kolonlu grid: kutular ve metinler iki satırda da aynı hizada başlar */}
      <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: "14px 12px", alignItems: "start", marginBottom: 16 }}>
        <input type="number" min="1" max="90" value={teklifGun} onChange={e => setTeklifGun(e.target.value)} style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--n900, #0f172a)" }}>Teklif takip eşiği (gün)</div>
          <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)", marginTop: 2 }}>Gönderilen teklif bu kadar gün cevapsız kalırsa "Takip Edilecek Teklifler" kutusuna düşer.</div>
        </div>
        <input type="number" min="1" max="90" value={tahsilatGun} onChange={e => setTahsilatGun(e.target.value)} style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--n900, #0f172a)" }}>Beklenen tahsilat penceresi (gün)</div>
          <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)", marginTop: 2 }}>Vadesi bu kadar gün içinde olan çek ve taksitler "Beklenen Tahsilat" kutusunda gösterilir (gecikenler her zaman görünür).</div>
        </div>
      </div>

      <Btn onClick={kaydet}><Icon name="check" size={14} /> Kaydet</Btn>
    </Section>
  );
};
