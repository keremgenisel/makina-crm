// Sunucu kullanıcı izin tanımları (saf veri + parse yardımcıları).
// SettingsServer.jsx'ten ayrıldı; yalnızca UserManager kullanır. İzin JSON'u şu
// bölümlerden oluşur: tabs, settings, customerActions, dealerActions, stockActions,
// evrakActions, notActions, financeActions. parse* fonksiyonları bir kullanıcının
// permissions string'inden ilgili bölümü çıkarır (yoksa null = varsayılan/tümü açık).

export const ALL_TABS = [
  { id: "dashboard", label: "Anasayfa" },
  { id: "customers", label: "Müşteriler" },
  { id: "dealers",   label: "Bayiler" },
  { id: "stock",     label: "Stok" },
  { id: "finance",   label: "Finans" },
  { id: "evrak",     label: "Evrak Yönetimi" },
  { id: "notes",     label: "Notlar" },
  { id: "settings",  label: "Ayarlar" },
];
export const DEFAULT_USER_TABS = ["dashboard", "customers", "dealers", "stock", "evrak", "notes"];

export function parseTabPerms(permissions) {
  try { return JSON.parse(permissions || "null")?.tabs ?? null; } catch { return null; }
}

export function parseSettingsPerms(permissions) {
  try { return JSON.parse(permissions || "null")?.settings ?? null; } catch { return null; }
}

export function parseCustomerActionsPerms(permissions) {
  try { return JSON.parse(permissions || "null")?.customerActions ?? null; } catch { return null; }
}

export function parseDealerActionsPerms(permissions) {
  try { return JSON.parse(permissions || "null")?.dealerActions ?? null; } catch { return null; }
}

export function parseStockActionsPerms(permissions) {
  try { return JSON.parse(permissions || "null")?.stockActions ?? null; } catch { return null; }
}

export function parseEvrakActionsPerms(permissions) {
  try { return JSON.parse(permissions || "null")?.evrakActions ?? null; } catch { return null; }
}

export function parseNotActionsPerms(permissions) {
  try { return JSON.parse(permissions || "null")?.notActions ?? null; } catch { return null; }
}

export function parseFinanceActionsPerms(permissions) {
  try { return JSON.parse(permissions || "null")?.financeActions ?? null; } catch { return null; }
}

export const CUSTOMER_ACTION_GROUPS = [
  { grup: "Müşteri Listesi", items: [
    { id: "cust_add",    label: "Yeni müşteri ekle" },
    { id: "cust_edit",   label: "Müşteri düzenle" },
    { id: "cust_delete", label: "Müşteri sil" },
  ]},
  { grup: "Müşteri Detayı", items: [
    { id: "cust_detail_edit",        label: "Ana kaydı düzenle" },
    { id: "cust_detail_add_machine", label: "Bu firmaya makina ekle" },
    { id: "cust_detail_new_owner",   label: "Yeni sahip (2. El Devir)" },
    { id: "cust_detail_print",       label: "Yazdır / Sandık Etiketi" },
    { id: "cust_detail_mail",        label: "E-posta gönder" },
  ]},
  { grup: "Makina Geçmişi — Servisler", items: [
    { id: "cust_service_add",     label: "Yeni servis talebi ekle" },
    { id: "cust_service_edit",    label: "Servis kaydını düzenle" },
    { id: "cust_service_payment", label: "Servis / parça ödeme durumu" },
    { id: "cust_service_delete",  label: "Servis kaydını sil" },
  ]},
  { grup: "Makina Geçmişi — Kalıp", items: [
    { id: "cust_kalip_add",     label: "Extra Kalıp Satışı ekle" },
    { id: "cust_kalip_edit",    label: "Kalıp satışını düzenle" },
    { id: "cust_kalip_payment", label: "Kalıp ödeme durumu" },
    { id: "cust_kalip_delete",  label: "Kalıp satışını sil" },
  ]},
  { grup: "Ödemeler / Kapora", items: [
    { id: "cust_payment_add",  label: "Kapora / ödeme ekle" },
    { id: "cust_taksit_tahsil", label: "Taksit tahsil et" },
    { id: "cust_payment_edit", label: "Ödeme düzenle / sil" },
  ]},
  { grup: "Görüşmeler", items: [
    { id: "cust_gorusme_add",  label: "Görüşme kaydı ekle/tamamla" },
    { id: "cust_gorusme_del",  label: "Görüşme kaydı sil" },
  ]},
  { grup: "Dosyalar", items: [
    { id: "cust_dosya_add",  label: "Dosya ekle" },
    { id: "cust_dosya_del",  label: "Dosya sil" },
  ]},
];

