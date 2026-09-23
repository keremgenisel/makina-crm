import { useState } from "react";
import { Icon, Select } from "../ui";
import { ATAMA, modelSatirlariDogrula, modelSatirTutari, tutarCoz } from "../../lib/gider";
import { fmtCur, trLower } from "../../lib/utils";

// Gider kalemi ve tekrarlayan tanım formlarının paylaştığı alanlar (spec 0001). İki form aynı
// atama/tutar bileşenlerini kullanır ki kalem ile tanım birbirinden ayrışmasın.

export const tl2 = (n) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n) || 0) + " ₺";
// Kuruşlu tutar girişi: MoneyInput yalnız tam sayı aldığı için (ör. 39.223,13 işveren maliyeti) ayrı
// bileşen. Ham metni tutar; sayıya çevirme ve doğrulama kayıtta tutarCoz ile yapılır (AC-2).
export const TutarInput = ({ value, onChange, placeholder = "0,00", sym = "₺", invalid = false, id, ariaLabel, disabled }) => (
  <div style={{ position: "relative" }}>
    <input id={id} aria-label={ariaLabel} value={value ?? ""} disabled={disabled} inputMode="decimal"
      onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input"
      style={{ paddingRight: 28, textAlign: "right", fontWeight: 600, ...(invalid ? { borderColor: "var(--red500, #ef4444)", background: "var(--redBg, #fef2f2)" } : {}) }} />
    <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--n400, #94a3b8)", fontSize: 14, pointerEvents: "none" }}>{sym}</span>
  </div>
);
// Saklanan sayıyı forma ham metin olarak geri koymak için (düzenleme açılışı).
export const tutarMetni = (n) => (n == null || n === "" ? "" : String(n).replace(".", ","));

export const HataMetni = ({ children }) => children ? (
  <div role="alert" style={{ fontSize: 12, color: "var(--red700, #b91c1c)", fontWeight: 600, marginTop: 4 }}>{children}</div>
) : null;
export const Ipucu = ({ children }) => children ? (
  <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 4, lineHeight: 1.45 }}>{children}</div>
) : null;

