import { useState } from "react";
import { CUR_SYM } from "../lib/constants";
import { today, trLower, fmtCur, parseMoney } from "../lib/utils";
import { useFilteredList } from "../hooks/useFilteredList";
import { Icon, Field, Input, Select, MoneyInput, Btn, Modal, ConfirmDialog } from "./ui";

export const Parts = ({ partSales = [], setPartSales, customers = [], setCustomers, kalipDefs = [], showToast = () => {} }) => {
  const [form, setForm] = useState(null); // satış formu
  const [custSearch, setCustSearch] = useState(""); // müşteri arama
  const [confirmDel, setConfirmDel] = useState(null); // silinecek kayıt

  const custMakine = (id) => { const c = customers.find(x => x.id === id); return c ? `${c.name}${c.model ? " · " + c.model : ""}${c.serialNo ? " · " + c.serialNo : ""}` : "—"; };
  const fmtTRlocal = (d) => { if (!d) return "—"; const x = new Date(d); return isNaN(x) ? d : x.toLocaleDateString("tr-TR"); };
  const [payFilter, setPayFilter] = useState(false); // sadece ödenmemiş kalıp borçları
  // Borçlu mu: açıkça ödenmedi (eski kayıtlarda odendi yoksa ödendi sayılır)
  const borcluMu = (s) => s.odendi === false;
  const odenmemisCount = partSales.filter(borcluMu).length;
  const { search: listSearch, setSearch: setListSearch, filtered: sortedSales } = useFilteredList(partSales, {
    searchFn: (s, q) => {
      const cust = customers.find(c => c.id === s.customerId);
      return trLower(s.ad).includes(q) || trLower(cust?.name).includes(q) || trLower(cust?.model).includes(q) || trLower(cust?.serialNo).includes(q);
    },
    filterFn: payFilter ? borcluMu : null,
    sortFn: (a, b) => (b.tarih || "").localeCompare(a.tarih || ""),
  });

  // Seçilen müşteri/makine
  const selectedCust = form ? customers.find(c => c.id === Number(form.customerId)) : null;
  const matchedCustomers = custSearch.trim()
    ? customers.filter(c =>
        trLower(c.name).includes(trLower(custSearch)) ||
        trLower(c.model).includes(trLower(custSearch)) ||
        trLower(c.serialNo).includes(trLower(custSearch))
      ).slice(0, 6)
    : [];

  const openForm = () => { setForm({ customerId: "", kalipModel: "", olcu: "", fiyat: "", currency: "TRY", tarih: today(), odendi: false }); setCustSearch(""); };
  // Mevcut bir satış/çıkış kaydını düzenlemek için formu doldur
  const openEdit = (s) => {
    setForm({
      id: s.id, customerId: s.customerId,
      kalipModel: s.ad || "", olcu: s.olcu || "", tarih: s.tarih || today(),
      currency: s.currency || "TRY", fiyat: s.ucret || "", odendi: !!s.odendi,
    });
    setCustSearch("");
  };

  const save = () => {
    if (!selectedCust || !setPartSales || !form.kalipModel) return;
    const fields = {
      customerId: selectedCust.id, tur: "Kalıp", ad: form.kalipModel,
      olcu: form.olcu || "", tarih: form.tarih || today(),
      currency: form.currency || "TRY", ucret: parseMoney(form.fiyat), ucretsizMi: false,
      odendi: !!form.odendi,
    };
    if (form.id) {
      setPartSales(p => p.map(x => x.id === form.id ? { ...x, ...fields } : x));
      showToast("Kayıt güncellendi.");
    } else {
      const nid = Date.now();
      setPartSales(p => p.some(x => x.id === nid) ? p : [...p, { id: nid, ...fields }]);
      // Müşterinin kalıp listesine ekle (ad + ölçü)
      if (setCustomers) {
        setCustomers(p => p.map(c => c.id === selectedCust.id
          ? { ...c, kaliplar: [...(c.kaliplar || []), { ad: form.kalipModel, olcu: form.olcu || "" }], kalipSayisi: (c.kaliplar || []).length + 1 }
          : c));
      }
      showToast("Kalıp verildi (ücretli).");
    }
    setForm(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Extra Kalıp</h2>
        <Btn onClick={openForm}><Icon name="parts" size={15} /> Extra Kalıp Satışı / Çıkışı</Btn>
      </div>

      {partSales.length > 0 && (
        <input value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="🔍 Müşteri, kalıp veya seri no ile ara..."
          style={{ width: "100%", maxWidth: 420, padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13, marginBottom: 14, boxSizing: "border-box", outline: "none" }} />
      )}

      {partSales.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <button onClick={() => setPayFilter(false)}
            style={{ padding: "7px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "1px solid", borderColor: !payFilter ? "#e85d1a" : "#e2e8f0", background: !payFilter ? "#e85d1a" : "#fff", color: !payFilter ? "#fff" : "#64748b" }}>
            Tümü ({partSales.length})
          </button>
          <button onClick={() => setPayFilter(true)}
            style={{ padding: "7px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "1px solid", borderColor: payFilter ? "#dc2626" : "#e2e8f0", background: payFilter ? "#dc2626" : "#fff", color: payFilter ? "#fff" : "#64748b" }}>
            💰 Ödenmemiş Kalıp Borcu ({odenmemisCount})
          </button>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.06)", overflow: "hidden" }}>
        {sortedSales.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔧</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#475569", marginBottom: 4 }}>{lq ? "Eşleşen kayıt yok" : "Henüz kalıp satışı veya çıkışı yok"}</div>
            <div style={{ fontSize: 13 }}>{lq ? "Farklı bir arama deneyin." : "Extra Kalıp Satışı / Çıkışı butonuyla başlayın."}</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Tarih", "Müşteri / Makina", "Kalıp", "Ücret", ""].map(h => (
                  <th key={h || "actions"} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedSales.map(s => (
                <tr key={s.id}>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#475569" }}>{fmtTRlocal(s.tarih)}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{custMakine(s.customerId)}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#0f172a" }}>{s.ad}{s.olcu ? ` (${s.olcu})` : ""}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 700 }}>
                    <span style={{ color: "#dc2626" }}>
                      {fmtCur(s.ucret, s.currency)}
                      <span style={{ display: "block", marginTop: 3 }}>
                        {s.odendi === false
                          ? <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 5, padding: "1px 6px" }}>Ödenmedi</span>
                          : <span style={{ fontSize: 10, fontWeight: 700, color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 5, padding: "1px 6px" }}>Ödendi</span>}
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn small variant="ghost" onClick={() => openEdit(s)}><Icon name="edit" size={12} /></Btn>
                      <Btn small variant="danger" onClick={() => setConfirmDel(s)}><Icon name="trash" size={12} /></Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmDel && (
        <ConfirmDialog
          message={`"${confirmDel.ad}" kaydı (${custMakine(confirmDel.customerId)}) kalıcı olarak silinecek.`}
          onConfirm={() => { setPartSales(p => p.filter(x => x.id !== confirmDel.id)); setConfirmDel(null); showToast("Kayıt silindi."); }}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {/* Satış/çıkış formu */}
      {form && (
        <Modal title={form.id ? "Kaydı Düzenle" : "Extra Kalıp Satışı / Çıkışı"} onClose={() => setForm(null)}>
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
            <Btn variant="ghost" onClick={() => setForm(null)}>Vazgeç</Btn>
            <Btn onClick={save}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
