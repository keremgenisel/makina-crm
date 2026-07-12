// Kalıp Üretim Formu yazdırma/PDF şablonu ve yardımcıları.
// UretimFormu.jsx'ten ayrıldı: saf fonksiyonlar (state'siz), hem yazdırma hem
// e-posta PDF eki bunları kullanır. groupByMusteri + fmtDate ekranda da kullanılır.

/** "YYYY-MM-DD" → "DD.MM.YYYY" (boşsa "—"). */
export const fmtDate = d => d ? d.split("-").reverse().join(".") : "—";

/** Satırları müşteriye göre gruplar (ilk görülme sırasını korur). */
export function groupByMusteri(satirlar) {
  const order = [];
  const map = {};
  for (const r of satirlar) {
    const key = r.musteriId ? `id:${r.musteriId}` : `ad:${r.musteriAdi || ""}`;
    if (!map[key]) {
      map[key] = { musteriAdi: r.musteriAdi || "", sehir: r.sehir || "", makinaKodu: r.makinaKodu || "", rows: [] };
      order.push(key);
    }
    map[key].rows.push(r);
  }
  return order.map(k => map[k]);
}

/** Üretim formunu yazdırılabilir/PDF'e uygun tam HTML belgesine çevirir. */
export function buildPrintHtml(form) {
  const groups = groupByMusteri(form.satirlar || []);
  const bas = form.baslangicTarihi || form.tarih || "";
  const bit = form.bitisTarihi || form.tarih || "";
  const tarihStr = bas ? (bas === bit ? fmtDate(bas) : `${fmtDate(bas)} – ${fmtDate(bit)}`) : "";

  const colHeaders = `
    <tr>
      <th style="background:var(--n700, #334155);color:#fff;padding:5px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.4px;border:1px solid var(--n600, #475569);font-weight:700;width:90px;">Kalıp Kodu</th>
      <th style="background:var(--n700, #334155);color:#fff;padding:5px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.4px;border:1px solid var(--n600, #475569);font-weight:700;">Kalıp</th>
      <th style="background:var(--n700, #334155);color:#fff;padding:5px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.4px;border:1px solid var(--n600, #475569);font-weight:700;width:110px;">Kalıp Ölçüsü</th>
      <th style="background:var(--n700, #334155);color:#fff;padding:5px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.4px;border:1px solid var(--n600, #475569);font-weight:700;width:140px;">Kalıp CNC Torna Ölçüleri</th>
      <th style="background:var(--n700, #334155);color:#fff;padding:5px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.4px;border:1px solid var(--n600, #475569);font-weight:700;width:55px;text-align:center;">Durum</th>
    </tr>`;

  const bodyRows = groups.map((g, gi) => {
    const header = `
      <tr>
        <td colspan="5" style="border:1px solid var(--n700, #334155);padding:6px 12px;background:var(--n800, #1e293b);color:#fff;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.4px;${gi > 0 ? "border-top:3px solid var(--n900, #0f172a);" : ""}">
          ${g.musteriAdi || "—"}${g.sehir ? ` &nbsp;—&nbsp; ${g.sehir}` : ""}${g.makinaKodu ? ` &nbsp;—&nbsp; ${g.makinaKodu}` : ""}
        </td>
      </tr>
      ${colHeaders}`;
    const rows = g.rows.map(r => `
      <tr>
        <td style="border:1px solid #ccc;padding:5px 8px;text-align:center;font-family:monospace;font-size:10px;background:#e8edf3;">${r.kalipKodu || "—"}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;background:#e8edf3;">
          <div style="display:flex;align-items:center;gap:7px;">
            ${r.kalipResim ? `<img src="${r.kalipResim}" style="width:36px;height:27px;object-fit:contain;flex-shrink:0;border:1px solid var(--n200, #e2e8f0);border-radius:3px;">` : ""}
            <span style="font-weight:600;font-size:10px;">${r.kalipAdi || "—"}</span>
          </div>
        </td>
        <td style="border:1px solid #ccc;padding:5px 8px;font-size:10px;background:#e8edf3;">${r.kalipOlcusu || ""}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;text-align:center;font-size:10px;background:#e8edf3;">${r.makinaKalipCapi || ""}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;text-align:center;font-size:14px;color:var(--grn600, #16a34a);background:${r.tamamlandi ? "var(--grnBg, #f0fdf4)" : "var(--tblRow, #e8edf3)"};">${r.tamamlandi ? "✓" : ""}</td>
      </tr>`).join("");
    return header + rows;
  }).join("");

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">
  <title>Kalıp Üretim Formu — ${tarihStr}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; margin: 0; padding: 18px; color: #1a1a1a; }
    @media print { @page { margin: 10mm 12mm; size: A4 portrait; } body { padding: 0; } }
    h2 { font-size: 15px; font-weight: 700; margin: 0 0 4px; }
    .meta { font-size: 10.5px; color: #555; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: var(--n800, #1e293b); color: #fff; padding: 7px 9px; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; border: 1px solid var(--n700, #334155); }
  </style>
</head><body>
  <h2>KALIP ÜRETİM FORMU</h2>
  <div class="meta">Dönem: <b>${tarihStr}</b>${form.not ? `&nbsp;·&nbsp;${form.not}` : ""}</div>
  <table>
    <tbody>
      ${bodyRows || `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--n400, #94a3b8);">Satır yok</td></tr>`}
    </tbody>
  </table>
</body></html>`;
}
