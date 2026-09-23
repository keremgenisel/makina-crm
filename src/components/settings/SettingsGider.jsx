import { useState } from "react";
import { Icon, Field, Btn } from "../ui";
import { Section } from "./Section";
import { esikAltiKalemSayisi, tutarCoz } from "../../lib/gider";
import { TutarInput, AyInput, HataMetni, Ipucu, tutarMetni } from "../gider/GiderAlanlari";

// Gider ayarları (spec 0001 R6, R10): varsayılan kira stopaj oranı ve gider takibinin yürürlük ayı.
// appSettings.giderAyarlari sunucu-paylaşımlıdır (disAppSettingsSuz'a girmez). Varsayılan resmi aylık
// işveren maliyeti de bu nesnede durur ama Firma Çalışanları ekranında düzenlenir (plan K20).
export const SettingsGider = ({ appSettings, setAppSettings, giderler = [], flash = () => {}, canDo = () => true }) => {
  const mevcut = appSettings?.giderAyarlari || {};
  const [form, setForm] = useState({ stopajOrani: tutarMetni(mevcut.stopajOrani ?? 20), yururlukAy: mevcut.yururlukAy || "" });
  const [hata, setHata] = useState("");
  const yonetebilir = canDo("gider_tanim");
  const esikAlti = esikAltiKalemSayisi(giderler, form.yururlukAy || null);

  const kaydet = () => {
    const s = tutarCoz(form.stopajOrani);
    if (s.gecersiz || s.deger < 0 || s.deger >= 100) { setHata("Stopaj oranı 0 ile 100 arasında olmalı."); return; }
    setHata("");
    setAppSettings(p => ({ ...p, giderAyarlari: { ...(p?.giderAyarlari || {}), stopajOrani: s.deger, yururlukAy: form.yururlukAy || null } }));
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
