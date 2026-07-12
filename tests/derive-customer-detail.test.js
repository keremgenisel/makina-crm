// CustomerDetailModal'dan ayrılan saf türetme (deriveCustomerDetail.js) — timeline + finans.
// Bileşen içinde büyük bir useMemo iken test edilemiyordu; ayrı saf modül olunca edilebilir.
import { describe, it, expect } from "vitest";
import { DEFAULT_KDV_RATES } from "../src/lib/constants";
import { deriveCustomerDetail } from "../src/components/customers/detail/deriveCustomerDetail.js";

const base = (over = {}) => ({
  detailView: null, services: [], partSales: [], payments: [],
  kdvRates: DEFAULT_KDV_RATES, models: [], todayStr: "2026-06-01", factoryName: "Altuntaş Makina",
  ...over,
});

describe("deriveCustomerDetail", () => {
  it("detailView yoksa boş geçmiş ve boş zaman çizelgesi döner", () => {
    const r = deriveCustomerDetail(base());
    expect(r.detailHistory).toEqual([]);
    expect(r.detailTimelineEvents).toEqual([]);
    expect(r.detailKalipSatisAdedi).toBe(0);
  });

  it("satış + servis + kalıp + ödeme + garanti olaylarını üretir ve tarihe göre sıralar", () => {
    const detailView = {
      id: 1, name: "Firma A", installDate: "2026-01-01", faturali: "Faturalı Yurtiçi",
      currency: "TRY", warrantyEnd: "2027-01-01", kaliplar: [],
    };
    const services = [{ id: 10, customerId: 1, type: "Garanti İçi", date: "2026-02-01" }];
    const partSales = [{ id: 20, customerId: 1, tur: "Kalıp", ad: "K1", tarih: "2026-03-01", ucret: 100, currency: "TRY" }];
    const payments = [{ id: 30, customerId: 1, tarih: "2026-01-15", tutar: 500, currency: "TRY", yontem: "Nakit", tahsilEdildi: true }];
    const r = deriveCustomerDetail(base({ detailView, services, partSales, payments }));

    const kinds = r.detailTimelineEvents.map(e => e.kind);
    expect(kinds).toContain("sale");
    expect(kinds).toContain("service");
    expect(kinds).toContain("part");
    expect(kinds).toContain("payment");
    expect(kinds).toContain("warranty");
    // tarihe göre artan sıra: ilk olay satış (2026-01-01)
    expect(r.detailTimelineEvents[0].kind).toBe("sale");
    expect(r.detailHistory.length).toBe(1);
    expect(r.detailKalipSatisAdedi).toBe(1);
    expect(r.detailMainCur).toBe("TRY");
    expect(r.detailModelInfo).toBeUndefined(); // models boş → find() undefined
  });

  it("başka müşterinin kayıtlarını dahil etmez", () => {
    const detailView = { id: 1, name: "A", currency: "TRY" };
    const services = [{ id: 10, customerId: 999, type: "Garanti İçi", date: "2026-02-01" }];
    const r = deriveCustomerDetail(base({ detailView, services }));
    expect(r.detailHistory.length).toBe(0);
  });
});
