// Faaliyet Haritası penceresinin DAR preload'u. Ana preload'daki crmStorage/appServer gibi
// App'e özgü global'ler bilerek YOK: harita penceresi salt-okunur bir projeksiyon, veri
// yazamamalı. Yalnız tek yönlü veri köprüsü açılır.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("haritaBridge", {
  // Mount'ta önbellekteki son görüntüyü çek (yarışsız istek/yanıt).
  ilkVeriAl: () => ipcRenderer.invoke("harita:ilkVeriAl"),
  // Sonraki canlı güncellemeler (veri + tema payload'un içinde).
  onVeri: (cb) => {
    const h = (_e, veri) => cb(veri);
    ipcRenderer.removeAllListeners("harita:veri");
    ipcRenderer.on("harita:veri", h);
    return () => ipcRenderer.removeListener("harita:veri", h);
  },
});
