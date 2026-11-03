// @vitest-environment jsdom
// Spec 0128: liste silmeleri, panonun tek alan işlemleri ve müşteri detayının Extra Kalıp işlemleri kaydın kilidine anlık
// bakar. Kilit listesi window.crmLocks.list()'ten gelir (useKilitListesi); "ofis" başka kullanıcı, "ben" aktif kullanıcıdır.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within, act } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";
import { SimpleDealers } from "../../src/components/SimpleDealers";
import { Notes } from "../../src/components/Notes";
import { Documents } from "../../src/components/Documents";
import { MakinaStokTab } from "../../src/components/stock/MakinaStokTab";
import { YedekParcaSatisTab } from "../../src/components/stock/YedekParcaSatisTab";
import { UretimFormu } from "../../src/components/stock/UretimFormu";
import { ServisPanosu } from "../../src/components/ServisPanosu";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); delete window.crmLocks; delete window.auditLog; });

const kilitler = (rows, ek = {}) => { window.crmLocks = { list: vi.fn(() => Promise.resolve(rows)), acquire: vi.fn(async () => ({ ok: true })), release: vi.fn(async () => ({})), ...ek }; };
const L = (entity_type, entity_id, locked_by = "ofis") => ({ entity_type, entity_id: String(entity_id), locked_by, locked_at: "2026-11-03T10:00:00" });
const otur = () => act(async () => {}); // kilit listesi duruma otursun
const sonDanger = (tr) => { const d = tr.querySelectorAll(".btn--danger"); fireEvent.click(d[d.length - 1]); };
const satirSil = (metin) => { const tr = screen.getAllByText(metin)[0].closest("tr"); const b = within(tr).getAllByRole("button"); fireEvent.click(b[b.length - 1]); };
const red = (toast, ad) => expect(toast).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`${ad}.*"ofis" tarafından düzenleniyor; işlem yapılmadı\\.`)), "err");

// ── A. Liste silmeleri ─────────────────────────────────────────────────────────────────────────────────────────────
function musteriKur(aktif = "ben") {
  const durum = {
    customers: [{ id: 500, name: "BAL KÖFTE", model: "AK100", serialNo: "S1" }],
    partSales: [{ id: 10, customerId: 500, tur: "Kalıp", ad: "Hamburger", batchId: 77 }, { id: 11, customerId: 500, tur: "Kalıp", ad: "Köfte", batchId: 77 }],
    yedekParcaSatislar: [{ id: 30, aliciTipi: "musteri", musteriId: 500, partId: "7", miktar: 1, batchId: 88, tahsisler: [] }, { id: 31, aliciTipi: "musteri", musteriId: 500, partId: "7", miktar: 1, batchId: 88, tahsisler: [] },
      // Triyaj: alıcısı bayi, bu makinaya tahsisli satış; kaskad tahsisini serbest metne çevirerek yazar.
      { id: 32, aliciTipi: "bayi", dealerId: 9, partId: "7", miktar: 3, tahsisler: [{ customerId: 500, miktar: 1 }] }],
  };
  const setters = Object.fromEntries(["setCustomers", "setServices", "setPartSales", "setPayments", "setYedekParcaSatislar", "setGorusmeler", "setDosyalar", "setPartStock", "setPartStockLog", "setStock"].map(k => [k, vi.fn()]));
  const showToast = vi.fn();
  render(<Customers customers={durum.customers} services={[]} partSales={durum.partSales} payments={[]} yedekParcaSatislar={durum.yedekParcaSatislar}
    gorusmeler={[]} dosyalar={[]} stock={[]} partStock={[]} partStockLog={[]} showToast={showToast} aktifKullanici={aktif} {...setters} />);
  return { setters, showToast };
}

