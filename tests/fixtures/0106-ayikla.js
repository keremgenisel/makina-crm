// Spec 0106: ekran metni kıyaslarında (0079, 0095) bu spec'in bilinçli eklemelerini ayıklar: müşteri listesinin Durum sütunu
// başlığı ve pilleri, altıncı süzgeç pili, müşteri detayındaki makina durumu satırı, kalıp ve Extra Kalıp seçicileri. Metinler
// kütüphanenin sabitlerinden kurulur; kıyasın asıl iddiası (o spec ekranı değiştirmedi) korunur.
import { PILLER, MAKINA_DURUMU_ETIKETI, KALIP_DURUMU_ETIKETI, TESLIM_SUZGECI, DURUM_SUTUNU, KALIP_DURUM_ADLARI, makinaSecenekleri, AYNA_SATIR_IBARESI } from "../../src/lib/musteriDurumu";

const kac = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pilMetinleri = Object.values(PILLER).map(p => kac(p.metin)).join("|");
const makinaSecenek = makinaSecenekleri().map(o => o.label).join("");
const kalipSecenek = Object.values(KALIP_DURUM_ADLARI).join("");
const otomatik = `Otomatik \\((?:${Object.values(KALIP_DURUM_ADLARI).map(kac).join("|")})\\)`;

export const ayikla0106 = (t) => (typeof t !== "string" ? t : t
  .replace(new RegExp(`${kac(TESLIM_SUZGECI.etiket)} \\(\\d+\\)`, "g"), "")
  .replace(new RegExp(`Model${kac(DURUM_SUTUNU)}Seri No`, "g"), "ModelSeri No")
  .replace(new RegExp(`(?:${pilMetinleri})(?: \\d+/\\d+)?`, "g"), "")
  .replace(new RegExp(kac(MAKINA_DURUMU_ETIKETI) + kac(makinaSecenek), "g"), "")
  .replace(new RegExp(`(?:${kac(KALIP_DURUMU_ETIKETI)})?${otomatik}${kac(kalipSecenek)}`, "g"), "")
  .replace(new RegExp(`(?:${Object.values(KALIP_DURUM_ADLARI).map(kac).join("|")})? · ${kac(AYNA_SATIR_IBARESI)}`, "g"), ""));
