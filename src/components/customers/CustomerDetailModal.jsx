import { useState, useMemo } from "react";
import { CUR_SYM, ODEME_YONTEMLERI } from "../../lib/constants";
import {
  today, fmtTR, trLower, uid, bumpId, normalizeSaleType, calcKDV, fmtCur, parseMoney,
  sumPayments, calcKalanBorc, parcaAdi, isServisUcretliMi, isParcaUcretliMi, isServisBorcluMu,
  isPartSaleBorcluMu, sumBekleyenCek, isCekVadesiGecmis, stripAutoPrint, isAltuntasServisi,
  withDeleted, mergeAndUpdate, totalMiktar, resolveSatisYapan,
} from "../../lib/utils";
import {
  printServiceForm as printServiceFormTemplate,
  printMachineReport as printMachineReportTemplate,
  buildServiceFormHtml,
  buildMachineReportHtml,
} from "../../lib/printTemplates";
import { Icon, Field, Input, Warn, EMAIL_RE, PHONE_RE, Select, MoneyInput, Btn, Modal, ConfirmDialog, CountryCityFields, PickOrType, PaymentRowsEditor } from "../ui";
import { ServiceForm } from "../ServiceForm";
import { PartSaleForm } from "../PartSaleForm";

const SALE_TYPE_STYLE = {
  "Faturalı Yurtiçi":  { bg: "#d1fae5", fg: "#065f46" },
  "Faturalı Yurtdışı": { bg: "#dbeafe", fg: "#1d4ed8" },
  "Faturasız Yurtiçi": { bg: "#fef3c7", fg: "#92400e" },
  "Faturasız Yurtdışı":{ bg: "#fde68a", fg: "#7c2d12" },
};

