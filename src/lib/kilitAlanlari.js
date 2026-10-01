// Spec 0064 R19, R22, R33: kayıt kilidi (useLock / crmLocks) alanlarının TEK listesi. Her alan: insan okunur etiket
// (geri yükleme ön denetimi ve bildirimler bunu yazar; ham entity_type ekranda görünmez) ve o alanı paylaşan pencere
// dosyaları. Aynı kaydı iki pencere farklı alan adıyla kilitlemesin diye bütün useLock( ve baskasiKilitli( çağrılarının
// ilk argümanı bu listededir (tests/kilit-alanlari.test.js). Saf modül: React almaz.
// `pencereler` o alanın kilidi ALTINDA çizilen dosyalardır, kilidi kendisi alan dosyalar değil: kilidi pencereyi açan
// ebeveyn alır (R25), iç pencere (OdemeKayitPenceresi, OdemePlaniPenceresi, CiroPenceresi, HesapSilPenceresi) yalnız
// o ebeveynin kilidini paylaşır. Anlık denetimle (baskasiKilitli) bir alana bakan dosya da o alanın listesindedir.
// Ad paylaşımı kasıtlıdır: `kasa_hesap` gibi adlar denetim kaydı varlığı, izin kimliği ve kilit alanı olarak aynıdır.
export const KILIT_ALANLARI = {
  customer: { etiket: "Müşteri", pencereler: ["src/components/customers/CustomerAddEditForm.jsx", "src/components/customers/CustomerDetailModal.jsx", "src/components/ServisPanosu.jsx"] },
  dealer: { etiket: "Bayi", pencereler: ["src/components/SimpleDealers.jsx"] },
  note: { etiket: "Not", pencereler: ["src/components/Notes.jsx"] },
  teklif: { etiket: "Teklif", pencereler: ["src/components/Documents.jsx"] },
  fatura: { etiket: "Fatura", pencereler: ["src/components/Documents.jsx"] },
  yedek_parca: { etiket: "Yedek parça satışı", pencereler: ["src/components/stock/YedekParcaSatisTab.jsx", "src/components/customers/CustomerDetailModal.jsx", "src/components/ServisPanosu.jsx", "src/components/KargoPanosu.jsx"] },
  part_sale: { etiket: "Extra Kalıp satışı", pencereler: ["src/components/ServisPanosu.jsx"] },
  partstock: { etiket: "Parça stoğu", pencereler: ["src/components/stock/PartStokTab.jsx"] },
  stock: { etiket: "Makina stoğu", pencereler: ["src/components/stock/MakinaStokTab.jsx"] },
  "stok-seri": { etiket: "Stok seri numarası", pencereler: ["src/components/customers/CustomerAddEditForm.jsx"] },
  uretim_formu: { etiket: "Üretim formu", pencereler: ["src/components/stock/UretimFormu.jsx"] },
  // ── Spec 0064 ──
  // R1, R25: gider formu, Giderler'in ve Anasayfa'nın ödeme penceresi, ödeme planı (ödendi ve hedef anahtarları pencere açar),
  // çöpe taşıma onayı (triyaj). Kasa (kapsam dışı) ve Çek Portföyü (ciro / Çek Yaz kaydı, R36) kalemin kilidine anlık bakar.
  gider: { etiket: "Gider kalemi", pencereler: ["src/components/Giderler.jsx", "src/components/Dashboard.jsx", "src/components/GiderForm.jsx",
    "src/components/gider/OdemeKayitPenceresi.jsx", "src/components/gider/OdemePlaniPenceresi.jsx", "src/components/gider/OdemeGirisi.jsx", "src/components/Kasa.jsx",
    "src/components/cek/CekPortfoyu.jsx"] },
  // R2, R25: ciro, kendi çekimiz, çek durumu ve geçmişi (verilen çek dahil). CiroPenceresi yalnız ÇEKİN kilidini paylaşır; ödediği
  // gider kalemlerini korumaz, onlar kayıt anında Çek Portföyü'nün `gider` denetiminden geçer (R36).
  cek: { etiket: "Çek", pencereler: ["src/components/cek/CekPortfoyu.jsx", "src/components/cek/CiroPenceresi.jsx"] },
  // R3, R6, R25: hesap formu, hesap silme / taşıma, virmanın kaynak hesabı; R14 kapat / aç denetimi.
  kasa_hesap: { etiket: "Kasa hesabı", pencereler: ["src/components/Kasa.jsx", "src/components/kasa/HesapSilPenceresi.jsx"] },
  tedarikci: { etiket: "Tedarikçi", pencereler: ["src/components/gider/Tedarikciler.jsx"] },
  uretim_partisi: { etiket: "Üretim partisi", pencereler: ["src/components/gider/UretimPartileri.jsx"] },
  // Plan notu (R33): standart genel gider grubunun tutar / ad / sona erdirme penceresi (spec'te sayılmamıştı).
  standart_gider: { etiket: "Standart genel gider", pencereler: ["src/components/gider/StandartGiderler.jsx"] },
  // R5, R20, R30: avans ver, avanstan mahsup, ekstreden avans silme, Ayarlar'da çalışan satırı.
  calisan: { etiket: "Çalışan", pencereler: ["src/components/kasa/CalisanAvanslari.jsx", "src/components/gider/OdemeGirisi.jsx", "src/components/CalisanManager.jsx", "src/components/Kasa.jsx"] },
  // R7, R9, R11–R13, R27: veri yazan Ayarlar panelleri (kimlik = Ayarlar kalem kimliği).
  ayar: { etiket: "Ayarlar paneli", pencereler: ["src/components/Settings.jsx"] },
};

