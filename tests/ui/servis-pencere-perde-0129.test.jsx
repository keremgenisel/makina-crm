// @vitest-environment jsdom
// Spec 0129: ayrı pano penceresinde kayıt perdesi ve kayıt sonucu. (1) Pencere sahte köprüyle: kanalı birebir çizer. (2) Gerçek
// App sahte zamanlayıcıyla (0077 perde testinin düzeneği): kararı verir ve kanala gönderir. (3) Kaynak taramaları.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { ServisPencere } from "../../src/components/ServisPencere";
import { TOKENS } from "../../src/lib/theme";
import { KAYIT_MESAJLARI, KACIS_MESAJI, KAYDEDILDI_MESAJI, CAKISMA_MESAJI, DENEME_TUKENDI_MESAJI, kayitMesaji } from "../../src/lib/kayitDurumu";

afterEach(() => { cleanup(); delete window.servisBridge; delete window.appServisPano; document.documentElement.removeAttribute("data-theme"); });

const SNAP = (o = {}) => ({ services: [{ id: 10, customerId: 1, type: "Periyodik Bakım", durum: "Bekliyor", date: "2026-07-20", tech: "" }],
  customers: [{ id: 1, name: "ABC Makina" }], calisanlar: [{ id: 1, ad: "Ali" }], parts: [], dealers: [], factory: { name: "A" }, appSettings: null, geoData: null,
  loadingGeo: false, partStock: [], partStockLog: [], dosyalar: [], yedekParcaSatislar: [], partSales: [], serverPermissions: null,
  aktifKullanici: "kiosk", kargoYetki: false, kalipYetki: false, dosyaCevrimdisi: false, tema: "light", ...o });
const kopru = ({ veri = SNAP(), ilkKayit = null, veriBekle = false } = {}) => {
  let kayitCb = null, veriCoz = null;
  window.servisBridge = {
    ilkVeriAl: () => (veriBekle ? new Promise(r => { veriCoz = () => r(veri); }) : Promise.resolve(veri)),
    onVeri: () => () => {}, mutate: vi.fn(),
    ilkKayitAl: () => Promise.resolve(ilkKayit),
    onKayit: (cb) => { kayitCb = cb; return () => { kayitCb = null; }; },
  };
  return { yayinla: (k) => act(() => kayitCb?.(k)), veriVer: () => act(async () => { veriCoz?.(); }) };
};
const perde = () => screen.queryByTestId("kayit-perdesi");
const hazirBekle = () => waitFor(() => expect(screen.queryByText("Yükleniyor…")).toBeNull());

