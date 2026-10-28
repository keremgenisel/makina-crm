// @vitest-environment jsdom
// Spec 0114: gerçek App. Kaydedilen gövde (`window.crmStorage.save` yükü) üzerinden ihraç kayıtlı işaretin beş yazım yolunda
// yazılması, korunması ve silinmesi (AC-5, AC-6, AC-7, AC-10, AC-28, AC-56, AC-64). Saf kurallar tests/ihrac-kayitli-0114.test.js'te.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; vi.unstubAllGlobals(); localStorage.clear(); });

const FY = "Faturalı Yurtiçi";
const IK = { ihracKayitli: true };
const yp = (id) => ({ id, batchId: 50, aliciTipi: "musteri", musteriId: 1, partId: "81", miktar: 1, birimFiyat: 1000, currency: "TRY", tarih: "2026-09-18",
  faturaTipi: FY, odendi: false, yontem: "Nakit", kargoDurum: "", olusturmaZamani: `2026-09-18T10:00:0${id % 10}`, tahsisler: [], ...IK });
const veri = () => ({
  customers: [
    { id: 1, name: "İhracatçı AŞ", model: "AK100", serialNo: "S1", installDate: "2026-09-10", currency: "TRY", faturali: FY, faturaBedeli: 200000,
      fabrikaSatisBedeli: 200000, kalanBorc: 50000, satisYapan: "Altuntaş Makina", kaliplar: [], ...IK },
    { id: 3, name: "Tevkifatlı Yemek", model: "AK100", serialNo: "S3", installDate: "2026-09-14", currency: "TRY", faturali: FY, faturaBedeli: 100000,
      fabrikaSatisBedeli: 100000, kalanBorc: 110000, satisYapan: "Altuntaş Makina", kaliplar: [], tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10 },
  ],
  payments: [{ id: 101, customerId: 1, tarih: "2026-09-10", tutar: 150000, currency: "TRY", yontem: "Nakit" }],
  partSales: [{ id: 21, customerId: 1, tur: "Kalıp", ad: "Hamburger", olcu: "100", tarih: "2026-09-16", ucret: 50000, currency: "TRY", faturaTipi: FY,
    odendi: false, satisFirma: "Altuntaş Makina", ...IK }],
  yedekParcaSatislar: [yp(31), yp(32)],
  standardModels: [{ model: "AK100", sogutma: "", kapasite: "", kalip: "" }],
  parts: [{ id: 81, ad: "Rulman" }],
  partStock: [{ id: 1, partId: "81", miktar: 8 }],
  partStockLog: [31, 32].map(r => ({ id: 500 + r, partId: "81", miktar: -1, tip: "bayi_satis", referansId: r, tarih: "2026-09-18", notlar: "" })),
  appSettings: {},
});
const ac = async () => {
  const kayitlar = [];
  window.crmStorage = { load: vi.fn(async () => structuredClone(veri())), save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }), getVersion: vi.fn(async () => 1) };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
  fireEvent.click(screen.getAllByText("Müşteriler").find(e => e.closest("nav")));
  return kayitlar;
};
const secici = () => screen.getAllByRole("combobox").find(s => s.options && [...s.options].some(o => o.value === "Faturasız Yurtdışı"));
const makinaDuzenle = (ad) => {
  const tr = screen.getByText(ad).closest("tr");
  fireEvent.click(within(tr).getAllByRole("button").find(b => b.querySelector("svg") && b.className.includes("ghost")));
};
const musteri = (kayitlar, id) => kayitlar.at(-1).customers.find(c => c.id === id);