// R9, R27: kilitlenen Ayarlar panelleri (Settings.jsx'teki sabit kimlikler) ve insan okunur adları. "Çalışma saatleri"
// ayrı panel değildir, `company`'nin içindedir. Salt okunur paneller (securitylog, auditlog, sentmail, securitystatus,
// export) ve bilgisayara özgü ayar yazanlar (eposta, server, danger) burada yoktur. `security` paylaşılan
// `autoLockMinutes`'i yazdığı için kilitlidir (plan notu).
export const AYAR_KILITLI = {
  app: "Uygulama", musteri: "Müşteri Görünümü", servispano: "Servis ve Kargo Panosu", company: "Firma Bilgileri", calisanlar: "Firma Çalışanları",
  models: "Makina Modelleri", kaliplar: "Kalıp Modelleri", yedekparca: "Parça/Yedek Parça", parcatipi: "Parça Tipleri",
  gidertur: "Gider Türleri", gidertanim: "Tekrarlayan Giderler", giderayar: "Gider Ayarları",
  kdv: "KDV Oranı", kkkomisyon: "Kredi Kartı Komisyonları", evrak: "Teklif/Proforma/Yurt Dışı Fatura", ceviri: "Çeviriler", takip: "Takip Süreleri",
  mailsablon: "E-posta Şablonları", security: "Uygulama Şifresi", backup: "Yedekleme", import: "İçe Aktar", optimize: "Resim Optimize", trash: "Çöp Kutusu", sahipsiz: "Sahipsiz Kayıtlar",
};
// R31: kilitli panelde "Geri Dön" ilk görünen salt okunur panele geçer.
export const AYAR_SALT_OKUNUR = ["securitystatus", "export", "sentmail", "auditlog", "securitylog"];

