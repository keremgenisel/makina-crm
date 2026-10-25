// @vitest-environment jsdom
// Spec 0109: gerçek App. "Dokunuldu" işareti kaydedilen gövdeye girmez (AC-16, R12/2); ölçüm `window.crmStorage.save` yükü,
// iki yol: ekleme ve seri numarası bekleyen kaydın düzenlenmesi. Seri bekleyen düzenlemede stok satırı seçilince kayda düşülen
// satırın durumu yazılır (AC-28; düzenleme kolu kaydı damgadan önce yazıyor, gerçek App'te ölçülür).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; vi.unstubAllGlobals(); localStorage.clear(); });

const stk = (id, o = {}) => ({ id, model: "AK100", serialNo: `S-${id}`, addedDate: "2026-09-01", parcalar: [], ...o });
const veri = () => ({
  customers: [{ id: 70, name: "Bekleyen AŞ", model: "AK100", serialNo: "", seriNoBekliyor: true, makinaDurumu: "teslim", kaliplar: [], installDate: "2026-01-01" }],
  stock: [stk(1, { uretimDurumu: "montaj" }), stk(2, { uretimDurumu: "hazir" })],
  standardModels: [{ model: "AK100", sogutma: "", kapasite: "", kalip: "" }],
  appSettings: {},
});
const ac = async () => {
  const kayitlar = [];
  window.crmStorage = { load: vi.fn(async () => structuredClone(veri())), save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }), getVersion: vi.fn(async () => 1) };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
  fireEvent.click(screen.getAllByText("Müşteriler").find(e => e.closest("nav")));
  return kayitlar;
};
const stokSec = (deger) => fireEvent.change(screen.getByText(/Stoktan seçin/).closest("select"), { target: { value: deger } });
const sizanAnahtar = (kayitlar) => kayitlar.flatMap(d => d.customers || []).filter(c => Object.keys(c).some(k => k.startsWith("_")));

describe("Spec 0109: gerçek App", () => {
  it("AC-16: ekleme yolunda işaret (ön doldurulmuş, sonra elle değiştirilmiş) gövdeye girmez", async () => {
    const kayitlar = await ac();
    fireEvent.click(screen.getByText("Yeni Müşteri"));
    fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: "Yeni AŞ" } });
    const ok = screen.getAllByText(/^[▼▲]$/).find(e => e.previousElementSibling?.tagName === "SPAN" && e.parentElement.style.userSelect === "none");
    fireEvent.click(ok.parentElement);
    fireEvent.click(screen.getAllByText("AK100").find(e => e.tagName === "DIV" && e.style.fontWeight === "700"));
    stokSec("S-1");
    fireEvent.change(screen.getByRole("combobox", { name: "Makina durumu" }), { target: { value: "teslim" } });
    fireEvent.click(screen.getByText("Kaydet"));
    await waitFor(() => expect(kayitlar.some(d => d.customers?.some(c => c.name === "Yeni AŞ"))).toBe(true));
    expect(kayitlar.at(-1).customers.find(c => c.name === "Yeni AŞ")).toMatchObject({ sourceStockId: 1, makinaDurumu: "teslim" });
    expect(sizanAnahtar(kayitlar)).toEqual([]);
  });
  it("AC-16 / AC-28: seri bekleyen düzenlemede stok satırı seçilince düşülen satırın durumu yazılır, işaret gövdeye girmez", async () => {
    const kayitlar = await ac();
    const tr = screen.getByText("Bekleyen AŞ").closest("tr");
    fireEvent.click(within(tr).getAllByRole("button").find(b => b.querySelector("svg") && b.className.includes("ghost")));
    stokSec("S-2");
    fireEvent.click(screen.getByText("Kaydet"));
    await waitFor(() => expect(kayitlar.some(d => d.customers?.some(c => c.id === 70 && c.sourceStockId === 2))).toBe(true));
    expect(kayitlar.at(-1).customers.find(c => c.id === 70)).toMatchObject({ sourceStockId: 2, makinaDurumu: "hazir" });
    expect(sizanAnahtar(kayitlar)).toEqual([]);
  });
});
