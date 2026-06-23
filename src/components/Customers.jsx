import { useState, useEffect, useMemo } from "react";
import { ALTUNMAK_MODELS, CUR_SYM, SALE_TYPES, DEFAULT_KDV_RATE, ODEME_YONTEMLERI } from "../lib/constants";
import { today, fmtTR, trLower, uid, bumpId, fmt, fmtKalipCapi, kalipCount, normalizeSaleType, isFaturali, isYurtIci, calcKDV, fmtCur, parseMoney, customerHasAnyDebt, sumPayments, calcKalanBorc, parcaAdi, isServisUcretliMi, isParcaUcretliMi, isServisBorcluMu, isPartSaleBorcluMu, isPaymentReceived, sumBekleyenCek, isCekVadesiGecmis, stripAutoPrint } from "../lib/utils";
import { printServiceForm as printServiceFormTemplate, printMachineReport as printMachineReportTemplate, buildServiceFormHtml, buildMachineReportHtml } from "../lib/printTemplates";
import { useFilteredList } from "../hooks/useFilteredList";
import { Icon, Field, Input, Warn, EMAIL_RE, PHONE_RE, Select, MoneyInput, Btn, Modal, ConfirmDialog, Pagination, CountryCityFields, PickOrType, PaymentRowsEditor } from "./ui";
import { ServiceForm } from "./ServiceForm";
import { PartSaleForm } from "./PartSaleForm";

// Satış tipi rozet renkleri — Fatura sütunu ve zaman çizelgesindeki "tip" rozetinde kullanılır
const SALE_TYPE_STYLE = {
  "Faturalı Yurtiçi": { bg: "#d1fae5", fg: "#065f46" },
  "Faturalı Yurtdışı": { bg: "#dbeafe", fg: "#1d4ed8" },
  "Faturasız Yurtiçi": { bg: "#fef3c7", fg: "#92400e" },
  "Faturasız Yurtdışı": { bg: "#fde68a", fg: "#7c2d12" },
};

