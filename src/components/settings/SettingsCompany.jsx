import { useState, useEffect } from "react";
import { Icon, Field, Input, Btn, ImageUpload } from "../ui";
import { Section } from "./Section";

const emptyBank = () => ({
  id: String(Date.now() + Math.random()),
  bankaAdi: "", hesapAdi: "", swift: "", ibanTL: "", ibanEUR: "", ibanUSD: "",
});

const migrateBankalar = (factory) => {
  if (Array.isArray(factory?.bankalar) && factory.bankalar.length > 0) return factory.bankalar;
  const b = {
    id: String(Date.now()),
    bankaAdi: factory?.bankaAdi || "",
    hesapAdi: factory?.hesapAdi || "",
    swift: factory?.swift || "",
    ibanTL: factory?.ibanTL || "",
    ibanEUR: factory?.ibanEUR || "",
    ibanUSD: factory?.ibanUSD || "",
  };
  return (b.bankaAdi || b.hesapAdi || b.swift || b.ibanTL || b.ibanEUR || b.ibanUSD) ? [b] : [emptyBank()];
};

export const SettingsCompany = ({ factory, setFactory, appSettings, setAppSettings, setCustomers, setServices, flash }) => {
  const [form, setForm] = useState({
    name: "", contact: "", phone: "", email: "", adres: "",
    gtipNo: "",
    bankalar: [emptyBank()],
  });

  useEffect(() => {
    if (!factory) return;
    setForm({
      name: factory.name || "",
      contact: factory.contact || "",
      phone: factory.phone || "",
      email: factory.email || "",
      adres: factory.adres || "",
      gtipNo: factory.gtipNo || "",
      bankalar: migrateBankalar(factory),
    });
  }, [factory]);

  const save = () => {
    const oldName = factory?.name;
    const newName = (form.name || "").trim() || oldName;
    const prevNames = oldName && newName && oldName !== newName
      ? [...new Set([...(factory?.prevNames || []), oldName])]
      : (factory?.prevNames || []);
    setFactory({ ...form, name: newName, prevNames });
    if (oldName && newName && oldName !== newName) {
      setCustomers?.(p => p.map(c => {
        const satisYapanEsleser = c.satisYapan === oldName;
        const prevOwnerEsleser = c.prevOwners?.some(o => o.satisYapan === oldName);
        if (!satisYapanEsleser && !prevOwnerEsleser) return c;
        return {
          ...c,
          satisYapan: satisYapanEsleser ? newName : c.satisYapan,
          prevOwners: prevOwnerEsleser ? c.prevOwners.map(o => o.satisYapan === oldName ? { ...o, satisYapan: newName } : o) : c.prevOwners,
        };
      }));
      setServices?.(p => p.map(s => s.islemFirma === oldName ? { ...s, islemFirma: newName } : s));
      flash("ok", `Firma adı güncellendi. "${oldName}" geçmiş kayıtlarda da değiştirildi.`);
    } else {
      flash("ok", "Firma bilgileri kaydedildi.");
    }
  };

  const f = (key) => ({
    value: form[key] || "",
    onChange: e => setForm(p => ({ ...p, [key]: e.target.value })),
  });

  const updateBank = (id, key, val) =>
    setForm(p => ({ ...p, bankalar: p.bankalar.map(b => b.id === id ? { ...b, [key]: val } : b) }));
  const addBank = () =>
    setForm(p => ({ ...p, bankalar: [...p.bankalar, emptyBank()] }));
  const removeBank = (id) =>
    setForm(p => ({ ...p, bankalar: p.bankalar.filter(b => b.id !== id) }));

  const inputStyle = { fontFamily: "monospace" };

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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="GTIP No (Gümrük Tarife)"><Input {...f("gtipNo")} placeholder="8438 50 00 00 00" /></Field>
        </div>
      </Section>

      <Section title="Banka ve Ödeme Bilgileri" icon="finance">
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
          Teklif ve proforma fatura belgelerinde ödeme bölümüne otomatik eklenir.
        </div>

        {form.bankalar.map((bank, idx) => (
          <div key={bank.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Banka {idx + 1}
              </span>
              {form.bankalar.length > 1 && (
                <Btn small variant="danger" onClick={() => removeBank(bank.id)}>
                  <Icon name="trash" size={11} /> Sil
                </Btn>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Banka Adı / Şubesi">
                <Input value={bank.bankaAdi} onChange={e => updateBank(bank.id, "bankaAdi", e.target.value)} placeholder="Yapı Kredi Eyüp-Topçular Şubesi" />
              </Field>
              <Field label="Hesap Adı">
                <Input value={bank.hesapAdi} onChange={e => updateBank(bank.id, "hesapAdi", e.target.value)} placeholder="Huriye Altuntaş" />
              </Field>
              <Field label="SWIFT Kodu">
                <Input value={bank.swift} onChange={e => updateBank(bank.id, "swift", e.target.value.toUpperCase())} placeholder="YAPITRISXXX" style={inputStyle} />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 8 }}>
              <Field label="İBAN ₺ (TL)">
                <Input value={bank.ibanTL} onChange={e => updateBank(bank.id, "ibanTL", e.target.value)} placeholder="TR53 0006 7010 ..." style={inputStyle} />
              </Field>
              <Field label="İBAN € (EUR)">
                <Input value={bank.ibanEUR} onChange={e => updateBank(bank.id, "ibanEUR", e.target.value)} placeholder="TR85 0006 7010 ..." style={inputStyle} />
              </Field>
              <Field label="İBAN $ (USD)">
                <Input value={bank.ibanUSD} onChange={e => updateBank(bank.id, "ibanUSD", e.target.value)} placeholder="TR61 0006 7010 ..." style={inputStyle} />
              </Field>
            </div>
          </div>
        ))}

        <button onClick={addBank}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1.5px dashed #94a3b8", background: "transparent", color: "#475569", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 16, width: "100%" }}>
          <Icon name="add" size={14} /> Yeni Banka Ekle
        </button>

      </Section>

      <Section title="Kaşe / İmza" icon="stamp">
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
          Teklif ve proforma çıktılarında onay kutusuna eklenir. Şeffaf arka planlı PNG önerilir.
        </div>
        <Field label="Kaşe / İmza Resmi">
          <ImageUpload
            value={appSettings?.kaseResmi || ""}
            onChange={v => setAppSettings?.(p => ({ ...p, kaseResmi: v }))}
            maxPx={300}
            label="kaşe"
            preserveFormat
          />
        </Field>
      </Section>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
        <Btn onClick={save}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>
    </>
  );
};
