// @vitest-environment jsdom
// Regresyon: "takipten kaldır yetkisi olmayan kullanıcı takipten kaldırdı" —
// anasayfadaki Takipten Kaldır butonu evrak_teklif_edit iznine bağlı olmalı.
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { Dashboard } from "../../src/components/Dashboard";

const eskiTarih = new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10);
const teklifler = [
  { id: 1, type: "teklif", durum: "gonderildi", tarih: eskiTarih, firma: "Test Firma", no: "T-1" },
];
const ortak = {
  customers: [], dealers: [], services: [], stock: [], partSales: [], payments: [],
  rates: null, teklifler, teklifTakipGun: 7,
  onOpenTeklif: () => {}, onDismissTakip: () => {},
};

describe("Dashboard Takipten Kaldır yetkisi", () => {
  it("teklif düzenleme izni yokken buton görünmez", () => {
    const kisitli = { role: "user", permissions: JSON.stringify({ evrakActions: [] }) };
    render(<Dashboard {...ortak} serverPermissions={kisitli} />);
    expect(screen.getByText("Test Firma")).toBeTruthy(); // kutu render oldu
    expect(screen.queryByText("Takipten Kaldır")).toBeNull();
  });

  it("izinliyken (yerel mod) buton görünür", () => {
    render(<Dashboard {...ortak} serverPermissions={null} />);
    expect(screen.getByText("Takipten Kaldır")).toBeTruthy();
  });
});
