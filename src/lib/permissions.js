export function parsePermissions(serverPermissions) {
  if (!serverPermissions || serverPermissions.role === "admin") return null;
  try { return JSON.parse(serverPermissions.permissions || "null"); } catch { return null; }
}

export function makeCanDo(serverPermissions, groupKey) {
  const perms = parsePermissions(serverPermissions);
  if (!perms) return () => true;
  const allowed = perms[groupKey] ?? null;
  return (action) => !allowed || allowed.includes(action);
}
