import { useState } from "react";
import { uid, today } from "../lib/utils";
import { tutarCoz, tanimKapat, acikTanimMi, ayOf } from "../lib/gider";
import { logAction } from "../lib/audit";
import { Icon, Field, Input, Warn, Btn, Modal, ConfirmDialog } from "./ui";
import { useSimpleDefList } from "../hooks/useSimpleDefList";
import { TutarInput, HataMetni, Ipucu, tl2, tutarMetni } from "./gider/GiderAlanlari";

// Firma çalışanları (ad soyad). Servis Panosu kartlarındaki ve servis formundaki "teknisyen"
// seçicisini besler. Basit {id, ad} listesi; KalipManager/PartManager ile aynı desen (soft-delete).
// Ad düz metin olarak services[].tech'te tutulduğundan, ad düzeltilince o servisler de güncellenir.
//
// Gider kaydı (spec 0001 R5/R16, plan K7/K20/K28): çalışanın aylık maliyeti iki bileşenlidir (resmi
// işveren maliyeti + elden ödenen) ve YALNIZ tekrarlayan personel tanımının girdisidir. Bu alanlar ve
// varsayılan resmi maliyet gider yetkisi olmayan kullanıcıya hiç çizilmez (AC-55); düzenleme
// "tanım yönetimi" iznine bağlıdır. Açık tanımı olan çalışan silinince tanım silinmez, son üretilen
// ayda kapatılır (AC-65).
const maliyetNormalize = (c) => {
  const r = tutarCoz(c.resmiMaliyet), e = tutarCoz(c.eldenMaliyet);
  const out = { ...c };
  if ("resmiMaliyet" in c) out.resmiMaliyet = r.bos || r.gecersiz ? null : r.deger;
  if ("eldenMaliyet" in c) out.eldenMaliyet = e.bos || e.gecersiz ? null : e.deger;
  return out;
};
const maliyetHatasi = (v) => { const t = tutarCoz(v); return t.gecersiz ? "Tutar sayıya çevrilemedi." : (!t.bos && t.deger < 0 ? "Tutar negatif olamaz." : ""); };

