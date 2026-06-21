import { bumpId, uid } from "../lib/utils";
import { Icon, Input, Warn, Btn, ConfirmDialog } from "./ui";
import { useSimpleDefList } from "../hooks/useSimpleDefList";

export const KalipManager = ({ kalipDefs, setKalipDefs, showToast = () => {} }) => {
  const { form, setForm, editId, editForm, setEditForm, confirmDel, add, startEdit, cancelEdit, saveEdit, requestDelete, cancelDelete, confirmDelete } =
    useSimpleDefList({
      items: kalipDefs,
      setItems: setKalipDefs,
      genId: (items) => { bumpId(items); return uid(); },
      showToast,
      emptyForm: { ad: "", olcu: "" },
      addMsg: "Kalıp modeli kaydedildi.",
      editMsg: "Kalıp modeli düzenlendi.",
      deleteMsg: "Kalıp modeli silindi.",
    });

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 250px" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 4 }}>Kalıp Adı</div>
          <Input value={form.ad} onChange={e => setForm(p => ({ ...p, ad: e.target.value }))} placeholder="Örn: Adana Köfte" />
          <Warn>{!form.ad.trim() ? "Kalıp adı girilmedi" : ""}</Warn>
        </div>
        <div>
          <div style={{ fontSize: 12, marginBottom: 4, visibility: "hidden" }}>_</div>
          <Btn onClick={add}><Icon name="plus" size={14} /> Ekle</Btn>
        </div>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        {kalipDefs.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Henüz kalıp tanımı yok.</div>}
        {kalipDefs.map(k => (
          <div key={k.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", borderBottom: "1px solid #f1f5f9" }}>
            {editId === k.id ? (
              <div style={{ display: "flex", gap: 8, flex: 1, marginRight: 10 }}>
                <Input value={editForm.ad} onChange={e => setEditForm(p => ({ ...p, ad: e.target.value }))} />
              </div>
            ) : (
              <div>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{k.ad}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              {editId === k.id ? (
                <>
                  <Btn small onClick={saveEdit}><Icon name="check" size={12} /></Btn>
                  <Btn small variant="ghost" onClick={cancelEdit}>İptal</Btn>
                </>
              ) : (
                <>
                  <Btn small variant="ghost" onClick={() => startEdit(k)}><Icon name="edit" size={12} /></Btn>
                  <Btn small variant="danger" onClick={() => requestDelete(k)}><Icon name="trash" size={12} /></Btn>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {confirmDel && (
        <ConfirmDialog
          message={`"${confirmDel.ad}" kalıbı silinecek. Bu işlem geri alınamaz.`}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </div>
  );
};
