// @vitest-environment jsdom
// Spec 0086: Yedekleme ekranında seçmeli geri yüklemenin paketleri. Dokuz paketin cümlesi listeden üretilir; üç not
// (gider ayarları, Kasa'sız, makinaya özgü ayarlar) yetkiye göre çizilir; paket kimliği, sırası, varsayılan seçimi ve
// tamamlanma bildirimi değişmez. Davranış eşitliği ayrı dosyada (yedek-paketleri-0086-davranis, fikstürle).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, waitFor, within } from "@testing-library/react";
import { SettingsBackup } from "../../src/components/settings/SettingsBackup";
import { YEDEK_PAKETLERI, GIDER_AYAR_NOTU, KASASIZ_NOTU, YEREL_AYAR_NOTU, DOSYA_NOTU, MALIYET_AYAR_NOTU } from "../../src/lib/yedekPaketleri";
import { paketCumlesi } from "../../src/lib/bolumAdlari";

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appMail; });

const YEDEK = { app: "altunmak-crm", schemaVersion: 3, customers: [{ id: 1, name: "A" }], dealers: [], services: [] };
const temel = () => ({
  customers: [], services: [], dealers: [], stock: [], customModels: [], standardModels: [], factory: {}, kalipDefs: [], notes: [], parts: [],
  partSales: [], payments: [], setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(), setStock: vi.fn(), setCustomModels: vi.fn(),
  setStandardModels: vi.fn(), setFactory: vi.fn(), setKalipDefs: vi.fn(), setNotes: vi.fn(), setParts: vi.fn(), setPartSales: vi.fn(), setPayments: vi.fn(),
  version: "1.0.0", appSettings: {}, setAppSettings: vi.fn(), flash: vi.fn(),
});
const ac = async (ek = {}) => {
  const p = { ...temel(), ...ek };
  window.appMail = { getConfigForBackup: async () => null, getAllLog: async () => [] };
  window.crmStorage = { restore: async () => structuredClone(YEDEK), autoBackupPasswordStatus: async () => ({ set: false, canEncrypt: true }) };
  render(<SettingsBackup {...p} />);
  fireEvent.click(screen.getByRole("button", { name: /Yedekten Geri Yükle/ }));
  await screen.findByText(/Geri yüklenecek bölümler/);
  return p;
};
// Paket kutusu ("Geri yüklenecek bölümler"); sayfadaki diğer onay kutuları (Otomatik Yedekleme) dışarıda.
const kutu = () => screen.getByText(/Geri yüklenecek bölümler/).parentElement.parentElement;
const paketSatirlari = () => within(kutu()).getAllByRole("checkbox").map(k => k.closest("label"));

