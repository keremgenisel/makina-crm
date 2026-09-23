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

/**
 * Görünür üst sekmeler. Yerel mod / sunucu PC / admin → tümü; user rolü → izin listesi.
 * Tek istisna (spec 0001 C6 kural 3): sekme listesi tanımsız user rolü "gider" sekmesini GÖRMEZ;
 * bu uygulamadaki "tanımsız = serbest" kuralının aksine gider yalnız açıkça verildiğinde görünür.
 * @param {Array<{id: string}>} tabs
 * @param {string | null} serverMode
 * @param {import("../types").ServerPermissions | null | undefined} serverPermissions
 */
export function gorunurSekmeler(tabs, serverMode, serverPermissions) {
  if (serverMode !== "active") return tabs;
  if (!serverPermissions || serverPermissions.role === "admin") return tabs;
  const giderHaric = tabs.filter(t => t.id !== "gider");
  try {
    const allowed = JSON.parse(serverPermissions.permissions || "null")?.tabs;
    if (!Array.isArray(allowed)) return giderHaric;
    return tabs.filter(t => allowed.includes(t.id));
  } catch { return giderHaric; }
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
    giderActions: [],
    settings: ["server"],
  }),
};