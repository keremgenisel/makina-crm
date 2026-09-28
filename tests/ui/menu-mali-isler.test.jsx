// @vitest-environment jsdom
// Spec 0043: kenar çubuğunda "Mali İşler" grubu (gerçek App). Sekme adları ve kimlikleri değişmez; grup yalnız çizim katmanı.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";

const perde = vi.hoisted(() => ({ indi: false }));
vi.mock("../../src/lib/yayinPerdesi", () => ({ GIDER_PERDESI: true, giderPerdesiIndi: () => perde.indi }));
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); perde.indi = false; });

const yerelBugun = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const veri = () => ({
  customers: [], payments: [], giderTurleri: [{ id: 1, ad: "Elektrik", davranis: "normal" }], tedarikciler: [],
  giderler: [{ id: 900, tarih: yerelBugun(), turId: 1, tutar: 1000, kdvOrani: 0, modelSatirlari: [], sonOdemeTarihi: yerelBugun() }],
  kasaHesaplari: [], hesapHareketleri: [], cekler: [], appSettings: { giderAyarlari: { yururlukAy: "2026-01", hatirlatmaEsikGun: 7 } }, dataVersion: 1,
});
const baslat = async (config = null) => {
  if (config) {
    const t = { getConfig: async () => config };
    window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  }
  window.crmStorage = { load: vi.fn(async () => structuredClone(veri())), save: vi.fn(async () => true), getVersion: vi.fn(async () => 1) };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
  await new Promise(r => setTimeout(r, 500));
};
const nav = () => document.querySelector("nav.sb-scroll");
const grup = () => within(nav()).queryByTestId("menu-grup-mali");
const menuAdlari = () => [...nav().querySelectorAll("button")].map(b => b.textContent.trim());
const tikla = (ad) => fireEvent.click(within(nav()).getByText(ad));
const aktif = () => nav().querySelector('[aria-current="page"]')?.textContent.trim();
const kullanici = (tabs) => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role: "user", permissions: JSON.stringify({ tabs }), username: "u" });

describe("Spec 0043: Mali İşler grubu", () => {
  it("AC-1 / AC-2 / AC-14: grup Stok ile Evrak arasında; altında Finans, Giderler, Kasa bu sırayla, adlar değişmedi", async () => {
    await baslat();
    expect(menuAdlari()).toEqual(["Anasayfa", "Müşteriler", "Bayiler", "Stok", "Mali İşler", "Finans", "Giderler", "Kasa",
      "Evrak Yönetimi", "Notlar", "Servis ve Kargo Panosu", "Faaliyet Haritası", "Analiz", "Ayarlar"]);
    const liste = within(nav()).getByRole("group", { name: "Mali İşler" });
    expect([...liste.querySelectorAll("button")].map(b => b.textContent.trim())).toEqual(["Finans", "Giderler", "Kasa"]);
  });
  it("AC-3 / AC-6 / AC-11: başlık açar kapar, ekran açmaz; açık/kapalı bilgisini taşır", async () => {
    await baslat();
    expect(grup().getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(grup());
    expect(grup().getAttribute("aria-expanded")).toBe("false");
    expect(menuAdlari()).not.toContain("Finans");
    expect(menuAdlari()).toHaveLength(11); // R1 revizyonu: 13 → 11
    expect(aktif()).toBe("Anasayfa"); // AC-6
    fireEvent.click(grup());
    expect(menuAdlari()).toContain("Kasa");
    expect(grup().tagName).toBe("BUTTON"); // AC-11: klavyeyle odaklanır, Enter/Boşluk tıklamayı tetikler
    expect(grup().getAttribute("aria-controls")).toBe("menu-grup-mali-liste");
  });
  it("AC-5: grup kapalıyken içindeki ekran açıksa başlık etkin görünür", async () => {
    await baslat();
    tikla("Kasa");
    expect(aktif()).toBe("Kasa");
    expect(grup().style.fontWeight).toBe("600");
    fireEvent.click(grup());
    expect(grup().style.fontWeight).toBe("700");
    expect(grup().style.borderLeft).toMatch(/3px solid/);
    expect(grup().style.borderLeft).not.toMatch(/transparent/);
  });
  it("AC-7: grubun durumu uygulama yeniden açıldığında korunur", async () => {
    await baslat();
    fireEvent.click(grup());
    expect(localStorage.getItem("maliIslerAcik")).toBe("0");
    cleanup();
    await baslat();
    expect(grup().getAttribute("aria-expanded")).toBe("false");
  });
  it("AC-4: grup kapalıyken gruptaki bir ekrana (Anasayfa'dan Giderler'e) geçilince grup açılır", async () => {
    localStorage.setItem("maliIslerAcik", "0");
    await baslat();
    expect(grup().getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(screen.getByTestId("odeme-hatirlatma-karti"));
    fireEvent.click(await screen.findByText("Giderlerde Görüntüle"));
    await waitFor(() => expect(grup().getAttribute("aria-expanded")).toBe("true"));
    expect(aktif()).toBe("Giderler");
  });
  it("AC-8: gider yetkisi olmayan kullanıcıda grup yok, Finans düz satır", async () => {
    await baslat(kullanici(["dashboard", "customers", "finance"]));
    expect(grup()).toBeNull();
    expect(menuAdlari()).toEqual(["Anasayfa", "Müşteriler", "Finans"]);
  });
  it("AC-9: yayın perdesi inikken Kasa grupta yok; grup Finans ve Giderler ile çizilir", async () => {
    perde.indi = true;
    await baslat();
    const liste = within(nav()).getByRole("group", { name: "Mali İşler" });
    expect([...liste.querySelectorAll("button")].map(b => b.textContent.trim())).toEqual(["Finans", "Giderler"]);
  });
  it("AC-10: dar kipte grup başlığı çizilmez, üç ekran düz ikon", async () => {
    localStorage.setItem("sidebarDar", "1");
    await baslat();
    expect(grup()).toBeNull();
    const basliklar = [...nav().querySelectorAll("button")].map(b => b.getAttribute("title"));
    expect(basliklar.slice(3, 8)).toEqual(["Stok", "Finans", "Giderler", "Kasa", "Evrak Yönetimi"]);
  });
  it("AC-12: Notlar'da kaydedilmemiş taslak varken gruptaki ekrana geçmek onay ister", async () => {
    await baslat();
    tikla("Notlar");
    fireEvent.click(await screen.findByText("Yeni Not"));
    fireEvent.change(document.querySelector("textarea"), { target: { value: "kaydedilmemiş taslak" } });
    tikla("Giderler");
    expect(aktif()).toBe("Notlar");
    expect(await screen.findByText("Kaydedilmemiş Değişiklikler")).toBeTruthy();
    fireEvent.click(screen.getByText("Kaydetmeden Devam Et"));
    expect(aktif()).toBe("Giderler");
  });
  it("AC-13: kiosk kullanıcısı kenar çubuğunu hiç görmez", async () => {
    await baslat(kullanici(["servis"]));
    expect(nav()).toBeNull();
  });
  it("AC-15: gruptaki ekranlar mevcut kimlikleriyle açılır (tıklanan satır o ekranı açar)", async () => {
    await baslat();
    tikla("Finans");
    expect(aktif()).toBe("Finans");
    tikla("Giderler");
    expect(aktif()).toBe("Giderler");
  });
});
