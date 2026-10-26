// @vitest-environment jsdom
// Spec 0112: bağlı bilgisayarlar kartı silinmiş kullanıcıyı listelemez. Gerçek SettingsServer (kart ve Kullanıcı Yönetimi
// yan yana, R11 tazeleme sinyali) ve köprüsüz hâller için kartın kendisi. Saf özet tests/bagli-bilgisayarlar-0112.test.js'te.
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, within, fireEvent, act } from "@testing-library/react";
import { SettingsServer } from "../../src/components/settings/SettingsServer";
import {
  BagliBilgisayarlar, TAZELIK_IBARESI, PENCERE_IBARESI, KALDIRMA_IBARESI, SUZME_YAPILAMADI_IBARESI, BOS_METNI,
} from "../../src/components/settings/BagliBilgisayarlar";

afterEach(() => { cleanup(); delete window.appServer; delete window.securityLog; });

const SURUM = "9.5.0";
const kayit = (id, actor, ts, surum, action = "giris_basarili", ip = `10.0.0.${id}`) =>
  ({ id, ts, actor, action, ip, detail: JSON.stringify(surum ? { istemciSurum: surum } : {}) });
const KAYIT = [
  kayit(5, "ayse", "2026-10-26T10:00:00Z", SURUM),
  kayit(7, "mehmet", "2026-10-26T09:00:00Z", "9.4.0", "oturum_yenilendi"),
  kayit(8, "servis", "2026-10-26T08:00:00Z", SURUM),
];
const kullanici = (id, username, o = {}) => ({ id, username, role: "user", is_active: 1, totp_enabled: 0, permissions: null, ...o });
const HEPSI = [kullanici(1, "admin", { role: "admin" }), kullanici(2, "ayse"), kullanici(3, "mehmet"), kullanici(4, "servis")];

// apiRequest: /api/users GET liste (ya da verilen davranış), DELETE listeden siler; diğer yollar boş.
function kur({ kullanicilar = HEPSI, liste = null, kayitlar = KAYIT, running = true } = {}) {
  let users = [...kullanicilar];
  const apiRequest = vi.fn(async ({ method = "GET", path: p = "" } = {}) => {
    if (p === "/api/users" && method === "GET") return liste ? liste() : { ok: true, status: 200, data: users };
    const sil = /^\/api\/users\/(\d+)$/.exec(p);
    if (sil && method === "DELETE") { users = users.filter(u => u.id !== Number(sil[1])); return { ok: true, status: 200, data: { ok: true } }; }
    return { ok: true, status: 200, data: /2fa/.test(p) ? { enabled: false } : [] };
  });
  const t = { getConfig: async () => ({ isServer: true, running, port: 3000, ips: ["10.0.0.2"] }), getServerStatus: async () => ({ hasAdmin: true }), apiRequest };
  window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  window.securityLog = { get: vi.fn(async (q) => ({ ok: true, rows: kayitlar.filter(r => r.action === q.action), total: 0 })) };
  return { apiRequest };
}
const kartAc = async (version = SURUM) => { render(<SettingsServer flash={vi.fn()} version={version} />); return screen.findByTestId("bagli-bilgisayarlar"); };
// Hata yolları kullanıcı listesi ucunun cevabını bozar; Kullanıcı Yönetimi de aynı ucu okuduğu için kart tek başına çizilir.
const yalnizKart = async () => { render(<BagliBilgisayarlar version={SURUM} />); return screen.findByTestId("bagli-bilgisayarlar"); };
const satirAdlari = (kart) => within(kart).queryAllByTestId("bagli-bilgisayar").map(tr => tr.cells[0].textContent);
const kullaniciGetSayisi = (api) => api.mock.calls.filter(c => c[0]?.path === "/api/users" && (c[0]?.method || "GET") === "GET").length;

