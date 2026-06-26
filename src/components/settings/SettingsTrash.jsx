import { useState, useMemo } from "react";
import { DEFAULT_KDV_RATES } from "../../lib/constants";
import { fmtTR, fmtCur, calcKalanBorc, mergeAndUpdate, totalMiktar, uid, today } from "../../lib/utils";
import { Icon, Btn, Pagination, ConfirmDialog } from "../ui";
import { useFilteredList } from "../../hooks/useFilteredList";
import { Section } from "./Section";

export const SettingsTrash = ({
  rawCustomers, rawServices, rawPartSales, rawPayments, rawDealers, rawStock, rawNotes, rawKalipDefs, rawParts, rawCustomModels,
  rawTeklifler = [],
  setCustomers, setServices, setPartSales, setPayments, setDealers, setStock, setNotes, setKalipDefs, setParts, setCustomModels,
  setTeklifler,
  partStock = [], setPartStock = null, partStockLog = [], setPartStockLog = null,
  appSettings, showToast,
}) => {
  // ── Çöp Kutusu: tüm dizilerdeki deletedAt'li (soft-delete edilmiş) kayıtlar tek bir listede ──
  const trashCustomerName = (id) => rawCustomers.find(c => c.id === id)?.name || "—";
  const [confirmPurge, setConfirmPurge] = useState(null); // kalıcı silme onayı bekleyen trash item

  const restoreCustomer = (c) => {
    setCustomers(p => p.map(x => x.id === c.id ? { ...x, deletedAt: undefined } : x));
    setServices(p => p.map(s => (s.customerId === c.id && s.deletedAt === c.deletedAt) ? { ...s, deletedAt: undefined } : s));
    setPartSales?.(p => p.map(x => (x.customerId === c.id && x.deletedAt === c.deletedAt) ? { ...x, deletedAt: undefined } : x));
    setPayments?.(p => p.map(x => (x.customerId === c.id && x.deletedAt === c.deletedAt) ? { ...x, deletedAt: undefined } : x));
    showToast("Müşteri geri alındı.");
  };
  const purgeCustomer = (c) => {
    setCustomers(p => p.filter(x => x.id !== c.id));
    setServices(p => p.filter(s => !(s.customerId === c.id && s.deletedAt === c.deletedAt)));
    setPartSales?.(p => p.filter(x => !(x.customerId === c.id && x.deletedAt === c.deletedAt)));
    setPayments?.(p => p.filter(x => !(x.customerId === c.id && x.deletedAt === c.deletedAt)));
    showToast("Müşteri kalıcı olarak silindi.");
  };
  const restoreService = (s) => { setServices(p => p.map(x => x.id === s.id ? { ...x, deletedAt: undefined } : x)); showToast("Servis kaydı geri alındı."); };
  const purgeService = (s) => { setServices(p => p.filter(x => x.id !== s.id)); showToast("Servis kaydı kalıcı olarak silindi."); };
  const restorePartSale = (ps) => {
    setPartSales?.(p => p.map(x => x.id === ps.id ? { ...x, deletedAt: undefined } : x));
    if (ps.tur === "Kalıp") {
      setCustomers(p => p.map(c => c.id === ps.customerId
        ? { ...c, kaliplar: [...(c.kaliplar || []), { ad: ps.ad, olcu: ps.olcu, partSaleId: ps.id }], kalipSayisi: (c.kaliplar || []).length + 1 }
        : c));
      showToast("Extra Kalıp kaydı geri alındı.");
    } else if (ps.tur === "YedekParca") {
      // Satış soft-silinince stok restore edilmişti — geri alınca tekrar düşmeli
      if (ps.partId && parseInt(ps.miktar) > 0 && setPartStock && setPartStockLog) {
        const pid = String(ps.partId);
        setPartStock(ps2 => mergeAndUpdate(ps2, pid, totalMiktar(ps2, pid) - parseInt(ps.miktar)));
        setPartStockLog(lg => [...lg, { id: uid(), partId: pid, miktar: -parseInt(ps.miktar), tip: "satis", referansId: ps.id, tarih: today(), notlar: "Çöp kutusundan geri alındı" }]);
      }
      showToast("Yedek Parça satışı geri alındı.");
    } else {
      showToast("Kayıt geri alındı.");
    }
  };
  const purgePartSale = (ps) => {
    setPartSales?.(p => p.filter(x => x.id !== ps.id));
    const label = ps.tur === "YedekParca" ? "Yedek Parça satışı" : "Extra Kalıp kaydı";
    showToast(`${label} kalıcı olarak silindi.`);
  };
  const restorePayment = (pay) => {
    // kalanBorc'u doğru hesaplamak için ham (raw) listeden, bu kayıt da dahil olmak üzere canlı set türetilir
    const liveCustomerPayments = rawPayments
      .filter(x => x.customerId === pay.customerId && (x.id === pay.id || !x.deletedAt))
      .map(x => x.id === pay.id ? { ...x, deletedAt: undefined } : x);
    setPayments?.(p => p.map(x => x.id === pay.id ? { ...x, deletedAt: undefined } : x));
    setCustomers(p => p.map(c => c.id === pay.customerId ? { ...c, kalanBorc: calcKalanBorc(c, liveCustomerPayments, appSettings?.kdvRates ?? DEFAULT_KDV_RATES) } : c));
    showToast("Ödeme kaydı geri alındı.");
  };
  const purgePayment = (pay) => { setPayments?.(p => p.filter(x => x.id !== pay.id)); showToast("Ödeme kaydı kalıcı olarak silindi."); };
  const restoreDealer = (d) => { setDealers(p => p.map(x => x.id === d.id ? { ...x, deletedAt: undefined } : x)); showToast("Bayi geri alındı."); };
  const purgeDealer = (d) => { setDealers(p => p.filter(x => x.id !== d.id)); showToast("Bayi kalıcı olarak silindi."); };
  const restoreStockItem = (s) => { setStock?.(p => p.map(x => x.id === s.id ? { ...x, deletedAt: undefined } : x)); showToast("Stok kaydı geri alındı."); };
  const purgeStockItem = (s) => { setStock?.(p => p.filter(x => x.id !== s.id)); showToast("Stok kaydı kalıcı olarak silindi."); };
  const restoreNote = (n) => { setNotes?.(p => p.map(x => x.id === n.id ? { ...x, deletedAt: undefined } : x)); showToast("Not geri alındı."); };
  const purgeNote = (n) => { setNotes?.(p => p.filter(x => x.id !== n.id)); showToast("Not kalıcı olarak silindi."); };
  const restoreKalipDef = (k) => { setKalipDefs(p => p.map(x => x.id === k.id ? { ...x, deletedAt: undefined } : x)); showToast("Kalıp tanımı geri alındı."); };
  const purgeKalipDef = (k) => { setKalipDefs(p => p.filter(x => x.id !== k.id)); showToast("Kalıp tanımı kalıcı olarak silindi."); };
  const restorePart = (pt) => { setParts?.(p => p.map(x => x.id === pt.id ? { ...x, deletedAt: undefined } : x)); showToast("Yedek parça tanımı geri alındı."); };
  const purgePart = (pt) => { setParts?.(p => p.filter(x => x.id !== pt.id)); showToast("Yedek parça tanımı kalıcı olarak silindi."); };
  const restoreCustomModel = (m) => { setCustomModels(p => p.map(x => x.model === m.model ? { ...x, deletedAt: undefined } : x)); showToast("Model geri alındı."); };
  const purgeCustomModel = (m) => { setCustomModels(p => p.filter(x => x.model !== m.model)); showToast("Model kalıcı olarak silindi."); };
  const restoreTeklif = (t) => { setTeklifler?.(p => p.map(x => x.id === t.id ? { ...x, deletedAt: undefined } : x)); showToast("Belge geri alındı."); };
  const purgeTeklif = (t) => { setTeklifler?.(p => p.filter(x => x.id !== t.id)); showToast("Belge kalıcı olarak silindi."); };

  const trashItems = useMemo(() => {
    const items = [];
    rawCustomers.filter(c => c.deletedAt).forEach(c => items.push({ key: `cust-${c.id}`, type: "Müşteri", label: c.name || "—", deletedAt: c.deletedAt, restore: () => restoreCustomer(c), purge: () => purgeCustomer(c) }));
    rawServices.filter(s => s.deletedAt).forEach(s => items.push({ key: `svc-${s.id}`, type: "Servis", label: `${trashCustomerName(s.customerId)} · ${s.type || ""}${s.date ? " · " + fmtTR(s.date) : ""}`, deletedAt: s.deletedAt, restore: () => restoreService(s), purge: () => purgeService(s) }));
    rawPartSales.filter(p => p.deletedAt).forEach(p => {
      const entityName = p.customerId ? trashCustomerName(p.customerId) : (rawDealers.find(d => d.id === p.dealerId)?.name || "—");
      const turLabel = p.tur === "YedekParca" ? "Yedek Parça Satışı" : "Extra Kalıp";
      items.push({ key: `ps-${p.id}`, type: turLabel, label: `${entityName} · ${p.ad || ""}`, deletedAt: p.deletedAt, restore: () => restorePartSale(p), purge: () => purgePartSale(p) });
    });
    rawPayments.filter(p => p.deletedAt).forEach(p => items.push({ key: `pay-${p.id}`, type: "Ödeme", label: `${trashCustomerName(p.customerId)} · ${fmtCur(p.tutar, p.currency)}`, deletedAt: p.deletedAt, restore: () => restorePayment(p), purge: () => purgePayment(p) }));
    rawDealers.filter(d => d.deletedAt).forEach(d => items.push({ key: `dealer-${d.id}`, type: "Bayi", label: d.name || "—", deletedAt: d.deletedAt, restore: () => restoreDealer(d), purge: () => purgeDealer(d) }));
    rawStock.filter(s => s.deletedAt).forEach(s => items.push({ key: `stock-${s.id}`, type: "Stok", label: `${s.model || "—"}${s.serialNo ? " · " + s.serialNo : ""}`, deletedAt: s.deletedAt, restore: () => restoreStockItem(s), purge: () => purgeStockItem(s) }));
    rawNotes.filter(n => n.deletedAt).forEach(n => items.push({ key: `note-${n.id}`, type: "Not", label: (n.content || "").slice(0, 50) || "(boş not)", deletedAt: n.deletedAt, restore: () => restoreNote(n), purge: () => purgeNote(n) }));
    rawKalipDefs.filter(k => k.deletedAt).forEach(k => items.push({ key: `kalip-${k.id}`, type: "Kalıp Tanımı", label: k.ad || "—", deletedAt: k.deletedAt, restore: () => restoreKalipDef(k), purge: () => purgeKalipDef(k) }));
    rawParts.filter(p => p.deletedAt).forEach(p => items.push({ key: `part-${p.id}`, type: "Yedek Parça Tanımı", label: p.ad || "—", deletedAt: p.deletedAt, restore: () => restorePart(p), purge: () => purgePart(p) }));
    rawCustomModels.filter(m => m.deletedAt).forEach(m => items.push({ key: `model-${m.model}`, type: "Model", label: m.model || "—", deletedAt: m.deletedAt, restore: () => restoreCustomModel(m), purge: () => purgeCustomModel(m) }));
    rawTeklifler.filter(t => t.deletedAt).forEach(t => items.push({ key: `teklif-${t.id}`, type: t.type === "proforma" ? "Proforma" : "Teklif", label: `${t.no || "—"} · ${t.firma || "—"}`, deletedAt: t.deletedAt, restore: () => restoreTeklif(t), purge: () => purgeTeklif(t) }));
    return items.sort((a, b) => (b.deletedAt || "").localeCompare(a.deletedAt || ""));
  }, [rawCustomers, rawServices, rawPartSales, rawPayments, rawDealers, rawStock, rawNotes, rawKalipDefs, rawParts, rawCustomModels, rawTeklifler]);

  const { search: trashSearch, setSearch: setTrashSearch, page: trashPage, setPage: setTrashPage, filtered: trashItemsFiltered, paged: trashItemsPaged, perPage: TRASH_PER_PAGE } =
    useFilteredList(trashItems, { searchFields: ["type", "label"], perPage: 10 });

  return (
    <>
      <Section title="Çöp Kutusu" icon="trash">
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
          Silinen kayıtlar buraya taşınır ve <b>30 gün</b> sonra otomatik olarak kalıcı silinir. Bu süre içinde geri alabilirsiniz.
        </div>
        {trashItems.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Çöp kutusu boş.</div>
        ) : (
          <>
            <div style={{ position: "relative", marginBottom: 14 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
              <input value={trashSearch} onChange={e => setTrashSearch(e.target.value)} placeholder="Tür veya kayıt ara..."
                style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
            </div>
            {trashItemsFiltered.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Arama sonucu bulunamadı.</div>
            ) : (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: "#f8fafc" }}>
                    {["Tür", "Kayıt", "Silinme Tarihi", ""].map(h => <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {trashItemsPaged.map(item => (
                      <tr key={item.key} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 16px", fontSize: 11, fontWeight: 800, color: "#92400e" }}>
                          <span style={{ background: "#fef3c7", borderRadius: 6, padding: "2px 8px" }}>{item.type}</span>
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{item.label}</td>
                        <td style={{ padding: "10px 16px", fontSize: 12, color: "#64748b" }}>{item.deletedAt ? fmtTR(item.deletedAt.slice(0, 10)) : "—"}</td>
                        <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "nowrap" }}>
                            <Btn small variant="ghost" onClick={item.restore}><Icon name="refresh" size={12} /> Geri Al</Btn>
                            <Btn small variant="danger" onClick={() => setConfirmPurge(item)}><Icon name="trash" size={12} /> Kalıcı Sil</Btn>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination total={trashItemsFiltered.length} page={trashPage} setPage={setTrashPage} perPage={TRASH_PER_PAGE} />
          </>
        )}
      </Section>

      {/* Çöp Kutusu: kalıcı silme onayı */}
      {confirmPurge && (
        <ConfirmDialog
          message={`"${confirmPurge.label}" kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
          onConfirm={() => { confirmPurge.purge(); setConfirmPurge(null); }}
          onCancel={() => setConfirmPurge(null)}
        />
      )}
    </>
  );
};
