import { useState } from "react";
import { trLower, aramaNormalize, withDeleted } from "../lib/utils";
import { Icon, Field, Input, Warn, Select, Btn, Modal, ConfirmDialog, Pagination, SearchPick, ImageUpload } from "./ui";
import { useFilteredList } from "../hooks/useFilteredList";

const PER_PAGE = 10;

export const ModelsManager = ({ standardModels, setStandardModels, customModels, setCustomModels, showToast = () => {}, setCustomers = null, setStock = null, parts = [] }) => {
  const empty = { model: "", urunAdi: "", urunAdiEN: "", sogutma: "Soğutmalı", kapasite: "", kalip: "", tanim: "", tanimEN: "", defaultParcalar: [] };
  const [modelModal, setModelModal] = useState(null); // null | { mode: "add" | "edit-std" | "edit-custom", data }
  const [mForm, setMForm] = useState(empty);
  const [confirmDelModel, setConfirmDelModel] = useState(null); // silinecek model adı
  // Standart + özel modeller tek listede aranıp sayfalanıyor (sırayla: önce standart, sonra özel)
  const allModels = [
    ...standardModels.map(m => ({ m, isStd: true })),
    ...customModels.map(m => ({ m, isStd: false })),
  ];
  const { search, setSearch, page, setPage, filtered, paged: pagedModels } = useFilteredList(allModels, {
    searchFn: (item, q) => aramaNormalize(item.m.model).includes(q),
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
      <td style={{ padding: "10px 12px" }}>
        {m.resim
          ? <img src={m.resim} alt={m.model} style={{ width: 40, height: 30, objectFit: "contain", borderRadius: 4, border: "1px solid #e2e8f0" }} />
          : <div style={{ width: 40, height: 30, borderRadius: 4, border: "1px dashed #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#cbd5e1" }}>—</div>
        }
      </td>
      <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 700 }}>{m.model}</td>
      <td style={{ padding: "10px 12px", fontSize: 12, color: "#64748b" }}>{m.sogutma || "—"}</td>
      <td style={{ padding: "10px 12px", fontSize: 12, color: "#64748b" }}>{m.kapasite || "—"}</td>
      <td style={{ padding: "10px 12px", fontSize: 12, color: "#64748b" }}>{m.kalip ? `Ø ${m.kalip}` : "—"}</td>
      <td style={{ padding: "10px 12px", fontSize: 11 }}>
        <span style={{ color: m.tanim ? "#16a34a" : "#cbd5e1" }}>TR</span>
        {" · "}
        <span style={{ color: m.tanimEN ? "#16a34a" : "#cbd5e1" }}>EN</span>
      </td>
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
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            {allModels.length === 0 ? "Henüz model yok." : "Arama sonucu bulunamadı."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["", "Model", "Soğutma", "Kapasite", "Kalıp Çapı", "Tanım", ""].map(h => (
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
        <Modal wide title={modelModal.mode === "add" ? "Yeni Model Ekle" : "Modeli Düzenle"} onClose={() => setModelModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Model Adı">
              <Input value={mForm.model || ""} onChange={e => setMForm(p => ({ ...p, model: e.target.value }))} placeholder="Örn: AK160_DSC" />
              <Warn>{!(mForm.model || "").trim() ? "Model adı girilmedi" : ""}</Warn>
            </Field>
            <Field label="Ürün Adı (TR) — Teklifte görünür">
              <Input value={mForm.urunAdi || ""} onChange={e => setMForm(p => ({ ...p, urunAdi: e.target.value }))} placeholder="Örn: Soğutmalı Buz Makinesi" />
            </Field>
            <Field label="Ürün Adı (EN) — Proforma için">
              <Input value={mForm.urunAdiEN || ""} onChange={e => setMForm(p => ({ ...p, urunAdiEN: e.target.value }))} placeholder="Örn: Water Cooled Ice Machine" />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Soğutma">
              <Select value={mForm.sogutma || "Soğutmalı"} onChange={e => setMForm(p => ({ ...p, sogutma: e.target.value }))}>
                <option>Soğutmalı</option>
                <option>Soğutmasız</option>
              </Select>
            </Field>
            <Field label="Günlük Kapasite"><Input value={mForm.kapasite || ""} onChange={e => setMForm(p => ({ ...p, kapasite: e.target.value }))} placeholder="Örn: 2000 kg/gün" /></Field>
            <Field label="Kalıp Çapı"><Input value={mForm.kalip || ""} onChange={e => setMForm(p => ({ ...p, kalip: e.target.value }))} placeholder="Örn: 14 cm" /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tanım (TR) — Teklif formunda otomatik dolar">
            <textarea value={mForm.tanim || ""} onChange={e => setMForm(p => ({ ...p, tanim: e.target.value }))}
              placeholder="Teknik özellikler, dahil kalıp notu vb."
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", minHeight: 90, background: "#f8fafc", outline: "none" }} />
          </Field>
          <Field label="Tanım (EN) — Proforma ve yurtdışı teklifler için">
            <textarea value={mForm.tanimEN || ""} onChange={e => setMForm(p => ({ ...p, tanimEN: e.target.value }))}
              placeholder="English technical description..."
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", minHeight: 90, background: "#f8fafc", outline: "none" }} />
          </Field>
          </div>
          <Field label="Resim (Teklif/Proforma'da görünür)">
            <ImageUpload value={mForm.resim || ""} onChange={v => setMForm(p => ({ ...p, resim: v }))} label={mForm.model} />
          </Field>

          {parts.length > 0 && (
            <Field label="Makina Kiti — Varsayılan Parçalar">
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                Stoka yeni makina eklerken "Kiti Uygula" ile bu liste otomatik dolar.
              </div>
              <SearchPick items={parts.filter(p => p.models?.includes(mForm.model))} getLabel={p => p.ad} getKey={p => p.id} placeholder="Parça ekle..."
                onPick={p => setMForm(prev => {
                  const existing = (prev.defaultParcalar || []).find(x => String(x.partId) === String(p.id));
                  if (existing) return prev;
                  return { ...prev, defaultParcalar: [...(prev.defaultParcalar || []), { partId: String(p.id), ad: p.ad, miktar: 1 }] };
                })} />
              {(mForm.defaultParcalar || []).length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {(mForm.defaultParcalar || []).map((row, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 32px", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8" }}>{row.ad}</span>
                      <input type="number" min="1" value={row.miktar}
                        onChange={e => setMForm(prev => {
                          const arr = [...prev.defaultParcalar];
                          arr[i] = { ...arr[i], miktar: parseInt(e.target.value) || 1 };
                          return { ...prev, defaultParcalar: arr };
                        })}
                        style={{ padding: "5px 8px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#f8fafc", textAlign: "center", fontFamily: "inherit" }} />
                      <button type="button"
                        onClick={() => setMForm(prev => ({ ...prev, defaultParcalar: prev.defaultParcalar.filter((_, idx) => idx !== i) }))}
                        style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>🗑</button>
                    </div>
                  ))}
                </div>
              )}
            </Field>
          )}

      <div style={{ position: "sticky", bottom: 0, display: "flex", gap: 8, justifyContent: "flex-end", padding: "12px 0", marginTop: 12, background: "rgba(248,250,252,.94)", borderTop: "1px solid #e2e8f0", backdropFilter: "blur(4px)" }}>
            <Btn variant="ghost" onClick={() => setModelModal(null)}>İptal</Btn>
            <Btn onClick={saveModel}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>
        </Modal>
      )}
    </div>
  );
};
