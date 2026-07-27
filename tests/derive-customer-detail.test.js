// CustomerDetailModal'dan ayrılan saf türetme (deriveCustomerDetail.js) — timeline + finans.
// Bileşen içinde büyük bir useMemo iken test edilemiyordu; ayrı saf modül olunca edilebilir.
import { describe, it, expect } from "vitest";
import { DEFAULT_KDV_RATES } from "../src/lib/constants";
import { deriveCustomerDetail } from "../src/components/customers/detail/deriveCustomerDetail.js";

const base = (over = {}) => ({
  detailView: null, services: [], partSales: [], payments: [],
  kdvRates: DEFAULT_KDV_RATES, models: [], todayStr: "2026-06-01", factoryName: "Altuntaş Makina",
  ...over,
});

describe("deriveCustomerDetail", () => {
  it("detailView yoksa boş geçmiş ve boş zaman çizelgesi döner", () => {
    const r = deriveCustomerDetail(base());
    expect(r.detailHistory).toEqual([]);
    expect(r.detailTimelineEvents).toEqual([]);
    expect(r.detailKalipSatisAdedi).toBe(0);
  });

  it("satış + servis + kalıp + ödeme + garanti olaylarını üretir ve tarihe göre sıralar", () => {
    const detailView = {
      id: 1, name: "Firma A", installDate: "2026-01-01", faturali: "Faturalı Yurtiçi",
      currency: "TRY", warrantyEnd: "2027-01-01", kaliplar: [],
    };
    const services = [{ id: 10, customerId: 1, type: "Garanti İçi", date: "2026-02-01" }];
    const partSales = [{ id: 20, customerId: 1, tur: "Kalıp", ad: "K1", tarih: "2026-03-01", ucret: 100, currency: "TRY" }];
    const payments = [{ id: 30, customerId: 1, tarih: "2026-01-15", tutar: 500, currency: "TRY", yontem: "Nakit", tahsilEdildi: true }];
    const r = deriveCustomerDetail(base({ detailView, services, partSales, payments }));

    const kinds = r.detailTimelineEvents.map(e => e.kind);
    expect(kinds).toContain("sale");
    expect(kinds).toContain("service");
    expect(kinds).toContain("part");
    expect(kinds).toContain("payment");
    expect(kinds).toContain("warranty");
    // tarihe göre artan sıra: ilk olay satış (2026-01-01)
    expect(r.detailTimelineEvents[0].kind).toBe("sale");
    expect(r.detailHistory.length).toBe(1);
    expect(r.detailKalipSatisAdedi).toBe(1);
    expect(r.detailMainCur).toBe("TRY");
    expect(r.detailModelInfo).toBeUndefined(); // models boş → find() undefined
  });

  it("başka müşterinin kayıtlarını dahil etmez", () => {
    const detailView = { id: 1, name: "A", currency: "TRY" };
    const services = [{ id: 10, customerId: 999, type: "Garanti İçi", date: "2026-02-01" }];
    const r = deriveCustomerDetail(base({ detailView, services }));
    expect(r.detailHistory.length).toBe(0);
  });

  it("yedek parça tahsisi bu makinaya bağlıysa timeline'a düşer, değilse düşmez", () => {
    const detailView = { id: 1, name: "A", currency: "TRY" };
    const dealers = [{ id: 5, name: "Bayi X" }];
    const parts = [{ id: 7, ad: "Dişli" }];
    const yedekParcaSatislar = [{
      id: 650, dealerId: 5, partId: "7", miktar: 5, tarih: "2026-04-01",
      tahsisler: [
        { miktar: 2, customerId: 1, serialNo: "SN1", tarih: "2026-04-10" }, // bu makinaya
        { miktar: 3, customerId: 999, serialNo: "SN2", tarih: "2026-04-11" }, // başka makinaya
      ],
    }];
    const r = deriveCustomerDetail(base({ detailView, yedekParcaSatislar, dealers, parts }));
    const kargo = r.detailTimelineEvents.filter(e => e.title === "Yedek Parça (Kargo)");
    expect(kargo).toHaveLength(1); // yalnız bu makinaya tahsis edilen
    expect(kargo[0].desc).toMatch(/2 adet Dişli/);
    expect(kargo[0].desc).toMatch(/bayi Bayi X/);
  });

  it("henüz tahsis edilmemiş yedek parça satışı hiçbir makinaya düşmez", () => {
    const detailView = { id: 1, name: "A", currency: "TRY" };
    const yedekParcaSatislar = [{ id: 650, dealerId: 5, partId: "7", miktar: 5, tarih: "2026-04-01", tahsisler: [] }];
    const r = deriveCustomerDetail(base({ detailView, yedekParcaSatislar }));
    expect(r.detailTimelineEvents.filter(e => e.title === "Yedek Parça (Kargo)")).toHaveLength(0);
  });

  it("müşterinin kendi yedek parça (kargo) alımı düzenlenebilir timeline olayı üretir (yp + fiyat)", () => {
    const detailView = { id: 1, name: "A", currency: "TRY" };
    const yedekParcaSatislar = [{ id: 700, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 5, birimFiyat: 100, currency: "TRY", tarih: "2026-04-01", odendi: false, tahsisler: [{ customerId: 1, miktar: 5 }] }];
    const parts = [{ id: 7, ad: "Dişli" }];
    const r = deriveCustomerDetail(base({ detailView, yedekParcaSatislar, parts }));
    const olaylar = r.detailTimelineEvents.filter(e => e.title === "Yedek Parça (Kargo)");
    expect(olaylar).toHaveLength(1); // tahsis + müşteri alımı çift olay YOK
    expect(olaylar[0].yp).toBeTruthy();
    expect(olaylar[0].yp.id).toBe(700);
    expect(olaylar[0].yp.odendi).toBe(false); // toggle bu değeri kullanır
    expect(olaylar[0].desc).toMatch(/5 adet Dişli/);
  });

  it("bayi alımından tahsis edilen yedek parça olayı salt-okunur (yp yok)", () => {
    const detailView = { id: 1, name: "A", currency: "TRY" };
    const yedekParcaSatislar = [{ id: 650, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 5, tarih: "2026-04-01", tahsisler: [{ customerId: 1, miktar: 5 }] }];
    const r = deriveCustomerDetail(base({ detailView, yedekParcaSatislar, dealers: [{ id: 5, name: "Bayi X" }] }));
    const olaylar = r.detailTimelineEvents.filter(e => e.title === "Yedek Parça (Kargo)");
    expect(olaylar).toHaveLength(1);
    expect(olaylar[0].yp).toBeUndefined();
  });

  it("müşteriye yapılan ödenmemiş yedek parça (kargo) satışı borca eklenir (KDV dahil)", () => {
    const detailView = { id: 1, name: "A", currency: "TRY" };
    // 3 × 100 = 300 net; Faturalı Yurtiçi KDV %20 → 60; toplam 360
    const yedekParcaSatislar = [
      { id: 700, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 3, birimFiyat: 100, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-04-01", odendi: false, tahsisler: [] },
      { id: 701, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 2, birimFiyat: 50, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-04-02", odendi: true, tahsisler: [] }, // ödendi → borç değil
      { id: 702, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 1, birimFiyat: 999, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-04-03", odendi: false, tahsisler: [] }, // bayi alıcı → müşteri borcu değil
    ];
    const r = deriveCustomerDetail(base({ detailView, yedekParcaSatislar }));
    expect(r.detailEkBorcAyniPB).toBe(360);
    expect(r.detailKalanBorcToplam).toBe(360);
  });
});
