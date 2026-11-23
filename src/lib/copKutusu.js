// Spec 0068, 0078: Çöp Kutusu'na ilişkin ortak kurallar ve satır etiketleri. Saf, React'sız.
// Spec 0078 R3: 0068'in KALICI_SILME_NOTU ve KALICI_SILINEN_BOLUMLER sabitleri kaldırıldı; kasa ve gider bölümleri artık
// çöp kutusuna gidiyor ve kullanıcıya görünen kalıcı silme penceresi kalmadı (0068 AC-39 serbest metin yasağı yerinde).
import { trLower, fmtTR, fmtCur } from "./utils";
import { davranisOf, DAVRANIS } from "./gider";
import { DUZELTME_TUR, DUZELTME_TUR_ADI, hareketParaBirimi } from "./kasa";
import { dovizOdemeMi, bozdurmaMi } from "./doviz";

// R20: geri alınacak kayıtla aynı adda (Türkçe harf duyarsız) canlı bir kayıt varsa geri alma yapılmaz; neden döner.
export const geriAlmaAdCakismasi = (kayit, liste = [], tur = "kayıt") => {
  const ad = trLower(String(kayit?.ad || "").trim());
  if (!ad) return null;
  const var_ = (liste || []).find(x => x && !x.deletedAt && String(x.id) !== String(kayit.id) && trLower(String(x.ad || "").trim()) === ad);
  return var_ ? `Geri alınamadı: “${var_.ad}” adında bir ${tur} zaten var. Önce onu yeniden adlandırın.` : null;
};

// ── Spec 0078 R24: satır etiketleri sabit eşlemeden. Kalem adı, tedarikçi adı, çalışan adı ve çekte keşideci YAZILMAZ
// (0058 R21 işlem geçmişi kuralı ve 0001 K21 gizliliği). ──
export const HAREKET_COP_TUR = { odeme: "Ödeme", virman: "Virman", avans: "Avans", mahsup: "Avanstan mahsup", [DUZELTME_TUR]: DUZELTME_TUR_ADI };
// Spec 0151 R8/2 (AC-49): tutar isteğe bağlı para biriminde (döviz hesabın düzeltmesi); parametresiz çağrı bugünkü çıktı (TL).
// Spec 0152 R15/2 (Karar 14, AC-48): döviz ödemede hesaptan çıkan döviz tutar, bozdurmada çıkan bacak; ikisi de kayıttaki para
// birimiyle (hesap kalıcı silinmiş olsa da). Öteki hareketlerde çıktı birebir eski.
// Spec 0155 R20, R20/2 (AC-36): bu madde 0078 R24'ü ve 0058 R21'i tedarikçi AVANSI için açıkça ters çevirir; tedarikçi adı
// gizlilik kuralı değildir, avans satırı onu yazar (`tedarikciAdi`). Çalışan adı yasağı yerinde; ödeme satırı adsız kalır.
// R22/2 (AC-47): döviz yüklemi türden bağımsız, döviz avans kendi para biriminde.
export const hareketCopEtiketi = (h, paraBirimi = "TRY", { tedarikciAdi = null } = {}) => {
  const doviz = dovizOdemeMi(h);
  const tutar = doviz ? h.dovizTutar : h?.tutar;
  const pb = doviz || bozdurmaMi(h) ? hareketParaBirimi(h, { paraBirimi }) : paraBirimi || "TRY";
  const ad = h?.tur === "avans" && h.tedarikciId != null && tedarikciAdi ? [tedarikciAdi] : [];
  return [...ad, h?.tarih ? fmtTR(h.tarih) : "Tarihsiz", fmtCur(Number(tutar) || 0, pb)].join(" · ");
};
export const cekCopEtiketi = (c) => `${c?.banka || "—"} · ${c?.no || "—"}`;
// Tanımın adı personel tanımında çalışanın adıdır; o yüzden personel tanımında yalnız tür adı yazılır.
export const tanimCopEtiketi = (t, turMap) => {
  const tur = turMap?.get(String(t?.turId))?.ad || "Gider";
  return davranisOf(t, turMap) === DAVRANIS.PERSONEL || t?.calisanId != null ? tur : `${tur} · ${t?.ad || "—"}`;
};
const HESAP_TUR_COP = { kasa: "Kasa", banka: "Banka", kart: "Kredi kartı" };
export const hesapCopEtiketi = (h) => `${h?.ad || "—"} · ${HESAP_TUR_COP[h?.tur] || h?.tur || "Hesap"}`;

