// @vitest-environment jsdom
// Spec 0137: Ayarlar › Katalog › Dış İşlemler paneli (gerçek Settings, App gibi bağlanır: panele canlı dizi, `rawDisIslemler` ham dizi),
// fiyat güncelleme penceresi, Çöp Kutusu (gerçek SettingsTrash), Tedarikler'in koruması (gerçek Tedarikciler), panel kilidi, denetim izi.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import { SettingsTrash } from "../../src/components/settings/SettingsTrash";
import { Tedarikciler } from "../../src/components/gider/Tedarikciler";
import * as D from "../../src/lib/disIslem";
import { yerelBugun } from "../../src/lib/utils";
import { FIYAT_PENCERE_BASLIGI } from "../../src/components/DisIslemFiyatPenceresi";
import { GUNUN_KURU_DUGMESI, ISLEM_EKLE } from "../../src/components/DisIslemManager";
import { BAGLI_PARCA_YOK } from "../../src/lib/disIslemEtkisi";
import { AYAR_KILITLI, KILIT_ALANLARI } from "../../src/lib/kilitAlanlari";
import { TARIH_GELECEK_HATASI } from "../../src/lib/gecerlilik";
import { KALEMDE_VE_KATALOGDA_TEDARIKCI_NEDENI } from "../../src/lib/gider";
import { KUR_ALINMADI, KUR_CEVRIMDISI, BELIRSIZ_HATASI } from "../../src/lib/malzeme";

const denetim = vi.hoisted(() => ({ kayitlar: [] }));
vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: (o) => denetim.kayitlar.push(o) }));
afterEach(() => { cleanup(); delete window.crmLocks; denetim.kayitlar.length = 0; });

const ISIL = { id: 701, ad: "Isıl İşlem", birim: "adet", birimFiyati: 20, tedarikciId: 12 };
const GALV = { id: 702, ad: "Galvano", birim: "kilo", birimFiyati: 30 };
const LAZER = { id: 703, ad: "Lazer", birim: "adet", birimFiyati: 2, paraBirimi: "USD", kur: 50 };
const FIYATSIZ = { id: 704, ad: "Kama açma", birim: "adet" };
const PARCA = [
  { id: 41, ad: "Pim", models: [], fiyatKipi: "maliyet", karKati: 2, maliyetKalemleri: [{ tur: "islem", islemId: 701, miktar: 2 }] },
  { id: 42, ad: "Çöpteki pim", models: [], deletedAt: "2026-10-01", maliyetKalemleri: [{ tur: "islem", islemId: 702 }] },
  { id: 43, ad: "Pul", models: [], maliyet: 5 },
];
const TED = [{ id: 11, ad: "Zeta Kaplama" }, { id: 12, ad: "Mahir Isıl İşlem", hammadde: true }, { id: 13, ad: "Beta Metal" }];
const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.56.0", appSettings: { fiyatAyarlari: { varsayilanKat: 2 } }, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
  standardModels: [], setStandardModels: vi.fn(), customModels: [], setCustomModels: vi.fn(), setParts: vi.fn(),
};
let durum;
function Panel({ d0 = [ISIL, GALV, LAZER, FIYATSIZ], parts = PARCA, rates = { usd: 42.15, eur: 48.9 }, ratesErr = false, giderYetki = true }) {
  const [disIslemler, setDisIslemler] = useState(structuredClone(d0));
  durum = { disIslemler };
  return <Settings {...BASE} initialTab="disislemler" disIslemler={disIslemler.filter(m => !m.deletedAt)} setDisIslemler={setDisIslemler} rawDisIslemler={disIslemler}
    parts={parts.filter(p => !p.deletedAt)} rawParts={parts} rates={rates} ratesErr={ratesErr} tedarikciler={TED} setTedarikciler={vi.fn()} giderYetki={giderYetki} />;
}
const alan = (ad) => screen.getByLabelText(ad);
const yaz = (ad, v) => fireEvent.change(alan(ad), { target: { value: v } });
const satir = (ad) => screen.getAllByTestId("dis-islem-satiri").find(r => r.textContent.includes(ad));
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
const yeni = () => fireEvent.click(screen.getByRole("button", { name: new RegExp(ISLEM_EKLE) }));
const duzenle = (ad) => fireEvent.click(screen.getByRole("button", { name: `${ad} düzenle` }));

