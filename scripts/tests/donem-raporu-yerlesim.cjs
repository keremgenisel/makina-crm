// Spec 0067 R2 (AC-4, AC-23): Dönem Raporu'nun yeni kutu sırası gerçek yerleşimle ölçülür. Borç özeti kalem listesinin
// altında ve onunla aynı genişlikte (tam genişlik); kalan iki kartlı satırlarda (tür + KDV, tedarikçi + yöntem) kartlar
// üst üste binmez ve ekrandan taşmaz; sayfada yatay kaydırma yok. Kullanım: electron donem-raporu-yerlesim.cjs <html>
// Spec 0080 AC-19: sayfalanmayan yetmiş kalemli liste 236 px kenar çubuğuyla; kalem kabının yatay kayması ve yüksekliği BILGI
// olarak basılır (düzeltmesi spec 0080 X7, kabul iddiası değil); belge düzeyinde taşma yok iddiası korunur.
const { app, BrowserWindow } = require("electron");

let fail = 0;
const check = (name, ok, ek = "") => { console.log((ok ? "PASS" : "FAIL") + "  " + name + (ok || !ek ? "" : "  " + ek)); if (!ok) fail++; };

const olc = `(() => {
  const r = (id) => { const e = document.querySelector('[data-testid="' + id + '"]'); if (!e) return null; const b = e.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width }; };
  const s = { liste: r("kalem-listesi"), borc: r("borc-ozeti"), kova: r("kova-karti"), tur: r("tur-kirilimi"), kdv: r("kdv-karsilastirma"),
    tedarikci: r("tedarikci-kirilimi"), yontem: r("yontem-kirilimi"), w: innerWidth, belgeTasma: document.documentElement.scrollWidth > innerWidth + 1 };
  return s.liste && s.borc && s.tur && s.tedarikci && s.yontem && s.kdv ? s : null;
})()`;

const olcUzun = `(() => {
  const l = document.querySelector('[data-testid="kalem-listesi"]'); if (!l) return null;
  const satir = l.querySelectorAll("tbody tr").length; if (satir < 70) return null;
  const kap = l.querySelector("table").parentElement;
  return { satir, cubuk: !!l.querySelector(".page-num--active") || [...l.querySelectorAll("button")].some(b => b.textContent.includes("Sonraki")),
    kapKayar: kap.scrollWidth > kap.clientWidth + 1, kapScroll: kap.scrollWidth, kapClient: kap.clientWidth, kapYukseklik: Math.round(kap.getBoundingClientRect().height),
    belgeYukseklik: document.documentElement.scrollHeight, belgeTasma: document.documentElement.scrollWidth > innerWidth + 1 };
})()`;

// Spec 0081: yan kutular kapalı başlar. Başlıklara tıklayan yardımcı (hepsi ya da verilen kimlikler) ve tür/KDV kart boyları.
const ac = (idler) => `(() => {
  const ids = ${JSON.stringify(idler)};
  let n = 0;
  for (const id of ids) { const b = document.querySelector('[data-testid="' + id + '"] [role="button"][aria-expanded="false"]'); if (b) { b.click(); n++; } }
  return n;
})()`;
const BES = ["kova-karti", "tur-kirilimi", "kdv-karsilastirma", "tedarikci-kirilimi", "yontem-kirilimi"];
const durum = `(() => ${JSON.stringify(BES)}.map(id => document.querySelector('[data-testid="' + id + '"] [aria-expanded]')?.getAttribute("aria-expanded") ?? "yok"))()`;

