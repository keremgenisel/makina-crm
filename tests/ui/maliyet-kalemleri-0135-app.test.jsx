// @vitest-environment jsdom
// Spec 0135 gerçek App: kalem listesi App → Ayarlar, App → Makina Maliyeti (Model Maliyetleri, Sipariş İhtiyacı) ve App'in kayıt ve
// otuz günlük temizlik hattına bağlı. Dokunulmamış eski parçanın kaydedilen gövdesi değişmez (R26), karttan dokunularak kaydedilen
// parçada kalem alanı yazılır ve eski alanlar kalkar (R25); temizlik ikinci kalemde geçen malzemeyi ve tedarikçiyi korur (C5).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { KALEMDE_MALZEME_NEDENI } from "../../src/lib/malzeme";
import { KALEMDE_TEDARIKCI_NEDENI } from "../../src/lib/gider";
import { MALZEME_KALEMI_YOK_METNI } from "../../src/components/stock/SiparisPenceresi"; // spec 0140 ile: ekran pencereye taşındı

afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete window.crmStorage; delete window.appServer; });
const { default: App } = await import("../../src/App");

const ESKI = new Date(Date.now() - 60 * 86400000).toISOString();
const SACK = (malzemeId) => ({ tur: "malzeme", malzemeId, bicim: "sac", kalinlik: 3, en: 200, boy: 300, adet: 1 });
const veri = () => ({
  malzemeler: [
    { id: 501, ad: "304 Paslanmaz", ozgulAgirlik: 7.9, kiloFiyati: 2.95, paraBirimi: "USD", kur: 50 },
    { id: 502, ad: "DKP Sac", ozgulAgirlik: 7.85, kiloFiyati: 38 },
    { id: 503, ad: "Eski sac", ozgulAgirlik: 7.85, kiloFiyati: 30, deletedAt: ESKI },
    { id: 504, ad: "Kullanılmayan", deletedAt: ESKI },
  ],
  tedarikciler: [{ id: 31, ad: "Lazer Ltd." }, { id: 32, ad: "Eski kaplamacı", deletedAt: ESKI }, { id: 33, ad: "Boştaki", deletedAt: ESKI }],
  parts: [
    { id: 41, ad: "Kesme mili", models: [], maliyet: 12, malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 140, boy: 78, payCap: 4, payBoy: 5, fire: 8 } },
    { id: 44, ad: "Gövde", models: [], maliyetKalemleri: [SACK(502), SACK(503), { tur: "islem", ad: "Lazer", tedarikciId: 31, tutar: 50 }, { tur: "islem", ad: "Kaplama", tedarikciId: 32, tutar: 20 }] },
    { id: 45, ad: "Kaplamalı pim", models: [], maliyetKalemleri: [{ tur: "islem", ad: "Kaplama", tutar: 40 }] },
  ],
  standardModels: [{ model: "AK100", defaultParcalar: [{ partId: "45", ad: "Kaplamalı pim", miktar: 2 }] }],
  giderTurleri: [], giderler: [], giderTanimlari: [], hesapHareketleri: [], kasaHesaplari: [], cekler: [],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01" } }, dataVersion: 1,
});
const baslat = async () => {
  const kayitlar = [];
  window.crmStorage = { load: vi.fn(async () => structuredClone(veri())), save: vi.fn(async (b) => { kayitlar.push(structuredClone(b)); return true; }), getVersion: vi.fn(async () => 1) };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
  return { kayitlar };
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const ayarlar = async (grup, panel) => {
  menu("Ayarlar");
  fireEvent.click(screen.getAllByText(grup).filter(e => !e.closest("nav"))[0]);
  fireEvent.click(screen.getAllByText(panel).pop());
};
const duzenle = async (ad) => fireEvent.click(within((await screen.findByText(ad)).closest("tr")).getByTitle("Düzenle"));
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /^Kaydet$/ }));
const sonParca = (kayitlar, id, kosul) => kayitlar.map(k => k.parts?.find(p => p.id === id)).filter(p => p && kosul(p)).pop();

