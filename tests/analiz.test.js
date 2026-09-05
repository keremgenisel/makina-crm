import { describe, it, expect } from "vitest";
import { hesaplaAnaliz, BILINMEYEN_MODEL, trendModuSec } from "../src/lib/analiz";

// Ortak fixture: 3 makina (AK-140 filo 2, AK-100 filo 1), 2 parça tanımı, 3 servis, 1 kargo, 3 kalıp.
const customers = [
  { id: 1, name: "Firma A", model: "AK-140", serialNo: "SN-1", installDate: "2024-01-10",
    kaliplar: [{ ad: "Fitil Kalıbı", olcu: "55x125" }, { ad: "Somun Kalıbı", olcu: "60x140" }, { ad: "Extra X", partSaleId: 999 }] }, // sonuncu Extra Kalıp satışından → standart değil
  { id: 2, name: "Firma B", model: "AK-100", serialNo: "SN-2", installDate: "2023-05-01",
    kaliplar: [{ ad: "Fitil Kalıbı" }] },
  { id: 3, name: "Firma C", model: "AK-140", serialNo: "SN-3",
    kaliplar: [{ ad: "Somun Kalıbı" }] },
];
const parts = [{ id: 7, ad: "Rulman 6204" }, { id: 8, ad: "V Kayış" }];
const services = [
  { id: 100, customerId: 1, date: "2025-03-05", type: "Garanti Dışı", repairPlace: "Yerinde Onarım", tech: "Ahmet",
    degisenParcalar: [{ partId: "7", ad: "Rulman 6204", miktar: 2 }],
    fabrikaGirisZamani: "2025-03-05T09:00:00", bakimBaslangicZamani: "2025-03-05T10:00:00", bitisZamani: "2025-03-05T12:00:00" },
  { id: 101, customerId: 1, date: "2025-04-10", type: "Garanti İçi", repairPlace: "Fabrikada Onarım", tech: "Ahmet",
    degisenParcalar: [{ partId: "7", miktar: 1 }] },
  { id: 102, customerId: 2, date: "2025-04-15", type: "Garanti Dışı", repairPlace: "Yerinde Onarım", tech: "Mehmet",
    degisenParcalar: [{ ad: "Conta", miktar: 1 }] },
];
const yedekParcaSatislar = [
  { id: 900, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 5, tarih: "2025-05-01",
    tahsisler: [{ miktar: 2, customerId: 2 }, { miktar: 1, serialNo: "SN-3" }] }, // kalan 2 tahsis edilmemiş
];
const partSales = [
  { id: 800, tur: "Kalıp", customerId: 1, ad: "Fitil Kalıbı", olcu: "55x125", tarih: "2025-03-20" },
  { id: 801, tur: "Kalıp", customerId: 2, ad: "Fitil Kalıbı", olcu: "55x125", tarih: "2025-04-02" },
  { id: 802, tur: "Kalıp", customerId: 1, ad: "Somun Kalıbı", olcu: "60x140", tarih: "2025-04-05" },
  { id: 803, tur: "Diğer", customerId: 1, tarih: "2025-04-06" }, // kalıp değil → sayılmaz
];

const veri = () => hesaplaAnaliz({ customers, services, partSales, yedekParcaSatislar, parts });

describe("hesaplaAnaliz — onarım yeri 'Kargo' (eski, kaldırılmış) servis sayılmaz", () => {
  const cust = [{ id: 1, name: "A", model: "AK-1", serialNo: "S1" }];
  const svc = [
    { id: 1, customerId: 1, date: "2025-05-01", type: "Garanti Dışı", repairPlace: "Fabrikada Onarım", degisenParcalar: [{ ad: "Rulman", miktar: 1 }] },
    { id: 2, customerId: 1, date: "2025-05-02", type: "Garanti Dışı", repairPlace: "Kargo", degisenParcalar: [{ ad: "Kayış", miktar: 5 }] },
    { id: 3, customerId: 1, date: "2025-05-03", type: "Garanti Dışı", repairPlace: "kargo" }, // küçük harf de hariç
  ];
  const v = () => hesaplaAnaliz({ customers: cust, services: svc });
  it("onarım yeri kırılımında 'Kargo' görünmez, gerçek onarım yerleri sayılır", () => {
    const oy = v().onarimYerleri;
    expect(oy.some(x => x.ad.toLowerCase() === "kargo")).toBe(false);
    expect(oy.find(x => x.ad === "Fabrikada Onarım").adet).toBe(1);
  });
  it("toplam servis + en çok servisli makina Kargo'yu saymaz", () => {
    const r = v();
    expect(r.ozet.toplamServis).toBe(1); // 3 kayıttan yalnız 1'i gerçek servis
    expect(r.enCokServisliMakinalar[0].adet).toBe(1);
  });
  it("Kargo servisindeki değişen parça da sayılmaz", () => {
    const p = v().parcalar;
    expect(p.some(x => x.ad.toLowerCase() === "kayış")).toBe(false); // Kargo servisinin parçası
    expect(p.some(x => x.ad === "Rulman")).toBe(true);              // gerçek servisinki kalır
  });
});

