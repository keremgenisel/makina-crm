import { useState } from "react";
import { uid, today, getKdvRateForDate } from "../../lib/utils";
import { turHaritasi, tutarCoz, modelSatirlariDogrula, ATAMA, DAVRANIS, ayOf, KDV_YONU, kdvYonuOf, kdvYonuSecilebilirMi, girilenHaric, sifirTutarSerbestMi, dagitimAySayisiCoz, dagitimSecilebilirMi, kdvliMi, tedarikciSecilirMi, kurumTarafAdi,
  tevkifatliMi, tevkifatDogrula, TEVKIFAT_ORANLARI, tevkifatOranEtiketi } from "../../lib/gider";
import { logAction } from "../../lib/audit";
import { Icon, Field, Input, Select, Btn, Modal, ConfirmDialog } from "../ui";
import { KartBolum } from "../tasarim";
import { TutarInput, AyInput, AtamaAlani, DagitimAlani, DavranisRozeti, tl2, tutarMetni } from "../gider/GiderAlanlari";
import { Segment, HataMetni, Ipucu } from "../tasarim";
import { KALICI_SILME_NOTU } from "../../lib/copKutusu";

// Tekrarlayan gider tanımları (spec 0001 R3/R4, plan K2/K8/K9/K17/K28/K36). Kalemler yalnız Giderler
// sekmesindeki "tekrarlayan kalemleri oluştur" ile üretilir. uretilenAylar salt görünür: bir ayın kalemi
// silinse bile o ay listede kalır ve yeniden üretilmez. Tanım silme kalıcıdır (R12).
const bosForm = (buAy) => ({ id: null, turId: "", ad: "", calisanId: "", girisYonu: "brut", kdvYonu: KDV_YONU.HARIC, tutar: "", kdvOrani: "", tedarikciId: "", odemeYontemi: "", baslangicAy: buAy, bitisAy: null, atamaTur: "", makinaTur: null, makinaId: null, modelSatirlari: [], uretilenAylar: [], dagitimAy: "", tevkifatli: false, tevkifatPay: "", tevkifatPayda: "" }); // spec 0075 R26

