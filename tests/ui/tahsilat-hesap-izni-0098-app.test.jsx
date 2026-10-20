// @vitest-environment jsdom
// Spec 0098: tahsilat hesabı seçiminin kendi yetkisi, gerçek App. Kullanıcı istemci olarak sunucuya bağlı (`appServer`), sekme
// listesi Finans, Giderler ve Kasa'sız: dashboard, customers, stock, servis. İşlem izinleri tanımsızken yetki varsayılan açık (R7);
// `giderActions` yeni kimlik olmadan özelleştirilince kapalı. Bakiye ve iş listesi kaydın gövdesinden motorla okunur (plan P4: bu
// kullanıcı Kasa ekranını görmez; Kasa ekranı aynı motoru okur).
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";
import { yerelBugun } from "../../src/lib/utils";
import { hesapBakiyeleri, hesapsizTahsilatlar } from "../../src/lib/kasa";

const perde = vi.hoisted(() => ({ indi: false }));
vi.mock("../../src/lib/yayinPerdesi", () => ({ GIDER_PERDESI: true, giderPerdesiIndi: () => perde.indi }));
const { default: App } = await import("../../src/App");

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); perde.indi = false; });

const buAy = yerelBugun().slice(0, 7);
const HESAPLAR = [
  { id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: `${buAy}-01`, kapali: false },
  { id: 52, ad: "Döviz", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 0, acilisTarihi: `${buAy}-01`, kapali: false },
  { id: 53, ad: "Merkez Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: `${buAy}-01`, kapali: false },
];
const SERVIS = { id: 800, customerId: 700, type: "Garanti Dışı", repairPlace: "Yerinde Onarım", servisUcreti: 1000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", date: `${buAy}-05`, odendi: false, yontem: "Nakit", islemFirma: "Altuntaş Makina", degisenParcalar: [] };
const veri = (o = {}) => ({
  customers: [{ id: 700, name: "TAHSİLATLI FİRMA", model: "AK120", serialNo: "S-9", installDate: "2026-01-10", currency: "TRY", faturali: "Faturalı Yurtiçi" }],
  dealers: [{ id: 3, name: "Ege Bayi" }], parts: [{ id: 5, ad: "Rulman" }], partStock: [{ partId: 5, miktar: 50 }],
  services: [SERVIS],
  partSales: [{ id: 810, customerId: 700, tur: "Kalıp", ad: "K-1", ucret: 2000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: `${buAy}-06`, odendi: false }],
  yedekParcaSatislar: [{ id: 820, aliciTipi: "musteri", musteriId: 700, partId: 5, miktar: 2, birimFiyat: 250, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: `${buAy}-07`, odendi: false, tahsisler: [{ miktar: 2, customerId: 700, serialNo: "", makinaSerbest: "", tarih: `${buAy}-07` }] }],
  payments: [{ id: 900, customerId: 700, tutar: 10, currency: "TRY", tarih: `${buAy}-03`, yontem: "Havale", hesapId: 53 }],
  kasaHesaplari: HESAPLAR, hesapHareketleri: [], giderTurleri: [], tedarikciler: [], giderler: [], giderTanimlari: [],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01", hatirlatmaEsikGun: 7 } }, dataVersion: 1, ...o,
});
export const SATICI_SEKMELERI = ["dashboard", "customers", "stock", "servis"];
const SATICI = { tabs: SATICI_SEKMELERI };
// İşlem izinleri özelleştirilmiş, yeni kutusu işaretsiz (AC-13).
const KAPALI = { tabs: SATICI_SEKMELERI, giderActions: ["gider_add"] };

const baslat = async ({ sunucu = SATICI, yuklenen = veri(), rol = "user", kiosk = false } = {}) => {
  const kayitlar = [];
  window.crmStorage = { load: vi.fn(async () => structuredClone(yuklenen)), save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }), getVersion: vi.fn(async () => 1) };
  delete window.appServer; // aynı testte ikinci başlatmada önceki istemci kalmasın (yerel mod gerçekten yerel olsun)
  if (sunucu) {
    const t = { getConfig: async () => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role: rol, permissions: JSON.stringify(sunucu), username: "u" }) };
    window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  }
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
  // Kiosk'ta kenar çubuğu yoktur (yalnız pano çizilir).
  await waitFor(() => expect(kiosk ? screen.getByText("Yeni Servis Talebi") : screen.getAllByText("Anasayfa")[0]).toBeTruthy());
  await new Promise(r => setTimeout(r, 800)); // App yüklemeden sonraki 700 ms kaydı bastırır
  return { kayitlar, son: () => kayitlar[kayitlar.length - 1] };
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const menudeVar = (ad) => screen.queryAllByText(ad).some(e => e.closest("nav"));
const detayAc = async () => {
  menu("Müşteriler");
  await waitFor(() => expect(screen.getByText("TAHSİLATLI FİRMA")).toBeTruthy());
  fireEvent.click(screen.getByText("TAHSİLATLI FİRMA"));
  await waitFor(() => expect(screen.getAllByText("Ödenmedi · işaretle: Ödendi").length).toBe(3));
};
const anahtar = (i) => screen.getAllByText(/Ödenmedi · işaretle: Ödendi|^Ödendi$/).filter(e => e.tagName === "BUTTON")[i];
const pencere = () => screen.queryByTestId("tahsilat-hesap-penceresi");
const bekleKayit = (kayitlar, f) => waitFor(() => expect(kayitlar.some(f)).toBe(true), { timeout: 3000 });
const odendiKutusu = () => screen.getByText(/Ücret henüz tahsil edilmedi|Ücret tahsil edildi/).closest("label").querySelector("input");
// Formun tahsilat bölgesi: seçici ya da (tutarsız kayıtta) hesabın neden sorulmadığı satırı. İkisi de yalnız prop geldiyse çizilir.
const hesapBolgesi = () => screen.queryByLabelText("Tahsilat hesabı") || screen.queryByTestId("tahsilat-hesap-neden");
// Zaman çizelgesindeki kaydı düzenleme kipinde açar (ücreti dolu kayıt: ödeme kutusu ve tahsilat seçicisi çizilir).
const duzenleAc = (desen) => fireEvent.click(screen.getAllByTitle("Düzenlemek için tıklayın").find(e => desen.test(e.textContent)));
const kapat = () => fireEvent.click(screen.getAllByText(/^(İptal|Vazgeç)$/).pop());
const tahsilatFormu = async () => {
  fireEvent.click(screen.getAllByText("Ödeme Ekle")[0]);
  await waitFor(() => expect(screen.getByText("Kapora/Ödeme Ekle")).toBeTruthy());
  fireEvent.click(screen.getByText("+ Ödeme Ekle"));
  fireEvent.change(screen.getAllByDisplayValue("Nakit").pop().parentElement.querySelector("input"), { target: { value: "7000" } });
};
const motorVerisi = (k) => ({ payments: k.payments, services: k.services, partSales: k.partSales, yedekParcaSatislar: k.yedekParcaSatislar, customers: k.customers,
  dealers: k.dealers, factory: { name: "Altuntaş Makina" }, kdvRates: k.appSettings?.kdvRates, bugun: "2099-01-01" });

