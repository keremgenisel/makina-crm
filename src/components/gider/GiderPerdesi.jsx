import { Icon } from "../ui";

// Giderler sekmesinin yayın perdesi sayfası (spec 0008 R1, R8; GEÇİCİ, bkz. lib/yayinPerdesi.js).
// Metin tarih, süre veya sürüm sözü vermez (AC-12).
export const GiderPerdesi = () => (
  <div data-testid="gider-perdesi" style={{ display: "flex", justifyContent: "center", padding: "64px 16px" }}>
    <div style={{ maxWidth: 520, textAlign: "center", background: "var(--surface, #fff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 14, padding: "36px 28px" }}>
      <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 14, background: "var(--ambBg, #fffbeb)", color: "var(--amb700, #b45309)", marginBottom: 16 }}>
        <Icon name="gider" size={24} />
      </div>
      <h2 style={{ margin: "0 0 10px", fontSize: 20, color: "var(--n900, #0f172a)" }}>Giderler</h2>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--n600, #475569)" }}>
        Bu bölüm üzerinde çalışma sürüyor. Hazır olduğunda buradan kullanabileceksiniz.
      </p>
    </div>
  </div>
);
