import { useState } from "react";
import { CUR_SYM, SERVICE_TYPES, REPAIR_PLACES } from "../lib/constants";
import { today, trLower, fmtCur, parseMoney } from "../lib/utils";
import { Icon, Field, Input, Warn, Select, MoneyInput, Btn, Modal } from "./ui";

// Servis ekleme/düzenleme formu — Services.jsx ve Customers.jsx (müşteri detayından
// "Yeni Servis Talebi") tarafından paylaşılır. Tek form olduğu için ikisi de
// senkron kalır; ayrı bir kopya tutmak Makina Geçmişi'nde çözdüğümüz çift-form
// sorununu burada da yaratırdı.
export const ServiceForm = ({ title, form, setForm, customers, parts = [], onSave, onCancel }) => {
  const [custSearch, setCustSearch] = useState("");

  const selectedCust = customers.find(c => c.id === Number(form.customerId));
  const warrantyAktif = !!(selectedCust?.warrantyEnd && selectedCust.warrantyEnd >= today());
  const parcaUcretsizMi = (form.degisenParcalar || []).length === 0 || (warrantyAktif && !form.parcaGarantiDisi);
  const matchedCustomers = custSearch.trim()
    ? customers.filter(c =>
        trLower(c.name).includes(trLower(custSearch)) ||
        trLower(c.contact).includes(trLower(custSearch)) ||
        trLower(c.serialNo).includes(trLower(custSearch))
      ).slice(0, 6)
    : [];

  return (
    <Modal title={title} onClose={onCancel}>
      <Field label="Müşteri">
        {selectedCust ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "2px solid #e85d1a", borderRadius: 8, background: "#fff7ed" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{selectedCust.name}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {selectedCust.model || "Model yok"} {selectedCust.serialNo ? `· S/N: ${selectedCust.serialNo}` : ""}
              </div>
            </div>
            <button onClick={() => { setForm(p => ({ ...p, customerId: "" })); setCustSearch(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
              <Icon name="close" size={14} />
            </button>
          </div>
        ) : (
          <div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={14} /></span>
              <input autoFocus value={custSearch} onChange={e => setCustSearch(e.target.value)}
                placeholder="Firma adı, kişi veya seri no ile ara..."
                style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", boxSizing: "border-box", outline: "none" }} />
            </div>
            {custSearch.trim() && (
              <div style={{ marginTop: 6, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                {matchedCustomers.map(c => (
                  <div key={c.id}
                    onClick={() => { setForm(p => ({ ...p, customerId: c.id })); setCustSearch(""); }}
                    style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: "#fff" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fff7ed"}
                    onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      {c.contact} {c.model ? `· ${c.model}` : ""} {c.serialNo ? `· ${c.serialNo}` : ""}
                    </div>
                  </div>
                ))}
                {matchedCustomers.length === 0 && (
                  <div style={{ padding: "12px 14px", fontSize: 13, color: "#94a3b8" }}>Müşteri bulunamadı.</div>
                )}
              </div>
            )}
          </div>
        )}
        <Warn>{!form.customerId ? "Müşteri seçilmedi" : ""}</Warn>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Tür">
          <Select value={form.type || "Periyodik Bakım"} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
            {SERVICE_TYPES.map(t => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Yapılan İşlem">
          <Select value={form.repairPlace || "Yerinde Onarım"} onChange={e => setForm(p => ({ ...p, repairPlace: e.target.value }))}>
            {REPAIR_PLACES.map(t => <option key={t}>{t}</option>)}
          </Select>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Tarih"><Input type="date" value={form.date || ""} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></Field>
        <Field label="Teknisyen"><Input value={form.tech || ""} onChange={e => setForm(p => ({ ...p, tech: e.target.value }))} placeholder="Teknisyen adı" /></Field>
      </div>
      {(form.type === "Garanti Dışı" || form.type === "Periyodik Bakım") && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Para Birimi">
            <Select value={form.currency || "TRY"} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
              <option value="TRY">₺ Türk Lirası</option>
              <option value="USD">$ Dolar (USD)</option>
              <option value="EUR">€ Euro (EUR)</option>
            </Select>
          </Field>
          <Field label="Servis Ücreti">
            <MoneyInput value={form.servisUcreti} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, servisUcreti: v }))} />
            {(form.currency || "TRY") !== "TRY" && (
              <span style={{ display: "inline-block", marginTop: 5, fontSize: 11, fontWeight: 700, color: "#1d4ed8", background: "#dbeafe", padding: "4px 10px", borderRadius: 8 }}>Yurt dışı</span>
            )}
          </Field>
        </div>
      )}

      {/* Ödeme durumu — sadece ücretli servislerde */}
      {(form.type === "Garanti Dışı" || form.type === "Periyodik Bakım") && parseMoney(form.servisUcreti) > 0 && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: form.odendi ? "#f0fdf4" : "#fffbeb", border: `1px solid ${form.odendi ? "#bbf7d0" : "#fde68a"}`, borderRadius: 8, padding: "10px 12px", marginBottom: 4 }}>
          <input type="checkbox" checked={!!form.odendi} onChange={e => setForm(p => ({ ...p, odendi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#16a34a" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: form.odendi ? "#15803d" : "#92400e" }}>
            {form.odendi ? "Ücret tahsil edildi (ödendi)" : "Ücret henüz tahsil edilmedi (ödenmedi)"}
          </span>
        </label>
      )}

      <Field label="Yapılan İşler / Parça Değişimleri">
        <textarea value={form.yapilanIsler || ""} onChange={e => setForm(p => ({ ...p, yapilanIsler: e.target.value }))}
          placeholder="Yapılan işlemler, değişen parçalar..."
          style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 80, boxSizing: "border-box", fontFamily: "inherit" }} />
      </Field>

      {/* Değişen parçalar — tanımlı yedek parçalardan çoklu seçim + ücretlendirme */}
      <Field label="Değişen Parçalar (varsa)">
        {parts.length === 0 ? (
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Tanımlı yedek parça yok. Ayarlar → Tanımlar → Yedek Parça'dan ekleyebilirsiniz.</div>
        ) : (
          <>
            <Select value="" onChange={e => {
              const ad = e.target.value;
              if (ad && !(form.degisenParcalar || []).includes(ad)) {
                setForm(p => ({ ...p, degisenParcalar: [...(p.degisenParcalar || []), ad] }));
              }
            }}>
              <option value="">+ Parça ekle...</option>
              {parts.filter(p => !(form.degisenParcalar || []).includes(p.ad)).map(p => (
                <option key={p.id} value={p.ad}>{p.ad}</option>
              ))}
            </Select>
            {(form.degisenParcalar || []).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {form.degisenParcalar.map(ad => (
                  <span key={ad} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 16, padding: "4px 10px" }}>
                    {ad}
                    <button onClick={() => setForm(p => ({ ...p, degisenParcalar: p.degisenParcalar.filter(x => x !== ad) }))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#1d4ed8", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </Field>

      {(form.degisenParcalar || []).length > 0 && (
        <>
          {warrantyAktif && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", marginBottom: 4 }}>
              <input type="checkbox" checked={!!form.parcaGarantiDisi} onChange={e => setForm(p => ({ ...p, parcaGarantiDisi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#dc2626" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>
                {form.parcaGarantiDisi ? "Garanti kapsamı dışı (ücretli)" : "Garanti kapsamında — parça ücretsiz verildi"}
              </span>
            </label>
          )}
          {!parcaUcretsizMi && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Parça Para Birimi">
                <Select value={form.parcaCurrency || "TRY"} onChange={e => setForm(p => ({ ...p, parcaCurrency: e.target.value }))}>
                  <option value="TRY">₺ Türk Lirası</option>
                  <option value="USD">$ Dolar (USD)</option>
                  <option value="EUR">€ Euro (EUR)</option>
                </Select>
              </Field>
              <Field label="Parça Ücreti">
                <MoneyInput value={form.parcaUcreti} sym={CUR_SYM[form.parcaCurrency || "TRY"]} onChange={v => setForm(p => ({ ...p, parcaUcreti: v }))} />
              </Field>
            </div>
          )}
          {!parcaUcretsizMi && parseMoney(form.parcaUcreti) > 0 && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: form.parcaOdendi ? "#f0fdf4" : "#fffbeb", border: `1px solid ${form.parcaOdendi ? "#bbf7d0" : "#fde68a"}`, borderRadius: 8, padding: "10px 12px", marginBottom: 4 }}>
              <input type="checkbox" checked={!!form.parcaOdendi} onChange={e => setForm(p => ({ ...p, parcaOdendi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#16a34a" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: form.parcaOdendi ? "#15803d" : "#92400e" }}>
                {form.parcaOdendi ? "Parça ücreti tahsil edildi (ödendi)" : "Parça ücreti henüz tahsil edilmedi (ödenmedi)"}
              </span>
            </label>
          )}
        </>
      )}

      {/* Servis ücreti ve parça ücreti aynı anda varsa toplamı göster */}
      {parseMoney(form.servisUcreti) > 0 && !parcaUcretsizMi && parseMoney(form.parcaUcreti) > 0 && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          {(form.currency || "TRY") === (form.parcaCurrency || "TRY") ? (
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>
              Toplam (Servis + Parça): {fmtCur(parseMoney(form.servisUcreti) + parseMoney(form.parcaUcreti), form.currency || "TRY")}
            </span>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>
              Toplam: {fmtCur(form.servisUcreti, form.currency)} (servis) + {fmtCur(form.parcaUcreti, form.parcaCurrency)} (parça)
            </span>
          )}
        </div>
      )}

      <Field label="Müşteri Talimatı / Açıklama">
        <textarea value={form.musteriTalimati || ""} onChange={e => setForm(p => ({ ...p, musteriTalimati: e.target.value }))}
          placeholder="Müşterinin talimatı / talebi..."
          style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 60, boxSizing: "border-box", fontFamily: "inherit" }} />
      </Field>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
        <Btn variant="ghost" onClick={onCancel}>İptal</Btn>
        <Btn onClick={() => onSave(parcaUcretsizMi)}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>
    </Modal>
  );
};