describe("Spec 0137: dış işlem paneli", () => {
  it("AC-1: Katalog listesinde \"Dış İşlemler\" Malzemeler'den sonra altıncı", () => {
    render(<Panel />);
    const ogeler = screen.getAllByRole("button").map(b => b.textContent.trim());
    const i = ogeler.indexOf("Malzemeler");
    expect(i).toBeGreaterThan(-1);
    expect(ogeler[i + 1]).toBe("Dış İşlemler");
    expect(ogeler.slice(i - 4, i + 2)).toEqual(["Makina Modelleri", "Kalıp Modelleri", "Parça/Yedek Parça", "Parça Tipleri", "Malzemeler", "Dış İşlemler"]);
  });
  it("AC-2 / AC-71 (ekran): katalog boşken tablo yok, boş durum çizilir", () => {
    render(<Panel d0={[]} />);
    expect(screen.getByTestId("bos-dis-islem").textContent).toContain(D.BOS_BASLIK);
    expect(screen.queryByRole("table")).toBeNull();
  });
  it("AC-3 / AC-4: ad boşken ve aynı ad (Türkçe küçültmeli) varken kayıt yok, neden ad alanında", () => {
    render(<Panel />);
    yeni(); kaydet();
    expect(screen.getByText(D.AD_BOS_HATASI)).toBeTruthy();
    yaz("İşlem adı", "ISIL İŞLEM"); kaydet();
    expect(screen.getByText(D.AD_AYNI_HATASI)).toBeTruthy();
    expect(durum.disIslemler).toHaveLength(4);
  });
  it("AC-5: düzenlenen işlemin kendi adı çakışma sayılmaz", () => {
    render(<Panel />);
    duzenle("Isıl İşlem"); kaydet();
    expect(screen.queryByText(D.AD_AYNI_HATASI)).toBeNull();
    expect(denetim.kayitlar.at(-1)).toMatchObject({ action: "duzenlendi", entity: "dis_islem" });
  });
  it("AC-6: birim seçicisi iki değerli, yeni kayıtta adet seçili", () => {
    render(<Panel />);
    yeni();
    const s = alan("Birim");
    expect([...s.options].map(o => o.value)).toEqual(["adet", "kilo"]);
    expect(s.value).toBe("adet");
  });
  it("AC-7 / AC-69 / AC-85 / AC-134: TL'de para birimi ve boş alanlar kayda yazılmaz; denetim izi dis_islem ile", () => {
    render(<Panel d0={[]} />);
    yeni(); yaz("İşlem adı", "Toz boya"); yaz("Birim fiyatı", "15,5"); kaydet();
    const k = durum.disIslemler[0];
    expect(Object.keys(k).sort()).toEqual(["ad", "birim", "birimFiyati", "id"]);
    expect(denetim.kayitlar[0]).toMatchObject({ action: "olusturuldu", entity: "dis_islem", entityName: "Toz boya" });
  });
  it("AC-8 / AC-9: USD'de kur boşsa red (neden kur alanında); EUR 48 ile 12 kaydedilir ve listede \"12,00 €\"", () => {
    render(<Panel d0={[]} rates={null} />);
    yeni(); yaz("İşlem adı", "Kaplama"); yaz("Fiyatın para birimi", "USD"); yaz("Birim fiyatı", "3"); kaydet();
    expect(screen.getByText(D.EKSIK_KUR_HATASI)).toBeTruthy();
    yaz("Fiyatın para birimi", "EUR"); yaz("Kur", "48"); yaz("Birim fiyatı", "12"); kaydet();
    expect(durum.disIslemler[0]).toMatchObject({ paraBirimi: "EUR", kur: 48, birimFiyati: 12 });
    expect(within(satir("Kaplama")).getByTestId("dis-islem-fiyat").textContent).toMatch(/^12,00 €/);
  });
  it("AC-10 / AC-11: belirsiz ve negatif birim fiyatı reddedilir", () => {
    render(<Panel d0={[]} />);
    yeni(); yaz("İşlem adı", "X"); yaz("Birim fiyatı", "2.955"); kaydet();
    expect(screen.getByText(BELIRSIZ_HATASI)).toBeTruthy();
    yaz("Birim fiyatı", "-4"); kaydet();
    expect(screen.getByText(D.NEGATIF_HATASI)).toBeTruthy();
    expect(durum.disIslemler).toHaveLength(0);
  });
  it("AC-12: gider yetkisiyle tedarikçi seçicisi çizilir; hammadde işaretli başta", () => {
    render(<Panel />);
    yeni();
    expect([...alan("Tedarikçi").options].map(o => o.textContent)).toEqual(["Seçilmedi", "Mahir Isıl İşlem · hammadde", "Beta Metal", "Zeta Kaplama"]);
  });
  it("AC-13: yetkisiz kullanıcıda seçici yok; kaydedince tedarikçi bağı aynen korunur", () => {
    render(<Panel giderYetki={false} />);
    duzenle("Isıl İşlem");
    expect(screen.queryByLabelText("Tedarikçi")).toBeNull();
    yaz("İşlem adı", "Isıl İşlem (sertleştirme)"); kaydet();
    expect(durum.disIslemler.find(m => m.id === 701)).toMatchObject({ ad: "Isıl İşlem (sertleştirme)", tedarikciId: 12 });
  });
  it("AC-14: düzenleme kaydı birim fiyatı, para birimi ve kuru değiştirmez", () => {
    render(<Panel />);
    duzenle("Lazer");
    expect(screen.queryByLabelText("Birim fiyatı")).toBeNull();
    expect(screen.getByTestId("dis-islem-fiyat-ozeti")).toBeTruthy();
    yaz("İşlem adı", "Lazer kesim"); kaydet();
    expect(durum.disIslemler.find(m => m.id === 703)).toMatchObject({ ad: "Lazer kesim", birimFiyati: 2, paraBirimi: "USD", kur: 50 });
  });
  it("AC-116: başlıkta fiyatı girilmemiş işlem sayısı; hepsinin fiyatı varsa rozet yok", () => {
    render(<Panel />);
    expect(screen.getByTestId("dis-islem-eksik-sayisi").textContent).toContain(D.eksikSayiMetni(1));
    expect(within(satir("Kama açma")).getByTestId("dis-islem-eksik")).toBeTruthy();
    cleanup();
    render(<Panel d0={[ISIL, GALV]} />);
    expect(screen.queryByTestId("dis-islem-eksik-sayisi")).toBeNull();
  });
  it("AC-117: satırda kaç parçanın maliyet kaleminde geçtiği yazar (çöpteki parça ayrıca)", () => {
    render(<Panel />);
    expect(within(satir("Isıl İşlem")).getByTestId("dis-islem-kullanim").textContent).toBe("1 parçanın maliyet kaleminde kullanılıyor.");
    expect(within(satir("Galvano")).getByTestId("dis-islem-kullanim").textContent).toBe("0 parçanın maliyet kaleminde kullanılıyor (1 parça çöpte).");
    expect(within(satir("Lazer")).getByTestId("dis-islem-kullanim").textContent).toBe("Hiçbir parçanın maliyet kaleminde kullanılmıyor.");
  });
  it("AC-118 / AC-55: çöpe atma onayı kullanım sayısını ve \"girilmedi olur\" uyarısını yazar; çöpe atma koşulsuz damgadır", () => {
    render(<Panel />);
    fireEvent.click(screen.getByRole("button", { name: "Isıl İşlem sil" }));
    const m = screen.getByTestId("dis-islem-sil-kullanim").textContent;
    expect(m).toContain("1 parçanın maliyet kaleminde kullanılıyor.");
    expect(m).toContain("\"girilmedi\" olur");
    fireEvent.click(screen.getByRole("button", { name: /Evet|Sil/ }));
    expect(durum.disIslemler.find(x => x.id === 701).deletedAt).toBeTruthy();
    expect(denetim.kayitlar.at(-1)).toMatchObject({ action: "silindi", entity: "dis_islem" });
  });
  it("AC-119: kullanılan işlemin birimi pasif ve nedenli (çöpteki parça da sayılır); kullanılmayanda etkin", () => {
    render(<Panel />);
    duzenle("Galvano");
    expect(alan("Birim").disabled).toBe(true);
    expect(screen.getByTestId("birim-kilit-nedeni").textContent).toBe(D.birimKilitNedeni({ canli: 0, cop: 1 }));
    fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
    duzenle("Lazer");
    expect(alan("Birim").disabled).toBe(false);
    yaz("Birim", "kilo"); kaydet();
    expect(durum.disIslemler.find(m => m.id === 703).birim).toBe("kilo");
    expect(durum.disIslemler.find(m => m.id === 703).fiyatGecmisi).toBeUndefined(); // AC-128 (ekran)
  });
  it("AC-24 / AC-133 / AC-78: panel ayar:disislemler kilidiyle, başkası tutuyorsa kilit uyarısı; iki dosya kilit listesinde", () => {
    expect(AYAR_KILITLI.disislemler).toBe("Dış İşlemler");
    expect(KILIT_ALANLARI.ayar.pencereler).toEqual(expect.arrayContaining(["src/components/DisIslemManager.jsx", "src/components/DisIslemFiyatPenceresi.jsx"]));
    window.crmLocks = { acquire: vi.fn(async () => ({ ok: false, locked_by: "ayse" })), release: vi.fn(), heartbeat: vi.fn(), list: vi.fn(async () => []), forceAcquire: vi.fn() };
    render(<Panel />);
    return screen.findByTestId("ayar-kilitli").then(el => {
      expect(el).toBeTruthy();
      expect(window.crmLocks.acquire.mock.calls.map(c => c.slice(0, 2))).toContainEqual(["ayar", "disislemler"]);
      expect(screen.queryByTestId("dis-islem-satiri")).toBeNull();
    });
  });
});

