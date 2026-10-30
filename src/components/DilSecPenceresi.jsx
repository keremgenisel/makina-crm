import { Modal } from "./ui";

// Çıktı dili seçimi (TR / EN). Müşteri detayının yazdır/e-posta düğmeleri ve Servis ve Kargo Panosu'nun
// "Yazdır" düğmesi aynı pencereyi açar; iki yer ayrışmasın diye tek bileşen.
export const CIKTI_DILLERI = ["TR", "EN"];

export function DilSecPenceresi({ onSec, onClose }) {
  return (
    <Modal title="Dil Seçin" onClose={onClose} maxWidth={300}>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", padding: "8px 0 4px" }}>
        {CIKTI_DILLERI.map(l => (
          <button key={l} onClick={() => onSec(l)} style={{
            width: 80, padding: "12px 0", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10,
            fontSize: 18, fontWeight: 800, cursor: "pointer",
            background: "var(--n100, #f8fafc)", color: "var(--n900, #0f172a)",
          }}>{l}</button>
        ))}
      </div>
    </Modal>
  );
}
