import { useState, useMemo } from "react";
import { hesaplaAnaliz, BILINMEYEN_MODEL, trendModuSec } from "../lib/analiz";
import { today, addMonthsToDateStr, sureBicimSaat, aramaNormalize } from "../lib/utils";
import { Modal } from "./ui";

// ── Analiz sekmesi ────────────────────────────────────────────────────────────
// Servis değişen parçaları + kargo yedek parça satışları + Extra Kalıp üzerinden ADET bazlı
// metrikler (para/ciro YOK — kullanıcı kararı). Salt-okunur: hiçbir kayıt değiştirmez, o yüzden
// yeni izin/eylem yok; yalnız "analiz" sekmesi görünürlüğüne tabi. Hesap saf motorda (lib/analiz.js),
// bu dosya sadece görselleştirir. Extra Kalıp bilinçle AYRI bölüm (kalıp yedek parça değil).

const AY_KISA = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const ayEtiket = (ay) => { const [y, m] = ay.split("-").map(Number); return { kisa: AY_KISA[m - 1] || "", yil: String(y).slice(2) }; };

const SERVIS = "var(--brand, #e85d1a)";
const KARGO = "var(--blu500, #3b82f6)";
const PALET = [SERVIS, KARGO, "var(--teal, #0d9488)", "#f59e0b", "#8b5cf6", "var(--n500, #64748b)"];

const S = {
  bos: { padding: "26px 16px", textAlign: "center", color: "var(--n400, #94a3b8)", fontSize: 13 },
  panel: { background: "var(--surface, #fff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 14, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,.06)", minWidth: 0 },
  phead: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 4 },
  h2: { fontSize: 15.5, fontWeight: 700, color: "var(--n900, #0f172a)", margin: 0 },
  hint: { fontSize: 11.5, color: "var(--n400, #94a3b8)", whiteSpace: "nowrap" },
  note: { fontSize: 12, color: "var(--n500, #64748b)", margin: "3px 0 14px" },
};

// Yatay çubuk: iki renkli (servis + kargo) veya tek renk. tam = bu satırın toplamı / listedeki max.
const Cubuk = ({ ad, servis = 0, kargo = 0, toplam, tam, tekRenk = null }) => {
  const t = toplam != null ? toplam : servis + kargo;
  const genislik = tam > 0 ? Math.max(2, (t / tam) * 100) : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(110px, 150px) 1fr auto", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--n800, #1e293b)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={ad}>{ad}</span>
      <span style={{ height: 20, background: "var(--n150, #f1f5f9)", borderRadius: 5, overflow: "hidden", display: "flex", width: `${genislik}%` }}>
        {tekRenk
          ? <span style={{ height: "100%", width: "100%", background: tekRenk }} />
          : <>
            <span style={{ height: "100%", width: `${(servis / t) * 100}%`, background: SERVIS }} />
            <span style={{ height: "100%", width: `${(kargo / t) * 100}%`, background: KARGO }} />
          </>}
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--n900, #0f172a)", minWidth: 38, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{t}</span>
    </div>
  );
};