describe("Spec 0137: fiyat güncelleme penceresi", () => {
  const ac = (ad) => fireEvent.click(within(satir(ad)).getByRole("button", { name: "Fiyatı Güncelle" }));
  const kaydetF = () => fireEvent.click(screen.getByRole("button", { name: "Fiyatı Kaydet" }));
  it("AC-15 / AC-16: kayıtlı kurla açılır; günün kuru ipucunda ve düğmeyle gelir", () => {
    render(<Panel />);
    ac("Lazer");
    expect(screen.getByText(FIYAT_PENCERE_BASLIGI)).toBeTruthy();
    expect(alan("Kur").value).toBe("50");
    expect(screen.getByTestId("kur-oneri").textContent).toContain("42,15");
    fireEvent.click(screen.getByRole("button", { name: GUNUN_KURU_DUGMESI }));
    expect(alan("Kur").value).toBe("42,15");
  });
  it("AC-17: günün kuru alınamadıysa iki ayrı neden; kayıt engellenmez", () => {
    render(<Panel rates={null} />);
    ac("Lazer");
    expect(screen.getByTestId("kur-neden").textContent).toBe(KUR_ALINMADI);
    yaz("Birim fiyatı", "3"); kaydetF();
    expect(durum.disIslemler.find(m => m.id === 703)).toMatchObject({ birimFiyati: 3, kur: 50 });
    cleanup();
    render(<Panel rates={null} ratesErr />);
    ac("Lazer");
    expect(screen.getByTestId("kur-neden").textContent).toBe(KUR_CEVRIMDISI);
  });
  it("AC-18 / AC-127 / AC-79: 20 → 25 TL kaydetmeden önce etkilenen parça ve maliyet değişimi, satış fiyatı satırı; pencere panelin kilidini paylaşır", () => {
    const parts = [...PARCA, { id: 44, ad: "Burç", models: [], maliyetKalemleri: [{ tur: "islem", islemId: 701, miktar: 1 }] }];
    render(<Panel parts={parts} />);
    ac("Isıl İşlem");
    yaz("Birim fiyatı", "25");
    expect(screen.getByTestId("fiyat-etki-metni").textContent).toBe("2 parçanın maliyeti değişecek (2 bağlı parça).");
    expect(screen.getAllByTestId("fiyat-etki-satiri").map(r => r.textContent)).toEqual([
      expect.stringMatching(/Pim40,00 ₺50,00 ₺/), expect.stringMatching(/Burç20,00 ₺25,00 ₺/)]);
    expect(screen.getByTestId("fiyat-etki-satis").textContent).toBe("1 parçanın satış fiyatı değişecek.");
    // Pencere ayrı kilit almaz: Settings'in `ayar:disislemler` kilidi altında çizilir (kilit alanı listesinde aynı alan).
    expect(KILIT_ALANLARI.ayar.pencereler).toContain("src/components/DisIslemFiyatPenceresi.jsx");
  });
  it("AC-19: bağlı parçası olmayan işlemde sıfır parça yazar; kayıt yapılabilir", () => {
    render(<Panel />);
    ac("Lazer");
    yaz("Birim fiyatı", "3");
    expect(screen.getByTestId("fiyat-etki-metni").textContent).toBe(BAGLI_PARCA_YOK);
    kaydetF();
    expect(durum.disIslemler.find(m => m.id === 703).birimFiyati).toBe(3);
    expect(denetim.kayitlar.at(-1)).toMatchObject({ action: "fiyat_guncellendi", entity: "dis_islem" });
  });
  it("AC-21 / AC-24 (ekran): gelecek tarih reddedilir; geçerli tarihte geçmiş eski kümeyle doğar", () => {
    render(<Panel />);
    ac("Isıl İşlem");
    yaz("Birim fiyatı", "25");
    const yarin = new Date(); yarin.setDate(yarin.getDate() + 1);
    yaz("Geçerlilik tarihi", yarin.toISOString().slice(0, 10)); kaydetF();
    expect(screen.getByText(TARIH_GELECEK_HATASI)).toBeTruthy();
    yaz("Geçerlilik tarihi", yerelBugun()); kaydetF();
    const k = durum.disIslemler.find(m => m.id === 701);
    expect(k.birimFiyati).toBe(25);
    expect(k.fiyatGecmisi).toEqual([{ birimFiyati: 20, paraBirimi: "TRY", gecerli: "" }, { birimFiyati: 25, paraBirimi: "TRY", gecerli: yerelBugun() }]);
  });
  it("AC-20 (ekran): fiyatı ilk kez girilen işlemde geçmiş doğmaz", () => {
    render(<Panel />);
    ac("Kama açma"); yaz("Birim fiyatı", "12"); kaydetF();
    expect(durum.disIslemler.find(m => m.id === 704)).toMatchObject({ birimFiyati: 12 });
    expect(durum.disIslemler.find(m => m.id === 704).fiyatGecmisi).toBeUndefined();
  });
});

