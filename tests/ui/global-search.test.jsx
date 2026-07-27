// @vitest-environment jsdom
// Regresyon: "kısıtlı kullanıcı arama kutusundan yetkisiz alana erişiyor" —
// izinli olmayan sekmenin verisi arama sonuçlarında hiç listelenmemeli.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { GlobalSearch } from "../../src/components/GlobalSearch";

const veri = {
  customers: [
    { id: 1, name: "Genisel Catering", phone: "0500", model: "AK100" },
    { id: 5, name: "Yeni Sahip Gıda", phone: "0501", model: "AK140", prevOwners: [{ name: "Devreden Eski Firma" }] },
  ],
  teklifler: [{ id: 2, type: "teklif", no: "T-99", firma: "Genisel Catering" }],
  dealers: [{ id: 3, name: "Genisel Bayi", city: "İstanbul" }],
  stock: [{ id: 4, model: "AK100_DS", serialNo: "GEN-1" }],
};

const ara = (props) => {
  render(<GlobalSearch {...veri} {...props} />);
  fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
  fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "genisel" } });
};

describe("GlobalSearch sekme yetkisi", () => {
  it("evrak sekmesi izinli değilse teklif sonuçları listelenmez", () => {
    ara({ allowedTabs: ["dashboard", "customers"] });
    expect(screen.getByText("Genisel Catering")).toBeTruthy(); // müşteri sonucu var
    expect(screen.queryByText("T-99")).toBeNull();             // teklif sonucu yok
    expect(screen.queryByText("Genisel Bayi")).toBeNull();     // bayi sonucu yok
  });

  it("eski sahibin adıyla aranınca yeni sahip bulunur", () => {
    render(<GlobalSearch {...veri} allowedTabs={null} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "devreden" } });
    expect(screen.getByText("Yeni Sahip Gıda")).toBeTruthy();
    expect(screen.getByText(/eski sahibi: Devreden Eski Firma/)).toBeTruthy();
  });

  it("kısıt yoksa (yerel mod) tüm kategoriler listelenir", () => {
    ara({ allowedTabs: null });
    expect(screen.getByText("T-99")).toBeTruthy();
    expect(screen.getByText("Genisel Bayi")).toBeTruthy();
  });

  it("yedek parça (kargo) satışı aramada çıkar ve tıklayınca onGoYedekParca çağrılır", () => {
    const onGoYedekParca = vi.fn();
    const parts = [{ id: 7, ad: "Genisel Dişli" }];
    const yedekParcaSatislar = [{ id: 900, aliciTipi: "bayi", dealerId: 3, partId: "7", miktar: 2, tarih: "2026-07-01", kargoDurum: "Hazırlanıyor" }];
    render(<GlobalSearch {...veri} parts={parts} yedekParcaSatislar={yedekParcaSatislar} onGoYedekParca={onGoYedekParca} allowedTabs={["dashboard", "stock"]} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "genisel" } });
    const btn = screen.getByText(/Genisel Dişli/).closest("button");
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onGoYedekParca).toHaveBeenCalledWith(900);
  });

  it("Extra Kalıp satışı aramada çıkar ve tıklayınca müşteri detayına gider", () => {
    const onOpenCustomer = vi.fn();
    const partSales = [{ id: 800, tur: "Kalıp", customerId: 1, ad: "Genisel Kalıbı", olcu: "55x125", tarih: "2026-07-01" }];
    render(<GlobalSearch {...veri} partSales={partSales} onOpenCustomer={onOpenCustomer} allowedTabs={["dashboard", "customers"]} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "genisel kalıbı" } });
    fireEvent.click(screen.getByText(/Genisel Kalıbı/).closest("button"));
    expect(onOpenCustomer).toHaveBeenCalledWith(1);
  });
});
