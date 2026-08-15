// @vitest-environment jsdom
// Borçlu Firmalar'dan taksit/çek/KK kalemine tıklanınca müşteri detayı açılır ve ilgili
// TAKSİT / ÖDEME olayı vurgulanır (focusTaksitId → data-odak-taksit, focusOdemeId → data-odak-odeme).
// Tüm zincir: Customers → CustomerDetailModal → MachineTimeline.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
import { Customers } from "../../src/components/Customers";

const CUST = [{ id: 1, name: "aaaa", currency: "TRY", odemePlani: [{ id: 77, vadeTarihi: "2099-09-01", tutar: 50000 }] }];
const PAY = [{ id: 50, customerId: 1, yontem: "Çek", tahsilEdildi: false, tutar: 200000, currency: "TRY", vadeTarihi: "2099-09-01" }];

const props = (extra) => ({
  customers: CUST, setCustomers: () => {}, services: [], setServices: () => {}, dealers: [], models: [],
  factory: { name: "Altuntaş" }, parts: [], partSales: [], setPartSales: () => {}, yedekParcaSatislar: [], setYedekParcaSatislar: () => {},
  payments: PAY, setPayments: () => {}, initialDetailId: 1, ...extra,
});

describe("Borçlu Firmalar odağı — taksit/ödeme highlight", () => {
  it("focusTaksitId ile taksit olayı vurgulanır", () => {
    const { container } = render(<Customers {...props({ focusTaksitId: 77 })} />);
    expect(container.querySelector('[data-odak-taksit="1"]')).toBeTruthy();
  });

  it("focusOdemeId ile ödeme (çek/KK) olayı vurgulanır", () => {
    const { container } = render(<Customers {...props({ focusOdemeId: 50 })} />);
    expect(container.querySelector('[data-odak-odeme="1"]')).toBeTruthy();
  });

  it("odak yokken vurgulanan olay olmaz", () => {
    const { container } = render(<Customers {...props({})} />);
    expect(container.querySelector('[data-odak-taksit="1"]')).toBeFalsy();
    expect(container.querySelector('[data-odak-odeme="1"]')).toBeFalsy();
  });
});
