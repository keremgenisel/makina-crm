import { useState, useEffect } from "react";
import { ALTUNMAK_MODELS, CUR_SYM, SALE_TYPES, DEFAULT_KDV_RATE } from "../lib/constants";
import { today, fmtTR, trLower, uid, bumpId, fmt, fmtKalipCapi, normalizeSaleType, isFaturali, isYurtIci, calcKDV, fmtCur, parseMoney } from "../lib/utils";
import { Icon, Field, Input, Warn, EMAIL_RE, PHONE_RE, Select, MoneyInput, Btn, Modal, ConfirmDialog, Pagination, CountryCityFields } from "./ui";

export const Customers = ({
  customers, setCustomers, services = [], setServices = null, dealers = null, models = ALTUNMAK_MODELS,
  factory = null, geoData = null, loadingGeo = false, stock = null, setStock = null,
  title = "Müşteriler", addLabel = "Yeni Müşteri", entity = "Müşteri",
  searchPlaceholder = "Müşteri ara...", emptyLabel = "Müşteri bulunamadı.", delWord = "müşterisi",
  isCustomer = true, initialFilter = "all", kalipDefs = [], showToast = () => {}, kdvRate = DEFAULT_KDV_RATE,
}) => {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const [listFilter, setListFilter] = useState(initialFilter || "all"); // all | warranty | warranty-active | debt | serial-pending
  useEffect(() => { setListFilter(initialFilter || "all"); }, [initialFilter]);
  const [groupByFirm, setGroupByFirm] = useState(false); // true → firmaya göre tek satır
  const [detailView, setDetailView] = useState(null); // tıklanan müşterinin tüm bilgileri
  const [firmView, setFirmView] = useState(null); // gruplu modda: firmanın tüm makinaları
  const isCustomerTab = isCustomer; // hibrit özellikler yalnızca müşteriler sekmesinde

  // Firma adına göre makina sayısı (aynı isimli kayıtlar = aynı firma)
  const firmCount = {};
  customers.forEach(c => { const k = trLower(c.name); firmCount[k] = (firmCount[k] || 0) + 1; });

  const q = trLower(search);
  const baseList = listFilter === "warranty"
    ? customers.filter(c => c.warrantyEnd && c.warrantyEnd < today())
    : listFilter === "warranty-active"
    ? customers.filter(c => c.warrantyEnd && c.warrantyEnd >= today())
    : listFilter === "debt"
    ? customers.filter(c => parseMoney(c.kalanBorc) > 0)
    : listFilter === "serial-pending"
    ? customers.filter(c => c.seriNoBekliyor && !c.serialNo)
    : customers;
  const searched = baseList.filter(c =>
    trLower(c.name).includes(q) ||
    trLower(c.city).includes(q) ||
    trLower(c.satisYapan).includes(q) ||
    trLower(c.contact).includes(q) ||
    trLower(c.country).includes(q) ||
    trLower(c.serialNo).includes(q)
  );
  // Gruplama açıksa her firmadan sadece ilk kayıt listede görünür (rozet adediyle)
  // O(n) — Set ile (büyük listelerde findIndex'in O(n^2) donmasını önler)
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
  // Sütun sıralaması
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
  }) : filtered;
  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
    setPage(1);
  };
  const paged = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const [modelPicker, setModelPicker] = useState(false);
  const openAdd  = () => {
    const start = today();
    const end = `${parseInt(start.slice(0,4)) + 2}${start.slice(4)}`; // otomatik +2 yıl
    setForm({
      kalipSayisi: 1, satisYapan: "Altuntaş Makina", name: "", phone: "", email: "",
      yetkili1Ad: "", yetkili1Tel: "", yetkili2Ad: "", yetkili2Tel: "",
      adres: "", city: "", country: "Türkiye", model: "",
      kaliplar: [{ olcu: "", ad: "" }],
      installDate: start, warrantyEnd: end,
      faturali: "Faturalı Yurt İçi", faturaBedeli: "",
      fabrikaSatisBedeli: "", komisyon: "", extraKalipFiyati: "",
      serialNo: "",
    });
    setModal("add"); setModelPicker(false);
  };
  // Aynı firmaya yeni makina ekle: firma/iletişim bilgileri otomatik dolu gelir
  const openAddForFirm = (base) => {
    const start = today();
    const end = `${parseInt(start.slice(0,4)) + 2}${start.slice(4)}`;
    setForm({
      kalipSayisi: 1, satisYapan: base.satisYapan || (factory?.name || "Altuntaş Makina"),
      name: base.name || "", phone: base.phone || "", email: base.email || "",
      yetkili1Ad: base.yetkili1Ad || "", yetkili1Tel: base.yetkili1Tel || "",
      yetkili2Ad: base.yetkili2Ad || "", yetkili2Tel: base.yetkili2Tel || "",
      adres: base.adres || "", city: base.city || "", country: base.country || "Türkiye",
      model: "", kaliplar: [{ olcu: "", ad: "" }],
      installDate: start, warrantyEnd: end,
      faturali: "Faturalı Yurt İçi", faturaBedeli: "",
      fabrikaSatisBedeli: "", komisyon: "", extraKalipFiyati: "", kalanBorc: "", serialNo: "", aciklama: "",
    });
    setModal("add"); setModelPicker(false);
  };
  const openEdit = c => {
    // Eski kayıtlarla uyumluluk: kalip (tek metin) → kaliplar dizisine dönüştür
    const kaliplar = Array.isArray(c.kaliplar) && c.kaliplar.length
      ? c.kaliplar
      : (c.kalip ? [{ olcu: "", ad: c.kalip }] : [{ olcu: "", ad: "" }]);
    setForm({ ...c, kaliplar, kalipSayisi: c.kalipSayisi ?? kaliplar.length });
    setModal({ edit: c }); setModelPicker(false);
  };
  const save = () => {
    if (modal === "add") {
      const { _manualSerial, _stokSerisiz, ...clean } = form;
      bumpId(customers, services);
      const newId = uid();
      // Seri no boşsa "bekliyor" işaretle (stoktan seri no'suz seçilse de, hiç girilmese de)
      if (!clean.serialNo) clean.seriNoBekliyor = true;
      setCustomers(p => p.some(c => c.id === newId) ? p : [{ ...clean, id: newId }, ...p]);
      // Stoktan düşme:
      if (setStock) {
        if (_stokSerisiz) {
          // Seri no'suz: o modelden ilk seri no'suz adedi düş (bir tane)
          setStock(p => {
            const idx = p.findIndex(s => s.model === clean.model && !s.serialNo);
            if (idx === -1) return p;
            return p.filter((_, i) => i !== idx);
          });
        } else if (clean.serialNo && !_manualSerial) {
          // Seri no'lu stoktan: eşleşen seri no'yu düş
          setStock(p => p.filter(s => !(s.model === clean.model && s.serialNo === clean.serialNo)));
        }
      }
      showToast(!clean.serialNo ? "Müşteri kaydedildi (seri no sonra atanacak)." : "Müşteri kaydedildi.");
    } else {
      const { _manualSerial, _stokSerisiz, ...clean } = form;
      // Düzenlemede seri no girildiyse "bekliyor" işaretini kaldır
      if (clean.serialNo && clean.seriNoBekliyor) clean.seriNoBekliyor = false;
      setCustomers(p => p.map(c => c.id === clean.id ? clean : c));
      showToast("Müşteri bilgileri düzenlendi.");
    }
    setModal(null);
  };
  const [confirmId, setConfirmId] = useState(null);
  const del = id => setConfirmId(id);
  const confirmDel = () => {
    const c = customers.find(x => x.id === confirmId);
    setCustomers(p => p.filter(x => x.id !== confirmId));
    // Silinen müşterinin servis kayıtları da silinsin
    if (setServices) setServices(p => p.filter(s => s.customerId !== confirmId));
    // Silinen müşterinin makinası stoğa geri dönsün (model + seri no varsa ve stokta yoksa)
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
          { v: "warranty-active", l: "🟢 Garantisi Devam Eden", count: customers.filter(c => c.warrantyEnd && c.warrantyEnd >= today()).length },
          { v: "warranty", l: "⚠ Garantisi Bitenler", count: customers.filter(c => c.warrantyEnd && c.warrantyEnd < today()).length },
          ...(isCustomerTab ? [{ v: "debt", l: "₺ Borçlu Firmalar", count: customers.filter(c => parseMoney(c.kalanBorc) > 0).length }] : []),
          ...(isCustomerTab ? [{ v: "serial-pending", l: "⏳ Seri No Bekleyen", count: customers.filter(c => c.seriNoBekliyor && !c.serialNo).length }] : []),
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
            {groupByFirm ? "✓ Firmaya Göre Gruplu" : "Firmaya Göre Grupla"}
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
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={searchPlaceholder}
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
              const hasDebt = isCustomerTab && parseMoney(c.kalanBorc) > 0;
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9", background: hasDebt ? "#fefce8" : undefined }}
                  title={hasDebt ? `Kalan borç: ${fmt(parseMoney(c.kalanBorc))}` : undefined}>
                  <td style={{ padding: "13px 16px", cursor: "pointer" }}
                    onClick={() => {
                      if (groupByFirm && firmCount[trLower(c.name)] > 1) {
                        setFirmView(customers.filter(x => trLower(x.name) === trLower(c.name)));
                      } else {
                        setDetailView(c);
                      }
                    }}
                    title={groupByFirm && firmCount[trLower(c.name)] > 1 ? "Firmanın tüm makinalarını gör" : "Tüm bilgileri görüntüle"}>
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
                    {c.adres && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{c.adres}</div>}
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#475569" }}>{c.satisYapan || "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13 }}>{c.country && c.city ? `${c.country} / ${c.city}` : c.city || c.country || "—"}</td>
                  <td style={{ padding: "13px 16px" }}>{c.model ? <span style={{ fontSize: 12, background: "#fff7ed", color: "#c2410c", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>{c.model}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                  <td style={{ padding: "13px 16px", fontSize: 12, color: "#475569", fontFamily: "monospace" }}>
                    {c.serialNo
                      ? c.serialNo
                      : c.seriNoBekliyor
                        ? <span style={{ fontFamily: "inherit", fontSize: 10, fontWeight: 800, background: "#fef3c7", color: "#b45309", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>⏳ seri no bekliyor</span>
                        : "—"}
                  </td>
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
                      const stil = tip === "Faturalı Yurt İçi" ? { bg: "#d1fae5", fg: "#065f46" }
                        : tip === "Faturalı İhracat" ? { bg: "#dbeafe", fg: "#1d4ed8" }
                        : { bg: "#fef3c7", fg: "#92400e" };
                      const kisaAd = tip === "Faturalı Yurt İçi" ? "Yurt İçi" : tip === "Faturalı İhracat" ? "İhracat" : "Faturasız";
                      return (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: stil.bg, color: stil.fg }}>
                          {kisaAd}{c.faturaBedeli ? ` · ${fmtCur(c.faturaBedeli, c.currency)}` : ""}
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

      {/* Firma — tüm makinalar (gruplu mod) */}
      {firmView && firmView.length > 0 && (
        <Modal wide title={`${firmView[0].name} — ${firmView.length} Makina`} onClose={() => setFirmView(null)}>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
            Bu firmaya ait tüm makinalar. Detayını görmek için bir makinaya tıklayın.
          </div>
          {firmView.map((m, i) => {
            const wOk = m.warrantyEnd && m.warrantyEnd >= today();
            return (
              <div key={m.id}
                onClick={() => { setFirmView(null); setDetailView(m); }}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 10, cursor: "pointer", background: "#fff" }}
                onMouseEnter={e => e.currentTarget.style.background = "#fff7ed"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{i + 1}. {m.model || "Model yok"}</span>
                    {m.prevOwners?.length > 0 && <span style={{ fontSize: 9, fontWeight: 800, background: "#10b981", color: "#fff", borderRadius: 5, padding: "2px 7px" }}>2. EL</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, fontFamily: "monospace" }}>S/N: {m.serialNo || "—"}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Satış: {m.satisYapan || "—"}{m.installDate ? ` · ${fmtTR(m.installDate)}` : ""}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {m.warrantyEnd && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: wOk ? "#059669" : "#dc2626" }}>
                      {wOk ? "Garanti sürüyor" : "Garanti bitti"}<br />
                      <span style={{ fontWeight: 600 }}>{fmtTR(m.warrantyEnd)}</span>
                    </div>
                  )}
                  {m.faturali && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>{m.faturali}{m.faturaBedeli ? ` · ${fmtCur(m.faturaBedeli, m.currency)}` : ""}</div>}
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setFirmView(null)}>Kapat</Btn>
            <Btn onClick={() => { const base = firmView[0]; setFirmView(null); openAddForFirm(base); }}>
              <Icon name="plus" size={14} /> Bu Firmaya Makina Ekle
            </Btn>
          </div>
        </Modal>
      )}

      {/* Detay görüntüleme */}
      {detailView && (
        <Modal wide title={detailView.name} onClose={() => setDetailView(null)}>
          {detailView.prevOwners?.length > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
              <b style={{ color: "#dc2626" }}>2. El Makina</b> — İlk sahip: <span style={{ color: "#dc2626" }}>{detailView.prevOwners[0].name}</span>
              {detailView.prevOwners[0].soldDate ? ` (devir: ${fmtTR(detailView.prevOwners[0].soldDate)})` : ""}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 16 }}>
            {[
              ["Satış Yapan", detailView.satisYapan],
              ["Telefon", detailView.phone],
              ["E-posta", detailView.email],
              ["Adres", detailView.adres],
              ["Şehir / Ülke", [detailView.city, detailView.country].filter(Boolean).join(" / ")],
              ["Model", detailView.model],
              ["Makina Kalıp Çapı", fmtKalipCapi(detailView.kalipCapi)],
              ["Seri Numarası", detailView.serialNo],
              ["Garanti Başlangıç", detailView.installDate ? fmtTR(detailView.installDate) : ""],
              ["Garanti Bitiş", detailView.warrantyEnd ? fmtTR(detailView.warrantyEnd) : ""],
              ["Fatura Durumu", detailView.faturali ? `${detailView.faturali}${detailView.faturali === "Faturasız" ? " (KDV HARİÇ)" : ""}` : ""],
              ["Para Birimi", detailView.currency && detailView.currency !== "TRY" ? ({USD:"Dolar ($)",EUR:"Euro (€)"}[detailView.currency]) : ""],
              ["Fatura Bedeli", detailView.faturaBedeli ? fmtCur(detailView.faturaBedeli, detailView.currency) : ""],
              ["Fabrika Satış Bedeli", detailView.fabrikaSatisBedeli ? fmtCur(detailView.fabrikaSatisBedeli, detailView.currency) : ""],
              ["Komisyon", detailView.komisyon ? fmtCur(detailView.komisyon, detailView.currency) : ""],
              ["Extra Kalıp Fiyatı", detailView.extraKalipFiyati ? fmtCur(detailView.extraKalipFiyati, detailView.currency) : ""],
              ["Kalan Borç", detailView.kalanBorc ? fmtCur(detailView.kalanBorc, detailView.currency) : ""],
              ["Açıklama", detailView.aciklama],
            ].filter(([, v]) => v && v !== "—").map(([k, v]) => (
              <div key={k} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: .5, marginBottom: 3, textTransform: "uppercase" }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{v}</div>
              </div>
            ))}
          </div>
          {Array.isArray(detailView.kaliplar) && detailView.kaliplar.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>KALIPLAR ({detailView.kaliplar.length})</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {detailView.kaliplar.map((k, i) => (
                  <span key={i} style={{ fontSize: 12, fontWeight: 600, background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", borderRadius: 8, padding: "6px 12px" }}>
                    {[k.olcu, k.ad].filter(Boolean).join(" — ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bu firmanın diğer makinaları */}
          {isCustomerTab && (() => {
            const firmMachines = customers.filter(c => trLower(c.name) === trLower(detailView.name));
            if (firmMachines.length <= 1) return null;
            return (
              <div style={{ marginBottom: 16, borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10 }}>
                  BU FİRMANIN MAKİNALARI ({firmMachines.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {firmMachines.map(m => {
                    const ok = m.warrantyEnd && m.warrantyEnd >= today();
                    const isCurrent = m.id === detailView.id;
                    return (
                      <div key={m.id}
                        onClick={() => setDetailView(m)}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                          border: "1px solid", borderColor: isCurrent ? "#e85d1a" : "#e2e8f0", background: isCurrent ? "#fff7ed" : "#fff" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                            {m.model || "Model yok"} {isCurrent && <span style={{ fontSize: 10, color: "#e85d1a", fontWeight: 800 }}>· GÖRÜNTÜLENEN</span>}
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{m.serialNo || "Seri no yok"}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: ok ? "#059669" : "#dc2626" }}>
                          {m.warrantyEnd ? `${fmtTR(m.warrantyEnd)} ${ok ? "✓" : "⚠"}` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setDetailView(null)}>Kapat</Btn>
            {isCustomerTab && (
              <Btn variant="ghost" onClick={() => { const c = detailView; setDetailView(null); openAddForFirm(c); }}>
                <Icon name="plus" size={14} /> Bu Firmaya Makina Ekle
              </Btn>
            )}
            <Btn onClick={() => { const c = detailView; setDetailView(null); openEdit(c); }}><Icon name="edit" size={14} /> Düzenle</Btn>
          </div>
        </Modal>
      )}

      {confirmId && (
        <ConfirmDialog
          message={`"${customers.find(c => c.id === confirmId)?.name || ""}" ${delWord} ve bilgileri kalıcı olarak silinecek.`}
          onConfirm={confirmDel}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {modal && (
        <Modal wide title={modal === "add" ? addLabel : `${entity} Düzenle`} onClose={() => setModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Kalıp Sayısı (otomatik)">
              <div style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f1f5f9", color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
                <b style={{ color: "#0f172a", fontSize: 16 }}>{(form.kaliplar || []).length}</b>
                <span style={{ fontSize: 12 }}>kalıp · aşağıdaki listeden eklenir/silinir</span>
              </div>
            </Field>
            <Field label="Satış Yapan">
              <Select value={form.satisYapan || "Altuntaş Makina"} onChange={e => setForm(p => ({ ...p, satisYapan: e.target.value }))}>
                <option value={factory?.name || "Altuntaş Makina"}>{factory?.name || "Altuntaş Makina"} (Fabrika)</option>
                {(dealers || []).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Satın Alan">
            <Input value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Satın alan firma / kişi" />
            <Warn>{!form.name?.trim() ? "Satın alan adı girilmedi" : ""}</Warn>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Yetkili 1 - Ad Soyad"><Input value={form.yetkili1Ad || ""} onChange={e => setForm(p => ({ ...p, yetkili1Ad: e.target.value }))} placeholder="Ad Soyad" /></Field>
            <Field label="Yetkili 1 - Telefon">
              <Input value={form.yetkili1Tel || ""} onChange={e => setForm(p => ({ ...p, yetkili1Tel: e.target.value }))} placeholder="0xxx xxx xx xx" />
              <Warn>{form.yetkili1Tel && !PHONE_RE.test(form.yetkili1Tel) ? "Geçersiz telefon formatı" : ""}</Warn>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Yetkili 2 - Ad Soyad"><Input value={form.yetkili2Ad || ""} onChange={e => setForm(p => ({ ...p, yetkili2Ad: e.target.value }))} placeholder="Ad Soyad" /></Field>
            <Field label="Yetkili 2 - Telefon">
              <Input value={form.yetkili2Tel || ""} onChange={e => setForm(p => ({ ...p, yetkili2Tel: e.target.value }))} placeholder="0xxx xxx xx xx" />
              <Warn>{form.yetkili2Tel && !PHONE_RE.test(form.yetkili2Tel) ? "Geçersiz telefon formatı" : ""}</Warn>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Telefon">
              <Input value={form.phone || ""} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="0xxx xxx xx xx" />
              <Warn>{form.phone && !PHONE_RE.test(form.phone) ? "Geçersiz telefon formatı" : ""}</Warn>
            </Field>
            <Field label="E-posta">
              <Input value={form.email || ""} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="ornek@firma.com" />
              <Warn>{form.email && !EMAIL_RE.test(form.email) ? "Geçersiz e-posta formatı" : ""}</Warn>
            </Field>
          </div>

          <Field label="Adres Satırı"><Input value={form.adres || ""} onChange={e => setForm(p => ({ ...p, adres: e.target.value }))} placeholder="Mahalle, cadde, no..." /></Field>
          <CountryCityFields country={form.country} city={form.city}
            onCountry={v => setForm(p => ({ ...p, country: v }))}
            onCity={v => setForm(p => ({ ...p, city: v }))}
            geoData={geoData} loadingGeo={loadingGeo} />

          <Field label="Model">
            <div
              onClick={() => setModelPicker(p => !p)}
              style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}
            >
              <span style={{ color: form.model ? "#0f172a" : "#94a3b8" }}>{form.model || "Model seçin..."}</span>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>{modelPicker ? "▲" : "▼"}</span>
            </div>
            {modelPicker && (
              <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {models.map(m => (
                  <div
                    key={m.model}
                    onClick={() => { setForm(p => ({ ...p, model: m.model })); setModelPicker(false); }}
                    style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", border: "2px solid", borderColor: form.model === m.model ? "#e85d1a" : "#e2e8f0", background: form.model === m.model ? "#fff7ed" : "#fff" }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{m.model}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{m.sogutma}</div>
                    <div style={{ fontSize: 11, color: "#e85d1a", fontWeight: 600 }}>{m.kapasite}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Ø {m.kalip}</div>
                  </div>
                ))}
              </div>
            )}
          </Field>

          {/* Makina Kalıp Çapı — 3 kutu: çap × boy × arka ölçü */}
          <Field label="Makina Kalıp Çapı">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Input value={form.kalipCapi?.en || ""} placeholder="Çap"
                onChange={e => setForm(p => ({ ...p, kalipCapi: { ...(p.kalipCapi || {}), en: e.target.value } }))} />
              <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: 16 }}>×</span>
              <Input value={form.kalipCapi?.boy || ""} placeholder="Boy"
                onChange={e => setForm(p => ({ ...p, kalipCapi: { ...(p.kalipCapi || {}), boy: e.target.value } }))} />
              <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: 16 }}>×</span>
              <Input value={form.kalipCapi?.yukseklik || ""} placeholder="Arka Ölçü"
                onChange={e => setForm(p => ({ ...p, kalipCapi: { ...(p.kalipCapi || {}), yukseklik: e.target.value } }))} />
            </div>
          </Field>

          {/* Kalıp Ölçüleri — listeden eklenir/silinir, sayı otomatik */}
          <Field label={`Kalıp Ölçüleri (${(form.kaliplar || []).length} kalıp)`}>
            {(form.kaliplar || []).map((k, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "16px 1fr 1fr 36px", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>{i + 1}.</span>
                <Select value={k.ad || ""}
                  onChange={e => setForm(p => {
                    const arr = [...(p.kaliplar || [])];
                    arr[i] = { ...arr[i], ad: e.target.value };
                    return { ...p, kaliplar: arr, kalipSayisi: arr.length };
                  })}>
                  <option value="">Kalıp seçin...</option>
                  {kalipDefs.map(d => <option key={d.id} value={d.ad}>{d.ad}</option>)}
                </Select>
                <Input value={k.olcu || ""} placeholder="Ölçü (örn: 55x125 mm)"
                  onChange={e => setForm(p => {
                    const arr = [...(p.kaliplar || [])];
                    arr[i] = { ...arr[i], olcu: e.target.value };
                    return { ...p, kaliplar: arr, kalipSayisi: arr.length };
                  })} />
                {/* Sil butonu — en az 1 kalıp kalmalı */}
                <button
                  type="button"
                  disabled={(form.kaliplar || []).length <= 1}
                  title={(form.kaliplar || []).length <= 1 ? "En az 1 kalıp olmalı" : "Bu kalıbı sil"}
                  onClick={() => setForm(p => {
                    const arr = (p.kaliplar || []).filter((_, idx) => idx !== i);
                    return { ...p, kaliplar: arr, kalipSayisi: arr.length };
                  })}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: "1px solid #fecaca",
                    background: (form.kaliplar || []).length <= 1 ? "#f8fafc" : "#fef2f2",
                    color: (form.kaliplar || []).length <= 1 ? "#cbd5e1" : "#dc2626",
                    cursor: (form.kaliplar || []).length <= 1 ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                  }}
                >🗑</button>
              </div>
            ))}
            {/* Kalıp Ekle butonu */}
            <button
              type="button"
              onClick={() => setForm(p => {
                const arr = [...(p.kaliplar || []), { ad: "", olcu: "" }];
                return { ...p, kaliplar: arr, kalipSayisi: arr.length };
              })}
              style={{
                marginTop: 4, padding: "8px 16px", borderRadius: 8, border: "1px dashed #e85d1a",
                background: "#fff7ed", color: "#e85d1a", fontSize: 13, fontWeight: 700, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >+ Kalıp Ekle</button>
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Garanti Başlangıç">
              <Input type="date" value={form.installDate || ""} onChange={e => {
                const d = e.target.value;
                const end = d ? `${parseInt(d.slice(0,4))+2}${d.slice(4)}` : "";
                setForm(p => ({ ...p, installDate: d, warrantyEnd: end }));
              }} />
            </Field>
            <Field label="Garanti Bitiş (otomatik)">
              <Input type="date" value={form.warrantyEnd || ""} onChange={e => setForm(p => ({ ...p, warrantyEnd: e.target.value }))} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Para Birimi">
              <Select value={form.currency || "TRY"} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                <option value="TRY">₺ Türk Lirası</option>
                <option value="USD">$ Dolar (USD)</option>
                <option value="EUR">€ Euro (EUR)</option>
              </Select>
            </Field>
            <Field label="Satış Tipi">
              <Select value={normalizeSaleType(form.faturali)} onChange={e => setForm(p => ({ ...p, faturali: e.target.value }))}>
                {SALE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
          </div>

          {/* Gerçek Satış Bedeli — finansın asıl bel kemiği */}
          <Field label="Gerçek Satış Bedeli">
            <MoneyInput value={form.fabrikaSatisBedeli} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, fabrikaSatisBedeli: v }))} />
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Makinenin fiilen satıldığı gerçek tutar (finans raporundaki gerçek ciro budur).</div>
          </Field>

          {/* Fatura Bedeli — faturalı satışlarda */}
          {isFaturali(form.faturali) && (
            <Field label="Fatura Bedeli (resmi faturada yazan)">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MoneyInput value={form.faturaBedeli} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, faturaBedeli: v }))} />
                {normalizeSaleType(form.faturali) === "Faturalı İhracat" && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#1d4ed8", background: "#dbeafe", padding: "5px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>İHRACAT · KDV YOK</span>
                )}
              </div>
              {/* Otomatik KDV göstergesi — sadece Yurt İçi */}
              {isYurtIci(form.faturali) && (
                <div style={{ fontSize: 12, color: "#065f46", background: "#d1fae5", padding: "7px 12px", borderRadius: 8, marginTop: 8, fontWeight: 600 }}>
                  KDV (%{kdvRate}): <b>{fmtCur(calcKDV(form.faturali, form.faturaBedeli, kdvRate), form.currency)}</b>
                  {"  ·  "}KDV dahil toplam: <b>{fmtCur(parseMoney(form.faturaBedeli) + calcKDV(form.faturali, form.faturaBedeli, kdvRate), form.currency)}</b>
                </div>
              )}
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                Gerçek bedelden farklı olabilir (düşük fatura). KDV bu tutar üzerinden hesaplanır.
              </div>
            </Field>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Komisyon"><MoneyInput value={form.komisyon} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, komisyon: v }))} /></Field>
            <Field label="Extra Kalıp Fiyatı"><MoneyInput value={form.extraKalipFiyati} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, extraKalipFiyati: v }))} /></Field>
          </div>

          <Field label="Kalan Borç"><MoneyInput value={form.kalanBorc} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, kalanBorc: v }))} /></Field>

          <Field label="Seri Numarası">
            {(() => {
              const stockForModel = (stock && form.model) ? stock.filter(s => s.model === form.model) : [];
              const serili = stockForModel.filter(s => s.serialNo);       // seri no'lu stok
              const serisiz = stockForModel.filter(s => !s.serialNo);     // seri no'suz stok
              // Stok modu: yeni kayıt + model seçili + o modelde stok var → dropdown (+ manuel seçeneği)
              if (modal === "add" && stock && form.model && stockForModel.length > 0 && !form._manualSerial) {
                return (
                  <>
                    <Select value={form._stokSerisiz ? "__serisiz__" : (form.serialNo || "")} onChange={e => {
                      if (e.target.value === "__manual__") {
                        setForm(p => ({ ...p, _manualSerial: true, _stokSerisiz: false, serialNo: "" }));
                      } else if (e.target.value === "__serisiz__") {
                        // Seri no'suz stok seç: seri no boş kalır, satışta o modelden 1 seri no'suz adet düşülür
                        setForm(p => ({ ...p, _stokSerisiz: true, serialNo: "" }));
                      } else {
                        setForm(p => ({ ...p, _stokSerisiz: false, serialNo: e.target.value }));
                      }
                    }}>
                      <option value="">Stoktan seçin... ({stockForModel.length} adet)</option>
                      {serili.map(s => <option key={s.id} value={s.serialNo}>{s.serialNo}</option>)}
                      {serisiz.length > 0 && <option value="__serisiz__">📦 Seri no'suz stoktan düş ({serisiz.length} adet), seri no sonra atanır</option>}
                      <option value="__manual__">✏️ Manuel gir (stok dışı / eski müşteri)</option>
                    </Select>
                    {form._stokSerisiz ? (
                      <div style={{ fontSize: 11, color: "#d97706", marginTop: 5, fontWeight: 600 }}>
                        ⚠ Seri no'suz satış yapılıyor, stoktan 1 adet düşülecek. Seri no'yu sonra "Müşteriyi Düzenle" bölümünden girebilirsiniz.
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: "#059669", marginTop: 5, fontWeight: 600 }}>
                        ✓ Stoktan seçilen seri no satış kaydedilince stoktan otomatik düşülür
                      </div>
                    )}
                  </>
                );
              }
              // Manuel mod / stok yok / düzenleme: serbest metin
              return (
                <>
                  <Input value={form.serialNo || ""} onChange={e => setForm(p => ({ ...p, serialNo: e.target.value }))} placeholder="AK140-2026-001" autoFocus={form._manualSerial} />
                  {modal === "add" && form._manualSerial && stockForModel.length > 0 && (
                    <button onClick={() => setForm(p => ({ ...p, _manualSerial: false, serialNo: "" }))}
                      style={{ marginTop: 5, fontSize: 11, color: "#e85d1a", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
                      ← Stoktan seçime dön
                    </button>
                  )}
                  {modal === "add" && form._manualSerial && (
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                      Manuel girilen seri no stoktan düşülmez (eski müşteri kaydı için uygundur).
                    </div>
                  )}
                  {modal === "add" && stock && form.model && stockForModel.length === 0 && (
                    <div style={{ fontSize: 11, color: "#dc2626", marginTop: 5 }}>
                      Bu modelden stokta makina yok, seri no elle girilecek.
                    </div>
                  )}
                  {modal === "add" && stock && !form.model && (
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 5 }}>
                      Stoktan seri no seçebilmek için önce yukarıdan <b>Model</b> seçin.
                    </div>
                  )}
                </>
              );
            })()}
          </Field>

          <Field label="Açıklama">
            <textarea value={form.aciklama || ""} onChange={e => setForm(p => ({ ...p, aciklama: e.target.value }))}
              placeholder="Bu satış / makina ile ilgili açıklama, notlar..."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 60, boxSizing: "border-box", fontFamily: "inherit" }} />
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
