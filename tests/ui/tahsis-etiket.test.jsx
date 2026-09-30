// @vitest-environment jsdom
// Spec 0030 AC-8…AC-12 (plan B7): müşteri detayındaki makina geçmişinde, bayi ya da anlaşmasız firma alımından bu makinaya
// tahsis edilen yedek parça satırı kargo etiketi yazdırır. Alıcı satışı yapan taraftır, etiket partinin tamamını kapsar;
// yazdırma salt okunurdur ve izin aramaz.
import { describe, it, expect, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
let yazdirilan;
beforeEach(() => { yazdirilan = []; window.appPrint = { printHtml: vi.fn(html => { yazdirilan.push(html); }) }; });
afterEach(() => { cleanup(); delete window.appPrint; });

const M = [{ id: 1, name: "Kutu Gıda", model: "AK100", serialNo: "S-1", currency: "TRY", installDate: "2025-01-10" }];
const D = [{ id: 3, name: "Ege Bayi", phone: "0232 111", adres: "Bornova", city: "İzmir", country: "Türkiye" }];
const P = [{ id: 7, ad: "Rulman" }, { id: 8, ad: "V Kayış" }];
const PARTI = [
  { id: 41, batchId: 40, aliciTipi: "bayi", dealerId: 3, partId: 7, miktar: 2, birimFiyat: 350, currency: "TRY", tarih: "2026-09-05", odendi: true, tahsisler: [{ miktar: 2, customerId: 1, serialNo: "S-1", tarih: "2026-09-06" }] },
  { id: 42, batchId: 40, aliciTipi: "bayi", dealerId: 3, partId: 8, miktar: 1, birimFiyat: 150, currency: "TRY", tarih: "2026-09-05", odendi: true, tahsisler: [] },
];
const DIS_FIRMA = [{ id: 51, aliciTipi: "bayi", disFirma: true, disFirmaAd: "Usta Servis", partId: 7, miktar: 1, birimFiyat: 350, currency: "TRY", tarih: "2026-09-07", odendi: false,
  tahsisler: [{ miktar: 1, customerId: 1, serialNo: "S-1", tarih: "2026-09-08" }] }];

const ciz = (yp, o = {}) => {
  const setler = { setCustomers: vi.fn(), setServices: vi.fn(), setPartSales: vi.fn(), setYedekParcaSatislar: vi.fn() };
  render(<Customers customers={M} services={[]} partSales={[]} payments={[]} dealers={D} parts={P} factory={{ name: "Altuntaş Makina" }}
    yedekParcaSatislar={yp} initialDetailId={1} {...setler} {...o} />);
  return setler;
};
const etiketDugmesi = () => screen.getAllByRole("button").filter(b => b.textContent.trim() === "Etiket" && /bütün kalemlerini/.test(b.title));

describe("Tahsis satırında kargo etiketi", () => {
  it("AC-8 / AC-10: bayi alımından tahsis edilen satırda 'Etiket' düğmesi; ipucu alıcının bayi olduğunu ve kargonun tamamını söyler", () => {
    ciz(PARTI);
    const d = etiketDugmesi();
    expect(d).toHaveLength(1);
    expect(d[0].title).toMatch(/alıcı parçayı satın alan bayi\/firmadır/);
    expect(d[0].title).toMatch(/bu kargonun bütün kalemlerini kapsar/);
  });
  it("AC-8 / AC-9 / AC-11: tıklayınca önizleme açılır; gönderen fabrika, alıcı bayi; partinin iki kalemi de etikette", () => {
    ciz(PARTI);
    fireEvent.click(etiketDugmesi()[0]);
    expect(window.appPrint.printHtml).toHaveBeenCalledTimes(1);
    const html = yazdirilan[0];
    expect(html).toContain("Altuntaş Makina");
    expect(html).toContain("Ege Bayi");
    expect(html).not.toMatch(/Kutu Gıda/); // alıcı müşteri değil
    expect(html).toContain("Rulman");
    expect(html).toContain("V Kayış"); // bu makinaya tahsis edilmemiş kalem de partiyle birlikte
  });
  it("AC-9: anlaşmasız firma alımında alıcı o firmadır", () => {
    ciz(DIS_FIRMA);
    fireEvent.click(etiketDugmesi()[0]);
    expect(yazdirilan[0]).toContain("Usta Servis");
  });
  it("AC-12: yazdırmak hiçbir kaydı değiştirmez ve izin aramaz (izinsiz kullanıcıda da düğme var)", () => {
    const hicbirIzin = { role: "user", permissions: { tabs: ["customers"], customerActions: [] } };
    const setler = ciz(PARTI, { serverPermissions: hicbirIzin });
    fireEvent.click(etiketDugmesi()[0]);
    for (const [ad, fn] of Object.entries(setler)) expect(fn, ad).not.toHaveBeenCalled();
    expect(window.appPrint.printHtml).toHaveBeenCalledTimes(1);
  });
});
