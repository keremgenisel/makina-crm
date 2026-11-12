// @vitest-environment jsdom
// Spec 0144 gerçek App (AC-36, AC-37, B-R10): gider yetkisi ve Ayarlar sekmesi olmayan Stok kullanıcısı fiyatlı nüshayı basar;
// fiyat ayrı izin istemez (malzemeler iki girişe de kapısız iner). Ekranda para yine yok ve kayıt tetiklenmez.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent } from "@testing-library/react";

const { default: App } = await import("../../src/App");
afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; delete window.appPrint; vi.unstubAllGlobals(); localStorage.clear(); });

const veri = () => ({
  customers: [], stock: [],
  standardModels: [{ model: "AK100_DS", defaultParcalar: [{ partId: "42", ad: "Pul", miktar: 8 }, { partId: "41", ad: "Kesme mili", miktar: 1 }] }],
  parts: [{ id: 42, ad: "Pul", models: [], maliyet: 5, tedarikciId: 13 },
    { id: 41, ad: "Kesme mili", models: [], maliyetKalemleri: [{ tur: "malzeme", malzemeId: 501, bicim: "mil", cap: 140, boy: 78, adet: 1 }] }],
  malzemeler: [{ id: 501, ad: "304 Paslanmaz", ozgulAgirlik: 7.9, kiloFiyati: 2.95, paraBirimi: "USD", kur: 50, tedarikciId: 12 }],
  partStock: [], partStockLog: [],
  uretimPartileri: [{ id: 801, ad: "Güz Partisi", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK100_DS: 70 } }],
  giderTurleri: [], giderler: [], giderTanimlari: [], hesapHareketleri: [],
  tedarikciler: [{ id: 12, ad: "Ana Çelik", hammadde: true }, { id: 13, ad: "Beta Metal", hammadde: true }],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01" } }, dataVersion: 1,
});

describe("Spec 0144 gerçek App", () => {
  it("AC-36 / AC-37: gider ve Ayarlar yetkisiz Stok kullanıcısı fiyatlı nüshayı basar; ekranda para yok, kayıt yok", async () => {
    const kayitlar = [];
    window.crmStorage = { load: vi.fn(async () => structuredClone(veri())), save: vi.fn(async (d) => { kayitlar.push(d); return true; }), getVersion: vi.fn(async () => 1) };
    const t = { getConfig: async () => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role: "user", permissions: JSON.stringify({ tabs: ["dashboard", "stock"] }), username: "u" }) };
    window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
    window.appPrint = { printHtml: vi.fn() };
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
    await new Promise(r => setTimeout(r, 800));
    expect(screen.queryAllByText("Ayarlar").filter(e => e.closest("nav"))).toHaveLength(0);
    fireEvent.click(screen.getAllByText("Stok").find(e => e.closest("nav")));
    fireEvent.click(screen.getByRole("tab", { name: "Parça/Yedek Parça Stoğu" }));
    fireEvent.click(screen.getByTestId("siparis-listesi-dugmesi"));
    expect(screen.getByTestId("siparis-penceresi").textContent).not.toMatch(/[₺$€]/);
    const once = kayitlar.length;
    fireEvent.click(screen.getByTestId("siparis-yazdir"));
    fireEvent.click(screen.getByTestId("nusha-fiyatli"));
    const [html, , ad] = window.appPrint.printHtml.mock.calls[0];
    expect(ad).toMatch(/-Fiyatli\.pdf$/);
    expect(html).toContain("Fiyatlı nüsha"); expect(html).toContain("2,95 $/kg"); expect(html).toContain("5,00 ₺/adet");
    await new Promise(r => setTimeout(r, 700));
    expect(kayitlar.length).toBe(once);
  });
});
