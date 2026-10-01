// @vitest-environment jsdom
// Spec 0065 (AC-1, AC-3, AC-6, AC-10 uçtan uca): gerçek App'te kayıt çakışması sonrası yeniden yükleme + birleştirme.
// Yerel kullanıcı Parça Stoğu'nda hareket yazar; aynı anda sunucuya başka kullanıcının satışı düşmüştür. Kayıt çakışır,
// App sunucu verisini yükler ve yerel hareketi birleştirir: adet sunucu adedi + yerel hareket olur, log ikisini taşır.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";
import App from "../../src/App";

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); });

const bekle = (ms) => new Promise(r => setTimeout(r, ms));
const PARCA = { id: 7, ad: "Dişli Takımı", models: [] };
const V1 = { parts: [PARCA], partStock: [{ id: 1, partId: "7", miktar: 10 }], partStockLog: [], dataVersion: 1 };
// Başka kullanıcının (B) yedek parça satışı: 2 adet düştü, sunucu sürümü 2.
const V2 = { parts: [PARCA], partStock: [{ id: 1, partId: "7", miktar: 8 }], dataVersion: 2,
  partStockLog: [{ id: 9001, partId: "7", miktar: -2, tip: "bayi_satis", referansId: 501, tarih: "2026-10-01", notlar: "" }] };

function kur(v1 = V1) {
  const d = { veri: v1, kayitlar: [], cakisma: null, reddet: true };
  window.crmStorage = {
    load: vi.fn(async () => JSON.parse(JSON.stringify(d.veri))),
    save: vi.fn(async (b) => { d.kayitlar.push(b); if (d.reddet) { d.reddet = false; return false; } return true; }),
    getVersion: vi.fn(async () => d.veri.dataVersion),
  };
  const t = { getConfig: async () => ({}), onConflict: (cb) => { d.cakisma = cb; return () => {}; } };
  window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  return d;
}
const parcaStogunaGit = () => {
  fireEvent.click(screen.getByText("Stok"));
  fireEvent.click(screen.getByRole("tab", { name: /Parça\/Yedek Parça Stoğu/ }));
};
const satir = () => screen.getByText("Dişli Takımı").closest("tr");
const cakismaVeBirlestir = async (d, v2 = V2) => {
  await waitFor(() => expect(d.kayitlar.length).toBe(1), { timeout: 3000 }); // ilk kayıt çakıştı
  d.veri = v2;
  await d.cakisma();                                                          // App sunucuyu yükler, 750 ms sonra birleştirir
  await waitFor(() => expect(d.kayitlar.length).toBeGreaterThanOrEqual(2), { timeout: 4000 });
  return d.kayitlar[d.kayitlar.length - 1];
};

describe("Spec 0065: App çakışma sonrası stok hareketi birleştirmesi", () => {
  it("AC-1 / AC-3: yerel stok girişi ile sunucudaki satış birlikte uygulanır (10 − 2 + 5 = 13), log ikisini taşır", async () => {
    const d = kur();
    render(<App />);
    await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
    await bekle(800);
    parcaStogunaGit();
    fireEvent.click(within(satir()).getByText("+ Ekle"));
    fireEvent.change(screen.getByPlaceholderText("1"), { target: { value: "5" } });
    fireEvent.click(screen.getByText("Kaydet"));
    const son = await cakismaVeBirlestir(d);
    expect(son.partStock.find(s => s.partId === "7").miktar).toBe(13);
    expect(son.partStockLog.map(l => l.tip).sort()).toEqual(["bayi_satis", "stok_girisi"]);
  }, 12000);

  it("AC-6: yerel sayım düzeltmesi birleştirmede sıfırlama noktasıdır (sunucu adedi değil sayım kazanır)", async () => {
    const d = kur();
    render(<App />);
    await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
    await bekle(800);
    parcaStogunaGit();
    fireEvent.click(within(satir()).getByText("Düzelt"));
    const modal = screen.getByText("Stok Miktarını Düzelt").closest("[role='dialog']") || document.body;
    fireEvent.change(within(modal).getByDisplayValue("10"), { target: { value: "20" } });
    fireEvent.click(within(modal).getByText("Kaydet"));
    const son = await cakismaVeBirlestir(d);
    expect(son.partStock.find(s => s.partId === "7").miktar).toBe(20);
    expect(son.partStockLog.map(l => l.tip).sort()).toEqual(["bayi_satis", "manuel_duzelt"]);
  }, 12000);

  it("Triyaj 1: sunucuda silinmiş (eski istemcinin geri aldığı) satır birleştirmede diriltilmez (10 + 5 = 15, −3 yeniden düşülmez)", async () => {
    const A = { id: 3001, partId: "7", miktar: -3, tip: "servis", referansId: 777, tarih: "2026-09-30", notlar: "" };
    const d = kur({ ...V1, partStock: [{ id: 1, partId: "7", miktar: 7 }], partStockLog: [A] });
    render(<App />);
    await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
    await bekle(800);
    parcaStogunaGit();
    fireEvent.click(within(satir()).getByText("+ Ekle"));
    fireEvent.change(screen.getByPlaceholderText("1"), { target: { value: "5" } });
    fireEvent.click(screen.getByText("Kaydet"));
    // Eski istemci servisi silip satırı log'dan çıkardı, 3'ü stoğa iade etti.
    const son = await cakismaVeBirlestir(d, { ...V1, partStock: [{ id: 1, partId: "7", miktar: 10 }], partStockLog: [], dataVersion: 2 });
    expect(son.partStock.find(s => s.partId === "7").miktar).toBe(15);
    expect(son.partStockLog.map(l => l.tip)).toEqual(["stok_girisi"]);
  }, 12000);
});
