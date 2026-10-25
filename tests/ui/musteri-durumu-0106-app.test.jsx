// @vitest-environment jsdom
// Spec 0106: gerçek App. Stoktan satışta makina durumu kayda damgalanır (AC-1; 0104 Karar 36'nın sırası gerçek App'te ölçülür:
// test düzenekleri güncelleyiciyi hemen çalıştırdığı için sıra hatasını göremez) ve üretim formları App'ten listeye ulaşır (R31, R32).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; vi.unstubAllGlobals(); localStorage.clear(); });

const stk = (id, o = {}) => ({ id, model: "AK100", serialNo: `S-${id}`, addedDate: "2026-09-01", parcalar: [], ...o });
const veri = () => ({
  customers: [],
  stock: [stk(1, { uretimDurumu: "montaj" }), stk(2, { uretimDurumu: "hazir" }), stk(3), stk(4, { serialNo: "" })],
  standardModels: [{ model: "AK100", sogutma: "", kapasite: "", kalip: "" }],
  appSettings: {},
});
const ac = async (v = veri()) => {
  const kayitlar = [];
  window.crmStorage = { load: vi.fn(async () => structuredClone(v)), save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }), getVersion: vi.fn(async () => 1) };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
  return kayitlar;
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const onizleme = [];
const sat = async (kayitlar, ad, secim) => {
  fireEvent.click(screen.getByText("Yeni Müşteri"));
  fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: ad } });
  const ok = screen.getAllByText(/^[▼▲]$/).find(e => e.previousElementSibling?.tagName === "SPAN" && e.parentElement.style.userSelect === "none");
  fireEvent.click(ok.parentElement);
  fireEvent.click(screen.getAllByText("AK100").find(e => e.tagName === "DIV" && e.style.fontWeight === "700"));
  if (secim === "manuel") fireEvent.change(screen.getByPlaceholderText("AK140-2026-001"), { target: { value: "MAN-1" } });
  else fireEvent.change(screen.getByText(/Stoktan seçin/).closest("select"), { target: { value: secim } });
  // Triyaj bulgu 2 (Karar 42): damga kayıt anında yazılır. Spec 0109 ile: seçici stok satırından ön doldurulur (önizleme
  // görünür); kayda yine gerçekten düşülen satırın durumu yazılır (damga beklentileri aynen).
  onizleme.push(screen.getByRole("combobox", { name: "Makina durumu" }).value);
  fireEvent.click(screen.getByText("Kaydet"));
  await waitFor(() => expect(kayitlar.some(d => d.customers?.some(c => c.name === ad))).toBe(true));
  return kayitlar.at(-1).customers.find(c => c.name === ad);
};

describe("Spec 0106: gerçek App", () => {
  it("AC-1: stoktan satılan montajdaki makina montaj, satışa hazır hazır, alanı boş satır hazır damgalanır", async () => {
    const kayitlar = await ac();
    menu("Müşteriler");
    expect(await sat(kayitlar, "Montaj AŞ", "S-1")).toMatchObject({ sourceStockId: 1, makinaDurumu: "montaj" });
    expect(await sat(kayitlar, "Hazır AŞ", "S-2")).toMatchObject({ sourceStockId: 2, makinaDurumu: "hazir" });
    expect(await sat(kayitlar, "Boş AŞ", "S-3")).toMatchObject({ sourceStockId: 3, makinaDurumu: "hazir" });
    expect(await sat(kayitlar, "Serisiz AŞ", "__serisiz__")).toMatchObject({ sourceStockId: 4, makinaDurumu: "hazir" });
    expect(onizleme.slice(-4)).toEqual(["montaj", "hazir", "hazir", "hazir"]); // spec 0109 ile (ters çevrildi)
    const tr = screen.getByText("Montaj AŞ").closest("tr");
    expect(tr.querySelector('[data-testid="durum-pili"]').textContent).toBe("MONTAJ YAPILIYOR");
  });
  it("AC-2: stok dışı (manuel seri) satışta alan kayda yazılmaz", async () => {
    const v = veri();
    v.stock = [];
    const kayitlar = await ac(v);
    menu("Müşteriler");
    const k = await sat(kayitlar, "Manuel AŞ", "manuel");
    expect("makinaDurumu" in k).toBe(false);
  });
  it("R31, R32: App üretim formlarını listeye kapısız iletir", async () => {
    const v = veri();
    v.customers = [{ id: 60, name: "Formlu AŞ", model: "AK100", serialNo: "F-60", makinaDurumu: "montaj", kaliplar: [{ ad: "Y55", olcu: "55", uretimFormId: 900 }] }];
    v.uretimFormlari = [{ id: 900, satirlar: [{ kaynakTip: "musteri", kaynakId: 60, kalipIdx: 0, tamamlandi: true }] }];
    await ac(v);
    menu("Müşteriler");
    const piller = [...screen.getByText("Formlu AŞ").closest("tr").querySelectorAll('[data-testid="durum-pili"]')].map(e => e.textContent);
    expect(piller).toEqual(["MONTAJ YAPILIYOR", "KALIP HAZIR · TESLİM BEKLİYOR"]);
  });
});
