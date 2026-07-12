import { fmtTR } from "../../../lib/utils";
import { resolveSatisYapan } from "../../../lib/utils";
import { Icon } from "../../ui";

export const OwnershipSection = ({
  detailView,
  factory,
  canDo,
  onEditPrevOwner,
  onRequestUndoOwner,
}) => {
  if (!detailView?.prevOwners?.length) return null;

  return (
    <div style={{ background: "var(--ambBg3, #fff7ed)", border: "1px solid var(--ambBr3, #fed7aa)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 10, color: "var(--n900, #0f172a)", fontSize: 13 }}>Sahiplik Geçmişi</div>
      {detailView.prevOwners.map((o, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--warmBr, #fde8d2)" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--red600, #dc2626)" }}>{i + 1}. Sahip: {o.name}</div>
            <div style={{ fontSize: 11, color: "var(--amb800, #92400e)" }}>
              {o.country || ""}{o.city ? ` / ${o.city}` : ""}{o.satisYapan ? ` · Satış: ${resolveSatisYapan(o.satisYapan, factory)}` : ""}{o.phone ? ` · Tel: ${o.phone}` : ""}{o.email ? ` · ${o.email}` : ""}
            </div>
            {(o.yetkili1Ad || o.yetkili2Ad) && (
              <div style={{ fontSize: 11, color: "var(--amb800, #92400e)" }}>
                {[o.yetkili1Ad && `${o.yetkili1Ad}${o.yetkili1Tel ? ` (${o.yetkili1Tel})` : ""}`, o.yetkili2Ad && `${o.yetkili2Ad}${o.yetkili2Tel ? ` (${o.yetkili2Tel})` : ""}`].filter(Boolean).join(" · ")}
              </div>
            )}
            {o.aciklama && <div style={{ fontSize: 11, color: "var(--amb800, #92400e)", marginTop: 2, fontStyle: "italic" }}>"{o.aciklama}"</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)", textAlign: "right" }}>
              Devir tarihi<br /><b style={{ color: "var(--n600, #475569)" }}>{fmtTR(o.soldDate)}</b>
            </div>
            {canDo("cust_detail_new_owner") && (
              <button onClick={() => onEditPrevOwner(detailView.id, i, o)} title="Bu kaydı düzelt"
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--n400, #94a3b8)", padding: 4 }}>
                <Icon name="edit" size={14} />
              </button>
            )}
            {i === detailView.prevOwners.length - 1 && canDo("cust_detail_new_owner") && (
              <button onClick={() => onRequestUndoOwner(detailView.id)} title="Son devri geri al"
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--red600, #dc2626)", padding: 4 }}>
                <Icon name="refresh" size={14} />
              </button>
            )}
          </div>
        </div>
      ))}
      <div style={{ paddingTop: 8, fontSize: 12, fontWeight: 700, color: "var(--emerald, #059669)" }}>
        Mevcut Sahip: {detailView.name}
      </div>
    </div>
  );
};
