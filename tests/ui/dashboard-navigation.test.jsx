// @vitest-environment jsdom
// Anasayfa "Son Satışlar / Son Servisler" satırları menü aramasıyla AYNI davranmalı: tıklayınca
// ilgili kayda gider — servis/kalıp müşteri detayında highlight (odak), yedek parça Stok'taki satışa.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(cleanup);
import { Dashboard } from "../../src/components/Dashboard";

const ortak = { dealers: [], stock: [], payments: [], rates: null, teklifler: [] };

describe("Borçlu Firmalar / Bayi modalı — tip pili + highlight", () => {
  it("Borçlu Firmalar: borçlu servise tıklayınca servis odağıyla gider (+ yöntem pili)", () => {
    const onGoCustomerDetail = vi.fn();
    const customers = [{ id: 1, name: "Test Müşteri" }];
    const services = [{ id: 10, customerId: 1, type: "Garanti Dışı", date: "2026-08-12", servisUcreti: 1000, currency: "TRY", odendi: false, yontem: "Nakit", faturaTipi: "Faturalı Yurtiçi" }];
    render(<Dashboard {...ortak} customers={customers} services={services} partSales={[]} yedekParcaSatislar={[]} onGoCustomerDetail={onGoCustomerDetail} />);
    fireEvent.click(screen.getByText("Borçlu Firma"));   // StatCard → modal aç
    fireEvent.click(screen.getByText("Nakit"));           // yöntem pili yalnız modal servis satırında
    expect(onGoCustomerDetail).toHaveBeenCalledWith(1, { servisId: 10 });
  });

  it("Borçlu Firmalar müşteri: çek kalemi tutarla gösterilir ve tıklayınca ödeme odağıyla gider", () => {
    const onGoCustomerDetail = vi.fn();
    const customers = [{ id: 1, name: "Test Müşteri", kalanBorc: 10000, currency: "TRY" }];
    const payments = [{ id: 50, customerId: 1, yontem: "Çek", tahsilEdildi: false, tutar: 5000, currency: "TRY", vadeTarihi: "2099-09-01" }];
    render(<Dashboard {...ortak} customers={customers} services={[]} partSales={[]} yedekParcaSatislar={[]} payments={payments} onGoCustomerDetail={onGoCustomerDetail} />);
    fireEvent.click(screen.getByText("Borçlu Firma"));       // modal aç
    const pil = screen.getByText(/^Çek: /);                   // tutarlı çek pili (Beklenen'deki "Çek" değil)
    expect(pil).toBeTruthy();
    fireEvent.click(pil);
    expect(onGoCustomerDetail).toHaveBeenCalledWith(1, { odemeId: 50 });
  });

  it("Borçlu Firmalar müşteri: taksit kalemi tıklayınca taksit odağıyla gider", () => {
    const onGoCustomerDetail = vi.fn();
    const customers = [{ id: 1, name: "Test Müşteri", kalanBorc: 10000, currency: "TRY", odemePlani: [{ id: 77, vadeTarihi: "2099-09-01", tutar: 3000 }] }];
    render(<Dashboard {...ortak} customers={customers} services={[]} partSales={[]} yedekParcaSatislar={[]} onGoCustomerDetail={onGoCustomerDetail} />);
    fireEvent.click(screen.getByText("Borçlu Firma"));
    fireEvent.click(screen.getByText(/^Taksit: /));
    expect(onGoCustomerDetail).toHaveBeenCalledWith(1, { taksitId: 77 });
  });

  it("Borçlu Firmalar müşteri: kredi kartı kalemi TUTARLA gösterilir ve tıklayınca ödeme odağıyla gider", () => {
    const onGoCustomerDetail = vi.fn();
    const gelecek = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const customers = [{ id: 1, name: "Test Müşteri", kalanBorc: 10000, currency: "TRY" }];
    const payments = [{ id: 60, customerId: 1, yontem: "Kredi Kartı", tutar: 8000, currency: "TRY", kartKomisyonu: { blokajGun: 40, hesabaGecis: gelecek, toplamKesinti: 200, netTutar: 7800 } }];
    render(<Dashboard {...ortak} customers={customers} services={[]} partSales={[]} yedekParcaSatislar={[]} payments={payments} onGoCustomerDetail={onGoCustomerDetail} />);
    fireEvent.click(screen.getByText("Borçlu Firma"));
    const pil = screen.getByText(/^Kredi Kartı: /);          // tutar yazılı (ücret görünüyor)
    expect(pil).toBeTruthy();
    fireEvent.click(pil);
    expect(onGoCustomerDetail).toHaveBeenCalledWith(1, { odemeId: 60 });
  });

  it("Borçlu Firmalar: borçlu Extra Kalıp'a tıklayınca kalıp odağıyla gider", () => {
    const onGoCustomerDetail = vi.fn();
    const customers = [{ id: 1, name: "Test Müşteri" }];
    const partSales = [{ id: 20, tur: "Kalıp", customerId: 1, ad: "K1", ucret: 1000, currency: "TRY", odendi: false, yontem: "Nakit", tarih: "2026-08-12" }];
    render(<Dashboard {...ortak} customers={customers} services={[]} partSales={partSales} yedekParcaSatislar={[]} onGoCustomerDetail={onGoCustomerDetail} />);
    fireEvent.click(screen.getByText("Borçlu Firma"));
    fireEvent.click(screen.getByText("Nakit"));
    expect(onGoCustomerDetail).toHaveBeenCalledWith(1, { kalipId: 20 });
  });
});

