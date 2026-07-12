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