describe("hesaplaAnaliz — yedek parça birleşik toplam (servis + kargo)", () => {
  it("aynı partId serviste ve kargoda tek satırda birleşir, kaynaklar ayrı sayılır", () => {
    const p = veri().parcalar.find(x => x.ad === "Rulman 6204");
    expect(p).toBeTruthy();
    expect(p.servis).toBe(3);          // 2 + 1
    expect(p.kargo).toBe(5);
    expect(p.toplam).toBe(8);
  });

  it("en çok satılan parça en üstte (Rulman 8 > Conta 1)", () => {
    expect(veri().parcalar[0].ad).toBe("Rulman 6204");
  });

  it("özet: toplam parça = servis + kargo, kaynak kırılımı doğru", () => {
    const o = veri().ozet;
    expect(o.parcaServisToplam).toBe(4); // Rulman 3 + Conta 1
    expect(o.parcaKargoToplam).toBe(5);
    expect(o.parcaToplam).toBe(9);
    expect(o.enCokParca.ad).toBe("Rulman 6204");
  });
});

describe("hesaplaAnaliz — parça → model kırılımı", () => {
  it("servis parçası müşteri modeline, kargo tahsisi tahsis edilen makinaya, kalan bilinmeyene gider", () => {
    const p = veri().parcalar.find(x => x.ad === "Rulman 6204");
    const m = Object.fromEntries(p.modeller.map(x => [x.model, x.adet]));
    expect(m["AK-140"]).toBe(4);   // servis 3 (cust1) + SN-3 tahsisi 1
    expect(m["AK-100"]).toBe(2);   // cust2 tahsisi
    expect(m[BILINMEYEN_MODEL]).toBe(2); // tahsis edilmemiş kalan
  });

  it("bilinmeyen dilimi listenin sonunda", () => {
    const p = veri().parcalar.find(x => x.ad === "Rulman 6204");
    expect(p.modeller[p.modeller.length - 1].model).toBe(BILINMEYEN_MODEL);
    expect(p.modeller[p.modeller.length - 1].bilinmeyen).toBe(true);
  });
});

describe("hesaplaAnaliz — servis metrikleri", () => {
  it("en çok servis alan makina customerId bazında sayılır", () => {
    const top = veri().enCokServisliMakinalar[0];
    expect(top.customerId).toBe(1);
    expect(top.adet).toBe(2);
    expect(top.model).toBe("AK-140");
    expect(top.serialNo).toBe("SN-1");
  });

  it("model yoğunluğu = makina başına servis (filoya normalize)", () => {
    const y = Object.fromEntries(veri().modelYogunlugu.map(m => [m.model, m]));
    expect(y["AK-140"].servis).toBe(2);
    expect(y["AK-140"].makina).toBe(2); // filo: cust1 + cust3
    expect(y["AK-140"].oran).toBeCloseTo(1.0);
    expect(y["AK-100"].makina).toBe(1);
    expect(y["AK-100"].oran).toBeCloseTo(1.0);
  });

  it("servis tipi ve onarım yeri kırılımı", () => {
    const t = Object.fromEntries(veri().servisTipleri.map(x => [x.ad, x.adet]));
    expect(t["Garanti Dışı"]).toBe(2);
    expect(t["Garanti İçi"]).toBe(1);
    const y = Object.fromEntries(veri().onarimYerleri.map(x => [x.ad, x.adet]));
    expect(y["Yerinde Onarım"]).toBe(2);
    expect(y["Fabrikada Onarım"]).toBe(1);
  });

  it("teknisyen dökümü: servis sayısı + ortalama işçilik (mesai dakikası)", () => {
    const tk = Object.fromEntries(veri().teknisyenler.map(x => [x.ad, x]));
    expect(tk["Ahmet"].adet).toBe(2);
    expect(tk["Ahmet"].ortIsclikDk).toBe(120); // 10:00→12:00 tek örnek; diğeri damgasız (null, sayılmaz)
    expect(tk["Mehmet"].adet).toBe(1);
    expect(tk["Mehmet"].ortIsclikDk).toBe(null); // damga yok
  });

  it("trend: kısa aralık (≤12 ay) AYLIK, servis olan aylar doğru sayılır", () => {
    const v = veri();
    expect(v.trendBirim).toBe("ay");
    const t = v.trend;
    expect(t.length).toBe(12);
    expect(t[t.length - 1]).toEqual({ donem: "2025-04", adet: 2 }); // en yeni ay = max servis ayı
    expect(t.find(x => x.donem === "2025-03").adet).toBe(1);
  });
});

