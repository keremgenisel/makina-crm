// @vitest-environment jsdom
// Spec 0091: gerçek bileşenler. Ayarlar › Katalog › Makina Modelleri'nin "Üretimde" kutusu (gerçek Settings: zincirler ve
// Çöp Kutusu), Makina Maliyeti › Model Maliyetleri (sayı satırı, süzgeç, iki boş durum, dönem adedi, işaretler), Parti
// Hesabı, Analiz ve iki model seçicisi. Veri tests/fixtures/0091-veri.js (K10).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import { MakinaMaliyeti } from "../../src/components/MakinaMaliyeti";
import { URETIM_METIN } from "../../src/components/maliyet/ModelMaliyetleri";
import { Analiz } from "../../src/components/Analiz";
import { CustomerAddEditForm } from "../../src/components/customers/CustomerAddEditForm";
import { MakinaStokTab } from "../../src/components/stock/MakinaStokTab";
import { URETIM_ISARETI_IPUCU } from "../../src/lib/uretimdekiModeller";
import * as V from "../fixtures/0091-veri";

afterEach(() => { cleanup(); vi.useRealTimers(); delete window.crmLocks; });

// ── Ayarlar › Katalog › Makina Modelleri ─────────────────────────────────────────────────────────────────────────────
const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.46.0", factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(), parts: [], setParts: vi.fn(), rawParts: [],
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem", showToast: vi.fn(),
};
let durum;
function Katalog({ a0 = {}, tab = "models" }) {
  const [standardModels, setStandardModels] = useState([{ model: "AK100", defaultParcalar: [] }, { model: "AK160", defaultParcalar: [] }]);
  const [customModels, setCustomModels] = useState([{ model: "OZEL_1", defaultParcalar: [] }]);
  const [appSettings, setAppSettings] = useState(a0);
  durum = { standardModels, customModels, appSettings };
  return <Settings {...BASE} initialTab={tab} appSettings={appSettings} setAppSettings={setAppSettings} standardModels={standardModels} setStandardModels={setStandardModels}
    customModels={customModels.filter(m => !m.deletedAt)} setCustomModels={setCustomModels} rawCustomModels={customModels} />;
}
const uretimKutusu = (m) => screen.getByRole("checkbox", { name: `${m} · üretimde` });
const analizKutusu = (m) => screen.getByRole("checkbox", { name: `${m} · Analiz'de göster` });
const satir = (m) => screen.getAllByText(m).map(e => e.closest("tr")).find(Boolean);
// Ayarlar menüsünün grupları katlanır: öğe görünmüyorsa önce grubunu açar.
const panelAc = (grup, ad) => {
  if (!screen.queryByRole("button", { name: ad })) fireEvent.click(screen.getByRole("button", { name: new RegExp(grup) }));
  fireEvent.click(screen.getByRole("button", { name: ad }));
};

