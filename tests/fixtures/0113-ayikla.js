// Spec 0113 C8: Finans ekran metni kıyaslarında (0079, 0095) bu spec'in bilinçli değişikliklerini ayıklar. Ödendi işareti olan
// dört bedel kutusu tahsil edilen kümeye daraldı ve adı değişti (R1, R16/2); "Toplam Bedel" kartı bu dört bileşeni ve onların
// KDV'sini taşıdığı için tutarı, KDV satırı ve alt yazısı da değişir (R10, R10/2; plan turu Karar 21). Ayıklama aynı fonksiyonla
// hem spec öncesi altına hem bugünkü çıktıya uygulanır, bu yüzden ESKİ ve YENİ adı birlikte tanır. Kartlar arası öteki her metin
// ("Toplam Alacak", "Ödenmesi Muhtemel KDV", makina kartları, kredi kartı kartları) birebir karşılaştırılmaya devam eder.
import { TAHSIL_KART_ADLARI } from "../../src/components/Finance";

export const ESKI_KART_ADLARI_0113 = {
  servis: "Toplam Servis Ücreti Bedeli",
  parca: "Toplam Parça Ücreti Bedeli",
  anlasmali: "Toplam Anlaşmalı Servislere Satılan Parça Bedeli",
  kalip: "Toplam Extra Kalıp Satış Bedeli",
};
const kac = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const servisBasi = `(?:${kac(ESKI_KART_ADLARI_0113.servis)}|${kac(TAHSIL_KART_ADLARI.servis)})`;

export const ayikla0113 = (t) => (typeof t !== "string" ? t : t
  .replace(/Toplam Bedel[\s\S]*?(?=Toplam Alacak)/, "Toplam Bedel[0113]")
  .replace(new RegExp(`${servisBasi}[\\s\\S]*?(?=Toplam Ödenen Komisyon)`), "[0113 dört kutu]"));
