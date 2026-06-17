import { useState } from "react";
import { trLower, uid, bumpId } from "../lib/utils";
import { Icon, Field, Input, Warn, EMAIL_RE, PHONE_RE, Btn, Modal, ConfirmDialog, Pagination, CountryCityFields } from "./ui";

export const SimpleDealers = ({ dealers, setDealers, factory, setFactory, geoData, loadingGeo, showToast = () => {} }) => {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [page, setPage] = useState(1);
  const [confirmId, setConfirmId] = useState(null);
  const [detailView, setDetailView] = useState(null); // tıklanan bayinin tüm bilgileri
  const PER_PAGE = 10;

  const q = trLower(search);
  const filtered = dealers.filter(d =>
    trLower(d.name).includes(q) || trLower(d.city).includes(q) ||
    trLower(d.contact).includes(q) || trLower(d.country).includes(q)
  );
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openAdd  = () => { setForm({ name: "", contact: "", phone: "", email: "", adres: "", country: "Türkiye", city: "", note: "" }); setModal("add"); };
  const openEdit = d => { setForm({ ...d }); setModal({ edit: d }); };
  const openFactoryEdit = () => { setForm({ ...factory }); setModal("factory"); };
  const save = () => {
    if (modal === "factory") { setFactory({ ...form }); showToast("Fabrika bilgileri düzenlendi."); }
    else if (modal === "add") { bumpId(dealers); const nid = uid(); setDealers(p => p.some(d => d.id === nid) ? p : [{ ...form, id: nid }, ...p]); showToast("Bayi kaydedildi."); }
    else { setDealers(p => p.map(d => d.id === form.id ? form : d)); showToast("Bayi bilgileri düzenlendi."); }
    setModal(null);
  };
  const confirmDel = () => { setDealers(p => p.filter(d => d.id !== confirmId)); setConfirmId(null); showToast("Bayi silindi."); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Bayiler</h2>
        <Btn onClick={openAdd}><Icon name="plus" size={14} /> Bayi Ekle</Btn>
      </div>
      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Bayi ara..."
          style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
      </div>
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden" }}>
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
              <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "13px 16px", cursor: "pointer" }} onClick={() => setDetailView(d)} title="Tüm bilgileri görüntüle">
                  <div style={{ fontWeight: 600, fontSize: 14, textDecoration: "underline", textDecorationColor: "#e2e8f0" }}>{d.name}</div>
                  {d.adres && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.adres}</div>}
                </td>
                <td style={{ padding: "13px 16px", fontSize: 13, color: "#475569" }}>{d.contact || "—"}</td>
                <td style={{ padding: "13px 16px", fontSize: 13, color: "#475569" }}>{d.phone || "—"}</td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>{d.country && d.city ? `${d.country} / ${d.city}` : d.city || d.country || "—"}</td>
                <td style={{ padding: "13px 16px" }}>
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
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setDetailView(null)}>Kapat</Btn>
          </div>
        </Modal>
      )}

      {confirmId && (
        <ConfirmDialog
          message={`"${dealers.find(d => d.id === confirmId)?.name || ""}" bayisi kalıcı olarak silinecek.`}
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