describe("Spec 0091: Makina Modelleri paneli (R1–R5, R28)", () => {
  it("AC-1 / AC-2: her standart ve özel model satırında üretimde kutusu erişilebilir adıyla; varsayılan işaretli", () => {
    render(<Katalog />);
    for (const m of ["AK100", "AK160", "OZEL_1"]) expect(uretimKutusu(m).checked, m).toBe(true);
  });
  it("AC-1/2: başlık dizisi dokuz girdi, yeni başlık 'Üretimde' Analiz'in sağında", () => {
    render(<Katalog />);
    const b = [...satir("AK100").closest("table").querySelectorAll("thead th")].map(th => th.textContent.trim());
    expect(b).toHaveLength(9);
    expect(b.slice(6, 8)).toEqual(["Analiz", "Üretimde"]);
    expect(satir("AK100").children).toHaveLength(9);
  });
  // Triyaj (bulgu 3): başlık sola yaslıydı, kutusu ortadaydı.
  it("triyaj bulgu 3: 'Üretimde' başlığı Analiz başlığı gibi ortalı, kutusunun hücresiyle aynı hizada", () => {
    render(<Katalog />);
    const th = [...satir("AK100").closest("table").querySelectorAll("thead th")];
    expect(th[7].textContent.trim()).toBe("Üretimde");
    expect(th[7].style.textAlign).toBe("center");
    expect(th[6].style.textAlign).toBe("center");
    expect(uretimKutusu("AK100").closest("td").style.textAlign).toBe("center");
  });
  it("AC-1/3: aynı satırdaki iki kutu ayrı adla bulunur, biri ötekini değiştirmez", () => {
    render(<Katalog />);
    fireEvent.click(uretimKutusu("AK160"));
    expect(uretimKutusu("AK160").checked).toBe(false);
    expect(analizKutusu("AK160").checked).toBe(true);
    expect(durum.appSettings).toEqual({ uretimdeOlmayanModeller: ["AK160"] });
    expect(durum.appSettings.analizGizliModeller).toBeUndefined();
  });
  it("AC-4 / AC-5: kutu kaldırılınca ad listeye girer, yeniden işaretlenince çıkar (anahtar gövdeye yazılmaz)", () => {
    render(<Katalog />);
    fireEvent.click(uretimKutusu("AK100"));
    expect(durum.appSettings.uretimdeOlmayanModeller).toEqual(["AK100"]);
    fireEvent.click(uretimKutusu("AK100"));
    expect(durum.appSettings.uretimdeOlmayanModeller).toBeUndefined();
    expect(JSON.parse(JSON.stringify(durum.appSettings))).toEqual({});
  });
  it("AC-6: üretimde olmayan model yeniden adlandırılınca liste yeni adı taşır", () => {
    render(<Katalog a0={{ uretimdeOlmayanModeller: ["OZEL_1"] }} />);
    fireEvent.click(satir("OZEL_1").querySelector('button[title="Düzenle"]'));
    fireEvent.change(screen.getByPlaceholderText("Örn: AK160_DSC"), { target: { value: "OZEL_2" } });
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect(durum.customModels.map(m => m.model)).toEqual(["OZEL_2"]);
    expect(durum.appSettings.uretimdeOlmayanModeller).toEqual(["OZEL_2"]);
    expect(uretimKutusu("OZEL_2").checked).toBe(false);
  });
  it("AC-7 / AC-8: üretimde olmayan özel model silinince adı listeden düşer; Çöp Kutusu'ndan geri alınınca üretimde sayılır", () => {
    render(<Katalog a0={{ uretimdeOlmayanModeller: ["OZEL_1", "AK160"] }} />);
    fireEvent.click(satir("OZEL_1").querySelector("button.btn--danger"));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Sil/ }));
    expect(durum.customModels[0].deletedAt).toBeTruthy();
    expect(durum.appSettings.uretimdeOlmayanModeller).toEqual(["AK160"]);
    panelAc("Veri Yönetimi", "Çöp Kutusu");
    fireEvent.click(within(screen.getAllByText("OZEL_1").map(e => e.closest("div,tr")).find(Boolean).parentElement).getByRole("button", { name: /Geri Al/ }));
    expect(durum.customModels[0].deletedAt).toBeFalsy();
    panelAc("Katalog", "Makina Modelleri");
    expect(uretimKutusu("OZEL_1").checked).toBe(true);
  });
  it("AC-12/2 (R28): panelde işaretin kapsamını söyleyen ipucu", () => {
    render(<Katalog />);
    expect(screen.getByTestId("uretim-isareti-ipucu").textContent).toBe(URETIM_ISARETI_IPUCU);
    // Spec 0093 ile (R8/2): kapsam planlanan adetler penceresini de sayar; ikinci ifade aynen (0093 AC-16'nın "söylemeye devam eder" yarısı).
    // Spec 0105 ile (R22/2, Karar 17): üçüncü tüketici müşteri formunun model seçicisi; etkilenmeyen seçiciler "stok ve Evrak".
    expect(URETIM_ISARETI_IPUCU).toMatch(/Makina Maliyeti › Model Maliyetleri'ni, Parti Hesabı'nın planlanan adetler penceresini ve müşteri formunun model seçicisini süzer/);
    expect(URETIM_ISARETI_IPUCU).toMatch(/stok ve Evrak model seçicileri, Analiz/);
  });
});

