// @vitest-environment jsdom
// Bayi silme kaskadı: bayi Çöp Kutusu'na taşınınca alıcısı o bayi olan yedek parça satışları (stok
// iadesiyle) ve bayi dosyaları AYNI damgayla çöpe gitmeli; müşteri/dış firma alımı ve başka bayinin
// kayıtları dokunulmamalı. Onay penceresi bağlı kayıt sayısını ve ödenmemiş satışların alacağını söylemeli.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, within } from "@testing-library/react";

afterEach(cleanup);
import { SimpleDealers } from "../../src/components/SimpleDealers";

const B = 5;
function kur() {
  const durum = {
    dealers: [{ id: B, name: "Bayi X", bayiMi: true, country: "Türkiye", city: "Bursa" }, { id: 6, name: "Bayi Y", bayiMi: true }],
    yedekParcaSatislar: [
      { id: 700, aliciTipi: "bayi", dealerId: B, partId: "7", miktar: 2, birimFiyat: 150, currency: "TRY", tarih: "2026-07-01", odendi: false, tahsisler: [{ customerId: 1, miktar: 1 }] },
      { id: 701, aliciTipi: "bayi", dealerId: B, partId: "7", miktar: 1, birimFiyat: 100, currency: "TRY", tarih: "2026-07-02", odendi: true, tahsisler: [] },
      { id: 702, aliciTipi: "bayi", dealerId: 6, partId: "7", miktar: 3, birimFiyat: 1, currency: "TRY", tarih: "2026-07-03", odendi: false, tahsisler: [] },
      { id: 703, aliciTipi: "musteri", musteriId: 1, dealerId: B, partId: "7", miktar: 1, birimFiyat: 1, currency: "TRY", tarih: "2026-07-04", odendi: false, tahsisler: [] },
      { id: 704, disFirma: true, disFirmaAd: "Dış Servis", dealerId: B, partId: "7", miktar: 1, birimFiyat: 1, currency: "TRY", tarih: "2026-07-05", odendi: false, tahsisler: [] }, // dış firma → kalır
      { id: 705, dealerId: B, partId: "7", miktar: 1, birimFiyat: 30, currency: "USD", tarih: "2026-07-06", odendi: false, tahsisler: [] },                   // aliciTipi'siz eski kayıt → bayi
      { id: 706, aliciTipi: "bayi", dealerId: B, partId: "7", miktar: 1, birimFiyat: 1, currency: "TRY", tarih: "2026-07-07", odendi: true, deletedAt: "eski", tahsisler: [] }, // zaten çöpte
    ],
    dosyalar: [{ id: 800, dealerId: B, ad: "sozlesme.pdf", dosyaAdi: "s.pdf" }, { id: 801, dealerId: 6, ad: "y.pdf", dosyaAdi: "y.pdf" }, { id: 802, customerId: 1, ad: "m.pdf", dosyaAdi: "m.pdf" }],
    partStock: [{ partId: "7", miktar: 1 }],
    partStockLog: [
      { id: 60, partId: "7", miktar: -2, tip: "bayi_satis", referansId: 700 },
      { id: 61, partId: "7", miktar: -1, tip: "bayi_satis", referansId: 701 },
      { id: 62, partId: "7", miktar: -3, tip: "bayi_satis", referansId: 702 },
    ],
  };
  const setter = (k) => vi.fn((u) => { durum[k] = typeof u === "function" ? u(durum[k]) : u; });
  render(<SimpleDealers
    dealers={durum.dealers} setDealers={setter("dealers")} factory={{ name: "Altuntaş Makina" }} setFactory={vi.fn()}
    geoData={null} loadingGeo={false} parts={[{ id: 7, ad: "Dişli" }]}
    yedekParcaSatislar={durum.yedekParcaSatislar} setYedekParcaSatislar={setter("yedekParcaSatislar")}
    dosyalar={durum.dosyalar} setDosyalar={setter("dosyalar")}
    partStock={durum.partStock} setPartStock={setter("partStock")} setPartStockLog={setter("partStockLog")}
    serverPermissions={null} showToast={vi.fn()} />);
  return durum;
}

const silDugmesineBas = () => {
  const satir = screen.getByText("Bayi X").closest("tr");
  const dugmeler = within(satir).getAllByRole("button");
  fireEvent.click(dugmeler[dugmeler.length - 1]); // sondaki = çöp kutusu düğmesi
};

describe("Bayi silme kaskadı", () => {
  it("onay penceresi bağlı kayıt sayılarını ve ödenmemiş satış alacağını söyler", () => {
    kur();
    silDugmesineBas();
    const metin = screen.getByText(/bayisi Çöp Kutusu'na taşınacak/).textContent;
    expect(metin).toContain("Birlikte taşınacak: 3 yedek parça satışı, 1 dosya."); // 700, 701, 705 (dış firma 704 ve çöpteki 706 sayılmaz)
    expect(metin).toContain("2 ödenmemiş satışın ₺300 + $30 tutarındaki alacağı da listeden düşer"); // para birimi bazında
  });

  it("silince bayinin satışları + dosyası aynı damgayla çöpe gider, stok iade edilir; diğer kayıtlar kalır", () => {
    const durum = kur();
    silDugmesineBas();
    fireEvent.click(screen.getByText("Evet, Sil"));
    const ts = durum.dealers.find(d => d.id === B).deletedAt;
    expect(ts).toBeTruthy();
    expect(durum.yedekParcaSatislar.find(s => s.id === 700).deletedAt).toBe(ts);
    expect(durum.yedekParcaSatislar.find(s => s.id === 701).deletedAt).toBe(ts);
    expect(durum.yedekParcaSatislar.find(s => s.id === 702).deletedAt).toBeUndefined(); // başka bayi
    expect(durum.yedekParcaSatislar.find(s => s.id === 703).deletedAt).toBeUndefined(); // müşteri alımı
    expect(durum.yedekParcaSatislar.find(s => s.id === 704).deletedAt).toBeUndefined(); // dış firma alımı
    expect(durum.yedekParcaSatislar.find(s => s.id === 705).deletedAt).toBe(ts);        // eski kayıt (aliciTipi yok)
    expect(durum.yedekParcaSatislar.find(s => s.id === 706).deletedAt).toBe("eski");    // kendi damgasıyla kalır
    expect(durum.dosyalar.find(d => d.id === 800).deletedAt).toBe(ts);
    expect(durum.dosyalar.find(d => d.id === 801).deletedAt).toBeUndefined();
    expect(durum.dosyalar.find(d => d.id === 802).deletedAt).toBeUndefined();
    // stok: 1 + 2 + 1 = 4; başka bayinin hareketi (702) kalır
    expect(durum.partStock.find(s => s.partId === "7").miktar).toBe(4);
    expect(durum.partStockLog.map(l => l.referansId)).toEqual([702]);
  });

  it("bağlı kayıt yoksa 'Bağlı kayıt yok' der", () => {
    render(<SimpleDealers dealers={[{ id: 1, name: "Yalnız Bayi", bayiMi: true }]} setDealers={vi.fn()} factory={{ name: "A" }} setFactory={vi.fn()} geoData={null} loadingGeo={false} showToast={vi.fn()} />);
    const satir = screen.getByText("Yalnız Bayi").closest("tr");
    const dugmeler = within(satir).getAllByRole("button");
    fireEvent.click(dugmeler[dugmeler.length - 1]);
    expect(screen.getByText(/bayisi Çöp Kutusu'na taşınacak/).textContent).toContain("Bağlı kayıt yok.");
  });
});
