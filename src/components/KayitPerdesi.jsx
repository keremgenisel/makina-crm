// Spec 0077 D (R19–R27): kayıt perdesi. Yalnız gösterim ve blokajdır (C4): veri yazmaz, kayıt sırasını değiştirmez.
// Ne zaman açılacağı App'te tek kapıdan (kayitDurumu.perdeGorunurMu) kararlaştırılır; bu bileşen yalnız `acik`'ı okur.
// zIndex 2000: Modal (1000), ConfirmDialog (1100), arama paleti (1200) ve açılır listenin (1300) üstünde; bildirimler
// (99999) perdenin üstünde kalır, yani nedenli mesaj perde açıkken de okunur. Logo App'in mevcut içe aktarmasından gelir.
import { useEffect } from "react";

export const KAYIT_PERDESI_Z = 2000;
export const KAYIT_PERDESI_METNI = "Kaydediliyor";

export const KayitPerdesi = ({ acik, logo, durum }) => {
  // R20: klavye olayları da yakalanır (odaktaki alan perdenin altında kalsa bile).
  useEffect(() => {
    if (!acik) return undefined;
    const yut = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener("keydown", yut, true);
    window.addEventListener("keyup", yut, true);
    window.addEventListener("keypress", yut, true);
    return () => {
      window.removeEventListener("keydown", yut, true);
      window.removeEventListener("keyup", yut, true);
      window.removeEventListener("keypress", yut, true);
    };
  }, [acik]);
  if (!acik) return null;
  const yut = (e) => { e.preventDefault(); e.stopPropagation(); };
  return (
    <div data-testid="kayit-perdesi" role="status" aria-busy="true" aria-live="polite" data-durum={durum || "yolda"}
      onMouseDown={yut} onMouseUp={yut} onClick={yut} onDoubleClick={yut} onContextMenu={yut} onWheel={yut}
      style={{ position: "fixed", inset: 0, zIndex: KAYIT_PERDESI_Z, background: "var(--perdeBg, rgba(255,255,255,.78))",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, cursor: "progress", userSelect: "none" }}>
      {logo && <img src={logo} alt="Altuntaş" draggable={false} style={{ width: 120, height: "auto", opacity: 0.95 }} />}
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--n900, #0f172a)", letterSpacing: 0.2 }}>{KAYIT_PERDESI_METNI}</div>
    </div>
  );
};
