// @vitest-environment jsdom
// Regresyon: Firma Çalışanları (calisanlar) ve Parça Tipi (partTypeDefs) soft-delete
// ediliyordu ama Çöp Kutusu'nda görünmüyordu — geri alınamıyor ve hiç temizlenmiyordu.
// Bu iki tür artık çöp kutusunda listelenmeli, "Geri Al" deletedAt'i temizlemeli.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, screen, cleanup, within } from "@testing-library/react";

afterEach(cleanup);
import { SettingsTrash } from "../../src/components/settings/SettingsTrash";

// SettingsTrash çok sayıda dizi bekliyor; sadece test edilen ikisini doldurup gerisini boş geçiyoruz.
const bosDizi = [];
const noop = () => {};

function renderTrash(overrides = {}) {
  const props = {
    rawCustomers: bosDizi, rawServices: bosDizi, rawPartSales: bosDizi, rawPayments: bosDizi,
    rawDealers: bosDizi, rawStock: bosDizi, rawNotes: bosDizi, rawKalipDefs: bosDizi, rawParts: bosDizi,
    rawCustomModels: bosDizi, rawTeklifler: bosDizi, rawFaturalar: bosDizi, rawUretimFormlari: bosDizi,
    rawGorusmeler: bosDizi, rawDosyalar: bosDizi,
    setCustomers: noop, setServices: noop, setPartSales: noop, setPayments: noop, setDealers: noop,
    setStock: noop, setNotes: noop, setKalipDefs: noop, setParts: noop, setCustomModels: noop,
    setTeklifler: noop, setFaturalar: noop, setUretimFormlari: noop, setGorusmeler: noop, setDosyalar: noop,
    appSettings: {}, showToast: noop,
    ...overrides,
  };
  return render(<SettingsTrash {...props} />);
}

