// Spec 0016 AC-11 (plan §5): yeni hata ailesi ve boş durum kutusunun başlığı karanlık temada 0009'un ölçüsüyle okunur.
// Ölçü ve eşik tests/tasarim-kontrast.test.js ile aynı: karanlık metin kontrastı ya WCAG AA'yı (4.5) karşılar ya da aydınlıkta
// zaten AA altındaki çiftte aydınlıktakinin en az %95'idir. Kenarlık/zemin oranı iki temada ≥ 1.15.
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

const METIN = [
  ["UyariSeridi (hata)", "başlık", "red700", "redBg"],
  ["UyariSeridi (hata)", "metin", "n700", "redBg"],
  ["UyariSeridi (hata)", "serbest içerik", "red800", "redBg"],
  ["BosDurum", "başlık (miras: n900)", "n900", "surface"],
  ["BosDurum", "açıklama", "n600", "surface"],
];
const KENAR = [["UyariSeridi (hata)", "redBr", "redBg"], ["BosDurum", "n300", "surface"]];

describe("AC-11: karanlık temada hata şeridi ve boş durum kutusu okunur", () => {
  it.each(METIN)("%s %s: karanlıkta WCAG AA ya da aydınlıktakinin en az yüzde 95'i", (_b, _p, on, zemin) => {
    expect(T[on], on).toBeTruthy();
    expect(T[zemin], zemin).toBeTruthy();
    expect(oran(T[on].koyu, T[zemin].koyu)).toBeGreaterThanOrEqual(esik(oran(T[on].acik, T[zemin].acik)));
  });
  it.each(KENAR)("%s kenarlığı (%s) iki temada zeminden ayırt edilir", (_b, kenar, zemin) => {
    expect(oran(T[kenar].acik, T[zemin].acik)).toBeGreaterThanOrEqual(1.15);
    expect(oran(T[kenar].koyu, T[zemin].koyu)).toBeGreaterThanOrEqual(1.15);
  });
  it("ölçülen tokenlar tasarim.jsx'te gerçekten kullanılıyor", () => {
    const kaynak = readFileSync(path.join(__dirname, "..", "src", "components", "tasarim.jsx"), "utf-8");
    for (const t of ["red700", "redBg", "redBr", "red800", "n700", "n600", "n300", "surface"]) expect(kaynak, t).toContain(`var(--${t},`);
  });
});
