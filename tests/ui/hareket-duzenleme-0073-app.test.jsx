// @vitest-environment jsdom
// Spec 0073 AC-37 (triyaj bulgu 5): Kasa sekmesi olmayan kullanıcı, virman ve avans izni olsa da bu hareketleri düzenleyemez ve
// silemez; ikisinin de tek giriş noktası Kasa ekranıdır. Gerçek App (0052 emsali: sunucu istemcisi, izinler JWT yapılandırmasından).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";
import { yerelBugun } from "../../src/lib/utils";

const perde = vi.hoisted(() => ({ indi: false }));
vi.mock("../../src/lib/yayinPerdesi", () => ({ GIDER_PERDESI: true, giderPerdesiIndi: () => perde.indi }));
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); });

const buAy = yerelBugun().slice(0, 7);
const veri = () => ({
  customers: [],
  giderTurleri: [{ id: 1, ad: "Malzeme", davranis: "normal" }],
  tedarikciler: [{ id: 11, ad: "Demir Bant" }],
  giderler: [],
  calisanlar: [{ id: 7, ad: "Hasan Çelik" }],
  kasaHesaplari: [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 50000, acilisTarihi: `${buAy}-01`, kapali: false },
    { id: 52, ad: "Merkez Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 1000, acilisTarihi: `${buAy}-01`, kapali: false }],
  hesapHareketleri: [{ id: 801, tur: "virman", tarih: `${buAy}-02`, tutar: 500, hesapId: 52, karsiHesapId: 51, aciklama: "" },
    { id: 802, tur: "avans", tarih: `${buAy}-02`, tutar: 300, calisanId: 7, hesapId: 52, yontem: "Nakit", aciklama: "" }],
  cekler: [], giderTanimlari: [], standartGiderler: [],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01", hatirlatmaEsikGun: 7, denemeDonemiBitis: "" } },
  dataVersion: 1,
});
const baslat = async (izin) => {
  window.crmStorage = { load: vi.fn(async () => structuredClone(veri())), save: vi.fn(async () => true), getVersion: vi.fn(async () => 1) };
  const t = { getConfig: async () => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role: "user", permissions: JSON.stringify(izin), username: "u" }) };
  window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
};
const menudeMi = (ad) => screen.queryAllByText(ad).some(e => e.closest("nav"));
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const IZINLER = { giderActions: ["virman", "avans", "gider_odeme", "kasa_hesap"] };

describe("Spec 0073 AC-37: Kasa sekmesi kapısı (gerçek App)", () => {
  it("AC-37: Kasa sekmesi olmayan kullanıcı virman ve avans iznine rağmen bu hareketlere hiçbir ekrandan ulaşamaz", async () => {
    await baslat({ tabs: ["dashboard", "gider", "finance"], ...IZINLER });
    expect(menudeMi("Kasa")).toBe(false);
    menu("Giderler");
    expect(screen.queryAllByLabelText(/^Hareketi düzenle/)).toHaveLength(0);
    expect(screen.queryAllByTitle("Virmanı sil")).toHaveLength(0);
  });
  it("AC-37 (karşıt): Kasa sekmeli kullanıcı aynı izinlerle virman ve avans satırında Düzenle görür", async () => {
    await baslat({ tabs: ["dashboard", "gider", "finance", "kasa"], ...IZINLER });
    menu("Kasa");
    fireEvent.click(screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes("Merkez Kasa")));
    const satirlar = within(screen.getByTestId("hesap-hareketleri")).getAllByTestId("hareket-satiri");
    expect(satirlar.some(s => within(s).queryByLabelText("Hareketi düzenle: Merkez Kasa → Ziraat"))).toBe(true);
    expect(satirlar.some(s => within(s).queryByLabelText("Hareketi düzenle: Hasan Çelik"))).toBe(true);
  });
});
