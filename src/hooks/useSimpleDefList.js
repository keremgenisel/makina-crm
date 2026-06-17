import { useState } from "react";

// KalipManager ve PartManager neredeyse aynı: "ad" alanlı basit bir liste için
// ekle/satır-içi düzenle/sil akışı. Tek farkları ID üretim stratejisi ve
// gösterilen toast metinleri — bunlar parametre olarak verilir.
export function useSimpleDefList({ items, setItems, genId, showToast = () => {}, emptyForm = { ad: "" }, addMsg, editMsg, deleteMsg }) {
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDel, setConfirmDel] = useState(null);

  const add = () => {
    const yeniId = genId(items);
    const ad = form.ad.trim();
    setItems(p => p.some(x => x.id === yeniId) ? p : [...p, { id: yeniId, ad }]);
    setForm(emptyForm);
    showToast(addMsg);
  };
  const startEdit = (item) => { setEditId(item.id); setEditForm({ ad: item.ad }); };
  const cancelEdit = () => setEditId(null);
  const saveEdit = () => {
    setItems(p => p.map(x => x.id === editId ? { ...x, ad: editForm.ad } : x));
    setEditId(null);
    showToast(editMsg);
  };
  const requestDelete = (item) => setConfirmDel(item);
  const cancelDelete = () => setConfirmDel(null);
  const confirmDelete = () => {
    setItems(p => p.filter(x => x.id !== confirmDel.id));
    setConfirmDel(null);
    showToast(deleteMsg);
  };

  return { form, setForm, editId, editForm, setEditForm, confirmDel, add, startEdit, cancelEdit, saveEdit, requestDelete, cancelDelete, confirmDelete };
}
