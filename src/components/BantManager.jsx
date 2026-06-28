import { useState } from "react";
import { parseMoney, fmtCur, withDeleted, uid } from "../lib/utils";
import { CUR_SYM } from "../lib/constants";
import { Icon, Field, Input, Warn, MoneyInput, Btn, Modal, ConfirmDialog, Pagination } from "./ui";
import { useFilteredList } from "../hooks/useFilteredList";

const PER_PAGE = 10;

const empty = { ad: "", adEN: "", kod: "", tanim: "", tanimEN: "", en: "", boy: "", fiyatTRY: "", fiyatUSD: "", fiyatEUR: "" };

const PriceFields = ({ value, onChange }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
    <MoneyInput value={value.fiyatTRY} sym={CUR_SYM.TRY} onChange={v => onChange({ ...value, fiyatTRY: v })} />
    <MoneyInput value={value.fiyatUSD} sym={CUR_SYM.USD} onChange={v => onChange({ ...value, fiyatUSD: v })} />
    <MoneyInput value={value.fiyatEUR} sym={CUR_SYM.EUR} onChange={v => onChange({ ...value, fiyatEUR: v })} />
  </div>
);

const priceSummary = (b) => {
  const bits = [];
  if (parseMoney(b.fiyatTRY) > 0) bits.push(fmtCur(parseMoney(b.fiyatTRY), "TRY"));
  if (parseMoney(b.fiyatUSD) > 0) bits.push(fmtCur(parseMoney(b.fiyatUSD), "USD"));
  if (parseMoney(b.fiyatEUR) > 0) bits.push(fmtCur(parseMoney(b.fiyatEUR), "EUR"));
  return bits.length ? bits.join(" · ") : "—";
};

export const BantManager = ({
  bantlar = [], setBantlar,
  showToast = () => {},
}) => {
  const [modal, setModal] = useState(null); // null | "add" | { edit: bant }
  const [form, setForm] = useState(empty);
  const [confirmDel, setConfirmDel] = useState(null);

  const { search, setSearch, page, setPage, filtered, paged } = useFilteredList(bantlar, {
    searchFields: ["ad", "en", "boy"],
    perPage: PER_PAGE,
  });

  const openAdd = () => { setForm(empty); setModal("add"); };
  const openEdit = (b) => { setForm({ ...b }); setModal({ edit: b }); };

  const save = () => {
    const ad = (form.ad || "").trim();
    if (!ad) return;
    if (modal === "add") {
      const newId = uid();
      setBantlar(p => [...p, { ...form, id: newId, ad }]);
      showToast("Bant tanımı kaydedildi.");
    } else {
      setBantlar(p => p.map(b => b.id === modal.edit.id ? { ...b, ...form, ad } : b));
      showToast("Bant tanımı düzenlendi.");
    }
    setModal(null);
  };

  const doDelete = () => {
    setBantlar(p => withDeleted(p, b => b.id === confirmDel.id));
    setConfirmDel(null);
    showToast("Bant tanımı silindi.");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn onClick={openAdd}><Icon name="plus" size={14} /> Yeni Bant Ekle</Btn>
      </div>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Bant ara..."
          style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            {bantlar.length === 0 ? "Henüz bant tanımı yok." : "Arama sonucu bulunamadı."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Bant Adı", "Kod", "Ad / Tanım", "Ölçü (En×Boy)", "Fiyat", ""].map(h => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: h === "" ? "right" : "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map(b => (
                <tr key={b.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 700, fontSize: 14 }}>{b.ad}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748b" }}>{b.kod || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11 }}>
                    <span style={{ color: b.adEN ? "#16a34a" : "#cbd5e1" }}>TR</span>
                    {" · "}
                    <span style={{ color: b.adEN ? "#16a34a" : "#cbd5e1" }}>EN</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "#475569" }}>
                    {b.en && b.boy ? `${b.en} × ${b.boy}` : (b.en || b.boy || "—")}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "#475569" }}>{priceSummary(b)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <Btn small variant="ghost" onClick={() => openEdit(b)}><Icon name="edit" size={12} /></Btn>
                      <Btn small variant="danger" onClick={() => setConfirmDel(b)}><Icon name="trash" size={12} /></Btn>
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
          message={`"${confirmDel.ad}" bant tanımı Çöp Kutusu'na taşınacak (30 gün içinde geri alınabilir).`}
          onConfirm={doDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {modal && (
        <Modal title={modal === "add" ? "Yeni Bant Ekle" : "Bant Tanımını Düzenle"} onClose={() => setModal(null)}>
          <Field label="Bant Adı (TR)">
            <Input value={form.ad || ""} onChange={e => setForm(p => ({ ...p, ad: e.target.value }))} placeholder="Örn: Standart Bant" />
            <Warn>{!(form.ad || "").trim() ? "Bant adı girilmedi" : ""}</Warn>
          </Field>
          <Field label="Bant Adı (EN) — Proforma ve yurtdışı teklifler için">
            <Input value={form.adEN || ""} onChange={e => setForm(p => ({ ...p, adEN: e.target.value }))} placeholder="Örn: Standard Belt" />
          </Field>
          <Field label="Kod">
            <Input value={form.kod || ""} onChange={e => setForm(p => ({ ...p, kod: e.target.value }))} placeholder="Örn: BNT-001" />
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="En">
              <Input value={form.en || ""} onChange={e => setForm(p => ({ ...p, en: e.target.value }))} placeholder="Örn: 60 mm" />
            </Field>
            <Field label="Boy">
              <Input value={form.boy || ""} onChange={e => setForm(p => ({ ...p, boy: e.target.value }))} placeholder="Örn: 1200 mm" />
            </Field>
          </div>
          <Field label="Fiyat (TL / USD / EUR — opsiyonel)">
            <PriceFields value={form} onChange={setForm} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>İptal</Btn>
            <Btn onClick={save}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