describe("Spec 0098: Kasa'sız satış kullanıcısı (yetki varsayılan açık)", () => {
  it("AC-11 / AC-12: Kasa, Giderler ve Finans menüde yok", async () => {
    await baslat();
    expect(menudeVar("Müşteriler")).toBe(true);
    for (const ad of ["Kasa", "Giderler", "Finans"]) expect(menudeVar(ad), ad).toBe(false);
  });
  it("AC-7 / AC-8 / AC-9 / AC-22: müşteri detayından servis Ödendi: pencere açılır, seçim kayda yazılır, bakiyeye girer, iş listesinde yok", async () => {
    const { kayitlar, son } = await baslat();
    await detayAc();
    fireEvent.click(anahtar(0));
    expect(pencere()).toBeTruthy();
    fireEvent.change(within(pencere()).getByLabelText("Tahsilat hesabı"), { target: { value: "51" } });
    fireEvent.click(screen.getByText("Ödendi olarak kaydet"));
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.odendi === true && s.hesapId === 51));
    const k = son();
    expect(hesapBakiyeleri(HESAPLAR, [], motorVerisi(k)).get("51").girenK).toBe(120000); // 1.000 + %20 KDV
    expect(hesapsizTahsilatlar(motorVerisi(k), HESAPLAR).liste.some(t => t.kayit?.id === 800)).toBe(false);
  });
  it("AC-10: hesap boş bırakılırsa kayıt hesapsız doğar, hiçbir bakiyeye girmez ve iş listesinde görünür", async () => {
    const { kayitlar, son } = await baslat();
    await detayAc();
    fireEvent.click(anahtar(0));
    fireEvent.click(screen.getByText("Hesapsız kaydet"));
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.odendi === true && s.hesapId == null));
    const k = son();
    const b = hesapBakiyeleri(HESAPLAR, [], motorVerisi(k));
    expect([b.get("51").girenK, b.get("52").girenK, b.get("53").girenK]).toEqual([0, 0, 1000]); // 53: yalnız önceki 10 TL'lik makina tahsilatı
    expect(hesapsizTahsilatlar(motorVerisi(k), HESAPLAR).liste.some(t => t.kayit?.id === 800)).toBe(true);
  });
  it("AC-4: müşteri detayının tahsilat formunda tutarlı satırda alan var", async () => {
    await baslat();
    await detayAc();
    await tahsilatFormu();
    expect(screen.getByLabelText("Tahsilat hesabı")).toBeTruthy();
  });
  it("AC-3 / AC-2 / AC-1: servis, Extra Kalıp ve yedek parça formlarında ödendi işaretlenince tahsilat bölgesi çizilir", async () => {
    await baslat();
    await detayAc();
    for (const desen of [/^Garanti Dışı$/, /^Kalıp Verildi$/, /^Yedek Parça \(Kargo\)$/]) {
      duzenleAc(desen);
      fireEvent.click(odendiKutusu());
      expect(screen.getByLabelText("Tahsilat hesabı"), String(desen)).toBeTruthy();
      kapat();
    }
  });
  it("AC-5: yeni müşteri formunun ilk ödeme satırında alan var", async () => {
    await baslat();
    menu("Müşteriler");
    await waitFor(() => expect(screen.getByText("Yeni Müşteri")).toBeTruthy());
    fireEvent.click(screen.getByText("Yeni Müşteri"));
    fireEvent.click(screen.getByText("+ Ödeme Ekle"));
    fireEvent.change(screen.getByLabelText("Ödeme yöntemi 1").parentElement.querySelector("input"), { target: { value: "5000" } });
    expect(screen.getByLabelText("Tahsilat hesabı")).toBeTruthy();
  });
  it("AC-6: Stok › Yedek Parça Satışı satırının Ödendi anahtarı hesap penceresini açar", async () => {
    await baslat();
    menu("Stok");
    fireEvent.click((await screen.findAllByText(/Yedek Parça Satış/)).find(e => e.closest("[role=radio], [role=tab], button")));
    const dugme = await waitFor(() => { const b = screen.getAllByText(/Ödenmedi/).find(e => e.closest("button")); expect(b).toBeTruthy(); return b; });
    fireEvent.click(dugme.closest("button"));
    expect(pencere()).toBeTruthy();
  });
  // AC-57 / C9: yeni yetki arama kategorisi açmaz. Olumlu kontrol: Kasa'lı (admin) kullanıcıda aynı arama hesabı bulur.
  const ara = async (metin) => {
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(await screen.findByPlaceholderText("Müşteri, seri no, teklif no, servis, bayi, not ara..."), { target: { value: metin } });
    await new Promise(r => setTimeout(r, 300));
  };
  it("AC-57: genel aramada kasa hesabı sonucu çıkmaz (Kasa'lı kullanıcıda çıkar)", async () => {
    await baslat();
    await ara("Ziraat");
    expect(screen.queryAllByText("Kasa ve Banka Hesapları", { selector: "span" })).toHaveLength(0);
    cleanup();
    await baslat({ sunucu: null });
    await ara("Ziraat");
    expect(screen.queryAllByText("Kasa ve Banka Hesapları", { selector: "span" }).length).toBeGreaterThan(0);
  });
});

