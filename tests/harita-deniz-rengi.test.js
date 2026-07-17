// Deniz rengi isteği: açık modda harita denizi yumuşak turkuaz olsun, KOYU moda dokunulmasın.
// Token tablosu [ad, açık, koyu] üçlüleri; hDeniz'in açık değeri turkuaz (yeşil+mavi baskın,
// kırmızıdan yüksek), koyu değeri ise eski warm-dark (#171410) kalmalı.
import { describe, it, expect } from "vitest";
import { TOKENS } from "../src/lib/theme.js";

const hex = (h) => ({
  r: parseInt(h.slice(1, 3), 16),
  g: parseInt(h.slice(3, 5), 16),
  b: parseInt(h.slice(5, 7), 16),
});

describe("hDeniz (harita deniz rengi)", () => {
  const satir = TOKENS.find(([ad]) => ad === "hDeniz");

  it("token var", () => {
    expect(satir).toBeTruthy();
  });

  it("açık mod deniz-cyanı: yeşil ve mavi kırmızıdan belirgin yüksek, mavi eğilimli (yeşile kaçmaz)", () => {
    const c = hex(satir[1]);
    // Cyan ailesi: hem yeşil hem mavi kırmızıdan net yüksek. Eski gri-mavi #eef3f7'de bu
    // farklar yalnız ~5/~9; eşikler griye dönüşü kırar.
    expect(c.g - c.r).toBeGreaterThanOrEqual(12);
    expect(c.b - c.r).toBeGreaterThanOrEqual(15);
    // Deniz mavisi: mavi yeşile eşit/üstün olmalı. Fazla yeşil ton (ör. #d6f0ec, g>b) burada kırılır.
    expect(c.b).toBeGreaterThanOrEqual(c.g);
    // Yumuşak (koyu değil) bir ton — açık modda arka plan
    expect(c.g).toBeGreaterThan(200);
  });

  it("koyu moda dokunulmadı (#171410)", () => {
    expect(satir[2].toLowerCase()).toBe("#171410");
  });
});