describe("Spec 0128: müşteri listesinden silme (R1–R3)", () => {
  it("AC-1: başkası müşteriyi düzenlerken silme reddedilir, neden adla bildirilir, hiçbir kayıt çöpe atılmaz", async () => {
    kilitler([L("customer", 500)]);
    const { setters, showToast } = musteriKur();
    await otur();
    satirSil("BAL KÖFTE");
    fireEvent.click(screen.getByText("Evet, Sil"));
    for (const [k, f] of Object.entries(setters)) expect(f, k).not.toHaveBeenCalled();
    red(showToast, "Müşteri · BAL KÖFTE");
    expect(screen.queryByText("Evet, Sil")).toBeNull(); // Karar 21: onay penceresi kapanır
  });
  it("AC-2 / AC-5 / AC-25: kilit kendi kullanıcımızdaysa silme çalışır ve silme kilit tutmaz", async () => {
    kilitler([L("customer", 500, "ben")]);
    const { setters } = musteriKur("ben");
    await otur();
    satirSil("BAL KÖFTE");
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(setters.setCustomers).toHaveBeenCalled();
    expect(window.crmLocks.acquire).not.toHaveBeenCalled();
  });
  it("AC-20: kaskadın yedek parça çocuğu (partinin ikinci kaydı), Extra Kalıp çocuğu ya da tahsisini değiştirdiği bayi satışı kilitliyse silme reddedilir", async () => {
    for (const k of [L("yedek_parca", 31), L("part_sale", 11), L("yedek_parca", 32)]) {
      kilitler([k]);
      const { setters, showToast } = musteriKur();
      await otur();
      satirSil("BAL KÖFTE");
      fireEvent.click(screen.getByText("Evet, Sil"));
      expect(setters.setCustomers, k.entity_type).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('"ofis"'), "err");
      cleanup();
    }
  });
});

