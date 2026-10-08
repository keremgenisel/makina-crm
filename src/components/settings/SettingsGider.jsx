import { useState } from "react";
import { Icon, Field, Btn } from "../ui";
import { KartBolum } from "../tasarim";
import { esikAltiKalemSayisi, tutarCoz, kisitOranCoz, varsayilanIndirilebilirOran, KISIT_ORAN_VARSAYILAN } from "../../lib/gider";
import { TutarInput, AyInput, tutarMetni } from "../gider/GiderAlanlari";
import { HataMetni, Ipucu, Segment } from "../tasarim";
import { ORTAK_KAYNAK, ORTAK_KAYNAK_ETIKET } from "../../lib/makinaMaliyeti";
import { hatirlatmaEsikDogrula, hatirlatmaEsigi } from "../../lib/odemeHatirlatma";
import { hesapsizBaslangicDogrula, denemeDonemiBitisi } from "../../lib/kasa";
import { fmtTR, yerelBugun } from "../../lib/utils";

// Gider ayarları (spec 0001 R6, R10): varsayılan kira stopaj oranı ve gider takibinin yürürlük ayı.
// appSettings.giderAyarlari sunucu-paylaşımlıdır (disAppSettingsSuz'a girmez). Varsayılan resmi aylık
// işveren maliyeti de bu nesnede durur ama Firma Çalışanları ekranında düzenlenir (plan K20).
export const SettingsGider = ({ appSettings, setAppSettings, giderler = [], flash = () => {}, canDo = () => true }) => {
  const mevcut = appSettings?.giderAyarlari || {};
  const [form, setForm] = useState({ stopajOrani: tutarMetni(mevcut.stopajOrani ?? 20), yururlukAy: mevcut.yururlukAy || "",
    ortakGiderKaynagi: mevcut.ortakGiderKaynagi === ORTAK_KAYNAK.STANDART ? ORTAK_KAYNAK.STANDART : ORTAK_KAYNAK.GERCEK,
    hatirlatmaEsikGun: String(hatirlatmaEsigi(mevcut)), hesapsizBaslangic: mevcut.hesapsizBaslangic || "",
    indirilebilirOran: String(varsayilanIndirilebilirOran(mevcut)), // spec 0076 R34
    // Spec 0056 R1, R2 (Q5): alan hiç yoksa varsayılan tarih gösterilir ve kaydedilir; boş = deneme dönemi kapalı.
    denemeDonemiBitis: denemeDonemiBitisi(mevcut) || "" });
  const [hata, setHata] = useState("");
  const yonetebilir = canDo("gider_tanim");
  const esikAlti = esikAltiKalemSayisi(giderler, form.yururlukAy || null);

  const kaydet = () => {
    const s = tutarCoz(form.stopajOrani);
    if (s.gecersiz || s.deger < 0 || s.deger >= 100) { setHata("Stopaj oranı 0 ile 100 arasında olmalı."); return; }
    // Spec 0003 R5, AC-23: 0–365 tam sayı; geçersizse hiçbir alan kaydedilmez, neden yazılır.
    const e = hatirlatmaEsikDogrula(form.hatirlatmaEsikGun);
    if (e.hata) { setHata(e.hata); return; }
    // Spec 0076 R34, AC-8, AC-41: 0–100 tam sayı; geçersizse kayıt yok ve neden yazılır. Boş = varsayılana (70) dönüş.
    const io = kisitOranCoz(form.indirilebilirOran);
    if (io.hata) { setHata(io.hata); return; }
    // Spec 0051 R14, R15 (AC-9): biçimsiz ya da gelecek tarih kaydedilmez; boş = eşik yok.
    const b = hesapsizBaslangicDogrula(form.hesapsizBaslangic, yerelBugun());
    if (b.hata) { setHata(b.hata); return; }
    // Spec 0056 Q5: biçimsiz tarih kaydedilmez; geçmiş tarih serbest (dönemi kapatmanın bir yolu).
    const deneme = String(form.denemeDonemiBitis || "").trim();
    if (deneme && !/^\d{4}-\d{2}-\d{2}$/.test(deneme)) { setHata("Deneme dönemi bitiş tarihi geçerli bir tarih değil."); return; }
    setHata("");
    setAppSettings(p => ({ ...p, giderAyarlari: { ...(p?.giderAyarlari || {}), stopajOrani: s.deger, yururlukAy: form.yururlukAy || null, ortakGiderKaynagi: form.ortakGiderKaynagi, hatirlatmaEsikGun: e.deger, indirilebilirOran: io.bos ? null : io.deger, hesapsizBaslangic: b.deger, denemeDonemiBitis: deneme } }));
    flash("ok", "Gider ayarları kaydedildi.");
  };

  return (
    <KartBolum title="Gider Ayarları" icon="gider">
      <div className="section-desc">Sunucudaki tüm kullanıcılar için ortaktır.</div>
      <div style={{ maxWidth: 520 }}>
        <div style={{ maxWidth: 260 }}>
          <Field label="Varsayılan kira stopaj oranı">
            <TutarInput sym="%" ariaLabel="Varsayılan kira stopaj oranı" value={form.stopajOrani} disabled={!yonetebilir} onChange={v => setForm(p => ({ ...p, stopajOrani: v }))} />
            <Ipucu>Yeni kira kaleminde ön doldurulur; kalem bazında değiştirilebilir. Üretilmiş kalemler bu ayar değişince değişmez.</Ipucu>
          </Field>
          <Field label="Binek araç giderlerinde indirilebilir oran">
            <TutarInput sym="%" ariaLabel="Binek araç giderlerinde indirilebilir oran" value={form.indirilebilirOran} disabled={!yonetebilir} onChange={v => setForm(p => ({ ...p, indirilebilirOran: v }))} />
            <Ipucu>"Gider kısıtlaması uygulanıyor (binek araç)" işaretlenen kalemde ön doldurulur; kalem bazında değiştirilebilir. 0 ile 100 arası tam sayı; boş bırakılırsa %{KISIT_ORAN_VARSAYILAN} kullanılır.</Ipucu>
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
        {/* Spec 0056 R1–R4: deneme döneminde kasa hesabı (hareketi olsa da) silinebilir, hareketleri taşınabilir. */}
        <div style={{ maxWidth: 360 }}>
          <Field label="Deneme dönemi bitiş tarihi">
            <input aria-label="Deneme dönemi bitiş tarihi" type="date" className="input" value={form.denemeDonemiBitis} disabled={!yonetebilir}
              onChange={e => setForm(p => ({ ...p, denemeDonemiBitis: e.target.value }))} style={{ width: 170 }} />
            <Ipucu>Bu tarihe kadar (o gün hariç) Kasa'da hareketi olan hesap da silinebilir ve hareketleri başka hesaba taşınabilir. Tarih gelince hareketi olan hesap yine yalnız kapatılabilir. Boş bırakılırsa deneme dönemi hemen biter.</Ipucu>
          </Field>
        </div>
        {/* Spec 0051 R3, R4 (Q7): Kasa'nın hesapsız iş listesi bu günden sonrasını gösterir; bakiye ve raporlar etkilenmez. */}
        <div style={{ maxWidth: 360 }}>
          <Field label="Hesapsız kayıt başlangıç tarihi">
            <input aria-label="Hesapsız kayıt başlangıç tarihi" type="date" className="input" value={form.hesapsizBaslangic} disabled={!yonetebilir}
              onChange={e => setForm(p => ({ ...p, hesapsizBaslangic: e.target.value }))} style={{ width: 170 }} />
            <Ipucu>Kasa'daki hesabı belirtilmemiş ödeme ve tahsilat listesi bu tarihten önceki kayıtları göstermez; kayıtlar silinmez, bakiye ve raporlar değişmez. Boş bırakılırsa bütün kayıtlar görünür.</Ipucu>
            {!form.hesapsizBaslangic && form.yururlukAy && yonetebilir && (
              <div data-testid="hesapsiz-baslangic-oneri" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginTop: 4 }}>
                <span style={{ color: "var(--n600, #475569)" }}>Öneri: {fmtTR(`${form.yururlukAy}-01`)} (gider takibi yürürlük ayının başı)</span>
                <Btn small variant="ghost" onClick={() => setForm(p => ({ ...p, hesapsizBaslangic: `${p.yururlukAy}-01` }))}>Öneriyi kullan</Btn>
              </div>
            )}
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
    </KartBolum>
  );
};
