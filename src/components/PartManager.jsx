import { useState } from "react";
import { parcaAdi, parseMoney, fmtCur } from "../lib/utils";
import { CUR_SYM } from "../lib/constants";
import { Icon, Field, Input, Warn, MoneyInput, Btn, Modal, ConfirmDialog, Pagination } from "./ui";
import { useSimpleDefList } from "../hooks/useSimpleDefList";
import { useFilteredList } from "../hooks/useFilteredList";

const PER_PAGE = 10;

// PartManager içinde tanımlanırsa her render'da yeni bir component referansı oluşur ve React
// içindeki input'ları unmount/remount eder — bu da her tuşa basışta focus kaybına yol açar
// (bir rakam girip tekrar tıklamak gerekir). Bu yüzden bileşen dışında, sabit referansla tutulur.
const PriceFields = ({ value, onChange }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
    <MoneyInput value={value.fiyatTRY} sym={CUR_SYM.TRY} onChange={v => onChange({ ...value, fiyatTRY: v })} />
    <MoneyInput value={value.fiyatUSD} sym={CUR_SYM.USD} onChange={v => onChange({ ...value, fiyatUSD: v })} />
    <MoneyInput value={value.fiyatEUR} sym={CUR_SYM.EUR} onChange={v => onChange({ ...value, fiyatEUR: v })} />
  </div>
);

export const PartManager = ({ parts = [], setParts, showToast = () => {}, setServices = null }) => {
  const emptyForm = { ad: "", fiyatTRY: "", fiyatUSD: "", fiyatEUR: "" };
  const { form, setForm, editId, editForm, setEditForm, confirmDel, add, startEdit, cancelEdit, saveEdit, requestDelete, cancelDelete, confirmDelete } =
    useSimpleDefList({
      items: parts,
      setItems: setParts,
      genId: () => Date.now(),
      showToast,
      emptyForm,
      addMsg: "Yedek parça tanımı kaydedildi.",
      editMsg: "Yedek parça düzenlendi.",
      deleteMsg: "Yedek parça tanımı silindi.",
      // Parça adı düz metin olarak services[].degisenParcalar[].ad'da kopyalanmış durumda —
      // adı düzeltince geçmiş servis kayıtlarında da güncellenmeli.
      onRename: (oldAd, newAd) => setServices?.(p => p.map(s =>
        Array.isArray(s.degisenParcalar) && s.degisenParcalar.some(x => parcaAdi(x) === oldAd)
          ? { ...s, degisenParcalar: s.degisenParcalar.map(x => parcaAdi(x) === oldAd ? { ad: newAd, fiyat: typeof x === "string" ? "" : x.fiyat } : x) }
          : s
      )),
    });
  const [addOpen, setAddOpen] = useState(false);
  const { search, setSearch, page, setPage, filtered, paged } = useFilteredList(parts, { searchFields: ["ad"], perPage: PER_PAGE });

  // Tanımlı fiyatların özet gösterimi — hiçbiri girilmemişse "—"
  const priceSummary = (p) => {
    const bits = [];
    if (parseMoney(p.fiyatTRY) > 0) bits.push(fmtCur(parseMoney(p.fiyatTRY), "TRY"));
    if (parseMoney(p.fiyatUSD) > 0) bits.push(fmtCur(parseMoney(p.fiyatUSD), "USD"));
    if (parseMoney(p.fiyatEUR) > 0) bits.push(fmtCur(parseMoney(p.fiyatEUR), "EUR"));
    return bits.length ? bits.join(" · ") : "—";
  };

  const openAdd = () => { setForm(emptyForm); setAddOpen(true); };
  const submitAdd = () => { if (add()) setAddOpen(false); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn onClick={openAdd}><Icon name="plus" size={14} /> Yeni Yedek Parça Ekle</Btn>
      </div>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Yedek parça ara..."
          style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            {parts.length === 0 ? "Henüz yedek parça tanımı yok." : "Arama sonucu bulunamadı."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>Yedek Parça Adı</th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>Fiyat</th>
                <th style={{ padding: "8px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#475569" }}></th>
              </tr>
            </thead>
            <tbody>
              {paged.map(k => (
                <tr key={k.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{k.ad}</span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: 13, color: "#475569" }}>{priceSummary(k)}</span>
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
          message={`"${confirmDel.ad}" yedek parça tanımı Çöp Kutusu'na taşınacak (30 gün içinde geri alınabilir). Daha önce verilmiş kayıtlar geçmişte kalır.`}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      {addOpen && (
        <Modal title="Yeni Yedek Parça Ekle" onClose={() => setAddOpen(false)}>
          <Field label="Yedek Parça Adı">
            <Input value={form.ad} onChange={e => setForm(p => ({ ...p, ad: e.target.value }))} placeholder="Örn: Kesme Bıçağı Seti" />
            <Warn>{!form.ad.trim() ? "Yedek parça adı girilmedi" : ""}</Warn>
          </Field>
          <Field label="Fiyat (TL / USD / EUR — opsiyonel)">
            <PriceFields value={form} onChange={setForm} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setAddOpen(false)}>İptal</Btn>
            <Btn onClick={submitAdd}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}

      {editId !== null && (
        <Modal title="Yedek Parçayı Düzenle" onClose={cancelEdit}>
          <Field label="Yedek Parça Adı">
            <Input value={editForm.ad || ""} onChange={e => setEditForm(p => ({ ...p, ad: e.target.value }))} placeholder="Örn: Kesme Bıçağı Seti" />
            <Warn>{!(editForm.ad || "").trim() ? "Yedek parça adı girilmedi" : ""}</Warn>
          </Field>
          <Field label="Fiyat (TL / USD / EUR — opsiyonel)">
            <PriceFields value={editForm} onChange={setEditForm} />
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
