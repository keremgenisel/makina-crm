// Spec 0158 R12, R12/2, P1, P8 (AC-21, AC-58, AC-59): sipariş belgesi A4 dikey genişliğinde (794 px) gerçek yerleşimle ölçülür.
// Yedi sütunlu fiyatlı tabloda hiçbir hücre ve tablo taşmaz, gövde dolguyla birlikte en çok 780 px, küçük punto ve dolgu uygulanır;
// dar belgede gövde 720 px kalır. A4 dikey, kenarsız PDF basımı da denenir. Kullanım: electron siparis-belge-yerlesim.cjs <genis.html> <dar.html>
const { app, BrowserWindow } = require("electron");

let fail = 0;
const check = (name, ok, ek = "") => { console.log((ok ? "PASS" : "FAIL") + "  " + name + (ok || !ek ? "" : "  " + ek)); if (!ok) fail++; };
const olc = `(() => {
  const b = document.body, br = b.getBoundingClientRect(), cs = getComputedStyle(b);
  const tablolar = [...document.querySelectorAll(".siparis-bolum table")].map(t => {
    const sar = t.closest("[class^='sk-']");
    const tds = [...t.querySelectorAll("td")];
    return { genis: !!sar && sar.classList.contains("siparis-genis"), sutun: t.querySelectorAll("th").length,
      tasma: t.scrollWidth > t.clientWidth + 1 || t.getBoundingClientRect().right > innerWidth,
      hucreTasma: tds.filter(td => td.scrollWidth > td.clientWidth + 1).length,
      font: tds[0] ? getComputedStyle(tds[0]).fontSize : null, pad: tds[0] ? getComputedStyle(tds[0]).paddingRight : null };
  });
  // Triyaj (bulgu 1, AC-28, R19): ölçü başına satır yazan parçada her ölçünün ilk metin satırının üst kenarı, aynı satırdaki sipariş
  // adedinin üst kenarına eşit. Bölünen hücreler rowspan taşımayanlardır (Ölçü, Sipariş adedi).
  const ust = (td) => { const r = document.createRange(); r.selectNodeContents(td); const k = [...r.getClientRects()].filter(x => x.height > 0); return k.length ? Math.round(k[0].top) : null; };
  const satirSayisi = (td) => { const r = document.createRange(); r.selectNodeContents(td); return new Set([...r.getClientRects()].filter(x => x.height > 0).map(x => Math.round(x.top))).size; };
  const hiza = [];
  for (const t of document.querySelectorAll(".siparis-ust table")) {
    const trs = [...t.querySelectorAll("tbody tr")];
    trs.forEach((tr, i) => {
      const bolunmus = tr.querySelector("td[rowspan]") || (i > 0 && tr.children.length < t.querySelectorAll("th").length);
      if (!bolunmus) return;
      const [olcu, adet] = [...tr.children].filter(td => !td.hasAttribute("rowspan"));
      hiza.push({ olcu: olcu.textContent.trim(), adet: adet.textContent.trim(), olcuUst: ust(olcu), adetUst: ust(adet), olcuSatir: satirSayisi(olcu) });
    });
  }
  return { hiza, w: innerWidth, govdeSol: br.left, govdeSag: br.right, govdeGenislik: br.width, maxWidth: cs.maxWidth, belgeTasma: document.documentElement.scrollWidth > innerWidth + 1, tablolar };
})()`;

app.whenReady().then(async () => {
  const [genis, dar] = process.argv.slice(2).filter(a => a.endsWith(".html"));
  const win = new BrowserWindow({ show: false, width: 794, height: 1123, useContentSize: true, webPreferences: { contextIsolation: true } });
  try {
    await win.loadFile(genis);
    await new Promise(r => setTimeout(r, 300));
    const s = await win.webContents.executeJavaScript(olc);
    const yedi = s.tablolar.filter(t => t.sutun === 7);
    check("AC-58: pencere A4 dikey genişliğinde (794 px)", s.w === 794, String(s.w));
    check("AC-58: belgede yatay taşma yok", !s.belgeTasma);
    check("AC-58 / P1: gövde dolguyla birlikte en çok 780 px ve sayfanın içinde", s.govdeGenislik <= 780 && s.govdeSag <= 794, JSON.stringify([s.govdeGenislik, s.govdeSag]));
    check("AC-21: geniş belgede gövde genişler (max-width 748 px + dolgu)", s.maxWidth === "748px", s.maxWidth);
    check("AC-58: yedi sütunlu tablo var", yedi.length > 0, String(yedi.length));
    check("AC-58: hiçbir tablo ve hücre taşmıyor (sütun kırpılmaz)", s.tablolar.every(t => !t.tasma && t.hucreTasma === 0), JSON.stringify(s.tablolar));
    check("AC-59: yedi sütunlu tabloda punto 9,5 px ve dolgu 6 px", yedi.every(t => t.genis && t.font === "9.5px" && t.pad === "6px"), JSON.stringify(yedi));
    check("AC-59 / P8: altıdan az sütunlu tablo bugünkü puntoda (10,5 px)", s.tablolar.filter(t => t.sutun < 6).every(t => !t.genis && t.font === "10.5px"));
    const uzun = s.hiza.filter(h => /114,3/.test(h.olcu));
    check("AC-28 (triyaj bulgu 1): boru senaryosunda iki ölçü satırı ölçüldü ve birincisi dar sütunda kırıldı", uzun.length === 2 && uzun[0].olcuSatir > 1, JSON.stringify(uzun));
    check("AC-28 (triyaj bulgu 1): her ölçü satırının üst kenarı aynı satırdaki sipariş adedininkine eşit", s.hiza.length > 0 && s.hiza.every(h => h.olcuUst != null && h.olcuUst === h.adetUst), JSON.stringify(s.hiza));
    const pdf = await win.webContents.printToPDF({ printBackground: true, pageSize: "A4", margins: { marginType: "none" } });
    check("AC-58: A4 dikey, kenarsız PDF basılır", pdf && pdf.length > 1000, String(pdf?.length));
    await win.loadFile(dar);
    await new Promise(r => setTimeout(r, 200));
    const d = await win.webContents.executeJavaScript(olc);
    check("AC-22 / P8: dar belgede gövde 720 px kalır", d.maxWidth === "720px", d.maxWidth);
  } catch (e) { check("çalıştırma", false, String(e && e.stack || e)); }
  if (fail) { console.error(fail + " kontrol BASARISIZ"); app.exit(1); return; }
  console.log("TUM KONTROLLER GECTI");
  app.exit(0);
});
