// Spec 0106 R22, R22/2, Karar 34: müşteri satırının durum pili. Ölçüler Makina Stoğu rozetinin aynısı (11,5 punto, 700 kalınlık,
// 6 köşe, "3px 9px" dolgu); metin ve renk musteriDurumu.js'ten gelir, bu bileşen yalnız çizer (R27). Paylaşılan rozet değildir:
// sözlükte "Bilinen borç" (iki yerel kopya: bu ve MakinaStokTab'ın Rozet'i).
export const DurumPili = ({ pil }) => (
  <span data-testid="durum-pili" style={{
    display: "inline-block", fontSize: 11.5, fontWeight: 700, borderRadius: 6, whiteSpace: "nowrap",
    color: pil.renk, background: pil.zemin,
    ...(pil.kenar ? { border: `1px solid ${pil.kenar}`, padding: "2px 8px" } : { padding: "3px 9px" }),
  }}>{pil.metin}</span>
);

// R14, C8: hücrede piller alt alta durur.
export const DurumPilleri = ({ piller }) => (piller.length ? (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
    {piller.map(p => <DurumPili key={p.metin} pil={p} />)}
  </div>
) : <span style={{ color: "var(--n300, #cbd5e1)" }}>—</span>);
