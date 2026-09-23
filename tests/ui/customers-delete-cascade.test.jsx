// @vitest-environment jsdom
// Müşteri silme kaskadı: müşteri Çöp Kutusu'na taşınınca alıcısı o müşteri olan yedek parça satışları
// (stok iadesiyle), görüşmeler ve dosyalar da AYNI damgayla çöpe gitmeli; bayinin bu makinaya tahsis
// ettiği satış kalmalı (tahsis serbest metne döner). Onay penceresi bağlı kayıt sayılarını göstermeli.
// Gerileme: yedek parça satışı kaskada hiç girmemişti → müşteri silinince "sahipsiz" kalıp raporda "—".
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, within } from "@testing-library/react";

afterEach(cleanup);
import { Customers } from "../../src/components/Customers";

const M = 500;
const musteri = { id: M, name: "BAL KÖFTE&BURGER", model: "AK140_DSC", serialNo: "F11224822" };

function kur() {
  const durum = {
    customers: [musteri, { id: 501, name: "Başka Firma", model: "AK100" }],
    services: [{ id: 1, customerId: M, date: "2026-07-28" }, { id: 2, customerId: M, date: "2026-07-28" }, { id: 3, customerId: 501 }],
    partSales: [{ id: 10, customerId: M, tur: "Kalıp", ad: "Hamburger" }],
    payments: [{ id: 20, customerId: M, tutar: 100 }],
    yedekParcaSatislar: [
      { id: 30, aliciTipi: "musteri", musteriId: M, partId: "7", miktar: 2, tahsisler: [{ customerId: M, miktar: 2 }] },
      { id: 31, aliciTipi: "bayi", dealerId: 9, partId: "7", miktar: 5, tahsisler: [{ customerId: M, miktar: 1 }] },
    ],
    gorusmeler: [{ id: 40, customerId: M, not: "arandı" }, { id: 41, customerId: 501, not: "x" }],
    dosyalar: [{ id: 50, customerId: M, ad: "a.pdf", dosyaAdi: "a.pdf" }],
    stock: [],
    partStock: [{ partId: "7", miktar: 1 }],
    partStockLog: [{ id: 60, partId: "7", miktar: -2, tip: "bayi_satis", referansId: 30 }, { id: 61, partId: "7", miktar: -5, tip: "bayi_satis", referansId: 31 }],
  };
  const setter = (k) => vi.fn((u) => { durum[k] = typeof u === "function" ? u(durum[k]) : u; });
  const setters = {
    setCustomers: setter("customers"), setServices: setter("services"), setPartSales: setter("partSales"), setPayments: setter("payments"),
    setYedekParcaSatislar: setter("yedekParcaSatislar"), setGorusmeler: setter("gorusmeler"), setDosyalar: setter("dosyalar"),
    setPartStock: setter("partStock"), setPartStockLog: setter("partStockLog"), setStock: setter("stock"),
  };
  const utils = render(<Customers
    customers={durum.customers} services={durum.services} partSales={durum.partSales} payments={durum.payments}
    yedekParcaSatislar={durum.yedekParcaSatislar} gorusmeler={durum.gorusmeler} dosyalar={durum.dosyalar}
    stock={durum.stock} partStock={durum.partStock} partStockLog={durum.partStockLog} {...setters} />);
  return { durum, setters, utils };
}

const silDugmesineBas = () => {
  const satir = screen.getByText("BAL KÖFTE&BURGER").closest("tr");
  const dugmeler = within(satir).getAllByRole("button");
  fireEvent.click(dugmeler[dugmeler.length - 1]); // sondaki = çöp kutusu (danger) düğmesi
};

