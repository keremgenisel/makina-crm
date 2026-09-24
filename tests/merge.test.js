// Çakışma birleştirme planı testleri — iki PC'nin aynı anda kayıt yapması senaryoları.
// buildMergePlan saf olduğu için doğrudan node/vitest altında koşar.
import { describe, it, expect, beforeEach } from "vitest";
import { buildMergePlan } from "../src/lib/merge";
import { uid, clearMintedIds, setIdCounter } from "../src/lib/utils";

const bosSunucu = { customers: [], teklifler: [], partSales: [], services: [], payments: [], gorusmeler: [], dosyalar: [], uretimFormlari: [], faturalar: [] };
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

  it("yeni firma çalışanı (calisanlar) birleştirmede korunur", () => {
    // Regresyon: calisanlar MERGE_KEYS'te yoktu; sunucu-PC yeniden yükle+birleştirmede
    // yeni eklenen çalışan düşüyor, "bir süre sonra kayboluyor"du.
    const my = blob({ calisanlar: [{ id: 777, ad: "Ahmet Usta" }] });
    const plan = buildMergePlan(my, blob({ calisanlar: [] }));
    expect(plan.adds.calisanlar).toHaveLength(1);
    expect(plan.adds.calisanlar[0].ad).toBe("Ahmet Usta");
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

  it("eş zamanlı dosya eklemede yerel dosya künyesi korunur (kaybolmaz)", () => {
    const my = blob({ dosyalar: [{ id: 800, customerId: 501, refType: "makina", refId: null, ad: "x.pdf", dosyaAdi: "k-x.pdf" }] });
    const plan = buildMergePlan(my, bosSunucu);
    expect(plan.adds.dosyalar).toHaveLength(1);
    expect(plan.adds.dosyalar[0].ad).toBe("x.pdf");
  });

  it("ID çarpışmasında dosya bağı (refId) yeni servis ID'sine remap edilir", () => {
    const sid = uid(); // yerel servis id (minted)
    const my = blob({
      services: [{ id: sid, customerId: 501, type: "Garanti Dışı" }],
      dosyalar: [{ id: sid + 1, customerId: 501, refType: "servis", refId: sid, ad: "form.pdf", dosyaAdi: "k-form.pdf" }],
    });
    const server = blob({ services: [{ id: sid, customerId: 501, type: "Başka" }] }); // aynı id, farklı servis
    const plan = buildMergePlan(my, server);
    const yeniSid = plan.adds.services[0].id;
    expect(yeniSid).not.toBe(sid);
    expect(plan.adds.dosyalar[0].refId).toBe(yeniSid); // dosya bağı yeni servise işaret eder
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

  it("görüşme kaydı birleştirmede korunur ve customerId remap edilir", () => {
    const cid = uid();
    const my = blob({
      customers: [{ id: cid, name: "Benim", kaliplar: [] }],
      gorusmeler: [{ id: cid + 5, customerId: cid, tur: "Telefon", not: "ara" }],
    });
    const server = blob({ customers: [{ id: cid, name: "Rakip", kaliplar: [] }] });
    const plan = buildMergePlan(my, server);
    expect(plan.adds.gorusmeler[0].customerId).toBe(plan.adds.customers[0].id);
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

  it("yeni yedek parça satışı birleştirmede korunur (adds)", () => {
    const my = blob({ yedekParcaSatislar: [{ id: 601, dealerId: 5, partId: "7", miktar: 5, tahsisler: [] }] });
    const plan = buildMergePlan(my, blob({ yedekParcaSatislar: [] }));
    expect(plan.adds.yedekParcaSatislar).toHaveLength(1);
    expect(plan.adds.yedekParcaSatislar[0].miktar).toBe(5);
  });

  it("müşteri ID'si yeniden atanınca yedek parça tahsisinin customerId'si de remap edilir", () => {
    const cid = uid();
    const my = blob({
      customers: [{ id: cid, name: "Benim", kaliplar: [] }],
      yedekParcaSatislar: [{ id: cid + 9, dealerId: 5, partId: "7", miktar: 5, tahsisler: [{ miktar: 2, customerId: cid, serialNo: "SN1" }] }],
    });
    const server = blob({ customers: [{ id: cid, name: "Rakip", kaliplar: [] }] });
    const plan = buildMergePlan(my, server);
    expect(plan.adds.yedekParcaSatislar[0].tahsisler[0].customerId).toBe(plan.adds.customers[0].id);
  });

  it("müşteri ID'si yeniden atanınca alıcı-müşteri (musteriId) de remap edilir", () => {
    const cid = uid();
    const my = blob({
      customers: [{ id: cid, name: "Benim", kaliplar: [] }],
      yedekParcaSatislar: [{ id: cid + 9, aliciTipi: "musteri", musteriId: cid, partId: "7", miktar: 3, tahsisler: [] }],
    });
    const server = blob({ customers: [{ id: cid, name: "Rakip", kaliplar: [] }] });
    const plan = buildMergePlan(my, server);
    expect(plan.adds.yedekParcaSatislar[0].musteriId).toBe(plan.adds.customers[0].id);
  });
});

describe("buildMergePlan: gider kaydı (spec 0001)", () => {
  it("C5: yeni gider kalemi, tanım, tür, tedarikçi ve standart gider birleştirmede korunur", () => {
    const my = blob({
      giderTurleri: [{ id: 11, ad: "Hammadde", davranis: "normal" }],
      tedarikciler: [{ id: 12, ad: "A" }],
      giderTanimlari: [{ id: 13, turId: 11, ad: "Sarf", baslangicAy: "2026-09", uretilenAylar: [] }],
      giderler: [{ id: 14, turId: 11, tutar: 1000, modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 100, adet: 5 }] }],
      standartGiderler: [{ id: 15, grupId: 15, ad: "Kira", tutar: 20000, baslangicAy: "2026-01" }],
    });
    const plan = buildMergePlan(my, blob({ giderTurleri: [], tedarikciler: [], giderTanimlari: [], giderler: [], standartGiderler: [] }));
    for (const k of ["giderTurleri", "tedarikciler", "giderTanimlari", "giderler", "standartGiderler"]) expect(plan.adds[k]).toHaveLength(1);
    expect(plan.adds.giderler[0].modelSatirlari).toHaveLength(1);
  });

  it("iki PC aynı id'yi üretirse tür/tedarikçi/tanım/müşteri referansları yeni id'yi izler", () => {
    const turId = uid(), tedId = uid(), tanimId = uid(), cid = uid(), sgId = uid();
    const my = blob({
      customers: [{ id: cid, name: "Yerel", kaliplar: [] }],
      giderTurleri: [{ id: turId, ad: "Yerel tür", davranis: "normal" }],
      tedarikciler: [{ id: tedId, ad: "Yerel ted" }],
      giderTanimlari: [{ id: tanimId, turId, tedarikciId: tedId, ad: "T" }],
      giderler: [{ id: 99001, turId, tedarikciId: tedId, tanimId, atamaTur: "makina", makinaTur: "musteri", makinaId: cid }],
      standartGiderler: [{ id: sgId, grupId: sgId, ad: "Kira", tutar: 1 }, { id: 99002, grupId: sgId, ad: "Kira", tutar: 2 }],
    });
    const sunucu = blob({
      customers: [{ id: cid, name: "Başkası", kaliplar: [] }],
      giderTurleri: [{ id: turId, ad: "Başka tür", davranis: "kira" }],
      tedarikciler: [{ id: tedId, ad: "Başka ted" }],
      giderTanimlari: [{ id: tanimId, ad: "Başka" }],
      giderler: [],
      standartGiderler: [{ id: sgId, grupId: sgId, ad: "Başka", tutar: 9 }],
    });
    const plan = buildMergePlan(my, sunucu);
    const g = plan.adds.giderler[0];
    expect(g.turId).toBe(plan.maps.giderTurleri.get(turId));
    expect(g.tedarikciId).toBe(plan.maps.tedarikciler.get(tedId));
    expect(g.tanimId).toBe(plan.maps.giderTanimlari.get(tanimId));
    expect(g.makinaId).toBe(plan.maps.customers.get(cid));
    expect(plan.adds.giderTanimlari[0].turId).toBe(plan.maps.giderTurleri.get(turId));
    expect(plan.adds.standartGiderler.find(x => x.id === 99002).grupId).toBe(plan.maps.standartGiderler.get(sgId));
  });
  it("triyaj bulgu 5: personel kalemi ve tanımındaki calisanId yeniden atanan çalışan id'sini izler", () => {
    const calId = uid(), tanimId = uid();
    const my = blob({
      calisanlar: [{ id: calId, ad: "Yerel Usta" }],
      giderTanimlari: [{ id: tanimId, turId: 1, calisanId: calId, ad: "Maaş" }],
      giderler: [{ id: 99101, turId: 1, calisanId: calId, tanimId }, { id: 99102, turId: 1, tutar: 5 }],
    });
    const sunucu = blob({ calisanlar: [{ id: calId, ad: "Başka Usta" }], giderTanimlari: [], giderler: [] });
    const plan = buildMergePlan(my, sunucu);
    const yeniCal = plan.maps.calisanlar.get(calId);
    expect(yeniCal).toBeDefined();
    expect(yeniCal).not.toBe(calId);
    expect(plan.adds.giderler.find(g => g.id === 99101).calisanId).toBe(yeniCal);
    expect(plan.adds.giderTanimlari[0].calisanId).toBe(yeniCal);
    expect(plan.adds.giderler.find(g => g.id === 99102).calisanId ?? null).toBeNull();
  });
});
