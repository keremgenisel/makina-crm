// @vitest-environment jsdom
// Spec 0145 B: istemci açılışında ilk çizim, jeton tazelemesinin döndürdüğü güncel izne bağlı (en çok 1,5 sn). Bayat yerel izinle
// çizip daraltma yok; kiosk ve kabuk ilk çizimde doğru; yerel mod, köprüsüz ortam, hata dönen tazeleme ve admin beklemede kalmaz.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { IZIN_BEKLEME_MS } from "../../src/lib/permissions";

const { default: App } = await import("../../src/App");
afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); });

const izin = (tabs) => (tabs == null ? null : JSON.stringify({ tabs }));
// İlk boş olmayan çizimi ve o anda kabuğun (nav) olup olmadığını yakalar; çizimin zamanını da.
const gozle = () => {
  const k = { ilk: null, navGoruldu: false, bas: Date.now() };
  const mo = new MutationObserver(() => {
    if (document.querySelector("nav")) k.navGoruldu = true;
    if (!k.ilk && document.body.textContent.trim()) k.ilk = { nav: !!document.querySelector("nav"), ms: Date.now() - k.bas, metin: document.body.textContent };
  });
  mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  k.bitir = () => mo.disconnect();
  return k;
};
const kur = ({ yerel = ["dashboard", "servis", "stock", "customers"], role = "user", tazele, apiRequest = async () => null, kopru = true } = {}) => {
  window.crmStorage = { load: vi.fn(async () => ({ customers: [], dataVersion: 1 })), save: vi.fn(async () => true), getVersion: vi.fn(async () => 1) };
  const t = { getConfig: async () => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role, permissions: izin(yerel), username: "u" }), apiRequest };
  if (kopru) t.refreshToken = tazele;
  window.appServer = new Proxy(t, { get: (o, k) => (k in o ? o[k] : String(k).startsWith("on") ? () => () => {} : k === "refreshToken" ? undefined : async () => null) });
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
};
const bekle = (ms) => act(() => new Promise(r => setTimeout(r, ms)));
const menuMetni = () => [...document.querySelectorAll("nav")].map(n => n.textContent).join(" ");

describe("Spec 0145 B: izin beklemesi", () => {
  it("AC-11 / AC-27 / AC-9 / AC-25: bayat yerel izin tam kabuk, sunucu yalnız pano diyor: ilk çizim doğrudan kiosk, kabuk bir an bile yok", async () => {
    let coz; kur({ tazele: () => new Promise(r => { coz = r; }) });
    const g = gozle();
    render(<App />);
    await bekle(300);
    expect(document.body.textContent.trim()).toBe(""); // AC-11: bekleme sürerken hiçbir içerik ya da tıklanabilir sekme yok
    await act(async () => { coz({ ok: true, role: "user", permissions: izin(["servis"]) }); });
    await bekle(800);
    g.bitir();
    expect(g.ilk).toBeTruthy(); expect(g.ilk.nav).toBe(false); expect(g.navGoruldu).toBe(false);
    expect(document.querySelector("nav")).toBeNull();
  });
  it("AC-25 (tersi) / AC-10: yerel izin kiosk, sunucu kabuğu veriyor: kiosk ekranı hiç çizilmez, ilk çizim kabukla ve doğru sekmelerle", async () => {
    kur({ yerel: ["servis"], tazele: async () => ({ ok: true, role: "user", permissions: izin(["dashboard", "servis", "stock"]) }) });
    const g = gozle();
    render(<App />);
    await bekle(900);
    g.bitir();
    expect(g.ilk.nav).toBe(true);
    expect(menuMetni()).toMatch(/Stok/); expect(menuMetni()).not.toMatch(/Müşteriler/);
  });
  it("AC-28 / AC-14 / B-R2/4: tazeleme 1,5 sn'de dönmezse yerel izinle çizilir; geç gelen cevap izni yerleştirir", async () => {
    let coz; kur({ tazele: () => new Promise(r => { coz = r; }) });
    const g = gozle();
    render(<App />);
    await bekle(IZIN_BEKLEME_MS - 300);
    expect(document.querySelector("nav")).toBeNull();
    await bekle(900);
    g.bitir();
    expect(g.ilk.nav).toBe(true); expect(g.ilk.ms).toBeGreaterThanOrEqual(IZIN_BEKLEME_MS - 50); expect(g.ilk.ms).toBeLessThan(IZIN_BEKLEME_MS + 800);
    expect(menuMetni()).toMatch(/Müşteriler/);
    await act(async () => { coz({ ok: true, role: "user", permissions: izin(["dashboard", "stock"]) }); });
    await bekle(100);
    expect(menuMetni()).not.toMatch(/Müşteriler/);
  });
  it("AC-29 / AC-13: tazeleme hata dönerse (sunucuya ulaşılamıyor) beklemeden yerel izinle açılır", async () => {
    kur({ tazele: async () => false });
    const g = gozle(); render(<App />); await bekle(600); g.bitir();
    expect(g.ilk.nav).toBe(true); expect(g.ilk.ms).toBeLessThan(IZIN_BEKLEME_MS);
  });
  it("AC-30: tazeleme işlevi yoksa bekleme kurulmaz", async () => {
    kur({ kopru: false });
    const g = gozle(); render(<App />); await bekle(600); g.bitir();
    expect(g.ilk.nav).toBe(true); expect(g.ilk.ms).toBeLessThan(IZIN_BEKLEME_MS);
  });
  it("AC-31: izin alanı boş admin ve kısıtsız kullanıcı beklemede kalmaz", async () => {
    for (const role of ["admin", "user"]) {
      kur({ yerel: null, role, tazele: async () => ({ ok: true, role, permissions: null }) });
      const g = gozle(); render(<App />); await bekle(600); g.bitir();
      expect(g.ilk.nav, role).toBe(true); expect(g.ilk.ms).toBeLessThan(IZIN_BEKLEME_MS);
      cleanup();
    }
  });
  it("AC-12: yerel mod (köprü yok) ve sunucu adresi olmayan kurulum bugünkü gibi hemen açılır", async () => {
    window.crmStorage = { load: vi.fn(async () => ({ customers: [] })), save: vi.fn(async () => true) };
    let g = gozle(); render(<App />); await bekle(500); g.bitir();
    expect(g.ilk.nav).toBe(true); expect(g.ilk.ms).toBeLessThan(IZIN_BEKLEME_MS);
    cleanup();
    const tazele = vi.fn(async () => false);
    window.appServer = new Proxy({ getConfig: async () => ({ mode: "server" }), refreshToken: tazele }, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
    g = gozle(); render(<App />); await bekle(500); g.bitir();
    expect(g.ilk.nav).toBe(true); expect(tazele).not.toHaveBeenCalled();
  });
  it("AC-32 / B-R1/5: yoklamanın ilk turu beklemeden çalışır; veri sürümü yerleşmeden veri yüklemez; tazeleme açılışta tek kez", async () => {
    const apiRequest = vi.fn(async () => ({ ok: true, data: { dataVersion: 7, role: "user", permissions: izin(["dashboard", "servis", "stock", "customers"]) } }));
    const tazele = vi.fn(async () => ({ ok: true, role: "user", permissions: izin(["dashboard", "servis", "stock", "customers"]) }));
    kur({ tazele, apiRequest });
    render(<App />);
    await bekle(1000);
    expect(apiRequest.mock.calls.filter(c => c[0]?.path === "/api/version").length).toBeGreaterThanOrEqual(1);
    expect(tazele).toHaveBeenCalledTimes(1);
    expect(window.crmStorage.load.mock.calls.length).toBe(1);
  });
});
