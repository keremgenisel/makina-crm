// @vitest-environment jsdom
// Spec 0085: istemci sürümü görünür olur. Gerçek App'te sürüm köprüden gelene kadar hiçbir sürüm rakamı yazılmaz
// (R2), boş sürümle güncelleme şeridi açılmaz (R22), iki yedek yolu boş damga yazar (R3); Kullanıcı Geçmişi'nde
// sürüm rozeti ve CSV sütunu (R10, R11); Sunucu Bağlantısı'nda yalnız sunucu PC'de bağlı bilgisayarlar kartı
// (R13–R19). Sürüm rakamı sabitlenmez: paket sürümü package.json'dan okunur (C5).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, within, fireEvent, act } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import App from "../../src/App";
import { SettingsApp } from "../../src/components/settings/SettingsApp";
import { SettingsBackup } from "../../src/components/settings/SettingsBackup";
import { SettingsSecurityLog, kullaniciGecmisiCsv, ACTION_LABELS } from "../../src/components/settings/SettingsSecurityLog";
import { SettingsServer } from "../../src/components/settings/SettingsServer";
import { TAZELIK_IBARESI, PENCERE_IBARESI } from "../../src/components/settings/BagliBilgisayarlar";

const PAKET = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../package.json"), "utf8")).version;
// Paketten eski ve yeni iki sürüm (rakam sabitlenmez).
const [MA, MI] = PAKET.split(".").map(Number);
const ESKI = MI > 0 ? `${MA}.${MI - 1}.0` : `${MA - 1}.9.0`;
const YENI = `${MA}.${MI + 1}.0`;

afterEach(() => {
  cleanup();
  for (const k of ["crmStorage", "appUpdater", "securityLog", "appServer", "appMail"]) delete window[k];
  vi.unstubAllGlobals(); localStorage.clear();
});
const bekle = (ms) => new Promise(r => setTimeout(r, ms));

// Gerçek App için sahte depo; sürüm köprüsü isteğe göre geciktirilir.
function kur({ surumGecikir = false, yedekAyari = null, updater = true } = {}) {
  let surumCoz;
  const surumSozu = new Promise(r => { surumCoz = r; });
  let olayAvailable = null;
  if (yedekAyari) localStorage.setItem("yerelYedekAyari", JSON.stringify(yedekAyari));
  window.crmStorage = {
    load: vi.fn(async () => { await bekle(30); return { customers: [], appSettings: {}, dataVersion: 1 }; }),
    save: vi.fn(async () => true), getVersion: vi.fn(async () => 1),
    writeBackup: vi.fn(async () => true),
  };
  if (updater) window.appUpdater = {
    version: vi.fn(() => (surumGecikir ? surumSozu : Promise.resolve(PAKET))),
    onAvailable: (cb) => { olayAvailable = cb; return () => {}; }, onProgress: () => () => {}, onDownloaded: () => () => {}, onError: () => () => {},
    check: vi.fn(async () => ({})), download: vi.fn(), install: vi.fn(),
  };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  return { surumCoz: (v) => act(async () => { surumCoz(v); await bekle(0); }), available: (v) => act(async () => { olayAvailable?.(v); await bekle(0); }) };
}
// Sürüm rakamı ya da tek başına "v" (boş sürümün izi) hiçbir öğede yok.
const surumYazisiVarMi = () => !!document.body.textContent.match(/v\d+\.\d+\.\d+/) || [...document.querySelectorAll("span, div, b")].some(e => e.children.length === 0 && e.textContent.trim() === "v");