describe("Spec 0112: süzme", () => {
  it("AC-1: üç kullanıcı da listedeyse üç satır (bugünkü davranış)", async () => {
    kur();
    const kart = await kartAc();
    await waitFor(() => expect(satirAdlari(kart)).toEqual(["ayse", "mehmet", "servis"]));
  });
  it("AC-2 / AC-3 / AC-27: silinmiş kullanıcının satırı ve adı yok; güncellenmeli sayısı onu saymaz, başlık 0085 metniyle", async () => {
    kur({ kullanicilar: HEPSI.filter(u => u.username !== "mehmet") });
    const kart = await kartAc();
    await waitFor(() => expect(satirAdlari(kart)).toEqual(["ayse", "servis"]));
    expect(kart.textContent).not.toContain("mehmet");
    expect(kart.textContent).not.toMatch(/güncellenmeli/);
    expect(kart.textContent).toContain("Bağlı bilgisayarlar ve sürümleri");
  });
  it("AC-27: süzmeden sonra kalan eski satır başlıkta ve şeritte 0085 metniyle sayılır", async () => {
    kur({ kullanicilar: HEPSI.filter(u => u.username !== "servis") });
    const kart = await kartAc();
    await waitFor(() => expect(satirAdlari(kart)).toEqual(["ayse", "mehmet"]));
    expect(kart.textContent).toContain("Bağlı bilgisayarlar ve sürümleri · 1 bilgisayar güncellenmeli");
    expect(within(kart).getByTestId("surum-ozeti").textContent).toBe("1 bilgisayar güncellenmeli: sürümü bu bilgisayardan eski ya da bilinmiyor.");
  });
  it("AC-4: süzmeden sonra hepsi güncelse başarı şeridi", async () => {
    kur({ kullanicilar: HEPSI.filter(u => u.username !== "mehmet") });
    const kart = await kartAc();
    await waitFor(() => expect(within(kart).getByTestId("surum-ozeti").textContent).toBe("Bütün istemciler bu bilgisayarın sürümünde ya da daha yenisinde."));
  });
  it("AC-5 / AC-24: pasif kullanıcının satırı çizilir ve ek işaret taşımaz", async () => {
    kur({ kullanicilar: HEPSI.map(u => (u.username === "servis" ? { ...u, is_active: 0 } : u)) });
    const kart = await kartAc();
    await waitFor(() => expect(satirAdlari(kart)).toEqual(["ayse", "mehmet", "servis"]));
    expect(kart.textContent.toLocaleLowerCase("tr")).not.toContain("pasif");
  });
  it("AC-9 (R7/2): bütün kullanıcılar silinmişse tek boş durum kutusu, metin üç nedeni sayar", async () => {
    kur({ kullanicilar: [kullanici(1, "admin", { role: "admin" })] });
    const kart = await kartAc();
    await waitFor(() => expect(within(kart).getByTestId("bos-bagli-bilgisayarlar")).toBeTruthy());
    expect(within(kart).getAllByTestId("bos-bagli-bilgisayarlar")).toHaveLength(1);
    expect(within(kart).getByTestId("bos-bagli-bilgisayarlar").textContent).toContain(BOS_METNI);
    expect(BOS_METNI).toMatch(/giriş yapmadı/);
    expect(BOS_METNI).toMatch(/geçmişi temizlendi/);
    expect(BOS_METNI).toMatch(/hepsi silindi/);
  });
  it("AC-17: sürüm okunamamışken satırlar karşılaştırılmadı kalır, süzme bunu değiştirmez", async () => {
    kur({ kullanicilar: HEPSI.filter(u => u.username !== "mehmet") });
    const kart = await kartAc("");
    await waitFor(() => expect(satirAdlari(kart)).toEqual(["ayse", "servis"]));
    expect(within(kart).getAllByTestId("bagli-bilgisayar").map(tr => tr.dataset.durum)).toEqual(["karsilastirilmadi", "karsilastirilmadi"]);
  });
});