// ── Makina Maliyeti › Model Maliyetleri ──────────────────────────────────────────────────────────────────────────────
const PARTI = [{ id: 1, ad: "Yaz", baslangicAy: "2026-01", bitisAy: "2026-12" }];
const PARTILI_STOK = V.STOCK.map(s => (s.id === 3 ? { ...s, partiId: 1 } : s));
function MH({ a0 = { uretimdeOlmayanModeller: V.URETIMDE_DISI }, ayar = V.AYARLAR, std = V.STANDART, ozel = V.OZEL, stok = PARTILI_STOK, gorunum = "modeller" }) {
  const [appSettings, setAppSettings] = useState({ giderAyarlari: { yururlukAy: "2026-01" }, ...(ayar ? { maliyetAyarlari: ayar } : {}), ...a0 });
  return <MakinaMaliyeti aktifKullanici="kerem" giderler={V.GIDERLER} giderTurleri={V.TURLER} setGiderTurleri={vi.fn()} tedarikciler={[]}
    stock={stok} customers={[]} tumMusteriler={[]} partStockLog={[]} parts={[]} standardModels={std} customModels={ozel.filter(m => !m.deletedAt)}
    setStandardModels={vi.fn()} setCustomModels={vi.fn()} uretimPartileri={PARTI} setUretimPartileri={vi.fn()} appSettings={appSettings} setAppSettings={setAppSettings}
    rates={{}} serverPermissions={null} showToast={vi.fn()} baslangicGorunum={gorunum} />;
}
const tabloSatirlari = () => [...screen.getByTestId("model-maliyet-tablosu").querySelectorAll("tbody tr[data-testid^='model-satiri-']")];
const suzgec = () => screen.getByTestId("uretimde-suzgec");
const modelSatiri = (m) => screen.getByTestId(`model-satiri-${m}`);
const adet = (m) => within(modelSatiri(m)).getByTestId("donem-adet").textContent;

