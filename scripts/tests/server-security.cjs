// Gömülü HTTP sunucusu güvenlik testi — Electron altında koşar (better-sqlite3 Electron
// ABI'siyle derli; tests/server-security.test.js bunu Electron ile başlatır).
// Gerçek sunucuyu geçici bir DB ile rastgele portta başlatır, bir admin + bir salt-okunur
// + bir kısmi yetkili kullanıcı oluşturur ve HTTP ile kimlik doğrulama, yetki ve kaba
// kuvvet davranışlarını doğrular. En kritik kontrol: salt-okunur kullanıcı elle POST ile
// veriyi ezemez (403).
const path = require("path");
const os = require("os");
const fs = require("fs");
const Module = require("module");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-sectest-"));
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  // db.cjs → app.getPath; server.cjs → BrowserWindow.getAllWindows (broadcast no-op)
  if (request === "electron") return { app: { getPath: () => tmpDir }, BrowserWindow: { getAllWindows: () => [] } };
  return origLoad(request, parent, isMain);
};

const root = path.join(__dirname, "..", "..");
const bcrypt = require(path.join(root, "node_modules", "bcryptjs"));
const dbmod = require(path.join(root, "electron", "db.cjs"));
const server = require(path.join(root, "electron", "server.cjs"));

// Salt-okunur ve kısmi yetki izin dizeleri (src/lib/permissions.js ile aynı biçim).
const READONLY = JSON.stringify({ customerActions: [], dealerActions: [], evrakActions: [], stockActions: [], notActions: [], settings: ["server"] });
// Kısmi yetki: müşteri ekle+düzenle var, SİLME yok (gerçek eylem id'leri). Diğer gruplar boş.
const PARTIAL  = JSON.stringify({ customerActions: ["cust_add", "cust_edit"], dealerActions: [], evrakActions: [], stockActions: [], notActions: [], settings: ["server"] });
// Arayüzün "Kullanıcı Ekle" formunun ürettiği gövde: YALNIZ tabs (UserManager.jsx handleAdd).
// Varsayılan sekmeler = serverPermissionDefs.js DEFAULT_USER_TABS (Finans/Harita/Ayarlar kapalı).
const SEKME_ONLY = JSON.stringify({ tabs: ["dashboard", "customers", "dealers", "stock", "evrak", "notes"] });
// Bayi sorumlusu: müşteri tarafına hiç yazma yok, bayi tarafı açık (dosya IDOR senaryosu).
const BAYICI = JSON.stringify({ customerActions: [], dealerActions: ["dealer_add", "dealer_edit", "dealer_dosya_del"], evrakActions: [], stockActions: [], notActions: [], settings: ["server"] });
// Servis kiosk: pano kutu sürükleme (servis durum) izni yok/var senaryoları.
const KIOSK_NOEDIT = JSON.stringify({ tabs: ["servis"], customerActions: ["cust_service_add"] });                       // durum sürükleyemez
const KIOSK_EDIT   = JSON.stringify({ tabs: ["servis"], customerActions: ["cust_service_add", "cust_service_edit"] }); // sürükleyebilir
// Stok kullanıcısı: kargo kutu sürükleme (kargoDurum) izni yok/var senaryoları.
const STOK_NOEDIT = JSON.stringify({ tabs: ["stock"], stockActions: ["yedek_parca_add"] });   // kargo durum sürükleyemez
const STOK_EDIT   = JSON.stringify({ tabs: ["stock"], stockActions: ["yedek_parca_edit"] });  // sürükleyebilir
// Müşteri silici: yalnız müşteri silme izni (çocuk kayıt silme izinleri YOK) — kaskad senaryosu.
const SILICI = JSON.stringify({ tabs: ["dashboard", "customers"], customerActions: ["cust_delete"] });
// Aynısı ama stok grubu açıkça KISITLI (admin daraltmış): kaskad dışı yedek parça silme kayıt düzeyinde reddedilmeli.
const SILICI_STOKSUZ = JSON.stringify({ tabs: ["dashboard", "customers"], stockActions: [], customerActions: ["cust_delete"] });
// Bayi silici: yalnız bayi silme izni — bayi kaskadı (satış + bayi dosyası) senaryosu.
// (stok grubu açıkça kısıtlı: aksi hâlde stok grubu tanımsız = yedek_parca_delete serbest sayılır, kaskad-dışı ret doğrulanamaz)
// Gider kaydı (spec 0001 C6/K6/K22): gider sekmesi açıkça verilmiş kullanıcı (ödeme ve üretim izni yok),
// yalnız Ayarlar'ı açık kullanıcı (tedarikçi yazamamalı). Sekme listesi tanımsız eski kullanıcı: izin null.
const GIDERCI = JSON.stringify({ tabs: ["gider"], giderActions: ["gider_add", "gider_edit"] });
const AYARCI = JSON.stringify({ tabs: ["settings"] });
// Yalnız tekrarlayan kalem üretme izni (triyaj bulgu 7: tanimId eklemek serbest kalem izni sayılmamalı).
const URETICI = JSON.stringify({ tabs: ["gider"], giderActions: ["gider_tekrar_uret"] });
// Spec 0052: hesap tanımı yazmak Kasa sekmesi + önkoşul (Giderler ve Finans) ister; ödemeci üçüne de sahip.
const ODEMECI = JSON.stringify({ tabs: ["gider", "finance", "kasa"], giderActions: ["gider_odeme", "kasa_hesap", "virman"] });
// Spec 0052 AC-10 / AC-11 / AC-25: Kasa'sı olmayan gider + finans kullanıcısı; "kasa" yazılı ama Finans'ı olmayan kullanıcı.
// Eylem izinleri (virman, avans dahil) açık, müşteri grubu kısıtlı: reddin tek nedeni Kasa sekmesi; 0044 istisnası da bununla sınanır.
const KASASIZ = JSON.stringify({ tabs: ["gider", "finance"], giderActions: ["gider_odeme", "kasa_hesap", "virman", "avans"], customerActions: [] });
const KASA_FINANSSIZ = JSON.stringify({ tabs: ["gider", "kasa"], giderActions: ["gider_odeme", "kasa_hesap"] });
// Spec 0056 R25: yalnız kasa_hesap'lı Kasa kullanıcısı (avans, virman, gider_odeme ve müşteri izni yok) hesap taşır.
const TASIYICI = JSON.stringify({ tabs: ["gider", "finance", "kasa"], giderActions: ["kasa_hesap"], customerActions: [] });
// Spec 0040: yalnız Müşteriler sekmeli tahsilatçı; müşteri grubu kısıtlı Giderler/Finans cirocusu; gider_odeme'siz Giderler kullanıcısı.
const TAHSILATCI = JSON.stringify({ tabs: ["customers"], customerActions: ["cust_payment_add", "cust_payment_edit"] });
// Spec 0052: kendi çek yazmak (verilen çek) Kasa sekmesi ister; cirocu Kasa kullanıcısıdır.
const CIROCU = JSON.stringify({ tabs: ["gider", "finance", "kasa"], giderActions: ["gider_odeme"], customerActions: [] });
// Spec 0046: gider formundan ciro (yeni kalem + ciro hareketi + çek tek yazımda); müşteri grubu kısıtlı.
const FORM_ODEMECI = JSON.stringify({ tabs: ["gider", "finance"], giderActions: ["gider_add", "gider_odeme"], customerActions: [] });
const CIROSUZ = JSON.stringify({ tabs: ["gider", "finance"], giderActions: ["gider_edit"], customerActions: [] });
const BAYI_SILICI = JSON.stringify({ tabs: ["dashboard", "dealers"], stockActions: [], customerActions: [], dealerActions: ["dealer_delete"] });

let fail = 0;
const check = (name, ok) => { console.log((ok ? "PASS" : "FAIL") + "  " + name); if (!ok) fail++; };

process.on("uncaughtException", (e) => { console.error("FAIL (uncaught):", e && e.stack || e); process.exit(1); });

