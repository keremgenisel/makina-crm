// Spec 0086 R1: seçmeli geri yüklemenin paketleri VERİ olarak. Her paket geri yüklediği bölümleri yedek dosyasındaki
// adlarıyla taşır; ekranda görünen cümle bu listeden üretilir (bolumAdlari.paketCumlesi). Geri yükleme dalı
// (SettingsBackup.applyRestore) listeden sürülmez (B1): liste ile dalın aynı bölümleri saydığını ve paketlerin
// birleşiminin bütün veri bölümlerini kapsadığını `tests/yedek-paketleri-0086.test.js` sabitler.
//
// YENİ BİR VERİ BÖLÜMÜ eklenince üç yer birlikte güncellenir (C6): geri yükleme dalı, buradaki paketin `bolumler`
// listesi ve geri yüklemedeki kimlik sayacı listesi (`bumpId`). Paket kimlikleri, sırası ve sayısı değişmez (R6).

// R5: gider ayarları uygulama ayarlarının içindedir, yani "Firma ve ayarlar" paketinde taşınır.
export const GIDER_AYAR_NOTU = "Gider ayarları (gider takibi yürürlük ayı, varsayılan kira stopaj oranı, kira stopajı beyan dönemi, "
  + "stopaj ödeme günü, ödeme hatırlatma eşiği, binek araç giderlerinde indirilebilir oran, hesapsız kayıt başlangıç tarihi, "
  + "deneme dönemi bitiş tarihi) bu pakette değil, \"Firma ve ayarlar\" paketinde geri yüklenir.";
// R8 (0052 R19): Kasa yetkisi olmayan kullanıcıda Kasa'ya ait kayıtlara dokunulmaz.
export const KASASIZ_NOTU = "Kasa yetkiniz olmadığı için kasa hesapları, kasa iş listesi, virman ve avans hareketleri ve verilen çekler "
  + "bugünkü hâliyle korunur.";
// R11: makinaya özgü alanlar (utils.YEREL_AYAR_ALANLARI) geri yüklenmez, disAppSettingsSuz ayıklar.
export const YEREL_AYAR_NOTU = "Bu bilgisayarın yedekleme ayarları (otomatik yedek, yedek klasörü, yedekleme sıklığı, son yedek tarihi) "
  + "geri yüklenmez; bugünkü değerleri korunur.";

// Triyaj (bulgu 1): yedekteki fiziksel dosyalar yedek açılır açılmaz depoya yazılır (electron/ipc/data.cjs restore ve
// şifre çözme yolları → files.geriYukleDosyalar; aynı adlı dosyanın üzerine yazar), paket seçiminden ve "Vazgeç"ten bağımsız.
// "Dosyalar" kutusu yalnız dosya kayıt listesini (hangi dosyanın hangi kayda bağlı olduğu) geri yükler. Davranış kapsam dışı (C1).
export const DOSYA_NOTU = "Yedekteki dosyaların kendisi yedek açılırken depoya eklenir (aynı adlı dosyanın üzerine yazılır); bu kutu "
  + "yalnız müşteri, makina, servis ve bayi kayıtlarına bağlı dosya listesini geri yükler.";

// R4: çek bölümü iki pakete bölünür (0049 triyajı); her paket kendi payını söyler. P2: teklifler proformaları da taşır.
export const YEDEK_PAKETLERI = [
  { id: "musteri", ad: "Müşteri verileri",
    bolumler: ["customers", "services", "partSales", "payments", { bolum: "cekler", metin: "tahsilata bağlı çekler" }, "gorusmeler"] },
  { id: "evrak", ad: "Evraklar", bolumler: [{ bolum: "teklifler", metin: "teklifler ve proformalar" }, "faturalar"] },
  { id: "stok", ad: "Stok ve üretim", bolumler: ["stock", "partStock", "partStockLog", "uretimFormlari", "yedekParcaSatislar"] },
  { id: "bayi", ad: "Bayiler", bolumler: ["dealers"] },
  { id: "dosyalar", ad: "Dosyalar", bolumler: ["dosyalar"], notlar: [{ metin: DOSYA_NOTU }] },
  { id: "tanim", ad: "Tanımlar", bolumler: ["customModels", "standardModels", "kalipDefs", "partTypeDefs", "parts", "calisanlar"] },
  { id: "not", ad: "Notlar", bolumler: ["notes"] },
  { id: "gider", ad: "Giderler",
    bolumler: ["giderler", "giderTanimlari", "giderTurleri", "tedarikciler", "uretimPartileri", "kasaHesaplari", "hesapHareketleri",
      { bolum: "cekler", metin: "bağsız ve verilen çekler" }, "kasaKapsamDisi"],
    notlar: [{ metin: GIDER_AYAR_NOTU }, { metin: KASASIZ_NOTU, yalnizKasasiz: true }] },
  { id: "ayar", ad: "Firma ve ayarlar", bolumler: ["factory", "appSettings"], ekler: ["mailConfig", "mailLog"],
    notlar: [{ metin: YEREL_AYAR_NOTU }] },
];

// Gider paketi yalnız gider yetkisiyle görünür (spec 0001 R11, 0008 K3); sıra ve kimlikler değişmez.
export const restorePaketleri = ({ giderYetki }) => YEDEK_PAKETLERI.filter(p => p.id !== "gider" || giderYetki);

// Paketin bu kullanıcıda görünen notları (R5, R8, R11). Koşul yalnız metni seçer, seçili paket kümesine dokunmaz (R6).
export const paketNotlari = (paket, { kasaVeriYetki }) => (paket.notlar || []).filter(n => !n.yalnizKasasiz || !kasaVeriYetki).map(n => n.metin);
