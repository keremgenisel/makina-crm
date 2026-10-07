import { useState, useMemo, useEffect } from "react";
import { today, getKdvRateForDate, yerelBugun } from "../lib/utils";
import { turHaritasi, giderKalemDogrula, kiraHesapla, tutarCoz, personelMukerrer, DAVRANIS, ayOf, atanabilirMi, odemeSatirlariKur, satirliMi, HEDEF, personelBolunmezMi, PERSONEL_BOLUNMEZ_NEDENI, odemeleriUygula,
  kdvAyir, kdvYonuOf, kdvYonuSecilebilirMi, girilenHaric, kalemKdv, KDV_YONU, kurus, tl, kdvliMi, tedarikciSecilirMi, sgkDavranisiMi, calisanSgkToplami, SGK_TOPLAM_YOK_NEDENI,
  tevkifatliMi, TEVKIFAT_ORANLARI, tevkifatOranEtiketi, kalemTevkifat, odenecekTutar } from "../lib/gider";
import { Icon, Field, Input, Select, Btn, Modal } from "./ui";
import { secilebilirHesaplar, sonKullanilanHesap, sonKullanilanYontem, avansBorcuK, mahsupKapsamda } from "../lib/kasa";
import { formOdemeHedefleri, odemeGirisiHazirla, ciroCekleri, ciroAlacaklisi, duzenlemeOdemeDurumu } from "../lib/formOdemesi";
import { CIRO_YONTEMI } from "../lib/cek";
import { OdemeGirisi, MAHSUP_KILITLI_HATASI } from "./gider/OdemeGirisi";
import { TutarInput, AtamaAlani, DagitimAlani, DavranisRozeti, tl2, tutarMetni, OdemeSatirlari, STOPAJ_KDV_NOTU, STOPAJ_AYRI_KALEM_NOTU, TEVKIFAT_AYRI_KALEM_NOTU, TEVKIFAT_KDV_DAHIL_NOTU, TEVKIFAT_ALT_SINIR_NOTU, EkOdemeSatirlari, hedefAdi, hedefBasligi, cokHedefliMi } from "./gider/GiderAlanlari";
import { Segment, HataMetni, Ipucu, KartBolum, UyariSeridi } from "./tasarim";

// Gider kalemi formu (spec 0001 R1, R5, R6, R14, R18, R20, R21; plan K14, K18, K19, K24, K25, K29, K38).
// Tek form: ekle ve düzenle. Tür davranışı alanları açar: kira → brüt/net yön, stopaj, hesap özeti;
// personel → çalışan, resmi + elden (KDV ve tedarikçi yok, C19 notu, mükerrer uyarısı). Atama kira dışında
// açıktır (spec 0020); personelde dağıtım tabanı resmi + elden. Doğrulama ve normalleştirme saf motordadır (giderKalemDogrula).
const numId = (v) => (v === "" || v == null ? null : (/^\d+$/.test(String(v)) ? Number(v) : v));
const idMetni = (v) => (v == null ? "" : String(v));
// Spec 0074 R24, C2: personel formundaki kalıcı not. SGK ayrı bir gider türüdür, kendi kalemiyle ödenir; personel tutarı SGK içermez.
export const PERSONEL_SGK_NOTU = "SGK bu kaleme girmez: aylık SGK'yı SGK türünde ayrı bir gider kalemi olarak girin ve o kalemden ödeyin. Maaş transferini de ayrıca gider olarak girmeyin; aynı para iki kez sayılır.";

const formdanKalem = (k, { giderAyarlari, kdvRates }) => {
  if (!k) {
    const tarih = today();
    return { id: null, tarih, turId: "", aciklama: "", tedarikciId: "", tutar: "", netTutar: "", girisYonu: "brut",
      kdvOrani: tutarMetni(getKdvRateForDate(tarih, kdvRates)), stopajOrani: tutarMetni(giderAyarlari?.stopajOrani ?? 20),
      calisanId: "", resmiTutar: "", eldenTutar: "", yolParasi: "", odemeYontemi: "", sonOdemeTarihi: "", odendi: false, odemeTarihi: "",
      atamaTur: "", makinaTur: null, makinaId: null, modelSatirlari: [], tanimId: null, donem: null, _kdvElle: false, kdvYonu: KDV_YONU.HARIC,
      taksitSayisi: "1", stopajTaksitSayisi: "1", stopajVade: "", eldenVade: "", taksitler: [], ekOdemeler: [], dagitimAy: "",
      tevkifatli: false, tevkifatPay: "", tevkifatPayda: "", tevkifatTaksitSayisi: "1", tevkifatVade: "" }; // spec 0075 R1
  }
  // Spec 0021: plan alanları satırlardan geri kurulur. Satırı olan kalemde vade alanı ilk taksitin vadesidir.
  const hedefSat = (h) => (k.taksitler || []).filter(r => (r.hedef || HEDEF.ANA) === h).sort((a, b) => (a.sira || 0) - (b.sira || 0));
  const ana = hedefSat(HEDEF.ANA), stp = hedefSat(HEDEF.STOPAJ), eld = hedefSat(HEDEF.ELDEN), tvs = hedefSat(HEDEF.TEVKIFAT);
  // Spec 0071 R5, R27: dâhil girilmiş kalemde tutar alanı hariç tutar + KDV ile yeniden kurulur (dâhil tutar saklanmaz);
  // alanı olmayan eski kalem hariç açılır.
  const dahil = kdvYonuOf(k) === KDV_YONU.DAHIL;
  return { ...k, turId: idMetni(k.turId), tedarikciId: idMetni(k.tedarikciId), calisanId: idMetni(k.calisanId), kdvYonu: kdvYonuOf(k),
    tutar: dahil ? tutarMetni(tl(kurus(k.tutar) + kurus(kalemKdv(k)))) : tutarMetni(k.tutar), netTutar: tutarMetni(k.netTutar), kdvOrani: tutarMetni(k.kdvOrani),
    stopajOrani: tutarMetni(k.stopajOrani ?? giderAyarlari?.stopajOrani ?? 20), resmiTutar: tutarMetni(k.resmiTutar), eldenTutar: tutarMetni(k.eldenTutar),
    yolParasi: tutarMetni(k.yolParasi), // spec 0074 R26: kalemdeki eski SGK tutarı olduğu gibi kalır (formda alan yok)
    sonOdemeTarihi: (ana.length ? ana[0].vade : k.sonOdemeTarihi) || "", odemeTarihi: k.odemeTarihi || "", odemeYontemi: k.odemeYontemi || "", girisYonu: k.girisYonu || "brut",
    modelSatirlari: (k.modelSatirlari || []).map(s => ({ ...s, birimMaliyet: tutarMetni(s.birimMaliyet), adet: String(s.adet ?? "") })), _kdvElle: true,
    ekOdemeler: (k.ekOdemeler || []).map(e => ({ ...e, aciklama: e.aciklama || "", resmiTutar: tutarMetni(e.resmiTutar), eldenTutar: tutarMetni(e.eldenTutar) })),
    taksitler: k.taksitler || [], taksitSayisi: String(ana.length || 1), stopajTaksitSayisi: String(stp.length || 1), stopajVade: stp[0]?.vade || "", eldenVade: eld[0]?.vade || "",
    dagitimAy: k.dagitimAy ? String(k.dagitimAy) : "", // spec 0072 R19
    // Spec 0075 R18 (B-2, AC-45): tevkifat taksit sayısı ve vadesi kendi satırlarından geri kurulur (sütun yok).
    tevkifatli: !!k.tevkifatli, tevkifatPay: k.tevkifatli ? k.tevkifatPay : "", tevkifatPayda: k.tevkifatli ? k.tevkifatPayda : "",
    tevkifatTaksitSayisi: String(tvs.length || 1), tevkifatVade: tvs[0]?.vade || "" };
};

