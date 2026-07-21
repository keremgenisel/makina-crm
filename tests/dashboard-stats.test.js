// Anasayfa "Son Satışlar" birleştirme — saf fonksiyon (dashboardStats.sonSatislar).
import { describe, it, expect } from "vitest";
import { sonSatislar } from "../src/lib/dashboardStats";

const customers = [
  { id: 1, name: "Alfa A.Ş.", model: "AK100", serialNo: "SN1", installDate: "2026-07-10", country: "Türkiye", city: "İstanbul" },
  { id: 2, name: "Beta Ltd", model: "AK140", serialNo: "SN2", installDate: "2026-07-18", country: "Türkiye", city: "Konya" },
  { id: 3, name: "Silinmiş", model: "AK60", installDate: "2026-07-20", deletedAt: "2026-07-21" }, // deletedAt → elenir
  { id: 4, name: "Tarihsiz", model: "AK60" }, // installDate yok → elenir
];
const partSales = [
  { id: 10, customerId: 1, tur: "Kalıp", ad: "Hamburger Kalıbı", olcu: "10cm", tarih: "2026-07-19", ucret: 25000, currency: "TRY" },
  { id: 11, customerId: 2, tur: "YedekParca", ad: "Bıçak", tarih: "2026-07-21", ucret: 500, currency: "TRY" }, // yedek parça → DAHİL DEĞİL
  { id: 12, customerId: 1, tur: "Kalıp", ad: "Köfte Kalıbı", tarih: "2026-07-05", ucret: 18000, currency: "USD", deletedAt: "x" }, // silinmiş → elenir
];

describe("sonSatislar", () => {
  it("makina + Extra Kalıp'ı tarihe göre (yeni→eski) birleştirir; yedek parça/silinmiş/tarihsiz hariç", () => {
    const r = sonSatislar(customers, partSales, 10);
    // Beklenen: Beta makina (07-18), Alfa kalıp (07-19), Alfa makina (07-10) → tarih desc
    expect(r.map(x => x.key)).toEqual(["k10", "m2", "m1"]);
    // Yedek parça (id 11) yok
    expect(r.some(x => x.key === "k11")).toBe(false);
    // Silinmiş müşteri/kalıp ve tarihsiz müşteri yok
    expect(r.some(x => x.key === "m3" || x.key === "m4" || x.key === "k12")).toBe(false);
  });

  it("kalıp satırı müşteri adı + tutar + tip taşır", () => {
    const kalip = sonSatislar(customers, partSales).find(x => x.tip === "kalip");
    expect(kalip.ad).toBe("Alfa A.Ş.");          // customerId → müşteri adı
    expect(kalip.tutar).toBe(25000);
    expect(kalip.detay).toBe("Hamburger Kalıbı (10cm)");
    expect(kalip.custId).toBe(1);
  });

  it("makina satırı model/seri + konum + tip taşır", () => {
    const mak = sonSatislar(customers, partSales).find(x => x.key === "m2");
    expect(mak.tip).toBe("makina");
    expect(mak.detay).toBe("AK140 · SN2");
    expect(mak.konum).toBe("Türkiye / Konya");
  });

  it("limit uygulanır", () => {
    expect(sonSatislar(customers, partSales, 1)).toHaveLength(1);
    expect(sonSatislar(customers, partSales, 1)[0].key).toBe("k10"); // en yeni
  });

  it("boş girdilerde boş dizi", () => {
    expect(sonSatislar([], [], 10)).toEqual([]);
    expect(sonSatislar()).toEqual([]);
  });
});
