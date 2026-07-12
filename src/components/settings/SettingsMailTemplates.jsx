import { useState } from "react";
import { Icon, Field, Input, Btn, ConfirmDialog } from "../ui";
import { Section } from "./Section";
import { DEFAULT_MAIL_TEMPLATES } from "../../lib/mailTemplates";

// ── E-posta Şablonları ────────────────────────────────────────────────────────
// Evraklar e-posta ile gönderilirken taslağa dolan varsayılan konu ve mesaj metinleri.
// SettingsTakip deseni: değerler yerel taslakta tutulur, Kaydet ile appSettings.mailTemplates'e yazılır.
const SABLONLAR = [
  { key: "teklifProforma", baslik: "Teklif / Proforma", yertutucular: ["{tur}", "{firma}", "{no}", "{tarih}", "{firmaAdi}"] },
  { key: "teklifProformaEN", baslik: "Teklif / Proforma (İngilizce)", not: "Belgenin dili İngilizce seçildiğinde bu şablon kullanılır ({tur}: Quotation / Proforma Invoice).", yertutucular: ["{tur}", "{firma}", "{no}", "{tarih}", "{firmaAdi}"] },
  { key: "fatura", baslik: "Yurt Dışı Fatura (İngilizce)", not: "Bu belge yabancı alıcıya gittiği için İngilizce gönderilir.", yertutucular: ["{firma}", "{no}", "{tarih}", "{firmaAdi}"] },
  { key: "makinaRaporu", baslik: "Makina Servis ve Yedek Parça Raporu", yertutucular: ["{firma}", "{firmaAdi}"] },
  { key: "makinaRaporuEN", baslik: "Makina Servis ve Yedek Parça Raporu (İngilizce)", not: "Rapor İngilizce gönderildiğinde kullanılır.", yertutucular: ["{firma}", "{firmaAdi}"] },
  { key: "servisFormu", baslik: "Servis Formu", yertutucular: ["{firma}", "{firmaAdi}"] },
  { key: "servisFormuEN", baslik: "Servis Formu (İngilizce)", not: "Form İngilizce gönderildiğinde kullanılır.", yertutucular: ["{firma}", "{firmaAdi}"] },
  { key: "uretimFormu", baslik: "Kalıp Üretim Formu", yertutucular: ["{tarih}", "{firmaAdi}"] },
  { key: "disaAktarim", baslik: "Dışa Aktarım (rapor gönderimi)", yertutucular: ["{belge}", "{firmaAdi}"] },
];

const taslakOlustur = (saved) => {
  const o = {};
  for (const s of SABLONLAR) {
    o[s.key] = {
      konu: saved?.[s.key]?.konu ?? DEFAULT_MAIL_TEMPLATES[s.key].konu,
      metin: saved?.[s.key]?.metin ?? DEFAULT_MAIL_TEMPLATES[s.key].metin,
    };
  }
  return o;
};

export const SettingsMailTemplates = ({ appSettings = {}, setAppSettings = null, flash = () => {} }) => {
  const [taslak, setTaslak] = useState(() => taslakOlustur(appSettings?.mailTemplates));
  const [acikKartlar, setAcikKartlar] = useState(() => new Set()); // akordeon: tıklanınca açılır
  const [kayitliHal, setKayitliHal] = useState(() => JSON.stringify(taslakOlustur(appSettings?.mailTemplates)));
  const [confirmReset, setConfirmReset] = useState(false);

  const degisti = JSON.stringify(taslak) !== kayitliHal;
  const alan = (key, ad) => ({
    value: taslak[key]?.[ad] || "",
    onChange: (e) => setTaslak(p => ({ ...p, [key]: { ...p[key], [ad]: e.target.value } })),
  });

  const kaydet = () => {
    setAppSettings?.(p => ({ ...p, mailTemplates: taslak }));
    setKayitliHal(JSON.stringify(taslak));
    flash("ok", "E-posta şablonları kaydedildi.");
  };
  const varsayilanaDon = () => {
    const defaults = taslakOlustur(null);
    setTaslak(defaults);
    setKayitliHal(JSON.stringify(defaults));
    setAppSettings?.(p => ({ ...p, mailTemplates: null }));
    setConfirmReset(false);
    flash("ok", "E-posta şablonları varsayılanlara döndürüldü.");
  };

  const taStyle = { width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", minHeight: 90, background: "var(--n100, #f8fafc)", outline: "none", lineHeight: 1.5 };
  const rozet = { display: "inline-block", background: "var(--n150, #f1f5f9)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 5, padding: "1px 6px", fontSize: 11, fontFamily: "monospace", color: "var(--n600, #475569)", marginRight: 4 };

  return (
    <Section title="E-posta Şablonları" icon="mail">
      <div className="section-desc">
        Evrakları e-posta ile gönderirken taslağa otomatik dolan konu ve mesaj metinleri.
        Süslü parantezli yer tutucular gönderim anında gerçek değerlerle doldurulur.
        Boş bırakılan alan varsayılan metne döner; taslak metni göndermeden önce her seferinde ayrıca düzenlenebilir.
      </div>

      {SABLONLAR.map(s => {
        const acik = acikKartlar.has(s.key);
        return (
          <div key={s.key} style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: acik ? "14px 16px" : "12px 16px", marginBottom: 12 }}>
            <div onClick={() => setAcikKartlar(prev => { const n = new Set(prev); if (n.has(s.key)) n.delete(s.key); else n.add(s.key); return n; })}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--n600, #475569)", textTransform: "uppercase", letterSpacing: .5 }}>{s.baslik}</span>
              <span style={{ fontSize: 12, color: "var(--n400, #94a3b8)" }}>{acik ? "▾" : "▸"}</span>
            </div>
            {acik && (
              <div style={{ marginTop: 8 }}>
                {s.not && <div style={{ fontSize: 11.5, color: "var(--n400, #94a3b8)", marginBottom: 8 }}>{s.not}</div>}
                <div style={{ marginBottom: 8 }}>
                  {s.yertutucular.map(y => <span key={y} style={rozet}>{y}</span>)}
                </div>
                <Field label="Konu"><Input {...alan(s.key, "konu")} /></Field>
                <Field label="Mesaj Metni">
                  <textarea {...alan(s.key, "metin")} rows={5} style={taStyle} />
                </Field>
              </div>
            )}
          </div>
        );
      })}

      <div className="form-footer-bar" style={{ marginTop: 4, gap: 0, justifyContent: "space-between" }}>
        <Btn variant="ghost" onClick={() => setConfirmReset(true)}>Varsayılanlara Dön</Btn>
        <Btn onClick={kaydet}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>

      {confirmReset && (
        <ConfirmDialog
          message="Tüm e-posta şablonları varsayılan metinlere döndürülecek. Yaptığınız düzenlemeler silinecek."
          onConfirm={varsayilanaDon}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </Section>
  );
};
