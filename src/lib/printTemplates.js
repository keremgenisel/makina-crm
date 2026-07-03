import LOGO from "../assets/logo.avif?inline";
import { today, todayTR, fmtTR, fmtCur, parseMoney, calcKDV, fmtKalipCapi, kalipText, stripAutoPrint, parcaAdi } from "./utils";
import { COUNTRY_EN } from "./constants";

const esc = (s) => String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const latinize = (s) => (s || "").replace(/İ/g, "I").replace(/ı/g, "i").replace(/Ş/g, "S").replace(/ş/g, "s").replace(/Ğ/g, "G").replace(/ğ/g, "g").replace(/Ç/g, "C").replace(/ç/g, "c");

// Servis tipi ve tamir yeri çevirisi için sabit eşlemeler
const TYPE_KEY_MAP = {
  "İlk Çalıştırma": "typeIlkCalistirma",
  "Garanti İçi": "typeGarantiIci",
  "Garanti Dışı": "typeGarantiDisi",
  "Periyodik Bakım": "typePeriyodikBakim",
};
const PLACE_KEY_MAP = {
  "Yerinde Onarım": "placeYerindeOnarim",
  "Fabrikada Onarım": "placeFabrikadaOnarim",
  "Kargo": "placeKargo",
  "Fabrika Teslim": "placeFabrikaTeslim",
};
const transType = (L, t) => (TYPE_KEY_MAP[t] && L[TYPE_KEY_MAP[t]]) ? L[TYPE_KEY_MAP[t]] : (t || "—");
const transPlace = (L, p) => (PLACE_KEY_MAP[p] && L[PLACE_KEY_MAP[p]]) ? L[PLACE_KEY_MAP[p]] : (p || "—");
const parcaAdiEN = (p) => typeof p === "string" ? p : (p?.adEN || p?.ad || "");
const kalipTextEN = (c) => {
  if (Array.isArray(c?.kaliplar) && c.kaliplar.length)
    return c.kaliplar.map(k => [k.olcu, k.adEN || k.ad].filter(Boolean).join(" - ")).filter(Boolean).join(" · ");
  return c?.kalip || "—";
};

