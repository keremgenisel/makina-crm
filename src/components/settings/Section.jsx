import { Icon } from "../ui";

// Modül seviyesinde tanımlı — Settings sekmeleri içinde tanımlansaydı her render'da yeni bir
// komponent referansı oluşur, React onu farklı bir tip sanıp alt ağacı yeniden mount eder
// (input'lar her tuşa basışta focus kaybeder). Sadece props alıyor, çağıranın içindeki hiçbir şeye ihtiyacı yok.
export const Section = ({ title, icon, children }) => (
  <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,.08)", marginBottom: 20, maxWidth: 720 }}>
    <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: "#e85d1a" }}><Icon name={icon} size={18} /></span>{title}
    </div>
    {children}
  </div>
);