// İnce çubuk (model kırılımı): ad + adet üstte, altında dolgu. bilinmeyen = taralı gri.
const ModelCubuk = ({ ad, adet, tam, bilinmeyen }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
    <span style={{ fontSize: 12.5, fontWeight: 500, color: bilinmeyen ? "var(--n400, #94a3b8)" : "var(--n800, #1e293b)", fontStyle: bilinmeyen ? "italic" : "normal", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={ad}>{ad}</span>
    <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--n900, #0f172a)", fontVariantNumeric: "tabular-nums" }}>{adet}</span>
    <span style={{ gridColumn: "1 / -1", height: 8, background: "var(--n150, #f1f5f9)", borderRadius: 4, overflow: "hidden" }}>
      <span style={{ display: "block", height: "100%", width: `${tam > 0 ? Math.max(2, (adet / tam) * 100) : 0}%`, borderRadius: 4, background: bilinmeyen ? "var(--n300, #cbd5e1)" : SERVIS, backgroundImage: bilinmeyen ? "repeating-linear-gradient(45deg, transparent 0 4px, rgba(255,255,255,.35) 4px 8px)" : "none" }} />
    </span>
  </div>
);

const Donut = ({ dilimler }) => {
  const toplam = dilimler.reduce((s, d) => s + d.adet, 0);
  let acc = 0;
  const stops = dilimler.map((d, i) => {
    const bas = toplam > 0 ? (acc / toplam) * 100 : 0;
    acc += d.adet;
    const bit = toplam > 0 ? (acc / toplam) * 100 : 0;
    return `${PALET[i % PALET.length]} ${bas}% ${bit}%`;
  }).join(", ");
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
      <div style={{ width: 108, height: 108, borderRadius: "50%", flexShrink: 0, position: "relative", background: toplam > 0 ? `conic-gradient(${stops})` : "var(--n150, #f1f5f9)" }}>
        <div style={{ position: "absolute", inset: 24, borderRadius: "50%", background: "var(--surface, #fff)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <b style={{ fontSize: 21, fontWeight: 800, color: "var(--n900, #0f172a)", fontVariantNumeric: "tabular-nums" }}>{toplam}</b>
          <span style={{ fontSize: 10, color: "var(--n400, #94a3b8)" }}>servis</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        {dilimler.map((d, i) => (
          <div key={d.ad} style={{ display: "grid", gridTemplateColumns: "12px 1fr auto auto", gap: 8, alignItems: "center", fontSize: 12.5 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: PALET[i % PALET.length] }} />
            <span style={{ color: "var(--n700, #334155)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={d.ad}>{d.ad}</span>
            <span style={{ fontWeight: 700, color: "var(--n900, #0f172a)", fontVariantNumeric: "tabular-nums" }}>{d.adet}</span>
            <span style={{ minWidth: 34, textAlign: "right", color: "var(--n400, #94a3b8)", fontVariantNumeric: "tabular-nums" }}>{toplam > 0 ? `%${Math.round(d.adet / toplam * 100)}` : "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Tile = ({ cap, big, sub, metin }) => (
  <div style={{ background: "var(--surface, #fff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 14, padding: "15px 16px", boxShadow: "0 1px 4px rgba(0,0,0,.07)", position: "relative", overflow: "hidden" }}>
    <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: SERVIS }} />
    <div style={{ fontSize: 12, color: "var(--n500, #64748b)", fontWeight: 500 }}>{cap}</div>
    <div style={{ fontFamily: "inherit", fontWeight: 800, fontSize: metin ? 18 : 32, lineHeight: 1.1, marginTop: 6, color: "var(--n900, #0f172a)", letterSpacing: "-.01em" }}>
      {big}{!metin && <span style={{ fontSize: 13, color: "var(--n400, #94a3b8)", fontWeight: 500, marginLeft: 4 }}>Adet</span>}
    </div>
    {sub && <div style={{ fontSize: 12, color: "var(--n400, #94a3b8)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{sub}</div>}
  </div>
);

const Chip = ({ on, onClick, children }) => (
  <button onClick={onClick} aria-pressed={on}
    style={{ fontSize: 13, fontWeight: on ? 700 : 500, cursor: "pointer", padding: "6px 13px", borderRadius: 999, border: "1px solid", borderColor: on ? "var(--brand, #e85d1a)" : "var(--n200, #e2e8f0)", background: on ? "var(--ambBg3, #fff7ed)" : "var(--surface, #fff)", color: on ? "var(--orTx, #c2410c)" : "var(--n500, #64748b)" }}>
    {children}
  </button>
);

// "Tümünü göster (N) ↗" — liste limitten uzunsa görünür; tıklayınca tüm liste ayrı pencerede (modal) açılır.
const TumBtn = ({ toplam, limit, onAc }) => {
  if (toplam <= limit) return null;
  return (
    <button onClick={onAc}
      style={{ marginTop: 12, alignSelf: "flex-start", fontSize: 12.5, fontWeight: 600, color: "var(--orTx, #c2410c)", background: "none", border: "none", cursor: "pointer", padding: "4px 2px" }}>
      Tümünü göster ({toplam}) ↗
    </button>
  );
};

// Aramalı parça seçici (combobox). Çok parça olunca select zor; tıklayınca arama kutusu + ~10 satırlık
// kaydırmalı liste açılır. Dışarı tıklayınca kapanır (şeffaf tam-ekran katman).
const ParcaSecici = ({ parcalar, secili, onSec }) => {
  const [acik, setAcik] = useState(false);
  const [ara, setAra] = useState("");
  const q = aramaNormalize(ara.trim());
  const liste = q ? parcalar.filter(p => aramaNormalize(p.ad).includes(q)) : parcalar;
  const kapat = () => { setAcik(false); setAra(""); };
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <button aria-label="Parça seç" onClick={() => setAcik(a => !a)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 13, fontWeight: 500, color: "var(--n900, #0f172a)", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: "7px 10px", cursor: "pointer", textAlign: "left" }}>
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{secili ? `${secili.ad} (${secili.toplam})` : "Parça seçin"}</span>
        <span style={{ color: "var(--n400, #94a3b8)", flexShrink: 0 }}>▾</span>
      </button>
      {acik && (
        <>
          <div onClick={kapat} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 21, background: "var(--surface, #fff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, boxShadow: "0 10px 30px rgba(20,26,40,.18)", overflow: "hidden" }}>
            <div style={{ padding: 8, borderBottom: "1px solid var(--n150, #f1f5f9)" }}>
              <input autoFocus value={ara} onChange={e => setAra(e.target.value)} placeholder="Parça ara..." spellCheck={false}
                style={{ width: "100%", boxSizing: "border-box", fontSize: 13, padding: "7px 10px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 7, background: "var(--n100, #f8fafc)", color: "var(--n900, #0f172a)", outline: "none" }} />
            </div>
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {liste.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", fontSize: 12.5, color: "var(--n400, #94a3b8)" }}>Sonuç yok.</div>
              ) : liste.map(p => {
                const secim = p.key === secili?.key;
                return (
                  <button key={p.key} onClick={() => { onSec(p.key); kapat(); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 12px", border: "none", borderLeft: `3px solid ${secim ? "var(--brand, #e85d1a)" : "transparent"}`, background: secim ? "var(--ambBg3, #fff7ed)" : "none", cursor: "pointer", textAlign: "left", font: "inherit" }}>
                    <span style={{ fontSize: 13, color: secim ? "var(--orTx, #c2410c)" : "var(--n800, #1e293b)", fontWeight: secim ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.ad}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--n400, #94a3b8)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{p.toplam}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Panel liste limitleri (aç/kapa öncesi görünen adet).
const LIMIT = { parca: 10, makina: 8, yogunluk: 6, teknisyen: 8, kalipAd: 8, kalipOlcu: 8, kalipModel: 8 };

// Kalıp kaynak renkleri (birleşik iki renkli çubuk): Extra satış vurgulu (brand), Standart nötr (mavi).
const K_EXTRA = "var(--brand, #e85d1a)";
const K_STD = "var(--blu500, #3b82f6)";

// İki kaynaklı kalıp çubuğu (Extra satış + Standart). tam = bu satırın toplamı / listedeki max.
const KalipCubuk = ({ ad, standart = 0, extra = 0, tam }) => {
  const t = standart + extra;
  const genislik = tam > 0 ? Math.max(2, (t / tam) * 100) : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(110px, 150px) 1fr auto", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--n800, #1e293b)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={ad}>{ad}</span>
      <span style={{ height: 20, background: "var(--n150, #f1f5f9)", borderRadius: 5, overflow: "hidden", display: "flex", width: `${genislik}%` }}>
        <span style={{ height: "100%", width: `${(extra / t) * 100}%`, background: K_EXTRA }} />
        <span style={{ height: "100%", width: `${(standart / t) * 100}%`, background: K_STD }} />
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--n900, #0f172a)", minWidth: 38, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{t}</span>
    </div>
  );
};

export const Analiz = ({ customers = [], services = [], partSales = [], yedekParcaSatislar = [], parts = [], appSettings = {} }) => {
  const [preset, setPreset] = useState("tum"); // 'yil' | 'son12' | 'tum' | 'ozel' — açılışta tüm zamanlar
  const [ozelBas, setOzelBas] = useState("");
  const [ozelBit, setOzelBit] = useState("");
  const [seciliKey, setSeciliKey] = useState(null);
  const [modalKey, setModalKey] = useState(null); // "tümünü göster" ile ayrı pencerede açılan panel
  const ilk = (arr, k) => arr.slice(0, LIMIT[k]); // panelde gösterilen ilk N

  const aralik = useMemo(() => {
    const bugun = today();
    let r;
    if (preset === "yil") r = { baslangic: `${bugun.slice(0, 4)}-01-01`, bitis: bugun };
    else if (preset === "son12") r = { baslangic: addMonthsToDateStr(bugun, -12), bitis: bugun };
    else if (preset === "ozel") r = { baslangic: ozelBas || null, bitis: ozelBit || null };
    else r = { baslangic: null, bitis: null }; // tüm zamanlar
    // Trend granülerliği: Tüm zamanlar hep yıllık, yıl-farklı özel aralık yıllık, diğerleri aylık.
    return { ...r, trendModu: trendModuSec(preset, r.baslangic, r.bitis) };
  }, [preset, ozelBas, ozelBit]);

  const veri = useMemo(
    () => hesaplaAnaliz({ customers, services, partSales, yedekParcaSatislar, parts, calismaSaatleri: appSettings.calismaSaatleri }, aralik),
    [customers, services, partSales, yedekParcaSatislar, parts, appSettings.calismaSaatleri, aralik],
  );

  const { ozet } = veri;
  const secili = veri.parcalar.find(p => p.key === seciliKey) || veri.parcalar[0] || null;
  const parcaMax = veri.parcalar[0]?.toplam || 0;
  // Model Servis Yoğunluğu: yalnız Ayarlar > Katalog > Makina Modelleri'nde işaretli (gizli olmayan) modeller.
  // Gizli liste boş → tüm modeller (varsayılan). En Yoğun Model özet kutusu da aynı filtreye tabi (tutarlılık).
  const gizliModeller = new Set(appSettings?.analizGizliModeller || []);
  const modelYogunlugu = veri.modelYogunlugu.filter(m => !gizliModeller.has(m.model));
  const yogunlukMax = Math.max(0, ...modelYogunlugu.map(m => m.oran));
  const enYogun = modelYogunlugu[0] || null; // en yüksek servis/makina oranı (özet kutusu)
  const trendMax = Math.max(1, ...veri.trend.map(a => a.adet));
  const trendYillik = veri.trendBirim === "yil";
  const techMax = Math.max(1, ...veri.teknisyenler.map(t => t.adet));
  const kalipAdMax = veri.kalipAd[0]?.toplam || 0;
  const kalipOlcuMax = veri.kalipOlcu[0]?.toplam || 0;
  const kalipModelMax = veri.kalipModel[0]?.toplam || 0;
  const modelToplam = secili ? secili.modeller.reduce((s, m) => s + m.adet, 0) : 0;

  const aralikBos = veri.parcalar.length === 0 && ozet.toplamServis === 0 && ozet.kalipToplam === 0 && ozet.standartToplam === 0;

  // ── Satır render fonksiyonları (panelde ilk N + modalde tümü için paylaşılır) ──
  const listeStil = { display: "flex", flexDirection: "column", gap: 11 };
  const parcaRow = (p) => <Cubuk key={p.key} ad={p.ad} servis={p.servis} kargo={p.kargo} toplam={p.toplam} tam={parcaMax} />;
  const kalipRow = (k, tam) => <KalipCubuk key={k.ad} ad={k.ad} standart={k.standart} extra={k.extra} tam={tam} />;
  const yogunlukRow = (m) => {
    const yuksek = m.oran >= 4;
    return (
      <div key={m.model} style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 12, alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--n900, #0f172a)" }}>{m.model}<small style={{ display: "block", fontWeight: 400, color: "var(--n400, #94a3b8)", fontSize: 11 }}>{m.makina} makina</small></span>
        <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ height: 10, background: "var(--n150, #f1f5f9)", borderRadius: 5, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", borderRadius: 5, width: `${yogunlukMax > 0 ? Math.max(3, (m.oran / yogunlukMax) * 100) : 0}%`, background: yuksek ? "var(--red600, #dc2626)" : SERVIS }} />
          </span>
          <span style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--n500, #64748b)" }}>
            <span>{m.servis} servis</span>
            <span style={{ fontWeight: 700, color: yuksek ? "var(--red600, #dc2626)" : "var(--n900, #0f172a)", fontVariantNumeric: "tabular-nums" }}>{m.oran.toFixed(1)} / makina</span>
          </span>
        </span>
      </div>
    );
  };
  const teknisyenRow = (t) => (
    <div key={t.ad} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
      <span style={{ minWidth: 0 }}>
        <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--n800, #1e293b)" }}>{t.ad}</span>
        <span style={{ display: "block", height: 6, background: "var(--n150, #f1f5f9)", borderRadius: 3, overflow: "hidden", marginTop: 5, maxWidth: 200 }}>
          <span style={{ display: "block", height: "100%", width: `${(t.adet / techMax) * 100}%`, background: SERVIS }} />
        </span>
      </span>
      <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--n900, #0f172a)", fontVariantNumeric: "tabular-nums" }}>{t.adet}</span>
        <span style={{ display: "block", fontSize: 11, color: "var(--n500, #64748b)", marginTop: 2 }}>⏱ {t.ortIsclikDk != null ? sureBicimSaat(t.ortIsclikDk) : "—"}</span>
      </span>
    </div>
  );
  const makinaTablo = (list) => (
    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6 }}>
      <thead>
        <tr>
          {["", "Model", "Seri No", "Firma", "Servis"].map((h, i) => (
            <th key={h || "r"} style={{ textAlign: i === 4 ? "right" : "left", fontSize: 10.5, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--n400, #94a3b8)", fontWeight: 700, padding: "0 8px 8px" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {list.map((m, i) => (
          <tr key={m.customerId}>
            <td style={{ padding: "8px", borderTop: "1px solid var(--n150, #f1f5f9)", fontSize: 12, color: "var(--n400, #94a3b8)", width: 20, fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
            <td style={{ padding: "8px", borderTop: "1px solid var(--n150, #f1f5f9)", fontSize: 13, fontWeight: 600, color: "var(--n900, #0f172a)" }}>{m.model}</td>
            <td style={{ padding: "8px", borderTop: "1px solid var(--n150, #f1f5f9)", fontSize: 12, color: "var(--n500, #64748b)", fontVariantNumeric: "tabular-nums" }}>{m.serialNo || "—"}</td>
            <td style={{ padding: "8px", borderTop: "1px solid var(--n150, #f1f5f9)", fontSize: 12.5, color: "var(--n500, #64748b)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={m.name}>{m.name}</td>
            <td style={{ padding: "8px", borderTop: "1px solid var(--n150, #f1f5f9)", textAlign: "right" }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--orTx, #c2410c)", background: "var(--ambBg3, #fff7ed)", padding: "2px 9px", borderRadius: 999, fontVariantNumeric: "tabular-nums" }}>{m.adet}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  const parcaLejant = (
    <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--n500, #64748b)" }}><span style={{ width: 11, height: 11, borderRadius: 3, background: SERVIS }} /> Serviste değişen</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--n500, #64748b)" }}><span style={{ width: 11, height: 11, borderRadius: 3, background: KARGO }} /> Kargo satışı</span>
    </div>
  );
  const kalipLejant = (
    <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--n500, #64748b)" }}><span style={{ width: 11, height: 11, borderRadius: 3, background: K_EXTRA }} /> Extra Satış</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--n500, #64748b)" }}><span style={{ width: 11, height: 11, borderRadius: 3, background: K_STD }} /> Standart</span>
    </div>
  );
  // "Tümünü göster" ile açılan pencere içerikleri (tüm liste). node() canlı veriden çizilir.
  const modalTanim = {
    parca: { baslik: "En Çok Satılan / Değişen Yedek Parçalar", arr: veri.parcalar, node: () => <>{parcaLejant}<div style={listeStil}>{veri.parcalar.map(parcaRow)}</div></> },
    makina: { baslik: "En Çok Fabrikada ve Dış Serviste Servis Alan Makinalar", arr: veri.enCokServisliMakinalar, node: () => makinaTablo(veri.enCokServisliMakinalar) },
    yogunluk: { baslik: "Model Servis Yoğunluğu", arr: modelYogunlugu, node: () => <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>{modelYogunlugu.map(yogunlukRow)}</div> },
    teknisyen: { baslik: "Teknisyen Dökümü", arr: veri.teknisyenler, node: () => <div style={listeStil}>{veri.teknisyenler.map(teknisyenRow)}</div> },
    kalipAd: { baslik: "En Çok Kullanılan Kalıp", arr: veri.kalipAd, node: () => <>{kalipLejant}<div style={listeStil}>{veri.kalipAd.map(k => kalipRow(k, kalipAdMax))}</div></> },
    kalipOlcu: { baslik: "Kalıp Ölçüleri", arr: veri.kalipOlcu, node: () => <>{kalipLejant}<div style={listeStil}>{veri.kalipOlcu.map(k => kalipRow(k, kalipOlcuMax))}</div></> },
    kalipModel: { baslik: "Modele Göre Kalıp", arr: veri.kalipModel, node: () => <>{kalipLejant}<div style={listeStil}>{veri.kalipModel.map(k => kalipRow(k, kalipModelMax))}</div></> },
  };
  const acikModal = modalKey ? modalTanim[modalKey] : null;

  return (
    <div style={{ padding: "4px 2px 40px" }}>
      {/* Başlık + tarih filtresi */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--n900, #0f172a)", margin: 0 }}>Servis &amp; Parça Analizi</h1>
          <p style={{ color: "var(--n500, #64748b)", fontSize: 13.5, margin: "4px 0 0", maxWidth: "62ch" }}>
            Servis değişen parçaları ve kargo yedek parça satışları tek yerde. Hangi parça en çok tükeniyor, hangi model en çok arızalanıyor, hangi makina en çok serviste.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }} role="group" aria-label="Tarih aralığı">
          <span style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--n400, #94a3b8)", fontWeight: 600 }}>Aralık</span>
          <Chip on={preset === "yil"} onClick={() => setPreset("yil")}>Bu yıl</Chip>
          <Chip on={preset === "son12"} onClick={() => setPreset("son12")}>Son 12 ay</Chip>
          <Chip on={preset === "tum"} onClick={() => setPreset("tum")}>Tüm zamanlar</Chip>
          <Chip on={preset === "ozel"} onClick={() => setPreset("ozel")}>Özel…</Chip>
        </div>
      </div>

      {preset === "ozel" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16, padding: "10px 14px", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10 }}>
          <span style={{ fontSize: 12.5, color: "var(--n500, #64748b)" }}>Başlangıç</span>
          <input type="date" value={ozelBas} onChange={e => setOzelBas(e.target.value)} style={{ padding: "6px 9px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13, background: "var(--surface, #fff)", color: "var(--n900, #0f172a)" }} />
          <span style={{ fontSize: 12.5, color: "var(--n500, #64748b)" }}>Bitiş</span>
          <input type="date" value={ozelBit} onChange={e => setOzelBit(e.target.value)} style={{ padding: "6px 9px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13, background: "var(--surface, #fff)", color: "var(--n900, #0f172a)" }} />
        </div>
      )}

      {/* Özet kutuları */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 18 }}>
        <Tile cap="Toplam Değişen + Satılan Parça" big={ozet.parcaToplam} sub={`Servis ${ozet.parcaServisToplam} · Kargo ${ozet.parcaKargoToplam}`} />
        <Tile cap="Toplam Servis Kaydı" big={ozet.toplamServis} sub={`${ozet.makinaSayisi} Makina Üzerinde`} />
        <Tile cap="En Çok Değişen Parça" metin big={ozet.enCokParca?.ad || "—"} sub={ozet.enCokParca ? `${ozet.enCokParca.toplam} Adet` : ""} />
        <Tile cap="En Yoğun Model" metin big={enYogun?.model || "—"} sub={enYogun ? `${enYogun.oran.toFixed(1)} Servis / Makina · ${enYogun.makina} Makina` : ""} />
      </div>

      {aralikBos && (
        <div style={{ ...S.panel, textAlign: "center", padding: "40px 20px", color: "var(--n500, #64748b)" }}>
          <div style={{ fontSize: 30, opacity: .5, marginBottom: 8 }}>📊</div>
          Seçili tarih aralığında analiz edilecek servis, yedek parça veya kalıp kaydı yok.
        </div>
      )}

      {!aralikBos && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 16 }}>
          {/* En çok parça */}
          <section style={{ ...S.panel, gridColumn: "span 7" }}>
            <div style={S.phead}><h2 style={S.h2}>En Çok Satılan / Değişen Yedek Parçalar</h2><span style={S.hint}>Adet · Servis + Kargo</span></div>
            <p style={S.note}>Serviste değişen parçalar ve kargoyla satılan yedek parçalar aynı sıralamada.</p>
            {veri.parcalar.length === 0 ? <div style={S.bos}>Parça hareketi yok.</div> : (
              <>
                <div style={listeStil}>{ilk(veri.parcalar, "parca").map(parcaRow)}</div>
                <TumBtn toplam={veri.parcalar.length} limit={LIMIT.parca} onAc={() => setModalKey("parca")} />
              </>
            )}
            <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--n150, #f1f5f9)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--n500, #64748b)" }}><span style={{ width: 11, height: 11, borderRadius: 3, background: SERVIS }} /> Serviste değişen</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--n500, #64748b)" }}><span style={{ width: 11, height: 11, borderRadius: 3, background: KARGO }} /> Kargo satışı</span>
            </div>
          </section>

          {/* Parça → Model */}
          <section style={{ ...S.panel, gridColumn: "span 5" }}>
            <div style={S.phead}><h2 style={S.h2}>Parça → Model Kırılımı</h2></div>
            <p style={S.note}>Seçilen parça en çok hangi modele gitti?</p>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
              <span style={{ fontSize: 12.5, color: "var(--n500, #64748b)", flexShrink: 0 }}>Parça:</span>
              <ParcaSecici parcalar={veri.parcalar} secili={secili} onSec={setSeciliKey} />
            </div>
            {!secili ? <div style={S.bos}>Parça yok.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {secili.modeller.map(m => <ModelCubuk key={m.model} ad={m.model} adet={m.adet} tam={modelToplam} bilinmeyen={m.bilinmeyen} />)}
                {secili.modeller.some(m => m.bilinmeyen) && (
                  <p style={{ fontSize: 11, color: "var(--n400, #94a3b8)", margin: "4px 0 0" }}>“{BILINMEYEN_MODEL}” = tahsis edilmemiş / makinası bilinmeyen kargo satışları.</p>
                )}
              </div>
            )}
          </section>

          {/* En çok servisli makinalar */}
          <section style={{ ...S.panel, gridColumn: "span 7" }}>
            <div style={S.phead}><h2 style={S.h2}>En Çok Fabrikada ve Dış Serviste Servis Alan Makinalar</h2><span style={S.hint}>Seri No Bazında</span></div>
            {veri.enCokServisliMakinalar.length === 0 ? <div style={S.bos}>Servis kaydı yok.</div> : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {makinaTablo(ilk(veri.enCokServisliMakinalar, "makina"))}
                <TumBtn toplam={veri.enCokServisliMakinalar.length} limit={LIMIT.makina} onAc={() => setModalKey("makina")} />
              </div>
            )}
          </section>

          {/* Model yoğunluğu */}
          <section style={{ ...S.panel, gridColumn: "span 5" }}>
            <div style={S.phead}><h2 style={S.h2}>Model Servis Yoğunluğu</h2></div>
            <p style={S.note}>Hesap: o modeldeki toplam servis sayısı, o modelin makina (filo) sayısına bölünür. Filoya normalize edildiği için çok satan model haksız yere “arızalı” görünmez.</p>
            {modelYogunlugu.length === 0 ? <div style={S.bos}>Veri yok.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                {ilk(modelYogunlugu, "yogunluk").map(yogunlukRow)}
                <TumBtn toplam={modelYogunlugu.length} limit={LIMIT.yogunluk} onAc={() => setModalKey("yogunluk")} />
              </div>
            )}
          </section>

          {/* Servis tipi + onarım yeri */}
          <section style={{ ...S.panel, gridColumn: "span 7", display: "flex", flexDirection: "column" }}>
            <div style={S.phead}><h2 style={S.h2}>Servis Tipi &amp; Onarım Yeri</h2></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 12, flex: 1, justifyContent: "center" }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--n400, #94a3b8)", fontWeight: 600, marginBottom: 12 }}>Servis Tipi</div>
                {veri.servisTipleri.length === 0 ? <div style={S.bos}>Veri yok.</div> : <Donut dilimler={veri.servisTipleri} />}
              </div>
              <div style={{ paddingTop: 20, borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--n400, #94a3b8)", fontWeight: 600, marginBottom: 12 }}>Onarım Yeri</div>
                {veri.onarimYerleri.length === 0 ? <div style={S.bos}>Veri yok.</div> : <Donut dilimler={veri.onarimYerleri} />}
              </div>
            </div>
          </section>

          {/* Teknisyen */}
          <section style={{ ...S.panel, gridColumn: "span 5" }}>
            <div style={S.phead}><h2 style={S.h2}>Teknisyen Dökümü</h2><span style={S.hint}>Servis · Ort. İşçilik</span></div>
            <p style={S.note}>İşçilik süresi çalışma saatlerine göre (gece/hafta sonu sayılmaz).</p>
            {veri.teknisyenler.length === 0 ? <div style={S.bos}>Servis kaydı yok.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {ilk(veri.teknisyenler, "teknisyen").map(teknisyenRow)}
                <TumBtn toplam={veri.teknisyenler.length} limit={LIMIT.teknisyen} onAc={() => setModalKey("teknisyen")} />
              </div>
            )}
          </section>

          {/* Servis trendi: aralık > 12 ay ise yıllık, değilse aylık */}
          <section style={{ ...S.panel, gridColumn: "span 12" }}>
            <div style={S.phead}>
              <h2 style={S.h2}>{trendYillik ? "Yıllık Servis Adedi" : "Aylık Servis Adedi"}</h2>
              <span style={S.hint}>{trendYillik ? (veri.trend.length ? `${veri.trend[0].donem}–${veri.trend[veri.trend.length - 1].donem}` : "Yıl bazında") : "12 Ay"}</span>
            </div>
            {veri.trend.length === 0 ? <div style={S.bos}>Servis kaydı yok.</div> : (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${veri.trend.length}, 1fr)`, gap: 8, alignItems: "end", height: 150, marginTop: 10 }}>
                {veri.trend.map(a => {
                  const et = trendYillik ? null : ayEtiket(a.donem);
                  const zirve = a.adet === trendMax && a.adet > 0;
                  return (
                    <div key={a.donem} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 6 }}>
                      <span style={{ position: "relative", width: "100%", maxWidth: 30, height: `${(a.adet / trendMax) * 100}%`, minHeight: a.adet > 0 ? 3 : 0, background: SERVIS, borderRadius: "4px 4px 0 0", outline: zirve ? `2px solid ${SERVIS}` : "none", outlineOffset: 1 }}>
                        <span style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", fontSize: 10.5, fontWeight: 700, color: "var(--n500, #64748b)", fontVariantNumeric: "tabular-nums" }}>{a.adet || ""}</span>
                      </span>
                      <span style={{ fontSize: 10.5, color: "var(--n400, #94a3b8)", whiteSpace: "nowrap" }}>{trendYillik ? a.donem : `${et.kisa}${et.kisa === "Oca" ? ` ’${et.yil}` : ""}`}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Kalıp Analizi — Extra satış + Standart birleşik */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "28px 0 8px" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--n900, #0f172a)", margin: 0 }}>Kalıp Analizi</h2>
        <span style={{ flex: 1, height: 1, background: "var(--n200, #e2e8f0)" }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 16px", margin: "0 0 14px" }}>
        <span style={{ fontSize: 12.5, color: "var(--n500, #64748b)" }}>Toplam <b>{ozet.kalipGenelToplam}</b> Kalıp · Extra Satış <b>{ozet.kalipToplam}</b> · Standart (Makinayla) <b>{ozet.standartToplam}</b></span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--n500, #64748b)" }}><span style={{ width: 11, height: 11, borderRadius: 3, background: K_EXTRA }} /> Extra Satış</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--n500, #64748b)" }}><span style={{ width: 11, height: 11, borderRadius: 3, background: K_STD }} /> Standart</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <section style={{ ...S.panel, borderColor: "var(--blu200, #bfdbfe)" }}>
          <div style={S.phead}><h2 style={S.h2}>En Çok Kullanılan Kalıp</h2><span style={S.hint}>Kalıp Adı · Adet</span></div>
          {veri.kalipAd.length === 0 ? <div style={S.bos}>Bu aralıkta kalıp yok.</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 4 }}>
              {ilk(veri.kalipAd, "kalipAd").map(k => kalipRow(k, kalipAdMax))}
              <TumBtn toplam={veri.kalipAd.length} limit={LIMIT.kalipAd} onAc={() => setModalKey("kalipAd")} />
            </div>
          )}
        </section>
        <section style={{ ...S.panel, borderColor: "var(--blu200, #bfdbfe)" }}>
          <div style={S.phead}><h2 style={S.h2}>Kalıp Ölçüleri</h2><span style={S.hint}>Adet</span></div>
          {veri.kalipOlcu.length === 0 ? <div style={S.bos}>Bu aralıkta kalıp yok.</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 4 }}>
              {ilk(veri.kalipOlcu, "kalipOlcu").map(k => kalipRow(k, kalipOlcuMax))}
              <TumBtn toplam={veri.kalipOlcu.length} limit={LIMIT.kalipOlcu} onAc={() => setModalKey("kalipOlcu")} />
            </div>
          )}
        </section>
        <section style={{ ...S.panel, borderColor: "var(--blu200, #bfdbfe)" }}>
          <div style={S.phead}><h2 style={S.h2}>Modele Göre Kalıp</h2><span style={S.hint}>Adet</span></div>
          {veri.kalipModel.length === 0 ? <div style={S.bos}>Bu aralıkta kalıp yok.</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 4 }}>
              {ilk(veri.kalipModel, "kalipModel").map(k => kalipRow(k, kalipModelMax))}
              <TumBtn toplam={veri.kalipModel.length} limit={LIMIT.kalipModel} onAc={() => setModalKey("kalipModel")} />
            </div>
          )}
        </section>
      </div>

      {/* "Tümünü göster" penceresi (tüm liste) */}
      {acikModal && (
        <Modal title={`${acikModal.baslik} · ${acikModal.arr.length}`} onClose={() => setModalKey(null)} maxWidth={680} maxHeight="82vh">
          {acikModal.node()}
        </Modal>
      )}
    </div>
  );
};
