import { useState } from "react";
import { Icon, Input, Warn, Btn, ConfirmDialog, Pagination } from "./ui";
import { useSimpleDefList } from "../hooks/useSimpleDefList";

const PER_PAGE = 10;

export const PartManager = ({ parts = [], setParts, showToast = () => {} }) => {
  const { form, setForm, editId, editForm, setEditForm, confirmDel, add, startEdit, cancelEdit, saveEdit, requestDelete, cancelDelete, confirmDelete } =
    useSimpleDefList({
      items: parts,
      setItems: setParts,
      genId: () => Date.now(),
      showToast,
      emptyForm: { ad: "" },
      addMsg: "Yedek parça tanımı kaydedildi.",
      editMsg: "Yedek parça düzenlendi.",
      deleteMsg: "Yedek parça tanımı silindi.",
    });
  const [page, setPage] = useState(1);
  // Ekleme/silme sonrası toplam sayfa azalırsa son kalan sayfaya düş — yoksa boş bir sayfada kalınabilir
  const totalPages = Math.max(1, Math.ceil(parts.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = parts.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 250px" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 4 }}>Yedek Parça Adı</div>
          <Input value={form.ad} onChange={e => setForm(p => ({ ...p, ad: e.target.value }))} placeholder="Örn: Kesme Bıçağı Seti" />
          <Warn>{!form.ad.trim() ? "Yedek parça adı girilmedi" : ""}</Warn>
        </div>
        <div>
          <div style={{ fontSize: 12, marginBottom: 4, visibility: "hidden" }}>_</div>
          <Btn onClick={add}><Icon name="plus" size={14} /> Ekle</Btn>
        </div>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        {parts.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Henüz yedek parça tanımı yok.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>Yedek Parça Adı</th>
                <th style={{ padding: "8px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#475569" }}></th>
              </tr>
            </thead>
            <tbody>
              {paged.map(k => (
                <tr key={k.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 14px" }}>
                    {editId === k.id ? (
                      <Input value={editForm.ad} onChange={e => setEditForm(p => ({ ...p, ad: e.target.value }))} />
                    ) : (
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{k.ad}</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination total={parts.length} page={safePage} setPage={setPage} perPage={PER_PAGE} />

      {confirmDel && (
        <ConfirmDialog
          message={`"${confirmDel.ad}" yedek parça tanımı Çöp Kutusu'na taşınacak (30 gün içinde geri alınabilir). Daha önce verilmiş kayıtlar geçmişte kalır.`}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </div>
  );
};
