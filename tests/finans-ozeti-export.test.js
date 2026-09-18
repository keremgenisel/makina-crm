// Veri Yönetimi > Dışa Aktar > Finans Özeti: servis gelir/KDV'si Finans ve aylık raporla AYNI kuralla.
// Regresyon: ücret KDV DAHİL varsayılıp içinden ayrıştırılıyordu (5.000 → 833) ve dış firma servisleri
// de servis ücretine sayılıyordu; form/rapor ücreti KDV HARİÇ kabul eder (5.000 → 1.000 KDV). Parça
// ücretleri (Altuntaş / anlaşmalı) özet dosyada hiç yoktu; rapor "BAKIM ONARIM GELİRLERİ" ile eşitlendi.
import { describe, it, expect } from "vitest";
import { finansOzetiHesapla, finansOzetiSatirlari } from "../src/components/settings/SettingsExport";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor";

const kdvRates = [{ from: "2000-01-01", rate: 20 }];
const F = "Altuntaş Makina";
const secenekler = { factoryName: F, kdvRates, factory: { name: F } };
const rapor = (services, ay = "2026-08") => hesaplaAylikRapor({ customers: [{ id: 1, name: "A", currency: "TRY", kalanBorc: 0 }], services, partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }, ay, secenekler);
const oz = (services, extra = {}) => finansOzetiHesapla({ customers: [], services, partSales: [], kdvRates, factoryName: F, ...extra });

const services = [
  { id: 1, customerId: 1, date: "2026-08-11", type: "Garanti Dışı", servisUcreti: 5000, currency: "TRY", islemFirma: F, faturaTipi: "Faturalı Yurtiçi", odendi: true }, // Derya Yemek örneği
  { id: 2, customerId: 1, date: "2026-08-12", type: "Garanti Dışı", servisUcreti: 3000, currency: "TRY", islemFirma: F, faturaTipi: "Faturasız Yurtiçi" },               // faturasız → KDV yok
  { id: 3, customerId: 1, date: "2026-08-13", type: "Garanti Dışı", servisUcreti: 9000, currency: "TRY", islemFirma: "Ege Servis", faturaTipi: "Faturalı Yurtiçi" },  // dış firma → bizim gelir değil
  { id: 4, customerId: 1, date: "2026-08-14", type: "Garanti İçi", servisUcreti: 7000, currency: "TRY", islemFirma: F, faturaTipi: "Faturalı Yurtiçi" },               // garanti içi → ücretsiz
  { id: 5, customerId: 1, date: "2026-08-15", type: "Periyodik Bakım", servisUcreti: 1000, currency: "TRY", islemFirma: F, faturaTipi: "Faturalı Yurtiçi", deletedAt: "x" }, // silinmiş
];

describe("finansOzetiHesapla — işçilik", () => {
  const o = oz(services);
  it("servis ücreti yalnız Altuntaş'ın ücretli servislerinde; KDV ücretin ÜSTÜNE, yalnız Faturalı Yurtiçi", () => {
    expect(o.servisUc.TRY).toBe(8000);   // 5000 + 3000 (dış firma, garanti içi, silinmiş hariç)
    expect(o.kdv.TRY).toBe(1000);        // 5000 × %20 (eskiden 833,33); faturasız 0
    expect(o.net.TRY).toBe(8000);
  });
  it("aylık rapor motoruyla aynı işçilik ve KDV", () => {
    const r = rapor(services);
    expect(r.iscilikTutar.TRY).toBe(o.servisUc.TRY);
    expect(r.servisKdv.TRY).toBe(o.kdv.TRY);
  });
});

