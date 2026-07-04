import { useState, useEffect, useRef } from "react";

/**
 * entityType: 'customer' | 'dealer' | 'stock' | 'note' | 'teklif' | 'fatura' | 'service' | 'part_sale'
 * entityId: number | string | null (null = yeni kayıt, kilit alınmaz)
 *
 * Döndürür:
 *   lockLoading:   true  → kilit kontrolü devam ediyor (içerik gösterilmemeli)
 *   lockConflict:  null  → kilit alındı / yeni kayıt
 *                  { lockedBy, lockedAt } → başkası düzenliyor
 *   forceAcquire: () => void — kilidi zorla devral
 */
export function useLock(entityType, entityId) {
  const [lockLoading,  setLockLoading]  = useState(() => !!(entityId && window?.crmLocks));
  const [lockConflict, setLockConflict] = useState(null);
  const acquiredRef = useRef(false);

  useEffect(() => {
    if (!entityId || !window.crmLocks) {
      acquiredRef.current = false;
      setLockLoading(false);
      setLockConflict(null);
      return;
    }
    let active = true;
    acquiredRef.current = false;
    setLockLoading(true);
    setLockConflict(null);

    const doAcquire = (force = false) =>
      window.crmLocks.acquire(entityType, String(entityId), force).then(result => {
        if (!active) return;
        if (result?.ok) {
          acquiredRef.current = true;
          setLockConflict(null);
        } else {
          acquiredRef.current = false;
          setLockConflict({ lockedBy: result?.lockedBy, lockedAt: result?.lockedAt });
        }
        setLockLoading(false);
      }).catch(() => {
        if (!active) return;
        acquiredRef.current = true; // bağlantı yoksa fail-open
        setLockConflict(null);
        setLockLoading(false);
      });

    doAcquire(false);

    // TTL (2 dak) dolmadan kilidi yenile: her 60 sn'de re-acquire
    const heartbeat = setInterval(() => {
      if (acquiredRef.current) doAcquire(false);
    }, 60_000);

    return () => {
      active = false;
      clearInterval(heartbeat);
      if (acquiredRef.current) {
        acquiredRef.current = false;
        window.crmLocks.release(entityType, String(entityId)).catch(() => {});
      }
    };
  }, [entityType, entityId]);

  const forceAcquire = () => {
    if (!entityId || !window.crmLocks) return;
    setLockLoading(true);
    window.crmLocks.acquire(entityType, String(entityId), true).then(result => {
      if (result?.ok) { acquiredRef.current = true; setLockConflict(null); }
      setLockLoading(false);
    }).catch(() => { acquiredRef.current = true; setLockConflict(null); setLockLoading(false); });
  };

  return { lockLoading, lockConflict, forceAcquire };
}
