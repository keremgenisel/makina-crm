// Dosya arşivi IPC. Yerel/sunucu modunda dosyalar bu PC'nin diskinde; istemci modunda sunucuya
// yüklenir/indirilir (net köprüsü). Künye renderer'da state'e yazılır.
const { dialog, shell } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const files = require("../files.cjs");
const imageOpt = require("../imageOptimize.cjs");

// net: { isClient(), upload(ad,buf)->künye, download(depoAd)->Buffer, remove(depoAd) } | null (yerel mod)
function registerFileHandlers(ipcMain, app, BrowserWindow, net = null) {
  const aktifPencere = () => BrowserWindow.getFocusedWindow?.() || BrowserWindow.getAllWindows?.()[0] || null;
  const clientMi = () => !!(net && net.isClient());

  // Dosya seç (çoklu) → yerelde kopyala / istemcide sunucuya yükle → künye taslakları döndür.
  ipcMain.handle("files:add", async (_e, entityAd = "") => {
    const res = await dialog.showOpenDialog(aktifPencere(), {
      title: "Dosya Ekle",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "İzin verilen dosyalar", extensions: files.IZINLI_UZANTILAR }],
    });
    if (res.canceled || !res.filePaths?.length) return { ok: false, canceled: true };
    const istemci = clientMi();
    const eklenen = [], hatalar = [];
    for (const src of res.filePaths) {
      const ad = path.basename(src);
      if (!files.izinliMi(ad)) { hatalar.push(`${ad}: tür desteklenmiyor`); continue; }
      // Baytları oku (boyut kontrolü ÖNCE stat ile — devasa dosyayı belleğe almadan ele), sonra
      // resimse yükleme anında nazikçe optimize et (jpg/png; büyük foto/taramaları küçültür → yedek
      // yer kazanır). Optimize edilemeyen tür/dosya orijinal baytlarıyla kalır.
      let buf;
      try {
        if (fs.statSync(src).size > files.MAX_BOYUT) { hatalar.push(`${ad}: 20 MB sınırını aşıyor`); continue; }
        buf = imageOpt.optimizeImage(fs.readFileSync(src), files.uzanti(ad));
      } catch (e) { hatalar.push(`${ad}: okunamadı — ${e.message}`); continue; }
      if (istemci) {
        try {
          const k = await net.upload(ad, buf, entityAd); // sunucuya yükle (firma adı okunur depo adı için)
          eklenen.push({ ad: k.ad || ad, dosyaAdi: k.dosyaAdi, boyut: k.boyut, tur: k.tur || files.turKategori(ad) });
        } catch (e) { hatalar.push(`${ad}: ${e.message || "sunucuya yüklenemedi"}`); }
      } else {
        const anahtar = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        const depo = files.depoAdi(anahtar, ad, entityAd);
        try { fs.writeFileSync(files.dosyaYolu(app, depo), buf); }
        catch (e) { hatalar.push(`${ad}: ${e.message}`); continue; }
        eklenen.push({ ad, dosyaAdi: depo, boyut: buf.length, tur: files.turKategori(ad) });
      }
    }
    return { ok: eklenen.length > 0, eklenen, hatalar };
  });

  // İşletim sistemiyle aç (istemcide önce geçici klasöre indirip açar).
  //
  // GÜVENLİK: shell.openPath bu uygulamadaki TEK yürütme çıkışıdır — dosyayı işletim sistemine
  // devreder, Windows uzantıya bakıp .exe/.bat/.lnk'i çalıştırır. Künye (tur/ad) yalnız arayüz
  // rozetidir ve veriyle birlikte gelir, yani "PDF" görünen bir künye diskteki .exe'yi
  // gösterebilir. Bu yüzden burada künyeye değil, DİSKTEKİ ADA bakılır: beyaz liste dışı hiçbir
  // şey açılmaz, dosyanın nereden geldiğinden (yükleme, yedek, sunucu) bağımsız son kapı budur.
  ipcMain.handle("files:open", async (_e, depoAd) => {
    if (!files.depoAdiGuvenliMi(depoAd)) return { ok: false, error: "Geçersiz dosya adı." };
    if (!files.izinliMi(depoAd)) return { ok: false, error: "Bu dosya türü açılamaz." };
    if (clientMi()) {
      try {
        const buf = await net.download(depoAd);
        const tmp = path.join(os.tmpdir(), depoAd); // ad yukarıda denetlendi → tmpdir dışına çıkamaz
        fs.writeFileSync(tmp, buf);
        files.motwDamgala(tmp); // ağdan geldi: Office/PDF Korumalı Görünüm ile açsın
        const err = await shell.openPath(tmp);
        return err ? { ok: false, error: err } : { ok: true };
      } catch (e) { return { ok: false, error: "Sunucudan alınamadı: " + (e.message || "bağlantı yok") }; }
    }
    if (!files.varMi(app, depoAd)) return { ok: false, error: "Dosya bulunamadı." };
    const yol = files.dosyaYolu(app, depoAd);
    files.motwDamgala(yol);
    const err = await shell.openPath(yol);
    return err ? { ok: false, error: err } : { ok: true };
  });

  // Resmi veri-URL'si olarak döndür. Servis formu çıktısı ayrı bir yazdırma penceresinde
  // açıldığı için dosya yolu veremiyoruz; resmin içeriği HTML'e gömülmek zorunda.
  ipcMain.handle("files:dataUrl", async (_e, depoAd) => {
    const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };
    const mime = MIME[files.uzanti(depoAd)];
    if (!mime) return { ok: false, error: "Yalnız resim gömülebilir." };
    try {
      let buf = null;
      if (clientMi()) buf = await net.download(depoAd);
      else if (files.varMi(app, depoAd)) buf = fs.readFileSync(files.dosyaYolu(app, depoAd));
      if (!buf) return { ok: false, error: "Dosya bulunamadı." };
      return { ok: true, dataUrl: "data:" + mime + ";base64," + Buffer.from(buf).toString("base64") };
    } catch (e) { return { ok: false, error: e.message || "okunamadı" }; }
  });

  // Farklı kaydet (indir)
  ipcMain.handle("files:download", async (_e, depoAd, onerilenAd) => {
    if (!clientMi() && !files.varMi(app, depoAd)) return { ok: false, error: "Dosya bulunamadı." };
    const kayit = await dialog.showSaveDialog(aktifPencere(), { title: "Farklı Kaydet", defaultPath: onerilenAd || depoAd });
    if (kayit.canceled || !kayit.filePath) return { ok: false, canceled: true };
    try {
      if (clientMi()) { const buf = await net.download(depoAd); fs.writeFileSync(kayit.filePath, buf); }
      else fs.copyFileSync(files.dosyaYolu(app, depoAd), kayit.filePath);
      return { ok: true };
    } catch (err) { return { ok: false, error: clientMi() ? "Sunucudan alınamadı: " + (err.message || "bağlantı yok") : err.message }; }
  });

  // Fiziksel dosyayı sil (künye state'ten kaldırılırken / çöpten kalıcı silinirken çağrılır)
  ipcMain.handle("files:remove", async (_e, depoAd) => {
    if (clientMi()) { await net.remove(depoAd); return { ok: true }; }
    return files.sil(app, depoAd);
  });

  // Künyesi kalmayan fiziksel dosyaları temizle. Yalnız dosya-barındıran PC'de (yerel/sunucu) çalışır;
  // istemcide yerel dosya yok, sunucu kendi açılışında temizler.
  ipcMain.handle("files:pruneOrphans", (_e, referencedNames) => {
    if (clientMi()) return { ok: true, istemci: true };
    return files.pruneOrphans(app, referencedNames);
  });
}

module.exports = { registerFileHandlers };
