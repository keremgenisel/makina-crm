// @vitest-environment jsdom
// Spec 0101: kalıp çapının stoktan müşteri formuna akışı (R11–R17) ve müşteri silinince stoğa dönen satır (R19–R21). Gerçek
// Customers, App gibi bağlanır: ekrana çöpü süzülmüş diziler, setter'a TAM dizi. Saf kurallar tests/kalip-capi-0101.test.js'te.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, within } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";

afterEach(cleanup);

const MODELLER = [{ model: "AK100", sogutma: "", kapasite: "", kalip: "14 cm" }];
const TIPLER = [{ id: "t1", ad: "Bıçak", makinaSecici: true }];
const PARCALAR = [{ id: 11, ad: "Bıçak A", tip: "Bıçak" }, { id: 12, ad: "Bıçak B", tip: "Bıçak" }];
const KC = { en: "50", yukseklik: "80", boy: "115" };

function kur({ customers = [], stock = [] } = {}) {
  const durum = { customers, stock, partStockLog: [], services: [], partSales: [], payments: [], partStock: [], yedekParcaSatislar: [], gorusmeler: [], dosyalar: [] };
  const setter = (k) => vi.fn((u) => { durum[k] = typeof u === "function" ? u(durum[k]) : u; });
  const setters = {
    setCustomers: setter("customers"), setStock: setter("stock"), setPartStockLog: setter("partStockLog"), setServices: setter("services"),
    setPartSales: setter("partSales"), setPayments: setter("payments"), setPartStock: setter("partStock"),
    setYedekParcaSatislar: setter("yedekParcaSatislar"), setGorusmeler: setter("gorusmeler"), setDosyalar: setter("dosyalar"),
  };
  const ciz = () => (
    <Customers customers={durum.customers.filter(c => !c.deletedAt)} stock={durum.stock.filter(s => !s.deletedAt)} partStockLog={durum.partStockLog}
      services={durum.services} partSales={durum.partSales} payments={durum.payments} partStock={durum.partStock}
      yedekParcaSatislar={durum.yedekParcaSatislar} gorusmeler={durum.gorusmeler} dosyalar={durum.dosyalar}
      models={MODELLER} parts={PARCALAR} partTypeDefs={TIPLER} rates={{ usd: 41.5, eur: 45.25 }} {...setters} />
  );
  const u = render(ciz());
  return { durum, rerender: () => u.rerender(ciz()) };
}
const kutu = (ad) => screen.getByRole("textbox", { name: ad });
const yaz = (ad, v) => fireEvent.change(kutu(ad), { target: { value: v } });
const cap = () => ({ en: kutu("Çap").value, yukseklik: kutu("Arka Ölçü").value, boy: kutu("Boy").value });
const stokSecici = () => screen.getByText(/Stoktan seçin/).closest("select");
const sec = (v) => fireEvent.change(stokSecici(), { target: { value: v } });
const kaydet = () => fireEvent.click(screen.getByText("Kaydet"));
const yeniMusteri = (ad = "Yeni AŞ") => {
  fireEvent.click(screen.getByText("Yeni Müşteri"));
  fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: ad } });
  fireEvent.click(screen.getByText("Model seçin..."));
  fireEvent.click(screen.getByText("AK100", { selector: "div" }));
};
const satir = (ad) => screen.getByText(ad).closest("tr");
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getAllByRole("button").find(b => b.querySelector("svg") && b.className.includes("ghost")));
const stk = (id, o = {}) => ({ id, model: "AK100", serialNo: `S-${id}`, addedDate: "2026-09-01", note: "", parcalar: [], ...o });