describe("Müşteri silme kaskadı", () => {
  it("onay penceresi bağlı kayıt sayılarını, bayi tahsis notunu ve makinanın stoğa döneceğini söyler", () => {
    kur();
    silDugmesineBas();
    const metin = screen.getByText(/Çöp Kutusu'na taşınacak/).textContent;
    expect(metin).toContain("Birlikte taşınacak: 2 servis kaydı, 1 Extra Kalıp satışı, 1 yedek parça satışı, 1 ödeme/kapora kaydı, 1 görüşme, 1 dosya.");
    expect(metin).toContain("Bayinin bu makinaya tahsis ettiği 1 yedek parça satışı silinmez");
    expect(metin).toContain("Makina, Makina Stoğu'na geri döner.");
  });

  it("silince yedek parça (alıcı müşteri) + görüşme + dosya müşteriyle AYNI damgayla çöpe gider; parça stoğu iade edilir; bayi satışı kalır", () => {
    const { durum, setters } = kur();
    silDugmesineBas();
    fireEvent.click(screen.getByText("Evet, Sil"));

    const ts = durum.customers.find(c => c.id === M).deletedAt;
    expect(ts).toBeTruthy();
    // Mevcut kaskad korunuyor
    expect(durum.services.filter(s => s.customerId === M).every(s => s.deletedAt === ts)).toBe(true);
    expect(durum.services.find(s => s.id === 3).deletedAt).toBeUndefined();
    expect(durum.partSales[0].deletedAt).toBe(ts);
    expect(durum.payments[0].deletedAt).toBe(ts);
    // YENİ: yedek parça (alıcı müşteri) aynı damga; bayi alımı kalır, tahsis serbest metne döner
    expect(setters.setYedekParcaSatislar).toHaveBeenCalled();
    expect(durum.yedekParcaSatislar.find(s => s.id === 30).deletedAt).toBe(ts);
    const bayi = durum.yedekParcaSatislar.find(s => s.id === 31);
    expect(bayi.deletedAt).toBeUndefined();
    expect(bayi.tahsisler[0]).toEqual({ customerId: null, miktar: 1, makinaSerbest: "BAL KÖFTE&BURGER · F11224822 (silinen müşteri)" });
    // YENİ: parça stoğu iade (yalnız silinen satışın hareketi; bayi satışınınki kalır)
    expect(durum.partStock.find(s => s.partId === "7").miktar).toBe(3); // 1 + 2
    expect(durum.partStockLog.some(l => l.referansId === 30)).toBe(false);
    expect(durum.partStockLog.some(l => l.referansId === 31)).toBe(true);
    // YENİ: görüşme + dosya aynı damga; başka müşterininki dokunulmaz
    expect(durum.gorusmeler.find(g => g.id === 40).deletedAt).toBe(ts);
    expect(durum.gorusmeler.find(g => g.id === 41).deletedAt).toBeUndefined();
    expect(durum.dosyalar[0].deletedAt).toBe(ts);
    // Makina Makina Stoğu'na döner (mevcut davranış korunuyor)
    expect(durum.stock.some(s => s.model === "AK140_DSC" && s.serialNo === "F11224822")).toBe(true);
  });

  it("bağlı kayıt yoksa onay penceresi 'Bağlı kayıt yok' der", () => {
    render(<Customers customers={[{ id: 1, name: "Yalnız Firma" }]} setCustomers={vi.fn()} />);
    const satir = screen.getByText("Yalnız Firma").closest("tr");
    const dugmeler = within(satir).getAllByRole("button");
    fireEvent.click(dugmeler[dugmeler.length - 1]);
    const metin = screen.getByText(/Çöp Kutusu'na taşınacak/).textContent;
    expect(metin).toContain("Bağlı kayıt yok.");
    expect(metin).not.toContain("Makina Stoğu");
  });
});

describe("Müşteri silme — bağlı gider sayısı (spec 0001 R7, AC-28)", () => {
  it("makinaya atanmış gider sayısı onayda görünür (müşteri id'si ve kaynak stok id'si üzerinden); kalem silinmez", () => {
    const setGiderler = vi.fn();
    const m = { id: 700, name: "GİDERLİ FİRMA", model: "AK120", serialNo: "S-9", sourceStockId: 88 };
    const giderler = [
      { id: 1, atamaTur: "makina", makinaTur: "musteri", makinaId: 700 },
      { id: 2, atamaTur: "makina", makinaTur: "stok", makinaId: 88 },
      { id: 3, atamaTur: "makina", makinaTur: "musteri", makinaId: 701 },
      { id: 4, atamaTur: "makina", makinaTur: "musteri", makinaId: 700, deletedAt: "x" },
    ];
    render(<Customers customers={[m]} setCustomers={vi.fn()} services={[]} partSales={[]} payments={[]} yedekParcaSatislar={[]} gorusmeler={[]} dosyalar={[]}
      stock={[]} setStock={vi.fn()} giderler={giderler} setGiderler={setGiderler} />);
    const satir = screen.getByText("GİDERLİ FİRMA").closest("tr");
    const dugmeler = within(satir).getAllByRole("button");
    fireEvent.click(dugmeler[dugmeler.length - 1]);
    expect(screen.getByText(/Çöp Kutusu'na taşınacak/).textContent).toContain("Bu makinaya atanmış 2 gider kalemi var: silinmez, ortak gidere düşer");
    expect(setGiderler).not.toHaveBeenCalled();
  });
  it("gider yetkisi yoksa (giderler boş gelir) sayı yazılmaz", () => {
    render(<Customers customers={[{ id: 700, name: "YETKİSİZ", model: "AK120", serialNo: "S" }]} setCustomers={vi.fn()} services={[]} partSales={[]} payments={[]}
      yedekParcaSatislar={[]} gorusmeler={[]} dosyalar={[]} stock={[]} setStock={vi.fn()} />);
    const satir = screen.getByText("YETKİSİZ").closest("tr");
    const dugmeler = within(satir).getAllByRole("button");
    fireEvent.click(dugmeler[dugmeler.length - 1]);
    expect(screen.getByText(/Çöp Kutusu'na taşınacak/).textContent).not.toMatch(/gider/);
  });
});
