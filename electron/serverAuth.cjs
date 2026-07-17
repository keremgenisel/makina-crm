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
  "parts", "partStock", "partStockLog", "gorusmeler", "dosyalar", "kalipDefs", "standardModels",
  "customModels", "factory", "appSettings", "teklifler", "faturalar", "uretimFormlari",
  "partTypeDefs",
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
  dosyalar: "customerActions",
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
  partTypeDefs: "settings",
  standardModels: "settings",
  customModels: "settings",
  factory: "settings",
  appSettings: "settings",
};

// İzin nesnesindeki tüm grup anahtarları — kısıtlı kullanıcı tespiti için.
const IZIN_GRUPLARI = ["customerActions", "dealerActions", "evrakActions", "stockActions", "notActions", "settings"];

// ── Sekme (tabs) düzeyi yazma kısıtı ────────────────────────────────────────────
// REGRESYON: arayüzün "Kullanıcı Ekle" formu izin gövdesine YALNIZ {tabs:[...]} yazıyordu.
// Sunucu tabs'ı hiç tanımadığı için 6 eylem grubunun hepsi tanımsız kalıyor, grupEngelli her
// biri için false dönüyor ve kisitliMi false oluyordu: üç katmanlı denetimin tamamı atlanıyor,
// "Ayarlar sekmesi kapalı" diye oluşturulan kullanıcı curl ile KDV oranını değiştirebiliyordu.
//
// Model: bir bölüm, onu MEŞRU olarak yazabilen ekranların sekmelerine bağlıdır. Kullanıcının
// bu sekmelerinden hiçbiri açık değilse o bölüm salt okunur olmalıdır. Eşleme grup→sekme değil
// bölüm→sekme(ler): bölümler tek bir ekrana ait değil (ör. makina satışı Müşteriler ekranından
// stok düşer, Kalıp Üretim formu Stok sekmesinden müşteri yazar). Grup→sekme kurulsaydı "Stok
// sekmesi kapalı" olan bir kullanıcı makina satamaz hale gelirdi; meşru kullanım kırılırdı.
// Listeler koddan doğrulandı (setX çağıran her bileşenin hangi sekmede render edildiğine bakılarak).
// "settings" her bölümde var: Ayarlar'daki yedek geri yükleme / içe aktarma / çöp kutusu
// gerçekten de tüm bölümleri yazar. "dashboard" yalnız gorusmeler'de (Dashboard görüşme yazar).
// Finans ve Harita sekmeleri hiçbir bölüm yazmaz, o yüzden hiçbir listede yoklar.
const BOLUM_SEKMELERI = {
  customers:      ["customers", "dealers", "stock", "settings"],
  services:       ["customers", "dealers", "settings"],
  partSales:      ["customers", "stock", "settings"],
  payments:       ["customers", "settings"],
  gorusmeler:     ["customers", "dashboard", "settings"],
  dosyalar:       ["customers", "dealers", "settings"],
  dealers:        ["dealers", "settings"],
  teklifler:      ["evrak", "settings"],
  faturalar:      ["evrak", "settings"],
  stock:          ["stock", "customers", "settings"],
  parts:          ["settings"],
  partStock:      ["stock", "customers", "settings"],
  partStockLog:   ["stock", "customers", "settings"],
  uretimFormlari: ["stock", "settings"],
  notes:          ["notes", "settings"],
  kalipDefs:      ["settings"],
  partTypeDefs:   ["settings"],
  standardModels: ["settings"],
  customModels:   ["settings"],
  factory:        ["settings"],
  appSettings:    ["settings", "stock"],
};

// appSettings tek bir bölüm ama iki ayrı sahibi var: asıl ayarlar (KDV, otomatik yedek) Ayarlar
// sekmesine, pinnedPartIds ise Stok > Parça ekranındaki "dashboarda ekle" düğmesine ait. Bölüm
// düzeyinde bakılsaydı ikisinden biri mutlaka yanlış olurdu: Ayarlar'a bağlansa varsayılan
// kullanıcı (Ayarlar kapalı, Stok açık) parça sabitleyemezdi; Stok'a da izin verilseydi asıl
// açık (KDV oranını değiştirme) kapanmazdı. O yüzden appSettings ALAN düzeyinde denetlenir.
const AYAR_ALAN_SEKMELERI = {
  kdvRates:      ["settings"],
  kdvRate:       ["settings"], // eski tek-oranlı veri
  autoBackup:    ["settings"],
  backupFolder:  ["settings"],
  frequency:     ["settings"],
  pinnedPartIds: ["settings", "stock"],
};
// Hiçbir sekmeye ait olmayan alanlar: otomatik yedekleme her istemcide App.jsx'te çalışır ve
// başarılı yedek sonrası lastBackup yazar — sekmesi olmayan bu yazma engellenirse Ayarlar
// sekmesi kapalı her kullanıcıda otomatik yedek 403 alırdı.
const AYAR_SERBEST_ALANLAR = new Set(["lastBackup"]);
// Haritada olmayan yeni bir alan eklenirse güvenli tarafta kal: Ayarlar sekmesine aitmiş say.
const AYAR_VARSAYILAN_SEKMELER = ["settings"];

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