describe("Spec 0137: çöp kutusu", () => {
  const COP = "2026-10-20T09:00:00.000Z";
  const toast = vi.fn();
  afterEach(() => toast.mockClear());
  function Cop({ d0, parts = PARCA, t0 = [] }) {
    const [disIslemler, setDisIslemler] = useState(structuredClone(d0));
    const [ted, setTed] = useState(structuredClone(t0));
    durum = { disIslemler, ted };
    return <SettingsTrash rawDisIslemler={disIslemler} setDisIslemler={setDisIslemler} rawParts={parts} showToast={toast}
      rawTedarikciler={ted} setTedarikciler={setTed} giderYetki serverPermissions={null} rawUretimPartileri={[]} setUretimPartileri={vi.fn()}
      rawCustomers={[]} rawServices={[]} rawPartSales={[]} rawPayments={[]} rawDealers={[]} rawStock={[]} rawNotes={[]} rawKalipDefs={[]} rawCustomModels={[]}
      rawTeklifler={[]} rawFaturalar={[]} rawUretimFormlari={[]} setCustomers={vi.fn()} setServices={vi.fn()} setPartSales={vi.fn()} setPayments={vi.fn()}
      setDealers={vi.fn()} setStock={vi.fn()} setNotes={vi.fn()} setKalipDefs={vi.fn()} setParts={vi.fn()} setCustomModels={vi.fn()} appSettings={{}} />;
  }
  const copSatiri = (metin) => screen.getAllByText(metin)[0].closest("tr");
  it("AC-114 / AC-129: ham dizi verildiği için çöpteki işlem çizilir; etiket \"ad · birim\", tedarikçi adı yok", () => {
    render(<Cop d0={[{ ...ISIL, deletedAt: COP }]} parts={[]} t0={TED} />);
    const r = copSatiri("Isıl İşlem · adet");
    expect(r.textContent).not.toContain("Mahir");
  });
  it("AC-56: parçanın kaleminde geçen işlem kalıcı silinmez; düğme kalır, neden satırda, onayda hata", () => {
    render(<Cop d0={[{ ...ISIL, deletedAt: COP }]} />);
    const r = copSatiri("Isıl İşlem · adet");
    expect(r.textContent).toContain(D.KALEMDE_ISLEM_NEDENI);
    fireEvent.click(within(r).getByRole("button", { name: /Kalıcı Sil/ }));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Sil/ }));
    expect(durum.disIslemler).toHaveLength(1);
    expect(toast.mock.calls.some(c => c[0] === D.KALEMDE_ISLEM_RED)).toBe(true);
  });
  it("AC-59: yalnız çöpteki bir parçanın kaleminde geçen işlem de korunur", () => {
    render(<Cop d0={[{ ...GALV, deletedAt: COP }]} />);
    expect(copSatiri("Galvano · kilo").textContent).toContain(D.KALEMDE_ISLEM_NEDENI);
  });
  it("AC-60: hiçbir parçada geçmeyen çöpteki işlem kalıcı silinir", () => {
    render(<Cop d0={[{ ...LAZER, deletedAt: COP }]} />);
    fireEvent.click(within(copSatiri("Lazer · adet")).getByRole("button", { name: /Kalıcı Sil/ }));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Sil/ }));
    expect(durum.disIslemler).toHaveLength(0);
  });
  it("AC-57: çöpü boşaltmak canlı parçada geçen işlemi bırakır ve bildirim sayıyı yazar", () => {
    render(<Cop d0={[{ ...ISIL, deletedAt: COP }, { ...LAZER, deletedAt: COP }]} />);
    fireEvent.click(screen.getByRole("button", { name: /Çöp Kutusunu Boşalt/ }));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Sil/ }));
    expect(durum.disIslemler.map(m => m.id)).toEqual([701]);
    expect(toast.mock.calls.at(-1)[0]).toContain("1 dış işlem çöpte bırakıldı");
  });
  it("AC-61: aynı adda canlı işlem varken geri alınmaz ve nedeni yazar; yoksa geri alınır", () => {
    render(<Cop d0={[{ id: 801, ad: "galvano", birim: "kilo", deletedAt: COP }, GALV]} parts={[]} />);
    fireEvent.click(within(copSatiri("galvano · kilo")).getByRole("button", { name: /Geri Al/ }));
    expect(durum.disIslemler.find(m => m.id === 801).deletedAt).toBe(COP);
    expect(toast.mock.calls.at(-1)[0]).toMatch(/Geri alınamadı/);
    cleanup();
    render(<Cop d0={[{ id: 801, ad: "Eloksal", birim: "adet", deletedAt: COP }]} parts={[]} />);
    fireEvent.click(within(copSatiri("Eloksal · adet")).getByRole("button", { name: /Geri Al/ }));
    expect(durum.disIslemler[0].deletedAt).toBeUndefined();
  });
  it("AC-131 / AC-132 (Kalıcı Sil ve çöpü boşalt): katalog işleminin tedarikçisi korunur, neden iki adresi söyler", () => {
    render(<Cop d0={[{ ...ISIL, tedarikciId: 13 }]} parts={[]} t0={[{ id: 13, ad: "Beta Metal", deletedAt: COP }, { id: 14, ad: "Boştaki", deletedAt: COP }]} />);
    const r = copSatiri("Beta Metal");
    expect(within(r).getByTestId("cop-neden").textContent).toBe(KALEMDE_VE_KATALOGDA_TEDARIKCI_NEDENI);
    expect(within(r).queryByRole("button", { name: /Kalıcı Sil/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Çöp Kutusunu Boşalt/ }));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Sil/ }));
    expect(durum.ted.map(t => t.id)).toEqual([13]);
  });
});

