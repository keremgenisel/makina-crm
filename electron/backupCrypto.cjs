// Yedek şifreleme: parola korumalı yedek dosyaları. Yedek düz JSON olduğundan sızarsa tüm
// müşteri/finans verisi okunabiliyordu; şifreli yedek parolasız açılamaz.
// AES-256-GCM (gizlilik + bütünlük), parola scrypt ile 256-bit anahtara türetilir (rastgele salt).
// Dosya, düz JSON yedekten `format` alanıyla ayrılır — geri yükleme şifreli olduğunu anlar.
const crypto = require("crypto");

const MARKER = "altunmak-crm-encrypted";

// obj → şifreli zarf nesnesi (JSON olarak diske yazılır). password boşsa hata.
function encryptBackup(obj, password) {
  if (!password) throw new Error("Parola gerekli");
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(password), salt, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), "utf-8");
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    format: MARKER, v: 1,
    salt: salt.toString("base64"), iv: iv.toString("base64"),
    tag: tag.toString("base64"), data: enc.toString("base64"),
  };
}

// Parse edilmiş bir yedek şifreli zarf mı?
function isEncryptedBackup(parsed) {
  return !!parsed && parsed.format === MARKER && typeof parsed.data === "string";
}

// Şifreli zarf + parola → orijinal nesne. Yanlış parola/bozuk dosyada GCM doğrulaması
// başarısız olur ve final() throw eder (çağıran yakalayıp "parola yanlış" gösterir).
function decryptBackup(env, password) {
  if (!isEncryptedBackup(env)) throw new Error("Şifreli yedek değil");
  if (!password) throw new Error("Parola gerekli");
  const salt = Buffer.from(env.salt, "base64");
  const key = crypto.scryptSync(String(password), salt, 32);
  const iv = Buffer.from(env.iv, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(Buffer.from(env.tag, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(env.data, "base64")), decipher.final()]);
  return JSON.parse(dec.toString("utf-8"));
}

module.exports = { encryptBackup, decryptBackup, isEncryptedBackup, MARKER };
