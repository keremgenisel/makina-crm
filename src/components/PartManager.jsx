import { useState } from "react";
import { parcaAdi, parseMoney, fmtCur } from "../lib/utils";
import { CUR_SYM } from "../lib/constants";
import { Icon, Field, Input, Warn, MoneyInput, Btn, Modal, ConfirmDialog, Pagination, ImageUpload } from "./ui";
import { useSimpleDefList } from "../hooks/useSimpleDefList";
import { useFilteredList } from "../hooks/useFilteredList";

const PER_PAGE = 10;

// PartManager içinde tanımlanırsa her render'da yeni bir component referansı oluşur ve React
// içindeki input'ları unmount/remount eder — bu da her tuşa basışta focus kaybına yol açar
const PriceFields = ({ value, onChange }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
    <MoneyInput value={value.fiyatTRY} sym={CUR_SYM.TRY} onChange={v => onChange({ ...value, fiyatTRY: v })} />
    <MoneyInput value={value.fiyatUSD} sym={CUR_SYM.USD} onChange={v => onChange({ ...value, fiyatUSD: v })} />
    <MoneyInput value={value.fiyatEUR} sym={CUR_SYM.EUR} onChange={v => onChange({ ...value, fiyatEUR: v })} />
  </div>
);

const ModelChips = ({ selected = [], allModels = [], onChange }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
    {allModels.length === 0 && (
      <span style={{ fontSize: 12, color: "#94a3b8" }}>Henüz makina modeli tanımlanmamış.</span>
    )}
    {allModels.map(m => {
      const name = typeof m === "string" ? m : m.model;
      const active = selected.includes(name);
      return (
        <button key={name} type="button" onClick={() => onChange(active ? selected.filter(x => x !== name) : [...selected, name])}
          style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid",
            background: active ? "#fff7ed" : "#f8fafc",
            borderColor: active ? "#fb923c" : "#e2e8f0",
            color: active ? "#c2410c" : "#64748b",
          }}>
          {name}
        </button>
      );
    })}
  </div>
);

const ModelBadges = ({ models = [] }) => {
  if (!models.length) return <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>;
  const show = models.slice(0, 3);
  const rest = models.length - show.length;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {show.map(m => (
        <span key={m} style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }}>{m}</span>
      ))}
      {rest > 0 && <span style={{ fontSize: 11, color: "#94a3b8" }}>+{rest}</span>}
    </div>
  );
};

