// @vitest-environment jsdom
// Spec 0002 R6, R15, R26: müşteri/makina detayındaki "Maliyet ve Kâr" kutusu. Yalnız gider yetkisiyle
// çizilir; Finans ekranı değişmez (AC-69).
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";
import { Finance } from "../../src/components/Finance";
import { hesaplaMakinaMaliyetleri } from "../../src/lib/makinaMaliyeti";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

const TUR = [{ id: 1, ad: "Genel", davranis: "normal" }];
const hesapla = (customers, o = {}) => hesaplaMakinaMaliyetleri({ customers, stock: [], giderler: [], giderTurleri: TUR, standartGiderler: [],
  standardModels: [{ model: "AK100" }], customModels: [], giderAyarlari: { yururlukAy: "2026-01" }, ...o }, { bugun: "2026-09-24" });

function Harness({ customers, giderYetki, makinaMaliyet }) {
  const [id, setId] = useState(null);
  return (
    <div>
      <button onClick={() => setId(customers[0].id)}>aç</button>
      <Customers customers={customers} setCustomers={() => {}} services={[]} setServices={() => {}} dealers={[]} models={[]} factory={{ name: "Altuntaş" }}
        parts={[]} partSales={[]} setPartSales={() => {}} yedekParcaSatislar={[]} setYedekParcaSatislar={() => {}}
        initialDetailId={id} giderYetki={giderYetki} makinaMaliyet={makinaMaliyet} />
    </div>
  );
}
const ac = (customers, o = {}) => {
  render(<Harness customers={customers} giderYetki={o.giderYetki ?? true} makinaMaliyet={o.giderYetki === false ? null : hesapla(customers, o.veri)} />);
  fireEvent.click(screen.getByText("aç"));
};
const makina = (o = {}) => ({ id: 1, name: "Kutu Gıda", model: "AK100", serialNo: "K-1", installDate: "2026-03-20", fabrikaSatisBedeli: 500000, currency: "TRY", komisyon: 15000, uretimTarihi: "2026-03-05", ...o });

describe("Müşteri detayı: Maliyet ve Kâr kutusu", () => {
  it("AC-8 (detay): kutu doğrudan, ortak pay, komisyon ve satış bedelini ayrı satırlarda gösterir", () => {
    ac([makina()], { veri: { giderler: [{ id: 1, tarih: "2026-03-10", turId: 1, tutar: 60000 }, { id: 2, tarih: "2026-03-11", turId: 1, tutar: 20000, atamaTur: "makina", makinaTur: "musteri", makinaId: 1 }] } });
    const k = screen.getByTestId("maliyet-kar-kutusu");
    for (const t of ["Doğrudan giderler", "Ortak gider payı", "Komisyon", "Satış bedeli", "Toplam maliyet"]) expect(within(k).getByText(t)).toBeTruthy();
    expect(within(k).getByText("95.000 ₺")).toBeTruthy();
    expect(within(k).getByText("405.000 ₺")).toBeTruthy();
  });
  it("AC-7 / AC-36 (detay): parça hariç notu ve ortak gider kaynağı yazar", () => {
    ac([makina()]);
    const n = within(screen.getByTestId("maliyet-kar-kutusu")).getByTestId("maliyet-notlari").textContent;
    expect(n).toMatch(/Stoktan çekilen parçaların maliyeti hariç/);
    expect(n).toMatch(/Gerçekleşen gider kayıtları/);
  });
  it("AC-43 (detay): stoktan satılmış ama iz yoksa 'Üretim tarihi tahmini' etiketi", () => {
    ac([makina({ uretimTarihi: "", sourceStockId: 99 })]);
    expect(within(screen.getByTestId("maliyet-kar-kutusu")).getByText("Üretim tarihi tahmini")).toBeTruthy();
  });
  it("AC-33 (detay): stoğa girmeden açılan makinada durum yazar", () => {
    ac([makina({ uretimTarihi: "" })]);
    expect(within(screen.getByTestId("maliyet-kar-kutusu")).getByText(/Stoğa girmeden satıldı/)).toBeTruthy();
  });
  it("AC-10 (detay): yürürlük öncesi üretimde rakam yerine 'gider verisi girilmemiş'", () => {
    ac([makina({ uretimTarihi: "2025-11-01" })]);
    const k = screen.getByTestId("maliyet-kar-kutusu");
    expect(within(k).getByText(/Gider verisi girilmemiş/)).toBeTruthy();
    expect(within(k).queryByText("Kâr")).toBeNull();
  });
  it("AC-22: gider yetkisi olmayana kutu hiç çizilmez", () => {
    ac([makina()], { giderYetki: false });
    expect(screen.getByRole("button", { name: "Kapat" })).toBeTruthy(); // detay açık
    expect(screen.queryByTestId("maliyet-kar-kutusu")).toBeNull();
    expect(document.body.textContent).not.toMatch(/MALİYET VE KÂR|Ortak gider payı/);
  });
  it("AC-69: Finans ekranı maliyet ve kâr göstermez (gider yetkisiyle bile)", () => {
    render(<Finance customers={[makina()]} services={[]} dealers={[]} partSales={[]} yedekParcaSatislar={[]} factory={{ name: "Altuntaş Makina" }}
      rates={{}} payments={[]} teklifler={[]} serverPermissions={null} giderYetki={true} giderler={[]} giderTurleri={TUR} giderYururlukAy="2026-01" />);
    expect(document.body.textContent).not.toMatch(/Makina Kârlılığı|Ortak gider payı|Toplam maliyet|Kâr marjı/);
  });
});
