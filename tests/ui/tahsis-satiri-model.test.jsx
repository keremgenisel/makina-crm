// @vitest-environment jsdom
// Stok › Yedek Parça Satışı: tahsis satırında bağlı makinanın modeli seri numarasından önce yazılır (kullanıcı isteği 2026-10-28):
// "1 adet → OX CO Sp. z o.o. · AK120_DSC · S/N F04234925 · 27/10/2026". Modeli olmayan kayıt ve serbest metinli tahsis eskisi gibi.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { YedekParcaSatisTab } from "../../src/components/stock/YedekParcaSatisTab";

afterEach(cleanup);

const C = [
  { id: 1, name: "OX CO Sp. z o.o.", model: "AK120_DSC", serialNo: "F04234925" },
  { id: 2, name: "Modelsiz Gıda", serialNo: "F01" },
];
const satis = (id, musteriId, tahsisler) => ({ id, aliciTipi: "musteri", musteriId, partId: "81", miktar: 1, birimFiyat: 3000, currency: "TRY",
  faturaTipi: "Faturalı Yurtiçi", tarih: "2026-10-27", odendi: true, yontem: "Nakit", kargoDurum: "", tahsisler });
const ciz = (satislar) => {
  render(<YedekParcaSatisTab yedekParcaSatislar={satislar} setYedekParcaSatislar={vi.fn()} dealers={[]} parts={[{ id: 81, ad: "KONVEYÖR BANTI" }]}
    customers={C} kdvRates={[{ from: "2000-01-01", rate: 20 }]} setPartStock={vi.fn()} setPartStockLog={vi.fn()} />);
};

describe("Yedek parça satışı: tahsis satırında makina modeli", () => {
  it("bağlı makinada model seri numarasından önce yazılır", () => {
    ciz([satis(1, 1, [{ miktar: 1, customerId: 1, serialNo: "", makinaSerbest: "", tarih: "2026-10-27" }])]);
    fireEvent.click(screen.getByText("OX CO Sp. z o.o."));
    expect(screen.getByTestId("tahsis-satiri").textContent).toBe("🔗 1 adet → OX CO Sp. z o.o. · AK120_DSC · S/N F04234925 · 27/10/2026");
  });
  it("modeli olmayan kayıtta ve serbest metinli tahsiste satır eskisi gibi", () => {
    ciz([satis(1, 2, [{ miktar: 1, customerId: 2, serialNo: "", makinaSerbest: "", tarih: "2026-10-27" }]),
      satis(2, 2, [{ miktar: 1, customerId: null, serialNo: "X9", makinaSerbest: "Bayinin müşterisi", tarih: "2026-10-27" }])]);
    fireEvent.click(screen.getByText("Modelsiz Gıda"));
    expect(screen.getAllByTestId("tahsis-satiri").map(s => s.textContent).sort()).toEqual([
      "🔗 1 adet → Bayinin müşterisi · S/N X9 · 27/10/2026",
      "🔗 1 adet → Modelsiz Gıda · S/N F01 · 27/10/2026",
    ]);
  });
});
