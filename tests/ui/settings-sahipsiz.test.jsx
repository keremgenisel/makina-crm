// @vitest-environment jsdom
// Ayarlar > Veri Yönetimi > Sahipsiz Kayıtlar: müşterisi olmayan kayıtları listeler; "Müşteriye Bağla"
// customerId/musteriId (+ tahsis) düzeltir; "Sil" çöpe taşır ve yedek parça / servis parçalarını stoğa iade eder.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, within } from "@testing-library/react";

afterEach(cleanup);
import { SettingsSahipsiz } from "../../src/components/settings/SettingsSahipsiz";

function kur() {
  const durum = {
    customers: [{ id: 1, name: "LEZZET BAHÇESİ", model: "AKF3701S", serialNo: "F0000288" }, { id: 2, name: "Başka Firma" }, { id: 3, name: "Çöpteki", deletedAt: "x" }],
    services: [{ id: 10, customerId: 999, type: "Garanti Dışı", date: "2026-07-28", servisUcreti: 1000, currency: "TRY" }, { id: 11, customerId: 1, type: "Bakım" }],
    partSales: [{ id: 20, customerId: 999, tur: "Kalıp", ad: "HAMBURGER", olcu: "Ø105", tarih: "2025-07-30", ucret: 12000, currency: "TRY" }],
    yedekParcaSatislar: [
      { id: 30, aliciTipi: "musteri", musteriId: 999, partId: "7", miktar: 1, birimFiyat: 2750, currency: "TRY", tarih: "2026-04-10", tahsisler: [{ customerId: 999, miktar: 1 }] },
      { id: 31, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 5, tahsisler: [] },
    ],
    payments: [{ id: 40, customerId: 999, tutar: 500, currency: "TRY", tarih: "2026-05-01", yontem: "Nakit" }],
    partStock: [{ partId: "7", miktar: 1 }],
    partStockLog: [{ id: 60, partId: "7", miktar: -1, tip: "bayi_satis", referansId: 30 }],
  };
  const setter = (k) => vi.fn((u) => { durum[k] = typeof u === "function" ? u(durum[k]) : u; });
  const setters = { setServices: setter("services"), setPartSales: setter("partSales"), setYedekParcaSatislar: setter("yedekParcaSatislar"), setPayments: setter("payments"), setPartStock: setter("partStock"), setPartStockLog: setter("partStockLog") };
  const utils = render(<SettingsSahipsiz
    rawCustomers={durum.customers} rawDealers={[{ id: 5, name: "Bayi" }]} rawServices={durum.services} rawPartSales={durum.partSales} rawYedekParcaSatislar={durum.yedekParcaSatislar}
    rawPayments={durum.payments} rawParts={[{ id: 7, ad: "125*1500 mm KONVEYÖR BANTI" }]} {...setters} />);
  return { durum, setters, utils };
}

