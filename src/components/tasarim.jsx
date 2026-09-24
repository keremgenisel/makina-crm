import { useState } from "react";
import { Icon } from "./ui";

// Tasarım sözlüğü (spec 0009): uygulamanın paylaşılan altı yapı taşı. Ne zaman hangisinin kullanılacağı
// docs/tasarim-sozlugu.md'de yazılı; yeni bir ekran bu dosyadan beslenir, yerel kopya yazmaz.
// Stil değerleri taşındıkları ekranların bugünkü değerlerinin birebir kopyasıdır (R7: görünüm değişmez).
// Kimlik (data-testid) her zaman çağırandan gelir (R9).

// ── Segmentli seçici ─────────────────────────────────────────────────────────
// kip: "radyo" → radiogroup + radio + aria-checked (varsayılan) · "dugme" → group + aria-pressed.
// gorunum: "hap" → gri zemin üstünde beyaz aktif hap, satır sarar (varsayılan) · "cerceve" → çerçeveli düğmeler,
// seçili olan marka kenarlıklı ve açık turuncu zeminli.
const hapKabi = { display: "flex", gap: 2, background: "var(--n150, #f1f5f9)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: 3, flexWrap: "wrap" };
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
export const Segment = ({ options, value, onChange, ariaLabel, disabled, kip = "radyo", gorunum = "hap" }) => {
  const radyo = kip !== "dugme";
  const cerceve = gorunum === "cerceve";
  return (
    <div role={radyo ? "radiogroup" : "group"} aria-label={ariaLabel} style={cerceve ? cerceveKabi : hapKabi}>
      {options.map(o => {
        const aktif = o.value === value;
        return (
          <button key={String(o.value)} type="button" disabled={disabled}
            {...(radyo ? { role: "radio", "aria-checked": aktif } : { "aria-pressed": aktif })}
            onClick={() => onChange(o.value)} style={cerceve ? cerceveDugme(aktif, disabled) : hapDugme(aktif, disabled)}>
            {o.label}
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
const kartKabi = { background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 12, padding: 18 };
const etiketBaslik = { fontSize: 12, fontWeight: 800, color: "var(--n400, #94a3b8)", textTransform: "uppercase", letterSpacing: .6 };

export const KartBolum = ({
  varyant = "ayar", title, icon, children, collapsible = false, defaultOpen = false, wide = false,
  baslikStili = "etiket", altBaslik, baslikBosluk, baslikRengi = "var(--n900, #0f172a)", style, testId,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  if (varyant === "kart") {
    let baslik = null;
    if (title && baslikStili === "baslik") {
      baslik = (
        <div style={{ marginBottom: baslikBosluk ?? 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, ...(baslikRengi === "inherit" ? {} : { color: baslikRengi }) }}>{title}</div>
          {altBaslik && <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>{altBaslik}</div>}
        </div>
      );
    } else if (title) {
      baslik = <div style={{ ...etiketBaslik, marginBottom: baslikBosluk ?? 14 }}>{title}</div>;
    }
    return <div style={style ? { ...kartKabi, ...style } : kartKabi} data-testid={testId}>{baslik}{children}</div>;
  }
  const acik = !collapsible || open;
  return (
    <div data-testid={testId} style={{ background: "var(--surface, #ffffff)", borderRadius: 12, padding: acik ? 24 : "18px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", marginBottom: 20, maxWidth: wide ? "100%" : 720 }}>
      <div
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
        style={{ fontWeight: 700, fontSize: 16, color: "var(--n900, #0f172a)", marginBottom: acik ? 16 : 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: collapsible ? "pointer" : "default", userSelect: collapsible ? "none" : "auto" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--brand, #e85d1a)" }}><Icon name={icon} size={18} /></span>{title}
        </span>
        {collapsible && <span style={{ fontSize: 12, color: "var(--n400, #94a3b8)" }}>{open ? "▾" : "▸"}</span>}
      </div>
      {acik && children}
    </div>
  );
};

// ── Boş durum kutusu ─────────────────────────────────────────────────────────
// Listelenecek kayıt yokken sıfır tutarlı tablo yerine; kesikli kenarlık, ortalanmış başlık + açıklama + isteğe bağlı eylemler.
export const BosDurum = ({ baslik, metin, eylemler, testId }) => (
  <div style={{ border: "1.5px dashed var(--n300, #cbd5e1)", borderRadius: 12, padding: "32px 20px", textAlign: "center", background: "var(--surface, #ffffff)" }} data-testid={testId}>
    <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{baslik}</div>
    <div style={{ fontSize: 13, color: "var(--n600, #475569)", maxWidth: 460, margin: "0 auto", lineHeight: 1.55 }}>{metin}</div>
    {eylemler && <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>{eylemler}</div>}
  </div>
);

// ── Uyarı şeridi ─────────────────────────────────────────────────────────────
// aile: "bilgi" (mavi) · "uyari" (amber) · "basari" (yeşil). Tanımsız değer bilgi ailesine düşer (R10).
// Hata (kırmızı) ailesi yoktur; alan hatası için HataMetni.
// İki biçim (spec 0011): varsayılan kalın başlık + isteğe bağlı açıklama satırı; ya da children ile serbest içerik
// (cümle içi vurgu için, metin rengi ailenin 800 tonu). children çizilebilir bir değerse serbest içerik çizilir ve
// baslik/metin yok sayılır. Kap (zemin, kenarlık, dolgu, role, kimlik) iki biçimde aynıdır.
// [başlık rengi, zemin, kenarlık, serbest içerik metin rengi]
const AILELER = {
  bilgi: ["var(--blu700, #1d4ed8)", "var(--bluBg, #eff6ff)", "var(--bluBr, #bfdbfe)", "var(--blu800, #1e40af)"],
  uyari: ["var(--amb700, #b45309)", "var(--ambBg, #fffbeb)", "var(--ambBr, #fde68a)", "var(--amb800, #92400e)"],
  basari: ["var(--grn700, #15803d)", "var(--grnBg, #f0fdf4)", "var(--grnBr, #bbf7d0)", "var(--grn800, #065f46)"],
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
