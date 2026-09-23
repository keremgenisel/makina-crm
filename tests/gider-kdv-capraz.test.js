// Spec 0001 C10 çapraz testi: KDV karşılaştırmasındaki "satışlardan hesaplanan KDV", aylık rapor
// motorunun (hesaplaAylikRapor) toplamKdv'siyle AYNI rakamdır. Finans kartı ve Giderler sekmesi
// ikisi de hesaplananKdvAylar'ı kullanır; burada motorun kendisiyle birebir eşitlik sabitlenir.
import { describe, it, expect } from "vitest";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor";
import { hesaplananKdvAylar } from "../src/lib/giderKdv";

const veri = {
  customers: [
    { id: 1, name: "A", currency: "TRY", faturali: "Faturalı Yurtiçi", faturaBedeli: 250000, installDate: "2026-08-10" },
    { id: 2, name: "B", currency: "USD", faturali: "Faturalı Yurtiçi", faturaBedeli: 6000, installDate: "2026-08-12" },
    { id: 3, name: "C", currency: "TRY", faturali: "Faturalı Yurtiçi", faturaBedeli: 100000, installDate: "2026-07-03" },
    { id: 4, name: "D", currency: "TRY", faturali: "Faturalı Yurtdışı", faturaBedeli: 90000, installDate: "2026-08-20" },
  ],
  services: [], partSales: [{ id: 9, customerId: 1, tur: "Kalıp", tarih: "2026-08-14", ucret: 10000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", odendi: true }],
  payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [],
};
const sec = { factoryName: "Altuntaş Makina" };

describe("C10: hesaplanan KDV tek kaynak", () => {
  it("tek ay için aylık rapor motorunun toplamKdv'sine birebir eşit", () => {
    expect(hesaplananKdvAylar(veri, ["2026-08"], sec)).toEqual(hesaplaAylikRapor(veri, "2026-08", sec).toplamKdv);
  });
  it("çok aylı aralık, ay ay çağrılan motorun toplamıdır (K1)", () => {
    const tek = (ay) => hesaplaAylikRapor(veri, ay, sec).toplamKdv;
    const beklenen = {};
    for (const o of [tek("2026-07"), tek("2026-08")]) for (const k in o) beklenen[k] = (beklenen[k] || 0) + o[k];
    expect(hesaplananKdvAylar(veri, ["2026-07", "2026-08"], sec)).toEqual(beklenen);
  });
});
