// @vitest-environment jsdom
// Spec 0101 C9, AC-29 (önkoşul): müşteri formundaki "Makina Kalıp Çapı" alanının davranışı. Spec'ten önce, bugünkü kodla
// yazılıp yeşil görüldü; alan paylaşılan bileşene (ui.jsx KalipCapiFields) taşındıktan sonra da DEĞİŞMEDEN yeşil kalmalı.
// Kutular yer tutucuyla bulunur (erişilebilir ad spec 0101 R7/3 ile geldi; önkoşul testi eski kodda da koşabilsin).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, within } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";

afterEach(cleanup);

const MODELLER = [{ model: "AK100", sogutma: "", kapasite: "", kalip: "14 cm" }];
function kur(customers = []) {
  const durum = { customers };
  const setCustomers = vi.fn((u) => { durum.customers = typeof u === "function" ? u(durum.customers) : u; });
  render(<Customers customers={durum.customers} setCustomers={setCustomers} stock={[]} setStock={vi.fn()} services={[]} partSales={[]}
    payments={[]} partStock={[]} partStockLog={[]} models={MODELLER} rates={{ usd: 41.5, eur: 45.25 }} />);
  return durum;
}
const kutu = (ad) => screen.getByPlaceholderText(ad);

describe("Spec 0101 AC-29: müşteri formundaki çap alanı", () => {
  it("AC-29: ekleme formunda üç kutuya yazılan değer kayda {en, yukseklik, boy} olarak girer", () => {
    const durum = kur();
    fireEvent.click(screen.getByText("Yeni Müşteri"));
    fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: "Çaplı AŞ" } });
    expect(screen.getByText("Makina Kalıp Çapı")).toBeTruthy();
    fireEvent.change(kutu("Çap"), { target: { value: "50" } });
    fireEvent.change(kutu("Arka Ölçü"), { target: { value: "80" } });
    fireEvent.change(kutu("Boy"), { target: { value: "115" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(durum.customers[0].name).toBe("Çaplı AŞ");
    expect(durum.customers[0].kalipCapi).toEqual({ en: "50", yukseklik: "80", boy: "115" });
  });
  it("AC-29: tek kutuya yazılıp silinen değer bugünkü gibi parça nesnesi bırakır (müşteri tarafı boş nesne yazabilir, R18)", () => {
    const durum = kur();
    fireEvent.click(screen.getByText("Yeni Müşteri"));
    fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: "Boş AŞ" } });
    fireEvent.change(kutu("Arka Ölçü"), { target: { value: "8" } });
    fireEvent.change(kutu("Arka Ölçü"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(durum.customers[0].kalipCapi).toEqual({ yukseklik: "" });
  });
  it("AC-29: düzenleme kipinde kayıtlı çap üç kutuya dolu gelir ve değişiklik kayda girer", () => {
    const durum = kur([{ id: 5, name: "Eski AŞ", model: "AK100", serialNo: "S-5", installDate: "2026-01-10", kalipCapi: { en: "40", yukseklik: "70", boy: "100" } }]);
    const tr = screen.getByText("Eski AŞ").closest("tr");
    fireEvent.click(within(tr).getAllByRole("button").find(b => b.querySelector("svg") && b.className.includes("ghost")));
    expect(kutu("Çap").value).toBe("40");
    expect(kutu("Arka Ölçü").value).toBe("70");
    expect(kutu("Boy").value).toBe("100");
    fireEvent.change(kutu("Boy"), { target: { value: "110" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(durum.customers[0].kalipCapi).toEqual({ en: "40", yukseklik: "70", boy: "110" });
  });
});
