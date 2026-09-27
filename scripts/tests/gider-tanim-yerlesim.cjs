// Spec 0030 AC-13 / AC-14 (R8, R9): Ayarlar > Tekrarlayan Giderler tablosu pencere 1280 px iken yatay kaydırma olmadan
// bütün sütunları gösterir; daha dar pencerede kaydırma kalabilir ama tablo bozulmaz. Kullanım: electron gider-tanim-yerlesim.cjs <html> [--yalniz-olc]
const { app, BrowserWindow } = require("electron");

let fail = 0;
const check = (name, ok, ek = "") => { console.log((ok ? "PASS" : "FAIL") + "  " + name + (ok || !ek ? "" : "  " + ek)); if (!ok) fail++; };

const olc = `(() => {
  const tablo = [...document.querySelectorAll("table")].find(t => /Tanım/.test(t.querySelector("thead")?.textContent || ""));
  if (!tablo) return null;
  const sar = tablo.parentElement, sr = sar.getBoundingClientRect();
  const menu = [...document.querySelectorAll("div")].find(d => d.style.width === "220px");
  const mr = menu.getBoundingClientRect();
  const basliklar = [...tablo.querySelectorAll("thead th")].map(th => { const r = th.getBoundingClientRect(); return { ad: th.textContent.trim(), left: r.left, right: r.right, width: r.width }; });
  const hucreler = [...tablo.querySelectorAll("tbody td")].map(td => { const r = td.getBoundingClientRect(); return { width: r.width, kesik: td.scrollWidth > td.clientWidth + 1 }; });
  return { pencere: innerWidth, kaydirma: sar.scrollWidth > sar.clientWidth + 1, sar: { left: sr.left, right: sr.right, scrollWidth: sar.scrollWidth, clientWidth: sar.clientWidth },
    basliklar, darHucre: hucreler.filter(h => h.width < 24).length, kesikHucre: hucreler.filter(h => h.kesik).length,
    icerikMenununYaninda: sr.left >= mr.right - 0.5, satirSayisi: tablo.querySelectorAll("tbody tr").length,
    // İşlem düğmeleri her satırda yan yana (kullanıcı isteği, 2026-09-27): aynı satırdaki düğmelerin üst kenarı aynı.
    dugmelerYanYana: [...tablo.querySelectorAll("tbody tr")].every(tr => { const b = [...tr.lastElementChild.querySelectorAll("button")].map(x => Math.round(x.getBoundingClientRect().top)); return new Set(b).size <= 1; }),
    kartGenislik: sar.getBoundingClientRect().width };
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
  const html = process.argv.find(a => a.endsWith(".html"));
  const yalnizOlc = process.argv.includes("--yalniz-olc"); // eski kodda ölçüm (plan §3 adım 6: önce taşma görülür)
  try {
    for (const genislik of [1920, 1280, 1024]) {
      const s = await senaryo(html, genislik);
      const ad = `pencere ${genislik}px`;
      if (!s) { check(`${ad}: tablo çizildi`, false); continue; }
      console.log(`OLCUM ${genislik}: ` + JSON.stringify({ kaydirma: s.kaydirma, sar: s.sar, basliklar: s.basliklar.map(b => [b.ad, Math.round(b.width)]) }));
      if (yalnizOlc) continue;
      check(`${ad}: dört satır ve sekiz başlık çizildi`, s.satirSayisi === 4 && s.basliklar.length === 8, `${s.satirSayisi} satır, ${s.basliklar.length} başlık`);
      check(`${ad}: içerik Ayarlar menüsünün yanında (alta sarmadı)`, s.icerikMenununYaninda);
      check(`${ad}: hiçbir sütun ezilmedi (24 px altı hücre yok)`, s.darHucre === 0 && s.basliklar.every(b => b.width >= 24), JSON.stringify(s.basliklar));
      check(`${ad}: düzenle/sil düğmeleri yan yana`, s.dugmelerYanYana);
      // Geniş pencerede kart sağdaki boşluğa uzanır: Ayarlar içerik sütunu bu sekmede 760 değil 1200 px'e kadar büyür.
      if (genislik >= 1920) check(`${ad}: tablo 760 px sınırını aşacak kadar geniş`, s.kartGenislik > 760, `tablo ${Math.round(s.kartGenislik)} px`);
      if (genislik >= 1280 && genislik < 1920) {
        check(`${ad}: yatay kaydırma yok`, !s.kaydirma, JSON.stringify(s.sar));
        check(`${ad}: bütün başlıklar görünür alanda`, s.basliklar.every(b => b.left >= s.sar.left - 0.5 && b.right <= s.sar.right + 0.5), JSON.stringify(s.basliklar));
        check(`${ad}: hiçbir hücre içeriği kesilmiyor`, s.kesikHucre === 0, `kesik: ${s.kesikHucre}`);
      }
    }
  } catch (e) { console.error("FAIL (uncaught):", (e && e.stack) || e); fail++; }
  if (fail) { console.error(`${fail} kontrol BASARISIZ`); app.exit(1); return; }
  console.log("TUM KONTROLLER GECTI");
  app.exit(0);
});