describe("Spec 0128: öteki liste silmeleri (AC-3, AC-4)", () => {
  it("AC-3: bayi (ve alıcısı o bayi olan yedek parça satışı) kilitliyken silinmez; kendi kilidiyle silinir", async () => {
    const yp = [{ id: 700, aliciTipi: "bayi", dealerId: 3, partId: "7", miktar: 1, tahsisler: [] }];
    for (const [rows, siler] of [[[L("dealer", 3)], false], [[L("yedek_parca", 700)], false], [[L("dealer", 3, "ben")], true]]) {
      kilitler(rows);
      const setDealers = vi.fn(); const showToast = vi.fn();
      render(<SimpleDealers dealers={[{ id: 3, name: "Ege Bayi", bayiMi: true }]} setDealers={setDealers} factory={{ name: "A" }} setFactory={vi.fn()} geoData={null} loadingGeo={false}
        yedekParcaSatislar={yp} setYedekParcaSatislar={vi.fn()} setPartStock={vi.fn()} setPartStockLog={vi.fn()} showToast={showToast} aktifKullanici="ben" />);
      await otur();
      satirSil("Ege Bayi");
      fireEvent.click(screen.getByText("Evet, Sil"));
      expect(setDealers.mock.calls.length > 0, JSON.stringify(rows)).toBe(siler);
      if (!siler) red(showToast, "Bayi · Ege Bayi|Yedek parça satışı · Ege Bayi");
      cleanup();
    }
  });
  it("AC-3: not kilitliyken silinmez", async () => {
    kilitler([L("note", 5)]);
    const setNotes = vi.fn(); const showToast = vi.fn();
    render(<Notes notes={[{ id: 5, content: "Toplantı notu\nayrıntı", createdAt: "2026-11-01" }]} setNotes={setNotes} showToast={showToast} aktifKullanici="ben" />);
    await otur();
    fireEvent.click(screen.getByTitle("Notu sil"));
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(setNotes).not.toHaveBeenCalled();
    red(showToast, "Not · Toplantı notu");
  });
  it("AC-3: teklif ve proforma (teklif alanı) ile fatura (fatura alanı) kilitliyken silinmez", async () => {
    kilitler([L("teklif", 900), L("fatura", 950)]);
    const setTeklifler = vi.fn(); const setFaturalar = vi.fn(); const showToast = vi.fn();
    render(<Documents teklifler={[{ id: 900, type: "teklif", no: "2026-00001", tarih: "2026-09-20", firma: "Kutu Gıda", durum: "taslak", satirlar: [] }]} setTeklifler={setTeklifler}
      faturalar={[{ id: 950, no: "F-1", tarih: "2026-09-21", firma: "Ihracat Ltd", satirlar: [] }]} setFaturalar={setFaturalar} customers={[]} partSales={[]} allModels={[]}
      factory={{ name: "A" }} appSettings={{}} showToast={showToast} kalipDefs={[]} parts={[]} dealers={[]} yedekParcaSatislar={[]} aktifKullanici="ben" />);
    await otur();
    sonDanger(screen.getByText("2026-00001").closest("tr"));
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(setTeklifler).not.toHaveBeenCalled();
    red(showToast, "Teklif · Kutu Gıda");
    fireEvent.click(screen.getByRole("tab", { name: /Yurt Dışı Fatura/ }));
    sonDanger(screen.getByText("Ihracat Ltd").closest("tr"));
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(setFaturalar).not.toHaveBeenCalled();
    red(showToast, "Fatura · Ihracat Ltd");
  });
  it("AC-3: makina stoğu satırı kilitliyken silinmez", async () => {
    kilitler([L("stock", 501)]);
    const setStock = vi.fn(); const showToast = vi.fn();
    render(<MakinaStokTab stock={[{ id: 501, model: "AK100_DS", serialNo: "2026-121", parcalar: [] }]} setStock={setStock} models={[{ model: "AK100_DS" }]} showToast={showToast}
      parts={[]} partStock={[]} setPartStock={vi.fn()} partStockLog={[]} setPartStockLog={vi.fn()} aktifKullanici="ben" />);
    await otur();
    satirSil("2026-121");
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(setStock).not.toHaveBeenCalled();
    red(showToast, "Makina stoğu · AK100_DS · 2026-121");
  });
  it("AC-3: üretim formu kilitliyken silinmez", async () => {
    kilitler([L("uretim_formu", 31)]);
    const setUretimFormlari = vi.fn(); const showToast = vi.fn();
    render(<UretimFormu uretimFormlari={[{ id: 31, baslangicTarihi: "2026-10-26", bitisTarihi: "2026-10-26", satirlar: [], createdAt: "2026-10-26" }]} setUretimFormlari={setUretimFormlari}
      customers={[]} kalipDefs={[]} partSales={[]} showToast={showToast} aktifKullanici="ben" />);
    await otur();
    sonDanger(document.querySelector("tbody tr") || document.body);
    fireEvent.click(within(screen.getByText("Bu üretim formu çöp kutusuna taşınacak. Ayarlar → Çöp Kutusu'ndan geri alabilirsiniz.").closest("div").parentElement.parentElement).getByText("Sil"));
    expect(setUretimFormlari).not.toHaveBeenCalled();
    red(showToast, "Üretim formu · 2026-10-26");
  });
  it("AC-3 / AC-4: yedek parça satışında partinin herhangi bir kaydı başkasındaysa silme bütünüyle reddedilir", async () => {
    kilitler([L("yedek_parca", 41)]);
    const setY = vi.fn(); const setPartStock = vi.fn(); const showToast = vi.fn();
    const satislar = [{ id: 40, aliciTipi: "bayi", dealerId: 3, partId: "7", miktar: 1, batchId: 5, tarih: "2026-10-01", tahsisler: [] },
      { id: 41, aliciTipi: "bayi", dealerId: 3, partId: "7", miktar: 2, batchId: 5, tarih: "2026-10-01", tahsisler: [] }];
    render(<YedekParcaSatisTab yedekParcaSatislar={satislar} setYedekParcaSatislar={setY} dealers={[{ id: 3, name: "Ege Bayi" }]} parts={[{ id: 7, ad: "Dişli" }]}
      partStock={[]} setPartStock={setPartStock} partStockLog={[]} setPartStockLog={vi.fn()} showToast={showToast} aktifKullanici="ben" />);
    await otur();
    fireEvent.click(screen.getAllByTitle("Sil")[0]);
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(setY).not.toHaveBeenCalled();
    expect(setPartStock).not.toHaveBeenCalled();
    red(showToast, "Yedek parça satışı · Ege Bayi");
  });
});

