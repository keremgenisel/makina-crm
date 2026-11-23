// @vitest-environment jsdom
// Spec 0154: Analiz'in Parça Kırılımı kutusu, Müşteri görünümü ve "Parçanın Takıldığı Makinalar" penceresi (gerçek bileşen).
// Test adları AC-<n> taşır.
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { Analiz, PARCA_KIRILIMI_METIN as PK } from "../../src/components/Analiz";
import { MUSTERI_IBARE } from "../../src/lib/analiz";
import { VERI, DEALERS } from "../fixtures/0154-veri";

afterEach(cleanup);
const kutu = () => [...document.querySelectorAll("section")].find(s => s.textContent.includes(PK.baslik));
const segment = () => within(kutu()).getByRole("group", { name: PK.segment });
const gorunumSec = (ad) => fireEvent.click(within(segment()).getByRole("button", { name: ad }));
const parcaSec = (ad) => {
  fireEvent.click(within(kutu()).getByLabelText("Parça seç"));
  fireEvent.click(within(kutu()).getAllByRole("button").find(b => b.querySelector("span")?.textContent === ad));
};
const satirlar = () => within(kutu()).queryAllByTestId("musteri-satiri");
// Pencere: Modal rol taşımıyor; başlık metninden kabına çıkılır (makina satırlarını içeren en yakın kap).
const pencere = () => { let e = screen.getByText(new RegExp(`^${PK.pencere} · `)); while (e && !e.querySelector?.('[data-testid="musteri-satiri"]')) e = e.parentElement; return e; };
const ciz = (o = {}) => render(<Analiz {...VERI} dealers={DEALERS} appSettings={{}} {...o} />);