describe("Spec 0091: Model Maliyetleri (R7–R16, R27/2, R31)", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-17T10:00:00")); });
  it("AC-13 / AC-14: yirmi canlı modelden yedisi üretimde; tablo yedi satır, sayı satırı iki sayıyı yazar", () => {
    render(<MH />);
    expect(tabloSatirlari()).toHaveLength(7);
    expect(screen.getByTestId("model-sayilari").textContent).toBe(URETIM_METIN.sayiSatiri({ tanimli: 20, uretimde: 7 }));
    expect(screen.getByTestId("model-sayilari").textContent).toBe("20 model tanımlı · üretimde: 7");
  });
  it("AC-14/3: işareti dönemle çelişen model varsa sayısı aynı satırda, süzgeç kapalıyken de yazar", () => {
    render(<MH />);
    expect(suzgec().getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("uretim-isaret-uyari").textContent).toBe(URETIM_METIN.yanlisEki(1));
    expect(screen.queryByTestId("model-satiri-AK160")).toBeNull(); // satırı gizli, sayısı görünür
  });
  it("AC-14/4: çelişen model yokken uyarı hiç çizilmez", () => {
    render(<MH a0={{ uretimdeOlmayanModeller: V.URETIMDE_DISI.filter(m => m !== "AK160") }} />);
    expect(screen.queryByTestId("uretim-isaret-uyari")).toBeNull();
  });
  it("AC-15 / AC-16 / AC-17: süzgeç açılınca yirmi satır; üretimde olmayan satırda işaret var, üretimdekinde yok", () => {
    render(<MH />);
    fireEvent.click(suzgec());
    expect(suzgec().getAttribute("aria-pressed")).toBe("true");
    expect(suzgec().textContent).toBe(URETIM_METIN.suzgecAcik);
    expect(tabloSatirlari()).toHaveLength(20);
    expect(within(modelSatiri("AK200")).getByTestId("uretimde-degil-isareti").textContent).toBe("üretimde değil");
    expect(within(modelSatiri("AK100")).queryByTestId("uretimde-degil-isareti")).toBeNull();
  });
  it("AC-18 (R10): ekran yeniden açılınca süzgeç varsayılana döner (görünüm değişimi dahil)", () => {
    const { unmount } = render(<MH />);
    fireEvent.click(suzgec());
    fireEvent.click(screen.getByRole("radio", { name: "Hesap Ayarları" }));
    fireEvent.click(screen.getByRole("radio", { name: "Model Maliyetleri" }));
    expect(suzgec().getAttribute("aria-pressed")).toBe("false");
    unmount();
    render(<MH />);
    expect(tabloSatirlari()).toHaveLength(7);
  });
  it("AC-19 / AC-19/2 / AC-14/2: bütün modeller işaretten çıkınca boş durum; düğmesiz; sayı satırı ve süzgeç yine çizilir", () => {
    render(<MH a0={{ uretimdeOlmayanModeller: V.KATALOG }} />);
    const kutu = screen.getByTestId("bos-model-maliyet-uretimde");
    expect(kutu.textContent).toContain(URETIM_METIN.bosBaslik);
    expect(kutu.textContent).toContain(URETIM_METIN.bosMetin(20));
    expect(within(kutu).queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByTestId("bos-model-maliyet")).toBeNull();
    expect(screen.getByTestId("model-sayi-satiri")).toBeTruthy();
    expect(suzgec()).toBeTruthy();
  });
  it("AC-20: o boş durumdan süzgeç açılınca bütün satırlar çizilir ve kutu kaybolur", () => {
    render(<MH a0={{ uretimdeOlmayanModeller: V.KATALOG }} />);
    fireEvent.click(suzgec());
    expect(tabloSatirlari()).toHaveLength(20);
    expect(screen.queryByTestId("bos-model-maliyet-uretimde")).toBeNull();
  });
  it("AC-21 / AC-14/2: hiç model yokken bugünkü boş durum aynen; süzgeç açılsa da tablo yok", () => {
    render(<MH std={[]} ozel={[]} />);
    const kutu = screen.getByTestId("bos-model-maliyet");
    expect(kutu.textContent).toContain("Tanımlı makina modeli yok");
    expect(kutu.textContent).toContain("Modeller Ayarlar › Katalog › Makina Modelleri'nde tanımlanır.");
    expect(screen.getByTestId("model-sayi-satiri")).toBeTruthy();
    fireEvent.click(suzgec());
    expect(screen.queryByTestId("model-maliyet-tablosu")).toBeNull();
    expect(screen.queryByTestId("bos-model-maliyet-uretimde")).toBeNull();
  });
  it("AC-22: üretimde olmayan modelin rakamları süzgeç açıkken işaretsiz hâliyle birebir aynı", () => {
    const para = () => [...modelSatiri("AK160").querySelectorAll("td")].slice(2, 8).map(td => td.textContent);
    render(<MH a0={{}} />);
    const isaretsiz = para();
    cleanup();
    render(<MH />);
    fireEvent.click(suzgec());
    expect(para()).toEqual(isaretsiz);
  });
  it("AC-23 / AC-23/2 / AC-38: 'Dönemde üretilen' Model'in sağında, dokuz sütun, döküm colSpan 9, adet tam sayı ve para simgesiz", () => {
    render(<MH />);
    const b = [...screen.getByTestId("model-maliyet-tablosu").querySelectorAll("thead th")].map(th => th.textContent.trim());
    expect(b).toHaveLength(9);
    expect(b.slice(0, 2)).toEqual(["Model", "Dönemde üretilen"]);
    expect(adet("AK100")).toBe("2");
    expect(adet("AK100")).not.toMatch(/₺|TL/);
    fireEvent.click(within(modelSatiri("AK100")).getByRole("button", { name: /AK100/ }));
    expect(screen.getByTestId("dokum-AK100").closest("td").getAttribute("colspan")).toBe("9");
  });
  it("AC-23/3 / AC-24: dönemde üretilmemiş üretimdeki modelde '0' ve bilgi işareti", () => {
    render(<MH />);
    expect(adet("AK120")).toBe("0");
    expect(within(modelSatiri("AK120")).getByTestId("isaret-eskimis").textContent).toBe(URETIM_METIN.eskimis);
  });
  it("AC-25: üretimde olmayan ama dönemde üretilmiş modelde uyarı işareti (süzgeç açıkken)", () => {
    render(<MH />);
    fireEvent.click(suzgec());
    expect(within(modelSatiri("AK160")).getByTestId("isaret-yanlis").textContent).toBe(URETIM_METIN.yanlis);
  });
  it("AC-26: üretimde ve dönemde üretilmiş modelde iki işaretten hiçbiri yok", () => {
    render(<MH />);
    expect(within(modelSatiri("AK100")).queryByTestId("isaret-eskimis")).toBeNull();
    expect(within(modelSatiri("AK100")).queryByTestId("isaret-yanlis")).toBeNull();
  });
  it("AC-27 / AC-27/2: hesap ayarları girilmemişken adet hücresinde neden; işaretler hiç yok", () => {
    render(<MH ayar={null} />);
    fireEvent.click(suzgec());
    expect(adet("AK100")).toBe("hesap ayarları girilmedi");
    expect(screen.queryAllByTestId("isaret-eskimis")).toHaveLength(0);
    expect(screen.queryAllByTestId("isaret-yanlis")).toHaveLength(0);
  });
  it("AC-29/2 / AC-29/3: modeli bulunamayan makina sayısı yazar; sıfırken satır yok", () => {
    render(<MH />);
    expect(screen.getByTestId("model-yok-adet").textContent).toBe(URETIM_METIN.modelYok(1));
    cleanup();
    render(<MH stok={PARTILI_STOK.filter(s => s.model !== "BILINMEYEN")} />);
    expect(screen.queryByTestId("model-yok-adet")).toBeNull();
  });
  it("AC-30 (ekran yarısı): 'inox' yazılmış makina İNOX satırının adedine girer", () => {
    render(<MH />);
    expect(adet("İNOX")).toBe("1");
  });
  // Spec 0093 ile (0091 R29, AC-43 ters çevrildi): pencere yalnız üretimdeki modelleri listeler; AC-32'nin tablo yarısı aynen.
  it("AC-32 / AC-43 (R20, R29; spec 0093 ile): Parti Hesabı üretimde olmayan modelin makinasını sayar; planlanan adetler penceresi onu listelemez", () => {
    render(<MH gorunum="parti" />);
    expect(screen.getByTestId("parti-satiri-AK160")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Planlanan adetler/ }));
    expect(screen.queryByLabelText("AK160 planlanan adedi")).toBeNull();
    expect(screen.queryByLabelText("AK240 planlanan adedi")).toBeNull();
    expect(screen.getByLabelText("AK100 planlanan adedi")).toBeTruthy();
  });
});

