import { useState, useEffect, useMemo } from "react";
import { ALTUNMAK_MODELS, DEFAULT_KDV_RATES, SALE_TYPE_STYLE } from "../lib/constants";
import { logAction, snapshotOnceki } from "../lib/audit";
import { today, fmtTR, trLower, aramaNormalize, uid, bumpId, fmt, fmtKalipCapi, kalipCount, normalizeSaleType, calcKDV, fmtCur, parseMoney, customerHasAnyDebt, benzerKayitBul, calcKalanBorc, isPaymentReceived, withDeleted, resolveSatisYapan, taksitGecikmisMi, stokSecimDiff, girisSiraMap } from "../lib/utils";
import { parsePermissions } from "../lib/permissions";
import { useFilteredList } from "../hooks/useFilteredList";
import { useFormDraft } from "../hooks/useFormDraft";
import { Icon, Btn, ConfirmDialog, Pagination, DraftRestoreBar } from "./ui";
import { CustomerDetailModal } from "./customers/CustomerDetailModal";
import { CustomerAddEditForm } from "./customers/CustomerAddEditForm";

export const Customers = ({
  customers, setCustomers, services = [], setServices = null, dealers = null, models = ALTUNMAK_MODELS,
  factory = null, geoData = null, loadingGeo = false, stock = null, setStock = null,
  partSales = [], setPartSales = null, parts = [], payments = [], setPayments = null,
  gorusmeler = [], setGorusmeler = null,
  dosyalar = [], setDosyalar = null, dosyaCevrimdisi = false,
  partStock = [], setPartStock = null, partStockLog = [], setPartStockLog = null,
  title = "Müşteriler", addLabel = "Yeni Müşteri", entity = "Müşteri",
  searchPlaceholder = "Müşteri ara...", emptyLabel = "Müşteri bulunamadı.", delWord = "müşterisi",
  isCustomer = true, initialFilter = "all", initialDetailId = null, kalipDefs = [], partTypeDefs = [], calisanlar = [], showToast = () => {}, kdvRates = DEFAULT_KDV_RATES,
  appSettings = {}, onDetailClosed = null, openNewPrefill = null, onCustomerLinked = null, onPrefillConsumed = null,
  serverPermissions = null,
}) => {
  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  // Elektrik kesintisine karşı form taslağı — anahtar kayıt bazlı (bkz. useFormDraft)
  const draftKey = modal === "add" ? "customer:new" : modal?.edit ? `customer:${modal.edit.id}` : null;
  const { draft, restoreDraft, discardDraft, clearDraft } = useFormDraft(draftKey, modal ? form : null, setForm);
  const [listFilter, setListFilter] = useState(initialFilter || "all");
  useEffect(() => { setListFilter(initialFilter || "all"); }, [initialFilter]);
  const [groupByFirm, setGroupByFirm] = useState(false);
  const [detailViewId, setDetailViewId] = useState(null);
  // Detaydan açılan ekle/düzenle formu iptal edilirse aynı müşterinin detayına geri dönülür
  const [returnDetailId, setReturnDetailId] = useState(null);
  useEffect(() => { if (initialDetailId != null) setDetailViewId(initialDetailId); }, [initialDetailId]);
  const [confirmId, setConfirmId] = useState(null);
  const [dupWarn, setDupWarn] = useState(null); // benzer kayıt uyarısı: [{ kayit, sebep }]

  const detailView = detailViewId != null ? customers.find(c => c.id === detailViewId) || null : null;
  const factoryName = factory?.name || "Altuntaş Makina";

  const _perms = parsePermissions(serverPermissions);
  const canDo = action => {
    if (!_perms) return true;
    const group = action.startsWith("dealer_") ? _perms.dealerActions : _perms.customerActions;
    return !group || group.includes(action);
  };

  const firmCount = useMemo(() => {
    const fc = {};
    customers.forEach(c => { const k = trLower(c.name); fc[k] = (fc[k] || 0) + 1; });
    return fc;
  }, [customers]);

  // Makina giriş sıra numarası (global 1..n; ilk girilen = 1, son girilen = n). Tüm makinalar
  // üzerinden hesaplanır → sıralama/filtre/sayfadan bağımsız, her makinaya sabit numara.
  const girisSira = useMemo(() => girisSiraMap(customers), [customers]);

  const debtorIds = useMemo(() => {
    const ids = new Set();
    customers.forEach(c => { if (customerHasAnyDebt(c, services, partSales, factoryName)) ids.add(c.id); });
    return ids;
  }, [customers, services, partSales, factoryName]);

  const { search, setSearch, page, setPage, filtered: searched, perPage: PER_PAGE } = useFilteredList(customers, {
    // Menüdeki genel arama gibi, makinanın eski sahiplerinin adıyla da eşleşsin.
    searchFn: (c, q) => {
      const alanlar = ["name", "city", "satisYapan", "contact", "country", "serialNo", "model"];
      if (alanlar.some(f => aramaNormalize(c[f]).includes(q))) return true;
      return (c.prevOwners || []).some(o => aramaNormalize(String(o.name || "")).includes(q));
    },
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
  const openAddWithPrefill = (prefill) => {
    const start = today();
    const end = `${parseInt(start.slice(0,4)) + 2}${start.slice(4)}`;
    if (prefill._addForFirmId) {
      const base = customers.find(c => c.id === prefill._addForFirmId);
      if (!base) return;
      setForm({
        kalipSayisi: prefill.kaliplar?.length || 0,
        satisYapan: factory?.name || "Altuntaş Makina",
        name: base.name || "", phone: base.phone || "", email: base.email || "",
        yetkili1Ad: base.yetkili1Ad || "", yetkili1Tel: base.yetkili1Tel || "",
        yetkili2Ad: base.yetkili2Ad || "", yetkili2Tel: base.yetkili2Tel || "",
        adres: base.adres || "", city: base.city || "", country: base.country || "Türkiye",
        model: prefill.model || "",
        kaliplar: prefill.kaliplar?.length > 0 ? prefill.kaliplar : [],
        bantlar: [],
        installDate: start, warrantyEnd: end,
        faturali: prefill.faturali || base.faturali || "Faturalı Yurtiçi",
        faturaBedeli: "",
        fabrikaSatisBedeli: prefill.fabrikaSatisBedeli || "", komisyon: "", _ilkOdemeSatirlari: [],
        serialNo: "", currency: prefill.currency || base.currency || "TRY",
        fromTeklifId: prefill.fromTeklifId || null,
      });
      setModal("add");
      return;
    }
    setForm({
      kalipSayisi: prefill.kaliplar?.length || 0,
      satisYapan: factory?.name || "Altuntaş Makina",
      name: prefill.name || "",
      phone: "",
      email: prefill.email || "",
      yetkili1Ad: prefill.yetkili1Ad || "",
      yetkili1Tel: prefill.yetkili1Tel || "",
      yetkili2Ad: "", yetkili2Tel: "",
      adres: prefill.adres || "",
      city: prefill.city || "",
      country: prefill.country || "Türkiye",
      model: prefill.model || "",
      kaliplar: prefill.kaliplar?.length > 0 ? prefill.kaliplar : [],
      bantlar: [],
      installDate: start, warrantyEnd: end,
      faturali: prefill.faturali || "Faturalı Yurtiçi",
      faturaBedeli: "",
      fabrikaSatisBedeli: prefill.fabrikaSatisBedeli || "", komisyon: "", _ilkOdemeSatirlari: [],
      serialNo: "",
      currency: prefill.currency || "TRY",
      fromTeklifId: prefill.fromTeklifId || null,
    });
    setModal("add");
  };

  useEffect(() => {
    if (openNewPrefill) {
      openAddWithPrefill(openNewPrefill);
      onPrefillConsumed?.();
    }
  }, [openNewPrefill]);  

  const openAddForFirm = (base) => {
    setReturnDetailId(base.id);
    setDetailViewId(null); // onDetailClosed tetiklenmeden kapat (dashboard'a dönme olmasın)
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
    if (detailViewId != null) setReturnDetailId(detailViewId);
    setDetailViewId(null); // detay modalı onDetailClosed tetiklemeden kapat — hem çift kilit sorununu çözer, hem dashboard'a geri dönme olmaz
  };
  // Makina stoğu düşümü — ekleme ve "seri no sonradan atandı" düzenlemesi aynı mantığı
  // paylaşır: seçilen (veya serisiz) stok satırını düşer ve kaynağı müşteriye
  // (sourceStockId) yazar; clean üzerinde yerinde değişiklik yapar
  const deductMachineStock = (clean, { _stokSerisiz, _manualSerial }) => {
    if (_stokSerisiz) {
      const srcEntry = stock.find(s => s.model === clean.model && !s.serialNo);
      if (srcEntry) clean.sourceStockId = srcEntry.id;
      setStock(p => {
        const idx = p.findIndex(s => s.model === clean.model && !s.serialNo);
        if (idx === -1) return p;
        return p.filter((_, i) => i !== idx);
      });
    } else if (clean.serialNo && !_manualSerial) {
      const srcEntry = stock.find(s => s.model === clean.model && s.serialNo === clean.serialNo);
      if (srcEntry) clean.sourceStockId = srcEntry.id;
      setStock(p => p.filter(s => !(s.model === clean.model && s.serialNo === clean.serialNo)));
    }
  };

  // Yeni müşteri ekleme gövdesi: save() mükerrer kontrolünden veya uyarı diyaloğundaki
  // "Yine de Kaydet"ten çağrılır.
  const doAdd = () => {
    {
      // fromTeklifId kayıtta kalır: teklifin kullanıldığının kalıcı kanıtı (satisTamam kaybolsa bile)
      const { _manualSerial, _stokSerisiz, _ilkOdemeSatirlari, _kitTipler, ...clean } = form;
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
      if (setStock) deductMachineStock(clean, { _stokSerisiz, _manualSerial });
      // "Stoktan düş" tipli seçimler partStock'tan 1 adet düşülür (kit'ten gelenleri atlat — makina stoka eklenirken zaten düşülmüştür)
      const { toDeduct } = stokSecimDiff({ yeni: clean.tipSecimleri, kitTipler: _kitTipler || [], partTypeDefs });
      if (toDeduct.length > 0 && setPartStock) {
        setPartStock(p => p.map(s => toDeduct.includes(String(s.partId))
          ? { ...s, miktar: Math.max(0, (s.miktar || 0) - 1), sonGuncelleme: today() }
          : s
        ));
      }
      if (clean.fromTeklifId && onCustomerLinked) onCustomerLinked(newId, clean.fromTeklifId);
      logAction({ serverPermissions, action: "olusturuldu", entity: "musteri", entityId: newId, entityName: clean.name, detail: { model: clean.model, serialNo: clean.serialNo } });
      showToast(!clean.serialNo ? "Müşteri kaydedildi (seri no sonra atanacak)." : "Müşteri kaydedildi.");
    }
    clearDraft();
    setModal(null);
    setReturnDetailId(null);
  };
  const save = () => {
    if (modal === "add") {
      // Mükerrer kontrol: seri no / telefon / aynı firma+model eşleşmesi varsa önce uyar
      const benzerler = benzerKayitBul(customers, form);
      if (benzerler.length > 0) { setDupWarn(benzerler.slice(0, 3)); return; }
      doAdd();
      return;
    } else {
      const { _manualSerial, _stokSerisiz, _ilkOdemeSatirlari, _kitTipler, ...clean } = form;
      const wasSerialPending = modal?.edit?.seriNoBekliyor && !modal.edit.serialNo;
      if (clean.serialNo && clean.seriNoBekliyor) clean.seriNoBekliyor = false;
      clean.kalanBorc = calcKalanBorc(clean, payments, kdvRates);
      setCustomers(p => p.map(c => c.id === clean.id ? clean : c));
      if (wasSerialPending && setStock) deductMachineStock(clean, { _stokSerisiz, _manualSerial });
      // Tip seçimleri değişmişse eski stoğu geri al, yeni seçimi düş (yalnız "stoktan düş" tipler, kit'ten gelenleri atlat)
      if (setPartStock) {
        const { toRestore, toDeduct } = stokSecimDiff({
          onceki: modal?.edit?.tipSecimleri, yeni: clean.tipSecimleri, kitTipler: _kitTipler || [], partTypeDefs,
        });
        if (toRestore.length > 0 || toDeduct.length > 0) {
          setPartStock(p => p.map(s => {
            const sid = String(s.partId);
            if (toRestore.includes(sid)) return { ...s, miktar: (s.miktar || 0) + 1, sonGuncelleme: today() };
            if (toDeduct.includes(sid))  return { ...s, miktar: Math.max(0, (s.miktar || 0) - 1), sonGuncelleme: today() };
            return s;
          }));
        }
      }
      logAction({ serverPermissions, action: "duzenlendi", entity: "musteri", entityId: clean.id, entityName: clean.name, detail: { onceki: snapshotOnceki(modal?.edit) } });
      showToast("Müşteri bilgileri düzenlendi.");
    }
    clearDraft();
    setModal(null);
    setReturnDetailId(null);
  };
  const del = id => setConfirmId(id);
  const confirmDel = () => {
    const c = customers.find(x => x.id === confirmId);
    const ts = new Date().toISOString();
    setCustomers(p => withDeleted(p, x => x.id === confirmId, ts));
    if (setServices) setServices(p => withDeleted(p, s => s.customerId === confirmId, ts));
    if (setPartSales) setPartSales(p => withDeleted(p, x => x.customerId === confirmId, ts));
    if (setPayments) setPayments(p => withDeleted(p, x => x.customerId === confirmId, ts));

    // Servislerde kullanılan parçaları stoka geri al
    if (c && setPartStock && setPartStockLog) {
      const custServices = services.filter(s => s.customerId === c.id && !s.deletedAt);
      const svcIds = new Set(custServices.map(s => String(s.id)));
      const svcPartLog = partStockLog.filter(l => l.tip === "servis" && svcIds.has(String(l.referansId)));
      if (svcPartLog.length > 0) {
        setPartStock(ps => {
          let updated = [...ps];
          svcPartLog.forEach(l => {
            const pid = String(l.partId);
            updated = updated.map(s => String(s.partId) === pid
              ? { ...s, miktar: (s.miktar || 0) + Math.abs(l.miktar), sonGuncelleme: today() }
              : s
            );
          });
          return updated;
        });
        setPartStockLog(lg => lg.filter(l => !(l.tip === "servis" && svcIds.has(String(l.referansId)))));
      }
    }

    // Kit log'unu önceden belirle — stok girişinin parcalar alanı ve log güncellemesi için gerekli
    let kitLog = [];
    let restoredRefId = null;
    if (c && setPartStockLog) {
      if (c.sourceStockId) {
        const srcId = String(c.sourceStockId);
        kitLog = partStockLog.filter(l => l.tip === "makina_uretimi" && String(l.referansId) === srcId);
        restoredRefId = srcId;
      } else if (c.model) {
        const liveIds = new Set(stock.map(s => String(s.id)));
        const orphan = partStockLog.filter(l =>
          l.tip === "makina_uretimi" &&
          l.notlar === c.model &&
          !liveIds.has(String(l.referansId))
        );
        if (orphan.length > 0) {
          const groups = new Map();
          orphan.forEach(l => {
            const k = String(l.referansId);
            if (!groups.has(k)) groups.set(k, []);
            groups.get(k).push(l);
          });
          const bestKey = [...groups.keys()].sort((a, b) => Number(b) - Number(a))[0];
          kitLog = groups.get(bestKey);
          restoredRefId = bestKey;
        }
      }
    }

    // Makinayı stoka geri al — kit varsa parcalar korunur, parçalar stoka iade edilmez
    const kitRestoredIds = new Set();
    if (c && setStock && c.model && (c.serialNo || c.seriNoBekliyor)) {
      const alreadyInStock = c.serialNo
        ? stock.some(s => s.model === c.model && s.serialNo === c.serialNo)
        : stock.some(s => s.model === c.model && !s.serialNo);

      if (!alreadyInStock) {
        const kitParcalar = kitLog.map(l => ({ partId: String(l.partId), miktar: Math.abs(l.miktar) }));
        bumpId(stock);
        const newStockId = uid();
        setStock(p => [{ id: newStockId, model: c.model, serialNo: c.serialNo || "", addedDate: today(), note: "Silinen müşteriden geri döndü", parcalar: kitParcalar }, ...p]);

        if (kitLog.length > 0 && setPartStockLog) {
          kitLog.forEach(l => kitRestoredIds.add(String(l.partId)));
          // Parçalar makinada kalmaya devam ediyor — log'u yeni stok ID'sine bağla
          setPartStockLog(log => log.map(l =>
            l.tip === "makina_uretimi" && String(l.referansId) === restoredRefId
              ? { ...l, referansId: newStockId }
              : l
          ));
        }
      }
    }

    // "Stoktan düş" tipli seçimlerin stoğunu geri al (kit'te olmayan, manuel seçilenler)
    if (c && setPartStock) {
      const { toRestore } = stokSecimDiff({ onceki: c.tipSecimleri, partTypeDefs });
      const restoreIds = toRestore.filter(id => !kitRestoredIds.has(id));
      if (restoreIds.length > 0) {
        setPartStock(p => p.map(s => restoreIds.includes(String(s.partId))
          ? { ...s, miktar: (s.miktar || 0) + 1, sonGuncelleme: today() }
          : s
        ));
      }
    }
    setConfirmId(null);
    logAction({ serverPermissions, action: "silindi", entity: "musteri", entityId: confirmId, entityName: c?.name });
    showToast("Müşteri silindi.");
  };


  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--n900, #0f172a)" }}>{title}</h2>
        {canDo(isCustomer ? "cust_add" : "dealer_add") && <Btn onClick={openAdd}><Icon name="plus" size={14} /> {addLabel}</Btn>}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { v: "all", l: "Hepsi", count: customers.length },
          { v: "warranty-active", l: "Garantisi Devam Eden", count: customers.filter(c => c.warrantyEnd && c.warrantyEnd >= today()).length },
          { v: "warranty", l: "Garantisi Bitenler", count: customers.filter(c => c.warrantyEnd && c.warrantyEnd < today()).length },
          ...(isCustomer ? [{ v: "debt", l: "Borçlu Firmalar", count: debtorIds.size }] : []),
          ...(isCustomer ? [{ v: "serial-pending", l: "Seri No Bekleyen", count: customers.filter(c => c.seriNoBekliyor && !c.serialNo).length }] : []),
        ].map(f => (
          <button key={f.v} onClick={() => { setListFilter(f.v); setPage(1); }}
            style={{
              padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: "1px solid", borderColor: listFilter === f.v ? "#e85d1a" : "var(--n200, #e2e8f0)",
              background: listFilter === f.v ? "#e85d1a" : "var(--surface, #ffffff)",
              color: listFilter === f.v ? "#fff" : "var(--n500, #64748b)",
            }}>
            {f.l} ({f.count})
          </button>
        ))}
        {isCustomer && (
          <button onClick={() => { setGroupByFirm(g => !g); setPage(1); }}
            style={{
              padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: "1px solid", borderColor: groupByFirm ? "var(--blu500, #3b82f6)" : "var(--n200, #e2e8f0)",
              background: groupByFirm ? "var(--blu500, #3b82f6)" : "var(--surface, #ffffff)",
              color: groupByFirm ? "#fff" : "var(--n500, #64748b)",
            }}>
            {groupByFirm ? "Firmaya Göre Gruplu" : "Firmaya Göre Grupla"}
          </button>
        )}
      </div>
      {groupByFirm && (
        <div style={{ background: "var(--bluBg, #eff6ff)", border: "1px solid var(--bluBr, #bfdbfe)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "var(--blu800, #1e40af)" }}>
          Firmaya göre gruplu görünüm: <b>{filtered.length} firma</b> ({customers.length} makina kaydı). Birden fazla makinası olan firmaya tıklayınca tüm makinaları listelenir.
        </div>
      )}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--n400, #94a3b8)" }}><Icon name="search" size={15} /></span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={searchPlaceholder}
          style={{ paddingLeft: 36, padding: "9px 12px 9px 36px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "var(--n100, #f8fafc)" }} />
      </div>
      <div style={{ background: "var(--surface, #ffffff)", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--n100, #f8fafc)" }}>
              {[
                ...(isCustomer ? [{ h: "Sıra", key: null }] : []),
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
                  style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: sortBy === key ? "#e85d1a" : "var(--n600, #475569)", borderBottom: "1px solid var(--n200, #e2e8f0)", cursor: key ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap" }}>
                  {h}{key && sortBy === key && <span style={{ fontSize: 10, marginLeft: 4 }}>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map(c => {
              const warrantyOk = c.warrantyEnd && c.warrantyEnd >= today();
              const warrantySoon = warrantyOk && c.warrantyEnd <= new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
              const warrantyColor = !c.warrantyEnd ? "var(--n300, #cbd5e1)" : !warrantyOk ? "var(--red600, #dc2626)" : warrantySoon ? "#f59e0b" : "var(--grn600, #16a34a)";
              const hasKalanBorc = parseMoney(c.kalanBorc) > 0;
              const hasDebt = isCustomer && debtorIds.has(c.id);
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--n150, #f1f5f9)", background: hasDebt ? "var(--redBg, #fef2f2)" : undefined }}
                  title={hasDebt ? (hasKalanBorc ? `Kalan borç: ${fmt(parseMoney(c.kalanBorc))}` : "Servis, parça veya Extra Kalıp borcu var") : undefined}
                  onMouseEnter={e => e.currentTarget.style.background = hasDebt ? "var(--redBg2, #fee2e2)" : "var(--n100, #f8fafc)"}
                  onMouseLeave={e => e.currentTarget.style.background = hasDebt ? "var(--redBg, #fef2f2)" : ""}>
                  {isCustomer && (
                    <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 700, color: "var(--n400, #94a3b8)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                      {(!groupByFirm && girisSira[c.id] != null) ? `${girisSira[c.id]}.` : "—"}
                    </td>
                  )}
                  <td style={{ padding: "13px 16px", cursor: "pointer" }}
                    onClick={() => setDetailViewId(c.id)}
                    title="Tüm bilgileri görüntüle">
                    {c.prevOwners?.length > 0 ? (
                      <>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--red600, #dc2626)", textDecoration: "line-through", opacity: .85 }}>{c.prevOwners[0].name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--emerald, #059669)", textDecoration: "underline", textDecorationColor: "#a7f3d0" }}>{c.name}</span>
                          {isCustomer && firmCount[trLower(c.name)] > 1 && (
                            <span style={{ fontSize: 10, fontWeight: 800, background: "var(--bluBg2, #dbeafe)", color: "var(--blu700, #1d4ed8)", borderRadius: 6, padding: "2px 8px" }}>{firmCount[trLower(c.name)]} makina</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, textDecoration: "underline", textDecorationColor: "var(--n200, #e2e8f0)" }}>{c.name}</span>
                        {isCustomer && firmCount[trLower(c.name)] > 1 && (
                          <span style={{ fontSize: 10, fontWeight: 800, background: "var(--bluBg2, #dbeafe)", color: "var(--blu700, #1d4ed8)", borderRadius: 6, padding: "2px 8px" }}>{firmCount[trLower(c.name)]} makina</span>
                        )}
                        {isCustomer && taksitGecikmisMi(c) && (
                          <span style={{ fontSize: 10, fontWeight: 800, background: "var(--redBg2, #fee2e2)", color: "var(--red700, #b91c1c)", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>⚠ Taksit Gecikti</span>
                        )}
                      </div>
                    )}
                    {c.adres && <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)", marginTop: 2, maxWidth: 260, wordBreak: "break-word", overflowWrap: "break-word" }}>{c.adres}</div>}
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--n600, #475569)" }}>{resolveSatisYapan(c.satisYapan, factory) || "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13 }}>{c.country && c.city ? `${c.country} / ${c.city}` : c.city || c.country || "—"}</td>
                  <td style={{ padding: "13px 16px" }}>{c.model ? <span style={{ fontSize: 12, background: "var(--ambBg3, #fff7ed)", color: "var(--orTx, #c2410c)", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>{c.model}</span> : <span style={{ color: "var(--n300, #cbd5e1)" }}>—</span>}</td>
                  <td style={{ padding: "13px 16px", fontSize: 12, color: "var(--n600, #475569)", fontFamily: "monospace" }}>
                    {c.serialNo
                      ? c.serialNo
                      : c.seriNoBekliyor
                        ? <span style={{ fontFamily: "inherit", fontSize: 10, fontWeight: 800, background: "var(--ambBg2, #fef3c7)", color: "var(--amb700, #b45309)", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>seri no bekliyor</span>
                        : "—"}
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--n600, #475569)", textAlign: "center" }}>{kalipCount(c) || "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: 12, color: "var(--n600, #475569)" }}>{fmtKalipCapi(c.kalipCapi) || "—"}</td>
                  <td style={{ padding: "13px 16px" }}>
                    {c.warrantyEnd
                      ? <span style={{ fontSize: 11, fontWeight: 600, color: warrantyOk ? (warrantySoon ? "var(--amb600, #d97706)" : "var(--emerald, #059669)") : "var(--red600, #dc2626)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 9, height: 9, borderRadius: "50%", background: warrantyColor, flexShrink: 0 }}></span>
                          {fmtTR(c.warrantyEnd)}
                        </span>
                      : <span style={{ color: "var(--n300, #cbd5e1)" }}>—</span>}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    {c.faturali ? (() => {
                      const tip = normalizeSaleType(c.faturali);
                      const stil = SALE_TYPE_STYLE[tip] || { bg: "var(--n150, #f1f5f9)", fg: "var(--n600, #475569)" };
                      return (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: stil.bg, color: stil.fg }}>
                          {tip}
                        </span>
                      );
                    })() : <span style={{ color: "var(--n300, #cbd5e1)" }}>—</span>}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {canDo(isCustomer ? "cust_edit" : "dealer_edit") && <Btn small variant="ghost" onClick={() => openEdit(c)}><Icon name="edit" size={12} /></Btn>}
                      {canDo(isCustomer ? "cust_delete" : "dealer_delete") && <Btn small variant="danger" onClick={() => del(c.id)}><Icon name="trash" size={12} /></Btn>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--n400, #94a3b8)" }}>{emptyLabel}</div>}
        <Pagination total={filtered.length} page={page} setPage={setPage} perPage={PER_PAGE} />
      </div>

      {detailView && (
        <CustomerDetailModal
          gorusmeler={gorusmeler} setGorusmeler={setGorusmeler}
          dosyalar={dosyalar} setDosyalar={setDosyalar} dosyaCevrimdisi={dosyaCevrimdisi}
          detailView={detailView}
          onClose={() => { setDetailViewId(null); onDetailClosed?.(); }}
          onSwitchMachine={setDetailViewId}
          onOpenEdit={openEdit}
          canDo={canDo}
          onOpenAddForFirm={openAddForFirm}
          isCustomer={isCustomer}
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
          kalipDefs={kalipDefs} partTypeDefs={partTypeDefs} calisanlar={calisanlar}
          serverPermissions={serverPermissions}
        />
      )}

      {confirmId && (
        <ConfirmDialog
          message={`"${customers.find(c => c.id === confirmId)?.name || ""}" ${delWord} Çöp Kutusu'na taşınacak. Bu makinaya ait servis kayıtları, Extra Kalıp satışları ve ödeme/kapora kayıtları da birlikte taşınır. Ayarlar'dan 30 gün içinde geri alabilirsiniz.`}
          onConfirm={confirmDel}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {dupWarn && (
        <ConfirmDialog
          confirmLabel="Yine de Kaydet" confirmIcon="check"
          message={<span style={{ display: "block", textAlign: "left", whiteSpace: "pre-line" }}>{
            `Benzer kayıt bulundu:\n${dupWarn.map(b => `• ${b.kayit.name}${b.kayit.model ? " · " + b.kayit.model : ""} — ${b.sebep}`).join("\n")}\n\nYine de yeni kayıt olarak kaydedilsin mi?`
          }</span>}
          onConfirm={() => { setDupWarn(null); doAdd(); }}
          onCancel={() => setDupWarn(null)}
        />
      )}

      {modal && (
        <CustomerAddEditForm
          modal={modal} form={form} setForm={setForm} save={save}
          onClose={() => { clearDraft(); setModal(null); if (returnDetailId != null) { setDetailViewId(returnDetailId); setReturnDetailId(null); } }}
          draftBar={<DraftRestoreBar draft={draft} onRestore={restoreDraft} onDiscard={discardDraft} />}
          stock={stock} models={models} kalipDefs={kalipDefs} parts={parts} partTypeDefs={partTypeDefs}
          dealers={dealers} factory={factory} kdvRates={kdvRates} payments={payments}
          geoData={geoData} loadingGeo={loadingGeo}
          addLabel={addLabel} entity={entity}
        />
      )}
    </div>
  );
};