const TIP_LABELS = { "Standart": "Standart", "Konveyör Saç": "Konveyör Saç", "Bant": "Bant" };
const TIP_COLORS = {
  "Standart":     { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" },
  "Konveyör Saç": { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  "Bant":         { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
};

const TipSelector = ({ value, onChange }) => (
  <div style={{ display: "flex", gap: 6 }}>
    {Object.keys(TIP_LABELS).map(t => {
      const active = (value || "Standart") === t;
      const c = TIP_COLORS[t];
      return (
        <button key={t} type="button" onClick={() => onChange(t)}
          style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
            border: `1px solid ${active ? c.border : "#e2e8f0"}`,
            background: active ? c.bg : "#f8fafc",
            color: active ? c.color : "#94a3b8" }}>
          {t}
        </button>
      );
    })}
  </div>
);

export const PartManager = ({ parts = [], setParts, showToast = () => {}, setServices = null, allModels = [] }) => {
  const emptyForm = { ad: "", adEN: "", kod: "", tanim: "", tanimEN: "", fiyatTRY: "", fiyatUSD: "", fiyatEUR: "", models: [], tip: "Standart", resim: "" };
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
      onRename: (oldAd, newAd) => setServices?.(p => p.map(s =>
        Array.isArray(s.degisenParcalar) && s.degisenParcalar.some(x => parcaAdi(x) === oldAd)
          ? { ...s, degisenParcalar: s.degisenParcalar.map(x => parcaAdi(x) === oldAd ? (typeof x === "string" ? newAd : { ...x, ad: newAd }) : x) }
          : s
      )),
    });
  const [addOpen, setAddOpen] = useState(false);
  const { search, setSearch, page, setPage, filtered, paged } = useFilteredList(parts, { searchFields: ["ad"], perPage: PER_PAGE });

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
        <Btn onClick={openAdd}><Icon name="plus" size={14} /> Parça/Yedek Parça Ekle</Btn>
      </div>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Yedek parça ara..."
          style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            {parts.length === 0 ? "Henüz yedek parça tanımı yok." : "Arama sonucu bulunamadı."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "8px 14px", width: 52 }}></th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>Yedek Parça Adı</th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>Tip</th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>Kod</th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>Ad / Tanım</th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>Modeller</th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>Fiyat</th>
                <th style={{ padding: "8px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#475569" }}></th>
              </tr>
            </thead>
            <tbody>
              {paged.map(k => (
                <tr key={k.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 14px" }}>
                    {k.resim
                      ? <img src={k.resim} alt={k.ad} style={{ width: 40, height: 30, objectFit: "contain", borderRadius: 4, border: "1px solid #e2e8f0" }} />
                      : <div style={{ width: 40, height: 30, borderRadius: 4, border: "1px dashed #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#cbd5e1" }}>—</div>
                    }
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{k.ad}</span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {(() => { const t = k.tip || "Standart"; const c = TIP_COLORS[t] || TIP_COLORS["Standart"]; return (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>{t}</span>
                    ); })()}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748b" }}>{k.kod || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11 }}>
                    <span style={{ color: k.adEN ? "#16a34a" : "#cbd5e1" }}>TR</span>
                    {" · "}
                    <span style={{ color: k.adEN ? "#16a34a" : "#cbd5e1" }}>EN</span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <ModelBadges models={k.models || []} />
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
          <Field label="Yedek Parça Adı (TR)">
            <Input value={form.ad} onChange={e => setForm(p => ({ ...p, ad: e.target.value }))} placeholder="Örn: Kesme Bıçağı Seti" />
            <Warn>{!form.ad.trim() ? "Yedek parça adı girilmedi" : ""}</Warn>
          </Field>
          <Field label="Yedek Parça Adı (EN) — Proforma ve yurtdışı teklifler için">
            <Input value={form.adEN || ""} onChange={e => setForm(p => ({ ...p, adEN: e.target.value }))} placeholder="Örn: Cutting Blade Set" />
          </Field>
          <Field label="Kod">
            <Input value={form.kod || ""} onChange={e => setForm(p => ({ ...p, kod: e.target.value }))} placeholder="Örn: KES-001" />
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
          <Field label="Fiyat (TL / USD / EUR — opsiyonel)">
            <PriceFields value={form} onChange={setForm} />
          </Field>
          <Field label="Parça Tipi">
            <TipSelector value={form.tip || "Standart"} onChange={v => setForm(p => ({ ...p, tip: v }))} />
          </Field>
          <Field label="Resim">
            <ImageUpload value={form.resim || ""} onChange={v => setForm(p => ({ ...p, resim: v }))} label={form.ad} />
          </Field>
          <Field label="Kullanıldığı Modeller">
            <ModelChips selected={form.models || []} allModels={allModels}
              onChange={models => setForm(p => ({ ...p, models }))} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setAddOpen(false)}>İptal</Btn>
            <Btn onClick={submitAdd}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}

      {editId !== null && (
        <Modal title="Yedek Parçayı Düzenle" onClose={cancelEdit}>
          <Field label="Yedek Parça Adı (TR)">
            <Input value={editForm.ad || ""} onChange={e => setEditForm(p => ({ ...p, ad: e.target.value }))} placeholder="Örn: Kesme Bıçağı Seti" />
            <Warn>{!(editForm.ad || "").trim() ? "Yedek parça adı girilmedi" : ""}</Warn>
          </Field>
          <Field label="Yedek Parça Adı (EN) — Proforma ve yurtdışı teklifler için">
            <Input value={editForm.adEN || ""} onChange={e => setEditForm(p => ({ ...p, adEN: e.target.value }))} placeholder="Örn: Cutting Blade Set" />
          </Field>
          <Field label="Kod">
            <Input value={editForm.kod || ""} onChange={e => setEditForm(p => ({ ...p, kod: e.target.value }))} placeholder="Örn: KES-001" />
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
          <Field label="Fiyat (TL / USD / EUR — opsiyonel)">
            <PriceFields value={editForm} onChange={setEditForm} />
          </Field>
          <Field label="Parça Tipi">
            <TipSelector value={editForm.tip || "Standart"} onChange={v => setEditForm(p => ({ ...p, tip: v }))} />
          </Field>
          <Field label="Resim">
            <ImageUpload value={editForm.resim || ""} onChange={v => setEditForm(p => ({ ...p, resim: v }))} label={editForm.ad} />
          </Field>
          <Field label="Kullanıldığı Modeller">
            <ModelChips selected={editForm.models || []} allModels={allModels}
              onChange={models => setEditForm(p => ({ ...p, models }))} />
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
