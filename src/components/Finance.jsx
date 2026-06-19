import { useState } from "react";
import { CURRENCIES, DEFAULT_KDV_RATE } from "../lib/constants";
import { fmt, fmtCur, parseMoney, kalipCount, calcCiro, calcKDV, isServisUcretliMi, isParcaUcretliMi, isServisBorcluMu, isPartSaleBorcluMu } from "../lib/utils";

export const Finance = ({ customers, services, dealers = [], partSales = [], kdvRate = DEFAULT_KDV_RATE, rates }) => {
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
  // Satıştaki ilk kaliplar listesi extra sayılmaz; Extra Kalıp sadece kendi sekmesinden takip edilir.
  const satilanExtraKalipSayisi = kalipSatisInRange.length;
  const satilanYedekParcaSayisi = svcInRange.reduce((sum, s) => sum + (s.degisenParcalar?.length || 0), 0);

  // ── PARA (TUTAR) — para birimi başına ayrı topla ──
  const empty3 = () => ({ TRY: 0, USD: 0, EUR: 0 });
  const cur = (x) => (CURRENCIES.includes(x) ? x : "TRY"); // eski kayıtlar TRY
  const gercekCiro = empty3();   // gerçek satış bedelleri (fiili ciro)
  const komisyon = empty3(), toplamCiro = empty3();
  // Faturalı Yurtiçi satış/servis/parça/kalıplardan doğan KDV — "Ödenmesi Muhtemel" kartının bileşenleri
  const kdvMakina = empty3(), kdvServis = empty3(), kdvParca = empty3(), kdvKalip = empty3();
  sales.forEach(c => {
    const k = cur(c.currency);
    const gercek = parseMoney(c.fabrikaSatisBedeli) || parseMoney(c.faturaBedeli); // gerçek bedel yoksa faturaya düş
    gercekCiro[k] += gercek;
    toplamCiro[k] += calcCiro(c, kdvRate); // Fabrika Satış Bedeli + KDV + Komisyon — Kalan Borç'un dayandığı taban
    komisyon[k] += parseMoney(c.komisyon);
    kdvMakina[k] += calcKDV(c.faturali, c.faturaBedeli, kdvRate);
  });
  const servisUcreti = empty3();
  svcInRange.filter(s => s.type === "Garanti Dışı" || s.type === "Periyodik Bakım").forEach(s => {
    const kdv = calcKDV(s.faturaTipi, s.servisUcreti, kdvRate);
    servisUcreti[cur(s.currency)] += parseMoney(s.servisUcreti) + kdv;
    kdvServis[cur(s.currency)] += kdv;
  });
  const parcaUcreti = empty3();
  svcInRange.forEach(s => {
    if (!s.parcaUcretsizMi) {
      const kdv = calcKDV(s.faturaTipi, s.parcaUcreti, kdvRate);
      parcaUcreti[cur(s.parcaCurrency)] += parseMoney(s.parcaUcreti) + kdv;
      kdvParca[cur(s.parcaCurrency)] += kdv;
    }
  });
  const kalipSatisi = empty3(); // Extra Kalıp sekmesinde sonradan verilen kalıplar
  kalipSatisInRange.forEach(p => {
    const kdv = calcKDV(p.faturaTipi, p.ucret, kdvRate);
    kalipSatisi[cur(p.currency)] += parseMoney(p.ucret) + kdv;
    kdvKalip[cur(p.currency)] += kdv;
  });

  // Toplam Extra Kalıp Satışı = Extra Kalıp sekmesindeki satışlar (KDV dahil)
  // (bilgi amaçlı kart — ödenmiş/ödenmemiş ayrımı yapmadan toplam satılan/faturalanan tutar)
  const toplamExtraKalip = kalipSatisi;

  // ── 3 büyük özet kartı ──
  const sumObj = (...objs) => {
    const r = empty3();
    objs.forEach(o => CURRENCIES.forEach(k => { r[k] += o[k] || 0; }));
    return r;
  };
  const toplamCiromuz = sumObj(toplamCiro, servisUcreti, parcaUcreti, kalipSatisi); // dönem bazlı (tarih filtresine uyar)
  const odenmesiMuhtemel = sumObj(kdvMakina, kdvServis, kdvParca, kdvKalip); // dönem bazlı KDV toplamı

  // Toplam Alacağımız — tarih filtresinden bağımsız, her zaman güncel/anlık bakiye
  const alacak = empty3();
  customers.forEach(c => { alacak[cur(c.currency)] += Math.max(parseMoney(c.kalanBorc), 0); });
  services.filter(isServisBorcluMu).forEach(s => {
    const servisVar = isServisUcretliMi(s) ? parseMoney(s.servisUcreti) : 0;
    const parcaVar = isParcaUcretliMi(s) ? parseMoney(s.parcaUcreti) : 0;
    const toplam = servisVar + parcaVar;
    alacak[cur(s.currency)] += toplam + calcKDV(s.faturaTipi, toplam, kdvRate);
  });
  partSales.filter(isPartSaleBorcluMu).forEach(p => {
    alacak[cur(p.currency)] += parseMoney(p.ucret) + calcKDV(p.faturaTipi, p.ucret, kdvRate);
  });

  // Yaklaşık TL karşılığı — döviz kurları App.jsx'te tek noktadan çekilip prop olarak gelir
  // bir {TRY,USD,EUR} nesnesini TL'ye çevirip topla
  const toTL = (obj) => {
    let sum = obj.TRY || 0;
    if (rates) {
      if (rates.usd) sum += (obj.USD || 0) * rates.usd;
      if (rates.eur) sum += (obj.EUR || 0) * rates.eur;
    }
    return sum;
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

  // ── SATICI/BAYİ BAZLI KIRILIM (gelir ≈ TL karşılığı) ──
  const bySeller = {};
  sales.forEach(c => {
    const k = c.satisYapan || "Belirtilmemiş";
    if (!bySeller[k]) bySeller[k] = { adet: 0, gelir: 0 };
    bySeller[k].adet += 1;
    const g = empty3(); g[cur(c.currency)] = parseMoney(c.faturaBedeli);
    bySeller[k].gelir += toTL(g);
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
  // Çok-dövizli kart: her dövizi ayrı satır + yaklaşık TL karşılığı.
  // size="large" → sayfanın en üstündeki 3 özet kartı için daha büyük/öne çıkan görünüm.
  const MultiCard = ({ label, obj, color, sub, size = "normal" }) => {
    const large = size === "large";
    const nonzero = CURRENCIES.filter(k => (obj[k] || 0) !== 0);
    const showCur = nonzero.length ? nonzero : ["TRY"];
    const hasFx = nonzero.some(k => k !== "TRY");
    return (
      <div style={{
        background: large ? "linear-gradient(135deg,#fff,#fff7ed)" : "#fff",
        borderRadius: 12, padding: large ? "22px 24px" : "16px 20px",
        boxShadow: large ? "0 4px 14px rgba(0,0,0,.10)" : "0 1px 4px rgba(0,0,0,.08)",
        borderTop: large ? `4px solid ${color || "#e85d1a"}` : undefined,
      }}>
        <div style={{ fontSize: large ? 14 : 12, color: "#64748b", fontWeight: 700, marginBottom: large ? 8 : 6 }}>{label}</div>
        {showCur.map(k => (
          <div key={k} style={{ fontSize: large ? 34 : 20, fontWeight: 800, color: color || "#0f172a", lineHeight: 1.25 }}>{fmtCur(obj[k] || 0, k)}</div>
        ))}
        {hasFx && rates && (
          <div style={{ fontSize: large ? 12 : 11, color: "#94a3b8", marginTop: 4 }}>≈ {fmt(toTL(obj))} (yaklaşık)</div>
        )}
        {sub && <div style={{ fontSize: large ? 12 : 11, color: "#94a3b8", marginTop: large ? 6 : 3 }}>{sub}</div>}
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

      {/* ÖZET KARTLARI — diğer kartlardan daha büyük, her zaman yan yana 3'lü */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
        <MultiCard label="Toplam Ciro" obj={toplamCiromuz} color="#e85d1a" sub="Fabrika Satış Bedeli + Servis + Parça + Extra Kalıp (KDV dahil)" size="large" />
        <MultiCard label="Toplam Alacak" obj={alacak} color="#dc2626" sub="Tüm zamanlar — güncel bakiye" size="large" />
        <MultiCard label="Ödenmesi Muhtemel KDV" obj={odenmesiMuhtemel} color="#0d9488" sub="Faturalı Yurtiçi satışlardan doğan KDV toplamı" size="large" />
      </div>

      {/* ADET KARTLARI */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>Adetler</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 28 }}>
        <AdetCard label="Toplam Satılan Makina" value={totalMakina} color="#e85d1a" />
        <AdetCard label="Toplam Satılan Kalıp" value={totalKalip} color="#3b82f6" />
        <AdetCard label="Satılan Extra Kalıp Sayısı" value={satilanExtraKalipSayisi} color="#db2777" />
        <AdetCard label="Satılan Yedek Parça Sayısı" value={satilanYedekParcaSayisi} color="#0ea5e9" />
      </div>

      {/* PARA KARTLARI */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>Gelir & Tahsilat</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 20 }}>
        <MultiCard label="Toplam Fabrika Satış Bedeli" obj={gercekCiro} color="#16a34a" sub="Müşterilerden gelen gerçek satış bedeli" />
        <MultiCard label="Toplam Fabrika Satış Bedeli Cirosu" obj={toplamCiro} color="#0d9488" sub="Fabrika Satış Bedeli + KDV + Komisyon" />
        <MultiCard label="Toplam Servis Ücreti Cirosu" obj={servisUcreti} color="#f59e0b" sub="Garanti dışı servisler (KDV dahil)" />
        <MultiCard label="Toplam Parça Ücreti Cirosu" obj={parcaUcreti} color="#0ea5e9" sub="Servis — değişen parçalar (KDV dahil)" />
        <MultiCard label="Toplam Extra Kalıp Satış Cirosu" obj={toplamExtraKalip} color="#db2777" sub="Extra Kalıp sekmesi satışları (KDV dahil)" />
        <MultiCard label="Toplam Ödenen Komisyon" obj={komisyon} color="#dc2626" sub="Gider (düşülür)" />
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
          <div style={{ padding: "14px 18px", fontSize: 13, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>Satış Yapan Bazlı</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f8fafc" }}>
              {["Satış Yapan", "Adet"].map(h => <th key={h} style={{ padding: "8px 16px", textAlign: h === "Satış Yapan" ? "left" : "right", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {sellerRows.map(([k, v]) => (
                <tr key={k} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>{k}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, textAlign: "right" }}>{v.adet}</td>
                </tr>
              ))}
              {sellerRows.length === 0 && <tr><td colSpan={2} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>Veri yok</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

