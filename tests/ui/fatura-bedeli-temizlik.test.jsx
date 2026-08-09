// @vitest-environment jsdom
// Faturalı bir makina kaydını Faturasıza çevirince "Fatura Bedeli" alanı gizlenmekle kalmayıp
// DEĞERİ de temizlenmeli (hayalet fatura bedeli kalmasın). Aksi halde Finance/aylık rapor/detay
// eski fatura bedelini göstermeye devam ediyordu (kullanıcı raporu).
import { describe, it, expect, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { CustomerAddEditForm } from "../../src/components/customers/CustomerAddEditForm";

afterEach(cleanup);

const Harness = ({ ilk }) => {
  const [form, setForm] = useState(ilk);
  return (
    <>
      <div data-testid="fb">{String(form.faturaBedeli)}</div>
      <div data-testid="tip">{String(form.faturali)}</div>
      <CustomerAddEditForm
        modal={{ edit: { id: 1 } }} form={form} setForm={setForm} save={vi.fn()} onClose={vi.fn()}
        stock={[]} models={[]} dealers={[]} factory={{ name: "Altuntaş Makina" }}
        kdvRates={{ "2020-01-01": 18, "2023-07-10": 20 }} payments={[]} geoData={null} loadingGeo={false}
        entity="customer"
      />
    </>
  );
};

describe("CustomerAddEditForm — Faturasıza çevirince fatura bedeli temizlenir", () => {
  it("Faturasız seçilince faturaBedeli boşalır; tekrar Faturalı'da boş gelir", () => {
    render(<Harness ilk={{ id: 1, name: "A", faturali: "Faturalı Yurtiçi", faturaBedeli: 50000, currency: "TRY", installDate: "2026-06-10", kaliplar: [] }} />);
    // Başlangıç: Faturalı, fatura bedeli dolu
    expect(screen.getByTestId("fb").textContent).toBe("50000");
    const tipSelect = screen.getByDisplayValue("Faturalı Yurtiçi");
    // Faturasıza çevir → değer temizlenmeli
    fireEvent.change(tipSelect, { target: { value: "Faturasız Yurtiçi" } });
    expect(screen.getByTestId("tip").textContent).toBe("Faturasız Yurtiçi");
    expect(screen.getByTestId("fb").textContent).toBe(""); // hayalet kalmadı
  });
});
