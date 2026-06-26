import { useState, useEffect } from "react";
import { Icon, Field, Input, Btn } from "../ui";
import { Section } from "./Section";

export const SettingsCompany = ({ factory, setFactory, flash }) => {
  const [form, setForm] = useState({
    name: "", contact: "", phone: "", email: "", adres: "",
    bankaAdi: "", hesapAdi: "", swift: "",
    ibanTL: "", ibanEUR: "", ibanUSD: "",
    gtipNo: "",
  });

  useEffect(() => {
    if (factory) setForm(f => ({ ...f, ...factory }));
  }, [factory]);

  const save = () => {
    setFactory({ ...form });
    flash("ok", "Firma bilgileri kaydedildi.");
  };

  const f = (key) => ({
    value: form[key] || "",
    onChange: e => setForm(p => ({ ...p, [key]: e.target.value })),
  });

  return (
    <>
      <Section title="Firma Bilgileri" icon="settings">
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
          Teklif ve proforma fatura belgelerinde gönderen olarak görünecek bilgiler.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Firma Adı"><Input {...f("name")} placeholder="Altuntaş Makina Sanayi" /></Field>
          <Field label="Yetkili / Sorumlu"><Input {...f("contact")} placeholder="Mehmet Altuntaş" /></Field>
          <Field label="Telefon"><Input {...f("phone")} placeholder="0212 493 35 86" /></Field>
          <Field label="E-posta"><Input {...f("email")} placeholder="info@altunmak.com" /></Field>
        </div>
        <Field label="Adres">
          <textarea {...f("adres")} placeholder="Topçular mah. Keresteciler sit. İşgören sok. No:33/2-3 Eyüp - İSTANBUL"
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", minHeight: 60, background: "#f8fafc", outline: "none" }} />
        </Field>
      </Section>

      <Section title="Banka ve Ödeme Bilgileri" icon="finance">
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
          Teklif ve proforma fatura belgelerinde ödeme bölümüne otomatik eklenir.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Banka Adı / Şubesi"><Input {...f("bankaAdi")} placeholder="Yapı Kredi Eyüp-Topçular Şubesi" /></Field>
          <Field label="Hesap Adı"><Input {...f("hesapAdi")} placeholder="Huriye Altuntaş" /></Field>
          <Field label="SWIFT Kodu"><Input {...f("swift")} placeholder="YAPITRISXXX" style={{ fontFamily: "monospace", textTransform: "uppercase" }} /></Field>
          <Field label="GTIP No (Gümrük Tarife)"><Input {...f("gtipNo")} placeholder="8438 50 00 00 00" /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 4 }}>
          <Field label="İBAN ₺ (TL)"><Input {...f("ibanTL")} placeholder="TR53 0006 7010 ..." style={{ fontFamily: "monospace" }} /></Field>
          <Field label="İBAN € (EUR)"><Input {...f("ibanEUR")} placeholder="TR85 0006 7010 ..." style={{ fontFamily: "monospace" }} /></Field>
          <Field label="İBAN $ (USD)"><Input {...f("ibanUSD")} placeholder="TR61 0006 7010 ..." style={{ fontFamily: "monospace" }} /></Field>
        </div>
      </Section>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
        <Btn onClick={save}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>
    </>
  );
};
