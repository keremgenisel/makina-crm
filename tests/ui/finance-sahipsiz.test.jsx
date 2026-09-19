// @vitest-environment jsdom
// Finans ekranı sahipsiz kayıtları (müşterisi olmayan) hesaba katmaz — aylık raporla aynı süzgeç,
// böylece ekran ve rapor rakamları ayrışmaz. Kredi kartı detay modalı üzerinden gözlemlenir.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(cleanup);
import { Finance } from "../../src/components/Finance";

const customers = [{ id: 1, name: "SahipliFirma", model: "A", currency: "TRY", faturali: "Faturalı Yurtiçi", installDate: "2026-01-10", kalanBorc: 0 }];
const partSales = [
  { id: 20, customerId: 1, tur: "Kalıp", tarih: "2026-01-12", ucret: 30000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", yontem: "Kredi Kartı", odendi: true },
  { id: 21, customerId: 999, tur: "Kalıp", tarih: "2026-01-13", ucret: 99999, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", yontem: "Kredi Kartı", odendi: true }, // sahipsiz
];

describe("Finance — bayisi olmayan yedek parça satışı", () => {
  it("bayisi silinmiş/olmayan kredi kartlı satış detayda görünmez; canlı bayininki görünür", () => {
    const yp = [
      { id: 40, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 1, birimFiyat: 1000, currency: "TRY", tarih: "2026-01-12", faturaTipi: "Faturalı Yurtiçi", yontem: "Kredi Kartı", odendi: true },
      { id: 41, aliciTipi: "bayi", dealerId: 999, partId: "7", miktar: 1, birimFiyat: 77777, currency: "TRY", tarih: "2026-01-13", faturaTipi: "Faturalı Yurtiçi", yontem: "Kredi Kartı", odendi: true },
    ];
    render(<Finance customers={customers} services={[]} dealers={[{ id: 5, name: "CanlıBayi" }]} partSales={[]} yedekParcaSatislar={yp}
      factory={{ name: "Altuntaş Makina" }} rates={{}} payments={[]} teklifler={[]} serverPermissions={null} />);
    fireEvent.click(screen.getByText("Toplam Kredi Kartı ile Satış").closest("[title='Detay için tıklayın']"));
    expect(screen.getAllByText("CanlıBayi").length).toBeGreaterThan(0);
    expect(screen.queryByText("77.777")).toBeNull();
    expect(screen.queryByText(/^—$/)).toBeNull();
  });
});

describe("Finance — sahipsiz kayıtlar", () => {
  it("müşterisi olmayan kalıp satışı kredi kartı detayında görünmez ('—' satırı yok)", () => {
    render(<Finance customers={customers} services={[]} dealers={[]} partSales={partSales} yedekParcaSatislar={[]}
      factory={{ name: "Altuntaş Makina" }} rates={{}} payments={[]} teklifler={[]} serverPermissions={null} />);
    fireEvent.click(screen.getByText("Toplam Kredi Kartı ile Satış").closest("[title='Detay için tıklayın']"));
    expect(screen.getAllByText("SahipliFirma").length).toBeGreaterThan(0);
    expect(screen.queryByText("99.999")).toBeNull();
    expect(screen.queryByText(/^—$/)).toBeNull();
  });
});

describe("Finance — Aylık Rapor sahipsiz notu", () => {
  it("rapor motoru HAM dizilerle çağrılır: sahipsiz kayıt adedi raporun altına düşer, satırı raporda görünmez", () => {
    // Gerileme: ekran için süzülmüş diziler motora verilince sahipsiz adedi hep 0 kalıyor, not hiç çıkmıyordu.
    const printHtml = vi.fn();
    window.appPrint = { printHtml };
    try {
      render(<Finance customers={customers} services={[]} dealers={[]} partSales={partSales} yedekParcaSatislar={[]}
        factory={{ name: "Altuntaş Makina" }} rates={{}} payments={[]} teklifler={[]} serverPermissions={null} />);
      fireEvent.click(screen.getByText("Aylık Rapor"));
      expect(printHtml).toHaveBeenCalled();
      const html = printHtml.mock.calls[0][0];
      expect(html).toContain("<b>1</b> sahipsiz kayıt");   // id 21 (customerId 999)
      expect(html).not.toContain("99.999");                 // sahipsiz satır raporda yok
    } finally { delete window.appPrint; }
  });
});
