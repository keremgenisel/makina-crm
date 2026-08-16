// @vitest-environment jsdom
// Satış (Düzenle) formundaki "Kalan Borç", bloke kredi kartının YANSITILAN komisyonunu da içermeli —
// Borçlu Firmalar / Beklenen Tahsilat / müşteri detayıyla birebir aynı (çekilen kart tutarı = borç).
import { describe, it, expect, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, within } from "@testing-library/react";
import { CustomerAddEditForm } from "../../src/components/customers/CustomerAddEditForm";
import { fmtCur } from "../../src/lib/utils";

afterEach(cleanup);

const Harness = ({ form: ilk, payments }) => {
  const [form, setForm] = useState(ilk);
  return (
    <CustomerAddEditForm
      modal={{ edit: { id: 1 } }} form={form} setForm={setForm} save={vi.fn()} onClose={vi.fn()}
      stock={[]} models={[]} dealers={[]} factory={{ name: "Altuntaş Makina" }}
      kdvRates={{ "2020-01-01": 18, "2023-07-10": 20 }} payments={payments} geoData={null} loadingGeo={false}
      entity="customer"
    />
  );
};

describe("Satış formu Kalan Borç — yansıtılan bloke kredi kartı komisyonu dahil", () => {
  const form = { id: 1, name: "kkkkkkk", fabrikaSatisBedeli: 100000, faturaBedeli: 100000, faturali: "Faturalı Yurtiçi", installDate: "2026-01-01", currency: "TRY", kaliplar: [] };

  it("edit: bloke KK (yansıtıldı) → Kalan Borç ciro(120.121) + komisyon(605) = 120.726", () => {
    const payments = [{ id: 30, customerId: 1, yontem: "Kredi Kartı", tutar: 120121, currency: "TRY",
      kartKomisyonu: { blokajGun: 40, hesabaGecis: "2099-09-01", toplamKesinti: 605, netTutar: 120121, yansitildi: true } }];
    render(<Harness form={form} payments={payments} />);
    const alan = within(screen.getByText("Kalan Borç").parentElement);
    expect(alan.getByText(fmtCur(120726, "TRY"))).toBeTruthy();
    expect(alan.queryByText(fmtCur(120121, "TRY"))).toBeNull(); // komisyonsuz ham değil
  });

  it("edit: komisyon YANSITILMAMIŞ (biz üstlendik) → komisyon eklenmez (120.000)", () => {
    const f2 = { ...form, faturaBedeli: 100000 };
    const payments = [{ id: 31, customerId: 1, yontem: "Kredi Kartı", tutar: 120000, currency: "TRY",
      kartKomisyonu: { blokajGun: 40, hesabaGecis: "2099-09-01", toplamKesinti: 3000, netTutar: 117000, yansitildi: false } }];
    render(<Harness form={f2} payments={payments} />);
    expect(within(screen.getByText("Kalan Borç").parentElement).getByText(fmtCur(120000, "TRY"))).toBeTruthy();
  });
});
