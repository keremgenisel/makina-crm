// @vitest-environment jsdom
// "Toplam Kredi Kartı ile Satış" kartı, anlaşmalı servis kartı gibi tıklanabilir olmalı:
// tıklayınca kime kredi kartıyla satış yapıldığının detay listesi (modal) açılır.
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(cleanup);
import { Finance } from "../../src/components/Finance";

const customers = [
  { id: 1, name: "KartMüşteri", model: "A", currency: "TRY", faturali: "Faturalı Yurtiçi", installDate: "2026-01-10", kalanBorc: 0 },
];
// Kredi kartıyla: bir Extra Kalıp satışı + bir makina ödemesi
const partSales = [
  { id: 20, customerId: 1, tur: "Kalıp", tarih: "2026-01-12", ucret: 30000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", yontem: "Kredi Kartı", odendi: true },
];
const payments = [
  { id: 30, customerId: 1, tarih: "2026-01-15", tutar: 120000, currency: "TRY", yontem: "Kredi Kartı" },
];

describe("Finance — Kredi Kartı ile Satış detay modalı", () => {
  it("karta tıklayınca kime kredi kartıyla satış yapıldığı listelenir", () => {
    render(
      <Finance customers={customers} services={[]} dealers={[]} partSales={partSales}
        yedekParcaSatislar={[]} factory={{ name: "Altuntaş Makina" }}
        rates={{}} payments={payments} teklifler={[]} serverPermissions={null} />
    );
    // Modal başta kapalı
    expect(screen.queryByText("Kredi Kartı ile Satış Detayı")).toBeNull();
    // Kart başlığından tıklanabilir sarmalayıcıya ulaş ve tıkla
    const kart = screen.getByText("Toplam Kredi Kartı ile Satış").closest("[title='Detay için tıklayın']");
    expect(kart).not.toBeNull();
    fireEvent.click(kart);
    // Modal açıldı ve müşteri listelendi
    expect(screen.getByText("Kredi Kartı ile Satış Detayı")).toBeTruthy();
    expect(screen.getAllByText("KartMüşteri").length).toBeGreaterThan(0);
    // Kaynak etiketleri (Extra kalıp + Makina ödemesi)
    expect(screen.getByText("Extra kalıp")).toBeTruthy();
    expect(screen.getByText("Makina ödemesi")).toBeTruthy();
  });
});