describe("Anasayfa kutuları boş olsa da görünür", () => {
  it("tüm veri boşken 6 kutu da başlığı + boş mesajıyla render olur", () => {
    render(<Dashboard {...ortak} customers={[]} services={[]} partSales={[]} yedekParcaSatislar={[]} gorusmeler={[]} onGoCustomerDetail={vi.fn()} />);
    expect(screen.getByText("Son Satışlar")).toBeTruthy();
    expect(screen.getByText("Son Servis Talepleri")).toBeTruthy();
    expect(screen.getByText(/İşlem Bekleyen Onaylı Teklifler/)).toBeTruthy();
    expect(screen.getByText(/Takip Edilecek Teklifler/)).toBeTruthy();
    expect(screen.getByText(/Aranacaklar/)).toBeTruthy();
    expect(screen.getByText(/Beklenen Tahsilat/)).toBeTruthy();
    // boş mesajları
    expect(screen.getByText("İşlem bekleyen onaylı teklif yok.")).toBeTruthy();
    expect(screen.getByText("Bekleyen tahsilat yok.")).toBeTruthy();
  });
});

describe("İşlem Bekleyen Onaylı Teklifler — tıklayınca teklif açılır (highlight)", () => {
  it("satıra tıklayınca onOpenTeklif(id) çağrılır", () => {
    const onOpenTeklif = vi.fn();
    // Onaylı + dönüştürülmemiş teklif → İşlem Bekleyen kutusunda çıkar
    const teklifler = [{ id: 7, type: "teklif", durum: "onaylandi", firma: "Onaylı Firma", no: "T-7", tarih: "2026-08-01" }];
    render(<Dashboard {...ortak} teklifler={teklifler} customers={[]} services={[]} partSales={[]} yedekParcaSatislar={[]} onGoCustomerDetail={vi.fn()} onOpenTeklif={onOpenTeklif} />);
    fireEvent.click(screen.getByText("Onaylı Firma"));
    expect(onOpenTeklif).toHaveBeenCalledWith(7);
  });
});

