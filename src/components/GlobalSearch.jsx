import { useState, useEffect, useMemo, useRef } from "react";
import { trLower, fmtTR } from "../lib/utils";
import { Icon } from "./ui";

// ── Genel arama ──────────────────────────────────────────────────────────────
// Sidebar'daki kutu ve Ctrl/Cmd+K kısayolu aynı paleti açar. Müşteri/makina
// (ad, seri no, telefon, yetkili, model, eski sahip adı), teklif/proforma (no, firma), bayi ve
// makina stoğu üzerinde arar; sonuca tıklayınca ilgili ekran doğrudan açılır.
// allowedTabs: kullanıcının erişebildiği sekme id'leri — izinli olmayan sekmenin
// verisi aramada hiç gösterilmez (kısıtlı kullanıcı aramadan o alana sızamaz).
export const GlobalSearch = ({ customers = [], teklifler = [], dealers = [], stock = [], onOpenCustomer, onOpenDoc, onOpenDealer, onGoStock, allowedTabs = null }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQ("");
  }, [open]);

  const results = useMemo(() => {
    const query = trLower(q.trim());
    if (query.length < 2) return null;
    const has = (v) => trLower(String(v || "")).includes(query);
    const izinli = (tabId) => !Array.isArray(allowedTabs) || allowedTabs.includes(tabId);
    return {
      musteriler: izinli("customers") ? customers.filter(c => !c.deletedAt && (has(c.name) || has(c.serialNo) || has(c.phone) || has(c.yetkili1Ad) || has(c.yetkili1Tel) || has(c.yetkili2Tel) || has(c.model) || (c.prevOwners || []).some(o => has(o.name)))).slice(0, 8) : [],
      belgeler:   izinli("evrak") ? teklifler.filter(t => !t.deletedAt && (has(t.no) || has(t.firma))).slice(0, 8) : [],
      bayiler:    izinli("dealers") ? dealers.filter(d => !d.deletedAt && (has(d.name) || has(d.contact) || has(d.city))).slice(0, 6) : [],
      makinalar:  izinli("stock") ? stock.filter(sx => !sx.deletedAt && (has(sx.serialNo) || has(sx.model))).slice(0, 6) : [],
    };
  }, [q, customers, teklifler, dealers, stock, allowedTabs]);

  const bos = results && !results.musteriler.length && !results.belgeler.length && !results.bayiler.length && !results.makinalar.length;
  const pick = (fn, arg) => { setOpen(false); fn?.(arg); };

  const grupBaslik = { fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .6, padding: "10px 14px 4px" };
  const satir = { display: "block", width: "100%", textAlign: "left", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, borderRadius: 8 };

  return (
    <>
      {/* Sidebar kutusu — tıklanınca palet açılır */}
      <button onClick={() => setOpen(true)} title="Genel arama (Ctrl+K)"
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", marginBottom: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 9, color: "#a3846f", fontSize: 12.5, cursor: "pointer" }}>
        <Icon name="search" size={13} />
        <span style={{ flex: 1, textAlign: "left" }}>Ara...</span>
        <span style={{ fontSize: 10, opacity: .7, border: "1px solid rgba(255,255,255,.15)", borderRadius: 5, padding: "1px 5px" }}>Ctrl K</span>
      </button>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 1200, display: "flex", justifyContent: "center", paddingTop: "10vh" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 620, height: "fit-content", maxHeight: "70vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
            <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff" }}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
                <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
                  placeholder="Müşteri, seri no, teklif no, telefon, bayi ara..."
                  style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px 11px 36px", border: "2px solid #e85d1a", borderRadius: 10, fontSize: 14, outline: "none" }} />
              </div>
            </div>
            {!results && <div style={{ padding: 18, fontSize: 13, color: "#94a3b8" }}>En az 2 karakter yazın.</div>}
            {bos && <div style={{ padding: 18, fontSize: 13, color: "#94a3b8" }}>Sonuç bulunamadı.</div>}
            {results && results.musteriler.length > 0 && (
              <div>
                <div style={grupBaslik}>Müşteriler / Makinalar</div>
                {results.musteriler.map(c => (
                  <button key={`c${c.id}`} style={satir} onClick={() => pick(onOpenCustomer, c.id)}
                    onMouseEnter={e => e.currentTarget.style.background = "#fff7ed"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <b>{c.name}</b>
                    <span style={{ color: "#64748b", marginLeft: 8, fontSize: 12 }}>{c.model || ""}{c.serialNo ? ` · S/N ${c.serialNo}` : ""}{c.installDate ? ` · ${fmtTR(c.installDate)}` : ""}</span>
                    {(() => {
                      const query = trLower(q.trim());
                      const eski = (c.prevOwners || []).find(o => trLower(String(o.name || "")).includes(query));
                      // Kayıt aramaya yalnızca eski sahibi üzerinden yakalandıysa nedenini göster
                      return eski && !trLower(String(c.name || "")).includes(query)
                        ? <span style={{ color: "#b45309", marginLeft: 8, fontSize: 11.5 }}>eski sahibi: {eski.name}</span>
                        : null;
                    })()}
                  </button>
                ))}
              </div>
            )}
            {results && results.belgeler.length > 0 && (
              <div>
                <div style={grupBaslik}>Teklif / Proforma</div>
                {results.belgeler.map(t => (
                  <button key={`t${t.id}`} style={satir} onClick={() => pick(onOpenDoc, t.id)}
                    onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <b>{t.no || "—"}</b>
                    <span style={{ color: "#64748b", marginLeft: 8, fontSize: 12 }}>{t.firma || ""} · {t.type === "proforma" ? "Proforma" : "Teklif"}{t.tarih ? ` · ${fmtTR(t.tarih)}` : ""}</span>
                  </button>
                ))}
              </div>
            )}
            {results && results.bayiler.length > 0 && (
              <div>
                <div style={grupBaslik}>Bayiler</div>
                {results.bayiler.map(d => (
                  <button key={`d${d.id}`} style={satir} onClick={() => pick(onOpenDealer, d.id)}
                    onMouseEnter={e => e.currentTarget.style.background = "#f0fdf4"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <b>{d.name}</b>
                    <span style={{ color: "#64748b", marginLeft: 8, fontSize: 12 }}>{[d.contact, d.city].filter(Boolean).join(" · ")}</span>
                  </button>
                ))}
              </div>
            )}
            {results && results.makinalar.length > 0 && (
              <div>
                <div style={grupBaslik}>Stoktaki Makinalar</div>
                {results.makinalar.map(sx => (
                  <button key={`s${sx.id}`} style={satir} onClick={() => pick(onGoStock)}
                    onMouseEnter={e => e.currentTarget.style.background = "#faf5ff"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <b>{sx.model}</b>
                    <span style={{ color: "#64748b", marginLeft: 8, fontSize: 12 }}>{sx.serialNo ? `S/N ${sx.serialNo}` : "seri no'suz"}{sx.addedDate ? ` · ${fmtTR(sx.addedDate)}` : ""}</span>
                  </button>
                ))}
              </div>
            )}
            <div style={{ height: 8 }} />
          </div>
        </div>
      )}
    </>
  );
};
