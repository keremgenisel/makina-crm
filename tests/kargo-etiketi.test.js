// Sevk / Kargo Etiketi (100×150 mm) testleri: tek şablon + iki adaptör (yedek parça / kalıp).
// Kritik davranışlar: (1) beş satış durumunda başlıklar birebir aynı; (2) farklı adres = teslimat
// firması büyük yazılır, sipariş veren gizli (Seçenek B); (3) kalıp içeriği "ad · Ölçü"; (4) fabrika
// teslimde kargo/takip boş (—).
import { describe, it, expect } from "vitest";
import { buildKargoEtiketiHtml, yedekParcaEtiketVerisi, kalipEtiketVerisi } from "../src/lib/printTemplates";

const factory = { evrakFirmaAdi: "ALTUNTAŞ MAKİNA", name: "Altuntaş Makina", adres: "Topçular / Eyüp", city: "İstanbul", country: "Türkiye", phone: "+90 212 000" };
const parts = [{ id: "p1", ad: "Piston Kolu" }, { id: "p2", ad: "Conta Takımı" }];
const dealers = [{ id: 1, name: "Mermer Bayi Ltd.", phone: "532 111", adres: "OSB 4. Cad.", city: "Bursa", country: "Türkiye", ilce: "Nilüfer", yetkili1Ad: "Ozan" }];
const customers = [{ id: 10, name: "Anadolu Kalıp A.Ş.", phone: "216 444", adres: "Dudullu OSB", city: "İstanbul", country: "Türkiye", ilce: "Ümraniye", yetkili1Ad: "Elif" }];

const deps = { parts, dealers, customers, factory };

// Her etikette KOŞULSUZ bulunan başlıklar (veri ne olursa olsun sabit).
const SABIT_BASLIKLAR = ["SEVK / KARGO ETİKETİ", "GÖNDEREN", "ALICI", "İÇERİK", "TESLİM ŞEKLİ", "TARİH"];

// Beş durumun etiket HTML'leri.
const ypKargo = () => buildKargoEtiketiHtml(...vArgs(yedekParcaEtiketVerisi([{ id: 100, aliciTipi: "bayi", dealerId: 1, partId: "p1", miktar: 5, currency: "TRY", tarih: "2026-07-28", kargoDurum: "Hazırlanıyor", kargoFirma: "Aras", kargoTakipNo: "72501" }], deps)));
const ypFabrika = () => buildKargoEtiketiHtml(...vArgs(yedekParcaEtiketVerisi([{ id: 101, aliciTipi: "musteri", musteriId: 10, partId: "p2", miktar: 2, tarih: "2026-07-28", fabrikaTeslim: true, kargoFirma: "SILINMELI", kargoTakipNo: "SILINMELI" }], deps)));
const kalipKargo = () => buildKargoEtiketiHtml(...vArgs(kalipEtiketVerisi([{ id: 200, customerId: 10, ad: "ANK-450", olcu: "45×30×22", tarih: "2026-07-28", kargoDurum: "Kargoya Verildi", kargoFirma: "MNG", kargoTakipNo: "44100" }], deps)));
const kalipFabrika = () => buildKargoEtiketiHtml(...vArgs(kalipEtiketVerisi([{ id: 201, customerId: 10, ad: "DPX-900", olcu: "90×60×40", tarih: "2026-07-28", fabrikaTeslim: true }], deps)));
const ypFarkliAdres = () => buildKargoEtiketiHtml(...vArgs(yedekParcaEtiketVerisi([{ id: 102, aliciTipi: "bayi", dealerId: 1, partId: "p1", miktar: 3, currency: "TRY", tarih: "2026-07-28", kargoDurum: "Hazırlanıyor", teslimatFarkli: true, teslimatAd: "Yılmaz Plastik", teslimatTel: "505 246", teslimatAdres: "Atatürk OSB 10007 Sk.", teslimatSehir: "İzmir", teslimatIlce: "Çiğli", teslimatUlke: "Türkiye" }], deps)));

// veri nesnesini builder argümanlarına çevir.
const vArgs = (v) => [v.gonderen, v.alici, v.icerik, v.opts];

