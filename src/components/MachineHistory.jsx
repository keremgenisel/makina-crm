import { useState } from "react";
import LOGO from "../assets/logo.avif?inline";
import { ALTUNMAK_MODELS } from "../lib/constants";
import { today, fmtTR, todayTR, kalipText, stripAutoPrint, fmtKalipCapi, normalizeSaleType, fmtCur } from "../lib/utils";
import { useFilteredList } from "../hooks/useFilteredList";
import { Icon, Field, Input, Warn, PHONE_RE, Select, Btn, Modal, Pagination, CountryCityFields } from "./ui";

export const MachineHistory = ({ customers, setCustomers, services, models = ALTUNMAK_MODELS, dealers = [], factory = null, geoData = null, loadingGeo = false, showToast = () => {}, parts = [], partSales = [], setPartSales = null }) => {
  const [selectedId, setSelectedId] = useState(null);
  const [editForm, setEditForm] = useState(null); // null | müşteri kopyası
  const [newOwnerForm, setNewOwnerForm] = useState(null); // 2. el satış formu

  const saveNewOwner = () => {
    setCustomers(p => p.map(c => {
      if (c.id !== newOwnerForm._machineId) return c;
      // Mevcut sahibi geçmişe ekle
      const prev = {
        name: c.name, satisYapan: c.satisYapan, adres: c.adres,
        city: c.city, country: c.country, soldDate: newOwnerForm.saleDate || today(),
      };
      // Yeni sahibe geç. Bu bir 2. el DEVİR — bizim satışımız değil.
      // Finansa tekrar yansımaması için satışla ilgili tutarları sıfırla ve devir işaretle.
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

  const saveEdit = () => {
    setCustomers(p => p.map(c => c.id === editForm.id ? editForm : c));
    showToast("Makina bilgileri düzenlendi.");
    setEditForm(null);
  };

  // Makinası olan müşteriler (model veya seri no girilmiş)
  const machineOwners = customers.filter(c => c.model || c.serialNo);

  const { search, setSearch, page, setPage, filtered, paged, perPage: PER_PAGE } = useFilteredList(machineOwners, {
    searchFields: ["name", "model", "serialNo"],
  });

  const selected = customers.find(c => c.id === selectedId);
  const history = selected
    ? services.filter(s => s.customerId === selected.id).sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    : [];
  // Birleşik zaman çizelgesi: satış + servisler + garanti bitişi (eskiden yeniye)
  const timelineEvents = (() => {
    if (!selected) return [];
    const ev = [];
    // Satış (devir varsa devir tarihi, yoksa kurulum tarihi)
    if (selected.installDate) {
      ev.push({
        kind: "sale", date: selected.installDate, color: "#16a34a",
        title: selected.isResale ? "2. El Devir" : "Satış",
        tip: normalizeSaleType(selected.faturali),
        desc: `${selected.name}${selected.fabrikaSatisBedeli ? " · " + fmtCur(selected.fabrikaSatisBedeli, selected.currency) : ""}${(selected.kaliplar || []).length ? " · " + selected.kaliplar.length + " kalıp" : ""}`,
      });
    }
    // Servisler
    history.forEach(sv => {
      const tColor = { "İlk Çalıştırma": "#1d4ed8", "Garanti İçi": "#16a34a", "Garanti Dışı": "#dc2626", "Periyodik Bakım": "#c2410c" }[sv.type] || "#94a3b8";
      ev.push({ kind: "service", date: sv.date, color: tColor, title: sv.type, sv });
    });
    // Verilen parça/kalıplar
    (partSales || []).filter(ps => ps.customerId === selected.id).forEach(ps => {
      const kalip = ps.tur === "Kalıp";
      ev.push({
        kind: "part", date: ps.tarih, color: kalip ? "#c2410c" : "#0891b2",
        title: kalip ? "Kalıp Verildi" : "Yedek Parça Verildi",
        desc: `${ps.ad}${ps.olcu ? " (" + ps.olcu + ")" : ""}${ps.ucretsizMi ? " · garanti kapsamında (ücretsiz)" : " · " + fmtCur(ps.ucret, ps.currency) + (ps.garantiDisiIslem ? " (garanti dışı işlem)" : "")}`,
        ps,
      });
    });
    // Garanti bitişi
    if (selected.warrantyEnd) {
      const dolmus = selected.warrantyEnd < today();
      ev.push({
        kind: "warranty", date: selected.warrantyEnd, color: dolmus ? "#dc2626" : "#f59e0b",
        title: dolmus ? "Garanti Süresi Doldu" : "Garanti Bitişi",
        desc: dolmus ? "Garanti süresi sona erdi" : "Garanti süresi bu tarihte sona erecek",
      });
    }
    // Eskiden yeniye sırala (tarihsiz en sona)
    return ev.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  })();
  const modelInfo = selected ? ALTUNMAK_MODELS.find(m => m.model === selected.model) : null;
  const warrantyOk = selected?.warrantyEnd && selected.warrantyEnd >= today();

  // Raporu yeni sekmede aç ve yazdırma ekranını tetikle
  // (window.print() sandbox ortamında engellendiği için bu yöntem kullanılıyor)
  const printReport = () => {
    if (!selected) return;
    const esc = (s) => String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const infoRows = [
      ["Satın Alan", selected.name],
      ["Satış Yapan", selected.satisYapan || selected.contact || "—"],
      ["Adres", `${selected.adres ? selected.adres + ", " : ""}${selected.city || ""}${selected.country ? " / " + selected.country : ""}` || "—"],
      ["Makina Modeli", selected.model || "—"],
      ["Seri Numarası", selected.serialNo || "—"],
      ...(fmtKalipCapi(selected.kalipCapi) ? [["Makina Kalıp Çapı", fmtKalipCapi(selected.kalipCapi)]] : []),
      ["Kalıplar", kalipText(selected)],
      ["Satış / Garanti Başlangıç", selected.installDate ? fmtTR(selected.installDate) : "—"],
      ["Garanti Bitiş", `${selected.warrantyEnd ? fmtTR(selected.warrantyEnd) : "—"} (${warrantyOk ? "Garanti devam ediyor" : "Garanti süresi dolmuş"})`],
      ["Not", selected.note || "—"],
    ].map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");

    const svcRows = history.length === 0
      ? `<tr><td colspan="5" style="text-align:center">Servis kaydı bulunmuyor.</td></tr>`
      : history.map(sv =>
          `<tr><td>${esc(fmtTR(sv.date))}</td><td>${esc(sv.type)}</td><td>${esc(sv.repairPlace || "—")}</td><td>${esc(sv.tech || "—")}</td><td>${esc(sv.yapilanIsler || sv.description || "")}${sv.degisenParcalar?.length ? `<br><b>Değişen parçalar:</b> ${esc(sv.degisenParcalar.join(", "))}` : ""}</td></tr>`
        ).join("");

    const givenParts = (partSales || []).filter(ps => ps.customerId === selected.id).sort((a, b) => (a.tarih || "").localeCompare(b.tarih || ""));
    const partRows = givenParts.map(ps =>
      `<tr><td>${esc(fmtTR(ps.tarih))}</td><td>${esc(ps.ad)}${ps.olcu ? ` (${esc(ps.olcu)})` : ""}</td></tr>`
    ).join("");

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob: 'unsafe-inline'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:;">
<title>Servis Raporu - ${esc(selected.name)}</title>
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
  ${(Array.isArray(selected.prevOwners) && selected.prevOwners.length > 0) ? `
  <h2>SAHİPLİK GEÇMİŞİ (2. El Devir)</h2>
  <table class="svc">
    <thead><tr><th>Sıra</th><th>Sahip</th><th>Konum</th><th>Satış Yapan</th><th>Devir Tarihi</th></tr></thead>
    <tbody>
      ${selected.prevOwners.map((o, i) => `<tr><td>${i + 1}. Sahip</td><td>${esc(o.name)}</td><td>${esc([o.city, o.country].filter(Boolean).join(" / ") || "—")}</td><td>${esc(o.satisYapan || "—")}</td><td>${esc(o.soldDate || "—")}</td></tr>`).join("")}
      <tr style="background:#f0fdf4"><td><b>Mevcut</b></td><td><b>${esc(selected.name)}</b></td><td>${esc([selected.city, selected.country].filter(Boolean).join(" / ") || "—")}</td><td>${esc(selected.satisYapan || "—")}</td><td>—</td></tr>
    </tbody>
  </table>` : ""}
  <h2>SERVİS VE YEDEK PARÇA GEÇMİŞİ (${history.length} kayıt)</h2>
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

    // Electron'da yerel yazdırma API'sini kullan (güvenilir); tarayıcıda window.open
    if (window.appPrint) {
      // Electron kendi yazdırma diyaloğunu açar; otomatik print script'ini çıkar (çift diyalog önle)
      window.appPrint.printHtml(stripAutoPrint(html));
      return;
    }
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      // Yeni sekme engellendiyse dosya olarak indir
      const a = document.createElement("a");
      a.href = url;
      a.download = `servis-raporu-${(selected.serialNo || selected.name).replace(/\s+/g, "-")}.html`;
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Makina Geçmişi</h2>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "start" }}>
        {/* Sol: makina listesi */}
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden" }}>
          <div style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={14} /></span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Firma, model veya seri no..."
                style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#f8fafc", boxSizing: "border-box", outline: "none" }} />
            </div>
          </div>
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            {paged.map(c => (
              <div key={c.id} onClick={() => setSelectedId(c.id)}
                style={{
                  padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #f1f5f9",
                  background: selectedId === c.id ? "#fff7ed" : "#fff",
                  borderLeft: selectedId === c.id ? "3px solid #e85d1a" : "3px solid transparent",
                }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{c.model || "Model yok"}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{c.serialNo || "—"}</div>
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: 20, fontSize: 13, color: "#94a3b8", textAlign: "center" }}>Makina bulunamadı.</div>}
          </div>
          <Pagination total={filtered.length} page={page} setPage={setPage} perPage={PER_PAGE} />
        </div>

        {/* Sağ: detay */}
        {!selected ? (
          <div style={{ background: "#fff", borderRadius: 12, padding: 60, boxShadow: "0 1px 4px rgba(0,0,0,.08)", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ marginBottom: 10 }}><Icon name="machine" size={32} /></div>
            <div style={{ fontSize: 14 }}>Detaylarını görmek için soldan bir makina seçin</div>
          </div>
        ) : (
          <div>
            {/* Makina kimlik kartı */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,.08)", borderTop: "3px solid #e85d1a", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{selected.name}</div>
                    {selected.prevOwners?.length > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 800, background: "#10b981", color: "#fff", borderRadius: 6, padding: "3px 9px", letterSpacing: .5 }}>2. EL</span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: "#e85d1a", fontWeight: 700, marginTop: 2 }}>{selected.model || "Model belirtilmemiş"}</div>
                  <div style={{ fontSize: 12, color: "#64748b", fontFamily: "monospace", marginTop: 2 }}>S/N: {selected.serialNo || "—"}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 10, background: warrantyOk ? "#d1fae5" : "#fee2e2", color: warrantyOk ? "#065f46" : "#991b1b" }}>
                    {warrantyOk ? "Garanti Devam Ediyor" : "Garanti Süresi Dolmuş"}
                  </span>
                  <Btn small onClick={printReport}><Icon name="print" size={13} /> Yazdır</Btn>
                  <Btn small variant="ghost" onClick={() => setEditForm({ ...selected })}><Icon name="edit" size={13} /> Düzenle</Btn>
                  <Btn small variant="ghost" onClick={() => setNewOwnerForm({ _machineId: selected.id, name: "", satanFirma: selected.name, adres: "", city: "", country: "Türkiye", saleDate: today(), faturali: "Faturalı Yurt İçi", faturaBedeli: "" })}>
                    <Icon name="customers" size={13} /> Yeni Sahip
                  </Btn>
                </div>
              </div>

              {modelInfo && (
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "3px 10px" }}>{modelInfo.sogutma}</span>
                  <span style={{ fontSize: 12, background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "3px 10px" }}>{modelInfo.kapasite}</span>
                  <span style={{ fontSize: 12, background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "3px 10px" }}>Kalıp Ø {modelInfo.kalip}</span>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 }}>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>SATIŞ TARİHİ</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{selected.installDate ? fmtTR(selected.installDate) : "—"}</div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>GARANTİ BİTİŞ</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: warrantyOk ? "#059669" : "#dc2626" }}>{selected.warrantyEnd ? fmtTR(selected.warrantyEnd) : "—"}</div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>KONUM</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{selected.country || "—"}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{selected.city || ""}</div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>İLETİŞİM</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{selected.phone || "—"}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{selected.email || ""}</div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>SATIŞ YAPAN</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{selected.satisYapan || selected.contact || "—"}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{kalipText(selected) !== "—" ? `Kalıp: ${kalipText(selected)}` : ""}</div>
                </div>
              </div>
            </div>

            {/* Önceki sahipler (2. el) */}
            {selected.prevOwners?.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,.08)", marginBottom: 20, borderLeft: "4px solid #ef4444" }}>
                <div style={{ fontWeight: 700, marginBottom: 14, color: "#0f172a" }}>Sahiplik Geçmişi</div>
                {selected.prevOwners.map((o, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>{i + 1}. Sahip: {o.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {o.country || ""}{o.city ? ` / ${o.city}` : ""}{o.satisYapan ? ` · Satış: ${o.satisYapan}` : ""}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "right" }}>
                      Devir tarihi<br /><b style={{ color: "#475569" }}>{fmtTR(o.soldDate)}</b>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>
                    Mevcut Sahip: {selected.name}
                  </div>
                </div>
              </div>
            )}

            {/* Birleşik zaman çizelgesi: satış → servisler → garanti */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
              <div style={{ fontWeight: 700, marginBottom: 16, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="service" size={16} /> Makina Geçmişi
                <span style={{ fontSize: 11, background: "#f1f5f9", color: "#64748b", borderRadius: 10, padding: "2px 8px", fontWeight: 600 }}>{timelineEvents.length} olay</span>
              </div>
              {timelineEvents.length === 0 ? (
                <div style={{ color: "#94a3b8", fontSize: 13, padding: "12px 0" }}>Bu makinaya ait kayıt bulunmuyor.</div>
              ) : (
                timelineEvents.map((ev, i) => {
                  const last = i === timelineEvents.length - 1;
                  const sv = ev.sv;
                  return (
                    <div key={i} style={{ display: "flex", gap: 14, position: "relative", paddingBottom: last ? 0 : 18 }}>
                      {/* Zaman çizgisi noktası + çizgi */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{ width: 14, height: 14, borderRadius: "50%", background: ev.color, flexShrink: 0, marginTop: 3, border: "3px solid #fff", boxShadow: `0 0 0 2px ${ev.color}33` }} />
                        {!last && <div style={{ width: 2, flex: 1, background: "#e2e8f0", marginTop: 4 }} />}
                      </div>
                      <div style={{ flex: 1, paddingBottom: 4 }}>
                        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{ev.date ? fmtTR(ev.date) : "tarih yok"}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 1 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: ev.color }}>{ev.title}</span>
                          {ev.tip && <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "2px 8px", background: ev.tip === "Faturalı Yurt İçi" ? "#d1fae5" : ev.tip === "Faturalı İhracat" ? "#dbeafe" : "#fef3c7", color: ev.tip === "Faturalı Yurt İçi" ? "#065f46" : ev.tip === "Faturalı İhracat" ? "#1d4ed8" : "#92400e" }}>{ev.tip === "Faturalı Yurt İçi" ? "Yurt İçi" : ev.tip === "Faturalı İhracat" ? "İhracat" : "Faturasız"}</span>}
                          {sv?.tech && <span style={{ fontSize: 12, color: "#64748b" }}>· {sv.tech}</span>}
                          {sv?.repairPlace && <span style={{ fontSize: 11, color: "#94a3b8" }}>· {sv.repairPlace}</span>}
                        </div>
                        {ev.desc && <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 1.5 }}>{ev.desc}</div>}
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
                        {sv && (sv.type === "Garanti Dışı" || sv.type === "Periyodik Bakım") && sv.servisUcreti && (
                          <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 700, marginTop: 5 }}>Servis Ücreti: {fmtCur(sv.servisUcreti, sv.currency)}</div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}
      </div>

      {/* Yeni sahip (2. el satış) modalı */}
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
              <option value={selected.name}>{selected.name} (Mevcut Sahip)</option>
              <option value={factory?.name || "Altuntaş Makina"}>{factory?.name || "Altuntaş Makina"} (Fabrika)</option>
              {dealers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
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

      {/* Makina / müşteri düzenleme modalı */}
      {editForm && (
        <Modal title="Makina Bilgilerini Düzenle" onClose={() => setEditForm(null)}>
          <Field label="Firma Adı">
            <Input value={editForm.name || ""} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
            <Warn>{!editForm.name?.trim() ? "Firma adı girilmedi" : ""}</Warn>
          </Field>
          <Field label="Satış Yapan">
            <Select value="" onChange={e => { if (e.target.value) setEditForm(p => ({ ...p, satisYapan: e.target.value })); }}>
              <option value="">Hızlı seç... (veya aşağıya elle yazın)</option>
              <option value={factory?.name || "Altuntaş Makina"}>{factory?.name || "Altuntaş Makina"} (Fabrika)</option>
              {dealers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              {editForm.prevOwners?.length > 0 && (
                <option value={editForm.prevOwners[editForm.prevOwners.length - 1].name}>
                  {editForm.prevOwners[editForm.prevOwners.length - 1].name} (Önceki Sahip)
                </option>
              )}
            </Select>
            <Input value={editForm.satisYapan || ""} onChange={e => setEditForm(p => ({ ...p, satisYapan: e.target.value }))}
              placeholder="Satıcı adı (müşteri, bayi, fabrika...)" style={{ marginTop: 6 }} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Model">
              <Select value={editForm.model || ""} onChange={e => setEditForm(p => ({ ...p, model: e.target.value }))}>
                <option value="">Model seçin...</option>
                {models.map(m => <option key={m.model} value={m.model}>{m.model}</option>)}
              </Select>
            </Field>
            <Field label="Seri Numarası"><Input value={editForm.serialNo || ""} onChange={e => setEditForm(p => ({ ...p, serialNo: e.target.value }))} /></Field>
          </div>
          <Field label="Kalıp"><Input value={editForm.kalip || ""} onChange={e => setEditForm(p => ({ ...p, kalip: e.target.value }))} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Garanti Başlangıç">
              <Input type="date" value={editForm.installDate || ""} onChange={e => {
                const d = e.target.value;
                const end = d ? `${parseInt(d.slice(0,4))+2}${d.slice(4)}` : "";
                setEditForm(p => ({ ...p, installDate: d, warrantyEnd: end }));
              }} />
            </Field>
            <Field label="Garanti Bitiş"><Input type="date" value={editForm.warrantyEnd || ""} onChange={e => setEditForm(p => ({ ...p, warrantyEnd: e.target.value }))} /></Field>
          </div>
          <Field label="Not">
            <textarea value={editForm.note || ""} onChange={e => setEditForm(p => ({ ...p, note: e.target.value }))}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 60, boxSizing: "border-box", fontFamily: "inherit" }} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setEditForm(null)}>İptal</Btn>
            <Btn onClick={saveEdit}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
