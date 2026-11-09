// @vitest-environment jsdom
// Spec 0138 gerçek App (R6/2, R21, AC-15, AC-21, AC-30, AC-49): sunucudan eski bir istemcinin bıraktığı dış işlem bölümü gelse de
// App onu okumaz ve yazmaz; kayıt gövdesi, otomatik yedek ve ayrı pano penceresinin anlık görüntüsü dış işlem taşımaz; parça kaydı
// maliyet bölümüne dokunulmayan düzenlemede birebir; otuz günlük temizlik kalemde geçen tedarikçiyi korur, geçmeyeni siler.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { YEREL_YEDEK_AYARI_ANAHTAR } from "../../src/lib/utils";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete window.crmStorage; delete window.appServisPano; localStorage.clear(); });
const { default: App } = await import("../../src/App");

const ESKI = new Date(Date.now() - 60 * 86400000).toISOString();
const veri = (o = {}) => ({
  // Güncellenmemiş bir istemcinin yazdığı bölüm: yeni App okumaz (R7, C6).
  disIslemler: [{ id: 701, ad: "Isıl İşlem", birim: "adet", birimFiyati: 20, tedarikciId: 91 }],
  tedarikciler: [{ id: 91, ad: "Lazerci", deletedAt: ESKI }, { id: 92, ad: "Kimsesiz", deletedAt: ESKI }],
  parts: [
    { id: 41, ad: "Pim", models: [], maliyetKalemleri: [{ tur: "islem", ad: "Lazer", tedarikciId: 91, tutar: 15 }] },
  ],
  standardModels: [{ model: "AK100", defaultParcalar: [{ partId: "41", ad: "Pim", miktar: 2 }] }],
  giderTurleri: [], giderler: [], giderTanimlari: [], hesapHareketleri: [], kasaHesaplari: [], cekler: [], malzemeler: [],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01" } }, dataVersion: 1, ...o,
});
const baslat = async (o, ek = {}) => {
  const kayitlar = []; const yedekler = [];
  window.crmStorage = {
    load: vi.fn(async () => structuredClone(veri(o))), save: vi.fn(async (b) => { kayitlar.push(structuredClone(b)); return true; }), getVersion: vi.fn(async () => 1),
    writeBackup: vi.fn(async (folder, data) => { yedekler.push(structuredClone(data)); return true; }), ...ek,
  };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
  return { kayitlar, yedekler };
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const ayarlar = async (grup, panel) => {
  menu("Ayarlar");
  fireEvent.click(screen.getAllByText(grup).filter(e => !e.closest("nav"))[0]);
  fireEvent.click(screen.getAllByText(panel).pop());
};

describe("Spec 0138 gerçek App", () => {
  it("AC-49 / AC-15: kayıt gövdesinde dış işlem anahtarı yok; dokunulmayan parça birebir", async () => {
    const { kayitlar } = await baslat();
    await ayarlar("Katalog", "Parça/Yedek Parça");
    expect(screen.queryByText("Dış İşlemler")).toBeNull(); // AC-1 (App)
    fireEvent.click(within(screen.getByText("Pim").closest("tr")).getByTitle("Düzenle"));
    fireEvent.change(screen.getByLabelText("Yedek Parça Adı (TR)"), { target: { value: "Pim A" } });
    fireEvent.click(screen.getByRole("button", { name: /^Kaydet$/ }));
    await waitFor(() => expect(kayitlar.some(k => k.parts?.some(p => p.ad === "Pim A"))).toBe(true), { timeout: 3000 });
    const son = kayitlar.filter(k => k.parts?.some(p => p.ad === "Pim A")).pop();
    expect(kayitlar.every(k => !("disIslemler" in k))).toBe(true);
    expect(son.parts.find(p => p.id === 41)).toEqual({ ...veri().parts[0], ad: "Pim A" });
  }, 20000);
  it("AC-21 (App): otuz günlük temizlik kalemde geçen tedarikçiyi korur (nedeni tek adresli), geçmeyeni siler", async () => {
    await baslat();
    await ayarlar("Veri Yönetimi", "Çöp Kutusu");
    const ted = (await screen.findByText("Lazerci")).closest("tr");
    expect(within(ted).getByTestId("cop-neden").textContent).not.toMatch(/dış işlem/i);
    expect(screen.queryByText("Kimsesiz")).toBeNull();
    expect(screen.queryByText(/Isıl İşlem/)).toBeNull(); // AC-6 (App)
  }, 20000);
  it("AC-30 / AC-49 (otomatik yedek): App'in otomatik yedeği dış işlem taşımaz", async () => {
    localStorage.setItem(YEREL_YEDEK_AYARI_ANAHTAR, JSON.stringify({ autoBackup: true, backupFolder: "/tmp/yedek", frequency: "daily", lastBackup: null }));
    const { yedekler } = await baslat();
    await waitFor(() => expect(yedekler.length).toBeGreaterThan(0), { timeout: 3000 });
    expect(Object.keys(yedekler[0])).not.toContain("disIslemler");
    expect(yedekler[0].parts).toHaveLength(1);
  }, 20000);
  it("AC-49 (ayrı pano penceresi): anlık görüntü dış işlem taşımaz", async () => {
    let acildi = null;
    window.appServisPano = { onAcildi: (cb) => { acildi = cb; return () => {}; }, onKapandi: () => () => {}, veriPush: vi.fn(), kayitPush: vi.fn(), onMutate: () => () => {} };
    await baslat();
    await act(async () => { acildi?.(); });
    await waitFor(() => expect(window.appServisPano.veriPush).toHaveBeenCalled());
    expect(Object.keys(window.appServisPano.veriPush.mock.calls.at(-1)[0])).not.toContain("disIslemler");
  }, 20000);
  it("AC-49 (kaynak): kayıt bağımlılık dizisi, otomatik yedek ve dokuz ekran çağrısında dış işlem yok", () => {
    const app = readFileSync("src/App.jsx", "utf8");
    expect(app).not.toMatch(/disIslem|DisIslem/);
    const oto = app.slice(app.indexOf("window.crmStorage.writeBackup("), app.indexOf("});", app.indexOf("window.crmStorage.writeBackup(")));
    expect(oto).toMatch(/malzemeler/);
    expect(readFileSync("src/components/Settings.jsx", "utf8")).not.toMatch(/disIslem|DisIslem/);
  });
});