describe("finansOzetiHesapla — parça (Altuntaş servisi / anlaşmalı servis) — tüm durumlar", () => {
  const parcali = [
    // Derya Yemek: işçilik 5.000 + Altuntaş parçası 6.350, Faturalı Yurtiçi → KDV 2.270
    { id: 10, customerId: 1, date: "2026-08-11", type: "Garanti Dışı", servisUcreti: 5000, parcaUcreti: 6350, parcaUcretiAltuntastan: 6350, currency: "TRY", islemFirma: F, faturaTipi: "Faturalı Yurtiçi" },
    // Mishtore: dış firma servisi, Altuntaş parçası 9.500 → anlaşmalı parça; işçilik sayılmaz
    { id: 11, customerId: 1, date: "2026-08-03", type: "Garanti Dışı", servisUcreti: 800, parcaUcreti: 9500, parcaUcretiAltuntastan: 9500, currency: "TRY", islemFirma: "Hüseyin Dalamaz", faturaTipi: "Faturalı Yurtiçi" },
    // Parça ücretsiz işaretli → parça yok
    { id: 12, customerId: 1, date: "2026-08-12", type: "Garanti Dışı", servisUcreti: 0, parcaUcreti: 4000, parcaUcretiAltuntastan: 4000, parcaUcretsizMi: true, currency: "TRY", islemFirma: F, faturaTipi: "Faturalı Yurtiçi" },
    // Dış tedarik parça (Altuntaş'tan alınmamış): parcaUcretiAltuntastan 0 → sayılmaz
    { id: 13, customerId: 1, date: "2026-08-13", type: "Garanti Dışı", servisUcreti: 0, parcaUcreti: 2500, parcaUcretiAltuntastan: 0, currency: "TRY", islemFirma: F, faturaTipi: "Faturalı Yurtiçi" },
    // Parça para birimi ayrı (USD) + Faturalı Yurtdışı → USD kovası, KDV yok
    { id: 14, customerId: 1, date: "2026-08-14", type: "Garanti Dışı", servisUcreti: 100, parcaUcreti: 40, parcaUcretiAltuntastan: 40, currency: "USD", parcaCurrency: "USD", islemFirma: F, faturaTipi: "Faturalı Yurtdışı" },
    // Fatura tipi hiç girilmemiş eski kayıt → uygulama genelinde Faturalı Yurtiçi sayılır (rapor da öyle)
    { id: 15, customerId: 1, date: "2026-08-15", type: "Periyodik Bakım", servisUcreti: 1000, currency: "TRY", islemFirma: F },
    // Bilinmeyen para birimi → TL kovası
    { id: 16, customerId: 1, date: "2026-08-16", type: "Garanti Dışı", servisUcreti: 50, currency: "GBP", islemFirma: F, faturaTipi: "Faturasız Yurtiçi" },
  ];
  const o = oz(parcali);
  it("Altuntaş parçası, anlaşmalı parça, ücretsiz/dış tedarik parça, döviz ve eski kayıt kuralları", () => {
    expect(o.servisUc).toEqual({ TRY: 5000 + 1000 + 50, USD: 100, EUR: 0 }); // 11 (dış firma), 12/13 (0) yok
    expect(o.servisParca).toEqual({ TRY: 6350, USD: 40, EUR: 0 });          // 12 ücretsiz, 13 dış tedarik yok
    expect(o.anlasmaliParca).toEqual({ TRY: 9500, USD: 0, EUR: 0 });
    // KDV: (5000 + 6350) × %20 = 2270 (Derya) + 9500 × %20 = 1900 (anlaşmalı) + 1000 × %20 = 200 (eski kayıt); USD Yurtdışı 0; GBP faturasız 0
    expect(o.kdv).toEqual({ TRY: 2270 + 1900 + 200, USD: 0, EUR: 0 });
    expect(o.net.TRY).toBe(6050 + 6350 + 9500);
  });
  it("aylık raporun BAKIM ONARIM bölümüyle birebir: net (işçilik + Altuntaş parça + anlaşmalı parça) ve KDV", () => {
    // Rapor bilinmeyen para birimini kendi anahtarında (GBP) tutar, Excel özeti 3 kovaya indirger (GBP → TL);
    // karşılaştırma bu tek kaydı dışarıda bırakır (yukarıda Excel tarafı ayrıca doğrulandı).
    const r = rapor(parcali.filter(s => s.id !== 16));
    const oT = oz(parcali.filter(s => s.id !== 16));
    expect(r.servisNet.TRY).toBe(oT.servisUc.TRY + oT.servisParca.TRY + oT.anlasmaliParca.TRY);
    expect(r.servisNet.USD).toBe(oT.servisUc.USD + oT.servisParca.USD);
    expect(r.servisBolumKdv.TRY).toBe(oT.kdv.TRY);
    expect(r.iscilikTutar.TRY).toBe(oT.servisUc.TRY);
    expect(r.servisParcaTutar.TRY).toBe(oT.servisParca.TRY);
    expect(r.anlasmaliParcaTutar.TRY).toBe(oT.anlasmaliParca.TRY);
  });
  it("boş girişte sıfırlar", () => {
    const b = finansOzetiHesapla({});
    expect(b.servisUc).toEqual({ TRY: 0, USD: 0, EUR: 0 });
    expect(b.kdv).toEqual({ TRY: 0, USD: 0, EUR: 0 });
    expect(b.real).toEqual([]);
  });
});

