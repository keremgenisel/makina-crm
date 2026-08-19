// CustomerDetailModal'dan ayrılan saf türetme (deriveCustomerDetail.js) — timeline + finans.
// Bileşen içinde büyük bir useMemo iken test edilemiyordu; ayrı saf modül olunca edilebilir.
import { describe, it, expect } from "vitest";
import { DEFAULT_KDV_RATES } from "../src/lib/constants";
import { fmtCur } from "../src/lib/utils";
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

  it("kredi kartı komisyonu müşteriye yansıtılmış makina ödemesinde üçlü kırılım gösterir", () => {
    const detailView = { id: 1, name: "Firma A", installDate: "2026-01-01", faturali: "Faturalı Yurtiçi", currency: "TRY", kaliplar: [] };
    // Makina KK ödemesi: saklanan tutar = mal + KDV (borca sayılan); komisyon = kartKomisyonu.toplamKesinti; çekilen kart = tutar + komisyon
    const payments = [{ id: 30, customerId: 1, tarih: "2026-02-01", tutar: 122117, currency: "TRY", yontem: "Kredi Kartı",
      kartKomisyonu: { toplamKesinti: 8000, yansitildi: true } }];
    const r = deriveCustomerDetail(base({ detailView, payments }));
    const odeme = r.detailTimelineEvents.find(e => e.kind === "payment");
    expect(odeme.desc).toContain("Ödeme:");
    expect(odeme.desc).toContain("Komisyon:");
    expect(odeme.desc).toContain("Çekilen kart:");
    expect(odeme.desc).not.toMatch(/^₺122\.117 · Kredi Kartı/); // eski düz "tutar · yöntem" değil
  });

  it("yansıt olmayan (nakit/normal) ödemede eski düz tutar gösterimi korunur", () => {
    const detailView = { id: 1, name: "Firma A", installDate: "2026-01-01", faturali: "Faturalı Yurtiçi", currency: "TRY", kaliplar: [] };
    const payments = [{ id: 31, customerId: 1, tarih: "2026-02-01", tutar: 5000, currency: "TRY", yontem: "Nakit" }];
    const r = deriveCustomerDetail(base({ detailView, payments }));
    const odeme = r.detailTimelineEvents.find(e => e.kind === "payment");
    expect(odeme.desc).not.toContain("Çekilen kart:");
    expect(odeme.desc).not.toContain("Nakit"); // yöntem artık pil (badge) olarak gösterilir, desc'te değil
    expect(odeme.payment.yontem).toBe("Nakit");
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
    expect(tahsis[0].ypTahsisId).toBe(650); // tıklayınca Stok'taki bu satışa gidilsin
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

  it("Kalıp Verildi başlığı teslim türünü içerir (kural b: Fabrika Teslim hep; Kargo panoda/bilgi varsa; eski düz kayıt temiz)", () => {
    const detailView = { id: 1, name: "A", currency: "TRY" };
    const baslik = (partSales) => deriveCustomerDetail(base({ detailView, partSales })).detailTimelineEvents.find(e => e.psList)?.title;
    const k = (extra) => [{ id: 20, customerId: 1, tur: "Kalıp", ad: "K", tarih: "2026-03-01", ucret: 100, currency: "TRY", ...extra }];
    // Fabrika Teslim panoya düşmese de gösterilir (teslim şekli panodan ayrı kaydedildi).
    expect(baslik(k({ fabrikaTeslim: true, kargoDurum: "Hazırlanıyor" }))).toBe("Kalıp Verildi (Fabrika Teslim)");
    expect(baslik(k({ fabrikaTeslim: true, kargoDurum: "" }))).toBe("Kalıp Verildi (Fabrika Teslim)");
    // Kargo: panodaysa VEYA kargo bilgisi (firma/takip/tarih/kişi) doluysa "(Kargo)".
    expect(baslik(k({ fabrikaTeslim: false, kargoDurum: "Hazırlanıyor" }))).toBe("Kalıp Verildi (Kargo)");
    expect(baslik(k({ fabrikaTeslim: false, kargoDurum: "", kargoFirma: "Aras" }))).toBe("Kalıp Verildi (Kargo)");
    // Eski düz kayıt (teslim şekli/bilgisi hiç yok) → suffix yok, kirlenmez.
    expect(baslik(k({}))).toBe("Kalıp Verildi");
    // Açık teslimSekli: form her zaman bir seçim yazar. Kargo seçilip HİÇBİR kargo alanı doldurulmasa
    // (panoya da gönderilmese) bile "(Kargo)" gösterilir — kullanıcı raporladığı hata.
    expect(baslik(k({ teslimSekli: "kargo", fabrikaTeslim: false, kargoDurum: "" }))).toBe("Kalıp Verildi (Kargo)");
    expect(baslik(k({ teslimSekli: "fabrika", fabrikaTeslim: true }))).toBe("Kalıp Verildi (Fabrika Teslim)");
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

  it("bloke kredi kartı (yansıtılan komisyon) gösterilen Kalan Borç'a eklenir ama CİROYA eklenmez", () => {
    const detailView = { id: 1, name: "kkkkkkk", fabrikaSatisBedeli: 100000, faturaBedeli: 100000, faturali: "Faturalı Yurtiçi", installDate: "2026-01-01", currency: "TRY", kaliplar: [] };
    // Yansıtmalı bloke KK: borçtan düşen 120.121, komisyon 605 müşteriye yansıtılmış → çekilen kart 120.726.
    const payments = [{ id: 30, customerId: 1, tarih: "2026-02-01", tutar: 120121, currency: "TRY", yontem: "Kredi Kartı",
      kartKomisyonu: { blokajGun: 40, hesabaGecis: "2099-09-01", toplamKesinti: 605, netTutar: 120121, taksit: 1, yansitildi: true } }];
    const r = deriveCustomerDetail(base({ detailView, payments }));
    expect(r.detailKalanBorc).toBe(120726);       // komisyon dahil (çekilen kart = Bloke)
    expect(r.detailKalanBorcToplam).toBe(120726);
    expect(r.detailCiro).toBe(120121);            // ciro SAF (komisyon anaparası ciroda değil)
  });

  it("kalan borç TEK yuvarlanır (çift yuvarlama yok) → Beklenen Tahsilat kartTutar'ıyla aynı gösterim", () => {
    const detailView = { id: 1, name: "K", fabrikaSatisBedeli: 100000, faturaBedeli: 100000, faturali: "Faturalı Yurtiçi", installDate: "2026-01-01", currency: "TRY", kaliplar: [] };
    // Kesirli komisyon → ciro 120120,9. Çift yuvarlama olsaydı round(120120,9)+604,5=120725,5 → ₺120.726 (yanlış).
    const payments = [{ id: 30, customerId: 1, tarih: "2026-02-01", tutar: 120120.9, currency: "TRY", yontem: "Kredi Kartı",
      kartKomisyonu: { blokajGun: 40, hesabaGecis: "2099-09-01", toplamKesinti: 604.5, netTutar: 120120.9, yansitildi: true } }];
    const r = deriveCustomerDetail(base({ detailView, payments }));
    expect(r.detailKalanBorc).toBeCloseTo(120725.4, 1);                                  // ham ciro + komisyon (yuvarlanmamış)
    expect(fmtCur(r.detailKalanBorc, "TRY")).toBe(fmtCur(120120.9 + 604.5, "TRY"));      // Beklenen'in kartTutar gösterimiyle birebir
  });

  it("komisyon YANSITILMAMIŞ (biz üstlendik) bloke kredi kartı Kalan Borç'a EKLENMEZ", () => {
    const detailView = { id: 1, name: "A", fabrikaSatisBedeli: 100000, faturaBedeli: 100000, faturali: "Faturalı Yurtiçi", installDate: "2026-01-01", currency: "TRY", kaliplar: [] };
    const payments = [{ id: 30, customerId: 1, tarih: "2026-02-01", tutar: 120000, currency: "TRY", yontem: "Kredi Kartı",
      kartKomisyonu: { blokajGun: 40, hesabaGecis: "2099-09-01", toplamKesinti: 3000, netTutar: 117000, taksit: 1, yansitildi: false } }];
    const r = deriveCustomerDetail(base({ detailView, payments }));
    expect(r.detailKalanBorc).toBe(120000);       // komisyon müşteri borcu değil → eklenmez
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

  it("Yedek Parça (Kargo) kutusu için net (KDV hariç) + KDV toplamları üretir; ödendi/farklı PB/bayi hariç", () => {
    const detailView = { id: 1, name: "A", currency: "TRY" };
    const yedekParcaSatislar = [
      { id: 700, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 3, birimFiyat: 100, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-04-01", odendi: false, tahsisler: [] }, // 300 net, 60 KDV
      { id: 701, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 2, birimFiyat: 50, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-04-02", odendi: true, tahsisler: [] },  // ödendi ama net/KDV kutusuna dahil (ciro), 100 net, 20 KDV
      { id: 702, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 1, birimFiyat: 999, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-04-03", odendi: false, tahsisler: [] }, // bayi alıcı → hariç
      { id: 703, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 1, birimFiyat: 200, currency: "USD", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-04-04", odendi: false, tahsisler: [] }, // farklı PB → hariç
    ];
    const r = deriveCustomerDetail(base({ detailView, yedekParcaSatislar }));
    expect(r.detailYedekParcaNet).toBe(400);   // 300 + 100 (KDV hariç kalem toplamı)
    expect(r.detailYedekParcaKdv).toBe(80);    // 60 + 20
  });
});
