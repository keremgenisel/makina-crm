// Dosya arşivi resimleri için yükleme anında NAZİK optimize (yedek boyutunu küçültmek için).
// Yalnız jpg/jpeg/png; büyük foto/taramaları en fazla MAX_PX'e indirir ve JPEG %QUALITY ile yeniden
// sıkıştırır (png png kalır — kayıpsız, yalnız küçültmeden kazanç). Uzantı/tür DEĞİŞMEZ (künye
// karışmasın). Sadece sonuç GERÇEKTEN küçükse yeni tampon döner, aksi halde orijinal korunur.
// Bilinçli sınır: agresif "Resim Optimize" (250px küçük görseller) değil — belge/foto okunur kalmalı.
const { nativeImage } = require("electron");
const files = require("./files.cjs");

const MAX_PX = 2000;       // uzun kenar üst sınırı
const JPEG_QUALITY = 82;   // "kaliteyi koruyan" sıkıştırma

// buffer: dosyanın ham baytları, ext: uzantı (ör. "jpg"). Optimize edilemeyen tür → aynen döner.
function optimizeImage(buffer, ext) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return buffer;
  if (!files.optimizeEdilebilirResimMi("x." + String(ext || "").toLowerCase())) return buffer;
  try {
    const img = nativeImage.createFromBuffer(buffer);
    if (img.isEmpty()) return buffer; // bozuk/çözülemeyen resim → dokunma
    const { width, height } = img.getSize();
    const uzun = Math.max(width, height, 1);
    const out = uzun > MAX_PX
      ? img.resize({ width: Math.round(width * MAX_PX / uzun), height: Math.round(height * MAX_PX / uzun), quality: "good" })
      : img;
    const e = String(ext || "").toLowerCase();
    const enc = e === "png" ? out.toPNG() : out.toJPEG(JPEG_QUALITY);
    return (enc && enc.length > 0 && enc.length < buffer.length) ? enc : buffer;
  } catch { return buffer; }
}

module.exports = { optimizeImage, MAX_PX, JPEG_QUALITY };
