// Regresyon: Giderler kalem listesindeki "Personel · n çalışan" grup satırı ve Anasayfa hatırlatma penceresindeki personel
// satırı arka planı sabit açık renkle (#faf7ff) yazılmıştı; karanlık temada satır beyaz kalıyor, üzerindeki açık renk yazılar
// okunmuyordu. Bileşenlerde arka plan olarak çıplak (var(--…) olmayan) çok açık bir renk kullanılmaz; tema değişkeni kullanılır.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const KOK = path.join(__dirname, "..", "src", "components");
const gez = (d) => readdirSync(d).flatMap(a => { const f = path.join(d, a); return statSync(f).isDirectory() ? gez(f) : /\.jsx?$/.test(a) ? [f] : []; });
const parlaklik = (hex) => {
  const h = hex.length === 4 ? hex.slice(1).split("").map(c => c + c).join("") : hex.slice(1);
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

describe("karanlık tema: bileşenlerde çıplak açık arka plan rengi yok", () => {
  it("background: \"#…\" biçiminde parlaklığı 0.85 üstü sabit renk kullanılmaz", () => {
    const bulunan = [];
    for (const f of gez(KOK)) {
      const s = readFileSync(f, "utf-8");
      for (const m of s.matchAll(/background:\s*["'](#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)["']/g)) {
        if (parlaklik(m[1]) > 0.85) bulunan.push(`${path.relative(KOK, f)}: ${m[1]}`);
      }
    }
    expect(bulunan).toEqual([]);
  });
  it("personel grup satırları tema değişkeniyle çizilir", () => {
    for (const f of ["gider/DonemRaporu.jsx", "gider/OdemeHatirlatma.jsx"]) {
      expect(readFileSync(path.join(KOK, f), "utf-8"), f).toMatch(/background: "var\(--purBg3\)"/);
    }
  });
});
