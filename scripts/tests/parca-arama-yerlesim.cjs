// Spec 0160 AC-32 (R2/5, P10): 139 karakterlik adlı parçada alt satır adın altına iner ve sonuç paneli yatay kaymaz; iki arama
// paneli (SearchPick: Evrak'ın penceresi, SearchSelect: Stoğa Parça Ekle) 1280 ve 1024 px pencerede ölçülür. jsdom yerleşim
// yapmadığı için ölçüm burada. Kullanım: electron parca-arama-yerlesim.cjs <html>
const { app, BrowserWindow } = require("electron");

let fail = 0;
const check = (name, ok, ek = "") => { console.log((ok ? "PASS" : "FAIL") + "  " + name + (ok || !ek ? "" : "  " + ek)); if (!ok) fail++; };
const panelOlc = (secici) => `(() => {
  const ops = [...document.querySelectorAll(${JSON.stringify(secici)})];
  const uzun = ops.find(o => o.firstElementChild && o.firstElementChild.textContent.startsWith("100_AYNA"));
  if (!uzun) return null;
  const panel = uzun.parentElement, ad = uzun.firstElementChild, alt = uzun.querySelector('[data-testid="arama-alt-satir"]');
  const ar = ad.getBoundingClientRect(), lr = alt.getBoundingClientRect(), pr = panel.getBoundingClientRect();
  return { yatayKayma: panel.scrollWidth > panel.clientWidth + 1, altinda: lr.top >= ar.bottom - 0.5, sarili: ar.height > 22,
    icinde: lr.right <= pr.right + 0.5 && ar.right <= pr.right + 0.5, alt: alt.textContent,
    belgeKayma: document.documentElement.scrollWidth > innerWidth + 1 };
})()`;
// Gizli pencerede odak olayı gelmeyebilir: SearchPick tıklamayla açılır (onClick), SearchSelect düğmesine tıklanır.
const SP_AC = `(() => { const i = document.querySelector('[data-testid="kalem-sec-penceresi"] input'); if (i) i.click(); return !!i; })()`;
const SS_AC = `(() => { const b = [...document.querySelectorAll('[data-kutu="stok"] button')].find(x => x.textContent.includes("Parça seçin...")); if (b) b.click(); return !!b; })()`;
const bekle = async (win, js) => { let s = null; for (let i = 0; i < 60 && !s; i++) { s = await win.webContents.executeJavaScript(js); if (!s) await new Promise(r => setTimeout(r, 100)); } return s; };

app.on("window-all-closed", () => {});
app.whenReady().then(async () => {
  const html = process.argv.find(a => a.endsWith(".html"));
  const win = new BrowserWindow({ show: false, width: 1280, height: 900, webPreferences: { contextIsolation: true } });
  try {
    for (const w of [1280, 1024]) {
      win.setContentSize(w, 900);
      await win.loadURL("about:blank");
      await win.loadFile(html);
      await bekle(win, SP_AC);
      const sp = await bekle(win, panelOlc(".sp-option"));
      await win.webContents.executeJavaScript(SS_AC);
      const ss = await bekle(win, panelOlc(".ss-option"));
      if (!sp || !ss) { check(`${w}: paneller açıldı`, false, JSON.stringify({ sp: !!sp, ss: !!ss })); continue; }
      console.log(JSON.stringify({ w, sp, ss }));
      const s = { belgeKayma: sp.belgeKayma || ss.belgeKayma };
      for (const [ad, p] of [["SearchPick", sp], ["SearchSelect", ss]]) {
        check(`${w} ${ad}: panel yatay kaymaz`, !p.yatayKayma);
        check(`${w} ${ad}: alt satır adın altında`, p.altinda);
        check(`${w} ${ad}: uzun ad sarar (birden çok satır)`, p.sarili);
        check(`${w} ${ad}: ad ve alt satır panelin içinde`, p.icinde);
        check(`${w} ${ad}: alt satır metni`, p.alt === "UZ-1 · Ø30", p.alt);
      }
      check(`${w}: belge yatay taşmaz`, !s.belgeKayma);
    }
  } catch (e) { console.error(e); fail++; }
  if (fail) { console.log(`${fail} KONTROL BASARISIZ`); app.exit(1); return; }
  console.log("TUM KONTROLLER GECTI");
  app.exit(0);
});
