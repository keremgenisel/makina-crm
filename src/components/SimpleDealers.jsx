import { useState, useMemo, useEffect } from "react";
import { DEFAULT_KDV_RATES } from "../lib/constants";
import { uid, bumpId, fmtTR, fmtCur, parseMoney, calcKDV, isParcaBorcluAnlasmaliFirmaya, withDeleted } from "../lib/utils";
import { useFilteredList } from "../hooks/useFilteredList";
import { usePagination } from "../hooks/usePagination";
import { Icon, Field, Input, Warn, EMAIL_RE, PHONE_RE, Btn, Modal, ConfirmDialog, Pagination, CountryCityFields } from "./ui";

export const SimpleDealers = ({ dealers, setDealers, factory, setFactory, geoData, loadingGeo, services = [], customers = [], setServices = null, setCustomers = null, kdvRates = DEFAULT_KDV_RATES, initialFilter = "all", onGoCustomerDetail = null, showToast = () => {} }) => {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirmId, setConfirmId] = useState(null);
  const [detailView, setDetailView] = useState(null); // tıklanan bayinin tüm bilgileri
  const [dealerFilter, setDealerFilter] = useState(initialFilter); // all | bayi | anlasmali | borclu
  useEffect(() => { setDealerFilter(initialFilter); }, [initialFilter]);
  const factoryName = factory?.name || "Altuntaş Makina";

  // Anlaşmalı servis firmalarının üstlendiği ödenmemiş parça borcu — firma adına göre gruplanır
  // (Karar: Seçenek A — parça ücreti gerçek bir Altuntaş satışı ama borçlusu müşteri değil bu firma)
  const borcMap = useMemo(() => {
    const map = {};
    services.forEach(s => {
      if (!isParcaBorcluAnlasmaliFirmaya(s, factoryName)) return;
      const name = s.islemFirma;
      if (!map[name]) map[name] = { byCur: {}, kdvByCur: {}, records: [] };
      const curK = s.parcaCurrency || s.currency || "TRY";
      const tutar = parseMoney(s.parcaUcreti);
      const kdv = calcKDV(s.faturaTipi, tutar, s.date, kdvRates);
      map[name].byCur[curK] = (map[name].byCur[curK] || 0) + tutar;
      map[name].kdvByCur[curK] = (map[name].kdvByCur[curK] || 0) + kdv;
      map[name].records.push(s);
    });
    return map;
  }, [services, factoryName, kdvRates]);
  const dealerHasDebt = (d) => !!(borcMap[d.name] && Object.values(borcMap[d.name].byCur).some(v => v > 0));

  const [dealerSvcSearch, setDealerSvcSearch] = useState("");
  useEffect(() => { setDealerSvcSearch(""); }, [detailView]);

  const dealerServices = useMemo(() => {
    if (!detailView?.anlasmaliServisMi) return [];
    return services
      .filter(s => !s.deletedAt && s.islemFirma === detailView.name)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [services, detailView]);

  const dealerSvcFiltered = useMemo(() => {
    if (!dealerSvcSearch.trim()) return dealerServices;
    const q = dealerSvcSearch.toLocaleLowerCase("tr-TR");
    return dealerServices.filter(s => {
      const cust = customers.find(c => c.id === s.customerId);
      return (cust?.name || "").toLocaleLowerCase("tr-TR").includes(q) ||
        (s.type || "").toLocaleLowerCase("tr-TR").includes(q);
    });
  }, [dealerServices, dealerSvcSearch, customers]);

  const { page: svcPage, setPage: setSvcPage, paged: svcPaged } = usePagination(dealerSvcFiltered, 5);

  const { search, setSearch, page, setPage, filtered, paged, perPage: PER_PAGE } = useFilteredList(dealers, {
    searchFields: ["name", "city", "contact", "country"],
    filterFn: d => {
      if (dealerFilter === "bayi") return d.bayiMi !== false;
      if (dealerFilter === "anlasmali") return !!d.anlasmaliServisMi;
      if (dealerFilter === "borclu") return dealerHasDebt(d);
      return true;
    },
  });

  const openAdd  = () => { setForm({ name: "", contact: "", phone: "", email: "", adres: "", country: "Türkiye", city: "", note: "", bayiMi: true, anlasmaliServisMi: false }); setModal("add"); };
  const openEdit = d => { setForm({ bayiMi: true, anlasmaliServisMi: false, ...d }); setModal({ edit: d }); };
  const openFactoryEdit = () => { setForm({ ...factory }); setModal("factory"); };
  const save = () => {
    if (modal === "factory") {
      const oldName = factory?.name;
      const newName = (form.name || "").trim() || oldName;
      const prevNames = oldName && newName && oldName !== newName
        ? [...new Set([...(factory?.prevNames || []), oldName])]
        : (factory?.prevNames || []);
      setFactory({ ...form, name: newName, prevNames });
      if (oldName && newName && oldName !== newName) {
        setCustomers?.(p => p.map(c => {
          const satisYapanEsleser = c.satisYapan === oldName;
          const prevOwnerEsleser = c.prevOwners?.some(o => o.satisYapan === oldName);
          if (!satisYapanEsleser && !prevOwnerEsleser) return c;
          return {
            ...c,
            satisYapan: satisYapanEsleser ? newName : c.satisYapan,
            prevOwners: prevOwnerEsleser ? c.prevOwners.map(o => o.satisYapan === oldName ? { ...o, satisYapan: newName } : o) : c.prevOwners,
          };
        }));
        setServices?.(p => p.map(s => s.islemFirma === oldName ? { ...s, islemFirma: newName } : s));
        showToast(`Fabrika adı güncellendi. "${oldName}" geçmiş kayıtlarda da değiştirildi.`);
      } else {
        showToast("Fabrika bilgileri düzenlendi.");
      }
    }
    else {
      if (modal !== "factory" && !form.bayiMi && !form.anlasmaliServisMi) { showToast("En az biri seçili olmalı: Bayi veya Anlaşmalı Servis.", "err"); return; }
      if (modal === "add") { bumpId(dealers); const nid = uid(); setDealers(p => p.some(d => d.id === nid) ? p : [{ ...form, id: nid }, ...p]); showToast("Bayi kaydedildi."); }
      else {
        const oldName = modal.edit?.name;
        const newName = form.name;
        setDealers(p => p.map(d => d.id === form.id ? form : d));
        // Firma adı düzeltildiyse (yazım hatası vb.), bu adı referans alan eski servis/müşteri kayıtlarını
        // da güncelle — yoksa borç takibi, zaman çizelgesi ve "Satış Yapan" kırılımları eski/yeni isim
        // arasında bölünür (örn. bayi borçluyken adı düzeltilince borcu kaybolmuş gibi görünür).
        if (oldName && newName && oldName !== newName) {
          setServices?.(p => p.map(s => s.islemFirma === oldName ? { ...s, islemFirma: newName } : s));
          setCustomers?.(p => p.map(c => {
            const satisYapanEsleser = c.satisYapan === oldName;
            const prevOwnerEsleser = c.prevOwners?.some(o => o.satisYapan === oldName);
            if (!satisYapanEsleser && !prevOwnerEsleser) return c;
            return {
              ...c,
              satisYapan: satisYapanEsleser ? newName : c.satisYapan,
              prevOwners: prevOwnerEsleser ? c.prevOwners.map(o => o.satisYapan === oldName ? { ...o, satisYapan: newName } : o) : c.prevOwners,
            };
          }));
          showToast(`Bayi bilgileri düzenlendi. "${oldName}" adı geçmiş kayıtlarda da güncellendi.`);
        } else {
          showToast("Bayi bilgileri düzenlendi.");
        }
      }
    }
    setModal(null);
  };
  const confirmDel = () => { setDealers(p => withDeleted(p, d => d.id === confirmId)); setConfirmId(null); showToast("Bayi silindi."); };

  // ── E-posta gönder (bayiye) — içerik tamamen serbest, birden fazla ek dosya isteğe bağlı manuel seçilir ──
  const [mailDraft, setMailDraft] = useState(null); // null | { to, subject, text, attachments: [{name, base64, mime, size}] }
  const [mailSendState, setMailSendState] = useState({ state: "idle", error: null }); // idle | sending | error
  const MAX_ATTACHMENT_MB = 15; // her dosya için ayrı ayrı geçerli sınır
  const MAX_TOTAL_ATTACHMENT_MB = 20; // tüm eklerin toplamı için sınır — SMTP sunucuları genelde toplam mesaj boyutuna da sınır koyar
  const openMailDealer = (d) => {
    setMailDraft({ to: d.email || "", subject: "", text: "", attachments: [] });
    setMailSendState({ state: "idle", error: null });
  };
  const onPickAttachment = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    const tooBig = files.find(f => f.size > MAX_ATTACHMENT_MB * 1024 * 1024);
    if (tooBig) {
      setMailSendState({ state: "error", error: `"${tooBig.name}" çok büyük (her dosya için en fazla ${MAX_ATTACHMENT_MB} MB).` });
      return;
    }
    const existingTotal = (mailDraft?.attachments || []).reduce((s, a) => s + (a.size || 0), 0);
    const newTotal = files.reduce((s, f) => s + f.size, 0);
    if (existingTotal + newTotal > MAX_TOTAL_ATTACHMENT_MB * 1024 * 1024) {
      setMailSendState({ state: "error", error: `Tüm eklerin toplamı ${MAX_TOTAL_ATTACHMENT_MB} MB'ı aşamaz.` });
      return;
    }
    const picked = await Promise.all(files.map(async (file) => {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return { name: file.name, base64: window.btoa(binary), mime: file.type || "application/octet-stream", size: file.size };
    }));
    setMailDraft(p => ({ ...p, attachments: [...(p.attachments || []), ...picked] }));
  };
  const removeAttachment = (idx) => setMailDraft(p => ({ ...p, attachments: p.attachments.filter((_, i) => i !== idx) }));
  // Tarayıcı/Electron sekmesinde doğrudan açılabilen türler (resim, PDF, metin) için önizleme — diğerleri
  // (Word/Excel gibi) zaten yeni pencerede görüntülenemiyor, o yüzden buton sadece bunlarda gösterilir.
  const isPreviewableMime = (mime) => /^(image\/|application\/pdf|text\/)/.test(mime || "");
  const previewAttachment = (att) => {
    if (!att?.base64) return;
    const byteChars = window.atob(att.base64);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    const blob = new Blob([bytes], { type: att.mime || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  const sendMailDraft = async () => {
    if (!window.appMail || !mailDraft) return;
    if (!EMAIL_RE.test(mailDraft.to || "")) { setMailSendState({ state: "error", error: "Geçerli bir alıcı e-posta adresi girin." }); return; }
    setMailSendState({ state: "sending", error: null });
    const res = await window.appMail.send({
      to: mailDraft.to.trim(), subject: mailDraft.subject, text: mailDraft.text,
      attachments: (mailDraft.attachments || []).map(a => ({ filename: a.name, contentBase64: a.base64, mimeType: a.mime })),
      type: "bayi",
    });
    if (res?.ok) {
      setMailSendState({ state: "idle", error: null });
      setMailDraft(null);
      showToast("E-posta gönderildi.");
    } else {
      setMailSendState({ state: "error", error: res?.error || "Gönderilemedi." });
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Bayiler</h2>
        <Btn onClick={openAdd}><Icon name="plus" size={14} /> Bayi/Servis Ekle</Btn>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { v: "all", l: "Tümü", count: dealers.length },
          { v: "bayi", l: "Bayiler", count: dealers.filter(d => d.bayiMi !== false).length },
          { v: "anlasmali", l: "Anlaşmalı Servisler", count: dealers.filter(d => d.anlasmaliServisMi).length },
          { v: "borclu", l: "₺ Borçlu", count: dealers.filter(dealerHasDebt).length },
        ].map(f => (
          <button key={f.v} onClick={() => { setDealerFilter(f.v); setPage(1); }}
            style={{
              padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: "1px solid", borderColor: dealerFilter === f.v ? "#e85d1a" : "#e2e8f0",
              background: dealerFilter === f.v ? "#e85d1a" : "#fff",
              color: dealerFilter === f.v ? "#fff" : "#64748b",
            }}>
            {f.l} ({f.count})
          </button>
        ))}
      </div>
      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Bayi ara..."
          style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
      </div>
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Firma", "İletişim", "Telefon", "Ülke / Şehir", ""].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Fabrika — her zaman en üstte, düzenlenebilir ama silinemez */}
            <tr style={{ borderBottom: "2px solid #d1fae5", background: "#f0fdf4" }}>
              <td style={{ padding: "13px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#065f46", cursor: "pointer", textDecoration: "underline", textDecorationColor: "#a7f3d0" }}
                    onClick={() => setDetailView({ ...(factory || {}), name: factory?.name || "Altuntaş Makina", _isFactory: true })} title="Fabrika bilgilerini görüntüle">
                    {factory?.name || "Altuntaş Makina"}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 800, background: "#10b981", color: "#fff", borderRadius: 6, padding: "2px 8px", letterSpacing: .5 }}>FABRİKA</span>
                </div>
                {factory?.adres && <div style={{ fontSize: 11, color: "#047857", marginTop: 3 }}>{factory.adres}</div>}
              </td>
              <td style={{ padding: "13px 16px", fontSize: 13, color: "#065f46" }}>{factory?.contact || "—"}</td>
              <td style={{ padding: "13px 16px", fontSize: 13, color: "#065f46" }}>{factory?.phone || "—"}</td>
              <td style={{ padding: "13px 16px", fontSize: 13, color: "#065f46" }}>{factory?.country && factory?.city ? `${factory.country} / ${factory.city}` : factory?.country || "Türkiye"}</td>
              <td style={{ padding: "13px 16px" }}>
                <Btn small variant="ghost" onClick={openFactoryEdit}><Icon name="edit" size={12} /></Btn>
              </td>
            </tr>
            {paged.map(d => (
              <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                onClick={() => setDetailView(d)} title="Tüm bilgileri görüntüle"
                onMouseEnter={e => e.currentTarget.style.background = "#fff7ed"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "13px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, textDecoration: "underline", textDecorationColor: "#e2e8f0" }}>{d.name}</span>
                    {d.bayiMi !== false && <span style={{ fontSize: 9, fontWeight: 800, background: "#3b82f6", color: "#fff", borderRadius: 6, padding: "2px 7px", letterSpacing: .3 }}>BAYİ</span>}
                    {d.anlasmaliServisMi && <span style={{ fontSize: 9, fontWeight: 800, background: "#f59e0b", color: "#fff", borderRadius: 6, padding: "2px 7px", letterSpacing: .3 }}>ANLAŞMALI SERVİS</span>}
                    {dealerHasDebt(d) && (
                      <span style={{ fontSize: 9, fontWeight: 800, background: "#dc2626", color: "#fff", borderRadius: 6, padding: "2px 7px", letterSpacing: .3 }}>
                        BORÇLU: {Object.entries(borcMap[d.name].byCur).filter(([, v]) => v > 0).map(([k, v]) => fmtCur(v, k)).join(" + ")}
                      </span>
                    )}
                  </div>
                  {d.adres && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.adres}</div>}
                </td>
                <td style={{ padding: "13px 16px", fontSize: 13, color: "#475569" }}>{d.contact || "—"}</td>
                <td style={{ padding: "13px 16px", fontSize: 13, color: "#475569" }}>{d.phone || "—"}</td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>{d.country && d.city ? `${d.country} / ${d.city}` : d.city || d.country || "—"}</td>
                <td style={{ padding: "13px 16px" }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn small variant="ghost" onClick={() => openEdit(d)}><Icon name="edit" size={12} /></Btn>
                    <Btn small variant="danger" onClick={() => setConfirmId(d.id)}><Icon name="trash" size={12} /></Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>Bayi bulunamadı.</div>}
        <Pagination total={filtered.length} page={page} setPage={setPage} perPage={PER_PAGE} />
      </div>

      {/* Bayi detay görüntüleme */}
      {detailView && (
        <Modal title={detailView.name || "Bayi"} onClose={() => setDetailView(null)}>
          {detailView._isFactory && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "8px 14px", marginBottom: 14, fontSize: 12, fontWeight: 700, color: "#065f46" }}>
              🏭 FABRİKA — Ana üretici
            </div>
          )}
          {!detailView._isFactory && detailView.anlasmaliServisMi && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "8px 14px", marginBottom: 14, fontSize: 12, fontWeight: 700, color: "#92400e" }}>
              {detailView.bayiMi !== false ? "BAYİ (Aynı zamanda Anlaşmalı Servis)" : "ANLAŞMALI SERVİS"}
            </div>
          )}
          {!detailView._isFactory && dealerHasDebt(detailView) && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#991b1b", fontWeight: 800, letterSpacing: .5, marginBottom: 4, textTransform: "uppercase" }}>Ödenmemiş Parça Borcu</div>
              {Object.entries(borcMap[detailView.name].byCur).filter(([, v]) => v > 0).map(([k, v]) => (
                <div key={k} style={{ fontSize: 20, fontWeight: 800, color: "#dc2626" }}>{fmtCur(v, k)}</div>
              ))}
              {Object.entries(borcMap[detailView.name].kdvByCur).filter(([, v]) => v > 0).map(([k, v]) => (
                <div key={k} style={{ fontSize: 11.5, color: "#0d9488", fontWeight: 700, marginTop: 3 }}>KDV: {fmtCur(v, k)}</div>
              ))}
              <div style={{ marginTop: 8 }}>
                {borcMap[detailView.name].records.map(s => (
                  <div key={s.id}
                    onClick={() => { if (onGoCustomerDetail) { setDetailView(null); onGoCustomerDetail(s.customerId); } }}
                    title={onGoCustomerDetail ? "Müşteri detayını aç" : undefined}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "6px 0", borderTop: "1px solid #fee2e2", cursor: onGoCustomerDetail ? "pointer" : "default" }}>
                    <span style={{ color: "#7f1d1d", fontWeight: 600, textDecoration: onGoCustomerDetail ? "underline" : "none", textDecorationColor: "#fecaca" }}>
                      {customers.find(c => c.id === s.customerId)?.name || "—"} · {fmtTR(s.date)}
                    </span>
                    <span style={{ fontWeight: 700, color: "#dc2626" }}>{fmtCur(s.parcaUcreti, s.parcaCurrency || s.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              ["İletişim Kişisi", detailView.contact],
              ["Telefon", detailView.phone],
              ["E-posta", detailView.email],
              ["Adres", detailView.adres],
              ["Şehir / Ülke", [detailView.city, detailView.country].filter(Boolean).join(" / ")],
              ["Not", detailView.note],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: .5, marginBottom: 3, textTransform: "uppercase" }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{v}</div>
              </div>
            ))}
          </div>
          {!detailView._isFactory && detailView.anlasmaliServisMi && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", letterSpacing: .5, textTransform: "uppercase", marginBottom: 10, paddingBottom: 6, borderBottom: "2px solid #e2e8f0" }}>
                Servis Geçmişi ({dealerServices.length})
              </div>
              <div style={{ marginBottom: 10 }}>
                <input
                  value={dealerSvcSearch}
                  onChange={e => { setDealerSvcSearch(e.target.value); setSvcPage(1); }}
                  placeholder="Müşteri veya servis tipi ara..."
                  style={{ width: "100%", padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#f8fafc" }}
                />
              </div>
              {svcPaged.length === 0 && (
                <div style={{ padding: "16px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Kayıt bulunamadı.</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {svcPaged.map(s => {
                  const cust = customers.find(c => c.id === s.customerId);
                  const parcaUcret = parseMoney(s.parcaUcreti);
                  const servisUcret = parseMoney(s.servisUcreti);
                  const parcaBizden = parcaUcret > 0 && s.parcaAltuntastanMi !== false && !s.parcaUcretsizMi;
                  const kdvToplam = parcaBizden ? calcKDV(s.faturaTipi, parcaUcret, s.date, kdvRates) : 0;
                  return (
                    <div key={s.id} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", borderLeft: "3px solid #f59e0b" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{fmtTR(s.date) || "—"}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{s.type || "—"}</span>
                        {cust && (
                          <span
                            onClick={() => { if (onGoCustomerDetail) { setDetailView(null); onGoCustomerDetail(s.customerId); } }}
                            style={{ fontSize: 11, fontWeight: 700, background: "#dbeafe", color: "#1d4ed8", borderRadius: 6, padding: "2px 8px", cursor: onGoCustomerDetail ? "pointer" : "default", textDecoration: onGoCustomerDetail ? "underline" : "none" }}>
                            {cust.name}
                          </span>
                        )}
                        {s.repairPlace && <span style={{ fontSize: 11, color: "#64748b" }}>· {s.repairPlace}</span>}
                        {s.tech && <span style={{ fontSize: 11, color: "#64748b" }}>· {s.tech}</span>}
                      </div>
                      {Array.isArray(s.degisenParcalar) && s.degisenParcalar.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                          {s.degisenParcalar.map((p, i) => (
                            <span key={i} style={{ fontSize: 11, fontWeight: 700, background: "#e0f2fe", color: "#0369a1", borderRadius: 20, padding: "3px 10px" }}>
                              {p.ad || p.name || "—"}{p.ucret ? ` · ${fmtCur(parseMoney(p.ucret), s.parcaCurrency || "TRY")}` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {servisUcret > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>
                              {fmtCur(servisUcret, s.currency || "TRY")}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", background: "#f1f5f9", borderRadius: 6, padding: "1px 6px" }}>Bayi Geliri</span>
                          </div>
                        )}
                        {parcaBizden && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#dc2626" }}>
                              {fmtCur(parcaUcret, s.parcaCurrency || s.currency || "TRY")}
                              {kdvToplam > 0 && <span style={{ color: "#64748b", fontWeight: 400 }}> · KDV dahil: {fmtCur(parcaUcret + kdvToplam, s.parcaCurrency || s.currency || "TRY")}</span>}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", background: "#f1f5f9", borderRadius: 6, padding: "1px 6px" }}>Parça</span>
                            <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 10, padding: "2px 8px", background: s.odendi ? "#dcfce7" : "#fee2e2", color: s.odendi ? "#16a34a" : "#dc2626" }}>
                              {s.odendi ? "Ödendi" : "Bekliyor"}
                            </span>
                          </div>
                        )}
                        {!parcaBizden && parcaUcret > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>
                              {fmtCur(parcaUcret, s.parcaCurrency || s.currency || "TRY")}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", background: "#f1f5f9", borderRadius: 6, padding: "1px 6px" }}>Dış Tedarik Parça</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pagination total={dealerSvcFiltered.length} page={svcPage} setPage={setSvcPage} perPage={5} />
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            {!detailView._isFactory && (
              <Btn variant="ghost" onClick={() => openMailDealer(detailView)}><Icon name="mail" size={14} /> E-posta Gönder</Btn>
            )}
            <Btn variant="ghost" onClick={() => setDetailView(null)}>Kapat</Btn>
          </div>
        </Modal>
      )}

      {/* Bayiye e-posta gönder — içerik serbest, ek dosya isteğe bağlı manuel seçilir */}
      {mailDraft && (
        <Modal title="E-posta Gönder" onClose={() => setMailDraft(null)}>
          {!window.appMail ? (
            <div style={{ fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "10px 14px", borderRadius: 10, border: "1px dashed #e2e8f0" }}>
              Bu özellik yalnızca kurulu uygulamada çalışır.
            </div>
          ) : (
            <>
              <Field label="Kime">
                <Input value={mailDraft.to} onChange={e => setMailDraft(p => ({ ...p, to: e.target.value }))} placeholder="ornek@firma.com" />
                <Warn>{mailDraft.to && !EMAIL_RE.test(mailDraft.to) ? "Geçersiz e-posta formatı" : ""}</Warn>
              </Field>
              <Field label="Konu">
                <Input value={mailDraft.subject} onChange={e => setMailDraft(p => ({ ...p, subject: e.target.value }))} placeholder="Konu" />
              </Field>
              <Field label="Mesaj">
                <textarea value={mailDraft.text} onChange={e => setMailDraft(p => ({ ...p, text: e.target.value }))}
                  placeholder="Mesajınızı yazın..."
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 110, boxSizing: "border-box", fontFamily: "inherit" }} />
              </Field>
              <Field label={`Ekler (isteğe bağlı, dosya başına en fazla ${MAX_ATTACHMENT_MB} MB, toplam en fazla ${MAX_TOTAL_ATTACHMENT_MB} MB)`}>
                <input type="file" multiple onChange={onPickAttachment}
                  style={{ fontSize: 13, color: "#475569" }} />
                {(mailDraft.attachments || []).map((att, idx) => (
                  <div key={idx} style={{ fontSize: 12, color: "#0f172a", marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    📎 {att.name}
                    {isPreviewableMime(att.mime) && (
                      <button onClick={() => previewAttachment(att)}
                        style={{ border: "none", background: "transparent", color: "#1d4ed8", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Önizle</button>
                    )}
                    <button onClick={() => removeAttachment(idx)}
                      style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Kaldır</button>
                  </div>
                ))}
              </Field>
              {mailSendState.state === "error" && (
                <div style={{ fontSize: 13, fontWeight: 600, color: "#991b1b", marginBottom: 12 }}>✗ {mailSendState.error}</div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn variant="ghost" onClick={() => setMailDraft(null)}>İptal</Btn>
                <Btn onClick={sendMailDraft} disabled={mailSendState.state === "sending"}>
                  <Icon name="mail" size={14} /> {mailSendState.state === "sending" ? "Gönderiliyor..." : "Gönder"}
                </Btn>
              </div>
            </>
          )}
        </Modal>
      )}

      {confirmId && (
        <ConfirmDialog
          message={`"${dealers.find(d => d.id === confirmId)?.name || ""}" bayisi Çöp Kutusu'na taşınacak — Ayarlar'dan 30 gün içinde geri alabilirsiniz.`}
          onConfirm={confirmDel}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {modal && (
        <Modal title={modal === "factory" ? "Fabrika Bilgilerini Düzenle" : modal === "add" ? "Bayi Ekle" : "Bayi Düzenle"} onClose={() => setModal(null)}>
          <Field label="Firma Adı">
            <Input value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Bayi firma adı" />
            {modal !== "factory" && <Warn>{!form.name?.trim() ? "Firma adı girilmedi" : ""}</Warn>}
          </Field>
          {modal !== "factory" && (
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", flex: 1 }}>
                <input type="checkbox" checked={!!form.bayiMi} onChange={e => setForm(p => ({ ...p, bayiMi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#16a34a" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Bayi</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", flex: 1 }}>
                <input type="checkbox" checked={!!form.anlasmaliServisMi} onChange={e => setForm(p => ({ ...p, anlasmaliServisMi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#f59e0b" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Anlaşmalı Servis</span>
              </label>
            </div>
          )}
          {modal !== "factory" && <Warn>{!form.bayiMi && !form.anlasmaliServisMi ? "En az biri seçili olmalı: Bayi veya Anlaşmalı Servis" : ""}</Warn>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="İletişim Kişisi"><Input value={form.contact || ""} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))} placeholder="Ad Soyad" /></Field>
            <Field label="Telefon">
              <Input value={form.phone || ""} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              <Warn>{form.phone && !PHONE_RE.test(form.phone) ? "Geçersiz telefon formatı" : ""}</Warn>
            </Field>
          </div>
          <Field label="E-posta">
            <Input value={form.email || ""} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="ornek@firma.com" />
            <Warn>{form.email && !EMAIL_RE.test(form.email) ? "Geçersiz e-posta formatı" : ""}</Warn>
          </Field>
          <Field label="Adres Satırı"><Input value={form.adres || ""} onChange={e => setForm(p => ({ ...p, adres: e.target.value }))} placeholder="Mahalle, cadde, no..." /></Field>
          <CountryCityFields country={form.country} city={form.city}
            onCountry={v => setForm(p => ({ ...p, country: v }))}
            onCity={v => setForm(p => ({ ...p, city: v }))}
            geoData={geoData} loadingGeo={loadingGeo} />
          <Field label="Not">
            <textarea value={form.note || ""} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              placeholder="Bayi hakkında notlar..."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 70, boxSizing: "border-box", fontFamily: "inherit" }} />
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
