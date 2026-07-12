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
  const tag = Buffer.from(env.tag, "base64");
  // Auth tag tam 16 bayt olmalı. Aksi halde saldırgan hazırladığı yedekte kısa
  // (ör. 4 baytlık) bir GCM tag'i vererek doğrulama gücünü 2^128'den 2^32'ye
  // düşürebilir; authTagLength'i sabitleyip uzunluğu burada da doğruluyoruz.
  if (tag.length !== 16) throw new Error("Geçersiz kimlik doğrulama etiketi");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(Buffer.from(env.data, "base64")), decipher.final()]);
  return JSON.parse(dec.toString("utf-8"));
}

// ── Binary dosya şifreleme (yedekteki -dosyalar klasörü için) ────────────────────
// JSON değil ham dosya baytları için; kendi başına yeterli tek Buffer üretir:
// [MAGIC | salt(16) | iv(12) | tag(16) | şifreli]. Aynı AES-256-GCM + scrypt şeması.
// Böylece şifreli yedekte veri gibi belgeler/resimler de parolasız açılamaz.
const FILE_MAGIC = Buffer.from("ACRENC1\0", "utf-8"); // Altunmak CRM ENCrypted file v1

function encryptFileBuffer(buffer, password) {
  if (!password) throw new Error("Parola gerekli");
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(password), salt, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([FILE_MAGIC, salt, iv, tag, enc]);
}

function isEncryptedFileBuffer(buf) {
  return Buffer.isBuffer(buf) && buf.length >= FILE_MAGIC.length && buf.subarray(0, FILE_MAGIC.length).equals(FILE_MAGIC);
}

function decryptFileBuffer(buf, password) {
  if (!isEncryptedFileBuffer(buf)) throw new Error("Şifreli dosya değil");
  if (!password) throw new Error("Parola gerekli");
  let o = FILE_MAGIC.length;
  const salt = buf.subarray(o, o += 16);
  const iv = buf.subarray(o, o += 12);
  const tag = buf.subarray(o, o += 16);
  const ct = buf.subarray(o);
  // Tag tam 16 bayt olmalı; kısa tag (zayıf GCM doğrulaması) veya baştan
  // budanmış/bozuk dosya reddedilir.
  if (tag.length !== 16) throw new Error("Bozuk şifreli dosya");
  const key = crypto.scryptSync(String(password), salt, 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

module.exports = { encryptBackup, decryptBackup, isEncryptedBackup, MARKER, encryptFileBuffer, decryptFileBuffer, isEncryptedFileBuffer };
