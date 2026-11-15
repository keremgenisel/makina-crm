// @vitest-environment jsdom
// Spec 0146: gerçek App. Makina teslimiyle toplu teslim kayıt gövdesine ulaşır; türetilmiş "Hazır" App'in üretim formu
// haritasından gelir (Plan kararı 25), yani harita detay penceresine gerçek zincirle iner.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; vi.unstubAllGlobals(); localStorage.clear(); });

const MUSTERI = { id: 60, name: "Teslim AŞ", model: "AK100", serialNo: "T-60", installDate: "2026-09-01", warrantyEnd: "2028-09-01", makinaDurumu: "hazir", aciklama: "dokunulmaz",
  kaliplar: [{ ad: "Y55", olcu: "55", uretimFormId: 900 }, { ad: "Y60", olcu: "60", kalipDurumu: "hazir" }, { ad: "K40", olcu: "40", kalipDurumu: "uretimde" }] };
const veri = () => ({
  customers: [MUSTERI],
  stock: [],
  standardModels: [{ model: "AK100", sogutma: "", kapasite: "", kalip: "" }],
  uretimFormlari: [{ id: 900, satirlar: [{ kaynakTip: "musteri", kaynakId: 60, kalipIdx: 0, tamamlandi: true }] }],
  appSettings: {},
});
const ac = async () => {
  const kayitlar = [];
  window.crmStorage = { load: vi.fn(async () => structuredClone(veri())), save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }), getVersion: vi.fn(async () => 1) };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
  return kayitlar;
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));

describe("Spec 0146: gerçek App", () => {
  it("AC-10 / AC-11 / AC-32: türetilmiş ve elle hazır iki kalıp teslim olur, gövdede kaydın başka alanı değişmez", async () => {
    const kayitlar = await ac();
    menu("Müşteriler");
    fireEvent.click(screen.getAllByText("Teslim AŞ")[0]);
    expect(screen.getByTestId("detay-kalip-ozeti").textContent).toBe("1 Üretimde · 2 Hazır");
    fireEvent.change(within(screen.getByTestId("detay-makina-durumu")).getByRole("combobox"), { target: { value: "teslim" } });
    expect(screen.getByText(/Hazır bekleyen 2 kalıp/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Evet, İşaretle/ }));
    expect(screen.getByTestId("detay-kalip-ozeti").textContent).toBe("1 Üretimde · 2 Teslim edildi");
    await waitFor(() => expect(kayitlar.some(d => d.customers?.[0]?.kaliplar?.[0]?.kalipDurumu === "teslim")).toBe(true));
    const c = kayitlar.at(-1).customers[0];
    expect(c.makinaDurumu).toBe("teslim");
    expect(c.kaliplar.map(k => k.kalipDurumu)).toEqual(["teslim", "teslim", "uretimde"]);
    expect(c.kaliplar[0]).toEqual({ ad: "Y55", olcu: "55", uretimFormId: 900, kalipDurumu: "teslim" });
    expect(c.aciklama).toBe("dokunulmaz");
  });
});
