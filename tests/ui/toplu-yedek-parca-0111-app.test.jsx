// @vitest-environment jsdom
// Spec 0111: gerçek App. Makina geçmişinden toplu yedek parça düzenlemesinin kaydedilen gövdesi (`window.crmStorage.save` yükü):
// kimlikler ve parti aynı, çöpe damgalanan kayıt yok, stok hareketi yazılmamış, form içi işaretler (`_kayitId`, `_kilitId`,
// `_satirHatalari`, `satirlar`, `batchEdit`) kayda sızmamış (AC-1, AC-2, AC-17, AC-24). Saf karar tests/toplu-yedek-parca-0111.test.js'te.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; vi.unstubAllGlobals(); localStorage.clear(); });

const kayit = (id, partId, miktar) => ({
  id, batchId: 50, aliciTipi: "musteri", musteriId: 70, partId, miktar, birimFiyat: 100, currency: "TRY", tarih: "2026-10-01",
  faturaTipi: "Faturalı Yurtiçi", odendi: false, yontem: "Nakit", kargoDurum: "", olusturmaZamani: `2026-10-01T10:00:0${id % 10}`,
  tahsisler: [{ miktar, customerId: 70, serialNo: "", makinaSerbest: "", tarih: "2026-10-01" }],
});
const dus = (id, partId, miktar) => ({ id: 500 + id, partId, miktar: -miktar, tip: "bayi_satis", referansId: id, tarih: "2026-10-01", notlar: "" });
const veri = () => ({
  customers: [{ id: 70, name: "Anadolu Gıda", model: "AK100", serialNo: "S1", installDate: "2026-01-05", currency: "TRY", faturali: "Faturalı Yurtiçi", kaliplar: [] }],
  standardModels: [{ model: "AK100", sogutma: "", kapasite: "", kalip: "" }],
  parts: [{ id: 81, ad: "Rulman" }, { id: 82, ad: "Kayış" }],
  partStock: [{ id: 1, partId: "81", miktar: 8 }, { id: 2, partId: "82", miktar: 7 }],
  partStockLog: [dus(101, "81", 2), dus(102, "82", 3)],
  yedekParcaSatislar: [kayit(101, "81", 2), kayit(102, "82", 3)],
  appSettings: {},
});

describe("Spec 0111: gerçek App", () => {
  it("AC-1 / AC-2 / AC-17: fiyat değişikliği yerinde güncellenir; gövdede kimlikler aynı, çöp yok, stok hareketi yok, işaret sızmaz", async () => {
    const kayitlar = [];
    window.crmStorage = { load: vi.fn(async () => structuredClone(veri())), save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }), getVersion: vi.fn(async () => 1) };
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
    await new Promise(r => setTimeout(r, 800));
    fireEvent.click(screen.getAllByText("Müşteriler").find(e => e.closest("nav")));
    fireEvent.click(screen.getByText("Anadolu Gıda"));
    fireEvent.click(await screen.findByText(/Yedek Parça \((Kargo|Fabrika Teslim)\) \(2 kalem\)/));
    fireEvent.change(screen.getByLabelText("Birim fiyat 2"), { target: { value: "250" } });
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    await waitFor(() => expect(kayitlar.some(d => d.yedekParcaSatislar?.some(s => s.id === 102 && s.birimFiyat === 250))).toBe(true));
    const son = kayitlar.at(-1);
    expect(son.yedekParcaSatislar.map(s => s.id)).toEqual([101, 102]);
    expect(son.yedekParcaSatislar.every(s => !s.deletedAt && s.batchId === 50)).toBe(true);
    expect(son.yedekParcaSatislar.map(s => s.olusturmaZamani)).toEqual(veri().yedekParcaSatislar.map(s => s.olusturmaZamani));
    expect(son.partStockLog).toEqual(veri().partStockLog);
    expect(son.partStock).toEqual(veri().partStock);
    const sizan = son.yedekParcaSatislar.flatMap(s => Object.keys(s).filter(k => k.startsWith("_") || k === "satirlar" || k === "batchEdit"));
    expect(sizan).toEqual([]);
  });
});
