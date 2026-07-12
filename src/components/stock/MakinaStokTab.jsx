import { useState, useMemo } from "react";
import { ALTUNMAK_MODELS } from "../../lib/constants";
import { logAction, snapshotOnceki } from "../../lib/audit";
import { today, fmtTR, uid, bumpId, withDeleted, mergeAndUpdate, totalMiktar } from "../../lib/utils";
import { useFilteredList } from "../../hooks/useFilteredList";
import { Icon, Field, Input, Warn, Select, Btn, Modal, ConfirmDialog, Pagination, LockConflict } from "../ui";
import { useLock } from "../../hooks/useLock";

export const MakinaStokTab = ({ stock, setStock, models = ALTUNMAK_MODELS, showToast, parts = [], partStock = [], setPartStock, partStockLog = [], setPartStockLog, canDoStock = () => true, serverPermissions = null }) => {
  const [modelFilter, setModelFilter] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirmId, setConfirmId] = useState(null);
  const [showAllParts, setShowAllParts] = useState(false);
  const { lockLoading: stockLockLoading, lockConflict: stockLock, forceAcquire: forceStockLock } = useLock("stock", modal?.edit?.id ?? null);

  const inputStyle = { width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13, background: "var(--n100, #f8fafc)", outline: "none", fontFamily: "inherit" };

  const { search, setSearch, page, setPage, filtered, paged, perPage: PER_PAGE } = useFilteredList(stock, {
    searchFields: ["model", "serialNo", "note"],
    filterFn: s => !modelFilter || s.model === modelFilter,
  });

  const byModel = {};
  stock.forEach(s => { byModel[s.model] = (byModel[s.model] || 0) + 1; });

  const modelParts = useMemo(() => parts.filter(p => (p.models || []).includes(form.model)), [parts, form.model]);
  const availableParts = (!form.model || showAllParts || modelParts.length === 0) ? parts : modelParts;
  const selectedModelKit = useMemo(() => {
    if (!form.model) return [];
    return models.find(m => m.model === form.model)?.defaultParcalar || [];
  }, [form.model, models]);
  const updateParcaRow = (i, key, val) => setForm(p => ({ ...p, parcalar: p.parcalar.map((r, idx) => idx === i ? { ...r, [key]: val } : r) }));
  const removeParcaRow = (i) => setForm(p => ({ ...p, parcalar: p.parcalar.filter((_, idx) => idx !== i) }));

  const openAdd  = () => { setForm({ model: "", serialNo: "", addedDate: today(), note: "", parcalar: [] }); setShowAllParts(false); setModal("add"); };
  const openEdit = s => { setForm({ ...s, parcalar: s.parcalar || [] }); setShowAllParts(false); setModal({ edit: s }); };

  const deductParts = (parcalar, stockId) => {
    const valid = parcalar.filter(r => r.partId && parseInt(r.miktar) > 0);
    if (!valid.length) return;
    const logEntries = valid.map(r => ({
      id: uid(), partId: String(r.partId), miktar: -parseInt(r.miktar),
      tip: "makina_uretimi", referansId: stockId, tarih: today(), notlar: form.model,
    }));
    setPartStock(ps => {
      let updated = [...ps];
      valid.forEach(r => {
        const qty = parseInt(r.miktar);
        const pid = String(r.partId);
        updated = mergeAndUpdate(updated, pid, totalMiktar(updated, pid) - qty);
      });
      return updated;
    });
    setPartStockLog(log => [...log, ...logEntries]);
  };

  const save = () => {
    if (!form.model) { showToast("Model seçilmeden kaydedilemez."); return; }
    if (modal === "add") {
      bumpId(stock);
      const nid = uid();
      setStock(p => p.some(s => s.id === nid) ? p : [{ ...form, id: nid }, ...p]);
      deductParts(form.parcalar || [], nid);
      logAction({ serverPermissions, action: "olusturuldu", entity: "stok_makina", entityId: nid, entityName: form.model, detail: { serialNo: form.serialNo } });
      showToast("Stok makinası kaydedildi.");
    } else {
      const stockId = form.id;
      const sid = String(stockId);
      const oldPartLog = partStockLog.filter(l => l.tip === "makina_uretimi" && String(l.referansId) === sid);
      if (oldPartLog.length > 0) {
        setPartStock(ps => {
          let updated = [...ps];
          oldPartLog.forEach(l => {
            const pid = String(l.partId);
            updated = mergeAndUpdate(updated, pid, totalMiktar(updated, pid) + Math.abs(l.miktar));
          });
          return updated;
        });
        setPartStockLog(log => log.filter(l => !(l.tip === "makina_uretimi" && String(l.referansId) === sid)));
      }
      setStock(p => p.map(s => s.id === stockId ? form : s));
      deductParts(form.parcalar || [], stockId);
      logAction({ serverPermissions, action: "duzenlendi", entity: "stok_makina", entityId: stockId, entityName: form.model, detail: { onceki: snapshotOnceki(stock.find(x => x.id === stockId)) } });
      showToast("Stok makinası düzenlendi.");
    }
    setModal(null);
  };

  const confirmDel = () => {
    const cid = String(confirmId);
    const machine = stock.find(s => s.id === confirmId);
    let partLog = partStockLog.filter(l => l.tip === "makina_uretimi" && String(l.referansId) === cid);

    // Log kaydı yoksa ve makina kit parçası içeriyorsa — orphan log ara
    // (parcalar boşsa müşteri silmeden geri dönen makina; kit zaten o adımda restore edildi)
    if (partLog.length === 0 && machine?.model && machine?.parcalar?.length) {
      const liveIds = new Set(stock.map(s => String(s.id)));
      const orphan = partStockLog.filter(l =>
        l.tip === "makina_uretimi" &&
        l.notlar === machine.model &&
        !liveIds.has(String(l.referansId))
      );
      if (orphan.length > 0) {
        // Birden fazla grup varsa en yüksek referansId'li grubu al (en son eklenen makina)
        const groups = new Map();
        orphan.forEach(l => {
          const k = String(l.referansId);
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k).push(l);
        });
        const bestKey = [...groups.keys()].sort((a, b) => Number(b) - Number(a))[0];
        partLog = groups.get(bestKey);
      }
    }

    if (partLog.length > 0) {
      const restoredRefId = String(partLog[0].referansId);
      setPartStock(ps => {
        let updated = [...ps];
        partLog.forEach(l => {
          const pid = String(l.partId);
          updated = mergeAndUpdate(updated, pid, totalMiktar(updated, pid) + Math.abs(l.miktar));
        });
        return updated;
      });
      setPartStockLog(log => log.filter(l => !(l.tip === "makina_uretimi" && String(l.referansId) === restoredRefId)));
    }
    setStock(p => withDeleted(p, s => s.id === confirmId));
    setConfirmId(null);
    logAction({ serverPermissions, action: "silindi", entity: "stok_makina", entityId: confirmId, entityName: machine?.model });
    showToast("Stok makinası silindi.");
  };

  return (
    <div>
      {Object.keys(byModel).length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
          {Object.entries(byModel).map(([m, n]) => {
            const active = modelFilter === m;
            return (
              <div key={m} onClick={() => { setModelFilter(active ? null : m); setPage(1); }}
                style={{ background: active ? "var(--ambBg3, #fff7ed)" : "var(--surface, #ffffff)", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", borderLeft: `4px solid ${active ? "var(--orTx, #c2410c)" : "#e85d1a"}`, cursor: "pointer" }}
                title="Bu modeldeki makinaları göster">
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--n900, #0f172a)" }}>{m}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#e85d1a" }}>{n} <span style={{ fontSize: 12, color: "var(--n400, #94a3b8)", fontWeight: 600 }}>adet</span></div>
              </div>
            );
          })}
        </div>
      )}

      {modelFilter && (
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "var(--n500, #64748b)" }}>Filtre:</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, background: "var(--ambBg3, #fff7ed)", color: "var(--orTx, #c2410c)", border: "1px solid var(--ambBr3, #fed7aa)", borderRadius: 8, padding: "5px 12px" }}>
            {modelFilter}
            <button onClick={() => setModelFilter(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--orTx, #c2410c)", padding: 0, display: "flex" }}><Icon name="close" size={12} /></button>
          </span>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, marginRight: 12 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--n400, #94a3b8)" }}><Icon name="search" size={15} /></span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Model veya seri no ara..."
            style={{ padding: "9px 12px 9px 36px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "var(--n100, #f8fafc)", outline: "none" }} />
        </div>
        {canDoStock("stock_makina_add") && <Btn onClick={openAdd}><Icon name="plus" size={14} /> Stoğa Makina Ekle</Btn>}
      </div>

      <div style={{ background: "var(--surface, #ffffff)", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--n100, #f8fafc)" }}>
              {["Model", "Seri Numarası", "Stoğa Giriş", "Not", ""].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--n600, #475569)", borderBottom: "1px solid var(--n200, #e2e8f0)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map(s => (
              <tr key={s.id} style={{ borderBottom: "1px solid var(--n150, #f1f5f9)" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--n100, #f8fafc)"}
                onMouseLeave={e => e.currentTarget.style.background = ""}>
                <td style={{ padding: "13px 16px" }}><span style={{ fontSize: 12, background: "var(--ambBg3, #fff7ed)", color: "var(--orTx, #c2410c)", borderRadius: 6, padding: "3px 10px", fontWeight: 700 }}>{s.model}</span></td>
                <td style={{ padding: "13px 16px", fontSize: 13, color: s.serialNo ? "var(--n900, #0f172a)" : "var(--n400, #94a3b8)", fontFamily: s.serialNo ? "monospace" : "inherit", fontWeight: 600 }}>{s.serialNo || "(seri no atanmamış)"}</td>
                <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--n500, #64748b)" }}>{fmtTR(s.addedDate)}</td>
                <td title={s.note || undefined} style={{ padding: "13px 16px", fontSize: 12, color: "var(--n500, #64748b)", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.note || "—"}</td>
                <td style={{ padding: "13px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {canDoStock("stock_makina_edit") && <Btn small variant="ghost" onClick={() => openEdit(s)}><Icon name="edit" size={12} /></Btn>}
                    {canDoStock("stock_makina_delete") && <Btn small variant="danger" onClick={() => setConfirmId(s.id)}><Icon name="trash" size={12} /></Btn>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--n400, #94a3b8)" }}>{stock.length === 0 ? "Stokta makina yok." : "Aramanıza uyan makina yok."}</div>}
        <Pagination total={filtered.length} page={page} setPage={setPage} perPage={PER_PAGE} />
      </div>

      {confirmId && (
        <ConfirmDialog
          message={`"${stock.find(s => s.id === confirmId)?.serialNo || ""}" seri numaralı makina stoktan silinecek (Çöp Kutusu'na taşınır, 30 gün içinde geri alınabilir).`}
          onConfirm={confirmDel}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {modal && (
        <Modal title={modal === "add" ? "Stoğa Makina Ekle" : "Stok Kaydını Düzenle"} onClose={() => setModal(null)} maxWidth={760}>
          {(stockLock && modal?.edit) ? (
            <LockConflict lockedBy={stockLock.lockedBy} lockedAt={stockLock.lockedAt}
              onForce={forceStockLock} onCancel={() => setModal(null)} />
          ) : (<>
          <Field label="Makina Modeli">
            <Select value={form.model || ""} onChange={e => setForm(p => ({ ...p, model: e.target.value }))}>
              <option value="">Model seçin...</option>
              {models.map(m => <option key={m.model} value={m.model}>{m.model}</option>)}
            </Select>
            <Warn>{!form.model ? "Model seçilmedi" : ""}</Warn>
          </Field>
          <Field label="Seri Numarası (opsiyonel)"><Input value={form.serialNo || ""} onChange={e => setForm(p => ({ ...p, serialNo: e.target.value }))} placeholder="Boş bırakılabilir — sonra atanır" /></Field>
          <Field label="Stoğa Giriş Tarihi"><Input type="date" value={form.addedDate || ""} onChange={e => setForm(p => ({ ...p, addedDate: e.target.value }))} /></Field>
          <Field label="Not">
            <textarea value={form.note || ""} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              placeholder="İsteğe bağlı not..."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 14, background: "var(--n100, #f8fafc)", resize: "vertical", minHeight: 60, boxSizing: "border-box", fontFamily: "inherit" }} />
          </Field>

          <div style={{ marginTop: 16, borderTop: "1px solid var(--n150, #f1f5f9)", paddingTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--n400, #94a3b8)", textTransform: "uppercase", letterSpacing: .6 }}>
                Kullanılan Parçalar <span style={{ fontWeight: 400, fontSize: 11, textTransform: "none" }}>(stoktan düşülür)</span>
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {selectedModelKit.length > 0 && (
                  <Btn small onClick={() => setForm(p => ({
                    ...p,
                    parcalar: selectedModelKit.map(r => ({ partId: String(r.partId), miktar: r.miktar })),
                  }))}>
                    <Icon name="box" size={12} /> Kiti Uygula ({selectedModelKit.length} parça)
                  </Btn>
                )}
                <Btn small variant="ghost" onClick={() => setForm(p => ({ ...p, parcalar: [...(p.parcalar || []), { partId: "", miktar: 1 }] }))}>
                  <Icon name="plus" size={12} /> Parça Ekle
                </Btn>
              </div>
            </div>

            {form.model && parts.length > 0 && modelParts.length > 0 && (
              <label style={{ fontSize: 12, color: "var(--n500, #64748b)", display: "flex", alignItems: "center", gap: 6, marginBottom: 8, cursor: "pointer", userSelect: "none" }}>
                <input type="checkbox" checked={showAllParts} onChange={e => setShowAllParts(e.target.checked)} />
                Tüm parçaları göster (yalnızca {form.model} modeline ait {modelParts.length} parça listeleniyor)
              </label>
            )}

            {(form.parcalar || []).length === 0 && (
              <div style={{ fontSize: 12, color: "var(--n400, #94a3b8)", fontStyle: "italic", marginBottom: 4 }}>Parça eklenmedi — opsiyonel</div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 8 }}>
              {(form.parcalar || []).map((row, i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", background: "var(--n100, #f8fafc)", border: "1px solid #eef2f7", borderRadius: 8, padding: "6px 8px" }}>
                  <select value={row.partId} onChange={e => updateParcaRow(i, "partId", e.target.value)}
                    style={{ ...inputStyle, flex: 1, minWidth: 0 }}>
                    <option value="">Parça seçin...</option>
                    {availableParts.map(p => <option key={p.id} value={p.id}>{p.ad}</option>)}
                    {row.partId && !availableParts.find(p => String(p.id) === String(row.partId)) && (
                      <option value={row.partId}>{parts.find(p => String(p.id) === String(row.partId))?.ad || "?"}</option>
                    )}
                  </select>
                  <input type="number" min="1" value={row.miktar} onChange={e => updateParcaRow(i, "miktar", e.target.value)}
                    style={{ ...inputStyle, width: 56, textAlign: "center", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "var(--n400, #94a3b8)", whiteSpace: "nowrap", flexShrink: 0 }}>adet</span>
                  <Btn small variant="danger" onClick={() => removeParcaRow(i)}><Icon name="trash" size={11} /></Btn>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>İptal</Btn>
            <Btn onClick={save} disabled={!form.model}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
          </>)}
        </Modal>
      )}
    </div>
  );
};