describe("Spec 0098: Servis ve Kargo Panosu kiosk'u (R4/2)", () => {
  const panoVerisi = () => veri({ services: [{ ...SERVIS, durum: "Bekliyor" }] });
  it("AC-44 / AC-42: yalnız servis sekmeli kiosk kullanıcısı panodaki servis formunda ödendi işaretleyince hesabı seçer, seçim kayda yazılır", async () => {
    const { kayitlar } = await baslat({ sunucu: { tabs: ["servis"] }, yuklenen: panoVerisi(), kiosk: true });
    await waitFor(() => expect(screen.getByText("Yeni Servis Talebi")).toBeTruthy());
    fireEvent.click(screen.getAllByText("TAHSİLATLI FİRMA")[0]);
    await waitFor(() => expect(screen.getByText("Servis Talebini Düzenle")).toBeTruthy());
    fireEvent.click(odendiKutusu());
    fireEvent.change(screen.getByLabelText("Tahsilat hesabı"), { target: { value: "51" } });
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.odendi === true && s.hesapId === 51));
  });
  it("AC-44 / AC-51: kiosk kullanıcısının izinleri yeni kimliksiz özelleştirilmişse panodaki formda alan yok", async () => {
    await baslat({ sunucu: { tabs: ["servis"], giderActions: [] }, yuklenen: panoVerisi(), kiosk: true });
    await waitFor(() => expect(screen.getByText("Yeni Servis Talebi")).toBeTruthy());
    fireEvent.click(screen.getAllByText("TAHSİLATLI FİRMA")[0]);
    await waitFor(() => expect(screen.getByText("Servis Talebini Düzenle")).toBeTruthy());
    fireEvent.click(odendiKutusu());
    expect(hesapBolgesi()).toBeNull();
  });
});

