// Sunucu tarafı yazma yetkisi — istemcinin gönderdiği tam veri blob'unda hangi
// bölümlerin değiştiğini bulur ve kullanıcının o bölümü yazma izni olup olmadığını
// denetler. İzin sistemi (src/lib/permissions.js) yalnızca arayüzde çalıştığı için,
// elle HTTP isteği atan bir istemci bu denetim olmadan tüm veriyi ezebilirdi.
//
// Saf modül: Electron/SQLite bağımlılığı yok, node altında test edilebilir.
// BLOB_SECTIONS burada tek kaynaktan tanımlanır; electron/db.cjs buradan alır ki
// yeni bir veri bölümü eklenince SECTION_GROUP haritası da güncellenmezse test kırılsın.

// Kalıcı veri bölümleri (SQLite'a yazılan durum dizileri/nesneleri).
const BLOB_SECTIONS = [
  "customers", "services", "partSales", "payments", "dealers", "stock", "notes",
  "parts", "partStock", "partStockLog", "gorusmeler", "kalipDefs", "standardModels",
  "customModels", "factory", "appSettings", "teklifler", "faturalar", "uretimFormlari",
];

// Her veri bölümü hangi izin grubuna bağlı. Gruplar src/lib/permissions.js ile aynı:
// customerActions/dealerActions/evrakActions/stockActions/notActions eylem listeleridir
// (boş dizi = o alanda hiçbir yazma yok); settings ise görünür alt-sekme listesidir.
const SECTION_GROUP = {
  customers: "customerActions",
  services: "customerActions",
  partSales: "customerActions",
  payments: "customerActions",
  gorusmeler: "customerActions",
  dealers: "dealerActions",
  teklifler: "evrakActions",
  faturalar: "evrakActions",
  stock: "stockActions",
  parts: "stockActions",
  partStock: "stockActions",
  partStockLog: "stockActions",
  uretimFormlari: "stockActions",
  notes: "notActions",
  kalipDefs: "settings",
  standardModels: "settings",
  customModels: "settings",
  factory: "settings",
  appSettings: "settings",
};

// İzin nesnesindeki tüm grup anahtarları — kısıtlı kullanıcı tespiti için.
const IZIN_GRUPLARI = ["customerActions", "dealerActions", "evrakActions", "stockActions", "notActions", "settings"];

// Nesne anahtarlarını sıralayarak kararlı (deterministik) JSON üretir. İstemci veriyi
// yüklerken alan sırasını değiştirebildiği için, alan sırasından kaynaklı sahte
// "değişti" tespitini önler; yalnızca gerçek değer farkları kalır.
function stableStringify(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const keys = Object.keys(v).sort();
  return "{" + keys.map(k => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") + "}";
}

// İki blob arasında değişen bölüm anahtarlarını döndürür. İstemci bir bölümü hiç
// göndermediyse (undefined) o bölüm "dokunulmamış" sayılır.
function degisenBolumler(oldBlob, newBlob) {
  const old = oldBlob || {};
  const yeni = newBlob || {};
  const changed = [];
  for (const key of BLOB_SECTIONS) {
    if (yeni[key] === undefined) continue;
    if (stableStringify(old[key]) !== stableStringify(yeni[key])) changed.push(key);
  }
  return changed;
}

function parsePerms(permissionsJson) {
  if (!permissionsJson) return null;
  try {
    const p = typeof permissionsJson === "string" ? JSON.parse(permissionsJson) : permissionsJson;
    return p && typeof p === "object" ? p : null;
  } catch { return null; }
}

// Bir grup için kullanıcı yazmaktan tümden engelli mi?
function grupEngelli(perms, group) {
  const v = perms[group];
  if (group === "settings") {
    // settings alt-sekme görünürlük listesidir; yalnızca bağlantı sekmesi ("server")
    // varsa kullanıcı hiçbir ayar/veri yazamaz. Tanımsız (dizi değil) = tam erişim.
    if (!Array.isArray(v)) return false;
    return !v.some(x => x !== "server");
  }
  // eylem grupları: boş dizi = tüm ekle/düzenle/sil engelli. Tanımsız = tam erişim.
  return Array.isArray(v) && v.length === 0;
}

// Kullanıcının en az bir bölümde yazma kısıtı var mı? (Yoksa pahalı fark denetimi atlanır.)
function kisitliMi(permissionsJson, role) {
  if (role === "admin") return false;
  const perms = parsePerms(permissionsJson);
  if (!perms) return false;
  return IZIN_GRUPLARI.some(g => grupEngelli(perms, g));
}

// changedSections içindeki her bölüm için kullanıcının yazma izni var mı?
// Dönüş: { ok: true } veya { ok: false, reddedilenBolum }.
// Not (blob mimarisi sınırı): grup boş değil ama kısmi ise (ör. düzenleyebilir ama
// silemez) blob düzeyinde eylem ayrımı yapılamaz, o yüzden yazmaya izin verilir.
// Bu denetim en büyük açığı kapatır: yetkisiz/salt-okunur kullanıcının bir bölümü ezmesi.
function yazmaYetkisiVar(permissionsJson, role, changedSections) {
  if (role === "admin") return { ok: true };
  const perms = parsePerms(permissionsJson);
  if (!perms) return { ok: true }; // izin tanımsız = tam erişim (mevcut istemci semantiği)
  for (const section of changedSections) {
    const group = SECTION_GROUP[section];
    if (!group) return { ok: false, reddedilenBolum: section }; // haritada yok → güvenli tarafta reddet
    if (grupEngelli(perms, group)) return { ok: false, reddedilenBolum: section };
  }
  return { ok: true };
}

module.exports = {
  BLOB_SECTIONS, SECTION_GROUP, IZIN_GRUPLARI,
  stableStringify, degisenBolumler, parsePerms, grupEngelli, kisitliMi, yazmaYetkisiVar,
};
