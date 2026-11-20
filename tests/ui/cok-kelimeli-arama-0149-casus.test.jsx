// @vitest-environment jsdom
// Spec 0149 R8/2 (AC-27): kelime üretimi döngü dışındadır. `aramaKelimeleri` casusla sarılır; 400 kayıtlık listede kayıt sayısı
// kadar değil, render başına bir kez çağrılır. Ayrıca gerçek GlobalSearch paleti (AC-2, AC-19, AC-21 ekranda).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, renderHook } from "@testing-library/react";

const casus = vi.hoisted(() => ({ n: 0 }));
vi.mock("../../src/lib/utils", async (orig) => {
  const m = await orig();
  return { ...m, aramaKelimeleri: (...a) => { casus.n++; return m.aramaKelimeleri(...a); } };
});
const { useFilteredList } = await import("../../src/hooks/useFilteredList");
const { SearchPick } = await import("../../src/components/ui");
const { GlobalSearch } = await import("../../src/components/GlobalSearch");
afterEach(() => { cleanup(); casus.n = 0; });

const KAYIT = Array.from({ length: 400 }, (_, i) => ({ id: i, ad: `PARÇA ${i} AYNA DİŞLİSİ` }));

describe("Spec 0149 AC-27: kelime üretimi döngü dışında", () => {
  it("useFilteredList: 400 kayıtta render başına bir çağrı", () => {
    const { result } = renderHook(() => useFilteredList(KAYIT, { searchFields: ["ad"], baslangicArama: "ayna dişlisi", perPage: 500 }));
    expect(result.current.filtered).toHaveLength(400);
    expect(casus.n).toBeGreaterThan(0);
    expect(casus.n).toBeLessThan(5);
  });
  it("SearchPick: 400 seçenekte render başına bir çağrı", () => {
    render(<SearchPick items={KAYIT} getLabel={p => p.ad} getKey={p => p.id} placeholder="Parça ara..." onPick={vi.fn()} />);
    const kutu = screen.getByPlaceholderText("Parça ara...");
    fireEvent.focus(kutu);
    casus.n = 0;
    fireEvent.change(kutu, { target: { value: "ayna 39" } });
    expect(document.querySelectorAll(".sp-option").length).toBe(14); // 39, 139, 239, 339 ve 390–399
    expect(casus.n).toBeLessThan(5);
  });
});

describe("Spec 0149: gerçek palet", () => {
  const ac = (props, sorgu) => {
    render(<GlobalSearch {...props} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: sorgu } });
  };
  it("AC-2: 'ayna dişlisi' katalogdaki parçayı bulur", () => {
    ac({ parts: [{ id: 1, ad: "AYNA MAHRUTİ DİŞLİSİ" }, { id: 2, ad: "AYNA RULMANI" }], allowedTabs: ["settings"], onGoKatalog: vi.fn() }, "ayna dişlisi");
    expect(screen.queryByText("AYNA MAHRUTİ DİŞLİSİ")).toBeTruthy();
    expect(screen.queryByText("AYNA RULMANI")).toBeNull();
  });
  it("AC-19 / AC-21: 'ayna 532' müşteriyi bulur ve neden satırı telefonu yazar", () => {
    ac({ customers: [{ id: 1, name: "AYNA GIDA", phone: "0532 444" }, { id: 2, name: "AYNA PASTA", phone: "0212" }], allowedTabs: ["customers"], onOpenCustomer: vi.fn() }, "ayna 532");
    expect(screen.queryByText("AYNA GIDA")).toBeTruthy();
    expect(screen.queryByText("AYNA PASTA")).toBeNull();
    expect(screen.queryByText(/telefon: 0532 444/)).toBeTruthy();
  });
  it("AC-15 / AC-22: 'a b' sonuç çizmez", () => {
    ac({ parts: [{ id: 1, ad: "A B parçası" }], allowedTabs: ["settings"], onGoKatalog: vi.fn() }, "a b");
    expect(screen.queryByText("A B parçası")).toBeNull();
  });
});
