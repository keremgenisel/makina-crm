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
    ekstreSatir: document.querySelectorAll('[data-testid="ekstre-satiri"]').length, ekstreDevir: document.querySelectorAll('[data-testid="ekstre-devir"]').length,
    // Spec 0156 AC-50: ilk satırın düğme hücresi ve Açıklama hücresi
    // Triyaj (bulgu 2): düğme hücresi rol taşıyan beş hücrelik öğenin kardeşi (aynı ızgara satırı, subgrid).
    ekstreHucre: (() => { const s = document.querySelector('[data-testid="ekstre-satiri"]'); if (!s) return null; const h = s.children, satir = s.parentElement, e = satir.querySelector('[data-testid="ekstre-satir-eylem"]');
      const d = e.querySelector("button"), dr = d && d.getBoundingClientRect(), hr = e.getBoundingClientRect(), w = (x) => x.getBoundingClientRect().width;
      return { dugmeKesik: !d || d.scrollWidth > d.clientWidth + 1 || dr.right > hr.right + 0.5 || dr.left < hr.left - 0.5, aciklama: w(h[2]), satir: w(satir),
        digerleri: [0, 1, 3, 4].reduce((t, i) => t + w(h[i]), 0) + w(e), icindeDugme: !!s.querySelector("button") }; })(),
    // 2026-11-23 bildirimi: ayrıntı satırında uzun değer (kalem adı, açıklama) etiketin üstüne biniyordu. Her açık ayrıntı
    // satırında etiket ile değer yatayda çakışmamalı ve değer satırın içinde kalmalı.
    ayrinti: [...document.querySelectorAll('[data-testid="ayrinti-satir"], [data-testid="ayrinti-kapanis"]')].map(d => {
      // Kutu değil yazının kendisi ölçülür: eski düzende etiket kutusu sıfır genişlikte kalıyor, yazı kutudan taşıyordu.
      const yazi = (el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); };
      const [, et, de] = d.children, er = yazi(et), vr = yazi(de), dr = d.getBoundingClientRect();
      return { etiket: et.textContent, cakisma: er.right > vr.left + 0.5, tasma: vr.right > dr.right + 0.5 || vr.left < dr.left - 0.5, uzun: de.textContent.length > 60 };
    }),
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
// Spec 0156 AC-53: aralık süzgeci başlangıç alanına React'ın dinlediği input olayıyla yazılır.
const aralikYaz = { tekrar: 1, adim: `(() => { const i = document.querySelector('input[type="date"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(i, "2026-05-01"); i.dispatchEvent(new Event("input", { bubbles: true })); })()` };
// İkinci satır (ilk kalemin ödemesi) açılır: "Kalem" satırının değeri uzun açıklamadır.
const ayrintiAc = { tekrar: 1, adim: `(() => { const s = document.querySelectorAll('[data-testid="ekstre-satiri"]')[1]; s && s.click(); })()` };
const onSatir = { tekrar: 9, adim: `(() => { const b = [...document.querySelectorAll("button")].find(x => /Başka yöntemle satır ekle/.test(x.textContent)); if (b && !b.disabled) b.click(); })()` };