describe("trendModuSec — granülerlik kararı (preset temelli)", () => {
  it("tüm zamanlar HER ZAMAN yıllık (tek yıl verisi olsa bile)", () => {
    expect(trendModuSec("tum", null, null)).toBe("yil");
  });
  it("Son 12 ay / Bu yıl aylık (takvimde 2 yıla yayılsa bile)", () => {
    expect(trendModuSec("son12", "2025-09-05", "2026-09-05")).toBe("ay");
    expect(trendModuSec("yil", "2026-01-01", "2026-09-05")).toBe("ay");
  });
  it("özel aralık: yıl farklı → yıllık, tek yıl → aylık", () => {
    expect(trendModuSec("ozel", "2021-01-01", "2025-12-31")).toBe("yil");
    expect(trendModuSec("ozel", "2023-03-01", "2023-09-30")).toBe("ay");
    expect(trendModuSec("ozel", null, null)).toBe("ay"); // sınır yok → aylık
  });
});

describe("hesaplaAnaliz — trend bucketing (trendModu'ya göre)", () => {
  const cust = [{ id: 1, name: "A", model: "AK-1", serialNo: "S1" }];
  const svc = [
    { id: 1, customerId: 1, date: "2021-05-01" },
    { id: 2, customerId: 1, date: "2021-08-01" },
    { id: 3, customerId: 1, date: "2023-02-01" },
    { id: 4, customerId: 1, date: "2025-06-01" },
  ];
  it("trendModu 'yil' + tüm zamanlar → veri yıllarına göre (2021..2025, boş yıl 0)", () => {
    const v = hesaplaAnaliz({ customers: cust, services: svc }, { trendModu: "yil" });
    expect(v.trendBirim).toBe("yil");
    expect(v.trend.map(x => x.donem)).toEqual(["2021", "2022", "2023", "2024", "2025"]);
    expect(v.trend.find(x => x.donem === "2021").adet).toBe(2);
    expect(v.trend.find(x => x.donem === "2022").adet).toBe(0); // boş yıl
    expect(v.trend.find(x => x.donem === "2023").adet).toBe(1);
    expect(v.trend.find(x => x.donem === "2025").adet).toBe(1);
  });
  it("trendModu 'yil' + tek yıl verisi → yine yıllık (tek çubuk)", () => {
    const tek = [{ id: 9, customerId: 1, date: "2025-06-01" }];
    const v = hesaplaAnaliz({ customers: cust, services: tek }, { trendModu: "yil" });
    expect(v.trendBirim).toBe("yil");
    expect(v.trend).toEqual([{ donem: "2025", adet: 1 }]);
  });
  it("trendModu 'yil' + özel aralık → aralık yıllarını kapsar (boş yıllar dahil)", () => {
    const v = hesaplaAnaliz({ customers: cust, services: svc }, { baslangic: "2021-01-01", bitis: "2025-12-31", trendModu: "yil" });
    expect(v.trendBirim).toBe("yil");
    expect(v.trend.length).toBe(5);
  });
  it("trendModu 'ay' (varsayılan) → 12 aylık pencere", () => {
    const v = hesaplaAnaliz({ customers: cust, services: svc }, { baslangic: "2021-01-01", bitis: "2021-09-30" });
    expect(v.trendBirim).toBe("ay");
    expect(v.trend.length).toBe(12);
  });
});

