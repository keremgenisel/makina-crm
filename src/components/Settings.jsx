import { useState, useEffect } from "react";
import { CURRENCIES, DEFAULT_KDV_RATE, BACKUP_SCHEMA_VERSION, BACKUP_APP_TAG } from "../lib/constants";
import { today, fmtTR, trLower, bumpId, looksLikeBackup, fmt, fmtKalipCapi, normalizeSaleType, isFaturali, calcKDV, calcCiro, extractKDV, parseMoney, kalipCount } from "../lib/utils";
import { Icon, Btn, Modal, Field, Input, Warn, EMAIL_RE } from "./ui";
import { ModelsManager } from "./ModelsManager";
import { KalipManager } from "./KalipManager";
import { PartManager } from "./PartManager";

// Modül seviyesinde tanımlı — Settings içinde tanımlansaydı her render'da yeni bir komponent
// referansı oluşur, React onu farklı bir tip sanıp alt ağacı yeniden mount eder (input'lar her
// tuşa basışta focus kaybeder). Sadece props alıyor, Settings'in içindeki hiçbir şeye ihtiyacı yok.
const Section = ({ title, icon, children }) => (
  <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,.08)", marginBottom: 20, maxWidth: 720 }}>
    <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: "#e85d1a" }}><Icon name={icon} size={18} /></span>{title}
    </div>
    {children}
  </div>
);