describe("Spec 0086: paket cümleleri ve notlar", () => {
  it("AC-3, AC-4, AC-8, AC-9: dokuz paketin hepsinde listeden üretilmiş parantezli cümle", async () => {
    await ac({ giderYetki: true });
    const satirlar = paketSatirlari();
    expect(satirlar.map(l => l.querySelector("span").textContent)).toEqual(YEDEK_PAKETLERI.map(p => p.ad));
    expect(satirlar.map(l => l.querySelectorAll("span")[1]?.textContent)).toEqual(YEDEK_PAKETLERI.map(p => `(${paketCumlesi(p)})`));
    const metin = (ad) => satirlar.find(l => l.querySelector("span").textContent === ad).textContent;
    expect(metin("Stok ve üretim")).toContain("yedek parça satışları");
    expect(metin("Tanımlar")).toContain("firma çalışanları");
    expect(metin("Giderler")).toContain("üretim partileri");
    expect(metin("Giderler")).toContain("kasa iş listesi (kapsam dışı)");
    expect(metin("Firma ve ayarlar")).toContain("e-posta geçmişi");
    expect(metin("Bayiler")).toBe("Bayiler(bayiler)");
    expect(metin("Notlar")).toBe("Notlar(notlar)");
    expect(metin("Evraklar")).toContain("teklifler ve proformalar");
  });

  it("AC-10, AC-11: Kasa'lı kullanıcıda gider ayarları ve makinaya özgü ayarlar notları; Kasa notu yok (AC-12)", async () => {
    await ac({ giderYetki: true, kasaVeriYetki: true });
    expect(screen.getByTestId("paket-notu-gider").textContent).toBe(`ℹ ${GIDER_AYAR_NOTU}`);
    expect(screen.getAllByTestId("paket-notu-gider")).toHaveLength(1);
    // Spec 0088 ile (AC-43/3): "Firma ve ayarlar" paketinde iki not, maliyet ayarları önce.
    expect(screen.getAllByTestId("paket-notu-ayar").map(e => e.textContent)).toEqual([`ℹ ${MALIYET_AYAR_NOTU}`, `ℹ ${YEREL_AYAR_NOTU}`]);
    expect(screen.queryByText(KASASIZ_NOTU, { exact: false })).toBeNull();
    // Triyaj bulgu 1: Dosyalar kutusu yalnız listeyi geri yükler, dosyaların kendisi yedek açılırken eklenir.
    expect(screen.getByTestId("paket-notu-dosyalar").textContent).toBe(`ℹ ${DOSYA_NOTU}`);
  });

  it("AC-12: Kasa yetkisi olmayan kullanıcıda Giderler paketinin altında Kasa notu", async () => {
    await ac({ giderYetki: true, kasaVeriYetki: false });
    expect(screen.getAllByTestId("paket-notu-gider").map(e => e.textContent)).toEqual([`ℹ ${GIDER_AYAR_NOTU}`, `ℹ ${KASASIZ_NOTU}`]);
  });

  it("AC-10: gider yetkisi olmayan kullanıcıda Giderler paketi de notları da çizilmez; makinaya özgü not durur", async () => {
    await ac({ giderYetki: false, kasaVeriYetki: false });
    expect(paketSatirlari().map(l => l.querySelector("span").textContent)).not.toContain("Giderler");
    expect(screen.queryByTestId("paket-notu-gider")).toBeNull();
    expect(screen.getAllByTestId("paket-notu-ayar")).toHaveLength(2); // spec 0088 ile
  });

  it("AC-20: kimlik, sıra, sayı aynı; hepsi seçili başlar; Tümünü Kaldır/Seç; notlar seçili kümeyi değiştirmez", async () => {
    await ac({ giderYetki: true, kasaVeriYetki: false });
    const kutular = within(kutu()).getAllByRole("checkbox");
    expect(kutular).toHaveLength(9);
    expect(kutular.every(k => k.checked)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Tümünü Kaldır" }));
    expect(within(kutu()).getAllByRole("checkbox").every(k => !k.checked)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Tümünü Seç" }));
    expect(within(kutu()).getAllByRole("checkbox").every(k => k.checked)).toBe(true);
    // Not satırı tıklanınca hiçbir kutu değişmez (not label'ın dışında).
    fireEvent.click(screen.getAllByTestId("paket-notu-gider")[1]);
    expect(within(kutu()).getAllByRole("checkbox").every(k => k.checked)).toBe(true);
  });

  it("AC-13: tam seçimde \"Yedek başarıyla yüklendi.\", kısmi seçimde seçilen paket adları", async () => {
    const p1 = await ac({ giderYetki: true });
    fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
    await waitFor(() => expect(p1.flash).toHaveBeenCalledWith("ok", "Yedek başarıyla yüklendi."));
    cleanup();
    const p2 = await ac({ giderYetki: true });
    const paketKutusu = (ad) => paketSatirlari().find(l => l.querySelector("span").textContent === ad).querySelector("input");
    for (const ad of YEDEK_PAKETLERI.map(p => p.ad)) if (!["Müşteri verileri", "Notlar"].includes(ad)) fireEvent.click(paketKutusu(ad));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
    await waitFor(() => expect(p2.flash).toHaveBeenCalledWith("ok", "Seçilen bölümler yedekten yüklendi: Müşteri verileri, Notlar."));
  });

  it("C7: var olan \"müşteriler yüklenip evraklar yüklenmezse\" notu aynen", async () => {
    await ac({ giderYetki: true });
    fireEvent.click(paketSatirlari().find(l => l.querySelector("span").textContent === "Evraklar").querySelector("input"));
    expect(screen.getByText(/Müşteriler yüklenip evraklar yüklenmezse/)).toBeTruthy();
    expect(within(paketSatirlari()[0]).getByText(/tahsilata bağlı çekler/)).toBeTruthy();
  });
});
