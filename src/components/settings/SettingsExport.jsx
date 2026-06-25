import { useState } from "react";
import { CURRENCIES, DEFAULT_KDV_RATES } from "../../lib/constants";
import { fmtTR, fmtKalipCapi, normalizeSaleType, isFaturali, calcKDV, extractKDV, parseMoney, kalipCount } from "../../lib/utils";
import { Icon, Btn, Field, Input, Warn, EMAIL_RE, Modal } from "../ui";
import { Section } from "./Section";
import { buildCSV, downloadCSV, utf8ToBase64, IMPORT_HEADERS } from "./csvUtils";

export const SettingsExport = ({ customers, services, dealers, stock, partSales, payments, notes, parts, appSettings, flash }) => {
  const [exportTooltip, setExportTooltip] = useState(null); // tablodaki üzerine gelinen rapor başlığı (native title yerine elle çizilen tooltip)

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
    if (mode === "email") { openExportMailCSV(rows, "finans-ozeti.csv", "Finans Özeti"); return; }
    downloadCSV(rows, "finans-ozeti.csv");
    flash("ok", "Finans özeti Excel (CSV) olarak indirildi.");
  };
  const exportCustomers = (mode = "download") => {
    const head = ["Firma", "Telefon", "E-posta", "Ülke", "Şehir", "Adres", "Model", "Makina Kalıp Çapı", "Seri No", "Kalıplar", "Satış Tarihi", "Garanti Bitiş", "Satış Yapan", "Satış Tipi", "Para Birimi", "Fabrika Satış Bedeli", "Fatura Bedeli", "KDV", "Komisyon", "Extra Kalıp", "Kalan Borç", "2. El mi?", "Yetkili1 Ad", "Yetkili1 Telefon", "Yetkili2 Ad", "Yetkili2 Telefon"];
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
    const head = ["Bayi/Firma Adı", "Yetkili", "Telefon", "E-posta", "Adres", "Ülke", "Şehir", "Bayi mi", "Anlaşmalı Servis mi", "Not"];
    const rows = [head, ...dealers.map(d => [d.name, d.contact, d.phone, d.email, d.adres, d.country, d.city, d.bayiMi !== false ? "Evet" : "Hayır", d.anlasmaliServisMi ? "Evet" : "Hayır", d.note])];
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
    const head = ["Yedek Parça Adı", "Fiyat (TL)", "Fiyat (USD)", "Fiyat (EUR)"];
    const rows = [head, ...parts.map(p => [p.ad, p.fiyatTRY ?? "", p.fiyatUSD ?? "", p.fiyatEUR ?? ""])];
    if (mode === "email") { openExportMailCSV(rows, "yedek-parca-tanimlari.csv", "Yedek Parça Tanımları"); return; }
    downloadCSV(rows, "yedek-parca-tanimlari.csv");
    flash("ok", "Yedek parça tanımları Excel (CSV) olarak indirildi.");
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
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {g.items.map((card, i) => (
                    <tr key={card.title} style={{ borderBottom: i < g.items.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{card.title}</span>
                          <span
                            onMouseEnter={() => setExportTooltip(card.title)}
                            onMouseLeave={() => setExportTooltip(null)}
                            style={{ cursor: "default", color: "#94a3b8", fontSize: 11, fontWeight: 700, border: "1px solid #cbd5e1", borderRadius: "50%", width: 15, height: 15, display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1, flexShrink: 0, position: "relative" }}>
                            i
                            {exportTooltip === card.title && (
                              <div style={{ position: "absolute", top: "130%", left: 0, background: "#0f172a", color: "#fff", fontSize: 11.5, fontWeight: 500, padding: "7px 11px", borderRadius: 7, width: 220, whiteSpace: "normal", lineHeight: 1.4, zIndex: 20, boxShadow: "0 4px 12px rgba(0,0,0,.25)" }}>
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
            </div>
          </div>
        ))}
      </Section>

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
    </>
  );
};