export const Settings = ({ customers, services, dealers, stock = [], setStock, setCustomers, setServices, setDealers, version, appSettings, setAppSettings, customModels, setCustomModels, standardModels, setStandardModels, factory, setFactory, kalipDefs, setKalipDefs, notes = [], setNotes = null, parts = [], setParts = null, partSales = [], setPartSales = null, payments = [], setPayments = null, showToast = () => {} }) => {
  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };
  const [msg, setMsg] = useState(null);
  const [restoreData, setRestoreData] = useState(null); // onay bekleyen yedek

  // ── Excel'e aktarma (CSV) ──
  const buildCSV = (rows) => "\uFEFF" + rows.map(r => r.map(x => `"${String(x ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const downloadCSV = (rows, filename) => {
    const blob = new Blob([buildCSV(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
  };
  const utf8ToBase64 = (str) => {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return window.btoa(binary);
  };

  // ── Dışa aktarımları e-posta ile gönder (CSV/XLSX, içerik otomatik ek olarak eklenir) ──
  const [exportMailDraft, setExportMailDraft] = useState(null); // null | { to, subject, text, attachmentBase64, attachmentFilename, mimeType }
  const [exportMailSendState, setExportMailSendState] = useState({ state: "idle", error: null });
  const openExportMailCSV = (rows, filename, label) => {
    setExportMailDraft({
      to: "", subject: `${label} — Altuntaş Makina`, text: `Merhaba,\n\n${label} ekte yer almaktadır.\n\nİyi çalışmalar.`,
      attachmentBase64: utf8ToBase64(buildCSV(rows)), attachmentFilename: filename, mimeType: "text/csv;charset=utf-8",
    });
    setExportMailSendState({ state: "idle", error: null });
  };
  const openExportMailXLSXBase64 = (base64, filename, label) => {
    setExportMailDraft({
      to: "", subject: `${label} — Altuntaş Makina`, text: `Merhaba,\n\n${label} ekte yer almaktadır.\n\nİyi çalışmalar.`,
      attachmentBase64: base64, attachmentFilename: filename, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    setExportMailSendState({ state: "idle", error: null });
  };
  const sendExportMail = async () => {
    if (!window.appMail || !exportMailDraft) return;
    if (!EMAIL_RE.test(exportMailDraft.to || "")) { setExportMailSendState({ state: "error", error: "Geçerli bir alıcı e-posta adresi girin." }); return; }
    setExportMailSendState({ state: "sending", error: null });
    const res = await window.appMail.send({
      to: exportMailDraft.to.trim(), subject: exportMailDraft.subject, text: exportMailDraft.text,
      attachments: [{ filename: exportMailDraft.attachmentFilename, contentBase64: exportMailDraft.attachmentBase64, mimeType: exportMailDraft.mimeType }],
    });
    if (res?.ok) {
      setExportMailSendState({ state: "idle", error: null });
      setExportMailDraft(null);
      flash("ok", "E-posta gönderildi.");
    } else {
      setExportMailSendState({ state: "error", error: res?.error || "Gönderilemedi." });
    }
  };
  const exportFinance = (mode = "download") => {
    // 2. el devir olsa bile orijinal satışın bedeli sayılır (Finance.jsx ile tutarlı)
    const real = customers;
    const cur = (x) => (CURRENCIES.includes(x) ? x : "TRY");
    const e3 = () => ({ TRY: 0, USD: 0, EUR: 0 });
    const rate = appSettings?.kdvRate ?? DEFAULT_KDV_RATE;
    const gercekCiro = e3(), toplamCiro = e3(), faturaliTutar = e3(), kdv = e3(), komisyon = e3(), extra = e3(), alacak = e3(), servisUc = e3();
    real.forEach(c => {
      const k = cur(c.currency);
      const tip = normalizeSaleType(c.faturali);
      gercekCiro[k] += parseMoney(c.fabrikaSatisBedeli) || parseMoney(c.faturaBedeli);
      toplamCiro[k] += calcCiro(c, rate);
      if (isFaturali(tip)) faturaliTutar[k] += parseMoney(c.faturaBedeli);
      kdv[k] += calcKDV(tip, c.faturaBedeli, rate);
      komisyon[k] += parseMoney(c.komisyon);
      alacak[k] += parseMoney(c.kalanBorc);
    });
    services.filter(s => s.type === "Garanti Dışı" || s.type === "Periyodik Bakım").forEach(s => {
      const k = cur(s.currency);
      servisUc[k] += parseMoney(s.servisUcreti);
      if (k === "TRY") kdv[k] += extractKDV(s.servisUcreti, rate);
    });
    // Toplam Extra Kalıp Satışı — donmuş extraKalipFiyati yerine canlı Extra Kalıp sekmesi verisi
    partSales.forEach(p => { extra[cur(p.currency)] += parseMoney(p.ucret); });
    const net = e3();
    CURRENCIES.forEach(k => { net[k] = gercekCiro[k] + extra[k] + servisUc[k] - komisyon[k]; });
    const kalipAdet = real.reduce((t, c) => t + (Array.isArray(c.kaliplar) ? c.kaliplar.length : (parseInt(c.kalipSayisi, 10) || 0)), 0);
    // Satış tipi kırılımı
    const tipAdet = { "Faturalı Yurtiçi": 0, "Faturalı Yurtdışı": 0, "Faturasız Yurtiçi": 0, "Faturasız Yurtdışı": 0 };
    real.forEach(c => { const t = normalizeSaleType(c.faturali); if (tipAdet[t] != null) tipAdet[t]++; });
    const line = (label, obj) => [label, obj.TRY, obj.USD, obj.EUR];
    const rows = [
      ["FİNANS ÖZETİ", new Date().toLocaleDateString("tr-TR"), "", ""],
      [],
      ["Toplam Satılan Makina", real.length],
      ["Toplam Satılan Kalıp", kalipAdet],
      ["Faturalı Yurtiçi", tipAdet["Faturalı Yurtiçi"]],
      ["Faturalı Yurtdışı", tipAdet["Faturalı Yurtdışı"]],
      ["Faturasız Yurtiçi", tipAdet["Faturasız Yurtiçi"]],
      ["Faturasız Yurtdışı", tipAdet["Faturasız Yurtdışı"]],
      ["Garanti Dışı Servis Sayısı", services.filter(s => s.type === "Garanti Dışı").length],
      [],
      ["TUTARLAR", "₺ (TL)", "$ (USD)", "€ (EUR)"],
      line("Gerçek Ciro (fiili satış)", gercekCiro),
      line("Toplam Ciro (Fabrika Bedeli + KDV + Komisyon)", toplamCiro),
      line("Faturalı Tutar (resmi)", faturaliTutar),
      line(`Toplam KDV (%${rate})`, kdv),
      line("Toplam Extra Kalıp Satışı", extra),
      line("Toplam Servis Ücreti", servisUc),
      line("Toplam Ödenen Komisyon", komisyon),
      line("NET GENEL TOPLAM", net),
      line("Kalan Alacak / Tahsil Edilecek", alacak),
    ];
    if (mode === "email") { openExportMailCSV(rows, "finans-ozeti.csv", "Finans Özeti"); return; }
    downloadCSV(rows, "finans-ozeti.csv");
    flash("ok", "Finans özeti Excel (CSV) olarak indirildi.");
  };
  const exportCustomers = (mode = "download") => {
    const head = ["Firma", "Telefon", "E-posta", "Ülke", "Şehir", "Adres", "Model", "Makina Kalıp Çapı", "Seri No", "Kalıplar", "Satış Tarihi", "Garanti Bitiş", "Satış Yapan", "Satış Tipi", "Para Birimi", "Fabrika Satış Bedeli", "Fatura Bedeli", "KDV", "Komisyon", "Extra Kalıp", "Kalan Borç", "2. El mi?", "Yetkili1 Ad", "Yetkili1 Telefon", "Yetkili2 Ad", "Yetkili2 Telefon"];
    const curName = { TRY: "TL", USD: "USD", EUR: "EUR" };
    const rate = appSettings?.kdvRate ?? DEFAULT_KDV_RATE;
    const rows = [head, ...customers.map(c => [
      c.name, c.phone, c.email, c.country, c.city, c.adres, c.model, fmtKalipCapi(c.kalipCapi), c.serialNo,
      (c.kaliplar || []).map(k => `${k.ad}${k.olcu ? " (" + k.olcu + ")" : ""}`).join(", "),
      c.installDate, c.warrantyEnd, c.satisYapan, normalizeSaleType(c.faturali),
      curName[CURRENCIES.includes(c.currency) ? c.currency : "TRY"],
      parseMoney(c.fabrikaSatisBedeli), parseMoney(c.faturaBedeli), calcKDV(c.faturali, c.faturaBedeli, rate),
      parseMoney(c.komisyon), parseMoney(c.extraKalipFiyati), parseMoney(c.kalanBorc),
      c.isResale ? "Evet" : "Hayır",
      c.yetkili1Ad, c.yetkili1Tel, c.yetkili2Ad, c.yetkili2Tel,
    ])];
    if (mode === "email") { openExportMailCSV(rows, "musteriler.csv", "Müşteri Listesi"); return; }
    downloadCSV(rows, "musteriler.csv");
    flash("ok", "Müşteri listesi Excel (CSV) olarak indirildi.");
  };
  const exportServices = (mode = "download") => {
    const head = ["Müşteri", "Model", "Seri No", "Servis Türü", "Yapılan İşlem", "Tarih", "Teknisyen", "Para Birimi", "Servis Ücreti", "Yapılan İşler", "Müşteri Talimatı"];
    const curName = { TRY: "TL", USD: "USD", EUR: "EUR" };
    const rows = [head, ...services.map(s => {
      const c = customers.find(x => x.id === s.customerId) || {};
      return [c.name, c.model, c.serialNo, s.type, s.repairPlace, s.date, s.tech,
        curName[CURRENCIES.includes(s.currency) ? s.currency : "TRY"], parseMoney(s.servisUcreti), s.yapilanIsler, s.musteriTalimati];
    })];
    if (mode === "email") { openExportMailCSV(rows, "servis-kayitlari.csv", "Servis Kayıtları"); return; }
    downloadCSV(rows, "servis-kayitlari.csv");
    flash("ok", "Servis kayıtları Excel (CSV) olarak indirildi.");
  };
  const exportDealers = (mode = "download") => {
    const head = ["Bayi/Firma Adı", "Yetkili", "Telefon", "E-posta", "Adres", "Ülke", "Şehir", "Not"];
    const rows = [head, ...dealers.map(d => [d.name, d.contact, d.phone, d.email, d.adres, d.country, d.city, d.note])];
    if (mode === "email") { openExportMailCSV(rows, "bayiler.csv", "Bayi Listesi"); return; }
    downloadCSV(rows, "bayiler.csv");
    flash("ok", "Bayi listesi Excel (CSV) olarak indirildi.");
  };
  const exportStock = (mode = "download") => {
    const head = ["Model", "Seri No", "Stoğa Giriş Tarihi", "Not"];
    const rows = [head, ...stock.map(s => [s.model, s.serialNo, s.addedDate, s.note])];
    if (mode === "email") { openExportMailCSV(rows, "stok.csv", "Stok Listesi"); return; }
    downloadCSV(rows, "stok.csv");
    flash("ok", "Stok listesi Excel (CSV) olarak indirildi.");
  };
  const exportPartSales = (mode = "download") => {
    const head = ["Müşteri", "Tür", "Kalıp/Parça Adı", "Ölçü", "Tarih", "Para Birimi", "Ücret", "Ücretsiz mi?", "Fatura Tipi", "Ödendi mi?"];
    const curName = { TRY: "TL", USD: "USD", EUR: "EUR" };
    const rows = [head, ...partSales.map(p => {
      const c = customers.find(x => x.id === p.customerId) || {};
      return [c.name, p.tur, p.ad, p.olcu, p.tarih, curName[CURRENCIES.includes(p.currency) ? p.currency : "TRY"],
        parseMoney(p.ucret), p.ucretsizMi ? "Evet" : "Hayır", p.faturaTipi, p.odendi ? "Evet" : "Hayır"];
    })];
    if (mode === "email") { openExportMailCSV(rows, "extra-kalip-satislari.csv", "Extra Kalıp Satışları"); return; }
    downloadCSV(rows, "extra-kalip-satislari.csv");
    flash("ok", "Extra Kalıp satışları Excel (CSV) olarak indirildi.");
  };
  const exportPayments = (mode = "download") => {
    const head = ["Müşteri", "Tarih", "Para Birimi", "Tutar", "Yöntem", "Vade Tarihi", "Tahsil Edildi", "Not"];
    const curName = { TRY: "TL", USD: "USD", EUR: "EUR" };
    const rows = [head, ...payments.map(p => {
      const c = customers.find(x => x.id === p.customerId) || {};
      const yontem = p.yontem || "Nakit";
      const cekMi = yontem === "Çek";
      return [
        c.name, p.tarih, curName[CURRENCIES.includes(p.currency) ? p.currency : "TRY"], parseMoney(p.tutar), yontem,
        cekMi && p.vadeTarihi ? fmtTR(p.vadeTarihi) : "",
        cekMi ? (p.tahsilEdildi ? "Evet" : "Hayır") : "",
        p.not,
      ];
    })];
    if (mode === "email") { openExportMailCSV(rows, "odemeler.csv", "Ödemeler / Kapora"); return; }
    downloadCSV(rows, "odemeler.csv");
    flash("ok", "Ödeme/kapora geçmişi Excel (CSV) olarak indirildi.");
  };
  const exportNotes = (mode = "download") => {
    const head = ["İçerik", "Güncellenme Tarihi"];
    const rows = [head, ...notes.map(n => [n.content, n.updatedAt])];
    if (mode === "email") { openExportMailCSV(rows, "notlar.csv", "Notlar"); return; }
    downloadCSV(rows, "notlar.csv");
    flash("ok", "Notlar Excel (CSV) olarak indirildi.");
  };
  const exportParts = (mode = "download") => {
    const head = ["Yedek Parça Adı"];
    const rows = [head, ...parts.map(p => [p.ad])];
    if (mode === "email") { openExportMailCSV(rows, "yedek-parca-tanimlari.csv", "Yedek Parça Tanımları"); return; }
    downloadCSV(rows, "yedek-parca-tanimlari.csv");
    flash("ok", "Yedek parça tanımları Excel (CSV) olarak indirildi.");
  };

  // ── İÇE AKTARMA (Excel'den CSV) ──
  // Şablon sütun başlıkları (müşteri bu sıraya uyarlar). Servis için 3 çift tarih/iş.
  const IMPORT_HEADERS = [
    "Kalıp Sayısı", "Satış Yapan", "Satın Alan Firma", "Telefon", "Adres", "Ülke", "Şehir",
    "Model", "Makina Kalıp Çapı (en x boy x yükseklik)", "Para Birimi (TL/USD/EUR)", "Satış Tipi (Faturalı Yurtiçi/Yurtdışı/Faturasız Yurtiçi/Yurtdışı)", "Aldığı Kalıplar", "Satış Tarihi / Garanti Başlangıç (gg.aa.yyyy)", "Garanti Bitiş (gg.aa.yyyy)", "Fabrika Satış Bedeli", "Fatura Bedeli",
    "Komisyon", "Extra Kalıp Fiyatı", "Kalan Borç", "Seri Numarası", "Açıklama",
    "Servis1 Tarih", "Servis1 Yapılan İş", "Servis2 Tarih", "Servis2 Yapılan İş", "Servis3 Tarih", "Servis3 Yapılan İş",
    "Yetkili1 Ad", "Yetkili1 Telefon", "Yetkili2 Ad", "Yetkili2 Telefon",
  ];
  // Tüm kayıtları İÇE AKTARMA ŞABLONU formatında tek Excel'de dışa aktar (geri yüklenebilir)
  const exportAllTemplate = async (mode = "download") => {
    const curName = { TRY: "TL", USD: "USD", EUR: "EUR" };
    const fmtD = (iso) => { if (!iso) return ""; const p = String(iso).split("-"); return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : ""; };
    const rows = [IMPORT_HEADERS];
    customers.forEach(c => {
      // Bu müşterinin servisleri (tarihe göre), ilk 3'ü şablona sığar
      const svc = services.filter(s => s.customerId === c.id)
        .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
        .slice(0, 3);
      const svcCells = [];
      for (let i = 0; i < 3; i++) {
        svcCells.push(svc[i] ? fmtD(svc[i].date) : "");
        svcCells.push(svc[i] ? (svc[i].yapilanIsler || "") : "");
      }
      rows.push([
        kalipCount(c) || c.kalipSayisi || "",
        c.satisYapan || "",
        c.name || "",
        c.phone || "",
        c.adres || "",
        c.country || "",
        c.city || "",
        c.model || "",
        fmtKalipCapi(c.kalipCapi),
        curName[CURRENCIES.includes(c.currency) ? c.currency : "TRY"],
        normalizeSaleType(c.faturali),
        (c.kaliplar || []).map(k => k.ad).filter(Boolean).join("; "),
        fmtD(c.installDate),
        fmtD(c.warrantyEnd),
        parseMoney(c.fabrikaSatisBedeli) || "",
        parseMoney(c.faturaBedeli) || "",
        parseMoney(c.komisyon) || "",
        parseMoney(c.extraKalipFiyati) || "",
        parseMoney(c.kalanBorc) || "",
        c.serialNo || "",
        c.aciklama || "",
        ...svcCells,
        c.yetkili1Ad || "", c.yetkili1Tel || "", c.yetkili2Ad || "", c.yetkili2Tel || "",
      ]);
    });
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tüm Kayıtlar");
      if (mode === "email") {
        const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
        openExportMailXLSXBase64(base64, "tum-kayitlar.xlsx", "Tüm Kayıtlar (Şablon Formatı)");
        return;
      }
      XLSX.writeFile(wb, "tum-kayitlar.xlsx");
      flash("ok", `${customers.length} müşteri kaydı şablon formatında indirildi (geri yüklenebilir).`);
    } catch {
      if (mode === "email") { openExportMailCSV(rows, "tum-kayitlar.csv", "Tüm Kayıtlar (Şablon Formatı)"); return; }
      downloadCSV(rows, "tum-kayitlar.csv");
      flash("ok", "Tüm kayıtlar (CSV) indirildi.");
    }
  };

  const downloadTemplate = async () => {
    const ornek = ["2", "Altuntaş Makina", "Örnek Gıda A.Ş.", "0532 000 00 00", "Atatürk Cad. No:1", "Türkiye", "İstanbul",
      "AK140_DSC", "50 x 80 x 115", "TL", "Faturalı Yurtiçi", "Hamburger; Adana Köfte", "15.04.2024", "15.04.2026", "850000", "650000", "0", "25000", "0", "AK140-2026-001", "Örnek kayıt",
      "10.01.2025", "Periyodik bakım yapıldı", "05.06.2025", "Bıçak değişti", "", "",
      "Ahmet Yılmaz", "0532 111 11 11", "", ""];
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.aoa_to_sheet([IMPORT_HEADERS, ornek]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Müşteriler");
      XLSX.writeFile(wb, "ice-aktarma-sablonu.xlsx");
      flash("ok", "Excel şablonu indirildi. Doldurup geri yükleyin.");
    } catch {
      downloadCSV([IMPORT_HEADERS, ornek], "ice-aktarma-sablonu.csv");
      flash("ok", "Şablon (CSV) indirildi.");
    }
  };

  // CSV ayrıştırıcı (tırnak içi ; ve satır sonu destekli, ayraç ; veya ,)
  const parseCSV = (text) => {
    text = text.replace(/^\uFEFF/, "");
    const delim = (text.split("\n")[0].split(";").length >= text.split("\n")[0].split(",").length) ? ";" : ",";
    const rows = []; let row = []; let cur = ""; let inQ = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === delim) { row.push(cur); cur = ""; }
        else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
        else if (ch === "\r") { /* yoksay */ }
        else cur += ch;
      }
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim() !== ""));
  };

  const [importPreview, setImportPreview] = useState(null); // { customers:[], services:[], errors:[] }
  const trDate = (s) => {
    if (s == null || s === "") return "";
    // Date nesnesi (cellDates ile gelebilir) — UTC metotlarıyla oku (timezone kayması önle)
    if (s instanceof Date && !isNaN(s)) {
      return `${s.getUTCFullYear()}-${String(s.getUTCMonth() + 1).padStart(2, "0")}-${String(s.getUTCDate()).padStart(2, "0")}`;
    }
    s = String(s).trim();
    if (!s) return "";
    // Saat/zaman ekini at: "15.04.2024 00:00:00" veya "2024-04-15T00:00:00"
    s = s.split("T")[0].split(" ")[0].trim();
    // gg.aa.yyyy / gg/aa/yyyy / gg-aa-yyyy (tek hane de olur)
    let m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
    if (m) {
      let a = parseInt(m[1], 10), b = parseInt(m[2], 10);
      let yil = m[3];
      if (yil.length === 2) yil = (parseInt(yil, 10) > 50 ? "19" : "20") + yil; // 2 haneli yıl
      // Akıllı gün/ay tespiti: normalde gg.aa (Türkçe). Ama ilk sayı ≤12 ve ikinci >12 ise
      // Amerikan formatı (aa/gg) gelmiş demektir → yer değiştir.
      let gun = a, ay = b;
      if (a <= 12 && b > 12) { gun = b; ay = a; }
      return `${yil}-${String(ay).padStart(2, "0")}-${String(gun).padStart(2, "0")}`;
    }
    // yyyy-aa-gg / yyyy.aa.gg / yyyy/aa/gg
    m = s.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/);
    if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    // Excel seri numarası (örn. 45397 = 15.04.2024). 1900 tarih sistemi.
    if (/^\d{4,6}$/.test(s)) {
      const serial = parseInt(s, 10);
      if (serial > 0 && serial < 100000) {
        const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
        if (!isNaN(d)) return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      }
    }
    return "";
  };
  const moneyNum = (s) => {
    if (s == null) return 0;
    let t = String(s).replace(/[^0-9.,]/g, "").replace(/\./g, "").replace(/,/g, ".");
    const n = parseFloat(t); return isNaN(n) ? 0 : n;
  };

  // Satır dizisini (hücre dizileri) müşteri+servis kayıtlarına çevirir
  const rowsToRecords = (rows) => {
    const dataRows = rows.slice(1); // başlık atla
    const newCustomers = []; const newServices = []; const errors = [];
    let guncellenecek = 0; // mevcut kayıtların güncellenme sayısı
    let idc = Date.now();
    // Mevcut müşterileri eşleştirme için indeksle: seri no (öncelik) veya firma+model
    const bySerial = new Map();
    const byNameModel = new Map();
    (customers || []).forEach(c => {
      if (c.serialNo) bySerial.set(trLower(c.serialNo), c);
      byNameModel.set(trLower(c.name) + "|" + trLower(c.model || ""), c);
    });
    dataRows.forEach((r, idx) => {
      const cell = (i) => (r[i] == null ? "" : String(r[i]).trim());
      const name = cell(2);
      if (!name) { errors.push(`Satır ${idx + 2}: Satın Alan Firma boş, atlandı.`); return; }
      // Makina Kalıp Çapı (index 8): "50 x 80 x 115" → {en, boy, yukseklik}
      const capRaw = cell(8);
      let kalipCapi = undefined;
      if (capRaw) {
        const parts = capRaw.split(/[x×*]/i).map(p => p.trim());
        kalipCapi = { en: parts[0] || "", boy: parts[1] || "", yukseklik: parts[2] || "" };
      }
      // Para birimi (index 9): TL/TRY → TRY, USD/$ → USD, EUR/€ → EUR
      const curRaw = trLower(cell(9));
      let currency = "TRY";
      if (curRaw.includes("usd") || curRaw.includes("dolar") || curRaw.includes("$")) currency = "USD";
      else if (curRaw.includes("eur") || curRaw.includes("euro") || curRaw.includes("€")) currency = "EUR";
      // Satış tipi (index 10): metin → normalize. Boşsa fatura bedeline göre tahmin et.
      const tipRaw = cell(10);
      let satisTipi = tipRaw ? normalizeSaleType(tipRaw) : null;
      const kaliplarRaw = cell(11).split(/[;,]/).map(x => x.trim()).filter(Boolean);
      const kaliplar = kaliplarRaw.map(ad => ({ ad, olcu: "" }));
      const installDate = trDate(r[12]);
      const warrantyEnd = trDate(r[13]);
      const gercekBedel = moneyNum(cell(14));
      const faturaBedeli = moneyNum(cell(15));
      const serialNo = cell(19);
      // Satış tipi boşsa: fatura varsa Faturalı Yurtiçi, yoksa Faturasız Yurtiçi (geriye uyumlu tahmin)
      if (!satisTipi) satisTipi = faturaBedeli > 0 ? "Faturalı Yurtiçi" : "Faturasız Yurtiçi";
      // Mevcut kayıtla eşleştir: önce seri no, sonra firma+model
      let mevcut = null;
      if (serialNo && bySerial.has(trLower(serialNo))) mevcut = bySerial.get(trLower(serialNo));
      else if (byNameModel.has(trLower(name) + "|" + trLower(cell(7)))) mevcut = byNameModel.get(trLower(name) + "|" + trLower(cell(7)));
      const cid = mevcut ? mevcut.id : (++idc); // mevcutsa ID'sini koru (güncelle), değilse yeni
      if (mevcut) guncellenecek++;
      newCustomers.push({
        id: cid,
        kalipSayisi: parseInt(cell(0), 10) || kaliplar.length || 1,
        satisYapan: cell(1) || "Altuntaş Makina",
        name, phone: cell(3), email: mevcut?.email || "",
        adres: cell(4), country: cell(5) || "Türkiye", city: cell(6),
        model: cell(7), currency, kaliplar,
        ...(kalipCapi ? { kalipCapi } : {}),
        installDate, warrantyEnd,
        faturali: satisTipi,
        faturaBedeli, fabrikaSatisBedeli: gercekBedel || faturaBedeli,
        komisyon: moneyNum(cell(16)), extraKalipFiyati: moneyNum(cell(17)), kalanBorc: moneyNum(cell(18)),
        serialNo, aciklama: cell(20),
        yetkili1Ad: cell(27) || mevcut?.yetkili1Ad || "", yetkili1Tel: cell(28) || mevcut?.yetkili1Tel || "",
        yetkili2Ad: cell(29) || mevcut?.yetkili2Ad || "", yetkili2Tel: cell(30) || mevcut?.yetkili2Tel || "",
        // Seri no boşsa "bekliyor" işareti (sonradan girilmesi için hatırlatma)
        ...(serialNo ? { seriNoBekliyor: false } : { seriNoBekliyor: true }),
        ...(mevcut?.isResale ? { isResale: mevcut.isResale, prevOwners: mevcut.prevOwners } : {}),
        _mevcut: !!mevcut, // güncelleme mi, yeni mi
      });
      [[21, 22], [23, 24], [25, 26]].forEach(([dt, isk]) => {
        const d = trDate(r[dt]); const isi = cell(isk);
        if (d || isi) {
          newServices.push({
            id: ++idc, customerId: cid, type: "Periyodik Bakım", repairPlace: "Yerinde Onarım",
            yapilanIsler: isi, musteriTalimati: "", servisUcreti: 0, date: d || "", tech: "", currency: "TRY",
            _mevcutMusteri: !!mevcut,
          });
        }
      });
    });
    return { customers: newCustomers, services: newServices, errors, guncellenecek };
  };

  const handleImportFile = (file) => {
    const name = (file.name || "").toLowerCase();
    const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let rows;
        if (isExcel) {
          // SheetJS ile Excel oku
          const XLSX = await import("xlsx");
          const data = new Uint8Array(e.target.result);
          // Tarihleri METİN olarak oku (cellDates timezone kaymasına yol açıyordu)
          const wb = XLSX.read(data, { type: "array", cellDates: false });
          const ws = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "", dateNF: "dd.mm.yyyy" });
        } else {
          rows = parseCSV(e.target.result);
        }
        rows = rows.filter(r => Array.isArray(r) && r.some(x => String(x).trim() !== ""));
        if (rows.length < 2) { flash("err", "Dosyada veri bulunamadı."); return; }
        const result = rowsToRecords(rows);
        setImportPreview(result);
      } catch (err) {
        flash("err", "Dosya okunamadı: " + err.message);
      }
    };
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file, "UTF-8");
  };

  const applyImport = () => {
    if (!importPreview) return;
    if (window.__importApplying) return;
    window.__importApplying = true;
    const impCustomers = importPreview.customers;
    const impServices = importPreview.services;
    bumpId(impCustomers, impServices);
    // Mevcut kayıtları GÜNCELLE, yenileri EKLE (seri no/firma eşleşmesine göre)
    setCustomers(p => {
      const guncelMap = new Map();
      impCustomers.forEach(c => { const { _mevcut, ...clean } = c; guncelMap.set(c.id, clean); });
      // Önce mevcutları güncelle
      const guncellenmis = p.map(c => guncelMap.has(c.id) ? { ...c, ...guncelMap.get(c.id) } : c);
      // Sonra yeni olanları (mevcut listede id'si olmayan) başa ekle
      const mevcutIds = new Set(p.map(c => c.id));
      const yeniler = impCustomers.filter(c => !mevcutIds.has(c.id)).map(c => { const { _mevcut, ...clean } = c; return clean; });
      return [...yeniler, ...guncellenmis];
    });
    if (impServices.length && setServices) {
      // Yalnızca YENİ müşterilerin servislerini ekle (mevcut müşterininkiler zaten var, çiftlenmesin)
      setServices(p => {
        const mevcutIds = new Set(p.map(s => s.id));
        const yeni = impServices
          .filter(s => !s._mevcutMusteri && !mevcutIds.has(s.id))
          .map(s => { const { _mevcutMusteri, ...clean } = s; return clean; });
        return [...yeni, ...p];
      });
    }
    const yeniSayi = impCustomers.filter(c => !c._mevcut).length;
    const guncelSayi = importPreview.guncellenecek || 0;
    flash("ok", `${yeniSayi} yeni müşteri eklendi, ${guncelSayi} mevcut müşteri güncellendi.`);
    setImportPreview(null);
    setTimeout(() => { window.__importApplying = false; }, 800);
  };


  // ── Uygulama güncellemesi (electron-updater) ──
  // idle | checking | uptodate | available | downloading | downloaded | error | devmode
  const [appUpd, setAppUpd] = useState({ state: "idle", latest: null, progress: 0, error: null });

  useEffect(() => {
    if (!window.appUpdater) return;
    const offA = window.appUpdater.onAvailable((v) => setAppUpd(p => ({ ...p, state: "available", latest: v })));
    const offP = window.appUpdater.onProgress((pct) => setAppUpd(p => ({ ...p, state: "downloading", progress: pct })));
    const offD = window.appUpdater.onDownloaded(() => setAppUpd(p => ({ ...p, state: "downloaded" })));
    const offE = window.appUpdater.onError((m) => setAppUpd(p => ({ ...p, state: "error", error: m })));
    return () => {
      if (typeof offA === "function") offA();
      if (typeof offP === "function") offP();
      if (typeof offD === "function") offD();
      if (typeof offE === "function") offE();
    };
  }, []);

  const [askInstall, setAskInstall] = useState(false); // "yüklensin mi?" onay penceresi
  const [confirmUninstall, setConfirmUninstall] = useState(false);

  // ── E-posta (Yandex SMTP) ──
  const [mailStatus, setMailStatus] = useState({ configured: false, email: "" });
  const [mailForm, setMailForm] = useState({ email: "", appPassword: "" });
  const [mailSaving, setMailSaving] = useState(false);
  const [mailTest, setMailTest] = useState({ state: "idle", error: null }); // idle | testing | ok | error
  const [confirmClearMail, setConfirmClearMail] = useState(false);

  const loadMailStatus = async () => {
    if (!window.appMail) return;
    const s = await window.appMail.credentialsStatus();
    setMailStatus(s);
    setMailForm(p => ({ ...p, email: s.email || p.email }));
  };
  useEffect(() => { loadMailStatus(); }, []);

  const saveMailCreds = async () => {
    if (!window.appMail) return;
    if (!EMAIL_RE.test(mailForm.email || "")) { flash("err", "Geçerli bir e-posta adresi girin."); return; }
    if (!mailForm.appPassword?.trim()) { flash("err", "Uygulama parolası girilmedi."); return; }
    setMailSaving(true);
    const res = await window.appMail.saveCredentials(mailForm.email.trim(), mailForm.appPassword.trim());
    setMailSaving(false);
    if (res?.ok) {
      flash("ok", "E-posta hesabı bağlandı.");
      setMailForm(p => ({ ...p, appPassword: "" }));
      setMailTest({ state: "idle", error: null });
      loadMailStatus();
    } else {
      flash("err", res?.error || "Kaydedilemedi.");
    }
  };

  const doTestMail = async () => {
    if (!window.appMail) return;
    setMailTest({ state: "testing", error: null });
    const res = await window.appMail.test();
    setMailTest(res?.ok ? { state: "ok", error: null } : { state: "error", error: res?.error || "Bağlantı doğrulanamadı." });
  };

  const doClearMail = async () => {
    if (!window.appMail) return;
    await window.appMail.clearCredentials();
    setConfirmClearMail(false);
    setMailForm({ email: "", appPassword: "" });
    setMailTest({ state: "idle", error: null });
    loadMailStatus();
    flash("ok", "E-posta bağlantısı kaldırıldı.");
  };

  const checkAppUpdate = async () => {
    if (!window.appUpdater) { setAppUpd({ state: "devmode", latest: null, progress: 0, error: null }); return; }
    setAppUpd({ state: "checking", latest: null, progress: 0, error: null });
    const res = await window.appUpdater.check();
    if (res?.error === "dev-mode") setAppUpd(p => ({ ...p, state: "devmode" }));
    else if (res?.error) setAppUpd(p => ({ ...p, state: "error", error: res.error }));
    else if (res?.available) {
      setAppUpd(p => ({ ...p, state: "available", latest: res.latest }));
      setAskInstall(true); // güncelleme bulundu → kullanıcıya sor
    }
    else setAppUpd(p => ({ ...p, state: "uptodate" }));
  };

  const startUpdate = async () => {
    setAskInstall(false);
    setAppUpd(p => ({ ...p, state: "downloading", progress: 0 }));
    await window.appUpdater.download();
    // indirme bitince onDownloaded tetiklenir → otomatik kurulum + yeniden başlatma
  };

  // İndirme tamamlanınca OTOMATİK kur ve yeniden başlat
  useEffect(() => {
    if (appUpd.state === "downloaded" && window.appUpdater) {
      const t = setTimeout(() => window.appUpdater.install(), 1500);
      return () => clearTimeout(t);
    }
  }, [appUpd.state]);

  const doUninstall = async () => {
    setConfirmUninstall(false);
    if (window.appControl?.uninstall) {
      const ok = await window.appControl.uninstall();
      if (!ok) flash("err", "Kaldırma aracı bulunamadı. Denetim Masası'ndaki Programlar bölümünden kaldırabilirsiniz.");
    } else {
      flash("err", "Bu özellik yalnızca kurulu uygulamada çalışır.");
    }
  };

  // ── Yedek Al ──
  const doBackup = async () => {
    const data = { app: BACKUP_APP_TAG, schemaVersion: BACKUP_SCHEMA_VERSION, version, exportDate: today(), customers, services, dealers, stock, customModels, standardModels, factory, kalipDefs, notes, parts, partSales, payments };
    try {
      if (window.crmStorage?.backup) {
        const ok = await window.crmStorage.backup(data);
        if (ok) flash("ok", "Yedek başarıyla kaydedildi.");
      } else {
        // Tarayıcı modu: dosya olarak indir
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `altunmak-crm-yedek-${today()}.json`;
        a.click();
        flash("ok", "Yedek dosyası indirildi.");
      }
    } catch (err) {
      flash("err", "Yedek alınamadı: " + err.message);
    }
  };

  // ── Yedek Yükle ──
  const doRestore = async () => {
    try {
      if (window.crmStorage?.restore) {
        const data = await window.crmStorage.restore();
        if (!data) return;
        if (!looksLikeBackup(data)) { flash("err", "Seçilen dosya geçerli bir Altunmak CRM yedeği değil."); return; }
        setRestoreData(data);
      } else {
        // Tarayıcı modu: dosya seçici
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json";
        input.onchange = (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            let parsed;
            try { parsed = JSON.parse(reader.result); }
            catch { flash("err", "Dosya okunamadı — geçerli bir yedek değil."); return; }
            if (!looksLikeBackup(parsed)) { flash("err", "Seçilen dosya geçerli bir Altunmak CRM yedeği değil."); return; }
            setRestoreData(parsed);
          };
          reader.readAsText(file);
        };
        input.click();
      }
    } catch (err) {
      flash("err", "Yedek yüklenemedi: " + err.message);
    }
  };

  const applyRestore = () => {
    if (Array.isArray(restoreData?.customers)) setCustomers(restoreData.customers);
    if (Array.isArray(restoreData?.services)) setServices(restoreData.services);
    if (Array.isArray(restoreData?.dealers)) setDealers(restoreData.dealers);
    if (Array.isArray(restoreData?.stock) && setStock) setStock(restoreData.stock);
    if (Array.isArray(restoreData?.kalipDefs) && setKalipDefs) setKalipDefs(restoreData.kalipDefs);
    if (Array.isArray(restoreData?.customModels)) setCustomModels(restoreData.customModels);
    if (Array.isArray(restoreData?.standardModels)) setStandardModels(restoreData.standardModels);
    if (restoreData?.factory) setFactory(restoreData.factory);
    if (Array.isArray(restoreData?.notes) && setNotes) setNotes(restoreData.notes);
    if (Array.isArray(restoreData?.parts) && setParts) setParts(restoreData.parts);
    if (Array.isArray(restoreData?.partSales) && setPartSales) setPartSales(restoreData.partSales);
    if (Array.isArray(restoreData?.payments) && setPayments) setPayments(restoreData.payments);
    setRestoreData(null);
    flash("ok", "Yedek başarıyla yüklendi. Veriler geri getirildi.");
  };

  const [settingsTab, setSettingsTab] = useState("app"); // "app" | "models"

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Ayarlar</h2>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* SOL DİKEY MENÜ — gruplu */}
        <div style={{ width: 220, flexShrink: 0, minWidth: 200 }}>
          {[
            { grup: "Genel", items: [{ id: "app", label: "Uygulama", icon: "settings" }] },
            { grup: "Entegrasyonlar", items: [{ id: "eposta", label: "E-posta Ayarları", icon: "mail" }] },
            { grup: "Veri Yönetimi", items: [{ id: "export", label: "Dışa Aktar", icon: "download" }, { id: "import", label: "İçe Aktar", icon: "box" }] },
            { grup: "Tanımlar", items: [{ id: "models", label: "Makina Modelleri", icon: "machine" }, { id: "kaliplar", label: "Kalıp Modelleri", icon: "box" }, { id: "yedekparca", label: "Yedek Parça", icon: "parts" }, { id: "kdv", label: "KDV Oranı", icon: "settings" }] },
          ].map(g => (
            <div key={g.grup} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .6, marginBottom: 8, paddingLeft: 6 }}>{g.grup}</div>
              {g.items.map(st => {
                const active = settingsTab === st.id;
                return (
                  <button key={st.id} onClick={() => setSettingsTab(st.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                      padding: "10px 14px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
                      border: "none", marginBottom: 4,
                      background: active ? "#e85d1a" : "transparent",
                      color: active ? "#fff" : "#475569",
                      boxShadow: active ? "0 2px 8px rgba(232,93,26,.3)" : "none",
                      transition: "background .15s",
                    }}>
                    <Icon name={st.icon} size={16} />
                    {st.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* SAĞ İÇERİK */}
        <div style={{ flex: 1, minWidth: 320, maxWidth: 760 }}>
      {msg && (
        <div style={{ maxWidth: 720, marginBottom: 16, padding: "12px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: msg.type === "ok" ? "#d1fae5" : "#fee2e2", color: msg.type === "ok" ? "#065f46" : "#991b1b" }}>
          {msg.text}
        </div>
      )}

      {settingsTab === "app" && (<>
      {/* ── Uygulama Güncellemesi ── */}
      <Section title="Uygulama Güncellemesi" icon="refresh">
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
          Kurulu sürüm: <b style={{ color: "#0f172a" }}>v{version}</b>. Yeni bir sürüm yayınlandığında buradan
          tek tıkla indirip kurabilirsiniz. Verileriniz korunur.
        </div>

        {appUpd.state === "idle" && (
          <Btn onClick={checkAppUpdate}><Icon name="refresh" size={15} /> Yeni Sürüm Denetle</Btn>
        )}
        {appUpd.state === "checking" && (
          <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Denetleniyor...</div>
        )}
        {appUpd.state === "uptodate" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#065f46", background: "#d1fae5", padding: "6px 14px", borderRadius: 10 }}>✓ Uygulama güncel</span>
            <Btn small variant="ghost" onClick={checkAppUpdate}><Icon name="refresh" size={12} /> Tekrar Denetle</Btn>
          </div>
        )}
        {appUpd.state === "available" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e", background: "#fef3c7", padding: "6px 14px", borderRadius: 10 }}>
              Yeni sürüm hazır: v{appUpd.latest}
            </span>
            <Btn onClick={() => setAskInstall(true)}><Icon name="download" size={15} /> Yükle</Btn>
          </div>
        )}
        {appUpd.state === "downloading" && (
          <div style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>İndiriliyor... %{appUpd.progress}</div>
            <div style={{ height: 8, background: "#f1f5f9", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: 8, width: `${appUpd.progress}%`, background: "#e85d1a", borderRadius: 6, transition: "width .3s" }} />
            </div>
          </div>
        )}
        {appUpd.state === "downloaded" && (
          <span style={{ fontSize: 13, fontWeight: 700, color: "#065f46", background: "#d1fae5", padding: "6px 14px", borderRadius: 10 }}>
            ✓ İndirildi — uygulama yeniden başlatılıyor...
          </span>
        )}
        {appUpd.state === "error" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#991b1b", background: "#fee2e2", padding: "6px 14px", borderRadius: 10 }}>
              Denetlenemedi: {appUpd.error}
            </span>
            <Btn small variant="ghost" onClick={checkAppUpdate}><Icon name="refresh" size={12} /> Tekrar Dene</Btn>
          </div>
        )}
        {appUpd.state === "devmode" && (
          <div style={{ fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "10px 14px", borderRadius: 10, border: "1px dashed #e2e8f0" }}>
            Bu özellik yalnızca kurulu (Setup ile yüklenmiş) uygulamada çalışır — geliştirme modunda ve tarayıcıda devre dışıdır.
          </div>
        )}
      </Section>

      {/* ── Yedekleme ── */}
      <Section title="Yedekleme" icon="download">
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
          Tüm müşteri ve servis kayıtlarınızı tek bir dosya olarak kaydedin. Yedek dosyasını güvenli bir yerde
          (USB bellek, bulut depolama) saklamanızı öneririz. Geri yükleme yaptığınızda mevcut veriler yedekteki verilerle değiştirilir.
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn onClick={doBackup}><Icon name="download" size={15} /> Yedek Al</Btn>
          <Btn variant="ghost" onClick={doRestore}><Icon name="upload" size={15} /> Yedekten Geri Yükle</Btn>
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 14 }}>
          Mevcut veri: {customers.length} müşteri · {dealers.length} bayi · {services.length} servis kaydı
        </div>

        {/* ── Otomatik Yedekleme ── */}
        <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 20, paddingTop: 20 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 14 }}>
            <input type="checkbox" checked={appSettings.autoBackup}
              onChange={e => setAppSettings(p => ({ ...p, autoBackup: e.target.checked }))}
              style={{ width: 18, height: 18, accentColor: "#e85d1a", cursor: "pointer" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Otomatik Yedekleme</span>
          </label>

          {appSettings.autoBackup && (
            <div style={{ paddingLeft: 28 }}>
              {!window.crmStorage?.chooseFolder ? (
                <div style={{ fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "10px 14px", borderRadius: 10, border: "1px dashed #e2e8f0" }}>
                  Otomatik yedekleme yalnızca kurulu uygulamada çalışır.
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                    <Btn small variant="ghost" onClick={async () => {
                      const folder = await window.crmStorage.chooseFolder();
                      if (folder) setAppSettings(p => ({ ...p, backupFolder: folder }));
                    }}>📁 Klasör Seç</Btn>
                    <span style={{ fontSize: 12, color: appSettings.backupFolder ? "#0f172a" : "#94a3b8", fontFamily: "monospace", wordBreak: "break-all" }}>
                      {appSettings.backupFolder || "Henüz klasör seçilmedi"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Sıklık:</span>
                    <select value={appSettings.frequency}
                      onChange={e => setAppSettings(p => ({ ...p, frequency: e.target.value }))}
                      style={{ padding: "6px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#f8fafc" }}>
                      <option value="daily">Her gün</option>
                      <option value="weekly">Her hafta</option>
                      <option value="monthly">Her ay</option>
                    </select>
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    {appSettings.lastBackup
                      ? `Son otomatik yedek: ${appSettings.lastBackup}`
                      : "Henüz otomatik yedek alınmadı — klasör seçildiğinde ilk yedek hemen alınır."}
                    {" "}Yedekler uygulama açılışında, vakti geldiyse otomatik yazılır.
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* ── Uygulamayı Kaldır ── */}
      {/* ── Tehlikeli Bölge ── */}
      <div style={{ marginTop: 28, border: "1.5px solid #fecaca", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ background: "#fef2f2", padding: "12px 18px", borderBottom: "1px solid #fecaca", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="trash" size={16} />
          <span style={{ fontSize: 14, fontWeight: 800, color: "#b91c1c" }}>DİKKAT</span>
        </div>
        <div style={{ padding: "18px 20px" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>Uygulamayı Kaldır</div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
            Uygulamayı bilgisayarınızdan kaldırır. <b>Müşteri ve servis verileriniz silinmez.</b> Uygulamayı
            tekrar kurarsanız kayıtlarınız geri gelir. Kaldırmadan önce yedek almanız önerilir.
          </div>
          <Btn variant="danger" onClick={() => setConfirmUninstall(true)}><Icon name="trash" size={15} /> Uygulamayı Kaldır</Btn>
        </div>
      </div>
      </>)}

      {settingsTab === "models" && (
        <Section title="Makina Modelleri" icon="machine">
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
            Buradaki modeller, Yeni Müşteri ve Makina Geçmişi ekranlarındaki model seçiminde görünür.
            Standart modeller düzenlenebilir ama silinemez; özel modeller hem düzenlenip hem silinebilir.
          </div>
          <ModelsManager showToast={showToast} standardModels={standardModels} setStandardModels={setStandardModels}
            customModels={customModels} setCustomModels={setCustomModels} />
        </Section>
      )}

      {settingsTab === "kaliplar" && (
        <Section title="Kalıp Modelleri" icon="box">
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
            Buraya eklediğiniz kalıplar, Yeni Müşteri ekranındaki <b>Kalıp</b> seçiminde listelenir. Ölçü, müşteri eklerken elle girilir.
          </div>
          <KalipManager kalipDefs={kalipDefs} setKalipDefs={setKalipDefs} showToast={showToast} />
        </Section>
      )}

      {settingsTab === "yedekparca" && (
        <Section title="Yedek Parça Tanımları" icon="parts">
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
            Verdiğiniz/sattığınız yedek parçaları buraya tanımlayın. Bunlar, Müşteriler'de bir müşterinin detayını açtığınızda "Değişen Parçalar" seçilirken listelenir. Fiyat ve para birimi seçim sırasında girilir. Kalıplar buraya eklenmez; onlar <b>Kalıp Modelleri</b>'nden gelir ve müşteri detayındaki "Extra Kalıp Satışı" ile satılır.
          </div>
          <PartManager parts={parts} setParts={setParts} showToast={showToast} />
        </Section>
      )}

      {settingsTab === "kdv" && (
        <Section title="KDV Oranı" icon="settings">
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
            Faturalı yurt içi satışlarda uygulanan KDV oranı. Değiştirirseniz finans raporundaki KDV hesabı bu orana göre güncellenir.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", width: 120 }}>
              <input type="number" min="0" max="100" step="1"
                value={appSettings.kdvRate ?? DEFAULT_KDV_RATE}
                onChange={e => setAppSettings(s => ({ ...s, kdvRate: e.target.value === "" ? "" : Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) }))}
                style={{ padding: "9px 32px 9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 15, fontWeight: 700, background: "#f8fafc", outline: "none" }} />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontWeight: 700 }}>%</span>
            </div>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Varsayılan: %{DEFAULT_KDV_RATE}</span>
          </div>
        </Section>
      )}

      {settingsTab === "eposta" && (
        <Section title="E-posta Ayarları (Yandex SMTP)" icon="mail">
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
            Müşteri detayındaki "E-posta Gönder" butonlarının çalışması için buradan Yandex Mail hesabınızı bağlayın.
            Yandex, normal e-posta şifrenizle SMTP girişine izin vermez — hesabınızda iki adımlı doğrulamayı açıp
            <b> Hesap → Güvenlik → Uygulama Parolaları</b> bölümünden bu uygulama için özel bir "uygulama parolası"
            oluşturmanız gerekir. Aşağıya normal şifrenizi değil, o uygulama parolasını girin.
          </div>

          {!window.appMail ? (
            <div style={{ fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "10px 14px", borderRadius: 10, border: "1px dashed #e2e8f0" }}>
              Bu özellik yalnızca kurulu uygulamada çalışır.
            </div>
          ) : (
            <>
              {mailStatus.configured && (
                <div style={{ fontSize: 13, fontWeight: 700, color: "#065f46", background: "#d1fae5", padding: "8px 14px", borderRadius: 10, marginBottom: 16, display: "inline-block" }}>
                  ✓ Bağlı: {mailStatus.email}
                </div>
              )}
              <Field label="Yandex E-posta">
                <Input value={mailForm.email} onChange={e => setMailForm(p => ({ ...p, email: e.target.value }))} placeholder="ornek@firma.com" />
                <Warn>{mailForm.email && !EMAIL_RE.test(mailForm.email) ? "Geçersiz e-posta formatı" : ""}</Warn>
              </Field>
              <Field label="Uygulama Parolası">
                <Input type="password" value={mailForm.appPassword} onChange={e => setMailForm(p => ({ ...p, appPassword: e.target.value }))} placeholder={mailStatus.configured ? "•••••••• (değiştirmek için yeniden girin)" : "Yandex uygulama parolası"} />
              </Field>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Btn onClick={saveMailCreds} disabled={mailSaving}><Icon name="check" size={14} /> {mailSaving ? "Kaydediliyor..." : "Kaydet"}</Btn>
                <Btn variant="ghost" onClick={doTestMail} disabled={!mailStatus.configured || mailTest.state === "testing"}>
                  <Icon name="refresh" size={14} /> {mailTest.state === "testing" ? "Test ediliyor..." : "Bağlantıyı Test Et"}
                </Btn>
                {mailStatus.configured && (
                  <Btn variant="danger" onClick={() => setConfirmClearMail(true)}><Icon name="trash" size={14} /> Bağlantıyı Kaldır</Btn>
                )}
              </div>
              {mailTest.state === "ok" && (
                <div style={{ fontSize: 13, fontWeight: 600, color: "#065f46", marginTop: 12 }}>✓ Bağlantı başarılı.</div>
              )}
              {mailTest.state === "error" && (
                <div style={{ fontSize: 13, fontWeight: 600, color: "#991b1b", marginTop: 12 }}>✗ {mailTest.error}</div>
              )}
            </>
          )}
        </Section>
      )}

      {settingsTab === "export" && (
        <Section title="Dışa Aktar (Excel / CSV)" icon="download">
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 18, lineHeight: 1.6 }}>
            Verilerinizi Excel'de açılabilen dosya olarak indirin. Türkçe karakterler korunur; dosyayı Excel'de çift tıklayarak açabilirsiniz.
          </div>

          {/* Tümünü indir — içe aktarma şablonu formatında (geri yüklenebilir) */}
          <div style={{ background: "linear-gradient(135deg, #e85d1a, #f59e0b)", borderRadius: 12, padding: "20px 22px", marginBottom: 18, color: "#fff" }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Tüm Kayıtları İndir (Şablon Formatı)</div>
            <div style={{ fontSize: 12.5, marginBottom: 14, lineHeight: 1.5, opacity: .95 }}>
              Tüm müşteriler ve servis geçmişleri tek Excel dosyasında, <b>içe aktarma şablonuyla aynı sütun düzeninde</b>. Bu dosyayı düzenleyip tekrar İçe Aktar'dan yükleyebilirsiniz. ({customers.length} müşteri)
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => exportAllTemplate("download")}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", background: "#fff", color: "#e85d1a", border: "none" }}>
                <Icon name="download" size={14} /> Tümünü İndir
              </button>
              <button onClick={() => exportAllTemplate("email")}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.5)" }}>
                <Icon name="mail" size={14} /> E-posta Gönder
              </button>
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 14, textTransform: "uppercase", letterSpacing: .5 }}>Ayrı Raporlar</div>
          {[
            { group: "Müşteri & Servis", items: [
              { title: "Müşteri Listesi", desc: `Tüm müşteriler, makina ve fatura bilgileriyle (${customers.length} kayıt).`, onClick: exportCustomers },
              { title: "Servis Kayıtları", desc: `Tüm servis talepleri (${services.length} kayıt).`, onClick: exportServices },
              { title: "Extra Kalıp Satışları", desc: `Sonradan verilen/satılan kalıplar (${partSales.length} kayıt).`, onClick: exportPartSales },
              { title: "Ödemeler / Kapora", desc: `Tüm kapora/ödeme geçmişi (${payments.length} kayıt).`, onClick: exportPayments },
            ] },
            { group: "Finans", items: [
              { title: "Finans Özeti", desc: "Toplam satış, komisyon, servis geliri, net toplam ve kalan alacak.", onClick: exportFinance },
            ] },
            { group: "Diğer", items: [
              { title: "Bayiler", desc: `Tüm bayi/firma kayıtları (${dealers.length} kayıt).`, onClick: exportDealers },
              { title: "Stok", desc: `Satışı beklenen stoktaki makinalar (${stock.length} kayıt).`, onClick: exportStock },
              { title: "Notlar", desc: `Serbest notlar (${notes.length} kayıt).`, onClick: exportNotes },
              { title: "Yedek Parça Tanımları", desc: `Tanımlı yedek parça kataloğu (${parts.length} kayıt).`, onClick: exportParts },
            ] },
          ].map(g => (
            <div key={g.group} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>{g.group}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
                {g.items.map(card => (
                  <div key={card.title} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column" }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 6 }}>{card.title}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14, lineHeight: 1.5, flex: 1 }}>{card.desc}</div>
                    <div style={{ alignSelf: "flex-start", display: "flex", gap: 8 }}>
                      <Btn onClick={() => card.onClick("download")}><Icon name="download" size={14} /> İndir</Btn>
                      <Btn variant="ghost" onClick={() => card.onClick("email")}><Icon name="mail" size={14} /> E-posta</Btn>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>
      )}

      {settingsTab === "import" && (
        <Section title="İçe Aktar (Excel / CSV)" icon="box">
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
            Eski müşteri verilerinizi toplu olarak içe aktarın. <b>1)</b> Excel şablonunu indirin. <b>2)</b> Verilerinizi şablondaki sütun sırasına göre doldurun (Excel'de kaydedin, .xlsx olarak kalabilir). <b>3)</b> Aşağıdan yükleyin, önizlemeyi kontrol edip onaylayın. Hem Excel (.xlsx, .xls) hem CSV dosyaları desteklenir.
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <Btn variant="ghost" onClick={downloadTemplate}><Icon name="download" size={14} /> Boş Excel Şablonu İndir</Btn>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", background: "#e85d1a", color: "#fff" }}>
              <Icon name="plus" size={14} /> Excel / CSV Yükle
              <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
                onChange={e => { if (e.target.files[0]) handleImportFile(e.target.files[0]); e.target.value = ""; }} />
            </label>
          </div>

          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", fontSize: 12, color: "#92400e", lineHeight: 1.6 }}>
            <b>Şablon sütunları:</b> Kalıp Sayısı · Satış Yapan · Satın Alan Firma · Telefon · Adres · Ülke · Şehir · Model · <b>Makina Kalıp Çapı (en x boy x yükseklik)</b> · <b>Para Birimi (TL/USD/EUR)</b> · <b>Satış Tipi (Faturalı Yurtiçi/Yurtdışı/Faturasız Yurtiçi/Yurtdışı)</b> · Aldığı Kalıplar (noktalı virgülle ayırın) · <b>Satış Tarihi / Garanti Başlangıç</b> · Garanti Bitiş · <b>Fabrika Satış Bedeli</b> · Fatura Bedeli · Komisyon · Extra Kalıp Fiyatı · Kalan Borç · Seri No · Açıklama · Servis1 Tarih · Servis1 İş · Servis2... · Servis3...
          </div>
        </Section>
      )}
        </div>{/* /sağ içerik */}
      </div>{/* /flex kapsayıcı */}

      {importPreview && (
        <Modal wide title="İçe Aktarma Önizlemesi" onClose={() => setImportPreview(null)}>
          <div style={{ fontSize: 14, marginBottom: 16 }}>
            Toplam <b>{importPreview.customers.length}</b> kayıt bulundu:
            <b style={{ color: "#16a34a" }}> {importPreview.customers.filter(c => !c._mevcut).length} yeni</b> eklenecek,
            <b style={{ color: "#0891b2" }}> {importPreview.guncellenecek || 0} mevcut</b> güncellenecek.
            {importPreview.errors.length > 0 && <span style={{ color: "#dc2626" }}> · {importPreview.errors.length} satır atlandı.</span>}
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
              Not: Aynı seri numarasına (veya firma+model) sahip kayıtlar yeni eklenmez, mevcut kayıt güncellenir. Böylece çift kayıt olmaz.
            </div>
          </div>
          {importPreview.errors.length > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#991b1b", maxHeight: 100, overflowY: "auto" }}>
              {importPreview.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>İlk 5 kayıt önizlemesi:</div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ background: "#f8fafc" }}>
                {["Firma", "Model", "Seri No", "Garanti", "Fatura"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {importPreview.customers.slice(0, 5).map((c, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: "8px 12px" }}>{c.model || "—"}</td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{c.serialNo || "—"}</td>
                    <td style={{ padding: "8px 12px" }}>{c.warrantyEnd ? fmtTR(c.warrantyEnd) : "—"}</td>
                    <td style={{ padding: "8px 12px" }}>{c.faturaBedeli ? fmt(c.faturaBedeli) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
            Not: İçe aktarılan kayıtlar mevcut listeye <b>eklenir</b> (mevcut veriler silinmez). Tarihler gg.aa.yyyy formatında olmalıdır.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setImportPreview(null)}>İptal</Btn>
            <Btn onClick={applyImport}><Icon name="check" size={14} /> İçe Aktar ({importPreview.customers.length} kayıt)</Btn>
          </div>
        </Modal>
      )}

      {/* Güncelleme onayı */}
      {askInstall && (
        <Modal title="Güncelleme Bulundu" onClose={() => setAskInstall(false)}>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 8 }}>
            Yeni sürüm <b>v{appUpd.latest}</b> yayınlandı (kurulu: v{version}).
          </div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 20 }}>
            Şimdi yüklensin mi? Güncelleme indirildikten sonra uygulama <b>otomatik olarak yeniden başlatılacak</b>.
            Verileriniz korunur.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setAskInstall(false)}>Daha Sonra</Btn>
            <Btn onClick={startUpdate}><Icon name="download" size={14} /> Evet, Yükle</Btn>
          </div>
        </Modal>
      )}

      {/* Kaldırma onayı */}
      {confirmUninstall && (
        <Modal title="Uygulamayı Kaldır" onClose={() => setConfirmUninstall(false)}>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 8 }}>
            Altunmak CRM bilgisayarınızdan kaldırılacak ve uygulama kapanacak.
          </div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 20 }}>
            Verileriniz silinmez; tekrar kurulumda geri gelir. Devam etmeden önce
            yukarıdan <b>yedek almanız</b> önerilir.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setConfirmUninstall(false)}>Vazgeç</Btn>
            <Btn variant="danger" onClick={doUninstall}><Icon name="trash" size={14} /> Evet, Kaldır</Btn>
          </div>
        </Modal>
      )}

      {/* E-posta bağlantısını kaldırma onayı */}
      {confirmClearMail && (
        <Modal title="E-posta Bağlantısını Kaldır" onClose={() => setConfirmClearMail(false)}>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 20 }}>
            Kayıtlı Yandex hesabı bilgileri silinecek. "E-posta Gönder" butonları tekrar bağlanana kadar çalışmaz.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setConfirmClearMail(false)}>Vazgeç</Btn>
            <Btn variant="danger" onClick={doClearMail}><Icon name="trash" size={14} /> Evet, Kaldır</Btn>
          </div>
        </Modal>
      )}

      {/* Dışa aktarımı e-posta ile gönder — CSV/XLSX içerik otomatik ek olarak eklenir */}
      {exportMailDraft && (
        <Modal title="E-posta Gönder" onClose={() => setExportMailDraft(null)}>
          {!window.appMail ? (
            <div style={{ fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "10px 14px", borderRadius: 10, border: "1px dashed #e2e8f0" }}>
              Bu özellik yalnızca kurulu uygulamada çalışır.
            </div>
          ) : (
            <>
              <Field label="Kime">
                <Input value={exportMailDraft.to} onChange={e => setExportMailDraft(p => ({ ...p, to: e.target.value }))} placeholder="ornek@firma.com" />
                <Warn>{exportMailDraft.to && !EMAIL_RE.test(exportMailDraft.to) ? "Geçersiz e-posta formatı" : ""}</Warn>
              </Field>
              <Field label="Konu">
                <Input value={exportMailDraft.subject} onChange={e => setExportMailDraft(p => ({ ...p, subject: e.target.value }))} />
              </Field>
              <Field label="Mesaj">
                <textarea value={exportMailDraft.text} onChange={e => setExportMailDraft(p => ({ ...p, text: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 110, boxSizing: "border-box", fontFamily: "inherit" }} />
              </Field>
              <div style={{ fontSize: 11.5, color: "#94a3b8", marginBottom: 16 }}>📎 {exportMailDraft.attachmentFilename} otomatik ek olarak gönderilecek.</div>
              {exportMailSendState.state === "error" && (
                <div style={{ fontSize: 13, fontWeight: 600, color: "#991b1b", marginBottom: 12 }}>✗ {exportMailSendState.error}</div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn variant="ghost" onClick={() => setExportMailDraft(null)}>İptal</Btn>
                <Btn onClick={sendExportMail} disabled={exportMailSendState.state === "sending"}>
                  <Icon name="mail" size={14} /> {exportMailSendState.state === "sending" ? "Gönderiliyor..." : "Gönder"}
                </Btn>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Geri yükleme onayı */}
      {restoreData && (
        <Modal title="Yedeği Geri Yükle" onClose={() => setRestoreData(null)}>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, marginBottom: 8 }}>
            Yüklenecek yedek: <b>{Array.isArray(restoreData.customers) ? restoreData.customers.length : 0} müşteri</b>,{" "}
            <b>{Array.isArray(restoreData.dealers) ? restoreData.dealers.length : 0} bayi</b>, <b>{Array.isArray(restoreData.services) ? restoreData.services.length : 0} servis kaydı</b>
            {restoreData.exportDate ? ` (${restoreData.exportDate} tarihli)` : ""}.
          </div>
          {restoreData.schemaVersion > BACKUP_SCHEMA_VERSION && (
            <div style={{ fontSize: 13, color: "#b45309", fontWeight: 600, marginBottom: 8 }}>
              ⚠ Bu yedek, bu programın daha yeni bir sürümüyle alınmış. Bazı veriler düzgün yüklenmeyebilir.
            </div>
          )}
          <div style={{ fontSize: 13, color: "#dc2626", fontWeight: 600, marginBottom: 20 }}>
            ⚠ Mevcut tüm veriler bu yedekteki verilerle değiştirilecek. Bu işlem geri alınamaz.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setRestoreData(null)}>Vazgeç</Btn>
            <Btn variant="danger" onClick={applyRestore}><Icon name="check" size={14} /> Evet, Geri Yükle</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
