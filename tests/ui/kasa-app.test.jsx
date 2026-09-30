// @vitest-environment jsdom
// Spec 0024 A: gerçek App üzerinden Kasa sekmesinin görünürlüğü (C6/C7/Q9), giderden ödeme → hesap bakiyesi ve kayıt
// (R2, R7, AC-3, AC-8), müşteri tahsilatına hesap (R6, AC-9, AC-25, AC-29, AC-35).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";
import { yerelBugun } from "../../src/lib/utils";

const perde = vi.hoisted(() => ({ indi: false }));
vi.mock("../../src/lib/yayinPerdesi", () => ({ GIDER_PERDESI: true, giderPerdesiIndi: () => perde.indi }));
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); perde.indi = false; });

const buAy = yerelBugun().slice(0, 7);
const veri = () => ({
  customers: [{ id: 700, name: "TAHSİLATLI FİRMA", model: "AK120", serialNo: "S-9", installDate: "2026-01-10", currency: "TRY" }],
  giderTurleri: [{ id: 1, ad: "Malzeme", davranis: "normal" }],
  tedarikciler: [{ id: 11, ad: "Demir Bant" }],
  giderler: [{ id: 1, tarih: `${buAy}-01`, turId: 1, tutar: 10000, kdvOrani: 20, odendi: false, tedarikciId: 11, aciklama: "Bant alımı", modelSatirlari: [], taksitler: [] }],
  kasaHesaplari: [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 50000, acilisTarihi: `${buAy}-01`, kapali: false },
    { id: 52, ad: "Döviz", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 0, acilisTarihi: `${buAy}-01`, kapali: false }],
  hesapHareketleri: [],
  giderTanimlari: [], standartGiderler: [],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01", hatirlatmaEsikGun: 7 } },
  dataVersion: 1,
});

const baslat = async ({ sunucu = null, yuklenen = veri() } = {}) => {
  const kayitlar = [];
  window.crmStorage = {
    load: vi.fn(async () => structuredClone(yuklenen)),
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
  await new Promise(r => setTimeout(r, 800)); // App yüklemeden sonraki 700 ms kaydı bastırır
  return { kayitlar };
};
const menudeMi = (ad) => screen.queryAllByText(ad).some(e => e.closest("nav"));
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const satirOf = (ad) => screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes(ad));

