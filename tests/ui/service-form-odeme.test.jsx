// @vitest-environment jsdom
// Servis formuna ödeme yöntemi + kredi kartı taksit komisyonu (satış formlarıyla parite):
// ücret varken "Ödendi" işaretlenince yöntem seçilir; Kredi Kartı'da KartTaksitAlani komisyon kırılımı gelir.
import { describe, it, expect, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ServiceForm } from "../../src/components/ServiceForm";

afterEach(cleanup);

const customers = [{ id: 1, name: "ABC Makina", faturali: "Faturalı Yurtiçi" }];
const AYAR = { bsmv: 5, satirlar: [{ taksit: 1, oran: 3.1, katkiPayi: 0.5, blokajGun: 40 }, { taksit: 3, oran: 7.476, katkiPayi: 0.5, blokajGun: 0 }] };
const kdvRates = [{ from: "2000-01-01", rate: 20 }];

const Harness = ({ ilk }) => {
  const [form, setForm] = useState(ilk);
  return <ServiceForm title="Yeni Servis Talebi" form={form} setForm={setForm} customers={customers}
    kdvRates={kdvRates} krediKartiKomisyonlari={AYAR} onSave={() => {}} onCancel={() => {}} />;
};

describe("ServiceForm ödeme yöntemi + kredi kartı komisyonu", () => {
  const base = { customerId: 1, type: "Garanti Dışı", repairPlace: "Yerinde Onarım", degisenParcalar: [], currency: "TRY", date: "2026-07-11", faturaTipi: "Faturalı Yurtiçi", servisUcreti: 5000 };

  it("ücret varken ödendi işaretlenince Ödeme Yöntemi görünür", () => {
    render(<Harness ilk={{ ...base, odendi: false }} />);
    expect(screen.queryByText("Ödeme Yöntemi")).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: /tahsil edilmedi|Ödendi|ödendi/i }) || screen.getAllByRole("checkbox")[0]);
    // odendi true → yöntem alanı gelir (kontrollü harness ile setForm çalışır)
    expect(screen.getByText("Ödeme Yöntemi")).toBeTruthy();
  });

  it("Kredi Kartı + taksit seçilince komisyon kırılımı (KartTaksitAlani) gelir", () => {
    render(<Harness ilk={{ ...base, odendi: true, yontem: "Kredi Kartı", taksitSayisi: 3 }} />);
    // 5000 servis + KDV %20 = 6000 KDV dahil; 3 taksit oran 7,476 → toplam kesinti gösterilir
    expect(screen.getByText(/Banka Kesintisi/)).toBeTruthy();
    expect(screen.getByText(/Toplam Kesinti/)).toBeTruthy();
  });

  it("Çek seçilince vade + tahsil toggle gelir", () => {
    render(<Harness ilk={{ ...base, odendi: true, yontem: "Çek" }} />);
    expect(screen.getByText("Çek Vade Tarihi")).toBeTruthy();
    expect(screen.getByText(/Çek henüz tahsil edilmedi|Çek tahsil edildi/)).toBeTruthy();
  });
});
