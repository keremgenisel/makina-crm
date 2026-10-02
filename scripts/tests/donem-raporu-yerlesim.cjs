// Spec 0067 R2 (AC-4, AC-23): Dönem Raporu'nun yeni kutu sırası gerçek yerleşimle ölçülür. Borç özeti kalem listesinin
// altında ve onunla aynı genişlikte (tam genişlik); kalan iki kartlı satırlarda (tür + KDV, tedarikçi + yöntem) kartlar
// üst üste binmez ve ekrandan taşmaz; sayfada yatay kaydırma yok. Kullanım: electron donem-raporu-yerlesim.cjs <html>
const { app, BrowserWindow } = require("electron");

let fail = 0;
const check = (name, ok, ek = "") => { console.log((ok ? "PASS" : "FAIL") + "  " + name + (ok || !ek ? "" : "  " + ek)); if (!ok) fail++; };

const olc = `(() => {
  const r = (id) => { const e = document.querySelector('[data-testid="' + id + '"]'); if (!e) return null; const b = e.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width }; };
  const s = { liste: r("kalem-listesi"), borc: r("borc-ozeti"), kova: r("kova-karti"), tur: r("tur-kirilimi"), kdv: r("kdv-karsilastirma"),
    tedarikci: r("tedarikci-kirilimi"), yontem: r("yontem-kirilimi"), w: innerWidth, belgeTasma: document.documentElement.scrollWidth > innerWidth + 1 };
  return s.liste && s.borc && s.tur && s.tedarikci && s.yontem && s.kdv ? s : null;
})()`;

const kesisir = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
const icinde = (a, w) => a.left >= -0.5 && a.right <= w + 0.5;

app.on("window-all-closed", () => {});
app.whenReady().then(async () => {
  const html = process.argv.find(a => a.endsWith(".html"));
  const win = new BrowserWindow({ show: false, width: 1280, height: 900, webPreferences: { contextIsolation: true } });
  try {
    for (const genislik of [1280, 1024]) {
      win.setContentSize(genislik, 900);
      await win.loadFile(html);
      let s = null;
      for (let i = 0; i < 50 && !s; i++) { s = await win.webContents.executeJavaScript(olc); if (!s) await new Promise(r => setTimeout(r, 100)); }
      const ad = `@${genislik}px`;
      if (!s) { check(`${ad}: Dönem Raporu kartlarıyla çizildi`, false); continue; }
      check(`${ad}: sayfada yatay kaydırma yok`, !s.belgeTasma);
      check(`${ad}: sıra kalem listesi → borç özeti → kovalar (AC-1, AC-2)`, s.liste.bottom <= s.borc.top + 0.5 && s.borc.bottom <= s.kova.top + 0.5, JSON.stringify([s.liste, s.borc, s.kova]));
      check(`${ad}: borç özeti tam genişlik (AC-23)`, Math.abs(s.borc.width - s.liste.width) < 1 && Math.abs(s.borc.left - s.liste.left) < 1, `${s.borc.width} / ${s.liste.width}`);
      for (const [a, b] of [["tur", "kdv"], ["tedarikci", "yontem"]]) {
        check(`${ad}: ${a} ve ${b} kartları üst üste binmiyor (AC-4)`, !kesisir(s[a], s[b]), JSON.stringify([s[a], s[b]]));
        check(`${ad}: ${a} ve ${b} kartları ekranın içinde (AC-4)`, icinde(s[a], s.w) && icinde(s[b], s.w), JSON.stringify([s[a], s[b]]));
      }
    }
  } catch (e) { console.error("FAIL (uncaught):", (e && e.stack) || e); fail++; }
  if (fail) { console.error(`${fail} kontrol BASARISIZ`); app.exit(1); return; }
  console.log("TUM KONTROLLER GECTI");
  app.exit(0);
});