export const CustomerDetailModal = ({
  detailView,
  onClose,
  onSwitchMachine,
  onOpenEdit,
  onOpenAddForFirm,
  isCustomer,
  customers, setCustomers,
  services, setServices,
  partSales, setPartSales,
  payments, setPayments,
  setStock,
  setPartStock, setPartStockLog,
  parts = [], models = [], dealers, factory,
  geoData, loadingGeo,
  kdvRates, appSettings,
  showToast,
  kalipDefs = [],
}) => {
  const [svModal, setSvModal] = useState(null);
  const [svForm, setSvForm] = useState({});
  const [pkForm, setPkForm] = useState(null);
  const [paymentForm, setPaymentForm] = useState(null);
  const [newOwnerForm, setNewOwnerForm] = useState(null);
  const [editPrevOwnerForm, setEditPrevOwnerForm] = useState(null);
  const [confirmUndoOwnerId, setConfirmUndoOwnerId] = useState(null);
  const [confirmDeletePaymentId, setConfirmDeletePaymentId] = useState(null);
  const [confirmDeleteServiceId, setConfirmDeleteServiceId] = useState(null);
  const [confirmDeletePartSaleId, setConfirmDeletePartSaleId] = useState(null);
  const [printLangModal, setPrintLangModal] = useState(null);
  const [mailDraft, setMailDraft] = useState(null);
  const [mailSendState, setMailSendState] = useState({ state: "idle", error: null });

  const todayStr = today();
  const factoryName = factory?.name || "Altuntaş Makina";

  const {
    detailHistory, detailTimelineEvents, detailModelInfo, detailWarrantyOk,
    detailToplamOdeme, detailKalanBorc, detailCiro, detailEkBorcAyniPB, detailEkBorcDigerPB,
    detailKalanBorcToplam, detailBekleyenCek, detailCekVadesiGecmisVar, detailMainCur, detailKalipSatisAdedi,
    detailBorcFromPrevOwner, detailServisNet, detailServisKdv, detailExtraKalipNet, detailExtraKalipKdv,
  } = useMemo(() => {
    const detailHistory = detailView
      ? services.filter(s => s.customerId === detailView.id).sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      : [];
    const detailTimelineEvents = (() => {
      if (!detailView) return [];
      const ev = [];
      if (detailView.installDate || (detailView.isResale && detailView.prevOwners?.length > 0)) {
        const isDevir = detailView.isResale && detailView.prevOwners?.length > 0;
        const lastSoldDate = isDevir ? detailView.prevOwners[detailView.prevOwners.length - 1].soldDate : null;
        ev.push({
          kind: "sale", date: isDevir && lastSoldDate ? lastSoldDate : detailView.installDate, color: "#16a34a",
          title: isDevir ? "2. El Devir" : "Satış",
          tip: normalizeSaleType(detailView.faturali),
          desc: `${detailView.name}${detailView.fabrikaSatisBedeli ? " · " + fmtCur(detailView.fabrikaSatisBedeli, detailView.currency) : ""}${(detailView.kaliplar || []).length ? " · " + detailView.kaliplar.length + " kalıp" : ""}`,
        });
      }
      detailHistory.forEach(sv => {
        const tColor = { "İlk Çalıştırma": "#1d4ed8", "Garanti İçi": "#16a34a", "Garanti Dışı": "#dc2626", "Periyodik Bakım": "#c2410c" }[sv.type] || "#94a3b8";
        ev.push({ kind: "service", date: sv.date, color: tColor, title: sv.type, sv });
      });
      const kalipGroups = {};
      (partSales || []).filter(ps => ps.customerId === detailView.id && ps.tur === "Kalıp").forEach(ps => {
        const key = ps.batchId || ps.id;
        (kalipGroups[key] = kalipGroups[key] || []).push(ps);
      });
      Object.values(kalipGroups).forEach(psList => {
        psList.sort((a, b) => a.id - b.id);
        ev.push({ kind: "part", date: psList[0].tarih, color: "#c2410c", title: "Kalıp Verildi", psList });
      });
      (partSales || []).filter(ps => ps.customerId === detailView.id && ps.tur !== "Kalıp").forEach(ps => {
        ev.push({
          kind: "part", date: ps.tarih, color: "#0891b2",
          title: "Yedek Parça Verildi",
          desc: `${ps.ad}${ps.olcu ? " (" + ps.olcu + ")" : ""}${ps.ucretsizMi ? " · garanti kapsamında (ücretsiz)" : " · " + fmtCur(ps.ucret, ps.currency) + (ps.garantiDisiIslem ? " (garanti dışı işlem)" : "")}`,
          ps,
        });
      });
      (payments || []).filter(p => p.customerId === detailView.id).forEach(p => {
        const yontemTxt = p.yontem === "Çek" ? ` · Çek (Vade: ${p.vadeTarihi ? fmtTR(p.vadeTarihi) : "—"}${p.tahsilEdildi ? " · Tahsil Edildi" : " · Beklemede"})` : (p.yontem ? ` · ${p.yontem}` : "");
        ev.push({
          kind: "payment", date: p.tarih, color: "#0d9488",
          title: "Kapora/Ödeme",
          desc: `${fmtCur(p.tutar, p.currency || detailView.currency)}${yontemTxt}${p.not ? " · " + p.not : ""}`,
          payment: p,
        });
      });
      if (detailView.warrantyEnd) {
        const dolmus = detailView.warrantyEnd < todayStr;
        ev.push({
          kind: "warranty", date: detailView.warrantyEnd, color: dolmus ? "#dc2626" : "#f59e0b",
          title: dolmus ? "Garanti Süresi Doldu" : "Garanti Bitişi",
          desc: dolmus ? "Garanti süresi sona erdi" : "Garanti süresi bu tarihte sona erecek",
        });
      }
      return ev.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
    })();
    const detailModelInfo = detailView ? models.find(m => m.model === detailView.model) : null;
    const detailWarrantyOk = detailView?.warrantyEnd && detailView.warrantyEnd >= todayStr;
    const detailToplamOdeme = detailView ? sumPayments(detailView.id, payments) : 0;
    const detailKalanBorc = detailView ? calcKalanBorc(detailView, payments, kdvRates) : 0;
    const detailCiro = detailKalanBorc + detailToplamOdeme;

    const detailEkBorcByCur = {};
    if (detailView) {
      const ekle = (cur, tutar) => { if (tutar > 0) detailEkBorcByCur[cur] = (detailEkBorcByCur[cur] || 0) + tutar; };
      services.filter(s => s.customerId === detailView.id && isServisBorcluMu(s, factoryName)).forEach(s => {
        if (isServisUcretliMi(s, factoryName)) {
          const tutar = parseMoney(s.servisUcreti);
          ekle(s.currency || "TRY", tutar + calcKDV(s.faturaTipi, tutar, s.date, kdvRates));
        }
        if (isParcaUcretliMi(s)) {
          const tutar = parseMoney(s.parcaUcreti);
          ekle(s.parcaCurrency || s.currency || "TRY", tutar + calcKDV(s.faturaTipi, tutar, s.date, kdvRates));
        }
      });
      (partSales || []).filter(p => p.customerId === detailView.id && isPartSaleBorcluMu(p)).forEach(p => {
        const tutar = parseMoney(p.ucret);
        ekle(p.currency || "TRY", tutar + calcKDV(p.faturaTipi, tutar, p.tarih, kdvRates));
      });
    }
    const detailMainCur = detailView?.currency || "TRY";
    const detailEkBorcAyniPB = detailEkBorcByCur[detailMainCur] || 0;
    const detailEkBorcDigerPB = Object.entries(detailEkBorcByCur).filter(([cur]) => cur !== detailMainCur);
    const detailKalanBorcToplam = detailKalanBorc + detailEkBorcAyniPB;
    const detailBekleyenCek = detailView ? sumBekleyenCek(detailView.id, payments) : 0;
    const detailBekleyenCekler = detailView ? payments.filter(p => p.customerId === detailView.id && p.yontem === "Çek" && !p.tahsilEdildi) : [];
    const detailCekVadesiGecmisVar = detailBekleyenCekler.some(isCekVadesiGecmis);
    const detailKalipSatisAdedi = detailView ? (partSales || []).filter(p => p.customerId === detailView.id && p.tur === "Kalıp").length : 0;

    let detailServisNet = 0, detailServisKdv = 0;
    let detailExtraKalipNet = 0, detailExtraKalipKdv = 0;
    if (detailView) {
      services.filter(s => s.customerId === detailView.id).forEach(s => {
        if (isServisUcretliMi(s, factoryName) && (s.currency || "TRY") === detailMainCur) {
          const tutar = parseMoney(s.servisUcreti);
          detailServisNet += tutar;
          detailServisKdv += calcKDV(s.faturaTipi, tutar, s.date, kdvRates);
        }
        if (isParcaUcretliMi(s) && (s.parcaCurrency || s.currency || "TRY") === detailMainCur) {
          const tutar = parseMoney(s.parcaUcreti);
          detailServisNet += tutar;
          detailServisKdv += calcKDV(s.faturaTipi, tutar, s.date, kdvRates);
        }
      });
      (partSales || []).filter(p => p.customerId === detailView.id && p.tur === "Kalıp" && !p.ucretsizMi && (p.currency || "TRY") === detailMainCur).forEach(p => {
        const tutar = parseMoney(p.ucret);
        detailExtraKalipNet += tutar;
        detailExtraKalipKdv += calcKDV(p.faturaTipi, tutar, p.tarih, kdvRates);
      });
    }

    const detailLastTransferDate = detailView?.prevOwners?.length > 0 ? detailView.prevOwners[detailView.prevOwners.length - 1].soldDate : null;
    const detailBorcFromPrevOwner = !!(detailView && detailLastTransferDate && (
      detailKalanBorc > 0 ||
      services.some(s => s.customerId === detailView.id && isServisBorcluMu(s, factoryName) && s.date && s.date < detailLastTransferDate) ||
      (partSales || []).some(p => p.customerId === detailView.id && isPartSaleBorcluMu(p) && p.tarih && p.tarih < detailLastTransferDate)
    ));

    return {
      detailHistory, detailTimelineEvents, detailModelInfo, detailWarrantyOk,
      detailToplamOdeme, detailKalanBorc, detailCiro, detailEkBorcAyniPB, detailEkBorcDigerPB,
      detailKalanBorcToplam, detailBekleyenCek, detailCekVadesiGecmisVar, detailMainCur, detailKalipSatisAdedi,
      detailBorcFromPrevOwner, detailServisNet, detailServisKdv, detailExtraKalipNet, detailExtraKalipKdv,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailView, services, partSales, payments, kdvRates, models, todayStr, factoryName]);

  // ── Servis parça stok ──
  const deductServiceParts = (degisenParcalar, serviceId) => {
    if (!setPartStock || !setPartStockLog) return;
    const valid = (degisenParcalar || []).filter(p => p && p.partId && parseInt(p.miktar) > 0);
    if (valid.length === 0) return;
    setPartStock(ps => {
      let updated = [...ps];
      valid.forEach(r => {
        const pid = String(r.partId);
        updated = mergeAndUpdate(updated, pid, totalMiktar(updated, pid) - parseInt(r.miktar));
      });
      return updated;
    });
    setPartStockLog(lg => [
      ...lg,
      ...valid.map(r => ({ id: uid(), partId: String(r.partId), miktar: -parseInt(r.miktar), tip: "servis", referansId: serviceId, tarih: today(), notlar: "" })),
    ]);
  };

  const restoreServiceParts = (serviceId) => {
    if (!setPartStock || !setPartStockLog) return;
    setPartStockLog(lg => {
      const toRestore = lg.filter(l => l.referansId === serviceId && l.tip === "servis" && l.partId);
      if (toRestore.length > 0) {
        setPartStock(ps => {
          let updated = [...ps];
          toRestore.forEach(l => {
            const pid = String(l.partId);
            updated = mergeAndUpdate(updated, pid, totalMiktar(updated, pid) + Math.abs(l.miktar));
          });
          return updated;
        });
      }
      return lg.filter(l => !(l.referansId === serviceId && l.tip === "servis" && l.partId));
    });
  };

  // ── Servis kayıtları ──
  const openAddService = () => {
    setSvForm({ customerId: detailView.id, type: "Periyodik Bakım", repairPlace: "Yerinde Onarım", yapilanIsler: "", musteriTalimati: "", servisUcreti: "", date: today(), tech: "", islemFirma: factoryName, odendi: false, degisenParcalar: [], parcaUcreti: "", currency: "TRY", parcaGarantiDisi: false, faturaTipi: normalizeSaleType(detailView.faturali) });
    setSvModal("add");
  };
  const openEditService = sv => {
    const eski = (sv.degisenParcalar || []).some(p => typeof p === "string");
    const degisenParcalar = eski
      ? sv.degisenParcalar.map(ad => ({ ad, fiyat: sv.degisenParcalar.length ? parseMoney(sv.parcaUcreti) / sv.degisenParcalar.length : 0 }))
      : (sv.degisenParcalar || []);
    const cust = customers.find(c => c.id === sv.customerId);
    setSvForm({ degisenParcalar: [], parcaUcreti: "", parcaGarantiDisi: false, faturaTipi: normalizeSaleType(cust?.faturali), ...sv, degisenParcalar });
    setSvModal({ edit: sv });
  };
  const saveService = (parcaUcretsizMi) => {
    if (!setServices) return;
    const parcaUcreti = (svForm.degisenParcalar || []).reduce((s, p) => s + parseMoney(typeof p === "string" ? 0 : p.fiyat), 0);
    const rec = { ...svForm, customerId: svForm.customerId ? Number(svForm.customerId) : null, parcaUcretsizMi, parcaUcreti, parcaCurrency: svForm.currency };
    if (svModal === "add") {
      bumpId(customers, services);
      const newId = uid();
      setServices(p => p.some(s => s.id === newId) ? p : [{ ...rec, id: newId }, ...p]);
      deductServiceParts(rec.degisenParcalar, newId);
      showToast("Servis talebi kaydedildi.");
    } else {
      restoreServiceParts(svForm.id);
      setServices(p => p.map(s => s.id === svForm.id ? rec : s));
      deductServiceParts(rec.degisenParcalar, svForm.id);
      showToast("Servis talebi düzenlendi.");
    }
    setSvModal(null);
  };
  const svUcretliMi = (sv) => (sv.type === "Garanti Dışı" || sv.type === "Periyodik Bakım") && parseMoney(sv.servisUcreti) > 0;
  const svParcaUcretliMi = (sv) => !sv.parcaUcretsizMi && parseMoney(sv.parcaUcreti) > 0;
  const toggleServisOdendi = (sv) => setServices && setServices(p => p.map(s => s.id === sv.id ? { ...s, odendi: !s.odendi } : s));
  const deleteService = (id) => {
    if (!setServices) return;
    restoreServiceParts(id);
    setServices(p => withDeleted(p, s => s.id === id));
    showToast("Servis kaydı silindi.");
  };

  // ── Extra Kalıp satışları ──
  const openAddPartSale = () => {
    setPkForm({ customerId: detailView.id, kaliplar: [], currency: "TRY", tarih: today(), odendi: false, faturaTipi: normalizeSaleType(detailView.faturali) });
  };
  const openEditPartSale = (ps) => {
    const cust = customers.find(c => c.id === ps.customerId);
    setPkForm({
      id: ps.id, customerId: ps.customerId,
      kaliplar: [{ ad: ps.ad || "", olcu: ps.olcu || "", fiyat: ps.ucret || "" }],
      tarih: ps.tarih || today(), currency: ps.currency || "TRY", odendi: !!ps.odendi,
      faturaTipi: ps.faturaTipi || normalizeSaleType(cust?.faturali),
    });
  };
  const savePartSale = () => {
    const selectedCust = customers.find(c => c.id === Number(pkForm.customerId));
    const satirlar = (pkForm.kaliplar || []).filter(k => k.ad);
    if (!selectedCust || !setPartSales || satirlar.length === 0) return;
    const ortak = {
      customerId: selectedCust.id, tur: "Kalıp", tarih: pkForm.tarih || today(),
      currency: pkForm.currency || "TRY", ucretsizMi: false,
      odendi: !!pkForm.odendi, faturaTipi: pkForm.faturaTipi,
    };
    if (pkForm.id) {
      const k = satirlar[0];
      const fields = { ...ortak, ad: k.ad, olcu: k.olcu || "", ucret: parseMoney(k.fiyat) };
      setPartSales(p => p.map(x => x.id === pkForm.id ? { ...x, ...fields } : x));
      setCustomers(p => p.map(c => c.id === selectedCust.id
        ? { ...c, kaliplar: (c.kaliplar || []).map(b => b.partSaleId === pkForm.id ? { ...b, ad: k.ad, olcu: k.olcu || "" } : b) }
        : c));
      showToast("Kayıt güncellendi.");
    } else {
      const batchId = uid();
      const yeniKayitlar = satirlar.map(k => ({ id: uid(), batchId, ...ortak, ad: k.ad, olcu: k.olcu || "", ucret: parseMoney(k.fiyat) }));
      setPartSales(p => [...p, ...yeniKayitlar]);
      setCustomers(p => p.map(c => c.id === selectedCust.id
        ? { ...c, kaliplar: [...(c.kaliplar || []), ...yeniKayitlar.map(r => ({ ad: r.ad, olcu: r.olcu, partSaleId: r.id }))], kalipSayisi: (c.kaliplar || []).length + yeniKayitlar.length }
        : c));
      showToast(yeniKayitlar.length > 1 ? `${yeniKayitlar.length} kalıp verildi (ücretli).` : "Kalıp verildi (ücretli).");
    }
    setPkForm(null);
  };
  const togglePartSaleOdendi = (ps) => setPartSales && setPartSales(p => p.map(x => x.id === ps.id ? { ...x, odendi: !x.odendi } : x));
  const deletePartSale = (id) => {
    if (!setPartSales) return;
    const ps = partSales.find(x => x.id === id);
    setPartSales(p => withDeleted(p, x => x.id === id));
    if (ps?.tur === "Kalıp") {
      setCustomers(p => p.map(c => {
        if (c.id !== ps.customerId) return c;
        const kaliplar = (c.kaliplar || []).filter(k => k.partSaleId !== id);
        return { ...c, kaliplar, kalipSayisi: kaliplar.length };
      }));
    }
    showToast("Extra Kalıp kaydı silindi.");
  };

  // ── Ödemeler ──
  const openAddPayment = () => {
    setPaymentForm({ customerId: detailView.id, tarih: today(), satirlar: [], currency: detailView.currency || "TRY", not: "" });
  };
  const openEditPayment = (p) => {
    setPaymentForm({
      id: p.id, customerId: p.customerId, tarih: p.tarih || today(), tutar: p.tutar || "", currency: p.currency || "TRY", not: p.not || "",
      yontem: p.yontem || "Nakit", vadeTarihi: p.vadeTarihi || "", tahsilEdildi: !!p.tahsilEdildi,
    });
  };
  const syncKalanBorc = (customerId, newPayments) => {
    setCustomers(p => p.map(c => c.id === customerId ? { ...c, kalanBorc: calcKalanBorc(c, newPayments, kdvRates) } : c));
  };
  const savePayment = () => {
    if (!setPayments || !paymentForm) return;
    const customerId = Number(paymentForm.customerId);
    let newPayments;
    if (paymentForm.id) {
      if (parseMoney(paymentForm.tutar) <= 0) return;
      const yontem = paymentForm.yontem || "Nakit";
      const fields = {
        customerId, tarih: paymentForm.tarih || today(), tutar: parseMoney(paymentForm.tutar),
        currency: paymentForm.currency || "TRY", not: paymentForm.not || "", yontem,
        vadeTarihi: yontem === "Çek" ? (paymentForm.vadeTarihi || "") : undefined,
        tahsilEdildi: yontem === "Çek" ? !!paymentForm.tahsilEdildi : undefined,
      };
      newPayments = payments.map(x => x.id === paymentForm.id ? { ...x, ...fields } : x);
      showToast("Ödeme güncellendi.");
    } else {
      const satirlar = (paymentForm.satirlar || []).filter(r => parseMoney(r.tutar) > 0);
      if (satirlar.length === 0) return;
      const ortak = { customerId, tarih: paymentForm.tarih || today(), currency: paymentForm.currency || "TRY", not: paymentForm.not || "" };
      bumpId(customers, services, partSales, payments);
      const yeniKayitlar = satirlar.map(r => ({
        id: uid(), ...ortak, tutar: parseMoney(r.tutar), yontem: r.yontem || "Nakit",
        ...(r.yontem === "Çek" ? { vadeTarihi: r.vadeTarihi || "", tahsilEdildi: false } : {}),
      }));
      newPayments = [...yeniKayitlar, ...payments];
      showToast(yeniKayitlar.length > 1 ? `${yeniKayitlar.length} ödeme kaydedildi.` : "Ödeme kaydedildi.");
    }
    setPayments(newPayments);
    syncKalanBorc(customerId, newPayments);
    setPaymentForm(null);
  };
  const deletePayment = (id) => {
    if (!setPayments) return;
    const payment = payments.find(x => x.id === id);
    const newPayments = payments.filter(x => x.id !== id);
    setPayments(p => withDeleted(p, x => x.id === id));
    if (payment) syncKalanBorc(payment.customerId, newPayments);
    showToast("Ödeme silindi.");
  };
  const toggleCekTahsil = (payment) => {
    if (!setPayments) return;
    const newPayments = payments.map(x => x.id === payment.id ? { ...x, tahsilEdildi: !x.tahsilEdildi } : x);
    setPayments(newPayments);
    syncKalanBorc(payment.customerId, newPayments);
  };

  // ── 2. el devir ──
  const saveNewOwner = () => {
    setCustomers(p => p.map(c => {
      if (c.id !== newOwnerForm._machineId) return c;
      const prev = {
        name: c.name, satisYapan: c.satisYapan, adres: c.adres, phone: c.phone || "", aciklama: c.aciklama || "",
        email: c.email || "", yetkili1Ad: c.yetkili1Ad || "", yetkili1Tel: c.yetkili1Tel || "",
        yetkili2Ad: c.yetkili2Ad || "", yetkili2Tel: c.yetkili2Tel || "",
        city: c.city, country: c.country, soldDate: newOwnerForm.saleDate || today(),
      };
      return {
        ...c, prevOwners: [...(c.prevOwners || []), prev],
        name: newOwnerForm.name, phone: newOwnerForm.phone || "",
        email: newOwnerForm.email || "",
        yetkili1Ad: newOwnerForm.yetkili1Ad || "", yetkili1Tel: newOwnerForm.yetkili1Tel || "",
        yetkili2Ad: newOwnerForm.yetkili2Ad || "", yetkili2Tel: newOwnerForm.yetkili2Tel || "",
        adres: newOwnerForm.adres || "", city: newOwnerForm.city || "", country: newOwnerForm.country || "",
        aciklama: newOwnerForm.aciklama || "",
        isResale: true,
        satisYapan: newOwnerForm.satanFirma?.trim() || "2. El Devir",
      };
    }));
    showToast("Devir tamamlandı. Yeni sahip kaydedildi.");
    setNewOwnerForm(null);
  };
  const openEditPrevOwner = (machineId, index, owner) => {
    setEditPrevOwnerForm({
      _machineId: machineId, _index: index,
      name: owner.name || "", satisYapan: owner.satisYapan || "", phone: owner.phone || "",
      email: owner.email || "", yetkili1Ad: owner.yetkili1Ad || "", yetkili1Tel: owner.yetkili1Tel || "",
      yetkili2Ad: owner.yetkili2Ad || "", yetkili2Tel: owner.yetkili2Tel || "",
      adres: owner.adres || "", city: owner.city || "", country: owner.country || "",
      aciklama: owner.aciklama || "", soldDate: owner.soldDate || "",
    });
  };
  const saveEditPrevOwner = () => {
    setCustomers(p => p.map(c => {
      if (c.id !== editPrevOwnerForm._machineId) return c;
      const prevOwners = c.prevOwners.map((o, i) => i !== editPrevOwnerForm._index ? o : {
        name: editPrevOwnerForm.name, satisYapan: editPrevOwnerForm.satisYapan, phone: editPrevOwnerForm.phone || "",
        email: editPrevOwnerForm.email || "", yetkili1Ad: editPrevOwnerForm.yetkili1Ad || "", yetkili1Tel: editPrevOwnerForm.yetkili1Tel || "",
        yetkili2Ad: editPrevOwnerForm.yetkili2Ad || "", yetkili2Tel: editPrevOwnerForm.yetkili2Tel || "",
        adres: editPrevOwnerForm.adres || "", city: editPrevOwnerForm.city || "", country: editPrevOwnerForm.country || "",
        aciklama: editPrevOwnerForm.aciklama || "", soldDate: editPrevOwnerForm.soldDate || "",
      });
      return { ...c, prevOwners };
    }));
    showToast("Sahiplik geçmişi kaydı güncellendi.");
    setEditPrevOwnerForm(null);
  };
  const undoLastOwnerTransfer = (machineId) => {
    setCustomers(p => p.map(c => {
      if (c.id !== machineId || !c.prevOwners?.length) return c;
      const last = c.prevOwners[c.prevOwners.length - 1];
      const prevOwners = c.prevOwners.slice(0, -1);
      return {
        ...c, prevOwners,
        name: last.name, satisYapan: last.satisYapan, phone: last.phone || "",
        email: last.email || "", yetkili1Ad: last.yetkili1Ad || "", yetkili1Tel: last.yetkili1Tel || "",
        yetkili2Ad: last.yetkili2Ad || "", yetkili2Tel: last.yetkili2Tel || "",
        adres: last.adres || "", city: last.city || "", country: last.country || "",
        aciklama: last.aciklama || "",
        isResale: prevOwners.length > 0,
      };
    }));
    showToast("Son devir geri alındı.");
    setConfirmUndoOwnerId(null);
  };

  // ── Yazdırma / e-posta ──
  const servisT = (lang = "TR") => ({ ...((appSettings?.translations?.servis) || {}), _lang: lang });
  const makinaT = (lang = "TR") => ({ ...((appSettings?.translations?.makina) || {}), _lang: lang });
  const isTurkiye = !detailView?.country || detailView.country === "Türkiye";
  const openPrintOrPick = (type, sv) => {
    if (isTurkiye) {
      if (type === "makina") printMachineReport("TR");
      else if (type === "servis") printServiceForm(sv, "TR");
      else if (type === "mail_makina") openMailMachineReport("TR");
      else if (type === "mail_servis") openMailServiceForm(sv, "TR");
    } else {
      setPrintLangModal({ type, sv });
    }
  };
  const kaseResmi = appSettings?.kaseResmi || "";
  const printServiceForm = (sv, lang = "TR") => printServiceFormTemplate(sv, customers, kdvRates, servisT(lang), kaseResmi);
  const printMachineReport = (lang = "TR") => {
    if (!detailView) return;
    printMachineReportTemplate(detailView, detailHistory, partSales, makinaT(lang), kaseResmi, parts);
  };
  const openMailMachineReport = (lang = "TR") => {
    if (!detailView) return;
    const html = stripAutoPrint(buildMachineReportHtml(detailView, detailHistory, partSales, makinaT(lang), kaseResmi, parts));
    setMailDraft({
      to: detailView.email || "",
      subject: `Makina Servis ve Yedek Parça Geçmişi Raporu - ${detailView.name}`,
      text: `Sayın ${detailView.name},\n\nMakinanıza ait servis ve yedek parça geçmişi raporu ekte yer almaktadır.\n\nİyi günler dileriz.\nAltuntaş Makina`,
      pdfHtml: html,
      pdfFileName: `makina-raporu-${(detailView.serialNo || detailView.name || "kayit").replace(/\s+/g, "-")}.pdf`,
    });
    setMailSendState({ state: "idle", error: null });
  };
  const openMailServiceForm = (sv, lang = "TR") => {
    const cust = customers.find(c => c.id === sv.customerId);
    const html = stripAutoPrint(buildServiceFormHtml(sv, customers, kdvRates, { forEmail: true, translations: servisT(lang), kaseResmi }));
    setMailDraft({
      to: cust?.email || "",
      subject: `Servis Formu - ${cust?.name || ""}`,
      text: `Sayın ${cust?.name || ""},\n\nServis formunuz ekte yer almaktadır.\n\nİyi günler dileriz.\nAltuntaş Makina`,
      pdfHtml: html,
      pdfFileName: `servis-formu-${(cust?.serialNo || cust?.name || "kayit").replace(/\s+/g, "-")}.pdf`,
    });
    setMailSendState({ state: "idle", error: null });
  };
  const previewMailAttachment = () => {
    if (!mailDraft?.pdfHtml) return;
    if (window.appPrint) { window.appPrint.printHtml(mailDraft.pdfHtml); return; }
    const blob = new Blob([mailDraft.pdfHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  const sendMailDraft = async () => {
    if (!window.appMail || !mailDraft) return;
    if (!EMAIL_RE.test(mailDraft.to || "")) { setMailSendState({ state: "error", error: "Geçerli bir alıcı e-posta adresi girin." }); return; }
    setMailSendState({ state: "sending", error: null });
    const res = await window.appMail.send({ to: mailDraft.to.trim(), subject: mailDraft.subject, text: mailDraft.text, pdfHtml: mailDraft.pdfHtml, pdfFileName: mailDraft.pdfFileName });
    if (res?.ok) {
      setMailSendState({ state: "idle", error: null });
      setMailDraft(null);
      showToast("E-posta gönderildi.");
    } else {
      setMailSendState({ state: "error", error: res?.error || "Gönderilemedi." });
    }
  };

  // ── Render ──
  const firmMachines = isCustomer ? customers.filter(c => trLower(c.name) === trLower(detailView.name)) : [];
  const hasMultiple = firmMachines.length > 1;

  return (
    <>
      <Modal wide maxWidth={1080} title={detailView.name} onClose={onClose}>
        <div style={{ display: "grid", gridTemplateColumns: hasMultiple ? "220px 1fr" : "1fr", gap: 20, alignItems: "start" }}>
          {hasMultiple && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10 }}>
                BU FİRMANIN MAKİNALARI ({firmMachines.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {firmMachines.map(m => {
                  const ok = m.warrantyEnd && m.warrantyEnd >= today();
                  const isCurrent = m.id === detailView.id;
                  return (
                    <div key={m.id}
                      onClick={() => onSwitchMachine(m.id)}
                      style={{ padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                        border: "1px solid", borderColor: isCurrent ? "#e85d1a" : "#e2e8f0", background: isCurrent ? "#fff7ed" : "#fff" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                        {m.model || "Model yok"} {isCurrent && <span style={{ fontSize: 10, color: "#e85d1a", fontWeight: 800 }}>· GÖRÜNTÜLENEN</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{m.serialNo || "Seri no yok"}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: ok ? "#059669" : "#dc2626", marginTop: 3 }}>
                        {m.warrantyEnd ? `${fmtTR(m.warrantyEnd)} ${ok ? "✓" : "⚠"}` : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            {(detailCiro > 0 || detailKalanBorcToplam > 0 || detailEkBorcDigerPB.length > 0 || detailBekleyenCek > 0) && (
              <div style={{ marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderTop: "3px solid #e85d1a", borderRadius: 12, padding: "14px 18px" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, letterSpacing: .5, marginBottom: 6, textTransform: "uppercase" }}>Toplam Bedel</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{fmtCur(detailCiro, detailView.currency)}</div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderTop: "3px solid #16a34a", borderRadius: 12, padding: "14px 18px" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, letterSpacing: .5, marginBottom: 6, textTransform: "uppercase" }}>Kapora/Ödeme Alınan</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#15803d" }}>{fmtCur(detailToplamOdeme, detailView.currency)}</div>
                </div>
                <div style={{
                  background: detailKalanBorcToplam > 0 ? "#fef2f2" : "#f0fdf4",
                  border: `1px solid ${detailKalanBorcToplam > 0 ? "#fecaca" : "#bbf7d0"}`,
                  borderTop: `3px solid ${detailKalanBorcToplam > 0 ? "#dc2626" : "#16a34a"}`,
                  borderRadius: 12, padding: "14px 18px",
                }}>
                  <div style={{ fontSize: 11, color: detailKalanBorcToplam > 0 ? "#991b1b" : "#15803d", fontWeight: 700, letterSpacing: .5, marginBottom: 6, textTransform: "uppercase" }}>Kalan Borç</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: detailKalanBorcToplam > 0 ? "#dc2626" : "#15803d" }}>
                    {detailKalanBorcToplam > 0 ? fmtCur(detailKalanBorcToplam, detailView.currency) : "✓ Borç Yok"}
                  </div>
                  {detailEkBorcAyniPB > 0 && (
                    <div style={{ fontSize: 10.5, color: "#991b1b", marginTop: 5 }}>
                      ({fmtCur(Math.max(detailKalanBorc, 0), detailView.currency)} makina + {fmtCur(detailEkBorcAyniPB, detailView.currency)} servis/parça/kalıp)
                    </div>
                  )}
                  {detailView.isResale && detailBorcFromPrevOwner && (
                    <div style={{ fontSize: 10.5, color: "#991b1b", marginTop: 5, fontStyle: "italic" }}>
                      Bu borcun bir kısmı/tamamı önceki sahip <b>{detailView.prevOwners[detailView.prevOwners.length - 1].name}</b>'den kalmış olabilir.
                    </div>
                  )}
                </div>
              </div>
              {detailEkBorcDigerPB.length > 0 && (
                <div style={{ fontSize: 11.5, color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", marginTop: 10, fontWeight: 600 }}>
                  Ayrıca farklı para biriminden ödenmemiş servis/parça/Extra Kalıp borcu var (yukarıdaki toplama dahil edilmedi):{" "}
                  {detailEkBorcDigerPB.map(([cur, tutar]) => fmtCur(tutar, cur)).join(" + ")}
                </div>
              )}
              {detailBekleyenCek > 0 && (
                <div style={{
                  fontSize: 11.5, fontWeight: 600, borderRadius: 8, padding: "8px 12px", marginTop: 10,
                  color: detailCekVadesiGecmisVar ? "#991b1b" : "#92400e",
                  background: detailCekVadesiGecmisVar ? "#fef2f2" : "#fffbeb",
                  border: `1px solid ${detailCekVadesiGecmisVar ? "#fecaca" : "#fde68a"}`,
                }}>
                  {detailCekVadesiGecmisVar
                    ? <>Vadesi geçti! {fmtCur(detailBekleyenCek, detailMainCur)} çek tahsil edilmedi.</>
                    : <>{fmtCur(detailBekleyenCek, detailMainCur)} tahsil edilecek çek bekliyor.</>}
                </div>
              )}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 16 }}>
              {[
                ["Fatura Durumu", detailView.faturali ? `${detailView.faturali}${detailView.faturali === "Faturasız" ? " (KDV HARİÇ)" : ""}` : ""],
                ["Fabrika Satış Bedeli (KDV'siz)", detailView.fabrikaSatisBedeli ? fmtCur(detailView.fabrikaSatisBedeli, detailView.currency) : ""],
                ["Fatura Bedeli", detailView.faturaBedeli ? fmtCur(detailView.faturaBedeli, detailView.currency) : ""],
                ["KDV Miktarı", calcKDV(detailView.faturali, detailView.faturaBedeli, detailView.installDate, kdvRates) > 0 ? fmtCur(calcKDV(detailView.faturali, detailView.faturaBedeli, detailView.installDate, kdvRates), detailView.currency) : ""],
                ["Komisyon", detailView.komisyon ? fmtCur(detailView.komisyon, detailView.currency) : ""],
                ["Toplam Servis", detailServisNet > 0 ? fmtCur(detailServisNet, detailMainCur) : "", detailServisKdv > 0 ? `KDV: ${fmtCur(detailServisKdv, detailMainCur)}` : ""],
                ["Extra Kalıp", detailExtraKalipNet > 0 ? fmtCur(detailExtraKalipNet, detailMainCur) : "", detailExtraKalipKdv > 0 ? `KDV: ${fmtCur(detailExtraKalipKdv, detailMainCur)}` : ""],
                ["Satış Yapan", resolveSatisYapan(detailView.satisYapan, factory)],
                ["Şirket Telefonu", detailView.phone],
                ["E-posta", detailView.email],
                ["Yetkili 1 - Ad Soyad", detailView.yetkili1Ad],
                ["Yetkili 1 - Telefon", detailView.yetkili1Tel],
                ["Adres", detailView.adres],
                ["Şehir / Ülke", [detailView.city, detailView.country].filter(Boolean).join(" / ")],
                ["Model", detailView.model],
                ["Makina Kalıp Çapı", detailView.kalipCapi ? `${detailView.kalipCapi.en || ""}×${detailView.kalipCapi.yukseklik || ""}×${detailView.kalipCapi.boy || ""}`.replace(/^×+|×+$/g, "") : ""],
                ["Konveyör Saç", detailView.konveyorSacId ? (parts.find(p => String(p.id) === String(detailView.konveyorSacId))?.ad || "") : ""],
                ["Bant", detailView.bantSecimiId ? (parts.find(p => String(p.id) === String(detailView.bantSecimiId))?.ad || "") : ""],
                ...(Array.isArray(detailView.bantlar) ? detailView.bantlar.map((b, i) => {
                  const olcu = b.en && b.boy ? `${b.en}×${b.boy}` : (b.en || b.boy || "");
                  return [`__bant_${i}`, [b.ad, olcu].filter(Boolean).join(" "), b.miktar > 1 ? `×${b.miktar} adet` : ""];
                }) : []),
                ["Seri Numarası", detailView.serialNo],
                ["Garanti Başlangıç", detailView.installDate ? fmtTR(detailView.installDate) : ""],
                ["Garanti Bitiş", detailView.warrantyEnd ? fmtTR(detailView.warrantyEnd) : ""],
                ["Para Birimi", detailView.currency && detailView.currency !== "TRY" ? ({USD:"Dolar ($)",EUR:"Euro (€)"}[detailView.currency]) : ""],
                ["Açıklama", detailView.aciklama],
              ].filter(([, v]) => v && v !== "—").map(([k, v, sub]) => {
                const isBant = k.startsWith("__bant_");
                const bantIdx = isBant ? parseInt(k.replace("__bant_", ""), 10) : -1;
                return (
                  <div key={k} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px", position: "relative" }}>
                    <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: .5, marginBottom: 3, textTransform: "uppercase" }}>{isBant ? "Bant" : k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{v}</div>
                    {sub && <div style={{ fontSize: 10.5, color: "#0d9488", fontWeight: 700, marginTop: 3 }}>{sub}</div>}
                    {isBant && (
                      <button
                        onClick={() => setCustomers(p => p.map(c => c.id === detailView.id ? { ...c, bantlar: (c.bantlar || []).filter((_, i) => i !== bantIdx) } : c))}
                        title="Eski bant verisini kaldır"
                        style={{ position: "absolute", top: 6, right: 8, border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 14, fontWeight: 700, lineHeight: 1, padding: 2 }}>×</button>
                    )}
                  </div>
                );
              })}
            </div>
            {Array.isArray(detailView.kaliplar) && detailView.kaliplar.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>KALIPLAR ({detailView.kaliplar.length})</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {detailView.kaliplar.map((k, i) => {
                    const extraSatistan = k.partSaleId != null || i >= detailView.kaliplar.length - detailKalipSatisAdedi;
                    return (
                      <span key={i} title={extraSatistan ? "Extra Kalıp Satışı'ndan" : ""}
                        style={{ fontSize: 12, fontWeight: 700, background: extraSatistan ? "#fee2e2" : "#fff7ed", color: extraSatistan ? "#991b1b" : "#c2410c", border: `1px solid ${extraSatistan ? "#fca5a5" : "#fed7aa"}`, borderRadius: 8, padding: "6px 12px" }}>
                        {[k.olcu, k.ad].filter(Boolean).join(" — ")}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {detailView.prevOwners?.length > 0 && (
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 10, color: "#0f172a", fontSize: 13 }}>Sahiplik Geçmişi</div>
                {detailView.prevOwners.map((o, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: "1px solid #fde8d2" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626" }}>{i + 1}. Sahip: {o.name}</div>
                      <div style={{ fontSize: 11, color: "#92400e" }}>
                        {o.country || ""}{o.city ? ` / ${o.city}` : ""}{o.satisYapan ? ` · Satış: ${resolveSatisYapan(o.satisYapan, factory)}` : ""}{o.phone ? ` · Tel: ${o.phone}` : ""}{o.email ? ` · ${o.email}` : ""}
                      </div>
                      {(o.yetkili1Ad || o.yetkili2Ad) && (
                        <div style={{ fontSize: 11, color: "#92400e" }}>
                          {[o.yetkili1Ad && `${o.yetkili1Ad}${o.yetkili1Tel ? ` (${o.yetkili1Tel})` : ""}`, o.yetkili2Ad && `${o.yetkili2Ad}${o.yetkili2Tel ? ` (${o.yetkili2Tel})` : ""}`].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      {o.aciklama && <div style={{ fontSize: 11, color: "#92400e", marginTop: 2, fontStyle: "italic" }}>"{o.aciklama}"</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "right" }}>
                        Devir tarihi<br /><b style={{ color: "#475569" }}>{fmtTR(o.soldDate)}</b>
                      </div>
                      <button onClick={() => openEditPrevOwner(detailView.id, i, o)} title="Bu kaydı düzelt"
                        style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", padding: 4 }}>
                        <Icon name="edit" size={14} />
                      </button>
                      {i === detailView.prevOwners.length - 1 && (
                        <button onClick={() => setConfirmUndoOwnerId(detailView.id)} title="Son devri geri al"
                          style={{ border: "none", background: "transparent", cursor: "pointer", color: "#dc2626", padding: 4 }}>
                          <Icon name="refresh" size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div style={{ paddingTop: 8, fontSize: 12, fontWeight: 700, color: "#059669" }}>
                  Mevcut Sahip: {detailView.name}
                </div>
              </div>
            )}

            <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <Icon name="service" size={15} /> Makina Geçmişi
                  <span style={{ fontSize: 11, background: "#fff", color: "#64748b", borderRadius: 10, padding: "2px 8px", fontWeight: 600 }}>{detailTimelineEvents.length} olay</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Btn small variant="ghost" onClick={openAddPayment}><Icon name="plus" size={12} /> Ödeme Ekle</Btn>
                  <Btn small variant="ghost" onClick={openAddService}><Icon name="plus" size={12} /> Yeni Servis Talebi</Btn>
                  <Btn small variant="ghost" onClick={openAddPartSale}><Icon name="parts" size={12} /> Extra Kalıp Satışı</Btn>
                  <Btn small variant="ghost" onClick={() => openPrintOrPick("makina")}><Icon name="print" size={12} /> Yazdır</Btn>
                  <Btn small variant="ghost" onClick={() => openPrintOrPick("mail_makina")}><Icon name="mail" size={12} /> E-posta Gönder</Btn>
                  <Btn small variant="ghost" onClick={() => setNewOwnerForm({ _machineId: detailView.id, name: "", satanFirma: detailView.name, adres: "", city: "", country: "Türkiye", saleDate: today(), aciklama: "" })}>
                    <Icon name="customers" size={12} /> Yeni Sahip
                  </Btn>
                </div>
              </div>
              {detailTimelineEvents.length === 0 ? (
                <div style={{ color: "#94a3b8", fontSize: 13, padding: "8px 0" }}>Bu makinaya ait kayıt bulunmuyor.</div>
              ) : (
                detailTimelineEvents.map((ev, i) => {
                  const last = i === detailTimelineEvents.length - 1;
                  const sv = ev.sv;
                  const ps = ev.ps;
                  const psList = ev.psList;
                  const payment = ev.payment;
                  return (
                    <div key={i} style={{ display: "flex", gap: 14, position: "relative", paddingBottom: last ? 0 : 18 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{ width: 14, height: 14, borderRadius: "50%", background: ev.color, flexShrink: 0, marginTop: 3, border: "3px solid #fff", boxShadow: `0 0 0 2px ${ev.color}33` }} />
                        {!last && <div style={{ width: 2, flex: 1, background: "#e2e8f0", marginTop: 4 }} />}
                      </div>
                      <div style={{ flex: 1, paddingBottom: 4 }}>
                        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{ev.date ? fmtTR(ev.date) : "tarih yok"}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 1 }}>
                          {ev.kind === "service" && sv ? (
                            <>
                              <span onClick={() => openEditService(sv)} title="Düzenlemek için tıklayın"
                                style={{ fontWeight: 700, fontSize: 14, color: ev.color, cursor: "pointer", textDecoration: "underline", textDecorationColor: "#e2e8f0" }}>{ev.title}</span>
                              <button onClick={() => openPrintOrPick("servis", sv)} title="Servis Formu Yazdır"
                                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#64748b", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
                                <Icon name="print" size={11} /> Yazdır
                              </button>
                              <button onClick={() => openPrintOrPick("mail_servis", sv)} title="Servis Formu E-posta Gönder"
                                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#64748b", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
                                <Icon name="mail" size={11} /> E-posta
                              </button>
                              <button onClick={() => setConfirmDeleteServiceId(sv.id)} title="Servis kaydını sil"
                                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
                                <Icon name="trash" size={11} /> Sil
                              </button>
                            </>
                          ) : ev.kind === "part" && psList ? (
                            psList.length === 1 ? (
                              <>
                                <span onClick={() => openEditPartSale(psList[0])} title="Düzenlemek için tıklayın"
                                  style={{ fontWeight: 700, fontSize: 14, color: ev.color, cursor: "pointer", textDecoration: "underline", textDecorationColor: "#e2e8f0" }}>{ev.title}</span>
                                <button onClick={() => setConfirmDeletePartSaleId(psList[0].id)} title="Extra Kalıp kaydını sil"
                                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
                                  <Icon name="trash" size={11} /> Sil
                                </button>
                              </>
                            ) : (
                              <span style={{ fontWeight: 700, fontSize: 14, color: ev.color }}>
                                {ev.title} <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>({psList.length} kalıp)</span>
                              </span>
                            )
                          ) : ev.kind === "payment" && payment ? (
                            <>
                              <span onClick={() => openEditPayment(payment)} title="Düzenlemek için tıklayın"
                                style={{ fontWeight: 700, fontSize: 14, color: ev.color, cursor: "pointer", textDecoration: "underline", textDecorationColor: "#e2e8f0" }}>{ev.title}</span>
                              {payment.yontem === "Çek" && (
                                <button onClick={() => toggleCekTahsil(payment)}
                                  style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 8px", cursor: "pointer", border: "1px solid", borderColor: payment.tahsilEdildi ? "#bbf7d0" : "#fde68a", background: payment.tahsilEdildi ? "#f0fdf4" : "#fffbeb", color: payment.tahsilEdildi ? "#15803d" : "#92400e" }}>
                                  {payment.tahsilEdildi ? "Tahsil Edildi" : "Beklemede · işaretle: Tahsil Edildi"}
                                </button>
                              )}
                              <button onClick={() => setConfirmDeletePaymentId(payment.id)} title="Ödemeyi sil"
                                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
                                <Icon name="trash" size={11} /> Sil
                              </button>
                            </>
                          ) : (
                            <span style={{ fontWeight: 700, fontSize: 14, color: ev.color }}>{ev.title}</span>
                          )}
                          {ev.tip && <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "2px 8px", background: (SALE_TYPE_STYLE[ev.tip] || {}).bg || "#f1f5f9", color: (SALE_TYPE_STYLE[ev.tip] || {}).fg || "#475569" }}>{ev.tip}</span>}
                          {sv?.islemFirma && !isAltuntasServisi(sv, factoryName) && (
                            <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "2px 8px", background: "#fef3c7", color: "#92400e" }}>
                              Anlaşmalı Servis: {sv.islemFirma}
                            </span>
                          )}
                          {sv?.tech && <span style={{ fontSize: 12, color: "#64748b" }}>· {sv.tech}</span>}
                          {sv?.repairPlace && <span style={{ fontSize: 11, color: "#94a3b8" }}>· {sv.repairPlace}</span>}
                        </div>
                        {ev.desc && <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 1.5 }}>{ev.desc}</div>}
                        {psList && (
                          <div style={{ marginTop: 4 }}>
                            {psList.map(p => {
                              const kdv = p.ucretsizMi ? 0 : calcKDV(p.faturaTipi || normalizeSaleType(detailView.faturali), p.ucret, p.tarih, kdvRates);
                              return (
                                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: psList.length > 1 ? 3 : 5, flexWrap: "wrap" }}>
                                  {psList.length > 1 && (
                                    <>
                                      <span onClick={() => openEditPartSale(p)} title="Düzenlemek için tıklayın"
                                        style={{ fontSize: 13, fontWeight: 600, color: "#c2410c", cursor: "pointer", textDecoration: "underline", textDecorationColor: "#fed7aa" }}>
                                        {p.ad}{p.olcu ? ` (${p.olcu})` : ""}
                                      </span>
                                      <span style={{ fontSize: 11, color: "#94a3b8" }}>· {p.tarih ? fmtTR(p.tarih) : "tarih yok"}</span>
                                    </>
                                  )}
                                  <span style={{ fontSize: 12, color: "#64748b" }}>
                                    {psList.length === 1 ? `${p.ad}${p.olcu ? " (" + p.olcu + ")" : ""} · ` : ""}
                                    {p.ucretsizMi ? "garanti kapsamında (ücretsiz)" : fmtCur(p.ucret, p.currency) + (kdv > 0 ? ` · KDV dahil: ${fmtCur(p.ucret + kdv, p.currency)}` : "")}
                                  </span>
                                  <button onClick={() => togglePartSaleOdendi(p)}
                                    style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 8px", cursor: "pointer", border: "1px solid", borderColor: p.odendi === false ? "#fecaca" : "#bbf7d0", background: p.odendi === false ? "#fef2f2" : "#f0fdf4", color: p.odendi === false ? "#dc2626" : "#15803d" }}>
                                    {p.odendi === false ? "Ödenmedi · işaretle: Ödendi" : "Ödendi"}
                                  </button>
                                  {psList.length > 1 && (
                                    <button onClick={() => setConfirmDeletePartSaleId(p.id)} title="Bu kalıp kaydını sil"
                                      style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "2px 6px", cursor: "pointer" }}>
                                      <Icon name="trash" size={10} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            {psList.length > 1 && (() => {
                              const toplam = psList.reduce((s, p) => s + (p.ucretsizMi ? 0 : parseMoney(p.ucret)), 0);
                              const kdvToplam = psList.reduce((s, p) => s + (p.ucretsizMi ? 0 : calcKDV(p.faturaTipi || normalizeSaleType(detailView.faturali), p.ucret, p.tarih, kdvRates)), 0);
                              return (
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", marginTop: 5 }}>
                                  Toplam: {fmtCur(toplam, psList[0].currency)}{kdvToplam > 0 ? ` · KDV dahil: ${fmtCur(toplam + kdvToplam, psList[0].currency)}` : ""}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        {sv?.yapilanIsler && (
                          <div style={{ marginTop: 5 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .3 }}>Yapılan İşler / Parça Değişimleri</div>
                            <div style={{ fontSize: 13, color: "#475569", marginTop: 2, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{sv.yapilanIsler}</div>
                          </div>
                        )}
                        {sv?.degisenParcalar?.length > 0 && (
                          <div style={{ marginTop: 5 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .3 }}>Değişen Parçalar</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                              {sv.degisenParcalar.map((p, i) => {
                                const ad = parcaAdi(p);
                                const fiyat = typeof p === "object" ? parseMoney(p.fiyat) : 0;
                                return (
                                  <span key={i} style={{ fontSize: 11, fontWeight: 600, color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "2px 9px" }}>
                                    {ad}{fiyat > 0 ? ` · ${fmtCur(fiyat, sv.parcaCurrency)}` : ""}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {sv?.musteriTalimati && (
                          <div style={{ marginTop: 5 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .3 }}>Müşteri Talimatı</div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{sv.musteriTalimati}</div>
                          </div>
                        )}
                        {sv && (svUcretliMi(sv) || svParcaUcretliMi(sv)) && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
                            {(() => {
                              const servisVar = svUcretliMi(sv);
                              const parcaVar = svParcaUcretliMi(sv);
                              const sameCurrency = !servisVar || !parcaVar || sv.currency === (sv.parcaCurrency || sv.currency);
                              if (sameCurrency) {
                                const toplam = (servisVar ? parseMoney(sv.servisUcreti) : 0) + (parcaVar ? parseMoney(sv.parcaUcreti) : 0);
                                const kdv = calcKDV(sv.faturaTipi, toplam, sv.date, kdvRates);
                                const label = servisVar && parcaVar ? "Servis ve Yedek Parça Ücreti" : servisVar ? "Servis Ücreti" : "Yedek Parça Ücreti";
                                return (
                                  <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 700 }}>
                                    {label}: {fmtCur(toplam, sv.currency)}
                                    {kdv > 0 && <> · KDV dahil: {fmtCur(toplam + kdv, sv.currency)}</>}
                                  </span>
                                );
                              }
                              return (
                                <>
                                  {servisVar && <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 700 }}>Servis Ücreti: {fmtCur(sv.servisUcreti, sv.currency)}</span>}
                                  {parcaVar && <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 700 }}>Parça Ücreti: {fmtCur(sv.parcaUcreti, sv.parcaCurrency)}</span>}
                                </>
                              );
                            })()}
                            <button onClick={() => toggleServisOdendi(sv)}
                              style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 8px", cursor: "pointer", border: "1px solid", borderColor: sv.odendi === false ? "#fecaca" : "#bbf7d0", background: sv.odendi === false ? "#fef2f2" : "#f0fdf4", color: sv.odendi === false ? "#dc2626" : "#15803d" }}>
                              {sv.odendi === false ? "Ödenmedi · işaretle: Ödendi" : "Ödendi"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20, flexWrap: "wrap" }}>
          <Btn variant="ghost" onClick={onClose}>Kapat</Btn>
          {isCustomer && (
            <Btn variant="ghost" onClick={() => { onClose(); onOpenAddForFirm(detailView); }}>
              <Icon name="plus" size={14} /> Bu Firmaya Makina Ekle
            </Btn>
          )}
          <Btn onClick={() => { onClose(); onOpenEdit(detailView); }}><Icon name="edit" size={14} /> Düzenle</Btn>
        </div>
      </Modal>

      {newOwnerForm && (
        <Modal title="Yeni Sahip Ekle (2. El Devir)" onClose={() => setNewOwnerForm(null)}>
          <div style={{ fontSize: 13, color: "#64748b", background: "#fff7ed", padding: "10px 14px", borderRadius: 10, marginBottom: 16, lineHeight: 1.5 }}>
            Mevcut sahip <b>sahiplik geçmişine</b> taşınacak, makina kaydı yeni sahibin bilgileriyle güncellenecek.
            Servis geçmişi, makina bilgileri ve <b>orijinal satış bedeli</b> korunur.
          </div>
          {(detailKalanBorcToplam > 0 || detailEkBorcDigerPB.length > 0) && (
            <div style={{ fontSize: 13, color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", padding: "10px 14px", borderRadius: 10, marginBottom: 16, lineHeight: 1.5, fontWeight: 600 }}>
              Bu makinenin devredilmeden önce{detailKalanBorcToplam > 0 && <> <b>{fmtCur(detailKalanBorcToplam, detailView.currency)}</b></>} ödenmemiş bakiyesi var.
              {detailEkBorcDigerPB.length > 0 && <> Ayrıca farklı para biriminden: {detailEkBorcDigerPB.map(([cur, tutar]) => fmtCur(tutar, cur)).join(" + ")}.</>}
              {" "}Devam edersen bu borç yeni sahibin kaydına geçecek.
            </div>
          )}
          <Field label="Yeni Sahip (Satın Alan)">
            <Input value={newOwnerForm.name || ""} onChange={e => setNewOwnerForm(p => ({ ...p, name: e.target.value }))} placeholder="Firma / kişi adı" />
            <Warn>{!newOwnerForm.name?.trim() ? "Yeni sahip adı girilmedi" : ""}</Warn>
          </Field>
          <Field label="Satan Firma">
            <PickOrType
              value={newOwnerForm.satanFirma}
              onChange={v => setNewOwnerForm(p => ({ ...p, satanFirma: v }))}
              placeholder="Satıcı adı"
              options={[
                { value: detailView?.name, label: `${detailView?.name} (Mevcut Sahip)` },
                { value: factory?.name || "Altuntaş Makina", label: `${factory?.name || "Altuntaş Makina"} (Fabrika)` },
                ...(dealers || []).filter(d => d.bayiMi !== false).map(d => ({ value: d.name, label: d.name })),
              ]}
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Telefon">
              <Input value={newOwnerForm.phone || ""} onChange={e => setNewOwnerForm(p => ({ ...p, phone: e.target.value }))} placeholder="Telefon" />
              <Warn>{newOwnerForm.phone && !PHONE_RE.test(newOwnerForm.phone) ? "Geçersiz telefon formatı" : ""}</Warn>
            </Field>
            <Field label="Devir Tarihi"><Input type="date" value={newOwnerForm.saleDate || ""} onChange={e => setNewOwnerForm(p => ({ ...p, saleDate: e.target.value }))} /></Field>
          </div>
          <Field label="E-posta">
            <Input value={newOwnerForm.email || ""} onChange={e => setNewOwnerForm(p => ({ ...p, email: e.target.value }))} placeholder="ornek@firma.com" />
            <Warn>{newOwnerForm.email && !EMAIL_RE.test(newOwnerForm.email) ? "Geçersiz e-posta formatı" : ""}</Warn>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Yetkili 1 - Ad Soyad"><Input value={newOwnerForm.yetkili1Ad || ""} onChange={e => setNewOwnerForm(p => ({ ...p, yetkili1Ad: e.target.value }))} placeholder="Ad Soyad" /></Field>
            <Field label="Yetkili 1 - Telefon">
              <Input value={newOwnerForm.yetkili1Tel || ""} onChange={e => setNewOwnerForm(p => ({ ...p, yetkili1Tel: e.target.value }))} placeholder="0xxx xxx xx xx" />
              <Warn>{newOwnerForm.yetkili1Tel && !PHONE_RE.test(newOwnerForm.yetkili1Tel) ? "Geçersiz telefon formatı" : ""}</Warn>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Yetkili 2 - Ad Soyad"><Input value={newOwnerForm.yetkili2Ad || ""} onChange={e => setNewOwnerForm(p => ({ ...p, yetkili2Ad: e.target.value }))} placeholder="Ad Soyad" /></Field>
            <Field label="Yetkili 2 - Telefon">
              <Input value={newOwnerForm.yetkili2Tel || ""} onChange={e => setNewOwnerForm(p => ({ ...p, yetkili2Tel: e.target.value }))} placeholder="0xxx xxx xx xx" />
              <Warn>{newOwnerForm.yetkili2Tel && !PHONE_RE.test(newOwnerForm.yetkili2Tel) ? "Geçersiz telefon formatı" : ""}</Warn>
            </Field>
          </div>
          <Field label="Adres Satırı"><Input value={newOwnerForm.adres || ""} onChange={e => setNewOwnerForm(p => ({ ...p, adres: e.target.value }))} /></Field>
          <CountryCityFields country={newOwnerForm.country} city={newOwnerForm.city}
            onCountry={v => setNewOwnerForm(p => ({ ...p, country: v }))}
            onCity={v => setNewOwnerForm(p => ({ ...p, city: v }))}
            geoData={geoData} loadingGeo={loadingGeo} />
          <Field label="Açıklama / Not">
            <textarea value={newOwnerForm.aciklama || ""} onChange={e => setNewOwnerForm(p => ({ ...p, aciklama: e.target.value }))}
              placeholder="Devir ile ilgili not (isteğe bağlı)..."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 50, boxSizing: "border-box", fontFamily: "inherit" }} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setNewOwnerForm(null)}>İptal</Btn>
            <Btn onClick={saveNewOwner}><Icon name="check" size={14} /> Devri Tamamla</Btn>
          </div>
        </Modal>
      )}

      {editPrevOwnerForm && (
        <Modal title="Sahiplik Geçmişi Kaydını Düzelt" onClose={() => setEditPrevOwnerForm(null)}>
          <Field label="Sahip Adı">
            <Input value={editPrevOwnerForm.name || ""} onChange={e => setEditPrevOwnerForm(p => ({ ...p, name: e.target.value }))} placeholder="Firma / kişi adı" />
          </Field>
          <Field label="Satan Firma">
            <PickOrType
              value={editPrevOwnerForm.satisYapan}
              onChange={v => setEditPrevOwnerForm(p => ({ ...p, satisYapan: v }))}
              placeholder="Satıcı adı"
              options={[
                { value: factory?.name || "Altuntaş Makina", label: `${factory?.name || "Altuntaş Makina"} (Fabrika)` },
                ...(dealers || []).filter(d => d.bayiMi !== false).map(d => ({ value: d.name, label: d.name })),
              ]}
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Telefon">
              <Input value={editPrevOwnerForm.phone || ""} onChange={e => setEditPrevOwnerForm(p => ({ ...p, phone: e.target.value }))} placeholder="Telefon" />
              <Warn>{editPrevOwnerForm.phone && !PHONE_RE.test(editPrevOwnerForm.phone) ? "Geçersiz telefon formatı" : ""}</Warn>
            </Field>
            <Field label="Devir Tarihi"><Input type="date" value={editPrevOwnerForm.soldDate || ""} onChange={e => setEditPrevOwnerForm(p => ({ ...p, soldDate: e.target.value }))} /></Field>
          </div>
          <Field label="E-posta">
            <Input value={editPrevOwnerForm.email || ""} onChange={e => setEditPrevOwnerForm(p => ({ ...p, email: e.target.value }))} placeholder="ornek@firma.com" />
            <Warn>{editPrevOwnerForm.email && !EMAIL_RE.test(editPrevOwnerForm.email) ? "Geçersiz e-posta formatı" : ""}</Warn>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Yetkili 1 - Ad Soyad"><Input value={editPrevOwnerForm.yetkili1Ad || ""} onChange={e => setEditPrevOwnerForm(p => ({ ...p, yetkili1Ad: e.target.value }))} placeholder="Ad Soyad" /></Field>
            <Field label="Yetkili 1 - Telefon">
              <Input value={editPrevOwnerForm.yetkili1Tel || ""} onChange={e => setEditPrevOwnerForm(p => ({ ...p, yetkili1Tel: e.target.value }))} placeholder="0xxx xxx xx xx" />
              <Warn>{editPrevOwnerForm.yetkili1Tel && !PHONE_RE.test(editPrevOwnerForm.yetkili1Tel) ? "Geçersiz telefon formatı" : ""}</Warn>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Yetkili 2 - Ad Soyad"><Input value={editPrevOwnerForm.yetkili2Ad || ""} onChange={e => setEditPrevOwnerForm(p => ({ ...p, yetkili2Ad: e.target.value }))} placeholder="Ad Soyad" /></Field>
            <Field label="Yetkili 2 - Telefon">
              <Input value={editPrevOwnerForm.yetkili2Tel || ""} onChange={e => setEditPrevOwnerForm(p => ({ ...p, yetkili2Tel: e.target.value }))} placeholder="0xxx xxx xx xx" />
              <Warn>{editPrevOwnerForm.yetkili2Tel && !PHONE_RE.test(editPrevOwnerForm.yetkili2Tel) ? "Geçersiz telefon formatı" : ""}</Warn>
            </Field>
          </div>
          <Field label="Adres Satırı"><Input value={editPrevOwnerForm.adres || ""} onChange={e => setEditPrevOwnerForm(p => ({ ...p, adres: e.target.value }))} /></Field>
          <CountryCityFields country={editPrevOwnerForm.country} city={editPrevOwnerForm.city}
            onCountry={v => setEditPrevOwnerForm(p => ({ ...p, country: v }))}
            onCity={v => setEditPrevOwnerForm(p => ({ ...p, city: v }))}
            geoData={geoData} loadingGeo={loadingGeo} />
          <Field label="Açıklama / Not">
            <textarea value={editPrevOwnerForm.aciklama || ""} onChange={e => setEditPrevOwnerForm(p => ({ ...p, aciklama: e.target.value }))}
              placeholder="Bu sahiplik dönemiyle ilgili not (isteğe bağlı)..."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 50, boxSizing: "border-box", fontFamily: "inherit" }} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setEditPrevOwnerForm(null)}>İptal</Btn>
            <Btn onClick={saveEditPrevOwner}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}

      {confirmUndoOwnerId && (
        <ConfirmDialog
          message="Son devir geri alınacak: mevcut sahip, devirden önceki sahibin bilgileriyle değiştirilecek ve bu sahiplik geçmişi kaydı silinecek."
          onConfirm={() => undoLastOwnerTransfer(confirmUndoOwnerId)}
          onCancel={() => setConfirmUndoOwnerId(null)}
        />
      )}

      {printLangModal && (
        <Modal title="Dil Seçin" onClose={() => setPrintLangModal(null)} maxWidth={300}>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", padding: "8px 0 4px" }}>
            {["TR", "EN"].map(l => (
              <button key={l} onClick={() => {
                const { type, sv } = printLangModal;
                setPrintLangModal(null);
                if (type === "makina") printMachineReport(l);
                else if (type === "servis") printServiceForm(sv, l);
                else if (type === "mail_makina") openMailMachineReport(l);
                else if (type === "mail_servis") openMailServiceForm(sv, l);
              }} style={{
                width: 80, padding: "12px 0", border: "1px solid #e2e8f0", borderRadius: 10,
                fontSize: 18, fontWeight: 800, cursor: "pointer",
                background: "#f8fafc", color: "#0f172a",
              }}>{l}</button>
            ))}
          </div>
        </Modal>
      )}

      {mailDraft && (
        <Modal title="E-posta Gönder" onClose={() => setMailDraft(null)}>
          {!window.appMail ? (
            <div style={{ fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "10px 14px", borderRadius: 10, border: "1px dashed #e2e8f0" }}>
              Bu özellik yalnızca kurulu uygulamada çalışır.
            </div>
          ) : (
            <>
              <Field label="Kime">
                <Input value={mailDraft.to} onChange={e => setMailDraft(p => ({ ...p, to: e.target.value }))} placeholder="ornek@firma.com" />
                <Warn>{mailDraft.to && !EMAIL_RE.test(mailDraft.to) ? "Geçersiz e-posta formatı" : ""}</Warn>
              </Field>
              <Field label="Konu">
                <Input value={mailDraft.subject} onChange={e => setMailDraft(p => ({ ...p, subject: e.target.value }))} />
              </Field>
              <Field label="Mesaj">
                <textarea value={mailDraft.text} onChange={e => setMailDraft(p => ({ ...p, text: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 110, boxSizing: "border-box", fontFamily: "inherit" }} />
              </Field>
              <div style={{ fontSize: 11.5, color: "#94a3b8", marginBottom: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {mailDraft.pdfFileName} otomatik ek olarak gönderilecek.
                <button onClick={previewMailAttachment} type="button"
                  style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "2px 9px", cursor: "pointer" }}>
                  Eki Önizle
                </button>
              </div>
              {mailSendState.state === "error" && (
                <div style={{ fontSize: 13, fontWeight: 600, color: "#991b1b", marginTop: 12, marginBottom: 12 }}>Hata: {mailSendState.error}</div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                <Btn variant="ghost" onClick={() => setMailDraft(null)}>İptal</Btn>
                <Btn onClick={sendMailDraft} disabled={mailSendState.state === "sending"}>
                  <Icon name="mail" size={14} /> {mailSendState.state === "sending" ? "Gönderiliyor..." : "Gönder"}
                </Btn>
              </div>
            </>
          )}
        </Modal>
      )}

      {paymentForm && (
        <Modal title={paymentForm.id ? "Ödemeyi Düzenle" : "Kapora/Ödeme Ekle"} onClose={() => setPaymentForm(null)}>
          <Field label="Tarih">
            <Input type="date" value={paymentForm.tarih || ""} onChange={e => setPaymentForm(p => ({ ...p, tarih: e.target.value }))} />
          </Field>
          {paymentForm.id ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: paymentForm.yontem === "Çek" ? "1fr 1fr 1fr" : "1fr 1fr", gap: 12 }}>
                <Field label="Yöntem">
                  <Select value={paymentForm.yontem || "Nakit"} onChange={e => setPaymentForm(p => ({ ...p, yontem: e.target.value }))}>
                    {ODEME_YONTEMLERI.map(y => <option key={y}>{y}</option>)}
                  </Select>
                </Field>
                <Field label="Tutar">
                  <MoneyInput value={paymentForm.tutar} sym={CUR_SYM[paymentForm.currency || "TRY"]} onChange={v => setPaymentForm(p => ({ ...p, tutar: v }))} />
                  <Warn>{parseMoney(paymentForm.tutar) <= 0 ? "Tutar girilmedi" : ""}</Warn>
                </Field>
                {paymentForm.yontem === "Çek" && (
                  <Field label="Vade Tarihi">
                    <Input type="date" value={paymentForm.vadeTarihi || ""} onChange={e => setPaymentForm(p => ({ ...p, vadeTarihi: e.target.value }))} />
                  </Field>
                )}
              </div>
              {paymentForm.yontem === "Çek" && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: paymentForm.tahsilEdildi ? "#f0fdf4" : "#fffbeb", border: `1px solid ${paymentForm.tahsilEdildi ? "#bbf7d0" : "#fde68a"}`, borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
                  <input type="checkbox" checked={!!paymentForm.tahsilEdildi} onChange={e => setPaymentForm(p => ({ ...p, tahsilEdildi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#16a34a" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: paymentForm.tahsilEdildi ? "#15803d" : "#92400e" }}>
                    {paymentForm.tahsilEdildi ? "Çek tahsil edildi" : "Çek henüz tahsil edilmedi (Kalan Borç'tan düşülmez)"}
                  </span>
                </label>
              )}
            </>
          ) : (
            <Field label="Ödeme Satırları">
              <PaymentRowsEditor rows={paymentForm.satirlar} onChange={rows => setPaymentForm(p => ({ ...p, satirlar: rows }))} sym={CUR_SYM[paymentForm.currency || "TRY"]} />
            </Field>
          )}
          <Field label="Not (isteğe bağlı)">
            <Input value={paymentForm.not || ""} onChange={e => setPaymentForm(p => ({ ...p, not: e.target.value }))} placeholder="Örn. banka havalesi..." />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setPaymentForm(null)}>İptal</Btn>
            <Btn onClick={savePayment}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}

      {confirmDeletePaymentId && (
        <ConfirmDialog
          message="Bu Kapora/Ödeme kaydı Çöp Kutusu'na taşınacak ve Kalan Borç yeniden hesaplanacak. Ayarlar'dan 30 gün içinde geri alabilirsiniz."
          onConfirm={() => { deletePayment(confirmDeletePaymentId); setConfirmDeletePaymentId(null); }}
          onCancel={() => setConfirmDeletePaymentId(null)}
        />
      )}

      {confirmDeleteServiceId && (
        <ConfirmDialog
          message="Bu servis kaydı Çöp Kutusu'na taşınacak. Ayarlar'dan 30 gün içinde geri alabilirsiniz."
          onConfirm={() => { deleteService(confirmDeleteServiceId); setConfirmDeleteServiceId(null); }}
          onCancel={() => setConfirmDeleteServiceId(null)}
        />
      )}

      {confirmDeletePartSaleId && (
        <ConfirmDialog
          message="Bu Extra Kalıp kaydı Çöp Kutusu'na taşınacak. Ayarlar'dan 30 gün içinde geri alabilirsiniz."
          onConfirm={() => { deletePartSale(confirmDeletePartSaleId); setConfirmDeletePartSaleId(null); }}
          onCancel={() => setConfirmDeletePartSaleId(null)}
        />
      )}

      {svModal && (
        <ServiceForm
          title={svModal === "add" ? "Yeni Servis Talebi" : "Servis Talebini Düzenle"}
          form={svForm} setForm={setSvForm} customers={customers} parts={parts} dealers={dealers} factory={factory} kdvRates={kdvRates}
          onSave={saveService} onCancel={() => setSvModal(null)}
        />
      )}

      {pkForm && (
        <PartSaleForm
          title={pkForm.id ? "Kaydı Düzenle" : "Extra Kalıp Satışı / Çıkışı"}
          form={pkForm} setForm={setPkForm} customers={customers} kalipDefs={kalipDefs} kdvRates={kdvRates}
          onSave={savePartSale} onCancel={() => setPkForm(null)}
        />
      )}
    </>
  );
};
