import { useState, useEffect } from "react";
import { Icon, Field, Input, Btn, Select, ImageUpload, ConfirmDialog } from "../ui";
import { COUNTRIES, staticCities } from "../../lib/constants";
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
    evrakFirmaAdi: "", faturaFirmaAdi: "", contact: "", phone: "", email: "", web: "", adres: "", country: "", city: "",
    gtipNo: "",
    bankalar: [emptyBank()],
  });
  const [confirmRemoveBankId, setConfirmRemoveBankId] = useState(null);

  useEffect(() => {
    if (!factory) return;
    setForm({
      evrakFirmaAdi: factory.evrakFirmaAdi ?? factory.name ?? "",
      faturaFirmaAdi: factory.faturaFirmaAdi || "",
      contact: factory.contact || "",
      phone: factory.phone || "",
      email: factory.email || "",
      web: factory.web || "",
      adres: factory.adres || "",
      country: factory.country || "",
      city: factory.city || "",
      gtipNo: factory.gtipNo || "",
      bankalar: migrateBankalar(factory),
    });
  }, [factory]);

  const save = () => {
    setFactory(prev => ({
      ...prev,
      evrakFirmaAdi: (form.evrakFirmaAdi || "").trim(),
      faturaFirmaAdi: (form.faturaFirmaAdi || "").trim(),
      contact: form.contact,
      phone: form.phone,
      email: form.email,
      web: (form.web || "").trim(),
      adres: form.adres,
      country: form.country,
      city: form.city,
      gtipNo: form.gtipNo,
      bankalar: form.bankalar,
    }));
    flash("ok", "Firma bilgileri kaydedildi.");
  };

  const f = (key) => ({
    value: form[key] || "",
    onChange: e => setForm(p => ({ ...p, [key]: e.target.value })),
  });

  const updateBank = (id, key, val) =>
    setForm(p => ({ ...p, bankalar: p.bankalar.map(b => b.id === id ? { ...b, [key]: val } : b) }));
  const addBank = () =>
    setForm(p => ({ ...p, bankalar: [...p.bankalar, emptyBank()] }));
  const removeBank = (id) => {
    setForm(p => ({ ...p, bankalar: p.bankalar.filter(b => b.id !== id) }));
    setConfirmRemoveBankId(null);
  };

  const inputStyle = { fontFamily: "monospace" };

  return (
    <>
      <Section title="Firma Bilgileri" icon="settings" collapsible defaultOpen>
        <div style={{ fontSize: 13, color: "var(--n500, #64748b)", marginBottom: 16, lineHeight: 1.6 }}>
          Teklif, proforma ve yurt dışı fatura belgelerinde gönderen / FROM alanında görünecek bilgiler. Fabrika adı için Bayiler sekmesini kullanın.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Evrak'ta Görünen Firma Adı"><Input {...f("evrakFirmaAdi")} placeholder="Altuntaş Makina Sanayi" /></Field>
          <Field label="Yurt Dışı Fatura Firma Adı"><Input {...f("faturaFirmaAdi")} placeholder="Boş ise Evrak firma adı kullanılır" /></Field>
          <Field label="Yetkili / Sorumlu"><Input {...f("contact")} placeholder="Mehmet Altuntaş" /></Field>
          <Field label="Telefon"><Input {...f("phone")} placeholder="0212 493 35 86" /></Field>
          <Field label="E-posta"><Input {...f("email")} placeholder="info@altunmak.com" /></Field>
          <Field label="Web Sitesi"><Input {...f("web")} placeholder="www.altunmak.com" /></Field>
        </div>
        <Field label="Adres">
          <textarea {...f("adres")} placeholder="Topçular mah. Keresteciler sit. İşgören sok. No:33/2-3 Eyüp - İSTANBUL"
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", minHeight: 60, background: "var(--n100, #f8fafc)", outline: "none" }} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Ülke">
            <Select value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value, city: "" }))}>
              <option value="">— Seçin —</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Şehir">
            {staticCities(form.country).length > 0 ? (
              <Select value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}>
                <option value="">— Seçin —</option>
                {staticCities(form.country).map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            ) : (
              <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Şehir" />
            )}
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="GTIP No (Gümrük Tarife)"><Input {...f("gtipNo")} placeholder="8438 50 00 00 00" /></Field>
        </div>
      </Section>

      <Section title="Banka ve Ödeme Bilgileri" icon="finance" collapsible>
        <div style={{ fontSize: 13, color: "var(--n500, #64748b)", marginBottom: 16, lineHeight: 1.6 }}>
          Teklif, proforma ve yurt dışı fatura belgelerinde ödeme bölümüne otomatik eklenir.
        </div>

        {form.bankalar.map((bank, idx) => (
          <div key={bank.id} style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--n500, #64748b)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Banka {idx + 1}
              </span>
              {form.bankalar.length > 1 && (
                <Btn small variant="danger" onClick={() => setConfirmRemoveBankId(bank.id)}>
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
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1.5px dashed var(--n400, #94a3b8)", background: "transparent", color: "var(--n600, #475569)", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 16, width: "100%" }}>
          <Icon name="add" size={14} /> Yeni Banka Ekle
        </button>

      </Section>

      <Section title="Kaşe / İmza" icon="stamp" collapsible>
        <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginBottom: 12 }}>
          Teklif, proforma ve yurt dışı fatura çıktılarında görünür. Şeffaf arka planlı PNG önerilir.
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

      <div style={{ position: "sticky", bottom: 0, display: "flex", justifyContent: "flex-end", padding: "12px 0", marginTop: 4, background: "var(--footerBg, rgba(248,250,252,.94))", borderTop: "1px solid var(--n200, #e2e8f0)", backdropFilter: "blur(4px)" }}>
        <Btn onClick={save}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>

      {confirmRemoveBankId && (() => {
        const bank = form.bankalar.find(b => b.id === confirmRemoveBankId);
        const label = bank?.bankaAdi || bank?.hesapAdi || "Bu banka kaydı";
        return (
          <ConfirmDialog
            message={`"${label}" silinecek. Kaydet'e basmadıkça geri alınabilir.`}
            onConfirm={() => removeBank(confirmRemoveBankId)}
            onCancel={() => setConfirmRemoveBankId(null)}
          />
        );
      })()}
    </>
  );
};
