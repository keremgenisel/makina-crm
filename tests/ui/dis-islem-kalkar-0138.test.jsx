// @vitest-environment jsdom
// Spec 0138: dış işlem kataloğu kalkar (ekran). Gerçek Settings › Katalog (menü, parça kartı, malzeme paneli), SettingsTrash,
// Tedarikler ve SettingsBackup. Motor ve taramalar: tests/dis-islem-kalkar-0138.test.js.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import { SettingsTrash } from "../../src/components/settings/SettingsTrash";
import { SettingsBackup } from "../../src/components/settings/SettingsBackup";
import { Tedarikciler } from "../../src/components/gider/Tedarikciler";
import {
  KALEM_BOS_METNI, ISLEM_AD_HATASI, ISLEM_TUTAR_UYARISI, MALZEME_GECMIS_IBARESI, GECERLILIK_ETIKETI, ESKI_KATALOG_KALEMI_NEDENI, maliyetMetniKurus,
} from "../../src/lib/urunAgaci";
import { KALEMDE_TEDARIKCI_NEDENI } from "../../src/lib/gider";
import { ORNEK_DUGMESI, ORNEK_IPUCU } from "../../src/lib/ornekKatalog";
import { YEDEK_PAKETLERI } from "../../src/lib/yedekPaketleri";
import { paketCumlesi } from "../../src/lib/bolumAdlari";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
const toast = vi.fn();
afterEach(() => { cleanup(); toast.mockClear(); delete window.crmStorage; delete window.appMail; });

const MALZ = [{ id: 502, ad: "DKP Sac", ozgulAgirlik: 7.85, kiloFiyati: 38 }];
const SACK = { tur: "malzeme", malzemeId: 502, bicim: "sac", kalinlik: 3, en: 200, boy: 300, adet: 1 };
const TED = [{ id: 31, ad: "Hammadde A.Ş.", hammadde: true }, { id: 32, ad: "Lazer Ltd." }];
const PARCALAR = [
  { id: 44, ad: "Gövde", models: [], maliyetKalemleri: [SACK, { tur: "islem", ad: "Lazer kesim", tedarikciId: 32, tutar: 125.5 }] },
  { id: 45, ad: "Kaplamalı pim", models: [], maliyetKalemleri: [{ tur: "islem", ad: "Kaplama", tutar: 40 }], maliyetGecmisi: [{ gecerli: "", kurus: 3000 }, { gecerli: "2026-05-01", kurus: 4000 }] },
  // Başka bir bilgisayarda 0137 ile eklenmiş, göç görmemiş katalog bağlı kalem (R2/2).
  { id: 46, ad: "Eski katalog", models: [], maliyetKalemleri: [SACK, { tur: "islem", islemId: 701, miktar: 2 }] },
];
const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.57.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
  standardModels: [], setStandardModels: vi.fn(), customModels: [], setCustomModels: vi.fn(), rawCustomModels: [], setTedarikciler: vi.fn(),
};
let durum;
function Katalog({ p0 = PARCALAR, tab = "yedekparca", malzemeler0 = MALZ }) {
  const [parts, setParts] = useState(structuredClone(p0));
  const [malzemeler, setMalzemeler] = useState(structuredClone(malzemeler0));
  durum = { parts, malzemeler };
  return <Settings {...BASE} initialTab={tab} parts={parts.filter(p => !p.deletedAt)} setParts={setParts} rawParts={parts}
    malzemeler={malzemeler.filter(m => !m.deletedAt)} setMalzemeler={setMalzemeler} rawMalzemeler={malzemeler} tedarikciler={TED} giderYetki rates={{ usd: 42, eur: 48 }} />;
}
const satir = (ad) => screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean);
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getByTitle("Düzenle"));
const ekleAc = () => fireEvent.click(screen.getByRole("button", { name: /Parça\/Yedek Parça Ekle/ }));
const yaz = (ad, v) => fireEvent.change(screen.getByLabelText(ad), { target: { value: v } });
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /^Kaydet$/ }));
const kayit = (id) => durum.parts.find(p => p.id === id);
const hesapla = () => fireEvent.click(within(screen.getByRole("radiogroup", { name: "Maliyet kipi" })).getByRole("radio", { name: "Hesapla" }));
const islemEkle = () => fireEvent.click(screen.getByRole("button", { name: /İşlem ekle/ }));

