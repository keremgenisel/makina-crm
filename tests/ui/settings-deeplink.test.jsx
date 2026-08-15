// @vitest-environment jsdom
// Genel aramadan "çalışan" sonucuna tıklanınca Ayarlar doğrudan Firma Çalışanları bölümünü açar
// (initialTab="calisanlar"). Varsayılan (initialTab yok) "app" bölümüdür.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
import { Settings } from "../../src/components/Settings";

const base = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(),
  setServices: vi.fn(), setDealers: vi.fn(), version: "3.18.0", appSettings: {}, setAppSettings: vi.fn(),
  customModels: [], setCustomModels: vi.fn(), standardModels: [], setStandardModels: vi.fn(),
  factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [{ id: 1, ad: "Ahmet Usta" }], setCalisanlar: vi.fn(),
};

describe("Ayarlar deep-link (initialTab)", () => {
  it("initialTab='calisanlar' → Firma Çalışanları bölümü açık (menü + içerik başlığı)", () => {
    render(<Settings {...base} initialTab="calisanlar" onInitialTabConsumed={vi.fn()} />);
    // "Firma Çalışanları" hem sol menüde hem açılan bölüm başlığında → en az 2 kez
    expect(screen.getAllByText("Firma Çalışanları").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Ahmet Usta")).toBeTruthy(); // çalışan içeriği gerçekten render oldu
  });

  it("initialTab yokken Firma Çalışanları bölümü açık değil (Firma grubu akordeonu kapalı)", () => {
    render(<Settings {...base} />);
    expect(screen.queryAllByText("Firma Çalışanları").length).toBe(0); // grup kapalı → menüde de yok
    expect(screen.queryByText("Ahmet Usta")).toBeNull();
  });
});
