// Bug: Dashboard "Üretimde Bekleyen Kalıplar" sayımı tarihten bağımsız TÜM bekleyenleri sayar; ama
// yeni üretim formu bugün-bugün aralığında açılıp "Bekleyen Kalıpları Getir" yalnız o aralığı getirince
// geçmiş tarihli bekleyen kalıplar görünmezdi. Düzeltme (A): yeni form başlangıcını en eski bekleyene çek.
import { describe, it, expect } from "vitest";
import { enEskiBekleyenKalipTarihi } from "../src/components/stock/UretimFormu.jsx";

describe("enEskiBekleyenKalipTarihi — yeni form başlangıç tarihi", () => {
  it("müşteri kalıbı (installDate) + Extra Kalıp (tarih) arasından EN ESKİsini döner", () => {
    const customers = [
      { id: 1, installDate: "2026-05-01", kaliplar: [{ ad: "K", uretimFormGonder: true }] },       // bekliyor
      { id: 2, installDate: "2026-01-01", kaliplar: [{ ad: "K", uretimFormGonder: true, uretimFormId: 9 }] }, // zaten forma eklendi → sayılmaz
    ];
    const partSales = [{ id: 20, tur: "Kalıp", tarih: "2026-03-15", uretimFormGonder: true }]; // bekliyor
    expect(enEskiBekleyenKalipTarihi(customers, partSales)).toBe("2026-03-15"); // en eski bekleyen
  });

  it("bekleyen yoksa boş döner (başlangıç bugünde kalır)", () => {
    expect(enEskiBekleyenKalipTarihi([{ id: 1, installDate: "2026-05-01", kaliplar: [{ ad: "K" }] }], [])).toBe("");
    expect(enEskiBekleyenKalipTarihi([], [])).toBe("");
  });

  it("silinmiş / tarihsiz kayıtlar dikkate alınmaz", () => {
    const partSales = [
      { id: 1, uretimFormGonder: true, tarih: "2026-02-01", deletedAt: "2026-06-01" }, // silinmiş
      { id: 2, uretimFormGonder: true, tarih: "" },                                     // tarihsiz
      { id: 3, uretimFormGonder: true, tarih: "2026-07-01" },                           // geçerli bekleyen
    ];
    expect(enEskiBekleyenKalipTarihi([], partSales)).toBe("2026-07-01");
  });
});
