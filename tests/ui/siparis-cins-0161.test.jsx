// @vitest-environment jsdom
// Spec 0161: sipariş penceresinde cins blokları (gerçek SiparisPenceresi), Ayarlar › Uygulama › Cins Sıralaması paneli (gerçek
// Settings), kilit, özelleştirilmiş kullanıcı ve yedekten geri yükleme. Test adları AC-<n> taşır.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { useState } from "react";
import { SiparisPenceresi } from "../../src/components/stock/SiparisPenceresi";
import { Settings } from "../../src/components/Settings";
import { SettingsBackup } from "../../src/components/settings/SettingsBackup";
import { CINS_SIRA_SATIR_HATASI, CINS_SIRA_KARAKTER_HATASI, TEDARIKCI_BELIRTILMEMIS } from "../../src/lib/siparisIhtiyaci";
import { CINS_EKLE_ETIKETI, CINS_ZATEN_VAR } from "../../src/components/settings/SettingsCinsSira";
import { PARCALAR, MALZEMELER, TEDARIKCILER, kit } from "../fixtures/0161-veri";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(() => { cleanup(); delete window.crmLocks; delete window.crmStorage; delete window.appMail; });

const PARTI = [{ id: 801, ad: "Güz", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK: 10 } }];
const VERI = (o = {}) => ({ parts: PARCALAR, partStock: [], malzemeler: MALZEMELER, tedarikciler: TEDARIKCILER, hamTedarikciler: TEDARIKCILER,
  standardModels: kit(PARCALAR), customModels: [], uretimPartileri: PARTI, appSettings: {}, factory: { name: "Altuntaş" }, ...o });
const bolum = (ad) => screen.getAllByTestId("siparis-tedarikci-bolumu").find(b => within(b).getByTestId("siparis-tedarikci-adi").textContent === ad);
const adlar = (kap) => within(kap).getAllByTestId("siparis-hazir-satiri").map(r => r.querySelector("b").textContent);

describe("Spec 0161: sipariş penceresi", () => {
  it("AC-1 / AC-2 / AC-13: öncelikli bloklar tablonun başında, listedeki sırayla; blok başlığı ya da ayraç satırı yok", () => {
    render(<SiparisPenceresi veri={VERI({ appSettings: { cinsSirasi: ["Rulman", "Keçe"] } })} bugun="2026-11-24" onClose={vi.fn()} />);
    const a = adlar(bolum("Aksu CNC"));
    expect(a.slice(0, 5)).toEqual(["Rulman 6204", "Rulman 6205", "Rulman 6206", "Keçe 40", "Keçe 50"]);
    const t = within(bolum("Aksu CNC")).getByTestId("siparis-hazir-tablosu");
    expect(t.querySelectorAll("tbody tr").length).toBe(within(t).getAllByTestId("siparis-hazir-satiri").length);
  });
  it("AC-41: ayar değişince açık pencerenin sırası güncellenir", () => {
    const { rerender } = render(<SiparisPenceresi veri={VERI()} bugun="2026-11-24" onClose={vi.fn()} />);
    expect(adlar(bolum("Aksu CNC"))[0]).toBe("Mil B"); // boş listede alfabetik: Aks
    rerender(<SiparisPenceresi veri={VERI({ appSettings: { cinsSirasi: ["Vida"] } })} bugun="2026-11-24" onClose={vi.fn()} />);
    expect(adlar(bolum("Aksu CNC"))[0]).toBe("Ayar vidası");
  });
  it("AC-36: 'Tedarikçi belirtilmemiş' kutusunun tablosu da bloklanır", () => {
    render(<SiparisPenceresi veri={VERI()} bugun="2026-11-24" onClose={vi.fn()} />);
    fireEvent.click(within(screen.getByTestId("siparis-belirtilmemis")).getByRole("button", { name: new RegExp(`^${TEDARIKCI_BELIRTILMEMIS}`) }));
    expect(adlar(screen.getByTestId("siparis-belirtilmemis"))).toEqual(["Rulman 6300", "Somun"]);
  });
  it("AC-49: pencere cinsi göstermeye devam eder", () => {
    render(<SiparisPenceresi veri={VERI()} bugun="2026-11-24" onClose={vi.fn()} />);
    expect(within(bolum("Aksu CNC")).getAllByTestId("siparis-parca-bilgi").some(e => /Keçe/.test(e.textContent))).toBe(true);
  });
});

const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.63.0", factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(), calisanlar: [], setCalisanlar: vi.fn(),
  partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem", parts: [], setParts: vi.fn(), rawParts: [],
  standardModels: [], setStandardModels: vi.fn(), customModels: [], setCustomModels: vi.fn(), rawCustomModels: [], tedarikciler: [], setTedarikciler: vi.fn(),
};
let durum;
function Ayarlar({ ayar = {}, serverPermissions = null, initialTab = "cinssira" }) {
  const [appSettings, setAppSettings] = useState(ayar);
  durum = { appSettings };
  return <Settings {...BASE} initialTab={initialTab} appSettings={appSettings} setAppSettings={setAppSettings} serverPermissions={serverPermissions} />;
}
const satirlar = () => screen.queryAllByTestId("cins-sira-satiri").map(r => r.children[1].textContent);
const ekle = (c) => { fireEvent.change(screen.getByLabelText(CINS_EKLE_ETIKETI), { target: { value: c } }); fireEvent.click(screen.getByRole("button", { name: "Ekle" })); };
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