// ── B. Panonun tek alan işlemleri ───────────────────────────────────────────────────────────────────────────────────
const SV = [
  { id: 10, customerId: 1, type: "Periyodik Bakım", durum: "Tamamlandı", date: "2026-07-20", tech: "", atolyeKaliplari: [{ id: 1, ad: "Kalıp A", olcu: "" }] },
  { id: 11, customerId: 1, type: "Periyodik Bakım", durum: "Tamamlandı", date: "2026-07-21", panoGizli: true },
  { id: 12, customerId: 1, type: "Periyodik Bakım", durum: "Bekliyor", date: "2026-07-22", fabrikaGirisZamani: "2099-01-01T10:00:00" },
];
const YP = [
  { id: 700, batchId: 50, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 1, kargoDurum: "Teslim Edildi", tarih: "2026-07-20", tahsisler: [] },
  { id: 701, batchId: 50, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 1, kargoDurum: "Teslim Edildi", tarih: "2026-07-20", tahsisler: [] },
  { id: 702, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 1, kargoDurum: "Teslim Edildi", panoGizli: true, tarih: "2026-07-19", tahsisler: [] },
  { id: 703, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 1, kargoDurum: "Hazırlanıyor", panoDusmeZamani: "2099-01-01T10:00", tarih: "2026-07-18", tahsisler: [] },
];
const PS = [
  { id: 900, batchId: 60, customerId: 1, tur: "Kalıp", ad: "Adana", kargoDurum: "Teslim Edildi", tarih: "2026-07-20" },
  { id: 901, batchId: 60, customerId: 1, tur: "Kalıp", ad: "Urfa", kargoDurum: "Teslim Edildi", tarih: "2026-07-20" },
  { id: 902, customerId: 1, tur: "Kalıp", ad: "Pide", kargoDurum: "Teslim Edildi", panoGizli: true, tarih: "2026-07-19" },
  { id: 903, customerId: 1, tur: "Kalıp", ad: "Lahmacun", kargoDurum: "Hazırlanıyor", panoDusmeZamani: "2099-01-01T10:00", tarih: "2026-07-18" },
];
// Kilitler grubun İKİNCİ kaydında (701, 901): partili kayıtta grubun bütün kimlikleri sorulmalı (AC-9).
const PANO_KILIT = [L("customer", 1), L("yedek_parca", 701), L("yedek_parca", 702), L("yedek_parca", 703), L("part_sale", 901), L("part_sale", 902), L("part_sale", 903)];
function panoKur(ek = {}) {
  const s = { setServices: vi.fn(), setYedekParcaSatislar: vi.fn(), setPartSales: vi.fn(), showToast: vi.fn() };
  window.auditLog = { log: vi.fn() };
  render(<ServisPanosu services={SV} customers={[{ id: 1, name: "ABC Makina", model: "AK-100", serialNo: "SN-1" }]} calisanlar={[{ id: 1, ad: "Ali" }, { id: 2, ad: "Veli" }]}
    dealers={[{ id: 5, name: "Bayi X" }]} parts={[{ id: 7, ad: "Dişli" }]} yedekParcaSatislar={YP} partSales={PS} kargoYetki kalipYetki
    serverPermissions={null} aktifKullanici="kiosk" {...s} {...ek} />);
  return s;
}
const yazilmadi = (s) => { expect(s.setServices).not.toHaveBeenCalled(); expect(s.setYedekParcaSatislar).not.toHaveBeenCalled(); expect(s.setPartSales).not.toHaveBeenCalled(); };
const seciciler = (ilk) => [...document.querySelectorAll("select")].filter(x => x.options[0]?.textContent === ilk);

