import { useState, useEffect, useCallback } from "react";
import { kilitRedMesaji } from "../lib/kilitAlanlari";

/**
 * Spec 0064 R14, R28: pencere açmayan anlık işlemler kilit TUTMAZ; işlem anında canlı kilit listesine bakılır ve kayıt
 * BAŞKA bir kullanıcı tarafından kilitliyse işlem reddedilir (Servis Panosu emsali, oradan buraya taşındı). Liste
 * sunucudan gelir ve kilit değişince yenilenir; kilit servisi yoksa (yerel kip) liste boştur, hiçbir şey engellenmez.
 * Kendi kullanıcısının kilidi engel değildir (R15). Alan adları src/lib/kilitAlanlari.js'tedir.
 *
 * baskasiKilitli(alan, idler) → başkasının tuttuğu kilit kaydı ({ entity_type, entity_id, locked_by, ... }) ya da null.
 * kilitliIse(alan, idler, ad, bildir) → spec 0128 R1, R4: kilit başkasındaysa nedeni tek red metniyle (kilitRedMesaji, `ad`
 * insan okunur kayıt adı) bildirir ve true döner; çağıran hiçbir şey yazmadan çıkar. Silme ve tek alan işlemleri kilit TUTMAZ.
 */
// Triyaj (bulgu 1): köprünün onLocksChanged'i her abonelikte öncekini siler (tek aboneye göre yazılmış). Kanca aynı anda
// birden çok yerde açık olabildiği için (Kasa + Çalışan avansları, Servis Panosu) abonelik modül düzeyinde TEK bir
// depodadır: tek köprü dinleyicisi, referans sayımı, liste bütün React abonelerine yayılır. Son abone gidince köprü
// aboneliği bırakılır ve depo sıfırlanır.
const depo = { abone: new Set(), liste: [], off: null, nesil: 0 };
const yay = () => { for (const f of depo.abone) f(depo.liste); };
const depoYenile = () => {
  if (!window.crmLocks?.list) return;
  const nesil = depo.nesil;
  window.crmLocks.list().then(r => { if (nesil !== depo.nesil) return; depo.liste = Array.isArray(r) ? r : []; yay(); }).catch(() => {});
};
function depoyaAboneOl(f) {
  depo.abone.add(f);
  if (depo.abone.size === 1) {
    const off = window.appServer?.onLocksChanged?.(depoYenile);
    depo.off = typeof off === "function" ? off : null;
  }
  // Yeni abone de güncel listeyle başlasın (önceki abonenin aldığı liste bayat olabilir).
  depoYenile();
  return () => {
    depo.abone.delete(f);
    if (depo.abone.size === 0) { if (depo.off) depo.off(); depo.off = null; depo.liste = []; depo.nesil++; }
  };
}

export function useKilitListesi(aktifKullanici) {
  const [kilitler, setKilitler] = useState(() => depo.liste);
  useEffect(() => {
    if (!window.crmLocks?.list) return;
    return depoyaAboneOl(setKilitler);
  }, []);
  const baskasiKilitli = useCallback((entityType, ids) => {
    const set = new Set((Array.isArray(ids) ? ids : [ids]).filter(x => x != null).map(String));
    return kilitler.find(k => k.entity_type === entityType && set.has(String(k.entity_id)) && k.locked_by !== aktifKullanici) || null;
  }, [kilitler, aktifKullanici]);
  const kilitliIse = useCallback((entityType, ids, ad, bildir) => {
    const k = baskasiKilitli(entityType, ids);
    if (!k) return false;
    bildir?.(kilitRedMesaji(k, ad || undefined), "err");
    return true;
  }, [baskasiKilitli]);
  return { kilitler, baskasiKilitli, kilitliIse };
}