export const CalisanManager = ({
  calisanlar = [], setCalisanlar, setServices = null, showToast = () => {},
  giderYetki = false, maliyetDuzenleyebilir = false, appSettings = {}, setAppSettings = null,
  giderTanimlari = [], setGiderTanimlari = null, serverPermissions,
}) => {
  const varsayilanResmi = appSettings?.giderAyarlari?.varsayilanResmiMaliyet;
  const maliyetAcik = giderYetki && maliyetDuzenleyebilir;
  const emptyForm = maliyetAcik ? { ad: "", resmiMaliyet: tutarMetni(varsayilanResmi), eldenMaliyet: "" } : { ad: "" };
  const [varsayilanMetin, setVarsayilanMetin] = useState(tutarMetni(varsayilanResmi));
  const [formHata, setFormHata] = useState("");
  const { form, setForm, editId, editForm, setEditForm, confirmDel, add, startEdit, cancelEdit, saveEdit, requestDelete, cancelDelete, confirmDelete } =
    useSimpleDefList({
      items: calisanlar,
      // Maliyet alanları formda ham metindir; kayıtta sayıya çevrilir.
      setItems: (fn) => setCalisanlar(p => (typeof fn === "function" ? fn(p) : fn).map(c => (c && ("resmiMaliyet" in c || "eldenMaliyet" in c) ? maliyetNormalize(c) : c))),
      genId: () => uid(),
      showToast,
      emptyForm,
      addMsg: "Çalışan eklendi.",
      editMsg: "Çalışan güncellendi.",
      deleteMsg: "Çalışan silindi.",
      onRename: (oldAd, newAd) => setServices?.(p => p.map(s => s.tech === oldAd ? { ...s, tech: newAd } : s)),
    });

  const submitAdd = () => {
    if (maliyetAcik) {
      const h = maliyetHatasi(form.resmiMaliyet) || maliyetHatasi(form.eldenMaliyet);
      if (h) { setFormHata(h); return; }
    }
    setFormHata("");
    add();
  };
  const submitEdit = () => {
    if (maliyetAcik) {
      const h = maliyetHatasi(editForm.resmiMaliyet) || maliyetHatasi(editForm.eldenMaliyet);
      if (h) { setFormHata(h); return; }
    }
    setFormHata("");
    saveEdit();
  };
  const editAc = (c) => { setFormHata(""); startEdit(maliyetAcik ? { ...c, resmiMaliyet: tutarMetni(c.resmiMaliyet), eldenMaliyet: tutarMetni(c.eldenMaliyet) } : c); };

  const varsayilanKaydet = () => {
    const h = maliyetHatasi(varsayilanMetin);
    if (h) { setFormHata(h); return; }
    const t = tutarCoz(varsayilanMetin);
    setAppSettings?.(p => ({ ...p, giderAyarlari: { ...(p?.giderAyarlari || {}), varsayilanResmiMaliyet: t.bos ? null : t.deger } }));
    setForm(f => ({ ...f, resmiMaliyet: f.resmiMaliyet || varsayilanMetin }));
    showToast("Varsayılan resmi maliyet kaydedildi. Mevcut çalışanlar ve üretilmiş kalemler değişmedi.");
  };

  // Silme onayında açık tanım bildirimi (AC-65). Tanım gider verisidir; yetkisiz kullanıcıya adı/tutarı
  // gösterilmez ama kapatma yine uygulanır (üretim izi korunur).
  const buAy = ayOf(today());
  const acikTanimlar = confirmDel ? giderTanimlari.filter(t => String(t.calisanId) === String(confirmDel.id) && acikTanimMi(t, buAy)) : [];
  const silOnayla = () => {
    const silinen = confirmDel;
    if (acikTanimlar.length && setGiderTanimlari) {
      const ids = new Set(acikTanimlar.map(t => t.id));
      setGiderTanimlari(p => p.map(t => (ids.has(t.id) ? tanimKapat(t) : t)));
      acikTanimlar.forEach(t => logAction({ serverPermissions, action: "tanim_kapatildi", entity: "gider_tanim", entityId: t.id, entityName: t.ad, detail: { calisan: silinen?.ad } }));
    }
    confirmDelete();
  };

  return (
    <div>
      {maliyetAcik && (
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", background: "#faf7ff", border: "1px solid #ede9fe", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ width: 240 }}>
            <Field label="Varsayılan resmi aylık işveren maliyeti">
              <TutarInput ariaLabel="Varsayılan resmi aylık işveren maliyeti" value={varsayilanMetin} onChange={setVarsayilanMetin} />
            </Field>
          </div>
          <div style={{ marginBottom: 14 }}><Btn small onClick={varsayilanKaydet}>Kaydet</Btn></div>
          <div style={{ flex: "1 1 240px", fontSize: 12, color: "var(--n600, #475569)", marginBottom: 14, lineHeight: 1.5 }}>
            Yeni çalışan eklenirken resmi alan bununla dolar. Değer her yıl sizin tarafınızdan girilir, uygulama hesaplamaz. Değiştirmek mevcut çalışanları ve üretilmiş kalemleri değiştirmez.
          </div>
        </div>
      )}
      {/* Satır içi ekleme */}
      <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 200px" }}>
          <Input value={form.ad} onChange={e => setForm(p => ({ ...p, ad: e.target.value }))}
            onKeyDown={e => { if (e.key === "Enter") submitAdd(); }} placeholder="Ad Soyad" />
        </div>
        {maliyetAcik && <>
          <div style={{ width: 160 }}><TutarInput ariaLabel="Resmi işveren maliyeti" placeholder="Resmi" value={form.resmiMaliyet} onChange={v => setForm(p => ({ ...p, resmiMaliyet: v }))} /></div>
          <div style={{ width: 140 }}><TutarInput ariaLabel="Elden ödenen" placeholder="Elden" value={form.eldenMaliyet} onChange={v => setForm(p => ({ ...p, eldenMaliyet: v }))} /></div>
        </>}
        <Btn onClick={submitAdd}><Icon name="plus" size={14} /> Ekle</Btn>
      </div>
      <HataMetni>{editId === null ? formHata : ""}</HataMetni>
      <div style={{ height: 8 }} />

      <div style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, overflow: "hidden" }}>
        {calisanlar.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--n400, #94a3b8)", fontSize: 13 }}>
            Henüz çalışan eklenmedi. Üstteki kutuya ad soyad yazıp "Ekle" deyin.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            {giderYetki && (
              <thead><tr style={{ background: "var(--n100, #f8fafc)", textAlign: "left", fontSize: 11, color: "var(--n500, #64748b)", textTransform: "uppercase" }}>
                <th style={{ padding: "8px 14px" }}>Çalışan</th><th style={{ padding: "8px 14px", textAlign: "right" }}>Resmi işveren maliyeti</th>
                <th style={{ padding: "8px 14px", textAlign: "right" }}>Elden ödenen</th><th style={{ padding: "8px 14px", textAlign: "right" }}>Aylık toplam</th><th />
              </tr></thead>
            )}
            <tbody>
              {calisanlar.map(c => {
                const r = tutarCoz(c.resmiMaliyet), e = tutarCoz(c.eldenMaliyet);
                const tanimsiz = <span style={{ color: "var(--n400, #94a3b8)", fontSize: 12 }}>tanımlı değil</span>;
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--n150, #f1f5f9)" }}>
                    <td style={{ padding: "11px 14px", fontWeight: 600, fontSize: 14 }}>
                      {c.ad}
                    </td>
                    {giderYetki && <>
                      <td style={{ padding: "11px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.bos ? tanimsiz : tl2(r.deger)}</td>
                      <td style={{ padding: "11px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{e.bos ? tanimsiz : tl2(e.deger)}</td>
                      <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 700 }}>{r.bos && e.bos ? "—" : tl2(r.deger + e.deger)}</td>
                    </>}
                    <td style={{ padding: "8px 14px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <Btn small variant="ghost" onClick={() => editAc(c)}><Icon name="edit" size={12} /></Btn>
                        <Btn small variant="danger" onClick={() => requestDelete(c)}><Icon name="trash" size={12} /></Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {giderYetki && <Ipucu>Gider tutarı = resmi + elden. Maliyet değişince geçmiş ayların kalemleri değişmez; yeni tutar bir sonraki üretimde kullanılır.</Ipucu>}

      {confirmDel && (
        <ConfirmDialog
          message={`"${confirmDel.ad}" çalışanı Çöp Kutusu'na taşınacak — Ayarlar'dan 30 gün içinde geri alabilirsiniz. (Geçmiş servislerdeki teknisyen adı ve geçmiş gider kalemleri korunur.)${acikTanimlar.length
            ? ` Bu çalışanın açık bir tekrarlayan personel tanımı var: tanım silinmez, bitiş ayı son üretilen ay yapılarak kapatılır ve sonraki aylar için kalem üretilmez.`
            : ""}`}
          confirmLabel={acikTanimlar.length ? "Sil ve Tanımı Kapat" : "Evet, Sil"}
          onConfirm={silOnayla}
          onCancel={cancelDelete}
        />
      )}

      {editId !== null && (
        <Modal title="Çalışanı Düzenle" onClose={cancelEdit}
          footer={<><Btn variant="ghost" onClick={cancelEdit}>İptal</Btn><Btn onClick={submitEdit}><Icon name="check" size={14} /> Kaydet</Btn></>}>
          <Field label="Ad Soyad">
            <Input value={editForm.ad || ""} onChange={e => setEditForm(p => ({ ...p, ad: e.target.value }))} placeholder="Ad Soyad" />
            <Warn>{!(editForm.ad || "").trim() ? "Ad girilmedi" : ""}</Warn>
          </Field>
          {maliyetAcik && <>
            <Field label="Resmi işveren maliyeti (SGK dahil)">
              <TutarInput value={editForm.resmiMaliyet} onChange={v => setEditForm(p => ({ ...p, resmiMaliyet: v }))} />
            </Field>
            <Field label="Elden ödenen">
              <TutarInput value={editForm.eldenMaliyet} onChange={v => setEditForm(p => ({ ...p, eldenMaliyet: v }))} />
            </Field>
            <Ipucu>Boş bırakılan bileşen sıfır sayılır. Tutar yalnız tekrarlayan personel tanımının girdisidir; kaydedilmiş kalemler değişmez.</Ipucu>
            <HataMetni>{formHata}</HataMetni>
          </>}
        </Modal>
      )}
    </div>
  );
};
