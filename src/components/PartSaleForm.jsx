import { useState } from "react";
import { CUR_SYM, SALE_TYPES, DEFAULT_KDV_RATES } from "../lib/constants";
import { today, aramaNormalize, fmtCur, parseMoney, calcKDV, getKdvRateForDate } from "../lib/utils";
import { Icon, Field, Input, Select, MoneyInput, Btn, Modal, SearchPick, CountryCityFields } from "./ui";

// Extra Kalıp satışı/çıkışı ekleme-düzenleme formu — Parts.jsx ve Customers.jsx (müşteri
// detayından "Extra Kalıp Satışı") tarafından paylaşılır, Services/ServiceForm ile aynı desen.
// Ekleme modunda birden çok kalıp tek seferde seçilip her birine ayrı fiyat girilebilir
// (form.kaliplar: [{ad, olcu, fiyat}]) — kaydedilince her satır kendi partSales kaydını oluşturur
// (Customers.jsx → savePartSale). Düzenleme modunda dizi her zaman 1 elemanlı kalır.
export const PartSaleForm = ({ title, form, setForm, customers, kalipDefs = [], dealers = [], factory = null, onSave, onCancel, kdvRates = DEFAULT_KDV_RATES, draftBar = null, geoData = null, loadingGeo = false }) => {
  const [custSearch, setCustSearch] = useState("");
  const factoryName = factory?.name || "Altuntaş Makina";
  const bayiler = (dealers || []).filter(d => d.bayiMi !== false);

  const isEdit = !!form.id;
  const kaliplar = form.kaliplar || [];
  const kaliplarToplam = kaliplar.reduce((s, k) => s + parseMoney(k.fiyat), 0);
  const selectedCust = customers.find(c => c.id === Number(form.customerId));
  const matchedCustomers = custSearch.trim()
    ? customers.filter(c =>
        aramaNormalize(c.name).includes(aramaNormalize(custSearch)) ||
        aramaNormalize(c.model).includes(aramaNormalize(custSearch)) ||
        aramaNormalize(c.serialNo).includes(aramaNormalize(custSearch))
      ).slice(0, 6)
    : [];

  return (
    <Modal title={title} onClose={onCancel} wide>
      {draftBar}
      <Field label="Müşteri / Makina">
        {selectedCust ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "2px solid #e85d1a", borderRadius: 8, background: "var(--ambBg3, #fff7ed)" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--n900, #0f172a)" }}>{selectedCust.name}</div>
              <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>
                {selectedCust.model || "Model yok"} {selectedCust.serialNo ? `· S/N: ${selectedCust.serialNo}` : ""}
              </div>
            </div>
            <button onClick={() => { setForm(p => ({ ...p, customerId: "" })); setCustSearch(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--n400, #94a3b8)" }}>
              <Icon name="close" size={14} />
            </button>
          </div>
        ) : (
          <div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--n400, #94a3b8)" }}><Icon name="search" size={14} /></span>
              <input autoFocus value={custSearch} onChange={e => setCustSearch(e.target.value)}
                placeholder="Firma adı, model veya seri no ile ara..."
                style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 14, background: "var(--n100, #f8fafc)", boxSizing: "border-box", outline: "none" }} />
            </div>
            {custSearch.trim() && (
              <div style={{ marginTop: 6, border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, overflow: "hidden" }}>
                {matchedCustomers.map(c => (
                  <div key={c.id}
                    onClick={() => { setForm(p => ({ ...p, customerId: c.id })); setCustSearch(""); }}
                    style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--n150, #f1f5f9)", background: "var(--surface, #ffffff)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--ambBg3, #fff7ed)"}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--surface, #ffffff)"}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)" }}>
                      {c.model ? c.model : "Model yok"} {c.serialNo ? `· ${c.serialNo}` : ""}
                    </div>
                  </div>
                ))}
                {matchedCustomers.length === 0 && (
                  <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--n400, #94a3b8)" }}>Müşteri bulunamadı.</div>
                )}
              </div>
            )}
          </div>
        )}
      </Field>

      <Field label="Veriliş Tarihi"><Input type="date" value={form.tarih || today()} onChange={e => setForm(p => ({ ...p, tarih: e.target.value }))} /></Field>

      {!isEdit && (
        <Field label="Kalıp Ekle">
          {kalipDefs.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--red600, #dc2626)" }}>Tanımlı kalıp yok. Ayarlar → Tanımlar → Kalıp Modelleri'nden ekleyin.</div>
          ) : (
            // Aynı kalıp birden fazla kez eklenebilir (örn. farklı ölçüde veya aynı ölçüde 2 adet) — her ekleme kendi satırını oluşturur
            <SearchPick items={kalipDefs} getLabel={k => k.ad} getKey={k => k.id} placeholder="Kalıp ara..."
              onPick={k => {
                const olcu = selectedCust?.kaliplar?.find(kk => kk.ad === k.ad)?.olcu || "";
                setForm(prev => ({ ...prev, kaliplar: [...(prev.kaliplar || []), { ad: k.ad, olcu, fiyat: "", uretimFormGonder: false }] }));
              }} />
          )}
        </Field>
      )}

      {isEdit && (
        <Field label="Kalıp Modeli">
          <Select value={kaliplar[0]?.ad || ""} onChange={e => {
            const ad = e.target.value;
            const custOlcu = selectedCust?.kaliplar?.find(k => k.ad === ad)?.olcu || "";
            setForm(p => ({ ...p, kaliplar: [{ ...(p.kaliplar?.[0] || {}), ad, olcu: custOlcu || p.kaliplar?.[0]?.olcu || "" }] }));
          }}>
            <option value="">Seçin...</option>
            {kalipDefs.map(k => <option key={k.id} value={k.ad}>{k.ad}</option>)}
          </Select>
        </Field>
      )}

      {kaliplar.length > 0 && (
        <Field label={isEdit ? "Kalıp Ölçüsü ve Fiyatı" : `Seçilen Kalıplar (${kaliplar.length})`}>
          {kaliplar.map((k, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: isEdit ? "1fr 1fr auto" : "1fr 110px 110px auto 36px", gap: 8, alignItems: "center", marginBottom: 8 }}>
              {!isEdit && <span style={{ fontSize: 13, fontWeight: 600, color: "var(--orTx, #c2410c)" }}>{k.ad}</span>}
              <Input value={k.olcu || ""} placeholder="Ölçü, örn: 55x125 mm"
                onChange={e => setForm(prev => {
                  const arr = [...(prev.kaliplar || [])];
                  arr[i] = { ...arr[i], olcu: e.target.value };
                  return { ...prev, kaliplar: arr };
                })} />
              <MoneyInput value={k.fiyat} sym={CUR_SYM[form.currency || "TRY"]}
                onChange={v => setForm(prev => {
                  const arr = [...(prev.kaliplar || [])];
                  arr[i] = { ...arr[i], fiyat: v };
                  return { ...prev, kaliplar: arr };
                })} />
              <label style={{ display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", fontSize: 12, color: "var(--n600, #475569)", cursor: "pointer" }}>
                <input type="checkbox" checked={!!k.uretimFormGonder}
                  onChange={e => setForm(prev => {
                    const arr = [...(prev.kaliplar || [])];
                    arr[i] = { ...arr[i], uretimFormGonder: e.target.checked };
                    return { ...prev, kaliplar: arr };
                  })}
                  style={{ width: 15, height: 15, accentColor: "#e85d1a", cursor: "pointer" }} />
                Üretim formuna gönder
              </label>
              {!isEdit && (
                <button type="button" title="Bu kalıbı kaldır"
                  onClick={() => setForm(prev => ({ ...prev, kaliplar: (prev.kaliplar || []).filter((_, idx) => idx !== i) }))}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--redBr, #fecaca)", background: "var(--redBg, #fef2f2)", color: "var(--red600, #dc2626)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🗑</button>
              )}
            </div>
          ))}
        </Field>
      )}

      {selectedCust && (
        <Field label="Satış Yapan Firma">
          <Select value={form.satisFirma || factoryName} onChange={e => {
            const v = e.target.value;
            setForm(p => v === "Diğer" ? { ...p, satisFirma: v }
              : { ...p, satisFirma: v, satisFirmaAd: "", satisFirmaYetkili: "", satisFirmaTel: "", satisFirmaUlke: "", satisFirmaSehir: "" });
          }}>
            <option value={factoryName}>{factoryName}</option>
            {bayiler.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            <option value="Diğer">Diğer (anlaşmasız firma)…</option>
          </Select>
        </Field>
      )}

      {/* Kalıbı bizden alan, anlaşmalı olmadığımız bir firma aracılığıyla satıldıysa: firma
          bilgileri YALNIZ bu kalıp satışına kaydedilir (müşteri/bayi kaydı oluşturulmaz). */}
      {selectedCust && form.satisFirma === "Diğer" && (
        <div style={{ display: "grid", gap: 12, padding: 12, marginBottom: 14, borderRadius: 10, background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--amb800, #92400e)" }}>Anlaşmasız Firma (yalnız bu kalıp satışına kaydedilir)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Firma Adı"><Input value={form.satisFirmaAd || ""} onChange={e => setForm(p => ({ ...p, satisFirmaAd: e.target.value }))} placeholder="Firma adı" /></Field>
            <Field label="Yetkili Kişi"><Input value={form.satisFirmaYetkili || ""} onChange={e => setForm(p => ({ ...p, satisFirmaYetkili: e.target.value }))} placeholder="Yetkili" /></Field>
            <Field label="Telefon"><Input value={form.satisFirmaTel || ""} onChange={e => setForm(p => ({ ...p, satisFirmaTel: e.target.value }))} placeholder="Telefon" /></Field>
          </div>
          <CountryCityFields country={form.satisFirmaUlke || ""} city={form.satisFirmaSehir || ""}
            onCountry={v => setForm(p => ({ ...p, satisFirmaUlke: v, satisFirmaSehir: "" }))}
            onCity={v => setForm(p => ({ ...p, satisFirmaSehir: v }))}
            geoData={geoData} loadingGeo={loadingGeo} />
        </div>
      )}

      {selectedCust && (
        <Field label="Fatura Tipi">
          <Select value={form.faturaTipi || "Faturalı Yurtiçi"} onChange={e => setForm(p => ({ ...p, faturaTipi: e.target.value }))}>
            {SALE_TYPES.map(t => <option key={t}>{t}</option>)}
          </Select>
        </Field>
      )}

      {selectedCust && (
        <Field label="Para Birimi">
          <Select value={form.currency || "TRY"} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
            <option value="TRY">₺ Türk Lirası</option>
            <option value="USD">$ Dolar (USD)</option>
            <option value="EUR">€ Euro (EUR)</option>
          </Select>
          {(form.currency || "TRY") !== "TRY" && (
            <span style={{ display: "inline-block", marginTop: 5, fontSize: 11, fontWeight: 700, color: "var(--blu700, #1d4ed8)", background: "var(--bluBg2, #dbeafe)", padding: "4px 10px", borderRadius: 8 }}>Yurt dışı</span>
          )}
        </Field>
      )}

      {/* Ödeme durumu */}
      {selectedCust && kaliplarToplam > 0 && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: form.odendi ? "var(--grnBg, #f0fdf4)" : "var(--ambBg, #fffbeb)", border: `1px solid ${form.odendi ? "var(--grnBr, #bbf7d0)" : "var(--ambBr, #fde68a)"}`, borderRadius: 8, padding: "10px 12px", marginTop: 8 }}>
          <input type="checkbox" checked={!!form.odendi} onChange={e => setForm(p => ({ ...p, odendi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--grn600, #16a34a)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: form.odendi ? "var(--grn700, #15803d)" : "var(--amb800, #92400e)" }}>
            {form.odendi ? "Ücret tahsil edildi (ödendi)" : "Ücret henüz tahsil edilmedi (ödenmedi)"}
          </span>
        </label>
      )}

      {/* Kalıp fiyatları toplamı — Faturalı Yurtiçi'de KDV dahil toplam da gösterilir */}
      {kaliplarToplam > 0 && (
        <div style={{ background: "var(--bluBg, #eff6ff)", border: "1px solid var(--bluBr, #bfdbfe)", borderRadius: 8, padding: "10px 12px", marginTop: 12 }}>
          {(() => {
            const kdv = calcKDV(form.faturaTipi, kaliplarToplam, form.tarih, kdvRates);
            return (
              <>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--blu700, #1d4ed8)" }}>
                  Toplam: {fmtCur(kaliplarToplam, form.currency || "TRY")}
                </span>
                {kdv > 0 && (
                  <div style={{ fontSize: 12, color: "var(--grn800, #065f46)", marginTop: 6, fontWeight: 600 }}>
                    KDV (%{getKdvRateForDate(form.tarih, kdvRates)}): {fmtCur(kdv, form.currency || "TRY")} · KDV dahil toplam: {fmtCur(kaliplarToplam + kdv, form.currency || "TRY")}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <Btn variant="ghost" onClick={onCancel}>Vazgeç</Btn>
        <Btn onClick={onSave}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>
    </Modal>
  );
};