describe("Spec 0085 R1, R2, R22: gerçek App'te sürüm", () => {
  it("AC-2, AC-4: köprü cevap vermeden kenar çubuğunda ve şeritte sürüm rakamı yok, şerit açılmaz; cevapla doğru sürüm görünür", async () => {
    const k = kur({ surumGecikir: true });
    render(<App />);
    await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
    await screen.findByText("Ayarlar");
    expect(surumYazisiVarMi()).toBe(false);
    await k.available(YENI); // main.cjs'in açılış denetimi sürüm gelmeden önce "yeni sürüm var" derse
    expect(screen.queryByText(/yayınlandı/)).toBeNull(); // R22: boş sürümle şerit yok, "kurulu: v" yok
    expect(document.body.textContent).not.toMatch(/kurulu: v/);
    await k.surumCoz(PAKET);
    await waitFor(() => expect(screen.getByText(`v${PAKET}`)).toBeTruthy());
    // Sürüm gelince bugünkü davranış: daha yeni yayın için şerit "kurulu: v<paket>" ile açılır.
    await waitFor(() => expect(document.body.textContent).toContain(`yayınlandı (kurulu: v${PAKET}). Güncellemek`));
  });

  it("AC-2: Ayarlar › Uygulama'da sürüm bilinmeden \"Kurulu sürüm\" yok, bilinince paket sürümü", async () => {
    const k = kur({ surumGecikir: true });
    render(<App />);
    fireEvent.click(await screen.findByText("Ayarlar"));
    await waitFor(() => expect(screen.getByText("Uygulama Güncellemesi")).toBeTruthy());
    expect(screen.queryByText(/Kurulu sürüm/)).toBeNull();
    await k.surumCoz(PAKET);
    await waitFor(() => expect(document.body.textContent).toContain(`Kurulu sürüm: v${PAKET}.`));
  });

  it("AC-5: köprü yokken (dev/önizleme) App hatasız açılır, sürüm metni hiç çizilmez", async () => {
    kur({ updater: false });
    render(<App />);
    fireEvent.click(await screen.findByText("Ayarlar"));
    await waitFor(() => expect(screen.getByText("Uygulama Güncellemesi")).toBeTruthy());
    expect(surumYazisiVarMi()).toBe(false);
    expect(screen.queryByText(/Kurulu sürüm/)).toBeNull();
  });

  it("AC-3: otomatik yedek sürüm bilinmiyorken boş damga yazar (eski rakam taşımaz)", async () => {
    kur({ surumGecikir: true, yedekAyari: { autoBackup: true, backupFolder: "D:\\Yedek", frequency: "daily", lastBackup: null } });
    render(<App />);
    await waitFor(() => expect(window.crmStorage.writeBackup).toHaveBeenCalled(), { timeout: 3000 });
    expect(window.crmStorage.writeBackup.mock.calls[0][1].version).toBe("");
  });

  it("AC-3: otomatik yedek sürüm bilinince paket sürümünü yazar", async () => {
    kur({ yedekAyari: { autoBackup: true, backupFolder: "D:\\Yedek", frequency: "daily", lastBackup: null } });
    render(<App />);
    await waitFor(() => expect(window.crmStorage.writeBackup).toHaveBeenCalled(), { timeout: 3000 });
    expect(window.crmStorage.writeBackup.mock.calls[0][1].version).toBe(PAKET);
  });
});

describe("Spec 0085 R2: SettingsApp (izole)", () => {
  const upd = { state: "available", latest: YENI, progress: 0, error: null };
  it("AC-2: boş sürümde \"Kurulu sürüm\" ve \"(kurulu: v…)\" çizilmez; dolu sürümde bugünkü metin", () => {
    const { unmount } = render(<SettingsApp version="" flash={vi.fn()} appUpd={upd} onCheckUpdate={vi.fn()} onStartUpdate={vi.fn()} />);
    expect(screen.queryByText(/Kurulu sürüm/)).toBeNull();
    expect(document.body.textContent).toContain("Yeni bir sürüm yayınlandığında buradan tek tıkla");
    expect(document.body.textContent).not.toMatch(/kurulu: v/);
    unmount();
    render(<SettingsApp version={PAKET} flash={vi.fn()} appUpd={upd} onCheckUpdate={vi.fn()} onStartUpdate={vi.fn()} />);
    expect(document.body.textContent).toContain(`Kurulu sürüm: v${PAKET}. Yeni bir sürüm yayınlandığında buradan`);
  });
});

