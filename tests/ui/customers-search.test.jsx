// @vitest-environment jsdom
// Regresyon: Müşteriler arama kutusu, makinanın eski sahiplerinin adıyla eşleşmiyordu
// (menüdeki genel aramada olduğu gibi olması istendi).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { Customers } from "../../src/components/Customers";

const customers = [
  { id: 1, name: "Genisel Catering", model: "AK100" },
  { id: 5, name: "Yeni Sahip Gıda", model: "AK140", prevOwners: [{ name: "Devreden Eski Firma" }] },
  { id: 7, name: "Şişli Gıda Şahin", model: "AK100" },
];

describe("Müşteriler arama — eski sahip adı", () => {
  it("eski sahibin adıyla aranınca yeni sahip listelenir", () => {
    render(<Customers customers={customers} setCustomers={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Müşteri ara..."), { target: { value: "devreden" } });
    expect(screen.getByText("Yeni Sahip Gıda")).toBeTruthy();
    expect(screen.queryByText("Genisel Catering")).toBeNull();
  });

  it("normal isim aramasında eski sahip kaydı gelmez", () => {
    render(<Customers customers={customers} setCustomers={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Müşteri ara..."), { target: { value: "genisel" } });
    expect(screen.getByText("Genisel Catering")).toBeTruthy();
    expect(screen.queryByText("Yeni Sahip Gıda")).toBeNull();
  });

  it("Türkçe karaktersiz aramada da bulur ('sisli sahin' → Şişli ... Şahin)", () => {
    render(<Customers customers={customers} setCustomers={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Müşteri ara..."), { target: { value: "sisli" } });
    expect(screen.getByText("Şişli Gıda Şahin")).toBeTruthy();
    expect(screen.queryByText("Genisel Catering")).toBeNull();
  });
});
