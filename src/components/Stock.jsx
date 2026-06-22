import { useState } from "react";
import { ALTUNMAK_MODELS } from "../lib/constants";
import { today, fmtTR, uid, bumpId } from "../lib/utils";
import { useFilteredList } from "../hooks/useFilteredList";
import { Icon, Field, Input, Warn, Select, Btn, Modal, ConfirmDialog, Pagination } from "./ui";

export const Stock = ({ stock, setStock, models = ALTUNMAK_MODELS, showToast = () => {} }) => {
  const [modelFilter, setModelFilter] = useState(null); // tıklanan model kartı
  const [modal, setModal] = useState(null); // null | "add" | {edit}
  const [form, setForm] = useState({});
  const [confirmId, setConfirmId] = useState(null);

  const { search, setSearch, page, setPage, filtered, paged, perPage: PER_PAGE } = useFilteredList(stock, {
    searchFields: ["model", "serialNo", "note"],
    filterFn: s => !modelFilter || s.model === modelFilter,
  });

  // Modele göre grupla (özet kartlar)
  const byModel = {};
  stock.forEach(s => { byModel[s.model] = (byModel[s.model] || 0) + 1; });

  const openAdd  = () => { setForm({ model: "", serialNo: "", addedDate: today(), note: "" }); setModal("add"); };
  const openEdit = s => { setForm({ ...s }); setModal({ edit: s }); };
  const save = () => {
    if (!form.model) { showToast("Model seçilmeden kaydedilemez."); return; } // model, stok özet kartlarının gruplama anahtarı — boş geçilemez
    if (modal === "add") { bumpId(stock); const nid = uid(); setStock(p => p.some(s => s.id === nid) ? p : [{ ...form, id: nid }, ...p]); showToast("Stok makinası kaydedildi."); }
    else { setStock(p => p.map(s => s.id === form.id ? form : s)); showToast("Stok makinası düzenlendi."); }
    setModal(null);
  };
  const confirmDel = () => { setStock(p => p.filter(s => s.id !== confirmId)); setConfirmId(null); showToast("Stok makinası silindi."); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Stok</h2>
        <Btn onClick={openAdd}><Icon name="plus" size={14} /> Stoğa Makina Ekle</Btn>
      </div>

      {/* Model bazlı özet */}
      {Object.keys(byModel).length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
          {Object.entries(byModel).map(([m, n]) => {
            const active = modelFilter === m;
            return (
              <div key={m} onClick={() => { setModelFilter(active ? null : m); setPage(1); }}
                style={{ background: active ? "#fff7ed" : "#fff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", borderLeft: `4px solid ${active ? "#c2410c" : "#e85d1a"}`, cursor: "pointer", transition: "all .15s" }}
                title="Bu modeldeki makinaları göster">
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{m}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#e85d1a" }}>{n} <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>adet</span></div>
              </div>
            );
          })}
        </div>
      )}

      {modelFilter && (
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>Filtre:</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", borderRadius: 8, padding: "5px 12px" }}>
            {modelFilter}
            <button onClick={() => setModelFilter(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c2410c", padding: 0, display: "flex" }}><Icon name="close" size={12} /></button>
          </span>
        </div>
      )}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Model veya seri no ara..."
          style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
      </div>

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Model", "Seri Numarası", "Stoğa Giriş", "Not", ""].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map(s => (
              <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "13px 16px" }}><span style={{ fontSize: 12, background: "#fff7ed", color: "#c2410c", borderRadius: 6, padding: "3px 10px", fontWeight: 700 }}>{s.model}</span></td>
                <td style={{ padding: "13px 16px", fontSize: 13, color: s.serialNo ? "#0f172a" : "#94a3b8", fontFamily: s.serialNo ? "monospace" : "inherit", fontWeight: 600 }}>{s.serialNo || "(seri no atanmamış)"}</td>
                <td style={{ padding: "13px 16px", fontSize: 13, color: "#64748b" }}>{fmtTR(s.addedDate)}</td>
                <td title={s.note || undefined} style={{ padding: "13px 16px", fontSize: 12, color: "#64748b", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.note || "—"}</td>
                <td style={{ padding: "13px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn small variant="ghost" onClick={() => openEdit(s)}><Icon name="edit" size={12} /></Btn>
                    <Btn small variant="danger" onClick={() => setConfirmId(s.id)}><Icon name="trash" size={12} /></Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>{stock.length === 0 ? "Stokta makina yok." : "Aramanıza uyan makina yok."}</div>}
        <Pagination total={filtered.length} page={page} setPage={setPage} perPage={PER_PAGE} />
      </div>

      {confirmId && (
        <ConfirmDialog
          message={`"${stock.find(s => s.id === confirmId)?.serialNo || ""}" seri numaralı makina stoktan silinecek.`}
          onConfirm={confirmDel}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {modal && (
        <Modal title={modal === "add" ? "Stoğa Makina Ekle" : "Stok Kaydını Düzenle"} onClose={() => setModal(null)}>
          <Field label="Makina Modeli">
            <Select value={form.model || ""} onChange={e => setForm(p => ({ ...p, model: e.target.value }))}>
              <option value="">Model seçin...</option>
              {models.map(m => <option key={m.model} value={m.model}>{m.model}</option>)}
            </Select>
            <Warn>{!form.model ? "Model seçilmedi" : ""}</Warn>
          </Field>
          <Field label="Seri Numarası (opsiyonel)"><Input value={form.serialNo || ""} onChange={e => setForm(p => ({ ...p, serialNo: e.target.value }))} placeholder="Boş bırakılabilir — sonra atanır" /></Field>
          <Field label="Stoğa Giriş Tarihi"><Input type="date" value={form.addedDate || ""} onChange={e => setForm(p => ({ ...p, addedDate: e.target.value }))} /></Field>
          <Field label="Not">
            <textarea value={form.note || ""} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              placeholder="İsteğe bağlı not..."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 60, boxSizing: "border-box", fontFamily: "inherit" }} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>İptal</Btn>
            <Btn onClick={save} disabled={!form.model}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
