import { useState, useMemo } from "react";
import { uid, fmtTR, withDeleted } from "../lib/utils";
import { useBugun } from "../hooks/useBugun";
import { odemeHatirlatmalari, hatirlatmaEsigi } from "../lib/odemeHatirlatma";
import { makeCanDo } from "../lib/permissions";
import { logAction, snapshotOnceki } from "../lib/audit";
import {
  hesaplaGiderRaporu, borcOzeti, tekrarlayanUret, kdvKarsilastir, tamAylar, yururlukKapsami, turHaritasi, canliModelSeti,
  ayOf, ayEkle, ayinSonGunu, odemeleriUygula, DAVRANIS,
} from "../lib/gider";
import { tamOdemeHareketleri } from "../lib/kasa";
import { hesaplananKdvAylar } from "../lib/giderKdv";
import { Icon, Btn, ConfirmDialog } from "./ui";
import { GiderForm } from "./GiderForm";
import { tl2 } from "./gider/GiderAlanlari";
import { Segment, BosDurum, UyariSeridi } from "./tasarim";
import { StatKart, KovaKarti, TurKirilimi, TedarikciKirilimi, BorcOzeti, KalemListesi, YontemKirilimi } from "./gider/DonemRaporu";
import { yontemKirilimlari, donemYontemKirilimi } from "../lib/odemeYontemi";
import { KdvKarsilastirmaKarti } from "./gider/KdvKarsilastirmaKarti";
import { MakinaModelGorunumu } from "./gider/MakinaModelGorunumu";
import { Tedarikciler } from "./gider/Tedarikciler";
import { StandartGiderler } from "./gider/StandartGiderler";
import { MakinaKarliligi } from "./gider/MakinaKarliligi";
import { OdemePlaniPenceresi } from "./gider/OdemePlaniPenceresi";
import { OdemeKayitPenceresi } from "./gider/OdemeKayitPenceresi";
import { UretimPartileri } from "./gider/UretimPartileri";

// Giderler üst sekmesi (spec 0001, C14). Yalnız gider yetkisi olan kullanıcıya görünür (C6 kural 3).
// Hesaplar saf motorda (lib/gider.js); bu bileşen yalnız gösterir ve kayıtları yazar. Satış KDV'si
// aylık rapor motorundan alınır, yeniden hesaplanmaz (C10, lib/giderKdv.js).
const ayAdi = (ay) => { const [y, m] = ay.split("-").map(Number); const s = new Date(y, m - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }); return s.charAt(0).toLocaleUpperCase("tr") + s.slice(1); };
const GORUNUMLER = [{ value: "rapor", label: "Dönem Raporu" }, { value: "makina", label: "Makina ve Model" }, { value: "tedarikci", label: "Tedarikçiler" }, { value: "standart", label: "Standart Genel Giderler" }, { value: "partiler", label: "Üretim Partileri" }, { value: "karlilik", label: "Makina Kârlılığı" }];

// Dönem seçicisi olmayan görünümler: standart gider bütçesi ve üretim partileri (spec 0022) dönemden bağımsızdır.
const DONEMSIZ = new Set(["standart", "partiler"]);

