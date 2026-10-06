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

// E-posta gönderimini İşlem Geçmişi'ne (audit) yazan ortak sarmalayıcı. Başarılı gönderimde
// "eposta_gonderildi" kaydı düşer; istemci modunda logAction bunu /api/audit ile sunucuya yollar
// (admin, istemcilerin gönderdiği e-postaları merkezi görür). Başarısız/iptalde kayıt yazılmaz.
// E-posta günlüğünün kendisi hâlâ yerel (email-log.json); bu yalnız "kim/kime/ne zaman" izidir.
export async function sendMailLogged(payload, serverPermissions) {
  const res = await window.appMail?.send?.(payload);
  if (res?.ok) {
    logAction({
      serverPermissions,
      action: "eposta_gonderildi",
      entity: "eposta",
      entityName: payload?.to || payload?.subject || "",
      detail: { tur: payload?.type || "", konu: payload?.subject || "", alici: payload?.to || "" },
    });
  }
  return res;
}

// Geri alma için düzenleme ÖNCESİ kaydın anlık görüntüsü (detail.onceki'ye konur).
// Base64 resim taşıyan dev kayıtlar audit'i şişirmesin: ~200KB üstü anlık görüntü atlanır
// (o kayıt için "Öncesi/Geri Al" görünmez, diğer her şey normal loglanır).
export const snapshotOnceki = (kayit) => {
  if (!kayit || typeof kayit !== "object") return undefined;
  try {
    const json = JSON.stringify(kayit);
    if (json.length > 200000) return undefined;
    return JSON.parse(json);
  } catch { return undefined; }
};

// Spec 0073 R15, C7 (B-4): kasa hareketi düzenlemesinin işlem geçmişi kaydı, önceki değerlerle. Ödeme ve mahsup yeni
// `kasa_hareketi` entity'sinde ("odeme" müşteri tahsilatı demektir ve geri al haritasında payments ile eşleşir), virman ve
// avans bugünkü entity'lerinde. Üçü de geriAl haritasında YOKTUR (geri al düğmesi çıkmaz, X9). Ad, bugünkü ekleme/silme
// kayıtlarıyla aynı alanlardan gelir (çağıran verir).
export const HAREKET_ENTITY = { odeme: "kasa_hareketi", mahsup: "kasa_hareketi", virman: "virman", avans: "avans" };
export const hareketDuzenlemeKaydi = ({ serverPermissions, guncellenen, onceki, ad = "" }) =>
  logAction({ serverPermissions, action: "duzenlendi", entity: HAREKET_ENTITY[guncellenen?.tur] || "kasa_hareketi", entityId: guncellenen?.id, entityName: ad,
    detail: { onceki: snapshotOnceki(onceki), tutar: guncellenen?.tutar ?? null, tarih: guncellenen?.tarih ?? null } });