describe("Spec 0098: Servis ve Kargo Panosu sekmesi (R4/2)", () => {
  const panoAc = async () => {
    menu("Servis ve Kargo Panosu");
    await waitFor(() => expect(screen.getByText("Yeni Servis Talebi")).toBeTruthy());
  };
  const panoVerisi = () => veri({ services: [{ ...SERVIS, durum: "Bekliyor" }] });
  it("AC-42: panonun servis formunda ödendi işaretleyince alan var, seçim kayda yazılır", async () => {
    const { kayitlar } = await baslat({ yuklenen: panoVerisi() });
    await panoAc();
    fireEvent.click(screen.getAllByText("TAHSİLATLI FİRMA")[0]);
    await waitFor(() => expect(screen.getByText("Servis Talebini Düzenle")).toBeTruthy());
    fireEvent.click(odendiKutusu());
    fireEvent.change(screen.getByLabelText("Tahsilat hesabı"), { target: { value: "53" } });
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.hesapId === 53));
  });
  it("AC-43 / AC-51: panonun Yeni Yedek Parça Satışı formunda alan var; yetkisizde yok", async () => {
    await baslat({ yuklenen: panoVerisi() });
    await panoAc();
    fireEvent.click(screen.getByText("Yeni Yedek Parça Satışı"));
    parcaSatiri("Rul", "Rulman", "2", "100");
    fireEvent.click(odendiKutusu());
    expect(hesapBolgesi()).toBeTruthy();
    cleanup();
    await baslat({ sunucu: KAPALI, yuklenen: panoVerisi() });
    await panoAc();
    fireEvent.click(screen.getByText("Yeni Yedek Parça Satışı"));
    parcaSatiri("Rul", "Rulman", "2", "100");
    fireEvent.click(odendiKutusu());
    expect(hesapBolgesi()).toBeNull();
  });
});

