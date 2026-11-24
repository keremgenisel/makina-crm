// @vitest-environment jsdom
// Spec 0161 gerçek App (AC-20, AC-54, C5): Ayarlar › Uygulama › Cins Sıralaması'nda kaydedilen liste kayıt gövdesine `cinsSirasi` düz
// dizisi olarak girer; boşaltılınca anahtar gövdede yoktur; listeyi taşıyan yüklemeden sonra anahtarsız yenileme listeyi kaldırır ve
// sonraki kayıt eski listeyi geri yazmaz (0091 yükleme yolu dersi).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete window.crmStorage; delete window.appServer; localStorage.clear(); });
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
const { default: App } = await import("../../src/App");

const veri = (appSettings = {}) => ({ parts: [], customers: [], appSettings: { kdvRate: 20, ...appSettings }, dataVersion: 1 });
const baslat = async ({ yuklemeler }) => {
  const kayitlar = [];
  let n = 0;
  window.crmStorage = { load: vi.fn(async () => structuredClone(veri(yuklemeler[Math.min(n++, yuklemeler.length - 1)]))),
    save: vi.fn(async (d) => { kayitlar.push(JSON.parse(JSON.stringify(d))); return true; }), getVersion: vi.fn(async () => 1) };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
  return { kayitlar };
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const panel = () => { menu("Ayarlar"); fireEvent.click(screen.getByRole("button", { name: "Cins Sıralaması" })); };
const ekle = (c) => { fireEvent.change(screen.getByLabelText("Eklenecek cins"), { target: { value: c } }); fireEvent.click(screen.getByRole("button", { name: "Ekle" })); };

describe("Spec 0161: gerçek App", () => {
  it("AC-20 / AC-54: liste gövdeye düz dizi olarak girer; boşaltılınca anahtar gövdede yok", async () => {
    const { kayitlar } = await baslat({ yuklemeler: [{}] });
    panel();
    ekle("Rulman"); ekle("Keçe");
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(kayitlar.some(k => Array.isArray(k.appSettings?.cinsSirasi))).toBe(true));
    expect(kayitlar.filter(k => k.appSettings?.cinsSirasi).pop().appSettings.cinsSirasi).toEqual(["Rulman", "Keçe"]);
    fireEvent.click(screen.getByRole("button", { name: "Rulman: kaldır" }));
    fireEvent.click(screen.getByRole("button", { name: "Keçe: kaldır" }));
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect("cinsSirasi" in kayitlar[kayitlar.length - 1].appSettings).toBe(false));
  });
  it("AC-20 / C5: listeyi taşıyan yüklemeden sonra anahtarsız yenileme listeyi kaldırır; sonraki kayıtta eski liste yok", async () => {
    let itme = null;
    window.appServer = new Proxy({ onDataChanged: (cb) => { itme = cb; return () => {}; } },
      { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
    const { kayitlar } = await baslat({ yuklemeler: [{ cinsSirasi: ["Rulman"] }, {}] });
    panel();
    expect(screen.getAllByTestId("cins-sira-satiri")).toHaveLength(1);
    await itme();
    await waitFor(() => expect(screen.queryAllByTestId("cins-sira-satiri")).toHaveLength(0));
    await new Promise(r => setTimeout(r, 800));
    ekle("Vida");
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(kayitlar.some(k => k.appSettings?.cinsSirasi?.includes("Vida"))).toBe(true), { timeout: 3000 });
    expect(kayitlar.filter(k => k.appSettings?.cinsSirasi).pop().appSettings.cinsSirasi).toEqual(["Vida"]);
  });
});
