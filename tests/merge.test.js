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

  it("spec 0022: iki PC aynı parti id'sini üretirse yeni parti eklenir ve satılmış makinanın damgalı bağı yeni id'yi izler", () => {
    const pid = uid(), cid = uid();
    const my = blob({ uretimPartileri: [{ id: pid, ad: "Benim partim", baslangicAy: "2026-01" }], customers: [{ id: cid, name: "F", model: "AK100", partiId: pid }] });
    const server = blob({ uretimPartileri: [{ id: pid, ad: "Onun partisi", baslangicAy: "2026-02" }], customers: [] });
    const plan = buildMergePlan(my, server);
    const yeniId = plan.adds.uretimPartileri[0].id;
    expect(yeniId).toBe(plan.maps.uretimPartileri.get(pid));
    expect(yeniId).not.toBe(pid);
    expect(plan.adds.customers[0].partiId).toBe(yeniId);
  });
  it("spec 0024: iki PC aynı hesap ve kalem id'sini üretirse hareket yeni kalem ve hesap id'lerini izler; tahsilatın hesabı da", () => {
    const hid = uid(), gid = uid(), mid = uid(), pid = uid();
    const my = blob({
      kasaHesaplari: [{ id: hid, ad: "Benim kasam", tur: "kasa", paraBirimi: "TRY" }],
      giderler: [{ id: gid, tarih: "2026-09-01", turId: 1, tutar: 100 }],
      hesapHareketleri: [{ id: mid, tur: "odeme", tarih: "2026-09-02", tutar: 100, giderId: gid, taksitId: 77, hesapId: hid },
        { id: uid(), tur: "virman", tarih: "2026-09-03", tutar: 10, hesapId: hid, karsiHesapId: 5 }],
      payments: [{ id: pid, customerId: 1, tutar: 50, hesapId: hid }],
    });
    const server = blob({ kasaHesaplari: [{ id: hid, ad: "Onun kasası", tur: "banka", paraBirimi: "TRY" }], giderler: [{ id: gid, tarih: "2026-09-05", turId: 1, tutar: 999 }], hesapHareketleri: [] });
    const plan = buildMergePlan(my, server);
    const yeniH = plan.maps.kasaHesaplari.get(hid), yeniG = plan.maps.giderler.get(gid);
    expect(yeniH).toBeDefined(); expect(yeniG).toBeDefined();
    expect(plan.adds.hesapHareketleri[0]).toMatchObject({ giderId: yeniG, hesapId: yeniH, taksitId: 77 });
    expect(plan.adds.hesapHareketleri[1]).toMatchObject({ hesapId: yeniH, karsiHesapId: 5 });
    expect(plan.adds.payments[0].hesapId).toBe(yeniH);
  });
  it("spec 0044 AC-29: servis, Extra Kalıp ve yedek parça tahsilatının hesabı yeniden atanan hesap kimliğini izler", () => {
    const hid = uid();
    const my = blob({
      kasaHesaplari: [{ id: hid, ad: "Benim kasam", tur: "kasa", paraBirimi: "TRY" }],
      services: [{ id: uid(), customerId: 1, odendi: true, hesapId: hid }, { id: uid(), customerId: 1, odendi: true }],
      partSales: [{ id: uid(), customerId: 1, tur: "Kalıp", odendi: true, hesapId: hid }],
      yedekParcaSatislar: [{ id: uid(), aliciTipi: "bayi", dealerId: 2, odendi: true, hesapId: hid, tahsisler: [] }],
    });
    const server = blob({ kasaHesaplari: [{ id: hid, ad: "Onun kasası", tur: "banka", paraBirimi: "TRY" }] });
    const plan = buildMergePlan(my, server);
    const yeniH = plan.maps.kasaHesaplari.get(hid);
    expect(yeniH).toBeDefined();
    expect(plan.adds.services.map(x => x.hesapId)).toEqual([yeniH, undefined]);
    expect(plan.adds.partSales[0].hesapId).toBe(yeniH);
    expect(plan.adds.yedekParcaSatislar[0].hesapId).toBe(yeniH);
  });
  it("spec 0040: çekin tahsilat bağı ve ciro hareketinin çek bağı yeniden atanan kimlikleri izler", () => {
    const pid = uid(), cid = uid(), hid = uid();
    const my = blob({ payments: [{ id: pid, customerId: 1, tutar: 5, yontem: "Çek" }], cekler: [{ id: cid, paymentId: pid, no: "1", banka: "Z", durum: "ciro", gecmis: [] }],
      hesapHareketleri: [{ id: hid, tur: "odeme", tutar: 5, giderId: 3, cekId: cid, hesapId: null }] });
    const server = blob({ payments: [{ id: pid, customerId: 2, tutar: 9, yontem: "Nakit" }], cekler: [{ id: cid, paymentId: 77, no: "9", banka: "Y", durum: "portfoy", gecmis: [] }], hesapHareketleri: [] });
    const plan = buildMergePlan(my, server);
    expect(plan.adds.cekler[0].paymentId).toBe(plan.maps.payments.get(pid));
    expect(plan.adds.hesapHareketleri[0].cekId).toBe(plan.maps.cekler.get(cid));
  });
  it("spec 0049 (C6, Q10): bağsız çekin paymentId'si null kalır; müşteri, banka hesabı ve alacaklı (tedarikçi/çalışan) yeniden atanır", () => {
    const cus = uid(), hes = uid(), ted = uid(), cal = uid(), c1 = uid(), c2 = uid(), c3 = uid();
    const my = blob({ customers: [{ id: cus, name: "Benim" }], kasaHesaplari: [{ id: hes, ad: "Benim banka" }], tedarikciler: [{ id: ted, ad: "Benim ted" }], calisanlar: [{ id: cal, ad: "Benim çal" }],
      cekler: [{ id: c1, yon: "alinan", paymentId: null, customerId: cus, no: "1", banka: "Z", durum: "portfoy", gecmis: [] },
        { id: c2, yon: "verilen", paymentId: null, hesapId: hes, alacakliTur: "tedarikci", alacakliId: ted, no: "2", banka: "Z", durum: "yazildi", gecmis: [] },
        { id: c3, yon: "verilen", paymentId: null, hesapId: hes, alacakliTur: "calisan", alacakliId: cal, no: "3", banka: "Z", durum: "yazildi", gecmis: [] }] });
    const server = blob({ customers: [{ id: cus, name: "Onun" }], kasaHesaplari: [{ id: hes, ad: "Onun banka" }], tedarikciler: [{ id: ted, ad: "Onun ted" }], calisanlar: [{ id: cal, ad: "Onun çal" }] });
    const plan = buildMergePlan(my, server);
    const [a, b, c] = plan.adds.cekler;
    expect(a.paymentId).toBeNull();
    expect(a.customerId).toBe(plan.maps.customers.get(cus));
    expect([b.hesapId, b.alacakliId]).toEqual([plan.maps.kasaHesaplari.get(hes), plan.maps.tedarikciler.get(ted)]);
    expect(c.alacakliId).toBe(plan.maps.calisanlar.get(cal));
  });
  it("spec 0024 B: avans ve mahsubun çalışan bağı yeniden atanan çalışan kimliğini izler", () => {
    const cid = uid(), aid = uid();
    const my = blob({ calisanlar: [{ id: cid, ad: "Benim çalışanım" }], hesapHareketleri: [{ id: aid, tur: "avans", tarih: "2026-09-02", tutar: 100, calisanId: cid, hesapId: null }] });
    const server = blob({ calisanlar: [{ id: cid, ad: "Onun çalışanı" }], hesapHareketleri: [] });
    const plan = buildMergePlan(my, server);
    expect(plan.adds.hesapHareketleri[0].calisanId).toBe(plan.maps.calisanlar.get(cid));
    expect(plan.adds.hesapHareketleri[0].calisanId).not.toBe(cid);
  });
  it("spec 0023 C7: ek ödeme satırları kimliksiz, kalemle birlikte taşınır", () => {
    const ekOdemeler = [{ tur: "prim", aciklama: "A", resmiTutar: 100, eldenTutar: null }, { tur: "prim", aciklama: "B", resmiTutar: null, eldenTutar: 50 }];
    const my = blob({ giderTurleri: [{ id: 11, ad: "Personel", davranis: "personel" }], giderler: [{ id: 15, turId: 11, resmiTutar: 1000, ekOdemeler }] });
    const plan = buildMergePlan(my, blob({ giderTurleri: [{ id: 11, ad: "Personel", davranis: "personel" }], giderler: [] }));
    expect(plan.adds.giderler[0].ekOdemeler).toEqual(ekOdemeler);
  });
  it("spec 0021 C8: gider ödeme satırları kalemle birlikte taşınır, kimlikleri ve durumları korunur", () => {
    const taksitler = [{ id: 7001, hedef: "ana", sira: 1, vade: "2026-10-15", tutar: 500, odendi: true, odemeTarihi: "2026-10-15" },
      { id: 7002, hedef: "ana", sira: 2, vade: "2026-11-15", tutar: 500, odendi: false, odemeTarihi: null }];
    const my = blob({ giderTurleri: [{ id: 11, ad: "Hammadde", davranis: "normal" }], giderler: [{ id: 14, turId: 11, tutar: 1000, modelSatirlari: [], taksitler }] });
    const plan = buildMergePlan(my, blob({ giderTurleri: [{ id: 11, ad: "Hammadde", davranis: "normal" }], giderler: [] }));
    expect(plan.adds.giderler[0].taksitler).toEqual(taksitler);
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
  it("spec 0006 AC-35: teklifin nihai müşterisi ve yedek parçanın belge bağı yeniden atanan kimlikleri izler; bayi kimliği değişmez", () => {
    const cid = uid(), tid = uid();
    const my = blob({
      customers: [{ id: cid, name: "Yerel", kaliplar: [] }],
      teklifler: [{ id: tid, type: "teklif", aliciTipi: "bayi", dealerId: 3, nihaiMusteriId: cid, uretilenKalemler: ["p1"], satirlar: [] }],
      yedekParcaSatislar: [{ id: 99201, aliciTipi: "bayi", dealerId: 3, partId: "7", miktar: 1, teklifId: tid, teklifKalemId: "p1", tahsisler: [] }],
    });
    const sunucu = blob({ customers: [{ id: cid, name: "Başka", kaliplar: [] }], teklifler: [{ id: tid, type: "teklif", satirlar: [] }], yedekParcaSatislar: [] });
    const plan = buildMergePlan(my, sunucu);
    const t = plan.adds.teklifler[0];
    expect(t.nihaiMusteriId).toBe(plan.maps.customers.get(cid));
    expect(t.dealerId).toBe(3);
    expect(t.uretilenKalemler).toEqual(["p1"]);
    expect(plan.adds.yedekParcaSatislar[0].teklifId).toBe(plan.maps.teklifler.get(tid));
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

// ── Spec 0077 C: silme birleştirmede korunur (taban ile, S2) ──────────────────────────────────────────────────
import { birlesmeTabaniKur, MERGE_KEYS, SILME_KORUNAN, KALICI_SILINEN, kimlikOf } from "../src/lib/merge";
import { readFileSync } from "node:fs";
import path from "node:path";
const kaynak = (f) => readFileSync(path.join(__dirname, "..", f), "utf-8").split("\n").filter(l => !l.trim().startsWith("//")).join("\n");

describe("Spec 0077 C: deletedAt birleştirmede korunur", () => {
  const SIL = "2026-10-07T09:00:00.000Z";
  const g = (id, o = {}) => ({ id, tarih: "2026-09-01", turId: 4, tutar: 100, ...o });
  it("AC-18, AC-56: yerelde silinmiş (tabanda canlı), sunucuda canlı kayıt silinmiş kalır; ayrı silmeler çıktısı, adds'e girmez", () => {
    const taban = birlesmeTabaniKur({ giderler: [g(1)] });
    const plan = buildMergePlan(blob({ giderler: [g(1, { deletedAt: SIL })] }), blob({ giderler: [g(1, { aciklama: "başkası düzenledi" })] }), { taban });
    expect(plan.silmeler.giderler.get(1)).toBe(SIL);
    expect(plan.adds.giderler).toEqual([]);
  });
  it("AC-19: yerelde çöpten geri alınmış (tabanda silinmiş), sunucuda silinmiş kayıt geri alınmış kalır", () => {
    const taban = birlesmeTabaniKur({ customers: [{ id: 5, name: "A", deletedAt: SIL }] });
    const plan = buildMergePlan(blob({ customers: [{ id: 5, name: "A", deletedAt: null }] }), blob({ customers: [{ id: 5, name: "A", deletedAt: SIL }] }), { taban });
    expect(plan.silmeler.customers.get(5)).toBeNull();
  });
  it("S2: başka PC'nin silmesi diriltilmez (yerel değer tabanla aynı = bu PC dokunmadı); tabansızda kural çalışmaz", () => {
    const taban = birlesmeTabaniKur({ giderler: [g(2)] });
    const plan = buildMergePlan(blob({ giderler: [g(2)] }), blob({ giderler: [g(2, { deletedAt: SIL })] }), { taban });
    expect(plan.silmeler.giderler).toBeUndefined();
    const p2 = buildMergePlan(blob({ giderler: [g(3, { deletedAt: SIL })] }), blob({ giderler: [g(3)] }));
    expect(p2.silmeler.giderler).toBeUndefined();
  });
  it("AC-20, AC-21: peş peşe silinen on gider kalemi ve evrak kayıtları geri gelmez", () => {
    const on = Array.from({ length: 10 }, (_, i) => g(100 + i));
    const evrak = [{ id: 201, tur: "teklif" }, { id: 202, tur: "proforma" }];
    const fatura = [{ id: 301, no: "F1" }];
    const taban = birlesmeTabaniKur({ giderler: on, teklifler: evrak, faturalar: fatura });
    const my = blob({ giderler: on.map(x => ({ ...x, deletedAt: SIL })), teklifler: evrak.map(x => ({ ...x, deletedAt: SIL })), faturalar: fatura.map(x => ({ ...x, deletedAt: SIL })) });
    const sunucu = blob({ giderler: [...on, g(999)], teklifler: evrak, faturalar: fatura }); // başkası araya bir kalem eklemiş
    const plan = buildMergePlan(my, sunucu, { taban });
    expect([...plan.silmeler.giderler.keys()].sort()).toEqual(on.map(x => x.id));
    expect([...plan.silmeler.teklifler.keys()].sort()).toEqual([201, 202]);
    expect([...plan.silmeler.faturalar.keys()]).toEqual([301]);
  });
  it("AC-22: müşteri kaskadının bütün çocukları (servis, tahsilat, kalıp satışı, görüşme, dosya) silinmiş kalır", () => {
    const tb = { customers: [{ id: 1 }], services: [{ id: 2, customerId: 1 }], payments: [{ id: 3, customerId: 1 }], partSales: [{ id: 4, customerId: 1 }], gorusmeler: [{ id: 5, customerId: 1 }], dosyalar: [{ id: 6, customerId: 1 }] };
    const sil = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.map(x => ({ ...x, deletedAt: SIL }))]));
    const plan = buildMergePlan(blob(sil(tb)), blob({ ...tb, customers: [{ id: 1, telefon: "yeni" }] }), { taban: birlesmeTabaniKur(tb) });
    for (const k of Object.keys(tb)) expect(plan.silmeler[k]?.size, k).toBe(1);
  });
  it("AC-23: deletedAt dışındaki alanlarda sunucu kazanır (yerel düzenleme eklenmez, silme çıktısına girmez)", () => {
    const taban = birlesmeTabaniKur({ giderler: [g(7)] });
    const plan = buildMergePlan(blob({ giderler: [g(7, { tutar: 555 })] }), blob({ giderler: [g(7, { tutar: 444 })] }), { taban });
    expect(plan.adds.giderler).toEqual([]);
    expect(plan.silmeler.giderler).toBeUndefined();
  });
  it("AC-24, X1: kural merge.js'te; bileşenlerde deletedAt birleştirme dalı yok; kalıcı silinen bölümler kapsam dışı", () => {
    expect(kaynak("src/App.jsx")).not.toMatch(/existing\.deletedAt|sunucu\.deletedAt/);
    expect([...KALICI_SILINEN].every(k => !SILME_KORUNAN.includes(k))).toBe(true);
    expect(SILME_KORUNAN).toEqual(expect.arrayContaining(["customers", "giderler", "teklifler", "dealers", "notes"]));
  });
});

// ── Spec 0077 E: birleştirmeye alınan yedi bölüm ────────────────────────────────────────────────────────────
describe("Spec 0077 E: yedi bölüm", () => {
  it("AC-36–AC-40: çakışmada yeni bayi, not, stok satırı, parça, kalıp tanımı, parça türü ve özel model kaybolmaz", () => {
    const my = blob({ dealers: [{ id: 41, name: "Yeni Bayi" }], notes: [{ id: 1759800000000, content: "not" }], stock: [{ id: 42, model: "AK100", serialNo: "S9" }],
      parts: [{ id: 43, ad: "Rulman" }], kalipDefs: [{ id: 44, ad: "Burger" }], partTypeDefs: [{ id: "tip_1", ad: "Elektrik" }], customModels: [{ model: "AK999", kapasite: "1" }] });
    const plan = buildMergePlan(my, blob({ customModels: [{ model: "AK100X" }] }));
    for (const k of ["dealers", "notes", "stock", "parts", "kalipDefs", "partTypeDefs", "customModels"]) expect(plan.adds[k], k).toHaveLength(1);
    expect(plan.adds.customModels[0].model).toBe("AK999");
  });
  it("AC-40 (S3): özel modelin kimliği adıdır; aynı adlı model eklenmez ve yeniden kimliklendirilmez", () => {
    const plan = buildMergePlan(blob({ customModels: [{ model: "AK100X", kapasite: "2" }] }), blob({ customModels: [{ model: "AK100X", kapasite: "1" }] }));
    expect(plan.adds.customModels).toEqual([]);
    expect(kimlikOf("customModels", { model: "X", id: 3 })).toBe("X");
  });
  it("AC-45: bayi ve not silmeleri de korunur (C kuralı yeni bölümleri kapsar)", () => {
    const SIL = "2026-10-07T09:00:00.000Z";
    const tb = { dealers: [{ id: 41, name: "B" }], notes: [{ id: 51, content: "n" }] };
    const plan = buildMergePlan(blob({ dealers: [{ id: 41, name: "B", deletedAt: SIL }], notes: [{ id: 51, content: "n", deletedAt: SIL }] }), blob(tb), { taban: birlesmeTabaniKur(tb) });
    expect(plan.silmeler.dealers.get(41)).toBe(SIL);
    expect(plan.silmeler.notes.get(51)).toBe(SIL);
  });
  it("AC-41: bayi kimliği yeniden atanınca teklif, dosya ve yedek parça satışı bağı taşınır; ad alanlarına dokunulmaz", () => {
    const bayi = uid();
    const my = blob({ dealers: [{ id: bayi, name: "Bizim" }], teklifler: [{ id: uid(), dealerId: bayi }], dosyalar: [{ id: uid(), dealerId: bayi }],
      yedekParcaSatislar: [{ id: uid(), dealerId: bayi, tahsisler: [] }], partSales: [{ id: uid(), satisFirma: "Bizim" }], services: [{ id: uid(), islemFirma: "Bizim" }] });
    const plan = buildMergePlan(my, blob({ dealers: [{ id: bayi, name: "Onların" }] }));
    const yeni = plan.maps.dealers.get(bayi);
    expect(yeni).toBeTruthy();
    expect([plan.adds.teklifler[0].dealerId, plan.adds.dosyalar[0].dealerId, plan.adds.yedekParcaSatislar[0].dealerId]).toEqual([yeni, yeni, yeni]);
    expect(plan.adds.partSales[0].satisFirma).toBe("Bizim");
    expect(plan.adds.services[0].islemFirma).toBe("Bizim");
  });
  it("AC-42: stok kimliği yeniden atanınca müşterinin sourceStockId'si ve makina_uretimi hareketi taşınır", () => {
    const st = uid();
    const my = blob({ stock: [{ id: st, model: "A", serialNo: "S1" }], customers: [{ id: uid(), sourceStockId: st, kaliplar: [] }],
      partStockLog: [{ id: uid(), partId: "7", miktar: -1, tip: "makina_uretimi", referansId: st, tarih: "2026-10-01" }] });
    const plan = buildMergePlan(my, blob({ stock: [{ id: st, model: "B", serialNo: "S2" }] }));
    const yeni = plan.maps.stock.get(st);
    expect(plan.adds.customers[0].sourceStockId).toBe(yeni);
    expect(plan.adds.partStockLog[0].referansId).toBe(yeni);
  });
  it("AC-43, AC-44, AC-47 (S9): parça kimliği yeniden atanınca stok hareketi, satış ve servis alt dizisi taşınır; adet hareketten doğar, satır iki kez gelmez", () => {
    const p = uid();
    const my = blob({ parts: [{ id: p, ad: "Bizim parça" }], partStock: [{ id: 1, partId: String(p), miktar: 5 }],
      partStockLog: [{ id: uid(), partId: String(p), miktar: 5, tip: "stok_girisi", tarih: "2026-10-01" }],
      yedekParcaSatislar: [{ id: uid(), partId: String(p), tahsisler: [] }], services: [{ id: uid(), degisenParcalar: [{ partId: p, adet: 1 }] }] });
    const plan = buildMergePlan(my, blob({ parts: [{ id: p, ad: "Onların" }] }));
    const yeni = plan.maps.parts.get(p);
    expect(plan.adds.partStockLog[0].partId).toBe(String(yeni));
    expect(plan.adds.yedekParcaSatislar[0].partId).toBe(String(yeni));
    expect(plan.adds.services[0].degisenParcalar[0].partId).toBe(yeni);
    expect(plan.stokEtkisi.get(String(yeni))).toMatchObject({ fark: 5 });
    expect(plan.parcaStoklari).toEqual([]); // hareketi var: adet etkiden doğar
    expect(MERGE_KEYS).not.toContain("partStock");
  });
  it("AC-44 (S9): hareketi olmayan yeniden kimliklendirilmiş parçanın stok satırı yeni kimlikle eklenir", () => {
    const p = uid();
    const plan = buildMergePlan(blob({ parts: [{ id: p, ad: "X" }], partStock: [{ id: 1, partId: String(p), miktar: 3 }] }), blob({ parts: [{ id: p, ad: "Y" }] }));
    const yeni = plan.maps.parts.get(p);
    expect(plan.parcaStoklari).toHaveLength(1);
    expect(plan.parcaStoklari[0]).toMatchObject({ partId: String(yeni), miktar: 3 });
  });
  it("AC-46 (S8): firma bilgisi yalnız bu PC'de değiştiyse yeniden yüklenen kopyanın üstüne yazılır", () => {
    const tb = birlesmeTabaniKur({ factory: { name: "Altuntaş", city: "Konya" } });
    expect(buildMergePlan(blob({ factory: { name: "Altuntaş", city: "Ankara" } }), blob({ factory: { name: "Altuntaş", city: "Konya" } }), { taban: tb }).firma).toEqual({ name: "Altuntaş", city: "Ankara" });
    expect(buildMergePlan(blob({ factory: { name: "Altuntaş", city: "Konya" } }), blob({ factory: { name: "Altuntaş", city: "İzmir" } }), { taban: tb }).firma).toBeNull();
  });
  it("AC-59, AC-60: standardModels listede yok; yeni yedi bölümün App'te apply ve silme satırı var", () => {
    expect(MERGE_KEYS).not.toContain("standardModels");
    const a = kaynak("src/App.jsx");
    for (const [set, k] of [["setDealers", "dealers"], ["setNotes", "notes"], ["setStock", "stock"], ["setParts", "parts"], ["setKalipDefs", "kalipDefs"], ["setPartTypeDefs", "partTypeDefs"], ["setCustomModels", "customModels"]]) {
      expect(a, k).toContain(`apply(${set}, "${k}");`);
      expect(a, k).toContain(`silmeUygula(${set}, "${k}");`);
    }
    for (const k of SILME_KORUNAN) expect(a, k).toMatch(new RegExp(`silmeUygula\\(set\\w+, "${k}"\\)`));
  });
});

describe("Spec 0077 AC-48: bugünkü bölümlerin birleştirme davranışı değişmedi", () => {
  it("AC-48: eski bölümlerde ekleme korunur, bu oturumda üretilmemiş kimlik çakışmasında sunucu kopyası kalır, tabansız çağrıda silme kararı yok", () => {
    const my = blob({
      customers: [{ id: 501, name: "Yeni Müşteri" }, { id: 7, name: "Yerel düzenleme" }],
      services: [{ id: 502, customerId: 501, type: "Bakım" }],
      giderler: [{ id: 503, tutar: 100, deletedAt: "2026-10-07" }],
    });
    const sunucu = blob({ customers: [{ id: 7, name: "Sunucu adı" }], giderler: [{ id: 503, tutar: 100 }] });
    const plan = buildMergePlan(my, sunucu);
    expect(plan.adds.customers.map(c => c.id)).toEqual([501]);
    expect(plan.adds.services.map(s => s.customerId)).toEqual([501]);
    expect(plan.adds.giderler).toEqual([]);          // var olan kayıt: sunucu kopyası kalır (X2)
    expect(plan.silmeler).toEqual({});               // taban yoksa deletedAt kararı yok (eski çıktı)
    expect(plan.maps.customers.size).toBe(0);
  });
});

describe("Spec 0077 triyaj (bulgu 1): sunucunun diziden çıkardığı kayıt birleştirmede geri eklenmez", () => {
  it("B makinayı sattı (stok satırı sunucudan çıktı), A eski kopyayla çakıştı: makina stoğa dönmez, A'nın kendi yeni satırı eklenir", () => {
    const X = { id: 11, model: "AK100", serialNo: "S11" };
    const taban = birlesmeTabaniKur(blob({ stock: [X] }));
    const yeniSatir = { id: uid(), model: "AK200", serialNo: "S12" };
    const my = blob({ stock: [X, yeniSatir], notes: [{ id: uid(), content: "A'nın notu" }] });
    const sunucu = blob({ stock: [], customers: [{ id: 70, name: "B'nin müşterisi", serialNo: "S11", sourceStockId: 11 }] });
    const plan = buildMergePlan(my, sunucu, { taban });
    expect(plan.adds.stock.map(s => s.serialNo)).toEqual(["S12"]);
    expect([...plan.stockDeductIds]).toEqual([]);
    expect(plan.adds.notes).toHaveLength(1);
  });
  it("çöpü boşaltılmış ya da temizlenmiş kayıt (tabanda var, sunucuda yok) yeni bölümlerde de dirilmez; tabansız çağrı eski davranış", () => {
    const B = { id: 21, name: "Silinen Bayi", deletedAt: "2026-09-01" };
    const taban = birlesmeTabaniKur(blob({ dealers: [B], customers: [{ id: 22, name: "Eski", deletedAt: "2026-08-01" }] }));
    const my = blob({ dealers: [B], customers: [{ id: 22, name: "Eski", deletedAt: "2026-08-01" }] });
    const plan = buildMergePlan(my, blob({}), { taban });
    expect(plan.adds.dealers).toEqual([]);
    expect(plan.adds.customers).toEqual([]);
    expect(buildMergePlan(my, blob({})).adds.dealers.map(d => d.id)).toEqual([21]);
  });
});