describe("Sahipsiz Kayıtlar aracı", () => {
  it("yalnız müşterisi bulunmayan kayıtları türüyle listeler (bayi satışı ve sahipli kayıt yok)", () => {
    kur();
    expect(screen.getByText("Servis")).toBeTruthy();
    expect(screen.getByText("Extra Kalıp")).toBeTruthy();
    expect(screen.getByText("Yedek Parça Satışı")).toBeTruthy();
    expect(screen.getByText("Ödeme/Kapora")).toBeTruthy();
    expect(screen.getByText(/125\*1500 mm KONVEYÖR BANTI × 1/)).toBeTruthy();
    expect(screen.getAllByText("999")).toHaveLength(4);
    expect(screen.queryByText(/Bakım/)).toBeNull(); // sahipli servis listede değil
  });

  it("boş listede 'Sahipsiz kayıt yok.' der", () => {
    render(<SettingsSahipsiz rawCustomers={[{ id: 1 }]} rawServices={[{ id: 1, customerId: 1 }]} />);
    expect(screen.getByText("Sahipsiz kayıt yok.")).toBeTruthy();
  });

  it("'Müşteriye Bağla': yedek parça satışının alıcısı ve tahsisi seçilen müşteriye taşınır (çöpteki müşteri aday değil)", () => {
    const { durum } = kur();
    const satir = screen.getByText(/KONVEYÖR BANTI/).closest("tr");
    fireEvent.click(within(satir).getByText("Müşteriye Bağla"));
    expect(screen.queryByText("Çöpteki")).toBeNull();
    fireEvent.change(screen.getByPlaceholderText(/Firma adı/), { target: { value: "lezzet" } });
    expect(screen.queryByText("Başka Firma")).toBeNull();
    fireEvent.click(screen.getByText("LEZZET BAHÇESİ"));
    const s = durum.yedekParcaSatislar.find(x => x.id === 30);
    expect(s.musteriId).toBe(1);
    expect(s.tahsisler[0].customerId).toBe(1);
    expect(durum.yedekParcaSatislar.find(x => x.id === 31).dealerId).toBe(5); // dokunulmadı
    expect(screen.queryByText("Müşteriye Bağla", { selector: "h3, h2, div" })).toBeNull(); // modal kapandı
  });

  it("'Müşteriye Bağla': servis/kalıp/ödeme customerId alır", () => {
    const { durum } = kur();
    for (const metin of [/Garanti Dışı/, /HAMBURGER/, /Nakit/]) {
      fireEvent.click(within(screen.getByText(metin).closest("tr")).getByText("Müşteriye Bağla"));
      fireEvent.click(screen.getByText("LEZZET BAHÇESİ"));
    }
    expect(durum.services.find(x => x.id === 10).customerId).toBe(1);
    expect(durum.partSales[0].customerId).toBe(1);
    expect(durum.payments[0].customerId).toBe(1);
  });

  it("bayisi olmayan satış 'Yedek Parça Satışı (bayi)' olarak listelenir ve 'Bayiye Bağla' alıcı bayiyi düzeltir", () => {
    const durum = { yp: [{ id: 90, aliciTipi: "bayi", dealerId: 999, partId: "7", miktar: 4, birimFiyat: 10, currency: "TRY", tarih: "2026-06-01", tahsisler: [] }] };
    const setYedekParcaSatislar = vi.fn((u) => { durum.yp = u(durum.yp); });
    render(<SettingsSahipsiz rawCustomers={[{ id: 1, name: "Müşteri A" }]} rawDealers={[{ id: 5, name: "Ege Servis", city: "İzmir" }, { id: 6, name: "Çöpte Bayi", deletedAt: "x" }]}
      rawYedekParcaSatislar={durum.yp} rawParts={[{ id: 7, ad: "Dişli" }]} setYedekParcaSatislar={setYedekParcaSatislar} />);
    expect(screen.getByText("Yedek Parça Satışı (bayi)")).toBeTruthy();
    fireEvent.click(screen.getByText("Bayiye Bağla"));
    expect(screen.queryByText("Müşteri A")).toBeNull();   // müşteriler aday değil
    expect(screen.queryByText("Çöpte Bayi")).toBeNull();  // çöpteki bayi aday değil
    fireEvent.change(screen.getByPlaceholderText(/Bayi adı/), { target: { value: "izmir" } });
    fireEvent.click(screen.getByText("Ege Servis"));
    expect(durum.yp[0]).toMatchObject({ aliciTipi: "bayi", dealerId: 5 });
  });

  it("'Sil': yedek parça satışı çöpe taşınır ve parçası stoğa iade edilir", () => {
    const { durum } = kur();
    fireEvent.click(within(screen.getByText(/KONVEYÖR BANTI/).closest("tr")).getByText("Sil"));
    expect(screen.getByText(/stoğa iade edilecek/)).toBeTruthy();
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(durum.yedekParcaSatislar.find(x => x.id === 30).deletedAt).toBeTruthy();
    expect(durum.partStock[0].miktar).toBe(2);
    expect(durum.partStockLog.some(l => l.referansId === 30)).toBe(false);
  });
});
