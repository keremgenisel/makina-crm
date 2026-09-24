import { Btn, Modal } from "../ui";

// Evrak → CRM kayıt özeti (spec 0006 R16, AC-19/21/26/27/32/36). Kalıcı kayıt değildir; belgenin satırındaki
// "üretilen kayıtlar" listesi kalıcı bağlardan her zaman görülebilir.
const bolum = (baslik, renk, children, testId) => (
  <div data-testid={testId} style={{ border: `1px solid ${renk[1]}`, background: renk[0], borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
    <div style={{ fontSize: 12, fontWeight: 800, color: renk[2], textTransform: "uppercase", letterSpacing: .5, marginBottom: 6 }}>{baslik}</div>
    {children}
  </div>
);
const YESIL = ["var(--grnBg, #f0fdf4)", "var(--grnBr, #bbf7d0)", "var(--grn700, #15803d)"];
const AMBER = ["var(--ambBg, #fffbeb)", "var(--ambBr, #fde68a)", "var(--amb700, #b45309)"];
const KIRMIZI = ["var(--redBg, #fef2f2)", "var(--redBr, #fecaca)", "var(--red700, #b91c1c)"];
const satir = { display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "3px 0" };

export const UretimOzeti = ({ ozet, onClose }) => (
  <Modal title={`CRM kaydı özeti${ozet.teklifNo ? ` · ${ozet.teklifNo}` : ""}`} onClose={onClose}
    footer={<div style={{ display: "flex", justifyContent: "flex-end" }}><Btn onClick={onClose}>Kapat</Btn></div>}>
    <div data-testid="uretim-ozeti" style={{ maxHeight: 460, overflowY: "auto" }}>
      {ozet.bilgi?.map((b, i) => <div key={i} style={{ fontSize: 13, marginBottom: 10, fontWeight: 600 }}>{b}</div>)}
      {ozet.eksikIzinler?.length > 0 && bolum("Eksik izinler", KIRMIZI, ozet.eksikIzinler.map(e => <div key={e.id} style={satir}>{e.ad}</div>), "ozet-eksik-izin")}
      {ozet.uretilen?.length > 0 && bolum(`Üretilen kayıtlar (${ozet.uretilen.length})`, YESIL,
        ozet.uretilen.map((u, i) => <div key={i} style={satir}><span><b>{u.tur}</b> · {u.ad}</span><span style={{ color: "var(--n500, #64748b)" }}>{u.not}</span></div>), "ozet-uretilen")}
      {ozet.atlananlar?.length > 0 && bolum(`Kayda dönüşmeyen kalemler (${ozet.atlananlar.length})`, AMBER,
        ozet.atlananlar.map((a, i) => <div key={i} style={satir}><b>{a.ad}</b><span>{a.neden}</span></div>), "ozet-atlanan")}
      {ozet.silinmisUretilenler?.length > 0 && bolum("Uyarı", AMBER,
        <div style={{ fontSize: 13 }}>Belgeden sonradan silinmiş {ozet.silinmisUretilenler.length} kalemin daha önce ürettiği kayıt silinmedi. Gerekirse ilgili kaydı kendi ekranından silin.</div>, "ozet-silinmis")}
      {ozet.yuvarlamaFarki ? <div style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>İskonto dağıtımında {ozet.yuvarlamaFarki} yuvarlama farkı kaldı.</div> : null}
      {!ozet.uretilen?.length && !ozet.atlananlar?.length && !ozet.eksikIzinler?.length && !ozet.bilgi?.length && <div style={{ fontSize: 13 }}>Üretilecek kayıt yok.</div>}
    </div>
  </Modal>
);
