// Spec 0068, 0078: Çöp Kutusu'na ilişkin ortak kurallar ve satır etiketleri. Saf, React'sız.
// Spec 0078 R3: 0068'in KALICI_SILME_NOTU ve KALICI_SILINEN_BOLUMLER sabitleri kaldırıldı; kasa ve gider bölümleri artık
// çöp kutusuna gidiyor ve kullanıcıya görünen kalıcı silme penceresi kalmadı (0068 AC-39 serbest metin yasağı yerinde).
import { trLower, fmtTR, fmtCur } from "./utils";
import { davranisOf, DAVRANIS } from "./gider";

// R20: geri alınacak kayıtla aynı adda (Türkçe harf duyarsız) canlı bir kayıt varsa geri alma yapılmaz; neden döner.
export const geriAlmaAdCakismasi = (kayit, liste = [], tur = "kayıt") => {
  const ad = trLower(String(kayit?.ad || "").trim());
  if (!ad) return null;
  const var_ = (liste || []).find(x => x && !x.deletedAt && String(x.id) !== String(kayit.id) && trLower(String(x.ad || "").trim()) === ad);
  return var_ ? `Geri alınamadı: “${var_.ad}” adında bir ${tur} zaten var. Önce onu yeniden adlandırın.` : null;
};

// ── Spec 0078 R24: satır etiketleri sabit eşlemeden. Kalem adı, tedarikçi adı, çalışan adı ve çekte keşideci YAZILMAZ
// (0058 R21 işlem geçmişi kuralı ve 0001 K21 gizliliği). ──
export const HAREKET_COP_TUR = { odeme: "Ödeme", virman: "Virman", avans: "Avans", mahsup: "Avanstan mahsup" };
export const hareketCopEtiketi = (h) => [h?.tarih ? fmtTR(h.tarih) : "Tarihsiz", fmtCur(Number(h?.tutar) || 0, "TRY")].join(" · ");
export const cekCopEtiketi = (c) => `${c?.banka || "—"} · ${c?.no || "—"}`;
// Tanımın adı personel tanımında çalışanın adıdır; o yüzden personel tanımında yalnız tür adı yazılır.
export const tanimCopEtiketi = (t, turMap) => {
  const tur = turMap?.get(String(t?.turId))?.ad || "Gider";
  return davranisOf(t, turMap) === DAVRANIS.PERSONEL || t?.calisanId != null ? tur : `${tur} · ${t?.ad || "—"}`;
};
const HESAP_TUR_COP = { kasa: "Kasa", banka: "Banka", kart: "Kredi kartı" };
export const hesapCopEtiketi = (h) => `${h?.ad || "—"} · ${HESAP_TUR_COP[h?.tur] || h?.tur || "Hesap"}`;

// R38: standart gider grup olarak silinir; Çöp Kutusu'nda (grup, damga) başına tek satır, geri alma o damgalı sürümleri
// döndürür. Ad, grubun en geç başlayan çöpteki sürümünden.
export const standartCopGruplari = (liste = []) => {
  const m = new Map();
  for (const s of liste || []) {
    if (!s?.deletedAt) continue;
    const k = `${s.grupId ?? s.id}|${s.deletedAt}`;
    if (!m.has(k)) m.set(k, { grupId: s.grupId ?? s.id, deletedAt: s.deletedAt, surumler: [] });
    m.get(k).surumler.push(s);
  }
  return [...m.values()].map(g => {
    const son = [...g.surumler].sort((a, b) => String(b.baslangicAy || "").localeCompare(String(a.baslangicAy || "")))[0];
    return { ...g, ad: son?.ad || "—" };
  });
};
// R18, R16: grup geri alınırken aynı grupta canlı sürüm ya da başka bir grupta aynı adda canlı sürüm varsa yapılmaz.
export const standartGeriAlmaCakismasi = (grup, liste = []) => {
  const canli = (liste || []).filter(s => s && !s.deletedAt);
  if (canli.some(s => String(s.grupId ?? s.id) === String(grup.grupId))) return "Geri alınamadı: bu standart giderin canlı bir sürümü zaten var.";
  const ad = trLower(String(grup.ad || "").trim());
  const ayni = ad && canli.find(s => trLower(String(s.ad || "").trim()) === ad);
  return ayni ? `Geri alınamadı: “${ayni.ad}” adında bir standart gider zaten var. Önce onu yeniden adlandırın.` : null;
};
