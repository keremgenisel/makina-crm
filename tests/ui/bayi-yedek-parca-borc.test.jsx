// @vitest-environment jsdom
// Bayiye yapılan ödenmemiş yedek parça (kargo) satışı, bayi detay modalındaki "Ödenmemiş Parça
// Borcu" kutusuna borç olarak yansır (servis kaynaklı parça borcuyla aynı kutuda).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(cleanup);
import { SimpleDealers } from "../../src/components/SimpleDealers";

const dealers = [{ id: 5, name: "Bayi X", bayiMi: true, country: "Türkiye", city: "Bursa" }];
const parts = [{ id: 7, ad: "Dişli" }];

const baseProps = (yedekParcaSatislar) => ({
  dealers, setDealers: vi.fn(), factory: { name: "Altuntaş Makina" }, setFactory: vi.fn(),
  geoData: null, loadingGeo: false, parts, yedekParcaSatislar, setYedekParcaSatislar: vi.fn(),
  openDetailId: 5, serverPermissions: null, showToast: vi.fn(),
});

describe("SimpleDealers — bayi yedek parça (kargo) borcu", () => {
  it("ödenmemiş bayi yedek parça satışı borç kutusunda görünür (2×150 = 300)", () => {
    const yp = [{ id: 700, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 2, birimFiyat: 150, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-07-01", odendi: false }];
    render(<SimpleDealers {...baseProps(yp)} />);
    expect(screen.getByText(/Ödenmemiş Parça Borcu/)).toBeTruthy();
    expect(screen.getAllByText(/Dişli/).length).toBeGreaterThan(0); // parça adı (borç kutusu + geçmiş)
    expect(screen.getAllByText(/300/).length).toBeGreaterThan(0); // 2×150 net
    // KDV dahil toplam (300 + %20 KDV = 360) KDV satırının altında (yalnız üstte)
    expect(screen.getByText(/KDV dahil toplam/)).toBeTruthy();
    expect(screen.getAllByText(/360/).length).toBeGreaterThan(0);
    // Kayıt altı bilgilendirme: "KDV dahil: ₺360"
    expect(screen.getAllByText(/KDV dahil:/).length).toBeGreaterThan(0);
  });

  it("faturasız yedek parça satışında kayıt altı 'KDV dahil' satırı YAZILMAZ (KDV 0)", () => {
    const yp = [{ id: 700, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 2, birimFiyat: 150, currency: "TRY", faturaTipi: "Faturasız Yurtiçi", tarih: "2026-07-01", odendi: false }];
    render(<SimpleDealers {...baseProps(yp)} />);
    expect(screen.getByText(/Ödenmemiş Parça Borcu/)).toBeTruthy();
    expect(screen.queryByText(/KDV dahil:/)).toBeNull();     // kayıt altı satır yok
    expect(screen.queryByText(/KDV dahil toplam/)).toBeNull(); // üst özet de yok (KDV 0)
  });

  it("ödenmiş bayi yedek parça satışı borç oluşturmaz", () => {
    const yp = [{ id: 700, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 2, birimFiyat: 150, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-07-01", odendi: true }];
    render(<SimpleDealers {...baseProps(yp)} />);
    expect(screen.queryByText(/Ödenmemiş Parça Borcu/)).toBeNull();
  });
});

describe("SimpleDealers — Yedek Parça Geçmişi", () => {
  it("bayiye yapılan yedek parça satışları 'Yedek Parça Geçmişi' bölümünde listelenir (ödenmiş dahil)", () => {
    const yp = [{ id: 700, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 2, birimFiyat: 150, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-07-01", odendi: true }];
    render(<SimpleDealers {...baseProps(yp)} />);
    expect(screen.getByText(/Yedek Parça Geçmişi \(1\)/)).toBeTruthy();
    expect(screen.getByText(/Ödendi/)).toBeTruthy();
  });

  it("bir yedek parça kartına tıklayınca onGoYedekParca o satışın id'siyle çağrılır", () => {
    const onGoYedekParca = vi.fn();
    const yp = [{ id: 700, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 2, birimFiyat: 150, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-07-01", odendi: false }];
    render(<SimpleDealers {...baseProps(yp)} onGoYedekParca={onGoYedekParca} />);
    // "Yedek Parça Geçmişi" başlığının altındaki kartı bul (parça adı + ödendi rozeti olan)
    const kartlar = screen.getAllByText(/Dişli/).map(el => el.closest('[title="Yedek parça satışına git"]')).filter(Boolean);
    expect(kartlar.length).toBeGreaterThan(0);
    fireEvent.click(kartlar[0]);
    expect(onGoYedekParca).toHaveBeenCalledWith(700);
  });

  it("yedek parça satışı yoksa 'Yedek Parça Geçmişi' bölümü görünmez", () => {
    render(<SimpleDealers {...baseProps([])} />);
    expect(screen.queryByText(/Yedek Parça Geçmişi/)).toBeNull();
  });
});

describe("SimpleDealers — Sattığı Extra Kalıplar", () => {
  const customers = [{ id: 100, name: "Müşteri Y" }];
  it("bayinin satış yaptığı Extra Kalıplar 'Sattığı Extra Kalıplar' bölümünde listelenir", () => {
    const partSales = [{ id: 800, tur: "Kalıp", satisFirma: "Bayi X", customerId: 100, ad: "Adana Kalıbı", olcu: "55x125", ucret: 5000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-07-05", odendi: false }];
    render(<SimpleDealers {...baseProps([])} customers={customers} partSales={partSales} />);
    expect(screen.getByText(/Sattığı Extra Kalıplar \(1\)/)).toBeTruthy();
    expect(screen.getByText(/Adana Kalıbı/)).toBeTruthy();
    expect(screen.getByText("Müşteri Y")).toBeTruthy();
  });

  it("kalıp kartına tıklayınca onGoCustomerDetail alıcı müşterinin id'siyle çağrılır", () => {
    const onGoCustomerDetail = vi.fn();
    const partSales = [{ id: 800, tur: "Kalıp", satisFirma: "Bayi X", customerId: 100, ad: "Adana Kalıbı", ucret: 5000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-07-05", odendi: false }];
    render(<SimpleDealers {...baseProps([])} customers={customers} partSales={partSales} onGoCustomerDetail={onGoCustomerDetail} />);
    fireEvent.click(screen.getByText(/Adana Kalıbı/).closest('[title="Müşteri detayını aç"]'));
    expect(onGoCustomerDetail).toHaveBeenCalledWith(100);
  });

  it("başka firmanın sattığı kalıp bu bayide görünmez", () => {
    const partSales = [{ id: 800, tur: "Kalıp", satisFirma: "Başka Firma", customerId: 100, ad: "Adana Kalıbı", ucret: 5000, currency: "TRY", tarih: "2026-07-05" }];
    render(<SimpleDealers {...baseProps([])} customers={customers} partSales={partSales} />);
    expect(screen.queryByText(/Sattığı Extra Kalıplar/)).toBeNull();
  });
});
