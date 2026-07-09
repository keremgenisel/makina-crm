import { useState } from "react";
import { Btn } from "../ui";
import { Section } from "./Section";

const TARGET_PX = 250;
const TARGET_PX_KASE = 300;

const recompressDataUrl = (dataUrl, maxPx, isKase = false) =>
  new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith("data:image")) { resolve(dataUrl); return; }
    const img = new Image();
    img.onload = () => {
      const limit = isKase ? TARGET_PX_KASE : maxPx;
      const scale = Math.min(1, limit / Math.max(img.width, img.height, 1));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      const webp = canvas.toDataURL("image/webp", isKase ? 0.85 : 0.80);
      resolve(webp.startsWith("data:image/webp")
        ? webp
        : canvas.toDataURL(isKase ? "image/png" : "image/jpeg", 0.72));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

const kb = (str) => (str ? Math.round(str.length / 1024) : 0);

// Resimleri kategori kırılımına ayırır (özet kutusundaki renkli sayaçlar için).
// analyze VE optimize ikisi de bunu kullanır — optimize eskiden groups'suz stats yazıp
// render'da Object.entries(undefined) ile çökmeye yol açıyordu (Analiz Et'e basılmadan
// doğrudan Optimize Et'e basınca).
const buildGroups = (imgs) => ({
  "Makina modeli": imgs.filter(i => i.key === "customModel" || i.key === "standardModel"),
  "Kalıp": imgs.filter(i => i.key === "kalip"),
  "Parça/Yedek parça": imgs.filter(i => i.key === "part"),
  "Kaşe/İmza": imgs.filter(i => i.key === "kase"),
});

const collectImages = (customModels, standardModels, kalipDefs, parts, appSettings) => {
  const imgs = [];
  customModels.forEach(m => { if (m.resim) imgs.push({ key: "customModel", id: m.model, isKase: false, dataUrl: m.resim }); });
  standardModels.forEach(m => { if (m.resim) imgs.push({ key: "standardModel", id: m.model, isKase: false, dataUrl: m.resim }); });
  kalipDefs.forEach(k => { if (k.resim) imgs.push({ key: "kalip", id: k.id, isKase: false, dataUrl: k.resim }); });
  parts.forEach(p => { if (p.resim) imgs.push({ key: "part", id: p.id, isKase: false, dataUrl: p.resim }); });
  if (appSettings?.kaseResmi) imgs.push({ key: "kase", id: "kase", isKase: true, dataUrl: appSettings.kaseResmi });
  return imgs;
};

export const SettingsOptimize = ({
  customModels = [], setCustomModels = () => {},
  standardModels = [], setStandardModels = () => {},
  kalipDefs = [], setKalipDefs = () => {},
  parts = [], setParts = () => {},
  appSettings = {}, setAppSettings = () => {},
  flash = () => {},
}) => {
  const [phase, setPhase] = useState("idle"); // "idle" | "optimizing" | "done"
  const [stats, setStats] = useState(null);

  const analyze = () => {
    const imgs = collectImages(customModels, standardModels, kalipDefs, parts, appSettings);
    setStats({ imgs, groups: buildGroups(imgs), beforeKb: imgs.reduce((s, i) => s + kb(i.dataUrl), 0), afterKb: null });
  };

  const optimize = async () => {
    const imgs = collectImages(customModels, standardModels, kalipDefs, parts, appSettings);
    if (!imgs.length) { flash("ok", "Optimize edilecek resim bulunamadı."); return; }
    setPhase("optimizing");
    const beforeKb = imgs.reduce((s, i) => s + kb(i.dataUrl), 0);

    const recompressed = await Promise.all(
      imgs.map(i => recompressDataUrl(i.dataUrl, TARGET_PX, i.isKase).then(result => ({ ...i, result })))
    );

    const customMap = new Map(), standardMap = new Map(), kalipMap = new Map(), partMap = new Map();
    let newKase = appSettings.kaseResmi;
    recompressed.forEach(({ key, id, result }) => {
      if (key === "customModel") customMap.set(id, result);
      else if (key === "standardModel") standardMap.set(id, result);
      else if (key === "kalip") kalipMap.set(id, result);
      else if (key === "part") partMap.set(id, result);
      else if (key === "kase") newKase = result;
    });

    if (customMap.size) setCustomModels(p => p.map(m => customMap.has(m.model) ? { ...m, resim: customMap.get(m.model) } : m));
    if (standardMap.size) setStandardModels(p => p.map(m => standardMap.has(m.model) ? { ...m, resim: standardMap.get(m.model) } : m));
    if (kalipMap.size) setKalipDefs(p => p.map(k => kalipMap.has(k.id) ? { ...k, resim: kalipMap.get(k.id) } : k));
    if (partMap.size) setParts(p => p.map(x => partMap.has(x.id) ? { ...x, resim: partMap.get(x.id) } : x));
    if (newKase !== appSettings.kaseResmi) setAppSettings(p => ({ ...p, kaseResmi: newKase }));

    const afterKb = recompressed.reduce((s, i) => s + kb(i.result), 0);
    const savedKb = beforeKb - afterKb;
    const pct = beforeKb > 0 ? Math.round(savedKb / beforeKb * 100) : 0;
    setPhase("done");
    // Tam stats yaz (groups dahil) — s null olsa bile (Analiz Et'e basılmadan) groups eksik kalmasın.
    setStats({ imgs, groups: buildGroups(imgs), beforeKb, afterKb, savedKb, pct });
    flash("ok", `${imgs.length} resim optimize edildi, ${savedKb} KB tasarruf (%${pct}).`);
  };

  const groupColor = { "Makina modeli": "#3b82f6", "Kalıp": "#8b5cf6", "Parça/Yedek parça": "#f59e0b", "Kaşe/İmza": "#e85d1a" };

  return (
    <Section title="Resim Optimizasyonu" icon="settings">
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
        Makina modeli, kalıp, parça ve kaşe resimlerini WebP formatına dönüştürür, boyutlarını küçültür.
        Yeni yüklenen resimler zaten optimize edilir; bu araç mevcut eski resimlere de uygular.
      </div>

      {stats && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 18px", marginBottom: 16, fontSize: 13 }}>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: stats.afterKb != null ? 12 : 0 }}>
            {Object.entries(stats.groups || {}).map(([label, list]) => list.length > 0 && (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: groupColor[label], flexShrink: 0 }} />
                <span style={{ color: "#475569" }}>{label}:</span>
                <span style={{ fontWeight: 700 }}>{list.length} resim</span>
                <span style={{ color: "#94a3b8" }}>({list.reduce((s, i) => s + kb(i.dataUrl), 0)} KB)</span>
              </div>
            ))}
          </div>
          {stats.imgs.length === 0 && <div style={{ color: "#94a3b8" }}>Kayıtlı resim bulunamadı.</div>}
          {stats.imgs.length > 0 && stats.afterKb == null && (
            <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px solid #e2e8f0", color: "#475569" }}>
              Toplam: <b>{stats.beforeKb} KB</b> — Optimize Et'e basarak küçültün.
            </div>
          )}
          {stats.afterKb != null && (
            <div style={{ paddingTop: 10, borderTop: "1px solid #e2e8f0" }}>
              <span style={{ color: "#64748b" }}>{stats.beforeKb} KB</span>
              <span style={{ margin: "0 8px", color: "#94a3b8" }}>→</span>
              <span style={{ fontWeight: 700, color: "#16a34a" }}>{stats.afterKb} KB</span>
              <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 700, color: "#16a34a", background: "#dcfce7", borderRadius: 6, padding: "2px 8px" }}>
                {stats.savedKb} KB tasarruf (%{stats.pct})
              </span>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="ghost" onClick={analyze} disabled={phase === "optimizing"}>Analiz Et</Btn>
        <Btn onClick={optimize} disabled={phase === "optimizing"}>
          {phase === "optimizing" ? "Optimize ediliyor..." : phase === "done" ? "Tekrar Optimize Et" : "Optimize Et"}
        </Btn>
      </div>
    </Section>
  );
};
