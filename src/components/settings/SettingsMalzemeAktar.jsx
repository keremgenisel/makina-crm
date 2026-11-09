import { useState, useMemo } from "react";
import { uid } from "../../lib/utils";
import { logAction } from "../../lib/audit";
import { Field, Input, Btn } from "../ui";
import { Ipucu, BolumBasligi, UyariSeridi, HataMetni } from "../tasarim";
import {
  aktarmaPlani, kitleriUygula, dogrulamaTuru, calismaKitabiniOku, boyutHatasi, partiGirdiHatalari, varsayilanGirdiler, SAYFALAR, MODEL_ONEKLERI,
  PANEL_IPUCU, DOSYA_SEC, AKTAR_DUGMESI, ON_KOSUL_BASLIGI, KAPSAM_DISI_METNI, PARTI_ETIKETI, MODEL_ADET_ETIKETI, MODEL_ADET_IPUCU,
  SONUC_BASLIGI, ONIZLEME_BASLIGI, RAPOR, SATIR_ETIKETI, ATLANAN_SATIR, KESIRLI_SATIR, EKSIK_KIT_SATIRI, dogrulamaMetni, DOGRULAMA_EKSIK_IPUCU, DOSYA_OKUNAMADI,
} from "../../lib/malzemeListesiAktarma";

// Spec 0139 B: Ayarlar › Veri Yönetimi › "Malzeme Listesinden Aktar". Kararların hepsi saf modülde (C3); ekran dosyayı okur, önizlemeyi
// gösterir ve onaylanınca planı uygular. Yazım tam dizilerde işlevsel güncelleyicilerle (çöptekiler korunur). Ham HTML ve yazdırma yok
// (AC-42). Panel `ayar:malzemeaktar` kilidi altında çizilir (Settings, AYAR_KILITLI); kayıt anında parça ve model panellerinin
// kilidine anlık bakılır (B-R1/2, 0087 R16 emsali).
const onizlemeKimligi = () => { let n = 0; return () => `onizleme-${++n}`; };

const Liste = ({ testId, baslik, satirlar, metin = SATIR_ETIKETI }) => (satirlar.length === 0 ? null : (
  <div data-testid={testId} style={{ marginTop: 8 }}>
    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{baslik}</div>
    <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12.5 }}>{satirlar.map((r, i) => <li key={i}>{metin(r)}</li>)}</ul>
  </div>
));

const Rapor = ({ rapor, testId }) => (
  <div data-testid={testId} style={{ fontSize: 13, display: "grid", gap: 2 }}>
    <div data-testid="rapor-parca">{RAPOR.parca(rapor.parca)}</div>
    <div data-testid="rapor-kit">{RAPOR.kit(rapor.kit)}</div>
    <div data-testid="rapor-maliyetsiz">{RAPOR.maliyetsiz(rapor.maliyetsiz)}</div>
    {rapor.kapsamDisi.length > 0 && <div data-testid="rapor-kapsam-disi">{KAPSAM_DISI_METNI(rapor.kapsamDisi.length)}</div>}
    {rapor.ayniAd.length > 0 && <div data-testid="rapor-ayni-ad">{RAPOR.ayniAd(rapor.ayniAd.reduce((t, a) => t + a.satirlar, 0), rapor.atlananKit)}</div>}
    <Liste testId="rapor-atlanan" baslik={RAPOR.atlanan(rapor.atlanan.length)} satirlar={rapor.atlanan} metin={ATLANAN_SATIR} />
    <Liste testId="rapor-ayni-ad-listesi" baslik={RAPOR.ayniAd(rapor.ayniAd.reduce((t, a) => t + a.satirlar, 0), rapor.atlananKit)} satirlar={rapor.ayniAd} metin={a => a.ad} />
    <Liste testId="rapor-modelsiz" baslik={RAPOR.modelsiz(rapor.modelsiz.length)} satirlar={rapor.modelsiz} />
    <Liste testId="rapor-dogrulanmali" baslik={RAPOR.dogrulanmali(rapor.dogrulanmali.length)} satirlar={rapor.dogrulanmali} />
    <Liste testId="rapor-kesirli" baslik={RAPOR.kesirli(rapor.kesirli.length)} satirlar={rapor.kesirli} metin={KESIRLI_SATIR} />
  </div>
);

