import { useState, useEffect } from "react";
import { today, fmtTR, parseMoney } from "../lib/utils";
import { StatCard } from "./ui";

export const Dashboard = ({ customers, dealers, services, stock = [], onGoServices, onGoStock, onGoCustomers, onGoDealers, onGoExpired, onGoDebtors, onGoWarrantyActive, onGoSerialPending }) => {
  const expiredCount = customers.filter(c => c.warrantyEnd && c.warrantyEnd < today()).length;

  // ── Aksiyon gerektiren uyarılar ──
  const realCustomers = customers.filter(c => !c.isResale);
  const borcluCount = realCustomers.filter(c => parseMoney(c.kalanBorc) > 0).length;
  const seriNoBekleyenCount = realCustomers.filter(c => c.seriNoBekliyor && !c.serialNo).length;
  // Garantisi hâlâ devam eden (henüz bitmemiş) makineler
  const garantiDevamCount = realCustomers.filter(c => c.warrantyEnd && c.warrantyEnd >= today()).length;

  // ── Canlı saat & tarih ──
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const saat = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const tarih = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;

  // ── Döviz kurları (ücretsiz API) ──
  const [rates, setRates] = useState(null); // { usd, eur }
  const [ratesErr, setRatesErr] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const fetchRates = async () => {
      try {
        const r = await fetch("https://open.er-api.com/v6/latest/USD");
        const j = await r.json();
        if (cancelled) return;
        if (j && j.rates && j.rates.TRY) {
          const usdTry = j.rates.TRY;
          const eurTry = j.rates.EUR ? (j.rates.TRY / j.rates.EUR) : null;
          setRates({ usd: usdTry, eur: eurTry });
          setRatesErr(false);
        } else { setRatesErr(true); }
      } catch { if (!cancelled) setRatesErr(true); }
    };
    fetchRates();
    const t = setInterval(fetchRates, 10 * 1000); // 10 saniyede bir güncelle
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return (
    <div>
      {/* Aksiyon gerektiren uyarılar — her zaman 3 kart, eşit boyut */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <button onClick={onGoDebtors} style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: "none", borderLeft: "4px solid #dc2626", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#dc2626", lineHeight: 1, marginBottom: 6 }}>{borcluCount}</div>
              <div style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Borçlu firma</div>
            </div>
            <span style={{ color: "#cbd5e1", fontSize: 22 }}>›</span>
          </button>
          <button onClick={onGoWarrantyActive} style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: "none", borderLeft: "4px solid #16a34a", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#16a34a", lineHeight: 1, marginBottom: 6 }}>{garantiDevamCount}</div>
              <div style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Garantisi devam eden</div>
            </div>
            <span style={{ color: "#cbd5e1", fontSize: 22 }}>›</span>
          </button>
          <button onClick={onGoSerialPending} style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: "none", borderLeft: "4px solid #0891b2", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#0891b2", lineHeight: 1, marginBottom: 6 }}>{seriNoBekleyenCount}</div>
              <div style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Seri no bekleyen</div>
            </div>
            <span style={{ color: "#cbd5e1", fontSize: 22 }}>›</span>
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
        <StatCard label="Toplam Müşteri"    value={customers.length}  sub="Görmek için tıkla" color="#e85d1a" onClick={onGoCustomers} />
        <StatCard label="Toplam Bayi"       value={dealers.length}    sub="Görmek için tıkla" color="#3b82f6" onClick={onGoDealers} />
        <StatCard label="Stoktaki Makina"   value={stock.length}      sub="Görmek için tıkla" color="#8b5cf6" onClick={onGoStock} />
        <StatCard label="Servis Kayıtları"  value={services.length}   sub="Görmek için tıkla" color="#f59e0b" onClick={onGoServices} />
        <StatCard label="Garanti Süresi Dolan" value={expiredCount}    sub="Görmek için tıkla" color="#ef4444" onClick={onGoExpired} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
        {/* Son Satışlar */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: "#0f172a" }}>Son Satışlar</div>
          {[...customers]
            .filter(c => c.installDate)
            .sort((a, b) => (b.installDate || "").localeCompare(a.installDate || ""))
            .slice(0, 5)
            .map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{c.model || "—"}{c.serialNo ? ` · ${c.serialNo}` : ""}</div>
                </div>
                <div style={{ textAlign: "right", alignSelf: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#e85d1a" }}>{fmtTR(c.installDate)}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.country || ""}{c.city ? ` / ${c.city}` : ""}</div>
                </div>
              </div>
            ))}
          {customers.filter(c => c.installDate).length === 0 && <div style={{ color: "#94a3b8", fontSize: 13 }}>Henüz satış kaydı yok.</div>}
        </div>

        {/* Son Servisler */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: "#0f172a" }}>Son Servis Talepleri</div>
          {[...services]
            .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
            .slice(0, 5)
            .map(sv => {
            const cust = customers.find(x => x.id === sv.customerId);
            return (
              <div key={sv.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{cust?.name || "—"}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{cust?.model ? `${cust.model} · ` : ""}{sv.type}</div>
                </div>
                <div style={{ textAlign: "right", alignSelf: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#e85d1a" }}>{fmtTR(sv.date)}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{cust?.country || ""}{cust?.city ? ` / ${cust.city}` : ""}</div>
                </div>
              </div>
            );
          })}
          {services.length === 0 && <div style={{ color: "#94a3b8", fontSize: 13 }}>Henüz servis kaydı yok.</div>}
        </div>
      </div>

      {/* Sol alt: döviz kurları · Sağ alt: saat & tarih */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 28, flexWrap: "wrap", gap: 16 }}>
        {/* Döviz kurları */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "16px 22px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", minWidth: 220 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: .5, textTransform: "uppercase", marginBottom: 12 }}>Döviz Kurları</div>
          {rates ? (
            <div style={{ display: "flex", gap: 28 }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>💵 USD / TL</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#16a34a" }}>{rates.usd.toFixed(2)} ₺</div>
              </div>
              {rates.eur && (
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>💶 EUR / TL</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#2563eb" }}>{rates.eur.toFixed(2)} ₺</div>
                </div>
              )}
            </div>
          ) : ratesErr ? (
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Kurlar şu an alınamadı.</div>
          ) : (
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Yükleniyor...</div>
          )}
        </div>

        {/* Saat & tarih */}
        <div style={{ background: "linear-gradient(135deg, #1f0d02, #3d1c06)", borderRadius: 12, padding: "16px 26px", boxShadow: "0 4px 16px rgba(0,0,0,.2)", textAlign: "right", minWidth: 200 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#ff9d5c", fontVariantNumeric: "tabular-nums", letterSpacing: 1, lineHeight: 1.2 }}>{saat}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#d4a584", fontVariantNumeric: "tabular-nums", letterSpacing: 1, lineHeight: 1.2, marginTop: 4 }}>{tarih}</div>
        </div>
      </div>
    </div>
  );
};