describe("Kasa sekmesi görünürlüğü (C6, C7, Q9)", () => {
  it("yerel modda perde kalkıkken Kasa menüde; perde inikken yok (AC-35 / C7)", async () => {
    await baslat();
    expect(menudeMi("Kasa")).toBe(true);
    cleanup();
    perde.indi = true;
    await baslat();
    expect(menudeMi("Kasa")).toBe(false);
  });
  it("spec 0049 AC-24: perde inikken Kasa (Çek Ekle / Çek Yaz) yok; Giderler perde sayfasında çek seçeneği yok; kalkıkken portföyde ikisi de var", async () => {
    perde.indi = true;
    await baslat();
    expect(menudeMi("Kasa")).toBe(false);
    menu("Giderler");
    expect(screen.queryByText("Çek Ekle")).toBeNull();
    expect(screen.queryByText("Çek Yaz")).toBeNull();
    expect(screen.queryByText(/Çek \(kendi\)/)).toBeNull();
    cleanup();
    perde.indi = false;
    await baslat();
    menu("Kasa");
    fireEvent.click(screen.getByRole("tab", { name: "Çek Portföyü" }));
    expect(screen.getByText("Çek Ekle")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Verilen çekler" }));
    expect(screen.getByText("Çek Yaz")).toBeTruthy();
  });
  // Spec 0052 R2: Kasa'nın kendi sekme izni var (0024'teki "kendi izin kutusu yok" kuralının yerini aldı); Giderler ve
  // Finans önkoşul olarak kalır.
  it("user rolünde Kasa, kendi izni ve Giderler ile Finans birlikte açıkken görünür", async () => {
    await baslat({ sunucu: { tabs: ["dashboard", "gider", "kasa"] } });
    expect(menudeMi("Giderler")).toBe(true);
    expect(menudeMi("Kasa")).toBe(false);
    cleanup();
    await baslat({ sunucu: { tabs: ["dashboard", "gider", "finance"] } });
    expect(menudeMi("Kasa")).toBe(false);
    cleanup();
    await baslat({ sunucu: { tabs: ["dashboard", "gider", "finance", "kasa"] } });
    expect(menudeMi("Kasa")).toBe(true);
  });
});

describe("Giderden ödeme → hesap bakiyesi (R2, R7)", () => {
  it("AC-3 / AC-8: kalem ödeme penceresinden hesapla ödenir; kalem Ödendi, hesap bakiyesi düşer, hareket kaydedilir", async () => {
    const { kayitlar } = await baslat();
    menu("Giderler");
    await waitFor(() => expect(screen.getByTestId("kalem-listesi")).toBeTruthy());
    fireEvent.click(within(screen.getByTestId("kalem-listesi")).getByTitle("Ödeme kaydet"));
    const pencere = screen.getByTestId("odeme-kayit-penceresi");
    const hesap = within(pencere).getByLabelText("Hesap");
    // Gider TL'dir: yalnız açık TL hesabı seçilebilir (C5).
    expect([...hesap.querySelectorAll("option")].map(o => o.textContent)).toEqual(["Hesap belirtilmedi", "Ziraat (Banka)"]);
    fireEvent.change(hesap, { target: { value: "51" } });
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    await waitFor(() => expect(within(screen.getByTestId("kalem-listesi")).getByTitle("Ödemeleri görüntüle")).toBeTruthy());
    await waitFor(() => expect(kayitlar.some(k => k.hesapHareketleri?.length === 1)).toBe(true), { timeout: 3000 });
    const son = kayitlar[kayitlar.length - 1];
    expect(son.hesapHareketleri[0]).toMatchObject({ tur: "odeme", giderId: 1, hesapId: 51, tutar: 12000 });
    expect(son.giderler[0]).toMatchObject({ odendi: false }); // kalem durum saklamaz (R3)
    menu("Kasa");
    await waitFor(() => expect(satirOf("Ziraat")).toBeTruthy());
    expect(satirOf("Ziraat").textContent).toMatch(/38\.000/);
  });
});

describe("Müşteri tahsilatına hesap (R6, C6, C7)", () => {
  const tahsilatFormu = async () => {
    menu("Müşteriler");
    await waitFor(() => expect(screen.getByText("TAHSİLATLI FİRMA")).toBeTruthy());
    fireEvent.click(screen.getByText("TAHSİLATLI FİRMA"));
    await waitFor(() => expect(screen.getAllByText("Ödeme Ekle").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText("Ödeme Ekle")[0]);
    await waitFor(() => expect(screen.getByText("Kapora/Ödeme Ekle")).toBeTruthy());
  };
  it("AC-9 / AC-29: yalnız tahsilatın para birimindeki açık hesaplar; seçilen hesap tahsilata yazılır ve bakiyeyi artırır", async () => {
    const { kayitlar } = await baslat();
    await tahsilatFormu();
    const sec = screen.getByLabelText("Tahsilat hesabı");
    expect([...sec.querySelectorAll("option")].map(o => o.textContent)).toEqual(["Hesap belirtilmedi", "Ziraat (Banka)"]);
    fireEvent.change(sec, { target: { value: "51" } });
    fireEvent.click(screen.getByText("+ Ödeme Ekle"));
    const satir = screen.getAllByDisplayValue("Nakit").pop().parentElement;
    fireEvent.change(satir.querySelector("input"), { target: { value: "7000" } });
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    await waitFor(() => expect(kayitlar.some(k => k.payments?.some(p => p.hesapId === 51))).toBe(true), { timeout: 3000 });
    const p = kayitlar[kayitlar.length - 1].payments.find(x => x.hesapId === 51);
    expect(p).toMatchObject({ customerId: 700, tutar: 7000, currency: "TRY" });
  });
  it("AC-35: perde inikken tahsilat formunda hesap alanı yok", async () => {
    perde.indi = true;
    await baslat();
    await tahsilatFormu();
    expect(screen.queryByLabelText("Tahsilat hesabı")).toBeNull();
  });
  it("AC-25 / C6: Finans sekmesi olmayan kullanıcı tahsilata hesap seçemez", async () => {
    await baslat({ sunucu: { tabs: ["dashboard", "customers", "gider"] } });
    await tahsilatFormu();
    expect(screen.queryByLabelText("Tahsilat hesabı")).toBeNull();
  });
});

// Triyaj bulgu 2: 0024 öncesi sunucu hareket bölümünü göndermez. İstemci boş listeyle hesaplarsa ödenmiş her kalem
// ödenmemiş görünürdü; bölüm yokken eski işaret okunur, ödeme girişi kapanır, bölüm kayda eklenmez.
describe("Güncellenmemiş sunucu: hareket bölümü yok (bulgu 2)", () => {
  const eskiSunucuVerisi = () => {
    const v = veri();
    delete v.hesapHareketleri; delete v.kasaHesaplari;
    v.giderler = [{ ...v.giderler[0], odendi: true, odemeTarihi: `${buAy}-02` }];
    return v;
  };
  it("ödenmiş kalem ödenmiş görünür, uyarı çıkar, ödeme girilemez; kayıt hareket bölümü göndermez", async () => {
    const { kayitlar } = await baslat({ yuklenen: eskiSunucuVerisi() });
    menu("Giderler");
    await waitFor(() => expect(screen.getByTestId("kalem-listesi")).toBeTruthy());
    const liste = screen.getByTestId("kalem-listesi");
    expect(within(liste).getByText(/^Ödendi/)).toBeTruthy();
    expect(within(liste).queryByTitle("Ödeme kaydet")).toBeNull();
    expect(within(liste).queryByTitle("Ödemeleri görüntüle")).toBeNull();
    expect(screen.getByTestId("hareket-bolumu-yok")).toBeTruthy();
    // Bir değişiklikle kayıt tetiklenir: gönderilen blobda hareket bölümü olmamalı (null da gönderilmez).
    fireEvent.click(screen.getByText("Yeni Gider"));
    fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "100" } });
    expect(screen.queryByLabelText("Kaydederken ödendi olarak kaydet")).toBeNull();
    fireEvent.click(screen.getByText("Kaydet"));
    await waitFor(() => expect(kayitlar.length).toBeGreaterThan(0), { timeout: 3000 });
    expect(kayitlar.every(k => !("hesapHareketleri" in k))).toBe(true);
  });
  it("yeni sunucu (bölüm boş dizi) ödeme girişine açık; uyarı yok", async () => {
    await baslat();
    menu("Giderler");
    await waitFor(() => expect(screen.getByTestId("kalem-listesi")).toBeTruthy());
    expect(screen.queryByTestId("hareket-bolumu-yok")).toBeNull();
    expect(within(screen.getByTestId("kalem-listesi")).getByTitle("Ödeme kaydet")).toBeTruthy();
  });
});
