const path = require("path");
const fs = require("fs");
const os = require("os");
const securityQueue = require("../securityQueue.cjs");
const securityStatus = require("../securityStatus.cjs");

const getErrorLogPath = (app) => path.join(app.getPath("userData"), "error-log.json");
const getSecurityQueuePath = (app) => path.join(app.getPath("userData"), "security-queue.json");
const getServerConfigPath = (app) => path.join(app.getPath("userData"), "server-config.json");

// Uygulama istemci modunda mı? (server-config.json mode === "client")
function isClientMode(app) {
  try {
    const p = getServerConfigPath(app);
    if (!fs.existsSync(p)) return false;
    return JSON.parse(fs.readFileSync(p, "utf-8"))?.mode === "client";
  } catch { return false; }
}

// Sunucu-config'teki kullanıcı adı (sunucu PC modunda admin adı). Yerel tek-kullanıcı
// modda config olmayabilir → null. App-lock kaydına "hangi kullanıcının makinesi" bilgisini
// eklemek için kullanılır (cihaz adı tek başına sunucuda anlamsız).
function serverUsername(app) {
  try {
    const p = getServerConfigPath(app);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf-8"))?.username || null;
  } catch { return null; }
}

// App-lock denemesini kaydeder. Yerel/sunucu PC'de (db aktif) doğrudan security_log'a,
// istemci PC'de (sunucuya giriş öncesi, token yok) yerel kuyruğa yazılır; kuyruk sunucuya
// giriş yapılınca (data.cjs) gönderilir. Kilit kapalıysa hiç çağrılmaz.
function kaydetAppLock(app, db, basarili, sebep) {
  const entry = {
    ts: new Date().toISOString(),
    actor: `Cihaz: ${os.hostname()}`,
    action: basarili ? "uygulama_kilidi_basarili" : "uygulama_kilidi_basarisiz",
    detail: sebep ? JSON.stringify({ sebep }) : null,
  };
  try {
    if (!isClientMode(app) && db?.isActive?.()) {
      // Sunucu PC/yerel: doğrudan yaz; kullanıcı adı config'ten (varsa) target'a.
      // İstemcide ise username sunucuya gönderimde (ingest) JWT'den eklenir.
      db.writeSecurityEntry({ ...entry, target: serverUsername(app) });
    } else {
      securityQueue.enqueue(getSecurityQueuePath(app), entry);
    }
  } catch (err) { console.error("app-lock güvenlik kaydı yazılamadı:", err); }
}