app.on("window-all-closed", () => {});
app.whenReady().then(async () => {
  const html = process.argv.find(a => a.endsWith(".html"));
  try {
    for (const genislik of [1280, 1024]) {
      for (const [p, hazirla] of [["gider", null], ["cek", null], ["odeme", onSatir], ["ekstre", null], ["ekstre", aralikYaz], ["ekstre", ayrintiAc], ["ciro", null]]) {
        const s = await senaryo(html, p, genislik, 800, hazirla);
        const ad = `${p}${hazirla === aralikYaz ? " (aralık)" : hazirla === ayrintiAc ? " (ayrıntı)" : ""} @${genislik}px`;
        const sinir = p === "ekstre" ? 1080 : 900; // spec 0156 C4/2: geniş tablo penceresi
        if (!s) { check(`${ad}: pencere çizildi`, false); continue; }
        check(`${ad}: pencere en çok ${sinir} px ve ekrana sığıyor`, s.kap.width <= sinir + 0.5 && s.kap.left >= -0.5 && s.kap.right <= s.pencere.w + 0.5, JSON.stringify(s.kap));
        check(`${ad}: sayfada yatay kaydırma yok (AC-7)`, !s.belgeTasma);
        check(`${ad}: pencerenin içinde yatay taşma yok (AC-7)`, !s.icerTasma);
        check(`${ad}: pencere ekranın yüksekliğine sığıyor (94vh)`, s.kap.top >= -0.5 && s.kap.bottom <= s.pencere.h + 0.5 && s.kap.bottom - s.kap.top <= s.pencere.h * 0.94 + 1, JSON.stringify(s.kap));
        check(`${ad}: alt düğme satırı pencerenin altında ve ekranda (AC-3)`, s.alt.sonCocuk && s.alt.dugme && s.alt.bottom <= s.pencere.h + 0.5 && s.alt.bottom <= s.kap.bottom + 0.5, JSON.stringify(s.alt));
        if (p === "gider" && genislik === 1280) check(`${ad}: pencere tam 900 px (geniş sınıf)`, Math.abs(s.kap.width - 900) < 1, `${s.kap.width}`);
        // Spec 0156 ile (C5/2, AC-25, AC-50, AC-53): ekstre sayfalanmaz; elli satır tek listede, liste pencerenin içinde kayar,
        // belge taşmaz; düğme hücresi kesilmez, Açıklama kalan genişliği alır; aralık süzgeci listeyi süzer ve devri çizer.
        if (p === "ekstre" && !hazirla) {
          check(`${ad}: elli satır tek listede, sayfalama çubuğu yok (AC-25)`, s.ekstreSatir === 50 && !s.sayfalama, `satır: ${s.ekstreSatir}, çubuk: ${s.sayfalama}`);
          check(`${ad}: liste pencerenin içinde kayıyor (AC-25)`, s.icerikVar && s.icerikKayar);
          if (genislik === 1280) check(`${ad}: pencere tam 1080 px (AC-19)`, Math.abs(s.kap.width - 1080) < 1, `${s.kap.width}`);
          check(`${ad}: "Kalemde göster" düğmesi hücresinde kesilmeden (AC-50)`, s.ekstreHucre && !s.ekstreHucre.dugmeKesik, JSON.stringify(s.ekstreHucre));
          check(`${ad}: rol taşıyan satır öğesinde düğme yok, düğme kardeş hücrede (triyaj bulgu 2)`, s.ekstreHucre && !s.ekstreHucre.icindeDugme, JSON.stringify(s.ekstreHucre));
          check(`${ad}: Açıklama sütunu kalan genişliği alıyor (AC-50)`, s.ekstreHucre && s.ekstreHucre.aciklama >= 200 && Math.abs(s.ekstreHucre.satir - s.ekstreHucre.digerleri - s.ekstreHucre.aciklama - 50) < 2, JSON.stringify(s.ekstreHucre));
        }
        if (p === "ekstre" && hazirla === ayrintiAc) {
          check(`${ad}: ayrıntı açıldı ve uzun değerli satır var`, s.ayrinti.length > 0 && s.ayrinti.some(a => a.uzun), JSON.stringify(s.ayrinti));
          check(`${ad}: ayrıntı satırında etiket ile değer çakışmıyor, değer satırın içinde (2026-11-23 bildirimi)`, s.ayrinti.every(a => !a.cakisma && !a.tasma), JSON.stringify(s.ayrinti.filter(a => a.cakisma || a.tasma)));
        }
        if (p === "ekstre" && hazirla === aralikYaz) check(`${ad}: aralık süzgeci listeyi süzer ve devir bir kez çizilir (AC-53)`, s.ekstreSatir > 0 && s.ekstreSatir < 50 && s.ekstreDevir === 1, `satır: ${s.ekstreSatir}, devir: ${s.ekstreDevir}`);
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
