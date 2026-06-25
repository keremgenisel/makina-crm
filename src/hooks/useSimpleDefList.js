import { useState } from "react";
import { trLower, withDeleted } from "../lib/utils";

// KalipManager ve PartManager neredeyse aynı: "ad" alanlı basit bir liste için
// ekle/satır-içi düzenle/sil akışı. Tek farkları ID üretim stratejisi ve
// gösterilen toast metinleri — bunlar parametre olarak verilir.
export function useSimpleDefList({ items, setItems, genId, showToast = () => {}, emptyForm = { ad: "" }, addMsg, editMsg, deleteMsg, onRename }) {
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDel, setConfirmDel] = useState(null);

  // Dönüş değeri (true/false) modal tabanlı ekranların "kaydet başarılıysa modalı kapat,
  // çakışma varsa açık tut ki kullanıcı adı düzeltsin" mantığı için kullanılır.
  const add = () => {
    const ad = form.ad.trim();
    if (!ad) return false;
    if (items.some(x => trLower(x.ad) === trLower(ad))) { showToast(`"${ad}" zaten tanımlı.`, "err"); return false; }
    const yeniId = genId(items);
    setItems(p => p.some(x => x.id === yeniId) ? p : [...p, { ...form, id: yeniId, ad }]);
    setForm(emptyForm);
    showToast(addMsg);
    return true;
  };
  const startEdit = (item) => { setEditId(item.id); setEditForm({ ...item }); };
  const cancelEdit = () => setEditId(null);
  const saveEdit = () => {
    const ad = editForm.ad.trim();
    if (!ad) return;
    if (items.some(x => x.id !== editId && trLower(x.ad) === trLower(ad))) { showToast(`"${ad}" zaten tanımlı.`, "err"); return; }
    const oldAd = items.find(x => x.id === editId)?.ad;
    setItems(p => p.map(x => x.id === editId ? { ...x, ...editForm, ad } : x));
    setEditId(null);
    // Ad gerçekten değiştiyse, bu adı düz metin olarak kopyalamış diğer kayıtları da güncelle
    // (bkz. SimpleDealers.jsx'teki bayi adı düzenleme deseni) — yoksa eski ad geçmiş kayıtlarda kalır.
    if (onRename && oldAd && oldAd !== ad) {
      onRename(oldAd, ad);
      showToast(`${editMsg} "${oldAd}" adı geçmiş kayıtlarda da güncellendi.`);
    } else {
      showToast(editMsg);
    }
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