describe("Spec 0135 gerçek App", () => {
  it("AC-60 / C5: otuz günlük temizlik ikinci kalemde geçen malzemeyi ve tedarikçiyi korur (satırda neden), kullanılmayanları siler", async () => {
    await baslat();
    await ayarlar("Veri Yönetimi", "Çöp Kutusu");
    expect(within((await screen.findByText("Eski sac")).closest("tr")).getByTestId("cop-neden").textContent).toBe(KALEMDE_MALZEME_NEDENI);
    expect(within(screen.getByText("Eski kaplamacı").closest("tr")).getByTestId("cop-neden").textContent.startsWith(KALEMDE_TEDARIKCI_NEDENI)).toBe(true); // spec 0140 ile (AC-61): cümlenin arkasında parça adları
    expect(screen.queryByText("Kullanılmayan")).toBeNull();
    expect(screen.queryByText("Boştaki")).toBeNull();
  });
  it("AC-47 / AC-94 (App gövdesi): eski malzeme satırlı parçanın yalnız adı değişince kaydedilen gövdede malzemeSatiri ve elle maliyet aynen", async () => {
    const { kayitlar } = await baslat();
    await ayarlar("Katalog", "Parça/Yedek Parça");
    await duzenle("Kesme mili");
    fireEvent.change(screen.getByPlaceholderText("Örn: Kesme Bıçağı Seti"), { target: { value: "Kesme mili B" } });
    kaydet();
    await waitFor(() => expect(sonParca(kayitlar, 41, p => p.ad === "Kesme mili B")).toBeTruthy());
    const p = sonParca(kayitlar, 41, x => x.ad === "Kesme mili B");
    // Spec 0141 ile (A-R1/3, AC-63): eski satırın işleme payı dokunulmamış kayıtta ölçüye katlanır; elle maliyet aynen.
    expect(p).toEqual({ ...veri().parts[0], ad: "Kesme mili B", malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 144, boy: 83, fire: 8 } });
  });
  it("AC-45 / AC-95 / AC-97 (App gövdesi): kalem alanına dokunulunca gövdede maliyetKalemleri, eski iki alan ve elle maliyet yok", async () => {
    const { kayitlar } = await baslat();
    await ayarlar("Katalog", "Parça/Yedek Parça");
    await duzenle("Kesme mili");
    fireEvent.change(screen.getByLabelText("Malzeme adedi 1"), { target: { value: "2" } });
    kaydet();
    await waitFor(() => expect(sonParca(kayitlar, 41, p => !!p.maliyetKalemleri)).toBeTruthy());
    const p = sonParca(kayitlar, 41, x => !!x.maliyetKalemleri);
    expect(p.maliyetKalemleri).toEqual([{ tur: "malzeme", malzemeId: 501, bicim: "mil", cap: 144, boy: 83, fire: 8, adet: 2 }]); // spec 0141 ile katlandı
    for (const a of ["malzemeSatiri", "hammaddeler", "maliyet"]) expect(p).not.toHaveProperty(a);
  });
  it("AC-109 / AC-56 (ekran): yalnız işlem kalemli parça Sipariş İhtiyacı'nda 'malzeme kalemi yok' sayacına girer; malzeme tablosu boş durumu kalem dilinde", async () => {
    await baslat();
    // Spec 0140 ile (B-R6): sipariş listesi Stok › Parça/Yedek Parça Stoğu'ndaki pencereden açılır.
    menu("Stok");
    fireEvent.click(screen.getByRole("tab", { name: "Parça/Yedek Parça Stoğu" }));
    fireEvent.click(screen.getByTestId("siparis-listesi-dugmesi"));
    fireEvent.click(screen.getByRole("button", { name: /Model Satırı Ekle/ }));
    fireEvent.change(screen.getByLabelText("Model 1"), { target: { value: "AK100" } });
    fireEvent.change(screen.getByLabelText("Makina adedi 1"), { target: { value: "5" } });
    expect(screen.getByTestId("siparis-hazir").textContent).toContain("1 parçada malzeme kalemi yok");
    expect(screen.getByTestId("siparis-malzeme-yok").textContent).toBe(MALZEME_KALEMI_YOK_METNI);
    fireEvent.click(screen.getByRole("button", { name: /^Parça ihtiyacı/ })); // spec 0140 C-R10: katlanabilir bölüm
    expect(screen.getAllByTestId("siparis-parca-satiri").some(r => r.textContent.includes("Kaplamalı pim"))).toBe(true);
  });
});
