// Spec 0085 R13–R16, R19: Sunucu Bağlantısı'ndaki "Bağlı bilgisayarlar ve sürümleri" kartının saf özeti.
// Ham güvenlik kaydı (security_log satırları, `detail` JSON dizesi) girer; kullanıcı başına tek satır çıkar.
// Ekran kendi gruplamasını yazmaz.
//
// - Yalnız sunucunun kendi yazdığı iki eylem sayılır (R14, C2): `ingest` ucundan gelen app-lock satırının
//   detayı istemcinin beyanıdır, sürüm taşısa bile karta girmez.
// - Geri döngü adresinden gelen satır atlanır (revizyon 3 P2): sunucu kurulum akışı `authenticateLogin`'i
//   127.0.0.1 ile çağırır; o satır sunucu bilgisayarının kendisidir, kart yalnız istemcileri listeler (R13).
// - Satır anahtarı kullanıcı adıdır (P3); en son görülen kayıt kalır.
// - Karşılaştırma `surumDahaYeni` ile (R15). Sunucunun kendi sürümü bilinmiyorsa (köprü henüz cevap vermedi, dev kipi)
//   sürümü bilinen satır ne "eski" ne "guncel"dir: "karsilastirilmadi" (triyaj: "hepsi güncel" demek yanlıştı, R22).
import { surumDahaYeni } from "./utils.js";
import { ISTEMCI_SURUM_ALANI } from "../../electron/istemciSurum.mjs";

export const SURUM_KAYIT_EYLEMLERI = ["giris_basarili", "oturum_yenilendi"];
export const SURUM_OKUMA_LIMITI = 200;
const GERI_DONGU = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1", "localhost"]);

export const geriDonguMu = (ip) => GERI_DONGU.has(String(ip || "").trim());

const detayOku = (d) => {
  if (d == null || d === "") return {};
  if (typeof d === "object") return d;
  try { const o = JSON.parse(d); return o && typeof o === "object" ? o : null; } catch { return null; }
};

// Bir kaydın beyan ettiği istemci sürümü (yoksa null). Kullanıcı Geçmişi'nin rozeti de bunu okur.
export function kayitIstemciSurumu(kayit) {
  const d = detayOku(kayit?.detail);
  const s = d && d[ISTEMCI_SURUM_ALANI];
  return typeof s === "string" && s ? s : null;
}

// Spec 0112 R4/2: `/api/users` ucunun gövdesini süzme kümesine çevirir. Dizi değilse, boşsa ya da adsız satırlardan sonra
// boş kalıyorsa null (süzme yok, kart güvenli açık çizer: Karar 1, Karar 8). Adlar kırpılır; `is_active`'e bakılmaz (pasif
// kullanıcı listede kalır, R2).
export function kullaniciAdlari(cevap) {
  if (!Array.isArray(cevap)) return null;
  const adlar = cevap.map(u => String(u?.username ?? "").trim()).filter(Boolean);
  return adlar.length ? adlar : null;
}

// kayitlar: security_log satırları (iki çağrının birleşimi, sıra önemsiz). sunucuSurum: bu bilgisayarın sürümü.
// adlar (spec 0112): var olan kullanıcı adları dizisi ya da null. Verilirse yalnız listede olan kullanıcıların satırları kalır;
// karşılaştırma kırpılmış ve BİREBİRdir (harf katlama yok, R2/2): giriş büyük-küçük harfe duyarlı. Süzme okuma penceresinden
// sonra uygulanır (X7). Verilmezse çıktı spec 0085'tekiyle birebir aynı (R4); dönüş şekli dondurulmuştur (C7).
// Dönüş: { satirlar: [{ kullanici, surum, ts, ip, durum: "guncel"|"eski"|"bilinmiyor"|"karsilastirilmadi" }], guncellenmeli,
// karsilastirildi }. guncellenmeli eski + bilinmeyen satırları sayar; karşılaştırılamayan satır sayılmaz.
export function surumOzeti(kayitlar, sunucuSurum, adlar = null) {
  const varOlan = Array.isArray(adlar) ? new Set(adlar.map(a => String(a ?? "").trim())) : null;
  const enYeni = new Map();
  for (const k of Array.isArray(kayitlar) ? kayitlar : []) {
    if (!k || !SURUM_KAYIT_EYLEMLERI.includes(k.action)) continue;
    const kullanici = String(k.actor || "").trim();
    if (!kullanici) continue;
    if (geriDonguMu(k.ip)) continue;
    if (detayOku(k.detail) === null) continue; // bozuk JSON
    const onceki = enYeni.get(kullanici);
    if (!onceki || String(k.ts || "") > String(onceki.ts || "")) enYeni.set(kullanici, k);
  }
  const satirlar = [...enYeni.values()].filter(k => !varOlan || varOlan.has(String(k.actor).trim())).map(k => {
    const surum = kayitIstemciSurumu(k);
    const durum = !surum ? "bilinmiyor" : !sunucuSurum ? "karsilastirilmadi" : surumDahaYeni(sunucuSurum, surum) ? "eski" : "guncel";
    return { kullanici: String(k.actor).trim(), surum, ts: k.ts || "", ip: k.ip || "", durum };
  }).sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : a.kullanici.localeCompare(b.kullanici, "tr")));
  return { satirlar, guncellenmeli: satirlar.filter(s => s.durum === "eski" || s.durum === "bilinmiyor").length, karsilastirildi: !!sunucuSurum };
}
