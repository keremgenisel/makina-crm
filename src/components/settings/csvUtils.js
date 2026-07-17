// Dışa Aktar ve İçe Aktar sekmeleri arasında paylaşılan CSV yardımcıları.

// CSV/Excel formül enjeksiyonu koruması: = + - @ ile ya da tab/CR ile başlayan hücreler Excel/
// LibreOffice'te formül (hatta DDE ile komut) olarak yorumlanabilir. Böyle hücreleri başına '
// ekleyerek metne zorlarız (OWASP önerisi). Düz sayılar (negatif/ondalık) ve +telefon dokunulmaz
// kalır ki finans sütunları ve telefonlar bozulmasın (bunlar zaten formül tetiklemez).
export const csvSafeCell = (x) => {
  const s = String(x ?? "");
  if (!/^[=+\-@\t\r]/.test(s)) return s;
  if (/^[-+]?\d[\d.,]*$/.test(s)) return s; // düz sayı → güvenli, dokunma
  return "'" + s;
};

export const buildCSV = (rows) => "﻿" + rows.map(r => r.map(x => `"${csvSafeCell(x).replace(/"/g, '""')}"`).join(";")).join("\n");

export const downloadCSV = (rows, filename) => {
  const blob = new Blob([buildCSV(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
};

// XLSX ile indir — Türkçe karakterler her zaman korunur, CSV'ye kıyasla Excel uyumluluğu garantili.
export const downloadXlsx = async (rows, filename, sheetName = "Veri") => {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
};

// XLSX içeriğini base64 string olarak döndürür (e-posta eki için).
export const xlsxToBase64 = async (rows, sheetName = "Veri") => {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: "base64", bookType: "xlsx" });
};

export const utf8ToBase64 = (str) => {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return window.btoa(binary);
};

// Şablon sütun başlıkları (müşteri bu sıraya uyarlar) — "Tümünü İndir" (Dışa Aktar) bu formatta
// üretir, "İçe Aktar" bu formatı okur; ikisi de aynı sütun düzenini paylaşmalı.
export const IMPORT_HEADERS = [
  "Kalıp Sayısı", "Satış Yapan", "Satın Alan Firma", "Telefon", "Adres", "Ülke", "Şehir",
  "Model", "Makina Kalıp Çapı (çap x arka ölçü x boy)", "Para Birimi (TL/USD/EUR)", "Satış Tipi (Faturalı Yurtiçi/Yurtdışı/Faturasız Yurtiçi/Yurtdışı)", "Aldığı Kalıplar", "Satış Tarihi / Garanti Başlangıç (gg.aa.yyyy)", "Garanti Bitiş (gg.aa.yyyy)", "Fabrika Satış Bedeli", "Fatura Bedeli",
  "Komisyon", "Extra Kalıp Fiyatı", "Kalan Borç", "Seri Numarası", "Açıklama",
  "Servis1 Tarih", "Servis1 Yapılan İş", "Servis2 Tarih", "Servis2 Yapılan İş", "Servis3 Tarih", "Servis3 Yapılan İş",
  "Yetkili1 Ad", "Yetkili1 Telefon", "Yetkili2 Ad", "Yetkili2 Telefon",
  "E-posta", "Ödeme Planı (vade:tutar; ...)", "Brüt Kg",
  // Sona eklendi: sütunlar sıra numarasıyla okunuyor, araya eklemek eski dosyaları bozar.
  "İlçe (yalnız İstanbul, Ankara, İzmir, Manisa, Antalya, Tekirdağ, Bursa, Balıkesir, Konya, Kocaeli, Muğla)",
];
