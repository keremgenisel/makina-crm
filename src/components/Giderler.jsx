import { useState, useMemo } from "react";
import { uid, today, fmtTR, withDeleted } from "../lib/utils";
import { makeCanDo } from "../lib/permissions";
import { logAction, snapshotOnceki } from "../lib/audit";
import {
  hesaplaGiderRaporu, borcOzeti, tekrarlayanUret, kdvKarsilastir, tamAylar, yururlukKapsami, turHaritasi, canliModelSeti,
  ayOf, ayEkle, ayinSonGunu,
} from "../lib/gider";
import { hesaplananKdvAylar } from "../lib/giderKdv";
import { Icon, Btn, ConfirmDialog } from "./ui";
import { GiderForm } from "./GiderForm";
import { Segment, tl2 } from "./gider/GiderAlanlari";
import { StatKart, KovaKarti, TurKirilimi, TedarikciKirilimi, BorcOzeti, KalemListesi } from "./gider/DonemRaporu";
import { KdvKarsilastirmaKarti } from "./gider/KdvKarsilastirmaKarti";
import { MakinaModelGorunumu } from "./gider/MakinaModelGorunumu";
import { Tedarikciler } from "./gider/Tedarikciler";
import { StandartGiderler } from "./gider/StandartGiderler";

// Giderler üst sekmesi (spec 0001, C14). Yalnız gider yetkisi olan kullanıcıya görünür (C6 kural 3).
// Hesaplar saf motorda (lib/gider.js); bu bileşen yalnız gösterir ve kayıtları yazar. Satış KDV'si
// aylık rapor motorundan alınır, yeniden hesaplanmaz (C10, lib/giderKdv.js).
const ayAdi = (ay) => { const [y, m] = ay.split("-").map(Number); const s = new Date(y, m - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }); return s.charAt(0).toLocaleUpperCase("tr") + s.slice(1); };
const GORUNUMLER = [{ value: "rapor", label: "Dönem Raporu" }, { value: "makina", label: "Makina ve Model" }, { value: "tedarikci", label: "Tedarikçiler" }, { value: "standart", label: "Standart Genel Giderler" }];

