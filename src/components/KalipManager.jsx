import { useState } from "react";
import { bumpId, uid } from "../lib/utils";
import { Icon, Field, Input, Warn, Btn, Modal, ConfirmDialog, Pagination } from "./ui";
import { useSimpleDefList } from "../hooks/useSimpleDefList";
import { useFilteredList } from "../hooks/useFilteredList";

const PER_PAGE = 10;

export const KalipManager = ({ kalipDefs, setKalipDefs, showToast = () => {}, setCustomers = null, setPartSales = null }) => {
  const emptyForm = { ad: "", kod: "", urunAdi: "", urunAdiEN: "", tanim: "", tanimEN: "" };
  const { form, setForm, editId, editForm, setEditForm, confirmDel, add, startEdit, cancelEdit, saveEdit, requestDelete, cancelDelete, confirmDelete } =
    useSimpleDefList({
      items: kalipDefs,
      setItems: setKalipDefs,
      genId: (items) => { bumpId(items); return uid(); },
      showToast,
      emptyForm,
      addMsg: "Kalıp modeli kaydedildi.",
      editMsg: "Kalıp modeli düzenlendi.",
      deleteMsg: "Kalıp modeli silindi.",
      // Kalıp adı düz metin olarak customers[].kaliplar[].ad (+ eski tekil .kalip) ve partSales[].ad'da
      // kopyalanmış durumda — adı düzeltince bu kayıtlarda da güncellenmeli, yoksa eski ad geçmişte kalır.
      onRename: (oldAd, newAd) => {
        setCustomers?.(p => p.map(c => {
          const kaliplarEsleser = c.kaliplar?.some(k => k.ad === oldAd);
          if (!kaliplarEsleser && c.kalip !== oldAd) return c;
          return {
            ...c,
            kaliplar: kaliplarEsleser ? c.kaliplar.map(k => k.ad === oldAd ? { ...k, ad: newAd } : k) : c.kaliplar,
            kalip: c.kalip === oldAd ? newAd : c.kalip,
          };
        }));
        setPartSales?.(p => p.map(ps => (ps.tur === "Kalıp" && ps.ad === oldAd) ? { ...ps, ad: newAd } : ps));
      },
    });
  const [addOpen, setAddOpen] = useState(false);
  const { search, setSearch, page, setPage, filtered, paged } = useFilteredList(kalipDefs, { searchFields: ["ad"], perPage: PER_PAGE });

  const openAdd = () => { setForm(emptyForm); setAddOpen(true); };
  const submitAdd = () => { if (add()) setAddOpen(false); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn onClick={openAdd}><Icon name="plus" size={14} /> Yeni Kalıp Ekle</Btn>
      </div>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kalıp ara..."
          style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            {kalipDefs.length === 0 ? "Henüz kalıp tanımı yok." : "Arama sonucu bulunamadı."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>Kalıp Adı</th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>Kod</th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>Ürün Adı / Tanım</th>
                <th style={{ padding: "8px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#475569" }}></th>
              </tr>
            </thead>
            <tbody>
              {paged.map(k => (
                <tr key={k.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{k.ad}</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748b" }}>{k.kod || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11 }}>
                    <span style={{ color: k.urunAdi ? "#16a34a" : "#cbd5e1" }}>TR</span>
                    {" · "}
                    <span style={{ color: k.urunAdiEN ? "#16a34a" : "#cbd5e1" }}>EN</span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <Btn small variant="ghost" onClick={() => startEdit(k)}><Icon name="edit" size={12} /></Btn>
                      <Btn small variant="danger" onClick={() => requestDelete(k)}><Icon name="trash" size={12} /></Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination total={filtered.length} page={page} setPage={setPage} perPage={PER_PAGE} />

      {confirmDel && (
        <ConfirmDialog
          message={`"${confirmDel.ad}" kalıbı Çöp Kutusu'na taşınacak — Ayarlar'dan 30 gün içinde geri alabilirsiniz.`}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      {addOpen && (
        <Modal title="Yeni Kalıp Ekle" onClose={() => setAddOpen(false)}>
          <Field label="Kalıp Adı">
            <Input value={form.ad} onChange={e => setForm(p => ({ ...p, ad: e.target.value }))} placeholder="Örn: Adana Köfte" />
            <Warn>{!form.ad.trim() ? "Kalıp adı girilmedi" : ""}</Warn>
          </Field>
          <Field label="Kod">
            <Input value={form.kod || ""} onChange={e => setForm(p => ({ ...p, kod: e.target.value }))} placeholder="Örn: KF-ADA-001" />
          </Field>
          <Field label="Ürün Adı (TR) — Teklif ve proformada görünür">
            <Input value={form.urunAdi || ""} onChange={e => setForm(p => ({ ...p, urunAdi: e.target.value }))} placeholder="Örn: Adana Köfte Kalıbı" />
          </Field>
          <Field label="Ürün Adı (EN) — Proforma ve yurtdışı teklifler için">
            <Input value={form.urunAdiEN || ""} onChange={e => setForm(p => ({ ...p, urunAdiEN: e.target.value }))} placeholder="Örn: Adana Kebab Mold" />
          </Field>
          <Field label="Tanım (TR)">
            <textarea value={form.tanim || ""} onChange={e => setForm(p => ({ ...p, tanim: e.target.value }))}
              placeholder="Teknik özellikler, boyutlar vb."
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", minHeight: 72, background: "#f8fafc", outline: "none" }} />
          </Field>
          <Field label="Tanım (EN)">
            <textarea value={form.tanimEN || ""} onChange={e => setForm(p => ({ ...p, tanimEN: e.target.value }))}
              placeholder="Technical specifications, dimensions etc."
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", minHeight: 72, background: "#f8fafc", outline: "none" }} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setAddOpen(false)}>İptal</Btn>
            <Btn onClick={submitAdd}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}

      {editId !== null && (
        <Modal title="Kalıbı Düzenle" onClose={cancelEdit}>
          <Field label="Kalıp Adı">
            <Input value={editForm.ad || ""} onChange={e => setEditForm(p => ({ ...p, ad: e.target.value }))} placeholder="Örn: Adana Köfte" />
            <Warn>{!(editForm.ad || "").trim() ? "Kalıp adı girilmedi" : ""}</Warn>
          </Field>
          <Field label="Kod">
            <Input value={editForm.kod || ""} onChange={e => setEditForm(p => ({ ...p, kod: e.target.value }))} placeholder="Örn: KF-ADA-001" />
          </Field>
          <Field label="Ürün Adı (TR) — Teklif ve proformada görünür">
            <Input value={editForm.urunAdi || ""} onChange={e => setEditForm(p => ({ ...p, urunAdi: e.target.value }))} placeholder="Örn: Adana Köfte Kalıbı" />
          </Field>
          <Field label="Ürün Adı (EN) — Proforma ve yurtdışı teklifler için">
            <Input value={editForm.urunAdiEN || ""} onChange={e => setEditForm(p => ({ ...p, urunAdiEN: e.target.value }))} placeholder="Örn: Adana Kebab Mold" />
          </Field>
          <Field label="Tanım (TR)">
            <textarea value={editForm.tanim || ""} onChange={e => setEditForm(p => ({ ...p, tanim: e.target.value }))}
              placeholder="Teknik özellikler, boyutlar vb."
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", minHeight: 72, background: "#f8fafc", outline: "none" }} />
          </Field>
          <Field label="Tanım (EN)">
            <textarea value={editForm.tanimEN || ""} onChange={e => setEditForm(p => ({ ...p, tanimEN: e.target.value }))}
              placeholder="Technical specifications, dimensions etc."
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", minHeight: 72, background: "#f8fafc", outline: "none" }} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={cancelEdit}>İptal</Btn>
            <Btn onClick={saveEdit}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