describe("finansOzetiHesapla — makina satışı kısmı değişmedi", () => {
  it("KDV fatura bedeli üzerinden, komisyon gider, legacy satış tipi normalize", () => {
    const c = [
      { id: 9, name: "Z", currency: "TRY", faturali: "Faturalı Yurtiçi", installDate: "2026-08-01", fabrikaSatisBedeli: 500000, faturaBedeli: 400000, komisyon: 10000, kalanBorc: 5000, kaliplar: [{ ad: "K" }] },
      { id: 8, name: "Y", currency: "USD", faturali: "Faturalı İhracat", installDate: "2026-08-02", fabrikaSatisBedeli: 20000, faturaBedeli: 20000, kalipSayisi: 2 }, // legacy tip → Yurtdışı, KDV yok
    ];
    const o2 = finansOzetiHesapla({ customers: c, services: [], partSales: [{ ucret: 1000, currency: "TRY" }], kdvRates, factoryName: F });
    expect(o2.kdv).toEqual({ TRY: 80000, USD: 0, EUR: 0 });
    expect(o2.toplamCiro.TRY).toBe(500000 + 80000 - 10000);
    expect(o2.net.TRY).toBe(500000 + 1000 - 10000);
    expect(o2.net.USD).toBe(20000);
    expect(o2.kalipAdet).toBe(3);
    expect(o2.tipAdet).toEqual({ "Faturalı Yurtiçi": 1, "Faturalı Yurtdışı": 1, "Faturasız Yurtiçi": 0, "Faturasız Yurtdışı": 0 });
    expect(o2.alacak.TRY).toBe(5000);
  });
});

describe("finansOzetiSatirlari — Excel satırları", () => {
  it("yeni parça satırları ve KDV hariç etiketleri var; garanti dışı sayısı silinmişi saymaz", () => {
    const o = oz(services);
    const rows = finansOzetiSatirlari(o, services, "18.09.2026");
    const bul = (etiket) => rows.find(r => r[0] === etiket);
    expect(rows[0]).toEqual(["FİNANS ÖZETİ", "18.09.2026", "", ""]);
    expect(bul("Garanti Dışı Servis Sayısı")[1]).toBe(3);
    expect(bul("Toplam Servis İşçilik Ücreti (KDV hariç)")).toEqual(["Toplam Servis İşçilik Ücreti (KDV hariç)", 8000, 0, 0]);
    expect(bul("Toplam Servis Parça Ücreti — Altuntaş servisi (KDV hariç)")).toBeTruthy();
    expect(bul("Toplam Anlaşmalı Servise Parça Ücreti (KDV hariç)")).toBeTruthy();
    expect(bul("Toplam KDV (makina + servis + parça)")[1]).toBe(1000);
    expect(bul("NET GENEL TOPLAM")[1]).toBe(8000);
  });
});
