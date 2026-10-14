// Spec 0086 R2, R9: veri bölümlerinin Türkçe adları (renderer). Sunucunun işlem kaydı sözlüğü (`electron/server.cjs`
// `BOLUM_ADLARI`) aynı 32 blob bölümünü aynı adlarla taşır; eşitliği `tests/yedek-paketleri-0086.test.js` sabitler
// (sunucu dosyası renderer'dan içe aktarılamadığı için iki kopya, X5). Yeni bir veri bölümü eklenince iki sözlüğe de girer.
import { trLower } from "./utils.js";

export const BOLUM_ADLARI = {
  customers: "Müşteriler", services: "Servisler", partSales: "Kalıp/Parça Satışları", payments: "Ödemeler",
  dealers: "Bayiler", stock: "Makina Stoğu", notes: "Notlar", parts: "Yedek Parça Tanımları",
  partStock: "Parça Stoğu", partStockLog: "Stok Hareketleri", gorusmeler: "Görüşmeler", dosyalar: "Dosyalar",
  kalipDefs: "Kalıp Tanımları", standardModels: "Standart Modeller", customModels: "Özel Modeller",
  factory: "Firma Bilgileri", appSettings: "Uygulama Ayarları", teklifler: "Teklifler", faturalar: "Faturalar",
  uretimFormlari: "Üretim Formları", partTypeDefs: "Parça Tipleri", calisanlar: "Firma Çalışanları",
  yedekParcaSatislar: "Yedek Parça Satışları",
  giderler: "Giderler",
  giderTanimlari: "Tekrarlayan Giderler",
  giderTurleri: "Gider Türleri",
  tedarikciler: "Tedarikçiler",
  uretimPartileri: "Üretim Partileri",
  kasaHesaplari: "Kasa ve Banka Hesapları", hesapHareketleri: "Hesap Hareketleri",
  cekler: "Çek Portföyü",
  kasaKapsamDisi: "Kasa İş Listesi (kapsam dışı)",
};

// R1/2: yedek dosyasında bulunan ama uygulama durumuna değil e-posta köprüsüne geri yüklenen iki alan. Blob bölümü
// değildir (BLOB_SECTIONS'ta yok), sözlük eşitliğinin dışında durur.
export const EK_ADLARI = { mailConfig: "E-posta Yapılandırması", mailLog: "E-posta Geçmişi" };

// Paketin `bolumler` girdisi düz bölüm kimliği ya da { bolum, metin } (o pakete özel ifade, R1/1).
export const girdiBolumu = (g) => (typeof g === "string" ? g : g.bolum);

// R2, C4: paketin açıklama cümlesi listeden üretilir (sırayı izler, küçük harf, virgülle). Küçültme trLower ile
// ("Kasa İş Listesi" toLowerCase ile bozuk "i̇" üretirdi, Ö-6).
export function paketCumlesi(paket) {
  const parca = (g) => (typeof g === "string" ? trLower(BOLUM_ADLARI[g] || g) : g.metin);
  return [...(paket.bolumler || []).map(parca), ...(paket.ekler || []).map(e => trLower(EK_ADLARI[e] || e))].join(", ");
}
