// @vitest-environment jsdom
// Bayi detay modalı: servis KAYDI olmayan saf bayi de (yedek parça / kalıp geçmişi varsa) iki-kolonlu
// düzende görünmeli (sol 340px: borç+bilgi, sağ: geçmiş). Eskiden anlaşmalı-servis olmayan bayi
// tek-kolonlu "karışık" görünüyordu. Bu test regresyonu yakalar.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

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

describe("Bayi detay — tek genel arama + tıklanabilir servis olayları", () => {
  const anlasmali = [{ id: 8, name: "Servis Bayi", bayiMi: true, anlasmaliServisMi: true, city: "İzmir", country: "Türkiye" }];
  const customers = [
    { id: 100, name: "Alfa Müşteri" },
    { id: 101, name: "Beta Müşteri" },
  ];
  const services = [
    { id: 200, islemFirma: "Servis Bayi", customerId: 100, type: "Periyodik Bakım", date: "2026-07-01", servisUcreti: 500, currency: "TRY", durum: "Tamamlandı" },
    { id: 201, islemFirma: "Servis Bayi", customerId: 101, type: "Garanti Dışı", date: "2026-07-02", servisUcreti: 700, currency: "TRY", durum: "Tamamlandı" },
  ];

  it("bölüm-içi arama kutuları kaldırıldı; tek genel arama kutusu var", () => {
    render(<SimpleDealers {...base} customers={customers} dealers={anlasmali} services={services} openDetailId={8} />);
    // Eski bölüm-içi placeholder'lar YOK
    expect(screen.queryByPlaceholderText("Müşteri veya servis tipi ara...")).toBeNull();
    expect(screen.queryByPlaceholderText("Parça, kargo no ile ara...")).toBeNull();
    // Tek genel arama VAR
    expect(screen.getByPlaceholderText(/Servis, yedek parça veya kalıp ara/)).toBeTruthy();
  });

  it("genel arama servis geçmişini filtreler", () => {
    render(<SimpleDealers {...base} customers={customers} dealers={anlasmali} services={services} openDetailId={8} />);
    expect(screen.getByText("Periyodik Bakım")).toBeTruthy();
    expect(screen.getByText("Garanti Dışı")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(/Servis, yedek parça veya kalıp ara/), { target: { value: "periyodik" } });
    expect(screen.getByText("Periyodik Bakım")).toBeTruthy();
    expect(screen.queryByText("Garanti Dışı")).toBeNull();
  });

  it("servis kartına tıklayınca o servis olayına (customerId + servisId) gidilir", () => {
    const onGoCustomerDetail = vi.fn();
    render(<SimpleDealers {...base} customers={customers} dealers={anlasmali} services={services} openDetailId={8} onGoCustomerDetail={onGoCustomerDetail} />);
    fireEvent.click(screen.getByText("Periyodik Bakım").closest('div[title="Bu servis olayına git"]'));
    expect(onGoCustomerDetail).toHaveBeenCalledWith(100, { servisId: 200 });
  });

  it("Extra Kalıp kartına tıklayınca o kalıp olayına (customerId + kalipId) gidilir", () => {
    const onGoCustomerDetail = vi.fn();
    const partSales = [{ id: 300, tur: "Kalıp", satisFirma: "Servis Bayi", customerId: 100, ad: "Kalıp A", olcu: "40x40", ucret: 9000, currency: "TRY", tarih: "2026-07-03", odendi: true }];
    render(<SimpleDealers {...base} customers={customers} dealers={anlasmali} services={services} partSales={partSales} openDetailId={8} onGoCustomerDetail={onGoCustomerDetail} />);
    fireEvent.click(screen.getByText(/Kalıp A/).closest('div[title="Bu Extra Kalıp olayına git"]'));
    expect(onGoCustomerDetail).toHaveBeenCalledWith(100, { kalipId: 300 });
  });
});
