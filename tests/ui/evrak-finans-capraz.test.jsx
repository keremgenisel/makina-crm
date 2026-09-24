// @vitest-environment jsdom
// Spec 0006 AC-24 / AC-25 / AC-28 / AC-29: Evrak'tan üretilen kayıtlar Finans, aylık rapor ve Analiz'de elle
// girilenle aynı sayılır; silme ve müşteri kaskadı onlara da aynı davranır.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { Finance } from "../../src/components/Finance";
import { teklifUretimPlani } from "../../src/lib/evrakUretim";
import { evrakAdimlariniYaz } from "../../src/lib/evrakUygula";
import { hesaplaAylikRapor } from "../../src/lib/aylikRapor";
import { hesaplaAnaliz } from "../../src/lib/analiz";
import { yedekParcaGeriAl } from "../../src/lib/yedekParcaStok";
import { yedekParcaKaskad } from "../../src/lib/musteriKaskad";

afterEach(cleanup);

const CUST = [{ id: 500, name: "Kutu Gıda", model: "AK100", currency: "TRY" }];
const alt = (id, type, fiyat, miktar = 1) => ({ id, type, miktar: String(miktar), birimFiyat: String(fiyat) });
const teklif = { id: 900, no: "2026-00001", type: "teklif", durum: "onaylandi", currency: "TRY", iskonto: "", tarih: "2026-07-10", customerId: 500, satirlar: [
  { rowId: "a", pickTip: "parca", selectedPart: "7", subItems: [alt("p1", "parca", 111, 3)] },
  { rowId: "b", pickTip: "kalip", selectedKalip: "Hamburger", kalipRolu: "extra", subItems: [alt("k1", "kalip", 5000)] },
] };
function uret() {
  const d = { yedekParcaSatislar: [], partStock: [{ id: 1, partId: "7", miktar: 10 }], partStockLog: [], partSales: [], customers: CUST.map(c => ({ ...c })) };
  const set = (k) => vi.fn(u => { d[k] = typeof u === "function" ? u(d[k]) : u; });
  const plan = teklifUretimPlani(teklif, { parts: [{ id: 7, ad: "Bant Motoru" }], customers: CUST, factoryName: "Altuntaş Makina" });
  evrakAdimlariniYaz(teklif, plan, null, { setYedekParcaSatislar: set("yedekParcaSatislar"), setPartStock: set("partStock"), setPartStockLog: set("partStockLog"),
    get partStock() { return d.partStock; }, setPartSales: set("partSales"), setCustomers: set("customers"), bugun: "2026-07-10" });
  return { d, set };
}

describe("Evrak'tan üretilen kayıtlar hesaplarda", () => {
  it("AC-24: yedek parça satışı Finans ve aylık raporda aynı net tutar (333)", () => {
    const { d } = uret();
    const rapor = hesaplaAylikRapor({ customers: d.customers, services: [], partSales: d.partSales, payments: [], teklifler: [], dealers: [], yedekParcaSatislar: d.yedekParcaSatislar }, "2026-07", {});
    expect(rapor.yedekKargoTutar.TRY).toBe(333);
    render(<Finance customers={d.customers} services={[]} dealers={[]} partSales={d.partSales} yedekParcaSatislar={d.yedekParcaSatislar}
      factory={{ name: "Altuntaş Makina" }} rates={{}} payments={[]} teklifler={[]} serverPermissions={null} />);
    fireEvent.click(screen.getByTitle("Tutarları göster"));
    expect(within(screen.getByText("Toplam Parça Ücreti Bedeli").parentElement).getByText(/333/)).toBeTruthy();
  });
  it("AC-25: Extra Kalıp satışı aylık raporda ve Analiz'de elle girilen Extra Kalıp gibi sayılır", () => {
    const { d } = uret();
    const elle = { ...d.partSales[0], id: 77, teklifId: null, teklifKalemId: null };
    const rapor = (ps) => hesaplaAylikRapor({ customers: d.customers, services: [], partSales: ps, payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }, "2026-07", {});
    expect(rapor(d.partSales).extraKalipTutar).toEqual(rapor([elle]).extraKalipTutar);
    expect(rapor(d.partSales).extraKalipTutar.TRY).toBe(5000);
    const analiz = (ps) => { const a = hesaplaAnaliz({ customers: d.customers, services: [], partSales: ps, yedekParcaSatislar: [], parts: [] }, {}); return { ad: a.kalipAd, olcu: a.kalipOlcu, model: a.kalipModel }; };
    expect(analiz(d.partSales)).toEqual(analiz([elle]));
    expect(JSON.stringify(analiz(d.partSales).ad)).toContain("Hamburger");
  });
  it("AC-28: Evrak'tan üretilmiş yedek parça satışı silinince stok geri döner", () => {
    const { d, set } = uret();
    expect(d.partStock[0].miktar).toBe(7);
    yedekParcaGeriAl(d.yedekParcaSatislar[0].id, set("partStock"), set("partStockLog"));
    expect(d.partStock[0].miktar).toBe(10);
  });
  it("AC-29: müşteri silme kaskadı Evrak'tan üretilmiş yedek parça satışını da kapsar", () => {
    const { d } = uret();
    const r = yedekParcaKaskad(d.yedekParcaSatislar, 500, "2026-07-11T10:00:00Z");
    expect(r.find(s => s.id === d.yedekParcaSatislar[0].id).deletedAt).toBe("2026-07-11T10:00:00Z");
  });
});
