// App-lock kısa PIN'e karşı artan-gecikme koruması: yanlış deneme sayısına göre bekleme.
import { describe, it, expect } from "vitest";
import { lockoutMs } from "../electron/applock.cjs";

describe("lockoutMs — yanlış deneme gecikmesi", () => {
  it("ilk 2 yanlış serbest (gecikme yok)", () => {
    expect(lockoutMs(0)).toBe(0);
    expect(lockoutMs(1)).toBe(0);
    expect(lockoutMs(2)).toBe(0);
  });
  it("3-4. yanlış 5 sn, 5-6. 30 sn", () => {
    expect(lockoutMs(3)).toBe(5000);
    expect(lockoutMs(4)).toBe(5000);
    expect(lockoutMs(5)).toBe(30000);
    expect(lockoutMs(6)).toBe(30000);
  });
  it("artan: 7-9. 2 dk, 10+ 5 dk", () => {
    expect(lockoutMs(7)).toBe(120000);
    expect(lockoutMs(9)).toBe(120000);
    expect(lockoutMs(10)).toBe(300000);
    expect(lockoutMs(50)).toBe(300000);
  });
});
