// @vitest-environment jsdom
// Müşteriler listesine eklenen fiyat sütunları (Ayarlar > Uygulama > Müşteri Görünümü ile aç/kapa):
// Fatura Bedeli / Fabrika Satış / Komisyon / Extra Kalıp. Sütunlar yalnız appSettings.musteriSutunlari'nda
// açık olan alan için görünür; Extra Kalıp o makinaya satılan partSales(tur:"Kalıp") fiyat toplamıdır;
// Bayilerde (isCustomer=false) hiç görünmez.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

afterEach(cleanup);
import { Customers } from "../../src/components/Customers";

const customers = [
  { id: 1, name: "Anadolu Ambalaj", model: "AK-140", currency: "TRY",
    faturali: "Faturalı Yurtiçi", faturaBedeli: 850000, fabrikaSatisBedeli: 800000, komisyon: 25000, installDate: "2025-01-05" },
  { id: 2, name: "Marmara Naylon", model: "AK-100", currency: "TRY",
    faturali: "Faturasız Yurtiçi", faturaBedeli: 700000, fabrikaSatisBedeli: 790000, komisyon: "", installDate: "2025-02-01" },
];
// Extra Kalıp satışları: makina 1'e 40.000 + 15.000 = 55.000; makina 2'ye hiç.
const partSales = [
  { id: 800, tur: "Kalıp", customerId: 1, fiyat: 40000, currency: "TRY" },
  { id: 801, tur: "Kalıp", customerId: 1, fiyat: 15000, currency: "TRY" },
  { id: 802, tur: "Servis", customerId: 1, fiyat: 999999 }, // Kalıp değil → sayılmaz
];

const basliklar = () => [...document.querySelectorAll("thead th")].map(th => th.textContent.trim());
const satir = (ad) => screen.getByText(ad).closest("tr");

describe("Müşteriler — fiyat sütunları (aç/kapa)", () => {
  it("ayar yokken hiçbir fiyat sütunu görünmez", () => {
    render(<Customers customers={customers} setCustomers={vi.fn()} partSales={partSales} />);
    const b = basliklar();
    expect(b).not.toContain("Fatura Bedeli");
    expect(b).not.toContain("Fabrika Satış");
    expect(b).not.toContain("Komisyon");
    expect(b).not.toContain("Extra Kalıp");
  });

  it("açık sütunlar başlık + değer olarak görünür, kapalı olan görünmez", () => {
    render(<Customers customers={customers} setCustomers={vi.fn()} partSales={partSales}
      appSettings={{ musteriSutunlari: { faturaBedeli: true, fabrikaSatis: true, komisyon: false, extraKalip: true } }} />);
    const b = basliklar();
    expect(b).toContain("Fatura Bedeli");
    expect(b).toContain("Fabrika Satış");
    expect(b).toContain("Extra Kalıp");
    expect(b).not.toContain("Komisyon"); // kapalı
    // Anadolu Ambalaj değerleri
    const r1 = within(satir("Anadolu Ambalaj"));
    expect(r1.getByText(/850\.000/)).toBeTruthy();  // fatura bedeli
    expect(r1.getByText(/800\.000/)).toBeTruthy();  // fabrika satış
    expect(r1.getByText(/55\.000/)).toBeTruthy();   // extra kalıp = 40k + 15k
  });

  it("faturasız satışta Fatura Bedeli 0 sayılır → tire; Extra Kalıp yoksa tire", () => {
    render(<Customers customers={customers} setCustomers={vi.fn()} partSales={partSales}
      appSettings={{ musteriSutunlari: { faturaBedeli: true, fabrikaSatis: false, komisyon: false, extraKalip: true } }} />);
    const r2 = satir("Marmara Naylon");
    // Faturasız → faturaBedeliOf 0 → "—"; extra kalıp yok → "—". 790.000/999999 gibi değerler görünmemeli.
    expect(within(r2).queryByText(/790\.000/)).toBeFalsy();
    expect(within(r2).queryByText(/999\.999/)).toBeFalsy();
    expect(r2.textContent).toContain("—");
  });

  it("Bayilerde (isCustomer=false) fiyat sütunları açık olsa bile görünmez", () => {
    render(<Customers customers={customers} setCustomers={vi.fn()} partSales={partSales} isCustomer={false}
      appSettings={{ musteriSutunlari: { faturaBedeli: true, fabrikaSatis: true, komisyon: true, extraKalip: true } }} />);
    const b = basliklar();
    expect(b).not.toContain("Fatura Bedeli");
    expect(b).not.toContain("Extra Kalıp");
  });
});
