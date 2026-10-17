// @vitest-environment jsdom
// Spec 0089: gerçek App. Bugünkü maliyet motorunun kapısı maliyetYetki (AC-8, motor casusuyla), parti değişim kutusunun yeni
// yeri (AC-14), parti kapanışının kapanış anlık görüntüsünü dolu yazması (AC-15), üretim partisinin yönetimi (AC-19) ve maliyet
// sekmesi olmayan gider kullanıcısının bugünkü maliyet rakamına ulaşamaması (AC-21).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";

const casus = vi.hoisted(() => ({ n: 0 }));
vi.mock("../../src/lib/makinaMaliyeti", async (orijinal) => {
  const m = await orijinal();
  return { ...m, hesaplaMakinaMaliyetleri: (...a) => { casus.n++; return m.hesaplaMakinaMaliyetleri(...a); } };
});
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); casus.n = 0; });

// Kapanmış parti: kapanışta Ocak'ın ortak gideri 500 TL'ydi, bugün 1.000 TL (kapanıştan sonra kalem eklenmiş).
const veri = () => ({
  customers: [], stock: [{ id: 501, model: "AK100", serialNo: "T1", partiId: 801, uretimTarihi: "2026-01-15" }, { id: 502, model: "AK100", serialNo: "T2", partiId: 802, uretimTarihi: "2026-02-15" }],
  standardModels: [{ model: "AK100", defaultParcalar: [] }],
  giderTurleri: [{ id: 1, ad: "Genel", davranis: "normal", maliyetRolu: "genel" }],
  giderler: [{ id: 1, tarih: "2026-01-10", turId: 1, tutar: 500, kdvOrani: 0, modelSatirlari: [], taksitler: [] },
    { id: 2, tarih: "2026-01-20", turId: 1, tutar: 500, kdvOrani: 0, modelSatirlari: [], taksitler: [] },
    { id: 3, tarih: "2026-02-10", turId: 1, tutar: 2000, kdvOrani: 0, modelSatirlari: [], taksitler: [] }],
  uretimPartileri: [{ id: 801, ad: "Ocak Partisi", baslangicAy: "2026-01", bitisAy: "2026-01", kapanmaZamani: "2026-01-31T10:00:00", kapanisOrtaklari: { "2026-01": 50000 } },
    { id: 802, ad: "Şubat Partisi", baslangicAy: "2026-02", bitisAy: null }],
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
const gorunum = (ad) => fireEvent.click(screen.getByRole("radio", { name: ad }));
const GIDERCI = { tabs: ["dashboard", "gider", "finance"] };

describe("Spec 0089: motorun kapısı (R4, R4/2)", () => {
  it("AC-8: gider sekmesi olan ama Makina Maliyeti sekmesi olmayan kullanıcıda hesaplaMakinaMaliyetleri hiç çalışmaz", async () => {
    await baslat({ sunucu: GIDERCI });
    menu("Giderler");
    await waitFor(() => expect(screen.getByRole("radio", { name: "Dönem Raporu" })).toBeTruthy());
    gorunum("Tedarikler ve Ekstre");
    gorunum("Dönem Raporu");
    expect(casus.n).toBe(0);
  });
  it("AC-8: Makina Maliyeti sekmesi olan kullanıcıda motor çalışır (parti ekranı için)", async () => {
    await baslat({ sunucu: { tabs: ["dashboard", "gider", "finance", "maliyet"] } });
    expect(casus.n).toBeGreaterThan(0);
  });
});

describe("Spec 0089: parti değişim kutusu ve kapanış (R11, R4)", () => {
  it("AC-14: kutu Makina Maliyeti › Üretim Partileri'nde başlık, metin ve testId aynı; Giderler'de hiçbir kipte yok", async () => {
    await baslat();
    menu("Makina Maliyeti");
    gorunum("Üretim Partileri");
    const kutu = screen.getByTestId("parti-degisimleri");
    expect(kutu.textContent).toMatch(/Kapanmış partilerin aylarında değişen ortak gider/);
    expect(kutu.textContent).toMatch(/Parti kapandıktan sonra bu aylara gider eklendi, değişti ya da silindi\. Paylar bugünkü veriyle yeniden hesaplandı\./);
    expect(kutu.textContent).toMatch(/Ocak Partisi.*kapanışta 500 ₺, bugün 1\.000 ₺/);
    menu("Giderler");
    await waitFor(() => expect(screen.getByRole("radio", { name: "Dönem Raporu" })).toBeTruthy());
    expect(screen.queryByTestId("parti-degisimleri")).toBeNull();
    fireEvent.click(screen.getByTestId("acik-kalemler-dugmesi"));
    expect(screen.queryByTestId("parti-degisimleri")).toBeNull();
    fireEvent.click(screen.getByTestId("acik-kalemler-dugmesi"));
    gorunum("Tedarikler ve Ekstre");
    expect(screen.queryByTestId("parti-degisimleri")).toBeNull();
  });
  it("AC-15: açık parti kapatılınca kapanisOrtaklari dolu yazılır; üç sütun ve rozet rakam gösterir", async () => {
    const { kayitlar } = await baslat();
    menu("Makina Maliyeti");
    gorunum("Üretim Partileri");
    const satir = () => screen.getAllByTestId("parti-satiri").find(s => s.textContent.includes("Şubat Partisi"));
    expect(within(satir()).getByText("Açık · geçici")).toBeTruthy();
    fireEvent.click(within(satir()).getByTitle("Düzenle"));
    fireEvent.change(screen.getByLabelText("Bitiş ayı"), { target: { value: "2026-02" } });
    fireEvent.click(screen.getByText("Kaydet"));
    await waitFor(() => expect(kayitlar.some(k => k.uretimPartileri?.find(p => p.id === 802)?.bitisAy === "2026-02")).toBe(true));
    const son = kayitlar.filter(k => k.uretimPartileri?.find(p => p.id === 802)?.bitisAy === "2026-02").pop();
    expect(son.uretimPartileri.find(p => p.id === 802).kapanisOrtaklari).toEqual({ "2026-02": 200000 });
    expect(within(satir()).getByText("Kapalı")).toBeTruthy();
    expect(within(satir()).getAllByText("2.000 ₺").length).toBeGreaterThan(0);
  });
  it("AC-19: üretim partisi yönetimi Makina Maliyeti'nde; Giderler'de parti görünümü yok", async () => {
    await baslat();
    menu("Makina Maliyeti");
    gorunum("Üretim Partileri");
    expect(screen.getAllByTestId("parti-satiri")).toHaveLength(2);
    expect(screen.getByText("Yeni Üretim Partisi")).toBeTruthy();
    menu("Giderler");
    await waitFor(() => expect(screen.getByRole("radio", { name: "Dönem Raporu" })).toBeTruthy());
    expect(screen.queryByRole("radio", { name: "Üretim Partileri" })).toBeNull();
  });
});

describe("Spec 0089: maliyet sekmesi olmayan gider kullanıcısı (R4/2, X5)", () => {
  it("AC-21: Giderler iki görünüm; bugünkü modelin makina ya da model başına maliyet, kâr ve marj rakamına hiçbir yerden ulaşılmaz", async () => {
    await baslat({ sunucu: GIDERCI });
    expect(menudeMi("Makina Maliyeti")).toBe(false);
    menu("Giderler");
    await waitFor(() => expect(screen.getByRole("radio", { name: "Dönem Raporu" })).toBeTruthy());
    expect(within(screen.getByRole("radiogroup", { name: "Görünüm" })).getAllByRole("radio").map(r => r.textContent)).toEqual(["Dönem Raporu", "Tedarikler ve Ekstre"]);
    for (const ad of ["Dönem Raporu", "Tedarikler ve Ekstre"]) {
      gorunum(ad);
      expect(document.body.textContent, ad).not.toMatch(/Makina Kârlılığı|Makina ve Model|Marj|Toplam maliyet|Makina başı pay/);
      for (const id of ["makina-karliligi", "maliyet-detay", "karlilik-tablosu", "fiyat-onerisi"]) expect(screen.queryByTestId(id), `${ad} ${id}`).toBeNull();
    }
    // "Makina Maliyeti Kovaları" gider kaydının kendi kırılımıdır ve adıyla kalır.
    gorunum("Dönem Raporu");
    fireEvent.change(screen.getByLabelText("Dönem ayı"), { target: { value: "2026-01" } }); // kalemli ay
    expect(document.body.textContent).not.toMatch(/Makina Kârlılığı|Makina ve Model|Marj|Makina başı pay/);
    expect(within(screen.getByTestId("kova-karti")).getByRole("button", { name: /^Makina Maliyeti Kovaları/ })).toBeTruthy();
  });
});
