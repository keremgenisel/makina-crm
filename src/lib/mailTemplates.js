// E-posta varsayılan metinleri (konu + mesaj) ve yer tutucu doldurma.
// Kullanıcı şablonları Ayarlar > E-posta Şablonları'ndan düzenler; appSettings.mailTemplates
// altında saklanır. Boş bırakılan alan varsayılana döner (kayıtlı boş string varsayılanı ezmez).
// Yer tutucular: {firma} alıcı/müşteri adı, {no} belge no, {tarih}, {tur} Teklif/Proforma,
// {firmaAdi} bizim firma (Ayarlar > Firma Bilgileri), {belge} dışa aktarımda rapor adı.

export const DEFAULT_MAIL_TEMPLATES = {
  teklifProforma: {
    konu: "{tur} — {firma} — {no}",
    metin: "Sayın {firma},\n\n{tur} formunuz ekte yer almaktadır.\n\nİyi günler dileriz.\n{firmaAdi}",
  },
  teklifProformaEN: {
    konu: "{tur} — {firma} — {no}",
    metin: "Dear {firma},\n\nPlease find attached our {tur}.\n\nBest regards,\n{firmaAdi}",
  },
  fatura: {
    konu: "Invoice — {firma} — {no}",
    metin: "Dear {firma},\n\nPlease find attached your invoice.\n\nBest regards,\n{firmaAdi}",
  },
  makinaRaporu: {
    konu: "Makina Servis ve Yedek Parça Geçmişi Raporu - {firma}",
    metin: "Sayın {firma},\n\nMakinanıza ait servis ve yedek parça geçmişi raporu ekte yer almaktadır.\n\nİyi günler dileriz.\n{firmaAdi}",
  },
  makinaRaporuEN: {
    konu: "Machine Service and Spare Parts History Report - {firma}",
    metin: "Dear {firma},\n\nPlease find attached the service and spare parts history report for your machine.\n\nBest regards,\n{firmaAdi}",
  },
  servisFormu: {
    konu: "Servis Formu - {firma}",
    metin: "Sayın {firma},\n\nServis formunuz ekte yer almaktadır.\n\nİyi günler dileriz.\n{firmaAdi}",
  },
  servisFormuEN: {
    konu: "Service Form - {firma}",
    metin: "Dear {firma},\n\nPlease find attached your service form.\n\nBest regards,\n{firmaAdi}",
  },
  uretimFormu: {
    konu: "Kalıp Üretim Formu — {tarih}",
    metin: "Merhaba,\n\nKalıp üretim formu ekte yer almaktadır.\n\nİyi çalışmalar.\n{firmaAdi}",
  },
  disaAktarim: {
    konu: "{belge} — {firmaAdi}",
    metin: "Merhaba,\n\n{belge} ekte yer almaktadır.\n\nİyi çalışmalar.",
  },
};

// Kayıtlı şablonu varsayılanla birleştirip yer tutucuları doldurur.
// saved: appSettings.mailTemplates (null olabilir); key: DEFAULT_MAIL_TEMPLATES anahtarı;
// vars: { firma, no, tarih, tur, firmaAdi, belge } (eksik anahtar boş basılır).
export const renderMailTemplate = (saved, key, vars = {}) => {
  const def = DEFAULT_MAIL_TEMPLATES[key] || { konu: "", metin: "" };
  const kayitli = saved?.[key] || {};
  const doldur = (sablon) => String(sablon || "").replace(/\{(\w+)\}/g, (_, ad) => String(vars[ad] ?? ""));
  return {
    konu: doldur((kayitli.konu || "").trim() ? kayitli.konu : def.konu),
    metin: doldur((kayitli.metin || "").trim() ? kayitli.metin : def.metin),
  };
};