// ── Bayi detayının iki satış formu (R4 madde 7), bayi sekmeli satış kullanıcısı ─────────────────────────────────────
const BAYI_VERISI = () => veri({
  dealers: [{ id: 3, name: "Ege Bayi", bayiMi: true, anlasmaliServisMi: false, city: "İzmir", country: "Türkiye" }],
  customers: [{ id: 500, name: "Kutu Gıda", model: "AK100", serialNo: "S-1", kaliplar: [] }],
  parts: [{ id: 7, ad: "Rulman" }], partStock: [{ partId: 7, miktar: 50 }], kalipDefs: [{ id: 1, ad: "Hamburger" }],
  services: [], partSales: [], yedekParcaSatislar: [], payments: [],
});
const bayiAc = async () => {
  menu("Bayiler");
  await waitFor(() => expect(screen.getByText("Ege Bayi")).toBeTruthy());
  fireEvent.click(screen.getByText("Ege Bayi"));
  await waitFor(() => expect(screen.getByText("Yedek Parça Satışı")).toBeTruthy());
};
const parcaSatiri = (arama, ad, miktar, fiyat) => {
  const inp = screen.getAllByPlaceholderText("Parça ara...")[0];
  fireEvent.focus(inp);
  fireEvent.change(inp, { target: { value: arama } });
  fireEvent.mouseDown(screen.getByText(ad));
  fireEvent.change(screen.getAllByPlaceholderText("Adet")[0], { target: { value: miktar } });
  const fiyatlar = screen.getAllByPlaceholderText("Adet")[0].parentElement.querySelectorAll("input");
  fireEvent.change(fiyatlar[fiyatlar.length - 1], { target: { value: fiyat } });
};
const kalipDoldur = () => {
  fireEvent.change(screen.getByPlaceholderText("Firma adı, model veya seri no ile ara..."), { target: { value: "Kutu" } });
  fireEvent.click(screen.getAllByText(/Kutu Gıda/).pop());
  const kalipAra = screen.getByPlaceholderText("Kalıp ara...");
  fireEvent.focus(kalipAra);
  fireEvent.change(kalipAra, { target: { value: "Ham" } });
  const h = screen.getAllByText("Hamburger").pop();
  fireEvent.mouseDown(h); fireEvent.click(h);
  const girdiler = screen.getByPlaceholderText("Ölçü, örn: 55x125 mm").parentElement.querySelectorAll("input");
  fireEvent.change(girdiler[girdiler.length - 1], { target: { value: "2.000" } });
};
const BAYICI = { tabs: ["dashboard", "dealers"] };

