import { useState, useEffect, useRef } from "react";
import { Icon, Btn, Select, ConfirmDialog } from "../../ui";
import { today, fmtTR, fmtCur, uid, bumpId, withDeleted } from "../../../lib/utils";
import { logAction, getAuditUsername } from "../../../lib/audit";

// Müşteri/makina dosya arşivi bölümü — CustomerDetailModal'dan çıkarıldı (DealerFilesSection deseni).
// Dosya bir kayda (makina genel / servis / kalıp / yedek parça / ödeme) bağlanabilir; bir kayda
// birden fazla dosya bağlanabilir. Zaman çizelgesindeki ataş rozeti dosyaFiltre'yi ayarlar → bu
// bölüm o kayda filtreler ve görünüme kayar. dosyaFiltre üst bileşende tutulur (çizelgeyle paylaşımlı).
const TUR_RENK = { PDF: "var(--red600, #dc2626)", JPG: "var(--purTx, #7c3aed)", XLS: "var(--cyan, #0891b2)", DOC: "var(--blu600, #2563eb)", TXT: "var(--n500, #64748b)", DOSYA: "var(--n400, #94a3b8)" };
const REF_ROZET = { makina: { bg: "var(--ambBg3, #fff7ed)", fg: "#9a3412" }, servis: { bg: "var(--grnBg, #f0fdf4)", fg: "var(--grn900, #166534)" }, kalip: { bg: "var(--bluBg, #eff6ff)", fg: "var(--blu700, #1d4ed8)" }, parca: { bg: "#ecfeff", fg: "#0e7490" }, odeme: { bg: "#f0fdfa", fg: "var(--teal2, #0f766e)" } };
const fmtBoyut = (b) => { const n = Number(b) || 0; if (n < 1024) return `${n} B`; if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`; return `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`; };

export function CustomerFilesSection({
  detailView, dosyalar = [], setDosyalar = null, detailDosyalar = [],
  detailServices = [], detailKalipSatislari = [], detailYedekParcalar = [], detailOdemeler = [],
  services = [], partSales = [], payments = [], customers = [],
  dosyaFiltre = null, setDosyaFiltre = () => {},
  canDo = () => true, dosyaCevrimdisi = false, showToast = () => {}, serverPermissions = null,
}) {
  const [acik, setAcik] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelId, setConfirmDelId] = useState(null);
  const [bind, setBind] = useState("makina|"); // yeni dosyanın bağlanacağı kayıt: "refType|refId"
  const [editId, setEditId] = useState(null);   // bağı değiştirilen mevcut dosyanın id'si
  const sectionRef = useRef(null);

  // Rozete tıklama (dosyaFiltre set) → bölümü aç ve görünüme kaydır.
  useEffect(() => {
    if (!dosyaFiltre) return;
    setAcik(true);
    if (sectionRef.current) sectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [dosyaFiltre]);

  if (!setDosyalar || !detailView) return null;

  const refEtiketi = (refType, refId) => {
    if (refType === "servis") { const s = services.find(x => x.id === refId); return s ? `Servis · ${s.date ? fmtTR(s.date) : (s.type || "")}` : "Servis"; }
    if (refType === "kalip") { const p = (partSales || []).find(x => x.id === refId); return p ? `Kalıp · ${p.ad || ""}` : "Kalıp"; }
    if (refType === "parca") { const p = (partSales || []).find(x => x.id === refId); return p ? `Yedek Parça · ${p.ad || ""}` : "Yedek Parça"; }
    if (refType === "odeme") { const p = (payments || []).find(x => x.id === refId); return p ? `Ödeme · ${p.tarih ? fmtTR(p.tarih) : ""}` : "Ödeme"; }
    return "Makina";
  };
  const gosterilecek = dosyaFiltre ? detailDosyalar.filter(d => d.refType === dosyaFiltre.refType && d.refId === dosyaFiltre.refId) : detailDosyalar;
  // Dosya ekleme ve bağ değiştirme için ortak seçenek listesi. Bir kayda BİRDEN FAZLA dosya
  // bağlanabilir (örn. serviste arıza öncesi/sonrası birden çok resim), bu yüzden dosyası olan
  // kayıt da listede kalır. Rozet adedi gösterir, rozete tıklayınca hepsi o kayda filtrelenir.
  const bindSecenekleri = () => [
    <option key="m" value="makina|">Bu makina / Satış (genel)</option>,
    ...detailServices.map(s => <option key={`s${s.id}`} value={`servis|${s.id}`}>Servis · {s.date ? fmtTR(s.date) : (s.type || "")}</option>),
    ...detailKalipSatislari.map(p => <option key={`k${p.id}`} value={`kalip|${p.id}`}>Kalıp · {p.ad || ""}</option>),
    ...detailYedekParcalar.map(p => <option key={`yp${p.id}`} value={`parca|${p.id}`}>Yedek Parça · {p.ad || ""}</option>),
    ...detailOdemeler.map(p => <option key={`od${p.id}`} value={`odeme|${p.id}`}>Ödeme · {p.tarih ? fmtTR(p.tarih) : ""}{p.tutar ? " · " + fmtCur(p.tutar, p.currency || detailView.currency) : ""}</option>),
  ];

  const add = async () => {
    if (!setDosyalar || !window.appFiles?.add) { showToast("Dosya ekleme bu ortamda kullanılamıyor.", "err"); return; }
    const [refType, refIdStr] = bind.split("|");
    const refId = refIdStr ? Number(refIdStr) : null;
    setBusy(true);
    const res = await window.appFiles.add(detailView?.name).catch(() => null);
    setBusy(false);
    if (!res || res.canceled) return;
    if (res.eklenen?.length) {
      bumpId(dosyalar, customers, services, partSales, payments);
      const yeni = res.eklenen.map(f => ({ id: uid(), customerId: detailView.id, refType, refId, ad: f.ad, dosyaAdi: f.dosyaAdi, boyut: f.boyut, tur: f.tur, tarih: today(), ekleyen: getAuditUsername() }));
      setDosyalar(p => [...yeni, ...p]);
      yeni.forEach(d => logAction({ serverPermissions, action: "olusturuldu", entity: "dosya", entityId: d.id, entityName: detailView?.name, detail: { ad: d.ad } }));
      if (refType !== "makina") setBind("makina|"); // bir sonraki ekleme için genele dön
      showToast(yeni.length === 1 ? "Dosya eklendi." : `${yeni.length} dosya eklendi.`);
    }
    if (res.hatalar?.length) showToast(res.hatalar.join(" · "), "err");
  };
  const openDosya = async (d) => { const r = await window.appFiles?.open?.(d.dosyaAdi); if (r && !r.ok) showToast(r.error || "Dosya açılamadı.", "err"); };
  const downloadDosya = async (d) => { const r = await window.appFiles?.download?.(d.dosyaAdi, d.ad); if (r && !r.ok && !r.canceled) showToast(r.error || "İndirilemedi.", "err"); };
  const changeBind = (id, deger) => {
    const [refType, refIdStr] = String(deger).split("|");
    const refId = refIdStr ? Number(refIdStr) : null;
    setDosyalar(p => p.map(x => x.id === id ? { ...x, refType, refId } : x));
    logAction({ serverPermissions, action: "duzenlendi", entity: "dosya", entityId: id, entityName: detailView?.name });
    setEditId(null);
    showToast("Dosyanın bağı güncellendi.");
  };
  const del = (id) => {
    setDosyalar(p => withDeleted(p, x => x.id === id)); // soft-delete → Çöp Kutusu (fiziksel dosya ileride temizlenir)
    logAction({ serverPermissions, action: "silindi", entity: "dosya", entityId: id, entityName: detailView?.name });
    showToast("Dosya Çöp Kutusu'na taşındı.");
  };

  return (
    <div ref={sectionRef} style={{ background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
      {confirmDelId != null && (
        <ConfirmDialog
          message="Bu dosya Çöp Kutusu'na taşınacak. Ayarlar'dan 30 gün içinde geri alabilirsiniz."
          onConfirm={() => { del(confirmDelId); setConfirmDelId(null); }}
          onCancel={() => setConfirmDelId(null)}
        />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: acik ? 8 : 0 }}>
        <div onClick={() => setAcik(a => !a)}
          style={{ fontSize: 12, fontWeight: 800, color: "var(--n600, #475569)", textTransform: "uppercase", letterSpacing: .5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, userSelect: "none" }}>
          <span style={{ fontSize: 10 }}>{acik ? "▾" : "▸"}</span>
          Dosyalar ({detailDosyalar.length})
        </div>
        {canDo("cust_dosya_add") && !dosyaCevrimdisi && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Select value={bind} onChange={e => setBind(e.target.value)} title="Yeni dosyanın bağlanacağı kayıt">
              {bindSecenekleri()}
            </Select>
            <Btn small variant="ghost" onClick={async () => { setAcik(true); await add(); }} disabled={busy}>
              <Icon name="plus" size={12} /> {busy ? "Ekleniyor..." : "Dosya Ekle"}
            </Btn>
          </div>
        )}
      </div>
      {acik && <>
        {dosyaCevrimdisi && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12, color: "var(--amb800, #92400e)", background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 8, padding: "8px 10px", marginBottom: 8, lineHeight: 1.5 }}>
            <span style={{ flexShrink: 0, marginTop: 1, display: "flex" }}><Icon name="warning" size={13} /></span>
            <span>Sunucu bağlantısı yok: dosya listesi görünür ama <b>ekleme, açma ve indirme</b> bağlantı gelince çalışır.</span>
          </div>
        )}
        {dosyaFiltre && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12 }}>
            <span style={{ color: "var(--n500, #64748b)" }}>Filtre: <b>{refEtiketi(dosyaFiltre.refType, dosyaFiltre.refId)}</b></span>
            <Btn small variant="ghost" onClick={() => setDosyaFiltre(null)}>Tümünü göster ({detailDosyalar.length})</Btn>
          </div>
        )}
        {gosterilecek.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--n400, #94a3b8)" }}>{dosyaFiltre ? "Bu kayda ait dosya yok." : "Henüz dosya yok. PDF, resim veya Office belgesi ekleyebilirsiniz (dosya başına en fazla 20 MB)."}</div>
        )}
        {gosterilecek.map(d => {
          const rt = d.refType || "makina";
          const rz = REF_ROZET[rt] || REF_ROZET.makina;
          return (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--n150, #f1f5f9)", fontSize: 13 }}>
            <span style={{ width: 34, height: 40, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "#fff", background: TUR_RENK[d.tur] || TUR_RENK.DOSYA, flexShrink: 0 }}>{d.tur}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.ad}</div>
              <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)" }}>{fmtBoyut(d.boyut)} · {fmtTR(d.tarih)}{d.ekleyen ? ` · ${d.ekleyen}` : ""}</div>
            </div>
            {editId === d.id ? (
              <Select value={`${rt}|${d.refId ?? ""}`} onChange={e => changeBind(d.id, e.target.value)} onBlur={() => setEditId(null)} title="Bağı değiştir">
                {bindSecenekleri()}
              </Select>
            ) : (
              <span onClick={canDo("cust_dosya_add") ? () => setEditId(d.id) : undefined}
                title={canDo("cust_dosya_add") ? "Bağı değiştir (tıkla)" : undefined}
                style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 7px", background: rz.bg, color: rz.fg, whiteSpace: "nowrap", cursor: canDo("cust_dosya_add") ? "pointer" : "default" }}>{refEtiketi(rt, d.refId)}</span>
            )}
            <Btn small variant="ghost" onClick={() => openDosya(d)} title="Aç" disabled={dosyaCevrimdisi}>Aç</Btn>
            <Btn small variant="ghost" onClick={() => downloadDosya(d)} title="İndir" disabled={dosyaCevrimdisi}>İndir</Btn>
            {canDo("cust_dosya_del") && (
              <Btn small variant="ghost" onClick={() => setConfirmDelId(d.id)} title="Sil"><Icon name="trash" size={11} /></Btn>
            )}
          </div>
          );
        })}
      </>}
    </div>
  );
}
