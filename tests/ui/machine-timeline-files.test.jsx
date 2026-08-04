// @vitest-environment jsdom
// Zaman çizelgesinde ataş rozeti: bir servise/kalıba bağlı dosya varsa satırda 📎 + adet çıkar,
// tıklayınca o kaydın dosyaları için callback çağrılır (Dosyalar bölümü açılıp filtrelenir).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(cleanup);
import { MachineTimeline } from "../../src/components/customers/detail/MachineTimeline";

const baseProps = {
  detailView: { id: 1, faturali: "Faturalı Yurtiçi" },
  factoryName: "Altuntaş", kdvRates: {}, canDo: () => true,
  onEditService: () => {}, onPrintOrPick: () => {}, onDeleteService: () => {},
  onEditPartSale: () => {}, onDeletePartSale: () => {}, onEditPayment: () => {},
  onToggleCekTahsil: () => {}, onDeletePayment: () => {}, onToggleServisOdendi: () => {},
  onTogglePartSaleOdendi: () => {},
};

describe("MachineTimeline ataş rozeti", () => {
  it("dosyası olan servis satırında 📎 + adet gösterir, tıklayınca callback çağırır", () => {
    const onDosyaBadge = vi.fn();
    render(<MachineTimeline {...baseProps}
      detailTimelineEvents={[{ kind: "service", sv: { id: 7, type: "Garanti Dışı", date: "2026-07-01" }, title: "Servis · Garanti Dışı", date: "2026-07-01", color: "#e85d1a" }]}
      dosyaAdet={(t, id) => (t === "servis" && id === 7 ? 2 : 0)}
      onDosyaBadge={onDosyaBadge} />);
    const rozet = screen.getByTitle("Bu kayda ait dosyalar");
    expect(rozet.textContent).toContain("2");
    fireEvent.click(rozet);
    expect(onDosyaBadge).toHaveBeenCalledWith("servis", 7);
  });

  it("ödeme satırında dosya rozeti gösterir ve doğru ref ile callback çağırır", () => {
    const onDosyaBadge = vi.fn();
    render(<MachineTimeline {...baseProps}
      detailTimelineEvents={[{ kind: "payment", payment: { id: 9, tutar: 1000, yontem: "Nakit" }, title: "Kapora/Ödeme", date: "2026-07-01", color: "#0d9488" }]}
      dosyaAdet={(t, id) => (t === "odeme" && id === 9 ? 1 : 0)}
      onDosyaBadge={onDosyaBadge} />);
    fireEvent.click(screen.getByTitle("Bu kayda ait dosyalar"));
    expect(onDosyaBadge).toHaveBeenCalledWith("odeme", 9);
  });

  it("yedek parça satırında dosya rozeti gösterir", () => {
    const onDosyaBadge = vi.fn();
    render(<MachineTimeline {...baseProps}
      detailTimelineEvents={[{ kind: "part", ps: { id: 11, ad: "Bıçak" }, title: "Yedek Parça Verildi", desc: "Bıçak · ₺500", date: "2026-07-01", color: "#0891b2" }]}
      dosyaAdet={(t, id) => (t === "parca" && id === 11 ? 3 : 0)}
      onDosyaBadge={onDosyaBadge} />);
    fireEvent.click(screen.getByTitle("Bu kayda ait dosyalar"));
    expect(onDosyaBadge).toHaveBeenCalledWith("parca", 11);
  });

  it("dosyası olmayan servis satırında rozet göstermez", () => {
    render(<MachineTimeline {...baseProps}
      detailTimelineEvents={[{ kind: "service", sv: { id: 8, type: "Garanti Dışı", date: "2026-07-01" }, title: "Servis", date: "2026-07-01", color: "#e85d1a" }]}
      dosyaAdet={() => 0} onDosyaBadge={vi.fn()} />);
    expect(screen.queryByTitle("Bu kayda ait dosyalar")).toBeNull();
  });
});

// Bayiden bu makinaya TAHSİS edilen yedek parça satırı salt-okunur ama tıklanabilir olmalı:
// tıklayınca Stok'taki satışa gitmek için onGoYedekParca(satisId) çağrılır (düzenleme değil).
describe("MachineTimeline bayi tahsis satırı → Stok'a git", () => {
  const tahsisEvent = { kind: "part", ypTahsisId: 650, title: "Yedek Parça (Bayi)", desc: "4 adet cccccc · Ege Makina Ltd. tarafından tahsis edildi", date: "2026-07-27", color: "#0891b2" };

  it("onGoYedekParca varsa başlık tıklanabilir ve satisId ile çağrılır", () => {
    const onGoYedekParca = vi.fn();
    render(<MachineTimeline {...baseProps}
      detailTimelineEvents={[tahsisEvent]} onGoYedekParca={onGoYedekParca} />);
    const baslik = screen.getByTitle("Yedek parça satışına git");
    fireEvent.click(baslik);
    expect(onGoYedekParca).toHaveBeenCalledWith(650);
  });

  it("onGoYedekParca yoksa satır tıklanabilir görünmez (salt-okunur)", () => {
    render(<MachineTimeline {...baseProps}
      detailTimelineEvents={[tahsisEvent]} onGoYedekParca={null} />);
    expect(screen.queryByTitle("Yedek parça satışına git")).toBeNull();
    expect(screen.getByText("Yedek Parça (Bayi)")).toBeTruthy(); // yine de görünür
  });
});

// Müşterinin KENDİ yedek parça satışı satırında Kargo Etiketi yazdır düğmesi (Extra Kalıp'takiyle aynı).
describe("MachineTimeline yedek parça — Kargo Etiketi yazdır", () => {
  const ypEvent = { kind: "part", yp: { id: 700, partId: "7", miktar: 4, currency: "TRY" }, ypGrup: [{ id: 700, partId: "7", miktar: 4, currency: "TRY" }], title: "Yedek Parça (Kargo)", date: "2026-07-27", color: "#0891b2" };

  it("onPrintYedekParcaEtiket verilince yazdır düğmesi çıkar ve grup ile çağrılır", () => {
    const onPrint = vi.fn();
    render(<MachineTimeline {...baseProps}
      detailTimelineEvents={[ypEvent]} onPrintYedekParcaEtiket={onPrint} />);
    fireEvent.click(screen.getByTitle("Kargo Etiketi Yazdır"));
    expect(onPrint).toHaveBeenCalledWith(ypEvent.ypGrup);
  });

  it("onPrintYedekParcaEtiket yoksa yazdır düğmesi çıkmaz", () => {
    render(<MachineTimeline {...baseProps}
      detailTimelineEvents={[ypEvent]} onPrintYedekParcaEtiket={null} />);
    expect(screen.queryByTitle("Kargo Etiketi Yazdır")).toBeNull();
  });
});
