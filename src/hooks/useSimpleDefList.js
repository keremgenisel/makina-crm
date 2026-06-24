import { useState } from "react";
import { trLower, withDeleted } from "../lib/utils";

// KalipManager ve PartManager neredeyse aynı: "ad" alanlı basit bir liste için
// ekle/satır-içi düzenle/sil akışı. Tek farkları ID üretim stratejisi ve
// gösterilen toast metinleri — bunlar parametre olarak verilir.
export function useSimpleDefList({ items, setItems, genId, showToast = () => {}, emptyForm = { ad: "" }, addMsg, editMsg, deleteMsg }) {
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDel, setConfirmDel] = useState(null);

  const add = () => {
    const ad = form.ad.trim();
    if (!ad) return;
    if (items.some(x => trLower(x.ad) === trLower(ad))) { showToast(`"${ad}" zaten tanımlı.`, "err"); return; }
    const yeniId = genId(items);
    setItems(p => p.some(x => x.id === yeniId) ? p : [...p, { id: yeniId, ad }]);
    setForm(emptyForm);
    showToast(addMsg);
  };
  const startEdit = (item) => { setEditId(item.id); setEditForm({ ad: item.ad }); };
  const cancelEdit = () => setEditId(null);
  const saveEdit = () => {
    const ad = editForm.ad.trim();
    if (!ad) return;
    if (items.some(x => x.id !== editId && trLower(x.ad) === trLower(ad))) { showToast(`"${ad}" zaten tanımlı.`, "err"); return; }
    setItems(p => p.map(x => x.id === editId ? { ...x, ad } : x));
    setEditId(null);
    showToast(editMsg);
  };
  const requestDelete = (item) => setConfirmDel(item);
  const cancelDelete = () => setConfirmDel(null);
  const confirmDelete = () => {
    setItems(p => withDeleted(p, x => x.id === confirmDel.id));
    setConfirmDel(null);
    showToast(deleteMsg);
  };

  return { form, setForm, editId, editForm, setEditForm, confirmDel, add, startEdit, cancelEdit, saveEdit, requestDelete, cancelDelete, confirmDelete };
}
