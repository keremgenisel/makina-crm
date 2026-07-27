// @vitest-environment jsdom
// Yedek parça (kargo) satışları Finance'a girer: müşteriye satış → Toplam Parça Ücreti Bedeli,
// bayiye satış → Anlaşmalı/Bayi Parça Bedeli; adet sayacına dahil.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";

afterEach(cleanup);
import { Finance } from "../../src/components/Finance";

const customers = [{ id: 1, name: "ABC Makina", currency: "TRY" }];
const dealers = [{ id: 5, name: "Bayi X" }];
// Faturasız Yurtiçi → KDV yok, net = brüt (test rakamları temiz kalsın).
const yedekParcaSatislar = [
  { id: 20, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 3, birimFiyat: 111, currency: "TRY", faturaTipi: "Faturasız Yurtiçi", tarih: "2026-07-20", odendi: true, tahsisler: [] }, // 3×111 = 333 → parça ücreti
  { id: 21, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 2, birimFiyat: 55, currency: "TRY", faturaTipi: "Faturasız Yurtiçi", tarih: "2026-07-21", odendi: true, tahsisler: [] }, // 2×55 = 110 → anlaşmalı/bayi parça
];

const renderFinance = (props = {}) => render(
  <Finance customers={customers} services={[]} dealers={dealers} partSales={[]}
    yedekParcaSatislar={yedekParcaSatislar} factory={{ name: "Altuntaş Makina" }}
    rates={{}} payments={[]} teklifler={[]} serverPermissions={null} {...props} />
);

describe("Finance — yedek parça (kargo) satışları", () => {
  it("'Satılan Yedek Parça' adet sayacı kargo satışlarını (miktar toplamı) içerir", () => {
    renderFinance();
    const card = screen.getByText("Satılan Yedek Parça").parentElement;
    expect(within(card).getByText("5")).toBeTruthy(); // 3 + 2
  });

  it("müşteri satışı Parça Ücreti'ne, bayi satışı Anlaşmalı/Bayi Parça'ya girer", () => {
    renderFinance();
    fireEvent.click(screen.getByTitle("Tutarları göster")); // tutarlar görünsün
    const parcaKart = screen.getByText("Toplam Parça Ücreti Bedeli").parentElement;
    expect(within(parcaKart).getByText(/333/)).toBeTruthy();          // müşteri: 3×111
    const anlasmaliKart = screen.getByText("Toplam Anlaşmalı Servislere Satılan Parça Bedeli").parentElement;
    expect(within(anlasmaliKart).getByText(/110/)).toBeTruthy();      // bayi: 2×55
  });

  it("boş yedek parça listesinde sayaç 0", () => {
    renderFinance({ yedekParcaSatislar: [] });
    const card = screen.getByText("Satılan Yedek Parça").parentElement;
    expect(within(card).getByText("0")).toBeTruthy();
  });
});
