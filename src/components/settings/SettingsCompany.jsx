import { useState, useEffect } from "react";
import { Icon, Field, Input, Btn, Select, ImageUpload, ConfirmDialog } from "../ui";
import { COUNTRIES, staticCities, CALISMA_SAATLERI_VARSAYILAN, HAFTA_GUNLERI } from "../../lib/constants";
import { ILCELER } from "../../lib/map/ilceler";
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
    evrakFirmaAdi: "", faturaFirmaAdi: "", contact: "", phone: "", email: "", web: "", adres: "", country: "", city: "", ilce: "",
    gtipNo: "",
    bankalar: [emptyBank()],
  });
  const [confirmRemoveBankId, setConfirmRemoveBankId] = useState(null);
  // Firma çalışma saatleri (servis işçilik süresi hesabı — bkz. mesaiDk). appSettings.calismaSaatleri.
  const [cs, setCs] = useState(CALISMA_SAATLERI_VARSAYILAN);

  useEffect(() => {
    const v = appSettings?.calismaSaatleri;
    setCs({
      baslangic: v?.baslangic || CALISMA_SAATLERI_VARSAYILAN.baslangic,
      bitis: v?.bitis || CALISMA_SAATLERI_VARSAYILAN.bitis,
      gunler: Array.isArray(v?.gunler) ? v.gunler : CALISMA_SAATLERI_VARSAYILAN.gunler,
      molalar: Array.isArray(v?.molalar) ? v.molalar : CALISMA_SAATLERI_VARSAYILAN.molalar,
    });
  }, [appSettings?.calismaSaatleri]);

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
      ilce: factory.ilce || "",
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
      ilce: form.ilce,
      gtipNo: form.gtipNo,
      bankalar: form.bankalar,
    }));
    setAppSettings?.(p => ({ ...p, calismaSaatleri: cs }));
    flash("ok", "Firma bilgileri kaydedildi.");
  };

  const toggleGun = (g) =>
    setCs(p => ({ ...p, gunler: p.gunler.includes(g) ? p.gunler.filter(x => x !== g) : [...p.gunler, g].sort((a, b) => a - b) }));
  const setMola = (i, key, val) =>
    setCs(p => ({ ...p, molalar: p.molalar.map((m, idx) => idx === i ? { ...m, [key]: val } : m) }));
  const addMola = () => setCs(p => ({ ...p, molalar: [...p.molalar, { baslangic: "12:30", bitis: "13:30" }] }));
  const removeMola = (i) => setCs(p => ({ ...p, molalar: p.molalar.filter((_, idx) => idx !== i) }));

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
      <Section title="Firma Bilgileri" icon="settings" collapsible>
        <div className="section-desc">
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
            className="input" style={{ fontSize: 13, resize: "vertical", minHeight: 60 }} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Ülke">
            <Select value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value, city: "", ilce: "" }))}>
              <option value="">— Seçin —</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Şehir">
            {staticCities(form.country).length > 0 ? (
              <Select value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value, ilce: "" }))}>
                <option value="">— Seçin —</option>
                {staticCities(form.country).map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            ) : (
              <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value, ilce: "" }))} placeholder="Şehir" />
            )}
          </Field>
        </div>
        {/* İlçe: yalnız ilçe kırılımı olan illerde. Fabrikanın ilçesi Faaliyet Haritası'nda
            pinin hangi ilçeye konacağını belirler. */}
        {form.country === "Türkiye" && ILCELER[form.city] && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="İlçe">
              <Select value={form.ilce || ""} onChange={e => setForm(p => ({ ...p, ilce: e.target.value }))}>
                <option value="">— Seçin —</option>
                {ILCELER[form.city].map(i => <option key={i} value={i}>{i}</option>)}
              </Select>
            </Field>
            <div />
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="GTIP No (Gümrük Tarife)"><Input {...f("gtipNo")} placeholder="8438 50 00 00 00" /></Field>
        </div>
      </Section>

      <Section title="Çalışma Saatleri" icon="service" collapsible>
        <div className="section-desc">
          Servis işçilik süresi (bakım başlangıcı → bitiş) yalnız bu mesai saatleri içinde sayılır;
          gece, çalışılmayan günler ve molalar süreden düşülür. Bekleme ve toplam süre bundan etkilenmez.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Mesai Başlangıcı">
            <Input type="time" value={cs.baslangic} onChange={e => setCs(p => ({ ...p, baslangic: e.target.value }))} />
          </Field>
          <Field label="Mesai Bitişi">
            <Input type="time" value={cs.bitis} onChange={e => setCs(p => ({ ...p, bitis: e.target.value }))} />
          </Field>
        </div>
        <Field label="Çalışılan Günler">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {HAFTA_GUNLERI.map(g => {
              const secili = cs.gunler.includes(g.deger);
              return (
                <button key={g.deger} type="button" onClick={() => toggleGun(g.deger)}
                  style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                    border: `1.5px solid ${secili ? "var(--blu600, #2563eb)" : "var(--n300, #cbd5e1)"}`,
                    background: secili ? "var(--bluBg, #eff6ff)" : "transparent",
                    color: secili ? "var(--blu700, #1d4ed8)" : "var(--n500, #64748b)" }}>
                  {g.kisa}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Molalar (opsiyonel)">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cs.molalar.length === 0 && (
              <div style={{ fontSize: 12.5, color: "var(--n400, #94a3b8)" }}>Mola yok — tüm mesai süreye sayılır.</div>
            )}
            {cs.molalar.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 130 }}><Input type="time" value={m.baslangic || ""} onChange={e => setMola(i, "baslangic", e.target.value)} /></div>
                <span style={{ color: "var(--n400, #94a3b8)" }}>–</span>
                <div style={{ width: 130 }}><Input type="time" value={m.bitis || ""} onChange={e => setMola(i, "bitis", e.target.value)} /></div>
                <Btn small variant="danger" onClick={() => removeMola(i)}><Icon name="trash" size={11} /> Sil</Btn>
              </div>
            ))}
          </div>
        </Field>
        <button onClick={addMola}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1.5px dashed var(--n400, #94a3b8)", background: "transparent", color: "var(--n600, #475569)", fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%" }}>
          <Icon name="add" size={14} /> Mola Ekle
        </button>
      </Section>

      <Section title="Banka ve Ödeme Bilgileri" icon="finance" collapsible>
        <div className="section-desc">
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

      <div className="form-footer-bar" style={{ marginTop: 4, gap: 0 }}>
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
