// @vitest-environment jsdom
// Spec 0131 R8/2, R8/3: paylaşılan formlar açıldıkları her ekranda gün alanını taşır. Servis Panosu (sekme ve ayrı pencere,
// sahte köprüyle) ve bayi detayının Extra Kalıp formu (AC-41, AC-42).
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { yerelBugun } from "../../src/lib/utils";
import { ServisPanosu } from "../../src/components/ServisPanosu";
import { ServisPencere } from "../../src/components/ServisPencere";
import { SimpleDealers } from "../../src/components/SimpleDealers";
import { KDV, PART_TYPES, PARTS, CUSTOMERS, SERVICES } from "../fixtures/0115-veri";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); delete window.servisBridge; });

const BUGUN = yerelBugun();
const kayitlar = (set, taban) => set.mock.calls.map(([f]) => (typeof f === "function" ? f(taban) : f)).at(-1);
const kaydet = () => fireEvent.click(screen.getAllByRole("button", { name: /Kaydet/ }).pop());
const odendiKutusu = () => screen.getAllByRole("checkbox").find(c => /tahsil edilmedi|tahsil edildi \(ödendi\)/.test(c.closest("label")?.textContent || ""));

describe("Spec 0131 AC-41: Servis Panosu formu", () => {
  it("panodan açılan formda gün alanı (tahsilat hesabı olmadan) çizilir, işaretlenince bugün, kayıtta yazılır", () => {
    const setServices = vi.fn();
    const sv = SERVICES.map(s => ({ ...s, durum: "Bekliyor" }));
    render(<ServisPanosu services={sv} setServices={setServices} customers={CUSTOMERS} dealers={[]} parts={PARTS} calisanlar={[]} showToast={vi.fn()} kdvRates={KDV}
      partTypeDefs={PART_TYPES} setYedekParcaSatislar={vi.fn()} yedekParcaSatislar={[]} setDosyalar={vi.fn()} dosyalar={[]} />);
    fireEvent.click(screen.getAllByText("Bafra Gıda")[0].closest("article"));
    expect(screen.queryByTestId("form-tahsilat-gunu")).toBeNull();
    fireEvent.click(odendiKutusu());
    expect(screen.getByTestId("form-tahsilat-gunu").value).toBe(BUGUN);
    expect(screen.queryByLabelText("Tahsilat hesabı")).toBeNull(); // R8/3
    kaydet();
    expect(kayitlar(setServices, sv).find(s => s.id === 42)).toMatchObject({ odendi: true, tahsilatTarihi: BUGUN });
  });
  it("formda değiştirilen gün kayda yazılır", () => {
    const setServices = vi.fn();
    const sv = SERVICES.map(s => ({ ...s, durum: "Bekliyor" }));
    render(<ServisPanosu services={sv} setServices={setServices} customers={CUSTOMERS} dealers={[]} parts={PARTS} calisanlar={[]} showToast={vi.fn()} kdvRates={KDV}
      partTypeDefs={PART_TYPES} setYedekParcaSatislar={vi.fn()} yedekParcaSatislar={[]} setDosyalar={vi.fn()} dosyalar={[]} />);
    fireEvent.click(screen.getAllByText("Bafra Gıda")[0].closest("article"));
    fireEvent.click(odendiKutusu());
    fireEvent.change(screen.getByTestId("form-tahsilat-gunu"), { target: { value: "2026-10-21" } });
    kaydet();
    expect(kayitlar(setServices, sv).find(s => s.id === 42)).toMatchObject({ odendi: true, tahsilatTarihi: "2026-10-21" });
  });
  it("işareti duran günsüz kayıtta alan boş gelir ve dokunulmadan kaydedilince gün yazılmaz (R7/2)", () => {
    const setServices = vi.fn();
    const sv = SERVICES.map(s => ({ ...s, durum: "Bekliyor", ...(s.id === 42 ? { odendi: true } : {}) }));
    render(<ServisPanosu services={sv} setServices={setServices} customers={CUSTOMERS} dealers={[]} parts={PARTS} calisanlar={[]} showToast={vi.fn()} kdvRates={KDV}
      partTypeDefs={PART_TYPES} setYedekParcaSatislar={vi.fn()} yedekParcaSatislar={[]} setDosyalar={vi.fn()} dosyalar={[]} />);
    fireEvent.click(screen.getAllByText("Bafra Gıda")[0].closest("article"));
    expect(screen.getByTestId("form-tahsilat-gunu").value).toBe("");
    kaydet();
    expect("tahsilatTarihi" in kayitlar(setServices, sv).find(s => s.id === 42)).toBe(false);
  });
  it("ayrı pencerede (sahte köprü) aynı alan çizilir", async () => {
    const sv = SERVICES.map(s => ({ ...s, durum: "Bekliyor" }));
    const snap = { services: sv, customers: CUSTOMERS, calisanlar: [], parts: PARTS, dealers: [], factory: { name: "A" }, appSettings: null, partStock: [], partStockLog: [],
      dosyalar: [], yedekParcaSatislar: [], partSales: [], serverPermissions: null, aktifKullanici: "ofis", kargoYetki: true, kalipYetki: false, uretimFormlari: [], partTypeDefs: PART_TYPES };
    window.servisBridge = { ilkVeriAl: () => Promise.resolve(snap), onVeri: () => () => {}, mutate: vi.fn() };
    render(<ServisPencere />);
    fireEvent.click((await screen.findAllByText("Bafra Gıda"))[0].closest("article"));
    fireEvent.click(odendiKutusu());
    expect(screen.getByTestId("form-tahsilat-gunu").value).toBe(BUGUN);
  });
});

