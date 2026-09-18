// Bayi silme kaskadı sonrası: çöpe giden bayi satışının bu makinaya yapılmış tahsisi müşteri
// makina geçmişinde görünmemeli (satış geri alınınca döner); canlı bayininki görünmeli.
import { describe, it, expect } from "vitest";
import { deriveCustomerDetail } from "../src/components/customers/detail/deriveCustomerDetail";

describe("deriveCustomerDetail — çöpteki bayi satışının tahsisi", () => {
  it("deletedAt taşıyan satışın tahsisi zaman çizelgesine girmez", () => {
    const detailView = { id: 1, name: "Makina Sahibi", model: "AK100", installDate: "2026-01-01", currency: "TRY" };
    const dealers = [{ id: 9, name: "Canlı Bayi" }, { id: 8, name: "Silinen Bayi", deletedAt: "2026-09-18T10:00:00.000Z" }];
    const yedekParcaSatislar = [
      { id: 30, aliciTipi: "bayi", dealerId: 9, partId: "7", miktar: 1, tarih: "2026-07-01", tahsisler: [{ customerId: 1, miktar: 1, tarih: "2026-07-02" }] },
      { id: 31, aliciTipi: "bayi", dealerId: 8, partId: "7", miktar: 1, tarih: "2026-07-03", deletedAt: "2026-09-18T10:00:00.000Z", tahsisler: [{ customerId: 1, miktar: 1, tarih: "2026-07-04" }] },
    ];
    const r = deriveCustomerDetail({
      detailView, services: [], partSales: [], payments: [], kdvRates: [{ from: "2000-01-01", rate: 20 }], models: [],
      todayStr: "2026-09-18", factoryName: "Altuntaş Makina", yedekParcaSatislar, dealers, parts: [{ id: 7, ad: "Dişli" }], customers: [detailView],
    });
    const metin = JSON.stringify(r);
    expect(metin).toContain("Canlı Bayi");
    expect(metin).not.toContain("Silinen Bayi");
  });
});
