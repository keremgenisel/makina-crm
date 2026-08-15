// @vitest-environment jsdom
// Genel aramadan "servis" sonucuna tıklanınca müşteri modalında O servisin vurgulanması:
// MachineTimeline, odakServisId ile eşleşen servis olayını vurgular (data-odak-servis) ve
// görünür alana kaydırır. Yanlış servis/başka olay vurgulanmaz.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
import { MachineTimeline } from "../../src/components/customers/detail/MachineTimeline";

const svc = (id, title) => ({ kind: "service", sv: { id, type: "Garanti Dışı", date: "2026-07-01", currency: "TRY" }, title, date: "2026-07-01", color: "#e85d1a" });
const events = [svc(700, "Garanti Dışı · Ahmet"), svc(701, "Periyodik Bakım · Mehmet")];

const base = {
  detailView: { id: 1, name: "Genisel Catering" },
  detailTimelineEvents: events, factoryName: "Altuntaş", kdvRates: {}, canDo: () => true,
  onEditService: vi.fn(), onPrintOrPick: vi.fn(), onDeleteService: vi.fn(),
  onEditPartSale: vi.fn(), onDeletePartSale: vi.fn(), onEditPayment: vi.fn(),
  onToggleCekTahsil: vi.fn(), onDeletePayment: vi.fn(), onToggleServisOdendi: vi.fn(), onTogglePartSaleOdendi: vi.fn(),
};

describe("MachineTimeline — odaklı servis vurgusu", () => {
  it("odakServisId ile eşleşen servis vurgulanır ve görünür alana kaydırılır", () => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView.mockClear();
    const { container } = render(<MachineTimeline {...base} odakServisId={700} />);
    const vurgulu = container.querySelectorAll('[data-odak-servis="1"]');
    expect(vurgulu.length).toBe(1); // yalnız bir satır vurgulu
    vi.advanceTimersByTime(200);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled(); // odaklı satıra kaydırıldı
    vi.useRealTimers();
  });

  it("odakServisId yokken hiçbir satır vurgulanmaz", () => {
    const { container } = render(<MachineTimeline {...base} odakServisId={null} />);
    expect(container.querySelectorAll('[data-odak-servis="1"]').length).toBe(0);
  });

  it("eşleşmeyen odakServisId hiçbir satırı vurgulamaz", () => {
    const { container } = render(<MachineTimeline {...base} odakServisId={999} />);
    expect(container.querySelectorAll('[data-odak-servis="1"]').length).toBe(0);
  });

  it("odakOdemeId ile eşleşen ödeme (kapora/çek/KK) olayı vurgulanır", () => {
    const odemeEvents = [
      { kind: "payment", date: "2026-09-01", color: "#0d9488", title: "Kapora/Ödeme", desc: "₺5.000", payment: { id: 50, yontem: "Çek" } },
      { kind: "payment", date: "2026-10-01", color: "#0d9488", title: "Kapora/Ödeme", desc: "₺8.000", payment: { id: 60, yontem: "Kredi Kartı" } },
    ];
    const { container } = render(<MachineTimeline {...base} detailTimelineEvents={odemeEvents} odakOdemeId={50} onEditPayment={vi.fn()} />);
    expect(container.querySelectorAll('[data-odak-odeme="1"]').length).toBe(1);
  });

  it("odakTaksitId ile eşleşen taksit olayı vurgulanır", () => {
    const taksitEvents = [
      { kind: "taksit", date: "2026-09-01", color: "#f59e0b", title: "Taksit Vadesi", desc: "₺1.000", taksit: { id: 99, vadeTarihi: "2026-09-01", tutar: 1000 } },
      { kind: "taksit", date: "2026-10-01", color: "#f59e0b", title: "Taksit Vadesi", desc: "₺2.000", taksit: { id: 100, vadeTarihi: "2026-10-01", tutar: 2000 } },
    ];
    const { container } = render(<MachineTimeline {...base} detailTimelineEvents={taksitEvents} odakTaksitId={99} />);
    expect(container.querySelectorAll('[data-odak-taksit="1"]').length).toBe(1);
  });

  it("odakKalipId ile eşleşen Extra Kalıp olayı (psList içinde) vurgulanır", () => {
    const kalipEvents = [
      { kind: "part", psList: [{ id: 800, ad: "Simit Kalıbı", tur: "Kalıp" }], title: "Kalıp Verildi", date: "2026-06-01", color: "#db2777" },
      { kind: "part", psList: [{ id: 801, ad: "Poğaça Kalıbı", tur: "Kalıp" }], title: "Kalıp Verildi", date: "2026-06-02", color: "#db2777" },
    ];
    const { container } = render(<MachineTimeline {...base} detailTimelineEvents={kalipEvents} odakKalipId={800} />);
    const vurgulu = container.querySelectorAll('[data-odak-kalip="1"]');
    expect(vurgulu.length).toBe(1);
    expect(vurgulu[0].textContent).toContain("Simit Kalıbı");
  });
});
