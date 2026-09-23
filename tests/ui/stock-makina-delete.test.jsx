// @vitest-environment jsdom
// Spec 0001 R7 / AC-28: Makina Stoğu'ndan silme onayında bağlı gider sayısı.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { MakinaStokTab } from "../../src/components/stock/MakinaStokTab";

afterEach(cleanup);

const stock = [{ id: 501, model: "AK100_DS", serialNo: "2026-121", parcalar: [] }];
const ciz = (giderler) => render(<MakinaStokTab stock={stock} setStock={vi.fn()} models={[{ model: "AK100_DS" }]} showToast={vi.fn()}
  parts={[]} partStock={[]} setPartStock={vi.fn()} partStockLog={[]} setPartStockLog={vi.fn()} giderler={giderler} />);
const sil = () => {
  const satir = screen.getByText("2026-121").closest("tr");
  const dugmeler = within(satir).getAllByRole("button");
  fireEvent.click(dugmeler[dugmeler.length - 1]);
};

describe("Makina Stoğu silme — bağlı gider sayısı", () => {
  it("AC-28: atanmış gider sayısı yazılır, kalemin silinmediği söylenir", () => {
    ciz([{ id: 1, atamaTur: "makina", makinaTur: "stok", makinaId: 501 }, { id: 2, atamaTur: "model", makinaTur: "stok", makinaId: 501 }]);
    sil();
    expect(screen.getByText(/stoktan silinecek/).textContent).toContain("Bu makinaya atanmış 1 gider kalemi var: silinmez, ortak gidere düşer.");
  });
  it("bağlı gider yoksa ek metin yok", () => {
    ciz([]);
    sil();
    expect(screen.getByText(/stoktan silinecek/).textContent).not.toMatch(/gider/);
  });
});