describe("Spec 0137: Tedarikler (R22, R22/2)", () => {
  function TedH({ t0, disIslemler }) {
    const [ted, setTed] = useState(t0);
    return <Tedarikciler tedarikciler={ted} setTedarikciler={setTed} giderler={[]} giderTanimlari={[]} rapor={null} hesapHareketleri={[]} parts={[]} disIslemler={disIslemler} />;
  }
  it("AC-62 / AC-63 / AC-131 (silme düğmesi): katalog işleminin tedarikçisi kullanım sayısına girer, silinemez ve neden iki adresi söyler", () => {
    render(<TedH t0={[{ id: 12, ad: "Mahir Isıl İşlem" }, { id: 15, ad: "Boştaki" }]} disIslemler={[ISIL, { ...GALV, tedarikciId: 12, deletedAt: "x" }]} />);
    const hucre = (ad) => within(screen.getByText(ad).closest("tr")).getAllByRole("cell")[2].textContent;
    expect(hucre("Mahir Isıl İşlem")).toBe("2 dış işlemde (1’i çöpte)");
    expect(hucre("Boştaki")).toBe("Kullanılmıyor");
    fireEvent.click(within(screen.getByText("Mahir Isıl İşlem").closest("tr")).getByTitle("Sil"));
    expect(screen.getByText(/silinemez/)).toBeTruthy();
    expect(screen.getByTestId("tedarikci-islem-kullanim").textContent).toContain(KALEMDE_VE_KATALOGDA_TEDARIKCI_NEDENI);
  });
});

