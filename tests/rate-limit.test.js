// Bellek içi kayan-pencere hız sınırı: login brute-force ve yazma uçları DoS koruması.
import { describe, it, expect } from "vitest";
import { rateAllow, rateHit, rateRetryAfter, rateReset, bucketAllow, bucketNext, bucketRetryAfter, escalatingBlockedMs, escalatingNext } from "../electron/rateLimit.cjs";

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

describe("escalating* — kademeli (artan) kilit", () => {
  // app-lock ile aynı basamaklar: <3 serbest, 3-4→5sn, 5-6→30sn, 7-9→2dk, 10+→5dk
  const lockoutMs = (c) => (c < 3 ? 0 : c < 5 ? 5000 : c < 7 ? 30000 : c < 10 ? 120000 : 300000);
  const FORGIVE = 15 * 60 * 1000;

  it("escalatingBlockedMs: kilitliyken kalan süre, kilit bitince 0", () => {
    expect(escalatingBlockedMs({ count: 3, reset_at: 6000 }, 1000)).toBe(5000);
    expect(escalatingBlockedMs({ count: 3, reset_at: 6000 }, 6000)).toBe(0);
    expect(escalatingBlockedMs(null, 1000)).toBe(0);
  });

  it("escalatingNext: ilk 2 deneme gecikmesiz, sonra artan kilit uygular", () => {
    let now = 1000;
    let rec = escalatingNext(null, now, lockoutMs, FORGIVE);          // 1. yanlış
    expect(rec).toEqual({ count: 1, reset_at: 1000 });               // gecikme yok
    rec = escalatingNext(rec, (now += 100), lockoutMs, FORGIVE);      // 2. yanlış
    expect(rec.count).toBe(2); expect(rec.reset_at).toBe(1100);       // hâlâ gecikme yok
    rec = escalatingNext(rec, (now += 100), lockoutMs, FORGIVE);      // 3. yanlış → 5 sn kilit
    expect(rec.count).toBe(3); expect(rec.reset_at).toBe(1200 + 5000);
    rec = escalatingNext(rec, (now = rec.reset_at + 10), lockoutMs, FORGIVE); // 4. (kilit bitince)
    expect(rec.count).toBe(4); expect(rec.reset_at).toBe(now + 5000);
  });

  it("escalatingNext: 10+ yanlışta 5 dk kilit", () => {
    let rec = null, now = 0;
    for (let i = 0; i < 10; i++) rec = escalatingNext(rec, (now = (rec?.reset_at || 0) + 1), lockoutMs, FORGIVE);
    expect(rec.count).toBe(10);
    expect(rec.reset_at - now).toBe(300000); // 5 dk
  });

  it("escalatingNext: forgiveMs'ten fazla hareketsizlikte sayaç sıfırlanır", () => {
    const rec = { count: 8, reset_at: 100000 };
    const now = 100000 + FORGIVE + 1; // kilit bitiminden 15 dk+ sonra
    const next = escalatingNext(rec, now, lockoutMs, FORGIVE);
    expect(next.count).toBe(1);       // baştan başladı (dürüst kullanıcı affı)
    expect(next.reset_at).toBe(now);  // gecikme yok
  });

  it("escalatingNext: forgive süresi dolmadan escalate etmeye devam eder", () => {
    const rec = { count: 8, reset_at: 100000 };
    const now = 100000 + 1000; // kilit yeni bitmiş, henüz af yok
    const next = escalatingNext(rec, now, lockoutMs, FORGIVE);
    expect(next.count).toBe(9);
  });
});
