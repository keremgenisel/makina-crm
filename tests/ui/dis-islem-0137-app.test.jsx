// @vitest-environment jsdom
// Spec 0137 gerçek App: dış işlem kataloğu App → Ayarlar, App → Makina Maliyeti, App → Giderler (Tedarikler) hattına bağlı. İşlem zammı
// Model Maliyetleri'nde ve maliyete bağlı satış fiyatında ekranda okunur (AC-64, AC-65), kayıt gövdesi bölümü taşır (AC-68–AC-70,
// AC-85), otuz günlük temizlik kullanılan işlemi ve katalog işleminin tedarikçisini korur (AC-58, AC-131), Tedarikler ekranı katalog
// işlemini sayar (Karar 33). Sürüm sabit değil (0085 kuralı).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { KALEMDE_ISLEM_NEDENI } from "../../src/lib/disIslem";
import { KALEMDE_VE_KATALOGDA_TEDARIKCI_NEDENI } from "../../src/lib/gider";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete window.crmStorage; delete window.appServer; });
const { default: App } = await import("../../src/App");

const ESKI = new Date(Date.now() - 60 * 86400000).toISOString();
const veri = (o = {}) => ({
  disIslemler: [
    { id: 701, ad: "Isıl İşlem", birim: "adet", birimFiyati: 20, tedarikciId: 91 },
    { id: 702, ad: "Eski galvano", birim: "kilo", birimFiyati: 30, deletedAt: ESKI },
    { id: 703, ad: "Kullanılmayan işlem", birim: "adet", deletedAt: ESKI },
  ],
  tedarikciler: [{ id: 91, ad: "Mahir Isıl İşlem", deletedAt: ESKI }, { id: 92, ad: "Kimsesiz", deletedAt: ESKI }],
  parts: [
    { id: 41, ad: "Pim", models: [], fiyatKipi: "maliyet", karKati: 2, maliyetKalemleri: [{ tur: "islem", islemId: 701, miktar: 3 }] },
    { id: 42, ad: "Çöpteki burç", models: [], deletedAt: new Date().toISOString(), maliyetKalemleri: [{ tur: "islem", islemId: 702, miktar: 1 }] },
  ],
  standardModels: [{ model: "AK100", defaultParcalar: [{ partId: "41", ad: "Pim", miktar: 2 }] }],
  giderTurleri: [], giderler: [], giderTanimlari: [], hesapHareketleri: [], kasaHesaplari: [], cekler: [],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01" }, fiyatAyarlari: { varsayilanKat: 2 } }, dataVersion: 1, ...o,
});
const baslat = async (o) => {
  const kayitlar = [];
  window.crmStorage = { load: vi.fn(async () => structuredClone(veri(o))), save: vi.fn(async (b) => { kayitlar.push(structuredClone(b)); return true; }), getVersion: vi.fn(async () => 1) };
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
const direkt = () => within(screen.getByTestId("model-satiri-AK100")).getAllByRole("cell")[2].textContent;

describe("Spec 0137 gerçek App", () => {
  it("AC-64 / AC-65 / R35: işlem zammı Model Maliyetleri'nde ve maliyete bağlı satış fiyatında ekranda okunur; parçaya dokunulmaz", async () => {
    const { kayitlar } = await baslat();
    menu("Makina Maliyeti");
    expect(direkt()).toBe("120,00 ₺"); // 2 × (3 × 20)
    await ayarlar("Katalog", "Parça/Yedek Parça");
    const pim = () => screen.getByText("Pim").closest("tr");
    expect(pim().textContent).toContain("120"); // türetilmiş TL fiyatı: 60 × 2
    menu("Makina Maliyeti"); // Ayarlar'ın açık grubu ikinci tıklamada kapanmasın
    await ayarlar("Katalog", "Dış İşlemler");
    const satir = (await screen.findAllByTestId("dis-islem-satiri")).find(r => r.textContent.includes("Isıl İşlem"));
    fireEvent.click(within(satir).getByRole("button", { name: "Fiyatı Güncelle" }));
    fireEvent.change(screen.getByLabelText("Birim fiyatı"), { target: { value: "25" } });
    expect(screen.getByTestId("fiyat-etki-satis").textContent).toBe("1 parçanın satış fiyatı değişecek.");
    fireEvent.click(screen.getByRole("button", { name: "Fiyatı Kaydet" }));
    menu("Makina Maliyeti");
    expect(direkt()).toBe("150,00 ₺");
    await ayarlar("Katalog", "Parça/Yedek Parça");
    expect(pim().textContent).toContain("150"); // 75 × 2
    await waitFor(() => expect(kayitlar.some(k => k.disIslemler?.find(m => m.id === 701)?.birimFiyati === 25)).toBe(true));
    const son = kayitlar.filter(k => k.disIslemler?.find(m => m.id === 701)?.birimFiyati === 25).pop();
    expect(son.parts.find(p => p.id === 41)).toEqual(veri().parts[0]);
  });
  it("AC-58 / AC-131 (App): otuz günlük temizlik çöpteki parçada geçen işlemi ve katalog işleminin tedarikçisini korur, kullanılmayanları siler", async () => {
    await baslat();
    await ayarlar("Veri Yönetimi", "Çöp Kutusu");
    const islem = (await screen.findByText("Eski galvano · kilo")).closest("tr");
    expect(within(islem).getByTestId("cop-neden").textContent).toBe(KALEMDE_ISLEM_NEDENI);
    expect(screen.queryByText(/Kullanılmayan işlem/)).toBeNull();
    const ted = screen.getByText("Mahir Isıl İşlem").closest("tr");
    expect(within(ted).getByTestId("cop-neden").textContent).toBe(KALEMDE_VE_KATALOGDA_TEDARIKCI_NEDENI);
    expect(screen.queryByText("Kimsesiz")).toBeNull();
  });
  it("AC-68 / AC-69 / AC-85 (gövde): panelden eklenen işlem kayıt gövdesinde R27 alanlarıyla; girilmemiş alan anahtar olarak yok", async () => {
    const { kayitlar } = await baslat();
    await ayarlar("Katalog", "Dış İşlemler");
    fireEvent.click(await screen.findByRole("button", { name: /Yeni Dış İşlem/ }));
    fireEvent.change(screen.getByLabelText("İşlem adı"), { target: { value: "Toz boya" } });
    fireEvent.change(screen.getByLabelText("Birim"), { target: { value: "kilo" } });
    fireEvent.change(screen.getByLabelText("Birim fiyatı"), { target: { value: "12,5" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(kayitlar.some(k => k.disIslemler?.some(m => m.ad === "Toz boya"))).toBe(true));
    const kayit = kayitlar.filter(k => k.disIslemler?.some(m => m.ad === "Toz boya")).pop().disIslemler.find(m => m.ad === "Toz boya");
    expect(Object.keys(kayit).sort()).toEqual(["ad", "birim", "birimFiyati", "id"]);
    expect(kayit).toMatchObject({ birim: "kilo", birimFiyati: 12.5 });
  });
  it("AC-70 / AC-71 (App): boş katalog kaydedildiğinde gövdede bölüm anahtarı boş dizi olarak durur; panel boş durumu çizer", async () => {
    const { kayitlar } = await baslat({ disIslemler: [], parts: [] });
    await ayarlar("Katalog", "Dış İşlemler");
    expect(await screen.findByTestId("bos-dis-islem")).toBeTruthy();
    // Başka bir bölümde değişiklik (malzeme eklemek) kayıt tetikler; gövdede boş dış işlem listesi anahtar olarak durur (silinmez,
    // 0091 R24/4: birleştirme bindirmesi sunucudaki eski listeyi ezebilsin).
    menu("Makina Maliyeti");
    await ayarlar("Katalog", "Malzemeler");
    fireEvent.click(await screen.findByRole("button", { name: /Yeni Malzeme/ }));
    fireEvent.change(screen.getByLabelText("Malzeme adı"), { target: { value: "Teflon" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(kayitlar.some(k => k.malzemeler?.some(m => m.ad === "Teflon"))).toBe(true));
    const g = kayitlar.filter(k => k.malzemeler?.some(m => m.ad === "Teflon")).pop();
    expect("disIslemler" in g).toBe(true);
    expect(g.disIslemler).toEqual([]);
  });
  it("Karar 33 (App): Giderler › Tedarikler katalog işleminin tedarikçisini sayar (ham dizi Giderler'e iner)", async () => {
    await baslat({ tedarikciler: [{ id: 91, ad: "Mahir Isıl İşlem" }] });
    menu("Giderler");
    fireEvent.click(screen.getAllByText("Tedarikler ve Ekstre").pop());
    const satir = (await screen.findByText("Mahir Isıl İşlem")).closest("tr");
    expect(within(satir).getAllByRole("cell")[2].textContent).toBe("1 dış işlemde");
  });
});
