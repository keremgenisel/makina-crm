// Spec 0007 AC-19 / AC-20 (R16): bayi detay modalının eylem satırı gerçek tarayıcı motorunda ölçülür.
// Geniş pencerede dört buton tek satırda; dar pencerede (modal ekranla birlikte daralırken) hiçbir buton kırpılmaz,
// pencere dışına taşmaz ve tıklanabilir kalır; etiketler kesilmez. Kullanım: electron bayi-modal-layout.cjs <index.html>
const { app, BrowserWindow } = require("electron");

let fail = 0;
const check = (name, ok, ek = "") => { console.log((ok ? "PASS" : "FAIL") + "  " + name + (ok || !ek ? "" : "  " + ek)); if (!ok) fail++; };

const olc = `(() => {
  const kapat = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Kapat");
  if (!kapat) return null;
  const satir = kapat.parentElement;
  const kutu = satir.closest(".modal-backdrop").firstElementChild;
  const k = kutu.getBoundingClientRect();
  const butonlar = [...satir.querySelectorAll("button")].map(b => {
    const r = b.getBoundingClientRect();
    const hedef = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { ad: b.textContent.trim(), left: r.left, right: r.right, top: r.top, width: r.width,
      metinKesik: b.scrollWidth > b.clientWidth + 1, tiklanir: !!hedef && (hedef === b || b.contains(hedef)) };
  });
  return { kutu: { left: k.left, right: k.right }, pencere: innerWidth, butonlar };
})()`;

// Tek pencere: her senaryoda boyutlanır ve sayfa (adres parçasıyla) baştan yüklenir. Pencereyi her seferinde kapatıp
// açmak ikinci yüklemeyi ERR_FAILED ile kesiyordu.
let win = null;
async function senaryo(html, hash, genislik) {
  if (!win) win = new BrowserWindow({ show: false, width: genislik, height: 900, webPreferences: { contextIsolation: true } });
  win.setContentSize(genislik, 900);
  await win.loadURL("about:blank");
  await win.loadFile(html, { hash });
  let s = null;
  for (let i = 0; i < 50 && !s; i++) { s = await win.webContents.executeJavaScript(olc); if (!s) await new Promise(r => setTimeout(r, 100)); }
  return s;
}

app.on("window-all-closed", () => {});
app.whenReady().then(async () => {
  const html = process.argv[process.argv.length - 1];
  try {
    for (const [hash, adet] of [["4", 4], ["3", 3]]) {
      for (const genislik of [1280, 900, 700, 480]) {
        const s = await senaryo(html, hash, genislik);
        const ad = `${adet} buton, pencere ${genislik}px`;
        if (!s) { check(`${ad}: modal çizildi`, false); continue; }
        check(`${ad}: ${adet} buton var`, s.butonlar.length === adet, JSON.stringify(s.butonlar.map(b => b.ad)));
        const kirpik = s.butonlar.filter(b => b.left < s.kutu.left - 0.5 || b.right > s.kutu.right + 0.5 || b.left < -0.5 || b.right > s.pencere + 0.5);
        check(`${ad}: hiçbir buton modaldan/pencereden taşmıyor (kırpılmıyor)`, kirpik.length === 0, JSON.stringify(kirpik));
        check(`${ad}: hiçbir etiket kesilmiyor`, s.butonlar.every(b => !b.metinKesik), JSON.stringify(s.butonlar.filter(b => b.metinKesik).map(b => b.ad)));
        check(`${ad}: her buton tıklanabilir`, s.butonlar.every(b => b.tiklanir), JSON.stringify(s.butonlar.filter(b => !b.tiklanir).map(b => b.ad)));
        if (genislik >= 900) check(`${ad}: butonlar tek satırda`, new Set(s.butonlar.map(b => Math.round(b.top))).size === 1, JSON.stringify(s.butonlar.map(b => b.top)));
        // Hiza: son buton (Kapat) sağa yaslı kalır.
        const son = s.butonlar[s.butonlar.length - 1];
        check(`${ad}: satır sağa yaslı (Kapat en sağda)`, son.ad === "Kapat" && s.butonlar.every(b => b.right <= son.right + 0.5));
      }
    }
  } catch (e) { console.error("FAIL (uncaught):", (e && e.stack) || e); fail++; }
  if (fail) { console.error(`${fail} kontrol BASARISIZ`); app.exit(1); return; }
  console.log("TUM KONTROLLER GECTI");
  app.exit(0);
});
