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

// Spec 0129 R1–R2/3: ayrı pencerenin kayıt durumu (perde + son kayıt mesajı). Büyük anlık görüntüye girmez (R1/2); yük sabit
// boyutludur ve kayıt dizisi taşımaz (C2). `yaz` gelen değişimi son durumla birleştirir; pencere `closed` olunca `temizle`
// (R2/2: kayıt sürerken kapatılıp yeniden açılan pencere asılı perdeyle açılmasın). Uygulama kilidinin gizleme yolu temizlemez.
function servisKayitDeposu() {
  let son = null;
  return {
    yaz: (degisim) => {
      if (!degisim || typeof degisim !== "object") return;
      const { perdeAcik, durum, mesaj } = degisim;
      son = { ...(son || {}), ...(perdeAcik !== undefined ? { perdeAcik: !!perdeAcik } : {}), ...(durum !== undefined ? { durum } : {}),
        ...(mesaj ? { mesaj: { metin: String(mesaj.metin ?? ""), tur: mesaj.tur, no: Number(mesaj.no) || 0 } } : {}) };
    },
    oku: () => son,
    temizle: () => { son = null; },
  };
}

function registerServisPencereHandlers(ipcMain, { acVeyaOdakla, getServisWin, mutasyonAnaPencere }) {
  const depo = servisVeriDeposu();
  const kayitDepo = servisKayitDeposu();

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

  // Spec 0129: ana pencere → kayıt durumu (hafif kanal). Önbelleğe al, açık pencereye ilet; pencere açılışta son durumu çeker.
  ipcMain.on("servis:kayitPush", (_e, degisim) => {
    kayitDepo.yaz(degisim);
    const win = getServisWin();
    if (win && !win.isDestroyed()) win.webContents.send("servis:kayit", kayitDepo.oku());
  });
  ipcMain.handle("servis:ilkKayitAl", () => kayitDepo.oku());

  return { depo, kayitTemizle: kayitDepo.temizle };
}

module.exports = { registerServisPencereHandlers, servisVeriDeposu, servisKayitDeposu };
