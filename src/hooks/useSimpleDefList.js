import { useState } from "react";
import { trLower, withDeleted } from "../lib/utils";

// KalipManager ve PartManager neredeyse aynı: "ad" alanlı basit bir liste için
// ekle/satır-içi düzenle/sil akışı. Tek farkları ID üretim stratejisi ve
// gösterilen toast metinleri — bunlar parametre olarak verilir.
// Spec 0087 R15/2 (plan P3, P4): `add` başarıda yeni kaydın, `saveEdit` düzenlenen kaydın KİMLİĞİNİ döner (ikisi de sıfırdan
// büyük; başarısızlıkta false). Kanca üç panelde paylaşılıyor (KalipManager, PartManager, CalisanManager);
// dönüşü yalnız PartManager kullanır (kit yazımı kayıt gerçekten yazıldıysa yapılır). `hazirla(kayit)` yazılacak kaydı son
// hâline getirir (varsayılan değiştirmeden geçirir): parça paneli maliyetin ham metnini sayıya çevirir, boşsa alanı siler.
const AYNEN = (x) => x;
export function useSimpleDefList({ items, setItems, genId, showToast = () => {}, emptyForm = { ad: "" }, addMsg, editMsg, deleteMsg, onRename, hazirla = AYNEN }) {
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDel, setConfirmDel] = useState(null);

  // Dönüş değeri (kimlik/false) modal tabanlı ekranların "kaydet başarılıysa modalı kapat,
  // çakışma varsa açık tut ki kullanıcı adı düzeltsin" mantığı için kullanılır.
  const add = () => {
    const ad = form.ad.trim();
    if (!ad) return false;
    if (items.some(x => trLower(x.ad) === trLower(ad))) { showToast(`"${ad}" zaten tanımlı.`, "err"); return false; }
    const yeniId = genId(items);
    setItems(p => p.some(x => x.id === yeniId) ? p : [...p, hazirla({ ...form, id: yeniId, ad })]);
    setForm(emptyForm);
    showToast(addMsg);
    return yeniId;
  };
  const startEdit = (item) => { setEditId(item.id); setEditForm({ ...item }); };
  const cancelEdit = () => setEditId(null);
  const saveEdit = () => {
    const ad = editForm.ad.trim();
    if (!ad) return false;
    if (items.some(x => x.id !== editId && trLower(x.ad) === trLower(ad))) { showToast(`"${ad}" zaten tanımlı.`, "err"); return false; }
    const oldAd = items.find(x => x.id === editId)?.ad;
    const duzenlenen = editId;
    setItems(p => p.map(x => x.id === editId ? hazirla({ ...x, ...editForm, ad }) : x));
    setEditId(null);
    // Ad gerçekten değiştiyse, bu adı düz metin olarak kopyalamış diğer kayıtları da güncelle
    // (bkz. SimpleDealers.jsx'teki bayi adı düzenleme deseni) — yoksa eski ad geçmiş kayıtlarda kalır.
    if (onRename && oldAd && oldAd !== ad) {
      onRename(oldAd, ad);
      showToast(`${editMsg} "${oldAd}" adı geçmiş kayıtlarda da güncellendi.`);
    } else {
      showToast(editMsg);
    }
    return duzenlenen;
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
