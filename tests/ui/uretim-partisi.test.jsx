// @vitest-environment jsdom
// Spec 0022: üretim partisi, arayüz (Makina Maliyeti › Üretim Partileri, stok formu, satış damgası, dönen stok, maliyet
// detayı, kârlılık listesi, Makina ve Model uyarısı). Spec 0089 ile (C7 0022 AC-11, AC-16; 0088 R24/2): parti değişim kutusu
// Makina Maliyeti › Üretim Partileri'ne taşındı (0089 R11); maliyet detayı ve kârlılık listesi ekrandan kalktı, parti ve geçici
// bilgisi motorun makina sonucunda ölçülür; stokta taşınan maliyetin parti kırılımı kalktı (0089 envanteri).
// Spec 0090 ile (R21, R27, C7): ekran parti payını kendi kurduğu yeni hesaptan (partiGenelPaylari) gösterir, makinaMaliyet prop'u
// yok; kapanış anlık görüntüsü kapanisGenelHavuzlari'na yazılır, kapanisOrtaklari yazılmaz; para kuruşlu. Türe "genel" rolü
// verildi (rolsüz tür yeni hesapta maliyete girmez); bugünkü motorun testleri (son blok) bu rolü okumaz.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
// Spec 0088 ile (R23, C14): parti yönetimi Giderler'den Makina Maliyeti ekranına taşındı; düzenek yeni ekranı çizer,
// kayıt alanları, doğrulama metinleri, kapanış görüntüsü ve izin aynen (AC-34, AC-37).
import { MakinaMaliyeti } from "../../src/components/MakinaMaliyeti";
import { Customers } from "../../src/components/Customers";
import { MakinaStokTab } from "../../src/components/stock/MakinaStokTab";
import { hesaplaMakinaMaliyetleri, makinaKarlilik } from "../../src/lib/makinaMaliyeti";
import { partiKapanisUygula } from "../../src/lib/uretimPartisi";
import { partiGenelPaylari } from "../../src/lib/makinaStandartMaliyet";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

const TUR = [{ id: 4, ad: "Elektrik", davranis: "normal", maliyetRolu: "genel" }];
const AYAR = { giderAyarlari: { yururlukAy: "2026-01" } };
const maliyet = ({ stock = [], customers = [], giderler = [], uretimPartileri = [] }) => hesaplaMakinaMaliyetleri({ customers, stock, partStockLog: [], giderler, giderTurleri: TUR,
  standardModels: [{ model: "AK100" }], customModels: [], giderAyarlari: AYAR.giderAyarlari, uretimPartileri }, { bugun: "2026-09-23" });
const gid = (id, tarih, tutar) => ({ id, tarih, turId: 4, tutar, kdvOrani: 0, odendi: false });
const stk = (id, o = {}) => ({ id, model: "AK100", serialNo: `T${id}`, addedDate: "2026-03-10", ...o });

function GiderHarness({ p0 = [], stock = [], customers = [], giderler = [], perms = null, onState }) {
  const [uretimPartileri, setUretimPartileri] = useState(p0);
  onState?.({ uretimPartileri });
  return <MakinaMaliyeti giderler={giderler} giderTurleri={TUR} setGiderTurleri={vi.fn()} tedarikciler={[]}
    uretimPartileri={uretimPartileri} setUretimPartileri={setUretimPartileri} stock={stock} customers={customers} parts={[]}
    standardModels={[{ model: "AK100" }]} customModels={[]} setStandardModels={vi.fn()} setCustomModels={vi.fn()} appSettings={AYAR} setAppSettings={vi.fn()}
    serverPermissions={perms} showToast={vi.fn()} tumMusteriler={customers} />;
}
const partilerSekmesi = () => fireEvent.click(screen.getByRole("radio", { name: "Üretim Partileri" }));
const yeniParti = (ad, bas, bit) => {
  fireEvent.click(screen.getByText("Yeni Üretim Partisi"));
  fireEvent.change(screen.getByLabelText("Parti adı"), { target: { value: ad } });
  fireEvent.change(screen.getByLabelText("Başlangıç ayı"), { target: { value: bas } });
  if (bit) fireEvent.change(screen.getByLabelText("Bitiş ayı"), { target: { value: bit } });
  fireEvent.click(screen.getByText("Kaydet"));
};

