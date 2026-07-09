// Bellek içi kayan-pencere hız sınırı: login brute-force ve yazma uçları DoS koruması.
import { describe, it, expect } from "vitest";
import { rateAllow, rateHit, rateRetryAfter, rateReset, bucketAllow, bucketNext, bucketRetryAfter } from "../electron/rateLimit.cjs";

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

describe("bucket* — kalıcı sayaç çekirdeği (DB satırı rec üzerinde)", () => {
  it("bucketAllow: rec yok/dolmuş/altında serbest, max'a ulaşınca engel", () => {
    expect(bucketAllow(null, 1000, 3)).toBe(true);                          // rec yok
    expect(bucketAllow({ count: 2, reset_at: 5000 }, 1000, 3)).toBe(true);  // 2 < 3
    expect(bucketAllow({ count: 3, reset_at: 5000 }, 1000, 3)).toBe(false); // 3 >= 3
    expect(bucketAllow({ count: 9, reset_at: 5000 }, 6000, 3)).toBe(true);  // pencere geçti
  });

  it("bucketNext: pencere yoksa/dolduysa 1'den başlar, içindeyken artar (reset_at sabit)", () => {
    expect(bucketNext(null, 1000, 5000)).toEqual({ count: 1, reset_at: 6000 });
    expect(bucketNext({ count: 1, reset_at: 6000 }, 2000, 5000)).toEqual({ count: 2, reset_at: 6000 });
    expect(bucketNext({ count: 5, reset_at: 6000 }, 7000, 5000)).toEqual({ count: 1, reset_at: 12000 }); // pencere geçti → yeni
  });

  it("bucketRetryAfter: pencere içinde kalan süre, dışında 0", () => {
    expect(bucketRetryAfter({ count: 10, reset_at: 6000 }, 2000)).toBe(4000);
    expect(bucketRetryAfter({ count: 10, reset_at: 6000 }, 7000)).toBe(0);
    expect(bucketRetryAfter(null, 2000)).toBe(0);
  });
});