describe("buildKargoEtiketiHtml — beş durumda başlıklar birebir aynı", () => {
  const htmls = { ypKargo: ypKargo(), ypFabrika: ypFabrika(), kalipKargo: kalipKargo(), kalipFabrika: kalipFabrika(), ypFarkliAdres: ypFarkliAdres() };
  for (const [ad, html] of Object.entries(htmls)) {
    it(`"${ad}" tüm sabit başlıkları içerir`, () => {
      for (const b of SABIT_BASLIKLAR) expect(html).toContain(b);
    });
  }
  it("gönderen her durumda fabrikadır", () => {
    for (const html of Object.values(htmls)) expect(html).toContain("ALTUNTAŞ MAKİNA");
  });
});

describe("yedekParcaEtiketVerisi", () => {
  it("bayi kargo: alıcı = bayi adı, teslim = Kargo, kargo firma+takip birleşik", () => {
    const v = yedekParcaEtiketVerisi([{ id: 100, aliciTipi: "bayi", dealerId: 1, partId: "p1", miktar: 5, tarih: "2026-07-28", kargoDurum: "Hazırlanıyor", kargoFirma: "Aras", kargoTakipNo: "72501" }], deps);
    expect(v.alici.firma).toBe("Mermer Bayi Ltd.");
    expect(v.alici.yetkili).toBe("Ozan");
    expect(v.opts.teslimSekli).toBe("Kargo");
    expect(v.opts.kargoFirma).toBe("Aras");
    expect(v.opts.kargoTakipNo).toBe("72501");
    expect(v.icerik).toEqual([{ ad: "Piston Kolu", miktar: 5 }]);
  });

  it("fabrika teslim: kargo firma/takip boşlanır (etikette —)", () => {
    const v = yedekParcaEtiketVerisi([{ id: 101, aliciTipi: "musteri", musteriId: 10, partId: "p2", miktar: 2, fabrikaTeslim: true, kargoFirma: "SILINMELI", kargoTakipNo: "SILINMELI" }], deps);
    expect(v.alici.firma).toBe("Anadolu Kalıp A.Ş.");
    expect(v.opts.teslimSekli).toBe("Fabrika Teslim");
    expect(v.opts.kargoFirma).toBe("");
    expect(v.opts.kargoTakipNo).toBe("");
    const html = buildKargoEtiketiHtml(...vArgs(v));
    expect(html).not.toContain("SILINMELI");
    expect(html).toContain("Fabrika Teslim");
  });

  it("farklı adres (B): büyük firma = teslimat adı; sipariş veren bayi GÖSTERİLMEZ", () => {
    const v = yedekParcaEtiketVerisi([{ id: 102, aliciTipi: "bayi", dealerId: 1, partId: "p1", miktar: 3, teslimatFarkli: true, teslimatAd: "Yılmaz Plastik", teslimatTel: "505 246", teslimatAdres: "Atatürk OSB", teslimatSehir: "İzmir", teslimatIlce: "Çiğli", teslimatUlke: "Türkiye" }], deps);
    expect(v.alici.firma).toBe("Yılmaz Plastik");
    expect(v.alici.tel).toBe("505 246");
    expect(v.alici.city).toBe("İzmir");
    expect(v.alici.ilce).toBe("Çiğli");
    const html = buildKargoEtiketiHtml(...vArgs(v));
    expect(html).toContain("Yılmaz Plastik");
    expect(html).toContain("İzmir");
    expect(html).not.toContain("Mermer Bayi Ltd."); // sipariş veren gizli
  });

  it("anlaşmasız dış firma: firma/yetkili/adres dış firma alanlarından", () => {
    const v = yedekParcaEtiketVerisi([{ id: 103, aliciTipi: "bayi", disFirma: true, disFirmaAd: "Servis Dükkanı", disFirmaYetkili: "Veli", disFirmaTel: "312 999", disFirmaAdres: "Sanayi Sitesi", disFirmaSehir: "Ankara", disFirmaUlke: "Türkiye", partId: "p1", miktar: 1 }], deps);
    expect(v.alici.firma).toBe("Servis Dükkanı");
    expect(v.alici.yetkili).toBe("Veli");
    expect(v.alici.city).toBe("Ankara");
  });

  it("toplu satış (batch): her satır ayrı içerik satırı", () => {
    const v = yedekParcaEtiketVerisi([
      { id: 100, aliciTipi: "bayi", dealerId: 1, partId: "p1", miktar: 5, batchId: 900 },
      { id: 101, aliciTipi: "bayi", dealerId: 1, partId: "p2", miktar: 2, batchId: 900 },
    ], deps);
    expect(v.icerik).toEqual([{ ad: "Piston Kolu", miktar: 5 }, { ad: "Conta Takımı", miktar: 2 }]);
  });
});

