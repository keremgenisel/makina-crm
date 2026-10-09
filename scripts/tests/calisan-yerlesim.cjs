// Ayarlar › Firma › Firma Çalışanları (kullanıcı isteği 2026-10-09): ekleme satırı (Ad Soyad, Resmi, SGK, Elden, Yol parası) ve
// "Ekle" düğmesi uygulamanın bugünkü pencere genişliklerinde tek sıradadır, alta geçmez; ₺ işareti kendi alanının içindedir;
// geniş pencerede kart 760 px sınırını aşıp büyür. Kullanım: electron calisan-yerlesim.cjs <html> [--yalniz-olc]
const { app, BrowserWindow } = require("electron");

let fail = 0;
const check = (name, ok, ek = "") => { console.log((ok ? "PASS" : "FAIL") + "  " + name + (ok || !ek ? "" : "  " + ek)); if (!ok) fail++; };

const olc = `(() => {
  const ad = document.querySelector('input[placeholder="Ad Soyad"]');
  if (!ad) return null;
  const satir = ad.parentElement.parentElement;
  const kart = satir.closest("section") || satir.parentElement.parentElement;
  const kr = kart.getBoundingClientRect(), sr = satir.getBoundingClientRect();
  const ogeler = [...satir.children].map(c => { const r = c.getBoundingClientRect(); return { metin: (c.textContent || c.querySelector("input")?.placeholder || "").trim(), top: Math.round(r.top), left: r.left, right: r.right }; });
  const semboller = [...satir.querySelectorAll("input[inputmode=decimal]")].map(i => {
    const kap = i.parentElement, s = [...kap.children].find(x => x !== i), ir = i.getBoundingClientRect(), sr2 = s ? s.getBoundingClientRect() : null;
    return { alan: i.getAttribute("aria-label"), icinde: !!sr2 && sr2.left >= ir.left - 0.5 && sr2.right <= ir.right + 0.5 && sr2.top >= ir.top - 0.5 && sr2.bottom <= ir.bottom + 0.5 };
  });
  return { pencere: innerWidth, kartGenislik: Math.round(kr.width), tekSira: new Set(ogeler.map(o => o.top)).size === 1, ogeler,
    tasma: sr.right > kr.right + 0.5 || satir.scrollWidth > satir.clientWidth + 1, semboller };
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
  const yalnizOlc = process.argv.includes("--yalniz-olc");
  try {
    for (const genislik of [1920, 1440, 1280]) {
      const s = await senaryo(html, genislik);
      const ad = `pencere ${genislik}px`;
      if (!s) { check(`${ad}: ekleme satırı çizildi`, false); continue; }
      console.log(`OLCUM ${genislik}: ` + JSON.stringify({ kart: s.kartGenislik, tekSira: s.tekSira, ogeler: s.ogeler.map(o => [o.metin, o.top, Math.round(o.right - o.left)]) }));
      if (yalnizOlc) continue;
      check(`${ad}: altı öğe (beş alan + Ekle) çizildi`, s.ogeler.length === 6, JSON.stringify(s.ogeler.map(o => o.metin)));
      check(`${ad}: ekleme satırı ve Ekle düğmesi tek sırada`, s.tekSira, JSON.stringify(s.ogeler.map(o => [o.metin, o.top])));
      check(`${ad}: satır kartın içinde, taşma yok`, !s.tasma);
      check(`${ad}: ₺ işaretleri kendi alanlarının içinde`, s.semboller.length === 4 && s.semboller.every(x => x.icinde), JSON.stringify(s.semboller));
      if (genislik >= 1920) check(`${ad}: kart 760 px sınırını aşıp sağdaki boşluğa büyür (1000 px üstü)`, s.kartGenislik > 1000, `kart ${s.kartGenislik} px`);
    }
  } catch (e) { console.error("FAIL (uncaught):", (e && e.stack) || e); fail++; }
  if (fail) { console.error(`${fail} kontrol BASARISIZ`); app.exit(1); return; }
  console.log("TUM KONTROLLER GECTI");
  app.exit(0);
});