function readErrorLog(app) {
  try {
    const p = getErrorLogPath(app);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (err) {
    console.error("Hata günlüğü okunamadı:", err);
  }
  return [];
}

const pdfHtmlCache = new Map(); // previewWin.webContents.id → pdfHtml

function registerSystemHandlers(ipcMain, app, BrowserWindow, mailer, applock, db = null) {
  // ── Yazdırma: HTML'i GÖRÜNÜR önizleme penceresinde aç ──
  ipcMain.handle("app:printHtml", async (_e, html, pdfHtml, defaultName) => {
    return new Promise((resolve) => {
      let tmpFile = null;
      const previewPreload = path.join(__dirname, "..", "preload-preview.cjs");
      let previewWin = new BrowserWindow({
        width: 920,
        height: 1040,
        show: true,
        title: "Baskı Önizleme",
        autoHideMenuBar: true,
        webPreferences: { contextIsolation: true, nodeIntegration: false, preload: previewPreload },
      });
      previewWin.webContents.on("will-navigate", (e, url) => {
        if (!url.startsWith("file://")) e.preventDefault();
      });
      previewWin.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      const wcId = previewWin.webContents.id;
      const cleanup = () => {
        if (tmpFile) { try { fs.unlinkSync(tmpFile); } catch { /* yoksay */ } tmpFile = null; }
      };
      previewWin.on("closed", () => {
        pdfHtmlCache.delete(wcId);
        previewWin = null; cleanup(); resolve(true);
      });

      const safeName = JSON.stringify(defaultName || "belge.pdf");
      const toolbar = `
<script>window.__pdfDefaultName = ${safeName};</script>
<div id="__print_toolbar" style="position:fixed;top:0;left:0;right:0;height:52px;background:#1e293b;display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:0 18px;z-index:99999;box-shadow:0 2px 8px rgba(0,0,0,.2);font-family:Arial,sans-serif;">
  <span style="color:#94a3b8;font-size:13px;margin-right:auto;">Baskı Önizleme</span>
  <button onclick="window.previewPdf&&window.previewPdf.save(window.__pdfDefaultName)" style="background:#dc2626;color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:14px;font-weight:700;cursor:pointer;">PDF Kaydet</button>
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
        if (pdfHtml) pdfHtmlCache.set(previewWin.webContents.id, pdfHtml);
      } catch (err) {
        console.error("Yazdırma önizleme dosyası yazılamadı:", err);
        if (previewWin && !previewWin.isDestroyed()) previewWin.close();
        resolve(false); cleanup(); return;
      }
    });
  });

  // Önizleme penceresinden PDF kaydet — kaşeli HTML varsa şeffaf pencerede render eder
  ipcMain.handle("app:previewSavePdf", async (event, defaultName) => {
    const { dialog } = require("electron");
    const previewWin = BrowserWindow.fromWebContents(event.sender);
    if (!previewWin) return { ok: false };

    const { canceled, filePath } = await dialog.showSaveDialog(previewWin, {
      title: "PDF Olarak Kaydet",
      defaultPath: defaultName || "belge.pdf",
      filters: [{ name: "PDF Dosyası", extensions: ["pdf"] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };

    const pdfHtml = pdfHtmlCache.get(event.sender.id);
    let tmpFile = null;
    let pdfWin = null;
    try {
      if (pdfHtml) {
        // Kaşeli HTML → şeffaf görünür pencerede render et (GPU tam çalışır, kullanıcı görmez)
        tmpFile = path.join(app.getPath("temp"), `altunmak-pdf-${Date.now()}.html`);
        fs.writeFileSync(tmpFile, pdfHtml, "utf-8");
        pdfWin = new BrowserWindow({
          width: 1240, height: 1754,
          show: true, frame: false, skipTaskbar: true,
          webPreferences: { contextIsolation: true, nodeIntegration: false },
        });
        pdfWin.setOpacity(0);
        await pdfWin.loadFile(tmpFile);
        const pdfData = await pdfWin.webContents.printToPDF({ printBackground: true, pageSize: "A4", margins: { top: 0, bottom: 0, left: 0, right: 0 } });
        fs.writeFileSync(filePath, pdfData);
      } else {
        // Kaşe yoksa önizleme penceresinin kendisini kullan
        const pdfData = await previewWin.webContents.printToPDF({ printBackground: true, pageSize: "A4", margins: { top: 0, bottom: 0, left: 0, right: 0 } });
        fs.writeFileSync(filePath, pdfData);
      }
      pdfHtmlCache.delete(event.sender.id);
      previewWin.close();
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
  ipcMain.handle("mail:getConfigForBackup", () => mailer.getConfigForBackup());
  ipcMain.handle("mail:restoreConfigFromBackup", (_e, config) => mailer.restoreConfigFromBackup(config));
  ipcMain.handle("mail:getAllLog", () => mailer.getAllLog());
  ipcMain.handle("mail:restoreFullLog", (_e, log) => mailer.restoreFullLog(log));

  // ── Uygulama şifresi (açılış kilidi) ──
  ipcMain.handle("applock:status", () => applock.getStatus());
  ipcMain.handle("applock:setup", (_e, password) => applock.setup(password));
  ipcMain.handle("applock:verify", (_e, password) => {
    const enabledOnce = applock.getStatus()?.enabled;
    const result = applock.verify(password);
    // Sadece kilit açıkken ve gerçek bir deneme yapıldıysa kaydet (boş şifre gönderimini atla)
    if (enabledOnce && password) {
      if (result?.ok) kaydetAppLock(app, db, true, null);
      else if (result?.retryAfterMs && /kilit|bekleyin|deneme/i.test(result?.error || "")) kaydetAppLock(app, db, false, "Hesap kilitli (çok fazla deneme)");
      else kaydetAppLock(app, db, false, "Yanlış şifre");
    }
    return result;
  });
  ipcMain.handle("applock:disable", (_e, password) => applock.disable(password));
  ipcMain.handle("applock:changePassword", (_e, currentPassword, newPassword) => applock.changePassword(currentPassword, newPassword));
  ipcMain.handle("applock:resetWithRecoveryCode", (_e, recoveryCode, newPassword) => applock.resetWithRecoveryCode(recoveryCode, newPassword));
  ipcMain.handle("applock:getDataForBackup", () => applock.getDataForBackup());
  ipcMain.handle("applock:restoreFromBackup", (_e, data) => applock.restoreFromBackup(data));
  ipcMain.handle("applock:setLockOnClose", (_e, val) => applock.setLockOnClose(val));

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

  // ── Güvenlik Durumu: disk şifreleme (BitLocker/FileVault) tespiti (sadece okur, açmaz) ──
  ipcMain.handle("security:diskEncryption", () => securityStatus.checkDiskEncryption());
  // ── Güvenlik Durumu: veritabanı at-rest şifreleme durumu ──
  ipcMain.handle("security:dbEncryption", () => (db ? db.dbEncryptionStatus() : { encrypted: false, canEncrypt: false }));

  ipcMain.handle("app:getOpenAtLogin", () => {
    if (!app.isPackaged) return { openAtLogin: false, devMode: true };
    return { openAtLogin: app.getLoginItemSettings({ args: ["--hidden"] }).openAtLogin };
  });
  ipcMain.handle("app:setOpenAtLogin", (_e, val) => {
    if (!app.isPackaged) return { ok: false, devMode: true };
    app.setLoginItemSettings({ openAtLogin: !!val, args: val ? ["--hidden"] : [] });
    return { ok: true };
  });
}

module.exports = { registerSystemHandlers };