// ── Varsayılan çeviriler — Servis Formu ──────────────────────────────────────
export const DEFAULT_SERVIS_TRANSLATIONS = {
  TR: {
    title: "Servis Formu",
    formNoLabel: "Form No: №",
    raporTarihiLabel: "Rapor Tarihi:",
    firmaAdiLabel: "Firma Adı",
    telefonLabel: "Telefon",
    adresLabel: "Adres",
    makinaModeliLabel: "Makina Modeli",
    seriNoLabel: "Seri Numarası",
    servisTuruLabel: "Servis Türü",
    yapilanIslemLabel: "Yapılan İşlem",
    girisLabel: "Servise Giriş Tarihi",
    teknisyenLabel: "Teknisyen",
    servisUcretiLabel: "Servis Ücreti",
    parcaUcretiLabel: "Parça Ücreti",
    toplamLabel: "Toplam",
    kdvDahilLabel: "KDV dahil",
    yapilanIslerBaslik: "YAPILAN İŞLER / PARÇA DEĞİŞİMLERİ",
    degisenParcalarBaslik: "DEĞİŞEN PARÇALAR",
    musteriTalimatiBaslik: "MÜŞTERİ TALİMATI / AÇIKLAMA",
    fabrikaNotuBaslik: "FABRİKA NOTU",
    teslimEden: "TESLİM EDEN",
    teslimAlan: "TESLİM ALAN",
    imzaEden: "Ad Soyad / İmza",
    imzaAlan: "Ad Soyad / İmza / Kaşe",
    sart1: "Yukarıda adı ve miktarı belirtilen parçaları tam olarak teslim aldım. Yapılan hizmeti kabul ediyorum.",
    sart2: "Tamir süresi 10 (on) iş gününü geçmez.",
    sart3: "Yere düşen malzemeler garanti kapsamı dışındadır.",
    sart4: "Teslim tarihinden itibaren 20 iş günü içerisinde alınmayan ürünlerden servisimiz sorumlu değildir.",
    typeIlkCalistirma: "İlk Çalıştırma",
    typeGarantiIci: "Garanti İçi",
    typeGarantiDisi: "Garanti Dışı",
    typePeriyodikBakim: "Periyodik Bakım",
    placeYerindeOnarim: "Yerinde Onarım",
    placeFabrikadaOnarim: "Fabrikada Onarım",
    placeKargo: "Kargo",
    placeFabrikaTeslim: "Fabrika Teslim",
  },
  EN: {
    title: "Service Form",
    formNoLabel: "Form No: №",
    raporTarihiLabel: "Report Date:",
    firmaAdiLabel: "Company Name",
    telefonLabel: "Phone",
    adresLabel: "Address",
    makinaModeliLabel: "Machine Model",
    seriNoLabel: "Serial Number",
    servisTuruLabel: "Service Type",
    yapilanIslemLabel: "Work Performed",
    girisLabel: "Service Entry Date",
    teknisyenLabel: "Technician",
    servisUcretiLabel: "Service Fee",
    parcaUcretiLabel: "Parts Fee",
    toplamLabel: "Total",
    kdvDahilLabel: "VAT included",
    yapilanIslerBaslik: "WORK PERFORMED / PARTS REPLACED",
    degisenParcalarBaslik: "REPLACED PARTS",
    musteriTalimatiBaslik: "CUSTOMER INSTRUCTIONS / NOTES",
    fabrikaNotuBaslik: "FACTORY NOTE",
    teslimEden: "DELIVERED BY",
    teslimAlan: "RECEIVED BY",
    imzaEden: "Name Surname / Signature",
    imzaAlan: "Name Surname / Signature / Stamp",
    sart1: "I have received all parts listed above in full. I accept the service performed.",
    sart2: "Repair time shall not exceed 10 (ten) business days.",
    sart3: "Items dropped on the floor are not covered under warranty.",
    sart4: "We are not responsible for uncollected products after 20 business days from the delivery date.",
    typeIlkCalistirma: "First Start-Up",
    typeGarantiIci: "Under Warranty",
    typeGarantiDisi: "Out of Warranty",
    typePeriyodikBakim: "Periodic Maintenance",
    placeYerindeOnarim: "On-Site Repair",
    placeFabrikadaOnarim: "Factory Repair",
    placeKargo: "Cargo / Shipping",
    placeFabrikaTeslim: "Factory Delivery",
  },
};

