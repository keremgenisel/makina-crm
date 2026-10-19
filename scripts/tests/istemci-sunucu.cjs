// İstemci ↔ sunucu uçtan uca: GERÇEK istemci kodu (electron/ipc/data.cjs, uygulamanın sunucuya bağlanırken kullandığı
// IPC işleyicileri) GERÇEK gömülü sunucuya (electron/server.cjs) karşı, iki ayrı kullanıcı verisi klasörüyle (sunucu PC
// ve istemci PC). server-security.cjs sunucuyu ham HTTP ile sınar; bu betik istemcinin yolunu sınar: TLS sertifikası
// güveni ve pin, sürüm başlığı, yükleme/kaydetme ve neden kodları, çakışma, kilitler, dosya köprüsü, kullanıcı yönetimi,
// oturum yenileme, çıkış. Express 5 geçişinde elle denemenin yerine yazıldı (tests/istemci-sunucu.test.js Electron'la koşar).
const path = require("path");
const os = require("os");
const fs = require("fs");
const Module = require("module");

const sunucuDizin = fs.mkdtempSync(path.join(os.tmpdir(), "crm-sunucu-"));
const istemciDizin = fs.mkdtempSync(path.join(os.tmpdir(), "crm-istemci-"));
const yayinlar = [];
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  // db.cjs ve server.cjs sunucu PC'nin klasörünü görür; istemci kodu klasörünü kendisine verilen app'ten alır.
  if (request === "electron") return {
    app: { getPath: () => sunucuDizin },
    BrowserWindow: { getAllWindows: () => [{ isDestroyed: () => false, webContents: { send: (k, ...a) => yayinlar.push([k, ...a]) } }] },
    safeStorage: { isEncryptionAvailable: () => false },
  };
  return origLoad(request, parent, isMain);
};

const root = path.join(__dirname, "..", "..");
const bcrypt = require(path.join(root, "node_modules", "bcryptjs"));
const dbmod = require(path.join(root, "electron", "db.cjs"));
const server = require(path.join(root, "electron", "server.cjs"));
const { registerDataHandlers, makeFileNet } = require(path.join(root, "electron", "ipc", "data.cjs"));

const SURUM = "3.47.0";
const istemciApp = { getPath: () => istemciDizin, getVersion: () => SURUM };
const isleyici = {};
const ipcMain = { handle: (k, f) => { isleyici[k] = f; }, on: (k, f) => { isleyici[k] = f; } };
const ipc = (k, arg) => isleyici[k]({}, arg);

let fail = 0;
const check = (name, ok, ek) => { console.log((ok ? "PASS" : "FAIL") + "  " + name + (ok || ek === undefined ? "" : "  → " + JSON.stringify(ek))); if (!ok) fail++; };
process.on("uncaughtException", (e) => { console.error("FAIL (uncaught):", e && e.stack || e); process.exit(1); });

