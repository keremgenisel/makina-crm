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
