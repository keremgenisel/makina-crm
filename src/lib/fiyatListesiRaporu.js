// Spec 0133 R17, R17/2, AC-25, AC-41, AC-90, AC-91 (Karar 38): bugünkü yürürlükteki fiyatlarla fiyat listesi. Kendi modülündedir
// (printTemplates.js'e yazılmaz), sunum dilini 0059'un raporSunumu.js'inden alır, hücrelerini kendi kaçışlar ve yalnız Türkçe basar.
// Saf: React almaz, saat okumaz (tarih parametre). Fiyat tek okuma yolundan (`parcaSatisFiyati`); burada çarpım yoktur.
import { belgeAcilis, bolum, detayTablo, not, gun } from "./raporSunumu";
import { parseMoney } from "./utils";
import { parcaSatisFiyati, turetilmisFiyatSayisi, TURETILEMEDI } from "./parcaFiyati";

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const tam = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
export const FIYAT_LISTESI_BASLIGI = "Fiyat Listesi";
// 2026-11-15 Takım Yöneticisi isteği: "Kip" ve "Kâr katı" sütunları kalktı; liste yalnız parça, kod ve fiyat yazar.
export const FIYAT_LISTESI_SUTUNLARI = ["Parça", "Kod", "Fiyat (TL)"];

// Satırın yürürlükteki fiyatı: maliyete bağlı parçada türetilmiş (kuruşlu), elle sabitte girilen değer; türetilemeyen "fiyat
// türetilemedi" (AC-25).
export const fiyatListesiSatiri = (p, baglam) => {
  const r = parcaSatisFiyati(p, "TRY", baglam);
  const elle = parseMoney(r.deger);
  const fiyat = r.turetilmis ? (r.deger === "" ? TURETILEMEDI : `${turetilmisFiyatSayisi(r.deger)} ₺`) : (elle > 0 ? `${tam.format(elle)} ₺` : "—");
  return [esc(p.ad), esc(p.kod || ""), fiyat];
};

export const fiyatListesiHtml = (parcalar = [], baglam, { bugun, factory = null } = {}) => {
  const satirlar = (parcalar || []).filter(p => p && !p.deletedAt).map(p => fiyatListesiSatiri(p, baglam));
  return `${belgeAcilis({ title: FIYAT_LISTESI_BASLIGI, baslik: FIYAT_LISTESI_BASLIGI.toLocaleUpperCase("tr-TR"), ust: "Yedek parça satış fiyatları (KDV hariç)", donem: gun(bugun), factory })}
  ${bolum("PARÇALAR", `${satirlar.length} parça`, detayTablo("Yürürlükteki fiyatlar", FIYAT_LISTESI_SUTUNLARI, satirlar, ["left", "left", "right"]) || not("Listede parça yok."))}
  ${not("Maliyete bağlı parçanın fiyatı bugünkü maliyetinden ve kâr katından türer; elle sabit parçada girilen fiyat yazılır. Dolar ve euro fiyatları bu listede yoktur.")}
</body></html>`;
};
