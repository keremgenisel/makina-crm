// Spec 0009 AC-8 (plan T8): karanlık temada altı yapı taşının metni okunabilir, kenarlıkları görünür.
// Renkler src/lib/theme.js TOKENS tablosundan ([ad, aydınlık, karanlık]) okunur; jsdom renk hesaplamadığı için
// ölçü WCAG bağıl parlaklık kontrastıdır. Eşik (spec R3): karanlık metin kontrastı ya WCAG AA'yı (4.5) karşılar ya da,
// bugün aydınlıkta da AA altında olan çiftlerde, aydınlıktakinin en az %95'idir (bugünkü görünüm taban). Yalnız "%95"
// kuralı çok yüksek kontrastlı çiftleri (ör. 17.9 → 13.9) okunaklı oldukları hâlde düşürüyordu. Kenarlık/zemin
// oranı iki temada ≥ 1.15.
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
// Spec R3 eşiği (triyaj bulgu 2): aydınlıkta AA'yı (4.5) karşılayan çift karanlıkta da AA'yı karşılar; aydınlıkta zaten
// AA altında kalan çift karanlıkta aydınlıktakinin en az %95'i olur. (Eski min(4.5, %95) formülü aydınlığı 4.5–4.74
// arasındaki bir çiftin karanlıkta 4.5 altına düşmesine izin veriyordu.)
const esik = (acik) => (acik >= 4.5 ? 4.5 : acik * 0.95);

// [bileşen, parça, ön plan token, zemin token]
const METIN = [
  ["Segment (hap)", "aktif", "orTx", "surface"], ["Segment (hap)", "pasif", "n500", "n150"],
  ["Segment (cerceve)", "seçili", "n900", "ambBg3"], ["Segment (cerceve)", "seçili değil", "n900", "surface"],
  ["KartBolum (ayar)", "başlık", "n900", "surface"], ["KartBolum (kart)", "etiket başlık", "n400", "surface"],
  ["KartBolum (kart)", "başlık", "n900", "surface"], ["KartBolum (kart)", "alt başlık", "n500", "surface"],
  ["BosDurum", "metin", "n600", "surface"],
  ["UyariSeridi (bilgi)", "başlık", "blu700", "bluBg"], ["UyariSeridi (bilgi)", "metin", "n700", "bluBg"],
  ["UyariSeridi (uyari)", "başlık", "amb700", "ambBg"], ["UyariSeridi (uyari)", "metin", "n700", "ambBg"],
  ["UyariSeridi (basari)", "başlık", "grn700", "grnBg"], ["UyariSeridi (basari)", "metin", "n700", "grnBg"],
  ["HataMetni", "metin", "red700", "surface"], ["Ipucu", "metin", "n500", "surface"],
];
const KENAR = [
  ["Segment (hap)", "n200", "surface"], ["Segment (cerceve)", "brand", "ambBg3"], ["Segment (cerceve)", "n200", "surface"],
  ["KartBolum (kart)", "n200", "surface"], ["BosDurum", "n300", "surface"],
  ["UyariSeridi (bilgi)", "bluBr", "bluBg"], ["UyariSeridi (uyari)", "ambBr", "ambBg"], ["UyariSeridi (basari)", "grnBr", "grnBg"],
];

describe("AC-8: Karanlık temada altı bileşenin de metni okunabilir ve kenarlıkları görünür", () => {
  it("kullanılan her token temada tanımlı (tanımsızsa karanlıkta aydınlık yedek renge düşerdi)", () => {
    for (const [, , a, b] of METIN) for (const t of [a, b]) expect(T[t], t).toBeTruthy();
    for (const [, a, b] of KENAR) for (const t of [a, b]) expect(T[t], t).toBeTruthy();
  });
  it.each(METIN)("%s %s: karanlıkta WCAG AA ya da aydınlıktakinin en az yüzde 95'i", (_b, _p, on, zemin) => {
    const acik = oran(T[on].acik, T[zemin].acik), koyu = oran(T[on].koyu, T[zemin].koyu);
    expect(koyu).toBeGreaterThanOrEqual(esik(acik));
  });
  it("eşik sınırları: aydınlıkta AA karşılanıyorsa karanlıkta 4.5 zorunlu; AA altındaysa aydınlığın yüzde 95'i", () => {
    expect(esik(4.74)).toBe(4.5);
    expect(esik(4.6)).toBe(4.5); // eski min(4.5, 0.95 × 4.6) = 4.37 idi
    expect(4.4 >= esik(4.6)).toBe(false); // aydınlık 4.6, karanlık 4.4 → artık başarısız
    expect(esik(4.5)).toBe(4.5);
    expect(esik(4.34)).toBeCloseTo(4.123, 3);
    expect(esik(2.56)).toBeCloseTo(2.432, 3);
  });
  it.each(KENAR)("%s kenarlığı (%s) iki temada zeminden ayırt edilir", (_b, kenar, zemin) => {
    expect(oran(T[kenar].acik, T[zemin].acik)).toBeGreaterThanOrEqual(1.15);
    expect(oran(T[kenar].koyu, T[zemin].koyu)).toBeGreaterThanOrEqual(1.15);
  });
  it("ölçülen token çiftleri bileşen kaynağında gerçekten kullanılıyor (tablo kaynaktan kopmasın)", () => {
    const kaynak = readFileSync(path.join(__dirname, "..", "src", "components", "tasarim.jsx"), "utf-8");
    for (const t of new Set([...METIN.flatMap(([, , a, b]) => [a, b]), ...KENAR.flatMap(([, a, b]) => [a, b])])) expect(kaynak, t).toContain(`var(--${t},`);
  });
});
