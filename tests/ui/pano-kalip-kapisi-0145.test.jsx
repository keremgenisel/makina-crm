// @vitest-environment jsdom
// Spec 0145 A: panoda Extra Kalıp kargo kartları (pano bileşeni ve gerçek App). Kapı `kalipKargoKapisi` (Stok YA DA Müşteriler);
// düzenleme dört izin kimliğiyle (A-R4/2); salt okunur detay kilit almaz (A-R5/2); kiosk ve yedek parça kapısı değişmez.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act, waitFor } from "@testing-library/react";
import { ServisPanosu } from "../../src/components/ServisPanosu";
import { kalipKargoKapisi, kargoKapisi } from "../../src/lib/permissions";

afterEach(() => { cleanup(); delete window.crmLocks; delete window.auditLog; });
const KART = "Kalıp kargo detayı için tıklayın";
const MUSTERI = [{ id: 1, name: "BERCESTE", model: "AK-100", serialNo: "SN-1" }];
const PS = [
  { id: 900, customerId: 1, tur: "Kalıp", ad: "Adana", kargoDurum: "Hazırlanıyor", tarih: "2026-07-20" },
  { id: 902, customerId: 1, tur: "Kalıp", ad: "Pide", kargoDurum: "Teslim Edildi", panoGizli: true, tarih: "2026-07-19" },
  { id: 903, customerId: 1, tur: "Kalıp", ad: "Lahmacun", kargoDurum: "Hazırlanıyor", panoDusmeZamani: "2099-01-01T10:00", tarih: "2026-07-18" },
];
const izin = (o) => ({ role: "user", permissions: JSON.stringify(o) });
const STOK = [{ id: "servis" }, { id: "stock" }];
const kur = ({ sekmeler = STOK, perms = null, ...ek } = {}) => {
  window.crmLocks = { list: vi.fn(async () => []), acquire: vi.fn(async () => ({ ok: true })), release: vi.fn(async () => ({})) };
  window.auditLog = { log: vi.fn() };
  const s = { setServices: vi.fn(), setPartSales: vi.fn(), showToast: vi.fn() };
  const props = { services: [], customers: MUSTERI, calisanlar: [{ id: 1, ad: "Ali" }], partSales: PS, kalipYetki: kalipKargoKapisi(sekmeler),
    kargoYetki: kargoKapisi(sekmeler), yedekParcaSatislar: [], serverPermissions: perms, appSettings: { servisAlarm: { acik: true, sesSn: 1, yanipSn: 40 } }, ...s, ...ek };
  const r = render(<ServisPanosu {...props} />);
  return { ...s, props, rerender: r.rerender };
};
const rozet = (baslik) => [...document.querySelectorAll("h3")].find(h => h.textContent.toLowerCase().includes(baslik)).nextElementSibling.textContent;
const kalipKartlari = () => screen.queryAllByTitle(KART);