describe("Spec 0161: Cins Sıralaması paneli", () => {
  it("AC-44: panel Ayarlar › Uygulama grubunda, kimliği cinssira ve adı 'Cins Sıralaması'", () => {
    render(<Ayarlar initialTab="app" />);
    fireEvent.click(screen.getByText("Cins Sıralaması"));
    expect(screen.getByTestId("cins-sira-ipucu")).toBeTruthy();
  });
  it("AC-14: listeye cins eklenir, kaydedilir ve sipariş listesinde o blok başa geçer", () => {
    render(<Ayarlar />);
    ekle("Keçe"); kaydet();
    expect(durum.appSettings.cinsSirasi).toEqual(["Keçe"]);
    cleanup();
    render(<SiparisPenceresi veri={VERI({ appSettings: durum.appSettings })} bugun="2026-11-24" onClose={vi.fn()} />);
    expect(adlar(bolum("Aksu CNC")).slice(0, 2)).toEqual(["Keçe 40", "Keçe 50"]);
  });
  it("AC-15 / AC-42: sıra yukarı ve aşağı düğmeleriyle değişir; düğmeler erişilebilir adlarını taşır", () => {
    render(<Ayarlar ayar={{ cinsSirasi: ["Rulman", "Keçe", "Vida"] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Vida: yukarı taşı" }));
    expect(satirlar()).toEqual(["Rulman", "Vida", "Keçe"]);
    fireEvent.click(screen.getByRole("button", { name: "Rulman: aşağı taşı" }));
    expect(satirlar()).toEqual(["Vida", "Rulman", "Keçe"]);
    expect(screen.getByRole("button", { name: "Vida: yukarı taşı" }).disabled).toBe(true);
    kaydet();
    expect(durum.appSettings.cinsSirasi).toEqual(["Vida", "Rulman", "Keçe"]);
  });
  it("AC-16: listeden satır silinince o cins öncelik ayrıcalığını kaybeder", () => {
    render(<Ayarlar ayar={{ cinsSirasi: ["Vida", "Keçe"] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Vida: kaldır" })); kaydet();
    expect(durum.appSettings.cinsSirasi).toEqual(["Keçe"]);
  });
  it("AC-17 / AC-18 / AC-50: boş satır yazılmaz, değer kırpılır, yinelenen cins (harf büyüklüğü dahil) tek satır", () => {
    render(<Ayarlar />);
    ekle("   "); ekle("  Rulman "); ekle("RULMAN"); ekle("rulman");
    expect(satirlar()).toEqual(["Rulman"]);
    kaydet();
    expect(durum.appSettings.cinsSirasi).toEqual(["Rulman"]);
  });
  it("AC-18 (triyaj bulgu 3): yinelenen cins eklenmez ve nedeni ipucuyla söylenir; yazılan metin kutuda kalır, yazınca ipucu kalkar", () => {
    render(<Ayarlar ayar={{ cinsSirasi: ["Rulman"] }} />);
    ekle(" RULMAN ");
    expect(satirlar()).toEqual(["Rulman"]);
    expect(screen.getByTestId("cins-zaten-var").textContent).toBe(CINS_ZATEN_VAR);
    expect(screen.getByLabelText(CINS_EKLE_ETIKETI).value).toBe(" RULMAN ");
    fireEvent.change(screen.getByLabelText(CINS_EKLE_ETIKETI), { target: { value: "Keçe" } });
    expect(screen.queryByTestId("cins-zaten-var")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ekle" }));
    expect(satirlar()).toEqual(["Rulman", "Keçe"]);
    expect(screen.queryByTestId("cins-zaten-var")).toBeNull();
  });
  it("AC-19: katalogda olmayan cins listede durabilir, hata verilmez", () => {
    render(<Ayarlar />);
    ekle("Zımba"); kaydet();
    expect(durum.appSettings.cinsSirasi).toEqual(["Zımba"]);
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("AC-20 / AC-54 (panel): liste boşaltılınca değer undefined yazılır, anahtar silinmez", () => {
    render(<Ayarlar ayar={{ cinsSirasi: ["Rulman"] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Rulman: kaldır" })); kaydet();
    expect("cinsSirasi" in durum.appSettings).toBe(true);
    expect(durum.appSettings.cinsSirasi).toBeUndefined();
    expect(JSON.stringify(durum.appSettings)).not.toMatch(/cinsSirasi/);
  });
  it("AC-43: 100 karakterden uzun satır reddedilir; 100 satırda 'Ekle' pasif ve nedenli", () => {
    render(<Ayarlar />);
    ekle("x".repeat(101));
    expect(screen.getByText(CINS_SIRA_KARAKTER_HATASI)).toBeTruthy();
    expect(satirlar()).toEqual([]);
    cleanup();
    render(<Ayarlar ayar={{ cinsSirasi: Array.from({ length: 100 }, (_, i) => `c${i}`) }} />);
    expect(screen.getByRole("button", { name: "Ekle" }).disabled).toBe(true);
    expect(screen.getByText(CINS_SIRA_SATIR_HATASI)).toBeTruthy();
  });
  it("AC-21: paneli başka kullanıcı açmışsa kilit ekranı çizilir", async () => {
    window.crmLocks = { acquire: vi.fn(async () => ({ ok: false, locked_by: "ayse" })), release: vi.fn(), heartbeat: vi.fn(), list: vi.fn(async () => []), forceAcquire: vi.fn() };
    render(<Ayarlar />);
    await screen.findByTestId("ayar-kilitli");
    expect(window.crmLocks.acquire.mock.calls.map(c => c.slice(0, 2))).toContainEqual(["ayar", "cinssira"]);
  });
  it("AC-22 (ekran): Ayarlar bölümleri arasında izni olmayan kullanıcıya panel çizilmez", () => {
    render(<Ayarlar initialTab="app" serverPermissions={{ role: "user", permissions: JSON.stringify({ tabs: ["settings"], settings: ["app", "fiyat"] }) }} />);
    expect(screen.queryByText("Cins Sıralaması")).toBeNull();
  });
  it("AC-51: Ayarlar bölümleri özelleştirilmiş kullanıcı yeni paneli görmez; kutu işaretlenince görür (bilinen sınır)", () => {
    const { unmount } = render(<Ayarlar initialTab="app" serverPermissions={{ role: "user", permissions: JSON.stringify({ tabs: ["settings"], settings: ["app", "musteri", "fiyat"] }) }} />);
    expect(screen.queryByText("Cins Sıralaması")).toBeNull();
    unmount();
    render(<Ayarlar initialTab="app" serverPermissions={{ role: "user", permissions: JSON.stringify({ tabs: ["settings"], settings: ["app", "musteri", "fiyat", "cinssira"] }) }} />);
    expect(screen.getByText("Cins Sıralaması")).toBeTruthy();
  });
});

describe("Spec 0161: yedekten geri yükleme", () => {
  it("AC-23: liste 'Firma ve ayarlar' paketiyle gelir (appSettings bütün nesne; not yok)", async () => {
    const yedek = { app: "altunmak-crm", schemaVersion: 3, exportDate: "2026-11-24", factory: { name: "Y" }, appSettings: { kdv: 20, cinsSirasi: ["Rulman", "Keçe"] } };
    const setAppSettings = vi.fn();
    const flash = vi.fn();
    window.appMail = { getConfigForBackup: async () => null, getAllLog: async () => [], restoreConfigFromBackup: async () => {}, restoreFullLog: async () => {} };
    window.crmStorage = { restore: async () => structuredClone(yedek), autoBackupPasswordStatus: async () => ({ set: false, canEncrypt: true }) };
    const BOS = Object.fromEntries(["customers", "services", "partSales", "payments", "gorusmeler", "teklifler", "faturalar", "stock", "partStock", "partStockLog",
      "uretimFormlari", "yedekParcaSatislar", "dealers", "dosyalar", "kalipDefs", "partTypeDefs", "calisanlar", "customModels", "standardModels", "parts", "notes",
      "giderTurleri", "tedarikciler", "giderTanimlari", "giderler", "uretimPartileri", "kasaHesaplari", "kasaKapsamDisi", "hesapHareketleri", "cekler", "malzemeler"].map(k => [k, []]));
    const SET = Object.fromEntries(["setCustomers", "setServices", "setPartSales", "setPayments", "setCekler", "setGorusmeler", "setTeklifler", "setFaturalar", "setStock",
      "setPartStock", "setPartStockLog", "setUretimFormlari", "setYedekParcaSatislar", "setDealers", "setDosyalar", "setKalipDefs", "setPartTypeDefs", "setCalisanlar",
      "setCustomModels", "setStandardModels", "setParts", "setNotes", "setGiderTurleri", "setTedarikciler", "setGiderTanimlari", "setGiderler", "setUretimPartileri",
      "setKasaHesaplari", "setKasaKapsamDisi", "setHesapHareketleri", "setMalzemeler"].map(k => [k, vi.fn()]));
    render(<SettingsBackup {...BOS} {...SET} factory={{ name: "B" }} appSettings={{ kdv: 18 }} setAppSettings={setAppSettings} setFactory={vi.fn()} version="1.0.0" flash={flash}
      kasaVeriYetki giderYetki giderVeriYetki rawDosyalar={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Yedekten Geri Yükle/ }));
    await screen.findByText(/Geri yüklenecek bölümler/);
    expect(screen.getByText(/Geri yüklenecek bölümler/).parentElement.parentElement.textContent).toMatch(/Firma ve ayarlar/);
    fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
    await waitFor(() => expect(setAppSettings).toHaveBeenCalled());
    const arg = setAppSettings.mock.calls.at(-1)[0];
    const sonuc = typeof arg === "function" ? arg({ kdv: 18 }) : arg;
    expect(sonuc.cinsSirasi).toEqual(["Rulman", "Keçe"]);
  });
});
