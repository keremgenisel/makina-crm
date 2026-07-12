import { fmtCur, fmtTR } from "../../../lib/utils";

export const PaymentSection = ({
  detailView,
  detailCiro,
  detailToplamOdeme,
  detailKalanBorcToplam,
  detailKalanBorc,
  detailEkBorcAyniPB,
  detailEkBorcDigerPB,
  detailBekleyenCek,
  detailCekVadesiGecmisVar,
  detailEnYakinCekVade = "",
  detailBekleyenTaksit = 0,
  detailTaksitGecikmisVar = false,
  detailEnYakinTaksitVade = "",
  detailMainCur,
  detailBorcFromPrevOwner,
}) => {
  if (!detailView) return null;
  if (detailCiro === 0 && detailKalanBorcToplam === 0 && detailEkBorcDigerPB.length === 0 && detailBekleyenCek === 0 && detailBekleyenTaksit === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <div style={{ background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderTop: "3px solid #e85d1a", borderRadius: 12, padding: "14px 18px" }}>
          <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)", fontWeight: 700, letterSpacing: .5, marginBottom: 6, textTransform: "uppercase" }}>Toplam Bedel</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--n900, #0f172a)" }}>{fmtCur(detailCiro, detailView.currency)}</div>
        </div>
        <div style={{ background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderTop: "3px solid var(--grn600, #16a34a)", borderRadius: 12, padding: "14px 18px" }}>
          <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)", fontWeight: 700, letterSpacing: .5, marginBottom: 6, textTransform: "uppercase" }}>Kapora/Ödeme Alınan</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--grn700, #15803d)" }}>{fmtCur(detailToplamOdeme, detailView.currency)}</div>
        </div>
        <div style={{
          background: detailKalanBorcToplam > 0 ? "var(--redBg, #fef2f2)" : "var(--grnBg, #f0fdf4)",
          border: `1px solid ${detailKalanBorcToplam > 0 ? "var(--redBr, #fecaca)" : "var(--grnBr, #bbf7d0)"}`,
          borderTop: `3px solid ${detailKalanBorcToplam > 0 ? "var(--red600, #dc2626)" : "var(--grn600, #16a34a)"}`,
          borderRadius: 12, padding: "14px 18px",
        }}>
          <div style={{ fontSize: 11, color: detailKalanBorcToplam > 0 ? "var(--red800, #991b1b)" : "var(--grn700, #15803d)", fontWeight: 700, letterSpacing: .5, marginBottom: 6, textTransform: "uppercase" }}>Kalan Borç</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: detailKalanBorcToplam > 0 ? "var(--red600, #dc2626)" : "var(--grn700, #15803d)" }}>
            {detailKalanBorcToplam > 0 ? fmtCur(detailKalanBorcToplam, detailView.currency) : "✓ Borç Yok"}
          </div>
          {detailEkBorcAyniPB > 0 && (
            <div style={{ fontSize: 10.5, color: "var(--red800, #991b1b)", marginTop: 5 }}>
              ({fmtCur(Math.max(detailKalanBorc, 0), detailView.currency)} makina + {fmtCur(detailEkBorcAyniPB, detailView.currency)} servis/parça/kalıp)
            </div>
          )}
          {detailView.isResale && detailBorcFromPrevOwner && (
            <div style={{ fontSize: 10.5, color: "var(--red800, #991b1b)", marginTop: 5, fontStyle: "italic" }}>
              Bu borcun bir kısmı/tamamı önceki sahip <b>{detailView.prevOwners[detailView.prevOwners.length - 1].name}</b>'den kalmış olabilir.
            </div>
          )}
        </div>
      </div>
      {detailEkBorcDigerPB.length > 0 && (
        <div style={{ fontSize: 11.5, color: "var(--red800, #991b1b)", background: "var(--redBg, #fef2f2)", border: "1px solid var(--redBr, #fecaca)", borderRadius: 8, padding: "8px 12px", marginTop: 10, fontWeight: 600 }}>
          Ayrıca farklı para biriminden ödenmemiş servis/parça/Extra Kalıp borcu var (yukarıdaki toplama dahil edilmedi):{" "}
          {detailEkBorcDigerPB.map(([cur, tutar]) => fmtCur(tutar, cur)).join(" + ")}
        </div>
      )}
      {detailBekleyenCek > 0 && (
        <div style={{
          fontSize: 11.5, fontWeight: 600, borderRadius: 8, padding: "8px 12px", marginTop: 10,
          color: detailCekVadesiGecmisVar ? "var(--red800, #991b1b)" : "var(--amb800, #92400e)",
          background: detailCekVadesiGecmisVar ? "var(--redBg, #fef2f2)" : "var(--ambBg, #fffbeb)",
          border: `1px solid ${detailCekVadesiGecmisVar ? "var(--redBr, #fecaca)" : "var(--ambBr, #fde68a)"}`,
        }}>
          {detailCekVadesiGecmisVar
            ? <>Vadesi geçti! {fmtCur(detailBekleyenCek, detailMainCur)} çek tahsil edilmedi.</>
            : <>{fmtCur(detailBekleyenCek, detailMainCur)} tahsil edilecek çek bekliyor{detailEnYakinCekVade ? <> (en yakın vade {fmtTR(detailEnYakinCekVade)})</> : null}.</>}
        </div>
      )}
      {detailBekleyenTaksit > 0 && (
        <div style={{
          fontSize: 11.5, fontWeight: 600, borderRadius: 8, padding: "8px 12px", marginTop: 10,
          color: detailTaksitGecikmisVar ? "var(--red800, #991b1b)" : "var(--amb800, #92400e)",
          background: detailTaksitGecikmisVar ? "var(--redBg, #fef2f2)" : "var(--ambBg, #fffbeb)",
          border: `1px solid ${detailTaksitGecikmisVar ? "var(--redBr, #fecaca)" : "var(--ambBr, #fde68a)"}`,
        }}>
          {detailTaksitGecikmisVar
            ? <>Vadesi geçti! {fmtCur(detailBekleyenTaksit, detailMainCur)} taksit tahsil edilmedi.</>
            : <>{fmtCur(detailBekleyenTaksit, detailMainCur)} taksit bekliyor{detailEnYakinTaksitVade ? <> (en yakın vade {fmtTR(detailEnYakinTaksitVade)})</> : null}.</>}
        </div>
      )}
    </div>
  );
};
