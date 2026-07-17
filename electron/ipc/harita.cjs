// Faaliyet Haritası'nı ayrı pencerede açma — ana süreç tarafı.
//
// Veri tek yönlü akar: ana pencere (kaynak) → ana süreç (önbellek) → harita penceresi.
// Harita bileşeni %100 salt-okunur olduğu için geri kanal (write-back) yoktur; harita
// penceresi ASLA App'i mount etmez, hiçbir şey kaydetmez, yalnız gösterir.
//
// Yarış durumu: harita penceresi mount olmadan ana pencere veri push edebilir. İki güvence
// birden var: (1) son görüntü burada önbelleğe alınır, pencere mount'ta `harita:ilkVeriAl`
// ile çeker (istek/yanıt, yarışsız); (2) açık pencereye ayrıca `harita:veri` ile iletilir
// (canlı güncelleme). Önbellek pull'u ana güvence, forward canlı akış içindir.

// Son harita görüntüsünü tutan küçük depo. Ayrı ve saf (ipcMain'e bağımsız) olması,
// "push → sonra ilkVeriAl aynı veriyi döndürür" invaryantının node altında test
// edilebilmesi içindir.
function haritaVeriDeposu() {
  let son = null; // { customers, dealers, factory, tema }
  return {
    yaz: (v) => { son = v || null; },
    oku: () => son,
  };
}

function registerHaritaHandlers(ipcMain, { acVeyaOdakla, getHaritaWin }) {
  const depo = haritaVeriDeposu();

  // Ana pencere → "ayrı pencerede aç" (varsa öne getir).
  ipcMain.handle("harita:ac", () => { acVeyaOdakla(); return true; });

  // Ana pencere → anlık veri görüntüsü. Önbelleğe al, açık harita penceresine ilet.
  ipcMain.on("harita:veriPush", (_e, veri) => {
    depo.yaz(veri);
    const win = getHaritaWin();
    if (win && !win.isDestroyed()) win.webContents.send("harita:veri", depo.oku());
  });

  // Harita penceresi → mount'ta önbellekteki son görüntüyü çek (yarışsız).
  ipcMain.handle("harita:ilkVeriAl", () => depo.oku());

  return depo;
}

module.exports = { registerHaritaHandlers, haritaVeriDeposu };
