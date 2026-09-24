// @vitest-environment jsdom
// Spec 0002 C4 istisnaları: satış kaydına yazılan satış kuru (R12) ve üretim tarihi (R1b), gerçek
// Customers ekle/düzenle/sil akışlarıyla.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, within } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";

afterEach(cleanup);

const RATES = { usd: 41.5, eur: 45.25 };
function kur({ customers, stock = [], partStockLog = [], giderYetki = true, rates = RATES }) {
  const durum = { customers, stock, partStockLog, services: [], partSales: [], payments: [], partStock: [] };
  const setter = (k) => vi.fn((u) => { durum[k] = typeof u === "function" ? u(durum[k]) : u; });
  const setters = {
    setCustomers: setter("customers"), setStock: setter("stock"), setPartStockLog: setter("partStockLog"), setServices: setter("services"),
    setPartSales: setter("partSales"), setPayments: setter("payments"), setPartStock: setter("partStock"),
  };
  const ciz = () => (
    <Customers customers={durum.customers.filter(c => !c.deletedAt)} stock={durum.stock} partStockLog={durum.partStockLog} services={durum.services}
      partSales={durum.partSales} payments={durum.payments} partStock={durum.partStock} giderYetki={giderYetki} rates={rates} {...setters} />
  );
  const u = render(ciz());
  return { durum, rerender: () => u.rerender(ciz()) };
}
const satir = (ad) => screen.getByText(ad).closest("tr");
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getAllByRole("button").find(b => b.querySelector("svg") && b.className.includes("ghost")));
const kaydet = () => fireEvent.click(screen.getByText("Kaydet"));

describe("satış kuru (R12)", () => {
  it("AC-12: yeni USD satışta o günün kuru kayda yazılır", () => {
    const { durum } = kur({ customers: [] });
    fireEvent.click(screen.getByText("Yeni Müşteri"));
    fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: "Dolar Gıda" } });
    fireEvent.change(screen.getByLabelText("Para Birimi"), { target: { value: "USD" } });
    expect(screen.getByTestId("satis-kuru").textContent).toMatch(/o günün USD kuru/);
    kaydet();
    expect(durum.customers[0]).toMatchObject({ name: "Dolar Gıda", currency: "USD", satisKuru: 41.5 });
  });
  it("AC-12: kayıt yeniden açıldığında aynı kur görünür ve kaydetmek onu değiştirmez", () => {
    const c = { id: 1, name: "Eski Dolar", model: "AK100", serialNo: "X1", currency: "USD", satisKuru: 38.75, installDate: "2024-02-01" };
    const { durum } = kur({ customers: [c] });
    duzenle("Eski Dolar");
    expect(screen.getByTestId("satis-kuru").textContent).toContain("1 USD = 38,75 TL");
    kaydet();
    expect(durum.customers[0].satisKuru).toBe(38.75);
  });
  it("AC-72: USD → EUR çevrilince o günün EUR kuru yazılır; TL'ye dönünce kur boşalır", () => {
    const c = { id: 1, name: "Çeviri Ltd", model: "AK100", serialNo: "X1", currency: "USD", satisKuru: 38.75, installDate: "2024-02-01" };
    const { durum, rerender } = kur({ customers: [c] });
    duzenle("Çeviri Ltd");
    fireEvent.change(screen.getByLabelText("Para Birimi"), { target: { value: "EUR" } });
    kaydet();
    expect(durum.customers[0]).toMatchObject({ currency: "EUR", satisKuru: 45.25 });
    rerender();
    duzenle("Çeviri Ltd");
    fireEvent.change(screen.getByLabelText("Para Birimi"), { target: { value: "TRY" } });
    kaydet();
    expect(durum.customers[0].satisKuru).toBeNull();
  });
  it("AC-55: kur alınamıyorken USD satış kaydı engellenmez, kur boş kalır", () => {
    const { durum } = kur({ customers: [], rates: null });
    fireEvent.click(screen.getByText("Yeni Müşteri"));
    fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: "Çevrimdışı AŞ" } });
    fireEvent.change(screen.getByLabelText("Para Birimi"), { target: { value: "USD" } });
    kaydet();
    expect(durum.customers[0]).toMatchObject({ name: "Çevrimdışı AŞ", satisKuru: null });
  });
});

describe("üretim tarihi (R1b, plan M3/M8)", () => {
  it("AC-41: stoktan seri seçilince stoğun giriş tarihi satış kaydına yazılır, stok satırı düşer", () => {
    const c = { id: 1, name: "Bekleyen Seri", model: "AK100", serialNo: "", seriNoBekliyor: true, installDate: "2026-05-01" };
    const { durum } = kur({ customers: [c], stock: [{ id: 70, model: "AK100", serialNo: "T-70", addedDate: "2026-03-05" }] });
    duzenle("Bekleyen Seri");
    fireEvent.change(screen.getByText(/Stoktan seçin/).closest("select"), { target: { value: "T-70" } });
    kaydet();
    expect(durum.customers[0]).toMatchObject({ serialNo: "T-70", sourceStockId: 70, uretimTarihi: "2026-03-05" });
    expect(durum.stock).toEqual([]);
  });
  it("AC-75: üretim tarihi formda elle düzeltilir ve kayda yazılır", () => {
    const c = { id: 1, name: "Elle Tarih", model: "AK100", serialNo: "X1", installDate: "2026-05-01" };
    const { durum } = kur({ customers: [c] });
    duzenle("Elle Tarih");
    fireEvent.change(screen.getByLabelText("Üretim tarihi"), { target: { value: "2026-02-14" } });
    kaydet();
    expect(durum.customers[0].uretimTarihi).toBe("2026-02-14");
  });
  it("plan M8: gider yetkisi yoksa üretim tarihi ve kur satırı çizilmez; kaydetmek kayıtlı değerleri korur", () => {
    const c = { id: 1, name: "Yetkisiz Düzenleme", model: "AK100", serialNo: "X1", currency: "USD", satisKuru: 38.75, uretimTarihi: "2026-01-10", installDate: "2024-02-01" };
    const { durum } = kur({ customers: [c], giderYetki: false });
    duzenle("Yetkisiz Düzenleme");
    expect(screen.queryByLabelText("Üretim tarihi")).toBeNull();
    expect(screen.queryByTestId("satis-kuru")).toBeNull();
    kaydet();
    expect(durum.customers[0]).toMatchObject({ satisKuru: 38.75, uretimTarihi: "2026-01-10" });
  });
  it("AC-44: silinen müşteriden stoğa dönen satır makinanın özgün üretim tarihini taşır", () => {
    const c = { id: 1, name: "Silinecek Firma", model: "AK100", serialNo: "S-9", installDate: "2026-05-01", sourceStockId: 44 };
    const { durum } = kur({ customers: [c], partStockLog: [{ id: 1, partId: "3", miktar: -1, tip: "makina_uretimi", referansId: 44, tarih: "2026-02-20" }] });
    const dugmeler = within(satir("Silinecek Firma")).getAllByRole("button");
    fireEvent.click(dugmeler[dugmeler.length - 1]);
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(durum.stock).toHaveLength(1);
    expect(durum.stock[0]).toMatchObject({ note: "Silinen müşteriden geri döndü", uretimTarihi: "2026-02-20" });
  });
});
