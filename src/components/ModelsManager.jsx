import { useState } from "react";
import { trLower, withDeleted } from "../lib/utils";
import { Icon, Field, Input, Warn, Select, Btn, Modal, ConfirmDialog, Pagination } from "./ui";
import { useFilteredList } from "../hooks/useFilteredList";

const PER_PAGE = 10;

export const ModelsManager = ({ standardModels, setStandardModels, customModels, setCustomModels, showToast = () => {}, setCustomers = null, setStock = null }) => {
  const empty = { model: "", sogutma: "Soğutmalı", kapasite: "", kalip: "" };
  const [modelModal, setModelModal] = useState(null); // null | { mode: "add" | "edit-std" | "edit-custom", data }
  const [mForm, setMForm] = useState(empty);
  const [confirmDelModel, setConfirmDelModel] = useState(null); // silinecek model adı
  // Standart + özel modeller tek listede aranıp sayfalanıyor (sırayla: önce standart, sonra özel)
  const allModels = [
    ...standardModels.map(m => ({ m, isStd: true })),
    ...customModels.map(m => ({ m, isStd: false })),
  ];
  const { search, setSearch, page, setPage, filtered, paged: pagedModels } = useFilteredList(allModels, {
    searchFn: (item, q) => trLower(item.m.model).includes(q),
    perPage: PER_PAGE,
  });

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
    // Model adı düz metin olarak customers[].model ve stock[].model'de kopyalanmış durumda —
    // adı düzeltince bu kayıtlarda da güncellenmeli, yoksa eski ad geçmişte kalır (bkz. SimpleDealers.jsx'teki bayi adı deseni).
    const cascadeRename = (oldName) => {
      if (!oldName || oldName === name) { showToast("Model düzenlendi."); return; }
      setCustomers?.(p => p.map(c => c.model === oldName ? { ...c, model: name } : c));
      setStock?.(p => p.map(s => s.model === oldName ? { ...s, model: name } : s));
      showToast(`Model düzenlendi. "${oldName}" adı geçmiş kayıtlarda da güncellendi.`);
    };
    if (modelModal.mode === "add") {
      if (!existsElsewhere(null)) { setCustomModels(p => p.some(m => m.model === name) ? p : [...p, { ...mForm, model: name }]); showToast("Model kaydedildi."); }
      else showToast("Bu model zaten var.", "err");
    } else if (modelModal.mode === "edit-std") {
      if (existsElsewhere(modelModal.orig)) { showToast("Bu model adı zaten kullanılıyor.", "err"); return; }
      setStandardModels(p => p.map(m => m.model === modelModal.orig ? { ...mForm, model: name } : m));
      cascadeRename(modelModal.orig);
    } else {
      if (existsElsewhere(modelModal.orig)) { showToast("Bu model adı zaten kullanılıyor.", "err"); return; }
      setCustomModels(p => p.map(m => m.model === modelModal.orig ? { ...mForm, model: name } : m));
      cascadeRename(modelModal.orig);
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
      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Model ara..."
          style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
      </div>
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            {allModels.length === 0 ? "Henüz model yok." : "Arama sonucu bulunamadı."}
          </div>
        ) : (
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
        )}
      </div>
      <Pagination total={filtered.length} page={page} setPage={setPage} perPage={PER_PAGE} />
      {customModels.length === 0 && (
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>Henüz özel model eklenmedi.</div>
      )}

      {confirmDelModel && (
        <ConfirmDialog
          message={`"${confirmDelModel}" modeli Çöp Kutusu'na taşınacak — Ayarlar'dan 30 gün içinde geri alabilirsiniz.`}
          onConfirm={() => { setCustomModels(p => withDeleted(p, x => x.model === confirmDelModel)); setConfirmDelModel(null); showToast("Model silindi."); }}
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
