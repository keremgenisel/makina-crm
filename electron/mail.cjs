// ── E-posta gönderimi (genel SMTP — sunucu/port Ayarlar'dan girilir, sağlayıcıya özel sabit yok) ──
// Kimlik bilgisi (şifre) renderer'a hiç gönderilmez, safeStorage ile şifrelenmiş olarak
// ayrı bir dosyada (smtp-config.json) saklanır — crm:save/data.json/data.db akışının tamamen dışında.
// Sunucu/port/güvenlik bilgisi sır değil, aynı dosyada düz metin saklanır.
const { app, BrowserWindow, safeStorage } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch (e) {
  console.error("nodemailer yüklü değil:", e);
}

const getConfigPath = () => path.join(app.getPath("userData"), "smtp-config.json");
// Gönderilen e-postaların düz kaydı — crm:save akışının dışında, ayrı bir sidecar dosyada.
// Ayarlar'daki "Gönderilen E-postalar" listesi buradan okur (mail:getLog).
const getEmailLogPath = () => path.join(app.getPath("userData"), "email-log.json");

// Çöp Kutusu: src/lib/utils.js'deki purgeOldTrash ile aynı mantık (30 gün), ama bu dosya
// renderer'ın ES module'lerini require edemediği için burada ayrıca tutuluyor.
const EMAIL_LOG_RETENTION_DAYS = 30;
const purgeOldEmailLogTrash = (log) => {
  const cutoff = Date.now() - EMAIL_LOG_RETENTION_DAYS * 86400000;
  return log.filter(e => !e.deletedAt || new Date(e.deletedAt).getTime() >= cutoff);
};

function writeEmailLog(log) {
  fs.writeFileSync(getEmailLogPath(), JSON.stringify(log.slice(-200), null, 2), "utf-8");
}

function readEmailLog() {
  try {
    const p = getEmailLogPath();
    if (!fs.existsSync(p)) return [];
    const log = JSON.parse(fs.readFileSync(p, "utf-8"));
    // id alanı eklenmeden önce kaydedilmiş eski kayıtlara geriye dönük id atanır — Sil butonu
    // bir id'ye bağlı çalıştığı için, id'siz eski kayıtlar silinemez kalmasın.
    let backfilled = false;
    const withIds = log.map(e => {
      if (e.id) return e;
      backfilled = true;
      return { ...e, id: crypto.randomUUID() };
    });
    const purged = purgeOldEmailLogTrash(withIds);
    if (backfilled || purged.length !== log.length) writeEmailLog(purged);
    return purged;
  } catch (err) {
    console.error("E-posta günlüğü okunamadı:", err);
  }
  return [];
}

function appendEmailLog(entry) {
  try {
    const log = readEmailLog();
    log.push({ id: crypto.randomUUID(), ...entry });
    writeEmailLog(log);
  } catch (err) {
    console.error("E-posta günlüğüne yazılamadı:", err);
  }
}

// Gönderilen E-postalar listesi: silinmemiş kayıtlar
function getSentLog() {
  return readEmailLog().filter(e => !e.deletedAt);
}

// E-posta Çöp Kutusu: silinmiş (henüz kalıcı silinmemiş) kayıtlar
function getDeletedLog() {
  return readEmailLog().filter(e => e.deletedAt);
}

function deleteLogEntry(id) {
  writeEmailLog(readEmailLog().map(e => (e.id === id ? { ...e, deletedAt: new Date().toISOString() } : e)));
  return { ok: true };
}

function restoreLogEntry(id) {
  writeEmailLog(readEmailLog().map(e => (e.id === id ? { ...e, deletedAt: null } : e)));
  return { ok: true };
}

function purgeLogEntry(id) {
  writeEmailLog(readEmailLog().filter(e => e.id !== id));
  return { ok: true };
}

function readConfig() {
  try {
    const p = getConfigPath();
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (err) {
    console.error("E-posta ayarları okunamadı:", err);
  }
  return null;
}

function saveCredentials({ email, appPassword, host, port, secure }) {
  if (!email || !appPassword) return { ok: false, error: "E-posta ve şifre gerekli." };
  if (!host) return { ok: false, error: "SMTP sunucu adresi gerekli." };
  if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: "Bu bilgisayarda güvenli depolama kullanılamıyor." };
  try {
    const encrypted = safeStorage.encryptString(appPassword).toString("base64");
    fs.writeFileSync(getConfigPath(), JSON.stringify({
      email, encryptedPassword: encrypted, host, port: Number(port) || 465, secure: secure !== false,
    }), "utf-8");
    return { ok: true };
  } catch (err) {
    console.error("E-posta ayarları kaydedilemedi:", err);
    return { ok: false, error: "Kaydedilemedi: " + (err?.message || "bilinmeyen hata") };
  }
}