export const Customers = ({
  customers, setCustomers, services = [], setServices = null, dealers = null, models = ALTUNMAK_MODELS,
  factory = null, geoData = null, loadingGeo = false, stock = null, setStock = null,
  partSales = [], setPartSales = null, parts = [], payments = [], setPayments = null,
  title = "Müşteriler", addLabel = "Yeni Müşteri", entity = "Müşteri",
  searchPlaceholder = "Müşteri ara...", emptyLabel = "Müşteri bulunamadı.", delWord = "müşterisi",
  isCustomer = true, initialFilter = "all", initialDetailId = null, kalipDefs = [], showToast = () => {}, kdvRate = DEFAULT_KDV_RATE,
}) => {
  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const [listFilter, setListFilter] = useState(initialFilter || "all"); // all | warranty | warranty-active | debt | serial-pending
  useEffect(() => { setListFilter(initialFilter || "all"); }, [initialFilter]);
  const [groupByFirm, setGroupByFirm] = useState(false); // true → firmaya göre tek satır
  const [detailViewId, setDetailViewId] = useState(null); // tıklanan müşteri id'si (canlı kayıt için)
  // Dashboard'dan belirli bir müşterinin detayını açarak gelindiyse, sekme açılır açılmaz o detayı göster
  useEffect(() => { if (initialDetailId != null) setDetailViewId(initialDetailId); }, [initialDetailId]);
  const [newOwnerForm, setNewOwnerForm] = useState(null); // 2. el devir formu
  const [editPrevOwnerForm, setEditPrevOwnerForm] = useState(null); // Sahiplik Geçmişi'nde bir kaydı düzeltme formu
  const [confirmUndoOwnerId, setConfirmUndoOwnerId] = useState(null); // son devri geri almadan önce onay bekleyen makina id'si
  const [svModal, setSvModal] = useState(null); // null | "add" | { edit: sv } — servis talebi ekle/düzenle
  const [svForm, setSvForm] = useState({});
  const [pkForm, setPkForm] = useState(null); // null | Extra Kalıp satışı ekle/düzenle formu
  const [paymentForm, setPaymentForm] = useState(null); // null | Kapora/Ödeme ekle/düzenle formu
  const [confirmDeletePaymentId, setConfirmDeletePaymentId] = useState(null); // silmeden önce onay bekleyen ödeme id'si
  const [confirmDeleteServiceId, setConfirmDeleteServiceId] = useState(null); // silmeden önce onay bekleyen servis kaydı id'si
  const [confirmDeletePartSaleId, setConfirmDeletePartSaleId] = useState(null); // silmeden önce onay bekleyen Extra Kalıp kaydı id'si
  const isCustomerTab = isCustomer; // hibrit özellikler yalnızca müşteriler sekmesinde
  // detailView'ı id üzerinden canlı türet — devir/düzenleme sonrası anlık güncel kalsın
  const detailView = detailViewId != null ? customers.find(c => c.id === detailViewId) || null : null;
  const todayStr = today();

  // Müşteri detayı açıldığında services/partSales/payments üzerinde yapılan tüm taramalar
  // (zaman çizelgesi, Kalan Borç, ek borç, bekleyen çek) burada toplanıp memoize ediliyor —
  // detailView/services/partSales/payments değişmediği sürece her render'da tekrarlanmaz.
  // İç mantık değişmedi, sadece bir useMemo'ya taşındı.
  const {
    detailHistory, detailTimelineEvents, detailModelInfo, detailWarrantyOk,
    detailToplamOdeme, detailKalanBorc, detailCiro, detailEkBorcAyniPB, detailEkBorcDigerPB,
    detailKalanBorcToplam, detailBekleyenCek, detailCekVadesiGecmisVar, detailMainCur, detailKalipSatisAdedi,
    detailBorcFromPrevOwner,
  } = useMemo(() => {
    const detailHistory = detailView
      ? services.filter(s => s.customerId === detailView.id).sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      : [];
    // Birleşik zaman çizelgesi: satış + servisler + parça/kalıp + garanti bitişi (eskiden yeniye)
    const detailTimelineEvents = (() => {
      if (!detailView) return [];
      const ev = [];
      if (detailView.installDate) {
        ev.push({
          kind: "sale", date: detailView.installDate, color: "#16a34a",
          title: detailView.isResale ? "2. El Devir" : "Satış",
          tip: normalizeSaleType(detailView.faturali),
          desc: `${detailView.name}${detailView.fabrikaSatisBedeli ? " · " + fmtCur(detailView.fabrikaSatisBedeli, detailView.currency) : ""}${(detailView.kaliplar || []).length ? " · " + detailView.kaliplar.length + " kalıp" : ""}`,
        });
      }
      detailHistory.forEach(sv => {
        const tColor = { "İlk Çalıştırma": "#1d4ed8", "Garanti İçi": "#16a34a", "Garanti Dışı": "#dc2626", "Periyodik Bakım": "#c2410c" }[sv.type] || "#94a3b8";
        ev.push({ kind: "service", date: sv.date, color: tColor, title: sv.type, sv });
      });
      // Kalıp tipi satışlar aynı satışta (savePartSale'in tek çağrısında) birden çok kayıt olarak
      // oluşturulabiliyor — bunlar batchId ile bağlı, zaman çizelgesinde TEK olay olarak gösterilir.
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
    const detailKalanBorc = detailView ? calcKalanBorc(detailView, payments, kdvRate) : 0;
    const detailCiro = detailKalanBorc + detailToplamOdeme; // Toplam Bedel (Ciro) = Kalan Borç + alınan ödemeler

    // Ödenmemiş servis/parça ücreti ve Extra Kalıp satışı borcu — Kalan Borç kartına da yansısın diye
    // para birimine göre topluyoruz (servis/kalıp farklı para biriminde olabilir, makinanın asıl
    // para birimiyle (detailView.currency) eşleşmeyenler ayrı satırda gösterilir, yanlışlıkla toplanmaz).
    // KDV de dahil ediliyor (calcKDV doğrusal olduğu için her tutara kendi fatura tipine göre ayrı ayrı eklenebilir).
    const detailEkBorcByCur = {};
    if (detailView) {
      const ekle = (cur, tutar) => { if (tutar > 0) detailEkBorcByCur[cur] = (detailEkBorcByCur[cur] || 0) + tutar; };
      services.filter(s => s.customerId === detailView.id && isServisBorcluMu(s)).forEach(s => {
        if (isServisUcretliMi(s)) {
          const tutar = parseMoney(s.servisUcreti);
          ekle(s.currency || "TRY", tutar + calcKDV(s.faturaTipi, tutar, kdvRate));
        }
        if (isParcaUcretliMi(s)) {
          const tutar = parseMoney(s.parcaUcreti);
          ekle(s.parcaCurrency || s.currency || "TRY", tutar + calcKDV(s.faturaTipi, tutar, kdvRate));
        }
      });
      (partSales || []).filter(p => p.customerId === detailView.id && isPartSaleBorcluMu(p)).forEach(p => {
        const tutar = parseMoney(p.ucret);
        ekle(p.currency || "TRY", tutar + calcKDV(p.faturaTipi, tutar, kdvRate));
      });
    }
    const detailMainCur = detailView?.currency || "TRY";
    const detailEkBorcAyniPB = detailEkBorcByCur[detailMainCur] || 0; // makinayla aynı para biriminde, doğrudan toplanabilir
    const detailEkBorcDigerPB = Object.entries(detailEkBorcByCur).filter(([cur]) => cur !== detailMainCur); // farklı PB, ayrı gösterilir
    const detailKalanBorcToplam = detailKalanBorc + detailEkBorcAyniPB;
    // Tahsil edilmemiş çek(ler) — Kalan Borç'a henüz dahil olmayan, beklemedeki tutar
    const detailBekleyenCek = detailView ? sumBekleyenCek(detailView.id, payments) : 0;
    const detailBekleyenCekler = detailView ? payments.filter(p => p.customerId === detailView.id && p.yontem === "Çek" && !p.tahsilEdildi) : [];
    const detailCekVadesiGecmisVar = detailBekleyenCekler.some(isCekVadesiGecmis);
    // Extra Kalıp Satışı'ndan eklenen kalıplar her zaman listenin sonuna eklenir (savePartSale) —
    // o yüzden kaliplar dizisinin son N elemanı (N = bu müşteriye ait "Kalıp" tipi partSales adedi) extra satıştan gelmiş sayılır.
    const detailKalipSatisAdedi = detailView ? (partSales || []).filter(p => p.customerId === detailView.id && p.tur === "Kalıp").length : 0;

    // Borç önceki sahipten mi kalmış? Makina satış bedeli borcu (kalanBorc) her zaman ilk satıştan
    // (yani son devirden önce) kalır. Servis/parça/Extra Kalıp borcu ise ancak kaydın tarihi son devir
    // tarihinden önceyse önceki sahibe ait sayılır — devirden sonra açılan servis/Extra Kalıp borcu
    // mevcut (yeni) sahibin kendi borcudur, "önceki sahipten kalmış olabilir" uyarısını tetiklememeli.
    const detailLastTransferDate = detailView?.prevOwners?.length > 0 ? detailView.prevOwners[detailView.prevOwners.length - 1].soldDate : null;
    const detailBorcFromPrevOwner = !!(detailView && detailLastTransferDate && (
      detailKalanBorc > 0 ||
      services.some(s => s.customerId === detailView.id && isServisBorcluMu(s) && s.date && s.date < detailLastTransferDate) ||
      (partSales || []).some(p => p.customerId === detailView.id && isPartSaleBorcluMu(p) && p.tarih && p.tarih < detailLastTransferDate)
    ));

    return {
      detailHistory, detailTimelineEvents, detailModelInfo, detailWarrantyOk,
      detailToplamOdeme, detailKalanBorc, detailCiro, detailEkBorcAyniPB, detailEkBorcDigerPB,
      detailKalanBorcToplam, detailBekleyenCek, detailCekVadesiGecmisVar, detailMainCur, detailKalipSatisAdedi,
      detailBorcFromPrevOwner,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailView, services, partSales, payments, kdvRate, models, todayStr]);

  // Firma adına göre makina sayısı (aynı isimli kayıtlar = aynı firma) — sadece customers değişince hesaplanır
  const firmCount = useMemo(() => {
    const fc = {};
    customers.forEach(c => { const k = trLower(c.name); fc[k] = (fc[k] || 0) + 1; });
    return fc;
  }, [customers]);

  const { search, setSearch, page, setPage, filtered: searched, perPage: PER_PAGE } = useFilteredList(customers, {
    searchFields: ["name", "city", "satisYapan", "contact", "country", "serialNo"],
    filterFn: c => {
      if (listFilter === "warranty") return c.warrantyEnd && c.warrantyEnd < today();
      if (listFilter === "warranty-active") return c.warrantyEnd && c.warrantyEnd >= today();
      if (listFilter === "debt") return customerHasAnyDebt(c, services, partSales);
      if (listFilter === "serial-pending") return c.seriNoBekliyor && !c.serialNo;
      return true;
    },
  });
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
  // Sütun sıralaması — hiçbir sütun seçilmediyse varsayılan: tarihe göre, en yeni önce
  // (yeni eklenen müşteri her zaman listenin en üstünde görünsün, eski verinin dizideki
  // konumuna bağlı kalmadan).
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

  const [modelPicker, setModelPicker] = useState(false);
  const openAdd  = () => {
    const start = today();
    const end = `${parseInt(start.slice(0,4)) + 2}${start.slice(4)}`; // otomatik +2 yıl
    setForm({
      kalipSayisi: 0, satisYapan: "Altuntaş Makina", name: "", phone: "", email: "",
      yetkili1Ad: "", yetkili1Tel: "", yetkili2Ad: "", yetkili2Tel: "",
      adres: "", city: "", country: "Türkiye", model: "",
      kaliplar: [],
      installDate: start, warrantyEnd: end,
      faturali: "Faturalı Yurtiçi", faturaBedeli: "",
      fabrikaSatisBedeli: "", komisyon: "", _ilkOdemeSatirlari: [],
      serialNo: "",
    });
    setModal("add"); setModelPicker(false);
  };
  // Aynı firmaya yeni makina ekle: firma/iletişim bilgileri otomatik dolu gelir
  const openAddForFirm = (base) => {
    const start = today();
    const end = `${parseInt(start.slice(0,4)) + 2}${start.slice(4)}`;
    setForm({
      kalipSayisi: 0, satisYapan: base.satisYapan || (factory?.name || "Altuntaş Makina"),
      name: base.name || "", phone: base.phone || "", email: base.email || "",
      yetkili1Ad: base.yetkili1Ad || "", yetkili1Tel: base.yetkili1Tel || "",
      yetkili2Ad: base.yetkili2Ad || "", yetkili2Tel: base.yetkili2Tel || "",
      adres: base.adres || "", city: base.city || "", country: base.country || "Türkiye",
      model: "", kaliplar: [],
      installDate: start, warrantyEnd: end,
      faturali: "Faturalı Yurtiçi", faturaBedeli: "",
      fabrikaSatisBedeli: "", komisyon: "", _ilkOdemeSatirlari: [], kalanBorc: "", serialNo: "", aciklama: "",
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
      const { _manualSerial, _stokSerisiz, _ilkOdemeSatirlari, ...clean } = form;
      bumpId(customers, services, partSales, payments);
      const newId = uid();
      // Seri no boşsa "bekliyor" işaretle (stoktan seri no'suz seçilse de, hiç girilmese de)
      if (!clean.serialNo) clean.seriNoBekliyor = true;
      // İlk Ödeme satırları (Nakit/Kredi Kartı/Çek) — tutarı sıfırdan büyük her satır kendi payments
      // kaydını oluşturur; Kalan Borç'tan sadece "alınmış" sayılanlar (Çek hariç) düşülür.
      const ilkOdemeSatirlari = (_ilkOdemeSatirlari || []).filter(r => parseMoney(r.tutar) > 0);
      const ilkOdemeAlinanTutar = ilkOdemeSatirlari.filter(isPaymentReceived).reduce((s, r) => s + parseMoney(r.tutar), 0);
      clean.kalanBorc = calcKalanBorc({ ...clean, id: newId }, payments, kdvRate) - ilkOdemeAlinanTutar;
      setCustomers(p => p.some(c => c.id === newId) ? p : [{ ...clean, id: newId }, ...p]);
      if (ilkOdemeSatirlari.length > 0 && setPayments) {
        const yeniOdemeler = ilkOdemeSatirlari.map(r => ({
          id: uid(), customerId: newId, tarih: clean.installDate || today(), tutar: parseMoney(r.tutar),
          currency: clean.currency || "TRY", not: "İlk ödeme (satış anında)", yontem: r.yontem || "Nakit",
          ...(r.yontem === "Çek" ? { vadeTarihi: r.vadeTarihi || "", tahsilEdildi: false } : {}),
        }));
        setPayments(p => [...yeniOdemeler, ...p]);
      }
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
      const { _manualSerial, _stokSerisiz, _ilkOdemeSatirlari, ...clean } = form;
      // Düzenlemede seri no girildiyse "bekliyor" işaretini kaldır
      if (clean.serialNo && clean.seriNoBekliyor) clean.seriNoBekliyor = false;
      clean.kalanBorc = calcKalanBorc(clean, payments, kdvRate);
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
    // Silinen müşterinin Extra Kalıp satışı kayıtları da silinsin — yoksa customerId'si artık var olmayan
    // bir müşteriye işaret eden "öksüz" kayıtlar olarak partSales'te kalıp Dashboard'daki Borçlu Firmalar'da sonsuza dek görünür
    if (setPartSales) setPartSales(p => p.filter(x => x.customerId !== confirmId));
    // Silinen müşterinin ödeme (Kapora/Ödeme) kayıtları da silinsin
    if (setPayments) setPayments(p => p.filter(x => x.customerId !== confirmId));
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

  // Müşteri detayından servis talebi ekleme/düzenleme — Services.jsx'teki ile aynı ServiceForm'u kullanır
  const openAddService = () => {
    setSvForm({ customerId: detailView.id, type: "Periyodik Bakım", repairPlace: "Yerinde Onarım", yapilanIsler: "", musteriTalimati: "", servisUcreti: "", date: today(), tech: "", odendi: false, degisenParcalar: [], parcaUcreti: "", currency: "TRY", parcaGarantiDisi: false, faturaTipi: normalizeSaleType(detailView.faturali) });
    setSvModal("add");
  };
  const openEditService = sv => {
    // Eski kayıtlarda değişen parçalar düz string'ti (tek lump Parça Ücreti'ne sahip) — şimdi her
    // parçanın kendi fiyatı var. Eski bir kaydı açarken lump tutarı parçalara eşit bölüp {ad,fiyat}'a çeviriyoruz.
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
      showToast("Servis talebi kaydedildi.");
    } else {
      setServices(p => p.map(s => s.id === svForm.id ? rec : s));
      showToast("Servis talebi düzenlendi.");
    }
    setSvModal(null);
  };
  const svUcretliMi = (sv) => (sv.type === "Garanti Dışı" || sv.type === "Periyodik Bakım") && parseMoney(sv.servisUcreti) > 0;
  const svParcaUcretliMi = (sv) => !sv.parcaUcretsizMi && parseMoney(sv.parcaUcreti) > 0;
  const toggleServisOdendi = (sv) => setServices && setServices(p => p.map(s => s.id === sv.id ? { ...s, odendi: !s.odendi } : s));
  const deleteService = (id) => {
    if (!setServices) return;
    setServices(p => p.filter(s => s.id !== id));
    showToast("Servis kaydı silindi.");
  };

  // Müşteri detayından Extra Kalıp satışı ekleme/düzenleme — Parts.jsx ile aynı PartSaleForm'u kullanır
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
      // KALIPLAR rozetlerindeki denormalize kopyayı da güncelle — yoksa eski ad/ölçü orada kalır
      setCustomers(p => p.map(c => c.id === selectedCust.id
        ? { ...c, kaliplar: (c.kaliplar || []).map(b => b.partSaleId === pkForm.id ? { ...b, ad: k.ad, olcu: k.olcu || "" } : b) }
        : c));
      showToast("Kayıt güncellendi.");
    } else {
      const batchId = uid();
      const yeniKayitlar = satirlar.map(k => ({ id: uid(), batchId, ...ortak, ad: k.ad, olcu: k.olcu || "", ucret: parseMoney(k.fiyat) }));
      setPartSales(p => [...p, ...yeniKayitlar]);
      // partSaleId ile bağlanır — silme/düzenlemede bu denormalize kopyayı bulup senkronlamak için
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
    setPartSales(p => p.filter(x => x.id !== id));
    // Kalıp tipi satışsa KALIPLAR rozetlerindeki denormalize kopyasını da kaldır — yoksa silinen kayıt orada kalmaya devam eder
    if (ps?.tur === "Kalıp") {
      setCustomers(p => p.map(c => {
        if (c.id !== ps.customerId) return c;
        const kaliplar = (c.kaliplar || []).filter(k => k.partSaleId !== id);
        return { ...c, kaliplar, kalipSayisi: kaliplar.length };
      }));
    }
    showToast("Extra Kalıp kaydı silindi.");
  };

  // Müşteri detayından Kapora/Ödeme ekleme/düzenleme — tarihli ödeme geçmişi, Kalan Borç bundan türetilir.
  // Ekleme modu çoklu satır (PaymentRowsEditor — Yöntem+Tutar+Vade), her satır kendi payments kaydını
  // oluşturur (savePartSale'deki batchId'siz, çoklu-kayıt deseniyle aynı). Düzenleme modu tek satır.
  const openAddPayment = () => {
    setPaymentForm({ customerId: detailView.id, tarih: today(), satirlar: [], currency: detailView.currency || "TRY", not: "" });
  };
  const openEditPayment = (p) => {
    setPaymentForm({
      id: p.id, customerId: p.customerId, tarih: p.tarih || today(), tutar: p.tutar || "", currency: p.currency || "TRY", not: p.not || "",
      yontem: p.yontem || "Nakit", vadeTarihi: p.vadeTarihi || "", tahsilEdildi: !!p.tahsilEdildi,
    });
  };
  // payments değiştiğinde customer.kalanBorc (stored alan) da güncellenmeli — yoksa liste/Borçlu
  // Firmalar gibi customer.kalanBorc'u doğrudan okuyan yerler eski/yanlış değeri göstermeye devam eder.
  const syncKalanBorc = (customerId, newPayments) => {
    setCustomers(p => p.map(c => c.id === customerId ? { ...c, kalanBorc: calcKalanBorc(c, newPayments, kdvRate) } : c));
  };
  const savePayment = () => {
    if (!setPayments || !paymentForm) return;
    const customerId = Number(paymentForm.customerId);
    let newPayments;
    if (paymentForm.id) {
      // Düzenleme: tek satır
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
      // Ekleme: çoklu satır, her satır kendi kaydını oluşturur
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
    setPayments(newPayments);
    if (payment) syncKalanBorc(payment.customerId, newPayments);
    showToast("Ödeme silindi.");
  };
  // Çek tahsil edildi/beklemede — servis/parça/Extra Kalıp'taki Ödendi toggle'larıyla aynı desen,
  // ama ayrıca syncKalanBorc gerektiriyor (çünkü çek, calcKalanBorc'un içindeki sumPayments'a dahil)
  const toggleCekTahsil = (payment) => {
    if (!setPayments) return;
    const newPayments = payments.map(x => x.id === payment.id ? { ...x, tahsilEdildi: !x.tahsilEdildi } : x);
    setPayments(newPayments);
    syncKalanBorc(payment.customerId, newPayments);
  };

  // 2. el devir: mevcut sahibi sahiplik geçmişine taşı, makina kaydını yeni sahibe güncelle
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
        ...c,
        prevOwners: [...(c.prevOwners || []), prev],
        name: newOwnerForm.name,
        phone: newOwnerForm.phone || "",
        email: newOwnerForm.email || "",
        yetkili1Ad: newOwnerForm.yetkili1Ad || "", yetkili1Tel: newOwnerForm.yetkili1Tel || "",
        yetkili2Ad: newOwnerForm.yetkili2Ad || "", yetkili2Tel: newOwnerForm.yetkili2Tel || "",
        adres: newOwnerForm.adres || "",
        city: newOwnerForm.city || "",
        country: newOwnerForm.country || "",
        aciklama: newOwnerForm.aciklama || "",
        isResale: true,            // 2. el devir işareti (zaman çizelgesinde "2. El Devir" etiketi için — finans buna bakmıyor, orijinal satış bedeli/adedi sayılmaya devam eder)
        satisYapan: newOwnerForm.satanFirma?.trim() || "2. El Devir",
      };
    }));
    showToast("Devir tamamlandı. Yeni sahip kaydedildi.");
    setNewOwnerForm(null);
  };

  // Sahiplik Geçmişi'ndeki bir kaydı düzeltme — sadece o tarihsel satırı günceller, mevcut sahibe dokunmaz
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

  // Son devri geri al: zincirin sadece en son halkası için anlamlı — mevcut sahibi o kayıttaki bilgilerle geri yazar
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

  // Yazdırma: tek bir servis kaydının "Servis Formu"nu üret — şablon src/lib/printTemplates.js'te
  const printServiceForm = (sv) => printServiceFormTemplate(sv, customers, kdvRate);

  // Yazdırma: Makina Servis ve Yedek Parça Geçmişi Raporu — şablon src/lib/printTemplates.js'te
  const printMachineReport = () => {
    if (!detailView) return;
    printMachineReportTemplate(detailView, detailHistory, partSales);
  };

  // E-posta: aynı HTML şablonları PDF eki olarak gönderilir (window.appMail.send → main process'te printToPDF + SMTP)
  const [mailDraft, setMailDraft] = useState(null); // null | { to, subject, text, pdfHtml, pdfFileName }
  const [mailSendState, setMailSendState] = useState({ state: "idle", error: null }); // idle | sending | ok | error
  const openMailMachineReport = () => {
    if (!detailView) return;
    const html = stripAutoPrint(buildMachineReportHtml(detailView, detailHistory, partSales));
    setMailDraft({
      to: detailView.email || "",
      subject: `Makina Servis ve Yedek Parça Geçmişi Raporu — ${detailView.name}`,
      text: `Sayın ${detailView.name},\n\nMakinanıza ait servis ve yedek parça geçmişi raporu ekte yer almaktadır.\n\nİyi günler dileriz.\nAltuntaş Makina`,
      pdfHtml: html,
      pdfFileName: `makina-raporu-${(detailView.serialNo || detailView.name || "kayit").replace(/\s+/g, "-")}.pdf`,
    });
    setMailSendState({ state: "idle", error: null });
  };
  const openMailServiceForm = (sv) => {
    const cust = customers.find(c => c.id === sv.customerId);
    const html = stripAutoPrint(buildServiceFormHtml(sv, customers, kdvRate));
    setMailDraft({
      to: cust?.email || "",
      subject: `Servis Formu — ${cust?.name || ""}`,
      text: `Sayın ${cust?.name || ""},\n\nServis formunuz ekte yer almaktadır.\n\nİyi günler dileriz.\nAltuntaş Makina`,
      pdfHtml: html,
      pdfFileName: `servis-formu-${(cust?.serialNo || cust?.name || "kayit").replace(/\s+/g, "-")}.pdf`,
    });
    setMailSendState({ state: "idle", error: null });
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
          ...(isCustomerTab ? [{ v: "debt", l: "₺ Borçlu Firmalar", count: customers.filter(c => customerHasAnyDebt(c, services, partSales)).length }] : []),
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
              const hasDebt = isCustomerTab && customerHasAnyDebt(c, services, partSales);
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9", background: hasDebt ? "#fefce8" : undefined }}
                  title={hasDebt ? (hasKalanBorc ? `Kalan borç: ${fmt(parseMoney(c.kalanBorc))}` : "Servis, parça veya Extra Kalıp borcu var — detayı görmek için tıklayın") : undefined}>
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
                          {tip}{c.faturaBedeli ? ` · ${fmtCur(c.faturaBedeli, c.currency)}` : ""}
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

      {/* Detay görüntüleme */}
      {detailView && (() => {
        const firmMachines = isCustomerTab ? customers.filter(c => trLower(c.name) === trLower(detailView.name)) : [];
        const hasMultiple = firmMachines.length > 1;
        return (
          <Modal wide maxWidth={1080} title={detailView.name} onClose={() => setDetailViewId(null)}>
            <div style={{ display: "grid", gridTemplateColumns: hasMultiple ? "220px 1fr" : "1fr", gap: 20, alignItems: "start" }}>
              {/* Sol kutu: Bu Firmanın Makinaları (sadece 1'den fazla makinası varsa) */}
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
                          onClick={() => setDetailViewId(m.id)}
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

              {/* Sağ kutu: bilgiler + sahiplik geçmişi + zaman çizelgesi */}
              <div>
                {/* Finans özet kartı — Toplam Bedel / Kapora-Ödeme / Kalan Borç tek bakışta öne çıkar.
                    Kalan Borç, makina satışının kalan bedelini + ödenmemiş servis/parça/Extra Kalıp
                    ücretlerini (aynı para biriminden olanları) birlikte gösterir.
                    2. el devirlerde (isResale) fabrikaSatisBedeli sıfırlandığı için detailCiro de 0 olur;
                    ama o makinaya sonradan ödenmemiş bir servis/Extra Kalıp eklenmişse kart yine gösterilir. */}
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
                      ⚠ Ayrıca farklı para biriminden ödenmemiş servis/parça/Extra Kalıp borcu var (yukarıdaki toplama dahil edilmedi):{" "}
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
                        ? <>⚠ Vadesi geçti! {fmtCur(detailBekleyenCek, detailMainCur)} çek hâlâ tahsil edilmedi.</>
                        : <>⏳ {fmtCur(detailBekleyenCek, detailMainCur)} tahsil edilecek çek bekliyor.</>}
                    </div>
                  )}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 16 }}>
                  {[
                    ["Fatura Durumu", detailView.faturali ? `${detailView.faturali}${detailView.faturali === "Faturasız" ? " (KDV HARİÇ)" : ""}` : ""],
                    ["Fabrika Satış Bedeli (KDV'siz)", detailView.fabrikaSatisBedeli ? fmtCur(detailView.fabrikaSatisBedeli, detailView.currency) : ""],
                    ["Fatura Bedeli", detailView.faturaBedeli ? fmtCur(detailView.faturaBedeli, detailView.currency) : ""],
                    ["KDV Miktarı", calcKDV(detailView.faturali, detailView.faturaBedeli, kdvRate) > 0 ? fmtCur(calcKDV(detailView.faturali, detailView.faturaBedeli, kdvRate), detailView.currency) : ""],
                    ["Komisyon", detailView.komisyon ? fmtCur(detailView.komisyon, detailView.currency) : ""],
                    ["Satış Yapan", detailView.satisYapan],
                    ["Şirket Telefonu", detailView.phone],
                    ["E-posta", detailView.email],
                    ["Yetkili 1 - Ad Soyad", detailView.yetkili1Ad],
                    ["Yetkili 1 - Telefon", detailView.yetkili1Tel],
                    ["Adres", detailView.adres],
                    ["Şehir / Ülke", [detailView.city, detailView.country].filter(Boolean).join(" / ")],
                    ["Model", detailView.model],
                    ["Makina Kalıp Çapı", fmtKalipCapi(detailView.kalipCapi)],
                    ["Seri Numarası", detailView.serialNo],
                    ["Garanti Başlangıç", detailView.installDate ? fmtTR(detailView.installDate) : ""],
                    ["Garanti Bitiş", detailView.warrantyEnd ? fmtTR(detailView.warrantyEnd) : ""],
                    ["Para Birimi", detailView.currency && detailView.currency !== "TRY" ? ({USD:"Dolar ($)",EUR:"Euro (€)"}[detailView.currency]) : ""],
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

                {/* Sahiplik Geçmişi */}
                {detailView.prevOwners?.length > 0 && (
                  <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 10, color: "#0f172a", fontSize: 13 }}>Sahiplik Geçmişi</div>
                    {detailView.prevOwners.map((o, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: "1px solid #fde8d2" }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626" }}>{i + 1}. Sahip: {o.name}</div>
                          <div style={{ fontSize: 11, color: "#92400e" }}>
                            {o.country || ""}{o.city ? ` / ${o.city}` : ""}{o.satisYapan ? ` · Satış: ${o.satisYapan}` : ""}{o.phone ? ` · Tel: ${o.phone}` : ""}{o.email ? ` · ${o.email}` : ""}
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

                {/* Birleşik zaman çizelgesi: satış → servisler → parça/kalıp → garanti */}
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
                      <Btn small variant="ghost" onClick={printMachineReport}><Icon name="print" size={12} /> Yazdır</Btn>
                      <Btn small variant="ghost" onClick={openMailMachineReport}><Icon name="mail" size={12} /> E-posta Gönder</Btn>
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
                                  <button onClick={() => printServiceForm(sv)} title="Servis Formu Yazdır"
                                    style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#64748b", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
                                    <Icon name="print" size={11} /> Yazdır
                                  </button>
                                  <button onClick={() => openMailServiceForm(sv)} title="Servis Formu E-posta Gönder"
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
                              {sv?.tech && <span style={{ fontSize: 12, color: "#64748b" }}>· {sv.tech}</span>}
                              {sv?.repairPlace && <span style={{ fontSize: 11, color: "#94a3b8" }}>· {sv.repairPlace}</span>}
                            </div>
                            {ev.desc && <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 1.5 }}>{ev.desc}</div>}
                            {psList && (
                              <div style={{ marginTop: 4 }}>
                                {psList.map(p => {
                                  const kdv = p.ucretsizMi ? 0 : calcKDV(p.faturaTipi || normalizeSaleType(detailView.faturali), p.ucret, kdvRate);
                                  return (
                                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: psList.length > 1 ? 3 : 5, flexWrap: "wrap" }}>
                                      {psList.length > 1 && (
                                        <span onClick={() => openEditPartSale(p)} title="Düzenlemek için tıklayın"
                                          style={{ fontSize: 13, fontWeight: 600, color: "#c2410c", cursor: "pointer", textDecoration: "underline", textDecorationColor: "#fed7aa" }}>
                                          {p.ad}{p.olcu ? ` (${p.olcu})` : ""}
                                        </span>
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
                                  const kdvToplam = psList.reduce((s, p) => s + (p.ucretsizMi ? 0 : calcKDV(p.faturaTipi || normalizeSaleType(detailView.faturali), p.ucret, kdvRate)), 0);
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
                                    const kdv = calcKDV(sv.faturaTipi, toplam, kdvRate);
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
              <Btn variant="ghost" onClick={() => setDetailViewId(null)}>Kapat</Btn>
              {isCustomerTab && (
                <Btn variant="ghost" onClick={() => { const c = detailView; setDetailViewId(null); openAddForFirm(c); }}>
                  <Icon name="plus" size={14} /> Bu Firmaya Makina Ekle
                </Btn>
              )}
              <Btn onClick={() => { const c = detailView; setDetailViewId(null); openEdit(c); }}><Icon name="edit" size={14} /> Düzenle</Btn>
            </div>
          </Modal>
        );
      })()}

      {/* Yeni sahip (2. el devir) modalı */}
      {newOwnerForm && (
        <Modal title="Yeni Sahip Ekle (2. El Devir)" onClose={() => setNewOwnerForm(null)}>
          <div style={{ fontSize: 13, color: "#64748b", background: "#fff7ed", padding: "10px 14px", borderRadius: 10, marginBottom: 16, lineHeight: 1.5 }}>
            Mevcut sahip <b>sahiplik geçmişine</b> taşınacak, makina kaydı yeni sahibin bilgileriyle güncellenecek.
            Servis geçmişi, makina bilgileri ve <b>orijinal satış bedeli</b> korunur (Finans'taki toplam ciro ve satış adedinden düşmez).
          </div>
          {detailView && (detailKalanBorcToplam > 0 || detailEkBorcDigerPB.length > 0) && (
            <div style={{ fontSize: 13, color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", padding: "10px 14px", borderRadius: 10, marginBottom: 16, lineHeight: 1.5, fontWeight: 600 }}>
              ⚠ Bu makinenin devredilmeden önce{detailKalanBorcToplam > 0 && <> <b>{fmtCur(detailKalanBorcToplam, detailView.currency)}</b></>} ödenmemiş bakiyesi var (makina satışı ve/veya ödenmemiş servis/parça/Extra Kalıp dahil).
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
                ...(dealers || []).map(d => ({ value: d.name, label: d.name })),
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

      {/* Sahiplik Geçmişi'ndeki bir kaydı düzeltme modalı — mevcut sahibe dokunmaz, sadece o tarihsel satırı günceller */}
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
                ...(dealers || []).map(d => ({ value: d.name, label: d.name })),
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

      {/* E-posta gönder (Makina Geçmişi raporu / Servis Formu) — PDF eki main process'te üretilir */}
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
              <div style={{ fontSize: 11.5, color: "#94a3b8", marginBottom: 16 }}>📎 {mailDraft.pdfFileName} otomatik ek olarak gönderilecek.</div>
              {mailSendState.state === "error" && (
                <div style={{ fontSize: 13, fontWeight: 600, color: "#991b1b", marginBottom: 12 }}>✗ {mailSendState.error}</div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn variant="ghost" onClick={() => setMailDraft(null)}>İptal</Btn>
                <Btn onClick={sendMailDraft} disabled={mailSendState.state === "sending"}>
                  <Icon name="mail" size={14} /> {mailSendState.state === "sending" ? "Gönderiliyor..." : "Gönder"}
                </Btn>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Kapora/Ödeme ekle/düzenle (müşteri detayından) — tarihli ödeme kaydı, Kalan Borç bundan türetilir */}
      {paymentForm && (
        <Modal title={paymentForm.id ? "Ödemeyi Düzenle" : "Kapora/Ödeme Ekle"} onClose={() => setPaymentForm(null)}>
          <Field label="Tarih">
            <Input type="date" value={paymentForm.tarih || ""} onChange={e => setPaymentForm(p => ({ ...p, tarih: e.target.value }))} />
          </Field>
          {paymentForm.id ? (
            // Düzenleme: tek satır — Yöntem/Tutar/(Çek ise) Vade Tarihi + Tahsil Edildi
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
            // Ekleme: çoklu satır — aynı ödeme olayı nakit+kredi kartı+çek karışık girilebilir
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
          message="Bu Kapora/Ödeme kaydı kalıcı olarak silinecek ve Kalan Borç yeniden hesaplanacak."
          onConfirm={() => { deletePayment(confirmDeletePaymentId); setConfirmDeletePaymentId(null); }}
          onCancel={() => setConfirmDeletePaymentId(null)}
        />
      )}

      {confirmDeleteServiceId && (
        <ConfirmDialog
          message="Bu servis kaydı kalıcı olarak silinecek."
          onConfirm={() => { deleteService(confirmDeleteServiceId); setConfirmDeleteServiceId(null); }}
          onCancel={() => setConfirmDeleteServiceId(null)}
        />
      )}

      {confirmDeletePartSaleId && (
        <ConfirmDialog
          message="Bu Extra Kalıp kaydı kalıcı olarak silinecek."
          onConfirm={() => { deletePartSale(confirmDeletePartSaleId); setConfirmDeletePartSaleId(null); }}
          onCancel={() => setConfirmDeletePartSaleId(null)}
        />
      )}

      {/* Servis talebi ekle/düzenle (müşteri detayından) — Services.jsx ile aynı paylaşılan form */}
      {svModal && (
        <ServiceForm
          title={svModal === "add" ? "Yeni Servis Talebi" : "Servis Talebini Düzenle"}
          form={svForm} setForm={setSvForm} customers={customers} parts={parts} kdvRate={kdvRate}
          onSave={saveService} onCancel={() => setSvModal(null)}
        />
      )}

      {/* Extra Kalıp satışı ekle/düzenle (müşteri detayından) — Parts.jsx ile aynı paylaşılan form */}
      {pkForm && (
        <PartSaleForm
          title={pkForm.id ? "Kaydı Düzenle" : "Extra Kalıp Satışı / Çıkışı"}
          form={pkForm} setForm={setPkForm} customers={customers} kalipDefs={kalipDefs} kdvRate={kdvRate}
          onSave={savePartSale} onCancel={() => setPkForm(null)}
        />
      )}

      {confirmId && (
        <ConfirmDialog
          message={`"${customers.find(c => c.id === confirmId)?.name || ""}" ${delWord} ve bilgileri kalıcı olarak silinecek.`}
          onConfirm={confirmDel}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {modal && (
        <Modal wide maxWidth={1180} maxHeight="88vh" title={modal === "add" ? addLabel : `${entity} Düzenle`} onClose={() => setModal(null)}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 14px", paddingBottom: 8, borderBottom: "2px solid #f1f5f9" }}>
            <Icon name="customers" size={15} />
            <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: .5 }}>Firma Bilgileri</span>
          </div>

          <Field label="Satın Alan">
            <div style={{ maxWidth: "50%" }}>
              <Input value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Satın alan firma / kişi" />
              <Warn>{!form.name?.trim() ? "Satın alan adı girilmedi" : ""}</Warn>
            </div>
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
            <Field label="Şirket Telefonu">
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

          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "28px 0 14px", paddingBottom: 8, borderBottom: "2px solid #f1f5f9" }}>
            <Icon name="machine" size={15} />
            <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: .5 }}>Makina Bilgileri</span>
          </div>

          <Field label="Kalıp Sayısı (otomatik)">
            <div style={{ maxWidth: 220, padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f1f5f9", color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
              <b style={{ color: "#0f172a", fontSize: 16 }}>{(form.kaliplar || []).length}</b>
              <span style={{ fontSize: 12 }}>kalıp · aşağıdaki listeden eklenir/silinir</span>
            </div>
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
          </div>

          {/* Makina Kalıp Çapı — 3 kutu: çap × arka ölçü × boy */}
          <Field label="Makina Kalıp Çapı">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Input value={form.kalipCapi?.en || ""} placeholder="Çap"
                onChange={e => setForm(p => ({ ...p, kalipCapi: { ...(p.kalipCapi || {}), en: e.target.value } }))} />
              <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: 16 }}>×</span>
              <Input value={form.kalipCapi?.yukseklik || ""} placeholder="Arka Ölçü"
                onChange={e => setForm(p => ({ ...p, kalipCapi: { ...(p.kalipCapi || {}), yukseklik: e.target.value } }))} />
              <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: 16 }}>×</span>
              <Input value={form.kalipCapi?.boy || ""} placeholder="Boy"
                onChange={e => setForm(p => ({ ...p, kalipCapi: { ...(p.kalipCapi || {}), boy: e.target.value } }))} />
            </div>
          </Field>

          {/* Kalıp Ölçüleri — listeden eklenir/silinir, sayı otomatik */}
          <Field label={`Kalıp Ölçüleri (${(form.kaliplar || []).length} kalıp)`}>
            {(form.kaliplar || []).map((k, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 36px", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", whiteSpace: "nowrap" }}>
                  {i + 1}.
                </span>
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
                {/* Sil butonu — bayiye kalıpsız teslim edilip kalıp sonradan üretilen makinalar için 0 kalıba kadar silinebilir */}
                <button
                  type="button"
                  title="Bu kalıbı sil"
                  onClick={() => setForm(p => {
                    const arr = (p.kaliplar || []).filter((_, idx) => idx !== i);
                    return { ...p, kaliplar: arr, kalipSayisi: arr.length };
                  })}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: "1px solid #fecaca",
                    background: "#fef2f2", color: "#dc2626", cursor: "pointer",
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

          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "28px 0 14px", paddingBottom: 8, borderBottom: "2px solid #f1f5f9" }}>
            <Icon name="finance" size={15} />
            <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: .5 }}>Satış / Finans</span>
          </div>

          <Field label="Satış Yapan">
            <div style={{ maxWidth: "50%" }}>
            {modal === "add" ? (
              // Yeni müşteri/ilk satışta serbest metin yok — sadece Fabrika veya kayıtlı bayilerden seçilir
              <Select value={form.satisYapan || factory?.name || "Altuntaş Makina"} onChange={e => setForm(p => ({ ...p, satisYapan: e.target.value }))}>
                <option value={factory?.name || "Altuntaş Makina"}>{factory?.name || "Altuntaş Makina"} (Fabrika)</option>
                {(dealers || []).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </Select>
            ) : (
              <PickOrType
                value={form.satisYapan}
                onChange={v => setForm(p => ({ ...p, satisYapan: v }))}
                placeholder="Satıcı adı (müşteri, bayi, fabrika...)"
                options={[
                  { value: factory?.name || "Altuntaş Makina", label: `${factory?.name || "Altuntaş Makina"} (Fabrika)` },
                  ...(dealers || []).map(d => ({ value: d.name, label: d.name })),
                  ...(form.prevOwners?.length > 0
                    ? [{ value: form.prevOwners[form.prevOwners.length - 1].name, label: `${form.prevOwners[form.prevOwners.length - 1].name} (Önceki Sahip)` }]
                    : []),
                ]}
              />
            )}
            </div>
          </Field>

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

          <div style={{ display: "grid", gridTemplateColumns: isFaturali(form.faturali) ? "1fr 1fr 1fr" : "1fr 1fr", gap: 12 }}>
            {/* Fabrika Satış Bedeli — finansın asıl bel kemiği */}
            <Field label="Fabrika Satış Bedeli">
              <div style={{ maxWidth: 220 }}><MoneyInput value={form.fabrikaSatisBedeli} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, fabrikaSatisBedeli: v }))} /></div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Makinenin fabrikadan satıldığı tutar (Ciro ve Kalan Borç hesaplamasının temelini oluşturur).</div>
            </Field>

            {/* Fatura Bedeli — faturalı satışlarda */}
            {isFaturali(form.faturali) && (
              <Field label="Fatura Bedeli (resmi faturada yazan)">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ maxWidth: 220 }}><MoneyInput value={form.faturaBedeli} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, faturaBedeli: v }))} /></div>
                  {normalizeSaleType(form.faturali) === "Faturalı Yurtdışı" && (
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#1d4ed8", background: "#dbeafe", padding: "5px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>YURTDIŞI · KDV YOK</span>
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

            <Field label="Komisyon">
              <div style={{ maxWidth: 220 }}><MoneyInput value={form.komisyon} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, komisyon: v }))} /></div>
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {modal === "add" ? (
            <Field label="İlk Ödeme (Kapora/Ödeme)">
              <PaymentRowsEditor rows={form._ilkOdemeSatirlari} onChange={rows => setForm(p => ({ ...p, _ilkOdemeSatirlari: rows }))} sym={CUR_SYM[form.currency || "TRY"]} />
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Satış anında alınan kapora varsa girin (nakit, kredi kartı, çek ayrı satırlar olarak). Sonraki ödemeler detay görünümünden ("Ödeme Ekle") eklenir.</div>
            </Field>
          ) : (
            <Field label="Kapora/Ödeme">
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", padding: "9px 0" }}>{fmtCur(sumPayments(form.id, payments), form.currency)}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Ödemeler detay görünümünden ("Ödeme Ekle") yönetilir.</div>
            </Field>
          )}

          <Field label="Kalan Borç">
            <div style={{ fontSize: 16, fontWeight: 800, color: "#dc2626", padding: "9px 0" }}>
              {fmtCur(calcKalanBorc({ ...form, id: form.id ?? -1 }, payments, kdvRate) - (modal === "add" ? (form._ilkOdemeSatirlari || []).filter(isPaymentReceived).reduce((s, r) => s + parseMoney(r.tutar), 0) : 0), form.currency)}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Otomatik hesaplanır, elle değiştirilemez. (Çek satırları tahsil edilene kadar düşülmez.)</div>
          </Field>
          </div>

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
