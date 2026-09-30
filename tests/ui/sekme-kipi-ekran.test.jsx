// @vitest-environment jsdom
// Spec 0014 AC-16: Stok ve Evrak'ın alt sekmeleri sözlükteki segmentin sekme kipiyle çizilir (tablist/tab/aria-selected);
// radyo grubu olarak duyurulmaz. Süzgeç çubukları ise düğme kipinde (aria-pressed, rol button) kalır (Z1).
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { Stock } from "../../src/components/Stock";
import { Documents } from "../../src/components/Documents";
import { Customers } from "../../src/components/Customers";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

describe("sekme kipi ekranlarda", () => {
  it("AC-16: Stok ve Evrak'ın alt sekmeleri sekme kipiyle çizilir: sekme listesi, sekme ve seçili sekme nitelikleri; radyo grubu değil", () => {
    render(<Stock factory={{ name: "A" }} stock={[]} setStock={vi.fn()} customers={[]} setCustomers={vi.fn()} />);
    const liste = screen.getByRole("tablist", { name: "Stok bölümleri" });
    expect(within(liste).getAllByRole("tab").map(t => t.textContent)).toEqual(["Makina Stoğu", "Parça/Yedek Parça Stoğu", "Yedek Parça Satışı", "Kalıp Üretim"]);
    expect(screen.getByRole("tab", { name: "Makina Stoğu" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: "Kalıp Üretim" }));
    expect(screen.getByRole("tab", { name: "Kalıp Üretim" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Makina Stoğu" }).getAttribute("aria-selected")).toBe("false");
    expect(screen.queryAllByRole("radio")).toEqual([]);
    cleanup();
    render(<Documents teklifler={[]} setTeklifler={vi.fn()} faturalar={[]} setFaturalar={vi.fn()} customers={[]} partSales={[]} allModels={[]}
      factory={{ name: "A" }} appSettings={{}} showToast={vi.fn()} kalipDefs={[]} parts={[]} geoData={{}} loadingGeo={false} serverPermissions={null} dealers={[]} yedekParcaSatislar={[]} />);
    const evrak = screen.getByRole("tablist", { name: "Evrak türleri" });
    expect(within(evrak).getAllByRole("tab").map(t => t.textContent)).toEqual(["Teklifler", "Proformalar", "Yurt Dışı Fatura"]);
    expect(screen.getByRole("tab", { name: "Teklifler" }).getAttribute("aria-selected")).toBe("true");
  });
  it("Z1: süzgeç çubukları düğme kipinde: rol button, aria-pressed seçimi gösterir", () => {
    render(<Customers customers={[{ id: 1, name: "A", model: "M" }]} setCustomers={vi.fn()} partSales={[]} />);
    const grup = screen.getByRole("group", { name: "Müşteri süzgeci" });
    expect(within(grup).getByRole("button", { name: "Hepsi (1)" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(grup).getByRole("button", { name: "Garantisi Bitenler (0)" }).getAttribute("aria-pressed")).toBe("false");
  });
});
