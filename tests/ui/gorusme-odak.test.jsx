// @vitest-environment jsdom
// Anasayfa "Aranacaklar"tan görüşmeye tıklanınca müşteri detayı açılır, GÖRÜŞMELER akordeonu açılır
// ve o görüşme satırı vurgulanır (odakGorusmeId → data-odak-gorusme). Servis/kalıp vurgusuyla aynı desen.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
import { Customers } from "../../src/components/Customers";

const CUST = [{ id: 1, name: "Aranacak Firma", serialNo: "GEN-1", model: "AK100" }];
const GORUSME = [{ id: 50, customerId: 1, tarih: "2026-08-10", tur: "Gelen Arama", not: "geri ara lütfen", takipTarihi: "2026-08-20", tamamlandi: false }];

const props = (extra) => ({
  customers: CUST, setCustomers: () => {}, services: [], setServices: () => {}, dealers: [], models: [],
  factory: { name: "Altuntaş" }, parts: [], partSales: [], setPartSales: () => {}, yedekParcaSatislar: [], setYedekParcaSatislar: () => {},
  gorusmeler: GORUSME, setGorusmeler: () => {}, payments: [], initialDetailId: 1, ...extra,
});

describe("Görüşme odağı (müşteri detayında vurgu)", () => {
  it("focusGorusmeId ile görüşme akordeonu açılır ve o satır vurgulanır", () => {
    const { container } = render(<Customers {...props({ focusGorusmeId: 50 })} />);
    const vurgulu = container.querySelector('[data-odak-gorusme="1"]');
    expect(vurgulu).toBeTruthy();
    expect(vurgulu.textContent).toContain("geri ara lütfen");
  });

  it("focusGorusmeId yokken vurgulanan görüşme olmaz", () => {
    const { container } = render(<Customers {...props({ focusGorusmeId: null })} />);
    expect(container.querySelector('[data-odak-gorusme="1"]')).toBeFalsy();
  });
});
