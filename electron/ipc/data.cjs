const path = require("path");
const fs = require("fs");

const getDataPath = (app) => path.join(app.getPath("userData"), "data.json");

function loadData(app) {
  try {
    const p = getDataPath(app);
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    }
  } catch (err) {
    console.error("Veri okunamadı:", err);
  }
  return null;
}

function saveData(app, data) {
  try {
    const p = getDataPath(app);
    const tmp = p + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmp, p);
    return true;
  } catch (err) {
    console.error("Veri kaydedilemedi:", err);
    return false;
  }
}

function registerDataHandlers(ipcMain, app, dialog, sqliteDb) {
  // SQLite aktifse oradan oku/yaz; değilse data.json'a düş
  ipcMain.handle("crm:load", () => {
    if (!sqliteDb.isActive()) return loadData(app);
    try {
      return sqliteDb.readBlobFromDb();
    } catch (err) {
      console.error("SQLite'tan okunamadı:", err);
      return null;
    }
  });

  ipcMain.handle("crm:save", (_e, data) => {
    if (!sqliteDb.isActive()) return saveData(app, data);
    try {
      sqliteDb.writeBlobToDb(data);
      return true;
    } catch (err) {
      console.error("SQLite'a yazılamadı:", err);
      return false;
    }
  });

  ipcMain.on("crm:flush-save", (e, data) => {
    try {
      if (sqliteDb.isActive()) sqliteDb.writeBlobToDb(data);
      else saveData(app, data);
      e.returnValue = true;
    } catch (err) {
      console.error("Flush save failed:", err);
      e.returnValue = false;
    }
  });

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

  ipcMain.handle("crm:chooseFolder", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Yedek Klasörü Seç",
      properties: ["openDirectory", "createDirectory"],
    });
    return canceled || !filePaths?.[0] ? null : filePaths[0];
  });

  ipcMain.handle("crm:writeBackup", (_e, folder, data) => {
    try {
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
}

module.exports = { registerDataHandlers };
