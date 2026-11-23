// @vitest-environment jsdom
// Spec 0157 gerçek App: günün kuru App → Ayarlar → parça kartına iner (R2/3, AC-49); ağ yokken kart çizilir, öneri gelmez ve nedeni
// yazar; döviz maliyet kaydedilen gövdede üç alanla, dokunulmadan kaydedilen döviz parçanın iki alanı aynen (AC-42, AC-45).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { KUR_CEVRIMDISI } from "../../src/lib/kur";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete window.crmStorage; delete window.appServer; });
const { default: App } = await import("../../src/App");

const veri = () => ({
  parts: [{ id: 30, ad: "İthal rulman", models: [], maliyet: 120, maliyetParaBirimi: "USD", maliyetKuru: 50.370257 }, { id: 31, ad: "Lira pul", models: [], maliyet: 10 }],
  standardModels: [], giderTurleri: [], giderler: [], giderTanimlari: [], hesapHareketleri: [], kasaHesaplari: [], cekler: [],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01" } }, dataVersion: 1,
});
const baslat = async (fetchImpl) => {
  const kayitlar = [];
  window.crmStorage = { load: vi.fn(async () => structuredClone(veri())), save: vi.fn(async (b) => { kayitlar.push(structuredClone(b)); return true; }), getVersion: vi.fn(async () => 1) };
  vi.stubGlobal("fetch", vi.fn(fetchImpl));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
  return { kayitlar };
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const parcaPaneli = () => {
  menu("Ayarlar");
  fireEvent.click(screen.getAllByText("Katalog").filter(e => !e.closest("nav"))[0]);
  fireEvent.click(screen.getAllByText("Parça/Yedek Parça").pop());
};
const duzenle = async (ad) => fireEvent.click(within((await screen.findByText(ad)).closest("tr")).getByTitle("Düzenle"));
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /^Kaydet$/ }));
const son = (kayitlar, id, kosul = () => true) => kayitlar.map(k => k.parts?.find(p => p.id === id)).filter(p => p && kosul(p)).pop();

describe("Spec 0157 gerçek App", () => {
  it("AC-49 / AC-48: günün kuru parça kartına iner; döviz parça kayıtlı kurla açılır, ipucunda günün kuru", async () => {
    await baslat(async () => ({ json: async () => ({ rates: { TRY: 41.5, EUR: 0.8 } }) }));
    parcaPaneli();
    await duzenle("İthal rulman");
    expect(screen.getByLabelText("Kur (alış maliyeti)").value).toBe("50,370257");
    await waitFor(() => expect(screen.getByTestId("gunun-kuru").textContent).toContain("41,50"));
  });
  it("AC-49 / AC-5: ağ yokken kart çizilir, öneri gelmez ve çevrimdışı nedeni yazar", async () => {
    await baslat(() => Promise.reject(new Error("test: ağ yok")));
    parcaPaneli();
    fireEvent.click(screen.getByRole("button", { name: /Parça\/Yedek Parça Ekle/ }));
    fireEvent.change(screen.getByLabelText("Para birimi (alış maliyeti)"), { target: { value: "USD" } });
    expect(screen.getByLabelText("Kur (alış maliyeti)").value).toBe("");
    expect(screen.getByTestId("kur-oneri-nedeni").textContent).toBe(KUR_CEVRIMDISI);
  });
  it("AC-45 / AC-42 (App gövdesi): dokunulmadan kaydedilen döviz parçanın üç alanı aynen; lira parçada iki anahtar yok", async () => {
    const { kayitlar } = await baslat(() => Promise.reject(new Error("test: ağ yok")));
    parcaPaneli();
    await duzenle("İthal rulman");
    fireEvent.change(screen.getByPlaceholderText("Örn: Kesme Bıçağı Seti"), { target: { value: "İthal rulman B" } });
    kaydet();
    await waitFor(() => expect(son(kayitlar, 30, p => p.ad === "İthal rulman B")).toBeTruthy());
    expect(son(kayitlar, 30, p => p.ad === "İthal rulman B")).toEqual({ ...veri().parts[0], ad: "İthal rulman B" });
    const lira = son(kayitlar, 31);
    expect(lira).not.toHaveProperty("maliyetParaBirimi"); expect(lira).not.toHaveProperty("maliyetKuru");
  });
});
