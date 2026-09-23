// @vitest-environment jsdom
// Spec 0001: Finans'taki KDV Karşılaştırması kartı (R9, AC-14/15/29/30, plan K1/K10).
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { Finance } from "../../src/components/Finance";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

// Ağustos 2026: 250.000 TL Faturalı Yurtiçi → KDV 50.000 TL; 6.000 USD → KDV 1.200 USD.
const customers = [
  { id: 1, name: "TL Firma", model: "A", currency: "TRY", faturali: "Faturalı Yurtiçi", faturaBedeli: 250000, installDate: "2026-08-10", kalanBorc: 0 },
  { id: 2, name: "USD Firma", model: "A", currency: "USD", faturali: "Faturalı Yurtiçi", faturaBedeli: 6000, installDate: "2026-08-12", kalanBorc: 0 },
];
const turler = [{ id: 4, ad: "Hammadde", davranis: "normal" }];
const ciz = (props = {}) => render(<Finance customers={customers} services={[]} dealers={[]} partSales={[]} yedekParcaSatislar={[]}
  factory={{ name: "Altuntaş Makina" }} rates={{}} payments={[]} teklifler={[]} serverPermissions={null}
  giderTurleri={turler} giderYururlukAy="2026-06" {...props} />);

describe("Finans — KDV Karşılaştırması", () => {
  it("AC-14 / AC-15: 50.000 − 12.000 = 38.000; USD karşılaştırmaya girmez, listelenir", () => {
    ciz({ giderYetki: true, giderler: [{ id: 1, tarih: "2026-08-15", turId: 4, tutar: 60000, kdvOrani: 20, odendi: false }] });
    fireEvent.click(screen.getByText("Göster"));
    const kart = screen.getByTestId("kdv-karsilastirma");
    expect(within(kart).getByText("50.000 ₺")).toBeTruthy();
    expect(within(kart).getByText("− 12.000 ₺")).toBeTruthy();
    expect(within(kart).getByText("Ödenecek KDV farkı")).toBeTruthy();
    expect(within(kart).getByText("38.000 ₺")).toBeTruthy();
    expect(kart.textContent).toMatch(/Karşılaştırmaya dahil edilmeyen hesaplanan KDV: 1\.200 USD/);
  });
  it("AC-29: indirilecek büyükse 'sonraki döneme devreden KDV' pozitif tutar", () => {
    ciz({ giderYetki: true, giderler: [{ id: 1, tarih: "2026-08-15", turId: 4, tutar: 300000, kdvOrani: 20, odendi: false }] });
    fireEvent.click(screen.getByText("Göster"));
    const kart = screen.getByTestId("kdv-karsilastirma");
    expect(within(kart).getByText("Sonraki döneme devreden KDV")).toBeTruthy();
    expect(within(kart).getByText("10.000 ₺")).toBeTruthy();
    expect(kart.textContent).not.toMatch(/−10\.000|-10\.000/);
  });
  it("AC-30: gider yetkisi yoksa kart hiç çizilmez; 'Ödenmesi Muhtemel KDV' kartı kalır", () => {
    ciz({ giderYetki: false, giderler: [{ id: 1, tarih: "2026-08-15", turId: 4, tutar: 60000, kdvOrani: 20 }] });
    expect(screen.queryByTestId("kdv-karsilastirma")).toBeNull();
    expect(screen.queryByText("KDV Karşılaştırması")).toBeNull();
    expect(screen.getByText("Ödenmesi Muhtemel KDV")).toBeTruthy();
  });
  it("tutarlar Göster'e basılana kadar gizlidir (Finans kuralı)", () => {
    ciz({ giderYetki: true, giderler: [] });
    expect(within(screen.getByTestId("kdv-karsilastirma")).queryByText("50.000 ₺")).toBeNull();
  });
});