describe("Makina Maliyeti › Üretim Partileri (R1, R11, C5; spec 0088 AC-34, AC-37)", () => {
  it("AC-1: ad, başlangıç ayı ve açıklamayla parti oluşturulur ve listede açık olarak görünür", () => {
    let st;
    render(<GiderHarness onState={s => { st = s; }} />);
    partilerSekmesi();
    expect(screen.getByTestId("bos-uretim-partileri")).toBeTruthy();
    fireEvent.click(screen.getByText("Yeni Üretim Partisi"));
    fireEvent.change(screen.getByLabelText("Parti adı"), { target: { value: "2026 Bahar" } });
    fireEvent.change(screen.getByLabelText("Başlangıç ayı"), { target: { value: "2026-07" } });
    fireEvent.change(screen.getByLabelText("Açıklama"), { target: { value: "70 makina" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.uretimPartileri).toEqual([expect.objectContaining({ ad: "2026 Bahar", baslangicAy: "2026-07", bitisAy: null, aciklama: "70 makina" })]);
    expect(st.uretimPartileri[0]).not.toHaveProperty("kapanisOrtaklari"); // spec 0090 C7
    expect(st.uretimPartileri[0]).not.toHaveProperty("kapanisGenelHavuzlari"); // açık parti görüntü taşımaz
    const satir = screen.getByTestId("parti-satiri");
    expect(within(satir).getByText("Açık · geçici")).toBeTruthy();
    expect(within(satir).getByText(/Bağlı makina yok/)).toBeTruthy(); // P5
  });
  it("AC-22 / AC-23: aynı ad ve bitiş < başlangıç reddedilir, neden gösterilir", () => {
    let st;
    render(<GiderHarness p0={[{ id: 1, ad: "İlk Parti", baslangicAy: "2026-01", bitisAy: null }]} onState={s => { st = s; }} />);
    partilerSekmesi();
    yeniParti("ilk parti", "2026-02");
    expect(screen.getByText("“ilk parti” adında bir parti zaten var.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Parti adı"), { target: { value: "İkinci" } });
    fireEvent.change(screen.getByLabelText("Başlangıç ayı"), { target: { value: "2026-05" } });
    fireEvent.change(screen.getByLabelText("Bitiş ayı"), { target: { value: "2026-04" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(screen.getByText("Bitiş ayı başlangıç ayından önce olamaz.")).toBeTruthy();
    expect(st.uretimPartileri).toHaveLength(1);
  });
  it("R8 / R15 (spec 0090 ile): bitiş ayı girilince parti kapanır, kapanıştaki aylık genel havuzlar yazılır; listede havuz ve makina başı pay", () => {
    let st;
    const stock = [stk(1, { partiId: 1 }), stk(2, { partiId: 1 })];
    render(<GiderHarness p0={[{ id: 1, ad: "Q1", baslangicAy: "2026-01", bitisAy: null }]} stock={stock} giderler={[gid(1, "2026-01-10", 1000), gid(2, "2026-02-10", 3000)]} onState={s => { st = s; }} />);
    partilerSekmesi();
    const satir = () => screen.getByTestId("parti-satiri");
    expect(within(satir()).getByText("2")).toBeTruthy();
    fireEvent.click(within(satir()).getByTitle("Düzenle"));
    fireEvent.change(screen.getByLabelText("Bitiş ayı"), { target: { value: "2026-02" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.uretimPartileri[0]).toMatchObject({ bitisAy: "2026-02", kapanmaZamani: "2026-09-23T10:00:00", kapanisGenelHavuzlari: { "2026-01": 100000, "2026-02": 300000 } });
    expect(st.uretimPartileri[0]).not.toHaveProperty("kapanisOrtaklari");
    expect(within(satir()).getByText("Kapalı")).toBeTruthy();
    expect(within(satir()).getByTestId("parti-havuz").textContent).toMatch(/^4\.000,00 ₺/);
    expect(within(satir()).getByTestId("parti-makina-basi").textContent).toBe("2.000,00 ₺");
  });
  it("AC-14: silme onayında etkilenen makina sayısı yazar; silinince liste boşalır (spec 0068 R9 ile güncellendi: çöp kutusuna taşınır)", () => {
    let st;
    render(<GiderHarness p0={[{ id: 1, ad: "Silinecek", baslangicAy: "2026-01", bitisAy: "2026-02" }]} stock={[stk(1, { partiId: 1 }), stk(2, { partiId: 1 })]}
      customers={[{ id: 9, name: "F", model: "AK100", partiId: 1, installDate: "2026-04-01" }]} onState={s => { st = s; }} />);
    partilerSekmesi();
    fireEvent.click(within(screen.getByTestId("parti-satiri")).getByTitle("Sil"));
    expect(screen.getByText(/3 makina bu partiye bağlı; parti çöpteyken bu makinaların ortak gider payı üretildikleri ayın kuralına döner, geri alınınca parti dağıtımı geri gelir/)).toBeTruthy();
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(st.uretimPartileri).toEqual([expect.objectContaining({ id: 1, deletedAt: expect.any(String) })]);
    expect(screen.queryByTestId("parti-satiri")).toBeNull();
  });
  it("C5: gider_tanim yoksa parti ekleme, düzenleme ve silme düğmeleri çizilmez", () => {
    const perms = { role: "user", permissions: JSON.stringify({ tabs: ["gider"], giderActions: ["gider_add", "gider_edit"] }) };
    render(<GiderHarness p0={[{ id: 1, ad: "P", baslangicAy: "2026-01", bitisAy: null }]} perms={perms} />);
    partilerSekmesi();
    expect(screen.queryByText("Yeni Üretim Partisi")).toBeNull();
    expect(within(screen.getByTestId("parti-satiri")).queryByTitle("Düzenle")).toBeNull();
    expect(within(screen.getByTestId("parti-satiri")).queryByTitle("Sil")).toBeNull();
  });
  it("AC-11 (spec 0089 ile, 0089 R11; spec 0090 ile yeni hesap): kapanmış partinin ayında genel gider değişince Makina Maliyeti › Üretim Partileri'nde satır görünür (pencere yok)", () => {
    const stock = [stk(1, { partiId: 1 })];
    const kapanis = partiGenelPaylari({ giderler: [gid(1, "2026-01-10", 1000)], giderTurleri: TUR, tedarikciler: [], stock, customers: [], partStockLog: [], uretimPartileri: [], yururlukAy: "2026-01" }, "2026-09-23");
    const { kayit: kapali } = partiKapanisUygula(null, { id: 1, ad: "Q1", baslangicAy: "2026-01", bitisAy: "2026-01" }, { aylar: kapanis.aylar, yururlukAy: kapanis.yururlukAy }, "2026-02-01T10:00:00");
    expect(kapali.kapanisGenelHavuzlari).toEqual({ "2026-01": 100000 });
    render(<GiderHarness p0={[kapali]} stock={stock} giderler={[gid(1, "2026-01-10", 1000), gid(2, "2026-01-20", 250)]} />);
    partilerSekmesi();
    const kutu = screen.getByTestId("parti-degisimleri");
    expect(kutu.textContent).toMatch(/Kapanmış partilerin aylarında değişen ortak gider/);
    expect(kutu.textContent).toMatch(/Q1.*kapanışta 1\.000,00 ₺, bugün 1\.250,00 ₺/);
  });
});

describe("Stok formu: makinayı partiye bağlama (R2, P7)", () => {
  const PARTILER = [{ id: 5, ad: "2026-1", baslangicAy: "2026-01", bitisAy: null }];
  const ciz = (o = {}) => {
    const durum = { stock: o.stock || [] };
    const setStock = vi.fn(u => { durum.stock = typeof u === "function" ? u(durum.stock) : u; });
    render(<MakinaStokTab stock={durum.stock} setStock={setStock} models={[{ model: "AK100" }]} showToast={vi.fn()} setPartStock={vi.fn()} setPartStockLog={vi.fn()} uretimPartileri={PARTILER} giderYetki {...o} />);
    return durum;
  };
  it("AC-2: stoğa eklenen makina partiye bağlanır; listede parti adı görünür", () => {
    const durum = ciz();
    fireEvent.click(screen.getAllByText("Stoğa Makina Ekle")[0]);
    const modelSec = screen.getAllByRole("combobox").find(x => [...x.options].some(o => o.textContent === "Model seçin..."));
    fireEvent.change(modelSec, { target: { value: "AK100" } });
    fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: "5" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(durum.stock[0]).toMatchObject({ model: "AK100", partiId: 5 });
    cleanup();
    ciz({ stock: durum.stock });
    expect(screen.getByText("Parti: 2026-1")).toBeTruthy();
  });
  it("P7: gider yetkisi yoksa parti seçici çizilmez; düzenleme mevcut bağı korur", () => {
    const durum = ciz({ giderYetki: false, stock: [stk(1, { partiId: 5 })] });
    fireEvent.click(screen.getAllByRole("button").find(b => b.className.includes("ghost") && b.querySelector("svg")));
    expect(screen.queryByLabelText("Üretim partisi")).toBeNull();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(durum.stock[0].partiId).toBe(5);
  });
});

describe("Satış ve dönüş (R2)", () => {
  function kur({ customers, stock = [] }) {
    const durum = { customers, stock, partStockLog: [], services: [], partSales: [], payments: [], partStock: [] };
    const setter = (k) => vi.fn((u) => { durum[k] = typeof u === "function" ? u(durum[k]) : u; });
    render(<Customers customers={durum.customers.filter(c => !c.deletedAt)} stock={durum.stock} partStockLog={[]} services={[]} partSales={[]} payments={[]} partStock={[]}
      giderYetki rates={{ usd: 41, eur: 45 }} setCustomers={setter("customers")} setStock={setter("stock")} setPartStockLog={setter("partStockLog")}
      setServices={setter("services")} setPartSales={setter("partSales")} setPayments={setter("payments")} setPartStock={setter("partStock")} />);
    return durum;
  }
  const satir = (ad) => screen.getByText(ad).closest("tr");
  it("AC-20: stoktan satışta parti bağı müşteri kaydına damgalanır", () => {
    const durum = kur({ customers: [{ id: 1, name: "Bekleyen Seri", model: "AK100", serialNo: "", seriNoBekliyor: true, installDate: "2026-05-01" }],
      stock: [stk(70, { serialNo: "T-70", partiId: 5 })] });
    fireEvent.click(within(satir("Bekleyen Seri")).getAllByRole("button").find(b => b.querySelector("svg") && b.className.includes("ghost")));
    fireEvent.change(screen.getByText(/Stoktan seçin/).closest("select"), { target: { value: "T-70" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(durum.customers[0]).toMatchObject({ sourceStockId: 70, partiId: 5, uretimTarihi: "2026-03-10" });
  });
  it("AC-21: silinen müşteriden stoğa dönen satır partisini korur", () => {
    const durum = kur({ customers: [{ id: 1, name: "Silinecek", model: "AK100", serialNo: "S-9", installDate: "2026-05-01", partiId: 5, uretimTarihi: "2026-03-01" }] });
    const d = within(satir("Silinecek")).getAllByRole("button");
    fireEvent.click(d[d.length - 1]);
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(durum.stock[0]).toMatchObject({ note: "Silinen müşteriden geri döndü", partiId: 5, uretimTarihi: "2026-03-01" });
  });
});

describe("Maliyet motoru: parti ve geçici (R7, R10; spec 0089 ile ekranlar kalktı)", () => {
  const ACIK = { id: 5, ad: "2026-1", baslangicAy: "2026-01", bitisAy: null };
  const KAPALI = { ...ACIK, bitisAy: "2026-03" };
  const musteri = { id: 1, name: "Firma", model: "AK100", serialNo: "S1", installDate: "2026-06-01", fabrikaSatisBedeli: 500000, currency: "TRY", uretimTarihi: "2026-03-01", partiId: 5 };
  it("AC-9 / AC-13 (spec 0089 ile): açık partide makina sonucu parti adını ve geçici işaretini taşır", () => {
    const d = makinaKarlilik(maliyet({ customers: [musteri], giderler: [gid(1, "2026-02-10", 1000)], uretimPartileri: [ACIK] }), "musteri:1");
    expect(d.parti).toMatchObject({ ad: "2026-1", adet: 1 });
    expect(d.gecici).toBe(true);
  });
  it("AC-10 (spec 0089 ile): kapalı partide geçici işareti yok", () => {
    const d = makinaKarlilik(maliyet({ customers: [musteri], giderler: [gid(1, "2026-02-10", 1000)], uretimPartileri: [KAPALI] }), "musteri:1");
    expect(d.parti).toMatchObject({ ad: "2026-1" });
    expect(d.gecici).toBe(false);
  });
  it("triyaj bulgu 2 (spec 0089 ile): başlamamış partinin makinası 'partiBaslamadi', yürürlük öncesi sayılmaz", () => {
    const GELECEK = { id: 6, ad: "Kasım", baslangicAy: "2026-11", bitisAy: null };
    const d = makinaKarlilik(maliyet({ stock: [stk(1, { partiId: 6 })], uretimPartileri: [GELECEK] }), "stok:1");
    expect(d.partiBaslamadi).toBe(true);
    expect(d.veriYok).toBeFalsy();
  });
  // Spec 0089 ile kaldırıldı (C7 0022 AC-16): kârlılık listesindeki parti rozeti ve "stokta taşınan maliyet" parti kırılımı
  // ekranla birlikte kalktı (0089 kayıp envanteri).
});
