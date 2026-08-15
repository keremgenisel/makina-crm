import { useState } from "react";
import { DEFAULT_KK_KOMISYONLARI } from "../../lib/constants";
import { Icon, Btn } from "../ui";
import { Section } from "./Section";

// Kredi Kartı Taksit Komisyonları — Ayarlar > Evrak & Süreçler. KDV oran tablosu (SettingsKdv) deseni.
// appSettings.krediKartiKomisyonlari = { bsmv, satirlar:[{taksit, oran, katkiPayi, blokajGun}] } düzenler.
// "oran" = banka ekranındaki Komisyon Oranı (BSMV DÂHİL); uygulama üye işyeri + BSMV'yi ayrıştırır.
// Değişiklikler YEREL taslakta tutulur; alttaki yapışkan (sticky) Kaydet ile appSettings'e (veritabanına) yazılır.
const num = (v, max) => {
  if (v === "" || v == null) return "";
  const n = parseFloat(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return "";
  return max != null ? Math.max(0, Math.min(max, n)) : Math.max(0, n);
};
const kayitliAyar = (appSettings) => (appSettings.krediKartiKomisyonlari && typeof appSettings.krediKartiKomisyonlari === "object")
  ? appSettings.krediKartiKomisyonlari : DEFAULT_KK_KOMISYONLARI;
const normalizeAyar = (a) => ({
  bsmv: Number(a.bsmv) || 0,
  satirlar: (Array.isArray(a.satirlar) ? a.satirlar : []).map(s => ({
    taksit: Math.max(1, parseInt(s.taksit) || 1),
    oran: Number(s.oran) || 0,
    katkiPayi: Number(s.katkiPayi) || 0,
    blokajGun: Math.max(0, parseInt(s.blokajGun) || 0),
  })),
});
const inpStyle = { padding: "8px 10px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13, width: "100%", boxSizing: "border-box", background: "var(--n100, #f8fafc)", textAlign: "right", fontVariantNumeric: "tabular-nums" };
const lblStyle = { fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)", display: "block", marginBottom: 4 };

export const SettingsKKKomisyon = ({ appSettings, setAppSettings, flash = () => {} }) => {
  const [taslak, setTaslak] = useState(() => kayitliAyar(appSettings));
  const bsmv = taslak.bsmv ?? 0; // düzenlerken "" olabilir; ?? yalnız null/undefined'ı yakalar
  const satirlar = Array.isArray(taslak.satirlar) ? taslak.satirlar : [];
  const sorted = [...satirlar].sort((a, b) => (parseInt(a.taksit) || 0) - (parseInt(b.taksit) || 0));

  const update = (next) => setTaslak(next);
  const setBsmv = (v) => update({ ...taslak, satirlar, bsmv: v === "" ? "" : num(v, 100) });
  const setRow = (idx, alan, deger) => update({ ...taslak, satirlar: sorted.map((s, i) => (i === idx ? { ...s, [alan]: deger } : s)) });
  const addRow = () => {
    const enBuyuk = sorted.reduce((m, s) => Math.max(m, parseInt(s.taksit) || 0), 0);
    update({ ...taslak, satirlar: [...sorted, { taksit: enBuyuk + 1 || 2, oran: 0, katkiPayi: 0.5, blokajGun: 0 }] });
  };
  const removeRow = (idx) => { if (sorted.length <= 1) return; update({ ...taslak, satirlar: sorted.filter((_, i) => i !== idx) }); };

  const degisti = JSON.stringify(taslak) !== JSON.stringify(kayitliAyar(appSettings));
  const kaydet = () => {
    const n = normalizeAyar(taslak);
    setAppSettings(p => ({ ...p, krediKartiKomisyonlari: n }));
    setTaslak(n);
    flash("ok", "Kredi kartı komisyonları kaydedildi.");
  };

  return (
    <Section title="Kredi Kartı Komisyonları" icon="settings" wide>
      <div className="section-desc" style={{ marginBottom: 14 }}>
        Kartla satışta banka, taksit sayısına göre komisyon keser. Buraya <b>banka ekranınızdaki "Komisyon
        Oranı"nı (BSMV dâhil)</b> girin; uygulama <b>Üye İşyeri Ücreti + BSMV</b>'yi otomatik ayrıştırır ve
        ayrıca <b>Taksitli Satış Katkı Payı</b>'nı ekler. <b>Blokaj Gün</b>: paranın hesaba geçmesi için beklenen
        gün sayısıdır; tek çekimde yaklaşık 40, taksitli satışta 0 (yani hemen geçer). Tek çekim satırı için{" "}
        <b>Taksit</b> değerini 1 girin. Değişiklikler alttaki <b>Kaydet</b>'e basınca uygulanır.
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 18, padding: "12px 16px", background: "var(--ambBg3, #fff7ed)", border: "1px solid var(--ambBr3, #fed7aa)", borderRadius: 10, maxWidth: 320 }}>
        <div style={{ flex: 1 }}>
          <label style={lblStyle}>BSMV Oranı (%)</label>
          <input type="number" min="0" max="100" step="0.01" value={bsmv === "" ? "" : bsmv}
            onChange={e => setBsmv(e.target.value)} style={{ ...inpStyle, background: "var(--surface, #fff)" }} />
        </div>
        <span style={{ fontSize: 11.5, color: "var(--n500, #64748b)", paddingBottom: 8, flex: 1 }}>
          Banka, üye işyeri ücretinin bu oranını BSMV olarak ekler (genelde %5).
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(120px,1.2fr) 1fr 1fr 1fr auto", gap: 10, minWidth: 520 }}>
          <div style={lblStyle}>Taksit</div>
          <div style={lblStyle}>Komisyon Oranı % <span style={{ fontWeight: 500 }}>(BSMV dâhil)</span></div>
          <div style={lblStyle}>Katkı Payı %</div>
          <div style={lblStyle}>Blokaj Gün</div>
          <div />
          {sorted.map((s, i) => {
            const t = parseInt(s.taksit) || 0;
            return (
              <div key={i} style={{ display: "contents" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="number" min="1" step="1" value={s.taksit ?? ""}
                    onChange={e => setRow(i, "taksit", e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ ...inpStyle, width: 64, textAlign: "center" }} />
                  {t === 1 && <span style={{ fontSize: 10, fontWeight: 800, color: "var(--amb800, #92400e)", background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 20, padding: "2px 7px", whiteSpace: "nowrap" }}>TEK ÇEKİM</span>}
                </div>
                <input type="number" min="0" max="100" step="0.001" value={s.oran ?? ""}
                  onChange={e => setRow(i, "oran", e.target.value === "" ? "" : num(e.target.value, 100))} style={inpStyle} />
                <input type="number" min="0" max="100" step="0.001" value={s.katkiPayi ?? ""}
                  onChange={e => setRow(i, "katkiPayi", e.target.value === "" ? "" : num(e.target.value, 100))} style={inpStyle} />
                <input type="number" min="0" step="1" value={s.blokajGun ?? ""}
                  onChange={e => setRow(i, "blokajGun", e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value) || 0))} style={inpStyle} />
                <button onClick={() => removeRow(i)} disabled={sorted.length <= 1}
                  title={sorted.length <= 1 ? "En az bir satır olmalı" : "Bu satırı sil"}
                  style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, cursor: sorted.length <= 1 ? "not-allowed" : "pointer",
                    border: `1px solid ${sorted.length <= 1 ? "var(--n200, #e2e8f0)" : "var(--redBr, #fecaca)"}`,
                    background: sorted.length <= 1 ? "var(--n100, #f8fafc)" : "var(--redBg, #fef2f2)",
                    color: sorted.length <= 1 ? "var(--n300, #cbd5e1)" : "var(--red600, #dc2626)" }}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <Btn small variant="ghost" onClick={addRow}><Icon name="plus" size={12} /> Satır Ekle</Btn>
      </div>

      {/* Yapışkan Kaydet çubuğu — tablo uzasa da her zaman erişilebilir (uygulamanın form footer deseni) */}
      <div style={{ position: "sticky", bottom: 0, marginTop: 18, marginLeft: -24, marginRight: -24, marginBottom: -24, padding: "12px 24px", background: "var(--footerBg, rgba(248,250,252,.94))", borderTop: "1px solid var(--n150, #f1f5f9)", backdropFilter: "blur(4px)", borderRadius: "0 0 12px 12px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
        {degisti && <span style={{ fontSize: 12, fontWeight: 600, color: "var(--amb700, #b45309)" }}>Kaydedilmemiş değişiklik var</span>}
        <Btn onClick={kaydet} disabled={!degisti}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>
    </Section>
  );
};