describe("Spec 0085 R3: elle yedek", () => {
  const temel = (version) => ({
    customers: [], services: [], dealers: [], stock: [], customModels: [], standardModels: [], factory: {}, kalipDefs: [], notes: [], parts: [], partSales: [],
    payments: [], teklifler: [], faturalar: [], partStock: [], partStockLog: [], uretimFormlari: [], gorusmeler: [],
    setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(), setStock: vi.fn(), setCustomModels: vi.fn(), setStandardModels: vi.fn(), setFactory: vi.fn(),
    setKalipDefs: vi.fn(), setNotes: vi.fn(), setParts: vi.fn(), setPartSales: vi.fn(), setPayments: vi.fn(),
    version, appSettings: {}, setAppSettings: vi.fn(), flash: vi.fn(),
  });
  const yedekAl = async (version) => {
    const backup = vi.fn(() => Promise.resolve(true));
    window.appMail = { getConfigForBackup: () => Promise.resolve(null), getAllLog: () => Promise.resolve([]) };
    window.crmStorage = { backup, autoBackupPasswordStatus: () => Promise.resolve({ set: false, canEncrypt: true }) };
    render(<SettingsBackup {...temel(version)} />);
    fireEvent.click(screen.getByRole("button", { name: /Yedek Al/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Şifresiz Kaydet/ }));
    await waitFor(() => expect(backup).toHaveBeenCalled());
    return backup.mock.calls[0][0];
  };
  it("AC-3: sürüm bilinmiyorken elle yedeğin damgası boş", async () => {
    expect((await yedekAl("")).version).toBe("");
  });
  it("AC-3: sürüm bilinince elle yedeğin damgası paket sürümü", async () => {
    expect((await yedekAl(PAKET)).version).toBe(PAKET);
  });
});

// ── Kullanıcı Geçmişi ────────────────────────────────────────────────────────
const SATIRLAR = [
  { id: 6, ts: "2026-10-13T10:00:00Z", actor: "ayse", action: "oturum_yenilendi", target: "ayse", ip: "10.0.0.5", detail: JSON.stringify({ istemciSurum: PAKET }) },
  { id: 5, ts: "2026-10-13T09:00:00Z", actor: "mehmet", action: "oturum_yenilendi", target: "mehmet", ip: "10.0.0.7", detail: null },
  { id: 4, ts: "2026-10-13T08:00:00Z", actor: "ayse", action: "giris_basarili", target: null, ip: "10.0.0.5", detail: JSON.stringify({ rol: "user", ikiAdimli: false, istemciSurum: ESKI }) },
  { id: 3, ts: "2026-10-13T07:00:00Z", actor: "deneme", action: "giris_basarisiz", target: null, ip: "10.0.0.9", detail: JSON.stringify({ sebep: "Yanlış şifre", istemciSurum: PAKET }) },
  { id: 2, ts: "2026-10-13T06:00:00Z", actor: "x", action: "giris_basarisiz", target: null, ip: "10.0.0.9", detail: JSON.stringify({ sebep: "Çok fazla deneme (geçici engel)" }) },
  { id: 1, ts: "2026-10-13T05:00:00Z", actor: "admin", action: "kullanici_eklendi", target: "ayse", ip: "10.0.0.2", detail: null },
];

