let _localUsername = "yerel";
export function setAuditUsername(name) { _localUsername = name || "yerel"; }
// Görüşme kayıtları gibi "kim yaptı" alanı taşıyan kayıtlar için — App açılışta config'ten set eder
export function getAuditUsername() { return _localUsername; }

// Fire-and-forget — hata fırlatmaz, asla UI'ı bloklamaz. Yine de promise'i döndürür ki
// yazımın tamamlanmasını beklemek isteyen nadir çağıranlar (örn. geçmiş temizleme sonrası
// listeyi yenilemeden önce) await edebilsin.
export function logAction({ serverPermissions, action, entity, entityId, entityName, detail } = {}) {
  try {
    const entry = {
      action: action || "",
      entity: entity || "",
      entity_id: entityId ?? null,
      entity_name: entityName || "",
      detail: detail ? JSON.stringify(detail) : null,
      ts: new Date().toISOString(),
    };
    if (serverPermissions) {
      // İstemci modu: sunucu JWT'den username'i alır
      return window.appServer?.apiRequest({ method: "POST", path: "/api/audit", body: entry });
    }
    // Yerel veya sunucu PC modu — gerçek admin adını kullan
    return window.auditLog?.log({ ...entry, username: _localUsername, role: "admin" });
  } catch { return undefined; }
}
