// @vitest-environment jsdom
// Spec 0082: Standart Genel Giderler kalkar, Tedarikçiler görünümü "Tedarikler ve Ekstre" olur. Gerçek bileşenler: Giderler,
// SettingsGider, MaliyetNotlari, MakinaKarliligi, MakinaModelGorunumu (Giderler içinde), GlobalSearch, SettingsBackup, App.
// Bu dosya eski veriyi (standart bölümlü yedek, eski ayar) taklit ettiği için C9 taramasında gerekçeli istisnadır (plan P1).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { useState } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Giderler } from "../../src/components/Giderler";
import { SettingsGider } from "../../src/components/settings/SettingsGider";
import { SettingsBackup } from "../../src/components/settings/SettingsBackup";
import { MaliyetNotlari } from "../../src/components/gider/MakinaMaliyetDetay";
import { MakinaKarliligi } from "../../src/components/gider/MakinaKarliligi";
import { GlobalSearch, KAT, KAT_SIRA, genelAramaSonuclari } from "../../src/components/GlobalSearch";
import { giderKalemDogrula, turHaritasi } from "../../src/lib/gider";
import { hesaplaMakinaMaliyetleri, MALZEME_HARIC_NOTU, BUGUNKU_VERI_NOTU, DAGITIM_NOTU, KISITLI_NOTU } from "../../src/lib/makinaMaliyeti";
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); vi.useRealTimers(); delete window.crmStorage; delete window.appMail; vi.unstubAllGlobals(); try { localStorage.clear(); } catch { /* yok */ } });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-02T10:00:00")); });

