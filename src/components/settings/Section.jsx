import { useState } from "react";
import { Icon } from "../ui";

// Modül seviyesinde tanımlı — Settings sekmeleri içinde tanımlansaydı her render'da yeni bir
// komponent referansı oluşur, React onu farklı bir tip sanıp alt ağacı yeniden mount eder
// (input'lar her tuşa basışta focus kaybeder). Sadece props alıyor, çağıranın içindeki hiçbir şeye ihtiyacı yok.
// collapsible: başlık tıklanınca içerik açılır/kapanır (akordeon); defaultOpen ile başlangıç durumu.
export const Section = ({ title, icon, children, collapsible = false, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const acik = !collapsible || open;
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: acik ? 24 : "18px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", marginBottom: 20, maxWidth: 720 }}>
      <div
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
        style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: acik ? 16 : 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: collapsible ? "pointer" : "default", userSelect: collapsible ? "none" : "auto" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#e85d1a" }}><Icon name={icon} size={18} /></span>{title}
        </span>
        {collapsible && <span style={{ fontSize: 12, color: "#94a3b8" }}>{open ? "▾" : "▸"}</span>}
      </div>
      {acik && children}
    </div>
  );
};
