// Spec 0014 AC-13: karanlık temada seçili ve seçili olmayan öğeler ayırt edilebilir. Sayı rozeti yeni öğe; metin/zemin
// kontrastı 0009'un ölçüsüyle (tasarim-kontrast.test.js): aydınlıkta AA'yı karşılayan çift karanlıkta da AA, karşılamayan
// aydınlığın %95'i. Rozetin seçili ve seçili olmayan hâlleri de birbirinden ayırt edilir. Renkler theme.js TOKENS'tan.
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

// [parça, metin, zemin]
const ROZET = [["seçili rozet", "orTx", "ambBg3"], ["seçili olmayan rozet", "n600", "n200"]];

describe("AC-13: Karanlık temada seçili ve seçili olmayan öğeler ayırt edilebilir (sayı rozeti)", () => {
  it.each(ROZET)("%s metni (%s / %s) karanlıkta okunabilir", (_p, on, zemin) => {
    for (const t of [on, zemin]) expect(T[t], t).toBeTruthy();
    expect(oran(T[on].koyu, T[zemin].koyu)).toBeGreaterThanOrEqual(esik(oran(T[on].acik, T[zemin].acik)));
  });
  it("seçili ve seçili olmayan rozet zeminleri iki temada birbirinden ayırt edilir", () => {
    for (const tema of ["acik", "koyu"]) expect(oran(T.ambBg3[tema], T.n200[tema]), tema).toBeGreaterThanOrEqual(1.1);
  });
  it("ölçülen renkler bileşende gerçekten kullanılıyor", () => {
    const s = readFileSync(path.join(__dirname, "..", "src", "components", "tasarim.jsx"), "utf-8");
    const govde = s.slice(s.indexOf("const rozet ="), s.indexOf("const KIP ="));
    for (const t of ["orTx", "ambBg3", "n600", "n200"]) expect(govde, t).toContain(`var(--${t},`);
  });
});
