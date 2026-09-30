import { useState } from "react";
import { Icon } from "./ui";

// Tasarım sözlüğü (spec 0009): uygulamanın paylaşılan altı yapı taşı. Ne zaman hangisinin kullanılacağı
// docs/tasarim-sozlugu.md'de yazılı; yeni bir ekran bu dosyadan beslenir, yerel kopya yazmaz.
// Stil değerleri taşındıkları ekranların bugünkü değerlerinin birebir kopyasıdır (R7: görünüm değişmez).
// Kimlik (data-testid) her zaman çağırandan gelir (R9).

// ── Segmentli seçici ─────────────────────────────────────────────────────────
// kip: "radyo" → radiogroup + radio + aria-checked (varsayılan) · "dugme" → group + aria-pressed (süzgeç çubukları; rol
// button kalır) · "sekme" → tablist + tab + aria-selected (gezinme alt sekmeleri; ok tuşu gezinmesi yok, spec 0014 Z4).
// gorunum: "hap" → gri zemin üstünde beyaz aktif hap, satır sarar (varsayılan) · "cerceve" → çerçeveli düğmeler,
// seçili olan marka kenarlıklı ve açık turuncu zeminli.
// genislik: "esit" → düğmeler kabı eşit paylaşır (varsayılan) · "icerik" → kap ve düğmeler içerik kadar, dar pencerede
// satır sarar (çok seçenekli süzgeç çubukları, spec 0014 R9).
// options[].sayi: isteğe bağlı sayı rozeti. Metin içeriği ve erişilebilir ad bugünkü "Etiket (n)" biçiminde kalır:
// parantezler görsel olarak gizli, sayı rozette; ad, tarayıcıların blok öğe boşluk kuralından etkilenmesin diye
// aria-label ile sabitlenir (spec 0014 R3).
const hapKabi = { display: "flex", gap: 2, background: "var(--n150, #f1f5f9)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: 3, flexWrap: "wrap" };
const hapKabiIcerik = { ...hapKabi, display: "inline-flex", maxWidth: "100%", boxSizing: "border-box" };
const cerceveKabi = { display: "flex", gap: 6 };
const hapDugme = (aktif, disabled) => ({
  flex: "1 1 0", border: "none", borderRadius: 6, padding: "7px 10px", fontSize: 12.5, cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap",
  background: aktif ? "var(--surface, #ffffff)" : "transparent", color: aktif ? "var(--orTx, #c2410c)" : "var(--n500, #64748b)",
  fontWeight: aktif ? 700 : 600, boxShadow: aktif ? "0 1px 2px rgba(15,23,42,.12)" : "none",
});
const cerceveDugme = (aktif, disabled) => ({
  flex: 1, padding: "6px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
  border: `1px solid ${aktif ? "var(--brand, #e85d1a)" : "var(--n200, #e2e8f0)"}`, background: aktif ? "var(--ambBg3, #fff7ed)" : "var(--surface, #ffffff)", color: "var(--n900, #0f172a)",
});
const gizli = { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 };
const rozet = (aktif) => ({
  display: "inline-block", marginLeft: 6, padding: "1px 7px", borderRadius: 999, fontSize: 11, fontWeight: 700, lineHeight: "16px",
  background: aktif ? "var(--ambBg3, #fff7ed)" : "var(--n200, #e2e8f0)", color: aktif ? "var(--orTx, #c2410c)" : "var(--n600, #475569)",
});
const KIP = {
  radyo: { kap: "radiogroup", dugme: (aktif) => ({ role: "radio", "aria-checked": aktif }) },
  dugme: { kap: "group", dugme: (aktif) => ({ "aria-pressed": aktif }) },
  sekme: { kap: "tablist", dugme: (aktif) => ({ role: "tab", "aria-selected": aktif }) },
};
export const Segment = ({ options, value, onChange, ariaLabel, disabled, kip = "radyo", gorunum = "hap", genislik = "esit" }) => {
  const k = KIP[kip] || KIP.radyo;
  const cerceve = gorunum === "cerceve";
  const icerik = genislik === "icerik";
  const kap = cerceve ? cerceveKabi : icerik ? hapKabiIcerik : hapKabi;
  return (
    <div role={k.kap} aria-label={ariaLabel} style={kap}>
      {options.map(o => {
        const aktif = o.value === value;
        const stil = cerceve ? cerceveDugme(aktif, disabled) : hapDugme(aktif, disabled);
        return (
          <button key={String(o.value)} type="button" disabled={disabled} {...k.dugme(aktif)}
            {...(o.sayi != null ? { "aria-label": `${o.label} (${o.sayi})` } : {})}
            onClick={() => onChange(o.value)} style={icerik ? { ...stil, flex: "0 0 auto" } : stil}>
            {o.label}
            {o.sayi != null && <><span style={gizli}> (</span><span style={rozet(aktif)}>{o.sayi}</span><span style={gizli}>)</span></>}
          </button>
        );
      })}
    </div>
  );
};

// ── Başlıklı kart bölüm ──────────────────────────────────────────────────────
// varyant "ayar" (varsayılan): Ayarlar bölümü; gölgeli, 24 dolgu, 720 px sınır (wide ile tam genişlik), ikonlu koyu
// başlık, isteğe bağlı katlanabilir. varyant "kart": kenarlıklı, 18 dolgu, ikonsuz; başlık iki biçimde:
// baslikStili "etiket" (küçük gri büyük harf) ya da "baslik" (15 punto koyu başlık + isteğe bağlı gri alt satır).
// style yalnız "kart" kabına eklenir (yerleşim: flex, dolgu 0 gibi). Başlıksız "kart" yalnız kaptır.
// Spec 0016 (G10): "kart" da katlanabilir: collapsible + defaultOpen (iç durum) ya da denetimli acik + onAcikDegis(yeni)
// (bölümü dışarıdan açan akışlar için: odak, süzgeç). Ok (▸/▾) başlığın solunda ayrı öğededir; başlık metni kendi öğesinde
// kalır. eylemler: başlık satırının sağındaki düğmeler; tıklamaları katlanmayı tetiklemez. İkisi de verilmezse çıktı aynıdır.
const kartKabi = { background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 12, padding: 18 };
const etiketBaslik = { fontSize: 12, fontWeight: 800, color: "var(--n400, #94a3b8)", textTransform: "uppercase", letterSpacing: .6 };

// ── Kartsız bölüm başlığı (spec 0015 R4) ─────────────────────────────────────
// KartBolum'un etiket başlığı (küçük gri büyük harf), kart olmadan: form içindeki bölümler kartla çevrelenmez.
// bosluk: alt boşluk (varsayılan 14) · ust: üst boşluk (varsayılan yok; ardışık form bölümleri arasında).
export const BolumBasligi = ({ children, bosluk, ust }) => (
  <div style={{ ...etiketBaslik, ...(ust != null ? { marginTop: ust } : {}), marginBottom: bosluk ?? 14 }}>{children}</div>
);

export const KartBolum = ({
  varyant = "ayar", title, icon, children, collapsible = false, defaultOpen = false, wide = false,
  baslikStili = "etiket", altBaslik, baslikBosluk, baslikRengi = "var(--n900, #0f172a)", style, testId,
  acik, onAcikDegis, eylemler,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  if (varyant === "kart") {
    let baslik = null;
    let govde = children;
    if (collapsible || eylemler) {
      const denetimli = acik !== undefined;
      const acikMi = !collapsible || (denetimli ? !!acik : open);
      const degis = () => { if (denetimli) onAcikDegis?.(!acikMi); else setOpen(o => !o); };
      const baslikStil = baslikStili === "baslik"
        ? { fontSize: 15, fontWeight: 700, ...(baslikRengi === "inherit" ? {} : { color: baslikRengi }) }
        : etiketBaslik;
      baslik = (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: acikMi ? (baslikBosluk ?? (baslikStili === "baslik" ? 12 : 14)) : 0 }}>
          <div onClick={collapsible ? degis : undefined}
            style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, cursor: collapsible ? "pointer" : "default", userSelect: collapsible ? "none" : "auto" }}>
            {collapsible && <span aria-hidden="true" style={{ fontSize: 10, color: "var(--n400, #94a3b8)" }}>{acikMi ? "▾" : "▸"}</span>}
            <div>
              {title && <div style={baslikStil}>{title}</div>}
              {altBaslik && baslikStili === "baslik" && <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>{altBaslik}</div>}
            </div>
          </div>
          {eylemler && <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>{eylemler}</div>}
        </div>
      );
      if (!acikMi) govde = null;
    } else if (title && baslikStili === "baslik") {
      baslik = (
        <div style={{ marginBottom: baslikBosluk ?? 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, ...(baslikRengi === "inherit" ? {} : { color: baslikRengi }) }}>{title}</div>
          {altBaslik && <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>{altBaslik}</div>}
        </div>
      );
    } else if (title) {
      baslik = <BolumBasligi bosluk={baslikBosluk}>{title}</BolumBasligi>;
    }
    return <div style={style ? { ...kartKabi, ...style } : kartKabi} data-testid={testId}>{baslik}{govde}</div>;
  }
  const ayarAcik = !collapsible || open;
  return (
    <div data-testid={testId} style={{ background: "var(--surface, #ffffff)", borderRadius: 12, padding: ayarAcik ? 24 : "18px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", marginBottom: 20, maxWidth: wide ? "100%" : 720 }}>
      <div
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
        style={{ fontWeight: 700, fontSize: 16, color: "var(--n900, #0f172a)", marginBottom: ayarAcik ? 16 : 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: collapsible ? "pointer" : "default", userSelect: collapsible ? "none" : "auto" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--brand, #e85d1a)" }}><Icon name={icon} size={18} /></span>{title}
        </span>
        {collapsible && <span style={{ fontSize: 12, color: "var(--n400, #94a3b8)" }}>{open ? "▾" : "▸"}</span>}
      </div>
      {ayarAcik && children}
    </div>
  );
};

// ── Boş durum kutusu ─────────────────────────────────────────────────────────
// Listelenecek kayıt yokken tablonun yerine (spec 0016 R1: kayıt yokken tablo ve başlık satırı çizilmez); kesikli kenarlık,
// ortalanmış başlık + isteğe bağlı açıklama + isteğe bağlı eylemler. Açıklama boşsa satırı hiç çizilmez (spec 0016 G1).
export const BosDurum = ({ baslik, metin, eylemler, testId }) => (
  <div style={{ border: "1.5px dashed var(--n300, #cbd5e1)", borderRadius: 12, padding: "32px 20px", textAlign: "center", background: "var(--surface, #ffffff)" }} data-testid={testId}>
    <div style={{ fontSize: 16, fontWeight: 800, marginBottom: metin ? 6 : 0 }}>{baslik}</div>
    {metin && <div style={{ fontSize: 13, color: "var(--n600, #475569)", maxWidth: 460, margin: "0 auto", lineHeight: 1.55 }}>{metin}</div>}
    {eylemler && <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>{eylemler}</div>}
  </div>
);

// ── Uyarı şeridi ─────────────────────────────────────────────────────────────
// aile: "bilgi" (mavi) · "uyari" (amber) · "basari" (yeşil) · "hata" (kırmızı, spec 0016 G4: ekran düzeyindeki hata ve
// tükenme mesajları). Tanımsız değer bilgi ailesine düşer (R10). Alan hatası için yine HataMetni.
// İki biçim (spec 0011): varsayılan kalın başlık + isteğe bağlı açıklama satırı; ya da children ile serbest içerik
// (cümle içi vurgu için, metin rengi ailenin 800 tonu). children çizilebilir bir değerse serbest içerik çizilir ve
// baslik/metin yok sayılır. Kap (zemin, kenarlık, dolgu, role, kimlik) iki biçimde aynıdır.
// [başlık rengi, zemin, kenarlık, serbest içerik metin rengi]
const AILELER = {
  bilgi: ["var(--blu700, #1d4ed8)", "var(--bluBg, #eff6ff)", "var(--bluBr, #bfdbfe)", "var(--blu800, #1e40af)"],
  uyari: ["var(--amb700, #b45309)", "var(--ambBg, #fffbeb)", "var(--ambBr, #fde68a)", "var(--amb800, #92400e)"],
  basari: ["var(--grn700, #15803d)", "var(--grnBg, #f0fdf4)", "var(--grnBr, #bbf7d0)", "var(--grn800, #065f46)"],
  hata: ["var(--red700, #b91c1c)", "var(--redBg, #fef2f2)", "var(--redBr, #fecaca)", "var(--red800, #991b1b)"],
};
const cizilebilir = (c) => c != null && c !== false && c !== "";
export const UyariSeridi = ({ aile = "bilgi", baslik, metin, testId, children }) => {
  const r = AILELER[aile] || AILELER.bilgi;
  const serbest = cizilebilir(children);
  const kap = { background: r[1], border: `1px solid ${r[2]}`, borderRadius: 10, padding: "10px 14px", fontSize: 13 };
  return (
    <div role="status" data-testid={testId} style={serbest ? { ...kap, color: r[3] } : kap}>
      {serbest ? children : <><b style={{ color: r[0] }}>{baslik}</b>{metin && <div style={{ marginTop: 2, color: "var(--n700, #334155)" }}>{metin}</div>}</>}
    </div>
  );
};

// ── Hata metni ve ipucu ──────────────────────────────────────────────────────
// Alanın hemen altında. Boş içerikte hiç çizilmez.
export const HataMetni = ({ children }) => children ? (
  <div role="alert" style={{ fontSize: 12, color: "var(--red700, #b91c1c)", fontWeight: 600, marginTop: 4 }}>{children}</div>
) : null;
export const Ipucu = ({ children }) => children ? (
  <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 4, lineHeight: 1.45 }}>{children}</div>
) : null;
