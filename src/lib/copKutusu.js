// Spec 0068: Çöp Kutusu'na ilişkin ortak metin ve kurallar. Saf, React'sız.
import { trLower } from "./utils";

// R12, R13, R22: kalıcı silinen bölümlerin onay pencereleri ve Çöp Kutusu'nun bilgi satırı TEK sabitten okur; ekranlarda
// kalıcılık metni ayrıca yazılmaz (kaynak taraması).
export const KALICI_SILME_NOTU = "Bu kayıt çöp kutusuna gitmez, kalıcı silinir.";
// R13: Çöp Kutusu ekranında hangi bölümlerin kalıcı silindiğini söyleyen tek satır.
export const KALICI_SILINEN_BOLUMLER = "Tekrarlayan gider tanımı, gider türü, standart genel gider, kasa hesabı, çek, ödeme hareketi ve kapsam dışı kaydı";

// R20: geri alınacak kayıtla aynı adda (Türkçe harf duyarsız) canlı bir kayıt varsa geri alma yapılmaz; neden döner.
export const geriAlmaAdCakismasi = (kayit, liste = [], tur = "kayıt") => {
  const ad = trLower(String(kayit?.ad || "").trim());
  if (!ad) return null;
  const var_ = (liste || []).find(x => x && !x.deletedAt && String(x.id) !== String(kayit.id) && trLower(String(x.ad || "").trim()) === ad);
  return var_ ? `Geri alınamadı: “${var_.ad}” adında bir ${tur} zaten var. Önce onu yeniden adlandırın.` : null;
};
