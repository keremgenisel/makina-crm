// Anlaşmasız dış servis firması yazdırma çıktılarında (makina raporu + servis formu) DOĞRU
// etiketle görünmeli. Regresyon: makina raporu DEFAULT_MAKINA_TRANSLATIONS kullanıyor; etiket
// yalnız servis sözlüğüne eklenince makina raporunda "—" (esc'in null/undefined karşılığı) çıktı
// ("—: GenServis · kerem · ..."). Bu test hem etiketin var olduğunu hem "—:" bozuk biçiminin
// çıkmadığını kilitler.
import { describe, it, expect } from "vitest";
import { buildMachineReportHtml, buildServiceFormHtml } from "../src/lib/printTemplates";

const musteri = { id: 1, name: "ABC Makina", serialNo: "SN-1", model: "AM-60", country: "Türkiye", city: "İstanbul" };
const disServis = {
  id: 5, customerId: 1, date: "2026-07-17", type: "Periyodik Bakım", yapilanIsler: "bakım",
  islemFirma: "Diğer", islemFirmaAd: "GenServis", islemFirmaYetkili: "kerem", islemFirmaTel: "0000000",
  islemFirmaUlke: "Türkiye", islemFirmaSehir: "Bursa",
};

describe("dış firma yazdırma etiketi", () => {
  it("makina raporu: etiket görünür ve bozuk '—:' biçimi ÇIKMAZ", () => {
    const html = buildMachineReportHtml(musteri, [disServis], []);
    expect(html).toContain("GenServis · kerem · 0000000");
    expect(html).toContain("İşlemi yapan firma"); // gerçek etiket (makina sözlüğünden)
    expect(html).not.toContain("—: GenServis");    // eksik etiket → esc "—" regresyonu
  });

  it("servis formu: anlaşmasız firma bilgileri satırları çıkar", () => {
    const html = buildServiceFormHtml(disServis, [musteri], []);
    expect(html).toContain("GenServis");
    expect(html).toContain("İşlemi Yapan Firma (Anlaşmasız)"); // servis sözlüğü etiketi
    expect(html).toContain("kerem");
  });
});

describe("makina raporu: satılan yedek parçalar", () => {
  const parts = [{ id: 7, ad: "Dişli" }];
  const dealers = [{ id: 5, name: "Bayi X" }];

  it("bu makinaya tahsis edilen yedek parça + bayi kaynağı gösterilir", () => {
    const yps = [{ id: 650, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 5, tarih: "2026-07-20",
      tahsisler: [{ miktar: 2, customerId: 1, tarih: "2026-07-25" }] }];
    const html = buildMachineReportHtml(musteri, [], [], {}, "", parts, null, [], yps, dealers);
    expect(html).toContain("SATILAN YEDEK PARÇALAR");
    expect(html).toContain("Dişli");
    expect(html).toContain("Bayi üzerinden: Bayi X"); // bayi tarafından tahsis edildiyse gösterilir
  });

  it("doğrudan müşteriye satış kaynağı = fabrika firma adı; başka makinaya tahsis bu raporda görünmez", () => {
    const yps = [
      { id: 651, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 1, tarih: "2026-07-20", tahsisler: [{ miktar: 1, customerId: 1 }] },
      { id: 652, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 3, tarih: "2026-07-21", tahsisler: [{ miktar: 3, customerId: 999 }] },
    ];
    const html = buildMachineReportHtml(musteri, [], [], {}, "", parts, { name: "FABRİKA-TEST A.Ş." }, [], yps, dealers);
    expect(html).toContain("FABRİKA-TEST A.Ş."); // "Doğrudan" yerine fabrika firma adı yazılır
    expect(html).not.toContain("Doğrudan");
    expect(html).toContain("SATILAN YEDEK PARÇALAR (1 kayıt)"); // 999'a tahsis bu makinada görünmez
  });

  it("fabrika bilgisi yoksa doğrudan satış geri-uyumla 'Doğrudan' gösterir", () => {
    const yps = [{ id: 651, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 1, tarih: "2026-07-20", tahsisler: [{ miktar: 1, customerId: 1 }] }];
    const html = buildMachineReportHtml(musteri, [], [], {}, "", parts, null, [], yps, dealers);
    expect(html).toContain("Doğrudan");
  });

  it("bu makinaya tahsis yoksa yedek parça bölümü çıkmaz", () => {
    const html = buildMachineReportHtml(musteri, [], [], {}, "", parts, null, [], [], dealers);
    expect(html).not.toContain("SATILAN YEDEK PARÇALAR");
  });

  it("geçmiş tarihli müşteri satışında rapor SATIŞ tarihini gösterir — eski kayıtta tahsise bugün damgalı olsa bile", () => {
    // Eski (düzeltme öncesi) kayıt: satış 2025-03-14, otomatik tahsise kayıt günü (2026-07-30) damgalanmış.
    const yps = [{ id: 653, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 1, tarih: "2025-03-14",
      tahsisler: [{ miktar: 1, customerId: 1, tarih: "2026-07-30" }] }];
    const html = buildMachineReportHtml(musteri, [], [], {}, "", parts, { name: "FABRİKA-TEST A.Ş." }, [], yps, dealers);
    expect(html).toContain("2025"); // satış tarihi (14.03.2025) yazılır
    expect(html).not.toContain("30.07.2026"); // tahsise damgalı bugünün tarihi DEĞİL
  });
});

describe("servis formu — değişen parça fiyatı garanti içinde gizlenir", () => {
  const svcBase = { id: 9, customerId: 1, date: "2026-07-17", yapilanIsler: "bakım", parcaCurrency: "TRY",
    degisenParcalar: [{ ad: "Piston", fiyat: 1500 }] };

  it("Garanti İçi: parça adı çıkar ama fiyatı YAZILMAZ", () => {
    const html = buildServiceFormHtml({ ...svcBase, type: "Garanti İçi", parcaUcretsizMi: true }, [musteri], []);
    expect(html).toContain("Piston");
    expect(html).not.toMatch(/Piston[^<]*1[\.\s]?500/); // fiyat parantezi yok
  });

  it("Garanti Dışı: parça fiyatı yazılır", () => {
    const html = buildServiceFormHtml({ ...svcBase, type: "Garanti Dışı" }, [musteri], []);
    expect(html).toContain("Piston");
    expect(html).toMatch(/Piston[^<]*1[\.\s]?500/); // fiyat gösterilir
  });
});
