import { describe, it, expect } from "vitest";
import { yeniBekleyenler } from "../src/lib/servisAlarm.js";

// Servis Panosu alarmı: uzaktan gelen yeni "Bekliyor" servisin tespiti. Bu saf fonksiyon,
// bilinen id kümesinde OLMAYAN + durum "Bekliyor" + panoda gizli olmayan servisleri döner.
describe("yeniBekleyenler", () => {
  it("bilinende olmayan Bekliyor servisi yeni sayar", () => {
    const bilinen = new Set([1, 2]);
    const services = [
      { id: 1, durum: "Bekliyor" },
      { id: 2, durum: "Yapılıyor" },
      { id: 3, durum: "Bekliyor" }, // yeni
    ];
    expect(yeniBekleyenler(bilinen, services)).toEqual([3]);
  });

  it("taban çizgisinde (tüm id'ler bilinen) hiç yeni yoktur — backlog ötmez", () => {
    const services = [
      { id: 1, durum: "Bekliyor" },
      { id: 2, durum: "Bekliyor" },
    ];
    const bilinen = new Set(services.map(s => s.id));
    expect(yeniBekleyenler(bilinen, services)).toEqual([]);
  });

  it("Bekliyor olmayan yeni servis alarm vermez (yalnız Bekliyor)", () => {
    const bilinen = new Set([1]);
    const services = [
      { id: 1, durum: "Bekliyor" },
      { id: 2, durum: "Yapılıyor" }, // yeni ama Bekliyor değil
      { id: 3, durum: "Tamamlandı" }, // yeni ama Bekliyor değil
    ];
    expect(yeniBekleyenler(bilinen, services)).toEqual([]);
  });

  it("panoda gizli (arşivli) yeni Bekliyor sayılmaz", () => {
    const bilinen = new Set();
    const services = [{ id: 5, durum: "Bekliyor", panoGizli: true }];
    expect(yeniBekleyenler(bilinen, services)).toEqual([]);
  });

  it("id'siz / bozuk kayıtları atlar, dizi olmayana boş döner", () => {
    expect(yeniBekleyenler(new Set(), [null, { durum: "Bekliyor" }, { id: 7, durum: "Bekliyor" }])).toEqual([7]);
    expect(yeniBekleyenler(new Set(), null)).toEqual([]);
  });

  it("bilinen küme dizi olarak da verilebilir", () => {
    expect(yeniBekleyenler([1], [{ id: 1, durum: "Bekliyor" }, { id: 2, durum: "Bekliyor" }])).toEqual([2]);
  });
});