describe("hesaplaAnaliz — Kalıp analizi (Extra satış + Standart BİRLEŞİK)", () => {
  it("özet: extra satış (kalipToplam), standart (standartToplam) ve genel toplam", () => {
    const v = veri();
    expect(v.ozet.kalipToplam).toBe(3);        // Extra: 800+801+802 (803 Diğer hariç)
    expect(v.ozet.standartToplam).toBe(4);     // Standart: Fitil x2 + Somun x2 (Extra X partSaleId hariç)
    expect(v.ozet.kalipGenelToplam).toBe(7);
  });

  it("kalıp adına göre standart + extra tek satırda", () => {
    const k = Object.fromEntries(veri().kalipAd.map(x => [x.ad, x]));
    expect(k["Fitil Kalıbı"]).toMatchObject({ standart: 2, extra: 2, toplam: 4 });
    expect(k["Somun Kalıbı"]).toMatchObject({ standart: 2, extra: 1, toplam: 3 });
    expect(k["Extra X"]).toBeUndefined(); // partSaleId'li → hiç sayılmaz
  });

  it("ölçüye göre standart + extra birleşik (ölçüsüz standart 'Ölçüsüz'e düşer)", () => {
    const o = Object.fromEntries(veri().kalipOlcu.map(x => [x.ad, x]));
    expect(o["55x125"]).toMatchObject({ standart: 1, extra: 2, toplam: 3 });
    expect(o["60x140"]).toMatchObject({ standart: 1, extra: 1, toplam: 2 });
    expect(o["Ölçüsüz"]).toMatchObject({ standart: 2, extra: 0, toplam: 2 });
  });

  it("modele göre standart + extra birleşik", () => {
    const m = Object.fromEntries(veri().kalipModel.map(x => [x.model, x]));
    expect(m["AK-140"]).toMatchObject({ standart: 3, extra: 2, toplam: 5 });
    expect(m["AK-100"]).toMatchObject({ standart: 1, extra: 1, toplam: 2 });
  });

  it("aralık: extra tarih'e, standart makinanın installDate'ine göre süzülür", () => {
    // 2024 aralığı → extra satış yok (hepsi 2025), standart yalnız cust1 (installDate 2024-01-10)
    const v = hesaplaAnaliz({ customers, services, partSales, yedekParcaSatislar, parts }, { baslangic: "2024-01-01", bitis: "2024-12-31" });
    expect(v.ozet.kalipToplam).toBe(0);
    expect(v.ozet.standartToplam).toBe(2); // cust1: Fitil + Somun
    const k = Object.fromEntries(v.kalipAd.map(x => [x.ad, x]));
    expect(k["Fitil Kalıbı"]).toMatchObject({ standart: 1, extra: 0, toplam: 1 });
  });
});

describe("hesaplaAnaliz — tarih aralığı filtresi", () => {
  it("aralık dışı servis/kargo/kalıp hariç tutulur", () => {
    const v = hesaplaAnaliz({ customers, services, partSales, yedekParcaSatislar, parts }, { baslangic: "2025-04-01", bitis: "2025-04-30" });
    // Nisan: servis 101 (Rulman 1) + 102 (Conta 1); Mart servisi ve Mayıs kargosu hariç
    const rulman = v.parcalar.find(x => x.ad === "Rulman 6204");
    expect(rulman.servis).toBe(1);
    expect(rulman.kargo).toBe(0); // Mayıs kargosu aralık dışı
    expect(v.ozet.toplamServis).toBe(2);
    expect(v.ozet.kalipToplam).toBe(2); // 801 + 802 Nisan; 800 Mart hariç
  });

  it("tarihsiz kayıt: aralık verilince hariç, tüm zamanlarda dahil", () => {
    const svc = [{ id: 500, customerId: 1, type: "Garanti Dışı", degisenParcalar: [{ ad: "Z", miktar: 1 }] }]; // date yok
    const tumu = hesaplaAnaliz({ customers, services: svc, parts });
    expect(tumu.ozet.toplamServis).toBe(1);
    const aralikli = hesaplaAnaliz({ customers, services: svc, parts }, { baslangic: "2025-01-01", bitis: "2025-12-31" });
    expect(aralikli.ozet.toplamServis).toBe(0);
  });
});

describe("hesaplaAnaliz — boş/eksik girdi güvenli", () => {
  it("boş girdide çökmeden boş yapılar döner", () => {
    const v = hesaplaAnaliz({});
    expect(v.parcalar).toEqual([]);
    expect(v.enCokServisliMakinalar).toEqual([]);
    expect(v.trend).toEqual([]);
    expect(v.kalipAd).toEqual([]);
    expect(v.kalipOlcu).toEqual([]);
    expect(v.kalipModel).toEqual([]);
    expect(v.ozet.toplamServis).toBe(0);
    expect(v.ozet.standartToplam).toBe(0);
    expect(v.ozet.kalipGenelToplam).toBe(0);
    expect(v.ozet.enCokParca).toBe(null);
  });
});
