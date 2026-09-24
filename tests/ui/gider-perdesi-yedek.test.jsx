// @vitest-environment jsdom
// Spec 0008 AC-8 / AC-9 (plan K3): perde inikken yedekleme ekranında gider ibaresi yok, ama yedek dosyası gider
// verisini içerir ve tam geri yüklemede gider verisi eksiksiz geri gelir. İbare giderYetki'den (perdeli), içerik
// giderVeriYetki'den (yalnız izin) beslenir.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, waitFor, within } from "@testing-library/react";
import { SettingsBackup } from "../../src/components/settings/SettingsBackup";

const perde = vi.hoisted(() => ({ indi: true }));
vi.mock("../../src/lib/yayinPerdesi", () => ({ GIDER_PERDESI: true, giderPerdesiIndi: () => perde.indi }));
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appMail; vi.unstubAllGlobals(); localStorage.clear(); });

const GIDER = {
  giderler: [{ id: 1, tarih: "2026-09-01", turId: 1, tutar: 10000, kdvOrani: 20, odendi: false }, { id: 2, tarih: "2026-09-02", turId: 1, tutar: 50, deletedAt: "2026-09-20T10:00:00Z" }],
  giderTanimlari: [{ id: 3, ad: "Kira", turId: 1, baslangicAy: "2026-01" }],
  giderTurleri: [{ id: 1, ad: "Malzeme", davranis: "normal" }],
  tedarikciler: [{ id: 11, ad: "Demir Bant" }],
  standartGiderler: [{ id: 21, grupId: 21, ad: "Elektrik", tutar: 1000, baslangicAy: "2026-01" }],
};
const ANAHTARLAR = Object.keys(GIDER);
const SETTER = { giderler: "setGiderler", giderTanimlari: "setGiderTanimlari", giderTurleri: "setGiderTurleri", tedarikciler: "setTedarikciler", standartGiderler: "setStandartGiderler" };

const temel = () => ({
  customers: [], services: [], dealers: [], stock: [], customModels: [], standardModels: [], factory: {},
  kalipDefs: [], notes: [], parts: [], partSales: [], payments: [], teklifler: [], faturalar: [],
  partStock: [], partStockLog: [], uretimFormlari: [], gorusmeler: [],
  setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(), setStock: vi.fn(), setCustomModels: vi.fn(),
  setStandardModels: vi.fn(), setFactory: vi.fn(), setKalipDefs: vi.fn(), setNotes: vi.fn(), setParts: vi.fn(),
  setPartSales: vi.fn(), setPayments: vi.fn(),
  ...GIDER, ...Object.fromEntries(Object.values(SETTER).map(s => [s, vi.fn()])),
  version: "3.39.0", appSettings: {}, setAppSettings: vi.fn(), flash: vi.fn(),
});
const backup = vi.fn(() => Promise.resolve(true));
beforeEach(() => {
  backup.mockClear();
  window.appMail = { getConfigForBackup: () => Promise.resolve(null), getAllLog: () => Promise.resolve([]) };
  window.crmStorage = { backup, autoBackupPasswordStatus: () => Promise.resolve({ set: false, canEncrypt: true }) };
});

const yedekAl = async () => {
  fireEvent.click(screen.getByRole("button", { name: /Yedek Al/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Şifresiz Kaydet/ }));
  await waitFor(() => expect(backup).toHaveBeenCalled());
  return backup.mock.calls[backup.mock.calls.length - 1][0];
};
const geriYukleAc = async (yedek) => {
  window.crmStorage.restore = () => Promise.resolve(structuredClone(yedek));
  fireEvent.click(screen.getByRole("button", { name: /Yedekten Geri Yükle/ }));
  return (await screen.findByText(/Geri yüklenecek bölümler/)).closest("div").parentElement;
};

describe("AC-8: Kurulu sürümde yedekleme ekranında gider ibaresi görünmez, ancak alınan yedek dosyası gider verisini içerir", () => {
  it("perde inik (giderYetki false, izin var): ekranda gider sözü yok; yedekte beş gider dizisi aynen var", async () => {
    const p = temel();
    const { container } = render(<SettingsBackup {...p} giderYetki={false} giderVeriYetki />);
    expect(container.textContent).not.toMatch(/gider/i);
    const yedek = await yedekAl();
    for (const k of ANAHTARLAR) expect(yedek[k], k).toEqual(GIDER[k]);
    const panel = await geriYukleAc(yedek);
    expect(panel.textContent).not.toMatch(/gider/i); // geri yükleme paket listesinde de ibare yok
  });
  it("AC-13: perde kalkıkken 'Giderler' paketi bugünkü gibi listede", async () => {
    render(<SettingsBackup {...temel()} giderYetki giderVeriYetki />);
    const panel = await geriYukleAc({ app: "altunmak-crm", schemaVersion: 2, customers: [], ...GIDER });
    expect(within(panel).getByText("Giderler")).toBeTruthy();
  });
});

