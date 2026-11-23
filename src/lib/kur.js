// Spec 0153 C9/2 (Karar 2): kur ayrıştırıcısı, öneri, çevrim ilkelleri ve para metni YAPRAK modülde. Hiçbir lib modülünü içe
// almaz (yalnız sabitler), böylece gider motoru da okuyabilir; doviz.js (0152) aynı adlarla yeniden dışa verir, çağıranlar
// değişmedi. Taşınan kurallar 0152'deki gibidir: elle kur en çok dört, öneri ve türetilen altı ondalık; çevrim bir kez kuruşa.
import { CUR_SYM } from "./constants";

export const ondalikYuvarla = (n, h) => Math.round(n * 10 ** h) / 10 ** h;
const yuvarla = ondalikYuvarla;
// ── Kur önerisi (0132'den taşındı; malzeme.js yeniden dışa verir, P9) ─────────────────────────────────────────────────────
export const KUR_ALINMADI = "Günün kuru henüz alınmadı; kuru elle yazabilirsiniz.";
export const KUR_CEVRIMDISI = "Çevrimdışı olduğu için günün kuru alınamadı; kuru elle yazabilirsiniz.";
export const dovizMi = (pb) => pb === "USD" || pb === "EUR";
// `rates` = { usd, eur } (App, "1 birim kaç TL"), `ratesErr` çevrimdışı. Dönüş { deger, neden }. Öneri her zaman bugünün kurudur.
export const kurOnerisi = (pb, rates, ratesErr) => {
  if (!dovizMi(pb)) return { deger: null, neden: null };
  const v = rates ? rates[pb === "USD" ? "usd" : "eur"] : null;
  if (v > 0) return { deger: v, neden: null };
  return { deger: null, neden: ratesErr ? KUR_CEVRIMDISI : KUR_ALINMADI };
};
export const ONERI_BUGUN_IBARESI = "Önerilen kur bugünün kurudur; işlem başka bir güne aitse o günün kurunu yazın.";
// ── Kur ayrıştırıcısı (R5/2, AC-37) ─────────────────────────────────────────────────────────────────────────────────────
export const KUR_KAYNAK = { ELLE: "elle", ONERI: "oneri", TURETILEN: "turetilen" };
export const KUR_ONDALIK_ELLE = 4;
export const KUR_ONDALIK_EN_COK = 6;
export const KUR_BOS_HATASI = "Kur girilmedi; kur olmadan kaydedilmez.";
export const KUR_SAYI_HATASI = "Kur sayıya çevrilemedi. Örnek: 35,5";
export const KUR_POZITIF_HATASI = "Kur sıfırdan büyük olmalı.";
export const kurOndalikHatasi = (n) => `Kur en çok ${n} ondalık hane taşır.`;
export const kurCoz = (ham, { kaynak = KUR_KAYNAK.ELLE } = {}) => {
  const ondalik = kaynak === KUR_KAYNAK.ONERI || kaynak === KUR_KAYNAK.TURETILEN ? KUR_ONDALIK_EN_COK : KUR_ONDALIK_ELLE;
  if (typeof ham === "number") return Number.isFinite(ham) && ham > 0 ? { deger: ham, hata: null } : { deger: null, hata: KUR_POZITIF_HATASI };
  const t = String(ham ?? "").replace(/\s/g, "");
  if (!t) return { deger: null, hata: KUR_BOS_HATASI };
  if (t.startsWith("-")) return { deger: null, hata: KUR_POZITIF_HATASI };
  const m = /^(\d+)(?:[.,](\d+))?$/.exec(t);
  if (!m) return { deger: null, hata: KUR_SAYI_HATASI };
  if (m[2] && m[2].length > ondalik) return { deger: null, hata: kurOndalikHatasi(ondalik) };
  const n = Number(`${m[1]}.${m[2] || "0"}`);
  return n > 0 ? { deger: n, hata: null } : { deger: null, hata: KUR_POZITIF_HATASI };
};
export const kurGirdisi = (n) => (n == null || !(n > 0) ? "" : String(yuvarla(n, KUR_ONDALIK_EN_COK)).replace(".", ","));

export const dovizKurusu = (tlK, kur) => (kur > 0 ? Math.round(tlK / kur) : 0);
export const karsiKurusu = (cikanK, kur) => (kur > 0 ? Math.round(cikanK * kur) : 0);
export const kurTuret = (payK, paydaK) => (payK > 0 && paydaK > 0 ? yuvarla(payK / paydaK, KUR_ONDALIK_EN_COK) : null);
export const paraMetni = (n, pb = "TRY") => `${CUR_SYM[pb] || `${pb} `}${Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// Spec 0156 triyaj (bulgu 3): "1 USD = 40,00 TL" kur satırının tek biçimleyicisi (gider kalemi ve ekstre ayrıntısı).
export const kurSatiriMetni = (pb, kur) => `1 ${pb} = ${kurMetni(kur)} TL`;
export const kurMetni = (kur) => Number(kur || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: KUR_ONDALIK_EN_COK });

// Spec 0153 R2/2, P10: günün kurundan yüzde elliden fazla sapan kur engellemeyen uyarı doğurur; günün kuru yoksa uyarı yok.
export const KUR_SAPMA_ORANI = 0.5;
export const kurSapmaUyarisi = (kur, gununKuru) => (kur > 0 && gununKuru > 0 && Math.abs(kur - gununKuru) / gununKuru > KUR_SAPMA_ORANI
  ? `Yazılan kur günün kurundan (${kurMetni(gununKuru)}) yüzde ${KUR_SAPMA_ORANI * 100}'den fazla sapıyor; kuru kontrol edin.` : null);
