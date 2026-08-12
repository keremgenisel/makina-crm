// @vitest-environment jsdom
// Teslim şekli (Fabrika Teslim / Kargo) ile "Servis ve Kargo Panosuna gönder" AYRI kararlar olmalı:
// teslim şeklini seçmek kaydı panoya DÜŞÜRMEMELİ (eski/geçmiş tarihli satışlar canlı panoyu kirletmesin).
// Eskiden iki teslim kutusu da kargoDurum'u set edip panoya düşürüyordu; bu test o coupling'in geri
// gelmediğini korur.
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { YedekParcaSatisForm } from "../../src/components/YedekParcaSatisForm";

afterEach(cleanup);

function Harness({ initial = {} }) {
  const [form, setForm] = React.useState({
    aliciTipi: "bayi", currency: "TRY",
    satirlar: [{ partId: "", miktar: "", birimFiyat: "" }],
    ...initial,
  });
  return <YedekParcaSatisForm title="Yeni Satış" form={form} setForm={setForm} onSave={() => {}} onCancel={() => {}} />;
}

describe("YedekParcaSatisForm — teslim şekli panoya düşürmez", () => {
  it("Teslim Şekli seçici (Fabrika Teslim / Kargo) her zaman görünür", () => {
    render(<Harness />);
    expect(screen.getByText("Teslim Şekli")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Fabrika Teslim/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /📦 Kargo/ })).toBeTruthy();
  });

  it("teslim şeklini seçmek panoya DÜŞÜRMEZ (Pano Durumu görünmez, kutu kapalı kalır)", () => {
    render(<Harness />);
    // Başlangıçta pano kapalı.
    expect(screen.queryByText("Pano Durumu")).toBeNull();
    expect(screen.getByText(/Kapalı: yalnızca kayıt olur, panoya düşmez/)).toBeTruthy();
    // Fabrika Teslim'e geç → yine panoya düşmemeli.
    fireEvent.click(screen.getByRole("button", { name: /Fabrika Teslim/ }));
    expect(screen.queryByText("Pano Durumu")).toBeNull();
    expect(screen.getByText(/Kapalı: yalnızca kayıt olur, panoya düşmez/)).toBeTruthy();
  });

  it("ayrı 'Panoya gönder' kutusu işaretlenince pano alanları (Pano Durumu) açılır", () => {
    // fabrikaTeslim:true → Kargo'ya özel teslimatFarkli kutusu yok, tek checkbox = panoya gönder.
    render(<Harness initial={{ fabrikaTeslim: true }} />);
    expect(screen.queryByText("Pano Durumu")).toBeNull();
    const kutular = screen.getAllByRole("checkbox");
    expect(kutular).toHaveLength(1); // yalnız "Panoya gönder"
    fireEvent.click(kutular[0]);
    expect(screen.getByText("Pano Durumu")).toBeTruthy();
  });
});

describe("YedekParcaSatisForm — ödeme yöntemi (Nakit/Kredi Kartı/Çek)", () => {
  const dolu = { satirlar: [{ partId: "7", miktar: "2", birimFiyat: "100" }] }; // toplam>0 → ödeme bloğu

  it("ödendi işaretli değilken Ödeme Yöntemi görünmez", () => {
    render(<Harness initial={{ ...dolu, odendi: false }} />);
    expect(screen.getByText(/tahsil edilmedi \(ödenmedi\)/)).toBeTruthy();
    expect(screen.queryByText("Ödeme Yöntemi")).toBeNull();
  });

  it("ödendi işaretliyken Ödeme Yöntemi seçici çıkar; Çek seçilince vade + tahsil kutusu açılır", () => {
    render(<Harness initial={{ ...dolu, odendi: true, yontem: "Nakit" }} />);
    expect(screen.getByText("Ödeme Yöntemi")).toBeTruthy();
    expect(screen.queryByText("Çek Vade Tarihi")).toBeNull();
    // Nakit → Çek'e geçir
    const secici = screen.getByText("Ödeme Yöntemi").closest("div").querySelector("select");
    fireEvent.change(secici, { target: { value: "Çek" } });
    expect(screen.getByText("Çek Vade Tarihi")).toBeTruthy();
    expect(screen.getByText(/tahsil edilene kadar borçlu sayılır/)).toBeTruthy();
  });
});

describe("YedekParcaSatisForm — para birimi değişince parça USD/EUR fiyatı gelir", () => {
  const parts = [{ id: 5, ad: "Kompresör", fiyatTRY: 1000, fiyatUSD: 30, fiyatEUR: 28 }];
  function CurHarness() {
    const [form, setForm] = React.useState({ aliciTipi: "bayi", currency: "TRY", satirlar: [{ partId: "5", miktar: "2", birimFiyat: "1000" }] });
    return (<>
      <div data-testid="bf">{String(form.satirlar[0].birimFiyat)}</div>
      <div data-testid="cur">{String(form.currency)}</div>
      <YedekParcaSatisForm title="Yeni Satış" form={form} setForm={setForm} parts={parts} onSave={() => {}} onCancel={() => {}} />
    </>);
  }
  it("TRY→USD geçince tanımlı USD fiyatı (30) birim fiyata gelir", () => {
    render(<CurHarness />);
    expect(screen.getByTestId("bf").textContent).toBe("1000");
    const pbSecici = screen.getByDisplayValue("₺ Türk Lirası");
    fireEvent.change(pbSecici, { target: { value: "USD" } });
    expect(screen.getByTestId("cur").textContent).toBe("USD");
    expect(screen.getByTestId("bf").textContent).toBe("30");
    // USD→EUR: EUR fiyatı 28
    fireEvent.change(screen.getByDisplayValue("$ Dolar (USD)"), { target: { value: "EUR" } });
    expect(screen.getByTestId("bf").textContent).toBe("28");
  });
  it("o para biriminde tanımlı fiyat yoksa mevcut değer korunur", () => {
    const parts2 = [{ id: 5, ad: "Kompresör", fiyatTRY: 1000 }]; // sadece TRY
    function H2() {
      const [form, setForm] = React.useState({ aliciTipi: "bayi", currency: "TRY", satirlar: [{ partId: "5", miktar: "1", birimFiyat: "1000" }] });
      return (<><div data-testid="bf2">{String(form.satirlar[0].birimFiyat)}</div>
        <YedekParcaSatisForm title="Yeni Satış" form={form} setForm={setForm} parts={parts2} onSave={() => {}} onCancel={() => {}} /></>);
    }
    render(<H2 />);
    fireEvent.change(screen.getByDisplayValue("₺ Türk Lirası"), { target: { value: "USD" } });
    expect(screen.getByTestId("bf2").textContent).toBe("1000"); // USD fiyatı yok → korunur
  });
});