describe("Spec 0098: bayi detayının iki satış formu (gerçek App)", () => {
  it("AC-47: Yedek Parça Satışı formunda alan var, seçim kayda yazılır", async () => {
    const { kayitlar } = await baslat({ sunucu: BAYICI, yuklenen: BAYI_VERISI() });
    await bayiAc();
    fireEvent.click(screen.getByText("Yedek Parça Satışı"));
    parcaSatiri("Rul", "Rulman", "2", "100");
    fireEvent.click(odendiKutusu());
    fireEvent.change(screen.getByLabelText("Tahsilat hesabı"), { target: { value: "51" } });
    fireEvent.click(screen.getByText("Kaydet"));
    await bekleKayit(kayitlar, k => (k.yedekParcaSatislar || []).some(y => y.dealerId === 3 && y.hesapId === 51));
  });
  it("AC-46: Bayi Aracılığıyla Kalıp Satışı formunda alan var, seçim kayda yazılır", async () => {
    const { kayitlar } = await baslat({ sunucu: BAYICI, yuklenen: BAYI_VERISI() });
    await bayiAc();
    fireEvent.click(screen.getByText("Bayi Aracılığıyla Kalıp Satışı"));
    kalipDoldur();
    fireEvent.click(odendiKutusu());
    fireEvent.change(screen.getByLabelText("Tahsilat hesabı"), { target: { value: "51" } });
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    await bekleKayit(kayitlar, k => (k.partSales || []).some(p => p.hesapId === 51));
  });
  it("AC-48: yetkisiz kullanıcıda iki formda alan DOM'da yok ve kayda hesap bilgisi girmez", async () => {
    const { kayitlar } = await baslat({ sunucu: { ...BAYICI, giderActions: [] }, yuklenen: BAYI_VERISI() });
    await bayiAc();
    fireEvent.click(screen.getByText("Yedek Parça Satışı"));
    parcaSatiri("Rul", "Rulman", "2", "100");
    fireEvent.click(odendiKutusu());
    expect(hesapBolgesi()).toBeNull();
    fireEvent.click(screen.getByText("Kaydet"));
    await bekleKayit(kayitlar, k => (k.yedekParcaSatislar || []).length === 1);
    expect(kayitlar.at(-1).yedekParcaSatislar[0]).not.toHaveProperty("hesapId");
    fireEvent.click(screen.getByText("Bayi Aracılığıyla Kalıp Satışı"));
    kalipDoldur();
    fireEvent.click(odendiKutusu());
    expect(hesapBolgesi()).toBeNull();
    // Triyaj bulgu 1: kalıp kaydı da hesap bilgisi taşımaz.
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    await bekleKayit(kayitlar, k => (k.partSales || []).length === 1);
    expect(kayitlar.at(-1).partSales[0]).not.toHaveProperty("hesapId");
  });
});

