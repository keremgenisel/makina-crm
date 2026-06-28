import { useState, useMemo } from "react";
import { today, fmtTR, uid, bantMergeAndUpdate, bantTotalMiktar, parseMoney, fmtCur } from "../../lib/utils";
import { useFilteredList } from "../../hooks/useFilteredList";
import { Icon, Field, Input, Warn, Btn, Modal, Pagination } from "../ui";

const PER_PAGE = 15;

const bantPriceSummary = (b) => {
  const bits = [];
  if (parseMoney(b.fiyatTRY) > 0) bits.push(fmtCur(parseMoney(b.fiyatTRY), "TRY"));
  if (parseMoney(b.fiyatUSD) > 0) bits.push(fmtCur(parseMoney(b.fiyatUSD), "USD"));
  if (parseMoney(b.fiyatEUR) > 0) bits.push(fmtCur(parseMoney(b.fiyatEUR), "EUR"));
  return bits.length ? bits.join(" · ") : "—";
};

export const BantStokTab = ({ bantlar = [], bantStock = [], setBantStock, bantStockLog = [], setBantStockLog, showToast }) => {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const stokMap = useMemo(() => {
    const m = {};
    bantStock.forEach(s => { m[String(s.bantId)] = s; });
    return m;
  }, [bantStock]);

  const rows = useMemo(() =>
    bantlar.map(b => ({ bant: b, stok: stokMap[String(b.id)] || null, miktar: Math.max(0, stokMap[String(b.id)]?.miktar ?? 0) })),
  [bantlar, stokMap]);

  const { search, setSearch, page, setPage, filtered: filteredRows, paged: pagedRows } = useFilteredList(rows, {
    searchFn: (r, q) => r.bant.ad.toLowerCase().includes(q) || (r.bant.en || "").toLowerCase().includes(q) || (r.bant.boy || "").toLowerCase().includes(q),
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

  const openEkle = () => { setForm({ bantId: "", miktar: "1", notlar: "" }); setModal("ekle"); };
  const openDuzelt = (row) => { setForm({ bantId: String(row.bant.id), miktar: String(row.miktar), notlar: row.stok?.notlar || "" }); setModal("duzelt"); };

  const saveEkle = () => {
    if (!form.bantId) { showToast("Bant seçilmedi.", "err"); return; }
    const qty = parseInt(form.miktar) || 0;
    if (qty <= 0) { showToast("Geçerli bir miktar girin.", "err"); return; }
    const bid = String(form.bantId);
    const logId = uid();
    setBantStock(p => bantMergeAndUpdate(p, bid, bantTotalMiktar(p, bid) + qty));
    setBantStockLog(p => [...p, { id: logId, bantId: bid, miktar: qty, tip: "stok_girisi", referansId: null, tarih: today(), notlar: form.notlar || "" }]);
    showToast("Stok güncellendi.");
    setModal(null);
  };

  const saveDuzelt = () => {
    const qty = parseInt(form.miktar);
    if (isNaN(qty)) { showToast("Geçerli bir miktar girin.", "err"); return; }
    const bid = String(form.bantId);
    const logId = uid();
    setBantStock(p => bantMergeAndUpdate(p, bid, qty));
    setBantStockLog(p => [...p, { id: logId, bantId: bid, miktar: qty, tip: "manuel_duzelt", referansId: null, tarih: today(), notlar: `Sayım düzeltmesi${form.notlar ? ": " + form.notlar : ""}` }]);
    showToast("Stok düzeltildi.");
    setModal(null);
  };

  const inputStyle = { width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", outline: "none", fontFamily: "inherit" };

  const kritikSayisi = rows.filter(r => r.miktar <= 0).length;
  const dusukSayisi  = rows.filter(r => r.miktar > 0 && r.miktar <= 5).length;

  return (
    <div>
      {(kritikSayisi > 0 || dusukSayisi > 0) && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {kritikSayisi > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#991b1b", fontWeight: 600 }}>
              {kritikSayisi} bant tükendi
            </div>
          )}
          {dusukSayisi > 0 && (
            <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#92400e", fontWeight: 600 }}>
              {dusukSayisi} bantta stok azaldı (5 veya altı)
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Bant adı veya ölçü ara..."
            style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
        </div>
        <Btn onClick={openEkle}><Icon name="plus" size={14} /> Stoka Bant Ekle</Btn>
      </div>

      {bantlar.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          Henüz bant tanımı yok. Ayarlar → Bant Modelleri'nden ekleyin.
        </div>
      ) : (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Bant", "Ölçü (En×Boy)", "Fiyat", "Stok", "Son Güncelleme", ""].map(h => (
                  <th key={h} style={{ padding: "9px 14px", textAlign: h === "Stok" ? "center" : "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedRows.map(({ bant, stok, miktar }) => (
                <tr key={bant.id} style={{ borderBottom: "1px solid #f1f5f9", background: rowBg(miktar) }}>
                  <td style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13, color: rowColor(miktar) }}>{bant.ad}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "#475569" }}>
                    {bant.en && bant.boy ? `${bant.en} × ${bant.boy}` : (bant.en || bant.boy || "—")}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748b" }}>{bantPriceSummary(bant)}</td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: rowColor(miktar) }}>{miktar}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 4 }}>adet</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#94a3b8" }}>
                    {stok?.sonGuncelleme ? fmtTR(stok.sonGuncelleme) : "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <Btn small onClick={() => { setForm({ bantId: String(bant.id), miktar: "1", notlar: "" }); setModal("ekle"); }}
                        style={{ fontSize: 11 }}>+ Ekle</Btn>
                      <Btn small variant="ghost" onClick={() => openDuzelt({ bant, stok, miktar })} style={{ fontSize: 11 }}>Düzelt</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {bantlar.length > 0 && filteredRows.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Arama sonucu bulunamadı.</div>
      )}
      <Pagination total={filteredRows.length} page={page} setPage={setPage} perPage={PER_PAGE} />

      {(modal === "ekle") && (
        <Modal title="Stoka Bant Ekle" onClose={() => setModal(null)} maxWidth={420}>
          <Field label="Bant">
            <select value={form.bantId} onChange={e => setForm(p => ({ ...p, bantId: e.target.value }))} style={inputStyle}>
              <option value="">Bant seçin...</option>
              {bantlar.map(b => (
                <option key={b.id} value={b.id}>
                  {b.ad}{b.en && b.boy ? ` (${b.en}×${b.boy})` : ""}
                </option>
              ))}
            </select>
            <Warn>{!form.bantId ? "Bant seçilmedi" : ""}</Warn>
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
            {(() => { const b = bantlar.find(b => String(b.id) === String(form.bantId)); return b ? <><b>{b.ad}</b>{b.en && b.boy ? ` (${b.en}×${b.boy})` : ""} — mevcut stok: <b>{stokMap[form.bantId]?.miktar ?? 0} adet</b></> : null; })()}
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
