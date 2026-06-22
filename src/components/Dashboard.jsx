import { useState, useEffect } from "react";
import { today, fmtTR, fmtCur, parseMoney, trLower, isServisBorcluMu, isPartSaleBorcluMu, isServisUcretliMi, isParcaUcretliMi, sumBekleyenCek, isCekVadesiGecmis } from "../lib/utils";
import { StatCard, Modal, Btn } from "./ui";

export const Dashboard = ({ customers, dealers, services, stock = [], partSales = [], payments = [], rates, ratesErr, onGoStock, onGoCustomers, onGoDealers, onGoExpired, onGoDebtors, onGoCustomerDetail, onGoWarrantyActive, onGoSerialPending }) => {
  const expiredCount = customers.filter(c => c.warrantyEnd && c.warrantyEnd < today()).length;

  // ── Aksiyon gerektiren uyarılar ──
  const realCustomers = customers.filter(c => !c.isResale);
  const seriNoBekleyenCount = realCustomers.filter(c => c.seriNoBekliyor && !c.serialNo).length;
  // Garantisi hâlâ devam eden (henüz bitmemiş) makineler
  const garantiDevamCount = realCustomers.filter(c => c.warrantyEnd && c.warrantyEnd >= today()).length;

  // ── Borçlu firmalar — müşteri borcu + servis/parça borcu + Extra Kalıp borcu (3 ayrı kaynak) ──
  // isResale (2. el devir) burada hariç tutulmuyor — devir öncesi ödenmemiş bakiye varsa
  // Müşteriler sayfasıyla tutarlı olarak burada da borçlu sayılır.
  const [showDebtors, setShowDebtors] = useState(false);
  const borcluMusteriler = customers.filter(c => parseMoney(c.kalanBorc) > 0);
  const borcluServisler = services.filter(isServisBorcluMu);
  const borcluKaliplar = partSales.filter(isPartSaleBorcluMu);
  // Borcun bir kısmı/tamamı tahsil edilmemiş çekten kaynaklanıyorsa, "ödememiş" ile karışmaması için
  // ayrı bir rozet gösterilir — vadesi de geçmişse daha acil (kırmızı) bir tona döner.
  const cekRozeti = (customerId) => {
    const bekleyen = sumBekleyenCek(customerId, payments);
    if (bekleyen <= 0) return null;
    const vadesiGecmis = payments.some(p => p.customerId === customerId && isCekVadesiGecmis(p));
    return vadesiGecmis ? "⚠ Çek Vadesi Geçti" : "🧾 Çek Bekliyor";
  };
  const custName = (id) => customers.find(c => c.id === id)?.name || "—";
  // Aynı firmanın birden çok makinası (customer kaydı) veya birden çok servis/parça borcu
  // olabilir — bunlar farklı "firma" sayılmasın diye firma adına (case-insensitive) göre tekilleştir.
  const borcluFirmaKeys = new Set([
    ...borcluMusteriler.map(c => trLower(c.name)),
    ...borcluServisler.map(s => trLower(custName(s.customerId))),
    ...borcluKaliplar.map(p => trLower(custName(p.customerId))),
  ]);
  const borcluCount = borcluFirmaKeys.size;
  const goToCustomer = (id) => { setShowDebtors(false); onGoCustomerDetail && onGoCustomerDetail(id); };

  // ── Canlı saat & tarih ──
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const saat = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const tarih = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;

  return (
    <div>
      {/* Aksiyon gerektiren uyarılar — her zaman 3 kart, eşit boyut */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <button onClick={() => setShowDebtors(true)} style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: "none", borderLeft: "4px solid #dc2626", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#dc2626", lineHeight: 1, marginBottom: 6 }}>{borcluCount}</div>
              <div style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Borçlu Firma</div>
            </div>
            <span style={{ color: "#cbd5e1", fontSize: 22 }}>›</span>
          </button>
          <button onClick={onGoWarrantyActive} style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: "none", borderLeft: "4px solid #16a34a", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#16a34a", lineHeight: 1, marginBottom: 6 }}>{garantiDevamCount}</div>
              <div style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Garantisi Devam Eden</div>
            </div>
            <span style={{ color: "#cbd5e1", fontSize: 22 }}>›</span>
          </button>
          <button onClick={onGoSerialPending} style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: "none", borderLeft: "4px solid #0891b2", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#0891b2", lineHeight: 1, marginBottom: 6 }}>{seriNoBekleyenCount}</div>
              <div style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Seri No Bekleyen</div>
            </div>
            <span style={{ color: "#cbd5e1", fontSize: 22 }}>›</span>
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
        <StatCard label="Toplam Müşteri"    value={customers.length}  sub="Görmek için tıkla" color="#e85d1a" onClick={onGoCustomers} />
        <StatCard label="Toplam Bayi"       value={dealers.length}    sub="Görmek için tıkla" color="#3b82f6" onClick={onGoDealers} />
        <StatCard label="Stoktaki Makina"   value={stock.length}      sub="Görmek için tıkla" color="#8b5cf6" onClick={onGoStock} />
        <StatCard label="Servis Kayıtları"  value={services.length}   color="#f59e0b" />
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
              <div key={c.id} onClick={() => goToCustomer(c.id)} title="Müşteri detayını aç"
                style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
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
              <div key={sv.id} onClick={() => goToCustomer(sv.customerId)} title="Müşteri detayını aç"
                style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
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

      {/* Borçlu Firmalar */}
      {showDebtors && (
        <Modal wide title="Borçlu Firmalar" onClose={() => setShowDebtors(false)}>
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            {borcluMusteriler.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>
                  Müşteriler ({borcluMusteriler.length})
                </div>
                {borcluMusteriler.map(c => {
                  const rozet = cekRozeti(c.id);
                  return (
                    <div key={c.id} onClick={() => goToCustomer(c.id)} title="Müşteri detayını aç"
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", marginBottom: 6, cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                      onMouseLeave={e => e.currentTarget.style.background = "#fef2f2"}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                          {c.name}
                          {rozet && <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "2px 8px", background: rozet.startsWith("⚠") ? "#fee2e2" : "#fff7ed", color: rozet.startsWith("⚠") ? "#991b1b" : "#c2410c" }}>{rozet}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.model || "—"}{c.serialNo ? ` · ${c.serialNo}` : ""}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#dc2626" }}>{fmtCur(c.kalanBorc, c.currency)}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {borcluServisler.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>
                  Servis ve Yedek Parça ({borcluServisler.length})
                </div>
                {borcluServisler.map(s => {
                  const servisBorclu = isServisUcretliMi(s) && s.odendi === false;
                  const parcaBorclu = isParcaUcretliMi(s) && s.odendi === false;
                  return (
                    <div key={s.id} onClick={() => goToCustomer(s.customerId)} title="Müşteri detayını aç"
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", marginBottom: 6, cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                      onMouseLeave={e => e.currentTarget.style.background = "#fef2f2"}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{custName(s.customerId)}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.type} · {fmtTR(s.date)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {servisBorclu && <div style={{ fontSize: 13, fontWeight: 800, color: "#dc2626" }}>Servis: {fmtCur(s.servisUcreti, s.currency)}</div>}
                        {parcaBorclu && <div style={{ fontSize: 13, fontWeight: 800, color: "#dc2626" }}>Parça: {fmtCur(s.parcaUcreti, s.parcaCurrency)}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {borcluKaliplar.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>
                  Extra Kalıp ({borcluKaliplar.length})
                </div>
                {borcluKaliplar.map(p => (
                  <div key={p.id} onClick={() => goToCustomer(p.customerId)} title="Müşteri detayını aç"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", marginBottom: 6, cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                    onMouseLeave={e => e.currentTarget.style.background = "#fef2f2"}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{custName(p.customerId)}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.ad}{p.olcu ? ` (${p.olcu})` : ""} · {fmtTR(p.tarih)}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#dc2626" }}>{fmtCur(p.ucret, p.currency)}</div>
                  </div>
                ))}
              </div>
            )}

            {borcluCount === 0 && (
              <div style={{ padding: "30px 0", textAlign: "center", color: "#94a3b8" }}>Borçlu firma yok.</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setShowDebtors(false)}>Kapat</Btn>
            <Btn onClick={() => { setShowDebtors(false); onGoDebtors && onGoDebtors(); }}>Müşterilerde Görüntüle →</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