// ── Dokunulmayanlar: Analiz ve seçiciler ─────────────────────────────────────────────────────────────────────────────
describe("Spec 0091: dokunulmayanlar (R21, R22)", () => {
  const musteriler = [{ id: 1, name: "A", model: "AK-140", serialNo: "S1", installDate: "2025-01-05" }, { id: 2, name: "B", model: "AK-100", serialNo: "S2", installDate: "2025-02-01" }];
  const servisler = [{ id: 10, customerId: 1, date: "2025-06-05", type: "Garanti Dışı", repairPlace: "Yerinde Onarım", tech: "A", degisenParcalar: [] },
    { id: 11, customerId: 2, date: "2025-06-06", type: "Garanti Dışı", repairPlace: "Yerinde Onarım", tech: "A", degisenParcalar: [] }];
  it("AC-36: üretimde olmayan model Analiz'de görünmeye devam eder", () => {
    render(<Analiz customers={musteriler} services={servisler} partSales={[]} yedekParcaSatislar={[]} parts={[]} appSettings={{ uretimdeOlmayanModeller: ["AK-140"] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Tüm zamanlar" }));
    expect(screen.getByText("Model Servis Yoğunluğu").closest("section").textContent).toContain("AK-140");
  });
  it("AC-37: Analiz kutusu kapatılınca maliyet ekranındaki satır etkilenmez", () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-17T10:00:00"));
    render(<MH a0={{ uretimdeOlmayanModeller: V.URETIMDE_DISI, analizGizliModeller: ["AK100", "AK120"] }} />);
    expect(screen.getByTestId("model-satiri-AK100")).toBeTruthy();
    expect(tabloSatirlari()).toHaveLength(7);
  });
  // Spec 0105 ile (AC-33 ters çevrildi, ölçüm 9): eski test forma işaret vermiyordu ve bu spec'ten sonra da kendiliğinden yeşil
  // kalırdı. Şimdi işaret verisiyle: müşteri formu üretimde olmayan modeli listelemez; işaretsiz model listelenir.
  it("AC-33 (spec 0105 ile ters): müşteri makinası formunun model seçicisi üretimde olmayan modeli listelemez", () => {
    function F() {
      const [form, setForm] = useState({ id: 1, name: "A", kaliplar: [] });
      return <CustomerAddEditForm modal={{ edit: { id: 1 } }} form={form} setForm={setForm} save={vi.fn()} onClose={vi.fn()} stock={[]} models={[...V.STANDART, ...V.OZEL.filter(m => !m.deletedAt)]}
        appSettings={{ uretimdeOlmayanModeller: V.URETIMDE_DISI }}
        dealers={[]} factory={{ name: "Altuntaş" }} kdvRates={{}} payments={[]} geoData={null} loadingGeo={false} entity="customer" />;
    }
    render(<F />);
    fireEvent.click(screen.getByText("Model seçin..."));
    expect(V.URETIMDE_DISI).toEqual(expect.arrayContaining(["AK160", "AK240"]));
    expect(screen.queryByText("AK160")).toBeNull();
    expect(screen.queryByText("AK240")).toBeNull();
    expect(screen.getByText("AK100")).toBeTruthy();
  });
  it("AC-34: stok makina formunun model seçicisi üretimde olmayan modeli listeler", () => {
    render(<MakinaStokTab stock={[]} setStock={vi.fn()} models={[...V.STANDART, ...V.OZEL.filter(m => !m.deletedAt)]} showToast={vi.fn()}
      parts={[]} partStock={[]} setPartStock={vi.fn()} partStockLog={[]} setPartStockLog={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Stoğa Makina Ekle/ }));
    const secici = screen.getByText("Model seçin...").closest("select");
    expect([...secici.options].map(o => o.value)).toEqual(expect.arrayContaining(["AK160", "AK240", "OZ14"]));
  });
});
