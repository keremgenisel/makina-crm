// Servis ve Kargo Panosu'nu ayrı pencerede açma — ana süreç tarafı.
//
// Haritadan farkı ÇİFT YÖNLÜ olması:
//   Aşağı (veri):  ana pencere → ana süreç (önbellek) → servis penceresi.  (harita ile aynı desen)
//   Yukarı (yazma): servis penceresi → ana süreç → ana pencere.  (pano bir işlem yapınca ana
//                   pencerenin state dizisi güncellenir; kayıt/DB'yi yalnız ana pencere yönetir.)
//
// Yarış durumu haritayla aynı: pencere mount olmadan ana pencere veri push edebilir → son görüntü
// burada önbelleğe alınır, pencere mount'ta `servis:ilkVeriAl` ile çeker (istek/yanıt, yarışsız);
// açık pencereye ayrıca `servis:veri` ile canlı iletilir.

// Son pano görüntüsünü tutan küçük saf depo (harita deposunun eşi; node altında test edilebilir).
function servisVeriDeposu() {
  let son = null;
  return {
    yaz: (v) => { son = v || null; },
    oku: () => son,
  };
}

function registerServisPencereHandlers(ipcMain, { acVeyaOdakla, getServisWin, mutasyonAnaPencere }) {
  const depo = servisVeriDeposu();

  // Ana pencere → "ayrı pencerede aç" (varsa öne getir).
  ipcMain.handle("servis:ac", () => { acVeyaOdakla(); return true; });

  // Ana pencere → anlık pano verisi görüntüsü. Önbelleğe al, açık pencereye ilet.
  ipcMain.on("servis:veriPush", (_e, veri) => {
    depo.yaz(veri);
    const win = getServisWin();
    if (win && !win.isDestroyed()) win.webContents.send("servis:veri", depo.oku());
  });

  // Servis penceresi → mount'ta önbellekteki son görüntüyü çek (yarışsız).
  ipcMain.handle("servis:ilkVeriAl", () => depo.oku());

  // Servis penceresi → bir yazma yaptı (kutu sürükleme, form, toggle...). Ana pencereye ilet;
  // ana pencere ilgili state dizisini (key) yeni değere (value) çeker → kayıt + geri push oradan.
  ipcMain.on("servis:mutate", (_e, yuk) => { mutasyonAnaPencere?.(yuk); });

  return depo;
}

module.exports = { registerServisPencereHandlers, servisVeriDeposu };
