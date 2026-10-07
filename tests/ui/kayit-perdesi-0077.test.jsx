// @vitest-environment jsdom
// Spec 0077 D (gerçek App): kayıt perdesi. Kısa kayıtta görünmez, uzun kayıtta 600 ms sonra açılır, her pencerenin
// üstündedir, tıklama ve klavyeyi yutar, 10 sn'de kaçar ve sonucu söyler; başarısızlıkta kapanır.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import App from "../../src/App";
import { KAYIT_PERDESI_Z, KAYIT_PERDESI_METNI } from "../../src/components/KayitPerdesi";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
  vi.setSystemTime(new Date("2026-10-07T10:00:00"));
});
afterEach(() => { cleanup(); vi.useRealTimers(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); });

const ilerle = async (ms) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

// Her kayıt sure ms sürer ve sonuc döner.
function kur({ sure = 0, sonuc = { ok: true } } = {}) {
  const d = { surum: 1, kayitlar: [], sure, sonuc };
  window.crmStorage = {
    load: vi.fn(async () => ({ dataVersion: d.surum })),
    save: vi.fn((b) => new Promise(res => { d.kayitlar.push(b); setTimeout(() => { if (d.sonuc.ok) d.surum += 1; res(d.sonuc); }, d.sure); })),
    getVersion: vi.fn(async () => d.surum),
  };
  window.appServer = new Proxy({ getConfig: async () => ({}) }, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  return d;
}
const baslat = async () => { render(<App />); await ilerle(50); await ilerle(800); };
const notEkle = (metin) => {
  fireEvent.click(screen.getAllByText("Notlar")[0]);
  fireEvent.click(screen.getByText("Yeni Not"));
  fireEvent.change(screen.getByPlaceholderText("Notunuzu yazın... (ilk satır başlık olur)"), { target: { value: metin } });
  fireEvent.click(screen.getByText("Kaydet"));
};
const perde = () => screen.queryByTestId("kayit-perdesi");

describe("Spec 0077 D: kayıt perdesi (gerçek App)", () => {
  it("AC-25, AC-32: 200 ms süren kayıtta perde hiç görünmez; açılışta da görünmez", async () => {
    kur({ sure: 200 });
    render(<App />);
    for (let i = 0; i < 10; i++) { await ilerle(100); expect(perde()).toBeNull(); }
    notEkle("kısa");
    for (let i = 0; i < 20; i++) { await ilerle(100); expect(perde()).toBeNull(); }
  });
  it("AC-26, AC-34: 1,5 sn süren kayıtta yolda başlangıcından 600 ms sonra açılır; logo, metin, erişilebilirlik; bitince kapanır", async () => {
    const d = kur({ sure: 1500 });
    await baslat();
    notEkle("uzun");
    await ilerle(500);                 // debounce: kayıt yola çıktı
    expect(d.kayitlar).toHaveLength(1);
    await ilerle(550); expect(perde()).toBeNull();
    await ilerle(100);
    const p = perde();
    expect(p).not.toBeNull();
    expect(p.getAttribute("role")).toBe("status");
    expect(p.getAttribute("aria-busy")).toBe("true");
    expect(p.textContent).toContain(KAYIT_PERDESI_METNI);
    expect(p.querySelector("img")?.getAttribute("src")).toBeTruthy();
    await ilerle(900);
    expect(perde()).toBeNull();
  });
  it("AC-28: perde her pencerenin üstündedir (Modal 1000, onay 1100, arama 1200, açılır liste 1300); bildirim üstünde kalır", async () => {
    kur({ sure: 3000 });
    await baslat();
    notEkle("z");
    await ilerle(1200);
    expect(Number(perde().style.zIndex)).toBe(KAYIT_PERDESI_Z);
    const ui = readFileSync("src/components/ui.jsx", "utf8");
    const ara = readFileSync("src/components/GlobalSearch.jsx", "utf8");
    const zler = [...ui.matchAll(/zIndex: (\d+)/g), ...ara.matchAll(/zIndex: (\d+)/g)].map(m => Number(m[1]));
    expect(Math.max(...zler)).toBeLessThan(KAYIT_PERDESI_Z);
    for (const z of [1000, 1100, 1200, 1300]) expect(zler).toContain(z);
  });
  it("AC-27: perde açıkken tıklama ve klavye alttaki ekrana ulaşmaz", async () => {
    kur({ sure: 3000 });
    await baslat();
    notEkle("blok");
    await ilerle(1200);
    const tus = vi.fn();
    window.addEventListener("keydown", tus);
    fireEvent.keyDown(document.body, { key: "Enter" });
    expect(tus).not.toHaveBeenCalled();
    window.removeEventListener("keydown", tus);
    const tik = vi.fn();
    document.body.addEventListener("click", tik);
    fireEvent.click(perde());
    expect(tik).not.toHaveBeenCalled();
    document.body.removeEventListener("click", tik);
  });
  it("AC-30, AC-57: 10 sn'de perde kaçar ve 'uzun sürüyor' der; aynı zincir için yeniden açılmaz; bitince 'kaydedildi' der", async () => {
    kur({ sure: 15000 });
    await baslat();
    notEkle("çok uzun");
    await ilerle(500 + 9900);
    expect(perde()).not.toBeNull();
    await ilerle(200);
    expect(perde()).toBeNull();
    expect(document.body.textContent).toMatch(/Kayıt uzun sürüyor/);
    for (let i = 0; i < 4; i++) { await ilerle(1000); expect(perde()).toBeNull(); }
    await ilerle(1000);
    expect(document.body.textContent).toMatch(/Değişiklikler kaydedildi/);
  });
  it("AC-31: başarısız kayıtta perde kapanır ve nedenli mesaj görünür", async () => {
    kur({ sure: 2000, sonuc: { ok: false, sebep: "yetki" } });
    await baslat();
    notEkle("red");
    await ilerle(1200);
    expect(perde()).not.toBeNull();
    await ilerle(1400);
    expect(perde()).toBeNull();
    expect(document.body.textContent).toMatch(/değiştirme yetkiniz yok/);
  });
});
