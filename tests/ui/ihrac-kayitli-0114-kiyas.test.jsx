// @vitest-environment jsdom
// Spec 0114 AC-30 (plan adım 1): işaret taşımayan veride Finans ekranının metni, aylık rapor motorunun çıktısı, KDV
// karşılaştırması ve dışa aktarma satırları spec öncesi kodla birebir aynıdır. "Önce" çıktıları spec 0114'ten ÖNCEKİ kodla
// üretildi (YAZ_0114=1 ile), tests/fixtures/0114-once.json. Veri 0079'un karışık kümesidir; üstüne tevkifatlı bir makina ve
// ücretsiz bir yedek parça eklenir (iki komşu kavramın da dokunulmadan kaldığı ölçülür).
import { describe, it, expect, afterEach, beforeAll, afterAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within, act } from "@testing-library/react";
import fs from "node:fs";

const yakalanan = vi.hoisted(() => ({ satirlar: {} }));
vi.mock("../../src/components/settings/csvUtils", async (orijinal) => {
  const m = await orijinal();
  return { ...m, downloadXlsx: async (rows, ad) => { yakalanan.satirlar[ad] = JSON.parse(JSON.stringify(rows)); }, downloadCSV: () => {} };
});

import { Finance } from "../../src/components/Finance";
import { SettingsExport } from "../../src/components/settings/SettingsExport";
import { hesaplaAylikRapor } from "../../src/lib/aylikRapor";
import { buildAylikRaporHtml } from "../../src/lib/printTemplates";
import { satisKdvAylar } from "../../src/lib/giderKdv";
import { kdvKarsilastir } from "../../src/lib/gider";
import { calcKalanBorc, satisKdvBolumu, tahsilKdvOrani } from "../../src/lib/utils";
import { CUSTOMERS, PAYMENTS, SERVICES, PART_SALES, YEDEK, DEALERS, PARTS, KDV, FAB } from "../fixtures/0079-veri";

const DOSYA = "tests/fixtures/0114-once.json";
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-09T10:00:00") }); });
afterAll(() => vi.useRealTimers());
afterEach(cleanup);

const metin = (el) => el.textContent.replace(/\s+/g, " ").trim();
export const VERI_0114_KIYAS = {
  customers: CUSTOMERS.map(c => (c.id === 1002 ? { ...c, tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10 } : c)),
  services: SERVICES, partSales: PART_SALES, payments: PAYMENTS, dealers: DEALERS, parts: PARTS, factory: FAB, kdvRates: KDV,
  yedekParcaSatislar: [...YEDEK, { id: 9114, aliciTipi: "musteri", musteriId: 1001, partId: "81", miktar: 1, birimFiyat: 500, currency: "TRY",
    faturaTipi: "", tarih: "2026-09-18", ucretsizMi: true, odendi: false }],
};