describe("Spec 0114: gerçek App, makina (Customers'ın iki kolu)", () => {
  it("AC-5 / AC-28: 'İhraç Kayıtlı' seçilip eklenen makina Faturalı Yurtiçi + işaretle, kalan borç KDV'siz kaydedilir", async () => {
    const kayitlar = await ac();
    fireEvent.click(screen.getByText("Yeni Müşteri"));
    fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: "Yeni İhracatçı" } });
    const para = (etiket) => screen.getByText(etiket).closest("div").parentElement.querySelector("input");
    fireEvent.change(para("Fabrika Satış Bedeli"), { target: { value: "100000" } });
    fireEvent.change(secici(), { target: { value: "İhraç Kayıtlı" } });
    fireEvent.change(para("Fatura Bedeli (resmi faturada yazan)"), { target: { value: "100000" } });
    fireEvent.click(screen.getByText("Kaydet"));
    await waitFor(() => expect(kayitlar.some(d => d.customers?.some(c => c.name === "Yeni İhracatçı"))).toBe(true));
    const c = kayitlar.at(-1).customers.find(x => x.name === "Yeni İhracatçı");
    expect(c).toMatchObject({ faturali: FY, ihracKayitli: true, kalanBorc: 100000 }); // işaretsizde 120.000 olurdu
  });
  it("AC-7 / AC-64: işaretli makina hiçbir alanına dokunulmadan kaydedilince işaret korunur; AC-6: tip Yurtdışı yapılınca gövdede yok", async () => {
    const kayitlar = await ac();
    makinaDuzenle("İhracatçı AŞ");
    expect(secici().value).toBe("İhraç Kayıtlı");
    fireEvent.click(screen.getByText("Kaydet"));
    await waitFor(() => expect(kayitlar.length).toBeGreaterThan(0));
    expect(musteri(kayitlar, 1)).toMatchObject({ faturali: FY, ihracKayitli: true, kalanBorc: 50000 });
    makinaDuzenle("İhracatçı AŞ");
    fireEvent.change(secici(), { target: { value: "Faturalı Yurtdışı" } });
    const once = kayitlar.length;
    fireEvent.click(screen.getByText("Kaydet"));
    await waitFor(() => expect(kayitlar.length).toBeGreaterThan(once));
    const c = musteri(kayitlar, 1);
    expect(c.faturali).toBe("Faturalı Yurtdışı");
    expect("ihracKayitli" in c).toBe(false);
  });
  it("AC-10 / AC-56: tevkifatlı makina açılıp 'İhraç Kayıtlı' seçilince kayıt engellenmez; gövdede tevkifat alanları yok, işaret var", async () => {
    const kayitlar = await ac();
    makinaDuzenle("Tevkifatlı Yemek");
    fireEvent.change(secici(), { target: { value: "İhraç Kayıtlı" } });
    fireEvent.click(screen.getByText("Kaydet"));
    await waitFor(() => expect(kayitlar.some(d => d.customers?.some(c => c.id === 3 && c.ihracKayitli))).toBe(true));
    const c = musteri(kayitlar, 3);
    for (const a of ["tevkifatli", "tevkifatPay", "tevkifatPayda"]) expect(a in c, a).toBe(false);
    expect(c.kalanBorc).toBe(100000);
  });
});

describe("Spec 0114: gerçek App, Extra Kalıp ve toplu yedek parça düzenlemesi (alan alan kurulan iki form)", () => {
  it("AC-7 / AC-64: Extra Kalıp ve toplu yedek parça dokunulmadan kaydedilince işaret korunur", async () => {
    const kayitlar = await ac();
    fireEvent.click(screen.getByText("İhracatçı AŞ"));
    fireEvent.click((await screen.findAllByTitle("Düzenlemek için tıklayın")).find(e => /Hamburger/.test(e.textContent) || /Kalıp/.test(e.textContent)));
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    await waitFor(() => expect(kayitlar.length).toBeGreaterThan(0));
    expect(kayitlar.at(-1).partSales.find(p => p.id === 21).ihracKayitli).toBe(true);
    fireEvent.click(await screen.findByText(/Yedek Parça \((Kargo|Fabrika Teslim)\) \(2 kalem\)/));
    const once = kayitlar.length;
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    await waitFor(() => expect(kayitlar.length).toBeGreaterThan(once));
    expect(kayitlar.at(-1).yedekParcaSatislar.map(s => [s.id, s.ihracKayitli])).toEqual([[31, true], [32, true]]);
    const sizan = kayitlar.flatMap(d => [...(d.partSales || []), ...(d.yedekParcaSatislar || []), ...(d.customers || [])]).filter(r => "ertelenenKdv" in r);
    expect(sizan).toEqual([]); // R13: ertelenen KDV türetilir, saklanmaz
  });
});
