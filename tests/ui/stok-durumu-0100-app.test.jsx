// @vitest-environment jsdom
// Spec 0100: gerçek App. Üç çağıran (Stok ekranı, pano, Anasayfa) aynı motoru çağırır (AC-37, casusla) ve tek partili veride üç
// yerin sayıları birebir eşittir (AC-37/2); stok satırı olmadan satılıp partisi seçilen makina panonun satılan adedine girer (AC-41).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";

const casus = vi.hoisted(() => ({ ozet: 0, parti: 0 }));
vi.mock("../../src/lib/stokDurumu", async (orijinal) => {
  const m = await orijinal();
  return {
    ...m,
    stokDurumOzeti: (...a) => { casus.ozet++; return m.stokDurumOzeti(...a); },
    partiUretimOzeti: (...a) => { casus.parti++; return m.partiUretimOzeti(...a); },
  };
});
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); casus.ozet = 0; casus.parti = 0; delete window.crmStorage; vi.unstubAllGlobals(); localStorage.clear(); });

const PARTI = { id: 902, ad: "2026-2", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK100: 6 } };
const stk = (id, o = {}) => ({ id, model: "AK100", serialNo: `S-${id}`, addedDate: "2026-09-01", parcalar: [], partiId: 902, ...o });
const veri = () => ({
  customers: [{ id: 50, name: "Satılan AŞ", model: "AK100", serialNo: "S-50", installDate: "2026-09-20", partiId: 902 }],
  stock: [stk(1, { uretimDurumu: "montaj" }), stk(2, { uretimDurumu: "hazir" }), stk(3)],
  uretimPartileri: [PARTI], appSettings: { giderAyarlari: { yururlukAy: "2026-01" } },
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
const kutu = () => [...document.querySelectorAll(".stat-card")].find(k => k.firstChild.textContent === "Satışa Hazır Makina");

describe("Spec 0100: gerçek App", () => {
  it("AC-37 / AC-37/2: Anasayfa, Stok ve pano aynı motoru çağırır; tek partili veride üç yerin sayıları birebir eşit", async () => {
    await ac();
    expect(casus.ozet).toBeGreaterThan(0);
    const anasayfaHazir = kutu().childNodes[1].textContent;
    const anasayfaAlt = kutu().childNodes[2].textContent;
    expect([anasayfaHazir, anasayfaAlt]).toEqual(["2", "1 montajda · 0 önceki partiden"]);

    const once = casus.ozet;
    menu("Stok");
    expect(casus.ozet).toBeGreaterThan(once);
    expect(screen.getByTestId("stok-ozet").textContent).toBe("Toplam 3Montajda 1Satışa hazır 2Önceki partiden kaldı 0");

    fireEvent.click(screen.getByRole("tab", { name: "Parti Üretim Panosu" }));
    expect(casus.parti).toBeGreaterThan(0);
    const pano = screen.getByTestId("parti-uretim-panosu");
    expect(within(pano).getByTestId("pano-sayi-montajda").textContent).toBe("Montajda1");
    expect(within(pano).getByTestId("pano-sayi-hazir").textContent).toBe("Satışa hazır2");
    expect(within(pano).getByTestId("pano-sayi-satildi").textContent).toBe("Satıldı1");
  });

  it("AC-41: stok satırı olmadan satılıp partisi seçilen makina panonun satılan adedine girer", async () => {
    const kayitlar = await ac();
    menu("Müşteriler");
    fireEvent.click(screen.getByText("Yeni Müşteri"));
    fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: "Ön Sipariş AŞ" } });
    fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: "902" } });
    fireEvent.click(screen.getByText("Kaydet"));
    await waitFor(() => expect(kayitlar.some(d => d.customers?.some(c => c.name === "Ön Sipariş AŞ" && c.partiId === 902))).toBe(true));
    menu("Stok");
    fireEvent.click(screen.getByRole("tab", { name: "Parti Üretim Panosu" }));
    expect(within(screen.getByTestId("parti-uretim-panosu")).getByTestId("pano-sayi-satildi").textContent).toBe("Satıldı2");
  });

  // Spec 0103 AC-31 (Karar 16, 33): AC-41'in düzenleme ikizi. Kendi verisini kurar (paylaşılan veri() değişmez): partisiz
  // satılmış bir kayıt düzenlemede partiye bağlanınca panonun satılan adedi bir artar, planlanandan kalan bir azalır.
  it("AC-31 (spec 0103): partisiz satılmış kaydın düzenlemesinde parti seçilince panonun satılan adedi artar, kalanı azalır", async () => {
    const v = veri();
    v.customers.push({ id: 51, name: "Partisiz AŞ", model: "AK100", serialNo: "S-51", installDate: "2026-09-30", currency: "TRY" });
    const kayitlar = await ac(v);
    const panoSayisi = (k) => within(screen.getByTestId("parti-uretim-panosu")).getByTestId(`pano-sayi-${k}`).textContent;
    menu("Stok");
    fireEvent.click(screen.getByRole("tab", { name: "Parti Üretim Panosu" }));
    expect([panoSayisi("satildi"), panoSayisi("kalan")]).toEqual(["Satıldı1", "Planlanandan kalan2"]);
    menu("Müşteriler");
    const satir = screen.getByText("Partisiz AŞ").closest("tr");
    fireEvent.click(within(satir).getAllByRole("button").find(b => b.querySelector("svg") && b.className.includes("ghost")));
    fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: "902" } });
    fireEvent.click(screen.getByText("Kaydet"));
    await waitFor(() => expect(kayitlar.some(d => d.customers?.some(c => c.id === 51 && c.partiId === 902))).toBe(true));
    menu("Stok");
    fireEvent.click(screen.getByRole("tab", { name: "Parti Üretim Panosu" }));
    expect([panoSayisi("satildi"), panoSayisi("kalan")]).toEqual(["Satıldı2", "Planlanandan kalan1"]);
  });
});
