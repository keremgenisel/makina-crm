// @vitest-environment jsdom
// Spec 0140 gerçek App: Makina Maliyeti dört görünüm (AC-12), Stok'tan açılan pencere katalog panelinin kilidini almaz (AC-53, AC-54),
// gider yetkisi olmayan kullanıcıda tedarikçi adları iner ama para çizilmez, belgesinde para yok (AC-15, AC-16, AC-71), pencere
// açılıp sürülünce hiçbir veri bölümü değişmez (AC-17, AC-37), kapanıp açılınca öneriler yeniden gelir (AC-36), parti listesi canlı (AC-72).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";

const { default: App } = await import("../../src/App");
afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; delete window.crmLocks; delete window.appPrint; vi.unstubAllGlobals(); localStorage.clear(); });

const veri = () => ({
  customers: [], stock: [],
  standardModels: [{ model: "AK100_DS", defaultParcalar: [{ partId: "42", ad: "Pul", miktar: 8 }, { partId: "41", ad: "Kesme mili", miktar: 1 }] }],
  parts: [{ id: 42, ad: "Pul", models: [], maliyet: 5, tedarikciId: 13 },
    { id: 41, ad: "Kesme mili", models: [], maliyetKalemleri: [{ tur: "malzeme", malzemeId: 501, bicim: "mil", yontem: "kilo", cap: 140, boy: 78, adet: 1 }] }],
  malzemeler: [{ id: 501, ad: "304 Paslanmaz", ozgulAgirlik: 7.9, kiloFiyati: 2.95, paraBirimi: "USD", kur: 50, tedarikciId: 12 }],
  partStock: [], partStockLog: [],
  uretimPartileri: [{ id: 801, ad: "Güz Partisi", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK100_DS: 70 } },
    { id: 802, ad: "Çöpteki Parti", baslangicAy: "2026-10", bitisAy: null, planlananAdetler: { AK100_DS: 5 }, deletedAt: new Date().toISOString() }],
  giderTurleri: [], giderler: [], giderTanimlari: [], hesapHareketleri: [],
  tedarikciler: [{ id: 12, ad: "Ana Çelik", hammadde: true }, { id: 13, ad: "Beta Metal", hammadde: true }],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01" } }, dataVersion: 1,
});
const baslat = async ({ sunucu = null } = {}) => {
  const kayitlar = [];
  window.crmStorage = { load: vi.fn(async () => structuredClone(veri())), save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }), getVersion: vi.fn(async () => 1) };
  if (sunucu) {
    const t = { getConfig: async () => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role: "user", permissions: JSON.stringify(sunucu), username: "u" }) };
    window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  }
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
  return { kayitlar };
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const stoktanAc = () => {
  menu("Stok");
  fireEvent.click(screen.getByRole("tab", { name: "Parça/Yedek Parça Stoğu" }));
  fireEvent.click(screen.getByTestId("siparis-listesi-dugmesi"));
};

describe("Spec 0140 gerçek App", () => {
  it("AC-12 / R13: Makina Maliyeti dört görünüm; bilinmeyen 'siparis' görünümü Model Maliyetleri'ne düşer", async () => {
    await baslat();
    menu("Makina Maliyeti");
    expect(within(screen.getByRole("radiogroup", { name: "Görünüm" })).getAllByRole("radio").map(r => r.textContent))
      .toEqual(["Model Maliyetleri", "Parti Hesabı", "Üretim Partileri", "Hesap Ayarları"]);
    const { MakinaMaliyeti } = await import("../../src/components/MakinaMaliyeti");
    cleanup();
    render(<MakinaMaliyeti baslangicGorunum="siparis" setAppSettings={vi.fn()} setGiderTurleri={vi.fn()} setStandardModels={vi.fn()} setCustomModels={vi.fn()} setUretimPartileri={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "Model Maliyetleri" }).getAttribute("aria-checked")).toBe("true");
  });
  it("AC-53 / AC-54: Stok'tan açılan pencere katalog panelinin kilidini almaz", async () => {
    window.crmLocks = { acquire: vi.fn(async () => ({ ok: true })), release: vi.fn(async () => {}), releaseAll: vi.fn(async () => {}), heartbeat: vi.fn(), list: vi.fn(async () => []) };
    await baslat();
    stoktanAc();
    expect(screen.getByTestId("siparis-penceresi")).toBeTruthy();
    expect(window.crmLocks.acquire.mock.calls.map(c => c.slice(0, 2))).not.toContainEqual(["ayar", "yedekparca"]);
  });
  it("AC-15 / AC-16 / AC-71 / AC-72: gider yetkisi olmayan Stok kullanıcısı tedarikçi adlarını görür, para görmez, belgesinde para yok; çöpteki parti yok", async () => {
    window.appPrint = { printHtml: vi.fn() };
    await baslat({ sunucu: { tabs: ["dashboard", "stock"] } });
    stoktanAc();
    const p = screen.getByTestId("siparis-penceresi");
    expect(screen.getAllByTestId("siparis-tedarikci-adi").map(e => e.textContent)).toEqual(["Ana Çelik", "Beta Metal"]);
    expect(p.textContent).not.toMatch(/₺|\$|€/);
    expect([...screen.getByLabelText("Üretim partisi").options].map(o => o.textContent)).not.toContain("Çöpteki Parti");
    fireEvent.click(screen.getByTestId("siparis-yazdir"));
    fireEvent.click(screen.getByTestId("nusha-fiyatsiz")); // spec 0144 ile (B-R1): Yazdır önce nüshayı sorar
    const [html] = window.appPrint.printHtml.mock.calls[0];
    expect(html).toContain("Ana Çelik"); expect(html).not.toMatch(/Birim (maliyet|fiyat)|Tutar|\d,\d{2} (TL|\$|€)/);
  });
  it("AC-17 / AC-37 / AC-36: pencere açılıp sürülünce kayıt tetiklenmez; kapanıp açılınca öneriler yeniden gelir", async () => {
    const { kayitlar } = await baslat();
    stoktanAc();
    const once = kayitlar.length;
    fireEvent.change(screen.getByLabelText("Pul sipariş adedi"), { target: { value: "5" } });
    fireEvent.click(screen.getByLabelText(/^304 Paslanmaz .* sipariş etme$/));
    fireEvent.change(screen.getByLabelText("Makina adedi 1"), { target: { value: "12" } });
    await new Promise(r => setTimeout(r, 800));
    expect(kayitlar.length).toBe(once);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("siparis-penceresi")).toBeNull();
    fireEvent.click(screen.getByTestId("siparis-listesi-dugmesi"));
    expect(screen.getByLabelText("Pul sipariş adedi").value).toBe("560");
    expect(screen.getByLabelText("Makina adedi 1").value).toBe("70");
  });
});
