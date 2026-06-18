import { useState, useEffect } from "react";
import { CURRENCIES } from "../lib/constants";
import { fmt, fmtCur, parseMoney, kalipCount } from "../lib/utils";

export const Finance = ({ customers, services, dealers = [], partSales = [] }) => {
  const [range, setRange] = useState("all"); // all | thisMonth | thisYear | lastYear | custom
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Tarih aralığı sınırlarını hesapla
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const inRange = (iso) => {
    if (!iso) return range === "all";
    const d = new Date(iso);
    if (isNaN(d)) return range === "all";
    if (range === "all") return true;
    if (range === "thisMonth") return d.getFullYear() === y && d.getMonth() === m;
    if (range === "thisYear") return d.getFullYear() === y;
    if (range === "lastYear") return d.getFullYear() === y - 1;
    if (range === "custom") {
      if (customStart && iso < customStart) return false;
      if (customEnd && iso > customEnd) return false;
      return true;
    }
    return true;
  };

  // Satışları tarihe göre filtrele (installDate baz alınır)
  const sales = customers.filter(c => !c.isResale && inRange(c.installDate));
  const svcInRange = services.filter(s => inRange(s.date));
  const kalipSatisInRange = partSales.filter(p => inRange(p.tarih)); // Extra Kalıp sekmesindeki satışlar

  // ── ADETLER ──
  const totalMakina = sales.length;
  const totalKalip = sales.reduce((sum, c) => sum + kalipCount(c), 0);
  const garantiDisiCount = svcInRange.filter(s => s.type === "Garanti Dışı").length;
  // İlk kalıp makinayla birlikte gelir (bedava), diğerleri "extra" sayılır. Extra Kalıp sekmesinden
  // satılan kalıplar müşterinin kaliplar listesine de eklendiği için (detay görünümü için), buradan
  // çift sayılmasın diye müşteri başına partSales adedi kaliplar listesinden önce düşülüyor.
  const partSalesCountByCustomer = {};
  partSales.forEach(p => { partSalesCountByCustomer[p.customerId] = (partSalesCountByCustomer[p.customerId] || 0) + 1; });
  const musterilerdenExtraKalip = sales.reduce((sum, c) => {
    const extraKalipTabAdedi = partSalesCountByCustomer[c.id] || 0;
    const ilkSatisKaliplari = Math.max(kalipCount(c) - extraKalipTabAdedi, 0);
    return sum + Math.max(ilkSatisKaliplari - 1, 0);
  }, 0);
  const satilanExtraKalipSayisi = musterilerdenExtraKalip + kalipSatisInRange.length;
  const satilanYedekParcaSayisi = svcInRange.reduce((sum, s) => sum + (s.degisenParcalar?.length || 0), 0);

  // ── PARA (TUTAR) — para birimi başına ayrı topla ──
  const empty3 = () => ({ TRY: 0, USD: 0, EUR: 0 });
  const cur = (x) => (CURRENCIES.includes(x) ? x : "TRY"); // eski kayıtlar TRY
  const gercekCiro = empty3();   // gerçek satış bedelleri (fiili ciro) — Genel Toplam'a girer, kendi kartı yok
  const komisyon = empty3(), ilkSatisKalip = empty3(), musteriBorcu = empty3();
  sales.forEach(c => {
    const k = cur(c.currency);
    const gercek = parseMoney(c.fabrikaSatisBedeli) || parseMoney(c.faturaBedeli); // gerçek bedel yoksa faturaya düş
    gercekCiro[k] += gercek;
    komisyon[k] += parseMoney(c.komisyon);
    ilkSatisKalip[k] += parseMoney(c.extraKalipFiyati); // ilk makina satışında girilen kalıp fiyatı — bilgi amaçlı, toplama girmez
    musteriBorcu[k] += parseMoney(c.kalanBorc);
  });
  const servisUcreti = empty3();
  svcInRange.filter(s => s.type === "Garanti Dışı" || s.type === "Periyodik Bakım").forEach(s => {
    servisUcreti[cur(s.currency)] += parseMoney(s.servisUcreti);
  });
  const parcaUcreti = empty3();
  svcInRange.forEach(s => {
    if (!s.parcaUcretsizMi) parcaUcreti[cur(s.parcaCurrency)] += parseMoney(s.parcaUcreti);
  });
  const kalipSatisi = empty3(); // Extra Kalıp sekmesinde sonradan verilen kalıplar
  kalipSatisInRange.forEach(p => { kalipSatisi[cur(p.currency)] += parseMoney(p.ucret); });

  // Toplam Extra Kalıp Satışı = müşteri formundaki ilk satış fiyatı + Extra Kalıp sekmesindeki satışlar
  const toplamExtraKalip = empty3();
  CURRENCIES.forEach(k => { toplamExtraKalip[k] = ilkSatisKalip[k] + kalipSatisi[k]; });

  // Genel Toplam = Gerçek Satış + Servis + Parça + Toplam Extra Kalıp − Komisyon (her döviz ayrı)
  const genelToplam = empty3();
  CURRENCIES.forEach(k => {
    genelToplam[k] = gercekCiro[k] + servisUcreti[k] + parcaUcreti[k] + toplamExtraKalip[k] - komisyon[k];
  });

  // ── TOPLAM ALACAK — müşteri borcu + ödenmemiş servis + ödenmemiş parça + ödenmemiş kalıp ──
  const odenmemisServis = empty3();
  svcInRange.forEach(s => {
    const ucretliMi = (s.type === "Garanti Dışı" || s.type === "Periyodik Bakım") && parseMoney(s.servisUcreti) > 0;
    if (ucretliMi && s.odendi === false) odenmemisServis[cur(s.currency)] += parseMoney(s.servisUcreti);
  });
  const odenmemisParca = empty3();
  svcInRange.forEach(s => {
    const parcaUcretliMi = !s.parcaUcretsizMi && parseMoney(s.parcaUcreti) > 0;
    if (parcaUcretliMi && s.parcaOdendi === false) odenmemisParca[cur(s.parcaCurrency)] += parseMoney(s.parcaUcreti);
  });
  const odenmemisKalip = empty3();
  kalipSatisInRange.forEach(p => { if (p.odendi === false) odenmemisKalip[cur(p.currency)] += parseMoney(p.ucret); });
  const toplamAlacak = empty3();
  CURRENCIES.forEach(k => {
    toplamAlacak[k] = musteriBorcu[k] + odenmemisServis[k] + odenmemisParca[k] + odenmemisKalip[k];
  });

  // Yaklaşık TL karşılığı (Dashboard'daki kur API'si ile)
  const [rates, setRates] = useState(null); // { USD: x, EUR: y } → 1 birim kaç TL
  useEffect(() => {
    let cancelled = false;
    const fetchRates = async () => {
      try {
        const r = await fetch("https://open.er-api.com/v6/latest/USD");
        const j = await r.json();
        if (cancelled || !j?.rates?.TRY) return;
        const usdTry = j.rates.TRY;
        const eurTry = j.rates.EUR ? (j.rates.TRY / j.rates.EUR) : null;
        setRates({ USD: usdTry, EUR: eurTry });
      } catch { /* sessiz */ }
    };
    fetchRates();
    const t = setInterval(fetchRates, 60 * 60 * 1000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);
  // bir {TRY,USD,EUR} nesnesini TL'ye çevirip topla
  const toTL = (obj) => {
    let sum = obj.TRY || 0;
    if (rates) {
      if (rates.USD) sum += (obj.USD || 0) * rates.USD;
      if (rates.EUR) sum += (obj.EUR || 0) * rates.EUR;
    }
    return sum;
  };
  // Bir tutar nesnesini "₺X · $Y · €Z" formatında, sadece sıfır olmayanları göster
  const showMulti = (obj) => {
    const parts = CURRENCIES.filter(k => (obj[k] || 0) !== 0).map(k => fmtCur(obj[k], k));
    return parts.length ? parts.join("  ·  ") : fmtCur(0, "TRY");
  };
  // ── MODEL BAZLI KIRILIM (gelir ≈ TL karşılığı) ──
  const byModel = {};
  sales.forEach(c => {
    const k = c.model || "Belirtilmemiş";
    if (!byModel[k]) byModel[k] = { adet: 0, gelir: 0 };
    byModel[k].adet += 1;
    const o = empty3(); o[cur(c.currency)] = parseMoney(c.faturaBedeli);
    byModel[k].gelir += toTL(o);
  });
  const modelRows = Object.entries(byModel).sort((a, b) => b[1].gelir - a[1].gelir);

  // ── SATICI/BAYİ BAZLI KIRILIM (gelir/komisyon ≈ TL karşılığı) ──
  const bySeller = {};
  sales.forEach(c => {
    const k = c.satisYapan || "Belirtilmemiş";
    if (!bySeller[k]) bySeller[k] = { adet: 0, gelir: 0, komisyon: 0 };
    bySeller[k].adet += 1;
    const g = empty3(); g[cur(c.currency)] = parseMoney(c.faturaBedeli);
    const ko = empty3(); ko[cur(c.currency)] = parseMoney(c.komisyon);
    bySeller[k].gelir += toTL(g);
    bySeller[k].komisyon += toTL(ko);
  });
  const sellerRows = Object.entries(bySeller).sort((a, b) => b[1].gelir - a[1].gelir);

  // ── AYLIK TREND (son 12 ay, satış geliri ≈ TL karşılığı) ──
  const monthly = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(y, m - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
    let gelir = 0;
    customers.forEach(c => {
      if (!c.isResale && c.installDate && c.installDate.slice(0, 7) === key) {
        const o = empty3(); o[cur(c.currency)] = parseMoney(c.faturaBedeli);
        gelir += toTL(o);
      }
    });
    monthly.push({ label, gelir });
  }
  const maxMonthly = Math.max(...monthly.map(x => x.gelir), 1);

  const rangeLabels = { all: "Tüm Zamanlar", thisMonth: "Bu Ay", thisYear: "Bu Yıl", lastYear: "Geçen Yıl", custom: "Özel Tarih" };

  // Excel'e aktar (CSV)
  const AdetCard = ({ label, value, color, icon }) => (
    <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color }}>{value}</div>
    </div>
  );
  // Çok-dövizli kart: her dövizi ayrı satır + yaklaşık TL karşılığı
  const MultiCard = ({ label, obj, color, sub }) => {
    const nonzero = CURRENCIES.filter(k => (obj[k] || 0) !== 0);
    const showCur = nonzero.length ? nonzero : ["TRY"];
    const hasFx = nonzero.some(k => k !== "TRY");
    return (
      <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>{label}</div>
        {showCur.map(k => (
          <div key={k} style={{ fontSize: 20, fontWeight: 800, color: color || "#0f172a", lineHeight: 1.25 }}>{fmtCur(obj[k] || 0, k)}</div>
        ))}
        {hasFx && rates && (
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>≈ {fmt(toTL(obj))} (yaklaşık)</div>
        )}
        {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{sub}</div>}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Finans</h2>
      </div>

      {/* Tarih aralığı filtresi */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
        {Object.entries(rangeLabels).map(([k, l]) => (
          <button key={k} onClick={() => setRange(k)}
            style={{ padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: "1px solid", borderColor: range === k ? "#e85d1a" : "#e2e8f0",
              background: range === k ? "#e85d1a" : "#fff", color: range === k ? "#fff" : "#64748b" }}>
            {l}
          </button>
        ))}
      </div>
      {range === "custom" && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>Başlangıç:</span>
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }} />
          <span style={{ fontSize: 13, color: "#64748b" }}>Bitiş:</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }} />
        </div>
      )}
      <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
        Gösterilen dönem: <b style={{ color: "#e85d1a" }}>{rangeLabels[range]}</b> · {totalMakina} satış kaydı
      </div>

      {/* ADET KARTLARI */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>Adetler</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 28 }}>
        <AdetCard label="Toplam Satılan Makina" value={totalMakina} color="#e85d1a" />
        <AdetCard label="Toplam Satılan Kalıp" value={totalKalip} color="#3b82f6" />
        <AdetCard label="Satılan Extra Kalıp Sayısı" value={satilanExtraKalipSayisi} color="#db2777" />
        <AdetCard label="Satılan Yedek Parça Sayısı" value={satilanYedekParcaSayisi} color="#0ea5e9" />
        <AdetCard label="Garanti Dışı Servis" value={garantiDisiCount} color="#ef4444" />
      </div>

      {/* PARA KARTLARI */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>Gelir & Tahsilat</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 20 }}>
        <MultiCard label="Toplam Fabrika Satış Bedeli" obj={gercekCiro} color="#16a34a" sub="Müşterilerden gelen gerçek satış bedeli" />
        <MultiCard label="Toplam Servis Ücreti" obj={servisUcreti} color="#f59e0b" sub="Garanti dışı servisler" />
        <MultiCard label="Toplam Parça Ücreti" obj={parcaUcreti} color="#0ea5e9" sub="Servis — değişen parçalar" />
        <MultiCard label="Toplam Extra Kalıp Satışı" obj={toplamExtraKalip} color="#db2777" sub="İlk satış + Extra Kalıp sekmesi" />
        <MultiCard label="Toplam Ödenen Komisyon" obj={komisyon} color="#dc2626" sub="Gider (düşülür)" />
      </div>

      {/* GENEL TOPLAM + TOPLAM ALACAK */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 28 }}>
        <div style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)", borderRadius: 14, padding: "22px 26px", color: "#fff" }}>
          <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, marginBottom: 6 }}>GENEL TOPLAM</div>
          {(CURRENCIES.filter(k => (genelToplam[k] || 0) !== 0).length ? CURRENCIES.filter(k => (genelToplam[k] || 0) !== 0) : ["TRY"]).map(k => (
            <div key={k} style={{ fontSize: 30, fontWeight: 800, color: "#4ade80", lineHeight: 1.2 }}>{fmtCur(genelToplam[k] || 0, k)}</div>
          ))}
          {CURRENCIES.some(k => k !== "TRY" && (genelToplam[k] || 0) !== 0) && rates && (
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>≈ {fmt(toTL(genelToplam))} (yaklaşık TL karşılığı)</div>
          )}
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>Gerçek Satış + Servis + Parça + Extra Kalıp − Komisyon</div>
        </div>
        <div style={{ background: "linear-gradient(135deg, #7c2d12, #9a3412)", borderRadius: 14, padding: "22px 26px", color: "#fff" }}>
          <div style={{ fontSize: 13, color: "#fed7aa", fontWeight: 600, marginBottom: 6 }}>TOPLAM ALACAK</div>
          {(CURRENCIES.filter(k => (toplamAlacak[k] || 0) !== 0).length ? CURRENCIES.filter(k => (toplamAlacak[k] || 0) !== 0) : ["TRY"]).map(k => (
            <div key={k} style={{ fontSize: 24, fontWeight: 800, color: "#fdba74", lineHeight: 1.2 }}>{fmtCur(toplamAlacak[k] || 0, k)}</div>
          ))}
          {CURRENCIES.some(k => k !== "TRY" && (toplamAlacak[k] || 0) !== 0) && rates && (
            <div style={{ fontSize: 11, color: "#fdba74", opacity: .8, marginTop: 6 }}>≈ {fmt(toTL(toplamAlacak))} (yaklaşık)</div>
          )}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.15)", display: "flex", flexDirection: "column", gap: 3 }}>
            {[["Müşteri Borcu", musteriBorcu], ["Servis", odenmemisServis], ["Parça", odenmemisParca], ["Extra Kalıp", odenmemisKalip]]
              .filter(([, obj]) => CURRENCIES.some(k => (obj[k] || 0) !== 0))
              .map(([label, obj]) => (
                <div key={label} style={{ fontSize: 11, color: "#fed7aa", display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ opacity: .85 }}>{label}</span>
                  <span style={{ fontWeight: 700 }}>{showMulti(obj)}</span>
                </div>
              ))}
          </div>
          <div style={{ fontSize: 11, color: "#fdba74", opacity: .7, marginTop: 8 }}>Tahsil edilecek tutar</div>
        </div>
      </div>

      {/* AYLIK TREND */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 16 }}>Son 12 Ay Satış Geliri Trendi <span style={{ fontWeight: 400, color: "#94a3b8" }}>(≈ TL karşılığı)</span></div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140 }}>
          {monthly.map((mo, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600 }}>{mo.gelir > 0 ? Math.round(mo.gelir / 1000) + "k" : ""}</div>
              <div style={{ width: "100%", height: `${(mo.gelir / maxMonthly) * 100}px`, minHeight: mo.gelir > 0 ? 4 : 0, background: "linear-gradient(180deg, #e85d1a, #f59e0b)", borderRadius: "4px 4px 0 0" }} />
              <div style={{ fontSize: 9, color: "#64748b" }}>{mo.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* MODEL & BAYİ KIRILIMI */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", fontSize: 13, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>Model Bazlı Satış <span style={{ fontWeight: 400, color: "#94a3b8" }}>(gelir ≈ TL)</span></div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f8fafc" }}>
              {["Model", "Adet", "Gelir"].map(h => <th key={h} style={{ padding: "8px 16px", textAlign: h === "Model" ? "left" : "right", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {modelRows.map(([k, v]) => (
                <tr key={k} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>{k}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, textAlign: "right" }}>{v.adet}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, textAlign: "right", fontWeight: 600, color: "#16a34a" }}>{fmt(v.gelir)}</td>
                </tr>
              ))}
              {modelRows.length === 0 && <tr><td colSpan={3} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>Veri yok</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", fontSize: 13, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>Satış Yapan Bazlı <span style={{ fontWeight: 400, color: "#94a3b8" }}>(≈ TL)</span></div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f8fafc" }}>
              {["Satış Yapan", "Adet", "Komisyon"].map(h => <th key={h} style={{ padding: "8px 16px", textAlign: h === "Satış Yapan" ? "left" : "right", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {sellerRows.map(([k, v]) => (
                <tr key={k} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>{k}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, textAlign: "right" }}>{v.adet}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, textAlign: "right", fontWeight: 600, color: "#dc2626" }}>{fmt(v.komisyon)}</td>
                </tr>
              ))}
              {sellerRows.length === 0 && <tr><td colSpan={3} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>Veri yok</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

