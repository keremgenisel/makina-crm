// @vitest-environment jsdom
// Spec 0007 AC-6/7/8/9/11/14/15/16/18: aynı veriyle Müşteriler, Anasayfa, Bayiler, aylık rapor ve müşteri detayı aynı
// borçluyu gösterir (tek kaynak kalipBorcTarafi).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";
import { Dashboard } from "../../src/components/Dashboard";
import { SimpleDealers } from "../../src/components/SimpleDealers";
import { hesaplaAylikRapor } from "../../src/lib/aylikRapor";
import { deriveCustomerDetail } from "../../src/components/customers/detail/deriveCustomerDetail";

afterEach(cleanup);

const FAB = { name: "Altuntaş Fabrika" };
const CUST = [{ id: 500, name: "Kutu Gıda", model: "AK100", currency: "TRY", installDate: "2026-01-01" }];
const DEALERS = [{ id: 3, name: "Ege Bayi", bayiMi: true }];
const kalip = (o = {}) => ({ id: 1, customerId: 500, tur: "Kalıp", ad: "Hamburger", ucret: 1000, currency: "TRY", tarih: "2026-07-10", faturaTipi: "Faturasız Yurtiçi", odendi: false, ...o });

const ekranlar = (partSales, dealers = DEALERS) => {
  // Müşteriler: borç süzgeci
  const m = render(<Customers customers={CUST} setCustomers={vi.fn()} services={[]} partSales={partSales} dealers={dealers} factory={FAB} parts={[]} initialFilter="debt" />);
  const musteriBorclu = !!within(m.container).queryByText("Kutu Gıda");
  m.unmount();
  // Anasayfa: borçlu firma ve borçlu bayi sayıları
  const d = render(<Dashboard customers={CUST} dealers={dealers} services={[]} stock={[]} payments={[]} partSales={partSales} yedekParcaSatislar={[]} rates={null} teklifler={[]} factory={FAB} />);
  const sayi = (etiket) => Number(screen.getByText(etiket).parentElement.textContent.replace(etiket, "").match(/\d+/)?.[0]);
  const anasayfa = { borcluFirma: sayi("Borçlu Firma"), borcluBayi: sayi("Borçlu Bayi/Servis") };
  d.unmount();
  // Bayiler: "Borçlu" süzgeci
  const b = render(<SimpleDealers dealers={dealers} setDealers={vi.fn()} factory={FAB} setFactory={vi.fn()} partSales={partSales} services={[]} customers={CUST} showToast={vi.fn()} initialFilter="borclu" />);
  const bayiBorclu = dealers.length ? !!within(b.container).queryByText(dealers[0].name) : false;
  b.unmount();
  // Aylık rapor
  const r = hesaplaAylikRapor({ customers: CUST, services: [], partSales, payments: [], teklifler: [], dealers, yedekParcaSatislar: [] }, "2026-07", { factoryName: FAB.name });
  // Müşteri detayı borç toplamı
  const det = deriveCustomerDetail({ detailView: CUST[0], services: [], partSales, payments: [], kdvRates: undefined, models: [], todayStr: "2026-07-20", factoryName: FAB.name, customers: CUST });
  return { musteriBorclu, anasayfa, bayiBorclu, rapor: r, detayEkBorc: Object.values(det.detailEkBorcAyniPB || {}).reduce((a, x) => a + (Number(x) || 0), 0) + (Number(det.detailEkBorcAyniPB) || 0) };
};

describe("Borç atıfı beş ekranda aynı", () => {
  it("AC-6 / AC-7 / AC-8 / AC-9 / AC-18: bayinin sattığı ödenmemiş kalıp yalnız bayide; müşteri hiçbir ekranda borçlu değil", () => {
    const e = ekranlar([kalip({ satisFirma: "Ege Bayi" })]);
    expect(e.musteriBorclu).toBe(false);
    expect(e.anasayfa).toEqual({ borcluFirma: 0, borcluBayi: 1 });
    expect(e.bayiBorclu).toBe(true);
    expect(e.rapor.alacakDetay.map(x => x.firma)).toEqual(["Ege Bayi"]);
    expect(e.detayEkBorc).toBe(0);
  });
  it("AC-13 / AC-18: fabrika satışında borç her ekranda müşteride", () => {
    const e = ekranlar([kalip({ satisFirma: FAB.name })]);
    expect(e.musteriBorclu).toBe(true);
    expect(e.anasayfa).toEqual({ borcluFirma: 1, borcluBayi: 0 });
    expect(e.bayiBorclu).toBe(false);
    expect(e.rapor.alacakDetay.map(x => x.firma)).toEqual(["Kutu Gıda"]);
    expect(e.detayEkBorc).toBeGreaterThan(0);
  });
  it("AC-11: 'Diğer' firma satışında müşteri borçsuz; Anasayfa borçlu bayi/servis ve raporda firma adıyla", () => {
    const e = ekranlar([kalip({ satisFirma: "Diğer", satisFirmaAd: "Aracı Ltd" })]);
    expect(e.musteriBorclu).toBe(false);
    expect(e.anasayfa).toEqual({ borcluFirma: 0, borcluBayi: 1 });
    expect(e.rapor.alacakDetay.map(x => x.firma)).toEqual(["Aracı Ltd"]);
  });
  it("AC-14: ücretsiz kalıp hiçbir ekranda borç değil", () => {
    const e = ekranlar([kalip({ satisFirma: "Ege Bayi", ucretsizMi: true })]);
    expect(e).toMatchObject({ musteriBorclu: false, anasayfa: { borcluFirma: 0, borcluBayi: 0 }, bayiBorclu: false, detayEkBorc: 0 });
    expect(e.rapor.alacakDetay).toEqual([]);
  });
  it("AC-15: ödendi işaretlenen kalıp bayinin borcundan düşer", () => {
    const e = ekranlar([kalip({ satisFirma: "Ege Bayi", odendi: true })]);
    expect(e.bayiBorclu).toBe(false);
    expect(e.anasayfa.borcluBayi).toBe(0);
  });
  it("AC-16: bayinin adı değiştirilince (satış yapan ad kaskadla güncellenmiş) aynı tutar aynı bayide", () => {
    const e = ekranlar([kalip({ satisFirma: "Ege Bayi A.Ş." })], [{ id: 3, name: "Ege Bayi A.Ş.", bayiMi: true }]);
    expect(e.bayiBorclu).toBe(true);
    expect(e.rapor.alacakDetay.map(x => x.firma)).toEqual(["Ege Bayi A.Ş."]);
    expect(e.musteriBorclu).toBe(false);
  });
});
