// Bellek içi kayan-pencere hız sınırı: login brute-force ve yazma uçları DoS koruması.
import { describe, it, expect } from "vitest";
import { rateAllow, rateHit, rateRetryAfter, rateReset } from "../electron/rateLimit.cjs";

describe("rateLimit — kayan pencere", () => {
  it("max'a kadar izin verir, sonra reddeder", () => {
    const st = new Map();
    const now = 1000;
    for (let i = 0; i < 3; i++) {
      expect(rateAllow(st, "k", now, 3, 5000)).toBe(true);
      rateHit(st, "k", now, 5000);
    }
    expect(rateAllow(st, "k", now, 3, 5000)).toBe(false); // 3 istek doldu, 4. reddedilir
  });

  it("pencere dolunca yeniden serbest bırakır", () => {
    const st = new Map();
    rateHit(st, "k", 1000, 5000); rateHit(st, "k", 1000, 5000); rateHit(st, "k", 1000, 5000);
    expect(rateAllow(st, "k", 1000, 3, 5000)).toBe(false);
    expect(rateAllow(st, "k", 6001, 3, 5000)).toBe(true); // pencere (5000ms) geçti
  });

  it("retryAfter kalan süreyi verir, pencere dışında 0", () => {
    const st = new Map();
    rateHit(st, "k", 1000, 5000);
    expect(rateRetryAfter(st, "k", 2000)).toBe(4000); // 1000+5000 - 2000
    expect(rateRetryAfter(st, "k", 7000)).toBe(0);    // pencere bitti
  });

  it("farklı key'ler bağımsız; reset sayacı siler", () => {
    const st = new Map();
    rateHit(st, "a", 1000, 5000);
    expect(rateAllow(st, "b", 1000, 1, 5000)).toBe(true); // b ayrı
    rateReset(st, "a");
    expect(rateAllow(st, "a", 1000, 1, 5000)).toBe(true); // sıfırlandı
  });
});
