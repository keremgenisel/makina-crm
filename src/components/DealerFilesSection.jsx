import { useState, useMemo, useEffect, useRef } from "react";
import { Icon, Btn, Select, ConfirmDialog } from "./ui";
import { today, fmtTR, uid, bumpId, withDeleted, dosyaBuKayitYerinde } from "../lib/utils";
import { logAction, getAuditUsername } from "../lib/audit";

// Bayi/anlaşmalı servis dosya arşivi bölümü. Künye ortak `dosyalar` dizisinde `dealerId` ile tutulur.
// Bağ: "Bu bayi (genel)" veya (anlaşmalı serviste) o firmanın bir servisi. Bağ sonradan
// değiştirilebilir (yanlış seçilirse silip yeniden yüklemeye gerek yok). window.appFiles yerel/istemci
// farkını yönetir; çevrimdışıyken (cevrimdisi) ekleme/açma/indirme kilitlenir.
const TUR_RENK = { PDF: "var(--red600, #dc2626)", JPG: "var(--purTx, #7c3aed)", XLS: "var(--cyan, #0891b2)", DOC: "var(--blu600, #2563eb)", TXT: "var(--n500, #64748b)", DOSYA: "var(--n400, #94a3b8)" };
const REF_ROZET = { bayi: { bg: "var(--ambBg, #fffbeb)", fg: "var(--amb800, #92400e)" }, servis: { bg: "var(--grnBg, #f0fdf4)", fg: "var(--grn900, #166534)" } };
const fmtBoyut = (b) => { const n = Number(b) || 0; if (n < 1024) return `${n} B`; if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`; return `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`; };

export function DealerFilesSection({ dealer, dosyalar = [], setDosyalar = null, services = [], customers = [], canDo = () => true, showToast = () => {}, serverPermissions = null, cevrimdisi = false, odak = null, onOdakChange = null }) {
  const [acik, setAcik] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelId, setConfirmDelId] = useState(null);
  const [bind, setBind] = useState("bayi|");   // yeni dosyanın bağı: "refType|refId"
  const [editId, setEditId] = useState(null);  // bağı değiştirilen mevcut dosyanın id'si
  const sectionRef = useRef(null);
  // Bu firmanın servis kimlikleri — müşteri tarafında bu servislere bağlanan dosyalar da burada
  // görünsün (servis dosyası, servisin göründüğü her iki yerde de listelenir).
  const servisIdKumesi = useMemo(() => new Set(services.map(s => s.id)), [services]);
  const liste = useMemo(
    () => dosyalar.filter(d => dosyaBuKayitYerinde(d, "dealerId", dealer?.id, servisIdKumesi))
      .sort((a, b) => (b.tarih || "").localeCompare(a.tarih || "")),
    [dosyalar, dealer?.id, servisIdKumesi]
  );
  // Dışarıdan odak gelince (servis kartındaki ataş rozetine tıklama): bölümü aç, o servise
  // filtrele, yükleme dropdown'ını o servise ön-seç ve bölümü görünür kaydır.
  useEffect(() => {
    if (!odak) return;
    setAcik(true);
    setBind(`${odak.refType}|${odak.refId}`);
    if (sectionRef.current) sectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [odak]);
  if (!setDosyalar || !dealer) return null;

  const bagliMi = services.length > 0; // bağ seçimi yalnızca anlaşmalı serviste (servisi olan) anlamlı
  // Odak aktifse yalnız o kaydın dosyaları gösterilir (müşteri detayındaki dosyaFiltre gibi).
  const gosterilecek = odak ? liste.filter(d => (d.refType || "bayi") === odak.refType && d.refId === odak.refId) : liste;
  const svcEtiket = (s) => {
    const cust = customers.find(c => c.id === s.customerId);
    const bas = `Servis · ${s.date ? fmtTR(s.date) : (s.type || "")}`;
    return cust ? `${bas} · ${cust.name}` : bas;
  };
  // Bir servise BİRDEN FAZLA dosya bağlanabilir (arıza öncesi/sonrası vb.), bu yüzden dosyası olan
  // servis de listede kalır. "Bu bayi (genel)" her zaman başta.
  const secenekler = () => [
    <option key="b" value="bayi|">Bu bayi (genel)</option>,
    ...services.map(s => <option key={s.id} value={`servis|${s.id}`}>{svcEtiket(s)}</option>),
  ];
  const refEtiketi = (rt, rid) => {
    if (rt === "servis") { const s = services.find(x => x.id === rid); return s ? svcEtiket(s) : "Servis"; }
    return "Bayi";
  };

  const add = async () => {
    if (!window.appFiles?.add) { showToast("Dosya ekleme bu ortamda kullanılamıyor.", "err"); return; }
    const [refType, refIdStr] = bind.split("|");
    const refId = refIdStr ? Number(refIdStr) : null;
    setBusy(true);
    const res = await window.appFiles.add(dealer?.name).catch(() => null);
    setBusy(false);
    if (!res || res.canceled) return;
    if (res.eklenen?.length) {
      bumpId(dosyalar);
      const yeni = res.eklenen.map(f => ({ id: uid(), dealerId: dealer.id, refType, refId, ad: f.ad, dosyaAdi: f.dosyaAdi, boyut: f.boyut, tur: f.tur, tarih: today(), ekleyen: getAuditUsername() }));
      setDosyalar(p => [...yeni, ...p]);
      yeni.forEach(d => logAction({ serverPermissions, action: "olusturuldu", entity: "dosya", entityId: d.id, entityName: dealer.name, detail: { ad: d.ad } }));
      if (refType !== "bayi" && !odak) setBind("bayi|"); // bağlanan servis artık dosyalı, listeden düşer → genele dön (odaktayken sabit kalsın)
      showToast(yeni.length === 1 ? "Dosya eklendi." : `${yeni.length} dosya eklendi.`);
    }
    if (res.hatalar?.length) showToast(res.hatalar.join(" · "), "err");
  };
  const openDosya = async (d) => { const r = await window.appFiles?.open?.(d.dosyaAdi); if (r && !r.ok) showToast(r.error || "Dosya açılamadı.", "err"); };
  const downloadDosya = async (d) => { const r = await window.appFiles?.download?.(d.dosyaAdi, d.ad); if (r && !r.ok && !r.canceled) showToast(r.error || "İndirilemedi.", "err"); };
  const del = (id) => {
    setDosyalar(p => withDeleted(p, x => x.id === id));
    logAction({ serverPermissions, action: "silindi", entity: "dosya", entityId: id, entityName: dealer.name });
    showToast("Dosya Çöp Kutusu'na taşındı.");
  };
  const changeBind = (id, deger) => {
    const [refType, refIdStr] = String(deger).split("|");
    const refId = refIdStr ? Number(refIdStr) : null;
    setDosyalar(p => p.map(x => x.id === id ? { ...x, refType, refId } : x));
    logAction({ serverPermissions, action: "duzenlendi", entity: "dosya", entityId: id, entityName: dealer.name });
    setEditId(null);
    showToast("Dosyanın bağı güncellendi.");
  };

  return (
    <div ref={sectionRef} style={{ background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: "12px 14px", marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: acik ? 8 : 0 }}>
        <div onClick={() => setAcik(a => !a)}
          style={{ fontSize: 12, fontWeight: 800, color: "var(--n600, #475569)", textTransform: "uppercase", letterSpacing: .5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, userSelect: "none" }}>
          <span style={{ fontSize: 10 }}>{acik ? "▾" : "▸"}</span>
          Dosyalar ({liste.length})
        </div>
        {canDo("dealer_dosya_add") && !cevrimdisi && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {bagliMi && (
              <Select value={bind} onChange={e => setBind(e.target.value)} title="Yeni dosyanın bağlanacağı kayıt">
                {secenekler()}
              </Select>
            )}
            <Btn small variant="ghost" onClick={async () => { setAcik(true); await add(); }} disabled={busy}>
              <Icon name="plus" size={12} /> {busy ? "Ekleniyor..." : "Dosya Ekle"}
            </Btn>
          </div>
        )}
      </div>
      {acik && <>
        {cevrimdisi && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12, color: "var(--amb800, #92400e)", background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 8, padding: "8px 10px", marginBottom: 8, lineHeight: 1.5 }}>
            <span style={{ flexShrink: 0, marginTop: 1, display: "flex" }}><Icon name="warning" size={13} /></span>
            <span>Sunucu bağlantısı yok: dosya listesi görünür ama <b>ekleme, açma ve indirme</b> bağlantı gelince çalışır.</span>
          </div>
        )}
        {odak && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 8, background: "var(--grnBg, #f0fdf4)", border: "1px solid var(--grnBr, #bbf7d0)", borderRadius: 8, padding: "6px 10px" }}>
            <span style={{ color: "var(--n500, #64748b)" }}>Filtre: <b>{refEtiketi(odak.refType, odak.refId)}</b></span>
            {onOdakChange && (
              <button onClick={() => onOdakChange(null)} title="Filtreyi kaldır"
                style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "var(--grn900, #166534)", background: "var(--surface, #ffffff)", border: "1px solid var(--grnBr, #bbf7d0)", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>✕ Tümünü göster</button>
            )}
          </div>
        )}
        {gosterilecek.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--n400, #94a3b8)" }}>{odak ? "Bu servise ait dosya yok. Yukarıdaki \"Dosya Ekle\" ile bu servise bağlı dosya ekleyebilirsiniz." : "Henüz dosya yok. Sözleşme, yetki belgesi, fiyat listesi vb. ekleyebilirsiniz (dosya başına en fazla 20 MB)."}</div>
        )}
        {gosterilecek.map(d => {
          const rt = d.refType || "bayi";
          const rz = REF_ROZET[rt] || REF_ROZET.bayi;
          return (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--n150, #f1f5f9)", fontSize: 13 }}>
            <span style={{ width: 34, height: 40, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "#fff", background: TUR_RENK[d.tur] || TUR_RENK.DOSYA, flexShrink: 0 }}>{d.tur}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.ad}</div>
              <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)" }}>{fmtBoyut(d.boyut)} · {fmtTR(d.tarih)}{d.ekleyen ? ` · ${d.ekleyen}` : ""}</div>
            </div>
            {bagliMi && (editId === d.id ? (
              <Select value={`${rt}|${d.refId ?? ""}`} onChange={e => changeBind(d.id, e.target.value)} onBlur={() => setEditId(null)} title="Bağı değiştir">
                {secenekler()}
              </Select>
            ) : (
              <span onClick={canDo("dealer_dosya_add") ? () => setEditId(d.id) : undefined}
                title={canDo("dealer_dosya_add") ? "Bağı değiştir (tıkla)" : undefined}
                style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 7px", background: rz.bg, color: rz.fg, whiteSpace: "nowrap", cursor: canDo("dealer_dosya_add") ? "pointer" : "default" }}>{refEtiketi(rt, d.refId)}</span>
            ))}
            <Btn small variant="ghost" onClick={() => openDosya(d)} title="Aç" disabled={cevrimdisi}>Aç</Btn>
            <Btn small variant="ghost" onClick={() => downloadDosya(d)} title="İndir" disabled={cevrimdisi}>İndir</Btn>
            {canDo("dealer_dosya_del") && (
              <Btn small variant="ghost" onClick={() => setConfirmDelId(d.id)} title="Sil"><Icon name="trash" size={11} /></Btn>
            )}
          </div>
          );
        })}
      </>}
      {confirmDelId != null && (
        <ConfirmDialog
          message="Bu dosya Çöp Kutusu'na taşınacak. Ayarlar'dan 30 gün içinde geri alabilirsiniz."
          onConfirm={() => { del(confirmDelId); setConfirmDelId(null); }}
          onCancel={() => setConfirmDelId(null)}
        />
      )}
    </div>
  );
}
