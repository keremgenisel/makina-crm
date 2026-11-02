// @vitest-environment jsdom
// Spec 0121 R6/2, Karar 38 (triyaj bulgu 2): gerçek App. Set Hazırla penceresi bileşen adlarını HAM parça dizisinden çözer; App'ten
// Stock'a giden `rawParts` ya da PartStokTab'ın ham dizi seçimi bozulursa çöpteki bileşen "kaydı bulunamayan parça" görünürdü.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import App from "../../src/App";
import { SILINMIS_PARCA, BULUNAMAYAN_PARCA } from "../../src/lib/urunAgaci";

afterEach(() => { cleanup(); delete window.crmStorage; vi.unstubAllGlobals(); localStorage.clear(); });

const veri = () => ({
  parts: [
    { id: 7, ad: "Rulman", models: [], maliyet: 100 },
    { id: 11, ad: "Eski Dişli", models: [], maliyet: 40, deletedAt: new Date().toISOString() },
    { id: 10, ad: "Rulman Seti", models: [], setIcerigi: [{ partId: 7, miktar: 2 }, { partId: 11, miktar: 1 }] },
  ],
  partStock: [{ id: 1, partId: "7", miktar: 5 }],
});
const ac = async () => {
  window.crmStorage = { load: vi.fn(async () => structuredClone(veri())), save: vi.fn(async () => true), getVersion: vi.fn(async () => 1) };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));

describe("Spec 0121: gerçek App, Set Hazırla penceresi (R6/2)", () => {
  it("AC-7 / AC-40 (pencere): çöpteki bileşen pencerede ham diziden adıyla 'silinmiş parça' yazar", async () => {
    await ac();
    menu("Stok");
    fireEvent.click(screen.getByRole("tab", { name: /Parça\/Yedek Parça Stoğu/ }));
    const satir = screen.getAllByText("Rulman Seti").map(e => e.closest("tr")).find(Boolean);
    fireEvent.click(within(satir).getByRole("button", { name: "Set Hazırla" }));
    const pencere = screen.getByTestId("set-hazirla");
    expect(pencere.textContent).toContain(`Eski Dişli (${SILINMIS_PARCA})`);
    expect(pencere.textContent).not.toContain(BULUNAMAYAN_PARCA);
  });
});
