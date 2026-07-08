// @vitest-environment jsdom
// Regresyon: "kısıtlı kullanıcı arama kutusundan yetkisiz alana erişiyor" —
// izinli olmayan sekmenin verisi arama sonuçlarında hiç listelenmemeli.
import { describe, it, expect, afterEach } from "vitest";
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
});