(async () => {
  dbmod.migrateFromJsonIfNeeded();
  if (!dbmod.isActive()) { console.error("FAIL: sqlite aktif değil"); process.exit(1); }

  // Kullanıcılar
  dbmod.createUser("admin", bcrypt.hashSync("admin123", 10), "admin", null);
  dbmod.createUser("ro",    bcrypt.hashSync("ro12345", 10), "user", READONLY);
  dbmod.createUser("part",  bcrypt.hashSync("part123", 10), "user", PARTIAL);
  dbmod.createUser("sekme", bcrypt.hashSync("sekme123", 10), "user", SEKME_ONLY);
  dbmod.createUser("bayici", bcrypt.hashSync("bayi123", 10), "user", BAYICI);
  dbmod.createUser("kioskNoEdit", bcrypt.hashSync("kiosk123", 10), "user", KIOSK_NOEDIT);
  dbmod.createUser("kioskEdit",   bcrypt.hashSync("kiosk123", 10), "user", KIOSK_EDIT);
  dbmod.createUser("stokNoEdit",  bcrypt.hashSync("stok123", 10), "user", STOK_NOEDIT);
  dbmod.createUser("stokEdit",    bcrypt.hashSync("stok123", 10), "user", STOK_EDIT);
  dbmod.createUser("silici",      bcrypt.hashSync("sil123", 10), "user", SILICI);
  dbmod.createUser("siliciStoksuz", bcrypt.hashSync("sil123", 10), "user", SILICI_STOKSUZ);
  dbmod.createUser("bayiSilici",  bcrypt.hashSync("sil123", 10), "user", BAYI_SILICI);
  dbmod.createUser("giderci",     bcrypt.hashSync("gider123", 10), "user", GIDERCI);
  dbmod.createUser("ayarci",      bcrypt.hashSync("ayar123", 10), "user", AYARCI);
  dbmod.createUser("odemeci",     bcrypt.hashSync("odeme123", 10), "user", ODEMECI);
  dbmod.createUser("kasasiz",     bcrypt.hashSync("kasa1234", 10), "user", KASASIZ);
  dbmod.createUser("kasafinsiz",  bcrypt.hashSync("kasa1234", 10), "user", KASA_FINANSSIZ);
  dbmod.createUser("tasiyici",    bcrypt.hashSync("tasi1234", 10), "user", TASIYICI);
  dbmod.createUser("tahsilatci",  bcrypt.hashSync("tahsil123", 10), "user", TAHSILATCI);
  dbmod.createUser("cirocu",      bcrypt.hashSync("ciro1234", 10), "user", CIROCU);
  dbmod.createUser("formodemeci", bcrypt.hashSync("form1234", 10), "user", FORM_ODEMECI);
  dbmod.createUser("cirosuz",     bcrypt.hashSync("ciro1234", 10), "user", CIROSUZ);
  dbmod.createUser("eskiUser",    bcrypt.hashSync("eski123", 10), "user", null);
  dbmod.createUser("uretici",     bcrypt.hashSync("uret123", 10), "user", URETICI);
  // Spec 0006 C8: yalnız Evrak sekmeli kullanıcı (CRM'e Kaydet): gereken eylem izinleriyle / kalıp izni olmadan.
  dbmod.createUser("evrakci",     bcrypt.hashSync("evrak123", 10), "user", JSON.stringify({ tabs: ["evrak"], customerActions: ["cust_kalip_add"], stockActions: ["yedek_parca_add"] }));
  // Spec 0007 C6: yalnız Bayiler sekmeli kullanıcı (Bayi Aracılığıyla Kalıp Satışı).
  dbmod.createUser("bayiKalipci", bcrypt.hashSync("bayi123", 10), "user", JSON.stringify({ tabs: ["dealers"], customerActions: ["cust_kalip_add"] }));
  dbmod.createUser("evrakKalipsiz", bcrypt.hashSync("evrak456", 10), "user", JSON.stringify({ tabs: ["evrak"], customerActions: ["cust_edit"], stockActions: ["yedek_parca_add"] }));

  // Başlangıç verisi
  dbmod.writeBlobToDb({
    customers: [{ id: 1, name: "İlk Müşteri", model: "AK100" }],
    dealers: [{ id: 2, name: "Bayi" }],
    teklifler: [{ id: 3, type: "teklif", no: "T-1", firma: "F", satirlar: [] }],
    notes: [{ id: 4, text: "not" }],
    services: [{ id: 7, customerId: 1, type: "Bakım", durum: "Bekliyor" }],
    yedekParcaSatislar: [{ id: 8, aliciTipi: "bayi", dealerId: 2, partId: "1", miktar: 1, birimFiyat: 10, currency: "TL", kargoDurum: "Hazırlanıyor" }],
    appSettings: { kdvRates: { tr: 20 }, pinnedPartIds: [], autoBackup: false, lastBackup: null },
  });

  const { port } = await server.start(0, dbmod);
  const base = `http://127.0.0.1:${port}`;
  const api = (p, opts = {}, token) => fetch(base + p, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) },
  });
  const login = async (u, p) => { const r = await api("/auth/login", { method: "POST", body: JSON.stringify({ username: u, password: p }) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
  const login2fa = async (u, p, totpCode) => { const r = await api("/auth/login", { method: "POST", body: JSON.stringify({ username: u, password: p, totpCode }) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
  // Güncel dataVersion (optimistic lock için). Kısmi blob gönderilir — DB katmanı
  // gönderilmeyen bölümleri korur, gönderilen bölümü tam-değiştirir.
  const curVer = async (tok) => (await (await api("/api/data", {}, tok)).json()).dataVersion;
  const postData = (data, dataVersion, tok) => api("/api/data", { method: "POST", body: JSON.stringify({ data, dataVersion }) }, tok);

  // ── Token'sız istekler 401 ──────────────────────────────────────────────────
  check("token'sız GET /api/data → 401", (await api("/api/data")).status === 401);
  check("token'sız POST /api/data → 401", (await api("/api/data", { method: "POST", body: "{}" })).status === 401);
  check("token'sız GET /api/users → 401", (await api("/api/users")).status === 401);
  check("token'sız GET /api/audit → 401", (await api("/api/audit")).status === 401);

  // ── Girişler (başarılı giriş rate sayacını sıfırlar) ────────────────────────
  const adminLogin = await login("admin", "admin123");
  check("admin girişi başarılı", adminLogin.status === 200 && !!adminLogin.body.token);
  const adminTok = adminLogin.body.token;
  // İstemci oturum jetonu uzun ömürlü (30 gün) — PC gece/hafta sonu kapatılıp açıldığında
  // şifre tekrar sorulmasın diye. JWT payload'ının exp-iat farkını doğrula (~30 gün).
  {
    const payload = JSON.parse(Buffer.from(adminTok.split(".")[1], "base64").toString("utf8"));
    const omurGun = (payload.exp - payload.iat) / 86400;
    check("giriş jetonu ~30 gün geçerli (uzun ömürlü oturum)", Math.abs(omurGun - 30) < 0.5);
  }
  const roLogin = await login("ro", "ro12345");
  check("salt-okunur girişi başarılı", roLogin.status === 200 && !!roLogin.body.token);
  const roTok = roLogin.body.token;
  const partLogin = await login("part", "part123");
  let partTok = partLogin.body.token;

  // ── Salt-okunur: okuma serbest, yazma 403 ───────────────────────────────────
  const roGet = await api("/api/data", {}, roTok);
  check("salt-okunur GET /api/data → 200", roGet.status === 200);
  const roData = await roGet.json();
  const roWrite = await postData({ customers: [{ id: 1, name: "HACK", model: "AK100" }] }, roData.dataVersion, roTok);
  check("salt-okunur POST /api/data (müşteri değiştir) → 403", roWrite.status === 403);
  // Veri değişmedi mi?
  const afterRo = await (await api("/api/data", {}, adminTok)).json();
  check("salt-okunur yazma veriyi değiştirmedi", afterRo.customers.find(c => c.id === 1)?.name === "İlk Müşteri");

  // ── Admin: yazma çalışır, version artar ─────────────────────────────────────
  const beforeVer = afterRo.dataVersion;
  const adminWrite = await postData({ customers: [{ id: 1, name: "Admin Değiştirdi", model: "AK100" }] }, beforeVer, adminTok);
  const adminWriteBody = await adminWrite.json();
  check("admin POST /api/data → 200", adminWrite.status === 200);
  check("admin yazınca version arttı", adminWriteBody.newVersion === beforeVer + 1);

  // ── Kısmi yetkili: izinli bölüm yazılır, izinsiz bölüm 403 ───────────────────
  const partCustWrite = await postData({ customers: [{ id: 1, name: "Part Yazdı", model: "AK100" }] }, await curVer(partTok), partTok);
  check("kısmi yetkili müşteri yazabilir → 200", partCustWrite.status === 200);
  const partTeklifWrite = await postData({ teklifler: [{ id: 3, type: "teklif", no: "DEGISTI", firma: "F", satirlar: [] }] }, await curVer(partTok), partTok);
  check("kısmi yetkili evrak yazamaz → 403", partTeklifWrite.status === 403);
  // ── Eylem düzeyi: "düzenle var, sil yok" → SİLME reddedilir, EKLEME serbest ───
  const partDelete = await postData({ customers: [{ id: 1, name: "Part Yazdı", model: "AK100", deletedAt: new Date().toISOString() }] }, await curVer(partTok), partTok);
  check("kısmi yetkili müşteri SİLEMEZ (sil izni yok) → 403", partDelete.status === 403);
  const stillThere = await (await api("/api/data", {}, adminTok)).json();
  check("silme reddedildi, müşteri duruyor", stillThere.customers.find(c => c.id === 1)?.deletedAt == null);
  const partAdd = await postData({ customers: [{ id: 1, name: "Part Yazdı", model: "AK100" }, { id: 99, name: "Yeni Müşteri", model: "AK100" }] }, await curVer(partTok), partTok);
  check("kısmi yetkili müşteri EKLEYEBİLİR (ekle izni var) → 200", partAdd.status === 200);

  // ── Arayüzle oluşturulan kullanıcı (yalnız tabs) sunucuda GERÇEKTEN kısıtlı mı? ──
  // REGRESYON: sunucu tabs'ı tanımadığı için bu kullanıcıda kisitliMi false dönüyor, üç katmanlı
  // denetimin tamamı atlanıyordu. "Ayarlar sekmesi kapalı" diye oluşturulan kullanıcı curl ile
  // KDV oranını değiştirebiliyor, izni olmadan müşteri silebiliyordu.
  const sekmeTok = (await login("sekme", "sekme123")).body.token;
  const sekmeData = await (await api("/api/data", {}, sekmeTok)).json();
  const kdvEz = await postData({ appSettings: { ...sekmeData.appSettings, kdvRates: { tr: 1 } } }, sekmeData.dataVersion, sekmeTok);
  check("sekme-kısıtlı kullanıcı KDV oranını değiştiremez → 403", kdvEz.status === 403);
  const kdvSonra = await (await api("/api/data", {}, adminTok)).json();
  check("KDV oranı değişmedi", kdvSonra.appSettings?.kdvRates?.tr === 20);
  check("sekme-kısıtlı kullanıcı model tanımlarını yazamaz → 403",
    (await postData({ customModels: [{ model: "HACK" }] }, await curVer(sekmeTok), sekmeTok)).status === 403);
  check("sekme-kısıtlı kullanıcı fabrika bilgisini yazamaz → 403",
    (await postData({ factory: { name: "HACK" } }, await curVer(sekmeTok), sekmeTok)).status === 403);
  // Meşru kullanım kırılmamalı: açık sekmelerin verisi ve Stok'a ait pinnedPartIds yazılabilir.
  check("sekme-kısıtlı kullanıcı müşteri yazabilir (sekmesi açık) → 200",
    (await postData({ customers: [{ id: 1, name: "Sekme Yazdı", model: "AK100" }] }, await curVer(sekmeTok), sekmeTok)).status === 200);
  check("sekme-kısıtlı kullanıcı not yazabilir (sekmesi açık) → 200",
    (await postData({ notes: [{ id: 4, text: "not güncel" }] }, await curVer(sekmeTok), sekmeTok)).status === 200);
  const pinVer = await curVer(sekmeTok);
  const pinData = await (await api("/api/data", {}, sekmeTok)).json();
  check("sekme-kısıtlı kullanıcı parça sabitleyebilir (Stok sekmesi açık, appSettings alan düzeyi) → 200",
    (await postData({ appSettings: { ...pinData.appSettings, pinnedPartIds: ["7"] } }, pinVer, sekmeTok)).status === 200);

  // ── Pano kutu sürükleme = alan-düzeyi düzenleme yetkisi (kargo + servis durum) ──
  // Durum değişikliği bir düzenlemedir; sunucu bunu artık ilgili düzenleme iznine bağlar.
  // Önce kayıtları tazele: önceki müşteri yazıları DELETE FROM customers yapıp FK-cascade ile
  // services'i sildiği için başlangıç durumunu (Bekliyor/Hazırlanıyor) yeniden kur.
  await postData({
    services: [{ id: 7, customerId: 1, type: "Bakım", durum: "Bekliyor" }],
    yedekParcaSatislar: [{ id: 8, aliciTipi: "bayi", dealerId: 2, partId: "1", miktar: 1, birimFiyat: 10, currency: "TL", kargoDurum: "Hazırlanıyor" }],
  }, await curVer(adminTok), adminTok);
  const kioskNoTok = (await login("kioskNoEdit", "kiosk123")).body.token;
  const kioskYesTok = (await login("kioskEdit", "kiosk123")).body.token;
  const stokNoTok = (await login("stokNoEdit", "stok123")).body.token;
  const stokYesTok = (await login("stokEdit", "stok123")).body.token;
  // servis durum sürükle: edit yok → 403, edit var → 200
  check("servis durum sürükleme: cust_service_edit YOK → 403",
    (await postData({ services: [{ id: 7, customerId: 1, type: "Bakım", durum: "Yapılıyor" }] }, await curVer(kioskNoTok), kioskNoTok)).status === 403);
  const svSonra = await (await api("/api/data", {}, adminTok)).json();
  check("reddedilen servis sürüklemesi durumu değiştirmedi", svSonra.services.find(s => s.id === 7)?.durum === "Bekliyor");
  check("servis durum sürükleme: cust_service_edit VAR (kiosk) → 200",
    (await postData({ services: [{ id: 7, customerId: 1, type: "Bakım", durum: "Yapılıyor" }] }, await curVer(kioskYesTok), kioskYesTok)).status === 200);
  // kargo durum sürükle: edit yok → 403, edit var → 200
  check("kargo durum sürükleme: yedek_parca_edit YOK → 403",
    (await postData({ yedekParcaSatislar: [{ id: 8, aliciTipi: "bayi", dealerId: 2, partId: "1", miktar: 1, birimFiyat: 10, currency: "TL", kargoDurum: "Kargoya Verildi" }] }, await curVer(stokNoTok), stokNoTok)).status === 403);
  check("kargo durum sürükleme: yedek_parca_edit VAR → 200",
    (await postData({ yedekParcaSatislar: [{ id: 8, aliciTipi: "bayi", dealerId: 2, partId: "1", miktar: 1, birimFiyat: 10, currency: "TL", kargoDurum: "Kargoya Verildi" }] }, await curVer(stokYesTok), stokYesTok)).status === 200);

  // ── Müşteri silme kaskadı uçtan uca: yalnız cust_delete taşıyan kullanıcı, müşteriyle birlikte
  // aynı yazımda damgalanan servis/yedek parça/görüşme/dosyayı da yazabilmeli (çocuk silme izinleri
  // aranmaz); müşteri silinmeden aynı çocuk silme ise reddedilmeli (kaskad değil).
  const siliciTok = (await login("silici", "sil123")).body.token;
  await postData({
    customers: [{ id: 1, name: "Sekme Yazdı", model: "AK100" }, { id: 50, name: "Kaskad Firma", model: "AK140_DSC", serialNo: "F1" }],
    services: [{ id: 7, customerId: 1, type: "Bakım", durum: "Yapılıyor" }, { id: 52, customerId: 50, type: "Bakım" }],
    yedekParcaSatislar: [
      { id: 8, aliciTipi: "bayi", dealerId: 2, partId: "1", miktar: 1, birimFiyat: 10, currency: "TL", kargoDurum: "Kargoya Verildi", tahsisler: [{ customerId: 50, miktar: 1 }] },
      { id: 51, aliciTipi: "musteri", musteriId: 50, partId: "1", miktar: 2, birimFiyat: 5, currency: "TL", tahsisler: [{ customerId: 50, miktar: 2 }] },
    ],
    gorusmeler: [{ id: 53, customerId: 50, tarih: "2026-09-18", tur: "Telefon", not: "x" }],
    dosyalar: [{ id: 54, customerId: 50, ad: "a.pdf", dosyaAdi: "a.pdf", refType: "musteri", refId: 50 }],
  }, await curVer(adminTok), adminTok);
  const kaskadTs = new Date().toISOString();
  const kaskadOnce = await (await api("/api/data", {}, siliciTok)).json();
  // Yalnız müşteri + FK çocukları + yedek parça gönderilir (kısmi blob; customers tek başına yazılırsa
  // FK-cascade servisleri silerdi). Diğer bölümler dokunulmaz → değişen sayılmaz.
  const kaskadBolum = (b) => ({ customers: b.customers, services: b.services, partSales: b.partSales, payments: b.payments, gorusmeler: b.gorusmeler, dosyalar: b.dosyalar, yedekParcaSatislar: b.yedekParcaSatislar });
  // Kaskad değil: müşteri duruyor, yalnız servisi siliniyor → cust_service_delete yok → 403
  check("kaskadsız çocuk silme (müşteri duruyor): cust_delete tek başına yetmez → 403",
    (await postData({ ...kaskadBolum(kaskadOnce), services: kaskadOnce.services.map(s => s.id === 52 ? { ...s, deletedAt: kaskadTs } : s) }, kaskadOnce.dataVersion, siliciTok)).status === 403);
  // Kaskad: müşteri + servis + alıcı-müşteri yedek parça + görüşme + dosya aynı damga; bayi satışının tahsisi serbest metne
  const kaskadYeni = {
    ...kaskadBolum(kaskadOnce),
    customers: kaskadOnce.customers.map(c => c.id === 50 ? { ...c, deletedAt: kaskadTs } : c),
    services: kaskadOnce.services.map(s => s.customerId === 50 ? { ...s, deletedAt: kaskadTs } : s),
    yedekParcaSatislar: kaskadOnce.yedekParcaSatislar.map(s => s.id === 51 ? { ...s, deletedAt: kaskadTs }
      : s.id === 8 ? { ...s, tahsisler: [{ customerId: null, miktar: 1, makinaSerbest: "Kaskad Firma · F1 (silinen müşteri)" }] } : s),
    gorusmeler: kaskadOnce.gorusmeler.map(g => g.customerId === 50 ? { ...g, deletedAt: kaskadTs } : g),
    dosyalar: kaskadOnce.dosyalar.map(d => d.customerId === 50 ? { ...d, deletedAt: kaskadTs } : d),
  };
  const kaskadRes = await postData(kaskadYeni, await curVer(siliciTok), siliciTok);
  check("müşteri silme kaskadı: yalnız cust_delete ile 200", kaskadRes.status === 200);
  const kaskadSonra = await (await api("/api/data", {}, adminTok)).json();
  check("kaskad kalıcı: müşteri/servis/yedek parça/görüşme/dosya aynı damgayla çöpte",
    kaskadSonra.customers.find(c => c.id === 50)?.deletedAt === kaskadTs &&
    kaskadSonra.services.find(s => s.id === 52)?.deletedAt === kaskadTs &&
    kaskadSonra.yedekParcaSatislar.find(s => s.id === 51)?.deletedAt === kaskadTs &&
    kaskadSonra.gorusmeler.find(g => g.id === 53)?.deletedAt === kaskadTs &&
    kaskadSonra.dosyalar.find(d => d.id === 54)?.deletedAt === kaskadTs);
  const bayiSatis = kaskadSonra.yedekParcaSatislar.find(s => s.id === 8);
  check("bayi satışı silinmedi, tahsisi serbest metne döndü",
    bayiSatis && !bayiSatis.deletedAt && bayiSatis.tahsisler?.[0]?.customerId == null && /silinen müşteri/.test(bayiSatis.tahsisler?.[0]?.makinaSerbest || ""));
  // Müşteri zaten çöpteyken kalan çocuğu silmek kaskad değildir → 403
  // (stockActions tanımsız kullanıcı stok grubunda tam yetkili sayılır → bayi satışını zaten silebilir;
  // kaskad-dışı reddi, stok grubu açıkça kısıtlanmış cust_delete kullanıcısıyla doğrulanır.)
  const siliciStoksuzTok = (await login("siliciStoksuz", "sil123")).body.token;
  check("stok grubu kısıtlı cust_delete kullanıcısı: bayi satışını silmek kaskad değil → 403",
    (await postData({ ...kaskadBolum(kaskadSonra), yedekParcaSatislar: kaskadSonra.yedekParcaSatislar.map(s => s.id === 8 ? { ...s, deletedAt: kaskadTs } : s) }, kaskadSonra.dataVersion, siliciStoksuzTok)).status === 403);
  // Aynı kullanıcı gerçek kaskadı (yeni bir müşteri + alıcı-müşteri satışı) yazabilmeli
  await postData({
    customers: [...kaskadSonra.customers, { id: 60, name: "Kaskad İki", model: "AK100" }],
    services: kaskadSonra.services, partSales: kaskadSonra.partSales, payments: kaskadSonra.payments, gorusmeler: kaskadSonra.gorusmeler, dosyalar: kaskadSonra.dosyalar,
    yedekParcaSatislar: [...kaskadSonra.yedekParcaSatislar, { id: 61, aliciTipi: "musteri", musteriId: 60, partId: "1", miktar: 1, birimFiyat: 5, currency: "TL", tahsisler: [] }],
  }, await curVer(adminTok), adminTok);
  const k2 = await (await api("/api/data", {}, siliciStoksuzTok)).json();
  const k2Ts = new Date().toISOString();
  check("stok grubu kısıtlı cust_delete kullanıcısı: müşteri + alıcı-müşteri yedek parça kaskadı → 200",
    (await postData({ ...kaskadBolum(k2), customers: k2.customers.map(c => c.id === 60 ? { ...c, deletedAt: k2Ts } : c), yedekParcaSatislar: k2.yedekParcaSatislar.map(s => s.id === 61 ? { ...s, deletedAt: k2Ts } : s) }, k2.dataVersion, siliciStoksuzTok)).status === 200);

  // ── Bayi silme kaskadı uçtan uca: yalnız dealer_delete ile bayi + alıcısı bayi olan satış + bayi
  // dosyası aynı yazımda damgalanır; bayi silinmeden satış silmek reddedilir.
  const bayiSiliciTok = (await login("bayiSilici", "sil123")).body.token;
  await postData({
    dealers: [{ id: 2, name: "Bayi" }, { id: 70, name: "Kaskad Bayi" }],
    yedekParcaSatislar: [...(await (await api("/api/data", {}, adminTok)).json()).yedekParcaSatislar, { id: 71, aliciTipi: "bayi", dealerId: 70, partId: "1", miktar: 1, birimFiyat: 9, currency: "TL", tahsisler: [] }],
    dosyalar: [...(await (await api("/api/data", {}, adminTok)).json()).dosyalar, { id: 72, dealerId: 70, ad: "b.pdf", dosyaAdi: "b.pdf", refType: "bayi", refId: 70 }],
  }, await curVer(adminTok), adminTok);
  const bk = await (await api("/api/data", {}, bayiSiliciTok)).json();
  const bkTs = new Date().toISOString();
  const bayiBolum = (b) => ({ dealers: b.dealers, yedekParcaSatislar: b.yedekParcaSatislar, dosyalar: b.dosyalar });
  check("bayi kaskadsız satış silme (bayi duruyor): dealer_delete tek başına yetmez → 403",
    (await postData({ ...bayiBolum(bk), yedekParcaSatislar: bk.yedekParcaSatislar.map(s => s.id === 71 ? { ...s, deletedAt: bkTs } : s) }, bk.dataVersion, bayiSiliciTok)).status === 403);
  const bkYeni = {
    ...bayiBolum(bk),
    dealers: bk.dealers.map(d => d.id === 70 ? { ...d, deletedAt: bkTs } : d),
    yedekParcaSatislar: bk.yedekParcaSatislar.map(s => s.id === 71 ? { ...s, deletedAt: bkTs } : s),
    dosyalar: bk.dosyalar.map(d => d.id === 72 ? { ...d, deletedAt: bkTs } : d),
  };
  check("bayi silme kaskadı: yalnız dealer_delete ile 200", (await postData(bkYeni, await curVer(bayiSiliciTok), bayiSiliciTok)).status === 200);
  const bkSonra = await (await api("/api/data", {}, adminTok)).json();
  check("bayi kaskadı kalıcı: bayi/satış/dosya aynı damgayla çöpte",
    bkSonra.dealers.find(d => d.id === 70)?.deletedAt === bkTs && bkSonra.yedekParcaSatislar.find(s => s.id === 71)?.deletedAt === bkTs && bkSonra.dosyalar.find(d => d.id === 72)?.deletedAt === bkTs);

  // ── Gider kaydı (spec 0001): K6 aynası, kayıt ve alan düzeyi eylem denetimi ─────────
  const gUst = async (tok) => (await api("/api/data", {}, tok)).json();
  const eskiTok = (await login("eskiUser", "eski123")).body.token;
  const gE = await gUst(eskiTok);
  check("gider: sekme listesi tanımsız (izin null) user gider yazamaz → 403 (C6 kural 3 / K6)",
    (await postData({ ...gE, dataVersion: undefined, giderler: [{ id: 9001, tarih: "2026-09-01", turId: 1, tutar: 100, kdvOrani: 20, odendi: false, modelSatirlari: [] }] }, gE.dataVersion, eskiTok)).status === 403);
  check("gider: aynı eski user gider dışı bölümü yazabilir (istisna yalnız gider)",
    (await postData({ ...gE, dataVersion: undefined, notes: [...(gE.notes || []), { id: 9002, content: "eski kullanıcı notu" }] }, gE.dataVersion, eskiTok)).status === 200);
  const gidTok = (await login("giderci", "gider123")).body.token;
  let gG = await gUst(gidTok);
  // REGRESYON: değişiklik içermeyen tam blob yazımı, sekmesi kısıtlı kullanıcıda 403 alıyordu
  // (stableStringify undefined değerli alanları JSON'dan farklı sayıyordu).
  check("kısıtlı kullanıcı (yalnız gider sekmesi) değişikliksiz tam blob yazar → 200",
    (await postData({ ...gG, dataVersion: undefined }, gG.dataVersion, gidTok)).status === 200);
  gG = await gUst(gidTok);
  check("gider: gider sekmesi verilen kullanıcı elle kalem ekler → 200",
    (await postData({ ...gG, dataVersion: undefined, giderler: [...(gG.giderler || []), { id: 9003, tarih: "2026-09-01", turId: 1, tutar: 100, kdvOrani: 20, odendi: false, modelSatirlari: [] }] }, gG.dataVersion, gidTok)).status === 200);
  gG = await gUst(gidTok);
  const uretTok = (await login("uretici", "uret123")).body.token;
  let gU = await gUst(uretTok);
  check("gider (bulgu 7): yalnız üretim izni, olmayan tanıma bağlı sahte kalem ekleyemez → 403",
    (await postData({ ...gU, dataVersion: undefined, giderler: [...gU.giderler, { id: 9004, tarih: "2026-09-01", turId: 1, tutar: 50, tanimId: 77, donem: "2026-09", odendi: false, modelSatirlari: [] }] }, gU.dataVersion, uretTok)).status === 403);
  gU = await gUst(uretTok);
  const gTanim = { id: 9010, turId: 1, ad: "İnternet", tutar: 50, baslangicAy: "2026-01", uretilenAylar: ["2026-09"], modelSatirlari: [] };
  check("gider (bulgu 7): gerçek tanım + uygun dönem için üretim izni yeterli → 200",
    (await postData({ ...gU, dataVersion: undefined, giderTanimlari: [...(gU.giderTanimlari || []), gTanim] }, gU.dataVersion, adminTok)).status === 200
    && (await (async () => { const d = await gUst(uretTok); return postData({ ...d, dataVersion: undefined, giderler: [...d.giderler, { id: 9011, tarih: "2026-09-01", turId: 1, tutar: 50, tanimId: 9010, donem: "2026-09", odendi: false, modelSatirlari: [] }] }, d.dataVersion, uretTok); })()).status === 200);
  gG = await gUst(gidTok);
  // Spec 0024 AC-27 (Q1/Q7 onaylı istisna): ödeme bir harekettir; izni hareketin eklenmesinde aranır (odendi alanında değil).
  check("spec 0024: gider_odeme olmadan ödeme hareketi eklemek → 403",
    (await postData({ ...gG, dataVersion: undefined, hesapHareketleri: [{ id: 9040, tur: "odeme", tarih: "2026-09-05", tutar: 50, giderId: 9003, taksitId: null, hesapId: null }] }, gG.dataVersion, gidTok)).status === 403);
  check("spec 0024: gider_odeme olmadan virman → 403, hesap eklemek kasa_hesap ister → 403",
    (await postData({ ...gG, dataVersion: undefined, hesapHareketleri: [{ id: 9041, tur: "virman", tarih: "2026-09-05", tutar: 50, hesapId: 1, karsiHesapId: 2 }] }, gG.dataVersion, gidTok)).status === 403
    && (await postData({ ...gG, dataVersion: undefined, kasaHesaplari: [{ id: 9042, ad: "Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 0 }] }, gG.dataVersion, gidTok)).status === 403);
  check("spec 0024: kalemin odendi alanı artık izin istemez (doğruluk kaynağı hareket) → 200",
    (await postData({ ...gG, dataVersion: undefined, giderler: gG.giderler.map(k => k.id === 9003 ? { ...k, odendi: true } : k) }, gG.dataVersion, gidTok)).status === 200);
  gG = await gUst(gidTok);
  await postData({ ...gG, dataVersion: undefined, giderler: gG.giderler.map(k => k.id === 9003 ? { ...k, odendi: false } : k) }, gG.dataVersion, gidTok);
  gG = await gUst(gidTok);
  const odemeTok = (await login("odemeci", "odeme123")).body.token;
  const gO = await gUst(odemeTok);
  const gO2 = (d) => ({ ...d, dataVersion: undefined });
  check("spec 0024: gider_odeme + kasa_hesap kullanıcısı hesap açar ve ödeme kaydeder → 200; kayıttan okunur",
    (await postData({ ...gO, dataVersion: undefined, kasaHesaplari: [{ id: 9043, ad: "Merkez Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 0, kapali: false }],
      hesapHareketleri: [{ id: 9044, tur: "odeme", tarih: "2026-09-05", tutar: 50, giderId: 9003, taksitId: null, hesapId: 9043 }] }, gO.dataVersion, odemeTok)).status === 200
    && (await gUst(adminTok)).hesapHareketleri.some(h => h.id === 9044 && h.hesapId === 9043 && h.giderId === 9003));
  gG = await gUst(gidTok);
  check("spec 0024 B: avans izni olmadan (gider_odeme + kasa_hesap) avans vermek → 403",
    (await postData({ ...gO2(await gUst(odemeTok)), hesapHareketleri: [...(await gUst(odemeTok)).hesapHareketleri, { id: 9046, tur: "avans", tarih: "2026-09-05", tutar: 50, calisanId: 1, hesapId: null }] }, await curVer(odemeTok), odemeTok)).status === 403);
  check("spec 0024: gider_odeme olmadan ödemeyi silmek → 403",
    (await postData({ ...gG, dataVersion: undefined, hesapHareketleri: gG.hesapHareketleri.filter(h => h.id !== 9044) }, gG.dataVersion, gidTok)).status === 403);
  check("spec 0024: Ayarlar kullanıcısı (Giderler sekmesi yok) hareket yazamaz → 403",
    (await postData({ ...(await gUst(adminTok)), dataVersion: undefined, hesapHareketleri: [] }, await curVer(adminTok), (await login("ayarci", "ayar123")).body.token)).status === 403);
  // Spec 0052 R7, R8, R16: hesap tanımları Kasa sekmesine (önkoşul Giderler + Finans) bağlı; ödeme hareketi Giderler'de.
  const kasasizTok = (await login("kasasiz", "kasa1234")).body.token;
  const kasafinsizTok = (await login("kasafinsiz", "kasa1234")).body.token;
  const yeniHesap = { id: 9060, ad: "Yeni Banka", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, kapali: false };
  let gK = await gUst(kasasizTok);
  check("spec 0052 AC-10: Kasa'sı olmayan kullanıcı hesap ekleyemez / düzenleyemez / silemez → 403",
    (await postData({ ...gK, dataVersion: undefined, kasaHesaplari: [...gK.kasaHesaplari, yeniHesap] }, gK.dataVersion, kasasizTok)).status === 403
    && (await postData({ ...gK, dataVersion: undefined, kasaHesaplari: gK.kasaHesaplari.map(h => ({ ...h, ad: "Değişti" })) }, gK.dataVersion, kasasizTok)).status === 403
    && (await postData({ ...gK, dataVersion: undefined, kasaHesaplari: [] }, gK.dataVersion, kasasizTok)).status === 403);
  const gKF = await gUst(kasafinsizTok);
  check("spec 0052 AC-10: listesinde 'kasa' olan ama Finans'ı olmayan kullanıcı hesap ekleyemez → 403 (önkoşul)",
    (await postData({ ...gKF, dataVersion: undefined, kasaHesaplari: [...gKF.kasaHesaplari, yeniHesap] }, gKF.dataVersion, kasafinsizTok)).status === 403);
  check("spec 0052 AC-25: Kasa'sı olmayan kullanıcıya hesap verisi inmeye devam eder (okuma filtresi yok)",
    Array.isArray(gK.kasaHesaplari) && gK.kasaHesaplari.some(h => h.id === 9043));
  check("spec 0052 AC-11: Kasa'sı olmayan gider kullanıcısı ödeme kaydeder → 200",
    (await postData({ ...gK, dataVersion: undefined, hesapHareketleri: [...gK.hesapHareketleri, { id: 9061, tur: "odeme", tarih: "2026-09-06", tutar: 1, giderId: 9003, taksitId: null, hesapId: null }] }, gK.dataVersion, kasasizTok)).status === 200
    && (await gUst(adminTok)).hesapHareketleri.some(h => h.id === 9061));
  // Triyaj bulgu 1: virman ve avans bakiyeyi yalnız Kasa ekranından değiştirir; eylem izni olsa da Kasa sekmesi ister.
  gK = await gUst(kasasizTok);
  check("spec 0052 triyaj: Kasa'sız kullanıcı virman yazamaz → 403 (virman izni olsa da)",
    (await postData({ ...gK, dataVersion: undefined, hesapHareketleri: [...gK.hesapHareketleri, { id: 9062, tur: "virman", tarih: "2026-09-06", tutar: 1, hesapId: 9043, karsiHesapId: 9043 }] }, gK.dataVersion, kasasizTok)).status === 403);
  check("spec 0052 triyaj: Kasa'sız kullanıcı avans veremez → 403 (avans izni olsa da)",
    (await postData({ ...gK, dataVersion: undefined, hesapHareketleri: [...gK.hesapHareketleri, { id: 9063, tur: "avans", tarih: "2026-09-06", tutar: 1, calisanId: 1, hesapId: 9043 }] }, gK.dataVersion, kasasizTok)).status === 403);
  gK = await gUst(odemeTok);
  check("spec 0052 triyaj: Kasa'lı kullanıcı virman yazar → 200",
    (await postData({ ...gK, dataVersion: undefined, hesapHareketleri: [...gK.hesapHareketleri, { id: 9064, tur: "virman", tarih: "2026-09-06", tutar: 1, hesapId: 9043, karsiHesapId: 9043 }] }, gK.dataVersion, odemeTok)).status === 200);
  gK = await gUst(odemeTok);
  check("spec 0052 AC-5 (sunucu): Kasa + Giderler + Finans'lı kullanıcı hesap ekler → 200",
    (await postData({ ...gK, dataVersion: undefined, kasaHesaplari: [...gK.kasaHesaplari, yeniHesap] }, gK.dataVersion, odemeTok)).status === 200);
  const gTemiz = await gUst(adminTok);
  await postData({ ...gTemiz, dataVersion: undefined, hesapHareketleri: [], kasaHesaplari: [] }, gTemiz.dataVersion, adminTok);
  gG = await gUst(gidTok);
  check("gider: açıklama düzenlemesi gider_edit ile → 200",
    (await postData({ ...gG, dataVersion: undefined, giderler: gG.giderler.map(k => k.id === 9003 ? { ...k, aciklama: "düzeltildi" } : k) }, gG.dataVersion, gidTok)).status === 200);
  // Spec 0021: taksitli kalem (0024 ile satır bayrakları doğruluk kaynağı değil; ödeme hareketle).
  gG = await gUst(gidTok);
  const tks = (o1 = {}, o2 = {}) => [{ id: 90301, hedef: "ana", sira: 1, vade: "2026-10-15", tutar: 600, odendi: false, odemeTarihi: null, ...o1 },
    { id: 90302, hedef: "ana", sira: 2, vade: "2026-11-15", tutar: 600, odendi: false, odemeTarihi: null, ...o2 }];
  check("spec 0021: gider_edit kullanıcısı taksitli kalem ekler → 200",
    (await postData({ ...gG, dataVersion: undefined, giderler: [...gG.giderler, { id: 9030, tarih: "2026-09-01", turId: 1, tutar: 1000, kdvOrani: 20, odendi: false, sonOdemeTarihi: "2026-10-15", modelSatirlari: [], taksitler: tks() }] }, gG.dataVersion, gidTok)).status === 200);
  gG = await gUst(gidTok);
  check("spec 0021: kayıttan okunan kalem taksit satırlarını kimlikleriyle taşır",
    (gG.giderler.find(k => k.id === 9030)?.taksitler || []).map(t => t.id).join() === "90301,90302");
  check("spec 0024: gider_odeme olmadan taksite bağlı ödeme hareketi → 403",
    (await postData({ ...gG, dataVersion: undefined, hesapHareketleri: [{ id: 9045, tur: "odeme", tarih: "2026-10-15", tutar: 600, giderId: 9030, taksitId: 90301, hesapId: null }] }, gG.dataVersion, gidTok)).status === 403);
  check("spec 0021: tutar değişip ödenmemiş taksitler yeniden bölünürse gider_edit yeter → 200",
    (await postData({ ...gG, dataVersion: undefined, giderler: gG.giderler.map(k => k.id === 9030 ? { ...k, tutar: 1500, taksitler: tks({ tutar: 900 }, { tutar: 900 }) } : k) }, gG.dataVersion, gidTok)).status === 200);
  // Spec 0022 C5: parti tanımı gider_tanim ister; makinayı partiye bağlamak stok yazımıdır (yalnız stok sekmeli kullanıcı).
  gG = await gUst(gidTok);
  check("spec 0022: gider_tanim olmadan üretim partisi eklemek → 403",
    (await postData({ ...gG, dataVersion: undefined, uretimPartileri: [{ id: 9101, ad: "Yetkisiz", baslangicAy: "2026-01" }] }, gG.dataVersion, gidTok)).status === 403);
  let gAd = await gUst(adminTok);
  check("spec 0022: admin parti ve stok makinası ekler → 200",
    (await postData({ ...gAd, dataVersion: undefined, uretimPartileri: [{ id: 9100, ad: "2026-1", baslangicAy: "2026-01", bitisAy: null }], stock: [...(gAd.stock || []), { id: 9102, model: "AK100", serialNo: "P-1", addedDate: "2026-03-01" }] }, gAd.dataVersion, adminTok)).status === 200);
  const stokTok = (await login("stokEdit", "stok123")).body.token;
  let gSt = await gUst(stokTok);
  check("spec 0022: yalnız stok sekmeli kullanıcı makinayı partiye bağlar (stok yazımı) → 200",
    (await postData({ ...gSt, dataVersion: undefined, stock: gSt.stock.map(x => x.id === 9102 ? { ...x, partiId: 9100 } : x) }, gSt.dataVersion, stokTok)).status === 200);
  gSt = await gUst(stokTok);
  check("spec 0022: bağ kayıttan partiId ile okunur", gSt.stock.find(x => x.id === 9102)?.partiId === 9100);
  check("spec 0022: stok kullanıcısı parti tanımını değiştiremez (gider bölümü) → 403",
    (await postData({ ...gSt, dataVersion: undefined, uretimPartileri: gSt.uretimPartileri.map(p => ({ ...p, bitisAy: "2026-02" })) }, gSt.dataVersion, stokTok)).status === 403);
  gG = await gUst(gidTok);
  check("gider: tedarikçi eklemek tedarikci_add ister → 403",
    (await postData({ ...gG, dataVersion: undefined, tedarikciler: [{ id: 9005, ad: "T" }] }, gG.dataVersion, gidTok)).status === 403);
  const ayarTok = (await login("ayarci", "ayar123")).body.token;
  const gA = await gUst(ayarTok);
  check("gider: yalnız Ayarlar'ı açık kullanıcı tedarikçi yazamaz (R13) → 403",
    (await postData({ ...gA, dataVersion: undefined, tedarikciler: [{ id: 9006, ad: "Ayarcı Tedarikçi" }] }, gA.dataVersion, ayarTok)).status === 403);
  // Triyaj bulgu 1: Ayarlar'ı açık, Giderler sekmesi olmayan kullanıcı gider verisi yazamaz; yalnız zincir geçer.
  let gA2 = await gUst(ayarTok);
  check("gider (bulgu 1): yalnız Ayarlar'ı açık kullanıcı kalem ekleyemez → 403",
    (await postData({ ...gA2, dataVersion: undefined, giderler: [...gA2.giderler, { id: 9020, tarih: "2026-09-01", turId: 1, tutar: 99999, odendi: true, modelSatirlari: [] }] }, gA2.dataVersion, ayarTok)).status === 403);
  check("gider (bulgu 1): yalnız Ayarlar'ı açık kullanıcı ödendi değiştiremez → 403",
    (await postData({ ...gA2, dataVersion: undefined, giderler: gA2.giderler.map(k => k.id === 9003 ? { ...k, odendi: true } : k) }, gA2.dataVersion, ayarTok)).status === 403);
  check("gider (bulgu 1): yalnız Ayarlar'ı açık kullanıcı kalem silemez → 403",
    (await postData({ ...gA2, dataVersion: undefined, giderler: gA2.giderler.filter(k => k.id !== 9003) }, gA2.dataVersion, ayarTok)).status === 403);
  // Zincir: model yeniden adlandırma, kalemin yalnız modelSatirlari[].modelAd alanını değiştirir.
  await postData({ ...(await gUst(adminTok)), dataVersion: undefined, giderler: (await gUst(adminTok)).giderler.map(k => k.id === 9003 ? { ...k, atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 10, adet: 2 }] } : k) }, await curVer(adminTok), adminTok);
  gA2 = await gUst(ayarTok);
  check("gider (bulgu 1): Ayarlar kullanıcısının model adı zinciri geçer → 200",
    (await postData({ ...gA2, dataVersion: undefined, giderler: gA2.giderler.map(k => k.id === 9003 ? { ...k, modelSatirlari: k.modelSatirlari.map(m => ({ ...m, modelAd: "AK100_YENI" })) } : k) }, gA2.dataVersion, ayarTok)).status === 200);
  // Triyaj bulgu 2: sekme listesi tanımsız kullanıcıda aynı zincir K6 aynasına takılmaz.
  const gE2 = await gUst(eskiTok);
  check("gider (bulgu 2): sekme listesi tanımsız kullanıcının model adı zinciri geçer → 200",
    (await postData({ ...gE2, dataVersion: undefined, giderler: gE2.giderler.map(k => k.id === 9003 ? { ...k, modelSatirlari: k.modelSatirlari.map(m => ({ ...m, modelAd: "AK100_SON" })) } : k) }, gE2.dataVersion, eskiTok)).status === 200);
  const gSon = await gUst(adminTok);
  check("gider: yalnız izinli yazımlar kalıcı (9003 var, düzeltilmiş, ödenmemiş, model adı taşınmış; 9001/9004/9020 yok)",
    gSon.giderler.some(k => k.id === 9003 && k.aciklama === "düzeltildi" && k.odendi === false && k.modelSatirlari?.[0]?.modelAd === "AK100_SON")
    && !gSon.giderler.some(k => k.id === 9001 || k.id === 9004 || k.id === 9020) && gSon.giderler.some(k => k.id === 9011) && !(gSon.tedarikciler || []).length);

  // ── Spec 0040: çek portföyü (AC-20, AC-33, AC-34) ─────────────────────────────
  let cA = await gUst(adminTok);
  await postData({ ...cA, dataVersion: undefined, customers: [...(cA.customers || []), { id: 9600, name: "Çekli Müşteri", kaliplar: [] }],
    giderler: [...(cA.giderler || []), { id: 9610, tarih: "2026-09-01", turId: 1, tutar: 1000, kdvOrani: 0, odendi: false, modelSatirlari: [] }] }, cA.dataVersion, adminTok);
  const tahsilTok = (await login("tahsilatci", "tahsil123")).body.token;
  let cT = await gUst(tahsilTok);
  const cekKaydi = { id: 9602, paymentId: 9601, no: "555", banka: "Ziraat", kesideci: "", tur: "hamiline", durum: "portfoy", gecmis: [{ tarih: "2026-09-10", durum: "portfoy", not: "Alındı" }] };
  check("spec 0040 AC-33: yalnız Müşteriler sekmeli tahsilatçı çekle tahsilat kaydeder (tahsilat + çek) → 200",
    (await postData({ ...cT, dataVersion: undefined, payments: [...(cT.payments || []), { id: 9601, customerId: 9600, tarih: "2026-09-10", tutar: 1000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-10-15", tahsilEdildi: false }],
      cekler: [...(cT.cekler || []), cekKaydi] }, cT.dataVersion, tahsilTok)).status === 200
    && (await gUst(adminTok)).cekler.some(c => c.id === 9602 && c.gecmis?.length === 1));
  const ciroYaz = async (tok) => {
    const d = await gUst(tok);
    return postData({ ...d, dataVersion: undefined,
      cekler: d.cekler.map(c => c.id === 9602 ? { ...c, durum: "ciro", gecmis: [...c.gecmis, { tarih: "2026-10-02", durum: "ciro", not: "Ciro: X" }] } : c),
      hesapHareketleri: [...(d.hesapHareketleri || []), { id: 9603, tur: "odeme", tarih: "2026-10-02", tutar: 1000, yontem: "Çek (ciro)", giderId: 9610, hesapId: null, cekId: 9602 }] }, d.dataVersion, tok);
  };
  check("spec 0040 AC-34: gider_odeme olmadan ciro → 403", (await ciroYaz((await login("cirosuz", "ciro1234")).body.token)).status === 403);
  const ciroTok = (await login("cirocu", "ciro1234")).body.token;
  const hareketsiz = await gUst(ciroTok);
  check("spec 0040 triyaj: hareketsiz 'ciro edildi' (bağlı ödeme hareketi yok) → 403; çek portföyde kalır",
    (await postData({ ...hareketsiz, dataVersion: undefined,
      cekler: hareketsiz.cekler.map(c => c.id === 9602 ? { ...c, durum: "ciro", gecmis: [...c.gecmis, { tarih: "2026-10-02", durum: "ciro", not: "Ciro: X" }] } : c) }, hareketsiz.dataVersion, ciroTok)).status === 403
    && (await gUst(adminTok)).cekler.find(c => c.id === 9602)?.durum === "portfoy");
  check("spec 0040 Q6: müşteri grubu kısıtlı Giderler kullanıcısı gider_odeme ile ciro eder → 200; kayıttan okunur",
    (await ciroYaz(ciroTok)).status === 200 && (await gUst(adminTok)).cekler.find(c => c.id === 9602)?.durum === "ciro"
    && (await gUst(adminTok)).hesapHareketleri.some(h => h.id === 9603 && h.cekId === 9602));
  const cC = await gUst(ciroTok);
  check("spec 0040 AC-20: müşteri grubu kısıtlı kullanıcı çekin numarasını değiştiremez → 403",
    (await postData({ ...cC, dataVersion: undefined, cekler: cC.cekler.map(c => c.id === 9602 ? { ...c, no: "999" } : c) }, cC.dataVersion, ciroTok)).status === 403);

  // ── Spec 0049 AC-23: bağsız alınan çek ve verilen çek (gider_odeme; müşteri grubu kısıtlı Kasa kullanıcısı) ──
  const bagsizCek = { id: 9650, yon: "alinan", paymentId: null, no: "B-55", banka: "İş", kesideci: "", tur: "hamiline", durum: "portfoy", tutar: 4000, currency: "TRY",
    vadeTarihi: "2026-11-30", tarih: "2026-09-05", kimden: "Eski müşteri", gecmis: [{ tarih: "2026-09-05", durum: "portfoy", not: "Portföye elle eklendi" }] };
  const cekEkle = async (tok, cek, hareket = null) => {
    const d = await gUst(tok);
    return postData({ ...d, dataVersion: undefined, cekler: [...(d.cekler || []), cek], ...(hareket ? { hesapHareketleri: [...(d.hesapHareketleri || []), hareket] } : {}) }, d.dataVersion, tok);
  };
  check("spec 0049 AC-23: gider_odeme olmadan bağsız çek eklemek → 403", (await cekEkle((await login("cirosuz", "ciro1234")).body.token, bagsizCek)).status === 403);
  check("spec 0049 Q8: müşteri grubu kısıtlı Kasa kullanıcısı gider_odeme ile bağsız çek ekler → 200; alanlar kayıttan okunur",
    (await cekEkle(ciroTok, bagsizCek)).status === 200
    && (await gUst(adminTok)).cekler.some(c => c.id === 9650 && c.paymentId == null && c.tutar === 4000 && c.kimden === "Eski müşteri"));
  const verilenCek = { id: 9660, yon: "verilen", paymentId: null, no: "V-1", banka: "Ziraat", tur: "hamiline", durum: "yazildi", tutar: 500, currency: "TRY", vadeTarihi: "2026-10-30",
    tarih: "2026-09-20", hesapId: 97, alacakliTur: "serbest", alacakliAd: "Demir", gecmis: [{ tarih: "2026-09-20", durum: "yazildi", not: "Yazıldı: Demir" }] };
  check("spec 0049 Q8: hareketsiz verilen çek (bağlı ödeme hareketi yok) → 403", (await cekEkle(ciroTok, verilenCek)).status === 403);
  check("spec 0049 AC-12 / AC-23: verilen çek ödeme hareketiyle birlikte yazılır → 200; çek ve hareket kayıttan okunur",
    (await cekEkle(ciroTok, verilenCek, { id: 9661, tur: "odeme", tarih: "2026-09-20", tutar: 500, yontem: "Çek (kendi)", giderId: 9610, hesapId: null, cekId: 9660 })).status === 200
    && (await gUst(adminTok)).cekler.some(c => c.id === 9660 && c.hesapId === 97 && c.durum === "yazildi")
    && (await gUst(adminTok)).hesapHareketleri.some(h => h.id === 9661 && h.cekId === 9660));
  const vC = await gUst((await login("cirosuz", "ciro1234")).body.token);
  check("spec 0049 AC-23: gider_odeme olmadan verilen çeki ödendi işaretlemek → 403",
    (await postData({ ...vC, dataVersion: undefined, cekler: vC.cekler.map(c => c.id === 9660 ? { ...c, durum: "odendi" } : c) }, vC.dataVersion, (await login("cirosuz", "ciro1234")).body.token)).status === 403);

  // ── Spec 0044 Q5: Kasa'yı gören (Giderler + Finans), müşteri grubu kısıtlı kullanıcı tahsilata yalnız hesap atar ──
  let tA = await gUst(adminTok);
  await postData({ ...tA, dataVersion: undefined, services: [...(tA.services || []), { id: 9700, customerId: 9600, date: "2026-09-10", type: "Garanti Dışı", servisUcreti: 1000, currency: "TRY", odendi: true }] }, tA.dataVersion, adminTok);
  const tK = await gUst(ciroTok);
  check("spec 0044 Q5: Kasa kullanıcısı servise yalnız hesap atar → 200; kayıttan okunur",
    (await postData({ ...tK, dataVersion: undefined, services: tK.services.map(x => x.id === 9700 ? { ...x, hesapId: 97 } : x) }, tK.dataVersion, ciroTok)).status === 200
    && (await gUst(adminTok)).services.find(x => x.id === 9700)?.hesapId === 97);
  const tKs = await gUst(kasasizTok);
  check("spec 0052 AC-23: 0044 istisnası Kasa sekmesi olmadan da çalışır (Giderler + Finans, müşteri grubu kısıtlı) → 200",
    (await postData({ ...tKs, dataVersion: undefined, services: tKs.services.map(x => x.id === 9700 ? { ...x, hesapId: 9043 } : x) }, tKs.dataVersion, kasasizTok)).status === 200
    && (await gUst(adminTok)).services.find(x => x.id === 9700)?.hesapId === 9043);
  // Spec 0052 triyaj bulgu 1: verilen (kendi) çek Kasa sekmesi ister; eylem izni (gider_odeme) yetmez.
  const vK = await gUst(kasasizTok);
  check("spec 0052 triyaj: Kasa'sız kullanıcı verilen çeki ödendi işaretleyemez → 403",
    (await postData({ ...vK, dataVersion: undefined, cekler: vK.cekler.map(c => c.id === 9660 ? { ...c, durum: "odendi" } : c) }, vK.dataVersion, kasasizTok)).status === 403);
  // ── Spec 0058 R9, R12, R20 (AC-15, AC-19): kasa iş listesinden kapsam dışı bırakma ──
  let kA = await gUst(adminTok);
  await postData({ ...kA, dataVersion: undefined, services: [...kA.services, { id: 9701, customerId: 9600, date: "2026-09-11", type: "Garanti Dışı", servisUcreti: 500, currency: "TRY", odendi: true }],
    kasaHesaplari: [...(kA.kasaHesaplari || []), { id: 9703, ad: "Kapsam Kasası", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 0, kapali: false }] }, kA.dataVersion, adminTok);
  const kapsamGir = { id: 9702, tur: "tahsilat", kaynak: "servis", kayitId: 9701, zaman: "2026-10-01T10:00:00.000Z" };
  const kKs = await gUst(kasasizTok);
  check("spec 0058 AC-19: Kasa'sız kullanıcı kapsam dışı bırakamaz → 403",
    (await postData({ ...kKs, dataVersion: undefined, kasaKapsamDisi: [...(kKs.kasaKapsamDisi || []), kapsamGir] }, kKs.dataVersion, kasasizTok)).status === 403);
  const kCi = await gUst(ciroTok);
  check("spec 0058 AC-19: kasa_hesap izni olmayan Kasa kullanıcısı kapsam dışı bırakamaz → 403",
    (await postData({ ...kCi, dataVersion: undefined, kasaKapsamDisi: [...(kCi.kasaKapsamDisi || []), kapsamGir] }, kCi.dataVersion, ciroTok)).status === 403);
  const kOd = await gUst(odemeTok);
  check("spec 0058 AC-12 / AC-15: Kasa + kasa_hesap kullanıcısı kapsam dışı bırakır → 200; karar başka kullanıcıda da okunur",
    (await postData({ ...kOd, dataVersion: undefined, kasaKapsamDisi: [...(kOd.kasaKapsamDisi || []), kapsamGir] }, kOd.dataVersion, odemeTok)).status === 200
    && (await gUst(kasasizTok)).kasaKapsamDisi.some(g => g.id === 9702 && g.kayitId === 9701));
  const kKs2 = await gUst(kasasizTok);
  check("spec 0058 R20: Kasa'sız kullanıcı kayda hesap atayınca girişin silinmesi aynı yazımda kabul edilir → 200",
    (await postData({ ...kKs2, dataVersion: undefined, services: kKs2.services.map(x => x.id === 9701 ? { ...x, hesapId: 9703 } : x),
      kasaKapsamDisi: kKs2.kasaKapsamDisi.filter(g => g.id !== 9702) }, kKs2.dataVersion, kasasizTok)).status === 200
    && !(await gUst(adminTok)).kasaKapsamDisi.some(g => g.id === 9702));
  // ── Spec 0056 R20, R25 (AC-23): hesabı silip bağlarını taşımak yalnız kasa_hesap + Kasa sekmesi ister ──
  let hA = await gUst(adminTok);
  // Triyaj bulgu 2: istisna kayıtlı deneme ayarına bağlı; test gerçek tarihten bağımsız olsun diye açık uçlu tarih.
  await postData({ ...hA, dataVersion: undefined, appSettings: { ...hA.appSettings, giderAyarlari: { ...(hA.appSettings?.giderAyarlari || {}), denemeDonemiBitis: "2099-01-01" } },
    kasaHesaplari: [...hA.kasaHesaplari, { id: 9801, ad: "Deneme Eski", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, kapali: false }, { id: 9802, ad: "Deneme Yeni", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, kapali: false }],
    payments: [...(hA.payments || []), { id: 9803, customerId: 9600, tarih: "2026-09-10", tutar: 300, currency: "TRY", yontem: "Havale", hesapId: 9801 }],
    hesapHareketleri: [...hA.hesapHareketleri, { id: 9804, tur: "avans", tarih: "2026-09-11", tutar: 40, calisanId: 1, hesapId: 9801 }] }, hA.dataVersion, adminTok);
  const tasiYazimi = (g) => ({ ...g, dataVersion: undefined, kasaHesaplari: g.kasaHesaplari.filter(h => h.id !== 9801),
    payments: g.payments.map(p => (p.hesapId === 9801 ? { ...p, hesapId: 9802 } : p)), hesapHareketleri: g.hesapHareketleri.map(m => (m.hesapId === 9801 ? { ...m, hesapId: 9802 } : m)) });
  const tKsz = await gUst(kasasizTok);
  check("spec 0056 AC-23: Kasa'sız kullanıcı hesap taşıyamaz → 403", (await postData(tasiYazimi(tKsz), tKsz.dataVersion, kasasizTok)).status === 403);
  const tasiTok = (await login("tasiyici", "tasi1234")).body.token;
  const tTs = await gUst(tasiTok);
  check("spec 0056 AC-23: yalnız kasa_hesap'lı Kasa kullanıcısı hesabı silip makina tahsilatını ve avansı taşır → 200",
    (await postData(tasiYazimi(tTs), tTs.dataVersion, tasiTok)).status === 200
    && await (async () => { const a = await gUst(adminTok); return !a.kasaHesaplari.some(h => h.id === 9801) && a.payments.find(p => p.id === 9803)?.hesapId === 9802 && a.hesapHareketleri.find(m => m.id === 9804)?.hesapId === 9802; })());
  // Triyaj bulgu 2: dönem kapanınca (ayar boş) aynı biçimde taşıma 403.
  let dA = await gUst(adminTok);
  await postData({ ...dA, dataVersion: undefined, appSettings: { ...dA.appSettings, giderAyarlari: { ...(dA.appSettings?.giderAyarlari || {}), denemeDonemiBitis: "" } },
    kasaHesaplari: [...dA.kasaHesaplari, { id: 9805, ad: "Kapalı Dönem", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, kapali: false }],
    hesapHareketleri: [...dA.hesapHareketleri, { id: 9806, tur: "avans", tarih: "2026-09-12", tutar: 30, calisanId: 1, hesapId: 9805 }] }, dA.dataVersion, adminTok);
  const dT = await gUst(tasiTok);
  check("spec 0056 triyaj: deneme dönemi kapalıyken hesap taşıma → 403",
    (await postData({ ...dT, dataVersion: undefined, kasaHesaplari: dT.kasaHesaplari.filter(h => h.id !== 9805),
      hesapHareketleri: dT.hesapHareketleri.map(m => (m.hesapId === 9805 ? { ...m, hesapId: 9802 } : m)) }, dT.dataVersion, tasiTok)).status === 403);
  const tTs2 = await gUst(tasiTok);
  check("spec 0056 R25: taşıma yazımı dışında avansın tutarını değiştirmek → 403",
    (await postData({ ...tTs2, dataVersion: undefined, hesapHareketleri: tTs2.hesapHareketleri.map(m => (m.id === 9804 ? { ...m, tutar: 1 } : m)) }, tTs2.dataVersion, tasiTok)).status === 403);
  const tK2 = await gUst(ciroTok);
  check("spec 0044 Q5: hesapla birlikte ücret değiştirmek → 403",
    (await postData({ ...tK2, dataVersion: undefined, services: tK2.services.map(x => x.id === 9700 ? { ...x, hesapId: 98, servisUcreti: 1 } : x) }, tK2.dataVersion, ciroTok)).status === 403);

  // ── Spec 0046 AC-22: gider formundan ciro; yeni kalem, ciro hareketi ve çek durumu tek yazımda ──
  let fA = await gUst(adminTok);
  await postData({ ...fA, dataVersion: undefined, payments: [...(fA.payments || []), { id: 9801, customerId: 9600, tarih: "2026-09-10", tutar: 2000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-10-20", tahsilEdildi: false }],
    cekler: [...(fA.cekler || []), { id: 9802, paymentId: 9801, no: "777", banka: "Garanti", kesideci: "", tur: "hamiline", durum: "portfoy", gecmis: [{ tarih: "2026-09-10", durum: "portfoy", not: "Alındı" }] }] }, fA.dataVersion, adminTok);
  const formTok = (await login("formodemeci", "form1234")).body.token;
  const fF = await gUst(formTok);
  check("spec 0046 AC-22: gider formundan ciro (yeni kalem + ciro hareketi + çek) tek yazımda → 200; üçü de kayıttan okunur",
    (await postData({ ...fF, dataVersion: undefined,
      giderler: [...(fF.giderler || []), { id: 9810, tarih: "2026-10-01", turId: 1, tutar: 2000, kdvOrani: 0, odendi: false, tedarikciId: null, modelSatirlari: [] }],
      hesapHareketleri: [...(fF.hesapHareketleri || []), { id: 9811, tur: "odeme", tarih: "2026-10-01", tutar: 2000, yontem: "Çek (ciro)", giderId: 9810, taksitId: null, hesapId: null, cekId: 9802, aciklama: "Çek 777 · Garanti" }],
      cekler: fF.cekler.map(c => c.id === 9802 ? { ...c, durum: "ciro", gecmis: [...c.gecmis, { tarih: "2026-10-01", durum: "ciro", not: "Ciro: Usta" }] } : c) }, fF.dataVersion, formTok)).status === 200
    && (await gUst(adminTok)).giderler.some(k => k.id === 9810)
    && (await gUst(adminTok)).hesapHareketleri.some(h => h.id === 9811 && h.cekId === 9802)
    && (await gUst(adminTok)).cekler.find(c => c.id === 9802)?.durum === "ciro");

  // ── Spec 0053 AC-29 (plan Q12): düzenleme formundan kalem düzenlemesi + yeni ödeme + silinen ödeme tek yazımda ──
  const fD = await gUst(formTok);
  const fdOnce = (fD.hesapHareketleri || []).filter(h => h.giderId === 9810);
  const fdYazim = await postData({ ...fD, dataVersion: undefined,
    giderler: fD.giderler.map(k => k.id === 9810 ? { ...k, tutar: 2500, aciklama: "düzenlendi" } : k),
    hesapHareketleri: [...(fD.hesapHareketleri || []).filter(h => h.id !== 9811 || h.cekId != null), { id: 9812, tur: "odeme", tarih: "2026-10-02", tutar: 300, yontem: "Nakit", giderId: 9810, taksitId: null, hesapId: null, aciklama: "prim" },
      { id: 9813, tur: "odeme", tarih: "2026-10-02", tutar: 200, yontem: "Havale", giderId: 9810, taksitId: null, hesapId: null, aciklama: "" }] }, fD.dataVersion, formTok);
  const fDs = await gUst(adminTok);
  check("spec 0053 AC-29: kalem düzenlemesi + iki ödeme satırı tek yazımda → 200; üçü de kayıttan okunur",
    fdYazim.status === 200 && fdOnce.length === 1 && fDs.giderler.find(k => k.id === 9810)?.aciklama === "düzenlendi"
    && [9812, 9813].every(id => fDs.hesapHareketleri.some(h => h.id === id)));
  const fD2 = await gUst(formTok);
  check("spec 0053 AC-27: düzenlemede kayıtlı ödeme silmek (gider_odeme) kalem düzenlemesiyle tek yazımda → 200",
    (await postData({ ...fD2, dataVersion: undefined, giderler: fD2.giderler.map(k => k.id === 9810 ? { ...k, aciklama: "silme ile" } : k),
      hesapHareketleri: fD2.hesapHareketleri.filter(h => h.id !== 9813) }, fD2.dataVersion, formTok)).status === 200
    && !(await gUst(adminTok)).hesapHareketleri.some(h => h.id === 9813));

  // ── Spec 0006 AC-33: yalnız Evrak sekmeli kullanıcının "CRM'e Kaydet" yazımı ─────────
  let eA = await gUst(adminTok);
  await postData({ ...eA, dataVersion: undefined, customers: [...(eA.customers || []), { id: 9500, name: "Evrak Müşterisi", kaliplar: [] }],
    partStock: [...(eA.partStock || []), { id: 9501, partId: "95", miktar: 10 }] }, eA.dataVersion, adminTok);
  const evrakYazimi = (d) => ({
    ...d, dataVersion: undefined,
    customers: d.customers.map(c => (c.id === 9500 ? { ...c, kaliplar: [{ ad: "Hamburger", olcu: "", partSaleId: 9510 }], kalipSayisi: 1 } : c)),
    partSales: [...(d.partSales || []), { id: 9510, customerId: 9500, tur: "Kalıp", ad: "Hamburger", ucret: 10000, teklifId: 9599, teklifKalemId: "k1" }],
    yedekParcaSatislar: [...(d.yedekParcaSatislar || []), { id: 9511, aliciTipi: "musteri", musteriId: 9500, partId: "95", miktar: 2, birimFiyat: 100, teklifId: 9599, teklifKalemId: "p1", tahsisler: [] }],
    partStock: d.partStock.map(x => (x.id === 9501 ? { ...x, miktar: 8 } : x)),
    partStockLog: [...(d.partStockLog || []), { id: 9512, partId: "95", miktar: -2, tip: "bayi_satis", referansId: 9511 }],
  });
  const kalipsizTok = (await login("evrakKalipsiz", "evrak456")).body.token;
  eA = await gUst(kalipsizTok);
  check("evrak (spec 0006 C8): kalıp ekleme izni olmayan Evrak kullanıcısı Extra Kalıp üretemez → 403 (gevşetme yok)",
    (await postData(evrakYazimi(eA), eA.dataVersion, kalipsizTok)).status === 403);
  const evrakTok = (await login("evrakci", "evrak123")).body.token;
  eA = await gUst(evrakTok);
  check("evrak (spec 0006 AC-33): yalnız Evrak sekmeli, izinli kullanıcının yedek parça + Extra Kalıp + stok yazımı → 200",
    (await postData(evrakYazimi(eA), eA.dataVersion, evrakTok)).status === 200);
  // Spec 0007 C6: Bayiler sekmeli kullanıcı bayinin aracılığıyla Extra Kalıp yazar (partSales + müşterinin kalıp listesi).
  const bkTok = (await login("bayiKalipci", "bayi123")).body.token;
  const bkA = await gUst(bkTok);
  check("bayi kalıp (spec 0007 C6): yalnız Bayiler sekmeli, cust_kalip_add'li kullanıcının Extra Kalıp yazımı → 200",
    (await postData({ ...bkA, dataVersion: undefined,
      customers: bkA.customers.map(c => (c.id === 9500 ? { ...c, kaliplar: [...(c.kaliplar || []), { ad: "Köfte", olcu: "", partSaleId: 9520 }], kalipSayisi: (c.kaliplar || []).length + 1 } : c)),
      partSales: [...(bkA.partSales || []), { id: 9520, customerId: 9500, tur: "Kalıp", ad: "Köfte", ucret: 500, satisFirma: "Ege Bayi" }] }, bkA.dataVersion, bkTok)).status === 200);
  const eSon = await gUst(adminTok);
  check("evrak (spec 0006): üretilen kayıtlar kalıcı (belge bağlarıyla)",
    eSon.yedekParcaSatislar.some(x => x.id === 9511 && x.teklifId === 9599 && x.teklifKalemId === "p1") && eSon.partSales.some(x => x.id === 9510 && x.teklifKalemId === "k1")
    && eSon.partStock.find(x => x.id === 9501)?.miktar === 8);

  // ── Sunucu-tarafı işlem geçmişi (safety-net): HER başarılı yazma (admin dâhil), istemci
  //    ayrıca /api/audit çağırmasa/uydursa bile, gerçekten DEĞİŞEN bölümlerden türetilerek
  //    sunucu-yetkili kaydedilir.
  const auditRows = await (await api("/api/audit?limit=300", {}, adminTok)).json();
  check("kısıtlı yazma sunucu işlem geçmişine düştü (veri_kaydedildi/sunucu)",
    Array.isArray(auditRows.rows) && auditRows.rows.some(r => r.action === "veri_kaydedildi" && r.entity === "sunucu" && (r.username === "part" || r.username === "sekme")));
  check("sunucu işlem kaydı değişen bölüm adını taşır (Müşteriler/Notlar)",
    auditRows.rows.some(r => r.action === "veri_kaydedildi" && /Müşteriler|Notlar/.test(r.entity_name || "")));
  check("tam yetkili admin yazması da sunucu-tarafı veri_kaydedildi ÜRETİR",
    auditRows.rows.some(r => r.action === "veri_kaydedildi" && r.username === "admin"));

  // ── Admin-gating ────────────────────────────────────────────────────────────
  check("salt-okunur GET /api/users → 403", (await api("/api/users", {}, roTok)).status === 403);
  check("salt-okunur GET /api/audit → 403", (await api("/api/audit", {}, roTok)).status === 403);
  check("admin GET /api/users → 200", (await api("/api/users", {}, adminTok)).status === 200);

  // ── /api/version LAN adres bilgisi (aynı-ağ tespiti + LAN failover için) ──────
  // Her kimliği doğrulanmış istemciye verilir (IP kısıtlaması rozet + failover'ı bozuyordu).
  const versionBody = await (await api("/api/version", {}, adminTok)).json();
  check("/api/version serverLanIps dizi döner", Array.isArray(versionBody.serverLanIps));
  check("/api/version serverPort döner", typeof versionBody.serverPort === "number");

  // ── Son-admin koruması: tek aktif admini düşürme/pasifleştirme engellenir ──
  const adminId = adminLogin.body.user.id;
  check("tek admini user yapma → 400", (await api(`/api/users/${adminId}`, { method: "PATCH", body: JSON.stringify({ role: "user" }) }, adminTok)).status === 400);
  check("tek admini pasifleştirme → 400", (await api(`/api/users/${adminId}`, { method: "PATCH", body: JSON.stringify({ is_active: 0 }) }, adminTok)).status === 400);

  // ── Rol düşürme ANINDA etkili olmalı (bayat rol regresyonu) ─────────────────
  // REGRESYON: requireAdmin rolü JWT payload'ından okuyordu ve updateUser token_version'ı yalnız
  // ŞİFRE değişiminde artırıyordu. Rolü düşürülen admin, jetonun doğal ömrü (30 gün) boyunca
  // yönetici kalıyordu: kullanıcı ekleyip silebilir, denetim kayıtlarını temizleyebilirdi.
  const ikinciAdmin = await api("/api/users", { method: "POST", body: JSON.stringify({ username: "admin2", password: "admin234", role: "admin" }) }, adminTok);
  const admin2Id = (await ikinciAdmin.json()).id;
  const admin2Tok = (await login("admin2", "admin234")).body.token;
  check("ikinci admin kendi jetonuyla /api/users görebiliyor (ön koşul)", (await api("/api/users", {}, admin2Tok)).status === 200);
  check("iki admin varken rol düşürme kabul edilir → 200", (await api(`/api/users/${admin2Id}`, { method: "PATCH", body: JSON.stringify({ role: "user" }) }, adminTok)).status === 200);
  check("rolü düşürülen adminin ESKİ jetonu artık yönetici değil", (await api("/api/users", {}, admin2Tok)).status !== 200);
  check("rolü düşürülen admin yeni kullanıcı oluşturamaz",
    (await api("/api/users", { method: "POST", body: JSON.stringify({ username: "arka_kapi", password: "hunter22", role: "admin" }) }, admin2Tok)).status !== 201);
  check("rolü düşürülen admin denetim kaydını silemez", (await api("/api/audit", { method: "DELETE" }, admin2Tok)).status !== 200);

  // ── Şifre uzunluğu ──────────────────────────────────────────────────────────
  check("kısa şifreyle kullanıcı ekleme → 400", (await api("/api/users", { method: "POST", body: JSON.stringify({ username: "yeni", password: "123", role: "user" }) }, adminTok)).status === 400);
  check("geçerli şifreyle kullanıcı ekleme → 201", (await api("/api/users", { method: "POST", body: JSON.stringify({ username: "yeni", password: "abcdef", role: "user" }) }, adminTok)).status === 201);

  // ── Sunucu admin jetonu: HTTP ucu yok, yalnız süreç-içi modül çağrısı ────────
  // REGRESYON: POST /auth/refresh-internal şifresiz + 2FA'sız 30 günlük admin jetonu veriyordu ve
  // tek koruması isteğin loopback'ten gelmesiydi. Sunucu PC'sinde oturum açabilen ikinci bir OS
  // kullanıcısı (data.db'yi DPAPI yüzünden okuyamayan biri) curl ile admin olabiliyordu; Host
  // doğrulanmadığı için DNS rebinding ile tarayıcıdan da sızdırılabiliyordu. Uç nokta kaldırıldı.
  const refGone = await api("/auth/refresh-internal", { method: "POST", body: JSON.stringify({ username: "admin" }) });
  check("refresh-internal ucu artık yok (loopback'ten bile admin jetonu dağıtmıyor)", refGone.status === 404);
  const icTok = server.issueAdminToken("admin");
  check("issueAdminToken admin için çalışan jeton üretir", !!icTok && (await api("/api/users", {}, icTok)).status === 200);
  check("issueAdminToken admin olmayan için null", server.issueAdminToken("ro") === null);
  check("issueAdminToken olmayan kullanıcı için null", server.issueAdminToken("yok-boyle-biri") === null);

  // ── İki adımlı doğrulama (2FA / TOTP) uçtan uca ─────────────────────────────
  const totp = require(path.join(root, "electron", "totp.cjs"));
  const createTfa = await api("/api/users", { method: "POST", body: JSON.stringify({ username: "tfa", password: "tfapass1", role: "user" }) }, adminTok);
  const tfaId = (await createTfa.json()).id;
  const tfaTok = (await login("tfa", "tfapass1")).body.token;
  const setupRes = await api("/auth/2fa/setup", { method: "POST" }, tfaTok);
  const setupBody = await setupRes.json();
  check("2fa/setup secret + QR döner", setupRes.status === 200 && !!setupBody.secret && String(setupBody.qr).startsWith("data:image"));
  check("2fa/enable yanlış kod → 401", (await api("/auth/2fa/enable", { method: "POST", body: JSON.stringify({ code: "000000" }) }, tfaTok)).status === 401);
  const enableRes = await api("/auth/2fa/enable", { method: "POST", body: JSON.stringify({ code: totp.currentToken(setupBody.secret) }) }, tfaTok);
  const enableBody = await enableRes.json();
  check("2fa/enable doğru kod → 8 kurtarma kodu", enableRes.status === 200 && Array.isArray(enableBody.recovery) && enableBody.recovery.length === 8);
  // 2FA açılınca token_version arttı: enable isteğini yapan ESKİ jeton artık geçersiz (diğer cihazlar düşer)
  check("2fa açılınca eski oturum jetonu düşer (401)", (await api("/api/version", {}, tfaTok)).status === 401);
  check("2fa/enable taze jeton döndürür ve çalışır", !!enableBody.token && (await api("/api/version", {}, enableBody.token)).status === 200);
  const noCode = await login("tfa", "tfapass1");
  check("2fa açık: kodsuz login → 401 requires2fa", noCode.status === 401 && noCode.body.requires2fa === true);
  const withCode = await login2fa("tfa", "tfapass1", totp.currentToken(setupBody.secret));
  check("2fa: doğru TOTP ile login başarılı", withCode.status === 200 && !!withCode.body.token);
  const withRec = await login2fa("tfa", "tfapass1", enableBody.recovery[0]);
  check("2fa: kurtarma kodu ile login başarılı", withRec.status === 200 && !!withRec.body.token);
  check("2fa: kullanılmış kurtarma kodu tekrar → 401", (await login2fa("tfa", "tfapass1", enableBody.recovery[0])).status === 401);
  // Step-up: 2FA sıfırlama admin'in KENDİ şifresini ister (kilitsiz oturum tek tıkla 2FA soyamasın).
  check("admin 2fa sıfırla: şifresiz → 401 (step-up)", (await api(`/api/users/${tfaId}/2fa`, { method: "DELETE" }, adminTok)).status === 401);
  check("admin 2fa sıfırla: yanlış admin şifresi → 401", (await api(`/api/users/${tfaId}/2fa`, { method: "DELETE", body: JSON.stringify({ password: "yanlis" }) }, adminTok)).status === 401);
  check("admin 2fa sıfırla: doğru admin şifresi → 200", (await api(`/api/users/${tfaId}/2fa`, { method: "DELETE", body: JSON.stringify({ password: "admin123" }) }, adminTok)).status === 200);
  check("sıfırlama sonrası kodsuz login çalışır", (await login("tfa", "tfapass1")).status === 200);

  // ── Sunucu KURULUM yolu login korumalarını atlayamaz (ortak authenticateLogin) ──
  // REGRESYON: setupAdmin eskiden bcrypt.compare + refresh-internal ile doğruluyordu; bu yol
  // 2FA'yı, kademeli kilidi ve güvenlik kaydını TAMAMEN baypas ediyordu (2FA açık admin şifresi
  // sınırsız denenebiliyordu). Artık setupAdmin da server.authenticateLogin kullanır — burada o
  // fonksiyonun korumaları doğrulanır. İzole IP (10.0.0.99) kullanılır ki 127.0.0.1 sayaçlarını
  // (aşağıdaki DoS/kaba-kuvvet testleri) bozmasın.
  const createSetup = await api("/api/users", { method: "POST", body: JSON.stringify({ username: "setup", password: "setup123", role: "user" }) }, adminTok);
  check("kurulum testi kullanıcısı oluşturuldu", createSetup.status === 201);
  const setupTok = (await login("setup", "setup123")).body.token;
  const setup2fa = await (await api("/auth/2fa/setup", { method: "POST" }, setupTok)).json();
  await api("/auth/2fa/enable", { method: "POST", body: JSON.stringify({ code: totp.currentToken(setup2fa.secret) }) }, setupTok);
  // Doğru şifre ama 2FA açık + kod yok → token YOK, requires2fa (kurulum ekranı 2FA'yı atlayamaz)
  const authNo2fa = await server.authenticateLogin({ username: "setup", password: "setup123", ip: "10.0.0.99" });
  check("authenticateLogin: 2FA açıkken kodsuz → requires2fa, token yok", authNo2fa.status === 401 && authNo2fa.requires2fa === true && !authNo2fa.token);
  // Yanlış şifre → token yok
  check("authenticateLogin: yanlış şifre → 401, token yok", (await server.authenticateLogin({ username: "setup", password: "yanlis", ip: "10.0.0.99" })).status === 401);
  // Doğru şifre + doğru kod → token
  const authOk = await server.authenticateLogin({ username: "setup", password: "setup123", totpCode: totp.currentToken(setup2fa.secret), ip: "10.0.0.99" });
  check("authenticateLogin: doğru şifre+2FA → token", authOk.status === 200 && !!authOk.token);
  // Yanlış şifreyi defalarca dene → kademeli kilit (429): kurulum ekranı sınırsız deneyemez
  let setup429 = -1;
  for (let i = 1; i <= 8; i++) {
    const r = await server.authenticateLogin({ username: "setup", password: "yine-yanlis", ip: "10.0.0.99" });
    if (r.status === 429) { setup429 = i; break; }
  }
  check("authenticateLogin: birkaç yanlıştan sonra kademeli kilit (429)", setup429 >= 3 && setup429 <= 8);

  // ── Kullanıcı Geçmişi (security_log): giriş/yönetim/2FA olayları + ingest ────
  check("token'sız GET /api/security-log → 401", (await api("/api/security-log")).status === 401);
  check("salt-okunur GET /api/security-log → 403", (await api("/api/security-log", {}, roTok)).status === 403);
  const secAll = await (await api("/api/security-log?limit=200", {}, adminTok)).json();
  check("admin GET /api/security-log → kayıtlar döner", Array.isArray(secAll.rows) && secAll.total > 0);
  check("giriş başarılı olayı kaydedildi", secAll.rows.some(r => r.action === "giris_basarili" && r.actor === "admin"));
  check("başarısız giriş olayı kaydedildi (yanlış 2FA)", secAll.rows.some(r => r.action === "giris_basarisiz"));
  check("başarılı girişte IP yazıldı", secAll.rows.some(r => r.action === "giris_basarili" && !!r.ip));
  check("kullanıcı ekleme olayı kaydedildi", secAll.rows.some(r => r.action === "kullanici_eklendi" && r.target === "yeni"));
  check("2FA sıfırlama olayı kaydedildi", secAll.rows.some(r => r.action === "2fa_sifirlandi" && r.target === "tfa"));
  const secByAction = await (await api("/api/security-log?action=giris_basarili", {}, adminTok)).json();
  check("action filtresi yalnız giris_basarili döner", secByAction.rows.every(r => r.action === "giris_basarili"));
  // ingest: yalnız app-lock eylemleri kabul edilir; sahte "giris_basarili" enjeksiyonu reddedilir
  const ingest = await (await api("/api/security-log/ingest", { method: "POST", body: JSON.stringify({ entries: [
    { ts: new Date().toISOString(), actor: "Cihaz: TEST", action: "giris_basarili" },
    { ts: new Date().toISOString(), actor: "Cihaz: TEST", action: "uygulama_kilidi_basarisiz", detail: JSON.stringify({ sebep: "Yanlış şifre" }) },
  ] }) }, adminTok)).json();
  check("ingest: sadece app-lock eylemi yazılır (sahte giriş reddedilir)", ingest.ok === true && ingest.yazilan === 1);
  const ingestGoruntu = await (await api("/api/security-log?action=uygulama_kilidi_basarisiz", {}, adminTok)).json();
  check("ingest edilen app-lock kaydı görünür", ingestGoruntu.total >= 1);
  check("ingest'te gönderen kullanıcı adı target'a yazıldı", ingestGoruntu.rows.some(r => r.actor === "Cihaz: TEST" && r.target === "admin"));
  // Aşağıdakiler partTok ile yapılır; şifre değişimi partTok'u geçersizleştireceğinden ONDAN ÖNCE.
  await api("/auth/me", {}, partTok);                                    // token yenileme → oturum_yenilendi
  await api("/auth/2fa/setup", { method: "POST" }, partTok);             // 2FA kurulumu başlatma → 2fa_kurulum_baslatildi
  await api("/auth/logout", { method: "POST" }, partTok);               // çıkış → cikis
  await api("/api/lock", { method: "POST", body: JSON.stringify({ entityType: "musteri", entityId: "5" }) }, partTok);
  await api("/api/lock", { method: "DELETE", body: JSON.stringify({ entityType: "musteri", entityId: "5" }) }, partTok); // kilit bırakma → kilit_birakildi
  // Kendi şifresini değiştirme güvenlik günlüğüne düşer (bir kullanıcının en hassas kendi-hesap işlemi).
  const sifreDeg = await api("/auth/me/password", { method: "PATCH", body: JSON.stringify({ currentPassword: "part123", newPassword: "part1234" }) }, partTok);
  check("kendi şifre değişimi → 200", sifreDeg.status === 200);
  // Şifre değişimi token_version'ı artırdı → eski partTok geçersiz; sonraki dosya testleri için tazele.
  partTok = (await login("part", "part1234")).body.token;
  // Başkasının kilidini devralma (force steal) güvenlik günlüğüne düşer.
  await api("/api/lock", { method: "POST", body: JSON.stringify({ entityType: "musteri", entityId: "1" }) }, adminTok);
  const kilitCal = await api("/api/lock", { method: "POST", body: JSON.stringify({ entityType: "musteri", entityId: "1", force: true }) }, roTok);
  check("başkasının kilidini devralma → 200", kilitCal.status === 200);
  const secAll2 = await (await api("/api/security-log?limit=300", {}, adminTok)).json();
  check("kendi şifre değişimi kaydedildi (sifre_degistirildi)", secAll2.rows.some(r => r.action === "sifre_degistirildi" && r.actor === "part"));
  check("kilit devralma kaydedildi (kilit_devralindi, hedef=önceki sahip)", secAll2.rows.some(r => r.action === "kilit_devralindi" && r.actor === "ro" && r.target === "admin"));
  check("kilit bırakma kaydedildi (kilit_birakildi)", secAll2.rows.some(r => r.action === "kilit_birakildi" && r.actor === "part"));
  check("token yenileme kaydedildi (oturum_yenilendi)", secAll2.rows.some(r => r.action === "oturum_yenilendi" && r.actor === "part"));
  check("2FA kurulumu başlatma kaydedildi (2fa_kurulum_baslatildi)", secAll2.rows.some(r => r.action === "2fa_kurulum_baslatildi" && r.actor === "part"));
  check("çıkış kaydedildi (cikis)", secAll2.rows.some(r => r.action === "cikis" && r.actor === "part"));
  // Temizle (admin) → temizlik sonrası tek "gecmis_temizlendi" kaydı kalır
  check("admin DELETE /api/security-log → 200", (await api("/api/security-log", { method: "DELETE" }, adminTok)).status === 200);
  const secAfterClear = await (await api("/api/security-log", {}, adminTok)).json();
  check("temizlik sonrası yalnız 'gecmis_temizlendi' kaydı kalır", secAfterClear.total === 1 && secAfterClear.rows[0].action === "gecmis_temizlendi");

  // ── Dosya arşivi uçları (Faz 2, çok kullanıcılı): yükle → indir → sil ──────────
  const upBuf = Buffer.from("PDF-benzeri-icerik-123");
  const upRes = await fetch(`${base}/api/files/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminTok}`, "Content-Type": "application/octet-stream", "X-Dosya-Adi": encodeURIComponent("rapor.pdf"), "X-Dosya-Firma": encodeURIComponent("ABC Makina") },
    body: upBuf,
  });
  const upBody = await upRes.json().catch(() => ({}));
  check("dosya yükleme → depoAdi + boyut döner", upRes.status === 200 && !!upBody.dosyaAdi && upBody.boyut === upBuf.length && upBody.tur === "PDF");
  // Okunur depo adı: firma önde, uzantı sonda, yol ayracı yok (indirme guard'ından geçer).
  check("okunur depo adı: firma önde + .pdf sonda + / yok", /^ABC Makina - rapor - .+\.pdf$/.test(upBody.dosyaAdi) && !upBody.dosyaAdi.includes("/"));
  check("token'sız yükleme → 401", (await fetch(`${base}/api/files/upload`, { method: "POST", headers: { "Content-Type": "application/octet-stream", "X-Dosya-Adi": "x.pdf" }, body: upBuf })).status === 401);
  check("izin verilmeyen tür yükleme → 400", (await fetch(`${base}/api/files/upload`, { method: "POST", headers: { Authorization: `Bearer ${adminTok}`, "Content-Type": "application/octet-stream", "X-Dosya-Adi": encodeURIComponent("virus.exe") }, body: Buffer.from("x") })).status === 400);
  const dl = await fetch(`${base}/api/files/${encodeURIComponent(upBody.dosyaAdi)}`, { headers: { Authorization: `Bearer ${adminTok}` } });
  const dlBuf = Buffer.from(await dl.arrayBuffer());
  check("dosya indirme içeriği yüklenenle eşleşir", dl.status === 200 && dlBuf.equals(upBuf));
  check("token'sız indirme → 401", (await fetch(`${base}/api/files/${encodeURIComponent(upBody.dosyaAdi)}`)).status === 401);
  check("path traversal indirme reddedilir", (await fetch(`${base}/api/files/${encodeURIComponent("../gizli")}`, { headers: { Authorization: `Bearer ${adminTok}` } })).status === 400);
  check("olmayan dosya indirme → 404", (await fetch(`${base}/api/files/yok-123.pdf`, { headers: { Authorization: `Bearer ${adminTok}` } })).status === 404);
  // Yetki: salt-okunur kullanıcı fiziksel dosya YÜKLEYEMEZ/SİLEMEZ (yalnız requireAuth yeterli değil).
  check("salt-okunur dosya yükleme → 403", (await fetch(`${base}/api/files/upload`, { method: "POST", headers: { Authorization: `Bearer ${roTok}`, "Content-Type": "application/octet-stream", "X-Dosya-Adi": encodeURIComponent("ro.pdf") }, body: upBuf })).status === 403);
  check("salt-okunur dosya silme → 403", (await fetch(`${base}/api/files/${encodeURIComponent(upBody.dosyaAdi)}`, { method: "DELETE", headers: { Authorization: `Bearer ${roTok}` } })).status === 403);
  check("salt-okunur indirme (okuma) izinli → 200", (await fetch(`${base}/api/files/${encodeURIComponent(upBody.dosyaAdi)}`, { headers: { Authorization: `Bearer ${roTok}` } })).status === 200);
  check("müşteri işlemi olan kullanıcı dosya yükleyebilir → 200", (await fetch(`${base}/api/files/upload`, { method: "POST", headers: { Authorization: `Bearer ${partTok}`, "Content-Type": "application/octet-stream", "X-Dosya-Adi": encodeURIComponent("part.pdf") }, body: upBuf })).status === 200);
  // ── Fiziksel silmede nesne (künye) düzeyi yetki ─────────────────────────────
  // REGRESYON (IDOR): dosyaIslemYetkisi yalnız "müşteri VEYA bayi yazma tümden kapalı mı" diye
  // soruyor, HANGİ dosyanın silindiğine bakmıyordu. customerActions:[] olan bayi sorumlusu,
  // künyesine hiç dokunamadığı müşteri sözleşmelerini geri dönüşsüz silebiliyordu: künye yazma
  // 403 verirken fiziksel silme 200 veriyordu. Depo adını tahmin etmesi de gerekmiyor, blob veriyor.
  const bayiciTok = (await login("bayici", "bayi123")).body.token;
  const kunye = { id: 500, customerId: 1, ad: "sozlesme.pdf", dosyaAdi: upBody.dosyaAdi, boyut: upBuf.length, tur: "PDF", tarih: "2026-07-17" };
  check("müşteri dosyası künyesi eklendi (admin)", (await postData({ dosyalar: [kunye] }, await curVer(adminTok), adminTok)).status === 200);
  check("bayici künyeyi yazamaz (kontrol: iki yol aynı kararı vermeli) → 403",
    (await postData({ dosyalar: [] }, await curVer(bayiciTok), bayiciTok)).status === 403);
  check("bayici müşteri dosyasını FİZİKSEL silemez → 403",
    (await fetch(`${base}/api/files/${encodeURIComponent(upBody.dosyaAdi)}`, { method: "DELETE", headers: { Authorization: `Bearer ${bayiciTok}` } })).status === 403);
  check("reddedilen silmeden sonra dosya hâlâ duruyor → 200",
    (await fetch(`${base}/api/files/${encodeURIComponent(upBody.dosyaAdi)}`, { headers: { Authorization: `Bearer ${adminTok}` } })).status === 200);
  // Simetri: müşteri sorumlusu (dealerActions:[]) bayi dosyasına dokunamaz.
  const bayiUp = await fetch(`${base}/api/files/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminTok}`, "Content-Type": "application/octet-stream", "X-Dosya-Adi": encodeURIComponent("bayi.pdf"), "X-Dosya-Firma": encodeURIComponent("Bayi") },
    body: upBuf,
  });
  const bayiDosya = (await bayiUp.json()).dosyaAdi;
  await postData({ dosyalar: [kunye, { id: 501, dealerId: 2, ad: "bayi.pdf", dosyaAdi: bayiDosya, tur: "PDF", tarih: "2026-07-17" }] }, await curVer(adminTok), adminTok);
  check("müşteri sorumlusu (dealerActions boş) bayi dosyasını silemez → 403",
    (await fetch(`${base}/api/files/${encodeURIComponent(bayiDosya)}`, { method: "DELETE", headers: { Authorization: `Bearer ${partTok}` } })).status === 403);
  check("bayici kendi tarafındaki bayi dosyasını silebilir → 200",
    (await fetch(`${base}/api/files/${encodeURIComponent(bayiDosya)}`, { method: "DELETE", headers: { Authorization: `Bearer ${bayiciTok}` } })).status === 200);

  check("dosya silme → 200", (await fetch(`${base}/api/files/${encodeURIComponent(upBody.dosyaAdi)}`, { method: "DELETE", headers: { Authorization: `Bearer ${adminTok}` } })).status === 200);
  check("silinen dosya indirme → 404", (await fetch(`${base}/api/files/${encodeURIComponent(upBody.dosyaAdi)}`, { headers: { Authorization: `Bearer ${adminTok}` } })).status === 404);

  // ── TLS + sertifika sabitleme (pinning), tek portta hibrit ───────────────────
  const pf = require(path.join(root, "electron", "pinnedFetch.cjs"));
  const stls = require(path.join(root, "electron", "serverTls.cjs"));
  const httpsBase = base.replace("http://", "https://");
  const srvFp = server.getCertFingerprint();
  check("sunucu bir TLS parmak izi üretti", typeof srvFp === "string" && /^[0-9A-F:]+$/.test(srvFp));
  const healthJson = await (await fetch(`${base}/health`)).json();
  check("/health tls:true ve sunucu fp'sini döner", healthJson.tls === true && healthJson.fp === srvFp);
  check("hibrit: eski http yolu hâlâ çalışır (aynı port)", (await fetch(`${base}/health`)).status === 200);
  const grab = await pf.sertifikaParmakIziAl(httpsBase);
  check("TLS peer parmak izi = sunucu fp", grab.fp === srvFp);
  const pinliOk = await pf.pinliFetch(`${httpsBase}/health`, { dispatcher: pf.pinliDispatcher(grab.pem) });
  check("pinlenmiş https ile /health → 200", pinliOk.status === 200);
  // Ortadaki-adam: başka bir self-signed sertifika pinlenirse el sıkışma reddedilmeli
  const wrongDir = fs.mkdtempSync(path.join(os.tmpdir(), "wrongcert-"));
  const { cert: wrongCert } = await stls.sertifikaUretVeyaYukle({ getPath: () => wrongDir });
  let mitmReddedildi = false;
  try { await pf.pinliFetch(`${httpsBase}/health`, { dispatcher: pf.pinliDispatcher(wrongCert) }); }
  catch { mitmReddedildi = true; }
  check("yanlış sertifika pinlenirse https reddedilir (MITM engellenir)", mitmReddedildi);
  fs.rmSync(wrongDir, { recursive: true, force: true });

  // ── Yalnız-HTTPS modu (hibriti kapatma); loopback muaf ───────────────────────
  server.setTlsOnly(true);
  check("tlsOnly açıldı", server.getTlsOnly() === true);
  check("tlsOnly: loopback http /health hâlâ 200 (muaf, sunucu kendi refresh'i çalışsın)", (await fetch(`${base}/health`)).status === 200);
  const pinliHealth2 = await pf.pinliFetch(`${httpsBase}/health`, { dispatcher: pf.pinliDispatcher(grab.pem) });
  check("tlsOnly: pinli https /health hâlâ 200", pinliHealth2.status === 200);
  // Dıştan düz http reddi (best-effort): erişilebilir bir LAN IP varsa doğrula, yoksa atla.
  const dışFetch = async (url) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), 3000); try { return await fetch(url, { signal: c.signal }); } finally { clearTimeout(t); } };
  let dışYapildi = false, dışReddedildi = false;
  for (const ip of server.getLocalIps().filter((ip) => ip !== "127.0.0.1")) {
    server.setTlsOnly(false);
    let acik = false;
    try { acik = (await dışFetch(`http://${ip}:${port}/health`)).ok; } catch { acik = false; }
    if (!acik) continue; // bu IP sandbox/firewall'da erişilemiyor → atla
    server.setTlsOnly(true);
    dışYapildi = true;
    try { await dışFetch(`http://${ip}:${port}/health`); dışReddedildi = false; } catch { dışReddedildi = true; }
    break;
  }
  if (dışYapildi) check("tlsOnly: dıştan düz http bağlantısı reddedilir", dışReddedildi);
  else console.log("SKIP  tlsOnly dış reddi (erişilebilir harici LAN IP yok)");
  server.setTlsOnly(false); // sonraki kontrolleri etkilemesin

  // ── Tek oturum (admin hariç) + admin "tüm cihazlardan çıkar" ──────────────────
  const createSess = await api("/api/users", { method: "POST", body: JSON.stringify({ username: "sess", password: "sess123", role: "user" }) }, adminTok);
  const sessId = (await createSess.json()).id;
  const sess1 = (await login("sess", "sess123")).body.token;
  const sess2 = (await login("sess", "sess123")).body.token;
  check("tek oturum: ikinci giriş ilk jetonu düşürür (401)", (await api("/api/version", {}, sess1)).status === 401);
  check("tek oturum: en son jeton çalışır", (await api("/api/version", {}, sess2)).status === 200);
  const adminB = (await login("admin", "admin123")).body.token;
  check("admin tek oturuma MUAF: hem eski hem yeni admin jetonu geçerli", (await api("/api/version", {}, adminTok)).status === 200 && (await api("/api/version", {}, adminB)).status === 200);
  check("logout-all: salt-okunur → 403 (yalnız admin)", (await api(`/api/users/${sessId}/logout-all`, { method: "POST" }, roTok)).status === 403);
  check("logout-all: admin → 200", (await api(`/api/users/${sessId}/logout-all`, { method: "POST" }, adminTok)).status === 200);
  check("logout-all sonrası kullanıcının jetonu düşer (401)", (await api("/api/version", {}, sess2)).status === 401);

  // ── Yazma hız sınırı (DoS koruması): POST /api/data kullanıcı başına 60/dk ──
  // "yeni" kullanıcısı temiz sayaçla; gövde {} olduğu için handler 400 döner ama limiter
  // handler'dan ÖNCE sayar. 60 istekten sonra 429 gelmeli. (Login IP sayacına dokunmaz.)
  const yeniTok = (await login("yeni", "abcdef")).body.token;
  let rl429 = false, rlLast = 0;
  for (let i = 0; i < 65; i++) {
    rlLast = (await api("/api/data", { method: "POST", body: "{}" }, yeniTok)).status;
    if (rlLast === 429) rl429 = true;
  }
  check("POST /api/data 60/dk üstü → 429 (yazma hız sınırı)", rl429 && rlLast === 429);

  // ── Kaba kuvvet: kademeli (artan) kilit — en son (IP+kullanıcı sayacını tüketir) ──
  // İlk 2 yanlış serbest (401). 3. yanlış kilidi kurar (yine 401 döner ama bundan sonrası
  // kilitli). Sonraki hızlı deneme 429 olmalı.
  let ilk429 = -1, kilitCevap = null;
  for (let i = 1; i <= 6; i++) {
    const r = await login("admin", "yanlisSifre");
    if (r.status === 429) { ilk429 = i; kilitCevap = r; break; }
  }
  check("ilk 2 deneme kademeli kilide takılmaz (401)", ilk429 === -1 || ilk429 >= 3);
  check("birkaç yanlıştan sonra 429 (kademeli kilit devreye girer)", ilk429 >= 3 && ilk429 <= 6);
  // İstemci giriş ekranı geri sayımı bu alandan besleniyor — gövdede retryAfterSec olmalı.
  check("429 gövdesi retryAfterSec döner (istemci geri sayımı)", kilitCevap && typeof kilitCevap.body.retryAfterSec === "number" && kilitCevap.body.retryAfterSec > 0);

  // ── Kalıcılık: kademeli sayaç DB'de tutulur, sunucu yeniden başlasa da korunur ──
  const bucketOnce = dbmod.getRateBucket("user:admin");
  check("kademeli sayaç DB'ye yazıldı (kullanıcı adı başına)", !!bucketOnce && bucketOnce.count >= 3);
  await server.stop();
  const { port: portSonra } = await server.start(0, dbmod); // yeniden başlatılan sunucunun portu (aşağıdaki hız sınırı kontrolü için)
  const bucketSonra = dbmod.getRateBucket("user:admin");
  check("yeniden başlatmada kademeli sayaç korunur (kalıcı kilit)", !!bucketSonra && bucketSonra.count >= 3);

  // ── Genel /api hız sınırı (IP başına 600/dk, express-rate-limit): 601. istek 429 ─────────────
  // Sunucu az önce yeniden başladı → sayaç sıfır. EN SONDA koşar: pencere dolunca sonraki tüm /api
  // istekleri 1 dk boyunca 429 alır, başka kontrol kalmamalı. Yeni admin jetonu (sunucu yeniden başladı).
  {
    const b = `http://127.0.0.1:${portSonra}`;
    // Kaba kuvvet bölümü IP/kullanıcı kilidi bıraktı → yeni giriş yerine baştaki salt-okunur jeton
    // (JWT gizli anahtarı kalıcı, yeniden başlatmada geçerli kalır).
    const tok2 = roTok;
    let ilk429 = -1, sonStatus = 0, digerHata = 0;
    for (let i = 1; i <= 601; i++) {
      const r = await fetch(b + "/api/version", { headers: { Authorization: `Bearer ${tok2}` } });
      sonStatus = r.status;
      if (r.status === 429) { if (ilk429 === -1) ilk429 = i; }
      else if (r.status !== 200) digerHata++;
    }
    if (!(ilk429 === 601 && sonStatus === 429 && digerHata === 0)) console.log("  DBG hız sınırı: ilk429=", ilk429, "son=", sonStatus, "digerHata=", digerHata);
    check("genel /api hız sınırı: ilk 600 istek 200, 601. istek 429", ilk429 === 601 && sonStatus === 429 && digerHata === 0);
    const r429 = await fetch(b + "/api/version", { headers: { Authorization: `Bearer ${tok2}` } });
    const g429 = await r429.json().catch(() => ({}));
    check("429 gövdesi Türkçe hata + RateLimit başlığı", r429.status === 429 && /fazla istek/i.test(g429.error || "") && !!r429.headers.get("ratelimit"));
    check("/health ve /auth sınırın dışında (sınır yalnız /api)", (await fetch(b + "/health")).status === 200);
  }

  await server.stop();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  // Electron ana süreçte process.exit() ertelenebildiğinden (kod akmaya devam eder), başarısızlıkta
  // RETURN ile başarı sentinel'ini bastırmadan çık — sarmalayıcı "TUM KONTROLLER GECTI" satırını da
  // aradığı için, çıkış kodu 0'a düşse bile FAIL yakalanır.
  if (fail) { console.error(`${fail} kontrol BASARISIZ`); process.exit(1); return; }
  console.log("TUM KONTROLLER GECTI");
  process.exit(0);
})();
