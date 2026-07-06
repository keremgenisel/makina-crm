// Çakışma birleştirme planı testleri — iki PC'nin aynı anda kayıt yapması senaryoları.
// buildMergePlan saf olduğu için doğrudan node/vitest altında koşar.
import { describe, it, expect, beforeEach } from "vitest";
import { buildMergePlan } from "../src/lib/merge";
import { uid, clearMintedIds, setIdCounter } from "../src/lib/utils";

const bosSunucu = { customers: [], teklifler: [], partSales: [], services: [], payments: [], uretimFormlari: [], faturalar: [] };
const blob = (parcalar) => ({ ...bosSunucu, ...parcalar });

beforeEach(() => {
  clearMintedIds();
  setIdCounter(1000); // her test bilinen bir sayaçtan başlasın (setIdCounter sadece ileri sarar)
});

describe("buildMergePlan", () => {
  it("girdi eksikse null döner", () => {
    expect(buildMergePlan(null, bosSunucu)).toBeNull();
    expect(buildMergePlan(bosSunucu, null)).toBeNull();
  });

  it("sunucuda olmayan yeni kayıt aynen eklenir", () => {
    const my = blob({ customers: [{ id: 501, name: "Yeni Müşteri", kaliplar: [] }] });
    const plan = buildMergePlan(my, bosSunucu);
    expect(plan.adds.customers).toHaveLength(1);
    expect(plan.adds.customers[0].id).toBe(501);
    expect(plan.adds.customers[0].name).toBe("Yeni Müşteri");
  });

  it("aynı ID + birebir aynı içerik atlanır (tekrar deneme durumu)", () => {
    const kayit = { id: 501, name: "Aynı", kaliplar: [] };
    const plan = buildMergePlan(blob({ customers: [kayit] }), blob({ customers: [{ ...kayit }] }));
    expect(plan.adds.customers).toHaveLength(0);
  });

  it("ID çarpışması: bu süreç ürettiyse yeni ID verilir ve referanslar düzeltilir", () => {
    const cid = uid(); // yerel süreç üretti (minted)
    const my = blob({
      customers: [{ id: cid, name: "Benim Müşterim", kaliplar: [] }],
      services:  [{ id: cid + 1, customerId: cid, type: "Garanti İçi" }],
      payments:  [{ id: cid + 2, customerId: cid, tutar: 100 }],
    });
    // Sunucuda AYNI ID'de FARKLI bir müşteri var (diğer PC kazandı)
    const server = blob({ customers: [{ id: cid, name: "Rakip Müşteri", kaliplar: [] }] });
    const plan = buildMergePlan(my, server);
    expect(plan.adds.customers).toHaveLength(1);
    const yeni = plan.adds.customers[0];
    expect(yeni.id).not.toBe(cid);           // yeni ID aldı
    expect(yeni.name).toBe("Benim Müşterim"); // kayıp yok
    // servise ve ödemeye yansıyan customerId düzeltildi
    expect(plan.adds.services[0].customerId).toBe(yeni.id);
    expect(plan.adds.payments[0].customerId).toBe(yeni.id);
  });

  it("ID çarpışması: ID bizim değilse (düzenleme çakışması) sunucu kazanır, eklenmez", () => {
    clearMintedIds(); // 700 bu süreçte üretilmedi
    const my = blob({ customers: [{ id: 700, name: "Yerel Düzenleme", kaliplar: [] }] });
    const server = blob({ customers: [{ id: 700, name: "Sunucu Hali", kaliplar: [] }] });
    const plan = buildMergePlan(my, server);
    expect(plan.adds.customers).toHaveLength(0);
  });

  it("seri no çakışması: kayıt 'seri no bekliyor' durumuna düşürülür ve uyarı listelenir", () => {
    const my = blob({ customers: [{ id: 501, name: "Kaybeden", serialNo: "SN-42", sourceStockId: 9, kaliplar: [] }] });
    const server = blob({ customers: [{ id: 400, name: "Kazanan", serialNo: "SN-42", kaliplar: [] }] });
    const plan = buildMergePlan(my, server);
    const c = plan.adds.customers[0];
    expect(c.serialNo).toBe("");
    expect(c.seriNoBekliyor).toBe(true);
    expect(c.sourceStockId).toBeNull();
    expect(plan.serialConflicts).toEqual([{ serialNo: "SN-42", name: "Kaybeden" }]);
    expect(plan.stockDeductIds.size).toBe(0); // çakışan müşteri stok düşürmez
  });

  it("çakışmasız eklemede stok düşümü korunur (sourceStockId toplanır)", () => {
    const my = blob({ customers: [{ id: 501, name: "Temiz", serialNo: "SN-99", sourceStockId: 77, kaliplar: [] }] });
    const plan = buildMergePlan(my, bosSunucu);
    expect(plan.adds.customers[0].serialNo).toBe("SN-99");
    expect([...plan.stockDeductIds]).toEqual([77]);
  });

  it("partSale ID'si yeniden atanınca müşteri kalıbındaki partSaleId da düzeltilir", () => {
    const pid = uid();
    const my = blob({
      partSales: [{ id: pid, customerId: 400, tur: "Kalıp", ad: "Hamburger" }],
      customers: [{ id: 501, name: "M", kaliplar: [{ ad: "Hamburger", partSaleId: pid }] }],
    });
    const server = blob({ partSales: [{ id: pid, customerId: 999, tur: "Kalıp", ad: "Başka" }] });
    const plan = buildMergePlan(my, server);
    const yeniPid = plan.adds.partSales[0].id;
    expect(yeniPid).not.toBe(pid);
    expect(plan.adds.customers[0].kaliplar[0].partSaleId).toBe(yeniPid);
  });
});
