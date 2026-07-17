const { app, BrowserWindow, ipcMain, dialog, Menu, Tray, nativeImage, powerSaveBlocker, safeStorage, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const sqliteDb = require("./db.cjs");
const mailer = require("./mail.cjs");
const applock = require("./applock.cjs");
const { registerDataHandlers, makeFileNet } = require("./ipc/data.cjs");
const { registerSystemHandlers } = require("./ipc/system.cjs");
const { registerAuditHandlers } = require("./ipc/audit.cjs");
const { registerFileHandlers } = require("./ipc/files.cjs");
const { registerHaritaHandlers } = require("./ipc/harita.cjs");
const { ikinciEkran } = require("./haritaEkran.cjs");

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

// ── Türkçe yerel ayar ──
app.commandLine.appendSwitch("lang", "tr");

let mainWin = null;
let haritaWin = null; // Faaliyet Haritası ayrı penceresi (tekil)
let tray = null;
let allowCloseWithoutPrompt = false;

// Ana pencereyi (ve varsa harita penceresini) tray'den geri getir.
function pencereleriGoster() {
  if (mainWin && !mainWin.isDestroyed()) {
    if (mainWin.isMinimized()) mainWin.restore();
    mainWin.show();
    mainWin.focus();
  }
  if (haritaWin && !haritaWin.isDestroyed()) haritaWin.show();
}

// Faaliyet Haritası'nı ayrı pencerede aç; zaten açıksa öne getir (tekil).
function haritaPenceresiAcVeyaOdakla() {
  if (haritaWin && !haritaWin.isDestroyed()) {
    if (haritaWin.isMinimized()) haritaWin.restore();
    haritaWin.show();
    haritaWin.focus();
    return;
  }

  const anaBounds = mainWin && !mainWin.isDestroyed()
    ? mainWin.getBounds()
    : { x: 0, y: 0, width: 1280, height: 820 };
  let hedef = null;
  try { hedef = ikinciEkran(screen.getAllDisplays(), anaBounds); } catch { /* screen yok — varsayılan */ }

  const opts = {
    show: false, autoHideMenuBar: true, title: "Faaliyet Haritası — Altunmak CRM",
    webPreferences: {
      preload: path.join(__dirname, "preload-harita.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  };
  if (hedef) { opts.x = hedef.x; opts.y = hedef.y; opts.width = hedef.width; opts.height = hedef.height; }
  else { opts.width = 1100; opts.height = 800; }

  haritaWin = new BrowserWindow(opts);

  // Güvenlik: bu pencere ana pencereden hiçbir korumayı miras almaz, kendisi kurar.
  haritaWin.webContents.on("will-navigate", (e, url) => {
    const devUrl = process.env.VITE_DEV_SERVER_URL;
    const isLocal = url.startsWith("file://") || (devUrl && url.startsWith(devUrl));
    if (!isLocal) e.preventDefault();
  });
  haritaWin.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  if (process.env.VITE_DEV_SERVER_URL) {
    haritaWin.loadURL(process.env.VITE_DEV_SERVER_URL.replace(/\/$/, "") + "/harita.html");
  } else {
    haritaWin.loadFile(path.join(__dirname, "../dist/harita.html"));
  }

  haritaWin.once("ready-to-show", () => { haritaWin.show(); haritaWin.focus(); });

  // close preventDefault EDİLMEZ → gerçekten kapanır (ana pencerenin aksine).
  haritaWin.on("closed", () => {
    haritaWin = null;
    if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send("harita:kapandi");
  });

  // Ana pencereye "açıldı" bildir → veri push'unu başlatsın (hemen bir kez + değişimlerde).
  if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send("harita:acildi");
}

function getTrayIcon() {
  const candidates = [
    path.join(process.resourcesPath || "", "icon.png"),
    path.join(__dirname, "../build/icon.png"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return nativeImage.createFromPath(p).resize({ width: 16, height: 16 });
  }
  return nativeImage.createEmpty();
}

function quitApp() {
  allowCloseWithoutPrompt = true;
  tray?.destroy();
  tray = null;
  app.quit();
}

// ── IPC handler kayıtları ──
registerDataHandlers(ipcMain, app, dialog, sqliteDb);
registerSystemHandlers(ipcMain, app, BrowserWindow, mailer, applock, sqliteDb);
registerAuditHandlers(ipcMain, sqliteDb);
registerFileHandlers(ipcMain, app, BrowserWindow, makeFileNet(app));
registerHaritaHandlers(ipcMain, {
  acVeyaOdakla: haritaPenceresiAcVeyaOdakla,
  getHaritaWin: () => haritaWin,
  // Ayrı pencereden firma seçilince: ana pencereyi öne getir ve müşteri kartını açtır.
  firmaSecAnaPencere: (id) => {
    if (!mainWin || mainWin.isDestroyed()) return;
    if (mainWin.isMinimized()) mainWin.restore();
    mainWin.show();
    mainWin.focus();
    mainWin.webContents.send("harita:firmaSec", id);
  },
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
    return { current, latest, available: latest && latest !== current };
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

// ── Uygulamadan çık (renderer onay penceresinden) ──
ipcMain.handle("app:quit", () => { quitApp(); });

// ── Uygulamayı kaldır: NSIS kaldırıcısını başlat ve çık ──
ipcMain.handle("app:uninstall", () => {
  try {
    const { spawn } = require("child_process");
    const installDir = path.dirname(app.getPath("exe"));
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
  const startHidden = process.argv.includes("--hidden");

  // ── Açılış (splash) ekranı — açılışta otomatik başlatılıyorsa atla ──
  let splash = null;
  if (!startHidden) {
    splash = new BrowserWindow({
      width: 460, height: 360, frame: false, transparent: true,
      resizable: false, alwaysOnTop: true, skipTaskbar: true, center: true,
    });
    splash.loadFile(path.join(__dirname, "splash.html"));
    splash.webContents.once("did-finish-load", () => {
      splash.webContents.executeJavaScript(
        `var el = document.querySelector(".version"); if (el) el.textContent = "CRM Sistemi · v${app.getVersion()}";`
      ).catch(() => {});
    });
  }

  // ── Ana pencere ──
  mainWin = new BrowserWindow({
    width: 1280, height: 820, minWidth: 980, minHeight: 600,
    show: false, autoHideMenuBar: true, title: "Altunmak CRM",
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
  mainWin.webContents.on("will-navigate", (e, url) => {
    const devUrl = process.env.VITE_DEV_SERVER_URL;
    const isLocal = url.startsWith("file://") || (devUrl && url.startsWith(devUrl));
    if (!isLocal) e.preventDefault();
  });
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("blob:") || url.startsWith("about:blank")) return { action: "allow" };
    return { action: "deny" };
  });

  // ── Klavye kısayolları ──
  Menu.setApplicationMenu(Menu.buildFromTemplate([{
    label: "Düzen",
    submenu: [
      { role: "undo", label: "Geri Al" }, { role: "redo", label: "Yinele" },
      { type: "separator" },
      { role: "cut", label: "Kes" }, { role: "copy", label: "Kopyala" },
      { role: "paste", label: "Yapıştır" }, { role: "selectAll", label: "Tümünü Seç" },
    ],
  }]));

  // ── Sağ tık menüsü ──
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
    if (template.length) Menu.buildFromTemplate(template).popup({ window: mainWin });
  });

  // ── System tray ──
  tray = new Tray(getTrayIcon());
  tray.setToolTip("Altunmak CRM");
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: "Altunmak CRM'yi Aç",
      click: () => pencereleriGoster(),
    },
    { type: "separator" },
    {
      label: "Çıkış Yap",
      click: () => {
        // Native OS penceresi yerine uygulamanın kendi onay penceresini (ConfirmDialog) göster:
        // pencereyi öne getir ve renderer'a olay yolla. Pencere yoksa doğrudan çık.
        if (mainWin && !mainWin.isDestroyed()) {
          if (!mainWin.isVisible()) mainWin.show();
          mainWin.focus();
          mainWin.webContents.send("app:confirmQuit");
        } else {
          quitApp();
        }
      },
    },
  ]));
  tray.on("double-click", () => pencereleriGoster());

  // ── Kapatma: pencereyi kapat değil, tray'e gizle ──
  // Harita penceresi de birlikte gizlenir ki "uygulama tümüyle gitti" hissi tutarlı olsun;
  // tray'den "Aç" ikisini de geri getirir (pencereleriGoster). Kapatılmadığı için harita
  // penceresi hayatta kalır, veri push'u sürer.
  mainWin.on("close", (e) => {
    if (allowCloseWithoutPrompt) return;
    e.preventDefault();
    mainWin.hide();
    if (haritaWin && !haritaWin.isDestroyed()) haritaWin.hide();
  });

  mainWin.once("ready-to-show", () => {
    if (startHidden) return; // tray'de gizli bekle, pencereyi gösterme
    setTimeout(() => { splash?.destroy(); mainWin.show(); mainWin.focus(); }, 1200);
  });

  wireUpdaterEvents();

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

// ── Tek örnek kilidi ──
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    // Kısayola tekrar tıklanınca ikinci pencere açılmaz: mevcut pencereyi öne getir ve
    // native "zaten çalışıyor" penceresi yerine uygulamanın kendi bildirimini (toast) göster.
    if (mainWin && !mainWin.isDestroyed()) {
      if (mainWin.isMinimized()) mainWin.restore();
      if (!mainWin.isVisible()) mainWin.show();
      mainWin.focus();
      mainWin.webContents.send("app:alreadyRunning");
    }
  });

  app.whenReady().then(() => {
    // Sistem uykusunu engelle — sunucu modunda ağ stack'i canlı kalsın
    powerSaveBlocker.start("prevent-app-suspension");
    sqliteDb.migrateFromJsonIfNeeded();
    // safeStorage yoksa (nadir; keyring'siz Linux vb.) at-rest şifreleme devre dışıdır: DB ve
    // oturum anahtarı (jwtSecret) diskte ŞİFRESİZ tutulur. Bir kez uyar ki operatör, Güvenlik
    // Durumu panelindeki uyarıyla birlikte fark etsin — tek koruma OS disk şifrelemesidir.
    try {
      if (!safeStorage?.isEncryptionAvailable?.()) {
        console.warn("[güvenlik] safeStorage kullanılamıyor — veritabanı ve oturum anahtarı diskte ŞİFRESİZ. Yalnızca OS disk şifrelemesi (BitLocker/FileVault) koruma sağlar. Ayrıntı: Ayarlar > Güvenlik Durumu.");
      }
    } catch { /* değerlendirilemedi — yoksay */ }
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  // Pencere gizlenince (tray'e küçülünce) uygulama kapanmaz
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin" && allowCloseWithoutPrompt) app.quit();
  });
}
