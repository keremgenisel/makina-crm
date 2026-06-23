const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem } = require("electron");
const path = require("path");
const fs = require("fs");
const sqliteDb = require("./db.cjs");
const mailer = require("./mail.cjs");

// ── Otomatik güncelleme (electron-updater) ──
// Yalnızca derlenmiş (kurulu) uygulamada çalışır; geliştirme modunda devre dışıdır.
let autoUpdater = null;
try {
  autoUpdater = require("electron-updater").autoUpdater;
  autoUpdater.autoDownload = false;          // kullanıcı onayı olmadan indirme yapma
  autoUpdater.autoInstallOnAppQuit = true;   // indirildiyse kapanışta kur
} catch (e) {
  console.log("electron-updater yüklü değil (geliştirme modu olabilir)");
}

// ── Türkçe yerel ayar: tarih seçici takvimleri Türkçe görünür ──
// "tr" (bölge kodu olmadan) kullanılır — Chromium'un paketlediği yerel ayar dosyası "tr-TR.pak" değil "tr.pak"
app.commandLine.appendSwitch("lang", "tr");

let mainWin = null;
let allowCloseWithoutPrompt = false; // güncelleme kurma / kaldırma gibi programatik kapanışlarda uyarıyı atlamak için

// ── Veri dosyası: %APPDATA%/makina-crm/data.json ──
const getDataPath = () => path.join(app.getPath("userData"), "data.json");

function loadData() {
  try {
    const p = getDataPath();
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    }
  } catch (err) {
    console.error("Veri okunamadı:", err);
  }
  return null;
}

function saveData(data) {
  try {
    const p = getDataPath();
    const tmp = p + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmp, p);
    return true;
  } catch (err) {
    console.error("Veri kaydedilemedi:", err);
    return false;
  }
}

// ── Veri IPC kanalları ──
// SQLite (better-sqlite3) aktifse oradan oku/yaz; değilse (geçiş yapılmadıysa/başarısızsa) eski data.json'a düş.
ipcMain.handle("crm:load", () => {
  if (!sqliteDb.isActive()) return loadData();
  try {
    return sqliteDb.readBlobFromDb();
  } catch (err) {
    console.error("SQLite'tan okunamadı:", err);
    return null;
  }
});
ipcMain.handle("crm:save", (_e, data) => {
  if (!sqliteDb.isActive()) return saveData(data);
  try {
    sqliteDb.writeBlobToDb(data);
    return true;
  } catch (err) {
    console.error("SQLite'a yazılamadı:", err);
    return false;
  }
});
ipcMain.handle("crm:dataPath", () => (sqliteDb.isActive() ? sqliteDb.getDbPath() : getDataPath()));

ipcMain.handle("crm:backup", async (_e, data) => {
  const date = new Date().toISOString().split("T")[0];
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Yedek Kaydet",
    defaultPath: `altunmak-crm-yedek-${date}.json`,
    filters: [{ name: "JSON Yedek Dosyası", extensions: ["json"] }],
  });
  if (canceled || !filePath) return false;
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Yedek yazılamadı:", err);
    return false;
  }
});

// Otomatik yedek: klasör seçtir
ipcMain.handle("crm:chooseFolder", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Yedek Klasörü Seç",
    properties: ["openDirectory", "createDirectory"],
  });
  return canceled || !filePaths?.[0] ? null : filePaths[0];
});

