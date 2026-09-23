import { useState } from "react";
import { uid, today } from "../../lib/utils";
import { turHaritasi, tutarCoz, modelSatirlariDogrula, ATAMA, DAVRANIS, ayOf } from "../../lib/gider";
import { logAction } from "../../lib/audit";
import { Icon, Field, Input, Select, Btn, Modal, ConfirmDialog } from "../ui";
import { Section } from "./Section";
import { TutarInput, AyInput, Segment, AtamaAlani, ODEME_SECENEKLERI, DavranisRozeti, HataMetni, Ipucu, tl2, tutarMetni } from "../gider/GiderAlanlari";

// Tekrarlayan gider tanımları (spec 0001 R3/R4, plan K2/K8/K9/K17/K28/K36). Kalemler yalnız Giderler
// sekmesindeki "tekrarlayan kalemleri oluştur" ile üretilir. uretilenAylar salt görünür: bir ayın kalemi
// silinse bile o ay listede kalır ve yeniden üretilmez. Tanım silme kalıcıdır (R12).
const bosForm = (buAy) => ({ id: null, turId: "", ad: "", calisanId: "", girisYonu: "brut", tutar: "", kdvOrani: "", tedarikciId: "", odemeYontemi: "", baslangicAy: buAy, bitisAy: null, atamaTur: "", makinaTur: null, makinaId: null, modelSatirlari: [], uretilenAylar: [] });