describe("Spec 0085 C: Kullanıcı Geçmişi", () => {
  const ipcKur = () => { window.securityLog = { get: vi.fn(async () => ({ ok: true, rows: SATIRLAR, total: SATIRLAR.length })), clear: vi.fn() }; };

  it("AC-15: giriş, başarısız giriş ve oturum yenileme satırlarında sürüm; sürümsüzde \"bilinmiyor\"; diğer eylemlerde rozet yok", async () => {
    ipcKur();
    render(<SettingsSecurityLog serverPermissions={null} flash={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeTruthy());
    const rozetler = screen.getAllByTestId("istemci-surum").map(e => e.textContent);
    expect(rozetler).toEqual([`v${PAKET}`, "bilinmiyor", `v${ESKI}`, `v${PAKET}`, "bilinmiyor"]);
    const ekleme = screen.getAllByRole("row").find(tr => tr.textContent.includes("Kullanıcı Eklendi"));
    expect(within(ekleme).queryByTestId("istemci-surum")).toBeNull();
  });

  it("AC-17: başarısız giriş nedeni aynen görünür, sürüm yanında", async () => {
    ipcKur();
    render(<SettingsSecurityLog serverPermissions={null} flash={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeTruthy());
    const tablo = within(screen.getByRole("table"));
    expect(tablo.getByText("· Yanlış şifre")).toBeTruthy();
    expect(tablo.getByText("· Çok fazla deneme (geçici engel)")).toBeTruthy();
  });

  it("AC-18: Detay sütunu genel dökümünü sürdürür ve sürüm orada da görünür (kabul edilen yineleme)", async () => {
    ipcKur();
    render(<SettingsSecurityLog serverPermissions={null} flash={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeTruthy());
    expect(within(screen.getByRole("table")).getByText(`rol: user, ikiAdimli: false, istemciSurum: ${ESKI}`)).toBeTruthy();
  });

  it("AC-16: istemci PC'de (serverPermissions) HTTP ucu, sunucu PC'de IPC okunur; ikisi de sürümü gösterir", async () => {
    window.appServer = { apiRequest: vi.fn(async () => ({ ok: true, data: { rows: SATIRLAR.slice(0, 1), total: 1 } })) };
    window.securityLog = { get: vi.fn() };
    render(<SettingsSecurityLog serverPermissions={{ role: "admin" }} flash={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByTestId("istemci-surum").map(e => e.textContent)).toEqual([`v${PAKET}`]));
    expect(window.appServer.apiRequest.mock.calls[0][0].path).toMatch(/^\/api\/security-log\?/);
    expect(window.securityLog.get).not.toHaveBeenCalled();
  });

  it("AC-19: CSV'de var olan altı sütun aynı sırada, sürüm sonda", () => {
    const csv = kullaniciGecmisiCsv(SATIRLAR);
    expect(csv[0]).toEqual(["Zaman", "Yapan", "Eylem", "Hedef", "IP", "Detay", "İstemci sürümü"]);
    expect(csv.slice(1).map(r => r[6])).toEqual([`v${PAKET}`, "bilinmiyor", `v${ESKI}`, `v${PAKET}`, "bilinmiyor", ""]);
    expect(csv[4].slice(0, 6).slice(1)).toEqual(["deneme", "Giriş Başarısız · Yanlış şifre", "", "10.0.0.9", `sebep: Yanlış şifre, istemciSurum: ${PAKET}`]);
  });

  it("AC-20: eylem etiketi haritasına yeni anahtar eklenmedi", () => {
    expect(Object.keys(ACTION_LABELS)).toHaveLength(29); // taban 7768968: 29 anahtar
    expect(Object.keys(ACTION_LABELS).some(k => /surum/i.test(k))).toBe(false);
  });
});

// ── Sunucu Bağlantısı ────────────────────────────────────────────────────────
const KAYIT = [
  { id: 11, ts: "2026-10-13T10:00:00Z", actor: "ayse", action: "oturum_yenilendi", ip: "10.0.0.5", detail: JSON.stringify({ istemciSurum: PAKET }) },
  { id: 12, ts: "2026-10-13T09:00:00Z", actor: "mehmet", action: "giris_basarili", ip: "10.0.0.7", detail: JSON.stringify({ rol: "user", istemciSurum: ESKI }) },
  { id: 13, ts: "2026-10-12T09:00:00Z", actor: "servis", action: "oturum_yenilendi", ip: "10.0.0.8", detail: null },
  { id: 14, ts: "2026-10-13T11:00:00Z", actor: "admin", action: "giris_basarili", ip: "127.0.0.1", detail: JSON.stringify({ rol: "admin", ikiAdimli: false }) },
];
function sunucuKur({ isServer = true, running = true, kayit = KAYIT } = {}) {
  const apiRequest = vi.fn(async ({ path: p = "" } = {}) => ({ ok: true, status: 200, data: /2fa/.test(p) ? { enabled: false } : [] }));
  const t = {
    getConfig: async () => (isServer ? { isServer: true, running, port: 3000, ips: ["10.0.0.2"] } : { isActive: true, serverUrl: "http://10.0.0.2:3000", username: "kerem", role: "admin" }),
    getServerStatus: async () => ({ hasAdmin: true }), apiRequest,
  };
  window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  window.securityLog = { get: vi.fn(async (q) => ({ ok: true, rows: kayit.filter(r => r.action === q.action), total: 0 })) };
  return { apiRequest };
}

describe("Spec 0085 D: Bağlı bilgisayarlar kartı", () => {
  it("AC-21, AC-26, AC-27: sunucu PC'de kart; kullanıcı başına satır, en son görülen üstte; eski işaretli, bilinmeyen sayılır; sunucunun kendisi satır değil", async () => {
    sunucuKur();
    render(<SettingsServer flash={vi.fn()} version={PAKET} />);
    const kart = await screen.findByTestId("bagli-bilgisayarlar");
    await waitFor(() => expect(within(kart).getAllByTestId("bagli-bilgisayar")).toHaveLength(3));
    const satirlar = within(kart).getAllByTestId("bagli-bilgisayar");
    expect(satirlar.map(tr => [tr.cells[0].textContent, tr.dataset.durum])).toEqual([["ayse", "guncel"], ["mehmet", "eski"], ["servis", "bilinmiyor"]]);
    expect(satirlar[1].textContent).toContain(`v${ESKI}güncellenmeli`);
    expect(satirlar[2].textContent).toContain("bilinmiyor");
    expect(satirlar[1].cells[3].textContent).toBe("10.0.0.7");
    expect(within(kart).getByText(`Bağlı bilgisayarlar ve sürümleri · 2 bilgisayar güncellenmeli`)).toBeTruthy();
    expect(within(kart).getByTestId("sunucu-surumu").textContent).toBe(`Bu bilgisayar (sunucu): v${PAKET}. Bu sürümden eski istemciler işaretlenir.`);
    expect(kart.textContent).not.toContain("admin"); // P2: geri döngü satırı yok
  });

  it("AC-26: hepsi güncelse başlıkta sayı yok, kart bunu tek satırla söyler", async () => {
    sunucuKur({ kayit: KAYIT.slice(0, 1) });
    render(<SettingsServer flash={vi.fn()} version={PAKET} />);
    const kart = await screen.findByTestId("bagli-bilgisayarlar");
    await waitFor(() => expect(within(kart).getByTestId("surum-ozeti").textContent).toBe("Bütün istemciler bu bilgisayarın sürümünde ya da daha yenisinde."));
    expect(within(kart).getByText("Bağlı bilgisayarlar ve sürümleri")).toBeTruthy();
  });

  it("AC-22, AC-29 (R18, R19): son görülen ve tazelik ibaresi; kayıt yoksa boş durum, hata yok", async () => {
    sunucuKur({ kayit: [] });
    render(<SettingsServer flash={vi.fn()} version={PAKET} />);
    const kart = await screen.findByTestId("bagli-bilgisayarlar");
    await waitFor(() => expect(within(kart).getByTestId("bos-bagli-bilgisayarlar")).toBeTruthy());
    expect(kart.textContent).toContain(TAZELIK_IBARESI);
    expect(kart.textContent).toContain(PENCERE_IBARESI);
    expect(TAZELIK_IBARESI).toMatch(/son görülen/);
    expect(TAZELIK_IBARESI).toMatch(/günde bir/);
  });

  it("AC-29: okuma hatası boş durum verir, hata vermez", async () => {
    sunucuKur();
    window.securityLog = { get: vi.fn(async () => { throw new Error("db yok"); }) };
    render(<SettingsServer flash={vi.fn()} version={PAKET} />);
    const kart = await screen.findByTestId("bagli-bilgisayarlar");
    await waitFor(() => expect(within(kart).getByTestId("bos-bagli-bilgisayarlar")).toBeTruthy());
  });

  it("AC-23, AC-24: veri IPC'den iki eylem süzgeçli çağrıyla (limit 200) okunur; HTTP güvenlik ucu çağrılmaz", async () => {
    const { apiRequest } = sunucuKur();
    render(<SettingsServer flash={vi.fn()} version={PAKET} />);
    await screen.findByTestId("bagli-bilgisayarlar");
    await waitFor(() => expect(window.securityLog.get).toHaveBeenCalledTimes(2));
    expect(window.securityLog.get.mock.calls.map(c => c[0])).toEqual([
      { action: "giris_basarili", limit: 200, offset: 0 }, { action: "oturum_yenilendi", limit: 200, offset: 0 }]);
    expect(apiRequest.mock.calls.some(c => String(c[0]?.path || "").includes("security-log"))).toBe(false);
  });

  it("AC-25: version prop'u Settings'ten SettingsServer'a ulaşır (kaynak) ve karta taban olarak geçer", () => {
    const settings = fs.readFileSync(path.resolve(__dirname, "../../src/components/Settings.jsx"), "utf8");
    expect(settings).toContain("<SettingsServer flash={flash} settingsGroups={SETTINGS_GROUPS} version={version} />");
  });

  // Triyaj: sürüm bilinmezken satırlar "guncel" görünüyor, kart "karşılaştırma yapılmıyor" derken yeşil "hepsi güncel" şeridi çiziyordu.
  it("R22 (triyaj): bu bilgisayarın sürümü bilinmiyorken satırlar karşılaştırılmadı, eski işaretlenmez", async () => {
    sunucuKur();
    render(<SettingsServer flash={vi.fn()} version="" />);
    const kart = await screen.findByTestId("bagli-bilgisayarlar");
    await waitFor(() => expect(within(kart).getAllByTestId("bagli-bilgisayar")).toHaveLength(3));
    expect(within(kart).getAllByTestId("bagli-bilgisayar").map(tr => tr.dataset.durum)).toEqual(["karsilastirilmadi", "karsilastirilmadi", "bilinmiyor"]);
    expect(within(kart).getByText("Bağlı bilgisayarlar ve sürümleri · 1 bilgisayar güncellenmeli")).toBeTruthy();
    expect(within(kart).getByTestId("sunucu-surumu").textContent).toBe("Bu bilgisayarın sürümü henüz okunmadı; karşılaştırma yapılmıyor.");
  });

  it("R22 (triyaj): sürüm bilinmezken ve bütün satırların sürümü biliniyorken \"hepsi güncel\" şeridi çizilmez", async () => {
    sunucuKur({ kayit: KAYIT.slice(0, 2) });
    render(<SettingsServer flash={vi.fn()} version="" />);
    const kart = await screen.findByTestId("bagli-bilgisayarlar");
    await waitFor(() => expect(within(kart).getAllByTestId("bagli-bilgisayar")).toHaveLength(2));
    expect(within(kart).queryByTestId("surum-ozeti")).toBeNull();
    expect(kart.textContent).not.toContain("Bütün istemciler");
    expect(within(kart).getByText("Bağlı bilgisayarlar ve sürümleri")).toBeTruthy();
  });

  it("AC-28 (R17): istemci bilgisayarında ve sunucu durmuşken kart çizilmez, güvenlik geçmişi okunmaz", async () => {
    sunucuKur({ isServer: false });
    const { unmount } = render(<SettingsServer flash={vi.fn()} version={PAKET} />);
    await waitFor(() => expect(document.body.textContent).toMatch(/Sunucu|Bağlı/));
    await bekle(20);
    expect(screen.queryByTestId("bagli-bilgisayarlar")).toBeNull();
    expect(window.securityLog.get).not.toHaveBeenCalled();
    unmount();
    sunucuKur({ running: false });
    render(<SettingsServer flash={vi.fn()} version={PAKET} />);
    await screen.findByText("Sunucu Durduruldu");
    expect(screen.queryByTestId("bagli-bilgisayarlar")).toBeNull();
  });
});