(async () => {
  dbmod.migrateFromJsonIfNeeded();
  if (!dbmod.isActive()) { console.error("FAIL: sqlite aktif değil"); process.exit(1); return; }
  dbmod.createUser("admin", bcrypt.hashSync("admin123", 10), "admin", null);
  dbmod.writeBlobToDb({ customers: [{ id: 1, name: "İlk Müşteri", model: "AK100" }], notes: [{ id: 4, text: "not" }], appSettings: { kdvRates: { tr: 20 } } });
  const { port } = await server.start(0, dbmod);
  const adres = `127.0.0.1:${port}`;
  registerDataHandlers(ipcMain, istemciApp, {}, { isActive: () => false });
  const ayar = () => JSON.parse(fs.readFileSync(path.join(istemciDizin, "server-config.json"), "utf8"));

  // ── Giriş: sertifika güveni, https + pin, sürüm başlığı ──
  const ilk = await ipc("server:login", { serverUrl: adres, username: "admin", password: "admin123" });
  check("ilk girişte sunucu sertifikası güven ister (needTrust + parmak izi)", ilk.needTrust === true && !!ilk.fp, ilk);
  check("yanlış şifre → hata, oturum yok", !!(await ipc("server:login", { serverUrl: adres, username: "admin", password: "yanlis", trust: true })).error);
  const giris = await ipc("server:login", { serverUrl: adres, username: "admin", password: "admin123", trust: true });
  check("güvenilen sertifikayla giriş başarılı, TLS açık", giris.ok === true && giris.tls === true && giris.user?.role === "admin", giris);
  check("istemci ayarı https adresini, jetonu ve sertifika pinini saklar", ayar().mode === "client" && ayar().serverUrl.startsWith("https://") && !!ayar().token && !!ayar().serverCertFp);
  const girisKaydi = dbmod.getSecurityLog({ limit: 20, action: "giris_basarili" }).rows.find(r => r.actor === "admin");
  check("sunucu girişi istemci sürümüyle kaydetti (X-App-Surum)", !!girisKaydi && JSON.parse(girisKaydi.detail || "{}").istemciSurum === SURUM, girisKaydi);

  // ── Veri: yükleme, kaydetme, çakışma ──
  const veri = await ipc("crm:load");
  check("crm:load sunucudan veriyi getirir", veri?.customers?.[0]?.name === "İlk Müşteri" && typeof veri.dataVersion === "number", veri && Object.keys(veri));
  const kayit = await ipc("crm:save", { ...veri, customers: [...veri.customers, { id: 2, name: "İstemciden Eklenen" }], __dataVersion: veri.dataVersion });
  check("crm:save başarılı ({ ok: true, sebep: null })", kayit.ok === true && kayit.sebep === null, kayit);
  const veri2 = await ipc("crm:load");
  check("kaydedilen kayıt yeniden yüklemede var, veri sürümü arttı", veri2.customers.some(c => c.name === "İstemciden Eklenen") && veri2.dataVersion > veri.dataVersion);
  const eski = await ipc("crm:save", { ...veri, notes: [], __dataVersion: veri.dataVersion });
  check("eski veri sürümüyle kayıt → çakışma (sebep 'cakisma'), veri ezilmez", eski.ok === false && eski.sebep === "cakisma" && (await ipc("crm:load")).notes.length === 1, eski);
  check("çakışma istemciye server:conflict olarak yayınlandı", yayinlar.some(([k]) => k === "server:conflict"));

  // ── Genel API isteği (yoklama ve yönetim yolu) ──
  const surum = await ipc("server:apiRequest", { method: "GET", path: "/api/version" });
  check("server:apiRequest GET /api/version → 200 ve veri sürümü", surum.ok === true && surum.data?.dataVersion === veri2.dataVersion, surum);
  const tfa = await ipc("server:apiRequest", { method: "GET", path: "/auth/2fa/status" });
  check("server:apiRequest GET /auth/2fa/status → kapalı", tfa.ok === true && tfa.data.enabled === false, tfa);
  const yeni = await ipc("server:apiRequest", { method: "POST", path: "/api/users", body: { username: "okur", password: "okur1234", role: "user", permissions: JSON.stringify({ tabs: ["customers"], customerActions: [] }) } });
  check("admin kullanıcı ekler (201)", yeni.ok === true && yeni.status === 201 && !!yeni.data.id, yeni);
  const liste = await ipc("server:apiRequest", { method: "GET", path: "/api/users" });
  check("kullanıcı listesi yeni kullanıcıyı içerir", liste.ok === true && liste.data.some(u => u.username === "okur"));
  const denetim = await ipc("server:apiRequest", { method: "POST", path: "/api/audit", body: { action: "eklendi", entity: "musteri", entity_name: "İstemciden Eklenen" } });
  check("işlem geçmişi kaydı istemciden yazılır", denetim.ok === true, denetim);
  const eksik = await ipc("server:apiRequest", { method: "POST", path: "/api/audit", body: {} });
  check("eksik işlem kaydı → 400 hatası istemciye döner", eksik.status === 400 && !!eksik.error, eksik);

  // ── Kilitler ──
  check("kilit alınır", (await ipc("crm:lock:acquire", { entityType: "customer", entityId: 1 })).ok === true);
  check("kilit listesinde görünür (sahibi admin)", (await ipc("crm:lock:list")).some(l => l.entity_type === "customer" && String(l.entity_id) === "1" && l.locked_by === "admin"));
  await ipc("crm:lock:release", { entityType: "customer", entityId: 1 });
  check("kilit bırakılınca listeden çıkar (DELETE gövdeli istek)", !(await ipc("crm:lock:list")).some(l => l.entity_type === "customer"));
  for (const id of [5, 6]) await ipc("crm:lock:acquire", { entityType: "customer", entityId: id });
  await ipc("crm:lock:releaseAll");
  check("bütün kilitler bırakılır", (await ipc("crm:lock:list")).length === 0);

  // ── Dosya köprüsü (yükle, indir, sil) ──
  const net = makeFileNet(istemciApp);
  check("dosya köprüsü istemci modunu tanır", net.isClient() === true);
  const icerik = Buffer.from("%PDF-1.4 istemci deneme " + "x".repeat(5000));
  const yuk = await net.upload("rapor.pdf", icerik, "ABC Makina");
  check("dosya yüklenir (depo adı + boyut)", !!yuk.dosyaAdi && yuk.boyut === icerik.length && yuk.tur === "PDF", yuk);
  check("yüklenen dosya birebir indirilir", Buffer.compare(await net.download(yuk.dosyaAdi), icerik) === 0);
  await net.remove(yuk.dosyaAdi);
  let silindi = false; try { await net.download(yuk.dosyaAdi); } catch (e) { silindi = /404/.test(e.message); }
  check("silinen dosya indirilemez (404)", silindi);
  let reddedildi = false; try { await net.upload("virus.exe", Buffer.from("x")); } catch (e) { reddedildi = /desteklenmiyor/.test(e.message); }
  check("izin verilmeyen tür yüklenemez, Türkçe hata istemciye gelir", reddedildi);

  // ── Oturum yenileme, çıkış, kısıtlı kullanıcı ──
  const oncekiJeton = ayar().token;
  check("oturum yenilenir (GET /auth/me), jeton saklanır", (await ipc("server:refreshToken")) === true && !!ayar().token && typeof oncekiJeton === "string");
  check("çıkış: sunucuya bildirilir, jeton silinir, adres kalır", (await ipc("server:logout")) === true && !ayar().token && !!ayar().serverUrl);
  check("çıkış sunucu güvenlik günlüğüne düştü", dbmod.getSecurityLog({ limit: 20, action: "cikis" }).rows.some(r => r.actor === "admin"));
  const ikinci = await ipc("server:login", { serverUrl: adres, username: "okur", password: "okur1234" });
  check("bilinen sunucuya ikinci girişte yeniden güven sorulmaz", ikinci.ok === true && ikinci.tls === true, ikinci);
  const okurVeri = await ipc("crm:load");
  const yetkisiz = await ipc("crm:save", { ...okurVeri, customers: [...okurVeri.customers, { id: 3, name: "Yetkisiz" }], __dataVersion: okurVeri.dataVersion });
  check("müşteri ekleme izni olmayan kullanıcının kaydı → sebep 'yetki'", yetkisiz.ok === false && yetkisiz.sebep === "yetki", yetkisiz);
  check("yetkisiz kayıt veriyi değiştirmedi", !(await ipc("crm:load")).customers.some(c => c.name === "Yetkisiz"));
  check("admin olmayan kullanıcı kullanıcı listesini alamaz (403)", (await ipc("server:apiRequest", { method: "GET", path: "/api/users" })).status === 403);

  await server.stop();
  for (const d of [sunucuDizin, istemciDizin]) fs.rmSync(d, { recursive: true, force: true });
  // server-security.cjs ile aynı: Electron'da process.exit ertelenebilir, başarısızlıkta sentinel basılmaz.
  if (fail) { console.error(`${fail} kontrol BASARISIZ`); process.exit(1); return; }
  console.log("TUM KONTROLLER GECTI");
  process.exit(0);
})();