describe("AC-9: Böyle alınmış bir yedek geri yüklendiğinde gider verisi eksiksiz geri gelir", () => {
  const yedek = { app: "altunmak-crm", schemaVersion: 2, customers: [], notes: [], ...GIDER };
  it("tam geri yükleme (görünen bütün paketler seçili): beş gider dizisi yedekteki hâliyle yerleşir", async () => {
    const p = temel();
    render(<SettingsBackup {...p} giderYetki={false} giderVeriYetki />);
    await geriYukleAc(yedek);
    fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
    await waitFor(() => expect(p.setGiderler).toHaveBeenCalled());
    for (const k of ANAHTARLAR) expect(p[SETTER[k]], k).toHaveBeenCalledWith(GIDER[k]);
  });
  it("K3: kısmi geri yükleme kullanıcının göremediği gider verisine dokunmaz", async () => {
    const p = temel();
    render(<SettingsBackup {...p} giderYetki={false} giderVeriYetki />);
    const panel = await geriYukleAc(yedek);
    fireEvent.click(within(panel).getByText("Notlar"));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
    await waitFor(() => expect(p.setCustomers).toHaveBeenCalled());
    for (const k of ANAHTARLAR) expect(p[SETTER[k]], k).not.toHaveBeenCalled();
  });
  it("R10: gider izni olmayan kullanıcıda bugünkü gibi gider verisi geri yüklenmez", async () => {
    const p = temel();
    render(<SettingsBackup {...p} giderYetki={false} giderVeriYetki={false} />);
    await geriYukleAc(yedek);
    fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
    await waitFor(() => expect(p.setCustomers).toHaveBeenCalled());
    for (const k of ANAHTARLAR) expect(p[SETTER[k]], k).not.toHaveBeenCalled();
  });
});

describe("AC-8 / AC-9 gerçek App üzerinden (perde inik, yerel mod)", () => {
  it("Ayarlar > Yedekleme'de ibare yok; alınan yedek gider verisini içerir; o yedekten tam geri yükleme gider verisini kaydeder", async () => {
    perde.indi = true;
    const kayitlar = [];
    window.crmStorage = {
      ...window.crmStorage,
      load: vi.fn(async () => ({ customers: [], ...structuredClone(GIDER), appSettings: {}, dataVersion: 1 })),
      save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }),
      getVersion: vi.fn(async () => 1),
    };
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
    render(<App />);
    await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 800));
    fireEvent.click(screen.getAllByText("Ayarlar").find(e => e.closest("nav")));
    fireEvent.click(screen.getAllByText("Veri Yönetimi").find(e => !e.closest("nav")));
    fireEvent.click(screen.getAllByText("Yedekleme").pop());
    await screen.findByRole("button", { name: /Yedek Al/ });
    // Kenar menüdeki "Giderler" sekmesi perdenin parçası (R1); onun dışında ekranda gider sözü yok.
    expect(screen.queryAllByText(/gider/i).filter(e => !e.closest("nav"))).toEqual([]);
    const yedek = await yedekAl();
    expect(yedek.giderler).toEqual(GIDER.giderler);
    // Yedekteki gider verisi mevcuttan farklı olsun: geri yükleme gerçekten yazıyor mu?
    const farkli = { ...yedek, giderler: [...yedek.giderler, { id: 99, tarih: "2026-09-03", turId: 1, tutar: 7 }] };
    const panel = await geriYukleAc(farkli);
    expect(panel.textContent).not.toMatch(/gider/i);
    fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
    await waitFor(() => expect(kayitlar.some(k => k.giderler?.some(g => g.id === 99))).toBe(true), { timeout: 3000 });
    const son = kayitlar[kayitlar.length - 1];
    expect(son.giderler).toEqual(farkli.giderler);
    for (const k of ANAHTARLAR.filter(k => k !== "giderler")) expect(son[k], k).toEqual(GIDER[k]);
  });
});
