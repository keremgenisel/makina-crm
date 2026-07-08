import { useState, useMemo } from "react";
import { today, fmtTR, uid, mergeAndUpdate, totalMiktar, aramaNormalize } from "../../lib/utils";
import { logAction } from "../../lib/audit";
import { useFilteredList } from "../../hooks/useFilteredList";
import { Icon, Field, Input, Warn, Btn, Modal, Pagination, LockConflict } from "../ui";
import { useLock } from "../../hooks/useLock";

const PER_PAGE = 15;

export const PartStokTab = ({ parts = [], partStock = [], setPartStock, partStockLog = [], setPartStockLog, showToast, appSettings = {}, setAppSettings = () => {}, canDoStock = () => true, serverPermissions = null }) => {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const lockPartId = modal && form.partId ? String(form.partId) : null;
  const { lockLoading: partStokLockLoading, lockConflict: partStokLock, forceAcquire: forcePartStokLock } = useLock("partstock", lockPartId);

  const pinnedPartIds = appSettings.pinnedPartIds || [];
  const togglePin = (partId) => {
    const id = String(partId);
    setAppSettings(s => ({
      ...s,
      pinnedPartIds: (s.pinnedPartIds || []).includes(id)
        ? (s.pinnedPartIds || []).filter(x => x !== id)
        : [...(s.pinnedPartIds || []), id],
    }));
  };

  const stokMap = useMemo(() => {
    const m = {};
    partStock.forEach(s => { m[s.partId] = s; });
    return m;
  }, [partStock]);

  const rows = useMemo(() =>
    parts.map(p => ({ part: p, stok: stokMap[p.id] || null, miktar: Math.max(0, stokMap[p.id]?.miktar ?? 0) })),
  [parts, stokMap]);

  const pinnedRows = useMemo(() =>
    pinnedPartIds.map(id => rows.find(r => String(r.part.id) === id)).filter(Boolean),
  [pinnedPartIds, rows]);

  const { search, setSearch, page, setPage, filtered: filteredRows, paged: pagedRows } = useFilteredList(rows, {
    searchFn: (r, q) => aramaNormalize(r.part.ad).includes(q) || (r.part.models || []).some(m => aramaNormalize(m).includes(q)),
    perPage: PER_PAGE,
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
  const cardAccent = (miktar) => {
    if (miktar === 0) return { border: "#fecaca", bg: "#fef2f2", numColor: "#991b1b" };
    if (miktar <= 5)  return { border: "#fde68a", bg: "#fefce8", numColor: "#92400e" };
    return { border: "#bbf7d0", bg: "#f0fdf4", numColor: "#15803d" };
  };

  const openEkle = () => { setForm({ partId: "", miktar: "1", notlar: "" }); setModal("ekle"); };
  const openDuzelt = (row) => { setForm({ partId: String(row.part.id), miktar: String(row.miktar), notlar: row.stok?.notlar || "" }); setModal("duzelt"); };

  const saveEkle = () => {
    if (!form.partId) { showToast("Parça seçilmedi.", "err"); return; }
    const qty = parseInt(form.miktar) || 0;
    if (qty <= 0) { showToast("Geçerli bir miktar girin.", "err"); return; }
    const pid = String(form.partId);
    const logId = uid();
    const parca = parts.find(p => String(p.id) === pid);
    setPartStock(p => mergeAndUpdate(p, pid, totalMiktar(p, pid) + qty, { notlar: form.notlar || "" }));
    setPartStockLog(p => [...p, { id: logId, partId: pid, miktar: qty, tip: "stok_girisi", referansId: null, tarih: today(), notlar: form.notlar || "" }]);
    logAction({ serverPermissions, action: "stok_eklendi", entity: "stok_parca", entityId: Number(pid), entityName: parca?.ad, detail: { miktar: qty } });
    showToast("Stok güncellendi.");
    setModal(null);
  };

  const saveDuzelt = () => {
    const qty = parseInt(form.miktar);
    if (isNaN(qty)) { showToast("Geçerli bir miktar girin.", "err"); return; }
    const pid = String(form.partId);
    const logId = uid();
    const parca2 = parts.find(p => String(p.id) === pid);
    setPartStock(p => mergeAndUpdate(p, pid, qty, { notlar: form.notlar || "" }));
    setPartStockLog(p => [...p, { id: logId, partId: pid, miktar: qty, tip: "manuel_duzelt", referansId: null, tarih: today(), notlar: `Sayım düzeltmesi${form.notlar ? ": " + form.notlar : ""}` }]);
    logAction({ serverPermissions, action: "stok_duzeltildi", entity: "stok_parca", entityId: Number(pid), entityName: parca2?.ad, detail: { miktar: qty } });
    showToast("Stok düzeltildi.");
    setModal(null);
  };

  const inputStyle = { width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", outline: "none", fontFamily: "inherit" };

  const kritikSayisi = rows.filter(r => r.miktar <= 0).length;
  const dusukSayisi  = rows.filter(r => r.miktar > 0 && r.miktar <= 5).length;

  return (
    <div>
      {/* ── Dashboard ── */}
      {pinnedRows.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            Dashboard
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {pinnedRows.map(({ part, miktar }) => {
              const ac = cardAccent(miktar);
              const fmtN = (n) => Number(n) ? Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 0 }) : null;
              const fiyatlar = [
                fmtN(part.fiyatTRY) && `₺ ${fmtN(part.fiyatTRY)}`,
                fmtN(part.fiyatUSD) && `$ ${fmtN(part.fiyatUSD)}`,
                fmtN(part.fiyatEUR) && `€ ${fmtN(part.fiyatEUR)}`,
              ].filter(Boolean);
              return (
                <div key={part.id} style={{ background: ac.bg, border: `1px solid ${ac.border}`, borderRadius: 12, padding: "14px 20px", minWidth: 150, flex: "0 0 auto" }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6, maxWidth: 180, lineHeight: 1.4 }}>{part.ad}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: fiyatlar.length ? 8 : 0 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: ac.numColor, lineHeight: 1 }}>{miktar}</span>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>adet</span>
                  </div>
                  {fiyatlar.length > 0 && (
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, lineHeight: 1.6 }}>
                      {fiyatlar.join("  ·  ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(kritikSayisi > 0 || dusukSayisi > 0) && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {kritikSayisi > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#991b1b", fontWeight: 600 }}>
              {kritikSayisi} parça tükendi
            </div>
          )}
          {dusukSayisi > 0 && (
            <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#92400e", fontWeight: 600 }}>
              {dusukSayisi} parçada stok azaldı (5 veya altı)
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
        {canDoStock("stock_parca_add") && <Btn onClick={openEkle}><Icon name="plus" size={14} /> Stoğa Parça Ekle</Btn>}
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          Henüz yedek parça tanımı yok. Ayarlar → Yedek Parça'dan ekleyin.
        </div>
      ) : (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Yedek Parça", "Modeller", "Fiyat", "Stok", "Son Güncelleme", ""].map(h => (
                  <th key={h} style={{ padding: "9px 14px", textAlign: h === "Stok" ? "center" : "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedRows.map(({ part, stok, miktar }) => {
                const fmtN = (n) => Number(n) ? Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 0 }) : null;
                const fiyatlar = [
                  fmtN(part.fiyatTRY) && { sym: "₺", val: fmtN(part.fiyatTRY) },
                  fmtN(part.fiyatUSD) && { sym: "$", val: fmtN(part.fiyatUSD) },
                  fmtN(part.fiyatEUR) && { sym: "€", val: fmtN(part.fiyatEUR) },
                ].filter(Boolean);
                const isPinned = pinnedPartIds.includes(String(part.id));
                return (
                <tr key={part.id} style={{ borderBottom: "1px solid #f1f5f9", background: rowBg(miktar) }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = rowBg(miktar) ?? ""}>
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
                  <td style={{ padding: "10px 14px" }}>
                    {fiyatlar.length === 0
                      ? <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>
                      : <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {fiyatlar.map(f => (
                            <span key={f.sym} style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>
                              {f.sym} {f.val}
                            </span>
                          ))}
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
                      {canDoStock("stock_parca_add") && <Btn small onClick={() => { setForm({ partId: String(part.id), miktar: "1", notlar: "" }); setModal("ekle"); }}
                        style={{ fontSize: 11 }}>+ Ekle</Btn>}
                      {canDoStock("stock_parca_edit") && <Btn small variant="ghost" onClick={() => openDuzelt({ part, stok, miktar })} style={{ fontSize: 11 }}>Düzelt</Btn>}
                      {canDoStock("stock_parca_pin") && (
                        <Btn small variant={isPinned ? "primary" : "ghost"} onClick={() => togglePin(part.id)}
                          title={isPinned ? "Dashboarddan çıkar" : "Dashboarda ekle"}
                          style={{ fontSize: 11, padding: "3px 7px" }}>
                          {isPinned ? "★" : "☆"}
                        </Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && filteredRows.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Arama sonucu bulunamadı.</div>
      )}
      <Pagination total={filteredRows.length} page={page} setPage={setPage} perPage={PER_PAGE} />

      {(modal === "ekle") && (
        <Modal title="Stoğa Parça Ekle" onClose={() => setModal(null)} maxWidth={420}>
          {(partStokLock && form.partId) ? (
            <LockConflict lockedBy={partStokLock.lockedBy} lockedAt={partStokLock.lockedAt}
              onForce={forcePartStokLock} onCancel={() => setModal(null)} />
          ) : (
            <>
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
            </>
          )}
        </Modal>
      )}

      {(modal === "duzelt") && (
        <Modal title="Stok Miktarını Düzelt" onClose={() => setModal(null)} maxWidth={420}>
          {partStokLock ? (
            <LockConflict lockedBy={partStokLock.lockedBy} lockedAt={partStokLock.lockedAt}
              onForce={forcePartStokLock} onCancel={() => setModal(null)} />
          ) : (
            <>
              <div style={{ fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "8px 12px", borderRadius: 8, marginBottom: 14 }}>
                <b>{parts.find(p => p.id === form.partId)?.ad}</b> — mevcut stok: <b>{stokMap[form.partId]?.miktar ?? 0} adet</b>
              </div>
              <Field label="Yeni Miktar (adet)">
                <Input type="number" min="0" value={form.miktar} onChange={e => setForm(p => ({ ...p, miktar: e.target.value }))} />
              </Field>
              <Field label="Not (opsiyonel)">
                <Input value={form.notlar} onChange={e => setForm(p => ({ ...p, notlar: e.target.value }))} placeholder="Örn: Sayım sonucu..." />
              </Field>
              {canDoStock("stock_parca_pin") && (() => {
                const isPinned = pinnedPartIds.includes(String(form.partId));
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer" }}
                    onClick={() => togglePin(form.partId)}>
                    <span style={{ fontSize: 18, color: isPinned ? "#e85d1a" : "#94a3b8" }}>{isPinned ? "★" : "☆"}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{isPinned ? "Dashboarddan Çıkar" : "Dashboarda Ekle"}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>Bu parça dashboard kartlarında {isPinned ? "görünüyor" : "görünmüyor"}</div>
                    </div>
                  </div>
                );
              })()}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
                <Btn variant="ghost" onClick={() => setModal(null)}>İptal</Btn>
                <Btn onClick={saveDuzelt}><Icon name="check" size={14} /> Kaydet</Btn>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
};