// Bir bölüm, kullanıcının açık sekmelerinden hiçbiri tarafından yazılamıyor mu?
// tabs tanımsızsa (dizi değil) tüm sekmeler açık sayılır — mevcut istemci semantiği.
function sekmeEngelli(perms, section) {
  const tabs = perms?.tabs;
  if (!Array.isArray(tabs)) return false;
  const yazanSekmeler = BOLUM_SEKMELERI[section];
  if (!yazanSekmeler) return true; // haritada yok → güvenli tarafta reddet
  return !yazanSekmeler.some(t => tabs.includes(t));
}

// appSettings içinde değişen alanlardan ilk izinsiz olanın adını döndürür (yoksa null).
// Yalnız gerçekten DEĞİŞEN alanlara bakar: istemci blob'un tamamını geri yazdığı için
// dokunulmamış alanlar her istekte gelir ve bunlar reddedilmemeli.
function ayarAlanEngelli(perms, eskiAyar, yeniAyar) {
  const eski = eskiAyar || {}, yeni = yeniAyar || {};
  const tumAlanlar = new Set([...Object.keys(eski), ...Object.keys(yeni)]);
  for (const alan of tumAlanlar) {
    if (AYAR_SERBEST_ALANLAR.has(alan)) continue;
    if (stableStringify(eski[alan]) === stableStringify(yeni[alan])) continue;
    const sekmeler = AYAR_ALAN_SEKMELERI[alan] || AYAR_VARSAYILAN_SEKMELER;
    const tabs = perms?.tabs;
    if (Array.isArray(tabs) && !sekmeler.some(t => tabs.includes(t))) return alan;
  }
  return null;
}

// Kullanıcının en az bir bölümde yazma kısıtı var mı? (Yoksa pahalı fark denetimi atlanır.)
// Hem eylem grupları hem sekme görünürlüğü sayılır: yalnız {tabs:[...]} taşıyan bir izin
// gövdesi de kısıtlıdır (regresyon: eskiden false dönüp tüm denetimi atlatıyordu).
function kisitliMi(permissionsJson, role) {
  if (role === "admin") return false;
  const perms = parsePerms(permissionsJson);
  if (!perms) return false;
  if (IZIN_GRUPLARI.some(g => grupEngelli(perms, g))) return true;
  return BLOB_SECTIONS.some(s => sekmeEngelli(perms, s));
}

// changedSections içindeki her bölüm için kullanıcının yazma izni var mı?
// İki boyut denetlenir: eylem grubu (customerActions vb.) ve sekme görünürlüğü (tabs).
// Dönüş: { ok: true } veya { ok: false, reddedilenBolum, reddedilenAlan? }.
// oldBlob/newBlob yalnız appSettings alan düzeyi denetimi için gerekir; verilmezse o bölüm
// de bölüm düzeyinde denetlenir (daha katı taraf).
// Not (blob mimarisi sınırı): grup boş değil ama kısmi ise (ör. düzenleyebilir ama
// silemez) blob düzeyinde eylem ayrımı yapılamaz, o yüzden yazmaya izin verilir.
// Bu denetim en büyük açığı kapatır: yetkisiz/salt-okunur kullanıcının bir bölümü ezmesi.
function yazmaYetkisiVar(permissionsJson, role, changedSections, oldBlob, newBlob) {
  if (role === "admin") return { ok: true };
  const perms = parsePerms(permissionsJson);
  if (!perms) return { ok: true }; // izin tanımsız = tam erişim (mevcut istemci semantiği)
  for (const section of changedSections) {
    const group = SECTION_GROUP[section];
    if (!group) return { ok: false, reddedilenBolum: section }; // haritada yok → güvenli tarafta reddet
    if (grupEngelli(perms, group)) return { ok: false, reddedilenBolum: section };
    // appSettings iki sahipli: sekme denetimi bölüm değil ALAN düzeyinde yapılır.
    if (section === "appSettings" && oldBlob && newBlob) {
      const alan = ayarAlanEngelli(perms, oldBlob.appSettings, newBlob.appSettings);
      if (alan) return { ok: false, reddedilenBolum: section, reddedilenAlan: alan };
      continue;
    }
    if (sekmeEngelli(perms, section)) return { ok: false, reddedilenBolum: section };
  }
  return { ok: true };
}