describe("Spec 0098: yetki kapalı (işlem izinleri özelleştirilmiş, kutu işaretsiz)", () => {
  it("AC-13 / AC-14 / AC-15: formlarda alan DOM'da yok; Ödendi pencere açmaz, kayda hesap bilgisi yazılmaz", async () => {
    const { kayitlar } = await baslat({ sunucu: KAPALI });
    await detayAc();
    fireEvent.click(anahtar(0));
    expect(pencere()).toBeNull();
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.odendi === true));
    expect(kayitlar.at(-1).services.find(s => s.id === 800)).not.toHaveProperty("hesapId");
    for (const desen of [/^Garanti Dışı$/, /^Kalıp Verildi$/, /^Yedek Parça \(Kargo\)$/]) {
      duzenleAc(desen);
      fireEvent.click(odendiKutusu());
      expect(hesapBolgesi(), String(desen)).toBeNull();
      kapat();
    }
  });
  it("AC-16 (triyaj bulgu 1): servis formunu açıp kaydeden yetkisiz kullanıcı atanmış hesabı korur; formda alan yok", async () => {
    const { kayitlar } = await baslat({ sunucu: KAPALI, yuklenen: veri({ services: [{ ...SERVIS, odendi: true, tahsilatTarihi: `${buAy}-06`, hesapId: 51 }] }) });
    await detayAc().catch(() => {});
    duzenleAc(/^Garanti Dışı$/);
    await waitFor(() => expect(screen.getByText("Servis Talebini Düzenle")).toBeTruthy());
    expect(hesapBolgesi()).toBeNull();
    const once = kayitlar.length;
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    await waitFor(() => expect(kayitlar.length).toBeGreaterThan(once), { timeout: 3000 });
    expect(kayitlar.at(-1).services.find(s => s.id === 800)).toMatchObject({ odendi: true, hesapId: 51 });
  });
  it("AC-16: daha önce hesabı atanmış kaydın hesabı korunur (Ödendi → Ödenmedi geri alma)", async () => {
    const { kayitlar } = await baslat({ sunucu: KAPALI, yuklenen: veri({ services: [{ ...SERVIS, odendi: true, tahsilatTarihi: `${buAy}-06`, hesapId: 51 }] }) });
    await detayAc().catch(() => {});
    const odendi = screen.getAllByText("Ödendi").find(e => e.tagName === "BUTTON");
    fireEvent.click(odendi);
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.odendi === false && s.hesapId === 51));
  });
  // Triyaj bulgu 1: iki kip ve kayıt birlikte ölçülür (düzenleme kipinin kapısı ve kayıt dalı ayrı satırlardadır).
  it("AC-49: müşteri tahsilat formunun ekleme kipinde alan yok ve yeni tahsilata hesap bilgisi yazılmaz", async () => {
    const { kayitlar } = await baslat({ sunucu: KAPALI });
    await detayAc();
    await tahsilatFormu();
    expect(screen.queryByLabelText("Tahsilat hesabı")).toBeNull();
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    await bekleKayit(kayitlar, k => (k.payments || []).some(p => p.tutar === 7000));
    expect(kayitlar.at(-1).payments.find(p => p.tutar === 7000)).not.toHaveProperty("hesapId");
  });
  it("AC-49 / AC-16: düzenleme kipinde alan yok; kaydedince tahsilatın atanmış hesabı korunur", async () => {
    const { kayitlar } = await baslat({ sunucu: KAPALI });
    await detayAc();
    duzenleAc(/^Kapora\/Ödeme$/);
    await waitFor(() => expect(screen.getByText("Ödemeyi Düzenle")).toBeTruthy());
    expect(screen.queryByLabelText("Tahsilat hesabı")).toBeNull();
    const once = kayitlar.length;
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    await waitFor(() => expect(kayitlar.length).toBeGreaterThan(once), { timeout: 3000 });
    expect(kayitlar.at(-1).payments.find(p => p.id === 900).hesapId).toBe(53);
  });
  it("AC-17: yeni müşteri formunun ilk ödeme satırında alan yok", async () => {
    await baslat({ sunucu: KAPALI });
    menu("Müşteriler");
    await waitFor(() => expect(screen.getByText("Yeni Müşteri")).toBeTruthy());
    fireEvent.click(screen.getByText("Yeni Müşteri"));
    fireEvent.click(screen.getByText("+ Ödeme Ekle"));
    fireEvent.change(screen.getByLabelText("Ödeme yöntemi 1").parentElement.querySelector("input"), { target: { value: "5000" } });
    expect(screen.queryByLabelText("Tahsilat hesabı")).toBeNull();
  });
  it("AC-50: Stok › Yedek Parça Satışı'nda Ödendi pencere açmaz, hesap bilgisine dokunulmaz", async () => {
    const { kayitlar } = await baslat({ sunucu: KAPALI });
    menu("Stok");
    fireEvent.click((await screen.findAllByText(/Yedek Parça Satış/)).find(e => e.closest("[role=radio], [role=tab], button")));
    const dugme = await waitFor(() => { const b = screen.getAllByText(/Ödenmedi/).find(e => e.closest("button")); expect(b).toBeTruthy(); return b; });
    fireEvent.click(dugme.closest("button"));
    expect(pencere()).toBeNull();
    await bekleKayit(kayitlar, k => k.yedekParcaSatislar?.some(s => s.id === 820 && s.odendi === true));
    expect(kayitlar.at(-1).yedekParcaSatislar.find(s => s.id === 820)).not.toHaveProperty("hesapId");
  });
  it("AC-56: Kasa sekmeli ama giderActions'ı yeni kimlik olmadan özelleştirilmiş kullanıcıda alan yok (kabul edilen gerileme), Kasa ekranı açık", async () => {
    await baslat({ sunucu: { tabs: ["dashboard", "customers", "gider", "finance", "kasa"], giderActions: ["kasa_hesap"] } });
    expect(menudeVar("Kasa")).toBe(true);
    await detayAc();
    await tahsilatFormu();
    expect(screen.queryByLabelText("Tahsilat hesabı")).toBeNull();
  });
});