describe("Spec 0138: panel ve parça kartı (R1, R2, R10, R12/2, R23)", () => {
  it("AC-1: Ayarlar › Katalog listesinde Dış İşlemler yok; Malzemeler duruyor", () => {
    render(<Katalog />);
    expect(screen.queryByText("Dış İşlemler")).toBeNull();
    expect(screen.getAllByText("Malzemeler").length).toBeGreaterThan(0);
  });
  it("AC-2 / AC-3: işlem kalemi eklenince çeşit seçicisi, katalog araması, salt okunur birim/fiyat ve kilo miktarı yok; ad, tutar, tedarikçi var", () => {
    render(<Katalog />); ekleAc(); yaz("Yedek Parça Adı (TR)", "Yeni"); hesapla(); islemEkle();
    expect(screen.queryByRole("radiogroup", { name: /çeşit/i })).toBeNull();
    expect(screen.queryByText("Katalogdan")).toBeNull();
    expect(screen.queryByPlaceholderText("İşlem ara...")).toBeNull();
    expect(screen.queryByTestId("katalog-islem-bilgi")).toBeNull();
    expect(screen.queryByLabelText(/İşlem miktarı/)).toBeNull();
    expect(screen.getByLabelText("İşlem adı 1")).toBeTruthy();
    expect(screen.getByLabelText("İşlem tutarı 1")).toBeTruthy();
    expect(screen.getByLabelText("İşlem tedarikçisi 1")).toBeTruthy();
    expect(screen.getByRole("button", { name: "İşlem kalemini kaldır 1" }).className).toContain("btn--danger");
  });
  it("AC-4: kalem listesinin boş durumu 0135'in metniyle birebir", () => {
    render(<Katalog />); ekleAc(); hesapla();
    expect(screen.getByTestId("kalem-bos").textContent).toBe(KALEM_BOS_METNI);
    expect(screen.getByTestId("kalem-bos").textContent).not.toMatch(/Katalog/);
  });
  it("AC-7 / AC-10: adı ve tutarı girilmiş, tedarikçisiz serbest kalem kaydedilir ve maliyete girer", () => {
    render(<Katalog />); ekleAc(); yaz("Yedek Parça Adı (TR)", "Yeni pul"); hesapla(); islemEkle();
    yaz("İşlem adı 1", "Taşlama"); yaz("İşlem tutarı 1", "12,5"); kaydet();
    const p = durum.parts.find(x => x.ad === "Yeni pul");
    expect(p.maliyetKalemleri).toEqual([{ tur: "islem", ad: "Taşlama", tutar: 12.5 }]);
    expect(within(satir("Yeni pul")).getByText(maliyetMetniKurus(1250))).toBeTruthy();
  });
  it("AC-8: tutarı boş serbest kalem maliyete girmez ve kartta uyarısı görünür", () => {
    render(<Katalog />); ekleAc(); yaz("Yedek Parça Adı (TR)", "Boş"); hesapla(); islemEkle(); yaz("İşlem adı 1", "Kaplama");
    expect(screen.getByTestId("islem-tutar-uyarisi").textContent).toBe(ISLEM_TUTAR_UYARISI);
    kaydet();
    expect(durum.parts.find(x => x.ad === "Boş").maliyetKalemleri).toEqual([{ tur: "islem", ad: "Kaplama", tutar: null }]);
  });
  it("AC-9: adı boş işlem kalemi kaydı engeller, neden satırın altında", () => {
    render(<Katalog />); ekleAc(); yaz("Yedek Parça Adı (TR)", "Adsız"); hesapla(); islemEkle(); yaz("İşlem tutarı 1", "5"); kaydet();
    expect(durum.parts.some(x => x.ad === "Adsız")).toBe(false);
    expect(within(screen.getByTestId("islem-kalemi")).getByText(ISLEM_AD_HATASI)).toBeTruthy();
  });
  it("AC-11: yalnız serbest işlem kalemli parçada geçerlilik tarihi ve geçmiş listesi çizilir", () => {
    render(<Katalog />); duzenle("Kaplamalı pim");
    expect(screen.getByLabelText(GECERLILIK_ETIKETI)).toBeTruthy();
    expect(screen.getByText("Maliyet geçmişi")).toBeTruthy();
  });
  it("AC-12 / AC-46: malzeme kalemli parçada geçerlilik tarihi ve geçmiş yok; yalnız malzeme ibaresi çizilir", () => {
    render(<Katalog />); duzenle("Gövde");
    expect(screen.queryByLabelText(GECERLILIK_ETIKETI)).toBeNull();
    expect(screen.getByTestId("kalem-gecmis-ibaresi").textContent).toBe(MALZEME_GECMIS_IBARESI);
  });
});

