// @vitest-environment jsdom
// Spec 0087 C3: makina kitinin bugünkü işi değişmez. Ek maliyet kalemleri kite girmez ("Kiti Uygula" yalnız parça satırlarını
// doldurur, AC-23); parça maliyeti ve ek kalemler stok düşümünü ve makina_uretimi hareketlerini değiştirmez (AC-27);
// Stok'un model süzgeci parçanın İŞARETİNE bakar, kite değil (AC-12).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useState } from "react";
import { MakinaStokTab } from "../../src/components/stock/MakinaStokTab";

afterEach(cleanup);

const PARCALAR = [
  { id: 7, ad: "Rulman", models: ["AK100_DS"], fiyatTRY: 450 },
  { id: 8, ad: "Kayış", models: ["AK100_DS"], fiyatTRY: 90 },
  { id: 9, ad: "Başka", models: ["AK120_DS"] },
];
const MODEL = { model: "AK100_DS", defaultParcalar: [{ partId: "7", ad: "Rulman", miktar: 2 }] };

const uret = ({ parts, model }) => {
  let st;
  function H() {
    const [stock, setStock] = useState([]);
    const [partStock, setPartStock] = useState([{ id: 1, partId: "7", miktar: 10 }, { id: 2, partId: "8", miktar: 5 }]);
    const [partStockLog, setPartStockLog] = useState([]);
    st = { stock, partStock, partStockLog };
    return <MakinaStokTab stock={stock} setStock={setStock} models={[model, { model: "AK120_DS", defaultParcalar: [] }]} showToast={vi.fn()} parts={parts}
      partStock={partStock} setPartStock={setPartStock} partStockLog={partStockLog} setPartStockLog={setPartStockLog} />;
  }
  render(<H />);
  fireEvent.click(screen.getByRole("button", { name: /Stoğa Makina Ekle/ }));
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "AK100_DS" } });
  const kitDugmesi = screen.getByRole("button", { name: /Kiti Uygula/ }).textContent;
  const suzgec = screen.getByText(/Tüm parçaları göster/).textContent;
  fireEvent.click(screen.getByRole("button", { name: /Kiti Uygula/ }));
  fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
  const sonuc = { kitDugmesi, suzgec, parcalar: st.stock[0].parcalar, partStock: st.partStock,
    log: st.partStockLog.map(({ id: _i, referansId: _r, ...l }) => l) };
  cleanup();
  return sonuc;
};

describe("Spec 0087: makina kiti stokta değişmez", () => {
  it("AC-23, AC-27: ek maliyet kalemli ve maliyetli parçalı model ile kalemsiz model aynı kiti uygular, aynı stok düşer, aynı hareket yazılır", () => {
    const once = uret({ parts: PARCALAR, model: MODEL });
    const sonra = uret({ parts: PARCALAR.map(p => ({ ...p, maliyet: 12.5 })), model: { ...MODEL, ekMaliyetler: [{ ad: "Büküm işçiliği", tutar: 90 }, { ad: "Kaplama", tutar: 145.6 }] } });
    expect(sonra).toEqual(once);
    expect(sonra.kitDugmesi).toMatch(/Kiti Uygula \(1 parça\)/);
    expect(sonra.parcalar).toEqual([{ partId: "7", miktar: 2 }]);
    expect(sonra.partStock.find(s => s.partId === "7").miktar).toBe(8);
    expect(sonra.log).toEqual([expect.objectContaining({ partId: "7", miktar: -2, tip: "makina_uretimi" })]);
  });

  it("AC-12: Stok'un model süzgeci işaretli parçaları sayar (kitte olmayan işaretli parça dahil)", () => {
    const r = uret({ parts: PARCALAR, model: MODEL });
    expect(r.suzgec).toMatch(/AK100_DS modeline ait 2 parça/);
  });
});
