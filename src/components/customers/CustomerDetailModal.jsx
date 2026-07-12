import { useState, useMemo, useEffect } from "react";
import { logAction, getAuditUsername, snapshotOnceki } from "../../lib/audit";
import { useMailSender, MailComposeModal } from "../MailCompose";
import { CUR_SYM, ODEME_YONTEMLERI } from "../../lib/constants";
import {
  today, fmtTR, trLower, uid, bumpId, normalizeSaleType, calcKDV, fmtCur, parseMoney,
  calcKalanBorc, stripAutoPrint,
  withDeleted, mergeAndUpdate, totalMiktar, resolveSatisYapan, fmtKalipCapi, dosyaBuKayitYerinde,
} from "../../lib/utils";
import {
  printServiceForm as printServiceFormTemplate,
  printMachineReport as printMachineReportTemplate,
  buildServiceFormHtml,
  buildMachineReportHtml,
  buildSandikEtiketiHtml,
  DEFAULT_SANDIK_TRANSLATIONS,
} from "../../lib/printTemplates";
import { Icon, Field, Input, Warn, EMAIL_RE, PHONE_RE, Select, MoneyInput, Btn, Modal, ConfirmDialog, CountryCityFields, PickOrType, PaymentRowsEditor, LockConflict, DraftRestoreBar } from "../ui";
import { CustomerFilesSection } from "./detail/CustomerFilesSection";
import { deriveCustomerDetail } from "./detail/deriveCustomerDetail";
import { ServiceForm } from "../ServiceForm";
import { PartSaleForm } from "../PartSaleForm";
import { useLock } from "../../hooks/useLock";
import { useFormDraft } from "../../hooks/useFormDraft";
import { renderMailTemplate } from "../../lib/mailTemplates";
import { PaymentSection } from "./detail/PaymentSection";
import { OwnershipSection } from "./detail/OwnershipSection";
import { MachineTimeline } from "./detail/MachineTimeline";