// ── Varsayılan çeviriler — Makina Geçmiş Raporu ──────────────────────────────
export const DEFAULT_MAKINA_TRANSLATIONS = {
  TR: {
    subBaslik: "Makina Servis ve Yedek Parça Geçmişi Raporu",
    raporTarihiLabel: "Rapor Tarihi:",
    satinAlanLabel: "Satın Alan",
    satisYapanLabel: "Satış Yapan",
    adresLabel: "Adres",
    makinaModeliLabel: "Makina Modeli",
    seriNoLabel: "Seri Numarası",
    kalipCapiLabel: "Makina Kalıp Çapı",
    kaliplarLabel: "Kalıplar",
    bantlarLabel: "Bant",
    garantiBaslangicLabel: "Satış / Garanti Başlangıç",
    garantiBitisLabel: "Garanti Bitiş",
    notLabel: "Not",
    garantiDevam: "Garanti devam ediyor",
    garantiBitti: "Garanti süresi dolmuş",
    sahiplikBaslik: "SAHİPLİK GEÇMİŞİ (2. El Devir)",
    thSira: "Sıra",
    thSahip: "Sahip",
    thKonum: "Konum",
    thSatisYapan: "Satış Yapan",
    thDevirTarihi: "Devir Tarihi",
    mevcutLabel: "Mevcut",
    servisBaslik: "SERVİS VE YEDEK PARÇA GEÇMİŞİ",
    kayitSuffix: "kayıt",
    thTarih: "Tarih",
    thTur: "Tür",
    thYapilanIslem: "Yapılan İşlem",
    thTeknisyen: "Teknisyen",
    thAciklama: "Açıklama",
    servisYok: "Servis kaydı bulunmuyor.",
    degisenParcalarLabel: "Değişen parçalar:",
    kalipBaslik: "EXTRA KALIPLAR",
    thKalip: "Kalıp",
    typeIlkCalistirma: "İlk Çalıştırma",
    typeGarantiIci: "Garanti İçi",
    typeGarantiDisi: "Garanti Dışı",
    typePeriyodikBakim: "Periyodik Bakım",
    placeYerindeOnarim: "Yerinde Onarım",
    placeFabrikadaOnarim: "Fabrikada Onarım",
    placeKargo: "Kargo",
    placeFabrikaTeslim: "Fabrika Teslim",
  },
  EN: {
    subBaslik: "Machine Service and Spare Parts History Report",
    raporTarihiLabel: "Report Date:",
    satinAlanLabel: "Purchased By",
    satisYapanLabel: "Sold By",
    adresLabel: "Address",
    makinaModeliLabel: "Machine Model",
    seriNoLabel: "Serial Number",
    kalipCapiLabel: "Machine Mold Diameter",
    kaliplarLabel: "Molds",
    bantlarLabel: "Band",
    garantiBaslangicLabel: "Sale / Warranty Start",
    garantiBitisLabel: "Warranty End",
    notLabel: "Note",
    garantiDevam: "Warranty active",
    garantiBitti: "Warranty expired",
    sahiplikBaslik: "OWNERSHIP HISTORY (2nd Hand Transfer)",
    thSira: "No.",
    thSahip: "Owner",
    thKonum: "Location",
    thSatisYapan: "Sold By",
    thDevirTarihi: "Transfer Date",
    mevcutLabel: "Current",
    servisBaslik: "SERVICE AND SPARE PARTS HISTORY",
    kayitSuffix: "records",
    thTarih: "Date",
    thTur: "Type",
    thYapilanIslem: "Work Performed",
    thTeknisyen: "Technician",
    thAciklama: "Description",
    servisYok: "No service records found.",
    degisenParcalarLabel: "Replaced parts:",
    kalipBaslik: "EXTRA MOLDS",
    thKalip: "Mold",
    typeIlkCalistirma: "First Start-Up",
    typeGarantiIci: "Under Warranty",
    typeGarantiDisi: "Out of Warranty",
    typePeriyodikBakim: "Periodic Maintenance",
    placeYerindeOnarim: "On-Site Repair",
    placeFabrikadaOnarim: "Factory Repair",
    placeKargo: "Cargo / Shipping",
    placeFabrikaTeslim: "Factory Delivery",
  },
};

