// @vitest-environment jsdom
// Spec 0001 AC-56 (çıktı bazlı): çalışan bazlı personel tutarı ve elden bileşen gerçek yazdırma ve
// dışa aktarma ÇIKTILARINDA yer almaz. tests/gider-gizlilik.test.js kaynağı tarar; bu dosya ise ayırt
// edici tutarlarla doldurulmuş veriyi gerçek üreticilerden geçirip üretilen metni denetler (triyaj bulgu 9).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";

const yakalanan = vi.hoisted(() => []);
vi.mock("../../src/components/settings/csvUtils", async (orig) => {
  const gercek = await orig();
  return {
    ...gercek,
    downloadCSV: (rows, ad) => { yakalanan.push({ ad, rows }); },
    downloadXlsx: async (rows, ad) => { yakalanan.push({ ad, rows }); },
  };
});
vi.mock("xlsx", () => ({
  utils: { aoa_to_sheet: (rows) => { yakalanan.push({ ad: "tum-kayitlar.xlsx", rows }); return {}; }, book_new: () => ({}), book_append_sheet: () => {} },
  write: () => "", writeFile: () => {},
}));

import { SettingsExport } from "../../src/components/settings/SettingsExport";
import { hesaplaAylikRapor } from "../../src/lib/aylikRapor";
import { buildAylikRaporHtml, buildServiceFormHtml, buildMachineReportHtml } from "../../src/lib/printTemplates";

afterEach(() => { cleanup(); yakalanan.length = 0; });

// Başka hiçbir alanda geçmeyen ayırt edici tutarlar (resmi, elden, toplam).
const RESMI = 38765.43, ELDEN = 12345.67, TOPLAM = 51111.1;
const IZ = /38[.,\s]?765|12[.,\s]?345|51[.,\s]?111|38765|12345|51111/;

const calisanlar = [{ id: 1, ad: "Murat Usta", resmiMaliyet: RESMI, eldenMaliyet: ELDEN }];
const giderler = [{ id: 10, tarih: "2026-06-30", turId: 3, calisanId: 1, calisanAd: "Murat Usta", resmiTutar: RESMI, eldenTutar: ELDEN, tutar: TOPLAM, odendi: false, modelSatirlari: [] }];
const giderTanimlari = [{ id: 20, turId: 3, calisanId: 1, ad: "Murat Usta", baslangicAy: "2026-01", uretilenAylar: ["2026-06"], modelSatirlari: [] }];
const customers = [{ id: 100, name: "ABC Gıda", model: "AK-100", serialNo: "S1", installDate: "2026-06-01", faturali: "Faturalı Yurtiçi", fabrikaSatisBedeli: 1000, currency: "TRY", satisKuru: 38765.43, uretimTarihi: "2026-05-02" }];
// Spec 0002: satış kaydındaki maliyet snapshot alanları (kur, üretim tarihi) da çıktıya girmez; kur ayırt edici tutarla IZ'e yakalanır.
const services = [{ id: 200, customerId: 100, date: "2026-06-10", type: "Arıza", tech: "Murat Usta", islemFirma: "Altuntaş Makina", servisUcreti: 500, durum: "Tamamlandı" }];

describe("AC-56: çıktılarda personel tutarı yok (çıktı bazlı)", () => {
  it("tüm CSV/XLSX dışa aktarmaları (her rapor + Tümünü İndir) personel tutarı içermez", async () => {
    render(<SettingsExport customers={customers} services={services} dealers={[]} stock={[]} partSales={[]} payments={[]} notes={[]} parts={[]}
      appSettings={{}} flash={vi.fn()} calisanlar={calisanlar} giderler={giderler} giderTanimlari={giderTanimlari} />);
    for (const g of ["Müşteri & Servis", "Finans", "Diğer"]) fireEvent.click(screen.getByText(new RegExp(`^${g} \\(`)));
    const indir = screen.getAllByTitle("İndir");
    expect(indir.length).toBeGreaterThan(15);
    indir.forEach(b => fireEvent.click(b));
    fireEvent.click(screen.getByText("Tümünü İndir"));
    await waitFor(() => expect(yakalanan.length).toBe(indir.length + 1));
    // Çalışan dışa aktarması gerçekten üretildi ve adı taşıyor; tutarı taşımıyor.
    const cal = yakalanan.find(y => /firma-calisanlari/.test(y.ad));
    expect(JSON.stringify(cal.rows)).toContain("Murat Usta");
    for (const y of yakalanan) expect(JSON.stringify(y.rows), y.ad).not.toMatch(/2026-05-02|02\.05\.2026/);
    for (const y of yakalanan) expect(JSON.stringify(y.rows), y.ad).not.toMatch(IZ);
  });

  it("aylık faaliyet raporu çıktısı personel tutarı içermez", () => {
    const veri = { customers, services, partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [], giderler, giderTanimlari, calisanlar };
    const html = buildAylikRaporHtml(hesaplaAylikRapor(veri, "2026-06", {}), { name: "Altuntaş Makina" });
    expect(html).toContain("ABC Gıda");
    expect(html).not.toMatch(IZ);
  });

  it("servis formu ve makina geçmişi raporu (teknisyen = çalışan) personel tutarı içermez", () => {
    const servis = buildServiceFormHtml({ ...services[0], calisan: calisanlar[0] }, customers, {}, {});
    expect(servis).toContain("Murat Usta");
    expect(servis).not.toMatch(IZ);
    const makina = buildMachineReportHtml(customers[0], [services[0]], [], {}, "", [], null, [], [], []);
    expect(makina).not.toMatch(IZ);
  });
});