export const SettingsGiderTanimlari = ({
  giderTanimlari = [], setGiderTanimlari, giderTurleri = [], tedarikciler = [], calisanlar = [],
  stock = [], customers = [], modeller = [], showToast = () => {}, canDo = () => true, serverPermissions,
}) => {
  const buAy = ayOf(today());
  const [form, setForm] = useState(null);
  const [hatalar, setHatalar] = useState({});
  const [silinecek, setSilinecek] = useState(null);
  const yonetebilir = canDo("gider_tanim");
  const turMap = turHaritasi(giderTurleri);
  const davOf = (turId) => turMap.get(String(turId))?.davranis || DAVRANIS.NORMAL;
  const tedAd = (id) => tedarikciler.find(t => String(t.id) === String(id))?.ad || "";
  const personelTuru = giderTurleri.find(t => t.davranis === DAVRANIS.PERSONEL);
  const tanimsizCalisanlar = calisanlar.filter(c => !giderTanimlari.some(t => String(t.calisanId) === String(c.id) && (!t.bitisAy || t.bitisAy >= buAy)));

  const ac = (t) => {
    setHatalar({});
    setForm(t ? { ...bosForm(buAy), ...t, tutar: tutarMetni(t.tutar), kdvOrani: tutarMetni(t.kdvOrani), turId: String(t.turId ?? ""), calisanId: String(t.calisanId ?? ""), tedarikciId: String(t.tedarikciId ?? ""),
      modelSatirlari: (t.modelSatirlari || []).map(s => ({ ...s, birimMaliyet: tutarMetni(s.birimMaliyet), adet: String(s.adet ?? "") })) } : bosForm(buAy));
  };
  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const kaydet = () => {
    const h = {};
    const dav = davOf(form.turId);
    if (!form.turId) h.turId = "Gider türü seçilmedi.";
    if (!String(form.ad || "").trim() && dav !== DAVRANIS.PERSONEL) h.ad = "Tanım adı boş olamaz.";
    if (!form.baslangicAy) h.baslangicAy = "Başlangıç ayı zorunludur.";
    if (form.bitisAy && form.baslangicAy && form.bitisAy < form.baslangicAy) h.bitisAy = "Bitiş ayı başlangıçtan önce olamaz.";
    let tutar = null;
    if (dav === DAVRANIS.PERSONEL) {
      if (!form.calisanId) h.calisanId = "Çalışan seçilmedi.";
    } else {
      const t = tutarCoz(form.tutar);
      if (t.gecersiz) h.tutar = "Tutar sayıya çevrilemedi. Örnek: 20.000,00";
      else if (t.bos || t.deger <= 0) h.tutar = "Tutar sıfırdan büyük olmalı.";
      else tutar = t.deger;
    }
    const k = tutarCoz(form.kdvOrani);
    if (dav !== DAVRANIS.PERSONEL && !k.bos && (k.gecersiz || k.deger < 0 || k.deger > 100)) h.kdvOrani = "KDV oranı 0 ile 100 arasında olmalı.";
    const atamaVar = dav === DAVRANIS.NORMAL;
    if (atamaVar && form.atamaTur === ATAMA.MAKINA && form.makinaId == null) h.atama = "Makina seçilmedi.";
    if (atamaVar && form.atamaTur === ATAMA.MODEL) {
      const d = modelSatirlariDogrula(tutar ?? 0, form.modelSatirlari);
      if (!form.modelSatirlari.length) h.atama = "En az bir model satırı girin.";
      else if (d.hatalar.length) h.atama = d.hatalar[0].mesaj;
    }
    setHatalar(h);
    if (Object.keys(h).length) return;
    const calisan = calisanlar.find(c => String(c.id) === String(form.calisanId));
    const numId = (v) => (v === "" || v == null ? null : (/^\d+$/.test(String(v)) ? Number(v) : v));
    const kayit = {
      id: form.id ?? uid(), turId: numId(form.turId), ad: String(form.ad || "").trim() || calisan?.ad || "",
      tutar: dav === DAVRANIS.PERSONEL ? null : tutar,
      kdvOrani: dav === DAVRANIS.PERSONEL || k.bos ? null : k.deger,
      girisYonu: dav === DAVRANIS.KIRA ? form.girisYonu : null,
      calisanId: dav === DAVRANIS.PERSONEL ? numId(form.calisanId) : null,
      tedarikciId: dav === DAVRANIS.PERSONEL ? null : numId(form.tedarikciId),
      odemeYontemi: form.odemeYontemi || "",
      baslangicAy: form.baslangicAy, bitisAy: form.bitisAy || null,
      atamaTur: atamaVar ? (form.atamaTur || "") : "",
      makinaTur: atamaVar && form.atamaTur === ATAMA.MAKINA ? form.makinaTur : null,
      makinaId: atamaVar && form.atamaTur === ATAMA.MAKINA ? form.makinaId : null,
      modelSatirlari: atamaVar && form.atamaTur === ATAMA.MODEL ? form.modelSatirlari.map(s => ({ modelAd: s.modelAd, birimMaliyet: tutarCoz(s.birimMaliyet).deger, adet: Number(s.adet) })) : [],
      uretilenAylar: form.uretilenAylar || [], kapatildi: form.kapatildi && !!form.bitisAy,
    };
    const yeni = form.id == null;
    setGiderTanimlari(p => (yeni ? [...p, kayit] : p.map(t => (t.id === kayit.id ? kayit : t))));
    logAction({ serverPermissions, action: yeni ? "olusturuldu" : "duzenlendi", entity: "gider_tanim", entityId: kayit.id, entityName: kayit.ad });
    setForm(null);
    showToast(yeni ? "Tekrarlayan tanım eklendi." : "Tekrarlayan tanım güncellendi.");
  };

  const tumCalisanlar = () => {
    if (!personelTuru) { showToast("Önce Gider Türleri'nde Personel davranışlı bir tür tanımlayın.", "err"); return; }
    const yeni = tanimsizCalisanlar.map(c => ({ id: uid(), turId: personelTuru.id, ad: c.ad, calisanId: c.id, tutar: null, kdvOrani: null, girisYonu: null, tedarikciId: null, odemeYontemi: "", baslangicAy: buAy, bitisAy: null, atamaTur: "", makinaTur: null, makinaId: null, modelSatirlari: [], uretilenAylar: [], kapatildi: false }));
    if (!yeni.length) { showToast("Tüm çalışanların açık bir personel tanımı zaten var."); return; }
    setGiderTanimlari(p => [...p, ...yeni]);
    yeni.forEach(t => logAction({ serverPermissions, action: "olusturuldu", entity: "gider_tanim", entityId: t.id, entityName: t.ad }));
    showToast(`${yeni.length} personel tanımı oluşturuldu (başlangıç ${buAy}).`);
  };

  const sil = () => {
    const t = silinecek;
    setGiderTanimlari(p => p.filter(x => x.id !== t.id));
    logAction({ serverPermissions, action: "silindi", entity: "gider_tanim", entityId: t.id, entityName: t.ad });
    setSilinecek(null);
    showToast("Tanım silindi. Daha önce üretilmiş kalemler silinmedi.");
  };

  const tutarHucre = (t) => {
    const dav = davOf(t.turId);
    if (dav === DAVRANIS.PERSONEL) return <span style={{ color: "var(--n500, #64748b)" }}>çalışan kaydından<br /><span style={{ fontSize: 11 }}>resmi + elden</span></span>;
    return <><b>{tl2(t.tutar)}</b><div style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>{dav === DAVRANIS.KIRA ? (t.girisYonu === "net" ? "Net girildi" : "Brüt girildi") : (t.kdvOrani == null ? "KDV tarihe göre" : `KDV %${t.kdvOrani}`)}</div></>;
  };
  const atamaHucre = (t) => {
    if (t.atamaTur === ATAMA.MODEL) return (t.modelSatirlari || []).map((s, i) => <div key={i} style={{ fontSize: 12 }}><b>{s.modelAd}</b> · {s.adet} adet × {tl2(s.birimMaliyet)}</div>);
    if (t.atamaTur === ATAMA.DAGITMA) return <span style={{ fontSize: 12 }}>Dağıtılmasın</span>;
    if (t.atamaTur === ATAMA.MAKINA) return <span style={{ fontSize: 12 }}>Makina</span>;
    return <span style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>Ortak</span>;
  };
  const sirali = [...giderTanimlari].sort((a, b) => (a.bitisAy && a.bitisAy < buAy ? 1 : 0) - (b.bitisAy && b.bitisAy < buAy ? 1 : 0) || String(a.ad).localeCompare(String(b.ad), "tr"));

  const dav = form ? davOf(form.turId) : null;
  return (
    <Section title="Tekrarlayan Giderler" icon="gider" wide>
      <div className="section-desc">
        Her ay tekrar eden giderler (kira, maaş, abonelik). Kalemler kendiliğinden oluşmaz; Giderler sekmesinde “tekrarlayan kalemleri oluştur” ile üretilir.
        Personel tutarı tanımda tutulmaz, kalem üretilirken çalışan kaydındaki resmi ve elden tutarlardan okunur.
      </div>
      {yonetebilir && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <Btn onClick={() => ac(null)}><Icon name="plus" size={14} /> Yeni Tanım</Btn>
          <Btn variant="ghost" onClick={tumCalisanlar}><Icon name="customers" size={14} /> Tüm çalışanlar için tanım oluştur{tanimsizCalisanlar.length ? ` (${tanimsizCalisanlar.length})` : ""}</Btn>
        </div>
      )}
      <div style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, overflowX: "auto" }}>
        {sirali.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--n500, #64748b)", fontSize: 13 }}>Henüz tekrarlayan tanım yok.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "var(--n100, #f8fafc)", textAlign: "left", fontSize: 11, color: "var(--n500, #64748b)", textTransform: "uppercase" }}>
              {["Tanım", "Tür", "Tedarikçi", "Tutar", "Başlangıç", "Bitiş", "Atama", "Üretilen aylar", ""].map(h => <th key={h} style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {sirali.map(t => {
                const d = davOf(t.turId);
                const u = t.uretilenAylar || [];
                const bitti = t.bitisAy && t.bitisAy < buAy;
                return (
                  <tr key={t.id} style={{ borderTop: "1px solid var(--n150, #f1f5f9)", opacity: bitti ? 0.7 : 1 }}>
                    <td style={{ padding: "10px 12px" }}><div style={{ fontWeight: 600 }}>{t.ad}</div>
                      {t.kapatildi && <div style={{ fontSize: 11, color: "var(--n500, #64748b)", marginTop: 3 }}>{u.length ? "Kapatıldı · çalışan silindi" : "Üretilmeden kapatıldı"}</div>}
                      {!t.kapatildi && t.baslangicAy > buAy && <div style={{ fontSize: 11, color: "var(--blu600, #2563eb)", marginTop: 3 }}>{t.baslangicAy} ayında başlar</div>}
                    </td>
                    <td style={{ padding: "10px 12px" }}><div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>{turMap.get(String(t.turId))?.ad || "(türsüz)"}<DavranisRozeti davranis={d} /></div></td>
                    <td style={{ padding: "10px 12px", fontSize: 12.5 }}>{d === DAVRANIS.PERSONEL ? <span style={{ color: "var(--n500, #64748b)" }}>—</span> : (tedAd(t.tedarikciId) || <span style={{ color: "var(--n500, #64748b)" }}>seçilmemiş</span>)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", whiteSpace: "nowrap" }}>{tutarHucre(t)}</td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{t.baslangicAy}</td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{t.bitisAy || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>{atamaHucre(t)}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12 }}>{u.length ? <>{u.slice(-3).join(", ")}{u.length > 3 ? ` +${u.length - 3}` : ""}</> : <span style={{ color: "var(--n500, #64748b)" }}>Henüz üretilmedi</span>}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                      {yonetebilir && <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <Btn small variant="ghost" onClick={() => ac(t)} title="Düzenle"><Icon name="edit" size={12} /></Btn>
                        <Btn small variant="danger" onClick={() => setSilinecek(t)} title="Sil"><Icon name="trash" size={12} /></Btn>
                      </div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <Ipucu>“Üretilen aylar” salt görünürdür. Bir ayın kalemi silinse bile o ay listede kalır ve o tanımdan yeniden üretilmez.</Ipucu>

      {form && (
        <Modal title={form.id == null ? "Yeni Tekrarlayan Tanım" : "Tekrarlayan Tanımı Düzenle"} onClose={() => setForm(null)} maxWidth={640}
          footer={<><Btn variant="ghost" onClick={() => setForm(null)}>İptal</Btn><Btn onClick={kaydet}><Icon name="check" size={14} /> Kaydet</Btn></>}>
          <Field label="Gider türü *">
            <Select value={form.turId} onChange={e => set({ turId: e.target.value })}>
              <option value="">Tür seçin</option>
              {giderTurleri.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
            </Select>
            <HataMetni>{hatalar.turId}</HataMetni>
          </Field>
          {dav === DAVRANIS.PERSONEL ? (
            <Field label="Çalışan *">
              <Select value={form.calisanId} onChange={e => { const c = calisanlar.find(x => String(x.id) === e.target.value); set({ calisanId: e.target.value, ad: form.ad || c?.ad || "" }); }}>
                <option value="">Çalışan seçin</option>
                {calisanlar.map(c => <option key={c.id} value={c.id}>{c.ad}</option>)}
              </Select>
              <HataMetni>{hatalar.calisanId}</HataMetni>
              <Ipucu>Tutar tanımda tutulmaz; kalem üretilirken çalışan kaydındaki resmi ve elden tutarlar okunur.</Ipucu>
            </Field>
          ) : null}
          <Field label={dav === DAVRANIS.PERSONEL ? "Tanım adı" : "Tanım adı *"}>
            <Input value={form.ad} onChange={e => set({ ad: e.target.value })} placeholder="Örn. Fabrika binası kirası" />
            <HataMetni>{hatalar.ad}</HataMetni>
          </Field>
          {dav !== DAVRANIS.PERSONEL && (
            <>
              {dav === DAVRANIS.KIRA && (
                <Field label="Hangi tutarı giriyorsunuz?">
                  <Segment ariaLabel="Giriş yönü" options={[{ value: "brut", label: "Brüt kira" }, { value: "net", label: "Net ödenen kira" }]} value={form.girisYonu} onChange={v => set({ girisYonu: v })} />
                  <Ipucu>Stopaj ve KDV varsayılanı kalem üretilirken o anki ayardan alınır.</Ipucu>
                </Field>
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><Field label="Tutar (KDV hariç) *"><TutarInput ariaLabel="Tutar" value={form.tutar} onChange={v => set({ tutar: v })} invalid={!!hatalar.tutar} /><HataMetni>{hatalar.tutar}</HataMetni></Field></div>
                <div style={{ width: 150 }}><Field label="KDV oranı"><TutarInput sym="%" ariaLabel="KDV oranı" placeholder="tarihe göre" value={form.kdvOrani} onChange={v => set({ kdvOrani: v })} /><HataMetni>{hatalar.kdvOrani}</HataMetni></Field></div>
              </div>
              <Field label="Tedarikçi">
                <Select value={form.tedarikciId} onChange={e => set({ tedarikciId: e.target.value })}>
                  <option value="">Seçilmemiş</option>
                  {tedarikciler.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
                </Select>
                <Ipucu>Üretilen her kaleme kopyalanır. Tedarikçiler Giderler sekmesinde yönetilir.</Ipucu>
              </Field>
            </>
          )}
          <Field label="Ödeme yöntemi">
            <Segment ariaLabel="Ödeme yöntemi" options={ODEME_SECENEKLERI} value={form.odemeYontemi} onChange={v => set({ odemeYontemi: v })} />
          </Field>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><Field label="Başlangıç ayı *"><AyInput ariaLabel="Başlangıç ayı" value={form.baslangicAy} onChange={v => set({ baslangicAy: v })} /><HataMetni>{hatalar.baslangicAy}</HataMetni></Field></div>
            <div style={{ flex: 1 }}><Field label="Bitiş ayı"><AyInput ariaLabel="Bitiş ayı" value={form.bitisAy} onChange={v => set({ bitisAy: v })} /><HataMetni>{hatalar.bitisAy}</HataMetni><Ipucu>Opsiyonel, boşsa süresiz.</Ipucu></Field></div>
          </div>
          {dav === DAVRANIS.NORMAL && (
            <Field label="Makina maliyeti ataması">
              <AtamaAlani value={form} onChange={p => set(p)} stock={stock} customers={customers} modeller={modeller} tutar={form.tutar} />
              <HataMetni>{hatalar.atama}</HataMetni>
            </Field>
          )}
          {(form.uretilenAylar || []).length > 0 && <Ipucu>Bu tanımdan üretilen aylar: {form.uretilenAylar.join(", ")}. Tanımı değiştirmek üretilmiş kalemleri değiştirmez.</Ipucu>}
        </Modal>
      )}
      {silinecek && (
        <ConfirmDialog title="Tanım silinsin mi?" message={`“${silinecek.ad}” tanımı kalıcı olarak silinecek (çöp kutusuna düşmez). Bu tanımdan daha önce üretilmiş kalemler silinmez.`}
          onConfirm={sil} onCancel={() => setSilinecek(null)} />
      )}
    </Section>
  );
};