describe("Spec 0112: liste okunamadığında güvenli açık (R3)", () => {
  const ibareVar = (kart) => !!within(kart).queryByTestId("suzme-yapilamadi");
  it("AC-6 / AC-20: dört hata yolu bütün satırları çizer ve aynı tek ibareye düşer; sebep metni yazılmaz", async () => {
    const yollar = [
      () => ({ error: "Sunucuya bağlı değil" }),
      () => ({ error: "Oturum süresi doldu", status: 401 }),
      () => ({ error: "Çok fazla istek", status: 429 }),
      () => { throw new Error("ağ koptu"); },
    ];
    for (const liste of yollar) {
      kur({ kullanicilar: HEPSI.filter(u => u.username !== "mehmet"), liste });
      const kart = await yalnizKart();
      await waitFor(() => expect(ibareVar(kart)).toBe(true));
      expect(satirAdlari(kart)).toEqual(["ayse", "mehmet", "servis"]);
      expect(within(kart).getByTestId("suzme-yapilamadi").textContent).toBe(SUZME_YAPILAMADI_IBARESI);
      expect(kart.textContent).not.toMatch(/Sunucuya bağlı değil|Oturum süresi|Çok fazla istek|ağ koptu|401|429/);
      cleanup();
    }
  });
  it("AC-7 (Karar 8): boş liste ve dizi olmayan cevap süzmez, aynı ibareyi taşır", async () => {
    for (const liste of [() => ({ ok: true, status: 200, data: [] }), () => ({ ok: true, status: 200, data: { hata: 1 } }), () => undefined]) {
      kur({ liste });
      const kart = await yalnizKart();
      await waitFor(() => expect(ibareVar(kart)).toBe(true));
      expect(satirAdlari(kart)).toEqual(["ayse", "mehmet", "servis"]);
      cleanup();
    }
  });
  it("AC-8 (R3/2, C5): liste gelmeden satırlar çizilir, ibare yok; gelince süzülür", async () => {
    let coz;
    const bekleyen = new Promise(r => { coz = r; });
    kur({ liste: () => bekleyen });
    const kart = await yalnizKart();
    await waitFor(() => expect(satirAdlari(kart)).toEqual(["ayse", "mehmet", "servis"]));
    expect(ibareVar(kart)).toBe(false);
    await act(async () => { coz({ ok: true, status: 200, data: HEPSI.filter(u => u.username !== "ayse") }); });
    await waitFor(() => expect(satirAdlari(kart)).toEqual(["mehmet", "servis"]));
    expect(ibareVar(kart)).toBe(false);
  });
  it("AC-19 (R3/3): köprü ya da apiRequest yoksa kart hata vermez, süzmesiz ve ibaresiz çizilir", async () => {
    for (const kopru of [undefined, {}]) {
      if (kopru === undefined) delete window.appServer; else window.appServer = kopru;
      window.securityLog = { get: vi.fn(async (q) => ({ ok: true, rows: KAYIT.filter(r => r.action === q.action), total: 0 })) };
      render(<BagliBilgisayarlar version={SURUM} />);
      const kart = await screen.findByTestId("bagli-bilgisayarlar");
      await waitFor(() => expect(satirAdlari(kart)).toEqual(["ayse", "mehmet", "servis"]));
      expect(ibareVar(kart)).toBe(false);
      cleanup();
    }
  });
});

describe("Spec 0112: Kullanıcı Yönetimi'nden silme ve tazeleme (R11)", () => {
  it("AC-15: kullanıcı silinince satır aynı ekranda kaybolur; kart listeyi yeniden okur, güvenlik geçmişine dokunulmaz", async () => {
    const { apiRequest } = kur();
    const kart = await kartAc();
    await waitFor(() => expect(satirAdlari(kart)).toEqual(["ayse", "mehmet", "servis"]));
    const okumaOnce = window.securityLog.get.mock.calls.length;
    const satir = (await screen.findAllByText("mehmet")).map(el => el.closest("tr")).find(tr => tr && within(tr).queryByText("Sil"));
    fireEvent.click(within(satir).getByText("Sil"));
    fireEvent.click(await screen.findByText("Evet, Sil"));
    await waitFor(() => expect(satirAdlari(kart)).toEqual(["ayse", "servis"]));
    expect(apiRequest.mock.calls.some(c => c[0]?.method === "DELETE" && c[0]?.path === "/api/users/3")).toBe(true);
    expect(window.securityLog.get.mock.calls.length).toBe(okumaOnce); // güvenlik geçmişi yeniden okunmaz, silinmez
    expect(window.securityLog.clear).toBeUndefined();
  });
  it("AC-23 (R10/3): istek sayısı ilk çizim + her başarılı yükleme başına bir; yoklama yok", async () => {
    const { apiRequest } = kur();
    const kart = await kartAc();
    await waitFor(() => expect(satirAdlari(kart)).toEqual(["ayse", "mehmet", "servis"]));
    // Açılış: Kullanıcı Yönetimi 1 yükleme, kart 1 ilk okuma + 1 sinyal okuması.
    await waitFor(() => expect(kullaniciGetSayisi(apiRequest)).toBe(3));
    await new Promise(r => setTimeout(r, 80));
    expect(kullaniciGetSayisi(apiRequest)).toBe(3);
    const satir = (await screen.findAllByText("servis")).map(el => el.closest("tr")).find(tr => tr && within(tr).queryByText("Sil"));
    fireEvent.click(within(satir).getByText("Sil"));
    fireEvent.click(await screen.findByText("Evet, Sil"));
    await waitFor(() => expect(satirAdlari(kart)).toEqual(["ayse", "mehmet"]));
    expect(kullaniciGetSayisi(apiRequest)).toBe(5); // silmeden sonra yükleme + kart okuması
  });
});

