// Arşiv resmi yükleme-anı optimize testi — nativeImage Electron altında çalışır, bu yüzden
// ayrı bir Electron scripti. Büyük bir görseli küçültüp yeniden sıkıştırdığını, belge/bozuk
// baytlara dokunmadığını ve küçük resmi büyütmediğini doğrular.
const path = require("path");
const { nativeImage } = require("electron");
const imageOpt = require(path.join(__dirname, "..", "..", "electron", "imageOptimize.cjs"));

let fail = 0;
const check = (name, ok) => { console.log((ok ? "PASS" : "FAIL") + "  " + name); if (!ok) fail++; };

try {
  // 2500x2500 desenli görsel → JPEG (girdi; uzun kenar 2500 > MAX_PX 2000)
  const W = 2500, H = 2500;
  const bitmap = Buffer.alloc(W * H * 4);
  for (let i = 0; i < bitmap.length; i += 4) { bitmap[i] = i % 255; bitmap[i + 1] = (i >> 3) % 255; bitmap[i + 2] = 200; bitmap[i + 3] = 255; }
  const big = nativeImage.createFromBitmap(bitmap, { width: W, height: H });
  const inputJpeg = big.toJPEG(92);
  check("girdi jpeg üretildi (2500px)", Buffer.isBuffer(inputJpeg) && inputJpeg.length > 0);

  const out = imageOpt.optimizeImage(inputJpeg, "jpg");
  const sz = nativeImage.createFromBuffer(out).getSize();
  check("optimize: uzun kenar <= 2000px (küçültüldü)", Math.max(sz.width, sz.height) <= 2000);
  check("optimize: sonuç orijinalden büyük değil", out.length <= inputJpeg.length);

  // Belge (resim değil) → aynen döner
  const pdfBuf = Buffer.from("%PDF-1.4 sahte belge içeriği");
  check("pdf dokunulmaz (aynı tampon)", imageOpt.optimizeImage(pdfBuf, "pdf") === pdfBuf);

  // Bozuk resim baytları → çökmeden orijinali döndürür
  const bozuk = Buffer.from("bu bir resim değil");
  check("bozuk resim güvenle orijinali döndürür", imageOpt.optimizeImage(bozuk, "jpg") === bozuk);

  // Küçük resim (<=2000px) büyütülmez
  const small = nativeImage.createFromBitmap(Buffer.alloc(100 * 100 * 4, 180), { width: 100, height: 100 });
  const smallJpeg = small.toJPEG(90);
  const smallOut = imageOpt.optimizeImage(smallJpeg, "jpg");
  check("küçük resim büyütülmez (<= orijinal)", smallOut.length <= smallJpeg.length);
} catch (e) {
  console.error("FAIL (uncaught):", (e && e.stack) || e);
  process.exit(1);
}

if (fail) { console.error(`${fail} kontrol BASARISIZ`); process.exit(1); }
console.log("TUM KONTROLLER GECTI");
process.exit(0);
