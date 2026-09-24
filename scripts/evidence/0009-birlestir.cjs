// Spec 0009 (AC-12): önce ve sonra görüntülerini yan yana tek bir küçültülmüş JPEG'de birleştirir (depoya konacak kanıt).
// Kullanım: electron 0009-birlestir.cjs <onceKlasoru> <sonraKlasoru> <cikisKlasoru> [onek=0009]
// "Önce" görüntüsü olmayan ekran (yeni ekran) yalnız "sonra" olarak tek başına konur.
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

const i0 = process.argv.findIndex(a => a.endsWith("0009-birlestir.cjs"));
const [once, sonra, cikis, onek = "0009"] = process.argv.slice(i0 + 1);
const YARIM = 720; // her yarının genişliği (px)

app.on("window-all-closed", () => {});
app.whenReady().then(async () => {
  fs.mkdirSync(cikis, { recursive: true });
  const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: false, nodeIntegration: false } });
  await win.loadURL("about:blank");
  const rapor = JSON.parse(fs.readFileSync(path.join(sonra, "rapor.json"), "utf-8"));
  for (const r of rapor) {
    const onceYol = path.join(once, r.ad);
    const yalnizSonra = !fs.existsSync(onceYol);
    const a = yalnizSonra ? null : "data:image/png;base64," + fs.readFileSync(onceYol).toString("base64");
    const b = "data:image/png;base64," + fs.readFileSync(path.join(sonra, r.ad)).toString("base64");
    const baslik = yalnizSonra ? `${r.ad.replace(/\.png$/, "")} · yalnız sonra (yeni ekran)` : `${r.ad.replace(/\.png$/, "")} · önce | sonra · fark eden piksel: ${r.piksel}`;
    const jpeg = await win.webContents.executeJavaScript(`(async () => {
      const yukle = (s) => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = s; });
      const b = await yukle(${JSON.stringify(b)});
      const a = ${a ? `await yukle(${JSON.stringify(a)})` : "null"};
      const olcek = ${YARIM} / b.width, h = Math.round(b.height * olcek), ust = 28;
      const c = document.createElement("canvas"); c.width = a ? ${YARIM} * 2 + 12 : ${YARIM}; c.height = h + ust;
      const x = c.getContext("2d");
      x.fillStyle = "#ffffff"; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = "#0f172a"; x.font = "bold 14px sans-serif"; x.fillText(${JSON.stringify(baslik)}, 8, 19);
      if (a) { x.drawImage(a, 0, ust, ${YARIM}, h); x.drawImage(b, ${YARIM} + 12, ust, ${YARIM}, h); x.fillStyle = "#e85d1a"; x.fillRect(${YARIM} + 4, ust, 4, h); }
      else x.drawImage(b, 0, ust, ${YARIM}, h);
      return c.toDataURL("image/jpeg", 0.72);
    })()`);
    fs.writeFileSync(path.join(cikis, `${onek}-` + r.ad.replace(/\.png$/, ".jpg")), Buffer.from(jpeg.split(",")[1], "base64"));
  }
  fs.writeFileSync(path.join(cikis, `${onek}-piksel-raporu.json`), JSON.stringify(rapor, null, 2) + "\n");
  console.log("BITTI " + rapor.length);
  app.exit(0);
});
