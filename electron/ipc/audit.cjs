function registerAuditHandlers(ipcMain, db) {
  ipcMain.handle("audit:log", (_e, entry) => {
    try { db.writeAuditEntry(entry); return { ok: true }; }
    catch (err) { console.error("audit:log hatası:", err); return { ok: false }; }
  });

  ipcMain.handle("audit:get", (_e, filters) => {
    try { return { ok: true, ...db.getAuditLog(filters || {}) }; }
    catch (err) { console.error("audit:get hatası:", err); return { ok: false, rows: [], total: 0 }; }
  });
}

module.exports = { registerAuditHandlers };
