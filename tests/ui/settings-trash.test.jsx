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
