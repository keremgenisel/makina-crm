import { useState } from "react";
import { CUR_SYM } from "../lib/constants";
import { today, trLower } from "../lib/utils";
import { Icon, Field, Input, Select, MoneyInput, Btn, Modal } from "./ui";

// Extra Kalıp satışı/çıkışı ekleme-düzenleme formu — Parts.jsx ve Customers.jsx (müşteri
// detayından "Extra Kalıp Satışı") tarafından paylaşılır, Services/ServiceForm ile aynı desen.
export const PartSaleForm = ({ title, form, setForm, customers, kalipDefs = [], onSave, onCancel }) => {
  const [custSearch, setCustSearch] = useState("");

  const selectedCust = customers.find(c => c.id === Number(form.customerId));
  const matchedCustomers = custSearch.trim()
    ? customers.filter(c =>
        trLower(c.name).includes(trLower(custSearch)) ||
        trLower(c.model).includes(trLower(custSearch)) ||
        trLower(c.serialNo).includes(trLower(custSearch))
      ).slice(0, 6)
    : [];

  return (
    <Modal title={title} onClose={onCancel}>
      <Field label="Müşteri / Makina">
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
                placeholder="Firma adı, model veya seri no ile ara..."
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
                      {c.model ? c.model : "Model yok"} {c.serialNo ? `· ${c.serialNo}` : ""}
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
      </Field>

      <Field label="Kalıp Modeli">
        <Select value={form.kalipModel || ""} onChange={e => setForm(p => ({ ...p, kalipModel: e.target.value }))}>
          <option value="">Seçin...</option>
          {kalipDefs.map(k => <option key={k.id} value={k.ad}>{k.ad}</option>)}
        </Select>
        {kalipDefs.length === 0 && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 5 }}>Tanımlı kalıp yok. Ayarlar → Tanımlar → Kalıp Modelleri'nden ekleyin.</div>}
      </Field>
      <Field label="Kalıp Ölçüsü"><Input value={form.olcu || ""} onChange={e => setForm(p => ({ ...p, olcu: e.target.value }))} placeholder="örn: 55x125 mm" /></Field>

      <Field label="Veriliş Tarihi"><Input type="date" value={form.tarih || today()} onChange={e => setForm(p => ({ ...p, tarih: e.target.value }))} /></Field>

      {selectedCust && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Para Birimi">
            <Select value={form.currency || "TRY"} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
              <option value="TRY">₺ Türk Lirası</option>
              <option value="USD">$ Dolar (USD)</option>
              <option value="EUR">€ Euro (EUR)</option>
            </Select>
          </Field>
          <Field label="Fiyat">
            <MoneyInput value={form.fiyat} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, fiyat: v }))} />
            {(form.currency || "TRY") !== "TRY" && (
              <span style={{ display: "inline-block", marginTop: 5, fontSize: 11, fontWeight: 700, color: "#1d4ed8", background: "#dbeafe", padding: "4px 10px", borderRadius: 8 }}>Yurt dışı</span>
            )}
          </Field>
        </div>
      )}

      {/* Ödeme durumu */}
      {selectedCust && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: form.odendi ? "#f0fdf4" : "#fffbeb", border: `1px solid ${form.odendi ? "#bbf7d0" : "#fde68a"}`, borderRadius: 8, padding: "10px 12px", marginTop: 8 }}>
          <input type="checkbox" checked={!!form.odendi} onChange={e => setForm(p => ({ ...p, odendi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#16a34a" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: form.odendi ? "#15803d" : "#92400e" }}>
            {form.odendi ? "Ücret tahsil edildi (ödendi)" : "Ücret henüz tahsil edilmedi (ödenmedi)"}
          </span>
        </label>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <Btn variant="ghost" onClick={onCancel}>Vazgeç</Btn>
        <Btn onClick={onSave}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>
    </Modal>
  );
};
