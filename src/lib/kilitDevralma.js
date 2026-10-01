// Spec 0064 R13, R24, R32 (AC-16, AC-32, AC-33): yedekten geri yüklemenin kilit ön denetimi ve devralma döngüsü. Saf
// yardımcılar; kilit köprüsü (window.crmLocks) parametreyle verilir. Sunucu değişmez: "başkalarının bütün kilitlerini
// bırak" diye bir uç nokta yoktur, devralma her kilit için sırayla acquire(force) ile yapılır.
import { kilitEtiketi } from "./kilitAlanlari";

export const DEVRALMA_SINIRI = 50;
export const DEVRALMA_SINIR_MESAJI = `Başka kullanıcıların açık kaydı ${DEVRALMA_SINIRI}'den fazla; geri yükleme yapılmadı. Kullanıcılar kayıtlarını kapattıktan sonra yeniden deneyin.`;
export const devralmaHataMesaji = (n) => `Kilitlerin bir kısmı devralınamadı (${n} kayıt); geri yükleme yapılmadı, az sonra yeniden deneyin.`;

// Başka kullanıcıların tuttuğu kilitler; ekrana insan okunur etiketle (ham entity_type yazılmaz).
export const baskaKilitler = (liste, aktifKullanici) => (Array.isArray(liste) ? liste : [])
  .filter(k => k && k.locked_by !== aktifKullanici)
  .map(k => ({ alan: k.entity_type, id: String(k.entity_id), sahip: k.locked_by, etiket: kilitEtiketi(k.entity_type, k.entity_id) }));

// Sırayla zorla devralır; sınır aşılırsa hiç denemez. Dönüş: { alinan: [{alan, id}], basarisiz, sinirAsildi }.
export const kilitleriDevral = async (kilitler, crmLocks, { sinir = DEVRALMA_SINIRI } = {}) => {
  if (kilitler.length > sinir) return { alinan: [], basarisiz: 0, sinirAsildi: true };
  const alinan = [];
  let basarisiz = 0;
  for (const k of kilitler) {
    try {
      const r = await crmLocks.acquire(k.alan, k.id, true);
      if (r?.ok) alinan.push({ alan: k.alan, id: k.id }); else basarisiz++;
    } catch { basarisiz++; }
  }
  return { alinan, basarisiz, sinirAsildi: false };
};

// R32: geri yükleme bitince (ya da yarıda kalınca) devralınan kilitler bırakılır; yoksa 2 dakika başkası tutuyormuş gibi kalır.
export const kilitleriBirak = async (alinan, crmLocks) => {
  for (const k of alinan) { try { await crmLocks?.release?.(k.alan, k.id); } catch { /* fail-open */ } }
};