export const GiderForm = ({ kalem, giderTurleri = [], tedarikciler = [], calisanlar = [], stock = [], customers = [], modeller = [],
  giderler = [], giderAyarlari = {}, kdvRates, odemeDegistirebilir = true, onSave, onCancel,
  // Spec 0046 + 0053 R15: yeni kalemde ve düzenlemede hedef bazlı ödeme (hesap yalnız kasa yetkisiyle); çek yöntemleri yalnız
  // kasa yetkisi ve çek yazıcısıyla (R14).
  hesaplar = [], hareketler = [], hesapSecimi = false, cekler = [], payments = [], ciroYetkisi = false,
  // Spec 0048 Q7: hareket bölümü var mı (0024 öncesi sunucuda yok). Yoksa düzenleme kutusu saklı ödeme durumuyla çizilir.
  hareketBolumu = false }) => {
  const [form, setForm] = useState(() => formdanKalem(kalem, { giderAyarlari, kdvRates }));
  // Spec 0046 Q7 triyajı: düzenleme açıkken ödeme penceresinden girilen ödeme canlı kalemin taksit satırlarına yansır.
  // Form ödeme durumunu (satırlar, satırsızda türetilmiş odendi/_odenen) canlı kalemden izler; yoksa kayıt açılıştaki eski
  // satırlarla yapılır ve "ödenmiş taksit korunur" kuralı (0021 R10, 0024 R18) atlanırdı. Kullanıcının düzenlediği alanlara dokunulmaz.
  useEffect(() => {
    if (!kalem || kalem.id == null) return;
    setForm(f => ({ ...f, taksitler: kalem.taksitler || [], odendi: kalem.odendi, odemeTarihi: kalem.odemeTarihi || "", _odenen: kalem._odenen }));
  }, [kalem?.id, kalem?.taksitler, kalem?.odendi, kalem?.odemeTarihi, kalem?._odenen]);
  const varsayilanHesap = hesapSecimi ? (sonKullanilanHesap(hareketler, hesaplar) ?? "") : "";
  // Spec 0053: ödeme girişi (OdemeGirisi) ve formda silinmek üzere işaretlenen kayıtlı ödemeler (Kaydet'e kadar bekler, plan Q4).
  const [giris, setGiris] = useState(() => ({ tarih: today(), kip: "odeme", satirlar: [], mahsup: { tutar: "", aciklama: "" }, alacakliAd: "" }));
  const [silinenler, setSilinenler] = useState(() => new Set());
  const [odemeHatalari, setOdemeHatalari] = useState(null);
  const varsayilanYontem = sonKullanilanYontem(hareketler);
  const kalanHareketler = useMemo(() => (silinenler.size ? hareketler.filter(h => !silinenler.has(String(h.id))) : hareketler), [hareketler, silinenler]);
  const uygunHesaplar = useMemo(() => secilebilirHesaplar(hesaplar, "TRY"), [hesaplar]);
  const [hatalar, setHatalar] = useState([]);
  const turMap = useMemo(() => turHaritasi(giderTurleri), [giderTurleri]);
  const tur = turMap.get(String(form.turId));
  const dav = tur?.davranis || DAVRANIS.NORMAL;
  const set = (patch) => setForm(f => ({ ...f, ...patch }));
  const hata = (alan) => hatalar.find(h => h.alan === alan)?.mesaj;

  const turDegis = (turId) => {
    const yeniDav = turMap.get(String(turId))?.davranis || DAVRANIS.NORMAL;
    set({ turId, ...(!atanabilirMi(yeniDav) ? { atamaTur: "", makinaTur: null, makinaId: null, modelSatirlari: [] } : {}) });
  };
  const tarihDegis = (tarih) => set({ tarih, ...(form._kdvElle ? {} : { kdvOrani: tutarMetni(getKdvRateForDate(tarih, kdvRates)) }) });
  // AC-37 / AC-54 (K14): çalışan seçilince bileşenler YALNIZ boş alana ön doldurulur; tanımsızsa boş kalır.
  const calisanSec = (calisanId) => {
    const c = calisanlar.find(x => String(x.id) === String(calisanId));
    set({
      calisanId,
      resmiTutar: form.resmiTutar !== "" ? form.resmiTutar : tutarMetni(c?.resmiMaliyet),
      eldenTutar: form.eldenTutar !== "" ? form.eldenTutar : tutarMetni(c?.eldenMaliyet),
      // Spec 0070 R5: yol parası da çalışan kartından, yalnız boş alana (spec 0074 R16: SGK personel kalemine girmez).
      yolParasi: form.yolParasi ? form.yolParasi : tutarMetni(c?.yolParasiMaliyet),
    });
  };

  const mukerrer = dav === DAVRANIS.PERSONEL ? personelMukerrer(giderler, { calisanId: form.calisanId, tarih: form.tarih, id: form.id }) : [];
  const secilenCalisan = calisanlar.find(x => String(x.id) === String(form.calisanId));
  // Spec 0074 R16 (AC-39): kalemi dolduran üç alan da boşsa (yalnız SGK'sı girilmiş çalışan "maliyeti tanımlı" sayılmaz).
  const calisanMaliyetsiz = secilenCalisan && ["resmiMaliyet", "eldenMaliyet", "yolParasiMaliyet"].every(a => tutarCoz(secilenCalisan[a]).bos);
  // Spec 0074 R14 (AC-15, AC-46): SGK kaleminin önerisi; canlı ve dolu değerler (saf yardımcı, formda toplama yok).
  const sgkOnerisi = useMemo(() => calisanSgkToplami(calisanlar), [calisanlar]);

  // Hesap özeti (kira: R6; normal: AC-3). Ham metinden anlık hesaplanır.
  // Spec 0071 R1, R3, R6, R23: tutar alanı tektir; "KDV dâhil" seçiliyse girilen rakam önce kdvAyir ile ayrılır (motorun aynı
  // fonksiyonu). Kirada seçim yalnız brüt girişte (Q1). KDV ileri yönde de motordan (kalemKdv, C8); yerel formül yok.
  const kdvOran = tutarCoz(form.kdvOrani).deger || 0;
  const yonSecilebilir = kdvYonuSecilebilirMi(dav, form.girisYonu);
  const kdvYonu = yonSecilebilir ? kdvYonuOf(form) : KDV_YONU.HARIC;
  const girilenTutar = tutarCoz(form.tutar).deger;
  const ayrim = kdvYonu === KDV_YONU.DAHIL ? kdvAyir(girilenTutar, kdvOran) : null;
  const kira = dav === DAVRANIS.KIRA ? kiraHesapla({
    girisYonu: form.girisYonu, tutar: girilenHaric(girilenTutar, kdvYonu, kdvOran), netTutar: tutarCoz(form.netTutar).deger,
    stopajOrani: tutarCoz(form.stopajOrani).deger, kdvOrani: kdvOran,
  }) : null;
  const normalTutar = girilenHaric(girilenTutar, kdvYonu, kdvOran);
  const kdvOnizleme = kalemKdv({ tutar: normalTutar, kdvOrani: kdvOran });
  const normalOdenecek = tl(kurus(normalTutar) + kurus(kdvOnizleme));
  // R2, AC-5: yuvarlama yüzünden ödenecek girilen tutardan saparsa fark yazılır (motorun üretmeyeceği rakam gösterilmez).
  const farkSatiri = (farkK) => (farkK ? <div data-testid="kdv-yuvarlama-farki" style={{ fontSize: 11.5, color: "var(--amb700, #b45309)", marginTop: 6 }}>
    Kuruş yuvarlaması: KDV hariç tutar ile KDV toplamı, girilen {tl2(girilenTutar)} tutarından {tl2(Math.abs(farkK) / 100)} {farkK > 0 ? "az" : "fazla"}.</div> : null);
  // R1, R6, R18: seçici normal ve brüt kirada; personelde ve net kirada çizilmez.
  // Spec 0075 R1, R9: kutu yalnız normal davranışta (tevkifatliMi); kapalıyken önizleme kalemi tevkifat taşımaz (C3).
  const tevkifatAcik = tevkifatliMi(dav) && !!form.tevkifatli;
  const kdvYonuAlani = yonSecilebilir ? (
    <Field label="Tutar KDV hariç mi, dâhil mi?">
      <Segment ariaLabel="KDV yönü" options={[{ value: KDV_YONU.HARIC, label: "KDV hariç" }, { value: KDV_YONU.DAHIL, label: "KDV dâhil" }]} value={kdvYonu} onChange={v => set({ kdvYonu: v })} />
      {tevkifatAcik && <Ipucu>{TEVKIFAT_KDV_DAHIL_NOTU}</Ipucu>}
      {dav === DAVRANIS.KIRA && <Ipucu>Brüt/net seçimi stopaj içindir, KDV hariç/dâhil seçimi KDV içindir. KDV dâhil girilen brütten önce KDV ayrılır; stopaj ayrılan brüt üzerinden hesaplanır.</Ipucu>}
    </Field>
  ) : null;
  // Spec 0023 C5: form da motorun tek toplamını gösterir (maaş + ek ödemeler); atama tabanı (0020) aynı rakam.
  const ekToplam = (form.ekOdemeler || []).reduce((a, e) => a + (tutarCoz(e.resmiTutar).deger || 0) + (tutarCoz(e.eldenTutar).deger || 0), 0);
  const yolForm = tutarCoz(form.yolParasi).deger || 0;
  const personelToplam = tutarCoz(form.resmiTutar).deger + tutarCoz(form.eldenTutar).deger + yolForm + ekToplam;

  const tevkifatAlanlari = useMemo(() => (tevkifatAcik ? { tevkifatli: true, tevkifatPay: Number(form.tevkifatPay) || 0, tevkifatPayda: Number(form.tevkifatPayda) || 0 } : {}),
    [tevkifatAcik, form.tevkifatPay, form.tevkifatPayda]);
  // Ödeme planı önizlemesi (spec 0021): kayıttakiyle AYNI motor (odemeSatirlariKur); geçici kimliklerle çizilir.
  const onizleme = useMemo(() => {
    const kalemBenzeri = {
      tutar: dav === DAVRANIS.KIRA ? kira?.brut : normalTutar, kdvOrani: tutarCoz(form.kdvOrani).deger, stopajOrani: tutarCoz(form.stopajOrani).deger,
      resmiTutar: tutarCoz(form.resmiTutar).deger, eldenTutar: tutarCoz(form.eldenTutar).deger, yolParasi: yolForm,
      ekOdemeler: (form.ekOdemeler || []).map(e => ({ resmiTutar: tutarCoz(e.resmiTutar).deger || 0, eldenTutar: tutarCoz(e.eldenTutar).deger || 0 })),
      ...tevkifatAlanlari,
    };
    let n = 0;
    const eski = form.taksitler || [];
    return odemeSatirlariKur(kalemBenzeri, dav, { taksitSayisi: form.taksitSayisi, ilkVade: form.sonOdemeTarihi || null, stopajTaksitSayisi: form.stopajTaksitSayisi, stopajVade: form.stopajVade || null, eldenVade: form.eldenVade || null,
      tevkifatTaksitSayisi: form.tevkifatTaksitSayisi, tevkifatVade: form.tevkifatVade || null },
      { uid: () => `onizleme-${++n}`, eskiSatirlar: eski, eskiOdendi: !eski.length && !!form.odendi, eskiOdemeTarihi: form.odemeTarihi || null });
  }, [dav, kira?.brut, normalTutar, form.kdvOrani, form.stopajOrani, form.resmiTutar, form.eldenTutar, form.ekOdemeler, form.taksitSayisi, form.sonOdemeTarihi, form.stopajTaksitSayisi, form.stopajVade, form.eldenVade, form.taksitler, form.odendi, form.odemeTarihi, yolForm, tevkifatAlanlari, form.tevkifatTaksitSayisi, form.tevkifatVade]);
  const planli = !!onizleme.hata || (onizleme.satirlar || []).length > 0;
  const stopajVar = dav === DAVRANIS.KIRA && (kira?.stopaj || 0) > 0;
  // Spec 0042 R4, X7, Q4: resmi ve eldeni olan personel iki hedefle ödenir; taksit yalnız resmiye, elden tek satır.
  const personelTutarlari = dav === DAVRANIS.PERSONEL ? { resmi: tutarCoz(form.resmiTutar).deger + (form.ekOdemeler || []).reduce((a, e) => a + (tutarCoz(e.resmiTutar).deger || 0), 0),
    elden: tutarCoz(form.eldenTutar).deger + yolForm + (form.ekOdemeler || []).reduce((a, e) => a + (tutarCoz(e.eldenTutar).deger || 0), 0) } : null;
  const personelBolunmez = personelBolunmezMi(form.taksitler, dav);
  // Spec 0054 Q3 (AC-25): "Elden vadesi" yalnız ELDEN MAAŞI olan ve başka bir hedefi de olan kalemde; elden ek ödemenin vadesi
  // kalemin ilk vadesidir (R17). personelIkiHedef motorda anlamı değişmeden kalır (R15).
  const maasEldenK = tutarCoz(form.eldenTutar).deger + yolForm; // spec 0070 R8: yol parası elden maaşıyla aynı hedefte
  const personelIki = !!personelTutarlari && maasEldenK > 0 && personelTutarlari.resmi + personelTutarlari.elden - maasEldenK > 0 && !personelBolunmez;

  // Spec 0046: ödeme satırları kayıttakiyle aynı motorun önizleme kaleminden (R1, R5, R6, R26); düzenlemede canlı kalemden.
  const onizlemeKalem = useMemo(() => ({
    id: "__onizleme__", turId: numId(form.turId), tedarikciId: tedarikciSecilirMi(dav) ? numId(form.tedarikciId) : null, calisanId: numId(form.calisanId),
    tutar: dav === DAVRANIS.KIRA ? kira?.brut : normalTutar, kdvOrani: tutarCoz(form.kdvOrani).deger, stopajOrani: tutarCoz(form.stopajOrani).deger,
    resmiTutar: tutarCoz(form.resmiTutar).deger, eldenTutar: tutarCoz(form.eldenTutar).deger, yolParasi: yolForm, girisYonu: form.girisYonu, netTutar: tutarCoz(form.netTutar).deger,
    ekOdemeler: (form.ekOdemeler || []).map(e => ({ resmiTutar: tutarCoz(e.resmiTutar).deger || 0, eldenTutar: tutarCoz(e.eldenTutar).deger || 0 })),
    taksitler: onizleme.hata ? [] : (onizleme.satirlar || []),
    ...tevkifatAlanlari,
  }), [tevkifatAlanlari, form.turId, form.tedarikciId, form.calisanId, form.kdvOrani, form.stopajOrani, form.resmiTutar, form.eldenTutar, form.girisYonu, form.netTutar, form.ekOdemeler, dav, kira?.brut, normalTutar, onizleme, yolForm]);
  const yeniKalem = form.id == null;
  const odemeHedefListesi = useMemo(() => (form.turId === "" || !yeniKalem ? [] : formOdemeHedefleri(onizlemeKalem, turMap)), [yeniKalem, onizlemeKalem, turMap, form.turId]);
  // Spec 0053 R15, R24: düzenlemede canlı kalem, gerçek kimliğiyle kayıtlı (silinmek üzere işaretlenmemiş) hareketlerden zenginleşir.
  const canliKalem = useMemo(() => {
    if (yeniKalem || form.turId === "" || onizleme.hata) return null;
    const ham = { ...onizlemeKalem, id: form.id };
    return hareketBolumu ? odemeleriUygula([ham], kalanHareketler, turMap)[0] : { ...ham, _odenen: form._odenen, odendi: form.odendi };
  }, [yeniKalem, form.turId, form.id, form._odenen, form.odendi, onizleme.hata, onizlemeKalem, hareketBolumu, kalanHareketler, turMap]);
  // Spec 0048 (R1, R2, R11, Q1): düzenlemede kutu canlı önizleme kaleminden çizilir. Ödenen tutar form durumundan değil,
  // kalemin gerçek kimliğiyle kayıtlı hareketlerin kaydın motorundan (odemeleriUygula) geçirilmesinden gelir: kaydedince
  // listede görünecek durumun kendisi. Hareket bölümü yoksa (Q7) saklı durum taşınır.
  const duzenlemeDurumu = useMemo(() => {
    if (yeniKalem || form.turId === "") return null;
    return duzenlemeOdemeDurumu({ canliKalem, kayitliKalem: kalem, turMap, planHatasi: !!onizleme.hata });
  }, [yeniKalem, form.turId, canliKalem, onizleme.hata, turMap, kalem]);
  // Spec 0057 R1, C2: pasif kararı çağıranın tek satırı. Yeni kalemde hiçbir hedef pasif değildir (taksitli hedef de taksit
  // seçiciyle ödenir); düzenlemede karar duzenlemeOdemeDurumu'ndan (taksit sayısı değişen ya da plan hatalı taksitli hedef).
  const girisHedefleri = yeniKalem ? odemeHedefListesi : (duzenlemeDurumu?.hedefler || []);
  const girisKalemi = yeniKalem ? onizlemeKalem : canliKalem;
  const avansK = dav === DAVRANIS.PERSONEL && form.calisanId !== "" ? avansBorcuK(numId(form.calisanId), kalanHareketler, giderler) : 0;
  const mahsupVar = odemeDegistirebilir && avansK > 0 && girisHedefleri.some(h => !h.pasif && h.kalanK > 0)
    && mahsupKapsamda({ tarih: form.tarih }, { bugun: yerelBugun(), yururlukAy: giderAyarlari?.yururlukAy || null });
  const bolunmezNotu = personelBolunmez && personelTutarlari.resmi > 0 && personelTutarlari.elden > 0;
  const cekSatirlari = useMemo(() => (ciroYetkisi ? ciroCekleri(cekler, payments) : []), [ciroYetkisi, cekler, payments]);
  const alacakliSerbest = ciroAlacaklisi({ turId: numId(form.turId), tedarikciId: numId(form.tedarikciId) }, turMap).tur === "serbest";
  const alacakliAdi = () => {
    if (dav === DAVRANIS.PERSONEL) return secilenCalisan?.ad || "";
    const t = tedarikciler.find(x => String(x.id) === String(form.tedarikciId));
    return t ? t.ad : giris.alacakliAd;
  };
  const iki = cokHedefliMi(girisKalemi || onizlemeKalem, dav); // spec 0054 R16
  const odemePlani = { tarih: giris.tarih, kip: mahsupVar ? giris.kip : "odeme", satirlar: giris.satirlar, mahsup: giris.mahsup, alacakliAd: alacakliAdi(), silinenler: [...silinenler] };
  const odemeBaglami = { turMap, hesaplar, cekler, payments, hareketler: kalanHareketler, giderler, bugun: yerelBugun(), yururlukAy: giderAyarlari?.yururlukAy || null, hedefAdi: (h) => hedefAdi(h, dav, iki) };
  // 0040 R8: ciro fark uyarısı motordan (ciroPlani) olduğu gibi, kayıttan önce de görünür.
  const ciroSecili = giris.kip !== "mahsup" && giris.satirlar.some(x => x.yontem === CIRO_YONTEMI && x.cekId != null);
  const ciroUyari = ciroSecili && girisKalemi ? odemeGirisiHazirla(odemeleriUygula([{ ...girisKalemi }], yeniKalem ? [] : kalanHareketler, turMap)[0], { ...odemeBaglami, ...odemePlani, kip: "odeme" }).uyari : null;

  const kaydet = () => {
    const ham = {
      ...form,
      turId: numId(form.turId), tedarikciId: tedarikciSecilirMi(dav) ? numId(form.tedarikciId) : null, calisanId: numId(form.calisanId),
      sonOdemeTarihi: form.sonOdemeTarihi || null, odemeTarihi: form.odemeTarihi || null,
    };
    const { hatalar: h, kayit } = giderKalemDogrula(ham, { turMap, tedarikciler });
    setHatalar(h);
    if (!kayit) return;
    delete kayit._kdvElle;
    if (dav === DAVRANIS.PERSONEL) kayit.calisanAd = secilenCalisan?.ad || kayit.calisanAd || "";
    if (dav !== DAVRANIS.PERSONEL) kayit.aciklama = String(form.aciklama || "").trim();
    // Spec 0046 R17 + 0053 R18, R24, AC-22: ödeme girişi kayıttan ÖNCE doğrulanır (yeni kalemde geçici kimlikle, düzenlemede
    // kaydın kendisiyle); hata varsa kalem de kaydedilmez. Kayıt ödeme durumu taşımaz (0024 R3); Giderler aynı fonksiyonu
    // gerçek kalemle yeniden çağırır ve kalem, hareketler, silinenler ve çeki tek işleyicide yazar.
    if (odemeDegistirebilir && odemePlani.kip === "mahsup" && giris.mahsupKilitli) { setOdemeHatalari({ genel: [MAHSUP_KILITLI_HATASI] }); return; } // spec 0064 R20
    const odemeVar = odemeDegistirebilir && (odemePlani.kip === "mahsup" ? String(giris.mahsup?.tutar ?? "").trim() !== "" : giris.satirlar.length > 0 || silinenler.size > 0);
    if (odemeVar) {
      const deneme = odemeleriUygula([{ ...kayit, id: yeniKalem ? "__yeni__" : kayit.id }], yeniKalem ? [] : kalanHareketler, turMap)[0];
      const r = odemeGirisiHazirla(deneme, { ...odemeBaglami, ...odemePlani });
      setOdemeHatalari(r.hatalar);
      if (!r.hareketler) return;
    }
    onSave(kayit, odemeVar ? odemePlani : null);
  };

  const taksitli = Number(form.taksitSayisi) >= 2;
  // Spec 0053 R4: vade kalemin borç vadesidir; ödeme yönteminden türemez ("Çek vade tarihi" dalı kalktı).
  // Spec 0075 R37 (Ö-12, AC-42): tevkifatlı kalemde iki vade alanı aynı metni taşımaz; ana vade "Tedarikçiye son ödeme".
  const tevkifatVar = kalemTevkifat(onizlemeKalem, dav) > 0;
  const vadeEtiket = taksitli ? "İlk taksitin vadesi" : dav === DAVRANIS.KIRA && stopajVar ? `${hedefAdi(HEDEF.ANA, DAVRANIS.KIRA)} son ödeme`
    : tevkifatVar ? `${hedefAdi(HEDEF.ANA, dav)} son ödeme` : "Son ödeme tarihi"; // spec 0060 R30: ad tablodan
  const sayac = new Set(hatalar.map(h => h.alan)).size;
  return (
    <Modal title={form.id == null ? "Yeni Gider" : "Gider Düzenle"} onClose={onCancel} wide
      footer={<><Btn variant="ghost" onClick={onCancel}>İptal</Btn><Btn onClick={kaydet}><Icon name="check" size={14} /> {mukerrer.length ? "Yine de Kaydet" : "Kaydet"}</Btn></>}>
      {sayac > 0 && <div role="alert" style={{ background: "var(--redBg, #fef2f2)", border: "1px solid var(--redBr, #fecaca)", color: "var(--red700, #b91c1c)", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Kayıt yapılmadı: {sayac} alan düzeltilmeli.</div>}
      {form.tanimId != null && (
        <div style={{ background: "var(--bluBg, #eff6ff)", border: "1px solid var(--bluBr, #bfdbfe)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, marginBottom: 14 }}>
          <b style={{ color: "var(--blu700, #1d4ed8)" }}>Tekrarlayan tanımdan oluşturuldu{form.donem ? ` · ${form.donem}` : ""}.</b> Bu kalemi düzenlemek yalnız bu ayın kalemini değiştirir; tanım ve diğer ayların kalemleri aynı kalır.
        </div>
      )}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ width: 170 }}><Field label="Tarih *"><Input type="date" value={form.tarih} onChange={e => tarihDegis(e.target.value)} /><HataMetni>{hata("tarih")}</HataMetni></Field></div>
        <div style={{ flex: "1 1 220px" }}>
          <Field label="Gider türü *">
            <Select value={form.turId} onChange={e => turDegis(e.target.value)}>
              <option value="">Tür seçin</option>
              {/* Spec 0078 R11: çöpteki tür seçicide görünmez (kaydın kendi türü hariç); davranış çözümü ham listeden. */}
              {giderTurleri.filter(t => !t.deletedAt || String(t.id) === String(form.turId)).map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
            </Select>
            {tur && <div style={{ marginTop: 4 }}><DavranisRozeti davranis={dav} /></div>}
            <HataMetni>{hata("turId")}</HataMetni>
          </Field>
        </div>
        {/* Spec 0074 R8, R33: tedarikçi tek kapıdan (personel ve SGK'da yok; SGK'nın alacaklısı kurum). */}
        {tedarikciSecilirMi(dav) && (
          <div style={{ flex: "1 1 200px" }}>
            <Field label={dav === DAVRANIS.KIRA ? "Tedarikçi (kiraya veren)" : "Tedarikçi"}>
              <Select value={form.tedarikciId} onChange={e => set({ tedarikciId: e.target.value })}>
                <option value="">Seçilmemiş</option>
                {tedarikciler.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
              </Select>
              <HataMetni>{hata("tedarikciId")}</HataMetni>
            </Field>
          </div>
        )}
      </div>
      {giderTurleri.length === 0 && <Ipucu>Önce Ayarlar › Giderler › Gider Türleri'nden tür tanımlayın.</Ipucu>}

      {dav === DAVRANIS.PERSONEL && (
        <>
          {/* C19: form açık olduğu sürece görünen, kapatılamayan not (AC-57, AC-58: engel değil) */}
          <div style={{ display: "flex", gap: 10, background: "var(--purBg, #f5f3ff)", border: "1px solid var(--purBr, #ddd6fe)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12.5, lineHeight: 1.5, color: "var(--pur900, #3b0764)" }}>
            <Icon name="warning" size={16} />
            {/* Spec 0074 R24, C2: SGK bu kaleme girmez; aylık SGK kendi türündeki kalemle girilir ve ödenir (çift sayım yok). */}
            <div data-testid="personel-sgk-notu">{PERSONEL_SGK_NOTU}</div>
          </div>
          <Field label="Çalışan *">
            <Select value={form.calisanId} onChange={e => calisanSec(e.target.value)}>
              <option value="">Çalışan seçin</option>
              {calisanlar.map(c => <option key={c.id} value={c.id}>{c.ad}</option>)}
            </Select>
            <HataMetni>{hata("calisanId")}</HataMetni>
            {calisanMaliyetsiz && <Ipucu>Bu çalışanın aylık maliyeti girilmemiş; alanlar boş bırakıldı (sıfır yazılmadı).</Ipucu>}
          </Field>
          {mukerrer.length > 0 && (
            <div role="status" style={{ background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, marginBottom: 14 }}>
              <b style={{ color: "var(--amb700, #b45309)" }}>{secilenCalisan?.ad} için {ayOf(form.tarih)} ayında zaten {mukerrer.length} personel kalemi var.</b> Yine de kaydedebilirsiniz.
            </div>
          )}
          {/* Spec 0070 R1, R5 (0074 R16 ile): bileşenler resmi, elden, yol parası; SGK personel kaleminde değil. */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><Field label="Resmi işveren maliyeti"><TutarInput ariaLabel="Resmi işveren maliyeti" value={form.resmiTutar} onChange={v => set({ resmiTutar: v })} invalid={!!hata("resmiTutar")} /><HataMetni>{hata("resmiTutar")}</HataMetni></Field></div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><Field label="Elden ödenen"><TutarInput ariaLabel="Elden ödenen" value={form.eldenTutar} onChange={v => set({ eldenTutar: v })} invalid={!!hata("eldenTutar")} /><HataMetni>{hata("eldenTutar")}</HataMetni></Field></div>
            <div style={{ flex: 1 }}><Field label="Yol parası"><TutarInput ariaLabel="Yol parası" value={form.yolParasi} onChange={v => set({ yolParasi: v })} invalid={!!hata("yolParasi")} /><HataMetni>{hata("yolParasi")}</HataMetni>
              <Ipucu>Çalışana elden tutarla birlikte ödenir. Bordroda gösteriyorsanız tutarı resmi alanına yazın, bu alanı boş bırakın.</Ipucu></Field></div>
          </div>
          {/* Spec 0023 R1, R9, C8: o ayın fazla mesai, prim ve ikramiyesi; maaşla aynı ödeme (ayrı vade yok). */}
          <Field label="Ek ödemeler (bu ay)">
            <EkOdemeSatirlari satirlar={form.ekOdemeler || []} onChange={v => set({ ekOdemeler: v })} hatalar={hatalar.filter(h => h.alan === "ekOdemeler")} />
            <Ipucu>Fazla mesai, prim ve ikramiye tutar olarak girilir; her ay elle girilir, ertesi aya taşınmaz. Maaşla aynı ödemedir, ayrı vadesi yoktur; başka gün ödenecekse ayrı personel kalemi açın.</Ipucu>
          </Field>
          <div style={{ display: "flex", justifyContent: "space-between", background: "var(--purBg3, #faf7ff)", border: "1px solid var(--purBg2, #ede9fe)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: "var(--n600, #475569)", fontWeight: 600 }}>{ekToplam > 0 ? "Kalem tutarı (maaş + ek ödemeler)" : yolForm ? "Kalem tutarı (resmi + elden + yol parası)" : "Kalem tutarı (resmi + elden)"}</span><b style={{ fontSize: 16 }} data-testid="personel-toplam">{tl2(personelToplam)}</b>
          </div>
          <Ipucu>Personel kaleminde KDV oranı ve tedarikçi alanı yoktur. Boş bileşen sıfır sayılır.</Ipucu>
        </>
      )}

      {dav !== DAVRANIS.PERSONEL && (
        <Field label="Açıklama"><Input value={form.aciklama || ""} onChange={e => set({ aciklama: e.target.value })} placeholder="Opsiyonel (ör. fatura numarası)" /></Field>
      )}

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          {dav === DAVRANIS.KIRA && (
            <>
              <Field label="Hangi tutarı giriyorsunuz?">
                <Segment ariaLabel="Giriş yönü" options={[{ value: "brut", label: "Brüt kira" }, { value: "net", label: "Net ödenen kira" }]} value={form.girisYonu} onChange={v => set({ girisYonu: v })} />
                <Ipucu>Seçim kayıtta saklanır, listede “{form.girisYonu === "net" ? "Net" : "Brüt"} girildi” rozetiyle görünür.</Ipucu>
              </Field>
              {kdvYonuAlani}
              {form.girisYonu === "net"
                ? <Field label="Net ödenen kira *"><TutarInput ariaLabel="Net ödenen kira" value={form.netTutar} onChange={v => set({ netTutar: v })} invalid={!!hata("netTutar")} /><HataMetni>{hata("netTutar")}</HataMetni>
                  <Ipucu>Net ödenen kira KDV hariç girilir; KDV dâhil seçimi yalnız brüt kira girişinde vardır.</Ipucu></Field>
                : <Field label={kdvYonu === KDV_YONU.DAHIL ? "Brüt kira (KDV dâhil) *" : "Brüt kira (KDV hariç) *"}><TutarInput ariaLabel="Brüt kira" value={form.tutar} onChange={v => set({ tutar: v })} invalid={!!hata("tutar")} /><HataMetni>{hata("tutar")}</HataMetni></Field>}
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><Field label="Stopaj oranı"><TutarInput sym="%" ariaLabel="Stopaj oranı" value={form.stopajOrani} onChange={v => set({ stopajOrani: v })} /><HataMetni>{hata("stopajOrani")}</HataMetni></Field></div>
                <div style={{ flex: 1 }}><Field label="KDV oranı"><TutarInput sym="%" ariaLabel="KDV oranı" value={form.kdvOrani} onChange={v => set({ kdvOrani: v, _kdvElle: true })} /><HataMetni>{hata("kdvOrani")}</HataMetni></Field></div>
              </div>
            </>
          )}
          {dav === DAVRANIS.NORMAL && kdvYonuAlani}
          {/* Spec 0074 R6, R33: normal ve SGK tek tutarlıdır; KDV oranı yalnız KDV'li davranışta (kdvliMi). */}
          {dav !== DAVRANIS.PERSONEL && dav !== DAVRANIS.KIRA && (
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><Field label={!kdvliMi(dav) ? "Tutar *" : kdvYonu === KDV_YONU.DAHIL ? "Tutar (KDV dâhil) *" : "Tutar (KDV hariç) *"}><TutarInput ariaLabel="Tutar" value={form.tutar} onChange={v => set({ tutar: v })} invalid={!!hata("tutar")} /><HataMetni>{hata("tutar")}</HataMetni></Field></div>
              {kdvliMi(dav) && <div style={{ width: 130 }}><Field label="KDV oranı"><TutarInput sym="%" ariaLabel="KDV oranı" value={form.kdvOrani} onChange={v => set({ kdvOrani: v, _kdvElle: true })} /><HataMetni>{hata("kdvOrani")}</HataMetni></Field></div>}
            </div>
          )}
          {/* Spec 0074 R14 (AC-15, AC-46): SGK tutarı çalışan kartlarının önerisiyle doldurulur, sonra elle düzeltilir. */}
          {sgkDavranisiMi(dav) && (
            <div data-testid="sgk-toplam-onerisi" style={{ marginBottom: 10 }}>
              <Btn small variant="ghost" disabled={sgkOnerisi.kisi === 0} onClick={() => set({ tutar: tutarMetni(sgkOnerisi.toplam) })}>Çalışanların SGK toplamını kullan</Btn>
              <Ipucu>{sgkOnerisi.kisi ? `${sgkOnerisi.kisi} çalışanın kartındaki SGK toplamı: ${tl2(sgkOnerisi.toplam)}. Bildirgeye göre düzeltebilirsiniz.` : SGK_TOPLAM_YOK_NEDENI}</Ipucu>
            </div>
          )}
          {kdvliMi(dav) && <Ipucu>KDV oranı gider tarihine göre ön doldurulur, değiştirilebilir.</Ipucu>}
          {/* Spec 0075 R1–R4, R13: nadir olduğu için alanlar onay kutusunun arkasında (teslimatFarkli deseni); kapalıyken form aynı. */}
          {tevkifatliMi(dav) && (
            <div data-testid="tevkifat-alani" style={{ borderTop: "1px dashed var(--n300, #cbd5e1)", paddingTop: 10, marginBottom: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" aria-label="Bu fatura tevkifatlı" checked={!!form.tevkifatli}
                  onChange={e => set(e.target.checked ? { tevkifatli: true } : { tevkifatli: false, tevkifatPay: "", tevkifatPayda: "", tevkifatTaksitSayisi: "1", tevkifatVade: "" })}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--brand, #e85d1a)" }} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Bu fatura tevkifatlı</span>
              </label>
              <HataMetni>{hata("tevkifatli")}</HataMetni>
              {tevkifatAcik && (
                <div style={{ marginTop: 8 }}>
                  <Field label="Tevkifat oranı *">
                    <Select aria-label="Tevkifat oranı" value={form.tevkifatPay && form.tevkifatPayda ? `${form.tevkifatPay}/${form.tevkifatPayda}` : ""}
                      onChange={e => { const [p, d] = e.target.value.split("/"); set({ tevkifatPay: p ? Number(p) : "", tevkifatPayda: d ? Number(d) : "" }); }}>
                      <option value="">Faturadaki oranı seçin</option>
                      {TEVKIFAT_ORANLARI.map(o => <option key={tevkifatOranEtiketi(o)} value={tevkifatOranEtiketi(o)}>{tevkifatOranEtiketi(o)}</option>)}
                    </Select>
                    <HataMetni>{hata("tevkifatPay")}</HataMetni>
                  </Field>
                  <Ipucu>{TEVKIFAT_ALT_SINIR_NOTU}</Ipucu>
                  <Ipucu>{TEVKIFAT_AYRI_KALEM_NOTU}</Ipucu>
                </div>
              )}
            </div>
          )}
          {yonSecilebilir && tutarCoz(form.kdvOrani).deger === 0 && !tutarCoz(form.kdvOrani).gecersiz && <Ipucu>KDV oranı sıfır olduğu için dâhil ve hariç aynı tutarı verir.</Ipucu>}
        </div>
        {dav === DAVRANIS.KIRA && kira && (
          <div style={{ flex: "0 0 300px", background: "var(--ambBg3, #fffaf5)", border: "1px solid var(--ambBr3, #fed7aa)", borderRadius: 12, padding: "14px 16px" }} data-testid="kira-ozet">
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--orTx, #c2410c)", marginBottom: 4 }}>Hesap Özeti</div>
            <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginBottom: 6 }}>Stopaj ve KDV, KDV hariç brüt tutar üzerinden hesaplanır.</div>
            {[["Brüt kira", tl2(kira.brut)], ["Stopaj", `− ${tl2(kira.stopaj)}`], ["Net kira", tl2(kira.net)], ["KDV", `+ ${tl2(kira.kdv)}`]].map(([a, b]) => (
              <div key={a} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid #fde7d4" }}><span>{a}</span><b>{b}</b></div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "8px 0", borderBottom: "1px solid #fde7d4" }}><span>{hedefAdi(HEDEF.ANA, DAVRANIS.KIRA)} ödenecek <span style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>net + KDV</span></span><b>{tl2(kira.nakit)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0" }}><span>{hedefAdi(HEDEF.STOPAJ, DAVRANIS.KIRA)}</span><b style={{ color: "var(--amb700, #b45309)" }}>{tl2(kira.stopaj)}</b></div>
            <div style={{ fontSize: 12, color: "var(--n600, #475569)", marginTop: 6 }}>Gider toplamına giren: <b>{tl2(kira.brut)}</b> (brüt)</div>
            {ayrim && form.girisYonu !== "net" && farkSatiri(ayrim.farkK)}
          </div>
        )}
        {/* Spec 0075 R12 (S2, AC-14, AC-41): tevkifat özeti kira kutusunun yerinde ve biçiminde; rakamlar önizleme kaleminden
            motorla (kalemTevkifat, odenecekTutar), formda ikinci çarpım yok. Kutu kapalıyken normal-ozet aynen. */}
        {tevkifatAcik && normalTutar > 0 && (
          <div style={{ flex: "0 0 300px", background: "var(--ambBg3, #fffaf5)", border: "1px solid var(--ambBr3, #fed7aa)", borderRadius: 12, padding: "14px 16px" }} data-testid="tevkifat-ozet">
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--orTx, #c2410c)", marginBottom: 4 }}>Tevkifat Özeti</div>
            <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginBottom: 6 }}>Tevkifat toplam KDV üzerinden hesaplanır.</div>
            {[["Matrah", tl2(normalTutar), "ozet-matrah"], ["Toplam KDV", tl2(kdvOnizleme), "ozet-toplam-kdv"], ["Tevkifat", `− ${tl2(kalemTevkifat(onizlemeKalem, dav))}`, "ozet-tevkifat"],
              ["Kalan KDV", tl2(tl(kurus(kdvOnizleme) - kurus(kalemTevkifat(onizlemeKalem, dav)))), "ozet-kalan-kdv"]].map(([a, b, id]) => (
              <div key={a} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--ambBr3, #fde7d4)" }}><span>{a}</span><b data-testid={id}>{b}</b></div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "8px 0", borderBottom: "1px solid var(--ambBr3, #fde7d4)" }}><span>{hedefAdi(HEDEF.ANA, dav)} ödenecek</span><b data-testid="ozet-tedarikciye">{tl2(odenecekTutar(onizlemeKalem, dav))}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0" }}><span>{hedefAdi(HEDEF.TEVKIFAT, dav)}</span><b data-testid="ozet-vergi-dairesine" style={{ color: "var(--amb700, #b45309)" }}>{tl2(kalemTevkifat(onizlemeKalem, dav))}</b></div>
            <div style={{ fontSize: 12, color: "var(--n600, #475569)", marginTop: 6 }}>Gider toplamına giren: <b>{tl2(normalTutar)}</b> (matrah)</div>
            {ayrim && farkSatiri(ayrim.farkK)}
          </div>
        )}
        {dav === DAVRANIS.NORMAL && normalTutar > 0 && !tevkifatAcik && (
          <div style={{ flex: "0 0 220px", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 12, padding: "12px 14px", fontSize: 13 }} data-testid="normal-ozet">
            {/* Spec 0071 R2: dâhil girişte kaydedilecek üç rakam (hariç, KDV, ödenecek) ve varsa yuvarlama farkı. */}
            {ayrim && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>KDV hariç</span><b data-testid="ozet-kdv-haric">{tl2(normalTutar)}</b></div>}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>KDV</span><b data-testid="ozet-kdv">{tl2(kdvOnizleme)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>Ödenecek</span><b data-testid="ozet-odenecek">{tl2(normalOdenecek)}</b></div>
            {ayrim && farkSatiri(ayrim.farkK)}
            <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 4 }}>Gider toplamına {tl2(normalTutar)} girer.</div>
          </div>
        )}
      </div>

      {/* Spec 0053 R1, R3: "Varsayılan ödeme yöntemi" kalktı; yöntem yalnız ödeme satırında sorulur. Kalemin kayıtlı alanı
          form durumunda korunur ve kayıtta aynen geri yazılır (göç yok). */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ width: 130 }}>
          <Field label="Taksit sayısı">
            <Input aria-label="Taksit sayısı" type="number" min="1" max="60" value={form.taksitSayisi} onChange={e => set({ taksitSayisi: e.target.value, ...(Number(e.target.value) >= 2 && !satirliMi(form) ? { odendi: false, odemeTarihi: "" } : {}) })} />
            <HataMetni>{hata("taksitSayisi")}</HataMetni>
            {personelIki && <Ipucu>Yalnız resmi kısma uygulanır.</Ipucu>}
          </Field>
        </div>
        <div style={{ flex: "1 1 170px" }}>
          <Field label={vadeEtiket}>
            <Input aria-label={vadeEtiket} type="date" value={form.sonOdemeTarihi} onChange={e => set({ sonOdemeTarihi: e.target.value })} />
            <HataMetni>{hata("sonOdemeTarihi")}</HataMetni>
            <Ipucu>{taksitli ? "Sonraki taksitler birer ay arayla oluşur." : "Gider tarihinden önce olamaz."}</Ipucu>
          </Field>
        </div>
        {bolunmezNotu && (
          <div style={{ flexBasis: "100%" }}><Ipucu>{PERSONEL_BOLUNMEZ_NEDENI}</Ipucu></div>
        )}
        {personelIki && (
          <div style={{ flex: "1 1 170px" }}>
            <Field label="Elden vadesi">
              <Input aria-label="Elden vadesi" type="date" value={form.eldenVade} onChange={e => set({ eldenVade: e.target.value })} />
              <HataMetni>{hata("eldenVade")}</HataMetni>
              <Ipucu>Boşsa resmi vadesi kullanılır. Elden kısım taksitlendirilmez.</Ipucu>
            </Field>
          </div>
        )}
      </div>
      {stopajVar && (
        <KartBolum varyant="kart" baslikStili="baslik" title={`${hedefBasligi(HEDEF.STOPAJ, DAVRANIS.KIRA)} (stopaj)`} altBaslik={`Kesilen stopaj ${tl2(kira.stopaj)} kiraya verene değil vergi dairesine ödenir; ayrı izlenir.`} testId="stopaj-bolumu" style={{ marginBottom: 12, padding: 14 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ width: 130 }}>
              <Field label="Stopaj taksit sayısı"><Input aria-label="Stopaj taksit sayısı" type="number" min="1" max="60" value={form.stopajTaksitSayisi} onChange={e => set({ stopajTaksitSayisi: e.target.value })} /><HataMetni>{hata("stopajTaksitSayisi")}</HataMetni></Field>
            </div>
            <div style={{ flex: "1 1 170px" }}>
              <Field label={Number(form.stopajTaksitSayisi) >= 2 ? "İlk stopaj taksitinin vadesi" : "Stopaj vadesi"}>
                <Input aria-label="Stopaj vadesi" type="date" value={form.stopajVade} onChange={e => set({ stopajVade: e.target.value })} />
                <HataMetni>{hata("stopajVade")}</HataMetni>
                <Ipucu>Opsiyonel. Girilmezse stopaj borç özetinde görünür, hatırlatıcıya girmez.</Ipucu>
              </Field>
            </div>
          </div>
          <Ipucu>{STOPAJ_AYRI_KALEM_NOTU}</Ipucu>
        </KartBolum>
      )}
      {stopajVar && tutarCoz(form.kdvOrani).deger > 0 && <div style={{ marginBottom: 12 }}><UyariSeridi aile="bilgi" testId="stopaj-kdv-notu">{STOPAJ_KDV_NOTU}</UyariSeridi></div>}
      {/* Spec 0075 R2, R18: vergi dairesi (tevkifat) bölümü, stopaj bölümünün eşi; vade boşsa ana vade (S3). */}
      {tevkifatAcik && (
        <KartBolum varyant="kart" baslikStili="baslik" title={hedefBasligi(HEDEF.TEVKIFAT, dav)} altBaslik={`Kesilen KDV tevkifatı ${tl2(kalemTevkifat(onizlemeKalem, dav))} tedarikçiye değil vergi dairesine ödenir; ayrı izlenir.`} testId="tevkifat-bolumu" style={{ marginBottom: 12, padding: 14 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ width: 130 }}>
              <Field label="Tevkifat taksit sayısı"><Input aria-label="Tevkifat taksit sayısı" type="number" min="1" max="60" value={form.tevkifatTaksitSayisi} onChange={e => set({ tevkifatTaksitSayisi: e.target.value })} /><HataMetni>{hata("tevkifatTaksitSayisi")}</HataMetni></Field>
            </div>
            <div style={{ flex: "1 1 170px" }}>
              <Field label={Number(form.tevkifatTaksitSayisi) >= 2 ? "İlk tevkifat taksitinin vadesi" : "Tevkifat vadesi"}>
                <Input aria-label="Tevkifat vadesi" type="date" value={form.tevkifatVade} onChange={e => set({ tevkifatVade: e.target.value })} />
                <HataMetni>{hata("tevkifatVade")}</HataMetni>
                <Ipucu>Boşsa tedarikçiye son ödeme tarihi kullanılır.</Ipucu>
              </Field>
            </div>
          </div>
        </KartBolum>
      )}
      {dav === DAVRANIS.NORMAL && <Ipucu>{STOPAJ_AYRI_KALEM_NOTU}</Ipucu>}
      {planli && (
        <Field label="Ödeme planı">
          {onizleme.hata ? <HataMetni>{onizleme.hata}</HataMetni> : <OdemeSatirlari satirlar={onizleme.satirlar} davranis={dav} testId="odeme-plani-onizleme" />}
        </Field>
      )}

      {/* Spec 0053 R15, R17: yeni kalemde ve düzenlemede aynı ödeme editörü (OdemeGirisi, kapsam "form"). */}
      {form.turId !== "" && (yeniKalem ? odemeDegistirebilir : !!duzenlemeDurumu) && (
        <div data-testid={yeniKalem ? undefined : "odeme-durumu-turetilen"}>
          <OdemeGirisi kapsam="form" kalem={yeniKalem ? null : canliKalem} hedefler={girisHedefleri} davranis={dav} turMap={turMap} giris={giris} setGiris={setGiris}
            hatalar={odemeHatalari} uyari={ciroUyari} hesaplar={uygunHesaplar} hesapSecimi={hesapSecimi} ciroYetkisi={ciroYetkisi} cekSatirlari={cekSatirlari}
            alacakliSerbest={alacakliSerbest} varsayilanYontem={varsayilanYontem} varsayilanHesap={varsayilanHesap} odemeYetkisi={odemeDegistirebilir}
            mahsupVar={mahsupVar} avansK={avansK} hareketler={hareketler} kayitliGoster={!yeniKalem}
            onSil={odemeDegistirebilir && !yeniKalem ? (h) => setSilinenler(s0 => new Set([...s0, String(h.id)])) : null}
            silinenler={silinenler} onSilGeriAl={(h) => setSilinenler(s0 => { const n = new Set(s0); n.delete(String(h.id)); return n; })}
            durum={yeniKalem ? null : duzenlemeDurumu} bolunmezNotu={!yeniKalem && bolunmezNotu} yolParasiVar={dav === DAVRANIS.PERSONEL && yolForm > 0} />
        </div>
      )}

      {atanabilirMi(dav) && (
        <Field label="Makina maliyeti ataması">
          {/* Spec 0071 R25 (triyaj): önizlemenin sınırı KDV hariç tutar (normalTutar), kayıt doğrulamasıyla aynı. */}
          <AtamaAlani value={form} onChange={p => set(p)} stock={stock} customers={customers} modeller={modeller}
            tutar={dav === DAVRANIS.PERSONEL ? personelToplam : normalTutar} davranis={dav} />
          <HataMetni>{hatalar.filter(h => h.alan === "modelSatirlari" || h.alan === "makinaId").map(h => h.mesaj).find(Boolean)}</HataMetni>
        </Field>
      )}
      {/* Spec 0072 R25 (S3): atama bölümünden bağımsız, bütün davranışlarda (kira dahil). */}
      <DagitimAlani value={form.dagitimAy} onChange={v => set({ dagitimAy: v })} atamaTur={atanabilirMi(dav) ? form.atamaTur : ""} tarih={form.tarih}
        hata={hatalar.find(h => h.alan === "dagitimAy")?.mesaj} />
    </Modal>
  );
};
