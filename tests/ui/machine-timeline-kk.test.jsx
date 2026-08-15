// @vitest-environment jsdom
// Müşteri detay timeline'ında KREDİ KARTI (komisyon müşteriye yansıtılmış) satışlarında para satırı
// üçlü kırılım gösterir: Ürün + Komisyon + KDV + Çekilen kart. Matrah'ı "ürün fiyatı" gibi göstermez.
// Yansıt olmayan satışlar eski "bedel · KDV dahil" gösterimini korur.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
import { MachineTimeline } from "../../src/components/customers/detail/MachineTimeline";

const base = {
  detailView: { id: 1, name: "Genisel", faturali: "Faturalı Yurtiçi" },
  factoryName: "Altuntaş", kdvRates: { "2020-01-01": 20 }, canDo: () => true,
  onEditService: vi.fn(), onPrintOrPick: vi.fn(), onDeleteService: vi.fn(),
  onEditPartSale: vi.fn(), onDeletePartSale: vi.fn(), onEditPayment: vi.fn(),
  onToggleCekTahsil: vi.fn(), onDeletePayment: vi.fn(), onToggleServisOdendi: vi.fn(), onTogglePartSaleOdendi: vi.fn(),
};

// Extra Kalıp — kredi kartı, komisyon yansıtılmış (ucret=matrah, kartKomisyonu.yansitildi=true)
const yansitPs = { id: 1, ad: "bbbbbb", olcu: "40x40x40", ucret: 50302, currency: "TRY", faturaTipi: "Faturalı Yurtiçi",
  tarih: "2026-08-12", yontem: "Kredi Kartı", odendi: true, kartKomisyonu: { toplamKesinti: 8139, yansitildi: true } };
const kalipEv = (ps) => ({ kind: "part", psList: [ps], title: "Kalıp Verildi", date: "2026-08-12", color: "#db2777" });

describe("MachineTimeline — kredi kartı yansıt üçlü kırılım", () => {
  it("yansıt satışında Ürün + Komisyon + Çekilen kart gösterilir, 'KDV dahil' değil", () => {
    const { container } = render(<MachineTimeline {...base} detailTimelineEvents={[kalipEv(yansitPs)]} />);
    const txt = container.textContent;
    expect(txt).toContain("Ürün:");
    expect(txt).toContain("Komisyon:");
    expect(txt).toContain("Çekilen kart:");
    expect(txt).not.toContain("KDV dahil:"); // yanıltıcı matrah+KDV satırı yok
  });

  it("yansıt OLMAYAN satış eski gösterimi korur (bedel · KDV dahil)", () => {
    const plainPs = { ...yansitPs, kartKomisyonu: null }; // komisyon yansıtılmamış
    const { container } = render(<MachineTimeline {...base} detailTimelineEvents={[kalipEv(plainPs)]} />);
    const txt = container.textContent;
    expect(txt).toContain("KDV dahil:");
    expect(txt).not.toContain("Çekilen kart:");
  });

  it("makina ödemesinde (kapora/ödeme) ödeme yöntemi PİL olarak gösterilir (kalıp/yedek parça ile tutarlı)", () => {
    const paymentEv = { kind: "payment", title: "Kapora/Ödeme", desc: "₺122.117", date: "2026-08-12", color: "#0d9488",
      payment: { id: 9, yontem: "Kredi Kartı" } };
    const { getByText } = render(<MachineTimeline {...base} detailTimelineEvents={[paymentEv]} onEditPayment={vi.fn()} />);
    expect(getByText("Kredi Kartı")).toBeTruthy();
  });

  it("kalıpta yöntem pili + 'Etiket' yazdır butonu (servis stili) gösterilir", () => {
    const { getByText, getByRole } = render(<MachineTimeline {...base} detailTimelineEvents={[kalipEv(yansitPs)]} onPrintKalipEtiket={vi.fn()} />);
    expect(getByText("Kredi Kartı")).toBeTruthy();                 // yöntem pili (başlık yanında)
    expect(getByRole("button", { name: /Etiket/ })).toBeTruthy();  // ikon+metin yazdır butonu
  });

  it("yedek parçada yöntem pili + 'Etiket' butonu gösterilir", () => {
    const ypEv = { kind: "part", title: "Yedek Parça (Kargo)", date: "2026-08-12", color: "#0891b2",
      yp: { id: 3, ad: "aaaaaa", yontem: "Kredi Kartı", odendi: true, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-08-12", miktar: 2, birimFiyat: 5000 } };
    const { getByText, getByRole } = render(<MachineTimeline {...base} detailTimelineEvents={[ypEv]}
      onEditYedekParca={vi.fn()} onDeleteYedekParca={vi.fn()} onToggleYedekParcaOdendi={vi.fn()} onPrintYedekParcaEtiket={vi.fn()} />);
    expect(getByText("Kredi Kartı")).toBeTruthy();
    expect(getByRole("button", { name: /Etiket/ })).toBeTruthy();
  });

  it("toplu kalıp satışında her satırın sil butonu 'Sil' metniyle gösterilir (diğerleriyle tutarlı)", () => {
    const ps2 = { ...yansitPs, id: 2 };
    const batchEv = { kind: "part", psList: [yansitPs, ps2], title: "Kalıp Verildi", date: "2026-08-12", color: "#db2777" };
    const { getAllByRole } = render(<MachineTimeline {...base} detailTimelineEvents={[batchEv]} onDeletePartSale={vi.fn()} onPrintKalipEtiket={vi.fn()} />);
    const silButonlari = getAllByRole("button", { name: /^Sil$/ });
    expect(silButonlari.length).toBe(2); // her satır için ikon+metin sil butonu
  });

  it("serviste ödeme yöntemi PİL olarak gösterilir", () => {
    const svEv = { kind: "service", date: "2026-08-12", color: "#e85d1a", title: "Garanti Dışı",
      sv: { id: 5, type: "Garanti Dışı", currency: "TRY", faturaTipi: "Faturalı Yurtiçi", date: "2026-08-12",
        servisUcreti: 5000, odendi: true, yontem: "Kredi Kartı" } };
    const { getByText } = render(<MachineTimeline {...base} detailTimelineEvents={[svEv]} />);
    expect(getByText("Kredi Kartı")).toBeTruthy();
  });
});
