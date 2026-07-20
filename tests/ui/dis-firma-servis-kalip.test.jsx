// @vitest-environment jsdom
// Anlaşmasız dış firma: Serviste "İşlemi Yapan Firma" = "Diğer" seçilince, Extra Kalıp'ta
// "Satış Yapan Firma" = "Diğer" seçilince altta firma adı/yetkili/telefon/ülke-şehir alanları
// açılır ve YALNIZ o kayda yazılır (müşteri/bayi kaydı oluşturmadan). Bilgiler makina geçmişinde
// de görünür.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(cleanup);
import { ServiceForm } from "../../src/components/ServiceForm";
import { PartSaleForm } from "../../src/components/PartSaleForm";
import { MachineTimeline } from "../../src/components/customers/detail/MachineTimeline";

const customers = [{ id: 1, name: "ABC Makina", faturali: "Faturalı Yurtiçi" }];
const dealers = [{ id: 3, name: "Anadolu Bayi", bayiMi: true, anlasmaliServisMi: true }];

describe("ServiceForm — İşlemi Yapan Firma = Diğer", () => {
  const svProps = (form) => ({ title: "Yeni Servis Talebi", form, setForm: vi.fn(), customers, dealers, factory: { name: "Altuntaş Makina" }, onSave: vi.fn(), onCancel: vi.fn() });

  it("Diğer değilken dış firma alanları görünmez", () => {
    render(<ServiceForm {...svProps({ customerId: 1, islemFirma: "Altuntaş Makina", degisenParcalar: [] })} />);
    expect(screen.queryByText(/Anlaşmasız Dış Servis Firması/)).toBeNull();
  });

  it("Diğer seçiliyken firma adı/yetkili/telefon alanları çıkar", () => {
    render(<ServiceForm {...svProps({ customerId: 1, islemFirma: "Diğer", degisenParcalar: [] })} />);
    expect(screen.getByText(/Anlaşmasız Dış Servis Firması/)).toBeTruthy();
    expect(screen.getByText("Firma Adı")).toBeTruthy();
    expect(screen.getByText("Yetkili Kişi")).toBeTruthy();
    expect(screen.getByText("Telefon")).toBeTruthy();
  });

  it("İşlemi Yapan Firma select'inde 'Diğer' seçeneği var ve seçim setForm'a yazılır", () => {
    const setForm = vi.fn();
    render(<ServiceForm {...{ ...svProps({ customerId: 1, islemFirma: "Altuntaş Makina", degisenParcalar: [] }), setForm }} />);
    const opt = screen.getByRole("option", { name: /Diğer \(anlaşmasız firma\)/ });
    expect(opt).toBeTruthy();
    fireEvent.change(opt.closest("select"), { target: { value: "Diğer" } });
    expect(setForm).toHaveBeenCalled();
  });
});

describe("PartSaleForm — Satış Yapan Firma = Diğer", () => {
  const pkProps = (form) => ({ title: "Extra Kalıp Satışı", form, setForm: vi.fn(), customers, kalipDefs: [], dealers, factory: { name: "Altuntaş Makina" }, onSave: vi.fn(), onCancel: vi.fn() });

  it("Satış Yapan Firma select'i bayileri listeler", () => {
    render(<PartSaleForm {...pkProps({ customerId: 1, kaliplar: [], currency: "TRY" })} />);
    expect(screen.getByRole("option", { name: "Anadolu Bayi" })).toBeTruthy();
    expect(screen.getByRole("option", { name: /Diğer \(anlaşmasız firma\)/ })).toBeTruthy();
  });

  it("Diğer seçiliyken firma alanları çıkar", () => {
    render(<PartSaleForm {...pkProps({ customerId: 1, kaliplar: [], currency: "TRY", satisFirma: "Diğer" })} />);
    expect(screen.getByText(/Anlaşmasız Firma/)).toBeTruthy();
    expect(screen.getByText("Firma Adı")).toBeTruthy();
  });
});

describe("MachineTimeline — dış firma bilgisi makina geçmişinde görünür", () => {
  const base = {
    detailView: { id: 1, faturali: "Faturalı Yurtiçi" },
    detailTimelineEvents: [],
    factoryName: "Altuntaş Makina",
    kdvRates: [], canDo: () => false,
    onPrintOrPick: () => {},
  };

  it("Diğer servis: 'Dış Servis (Anlaşmasız): {ad}' + yetkili/telefon yazılır", () => {
    const sv = { id: 9, customerId: 1, type: "Periyodik Bakım", date: "2026-07-11", islemFirma: "Diğer", islemFirmaAd: "Harici Servis Ltd", islemFirmaYetkili: "Ahmet", islemFirmaTel: "0555", islemFirmaSehir: "Bursa", islemFirmaUlke: "Türkiye" };
    render(<MachineTimeline {...base} detailTimelineEvents={[{ kind: "service", date: sv.date, color: "#000", title: sv.type, sv }]} />);
    expect(screen.getByText(/Dış Servis \(Anlaşmasız\): Harici Servis Ltd/)).toBeTruthy();
    expect(screen.getByText(/Ahmet · 0555 · Bursa, Türkiye/)).toBeTruthy();
  });

  it("7 olaydan fazla olunca sayfalanır: ilk sayfa 7 olay, sonraki sayfada kalanlar", () => {
    const olaylar = Array.from({ length: 9 }, (_, n) => ({
      kind: "service", date: "2026-07-11", color: "#000", title: "Periyodik Bakım",
      sv: { id: n + 1, customerId: 1, type: "Periyodik Bakım", date: "2026-07-11", tech: `Teknisyen${n + 1}` },
    }));
    render(<MachineTimeline {...base} detailTimelineEvents={olaylar} />);
    // 1. sayfa: ilk 7 (Teknisyen1..7) var, 8-9 yok
    expect(screen.getByText(/Teknisyen1\b/)).toBeTruthy();
    expect(screen.getByText(/Teknisyen7\b/)).toBeTruthy();
    expect(screen.queryByText(/Teknisyen8\b/)).toBeNull();
    // Sayfalama var; sonrakine geçince 8-9 gelir, 1 gider
    fireEvent.click(screen.getByRole("button", { name: /Sonraki/ }));
    expect(screen.getByText(/Teknisyen8\b/)).toBeTruthy();
    expect(screen.getByText(/Teknisyen9\b/)).toBeTruthy();
    expect(screen.queryByText(/Teknisyen1\b/)).toBeNull();
  });

  it("7 veya daha az olayda sayfalama görünmez", () => {
    const olaylar = Array.from({ length: 7 }, (_, n) => ({
      kind: "service", date: "2026-07-11", color: "#000", title: "Periyodik Bakım",
      sv: { id: n + 1, customerId: 1, type: "Periyodik Bakım", date: "2026-07-11", tech: `T${n + 1}` },
    }));
    render(<MachineTimeline {...base} detailTimelineEvents={olaylar} />);
    expect(screen.queryByRole("button", { name: /Sonraki/ })).toBeNull();
  });
});