// R33 (AC-35): gider/, kasa/, cek/ ve settings/ altında kilit almayan dosyalar ve gerekçeleri. Listede de pencere
// listesinde de olmayan dosya testi düşürür (yeni bir pencere kilitsiz doğmasın).
export const KILITSIZ_DOSYALAR = {
  "src/components/gider/DonemRaporu.jsx": "salt okunur rapor görünümü",
  "src/components/gider/EkstrePenceresi.jsx": "salt okunur ekstre; avans silme çağıranın (CalisanAvanslari) anlık denetiminden geçer",
  "src/components/gider/FiyatOnerisi.jsx": "salt okunur hesap",
  "src/components/gider/GiderAlanlari.jsx": "paylaşılan alanlar; pencereyi açan kilitler",
  "src/components/gider/GiderPerdesi.jsx": "bilgi sayfası",
  "src/components/gider/KdvKarsilastirmaKarti.jsx": "salt okunur kart",
  "src/components/gider/MakinaKarliligi.jsx": "salt okunur görünüm",
  "src/components/gider/MakinaMaliyetDetay.jsx": "salt okunur görünüm",
  "src/components/gider/MakinaModelGorunumu.jsx": "salt okunur görünüm",
  "src/components/gider/OdemeHatirlatma.jsx": "liste; Ödendi düğmesi Anasayfa'nın gider kilitli ödeme penceresini açar",
  "src/components/kasa/TahsilatHesap.jsx": "satış kaydının formuna gömülü alan / pencere; kaydın kendi kilidi (müşteri, yedek parça) altında",
  "src/components/cek/CekEklePenceresi.jsx": "yeni kayıt (kimlik yok, R17)",
  "src/components/settings/csvUtils.js": "yardımcı",
  "src/components/settings/serverPermissionDefs.js": "izin tanımları",
  "src/components/settings/SettingsAuditLog.jsx": "salt okunur panel",
  "src/components/settings/SettingsSecurityLog.jsx": "salt okunur panel",
  "src/components/settings/SettingsSecurityStatus.jsx": "salt okunur panel",
  "src/components/settings/SettingsSentMail.jsx": "salt okunur panel",
  "src/components/settings/SettingsExport.jsx": "salt okunur panel (dışa aktarma)",
  "src/components/settings/SettingsMail.jsx": "bilgisayara özgü kimlik bilgisi (blob değil)",
  "src/components/settings/SettingsTwoFactor.jsx": "kullanıcı başına sunucu uç noktası (X2)",
  "src/components/settings/SettingsServer.jsx": "bilgisayara özgü sunucu ayarı (blob değil)",
  "src/components/settings/SettingsDanger.jsx": "bilgisayara özgü işlemler (kaldırma, uygulama kilidi)",
  "src/components/settings/UserManager.jsx": "kullanıcı başına sunucu uç noktası (X2)",
};
// Settings.jsx'in `ayar` kilidi altında çizilen panel dosyaları (her biri bir AYAR_KILITLI kimliğinin panelidir).
export const AYAR_PANEL_DOSYALARI = [
  "src/components/settings/SettingsApp.jsx", "src/components/settings/SettingsMusteri.jsx", "src/components/settings/SettingsServisPanosu.jsx",
  "src/components/settings/SettingsCompany.jsx", "src/components/settings/GiderTurManager.jsx", "src/components/settings/SettingsGiderTanimlari.jsx",
  "src/components/settings/SettingsGider.jsx", "src/components/settings/SettingsKdv.jsx", "src/components/settings/SettingsKKKomisyon.jsx",
  "src/components/settings/SettingsDocuments.jsx", "src/components/settings/SettingsTranslations.jsx", "src/components/settings/SettingsTakip.jsx",
  "src/components/settings/SettingsMailTemplates.jsx", "src/components/settings/SettingsSecurity.jsx", "src/components/settings/SettingsBackup.jsx", "src/components/settings/SettingsImport.jsx",
  "src/components/settings/SettingsOptimize.jsx", "src/components/settings/SettingsTrash.jsx", "src/components/settings/SettingsSahipsiz.jsx",
];

export const kilitAlaniEtiketi = (alan) => KILIT_ALANLARI[alan]?.etiket || "Kayıt";
// Ekranda gösterilen kilit adı: alanın etiketi + kayıt kimliği; Ayarlar panelinde panelin adı (ham kimlik yazılmaz).
export const kilitEtiketi = (alan, id) => (alan === "ayar" && AYAR_KILITLI[id] ? `${kilitAlaniEtiketi(alan)} · ${AYAR_KILITLI[id]}` : `${kilitAlaniEtiketi(alan)} · ${id}`);
// R14: anlık işlemin reddinde gösterilen TEK metin (Kasa, çalışan avansları, standart gider, çek portföyü). `ad` verilirse
// kimlik yerine o yazılır (ör. standart gider grubunun adı).
export const kilitRedMesaji = (k, ad) => `${kilitEtiketi(k.entity_type, ad ?? k.entity_id)} şu an "${k.locked_by}" tarafından düzenleniyor; işlem yapılmadı.`;
