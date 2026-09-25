// @vitest-environment jsdom
// Spec 0015 AC-12 (plan F9): taslak geri yükleme şeridi müşteri formunda ve müşteri detayının servis ve Extra Kalıp
// formlarında bugünkü gibi çıkar, geri yükleme alanı doldurur, "Yoksay" taslağı siler. Dönüşümden ÖNCE bugünkü koda
// yazıldı ve yeşildi; dönüşümden sonra da aynı kalmalı.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); localStorage.clear(); });

const M = [{ id: 1, name: "ABC Makina", model: "AK-100", serialNo: "SN-1" }];
const serit = () => screen.queryAllByText(/Yarım kalan taslak bulundu/).length > 0;
const tikla = (re) => fireEvent.click(screen.getAllByRole("button").filter(b => re.test(b.textContent.trim())).pop());
const taslak = (anahtar, data) => localStorage.setItem("crmdraft:" + anahtar, JSON.stringify({ ts: Date.now(), data }));
const liste = () => render(<Customers customers={[]} setCustomers={vi.fn()} partSales={[]} services={[]} payments={[]} stock={[]} setStock={vi.fn()} />);
const detay = () => render(<Customers customers={M} setCustomers={vi.fn()} partSales={[]} services={[]} payments={[]} parts={[]}
  setServices={vi.fn()} setPartSales={vi.fn()} initialDetailId={1} />);

describe("Taslak şeridi", () => {
  it("AC-12: müşteri formunda 'Yoksay' şeridi kapatır ve taslağı siler", () => {
    taslak("customer:new", { name: "Taslak Firma" });
    liste();
    fireEvent.click(screen.getByText("Yeni Müşteri"));
    expect(serit()).toBe(true);
    fireEvent.click(screen.getByText("Yoksay"));
    expect(serit()).toBe(false);
    expect(localStorage.getItem("crmdraft:customer:new")).toBeNull();
    expect(screen.getByPlaceholderText("Satın alan firma / kişi").value).toBe("");
  });
  it("AC-12: müşteri detayında servis formu taslağı geri yüklenir", () => {
    taslak("servis:1:new", { customerId: 1, date: "2026-09-20", musteriTalimati: "Taslak talimat" });
    detay();
    tikla(/Yeni Servis Talebi/);
    expect(serit()).toBe(true);
    fireEvent.click(screen.getByText("Geri Yükle"));
    expect(serit()).toBe(false);
    expect(screen.getByDisplayValue("Taslak talimat")).toBeTruthy();
  });
  it("AC-12: müşteri detayında Extra Kalıp formu taslağı çıkar, 'Yoksay' siler", () => {
    taslak("kalipsatis:1:new", { customerId: 1, tarih: "2026-09-20", kaliplar: [] });
    detay();
    tikla(/Extra Kalıp Satışı/);
    expect(serit()).toBe(true);
    fireEvent.click(screen.getByText("Yoksay"));
    expect(serit()).toBe(false);
    expect(localStorage.getItem("crmdraft:kalipsatis:1:new")).toBeNull();
  });
});
