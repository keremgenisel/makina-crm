import { useState } from "react";
import { Icon, Field, Input, Warn, Select, Btn, Modal, ConfirmDialog } from "./ui";

export const ModelsManager = ({ standardModels, setStandardModels, customModels, setCustomModels, showToast = () => {} }) => {
  const empty = { model: "", sogutma: "Soğutmalı", kapasite: "", kalip: "" };
  const [modelModal, setModelModal] = useState(null); // null | { mode: "add" | "edit-std" | "edit-custom", data }
  const [mForm, setMForm] = useState(empty);
  const [confirmDelModel, setConfirmDelModel] = useState(null); // silinecek model adı

  const openAdd = () => { setMForm(empty); setModelModal({ mode: "add" }); };
  const openEdit = (m, isStd) => { setMForm({ ...m }); setModelModal({ mode: isStd ? "edit-std" : "edit-custom", orig: m.model }); };

  const saveModel = () => {
    const name = (mForm.model || "").trim();
    if (modelModal.mode === "add") {
      const exists = standardModels.some(m => m.model === name) || customModels.some(m => m.model === name);
      if (!exists) { setCustomModels(p => p.some(m => m.model === name) ? p : [...p, { ...mForm, model: name }]); showToast("Model kaydedildi."); }
      else showToast("Bu model zaten var.", "err");
    } else if (modelModal.mode === "edit-std") {
      setStandardModels(p => p.map(m => m.model === modelModal.orig ? { ...mForm, model: name } : m));
      showToast("Model düzenlendi.");
    } else {
      setCustomModels(p => p.map(m => m.model === modelModal.orig ? { ...mForm, model: name } : m));
      showToast("Model düzenlendi.");
    }
    setModelModal(null);
  };

  const ModelRow = ({ m, isStd }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid #f1f5f9" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{m.model}</span>
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
          {[m.sogutma, m.kapasite, m.kalip ? `Kalıp Ø ${m.kalip}` : ""].filter(Boolean).join(" · ") || "Detay girilmemiş"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <Btn small variant="ghost" onClick={() => openEdit(m, isStd)}><Icon name="edit" size={12} /></Btn>
        {!isStd && (
          <Btn small variant="danger" onClick={() => setConfirmDelModel(m.model)}><Icon name="trash" size={12} /></Btn>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn onClick={openAdd}><Icon name="plus" size={14} /> Yeni Model Ekle</Btn>
      </div>
      {standardModels.map((m, i) => <ModelRow key={"s-" + m.model + "-" + i} m={m} isStd />)}
      {customModels.map((m, i) => <ModelRow key={"c-" + m.model + "-" + i} m={m} isStd={false} />)}
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