export const SettingsMalzemeAktar = ({ parts = [], setParts, malzemeler = [], standardModels = [], setStandardModels, customModels = [], setCustomModels,
  kilitliIse = () => false, showToast = () => {}, serverPermissions = null, ilkSayfalar = null }) => {
  // `ilkSayfalar`: okunmuş kitapla açılış (yalnız görüntü aracı; uygulama vermez, panel dosya seçimiyle başlar).
  const [sayfalar, setSayfalar] = useState(ilkSayfalar);
  const [hata, setHata] = useState(null);
  const [girdiler, setGirdiler] = useState(varsayilanGirdiler);
  const [sonuc, setSonuc] = useState(null); // { kitler, rapor }
  const onizleme = useMemo(() => (sayfalar ? aktarmaPlani({ sayfalar, malzemeler, parts, standardModels, customModels, girdiler, yeniId: onizlemeKimligi() }) : null),
    [sayfalar, malzemeler, parts, standardModels, customModels, girdiler]);
  // B-R13/2, karar 41 (AC-72): doğrulama canlı; model dizileri değişince yeniden sayılır.
  const dogrulama = useMemo(() => (sonuc ? dogrulamaTuru(sonuc.kitler, standardModels, customModels) : null), [sonuc, standardModels, customModels]);

  const dosyaSecildi = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setHata(null); setSayfalar(null); setSonuc(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const XLSX = await import("xlsx");
        const r = calismaKitabiniOku(XLSX, new Uint8Array(ev.target.result), { boyut: f.size });
        if (r.hata) { setHata(r.hata); return; }
        setSayfalar(r.sayfalar);
      } catch { setHata(DOSYA_OKUNAMADI); }
    };
    // C5, AC-73: 20 MB sınırı dosya okunmadan uygulanır.
    if (boyutHatasi(f.size)) { setHata(boyutHatasi(f.size)); return; }
    reader.readAsArrayBuffer(f);
  };

  const yaz = () => {
    if (kilitliIse("ayar", "yedekparca", undefined, showToast) || kilitliIse("ayar", "models", undefined, showToast)) return; // AC-57
    if (Object.keys(partiGirdiHatalari(girdiler)).length) return;
    const p = aktarmaPlani({ sayfalar, malzemeler, parts, standardModels, customModels, girdiler, yeniId: uid });
    if (p.hata || p.onKosul.length) return;
    if (p.parcalar.length) setParts(x => [...x, ...p.parcalar]);
    if (p.kitler.length) {
      setStandardModels?.(m => kitleriUygula(m, p.kitler));
      setCustomModels?.(m => kitleriUygula(m, p.kitler));
    }
    logAction({ serverPermissions, action: "ice_aktarildi", entity: "parca_tanimi", entityName: `${p.parcalar.length} parça`,
      detail: { parca: p.parcalar.length, kit: p.rapor.kit, atlanan: p.rapor.atlanan.length + p.rapor.ayniAd.length } }); // B-R12/2
    setSonuc({ kitler: p.kitler, rapor: p.rapor });
    setSayfalar(null);
    showToast(`${p.parcalar.length} parça ve ${p.rapor.kit} kit satırı yazıldı.`);
  };

  const setGirdi = (tur, anahtar, v) => setGirdiler(g => ({ ...g, [tur]: { ...g[tur], [anahtar]: v } }));
  const partiHatalari = partiGirdiHatalari(girdiler); // triyaj (bulgu 4)
  const hazir = onizleme && !onizleme.hata && onizleme.onKosul.length === 0 && Object.keys(partiHatalari).length === 0;

  return (
    <div data-testid="malzeme-aktar">
      <Ipucu>{PANEL_IPUCU}</Ipucu>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
        {SAYFALAR.map(s => (
          <Field key={s.ad} label={PARTI_ETIKETI(s.ad)}>
            <Input value={girdiler.parti[s.ad]} onChange={e => setGirdi("parti", s.ad, e.target.value)} aria-label={PARTI_ETIKETI(s.ad)} />
            <HataMetni>{partiHatalari[s.ad]}</HataMetni>
          </Field>
        ))}
        {MODEL_ONEKLERI.map(o => (
          <Field key={o} label={MODEL_ADET_ETIKETI(o)}>
            <Input value={girdiler.modelAdet[o]} onChange={e => setGirdi("modelAdet", o, e.target.value)} placeholder="—" aria-label={MODEL_ADET_ETIKETI(o)} />
          </Field>
        ))}
      </div>
      <Ipucu>{MODEL_ADET_IPUCU}</Ipucu>
      <div style={{ marginTop: 12 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {DOSYA_SEC}
          <input type="file" accept=".xlsx,.xls" aria-label="Malzeme listesi dosyası" onChange={dosyaSecildi} />
        </label>
      </div>
      {hata && <div data-testid="malzeme-aktar-hata"><HataMetni>{hata}</HataMetni></div>}
      {onizleme?.hata && <div data-testid="malzeme-aktar-hata"><HataMetni>{onizleme.hata}</HataMetni></div>}

      {onizleme && !onizleme.hata && (
        <div data-testid="malzeme-aktar-onizleme" style={{ marginTop: 12 }}>
          <BolumBasligi>{ONIZLEME_BASLIGI}</BolumBasligi>
          {onizleme.onKosul.length > 0 && (
            <UyariSeridi aile="uyari"><div data-testid="malzeme-aktar-on-kosul">{ON_KOSUL_BASLIGI} {onizleme.onKosul.join(", ")}</div></UyariSeridi>
          )}
          <Rapor rapor={onizleme.rapor} testId="malzeme-aktar-onizleme-raporu" />
          <div style={{ marginTop: 10 }}>
            <Btn testId="malzeme-aktar-yaz" disabled={!hazir || onizleme.rapor.parca === 0} onClick={yaz}>{AKTAR_DUGMESI}</Btn>
          </div>
        </div>
      )}

      {sonuc && (
        <div data-testid="malzeme-aktar-sonuc" style={{ marginTop: 12 }}>
          <BolumBasligi>{SONUC_BASLIGI}</BolumBasligi>
          <UyariSeridi aile={dogrulama.eksik.length ? "uyari" : "basari"}><span data-testid="malzeme-aktar-dogrulama">{dogrulamaMetni(dogrulama)}</span></UyariSeridi>
          {dogrulama.eksik.length > 0 && (<>
            <Ipucu>{DOGRULAMA_EKSIK_IPUCU}</Ipucu>
            <Liste testId="malzeme-aktar-eksik-kit" baslik="" satirlar={dogrulama.eksik} metin={EKSIK_KIT_SATIRI} />
          </>)}
          <Rapor rapor={sonuc.rapor} testId="malzeme-aktar-sonuc-raporu" />
        </div>
      )}
    </div>
  );
};