describe("Spec 0101: müşteri ekleme formuna akış (R11–R15)", () => {
  it("AC-17: model seçildikten sonra çapı olan serili satır seçilince çap üç kutuya yazılır", () => {
    kur({ stock: [stk(1, { kalipCapi: KC })] });
    yeniMusteri();
    sec("S-1");
    expect(cap()).toEqual(KC);
  });
  it("AC-18: çapı olmayan satır seçilince elle girilmiş çap korunur", () => {
    kur({ stock: [stk(2)] });
    yeniMusteri();
    yaz("Çap", "33");
    sec("S-2");
    expect(cap()).toEqual({ en: "33", yukseklik: "", boy: "" });
  });
  it("AC-19: elle çap girildikten sonra çapı olan seri seçilince form yeni makinanın çapını gösterir", () => {
    kur({ stock: [stk(1, { kalipCapi: KC })] });
    yeniMusteri();
    yaz("Çap", "33"); yaz("Boy", "99");
    sec("S-1");
    expect(cap()).toEqual(KC);
  });
  it("AC-43: stok satırının çapı tek parçalıysa formdaki öteki parçalar kaybolur (nesne bütün olarak yazılır)", () => {
    kur({ stock: [stk(1, { kalipCapi: { en: "50" } })] });
    yeniMusteri();
    yaz("Çap", "33"); yaz("Arka Ölçü", "77"); yaz("Boy", "99");
    sec("S-1");
    expect(cap()).toEqual({ en: "50", yukseklik: "", boy: "" });
  });
  it("AC-20: seri no'suz seçenek serisizDusulecek'in seçtiği satırın çapından doldurur ve kayıt o satırı düşer", () => {
    const STOK = [
      { id: 72, model: "AK100", serialNo: "", addedDate: "2026-09-02", uretimDurumu: "montaj", kalipCapi: { en: "10", yukseklik: "10", boy: "10" } },
      { id: 73, model: "AK100", serialNo: "", addedDate: "2026-09-08", kalipCapi: { en: "20", yukseklik: "20", boy: "20" } },
      { id: 74, model: "AK100", serialNo: "", addedDate: "2026-09-12", kalipCapi: { en: "30", yukseklik: "30", boy: "30" } },
    ];
    const { durum } = kur({ stock: STOK });
    yeniMusteri();
    sec("__serisiz__");
    expect(cap()).toEqual({ en: "20", yukseklik: "20", boy: "20" });
    kaydet();
    // Ekleme kolu sourceStockId'yi setCustomers'tan sonra yazar (React güncelleyiciyi sonra çalıştırır; bu düzenek hemen):
    // düşülen satır stok dizisinden ölçülür.
    expect(durum.customers[0].kalipCapi).toEqual({ en: "20", yukseklik: "20", boy: "20" });
    expect(durum.stock.map(s => s.id)).toEqual([72, 74]);
  });
  it("AC-21: 'Manuel gir' seçilince çap kutularına dokunulmaz", () => {
    kur({ stock: [stk(1, { kalipCapi: KC })] });
    yeniMusteri();
    yaz("Arka Ölçü", "44");
    sec("__manual__");
    expect(cap()).toEqual({ en: "", yukseklik: "44", boy: "" });
  });
  it("AC-42: boş seçeneğe dönülünce çap ve kit seçimleri değişmez, seri no ve serisiz işareti temizlenir", () => {
    const STOK = [
      stk(1, { kalipCapi: KC, parcalar: [{ partId: "11", miktar: 1 }] }),
      stk(5, { serialNo: "", kalipCapi: { en: "1", yukseklik: "2", boy: "3" }, parcalar: [{ partId: "12", miktar: 1 }] }),
    ];
    const { durum } = kur({ stock: STOK });
    yeniMusteri();
    sec("S-1");
    sec("");
    expect(cap()).toEqual(KC);
    expect(stokSecici().value).toBe("");
    sec("__serisiz__");
    sec("");
    expect(stokSecici().value).toBe("");
    expect(cap()).toEqual({ en: "1", yukseklik: "2", boy: "3" });
    kaydet();
    // Seri no ve serisiz işareti temizlendi: kayıtta hiçbir stok satırı düşülmez; kit seçimi son makina seçiminde kalır.
    expect(durum.stock.map(s => s.id)).toEqual([1, 5]);
    expect(durum.customers[0].serialNo || "").toBe("");
    expect(durum.customers[0].tipSecimleri).toEqual({ t1: "12" });
  });
  it("AC-42: eskiden boş seçenek ilk serisiz satırın kitini yazıyordu; artık serili seçimin kiti korunur", () => {
    const STOK = [
      stk(1, { kalipCapi: KC, parcalar: [{ partId: "11", miktar: 1 }] }),
      stk(5, { serialNo: "", parcalar: [{ partId: "12", miktar: 1 }] }),
    ];
    const { durum } = kur({ stock: STOK });
    yeniMusteri();
    sec("S-1");
    sec("");
    kaydet();
    expect(durum.customers[0].tipSecimleri).toEqual({ t1: "11" });
    expect(durum.customers[0].kalipCapi).toEqual(KC);
  });
  it("Karar 26 (bilinen sınır): çaplı satırdan sonra çapsız satır seçilirse önceki çap formda kalır", () => {
    kur({ stock: [stk(1, { kalipCapi: KC }), stk(2)] });
    yeniMusteri();
    sec("S-1");
    sec("S-2");
    expect(cap()).toEqual(KC);
  });
  it("AC-22: kaydedilen müşteri formdaki çapı taşır; kullanıcının düzelttiği değer kazanır (kayıt yolu stoğu okumaz)", () => {
    const { durum } = kur({ stock: [stk(1, { kalipCapi: KC })] });
    yeniMusteri();
    sec("S-1");
    yaz("Boy", "999");
    kaydet();
    expect(durum.customers[0]).toMatchObject({ serialNo: "S-1", kalipCapi: { en: "50", yukseklik: "80", boy: "999" } });
    expect(durum.stock).toEqual([]);
  });
});