const TURLER = [{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Fabrika kirası", davranis: "kira" }];
const turMap = turHaritasi(TURLER);
const TED = [{ id: 11, ad: "Demir Bant" }, { id: 13, ad: "Boş Tedarik" }];
let nid = 9000;
const k = (f) => { const r = giderKalemDogrula(f, { turMap, tedarikciler: TED, uid: () => ++nid }); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
const KALEMLER = [k({ id: 1, tarih: "2026-10-01", turId: 1, tutar: 1000, kdvOrani: 20, tedarikciId: 11, aciklama: "Sac", sonOdemeTarihi: "2026-10-20" })];
const KDV = [{ from: "2000-01-01", rate: 20 }];
const SATIS = { customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] };
function GH({ g0 = KALEMLER, baslangicGorunum }) {
  const [giderler, setGiderler] = useState(g0);
  const [h, setH] = useState([]);
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={h} setHesapHareketleri={setH} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
    giderTurleri={TURLER} tedarikciler={TED} setTedarikciler={vi.fn()} calisanlar={[]} standardModels={[]} customModels={[]} baslangicGorunum={baslangicGorunum}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01" }, kdvRates: KDV }} kdvRates={KDV} kasaHesaplari={[]} satisVerisi={SATIS} showToast={vi.fn()} canDo={() => true} />;
}
const cubuk = () => within(screen.getByRole("radiogroup", { name: "Görünüm" })).getAllByRole("radio");
const gorunum = (ad) => fireEvent.click(screen.getByRole("radio", { name: ad }));

describe("Spec 0082: görünüm çubuğu ve ad (R1, R10, R12–R15)", () => {
  it("AC-1: çubukta beş sekme; 'Standart Genel Gider' metni ekranda hiç yok", () => {
    render(<GH />);
    expect(cubuk().map(r => r.textContent)).toEqual(["Dönem Raporu", "Makina ve Model", "Tedarikler ve Ekstre", "Üretim Partileri", "Makina Kârlılığı"]);
    expect(document.body.textContent).not.toMatch(/Standart Genel Gider/);
  });
  it("AC-2: üçüncü sekmenin adı 'Tedarikler ve Ekstre'", () => {
    render(<GH />);
    expect(cubuk()[2].textContent).toBe("Tedarikler ve Ekstre");
  });
  it("AC-3: o görünümde liste başlığı 'Tedarikler ve Ekstre' ve canlı tedarikçi sayısı (sekme rolüyle seçilir)", () => {
    render(<GH />);
    gorunum("Tedarikler ve Ekstre");
    expect(screen.getByRole("radio", { name: "Tedarikler ve Ekstre" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("tedarikciler").textContent).toMatch(/Tedarikler ve Ekstre · 2/);
  });
  it("AC-4: kayıt türünün adı 'Tedarikçi' kalır: düğme, form başlığı, silme onayı ve R14'ün altı metni", () => {
    render(<GH />);
    // Dönem Raporu'nun üç metni (R14).
    expect(screen.getByText("Tedarikçilere açık borç (KDV dâhil)")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Tedarikçi Kırılımı/ })).toBeTruthy();
    expect(within(screen.getByTestId("kalem-listesi")).getByText("Açıklama · Tedarikçi")).toBeTruthy();
    expect(screen.getByLabelText("Tedarikçi filtresi")).toBeTruthy();
    expect(within(screen.getByTestId("borc-ozeti")).getByText("Tedarikçi")).toBeTruthy();
    gorunum("Tedarikler ve Ekstre");
    fireEvent.click(screen.getByText("Yeni Tedarikçi"));
    expect(screen.getAllByText("Yeni Tedarikçi").length).toBeGreaterThan(1); // düğme + form başlığı
    fireEvent.click(screen.getByText("İptal"));
    fireEvent.click(within(screen.getByText("Boş Tedarik").closest("tr")).getByTitle("Sil"));
    expect(screen.getByText("Tedarikçi silinsin mi?")).toBeTruthy();
    fireEvent.click(screen.getByText("Vazgeç"));
    fireEvent.click(within(screen.getByText("Demir Bant").closest("tr")).getByText("Ekstre"));
    expect(screen.getByText("Tedarikçi Ekstresi")).toBeTruthy();
  });
  it("AC-6: dönem seçicisi yalnız Üretim Partileri'nde çizilmez", () => {
    render(<GH />);
    for (const ad of ["Dönem Raporu", "Makina ve Model", "Tedarikler ve Ekstre", "Makina Kârlılığı"]) {
      gorunum(ad);
      expect(screen.queryByLabelText("Dönem ayı"), ad).toBeTruthy();
    }
    gorunum("Üretim Partileri");
    expect(screen.queryByLabelText("Dönem ayı")).toBeNull();
  });
  it("R10: bilinmeyen başlangıç görünümü (kaldırılan 'standart') sessizce Dönem Raporu açar", () => {
    render(<GH baslangicGorunum="standart" />);
    expect(screen.getByRole("radio", { name: "Dönem Raporu" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("kalem-listesi")).toBeTruthy();
  });
});

describe("Spec 0082: genel arama (R9, R14)", () => {
  const arama = (sorgu, ek = {}) => {
    render(<GlobalSearch allowedTabs={null} giderYetki kasaYetki giderler={KALEMLER} giderTurleri={TURLER} tedarikciler={TED} giderTanimlari={[]} uretimPartileri={[]}
      kasaHesaplari={[]} cekler={[]} onGoGider={vi.fn()} onGoGiderTanim={vi.fn()} onGoKasa={vi.fn()} {...ek} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: sorgu } });
  };
  it("AC-5: tedarikçi kategorisinin başlığı 'Tedarikçiler' kalır", () => {
    arama("Demir");
    expect(screen.getAllByText("Tedarikçiler", { selector: "span" }).length).toBeGreaterThan(0);
  });
  it("AC-27: standart gider adıyla arama o kategoriyi çıkarmaz (eski veri prop olarak gelse de); kalan kategoriler ve sıra aynı", () => {
    arama("Elektrik", { standartGiderler: [{ id: 301, grupId: 301, ad: "Elektrik", tutar: 2000, baslangicAy: "2026-05" }] });
    expect(document.body.textContent).not.toMatch(/Standart Genel Gider/);
    expect(KAT_SIRA.slice(11)).toEqual(["giderler", "tedarikciler", "giderTanimlari", "uretimPartileri", "kasaHesaplari", "cekler"]);
    expect(KAT_SIRA).not.toContain("standartGiderler");
  });
  it("AC-28: kategori kümesi ile sonuç nesnesinin anahtar kümesi eşit (0026 eşitlik kuralı yeni kümede)", () => {
    const sonuc = genelAramaSonuclari("ab", {}, { izinli: () => true });
    expect(Object.keys(sonuc).sort()).toEqual(Object.keys(KAT).sort());
    expect(Object.keys(KAT).sort()).toEqual([...KAT_SIRA].sort());
  });
});

describe("Spec 0082: Gider Ayarları (R2)", () => {
  it("AC-9: 'Makina maliyetinde ortak gider kaynağı' alanı yok; diğer altı alan duruyor ve kaydediliyor", () => {
    const set = vi.fn();
    render(<SettingsGider appSettings={{ giderAyarlari: { yururlukAy: "2026-01", stopajOrani: 20 } }} setAppSettings={set} giderler={[]} />);
    expect(screen.queryByText("Makina maliyetinde ortak gider kaynağı")).toBeNull();
    expect(screen.queryByRole("radiogroup", { name: /Ortak gider kaynağı/ })).toBeNull();
    for (const l of ["Varsayılan kira stopaj oranı", "Gider takibi yürürlük ayı", "Ödeme hatırlatma eşiği (gün)", "Binek araç giderlerinde indirilebilir oran",
      "Hesapsız kayıt başlangıç tarihi", "Deneme dönemi bitiş tarihi"]) expect(screen.getByLabelText(l), l).toBeTruthy();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(set).toHaveBeenCalled();
  });
  it("AC-10: kaydedilen nesnede ortakGiderKaynagi yok; bugünkü değer ilk kayıtta düşer (R2/2)", () => {
    const set = vi.fn();
    const eski = { yururlukAy: "2026-01", stopajOrani: 20, ortakGiderKaynagi: "standart" };
    render(<SettingsGider appSettings={{ giderAyarlari: eski }} setAppSettings={set} giderler={[]} />);
    fireEvent.click(screen.getByText("Kaydet"));
    const yeni = set.mock.calls[0][0]({ giderAyarlari: eski });
    expect("ortakGiderKaynagi" in yeni.giderAyarlari).toBe(false);
    expect(yeni.giderAyarlari).toMatchObject({ yururlukAy: "2026-01", stopajOrani: 20 });
  });
});

describe("Spec 0082: maliyet notları ve ekranlar (R4)", () => {
  const mus = { id: 1, name: "Firma", model: "AK100", serialNo: "S1", installDate: "2026-09-10", uretimTarihi: "2026-09-10", currency: "TRY", fabrikaSatisBedeli: 500000 };
  const hesapla = (giderler, ayar = {}) => hesaplaMakinaMaliyetleri({ customers: [mus], stock: [], giderler, giderTurleri: TURLER, standardModels: [{ model: "AK100" }], customModels: [],
    giderAyarlari: { yururlukAy: "2026-01", ...ayar } }, { bugun: "2026-10-02" });
  const karlilik = (sonuc) => render(<MakinaKarliligi sonuc={sonuc} baslangic="2026-09-01" bitis="2026-09-30" bugun="2026-10-02" modeller={[{ model: "AK100" }]} />);
  it("AC-11: 'Ortak gider kaynağı' satırı yok; maliyetin neyi içermediğini söyleyen dört not ve 'yaklaşık kur' satırı duruyor", () => {
    render(<MaliyetNotlari yaklasik dagitimVar kisitliVar />);
    const n = screen.getByTestId("maliyet-notlari").textContent;
    expect(n).not.toMatch(/Ortak gider kaynağı/);
    for (const x of [MALZEME_HARIC_NOTU, BUGUNKU_VERI_NOTU, DAGITIM_NOTU, KISITLI_NOTU]) expect(n).toContain(x);
    expect(n).toMatch(/yaklaşık/);
  });
  it("AC-12: dağıtılmış kalemde dağıtım notu gerçekleşen kaynağın metnidir (eski 'standart' ayarlı veride de)", () => {
    karlilik(hesapla([{ id: 5, tarih: "2026-09-01", turId: 1, tutar: 12000, kdvOrani: 20, dagitimAy: 12 }], { ortakGiderKaynagi: "standart" }));
    expect(screen.getByTestId("dagitim-notu").textContent).toBe(DAGITIM_NOTU);
  });
  it("AC-13: kısıtlı kalemde maliyet notu gerçekleşen kaynağın metnidir", () => {
    karlilik(hesapla([{ id: 6, tarih: "2026-09-01", turId: 1, tutar: 1000, kdvOrani: 20, kisitliGider: true, indirilebilirOran: 70 }], { ortakGiderKaynagi: "standart" }));
    expect(screen.getAllByTestId("kisitli-maliyet-notu")[0].textContent).toBe(KISITLI_NOTU);
  });
  it("AC-14: Makina Kârlılığı özetinde fark satırı ve sürüm uyarısı hiç çizilmez", () => {
    karlilik(hesapla([{ id: 7, tarih: "2026-09-15", turId: 1, tutar: 300000, kdvOrani: 0 }], { ortakGiderKaynagi: "standart" }));
    expect(screen.queryByTestId("ozet-standart-fark")).toBeNull();
    expect(screen.queryByTestId("ozet-standart-eksik")).toBeNull();
    expect(document.body.textContent).not.toMatch(/standart/i);
  });
  it("AC-15: fiyat önerisi kaynak ibaresi taşımaz, ikinci yarısı durur; Makina ve Model'in dağıtım kutusu kaynak ibaresi taşımaz", () => {
    karlilik(hesapla([{ id: 8, tarih: "2026-09-01", turId: 1, tutar: 12000, kdvOrani: 20, dagitimAy: 12 }]));
    expect(document.body.textContent).toContain("Stoktan çekilen parçaların maliyeti hariç.");
    expect(document.body.textContent).not.toMatch(/Ortak gider kaynağı/);
    cleanup();
    const g = [{ id: 8, tarih: "2026-09-01", turId: 1, tutar: 12000, kdvOrani: 20, dagitimAy: 12 }];
    function MM() {
      const [giderler, setGiderler] = useState(g);
      return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={[]} setHesapHareketleri={vi.fn()} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
        giderTurleri={TURLER} tedarikciler={TED} setTedarikciler={vi.fn()} calisanlar={[]} standardModels={[{ model: "AK100" }]} customModels={[]} customers={[mus]} stock={[]}
        appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} kasaHesaplari={[]} satisVerisi={SATIS} showToast={vi.fn()} baslangicAy="2026-09" makinaMaliyet={hesapla(g)} />;
    }
    render(<MM />);
    gorunum("Makina ve Model");
    const kutu = screen.getByTestId("dagitim-kutusu");
    expect(kutu.textContent).toMatch(/Ortak gider \(aylık paylarla\)/);
    expect(kutu.textContent).not.toMatch(/standart/i);
  });
});

// ── Yedek ve kayıt gövdesi (R5, R7, C5) ──
const GIDER = {
  giderler: [{ id: 1, tarih: "2026-09-01", turId: 1, tutar: 10000, kdvOrani: 20, odendi: false }],
  giderTanimlari: [{ id: 3, ad: "Kira", turId: 1, baslangicAy: "2026-01" }],
  giderTurleri: [{ id: 1, ad: "Malzeme", davranis: "normal" }],
  tedarikciler: [{ id: 11, ad: "Demir Bant" }],
};
const ESKI_STANDART = [{ id: 21, grupId: 21, ad: "Elektrik", tutar: 1000, baslangicAy: "2026-01" }];
const temel = () => ({
  customers: [], services: [], dealers: [], stock: [], customModels: [], standardModels: [], factory: {}, kalipDefs: [], notes: [], parts: [], partSales: [],
  payments: [], teklifler: [], faturalar: [], partStock: [], partStockLog: [], uretimFormlari: [], gorusmeler: [],
  setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(), setStock: vi.fn(), setCustomModels: vi.fn(), setStandardModels: vi.fn(), setFactory: vi.fn(),
  setKalipDefs: vi.fn(), setNotes: vi.fn(), setParts: vi.fn(), setPartSales: vi.fn(), setPayments: vi.fn(),
  ...GIDER, setGiderler: vi.fn(), setGiderTanimlari: vi.fn(), setGiderTurleri: vi.fn(), setTedarikciler: vi.fn(),
  version: "3.45.0", appSettings: {}, setAppSettings: vi.fn(), flash: vi.fn(),
});
const backup = vi.fn(() => Promise.resolve(true));
const depoKur = () => {
  backup.mockClear();
  window.appMail = { getConfigForBackup: () => Promise.resolve(null), getAllLog: () => Promise.resolve([]) };
  window.crmStorage = { backup, autoBackupPasswordStatus: () => Promise.resolve({ set: false, canEncrypt: true }) };
};
const yedekAl = async () => {
  fireEvent.click(screen.getByRole("button", { name: /Yedek Al/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Şifresiz Kaydet/ }));
  await waitFor(() => expect(backup).toHaveBeenCalled());
  return backup.mock.calls[backup.mock.calls.length - 1][0];
};
const geriYukleAc = async (yedek) => {
  window.crmStorage.restore = () => Promise.resolve(structuredClone(yedek));
  fireEvent.click(screen.getByRole("button", { name: /Yedekten Geri Yükle/ }));
  return (await screen.findByText(/Geri yüklenecek bölümler/)).closest("div").parentElement;
};
// AC-21: yeni yedeğin bölüm anahtarları = 0082 öncesi küme − standart gider (önce küme, bu işten önceki kodla ölçüldü).
const YEDEK_ANAHTARLARI_ONCE = "app,appSettings,calisanlar,cekler,customModels,customers,dealers,dosyalar,exportDate,factory,faturalar,giderTanimlari,giderTurleri,giderler,gorusmeler,hesapHareketleri,kalipDefs,kasaHesaplari,kasaKapsamDisi,mailConfig,mailLog,notes,partSales,partStock,partStockLog,partTypeDefs,parts,payments,schemaVersion,services,standardModels,standartGiderler,stock,tedarikciler,teklifler,uretimFormlari,uretimPartileri,version,yedekParcaSatislar";

describe("Spec 0082: yedek (R7, C5)", () => {
  it("AC-21: yeni yedeğin anahtar kümesi bugünkü kümenin standart gider bölümü çıkarılmış hâline eşit; şema sürümü 3'te kalır (C5)", async () => {
    depoKur();
    render(<SettingsBackup {...temel()} giderYetki giderVeriYetki />);
    const yedek = await yedekAl();
    const once = YEDEK_ANAHTARLARI_ONCE.split(",");
    expect(once).toContain("standartGiderler");
    expect(Object.keys(yedek).sort()).toEqual(once.filter(x => x !== "standartGiderler").sort());
    expect(yedek.schemaVersion).toBe(3);
  });
  it.each([["tam", null], ["kısmi (yalnız Giderler paketi)", "Giderler"]])("AC-20: standart bölümlü eski yedek %s geri yüklenir; diğer bölümler yüklenir, hata yok, bölüm yok sayılır", async (_, paket) => {
    depoKur();
    const p = temel();
    render(<SettingsBackup {...p} giderYetki giderVeriYetki />);
    const panel = await geriYukleAc({ app: "altunmak-crm", schemaVersion: 3, customers: [{ id: 5, name: "Eski" }], ...GIDER, standartGiderler: ESKI_STANDART });
    if (paket) {
      for (const etiket of [...within(panel).getAllByRole("checkbox")]) if (etiket.checked && !etiket.closest("label")?.textContent.includes(paket)) fireEvent.click(etiket);
    }
    fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
    await waitFor(() => expect(p.setGiderler).toHaveBeenCalledWith(GIDER.giderler));
    expect(p.setTedarikciler).toHaveBeenCalledWith(GIDER.tedarikciler);
    if (!paket) expect(p.setCustomers).toHaveBeenCalled();
    expect(p.flash.mock.calls.some(c => c[0] === "err")).toBe(false);
  });
});

describe("Spec 0082: kayıt gövdeleri (R5/1)", () => {
  it("AC-16: bölüm kayıt gövdesinde, elle alınan yedekte ve otomatik yedek gövdesinde yok (gerçek App; eski sunucu bölümü gönderse de)", async () => {
    vi.useRealTimers();
    const kayitlar = [];
    depoKur();
    window.crmStorage = {
      ...window.crmStorage,
      load: vi.fn(async () => ({ customers: [], ...structuredClone(GIDER), standartGiderler: ESKI_STANDART, appSettings: {}, dataVersion: 1 })),
      save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }),
      getVersion: vi.fn(async () => 1),
    };
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
    render(<App />);
    await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 800));
    fireEvent.click(screen.getAllByText("Ayarlar").find(e => e.closest("nav")));
    fireEvent.click(screen.getAllByText("Veri Yönetimi").find(e => !e.closest("nav")));
    fireEvent.click(screen.getAllByText("Yedekleme").pop());
    await screen.findByRole("button", { name: /Yedek Al/ });
    const yedek = await yedekAl();
    expect("standartGiderler" in yedek).toBe(false);
    expect(yedek.giderler).toEqual(GIDER.giderler);
    const farkli = { ...yedek, giderler: [...yedek.giderler, { id: 99, tarih: "2026-09-03", turId: 1, tutar: 7 }], standartGiderler: ESKI_STANDART };
    await geriYukleAc(farkli);
    fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
    await waitFor(() => expect(kayitlar.some(k => k.giderler?.some(g => g.id === 99))).toBe(true), { timeout: 3000 });
    expect(kayitlar.every(k => !("standartGiderler" in k))).toBe(true);
    // Otomatik yedek gövdesi App'te tek nesne; bölüm adı geçmez (C9 taraması da kapsar).
    const app = readFileSync(resolve(__dirname, "../../src/App.jsx"), "utf8");
    const oto = app.slice(app.indexOf("window.crmStorage.writeBackup("), app.indexOf("});", app.indexOf("window.crmStorage.writeBackup(")));
    expect(oto).toMatch(/giderler/);
    expect(oto).not.toMatch(/standart/i);
  }, 20000);
});