describe("Spec 0138: eski biçimli kalem (R2/2, AC-37–AC-39)", () => {
  it("AC-37 (ekran): listede maliyet girilmedi", () => {
    render(<Katalog />);
    expect(within(satir("Eski katalog")).getAllByText("—").length).toBeGreaterThan(0);
  });
  it("AC-38: kartta eski kalemin nedeni görünür, tutar alanı doldurulabilir; tutar girilince neden kalkar", () => {
    render(<Katalog />); duzenle("Eski katalog");
    expect(screen.getByTestId("eski-katalog-kalemi").textContent).toBe(ESKI_KATALOG_KALEMI_NEDENI);
    const tutar = screen.getByLabelText("İşlem tutarı 1");
    expect(tutar.disabled).toBe(false);
    yaz("İşlem tutarı 1", "30");
    expect(screen.queryByTestId("eski-katalog-kalemi")).toBeNull();
  });
  it("AC-39: düzenleme formunda ad 'Dış işlem'; kayıt engellenmez ve serbest kalem islemId taşımaz", () => {
    render(<Katalog />); duzenle("Eski katalog");
    expect(screen.getByLabelText("İşlem adı 1").value).toBe("Dış işlem");
    yaz("İşlem tutarı 1", "30"); kaydet();
    expect(kayit(46).maliyetKalemleri[1]).toEqual({ tur: "islem", ad: "Dış işlem", tutar: 30 });
  });
  it("Triyaj bulgu 1 (AC-39 tamamlayıcı): maliyet bölümüne dokunulup eski kalemin tutarı boş bırakılınca kalem eski biçimiyle yazılır, maliyet girilmedi kalır", () => {
    render(<Katalog />); duzenle("Eski katalog");
    yaz("İşlem adı 1", "Isıl işlem"); // maliyet bölümüne dokunuldu, tutar boş
    expect(screen.getByTestId("eski-katalog-kalemi").textContent).toBe(ESKI_KATALOG_KALEMI_NEDENI);
    kaydet();
    expect(kayit(46).maliyetKalemleri).toEqual(PARCALAR[2].maliyetKalemleri);
    expect(within(satir("Eski katalog")).getAllByText("—").length).toBeGreaterThan(0);
  });
  it("AC-15 tamamlayıcı: maliyet bölümüne dokunulmayan düzenleme eski kalemi aynen yazar", () => {
    render(<Katalog />); duzenle("Eski katalog"); yaz("Yedek Parça Adı (TR)", "Eski katalog 2"); kaydet();
    expect(kayit(46).maliyetKalemleri).toEqual(PARCALAR[2].maliyetKalemleri);
  });
});

