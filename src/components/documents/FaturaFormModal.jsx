import { uid, parseMoney, numberToWordsEN } from "../../lib/utils";
import { COUNTRIES, CURRENCIES } from "../../lib/constants";
import { Icon, Field, Btn, Modal, LockConflict } from "../ui";

const inputStyle = { width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "var(--n100, #f8fafc)", outline: "none" };

const calcFaturaTotal = (f) =>
  (f?.satirlar || []).reduce((s, r) => s + (parseMoney(r.birimFiyat) || 0) * (parseFloat(r.adet) || 0), 0);

export const FaturaFormModal = ({
  faturaForm,
  setFaturaForm,
  faturaLock,
  forceFaturaLock,
  saveFatura,
  faturaCityList,
  fetchFaturaRate,
  appSettings,
  allModels,
  kalipDefs = [],
  parts = [],
  draftBar = null,
}) => {
  const fCfg = appSettings?.evrakFormConfig?.fatura;
  const isFH = (section, key) => (fCfg?.hiddenFields?.[section] || []).includes(key);
  const fatCFs = fCfg?.customFields || [];

  return (
    <Modal wide maxWidth={1100} maxHeight="90vh"
      title={faturaForm.id ? "Faturayı Düzenle" : "Yeni Yurt Dışı Fatura"}
      onClose={() => setFaturaForm(null)}>
      {(faturaLock && faturaForm.id) ? (
        <LockConflict lockedBy={faturaLock.lockedBy} lockedAt={faturaLock.lockedAt}
          onForce={forceFaturaLock} onCancel={() => setFaturaForm(null)} />
      ) : <>
      {draftBar}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Sol: Alıcı bilgileri */}
        <div style={{ background: "var(--surface, #ffffff)", borderRadius: 12, border: "1px solid var(--n200, #e2e8f0)", padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--n400, #94a3b8)", textTransform: "uppercase", letterSpacing: .6, marginBottom: 14 }}>Alıcı Bilgileri</div>
          <Field label="Firma Adı"><input value={faturaForm.firma} onChange={e => setFaturaForm(p => ({ ...p, firma: e.target.value }))} style={inputStyle} /></Field>
          {!isFH("alici", "adres") && <Field label="Adres"><textarea value={faturaForm.adres} onChange={e => setFaturaForm(p => ({ ...p, adres: e.target.value }))} style={{ ...inputStyle, resize: "vertical", minHeight: 54 }} /></Field>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {!isFH("alici", "ulke") && <Field label="Ülke">
              <select value={faturaForm.ulke} onChange={e => setFaturaForm(p => ({ ...p, ulke: e.target.value, sehir: "" }))} style={inputStyle}>
                <option value="">Seçiniz</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>}
            {!isFH("alici", "sehir") && <Field label="Şehir">
              {faturaCityList.length > 0 ? (
                <select value={faturaForm.sehir} onChange={e => setFaturaForm(p => ({ ...p, sehir: e.target.value }))} style={inputStyle}>
                  <option value="">Seçiniz</option>
                  {faturaCityList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <input value={faturaForm.sehir} onChange={e => setFaturaForm(p => ({ ...p, sehir: e.target.value }))} style={inputStyle} />
              )}
            </Field>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {!isFH("alici", "vatId") && <Field label="Uluslararası Vergi No (VAT ID)"><input value={faturaForm.vatId} onChange={e => setFaturaForm(p => ({ ...p, vatId: e.target.value }))} style={inputStyle} placeholder="EU123456789" /></Field>}
            {!isFH("alici", "localTaxNo") && <Field label="Yerel Vergi No"><input value={faturaForm.localTaxNo} onChange={e => setFaturaForm(p => ({ ...p, localTaxNo: e.target.value }))} style={inputStyle} /></Field>}
          </div>
          {fatCFs.filter(cf => cf.section === "alici").map(cf => (
            <Field key={cf.id} label={cf.label.TR || cf.label.EN}>
              {cf.type === "select" ? (
                <select value={faturaForm[`_cf_${cf.id}`] || cf.defaultValue || ""} onChange={e => setFaturaForm(p => ({ ...p, [`_cf_${cf.id}`]: e.target.value }))} style={inputStyle}>
                  <option value="">Seçiniz</option>
                  {(cf.options || []).map((o, i) => <option key={i} value={o.TR}>{o.TR}</option>)}
                </select>
              ) : (
                <input value={faturaForm[`_cf_${cf.id}`] ?? cf.defaultValue ?? ""} onChange={e => setFaturaForm(p => ({ ...p, [`_cf_${cf.id}`]: e.target.value }))} style={inputStyle}
                  list={cf.suggestions ? `cf-sug-${cf.id}` : undefined} />
              )}
              {cf.suggestions && <datalist id={`cf-sug-${cf.id}`}>{cf.suggestions.split(",").map(s => <option key={s.trim()} value={s.trim()} />)}</datalist>}
            </Field>
          ))}
        </div>

        {/* Sağ: Fatura bilgileri */}
        <div style={{ background: "var(--surface, #ffffff)", borderRadius: 12, border: "1px solid var(--n200, #e2e8f0)", padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--n400, #94a3b8)", textTransform: "uppercase", letterSpacing: .6, marginBottom: 14 }}>Fatura Bilgileri</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Fatura No"><input value={faturaForm.no} onChange={e => setFaturaForm(p => ({ ...p, no: e.target.value }))} style={inputStyle} placeholder="INV-2024-001" /></Field>
            <Field label="Tarih"><input type="date" value={faturaForm.tarih} onChange={e => setFaturaForm(p => ({ ...p, tarih: e.target.value }))} style={inputStyle} /></Field>
          </div>
          <Field label="Para Birimi">
            <select value={faturaForm.currency} onChange={e => { const cur = e.target.value; setFaturaForm(p => ({ ...p, currency: cur })); fetchFaturaRate(cur); }} style={inputStyle}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          {!isFH("belge", "payment") && <Field label="Ödeme Şekli"><input value={faturaForm.payment} onChange={e => setFaturaForm(p => ({ ...p, payment: e.target.value }))} style={inputStyle} placeholder="T/T in advance" /></Field>}
          {!isFH("belge", "delivery") && <Field label="Teslim Şekli"><input value={faturaForm.delivery} onChange={e => setFaturaForm(p => ({ ...p, delivery: e.target.value }))} style={inputStyle} placeholder="CIF Istanbul" /></Field>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {!isFH("belge", "gtipNo") && <Field label="GTİP No"><input value={faturaForm.gtipNo} onChange={e => setFaturaForm(p => ({ ...p, gtipNo: e.target.value }))} style={inputStyle} placeholder="8438.10.90" /></Field>}
            {!isFH("belge", "origin") && <Field label="Menşei"><input value={faturaForm.origin} onChange={e => setFaturaForm(p => ({ ...p, origin: e.target.value }))} style={inputStyle} placeholder="Türkiye" /></Field>}
          </div>
          {!isFH("belge", "kur") && <Field label="Döviz Kuru"><input value={faturaForm.kur} onChange={e => setFaturaForm(p => ({ ...p, kur: e.target.value }))} style={inputStyle} placeholder="1 USD = 32.50 TRY" /></Field>}
          {fatCFs.filter(cf => cf.section === "belge").map(cf => (
            <Field key={cf.id} label={cf.label.TR || cf.label.EN}>
              {cf.type === "select" ? (
                <select value={faturaForm[`_cf_${cf.id}`] || cf.defaultValue || ""} onChange={e => setFaturaForm(p => ({ ...p, [`_cf_${cf.id}`]: e.target.value }))} style={inputStyle}>
                  <option value="">Seçiniz</option>
                  {(cf.options || []).map((o, i) => <option key={i} value={o.TR}>{o.TR}</option>)}
                </select>
              ) : (
                <input value={faturaForm[`_cf_${cf.id}`] ?? cf.defaultValue ?? ""} onChange={e => setFaturaForm(p => ({ ...p, [`_cf_${cf.id}`]: e.target.value }))} style={inputStyle}
                  list={cf.suggestions ? `cf-sug-${cf.id}` : undefined} />
              )}
              {cf.suggestions && <datalist id={`cf-sug-${cf.id}`}>{cf.suggestions.split(",").map(s => <option key={s.trim()} value={s.trim()} />)}</datalist>}
            </Field>
          ))}
        </div>
      </div>

      {/* Satırlar */}
      <div style={{ background: "var(--surface, #ffffff)", borderRadius: 12, border: "1px solid var(--n200, #e2e8f0)", padding: 18, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--n400, #94a3b8)", textTransform: "uppercase", letterSpacing: .6, marginBottom: 12 }}>Ürünler</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--n100, #f8fafc)" }}>
              {["Ürün Seç", "KOD", "Ürün Adı", "Tanım", "Seri No", "Adet", `Birim Fiyat (${faturaForm.currency})`, "Tutar", ""].map((h, i) => (
                <th key={i} style={{ padding: "6px 8px", textAlign: i >= 5 && i <= 7 ? "center" : "left", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(faturaForm.satirlar || []).map((r, idx) => {
              const tutar = (parseMoney(r.birimFiyat) || 0) * (parseFloat(r.adet) || 0);
              const upd = (patch) => setFaturaForm(p => ({ ...p, satirlar: p.satirlar.map((s, i) => i === idx ? { ...s, ...patch } : s) }));
              return (
                <tr key={r.id || idx} style={{ borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                  <td style={{ padding: "6px 8px", width: 150 }}>
                    {/* Teklif formundaki gibi iki aşamalı seçim: önce tür, sonra o türün listesi */}
                    <select value={r.urunTip || ""} onChange={e => upd({ urunTip: e.target.value, urunKey: "" })}
                      style={{ ...inputStyle, padding: "6px 8px", marginBottom: 4 }}>
                      <option value="">— Tür Seç —</option>
                      <option value="makina">Makina</option>
                      <option value="kalip">Kalıp</option>
                      <option value="parca">Yedek Parça</option>
                    </select>
                    {r.urunTip === "makina" && (
                      <select value={r.urunKey || ""} onChange={e => {
                        const key = e.target.value;
                        if (!key) { upd({ urunKey: "" }); return; }
                        // Seçim kod/ad/tanım/resim alanlarını EN öncelikli doldurur; hepsi elle düzenlenebilir
                        const m = allModels.find(x => `makina::${x.model}` === key);
                        if (m) upd({ urunKey: key, model: m.model, aciklama: m.urunAdiEN || m.urunAdi || m.model, tanim: m.tanimEN || m.tanim || "", resim: m.resim || "" });
                      }} style={{ ...inputStyle, padding: "6px 8px" }}>
                        <option value="">— Model Seç —</option>
                        {allModels.map(m => <option key={`m${m.model}`} value={`makina::${m.model}`}>{m.model}</option>)}
                      </select>
                    )}
                    {r.urunTip === "kalip" && (
                      <select value={r.urunKey || ""} onChange={e => {
                        const key = e.target.value;
                        if (!key) { upd({ urunKey: "" }); return; }
                        const k = kalipDefs.find(x => `kalip::${x.ad}` === key);
                        if (k) upd({ urunKey: key, model: k.kod || "", aciklama: k.urunAdiEN || k.urunAdi || k.ad, tanim: k.tanimEN || k.tanim || "", resim: k.resim || "" });
                      }} style={{ ...inputStyle, padding: "6px 8px" }}>
                        <option value="">— Kalıp Seç —</option>
                        {kalipDefs.map(k => <option key={`k${k.id ?? k.ad}`} value={`kalip::${k.ad}`}>{k.ad}</option>)}
                      </select>
                    )}
                    {r.urunTip === "parca" && (
                      <select value={r.urunKey || ""} onChange={e => {
                        const key = e.target.value;
                        if (!key) { upd({ urunKey: "" }); return; }
                        const pt = parts.find(x => `parca::${x.id}` === key);
                        if (pt) upd({ urunKey: key, model: pt.kod || "", aciklama: pt.adEN || pt.ad || "", tanim: pt.tanimEN || pt.tanim || "", resim: pt.resim || "" });
                      }} style={{ ...inputStyle, padding: "6px 8px" }}>
                        <option value="">— Yedek Parça Seç —</option>
                        {parts.map(pt => <option key={`p${pt.id}`} value={`parca::${pt.id}`}>{pt.ad}</option>)}
                      </select>
                    )}
                  </td>
                  <td style={{ padding: "6px 8px", width: 90 }}>
                    <input value={r.model || ""} onChange={e => upd({ model: e.target.value })}
                      style={{ ...inputStyle, padding: "6px 8px", fontFamily: "monospace" }} placeholder="KOD" />
                  </td>
                  <td style={{ padding: "6px 8px", minWidth: 150 }}>
                    <input value={r.aciklama} onChange={e => upd({ aciklama: e.target.value })}
                      style={{ ...inputStyle, padding: "6px 8px" }} placeholder="Ürün adı (İngilizce)" />
                  </td>
                  <td style={{ padding: "6px 8px", minWidth: 150 }}>
                    <textarea value={r.tanim || ""} onChange={e => upd({ tanim: e.target.value })} rows={2}
                      style={{ ...inputStyle, padding: "6px 8px", resize: "vertical", fontFamily: "inherit" }} placeholder="Tanım (İngilizce)" />
                  </td>
                  <td style={{ padding: "6px 8px", width: 90 }}>
                    <input value={r.seriNo || ""} onChange={e => upd({ seriNo: e.target.value })}
                      style={{ ...inputStyle, padding: "6px 8px" }} placeholder="S/N" />
                  </td>
                  <td style={{ padding: "6px 8px", width: 56 }}>
                    <input type="number" min="1" value={r.adet} onChange={e => upd({ adet: e.target.value })}
                      style={{ ...inputStyle, padding: "6px 8px", textAlign: "center" }} />
                  </td>
                  <td style={{ padding: "6px 8px", width: 110 }}>
                    <input value={r.birimFiyat} onChange={e => upd({ birimFiyat: e.target.value })}
                      style={{ ...inputStyle, padding: "6px 8px", textAlign: "right" }} placeholder="0" />
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "right", width: 100, fontSize: 13, fontWeight: 600, color: "var(--n900, #0f172a)" }}>
                    {tutar > 0 ? tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                  </td>
                  <td style={{ padding: "6px 8px", width: 32 }}>
                    <button onClick={() => setFaturaForm(p => ({ ...p, satirlar: p.satirlar.filter((_, i) => i !== idx) }))}
                      style={{ background: "none", border: "none", color: "var(--red500, #ef4444)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button onClick={() => setFaturaForm(p => ({ ...p, satirlar: [...(p.satirlar || []), { id: uid(), urunKey: "", urunTip: "", model: "", aciklama: "", tanim: "", seriNo: "", adet: "1", birimFiyat: "" }] }))}
          style={{ marginTop: 10, fontSize: 13, color: "#e85d1a", fontWeight: 600, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <Icon name="plus" size={13} /> Satır Ekle
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Sol: Paketleme + Not */}
        <div style={{ background: "var(--surface, #ffffff)", borderRadius: 12, border: "1px solid var(--n200, #e2e8f0)", padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--n400, #94a3b8)", textTransform: "uppercase", letterSpacing: .6, marginBottom: 14 }}>Paketleme</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {!isFH("paketleme", "paketAdedi") && <Field label="Paket Adedi"><input value={faturaForm.paketAdedi} onChange={e => setFaturaForm(p => ({ ...p, paketAdedi: e.target.value }))} style={inputStyle} /></Field>}
            {!isFH("paketleme", "brutAgirlik") && <Field label="Brüt Ağırlık"><input value={faturaForm.brutAgirlik} onChange={e => setFaturaForm(p => ({ ...p, brutAgirlik: e.target.value }))} style={inputStyle} /></Field>}
            {!isFH("paketleme", "olculer") && <Field label="Ölçüler (CM)"><input value={faturaForm.olculer} onChange={e => setFaturaForm(p => ({ ...p, olculer: e.target.value }))} style={inputStyle} /></Field>}
          </div>
          {!isFH("paketleme", "not") && <Field label="Not"><textarea value={faturaForm.not} onChange={e => setFaturaForm(p => ({ ...p, not: e.target.value }))} style={{ ...inputStyle, resize: "vertical", minHeight: 54 }} /></Field>}
          {fatCFs.filter(cf => cf.section === "paketleme").map(cf => (
            <Field key={cf.id} label={cf.label.TR || cf.label.EN}>
              {cf.type === "select" ? (
                <select value={faturaForm[`_cf_${cf.id}`] || cf.defaultValue || ""} onChange={e => setFaturaForm(p => ({ ...p, [`_cf_${cf.id}`]: e.target.value }))} style={inputStyle}>
                  <option value="">Seçiniz</option>
                  {(cf.options || []).map((o, i) => <option key={i} value={o.TR}>{o.TR}</option>)}
                </select>
              ) : (
                <input value={faturaForm[`_cf_${cf.id}`] ?? cf.defaultValue ?? ""} onChange={e => setFaturaForm(p => ({ ...p, [`_cf_${cf.id}`]: e.target.value }))} style={inputStyle}
                  list={cf.suggestions ? `cf-sug-${cf.id}` : undefined} />
              )}
              {cf.suggestions && <datalist id={`cf-sug-${cf.id}`}>{cf.suggestions.split(",").map(s => <option key={s.trim()} value={s.trim()} />)}</datalist>}
            </Field>
          ))}
        </div>
        {/* Sağ: Banka bilgileri + Toplam */}
        <div style={{ background: "var(--surface, #ffffff)", borderRadius: 12, border: "1px solid var(--n200, #e2e8f0)", padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--n400, #94a3b8)", textTransform: "uppercase", letterSpacing: .6, marginBottom: 14 }}>Banka / Hesap Bilgileri</div>
          <div style={{ fontSize: 12, color: "var(--n500, #64748b)", padding: "10px 14px", background: "var(--n100, #f8fafc)", borderRadius: 8, border: "1px dashed var(--n200, #e2e8f0)" }}>
            Yazdırma sırasında Ayarlar &gt; Firma Bilgileri'ndeki banka hesapları otomatik eklenir.
          </div>
          <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--n100, #f8fafc)", borderRadius: 10, border: "1px solid var(--n200, #e2e8f0)", textAlign: "right" }}>
            <div style={{ fontSize: 13, color: "var(--n600, #475569)", marginBottom: 4 }}>TOTAL</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--n900, #0f172a)" }}>
              {calcFaturaTotal(faturaForm).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {faturaForm.currency}
            </div>
            <div style={{ fontSize: 11, color: "var(--n500, #64748b)", marginTop: 4, fontStyle: "italic" }}>
              {numberToWordsEN(calcFaturaTotal(faturaForm), faturaForm.currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Yapışkan kaydet çubuğu: uzun formda kaydırırken hep görünür */}
      <div className="form-footer-bar">
        <Btn variant="ghost" onClick={() => setFaturaForm(null)}>Vazgeç</Btn>
        <Btn onClick={saveFatura}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>
      </>}
    </Modal>
  );
};
