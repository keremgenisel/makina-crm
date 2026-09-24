// Spec 0002 C2 / AC-5 / AC-6: makina kârlılığı gelir tarafında Finans ve aylık rapor ile AYNI satış bedelini
// kullanır. Üçü de utils.gercekSatisBedeli'ne bağlı; bu test aylık rapor çıktısıyla motoru çapraz denetler.
import { describe, it, expect } from "vitest";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor";
import { hesaplaMakinaMaliyetleri, karlilikOzeti } from "../src/lib/makinaMaliyeti";

const customers = [
  { id: 1, name: "A", model: "AK100", installDate: "2026-03-05", currency: "TRY", faturali: "Faturalı Yurtiçi", faturaBedeli: 400000, fabrikaSatisBedeli: 520000, uretimTarihi: "2026-03-01" },
  { id: 2, name: "B", model: "AK100", installDate: "2026-03-10", currency: "TRY", faturali: "Faturalı Yurtiçi", faturaBedeli: 300000, fabrikaSatisBedeli: "", uretimTarihi: "2026-03-01" },
  { id: 3, name: "C", model: "AK100", installDate: "2026-03-12", currency: "TRY", faturali: "Faturasız Yurtiçi", faturaBedeli: 999, fabrikaSatisBedeli: 250000, uretimTarihi: "2026-03-01" },
];

describe("C2: aynı makina için aylık rapor ve kârlılık aynı satış bedeli", () => {
  it("AC-5 / AC-6: devredilmiş kayıt yokken dönem satış bedeli toplamı aylık raporun satış tutarına eşit", () => {
    const rapor = hesaplaAylikRapor({ customers, services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }, "2026-03", {});
    const s = hesaplaMakinaMaliyetleri({ customers, giderAyarlari: { yururlukAy: "2026-01" }, standardModels: [{ model: "AK100" }] }, { bugun: "2026-09-24" });
    const oz = karlilikOzeti(s, { baslangic: "2026-03-01", bitis: "2026-03-31" });
    expect(oz.toplam.satisBedeli).toBe(rapor.satisTutar.TRY);
    expect(oz.satirlar.map(d => d.satisBedeli)).toEqual([520000, 300000, 250000]);
  });
});

// Triyaj bulgu 2 (karar b): aylık rapor devredilmiş (isResale) kaydı satıştan çıkarır (aylikRapor.js), Finans ve
// kârlılık ise o kaydı fabrikanın ilk satışı olarak sayar (plan M1). Ayrışma 0002'den önce de vardı; burada
// açıkça sabitlenir ki "iki ekran aynı bedel" güvencesi devredilmiş kayıt için yanlış okunmasın. Aylık raporun
// da ilk satışı sayması ayrı bir iş olarak önerildi (rapor rakamı değişir).
describe("C2 bilinen ayrışma: devredilmiş kayıt", () => {
  it("devredilmiş satış kârlılıkta (Finans gibi) sayılır, aylık raporda sayılmaz; fark tam o kaydın bedeli", () => {
    const veri = [
      { ...customers[0], isResale: true, prevOwners: [{ name: "İlk Sahip", soldDate: "2026-06-01" }] },
      customers[1],
    ];
    const rapor = hesaplaAylikRapor({ customers: veri, services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }, "2026-03", {});
    const s = hesaplaMakinaMaliyetleri({ customers: veri, giderAyarlari: { yururlukAy: "2026-01" }, standardModels: [{ model: "AK100" }] }, { bugun: "2026-09-24" });
    const oz = karlilikOzeti(s, { baslangic: "2026-03-01", bitis: "2026-03-31" });
    expect(oz.toplam.satisBedeli).toBe(820000);
    expect(rapor.satisTutar.TRY).toBe(300000);
    expect(rapor.ikinciElAdet).toBe(1);
    expect(oz.toplam.satisBedeli - rapor.satisTutar.TRY).toBe(520000);
  });
});
