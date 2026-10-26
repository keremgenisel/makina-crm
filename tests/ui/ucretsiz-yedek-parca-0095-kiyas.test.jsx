// @vitest-environment jsdom
// Spec 0095 AC-27 (plan adım 0): işaret alanı olmayan veride ekran metinleri ve dışa aktarma satırları bu işten önce ve
// sonra birebir aynıdır. "Önce" metinleri spec 0095'ten ÖNCEKİ kodla üretildi (YAZ_0095=1), tests/fixtures/0095-ekran-once.json.
// Bedelin on üç okuma yolundan (ölçüm 2) yanlış bağlanan her biri burada metin farkı olarak görünür. Düzenek 0079'unkiyle aynı.
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
import { CUSTOMERS, PAYMENTS, SERVICES, PART_SALES, YEDEK, DEALERS, PARTS, KDV, FAB } from "../fixtures/0095-veri";import { ayikla0106 } from "../fixtures/0106-ayikla";
import { ayikla0113 } from "../fixtures/0113-ayikla";


const DOSYA = "tests/fixtures/0095-ekran-once.json";
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-20T10:00:00") }); });
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

// R19: yedek parça sayfasına "Ücretsiz mi?" sütunu indis 8'e girer (Extra Kalıp'ın yerinin emsali); kıyas onu çıkarır.
const UCRETSIZ_SUTUN = 8;
const yedekSayfasiMi = (satirlar) => satirlar[0]?.[0] === "Alıcı Tipi";

describe("Spec 0095 AC-27: işaretsiz veride ekranlar birebir aynı", () => {
  it("AC-27: Finans, Anasayfa, bayi ve müşteri detayları, Müşteriler listesi, Stok › Yedek Parça ve dışa aktarma önceki kodla aynı", async () => {
    const simdi = await ekranCiktilari();
    if (process.env.YAZ_0095 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(simdi, null, 1)); return; }
    const once = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    expect(Object.keys(simdi).sort()).toEqual(Object.keys(once).sort());
    // Spec 0100 ile (plan P1): Anasayfa'nın stok kutusu bilinçli değişti ("Stoktaki Makina" → "Satışa Hazır Makina" ve alt satırı).
    // Üç Anasayfa anahtarında kutunun metni iki taraftan da ayıklanır; testin asıl iddiası (bu spec ekranı değiştirmedi) korunur.
    const stokKutusuAyikla = (k, t) => (k.startsWith("anasayfa") && typeof t === "string"
      ? t.replace(/Stoktaki Makina\d+Görmek için tıkla/, "«stok kutusu»").replace(/Satışa Hazır Makina\d+\d+ montajda · \d+ önceki partiden/, "«stok kutusu»") : t);
    // Spec 0106 ile: müşteri listesinin Durum sütunu ve pilleri, altıncı süzgeç pili ve detaydaki durum seçicileri bilinçli eklendi;
    // iki taraftan da ayıklanır (tests/fixtures/0106-ayikla.js), testin asıl iddiası korunur.
    // Spec 0113 C8: Finans'ın dört tahsil kutusu ve "Toplam Bedel" kartı iki taraftan da ayıklanır (tests/fixtures/0113-ayikla.js).
    const finansAyikla = (k, t) => (k === "finans" ? ayikla0113(t) : t);
    for (const k of Object.keys(once)) if (k !== "disaAktarma") expect(ayikla0106(stokKutusuAyikla(k, finansAyikla(k, simdi[k]))), k).toBe(ayikla0106(stokKutusuAyikla(k, finansAyikla(k, once[k]))));
    expect(ayikla0113(once.finans)).not.toBe(once.finans); // ayıklama eski altında gerçekten iş yapıyor
    expect(ayikla0113(simdi.finans)).not.toBe(simdi.finans); // ve yeni çıktıda da
    expect(Object.keys(once).filter(k => k.startsWith("anasayfa")).every(k => stokKutusuAyikla(k, once[k]) !== once[k] && stokKutusuAyikla(k, simdi[k]) !== simdi[k])).toBe(true);
    expect(Object.keys(simdi.disaAktarma).sort()).toEqual(Object.keys(once.disaAktarma).sort());
    for (const [ad, satirlar] of Object.entries(once.disaAktarma)) {
      const yeni = simdi.disaAktarma[ad];
      const ayikla = yedekSayfasiMi(yeni) ? (s) => s.filter((_, i) => i !== UCRETSIZ_SUTUN) : (s) => s;
      expect(yeni.map(ayikla), ad).toEqual(satirlar);
    }
  });
});