// Segmentli seçici (brüt/net, ödendi/ödenmedi, ödeme yöntemi, atama türü).
export const Segment = ({ options, value, onChange, ariaLabel, disabled }) => (
  <div role="radiogroup" aria-label={ariaLabel} style={{ display: "flex", gap: 2, background: "var(--n150, #f1f5f9)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: 3, flexWrap: "wrap" }}>
    {options.map(o => {
      const aktif = o.value === value;
      return (
        <button key={String(o.value)} type="button" role="radio" aria-checked={aktif} disabled={disabled}
          onClick={() => onChange(o.value)}
          style={{ flex: "1 1 0", border: "none", borderRadius: 6, padding: "7px 10px", fontSize: 12.5, cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap",
            background: aktif ? "var(--surface, #ffffff)" : "transparent", color: aktif ? "var(--orTx, #c2410c)" : "var(--n500, #64748b)",
            fontWeight: aktif ? 700 : 600, boxShadow: aktif ? "0 1px 2px rgba(15,23,42,.12)" : "none" }}>
          {o.label}
        </button>
      );
    })}
  </div>
);

export const AyInput = ({ value, onChange, id, ariaLabel }) => (
  <input type="month" id={id} aria-label={ariaLabel} className="input" value={value || ""} onChange={e => onChange(e.target.value || null)} />
);

// Makina seçici (R7): Makina Stoğu ve müşteri makinaları; değer "stok:ID" / "musteri:ID".
export const MakinaSecici = ({ makinaTur, makinaId, onChange, stock = [], customers = [], id }) => {
  const deger = makinaId != null && makinaTur ? `${makinaTur}:${makinaId}` : "";
  const etiket = (m) => [m.model, m.serialNo].filter(Boolean).join(" · ") || "Makina";
  return (
    <Select id={id} aria-label="Makina" value={deger} onChange={e => {
      const v = e.target.value;
      if (!v) { onChange({ makinaTur: null, makinaId: null }); return; }
      const i = v.indexOf(":");
      const tur = v.slice(0, i), raw = v.slice(i + 1);
      onChange({ makinaTur: tur, makinaId: /^\d+$/.test(raw) ? Number(raw) : raw });
    }}>
      <option value="">Makina seçin</option>
      <optgroup label="Makina Stoğu">
        {stock.filter(s => !s.deletedAt).map(s => <option key={`s${s.id}`} value={`stok:${s.id}`}>{etiket(s)}</option>)}
      </optgroup>
      <optgroup label="Müşteri Makinaları">
        {customers.filter(c => !c.deletedAt).map(c => <option key={`m${c.id}`} value={`musteri:${c.id}`}>{etiket(c)} · {c.name || ""}</option>)}
      </optgroup>
    </Select>
  );
};

// Çok satırlı model dağılımı (R21, K31, K32): model + birim maliyet + adet; satır toplamı gösterimdir.
export const ModelSatirlari = ({ satirlar = [], onChange, modeller = [], tutar }) => {
  const d = modelSatirlariDogrula(tutarCoz(tutar).deger, satirlar);
  const set = (i, patch) => onChange(satirlar.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const hataOf = (i, alan) => d.hatalar.find(h => h.satir === i && h.alan === alan)?.mesaj;
  const kullanilan = new Set(satirlar.map(s => trLower(s.modelAd)));
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) 90px 110px 34px", gap: 8, fontSize: 11, fontWeight: 700, color: "var(--n500, #64748b)", textTransform: "uppercase", letterSpacing: .4, marginBottom: 6 }}>
        <span>Model</span><span>Makina başına</span><span>Adet</span><span style={{ textAlign: "right" }}>Satır toplamı</span><span />
      </div>
      {satirlar.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) 90px 110px 34px", gap: 8, alignItems: "center" }}>
            <Select aria-label={`Model ${i + 1}`} value={s.modelAd || ""} onChange={e => set(i, { modelAd: e.target.value })}>
              <option value="">Model seçin</option>
              {modeller.map(m => (
                <option key={m.model} value={m.model} disabled={m.model !== s.modelAd && kullanilan.has(trLower(m.model))}>{m.model}</option>
              ))}
            </Select>
            <TutarInput ariaLabel={`Birim maliyet ${i + 1}`} value={s.birimMaliyet} onChange={v => set(i, { birimMaliyet: v })} invalid={!!hataOf(i, "birimMaliyet")} />
            <input aria-label={`Adet ${i + 1}`} className="input" inputMode="numeric" value={s.adet ?? ""} onChange={e => set(i, { adet: e.target.value })}
              style={{ textAlign: "right", ...(hataOf(i, "adet") ? { borderColor: "var(--red500, #ef4444)" } : {}) }} />
            <div style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", fontSize: 13 }}>{tl2(modelSatirTutari(s))}</div>
            <button type="button" aria-label={`Satır ${i + 1} sil`} onClick={() => onChange(satirlar.filter((_, j) => j !== i))}
              style={{ border: "1px solid var(--n200, #e2e8f0)", background: "var(--surface, #ffffff)", borderRadius: 7, height: 32, cursor: "pointer", color: "var(--red600, #dc2626)" }}>
              <Icon name="trash" size={13} />
            </button>
          </div>
          <HataMetni>{hataOf(i, "modelAd") || hataOf(i, "birimMaliyet") || hataOf(i, "adet")}</HataMetni>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...satirlar, { modelAd: "", birimMaliyet: "", adet: "" }])}
        style={{ border: "1px dashed var(--n300, #cbd5e1)", background: "transparent", borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", color: "var(--n600, #475569)", display: "inline-flex", gap: 6, alignItems: "center" }}>
        <Icon name="plus" size={13} /> Model satırı ekle
      </button>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, fontSize: 12.5 }}>
        <div><div style={{ color: "var(--n500, #64748b)" }}>Dağıtılan</div><b>{tl2(d.dagitilan)}</b></div>
        <div><div style={{ color: "var(--n500, #64748b)" }}>Kalem tutarı</div><b>{tl2(tutarCoz(tutar).deger)}</b></div>
        <div><div style={{ color: "var(--n500, #64748b)" }}>{d.asim > 0 ? "Aşım" : "Fark → ortak gider"}</div>
          <b style={{ color: d.asim > 0 ? "var(--red700, #b91c1c)" : d.fark > 0 ? "var(--amb700, #b45309)" : "inherit" }}>{tl2(d.asim > 0 ? d.asim : d.fark)}</b></div>
      </div>
      {d.asim > 0 && <HataMetni>Satır toplamı kalem tutarını {tl2(d.asim)} aşıyor. Kayıt yapılamaz.</HataMetni>}
      {d.asim === 0 && d.fark > 0 && satirlar.length > 0 && <Ipucu>Dağıtılmayan {tl2(d.fark)} ortak gidere yazılır. Bu bir uyarıdır, kaydı engellemez.</Ipucu>}
    </div>
  );
};