export const SettingsGiderTanimlari = ({
  giderTanimlari = [], setGiderTanimlari, giderTurleri = [], tedarikciler = [], calisanlar = [],
  stock = [], customers = [], modeller = [], showToast = () => {}, canDo = () => true, serverPermissions, kdvRates,
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
    setForm(t ? { ...bosForm(buAy), ...t, kdvYonu: kdvYonuOf(t), tutar: tutarMetni(t.tutar), kdvOrani: tutarMetni(t.kdvOrani), turId: String(t.turId ?? ""), calisanId: String(t.calisanId ?? ""), tedarikciId: String(t.tedarikciId ?? ""),
      modelSatirlari: (t.modelSatirlari || []).map(s => ({ ...s, birimMaliyet: tutarMetni(s.birimMaliyet), adet: String(s.adet ?? "") })) } : bosForm(buAy));
  };
  const set = (patch) => setForm(f => ({ ...f, ...patch }));
  // Spec 0071 R25 (Q5, triyaj): model dağılımının sınırı KDV hariç tutardır; kayıt doğrulaması ve atama önizlemesi AYNI değeri
  // kullanır (oran "tarihe göre" ise bugünün oranı).
  const modelTabani = (f, tutarDeger) => {
    const d = davOf(f.turId);
    const yon = d === DAVRANIS.PERSONEL || !kdvYonuSecilebilirMi(d, f.girisYonu) ? KDV_YONU.HARIC : kdvYonuOf(f);
    const k = tutarCoz(f.kdvOrani);
    return girilenHaric(tutarDeger, yon, k.bos || k.gecersiz ? getKdvRateForDate(today(), kdvRates) : k.deger);
  };

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
      // Spec 0071 R9, R24 (B-6): sıfır (ve boş) yalnız normal davranışta; tutar her ay kalemde girilir. Kira ve personel değişmez.
      else if (sifirTutarSerbestMi(dav) && (t.bos || t.deger === 0)) tutar = 0;
      else if (t.bos || t.deger <= 0) h.tutar = "Tutar sıfırdan büyük olmalı.";
      else tutar = t.deger;
    }
    // R7, R6 (Q1): tanım girilen tutarı saklar; dâhil yalnız normal ve brüt kirada.
    // Spec 0074 R6, R33: KDV ve tedarikçi tek kapılardan (personel ve SGK'da yok).
    const kdvYonu = !kdvliMi(dav) ? null : (kdvYonuSecilebilirMi(dav, form.girisYonu) ? kdvYonuOf(form) : KDV_YONU.HARIC);
    const k = tutarCoz(form.kdvOrani);
    if (kdvliMi(dav) && !k.bos && (k.gecersiz || k.deger < 0 || k.deger > 100)) h.kdvOrani = "KDV oranı 0 ile 100 arasında olmalı.";
    // Bilinçli: tanımda atama yalnız normal davranışta (spec 0020 X5). Personel tanımına atama açılırsa her ayın maaşı
    // aynı makinaya yüklenirdi; kalem formundaki atanabilirMi kapısı buraya taşınmaz (AC-16).
    const atamaVar = dav === DAVRANIS.NORMAL;
    if (atamaVar && form.atamaTur === ATAMA.MAKINA && form.makinaId == null) h.atama = "Makina seçilmedi.";
    if (atamaVar && form.atamaTur === ATAMA.MODEL) {
      // R25 (Q5): sınır KDV hariç tutardır (oran "tarihe göre" ise bugünün oranı); sıfır tanımda model dağılımı yok.
      const d = modelSatirlariDogrula(modelTabani(form, tutar ?? 0), form.modelSatirlari);
      if (tutar === 0) h.atama = "Tutarı sonra girilecek tanımda model dağılımı yapılamaz.";
      else if (!form.modelSatirlari.length) h.atama = "En az bir model satırı girin.";
      else if (d.hatalar.length) h.atama = d.hatalar[0].mesaj;
    }
    // Spec 0072 R4, R5, R17: dağıtım ay sayısı (taksit emsali); makina ve "dağıtılmasın" atamasında saklanmaz.
    const atamaSon = atamaVar ? (form.atamaTur || "") : "";
    const dg = dagitimAySayisiCoz(form.dagitimAy);
    if (dg.hata && dagitimSecilebilirMi(atamaSon)) h.dagitimAy = dg.hata;
    // Spec 0075 R26, R39 (S4, S5): tanımda yalnız kutu ve oran; kural kalemle aynı saf fonksiyon. Boş KDV oranı "tarihe göre"dir.
    const tv = tevkifatDogrula(form, dav, { kdvBosSerbest: true });
    for (const x of tv.hatalar) if (!h[x.alan]) h[x.alan] = x.mesaj;
    setHatalar(h);
    if (Object.keys(h).length) return;
    const calisan = calisanlar.find(c => String(c.id) === String(form.calisanId));
    const numId = (v) => (v === "" || v == null ? null : (/^\d+$/.test(String(v)) ? Number(v) : v));
    const kayit = {
      id: form.id ?? uid(), turId: numId(form.turId), ad: String(form.ad || "").trim() || calisan?.ad || "",
      tutar: dav === DAVRANIS.PERSONEL ? null : tutar,
      kdvOrani: !kdvliMi(dav) || k.bos ? null : k.deger,
      girisYonu: dav === DAVRANIS.KIRA ? form.girisYonu : null,
      kdvYonu,
      calisanId: dav === DAVRANIS.PERSONEL ? numId(form.calisanId) : null,
      tedarikciId: tedarikciSecilirMi(dav) ? numId(form.tedarikciId) : null,
      odemeYontemi: form.odemeYontemi || "",
      baslangicAy: form.baslangicAy, bitisAy: form.bitisAy || null,
      atamaTur: atamaVar ? (form.atamaTur || "") : "",
      makinaTur: atamaVar && form.atamaTur === ATAMA.MAKINA ? form.makinaTur : null,
      makinaId: atamaVar && form.atamaTur === ATAMA.MAKINA ? form.makinaId : null,
      modelSatirlari: atamaVar && form.atamaTur === ATAMA.MODEL ? form.modelSatirlari.map(s => ({ modelAd: s.modelAd, birimMaliyet: tutarCoz(s.birimMaliyet).deger, adet: Number(s.adet) })) : [],
      uretilenAylar: form.uretilenAylar || [], kapatildi: form.kapatildi && !!form.bitisAy,
    };
    if (!dg.hata && dg.deger > 1 && dagitimSecilebilirMi(atamaSon)) kayit.dagitimAy = dg.deger; // R19 (S4): 1 ya da boş saklanmaz
    if (tv.alanlar) Object.assign(kayit, tv.alanlar); // spec 0075 R10 (S6): kapalıyken alan hiç yazılmaz
    const yeni = form.id == null;
    setGiderTanimlari(p => (yeni ? [...p, kayit] : p.map(t => (t.id === kayit.id ? kayit : t))));
    logAction({ serverPermissions, action: yeni ? "olusturuldu" : "duzenlendi", entity: "gider_tanim", entityId: kayit.id, entityName: kayit.ad });
    setForm(null);
    showToast(yeni ? "Tekrarlayan tanım eklendi." : "Tekrarlayan tanım güncellendi.");
  };

  const tumCalisanlar = () => {
    if (!personelTuru) { showToast("Önce Gider Türleri'nde Personel davranışlı bir tür tanımlayın.", "err"); return; }
    const yeni = tanimsizCalisanlar.map(c => ({ id: uid(), turId: personelTuru.id, ad: c.ad, calisanId: c.id, tutar: null, kdvOrani: null, girisYonu: null, kdvYonu: null, tedarikciId: null, odemeYontemi: "", baslangicAy: buAy, bitisAy: null, atamaTur: "", makinaTur: null, makinaId: null, modelSatirlari: [], uretilenAylar: [], kapatildi: false }));
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
    // Spec 0071 R7, AC-10: kira satırının "Brüt girildi" emsali; alanı olmayan eski tanım hariç girilmiştir (R27).
    return <><b style={{ whiteSpace: "nowrap" }}>{tl2(t.tutar)}</b><div style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>{dav === DAVRANIS.KIRA ? (t.girisYonu === "net" ? "Net girildi" : "Brüt girildi") : (!kdvliMi(dav) ? "KDV yok" : t.kdvOrani == null ? "KDV tarihe göre" : `KDV %${t.kdvOrani}`)}</div>
      {/* Spec 0074 R6: KDV'siz davranışta (SGK) yön yoktur; "KDV yok" ile çelişen "KDV hariç girildi" yazılmaz. */}
      {kdvliMi(dav) && <div data-testid="tanim-kdv-yonu" style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>{kdvYonuOf(t) === KDV_YONU.DAHIL ? "KDV dâhil girildi" : "KDV hariç girildi"}</div>}
      {/* Spec 0075 R43 (S12): tevkifatlı tanım listede görünür (yoksa hiçbir yerde görünmezdi). */}
      {tevkifatliMi(dav) && t.tevkifatli && <div data-testid="tanim-tevkifat" style={{ fontSize: 11, color: "var(--amb700, #b45309)" }}>Tevkifat {tevkifatOranEtiketi({ pay: t.tevkifatPay, payda: t.tevkifatPayda })}</div>}</>;
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
    <KartBolum title="Tekrarlayan Giderler" icon="gider" wide>
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
              {/* Spec 0030 R8/R10: başlıklar sarar; başlangıç ile bitiş tek sütun; "üretilen aylar" sayıya iner (tam liste ipucunda). */}
              {["Tanım", "Tür", "Tedarikçi", "Tutar", "Başlangıç – Bitiş", "Atama", "Üretilen aylar", ""].map(h => <th key={h} style={{ padding: "9px 6px", verticalAlign: "bottom" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {sirali.map(t => {
                const d = davOf(t.turId);
                const u = t.uretilenAylar || [];
                const bitti = t.bitisAy && t.bitisAy < buAy;
                return (
                  <tr key={t.id} style={{ borderTop: "1px solid var(--n150, #f1f5f9)", opacity: bitti ? 0.7 : 1 }}>
                    <td style={{ padding: "10px 6px" }}><div style={{ fontWeight: 600 }}>{t.ad}</div>
                      {t.kapatildi && <div style={{ fontSize: 11, color: "var(--n500, #64748b)", marginTop: 3 }}>{u.length ? "Kapatıldı · çalışan silindi" : "Üretilmeden kapatıldı"}</div>}
                      {!t.kapatildi && t.baslangicAy > buAy && <div style={{ fontSize: 11, color: "var(--blu600, #2563eb)", marginTop: 3 }}>{t.baslangicAy} ayında başlar</div>}
                    </td>
                    <td style={{ padding: "10px 6px" }}><div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>{turMap.get(String(t.turId))?.ad || "(türsüz)"}<DavranisRozeti davranis={d} /></div></td>
                    <td style={{ padding: "10px 6px", fontSize: 12.5 }}>{d === DAVRANIS.PERSONEL ? <span style={{ color: "var(--n500, #64748b)" }}>—</span> : (kurumTarafAdi(d) || tedAd(t.tedarikciId) || <span style={{ color: "var(--n500, #64748b)" }}>seçilmemiş</span>)}</td>
                    <td style={{ padding: "10px 6px", textAlign: "right" }}>{tutarHucre(t)}</td>
                    <td style={{ padding: "10px 6px", whiteSpace: "nowrap" }}>{t.baslangicAy}<div style={{ color: "var(--n500, #64748b)" }}>– {t.bitisAy || "—"}</div></td>
                    <td style={{ padding: "10px 6px" }}>{atamaHucre(t)}</td>
                    <td style={{ padding: "10px 6px", fontSize: 12 }}>{u.length ? <span title={u.join(", ")} style={{ whiteSpace: "nowrap", cursor: "help", borderBottom: "1px dotted var(--n400, #94a3b8)" }}>{u.length} ay</span> : <span style={{ color: "var(--n500, #64748b)" }}>Henüz üretilmedi</span>}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", whiteSpace: "nowrap" }}>
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
            <Select value={form.turId} onChange={e => set({ turId: e.target.value,
              // Spec 0072 (S3): atama yalnız normal davranışta kaydedilir; tür değişince eski atama dağıtım alanını yanlışlıkla pasif bırakmasın.
              ...(davOf(e.target.value) !== DAVRANIS.NORMAL ? { atamaTur: "", makinaTur: null, makinaId: null, modelSatirlari: [] } : {}) })}>
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
              {kdvYonuSecilebilirMi(dav, form.girisYonu) ? (
                <Field label="Tutar KDV hariç mi, dâhil mi?">
                  <Segment ariaLabel="KDV yönü" options={[{ value: KDV_YONU.HARIC, label: "KDV hariç" }, { value: KDV_YONU.DAHIL, label: "KDV dâhil" }]} value={kdvYonuOf(form)} onChange={v => set({ kdvYonu: v })} />
                  <Ipucu>Dâhil girilen tutar her ay o ayın KDV oranıyla ayrılarak kaleme yazılır.{tutarCoz(form.kdvOrani).deger === 0 && !tutarCoz(form.kdvOrani).bos ? " KDV oranı sıfır olduğu için dâhil ve hariç aynı tutarı verir." : ""}</Ipucu>
                </Field>
              ) : dav === DAVRANIS.KIRA ? <Ipucu>Net ödenen kira KDV hariç girilir; KDV dâhil seçimi yalnız brüt kira girişinde vardır.</Ipucu> : null}
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><Field label={!kdvliMi(dav) ? "Tutar" : `Tutar (KDV ${kdvYonuSecilebilirMi(dav, form.girisYonu) && kdvYonuOf(form) === KDV_YONU.DAHIL ? "dâhil" : "hariç"})${dav === DAVRANIS.KIRA ? " *" : ""}`}><TutarInput ariaLabel="Tutar" value={form.tutar} onChange={v => set({ tutar: v })} invalid={!!hatalar.tutar} /><HataMetni>{hatalar.tutar}</HataMetni>
                  {sifirTutarSerbestMi(dav) && <Ipucu>Her ay değişen giderde (elektrik, su, SGK) boş ya da sıfır bırakın; tutar fatura ya da bildirge gelince kalemde girilir.</Ipucu>}</Field></div>
                {kdvliMi(dav) && <div style={{ width: 150 }}><Field label="KDV oranı"><TutarInput sym="%" ariaLabel="KDV oranı" placeholder="tarihe göre" value={form.kdvOrani} onChange={v => set({ kdvOrani: v })} /><HataMetni>{hatalar.kdvOrani}</HataMetni></Field></div>}
              </div>
              {/* Spec 0075 R26 (S4): tanımda yalnız onay kutusu ve oran; taksit ve vade üretilen kalemde girilir. */}
              {tevkifatliMi(dav) && (
                <div data-testid="tanim-tevkifat-alani" style={{ marginBottom: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" aria-label="Bu fatura tevkifatlı" checked={!!form.tevkifatli}
                      onChange={e => set(e.target.checked ? { tevkifatli: true } : { tevkifatli: false, tevkifatPay: "", tevkifatPayda: "" })}
                      style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--brand, #e85d1a)" }} />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Bu fatura tevkifatlı</span>
                  </label>
                  {form.tevkifatli && (
                    <Field label="Tevkifat oranı *">
                      <Select aria-label="Tevkifat oranı" value={form.tevkifatPay && form.tevkifatPayda ? `${form.tevkifatPay}/${form.tevkifatPayda}` : ""}
                        onChange={e => { const [p, d] = e.target.value.split("/"); set({ tevkifatPay: p ? Number(p) : "", tevkifatPayda: d ? Number(d) : "" }); }}>
                        <option value="">Faturadaki oranı seçin</option>
                        {TEVKIFAT_ORANLARI.map(o => <option key={tevkifatOranEtiketi(o)} value={tevkifatOranEtiketi(o)}>{tevkifatOranEtiketi(o)}</option>)}
                      </Select>
                      <HataMetni>{hatalar.tevkifatPay}</HataMetni>
                      <Ipucu>Üretilen her kaleme kopyalanır; tevkifatın vadesini kalemde girin.</Ipucu>
                    </Field>
                  )}
                </div>
              )}
              {tedarikciSecilirMi(dav) && <Field label="Tedarikçi">
                <Select value={form.tedarikciId} onChange={e => set({ tedarikciId: e.target.value })}>
                  <option value="">Seçilmemiş</option>
                  {tedarikciler.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
                </Select>
                <Ipucu>Üretilen her kaleme kopyalanır. Tedarikçiler Giderler sekmesinde yönetilir.</Ipucu>
              </Field>}
            </>
          )}
          {/* Spec 0053 R1, R26: "Varsayılan ödeme yöntemi" kalktı; tanımın eski değeri kayıtta korunur, üretimde kopyalanmaz. */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><Field label="Başlangıç ayı *"><AyInput ariaLabel="Başlangıç ayı" value={form.baslangicAy} onChange={v => set({ baslangicAy: v })} /><HataMetni>{hatalar.baslangicAy}</HataMetni></Field></div>
            <div style={{ flex: 1 }}><Field label="Bitiş ayı"><AyInput ariaLabel="Bitiş ayı" value={form.bitisAy} onChange={v => set({ bitisAy: v })} /><HataMetni>{hatalar.bitisAy}</HataMetni><Ipucu>Opsiyonel, boşsa süresiz.</Ipucu></Field></div>
          </div>
          {/* spec 0020 X5: tanımda atama yalnız normal davranışta, personelde kapalı (bkz. yukarıdaki doğrulama notu). */}
          {dav === DAVRANIS.NORMAL && (
            <Field label="Makina maliyeti ataması">
              <AtamaAlani value={form} onChange={p => set(p)} stock={stock} customers={customers} modeller={modeller} tutar={modelTabani(form, tutarCoz(form.tutar).deger || 0)} />
              <HataMetni>{hatalar.atama}</HataMetni>
            </Field>
          )}
          <DagitimAlani value={form.dagitimAy} onChange={v => set({ dagitimAy: v })} atamaTur={form.atamaTur || ""} hata={hatalar.dagitimAy} tanim />
          {(form.uretilenAylar || []).length > 0 && <Ipucu>Bu tanımdan üretilen aylar: {form.uretilenAylar.join(", ")}. Tanımı değiştirmek üretilmiş kalemleri değiştirmez.</Ipucu>}
        </Modal>
      )}
      {silinecek && (
        <ConfirmDialog title="Tanım silinsin mi?" message={`“${silinecek.ad}” tanımı silinecek. ${KALICI_SILME_NOTU} Bu tanımdan daha önce üretilmiş kalemler silinmez.`}
          onConfirm={sil} onCancel={() => setSilinecek(null)} />
      )}
    </KartBolum>
  );
};
