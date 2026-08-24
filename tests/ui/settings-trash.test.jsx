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
