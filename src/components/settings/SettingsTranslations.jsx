import { useState } from "react";
import { DEFAULT_TRANSLATIONS, DEFAULT_FATURA_TRANSLATIONS } from "../../lib/printTemplates";
import { DEFAULT_SERVIS_TRANSLATIONS, DEFAULT_MAKINA_TRANSLATIONS, DEFAULT_SANDIK_TRANSLATIONS } from "../../lib/printTemplates";
import { Btn, Icon } from "../ui";
import { Section } from "./Section";

const GROUPS = [
  // ─── TEKLİF FORMU ───────────────────────────────────────────────────────────
  { divider: "Teklif Formu" },
  { label: "Başlık & Belge", keys: [
    { key: "titleTeklif",       label: "Başlık" },
    { key: "docLabelTeklif",    label: "Belge Bölümü Başlığı" },
  ]},
  { label: "Koşullar (2. Sayfa)", keys: [
    { key: "koşullarBaslik",    label: "Bölüm Başlığı" },
    { key: "onayBaslik",        label: "Onay Kutusu Başlığı" },
    { key: "onayAlt",           label: "Onay Alt Yazısı" },
    { key: "sartlarBaslik",     label: "Şartlar Başlığı" },
  ]},

  // ─── PROFORMA ───────────────────────────────────────────────────────────────
  { divider: "Proforma" },
  { label: "Başlık & Belge", keys: [
    { key: "titleProforma",     label: "Başlık" },
    { key: "docLabelProforma",  label: "Belge Bölümü Başlığı" },
  ]},
  { label: "Banka Bilgileri", keys: [
    { key: "bankaBaslik",       label: "Bölüm Başlığı" },
    { key: "hesapAdiLabel",     label: "Hesap Adı" },
    { key: "ibanTLLabel",       label: "IBAN (TL)" },
    { key: "ibanEURLabel",      label: "IBAN (EUR)" },
    { key: "ibanUSDLabel",      label: "IBAN (USD)" },
  ]},

  // ─── ORTAK ──────────────────────────────────────────────────────────────────
  { divider: "Ortak" },
  { label: "Alıcı Bölümü", keys: [
    { key: "alicrLabel",        label: "Bölüm Başlığı" },
    { key: "firmLabel",         label: "Firma" },
    { key: "yetkiliLabel",      label: "Yetkili / Tel" },
    { key: "adresLabel",        label: "Adres" },
    { key: "vergiLabel",        label: "Vergi No / Dairesi" },
  ]},
  { label: "Belge Bilgileri", keys: [
    { key: "tarihLabel",        label: "Tarih" },
    { key: "noLabel",           label: "Teklif No" },
    { key: "modelYiliLabel",    label: "Model Yılı Etiketi" },
    { key: "modelYiliSuffix",   label: "Model Yılı Değeri" },
    { key: "kurLabel",          label: "Döviz Kuru" },
    { key: "teslimYeriLabel",   label: "Teslim Yeri" },
    { key: "authorityLabel",    label: "Yetkili (imza alanı)" },
    { key: "forwarderLabel",    label: "Gönderen (imza alanı)" },
  ]},
  { label: "Tablo Başlıkları", keys: [
    { key: "thSira",            label: "Sıra" },
    { key: "thKod",             label: "Kod" },
    { key: "thAd",              label: "Ürün Adı" },
    { key: "thTanim",           label: "Tanım / Açıklama" },
    { key: "thMiktar",          label: "Miktar" },
    { key: "thBirimFiyat",      label: "Birim Fiyat" },
    { key: "thTutar",           label: "Tutar" },
  ]},
  { label: "Toplamlar", keys: [
    { key: "subtotalLabel",     label: "Ara Toplam" },
    { key: "iskontoLabel",      label: "İskonto" },
    { key: "netLabel",          label: "Net Toplam" },
    { key: "kdvPrefix",         label: "KDV Ön Eki (oran otomatik eklenir)" },
    { key: "grandLabel",        label: "Genel Toplam" },
  ]},
  { label: "Koşullar Alanları", keys: [
    { key: "iskontoRow",        label: "İskonto Satırı" },
    { key: "odemeSekli",        label: "Ödeme Şekli" },
    { key: "teslimSekli",       label: "Teslim Şekli" },
    { key: "teslimSuresi",      label: "Teslim Süresi" },
    { key: "teslimTarihi",      label: "Teslim Tarihi" },
    { key: "gecerlilik",        label: "Geçerlilik Süresi" },
    { key: "notLabel",          label: "Not" },
    { key: "ekLabel",           label: "Ek Bilgi" },
  ]},

  // ─── SERVİS FORMU ───────────────────────────────────────────────────────────
  { divider: "Servis Formu" },
  { label: "Üst Bilgi", ns: "servis", keys: [
    { key: "title",             label: "Başlık" },
    { key: "formNoLabel",       label: "Form No Etiketi" },
    { key: "raporTarihiLabel",  label: "Rapor Tarihi Etiketi" },
  ]},
  { label: "Bilgi Tablosu", ns: "servis", keys: [
    { key: "firmaAdiLabel",     label: "Firma Adı" },
    { key: "telefonLabel",      label: "Telefon" },
    { key: "adresLabel",        label: "Adres" },
    { key: "makinaModeliLabel", label: "Makina Modeli" },
    { key: "seriNoLabel",       label: "Seri Numarası" },
    { key: "servisTuruLabel",   label: "Servis Türü" },
    { key: "yapilanIslemLabel", label: "Yapılan İşlem" },
    { key: "girisLabel",        label: "Giriş Tarihi" },
    { key: "teknisyenLabel",    label: "Teknisyen" },
    { key: "servisUcretiLabel", label: "Servis Ücreti" },
    { key: "parcaUcretiLabel",  label: "Parça Ücreti" },
    { key: "toplamLabel",       label: "Toplam" },
    { key: "kdvDahilLabel",     label: "KDV Dahil" },
  ]},
  { label: "Bölüm Başlıkları", ns: "servis", keys: [
    { key: "musteriTalimatiBaslik", label: "Müşteri Talimatı" },
    { key: "degisenParcalarBaslik", label: "Değişen Parçalar" },
    { key: "fabrikaNotuBaslik",     label: "Fabrika Notu" },
  ]},
  { label: "İmza Alanları", ns: "servis", keys: [
    { key: "teslimEden",  label: "Teslim Eden" },
    { key: "teslimAlan",  label: "Teslim Alan" },
    { key: "imzaEden",    label: "İmza Eden (alt)" },
    { key: "imzaAlan",    label: "İmza Alan (alt)" },
  ]},
  { label: "Şartlar", ns: "servis", keys: [
    { key: "sart1", label: "Şart 1" },
    { key: "sart2", label: "Şart 2" },
    { key: "sart3", label: "Şart 3" },
    { key: "sart4", label: "Şart 4" },
  ]},
  { label: "Servis Tipleri", ns: "servis", keys: [
    { key: "typeIlkCalistirma",  label: "İlk Çalıştırma" },
    { key: "typeGarantiIci",     label: "Garanti İçi" },
    { key: "typeGarantiDisi",    label: "Garanti Dışı" },
    { key: "typePeriyodikBakim", label: "Periyodik Bakım" },
  ]},
  { label: "Tamir Yerleri", ns: "servis", keys: [
    { key: "placeYerindeOnarim",   label: "Yerinde Onarım" },
    { key: "placeFabrikadaOnarim", label: "Fabrikada Onarım" },
    { key: "placeKargo",           label: "Kargo" },
    { key: "placeFabrikaTeslim",   label: "Fabrika Teslim" },
  ]},

  // ─── SANDIK ETİKETİ ─────────────────────────────────────────────────────────
  { divider: "Sandık Etiketi" },
  // Etiket her zaman çift dilli basılır: EN / TR yan yana (ör. "FROM / GÖNDEREN").
  { label: "Etiket Alanları", ns: "sandik", keys: [
    { key: "baslik",      label: "Başlık" },
    { key: "gonderen",    label: "Gönderen Başlığı" },
    { key: "alici",       label: "Alıcı Başlığı" },
    { key: "varis",       label: "Varış Başlığı" },
    { key: "model",       label: "Model Etiketi" },
    { key: "seriNo",      label: "Seri No Etiketi" },
    { key: "brutKg",      label: "Brüt Kg Etiketi" },
    { key: "yetkili",     label: "Yetkili Etiketi" },
    { key: "kirilabilir", label: "Kırılabilir" },
    { key: "buTaraf",     label: "Bu Taraf Üstte" },
    { key: "kuruTutun",   label: "Kuru Tutun" },
  ]},

  // ─── MAKİNA RAPORU ──────────────────────────────────────────────────────────
  { divider: "Makina Raporu" },
  { label: "Üst Bilgi", ns: "makina", keys: [
    { key: "subBaslik",          label: "Alt Başlık" },
    { key: "raporTarihiLabel",   label: "Rapor Tarihi Etiketi" },
  ]},
  { label: "Makina Bilgileri", ns: "makina", keys: [
    { key: "satinAlanLabel",      label: "Satın Alan" },
    { key: "satisYapanLabel",     label: "Satış Yapan" },
    { key: "adresLabel",          label: "Adres" },
    { key: "makinaModeliLabel",   label: "Makina Modeli" },
    { key: "seriNoLabel",         label: "Seri Numarası" },
    { key: "kalipCapiLabel",      label: "Kalıp Çapı" },
    { key: "kaliplarLabel",       label: "Kalıplar" },
    { key: "bantlarLabel",        label: "Bant" },
    { key: "garantiBaslangicLabel", label: "Garanti Başlangıç" },
    { key: "garantiBitisLabel",   label: "Garanti Bitiş" },
    { key: "notLabel",            label: "Not" },
    { key: "garantiDevam",        label: "Garanti Devam Metni" },
    { key: "garantiBitti",        label: "Garanti Bitti Metni" },
  ]},
  { label: "Sahiplik Geçmişi", ns: "makina", keys: [
    { key: "sahiplikBaslik",  label: "Bölüm Başlığı" },
    { key: "thSira",          label: "Sıra" },
    { key: "thSahip",         label: "Sahip" },
    { key: "thKonum",         label: "Konum" },
    { key: "thSatisYapan",    label: "Satış Yapan" },
    { key: "thDevirTarihi",   label: "Devir Tarihi" },
    { key: "mevcutLabel",     label: "Mevcut" },
  ]},
  { label: "Servis Geçmişi", ns: "makina", keys: [
    { key: "servisBaslik",        label: "Bölüm Başlığı" },
    { key: "kayitSuffix",         label: "Kayıt Suffix" },
    { key: "thTarih",             label: "Tarih" },
    { key: "thTur",               label: "Tür" },
    { key: "thYapilanIslem",      label: "Yapılan İşlem" },
    { key: "thTeknisyen",         label: "Teknisyen" },
    { key: "thAciklama",          label: "Açıklama" },
    { key: "servisYok",           label: "Servis Yok Mesajı" },
    { key: "degisenParcalarLabel", label: "Değişen Parçalar Etiketi" },
  ]},
  { label: "Kalıplar", ns: "makina", keys: [
    { key: "kalipBaslik",  label: "Bölüm Başlığı" },
    { key: "thKalip",      label: "Kalıp Sütun Başlığı" },
  ]},
  { label: "Servis Tipleri", ns: "makina", keys: [
    { key: "typeIlkCalistirma",  label: "İlk Çalıştırma" },
    { key: "typeGarantiIci",     label: "Garanti İçi" },
    { key: "typeGarantiDisi",    label: "Garanti Dışı" },
    { key: "typePeriyodikBakim", label: "Periyodik Bakım" },
  ]},
  { label: "Tamir Yerleri", ns: "makina", keys: [
    { key: "placeYerindeOnarim",   label: "Yerinde Onarım" },
    { key: "placeFabrikadaOnarim", label: "Fabrikada Onarım" },
    { key: "placeKargo",           label: "Kargo" },
    { key: "placeFabrikaTeslim",   label: "Fabrika Teslim" },
  ]},

  // ─── YURT DIŞI FATURA ───────────────────────────────────────────────────────
  { divider: "Yurt Dışı Fatura" },
  { label: "Başlık & No", ns: "fatura", singleLang: true, keys: [
    { key: "title",          label: "Belge Başlığı" },
    { key: "invoiceNoLabel", label: "Fatura No Etiketi" },
    { key: "dateLabel",      label: "Tarih Etiketi" },
  ]},
  { label: "Taraflar", ns: "fatura", singleLang: true, keys: [
    { key: "fromLabel",   label: "Gönderen Başlığı" },
    { key: "billToLabel", label: "Alıcı Başlığı" },
  ]},
  { label: "Tablo Başlıkları", ns: "fatura", singleLang: true, keys: [
    { key: "thDescription", label: "Açıklama" },
    { key: "thSerialNo",    label: "Seri No" },
    { key: "thQty",         label: "Miktar" },
    { key: "thUnitPrice",   label: "Birim Fiyat" },
    { key: "thAmount",      label: "Tutar" },
  ]},
  { label: "Alt Bilgiler", ns: "fatura", singleLang: true, keys: [
    { key: "paymentLabel",      label: "Ödeme" },
    { key: "deliveryLabel",     label: "Teslim" },
    { key: "packingLabel",      label: "Paket" },
    { key: "gtipLabel",         label: "GTİP No" },
    { key: "originLabel",       label: "Menşei Ülke" },
    { key: "exchangeRateLabel", label: "Döviz Kuru" },
    { key: "notesLabel",        label: "Notlar" },
    { key: "bankLabel",         label: "Banka Bilgileri" },
    { key: "totalLabel",        label: "Toplam" },
  ]},
];

