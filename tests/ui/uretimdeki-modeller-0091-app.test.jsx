// @vitest-environment jsdom
// Spec 0091: gerçek App. Maliyet ekranı işareti App'in uygulama ayarlarından okur (R7); Ayarlar'da işaret kaldırılıp yeniden
// verilince kayıt gövdesinde anahtar kalmaz (R24/2, R24/4, AC-9/3); model seçicileri App'ten süzülmemiş listeyi alır (R21).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";

const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); });

const veri = (appSettings = {}) => ({
  customers: [], stock: [], standardModels: [{ model: "AK100", defaultParcalar: [] }, { model: "AK160", defaultParcalar: [] }],
  customModels: [{ model: "OZEL_1", defaultParcalar: [] }],
  giderTurleri: [{ id: 1, ad: "Genel", davranis: "normal", maliyetRolu: "genel" }], giderler: [], uretimPartileri: [],
  giderTanimlari: [], tedarikciler: [], hesapHareketleri: [],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01" }, maliyetAyarlari: { baslangicAy: "2026-01", bitisAy: "2026-12", varsayilanAdet: 10 }, ...appSettings },
  dataVersion: 1,
});
const baslat = async (appSettings, { yuklemeler = null } = {}) => {
  const kayitlar = [];
  let n = 0;
  const yukle = () => structuredClone(veri(yuklemeler ? yuklemeler[Math.min(n++, yuklemeler.length - 1)] : appSettings));
  window.crmStorage = { load: vi.fn(async () => yukle()), save: vi.fn(async (d) => { kayitlar.push(JSON.parse(JSON.stringify(d))); return true; }), getVersion: vi.fn(async () => 1) };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
  return { kayitlar };
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));

describe("Spec 0091: gerçek App", () => {
  it("AC-13 (App yolu): kayıtlı işaretle Model Maliyetleri yalnız üretimdeki modelleri çizer", async () => {
    await baslat({ uretimdeOlmayanModeller: ["AK160"] });
    menu("Makina Maliyeti");
    expect(screen.getByTestId("model-satiri-AK100")).toBeTruthy();
    expect(screen.getByTestId("model-satiri-OZEL_1")).toBeTruthy();
    expect(screen.queryByTestId("model-satiri-AK160")).toBeNull();
    expect(screen.getByTestId("model-sayilari").textContent).toBe("3 model tanımlı · üretimde: 2");
  });
  it("AC-9/3 (App yolu): Ayarlar'da işaret kaldırılıp yeniden verilince kayıt gövdesinde anahtar yok", async () => {
    const { kayitlar } = await baslat();
    menu("Ayarlar");
    if (!screen.queryByRole("button", { name: "Makina Modelleri" })) fireEvent.click(screen.getByRole("button", { name: /Katalog/ }));
    fireEvent.click(screen.getByRole("button", { name: "Makina Modelleri" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "AK160 · üretimde" }));
    await waitFor(() => expect(kayitlar.some(k => k.appSettings?.uretimdeOlmayanModeller?.includes("AK160"))).toBe(true));
    fireEvent.click(screen.getByRole("checkbox", { name: "AK160 · üretimde" }));
    await waitFor(() => expect("uretimdeOlmayanModeller" in kayitlar[kayitlar.length - 1].appSettings).toBe(false));
  });
  // Triyaj (bulgu 1): başka bilgisayar son işareti kaldırınca okunan gövdede anahtar yoktur; yenileme bellekteki eski listeyi
  // korursa sonraki kayıt onu geri yazar. Sunucu PC'nin veri değişti itmesiyle yeniden yükleme ölçülür.
  it("triyaj bulgu 1: listeyi taşıyan yüklemeden sonra anahtarsız yenileme işareti kaldırır; sonraki kayıtta anahtar yok", async () => {
    let itme = null;
    window.appServer = new Proxy({ onDataChanged: (cb) => { itme = cb; return () => {}; } },
      { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
    const { kayitlar } = await baslat(null, { yuklemeler: [{ uretimdeOlmayanModeller: ["AK160"] }, {}] });
    menu("Makina Maliyeti");
    expect(screen.queryByTestId("model-satiri-AK160")).toBeNull();
    expect(typeof itme).toBe("function");
    await itme();
    await waitFor(() => expect(screen.getByTestId("model-satiri-AK160")).toBeTruthy());
    expect(screen.getByTestId("model-sayilari").textContent).toBe("3 model tanımlı · üretimde: 3");
    await new Promise(r => setTimeout(r, 800)); // yenilemeden sonraki 700 ms kayıt bastırması
    // Sonraki herhangi bir kayıt (Ayarlar'da başka bir alan) bayat listeyi geri yazmaz.
    menu("Ayarlar");
    if (!screen.queryByRole("button", { name: "Makina Modelleri" })) fireEvent.click(screen.getByRole("button", { name: /Katalog/ }));
    fireEvent.click(screen.getByRole("button", { name: "Makina Modelleri" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "AK100 · Analiz'de göster" }));
    await waitFor(() => expect(kayitlar.some(k => k.appSettings?.analizGizliModeller?.includes("AK100"))).toBe(true), { timeout: 3000 });
    const son = kayitlar.filter(k => k.appSettings?.analizGizliModeller?.includes("AK100")).pop();
    expect("uretimdeOlmayanModeller" in son.appSettings).toBe(false);
  });
  it("AC-33 / AC-34 / AC-35 (R21): App model seçicilerine süzülmemiş listeyi verir; Evrak da aynı listeyi alır", () => {
    const app = readFileSync("src/App.jsx", "utf8");
    expect(app).toMatch(/const allModels = \[\.\.\.standardModels, \.\.\.liveCustomModels\];/);
    expect(app).not.toMatch(/uretimdeMi\b|uretimIsareti/); // App yalnız yükleme yolunda alanı taşır (triyaj bulgu 1), süzmez
    expect(app).toMatch(/<Documents[^\n]*allModels=\{allModels\}/);
    expect((app.match(/\bmodels=\{allModels\}/g) || []).length).toBeGreaterThanOrEqual(2); // Customers, Stock
    expect(readFileSync("src/components/Documents.jsx", "utf8")).not.toMatch(/uretimde/);
  });
});
