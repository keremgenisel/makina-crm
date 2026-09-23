import { tl2 } from "./GiderAlanlari";

// KDV Karşılaştırması kartı (spec 0001 R9, AC-14/15/29/38, plan K1/K10/K15). Sunumdan ibarettir:
// rakamlar kdvKarsilastir'dan gelir. Kart yalnız gider yetkisiyle çizilir (AC-30); tam ay olmayan
// aralıkta GİZLENMEZ, nedenini aralığı anarak yazar (AC-38). Mevcut "Ödenmesi Muhtemel KDV" kartı
// ayrı kalır, anlamı değişmez (K10).
export const KdvKarsilastirmaKarti = ({ durum = "tamam", sonuc, aralikEtiketi = "", kaynak = "", style, gizle = false }) => {
  // Finans ekranı tutarları "Göster"e basılana kadar gizler; kart da aynı kurala uyar.
  const para = (v) => (gizle ? "———" : tl2(v));
  const kutu = { background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 12, padding: 18, ...style };
  const baslik = (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--n900, #0f172a)" }}>KDV Karşılaştırması</div>
      {kaynak && <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>{kaynak}</div>}
    </div>
  );
  if (durum !== "tamam") {
    const metin = durum === "oncesi"
      ? `Seçili dönem (${aralikEtiketi}) gider takibinin yürürlük ayından önce. Gider verisi girilmemiş, karşılaştırma yapılamıyor.`
      : `KDV karşılaştırması ay bazlı yapılır. Seçili aralık (${aralikEtiketi}) tam ayları kapsamıyor. Tam bir ay seçin.`;
    return (
      <div style={kutu} data-testid="kdv-karsilastirma">
        {baslik}
        <div style={{ border: "1.5px dashed var(--n300, #cbd5e1)", borderRadius: 10, padding: "18px 14px", textAlign: "center", fontSize: 13, color: "var(--n600, #475569)", lineHeight: 1.55, background: "var(--n100, #f8fafc)" }}>
          <div style={{ fontWeight: 700, color: "var(--n900, #0f172a)", marginBottom: 4 }}>Bu aralık için karşılaştırma yapılamıyor</div>
          {metin}
        </div>
      </div>
    );
  }
  const satir = (a, b) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "7px 0", borderBottom: "1px solid var(--n150, #f1f5f9)" }}>
      <span style={{ color: "var(--n600, #475569)" }}>{a}</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{b}</b>
    </div>
  );
  const devreden = sonuc.devreden > 0;
  return (
    <div style={kutu} data-testid="kdv-karsilastirma">
      {baslik}
      {satir("Satışlardan hesaplanan KDV (TL)", para(sonuc.hesaplananTL))}
      {satir("Giderlerden indirilecek KDV", `− ${para(sonuc.indirilecek)}`)}
      <div style={{ marginTop: 10, background: devreden ? "var(--grnBg, #f0fdf4)" : "var(--ambBg3, #fff7ed)", border: `1px solid ${devreden ? "var(--grnBr, #bbf7d0)" : "var(--ambBr3, #fed7aa)"}`, borderRadius: 10, padding: "12px 14px" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: devreden ? "var(--grn700, #15803d)" : "var(--orTx, #c2410c)" }}>{devreden ? "Sonraki döneme devreden KDV" : "Ödenecek KDV farkı"}</div>
        <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "var(--n900, #0f172a)" }}>{para(devreden ? sonuc.devreden : sonuc.odenecek)}</div>
      </div>
      {sonuc.haricTutarlar.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--n600, #475569)", background: "var(--n100, #f8fafc)", border: "1px dashed var(--n300, #cbd5e1)", borderRadius: 8, padding: "8px 10px" }}>
          Karşılaştırmaya dahil edilmeyen hesaplanan KDV: <b>{gizle ? "———" : sonuc.haricTutarlar.map(h => `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(h.tutar)} ${h.para}`).join(", ")}</b>
        </div>
      )}
      <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 8, lineHeight: 1.5 }}>İndirilecek KDV, kalemin ödenip ödenmediğinden bağımsız olarak gider tarihine göre sayılır.</div>
    </div>
  );
};