// HTML üretimi (Yazdır ve E-posta eki/PDF için paylaşılan mantık) — tek bir servis kaydının "Servis Formu"
// forEmail: true ise "Teslim Eden"/"Teslim Alan" imza alanları çıkarılır
// translations: { _lang: "TR"|"EN", TR: {...overrides}, EN: {...overrides} }
export function buildServiceFormHtml(sv, customers, kdvRates, { forEmail = false, translations = {}, kaseResmi = "" } = {}) {
  const lang = translations?._lang || "TR";
  const L = { ...DEFAULT_SERVIS_TRANSLATIONS[lang] || DEFAULT_SERVIS_TRANSLATIONS.TR, ...(translations?.[lang] || {}) };

  const cust = customers.find(c => c.id === sv.customerId) || {};
  const adres = [cust.adres, lang === "EN" ? latinize(cust.city) : cust.city, lang === "EN" ? (COUNTRY_EN[cust.country] || cust.country) : cust.country].filter(Boolean).join(", ") || "—";
  const servisUcretiVar = (sv.type === "Garanti Dışı" || sv.type === "Periyodik Bakım") && parseMoney(sv.servisUcreti) > 0;
  const parcaUcretiVar = !sv.parcaUcretsizMi && parseMoney(sv.parcaUcreti) > 0;
  const ucret = servisUcretiVar ? fmtCur(sv.servisUcreti, sv.currency) : "—";
  const parcaUcret = parcaUcretiVar ? fmtCur(sv.parcaUcreti, sv.parcaCurrency) : "—";
  const sameCurrency = (sv.currency || "TRY") === (sv.parcaCurrency || sv.currency || "TRY");
  let toplam = null;
  if (servisUcretiVar && parcaUcretiVar) {
    if (sameCurrency) {
      const toplamTutar = parseMoney(sv.servisUcreti) + parseMoney(sv.parcaUcreti);
      const kdv = calcKDV(sv.faturaTipi, toplamTutar, sv.date, kdvRates);
      toplam = fmtCur(toplamTutar, sv.currency) + (kdv > 0 ? ` (${L.kdvDahilLabel}: ${fmtCur(toplamTutar + kdv, sv.currency)})` : "");
    } else {
      toplam = `${fmtCur(sv.servisUcreti, sv.currency)} + ${fmtCur(sv.parcaUcreti, sv.parcaCurrency)}`;
    }
  } else if (servisUcretiVar || parcaUcretiVar) {
    const toplamTutar = servisUcretiVar ? parseMoney(sv.servisUcreti) : parseMoney(sv.parcaUcreti);
    const cur = servisUcretiVar ? sv.currency : sv.parcaCurrency;
    const kdv = calcKDV(sv.faturaTipi, toplamTutar, sv.date, kdvRates);
    toplam = kdv > 0 ? `${fmtCur(toplamTutar, cur)} (${L.kdvDahilLabel}: ${fmtCur(toplamTutar + kdv, cur)})` : null;
  }

  const infoRows = [
    [L.firmaAdiLabel, cust.name],
    [L.telefonLabel, cust.phone],
    [L.adresLabel, adres],
    [L.makinaModeliLabel, cust.model],
    [L.seriNoLabel, cust.serialNo],
    [L.servisTuruLabel, transType(L, sv.type)],
    [L.yapilanIslemLabel, transPlace(L, sv.repairPlace)],
    [L.girisLabel, fmtTR(sv.date)],
    [L.teknisyenLabel, sv.tech],
    [L.servisUcretiLabel, ucret],
    ...(sv.degisenParcalar?.length ? [[L.parcaUcretiLabel, parcaUcret]] : []),
    ...(toplam ? [[L.toplamLabel, toplam]] : []),
  ].map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="${lang.toLowerCase()}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob: 'unsafe-inline'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:;">
<title>${esc(L.title)} - ${esc(cust.name)}</title>
<style>
  body { font-family: Arial, sans-serif; color: #000; padding: 20px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 8px; margin-bottom: 14px; }
  .header h1 { margin: 0; font-size: 18px; letter-spacing: 1px; }
  .header .sub { font-size: 11px; }
  .header .right { font-size: 10px; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10.5px; }
  th, td { border: 1px solid #000; padding: 4px 8px; text-align: left; }
  .info th { width: 180px; background: #eee; }
  h2 { font-size: 12px; margin: 0 0 6px; }
  .box-area { border: 1px solid #000; border-radius: 4px; min-height: 44px; padding: 8px; font-size: 10.5px; white-space: pre-wrap; line-height: 1.5; margin-bottom: 12px; }
  .terms { font-size: 9px; color: #444; line-height: 1.5; margin-top: 6px; border-top: 1px solid #ccc; padding-top: 8px; }
  .printbtn { display: block; margin: 0 auto 16px; padding: 8px 24px; background: #e85d1a; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; }
  @media print { @page { margin: 10mm 12mm; size: A4; } .printbtn { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <img src="${LOGO}" alt="Altuntaş Makina" style="height:34px;display:block;margin-bottom:4px" />
      <div class="sub">${esc(L.title)}</div>
    </div>
    <div class="right">
      <div>${esc(L.formNoLabel)} ${esc(String(sv.id))}</div>
      <div>${esc(L.raporTarihiLabel)} ${todayTR()}</div>
    </div>
  </div>
  <table class="info"><tbody>${infoRows}</tbody></table>

  <h2>${esc(L.musteriTalimatiBaslik)}</h2>
  <div class="box-area">${esc(sv.musteriTalimati || "")}</div>

  ${sv.degisenParcalar?.length ? `
  <h2>${esc(L.degisenParcalarBaslik)}</h2>
  ${(() => {
    const lines = sv.degisenParcalar.map(p => {
      const ad = lang === "EN" ? parcaAdiEN(p) : parcaAdi(p);
      const fiyat = typeof p === "object" ? parseMoney(p.fiyat) : 0;
      const suffix = (typeof p === "object" && p.disTedarik) ? (lang === "EN" ? " [Ext. Supply]" : " [Dış Tedarik]") : "";
      return esc(fiyat > 0 ? `${ad}${suffix} (${fmtCur(fiyat, sv.parcaCurrency)})` : `${ad}${suffix}`);
    });
    const cellStyle = "border:none;padding:8px;vertical-align:top;font-size:10.5px;line-height:1.6;width:50%";
    if (lines.length <= 5) {
      return `<div class="box-area" style="min-height:auto;line-height:1.8">${lines.map(l => `<div>${l}</div>`).join("")}</div>`;
    }
    const mid = Math.ceil(lines.length / 2);
    return `<table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:1px solid #000;border-radius:4px"><tr>
      <td style="${cellStyle};border-right:1px solid #ccc">${lines.slice(0, mid).map(l => `<div>${l}</div>`).join("")}</td>
      <td style="${cellStyle}">${lines.slice(mid).map(l => `<div>${l}</div>`).join("")}</td>
    </tr></table>`;
  })()}
  ` : ""}

  <h2>${esc(L.fabrikaNotuBaslik)}</h2>
  <div class="box-area">${esc(sv.fabrikaNotu || "")}</div>

  ${forEmail ? "" : `<table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:none">
    <tr>
      <td style="border:none;width:50%;padding:0 16px 0 0;vertical-align:top">
        <div style="font-size:10.5px;font-weight:700;margin-bottom:30px">${esc(L.teslimEden)}</div>
        <div style="border-top:1px solid #000;padding-top:4px;font-size:9.5px;color:#444">${esc(L.imzaEden)}</div>
      </td>
      <td style="border:none;width:50%;padding:0 0 0 16px;vertical-align:top">
        <div style="font-size:10.5px;font-weight:700;margin-bottom:30px">${esc(L.teslimAlan)}</div>
        <div style="border-top:1px solid #000;padding-top:4px;font-size:9.5px;color:#444">${esc(L.imzaAlan)}</div>
      </td>
    </tr>
  </table>`}

  <div class="terms">
    1- ${esc(L.sart1)}<br>
    2- ${esc(L.sart2)}<br>
    3- ${esc(L.sart3)}<br>
    4- ${esc(L.sart4)}
  </div>
  ${kaseResmi ? `<div style="text-align:right;margin-top:20px;"><img src="${kaseResmi}" style="max-height:80px;max-width:150px;object-fit:contain;" alt="kaşe"></div>` : ""}
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</` + `script>
</body>
</html>`;

  return html;
}

// Yazdırma: tek bir servis kaydının "Servis Formu"nu üret
export function printServiceForm(sv, customers, kdvRates, translations = {}, kaseResmi = "") {
  const cust = customers.find(c => c.id === sv.customerId) || {};
  const defaultName = `servis-formu-${(cust.serialNo || cust.name || "kayit").replace(/\s+/g, "-")}.pdf`;
  const htmlPrint = stripAutoPrint(buildServiceFormHtml(sv, customers, kdvRates, { translations, kaseResmi: "" }));
  const htmlPdf   = kaseResmi ? stripAutoPrint(buildServiceFormHtml(sv, customers, kdvRates, { translations, kaseResmi })) : null;
  if (window.appPrint) {
    window.appPrint.printHtml(htmlPrint, htmlPdf, defaultName);
    return;
  }
  const blob = new Blob([htmlPrint], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) {
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultName.replace(".pdf", ".html");
    a.click();
  }
}

// HTML üretimi (Yazdır ve E-posta eki/PDF için paylaşılan mantık) — Makina Servis ve Yedek Parça Geçmişi Raporu
// translations: { _lang: "TR"|"EN", TR: {...overrides}, EN: {...overrides} }
export function buildMachineReportHtml(detailView, detailHistory, partSales, translations = {}, kaseResmi = "", parts = []) {
  const lang = translations?._lang || "TR";
  const L = { ...DEFAULT_MAKINA_TRANSLATIONS[lang] || DEFAULT_MAKINA_TRANSLATIONS.TR, ...(translations?.[lang] || {}) };

  const detailWarrantyOk = detailView?.warrantyEnd && detailView.warrantyEnd >= today();
  const infoRows = [
    [L.satinAlanLabel, detailView.name],
    [L.satisYapanLabel, detailView.satisYapan || detailView.contact || "—"],
    [L.adresLabel, `${detailView.adres ? detailView.adres + ", " : ""}${lang === "EN" ? latinize(detailView.city || "") : (detailView.city || "")}${detailView.country ? " / " + (lang === "EN" ? (COUNTRY_EN[detailView.country] || detailView.country) : detailView.country) : ""}` || "—"],
    [L.makinaModeliLabel, detailView.model || "—"],
    [L.seriNoLabel, detailView.serialNo || "—"],
    ...(fmtKalipCapi(detailView.kalipCapi) ? [[L.kalipCapiLabel, fmtKalipCapi(detailView.kalipCapi)]] : []),
    [L.kaliplarLabel, lang === "EN" ? kalipTextEN(detailView) : kalipText(detailView)],
    ...(() => {
      const bantLines = [];
      if (detailView.bantSecimiId) {
        const bant = parts.find(p => String(p.id) === String(detailView.bantSecimiId));
        if (bant) bantLines.push(bant.ad);
      }
      if (Array.isArray(detailView.bantlar) && detailView.bantlar.length > 0) {
        detailView.bantlar.forEach(b => bantLines.push(`${b.ad}${b.en && b.boy ? " (" + b.en + "×" + b.boy + ")" : ""}${b.miktar > 1 ? " ×" + b.miktar : ""}`));
      }
      return bantLines.length > 0 ? [[L.bantlarLabel, bantLines.join(" · ")]] : [];
    })(),
    [L.garantiBaslangicLabel, detailView.installDate ? fmtTR(detailView.installDate) : "—"],
    [L.garantiBitisLabel, `${detailView.warrantyEnd ? fmtTR(detailView.warrantyEnd) : "—"} (${detailWarrantyOk ? L.garantiDevam : L.garantiBitti})`],
    [L.notLabel, detailView.aciklama || "—"],
  ].map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");

  const svcRows = detailHistory.length === 0
    ? `<tr><td colspan="5" style="text-align:center">${esc(L.servisYok)}</td></tr>`
    : detailHistory.map(sv =>
        `<tr><td>${esc(fmtTR(sv.date))}</td><td>${esc(transType(L, sv.type))}</td><td>${esc(transPlace(L, sv.repairPlace || "—"))}</td><td>${esc(sv.tech || "—")}</td><td>${esc(sv.yapilanIsler || sv.description || "")}${sv.degisenParcalar?.length ? `<br><b>${esc(L.degisenParcalarLabel)}</b> ${esc(sv.degisenParcalar.map(p => { const ad = lang === "EN" ? parcaAdiEN(p) : parcaAdi(p); return ad + ((typeof p === "object" && p.disTedarik) ? (lang === "EN" ? " [Ext. Supply]" : " [Dış Tedarik]") : ""); }).join(", "))}` : ""}</td></tr>`
      ).join("");

  const givenParts = (partSales || []).filter(ps => ps.customerId === detailView.id).sort((a, b) => (a.tarih || "").localeCompare(b.tarih || ""));
  const partRows = givenParts.map(ps =>
    `<tr><td>${esc(fmtTR(ps.tarih))}</td><td>${esc(ps.ad)}${ps.olcu ? ` (${esc(ps.olcu)})` : ""}</td></tr>`
  ).join("");

  const html = `<!DOCTYPE html>
<html lang="${lang.toLowerCase()}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob: 'unsafe-inline'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:;">
<title>${esc(L.subBaslik)} - ${esc(detailView.name)}</title>
<style>
  body { font-family: Arial, sans-serif; color: #000; padding: 20px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 8px; margin-bottom: 14px; }
  .header h1 { margin: 0; font-size: 18px; letter-spacing: 1px; }
  .header .sub { font-size: 11px; }
  .header .right { font-size: 10px; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10.5px; }
  th, td { border: 1px solid #000; padding: 4px 8px; text-align: left; }
  .info th { width: 180px; background: #eee; }
  .svc th { background: #eee; }
  h2 { font-size: 12px; margin: 0 0 6px; }
  .printbtn { display: block; margin: 0 auto 16px; padding: 8px 24px; background: #e85d1a; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; }
  @media print { @page { margin: 10mm 12mm; size: A4; } .printbtn { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <img src="${LOGO}" alt="Altuntaş Makina" style="height:34px;display:block;margin-bottom:4px" />
      <div class="sub">${esc(L.subBaslik)}</div>
    </div>
    <div class="right">
      <div>${esc(L.raporTarihiLabel)} ${todayTR()}</div>
    </div>
  </div>
  <table class="info"><tbody>${infoRows}</tbody></table>
  ${(Array.isArray(detailView.prevOwners) && detailView.prevOwners.length > 0) ? `
  <h2>${esc(L.sahiplikBaslik)}</h2>
  <table class="svc">
    <thead><tr><th>${esc(L.thSira)}</th><th>${esc(L.thSahip)}</th><th>${esc(L.thKonum)}</th><th>${esc(L.thSatisYapan)}</th><th>${esc(L.thDevirTarihi)}</th></tr></thead>
    <tbody>
      ${detailView.prevOwners.map((o, i) => `<tr><td>${i + 1}. ${esc(L.mevcutLabel === "Mevcut" ? "Sahip" : "Owner")}</td><td>${esc(o.name)}</td><td>${esc([lang === "EN" ? latinize(o.city) : o.city, lang === "EN" ? (COUNTRY_EN[o.country] || o.country) : o.country].filter(Boolean).join(" / ") || "—")}</td><td>${esc(o.satisYapan || "—")}</td><td>${esc(o.soldDate || "—")}</td></tr>`).join("")}
      <tr style="background:#f0fdf4"><td><b>${esc(L.mevcutLabel)}</b></td><td><b>${esc(detailView.name)}</b></td><td>${esc([lang === "EN" ? latinize(detailView.city) : detailView.city, lang === "EN" ? (COUNTRY_EN[detailView.country] || detailView.country) : detailView.country].filter(Boolean).join(" / ") || "—")}</td><td>${esc(detailView.satisYapan || "—")}</td><td>—</td></tr>
    </tbody>
  </table>` : ""}
  <h2>${esc(L.servisBaslik)} (${detailHistory.length} ${esc(L.kayitSuffix)})</h2>
  <table class="svc">
    <thead><tr><th>${esc(L.thTarih)}</th><th>${esc(L.thTur)}</th><th>${esc(L.thYapilanIslem)}</th><th>${esc(L.thTeknisyen)}</th><th>${esc(L.thAciklama)}</th></tr></thead>
    <tbody>${svcRows}</tbody>
  </table>
  ${givenParts.length > 0 ? `
  <h2>${esc(L.kalipBaslik)} (${givenParts.length} ${esc(L.kayitSuffix)})</h2>
  <table class="svc">
    <thead><tr><th>${esc(L.thTarih)}</th><th>${esc(L.thKalip)}</th></tr></thead>
    <tbody>${partRows}</tbody>
  </table>` : ""}
  ${kaseResmi ? `<div style="text-align:right;margin:16px 0 8px;"><img src="${kaseResmi}" style="max-height:80px;max-width:150px;object-fit:contain;" alt="kaşe"></div>` : ""}
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</` + `script>
</body>
</html>`;

  return html;
}

export const DEFAULT_SANDIK_TRANSLATIONS = {
  TR: { gonderen: "GÖNDEREN:", alici: "ALICI :", adres: "Adres:", tel: "Telefon:", yetkili: "Yetkili:" },
  EN: { gonderen: "SENDER:", alici: "RECIPIENT:", adres: "Address:", tel: "Phone:", yetkili: "Contact:" },
};

// Sandık Üstü Etiketi — A4 HTML
export function buildSandikEtiketiHtml(gonderen, alici, lang = "TR", translations = {}) {
  const g = gonderen || {};
  const a = alici || {};
  const isTR = lang !== "EN";
  const def = isTR ? DEFAULT_SANDIK_TRANSLATIONS.TR : DEFAULT_SANDIK_TRANSLATIONS.EN;
  const saved = isTR ? (translations?.TR || {}) : (translations?.EN || {});
  const L = { ...def, ...saved };
  const konum = [a.city, a.country].filter(Boolean).join(" / ");
  const aliciRows = [];
  if (a.adres || konum) aliciRows.push({ label: L.adres, val: [a.adres, konum].filter(Boolean).map(esc).join(" / ") });
  if (a.tel) aliciRows.push({ label: L.tel, val: esc(a.tel) });
  if (a.yetkili1Ad) aliciRows.push({ label: L.yetkili, val: esc(a.yetkili1Ad) });
  if (a.yetkili1Tel) aliciRows.push({ label: L.tel, val: esc(a.yetkili1Tel) });
  if (a.yetkili2Ad) aliciRows.push({ label: L.yetkili, val: esc(a.yetkili2Ad) });
  if (a.yetkili2Tel) aliciRows.push({ label: L.tel, val: esc(a.yetkili2Tel) });
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>Sandık Etiketi</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #000; padding: 18mm 20mm; }
  @media print { @page { margin: 0; size: A4 portrait; } body { padding: 18mm 20mm; } }
</style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16mm;">
    <tr>
      <td valign="top">
        <div style="font-size:13pt;font-weight:900;letter-spacing:1px;margin-bottom:8mm;">${L.gonderen}</div>
        ${g.ad ? `<div style="font-size:12pt;font-weight:700;margin-bottom:3px;">${esc(g.ad)}</div>` : ""}
        ${g.adres ? `<div style="font-size:10pt;color:#444;line-height:1.5;margin-bottom:3px;"><b>${L.adres}</b> ${esc(g.adres)}</div>` : ""}
        ${g.tel ? `<div style="font-size:10pt;color:#444;"><b>${L.tel}</b> ${esc(g.tel)}</div>` : ""}
      </td>
      <td align="right" valign="top" style="padding-left:10mm;">
        <img src="${LOGO}" alt="Logo" style="height:80px;display:block;margin-left:auto;">
      </td>
    </tr>
  </table>
  <hr style="border:none;border-top:2px solid #000;margin-bottom:16mm;">
  <div style="font-size:13pt;font-weight:900;letter-spacing:1px;margin-bottom:8mm;">${L.alici}</div>
  <div style="font-size:28pt;font-weight:900;color:#e85d1a;margin-bottom:6mm;line-height:1.15;">${esc(a.firmaAdi || "—")}</div>
  ${aliciRows.map(r => `<div style="font-size:16pt;color:#e85d1a;margin-bottom:4mm;line-height:1.3;"><b>${r.label}</b> ${r.val}</div>`).join("")}
<script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };<\/script>
</body>
</html>`;
}

// Yazdırma: Makina Servis ve Yedek Parça Geçmişi Raporu
export function printMachineReport(detailView, detailHistory, partSales, translations = {}, kaseResmi = "", parts = []) {
  const defaultName = `makina-raporu-${(detailView.serialNo || detailView.name || "kayit").replace(/\s+/g, "-")}.pdf`;
  const htmlPrint = stripAutoPrint(buildMachineReportHtml(detailView, detailHistory, partSales, translations, "", parts));
  const htmlPdf   = kaseResmi ? stripAutoPrint(buildMachineReportHtml(detailView, detailHistory, partSales, translations, kaseResmi, parts)) : null;
  if (window.appPrint) {
    window.appPrint.printHtml(htmlPrint, htmlPdf, defaultName);
    return;
  }
  const blob = new Blob([htmlPrint], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultName.replace(".pdf", ".html");
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