describe("kalipEtiketVerisi", () => {
  it("içerik = kalıp adı · Ölçü; alıcı = müşteri", () => {
    const v = kalipEtiketVerisi([{ id: 200, customerId: 10, ad: "ANK-450", olcu: "45×30×22", kargoDurum: "Kargoya Verildi", kargoFirma: "MNG", kargoTakipNo: "44100" }], deps);
    expect(v.alici.firma).toBe("Anadolu Kalıp A.Ş.");
    expect(v.icerik).toEqual([{ ad: "ANK-450 · Ölçü: 45×30×22", miktar: 1 }]);
    expect(v.opts.teslimSekli).toBe("Kargo");
    const html = buildKargoEtiketiHtml(...vArgs(v));
    expect(html).toContain("Ölçü: 45×30×22");
  });

  it("fabrika teslim kalıp: teslim şekli Fabrika Teslim, kargo boş", () => {
    const v = kalipEtiketVerisi([{ id: 201, customerId: 10, ad: "DPX-900", olcu: "90×60", fabrikaTeslim: true }], deps);
    expect(v.opts.teslimSekli).toBe("Fabrika Teslim");
    expect(v.opts.kargoTakipNo).toBe("");
  });
});

describe("buildKargoEtiketiHtml — boyut ve kaçış", () => {
  it("100×150 mm yatay sayfa ayarı içerir", () => {
    const html = buildKargoEtiketiHtml({ ad: "X" }, { firma: "Y" }, [{ ad: "z", miktar: 1 }], {});
    expect(html).toContain("size: 150mm 100mm");
    expect(html).toContain("width: 150mm; height: 100mm");
  });
  it("adreste ilçesi olan yer: ilçe / şehir sırasıyla yazılır", () => {
    const html = buildKargoEtiketiHtml({ ad: "X" }, { firma: "Y", adres: "OSB 1. Cad.", ilce: "Gebze", city: "Kocaeli", country: "Türkiye" }, [], {});
    expect(html).toContain("Gebze / Kocaeli");
    expect(html.indexOf("Gebze")).toBeLessThan(html.indexOf("Kocaeli")); // ilçe önce
  });
  it("ilçesi olmayan yer: yalnız şehir yazılır", () => {
    const html = buildKargoEtiketiHtml({ ad: "X" }, { firma: "Y", city: "Ankara", country: "Türkiye" }, [], {});
    expect(html).toContain("Ankara · Türkiye");
  });
  it("KARGO / TAKİP NO artık etikette yok", () => {
    const html = buildKargoEtiketiHtml({ ad: "X" }, { firma: "Y" }, [], { kargoFirma: "Aras", kargoTakipNo: "123" });
    expect(html).not.toContain("KARGO / TAKİP NO");
    expect(html).not.toContain("Aras");
  });
  it("içerik iki sütun (yan yana) yerleşir — kalabalık batch sığsın", () => {
    const html = buildKargoEtiketiHtml({ ad: "X" }, { firma: "Y" }, [{ ad: "a", miktar: 1 }, { ad: "b", miktar: 2 }], {});
    expect(html).toContain("item-grid");
    expect(html).toContain("grid-template-columns: 1fr 1fr");
  });
  it("firma adı HTML-kaçışlı yazılır", () => {
    const html = buildKargoEtiketiHtml({ ad: "X" }, { firma: '<img src=x onerror=alert(1)>' }, [], {});
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });
});