// Otomatik yedek: seçilen klasöre tarihli dosya yaz
ipcMain.handle("crm:writeBackup", (_e, folder, data) => {
  try {
    // Güvenlik: klasörün gerçek, var olan bir dizin olduğunu doğrula
    if (typeof folder !== "string" || !folder.trim()) return false;
    if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
      console.error("Geçersiz yedek klasörü:", folder);
      return false;
    }
    const date = new Date().toISOString().split("T")[0];
    const file = path.join(folder, `altunmak-crm-otoyedek-${date}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Otomatik yedek yazılamadı:", err);
    return false;
  }
});

ipcMain.handle("crm:restore", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Yedek Dosyası Seç",
    filters: [{ name: "JSON Yedek Dosyası", extensions: ["json"] }],
    properties: ["openFile"],
  });
  if (canceled || !filePaths?.[0]) return null;
  try {
    return JSON.parse(fs.readFileSync(filePaths[0], "utf-8"));
  } catch (err) {
    console.error("Yedek okunamadı:", err);
    return null;
  }
});

// ── Güncelleme IPC kanalları ──
ipcMain.handle("updater:version", () => app.getVersion());

ipcMain.handle("updater:check", async () => {
  if (!autoUpdater) return { error: "dev-mode" };
  if (!app.isPackaged) return { error: "dev-mode" };
  try {
    const result = await autoUpdater.checkForUpdates();
    const latest = result?.updateInfo?.version;
    const current = app.getVersion();
    return {
      current,
      latest,
      available: latest && latest !== current,
    };
  } catch (err) {
    return { error: err.message || "Güncelleme sunucusuna erişilemedi" };
  }
});

ipcMain.handle("updater:download", async () => {
  if (!autoUpdater || !app.isPackaged) return false;
  try {
    await autoUpdater.downloadUpdate();
    return true;
  } catch (err) {
    console.error("İndirme hatası:", err);
    return false;
  }
});

ipcMain.handle("updater:install", () => {
  allowCloseWithoutPrompt = true;
  if (autoUpdater) autoUpdater.quitAndInstall(false, true);
});

// ── Uygulamayı kaldır: NSIS kaldırıcısını başlat ve çık ──
ipcMain.handle("app:uninstall", () => {
  try {
    const { spawn } = require("child_process");
    const installDir = path.dirname(app.getPath("exe"));
    // NSIS kaldırıcısının olası adları
    const candidates = [
      path.join(installDir, "Uninstall Altunmak CRM.exe"),
      path.join(installDir, "Uninstall.exe"),
    ];
    const unins = candidates.find(p => fs.existsSync(p));
    if (!unins) return false;
    spawn(unins, [], { detached: true, stdio: "ignore" }).unref();
    allowCloseWithoutPrompt = true;
    setTimeout(() => app.quit(), 400);
    return true;
  } catch (err) {
    console.error("Kaldırma başlatılamadı:", err);
    return false;
  }
});

// ── Yazdırma: HTML'i GÖRÜNÜR önizleme penceresinde aç (üstte Yazdır/Kapat çubuğu) ──
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
    // Güvenlik: ana pencereyle aynı şekilde dış navigasyonu ve yeni pencere açmayı engelle
    previewWin.webContents.on("will-navigate", (e, url) => {
      if (!url.startsWith("file://")) e.preventDefault();
    });
    previewWin.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    const cleanup = () => {
      if (tmpFile) { try { fs.unlinkSync(tmpFile); } catch { /* yoksay */ } tmpFile = null; }
    };
    previewWin.on("closed", () => { previewWin = null; cleanup(); resolve(true); });

    // İçeriğin üstüne sabit bir araç çubuğu (Yazdır / Kapat) ekle
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
    // Araç çubuğunu <body>'nin hemen başına ekle
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

// ── E-posta (Yandex SMTP) ──
ipcMain.handle("mail:saveCredentials", (_e, email, appPassword) => mailer.saveCredentials({ email, appPassword }));
ipcMain.handle("mail:credentialsStatus", () => mailer.getCredentialsStatus());
ipcMain.handle("mail:clearCredentials", () => mailer.clearCredentials());
ipcMain.handle("mail:test", () => mailer.testConnection());
ipcMain.handle("mail:send", (_e, payload) => mailer.sendMail(payload));

function wireUpdaterEvents() {
  if (!autoUpdater) return;
  autoUpdater.on("download-progress", (p) => {
    if (mainWin) mainWin.webContents.send("updater:progress", Math.round(p.percent));
  });
  autoUpdater.on("update-downloaded", () => {
    if (mainWin) mainWin.webContents.send("updater:downloaded");
  });
  autoUpdater.on("error", (err) => {
    if (mainWin) mainWin.webContents.send("updater:error", err?.message || "Bilinmeyen hata");
  });
}

function createWindow() {
  // ── Açılış (splash) ekranı ──
  const splash = new BrowserWindow({
    width: 460,
    height: 360,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    center: true,
  });
  splash.loadFile(path.join(__dirname, "splash.html"));
  // Sürüm yazısını package.json'daki version'dan otomatik bas
  splash.webContents.once("did-finish-load", () => {
    splash.webContents.executeJavaScript(
      `var el = document.querySelector(".version"); if (el) el.textContent = "CRM Sistemi · v${app.getVersion()}";`
    ).catch(() => {});
  });

  // ── Ana pencere (hazır olana kadar gizli) ──
  mainWin = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: "Altunmak CRM",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWin.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWin.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // ── Güvenlik: dış navigasyonu ve yeni pencere açmayı engelle ──
  // Arayüz yalnızca kendi içeriğini yükleyebilir; harici siteye yönlenemez.
  mainWin.webContents.on("will-navigate", (e, url) => {
    const devUrl = process.env.VITE_DEV_SERVER_URL;
    const isLocal = url.startsWith("file://") || (devUrl && url.startsWith(devUrl));
    if (!isLocal) {
      e.preventDefault(); // dış URL'ye gitmeyi engelle
    }
  });
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    // Yazdırma için açılan yerel blob: pencerelerine izin ver; dış siteleri engelle
    if (url.startsWith("blob:") || url.startsWith("about:blank")) {
      return { action: "allow" };
    }
    return { action: "deny" };
  });

  // ── Klavye kısayolları (Ctrl+C / V / X / A / Z / Y) ──
  // Menü çubuğu gizli olsa da bu roller kısayolları etkinleştirir.
  const menu = Menu.buildFromTemplate([
    {
      label: "Düzen",
      submenu: [
        { role: "undo", label: "Geri Al" },
        { role: "redo", label: "Yinele" },
        { type: "separator" },
        { role: "cut", label: "Kes" },
        { role: "copy", label: "Kopyala" },
        { role: "paste", label: "Yapıştır" },
        { role: "selectAll", label: "Tümünü Seç" },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  // ── Sağ tık (context) menüsü: Kes / Kopyala / Yapıştır / Tümünü Seç ──
  mainWin.webContents.on("context-menu", (_e, params) => {
    const template = [];
    const canEdit = params.isEditable;
    const hasSelection = params.selectionText && params.selectionText.trim().length > 0;
    if (canEdit) {
      template.push({ role: "cut", label: "Kes", enabled: hasSelection });
      template.push({ role: "copy", label: "Kopyala", enabled: hasSelection });
      template.push({ role: "paste", label: "Yapıştır" });
      template.push({ type: "separator" });
      template.push({ role: "selectAll", label: "Tümünü Seç" });
    } else if (hasSelection) {
      template.push({ role: "copy", label: "Kopyala" });
      template.push({ type: "separator" });
      template.push({ role: "selectAll", label: "Tümünü Seç" });
    }
    if (template.length) {
      Menu.buildFromTemplate(template).popup({ window: mainWin });
    }
  });

  // ── Kapatma uyarısı: çarpıya basınca onay iste ──
  mainWin.on("close", (e) => {
    if (allowCloseWithoutPrompt) return;
    const choice = dialog.showMessageBoxSync(mainWin, {
      type: "question",
      buttons: ["Çıkış", "Vazgeç"],
      defaultId: 1,
      cancelId: 1,
      title: "Çıkış",
      message: "Uygulamadan çıkmak istediğinize emin misiniz?",
    });
    if (choice !== 0) e.preventDefault();
  });

  mainWin.once("ready-to-show", () => {
    setTimeout(() => {
      splash.destroy();
      mainWin.show();
      mainWin.focus();
    }, 1200);
  });

  wireUpdaterEvents();

  // Kurulu uygulamada açılıştan 5 sn sonra sessizce güncelleme denetle,
  // varsa kullanıcıya Ayarlar'da rozet gösterilir (otomatik indirme YAPMAZ)
  if (autoUpdater && app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().then((result) => {
        const latest = result?.updateInfo?.version;
        if (latest && latest !== app.getVersion() && mainWin) {
          mainWin.webContents.send("updater:available", latest);
        }
      }).catch(() => {});
    }, 5000);
  }
}

// ── Tek örnek kilidi: program zaten açıksa ikinci kopya açılmasın ──
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  // Bu ikinci kopya — sessizce kapan (uyarıyı ilk kopya gösterir)
  app.quit();
} else {
  // İkinci kopya açılmaya çalışılırsa: mevcut pencereyi öne getir + uyarı göster
  app.on("second-instance", () => {
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.show();
      mainWin.focus();
      dialog.showMessageBox(mainWin, {
        type: "info",
        title: "Altunmak CRM",
        message: "Uygulama zaten çalışıyor",
        detail: "Altunmak CRM şu anda açık. Aynı anda yalnızca bir pencere açılabilir.",
        buttons: ["Tamam"],
      });
    }
  });

  app.whenReady().then(() => {
    sqliteDb.migrateFromJsonIfNeeded();
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
