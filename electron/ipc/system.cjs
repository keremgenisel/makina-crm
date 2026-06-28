const path = require("path");
const fs = require("fs");

const getErrorLogPath = (app) => path.join(app.getPath("userData"), "error-log.json");

function readErrorLog(app) {
  try {
    const p = getErrorLogPath(app);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (err) {
    console.error("Hata günlüğü okunamadı:", err);
  }
  return [];
}

function registerSystemHandlers(ipcMain, app, BrowserWindow, mailer, applock) {
  // ── Yazdırma: HTML'i GÖRÜNÜR önizleme penceresinde aç ──
  ipcMain.handle("app:printHtml", async (_e, html) => {
    return new Promise((resolve) => {
      let tmpFile = null;
      let previewWin = new BrowserWindow({
        width: 920,
        height: 1040,
        show: true,
        title: "Baskı Önizleme",
        autoHideMenuBar: true,
        webPreferences: { contextIsolation: true, nodeIntegration: false },
      });
      previewWin.webContents.on("will-navigate", (e, url) => {
        if (!url.startsWith("file://")) e.preventDefault();
      });
      previewWin.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      const cleanup = () => {
        if (tmpFile) { try { fs.unlinkSync(tmpFile); } catch { /* yoksay */ } tmpFile = null; }
      };
      previewWin.on("closed", () => { previewWin = null; cleanup(); resolve(true); });

      const toolbar = `
<div id="__print_toolbar" style="position:fixed;top:0;left:0;right:0;height:52px;background:#1e293b;display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:0 18px;z-index:99999;box-shadow:0 2px 8px rgba(0,0,0,.2);font-family:Arial,sans-serif;">
  <span style="color:#94a3b8;font-size:13px;margin-right:auto;">Baskı Önizleme — yazdırmak için sağdaki butona basın</span>
  <button onclick="window.print()" style="background:#e85d1a;color:#fff;border:none;border-radius:8px;padding:9px 20px;font-size:14px;font-weight:700;cursor:pointer;">🖨 Yazdır</button>
  <button onclick="window.close()" style="background:#475569;color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:14px;font-weight:600;cursor:pointer;">Kapat</button>
</div>
<style>
  @media screen { body { margin-top:52px !important; } }
  @media print { #__print_toolbar { display:none !important; } body { margin-top:0 !important; } }
</style>`;
      let finalHtml = html;
      if (finalHtml.includes("<body")) {
        finalHtml = finalHtml.replace(/(<body[^>]*>)/i, `$1${toolbar}`);
      } else {
        finalHtml = toolbar + finalHtml;
      }

      try {
        tmpFile = path.join(app.getPath("temp"), `altunmak-yazdir-${Date.now()}.html`);
        fs.writeFileSync(tmpFile, finalHtml, "utf-8");
        previewWin.loadFile(tmpFile);
      } catch (err) {
        console.error("Yazdırma önizleme dosyası yazılamadı:", err);
        if (previewWin && !previewWin.isDestroyed()) previewWin.close();
        resolve(false); cleanup(); return;
      }
    });
  });

  // ── PDF Kaydet ──
  ipcMain.handle("app:savePdf", async (_e, html, defaultName) => {
    const { dialog } = require("electron");
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "PDF Olarak Kaydet",
      defaultPath: defaultName || "belge.pdf",
      filters: [{ name: "PDF Dosyası", extensions: ["pdf"] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };

    let tmpFile = null;
    let pdfWin = null;
    try {
      tmpFile = path.join(app.getPath("temp"), `altunmak-pdf-${Date.now()}.html`);
      fs.writeFileSync(tmpFile, html, "utf-8");
      pdfWin = new BrowserWindow({
        show: false,
        webPreferences: { contextIsolation: true, nodeIntegration: false },
      });
      await pdfWin.loadFile(tmpFile);
      const pdfData = await pdfWin.webContents.printToPDF({
        printBackground: true,
        pageSize: "A4",
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });
      fs.writeFileSync(filePath, pdfData);
      return { ok: true, filePath };
    } catch (err) {
      console.error("PDF kaydetme hatası:", err);
      return { ok: false, error: err?.message };
    } finally {
      if (pdfWin && !pdfWin.isDestroyed()) pdfWin.close();
      if (tmpFile) { try { fs.unlinkSync(tmpFile); } catch { /* yoksay */ } }
    }
  });

  // ── E-posta (genel SMTP) ──
  ipcMain.handle("mail:saveCredentials", (_e, payload) => mailer.saveCredentials(payload));
  ipcMain.handle("mail:credentialsStatus", () => mailer.getCredentialsStatus());
  ipcMain.handle("mail:clearCredentials", () => mailer.clearCredentials());
  ipcMain.handle("mail:test", () => mailer.testConnection());
  ipcMain.handle("mail:send", (_e, payload) => mailer.sendMail(payload));
  ipcMain.handle("mail:getLog", () => mailer.getSentLog());
  ipcMain.handle("mail:getDeletedLog", () => mailer.getDeletedLog());
  ipcMain.handle("mail:deleteLogEntry", (_e, id) => mailer.deleteLogEntry(id));
  ipcMain.handle("mail:restoreLogEntry", (_e, id) => mailer.restoreLogEntry(id));
  ipcMain.handle("mail:purgeLogEntry", (_e, id) => mailer.purgeLogEntry(id));

  // ── Uygulama şifresi (açılış kilidi) ──
  ipcMain.handle("applock:status", () => applock.getStatus());
  ipcMain.handle("applock:setup", (_e, password) => applock.setup(password));
  ipcMain.handle("applock:verify", (_e, password) => applock.verify(password));
  ipcMain.handle("applock:disable", (_e, password) => applock.disable(password));
  ipcMain.handle("applock:changePassword", (_e, currentPassword, newPassword) => applock.changePassword(currentPassword, newPassword));
  ipcMain.handle("applock:resetWithRecoveryCode", (_e, recoveryCode, newPassword) => applock.resetWithRecoveryCode(recoveryCode, newPassword));

  // ── Hata günlüğü ──
  ipcMain.handle("error:log", (_e, entry) => {
    try {
      const log = readErrorLog(app);
      log.push(entry);
      fs.writeFileSync(getErrorLogPath(app), JSON.stringify(log.slice(-20), null, 2), "utf-8");
      return { ok: true };
    } catch (err) {
      console.error("Hata günlüğüne yazılamadı:", err);
      return { ok: false, error: err?.message || "bilinmeyen hata" };
    }
  });
  ipcMain.handle("error:readLog", () => readErrorLog(app));
}

module.exports = { registerSystemHandlers };