export const CustomerDetailModal = ({
  detailView,
  onClose,
  onSwitchMachine,
  onOpenEdit,
  onOpenAddForFirm,
  isCustomer,
  canDo = () => true,
  serverPermissions = null,
  customers, setCustomers,
  services, setServices,
  partSales, setPartSales,
  payments, setPayments,
  gorusmeler = [], setGorusmeler = null,
  dosyalar = [], setDosyalar = null, dosyaCevrimdisi = false,
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
  // Elektrik kesintisine karşı form taslakları (bkz. useFormDraft)
  const svDraftKey = svModal ? (svModal === "add" ? `servis:${detailView?.id}:new` : `servis:${svForm.id}`) : null;
  const svDraft = useFormDraft(svDraftKey, svModal ? svForm : null, setSvForm);
  const pkDraftKey = pkForm ? (pkForm.id ? `kalipsatis:${pkForm.id}` : `kalipsatis:${detailView?.id}:new`) : null;
  const pkDraft = useFormDraft(pkDraftKey, pkForm, setPkForm);
  const [paymentForm, setPaymentForm] = useState(null);
  const [newOwnerForm, setNewOwnerForm] = useState(null);
  const [editPrevOwnerForm, setEditPrevOwnerForm] = useState(null);
  const [confirmUndoOwnerId, setConfirmUndoOwnerId] = useState(null);
  const [confirmDeletePaymentId, setConfirmDeletePaymentId] = useState(null);
  const [confirmDeleteServiceId, setConfirmDeleteServiceId] = useState(null);
  const [confirmDeletePartSaleId, setConfirmDeletePartSaleId] = useState(null);
  const [printLangModal, setPrintLangModal] = useState(null);
  const [sandikModal, setSandikModal] = useState(null);
  const { mailDraft, setMailDraft, mailSendState, setMailSendState, sendMail } = useMailSender(serverPermissions);

  const { lockConflict: detailLock, forceAcquire: forceDetailLock } = useLock("customer", detailView?.id ?? null);

  const todayStr = today();
  const factoryName = factory?.name || "Altuntaş Makina";

  const {
    detailHistory, detailTimelineEvents, detailModelInfo, detailWarrantyOk,
    detailToplamOdeme, detailKalanBorc, detailCiro, detailEkBorcAyniPB, detailEkBorcDigerPB,
    detailKalanBorcToplam, detailBekleyenCek, detailEnYakinCekVade, detailBekleyenTaksit, detailTaksitGecikmisVar, detailEnYakinTaksitVade, detailCekVadesiGecmisVar, detailMainCur, detailKalipSatisAdedi,
    detailBorcFromPrevOwner, detailServisNet, detailServisKdv, detailExtraKalipNet, detailExtraKalipKdv,
  } = useMemo(
    () => deriveCustomerDetail({ detailView, services, partSales, payments, kdvRates, models, todayStr, factoryName }),
    [detailView, services, partSales, payments, kdvRates, models, todayStr, factoryName]
  );

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
    setSvForm({ customerId: detailView.id, type: "Periyodik Bakım", repairPlace: "Yerinde Onarım", yapilanIsler: "", musteriTalimati: "", fabrikaNotu: "", servisUcreti: "", date: today(), tech: "", islemFirma: factoryName, odendi: false, degisenParcalar: [], parcaUcreti: "", currency: "TRY", parcaGarantiDisi: false, faturaTipi: normalizeSaleType(detailView.faturali) });
    setSvModal("add");
  };
  const openEditService = sv => {
    const eski = (sv.degisenParcalar || []).some(p => typeof p === "string");
    const degisenParcalar = eski
      ? sv.degisenParcalar.map(ad => ({ ad, fiyat: sv.degisenParcalar.length ? parseMoney(sv.parcaUcreti) / sv.degisenParcalar.length : 0 }))
      : (sv.degisenParcalar || []);
    const cust = customers.find(c => c.id === sv.customerId);
    setSvForm({ parcaUcreti: "", parcaGarantiDisi: false, faturaTipi: normalizeSaleType(cust?.faturali), ...sv, degisenParcalar });
    setSvModal({ edit: sv });
  };
  // Servis formunda eklenen dosya taslaklarını (fiziksel dosya zaten yüklendi) servise bağla.
  const bindServisDosyalari = (servisId, taslaklar) => {
    if (!setDosyalar || !servisId || !taslaklar?.length) return;
    bumpId(dosyalar);
    const yeni = taslaklar.map(f => ({ id: uid(), customerId: Number(svForm.customerId) || detailView?.id, refType: "servis", refId: servisId, ad: f.ad, dosyaAdi: f.dosyaAdi, boyut: f.boyut, tur: f.tur, tarih: today(), ekleyen: getAuditUsername() }));
    setDosyalar(p => [...yeni, ...p]);
    yeni.forEach(d => logAction({ serverPermissions, action: "olusturuldu", entity: "dosya", entityId: d.id, entityName: detailView?.name, detail: { ad: d.ad } }));
  };
  const saveService = (parcaUcretsizMi, dosyaTaslaklari = []) => {
    if (!setServices) return;
    const parcaUcreti = (svForm.degisenParcalar || []).reduce((s, p) => s + parseMoney(typeof p === "string" ? 0 : p.fiyat), 0);
    // Yalnızca Altuntaş'tan alınan parçaların toplamı — dış tedarik parçalar Altuntaş'a gelir/borç olarak yazılmaz
    const parcaUcretiAltuntastan = (svForm.degisenParcalar || []).filter(p => typeof p !== "string" && !p.disTedarik).reduce((s, p) => s + parseMoney(p.fiyat), 0);
    const rec = { ...svForm, customerId: svForm.customerId ? Number(svForm.customerId) : null, parcaUcretsizMi, parcaUcreti, parcaUcretiAltuntastan, parcaCurrency: svForm.currency };
    if (svModal === "add") {
      bumpId(customers, services);
      const newId = uid();
      setServices(p => p.some(s => s.id === newId) ? p : [{ ...rec, id: newId }, ...p]);
      deductServiceParts(rec.degisenParcalar, newId);
      bindServisDosyalari(newId, dosyaTaslaklari);
      logAction({ serverPermissions, action: "olusturuldu", entity: "servis", entityId: newId, entityName: detailView?.name, detail: { type: rec.type } });
      showToast(dosyaTaslaklari.length ? `Servis talebi kaydedildi (${dosyaTaslaklari.length} dosya eklendi).` : "Servis talebi kaydedildi.");
    } else {
      restoreServiceParts(svForm.id);
      setServices(p => p.map(s => s.id === svForm.id ? rec : s));
      deductServiceParts(rec.degisenParcalar, svForm.id);
      bindServisDosyalari(svForm.id, dosyaTaslaklari);
      logAction({ serverPermissions, action: "duzenlendi", entity: "servis", entityId: svForm.id, entityName: detailView?.name, detail: { onceki: snapshotOnceki(services.find(x => x.id === svForm.id)) } });
      showToast("Servis talebi düzenlendi.");
    }
    svDraft.clearDraft();
    setSvModal(null);
  };
  const svUcretliMi = (sv) => (sv.type === "Garanti Dışı" || sv.type === "Periyodik Bakım") && parseMoney(sv.servisUcreti) > 0;
  const svParcaUcretliMi = (sv) => !sv.parcaUcretsizMi && parseMoney(sv.parcaUcreti) > 0;
  const toggleServisOdendi = (sv) => {
    if (!setServices) return;
    const yeniDurum = !sv.odendi;
    setServices(p => p.map(s => s.id === sv.id ? { ...s, odendi: yeniDurum } : s));
    logAction({ serverPermissions, action: yeniDurum ? "servis_odendi" : "servis_odeme_iptal", entity: "servis", entityId: sv.id, entityName: detailView?.name });
  };
  const deleteService = (id) => {
    if (!setServices) return;
    restoreServiceParts(id);
    setServices(p => withDeleted(p, s => s.id === id));
    logAction({ serverPermissions, action: "silindi", entity: "servis", entityId: id, entityName: detailView?.name });
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
      const fields = { ...ortak, ad: k.ad, olcu: k.olcu || "", ucret: parseMoney(k.fiyat), uretimFormGonder: !!k.uretimFormGonder };
      setPartSales(p => p.map(x => x.id === pkForm.id ? { ...x, ...fields } : x));
      setCustomers(p => p.map(c => c.id === selectedCust.id
        ? { ...c, kaliplar: (c.kaliplar || []).map(b => b.partSaleId === pkForm.id ? { ...b, ad: k.ad, olcu: k.olcu || "" } : b) }
        : c));
      logAction({ serverPermissions, action: "duzenlendi", entity: "kalip_satisi", entityId: pkForm.id, entityName: selectedCust.name, detail: { ad: k.ad, onceki: snapshotOnceki(partSales.find(x => x.id === pkForm.id)) } });
      showToast("Kayıt güncellendi.");
    } else {
      const batchId = uid();
      const yeniKayitlar = satirlar.map(k => ({ id: uid(), batchId, ...ortak, ad: k.ad, olcu: k.olcu || "", ucret: parseMoney(k.fiyat), uretimFormGonder: !!k.uretimFormGonder }));
      setPartSales(p => [...p, ...yeniKayitlar]);
      setCustomers(p => p.map(c => c.id === selectedCust.id
        ? { ...c, kaliplar: [...(c.kaliplar || []), ...yeniKayitlar.map(r => ({ ad: r.ad, olcu: r.olcu, partSaleId: r.id }))], kalipSayisi: (c.kaliplar || []).length + yeniKayitlar.length }
        : c));
      logAction({ serverPermissions, action: "olusturuldu", entity: "kalip_satisi", entityId: yeniKayitlar[0]?.id, entityName: selectedCust.name, detail: { adet: yeniKayitlar.length } });
      showToast(yeniKayitlar.length > 1 ? `${yeniKayitlar.length} kalıp verildi (ücretli).` : "Kalıp verildi (ücretli).");
    }
    pkDraft.clearDraft();
    setPkForm(null);
  };
  const togglePartSaleOdendi = (ps) => {
    if (!setPartSales) return;
    const yeniDurum = !ps.odendi;
    setPartSales(p => p.map(x => x.id === ps.id ? { ...x, odendi: yeniDurum } : x));
    logAction({ serverPermissions, action: yeniDurum ? "kalip_odendi" : "kalip_odeme_iptal", entity: "kalip_satisi", entityId: ps.id, entityName: detailView?.name });
  };
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
    logAction({ serverPermissions, action: "silindi", entity: "kalip_satisi", entityId: id, entityName: detailView?.name });
    showToast("Extra Kalıp kaydı silindi.");
  };

  // ── Ödemeler ──
  // ── Görüşme kayıtları: telefon/ziyaret notları + takip tarihi ("aranacaklar") ──
  const [gorusmeForm, setGorusmeForm] = useState(null);
  const [gorusmelerAcik, setGorusmelerAcik] = useState(false); // akordeon: varsayılan kapalı
  const [confirmDeleteGorusmeId, setConfirmDeleteGorusmeId] = useState(null);
  const detailGorusmeler = useMemo(
    () => gorusmeler.filter(g => !g.deletedAt && g.customerId === detailView?.id).sort((a, b) => (b.tarih || "").localeCompare(a.tarih || "")),
    [gorusmeler, detailView?.id]
  );
  const saveGorusme = () => {
    if (!setGorusmeler || !gorusmeForm?.not?.trim()) { showToast("Görüşme notu boş olamaz.", "err"); return; }
    bumpId(gorusmeler, customers, services, partSales, payments);
    const rec = {
      id: uid(), customerId: detailView.id, tarih: gorusmeForm.tarih || today(),
      tur: gorusmeForm.tur || "Gelen Arama", not: gorusmeForm.not.trim(),
      takipTarihi: gorusmeForm.takipTarihi || "", tamamlandi: false, kullanici: getAuditUsername(),
    };
    setGorusmeler(p => [rec, ...p]);
    logAction({ serverPermissions, action: "olusturuldu", entity: "gorusme", entityId: rec.id, entityName: detailView?.name, detail: { tur: rec.tur } });
    showToast("Görüşme kaydedildi.");
    setGorusmeForm(null);
  };
  const toggleGorusmeTamam = (g) => {
    if (!setGorusmeler) return;
    setGorusmeler(p => p.map(x => x.id === g.id ? { ...x, tamamlandi: !x.tamamlandi } : x));
  };
  const deleteGorusme = (id) => {
    if (!setGorusmeler) return;
    setGorusmeler(p => withDeleted(p, x => x.id === id));
    logAction({ serverPermissions, action: "silindi", entity: "gorusme", entityId: id, entityName: detailView?.name });
    showToast("Görüşme silindi.");
  };

  // ── Dosya arşivi (makina bazlı) — render/işlem CustomerFilesSection'da. Burada yalnız
  // çizelgeyle paylaşılan filtre durumu ve dosya adedi (ataş rozetleri için) tutulur. ──
  const [dosyaFiltre, setDosyaFiltre] = useState(null);     // { refType, refId } — rozete tıklayınca o kayda filtrele
  const detailServices = useMemo(
    () => services.filter(s => !s.deletedAt && s.customerId === detailView?.id).sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [services, detailView?.id]
  );
  // Bu müşterinin servis kimlikleri — bayi tarafında bu servislere bağlanan dosyalar da burada görünsün.
  const detailServisIdKumesi = useMemo(() => new Set(detailServices.map(s => s.id)), [detailServices]);
  const detailDosyalar = useMemo(
    () => dosyalar.filter(d => dosyaBuKayitYerinde(d, "customerId", detailView?.id, detailServisIdKumesi))
      .sort((a, b) => (b.tarih || "").localeCompare(a.tarih || "")),
    [dosyalar, detailView?.id, detailServisIdKumesi]
  );
  const detailKalipSatislari = useMemo(
    () => (partSales || []).filter(p => !p.deletedAt && p.customerId === detailView?.id && p.tur === "Kalıp"),
    [partSales, detailView?.id]
  );
  const detailYedekParcalar = useMemo(
    () => (partSales || []).filter(p => !p.deletedAt && p.customerId === detailView?.id && p.tur !== "Kalıp"),
    [partSales, detailView?.id]
  );
  const detailOdemeler = useMemo(
    () => (payments || []).filter(p => !p.deletedAt && p.customerId === detailView?.id).sort((a, b) => (b.tarih || "").localeCompare(a.tarih || "")),
    [payments, detailView?.id]
  );
  const dosyaAdet = (refType, refId) => detailDosyalar.filter(d => d.refType === refType && d.refId === refId).length;
  // Zaman çizelgesi ataş rozetine tıklama → o kayda filtrele. CustomerFilesSection filtre değişince
  // kendini açıp görünüme kaydırır. dosyaFiltre burada tutulur çünkü çizelgeyle paylaşımlı.
  const openDosyalarFiltreli = (refType, refId) => setDosyaFiltre({ refType, refId });
  // Makina değişince dosya filtresi sıfırlanır (diğer makinanın kayıtlarına işaret etmesin);
  // bölümün bağ seçimi/akordeon durumu CustomerFilesSection'ın key=detailView.id remount'uyla sıfırlanır.
  useEffect(() => { setDosyaFiltre(null); }, [detailView?.id]);

  const openAddPayment = () => {
    setPaymentForm({ customerId: detailView.id, tarih: today(), satirlar: [], currency: detailView.currency || "TRY", not: "" });
  };
  // Taksit tahsilatı: ödeme formu taksit tutarıyla önceden doldurulur; kaydedilince
  // savePayment içinde taksit oluşan ödeme kaydına bağlanır (odemeId) ve kapanır
  const tahsilTaksit = (taksit) => {
    setPaymentForm({
      customerId: detailView.id, tarih: today(), currency: detailView.currency || "TRY",
      not: `Taksit tahsilatı (vade ${taksit.vadeTarihi ? fmtTR(taksit.vadeTarihi) : "-"})`,
      satirlar: [{ id: 1, tutar: String(taksit.tutar ?? ""), yontem: "Nakit" }],
      _taksitId: taksit.id,
    });
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
      logAction({ serverPermissions, action: "duzenlendi", entity: "odeme", entityId: paymentForm.id, entityName: detailView?.name, detail: { onceki: snapshotOnceki(payments.find(x => x.id === paymentForm.id)) } });
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
      // Taksit tahsilatıysa taksiti oluşan ödeme kaydına bağla (plan satırı kapanır)
      if (paymentForm._taksitId != null && yeniKayitlar[0]) {
        setCustomers(p => p.map(c => c.id === customerId
          ? { ...c, odemePlani: (c.odemePlani || []).map(r => r.id === paymentForm._taksitId ? { ...r, odemeId: yeniKayitlar[0].id } : r) }
          : c));
      }
      logAction({ serverPermissions, action: "olusturuldu", entity: "odeme", entityId: yeniKayitlar[0]?.id, entityName: detailView?.name, detail: { adet: yeniKayitlar.length } });
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
    // Ödeme bir taksite bağlıysa taksit tekrar "bekliyor" durumuna döner
    if (payment) setCustomers(p => p.map(c => c.id === payment.customerId
      ? { ...c, odemePlani: (c.odemePlani || []).map(r => r.odemeId === id ? { ...r, odemeId: null } : r) }
      : c));
    logAction({ serverPermissions, action: "silindi", entity: "odeme", entityId: id, entityName: detailView?.name });
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
    logAction({ serverPermissions, action: "yeni_sahip", entity: "musteri", entityId: newOwnerForm._machineId, entityName: newOwnerForm.name, detail: { eskiSahip: detailView?.name } });
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
  const openPrintOrPick = (type, sv) => {
    setPrintLangModal({ type, sv });
  };
  const kaseResmi = appSettings?.kaseResmi || "";

  const openSandikEtiket = () => setSandikModal({
    gonderen: { ad: factory?.evrakFirmaAdi || factory?.name || "", tel: factory?.phone || "", email: factory?.email || "", web: factory?.web || "", adres: factory?.adres || "", city: factory?.city || "", country: factory?.country || "" },
    alici: {
      firmaAdi: detailView.name || "",
      adres: detailView.adres || "",
      city: detailView.city || "",
      country: detailView.country || "",
      tel: detailView.phone || "",
      yetkili1Ad: detailView.yetkili1Ad || "",
      yetkili1Tel: detailView.yetkili1Tel || "",
      yetkili2Ad: detailView.yetkili2Ad || "",
      yetkili2Tel: detailView.yetkili2Tel || "",
      model: detailView.model || "",
      serialNo: detailView.serialNo || "",
      brutKg: detailView.brutKg || "",
    },
  });

  const printSandikEtiket = () => {
    const sandikT = appSettings?.translations?.sandik || {};
    // Brüt kg makina kaydına yazılır: bir sonraki etikette ve dışa aktarımda dolu gelir.
    const kg = parseMoney(sandikModal.alici.brutKg) || null;
    if ((detailView?.brutKg ?? null) !== kg) setCustomers(p => p.map(c => c.id === detailView.id ? { ...c, brutKg: kg } : c));
    const html = buildSandikEtiketiHtml(sandikModal.gonderen, { ...sandikModal.alici, brutKg: kg }, sandikT);
    if (window.appPrint) { window.appPrint.printHtml(html, null, "sandik-etiketi.pdf"); return; }
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const printServiceForm = (sv, lang = "TR") => printServiceFormTemplate(sv, customers, kdvRates, servisT(lang), kaseResmi, factory);
  const printMachineReport = (lang = "TR") => {
    if (!detailView) return;
    printMachineReportTemplate(detailView, detailHistory, partSales, makinaT(lang), kaseResmi, parts, factory);
  };
  const openMailMachineReport = (lang = "TR") => {
    if (!detailView) return;
    const html = stripAutoPrint(buildMachineReportHtml(detailView, detailHistory, partSales, makinaT(lang), kaseResmi, parts, factory));
    const sablon = renderMailTemplate(appSettings?.mailTemplates, lang === "EN" ? "makinaRaporuEN" : "makinaRaporu", {
      firma: detailView.name || "", firmaAdi: factory?.evrakFirmaAdi || factory?.name || "Altuntaş Makina",
    });
    setMailDraft({
      to: detailView.email || "",
      subject: sablon.konu,
      text: sablon.metin,
      pdfHtml: html,
      pdfFileName: `makina-raporu-${(detailView.serialNo || detailView.name || "kayit").replace(/\s+/g, "-")}.pdf`,
    });
    setMailSendState({ state: "idle", error: null });
  };
  const openMailServiceForm = (sv, lang = "TR") => {
    const cust = customers.find(c => c.id === sv.customerId);
    const html = stripAutoPrint(buildServiceFormHtml(sv, customers, kdvRates, { forEmail: true, translations: servisT(lang), kaseResmi, factory }));
    const sablon = renderMailTemplate(appSettings?.mailTemplates, lang === "EN" ? "servisFormuEN" : "servisFormu", {
      firma: cust?.name || "", firmaAdi: factory?.evrakFirmaAdi || factory?.name || "Altuntaş Makina",
    });
    setMailDraft({
      to: cust?.email || "",
      subject: sablon.konu,
      text: sablon.metin,
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
    const res = await sendMail({ to: mailDraft.to, subject: mailDraft.subject, text: mailDraft.text, pdfHtml: mailDraft.pdfHtml, pdfFileName: mailDraft.pdfFileName, type: "musteri" });
    if (res?.ok) showToast("E-posta gönderildi.");
  };

  // ── Render ──
  const firmMachines = isCustomer ? customers.filter(c => trLower(c.name) === trLower(detailView.name)) : [];
  const hasMultiple = firmMachines.length > 1;

  return (
    <>
      <Modal wide maxWidth={1080} title={detailView.name} onClose={onClose} footer={detailLock ? null : (<Btn variant="ghost" onClick={onClose}>Kapat</Btn>)}>
        {detailLock ? (
          <LockConflict lockedBy={detailLock.lockedBy} lockedAt={detailLock.lockedAt}
            onForce={forceDetailLock} onCancel={onClose} />
        ) : (
        <div style={{ display: "grid", gridTemplateColumns: hasMultiple ? "220px 1fr" : "1fr", gap: 20, alignItems: "start" }}>
          {hasMultiple && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--n600, #475569)", marginBottom: 10 }}>
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
                        border: "1px solid", borderColor: isCurrent ? "#e85d1a" : "var(--n200, #e2e8f0)", background: isCurrent ? "var(--ambBg3, #fff7ed)" : "var(--surface, #ffffff)" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--n900, #0f172a)" }}>
                        {m.model || "Model yok"} {isCurrent && <span style={{ fontSize: 10, color: "#e85d1a", fontWeight: 800 }}>· GÖRÜNTÜLENEN</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)", fontFamily: "monospace" }}>{m.serialNo || "Seri no yok"}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: ok ? "var(--emerald, #059669)" : "var(--red600, #dc2626)", marginTop: 3 }}>
                        {m.warrantyEnd ? `${fmtTR(m.warrantyEnd)} ${ok ? "✓" : "⚠"}` : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <PaymentSection
              detailView={detailView}
              detailCiro={detailCiro}
              detailToplamOdeme={detailToplamOdeme}
              detailKalanBorcToplam={detailKalanBorcToplam}
              detailKalanBorc={detailKalanBorc}
              detailEkBorcAyniPB={detailEkBorcAyniPB}
              detailEkBorcDigerPB={detailEkBorcDigerPB}
              detailBekleyenCek={detailBekleyenCek}
              detailCekVadesiGecmisVar={detailCekVadesiGecmisVar}
              detailEnYakinCekVade={detailEnYakinCekVade}
              detailBekleyenTaksit={detailBekleyenTaksit}
              detailTaksitGecikmisVar={detailTaksitGecikmisVar}
              detailEnYakinTaksitVade={detailEnYakinTaksitVade}
              detailMainCur={detailMainCur}
              detailBorcFromPrevOwner={detailBorcFromPrevOwner}
            />


            {/* Görüşme kayıtları: telefon/ziyaret notları; takip tarihi verilenler Dashboard "Aranacaklar"a düşer */}
            {isCustomer && setGorusmeler && (
              <div style={{ background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: gorusmelerAcik || gorusmeForm ? 8 : 0 }}>
                  <div onClick={() => setGorusmelerAcik(a => !a)}
                    style={{ fontSize: 12, fontWeight: 800, color: "var(--n600, #475569)", textTransform: "uppercase", letterSpacing: .5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, userSelect: "none" }}>
                    <span style={{ fontSize: 10 }}>{gorusmelerAcik || gorusmeForm ? "▾" : "▸"}</span>
                    Görüşmeler ({detailGorusmeler.length})
                    {detailGorusmeler.some(g => g.takipTarihi && !g.tamamlandi && g.takipTarihi <= todayStr) && (
                      <span style={{ fontSize: 10, fontWeight: 800, background: "var(--redBg2, #fee2e2)", color: "var(--red700, #b91c1c)", borderRadius: 6, padding: "2px 8px", textTransform: "none", letterSpacing: 0 }}>takip bekliyor</span>
                    )}
                  </div>
                  {canDo("cust_gorusme_add") && !gorusmeForm && (
                    <Btn small variant="ghost" onClick={() => { setGorusmelerAcik(true); setGorusmeForm({ tarih: today(), tur: "Gelen Arama", not: "", takipTarihi: "" }); }}>
                      <Icon name="plus" size={12} /> Yeni Görüşme
                    </Btn>
                  )}
                </div>
                {(gorusmelerAcik || gorusmeForm) && <>
                {gorusmeForm && (
                  <div style={{ background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: 10, marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <Select value={gorusmeForm.tur} onChange={e => setGorusmeForm(p => ({ ...p, tur: e.target.value }))}>
                        {["Gelen Arama", "Giden Arama", "Ziyaret", "E-posta", "Diğer"].map(t => <option key={t} value={t}>{t}</option>)}
                      </Select>
                      <input type="date" value={gorusmeForm.tarih} onChange={e => setGorusmeForm(p => ({ ...p, tarih: e.target.value }))}
                        style={{ padding: "8px 10px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13, background: "var(--surface, #ffffff)" }} />
                    </div>
                    <Input value={gorusmeForm.not} onChange={e => setGorusmeForm(p => ({ ...p, not: e.target.value }))} placeholder="Görüşme notu (ne konuşuldu, ne bekleniyor)" />
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>Takip tarihi (opsiyonel):</span>
                      <input type="date" value={gorusmeForm.takipTarihi} onChange={e => setGorusmeForm(p => ({ ...p, takipTarihi: e.target.value }))}
                        style={{ padding: "6px 10px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13, background: "var(--surface, #ffffff)" }} />
                      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                        <Btn small variant="ghost" onClick={() => setGorusmeForm(null)}>Vazgeç</Btn>
                        <Btn small onClick={saveGorusme}>Kaydet</Btn>
                      </div>
                    </div>
                  </div>
                )}
                {detailGorusmeler.length === 0 && !gorusmeForm && (
                  <div style={{ fontSize: 12, color: "var(--n400, #94a3b8)" }}>Henüz görüşme kaydı yok.</div>
                )}
                {detailGorusmeler.map(g => {
                  const takipGecikti = g.takipTarihi && !g.tamamlandi && g.takipTarihi <= todayStr;
                  return (
                    <div key={g.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--n150, #f1f5f9)", fontSize: 13 }}>
                      <span style={{ fontSize: 11, color: "var(--n500, #64748b)", whiteSpace: "nowrap", paddingTop: 2 }}>{fmtTR(g.tarih)}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, background: "var(--n150, #f1f5f9)", color: "var(--n600, #475569)", borderRadius: 6, padding: "2px 6px", whiteSpace: "nowrap" }}>{g.tur}</span>
                      <div style={{ flex: 1 }}>
                        <div>{g.not}</div>
                        {g.takipTarihi && (
                          <div style={{ fontSize: 11, marginTop: 2, fontWeight: 600, color: g.tamamlandi ? "var(--grn600, #16a34a)" : takipGecikti ? "var(--red700, #b91c1c)" : "var(--amb800, #92400e)" }}>
                            {g.tamamlandi ? "✓ Takip tamamlandı" : `${takipGecikti ? "⚠ " : ""}Takip: ${fmtTR(g.takipTarihi)}`}
                          </div>
                        )}
                        {g.kullanici && <div style={{ fontSize: 10, color: "var(--n300, #cbd5e1)", marginTop: 2 }}>{g.kullanici}</div>}
                      </div>
                      {g.takipTarihi && canDo("cust_gorusme_add") && (
                        <Btn small variant="ghost" onClick={() => toggleGorusmeTamam(g)} title={g.tamamlandi ? "Takibi yeniden aç" : "Takibi tamamlandı işaretle"}>
                          {g.tamamlandi ? "↺" : "✓"}
                        </Btn>
                      )}
                      {canDo("cust_gorusme_del") && (
                        <Btn small variant="ghost" onClick={() => setConfirmDeleteGorusmeId(g.id)} title="Görüşmeyi sil"><Icon name="trash" size={11} /></Btn>
                      )}
                    </div>
                  );
                })}
                </>}
              </div>
            )}

            {/* Dosya arşivi (makina bazlı) — ayrı bileşen (DealerFilesSection deseni). Filtre üstte
                tutulur (çizelge ataş rozetiyle paylaşımlı); makina değişince key ile remount olup sıfırlanır. */}
            {isCustomer && setDosyalar && (
              <CustomerFilesSection
                key={detailView.id}
                detailView={detailView} dosyalar={dosyalar} setDosyalar={setDosyalar} detailDosyalar={detailDosyalar}
                detailServices={detailServices} detailKalipSatislari={detailKalipSatislari} detailYedekParcalar={detailYedekParcalar} detailOdemeler={detailOdemeler}
                services={services} partSales={partSales} payments={payments} customers={customers}
                dosyaFiltre={dosyaFiltre} setDosyaFiltre={setDosyaFiltre}
                canDo={canDo} dosyaCevrimdisi={dosyaCevrimdisi} showToast={showToast} serverPermissions={serverPermissions}
              />
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
                ["Makina Kalıp Çapı", fmtKalipCapi(detailView.kalipCapi)],
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
                  <div key={k} style={{ background: "var(--n100, #f8fafc)", borderRadius: 10, padding: "10px 14px", position: "relative" }}>
                    <div style={{ fontSize: 10, color: "var(--n400, #94a3b8)", fontWeight: 700, letterSpacing: .5, marginBottom: 3, textTransform: "uppercase" }}>{isBant ? "Bant" : k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--n900, #0f172a)" }}>{v}</div>
                    {sub && <div style={{ fontSize: 10.5, color: "var(--teal, #0d9488)", fontWeight: 700, marginTop: 3 }}>{sub}</div>}
                    {isBant && canDo("cust_detail_edit") && (
                      <button
                        onClick={() => setCustomers(p => p.map(c => c.id === detailView.id ? { ...c, bantlar: (c.bantlar || []).filter((_, i) => i !== bantIdx) } : c))}
                        title="Eski bant verisini kaldır"
                        style={{ position: "absolute", top: 6, right: 8, border: "none", background: "transparent", color: "var(--n400, #94a3b8)", cursor: "pointer", fontSize: 14, fontWeight: 700, lineHeight: 1, padding: 2 }}>×</button>
                    )}
                  </div>
                );
              })}
            </div>
            {Array.isArray(detailView.kaliplar) && detailView.kaliplar.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--n600, #475569)", marginBottom: 8 }}>KALIPLAR ({detailView.kaliplar.length})</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {detailView.kaliplar.map((k, i) => {
                    const extraSatistan = k.partSaleId != null || i >= detailView.kaliplar.length - detailKalipSatisAdedi;
                    return (
                      <span key={i} title={extraSatistan ? "Extra Kalıp Satışı'ndan" : ""}
                        style={{ fontSize: 12, fontWeight: 700, background: extraSatistan ? "var(--redBg2, #fee2e2)" : "var(--ambBg3, #fff7ed)", color: extraSatistan ? "var(--red800, #991b1b)" : "var(--orTx, #c2410c)", border: `1px solid ${extraSatistan ? "#fca5a5" : "var(--ambBr3, #fed7aa)"}`, borderRadius: 8, padding: "6px 12px" }}>
                        {[k.olcu, k.ad].filter(Boolean).join(" — ")}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--n600, #475569)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid var(--n200, #e2e8f0)" }}>
                İşlemler
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {canDo("cust_payment_add") && <Btn small variant="ghost" onClick={openAddPayment}><Icon name="plus" size={12} /> Ödeme Ekle</Btn>}
                  {canDo("cust_service_add") && <Btn small variant="ghost" onClick={openAddService}><Icon name="plus" size={12} /> Yeni Servis Talebi</Btn>}
                  {canDo("cust_kalip_add") && <Btn small variant="ghost" onClick={openAddPartSale}><Icon name="parts" size={12} /> Extra Kalıp Satışı</Btn>}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {canDo("cust_detail_new_owner") && (
                    <Btn small variant="ghost" onClick={() => setNewOwnerForm({ _machineId: detailView.id, name: "", satanFirma: detailView.name, adres: "", city: "", country: "Türkiye", saleDate: today(), aciklama: "" })}>
                      <Icon name="customers" size={12} /> Yeni Sahip
                    </Btn>
                  )}
                  {isCustomer && canDo("cust_detail_add_machine") && (
                    <Btn small variant="ghost" onClick={() => onOpenAddForFirm(detailView)}>
                      <Icon name="plus" size={12} /> Bu Firmaya Makina Ekle
                    </Btn>
                  )}
                  {canDo("cust_detail_print") && <Btn small variant="ghost" onClick={openSandikEtiket}><Icon name="print" size={12} /> Sandık Etiketi</Btn>}
                  {canDo("cust_detail_edit") && <Btn small onClick={() => onOpenEdit(detailView)}><Icon name="edit" size={12} /> Düzenle</Btn>}
                </div>
              </div>
            </div>

            <OwnershipSection
              detailView={detailView}
              factory={factory}
              canDo={canDo}
              onEditPrevOwner={openEditPrevOwner}
              onRequestUndoOwner={setConfirmUndoOwnerId}
            />

            <MachineTimeline
              detailView={detailView}
              detailTimelineEvents={detailTimelineEvents}
              factoryName={factoryName}
              kdvRates={kdvRates}
              canDo={canDo}
              onEditService={openEditService}
              onPrintOrPick={openPrintOrPick}
              onDeleteService={setConfirmDeleteServiceId}
              onEditPartSale={openEditPartSale}
              onDeletePartSale={setConfirmDeletePartSaleId}
              onEditPayment={openEditPayment}
              onToggleCekTahsil={toggleCekTahsil}
              onDeletePayment={setConfirmDeletePaymentId}
              onToggleServisOdendi={toggleServisOdendi}
              onTogglePartSaleOdendi={togglePartSaleOdendi}
              onTahsilTaksit={tahsilTaksit}
              dosyaAdet={setDosyalar ? dosyaAdet : null}
              onDosyaBadge={setDosyalar ? openDosyalarFiltreli : null}
            />
          </div>
        </div>
        )}

      </Modal>

      {newOwnerForm && (
        <Modal wide title="Yeni Sahip Ekle (2. El Devir)" onClose={() => setNewOwnerForm(null)}>
          <div style={{ fontSize: 13, color: "var(--n500, #64748b)", background: "var(--ambBg3, #fff7ed)", padding: "10px 14px", borderRadius: 10, marginBottom: 16, lineHeight: 1.5 }}>
            Mevcut sahip <b>sahiplik geçmişine</b> taşınacak, makina kaydı yeni sahibin bilgileriyle güncellenecek.
            Servis geçmişi, makina bilgileri ve <b>orijinal satış bedeli</b> korunur.
          </div>
          {(detailKalanBorcToplam > 0 || detailEkBorcDigerPB.length > 0) && (
            <div style={{ fontSize: 13, color: "var(--red800, #991b1b)", background: "var(--redBg, #fef2f2)", border: "1px solid var(--redBr, #fecaca)", padding: "10px 14px", borderRadius: 10, marginBottom: 16, lineHeight: 1.5, fontWeight: 600 }}>
              Bu makinenin devredilmeden önce{detailKalanBorcToplam > 0 && <> <b>{fmtCur(detailKalanBorcToplam, detailView.currency)}</b></>} ödenmemiş bakiyesi var.
              {detailEkBorcDigerPB.length > 0 && <> Ayrıca farklı para biriminden: {detailEkBorcDigerPB.map(([cur, tutar]) => fmtCur(tutar, cur)).join(" + ")}.</>}
              {" "}Devam edersen bu borç yeni sahibin kaydına geçecek.
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Telefon">
              <Input value={newOwnerForm.phone || ""} onChange={e => setNewOwnerForm(p => ({ ...p, phone: e.target.value }))} placeholder="Telefon" />
              <Warn>{newOwnerForm.phone && !PHONE_RE.test(newOwnerForm.phone) ? "Geçersiz telefon formatı" : ""}</Warn>
            </Field>
            <Field label="Devir Tarihi"><Input type="date" value={newOwnerForm.saleDate || ""} onChange={e => setNewOwnerForm(p => ({ ...p, saleDate: e.target.value }))} /></Field>
            <Field label="E-posta">
              <Input value={newOwnerForm.email || ""} onChange={e => setNewOwnerForm(p => ({ ...p, email: e.target.value }))} placeholder="ornek@firma.com" />
              <Warn>{newOwnerForm.email && !EMAIL_RE.test(newOwnerForm.email) ? "Geçersiz e-posta formatı" : ""}</Warn>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            <Field label="Yetkili 1 - Ad Soyad"><Input value={newOwnerForm.yetkili1Ad || ""} onChange={e => setNewOwnerForm(p => ({ ...p, yetkili1Ad: e.target.value }))} placeholder="Ad Soyad" /></Field>
            <Field label="Yetkili 1 - Telefon">
              <Input value={newOwnerForm.yetkili1Tel || ""} onChange={e => setNewOwnerForm(p => ({ ...p, yetkili1Tel: e.target.value }))} placeholder="0xxx xxx xx xx" />
              <Warn>{newOwnerForm.yetkili1Tel && !PHONE_RE.test(newOwnerForm.yetkili1Tel) ? "Geçersiz telefon formatı" : ""}</Warn>
            </Field>
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
              className="input" style={{ resize: "vertical", minHeight: 50 }} />
          </Field>
      <div className="form-footer-bar" style={{ marginTop: 12 }}>
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
              className="input" style={{ resize: "vertical", minHeight: 50 }} />
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
                width: 80, padding: "12px 0", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10,
                fontSize: 18, fontWeight: 800, cursor: "pointer",
                background: "var(--n100, #f8fafc)", color: "var(--n900, #0f172a)",
              }}>{l}</button>
            ))}
          </div>
        </Modal>
      )}

      {mailDraft && (
        <MailComposeModal draft={mailDraft} setDraft={setMailDraft} sendState={mailSendState} onSend={sendMailDraft}
          ekAlani={
            <div style={{ fontSize: 11.5, color: "var(--n400, #94a3b8)", marginBottom: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {mailDraft.pdfFileName} otomatik ek olarak gönderilecek.
              <button onClick={previewMailAttachment} type="button"
                style={{ fontSize: 11, fontWeight: 700, color: "var(--blu700, #1d4ed8)", background: "var(--bluBg, #eff6ff)", border: "1px solid var(--bluBr, #bfdbfe)", borderRadius: 6, padding: "2px 9px", cursor: "pointer" }}>
                Eki Önizle
              </button>
            </div>
          } />
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
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: paymentForm.tahsilEdildi ? "var(--grnBg, #f0fdf4)" : "var(--ambBg, #fffbeb)", border: `1px solid ${paymentForm.tahsilEdildi ? "var(--grnBr, #bbf7d0)" : "var(--ambBr, #fde68a)"}`, borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
                  <input type="checkbox" checked={!!paymentForm.tahsilEdildi} onChange={e => setPaymentForm(p => ({ ...p, tahsilEdildi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--grn600, #16a34a)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: paymentForm.tahsilEdildi ? "var(--grn700, #15803d)" : "var(--amb800, #92400e)" }}>
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

      {confirmDeleteGorusmeId != null && (
        <ConfirmDialog
          message="Bu görüşme kaydı Çöp Kutusu'na taşınacak. Ayarlar'dan 30 gün içinde geri alabilirsiniz."
          onConfirm={() => { deleteGorusme(confirmDeleteGorusmeId); setConfirmDeleteGorusmeId(null); }}
          onCancel={() => setConfirmDeleteGorusmeId(null)}
        />
      )}


      {svModal && (
        <ServiceForm
          title={svModal === "add" ? "Yeni Servis Talebi" : "Servis Talebini Düzenle"}
          form={svForm} setForm={setSvForm} customers={customers} parts={parts} dealers={dealers} factory={factory} kdvRates={kdvRates}
          onSave={saveService} onCancel={() => { svDraft.clearDraft(); setSvModal(null); }}
          dosyalar={dosyalar} dosyaEkleyebilir={!!setDosyalar && canDo("cust_dosya_add")} dosyaCevrimdisi={dosyaCevrimdisi} showToast={showToast}
          draftBar={<DraftRestoreBar draft={svDraft.draft} onRestore={svDraft.restoreDraft} onDiscard={svDraft.discardDraft} />}
        />
      )}

      {pkForm && (
        <PartSaleForm
          title={pkForm.id ? "Kaydı Düzenle" : "Extra Kalıp Satışı / Çıkışı"}
          form={pkForm} setForm={setPkForm} customers={customers} kalipDefs={kalipDefs} kdvRates={kdvRates}
          onSave={savePartSale} onCancel={() => { pkDraft.clearDraft(); setPkForm(null); }}
          draftBar={<DraftRestoreBar draft={pkDraft.draft} onRestore={pkDraft.restoreDraft} onDiscard={pkDraft.discardDraft} />}
        />
      )}

      {sandikModal && (
        <Modal title="Sandık Etiketi" wide onClose={() => setSandikModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--n600, #475569)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>Gönderen</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 8 }}>
                <Field label="Şirket Adı"><Input value={sandikModal.gonderen.ad} onChange={e => setSandikModal(p => ({ ...p, gonderen: { ...p.gonderen, ad: e.target.value } }))} /></Field>
                <Field label="Telefon"><Input value={sandikModal.gonderen.tel} onChange={e => setSandikModal(p => ({ ...p, gonderen: { ...p.gonderen, tel: e.target.value } }))} /></Field>
                <Field label="Adres"><Input value={sandikModal.gonderen.adres} onChange={e => setSandikModal(p => ({ ...p, gonderen: { ...p.gonderen, adres: e.target.value } }))} /></Field>
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--n200, #e2e8f0)", paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--n600, #475569)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>Alıcı</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <Field label="Firma Adı"><Input value={sandikModal.alici.firmaAdi} onChange={e => setSandikModal(p => ({ ...p, alici: { ...p.alici, firmaAdi: e.target.value } }))} /></Field>
                <Field label="Adres"><Input value={sandikModal.alici.adres} onChange={e => setSandikModal(p => ({ ...p, alici: { ...p.alici, adres: e.target.value } }))} /></Field>
                <Field label="Telefon"><Input value={sandikModal.alici.tel} onChange={e => setSandikModal(p => ({ ...p, alici: { ...p.alici, tel: e.target.value } }))} /></Field>
                <Field label="Ülke"><Input value={sandikModal.alici.country} onChange={e => setSandikModal(p => ({ ...p, alici: { ...p.alici, country: e.target.value } }))} /></Field>
                <Field label="Şehir"><Input value={sandikModal.alici.city} onChange={e => setSandikModal(p => ({ ...p, alici: { ...p.alici, city: e.target.value } }))} /></Field>
                <div />
                <Field label="Yetkili 1 - Ad Soyad"><Input value={sandikModal.alici.yetkili1Ad} onChange={e => setSandikModal(p => ({ ...p, alici: { ...p.alici, yetkili1Ad: e.target.value } }))} /></Field>
                <Field label="Yetkili 1 - Telefon"><Input value={sandikModal.alici.yetkili1Tel} onChange={e => setSandikModal(p => ({ ...p, alici: { ...p.alici, yetkili1Tel: e.target.value } }))} /></Field>
                <div />
                <Field label="Yetkili 2 - Ad Soyad"><Input value={sandikModal.alici.yetkili2Ad} onChange={e => setSandikModal(p => ({ ...p, alici: { ...p.alici, yetkili2Ad: e.target.value } }))} /></Field>
                <Field label="Yetkili 2 - Telefon"><Input value={sandikModal.alici.yetkili2Tel} onChange={e => setSandikModal(p => ({ ...p, alici: { ...p.alici, yetkili2Tel: e.target.value } }))} /></Field>
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--n200, #e2e8f0)", paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--n600, #475569)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>Makina</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <Field label="Model"><Input value={sandikModal.alici.model} onChange={e => setSandikModal(p => ({ ...p, alici: { ...p.alici, model: e.target.value } }))} /></Field>
                <Field label="Seri No"><Input value={sandikModal.alici.serialNo} onChange={e => setSandikModal(p => ({ ...p, alici: { ...p.alici, serialNo: e.target.value } }))} /></Field>
                <Field label="Brüt Ağırlık (kg)"><Input value={sandikModal.alici.brutKg} onChange={e => setSandikModal(p => ({ ...p, alici: { ...p.alici, brutKg: e.target.value } }))} /></Field>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => setSandikModal(null)}>İptal</Btn>
              <Btn onClick={printSandikEtiket}><Icon name="print" size={14} /> Yazdır</Btn>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
