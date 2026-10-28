import { tamirRozetMetni } from "../lib/kalipTamiri";

// Spec 0115 R25, R30, Karar 55: kalıbı atölyede olan servisin rozeti; tek bileşen (pano kartı ve Makina Geçmişi). Sayı yazar,
// kalıp adı yazmaz; bitmemiş tamir yoksa çizilmez. Renk amber (sözlüğe taşınmadı, "Bilinen borç").
export const TamirRozeti = ({ ozet, style }) => (ozet && ozet.bitmemis > 0 ? (
  <span data-testid="tamir-rozeti" style={{ display: "inline-flex", alignItems: "center", fontSize: 10.5, fontWeight: 800, letterSpacing: 0.3,
    borderRadius: 7, padding: "3px 8px", color: "var(--amb700, #b45309)", background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)", whiteSpace: "nowrap", ...style }}>
    {tamirRozetMetni(ozet)}
  </span>
) : null);
