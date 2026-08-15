// @vitest-environment jsdom
// Bayi detay modalı: servis KAYDI olmayan saf bayi de (yedek parça / kalıp geçmişi varsa) iki-kolonlu
// düzende görünmeli (sol 340px: borç+bilgi, sağ: geçmiş). Eskiden anlaşmalı-servis olmayan bayi
// tek-kolonlu "karışık" görünüyordu. Bu test regresyonu yakalar.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
import { SimpleDealers } from "../../src/components/SimpleDealers";

const base = {
  setDealers: vi.fn(), factory: { name: "Altuntaş Makina" }, setFactory: vi.fn(),
  geoData: null, loadingGeo: false, customers: [{ id: 100, name: "Müşteri X" }],
  parts: [{ id: 7, ad: "Dişli" }], kdvRates: [], showToast: () => {},
};

const solKolon = (container) => container.querySelector('div[style*="width: 340px"]');

describe("Bayi detay düzeni — her durumda iki kolon", () => {
  it("SAF BAYİ (anlaşmalı servis DEĞİL) ama yedek parça geçmişi varsa iki-kolon düzen kullanılır", () => {
    const dealers = [{ id: 5, name: "Saf Bayi", bayiMi: true, anlasmaliServisMi: false, city: "İzmir", country: "Türkiye" }];
    const yedekParcaSatislar = [{ id: 30, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 2, birimFiyat: 100, currency: "TRY", tarih: "2026-07-01", odendi: false }];
    const { container } = render(<SimpleDealers {...base} dealers={dealers} yedekParcaSatislar={yedekParcaSatislar} openDetailId={5} />);
    expect(screen.getByText(/Yedek Parça Geçmişi/)).toBeTruthy(); // içerik var
    expect(solKolon(container)).toBeTruthy();                     // 340px sol kolon → iki-kolon düzen
  });

  it("İçeriği olmayan saf bayi (yedek parça/kalıp yok) tek-kolon kalır (340px kolon yok)", () => {
    const dealers = [{ id: 6, name: "Boş Bayi", bayiMi: true, anlasmaliServisMi: false, city: "Bursa", country: "Türkiye" }];
    const { container } = render(<SimpleDealers {...base} dealers={dealers} yedekParcaSatislar={[]} openDetailId={6} />);
    expect(solKolon(container)).toBeNull(); // sağ kolonda içerik yok → iki-kolona gerek yok
  });
});
