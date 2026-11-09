// @vitest-environment jsdom
// Spec 0134 gerçek App: eldeki parça stoğu App'ten ekrana iner (R24, AC-88) ve ekran sürülürken kaydedilen gövdede hiçbir bölüm
// değişmez (AC-52, AC-53, AC-61). Spec 0140 ile (B-R1, B-R3, B-R6): ekran Stok › Parça/Yedek Parça Stoğu'ndaki pencereden açılır ve
// kapısı yeni eylem kimliğidir (Makina Maliyeti sekmesi artık gerekmez; AC-54 ters çevrildi).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";

const { default: App } = await import("../../src/App");
afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); });

const veri = () => ({
  customers: [], stock: [],
  standardModels: [{ model: "AK100_DS", defaultParcalar: [{ partId: "42", ad: "Pul", miktar: 8 }] }],
  parts: [{ id: 42, ad: "Pul", models: [], maliyet: 5 }],
  partStock: [{ id: 1, partId: "42", miktar: 100 }], partStockLog: [],
  uretimPartileri: [{ id: 801, ad: "Güz Partisi", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK100_DS: 70 } }],
  giderTurleri: [], giderler: [], giderTanimlari: [], tedarikciler: [{ id: 12, ad: "Eski Tedarikçi", deletedAt: "2026-09-01T00:00:00.000Z" }], hesapHareketleri: [],
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
const pencereAc = () => {
  menu("Stok");
  fireEvent.click(screen.getByRole("tab", { name: "Parça/Yedek Parça Stoğu" }));
  fireEvent.click(screen.getByTestId("siparis-listesi-dugmesi"));
  if (!screen.queryByTestId("siparis-parca-tablosu")) fireEvent.click(screen.getByRole("button", { name: /^Parça ihtiyacı/ }));
};

describe("Spec 0134 gerçek App", () => {
  it("AC-54 (spec 0140 ile) / AC-88: Stok sekmeli kullanıcı (eylem kimliği tanımsız) açar; stok App'ten iner", async () => {
    await baslat({ sunucu: { tabs: ["dashboard", "stock"] } });
    pencereAc();
    const satir = within(screen.getByTestId("siparis-parca-tablosu")).getByText("Pul").closest("tr");
    expect([...satir.querySelectorAll("td")].slice(3, 6).map(td => td.textContent)).toEqual(["560", "100", "460"]);
  });
  it("AC-52 / AC-53 / AC-61: ekran sürülürken hiçbir kayıt tetiklenmez (stok, hareket, parti, parça, malzeme yazılmaz)", async () => {
    const { kayitlar } = await baslat();
    pencereAc();
    const once = kayitlar.length;
    fireEvent.change(screen.getByLabelText("Makina adedi 1"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: /Model Satırı Ekle/ }));
    fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: "" } });
    await new Promise(r => setTimeout(r, 800));
    // Ekran hiçbir App durumunu değiştirmez: sürülürken tek bir kayıt bile tetiklenmez.
    expect(kayitlar.length).toBe(once);
  });
});
