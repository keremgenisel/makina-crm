// ── E-posta gönderimi (Yandex SMTP) ──
// Kimlik bilgisi (uygulama parolası) renderer'a hiç gönderilmez, safeStorage ile şifrelenmiş olarak
// ayrı bir dosyada (smtp-config.json) saklanır — crm:save/data.json/data.db akışının tamamen dışında.
const { app, BrowserWindow, safeStorage } = require("electron");
const path = require("path");
const fs = require("fs");
let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch (e) {
  console.error("nodemailer yüklü değil:", e);
}

const getConfigPath = () => path.join(app.getPath("userData"), "smtp-config.json");

function readConfig() {
  try {
    const p = getConfigPath();
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (err) {
    console.error("E-posta ayarları okunamadı:", err);
  }
  return null;
}

function saveCredentials({ email, appPassword }) {
  if (!email || !appPassword) return { ok: false, error: "E-posta ve uygulama parolası gerekli." };
  if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: "Bu bilgisayarda güvenli depolama kullanılamıyor." };
  try {
    const encrypted = safeStorage.encryptString(appPassword).toString("base64");
    fs.writeFileSync(getConfigPath(), JSON.stringify({ email, encryptedPassword: encrypted }), "utf-8");
    return { ok: true };
  } catch (err) {
    console.error("E-posta ayarları kaydedilemedi:", err);
    return { ok: false, error: "Kaydedilemedi: " + (err?.message || "bilinmeyen hata") };
  }
}

function getCredentialsStatus() {
  const cfg = readConfig();
  return { configured: !!(cfg && cfg.email && cfg.encryptedPassword), email: cfg?.email || "" };
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
  if (!cfg || !cfg.email || !cfg.encryptedPassword) return null;
  try {
    const appPassword = safeStorage.decryptString(Buffer.from(cfg.encryptedPassword, "base64"));
    return { email: cfg.email, appPassword };
  } catch (err) {
    console.error("E-posta parolası çözülemedi:", err);
    return null;
  }
}

function createTransporter(creds) {
  return nodemailer.createTransport({
    host: "smtp.yandex.com",
    port: 465,
    secure: true,
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
  try {
    const attachments = [];
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
    await createTransporter(creds).sendMail({ from: creds.email, to, subject, text, attachments });
    return { ok: true };
  } catch (err) {
    console.error("E-posta gönderilemedi:", err);
    return { ok: false, error: err?.message || "Gönderilemedi." };
  }
}

module.exports = { saveCredentials, getCredentialsStatus, clearCredentials, testConnection, sendMail };