const ATAMA_SECENEKLERI = [
  { value: ATAMA.ORTAK, label: "Ortak gider" },
  { value: ATAMA.MAKINA, label: "Makina" },
  { value: ATAMA.MODEL, label: "Model" },
  { value: ATAMA.DAGITMA, label: "Dağıtılmasın" },
];
const ATAMA_AD = { makina: "Makina", model: "Model", dagitma: "Dağıtılmasın" };

// Atama seçici (R7, R20, R21, K25): üç seçenek birbirini dışlar. Seçim değişince önceki atama
// temizlenir ve tek satırlık bilgi gösterilir (AC-76, AC-77). Yalnız normal davranışta çizilir (K38).
export const AtamaAlani = ({ value, onChange, stock, customers, modeller, tutar }) => {
  const [bilgi, setBilgi] = useState("");
  const at = value.atamaTur || "";
  const degistir = (yeni) => {
    if (yeni === at) return;
    const doluMu = (at === ATAMA.MAKINA && value.makinaId != null) || (at === ATAMA.MODEL && (value.modelSatirlari || []).length > 0) || at === ATAMA.DAGITMA;
    setBilgi(doluMu ? `${ATAMA_AD[at]} seçimi kaldırıldı. Bir kalemde makina, model veya “dağıtılmasın” seçimlerinden yalnız biri olabilir.` : "");
    onChange({ atamaTur: yeni, makinaTur: null, makinaId: null, modelSatirlari: yeni === ATAMA.MODEL ? [{ modelAd: "", birimMaliyet: "", adet: "" }] : [] });
  };
  return (
    <div>
      <Segment ariaLabel="Makina maliyeti ataması" options={ATAMA_SECENEKLERI} value={at} onChange={degistir} />
      {bilgi && <div role="status" style={{ fontSize: 12, color: "var(--n600, #475569)", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: "7px 10px", marginTop: 8 }}>{bilgi}</div>}
      {at === ATAMA.ORTAK && <Ipucu>Ortak gider, makina maliyeti hesabında (0002) makinalara dağıtılır.</Ipucu>}
      {at === ATAMA.DAGITMA && <Ipucu>Makina maliyetine hiç girmez (ör. satılmak üzere yedek parça stoğuna alınan mal). Gider toplamında ve borç özetinde normal görünür.</Ipucu>}
      {at === ATAMA.MAKINA && (
        <div style={{ marginTop: 10 }}>
          <MakinaSecici makinaTur={value.makinaTur} makinaId={value.makinaId} stock={stock} customers={customers}
            onChange={p => onChange({ ...p })} />
          <Ipucu>Stoktaki makinaya yapılan atama, makina stoktan seçilerek satıldığında o satışa takip edilir.</Ipucu>
        </div>
      )}
      {at === ATAMA.MODEL && (
        <div style={{ marginTop: 10 }}>
          <ModelSatirlari satirlar={value.modelSatirlari || []} onChange={m => onChange({ modelSatirlari: m })} modeller={modeller} tutar={tutar} />
        </div>
      )}
    </div>
  );
};

export const ODEME_SECENEKLERI = [
  { value: "", label: "Belirtilmemiş" }, { value: "Nakit", label: "Nakit" }, { value: "Havale", label: "Havale" },
  { value: "Çek", label: "Çek" }, { value: "Kredi Kartı", label: "Kredi Kartı" },
];
export const DAVRANIS_AD = { normal: "Normal", kira: "Kira", personel: "Personel" };
export const DavranisRozeti = ({ davranis }) => {
  const r = { kira: ["var(--orTx, #c2410c)", "var(--ambBg3, #fff7ed)", "var(--ambBr3, #fed7aa)"], personel: ["#6d28d9", "#f5f3ff", "#ddd6fe"], normal: ["var(--n600, #475569)", "var(--n150, #f1f5f9)", "var(--n200, #e2e8f0)"] }[davranis] || [];
  return <span style={{ display: "inline-flex", fontSize: 11, fontWeight: 700, color: r[0], background: r[1], border: `1px solid ${r[2]}`, borderRadius: 999, padding: "1px 8px", whiteSpace: "nowrap" }}>{DAVRANIS_AD[davranis] || "Normal"}</span>;
};
export const fmtTL = (n) => fmtCur(n, "TRY");
