import { useState } from "react";
import { trLower } from "../lib/utils";
import { Icon, Field, Input, Warn, Select, Btn, Modal, ConfirmDialog, Pagination } from "./ui";

const PER_PAGE = 10;

export const ModelsManager = ({ standardModels, setStandardModels, customModels, setCustomModels, showToast = () => {} }) => {
  const empty = { model: "", sogutma: "Soğutmalı", kapasite: "", kalip: "" };
  const [modelModal, setModelModal] = useState(null); // null | { mode: "add" | "edit-std" | "edit-custom", data }
  const [mForm, setMForm] = useState(empty);
  const [confirmDelModel, setConfirmDelModel] = useState(null); // silinecek model adı
  const [page, setPage] = useState(1);
  // Standart + özel modeller tek listede sayfalanıyor (sırayla: önce standart, sonra özel)
  const allModels = [
    ...standardModels.map(m => ({ m, isStd: true })),
    ...customModels.map(m => ({ m, isStd: false })),
  ];
  const totalPages = Math.max(1, Math.ceil(allModels.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedModels = allModels.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const openAdd = () => { setMForm(empty); setModelModal({ mode: "add" }); };
  const openEdit = (m, isStd) => { setMForm({ ...m }); setModelModal({ mode: isStd ? "edit-std" : "edit-custom", orig: m.model }); };

  const saveModel = () => {
    const name = (mForm.model || "").trim();
    if (!name) return;
    // Düzenlemede kendi orijinal adı hariç tutularak aynı isim kontrolü yapılır — yoksa bir modeli
    // başka birinin adıyla yeniden adlandırmak sessizce iki aynı isimli kayıt oluşturabilirdi.
    const existsElsewhere = (excludeName) =>
      standardModels.some(m => m.model !== excludeName && trLower(m.model) === trLower(name)) ||
      customModels.some(m => m.model !== excludeName && trLower(m.model) === trLower(name));
    if (modelModal.mode === "add") {
      if (!existsElsewhere(null)) { setCustomModels(p => p.some(m => m.model === name) ? p : [...p, { ...mForm, model: name }]); showToast("Model kaydedildi."); }
      else showToast("Bu model zaten var.", "err");
    } else if (modelModal.mode === "edit-std") {
      if (existsElsewhere(modelModal.orig)) { showToast("Bu model adı zaten kullanılıyor.", "err"); return; }
      setStandardModels(p => p.map(m => m.model === modelModal.orig ? { ...mForm, model: name } : m));
      showToast("Model düzenlendi.");
    } else {
      if (existsElsewhere(modelModal.orig)) { showToast("Bu model adı zaten kullanılıyor.", "err"); return; }
      setCustomModels(p => p.map(m => m.model === modelModal.orig ? { ...mForm, model: name } : m));
      showToast("Model düzenlendi.");
    }
    setModelModal(null);
  };

  const ModelRow = ({ m, isStd }) => (
    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
      <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 700 }}>{m.model}</td>
      <td style={{ padding: "10px 12px", fontSize: 12, color: "#64748b" }}>{m.sogutma || "—"}</td>
      <td style={{ padding: "10px 12px", fontSize: 12, color: "#64748b" }}>{m.kapasite || "—"}</td>
      <td style={{ padding: "10px 12px", fontSize: 12, color: "#64748b" }}>{m.kalip ? `Ø ${m.kalip}` : "—"}</td>
      <td style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <Btn small variant="ghost" onClick={() => openEdit(m, isStd)}><Icon name="edit" size={12} /></Btn>
          {!isStd && (
            <Btn small variant="danger" onClick={() => setConfirmDelModel(m.model)}><Icon name="trash" size={12} /></Btn>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn onClick={openAdd}><Icon name="plus" size={14} /> Yeni Model Ekle</Btn>
      </div>
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Model", "Soğutma", "Kapasite", "Kalıp Çapı", ""].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: h === "" ? "right" : "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedModels.map(({ m, isStd }, i) => <ModelRow key={(isStd ? "s-" : "c-") + m.model + "-" + i} m={m} isStd={isStd} />)}
          </tbody>
        </table>
      </div>
      <Pagination total={allModels.length} page={safePage} setPage={setPage} perPage={PER_PAGE} />
      {customModels.length === 0 && (
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>Henüz özel model eklenmedi.</div>
      )}

      {confirmDelModel && (
        <ConfirmDialog
          message={`"${confirmDelModel}" modeli silinecek. Bu işlem geri alınamaz.`}
          onConfirm={() => { setCustomModels(p => p.filter(x => x.model !== confirmDelModel)); setConfirmDelModel(null); showToast("Model silindi."); }}
          onCancel={() => setConfirmDelModel(null)}
        />
      )}

      {modelModal && (
        <Modal title={modelModal.mode === "add" ? "Yeni Model Ekle" : "Modeli Düzenle"} onClose={() => setModelModal(null)}>
          <Field label="Model Adı">
            <Input value={mForm.model || ""} onChange={e => setMForm(p => ({ ...p, model: e.target.value }))} placeholder="Örn: AK160_DSC" />
            <Warn>{!(mForm.model || "").trim() ? "Model adı girilmedi" : ""}</Warn>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Soğutma">
              <Select value={mForm.sogutma || "Soğutmalı"} onChange={e => setMForm(p => ({ ...p, sogutma: e.target.value }))}>
                <option>Soğutmalı</option>
                <option>Soğutmasız</option>
              </Select>
            </Field>
            <Field label="Günlük Kapasite"><Input value={mForm.kapasite || ""} onChange={e => setMForm(p => ({ ...p, kapasite: e.target.value }))} placeholder="Örn: 2000 kg/gün" /></Field>
          </div>
          <Field label="Kalıp Çapı"><Input value={mForm.kalip || ""} onChange={e => setMForm(p => ({ ...p, kalip: e.target.value }))} placeholder="Örn: 14 cm" /></Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setModelModal(null)}>İptal</Btn>
            <Btn onClick={saveModel}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