export const DEALER_ACTION_GROUPS = [
  { grup: "Bayi Listesi", items: [
    { id: "dealer_add",    label: "Yeni bayi ekle" },
    { id: "dealer_edit",   label: "Bayi düzenle" },
    { id: "dealer_delete", label: "Bayi sil" },
  ]},
  { grup: "Dosyalar", items: [
    { id: "dealer_dosya_add", label: "Dosya ekle" },
    { id: "dealer_dosya_del", label: "Dosya sil" },
  ]},
];

export const EVRAK_ACTION_GROUPS = [
  { grup: "Teklif", items: [
    { id: "evrak_teklif_add",     label: "Yeni teklif oluştur" },
    { id: "evrak_teklif_edit",    label: "Teklifi düzenle" },
    { id: "evrak_teklif_print",   label: "Yazdır / PDF kaydet" },
    { id: "evrak_teklif_mail",    label: "E-posta ile gönder" },
    { id: "evrak_teklif_convert", label: "Proformaya çevir / CRM'e kaydet" },
    { id: "evrak_teklif_delete",  label: "Teklifi sil" },
  ]},
  { grup: "Proforma", items: [
    { id: "evrak_proforma_add",     label: "Yeni proforma oluştur" },
    { id: "evrak_proforma_edit",    label: "Proformayı düzenle" },
    { id: "evrak_proforma_print",   label: "Yazdır / PDF kaydet" },
    { id: "evrak_proforma_mail",    label: "E-posta ile gönder" },
    { id: "evrak_proforma_convert", label: "Yurt dışı faturaya çevir" },
    { id: "evrak_proforma_delete",  label: "Proformayı sil" },
  ]},
  { grup: "Yurt Dışı Fatura", items: [
    { id: "evrak_fatura_add",    label: "Yeni fatura oluştur" },
    { id: "evrak_fatura_edit",   label: "Faturayı düzenle" },
    { id: "evrak_fatura_print",  label: "Yazdır / PDF kaydet" },
    { id: "evrak_fatura_mail",   label: "E-posta ile gönder" },
    { id: "evrak_fatura_delete", label: "Faturayı sil" },
  ]},
];

export const NOT_ACTION_GROUPS = [
  { grup: "Not İşlemleri", items: [
    { id: "not_add",    label: "Yeni not oluştur" },
    { id: "not_edit",   label: "Not düzenle / kaydet" },
    { id: "not_delete", label: "Notu sil" },
  ]},
];

export const FINANCE_ACTION_GROUPS = [
  { grup: "Finans — Tarih Aralıkları", items: [
    { id: "fin_range_all",       label: "Tüm Zamanlar" },
    { id: "fin_range_thisMonth", label: "Bu Ay" },
    { id: "fin_range_thisYear",  label: "Bu Yıl" },
    { id: "fin_range_lastYear",  label: "Geçen Yıl" },
    { id: "fin_range_custom",    label: "Özel Tarih" },
  ]},
  { grup: "Finans — İşlemler", items: [
    { id: "fin_rapor",           label: "Aylık rapor oluştur" },
    { id: "fin_anlasmali_detay", label: "Anlaşmalı servis detayını aç" },
  ]},
];

export const STOCK_ACTION_GROUPS = [
  { grup: "Makina Stoğu", items: [
    { id: "stock_makina_add",    label: "Stoğa makina ekle" },
    { id: "stock_makina_edit",   label: "Makina düzenle" },
    { id: "stock_makina_delete", label: "Makina sil" },
  ]},
  { grup: "Parça / Yedek Parça Stoğu", items: [
    { id: "stock_parca_add",  label: "Stoğa parça ekle" },
    { id: "stock_parca_edit", label: "Stok miktarı düzelt" },
    { id: "stock_parca_pin",  label: "Parçayı dashboarda ekle/çıkar" },
  ]},
  { grup: "Kalıp Üretim", items: [
    { id: "stock_uretim_add",    label: "Yeni form oluştur" },
    { id: "stock_uretim_edit",   label: "Formu düzenle" },
    { id: "stock_uretim_print",  label: "Formu yazdır" },
    { id: "stock_uretim_mail",   label: "E-posta ile gönder" },
    { id: "stock_uretim_delete", label: "Formu sil" },
  ]},
];

export const DANGER_SECTION = { id: "danger", label: "Uygulamayı Kaldır", grup: "Tehlikeli Bölge" };
