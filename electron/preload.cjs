const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("crmStorage", {
  load: () => ipcRenderer.invoke("crm:load"),
  save: (data) => ipcRenderer.invoke("crm:save", data),
  flushSave: (data) => ipcRenderer.sendSync("crm:flush-save", data),
  backup: (data) => ipcRenderer.invoke("crm:backup", data),
  restore: () => ipcRenderer.invoke("crm:restore"),
  chooseFolder: () => ipcRenderer.invoke("crm:chooseFolder"),
  writeBackup: (folder, data) => ipcRenderer.invoke("crm:writeBackup", folder, data),
});

contextBridge.exposeInMainWorld("appPrint", {
  // HTML içeriğini Electron'un yazdırma penceresinde aç ve yazdırma diyaloğunu göster
  printHtml: (html) => ipcRenderer.invoke("app:printHtml", html),
  // HTML'i PDF olarak kaydet (dialog ile dosya yolu seçtirir)
  savePdf: (html, defaultName) => ipcRenderer.invoke("app:savePdf", html, defaultName),
});

contextBridge.exposeInMainWorld("appUpdater", {
  version: () => ipcRenderer.invoke("updater:version"),
  check: () => ipcRenderer.invoke("updater:check"),
  download: () => ipcRenderer.invoke("updater:download"),
  install: () => ipcRenderer.invoke("updater:install"),
  onAvailable: (cb) => {
    const h = (_e, v) => cb(v);
    ipcRenderer.removeAllListeners("updater:available");
    ipcRenderer.on("updater:available", h);
    return () => ipcRenderer.removeListener("updater:available", h);
  },
  onProgress: (cb) => {
    const h = (_e, p) => cb(p);
    ipcRenderer.removeAllListeners("updater:progress");
    ipcRenderer.on("updater:progress", h);
    return () => ipcRenderer.removeListener("updater:progress", h);
  },
  onDownloaded: (cb) => {
    const h = () => cb();
    ipcRenderer.removeAllListeners("updater:downloaded");
    ipcRenderer.on("updater:downloaded", h);
    return () => ipcRenderer.removeListener("updater:downloaded", h);
  },
  onError: (cb) => {
    const h = (_e, m) => cb(m);
    ipcRenderer.removeAllListeners("updater:error");
    ipcRenderer.on("updater:error", h);
    return () => ipcRenderer.removeListener("updater:error", h);
  },
});

contextBridge.exposeInMainWorld("appControl", {
  uninstall: () => ipcRenderer.invoke("app:uninstall"),
});

contextBridge.exposeInMainWorld("appMail", {
  saveCredentials: (payload) => ipcRenderer.invoke("mail:saveCredentials", payload),
  credentialsStatus: () => ipcRenderer.invoke("mail:credentialsStatus"),
  clearCredentials: () => ipcRenderer.invoke("mail:clearCredentials"),
  test: () => ipcRenderer.invoke("mail:test"),
  send: (payload) => ipcRenderer.invoke("mail:send", payload),
  getLog: () => ipcRenderer.invoke("mail:getLog"),
  getDeletedLog: () => ipcRenderer.invoke("mail:getDeletedLog"),
  deleteLogEntry: (id) => ipcRenderer.invoke("mail:deleteLogEntry", id),
  restoreLogEntry: (id) => ipcRenderer.invoke("mail:restoreLogEntry", id),
  purgeLogEntry: (id) => ipcRenderer.invoke("mail:purgeLogEntry", id),
});

contextBridge.exposeInMainWorld("appError", {
  log: (entry) => ipcRenderer.invoke("error:log", entry),
  readLog: () => ipcRenderer.invoke("error:readLog"),
});

contextBridge.exposeInMainWorld("appLock", {
  status: () => ipcRenderer.invoke("applock:status"),
  setup: (password) => ipcRenderer.invoke("applock:setup", password),
  verify: (password) => ipcRenderer.invoke("applock:verify", password),
  disable: (password) => ipcRenderer.invoke("applock:disable", password),
  changePassword: (currentPassword, newPassword) => ipcRenderer.invoke("applock:changePassword", currentPassword, newPassword),
  resetWithRecoveryCode: (recoveryCode, newPassword) => ipcRenderer.invoke("applock:resetWithRecoveryCode", recoveryCode, newPassword),
});