// Triyaj (bulgu 1): malzeme zammının etki önizlemesi ekranda da karma parçayı sayar (R32, AC-109). Motor testi tek başına yetmiyordu:
// Settings listeyi panele verdiği hâlde panel ve pencere onu iletmiyordu.
describe("Spec 0137 triyaj: malzeme zammı penceresi (R32)", () => {
  const LAMA_M = { id: 501, ad: "St37 Lama", ozgulAgirlik: 8, kiloFiyati: 50 };
  const KARMA = { id: 51, ad: "Galvanizli lama", models: [], maliyetKalemleri: [
    { tur: "malzeme", malzemeId: 501, bicim: "lama", kalinlik: 10, genislik: 100, boy: 250, adet: 1 }, { tur: "islem", islemId: 701, miktar: 1 }] };
  function MalzemePanel({ disIslemler = [ISIL] }) {
    const [malzemeler, setMalzemeler] = useState([LAMA_M]);
    return <Settings {...BASE} initialTab="malzemeler" malzemeler={malzemeler} setMalzemeler={setMalzemeler} rawMalzemeler={malzemeler}
      parts={[KARMA]} rawParts={[KARMA]} rates={null} tedarikciler={TED} setTedarikciler={vi.fn()} giderYetki
      disIslemler={disIslemler} rawDisIslemler={disIslemler} />;
  }
  it("AC-109 (ekran): hem malzeme hem katalog işlem kalemi taşıyan parça \"maliyeti değişecek\" sayısına ve örnek satırlara girer", () => {
    render(<MalzemePanel />);
    fireEvent.click(within(screen.getAllByTestId("malzeme-satiri")[0]).getByRole("button", { name: "Fiyatı Güncelle" }));
    yaz("Kilo fiyatı", "60");
    expect(screen.getByTestId("fiyat-etki-metni").textContent).toBe("1 parçanın maliyeti değişecek (1 bağlı parça).");
    const satirlar = screen.getAllByTestId("fiyat-etki-satiri");
    expect(satirlar).toHaveLength(1);
    // 2 kg × 50 + 20 = 120 TL → 2 kg × 60 + 20 = 140 TL (lama payı ve firesi yok)
    expect(satirlar[0].textContent).toMatch(/Galvanizli lama120,00 ₺140,00 ₺/);
    expect(screen.getByTestId("fiyat-etki-satis").textContent).toBe("Satış fiyatı değişecek parça yok (bağlı parçaların fiyatı elle sabit).");
  });
});
