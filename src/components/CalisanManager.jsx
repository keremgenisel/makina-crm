import { useState, useEffect, useRef } from "react";
import { uid, today } from "../lib/utils";
import { tutarCoz, tanimKapat, acikTanimMi, ayOf, tl } from "../lib/gider";
import { avansBorcuK } from "../lib/kasa";
import { logAction } from "../lib/audit";
import { Icon, Field, Input, Btn, Modal, ConfirmDialog, LockConflict } from "./ui";
import { useLock } from "../hooks/useLock";
import { useSimpleDefList } from "../hooks/useSimpleDefList";
import { TutarInput, tl2, tutarMetni } from "./gider/GiderAlanlari";
import { HataMetni, Ipucu } from "./tasarim";

// Firma çalışanları (ad soyad). Servis Panosu kartlarındaki ve servis formundaki "teknisyen"
// seçicisini besler. Basit {id, ad} listesi; KalipManager/PartManager ile aynı desen (soft-delete).
// Ad düz metin olarak services[].tech'te tutulduğundan, ad düzeltilince o servisler de güncellenir.
//
// Gider kaydı (spec 0001 R5/R16, plan K7/K20/K28): çalışanın aylık maliyeti iki bileşenlidir (resmi
// işveren maliyeti + elden ödenen) ve YALNIZ tekrarlayan personel tanımının girdisidir. Bu alanlar ve
// varsayılan resmi maliyet gider yetkisi olmayan kullanıcıya hiç çizilmez (AC-55); düzenleme
// "tanım yönetimi" iznine bağlıdır. Açık tanımı olan çalışan silinince tanım silinmez, son üretilen
// ayda kapatılır (AC-65).
// Spec 0070 R1, R24: dört bileşen (sıra resmi, SGK, elden, yol parası); normalize kapıları dördünü de sayar.
export const MALIYET_ALANLARI = ["resmiMaliyet", "sgkMaliyet", "eldenMaliyet", "yolParasiMaliyet"];
// Spec 0074 R15, R24: SGK ayrı gider türüdür; karttaki SGK yalnız aylık SGK kaleminin önerisidir (hiçbir toplamın parçası değil).
export const CALISAN_MALIYET_IPUCU = "Dört bileşenin toplamı işverene toplam maliyettir. Personel gider kalemi resmi + elden + yol parasıdır; SGK personel kalemine girmez, aylık SGK kendi gider kalemiyle (SGK türü) ödenir. Maliyet değişince geçmiş ayların kalemleri değişmez.";
export const CALISAN_SGK_IPUCU = "Kuruma ödenen SGK tutarı. Personel kalemine girmez; aylık SGK kaleminde \"Çalışanların SGK toplamını kullan\" ile önerilir.";
const maliyetNormalize = (c) => {
  const out = { ...c };
  for (const a of MALIYET_ALANLARI) if (a in c) { const t = tutarCoz(c[a]); out[a] = t.bos || t.gecersiz ? null : t.deger; }
  return out;
};
const maliyetVar = (c) => MALIYET_ALANLARI.some(a => a in c);
const YOL_PARASI_IPUCU = "Yol parası çalışana elden tutarla birlikte ödenir. Bordroda gösteriyorsanız tutarı resmi alanına yazın ve bu alanı boş bırakın.";
const maliyetHatasi = (v) => { const t = tutarCoz(v); return t.gecersiz ? "Tutar sayıya çevrilemedi." : (!t.bos && t.deger < 0 ? "Tutar negatif olamaz." : ""); };

