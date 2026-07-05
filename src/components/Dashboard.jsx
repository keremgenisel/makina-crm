import { useState, useEffect, useMemo } from "react";
import { today, fmtTR, fmtCur, parseMoney, trLower, isServisBorcluMu, isPartSaleBorcluMu, isServisUcretliMi, isParcaUcretliMi, isParcaBorcluAnlasmaliFirmaya, sumBekleyenCek, isCekVadesiGecmis, effectiveTeklifTur } from "../lib/utils";
import { parsePermissions } from "../lib/permissions";
import { StatCard, Modal, Btn } from "./ui";

export const Dashboard = ({ customers, dealers, services, stock = [], partSales = [], payments = [], rates, ratesErr, factory = null, onGoStock, onGoCustomers, onGoDealers, onGoDealerDebtors, onGoExpired, onGoDebtors, onGoCustomerDetail, onGoWarrantyActive, onGoSerialPending, teklifler = [], onDonusturTeklif = null, onDonusturMakina = null, onKaydetSatis = null, onDismissTeklif = null, serverPermissions = null, uretimFormlari = [], onGoUretim = null }) => {
  const perms = useMemo(() => parsePermissions(serverPermissions), [serverPermissions]);
  const canCust = (action) => !perms || perms.customerActions === null || perms.customerActions?.includes(action);
  const [showDebtors, setShowDebtors] = useState(false);
  const [showDealerDebtors, setShowDealerDebtors] = useState(false);
  const [teklifBusy, setTeklifBusy]       = useState(new Set()); // kilit kontrolü devam eden teklif id'leri
  const [teklifConflict, setTeklifConflict] = useState({});      // { [id]: "kullanıcı adı" }

  // Butona tıklandığında kilidi dene; başkası işliyorsa engelle, başarılıysa action'ı çalıştır
  const withLock = (teklifId, action) => async () => {
    if (!window.crmLocks) { action(); return; }
    setTeklifBusy(s => new Set(s).add(teklifId));
    try {
      const result = await window.crmLocks.acquire("teklif", String(teklifId));
      if (result?.ok) {
        setTeklifConflict(m => { const n = { ...m }; delete n[teklifId]; return n; });
        action();
      } else {
        setTeklifConflict(m => ({ ...m, [teklifId]: result?.lockedBy || "başka kullanıcı" }));
      }
    } catch {
      action(); // bağlantı yoksa devam et (fail-open)
    } finally {
      setTeklifBusy(s => { const n = new Set(s); n.delete(teklifId); return n; });
    }
  };

  // Anlaşmalı servis ayrımı için (isServisUcretliMi/isServisBorcluMu'ya geçilir) — bkz. utils.js
  const factoryName = factory?.name || "Altuntaş Makina";

  // ── Canlı saat & tarih ──
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const saat = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const tarih = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;
  const todayStr = today(); // saat her saniye değiştiği için bu da gün değişiminde otomatik güncellenir (memo bağımlılığı)

  // Müşteri/servis/Extra Kalıp dizileri büyüdükçe (binlerce kayıt) bu taramalar her render'da
  // tekrarlanmasın diye memoize ediliyor — iç mantık aynı, sadece bir useMemo'ya taşındı.
  const { expiredCount, seriNoBekleyenCount, garantiDevamCount, borcluMusteriler, borcluServisler, borcluKaliplar, borcluCount, dealerBorcMap, borcluBayiCount, recentSales, recentServices } = useMemo(() => {
    const expiredCount = customers.filter(c => c.warrantyEnd && c.warrantyEnd < todayStr).length;

    // ── Aksiyon gerektiren uyarılar ──
    const realCustomers = customers.filter(c => !c.isResale);
    const seriNoBekleyenCount = realCustomers.filter(c => c.seriNoBekliyor && !c.serialNo).length;
    // Garantisi hâlâ devam eden (henüz bitmemiş) makineler
    const garantiDevamCount = realCustomers.filter(c => c.warrantyEnd && c.warrantyEnd >= todayStr).length;

    // ── Borçlu firmalar — müşteri borcu + servis/parça borcu + Extra Kalıp borcu (3 ayrı kaynak) ──
    // isResale (2. el devir) burada hariç tutulmuyor — devir öncesi ödenmemiş bakiye varsa
    // Müşteriler sayfasıyla tutarlı olarak burada da borçlu sayılır.
    const borcluMusteriler = customers.filter(c => parseMoney(c.kalanBorc) > 0);
    const borcluServisler = services.filter(s => isServisBorcluMu(s, factoryName));
    const borcluKaliplar = partSales.filter(isPartSaleBorcluMu);
    const custNameLocal = (id) => customers.find(c => c.id === id)?.name || "—";
    // Aynı firmanın birden çok makinası (customer kaydı) veya birden çok servis/parça borcu
    // olabilir — bunlar farklı "firma" sayılmasın diye firma adına (case-insensitive) göre tekilleştir.
    const borcluFirmaKeys = new Set([
      ...borcluMusteriler.map(c => trLower(c.name)),
      ...borcluServisler.map(s => trLower(custNameLocal(s.customerId))),
      ...borcluKaliplar.map(p => trLower(custNameLocal(p.customerId))),
    ]);
    const borcluCount = borcluFirmaKeys.size;

    // ── Borçlu Bayi/Servis — anlaşmalı servis firmalarının üstlendiği ödenmemiş parça borcu
    // (aynı mantık SimpleDealers.jsx'teki borcMap ile — bkz. isParcaBorcluAnlasmaliFirmaya / utils.js) ──
    const dealerBorcMap = {};
    services.forEach(s => {
      if (!isParcaBorcluAnlasmaliFirmaya(s, factoryName)) return;
      const name = s.islemFirma;
      if (!dealerBorcMap[name]) dealerBorcMap[name] = { byCur: {}, records: [] };
      const curK = s.parcaCurrency || s.currency || "TRY";
      dealerBorcMap[name].byCur[curK] = (dealerBorcMap[name].byCur[curK] || 0) + parseMoney(s.parcaUcreti);
      dealerBorcMap[name].records.push(s);
    });
    const borcluBayiCount = Object.keys(dealerBorcMap).length;

    const recentSales = [...customers].filter(c => c.installDate).sort((a, b) => (b.installDate || "").localeCompare(a.installDate || "")).slice(0, 10);
    const recentServices = [...services].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 10);

    return { expiredCount, seriNoBekleyenCount, garantiDevamCount, borcluMusteriler, borcluServisler, borcluKaliplar, borcluCount, dealerBorcMap, borcluBayiCount, recentSales, recentServices };
  }, [customers, services, partSales, todayStr, factoryName]);

  const donusturBekleyenlar = useMemo(() =>
    teklifler.filter(t => {
      if (t.durum !== "onaylandi" || t.deletedAt || t.satisTamam) return false;
      if (!t.customerId) return true; // müşteri bağlanmamış → her zaman göster
      const tur = effectiveTeklifTur(t);
      return tur === "makina" || tur === "parca" || tur === "kalip"; // bağlı + işlem gerektiren tur
    }),
  [teklifler]);

  const pendingKaliplarCount = useMemo(() => {
    let count = 0;
    for (const c of customers) {
      for (const k of (c.kaliplar || [])) {
        if (k.uretimFormGonder && !k.uretimFormId) count++;
      }
    }
    for (const ps of partSales) {
      if (ps.uretimFormGonder && !ps.uretimFormId && !ps.deletedAt) count++;
    }
    return count;
  }, [customers, partSales]);

  // Borcun bir kısmı/tamamı tahsil edilmemiş çekten kaynaklanıyorsa, "ödememiş" ile karışmaması için
  // ayrı bir rozet gösterilir — vadesi de geçmişse daha acil (kırmızı) bir tona döner.
  const cekRozeti = (customerId) => {
    const bekleyen = sumBekleyenCek(customerId, payments);
    if (bekleyen <= 0) return null;
    const vadesiGecmis = payments.some(p => p.customerId === customerId && isCekVadesiGecmis(p));
    return vadesiGecmis ? "⚠ Çek Vadesi Geçti" : "🧾 Çek Bekliyor";
  };
  const custName = (id) => customers.find(c => c.id === id)?.name || "—";
  const goToCustomer = (id) => { setShowDebtors(false); setShowDealerDebtors(false); onGoCustomerDetail && onGoCustomerDetail(id); };

  return (
    <div>
      {/* Aksiyon gerektiren uyarılar — her zaman 4 kart, eşit boyut */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <button onClick={() => setShowDebtors(true)} style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: "none", borderLeft: "4px solid #dc2626", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#dc2626", lineHeight: 1, marginBottom: 6 }}>{borcluCount}</div>
              <div style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Borçlu Firma</div>
            </div>
            <span style={{ color: "#cbd5e1", fontSize: 22 }}>›</span>
          </button>
          <button onClick={() => setShowDealerDebtors(true)} style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: "none", borderLeft: "4px solid #f59e0b", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#f59e0b", lineHeight: 1, marginBottom: 6 }}>{borcluBayiCount}</div>
              <div style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Borçlu Bayi/Servis</div>
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
        {pendingKaliplarCount > 0 && (
          <StatCard label="Üretimde Bekleyen Kalıplar" value={pendingKaliplarCount} sub={onGoUretim ? "Forma git" : undefined} color="#7c3aed" onClick={onGoUretim || undefined} />
        )}
      </div>

      {/* Müşteriye Dönüşecek Teklifler */}
      {donusturBekleyenlar.length > 0 && (
        <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#92400e", textTransform: "uppercase", letterSpacing: .5, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span>⚡</span> İşlem Bekleyen Onaylı Teklifler ({donusturBekleyenlar.length})
          </div>
          {donusturBekleyenlar.map(t => {
            const tur = effectiveTeklifTur(t);
            const busy     = teklifBusy.has(t.id);
            const conflict = teklifConflict[t.id];
            return (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid #fed7aa" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{t.firma || "—"}</span>
                  <span style={{ fontSize: 11, color: "#92400e", marginLeft: 8 }}>{t.no || ""}</span>
                  {t.tarih && <span style={{ fontSize: 11, color: "#b45309", marginLeft: 6 }}>· {fmtTR(t.tarih)}</span>}
                  <span style={{ fontSize: 10, marginLeft: 8, padding: "1px 6px", borderRadius: 6, background: "#fed7aa", color: "#92400e", fontWeight: 700 }}>
                    {tur === "makina" ? "Makina" : tur === "parca" ? "Yedek Parça" : tur === "kalip" ? "Kalıp" : "Diğer"}
                  </span>
                  {conflict && (
                    <span style={{ fontSize: 11, marginLeft: 10, color: "#b91c1c", fontWeight: 600 }}>
                      🔒 {conflict} işliyor
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                  {tur === "makina" && !t.customerId && onDonusturTeklif && canCust("cust_add") && (
                    <Btn small disabled={busy || !!conflict} onClick={withLock(t.id, () => onDonusturTeklif(t))} style={{ background: conflict ? "#e5e7eb" : "#f97316", color: conflict ? "#9ca3af" : "#fff", border: "none" }}>
                      {busy ? "..." : "Müşteri Ekle"}
                    </Btn>
                  )}
                  {tur === "makina" && t.customerId && onDonusturMakina && canCust("cust_detail_add_machine") && (
                    <Btn small disabled={busy || !!conflict} onClick={withLock(t.id, () => onDonusturMakina(t))} style={{ background: conflict ? "#e5e7eb" : "#f97316", color: conflict ? "#9ca3af" : "#fff", border: "none" }}>
                      {busy ? "..." : "Makina Ekle"}
                    </Btn>
                  )}
                  {(tur === "parca" || tur === "kalip") && t.customerId && onKaydetSatis && canCust("cust_kalip_add") && (
                    <Btn small disabled={busy || !!conflict} onClick={withLock(t.id, () => onKaydetSatis(t))} style={{ background: conflict ? "#e5e7eb" : "#0891b2", color: conflict ? "#9ca3af" : "#fff", border: "none" }}>
                      {busy ? "..." : "Satışa Dönüştür"}
                    </Btn>
                  )}
                  {(tur === "parca" || tur === "kalip") && !t.customerId && (
                    <span style={{ fontSize: 11, color: "#b45309", fontWeight: 600 }}>Müşteri bağlayın</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
        {/* Son Satışlar */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: "#0f172a" }}>Son Satışlar</div>
          {recentSales.map(c => (
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
          {recentSales.length === 0 && <div style={{ color: "#94a3b8", fontSize: 13 }}>Henüz satış kaydı yok.</div>}
        </div>

        {/* Son Servisler */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: "#0f172a" }}>Son Servis Talepleri</div>
          {recentServices.map(sv => {
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
                  const servisBorclu = isServisUcretliMi(s, factoryName) && s.odendi === false;
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

      {/* Borçlu Bayi/Servis — anlaşmalı servis firmalarının üstlendiği ödenmemiş parça borcu */}
      {showDealerDebtors && (
        <Modal wide title="Borçlu Bayi/Servis" onClose={() => setShowDealerDebtors(false)}>
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            {Object.entries(dealerBorcMap).length === 0 ? (
              <div style={{ padding: "30px 0", textAlign: "center", color: "#94a3b8" }}>Borçlu bayi/servis yok.</div>
            ) : (
              Object.entries(dealerBorcMap).map(([name, info]) => (
                <div key={name} style={{ padding: "12px 14px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{name}</div>
                    <div>
                      {Object.entries(info.byCur).filter(([, v]) => v > 0).map(([k, v]) => (
                        <span key={k} style={{ fontSize: 13, fontWeight: 800, color: "#dc2626" }}>{fmtCur(v, k)}</span>
                      ))}
                    </div>
                  </div>
                  {info.records.map(s => (
                    <div key={s.id} onClick={() => goToCustomer(s.customerId)} title="Müşteri detayını aç"
                      style={{ fontSize: 12, padding: "5px 0", borderTop: "1px solid #fde68a", cursor: "pointer" }}>
                      <span style={{ color: "#92400e", fontWeight: 600, textDecoration: "underline", textDecorationColor: "#fde68a" }}>
                        {custName(s.customerId)} · {fmtTR(s.date)}
                      </span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setShowDealerDebtors(false)}>Kapat</Btn>
            <Btn onClick={() => { setShowDealerDebtors(false); (onGoDealerDebtors || onGoDealers)?.(); }}>Bayilerde Görüntüle →</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