function getCredentialsStatus() {
  const cfg = readConfig();
  return {
    configured: !!(cfg && cfg.email && cfg.encryptedPassword && cfg.host),
    email: cfg?.email || "", host: cfg?.host || "", port: cfg?.port || 465, secure: cfg?.secure !== false,
  };
}

function clearCredentials() {
  try {
    const p = getConfigPath();
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || "Kaldırılamadı" };
  }
}

function getDecryptedCredentials() {
  const cfg = readConfig();
  if (!cfg || !cfg.email || !cfg.encryptedPassword || !cfg.host) return null;
  try {
    const appPassword = safeStorage.decryptString(Buffer.from(cfg.encryptedPassword, "base64"));
    return { email: cfg.email, appPassword, host: cfg.host, port: cfg.port || 465, secure: cfg.secure !== false };
  } catch (err) {
    console.error("E-posta parolası çözülemedi:", err);
    return null;
  }
}

function createTransporter(creds) {
  return nodemailer.createTransport({
    host: creds.host,
    port: creds.port,
    secure: creds.secure,
    auth: { user: creds.email, pass: creds.appPassword },
  });
}

async function testConnection() {
  if (!nodemailer) return { ok: false, error: "nodemailer yüklü değil." };
  const creds = getDecryptedCredentials();
  if (!creds) return { ok: false, error: "Önce e-posta hesabı bağlanmalı." };
  try {
    await createTransporter(creds).verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || "Bağlantı doğrulanamadı." };
  }
}

// HTML'i, görünmeyen bir pencerede yükleyip PDF'e çevirir (e-posta eki için).
async function htmlToPdfBuffer(html) {
  let win = null;
  let tmpFile = null;
  try {
    win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false } });
    tmpFile = path.join(app.getPath("temp"), `altunmak-eposta-pdf-${Date.now()}.html`);
    fs.writeFileSync(tmpFile, html, "utf-8");
    await win.loadFile(tmpFile);
    return await win.webContents.printToPDF({ printBackground: true, pageSize: "A4" });
  } finally {
    if (tmpFile) { try { fs.unlinkSync(tmpFile); } catch { /* yoksay */ } }
    if (win && !win.isDestroyed()) win.destroy();
  }
}

async function sendMail({ to, subject, text, pdfHtml, pdfFileName, attachments: rawAttachments }) {
  if (!nodemailer) return { ok: false, error: "nodemailer yüklü değil." };
  const creds = getDecryptedCredentials();
  if (!creds) return { ok: false, error: "Önce Ayarlar'dan e-posta hesabı bağlanmalı." };
  if (!to) return { ok: false, error: "Alıcı e-posta adresi yok." };
  const attachments = [];
  try {
    if (pdfHtml) {
      const pdf = await htmlToPdfBuffer(pdfHtml);
      attachments.push({ filename: pdfFileName || "rapor.pdf", content: pdf, contentType: "application/pdf" });
    }
    // Renderer'dan hazır içerik (CSV/XLSX dışa aktarımları, bayi e-postasındaki manuel dosya eki) — base64 olarak gelir
    (rawAttachments || []).forEach((a) => {
      if (a?.contentBase64) {
        attachments.push({ filename: a.filename || "ek", content: Buffer.from(a.contentBase64, "base64"), contentType: a.mimeType || "application/octet-stream" });
      }
    });
    // Log'a sadece dosya adı/türü yazılır — ek içeriği (PDF/base64) tekrar diske gömülmez.
    const attachmentMeta = attachments.map(a => ({ filename: a.filename, mimeType: a.contentType }));
    await createTransporter(creds).sendMail({ from: creds.email, to, subject, text, attachments });
    appendEmailLog({ to, subject, text: text || "", attachments: attachmentMeta, success: true, timestamp: new Date().toISOString() });
    return { ok: true };
  } catch (err) {
    console.error("E-posta gönderilemedi:", err);
    const attachmentMeta = attachments.map(a => ({ filename: a.filename, mimeType: a.contentType }));
    appendEmailLog({ to, subject, text: text || "", attachments: attachmentMeta, success: false, error: err?.message || "Gönderilemedi.", timestamp: new Date().toISOString() });
    return { ok: false, error: err?.message || "Gönderilemedi." };
  }
}

module.exports = { saveCredentials, getCredentialsStatus, clearCredentials, testConnection, sendMail, getSentLog, getDeletedLog, deleteLogEntry, restoreLogEntry, purgeLogEntry };
