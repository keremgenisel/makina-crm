import LOGO from "../assets/logo.avif?inline";
import { today, todayTR, fmtTR, fmtCur, parseMoney, calcKDV, fmtKalipCapi, kalipText, stripAutoPrint, parcaAdi } from "./utils";

const esc = (s) => String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// HTML üretimi (Yazdır ve E-posta eki/PDF için paylaşılan mantık) — tek bir servis kaydının "Servis Formu"
// forEmail: true ise "Teslim Eden"/"Teslim Alan" imza alanları çıkarılır — bunlar fiziksel teslimat sırasında
// elle imzalanan kutucuklar, e-posta ekinde anlamsız kalıyor.
export function buildServiceFormHtml(sv, customers, kdvRate, { forEmail = false } = {}) {
  const cust = customers.find(c => c.id === sv.customerId) || {};
  const adres = [cust.adres, cust.city, cust.country].filter(Boolean).join(", ") || "—";
  const servisUcretiVar = (sv.type === "Garanti Dışı" || sv.type === "Periyodik Bakım") && parseMoney(sv.servisUcreti) > 0;
  const parcaUcretiVar = !sv.parcaUcretsizMi && parseMoney(sv.parcaUcreti) > 0;
  const ucret = servisUcretiVar ? fmtCur(sv.servisUcreti, sv.currency) : "—";
  const parcaUcret = parcaUcretiVar ? fmtCur(sv.parcaUcreti, sv.parcaCurrency) : "—";
  const sameCurrency = (sv.currency || "TRY") === (sv.parcaCurrency || sv.currency || "TRY");
  let toplam = null;
  if (servisUcretiVar && parcaUcretiVar) {
    if (sameCurrency) {
      const toplamTutar = parseMoney(sv.servisUcreti) + parseMoney(sv.parcaUcreti);
      const kdv = calcKDV(sv.faturaTipi, toplamTutar, kdvRate);
      toplam = fmtCur(toplamTutar, sv.currency) + (kdv > 0 ? ` (KDV dahil: ${fmtCur(toplamTutar + kdv, sv.currency)})` : "");
    } else {
      toplam = `${fmtCur(sv.servisUcreti, sv.currency)} + ${fmtCur(sv.parcaUcreti, sv.parcaCurrency)}`;
    }
  } else if (servisUcretiVar || parcaUcretiVar) {
    const toplamTutar = servisUcretiVar ? parseMoney(sv.servisUcreti) : parseMoney(sv.parcaUcreti);
    const cur = servisUcretiVar ? sv.currency : sv.parcaCurrency;
    const kdv = calcKDV(sv.faturaTipi, toplamTutar, kdvRate);
    toplam = kdv > 0 ? `${fmtCur(toplamTutar, cur)} (KDV dahil: ${fmtCur(toplamTutar + kdv, cur)})` : null;
  }

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
  <div class="box-area" style="min-height:auto">${esc(sv.degisenParcalar.map(p => {
    const ad = parcaAdi(p);
    const fiyat = typeof p === "object" ? parseMoney(p.fiyat) : 0;
    return fiyat > 0 ? `${ad} (${fmtCur(fiyat, sv.parcaCurrency)})` : ad;
  }).join(", "))}</div>
  ` : ""}

  <h2>MÜŞTERİ TALİMATI / AÇIKLAMA</h2>
  <div class="box-area">${esc(sv.musteriTalimati || "")}</div>

  ${forEmail ? "" : `<table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:none">
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
  </table>`}

  <div class="terms">
    1- Yukarıda adı ve miktarı belirtilen parçaları tam olarak teslim aldım. Yapılan hizmeti kabul ediyorum.<br>
    2- Tamir süresi 10 (on) iş gününü geçmez.<br>
    3- Yere düşen malzemeler garanti kapsamı dışındadır.<br>
    4- Teslim tarihinden itibaren 20 iş günü içerisinde alınmayan ürünlerden servisimiz sorumlu değildir.
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</` + `script>
</body>
</html>`;

  return html;
}

// Yazdırma: tek bir servis kaydının "Servis Formu"nu üret
export function printServiceForm(sv, customers, kdvRate) {
  const html = buildServiceFormHtml(sv, customers, kdvRate);
  const cust = customers.find(c => c.id === sv.customerId) || {};
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
}

// HTML üretimi (Yazdır ve E-posta eki/PDF için paylaşılan mantık) — Makina Servis ve Yedek Parça Geçmişi Raporu
export function buildMachineReportHtml(detailView, detailHistory, partSales) {
  const detailWarrantyOk = detailView?.warrantyEnd && detailView.warrantyEnd >= today();
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
        `<tr><td>${esc(fmtTR(sv.date))}</td><td>${esc(sv.type)}</td><td>${esc(sv.repairPlace || "—")}</td><td>${esc(sv.tech || "—")}</td><td>${esc(sv.yapilanIsler || sv.description || "")}${sv.degisenParcalar?.length ? `<br><b>Değişen parçalar:</b> ${esc(sv.degisenParcalar.map(parcaAdi).join(", "))}` : ""}</td></tr>`
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

  return html;
}

// Yazdırma: Makina Servis ve Yedek Parça Geçmişi Raporu
export function printMachineReport(detailView, detailHistory, partSales) {
  const html = buildMachineReportHtml(detailView, detailHistory, partSales);
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
}
