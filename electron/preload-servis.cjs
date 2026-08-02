// Servis ve Kargo Panosu penceresinin preload'u. Haritanın DAR preload'unun aksine bu pencere
// TAM ETKİLEŞİMLİDİR (kutu sürükleme, form, dosya, kilit), ama App'i mount ETMEZ — veri ana
// pencereden IPC ile gelir, penceredeki her yazma (mutate) ana pencereye geri gider; kayıt/DB'yi
// yalnız ana pencere yönetir (iki pencere aynı blob'u yazıp optimistic-lock çakışması yapmasın).
//
// Bu yüzden yalnız panonun gerçekten kullandığı köprüler açılır (crmStorage/appServer.login gibi
// App'e özgü, tehlikeli global'ler BİLEREK yok):
//   servisBridge  — veri al (pull + canlı) + yazma (mutate) köprüsü
//   crmLocks      — kayıt kilitleri (aynı IPC uçları; her pencereden çalışır)
//   appServer     — audit için apiRequest + kilit değişimi bildirimi (yalnız bu ikisi)
//   auditLog      — yerel/sunucu-PC modunda İşlem Geçmişi yazımı
//   appFiles      — servis dosya ekle/aç/indir/sil + çıktı için dataUrl
//   appPrint      — servis formu / kargo etiketi yazdırma (önizleme penceresi)
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("servisBridge", {
  // Mount'ta önbellekteki son görüntüyü çek (yarışsız istek/yanıt).
  ilkVeriAl: () => ipcRenderer.invoke("servis:ilkVeriAl"),
  // Sonraki canlı güncellemeler (tüm pano verisi + tema payload içinde).
  onVeri: (cb) => {
    const h = (_e, veri) => cb(veri);
    ipcRenderer.removeAllListeners("servis:veri");
    ipcRenderer.on("servis:veri", h);
    return () => ipcRenderer.removeListener("servis:veri", h);
  },
  // Penceredeki bir yazma: ana pencere ilgili state dizisini (key) güncellensin diye yeni değeri gönder.
  mutate: (key, value) => ipcRenderer.send("servis:mutate", { key, value }),
});

contextBridge.exposeInMainWorld("crmLocks", {
  acquire:    (entityType, entityId, force = false) => ipcRenderer.invoke("crm:lock:acquire", { entityType, entityId, force }),
  release:    (entityType, entityId) => ipcRenderer.invoke("crm:lock:release", { entityType, entityId }),
  list:       () => ipcRenderer.invoke("crm:lock:list"),
  releaseAll: () => ipcRenderer.invoke("crm:lock:releaseAll"),
});

contextBridge.exposeInMainWorld("appServer", {
  // İstemci modunda İşlem Geçmişi (audit) sunucuya bu uçla yazılır.
  apiRequest: (params) => ipcRenderer.invoke("server:apiRequest", params),
  // Kilit listesi değişince panonun yumuşak-kilit tazelemesi.
  onLocksChanged: (cb) => {
    const h = () => cb();
    ipcRenderer.removeAllListeners("server:locksChanged");
    ipcRenderer.on("server:locksChanged", h);
    return () => ipcRenderer.removeListener("server:locksChanged", h);
  },
});

contextBridge.exposeInMainWorld("auditLog", {
  log: (entry) => ipcRenderer.invoke("audit:log", entry),
});

contextBridge.exposeInMainWorld("appFiles", {
  add:      (entityAd) => ipcRenderer.invoke("files:add", entityAd),
  open:     (depoAd) => ipcRenderer.invoke("files:open", depoAd),
  dataUrl:  (depoAd) => ipcRenderer.invoke("files:dataUrl", depoAd),
  download: (depoAd, onerilenAd) => ipcRenderer.invoke("files:download", depoAd, onerilenAd),
  remove:   (depoAd) => ipcRenderer.invoke("files:remove", depoAd),
});

contextBridge.exposeInMainWorld("appPrint", {
  printHtml: (html, pdfHtml, defaultName) => ipcRenderer.invoke("app:printHtml", html, pdfHtml, defaultName),
});