export const Giderler = ({
  giderler = [], setGiderler, giderTanimlari = [], setGiderTanimlari, giderTurleri = [], tedarikciler = [], setTedarikciler,
  standartGiderler = [], setStandartGiderler, calisanlar = [], stock = [], customers = [], standardModels = [], customModels = [],
  appSettings = {}, kdvRates, factory = null, rates = null, satisVerisi = {}, serverPermissions = null, showToast = () => {},
}) => {
  const canDo = makeCanDo(serverPermissions, "giderActions");
  const bugun = today();
  const [gorunum, setGorunum] = useState("rapor");
  const [mod, setMod] = useState("ay");
  const [ay, setAy] = useState(ayOf(bugun));
  const [aralik, setAralik] = useState({ bas: `${ayOf(bugun)}-01`, bit: bugun });
  const [form, setForm] = useState(null);       // null | {kalem}
  const [silinecek, setSilinecek] = useState(null);
  const [uretimSonucu, setUretimSonucu] = useState(null);
  const giderAyarlari = appSettings?.giderAyarlari || {};
  const yururlukAy = giderAyarlari.yururlukAy || null;
  const turMap = useMemo(() => turHaritasi(giderTurleri), [giderTurleri]);
  const canliModeller = useMemo(() => canliModelSeti(standardModels, customModels), [standardModels, customModels]);
  const modeller = useMemo(() => [...standardModels, ...customModels.filter(m => !m.deletedAt)], [standardModels, customModels]);

  const baslangic = mod === "ay" ? `${ay}-01` : aralik.bas;
  const bitis = mod === "ay" ? ayinSonGunu(ay) : aralik.bit;
  const aralikGecerli = !!baslangic && !!bitis && baslangic <= bitis;
  const donemEtiketi = mod === "ay" ? ayAdi(ay) : `${fmtTR(aralik.bas)} – ${fmtTR(aralik.bit)}`;

  const rapor = useMemo(() => (aralikGecerli ? hesaplaGiderRaporu(
    { giderler, turler: giderTurleri, tedarikciler, stock, customers, canliModeller, yururlukAy },
    { baslangic, bitis }, { bugun },
  ) : null), [aralikGecerli, giderler, giderTurleri, tedarikciler, stock, customers, canliModeller, yururlukAy, baslangic, bitis, bugun]);
  const borc = useMemo(() => borcOzeti(giderler, { turler: giderTurleri, tedarikciler, yururlukAy }, bugun), [giderler, giderTurleri, tedarikciler, yururlukAy, bugun]);

  // KDV karşılaştırması (R9, K1, K15): ay bazlı; kapsam içindeki aralık tam aylardan oluşmalı.
  const kdv = useMemo(() => {
    if (!rapor) return null;
    if (rapor.yururlukOncesi) return { durum: "oncesi" };
    const etkin = yururlukKapsami({ baslangic, bitis }, yururlukAy).etkinBaslangic;
    const aylar = tamAylar(etkin, bitis);
    if (!aylar) return { durum: "kismi" };
    const hesaplanan = hesaplananKdvAylar(satisVerisi, aylar, { factoryName: factory?.name || "Altuntaş Makina", kdvRates, factory, rates });
    return { durum: "tamam", sonuc: kdvKarsilastir(hesaplanan, rapor.indirilecekKdv) };
  }, [rapor, baslangic, bitis, yururlukAy, satisVerisi, factory, kdvRates, rates]);

  const uretimAyi = mod === "ay" ? ay : ayOf(bugun);
  const uret = () => {
    const u = tekrarlayanUret(giderTanimlari, giderler, uretimAyi, { turMap, calisanlar, giderAyarlari, kdvRates, uid });
    if (u.yeniKalemler.length) setGiderler(p => [...p, ...u.yeniKalemler]);
    setGiderTanimlari(() => u.guncelTanimlar);
    logAction({ serverPermissions, action: "tekrar_uretildi", entity: "gider", entityName: uretimAyi, detail: { ay: uretimAyi, eklenen: u.eklenen, zatenVardi: u.zatenVardi } });
    setUretimSonucu({ ay: uretimAyi, ...u });
    showToast(`${ayAdi(uretimAyi)}: ${u.eklenen} kalem eklendi, ${u.zatenVardi} kalem zaten vardı.`);
  };

  const kaydet = (kayit) => {
    if (kayit.id == null) {
      const yeni = { ...kayit, id: uid() };
      setGiderler(p => [...p, yeni]);
      logAction({ serverPermissions, action: "olusturuldu", entity: "gider", entityId: yeni.id, entityName: yeni.aciklama || yeni.calisanAd || "" });
      showToast("Gider kaydedildi.");
    } else {
      const eski = giderler.find(k => k.id === kayit.id);
      setGiderler(p => p.map(k => (k.id === kayit.id ? { ...k, ...kayit } : k)));
      logAction({ serverPermissions, action: "duzenlendi", entity: "gider", entityId: kayit.id, entityName: kayit.aciklama || kayit.calisanAd || "", detail: { onceki: snapshotOnceki(eski) } });
      showToast("Gider güncellendi.");
    }
    setForm(null);
  };
  const odendiDegistir = (k) => {
    const odendi = !k.odendi;
    setGiderler(p => p.map(x => (x.id === k.id ? { ...x, odendi, odemeTarihi: odendi ? bugun : null } : x)));
    logAction({ serverPermissions, action: odendi ? "odendi" : "odeme_iptal", entity: "gider", entityId: k.id, entityName: k.aciklama || k.calisanAd || "" });
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

  const bosDurum = (baslikMetni, metin, eylemler) => (
    <div style={{ border: "1.5px dashed var(--n300, #cbd5e1)", borderRadius: 12, padding: "32px 20px", textAlign: "center", background: "var(--surface, #ffffff)" }} data-testid="gider-bos-durum">
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{baslikMetni}</div>
      <div style={{ fontSize: 13, color: "var(--n600, #475569)", maxWidth: 460, margin: "0 auto", lineHeight: 1.55 }}>{metin}</div>
      {eylemler && <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>{eylemler}</div>}
    </div>
  );
  const uyari = (renk, baslikMetni, metin, testId) => {
    const r = renk === "amber" ? ["var(--amb700, #b45309)", "var(--ambBg, #fffbeb)", "var(--ambBr, #fde68a)"] : renk === "yesil" ? ["var(--grn700, #15803d)", "var(--grnBg, #f0fdf4)", "var(--grnBr, #bbf7d0)"] : ["var(--blu700, #1d4ed8)", "var(--bluBg, #eff6ff)", "var(--bluBr, #bfdbfe)"];
    return <div role="status" data-testid={testId} style={{ background: r[1], border: `1px solid ${r[2]}`, borderRadius: 10, padding: "10px 14px", fontSize: 13 }}><b style={{ color: r[0] }}>{baslikMetni}</b>{metin && <div style={{ marginTop: 2, color: "var(--n700, #334155)" }}>{metin}</div>}</div>;
  };

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
        <div style={{ minWidth: 0, flex: "1 1 460px", maxWidth: 640 }}><Segment ariaLabel="Görünüm" options={GORUNUMLER} value={gorunum} onChange={setGorunum} /></div>
        {gorunum !== "standart" && donemSecici}
      </div>
      {giderTurleri.length === 0 && uyari("mavi", "Henüz gider türü tanımlı değil.", "Ayarlar › Giderler › Gider Türleri'nden türleri tanımlayın (önerilen türler tek tıkla eklenebilir).")}
      {uretimSonucu && uyari(uretimSonucu.eklenen ? "yesil" : "mavi",
        `${ayAdi(uretimSonucu.ay)}: ${uretimSonucu.eklenen} kalem eklendi, ${uretimSonucu.zatenVardi} kalem zaten vardı.`,
        [uretimSonucu.eklenen ? "Oluşturulan kalemler tek tek düzenlenebilir; tanım ve diğer aylar değişmez." : "Bir tanımdan bu ay için üretilip sonradan silinen kalemler yeniden oluşturulmaz.",
          ...uretimSonucu.atlanan.map(a => `${a.tanim.ad}: ${a.neden}`)].join(" "), "uretim-sonucu")}
      {!aralikGecerli && gorunum !== "standart" && uyari("amber", "Başlangıç tarihi bitişten sonra olamaz.")}

      {gorunum === "rapor" && rapor && (
        rapor.yururlukOncesi ? (
          <>
            {bosDurum("Gider verisi girilmemiş", `Gider takibi ${yururlukAy ? ayAdi(yururlukAy) : "yürürlük ayından"} itibaren geçerli. Seçili dönem (${donemEtiketi}) için rakam üretilmez.`)}
            <BorcOzeti ozet={borc} />
          </>
        ) : (
          <>
            {rapor.kapsamDisi && uyari("amber", `${fmtTR(rapor.kapsamDisi.baslangic)} – ${fmtTR(rapor.kapsamDisi.bitis)} arası kapsam dışı.`, `Gider takibi ${ayAdi(yururlukAy)} itibaren geçerli. Rapor ${fmtTR(yururlukKapsami({ baslangic, bitis }, yururlukAy).etkinBaslangic)} – ${fmtTR(bitis)} için üretildi.`, "kapsam-disi")}
            {rapor.mukerrerUyari.length > 0 && uyari("amber", "Aynı tanımdan bu dönemde birden fazla kalem var.",
              rapor.mukerrerUyari.map(m => `${m.aciklama || "Tanım"} (${m.donem}): ${m.kalemler.length} kalem`).join(", ") + ". İki kullanıcı aynı ayı aynı anda oluşturmuş olabilir; fazla olanı silin.", "mukerrer-uyari")}
            {rapor.bos ? bosDurum("Bu dönemde gider kaydı yok", "Sıfır tutarlı bir tablo yerine bu mesaj gösterilir.", eylemDugmeleri) : (
              <>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <StatKart etiket="Toplam gider (KDV hariç)" deger={tl2(rapor.toplam)} alt={`${rapor.kalemler.length} kalem · ödenmemiş dahil`} renk="#e85d1a" />
                  <StatKart etiket="Ödenmemiş gider (KDV hariç)" deger={tl2(rapor.odenmeyen)} alt={`${rapor.odenmeyenAdet} kalem · seçili dönem`} renk="#dc2626" />
                  <StatKart etiket="Tedarikçilere açık borç (KDV dâhil)" deger={tl2(rapor.tedarikciKirilimi.toplamBorc)} alt="Tüm dönemler, bugüne kadar" renk="#b91c1c" />
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
                  <BorcOzeti ozet={borc} />
                </div>
                <KalemListesi kalemler={rapor.kalemler} giderTurleri={giderTurleri} tedarikciler={tedarikciler} stock={stock} customers={customers}
                  standardModels={standardModels} customModels={customModels} bugun={bugun} canDo={canDo}
                  onDuzenle={(k) => setForm({ kalem: k })} onSil={setSilinecek} onOdendi={odendiDegistir} />
              </>
            )}
            {rapor.bos && <BorcOzeti ozet={borc} />}
          </>
        )
      )}
      {gorunum === "makina" && rapor && (rapor.yururlukOncesi
        ? bosDurum("Gider verisi girilmemiş", `Seçili dönem (${donemEtiketi}) yürürlük ayından önce.`)
        : <MakinaModelGorunumu rapor={rapor} turMap={turMap} />)}
      {gorunum === "tedarikci" && (
        <Tedarikciler tedarikciler={tedarikciler} setTedarikciler={setTedarikciler} giderler={giderler} giderTanimlari={giderTanimlari}
          rapor={rapor && !rapor.yururlukOncesi ? rapor : null} canDo={canDo} showToast={showToast} serverPermissions={serverPermissions} />
      )}
      {gorunum === "standart" && (
        <StandartGiderler standartGiderler={standartGiderler} setStandartGiderler={setStandartGiderler} canDo={canDo} showToast={showToast} serverPermissions={serverPermissions} />
      )}

      {form && (
        <GiderForm kalem={form.kalem} giderTurleri={giderTurleri} tedarikciler={tedarikciler} calisanlar={calisanlar} stock={stock} customers={customers}
          modeller={modeller} giderler={liveGiderler} giderAyarlari={giderAyarlari} kdvRates={kdvRates} odemeDegistirebilir={canDo("gider_odeme")}
          onSave={kaydet} onCancel={() => setForm(null)} />
      )}
      {silinecek && (
        <ConfirmDialog title="Gider silinsin mi?" message={`${fmtTR(silinecek.tarih)} tarihli “${silinecek.aciklama || silinecek.calisanAd || "gider"}” kalemi Çöp Kutusu'na taşınacak. 30 gün içinde geri alınabilir.${silinecek.tanimId != null ? " Tekrarlayan tanımdan geldiği için o ay yeniden üretilmez." : ""}`}
          confirmLabel="Çöp Kutusuna Taşı" onConfirm={sil} onCancel={() => setSilinecek(null)} />
      )}
    </div>
  );
};