describe("Spec 0128: panonun on tek alan işlemi (R5–R8, AC-6–AC-9, AC-18)", () => {
  it("AC-6 / AC-18: teknisyen, kalıbı gönderen kişi, kargo sorumlusu ve Extra Kalıp sorumlusu seçicileri yazmaz; seçici eski değerinde kalır", async () => {
    kilitler(PANO_KILIT);
    const s = panoKur();
    await otur();
    const tek = seciciler("Kim yapıyor?")[0];
    fireEvent.change(tek, { target: { value: "Ali" } });
    expect(tek.value).toBe(""); // R6, Karar 27: denetimli seçici eski değerine döner
    fireEvent.change(screen.getByLabelText("Kalıbı gönderen kişi"), { target: { value: "Ali" } });
    for (const x of seciciler("Kim gönderiyor?")) fireEvent.change(x, { target: { value: "Veli" } }); // kargo (teknisyen 700) ve Extra Kalıp (900)
    expect(seciciler("Kim gönderiyor?").length).toBeGreaterThanOrEqual(2);
    yazilmadi(s);
    expect(s.showToast.mock.calls.filter(c => c[1] === "err" && /"ofis" tarafından düzenleniyor/.test(c[0])).length).toBeGreaterThanOrEqual(4);
    expect(s.showToast).toHaveBeenCalledWith(expect.stringMatching(/^Müşteri · ABC Makina/), "err");
    expect(s.showToast).toHaveBeenCalledWith(expect.stringMatching(/^Yedek parça satışı · Bayi X/), "err");
    expect(s.showToast).toHaveBeenCalledWith(expect.stringMatching(/^Extra Kalıp satışı · ABC Makina/), "err");
  });
  it("AC-7 / AC-8 / AC-9: panodan kaldır, panoya geri al ve hemen düşür (servis, kargo, Extra Kalıp) yazmaz ve iz düşmez", async () => {
    kilitler(PANO_KILIT);
    const s = panoKur();
    await otur();
    fireEvent.click(screen.getByTitle("Kartı panodan kaldır (servis kaydı silinmez)"));
    for (const b of screen.getAllByTitle("Kartı panodan kaldır (satış kaydı silinmez)")) fireEvent.click(b);
    fireEvent.click(screen.getByText(/^Arşivlenenler \(/));
    for (const b of screen.getAllByText("↩ Panoya Geri Al")) fireEvent.click(b);
    fireEvent.click(screen.getByText(/^Planlanan \(/));
    for (const b of screen.getAllByText("Hemen Düşür")) fireEvent.click(b);
    expect(screen.getAllByText("↩ Panoya Geri Al")).toHaveLength(3);
    expect(screen.getAllByText("Hemen Düşür")).toHaveLength(3);
    yazilmadi(s);
    expect(window.auditLog.log).not.toHaveBeenCalled();
    expect(s.showToast.mock.calls.filter(c => c[1] === "err").length).toBe(9);
  });
  it("R8 / AC-25: kilitler aktif kullanıcıdaysa aynı işlemler yazar", async () => {
    kilitler(PANO_KILIT.map(k => ({ ...k, locked_by: "kiosk" })));
    const s = panoKur();
    await otur();
    fireEvent.change(seciciler("Kim yapıyor?")[0], { target: { value: "Ali" } });
    fireEvent.change(screen.getByLabelText("Kalıbı gönderen kişi"), { target: { value: "Ali" } });
    for (const x of seciciler("Kim gönderiyor?")) fireEvent.change(x, { target: { value: "Veli" } });
    fireEvent.click(screen.getByTitle("Kartı panodan kaldır (servis kaydı silinmez)"));
    expect(s.setServices).toHaveBeenCalledTimes(3);
    expect(s.setYedekParcaSatislar).toHaveBeenCalled();
    expect(s.setPartSales).toHaveBeenCalled();
  });
  it("AC-21: müşterisi çözülmeyen servis kartında denetim atlanır, işlem geçer", async () => {
    kilitler([L("customer", 1)]);
    const s = panoKur({ services: [{ id: 13, customerId: null, type: "Periyodik Bakım", durum: "Tamamlandı", date: "2026-07-20", tech: "" }] });
    await otur();
    fireEvent.change(seciciler("Kim yapıyor?")[0], { target: { value: "Ali" } });
    fireEvent.click(screen.getByTitle("Kartı panodan kaldır (servis kaydı silinmez)"));
    expect(s.setServices).toHaveBeenCalledTimes(2);
  });
});

// ── Fail-open (C1, AC-16) ───────────────────────────────────────────────────────────────────────────────────────────
describe("Spec 0128: fail-open (C1, AC-16)", () => {
  it("AC-16: köprü yokken, liste boşken ve liste okunamazken silmeler ve pano işlemleri geçer", async () => {
    for (const kur of [() => {}, () => kilitler([]), () => kilitler([], { list: vi.fn(() => Promise.reject(new Error("ağ"))) })]) {
      kur();
      const m = musteriKur();
      await otur();
      satirSil("BAL KÖFTE");
      fireEvent.click(screen.getByText("Evet, Sil"));
      expect(m.setters.setCustomers).toHaveBeenCalled();
      cleanup();
      const s = panoKur();
      await otur();
      fireEvent.change(seciciler("Kim yapıyor?")[0], { target: { value: "Ali" } });
      for (const x of seciciler("Kim gönderiyor?")) fireEvent.change(x, { target: { value: "Veli" } });
      expect(s.setServices).toHaveBeenCalled();
      expect(s.setYedekParcaSatislar).toHaveBeenCalled();
      expect(s.setPartSales).toHaveBeenCalled();
      cleanup();
      delete window.crmLocks;
    }
  });
});

// ── Kiosk ve ayrı pencere (C4, AC-10) ───────────────────────────────────────────────────────────────────────────────
import { ServisPencere } from "../../src/components/ServisPencere";
import { waitFor } from "@testing-library/react";
describe("Spec 0128: ayrı pencere ve kiosk (C4, AC-10)", () => {
  afterEach(() => { delete window.servisBridge; });
  it("AC-10: ayrı pencerede reddedilen işlem ana pencereye mutate göndermez; kendi kilidinde gönderir", async () => {
    for (const [sahip, gonderir] of [["ofis", false], ["kiosk", true]]) {
      kilitler([L("customer", 1, sahip)]);
      const mutate = vi.fn();
      window.servisBridge = {
        ilkVeriAl: () => Promise.resolve({ services: [{ id: 10, customerId: 1, type: "Periyodik Bakım", durum: "Bekliyor", date: "2026-07-20", tech: "" }],
          customers: [{ id: 1, name: "ABC Makina" }], calisanlar: [{ id: 1, ad: "Ali" }], parts: [], dealers: [], factory: { name: "A" }, appSettings: null, geoData: null,
          loadingGeo: false, partStock: [], partStockLog: [], dosyalar: [], yedekParcaSatislar: [], partSales: [], serverPermissions: null,
          aktifKullanici: "kiosk", kargoYetki: false, kalipYetki: false, dosyaCevrimdisi: false, tema: "light" }),
        onVeri: () => () => {}, mutate,
      };
      render(<ServisPencere />);
      await waitFor(() => expect(seciciler("Kim yapıyor?").length).toBe(1));
      await otur();
      fireEvent.change(seciciler("Kim yapıyor?")[0], { target: { value: "Ali" } });
      expect(mutate.mock.calls.length > 0, sahip).toBe(gonderir);
      cleanup();
    }
  });
  it("AC-10: kiosk çağrısı aktif kullanıcıyı panoya geçirir (App) ve ayrı pencerenin köprüsü kilit kanallarını taşır", async () => {
    const { readFileSync } = await import("node:fs");
    const app = readFileSync("src/App.jsx", "utf8");
    expect(app).toMatch(/serverPermissions={effectivePermissions} aktifKullanici={savedUsername}/); // kiosk ServisPanosu
    expect(app).toMatch(/aktifKullanici: savedUsername/); // ayrı pencerenin anlık görüntüsü
    expect(readFileSync("electron/preload-servis.cjs", "utf8")).toMatch(/crmLocks/);
  });
});

// ── C. Müşteri detayında Extra Kalıp tek kilit alanı (R9) ────────────────────────────────────────────────────────────
describe("Spec 0128: müşteri detayında Extra Kalıp (R9, AC-11–AC-13, AC-22, AC-27)", () => {
  const M = { id: 600, name: "Kalıp AŞ", model: "AK100", serialNo: "K1" };
  const ps = (o) => ({ customerId: 600, tur: "Kalıp", tarih: "2026-09-10", ucret: 1000, currency: "TRY", faturaTipi: "Faturasız Yurtiçi", ...o });
  const PSL = [ps({ id: 910, ad: "Y45", batchId: 70, odendi: false }), ps({ id: 911, ad: "Y55", batchId: 70, odendi: false }),
    ps({ id: 912, ad: "Y60", batchId: 71, odendi: true, yontem: "Çek", tahsilEdildi: false }), ps({ id: 913, ad: "K40", batchId: 71, odendi: true })];
  const kur = () => {
    const s = { setPartSales: vi.fn(), setCustomers: vi.fn(), showToast: vi.fn() };
    render(<Customers customers={[M]} stock={[]} partStockLog={[]} services={[]} partSales={PSL} payments={[]} partStock={[]} giderYetki={false} uretimPartileri={[]}
      rates={{ usd: 41.5, eur: 45.25 }} kalipDefs={[{ id: 1, ad: "Y45" }]} aktifKullanici="ben" setStock={vi.fn()} setPartStockLog={vi.fn()} setServices={vi.fn()}
      setPayments={vi.fn()} setPartStock={vi.fn()} {...s} />);
    fireEvent.click(screen.getAllByText("Kalıp AŞ")[0]);
    return s;
  };
  it("AC-12 / AC-22: grubun ikinci kaydı başkasındayken ödendi işareti, çek tahsili ve durum seçicisi yazmaz", async () => {
    kilitler([L("part_sale", 911), L("part_sale", 913)]);
    const s = kur();
    await otur();
    fireEvent.click(screen.getAllByText("Ödenmedi · işaretle: Ödendi")[0]); // 910 (kilit 911'de)
    fireEvent.click(screen.getByText("Çek beklemede · işaretle: tahsil edildi")); // 912 (kilit 913'te)
    fireEvent.change(within(screen.getByTestId("extra-kalip-durumu-910")).getByRole("combobox"), { target: { value: "hazir" } });
    expect(s.setPartSales).not.toHaveBeenCalled();
    expect(s.showToast.mock.calls.filter(c => c[1] === "err" && /^Extra Kalıp satışı · Kalıp AŞ.*"ofis"/.test(c[0]))).toHaveLength(3);
  });
  it("AC-12 (triyaj): tahsilat hesabı penceresi açıkken kilit başkasına geçerse onay yazmaz", async () => {
    let tazele = null;
    window.appServer = { onLocksChanged: (cb) => { tazele = cb; return () => {}; } };
    let liste = [];
    kilitler([], { list: vi.fn(() => Promise.resolve(liste)) });
    const s = { setPartSales: vi.fn(), setCustomers: vi.fn(), showToast: vi.fn() };
    render(<Customers customers={[M]} stock={[]} partStockLog={[]} services={[]} partSales={PSL} payments={[]} partStock={[]} giderYetki={false} uretimPartileri={[]}
      rates={{ usd: 41.5, eur: 45.25 }} kalipDefs={[]} aktifKullanici="ben" setStock={vi.fn()} setPartStockLog={vi.fn()} setServices={vi.fn()} setPayments={vi.fn()} setPartStock={vi.fn()}
      tahsilatHesapYetki kasaHesaplari={[{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", kapali: false }]} tahsilatHesapVarsayilan={() => 51} {...s} />);
    fireEvent.click(screen.getAllByText("Kalıp AŞ")[0]);
    await otur();
    fireEvent.click(screen.getAllByText("Ödenmedi · işaretle: Ödendi")[0]);
    expect(screen.getByText("Ödendi olarak kaydet")).toBeTruthy();
    liste = [L("part_sale", 911)];
    await act(async () => { tazele?.(); });
    fireEvent.click(screen.getByText("Ödendi olarak kaydet"));
    expect(s.setPartSales).not.toHaveBeenCalled();
    expect(s.showToast).toHaveBeenCalledWith(expect.stringMatching(/"ofis"/), "err");
    delete window.appServer;
  });
  it("AC-12: silme onaylanınca grubun kilidine bakar", async () => {
    kilitler([L("part_sale", 911)]);
    const s = kur();
    await otur();
    fireEvent.click(screen.getAllByTitle("Bu kalıp kaydını sil")[0]);
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(s.setPartSales).not.toHaveBeenCalled();
    expect(s.showToast).toHaveBeenCalledWith(expect.stringMatching(/"ofis"/), "err");
  });
  it("AC-11 / AC-13: düzenleme formu part_sale kilidini kaydın kendi kimliğiyle alır, müşteri kilidi de durur; kilit başkasındaysa form yerine çakışma", async () => {
    kilitler([], { acquire: vi.fn(async (alan) => (alan === "part_sale" ? { ok: false, lockedBy: "ofis", lockedAt: "2026-11-03T10:00:00" } : { ok: true })) });
    kur();
    await otur();
    expect(window.crmLocks.acquire).toHaveBeenCalledWith("customer", "600", false);
    fireEvent.click(screen.getAllByTitle("Düzenlemek için tıklayın").find(e => e.textContent.includes("Y45")));
    await otur();
    expect(window.crmLocks.acquire).toHaveBeenCalledWith("part_sale", "910", false);
    expect(screen.getByText(/Bu kayıt şu an düzenleniyor/)).toBeTruthy();
  });
  it("AC-27: form kaydederken grubun başka kaydı başkasındaysa kaydetmez", async () => {
    kilitler([L("part_sale", 911)]);
    const s = kur();
    await otur();
    fireEvent.click(screen.getAllByTitle("Düzenlemek için tıklayın").find(e => e.textContent.includes("Y45")));
    await otur();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(s.setPartSales).not.toHaveBeenCalled();
    expect(s.showToast).toHaveBeenCalledWith(expect.stringMatching(/^Extra Kalıp satışı · Kalıp AŞ.*"ofis"/), "err");
  });
});

// ── AC-25: aktif kullanıcı beş ekrana ulaşır ────────────────────────────────────────────────────────────────────────
describe("Spec 0128: aktifKullanici zinciri (AC-25)", () => {
  it("AC-25: App Bayiler ve Evrak'a, Stock üç alt sekmeye iletir", async () => {
    const { readFileSync } = await import("node:fs");
    const app = readFileSync("src/App.jsx", "utf8");
    expect(app).toMatch(/<SimpleDealers aktifKullanici={savedUsername}/);
    expect(app).toMatch(/<Documents aktifKullanici={savedUsername}/);
    const st = readFileSync("src/components/Stock.jsx", "utf8");
    for (const b of ["MakinaStokTab", "YedekParcaSatisTab", "UretimFormu", "PartStokTab"]) {
      const i = st.indexOf(`<${b}`); const blok = st.slice(i, st.indexOf("/>", i));
      expect(blok, b).toMatch(/aktifKullanici={aktifKullanici}/);
    }
  });
});