describe("Spec 0154: Parça Kırılımı kutusu", () => {
  it("AC-2 / AC-58 / P4: görünüm geçişi başlık satırında düğme kipinde segment; seçenekler Model ve Müşteri", () => {
    ciz();
    const g = segment();
    const d = within(g).getAllByRole("button");
    expect(d.map(b => b.textContent)).toEqual(["Model", "Müşteri"]);
    expect(d.map(b => b.getAttribute("aria-pressed"))).toEqual(["true", "false"]);
    expect(within(g).queryByRole("tab")).toBeNull();
    // Başlık satırında: gövdedeki açıklama cümlesinden önce gelir.
    expect(g.compareDocumentPosition(within(kutu()).getByText(PK.aciklama.model)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("AC-41: başlık iki görünümde 'Parça Kırılımı'; açıklama cümlesi görünüme göre değişir", () => {
    ciz();
    expect(within(kutu()).getByText(PK.baslik)).toBeTruthy();
    expect(within(kutu()).getByText(PK.aciklama.model)).toBeTruthy();
    gorunumSec("Müşteri");
    expect(within(kutu()).getByText(PK.baslik)).toBeTruthy();
    expect(within(kutu()).getByText(PK.aciklama.musteri)).toBeTruthy();
    expect(within(kutu()).queryByText(PK.aciklama.model)).toBeNull();
  });
  it("AC-3 / AC-40: Müşteri seçilince makina satırları, Model'e dönünce model çubukları; Model görünümünde limit ve Tümünü göster yok", () => {
    const yedek = Array.from({ length: 12 }, (_, i) => ({ id: 900 + i, aliciTipi: "bayi", dealerId: 50, partId: 7, miktar: 1, tarih: "2026-06-01", tahsisler: [{ miktar: 1, customerId: 1000 + i }] }));
    const cust = Array.from({ length: 12 }, (_, i) => ({ id: 1000 + i, name: `F${i}`, model: `M${i}`, serialNo: `S${i}` }));
    render(<Analiz customers={cust} services={[]} partSales={[]} yedekParcaSatislar={yedek} parts={VERI.parts} dealers={DEALERS} appSettings={{}} />);
    expect(within(kutu()).getAllByText(/^M\d+$/).length).toBe(12);
    expect(within(kutu()).queryByText(/Tümünü göster/)).toBeNull();
    gorunumSec("Müşteri");
    expect(satirlar().length).toBe(8);
    gorunumSec("Model");
    expect(satirlar().length).toBe(0);
    expect(within(kutu()).getAllByText(/^M\d+$/).length).toBe(12);
  });
  it("AC-4: Müşteri görünümünde başka parça seçilince görünüm kalır, satırlar yeni parçanın", () => {
    ciz();
    gorunumSec("Müşteri");
    parcaSec("Kayış");
    expect(within(segment()).getByRole("button", { name: "Müşteri" }).getAttribute("aria-pressed")).toBe("true");
    expect(satirlar().map(s => s.dataset.anahtar)).toEqual(["m:1", "m:2"]);
  });
  it("AC-5: tarih önayarı değişince görünüm Müşteri kalır", () => {
    ciz();
    gorunumSec("Müşteri");
    fireEvent.click(within(screen.getByRole("group", { name: "Tarih aralığı" })).getByRole("button", { name: "Bu yıl" }));
    expect(within(segment()).getByRole("button", { name: "Müşteri" }).getAttribute("aria-pressed")).toBe("true");
    expect(satirlar().length).toBeGreaterThan(0);
  });
  it("AC-42 / AC-54 / AC-33: ad hücresi iki satırlı; makina satırında model · seri ('—' dahil), tahsissiz satırda ibare", () => {
    ciz();
    gorunumSec("Müşteri");
    fireEvent.click(within(kutu()).getByText(/Tümünü göster/));
    const s = (a) => within(pencere()).getAllByTestId("musteri-satiri").find(x => x.dataset.anahtar === a);
    expect(s("m:1").querySelector("span > span").textContent).toBe("EGE ÇİFTLİK ET");
    expect(within(s("m:1")).getByTestId("musteri-satiri-alt").textContent).toBe("AK100 · S-100");
    expect(within(s("m:4")).getByTestId("musteri-satiri-alt").textContent).toBe("— · —");
    expect(within(s("t:musteri:2")).getByTestId("musteri-satiri-alt").textContent).toBe(MUSTERI_IBARE.tahsissiz);
  });
  it("AC-19 / AC-53: sekizden çok satırda ilk sekiz ve 'Tümünü göster (n)'", () => {
    ciz();
    gorunumSec("Müşteri");
    expect(satirlar().length).toBe(8);
    expect(within(kutu()).getByText("Tümünü göster (11) ↗")).toBeTruthy();
  });
  it("AC-20 / AC-52 / AC-21 / AC-22 / AC-47 / AC-59 / AC-49: pencere bütün satırları ve hareketleri yazar", () => {
    ciz();
    gorunumSec("Müşteri");
    fireEvent.click(within(kutu()).getByText(/Tümünü göster/));
    const p = pencere();
    expect(within(p).getByText(`${PK.pencere} · 11`)).toBeTruthy(); // R6/3: başlık kalıbı `${baslik} · n`
    const ps = within(p).getAllByTestId("musteri-satiri");
    expect(ps.length).toBe(11);
    const h = (a) => within(ps.find(x => x.dataset.anahtar === a)).getAllByTestId("musteri-hareketi").map(x => x.textContent);
    expect(h("m:3")).toEqual(["15/06/2026 · Serviste değişen · 1 adet", "02/05/2026 (satış tarihi) · Kargo satışı · 2 adet"]);
    expect(h("m:5")).toEqual(["20/06/2026 (satış tarihi) · Kargo satışı · 1 adet", "Tarihsiz · Serviste değişen · 1 adet"]);
    expect(h("m:2")).toEqual(["10/07/2026 (satış tarihi) · Kargo satışı · 2 adet", "02/05/2026 · Serviste değişen · 1 adet"]);
    expect(within(p).getByText(MUSTERI_IBARE.serbest)).toBeTruthy();
  });
  it("AC-16 / AC-60: çözülemeyen satır sonda ve tek satırlı; '(müşteri yok)' ayrı ibare", () => {
    const yedek = [...VERI.yedekParcaSatislar, { id: 300, aliciTipi: "musteri", musteriId: 888, partId: 7, miktar: 1, tarih: "2026-01-02", tahsisler: [] }];
    ciz({ yedekParcaSatislar: yedek });
    gorunumSec("Müşteri");
    fireEvent.click(within(kutu()).getByText(/Tümünü göster/));
    const ps = within(pencere()).getAllByTestId("musteri-satiri");
    expect(ps.at(-1).dataset.anahtar).toBe("x");
    expect(within(ps.at(-1)).queryByTestId("musteri-satiri-alt")).toBeNull();
    expect(within(pencere()).getByText("(müşteri yok)")).toBeTruthy();
    expect(within(pencere()).getByText(MUSTERI_IBARE.cozulemeyen)).toBeTruthy();
  });
  it("AC-26: parça hareketi yokken Müşteri görünümünde de bugünkü boş durum", () => {
    render(<Analiz customers={VERI.customers} services={[{ id: 1, customerId: 1, date: "2026-01-01", degisenParcalar: [] }]} partSales={[]} yedekParcaSatislar={[]} parts={[]} dealers={[]} appSettings={{}} />);
    gorunumSec("Müşteri");
    expect(within(kutu()).getByTestId("bos-analiz").textContent).toMatch(/Parça yok\./);
  });
  it("AC-27 / R9: kutuda ve pencerede para tutarı yok", () => {
    ciz();
    gorunumSec("Müşteri");
    fireEvent.click(within(kutu()).getByText(/Tümünü göster/));
    for (const el of [kutu(), pencere()]) expect(el.textContent).not.toMatch(/₺|\$|€|\d\s?TL\b|TRY|fiyat|tutar|ciro/i);
  });
  it("AC-13 / R12: bayi alıcı adı dealers'tan", () => {
    ciz();
    gorunumSec("Müşteri");
    expect(satirlar().find(s => s.dataset.anahtar === "t:bayi:50").textContent).toMatch(/^Kuzey Bayi/);
  });
});