describe("Spec 0129: ayrı pencere kanalı birebir çizer (C1)", () => {
  it("AC-2 / AC-4 / AC-16: kanal 'kapalı' derken perde yok, 'açık' derken var, kapanınca gider", async () => {
    const k = kopru();
    render(<ServisPencere />);
    await hazirBekle();
    expect(perde()).toBeNull();
    k.yayinla({ perdeAcik: true, durum: "yolda" });
    expect(perde()).not.toBeNull();
    expect(perde().getAttribute("data-durum")).toBe("yolda");
    expect(perde().querySelector("img")?.getAttribute("src")).toBeTruthy(); // R7: logo paketten
    k.yayinla({ perdeAcik: false, durum: "bos" });
    expect(perde()).toBeNull();
  });
  it("AC-3: perde açıkken tıklama ve klavye yutulur", async () => {
    const k = kopru();
    render(<ServisPencere />);
    await hazirBekle();
    k.yayinla({ perdeAcik: true, durum: "yolda" });
    const e = new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true });
    window.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
    expect(fireEvent.click(perde())).toBe(false); // preventDefault
  });
  it("AC-9: kayıt sürerken açılan pencere görüntü gelmeden yalnız 'Yükleniyor…' gösterir, görüntü gelince perdeyi", async () => {
    const k = kopru({ ilkKayit: { perdeAcik: true, durum: "yolda" }, veriBekle: true });
    render(<ServisPencere />);
    await act(async () => {});
    expect(screen.getByText("Yükleniyor…")).toBeTruthy();
    expect(perde()).toBeNull();
    await k.veriVer();
    await hazirBekle();
    expect(perde()).not.toBeNull();
  });
  it("AC-11: köprü hiç yokken pencere hata vermez, perde çizilmez", async () => {
    expect(() => render(<ServisPencere />)).not.toThrow();
    await act(async () => {});
    expect(perde()).toBeNull();
    expect(screen.getByText("Yükleniyor…")).toBeTruthy();
  });
  it("AC-7 / AC-18: mesaj yalnız sayacı değişince gösterilir; aynı metin ikinci kez de gösterilir; açılışta çekilen mesaj gösterilmez", async () => {
    const k = kopru({ ilkKayit: { perdeAcik: false, durum: "bos", mesaj: { metin: "ESKİ HATA", tur: "err", no: 7 } } });
    render(<ServisPencere />);
    await hazirBekle();
    expect(screen.queryByText("ESKİ HATA")).toBeNull();
    k.yayinla({ perdeAcik: false, mesaj: { metin: "ESKİ HATA", tur: "err", no: 7 } }); // aynı no: gösterilmez
    expect(screen.queryByText("ESKİ HATA")).toBeNull();
    const h = kayitMesaji("yetki");
    k.yayinla({ mesaj: { metin: h.metin, tur: h.tur, no: 8 } });
    expect(screen.getByText(h.metin)).toBeTruthy();
    expect(screen.getByText(h.metin).style.background).toMatch(/red600/); // "err" kırmızı
    // Triyaj: pencere türü yorumlamaz; "warn" ana pencerede olduğu gibi yeşil şeritle (R8/2, R8/3, Karar 18).
    k.yayinla({ mesaj: { metin: KACIS_MESAJI.metin, tur: "warn", no: 85 } });
    expect(screen.getByText(KACIS_MESAJI.metin).style.background).toMatch(/grn600/);
    k.yayinla({ mesaj: { metin: "B", tur: undefined, no: 9 } });
    expect(screen.queryByText(h.metin)).toBeNull();
    k.yayinla({ mesaj: { metin: h.metin, tur: h.tur, no: 10 } }); // aynı metin, yeni olay
    expect(screen.getByText(h.metin)).toBeTruthy();
  });
  it("AC-17: karanlık temada perdenin zemini perdeBg token'ından ve beyaz değil", async () => {
    const k = kopru({ veri: SNAP({ tema: "dark" }) });
    render(<ServisPencere />);
    await hazirBekle();
    k.yayinla({ perdeAcik: true, durum: "yolda" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(perde().style.background).toMatch(/var\(--perdeBg/);
    const t = TOKENS.find(x => x[0] === "perdeBg");
    expect(t[2]).not.toMatch(/255,\s*255,\s*255|#fff/i);
    expect(document.head.innerHTML.replace(/\s/g, "")).toContain(`--perdeBg:${t[2]}`);
  });
});

// ── Gerçek App: kararı verir, kanala gönderir (Karar 21) ─────────────────────────────────────────────────────────────
describe("Spec 0129: ana pencere kanala gönderir (gerçek App)", () => {
  afterEach(() => { vi.useRealTimers(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); });
  const ilerle = async (ms) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
  const kur = async ({ sure = 0, sonuc = { ok: true }, acik = true } = {}) => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
    vi.setSystemTime(new Date("2026-10-07T10:00:00"));
    const d = { surum: 1, sure, sonuc };
    window.crmStorage = {
      load: vi.fn(async () => ({ dataVersion: d.surum })),
      save: vi.fn(() => new Promise(res => { setTimeout(() => { if (d.sonuc.ok) d.surum += 1; res(d.sonuc); }, d.sure); })),
      getVersion: vi.fn(async () => d.surum),
    };
    window.appServer = new Proxy({ getConfig: async () => ({}) }, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
    let acildi = null;
    window.appServisPano = { onAcildi: (cb) => { acildi = cb; return () => {}; }, onKapandi: () => () => {}, veriPush: vi.fn(), kayitPush: vi.fn(), onMutate: () => () => {} };
    const { default: App } = await import("../../src/App");
    render(<App />);
    await ilerle(50); await ilerle(800);
    if (acik) await act(async () => { acildi?.(); });
    return window.appServisPano.kayitPush;
  };
  const notEkle = (metin) => {
    fireEvent.click(screen.getAllByText("Notlar")[0]);
    fireEvent.click(screen.getByText("Yeni Not"));
    fireEvent.change(screen.getByPlaceholderText("Notunuzu yazın... (ilk satır başlık olur)"), { target: { value: metin } });
    fireEvent.click(screen.getByText("Kaydet"));
  };
  const durumlar = (spy) => spy.mock.calls.map(c => c[0]).filter(y => y.perdeAcik !== undefined).map(y => y.perdeAcik);
  const mesajlar = (spy) => spy.mock.calls.map(c => c[0].mesaj).filter(Boolean);

  it("AC-10: pencere kapalıyken kanala hiçbir şey gönderilmez (perde durumu da, kayıt mesajı da)", async () => {
    let spy = await kur({ sure: 1500, acik: false });
    notEkle("kapalı");
    await ilerle(3000);
    expect(spy).not.toHaveBeenCalled();
    cleanup(); vi.useRealTimers();
    spy = await kur({ sure: 10, sonuc: { ok: false, sebep: "yetki" }, acik: false }); // mesaj üreten kayıt
    notEkle("kapalı yetkisiz");
    await ilerle(1000);
    expect(screen.getByText(kayitMesaji("yetki").metin)).toBeTruthy(); // ana pencere gösterdi
    expect(spy).not.toHaveBeenCalled();
  });
  it("AC-1 / AC-4 / AC-20: pencere açılınca güncel durum gider; ana penceredeki bir düzenlemenin uzun kaydı perdeyi açar, bitince kapatır", async () => {
    const spy = await kur({ sure: 1500 });
    expect(durumlar(spy)).toEqual([false]); // açılışta taze durum (R2/2)
    notEkle("uzun");
    await ilerle(500 + 550);
    // Eşik dolmadı: kayıt "yolda" ama perde kapalı (karar ana pencerede, pencere durumu yalnız aktarır).
    expect(durumlar(spy)).not.toContain(true);
    expect(spy.mock.calls.map(c => c[0])).toContainEqual({ perdeAcik: false, durum: "yolda" });
    await ilerle(200);
    expect(durumlar(spy).at(-1)).toBe(true);
    await ilerle(2000);
    expect(durumlar(spy).at(-1)).toBe(false);
    expect(spy.mock.calls.at(-1)[0]).toEqual({ perdeAcik: false, durum: "bos" });
  });
  it("AC-5 / AC-19: on saniyede kaçış bildirimi ve kaçış sonrası başarı mesajı artan sayaçla gider", async () => {
    const spy = await kur({ sure: 12000 });
    notEkle("çok uzun");
    await ilerle(500 + 10100);
    expect(durumlar(spy).at(-1)).toBe(false);
    expect(mesajlar(spy)).toEqual([{ metin: KACIS_MESAJI.metin, tur: "warn", no: 1 }]);
    await ilerle(3000);
    expect(mesajlar(spy)).toEqual([{ metin: KACIS_MESAJI.metin, tur: "warn", no: 1 }, { metin: KAYDEDILDI_MESAJI.metin, tur: undefined, no: 2 }]);
  });
  it("AC-7 / AC-19: nedenli hata ve denemelerin tükenmesi mesajı kanala düşer", async () => {
    let spy = await kur({ sure: 10, sonuc: { ok: false, sebep: "yetki" } });
    notEkle("yetkisiz");
    await ilerle(1000);
    expect(mesajlar(spy).at(-1)).toEqual({ metin: kayitMesaji("yetki").metin, tur: "err", no: 1 });
    cleanup(); vi.useRealTimers();
    spy = await kur({ sure: 10, sonuc: { ok: false, sebep: "sunucu" } });
    notEkle("sunucu yok");
    await ilerle(20000);
    expect(mesajlar(spy).map(m => m.metin)).toContain(DENEME_TUKENDI_MESAJI.metin);
  });
});

// ── Kaynak taramaları ───────────────────────────────────────────────────────────────────────────────────────────────
const oku = (f) => readFileSync(f, "utf8");
const dosyalar = (k) => readdirSync(k).flatMap(a => { const p = path.join(k, a); return statSync(p).isDirectory() ? dosyalar(p) : /\.(jsx?|mjs|cjs)$/.test(a) ? [p] : []; });
describe("Spec 0129: kaynak taramaları", () => {
  it("AC-6 / AC-16: pencerede perde zamanlayıcısı ve süre kuralı yok (tek setTimeout bildirim şeridinin)", () => {
    const p = oku("src/components/ServisPencere.jsx");
    expect(p).not.toMatch(/PERDE_ESIK_MS|PERDE_KACIS_MS|perdeGorunurMu|kayitDurumu/);
    expect(p.match(/setTimeout\(/g)).toHaveLength(1);
    expect(p).toMatch(/toastRef\.current = setTimeout\(\(\) => setToast\(null\), 3000\)/);
    // Karar ana pencerede: pencereye giden durum, ana pencerenin perdesinin okuduğu durumun kendisi.
    const a = oku("src/App.jsx");
    expect(a).toMatch(/<KayitPerdesi acik=\{perdeAcik\} durum=\{kayitDurumu\}/);
    expect(a).toMatch(/pencereyeKayit\(\{ perdeAcik, durum: kayitDurumu \}\)/);
  });
  it("AC-8 / AC-19 / C5: pencerede kayıt mesajı metni yok; mesaj App'in tek kapısı bildir'den gider", () => {
    const p = oku("src/components/ServisPencere.jsx");
    for (const m of [...Object.values(KAYIT_MESAJLARI).filter(Boolean), KACIS_MESAJI, KAYDEDILDI_MESAJI, CAKISMA_MESAJI, DENEME_TUKENDI_MESAJI]) expect(p).not.toContain(m.metin);
    expect(p).not.toMatch(/kayitDurumu/);
    const a = oku("src/App.jsx");
    const govde = a.slice(a.indexOf("const bildir = (mesaj, anahtar) => {"), a.indexOf("// R2/2, R5: perde DURUMU efektle"));
    expect(govde).toMatch(/pencereyeKayit\(\{ mesaj: \{ metin: mesaj\.metin, tur, no: pencereMesajNoRef\.current \} \}\)/);
    expect(a.match(/kayitPush/g)).toHaveLength(1);
    // Triyaj: hiçbir kayıt mesajı bildir'i atlayıp doğrudan showToast'a gitmez (gitseydi pencereye düşmezdi).
    const dogrudan = a.split("\n").filter(l => /showToast\(/.test(l) && /KAYIT_MESAJLARI|kayitMesaji\(|CAKISMA_MESAJI|DENEME_TUKENDI_MESAJI|KAYDEDILDI_MESAJI|KACIS_MESAJI|YENIDEN_BAGLANDI/.test(l));
    expect(dogrudan).toEqual([]);
    expect(a.match(/bildir\((CAKISMA_MESAJI|YENIDEN_BAGLANDI_MESAJI|YENIDEN_BAGLANDI_KAYDEDILDI_MESAJI)/g)?.length).toBeGreaterThanOrEqual(3);
  });
  it("AC-12 / C4: perde bileşeni tek tanım, iki pencere aynı dosyadan içe alır", () => {
    const tanim = dosyalar("src").filter(f => /export const KayitPerdesi\b/.test(oku(f)));
    expect(tanim.map(f => f.split(path.sep).join("/"))).toEqual(["src/components/KayitPerdesi.jsx"]);
    expect(oku("src/App.jsx")).toMatch(/import \{ KayitPerdesi \} from "\.\/components\/KayitPerdesi"/);
    expect(oku("src/components/ServisPencere.jsx")).toMatch(/import \{ KayitPerdesi \} from "\.\/KayitPerdesi\.jsx"/);
  });
  it("AC-14: yazma köprüsü ve kilit kanalları değişmedi; kayıt kanalı yalnız okuma yönünde", () => {
    const ps = oku("electron/preload-servis.cjs");
    expect(ps).toContain('mutate: (key, value) => ipcRenderer.send("servis:mutate", { key, value }),');
    expect(ps).toContain('list:       () => ipcRenderer.invoke("crm:lock:list"),');
    expect(ps).not.toMatch(/send\("servis:kayit/); // pencere kayıt kanalına yazmaz
    expect(oku("electron/ipc/servis-pencere.cjs")).toContain('ipcMain.on("servis:mutate", (_e, yuk) => { mutasyonAnaPencere?.(yuk); });');
  });
});

describe("Spec 0129: görsel kanıt (AC-22, Karar 22, 24)", () => {
  it("AC-22: üç ekran iki temada çizim hatasız, perde ekranında perde şeridi var, JPEG'ler depoda", () => {
    const r = JSON.parse(oku("docs/evidence/0129-piksel-raporu.json"));
    for (const e of ["servis-pencere-0129-perde", "servis-pencere-0129-kacis-basari", "servis-pencere-0129-hata"]) for (const t of ["aydinlik", "karanlik"]) {
      const k = r.find(x => x.ad === `${e}-${t}.png`);
      expect(k, `${e}-${t}`).toBeTruthy();
      expect(k.cizimHatasi).toBeUndefined();
      expect(k.adimUyarilari).toBeUndefined();
      expect(k.piksel).toBeGreaterThan(0); // spec öncesi pencere perde ve bildirim çizmiyordu
      expect(statSync(`docs/evidence/0129-${e}-${t}.jpg`).size).toBeGreaterThan(0);
    }
    expect(r.find(x => x.ad === "servis-pencere-0129-perde-karanlik.png").seritler).toEqual(["Kaydediliyor"]);
  });
});