// ── Eylem düzeyi (ekle/sil) yetki denetimi ──────────────────────────────────────
// yazmaYetkisiVar yalnız BÖLÜM düzeyinde bakar: grup tümden engelli değilse (kısmi izin,
// örn. "düzenle var, sil yok") tüm bölüm değişikliğine izin verir. Bu, el yapımı bir istekle
// düzenleme yetkilisinin SİLME yapmasına açık bırakır. Aşağıdaki denetim, gelen blob'u eskisiyle
// kayıt-kayıt (id) diff'leyip izinsiz EKLE/SİL'i yakalar. DÜZENLEME bilinçli olarak bölüm
// düzeyinde bırakıldı: durum toggle'ları (ödendi, taksit) düzenleme gibi görünür ve alan-düzeyi
// ayrım olmadan yanlış-pozitife yol açardı; en tehlikeli olan SİLME ise burada net biçimde ayrışır.
// Değer string ya da (record)=>string (teklif/proforma gibi tür bağımlı). Bölüm yoksa denetlenmez
// (config/settings bölümleri ve stok miktar/log gibi belirsizler bölüm düzeyinde kalır).
const EYLEM_IDLERI = {
  customers:      { ekle: "cust_add",         sil: "cust_delete" },
  services:       { ekle: "cust_service_add", sil: "cust_service_delete" },
  partSales:      { ekle: "cust_kalip_add",   sil: "cust_kalip_delete" },
  payments:       { ekle: "cust_payment_add", sil: "cust_payment_edit" }, // ödeme silme "düzenle/sil" altında
  gorusmeler:     { ekle: "cust_gorusme_add", sil: "cust_gorusme_del" },
  dosyalar:       { ekle: "cust_dosya_add",   sil: "cust_dosya_del" },
  dealers:        { ekle: "dealer_add",       sil: "dealer_delete" },
  faturalar:      { ekle: "evrak_fatura_add", sil: "evrak_fatura_delete" },
  stock:          { ekle: "stock_makina_add", sil: "stock_makina_delete" },
  uretimFormlari: { ekle: "stock_uretim_add", sil: "stock_uretim_delete" },
  notes:          { ekle: "not_add",          sil: "not_delete" },
  teklifler: {
    ekle: (r) => (r?.type === "proforma" ? "evrak_proforma_add" : "evrak_teklif_add"),
    sil:  (r) => (r?.type === "proforma" ? "evrak_proforma_delete" : "evrak_teklif_delete"),
  },
};

// Bir eylem id'si kullanıcının grup dizisinde izinli mi? Dizi değilse (tanımsız) tam erişim.
function eylemIzinli(perms, group, actionId) {
  const a = perms[group];
  return !Array.isArray(a) || a.includes(actionId);
}

// Gelen blob'daki izinsiz EKLE/SİL'leri yakalar. Dönüş { ok:true } | { ok:false, reddedilenBolum, islem, gerekli }.
function eylemDenetimi(oldBlob, newBlob, permissionsJson, role) {
  if (role === "admin") return { ok: true };
  const perms = parsePerms(permissionsJson);
  if (!perms) return { ok: true }; // izin tanımsız = tam erişim
  const eski = oldBlob || {}, yeni = newBlob || {};
  const aktifMi = (r) => r && !r.deletedAt;
  const idBul = (v, r) => (typeof v === "function" ? v(r) : v);
  for (const [section, map] of Object.entries(EYLEM_IDLERI)) {
    const yeniArr = yeni[section];
    if (!Array.isArray(yeniArr)) continue; // istemci bu bölümü göndermedi → dokunulmadı
    const group = SECTION_GROUP[section];
    const eskiArr = Array.isArray(eski[section]) ? eski[section] : [];
    const eskiById = new Map(eskiArr.map(r => [r.id, r]));
    const yeniById = new Map(yeniArr.map(r => [r.id, r]));
    // EKLE: eskide olmayan yeni id
    for (const r of yeniArr) {
      if (r.id == null || eskiById.has(r.id)) continue;
      const id = idBul(map.ekle, r);
      if (id && !eylemIzinli(perms, group, id)) return { ok: false, reddedilenBolum: section, islem: "ekle", gerekli: id };
    }
    // SİL: eskide AKTİF bir kayıt yenide yok VEYA deletedAt set (soft/hard); çöpteki purge muaf
    for (const r of eskiArr) {
      if (!aktifMi(r)) continue;
      const y = yeniById.get(r.id);
      if (y && !y.deletedAt) continue; // duruyor ve aktif → silme değil
      const id = idBul(map.sil, r);
      if (id && !eylemIzinli(perms, group, id)) return { ok: false, reddedilenBolum: section, islem: "sil", gerekli: id };
    }
  }
  return { ok: true };
}

