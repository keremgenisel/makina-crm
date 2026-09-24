import { useState } from "react";
import { Icon, Field, Btn } from "../ui";
import { Section } from "./Section";
import { esikAltiKalemSayisi, tutarCoz } from "../../lib/gider";
import { TutarInput, AyInput, HataMetni, Ipucu, tutarMetni, Segment } from "../gider/GiderAlanlari";
import { ORTAK_KAYNAK, ORTAK_KAYNAK_ETIKET } from "../../lib/makinaMaliyeti";
import { hatirlatmaEsikDogrula, hatirlatmaEsigi } from "../../lib/odemeHatirlatma";

// Gider ayarları (spec 0001 R6, R10): varsayılan kira stopaj oranı ve gider takibinin yürürlük ayı.
// appSettings.giderAyarlari sunucu-paylaşımlıdır (disAppSettingsSuz'a girmez). Varsayılan resmi aylık
// işveren maliyeti de bu nesnede durur ama Firma Çalışanları ekranında düzenlenir (plan K20).
export const SettingsGider = ({ appSettings, setAppSettings, giderler = [], flash = () => {}, canDo = () => true }) => {
  const mevcut = appSettings?.giderAyarlari || {};
  const [form, setForm] = useState({ stopajOrani: tutarMetni(mevcut.stopajOrani ?? 20), yururlukAy: mevcut.yururlukAy || "",
    ortakGiderKaynagi: mevcut.ortakGiderKaynagi === ORTAK_KAYNAK.STANDART ? ORTAK_KAYNAK.STANDART : ORTAK_KAYNAK.GERCEK,
    hatirlatmaEsikGun: String(hatirlatmaEsigi(mevcut)) });
  const [hata, setHata] = useState("");
  const yonetebilir = canDo("gider_tanim");
  const esikAlti = esikAltiKalemSayisi(giderler, form.yururlukAy || null);

  const kaydet = () => {
    const s = tutarCoz(form.stopajOrani);
    if (s.gecersiz || s.deger < 0 || s.deger >= 100) { setHata("Stopaj oranı 0 ile 100 arasında olmalı."); return; }
    // Spec 0003 R5, AC-23: 0–365 tam sayı; geçersizse hiçbir alan kaydedilmez, neden yazılır.
    const e = hatirlatmaEsikDogrula(form.hatirlatmaEsikGun);
    if (e.hata) { setHata(e.hata); return; }
    setHata("");
    setAppSettings(p => ({ ...p, giderAyarlari: { ...(p?.giderAyarlari || {}), stopajOrani: s.deger, yururlukAy: form.yururlukAy || null, ortakGiderKaynagi: form.ortakGiderKaynagi, hatirlatmaEsikGun: e.deger } }));
    flash("ok", "Gider ayarları kaydedildi.");
  };

  return (
    <Section title="Gider Ayarları" icon="gider">
      <div className="section-desc">Sunucudaki tüm kullanıcılar için ortaktır.</div>
      <div style={{ maxWidth: 520 }}>
        <div style={{ maxWidth: 260 }}>
          <Field label="Varsayılan kira stopaj oranı">
            <TutarInput sym="%" ariaLabel="Varsayılan kira stopaj oranı" value={form.stopajOrani} disabled={!yonetebilir} onChange={v => setForm(p => ({ ...p, stopajOrani: v }))} />
            <Ipucu>Yeni kira kaleminde ön doldurulur; kalem bazında değiştirilebilir. Üretilmiş kalemler bu ayar değişince değişmez.</Ipucu>
          </Field>
          <Field label="Gider takibi yürürlük ayı">
            <AyInput ariaLabel="Gider takibi yürürlük ayı" value={form.yururlukAy} onChange={v => setForm(p => ({ ...p, yururlukAy: v }))} />
            <Ipucu>Seçilen ay dahildir. Bu aydan önceki dönemler için rapor rakam üretmez, “gider verisi girilmemiş” gösterir. Boş bırakılırsa eşik uygulanmaz.</Ipucu>
          </Field>
        </div>
        {/* Spec 0002 R22, C4-3, C8: makina maliyetinde ortak gider payının kaynağı. İki kaynak asla toplanmaz. */}
        <Field label="Makina maliyetinde ortak gider kaynağı">
          <Segment ariaLabel="Ortak gider kaynağı" disabled={!yonetebilir}
            options={[ORTAK_KAYNAK.GERCEK, ORTAK_KAYNAK.STANDART].map(v => ({ value: v, label: ORTAK_KAYNAK_ETIKET[v] }))}
            value={form.ortakGiderKaynagi} onChange={v => setForm(p => ({ ...p, ortakGiderKaynagi: v }))} />
          <Ipucu>Yalnız ortak gider payını etkiler; makinaya ve modele atanmış giderler her zaman gerçekleşen kayıtlardan gelir. Bu ayar sunucu üzerinden paylaşılır: değiştirildiğinde bütün kullanıcıların gördüğü maliyet ve kâr rakamı değişir.</Ipucu>
        </Field>
        {/* Spec 0003 R5: ödeme hatırlatıcısının eşik günü (Anasayfa kartı ve Giderler süzgeci). */}
        <div style={{ maxWidth: 260 }}>
          <Field label="Ödeme hatırlatma eşiği (gün)">
            <input aria-label="Ödeme hatırlatma eşiği (gün)" className="input" inputMode="numeric" value={form.hatirlatmaEsikGun} disabled={!yonetebilir}
              onChange={e => setForm(p => ({ ...p, hatirlatmaEsikGun: e.target.value }))} style={{ width: 100 }} />
            <Ipucu>Vadesine bu kadar gün (bugün dahil) kalan ödenmemiş kalemler Anasayfa'da "yaklaşan" sayılır. 0 ile 365 arası; varsayılan 7.</Ipucu>
          </Field>
        </div>
        {esikAlti > 0 && (
          <div role="alert" style={{ background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>
            <b style={{ color: "var(--amb700, #b45309)" }}>Eşiğin altında {esikAlti} gider kalemi kaldı.</b>
            <div style={{ marginTop: 2, color: "var(--n700, #334155)" }}>Kalemler silinmez; yalnız raporlarda görünmez. Eşiği geri alırsanız tekrar görünürler.</div>
          </div>
        )}
        <HataMetni>{hata}</HataMetni>
        <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginBottom: 12 }}>Varsayılan resmi aylık işveren maliyeti Firma › Firma Çalışanları ekranındadır.</div>
        {yonetebilir && <Btn onClick={kaydet}><Icon name="check" size={14} /> Kaydet</Btn>}
      </div>
    </Section>
  );
};