// Spec 0083 AC-7 (P8): Giderler'in görünüm çubuğu (aria-label="Görünüm") düğmeleri. 1280 px'te tek satır (aynı üst kenar);
// 1024 px'te hepsi pencerenin içinde (çubuk dar pencerede iki satıra bölünebilir, R5).
const olcCubuk = `(() => {
  const d = [...document.querySelectorAll('[role="radiogroup"][aria-label="Görünüm"] [role="radio"]')].map(e => { const b = e.getBoundingClientRect(); return { t: e.textContent, top: Math.round(b.top), left: b.left, right: b.right }; });
  return { d, w: innerWidth, belgeTasma: document.documentElement.scrollWidth > innerWidth + 1 };
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
      const ad0 = `@${genislik}px`;
      if (!s) { check(`${ad0}: Dönem Raporu kartlarıyla çizildi`, false); continue; }
      {
        const c = await win.webContents.executeJavaScript(olcCubuk);
        check(`${ad0}: görünüm çubuğu yeni sırada beş sekme (spec 0083 AC-1)`, c.d.map(x => x.t).join("|") === "Dönem Raporu|Tedarikler ve Ekstre|Üretim Partileri|Makina Kârlılığı|Makina ve Model", JSON.stringify(c.d.map(x => x.t)));
        if (genislik === 1280) check(`${ad0}: görünüm çubuğu tek satır (spec 0083 AC-7)`, new Set(c.d.map(x => x.top)).size === 1, JSON.stringify(c.d));
        check(`${ad0}: görünüm çubuğunun düğmeleri pencerenin içinde, belge taşmıyor (spec 0083 AC-7)`, c.d.every(x => x.left >= -0.5 && x.right <= c.w + 0.5) && !c.belgeTasma, JSON.stringify(c));
      }
      // Spec 0081 AC-22: önce kapalı hâl (varsayılan), sonra hepsi açık (AC-23, 0067'nin ölçümü), sonra tür açık KDV kapalı (AC-28).
      const kapali = await win.webContents.executeJavaScript(durum);
      check(`${ad0}: beş kutu kapalı başlar (spec 0081 AC-6)`, kapali.every(x => x === "false"), JSON.stringify(kapali));
      const kontrol = (ad, s) => {
        check(`${ad}: sayfada yatay kaydırma yok`, !s.belgeTasma);
        check(`${ad}: sıra kalem listesi → borç özeti → kovalar (AC-1, AC-2)`, s.liste.bottom <= s.borc.top + 0.5 && s.borc.bottom <= s.kova.top + 0.5, JSON.stringify([s.liste, s.borc, s.kova]));
        check(`${ad}: borç özeti tam genişlik (AC-23)`, Math.abs(s.borc.width - s.liste.width) < 1 && Math.abs(s.borc.left - s.liste.left) < 1, `${s.borc.width} / ${s.liste.width}`);
        for (const [a, b] of [["tur", "kdv"], ["tedarikci", "yontem"]]) {
          check(`${ad}: ${a} ve ${b} kartları üst üste binmiyor (AC-4)`, !kesisir(s[a], s[b]), JSON.stringify([s[a], s[b]]));
          check(`${ad}: ${a} ve ${b} kartları ekranın içinde (AC-4)`, icinde(s[a], s.w) && icinde(s[b], s.w), JSON.stringify([s[a], s[b]]));
        }
      };
      kontrol(`${ad0} kapalı (spec 0081 AC-22)`, s);
      // Tür açık, KDV kapalı: flex-start ile kapalı KDV kartı açık tür kartının boyuna uzamaz (AC-28).
      await win.webContents.executeJavaScript(ac(["tur-kirilimi"]));
      const t = await win.webContents.executeJavaScript(olc);
      check(`${ad0}: tür açık, KDV kapalı: KDV kartı uzamaz, üst kenarlar hizalı (spec 0081 AC-28)`,
        t.kdv.bottom - t.kdv.top < (t.tur.bottom - t.tur.top) - 20 && Math.abs(t.kdv.top - t.tur.top) < 1, JSON.stringify([t.tur, t.kdv]));
      await win.webContents.executeJavaScript(ac(BES));
      const acik = await win.webContents.executeJavaScript(durum);
      check(`${ad0}: beş kutu açıldı`, acik.every(x => x === "true"), JSON.stringify(acik));
      const h = await win.webContents.executeJavaScript(olc);
      kontrol(`${ad0} hepsi açık (spec 0081 AC-23)`, h);
      check(`${ad0}: hepsi açıkken tür ve KDV üstten hizalı (spec 0081 AC-28)`, Math.abs(h.kdv.top - h.tur.top) < 1, JSON.stringify([h.tur, h.kdv]));
      console.log(`BILGI ${ad0}: hepsi açıkken tür ${Math.round(h.tur.bottom - h.tur.top)} px, KDV ${Math.round(h.kdv.bottom - h.kdv.top)} px`);
    }
    // Spec 0080 AC-19
    for (const genislik of [1280, 1024]) {
      win.setContentSize(genislik, 900);
      await win.loadFile(html, { search: "uzun=1" });
      let u = null;
      for (let i = 0; i < 50 && !u; i++) { u = await win.webContents.executeJavaScript(olcUzun); if (!u) await new Promise(r => setTimeout(r, 100)); }
      const ad = `@${genislik}px uzun liste`;
      if (!u) { check(`${ad}: yetmiş kalem tek sayfada çizildi`, false); continue; }
      check(`${ad}: yetmiş satır tek sayfada, sayfa çubuğu yok (spec 0080 R1)`, u.satir === 70 && !u.cubuk, JSON.stringify(u));
      check(`${ad}: sayfada yatay kaydırma yok (spec 0080 AC-19)`, !u.belgeTasma);
      console.log(`BILGI ${ad}: kalem kabı yatay kayar=${u.kapKayar} (scrollWidth ${u.kapScroll} / clientWidth ${u.kapClient}), kap yüksekliği ${u.kapYukseklik} px, belge yüksekliği ${u.belgeYukseklik} px`);
    }
  } catch (e) { console.error("FAIL (uncaught):", (e && e.stack) || e); fail++; }
  if (fail) { console.error(`${fail} kontrol BASARISIZ`); app.exit(1); return; }
  console.log("TUM KONTROLLER GECTI");
  app.exit(0);
});
