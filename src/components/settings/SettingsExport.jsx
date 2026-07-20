import { useState } from "react";
import { renderMailTemplate } from "../../lib/mailTemplates";
import { CURRENCIES, DEFAULT_KDV_RATES } from "../../lib/constants";
import { fmtTR, fmtKalipCapi, normalizeSaleType, isFaturali, calcKDV, extractKDV, parseMoney, kalipCount } from "../../lib/utils";
import { Icon, Btn } from "../ui";
import { Section } from "./Section";
import { buildCSV, downloadCSV, utf8ToBase64, downloadXlsx, xlsxToBase64, IMPORT_HEADERS } from "./csvUtils";
import { useMailSender, MailComposeModal } from "../MailCompose";

export const SettingsExport = ({ customers, services, dealers, stock, partSales, payments, notes, parts, faturalar = [], appSettings, factory = null, flash, teklifler = [], uretimFormlari = [], partStock = [], partStockLog = [], gorusmeler = [], serverPermissions = null }) => {
  const [exportTooltip, setExportTooltip] = useState(null); // tablodaki üzerine gelinen rapor başlığı (native title yerine elle çizilen tooltip)

  // ── Dışa aktarımları e-posta ile gönder (CSV/XLSX, içerik otomatik ek olarak eklenir) ──
  // Ortak e-posta hook'u (exportMail* adlarıyla aliaslanır — açılış/gönderim kodu değişmesin).
  const { mailDraft: exportMailDraft, setMailDraft: setExportMailDraft, mailSendState: exportMailSendState, setMailSendState: setExportMailSendState, sendMail: sendExportMailDraft } = useMailSender(serverPermissions);
  const [acikGruplar, setAcikGruplar] = useState(() => new Set()); // rapor grupları akordeon
  const exportSablon = (label) => renderMailTemplate(appSettings?.mailTemplates, "disaAktarim", {
    belge: label, firmaAdi: factory?.evrakFirmaAdi || factory?.name || "Altuntaş Makina",
  });
  const openExportMailCSV = (rows, filename, label) => {
    const sablon = exportSablon(label);
    setExportMailDraft({
      to: "", subject: sablon.konu, text: sablon.metin,
      attachmentBase64: utf8ToBase64(buildCSV(rows)), attachmentFilename: filename, mimeType: "text/csv;charset=utf-8",
    });
    setExportMailSendState({ state: "idle", error: null });
  };
  const openExportMailXLSXBase64 = (base64, filename, label) => {
    const sablon = exportSablon(label);
    setExportMailDraft({
      to: "", subject: sablon.konu, text: sablon.metin,
      attachmentBase64: base64, attachmentFilename: filename, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    setExportMailSendState({ state: "idle", error: null });
  };
  const sendExportMail = async () => {
    const res = await sendExportMailDraft({
      to: exportMailDraft.to, subject: exportMailDraft.subject, text: exportMailDraft.text,
      attachments: [{ filename: exportMailDraft.attachmentFilename, contentBase64: exportMailDraft.attachmentBase64, mimeType: exportMailDraft.mimeType }],
      type: "disaaktarim",
    });
    if (res?.ok) flash("ok", "E-posta gönderildi.");
  };
  const exportFinance = async (mode = "download") => {
    // 2. el devir olsa bile orijinal satışın bedeli sayılır (Finance.jsx ile tutarlı)
    const real = customers;
    const cur = (x) => (CURRENCIES.includes(x) ? x : "TRY");
    const e3 = () => ({ TRY: 0, USD: 0, EUR: 0 });
    const kdvRates = appSettings?.kdvRates ?? DEFAULT_KDV_RATES;
    const gercekCiro = e3(), toplamCiro = e3(), faturaliTutar = e3(), kdv = e3(), komisyon = e3(), extra = e3(), alacak = e3(), servisUc = e3();
    real.forEach(c => {
      const k = cur(c.currency);
      const tip = normalizeSaleType(c.faturali);
      const kdvTutar = calcKDV(tip, c.faturaBedeli, c.installDate, kdvRates);
      gercekCiro[k] += parseMoney(c.fabrikaSatisBedeli) || parseMoney(c.faturaBedeli);
      // Komisyon GİDER olarak çıkarılır (eklenmez) — Finance.jsx'teki Toplam Bedel ile tutarlı
      toplamCiro[k] += parseMoney(c.fabrikaSatisBedeli) + kdvTutar - parseMoney(c.komisyon);
      if (isFaturali(tip)) faturaliTutar[k] += parseMoney(c.faturaBedeli);
      kdv[k] += kdvTutar;
      komisyon[k] += parseMoney(c.komisyon);
      alacak[k] += parseMoney(c.kalanBorc);
    });
    services.filter(s => s.type === "Garanti Dışı" || s.type === "Periyodik Bakım").forEach(s => {
      const k = cur(s.currency);
      servisUc[k] += parseMoney(s.servisUcreti);
      if (k === "TRY") kdv[k] += extractKDV(s.servisUcreti, s.date, kdvRates);
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
      line("Toplam Bedel (Fabrika Bedeli + KDV - Komisyon)", toplamCiro),
      line("Faturalı Tutar (resmi)", faturaliTutar),
      line("Toplam KDV", kdv),
      line("Toplam Extra Kalıp Satışı", extra),
      line("Toplam Servis Ücreti", servisUc),
      line("Toplam Ödenen Komisyon", komisyon),
      line("NET GENEL TOPLAM", net),
      line("Kalan Alacak / Tahsil Edilecek", alacak),
    ];
    try {
      if (mode === "email") { const b64 = await xlsxToBase64(rows, "Finans"); openExportMailXLSXBase64(b64, "finans-ozeti.xlsx", "Finans Özeti"); return; }
      await downloadXlsx(rows, "finans-ozeti.xlsx", "Finans"); flash("ok", "Finans özeti Excel olarak indirildi.");
    } catch {
      if (mode === "email") { openExportMailCSV(rows, "finans-ozeti.csv", "Finans Özeti"); return; }
      downloadCSV(rows, "finans-ozeti.csv"); flash("ok", "Finans özeti Excel (CSV) olarak indirildi.");
    }
  };
  const exportCustomers = async (mode = "download") => {
    const head = ["Firma", "Telefon", "E-posta", "Ülke", "Şehir", "Adres", "Model", "Makina Kalıp Çapı", "Seri No", "Kalıplar", "Satış Tarihi", "Garanti Bitiş", "Satış Yapan", "Satış Tipi", "Para Birimi", "Fabrika Satış Bedeli", "Fatura Bedeli", "KDV", "Komisyon", "Extra Kalıp", "Kalan Borç", "2. El mi?", "Yetkili1 Ad", "Yetkili1 Telefon", "Yetkili2 Ad", "Yetkili2 Telefon", "Ödeme Planı", "Kaynak Teklif No", "Brüt Kg"];
    const curName = { TRY: "TL", USD: "USD", EUR: "EUR" };
    const kdvRates = appSettings?.kdvRates ?? DEFAULT_KDV_RATES;
    const rows = [head, ...customers.map(c => [
      c.name, c.phone, c.email, c.country, c.city, c.adres, c.model, fmtKalipCapi(c.kalipCapi), c.serialNo,
      (c.kaliplar || []).map(k => `${k.ad}${k.olcu ? " (" + k.olcu + ")" : ""}`).join(", "),
      c.installDate, c.warrantyEnd, c.satisYapan, normalizeSaleType(c.faturali),
      curName[CURRENCIES.includes(c.currency) ? c.currency : "TRY"],
      parseMoney(c.fabrikaSatisBedeli), parseMoney(c.faturaBedeli), calcKDV(c.faturali, c.faturaBedeli, c.installDate, kdvRates),
      parseMoney(c.komisyon), parseMoney(c.extraKalipFiyati), parseMoney(c.kalanBorc),
      c.isResale ? "Evet" : "Hayır",
      c.yetkili1Ad, c.yetkili1Tel, c.yetkili2Ad, c.yetkili2Tel,
      (c.odemePlani || []).map(r => `${r.vadeTarihi || "-"}: ${parseMoney(r.tutar)} (${r.odemeId ? "Ödendi" : "Bekliyor"})`).join("; "),
      c.fromTeklifId ? (teklifler.find(t => t.id === c.fromTeklifId)?.no || c.fromTeklifId) : "",
      c.brutKg ?? "",
    ])];
    try {
      if (mode === "email") { const b64 = await xlsxToBase64(rows, "Müşteriler"); openExportMailXLSXBase64(b64, "musteriler.xlsx", "Müşteri Listesi"); return; }
      await downloadXlsx(rows, "musteriler.xlsx", "Müşteriler"); flash("ok", "Müşteri listesi Excel olarak indirildi.");
    } catch {
      if (mode === "email") { openExportMailCSV(rows, "musteriler.csv", "Müşteri Listesi"); return; }
      downloadCSV(rows, "musteriler.csv"); flash("ok", "Müşteri listesi Excel (CSV) olarak indirildi.");
    }
  };
  const exportServices = async (mode = "download") => {
    const head = ["Müşteri", "Model", "Seri No", "Servis Türü", "Yapılan İşlem", "Tarih", "Teknisyen", "İşlemi Yapan Firma", "Dış Firma Yetkili", "Dış Firma Telefon", "Dış Firma Ülke", "Dış Firma Şehir", "Para Birimi", "Servis Ücreti", "Yapılan İşler", "Müşteri Talimatı"];
    const curName = { TRY: "TL", USD: "USD", EUR: "EUR" };
    const rows = [head, ...services.map(s => {
      const c = customers.find(x => x.id === s.customerId) || {};
      return [c.name, c.model, c.serialNo, s.type, s.repairPlace, s.date, s.tech,
        s.islemFirma === "Diğer" ? (s.islemFirmaAd || "Diğer") : s.islemFirma, s.islemFirmaYetkili, s.islemFirmaTel, s.islemFirmaUlke, s.islemFirmaSehir,
        curName[CURRENCIES.includes(s.currency) ? s.currency : "TRY"], parseMoney(s.servisUcreti), s.yapilanIsler, s.musteriTalimati];
    })];
    try {
      if (mode === "email") { const b64 = await xlsxToBase64(rows, "Servis"); openExportMailXLSXBase64(b64, "servis-kayitlari.xlsx", "Servis Kayıtları"); return; }
      await downloadXlsx(rows, "servis-kayitlari.xlsx", "Servis"); flash("ok", "Servis kayıtları Excel olarak indirildi.");
    } catch {
      if (mode === "email") { openExportMailCSV(rows, "servis-kayitlari.csv", "Servis Kayıtları"); return; }
      downloadCSV(rows, "servis-kayitlari.csv"); flash("ok", "Servis kayıtları Excel (CSV) olarak indirildi.");
    }
  };
  const exportDealers = async (mode = "download") => {
    const head = ["Bayi/Firma Adı", "Yetkili", "Telefon", "E-posta", "Adres", "Ülke", "Şehir", "Bayi mi", "Anlaşmalı Servis mi", "Not"];
    const rows = [head, ...dealers.map(d => [d.name, d.contact, d.phone, d.email, d.adres, d.country, d.city, d.bayiMi !== false ? "Evet" : "Hayır", d.anlasmaliServisMi ? "Evet" : "Hayır", d.note])];
    try {
      if (mode === "email") { const b64 = await xlsxToBase64(rows, "Bayiler"); openExportMailXLSXBase64(b64, "bayiler.xlsx", "Bayi Listesi"); return; }
      await downloadXlsx(rows, "bayiler.xlsx", "Bayiler"); flash("ok", "Bayi listesi Excel olarak indirildi.");
    } catch {
      if (mode === "email") { openExportMailCSV(rows, "bayiler.csv", "Bayi Listesi"); return; }
      downloadCSV(rows, "bayiler.csv"); flash("ok", "Bayi listesi Excel (CSV) olarak indirildi.");
    }
  };
  const exportStock = async (mode = "download") => {
    const head = ["Model", "Seri No", "Stoğa Giriş Tarihi", "Not"];
    const rows = [head, ...stock.map(s => [s.model, s.serialNo, s.addedDate, s.note])];
    try {
      if (mode === "email") { const b64 = await xlsxToBase64(rows, "Stok"); openExportMailXLSXBase64(b64, "stok.xlsx", "Stok Listesi"); return; }
      await downloadXlsx(rows, "stok.xlsx", "Stok"); flash("ok", "Stok listesi Excel olarak indirildi.");
    } catch {
      if (mode === "email") { openExportMailCSV(rows, "stok.csv", "Stok Listesi"); return; }
      downloadCSV(rows, "stok.csv"); flash("ok", "Stok listesi Excel (CSV) olarak indirildi.");
    }
  };
  const exportPartSales = async (mode = "download") => {
    const head = ["Müşteri", "Tür", "Kalıp/Parça Adı", "Ölçü", "Tarih", "Satış Yapan Firma", "Dış Firma Yetkili", "Dış Firma Telefon", "Dış Firma Ülke", "Dış Firma Şehir", "Para Birimi", "Ücret", "Ücretsiz mi?", "Fatura Tipi", "Ödendi mi?", "Kaynak Teklif No", "Üretim Formuna Gönder"];
    const curName = { TRY: "TL", USD: "USD", EUR: "EUR" };
    const rows = [head, ...partSales.map(p => {
      const c = customers.find(x => x.id === p.customerId) || {};
      return [c.name, p.tur, p.ad, p.olcu, p.tarih,
        p.satisFirma === "Diğer" ? (p.satisFirmaAd || "Diğer") : p.satisFirma, p.satisFirmaYetkili, p.satisFirmaTel, p.satisFirmaUlke, p.satisFirmaSehir,
        curName[CURRENCIES.includes(p.currency) ? p.currency : "TRY"],
        parseMoney(p.ucret), p.ucretsizMi ? "Evet" : "Hayır", p.faturaTipi, p.odendi ? "Evet" : "Hayır",
        p.teklifId ? (teklifler.find(t => t.id === p.teklifId)?.no || p.teklifId) : "",
        p.uretimFormGonder ? "Evet" : "Hayır"];
    })];
    try {
      if (mode === "email") { const b64 = await xlsxToBase64(rows, "Kalıp Satışları"); openExportMailXLSXBase64(b64, "extra-kalip-satislari.xlsx", "Extra Kalıp Satışları"); return; }
      await downloadXlsx(rows, "extra-kalip-satislari.xlsx", "Kalıp Satışları"); flash("ok", "Extra Kalıp satışları Excel olarak indirildi.");
    } catch {
      if (mode === "email") { openExportMailCSV(rows, "extra-kalip-satislari.csv", "Extra Kalıp Satışları"); return; }
      downloadCSV(rows, "extra-kalip-satislari.csv"); flash("ok", "Extra Kalıp satışları Excel (CSV) olarak indirildi.");
    }
  };
  const exportPayments = async (mode = "download") => {
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
    try {
      if (mode === "email") { const b64 = await xlsxToBase64(rows, "Ödemeler"); openExportMailXLSXBase64(b64, "odemeler.xlsx", "Ödemeler / Kapora"); return; }
      await downloadXlsx(rows, "odemeler.xlsx", "Ödemeler"); flash("ok", "Ödeme/kapora geçmişi Excel olarak indirildi.");
    } catch {
      if (mode === "email") { openExportMailCSV(rows, "odemeler.csv", "Ödemeler / Kapora"); return; }
      downloadCSV(rows, "odemeler.csv"); flash("ok", "Ödeme/kapora geçmişi Excel (CSV) olarak indirildi.");
    }
  };
  const exportNotes = async (mode = "download") => {
    const head = ["İçerik", "Güncellenme Tarihi"];
    const rows = [head, ...notes.map(n => [n.content, n.updatedAt])];
    try {
      if (mode === "email") { const b64 = await xlsxToBase64(rows, "Notlar"); openExportMailXLSXBase64(b64, "notlar.xlsx", "Notlar"); return; }
      await downloadXlsx(rows, "notlar.xlsx", "Notlar"); flash("ok", "Notlar Excel olarak indirildi.");
    } catch {
      if (mode === "email") { openExportMailCSV(rows, "notlar.csv", "Notlar"); return; }
      downloadCSV(rows, "notlar.csv"); flash("ok", "Notlar Excel (CSV) olarak indirildi.");
    }
  };
  const exportParts = async (mode = "download") => {
    const head = ["Yedek Parça Adı (TR)", "Adı (EN)", "Kod", "Tip", "Tanım (TR)", "Tanım (EN)", "Fiyat (TL)", "Fiyat (USD)", "Fiyat (EUR)"];
    const rows = [head, ...parts.map(p => [p.ad, p.adEN ?? "", p.kod ?? "", p.tip ?? "Standart", p.tanim ?? "", p.tanimEN ?? "", p.fiyatTRY ?? "", p.fiyatUSD ?? "", p.fiyatEUR ?? ""])];
    try {
      if (mode === "email") { const b64 = await xlsxToBase64(rows, "Yedek Parça"); openExportMailXLSXBase64(b64, "yedek-parca-tanimlari.xlsx", "Yedek Parça Tanımları"); return; }
      await downloadXlsx(rows, "yedek-parca-tanimlari.xlsx", "Yedek Parça"); flash("ok", "Yedek parça tanımları Excel olarak indirildi.");
    } catch {
      if (mode === "email") { openExportMailCSV(rows, "yedek-parca-tanimlari.csv", "Yedek Parça Tanımları"); return; }
      downloadCSV(rows, "yedek-parca-tanimlari.csv"); flash("ok", "Yedek parça tanımları Excel (CSV) olarak indirildi.");
    }
  };
  const exportFaturalar = async (mode = "download") => {
    const head = ["Fatura No", "Tarih", "Firma", "Ülke", "Şehir", "Para Birimi", "Ödeme Şekli", "Teslim Şekli", "Not"];
    const rows = [head, ...faturalar.map(f => [f.no, f.tarih, f.firma, f.ulke, f.sehir, f.currency, f.payment, f.delivery, f.not])];
    try {
      if (mode === "email") { const b64 = await xlsxToBase64(rows, "Faturalar"); openExportMailXLSXBase64(b64, "faturalar.xlsx", "Yurt Dışı Faturalar"); return; }
      await downloadXlsx(rows, "faturalar.xlsx", "Faturalar"); flash("ok", "Fatura listesi Excel olarak indirildi.");
    } catch {
      if (mode === "email") { openExportMailCSV(rows, "faturalar.csv", "Yurt Dışı Faturalar"); return; }
      downloadCSV(rows, "faturalar.csv"); flash("ok", "Fatura listesi Excel (CSV) olarak indirildi.");
    }
  };
  const exportTeklifler = async (mode = "download") => {
    const head = ["Teklif No", "Tarih", "Durum", "Tür", "Firma", "Ülke", "Şehir", "Para Birimi", "Not", "Satışa Dönüştü", "Takipten Kaldırıldı"];
    const rows = [head, ...teklifler.map(t => [
      t.no || "", t.tarih || "", t.durum || "", t.tur || "",
      t.firma || "", t.country || "", t.city || "", t.currency || "", t.not || "",
      t.satisTamam ? "Evet" : "Hayır", t.takipKapali ? "Evet" : "Hayır",
    ])];
    try {
      if (mode === "email") { const b64 = await xlsxToBase64(rows, "Teklifler"); openExportMailXLSXBase64(b64, "teklifler.xlsx", "Teklifler"); return; }
      await downloadXlsx(rows, "teklifler.xlsx", "Teklifler"); flash("ok", "Teklif listesi Excel olarak indirildi.");
    } catch {
      if (mode === "email") { openExportMailCSV(rows, "teklifler.csv", "Teklifler"); return; }
      downloadCSV(rows, "teklifler.csv"); flash("ok", "Teklif listesi CSV olarak indirildi.");
    }
  };
  const exportUretimFormlari = async (mode = "download") => {
    const head = ["Form No", "Tarih", "Ürün", "Model", "Miktar", "Durum", "Not"];
    const rows = [head, ...uretimFormlari.map(f => [
      f.no || f.id || "", f.tarih || f.date || "", f.urun || f.product || "",
      f.model || "", f.miktar || f.quantity || "", f.durum || f.status || "", f.not || f.note || "",
    ])];
    try {
      if (mode === "email") { const b64 = await xlsxToBase64(rows, "Üretim Formları"); openExportMailXLSXBase64(b64, "uretim-formlari.xlsx", "Üretim Formları"); return; }
      await downloadXlsx(rows, "uretim-formlari.xlsx", "Üretim Formları"); flash("ok", "Üretim formları Excel olarak indirildi.");
    } catch {
      if (mode === "email") { openExportMailCSV(rows, "uretim-formlari.csv", "Üretim Formları"); return; }
      downloadCSV(rows, "uretim-formlari.csv"); flash("ok", "Üretim formları CSV olarak indirildi.");
    }
  };
  const exportGorusmeler = async (mode = "download") => {
    const head = ["Tarih", "Müşteri", "Tür", "Not", "Takip Tarihi", "Tamamlandı", "Kullanıcı"];
    const custName = (id) => customers.find(c => c.id === id)?.name || "";
    const rows = [head, ...gorusmeler.filter(g => !g.deletedAt).map(g => [
      g.tarih || "", custName(g.customerId), g.tur || "", g.not || "",
      g.takipTarihi || "", g.tamamlandi ? "Evet" : "Hayır", g.kullanici || "",
    ])];
    try {
      if (mode === "email") { const b64 = await xlsxToBase64(rows, "Görüşmeler"); openExportMailXLSXBase64(b64, "gorusmeler.xlsx", "Görüşmeler"); return; }
      await downloadXlsx(rows, "gorusmeler.xlsx", "Görüşmeler"); flash("ok", "Görüşmeler Excel olarak indirildi.");
    } catch {
      if (mode === "email") { openExportMailCSV(rows, "gorusmeler.csv", "Görüşmeler"); return; }
      downloadCSV(rows, "gorusmeler.csv"); flash("ok", "Görüşmeler CSV olarak indirildi.");
    }
  };
  const exportPartStock = async (mode = "download") => {
    const head = ["Yedek Parça", "Stok Miktarı (adet)", "Son Güncelleme"];
    const rows = [head, ...partStock.map(s => {
      const part = parts.find(p => String(p.id) === String(s.partId)) || {};
      return [part.ad || s.partId, s.miktar ?? 0, s.sonGuncelleme || ""];
    })];
    try {
      if (mode === "email") { const b64 = await xlsxToBase64(rows, "Parça Stoğu"); openExportMailXLSXBase64(b64, "parca-stogu.xlsx", "Parça Stoğu"); return; }
      await downloadXlsx(rows, "parca-stogu.xlsx", "Parça Stoğu"); flash("ok", "Parça stoğu Excel olarak indirildi.");
    } catch {
      if (mode === "email") { openExportMailCSV(rows, "parca-stogu.csv", "Parça Stoğu"); return; }
      downloadCSV(rows, "parca-stogu.csv"); flash("ok", "Parça stoğu CSV olarak indirildi.");
    }
  };
  const exportPartStockLog = async (mode = "download") => {
    const head = ["Yedek Parça", "Tarih", "İşlem Tipi", "Miktar", "Not"];
    const rows = [head, ...partStockLog.map(l => {
      const part = parts.find(p => String(p.id) === String(l.partId)) || {};
      const tip = l.tip === "stok_girisi" ? "Stok Girişi" : l.tip === "manuel_duzelt" ? "Manuel Düzeltme" : (l.tip || "");
      return [part.ad || l.partId, l.tarih || "", tip, l.miktar ?? "", l.notlar || ""];
    })];
    try {
      if (mode === "email") { const b64 = await xlsxToBase64(rows, "Stok Hareketleri"); openExportMailXLSXBase64(b64, "stok-hareketleri.xlsx", "Stok Hareketleri"); return; }
      await downloadXlsx(rows, "stok-hareketleri.xlsx", "Stok Hareketleri"); flash("ok", "Stok hareketleri Excel olarak indirildi.");
    } catch {
      if (mode === "email") { openExportMailCSV(rows, "stok-hareketleri.csv", "Stok Hareketleri"); return; }
      downloadCSV(rows, "stok-hareketleri.csv"); flash("ok", "Stok hareketleri CSV olarak indirildi.");
    }
  };
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
        c.email || "",
        (c.odemePlani || []).map(r => `${fmtD(r.vadeTarihi) || "-"}:${parseMoney(r.tutar) || 0}`).join("; "),
        c.brutKg ?? "",
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

  return (
    <>
      <Section title="Dışa Aktar (Excel / CSV)" icon="download">
        <div style={{ fontSize: 13, color: "var(--n500, #64748b)", marginBottom: 12, lineHeight: 1.6 }}>
          Verilerinizi Excel'de açılabilen dosya olarak indirin. Türkçe karakterler korunur; dosyayı Excel'de çift tıklayarak açabilirsiniz.
        </div>
        <div style={{ fontSize: 12, color: "var(--amb800, #92400e)", background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 8, padding: "8px 12px", marginBottom: 18, lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ flexShrink: 0, marginTop: 1, display: "flex" }}><Icon name="lock" size={13} /></span>
          <span>Dışa aktarılan dosyalar müşteri ve finansal bilgileri <b>düz metin</b> içerir. Yalnızca güvenli yerlerde saklayın ve gerekmedikçe paylaşmayın. (Dosyanın açılınca komut çalıştırmasına karşı hücreler zararsızlaştırılır.)</span>
        </div>

        {/* Tümünü indir — içe aktarma şablonu formatında (geri yüklenebilir) */}
        <div style={{ background: "linear-gradient(135deg, #e85d1a, #f59e0b)", borderRadius: 12, padding: "20px 22px", marginBottom: 18, color: "#fff" }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Tüm Kayıtları İndir (Şablon Formatı)</div>
          <div style={{ fontSize: 12.5, marginBottom: 14, lineHeight: 1.5, opacity: .95 }}>
            Tüm müşteriler ve servis geçmişleri tek Excel dosyasında, <b>içe aktarma şablonuyla aynı sütun düzeninde</b>. Bu dosyayı düzenleyip tekrar İçe Aktar'dan yükleyebilirsiniz. ({customers.length} müşteri)
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => exportAllTemplate("download")}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", background: "var(--surface, #ffffff)", color: "#e85d1a", border: "none" }}>
              <Icon name="download" size={14} /> Tümünü İndir
            </button>
            <button onClick={() => exportAllTemplate("email")}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.5)" }}>
              <Icon name="mail" size={14} /> E-posta Gönder
            </button>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--n600, #475569)", marginBottom: 14, textTransform: "uppercase", letterSpacing: .5 }}>Ayrı Raporlar</div>
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
            { title: "Parça Stoğu", desc: `Güncel parça stok miktarları (${partStock.length} parça).`, onClick: exportPartStock },
            { title: "Stok Hareketleri", desc: `Parça stok giriş ve düzeltme geçmişi (${partStockLog.length} kayıt).`, onClick: exportPartStockLog },
            { title: "Teklifler", desc: `Oluşturulan teklif kayıtları (${teklifler.length} kayıt).`, onClick: exportTeklifler },
            { title: "Üretim Formları", desc: `Kalıp üretim formları (${uretimFormlari.length} kayıt).`, onClick: exportUretimFormlari },
            { title: "Yurt Dışı Faturalar", desc: `Düzenlenen yurt dışı faturalar (${faturalar.length} kayıt).`, onClick: exportFaturalar },
            { title: "Görüşmeler", desc: `Müşteri görüşme kayıtları (${gorusmeler.length} kayıt).`, onClick: exportGorusmeler },
          ] },
        ].map(g => {
          const acik = acikGruplar.has(g.group);
          return (
          <div key={g.group} style={{ marginBottom: 14 }}>
            <div onClick={() => setAcikGruplar(prev => { const n = new Set(prev); if (n.has(g.group)) n.delete(g.group); else n.add(g.group); return n; })}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: "10px 14px", marginBottom: acik ? 10 : 0 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--n600, #475569)", textTransform: "uppercase", letterSpacing: .5 }}>{g.group} ({g.items.length})</span>
              <span style={{ fontSize: 12, color: "var(--n400, #94a3b8)" }}>{acik ? "▾" : "▸"}</span>
            </div>
            {acik && <div style={{ background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {g.items.map((card, i) => (
                    <tr key={card.title} style={{ borderBottom: i < g.items.length - 1 ? "1px solid var(--n150, #f1f5f9)" : "none" }}>
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--n900, #0f172a)" }}>{card.title}</span>
                          <span
                            onMouseEnter={() => setExportTooltip(card.title)}
                            onMouseLeave={() => setExportTooltip(null)}
                            style={{ cursor: "default", color: "var(--n400, #94a3b8)", fontSize: 11, fontWeight: 700, border: "1px solid var(--n300, #cbd5e1)", borderRadius: "50%", width: 15, height: 15, display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1, flexShrink: 0, position: "relative" }}>
                            i
                            {exportTooltip === card.title && (
                              <div style={{ position: "absolute", top: "130%", left: 0, background: "var(--inkBg, #0f172a)", color: "#fff", fontSize: 11.5, fontWeight: 500, padding: "7px 11px", borderRadius: 7, width: 220, whiteSpace: "normal", lineHeight: 1.4, zIndex: 20, boxShadow: "0 4px 12px rgba(0,0,0,.25)" }}>
                                {card.desc}
                              </div>
                            )}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 16px", width: 1 }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <Btn small variant="ghost" onClick={() => card.onClick("download")} title="İndir"><Icon name="download" size={13} /></Btn>
                          <Btn small variant="ghost" onClick={() => card.onClick("email")} title="E-posta Gönder"><Icon name="mail" size={13} /></Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
          </div>
          );
        })}
      </Section>

      {/* Dışa aktarımı e-posta ile gönder — CSV/XLSX içerik otomatik ek olarak eklenir */}
      {exportMailDraft && (
        <MailComposeModal draft={exportMailDraft} setDraft={setExportMailDraft} sendState={exportMailSendState} onSend={sendExportMail}
          ekAlani={<div style={{ fontSize: 11.5, color: "var(--n400, #94a3b8)", marginBottom: 16 }}>📎 {exportMailDraft.attachmentFilename} otomatik ek olarak gönderilecek.</div>} />
      )}
    </>
  );
};