export const kiyasCiktilari = async (v = VERI_0114_KIYAS) => {
  const sonuc = {};
  const f = render(<Finance customers={v.customers} services={v.services} dealers={v.dealers} partSales={v.partSales} yedekParcaSatislar={v.yedekParcaSatislar}
    factory={v.factory} rates={{}} payments={v.payments} teklifler={[]} serverPermissions={null} kdvRates={v.kdvRates}
    giderYetki giderler={[]} giderTurleri={[]} giderYururlukAy="2026-01" />);
  fireEvent.click(screen.getByTitle("Tutarları göster"));
  sonuc.finans = metin(f.container);
  f.unmount();

  const veri = { customers: v.customers, services: v.services, partSales: v.partSales, payments: v.payments, teklifler: [], dealers: v.dealers, yedekParcaSatislar: v.yedekParcaSatislar };
  const sec = { factoryName: v.factory.name, kdvRates: v.kdvRates, factory: v.factory, rates: {} };
  for (const ay of ["2026-09", "2026-10"]) {
    const r = hesaplaAylikRapor(veri, ay, sec);
    sonuc[`rapor:${ay}`] = JSON.parse(JSON.stringify(r));
    sonuc[`raporHtml:${ay}`] = buildAylikRaporHtml(r, v.factory);
    const s = satisKdvAylar(veri, [ay], sec);
    sonuc[`satisKdv:${ay}`] = JSON.parse(JSON.stringify({ kdv: s.kdv, aliciBeyan: s.aliciBeyan }));
    sonuc[`kart:${ay}`] = { iki: kdvKarsilastir(s.kdv, 1000), dort: kdvKarsilastir(s.kdv, 1000, 250, s.aliciBeyan.TRY || 0) };
  }
  sonuc.kalanBorc = v.customers.map(c => [c.id, calcKalanBorc(c, v.payments, v.kdvRates), tahsilKdvOrani(c.faturali, c.installDate, v.kdvRates, c)]);
  sonuc.bolum = [
    ...v.customers.map(c => satisKdvBolumu(c.faturali, c.faturaBedeli, c.installDate, v.kdvRates, c)),
    ...v.partSales.map(p => satisKdvBolumu(p.faturaTipi, p.ucret, p.tarih, v.kdvRates, p)),
    ...v.yedekParcaSatislar.map(s => satisKdvBolumu(s.faturaTipi, (Number(s.birimFiyat) || 0) * (Number(s.miktar) || 0), s.tarih, v.kdvRates, s)),
  ];

  yakalanan.satirlar = {};
  const e = render(<SettingsExport customers={v.customers} services={v.services} dealers={v.dealers} stock={[]} partSales={v.partSales} payments={v.payments}
    notes={[]} parts={v.parts} appSettings={{ kdvRates: v.kdvRates }} factory={v.factory} flash={vi.fn()} yedekParcaSatislar={v.yedekParcaSatislar} />);
  for (const grup of ["Müşteri & Servis", "Finans"]) fireEvent.click(within(e.container).getByText(new RegExp(`^${grup} \\(`)));
  for (const b of within(e.container).getAllByTitle("İndir")) await act(async () => { fireEvent.click(b); });
  fireEvent.click(within(e.container).getByText(/^Diğer \(/));
  const yp = within(e.container).getByText("Yedek Parça (Kargo) Satışları").closest("tr");
  await act(async () => { fireEvent.click(within(yp).getByTitle("İndir")); });
  sonuc.disaAktarma = { ...yakalanan.satirlar };
  e.unmount();
  return sonuc;
};

describe("Spec 0114 AC-30: işaretsiz veride ekran, motor ve dışa aktarma birebir aynı", () => {
  it("AC-30: Finans metni, aylık rapor motoru ve HTML'i, KDV karşılaştırması, kalan borç ve dışa aktarma satırları spec öncesiyle aynı", async () => {
    const simdi = await kiyasCiktilari();
    if (process.env.YAZ_0114 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(simdi, null, 1)); return; }
    const once = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    expect(Object.keys(simdi).sort()).toEqual(Object.keys(once).sort());
    // Spec 0114 Karar 45 ile: tevkifatlı satış kutusu firma firma detayını da taşır (rapor nesnesinde `detay`, HTML'de kutunun
    // altında tablo). İkisi yalnız bu ekten ayıklanır; geri kalan her şey spec öncesiyle birebir. Ayıklamanın iş yaptığı ölçülür.
    const detaysiz = (k, v) => {
      if (k.startsWith("rapor:") && v.tevkifatliSatis) { const { detay: _d, ...t } = v.tevkifatliSatis; return { ...v, tevkifatliSatis: t }; }
      if (k.startsWith("raporHtml:")) return v.replace(/<[^<]*TEVKİFATLI SATIŞLAR \(firma firma[\s\S]*?<\/table>/, "");
      return v;
    };
    expect(simdi["raporHtml:2026-09"]).toContain("TEVKİFATLI SATIŞLAR (firma firma");
    expect(detaysiz("raporHtml:2026-09", simdi["raporHtml:2026-09"])).not.toContain("TEVKİFATLI SATIŞLAR (firma firma");
    for (const k of Object.keys(once)) if (k !== "disaAktarma") expect(detaysiz(k, simdi[k]), k).toEqual(once[k]);
    expect(once.finans).toContain("KDV Karşılaştırması"); // kart gerçekten çizildi, kıyas boş metne bakmıyor
    expect(once["raporHtml:2026-09"]).toContain("TEVKİFATLI SATIŞLAR");
    // R34: iki yeni sütun satırın SONUNA eklenir; işaretsiz satırda boştur, eski sütunlar birebir aynı.
    expect(Object.keys(simdi.disaAktarma).sort()).toEqual(Object.keys(once.disaAktarma).sort());
    for (const [ad, satirlar] of Object.entries(once.disaAktarma)) {
      const yeni = simdi.disaAktarma[ad];
      expect(yeni.length, ad).toBe(satirlar.length);
      satirlar.forEach((s, i) => {
        expect(yeni[i].slice(0, s.length), `${ad} satır ${i}`).toEqual(s);
        if (i > 0) expect(yeni[i].slice(s.length).every(x => x === "" || x == null), `${ad} satır ${i} ek sütun`).toBe(true);
      });
    }
  });
});
