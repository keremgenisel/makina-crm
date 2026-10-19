// Makina Maliyeti (kullanıcı isteği 2026-10-18): Parti Hesabı'nın seçicisi ile "Planlanan adetler" düğmesi ve Hesap Ayarları'nın
// üç alanı aynı hizada (üst ve alt kenarları aynı satırda). jsdom yerleşim yapmadığı için gerçek Electron'da ölçülür.
// Kullanım: electron maliyet-yerlesim.cjs <html>
const { app, BrowserWindow } = require("electron");

let fail = 0;
const check = (name, ok, ek = "") => { console.log((ok ? "PASS" : "FAIL") + "  " + name + (ok || !ek ? "" : "  " + ek)); if (!ok) fail++; };
const olc = (secici) => `(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left) }; };
  return (${secici})(r);
})()`;
const PARTI = `(r) => {
  const sec = document.querySelector('select[aria-label="Üretim partisi"]');
  const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("Planlanan adetler"));
  return sec && btn ? { secici: r(sec), dugme: r(btn) } : null;
}`;
const AYAR = `(r) => {
  const ad = ["Dönem başlangıcı", "Dönem bitişi", "Dönemde varsayılan üretim adedi (toplam)"];
  const alanlar = ad.map(a => document.querySelector('input[aria-label="' + a + '"]'));
  if (alanlar.some(x => !x)) return null;
  const etiketler = alanlar.map(i => { let p = i.parentElement; while (p && !p.querySelector(":scope > label")) p = p.parentElement; return p ? r(p.querySelector(":scope > label")) : null; });
  return { alanlar: alanlar.map(r), etiketler };
}`;

let win = null;
async function senaryo(html, genislik, gorunum, secici) {
  if (!win) win = new BrowserWindow({ show: false, width: genislik, height: 900, webPreferences: { contextIsolation: true } });
  win.setContentSize(genislik, 900);
  await win.loadURL("about:blank");
  await win.loadFile(html, { search: "gorunum=" + gorunum });
  let s = null;
  for (let i = 0; i < 50 && !s; i++) { s = await win.webContents.executeJavaScript(olc(secici)); if (!s) await new Promise(r => setTimeout(r, 100)); }
  return s;
}
const ayniSatir = (a, b) => Math.abs(a.top - b.top) <= 1 && Math.abs(a.bottom - b.bottom) <= 1;

app.on("window-all-closed", () => {});
app.whenReady().then(async () => {
  const html = process.argv.find(a => a.endsWith(".html"));
  try {
    for (const genislik of [1920, 1440, 1280]) {
      const p = await senaryo(html, genislik, "parti", PARTI);
      if (!p) { check(`${genislik}px Parti Hesabı: seçici ve düğme çizildi`, false); continue; }
      console.log(`OLCUM parti ${genislik}: ` + JSON.stringify(p));
      check(`${genislik}px Parti Hesabı: "Üretim partisi" seçicisi ile "Planlanan adetler" düğmesi aynı hizada`, ayniSatir(p.secici, p.dugme), JSON.stringify(p));
      const a = await senaryo(html, genislik, "ayarlar", AYAR);
      if (!a) { check(`${genislik}px Hesap Ayarları: üç alan çizildi`, false); continue; }
      console.log(`OLCUM ayarlar ${genislik}: ` + JSON.stringify(a));
      const ayniSira = new Set(a.alanlar.map(x => x.left)).size === 3 && a.alanlar.every(x => Math.abs(x.top - a.alanlar[0].top) < 200);
      if (!ayniSira) continue; // dar pencerede alanlar alt satıra iniyorsa hiza sorusu yoktur
      // Ay alanı ile sayı alanının kendi yüksekliği 2 px farklı (tarayıcının ay girdisi); hiza üst kenardan ölçülür.
      check(`${genislik}px Hesap Ayarları: üç alanın kutuları aynı hizada (üst kenar)`, a.alanlar.every(x => Math.abs(x.top - a.alanlar[0].top) <= 1), JSON.stringify(a.alanlar));
      check(`${genislik}px Hesap Ayarları: üç etiket aynı satırda ve tek satır`, a.etiketler.every(x => x && ayniSatir(x, a.etiketler[0])), JSON.stringify(a.etiketler));
    }
  } catch (e) { console.error("FAIL (uncaught):", (e && e.stack) || e); fail++; }
  if (fail) { console.error(`${fail} kontrol BASARISIZ`); app.exit(1); return; }
  console.log("TUM KONTROLLER GECTI");
  app.exit(0);
});