describe("Son Servis Talepleri — fabrika rozeti", () => {
  it("parça satılmasa bile fabrika servisinde 'Fabrika' rozeti gösterilir", () => {
    const customers = [{ id: 1, name: "Firma A" }];
    const services = [{ id: 10, customerId: 1, type: "Periyodik Bakım", date: "2026-08-12" }]; // parçasız, islemFirma yok = fabrika
    render(<Dashboard {...ortak} customers={customers} services={services} partSales={[]} yedekParcaSatislar={[]} onGoCustomerDetail={vi.fn()} />);
    // Lejantta da "Fabrika" var → en az 2 kez (lejant + servis rozeti)
    expect(screen.getAllByText("Fabrika").length).toBeGreaterThanOrEqual(2);
  });

  it("'Diğer' (anlaşmasız dış) serviste 'Dış Servis' rozeti gösterilir", () => {
    const customers = [{ id: 1, name: "Firma A" }];
    const services = [{ id: 11, customerId: 1, type: "Garanti Dışı", date: "2026-08-12", islemFirma: "Diğer", islemFirmaAd: "Harici" }];
    render(<Dashboard {...ortak} customers={customers} services={services} partSales={[]} yedekParcaSatislar={[]} onGoCustomerDetail={vi.fn()} />);
    expect(screen.getAllByText("Dış Servis").length).toBeGreaterThanOrEqual(2);
  });
});

