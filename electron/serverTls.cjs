// Sunucu TLS sertifikası: LAN/Tailscale istemcileri sunucuya HTTPS ile bağlanabilsin diye
// self-signed bir sertifika üretir ve saklar. Halka açık bir CA gerektirmez; istemci güveni
// sertifika sabitleme (pinning) ile sağlanır (bkz. electron/pinnedFetch.cjs). Bu yüzden
// SAN'daki IP'ler yalnız kozmetiktir, güven parmak izine (fp) dayanır.
//
// Özel anahtar, jwtSecret ile aynı desende OS anahtarlığında (safeStorage: DPAPI/Keychain)
// şifreli tutulur; kullanılamıyorsa 0600 izinli düz dosyaya düşülür. Sertifika (PEM) gizli
// değildir, düz saklanır.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const selfsigned = require("selfsigned");

function certPath(app)     { return path.join(app.getPath("userData"), "tls-cert.pem"); }
function keyEncPath(app)   { return path.join(app.getPath("userData"), "tls-key.enc"); }
function keyPlainPath(app) { return path.join(app.getPath("userData"), "tls-key.pem"); }

// Sertifikanın SHA-256 parmak izi ("AB:CD:..."). TLS peer cert'in fingerprint256'sıyla
// birebir aynı biçim — istemci pinning bu değeri karşılaştırır.
function fingerprintOf(certPem) {
  return new crypto.X509Certificate(certPem).fingerprint256;
}

function localIps() {
  const ips = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === "IPv4" && !iface.internal) ips.push(iface.address);
    }
  }
  return ips;
}

// selfsigned v5 generate() bir Promise döndürür → async.
async function uret() {
  const attrs = [{ name: "commonName", value: "Altunmak CRM Server" }];
  const altNames = [
    { type: 2, value: "localhost" },
    { type: 7, ip: "127.0.0.1" },
    ...localIps().map((ip) => ({ type: 7, ip })),
  ];
  const pems = await selfsigned.generate(attrs, {
    keySize: 2048,
    days: 3650, // 10 yıl — pin fp bazlı olduğu için süre kritik değil
    algorithm: "sha256",
    extensions: [{ name: "subjectAltName", altNames }],
  });
  return { key: pems.private, cert: pems.cert };
}

function anahtarKaydet(app, keyPem) {
  try {
    const { safeStorage } = require("electron");
    if (safeStorage?.isEncryptionAvailable?.()) {
      fs.writeFileSync(keyEncPath(app), safeStorage.encryptString(keyPem));
      try { fs.rmSync(keyPlainPath(app), { force: true }); } catch { /* yoktu */ }
      return;
    }
  } catch { /* safeStorage yok — düz dosyaya düş */ }
  fs.writeFileSync(keyPlainPath(app), keyPem, { mode: 0o600 });
}

function anahtarYukle(app) {
  try {
    const { safeStorage } = require("electron");
    const p = keyEncPath(app);
    if (safeStorage?.isEncryptionAvailable?.() && fs.existsSync(p)) {
      return safeStorage.decryptString(fs.readFileSync(p));
    }
  } catch { /* çözülemedi — düz dosyayı dene */ }
  try { const p = keyPlainPath(app); if (fs.existsSync(p)) return fs.readFileSync(p, "utf-8"); } catch { /* yok */ }
  return null;
}

// Var olan sertifikayı yükle; yoksa üret ve sakla. { key, cert, fp } döndürür (async).
async function sertifikaUretVeyaYukle(app) {
  let cert = null;
  try { if (fs.existsSync(certPath(app))) cert = fs.readFileSync(certPath(app), "utf-8"); } catch { /* bozuk → yeniden üret */ }
  let key = anahtarYukle(app);
  if (!cert || !key) {
    const g = await uret();
    cert = g.cert; key = g.key;
    try { fs.writeFileSync(certPath(app), cert); anahtarKaydet(app, key); }
    catch (e) { console.error("[tls] sertifika kaydedilemedi:", e.message); }
  }
  return { key, cert, fp: fingerprintOf(cert) };
}

// Sertifikayı sil ve yeniden üret (parmak izi değişir; istemciler yeniden güven ister).
async function yenile(app) {
  for (const p of [certPath(app), keyEncPath(app), keyPlainPath(app)]) {
    try { fs.rmSync(p, { force: true }); } catch { /* yoktu */ }
  }
  return sertifikaUretVeyaYukle(app);
}

module.exports = { sertifikaUretVeyaYukle, yenile, fingerprintOf };
