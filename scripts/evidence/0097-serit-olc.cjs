// Kullanım: node scripts/evidence/0097-serit-olc.cjs <onceKlasoru> <sonraKlasoru>
// Spec 0097 AC-58 (plan P13): önce/sonra görüntülerinde farklı piksellerin sınır kutusu. Şerit dışı fark yoksa kutu şeridin içindedir.
const fs = require("fs"); const path = require("path");
const { PNG } = require("pngjs");
const [once, sonra] = process.argv.slice(2, 4);
const sonuc = {};
for (const f of fs.readdirSync(sonra).filter(f => /^maliyet-(modeller|katsayi|bos-|ayarlar)/.test(f) && f.endsWith(".png"))) {
  const a = PNG.sync.read(fs.readFileSync(path.join(once, f))), b = PNG.sync.read(fs.readFileSync(path.join(sonra, f)));
  let y0 = Infinity, y1 = -1, x0 = Infinity, x1 = -1;
  const h = Math.min(a.height, b.height);
  for (let y = 0; y < h; y++) for (let x = 0; x < a.width; x++) {
    const i = (y * a.width + x) * 4;
    if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) { if (y < y0) y0 = y; if (y > y1) y1 = y; if (x < x0) x0 = x; if (x > x1) x1 = x; }
  }
  sonuc[f] = { boyutAyni: a.height === b.height && a.width === b.width, kutu: y1 < 0 ? null : { x0, x1, y0, y1 } };
}
console.log(JSON.stringify(sonuc, null, 1));