// Triyaj bulgu 2: "değişmeyenler" kriterleri bu spec'in kullanıcı düzeneğinde, AC adlarıyla (C8: içerik kuralları aynen).
describe("Spec 0098: değişmeyenler, Kasa'sız yetkili kullanıcıda", () => {
  const secenekler = (el) => [...el.querySelectorAll("option")].map(o => o.textContent);
  it("AC-31: liste içeriği ve sırası, 'Hesap belirtilmedi' seçeneği aynı (yalnız tahsilatın para birimindeki açık hesaplar)", async () => {
    await baslat();
    await detayAc();
    fireEvent.click(anahtar(0));
    expect(secenekler(within(pencere()).getByLabelText("Tahsilat hesabı"))).toEqual(["Hesap belirtilmedi", "Ziraat (Banka)", "Merkez Kasa (Kasa)"]);
  });
  it("AC-32: ön seçim son tahsilatın hesabı; kullanıcının boşalttığı değer yeniden dolmaz", async () => {
    await baslat();
    await detayAc();
    await tahsilatFormu();
    const sec = () => screen.getByLabelText("Tahsilat hesabı");
    expect(sec().value).toBe("53");
    fireEvent.change(sec(), { target: { value: "" } });
    fireEvent.change(screen.getAllByDisplayValue("Nakit").pop().parentElement.querySelector("input"), { target: { value: "8000" } });
    expect(sec().value).toBe("");
  });
});

describe("Spec 0098: Kasa'dan hesap atama yolu (AC-38)", () => {
  it("AC-38: hesapsız kaydedilen tahsilat Kasa'nın listesinde; oradan hesap atanır ve liste boşalır; kapsam dışı yolu duruyor", async () => {
    const { kayitlar } = await baslat({ sunucu: null }); // Kasa'yı gören kullanıcı (yerel mod)
    await detayAc();
    fireEvent.click(anahtar(0));
    fireEvent.click(screen.getByText("Hesapsız kaydet"));
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.odendi === true && s.hesapId == null));
    menu("Kasa");
    await waitFor(() => expect(screen.getByTestId("hesapsiz-tahsilat-satiri").textContent).toMatch(/tahsilatlar: 1/));
    fireEvent.click(screen.getByText("Listeyi göster"));
    const satir = screen.getByTestId("hesapsiz-tahsilat");
    expect(within(satir).getByRole("button", { name: /kapsam dışı/i })).toBeTruthy();
    fireEvent.change(within(satir).getByLabelText("Hesap ata: TAHSİLATLI FİRMA"), { target: { value: "51" } });
    await waitFor(() => expect(screen.getByTestId("hesapsiz-tahsilat-satiri").textContent).toMatch(/tahsilatlar: 0/));
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.hesapId === 51));
  });
});

describe("Spec 0098: sınır durumları", () => {
  it("AC-19: yayın perdesi inikken yetkili kullanıcıda da alan yok", async () => {
    perde.indi = true;
    await baslat();
    await detayAc();
    fireEvent.click(anahtar(0));
    expect(pencere()).toBeNull();
  });
  it("AC-20: yerel modda (sunucu yok) alan çizilir", async () => {
    await baslat({ sunucu: null });
    await detayAc();
    fireEvent.click(anahtar(0));
    expect(pencere()).toBeTruthy();
  });
  it("AC-21: admin rolünde alan çizilir", async () => {
    await baslat({ sunucu: { tabs: ["dashboard", "customers"], giderActions: [] }, rol: "admin" });
    await detayAc();
    fireEvent.click(anahtar(0));
    expect(pencere()).toBeTruthy();
  });
  it("AC-33: USD tahsilatta yalnız USD açık hesap listelenir", async () => {
    await baslat({ yuklenen: veri({ services: [{ ...SERVIS, currency: "USD", faturaTipi: "Faturasız Yurtdışı" }] }) });
    await detayAc();
    fireEvent.click(anahtar(0));
    expect([...within(pencere()).getByLabelText("Tahsilat hesabı").querySelectorAll("option")].map(o => o.textContent)).toEqual(["Hesap belirtilmedi", "Döviz (Banka)"]);
  });
});
