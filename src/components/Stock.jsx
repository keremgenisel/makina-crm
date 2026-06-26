import { useState, useMemo } from "react";
import { ALTUNMAK_MODELS } from "../lib/constants";
import { today, fmtTR, uid, bumpId, withDeleted, mergeAndUpdate, totalMiktar } from "../lib/utils";
import { useFilteredList } from "../hooks/useFilteredList";
import { Icon, Field, Input, Warn, Select, Btn, Modal, ConfirmDialog, Pagination } from "./ui";

// ── Yedek Parça Stoğu ─────────────────────────────────────────────────────────
const PER_PAGE_PARCA = 15;

const PartStokTab = ({ parts = [], partStock = [], setPartStock, partStockLog = [], setPartStockLog, showToast }) => {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const stokMap = useMemo(() => {
    const m = {};
    partStock.forEach(s => { m[s.partId] = s; });
    return m;
  }, [partStock]);

  const rows = useMemo(() =>
    parts.map(p => ({ part: p, stok: stokMap[p.id] || null, miktar: Math.max(0, stokMap[p.id]?.miktar ?? 0) })),
  [parts, stokMap]);

  const { search, setSearch, page, setPage, filtered: filteredRows, paged: pagedRows } = useFilteredList(rows, {
    searchFn: (r, q) => r.part.ad.toLowerCase().includes(q) || (r.part.models || []).some(m => m.toLowerCase().includes(q)),
    perPage: PER_PAGE_PARCA,
  });

  const rowBg = (miktar) => {
    if (miktar === 0) return "#fef2f2";
    if (miktar <= 5)  return "#fefce8";
    return undefined;
  };
  const rowColor = (miktar) => {
    if (miktar === 0) return "#991b1b";
    if (miktar <= 5)  return "#92400e";
    return "#0f172a";
  };

  const openEkle = () => { setForm({ partId: "", miktar: "1", notlar: "" }); setModal("ekle"); };
  const openDuzelt = (row) => { setForm({ partId: String(row.part.id), miktar: String(row.miktar), notlar: row.stok?.notlar || "" }); setModal("duzelt"); };

  const saveEkle = () => {
    if (!form.partId) { showToast("Parça seçilmedi.", "err"); return; }
    const qty = parseInt(form.miktar) || 0;
    if (qty <= 0) { showToast("Geçerli bir miktar girin.", "err"); return; }
    const pid = String(form.partId);
    const logId = uid();
    setPartStock(p => mergeAndUpdate(p, pid, totalMiktar(p, pid) + qty, { notlar: form.notlar || "" }));
    setPartStockLog(p => [...p, { id: logId, partId: pid, miktar: qty, tip: "stok_girisi", referansId: null, tarih: today(), notlar: form.notlar || "" }]);
    showToast("Stok güncellendi.");
    setModal(null);
  };

  const saveDuzelt = () => {
    const qty = parseInt(form.miktar);
    if (isNaN(qty)) { showToast("Geçerli bir miktar girin.", "err"); return; }
    const pid = String(form.partId);
    const logId = uid();
    setPartStock(p => mergeAndUpdate(p, pid, qty, { notlar: form.notlar || "" }));
    setPartStockLog(p => [...p, { id: logId, partId: pid, miktar: qty, tip: "manuel_duzelt", referansId: null, tarih: today(), notlar: `Sayım düzeltmesi${form.notlar ? ": " + form.notlar : ""}` }]);
    showToast("Stok düzeltildi.");
    setModal(null);
  };

  const inputStyle = { width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", outline: "none", fontFamily: "inherit" };

  const kritikSayisi = rows.filter(r => r.miktar <= 0).length;
  const dusukSayisi  = rows.filter(r => r.miktar > 0 && r.miktar <= 5).length;

  return (
    <div>
      {/* Özet uyarı */}
      {(kritikSayisi > 0 || dusukSayisi > 0) && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {kritikSayisi > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#991b1b", fontWeight: 600 }}>
              ⚠ {kritikSayisi} parça tükendi
            </div>
          )}
          {dusukSayisi > 0 && (
            <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#92400e", fontWeight: 600 }}>
              ⚡ {dusukSayisi} parçada stok azaldı (5 veya altı)
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Parça adı veya model ara..."
            style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
        </div>
        <Btn onClick={openEkle}><Icon name="plus" size={14} /> Stoka Parça Ekle</Btn>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          Henüz yedek parça tanımı yok. Ayarlar → Yedek Parça'dan ekleyin.
        </div>
      ) : (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Yedek Parça", "Modeller", "Stok", "Son Güncelleme", ""].map(h => (
                  <th key={h} style={{ padding: "9px 14px", textAlign: h === "Stok" ? "center" : "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedRows.map(({ part, stok, miktar }) => (
                <tr key={part.id} style={{ borderBottom: "1px solid #f1f5f9", background: rowBg(miktar) }}>
                  <td style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13, color: rowColor(miktar) }}>{part.ad}</td>
                  <td style={{ padding: "10px 14px" }}>
                    {(part.models || []).length === 0
                      ? <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>
                      : <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {(part.models || []).slice(0, 3).map(m => (
                            <span key={m} style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 8, background: "#f1f5f9", color: "#475569" }}>{m}</span>
                          ))}
                          {(part.models || []).length > 3 && <span style={{ fontSize: 11, color: "#94a3b8" }}>+{part.models.length - 3}</span>}
                        </div>
                    }
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: rowColor(miktar) }}>{miktar}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 4 }}>adet</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#94a3b8" }}>
                    {stok?.sonGuncelleme ? fmtTR(stok.sonGuncelleme) : "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <Btn small onClick={() => { setForm({ partId: String(part.id), miktar: "1", notlar: "" }); setModal("ekle"); }}
                        style={{ fontSize: 11 }}>+ Ekle</Btn>
                      <Btn small variant="ghost" onClick={() => openDuzelt({ part, stok, miktar })} style={{ fontSize: 11 }}>Düzelt</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && filteredRows.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Arama sonucu bulunamadı.</div>
      )}
      <Pagination total={filteredRows.length} page={page} setPage={setPage} perPage={PER_PAGE_PARCA} />

      {(modal === "ekle") && (
        <Modal title="Stoka Parça Ekle" onClose={() => setModal(null)} maxWidth={420}>
          <Field label="Yedek Parça">
            <select value={form.partId} onChange={e => setForm(p => ({ ...p, partId: e.target.value }))} style={inputStyle}>
              <option value="">Parça seçin...</option>
              {parts.map(p => <option key={p.id} value={p.id}>{p.ad}</option>)}
            </select>
            <Warn>{!form.partId ? "Parça seçilmedi" : ""}</Warn>
          </Field>
          <Field label="Eklenecek Miktar (adet)">
            <Input type="number" min="1" value={form.miktar} onChange={e => setForm(p => ({ ...p, miktar: e.target.value }))} placeholder="1" />
          </Field>
          <Field label="Not (opsiyonel)">
            <Input value={form.notlar} onChange={e => setForm(p => ({ ...p, notlar: e.target.value }))} placeholder="Örn: Fatura no, tedarikçi..." />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>İptal</Btn>
            <Btn onClick={saveEkle}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}

      {(modal === "duzelt") && (
        <Modal title="Stok Miktarını Düzelt" onClose={() => setModal(null)} maxWidth={420}>
          <div style={{ fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "8px 12px", borderRadius: 8, marginBottom: 14 }}>
            <b>{parts.find(p => p.id === form.partId)?.ad}</b> — mevcut stok: <b>{stokMap[form.partId]?.miktar ?? 0} adet</b>
          </div>
          <Field label="Yeni Miktar (adet)">
            <Input type="number" min="0" value={form.miktar} onChange={e => setForm(p => ({ ...p, miktar: e.target.value }))} />
          </Field>
          <Field label="Not (opsiyonel)">
            <Input value={form.notlar} onChange={e => setForm(p => ({ ...p, notlar: e.target.value }))} placeholder="Örn: Sayım sonucu..." />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>İptal</Btn>
            <Btn onClick={saveDuzelt}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── Makina Stoğu ──────────────────────────────────────────────────────────────
const MakinaStokTab = ({ stock, setStock, models, showToast, parts = [], partStock = [], setPartStock, partStockLog = [], setPartStockLog }) => {
  const [modelFilter, setModelFilter] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirmId, setConfirmId] = useState(null);
  const [showAllParts, setShowAllParts] = useState(false);

  const inputStyle = { width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#f8fafc", outline: "none", fontFamily: "inherit" };

  const { search, setSearch, page, setPage, filtered, paged, perPage: PER_PAGE } = useFilteredList(stock, {
    searchFields: ["model", "serialNo", "note"],
    filterFn: s => !modelFilter || s.model === modelFilter,
  });

  const byModel = {};
  stock.forEach(s => { byModel[s.model] = (byModel[s.model] || 0) + 1; });

  // Modele göre filtrelenmiş parçalar — model seçiliyse önce onlar, toggle'la tümü
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

  // Parça stok düşme yardımcısı
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
      showToast("Stok makinası kaydedildi.");
    } else {
      const stockId = form.id;
      // Eski parça düşümlerini geri al, yeni olanları uygula
      const oldLogEntries = partStockLog.filter(l => l.tip === "makina_uretimi" && l.referansId === stockId);
      if (oldLogEntries.length > 0) {
        setPartStock(ps => {
          let updated = [...ps];
          oldLogEntries.forEach(l => {
            const pid = String(l.partId);
            updated = mergeAndUpdate(updated, pid, totalMiktar(updated, pid) + Math.abs(l.miktar));
          });
          return updated;
        });
        setPartStockLog(log => log.filter(l => !(l.tip === "makina_uretimi" && l.referansId === stockId)));
      }
      setStock(p => p.map(s => s.id === stockId ? form : s));
      deductParts(form.parcalar || [], stockId);
      showToast("Stok makinası düzenlendi.");
    }
    setModal(null);
  };

  const confirmDel = () => {
    // Stok silince o makina için harcanan parçaları geri al
    const logEntries = partStockLog.filter(l => l.tip === "makina_uretimi" && l.referansId === confirmId);
    if (logEntries.length > 0) {
      setPartStock(ps => {
        let updated = [...ps];
        logEntries.forEach(l => {
          const pid = String(l.partId);
          updated = mergeAndUpdate(updated, pid, totalMiktar(updated, pid) + Math.abs(l.miktar));
        });
        return updated;
      });
      setPartStockLog(log => log.filter(l => !(l.tip === "makina_uretimi" && l.referansId === confirmId)));
    }
    setStock(p => withDeleted(p, s => s.id === confirmId));
    setConfirmId(null);
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
                style={{ background: active ? "#fff7ed" : "#fff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", borderLeft: `4px solid ${active ? "#c2410c" : "#e85d1a"}`, cursor: "pointer" }}
                title="Bu modeldeki makinaları göster">
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{m}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#e85d1a" }}>{n} <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>adet</span></div>
              </div>
            );
          })}
        </div>
      )}

      {modelFilter && (
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>Filtre:</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", borderRadius: 8, padding: "5px 12px" }}>
            {modelFilter}
            <button onClick={() => setModelFilter(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c2410c", padding: 0, display: "flex" }}><Icon name="close" size={12} /></button>
          </span>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, marginRight: 12 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Model veya seri no ara..."
            style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
        </div>
        <Btn onClick={openAdd}><Icon name="plus" size={14} /> Stoğa Makina Ekle</Btn>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Model", "Seri Numarası", "Stoğa Giriş", "Not", ""].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map(s => (
              <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "13px 16px" }}><span style={{ fontSize: 12, background: "#fff7ed", color: "#c2410c", borderRadius: 6, padding: "3px 10px", fontWeight: 700 }}>{s.model}</span></td>
                <td style={{ padding: "13px 16px", fontSize: 13, color: s.serialNo ? "#0f172a" : "#94a3b8", fontFamily: s.serialNo ? "monospace" : "inherit", fontWeight: 600 }}>{s.serialNo || "(seri no atanmamış)"}</td>
                <td style={{ padding: "13px 16px", fontSize: 13, color: "#64748b" }}>{fmtTR(s.addedDate)}</td>
                <td title={s.note || undefined} style={{ padding: "13px 16px", fontSize: 12, color: "#64748b", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.note || "—"}</td>
                <td style={{ padding: "13px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn small variant="ghost" onClick={() => openEdit(s)}><Icon name="edit" size={12} /></Btn>
                    <Btn small variant="danger" onClick={() => setConfirmId(s.id)}><Icon name="trash" size={12} /></Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>{stock.length === 0 ? "Stokta makina yok." : "Aramanıza uyan makina yok."}</div>}
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
        <Modal title={modal === "add" ? "Stoğa Makina Ekle" : "Stok Kaydını Düzenle"} onClose={() => setModal(null)}>
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
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 60, boxSizing: "border-box", fontFamily: "inherit" }} />
          </Field>

          {/* Kullanılan Parçalar */}
          <div style={{ marginTop: 16, borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .6 }}>
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
              <label style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 6, marginBottom: 8, cursor: "pointer", userSelect: "none" }}>
                <input type="checkbox" checked={showAllParts} onChange={e => setShowAllParts(e.target.checked)} />
                Tüm parçaları göster (yalnızca {form.model} modeline ait {modelParts.length} parça listeleniyor)
              </label>
            )}

            {(form.parcalar || []).length === 0 && (
              <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", marginBottom: 4 }}>Parça eklenmedi — opsiyonel</div>
            )}

            {(form.parcalar || []).map((row, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <select value={row.partId} onChange={e => updateParcaRow(i, "partId", e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}>
                  <option value="">Parça seçin...</option>
                  {availableParts.map(p => <option key={p.id} value={p.id}>{p.ad}</option>)}
                  {row.partId && !availableParts.find(p => p.id === row.partId) && (
                    <option value={row.partId}>{parts.find(p => p.id === row.partId)?.ad || "?"}</option>
                  )}
                </select>
                <input type="number" min="1" value={row.miktar} onChange={e => updateParcaRow(i, "miktar", e.target.value)}
                  style={{ ...inputStyle, width: 70, textAlign: "center" }} />
                <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>adet</span>
                <Btn small variant="danger" onClick={() => removeParcaRow(i)}><Icon name="trash" size={11} /></Btn>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>İptal</Btn>
            <Btn onClick={save} disabled={!form.model}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export const Stock = ({
  stock, setStock,
  models = ALTUNMAK_MODELS,
  showToast = () => {},
  parts = [],
  partStock = [], setPartStock = () => {},
  partStockLog = [], setPartStockLog = () => {},
}) => {
  const [subTab, setSubTab] = useState("makina"); // "makina" | "parca"

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Stok</h2>
      </div>

      {/* Alt sekmeler */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid #f1f5f9", paddingBottom: 0 }}>
        {[["makina", "Makina Stoğu"], ["parca", "Yedek Parça Stoğu"]].map(([id, label]) => (
          <button key={id} onClick={() => setSubTab(id)} style={{
            padding: "8px 18px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13.5,
            borderBottom: subTab === id ? "2px solid #e85d1a" : "2px solid transparent",
            color: subTab === id ? "#e85d1a" : "#94a3b8",
            background: "transparent", marginBottom: -2,
          }}>{label}</button>
        ))}
      </div>

      {subTab === "makina" && (
        <MakinaStokTab stock={stock} setStock={setStock} models={models} showToast={showToast}
          parts={parts} partStock={partStock} setPartStock={setPartStock}
          partStockLog={partStockLog} setPartStockLog={setPartStockLog} />
      )}
      {subTab === "parca" && (
        <PartStokTab parts={parts} partStock={partStock} setPartStock={setPartStock}
          partStockLog={partStockLog} setPartStockLog={setPartStockLog} showToast={showToast} />
      )}
    </div>
  );
};
