import { useState, useEffect, useMemo } from "react";
import { ALTUNMAK_MODELS, DEFAULT_KDV_RATES } from "../lib/constants";
import { today, fmtTR, trLower, uid, bumpId, fmt, fmtKalipCapi, kalipCount, normalizeSaleType, calcKDV, fmtCur, parseMoney, customerHasAnyDebt, calcKalanBorc, isPaymentReceived, withDeleted, resolveSatisYapan } from "../lib/utils";
import { useFilteredList } from "../hooks/useFilteredList";
import { Icon, Btn, ConfirmDialog, Pagination } from "./ui";
import { CustomerDetailModal } from "./customers/CustomerDetailModal";
import { CustomerAddEditForm } from "./customers/CustomerAddEditForm";

const SALE_TYPE_STYLE = {
  "Faturalı Yurtiçi":  { bg: "#d1fae5", fg: "#065f46" },
  "Faturalı Yurtdışı": { bg: "#dbeafe", fg: "#1d4ed8" },
  "Faturasız Yurtiçi": { bg: "#fef3c7", fg: "#92400e" },
  "Faturasız Yurtdışı":{ bg: "#fde68a", fg: "#7c2d12" },
};

export const Customers = ({
  customers, setCustomers, services = [], setServices = null, dealers = null, models = ALTUNMAK_MODELS,
  factory = null, geoData = null, loadingGeo = false, stock = null, setStock = null,
  partSales = [], setPartSales = null, parts = [], payments = [], setPayments = null,
  partStock = [], setPartStock = null, partStockLog = [], setPartStockLog = null,
  title = "Müşteriler", addLabel = "Yeni Müşteri", entity = "Müşteri",
  searchPlaceholder = "Müşteri ara...", emptyLabel = "Müşteri bulunamadı.", delWord = "müşterisi",
  isCustomer = true, initialFilter = "all", initialDetailId = null, kalipDefs = [], showToast = () => {}, kdvRates = DEFAULT_KDV_RATES,
  appSettings = {},
}) => {
  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [listFilter, setListFilter] = useState(initialFilter || "all");
  useEffect(() => { setListFilter(initialFilter || "all"); }, [initialFilter]);
  const [groupByFirm, setGroupByFirm] = useState(false);
  const [detailViewId, setDetailViewId] = useState(null);
  useEffect(() => { if (initialDetailId != null) setDetailViewId(initialDetailId); }, [initialDetailId]);
  const [confirmId, setConfirmId] = useState(null);

  const isCustomerTab = isCustomer;
  const detailView = detailViewId != null ? customers.find(c => c.id === detailViewId) || null : null;
  const factoryName = factory?.name || "Altuntaş Makina";

  const firmCount = useMemo(() => {
    const fc = {};
    customers.forEach(c => { const k = trLower(c.name); fc[k] = (fc[k] || 0) + 1; });
    return fc;
  }, [customers]);

  const debtorIds = useMemo(() => {
    const ids = new Set();
    customers.forEach(c => { if (customerHasAnyDebt(c, services, partSales, factoryName)) ids.add(c.id); });
    return ids;
  }, [customers, services, partSales, factoryName]);

  const { search, setSearch, page, setPage, filtered: searched, perPage: PER_PAGE } = useFilteredList(customers, {
    searchFields: ["name", "city", "satisYapan", "contact", "country", "serialNo", "model"],
    filterFn: c => {
      if (listFilter === "warranty") return c.warrantyEnd && c.warrantyEnd < today();
      if (listFilter === "warranty-active") return c.warrantyEnd && c.warrantyEnd >= today();
      if (listFilter === "debt") return debtorIds.has(c.id);
      if (listFilter === "serial-pending") return c.seriNoBekliyor && !c.serialNo;
      return true;
    },
  });
  const filtered = groupByFirm
    ? (() => {
        const seen = new Set();
        return searched.filter(c => {
          const k = trLower(c.name);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      })()
    : searched;
  const sorted = sortBy ? [...filtered].sort((a, b) => {
    let av, bv;
    if (sortBy === "name") { av = trLower(a.name); bv = trLower(b.name); }
    else if (sortBy === "model") { av = trLower(a.model); bv = trLower(b.model); }
    else if (sortBy === "warranty") { av = a.warrantyEnd || ""; bv = b.warrantyEnd || ""; }
    else if (sortBy === "date") { av = a.installDate || ""; bv = b.installDate || ""; }
    else return 0;
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  }) : [...filtered].sort((a, b) => (b.installDate || "").localeCompare(a.installDate || ""));
  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
    setPage(1);
  };
  const paged = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openAdd = () => {
    const start = today();
    const end = `${parseInt(start.slice(0,4)) + 2}${start.slice(4)}`;
    setForm({
      kalipSayisi: 0, satisYapan: factory?.name || "Altuntaş Makina", name: "", phone: "", email: "",
      yetkili1Ad: "", yetkili1Tel: "", yetkili2Ad: "", yetkili2Tel: "",
      adres: "", city: "", country: "Türkiye", model: "",
      kaliplar: [], bantlar: [],
      installDate: start, warrantyEnd: end,
      faturali: "Faturalı Yurtiçi", faturaBedeli: "",
      fabrikaSatisBedeli: "", komisyon: "", _ilkOdemeSatirlari: [],
      serialNo: "",
    });
    setModal("add");
  };
  const openAddForFirm = (base) => {
    const start = today();
    const end = `${parseInt(start.slice(0,4)) + 2}${start.slice(4)}`;
    setForm({
      kalipSayisi: 0, satisYapan: base.satisYapan || (factory?.name || "Altuntaş Makina"),
      name: base.name || "", phone: base.phone || "", email: base.email || "",
      yetkili1Ad: base.yetkili1Ad || "", yetkili1Tel: base.yetkili1Tel || "",
      yetkili2Ad: base.yetkili2Ad || "", yetkili2Tel: base.yetkili2Tel || "",
      adres: base.adres || "", city: base.city || "", country: base.country || "Türkiye",
      model: "", kaliplar: [], bantlar: [],
      installDate: start, warrantyEnd: end,
      faturali: "Faturalı Yurtiçi", faturaBedeli: "",
      fabrikaSatisBedeli: "", komisyon: "", _ilkOdemeSatirlari: [], kalanBorc: "", serialNo: "", aciklama: "",
    });
    setModal("add");
  };
  const openEdit = c => {
    const kaliplar = Array.isArray(c.kaliplar) && c.kaliplar.length
      ? c.kaliplar
      : (c.kalip ? [{ olcu: "", ad: c.kalip }] : [{ olcu: "", ad: "" }]);
    setForm({ ...c, kaliplar, kalipSayisi: c.kalipSayisi ?? kaliplar.length });
    setModal({ edit: c });
  };
  const save = () => {
    if (modal === "add") {
      const { _manualSerial, _stokSerisiz, _ilkOdemeSatirlari, ...clean } = form;
      bumpId(customers, services, partSales, payments);
      const newId = uid();
      if (!clean.serialNo) clean.seriNoBekliyor = true;
      const ilkOdemeSatirlari = (_ilkOdemeSatirlari || []).filter(r => parseMoney(r.tutar) > 0);
      const ilkOdemeAlinanTutar = ilkOdemeSatirlari.filter(isPaymentReceived).reduce((s, r) => s + parseMoney(r.tutar), 0);
      clean.kalanBorc = Math.max(0, calcKalanBorc({ ...clean, id: newId }, payments, kdvRates) - ilkOdemeAlinanTutar);
      setCustomers(p => p.some(c => c.id === newId) ? p : [{ ...clean, id: newId }, ...p]);
      if (ilkOdemeSatirlari.length > 0 && setPayments) {
        const yeniOdemeler = ilkOdemeSatirlari.map(r => ({
          id: uid(), customerId: newId, tarih: clean.installDate || today(), tutar: parseMoney(r.tutar),
          currency: clean.currency || "TRY", not: "İlk ödeme (satış anında)", yontem: r.yontem || "Nakit",
          ...(r.yontem === "Çek" ? { vadeTarihi: r.vadeTarihi || "", tahsilEdildi: false } : {}),
        }));
        setPayments(p => [...yeniOdemeler, ...p]);
      }
      if (setStock) {
        if (_stokSerisiz) {
          setStock(p => {
            const idx = p.findIndex(s => s.model === clean.model && !s.serialNo);
            if (idx === -1) return p;
            return p.filter((_, i) => i !== idx);
          });
        } else if (clean.serialNo && !_manualSerial) {
          setStock(p => p.filter(s => !(s.model === clean.model && s.serialNo === clean.serialNo)));
        }
      }
      showToast(!clean.serialNo ? "Müşteri kaydedildi (seri no sonra atanacak)." : "Müşteri kaydedildi.");
    } else {
      const { _manualSerial, _stokSerisiz, _ilkOdemeSatirlari, ...clean } = form;
      const wasSerialPending = modal?.edit?.seriNoBekliyor && !modal.edit.serialNo;
      if (clean.serialNo && clean.seriNoBekliyor) clean.seriNoBekliyor = false;
      clean.kalanBorc = calcKalanBorc(clean, payments, kdvRates);
      setCustomers(p => p.map(c => c.id === clean.id ? clean : c));
      if (wasSerialPending && setStock) {
        if (_stokSerisiz) {
          setStock(p => {
            const idx = p.findIndex(s => s.model === clean.model && !s.serialNo);
            if (idx === -1) return p;
            return p.filter((_, i) => i !== idx);
          });
        } else if (clean.serialNo && !_manualSerial) {
          setStock(p => p.filter(s => !(s.model === clean.model && s.serialNo === clean.serialNo)));
        }
      }
      showToast("Müşteri bilgileri düzenlendi.");
    }
    setModal(null);
  };
  const del = id => setConfirmId(id);
  const confirmDel = () => {
    const c = customers.find(x => x.id === confirmId);
    const ts = new Date().toISOString();
    setCustomers(p => withDeleted(p, x => x.id === confirmId, ts));
    if (setServices) setServices(p => withDeleted(p, s => s.customerId === confirmId, ts));
    if (setPartSales) setPartSales(p => withDeleted(p, x => x.customerId === confirmId, ts));
    if (setPayments) setPayments(p => withDeleted(p, x => x.customerId === confirmId, ts));
    if (c && setStock && c.model && c.serialNo) {
      setStock(p => {
        const zatenVar = p.some(s => s.model === c.model && s.serialNo === c.serialNo);
        if (zatenVar) return p;
        bumpId(p);
        return [{ id: uid(), model: c.model, serialNo: c.serialNo, addedDate: today(), note: "Silinen müşteriden geri döndü" }, ...p];
      });
    }
    setConfirmId(null);
    showToast("Müşteri silindi.");
  };


  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{title}</h2>
        <Btn onClick={openAdd}><Icon name="plus" size={14} /> {addLabel}</Btn>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { v: "all", l: "Hepsi", count: customers.length },
          { v: "warranty-active", l: "Garantisi Devam Eden", count: customers.filter(c => c.warrantyEnd && c.warrantyEnd >= today()).length },
          { v: "warranty", l: "Garantisi Bitenler", count: customers.filter(c => c.warrantyEnd && c.warrantyEnd < today()).length },
          ...(isCustomerTab ? [{ v: "debt", l: "Borçlu Firmalar", count: debtorIds.size }] : []),
          ...(isCustomerTab ? [{ v: "serial-pending", l: "Seri No Bekleyen", count: customers.filter(c => c.seriNoBekliyor && !c.serialNo).length }] : []),
        ].map(f => (
          <button key={f.v} onClick={() => { setListFilter(f.v); setPage(1); }}
            style={{
              padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: "1px solid", borderColor: listFilter === f.v ? "#e85d1a" : "#e2e8f0",
              background: listFilter === f.v ? "#e85d1a" : "#fff",
              color: listFilter === f.v ? "#fff" : "#64748b",
            }}>
            {f.l} ({f.count})
          </button>
        ))}
        {isCustomerTab && (
          <button onClick={() => { setGroupByFirm(g => !g); setPage(1); }}
            style={{
              padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", marginLeft: "auto",
              border: "1px solid", borderColor: groupByFirm ? "#3b82f6" : "#e2e8f0",
              background: groupByFirm ? "#3b82f6" : "#fff",
              color: groupByFirm ? "#fff" : "#64748b",
            }}>
            {groupByFirm ? "Firmaya Göre Gruplu" : "Firmaya Göre Grupla"}
          </button>
        )}
      </div>
      {groupByFirm && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#1e40af" }}>
          Firmaya göre gruplu görünüm: <b>{filtered.length} firma</b> ({customers.length} makina kaydı). Birden fazla makinası olan firmaya tıklayınca tüm makinaları listelenir.
        </div>
      )}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={searchPlaceholder}
          style={{ paddingLeft: 36, padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc" }} />
      </div>
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                { h: "Satın Alan", key: "name" },
                { h: "Satış Yapan", key: null },
                { h: "Ülke / Şehir", key: null },
                { h: "Model", key: "model" },
                { h: "Seri No", key: null },
                { h: "Kalıp Sayısı", key: null },
                { h: "Makina Kalıp Çapı", key: null },
                { h: "Garanti Bitiş", key: "warranty" },
                { h: "Fatura", key: null },
                { h: "", key: null },
              ].map(({ h, key }) => (
                <th key={h || "actions"} onClick={key ? () => toggleSort(key) : undefined}
                  style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: sortBy === key ? "#e85d1a" : "#475569", borderBottom: "1px solid #e2e8f0", cursor: key ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap" }}>
                  {h}{key && sortBy === key && <span style={{ fontSize: 10, marginLeft: 4 }}>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map(c => {
              const warrantyOk = c.warrantyEnd && c.warrantyEnd >= today();
              const warrantySoon = warrantyOk && c.warrantyEnd <= new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
              const warrantyColor = !c.warrantyEnd ? "#cbd5e1" : !warrantyOk ? "#dc2626" : warrantySoon ? "#f59e0b" : "#16a34a";
              const hasKalanBorc = parseMoney(c.kalanBorc) > 0;
              const hasDebt = isCustomerTab && debtorIds.has(c.id);
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9", background: hasDebt ? "#fefce8" : undefined }}
                  title={hasDebt ? (hasKalanBorc ? `Kalan borç: ${fmt(parseMoney(c.kalanBorc))}` : "Servis, parça veya Extra Kalıp borcu var") : undefined}>
                  <td style={{ padding: "13px 16px", cursor: "pointer" }}
                    onClick={() => setDetailViewId(c.id)}
                    title="Tüm bilgileri görüntüle">
                    {c.prevOwners?.length > 0 ? (
                      <>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#dc2626", textDecoration: "line-through", opacity: .85 }}>{c.prevOwners[0].name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#059669", textDecoration: "underline", textDecorationColor: "#a7f3d0" }}>{c.name}</span>
                          {isCustomerTab && firmCount[trLower(c.name)] > 1 && (
                            <span style={{ fontSize: 10, fontWeight: 800, background: "#dbeafe", color: "#1d4ed8", borderRadius: 6, padding: "2px 8px" }}>{firmCount[trLower(c.name)]} makina</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, textDecoration: "underline", textDecorationColor: "#e2e8f0" }}>{c.name}</span>
                        {isCustomerTab && firmCount[trLower(c.name)] > 1 && (
                          <span style={{ fontSize: 10, fontWeight: 800, background: "#dbeafe", color: "#1d4ed8", borderRadius: 6, padding: "2px 8px" }}>{firmCount[trLower(c.name)]} makina</span>
                        )}
                      </div>
                    )}
                    {c.adres && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, maxWidth: 260, wordBreak: "break-word", overflowWrap: "break-word" }}>{c.adres}</div>}
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#475569" }}>{resolveSatisYapan(c.satisYapan, factory) || "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13 }}>{c.country && c.city ? `${c.country} / ${c.city}` : c.city || c.country || "—"}</td>
                  <td style={{ padding: "13px 16px" }}>{c.model ? <span style={{ fontSize: 12, background: "#fff7ed", color: "#c2410c", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>{c.model}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                  <td style={{ padding: "13px 16px", fontSize: 12, color: "#475569", fontFamily: "monospace" }}>
                    {c.serialNo
                      ? c.serialNo
                      : c.seriNoBekliyor
                        ? <span style={{ fontFamily: "inherit", fontSize: 10, fontWeight: 800, background: "#fef3c7", color: "#b45309", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>seri no bekliyor</span>
                        : "—"}
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#475569", textAlign: "center" }}>{kalipCount(c) || "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: 12, color: "#475569" }}>{fmtKalipCapi(c.kalipCapi) || "—"}</td>
                  <td style={{ padding: "13px 16px" }}>
                    {c.warrantyEnd
                      ? <span style={{ fontSize: 11, fontWeight: 600, color: warrantyOk ? (warrantySoon ? "#d97706" : "#059669") : "#dc2626", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 9, height: 9, borderRadius: "50%", background: warrantyColor, flexShrink: 0 }}></span>
                          {fmtTR(c.warrantyEnd)}
                        </span>
                      : <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    {c.faturali ? (() => {
                      const tip = normalizeSaleType(c.faturali);
                      const stil = SALE_TYPE_STYLE[tip] || { bg: "#f1f5f9", fg: "#475569" };
                      return (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: stil.bg, color: stil.fg }}>
                          {tip}
                        </span>
                      );
                    })() : <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn small variant="ghost" onClick={() => openEdit(c)}><Icon name="edit" size={12} /></Btn>
                      <Btn small variant="danger" onClick={() => del(c.id)}><Icon name="trash" size={12} /></Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>{emptyLabel}</div>}
        <Pagination total={filtered.length} page={page} setPage={setPage} perPage={PER_PAGE} />
      </div>

      {detailView && (
        <CustomerDetailModal
          detailView={detailView}
          onClose={() => setDetailViewId(null)}
          onSwitchMachine={setDetailViewId}
          onOpenEdit={openEdit}
          onOpenAddForFirm={openAddForFirm}
          isCustomer={isCustomerTab}
          customers={customers} setCustomers={setCustomers}
          services={services} setServices={setServices}
          partSales={partSales} setPartSales={setPartSales}
          payments={payments} setPayments={setPayments}
          setStock={setStock}
          setPartStock={setPartStock} setPartStockLog={setPartStockLog}
          parts={parts} models={models} dealers={dealers} factory={factory}
          geoData={geoData} loadingGeo={loadingGeo}
          kdvRates={kdvRates} appSettings={appSettings}
          showToast={showToast}
          kalipDefs={kalipDefs}
        />
      )}

      {confirmId && (
        <ConfirmDialog
          message={`"${customers.find(c => c.id === confirmId)?.name || ""}" ${delWord} Çöp Kutusu'na taşınacak. Bu makinaya ait servis kayıtları, Extra Kalıp satışları ve ödeme/kapora kayıtları da birlikte taşınır. Ayarlar'dan 30 gün içinde geri alabilirsiniz.`}
          onConfirm={confirmDel}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {modal && (
        <CustomerAddEditForm
          modal={modal} form={form} setForm={setForm} save={save} onClose={() => setModal(null)}
          stock={stock} models={models} kalipDefs={kalipDefs} parts={parts}
          dealers={dealers} factory={factory} kdvRates={kdvRates} payments={payments}
          geoData={geoData} loadingGeo={loadingGeo}
          addLabel={addLabel} entity={entity}
        />
      )}
    </div>
  );
};
