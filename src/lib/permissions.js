// @ts-check
/**
 * Sunucu izin bilgisini grup→eylem[] haritasına çözer. admin veya izinsiz → null (kısıt yok).
 * @param {import("../types").ServerPermissions | null | undefined} serverPermissions
 * @returns {Record<string, string[]> | null}
 */
export function parsePermissions(serverPermissions) {
  if (!serverPermissions || serverPermissions.role === "admin") return null;
  try { return JSON.parse(serverPermissions.permissions || "null"); } catch { return null; }
}

/**
 * Bir izin grubu için "bu eylem yapılabilir mi?" yükleci üretir. İzin yoksa her şeye izin verir.
 * @param {import("../types").ServerPermissions | null | undefined} serverPermissions
 * @param {string} groupKey
 * @returns {(action: string) => boolean}
 */
export function makeCanDo(serverPermissions, groupKey) {
  const perms = parsePermissions(serverPermissions);
  if (!perms) return () => true;
  const allowed = perms[groupKey] ?? null;
  return (action) => !allowed || allowed.includes(action);
}

// ── Salt okunur mod izin seti ────────────────────────────────────────────────
// İstemci sunucuya ulaşamayınca alt bileşenlere gerçek izinler yerine bu set
// geçilir: her eylem kategorisi boş dizi (= tüm ekle/düzenle/sil butonları
// gizli), Ayarlar'da sadece Sunucu sekmesi açık (yeniden bağlanmak için).
// `tabs` bilerek yok — gezinme ve görüntüleme serbest. role "user" olmalı,
// çünkü parsePermissions "admin" görünce izinleri tamamen yok sayar.
export const READONLY_SERVER_PERMISSIONS = {
  role: "user",
  permissions: JSON.stringify({
    customerActions: [],
    dealerActions: [],
    evrakActions: [],
    stockActions: [],
    notActions: [],
    settings: ["server"],
  }),
};