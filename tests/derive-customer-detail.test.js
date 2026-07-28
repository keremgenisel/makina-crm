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
    const tahsis = r.detailTimelineEvents.filter(e => e.title?.startsWith("Yedek Parça"));
    expect(tahsis).toHaveLength(1); // yalnız bu makinaya tahsis edilen
    expect(tahsis[0].title).toBe("Yedek Parça (Bayi)"); // alıcı türü parantezde; Kargo/Fabrika Teslim yok
    expect(tahsis[0].title).not.toMatch(/Kargo|Fabrika Teslim/);
    expect(tahsis[0].desc).toMatch(/2 adet Dişli/);
    expect(tahsis[0].desc).toMatch(/Bayi X tarafından tahsis edildi/);
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

  it("toplu satış (aynı batchId) makina geçmişinde TEK olayda toplanır (ypGrup)", () => {
    const detailView = { id: 1, name: "A", currency: "TRY" };
    const parts = [{ id: 7, ad: "Dişli" }, { id: 8, ad: "Piston" }];
    const yedekParcaSatislar = [
      { id: 900, batchId: 555, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 3, birimFiyat: 100, currency: "TRY", tarih: "2026-04-01", odendi: false, tahsisler: [] },
      { id: 901, batchId: 555, aliciTipi: "musteri", musteriId: 1, partId: "8", miktar: 2, birimFiyat: 50, currency: "TRY", tarih: "2026-04-01", odendi: false, tahsisler: [] },
    ];
    const r = deriveCustomerDetail(base({ detailView, yedekParcaSatislar, parts }));
    const olaylar = r.detailTimelineEvents.filter(e => e.title === "Yedek Parça (Kargo)");
    expect(olaylar).toHaveLength(1);              // 2 kayıt → tek olay
    expect(olaylar[0].ypGrup).toHaveLength(2);
    expect(olaylar[0].desc).toMatch(/Dişli/);
    expect(olaylar[0].desc).toMatch(/Piston/);
  });

  it("Kalıp Verildi başlığı teslim türünü içerir (panodaysa Fabrika Teslim / Kargo, değilse suffix yok)", () => {
    const detailView = { id: 1, name: "A", currency: "TRY" };
    const fab = [{ id: 20, customerId: 1, tur: "Kalıp", ad: "K", tarih: "2026-03-01", ucret: 100, currency: "TRY", kargoDurum: "Hazırlanıyor", fabrikaTeslim: true }];
    const kargo = [{ id: 21, customerId: 1, tur: "Kalıp", ad: "K", tarih: "2026-03-02", ucret: 100, currency: "TRY", kargoDurum: "Hazırlanıyor", fabrikaTeslim: false }];
    const yok = [{ id: 22, customerId: 1, tur: "Kalıp", ad: "K", tarih: "2026-03-03", ucret: 100, currency: "TRY" }]; // panoda değil
    expect(deriveCustomerDetail(base({ detailView, partSales: fab })).detailTimelineEvents.find(e => e.psList)?.title).toBe("Kalıp Verildi (Fabrika Teslim)");
    expect(deriveCustomerDetail(base({ detailView, partSales: kargo })).detailTimelineEvents.find(e => e.psList)?.title).toBe("Kalıp Verildi (Kargo)");
    expect(deriveCustomerDetail(base({ detailView, partSales: yok })).detailTimelineEvents.find(e => e.psList)?.title).toBe("Kalıp Verildi");
  });

  it("fabrikaTeslim satış makina geçmişinde 'Yedek Parça (Fabrika Teslim)' başlığıyla görünür", () => {
    const detailView = { id: 1, name: "A", currency: "TRY" };
    const parts = [{ id: 7, ad: "Dişli" }];
    const fab = [{ id: 900, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 3, birimFiyat: 100, currency: "TRY", tarih: "2026-04-01", odendi: false, fabrikaTeslim: true, tahsisler: [] }];
    const kargo = [{ id: 901, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 2, birimFiyat: 100, currency: "TRY", tarih: "2026-04-02", odendi: false, fabrikaTeslim: false, tahsisler: [] }];
    const rf = deriveCustomerDetail(base({ detailView, yedekParcaSatislar: fab, parts }));
    expect(rf.detailTimelineEvents.find(e => e.yp)?.title).toBe("Yedek Parça (Fabrika Teslim)");
    const rk = deriveCustomerDetail(base({ detailView, yedekParcaSatislar: kargo, parts }));
    expect(rk.detailTimelineEvents.find(e => e.yp)?.title).toBe("Yedek Parça (Kargo)");
  });

  it("bayi alımından tahsis edilen yedek parça olayı salt-okunur (yp yok) + kim tahsis etti", () => {
    const detailView = { id: 1, name: "A", currency: "TRY" };
    const yedekParcaSatislar = [{ id: 650, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 5, tarih: "2026-04-01", tahsisler: [{ customerId: 1, miktar: 5 }] }];
    const r = deriveCustomerDetail(base({ detailView, yedekParcaSatislar, dealers: [{ id: 5, name: "Bayi X" }] }));
    const olaylar = r.detailTimelineEvents.filter(e => e.title?.startsWith("Yedek Parça"));
    expect(olaylar).toHaveLength(1);
    expect(olaylar[0].title).toBe("Yedek Parça (Bayi)");
    expect(olaylar[0].yp).toBeUndefined();       // salt-okunur (düzenlenemez)
    expect(olaylar[0].desc).toMatch(/Bayi X tarafından tahsis edildi/);
  });

  it("anlaşmasız dış firma alımından tahsiste başlık 'Yedek Parça (Anlaşmasız Servis)' + kim tahsis etti", () => {
    const detailView = { id: 1, name: "A", currency: "TRY" };
    const yedekParcaSatislar = [{ id: 651, aliciTipi: "bayi", disFirma: true, disFirmaAd: "X Servis", dealerId: null, partId: "7", miktar: 3, tarih: "2026-04-02", tahsisler: [{ customerId: 1, miktar: 3 }] }];
    const r = deriveCustomerDetail(base({ detailView, yedekParcaSatislar, parts: [{ id: 7, ad: "Dişli" }] }));
    const olaylar = r.detailTimelineEvents.filter(e => e.title?.startsWith("Yedek Parça"));
    expect(olaylar).toHaveLength(1);
    expect(olaylar[0].title).toBe("Yedek Parça (Anlaşmasız Servis)");
    expect(olaylar[0].desc).toMatch(/X Servis tarafından tahsis edildi/);
  });

  it("aynı batch'ten birden çok parça bu makinaya tahsis edilince TEK olayda toplanır ('N kalem')", () => {
    const detailView = { id: 1, name: "A", currency: "TRY" };
    const parts = [{ id: 7, ad: "Dişli" }, { id: 8, ad: "Piston" }];
    const yedekParcaSatislar = [
      { id: 900, batchId: 555, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 5, tarih: "2026-04-01", tahsisler: [{ customerId: 1, miktar: 2, tarih: "2026-04-05" }] },
      { id: 901, batchId: 555, aliciTipi: "bayi", dealerId: 5, partId: "8", miktar: 4, tarih: "2026-04-01", tahsisler: [{ customerId: 1, miktar: 3, tarih: "2026-04-06" }] },
    ];
    const r = deriveCustomerDetail(base({ detailView, yedekParcaSatislar, parts, dealers: [{ id: 5, name: "Bayi X" }] }));
    const olaylar = r.detailTimelineEvents.filter(e => e.title?.startsWith("Yedek Parça"));
    expect(olaylar).toHaveLength(1);                       // 2 kayıt → tek olay
    expect(olaylar[0].title).toBe("Yedek Parça (Bayi) · 2 kalem");
    expect(olaylar[0].desc).toMatch(/2 adet Dişli/);
    expect(olaylar[0].desc).toMatch(/3 adet Piston/);
    expect(olaylar[0].desc).toMatch(/Bayi X tarafından tahsis edildi/);
  });

  it("aynı satıştan (parça) taksitli iki tahsis toplanır (5 adet), kalem tek → '· N kalem' yok", () => {
    const detailView = { id: 1, name: "A", currency: "TRY" };
    const yedekParcaSatislar = [{ id: 902, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 5, tarih: "2026-04-01", tahsisler: [
      { customerId: 1, miktar: 2, tarih: "2026-04-05" }, { customerId: 1, miktar: 3, tarih: "2026-04-08" },
    ] }];
    const r = deriveCustomerDetail(base({ detailView, yedekParcaSatislar, parts: [{ id: 7, ad: "Dişli" }], dealers: [{ id: 5, name: "Bayi X" }] }));
    const olaylar = r.detailTimelineEvents.filter(e => e.title?.startsWith("Yedek Parça"));
    expect(olaylar).toHaveLength(1);
    expect(olaylar[0].title).toBe("Yedek Parça (Bayi)");   // tek kalem → kalem eki yok
    expect(olaylar[0].desc).toMatch(/5 adet Dişli/);       // 2 + 3 birleşti
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
