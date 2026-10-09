// @vitest-environment jsdom
// Spec 0079 AC-31 (plan adım 0): tevkifatsız veride ekranlar ve dışa aktarma satırları bu işten önce ve sonra birebir
// aynıdır. "Önce" metinleri spec 0079'dan ÖNCEKİ kodla üretildi (YAZ_0079=1 ile), tests/fixtures/0079-ekran-once.json.
// Gelir zincirinin 73 çağrısı taşınırken atlanan ya da yanlış taşınan her çağrı burada metin farkı olarak görünür.
import { describe, it, expect, afterEach, beforeAll, afterAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within, act } from "@testing-library/react";
import fs from "node:fs";

const yakalanan = vi.hoisted(() => ({ satirlar: {} }));
vi.mock("../../src/components/settings/csvUtils", async (orijinal) => {
  const m = await orijinal();
  return { ...m, downloadXlsx: async (rows, ad) => { yakalanan.satirlar[ad] = JSON.parse(JSON.stringify(rows)); }, downloadCSV: () => {} };
});

import { Finance } from "../../src/components/Finance";
import { Dashboard } from "../../src/components/Dashboard";
import { SimpleDealers } from "../../src/components/SimpleDealers";
import { Customers } from "../../src/components/Customers";
import { YedekParcaSatisTab } from "../../src/components/stock/YedekParcaSatisTab";
import { SettingsExport } from "../../src/components/settings/SettingsExport";
import { CUSTOMERS, PAYMENTS, SERVICES, PART_SALES, YEDEK, DEALERS, PARTS, KDV, FAB } from "../fixtures/0079-veri";

const DOSYA = "tests/fixtures/0079-ekran-once.json";
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-09T10:00:00") }); });
afterAll(() => vi.useRealTimers());
afterEach(cleanup);

const metin = (el) => el.textContent.replace(/\s+/g, " ").trim();
const ortak = { customers: CUSTOMERS, dealers: DEALERS, services: SERVICES, partSales: PART_SALES, payments: PAYMENTS, yedekParcaSatislar: YEDEK, parts: PARTS, factory: FAB, kdvRates: KDV };

// Bugünkü veriyle ekran metinleri ve dışa aktarma satırları (veri değişmeden önce ve sonra aynı çağrı).
export const ekranCiktilari = async (v = ortak) => {
  const sonuc = {};
  const f = render(<Finance customers={v.customers} services={v.services} dealers={v.dealers} partSales={v.partSales} yedekParcaSatislar={v.yedekParcaSatislar}
    factory={v.factory} rates={{}} payments={v.payments} teklifler={[]} serverPermissions={null} kdvRates={v.kdvRates} appSettings={{ kdvRates: v.kdvRates }} />);
  fireEvent.click(screen.getByTitle("Tutarları göster"));
  sonuc.finans = metin(f.container);
  f.unmount();

  const d = render(<Dashboard customers={v.customers} dealers={v.dealers} services={v.services} stock={[]} payments={v.payments} partSales={v.partSales}
    yedekParcaSatislar={v.yedekParcaSatislar} parts={v.parts} rates={null} teklifler={[]} factory={v.factory} kdvRates={v.kdvRates} appSettings={{ kdvRates: v.kdvRates }} />);
  sonuc.anasayfa = metin(d.container);
  for (const kart of ["Borçlu Firma", "Borçlu Bayi/Servis"]) {
    const el = screen.queryAllByText(kart)[0];
    if (el) { fireEvent.click(el.closest("[role=button],button,div[style*=cursor]") || el); sonuc[`anasayfa:${kart}`] = metin(document.body); }
  }
  d.unmount(); cleanup();

  for (const dl of v.dealers) {
    const b = render(<SimpleDealers dealers={v.dealers} setDealers={vi.fn()} factory={v.factory} setFactory={vi.fn()} geoData={null} loadingGeo={false}
      parts={v.parts} yedekParcaSatislar={v.yedekParcaSatislar} setYedekParcaSatislar={vi.fn()} partSales={v.partSales} services={v.services} customers={v.customers}
      kdvRates={v.kdvRates} openDetailId={dl.id} serverPermissions={null} showToast={vi.fn()} />);
    sonuc[`bayi:${dl.id}`] = metin(document.body);
    b.unmount(); cleanup();
  }

  for (const c of v.customers) {
    const m = render(<Customers customers={v.customers} setCustomers={vi.fn()} services={v.services} partSales={v.partSales} payments={v.payments}
      yedekParcaSatislar={v.yedekParcaSatislar} dealers={v.dealers} parts={v.parts} factory={v.factory} kdvRates={v.kdvRates}
      gorusmeler={[]} dosyalar={[]} initialDetailId={c.id} />);
    sonuc[`musteri:${c.id}`] = metin(document.body);
    m.unmount(); cleanup();
  }
  const ml = render(<Customers customers={v.customers} setCustomers={vi.fn()} services={v.services} partSales={v.partSales} payments={v.payments}
    yedekParcaSatislar={v.yedekParcaSatislar} dealers={v.dealers} parts={v.parts} factory={v.factory} kdvRates={v.kdvRates} gorusmeler={[]} dosyalar={[]} />);
  sonuc.musteriListesi = metin(ml.container);
  ml.unmount();

  const y = render(<YedekParcaSatisTab yedekParcaSatislar={v.yedekParcaSatislar} setYedekParcaSatislar={vi.fn()} dealers={v.dealers} parts={v.parts}
    customers={v.customers} factory={v.factory} kdvRates={v.kdvRates} setPartStock={vi.fn()} setPartStockLog={vi.fn()} />);
  sonuc.yedekParca = metin(y.container);
  y.unmount();

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

describe("Spec 0079 AC-31: tevkifatsız veride ekranlar birebir aynı", () => {
  it("AC-31: Finans, Anasayfa, bayi ve müşteri detayları, Stok › Yedek Parça ve dışa aktarma satırları önceki kodla aynı", async () => {
    const simdi = await ekranCiktilari();
    if (process.env.YAZ_0079 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(simdi, null, 1)); return; }
    const once = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    expect(Object.keys(simdi).sort()).toEqual(Object.keys(once).sort());
    for (const k of Object.keys(once)) if (k !== "disaAktarma") expect(simdi[k], k).toBe(once[k]);
    expect(Object.keys(simdi.disaAktarma).sort()).toEqual(Object.keys(once.disaAktarma).sort());
    for (const [ad, satirlar] of Object.entries(once.disaAktarma)) {
      // R32: tevkifat sütunları satırın SONUNA eklenir; tevkifatsız kayıtta boştur, eski sütunlar birebir aynı.
      const yeni = simdi.disaAktarma[ad];
      expect(yeni.length, ad).toBe(satirlar.length);
      satirlar.forEach((s, i) => {
        expect(yeni[i].slice(0, s.length), `${ad} satır ${i}`).toEqual(s);
        if (i > 0) expect(yeni[i].slice(s.length).every(x => x === "" || x == null), `${ad} satır ${i} ek sütun`).toBe(true);
      });
    }
  });
});
