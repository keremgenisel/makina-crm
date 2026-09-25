// Spec 0014 AC-17 (R9): Müşteriler süzgeç çubuğu içerik genişliğiyle çizilir; dar pencerede bugünkü gibi satır sarar,
// hiçbir düğme kırpılmaz ya da pencere dışına taşmaz, düğmeler tam genişliğe yayılmaz. "Firmaya Göre Grupla" çubuğun
// dışında kendi düğmesi olarak görünür kalır. Kullanım: electron suzgec-yerlesim.cjs <suzgec.html>
const { app, BrowserWindow } = require("electron");

let fail = 0;
const check = (name, ok, ek = "") => { console.log((ok ? "PASS" : "FAIL") + "  " + name + (ok || !ek ? "" : "  " + ek)); if (!ok) fail++; };

const olc = `(() => {
  const grup = document.querySelector('[role="group"][aria-label="Müşteri süzgeci"]');
  if (!grup) return null;
  const g = grup.getBoundingClientRect();
  const dugmeler = [...grup.querySelectorAll("button")].map(b => {
    const r = b.getBoundingClientRect();
    return { ad: b.getAttribute("aria-label") || b.textContent.trim(), left: r.left, right: r.right, top: Math.round(r.top), width: r.width, kesik: b.scrollWidth > b.clientWidth + 1 };
  });
  const grupla = [...document.querySelectorAll("button")].find(b => /Firmaya Göre Grupla/.test(b.textContent));
  const gr = grupla.getBoundingClientRect();
  return { pencere: innerWidth, grup: { left: g.left, right: g.right, width: g.width }, dugmeler,
    grupla: { left: gr.left, right: gr.right, icerde: grup.contains(grupla) }, belgeTasma: document.documentElement.scrollWidth > innerWidth + 1 };
})()`;

let win = null;
async function senaryo(html, genislik) {
  if (!win) win = new BrowserWindow({ show: false, width: genislik, height: 900, webPreferences: { contextIsolation: true } });
  win.setContentSize(genislik, 900);
  await win.loadURL("about:blank");
  await win.loadFile(html);
  let s = null;
  for (let i = 0; i < 50 && !s; i++) { s = await win.webContents.executeJavaScript(olc); if (!s) await new Promise(r => setTimeout(r, 100)); }
  return s;
}

app.on("window-all-closed", () => {});
app.whenReady().then(async () => {
  const html = process.argv[process.argv.length - 1];
  try {
    for (const genislik of [1280, 900, 700, 480]) {
      const s = await senaryo(html, genislik);
      const ad = `pencere ${genislik}px`;
      if (!s) { check(`${ad}: çubuk çizildi`, false); continue; }
      check(`${ad}: beş süzgeç var`, s.dugmeler.length === 5, JSON.stringify(s.dugmeler.map(d => d.ad)));
      check(`${ad}: hiçbir düğme pencereden taşmıyor`, s.dugmeler.every(d => d.left >= -0.5 && d.right <= s.pencere + 0.5), JSON.stringify(s.dugmeler));
      check(`${ad}: hiçbir etiket kesilmiyor`, s.dugmeler.every(d => !d.kesik), JSON.stringify(s.dugmeler.filter(d => d.kesik).map(d => d.ad)));
      check(`${ad}: sayfa yatay taşmıyor`, !s.belgeTasma);
      check(`${ad}: düğmeler tam genişliğe yayılmıyor`, s.dugmeler.every(d => d.width < s.grup.width * 0.9 || s.dugmeler.length === 1), JSON.stringify(s.dugmeler.map(d => d.width)));
      check(`${ad}: 'Firmaya Göre Grupla' çubuğun dışında ve pencerede`, !s.grupla.icerde && s.grupla.left >= -0.5 && s.grupla.right <= s.pencere + 0.5, JSON.stringify(s.grupla));
      const satir = new Set(s.dugmeler.map(d => d.top)).size;
      if (genislik >= 1280) check(`${ad}: çubuk tek satır`, satir === 1, `satır: ${satir}`);
      // İçerik genişliği: geniş pencerede çubuk satırı doldurmaz (eşit genişlikte kap satırın tamamını kaplardı).
      if (genislik >= 1280) check(`${ad}: çubuk içerik genişliğinde (satırı doldurmuyor)`, s.grup.width < s.pencere * 0.8, `çubuk ${Math.round(s.grup.width)} / pencere ${s.pencere}`);
      if (genislik <= 700) check(`${ad}: çubuk satır sarıyor`, satir > 1, `satır: ${satir}`);
    }
  } catch (e) { console.error("FAIL (uncaught):", (e && e.stack) || e); fail++; }
  if (fail) { console.error(`${fail} kontrol BASARISIZ`); app.exit(1); return; }
  console.log("TUM KONTROLLER GECTI");
  app.exit(0);
});
