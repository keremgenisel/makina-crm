let _localUsername = "yerel";
export function setAuditUsername(name) { _localUsername = name || "yerel"; }

// Fire-and-forget — hata fırlatmaz, asla UI'ı bloklamaz
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
      window.appServer?.apiRequest({ method: "POST", path: "/api/audit", body: entry });
    } else {
      // Yerel veya sunucu PC modu — gerçek admin adını kullan
      window.auditLog?.log({ ...entry, username: _localUsername, role: "admin" });
    }
  } catch {}
}