describe("Spec 0138: malzeme paneli örnek düğmesi (R9/2, AC-48)", () => {
  it("AC-48: boş malzeme panelinde örnek düğmesi ve ipucu çalışır; dış işlem örneği eklenmez", () => {
    render(<Katalog tab="malzemeler" malzemeler0={[]} />);
    expect(screen.getByText(ORNEK_IPUCU)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(ORNEK_DUGMESI) }));
    expect(durum.malzemeler.length).toBeGreaterThanOrEqual(3);
    expect(durum.malzemeler.every(m => !("birim" in m))).toBe(true);
  });
});

const bos = [];
function Cop({ t0 = [], parts = [], onState, ek = {} }) {
  const [ted, setTed] = useState(t0);
  const [prc, setPrc] = useState(parts);
  onState?.({ ted, prc });
  return <SettingsTrash rawMalzemeler={bos} setMalzemeler={vi.fn()} rawParts={prc} setParts={setPrc} showToast={toast}
    rawCustomers={bos} rawServices={bos} rawPartSales={bos} rawPayments={bos} rawDealers={bos} rawStock={bos} rawNotes={bos} rawKalipDefs={bos} rawCustomModels={bos}
    rawTeklifler={bos} rawFaturalar={bos} rawUretimFormlari={bos} rawGorusmeler={bos} rawDosyalar={bos} setCustomers={vi.fn()} setServices={vi.fn()} setPartSales={vi.fn()} setPayments={vi.fn()}
    setDealers={vi.fn()} setStock={vi.fn()} setNotes={vi.fn()} setKalipDefs={vi.fn()} setCustomModels={vi.fn()} setTeklifler={vi.fn()} setFaturalar={vi.fn()} setUretimFormlari={vi.fn()}
    setGorusmeler={vi.fn()} setDosyalar={vi.fn()} appSettings={{}} giderYetki rawGiderler={bos} setGiderler={vi.fn()}
    rawTedarikciler={ted} setTedarikciler={setTed} rawUretimPartileri={bos} setUretimPartileri={vi.fn()} serverPermissions={null} {...ek} />;
}
const COP = "2026-10-20T09:00:00.000Z";
const KALEMLI = [{ id: 1, ad: "Gövde", models: [], maliyetKalemleri: [{ tur: "islem", ad: "Lazer", tedarikciId: 32, tutar: 10 }] }];

describe("Spec 0138: çöp kutusu ve tedarikçi koruması (R4, R5, R22)", () => {
  it("AC-6: çöpte dış işlem satırı çizilmez (eski bir dış işlem dizisi verilse de bileşen onu okumaz)", () => {
    render(<Cop ek={{ rawDisIslemler: [{ id: 701, ad: "Isıl işlem", birim: "adet", deletedAt: COP }], setDisIslemler: vi.fn() }} />);
    expect(screen.queryByText(/Isıl işlem/)).toBeNull();
    expect(screen.queryByText(/Dış İşlem/i)).toBeNull();
  });
  it("AC-19 / AC-20 / AC-21: kalemde geçen tedarikçinin Kalıcı Sil'i yok ve nedeni tek adresli; geçmeyen silinir; çöpü boşalt aynı korumayı uygular", () => {
    let st;
    render(<Cop parts={KALEMLI} t0={[{ id: 32, ad: "Lazer Ltd", deletedAt: COP }, { id: 34, ad: "Boştaki", deletedAt: COP }, { id: 801, ad: "Yalnız malzeme ana tedarikçisi", deletedAt: COP }]} onState={x => { st = x; }} />);
    const r = screen.getAllByText("Lazer Ltd")[0].closest("tr");
    expect(within(r).getByTestId("cop-neden").textContent).toBe(KALEMDE_TEDARIKCI_NEDENI);
    expect(KALEMDE_TEDARIKCI_NEDENI).not.toMatch(/dış işlem/i);
    expect(within(r).queryByRole("button", { name: /Kalıcı Sil/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Çöp Kutusunu Boşalt/ }));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Sil/ }));
    expect(st.ted.map(t => t.id)).toEqual([32]); // AC-17 ve AC-18: kalemde geçmeyen ve yalnız malzeme ana tedarikçisi olan silindi
  });
  it("AC-17 / AC-19 (Tedarikler): silme onayı tek adresli; 'dış işlemde geçiyor' cümlesi yok", () => {
    function TedH() {
      const [ted, setTed] = useState([{ id: 32, ad: "Lazer Ltd" }, { id: 35, ad: "Boştaki" }]);
      return <Tedarikciler tedarikciler={ted} setTedarikciler={setTed} giderler={[]} giderTanimlari={[]} rapor={null} hesapHareketleri={[]} parts={KALEMLI} />;
    }
    render(<TedH />);
    fireEvent.click(within(screen.getByText("Lazer Ltd").closest("tr")).getByTitle("Sil"));
    const metin = screen.getByTestId("tedarikci-parca-kullanim").textContent;
    expect(metin).toMatch(/1 parçanın maliyet kaleminde geçiyor/);
    expect(document.body.textContent).not.toMatch(/dış işlemde geçiyor/);
  });
});

