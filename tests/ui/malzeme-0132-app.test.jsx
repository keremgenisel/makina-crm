// @vitest-environment jsdom
// Spec 0132 gerçek App: malzeme listesi App → Ayarlar ve App → Makina Maliyeti hattına bağlı. Zam EKRANDA okunur (R16/4, AC-89),
// parça listesinin sayacı malzemeyi bilir (AC-85), kayıt gövdesi malzemeleri taşır, otuz günlük temizlik kullanılan malzemeyi
// korur (AC-20), birleştirme satırları yazılı (AC-59), model süzmesinin iki okuyucusu değişmedi (AC-52).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { KALEMDE_MALZEME_NEDENI } from "../../src/lib/malzeme";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete window.crmStorage; delete window.appServer; });
const { default: App } = await import("../../src/App");
const { MakinaMaliyeti } = await import("../../src/components/MakinaMaliyeti");

const ESKI = new Date(Date.now() - 60 * 86400000).toISOString();
const veri = () => ({
  malzemeler: [
    { id: 501, ad: "304 Paslanmaz", ozgulAgirlik: 7.9, kiloFiyati: 2.95, paraBirimi: "USD", kur: 50 },
    { id: 502, ad: "Eski çelik", ozgulAgirlik: 7.85, kiloFiyati: 90, deletedAt: ESKI },
    { id: 503, ad: "Kullanılmayan", deletedAt: ESKI },
  ],
  parts: [
    { id: 41, ad: "Kesme mili", models: [], malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 140, boy: 78, payCap: 4, payBoy: 5, fire: 8 } },
    { id: 42, ad: "Çöpteki pim", models: [], deletedAt: new Date().toISOString(), malzemeSatiri: { malzemeId: 502, bicim: "mil", cap: 10, boy: 20 } },
    { id: 43, ad: "Pul", models: [], maliyet: 5 },
  ],
  standardModels: [{ model: "AK100", defaultParcalar: [{ partId: "41", ad: "Kesme mili", miktar: 2 }] }],
  giderTurleri: [], tedarikciler: [], giderler: [], giderTanimlari: [], hesapHareketleri: [], kasaHesaplari: [], cekler: [],
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
const direkt = () => within(screen.getByTestId("model-satiri-AK100")).getAllByRole("cell")[2].textContent;

describe("Spec 0132 gerçek App", () => {
  it("AC-89 / AC-47: kilo fiyatı değişince Model Maliyetleri ekranındaki rakam yeni fiyatla okunur; parçaya dokunulmaz", async () => {
    const { kayitlar } = await baslat();
    menu("Makina Maliyeti");
    expect(direkt()).toBe("3.402,24 ₺"); // 2 × 1.701,12
    await ayarlar("Katalog", "Malzemeler");
    const satir = (await screen.findAllByTestId("malzeme-satiri")).find(r => r.textContent.includes("304 Paslanmaz"));
    fireEvent.click(within(satir).getByRole("button", { name: "Fiyatı Güncelle" }));
    expect(screen.getByLabelText("Kur").value).toBe("50"); // Karar 41: pencere kayıtlı kurla açılır, elle yazmak gerekmez
    fireEvent.change(screen.getByLabelText("Kilo fiyatı"), { target: { value: "5,90" } });
    fireEvent.click(screen.getByRole("button", { name: "Fiyatı Kaydet" }));
    menu("Makina Maliyeti");
    expect(direkt()).toBe("6.804,50 ₺"); // 2 × 3.402,25 (11,53304 kg × 5,90 $ × 50)
    await waitFor(() => expect(kayitlar.some(k => k.malzemeler?.find(m => m.id === 501)?.kiloFiyati === 5.9)).toBe(true));
    const son = kayitlar.filter(k => k.malzemeler?.find(m => m.id === 501)?.kiloFiyati === 5.9).pop();
    expect(son.parts.find(p => p.id === 41)).toEqual(veri().parts[0]);
  });
  it("AC-89 / R16/4: ekran açıkken malzeme listesi değişince Model Maliyetleri önbelleği yeni fiyatla okur (bağımlılık)", () => {
    const v = veri();
    // Bütün dizi prop'ları sabit referans (App'teki gibi); varsayılan `[]` her çizimde yeni dizi üretip önbelleği zaten bozardı.
    const B = [];
    const ortak = { giderler: B, giderTurleri: B, tedarikciler: B, stock: B, customers: B, partStockLog: B, uretimPartileri: B, tumMusteriler: B,
      parts: v.parts.filter(p => !p.deletedAt), standardModels: v.standardModels, customModels: B, appSettings: v.appSettings, setAppSettings: vi.fn(),
      setStandardModels: vi.fn(), setCustomModels: vi.fn(), setGiderTurleri: vi.fn(), setUretimPartileri: vi.fn(), showToast: vi.fn() };
    const { rerender } = render(<MakinaMaliyeti {...ortak} malzemeler={[v.malzemeler[0]]} />);
    expect(direkt()).toBe("3.402,24 ₺");
    rerender(<MakinaMaliyeti {...ortak} malzemeler={[{ ...v.malzemeler[0], kiloFiyati: 5.9 }]} />);
    expect(direkt()).toBe("6.804,50 ₺");
  });
  it("AC-20 / AC-19 (App): otuz günlük temizlik çöpteki parçanın satırında geçen malzemeyi korur (satırda neden), kullanılmayanı siler", async () => {
    await baslat();
    await ayarlar("Veri Yönetimi", "Çöp Kutusu");
    const satir = (await screen.findByText("Eski çelik")).closest("tr");
    expect(within(satir).getByTestId("cop-neden").textContent).toBe(KALEMDE_MALZEME_NEDENI);
    expect(screen.queryByText("Kullanılmayan")).toBeNull();
  });
  it("AC-85 (App): parça listesinde malzemesi tam parça maliyetli, sayaç yalnız gerçekten eksik olanı sayar", async () => {
    await baslat();
    await ayarlar("Katalog", "Parça/Yedek Parça");
    const parca = (await screen.findByText("Kesme mili")).closest("tr");
    expect(within(parca).getByTestId("parca-maliyet").textContent).toBe("1.701,12 ₺Maliyet kalemlerinden hesaplanıyor (1 malzeme, 0 işlem kalemi)"); // spec 0135 ile (R39): tek kalem ibaresi
    expect(screen.queryByTestId("maliyetsiz-parca")).toBeNull();
  });
  it("AC-59 (kaynak) / C5: yükleme, kayıt, otomatik yedek, birleştirme ve silme satırları malzemeyi taşır", () => {
    const app = readFileSync("src/App.jsx", "utf8");
    expect(app).toMatch(/apply\(setMalzemeler, "malzemeler"\)/);
    expect(app).toMatch(/silmeUygula\(setMalzemeler, "malzemeler"\)/);
    expect(app).toMatch(/if \(Array\.isArray\(data\.malzemeler\)\) setMalzemeler\(data\.malzemeler\);/);
    expect((app.match(/tedarikciler, malzemeler, uretimPartileri/g) || []).length).toBe(3); // kayıt, bağımlılık, otomatik yedek
    expect(app).toMatch(/parts=\{liveParts\} malzemeler=\{liveMalzemeler\}/);
  });
  it("AC-52: model süzmesinin iki okuyucusu (Model Maliyetleri, müşteri formu) yerinde; stok formu ve Evrak işareti okumaz", () => {
    expect(readFileSync("src/components/MakinaMaliyeti.jsx", "utf8")).toMatch(/uretimdeOlmayanModeller/);
    expect(readFileSync("src/components/customers/CustomerAddEditForm.jsx", "utf8")).toMatch(/uretimdeSuzulmusModeller/);
    for (const f of ["src/components/stock/MakinaStokTab.jsx", "src/components/Documents.jsx"]) expect(readFileSync(f, "utf8"), f).not.toMatch(/uretimdeOlmayanModeller|uretimdeSuzulmusModeller|uretimdeMi/);
  });
});
