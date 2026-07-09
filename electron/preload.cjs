const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("crmStorage", {
  load: () => ipcRenderer.invoke("crm:load"),
  save: (data) => ipcRenderer.invoke("crm:save", data),
  getVersion: () => ipcRenderer.invoke("crm:getVersion"),
  flushSave: (data) => ipcRenderer.sendSync("crm:flush-save", data),
  backup: (data, password) => ipcRenderer.invoke("crm:backup", data, password),
  restore: () => ipcRenderer.invoke("crm:restore"),
  chooseFolder: () => ipcRenderer.invoke("crm:chooseFolder"),
  writeBackup: (folder, data) => ipcRenderer.invoke("crm:writeBackup", folder, data),
  decryptBackup: (envelope, password) => ipcRenderer.invoke("backup:decrypt", envelope, password),
  setAutoBackupPassword: (password) => ipcRenderer.invoke("backup:setAutoPassword", password),
  autoBackupPasswordStatus: () => ipcRenderer.invoke("backup:autoPasswordStatus"),
});

contextBridge.exposeInMainWorld("appPrint", {
  // HTML içeriğini Electron'un yazdırma penceresinde aç ve yazdırma diyaloğunu göster
  printHtml: (html, pdfHtml, defaultName) => ipcRenderer.invoke("app:printHtml", html, pdfHtml, defaultName),
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
  getOpenAtLogin: () => ipcRenderer.invoke("app:getOpenAtLogin"),
  setOpenAtLogin: (val) => ipcRenderer.invoke("app:setOpenAtLogin", val),
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
  getConfigForBackup: () => ipcRenderer.invoke("mail:getConfigForBackup"),
  restoreConfigFromBackup: (config) => ipcRenderer.invoke("mail:restoreConfigFromBackup", config),
  getAllLog: () => ipcRenderer.invoke("mail:getAllLog"),
  restoreFullLog: (log) => ipcRenderer.invoke("mail:restoreFullLog", log),
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
  getDataForBackup: () => ipcRenderer.invoke("applock:getDataForBackup"),
  restoreFromBackup: (data) => ipcRenderer.invoke("applock:restoreFromBackup", data),
  setLockOnClose: (val) => ipcRenderer.invoke("applock:setLockOnClose", val),
});

contextBridge.exposeInMainWorld("appServer", {
  getConfig:       () => ipcRenderer.invoke("server:getConfig"),
  login:           (params) => ipcRenderer.invoke("server:login", params),
  logout:          () => ipcRenderer.invoke("server:logout"),
  clearConfig:     () => ipcRenderer.invoke("server:clearConfig"),
  refreshToken:    () => ipcRenderer.invoke("server:refreshToken"),
  apiRequest:      (params) => ipcRenderer.invoke("server:apiRequest", params),
  setupAdmin:      (params) => ipcRenderer.invoke("server:setupAdmin", params),
  startServer:     (port) => ipcRenderer.invoke("server:startServer", port),
  stopServer:      () => ipcRenderer.invoke("server:stopServer"),
  getServerStatus: () => ipcRenderer.invoke("server:getServerStatus"),
  checkLan:        () => ipcRenderer.invoke("server:checkLan"),
  onSessionExpired: (cb) => {
    const h = () => cb();
    ipcRenderer.removeAllListeners("server:sessionExpired");
    ipcRenderer.on("server:sessionExpired", h);
    return () => ipcRenderer.removeListener("server:sessionExpired", h);
  },
  onConflict: (cb) => {
    const h = (_e, serverVersion) => cb(serverVersion);
    ipcRenderer.removeAllListeners("server:conflict");
    ipcRenderer.on("server:conflict", h);
    return () => ipcRenderer.removeListener("server:conflict", h);
  },
  onVersionUpdate: (cb) => {
    const h = (_e, newVersion) => cb(newVersion);
    ipcRenderer.removeAllListeners("server:versionUpdate");
    ipcRenderer.on("server:versionUpdate", h);
    return () => ipcRenderer.removeListener("server:versionUpdate", h);
  },
  onError: (cb) => {
    const h = (_e, msg) => cb(msg);
    ipcRenderer.removeAllListeners("server:error");
    ipcRenderer.on("server:error", h);
    return () => ipcRenderer.removeListener("server:error", h);
  },
  onDataChanged: (cb) => {
    const h = (_e, v) => cb(v);
    ipcRenderer.removeAllListeners("server:dataChanged");
    ipcRenderer.on("server:dataChanged", h);
    return () => ipcRenderer.removeListener("server:dataChanged", h);
  },
  onLocksChanged: (cb) => {
    const h = () => cb();
    ipcRenderer.removeAllListeners("server:locksChanged");
    ipcRenderer.on("server:locksChanged", h);
    return () => ipcRenderer.removeListener("server:locksChanged", h);
  },
});

contextBridge.exposeInMainWorld("auditLog", {
  log: (entry) => ipcRenderer.invoke("audit:log", entry),
  get: (filters) => ipcRenderer.invoke("audit:get", filters),
  clear: () => ipcRenderer.invoke("audit:clear"),
});

contextBridge.exposeInMainWorld("crmLocks", {
  acquire:    (entityType, entityId, force = false) => ipcRenderer.invoke("crm:lock:acquire", { entityType, entityId, force }),
  release:    (entityType, entityId) => ipcRenderer.invoke("crm:lock:release", { entityType, entityId }),
  list:       () => ipcRenderer.invoke("crm:lock:list"),
  releaseAll: () => ipcRenderer.invoke("crm:lock:releaseAll"),
});