const backup = vi.fn(() => Promise.resolve(true));
const temel = () => ({
  customers: [], services: [], dealers: [], stock: [], customModels: [], standardModels: [], factory: {}, kalipDefs: [], notes: [], parts: [], partSales: [],
  payments: [], teklifler: [], faturalar: [], partStock: [], partStockLog: [], uretimFormlari: [], gorusmeler: [], malzemeler: [],
  setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(), setStock: vi.fn(), setCustomModels: vi.fn(), setStandardModels: vi.fn(), setFactory: vi.fn(),
  setKalipDefs: vi.fn(), setNotes: vi.fn(), setParts: vi.fn(), setPartSales: vi.fn(), setPayments: vi.fn(), setMalzemeler: vi.fn(),
  version: "3.57.0", appSettings: {}, setAppSettings: vi.fn(), flash: vi.fn(),
});
const depoKur = (yedek) => {
  backup.mockClear();
  window.appMail = { getConfigForBackup: () => Promise.resolve(null), getAllLog: () => Promise.resolve([]) };
  window.crmStorage = { backup, restore: () => Promise.resolve(structuredClone(yedek)), autoBackupPasswordStatus: () => Promise.resolve({ set: false, canEncrypt: true }) };
};
describe("Spec 0138: yedek (R6, R6/2)", () => {
  it("AC-30 (elle yedek ve paket cümlesi): gövdede dış işlem anahtarı yok; Tanımlar paketinin cümlesinde dış işlem geçmez", async () => {
    depoKur({});
    render(<SettingsBackup {...temel()} giderYetki giderVeriYetki />);
    fireEvent.click(screen.getByRole("button", { name: /Yedek Al/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Şifresiz Kaydet/ }));
    await waitFor(() => expect(backup).toHaveBeenCalled());
    expect(Object.keys(backup.mock.calls[0][0])).not.toContain("disIslemler");
    const tanimlar = YEDEK_PAKETLERI.find(p => p.ad === "Tanımlar");
    expect(paketCumlesi(tanimlar)).not.toMatch(/dış işlem/i);
    expect(JSON.stringify(YEDEK_PAKETLERI)).not.toMatch(/disIslem/);
  });
  it("AC-31: dış işlem bölümü taşıyan eski yedek hatasız geri yüklenir; öteki bölümler yazılır, o bölüm yazılmaz", async () => {
    const p = temel();
    depoKur({ app: "altunmak-crm", schemaVersion: 3, malzemeler: [{ id: 502, ad: "DKP Sac" }], disIslemler: [{ id: 701, ad: "Isıl işlem", birim: "adet", birimFiyati: 35 }] });
    render(<SettingsBackup {...p} giderYetki giderVeriYetki setDisIslemler={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Yedekten Geri Yükle/ }));
    await screen.findByText(/Geri yüklenecek bölümler/);
    fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
    await waitFor(() => expect(p.setMalzemeler).toHaveBeenCalledWith([{ id: 502, ad: "DKP Sac" }]));
    expect(p.flash.mock.calls.some(c => c[0] === "err")).toBe(false);
  });
});
