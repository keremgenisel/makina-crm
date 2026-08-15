// Tema token sistemi (src/lib/theme.js) regresyon testi.
// Marka turuncusu ve karanlık-tema tint'leri artık TEK token'a bağlı (bileşenlerdeki
// yüzlerce bare #e85d1a → var(--brand) toplandı). Bir token silinir/bozulursa karanlık
// tema ve marka rengi sessizce eski dağınık haline döner — bu test onu yakalar.
import { describe, it, expect } from "vitest";
import { TOKENS } from "../src/lib/theme.js";

const map = Object.fromEntries(TOKENS.map(([n, l, d]) => [n, { l, d }]));

describe("tema token'ları", () => {
  it("her token [ad, aydınlık, karanlık] üçlüsüdür", () => {
    for (const t of TOKENS) {
      expect(Array.isArray(t)).toBe(true);
      expect(t).toHaveLength(3);
      expect(typeof t[0]).toBe("string");
      expect(typeof t[1]).toBe("string");
      expect(typeof t[2]).toBe("string");
    }
  });

  it("marka turuncusu --brand vardır ve karanlıkta açılır", () => {
    expect(map.brand).toBeTruthy();
    expect(map.brand.l).toBe("#e85d1a");        // aydınlık: bugünkü marka turuncusu
    expect(map.brand.d).toBe("#ff9d5c");        // karanlık: açık turuncu (döner)
    expect(map.brand.l).not.toBe(map.brand.d);  // temayla gerçekten değişmeli
  });

  it("koyu-turuncu metin --orTx karanlıkta açılır", () => {
    expect(map.orTx.l).toBe("#c2410c");
    expect(map.orTx.d).toBe("#ff9d5c");
  });

  it("teal/cyan tint zeminleri eklendi ve karanlıkta koyulaşır", () => {
    for (const ad of ["tealBg", "tealBr", "cyanBg"]) {
      expect(map[ad], `${ad} token'ı eksik`).toBeTruthy();
      expect(map[ad].l).not.toBe(map[ad].d); // aydınlık tint ≠ karanlık
    }
    expect(map.tealBg.l).toBe("#f0fdfa");
    expect(map.cyanBg.l).toBe("#ecfeff");
  });

  it("token adları benzersizdir", () => {
    const adlar = TOKENS.map(t => t[0]);
    expect(new Set(adlar).size).toBe(adlar.length);
  });
});