export const Giderler = ({
  giderler: giderlerHam = [], setGiderler, giderTanimlari = [], setGiderTanimlari, giderTurleri = [], tedarikciler = [], setTedarikciler,
  standartGiderler = [], setStandartGiderler, uretimPartileri = [], setUretimPartileri, calisanlar = [], stock = [], customers = [], standardModels = [], customModels = [],
  appSettings = {}, kdvRates, factory = null, rates = null, satisVerisi = {}, serverPermissions = null, showToast = () => {},
  // Spec 0002: App'te bir kez hesaplanan makina maliyetleri (C9). Tek kaynak: burada yedek hesap yapılmaz,
  // yoksa App yolundan farklı girdiyle (stok hareketleri olmadan) farklı üretim tarihi çözülürdü.
  makinaMaliyet = null,
  // Spec 0003: Anasayfa'daki "Giderlerde Görüntüle" ile gelinirse ödeme süzgeci "hatirlatma" açık başlar.
  baslangicOdemeFiltresi = "",
  // Spec 0024: ödeme bir harekettir; kalemin durumu burada hareketlerden türetilir (odemeleriUygula), yazma ham
  // diziye yapılır. hesapHareketleri verilmezse (dizi değil) saklı durum okunur. Hesap seçimi yalnız kasa yetkisiyle (C6).
  hesapHareketleri = null, setHesapHareketleri = null, kasaHesaplari = [], kasaYetki = false,
  // Triyaj bulgu 2: sunucu hareket bölümünü göndermedi (0024 öncesi sunucu); durum eski işaretten, ödeme girişi kapalı.
  hareketBolumuYok = false,
}) => {
  const canDo = makeCanDo(serverPermissions, "giderActions");
  // Canlı yerel gün (spec 0003 C3, H1): hatırlatma kapsamı Anasayfa kartıyla aynı "bugün"e bakmalı (AC-14).
  const bugun = useBugun();
  const [gorunum, setGorunum] = useState("rapor");
  const [odemeFiltre, setOdemeFiltre] = useState(baslangicOdemeFiltresi || "");
  const [mod, setMod] = useState("ay");
  const [ay, setAy] = useState(ayOf(bugun));
  const [aralik, setAralik] = useState({ bas: `${ayOf(bugun)}-01`, bit: bugun });
  const [form, setForm] = useState(null);       // null | {kalem}
  const [silinecek, setSilinecek] = useState(null);
  const [uretimSonucu, setUretimSonucu] = useState(null);
  const giderAyarlari = appSettings?.giderAyarlari || {};
  const yururlukAy = giderAyarlari.yururlukAy || null;
  const turMap = useMemo(() => turHaritasi(giderTurleri), [giderTurleri]);
  const giderler = useMemo(() => odemeleriUygula(giderlerHam, hesapHareketleri, turMap), [giderlerHam, hesapHareketleri, turMap]);
  // Spec 0041 R3, R4: kalemin yöntemi ödemelerden türetilir (bir kez; hareket bölümü yoksa boş, yöntem yazılmaz).
  const kirilimlar = useMemo(() => yontemKirilimlari(giderlerHam.filter(k => !k.deletedAt), hesapHareketleri, turMap), [giderlerHam, hesapHareketleri, turMap]);
  const canliModeller = useMemo(() => canliModelSeti(standardModels, customModels), [standardModels, customModels]);
  const modeller = useMemo(() => [...standardModels, ...customModels.filter(m => !m.deletedAt)], [standardModels, customModels]);

  // Ödeme hatırlatıcısı (spec 0003 R8, C2): Anasayfa kartıyla AYNI saf hesap, aynı bugün ve eşik.
  const hatirlatma = useMemo(() => odemeHatirlatmalari(giderler, { turler: giderTurleri, tedarikciler, yururlukAy, esikGun: hatirlatmaEsigi(giderAyarlari) }, bugun),
    [giderler, giderTurleri, tedarikciler, yururlukAy, giderAyarlari, bugun]);
  const hatirlatmaModu = gorunum === "rapor" && odemeFiltre === "hatirlatma";
  const hatirlatmaKalemleri = useMemo(() => giderler.filter(k => hatirlatma.kalemIdleri.has(String(k.id))), [giderler, hatirlatma]);
  const baslangic = mod === "ay" ? `${ay}-01` : aralik.bas;
  const bitis = mod === "ay" ? ayinSonGunu(ay) : aralik.bit;
  const aralikGecerli = !!baslangic && !!bitis && baslangic <= bitis;
  const donemEtiketi = mod === "ay" ? ayAdi(ay) : `${fmtTR(aralik.bas)} – ${fmtTR(aralik.bit)}`;

  const rapor = useMemo(() => (aralikGecerli ? hesaplaGiderRaporu(
    { giderler, turler: giderTurleri, tedarikciler, stock, customers, canliModeller, yururlukAy },
    { baslangic, bitis }, { bugun },
  ) : null), [aralikGecerli, giderler, giderTurleri, tedarikciler, stock, customers, canliModeller, yururlukAy, baslangic, bitis, bugun]);
  const borc = useMemo(() => borcOzeti(giderler, { turler: giderTurleri, tedarikciler, yururlukAy }, bugun), [giderler, giderTurleri, tedarikciler, yururlukAy, bugun]);
  // Spec 0041 R10 (triyaj bulgu 2): dönem yöntem kırılımı render başına değil, rapor ya da hareketler değişince hesaplanır.
  const donemKirilimi = useMemo(() => (rapor && Array.isArray(hesapHareketleri) ? donemYontemKirilimi(rapor.kalemler, hesapHareketleri, turMap) : null), [rapor, hesapHareketleri, turMap]);

  // KDV karşılaştırması (R9, K1, K15): ay bazlı; kapsam içindeki aralık tam aylardan oluşmalı.
  // Satış KDV'si aylık rapor motorunu ay başına çalıştırır (pahalı); yalnız satış verisine ve ay listesine
  // bağlı ayrı memo'da tutulur, gider kalemi düzenlemek onu yeniden hesaplatmaz (triyaj bulgu 8a).
  const kdvAylar = useMemo(() => {
    if (!aralikGecerli) return null;
    const kapsam = yururlukKapsami({ baslangic, bitis }, yururlukAy);
    if (kapsam.durum === "oncesi") return { durum: "oncesi" };
    const aylar = tamAylar(kapsam.etkinBaslangic, bitis);
    return aylar ? { durum: "tamam", aylar } : { durum: "kismi" };
  }, [aralikGecerli, baslangic, bitis, yururlukAy]);
  const hesaplananKdv = useMemo(() => (kdvAylar?.durum === "tamam"
    ? hesaplananKdvAylar(satisVerisi, kdvAylar.aylar, { factoryName: factory?.name || "Altuntaş Makina", kdvRates, factory, rates })
    : null), [kdvAylar, satisVerisi, factory, kdvRates, rates]);
  const kdv = useMemo(() => {
    if (!rapor || !kdvAylar) return null;
    if (kdvAylar.durum !== "tamam") return { durum: kdvAylar.durum };
    return { durum: "tamam", sonuc: kdvKarsilastir(hesaplananKdv, rapor.indirilecekKdv) };
  }, [rapor, kdvAylar, hesaplananKdv]);

  const uretimAyi = mod === "ay" ? ay : ayOf(bugun);
  const uret = () => {
    const u = tekrarlayanUret(giderTanimlari, giderler, uretimAyi, { turMap, calisanlar, giderAyarlari, kdvRates, uid });
    if (u.yeniKalemler.length) setGiderler(p => [...p, ...u.yeniKalemler]);
    setGiderTanimlari(() => u.guncelTanimlar);
    logAction({ serverPermissions, action: "tekrar_uretildi", entity: "gider", entityName: uretimAyi, detail: { ay: uretimAyi, eklenen: u.eklenen, zatenVardi: u.zatenVardi } });
    setUretimSonucu({ ay: uretimAyi, ...u });
    showToast(`${ayAdi(uretimAyi)}: ${u.eklenen} kalem eklendi, ${u.zatenVardi} kalem zaten vardı.`);
  };

  const kaydet = (kayit, odemeTalebi = null) => {
    if (kayit.id == null) {
      const yeni = { ...kayit, id: uid() };
      setGiderler(p => [...p, yeni]);
      logAction({ serverPermissions, action: "olusturuldu", entity: "gider", entityId: yeni.id, entityName: yeni.aciklama || yeni.calisanAd || "" });
      // Spec 0024 R17: "ödendi olarak kaydet" kalemin tamamını kapatan ödeme hareketlerini doğurur.
      const odemeler = odemeTalebi && setHesapHareketleri ? tamOdemeHareketleri(yeni, turMap, odemeTalebi).map(h => ({ ...h, id: uid() })) : [];
      if (odemeler.length) {
        setHesapHareketleri(p => [...p, ...odemeler]);
        logAction({ serverPermissions, action: "odendi", entity: "gider", entityId: yeni.id, entityName: yeni.aciklama || yeni.calisanAd || "", detail: { hareket: odemeler.length } });
      }
      showToast(odemeler.length ? "Gider ve ödemesi kaydedildi." : "Gider kaydedildi.");
    } else {
      const eski = giderler.find(k => k.id === kayit.id);
      setGiderler(p => p.map(k => (k.id === kayit.id ? { ...k, ...kayit } : k)));
      logAction({ serverPermissions, action: "duzenlendi", entity: "gider", entityId: kayit.id, entityName: kayit.aciklama || kayit.calisanAd || "", detail: { onceki: snapshotOnceki(eski) } });
      showToast("Gider güncellendi.");
    }
    setForm(null);
  };
  // Spec 0024 R17/R18: ödeme anahtarı, kira anahtarları ve Ödeme Planı satırları aynı ödeme penceresini açar.
  const [odemeHedefi, setOdemeHedefi] = useState(null); // null | {kalemId, hedef: {taksitId}|{hedef}|null}
  const odemeKalemi = odemeHedefi == null ? null : giderler.find(k => k.id === odemeHedefi.kalemId) || null;
  // Hareket yazıcısı yoksa (bölümü tanımayan eski sunucu, triyaj bulgu 2) ödeme penceresi açılmaz.
  const odemeGirisi = !!setHesapHareketleri;
  const odendiDegistir = (k) => setOdemeHedefi({ kalemId: k.id, hedef: null });
  const [planKalemId, setPlanKalemId] = useState(null);
  const planKalemi = planKalemId == null ? null : giderler.find(k => k.id === planKalemId) || null;
  const satirIsaretle = (k, r) => { setPlanKalemId(null); setOdemeHedefi({ kalemId: k.id, hedef: { taksitId: r.id } }); };
  const hedefDegistir = (k, hedef) => setOdemeHedefi({ kalemId: k.id, hedef: { hedef } });
  // Spec 0041 R5, R13: pencere doğrulanmış hareket dizisi verir (çok satırlı ödeme); hepsi tek güncellemeyle yazılır.
  const odemeKaydet = (kayitlar) => {
    const k = odemeKalemi;
    const yeni = kayitlar.map(kayit => ({ ...kayit, id: uid() }));
    setHesapHareketleri?.(p => [...p, ...yeni]);
    for (const kayit of yeni) {
      const r = kayit.taksitId != null ? (k.taksitler || []).find(x => String(x.id) === String(kayit.taksitId)) : null;
      logAction({ serverPermissions, action: kayit.tur === "mahsup" ? "mahsup_edildi" : "odendi", entity: "gider", entityId: k.id, entityName: k.aciklama || k.calisanAd || "", detail: { tutar: kayit.tutar, yontem: kayit.yontem || null, ...(r ? { taksit: r.sira, hedef: r.hedef } : {}) } });
    }
    showToast(yeni[0]?.tur === "mahsup" ? "Avans mahsup edildi." : yeni.length > 1 ? `${yeni.length} ödeme kaydedildi.` : "Ödeme kaydedildi.");
    setOdemeHedefi(null);
  };
  const odemeSil = (h) => {
    const k = odemeKalemi;
    setHesapHareketleri?.(p => p.filter(x => x.id !== h.id));
    logAction({ serverPermissions, action: "odeme_iptal", entity: "gider", entityId: k.id, entityName: k.aciklama || k.calisanAd || "", detail: { tutar: h.tutar ?? null, tarih: h.tarih } });
    showToast("Ödeme silindi.");
  };
  const sil = () => {
    const k = silinecek;
    setGiderler(p => withDeleted(p, x => x.id === k.id));
    logAction({ serverPermissions, action: "silindi", entity: "gider", entityId: k.id, entityName: k.aciklama || k.calisanAd || "" });
    setSilinecek(null);
    showToast("Gider çöp kutusuna taşındı.");
  };
  const liveGiderler = giderler.filter(k => !k.deletedAt);

  const ayKaydir = (n) => setAy(a => ayEkle(a, n));
  const donemSecici = (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ width: 220 }}><Segment ariaLabel="Dönem türü" options={[{ value: "ay", label: "Ay" }, { value: "aralik", label: "Tarih Aralığı" }]} value={mod} onChange={setMod} /></div>
      {mod === "ay" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid var(--n300, #cbd5e1)", borderRadius: 8, padding: 3, background: "var(--surface, #ffffff)" }}>
          <button type="button" aria-label="Önceki ay" onClick={() => ayKaydir(-1)} style={{ border: "none", background: "none", cursor: "pointer", padding: "4px 8px" }}>‹</button>
          <input type="month" aria-label="Dönem ayı" value={ay} onChange={e => e.target.value && setAy(e.target.value)} style={{ border: "none", fontWeight: 700, fontSize: 13, background: "transparent", color: "var(--n900, #0f172a)" }} />
          <button type="button" aria-label="Sonraki ay" onClick={() => ayKaydir(1)} style={{ border: "none", background: "none", cursor: "pointer", padding: "4px 8px" }}>›</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="date" aria-label="Başlangıç tarihi" className="input" style={{ width: 150 }} value={aralik.bas} onChange={e => setAralik(a => ({ ...a, bas: e.target.value }))} />
          <span>–</span>
          <input type="date" aria-label="Bitiş tarihi" className="input" style={{ width: 150 }} value={aralik.bit} onChange={e => setAralik(a => ({ ...a, bit: e.target.value }))} />
        </div>
      )}
    </div>
  );

  const eylemDugmeleri = (
    <>
      {canDo("gider_tekrar_uret") && giderTanimlari.length > 0 && <Btn variant="ghost" onClick={uret}><Icon name="refresh" size={14} /> {ayAdi(uretimAyi)} tekrarlayan kalemlerini oluştur</Btn>}
      {canDo("gider_add") && <Btn onClick={() => setForm({ kalem: null })}><Icon name="plus" size={14} /> Yeni Gider</Btn>}
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--n900, #0f172a)" }}>Giderler</h2>
          <div style={{ fontSize: 13, color: "var(--n500, #64748b)", marginTop: 2 }}>Tüm tutarlar TL. Gider toplamlarına KDV hariç tutar girer.</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{eylemDugmeleri}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ minWidth: 0, flex: "1 1 460px", maxWidth: 800 }}><Segment ariaLabel="Görünüm" options={GORUNUMLER} value={gorunum} onChange={setGorunum} /></div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Spec 0003 R8, triyaj bulgu 1: süzgeç listenin DIŞINDA da erişilebilir; seçili ay boşken (her ayın başı)
              veya yürürlük öncesiyken liste hiç çizilmediği için yalnız liste içindeki seçenek yetmez. */}
          {gorunum === "rapor" && (
            <button type="button" aria-pressed={hatirlatmaModu} data-testid="hatirlatma-dugmesi"
              onClick={() => setOdemeFiltre(hatirlatmaModu ? "" : "hatirlatma")}
              style={{ border: `1px solid ${hatirlatmaModu ? "var(--amb600, #d97706)" : "var(--n300, #cbd5e1)"}`, background: hatirlatmaModu ? "var(--ambBg, #fffbeb)" : "var(--surface, #ffffff)",
                color: "var(--n900, #0f172a)", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {hatirlatmaModu ? "Hatırlatma kapsamını kapat" : "Hatırlatma kapsamı"} ({hatirlatma.kalemIdleri.size})
            </button>
          )}
          {!DONEMSIZ.has(gorunum) && (hatirlatmaModu
            ? <fieldset disabled aria-label="Dönem seçici (hatırlatma kapsamında devre dışı)" style={{ border: 0, padding: 0, margin: 0, opacity: 0.45 }}>{donemSecici}</fieldset>
            : donemSecici)}
        </div>
      </div>
      {hareketBolumuYok && <UyariSeridi aile="uyari" testId="hareket-bolumu-yok" baslik="Ödeme kaydı şu an girilemiyor."
        metin="Sunucu bilgisayar bu sürüme güncellenmemiş; ödeme kayıtlarını tanımıyor. Ödeme durumu eski kayıttan gösteriliyor. Sunucu güncellenince ödemeler girilebilir." />}
      {giderTurleri.length === 0 && <UyariSeridi aile="bilgi" baslik="Henüz gider türü tanımlı değil." metin="Ayarlar › Giderler › Gider Türleri'nden türleri tanımlayın (önerilen türler tek tıkla eklenebilir)." />}
      {uretimSonucu && <UyariSeridi aile={uretimSonucu.eklenen ? "basari" : "bilgi"} baslik={`${ayAdi(uretimSonucu.ay)}: ${uretimSonucu.eklenen} kalem eklendi, ${uretimSonucu.zatenVardi} kalem zaten vardı.`} metin={[uretimSonucu.eklenen ? "Oluşturulan kalemler tek tek düzenlenebilir; tanım ve diğer aylar değişmez." : "Bir tanımdan bu ay için üretilip sonradan silinen kalemler yeniden oluşturulmaz.",
          ...uretimSonucu.atlanan.map(a => `${a.tanim.ad}: ${a.neden}`)].join(" ")} testId="uretim-sonucu" />}
      {!aralikGecerli && !DONEMSIZ.has(gorunum) && <UyariSeridi aile="uyari" baslik="Başlangıç tarihi bitişten sonra olamaz." />}

      {hatirlatmaModu && (
        <>
          <UyariSeridi aile="uyari" baslik={`Hatırlatma kapsamı: ${hatirlatma.kalemIdleri.size} kalem (${hatirlatma.sayilar.gecmis} vadesi geçmiş, ${hatirlatma.sayilar.yaklasan} yaklaşan)`} metin={`Hatırlatma kapsamı dönemden bağımsızdır: dönem filtresi devre dışı, tüm zamanlardaki kalemler gösteriliyor. Eşik ${hatirlatma.esikGun} gün.`} testId="hatirlatma-modu" />
          <KalemListesi kalemler={hatirlatmaKalemleri} giderTurleri={giderTurleri} tedarikciler={tedarikciler} stock={stock} customers={customers}
            standardModels={standardModels} customModels={customModels} bugun={bugun} canDo={canDo}
            onDuzenle={(k) => setForm({ kalem: k })} onSil={setSilinecek} onOdendi={odemeGirisi ? odendiDegistir : null} onOdemePlani={(k) => setPlanKalemId(k.id)} onHedefDegistir={odemeGirisi ? hedefDegistir : null}
            odemeFiltre={odemeFiltre} onOdemeFiltre={setOdemeFiltre} hatirlatma={hatirlatma} yontemKirilimlari={kirilimlar} />
        </>
      )}
      {gorunum === "rapor" && rapor && !hatirlatmaModu && (
        rapor.yururlukOncesi ? (
          <>
            <BosDurum testId="gider-bos-durum" baslik="Gider verisi girilmemiş" metin={`Gider takibi ${yururlukAy ? ayAdi(yururlukAy) : "yürürlük ayından"} itibaren geçerli. Seçili dönem (${donemEtiketi}) için rakam üretilmez.`} />
            <BorcOzeti ozet={borc} />
          </>
        ) : (
          <>
            {rapor.kapsamDisi && <UyariSeridi aile="uyari" baslik={`${fmtTR(rapor.kapsamDisi.baslangic)} – ${fmtTR(rapor.kapsamDisi.bitis)} arası kapsam dışı.`} metin={`Gider takibi ${ayAdi(yururlukAy)} itibaren geçerli. Rapor ${fmtTR(yururlukKapsami({ baslangic, bitis }, yururlukAy).etkinBaslangic)} – ${fmtTR(bitis)} için üretildi.`} testId="kapsam-disi" />}
            {rapor.mukerrerUyari.length > 0 && <UyariSeridi aile="uyari" baslik="Aynı tanımdan bu dönemde birden fazla kalem var." metin={rapor.mukerrerUyari.map(m => `${m.aciklama || "Tanım"} (${m.donem}): ${m.kalemler.length} kalem`).join(", ") + ". İki kullanıcı aynı ayı aynı anda oluşturmuş olabilir; fazla olanı silin."} testId="mukerrer-uyari" />}
            {rapor.bos ? <BosDurum testId="gider-bos-durum" baslik="Bu dönemde gider kaydı yok" metin="Sıfır tutarlı bir tablo yerine bu mesaj gösterilir." eylemler={eylemDugmeleri} /> : (
              <>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <StatKart etiket="Toplam gider (KDV hariç)" deger={tl2(rapor.toplam)} alt={`${rapor.kalemler.length} kalem · ödenmemiş dahil`} renk="#e85d1a" />
                  <StatKart etiket="Ödenmemiş gider (KDV hariç)" deger={tl2(rapor.odenmeyen)} alt={`${rapor.odenmeyenAdet} kalem · seçili dönem`} renk="#dc2626" />
                  <StatKart etiket="Tedarikçilere açık borç (KDV dâhil)" deger={tl2(rapor.tedarikciKirilimi.tedarikciBorcu)} alt="Tüm dönemler, bugüne kadar" renk="#b91c1c" />
                  <StatKart etiket="Kesilen kira stopajı" deger={tl2(rapor.stopajToplam)} alt={`${rapor.stopajSatirlari.length} kira kalemi`} renk="#b45309" />
                  <StatKart etiket="İndirilecek KDV" deger={tl2(rapor.indirilecekKdv)} alt="Ödeme durumundan bağımsız" renk="#16a34a" />
                </div>
                <KovaKarti rapor={rapor} />
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "stretch" }}>
                  <TurKirilimi rapor={rapor} />
                  {kdv && <KdvKarsilastirmaKarti durum={kdv.durum} sonuc={kdv.sonuc} aralikEtiketi={donemEtiketi} kaynak="Satış KDV'si Aylık Faaliyet Raporu motorundan" style={{ flex: "2 1 300px", minWidth: 0 }} />}
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <TedarikciKirilimi rapor={rapor} />
                  {donemKirilimi && <YontemKirilimi kirilim={donemKirilimi} />}
                  <BorcOzeti ozet={borc} />
                </div>
                <KalemListesi kalemler={rapor.kalemler} giderTurleri={giderTurleri} tedarikciler={tedarikciler} stock={stock} customers={customers}
                  standardModels={standardModels} customModels={customModels} bugun={bugun} canDo={canDo}
                  onDuzenle={(k) => setForm({ kalem: k })} onSil={setSilinecek} onOdendi={odemeGirisi ? odendiDegistir : null} onOdemePlani={(k) => setPlanKalemId(k.id)} onHedefDegistir={odemeGirisi ? hedefDegistir : null}
                  odemeFiltre={odemeFiltre} onOdemeFiltre={setOdemeFiltre} hatirlatma={hatirlatma} yontemKirilimlari={kirilimlar} />
              </>
            )}
            {rapor.bos && <BorcOzeti ozet={borc} />}
          </>
        )
      )}
      {gorunum === "makina" && rapor && (rapor.yururlukOncesi
        ? <BosDurum testId="gider-bos-durum" baslik="Gider verisi girilmemiş" metin={`Seçili dönem (${donemEtiketi}) yürürlük ayından önce.`} />
        : <MakinaModelGorunumu rapor={rapor} turMap={turMap} partiDegisimleri={(makinaMaliyet?.partiler || []).filter(p => p.degisimler.length)} />)}
      {gorunum === "tedarikci" && (
        <Tedarikciler tedarikciler={tedarikciler} setTedarikciler={setTedarikciler} giderler={giderler} giderTanimlari={giderTanimlari}
          hesapHareketleri={hesapHareketleri} giderTurleri={giderTurleri} yururlukAy={yururlukAy} bugun={bugun} kasaHesaplari={kasaHesaplari}
          rapor={rapor && !rapor.yururlukOncesi ? rapor : null} canDo={canDo} showToast={showToast} serverPermissions={serverPermissions} />
      )}
      {gorunum === "karlilik" && aralikGecerli && makinaMaliyet && (
        <MakinaKarliligi sonuc={makinaMaliyet} baslangic={baslangic} bitis={bitis} rates={rates} bugun={bugun} modeller={modeller} />
      )}
      {gorunum === "partiler" && (
        <UretimPartileri uretimPartileri={uretimPartileri} setUretimPartileri={setUretimPartileri} stock={stock} customers={customers}
          makinaMaliyet={makinaMaliyet} canDo={canDo} showToast={showToast} serverPermissions={serverPermissions} />
      )}
      {gorunum === "standart" && (
        <StandartGiderler standartGiderler={standartGiderler} setStandartGiderler={setStandartGiderler} canDo={canDo} showToast={showToast} serverPermissions={serverPermissions} />
      )}

      {planKalemi && (
        <OdemePlaniPenceresi kalem={planKalemi} davranis={turMap.get(String(planKalemi.turId))?.davranis || DAVRANIS.NORMAL} turAd={turMap.get(String(planKalemi.turId))?.ad || "Gider"}
          odemeYetkisi={canDo("gider_odeme")} onIsaretle={satirIsaretle} onClose={() => setPlanKalemId(null)} />
      )}
      {odemeKalemi && (
        <OdemeKayitPenceresi kalem={odemeKalemi} davranis={turMap.get(String(odemeKalemi.turId))?.davranis || DAVRANIS.NORMAL} turAd={turMap.get(String(odemeKalemi.turId))?.ad || "Gider"}
          turMap={turMap} hedef={odemeHedefi.hedef} hareketler={hesapHareketleri || []} hesaplar={kasaHesaplari} hesapSecimi={kasaYetki}
          odemeYetkisi={canDo("gider_odeme") && !!setHesapHareketleri} bugun={bugun} onKaydet={odemeKaydet} onSil={odemeSil} onClose={() => setOdemeHedefi(null)} giderler={giderlerHam} yururlukAy={yururlukAy} />
      )}
      {form && (
        <GiderForm kalem={form.kalem} giderTurleri={giderTurleri} tedarikciler={tedarikciler} calisanlar={calisanlar} stock={stock} customers={customers}
          modeller={modeller} giderler={liveGiderler} giderAyarlari={giderAyarlari} kdvRates={kdvRates} odemeDegistirebilir={canDo("gider_odeme") && !!setHesapHareketleri}
          hesaplar={kasaHesaplari} hareketler={hesapHareketleri || []} hesapSecimi={kasaYetki}
          onSave={kaydet} onCancel={() => setForm(null)} />
      )}
      {silinecek && (
        <ConfirmDialog title="Gider silinsin mi?" message={`${fmtTR(silinecek.tarih)} tarihli “${silinecek.aciklama || silinecek.calisanAd || "gider"}” kalemi Çöp Kutusu'na taşınacak. 30 gün içinde geri alınabilir.${silinecek.tanimId != null ? " Tekrarlayan tanımdan geldiği için o ay yeniden üretilmez." : ""}`}
          confirmLabel="Çöp Kutusuna Taşı" onConfirm={sil} onCancel={() => setSilinecek(null)} />
      )}
    </div>
  );
};