describe("Anasayfa navigasyonu (arama gibi)", () => {
  it("Son Servisler: servise tıklayınca müşteri detayına servis odağıyla gider", () => {
    const onGoCustomerDetail = vi.fn();
    const customers = [{ id: 1, name: "Servis Firması" }];
    const services = [{ id: 10, customerId: 1, type: "Periyodik Bakım", date: "2026-08-12" }];
    render(<Dashboard {...ortak} customers={customers} services={services} partSales={[]} yedekParcaSatislar={[]} onGoCustomerDetail={onGoCustomerDetail} />);
    fireEvent.click(screen.getByText("Periyodik Bakım"));
    expect(onGoCustomerDetail).toHaveBeenCalledWith(1, { servisId: 10 });
  });

  it("Son Satışlar: Extra Kalıp'a tıklayınca müşteri detayına kalıp odağıyla gider", () => {
    const onGoCustomerDetail = vi.fn();
    const customers = [{ id: 1, name: "Kalıp Firması" }];
    const partSales = [{ id: 20, tur: "Kalıp", customerId: 1, ad: "Simit Kalıbı", tarih: "2026-08-12", ucret: 100, currency: "TRY" }];
    render(<Dashboard {...ortak} customers={customers} services={[]} partSales={partSales} yedekParcaSatislar={[]} onGoCustomerDetail={onGoCustomerDetail} />);
    fireEvent.click(screen.getByText(/Simit Kalıbı/));
    expect(onGoCustomerDetail).toHaveBeenCalledWith(1, { kalipId: 20 });
  });

  it("Aranacaklar: görüşmeye tıklayınca müşteri detayına görüşme odağıyla gider", () => {
    const onGoCustomerDetail = vi.fn();
    const customers = [{ id: 1, name: "Aranacak Firma" }];
    const gorusmeler = [{ id: 50, customerId: 1, takipTarihi: "2020-01-01", tamamlandi: false, not: "geri ara lütfen", tur: "Gelen Arama", tarih: "2020-01-01" }];
    render(<Dashboard {...ortak} customers={customers} services={[]} partSales={[]} yedekParcaSatislar={[]} gorusmeler={gorusmeler} setGorusmeler={vi.fn()} onGoCustomerDetail={onGoCustomerDetail} />);
    fireEvent.click(screen.getByText(/geri ara lütfen/));
    expect(onGoCustomerDetail).toHaveBeenCalledWith(1, { gorusmeId: 50 });
  });

  it("Beklenen Tahsilat: servis çekine tıklayınca müşteri detayına servis odağıyla gider", () => {
    const onGoCustomerDetail = vi.fn();
    const customers = [{ id: 1, name: "Çek Firması" }];
    const services = [{ id: 10, customerId: 1, type: "Garanti Dışı", date: "2026-08-12", yontem: "Çek", tahsilEdildi: false, servisUcreti: 1000, faturaTipi: "Faturalı Yurtiçi", vadeTarihi: "2026-09-01" }];
    render(<Dashboard {...ortak} customers={customers} services={services} partSales={[]} yedekParcaSatislar={[]} kdvRates={[]} onGoCustomerDetail={onGoCustomerDetail} />);
    fireEvent.click(screen.getByText("Çek")); // Beklenen Tahsilat'taki tip rozeti
    expect(onGoCustomerDetail).toHaveBeenCalledWith(1, { servisId: 10 });
  });

  it("Beklenen Tahsilat: Extra Kalıp çekine tıklayınca kalıp odağıyla gider", () => {
    const onGoCustomerDetail = vi.fn();
    const customers = [{ id: 1, name: "Kalıp Çek" }];
    const partSales = [{ id: 20, tur: "Kalıp", customerId: 1, ad: "K1", tarih: "2026-08-12", ucret: 1000, currency: "TRY", yontem: "Çek", tahsilEdildi: false, faturaTipi: "Faturalı Yurtiçi", vadeTarihi: "2026-09-01" }];
    render(<Dashboard {...ortak} customers={customers} services={[]} partSales={partSales} yedekParcaSatislar={[]} kdvRates={[]} onGoCustomerDetail={onGoCustomerDetail} />);
    fireEvent.click(screen.getByText("Çek"));
    expect(onGoCustomerDetail).toHaveBeenCalledWith(1, { kalipId: 20 });
  });

  it("Beklenen Tahsilat: taksite tıklayınca müşteri detayına taksit odağıyla gider (çek/KK gibi)", () => {
    const onGoCustomerDetail = vi.fn();
    const customers = [{ id: 1, name: "Taksit Firması", currency: "TRY", odemePlani: [{ id: 99, vadeTarihi: "2026-09-01", tutar: 1000 }] }];
    render(<Dashboard {...ortak} customers={customers} services={[]} partSales={[]} yedekParcaSatislar={[]} onGoCustomerDetail={onGoCustomerDetail} />);
    fireEvent.click(screen.getByText("Taksit")); // Beklenen Tahsilat tip rozeti
    expect(onGoCustomerDetail).toHaveBeenCalledWith(1, { taksitId: 99 });
  });

  it("Beklenen Tahsilat: yedek parça çekine tıklayınca Stok'taki satışa gider", () => {
    const onGoYedekParca = vi.fn();
    const parts = [{ id: 7, ad: "Dişli" }];
    const dealers = [{ id: 5, name: "Bayi X" }];
    const yedekParcaSatislar = [{ id: 30, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 2, birimFiyat: 100, currency: "TRY", tarih: "2026-08-12", yontem: "Çek", tahsilEdildi: false, faturaTipi: "Faturalı Yurtiçi", vadeTarihi: "2026-09-01" }];
    render(<Dashboard {...ortak} dealers={dealers} customers={[]} services={[]} partSales={[]} parts={parts} yedekParcaSatislar={yedekParcaSatislar} kdvRates={[]} onGoCustomerDetail={vi.fn()} onGoYedekParca={onGoYedekParca} />);
    fireEvent.click(screen.getByText("Çek"));
    expect(onGoYedekParca).toHaveBeenCalledWith(30);
  });

  it("Son Satışlar: yedek parçaya tıklayınca Stok'taki satışa gider (onGoYedekParca)", () => {
    const onGoYedekParca = vi.fn();
    const parts = [{ id: 7, ad: "Dişli" }];
    const yedekParcaSatislar = [{ id: 30, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 2, birimFiyat: 100, tarih: "2026-08-12", currency: "TRY" }];
    const dealers = [{ id: 5, name: "Bayi X" }];
    render(<Dashboard {...ortak} dealers={dealers} customers={[]} services={[]} partSales={[]} parts={parts} yedekParcaSatislar={yedekParcaSatislar} onGoCustomerDetail={vi.fn()} onGoYedekParca={onGoYedekParca} />);
    fireEvent.click(screen.getByText(/Dişli/));
    expect(onGoYedekParca).toHaveBeenCalledWith(30);
  });
});
