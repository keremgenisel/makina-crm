// ── Uygulama açılış kilidi (isteğe bağlı, Ayarlar'dan açılır/kapatılır) ──
// Bu sadece caydırıcı bir yerel kilit — gerçek bir güvenlik sınırı değil (veri zaten diskte
// düz/SQLite olarak duruyor). Şifre ve kurtarma kodu geri döndürülemez şekilde (scrypt ile)
// hash'lenip ayrı bir dosyada (app-lock.json) saklanır — crm:save/data.json/data.db akışının
// tamamen dışında, smtp-config.json ile aynı mantık. safeStorage kasıtlı olarak kullanılmıyor:
// orada (mail.cjs) şifre SMTP girişi için geri çözülebilir olmak zorunda; burada sadece
// doğrulama yeterli, tek yönlü hash daha güvenli ve safeStorage.isEncryptionAvailable()
// bağımlılığından bağımsız.
const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const getConfigPath = () => path.join(app.getPath("userData"), "app-lock.json");

function readConfig() {
  try {
    const p = getConfigPath();
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (err) {
    console.error("Uygulama şifresi ayarları okunamadı:", err);
  }
  return null;
}

function writeConfig(cfg) {
  fs.writeFileSync(getConfigPath(), JSON.stringify(cfg), "utf-8");
}

const hash = (value, salt) => crypto.scryptSync(value, salt, 64).toString("hex");
const newSalt = () => crypto.randomBytes(16).toString("hex");
// Hex hash'leri sabit-zamanlı karşılaştır (zamanlama sızıntısını önle; yerel için önemsiz ama temiz).
const hashEsit = (a, b) => {
  const ba = Buffer.from(String(a), "hex"), bb = Buffer.from(String(b), "hex");
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

// Yanlış deneme sayısına göre artan bekleme süresi (ms). 4 haneli kısa PIN'e karşı otomatik
// brute-force'u yavaşlatır; ilk birkaç deneme serbest, sonra kademeli artar. Durum app-lock.json'a
// yazıldığı için uygulamayı kapatıp açmak (restart) sayaç sıfırlanamaz.
function lockoutMs(failCount) {
  if (failCount < 3) return 0;          // ilk 2 yanlış: gecikme yok
  if (failCount < 5) return 5 * 1000;   // 3-4: 5 sn
  if (failCount < 7) return 30 * 1000;  // 5-6: 30 sn
  if (failCount < 10) return 2 * 60 * 1000; // 7-9: 2 dk
  return 5 * 60 * 1000;                 // 10+: 5 dk
}
const genRecoveryCode = () => {
  const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
};

function getStatus() {
  const cfg = readConfig();
  return { enabled: !!cfg?.enabled, lockOnClose: cfg?.lockOnClose !== false };
}

function setLockOnClose(val) {
  const cfg = readConfig();
  if (!cfg?.enabled) return { ok: false, error: "Kilit etkin değil." };
  writeConfig({ ...cfg, lockOnClose: !!val });
  return { ok: true };
}

function setup(password) {
  if (!password || password.length < 4) return { ok: false, error: "Şifre en az 4 karakter olmalı." };
  const passwordSalt = newSalt();
  const recoverySalt = newSalt();
  const recoveryCode = genRecoveryCode();
  writeConfig({
    enabled: true,
    passwordHash: hash(password, passwordSalt), passwordSalt,
    recoveryHash: hash(recoveryCode, recoverySalt), recoverySalt,
  });
  return { ok: true, recoveryCode };
}

function verify(password) {
  const cfg = readConfig();
  if (!cfg?.enabled) return { ok: true }; // kilit kapalıysa her zaman geçer
  const now = Date.now();
  // Kilit süresi doluysa hash bile hesaplamadan reddet
  if (cfg.lockedUntil && cfg.lockedUntil > now) {
    return { ok: false, error: "Çok fazla yanlış deneme. Lütfen bekleyin.", retryAfterMs: cfg.lockedUntil - now };
  }
  if (!password) return { ok: false, error: "Şifre girilmedi." };
  const ok = hashEsit(hash(password, cfg.passwordSalt), cfg.passwordHash);
  if (ok) {
    if (cfg.failCount || cfg.lockedUntil) writeConfig({ ...cfg, failCount: 0, lockedUntil: 0 });
    return { ok: true };
  }
  const fails = (cfg.failCount || 0) + 1;
  const wait = lockoutMs(fails);
  writeConfig({ ...cfg, failCount: fails, lockedUntil: wait > 0 ? now + wait : 0 });
  return { ok: false, error: "Şifre yanlış.", retryAfterMs: wait };
}

function disable(password) {
  const cfg = readConfig();
  if (!cfg?.enabled) return { ok: true };
  const v = verify(password);
  if (!v.ok) return v;
  writeConfig({ ...cfg, enabled: false });
  return { ok: true };
}

function changePassword(currentPassword, newPassword) {
  const cfg = readConfig();
  if (!cfg?.enabled) return { ok: false, error: "Kilit etkin değil." };
  const v = verify(currentPassword);
  if (!v.ok) return v;
  if (!newPassword || newPassword.length < 4) return { ok: false, error: "Yeni şifre en az 4 karakter olmalı." };
  if (hashEsit(hash(newPassword, cfg.passwordSalt), cfg.passwordHash)) return { ok: false, error: "Yeni şifre eski şifreyle aynı olamaz." };
  const passwordSalt = newSalt();
  writeConfig({ ...cfg, passwordHash: hash(newPassword, passwordSalt), passwordSalt });
  return { ok: true };
}

function resetWithRecoveryCode(recoveryCode, newPassword) {
  const cfg = readConfig();
  if (!cfg?.enabled) return { ok: false, error: "Kilit etkin değil." };
  if (!recoveryCode) return { ok: false, error: "Kurtarma kodu girilmedi." };
  const codeOk = hashEsit(hash(recoveryCode.trim().toUpperCase(), cfg.recoverySalt), cfg.recoveryHash);
  if (!codeOk) return { ok: false, error: "Kurtarma kodu yanlış." };
  if (!newPassword || newPassword.length < 4) return { ok: false, error: "Yeni şifre en az 4 karakter olmalı." };
  if (hashEsit(hash(newPassword, cfg.passwordSalt), cfg.passwordHash)) return { ok: false, error: "Yeni şifre eski şifreyle aynı olamaz." };
  const passwordSalt = newSalt();
  const recoverySalt = newSalt();
  const newRecoveryCode = genRecoveryCode();
  writeConfig({
    enabled: true,
    passwordHash: hash(newPassword, passwordSalt), passwordSalt,
    recoveryHash: hash(newRecoveryCode, recoverySalt), recoverySalt,
  });
  return { ok: true, recoveryCode: newRecoveryCode };
}

// Yedek desteği: hash+salt makineye özgü değil (scrypt), farklı makinede de çalışır.
function getDataForBackup() {
  return readConfig();
}

function restoreFromBackup(data) {
  if (!data || typeof data !== "object") return { ok: false, error: "Geçersiz kilit verisi." };
  try {
    writeConfig(data);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

module.exports = { getStatus, setup, verify, disable, changePassword, resetWithRecoveryCode, getDataForBackup, restoreFromBackup, setLockOnClose, lockoutMs };
