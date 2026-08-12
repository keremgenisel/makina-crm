// @vitest-environment jsdom
// Regresyon: Müşteriler "Sıra" sütunu, satılmış makinaları (Garanti Başlangıç girili) Garanti
// Başlangıç'a göre CANLI numaralar (en eski = 1, en yeni = toplam). Dizi konumuna bağlı değildir;
// tarihsiz kayıt "—" gösterir. Silince liste küçülür ve otomatik yeniden numaralanır (Option B).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(cleanup);
import { Customers } from "../../src/components/Customers";

const siraHucresi = (ad) => {
  const row = screen.getByText(ad).closest("tr");
  return row.querySelector("td").textContent.trim();
};
const siraSirasi = () => [...document.querySelectorAll("tbody tr td:first-child")].map(td => td.textContent.trim());

describe("Müşteriler — Sıra sütunu (canlı, Garanti Başlangıç'a göre)", () => {
  it("her satır Garanti Başlangıç sırasındaki numarasını gösterir (dizi index'i değil)", () => {
    // Dizi sırası tarih sırasından KASITLI farklı.
    const customers = [
      { id: 1, name: "Bir Firma", model: "AK100", installDate: "2020-01-01" }, // en yeni → 3
      { id: 2, name: "İki Firma", model: "AK140", installDate: "2019-01-01" }, // en eski → 1
      { id: 3, name: "Üç Firma", model: "AK100", installDate: "2019-06-01" }, // orta → 2
    ];
    render(<Customers customers={customers} setCustomers={vi.fn()} />);
    expect(siraHucresi("Bir Firma")).toBe("3.");
    expect(siraHucresi("İki Firma")).toBe("1.");
    expect(siraHucresi("Üç Firma")).toBe("2.");
  });

  it("Garanti Başlangıç'ı olmayan (bekleyen) kayıt tire gösterir, diğerleri numaralanır", () => {
    const customers = [
      { id: 1, name: "Satılmış", model: "AK100", installDate: "2020-01-01" },
      { id: 2, name: "Bekleyen", model: "AK140" }, // tarihsiz → "—"
    ];
    render(<Customers customers={customers} setCustomers={vi.fn()} />);
    expect(siraHucresi("Satılmış")).toBe("1.");
    expect(siraHucresi("Bekleyen")).toBe("—");
  });
});

describe("Müşteriler — aynı tarihli kayıtlar karışmaz + Sıra'ya tıklayınca sıralar", () => {
  // Üçü de AYNI installDate → varsayılan sıralamada (tarih azalan + id azalan) Sıra temiz azalmalı.
  const customers = [
    { id: 5, name: "Beş", model: "AK100", installDate: "2023-06-30" }, // girisNo 1
    { id: 6, name: "Altı", model: "AK100", installDate: "2023-06-30" }, // girisNo 2
    { id: 7, name: "Yedi", model: "AK100", installDate: "2023-06-30" }, // girisNo 3
  ];
  it("varsayılan: aynı tarihte Sıra karışmadan azalır (3,2,1)", () => {
    render(<Customers customers={customers} setCustomers={vi.fn()} />);
    expect(siraSirasi()).toEqual(["3.", "2.", "1."]);
  });
  it("Sıra başlığına tıklayınca artan sıralar (1,2,3); tekrar tıklayınca azalan", () => {
    render(<Customers customers={customers} setCustomers={vi.fn()} />);
    fireEvent.click(screen.getByText("Sıra"));
    expect(siraSirasi()).toEqual(["1.", "2.", "3."]);
    fireEvent.click(screen.getByText("Sıra"));
    expect(siraSirasi()).toEqual(["3.", "2.", "1."]);
  });
});
