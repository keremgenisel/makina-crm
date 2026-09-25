// @vitest-environment jsdom
// Spec 0015 (plan F9): formlardaki doğrulama uyarılarının davranışı. Dönüşümden ÖNCE bugünkü koda yazıldı ve yeşildi;
// dönüşümden sonra da aynı kalmalı. Metinler desenle, alanlar etiket ya da yer tutucuyla sorgulanır (⚠ öneki ve rol
// dönüşümde değişir, R2).
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";
import { SimpleDealers } from "../../src/components/SimpleDealers";
import { Stock } from "../../src/components/Stock";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); localStorage.clear(); });

const var_ = (re) => screen.queryAllByText(re).length > 0;

describe("Müşteri formu", () => {
  const ciz = (setCustomers = vi.fn()) => {
    render(<Customers customers={[]} setCustomers={setCustomers} partSales={[]} services={[]} payments={[]} stock={[]} setStock={vi.fn()} />);
    fireEvent.click(screen.getByText("Yeni Müşteri"));
    return setCustomers;
  };
  it("AC-3: 'Satın alan adı girilmedi' ad boşken görünür (canlı), yazınca kaybolur", () => {
    ciz();
    expect(var_(/Satın alan adı girilmedi/)).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: "Kutu Gıda" } });
    expect(var_(/Satın alan adı girilmedi/)).toBe(false);
  });
  it("AC-2 / AC-3: telefon ve e-posta biçim uyarıları yalnız geçersiz değerde, aynı metinle", () => {
    ciz();
    expect(var_(/Geçersiz telefon formatı/)).toBe(false);
    fireEvent.change(screen.getByLabelText("Yetkili 1 - Telefon"), { target: { value: "abc" } });
    expect(screen.getAllByText(/Geçersiz telefon formatı/).length).toBe(1);
    fireEvent.change(screen.getByLabelText("Şirket Telefonu"), { target: { value: "xyz" } });
    expect(screen.getAllByText(/Geçersiz telefon formatı/).length).toBe(2);
    fireEvent.change(screen.getByLabelText("Yetkili 1 - Telefon"), { target: { value: "0532 111 22 33" } });
    expect(screen.getAllByText(/Geçersiz telefon formatı/).length).toBe(1);
    fireEvent.change(screen.getByLabelText("E-posta"), { target: { value: "yanlis" } });
    expect(var_(/Geçersiz e-posta formatı/)).toBe(true);
    fireEvent.change(screen.getByLabelText("E-posta"), { target: { value: "a@b.co" } });
    expect(var_(/Geçersiz e-posta formatı/)).toBe(false);
  });
  it("AC-2: dönüşümden sonra hata metinleri role=\"alert\" taşır, ⚠ öneki yok", () => {
    ciz();
    fireEvent.change(screen.getByLabelText("E-posta"), { target: { value: "yanlis" } });
    const uyarilar = screen.getAllByRole("alert").map(a => a.textContent);
    expect(uyarilar).toEqual(expect.arrayContaining(["Satın alan adı girilmedi", "Geçersiz e-posta formatı"]));
    expect(uyarilar.some(t => t.includes("⚠"))).toBe(false);
  });
  it("AC-4: Kaydetmenin engellendiği durumlar değişmez (bugün: uyarı kaydı engellemez; adlı kayıt eklenir)", () => {
    const setCustomers = ciz();
    fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: "Kutu Gıda" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(setCustomers).toHaveBeenCalled();
  });
  it("AC-12: Taslak geri yükleme şeridi bugünkü gibi çıkar ve geri yükleme alanı doldurur", () => {
    localStorage.setItem("crmdraft:customer:new", JSON.stringify({ ts: Date.now(), data: { name: "Taslak Firma" } }));
    ciz();
    expect(var_(/Yarım kalan taslak bulundu/)).toBe(true);
    fireEvent.click(screen.getByText("Geri Yükle"));
    expect(screen.getByPlaceholderText("Satın alan firma / kişi").value).toBe("Taslak Firma");
    expect(var_(/Yarım kalan taslak bulundu/)).toBe(false);
  });
});

describe("Bayi formu", () => {
  function H({ onState }) {
    const [dealers, setDealers] = useState([]);
    onState(dealers);
    return <SimpleDealers dealers={dealers} setDealers={setDealers} factory={{ name: "Altuntaş" }} setFactory={vi.fn()} partSales={[]} services={[]} customers={[]} showToast={vi.fn()} />;
  }
  it("AC-3: 'Firma adı girilmedi' canlı; 'En az biri seçili olmalı' iki kutu da boşken", () => {
    let st; render(<H onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("Bayi/Servis Ekle"));
    expect(var_(/Firma adı girilmedi/)).toBe(true);
    const kutular = screen.getAllByRole("checkbox");
    const secili = kutular.filter(k => k.checked);
    for (const k of secili) fireEvent.click(k);
    expect(var_(/En az biri seçili olmalı: Bayi veya Anlaşmalı Servis/)).toBe(true);
    fireEvent.click(kutular[0]);
    expect(var_(/En az biri seçili olmalı/)).toBe(false);
    expect(st).toEqual([]);
  });
  it("AC-4: iki kutu da boşken kayıt engellenir; adla ve seçimle kayıt yapılır", () => {
    let st; render(<H onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("Bayi/Servis Ekle"));
    const ad = screen.getByLabelText("Firma Adı");
    fireEvent.change(ad, { target: { value: "Ege Bayi" } });
    const kutular = screen.getAllByRole("checkbox");
    for (const k of kutular.filter(k => k.checked)) fireEvent.click(k);
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st).toEqual([]);
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.map(d => d.name)).toEqual(["Ege Bayi"]);
  });
});

describe("Stok formları", () => {
  const stok = (o = {}) => render(<Stock factory={{ name: "A" }} stock={[]} setStock={vi.fn()} customers={[]} setCustomers={vi.fn()} parts={[{ id: 7, ad: "Rulman" }]} {...o} />);
  it("AC-3: makina stoğu ekleme formunda 'Model seçilmedi' model yokken", () => {
    stok();
    fireEvent.click(screen.getAllByRole("button").find(b => /Stoğa Makina Ekle|Makina Ekle|Yeni Makina/.test(b.textContent)));
    expect(var_(/Model seçilmedi/)).toBe(true);
  });
  it("AC-3: parça stoğu ekleme formunda 'Parça seçilmedi' parça yokken", () => {
    stok({ defaultSubTab: "parca" });
    fireEvent.click(screen.getAllByRole("button").find(b => /Stoğa Parça Ekle|Parça Ekle/.test(b.textContent)));
    expect(var_(/Parça seçilmedi/)).toBe(true);
  });
});
