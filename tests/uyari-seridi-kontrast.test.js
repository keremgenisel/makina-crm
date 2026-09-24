// Spec 0011 AC-10: karanlık temada serbest içerikli uyarı şeridinin metni okunabilir, kenarlığı görünür.
// 0009'un ölçüsü (tasarim-kontrast.test.js, spec 0009 R3): karanlık metin kontrastı, aydınlıkta WCAG AA'yı (4.5)
// karşılayan çiftte 4.5, karşılamayanda aydınlığın %95'i; kenarlık/zemin iki temada ≥ 1.15. Renkler theme.js TOKENS'tan.
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

// [aile, serbest metin rengi, zemin, kenarlık]
const AILE = [["bilgi", "blu800", "bluBg", "bluBr"], ["uyari", "amb800", "ambBg", "ambBr"], ["basari", "grn800", "grnBg", "grnBr"]];

describe("AC-10: Karanlık temada serbest içerikli şeridin metni okunabilir ve kenarlığı görünür", () => {
  it.each(AILE)("%s: metin (%s) karanlıkta okunabilir, kenarlık iki temada görünür", (_a, metin, zemin, kenar) => {
    for (const t of [metin, zemin, kenar]) expect(T[t], t).toBeTruthy();
    const acik = oran(T[metin].acik, T[zemin].acik), koyu = oran(T[metin].koyu, T[zemin].koyu);
    expect(koyu).toBeGreaterThanOrEqual(esik(acik));
    expect(koyu).toBeGreaterThanOrEqual(4.5); // bugünkü değerlerle üç aile de AA üstünde
    expect(oran(T[kenar].acik, T[zemin].acik)).toBeGreaterThanOrEqual(1.15);
    expect(oran(T[kenar].koyu, T[zemin].koyu)).toBeGreaterThanOrEqual(1.15);
  });
  it("ölçülen renkler bileşende gerçekten kullanılıyor (tablo kaynaktan kopmasın)", () => {
    const kaynak = readFileSync(path.join(__dirname, "..", "src", "components", "tasarim.jsx"), "utf-8");
    for (const [, metin, zemin, kenar] of AILE) for (const t of [metin, zemin, kenar]) expect(kaynak, t).toContain(`var(--${t},`);
  });
});
