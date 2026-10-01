// Spec 0059 (R1–R3, R22, C7, C8): Aylık Faaliyet Raporu ile Aylık Gider ve Kasa Raporu'nun ortak sunum dili. Yalnız
// biçim ve çerçeve üretir: hiçbir veri alanı adı bilmez, React almaz, zaman okumaz. Para birimi gösterimi paylaşılmaz
// (faaliyet "150.875 TL", gider raporu fmtCur); paylaşılan sayı biçimidir.
// Kaçışlama sözleşmesi (R22): bütün metin ve hücreler ÇAĞIRAN tarafından kaçışlanmış HTML'dir; burada hiçbir şey
// kaçışlanmaz (faaliyet girdiyi baştan escDeep ile, gider raporu her çağrıda esc ile kaçışlar).

// Binlik ayraçlı, kuruşsuz sayı (iki raporun ortak hassasiyeti).
export const sayi = (v) => v.toLocaleString("tr-TR", { maximumFractionDigits: 0 });

// ISO tarihi gg.aa.yyyy; tarih değilse olduğu gibi, boşsa "—".
export const gun = (iso) => { const mm = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return mm ? `${mm[3]}.${mm[2]}.${mm[1]}` : (iso || "—"); };

// İstatistik satırı (etiket solda gri, değer kalın).
export const st = (label, deger) => `<tr><td style="padding:3px 8px 3px 0;color:#64748b;font-size:11px;">${label}</td><td style="padding:3px 0;font-weight:700;font-size:12px;">${deger}</td></tr>`;

// Önceki ay karşılaştırma eki: satır değerinin yanına küçük gri "geçen ay: X". onceki yoksa ek basılmaz.
export const gecenAyEki = (onceki) => (val) => onceki ? `<span style="font-weight:400;color:#94a3b8;font-size:10px;"> · geçen ay: ${val}</span>` : "";

export const altBaslik = (t) => `<div style="font-size:10px;font-weight:700;color:#94a3b8;margin-top:8px;">${t}</div>`;

// Detay tablosu: başlık + kolon başlıkları + satırlar (hücreler HTML). Boşsa hiç basılmaz.
export const detayTablo = (baslik, basliklar, satirlar, hizalar = []) => {
    if (!satirlar || !satirlar.length) return "";
    const hiza = (i) => hizalar[i] || "left";
    const th = basliklar.map((h, i) => `<th style="text-align:${hiza(i)};padding:4px 8px 4px 0;font-size:9px;color:#94a3b8;font-weight:700;border-bottom:1px solid #cbd5e1;">${h}</th>`).join("");
    const tr = satirlar.map(hucreler => `<tr>${hucreler.map((c, i) => `<td style="text-align:${hiza(i)};padding:3px 8px 3px 0;font-size:10.5px;border-bottom:1px solid #f1f5f9;">${c ?? "—"}</td>`).join("")}</tr>`).join("");
    return `${altBaslik(baslik)}<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
  };

export const rozet = (metin, tur) => {
    const s = { haric: "background:#fff3ec;border:1px solid #f4d3bf;color:#b5480f;", dahil: "background:#ecfdf7;border:1px solid #b8e6da;color:#0f766e;", now: "background:#fbf3e8;border:1px solid #eddcc2;color:#8a6d2b;", "": "background:#f8fafc;border:1px solid #e2e8f0;color:#64748b;" }[tur || ""];
    return `<span style="display:inline-block;font-size:9px;letter-spacing:.03em;padding:2px 7px;border-radius:20px;${s}">${metin}</span>`;
  };
export const rozetSatiri = (...arr) => `<div style="margin-bottom:6px;">${arr.filter(Boolean).join(" ")}</div>`;

// Bölüm kabuğu: koyu başlık çubuğu (sol ad + sağ tutar) + gövde.
export const bolum = (baslik, sag, icerik) => `
    <div style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;overflow:hidden;">
      <div style="background:#211d19;color:#fff;padding:7px 12px;display:flex;justify-content:space-between;align-items:baseline;gap:10px;">
        <span style="font-weight:700;font-size:11.5px;letter-spacing:.4px;">${baslik}</span>
        <span style="font-size:11px;color:#f4c9ac;white-space:nowrap;text-align:right;">${sag || ""}</span>
      </div>
      <div style="padding:10px 12px;">${icerik}</div>
    </div>`;

// İki ana bölümü ayıran başlık (koyu alt çizgi; üst başlık bandıyla aynı dil).
export const ayrac = (t) => `<div style="font-size:14px;font-weight:800;letter-spacing:.5px;border-bottom:3px solid #1a1a1a;padding-bottom:4px;margin:20px 0 10px;">${t}</div>`;

// Kutu içindeki küçük açıklama satırı.
export const not = (t) => `<div style="font-size:9.5px;color:#94a3b8;margin-top:6px;">${t}</div>`;
// Boş durum açıklaması (0016/0055 deseni; var olan bölümlerde korunur).
export const bosNot = (t) => `<div style="font-size:10.5px;color:#64748b;font-style:italic;">${t}</div>`;

// Belgenin açılışı: <head>, sayfa stili ve üst başlık bandı (sol: belge adı, ay, dönem; sağ: firma bloğu). Kapanış
// "</body></html>" çağıranındır. sonSatir verilirse firma bloğunun en altına yazılır (faaliyet: oluşturma tarihi).
export const belgeAcilis = ({ title, baslik, ust, donem, factory, sonSatir = null, ekStil = "" }) => `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">
<title>${title}</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;max-width:720px;margin:24px auto;padding:0 16px;} table{border-collapse:collapse;width:100%;}${ekStil}</style>
</head><body>
  <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px solid #1a1a1a;padding-bottom:8px;margin-bottom:16px;">
    <div>
      <div style="font-size:18px;font-weight:800;">${baslik}</div>
      <div style="font-size:13px;color:#475569;">${ust}</div>
      <div style="font-size:11px;color:#94a3b8;">Dönem: ${donem}</div>
    </div>
    <div style="text-align:right;font-size:11px;color:#64748b;">
      <div style="font-weight:700;font-size:13px;color:#1a1a1a;">${factory?.evrakFirmaAdi || factory?.name || "Altuntaş Makina"}</div>
      ${factory?.adres ? `<div>${factory.adres}</div>` : ""}
      ${[factory?.city, factory?.country].filter(Boolean).length ? `<div>${[factory?.city, factory?.country].filter(Boolean).join(", ")}</div>` : ""}
      ${[factory?.phone, factory?.email].filter(Boolean).length ? `<div>${[factory?.phone, factory?.email].filter(Boolean).join("  ·  ")}</div>` : ""}
      ${factory?.web ? `<div>${factory.web}</div>` : ""}${sonSatir != null ? `
      <div>${sonSatir}</div>` : ""}
    </div>
  </div>`;
