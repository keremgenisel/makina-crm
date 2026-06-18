import { useState, useEffect } from "react";
import LOGO from "../assets/logo.avif?inline";
import { ALTUNMAK_MODELS, CUR_SYM, SALE_TYPES, DEFAULT_KDV_RATE } from "../lib/constants";
import { today, todayTR, fmtTR, trLower, uid, bumpId, fmt, fmtKalipCapi, kalipText, normalizeSaleType, isFaturali, isYurtIci, calcKDV, fmtCur, parseMoney, stripAutoPrint, customerHasAnyDebt } from "../lib/utils";
import { useFilteredList } from "../hooks/useFilteredList";
import { Icon, Field, Input, Warn, EMAIL_RE, PHONE_RE, Select, MoneyInput, Btn, Modal, ConfirmDialog, Pagination, CountryCityFields } from "./ui";
import { ServiceForm } from "./ServiceForm";
import { PartSaleForm } from "./PartSaleForm";

export const Customers = ({
  customers, setCustomers, services = [], setServices = null, dealers = null, models = ALTUNMAK_MODELS,
  factory = null, geoData = null, loadingGeo = false, stock = null, setStock = null,
  partSales = [], setPartSales = null, parts = [],
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
  const [svModal, setSvModal] = useState(null); // null | "add" | { edit: sv } — servis talebi ekle/düzenle
  const [svForm, setSvForm] = useState({});
  const [pkForm, setPkForm] = useState(null); // null | Extra Kalıp satışı ekle/düzenle formu
  const isCustomerTab = isCustomer; // hibrit özellikler yalnızca müşteriler sekmesinde
  // detailView'ı id üzerinden canlı türet — devir/düzenleme sonrası anlık güncel kalsın
  const detailView = detailViewId != null ? customers.find(c => c.id === detailViewId) || null : null;
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
    (partSales || []).filter(ps => ps.customerId === detailView.id).forEach(ps => {
      const kalip = ps.tur === "Kalıp";
      ev.push({
        kind: "part", date: ps.tarih, color: kalip ? "#c2410c" : "#0891b2",
        title: kalip ? "Kalıp Verildi" : "Yedek Parça Verildi",
        desc: `${ps.ad}${ps.olcu ? " (" + ps.olcu + ")" : ""}${ps.ucretsizMi ? " · garanti kapsamında (ücretsiz)" : " · " + fmtCur(ps.ucret, ps.currency) + (ps.garantiDisiIslem ? " (garanti dışı işlem)" : "")}`,
        ps,
      });
    });
    if (detailView.warrantyEnd) {
      const dolmus = detailView.warrantyEnd < today();
      ev.push({
        kind: "warranty", date: detailView.warrantyEnd, color: dolmus ? "#dc2626" : "#f59e0b",
        title: dolmus ? "Garanti Süresi Doldu" : "Garanti Bitişi",
        desc: dolmus ? "Garanti süresi sona erdi" : "Garanti süresi bu tarihte sona erecek",
      });
    }
    return ev.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  })();
  const detailModelInfo = detailView ? models.find(m => m.model === detailView.model) : null;
  const detailWarrantyOk = detailView?.warrantyEnd && detailView.warrantyEnd >= today();

  // Firma adına göre makina sayısı (aynı isimli kayıtlar = aynı firma)
  const firmCount = {};
  customers.forEach(c => { const k = trLower(c.name); firmCount[k] = (firmCount[k] || 0) + 1; });

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
      kalipSayisi: 0, satisYapan: "Altuntaş Makina", name: "", phone: "", email: "",
      yetkili1Ad: "", yetkili1Tel: "", yetkili2Ad: "", yetkili2Tel: "",
      adres: "", city: "", country: "Türkiye", model: "",
      kaliplar: [],
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
      kalipSayisi: 0, satisYapan: base.satisYapan || (factory?.name || "Altuntaş Makina"),
      name: base.name || "", phone: base.phone || "", email: base.email || "",
      yetkili1Ad: base.yetkili1Ad || "", yetkili1Tel: base.yetkili1Tel || "",
      yetkili2Ad: base.yetkili2Ad || "", yetkili2Tel: base.yetkili2Tel || "",
      adres: base.adres || "", city: base.city || "", country: base.country || "Türkiye",
      model: "", kaliplar: [],
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

  // Müşteri detayından servis talebi ekleme/düzenleme — Services.jsx'teki ile aynı ServiceForm'u kullanır
  const openAddService = () => {
    setSvForm({ customerId: detailView.id, type: "Periyodik Bakım", repairPlace: "Yerinde Onarım", yapilanIsler: "", musteriTalimati: "", servisUcreti: "", date: today(), tech: "", odendi: false, degisenParcalar: [], parcaUcreti: "", parcaCurrency: "TRY", parcaGarantiDisi: false, parcaOdendi: false });
    setSvModal("add");
  };
  const openEditService = sv => { setSvForm({ degisenParcalar: [], parcaUcreti: "", parcaCurrency: "TRY", parcaGarantiDisi: false, parcaOdendi: false, ...sv }); setSvModal({ edit: sv }); };
  const saveService = (parcaUcretsizMi) => {
    if (!setServices) return;
    const rec = { ...svForm, customerId: svForm.customerId ? Number(svForm.customerId) : null, parcaUcretsizMi };
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
  const toggleParcaOdendi = (sv) => setServices && setServices(p => p.map(s => s.id === sv.id ? { ...s, parcaOdendi: !s.parcaOdendi } : s));

  // Müşteri detayından Extra Kalıp satışı ekleme/düzenleme — Parts.jsx ile aynı PartSaleForm'u kullanır
  const openAddPartSale = () => {
    setPkForm({ customerId: detailView.id, kalipModel: "", olcu: "", fiyat: "", currency: "TRY", tarih: today(), odendi: false });
  };
  const openEditPartSale = (ps) => {
    setPkForm({
      id: ps.id, customerId: ps.customerId,
      kalipModel: ps.ad || "", olcu: ps.olcu || "", tarih: ps.tarih || today(),
      currency: ps.currency || "TRY", fiyat: ps.ucret || "", odendi: !!ps.odendi,
    });
  };
  const savePartSale = () => {
    const selectedCust = customers.find(c => c.id === Number(pkForm.customerId));
    if (!selectedCust || !setPartSales || !pkForm.kalipModel) return;
    const fields = {
      customerId: selectedCust.id, tur: "Kalıp", ad: pkForm.kalipModel,
      olcu: pkForm.olcu || "", tarih: pkForm.tarih || today(),
      currency: pkForm.currency || "TRY", ucret: parseMoney(pkForm.fiyat), ucretsizMi: false,
      odendi: !!pkForm.odendi,
    };
    if (pkForm.id) {
      setPartSales(p => p.map(x => x.id === pkForm.id ? { ...x, ...fields } : x));
      showToast("Kayıt güncellendi.");
    } else {
      const nid = Date.now();
      setPartSales(p => p.some(x => x.id === nid) ? p : [...p, { id: nid, ...fields }]);
      setCustomers(p => p.map(c => c.id === selectedCust.id
        ? { ...c, kaliplar: [...(c.kaliplar || []), { ad: pkForm.kalipModel, olcu: pkForm.olcu || "" }], kalipSayisi: (c.kaliplar || []).length + 1 }
        : c));
      showToast("Kalıp verildi (ücretli).");
    }
    setPkForm(null);
  };
  const togglePartSaleOdendi = (ps) => setPartSales && setPartSales(p => p.map(x => x.id === ps.id ? { ...x, odendi: !x.odendi } : x));

  // 2. el devir: mevcut sahibi sahiplik geçmişine taşı, makina kaydını yeni sahibe güncelle
  const saveNewOwner = () => {
    setCustomers(p => p.map(c => {
      if (c.id !== newOwnerForm._machineId) return c;
      const prev = {
        name: c.name, satisYapan: c.satisYapan, adres: c.adres,
        city: c.city, country: c.country, soldDate: newOwnerForm.saleDate || today(),
      };
      return {
        ...c,
        prevOwners: [...(c.prevOwners || []), prev],
        name: newOwnerForm.name,
        phone: newOwnerForm.phone || "",
        adres: newOwnerForm.adres || "",
        city: newOwnerForm.city || "",
        country: newOwnerForm.country || "",
        aciklama: newOwnerForm.aciklama || "",
        isResale: true,            // 2. el devir işareti (finans bunu gelir saymaz)
        satisYapan: newOwnerForm.satanFirma?.trim() || "2. El Devir",
        faturaBedeli: 0,
        fabrikaSatisBedeli: 0,
        komisyon: 0,
        extraKalipFiyati: 0,
        kalanBorc: 0,
      };
    }));
    showToast("Devir tamamlandı. Yeni sahip kaydedildi.");
    setNewOwnerForm(null);
  };

  // Yazdırma: tek bir servis kaydının "Servis Formu"nu üret (eski Services.jsx'teki ile aynı)
  const printServiceForm = (sv) => {
    const cust = customers.find(c => c.id === sv.customerId) || {};
    const esc = (s) => String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const adres = [cust.adres, cust.city, cust.country].filter(Boolean).join(", ") || "—";
    const servisUcretiVar = (sv.type === "Garanti Dışı" || sv.type === "Periyodik Bakım") && parseMoney(sv.servisUcreti) > 0;
    const parcaUcretiVar = !sv.parcaUcretsizMi && parseMoney(sv.parcaUcreti) > 0;
    const ucret = servisUcretiVar ? fmtCur(sv.servisUcreti, sv.currency) : "—";
    const parcaUcret = parcaUcretiVar ? fmtCur(sv.parcaUcreti, sv.parcaCurrency) : "—";
    const toplam = (servisUcretiVar && parcaUcretiVar)
      ? ((sv.currency || "TRY") === (sv.parcaCurrency || "TRY")
          ? fmtCur(parseMoney(sv.servisUcreti) + parseMoney(sv.parcaUcreti), sv.currency || "TRY")
          : `${fmtCur(sv.servisUcreti, sv.currency)} + ${fmtCur(sv.parcaUcreti, sv.parcaCurrency)}`)
      : null;

    const infoRows = [
      ["Firma Adı", cust.name],
      ["Telefon", cust.phone],
      ["Adres", adres],
      ["Makina Modeli", cust.model],
      ["Seri Numarası", cust.serialNo],
      ["Servis Türü", sv.type],
      ["Yapılan İşlem", sv.repairPlace],
      ["Servise Giriş Tarihi", fmtTR(sv.date)],
      ["Teknisyen", sv.tech],
      ["Servis Ücreti", ucret],
      ...(sv.degisenParcalar?.length ? [["Parça Ücreti", parcaUcret]] : []),
      ...(toplam ? [["Toplam", toplam]] : []),
    ].map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob: 'unsafe-inline'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:;">
<title>Servis Formu - ${esc(cust.name)}</title>
<style>
  body { font-family: Arial, sans-serif; color: #000; padding: 32px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 12px; margin-bottom: 24px; }
  .header h1 { margin: 0; font-size: 22px; letter-spacing: 1px; }
  .header .sub { font-size: 13px; }
  .header .right { font-size: 12px; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
  th, td { border: 1px solid #000; padding: 7px 12px; text-align: left; }
  .info th { width: 210px; background: #eee; }
  h2 { font-size: 15px; margin: 0 0 10px; }
  .box-area { border: 1px solid #000; border-radius: 4px; min-height: 80px; padding: 12px; font-size: 13px; white-space: pre-wrap; line-height: 1.6; margin-bottom: 24px; }
  .terms { font-size: 10px; color: #444; line-height: 1.6; margin-top: 8px; border-top: 1px solid #ccc; padding-top: 12px; }
  .printbtn { display: block; margin: 0 auto 24px; padding: 10px 28px; background: #e85d1a; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; }
  @media print { .printbtn { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <img src="${LOGO}" alt="Altuntaş Makina" style="height:42px;display:block;margin-bottom:6px" />
      <div class="sub">Servis Formu</div>
    </div>
    <div class="right">
      <div>Form No: № ${esc(String(sv.id))}</div>
      <div>Rapor Tarihi: ${todayTR()}</div>
    </div>
  </div>
  <table class="info"><tbody>${infoRows}</tbody></table>

  <h2>YAPILAN İŞLER / PARÇA DEĞİŞİMLERİ</h2>
  <div class="box-area">${esc(sv.yapilanIsler || "")}</div>

  ${sv.degisenParcalar?.length ? `
  <h2>DEĞİŞEN PARÇALAR</h2>
  <div class="box-area" style="min-height:auto">${esc(sv.degisenParcalar.join(", "))}</div>
  ` : ""}

  <h2>MÜŞTERİ TALİMATI / AÇIKLAMA</h2>
  <div class="box-area">${esc(sv.musteriTalimati || "")}</div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:none">
    <tr>
      <td style="border:none;width:50%;padding:0 16px 0 0;vertical-align:top">
        <div style="font-size:12px;font-weight:700;margin-bottom:50px">TESLİM EDEN</div>
        <div style="border-top:1px solid #000;padding-top:5px;font-size:11px;color:#444">Ad Soyad / İmza</div>
      </td>
      <td style="border:none;width:50%;padding:0 0 0 16px;vertical-align:top">
        <div style="font-size:12px;font-weight:700;margin-bottom:50px">TESLİM ALAN</div>
        <div style="border-top:1px solid #000;padding-top:5px;font-size:11px;color:#444">Ad Soyad / İmza / Kaşe</div>
      </td>
    </tr>
  </table>

  <div class="terms">
    1- Yukarıda adı ve miktarı belirtilen parçaları tam olarak teslim aldım. Yapılan hizmeti kabul ediyorum.<br>
    2- Tamir süresi 10 (on) iş gününü geçmez.<br>
    3- Yere düşen malzemeler garanti kapsamı dışındadır.<br>
    4- Teslim tarihinden itibaren 20 iş günü içerisinde alınmayan ürünlerden servisimiz sorumlu değildir.
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</` + `script>
</body>
</html>`;

    if (window.appPrint) {
      window.appPrint.printHtml(stripAutoPrint(html));
      return;
    }
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) {
      const a = document.createElement("a");
      a.href = url;
      a.download = `servis-formu-${(cust.serialNo || cust.name || "kayit").replace(/\s+/g, "-")}.html`;
      a.click();
    }
  };

  // Yazdırma: Makina Servis ve Yedek Parça Geçmişi Raporu
  const printMachineReport = () => {
    if (!detailView) return;
    const esc = (s) => String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const infoRows = [
      ["Satın Alan", detailView.name],
      ["Satış Yapan", detailView.satisYapan || detailView.contact || "—"],
      ["Adres", `${detailView.adres ? detailView.adres + ", " : ""}${detailView.city || ""}${detailView.country ? " / " + detailView.country : ""}` || "—"],
      ["Makina Modeli", detailView.model || "—"],
      ["Seri Numarası", detailView.serialNo || "—"],
      ...(fmtKalipCapi(detailView.kalipCapi) ? [["Makina Kalıp Çapı", fmtKalipCapi(detailView.kalipCapi)]] : []),
      ["Kalıplar", kalipText(detailView)],
      ["Satış / Garanti Başlangıç", detailView.installDate ? fmtTR(detailView.installDate) : "—"],
      ["Garanti Bitiş", `${detailView.warrantyEnd ? fmtTR(detailView.warrantyEnd) : "—"} (${detailWarrantyOk ? "Garanti devam ediyor" : "Garanti süresi dolmuş"})`],
      ["Not", detailView.aciklama || "—"],
    ].map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");

    const svcRows = detailHistory.length === 0
      ? `<tr><td colspan="5" style="text-align:center">Servis kaydı bulunmuyor.</td></tr>`
      : detailHistory.map(sv =>
          `<tr><td>${esc(fmtTR(sv.date))}</td><td>${esc(sv.type)}</td><td>${esc(sv.repairPlace || "—")}</td><td>${esc(sv.tech || "—")}</td><td>${esc(sv.yapilanIsler || sv.description || "")}${sv.degisenParcalar?.length ? `<br><b>Değişen parçalar:</b> ${esc(sv.degisenParcalar.join(", "))}` : ""}</td></tr>`
        ).join("");

    const givenParts = (partSales || []).filter(ps => ps.customerId === detailView.id).sort((a, b) => (a.tarih || "").localeCompare(b.tarih || ""));
    const partRows = givenParts.map(ps =>
      `<tr><td>${esc(fmtTR(ps.tarih))}</td><td>${esc(ps.ad)}${ps.olcu ? ` (${esc(ps.olcu)})` : ""}</td></tr>`
    ).join("");

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob: 'unsafe-inline'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:;">
<title>Servis Raporu - ${esc(detailView.name)}</title>
<style>
  body { font-family: Arial, sans-serif; color: #000; padding: 32px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 12px; margin-bottom: 24px; }
  .header h1 { margin: 0; font-size: 22px; letter-spacing: 1px; }
  .header .sub { font-size: 13px; }
  .header .right { font-size: 12px; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
  th, td { border: 1px solid #000; padding: 7px 12px; text-align: left; }
  .info th { width: 210px; background: #eee; }
  .svc th { background: #eee; }
  h2 { font-size: 15px; margin: 0 0 10px; }
  .printbtn { display: block; margin: 0 auto 24px; padding: 10px 28px; background: #e85d1a; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; }
  @media print { .printbtn { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <img src="${LOGO}" alt="Altuntaş Makina" style="height:42px;display:block;margin-bottom:6px" />
      <div class="sub">Makina Servis ve Yedek Parça Geçmişi Raporu</div>
    </div>
    <div class="right">
      <div>Rapor Tarihi: ${todayTR()}</div>
    </div>
  </div>
  <table class="info"><tbody>${infoRows}</tbody></table>
  ${(Array.isArray(detailView.prevOwners) && detailView.prevOwners.length > 0) ? `
  <h2>SAHİPLİK GEÇMİŞİ (2. El Devir)</h2>
  <table class="svc">
    <thead><tr><th>Sıra</th><th>Sahip</th><th>Konum</th><th>Satış Yapan</th><th>Devir Tarihi</th></tr></thead>
    <tbody>
      ${detailView.prevOwners.map((o, i) => `<tr><td>${i + 1}. Sahip</td><td>${esc(o.name)}</td><td>${esc([o.city, o.country].filter(Boolean).join(" / ") || "—")}</td><td>${esc(o.satisYapan || "—")}</td><td>${esc(o.soldDate || "—")}</td></tr>`).join("")}
      <tr style="background:#f0fdf4"><td><b>Mevcut</b></td><td><b>${esc(detailView.name)}</b></td><td>${esc([detailView.city, detailView.country].filter(Boolean).join(" / ") || "—")}</td><td>${esc(detailView.satisYapan || "—")}</td><td>—</td></tr>
    </tbody>
  </table>` : ""}
  <h2>SERVİS VE YEDEK PARÇA GEÇMİŞİ (${detailHistory.length} kayıt)</h2>
  <table class="svc">
    <thead><tr><th>Tarih</th><th>Tür</th><th>Yapılan İşlem</th><th>Teknisyen</th><th>Açıklama</th></tr></thead>
    <tbody>${svcRows}</tbody>
  </table>
  ${givenParts.length > 0 ? `
  <h2>EXTRA KALIPLAR (${givenParts.length} kayıt)</h2>
  <table class="svc">
    <thead><tr><th>Tarih</th><th>Kalıp</th></tr></thead>
    <tbody>${partRows}</tbody>
  </table>` : ""}
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</` + `script>
</body>
</html>`;

    if (window.appPrint) {
      window.appPrint.printHtml(stripAutoPrint(html));
      return;
    }
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      const a = document.createElement("a");
      a.href = url;
      a.download = `servis-raporu-${(detailView.serialNo || detailView.name).replace(/\s+/g, "-")}.html`;
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 16 }}>
                  {[
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
                      {detailView.kaliplar.map((k, i) => {
                        // İlk kalıp makinayla bedava gelir; ondan sonraki her kalıp "extra" sayılır (kaynağı fark etmez)
                        const isExtra = i >= 1;
                        return (
                          <span key={i} title={isExtra ? "Extra kalıp" : ""}
                            style={{ fontSize: 12, fontWeight: 700, background: isExtra ? "#fee2e2" : "#fff7ed", color: isExtra ? "#991b1b" : "#c2410c", border: `1px solid ${isExtra ? "#fca5a5" : "#fed7aa"}`, borderRadius: 8, padding: "6px 12px" }}>
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
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #fde8d2" }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626" }}>{i + 1}. Sahip: {o.name}</div>
                          <div style={{ fontSize: 11, color: "#92400e" }}>
                            {o.country || ""}{o.city ? ` / ${o.city}` : ""}{o.satisYapan ? ` · Satış: ${o.satisYapan}` : ""}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "right" }}>
                          Devir tarihi<br /><b style={{ color: "#475569" }}>{fmtTR(o.soldDate)}</b>
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
                      <Btn small variant="ghost" onClick={openAddService}><Icon name="plus" size={12} /> Yeni Servis Talebi</Btn>
                      <Btn small variant="ghost" onClick={openAddPartSale}><Icon name="parts" size={12} /> Extra Kalıp Satışı</Btn>
                      <Btn small variant="ghost" onClick={printMachineReport}><Icon name="print" size={12} /> Yazdır</Btn>
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
                                </>
                              ) : ev.kind === "part" && ps?.tur === "Kalıp" ? (
                                <span onClick={() => openEditPartSale(ps)} title="Düzenlemek için tıklayın"
                                  style={{ fontWeight: 700, fontSize: 14, color: ev.color, cursor: "pointer", textDecoration: "underline", textDecorationColor: "#e2e8f0" }}>{ev.title}</span>
                              ) : (
                                <span style={{ fontWeight: 700, fontSize: 14, color: ev.color }}>{ev.title}</span>
                              )}
                              {ev.tip && <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "2px 8px", background: ev.tip === "Faturalı Yurt İçi" ? "#d1fae5" : ev.tip === "Faturalı İhracat" ? "#dbeafe" : "#fef3c7", color: ev.tip === "Faturalı Yurt İçi" ? "#065f46" : ev.tip === "Faturalı İhracat" ? "#1d4ed8" : "#92400e" }}>{ev.tip === "Faturalı Yurt İçi" ? "Yurt İçi" : ev.tip === "Faturalı İhracat" ? "İhracat" : "Faturasız"}</span>}
                              {sv?.tech && <span style={{ fontSize: 12, color: "#64748b" }}>· {sv.tech}</span>}
                              {sv?.repairPlace && <span style={{ fontSize: 11, color: "#94a3b8" }}>· {sv.repairPlace}</span>}
                            </div>
                            {ev.desc && <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 1.5 }}>{ev.desc}</div>}
                            {ps?.tur === "Kalıp" && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
                                <button onClick={() => togglePartSaleOdendi(ps)}
                                  style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 8px", cursor: "pointer", border: "1px solid", borderColor: ps.odendi === false ? "#fecaca" : "#bbf7d0", background: ps.odendi === false ? "#fef2f2" : "#f0fdf4", color: ps.odendi === false ? "#dc2626" : "#15803d" }}>
                                  {ps.odendi === false ? "Ödenmedi · işaretle: Ödendi" : "Ödendi"}
                                </button>
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
                                  {sv.degisenParcalar.map(ad => (
                                    <span key={ad} style={{ fontSize: 11, fontWeight: 600, color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "2px 9px" }}>{ad}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {sv?.musteriTalimati && (
                              <div style={{ marginTop: 5 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .3 }}>Müşteri Talimatı</div>
                                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{sv.musteriTalimati}</div>
                              </div>
                            )}
                            {sv && svUcretliMi(sv) && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 700 }}>Servis Ücreti: {fmtCur(sv.servisUcreti, sv.currency)}</span>
                                <button onClick={() => toggleServisOdendi(sv)}
                                  style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 8px", cursor: "pointer", border: "1px solid", borderColor: sv.odendi === false ? "#fecaca" : "#bbf7d0", background: sv.odendi === false ? "#fef2f2" : "#f0fdf4", color: sv.odendi === false ? "#dc2626" : "#15803d" }}>
                                  {sv.odendi === false ? "Ödenmedi · işaretle: Ödendi" : "Ödendi"}
                                </button>
                              </div>
                            )}
                            {sv && svParcaUcretliMi(sv) && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 700 }}>Parça Ücreti: {fmtCur(sv.parcaUcreti, sv.parcaCurrency)}</span>
                                <button onClick={() => toggleParcaOdendi(sv)}
                                  style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 8px", cursor: "pointer", border: "1px solid", borderColor: sv.parcaOdendi === false ? "#fecaca" : "#bbf7d0", background: sv.parcaOdendi === false ? "#fef2f2" : "#f0fdf4", color: sv.parcaOdendi === false ? "#dc2626" : "#15803d" }}>
                                  {sv.parcaOdendi === false ? "Ödenmedi · işaretle: Ödendi" : "Ödendi"}
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
            Servis geçmişi ve makina bilgileri korunur. <b>Bu bir 2. el el değişimidir; firmanızın satışı olmadığı için finansa yansımaz.</b>
          </div>
          <Field label="Yeni Sahip (Satın Alan)">
            <Input value={newOwnerForm.name || ""} onChange={e => setNewOwnerForm(p => ({ ...p, name: e.target.value }))} placeholder="Firma / kişi adı" />
            <Warn>{!newOwnerForm.name?.trim() ? "Yeni sahip adı girilmedi" : ""}</Warn>
          </Field>
          <Field label="Satan Firma">
            <Select value="" onChange={e => { if (e.target.value) setNewOwnerForm(p => ({ ...p, satanFirma: e.target.value })); }}>
              <option value="">Hızlı seç... (veya aşağıya elle yazın)</option>
              <option value={detailView?.name}>{detailView?.name} (Mevcut Sahip)</option>
              <option value={factory?.name || "Altuntaş Makina"}>{factory?.name || "Altuntaş Makina"} (Fabrika)</option>
              {(dealers || []).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </Select>
            <Input value={newOwnerForm.satanFirma || ""} onChange={e => setNewOwnerForm(p => ({ ...p, satanFirma: e.target.value }))}
              placeholder="Satıcı adı" style={{ marginTop: 6 }} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Telefon">
              <Input value={newOwnerForm.phone || ""} onChange={e => setNewOwnerForm(p => ({ ...p, phone: e.target.value }))} placeholder="Telefon" />
              <Warn>{newOwnerForm.phone && !PHONE_RE.test(newOwnerForm.phone) ? "Geçersiz telefon formatı" : ""}</Warn>
            </Field>
            <Field label="Devir Tarihi"><Input type="date" value={newOwnerForm.saleDate || ""} onChange={e => setNewOwnerForm(p => ({ ...p, saleDate: e.target.value }))} /></Field>
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

      {/* Servis talebi ekle/düzenle (müşteri detayından) — Services.jsx ile aynı paylaşılan form */}
      {svModal && (
        <ServiceForm
          title={svModal === "add" ? "Yeni Servis Talebi" : "Servis Talebini Düzenle"}
          form={svForm} setForm={setSvForm} customers={customers} parts={parts}
          onSave={saveService} onCancel={() => setSvModal(null)}
        />
      )}

      {/* Extra Kalıp satışı ekle/düzenle (müşteri detayından) — Parts.jsx ile aynı paylaşılan form */}
      {pkForm && (
        <PartSaleForm
          title={pkForm.id ? "Kaydı Düzenle" : "Extra Kalıp Satışı / Çıkışı"}
          form={pkForm} setForm={setPkForm} customers={customers} kalipDefs={kalipDefs}
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
        <Modal wide title={modal === "add" ? addLabel : `${entity} Düzenle`} onClose={() => setModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Kalıp Sayısı (otomatik)">
              <div style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f1f5f9", color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
                <b style={{ color: "#0f172a", fontSize: 16 }}>{(form.kaliplar || []).length}</b>
                <span style={{ fontSize: 12 }}>kalıp · aşağıdaki listeden eklenir/silinir</span>
              </div>
            </Field>
            <Field label="Satış Yapan">
              {modal === "add" ? (
                // Yeni müşteri/ilk satışta serbest metin yok — sadece Fabrika veya kayıtlı bayilerden seçilir
                <Select value={form.satisYapan || factory?.name || "Altuntaş Makina"} onChange={e => setForm(p => ({ ...p, satisYapan: e.target.value }))}>
                  <option value={factory?.name || "Altuntaş Makina"}>{factory?.name || "Altuntaş Makina"} (Fabrika)</option>
                  {(dealers || []).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </Select>
              ) : (
                <>
                  <Select value="" onChange={e => { if (e.target.value) setForm(p => ({ ...p, satisYapan: e.target.value })); }}>
                    <option value="">Hızlı seç... (veya aşağıya elle yazın)</option>
                    <option value={factory?.name || "Altuntaş Makina"}>{factory?.name || "Altuntaş Makina"} (Fabrika)</option>
                    {(dealers || []).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    {form.prevOwners?.length > 0 && (
                      <option value={form.prevOwners[form.prevOwners.length - 1].name}>
                        {form.prevOwners[form.prevOwners.length - 1].name} (Önceki Sahip)
                      </option>
                    )}
                  </Select>
                  <Input value={form.satisYapan || ""} onChange={e => setForm(p => ({ ...p, satisYapan: e.target.value }))}
                    placeholder="Satıcı adı (müşteri, bayi, fabrika...)" style={{ marginTop: 6 }} />
                </>
              )}
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
              <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 36px", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: i >= 1 ? "#991b1b" : "#94a3b8", whiteSpace: "nowrap" }}>
                  {i + 1}.{i >= 1 ? " Extra" : ""}
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
