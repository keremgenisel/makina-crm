// @vitest-environment jsdom
// Finans ekranı sahipsiz kayıtları (müşterisi olmayan) hesaba katmaz — aylık raporla aynı süzgeç,
// böylece ekran ve rapor rakamları ayrışmaz. Kredi kartı detay modalı üzerinden gözlemlenir.
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(cleanup);
import { Finance } from "../../src/components/Finance";

const customers = [{ id: 1, name: "SahipliFirma", model: "A", currency: "TRY", faturali: "Faturalı Yurtiçi", installDate: "2026-01-10", kalanBorc: 0 }];
const partSales = [
  { id: 20, customerId: 1, tur: "Kalıp", tarih: "2026-01-12", ucret: 30000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", yontem: "Kredi Kartı", odendi: true },
  { id: 21, customerId: 999, tur: "Kalıp", tarih: "2026-01-13", ucret: 99999, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", yontem: "Kredi Kartı", odendi: true }, // sahipsiz
];

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