describe("Spec 0131 AC-42: bayi detayının Extra Kalıp formu", () => {
  it("bayi aracılığıyla kalıp satışında gün alanı çizilir, işaretli kayıtta bugün yazılır", () => {
    let st;
    const Harness = () => {
      const [partSales, setPartSales] = useState([]);
      const [customers, setCustomers] = useState([{ id: 500, name: "Kutu Gıda", model: "AK100", serialNo: "S-1", kaliplar: [] }]);
      st = { partSales };
      return <SimpleDealers dealers={[{ id: 3, name: "Ege Bayi", bayiMi: true }]} setDealers={vi.fn()} factory={{ name: "Altuntaş Fabrika" }} setFactory={vi.fn()} geoData={null} loadingGeo={false}
        customers={customers} setCustomers={setCustomers} partSales={partSales} setPartSales={setPartSales} services={[]} kalipDefs={[{ id: 1, ad: "Hamburger" }]} setYedekParcaSatislar={vi.fn()}
        showToast={vi.fn()} serverPermissions={null} openDetailId={3} />;
    };
    render(<Harness />);
    fireEvent.click(screen.getByText("Bayi Aracılığıyla Kalıp Satışı"));
    fireEvent.change(screen.getByPlaceholderText("Firma adı, model veya seri no ile ara..."), { target: { value: "Kutu" } });
    fireEvent.click(screen.getAllByText(/Kutu Gıda/).pop());
    const kalipAra = screen.getByPlaceholderText("Kalıp ara...");
    fireEvent.focus(kalipAra);
    fireEvent.change(kalipAra, { target: { value: "Ham" } });
    const secenek = screen.getAllByText("Hamburger").pop();
    fireEvent.mouseDown(secenek); fireEvent.click(secenek);
    const girdiler = screen.getByPlaceholderText("Ölçü, örn: 55x125 mm").parentElement.querySelectorAll("input");
    fireEvent.change(girdiler[girdiler.length - 1], { target: { value: "1.000" } });
    fireEvent.click(odendiKutusu());
    expect(screen.getByTestId("form-tahsilat-gunu").value).toBe(BUGUN);
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.partSales[0]).toMatchObject({ odendi: true, tahsilatTarihi: BUGUN });
  });
});