describe("Spec 0101: düzenleme kipleri (R16)", () => {
  const BEKLEYEN = { id: 1, name: "Bekleyen Seri", model: "AK100", serialNo: "", seriNoBekliyor: true, installDate: "2026-05-01" };
  it("AC-24: seri no bekleyen kaydın düzenlenmesinde stoktan seri seçilince çap forma yazılır", () => {
    const { durum } = kur({ customers: [BEKLEYEN], stock: [stk(70, { kalipCapi: KC })] });
    duzenle("Bekleyen Seri");
    sec("S-70");
    expect(cap()).toEqual(KC);
    kaydet();
    expect(durum.customers[0]).toMatchObject({ serialNo: "S-70", kalipCapi: KC });
  });
  it("AC-25: seri no beklemeyen kaydın düzenlemesinde stok seçicisi yok, çap kendiliğinden değişmez", () => {
    kur({ customers: [{ id: 2, name: "Eski AŞ", model: "AK100", serialNo: "E-1", installDate: "2026-01-01", kalipCapi: { en: "40", yukseklik: "70", boy: "100" } }],
      stock: [stk(1, { kalipCapi: KC })] });
    duzenle("Eski AŞ");
    expect(screen.queryByText(/Stoktan seçin/)).toBeNull();
    expect(cap()).toEqual({ en: "40", yukseklik: "70", boy: "100" });
  });
});

describe("Spec 0101: müşteri silinince stoğa dönen makina (R19–R21)", () => {
  const sil = (ad) => {
    const dugmeler = within(satir(ad)).getAllByRole("button");
    fireEvent.click(dugmeler[dugmeler.length - 1]);
    fireEvent.click(screen.getByText("Evet, Sil"));
  };
  it("AC-26: çapı olan müşteri çöpe atılınca dönen satır aynı çapı taşır", () => {
    const { durum } = kur({ customers: [{ id: 3, name: "Çaplı Müşteri", model: "AK100", serialNo: "D-3", installDate: "2026-02-01", kalipCapi: KC }] });
    sil("Çaplı Müşteri");
    expect(durum.stock).toHaveLength(1);
    expect(durum.stock[0]).toMatchObject({ model: "AK100", serialNo: "D-3", kalipCapi: KC });
  });
  it("AC-27: çapı boş ya da boş nesne olan müşteride dönen satırın gövdesinde kalipCapi yok", () => {
    const { durum } = kur({ customers: [
      { id: 4, name: "Çapsız", model: "AK100", serialNo: "D-4", installDate: "2026-02-01" },
      { id: 5, name: "Boş Nesne", model: "AK100", serialNo: "D-5", installDate: "2026-02-01", kalipCapi: { en: "", yukseklik: " ", boy: "" } },
    ] });
    sil("Çapsız");
    sil("Boş Nesne");
    expect(durum.stock.map(s => s.serialNo).sort()).toEqual(["D-4", "D-5"]);
    expect(durum.stock.every(s => !("kalipCapi" in s))).toBe(true);
  });
  it("AC-28: dönen satır yeniden satılınca çap ön doldurma yoluyla yeni kayda gelir", () => {
    const k = kur({ customers: [{ id: 3, name: "Çaplı Müşteri", model: "AK100", serialNo: "D-3", installDate: "2026-02-01", kalipCapi: KC }] });
    sil("Çaplı Müşteri");
    k.rerender();
    yeniMusteri("İkinci Sahip");
    sec("D-3");
    expect(cap()).toEqual(KC);
    kaydet();
    expect(k.durum.customers.find(c => c.name === "İkinci Sahip")).toMatchObject({ serialNo: "D-3", kalipCapi: KC });
  });
});
