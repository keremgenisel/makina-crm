// @vitest-environment jsdom
// Spec 0097 gerçek App: Katalog'da tarihli zam kaydın gövdesine geçmişle yazılır; Makina Maliyeti › Parti Hesabı kapanmış partiyi
// eski maliyetle, zamdan sonra üretilen makinayı yeni maliyetle hesaplar; App'in ham müşteri dizisi (tumMusteriler) stoğa dönen
// makinanın gerçek tarihini taşır (R9/4).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { GECERLILIK_ETIKETI } from "../../src/lib/urunAgaci";
import * as V from "../fixtures/0097-veri";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete window.crmStorage; });
const { default: App } = await import("../../src/App");

// Silinme yakın tarihli: App yüklemesindeki otuz günlük çöp temizliği daha eskisini siler.
const COP = { id: 12, name: "Silinen", model: "AK100", serialNo: "D7", uretimTarihi: "2026-01-12", deletedAt: new Date(Date.now() - 2 * 86400000).toISOString() };
const DONEN = { id: 7, model: "AK100", serialNo: "D7", partiId: 1, note: "Silinen müşteriden geri döndü" };
const veri = () => ({
  giderTurleri: V.TURLER, giderler: V.GIDERLER, tedarikciler: [], parts: V.PARCALAR, standardModels: V.STANDART, customModels: V.OZEL,
  stock: [...V.STOCK, DONEN], customers: [...V.CUSTOMERS, COP], uretimPartileri: V.PARTILER,
  giderTanimlari: [], hesapHareketleri: [], kasaHesaplari: [], cekler: [],
  appSettings: { giderAyarlari: { yururlukAy: V.YURURLUK }, maliyetAyarlari: V.AYAR }, dataVersion: 1,
});
let kayitlar;
const baslat = async () => {
  kayitlar = [];
  window.crmStorage = { load: vi.fn(async () => structuredClone(veri())), save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }), getVersion: vi.fn(async () => 1) };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const partiHesabi = () => { menu("Makina Maliyeti"); fireEvent.click(screen.getByRole("radio", { name: "Parti Hesabı" })); };
const hucreler = (id) => within(screen.getByTestId(`parti-satiri-${id}`)).getAllByRole("cell").map(c => c.textContent);

describe("Spec 0097 gerçek App", () => {
  it("AC-47 (App hattı): ham müşteri dizisiyle stoğa dönen makina Ocak grubunda; tarihsiz satırda yalnız gerçekten tarihsiz makina", async () => {
    await baslat();
    partiHesabi();
    expect(hucreler("AK100#1").slice(1, 3)).toEqual(["3", "26,00 ₺"]);
    expect(hucreler("AK100#3")[1]).toBe("1");
  });
  it("AC-2 / AC-18 / AC-24 (App hattı): Katalog'da 2026-05-01'den 20 TL; gövdede geçmiş; eski parti değişmez, Mayıs makinası yeni maliyetle", async () => {
    await baslat();
    partiHesabi();
    const karOnce = screen.getByTestId("ozet-kar-gercek").textContent;
    menu("Ayarlar");
    fireEvent.click(screen.getAllByText("Katalog").filter(e => !e.closest("nav"))[0]);
    fireEvent.click(screen.getAllByText("Parça/Yedek Parça").pop());
    fireEvent.click(within((await screen.findByText("Rulman")).closest("tr")).getByTitle("Düzenle"));
    fireEvent.change(screen.getByLabelText("Alış maliyeti"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText(GECERLILIK_ETIKETI), { target: { value: "2026-05-01" } });
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    await waitFor(() => expect(kayitlar.some(d => d.parts?.find(p => p.id === 1)?.maliyet === 20)).toBe(true));
    const rulman = kayitlar.filter(d => d.parts?.find(p => p.id === 1)?.maliyet === 20).pop().parts.find(p => p.id === 1);
    expect(rulman.maliyetGecmisi).toEqual([...V.RULMAN_GECMISI, { gecerli: "2026-05-01", kurus: 2000 }]);
    partiHesabi();
    expect(hucreler("AK100#1")[2]).toBe("26,00 ₺");
    expect(hucreler("AK100#2")[2]).toBe("36,00 ₺");
    expect(screen.getByTestId("ozet-kar-gercek").textContent).toBe(karOnce);
    fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: "2" } });
    expect(hucreler("AK100")[2]).toBe("46,00 ₺"); // 2026-05-02 üretim: 2 × 20 + 3 × 2
  });
});
