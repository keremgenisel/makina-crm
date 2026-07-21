import { uid } from "../lib/utils";
import { Icon, Field, Input, Warn, Btn, Modal, ConfirmDialog } from "./ui";
import { useSimpleDefList } from "../hooks/useSimpleDefList";

// Firma çalışanları (ad soyad). Servis Panosu kartlarındaki ve servis formundaki "teknisyen"
// seçicisini besler. Basit {id, ad} listesi; KalipManager/PartManager ile aynı desen (soft-delete).
// Ad düz metin olarak services[].tech'te tutulduğundan, ad düzeltilince o servisler de güncellenir.
export const CalisanManager = ({ calisanlar = [], setCalisanlar, setServices = null, showToast = () => {} }) => {
  const emptyForm = { ad: "" };
  const { form, setForm, editId, editForm, setEditForm, confirmDel, add, startEdit, cancelEdit, saveEdit, requestDelete, cancelDelete, confirmDelete } =
    useSimpleDefList({
      items: calisanlar,
      setItems: setCalisanlar,
      genId: () => uid(),
      showToast,
      emptyForm,
      addMsg: "Çalışan eklendi.",
      editMsg: "Çalışan güncellendi.",
      deleteMsg: "Çalışan silindi.",
      onRename: (oldAd, newAd) => setServices?.(p => p.map(s => s.tech === oldAd ? { ...s, tech: newAd } : s)),
    });

  const submitAdd = () => { add(); };

  return (
    <div>
      {/* Satır içi ekleme */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Input value={form.ad} onChange={e => setForm(p => ({ ...p, ad: e.target.value }))}
          onKeyDown={e => { if (e.key === "Enter") submitAdd(); }} placeholder="Ad Soyad" />
        <Btn onClick={submitAdd}><Icon name="plus" size={14} /> Ekle</Btn>
      </div>

      <div style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, overflow: "hidden" }}>
        {calisanlar.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--n400, #94a3b8)", fontSize: 13 }}>
            Henüz çalışan eklenmedi. Üstteki kutuya ad soyad yazıp "Ekle" deyin.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {calisanlar.map(c => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--n150, #f1f5f9)" }}>
                  <td style={{ padding: "11px 14px", fontWeight: 600, fontSize: 14 }}>
                    {c.ad}
                  </td>
                  <td style={{ padding: "8px 14px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <Btn small variant="ghost" onClick={() => startEdit(c)}><Icon name="edit" size={12} /></Btn>
                      <Btn small variant="danger" onClick={() => requestDelete(c)}><Icon name="trash" size={12} /></Btn>
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
          message={`"${confirmDel.ad}" çalışanı Çöp Kutusu'na taşınacak — Ayarlar'dan 30 gün içinde geri alabilirsiniz. (Geçmiş servislerdeki teknisyen adı korunur.)`}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      {editId !== null && (
        <Modal title="Çalışanı Düzenle" onClose={cancelEdit}
          footer={<><Btn variant="ghost" onClick={cancelEdit}>İptal</Btn><Btn onClick={saveEdit}><Icon name="check" size={14} /> Kaydet</Btn></>}>
          <Field label="Ad Soyad">
            <Input value={editForm.ad || ""} onChange={e => setEditForm(p => ({ ...p, ad: e.target.value }))} placeholder="Ad Soyad" />
            <Warn>{!(editForm.ad || "").trim() ? "Ad girilmedi" : ""}</Warn>
          </Field>
        </Modal>
      )}
    </div>
  );
};
