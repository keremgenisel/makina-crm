const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("previewPdf", {
  save: (defaultName) => ipcRenderer.invoke("app:previewSavePdf", defaultName),
});
