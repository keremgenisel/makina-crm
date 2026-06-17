import { useState } from "react";
import LOGO from "../assets/logo.avif?inline";
import { CUR_SYM, SERVICE_TYPES, REPAIR_PLACES } from "../lib/constants";
import { today, fmtTR, todayTR, trLower, uid, bumpId, stripAutoPrint, fmtCur, parseMoney } from "../lib/utils";
import { useFilteredList } from "../hooks/useFilteredList";
import { Icon, Field, Input, Warn, Select, MoneyInput, Btn, Modal, ConfirmDialog, Pagination } from "./ui";

export const Services = ({ services, setServices, customers, factory = null, parts = [], showToast = () => {} }) => {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [custSearch, setCustSearch] = useState("");
  const [detail, setDetail] = useState(null); // tıklanan servis kaydı (detay)

  const openAdd = () => {
    setForm({ customerId: "", type: "Periyodik Bakım", repairPlace: "Yerinde Onarım", yapilanIsler: "", musteriTalimati: "", servisUcreti: "", date: today(), tech: "", odendi: false, degisenParcalar: [], parcaUcreti: "", parcaCurrency: "TRY", parcaGarantiDisi: false, parcaOdendi: false });
    setCustSearch("");
    setModal("add");
  };
  const openEdit = sv => { setForm({ degisenParcalar: [], parcaUcreti: "", parcaCurrency: "TRY", parcaGarantiDisi: false, parcaOdendi: false, ...sv }); setCustSearch(""); setModal({ edit: sv }); };
  const save = () => {
    const rec = { ...form, customerId: form.customerId ? Number(form.customerId) : null, parcaUcretsizMi };
    if (modal === "add") {
      bumpId(customers, services);
      const newId = uid();
      setServices(p => p.some(s => s.id === newId) ? p : [{ ...rec, id: newId }, ...p]);
      showToast("Servis talebi kaydedildi.");
    }
    else { setServices(p => p.map(s => s.id === form.id ? rec : s)); showToast("Servis talebi düzenlendi."); }
    setModal(null);
  };
  const [confirmId, setConfirmId] = useState(null);
  const del = id => setConfirmId(id);
  const confirmDel = () => { setServices(p => p.filter(s => s.id !== confirmId)); setConfirmId(null); showToast("Servis kaydı silindi."); };

  const [payFilter, setPayFilter] = useState(false); // sadece ödenmemiş ücretli servisler
  // Ücretli mi (Garanti Dışı / Periyodik Bakım + ücret > 0)
  const ucretliMi = (sv) => (sv.type === "Garanti Dışı" || sv.type === "Periyodik Bakım") && parseMoney(sv.servisUcreti) > 0;
  // Değişen parçalar ücretli mi (garanti dışı işaretlenmiş veya garanti yoksa + ücret > 0)
  const parcaUcretliMi = (sv) => !sv.parcaUcretsizMi && parseMoney(sv.parcaUcreti) > 0;
  // Borçlu mu: ücretli + açıkça ödenmedi (eski kayıtlarda odendi alanı yoksa ödendi sayılır)
  const borcluMu = (sv) => (ucretliMi(sv) && sv.odendi === false) || (parcaUcretliMi(sv) && sv.parcaOdendi === false);
  const odenmemisCount = services.filter(borcluMu).length;
  const { search: svSearch, setSearch: setSvSearch, page, setPage, filtered: visibleServices, paged: pagedServices, perPage: PER_PAGE } = useFilteredList(services, {
    searchFn: (sv, q) => {
      const cust = customers.find(c => c.id === sv.customerId);
      return trLower(cust?.name).includes(q) ||
             trLower(cust?.serialNo).includes(q) ||
             trLower(cust?.model).includes(q) ||
             trLower(sv.tech).includes(q) ||
             trLower(sv.yapilanIsler).includes(q) ||
             trLower(sv.musteriTalimati).includes(q);
    },
    filterFn: payFilter ? borcluMu : null,
  });

  const typeColor = {
    "İlk Çalıştırma": ["#eff6ff", "#1d4ed8"],
    "Garanti İçi": ["#f0fdf4", "#16a34a"],
    "Garanti Dışı": ["#fef2f2", "#dc2626"],
    "Periyodik Bakım": ["#fff7ed", "#c2410c"],
  };

  const selectedCust = customers.find(c => c.id === Number(form.customerId));
  // Garanti içindeyse değişen parçalar varsayılan ücretsizdir; "garanti kapsamı dışı" işaretiyle ücretliye çevrilebilir.
  const warrantyAktif = !!(selectedCust?.warrantyEnd && selectedCust.warrantyEnd >= today());
  const parcaUcretsizMi = (form.degisenParcalar || []).length === 0 || (warrantyAktif && !form.parcaGarantiDisi);
  const matchedCustomers = custSearch.trim()
    ? customers.filter(c =>
        trLower(c.name).includes(trLower(custSearch)) ||
        trLower(c.contact).includes(trLower(custSearch)) ||
        trLower(c.serialNo).includes(trLower(custSearch))
      ).slice(0, 6)
    : [];

  // Yazdırma: firmanın gerçek servis formu düzeninde HTML üret
  const printService = (sv) => {
    const cust = customers.find(c => c.id === sv.customerId) || {};
    const esc = (s) => String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const adres = [cust.adres, cust.city, cust.country].filter(Boolean).join(", ") || "—";
    const ucret = ((sv.type === "Garanti Dışı" || sv.type === "Periyodik Bakım") && sv.servisUcreti)
      ? `${fmtCur(sv.servisUcreti, sv.currency)}${(sv.currency || "TRY") === "TRY" ? " (KDV dahil)" : ""}`
      : "—";
    const parcaUcret = (!sv.parcaUcretsizMi && sv.parcaUcreti)
      ? `${fmtCur(sv.parcaUcreti, sv.parcaCurrency)}${(sv.parcaCurrency || "TRY") === "TRY" ? " (KDV dahil)" : ""}`
      : "—";

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
  <div class="box-area" style="min-height:auto">${esc(sv.degisenParcalar.join(", "))}</div>
  ` : ""}

  <h2>MÜŞTERİ TALİMATI / AÇIKLAMA</h2>
  <div class="box-area">${esc(sv.musteriTalimati || "")}</div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:none">
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
  </table>

  <div class="terms">
    1- Yukarıda adı ve miktarı belirtilen parçaları tam olarak teslim aldım. Yapılan hizmeti kabul ediyorum.<br>
    2- Tamir süresi 10 (on) iş gününü geçmez.<br>
    3- Yere düşen malzemeler garanti kapsamı dışındadır.<br>
    4- Teslim tarihinden itibaren 20 iş günü içerisinde alınmayan ürünlerden servisimiz sorumlu değildir.
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</` + `script>
</body>
</html>`;

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
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Servis Talepleri</h2>
        <Btn onClick={openAdd} disabled={customers.length === 0}><Icon name="plus" size={14} /> Yeni Talep</Btn>
      </div>

      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
        <input value={svSearch} onChange={e => setSvSearch(e.target.value)}
          placeholder="Firma, model, seri no, teknisyen veya işlem ara..."
          style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => { setPayFilter(false); setPage(1); }}
          style={{ padding: "7px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "1px solid", borderColor: !payFilter ? "#e85d1a" : "#e2e8f0", background: !payFilter ? "#e85d1a" : "#fff", color: !payFilter ? "#fff" : "#64748b" }}>
          Tümü ({services.length})
        </button>
        <button onClick={() => { setPayFilter(true); setPage(1); }}
          style={{ padding: "7px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "1px solid", borderColor: payFilter ? "#dc2626" : "#e2e8f0", background: payFilter ? "#dc2626" : "#fff", color: payFilter ? "#fff" : "#64748b" }}>
          💰 Ödenmemiş Servis Borcu ({odenmemisCount})
        </button>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Müşteri", "Makina", "Tür", "Yapılan İşlem", "Tarih", "Ödeme", ""].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedServices.map(sv => {
              const cust = customers.find(c => c.id === sv.customerId);
              const [tbg, tfg] = typeColor[sv.type] || ["#f1f5f9", "#475569"];
              return (
                <tr key={sv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "13px 16px", cursor: "pointer" }} onClick={() => setDetail(sv)} title="Yapılan işlemleri görüntüle">
                    <div style={{ fontWeight: 600, fontSize: 13, textDecoration: "underline", textDecorationColor: "#e2e8f0" }}>{cust?.name || "—"}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{[cust?.adres, cust?.city].filter(Boolean).join(", ") || "—"}</div>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{cust?.model || "—"}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{cust?.serialNo}</div>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ background: tbg, color: tfg, fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}>{sv.type}</span>
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 12, color: "#64748b" }}>{sv.repairPlace || "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#64748b" }}>{fmtTR(sv.date)}</td>
                  <td style={{ padding: "13px 16px" }}>
                    {(ucretliMi(sv) || parcaUcretliMi(sv)) ? (
                      borcluMu(sv)
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>Ödenmedi</span>
                        : <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>Ödendi</span>
                    ) : <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn small variant="ghost" onClick={() => printService(sv)}><Icon name="print" size={12} /></Btn>
                      <Btn small variant="ghost" onClick={() => openEdit(sv)}><Icon name="edit" size={12} /></Btn>
                      <Btn small variant="danger" onClick={() => del(sv.id)}><Icon name="trash" size={12} /></Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibleServices.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>{services.length === 0 ? "Henüz servis talebi yok." : "Aramanıza uyan talep yok."}</div>}
        <Pagination total={visibleServices.length} page={page} setPage={setPage} perPage={PER_PAGE} />
      </div>

      {/* Detay görüntüleme */}
      {detail && (() => {
        const cust = customers.find(c => c.id === detail.customerId) || {};
        const [tbg, tfg] = typeColor[detail.type] || ["#f1f5f9", "#475569"];
        return (
          <Modal wide title={`Servis Kaydı — ${cust.name || ""}`} onClose={() => setDetail(null)}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              <span style={{ background: tbg, color: tfg, fontSize: 12, fontWeight: 700, borderRadius: 8, padding: "5px 12px" }}>{detail.type}</span>
              <span style={{ background: "#f1f5f9", color: "#475569", fontSize: 12, fontWeight: 600, borderRadius: 8, padding: "5px 12px" }}>{detail.repairPlace || "—"}</span>
              <span style={{ background: "#f1f5f9", color: "#475569", fontSize: 12, fontWeight: 600, borderRadius: 8, padding: "5px 12px" }}>{fmtTR(detail.date)}</span>
              {detail.tech && <span style={{ background: "#f1f5f9", color: "#475569", fontSize: 12, fontWeight: 600, borderRadius: 8, padding: "5px 12px" }}>Teknisyen: {detail.tech}</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[["Model", cust.model], ["Seri No", cust.serialNo], ["Telefon", cust.phone], ["Adres", [cust.adres, cust.city, cust.country].filter(Boolean).join(", ")]].filter(([,v]) => v).map(([k,v]) => (
                <div key={k} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>YAPILAN İŞLER / PARÇA DEĞİŞİMLERİ</div>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#0f172a", whiteSpace: "pre-wrap", lineHeight: 1.6, minHeight: 50 }}>{detail.yapilanIsler || "—"}</div>
            </div>
            {detail.musteriTalimati && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>MÜŞTERİ TALİMATI / AÇIKLAMA</div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#0f172a", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{detail.musteriTalimati}</div>
              </div>
            )}
            {(detail.type === "Garanti Dışı" || detail.type === "Periyodik Bakım") && detail.servisUcreti && (
              <div style={{ marginBottom: 14, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 14px" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#991b1b" }}>SERVİS ÜCRETİ: </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>{fmtCur(detail.servisUcreti, detail.currency)}</span>
                {(detail.currency || "TRY") === "TRY"
                  ? <span style={{ fontSize: 11, color: "#065f46", marginLeft: 8, fontWeight: 700 }}>KDV dahil</span>
                  : <span style={{ fontSize: 11, color: "#1d4ed8", marginLeft: 8, fontWeight: 700 }}>Yurt dışı</span>}
              </div>
            )}
            {!detail.parcaUcretsizMi && detail.parcaUcreti && (
              <div style={{ marginBottom: 14, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 14px" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#991b1b" }}>PARÇA ÜCRETİ: </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>{fmtCur(detail.parcaUcreti, detail.parcaCurrency)}</span>
                {(detail.parcaCurrency || "TRY") === "TRY"
                  ? <span style={{ fontSize: 11, color: "#065f46", marginLeft: 8, fontWeight: 700 }}>KDV dahil</span>
                  : <span style={{ fontSize: 11, color: "#1d4ed8", marginLeft: 8, fontWeight: 700 }}>Yurt dışı</span>}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setDetail(null)}>Kapat</Btn>
              <Btn onClick={() => printService(detail)}><Icon name="print" size={14} /> Yazdır</Btn>
              <Btn onClick={() => { const sv = detail; setDetail(null); openEdit(sv); }}><Icon name="edit" size={14} /> Düzenle</Btn>
            </div>
          </Modal>
        );
      })()}

      {confirmId && (
        <ConfirmDialog
          message="Bu servis talebi kalıcı olarak silinecek."
          onConfirm={confirmDel}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {modal && (
        <Modal title={modal === "add" ? "Yeni Servis Talebi" : "Servis Talebini Düzenle"} onClose={() => setModal(null)}>
          <Field label="Müşteri">
            {selectedCust ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "2px solid #e85d1a", borderRadius: 8, background: "#fff7ed" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{selectedCust.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {selectedCust.model || "Model yok"} {selectedCust.serialNo ? `· S/N: ${selectedCust.serialNo}` : ""}
                  </div>
                </div>
                <button onClick={() => { setForm(p => ({ ...p, customerId: "" })); setCustSearch(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                  <Icon name="close" size={14} />
                </button>
              </div>
            ) : (
              <div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={14} /></span>
                  <input autoFocus value={custSearch} onChange={e => setCustSearch(e.target.value)}
                    placeholder="Firma adı, kişi veya seri no ile ara..."
                    style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", boxSizing: "border-box", outline: "none" }} />
                </div>
                {custSearch.trim() && (
                  <div style={{ marginTop: 6, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                    {matchedCustomers.map(c => (
                      <div key={c.id}
                        onClick={() => { setForm(p => ({ ...p, customerId: c.id })); setCustSearch(""); }}
                        style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: "#fff" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#fff7ed"}
                        onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>
                          {c.contact} {c.model ? `· ${c.model}` : ""} {c.serialNo ? `· ${c.serialNo}` : ""}
                        </div>
                      </div>
                    ))}
                    {matchedCustomers.length === 0 && (
                      <div style={{ padding: "12px 14px", fontSize: 13, color: "#94a3b8" }}>Müşteri bulunamadı.</div>
                    )}
                  </div>
                )}
              </div>
            )}
            <Warn>{!form.customerId ? "Müşteri seçilmedi" : ""}</Warn>
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Tür">
              <Select value={form.type || "Periyodik Bakım"} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                {SERVICE_TYPES.map(t => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Yapılan İşlem">
              <Select value={form.repairPlace || "Yerinde Onarım"} onChange={e => setForm(p => ({ ...p, repairPlace: e.target.value }))}>
                {REPAIR_PLACES.map(t => <option key={t}>{t}</option>)}
              </Select>
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: form.type === "Garanti Dışı" ? "1fr 1fr" : "1fr 1fr", gap: 12 }}>
            <Field label="Tarih"><Input type="date" value={form.date || ""} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></Field>
            <Field label="Teknisyen"><Input value={form.tech || ""} onChange={e => setForm(p => ({ ...p, tech: e.target.value }))} placeholder="Teknisyen adı" /></Field>
          </div>
          {(form.type === "Garanti Dışı" || form.type === "Periyodik Bakım") && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Para Birimi">
                <Select value={form.currency || "TRY"} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                  <option value="TRY">₺ Türk Lirası</option>
                  <option value="USD">$ Dolar (USD)</option>
                  <option value="EUR">€ Euro (EUR)</option>
                </Select>
              </Field>
              <Field label="Servis Ücreti">
                <MoneyInput value={form.servisUcreti} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, servisUcreti: v }))} />
                {(form.currency || "TRY") !== "TRY" && (
                  <span style={{ display: "inline-block", marginTop: 5, fontSize: 11, fontWeight: 700, color: "#1d4ed8", background: "#dbeafe", padding: "4px 10px", borderRadius: 8 }}>Yurt dışı</span>
                )}
              </Field>
            </div>
          )}

          {/* Ödeme durumu — sadece ücretli servislerde */}
          {(form.type === "Garanti Dışı" || form.type === "Periyodik Bakım") && parseMoney(form.servisUcreti) > 0 && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: form.odendi ? "#f0fdf4" : "#fffbeb", border: `1px solid ${form.odendi ? "#bbf7d0" : "#fde68a"}`, borderRadius: 8, padding: "10px 12px", marginBottom: 4 }}>
              <input type="checkbox" checked={!!form.odendi} onChange={e => setForm(p => ({ ...p, odendi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#16a34a" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: form.odendi ? "#15803d" : "#92400e" }}>
                {form.odendi ? "Ücret tahsil edildi (ödendi)" : "Ücret henüz tahsil edilmedi (ödenmedi)"}
              </span>
            </label>
          )}

          <Field label="Yapılan İşler / Parça Değişimleri">
            <textarea value={form.yapilanIsler || ""} onChange={e => setForm(p => ({ ...p, yapilanIsler: e.target.value }))}
              placeholder="Yapılan işlemler, değişen parçalar..."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 80, boxSizing: "border-box", fontFamily: "inherit" }} />
          </Field>

          {/* Değişen parçalar — tanımlı yedek parçalardan çoklu seçim + ücretlendirme */}
          <Field label="Değişen Parçalar (varsa)">
            {parts.length === 0 ? (
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Tanımlı yedek parça yok. Ayarlar → Tanımlar → Yedek Parça'dan ekleyebilirsiniz.</div>
            ) : (
              <>
                <Select value="" onChange={e => {
                  const ad = e.target.value;
                  if (ad && !(form.degisenParcalar || []).includes(ad)) {
                    setForm(p => ({ ...p, degisenParcalar: [...(p.degisenParcalar || []), ad] }));
                  }
                }}>
                  <option value="">+ Parça ekle...</option>
                  {parts.filter(p => !(form.degisenParcalar || []).includes(p.ad)).map(p => (
                    <option key={p.id} value={p.ad}>{p.ad}</option>
                  ))}
                </Select>
                {(form.degisenParcalar || []).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {form.degisenParcalar.map(ad => (
                      <span key={ad} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 16, padding: "4px 10px" }}>
                        {ad}
                        <button onClick={() => setForm(p => ({ ...p, degisenParcalar: p.degisenParcalar.filter(x => x !== ad) }))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#1d4ed8", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </Field>

          {(form.degisenParcalar || []).length > 0 && (
            <>
              {warrantyAktif && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", marginBottom: 4 }}>
                  <input type="checkbox" checked={!!form.parcaGarantiDisi} onChange={e => setForm(p => ({ ...p, parcaGarantiDisi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#dc2626" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>
                    {form.parcaGarantiDisi ? "Garanti kapsamı dışı (ücretli)" : "Garanti kapsamında — parça ücretsiz verildi"}
                  </span>
                </label>
              )}
              {!parcaUcretsizMi && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Parça Para Birimi">
                    <Select value={form.parcaCurrency || "TRY"} onChange={e => setForm(p => ({ ...p, parcaCurrency: e.target.value }))}>
                      <option value="TRY">₺ Türk Lirası</option>
                      <option value="USD">$ Dolar (USD)</option>
                      <option value="EUR">€ Euro (EUR)</option>
                    </Select>
                  </Field>
                  <Field label="Parça Ücreti">
                    <MoneyInput value={form.parcaUcreti} sym={CUR_SYM[form.parcaCurrency || "TRY"]} onChange={v => setForm(p => ({ ...p, parcaUcreti: v }))} />
                  </Field>
                </div>
              )}
              {!parcaUcretsizMi && parseMoney(form.parcaUcreti) > 0 && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: form.parcaOdendi ? "#f0fdf4" : "#fffbeb", border: `1px solid ${form.parcaOdendi ? "#bbf7d0" : "#fde68a"}`, borderRadius: 8, padding: "10px 12px", marginBottom: 4 }}>
                  <input type="checkbox" checked={!!form.parcaOdendi} onChange={e => setForm(p => ({ ...p, parcaOdendi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#16a34a" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: form.parcaOdendi ? "#15803d" : "#92400e" }}>
                    {form.parcaOdendi ? "Parça ücreti tahsil edildi (ödendi)" : "Parça ücreti henüz tahsil edilmedi (ödenmedi)"}
                  </span>
                </label>
              )}
            </>
          )}

          <Field label="Müşteri Talimatı / Açıklama">
            <textarea value={form.musteriTalimati || ""} onChange={e => setForm(p => ({ ...p, musteriTalimati: e.target.value }))}
              placeholder="Müşterinin talimatı / talebi..."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 60, boxSizing: "border-box", fontFamily: "inherit" }} />
          </Field>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>İptal</Btn>
            <Btn onClick={save}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
