// @vitest-environment jsdom
// Spec 0016 AC-5 (plan Ek A.2): mesaj kutularının metni ve görünme koşulu. Dönüşümden ÖNCE bugünkü koda yazıldı ve
// yeşildi; dönüşümden sonra da aynı kalmalı. (Müşteriler'in gruplu görünüm şeridi suzgec-musteri-bayi ve
// uyari-seridi-serbest testlerinde.)
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { Stock } from "../../src/components/Stock";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

const var_ = (re) => screen.queryAllByText(re).length > 0;
const STOK = (o = {}) => render(<Stock factory={{ name: "A" }} stock={[]} setStock={vi.fn()} customers={[]} setCustomers={vi.fn()} parts={[]} dealers={[]} {...o} />);

describe("Parça Stoğu mesajları", () => {
  it("AC-5: tükenen ve azalan parça sayıları aynı metinle, yalnız varken", () => {
    const parts = [{ id: 1, ad: "A" }, { id: 2, ad: "B" }, { id: 3, ad: "C" }, { id: 4, ad: "D" }];
    STOK({ defaultSubTab: "parca", parts, partStock: [{ partId: 2, miktar: 3 }, { partId: 3, miktar: 5 }, { partId: 4, miktar: 20 }] });
    expect(var_(/^1 parça tükendi$/)).toBe(true);
    expect(var_(/^2 parçada stok azaldı \(5 veya altı\)$/)).toBe(true);
    cleanup();
    STOK({ defaultSubTab: "parca", parts: [{ id: 4, ad: "D" }], partStock: [{ partId: 4, miktar: 20 }] });
    expect(var_(/parça tükendi|stok azaldı/)).toBe(false);
  });
});

describe("Kalıp Üretim mesajı", () => {
  it("AC-5: sonlandırılmış dönem açılınca aynı uyarı; açık dönemde yok", () => {
    const form = (id, kapali) => ({ id, baslangicTarihi: "2026-09-01", bitisTarihi: "2026-09-30", not: `Dönem ${id}`, kapali, satirlar: [] });
    STOK({ defaultSubTab: "uretim", uretimFormlari: [form(1, true)], setUretimFormlari: vi.fn(), kalipDefs: [], partSales: [] });
    fireEvent.click(within(screen.getByText("Dönem 1").closest("tr")).getAllByRole("button")[0]);
    expect(var_(/Bu dönem sonlandırılmış\. Düzenleyebilir ama yeni kalıp ekleyemezsiniz\./)).toBe(true);
    cleanup();
    STOK({ defaultSubTab: "uretim", uretimFormlari: [form(2, false)], setUretimFormlari: vi.fn(), kalipDefs: [], partSales: [] });
    fireEvent.click(within(screen.getByText("Dönem 2").closest("tr")).getAllByRole("button")[0]);
    expect(var_(/Bu dönem sonlandırılmış/)).toBe(false);
  });
});