describe("Spec 0145 A: pano bileşeni", () => {
  it("AC-1 / AC-3 / AC-24: Stok sekmeli (Müşteriler'siz) kullanıcıda kart çizilir, BEKLİYOR rozeti ve Planlanan sayısı onu sayar", () => {
    kur();
    expect(kalipKartlari()).toHaveLength(1);
    expect(rozet("bekliyor")).toBe("1");
    expect(screen.getByText(/^Planlanan \(1\)$/)).toBeTruthy();
    cleanup();
    kur({ sekmeler: [{ id: "servis" }] });
    expect(rozet("bekliyor")).toBe("0");
    expect(screen.queryByText(/^Planlanan/)).toBeNull();
  });
  it("AC-2 / AC-17: planlanan ve (arşiv izniyle) arşivlenen Extra Kalıp listeleri dolu; Müşteriler sekmeli kullanıcı aynen görür", () => {
    for (const sekmeler of [STOK, [{ id: "servis" }, { id: "customers" }]]) {
      kur({ sekmeler });
      expect(kalipKartlari()).toHaveLength(1);
      fireEvent.click(screen.getByText(/^Planlanan \(/));
      expect(screen.getByText(/Lahmacun/)).toBeTruthy();
      fireEvent.click(screen.getByText(/^Arşivlenenler \(/));
      expect(screen.getByText(/Pide/)).toBeTruthy();
      cleanup();
    }
  });
  it("AC-4: Stok da Müşteriler de yoksa kart, planlanan ve arşiv yok", () => {
    kur({ sekmeler: [{ id: "servis" }, { id: "dashboard" }] });
    expect(kalipKartlari()).toHaveLength(0);
    expect(screen.queryByText(/^Planlanan/)).toBeNull(); expect(screen.queryByText(/^Arşivlenenler/)).toBeNull();
  });
  it("AC-18: arşiv izni yoksa arşiv listesi ve başlık Extra Kalıp içermez; sütundaki kart durur", () => {
    kur({ perms: izin({ customerActions: ["cust_kalip_edit", "kalip_pano_kaldir"] }) });
    expect(kalipKartlari()).toHaveLength(1);
    expect(screen.queryByText(/^Arşivlenenler/)).toBeNull();
  });
  it("AC-19: kaldırma izni yoksa arşivleme düğmesi ve Hemen Düşür çizilmez", () => {
    kur({ perms: izin({ customerActions: ["cust_kalip_edit", "kalip_pano_arsiv"] }) });
    expect(screen.queryByTitle("Kartı panodan kaldır (satış kaydı silinmez)")).toBeNull();
    fireEvent.click(screen.getByText(/^Planlanan \(/));
    expect(screen.queryByText("Hemen Düşür")).toBeNull();
    cleanup();
    const teslim = [{ id: 904, customerId: 1, tur: "Kalıp", ad: "Sucuk", kargoDurum: "Teslim Edildi", tarih: "2026-07-22" }];
    kur({ perms: izin({ customerActions: ["cust_kalip_edit"] }), partSales: teslim });
    expect(screen.queryByTitle("Kartı panodan kaldır (satış kaydı silinmez)")).toBeNull();
    cleanup();
    kur({ perms: izin({ customerActions: ["kalip_pano_kaldir"] }), partSales: teslim }); // karşıt: izinle düğme çizilir
    expect(screen.getByTitle("Kartı panodan kaldır (satış kaydı silinmez)")).toBeTruthy();
  });
  it("AC-5 / AC-21: cust_kalip_edit yoksa sürüklenmez, sorumlu seçilmez, detay pasif açılır ve kilit alınmaz", async () => {
    kur({ perms: izin({ customerActions: ["kalip_pano_kaldir", "kalip_pano_arsiv"] }) });
    const kart = kalipKartlari()[0];
    expect(kart.getAttribute("draggable")).toBe("false");
    expect(kart.querySelector("select").disabled).toBe(true);
    fireEvent.click(kart);
    await act(async () => {});
    const durumlar = screen.getAllByRole("button").filter(b => /Kargoya Verildi|Teslim Edildi/.test(b.textContent));
    expect(durumlar.length).toBeGreaterThan(0); for (const b of durumlar) expect(b.disabled).toBe(true);
    expect(window.crmLocks.acquire.mock.calls.filter(c => c[0] === "part_sale")).toHaveLength(0);
  });
  it("AC-21 (karşıt): cust_kalip_edit olan kullanıcıda detay kilidi bugünkü gibi alınır", async () => {
    kur({ perms: izin({ customerActions: ["cust_kalip_edit"] }) });
    fireEvent.click(kalipKartlari()[0]);
    await act(async () => {});
    expect(window.crmLocks.acquire.mock.calls.filter(c => c[0] === "part_sale").map(c => c[1])).toEqual(["900"]);
  });
  it("AC-20: kapısı olanda yeni Extra Kalıp kargosu yanıp söner ve şeride girer; kapısı olmayanda hiçbiri", () => {
    const yeni = { id: 950, customerId: 1, tur: "Kalıp", ad: "Kebap", kargoDurum: "Hazırlanıyor", tarih: "2026-07-21" };
    for (const [sekmeler, beklenen] of [[STOK, true], [[{ id: "servis" }], false]]) {
      const { props, rerender } = kur({ sekmeler });
      rerender(<ServisPanosu {...props} partSales={[...PS, yeni]} />);
      expect(!!document.querySelector(".servis-alarm-yanip"), String(beklenen)).toBe(beklenen);
      expect(screen.queryByText("Sustur") != null).toBe(beklenen);
      cleanup();
    }
  });
  it("AC-8: yedek parça kargosunun kapısı yalnız Stok", () => {
    const yp = [{ id: 700, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 1, kargoDurum: "Hazırlanıyor", tarih: "2026-07-20", tahsisler: [] }];
    kur({ sekmeler: [{ id: "servis" }, { id: "customers" }], yedekParcaSatislar: yp, dealers: [{ id: 5, name: "Bayi X" }], parts: [{ id: 7, ad: "Dişli" }] });
    expect(screen.queryAllByTitle("Kargo detayı / makinaya tahsis için tıklayın")).toHaveLength(0);
    expect(kalipKartlari()).toHaveLength(1);
  });
});

// ── Gerçek App ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const { default: App } = await import("../../src/App");
const veri = (ps) => ({ customers: [{ id: 1, name: "BERCESTE", model: "AK-100", serialNo: "SN-1" }], partSales: ps, services: [], yedekParcaSatislar: [],
  appSettings: { servisAlarm: { acik: true, sesSn: 1, yanipSn: 5 } }, dataVersion: 1 });
const baslat = async (tabs, ps = PS) => {
  const kayit = { ps, conflict: null, push: vi.fn() };
  window.crmStorage = { load: vi.fn(async () => structuredClone(veri(kayit.ps))), save: vi.fn(async () => true), getVersion: vi.fn(async () => 1) };
  const t = { getConfig: async () => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role: "user", permissions: JSON.stringify({ tabs }), username: "u" }),
    onConflict: (cb) => { kayit.conflict = cb; return () => {}; } };
  window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  window.appServisPano = new Proxy({ ac: vi.fn(() => kayit.acildi?.()), veriPush: kayit.push, onAcildi: (cb) => { kayit.acildi = cb; return () => {}; } }, { get: (o, k) => o[k] ?? (() => () => {}) });
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
  return kayit;
};
const appTemizle = () => { cleanup(); delete window.crmStorage; delete window.appServer; delete window.appServisPano; vi.unstubAllGlobals(); localStorage.clear(); };
const panoyaGit = () => fireEvent.click(screen.getAllByText("Servis ve Kargo Panosu").find(e => e.closest("nav")));

describe("Spec 0145 A: gerçek App", () => {
  afterEach(appTemizle);
  it("AC-1 / AC-17 / AC-4: Stok sekmeli ve Müşteriler sekmeli kullanıcı görür, ikisi de yoksa görmez", async () => {
    for (const [tabs, n] of [[["dashboard", "servis", "stock"], 1], [["dashboard", "servis", "customers"], 1], [["dashboard", "servis", "finance"], 0]]) {
      await baslat(tabs);
      panoyaGit();
      expect(screen.queryAllByTitle(KART), tabs.join()).toHaveLength(n);
      appTemizle();
    }
  });
  it("AC-7 / AC-23 / AC-25 (kiosk): yalnız pano sekmeli kullanıcı doğrudan panoyu görür, Extra Kalıp kartı yok", async () => {
    await baslat(["servis"]);
    expect(document.querySelector("nav")).toBeNull();
    expect(screen.queryAllByTitle(KART)).toHaveLength(0);
  });
  it("AC-20 / AC-4 (bildirim ve ayrı pencere): pano dışında yeni Extra Kalıp kargosu bildirimi yalnız kapısı olanda; ayrı pencere görüntüsü aynı bayrağı taşır", async () => {
    for (const [tabs, beklenen] of [[["dashboard", "servis", "stock"], true], [["dashboard", "servis", "finance"], false]]) {
      const k = await baslat(tabs, PS.slice(0, 1));
      k.ps = [...PS.slice(0, 1), { id: 950, customerId: 1, tur: "Kalıp", ad: "Kebap", kargoDurum: "Hazırlanıyor", tarih: "2026-07-21" }];
      await act(async () => { await k.conflict(); });
      await new Promise(r => setTimeout(r, 300));
      expect(screen.queryByText(/📦 BERCESTE/) != null, tabs.join()).toBe(beklenen);
      panoyaGit();
      await act(async () => { fireEvent.click(screen.getByText(/Ayrı Pencere/)); });
      await new Promise(r => setTimeout(r, 50));
      const son = k.push.mock.calls.at(-1)?.[0];
      expect(son).toBeTruthy(); expect(son.kalipYetki).toBe(beklenen);
      appTemizle();
    }
  });
});
