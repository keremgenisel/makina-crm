// @vitest-environment jsdom
// Spec 0007 AC-1–5, AC-17: bayi detayından "Bayi Aracılığıyla Kalıp Satışı". Aynı Extra Kalıp formu ve kayıt yolu;
// satış yapan firma bu bayi ön seçili; kalıp müşterinin makinasına yazılır; "Sattığı Kalıplar" canlı güncellenir.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { SimpleDealers } from "../../src/components/SimpleDealers";
import { deriveCustomerDetail } from "../../src/components/customers/detail/deriveCustomerDetail";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

const DEALERS = [{ id: 3, name: "Ege Bayi", bayiMi: true, anlasmaliServisMi: false, city: "İzmir", country: "Türkiye" }];
const CUST = [{ id: 500, name: "Kutu Gıda", model: "AK100", serialNo: "S-1", kaliplar: [] }];

function Harness({ perms = null, showToast = vi.fn(), onState }) {
  const [partSales, setPartSales] = useState([]);
  const [customers, setCustomers] = useState(CUST);
  onState?.({ partSales, customers });
  return <SimpleDealers dealers={DEALERS} setDealers={vi.fn()} factory={{ name: "Altuntaş Fabrika" }} setFactory={vi.fn()} geoData={null} loadingGeo={false}
    customers={customers} setCustomers={setCustomers} partSales={partSales} setPartSales={setPartSales} services={[]} kalipDefs={[{ id: 1, ad: "Hamburger" }]} setYedekParcaSatislar={vi.fn()}
    showToast={showToast} serverPermissions={perms} openDetailId={3} />;
}
const dugme = () => screen.queryByText("Bayi Aracılığıyla Kalıp Satışı");

describe("Bayi Aracılığıyla Kalıp Satışı", () => {
  it("AC-1 / AC-2: düğme görünür, aynı Extra Kalıp formu açılır ve satış yapan firma bu bayi", () => {
    render(<Harness />);
    expect(screen.getByText("Yedek Parça Satışı")).toBeTruthy(); // yanında: bayi ALICI
    fireEvent.click(dugme());
    expect(screen.getByText(/Bayi Aracılığıyla Kalıp Satışı · Ege Bayi/)).toBeTruthy();
    expect(screen.getByDisplayValue("Ege Bayi").tagName).toBe("SELECT");
  });
  it("AC-5: müşteri seçilmeden kayıt yapılmaz; formda ve bildirimde neden", () => {
    let st; const showToast = vi.fn();
    render(<Harness showToast={showToast} onState={s => { st = s; }} />);
    fireEvent.click(dugme());
    expect(screen.getByText(/Kalıbın gideceği müşteriyi ve makinayı seçin/)).toBeTruthy();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(showToast).toHaveBeenCalledWith("Kalıbın gideceği müşteriyi ve makinayı seçin.", "err");
    expect(st.partSales).toEqual([]);
  });
  it("AC-3 / AC-4: müşteri seçilip kaydedilince kalıp o müşteriye yazılır, makina geçmişinde görünür ve 'Sattığı Kalıplar' anında güncellenir", () => {
    let st;
    render(<Harness onState={s => { st = s; }} />);
    fireEvent.click(dugme());
    fireEvent.change(screen.getByPlaceholderText("Firma adı, model veya seri no ile ara..."), { target: { value: "Kutu" } });
    fireEvent.click(screen.getAllByText(/Kutu Gıda/).pop());
    const kalipAra = screen.getByPlaceholderText("Kalıp ara...");
    fireEvent.focus(kalipAra);
    fireEvent.change(kalipAra, { target: { value: "Ham" } });
    const secenek = screen.getAllByText("Hamburger").pop();
    fireEvent.mouseDown(secenek);
    fireEvent.click(secenek);
    const girdiler = screen.getByPlaceholderText("Ölçü, örn: 55x125 mm").parentElement.querySelectorAll("input");
    fireEvent.change(girdiler[girdiler.length - 1], { target: { value: "1.000" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.partSales).toHaveLength(1);
    expect(st.partSales[0]).toMatchObject({ customerId: 500, tur: "Kalıp", satisFirma: "Ege Bayi" });
    expect(st.customers[0].kaliplar[0]).toMatchObject({ partSaleId: st.partSales[0].id });
    const olaylar = deriveCustomerDetail({ detailView: st.customers[0], services: [], partSales: st.partSales, payments: [], models: [], todayStr: "2026-09-24", factoryName: "Altuntaş Fabrika", customers: st.customers }).detailTimelineEvents || [];
    expect(JSON.stringify(olaylar)).toContain("Hamburger");
    const baslik = screen.getByText(/Sattığı Extra Kalıplar \(1\)/);
    expect(within(baslik.parentElement.parentElement).getAllByText(/Hamburger/).length).toBeGreaterThan(0);
  });
  it("AC-17: Extra Kalıp ekleme izni olmayan kullanıcıya düğme görünmez", () => {
    render(<Harness perms={{ role: "user", permissions: JSON.stringify({ tabs: ["dealers"], customerActions: ["cust_edit"] }) }} />);
    expect(dugme()).toBeNull();
    cleanup();
    render(<Harness perms={{ role: "user", permissions: JSON.stringify({ tabs: ["dealers"], customerActions: ["cust_kalip_add"] }) }} />);
    expect(dugme()).toBeTruthy();
  });
});
