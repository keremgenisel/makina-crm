import LOGO from "../assets/logo.avif?inline";
import { today, todayTR, fmtTR, fmtCur, parseMoney, calcKDV, fmtKalipCapi, kalipText, stripAutoPrint, parcaAdi, numberToWordsEN } from "./utils";
import { COUNTRY_EN } from "./constants";

const esc = (s) => String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Teklif/fatura şablonları kullanıcı alanlarını onlarca noktada enterpole ediyor; alan alan
// esc() çağırmak unutulmaya açık (ve unutulmuştu). Bu yüzden bu şablonlara giren veri
// nesneleri giriş noktasında DERİN kaçıştan geçirilir: tüm metin alanları HTML-güvenli
// olur, boş/sayı/null alanlar dokunulmadan kalır (falsy kontrolleri bozulmaz).
const escStr = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const escDeep = (v) => {
  if (typeof v === "string") return escStr(v);
  if (Array.isArray(v)) return v.map(escDeep);
  if (v && typeof v === "object") { const o = {}; for (const k of Object.keys(v)) o[k] = escDeep(v[k]); return o; }
  return v;
};
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
// Evrak başlığında logo altındaki firma bilgi bloğu (Ayarlar > Firma Bilgileri'nden gelir):
// firma adı (kalın), adres, "Şehir, Ülke", telefon · e-posta. Alanlar çağıran tarafından
// escape edilmiş olmalı (escDeep) — burada tekrar escape edilmez.
const firmaBlok = (f, nameSize = 13, textSize = 9) => {
  if (!f) return "";
  const ad = f.evrakFirmaAdi || f.name || "";
  const adres = f.adres || f.address || "";
  const loc = [f.city, f.country].filter(Boolean).join(", ");
  const iletisim = [f.phone, f.email].filter(Boolean).join("  ·  ");
  return [
    ad ? `<div style="font-size:${nameSize}px;font-weight:800;color:#1a1a1a;margin-top:4px;line-height:1.4;">${ad}</div>` : "",
    adres ? `<div style="font-size:${textSize}px;color:#555;margin-top:2px;line-height:1.5;">${adres}</div>` : "",
    loc ? `<div style="font-size:${textSize}px;color:#555;">${loc}</div>` : "",
    iletisim ? `<div style="font-size:${textSize}px;color:#555;">${iletisim}</div>` : "",
    f.web ? `<div style="font-size:${textSize}px;color:#555;">${f.web}</div>` : "",
  ].join("");
};

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
export function buildServiceFormHtml(sv, customers, kdvRates, { forEmail = false, translations = {}, kaseResmi = "", factory = null } = {}) {
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
      <img src="${LOGO}" alt="Altuntaş Makina" style="height:34px;display:block" />
      ${firmaBlok(factory ? escDeep(factory) : null, 11, 8.5)}
      <div class="sub" style="margin-top:4px">${esc(L.title)}</div>
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
export function printServiceForm(sv, customers, kdvRates, translations = {}, kaseResmi = "", factory = null) {
  const cust = customers.find(c => c.id === sv.customerId) || {};
  const defaultName = `servis-formu-${(cust.serialNo || cust.name || "kayit").replace(/\s+/g, "-")}.pdf`;
  const htmlPrint = stripAutoPrint(buildServiceFormHtml(sv, customers, kdvRates, { translations, kaseResmi: "", factory }));
  const htmlPdf   = kaseResmi ? stripAutoPrint(buildServiceFormHtml(sv, customers, kdvRates, { translations, kaseResmi, factory })) : null;
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
export function buildMachineReportHtml(detailView, detailHistory, partSales, translations = {}, kaseResmi = "", parts = [], factory = null, partTypeDefs = []) {
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
    // "Raporda göster" işaretli her parça tipinin makina seçimi. Sistem tipleri seed'inde
    // Bant açık, Konveyör kapalıdır (mevcut davranış korunur). Eski konveyorSacId/bantSecimiId
    // ve eski "bantlar" dizisi geriye dönük uyum için okunur.
    ...(partTypeDefs || []).filter(t => t.raporGoster).flatMap(t => {
      const lines = [];
      const pid = (detailView.tipSecimleri || {})[t.id]
        || (t.rol === "konveyor" ? detailView.konveyorSacId : t.rol === "bant" ? detailView.bantSecimiId : null);
      if (pid) { const part = parts.find(p => String(p.id) === String(pid)); if (part) lines.push(part.ad); }
      if (t.rol === "bant" && Array.isArray(detailView.bantlar) && detailView.bantlar.length > 0) {
        detailView.bantlar.forEach(b => lines.push(`${b.ad}${b.en && b.boy ? " (" + b.en + "×" + b.boy + ")" : ""}${b.miktar > 1 ? " ×" + b.miktar : ""}`));
      }
      const label = t.rol === "bant" ? L.bantlarLabel : t.ad;
      return lines.length > 0 ? [[label, lines.join(" · ")]] : [];
    }),
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
      <img src="${LOGO}" alt="Altuntaş Makina" style="height:34px;display:block" />
      ${firmaBlok(factory ? escDeep(factory) : null, 11, 8.5)}
      <div class="sub" style="margin-top:4px">${esc(L.subBaslik)}</div>
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
  TR: { baslik: "SANDIK ETİKETİ", gonderen: "GÖNDEREN", alici: "ALICI", varis: "VARIŞ", model: "MODEL", seriNo: "SERİ NO", brutKg: "BRÜT KG", tel: "Tel", yetkili: "Yetkili", kirilabilir: "KIRILABİLİR", buTaraf: "BU TARAF ÜSTTE", kuruTutun: "KURU TUTUN" },
  EN: { baslik: "PACKING LABEL", gonderen: "FROM", alici: "TO", varis: "DESTINATION", model: "MODEL", seriNo: "SERIAL NO", brutKg: "GROSS KG", tel: "Tel", yetkili: "Contact", kirilabilir: "FRAGILE", buTaraf: "THIS SIDE UP", kuruTutun: "KEEP DRY" },
};

// Sandık Üstü Etiketi — A4, her zaman çift dilli (EN / TR): FROM / GÖNDEREN, TO / ALICI,
// dev DESTINATION / VARIŞ bandı, MODEL · SERIAL NO · elle doldurulan GROSS KG şeridi,
// altta standart taşıma işaretleri (kırılabilir / bu taraf üstte / kuru tutun).
export function buildSandikEtiketiHtml(gonderen, alici, translations = {}) {
  const g = gonderen || {};
  const a = alici || {};
  const LTR = { ...DEFAULT_SANDIK_TRANSLATIONS.TR, ...(translations?.TR || {}) };
  const LEN = { ...DEFAULT_SANDIK_TRANSLATIONS.EN, ...(translations?.EN || {}) };
  // Çift dilli etiket: "EN / TR". İki dilde aynıysa (MODEL gibi) tek yazılır; eski
  // kayıtlı çevirilerdeki sondaki ":" temizlenir.
  const bi = (k) => {
    const en = String(LEN[k] || "").replace(/\s*:\s*$/, "").trim();
    const tr = String(LTR[k] || "").replace(/\s*:\s*$/, "").trim();
    if (!en) return tr;
    if (!tr || en.toLocaleLowerCase("tr-TR") === tr.toLocaleLowerCase("tr-TR")) return en;
    return `${en} / ${tr}`;
  };
  // Varış: şehir dev; ülke yurtdışıysa İngilizce adıyla (nakliyeci için), yurtiçiyse Türkçe.
  const sehir = String(a.city || "").toLocaleUpperCase("tr-TR");
  const ulkeAd = (a.country && a.country !== "Türkiye" && COUNTRY_EN[a.country]) ? COUNTRY_EN[a.country] : (a.country || "");
  const ulke = String(ulkeAd).toLocaleUpperCase("tr-TR");
  const bosluk = "___________";
  const gonderenSatirlar = [
    g.adres ? `<div style="font-size:9pt;color:#333;line-height:1.55;">${esc(g.adres)}</div>` : "",
    (g.city || g.country) ? `<div style="font-size:9pt;color:#333;line-height:1.55;">${esc([g.city, g.country].filter(Boolean).join(", "))}</div>` : "",
    g.tel ? `<div style="font-size:9pt;color:#333;line-height:1.55;">${esc(g.tel)}</div>` : "",
    g.email ? `<div style="font-size:9pt;color:#333;line-height:1.55;">${esc(g.email)}</div>` : "",
    g.web ? `<div style="font-size:9pt;color:#333;line-height:1.55;">${esc(g.web)}</div>` : "",
  ].join("");
  const aliciSatirlar = [
    a.adres ? `<div style="font-size:10pt;line-height:1.6;">${esc(a.adres)}</div>` : "",
    a.tel ? `<div style="font-size:10pt;line-height:1.6;">${esc(a.tel)}</div>` : "",
    a.yetkili1Ad ? `<div style="font-size:10pt;line-height:1.6;"><b>${bi("yetkili")}:</b> ${esc(a.yetkili1Ad)}${a.yetkili1Tel ? " · " + esc(a.yetkili1Tel) : ""}</div>` : "",
    a.yetkili2Ad ? `<div style="font-size:10pt;line-height:1.6;"><b>${bi("yetkili")}:</b> ${esc(a.yetkili2Ad)}${a.yetkili2Tel ? " · " + esc(a.yetkili2Tel) : ""}</div>` : "",
  ].join("");
  const ikonKirilabilir = `<div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8"><path d="M8 3h8l-1.5 6a2.5 2.5 0 0 1-5 0L8 3z"/><path d="M12 11v8M8 21h8"/></svg></div>`;
  const ikonBuTaraf = `<div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8"><path d="M7 21V9M7 9l-3 3M7 9l3 3M17 21V9M17 9l-3 3M17 9l3 3"/></svg></div>`;
  const ikonKuru = `<div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8"><path d="M4 12a8 8 0 0 1 16 0H4z"/><path d="M12 12v6a2 2 0 0 1-4 0M12 4V2"/></svg></div>`;
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>Sandık Etiketi</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #000; }
  .page { border: 1.6mm solid #000; margin: 10mm; height: 277mm; display: flex; flex-direction: column; }
  .kutuBaslik { font-size: 8.5pt; font-weight: 900; letter-spacing: 2px; background: #eee; padding: 1.8mm 4.5mm; border-bottom: 0.4mm solid #000; }
  .ic { width: 12mm; height: 12mm; border: 0.6mm solid #000; display: flex; align-items: center; justify-content: center; }
  .ic svg { width: 8mm; height: 8mm; }
  @media print { @page { margin: 0; size: A4 portrait; } .page { margin: 10mm; } }
</style>
</head>
<body>
<div class="page">
  <div style="display:flex;border-bottom:1.6mm solid #000;">
    <div style="flex:1;padding:5mm 6mm;display:flex;align-items:center;">
      <img src="${LOGO}" alt="Logo" style="height:60px;object-fit:contain;display:block;">
    </div>
    <div style="width:62mm;border-left:1.6mm solid #000;background:#000;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2mm;">
      <div style="font-size:11pt;font-weight:900;letter-spacing:1.5px;">${esc(LEN.baslik)}</div>
      <div style="font-size:11pt;font-weight:900;letter-spacing:1.5px;margin-top:1.5mm;">${esc(LTR.baslik)}</div>
    </div>
  </div>
  <div style="display:flex;border-bottom:1mm solid #000;">
    <div style="flex:1;border-right:1mm solid #000;display:flex;flex-direction:column;">
      <div class="kutuBaslik">${bi("gonderen")}</div>
      <div style="padding:3mm 4.5mm;">
        ${g.ad ? `<div style="font-size:11pt;font-weight:800;margin-bottom:1.5mm;">${esc(g.ad)}</div>` : ""}
        ${gonderenSatirlar}
      </div>
    </div>
    <div style="flex:1.3;display:flex;flex-direction:column;">
      <div class="kutuBaslik">${bi("alici")}</div>
      <div style="padding:3mm 4.5mm;">
        <div style="font-size:15pt;font-weight:900;margin-bottom:1.5mm;">${esc(a.firmaAdi || "—")}</div>
        ${aliciSatirlar}
      </div>
    </div>
  </div>
  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-bottom:1mm solid #000;text-align:center;padding:5mm;overflow:hidden;">
    <div style="font-size:10pt;font-weight:900;letter-spacing:3px;color:#555;">${bi("varis")}</div>
    ${sehir ? `<div style="font-size:${sehir.length > 14 ? "34pt" : "50pt"};font-weight:900;line-height:1.05;margin-top:4mm;overflow-wrap:anywhere;">${esc(sehir)}</div>` : ""}
    ${ulke ? `<div style="font-size:20pt;font-weight:800;letter-spacing:${ulke.length > 14 ? "2px" : "7px"};margin-top:2.5mm;overflow-wrap:anywhere;">${esc(ulke)}</div>` : ""}
  </div>
  <div style="display:flex;border-bottom:1mm solid #000;text-align:center;">
    <div style="flex:1.3;padding:2.5mm;border-right:0.4mm solid #000;"><div style="color:#666;font-size:7.5pt;font-weight:800;letter-spacing:1px;">${bi("model")}</div><div style="font-size:11pt;font-weight:800;margin-top:1mm;">${a.model ? esc(a.model) : bosluk}</div></div>
    <div style="flex:1.3;padding:2.5mm;border-right:0.4mm solid #000;"><div style="color:#666;font-size:7.5pt;font-weight:800;letter-spacing:1px;">${bi("seriNo")}</div><div style="font-size:11pt;font-weight:800;margin-top:1mm;">${a.serialNo ? esc(a.serialNo) : bosluk}</div></div>
    <div style="flex:1;padding:2.5mm;"><div style="color:#666;font-size:7.5pt;font-weight:800;letter-spacing:1px;">${bi("brutKg")}</div><div style="font-size:11pt;font-weight:800;margin-top:1mm;">${a.brutKg ? esc(String(a.brutKg)) : bosluk}</div></div>
  </div>
  <div style="display:flex;align-items:center;justify-content:center;gap:8mm;padding:3.5mm;">
    <div style="display:flex;gap:4mm;">${ikonKirilabilir}${ikonBuTaraf}${ikonKuru}</div>
    <div style="font-size:8pt;color:#444;line-height:1.6;">${bi("kirilabilir")} &nbsp;·&nbsp; ${bi("buTaraf")} &nbsp;·&nbsp; ${bi("kuruTutun")}</div>
  </div>
</div>
<script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
</body>
</html>`;
}

// Yazdırma: Makina Servis ve Yedek Parça Geçmişi Raporu
export function printMachineReport(detailView, detailHistory, partSales, translations = {}, kaseResmi = "", parts = [], factory = null, partTypeDefs = []) {
  const defaultName = `makina-raporu-${(detailView.serialNo || detailView.name || "kayit").replace(/\s+/g, "-")}.pdf`;
  const htmlPrint = stripAutoPrint(buildMachineReportHtml(detailView, detailHistory, partSales, translations, "", parts, factory, partTypeDefs));
  const htmlPdf   = kaseResmi ? stripAutoPrint(buildMachineReportHtml(detailView, detailHistory, partSales, translations, kaseResmi, parts, factory, partTypeDefs)) : null;
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

const CUR_LABEL = { TRY: "TL", EUR: "EURO", USD: "USD" };

// ── Teklif/Proforma/Fatura Print Templates ─────────────────────────────────────
export const DEFAULT_TRANSLATIONS = {
  TR: {
    titleTeklif: "TEKLİF FORMU", titleProforma: "PROFORMA FATURA",
    alicrLabel: "ALICI BİLGİLERİ", firmLabel: "Firma", yetkiliLabel: "Yetkili / Tel",
    adresLabel: "Adres", vergiLabel: "Vergi No / Dairesi",
    docLabelTeklif: "TEKLİF BİLGİLERİ", docLabelProforma: "PROFORMA BİLGİLERİ",
    tarihLabel: "Tarih", noLabel: "Teklif No",
    modelYiliLabel: "Model Yılı", modelYiliSuffix: "Yeni ve Kullanılmamıştır",
    kurLabel: "Kur (Bugün)", teslimYeriLabel: "Teslim Yeri",
    authorityLabel: "Yetkili", forwarderLabel: "Gönderen",
    thSira: "#", thKod: "KOD", thAd: "ÜRÜN ADI",
    thTanim: "AÇIKLAMA / ÖZELLİKLER", thMiktar: "ADET", thBirimFiyat: "BİRİM FİYAT", thTutar: "TUTAR",
    subtotalLabel: "ARA TOPLAM", iskontoLabel: "İSKONTO", netLabel: "NET TOPLAM",
    kdvPrefix: "KDV", grandLabel: "GENEL TOPLAM",
    koşullarBaslik: "TEKLİF KOŞULLARI",
    odemeSekli: "Ödeme Şekli", iskontoRow: "İskonto", teslimSekli: "Teslim Şekli",
    teslimSuresi: "Teslim Süresi", teslimTarihi: "Teslim Tarihi",
    gecerlilik: "Geçerlilik Süresi", notLabel: "Not", ekLabel: "Ek Bilgi",
    onayBaslik: "MÜŞTERİ ONAYI", onayAlt: "İsim Soyisim / Kaşe · İmza · Fatura Bilgileri",
    bankaBaslik: "ÖDEME VE BANKA BİLGİLERİ", hesapAdiLabel: "Hesap Adı",
    ibanTLLabel: "IBAN (TL)", ibanEURLabel: "IBAN (EUR)", ibanUSDLabel: "IBAN (USD)",
    sartlarBaslik: "GENEL ŞARTLAR",
    sart1: "Birim fiyatlara KDV dahil değildir.",
    sart2: "Onaylanmayan ve ödemesi yapılmayan sipariş kabul edilmemektedir.",
    sart3: "Teklifimiz, yukarıdaki miktarlarda sipariş verilmesi durumunda bu koşullar dahilinde geçerlidir.",
    notAlt: "Bu belge gizlidir. Yetkisiz kişilerle paylaşılmamalıdır.",
  },
  EN: {
    titleTeklif: "QUOTATION", titleProforma: "PROFORMA INVOICE",
    alicrLabel: "BUYER INFORMATION", firmLabel: "Company", yetkiliLabel: "Contact / Phone",
    adresLabel: "Address", vergiLabel: "Tax No / Office",
    docLabelTeklif: "QUOTATION DETAILS", docLabelProforma: "PROFORMA DETAILS",
    tarihLabel: "Date", noLabel: "Quote No",
    modelYiliLabel: "Model Year", modelYiliSuffix: "New and Unused",
    kurLabel: "Exchange Rate", teslimYeriLabel: "Delivery Point",
    authorityLabel: "Authority", forwarderLabel: "Forwarder",
    thSira: "#", thKod: "CODE", thAd: "PRODUCT NAME",
    thTanim: "DESCRIPTION / SPECIFICATIONS", thMiktar: "QTY", thBirimFiyat: "UNIT PRICE", thTutar: "AMOUNT",
    subtotalLabel: "SUBTOTAL", iskontoLabel: "DISCOUNT", netLabel: "NET TOTAL",
    kdvPrefix: "VAT", grandLabel: "GRAND TOTAL",
    koşullarBaslik: "TERMS & CONDITIONS",
    odemeSekli: "Payment Terms", iskontoRow: "Discount", teslimSekli: "Delivery Method",
    teslimSuresi: "Lead Time", teslimTarihi: "Delivery Date",
    gecerlilik: "Quote Validity", notLabel: "Note", ekLabel: "Additional Info",
    onayBaslik: "CUSTOMER APPROVAL", onayAlt: "Name / Stamp · Signature · Billing Information",
    bankaBaslik: "PAYMENT & BANK INFORMATION", hesapAdiLabel: "Account Name",
    ibanTLLabel: "IBAN (TL)", ibanEURLabel: "IBAN (EUR)", ibanUSDLabel: "IBAN (USD)",
    sartlarBaslik: "GENERAL TERMS",
    sart1: "All unit prices are exclusive of VAT.",
    sart2: "Orders that are not approved and paid will not be accepted.",
    sart3: "This quotation is valid only for the quantities stated above under the specified conditions.",
    notAlt: "This document is confidential. Do not share with unauthorized parties.",
  },
};

export const DEFAULT_SARTLAR = [
  { TR: DEFAULT_TRANSLATIONS.TR.sart1, EN: DEFAULT_TRANSLATIONS.EN.sart1 },
  { TR: DEFAULT_TRANSLATIONS.TR.sart2, EN: DEFAULT_TRANSLATIONS.EN.sart2 },
  { TR: DEFAULT_TRANSLATIONS.TR.sart3, EN: DEFAULT_TRANSLATIONS.EN.sart3 },
];

export const DEFAULT_FATURA_TRANSLATIONS = {
  title: "INVOICE",
  invoiceNoLabel: "Invoice No",
  dateLabel: "Date",
  fromLabel: "FROM",
  billToLabel: "BILL TO",
  thDescription: "Description",
  thSerialNo: "Serial No",
  thQty: "Qty",
  thUnitPrice: "Unit Price",
  thAmount: "Amount",
  paymentLabel: "Payment",
  deliveryLabel: "Delivery",
  packingLabel: "Packing",
  gtipLabel: "GTIP No",
  originLabel: "Country of Origin",
  exchangeRateLabel: "Exchange Rate",
  notesLabel: "Notes",
  bankLabel: "Bank Details",
  totalLabel: "Total",
};

// ── Print HTML ────────────────────────────────────────────────────────────────
export function buildPrintHtml(form, factory, translations = {}, kaseResmi = "", evrakFormConfig = null) {
  // Kullanıcı verisi tek noktadan HTML-güvenli hale getirilir (bkz. escDeep)
  form = escDeep(form); factory = escDeep(factory); translations = escDeep(translations || {}); evrakFormConfig = escDeep(evrakFormConfig);
  const f = factory || {};
  const bankalar = (Array.isArray(f.bankalar) && f.bankalar.length > 0)
    ? f.bankalar
    : (f.bankaAdi || f.hesapAdi || f.swift || f.ibanTL || f.ibanEUR || f.ibanUSD)
      ? [{ bankaAdi: f.bankaAdi, hesapAdi: f.hesapAdi, swift: f.swift, ibanTL: f.ibanTL, ibanEUR: f.ibanEUR, ibanUSD: f.ibanUSD }]
      : [];
  const isTR = form.dil !== "EN";
  const isProforma = form.type === "proforma";
  const cur = form.currency || "EUR";
  const curLabel = CUR_LABEL[cur] || cur;
  const BRAND = "#1a1a1a";

  const base = isTR
    ? { ...DEFAULT_TRANSLATIONS.TR, ...(translations?.TR || {}) }
    : { ...DEFAULT_TRANSLATIONS.EN, ...(translations?.EN || {}) };
  const L = {
    ...base,
    title:     isProforma ? base.titleProforma : base.titleTeklif,
    docLabel:  isProforma ? base.docLabelProforma : base.docLabelTeklif,
    newUnused: `${new Date().getFullYear()} — ${base.modelYiliSuffix}`,
    kdvLabel:  `${base.kdvPrefix} %${form.kdvOrani}`,
  };

  const docType = form.type;
  const FL_DEFAULTS = {
    alici: { yetkili: { TR: "Yetkili / Tel", EN: "Authority" }, vergiNo: { TR: "Vergi No / Dairesi", EN: "Tax No / Office" }, adres: { TR: "Adres", EN: "Address" }, country: { TR: "Ülke", EN: "Country" }, city: { TR: "Şehir", EN: "City" } },
    belge:  { forwarder: { TR: "Gönderen", EN: "Forwarder" }, kur: { TR: "Kur (Bugün)", EN: "Exchange Rate" }, teslimYeri: { TR: "Teslim Yeri", EN: "Delivery Point" }, not: { TR: "Not", EN: "Note" } },
    kosullar: { odemeSekli: { TR: "Ödeme Şekli", EN: "Payment Terms" }, teslimSekli: { TR: "Teslim Şekli", EN: "Delivery Method" }, teslimSuresi: { TR: "Teslim Süresi", EN: "Lead Time" }, teslimTarihi: { TR: "Teslim Tarihi", EN: "Delivery Date" }, teslimYeri: { TR: "Teslim Yeri", EN: "Delivery Point" }, teklifGecerlilik: { TR: "Geçerlilik Süresi", EN: "Quote Validity" }, kur: { TR: "Kur (Bugün)", EN: "Exchange Rate" }, not: { TR: "Not", EN: "Note" } },
  };
  const fl = (section, key) => {
    const lbl = evrakFormConfig?.[docType]?.fieldLabels?.[section]?.[key];
    const def = FL_DEFAULTS[section]?.[key];
    return isTR ? (lbl?.TR || def?.TR || "") : (lbl?.EN || def?.EN || def?.TR || "");
  };
  const isHiddenPrint = (section, key) =>
    (evrakFormConfig?.[docType]?.hiddenFields?.[section] || []).includes(key);

  const cfRowsHtml = (section) =>
    (evrakFormConfig?.[docType]?.customFields || [])
      .filter(cf => cf.section === section)
      .map(cf => {
        const label = (!isTR && cf.label.EN) ? cf.label.EN : cf.label.TR;
        const value = form.customFieldValues?.[cf.id];
        if (!value) return "";
        return `<tr>
          <td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;width:30%;">${label}</td>
          <td style="padding:2px 8px;">${value}</td>
        </tr>`;
      }).join("");

  const totals = (() => {
    const toplam = (form.satirlar || []).reduce((s, r) => s + (r.subItems || []).reduce((s2, item) => s2 + (parseMoney(item.birimFiyat) || 0) * (parseFloat(item.miktar) || 0), 0), 0);
    const iskonto = parseMoney(form.iskonto) || 0;
    const araToplam = toplam - iskonto;
    const kdv = araToplam * (parseFloat(form.kdvOrani) || 0) / 100;
    return { toplam, iskonto, araToplam, kdv, genelToplam: araToplam + kdv };
  })();

  const n = (val) => {
    const num = typeof val === "number" ? val : parseMoney(val);
    if ((!num && num !== 0) || val === "" || val === null || val === undefined) return "";
    return num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const fmt2 = (val) => { const s = n(val); return s ? `${s} ${curLabel}` : "—"; };
  const fmt2TL = (val) => { const num = parseMoney(val); return num ? `${num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL` : ""; };

  const companyName = f.evrakFirmaAdi || f.name || "ALTUNTAŞ MAKİNA SANAYİ";
  const companyAddr = f.adres || "Topçular mah. Keresteciler sit. İşgören sok. No:33/2-3 Eyüp / İSTANBUL";
  const companyLoc = [f.city, f.country].filter(Boolean).join(", "); // Şehir, Ülke sırası
  const companyPhone = f.phone || "";
  const companyEmail = f.email || "";

  // ── HEADER ─────────────────────────────────────────────────────────────────
  const enProforma = !isTR && isProforma;
  const header = `
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
    <tr>
      <td style="vertical-align:top;padding-right:20px;">
        <img src="${LOGO}" style="height:56px;object-fit:contain;display:block;" alt="logo" />
        ${firmaBlok({ name: companyName, adres: companyAddr, city: f.city, country: f.country, phone: companyPhone, email: companyEmail, web: f.web })}
      </td>
      <td style="text-align:right;vertical-align:middle;white-space:nowrap;">
        <div style="display:inline-block;background:${BRAND};color:#fff;padding:7px 16px;border-radius:6px;text-align:center;">
          <div style="font-size:13px;font-weight:900;letter-spacing:1px;">${L.title}</div>
          ${!isProforma && form.no ? `<div style="font-size:10px;margin-top:3px;opacity:.9;">${form.no}</div>` : ""}
          <div style="font-size:10px;margin-top:3px;opacity:.9;">${fmtTR(form.tarih) || ""}</div>
        </div>
      </td>
    </tr>
  </table>
  <div style="height:3px;background:${BRAND};border-radius:2px;margin-bottom:14px;"></div>`;

  // ── ALICI + BELGE BİLGİLERİ ─────────────────────────────────────────────
  const infoSection = `
  <table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:10px;">
    <tr>
      <td style="width:45%;vertical-align:top;padding-right:8px;">
        <div style="background:#f8f9fa;border-radius:6px;border:1px solid #e2e8f0;overflow:hidden;">
          <div style="background:#475569;color:#fff;font-weight:700;font-size:9.5px;letter-spacing:.5px;padding:4px 8px;">${L.docLabel}</div>
          <table style="width:100%;border-collapse:collapse;font-size:10px;">
            ${!isHiddenPrint("belge", "forwarder") ? `<tr>
              <td style="padding:4px 8px 2px;color:#888;font-size:9px;font-weight:600;width:42%;">${fl("belge", "forwarder")}</td>
              <td style="padding:4px 8px 2px;font-weight:700;">${companyName}</td>
            </tr>` : ""}
            ${!isProforma ? `<tr>
              <td style="padding:${!isHiddenPrint("belge", "forwarder") ? "2px" : "4px"} 8px 2px;color:#888;font-size:9px;font-weight:600;width:42%;">${L.noLabel}</td>
              <td style="padding:${!isHiddenPrint("belge", "forwarder") ? "2px" : "4px"} 8px 2px;font-weight:700;">${form.no || "—"}</td>
            </tr>` : ""}
            <tr>
              <td style="padding:${isProforma && isHiddenPrint("belge", "forwarder") ? "4px" : "2px"} 8px 2px;color:#888;font-size:9px;font-weight:600;">${L.tarihLabel}</td>
              <td style="padding:${isProforma ? "4px" : "2px"} 8px 2px;">${fmtTR(form.tarih) || ""}</td>
            </tr>
            ${!isHiddenPrint("belge", "modelYiliDegeri") ? `<tr>
              <td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">${L.modelYiliLabel}</td>
              <td style="padding:2px 8px;">${form.modelYiliDegeri || L.newUnused}</td>
            </tr>` : ""}
            ${form.currency !== "TRY" && form.kur && !isHiddenPrint("belge", "kur") ? `<tr>
              <td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">${fl("belge", "kur")}</td>
              <td style="padding:2px 8px;">${form.kur}</td>
            </tr>` : ""}
            ${isProforma && form.teslimYeri && !isHiddenPrint("belge", "teslimYeri") ? `<tr>
              <td style="padding:2px 8px 6px;color:#888;font-size:9px;font-weight:600;vertical-align:top;">${fl("belge", "teslimYeri")}</td>
              <td style="padding:2px 8px 6px;font-size:9.5px;">${form.teslimYeri}</td>
            </tr>` : `<tr><td colspan="2" style="padding:3px;"></td></tr>`}
            ${cfRowsHtml("belge")}
          </table>
        </div>
      </td>
      <td style="width:55%;vertical-align:top;">
        <div style="background:#f8f9fa;border-radius:6px;border:1px solid #e2e8f0;overflow:hidden;">
          <div style="background:${BRAND};color:#fff;font-weight:700;font-size:9.5px;letter-spacing:.5px;padding:4px 8px;">${L.alicrLabel}</div>
          <table style="width:100%;border-collapse:collapse;font-size:10px;">
            <tr>
              <td style="padding:4px 8px 2px;color:#888;font-size:9px;font-weight:600;width:30%;">${L.firmLabel}</td>
              <td style="padding:4px 8px 2px;font-weight:700;font-size:11px;color:#1a1a1a;">${form.firma || "—"}</td>
            </tr>
            ${!isHiddenPrint("alici", "yetkili") || !isHiddenPrint("alici", "tel") ? `<tr>
              <td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">${fl("alici", "yetkili")}</td>
              <td style="padding:2px 8px;">${[!isHiddenPrint("alici", "yetkili") ? form.yetkili : "", !isHiddenPrint("alici", "tel") ? form.tel : ""].filter(Boolean).join("  /  ") || "—"}</td>
            </tr>` : ""}
            ${form.authority && !isHiddenPrint("alici", "yetkili") ? `<tr>
              <td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">${fl("alici", "yetkili")}</td>
              <td style="padding:2px 8px;">${form.authority}</td>
            </tr>` : ""}
            ${(form.vergiNo || form.vergiDairesi) && !isHiddenPrint("alici", "vergiNo") && !isHiddenPrint("alici", "vergiDairesi") ? `<tr>
              <td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">${fl("alici", "vergiNo")}</td>
              <td style="padding:2px 8px;">${[form.vergiNo, form.vergiDairesi].filter(Boolean).join("  /  ")}</td>
            </tr>` : ""}
            ${form.adres && !isHiddenPrint("alici", "adres") ? `<tr>
              <td style="padding:2px 8px 2px;color:#888;font-size:9px;font-weight:600;vertical-align:top;">${fl("alici", "adres")}</td>
              <td style="padding:2px 8px 2px;">${form.adres}</td>
            </tr>` : ""}
            ${(() => {
              const showC = form.country && !isHiddenPrint("alici", "country");
              const showS = form.city && !isHiddenPrint("alici", "city");
              if (!showC && !showS) return `<tr><td colspan="2" style="padding:3px;"></td></tr>`;
              const lbl = showC && showS ? `${fl("alici", "country")} / ${fl("alici", "city")}` : showC ? fl("alici", "country") : fl("alici", "city");
              const cityVal = showS ? (isTR ? form.city : form.city.replace(/İ/g,"I").replace(/ı/g,"i").replace(/Ş/g,"S").replace(/ş/g,"s").replace(/Ğ/g,"G").replace(/ğ/g,"g").replace(/Ç/g,"C").replace(/ç/g,"c")) : "";
              const val = [showC ? (isTR ? form.country : (COUNTRY_EN[form.country] || form.country)) : "", cityVal].filter(Boolean).join(", ");
              return `<tr><td style="padding:2px 8px 6px;color:#888;font-size:9px;font-weight:600;">${lbl}</td><td style="padding:2px 8px 6px;">${val}</td></tr>`;
            })()}
            ${cfRowsHtml("alici")}
          </table>
        </div>
      </td>
    </tr>
  </table>`;

  // ── EN PROFORMA BİLGİ TABLOSU ─────────────────────────────────────────────
  const vergiStr = [form.vergiNo, form.vergiDairesi].filter(Boolean).join(" / ");
  const showModelYiliEN = !isHiddenPrint("belge", "modelYiliDegeri");
  const infoSectionEN = `
  <table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:10px;">
    <tr>
      <td style="width:50%;vertical-align:top;padding-right:8px;">
        <div style="background:#f8f9fa;border-radius:6px;border:1px solid #e2e8f0;overflow:hidden;height:100%;">
          <div style="background:#1a1a1a;color:#fff;font-weight:700;font-size:9.5px;letter-spacing:.5px;padding:4px 8px;">FROM</div>
          <table style="width:100%;border-collapse:collapse;font-size:10px;">
            <tr>
              <td style="padding:4px 8px 2px;color:#888;font-size:9px;font-weight:600;width:35%;">COMPANY</td>
              <td style="padding:4px 8px 2px;font-weight:700;font-size:11px;color:#1a1a1a;">${companyName}</td>
            </tr>
            ${companyAddr ? `<tr style="background:#fff;"><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">ADDRESS</td><td style="padding:2px 8px;">${companyAddr}</td></tr>` : ""}
            ${companyLoc ? `<tr><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">COUNTRY / CITY</td><td style="padding:2px 8px;">${companyLoc}</td></tr>` : ""}
            ${companyPhone ? `<tr style="background:#fff;"><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">PHONE</td><td style="padding:2px 8px;">${companyPhone}</td></tr>` : ""}
            ${companyEmail ? `<tr><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">EMAIL</td><td style="padding:2px 8px;">${companyEmail}</td></tr>` : ""}
            ${showModelYiliEN ? `<tr style="background:#fff;"><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">${L.modelYiliLabel}</td><td style="padding:2px 8px;">${form.modelYiliDegeri || L.newUnused}</td></tr>` : ""}
            ${form.currency !== "TRY" && form.kur && !isHiddenPrint("belge", "kur") ? `<tr><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">${fl("belge", "kur")}</td><td style="padding:2px 8px;">${form.kur}</td></tr>` : ""}
            ${form.teslimYeri && !isHiddenPrint("belge", "teslimYeri") ? `<tr style="background:#fff;"><td style="padding:2px 8px 4px;color:#888;font-size:9px;font-weight:600;vertical-align:top;">${fl("belge", "teslimYeri")}</td><td style="padding:2px 8px 4px;">${String(form.teslimYeri).replace(/\n/g, "<br>")}</td></tr>` : ""}
          </table>
        </div>
      </td>
      <td style="width:50%;vertical-align:top;">
        <div style="background:#f8f9fa;border-radius:6px;border:1px solid #e2e8f0;overflow:hidden;height:100%;">
          <div style="background:#475569;color:#fff;font-weight:700;font-size:9.5px;letter-spacing:.5px;padding:4px 8px;">BILL TO</div>
          <table style="width:100%;border-collapse:collapse;font-size:10px;">
            <tr>
              <td style="padding:4px 8px 2px;color:#888;font-size:9px;font-weight:600;width:35%;">COMPANY</td>
              <td style="padding:4px 8px 2px;font-weight:700;font-size:11px;color:#1a1a1a;">${form.firma || "—"}</td>
            </tr>
            ${form.adres ? `<tr style="background:#fff;"><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">ADDRESS</td><td style="padding:2px 8px;">${form.adres.replace(/\n/g, "<br>")}</td></tr>` : ""}
            ${(form.country || form.city) ? `<tr><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">COUNTRY / CITY</td><td style="padding:2px 8px;">${[COUNTRY_EN[form.country] || form.country, form.city ? form.city.replace(/İ/g,"I").replace(/ı/g,"i").replace(/Ş/g,"S").replace(/ş/g,"s").replace(/Ğ/g,"G").replace(/ğ/g,"g").replace(/Ç/g,"C").replace(/ç/g,"c") : ""].filter(Boolean).join(", ")}</td></tr>` : ""}
            ${vergiStr ? `<tr style="background:#fff;"><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">TAX ADMIN</td><td style="padding:2px 8px;">${vergiStr}</td></tr>` : ""}
            ${(form.authority || form.yetkili) ? `<tr><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">CONTACT</td><td style="padding:2px 8px;">${form.authority || form.yetkili}</td></tr>` : ""}
            ${form.tel ? `<tr style="background:#fff;"><td style="padding:2px 8px 4px;color:#888;font-size:9px;font-weight:600;">TELEPHONE</td><td style="padding:2px 8px 4px;">${form.tel}</td></tr>` : ""}
          </table>
        </div>
      </td>
    </tr>
  </table>`;

  // ── ÜRÜN TABLOSU ──────────────────────────────────────────────────────────
  const allItems = (form.satirlar || [])
    .flatMap(r => r.subItems || [])
    .filter(item => item.kod || item.makinaAdi || (parseMoney(item.birimFiyat) > 0));
  const rowsHtml = allItems.map((item, i) => {
    const tutar = (parseMoney(item.birimFiyat) || 0) * (parseFloat(item.miktar) || 0);
    const tutarTL = item.tlKarsiligi ? (parseMoney(item.tlKarsiligi) || 0) * (parseFloat(item.miktar) || 0) : null;
    const birimHtml = item.tlKarsiligi
      ? `${fmt2(parseMoney(item.birimFiyat))}<br><span style="font-size:9.5px;color:#777;">(${fmt2TL(item.tlKarsiligi)})</span>`
      : fmt2(parseMoney(item.birimFiyat));
    const tutarHtml = item.tlKarsiligi
      ? `${fmt2(tutar)}<br><span style="font-size:9.5px;color:#777;">(${fmt2TL(tutarTL)})</span>`
      : fmt2(tutar);
    const rowBg = i % 2 === 0 ? "#fff" : "#f8fafc";
    return `
    <tr style="background:${rowBg};">
      <td style="text-align:center;padding:5px 4px;border-bottom:1px solid #e8ecf0;color:#888;font-size:9.5px;">${i + 1}</td>
      <td style="padding:5px 6px;border-bottom:1px solid #e8ecf0;font-weight:700;font-size:9.5px;color:${BRAND};">${item.kod || ""}</td>
      <td style="padding:5px 6px;border-bottom:1px solid #e8ecf0;font-weight:600;font-size:10px;">
        ${item.resim ? `<img src="${item.resim}" style="width:60px;height:45px;object-fit:contain;display:block;margin-bottom:4px;border-radius:4px;border:1px solid #e8ecf0;">` : ""}
        ${item.makinaAdi || ""}
      </td>
      <td style="padding:5px 6px;border-bottom:1px solid #e8ecf0;font-size:9px;color:#444;line-height:1.5;">${(item.tanim || "").replace(/\n/g, "<br>")}</td>
      <td style="text-align:center;padding:5px 4px;border-bottom:1px solid #e8ecf0;font-weight:600;">${item.miktar || 1}</td>
      <td style="text-align:right;padding:5px 8px;border-bottom:1px solid #e8ecf0;white-space:nowrap;">${birimHtml}</td>
      <td style="text-align:right;padding:5px 8px;border-bottom:1px solid #e8ecf0;font-weight:700;white-space:nowrap;">${tutarHtml}</td>
    </tr>`;
  }).join("");

  const totalPrintItems = (form.satirlar || []).reduce((s, r) => s + (r.subItems || []).length, 0);
  const emptyRows = Math.max(0, 3 - totalPrintItems);
  const emptyHtml = Array(emptyRows).fill(`<tr style="background:#fff;"><td colspan="7" style="padding:8px;border-bottom:1px solid #e8ecf0;"></td></tr>`).join("");

  const productTable = `
  <div style="border-radius:8px;border:1px solid #dde3ea;overflow:hidden;margin-bottom:10px;">
    <table style="width:100%;border-collapse:collapse;font-size:10px;">
      <thead>
        <tr style="background:${BRAND};">
          <th style="padding:5px 4px;text-align:center;color:#fff;font-size:9px;font-weight:700;width:4%;">${L.thSira}</th>
          <th style="padding:5px 6px;text-align:left;color:#fff;font-size:9px;font-weight:700;width:9%;">${L.thKod}</th>
          <th style="padding:5px 6px;text-align:left;color:#fff;font-size:9px;font-weight:700;width:17%;">${L.thAd}</th>
          <th style="padding:5px 6px;text-align:left;color:#fff;font-size:9px;font-weight:700;">${L.thTanim}</th>
          <th style="padding:5px 4px;text-align:center;color:#fff;font-size:9px;font-weight:700;width:6%;">${L.thMiktar}</th>
          <th style="padding:5px 8px;text-align:right;color:#fff;font-size:9px;font-weight:700;width:14%;">${L.thBirimFiyat}</th>
          <th style="padding:5px 8px;text-align:right;color:#fff;font-size:9px;font-weight:700;width:14%;">${L.thTutar}</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        ${emptyHtml}
      </tbody>
    </table>
  </div>`;

  // ── TOPLAM KUTUSU ─────────────────────────────────────────────────────────
  const totalsBox = `
  <div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
    <div style="min-width:240px;border-radius:8px;border:1px solid #dde3ea;overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        ${totals.iskonto > 0 ? `
        <tr style="background:#f8f9fa;">
          <td style="padding:5px 10px;color:#555;font-weight:600;">${L.subtotalLabel}</td>
          <td style="padding:5px 10px;text-align:right;font-weight:600;">${fmt2(totals.toplam)}</td>
        </tr>
        <tr style="background:#f1f5f9;">
          <td style="padding:5px 10px;color:#475569;font-weight:600;">${L.iskontoLabel}</td>
          <td style="padding:5px 10px;text-align:right;color:#475569;font-weight:600;">− ${fmt2(totals.iskonto)}</td>
        </tr>
        <tr style="background:#f8f9fa;">
          <td style="padding:5px 10px;color:#555;font-weight:600;">${L.netLabel}</td>
          <td style="padding:5px 10px;text-align:right;font-weight:600;">${fmt2(totals.araToplam)}</td>
        </tr>` : `
        <tr style="background:#f8f9fa;">
          <td style="padding:5px 10px;color:#555;font-weight:600;">${L.subtotalLabel}</td>
          <td style="padding:5px 10px;text-align:right;font-weight:600;">${fmt2(totals.toplam)}</td>
        </tr>`}
        ${parseFloat(form.kdvOrani) > 0 ? `
        <tr style="background:#f8f9fa;">
          <td style="padding:5px 10px;color:#555;font-weight:600;">${L.kdvLabel}</td>
          <td style="padding:5px 10px;text-align:right;">${fmt2(totals.kdv)}</td>
        </tr>` : ""}
        <tr style="background:${BRAND};">
          <td style="padding:7px 10px;color:#fff;font-weight:800;font-size:11px;">${L.grandLabel}</td>
          <td style="padding:7px 10px;text-align:right;color:#fff;font-weight:900;font-size:12px;">${fmt2(totals.genelToplam)}</td>
        </tr>
      </table>
    </div>
  </div>`;

  // ── NOTLAR / KOŞULLAR (proforma sayfa 1 altı) ─────────────────────────────
  const proformaNotlar = isProforma ? `
  ${(form.not || form.ek) ? `
  <div style="border-radius:6px;border:1px solid #e2e8f0;padding:8px 12px;font-size:9px;color:#444;margin-bottom:8px;line-height:1.6;">
    ${form.not ? `<div><b>${fl("belge", "not")}:</b> ${form.not}</div>` : ""}
    ${form.ek ? `<div style="margin-top:4px;">${form.ek}</div>` : ""}
  </div>` : ""}
  ${(bankalar.some(b => b.bankaAdi || b.swift || b.ibanTL || b.ibanEUR || b.ibanUSD) || form.gtipNo) ? `
  <div style="border-radius:6px;background:#f8f9fa;border:1px solid #e2e8f0;padding:8px 12px;font-size:9.5px;line-height:1.7;">
    <div style="font-weight:700;color:#1a1a1a;font-size:10px;margin-bottom:4px;">${L.bankaBaslik}</div>
    ${bankalar.map((b, bi) => `
      ${bi > 0 ? `<div style="border-top:1px solid #e2e8f0;margin:4px 0;"></div>` : ""}
      ${b.bankaAdi ? `<div style="color:#444;">${b.bankaAdi}</div>` : ""}
      ${b.hesapAdi ? `<div>${L.hesapAdiLabel}: <b>${b.hesapAdi}</b></div>` : ""}
      ${b.swift ? `<div>SWIFT: <b>${b.swift}</b></div>` : ""}
      ${b.ibanTL ? `<div>${L.ibanTLLabel}: <b style="font-family:monospace;">${b.ibanTL}</b></div>` : ""}
      ${b.ibanEUR ? `<div>${L.ibanEURLabel}: <b style="font-family:monospace;">${b.ibanEUR}</b></div>` : ""}
      ${b.ibanUSD ? `<div>${L.ibanUSDLabel}: <b style="font-family:monospace;">${b.ibanUSD}</b></div>` : ""}
    `).join("")}
    ${form.gtipNo ? `<div style="margin-top:4px;border-top:1px solid #e2e8f0;padding-top:4px;">GTIP NO: <b>${form.gtipNo}</b></div>` : ""}
  </div>` : ""}
  ${enProforma ? `<div style="text-align:right;margin-top:12px;"><img src="${LOGO}" style="height:48px;object-fit:contain;" alt="logo" /></div>` : ""}` : "";

  // ── GENEL ŞARTLAR NOTU (teklif sayfa 1 altı) ──────────────────────────────
  const activeSartlar = (() => {
    const saved = evrakFormConfig?.teklif?.sartlar;
    if (saved && saved.length > 0) return saved.map(s => isTR ? (s.TR || s.EN || "") : (s.EN || s.TR || ""));
    return [L.sart1, L.sart2, L.sart3];
  })().filter(Boolean);

  const notAltText = (() => {
    const alt = evrakFormConfig?.[docType]?.notAlt;
    if (alt) return isTR ? (alt.TR || alt.EN || "") : (alt.EN || alt.TR || "");
    return L.notAlt;
  })();

  const teklifSartlar = !isProforma ? `
  <div style="border-top:2px solid #e2e8f0;margin-top:6px;padding-top:8px;font-size:10px;color:#64748b;line-height:1.7;">
    <b style="color:#475569;">${L.sartlarBaslik}:</b>
    ${activeSartlar.map(s => `<span style="display:inline-block;margin-right:12px;">• ${s}</span>`).join("")}
  </div>` : "";

  const proformaKase = isProforma && kaseResmi
    ? `<div style="margin-top:24px;text-align:right;"><img src="${kaseResmi}" style="max-height:80px;max-width:150px;object-fit:contain;" alt="kaşe"></div>`
    : "";
  const page1 = header + (enProforma ? infoSectionEN : infoSection) + productTable + totalsBox + proformaNotlar + teklifSartlar + proformaKase;

  // ── SAYFA 2 (sadece teklif) ───────────────────────────────────────────────
  const page2 = !isProforma ? `
  <div style="page-break-before:always;">
    ${header}

    <div style="font-size:12px;font-weight:800;color:${BRAND};border-bottom:2px solid ${BRAND};padding-bottom:4px;margin-bottom:10px;">${L.koşullarBaslik}</div>

    <table style="width:100%;border-collapse:collapse;font-size:10px;border-radius:8px;overflow:hidden;border:1px solid #dde3ea;margin-bottom:14px;">
      ${[
        !isHiddenPrint("kosullar", "odemeSekli") && [fl("kosullar", "odemeSekli"), form.odemeSekli],
        [L.iskontoRow, totals.iskonto > 0 ? fmt2(totals.iskonto) : "—"],
        !isHiddenPrint("kosullar", "teslimSekli") && [fl("kosullar", "teslimSekli"), form.teslimSekli],
        !isHiddenPrint("kosullar", "teslimSuresi") && [fl("kosullar", "teslimSuresi"), form.teslimSuresi],
        !isHiddenPrint("kosullar", "teslimTarihi") && [fl("kosullar", "teslimTarihi"), form.teslimTarihi ? fmtTR(form.teslimTarihi) : ""],
        !isHiddenPrint("kosullar", "teslimYeri") && [fl("kosullar", "teslimYeri"), form.teslimYeri],
        !isHiddenPrint("kosullar", "teklifGecerlilik") && [fl("kosullar", "teklifGecerlilik"), form.teklifGecerlilik],
        !isHiddenPrint("kosullar", "kur") && [fl("kosullar", "kur"), form.kur],
        !isHiddenPrint("kosullar", "not") && [fl("kosullar", "not"), form.not],
        ...(evrakFormConfig?.teklif?.customFields || [])
          .filter(cf => cf.section === "kosullar" && form.customFieldValues?.[cf.id])
          .map(cf => [(!isTR && cf.label.EN) ? cf.label.EN : cf.label.TR, form.customFieldValues[cf.id]]),
      ].filter(row => row && row[1]).map(([label, val], i) => `
      <tr style="background:${i % 2 === 0 ? "#f8f9fa" : "#fff"};">
        <td style="padding:6px 10px;font-weight:700;color:#475569;font-size:10px;width:28%;border-right:1px solid #e2e8f0;">${label}</td>
        <td style="padding:6px 10px;color:#1a1a1a;">${val}</td>
      </tr>`).join("")}
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
      <tr>
        <td style="width:50%;padding-right:10px;vertical-align:top;">
          <div style="border-radius:8px;border:2px solid ${BRAND};padding:10px 12px;">
            <div style="font-weight:800;font-size:10px;color:${BRAND};margin-bottom:8px;">${L.onayBaslik}</div>
            <div style="font-size:9px;color:#888;margin-bottom:6px;">${L.onayAlt}</div>
            <div style="height:40px;"></div>
            <div style="border-bottom:1px solid #999;margin-top:4px;"></div>
          </div>
        </td>
        <td style="width:50%;padding-left:10px;vertical-align:top;">
          ${bankalar.length > 0 ? `
          <div style="border-radius:8px;background:#f8f9fa;border:1px solid #e2e8f0;padding:10px 12px;">
            <div style="font-weight:800;font-size:10px;color:#1a1a1a;margin-bottom:8px;">${L.bankaBaslik}</div>
            ${bankalar.map((b, bi) => `
              ${bi > 0 ? `<div style="border-top:1px solid #e2e8f0;margin:4px 0;"></div>` : ""}
              ${b.bankaAdi ? `<div style="font-size:9px;color:#444;margin-bottom:2px;">${b.bankaAdi}${b.swift ? `  ·  SWIFT: <b>${b.swift}</b>` : ""}</div>` : ""}
              ${b.hesapAdi ? `<div style="font-size:9px;margin-bottom:2px;">${L.hesapAdiLabel}: <b>${b.hesapAdi}</b></div>` : ""}
              ${b.ibanTL ? `<div style="font-size:9px;margin-bottom:2px;">${L.ibanTLLabel}: <b style="font-family:monospace;">${b.ibanTL}</b></div>` : ""}
              ${b.ibanEUR ? `<div style="font-size:9px;margin-bottom:2px;">${L.ibanEURLabel}: <b style="font-family:monospace;">${b.ibanEUR}</b></div>` : ""}
              ${b.ibanUSD ? `<div style="font-size:9px;">${L.ibanUSDLabel}: <b style="font-family:monospace;">${b.ibanUSD}</b></div>` : ""}
            `).join("")}
          </div>` : ""}
          ${kaseResmi ? `<div style="margin-top:10px;text-align:right;"><img src="${kaseResmi}" style="max-height:80px;max-width:150px;object-fit:contain;" alt="kaşe"></div>` : ""}
        </td>
      </tr>
    </table>

    <div style="font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:8px;">${notAltText}</div>
  </div>` : "";

  return `<!DOCTYPE html><html lang="${isTR ? "tr" : "en"}"><head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; margin: 0; padding: 20px; color: #1a1a1a; background: #fff; }
    @media print {
      @page { margin: 10mm 12mm; size: A4; }
      body { padding: 0; }
    }
  </style>
  </head><body>
  ${page1}
  ${page2}
  </body></html>`;
}

export function buildFaturaHtml(fatura, factory, total, logoB64, kaseResmi = "", faturaT = {}, faturaCfg = null) {
  // Kullanıcı verisi tek noktadan HTML-güvenli hale getirilir (bkz. escDeep)
  fatura = escDeep(fatura); factory = escDeep(factory); faturaT = escDeep(faturaT || {}); faturaCfg = escDeep(faturaCfg);
  const L = { ...DEFAULT_FATURA_TRANSLATIONS, ...faturaT };
  const f = factory || {};
  // Yurt dışı faturaya özel firma adı: yalnızca burada kullanılır (teklif/proforma etkilenmez).
  // Boş ise normal evrak firma adına düşer (geriye dönük uyumlu).
  const faturaFirma = f.faturaFirmaAdi || f.evrakFirmaAdi || f.name || "Altuntaş Makina";
  const cur = fatura.currency || "USD";
  const fmt2 = (n) => (parseMoney(n) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const amountWords = numberToWordsEN(total, cur);
  const isH = (section, key) => (faturaCfg?.hiddenFields?.[section] || []).includes(key);

  // Banka bilgileri — factory.bankalar'dan (teklif/proforma ile aynı kaynak)
  const bankalar = (Array.isArray(f.bankalar) && f.bankalar.length > 0)
    ? f.bankalar
    : (f.bankaAdi || f.hesapAdi || f.swift || f.ibanTL || f.ibanEUR || f.ibanUSD)
      ? [{ bankaAdi: f.bankaAdi, hesapAdi: f.hesapAdi, swift: f.swift, ibanTL: f.ibanTL, ibanEUR: f.ibanEUR, ibanUSD: f.ibanUSD }]
      : [];
  const bankHtml = bankalar.map((b, bi) => `
    ${bi > 0 ? `<div style="border-top:1px solid #e2e8f0;margin:5px 0;"></div>` : ""}
    ${b.bankaAdi ? `<div>${b.bankaAdi}</div>` : ""}
    ${b.swift ? `<div>SWIFT: <b>${b.swift}</b></div>` : ""}
    ${b.hesapAdi ? `<div>Account Name: <b>${b.hesapAdi}</b></div>` : ""}
    ${b.ibanTL  ? `<div>IBAN (TRY): <b style="font-family:monospace;">${b.ibanTL}</b></div>` : ""}
    ${b.ibanEUR ? `<div>IBAN (EUR): <b style="font-family:monospace;">${b.ibanEUR}</b></div>` : ""}
    ${b.ibanUSD ? `<div>IBAN (USD): <b style="font-family:monospace;">${b.ibanUSD}</b></div>` : ""}
  `).join("");

  const hasSeriNo = (fatura.satirlar || []).some(r => r.seriNo);

  const itemRows = (fatura.satirlar || []).filter(r => r.model || r.aciklama).map((r, i) => {
    const adet = parseFloat(r.adet) || 0;
    const fiyat = parseMoney(r.birimFiyat) || 0;
    const tutar = adet * fiyat;
    const desc = r.aciklama || "";
    const modelCode = r.model ? `<b style="font-family:monospace;font-size:9px;">${r.model}</b>${desc ? "<br>" : ""}` : "";
    const tanimHtml = r.tanim ? `<div style="font-size:8.5px;color:#64748b;line-height:1.5;">${String(r.tanim).replace(/\n/g, "<br>")}</div>` : "";
    const resimHtml = r.resim ? `<img src="${r.resim}" style="width:90px;height:68px;object-fit:contain;display:block;border-radius:4px;border:1px solid #e8ecf0;">` : "";
    const bg = i % 2 === 0 ? "#fff" : "#f8fafc";
    return `<tr style="background:${bg};">
      <td style="padding:5px 8px;border-bottom:1px solid #e8ecf0;text-align:center;color:#888;font-size:9.5px;vertical-align:top;">${i + 1}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e8ecf0;vertical-align:top;">
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="flex-shrink:0;${resimHtml ? "width:90px;" : "max-width:140px;"}text-align:center;">
            ${resimHtml}
            <div style="${resimHtml ? "margin-top:4px;" : ""}font-size:10px;font-weight:600;line-height:1.35;">${modelCode}${desc}</div>
          </div>
          ${tanimHtml ? `<div style="flex:1;min-width:0;text-align:center;"><div style="display:inline-block;text-align:left;">${tanimHtml}</div></div>` : ""}
        </div>
      </td>
      ${hasSeriNo ? `<td style="padding:5px 8px;border-bottom:1px solid #e8ecf0;text-align:center;font-family:monospace;font-size:9.5px;vertical-align:top;">${r.seriNo || "—"}</td>` : ""}
      <td style="padding:5px 8px;border-bottom:1px solid #e8ecf0;text-align:center;vertical-align:top;">${r.adet || 1}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e8ecf0;text-align:right;vertical-align:top;white-space:nowrap;">${cur} ${fmt2(fiyat)}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e8ecf0;text-align:right;font-weight:700;vertical-align:top;white-space:nowrap;">${cur} ${fmt2(tutar)}</td>
    </tr>`;
  }).join("");

  const packingParts = [
    !isH("paketleme", "paketAdedi") && fatura.paketAdedi ? `${fatura.paketAdedi} Package` : "",
    !isH("paketleme", "brutAgirlik") && fatura.brutAgirlik ? `Gross Weight: ${fatura.brutAgirlik}` : "",
    !isH("paketleme", "olculer") && fatura.olculer ? `Dim: ${fatura.olculer}` : "",
  ].filter(Boolean);
  const packingText = packingParts.join(" / ");

  const logo = logoB64 ? `<img src="${logoB64}" style="height:56px;object-fit:contain;" alt="logo">` : "";
  const fromLines = [f.evrakFirmaAdi || f.name || "Altuntaş Makina", f.adres || f.address || "", [f.city, f.country].filter(Boolean).join(", "), f.phone || "", f.email || ""].filter(Boolean).join("<br>");
  const toLines = [
    fatura.firma || "—",
    !isH("alici", "adres") && fatura.adres ? fatura.adres.replace(/\n/g, "<br>") : "",
    !isH("alici", "ulke") || !isH("alici", "sehir") ? [!isH("alici", "ulke") ? (COUNTRY_EN[fatura.ulke] || fatura.ulke) : "", !isH("alici", "sehir") ? fatura.sehir : ""].filter(Boolean).join(", ") : "",
    !isH("alici", "vatId") && fatura.vatId ? `VAT ID: ${fatura.vatId}` : "",
    !isH("alici", "localTaxNo") && fatura.localTaxNo ? `Local Tax Number: ${fatura.localTaxNo}` : "",
  ].filter(Boolean).join("<br>");
  const tarihEN = fatura.tarih ? new Date(fatura.tarih + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

  // Özel alan satırları (fatura nesnesinde `_cf_<id>` anahtarlarıyla saklanır)
  const cfRows = (faturaCfg?.customFields || []).map(cf => {
    const val = fatura[`_cf_${cf.id}`] ?? "";
    if (!val) return "";
    const label = cf.label.EN || cf.label.TR || "";
    return `<div style="margin-bottom:10px;"><div class="lbl">${label}</div><div class="val">${val}</div></div>`;
  }).join("");

  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; margin: 0; padding: 20px; color: #1a1a1a; background: #fff; }
    @media print { @page { margin: 10mm 12mm; size: A4; } body { padding: 0; } }
    table.items { width: 100%; border-collapse: collapse; }
    table.items th { background: #1a1a1a; color: #fff; padding: 5px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: .5px; }
    .lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #888; margin-bottom: 3px; }
    .val { font-size: 10.5px; line-height: 1.6; }
  </style></head><body>
  <table style="width:100%;margin-bottom:16px;">
    <tr>
      <td style="vertical-align:top;">${logo}${firmaBlok({ ...f, evrakFirmaAdi: faturaFirma }, 12)}</td>
      <td style="text-align:right;vertical-align:top;">
        <div style="font-size:22px;font-weight:900;letter-spacing:2px;color:#1a1a1a;">${L.title}</div>
        <div style="margin-top:4px;font-size:10px;">
          <span class="lbl">${L.invoiceNoLabel}:&nbsp;</span><b>${fatura.no || "—"}</b>&emsp;
          <span class="lbl">${L.dateLabel}:&nbsp;</span><b>${tarihEN}</b>
        </div>
      </td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10px;">
    <tr>
      <td style="width:50%;vertical-align:top;padding-right:8px;">
        <div style="background:#f8f9fa;border-radius:6px;border:1px solid #e2e8f0;overflow:hidden;height:100%;">
          <div style="background:#1a1a1a;color:#fff;font-weight:700;font-size:9.5px;letter-spacing:.5px;padding:4px 8px;">${L.fromLabel}</div>
          <table style="width:100%;border-collapse:collapse;font-size:10px;">
            <tr>
              <td style="padding:4px 8px 2px;color:#888;font-size:9px;font-weight:600;width:35%;">COMPANY</td>
              <td style="padding:4px 8px 2px;font-weight:700;font-size:11px;color:#1a1a1a;">${faturaFirma}</td>
            </tr>
            ${(f.adres || f.address) ? `<tr style="background:#fff;"><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">ADDRESS</td><td style="padding:2px 8px;">${String(f.adres || f.address).replace(/\n/g, "<br>")}</td></tr>` : ""}
            ${[f.city, f.country].filter(Boolean).length ? `<tr><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">COUNTRY / CITY</td><td style="padding:2px 8px;">${[f.city, f.country].filter(Boolean).join(", ")}</td></tr>` : ""}
            ${f.phone ? `<tr style="background:#fff;"><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">PHONE</td><td style="padding:2px 8px;">${f.phone}</td></tr>` : ""}
            ${f.email ? `<tr><td style="padding:2px 8px 4px;color:#888;font-size:9px;font-weight:600;">EMAIL</td><td style="padding:2px 8px 4px;">${f.email}</td></tr>` : ""}
          </table>
        </div>
      </td>
      <td style="width:50%;vertical-align:top;">
        <div style="background:#f8f9fa;border-radius:6px;border:1px solid #e2e8f0;overflow:hidden;height:100%;">
          <div style="background:#475569;color:#fff;font-weight:700;font-size:9.5px;letter-spacing:.5px;padding:4px 8px;">${L.billToLabel}</div>
          <table style="width:100%;border-collapse:collapse;font-size:10px;">
            <tr>
              <td style="padding:4px 8px 2px;color:#888;font-size:9px;font-weight:600;width:35%;">COMPANY</td>
              <td style="padding:4px 8px 2px;font-weight:700;font-size:11px;color:#1a1a1a;">${fatura.firma || "—"}</td>
            </tr>
            ${!isH("alici", "adres") && fatura.adres ? `<tr style="background:#fff;"><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">ADDRESS</td><td style="padding:2px 8px;">${fatura.adres.replace(/\n/g, "<br>")}</td></tr>` : ""}
            ${(!isH("alici", "ulke") || !isH("alici", "sehir")) && (fatura.ulke || fatura.sehir) ? `<tr><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">COUNTRY / CITY</td><td style="padding:2px 8px;">${[!isH("alici", "ulke") ? (COUNTRY_EN[fatura.ulke] || fatura.ulke) : "", !isH("alici", "sehir") ? fatura.sehir : ""].filter(Boolean).join(", ")}</td></tr>` : ""}
            ${!isH("alici", "vatId") && fatura.vatId ? `<tr style="background:#fff;"><td style="padding:2px 8px;color:#888;font-size:9px;font-weight:600;">VAT ID</td><td style="padding:2px 8px;">${fatura.vatId}</td></tr>` : ""}
            ${!isH("alici", "localTaxNo") && fatura.localTaxNo ? `<tr><td style="padding:2px 8px 4px;color:#888;font-size:9px;font-weight:600;">LOCAL TAX NO</td><td style="padding:2px 8px 4px;">${fatura.localTaxNo}</td></tr>` : ""}
          </table>
        </div>
      </td>
    </tr>
  </table>

  <table class="items" style="margin-bottom:14px;">
    <thead><tr>
      <th style="text-align:center;width:32px;">#</th>
      <th style="text-align:left;">${L.thDescription}</th>
      ${hasSeriNo ? `<th style="text-align:center;width:110px;">${L.thSerialNo}</th>` : ""}
      <th style="text-align:center;width:50px;">${L.thQty}</th>
      <th style="text-align:right;width:130px;">${L.thUnitPrice}</th>
      <th style="text-align:right;width:130px;">${L.thAmount}</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <table style="width:100%;margin-bottom:14px;">
    <tr>
      <td style="vertical-align:top;padding-right:16px;width:55%;">
        ${!isH("belge", "payment") && fatura.payment ? `<div style="margin-bottom:8px;"><div class="lbl">${L.paymentLabel}</div><div class="val">${fatura.payment}</div></div>` : ""}
        ${!isH("belge", "delivery") && fatura.delivery ? `<div style="margin-bottom:8px;"><div class="lbl">${L.deliveryLabel}</div><div class="val">${fatura.delivery}</div></div>` : ""}
        ${packingText ? `<div style="margin-bottom:8px;"><div class="lbl">${L.packingLabel}</div><div class="val">${packingText}</div></div>` : ""}
        ${!isH("belge", "gtipNo") && fatura.gtipNo ? `<div style="margin-bottom:8px;"><div class="lbl">${L.gtipLabel}</div><div class="val">${fatura.gtipNo}</div></div>` : ""}
        ${!isH("belge", "origin") && fatura.origin ? `<div style="margin-bottom:8px;"><div class="lbl">${L.originLabel}</div><div class="val">${fatura.origin}</div></div>` : ""}
        ${!isH("belge", "kur") && fatura.kur ? `<div style="margin-bottom:8px;"><div class="lbl">${L.exchangeRateLabel}</div><div class="val">${fatura.kur}</div></div>` : ""}
        ${!isH("paketleme", "not") && fatura.not ? `<div style="margin-bottom:8px;"><div class="lbl">${L.notesLabel}</div><div class="val">${fatura.not}</div></div>` : ""}
        ${cfRows}
      </td>
      <td style="vertical-align:top;">
        ${bankHtml ? `<div style="margin-bottom:12px;"><div class="lbl">${L.bankLabel}</div><div class="val" style="font-size:9.5px;">${bankHtml}</div></div>` : ""}
        <div style="border-top:2px solid #1a1a1a;padding-top:8px;text-align:right;">
          <div style="font-size:9.5px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">${L.totalLabel}</div>
          <div style="font-size:18px;font-weight:900;">${cur} ${fmt2(total)}</div>
          <div style="font-size:9px;color:#555;font-style:italic;margin-top:4px;">${amountWords}</div>
        </div>
        ${kaseResmi ? `<div style="margin-top:24px;text-align:right;"><img src="${kaseResmi}" style="max-height:80px;max-width:150px;object-fit:contain;" alt="kaşe"></div>` : ""}
      </td>
    </tr>
  </table>
  </body></html>`;
}

// ── Aylık Faaliyet Raporu ─────────────────────────────────────────────────────
// Finance.jsx hesaplanmış özet verir; burada yalnızca sunum yapılır (escDeep ile güvenli)
export function buildAylikRaporHtml(rapor, factory) {
  rapor = escDeep(rapor); factory = escDeep(factory);
  const paraSatir = (obj) => Object.entries(obj || {}).filter(([, v]) => v > 0)
    .map(([cur, v]) => `${v.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ${cur}`).join(" + ") || "—";
  const kutu = (baslik, icerik) => `
    <div style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;overflow:hidden;">
      <div style="background:#1a1a1a;color:#fff;font-weight:700;font-size:11px;letter-spacing:.5px;padding:6px 12px;">${baslik}</div>
      <div style="padding:10px 12px;">${icerik}</div>
    </div>`;
  const st = (label, deger) => `<tr><td style="padding:3px 8px 3px 0;color:#64748b;font-size:11px;">${label}</td><td style="padding:3px 0;font-weight:700;font-size:12px;">${deger}</td></tr>`;
  // Önceki ay karşılaştırma eki: satır değerinin yanına küçük gri "geçen ay: X"
  const o = rapor.onceki || null;
  const ga = (val) => o ? `<span style="font-weight:400;color:#94a3b8;font-size:10px;"> · geçen ay: ${val}</span>` : "";
  const altBaslik = (t) => `<div style="font-size:10px;font-weight:700;color:#94a3b8;margin-top:8px;">${t}</div>`;

  const modelRows = (rapor.modelKirilimi || []).map(m =>
    `<tr><td style="padding:3px 8px 3px 0;font-size:11px;">${m.model}</td><td style="padding:3px 8px;font-size:11px;text-align:right;">${m.adet} adet</td><td style="padding:3px 0;font-size:11px;text-align:right;color:#475569;">${paraSatir(m.gelir)}</td></tr>`).join("");
  const saticiRows = (rapor.satisYapanKirilimi || []).map(x =>
    `<tr><td style="padding:3px 8px 3px 0;font-size:11px;">${x.ad}</td><td style="padding:3px 8px;font-size:11px;text-align:right;">${x.adet} adet</td></tr>`).join("");
  const servisRows = (rapor.servisKirilimi || []).map(x =>
    `<tr><td style="padding:3px 8px 3px 0;font-size:11px;">${x.tip}</td><td style="padding:3px 8px;font-size:11px;text-align:right;">${x.adet}</td></tr>`).join("");

  // ── Firma firma detay tabloları ──
  const gun = (iso) => { const mm = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return mm ? `${mm[3]}.${mm[2]}.${mm[1]}` : (iso || "—"); };
  // Detay tablosu: başlık + kolon başlıkları + satırlar (hücreler HTML). Boşsa hiç basılmaz.
  const detayTablo = (baslik, basliklar, satirlar, hizalar = []) => {
    if (!satirlar || !satirlar.length) return "";
    const hiza = (i) => hizalar[i] || "left";
    const th = basliklar.map((h, i) => `<th style="text-align:${hiza(i)};padding:4px 8px 4px 0;font-size:9px;color:#94a3b8;font-weight:700;border-bottom:1px solid #cbd5e1;">${h}</th>`).join("");
    const tr = satirlar.map(hucreler => `<tr>${hucreler.map((c, i) => `<td style="text-align:${hiza(i)};padding:3px 8px 3px 0;font-size:10.5px;border-bottom:1px solid #f1f5f9;">${c ?? "—"}</td>`).join("")}</tr>`).join("");
    return `${altBaslik(baslik)}<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
  };

  const satisDetayTablo = detayTablo("SATILAN MAKİNALAR (firma firma)", ["Firma", "Model", "Fatura", "Tutar"],
    (rapor.satisDetay || []).map(r => [r.firma, r.model, r.faturaTipi, paraSatir(r.tutar)]), ["left", "left", "left", "right"]);
  const extraKalipDetayTablo = detayTablo("EXTRA KALIP ALAN FİRMALAR", ["Firma", "Adet", "Tutar"],
    (rapor.extraKalipDetay || []).map(r => [r.firma, r.adet, paraSatir(r.tutar)]), ["left", "right", "right"]);
  const yedekParcaDetayTablo = detayTablo("YEDEK PARÇA ALAN FİRMALAR", ["Firma", "Miktar", "Tutar"],
    (rapor.yedekParcaDetay || []).map(r => [r.firma, r.miktar, paraSatir(r.tutar)]), ["left", "right", "right"]);
  const anlasmaliParcaDetayTablo = detayTablo("ANLAŞMALI SERVİSLERE PARÇA (firma firma)", ["Müşteri Firma", "Servis Firması", "Parça Ücreti", "KDV", "Durum"],
    (rapor.anlasmaliParcaDetay || []).map(r => [r.firma, r.servisFirma, paraSatir(r.tutar), paraSatir(r.kdv), r.odendi ? "Ödendi" : "Ödenmedi"]), ["left", "left", "right", "right", "left"]);
  const servisDetayTablo = detayTablo("SERVİS VERİLEN FİRMALAR (firma firma)", ["Firma", "Tip", "İşçilik", "Parça", "KDV", "Durum"],
    (rapor.servisDetay || []).map(r => [r.firma, r.tip, paraSatir(r.iscilik), paraSatir(r.parca), paraSatir(r.kdv), r.odendi ? "Ödendi" : "Ödenmedi"]), ["left", "left", "right", "right", "right", "left"]);
  const tahsilatDetayTablo = detayTablo("KİMDEN TAHSİL EDİLDİ", ["Firma", "Yöntem", "Tarih", "Tutar"],
    (rapor.tahsilatDetay || []).map(r => [r.firma, r.yontem, gun(r.tarih), paraSatir(r.tutar)]), ["left", "left", "left", "right"]);
  const bekleyenCekDetayTablo = detayTablo("VADESİ BEKLEYEN ÇEKLER", ["Firma", "Vade", "Tutar"],
    (rapor.bekleyenCekDetay || []).map(r => [r.firma, gun(r.vadeTarihi), paraSatir(r.tutar)]), ["left", "left", "right"]);
  const alacakDetayTablo = detayTablo("BORÇLU FİRMALAR (firma firma)", ["Firma", "Kaynak", "Açık Borç"],
    (rapor.alacakDetay || []).map(r => [r.firma, (r.kaynaklar || []).join(", "), paraSatir(r.tutar)]), ["left", "left", "right"]);
  const teklifDetayTablo = detayTablo("VERİLEN TEKLİFLER (firma firma)", ["Firma", "Durum", "Tarih", "Tutar"],
    (rapor.teklifDetay || []).map(r => [r.firma, r.durum, gun(r.tarih), paraSatir(r.tutar)]), ["left", "left", "left", "right"]);

  // ── Yönetici özeti + KDV beyanname özeti ──
  const ozet = rapor.ozet || {};
  const tl = (n) => (n == null ? "" : `${Math.round(n).toLocaleString("tr-TR")} TL`);
  const dovizVar = (obj) => Object.keys(obj || {}).some(k => k !== "TRY" && obj[k]); // yalnızca yabancı para varsa ≈ TL göster
  const ozetSatir = (label, obj, tlVal) => {
    const yak = (tlVal != null && dovizVar(obj)) ? ` <span style="color:#94a3b8;font-weight:400;font-size:10px;">(≈ ${tl(tlVal)})</span>` : "";
    return `<tr><td style="padding:5px 10px 5px 0;color:#475569;font-size:11.5px;">${label}</td><td style="padding:5px 0;font-weight:800;font-size:13.5px;text-align:right;white-space:nowrap;">${paraSatir(obj)}${yak}</td></tr>`;
  };
  const ozetKutusu = `
    <div style="border:1px solid #f0b690;border-radius:8px;margin-bottom:12px;overflow:hidden;">
      <div style="background:linear-gradient(90deg,#e85d1a,#f59e0b);color:#fff;font-weight:800;font-size:12px;letter-spacing:.5px;padding:7px 12px;">YÖNETİCİ ÖZETİ</div>
      <div style="padding:10px 14px;background:#fffaf5;">
        <table>
          ${ozetSatir("Toplam ciro (net, KDV hariç)", ozet.ciroNet, ozet.ciroNetTL)}
          ${ozetSatir("Gerçekleşen tahsilat", ozet.tahsilat, ozet.tahsilatTL)}
          ${ozetSatir("Açık alacak (güncel bakiye)", ozet.alacak, ozet.alacakTL)}
          ${ozetSatir("Bu ay doğan KDV", ozet.toplamKdv, ozet.toplamKdvTL)}
        </table>
        <div style="font-size:10px;color:#94a3b8;margin-top:8px;padding-top:6px;border-top:1px solid #f1e4d6;">
          ${rapor.satisAdet} makina · ${rapor.servisAdet} servis · ${rapor.tahsilatAdet} tahsilat kaydı · ${rapor.teklifAdet} teklif${ozet.ciroNetTL != null ? " · ≈ TL değerleri günün kuruyla yaklaşıktır" : ""}
        </div>
      </div>
    </div>`;
  const kdvOzetKutusu = kutu("KDV ÖZETİ (beyanname)", `<table>
    ${st("Satış (makina) KDV'si", paraSatir(rapor.kdvKalemleri?.satis))}
    ${st("Servis + parça KDV'si", paraSatir(rapor.kdvKalemleri?.servis))}
    ${st("Extra kalıp KDV'si", paraSatir(rapor.kdvKalemleri?.extraKalip))}
    ${st("Anlaşmalı servis parçası KDV'si", paraSatir(rapor.kdvKalemleri?.anlasmaliParca))}
    <tr><td style="padding:6px 8px 3px 0;font-size:12px;font-weight:800;border-top:2px solid #1a1a1a;">BU AY DOĞAN TOPLAM KDV</td><td style="padding:6px 0 3px;font-weight:800;font-size:13px;text-align:right;border-top:2px solid #1a1a1a;">${paraSatir(rapor.toplamKdv)}</td></tr>
  </table>
  <div style="font-size:9.5px;color:#94a3b8;margin-top:6px;">Yalnızca Faturalı Yurtiçi işlemler KDV doğurur; faturasız ve yurtdışı işlemler bu toplama girmez. Beyanname öncesi kontrol amaçlıdır.</div>`);

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">
<title>Aylık Rapor ${rapor.ayEtiketi}</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;max-width:720px;margin:24px auto;padding:0 16px;} table{border-collapse:collapse;width:100%;}</style>
</head><body>
  <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px solid #1a1a1a;padding-bottom:8px;margin-bottom:16px;">
    <div>
      <div style="font-size:18px;font-weight:800;">Aylık Faaliyet Raporu</div>
      <div style="font-size:13px;color:#475569;">${rapor.ayEtiketi}</div>
      <div style="font-size:11px;color:#94a3b8;">Dönem: ${rapor.donem}</div>
    </div>
    <div style="text-align:right;font-size:11px;color:#64748b;">
      <div style="font-weight:700;font-size:13px;color:#1a1a1a;">${factory?.evrakFirmaAdi || factory?.name || "Altuntaş Makina"}</div>
      ${factory?.adres ? `<div>${factory.adres}</div>` : ""}
      ${[factory?.city, factory?.country].filter(Boolean).length ? `<div>${[factory?.city, factory?.country].filter(Boolean).join(", ")}</div>` : ""}
      ${[factory?.phone, factory?.email].filter(Boolean).length ? `<div>${[factory?.phone, factory?.email].filter(Boolean).join("  ·  ")}</div>` : ""}
      ${factory?.web ? `<div>${factory.web}</div>` : ""}
      <div>Oluşturma: ${rapor.olusturmaTarihi}</div>
    </div>
  </div>

  ${ozetKutusu}
  ${kdvOzetKutusu}

  ${kutu("SATIŞLAR", `<table>
    ${st("Satılan makina", `${rapor.satisAdet} adet${ga(`${o?.satisAdet} adet`)}`)}
    ${rapor.ikinciElAdet > 0 || o?.ikinciElAdet > 0 ? st("2. el devir", `${rapor.ikinciElAdet} adet${ga(`${o?.ikinciElAdet} adet`)}`) : ""}
    ${st("Fabrika satış bedeli", `${paraSatir(rapor.satisTutar)}${ga(paraSatir(o?.satisTutar))}`)}
    ${st("Fatura bedeli", paraSatir(rapor.faturaTutar))}
    ${st("Makina KDV'si", paraSatir(rapor.satisKdv))}
    ${st("Ödenen komisyon", paraSatir(rapor.komisyonTutar))}
  </table>
  ${modelRows ? `${altBaslik("MODEL KIRILIMI")}<table>${modelRows}</table>` : ""}
  ${saticiRows ? `${altBaslik("SATIŞ YAPAN KIRILIMI")}<table>${saticiRows}</table>` : ""}
  ${satisDetayTablo}`)}

  ${kutu("DİĞER SATIŞLAR", `<table>
    ${st("Extra kalıp satışı", `${rapor.extraKalipAdet} adet · ${paraSatir(rapor.extraKalipTutar)}${ga(paraSatir(o?.extraKalipTutar))}`)}
    ${st("Extra kalıp KDV'si", paraSatir(rapor.extraKalipKdv))}
    ${st("Yedek parça satışı", `${rapor.yedekParcaAdet} adet · ${paraSatir(rapor.yedekParcaTutar)}`)}
    ${st("Anlaşmalı servislere parça", paraSatir(rapor.anlasmaliParcaTutar))}
  </table>
  ${extraKalipDetayTablo}
  ${yedekParcaDetayTablo}
  ${anlasmaliParcaDetayTablo}`)}

  ${kutu("SERVİS", `<table>
    ${st("Servis kaydı", `${rapor.servisAdet} adet${ga(`${o?.servisAdet} adet`)}`)}
    ${st("İşçilik geliri", `${paraSatir(rapor.iscilikTutar)}${ga(paraSatir(o?.iscilikTutar))}`)}
    ${st("Parça geliri (Altuntaş servisi)", paraSatir(rapor.servisParcaTutar))}
    ${st("Servis + parça KDV'si", paraSatir(rapor.servisKdv))}
  </table>
  ${servisRows ? `${altBaslik("TİP KIRILIMI")}<table>${servisRows}</table>` : ""}
  ${servisDetayTablo}`)}

  ${kutu("TAHSİLAT (gerçekleşen)", `<div style="font-size:10px;color:#475569;margin-bottom:8px;line-height:1.5;background:#f8fafc;border-left:3px solid #0d9488;padding:6px 10px;">
    <b>Gerçekleşen tahsilat nedir?</b> Bu ay kayda alınan ve fiilen tahsil edilen ödemelerdir: nakit/havale girildiği anda,
    çekler ise ancak tahsil edildiklerinde sayılır. <b>Sadece borçlulardan değil,</b> o ay ödeme yapan tüm müşterileri kapsar.
    Vadesi henüz gelmemiş/tahsil edilmemiş çekler bu tutara girmez, aşağıda ayrı gösterilir.
  </div>
  <table>
    ${st("Gerçekleşen tahsilat", `${rapor.tahsilatAdet} kayıt · ${paraSatir(rapor.tahsilatTutar)}${ga(paraSatir(o?.tahsilatTutar))}`)}
    ${st("Ay içinde alınan, vadesi bekleyen çek", `${rapor.bekleyenCekAdet} adet · ${paraSatir(rapor.bekleyenCekTutar)}`)}
    ${st("Ay içinde tahsil edilen çek", rapor.cekTahsilAdet + " adet")}
  </table>
  ${tahsilatDetayTablo}
  ${bekleyenCekDetayTablo}`)}

  ${kutu("ALACAK DURUMU (rapor tarihi itibarıyla)", `<table>
    ${st("Borçlu firma", rapor.borcluFirma + " firma")}
    ${st("Toplam alacak (makina + servis + kalıp, KDV dahil)", paraSatir(rapor.acikBorc))}
    ${st("Vadesi geçmiş çek", rapor.gecikenCek + " adet")}
    ${st("Vadesi geçmiş taksit", rapor.gecikenTaksit + " adet")}
  </table>
  ${alacakDetayTablo}
  <div style="font-size:9.5px;color:#94a3b8;margin-top:6px;">Bu bölüm seçilen aya değil, raporun oluşturulduğu andaki güncel duruma aittir.</div>`)}

  ${kutu("TEKLİFLER", `<table>
    ${st("Ay içinde verilen teklif", `${rapor.teklifAdet} adet${ga(`${o?.teklifAdet} adet`)}`)}
    ${st("Bunlardan bugüne kadar onaylanan / satışa dönen", rapor.onaylananTeklif + " adet")}
    ${st("Cevap bekleyen toplam teklif", rapor.bekleyenTeklif + " adet")}
  </table>
  ${teklifDetayTablo}`)}
</body></html>`;
}
