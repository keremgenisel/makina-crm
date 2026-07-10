function registerAuditHandlers(ipcMain, db) {
  ipcMain.handle("audit:log", (_e, entry) => {
    try { db.writeAuditEntry(entry); return { ok: true }; }
    catch (err) { console.error("audit:log hatası:", err); return { ok: false }; }
  });

  ipcMain.handle("audit:get", (_e, filters) => {
    try { return { ok: true, ...db.getAuditLog(filters || {}) }; }
    catch (err) { console.error("audit:get hatası:", err); return { ok: false, rows: [], total: 0 }; }
  });

  // Sadece yerel mod / sunucu PC'den çağrılır (renderer'da panel zaten sadece admin'e açık);
  // istemci PC'ler DELETE /api/audit üzerinden requireAdmin ile geçer
  ipcMain.handle("audit:clear", () => {
    try { return { ok: true, deleted: db.clearAuditLog() }; }
    catch (err) { console.error("audit:clear hatası:", err); return { ok: false, deleted: 0 }; }
  });

  // ── Kullanıcı/güvenlik geçmişi (yerel mod / sunucu PC) ──
  ipcMain.handle("security:get", (_e, filters) => {
    try { return { ok: true, ...db.getSecurityLog(filters || {}) }; }
    catch (err) { console.error("security:get hatası:", err); return { ok: false, rows: [], total: 0 }; }
  });

  ipcMain.handle("security:clear", () => {
    try {
      const deleted = db.clearSecurityLog();
      db.writeSecurityEntry({ action: "gecmis_temizlendi", actor: "yerel", detail: JSON.stringify({ silinen: deleted }) });
      return { ok: true, deleted };
    } catch (err) { console.error("security:clear hatası:", err); return { ok: false, deleted: 0 }; }
  });
}

module.exports = { registerAuditHandlers };
