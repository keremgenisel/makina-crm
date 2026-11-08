// @vitest-environment jsdom
// Spec 0133 gerçek App: Ayarlar sekmesi olmayan ve stok eylemleri boş dizi olan kullanıcı maliyete bağlı parçanın türetilmiş
// fiyatını görür (AC-48), kaydedilen gövdenin parça bölümü değişmez (AC-98), ve prop zinciri App → Stok / Müşteriler / Evrak
// canlı malzeme listesini ve fiyat ayarını taşır (AC-56, AC-58).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, within, act } from "@testing-library/react";
import { readFileSync } from "node:fs";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete window.crmStorage; delete window.appServer; delete window.appServisPano; delete window.auditLog; localStorage.clear(); });
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
const { default: App } = await import("../../src/App");
const { Settings } = await import("../../src/components/Settings");

const veri = (o = {}) => ({
  malzemeler: [{ id: 501, ad: "304 Paslanmaz", ozgulAgirlik: 7.9, kiloFiyati: 2.95, paraBirimi: "USD", kur: 50 }],
  parts: [
    { id: 41, ad: "Kesme mili", models: [], fiyatTRY: 4500, fiyatKipi: "maliyet", malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 140, boy: 78, payCap: 4, payBoy: 5, fire: 8 } },
    { id: 43, ad: "Pul", models: [], maliyet: 5, fiyatTRY: 20 },
  ],
  partStock: [{ id: 1, partId: 41, miktar: 5 }, { id: 2, partId: 43, miktar: 9 }],
  customers: [{ id: 700, name: "FİYAT FİRMA", model: "AK100", serialNo: "S1", saleDate: "2026-01-10" }],
  giderTurleri: [], tedarikciler: [], giderler: [], giderTanimlari: [], hesapHareketleri: [], kasaHesaplari: [], cekler: [],
  appSettings: { fiyatAyarlari: { varsayilanKat: 2.4 } }, dataVersion: 1, ...o,
});
const KISITLI = { tabs: ["dashboard", "customers", "stock"], stockActions: [] };
const baslat = async ({ sunucu = KISITLI, yuklenen = veri() } = {}) => {
  const kayitlar = [];
  window.crmStorage = { load: vi.fn(async () => structuredClone(yuklenen)), save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }), getVersion: vi.fn(async () => 1) };
  if (sunucu) {
    const t = { getConfig: async () => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role: "user", permissions: JSON.stringify(sunucu), username: "u" }) };
    window.appServer = new Proxy(t, { get: (x, k) => x[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  }
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa")[0]).toBeTruthy());
  await new Promise(r => setTimeout(r, 800));
  return { kayitlar };
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const menudeVar = (ad) => screen.queryAllByText(ad).some(e => e.closest("nav"));
const sec = (bas) => fireEvent.mouseDown([...document.querySelectorAll(".sp-option")].find(x => x.textContent.startsWith(bas)));
const ara = (metin) => { const k = screen.getAllByPlaceholderText("Parça ara...").pop(); fireEvent.focus(k); fireEvent.change(k, { target: { value: metin } }); };

describe("Spec 0133 gerçek App", () => {
  it("AC-48: Ayarlar sekmesi olmayan, stok eylemleri boş kullanıcı Parça Stoğu'nda türetilmiş fiyatı görür", async () => {
    await baslat();
    expect(menudeVar("Ayarlar")).toBe(false);
    menu("Stok");
    fireEvent.click(screen.getByRole("tab", { name: /Parça Stoğu/ }));
    const satir = screen.getAllByText("Kesme mili").map(e => e.closest("tr")).find(Boolean);
    expect(satir.textContent).toMatch(/4\.082,69/);
    expect(satir.textContent).not.toMatch(/4\.500/);
  });
  it("AC-58 / AC-98 / AC-56: müşteri detayından servis sepetine türetilmiş fiyat gelir; kaydedilen gövdenin parça bölümü değişmez", async () => {
    const { kayitlar } = await baslat();
    menu("Müşteriler");
    await waitFor(() => expect(screen.getByText("FİYAT FİRMA")).toBeTruthy());
    fireEvent.click(screen.getByText("FİYAT FİRMA"));
    fireEvent.click(await screen.findByRole("button", { name: /Yeni Servis Talebi/ }));
    ara("Kesme mili"); sec("Kesme mili");
    expect([...document.querySelectorAll("input")].map(i => i.value)).toContain("4.083");
    fireEvent.click(screen.getAllByRole("button", { name: /Kaydet/ }).pop());
    await waitFor(() => expect(kayitlar.some(k => k.services?.some(s => s.degisenParcalar?.length))).toBe(true), { timeout: 3000 });
    const son = kayitlar.filter(k => k.services?.some(s => s.degisenParcalar?.length)).pop();
    expect(son.services.find(s => s.degisenParcalar?.length).degisenParcalar[0].fiyat).toBe(4083);
    expect(son.parts).toEqual(veri().parts);
  });
  it("Triyaj bulgu 3 (AC-59, R10/4): gerçek App ayrı pano penceresine gönderdiği anlık görüntüde canlı malzeme listesini taşır", async () => {
    let acildi = null;
    window.appServisPano = { onAcildi: (cb) => { acildi = cb; return () => {}; }, onKapandi: () => () => {}, veriPush: vi.fn(), kayitPush: vi.fn(), onMutate: () => () => {} };
    await baslat({ sunucu: null, yuklenen: veri({ malzemeler: [...veri().malzemeler, { id: 502, ad: "Çöpteki", deletedAt: "2026-11-01T00:00:00Z" }] }) });
    await act(async () => { acildi?.(); });
    await waitFor(() => expect(window.appServisPano.veriPush).toHaveBeenCalled());
    const son = window.appServisPano.veriPush.mock.calls.at(-1)[0];
    expect(son.malzemeler.map(m => m.id)).toEqual([501]); // canlı liste (çöpteki yok)
    expect(son.appSettings.fiyatAyarlari).toEqual({ varsayilanKat: 2.4 });
  });
  it("Triyaj bulgu 2: istemci bilgisayarda toplu kip değişikliği işlem geçmişine /api/audit ile sunucuya yazılır", async () => {
    const apiRequest = vi.fn(async () => ({ ok: true }));
    const yerel = vi.fn();
    window.appServer = { apiRequest };
    window.auditLog = { log: yerel };
    const v = veri();
    render(<Settings customers={[]} services={[]} dealers={[]} stock={[]} setStock={vi.fn()} setCustomers={vi.fn()} setServices={vi.fn()} setDealers={vi.fn()} version="1"
      appSettings={v.appSettings} setAppSettings={vi.fn()} factory={{ name: "A" }} setFactory={vi.fn()} kalipDefs={[]} setKalipDefs={vi.fn()} calisanlar={[]} setCalisanlar={vi.fn()}
      partTypeDefs={[]} setPartTypeDefs={vi.fn()} onInitialTabConsumed={vi.fn()} aktifKullanici="u" standardModels={[]} setStandardModels={vi.fn()} customModels={[]}
      setCustomModels={vi.fn()} rawCustomModels={[]} tedarikciler={[]} setTedarikciler={vi.fn()} initialTab="yedekparca" parts={v.parts} setParts={vi.fn()} rawParts={v.parts}
      malzemeler={v.malzemeler} serverPermissions={JSON.stringify({ tabs: ["settings"] })} />);
    fireEvent.click(screen.getByRole("button", { name: "Listedeki 2 parçayı elle sabite al" }));
    fireEvent.click(screen.getByRole("button", { name: "Uygula" }));
    expect(apiRequest).toHaveBeenCalledWith(expect.objectContaining({ method: "POST", path: "/api/audit", body: expect.objectContaining({ action: "fiyat_kipi_degisti", entity: "parca_tanimi" }) }));
    expect(yerel).not.toHaveBeenCalled();
  });
  it("AC-56 (App kaynağı): canlı malzeme listesi Müşteriler, Stok, Evrak, bayi ve pano çağrılarına iner", () => {
    const app = readFileSync("src/App.jsx", "utf8");
    for (const ad of ["<Customers", "<Stock", "<Documents", "<SimpleDealers", "<ServisPanosu"]) {
      const i = app.indexOf(ad);
      expect(i, ad).toBeGreaterThan(-1);
      const blok = app.slice(i, app.indexOf("/>", i));
      expect(blok, ad).toMatch(/malzemeler=\{liveMalzemeler\}/);
    }
  });
  it("Triyaj ölçümü (0091 yükleme yolu dersi): boş ayarda gövdede anahtar yok, yükleme yolu alanı gövdeden açıkça alır", () => {
    // Yoksa spread bellekteki bayat fiyat ayarını korur ve sonraki kayıt onu geri yazardı.
    expect(readFileSync("src/App.jsx", "utf8")).toMatch(/fiyatAyarlari: data\.appSettings\.fiyatAyarlari/);
  });
});