// Fiziksel dosya uçları (/api/files upload & delete) yetkisi. Künye zaten /api/data'da
// bölüm-bazlı denetlenir; bu, fiziksel upload/delete'i de aynı seviyeye çeker (yoksa salt-okunur
// bir kullanıcı düzenleyemediği kayıtların dosyalarını silebilir/orphan yükleyebilirdi).
// Dosya bölümleri müşteri VEYA bayi işlemlerine bağlı — ikisinden de tümden engelliyse reddet.
// (Grup boş değil ama kısmiyse blob mimarisiyle aynı sınır: bölüm düzeyinde güvenilir.)
function dosyaIslemYetkisi(permissionsJson, role) {
  if (role === "admin") return true;
  const perms = parsePerms(permissionsJson);
  if (!perms) return true; // izin tanımsız = tam erişim (mevcut istemci semantiği)
  if (sekmeEngelli(perms, "dosyalar")) return false;
  return !(grupEngelli(perms, "customerActions") && grupEngelli(perms, "dealerActions"));
}

// Fiziksel dosya SİLME yetkisi — künyeye (hedef nesneye) bakar.
// dosyaIslemYetkisi yalnız "müşteri VEYA bayi yazma tümden kapalı mı" diye sorduğu için
// hangi dosyanın silindiğine bakmıyordu: customerActions:[] olan bir bayi sorumlusu, künyesine
// hiç dokunamadığı müşteri sözleşmelerini fiziksel olarak geri dönüşsüz silebiliyordu
// (POST /api/data 403 verirken DELETE /api/files 200 veriyordu; doğrulanmış asimetri).
// Künyedeki dealerId/customerId hangi tarafa ait olduğunu söyler; eylem id'si künye yolundaki
// eylemDenetimi ile AYNI olsun ki iki yol aynı kararı versin.
function dosyaSilmeYetkisi(permissionsJson, role, kunye) {
  if (role === "admin") return true;
  const perms = parsePerms(permissionsJson);
  if (!perms) return true; // izin tanımsız = tam erişim (mevcut istemci semantiği)
  // Künyesi olmayan dosya = orphan. İstemci künyeyi state'ten düşürüp fiziksel silmeyi hemen
  // çağırır, blob kaydı ise 500 ms geciktirmelidir; künye sunucuda henüz durur. Yine de yarış
  // ya da eski artıklar için künyesiz kalınabilir — o durumda korunacak bir sahip yok, eski
  // (kaba) kurala düşülür, yoksa meşru çöp temizliği kilitlenirdi.
  if (!kunye) return dosyaIslemYetkisi(permissionsJson, role);
  const bayiDosyasi = kunye.dealerId != null && kunye.customerId == null;
  const group = bayiDosyasi ? "dealerActions" : "customerActions";
  if (grupEngelli(perms, group)) return false;
  if (sekmeEngelli(perms, "dosyalar")) return false;
  return eylemIzinli(perms, group, bayiDosyasi ? "dealer_dosya_del" : "cust_dosya_del");
}

// Son-admin koruması: bir PATCH, hedef kullanıcı aktif admin iken onu user'a düşürüyor VEYA
// pasifleştiriyorsa ve sistemde başka aktif admin kalmıyorsa true döner (istek engellenmeli).
// Böylece sistemin yönetici olmadan kilitli kalması önlenir. is_active hem 1/0 hem true/false gelebilir.
function sonAdminiDusururMu(users, targetId, patch = {}) {
  const aktifAdmin = (u) => u.role === "admin" && (u.is_active === 1 || u.is_active === true);
  const hedef = (users || []).find(u => String(u.id) === String(targetId));
  if (!hedef || !aktifAdmin(hedef)) return false;
  const rolDusuyor = patch.role !== undefined && patch.role !== "admin";
  const pasiflesiyor = patch.is_active !== undefined && !patch.is_active;
  if (!rolDusuyor && !pasiflesiyor) return false;
  const baskaAktifAdmin = (users || []).some(u => String(u.id) !== String(targetId) && aktifAdmin(u));
  return !baskaAktifAdmin;
}

module.exports = {
  BLOB_SECTIONS, SECTION_GROUP, IZIN_GRUPLARI, BOLUM_SEKMELERI, AYAR_ALAN_SEKMELERI,
  stableStringify, degisenBolumler, parsePerms, grupEngelli, sekmeEngelli, ayarAlanEngelli, kisitliMi, yazmaYetkisiVar, eylemDenetimi, EYLEM_IDLERI, dosyaIslemYetkisi, dosyaSilmeYetkisi, sonAdminiDusururMu,
};