export const SettingsTranslations = ({ appSettings, setAppSettings, flash }) => {
  const saved = appSettings?.translations || {};
  const [draft, setDraft] = useState({
    TR: { ...DEFAULT_TRANSLATIONS.TR, ...(saved.TR || {}) },
    EN: { ...DEFAULT_TRANSLATIONS.EN, ...(saved.EN || {}) },
    servis: {
      TR: { ...DEFAULT_SERVIS_TRANSLATIONS.TR, ...(saved.servis?.TR || {}) },
      EN: { ...DEFAULT_SERVIS_TRANSLATIONS.EN, ...(saved.servis?.EN || {}) },
    },
    makina: {
      TR: { ...DEFAULT_MAKINA_TRANSLATIONS.TR, ...(saved.makina?.TR || {}) },
      EN: { ...DEFAULT_MAKINA_TRANSLATIONS.EN, ...(saved.makina?.EN || {}) },
    },
    sandik: {
      TR: { ...DEFAULT_SANDIK_TRANSLATIONS.TR, ...(saved.sandik?.TR || {}) },
      EN: { ...DEFAULT_SANDIK_TRANSLATIONS.EN, ...(saved.sandik?.EN || {}) },
    },
    fatura: { ...DEFAULT_FATURA_TRANSLATIONS, ...(saved.fatura || {}) },
  });
  const [openGroups, setOpenGroups] = useState(new Set());
  const toggleGroup = (label) => setOpenGroups(p => {
    const next = new Set(p);
    next.has(label) ? next.delete(label) : next.add(label);
    return next;
  });

  const set = (lang, key, val) => setDraft(p => ({ ...p, [lang]: { ...p[lang], [key]: val } }));
  const setNested = (ns, lang, key, val) =>
    setDraft(p => ({ ...p, [ns]: { ...p[ns], [lang]: { ...p[ns][lang], [key]: val } } }));
  const setFlat = (ns, key, val) => setDraft(p => ({ ...p, [ns]: { ...p[ns], [key]: val } }));

  const save = () => {
    setAppSettings(p => ({ ...p, translations: draft }));
    flash("ok", "Çeviriler kaydedildi.");
  };

  const reset = () => {
    const defaults = {
      TR: { ...DEFAULT_TRANSLATIONS.TR },
      EN: { ...DEFAULT_TRANSLATIONS.EN },
      servis: {
        TR: { ...DEFAULT_SERVIS_TRANSLATIONS.TR },
        EN: { ...DEFAULT_SERVIS_TRANSLATIONS.EN },
      },
      makina: {
        TR: { ...DEFAULT_MAKINA_TRANSLATIONS.TR },
        EN: { ...DEFAULT_MAKINA_TRANSLATIONS.EN },
      },
      sandik: {
        TR: { ...DEFAULT_SANDIK_TRANSLATIONS.TR },
        EN: { ...DEFAULT_SANDIK_TRANSLATIONS.EN },
      },
      fatura: { ...DEFAULT_FATURA_TRANSLATIONS },
    };
    setDraft(defaults);
    setAppSettings(p => ({ ...p, translations: defaults }));
    flash("ok", "Çeviriler varsayılana sıfırlandı.");
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "6px 10px",
    border: "1px solid var(--n200, #e2e8f0)", borderRadius: 6, fontSize: 13,
    fontFamily: "inherit", background: "var(--n100, #f8fafc)", outline: "none",
    resize: "vertical",
  };
  const thStyle = { padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)", textAlign: "left", background: "var(--n100, #f8fafc)" };
  const tdStyle = { padding: "6px 8px", verticalAlign: "top", borderBottom: "1px solid var(--n150, #f1f5f9)" };

  return (
    <Section title="Çeviriler" icon="settings">
      <div className="section-desc">
        Teklif, Proforma, Servis Formu ve Makina Raporu baskılarındaki etiketleri özelleştirin. Türkçe (TR) ve İngilizce (EN) ayrı ayrı düzenlenir.
      </div>


      {GROUPS.map((g, i) => {
        if (g.divider) {
          return (
            <div key={`div-${i}`} style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0 12px" }}>
              <div style={{ flex: 1, height: 1, background: "var(--n200, #e2e8f0)" }} />
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--n400, #94a3b8)", textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>{g.divider}</div>
              <div style={{ flex: 1, height: 1, background: "var(--n200, #e2e8f0)" }} />
            </div>
          );
        }
        const groupId = g.ns ? `${g.ns}:${g.label}` : `${i}:${g.label}`;
        const isOpen = openGroups.has(groupId);
        const getTR = (key) => g.singleLang ? (draft[g.ns]?.[key] ?? "") : g.ns ? (draft[g.ns]?.TR?.[key] ?? "") : (draft.TR[key] ?? "");
        const getEN = (key) => g.singleLang ? "" : g.ns ? (draft[g.ns]?.EN?.[key] ?? "") : (draft.EN[key] ?? "");
        const onChangeTR = (key, val) => g.singleLang ? setFlat(g.ns, key, val) : g.ns ? setNested(g.ns, "TR", key, val) : set("TR", key, val);
        const onChangeEN = (key, val) => g.singleLang ? undefined : g.ns ? setNested(g.ns, "EN", key, val) : set("EN", key, val);
        return (
          <div key={groupId} style={{ marginBottom: 8 }}>
            <div
              onClick={() => toggleGroup(groupId)}
              style={{
                fontSize: 12, fontWeight: 800, color: "var(--n600, #475569)", cursor: "pointer", textTransform: "uppercase", letterSpacing: .5,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", background: "var(--n100, #f8fafc)",
                borderRadius: 10, marginBottom: isOpen ? 10 : 0,
                border: "1px solid var(--n200, #e2e8f0)",
                userSelect: "none",
              }}>
              <span>{g.label}</span>
              <span style={{ color: "var(--n400, #94a3b8)", fontSize: 12 }}>{isOpen ? "▾" : "▸"}</span>
            </div>
            {isOpen && (
              <div style={{ background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: g.singleLang ? "30%" : "24%" }}>Alan</th>
                      {g.singleLang
                        ? <th style={{ ...thStyle, width: "70%" }}>Değer</th>
                        : <>
                            <th style={{ ...thStyle, width: "38%" }}>Türkçe (TR)</th>
                            <th style={{ ...thStyle, width: "38%" }}>İngilizce (EN)</th>
                          </>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    {g.keys.map(({ key, label }) => (
                      <tr key={key}>
                        <td style={{ ...tdStyle, paddingLeft: 12, fontSize: 12, color: "var(--n500, #64748b)", fontWeight: 600 }}>{label}</td>
                        <td style={tdStyle}>
                          <textarea rows={1} value={getTR(key)} onChange={e => onChangeTR(key, e.target.value)} style={inputStyle} />
                        </td>
                        {!g.singleLang && (
                          <td style={tdStyle}>
                            <textarea rows={1} value={getEN(key)} onChange={e => onChangeEN(key, e.target.value)} style={inputStyle} />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      <div className="form-footer-bar" style={{ marginTop: 8 }}>
        <Btn variant="ghost" onClick={reset}><Icon name="trash" size={13} /> Varsayılana Sıfırla</Btn>
        <Btn onClick={save}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>
    </Section>
  );
};
