// @vitest-environment jsdom
// Spec 0088: gerçek App üzerinden Makina Maliyeti sekmesi: menüdeki yeri ve izin (AC-1–AC-5), taşınan Üretim Partileri'nin App'in
// maliyet sonucuyla kapanış anlık görüntüsünü dolu yazması (AC-34, AC-37) ve ekranın gider kayıtlarına dokunmaması (AC-41).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";
import { gorunurSekmeler } from "../../src/lib/permissions";
import { ALL_TABS, DEFAULT_USER_TABS, VARSAYILAN_KAPALI_SEKMELER } from "../../src/components/settings/serverPermissionDefs";

const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); });

const veri = () => ({
  customers: [], stock: [{ id: 501, model: "AK100", serialNo: "T1", partiId: 801, uretimTarihi: "2026-01-15" }],
  standardModels: [{ model: "AK100", defaultParcalar: [] }],
  giderTurleri: [{ id: 1, ad: "Genel", davranis: "normal", maliyetRolu: "genel" }],
  giderler: [{ id: 1, tarih: "2026-01-10", turId: 1, tutar: 1000, kdvOrani: 0, modelSatirlari: [], taksitler: [] }],
  uretimPartileri: [{ id: 801, ad: "P1", baslangicAy: "2026-01", bitisAy: null }],
  giderTanimlari: [], tedarikciler: [], hesapHareketleri: [],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01" }, maliyetAyarlari: { baslangicAy: "2026-01", bitisAy: "2026-12", varsayilanAdet: 10 } },
  dataVersion: 1,
});
const baslat = async ({ sunucu = null } = {}) => {
  const kayitlar = [];
  window.crmStorage = {
    load: vi.fn(async () => structuredClone(veri())),
    save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }),
    getVersion: vi.fn(async () => 1),
  };
  if (sunucu) {
    const t = { getConfig: async () => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role: "user", permissions: JSON.stringify(sunucu), username: "u" }) };
    window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  }
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
  return { kayitlar };
};
const menudeMi = (ad) => screen.queryAllByText(ad).some(e => e.closest("nav"));
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const T = (id) => ({ id });

describe("Spec 0088: sekme ve izin", () => {
  it("AC-1, AC-4: yerel kipte Makina Maliyeti Mali İşler grubunda Kasa'dan sonra", async () => {
    await baslat();
    const liste = within(document.querySelector("nav")).getByRole("group", { name: "Mali İşler" });
    expect([...liste.querySelectorAll("button")].map(b => b.textContent.trim())).toEqual(["Finans", "Giderler", "Kasa", "Makina Maliyeti"]);
  });

  it("AC-2: izin listesinde yazmayan kullanıcıda menüde yok", async () => {
    await baslat({ sunucu: { tabs: ["dashboard", "gider", "finance"] } });
    expect(menudeMi("Makina Maliyeti")).toBe(false);
  });

  it("AC-3: yazılı ama Giderler'i olmayan kullanıcıda menüde yok; Giderler'le birlikte görünür", async () => {
    await baslat({ sunucu: { tabs: ["dashboard", "maliyet"] } });
    expect(menudeMi("Makina Maliyeti")).toBe(false);
    cleanup();
    await baslat({ sunucu: { tabs: ["dashboard", "gider", "maliyet"] } });
    expect(menudeMi("Makina Maliyeti")).toBe(true);
  });

  it("AC-4: sunucu bilgisayarında ve admin kullanıcıda görünür (görünür sekme süzgeci)", () => {
    const tabs = [T("gider"), T("maliyet"), T("finance")];
    expect(gorunurSekmeler(tabs, "server", null).map(t => t.id)).toContain("maliyet");
    expect(gorunurSekmeler(tabs, "active", { role: "admin" }).map(t => t.id)).toContain("maliyet");
    expect(gorunurSekmeler(tabs, "active", { role: "user", permissions: JSON.stringify({ tabs: ["maliyet"] }) }).map(t => t.id)).toEqual([]);
    expect(gorunurSekmeler(tabs, "active", { role: "user", permissions: "{}" }).map(t => t.id)).toEqual(["finance"]);
  });

  it("AC-5: izin ekranında varsayılan kapalı; varsayılan kullanıcı listesinde yok", () => {
    expect(ALL_TABS.map(t => t.id)).toContain("maliyet");
    expect(ALL_TABS.find(t => t.id === "maliyet").label).toBe("Makina Maliyeti");
    expect(VARSAYILAN_KAPALI_SEKMELER.has("maliyet")).toBe(true);
    expect(DEFAULT_USER_TABS).not.toContain("maliyet");
  });
});

// Spec 0089 ile (C7 0088 R24, AC-37): Giderler maliyet sonucunu artık almaz; bu ekran motorun tek tüketicisidir, prop ve üç
// sütun bugünkü rakamla kalır (0089 R4, X6). Memo kapısı maliyetYetki (yerel kipte açık).
describe("Spec 0088: taşınan Üretim Partileri gerçek App'te", () => {
  it("AC-34, AC-37: parti yeni ekranda kapatılır; App'in maliyet sonucuyla kapanış anlık görüntüsü dolu yazılır, üç sütun rakam gösterir", async () => {
    const { kayitlar } = await baslat();
    menu("Makina Maliyeti");
    fireEvent.click(screen.getByRole("radio", { name: "Üretim Partileri" }));
    const satir = () => screen.getByTestId("parti-satiri");
    expect(within(satir()).getByText("Açık · geçici")).toBeTruthy();
    fireEvent.click(within(satir()).getByTitle("Düzenle"));
    fireEvent.change(screen.getByLabelText("Bitiş ayı"), { target: { value: "2026-01" } });
    fireEvent.click(screen.getByText("Kaydet"));
    await waitFor(() => expect(kayitlar.some(k => k.uretimPartileri?.[0]?.bitisAy === "2026-01")).toBe(true));
    const son = kayitlar.filter(k => k.uretimPartileri?.[0]?.bitisAy === "2026-01").pop();
    expect(son.uretimPartileri[0].kapanisOrtaklari).toEqual({ "2026-01": 100000 });
    expect(within(satir()).getByText("Kapalı")).toBeTruthy();
    expect(within(satir()).getAllByText("1.000 ₺").length).toBeGreaterThan(0);
  });

  it("AC-41: ekranda gezinip rol ve ayar değiştirmek gider kayıtlarının gövdesini değiştirmez", async () => {
    const { kayitlar } = await baslat();
    menu("Makina Maliyeti");
    fireEvent.click(screen.getByRole("radio", { name: "Hesap Ayarları" }));
    fireEvent.change(screen.getByLabelText("Genel maliyet rolü"), { target: { value: "yok" } });
    fireEvent.change(screen.getByLabelText("Dönemde varsayılan üretim adedi (toplam)"), { target: { value: "20" } });
    fireEvent.click(within(screen.getByTestId("maliyet-ayar-formu")).getByRole("button", { name: /Kaydet/ }));
    for (const ad of ["Model Maliyetleri", "Parti Hesabı", "Üretim Partileri"]) fireEvent.click(screen.getByRole("radio", { name: ad }));
    await waitFor(() => expect(kayitlar.some(k => k.appSettings?.maliyetAyarlari?.varsayilanAdet === 20)).toBe(true));
    const son = kayitlar[kayitlar.length - 1];
    expect(son.giderTurleri[0].maliyetRolu).toBe("yok");
    expect(son.giderler).toEqual(veri().giderler);
  });
});
