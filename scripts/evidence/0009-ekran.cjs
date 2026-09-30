// Spec 0009 (AC-12, plan T9): bir kerelik önce/sonra ekran görüntüsü aracı. Test paketinde DEĞİL (X3).
// Kullanım: electron 0009-ekran.cjs <sayfa.html> <cikisKlasoru> [karsilastirilacakKlasor]
// Her ekranı 1440 genişlikte, aydınlık ve karanlık temada çizer, içeriğin tam yüksekliğinde yakalar ve PNG yazar.
// Karşılaştırma klasörü verilirse aynı adlı görüntüyle piksel piksel karşılaştırır ve fark eden piksel sayısını yazar.
const { app, BrowserWindow, nativeImage } = require("electron");
const fs = require("fs");
const path = require("path");

const i0 = process.argv.findIndex(a => a.endsWith(".html"));
const [html, cikis, karsi = null] = process.argv.slice(i0);
const GENISLIK = 1440;
const bekle = (ms) => new Promise(r => setTimeout(r, ms));

let win = null;
async function yukle(hash, yukseklik = 900) {
  if (!win) win = new BrowserWindow({ show: false, width: GENISLIK, height: yukseklik, webPreferences: { contextIsolation: true, offscreen: false } });
  win.setContentSize(GENISLIK, yukseklik);
  await win.loadURL("about:blank");
  await win.loadFile(html, { hash });
  for (let i = 0; i < 100; i++) { if (await win.webContents.executeJavaScript("document.body.getAttribute('data-hazir')")) break; await bekle(50); }
  await bekle(400);
}
function farkSay(a, b) {
  const sa = a.getSize(), sb = b.getSize();
  if (sa.width !== sb.width || sa.height !== sb.height) return { boyut: `${sa.width}x${sa.height} ≠ ${sb.width}x${sb.height}`, piksel: -1 };
  const x = a.toBitmap(), y = b.toBitmap();
  let n = 0;
  for (let i = 0; i < x.length; i += 4) if (x[i] !== y[i] || x[i + 1] !== y[i + 1] || x[i + 2] !== y[i + 2] || x[i + 3] !== y[i + 3]) n++;
  return { piksel: n };
}

// Spec 0016: kaydırma çubukları macOS ayarına ve bağlı giriş aygıtına göre görünüp kayboluyor ve koddan bağımsız fark
// üretiyordu; çekim ortamdan bağımsız olsun diye gizlenir. (Bu satırdan önce çekilmiş görüntülerle karşılaştırılmaz.)
app.commandLine.appendSwitch("hide-scrollbars");
app.on("window-all-closed", () => {});
app.whenReady().then(async () => {
  fs.mkdirSync(cikis, { recursive: true });
  const rapor = [];
  let cizimHatasi = 0;
  try {
    await yukle("ekran=giderler-rapor&tema=light");
    // EKRAN_ATLA="a,b": "önce" çekiminde henüz var olmayan (yalnız sonra) ekranları atlamak için.
    const atla = new Set((process.env.EKRAN_ATLA || "").split(",").filter(Boolean));
    const ekranlar = (await win.webContents.executeJavaScript("window.__EKRANLAR")).filter(e => !atla.has(e));
    for (const ekran of ekranlar) {
      for (const tema of ["light", "dark"]) {
        const hash = `ekran=${ekran}&tema=${tema}`;
        await yukle(hash);
        const h = await win.webContents.executeJavaScript("Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)");
        const yukseklik = Math.min(Math.max(900, h), 6000);
        if (yukseklik !== 900) await yukle(hash, yukseklik);
        // Boş ya da çökmüş ekran sessizce "0 fark" vermesin: hata ve boş içerik rapora ve çıkış koduna yansır.
        const durum = await win.webContents.executeJavaScript("({ hata: document.body.getAttribute('data-hata'), metin: (document.getElementById('root').innerText || '').trim().length, seritler: [...document.querySelectorAll('[role=status]')].map(e => e.textContent.trim().slice(0, 70)) })");
        const img = await win.webContents.capturePage();
        const ad = `${ekran}-${tema === "dark" ? "karanlik" : "aydinlik"}.png`;
        fs.writeFileSync(path.join(cikis, ad), img.toPNG());
        const satir = { ad, boyut: `${img.getSize().width}x${img.getSize().height}` };
        if (durum.hata || durum.metin < 20) { satir.cizimHatasi = durum.hata || "boş ekran"; cizimHatasi++; }
        if (durum.seritler.length) satir.seritler = durum.seritler; // hangi uyarı şeritlerinin çizildiği (kapsam kanıtı)
        if (karsi) {
          const eskiYol = path.join(karsi, ad);
          if (!fs.existsSync(eskiYol)) satir.fark = "önce görüntüsü yok";
          else Object.assign(satir, farkSay(nativeImage.createFromPath(eskiYol), img));
        }
        rapor.push(satir);
        console.log(JSON.stringify(satir));
      }
    }
  } catch (e) { console.error("HATA:", (e && e.stack) || e); app.exit(1); return; }
  fs.writeFileSync(path.join(cikis, "rapor.json"), JSON.stringify(rapor, null, 2));
  if (cizimHatasi) { console.error(`${cizimHatasi} ekran çizilemedi (bkz. rapor.json cizimHatasi)`); app.exit(1); return; }
  console.log("BITTI " + rapor.length);
  app.exit(0);
});