describe("Çöp Kutusu — Parça Tipi ve Çalışan", () => {
  it("soft-silinmiş parça tipi ve çalışan listede görünür", () => {
    renderTrash({
      rawPartTypeDefs: [{ id: "tip_1", ad: "Conta", deletedAt: "2026-07-20T10:00:00.000Z" }],
      rawCalisanlar: [{ id: "c1", ad: "Ahmet Yılmaz", deletedAt: "2026-07-20T11:00:00.000Z" }],
    });
    expect(screen.getByText("Parça Tipi")).toBeTruthy();
    expect(screen.getByText("Conta")).toBeTruthy();
    expect(screen.getByText("Çalışan")).toBeTruthy();
    expect(screen.getByText("Ahmet Yılmaz")).toBeTruthy();
  });

  it("deletedAt'i olmayan kayıt çöp kutusunda görünmez", () => {
    renderTrash({
      rawCalisanlar: [{ id: "c1", ad: "Aktif Çalışan" }], // silinmemiş
    });
    expect(screen.getByText("Çöp kutusu boş.")).toBeTruthy();
  });

  it("çalışan 'Geri Al' deletedAt'i temizler", () => {
    let sonuc = null;
    const setCalisanlar = vi.fn((updater) => { sonuc = updater([{ id: "c1", ad: "Ahmet", deletedAt: "2026-07-20T11:00:00.000Z" }]); });
    renderTrash({
      rawCalisanlar: [{ id: "c1", ad: "Ahmet", deletedAt: "2026-07-20T11:00:00.000Z" }],
      setCalisanlar,
    });
    const satir = screen.getByText("Ahmet").closest("tr");
    fireEvent.click(within(satir).getByText("Geri Al"));
    expect(setCalisanlar).toHaveBeenCalled();
    expect(sonuc.find(x => x.id === "c1").deletedAt).toBeUndefined();
  });

  it("soft-silinmiş yedek parça satışı çöp kutusunda görünür ve 'Geri Al' deletedAt'i temizler", () => {
    let sonuc = null;
    const rec = { id: 700, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 3, deletedAt: "2026-07-26T09:00:00.000Z", tahsisler: [] };
    const setYedekParcaSatislar = vi.fn((updater) => { sonuc = updater([rec]); });
    renderTrash({
      rawDealers: [{ id: 5, name: "Bayi X" }], rawParts: [{ id: 7, ad: "Dişli" }],
      rawYedekParcaSatislar: [rec], setYedekParcaSatislar,
    });
    expect(screen.getByText("Yedek Parça Satışı")).toBeTruthy();
    expect(screen.getByText(/Bayi X · Dişli · 3 adet/)).toBeTruthy();
    const satir = screen.getByText(/Bayi X · Dişli/).closest("tr");
    fireEvent.click(within(satir).getByText("Geri Al"));
    expect(setYedekParcaSatislar).toHaveBeenCalled();
    expect(sonuc.find(x => x.id === 700).deletedAt).toBeUndefined();
  });

  // Regresyon: müşteri kalıcı silinince görüşme/dosyaları temizlenmezse customerId yetim kalır ve
  // TÜM save transaction'ı "FOREIGN KEY constraint failed" ile çöker (hiçbir alan kaydedilemez).
  it("müşteri 'Kalıcı Sil' onun görüşme ve dosyalarını da diziden çıkarır (yetim FK önlemi)", () => {
    const cust = { id: 500, name: "Silinecek Firma", deletedAt: "2026-08-01T10:00:00.000Z" };
    let dosyaSonuc = null, gorusmeSonuc = null;
    const setDosyalar = vi.fn((updater) => {
      dosyaSonuc = updater([
        { id: 8000, customerId: 500, ad: "a.pdf", dosyaAdi: "a.pdf" },
        { id: 8002, dealerId: 3, ad: "bayi.pdf", dosyaAdi: "b.pdf" }, // başka sahibin dosyası — kalmalı
      ]);
    });
    const setGorusmeler = vi.fn((updater) => {
      gorusmeSonuc = updater([
        { id: 7000, customerId: 500, not: "görüşme" },
        { id: 7001, customerId: 501, not: "başka müşteri" }, // kalmalı
      ]);
    });
    renderTrash({
      rawCustomers: [cust],
      rawDosyalar: [{ id: 8000, customerId: 500, ad: "a.pdf", dosyaAdi: "a.pdf" }],
      setCustomers: noop, setDosyalar, setGorusmeler,
    });
    const satir = screen.getByText("Silinecek Firma").closest("tr");
    fireEvent.click(within(satir).getByText("Kalıcı Sil"));
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(setDosyalar).toHaveBeenCalled();
    expect(setGorusmeler).toHaveBeenCalled();
    // Müşterinin dosyası/görüşmesi gitti, başkalarınınki kaldı
    expect(dosyaSonuc.some(x => x.id === 8000)).toBe(false);
    expect(dosyaSonuc.some(x => x.id === 8002)).toBe(true);
    expect(gorusmeSonuc.some(x => x.id === 7000)).toBe(false);
    expect(gorusmeSonuc.some(x => x.id === 7001)).toBe(true);
  });

  // Müşteri silme kaskadı (lib/musteriKaskad.js) simetrisi: müşteriyle aynı damgayla çöpe giden
  // yedek parça satışı / görüşme / dosya, müşteri geri alınınca birlikte dönmeli (stok yeniden düşer),
  // kalıcı silinince birlikte gitmeli. Bayinin aldığı satış ve başka damgalı kayıt dokunulmamalı.
  it("müşteri 'Geri Al' aynı damgalı yedek parça/görüşme/dosyayı da geri alır ve parça stoğunu yeniden düşer", () => {
    const ts = "2026-09-18T10:00:00.000Z";
    const cust = { id: 500, name: "Kaskad Firma", deletedAt: ts };
    const durum = {
      yp: [
        { id: 30, aliciTipi: "musteri", musteriId: 500, partId: "7", miktar: 2, deletedAt: ts, tahsisler: [] },
        { id: 33, aliciTipi: "musteri", musteriId: 500, partId: "7", miktar: 1, deletedAt: "2026-08-01T00:00:00.000Z", tahsisler: [] }, // ayrı silinmiş → kalır
        { id: 31, aliciTipi: "bayi", dealerId: 9, partId: "7", miktar: 5, tahsisler: [] },
      ],
      gorusme: [{ id: 40, customerId: 500, not: "x", deletedAt: ts }],
      dosya: [{ id: 50, customerId: 500, ad: "a.pdf", dosyaAdi: "a.pdf", deletedAt: ts }],
      stok: [{ partId: "7", miktar: 10 }], log: [],
    };
    const setter = (k) => vi.fn((u) => { durum[k] = u(durum[k]); });
    renderTrash({
      rawCustomers: [cust], rawYedekParcaSatislar: durum.yp, rawGorusmeler: durum.gorusme, rawDosyalar: durum.dosya, rawParts: [{ id: 7, ad: "Yüzük" }],
      partStock: durum.stok, partStockLog: durum.log,
      setCustomers: noop, setYedekParcaSatislar: setter("yp"), setGorusmeler: setter("gorusme"), setDosyalar: setter("dosya"),
      setPartStock: setter("stok"), setPartStockLog: setter("log"),
    });
    const satir = screen.getByText("Kaskad Firma").closest("tr");
    fireEvent.click(within(satir).getByText("Geri Al"));
    expect(durum.yp.find(x => x.id === 30).deletedAt).toBeUndefined();
    expect(durum.yp.find(x => x.id === 33).deletedAt).toBe("2026-08-01T00:00:00.000Z");
    expect(durum.yp.find(x => x.id === 31).deletedAt).toBeUndefined();
    expect(durum.gorusme[0].deletedAt).toBeUndefined();
    expect(durum.dosya[0].deletedAt).toBeUndefined();
    // stok yeniden düştü (yalnız geri alınan satış: 2 adet)
    expect(durum.stok.find(s => s.partId === "7").miktar).toBe(8);
    expect(durum.log.filter(l => l.referansId === 30 && l.tip === "bayi_satis")).toHaveLength(1);
  });

  it("müşteri 'Geri Al': stok yetersizse yalnız mevcut kadarı düşer (eksiye düşmez), sıfırsa hareket yazılmaz", () => {
    const ts = "2026-09-18T10:00:00.000Z";
    const cust = { id: 500, name: "Kaskad Firma", deletedAt: ts };
    const durum = {
      yp: [
        { id: 30, aliciTipi: "musteri", musteriId: 500, partId: "7", miktar: 5, deletedAt: ts, tahsisler: [] }, // stokta 2 var → 2 düşer
        { id: 34, aliciTipi: "musteri", musteriId: 500, partId: "9", miktar: 1, deletedAt: ts, tahsisler: [] }, // stokta hiç yok → hareket yok
      ],
      stok: [{ partId: "7", miktar: 2 }], log: [],
    };
    const setter = (k) => vi.fn((u) => { durum[k] = u(durum[k]); });
    renderTrash({ rawCustomers: [cust], rawYedekParcaSatislar: durum.yp, partStock: durum.stok, partStockLog: durum.log,
      setCustomers: noop, setYedekParcaSatislar: setter("yp"), setPartStock: setter("stok"), setPartStockLog: setter("log") });
    fireEvent.click(within(screen.getByText("Kaskad Firma").closest("tr")).getByText("Geri Al"));
    expect(durum.yp.every(x => x.deletedAt === undefined)).toBe(true);
    expect(durum.stok.find(s => s.partId === "7").miktar).toBe(0);
    expect(durum.log.filter(l => l.referansId === 30)).toHaveLength(1);
    expect(durum.log.find(l => l.referansId === 30).miktar).toBe(-2);
    expect(durum.log.some(l => l.referansId === 34)).toBe(false);
  });

  it("müşteri 'Kalıcı Sil' aynı damgalı yedek parça satışını da diziden çıkarır; bayi satışı kalır", () => {
    const ts = "2026-09-18T10:00:00.000Z";
    const cust = { id: 500, name: "Kaskad Firma", deletedAt: ts };
    let sonuc = null;
    const setYedekParcaSatislar = vi.fn((u) => { sonuc = u([
      { id: 30, aliciTipi: "musteri", musteriId: 500, partId: "7", miktar: 2, deletedAt: ts, tahsisler: [] },
      { id: 31, aliciTipi: "bayi", dealerId: 9, partId: "7", miktar: 5, tahsisler: [] },
    ]); });
    renderTrash({ rawCustomers: [cust], setCustomers: noop, setYedekParcaSatislar, setGorusmeler: noop, setDosyalar: noop });
    const satir = screen.getByText("Kaskad Firma").closest("tr");
    fireEvent.click(within(satir).getByText("Kalıcı Sil"));
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(sonuc.some(x => x.id === 30)).toBe(false);
    expect(sonuc.some(x => x.id === 31)).toBe(true);
  });

  it("parça tipi 'Kalıcı Sil' sonrası setPartTypeDefs kaydı diziden çıkarır", () => {
    let sonuc = null;
    const setPartTypeDefs = vi.fn((updater) => { sonuc = updater([{ id: "tip_1", ad: "Conta", deletedAt: "2026-07-20T10:00:00.000Z" }]); });
    renderTrash({
      rawPartTypeDefs: [{ id: "tip_1", ad: "Conta", deletedAt: "2026-07-20T10:00:00.000Z" }],
      setPartTypeDefs,
    });
    const satir = screen.getByText("Conta").closest("tr");
    fireEvent.click(within(satir).getByText("Kalıcı Sil"));
    // Onay diyaloğu açılır — onayla
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(setPartTypeDefs).toHaveBeenCalled();
    expect(sonuc.find(x => x.id === "tip_1")).toBeUndefined();
  });
});