export const CalisanManager = ({
  calisanlar = [], setCalisanlar, setServices = null, showToast = () => {},
  giderYetki = false, maliyetDuzenleyebilir = false, appSettings = {}, setAppSettings = null,
  giderTanimlari = [], setGiderTanimlari = null, serverPermissions,
  // Spec 0024 B (C8, AC-34): açık avans borcu olan çalışanın silme onayında güçlü uyarı (fabrikanın alacağı).
  hesapHareketleri = [], giderler = [],
}) => {
  const varsayilanResmi = appSettings?.giderAyarlari?.varsayilanResmiMaliyet;
  const maliyetAcik = giderYetki && maliyetDuzenleyebilir;
  const emptyForm = maliyetAcik ? { ad: "", resmiMaliyet: tutarMetni(varsayilanResmi), sgkMaliyet: "", eldenMaliyet: "", yolParasiMaliyet: "" } : { ad: "" };
  const [varsayilanMetin, setVarsayilanMetin] = useState(tutarMetni(varsayilanResmi));
  const [formHata, setFormHata] = useState("");
  const { form, setForm, editId, editForm, setEditForm, confirmDel, add, startEdit, cancelEdit, saveEdit, requestDelete, cancelDelete, confirmDelete } =
    useSimpleDefList({
      items: calisanlar,
      // Maliyet alanları formda ham metindir; kayıtta sayıya çevrilir.
      setItems: (fn) => setCalisanlar(p => (typeof fn === "function" ? fn(p) : fn).map(c => (c && maliyetVar(c) ? maliyetNormalize(c) : c))),
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
      const h = MALIYET_ALANLARI.map(a => maliyetHatasi(form[a])).find(Boolean);
      if (h) { setFormHata(h); return; }
    }
    setFormHata("");
    add();
  };
  const submitEdit = () => {
    if (maliyetAcik) {
      const h = MALIYET_ALANLARI.map(a => maliyetHatasi(editForm[a])).find(Boolean);
      if (h) { setFormHata(h); return; }
    }
    setFormHata("");
    saveEdit();
  };
  // Spec 0064 R5, R30 (AC-7): panel `ayar` + `calisanlar` kilidini Settings alır; satır düzenlemesi ayrıca çalışanın
  // `calisan` kilidini alır (Kasa'da aynı çalışana avans girilirken adı değişmesin).
  const { lockConflict: calisanKilidi, forceAcquire: calisanKilidiDevral } = useLock("calisan", editId);
  const editAc = (c) => { setFormHata(""); startEdit(maliyetAcik ? { ...c, ...Object.fromEntries(MALIYET_ALANLARI.map(a => [a, tutarMetni(c[a])])) } : c); };
  // R24 (TY kararı): dar genişlikte SGK ve yol parası ayrı sütun yerine resmi ve elden hücrelerinin alt satırında.
  const tabloRef = useRef(null);
  const [dar, setDar] = useState(false);
  useEffect(() => {
    if (!tabloRef.current || typeof ResizeObserver === "undefined") return undefined;
    const g = new ResizeObserver(([e]) => setDar(e.contentRect.width < 640));
    g.observe(tabloRef.current);
    return () => g.disconnect();
  }, []);

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
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", background: "var(--purBg3, #faf7ff)", border: "1px solid var(--purBg2, #ede9fe)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
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
          <div style={{ width: 150 }}><TutarInput ariaLabel="Resmi işveren maliyeti" placeholder="Resmi" value={form.resmiMaliyet} onChange={v => setForm(p => ({ ...p, resmiMaliyet: v }))} /></div>
          <div style={{ width: 120 }}><TutarInput ariaLabel="SGK" placeholder="SGK" value={form.sgkMaliyet} onChange={v => setForm(p => ({ ...p, sgkMaliyet: v }))} /></div>
          <div style={{ width: 130 }}><TutarInput ariaLabel="Elden ödenen" placeholder="Elden" value={form.eldenMaliyet} onChange={v => setForm(p => ({ ...p, eldenMaliyet: v }))} /></div>
          <div style={{ width: 120 }}><TutarInput ariaLabel="Yol parası" placeholder="Yol parası" value={form.yolParasiMaliyet} onChange={v => setForm(p => ({ ...p, yolParasiMaliyet: v }))} /></div>
        </>}
        <Btn onClick={submitAdd}><Icon name="plus" size={14} /> Ekle</Btn>
      </div>
      <HataMetni>{editId === null ? formHata : ""}</HataMetni>
      <div style={{ height: 8 }} />

      <div ref={tabloRef} style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, overflow: "hidden" }}>
        {calisanlar.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--n400, #94a3b8)", fontSize: 13 }}>
            Henüz çalışan eklenmedi. Üstteki kutuya ad soyad yazıp "Ekle" deyin.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            {giderYetki && (
              <thead><tr style={{ background: "var(--n100, #f8fafc)", textAlign: "left", fontSize: 11, color: "var(--n500, #64748b)", textTransform: "uppercase" }}>
                <th style={{ padding: "8px 14px" }}>Çalışan</th><th style={{ padding: "8px 14px", textAlign: "right" }}>Resmi işveren maliyeti</th>
                {!dar && <th style={{ padding: "8px 14px", textAlign: "right" }}>SGK</th>}
                <th style={{ padding: "8px 14px", textAlign: "right" }}>Elden ödenen</th>
                {!dar && <th style={{ padding: "8px 14px", textAlign: "right" }}>Yol parası</th>}
                <th style={{ padding: "8px 14px", textAlign: "right" }}>Aylık toplam</th><th />
              </tr></thead>
            )}
            <tbody>
              {calisanlar.map(c => {
                const r = tutarCoz(c.resmiMaliyet), sg = tutarCoz(c.sgkMaliyet), e = tutarCoz(c.eldenMaliyet), yp = tutarCoz(c.yolParasiMaliyet);
                const altSatir = (etiket, t) => (dar && !t.bos ? <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", fontWeight: 400 }}>{etiket} {tl2(t.deger)}</div> : null);
                const tanimsiz = <span style={{ color: "var(--n400, #94a3b8)", fontSize: 12 }}>tanımlı değil</span>;
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--n150, #f1f5f9)" }}>
                    <td style={{ padding: "11px 14px", fontWeight: 600, fontSize: 14 }}>
                      {c.ad}
                    </td>
                    {giderYetki && <>
                      <td style={{ padding: "11px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.bos ? tanimsiz : tl2(r.deger)}{altSatir("SGK", sg)}</td>
                      {!dar && <td style={{ padding: "11px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{sg.bos ? tanimsiz : tl2(sg.deger)}</td>}
                      <td style={{ padding: "11px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{e.bos ? tanimsiz : tl2(e.deger)}{altSatir("Yol", yp)}</td>
                      {!dar && <td style={{ padding: "11px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{yp.bos ? tanimsiz : tl2(yp.deger)}</td>}
                      <td data-testid="calisan-aylik-toplam" style={{ padding: "11px 14px", textAlign: "right", fontWeight: 700 }}>{r.bos && sg.bos && e.bos && yp.bos ? "—" : tl2(r.deger + sg.deger + e.deger + yp.deger)}</td>
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
      {/* Spec 0074 R15 (Ö-16), C2: toplam işverene toplam maliyettir; SGK personel kalemine girmez, kendi gider kalemiyle ödenir. */}
      {giderYetki && <div data-testid="calisan-maliyet-ipucu"><Ipucu>{CALISAN_MALIYET_IPUCU}</Ipucu></div>}

      {confirmDel && (
        <ConfirmDialog
          // Gider yetkisi olmayana personel tanımının varlığı sızdırılmaz (triyaj bulgu 6): mesaj ve düğme
          // genel kalır, tanım yine arka planda kapatılır (silOnayla).
          message={`${giderYetki && avansBorcuK(confirmDel.id, hesapHareketleri || [], giderler) > 0
            ? `DİKKAT: Bu çalışanın ${tl2(tl(avansBorcuK(confirmDel.id, hesapHareketleri || [], giderler)))} açık avans borcu var (fabrikanın alacağı). Silme borcu kapatmaz; avans hareketleri Kasa › Çalışan avansları'nda "silinmiş" olarak durur. `
            : ""}"${confirmDel.ad}" çalışanı Çöp Kutusu'na taşınacak — Ayarlar'dan 30 gün içinde geri alabilirsiniz. (Geçmiş servislerdeki teknisyen adı${giderYetki ? " ve geçmiş gider kalemleri" : ""} korunur.)${giderYetki && acikTanimlar.length
            ? ` Bu çalışanın açık bir tekrarlayan personel tanımı var: tanım silinmez, bitiş ayı son üretilen ay yapılarak kapatılır ve sonraki aylar için kalem üretilmez.`
            : ""}`}
          confirmLabel={giderYetki && acikTanimlar.length ? "Sil ve Tanımı Kapat" : "Evet, Sil"}
          onConfirm={silOnayla}
          onCancel={cancelDelete}
        />
      )}

      {editId !== null && (
        <Modal title="Çalışanı Düzenle" onClose={cancelEdit}
          footer={calisanKilidi ? null : <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={cancelEdit}>İptal</Btn>
            <Btn onClick={submitEdit}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>}>
          {calisanKilidi ? <LockConflict lockedBy={calisanKilidi.lockedBy} lockedAt={calisanKilidi.lockedAt} onForce={calisanKilidiDevral} onCancel={cancelEdit} /> : (<>
          <Field label="Ad Soyad">
            <Input value={editForm.ad || ""} onChange={e => setEditForm(p => ({ ...p, ad: e.target.value }))} placeholder="Ad Soyad" />
            <HataMetni>{!(editForm.ad || "").trim() ? "Ad girilmedi" : ""}</HataMetni>
          </Field>
          {maliyetAcik && <>
            {/* Spec 0070 R1, R23 (AC-4): SGK kendi kutusunda; resmi etiketi artık SGK'yı kapsadığını söylemez. */}
            <Field label="Resmi işveren maliyeti">
              <TutarInput ariaLabel="Resmi işveren maliyeti" value={editForm.resmiMaliyet} onChange={v => setEditForm(p => ({ ...p, resmiMaliyet: v }))} />
            </Field>
            <Field label="SGK">
              <TutarInput ariaLabel="SGK" value={editForm.sgkMaliyet} onChange={v => setEditForm(p => ({ ...p, sgkMaliyet: v }))} />
              <Ipucu>{CALISAN_SGK_IPUCU}</Ipucu>
            </Field>
            <Field label="Elden ödenen">
              <TutarInput ariaLabel="Elden ödenen" value={editForm.eldenMaliyet} onChange={v => setEditForm(p => ({ ...p, eldenMaliyet: v }))} />
            </Field>
            <Field label="Yol parası">
              <TutarInput ariaLabel="Yol parası" value={editForm.yolParasiMaliyet} onChange={v => setEditForm(p => ({ ...p, yolParasiMaliyet: v }))} />
              <Ipucu>{YOL_PARASI_IPUCU}</Ipucu>
            </Field>
            <Ipucu>Boş bırakılan bileşen sıfır sayılır. Tutar yalnız tekrarlayan personel tanımının girdisidir; kaydedilmiş kalemler değişmez.</Ipucu>
            <HataMetni>{formHata}</HataMetni>
          </>}
          </>)}
        </Modal>
      )}
    </div>
  );
};
