// Spec 0050 R7, R13, R19 (AC-3, AC-7, AC-19): Sınıf 1 form pencereleri gerçek yerleşimle ölçülür. Pencere en çok 900 px ve
// ekrana sığar; sayfada ve pencerenin içinde yatay kaydırma yok; alt düğme satırı ekranın içinde ve pencerenin altında;
// uzun içerik (10 satırlı ödeme penceresi) pencerenin İÇİNDE kaydırılır. Triyaj: en geniş sabit içerikli ekstre tablosu ve
// ciro/çek yaz dağıtım ızgarası da ölçülür. Kullanım: electron form-pencere-yerlesim.cjs <html>
const { app, BrowserWindow } = require("electron");

let fail = 0;
const check = (name, ok, ek = "") => { console.log((ok ? "PASS" : "FAIL") + "  " + name + (ok || !ek ? "" : "  " + ek)); if (!ok) fail++; };

const olc = `(() => {
  const k = document.querySelector(".modal-backdrop > div");
  if (!k) return null;
  const r = k.getBoundingClientRect();
  const cocuklar = [...k.children];
  const icerik = cocuklar.find(c => ["auto", "scroll"].includes(getComputedStyle(c).overflowY)) || null;
  const alt = cocuklar[cocuklar.length - 1], ar = alt.getBoundingClientRect();
  const kaydet = [...alt.querySelectorAll("button")].pop();
  return { pencere: { w: innerWidth, h: innerHeight }, kap: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width },
    icerTasma: k.scrollWidth > k.clientWidth + 1 || (icerik ? icerik.scrollWidth > icerik.clientWidth + 1 : false),
    icerikKayar: icerik ? icerik.scrollHeight > icerik.clientHeight + 1 : false, icerikVar: !!icerik,
    alt: { top: ar.top, bottom: ar.bottom, sonCocuk: alt !== icerik, dugme: !!kaydet },
    belgeTasma: document.documentElement.scrollWidth > innerWidth + 1,
    satir: document.querySelectorAll('[aria-label^="Ödeme tutarı"]').length,
    ekstreSatir: document.querySelectorAll('[data-testid="ekstre-satiri"]').length,
    sayfalama: [...document.querySelectorAll("button")].some(b => b.textContent.includes("Sonraki ›")), ciroKalem: document.querySelectorAll('[data-testid="ciro-kalemi"]').length };
})()`;

let win = null;
async function senaryo(html, p, genislik, yukseklik, hazirla = null) {
  if (!win) win = new BrowserWindow({ show: false, width: genislik, height: yukseklik, webPreferences: { contextIsolation: true } });
  win.setContentSize(genislik, yukseklik);
  await win.loadURL("about:blank");
  await win.loadFile(html, { query: { p } });
  let s = null;
  for (let i = 0; i < 50 && !s; i++) { s = await win.webContents.executeJavaScript(olc); if (!s) await new Promise(r => setTimeout(r, 100)); }
  if (s && hazirla) {
    for (let i = 0; i < hazirla.tekrar; i++) { await win.webContents.executeJavaScript(hazirla.adim); await new Promise(r => setTimeout(r, 60)); }
    s = await win.webContents.executeJavaScript(olc);
  }
  return s;
}
// Ödeme penceresine dokuz satır daha ekle (en çok 10, 0041); her tıklama ayrı (React güncellemesi araya girsin).
const onSatir = { tekrar: 9, adim: `(() => { const b = [...document.querySelectorAll("button")].find(x => /Başka yöntemle satır ekle/.test(x.textContent)); if (b && !b.disabled) b.click(); })()` };

app.on("window-all-closed", () => {});
app.whenReady().then(async () => {
  const html = process.argv.find(a => a.endsWith(".html"));
  try {
    for (const genislik of [1280, 1024]) {
      for (const [p, hazirla] of [["gider", null], ["cek", null], ["odeme", onSatir], ["ekstre", null], ["ciro", null]]) {
        const s = await senaryo(html, p, genislik, 800, hazirla);
        const ad = `${p} @${genislik}px`;
        if (!s) { check(`${ad}: pencere çizildi`, false); continue; }
        check(`${ad}: pencere en çok 900 px ve ekrana sığıyor`, s.kap.width <= 900.5 && s.kap.left >= -0.5 && s.kap.right <= s.pencere.w + 0.5, JSON.stringify(s.kap));
        check(`${ad}: sayfada yatay kaydırma yok (AC-7)`, !s.belgeTasma);
        check(`${ad}: pencerenin içinde yatay taşma yok (AC-7)`, !s.icerTasma);
        check(`${ad}: pencere ekranın yüksekliğine sığıyor (94vh)`, s.kap.top >= -0.5 && s.kap.bottom <= s.pencere.h + 0.5 && s.kap.bottom - s.kap.top <= s.pencere.h * 0.94 + 1, JSON.stringify(s.kap));
        check(`${ad}: alt düğme satırı pencerenin altında ve ekranda (AC-3)`, s.alt.sonCocuk && s.alt.dugme && s.alt.bottom <= s.pencere.h + 0.5 && s.alt.bottom <= s.kap.bottom + 0.5, JSON.stringify(s.alt));
        if (p === "gider" && genislik === 1280) check(`${ad}: pencere tam 900 px (geniş sınıf)`, Math.abs(s.kap.width - 900) < 1, `${s.kap.width}`);
        // Spec 0062 R31 ile güncellendi: ekstre pencere içi liste olarak 5 satırla sayfalanır (sekiz satırlık veri iki sayfa).
        if (p === "ekstre") check(`${ad}: ekstre tablosu satırlarıyla ve sayfalama çubuğuyla çizildi`, s.ekstreSatir === 5 && s.sayfalama, `satır: ${s.ekstreSatir}, çubuk: ${s.sayfalama}`);
        if (p === "ciro") check(`${ad}: dağıtım ızgarası kalemleriyle çizildi`, s.ciroKalem === 4, `kalem: ${s.ciroKalem}`);
        if (p === "odeme") {
          check(`${ad}: on ödeme satırı çizildi`, s.satir === 10, `satır: ${s.satir}`);
          check(`${ad}: uzun içerik pencerenin içinde kaydırılıyor (AC-19)`, s.icerikVar && s.icerikKayar);
        }
      }
    }
  } catch (e) { console.error("FAIL (uncaught):", (e && e.stack) || e); fail++; }
  if (fail) { console.error(`${fail} kontrol BASARISIZ`); app.exit(1); return; }
  console.log("TUM KONTROLLER GECTI");
  app.exit(0);
});
