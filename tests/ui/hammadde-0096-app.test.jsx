// @vitest-environment jsdom
// Spec 0096 gerçek App: parça listesi App → Giderler → Tedarikler hattına bağlı (kullanım hücresi parça sayar), Katalog'da
// kırılımdan gelen maliyet, otuz günlük otomatik temizliğin kırılımda geçen tedarikçiyi koruması (R13/2, AC-37).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { KIRILIMDA_TEDARIKCI_NEDENI } from "../../src/lib/gider";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete window.crmStorage; delete window.appServer; });
const { default: App } = await import("../../src/App");

const ESKI = new Date(Date.now() - 60 * 86400000).toISOString(); // otuz günü geçmiş çöp
const veri = () => ({
  giderTurleri: [{ id: 1, ad: "Malzeme", davranis: "normal" }],
  tedarikciler: [
    { id: 11, ad: "Demir Çelik", hammadde: true }, { id: 12, ad: "Sac Ltd", hammadde: true },
    { id: 13, ad: "Eski Döküm", deletedAt: ESKI }, { id: 14, ad: "Kullanılmayan", deletedAt: ESKI },
  ],
  parts: [
    { id: 5, ad: "Ayna dişlisi", models: [], hammaddeler: [{ tedarikciId: 11, tutar: 7000 }, { tedarikciId: 12, tutar: 9000 }, { tedarikciId: 13, tutar: 1000 }] },
  ],
  giderler: [], giderTanimlari: [], hesapHareketleri: [], kasaHesaplari: [], cekler: [],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01" } }, dataVersion: 1,
});
const baslat = async () => {
  window.crmStorage = { load: vi.fn(async () => structuredClone(veri())), save: vi.fn(async () => true), getVersion: vi.fn(async () => 1) };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const ayarlar = async (grup, panel) => {
  menu("Ayarlar");
  fireEvent.click(screen.getAllByText(grup).filter(e => !e.closest("nav"))[0]);
  fireEvent.click(screen.getAllByText(panel).pop());
};

describe("Spec 0096 gerçek App", () => {
  it("AC-37: otuz günlük temizlik kırılımda geçen çöpteki tedarikçiyi korur (satırda neden), geçmeyeni siler", async () => {
    await baslat();
    await ayarlar("Veri Yönetimi", "Çöp Kutusu");
    const satir = (await screen.findByText("Eski Döküm")).closest("tr");
    expect(within(satir).getByTestId("cop-neden").textContent).toBe(KIRILIMDA_TEDARIKCI_NEDENI);
    expect(screen.queryByText("Kullanılmayan")).toBeNull();
  });
  it("AC-24 / AC-48 (App hattı): Tedarikler ve Ekstre kullanım hücresi parça kırılımını sayar; Katalog'da maliyet kırılımın toplamı", async () => {
    await baslat();
    menu("Giderler");
    fireEvent.click((await screen.findAllByText("Tedarikler ve Ekstre"))[0]);
    const satir = (await screen.findByText("Demir Çelik")).closest("tr");
    expect(within(satir).getAllByRole("cell")[2].textContent).toBe("1 parçada");
    expect(within(satir).getByTestId("hammadde-rozeti")).toBeTruthy();
    await ayarlar("Katalog", "Parça/Yedek Parça");
    const parca = (await screen.findByText("Ayna dişlisi")).closest("tr");
    expect(within(parca).getByTestId("parca-maliyet").textContent).toBe("17.000,00 ₺3 tedarikçiden");
  });
});