describe("Spec 0112: kartın metinleri", () => {
  it("AC-14 / AC-25 (R6/2, C4): kaldırma cümlesi görünür ve pencere cümlesinden önce; eski iki sabit birebir; kartta düğme yok", async () => {
    kur();
    const kart = await kartAc();
    await waitFor(() => expect(satirAdlari(kart)).toHaveLength(3));
    expect(within(kart).getByTestId("kaldirma-ibaresi").textContent).toBe(KALDIRMA_IBARESI);
    expect(KALDIRMA_IBARESI).toMatch(/Kullanıcı Yönetimi'nden silin/);
    const metin = kart.textContent;
    expect(metin.indexOf(TAZELIK_IBARESI)).toBeLessThan(metin.indexOf(KALDIRMA_IBARESI));
    expect(metin.indexOf(KALDIRMA_IBARESI)).toBeLessThan(metin.indexOf(PENCERE_IBARESI));
    expect(TAZELIK_IBARESI).toBe("Bu liste canlı bağlantı değil, son görülen bilgisidir: her istemci uygulama açıldığında ve açık kaldıkça günde bir kez sunucuya sürümünü bildirir.");
    expect(PENCERE_IBARESI).toBe("Son 200 giriş ve 200 oturum yenileme kaydına bakılır; daha önce görülmüş ya da geçmişi temizlenmiş kullanıcı listede yer almaz.");
    expect(within(kart).queryAllByRole("button")).toHaveLength(0);
  });
  it("AC-16: sunucu durmuşken kart çizilmez ve kullanıcı listesi kart için okunmaz", async () => {
    kur({ running: false });
    render(<SettingsServer flash={vi.fn()} version={SURUM} />);
    await waitFor(() => expect(document.body.textContent).toMatch(/Sunucu/));
    expect(screen.queryByTestId("bagli-bilgisayarlar")).toBeNull();
  });
});

// Triyaj 2026-10-26: yeniden okumanın iki kuralı (Karar 13). Kart tek başına; tazeleme sinyali `tazele` prop'uyla verilir,
// her okumanın cevabı ayrı ayrı elle çözülür.
describe("Spec 0112 triyaj: yeniden okuma (Karar 13)", () => {
  const kurElle = () => {
    const bekleyenler = [];
    window.appServer = { apiRequest: vi.fn(() => new Promise(r => bekleyenler.push(r))) };
    window.securityLog = { get: vi.fn(async (q) => ({ ok: true, rows: KAYIT.filter(r => r.action === q.action), total: 0 })) };
    return bekleyenler;
  };
  const cevap = (adlar) => ({ ok: true, status: 200, data: adlar.map((a, i) => kullanici(i + 1, a)) });
  it("Karar 13: yeniden okuma yoldayken önceki süzme durumu ekranda kalır (bekleme durumuna dönülmez)", async () => {
    const b = kurElle();
    const { rerender } = render(<BagliBilgisayarlar version={SURUM} tazele={0} />);
    const kart = await screen.findByTestId("bagli-bilgisayarlar");
    await waitFor(() => expect(b).toHaveLength(1));
    await act(async () => { b[0](cevap(["ayse", "servis"])); });
    await waitFor(() => expect(satirAdlari(kart)).toEqual(["ayse", "servis"]));
    rerender(<BagliBilgisayarlar version={SURUM} tazele={1} />);
    await waitFor(() => expect(b).toHaveLength(2));
    // İkinci cevap henüz gelmedi: silinmiş mehmet geri görünmez.
    expect(satirAdlari(kart)).toEqual(["ayse", "servis"]);
    await act(async () => { b[1](cevap(["ayse"])); });
    await waitFor(() => expect(satirAdlari(kart)).toEqual(["ayse"]));
  });
  it("Karar 13: iki okumanın cevabı ters sırayla dönerse son sinyalin cevabı kazanır (eski cevap atılır)", async () => {
    const b = kurElle();
    const { rerender } = render(<BagliBilgisayarlar version={SURUM} tazele={0} />);
    const kart = await screen.findByTestId("bagli-bilgisayarlar");
    await waitFor(() => expect(b).toHaveLength(1));
    rerender(<BagliBilgisayarlar version={SURUM} tazele={1} />);
    await waitFor(() => expect(b).toHaveLength(2));
    await act(async () => { b[1](cevap(["ayse", "servis"])); }); // silmeden sonraki okuma önce döner
    await waitFor(() => expect(satirAdlari(kart)).toEqual(["ayse", "servis"]));
    await act(async () => { b[0](cevap(["ayse", "mehmet", "servis"])); }); // açılıştaki yavaş okuma sonra
    await new Promise(r => setTimeout(r, 20));
    expect(satirAdlari(kart)).toEqual(["ayse", "servis"]);
  });
});
