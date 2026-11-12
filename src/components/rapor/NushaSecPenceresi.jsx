import { Modal } from "../ui";

// Spec 0144 B-R1, B-R1/2 (AC-17, AC-73): sipariş listesinin "Yazdır"ı fiyatlı mı fiyatsız mı basılacağını sorar. DilSecPenceresi'nin
// kardeşidir (Modal, maxWidth 300, iki düğme); başlık, düğme metinleri ve test kimlikleri bu dosyanın sabitleri. Pencere yazdırma
// API'sini çağırmaz, yalnız sorar (0140 E-R7); seçim kaydedilmez. Durum çağıranda (SiparisPenceresi, B-R1/3).
export const NUSHA_BASLIGI = "Hangi nüsha basılsın?";
export const NUSHA_FIYATSIZ = "Fiyatsız";
export const NUSHA_FIYATLI = "Fiyatlı";
export const NUSHA_IPUCU = "Firmaya fiyatsız nüsha verilir; fiyatlı nüsha birim fiyat ve tutar taşır.";
export const NUSHA_TESTID = { pencere: "nusha-sec-penceresi", fiyatsiz: "nusha-fiyatsiz", fiyatli: "nusha-fiyatli" };

const DUGME = {
  flex: 1, padding: "12px 0", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
  background: "var(--n100, #f8fafc)", color: "var(--n900, #0f172a)",
};

export function NushaSecPenceresi({ onSec, onClose }) {
  return (
    <Modal title={NUSHA_BASLIGI} onClose={onClose} maxWidth={300}>
      <div data-testid={NUSHA_TESTID.pencere}>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", padding: "8px 0 4px" }}>
          <button type="button" data-testid={NUSHA_TESTID.fiyatsiz} onClick={() => onSec(false)} style={DUGME}>{NUSHA_FIYATSIZ}</button>
          <button type="button" data-testid={NUSHA_TESTID.fiyatli} onClick={() => onSec(true)} style={DUGME}>{NUSHA_FIYATLI}</button>
        </div>
        <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 8 }}>{NUSHA_IPUCU}</div>
      </div>
    </Modal>
  );
}
