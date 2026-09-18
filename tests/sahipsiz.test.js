// Sahipsiz (yetim) kayıt yardımcıları (lib/sahipsiz.js): tespit listesi + Finans/rapor süzgeci.
import { describe, it, expect } from "vitest";
import { sahipsizKayitlar, sahipsizHaric, musteriBagi, sahipsizMi, musteriIdSeti } from "../src/lib/sahipsiz";

const customers = [{ id: 1, name: "Var" }, { id: 2, name: "Çöpte", deletedAt: "2026-09-01" }];
const veri = {
  customers,
  services: [{ id: 10, customerId: 1 }, { id: 11, customerId: 999 }, { id: 12, customerId: 999, deletedAt: "x" }, { id: 13, customerId: 2 }, { id: 14 }],
  partSales: [{ id: 20, customerId: 999, tur: "Kalıp" }],
  yedekParcaSatislar: [
    { id: 30, aliciTipi: "musteri", musteriId: 999 },
    { id: 31, aliciTipi: "bayi", dealerId: 5, tahsisler: [{ customerId: 999 }] }, // bayi alımı → müşteri bağı yok
    { id: 32, disFirma: true, disFirmaAd: "Dış", musteriId: 999 },                  // dış firma → bağ yok
    { id: 33, aliciTipi: "musteri", musteriId: 1 },
  ],
  payments: [{ id: 40, customerId: 999 }, { id: 41, customerId: 1 }],
};

describe("sahipsizKayitlar (araç)", () => {
  it("müşterisi hiçbir kayıtla eşleşmeyen canlı kayıtları türüyle listeler; çöpteki müşteri eşleşme sayılır", () => {
    const l = sahipsizKayitlar(veri);
    expect(l.map(x => `${x.tur}:${x.kayit.id}`)).toEqual(["servis:11", "kalip:20", "yedekParca:30", "odeme:40"]);
    expect(l.every(x => x.musteriId === 999)).toBe(true);
  });
  it("boş/eksik veriyle patlamaz; customerId'siz kayıt sahipsiz değildir", () => {
    expect(sahipsizKayitlar()).toEqual([]);
    expect(sahipsizKayitlar({ services: [{ id: 1 }] })).toEqual([]);
    expect(musteriBagi("servis", { id: 1 })).toBeNull();
    expect(musteriBagi("yedekParca", { aliciTipi: "bayi", musteriId: 5 })).toBeNull();
    expect(sahipsizMi("servis", { customerId: "1" }, musteriIdSeti([{ id: 1 }]))).toBe(false); // string/number farkı eşleşir
  });
});

describe("sahipsizHaric (Finans + rapor süzgeci)", () => {
  it("canlı müşteri kümesinde olmayan müşteriye bağlı kayıtları düşürür, bayi/dış firma satışlarını korur, adet sayar", () => {
    const canli = customers.filter(c => !c.deletedAt);
    const r = sahipsizHaric(canli, {
      services: veri.services.filter(s => !s.deletedAt), partSales: veri.partSales, yedekParcaSatislar: veri.yedekParcaSatislar, payments: veri.payments,
    });
    expect(r.services.map(s => s.id)).toEqual([10, 14]);      // 11 sahipsiz, 13 çöpteki müşterinin (canlı değil) → düşer
    expect(r.partSales).toEqual([]);
    expect(r.yedekParcaSatislar.map(s => s.id)).toEqual([31, 32, 33]);
    expect(r.payments.map(p => p.id)).toEqual([41]);
    expect(r.sahipsizAdet).toBe(5); // 11, 13, 20, 30, 40
  });
  it("silinmiş sahipsiz kayıt adede girmez ama yine düşürülür", () => {
    const r = sahipsizHaric([{ id: 1 }], { services: [{ id: 12, customerId: 999, deletedAt: "x" }] });
    expect(r.services).toEqual([]);
    expect(r.sahipsizAdet).toBe(0);
  });
});
