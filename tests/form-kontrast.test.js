// Spec 0015 AC-13 (plan §5): formlarda yeni kullanılan sözlük parçaları karanlık temada 0009'un ölçüsüyle okunur.
// Formun zemini pencere zeminidir (surface). Ölçü ve eşik tests/tasarim-kontrast.test.js ile aynı: karanlık metin
// kontrastı ya WCAG AA'yı (4.5) karşılar ya da aydınlıkta zaten AA altındaki çiftte aydınlıktakinin en az %95'idir.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TOKENS } from "../src/lib/theme";

const T = Object.fromEntries(TOKENS.map(([ad, acik, koyu]) => [ad, { acik, koyu }]));
const parlaklik = (hex) => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const oran = (a, b) => { const [x, y] = [parlaklik(a), parlaklik(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const esik = (acik) => (acik >= 4.5 ? 4.5 : acik * 0.95);

// [parça, ön plan token, zemin token]
const CIFTLER = [
  ["BolumBasligi", "n400", "surface"],
  ["HataMetni", "red700", "surface"],
  ["Ipucu", "n500", "surface"],
  ["Teslim Şekli segmenti (hap, aktif)", "orTx", "surface"],
  ["Teslim Şekli segmenti (hap, pasif)", "n500", "n150"],
];

describe("AC-13: formdaki başlık, hata ve ipucu karanlık temada okunur", () => {
  it.each(CIFTLER)("%s: karanlıkta WCAG AA ya da aydınlıktakinin en az yüzde 95'i", (_p, on, zemin) => {
    expect(T[on], on).toBeTruthy();
    expect(T[zemin], zemin).toBeTruthy();
    const acik = oran(T[on].acik, T[zemin].acik), koyu = oran(T[on].koyu, T[zemin].koyu);
    expect(koyu).toBeGreaterThanOrEqual(esik(acik));
  });
  it("hata metni iki temada da AA'yı karşılar (amberden kırmızıya geçiş okunaklılığı düşürmez)", () => {
    expect(oran(T.red700.acik, T.surface.acik)).toBeGreaterThanOrEqual(4.5);
    expect(oran(T.red700.koyu, T.surface.koyu)).toBeGreaterThanOrEqual(4.5);
  });
  it("ölçülen tokenlar tasarim.jsx'te gerçekten kullanılıyor", () => {
    const kaynak = readFileSync(path.join(__dirname, "..", "src", "components", "tasarim.jsx"), "utf-8");
    for (const t of new Set(CIFTLER.flatMap(([, a, b]) => [a, b]))) expect(kaynak, t).toContain(`var(--${t},`);
  });
});
