// Sunucu tarafı yazma yetkisi (electron/serverAuth.cjs) — saf mantık testleri.
// Regresyon: salt-okunur/kısıtlı bir kullanıcı, izin sistemi yalnızca arayüzde
// çalıştığı için elle HTTP isteğiyle tüm veriyi ezebiliyordu; sunucu artık
// değişen bölümleri kullanıcının iznine göre denetliyor.
import { describe, it, expect } from "vitest";
import {
  BLOB_SECTIONS, SECTION_GROUP, BOLUM_SEKMELERI, AYAR_ALAN_SEKMELERI,
  degisenBolumler, kisitliMi, yazmaYetkisiVar, eylemDenetimi, EYLEM_IDLERI, ALAN_IZINLERI, dosyaIslemYetkisi, dosyaSilmeYetkisi, sonAdminiDusururMu,
  GIDER_BOLUMLERI, giderAynaEngeli, cekYalnizCiroMu, cekYalnizBagsizMi, tahsilatHesabiYalnizMi, hesapTasimaYazimiMi, denemeDonemiAcikSunucu,
} from "../electron/serverAuth.cjs";
import { READONLY_SERVER_PERMISSIONS } from "../src/lib/permissions.js";
import { ALL_TABS, DEFAULT_USER_TABS } from "../src/components/settings/serverPermissionDefs.js";

const READONLY = READONLY_SERVER_PERMISSIONS.permissions;
// Arayüzün "Kullanıcı Ekle" formunun ürettiği izin gövdesi: yalnız tabs (UserManager.jsx handleAdd).
const YENI_KULLANICI = JSON.stringify({ tabs: DEFAULT_USER_TABS });

describe("degisenBolumler", () => {
  it("yalnızca gerçekten değişen bölümleri döndürür", () => {
    const eski = { customers: [{ id: 1, name: "A" }], notes: [{ id: 9, text: "n" }] };
    const yeni = { customers: [{ id: 1, name: "B" }], notes: [{ id: 9, text: "n" }] };
    expect(degisenBolumler(eski, yeni)).toEqual(["customers"]);
  });

  it("alan sırası farkını değişiklik saymaz (kararlı karşılaştırma)", () => {
    const eski = { customers: [{ id: 1, name: "A", city: "X" }] };
    const yeni = { customers: [{ city: "X", name: "A", id: 1 }] };
    expect(degisenBolumler(eski, yeni)).toEqual([]);
  });

  it("REGRESYON: undefined değerli alan, JSON'da hiç olmayan alanla aynı sayılır", () => {
    // Veritabanından okunan kayıtta satisTamam: undefined (toBoolTriState) var; istemci JSON'la geri
    // gönderdiğinde anahtar hiç yok. Eskiden bu fark bölümü "değişmiş" gösteriyor, sekmesi kısıtlı
    // kullanıcı değişiklik yapmadığı teklifler/müşteriler yüzünden her kayıtta 403 alıyordu.
    const db = { teklifler: [{ id: 1, no: "T-1", satisTamam: undefined }], customers: [{ id: 2, bayiMi: undefined, ad: "A" }] };
    const istemci = JSON.parse(JSON.stringify(db));
    expect(degisenBolumler(db, istemci)).toEqual([]);
    expect(yazmaYetkisiVar(JSON.stringify({ tabs: ["gider"] }), "user", degisenBolumler(db, istemci), db, istemci).ok).toBe(true);
  });

  it("istemcinin göndermediği (undefined) bölüm dokunulmamış sayılır", () => {
    const eski = { customers: [{ id: 1 }], teklifler: [{ id: 5 }] };
    const yeni = { customers: [{ id: 1 }] }; // teklifler yok
    expect(degisenBolumler(eski, yeni)).toEqual([]);
  });
});

describe("kisitliMi", () => {
  it("admin ve izinsiz kullanıcı kısıtlı değil (pahalı denetim atlanır)", () => {
    expect(kisitliMi(null, "admin")).toBe(false);
    expect(kisitliMi(READONLY, "admin")).toBe(false); // admin izinleri yok sayar
    expect(kisitliMi(null, "user")).toBe(false);
  });
  it("salt-okunur kullanıcı kısıtlıdır", () => {
    expect(kisitliMi(READONLY, "user")).toBe(true);
  });

  // REGRESYON (kritik): arayüzle oluşturulan kullanıcının izin gövdesinde YALNIZ tabs vardır.
  // Sunucu tabs'ı tanımadığı için 6 eylem grubu da tanımsız kalıyor, kisitliMi false dönüyor ve
  // üç katmanlı yazma denetiminin TAMAMI atlanıyordu: "Ayarlar sekmesi kapalı" diye oluşturulan
  // kullanıcı curl ile KDV oranını/fabrika bilgisini değiştirebiliyordu.
  it("yalnız tabs taşıyan (arayüzle oluşturulan) kullanıcı kısıtlıdır", () => {
    expect(kisitliMi(YENI_KULLANICI, "user")).toBe(true);
    expect(kisitliMi(JSON.stringify({ tabs: ["dashboard"] }), "user")).toBe(true);
  });

  it("tüm sekmeleri açık ve grup kısıtı olmayan kullanıcı kısıtlı değildir", () => {
    expect(kisitliMi(JSON.stringify({ tabs: ALL_TABS.map(t => t.id) }), "user")).toBe(false);
  });
});

describe("sekme (tabs) düzeyi yazma kısıtı", () => {
  it("varsayılan yeni kullanıcı (Ayarlar sekmesi kapalı) ayar bölümlerini yazamaz", () => {
    for (const bolum of ["kalipDefs", "partTypeDefs", "standardModels", "customModels", "factory"]) {
      const r = yazmaYetkisiVar(YENI_KULLANICI, "user", [bolum], {}, {});
      expect(r.ok, `${bolum} reddedilmeli`).toBe(false);
      expect(r.reddedilenBolum).toBe(bolum);
    }
  });

  it("varsayılan yeni kullanıcı açık sekmelerinin bölümlerini yazabilir (meşru kullanım kırılmaz)", () => {
    for (const bolum of ["customers", "services", "dealers", "stock", "notes", "teklifler", "uretimFormlari"]) {
      expect(yazmaYetkisiVar(YENI_KULLANICI, "user", [bolum], {}, {}).ok, `${bolum} geçmeli`).toBe(true);
    }
  });

  it("sekmesi kapalı olsa da başka bir açık sekme o bölümü yazıyorsa engellenmez", () => {
    // Stok sekmesi kapalı ama Müşteriler açık: makina satışı stoktan düşer (Customers.jsx
    // deductMachineStock). Bölüm→tek sekme eşlemesi kurulsaydı makina satışı 403 alırdı.
    const stoksuz = JSON.stringify({ tabs: ["dashboard", "customers"] });
    expect(yazmaYetkisiVar(stoksuz, "user", ["stock", "partStock", "partStockLog"], {}, {}).ok).toBe(true);
    // Müşteriler kapalı ama Stok açık: Kalıp Üretim formu müşteri yazar (UretimFormu.jsx).
    const musterisiz = JSON.stringify({ tabs: ["dashboard", "stock"] });
    expect(yazmaYetkisiVar(musterisiz, "user", ["customers"], {}, {}).ok).toBe(true);
  });

  it("hiçbir yazan sekmesi olmayan kullanıcı o bölümü yazamaz", () => {
    const sadeceNot = JSON.stringify({ tabs: ["dashboard", "notes"] });
    expect(yazmaYetkisiVar(sadeceNot, "user", ["notes"], {}, {}).ok).toBe(true);
    for (const bolum of ["customers", "dealers", "stock", "teklifler", "factory"]) {
      expect(yazmaYetkisiVar(sadeceNot, "user", [bolum], {}, {}).ok, `${bolum} reddedilmeli`).toBe(false);
    }
  });

  it("tabs tanımsızsa tüm sekmeler açık sayılır (mevcut istemci semantiği)", () => {
    expect(yazmaYetkisiVar(JSON.stringify({ customerActions: ["cust_add"] }), "user", ["factory"], {}, {}).ok).toBe(true);
  });

  it("yedek parça satışı müşteri/bayi detayından da yazılabilir (o sekmelerden 403 almaz)", () => {
    // Yedek parça satışı Stok'un yanı sıra müşteri ve bayi detay modallarından da eklenebilir; satış
    // stoktan düşer (partStock/partStockLog). Bu sekmeler BOLUM_SEKMELERI'nde yoksa kayıt 403 alırdı.
    expect(BOLUM_SEKMELERI.yedekParcaSatislar).toEqual(expect.arrayContaining(["customers", "dealers", "stock"]));
    expect(BOLUM_SEKMELERI.partStock).toEqual(expect.arrayContaining(["dealers"]));
    expect(BOLUM_SEKMELERI.partStockLog).toEqual(expect.arrayContaining(["dealers"]));
    expect(BOLUM_SEKMELERI.yedekParcaSatislar).toEqual(expect.arrayContaining(["servis"])); // pano butonu
    const musteriUser = JSON.stringify({ tabs: ["dashboard", "customers"] });
    expect(yazmaYetkisiVar(musteriUser, "user", ["yedekParcaSatislar", "partStock", "partStockLog"], {}, {}).ok).toBe(true);
    const bayiUser = JSON.stringify({ tabs: ["dashboard", "dealers"] });
    expect(yazmaYetkisiVar(bayiUser, "user", ["yedekParcaSatislar", "partStock", "partStockLog"], {}, {}).ok).toBe(true);
  });

  it("yedek parça EKLE: müşteri/bayi/pano izinlerinden HERHANGİ biri yeterli, stok grubu boş olsa da", () => {
    const yeni = { yedekParcaSatislar: [{ id: 900, dealerId: 5, partId: "7", miktar: 3 }] };
    // stockActions boş ama müşteri detay izni var → EKLE geçer, bölüm yazılabilir
    const custPerm = JSON.stringify({ tabs: ["dashboard", "customers"], stockActions: [], customerActions: ["cust_yedek_parca_add"] });
    expect(eylemDenetimi({}, yeni, custPerm, "user").ok).toBe(true);
    expect(yazmaYetkisiVar(custPerm, "user", ["yedekParcaSatislar"], {}, {}).ok).toBe(true);
    // bayi izni
    const dealerPerm = JSON.stringify({ tabs: ["dashboard", "dealers"], stockActions: [], dealerActions: ["dealer_yedek_parca_add"] });
    expect(eylemDenetimi({}, yeni, dealerPerm, "user").ok).toBe(true);
    // pano izni
    const panoPerm = JSON.stringify({ tabs: ["dashboard", "servis"], stockActions: [], customerActions: ["servis_yedek_parca_add"] });
    expect(eylemDenetimi({}, yeni, panoPerm, "user").ok).toBe(true);
    expect(yazmaYetkisiVar(panoPerm, "user", ["yedekParcaSatislar"], {}, {}).ok).toBe(true);
  });

  it("yedek parça EKLE: hiçbir ekleme izni yoksa 403 (stok grubu da boş)", () => {
    const yeni = { yedekParcaSatislar: [{ id: 901, dealerId: 5, partId: "7", miktar: 1 }] };
    const izinsiz = JSON.stringify({ tabs: ["dashboard", "customers"], stockActions: [], customerActions: ["cust_add"], dealerActions: [] });
    const r = eylemDenetimi({}, yeni, izinsiz, "user");
    expect(r.ok).toBe(false);
    expect(r.islem).toBe("ekle");
    expect(yazmaYetkisiVar(izinsiz, "user", ["yedekParcaSatislar"], {}, {}).ok).toBe(false);
  });

  it("yedek parça SİL: stok VEYA müşteri silme izninden herhangi biri yeterli; hiçbiri yoksa 403", () => {
    const eski = { yedekParcaSatislar: [{ id: 902, dealerId: 5, partId: "7", miktar: 2 }] };
    const yeni = { yedekParcaSatislar: [{ id: 902, dealerId: 5, partId: "7", miktar: 2, deletedAt: "2026-07-27" }] };
    // müşteri detayı silme izni (stockActions boş)
    const custDel = JSON.stringify({ tabs: ["dashboard", "customers"], stockActions: [], customerActions: ["cust_yedek_parca_delete"] });
    expect(eylemDenetimi(eski, yeni, custDel, "user").ok).toBe(true);
    // stok sekmesi silme izni
    const stokDel = JSON.stringify({ tabs: ["dashboard", "stock"], stockActions: ["yedek_parca_delete"], customerActions: [] });
    expect(eylemDenetimi(eski, yeni, stokDel, "user").ok).toBe(true);
    // hiçbir silme izni yok → 403
    const izinsiz = JSON.stringify({ tabs: ["dashboard", "customers"], stockActions: [], customerActions: ["cust_yedek_parca_add"] });
    const r = eylemDenetimi(eski, yeni, izinsiz, "user");
    expect(r.ok).toBe(false);
    expect(r.islem).toBe("sil");
    // Bölüm düzeyi de silme iznini tanımalı: stok grubu boş, yalnız müşteri-detay silme izni → yazılabilir
    expect(yazmaYetkisiVar(custDel, "user", ["yedekParcaSatislar"], {}, {}).ok).toBe(true);
  });

  // Müşteri silme kaskadı: Customers.jsx müşteriyi çöpe taşırken servis/kalıp/ödeme/görüşme/dosya/
  // yedek parça kayıtlarını AYNI yazımda damgalar. Yalnız cust_delete taşıyan kullanıcı bu çocuk
  // silmeler için ayrı izin aramadan geçmeli; müşteri silinmiyorsa aynı çocuk silme yine denetlenir.
  it("müşteri silme kaskadı: cust_delete ile birlikte damgalanan çocuk kayıtlar 403 almaz", () => {
    const ts = "2026-09-18T10:00:00.000Z";
    const eski = {
      customers: [{ id: 500, name: "F" }],
      services: [{ id: 1, customerId: 500 }],
      partSales: [{ id: 10, customerId: 500 }],
      payments: [{ id: 20, customerId: 500 }],
      gorusmeler: [{ id: 40, customerId: 500 }],
      dosyalar: [{ id: 50, customerId: 500 }],
      yedekParcaSatislar: [{ id: 30, aliciTipi: "musteri", musteriId: 500, partId: "7", miktar: 2 }, { id: 31, aliciTipi: "bayi", dealerId: 9, partId: "7", miktar: 5, tahsisler: [{ customerId: 500, miktar: 1 }] }],
    };
    const damga = (arr) => arr.map(r => ({ ...r, deletedAt: ts }));
    const yeni = {
      customers: damga(eski.customers), services: damga(eski.services), partSales: damga(eski.partSales), payments: damga(eski.payments),
      gorusmeler: damga(eski.gorusmeler), dosyalar: damga(eski.dosyalar),
      yedekParcaSatislar: [{ ...eski.yedekParcaSatislar[0], deletedAt: ts }, { ...eski.yedekParcaSatislar[1], tahsisler: [{ customerId: null, miktar: 1, makinaSerbest: "F (silinen müşteri)" }] }],
    };
    const yalnizSil = JSON.stringify({ tabs: ["dashboard", "customers"], stockActions: [], customerActions: ["cust_delete"] });
    expect(eylemDenetimi(eski, yeni, yalnizSil, "user").ok).toBe(true);
    // Bölüm düzeyi: UserManager stok grubunu yalnız admin açıkça kısıtlarsa yazar; olağan müşteri
    // kullanıcısında stockActions tanımsızdır → kaskadın stok iadesi (partStock/partStockLog) ve
    // makinanın stoğa dönüşü (stock) de geçer.
    const olagan = JSON.stringify({ tabs: ["dashboard", "customers"], customerActions: ["cust_delete"] });
    const bolumler = ["customers", "services", "partSales", "payments", "gorusmeler", "dosyalar", "yedekParcaSatislar", "partStock", "partStockLog", "stock"];
    expect(yazmaYetkisiVar(olagan, "user", bolumler, eski, yeni).ok).toBe(true);
    expect(eylemDenetimi(eski, yeni, olagan, "user").ok).toBe(true);
    // Stok grubu açıkça kısıtlı (stockActions: []) cust_delete kullanıcısı: bölüm düzeyi yedek parça
    // yazımına izin verilir (kaskad), kayıt düzeyi kaskad-dışı silme yine reddedilir.
    expect(yazmaYetkisiVar(yalnizSil, "user", ["customers", "services", "gorusmeler", "dosyalar", "yedekParcaSatislar"], eski, yeni).ok).toBe(true);
    // Ebeveyn bölümü (customers) bu yazımda hiç gönderilmemişse dokunulmamıştır → kaskad DEĞİL
    // (regresyon: gönderilmeyen bölüm "yok" sayılıp kaskad kabul ediliyordu)
    const yeniEbeveynsiz = { services: yeni.services, yedekParcaSatislar: yeni.yedekParcaSatislar };
    expect(eylemDenetimi(eski, yeniEbeveynsiz, yalnizSil, "user").ok).toBe(false);
    // Müşteri yenide hiç yoksa (kalıcı/hard silme) da kaskad sayılır
    const yeniHard = { ...yeni, customers: [] };
    expect(eylemDenetimi(eski, yeniHard, yalnizSil, "user").ok).toBe(true);
    // Başka müşterinin çocuğu aynı yazımda damgalanırsa kaskad değil → 403
    const eskiIki = { ...eski, customers: [...eski.customers, { id: 600, name: "G" }], services: [...eski.services, { id: 2, customerId: 600 }] };
    const yeniIki = { ...yeni, customers: [...yeni.customers, { id: 600, name: "G" }], services: [...yeni.services, { id: 2, customerId: 600, deletedAt: ts }] };
    const rIki = eylemDenetimi(eskiIki, yeniIki, yalnizSil, "user");
    expect(rIki.ok).toBe(false);
    expect(rIki.reddedilenBolum).toBe("services");
  });

  it("bayi silme kaskadı: yalnız dealer_delete ile damgalanan bayi satışları + bayi dosyaları 403 almaz; bayi silinmiyorsa aranır", () => {
    const ts = "2026-09-18T10:00:00.000Z";
    const eski = {
      dealers: [{ id: 9, name: "B" }],
      yedekParcaSatislar: [{ id: 30, aliciTipi: "bayi", dealerId: 9, partId: "7", miktar: 2 }, { id: 31, dealerId: 9, partId: "7", miktar: 1 }, { id: 32, aliciTipi: "musteri", musteriId: 1, dealerId: 9 }],
      dosyalar: [{ id: 50, dealerId: 9, ad: "a.pdf" }],
    };
    const yeni = {
      dealers: [{ id: 9, name: "B", deletedAt: ts }],
      yedekParcaSatislar: [{ ...eski.yedekParcaSatislar[0], deletedAt: ts }, { ...eski.yedekParcaSatislar[1], deletedAt: ts }, eski.yedekParcaSatislar[2]],
      dosyalar: [{ ...eski.dosyalar[0], deletedAt: ts }],
    };
    // Olağan bayi kullanıcısı (stok grubu tanımsız): kaskad + stok iadesi + bölüm düzeyi geçer
    const olagan = JSON.stringify({ tabs: ["dashboard", "dealers"], customerActions: [], dealerActions: ["dealer_delete"] });
    expect(eylemDenetimi(eski, yeni, olagan, "user").ok).toBe(true);
    expect(yazmaYetkisiVar(olagan, "user", ["dealers", "yedekParcaSatislar", "dosyalar", "partStock", "partStockLog"], eski, yeni).ok).toBe(true);
    // Stok grubu açıkça kısıtlı (yedek_parca_delete YOK): yedek parça bölümü kaskad için yine yazılabilir,
    // kayıt düzeyinde yalnız gerçek kaskad geçer
    const stoksuz = JSON.stringify({ tabs: ["dashboard", "dealers"], stockActions: [], customerActions: [], dealerActions: ["dealer_delete"] });
    expect(yazmaYetkisiVar(stoksuz, "user", ["dealers", "yedekParcaSatislar", "dosyalar"], eski, yeni).ok).toBe(true);
    expect(eylemDenetimi(eski, yeni, stoksuz, "user").ok).toBe(true);
    // bayi silinmiyor → satış silme kaskad değil → 403
    const yeniKaskadsiz = { ...yeni, dealers: eski.dealers };
    const r = eylemDenetimi(eski, yeniKaskadsiz, stoksuz, "user");
    expect(r.ok).toBe(false);
    expect(r.islem).toBe("sil");
    // müşteri alımı (id 32) bayi kaskadıyla silinemez
    const yeniMusteri = { ...yeni, yedekParcaSatislar: yeni.yedekParcaSatislar.map(s => s.id === 32 ? { ...s, deletedAt: ts } : s) };
    expect(eylemDenetimi(eski, yeniMusteri, stoksuz, "user").ok).toBe(false);
    // dealers bölümü bu yazımda hiç gönderilmemişse kaskad değil
    const yeniBayisiz = { yedekParcaSatislar: yeni.yedekParcaSatislar, dosyalar: yeni.dosyalar };
    expect(eylemDenetimi(eski, yeniBayisiz, stoksuz, "user").ok).toBe(false);
    // bayi yenide hiç yoksa (hard silme) da kaskad
    expect(eylemDenetimi(eski, { ...yeni, dealers: [] }, stoksuz, "user").ok).toBe(true);
    // başka bayinin satışı aynı yazımda damgalanırsa kaskad değil → 403
    const eskiIki = { ...eski, dealers: [...eski.dealers, { id: 10, name: "C" }], yedekParcaSatislar: [...eski.yedekParcaSatislar, { id: 40, aliciTipi: "bayi", dealerId: 10 }] };
    const yeniIki = { ...yeni, dealers: [...yeni.dealers, { id: 10, name: "C" }], yedekParcaSatislar: [...yeni.yedekParcaSatislar, { id: 40, aliciTipi: "bayi", dealerId: 10, deletedAt: ts }] };
    const rIki = eylemDenetimi(eskiIki, yeniIki, stoksuz, "user");
    expect(rIki.ok).toBe(false);
    expect(rIki.reddedilenBolum).toBe("yedekParcaSatislar");
  });

  it("bayi dosyası künyesi bayi grubunun izinleriyle denetlenir (dealer_dosya_add/del), müşteri dosyası müşteri grubuyla", () => {
    const bayici = JSON.stringify({ tabs: ["dashboard", "dealers"], customerActions: [], dealerActions: ["dealer_dosya_add", "dealer_dosya_del"] });
    const eski = { dosyalar: [{ id: 50, dealerId: 9, ad: "a.pdf" }, { id: 51, customerId: 1, ad: "m.pdf" }] };
    // bayi dosyası ekle + sil → serbest
    const yeni = { dosyalar: [{ id: 50, dealerId: 9, ad: "a.pdf", deletedAt: "x" }, { id: 51, customerId: 1, ad: "m.pdf" }, { id: 52, dealerId: 9, ad: "yeni.pdf" }] };
    expect(eylemDenetimi(eski, yeni, bayici, "user").ok).toBe(true);
    expect(yazmaYetkisiVar(bayici, "user", ["dosyalar"], eski, yeni).ok).toBe(true); // müşteri grubu boş olsa da bölüm yazılabilir
    // aynı yazımda müşteri dosyası da değişiyorsa (karışık) bölüm düzeyinde reddedilir; blob yoksa da (katı kural)
    const karisik = { dosyalar: [{ id: 50, dealerId: 9, ad: "a.pdf", deletedAt: "x" }, { id: 51, customerId: 1, ad: "m2.pdf" }] };
    expect(yazmaYetkisiVar(bayici, "user", ["dosyalar"], eski, karisik).ok).toBe(false);
    expect(yazmaYetkisiVar(bayici, "user", ["dosyalar"], {}, {}).ok).toBe(false);
    expect(yazmaYetkisiVar(bayici, "user", ["dosyalar"], eski, eski).ok).toBe(false); // değişiklik yok → katı kural
    // müşteri dosyasını silmek → cust_dosya_del yok → 403
    const yeniM = { dosyalar: [{ id: 50, dealerId: 9, ad: "a.pdf" }, { id: 51, customerId: 1, ad: "m.pdf", deletedAt: "x" }] };
    const r = eylemDenetimi(eski, yeniM, bayici, "user");
    expect(r.ok).toBe(false);
    expect(r.gerekli).toBe("cust_dosya_del");
    // bayi izni olmayan müşteri kullanıcısı bayi dosyasını silemez / ekleyemez
    const musterici = JSON.stringify({ tabs: ["dashboard", "customers"], customerActions: ["cust_dosya_del"], dealerActions: [] });
    const yeniBayiSil = { dosyalar: [{ id: 50, dealerId: 9, ad: "a.pdf", deletedAt: "x" }, { id: 51, customerId: 1, ad: "m.pdf" }] };
    const r2 = eylemDenetimi(eski, yeniBayiSil, musterici, "user");
    expect(r2.ok).toBe(false);
    expect(r2.gerekli).toBe("dealer_dosya_del");
    const r3 = eylemDenetimi(eski, yeni, musterici, "user"); // yeni bayi dosyası (52) → ekle izni
    expect(r3.ok).toBe(false);
    expect(r3.gerekli).toBe("dealer_dosya_add");
  });

  it("müşteri silinmeden aynı çocuk silmeler kaskad sayılmaz → kendi izinleri aranır", () => {
    const eski = { customers: [{ id: 500, name: "F" }], services: [{ id: 1, customerId: 500 }], yedekParcaSatislar: [{ id: 30, aliciTipi: "musteri", musteriId: 500 }] };
    const yeni = { customers: eski.customers, services: [{ id: 1, customerId: 500, deletedAt: "x" }], yedekParcaSatislar: [{ id: 30, aliciTipi: "musteri", musteriId: 500, deletedAt: "x" }] };
    const yalnizSil = JSON.stringify({ tabs: ["dashboard", "customers"], stockActions: [], customerActions: ["cust_delete"] });
    const r = eylemDenetimi(eski, yeni, yalnizSil, "user");
    expect(r.ok).toBe(false);
    expect(r.islem).toBe("sil");
    // müşteri zaten çöpteyken (önceki yazımda silinmiş) çocuk silme de kaskad değildir
    const eski2 = { ...eski, customers: [{ id: 500, name: "F", deletedAt: "önce" }] };
    const yeni2 = { ...yeni, customers: eski2.customers };
    expect(eylemDenetimi(eski2, yeni2, yalnizSil, "user").ok).toBe(false);
    // cust_delete yoksa kaskad da yok
    const izinsiz = JSON.stringify({ tabs: ["dashboard", "customers"], stockActions: [], customerActions: ["cust_edit"] });
    const yeniKaskad = { customers: [{ id: 500, name: "F", deletedAt: "x" }], services: yeni.services, yedekParcaSatislar: yeni.yedekParcaSatislar };
    expect(eylemDenetimi(eski, yeniKaskad, izinsiz, "user").ok).toBe(false);
  });
});

describe("appSettings alan düzeyi denetimi (bölüm iki sahipli)", () => {
  const eski = { appSettings: { kdvRates: { tr: 20 }, pinnedPartIds: [], lastBackup: null, autoBackup: false } };

  it("Ayarlar sekmesi kapalı kullanıcı KDV oranını değiştiremez", () => {
    const yeni = { appSettings: { ...eski.appSettings, kdvRates: { tr: 1 } } };
    const r = yazmaYetkisiVar(YENI_KULLANICI, "user", ["appSettings"], eski, yeni);
    expect(r.ok).toBe(false);
    expect(r.reddedilenAlan).toBe("kdvRates");
  });

  it("Ayarlar kapalı ama Stok açık kullanıcı parça sabitleyebilir (pinnedPartIds)", () => {
    const yeni = { appSettings: { ...eski.appSettings, pinnedPartIds: ["7"] } };
    expect(yazmaYetkisiVar(YENI_KULLANICI, "user", ["appSettings"], eski, yeni).ok).toBe(true);
  });

  it("Stok da kapalıysa parça sabitleme reddedilir", () => {
    const sadeceNot = JSON.stringify({ tabs: ["dashboard", "notes"] });
    const yeni = { appSettings: { ...eski.appSettings, pinnedPartIds: ["7"] } };
    expect(yazmaYetkisiVar(sadeceNot, "user", ["appSettings"], eski, yeni).reddedilenAlan).toBe("pinnedPartIds");
  });

  it("otomatik yedeğin lastBackup yazması her kullanıcıda serbest (sekmesi yok)", () => {
    const sadeceNot = JSON.stringify({ tabs: ["dashboard", "notes"] });
    const yeni = { appSettings: { ...eski.appSettings, lastBackup: "2026-07-17" } };
    expect(yazmaYetkisiVar(sadeceNot, "user", ["appSettings"], eski, yeni).ok).toBe(true);
  });

  it("değişmeyen alanlar reddedilmez (istemci blob'un tamamını geri yazar)", () => {
    const yeni = { appSettings: { ...eski.appSettings } };
    expect(yazmaYetkisiVar(YENI_KULLANICI, "user", ["appSettings"], eski, yeni).ok).toBe(true);
  });

  it("haritada olmayan yeni bir ayar alanı Ayarlar'a aitmiş sayılır (güvenli varsayılan)", () => {
    const yeni = { appSettings: { ...eski.appSettings, yeniGizliAyar: "x" } };
    const r = yazmaYetkisiVar(YENI_KULLANICI, "user", ["appSettings"], eski, yeni);
    expect(r.ok).toBe(false);
    expect(r.reddedilenAlan).toBe("yeniGizliAyar");
  });

  it("Analiz model gizleme (analizGizliModeller) + müşteri sütunları (musteriSutunlari) Ayarlar sekmesine bağlıdır", () => {
    const y1 = { appSettings: { ...eski.appSettings, analizGizliModeller: ["AK-100"] } };
    expect(yazmaYetkisiVar(YENI_KULLANICI, "user", ["appSettings"], eski, y1).reddedilenAlan).toBe("analizGizliModeller");
    const y2 = { appSettings: { ...eski.appSettings, musteriSutunlari: { faturaBedeli: true } } };
    expect(yazmaYetkisiVar(YENI_KULLANICI, "user", ["appSettings"], eski, y2).reddedilenAlan).toBe("musteriSutunlari");
  });

  it("Ayarlar sekmesi açık kullanıcı bu iki alanı değiştirebilir", () => {
    const ayarKull = JSON.stringify({ tabs: ["settings"] });
    const yeni = { appSettings: { ...eski.appSettings, analizGizliModeller: ["AK-100"], musteriSutunlari: { faturaBedeli: true } } };
    expect(yazmaYetkisiVar(ayarKull, "user", ["appSettings"], eski, yeni).ok).toBe(true);
  });

  it("settings grubu tümden engelliyse alan denetimine bakılmadan reddedilir", () => {
    const yeni = { appSettings: { ...eski.appSettings, pinnedPartIds: ["7"] } };
    expect(yazmaYetkisiVar(READONLY, "user", ["appSettings"], eski, yeni).ok).toBe(false);
  });
});

describe("yazmaYetkisiVar", () => {
  it("admin her bölümü yazabilir", () => {
    expect(yazmaYetkisiVar(READONLY, "admin", ["customers", "faturalar"]).ok).toBe(true);
  });

  it("izinsiz (null) kullanıcı tam erişimlidir", () => {
    expect(yazmaYetkisiVar(null, "user", ["customers", "appSettings"]).ok).toBe(true);
  });

  it("salt-okunur kullanıcı müşteri/evrak/stok/not/ayar değişimini reddeder", () => {
    for (const bolum of ["customers", "services", "teklifler", "faturalar", "stock", "notes", "appSettings", "factory"]) {
      const r = yazmaYetkisiVar(READONLY, "user", [bolum]);
      expect(r.ok, `${bolum} reddedilmeli`).toBe(false);
      expect(r.reddedilenBolum).toBe(bolum);
    }
  });

  it("değişiklik yoksa salt-okunur kullanıcı bile geçer (yalnızca okuma/save no-op)", () => {
    expect(yazmaYetkisiVar(READONLY, "user", []).ok).toBe(true);
  });

  it("ilgili grupta izni olan kullanıcı o bölümü yazabilir", () => {
    const perms = JSON.stringify({
      customerActions: ["ekle", "duzenle"], dealerActions: [], evrakActions: [],
      stockActions: [], notActions: [], settings: ["server"],
    });
    expect(yazmaYetkisiVar(perms, "user", ["customers"]).ok).toBe(true);   // izinli
    expect(yazmaYetkisiVar(perms, "user", ["dealers"]).ok).toBe(false);    // dealerActions boş
    expect(yazmaYetkisiVar(perms, "user", ["teklifler"]).ok).toBe(false);  // evrakActions boş
  });

  it("settings alt-sekme listesinde bağlantı dışı yetki varsa ayar bölümü yazılabilir", () => {
    const perms = JSON.stringify({ settings: ["company"] });
    expect(yazmaYetkisiVar(perms, "user", ["factory", "appSettings"]).ok).toBe(true);
    const sadeceServer = JSON.stringify({ settings: ["server"] });
    expect(yazmaYetkisiVar(sadeceServer, "user", ["factory"]).ok).toBe(false);
  });
});

describe("SECTION_GROUP kapsama (regresyon: yeni bölüm eklenirse haritaya da eklenmeli)", () => {
  it("her BLOB_SECTIONS bölümü bir izin grubuna eşlenmiş", () => {
    for (const bolum of BLOB_SECTIONS) {
      expect(SECTION_GROUP[bolum], `${bolum} haritada yok`).toBeTruthy();
    }
  });
});

describe("BOLUM_SEKMELERI kapsama (regresyon: sekme eşlemesi eksik kalırsa açık ya da kilit doğar)", () => {
  const tabIds = new Set(ALL_TABS.map(t => t.id));

  it("her BLOB_SECTIONS bölümü en az bir sekmeye eşlenmiş", () => {
    for (const bolum of BLOB_SECTIONS) {
      expect(Array.isArray(BOLUM_SEKMELERI[bolum]) && BOLUM_SEKMELERI[bolum].length > 0, `${bolum} sekme haritasında yok`).toBe(true);
    }
  });

  it("haritadaki her sekme id'si arayüzdeki ALL_TABS'te gerçekten var", () => {
    // Yazım hatası ya da yeniden adlandırılmış bir sekme id'si sessizce "hiçbir sekme yazamaz"
    // anlamına gelir ve meşru kullanıcıyı kilitler; bu test onu ekleme anında yakalar.
    for (const [bolum, sekmeler] of Object.entries(BOLUM_SEKMELERI)) {
      for (const s of sekmeler) expect(tabIds.has(s), `${bolum} → bilinmeyen sekme "${s}"`).toBe(true);
    }
    for (const [alan, sekmeler] of Object.entries(AYAR_ALAN_SEKMELERI)) {
      for (const s of sekmeler) expect(tabIds.has(s), `appSettings.${alan} → bilinmeyen sekme "${s}"`).toBe(true);
    }
  });

  it("haritada BLOB_SECTIONS dışında bölüm yok", () => {
    for (const bolum of Object.keys(BOLUM_SEKMELERI)) {
      expect(BLOB_SECTIONS.includes(bolum), `${bolum} artık bir veri bölümü değil`).toBe(true);
    }
  });

  it("Servis Panosu (kiosk) 'servis' sekmesiyle servis yazabilir", () => {
    // Kiosk kullanıcısının tek sekmesi "servis"; services bölümü bu sekmeye eşlenmezse sunucu
    // durum güncellemesini sekmeEngelli ile 403'ler (kritik tuzak).
    expect(BOLUM_SEKMELERI.services).toContain("servis");
    expect(new Set(ALL_TABS.map(t => t.id)).has("servis")).toBe(true);
  });

  it("Servis Panosu servis formu müşteri kartındakiyle aynı → parçalı servis kaydı stok da yazar", () => {
    // Panonun servis formu tam ServiceForm; değişen parça seçilince stoktan düşer → services ile
    // birlikte partStock/partStockLog da değişir. Kiosk kullanıcısı (tabs:["servis"], stockActions
    // TANIMSIZ) bu üç bölümü de yazabilmeli, yoksa parçalı servis kaydı 403 alır.
    expect(BOLUM_SEKMELERI.partStock).toContain("servis");
    expect(BOLUM_SEKMELERI.partStockLog).toContain("servis");
    const kiosk = JSON.stringify({ tabs: ["servis"], customerActions: ["cust_service_add", "cust_service_edit"] });
    expect(yazmaYetkisiVar(kiosk, "user", ["services", "partStock", "partStockLog"], {}, {}).ok).toBe(true);
  });

  it("Servis Panosu formu resim/dosya da ekler → kiosk 'servis' sekmesiyle dosyalar yazabilir", () => {
    // Form müşteri kartındakiyle aynı; "Servis Resimleri / Dosyaları" bölümü dosyayı servise bağlar
    // (dosyalar bölümü değişir). Kiosk kullanıcısı cust_dosya_add da verilmişse yazabilmeli.
    expect(BOLUM_SEKMELERI.dosyalar).toContain("servis");
    const kioskDosya = JSON.stringify({ tabs: ["servis"], customerActions: ["cust_service_add", "cust_dosya_add"] });
    expect(yazmaYetkisiVar(kioskDosya, "user", ["services", "dosyalar"], {}, {}).ok).toBe(true);
  });
});

describe("spec 0006 C8: Evrak'tan CRM kaydı — yalnız Evrak sekmeli kullanıcı", () => {
  const ESKI = { customers: [{ id: 500, name: "K", kaliplar: [] }], partSales: [], yedekParcaSatislar: [], partStock: [{ id: 1, partId: "7", miktar: 10 }], partStockLog: [] };
  const YENI = {
    customers: [{ id: 500, name: "K", kaliplar: [{ ad: "Hamburger", olcu: "", partSaleId: 61 }], kalipSayisi: 1 }],
    partSales: [{ id: 61, customerId: 500, tur: "Kalıp", ad: "Hamburger", teklifId: 900, teklifKalemId: "k1" }],
    yedekParcaSatislar: [{ id: 62, aliciTipi: "musteri", musteriId: 500, partId: "7", miktar: 2, teklifId: 900, teklifKalemId: "p1", tahsisler: [] }],
    partStock: [{ id: 1, partId: "7", miktar: 8 }], partStockLog: [{ id: 63, partId: "7", miktar: -2, tip: "bayi_satis", referansId: 62 }],
  };
  const BOLUMLER = ["customers", "partSales", "yedekParcaSatislar", "partStock", "partStockLog"];
  it("AC-33: 'evrak' bu beş bölümün sekme listesinde", () => {
    for (const b of BOLUMLER) expect(BOLUM_SEKMELERI[b], b).toContain("evrak");
  });
  it("AC-33: gereken eylem izinleri olan yalnız Evrak sekmeli kullanıcının yazımı geçer", () => {
    const evrakci = JSON.stringify({ tabs: ["evrak"], customerActions: ["cust_kalip_add"], stockActions: ["yedek_parca_add"], evrakActions: ["evrak_teklif_convert"] });
    expect(yazmaYetkisiVar(evrakci, "user", BOLUMLER, ESKI, YENI).ok).toBe(true);
    expect(eylemDenetimi(ESKI, YENI, evrakci, "user").ok).toBe(true);
  });
  it("triyaj bulgu 5 (kabul edilen sınır, belgeli): yalnız Evrak sekmeli kullanıcı mevcut kaydı bölüm düzeyinde düzenleyebilir", () => {
    const evrakci = JSON.stringify({ tabs: ["evrak"], customerActions: ["cust_kalip_add"], stockActions: ["yedek_parca_add"] });
    const once = { customers: [{ id: 500, name: "K", kalanBorc: 1000 }] };
    const sonra = { customers: [{ id: 500, name: "K", kalanBorc: 0 }] };
    expect(yazmaYetkisiVar(evrakci, "user", ["customers"], once, sonra).ok).toBe(true);
    expect(eylemDenetimi(once, sonra, evrakci, "user").ok).toBe(true);
    // Ekleme ve silme ise kayıt düzeyinde denetlenmeye devam eder.
    expect(eylemDenetimi(once, { customers: [...sonra.customers, { id: 501, name: "Yeni" }] }, evrakci, "user").ok).toBe(false);
  });
  it("C8: ekleme izinleri aranmaya devam eder (Evrak izni yetmez; gevşetme yok)", () => {
    const kalipsiz = JSON.stringify({ tabs: ["evrak"], customerActions: ["cust_edit"], stockActions: ["yedek_parca_add"] });
    expect(eylemDenetimi(ESKI, YENI, kalipsiz, "user").ok).toBe(false);
    const stoksuz = JSON.stringify({ tabs: ["evrak"], customerActions: ["cust_kalip_add"], stockActions: [] });
    expect(yazmaYetkisiVar(stoksuz, "user", ["partStock", "partStockLog"], ESKI, YENI).ok).toBe(false);
  });
});

describe("spec 0007 C6: yalnız Bayiler sekmeli kullanıcının bayi aracılığıyla kalıp satışı", () => {
  const ESKI = { customers: [{ id: 500, name: "K", kaliplar: [] }], partSales: [] };
  const YENI = { customers: [{ id: 500, name: "K", kaliplar: [{ ad: "H", olcu: "", partSaleId: 71 }], kalipSayisi: 1 }],
    partSales: [{ id: 71, customerId: 500, tur: "Kalıp", ad: "H", satisFirma: "Ege Bayi" }] };
  it("'dealers' partSales ve customers bölümlerinde", () => {
    expect(BOLUM_SEKMELERI.partSales).toContain("dealers");
    expect(BOLUM_SEKMELERI.customers).toContain("dealers");
  });
  it("cust_kalip_add'li Bayiler kullanıcısının yazımı geçer; izni yoksa ekleme reddedilir (gevşetme yok)", () => {
    const bayici = JSON.stringify({ tabs: ["dealers"], customerActions: ["cust_kalip_add"] });
    expect(yazmaYetkisiVar(bayici, "user", ["customers", "partSales"], ESKI, YENI).ok).toBe(true);
    expect(eylemDenetimi(ESKI, YENI, bayici, "user").ok).toBe(true);
    const izinsiz = JSON.stringify({ tabs: ["dealers"], customerActions: ["cust_edit"] });
    expect(eylemDenetimi(ESKI, YENI, izinsiz, "user").ok).toBe(false);
  });
});

describe("eylemDenetimi — eylem düzeyi (ekle/sil) yetki", () => {
  // "Müşteri ekle+düzenle var, SİLME yok"
  const kismi = JSON.stringify({ customerActions: ["cust_add", "cust_edit"] });
  const eski = { customers: [{ id: 1, name: "A", deletedAt: null }] };

  it("admin ve izin tanımsız → her zaman geçer", () => {
    expect(eylemDenetimi(eski, { customers: [{ id: 1, deletedAt: "x" }] }, kismi, "admin").ok).toBe(true);
    expect(eylemDenetimi(eski, { customers: [{ id: 1, deletedAt: "x" }] }, null, "user").ok).toBe(true);
  });

  it("sil izni yokken soft-delete (deletedAt set) reddedilir", () => {
    const r = eylemDenetimi(eski, { customers: [{ id: 1, name: "A", deletedAt: "2026-07-12" }] }, kismi, "user");
    expect(r.ok).toBe(false);
    expect(r.islem).toBe("sil");
    expect(r.gerekli).toBe("cust_delete");
  });

  it("sil izni yokken hard-delete (kayıt yenide yok) reddedilir", () => {
    expect(eylemDenetimi(eski, { customers: [] }, kismi, "user").ok).toBe(false);
  });

  it("ekle izni VARSA yeni kayıt geçer", () => {
    const r = eylemDenetimi(eski, { customers: [{ id: 1, name: "A" }, { id: 2, name: "B" }] }, kismi, "user");
    expect(r.ok).toBe(true);
  });

  it("düzenleme (add/delete yok) bölüm düzeyinde geçer", () => {
    expect(eylemDenetimi(eski, { customers: [{ id: 1, name: "A DÜZENLENDİ" }] }, kismi, "user").ok).toBe(true);
  });

  it("çöpteki kaydın purge'ü (zaten deletedAt) muaf — silme sayılmaz", () => {
    const cop = { customers: [{ id: 1, name: "A", deletedAt: "2026-01-01" }] };
    expect(eylemDenetimi(cop, { customers: [] }, kismi, "user").ok).toBe(true);
  });

  it("ekle izni YOKken yeni kayıt reddedilir", () => {
    const yalnizDuzenle = JSON.stringify({ customerActions: ["cust_edit"] });
    const r = eylemDenetimi(eski, { customers: [{ id: 1 }, { id: 2 }] }, yalnizDuzenle, "user");
    expect(r.ok).toBe(false);
    expect(r.gerekli).toBe("cust_add");
  });

  it("teklif/proforma tür bağımlı: proforma silme evrak_proforma_delete ister", () => {
    const perms = JSON.stringify({ evrakActions: ["evrak_teklif_add", "evrak_teklif_edit", "evrak_teklif_delete"] });
    const o = { teklifler: [{ id: 5, type: "proforma" }] };
    const r = eylemDenetimi(o, { teklifler: [{ id: 5, type: "proforma", deletedAt: "x" }] }, perms, "user");
    expect(r.ok).toBe(false);
    expect(r.gerekli).toBe("evrak_proforma_delete");
  });

  it("gönderilmeyen bölüm denetlenmez (dokunulmadı)", () => {
    expect(eylemDenetimi(eski, { notes: [] }, kismi, "user").ok).toBe(true);
  });

  it("EYLEM_IDLERI'ndeki her bölüm geçerli bir gruba bağlı", () => {
    for (const section of Object.keys(EYLEM_IDLERI)) {
      expect(SECTION_GROUP[section], section).toBeTruthy();
    }
  });
});

describe("eylemDenetimi — alan düzeyi düzenleme (pano kutu sürükleme)", () => {
  // Kargo kutusu sürükleme = yalnız kargoDurum alanı değişir → yedek_parca_edit ister.
  it("kargo durum değişince: yedek_parca_edit YOKsa reddedilir", () => {
    const eski = { yedekParcaSatislar: [{ id: 9, kargoDurum: "Hazırlanıyor", odendi: false }] };
    const yeni = { yedekParcaSatislar: [{ id: 9, kargoDurum: "Kargoya Verildi", odendi: false }] };
    const perms = JSON.stringify({ stockActions: ["yedek_parca_add"] }); // edit yok
    const r = eylemDenetimi(eski, yeni, perms, "user");
    expect(r.ok).toBe(false);
    expect(r.islem).toBe("duzenle");
    expect(r.gerekli).toBe("yedek_parca_edit");
  });

  it("kargo durum değişince: yedek_parca_edit VARsa geçer", () => {
    const eski = { yedekParcaSatislar: [{ id: 9, kargoDurum: "Hazırlanıyor" }] };
    const yeni = { yedekParcaSatislar: [{ id: 9, kargoDurum: "Kargoya Verildi" }] };
    const perms = JSON.stringify({ stockActions: ["yedek_parca_edit"] });
    expect(eylemDenetimi(eski, yeni, perms, "user").ok).toBe(true);
  });

  it("kargo başka alan (ödendi) değişince izinsiz de geçer — yanlış-pozitif olmasın", () => {
    const eski = { yedekParcaSatislar: [{ id: 9, kargoDurum: "Hazırlanıyor", odendi: false }] };
    const yeni = { yedekParcaSatislar: [{ id: 9, kargoDurum: "Hazırlanıyor", odendi: true }] };
    const perms = JSON.stringify({ stockActions: ["yedek_parca_add"] }); // edit yok
    expect(eylemDenetimi(eski, yeni, perms, "user").ok).toBe(true);
  });

  // Servis kutusu sürükleme = yalnız durum alanı değişir → cust_service_edit ister.
  it("servis durum değişince: cust_service_edit YOKsa reddedilir", () => {
    const eski = { services: [{ id: 3, durum: "Bekliyor" }] };
    const yeni = { services: [{ id: 3, durum: "Yapılıyor" }] };
    const perms = JSON.stringify({ customerActions: ["cust_service_add"] }); // edit yok
    const r = eylemDenetimi(eski, yeni, perms, "user");
    expect(r.ok).toBe(false);
    expect(r.islem).toBe("duzenle");
    expect(r.gerekli).toBe("cust_service_edit");
  });

  it("servis durum değişince: cust_service_edit VARsa geçer (kiosk kullanıcısı)", () => {
    const eski = { services: [{ id: 3, durum: "Bekliyor" }] };
    const yeni = { services: [{ id: 3, durum: "Yapılıyor" }] };
    const perms = JSON.stringify({ customerActions: ["cust_service_add", "cust_service_edit"] });
    expect(eylemDenetimi(eski, yeni, perms, "user").ok).toBe(true);
  });

  // Extra Kalıp kargo kutusu sürükleme = partSales.kargoDurum değişir → cust_kalip_edit ister.
  it("kalıp kargo durum değişince: cust_kalip_edit YOKsa reddedilir", () => {
    const eski = { partSales: [{ id: 5, tur: "Kalıp", kargoDurum: "Hazırlanıyor", odendi: false }] };
    const yeni = { partSales: [{ id: 5, tur: "Kalıp", kargoDurum: "Kargoya Verildi", odendi: false }] };
    const perms = JSON.stringify({ customerActions: ["cust_kalip_add"] }); // edit yok
    const r = eylemDenetimi(eski, yeni, perms, "user");
    expect(r.ok).toBe(false);
    expect(r.islem).toBe("duzenle");
    expect(r.gerekli).toBe("cust_kalip_edit");
  });

  it("kalıp kargo durum değişince: cust_kalip_edit VARsa geçer", () => {
    const eski = { partSales: [{ id: 5, tur: "Kalıp", kargoDurum: "Hazırlanıyor" }] };
    const yeni = { partSales: [{ id: 5, tur: "Kalıp", kargoDurum: "Kargoya Verildi" }] };
    const perms = JSON.stringify({ customerActions: ["cust_kalip_edit"] });
    expect(eylemDenetimi(eski, yeni, perms, "user").ok).toBe(true);
  });

  it("kalıp başka alan (ödendi) değişince izinsiz de geçer — yanlış-pozitif olmasın", () => {
    const eski = { partSales: [{ id: 5, tur: "Kalıp", kargoDurum: "Hazırlanıyor", odendi: false }] };
    const yeni = { partSales: [{ id: 5, tur: "Kalıp", kargoDurum: "Hazırlanıyor", odendi: true }] };
    const perms = JSON.stringify({ customerActions: ["cust_kalip_add"] }); // edit yok
    expect(eylemDenetimi(eski, yeni, perms, "user").ok).toBe(true);
  });

  it("izlenen alan zaman damgasıyla birlikte değişse de yalnız durum alanına bakılır (yeni kayıt EKLE dalında)", () => {
    // eskide olmayan yeni servis: alan denetimi atlar (EKLE dalı denetler), çift-red olmaz
    const eski = { services: [] };
    const yeni = { services: [{ id: 3, durum: "Bekliyor" }] };
    const perms = JSON.stringify({ customerActions: ["cust_service_add"] }); // edit yok ama ekle var
    expect(eylemDenetimi(eski, yeni, perms, "user").ok).toBe(true);
  });

  it("admin ve izin tanımsız → alan denetimi de atlanır", () => {
    const eski = { services: [{ id: 3, durum: "Bekliyor" }] };
    const yeni = { services: [{ id: 3, durum: "Yapılıyor" }] };
    expect(eylemDenetimi(eski, yeni, JSON.stringify({ customerActions: [] }), "admin").ok).toBe(true);
    expect(eylemDenetimi(eski, yeni, null, "user").ok).toBe(true);
  });

  it("ALAN_IZINLERI'ndeki her bölüm geçerli bir gruba bağlı", () => {
    for (const section of Object.keys(ALAN_IZINLERI)) {
      expect(SECTION_GROUP[section], section).toBeTruthy();
    }
  });
});

describe("dosyaIslemYetkisi — fiziksel dosya uçları (upload/delete) yetkisi", () => {
  const salt = JSON.stringify({ customerActions: [], dealerActions: [], evrakActions: [], stockActions: [], notActions: [], settings: ["server"] });
  const musteriYetkili = JSON.stringify({ customerActions: ["ekle", "duzenle", "sil"], dealerActions: [] });
  const bayiYetkili = JSON.stringify({ customerActions: [], dealerActions: ["ekle"] });
  it("admin her zaman yetkili", () => {
    expect(dosyaIslemYetkisi(salt, "admin")).toBe(true);
  });
  it("izin tanımsız = tam erişim", () => {
    expect(dosyaIslemYetkisi(null, "user")).toBe(true);
  });
  it("salt-okunur (müşteri VE bayi engelli) → yetkisiz", () => {
    expect(dosyaIslemYetkisi(salt, "user")).toBe(false);
  });
  it("müşteri işlemi olan → yetkili", () => {
    expect(dosyaIslemYetkisi(musteriYetkili, "user")).toBe(true);
  });
  it("yalnız bayi işlemi olan → yetkili", () => {
    expect(dosyaIslemYetkisi(bayiYetkili, "user")).toBe(true);
  });
  it("dosya yazan hiçbir sekmesi açık olmayan → yetkisiz", () => {
    expect(dosyaIslemYetkisi(JSON.stringify({ tabs: ["dashboard", "notes"] }), "user")).toBe(false);
  });
});

describe("dosyaSilmeYetkisi — fiziksel silmede nesne (künye) düzeyi yetki", () => {
  // Bayi sorumlusu: müşteri tarafına HİÇ yazma yetkisi yok, bayi tarafı açık.
  const bayici = JSON.stringify({
    customerActions: [], dealerActions: ["dealer_add", "dealer_edit", "dealer_dosya_del"],
    evrakActions: [], stockActions: [], notActions: [], settings: ["server"],
  });
  const musteriKunye = { id: 412, customerId: 87, dosyaAdi: "Yılmaz Metal - sozlesme - m4k2xa9f1.pdf" };
  const bayiKunye    = { id: 413, dealerId: 5, dosyaAdi: "Bayi - evrak - a1b2c3.pdf" };

  // REGRESYON (doğrulanmış asimetri): aynı kullanıcı için künye yazma REDDEDİLİRKEN
  // (yazmaYetkisiVar → dosyalar/customerActions) fiziksel silme İZİN ALIYORDU, çünkü
  // dosyaIslemYetkisi hangi dosyanın silindiğine hiç bakmıyordu.
  it("müşteri yazma yetkisi olmayan kullanıcı müşteri dosyasını silemez", () => {
    expect(yazmaYetkisiVar(bayici, "user", ["dosyalar"], {}, {}).ok).toBe(false); // künye yolu reddediyor
    expect(dosyaSilmeYetkisi(bayici, "user", musteriKunye)).toBe(false);          // fiziksel yol da reddetmeli
  });

  it("bayi sorumlusu bayi dosyasını silebilir", () => {
    expect(dosyaSilmeYetkisi(bayici, "user", bayiKunye)).toBe(true);
  });

  it("simetrik: bayi yazma yetkisi olmayan kullanıcı bayi dosyasını silemez", () => {
    const musterici = JSON.stringify({ customerActions: ["cust_add", "cust_dosya_del"], dealerActions: [] });
    expect(dosyaSilmeYetkisi(musterici, "user", bayiKunye)).toBe(false);
    expect(dosyaSilmeYetkisi(musterici, "user", musteriKunye)).toBe(true);
  });

  it("grup açık ama dosya silme eylemi seçili değilse reddedilir (künye yoluyla aynı karar)", () => {
    const dosyaSilemez = JSON.stringify({ customerActions: ["cust_add", "cust_edit"], dealerActions: [] });
    expect(dosyaSilmeYetkisi(dosyaSilemez, "user", musteriKunye)).toBe(false);
  });

  it("admin ve izin tanımsız → her zaman yetkili", () => {
    expect(dosyaSilmeYetkisi(bayici, "admin", musteriKunye)).toBe(true);
    expect(dosyaSilmeYetkisi(null, "user", musteriKunye)).toBe(true);
  });

  it("künyesiz (orphan) dosyada eski kaba kurala düşülür — çöp temizliği kilitlenmesin", () => {
    expect(dosyaSilmeYetkisi(bayici, "user", null)).toBe(true);
    const salt = JSON.stringify({ customerActions: [], dealerActions: [], evrakActions: [], stockActions: [], notActions: [], settings: ["server"] });
    expect(dosyaSilmeYetkisi(salt, "user", null)).toBe(false);
  });
});

describe("sonAdminiDusururMu — son-admin koruması", () => {
  const tekAdmin = [{ id: 1, role: "admin", is_active: 1 }, { id: 2, role: "user", is_active: 1 }];
  const ciftAdmin = [{ id: 1, role: "admin", is_active: 1 }, { id: 3, role: "admin", is_active: 1 }];

  it("tek aktif admini user'a düşürme engellenir", () => {
    expect(sonAdminiDusururMu(tekAdmin, 1, { role: "user" })).toBe(true);
  });
  it("tek aktif admini pasifleştirme engellenir", () => {
    expect(sonAdminiDusururMu(tekAdmin, 1, { is_active: 0 })).toBe(true);
    expect(sonAdminiDusururMu(tekAdmin, 1, { is_active: false })).toBe(true);
  });
  it("başka aktif admin varsa engellenmez", () => {
    expect(sonAdminiDusururMu(ciftAdmin, 1, { role: "user" })).toBe(false);
    expect(sonAdminiDusururMu(ciftAdmin, 1, { is_active: 0 })).toBe(false);
  });
  it("admin olmayanı veya admini kalıcı bırakmayan değişikliği etkilemez", () => {
    expect(sonAdminiDusururMu(tekAdmin, 2, { is_active: 0 })).toBe(false); // hedef zaten user
    expect(sonAdminiDusururMu(tekAdmin, 1, { permissions: "x" })).toBe(false); // rol/aktiflik değişmiyor
    expect(sonAdminiDusururMu(tekAdmin, 1, { role: "admin", is_active: 1 })).toBe(false); // admin kalıyor
  });
});

// ── Gider kaydı (spec 0001) ──────────────────────────────────────────────────────
describe("gider bölümleri: C6 kural 3 ve sunucu aynası (K6)", () => {
  const GIDERCI = JSON.stringify({ tabs: [...DEFAULT_USER_TABS, "gider"] });
  it("AC-18 (sunucu): sekme listesi tanımsız veya izinsiz user gider yazamaz", () => {
    for (const bolum of GIDER_BOLUMLERI) {
      expect(giderAynaEngeli(null, "user", [bolum])).toBe(bolum);
      expect(giderAynaEngeli(JSON.stringify({ customerActions: [] }), "user", [bolum])).toBe(bolum);
      expect(yazmaYetkisiVar(null, "user", [bolum], {}, {}).ok).toBe(false);
    }
  });
  it("admin ve gider dışı bölümler etkilenmez (tanımsız = serbest kuralı korunur)", () => {
    expect(giderAynaEngeli(null, "admin", ["giderler"])).toBeNull();
    expect(giderAynaEngeli(null, "user", ["customers", "notes"])).toBeNull();
    expect(yazmaYetkisiVar(null, "user", ["customers"], {}, {}).ok).toBe(true);
  });
  it("varsayılan yeni kullanıcı (gider sekmesi yok) gider bölümlerini yazamaz", () => {
    for (const bolum of ["giderler", "tedarikciler", "standartGiderler"]) {
      expect(yazmaYetkisiVar(YENI_KULLANICI, "user", [bolum], {}, {}).ok).toBe(false);
    }
  });
  it("gider sekmesi açıkça verilen kullanıcı kalem, tanım, tedarikçi ve standart gider yazabilir", () => {
    for (const bolum of ["giderler", "giderTanimlari", "tedarikciler", "standartGiderler"]) {
      expect(yazmaYetkisiVar(GIDERCI, "user", [bolum], {}, {}).ok).toBe(true);
    }
    expect(giderAynaEngeli(GIDERCI, "user", ["giderler"])).toBeNull();
  });
  it("R13 / R22: tedarikçi ve standart gider yalnız gider sekmesinden; settings tek başına yetmez", () => {
    const ayarci = JSON.stringify({ tabs: ["settings"] });
    for (const b of ["tedarikciler", "standartGiderler", "giderTurleri", "giderler", "giderTanimlari"]) {
      expect(yazmaYetkisiVar(ayarci, "user", [b], {}, {}).ok, b).toBe(false);
    }
  });
  it("giderActions: [] tüm gider bölümlerini kapatır", () => {
    const kapali = JSON.stringify({ tabs: ["gider"], giderActions: [] });
    expect(yazmaYetkisiVar(kapali, "user", ["giderler"], {}, {}).ok).toBe(false);
    expect(kisitliMi(kapali, "user")).toBe(true);
  });
});

describe("gider bölümleri: kayıt düzeyi eylem denetimi (K22)", () => {
  const izin = (ids) => JSON.stringify({ tabs: ["gider", "finance", "kasa"], giderActions: ids }); // spec 0052: virman/avans Kasa sekmesi ister
  it("elle kalem eklemek gider_add ister; tanımdan üretilen kalem gider_tekrar_uret ister", () => {
    const yeni = { giderler: [{ id: 1, tarih: "2026-09-01" }] };
    expect(eylemDenetimi({ giderler: [] }, yeni, izin(["gider_tekrar_uret"]), "user").ok).toBe(false);
    expect(eylemDenetimi({ giderler: [] }, yeni, izin(["gider_add"]), "user").ok).toBe(true);
    // Gerçek bir tanımdan üretilmiş kalem: gider_tekrar_uret yeterli. gider_add sahibi de ekleyebilir
    // (aynı kalemi elle girebilirdi); ikisi de yoksa reddedilir.
    const tanimlar = [{ id: 9, turId: 4, baslangicAy: "2026-01" }];
    const uretilen = { giderler: [{ id: 2, tanimId: 9, donem: "2026-09", tarih: "2026-09-01", turId: 4 }], giderTanimlari: tanimlar };
    const once = { giderler: [], giderTanimlari: tanimlar };
    expect(eylemDenetimi(once, uretilen, izin(["gider_tekrar_uret"]), "user").ok).toBe(true);
    expect(eylemDenetimi(once, uretilen, izin(["gider_add"]), "user").ok).toBe(true);
    expect(eylemDenetimi(once, uretilen, izin(["gider_edit"]), "user").ok).toBe(false);
  });
  it("kalem silmek gider_delete ister", () => {
    const eski = { giderler: [{ id: 1 }] };
    const yeni = { giderler: [{ id: 1, deletedAt: "x" }] };
    expect(eylemDenetimi(eski, yeni, izin(["gider_add", "gider_edit"]), "user").reddedilenBolum).toBe("giderler");
    expect(eylemDenetimi(eski, yeni, izin(["gider_delete"]), "user").ok).toBe(true);
  });
  // Spec 0024 Q1/Q7 (onaylı istisna): 0001'in giderler.odendi alan denetimi ve 0021'in taksit satırı denetimi kaldırıldı;
  // ödeme artık hesapHareketleri bölümüne bir kayıttır ve izni o kaydın eklenmesi, silinmesi ve düzenlenmesinde aranır.
  describe("spec 0024 AC-27: ödeme ve virman hareket bölümünde kendi izniyle", () => {
    const kalem = (o = {}) => ({ id: 1, tarih: "2026-10-01", turId: 1, tutar: 5000, odendi: false, ...o });
    const odeme = (o = {}) => ({ id: 50, tur: "odeme", tarih: "2026-10-05", tutar: 1000, giderId: 1, taksitId: null, hesapId: 97, ...o });
    const virman = (o = {}) => ({ id: 60, tur: "virman", tarih: "2026-10-05", tutar: 500, hesapId: 97, karsiHesapId: 98, ...o });
    it("ödeme kaydetmek gider_odeme ister; gider_edit yetmez", () => {
      expect(eylemDenetimi({ hesapHareketleri: [] }, { hesapHareketleri: [odeme()] }, izin(["gider_edit"]), "user"))
        .toMatchObject({ ok: false, reddedilenBolum: "hesapHareketleri", islem: "ekle", gerekli: "gider_odeme" });
      expect(eylemDenetimi({ hesapHareketleri: [] }, { hesapHareketleri: [odeme()] }, izin(["gider_odeme"]), "user").ok).toBe(true);
    });
    it("ödeme silmek ve düzenlemek de gider_odeme ister", () => {
      const eski = { hesapHareketleri: [odeme()] };
      expect(eylemDenetimi(eski, { hesapHareketleri: [] }, izin(["gider_edit"]), "user")).toMatchObject({ ok: false, islem: "sil", gerekli: "gider_odeme" });
      expect(eylemDenetimi(eski, { hesapHareketleri: [odeme({ tutar: 1 })] }, izin(["gider_edit"]), "user")).toMatchObject({ ok: false, islem: "duzenle", gerekli: "gider_odeme" });
      expect(eylemDenetimi(eski, { hesapHareketleri: [] }, izin(["gider_odeme"]), "user").ok).toBe(true);
      expect(eylemDenetimi(eski, { hesapHareketleri: [odeme()] }, izin([]), "user").ok).toBe(true); // değişmeyen kayıt
    });
    it("virman virman ister; gider_odeme yetmez; ödemeyi virmana çevirmek ikisini de ister", () => {
      expect(eylemDenetimi({ hesapHareketleri: [] }, { hesapHareketleri: [virman()] }, izin(["gider_odeme"]), "user").gerekli).toBe("virman");
      expect(eylemDenetimi({ hesapHareketleri: [] }, { hesapHareketleri: [virman()] }, izin(["virman"]), "user").ok).toBe(true);
      const cevir = { hesapHareketleri: [{ ...odeme(), tur: "virman", karsiHesapId: 98 }] };
      expect(eylemDenetimi({ hesapHareketleri: [odeme()] }, cevir, izin(["virman"]), "user").ok).toBe(false);
      expect(eylemDenetimi({ hesapHareketleri: [odeme()] }, cevir, izin(["virman", "gider_odeme"]), "user").ok).toBe(true);
    });
    it("spec 0024 B (B3): avans `avans` ister, gider_odeme yetmez; mahsup gider_odeme ister, avans yetmez", () => {
      const avans = { id: 70, tur: "avans", tarih: "2026-10-05", tutar: 500, calisanId: 7, hesapId: 97 };
      const mahsup = { id: 71, tur: "mahsup", tarih: "2026-10-05", tutar: 500, calisanId: 7, giderId: 1 };
      expect(eylemDenetimi({ hesapHareketleri: [] }, { hesapHareketleri: [avans] }, izin(["gider_odeme"]), "user")).toMatchObject({ ok: false, gerekli: "avans" });
      expect(eylemDenetimi({ hesapHareketleri: [] }, { hesapHareketleri: [avans] }, izin(["avans"]), "user").ok).toBe(true);
      expect(eylemDenetimi({ hesapHareketleri: [avans] }, { hesapHareketleri: [] }, izin(["gider_odeme"]), "user")).toMatchObject({ ok: false, islem: "sil", gerekli: "avans" });
      expect(eylemDenetimi({ hesapHareketleri: [avans] }, { hesapHareketleri: [{ ...avans, tutar: 1 }] }, izin(["gider_odeme"]), "user")).toMatchObject({ ok: false, islem: "duzenle", gerekli: "avans" });
      expect(eylemDenetimi({ hesapHareketleri: [] }, { hesapHareketleri: [mahsup] }, izin(["avans"]), "user")).toMatchObject({ ok: false, gerekli: "gider_odeme" });
      expect(eylemDenetimi({ hesapHareketleri: [] }, { hesapHareketleri: [mahsup] }, izin(["gider_odeme"]), "user").ok).toBe(true);
    });
    it("hesap ekle, düzenle, sil kasa_hesap ister", () => {
      const h = { id: 97, ad: "Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 0, kapali: false };
      expect(eylemDenetimi({ kasaHesaplari: [] }, { kasaHesaplari: [h] }, izin(["gider_add"]), "user").gerekli).toBe("kasa_hesap");
      expect(eylemDenetimi({ kasaHesaplari: [h] }, { kasaHesaplari: [{ ...h, kapali: true }] }, izin(["gider_add"]), "user")).toMatchObject({ ok: false, islem: "duzenle" });
      expect(eylemDenetimi({ kasaHesaplari: [h] }, { kasaHesaplari: [] }, izin(["gider_add"]), "user").ok).toBe(false);
      expect(eylemDenetimi({ kasaHesaplari: [h] }, { kasaHesaplari: [{ ...h, kapali: true }] }, izin(["kasa_hesap"]), "user").ok).toBe(true);
    });
    it("kalemin odendi alanı ve taksit satırı bayrakları artık izin istemez (doğruluk kaynağı değil, kayıt temizler)", () => {
      const satir = (id, o = {}) => ({ id, hedef: "ana", sira: id - 100, vade: `2026-1${id - 100}-15`, tutar: 2000, odendi: false, odemeTarihi: null, ...o });
      // Göç öncesi ödenmiş kalemi düzenleyen gider_edit kullanıcısı: kayıt bayrakları temizler, 403 almamalı.
      const e = { giderler: [kalem({ odendi: true, odemeTarihi: "2026-10-04", taksitler: [satir(101, { odendi: true, odemeTarihi: "2026-10-04" }), satir(102)] })] };
      const y = { giderler: [kalem({ aciklama: "düzeltildi", taksitler: [satir(101), satir(102)] })] };
      expect(eylemDenetimi(e, y, izin(["gider_edit"]), "user").ok).toBe(true);
      expect(eylemDenetimi({ giderler: [] }, { giderler: [kalem({ id: 5 })] }, izin(["gider_add"]), "user").ok).toBe(true);
    });
    it("tutar değişip ödenmemiş satırlar yeniden bölünürse gider_edit yeter (0021 R10)", () => {
      const satir = (id, o = {}) => ({ id, hedef: "ana", sira: id - 100, vade: `2026-1${id - 100}-15`, tutar: 2000, ...o });
      const yeni = { giderler: [kalem({ tutar: 8000, taksitler: [satir(101, { tutar: 3000 }), satir(102, { tutar: 3000 }), satir(103)] })] };
      expect(eylemDenetimi({ giderler: [kalem({ taksitler: [satir(101), satir(102)] })] }, yeni, izin(["gider_edit"]), "user").ok).toBe(true);
    });
    it("hesap ve hareket bölümleri yalnız Giderler sekmesiyle yazılır; sekme listesi tanımsız kullanıcı yazamaz (K6)", () => {
      const eski = { hesapHareketleri: [] }, yeni = { hesapHareketleri: [odeme()] };
      expect(yazmaYetkisiVar(JSON.stringify({ tabs: ["finance"] }), "user", ["hesapHareketleri"], eski, yeni).ok).toBe(false);
      expect(yazmaYetkisiVar(JSON.stringify({ tabs: ["gider"] }), "user", ["hesapHareketleri"], eski, yeni).ok).toBe(true);
      expect(giderAynaEngeli(null, "user", ["kasaHesaplari"], { kasaHesaplari: [] }, { kasaHesaplari: [{ id: 1 }] })).toBe("kasaHesaplari");
    });
  });
  it("spec 0020 P4: tanımdan üretilmiş personel kalemine sonradan makina atamak düzenlemedir, gider_edit yeter", () => {
    const tanimlar = [{ id: 9, turId: 3, calisanId: 7, baslangicAy: "2026-01" }];
    const kalem = { id: 2, tanimId: 9, donem: "2026-09", tarih: "2026-09-01", turId: 3, calisanId: 7, resmiTutar: 30000, atamaTur: "" };
    const eski = { giderler: [kalem], giderTanimlari: tanimlar };
    const yeni = { giderler: [{ ...kalem, atamaTur: "makina", makinaTur: "musteri", makinaId: 1 }], giderTanimlari: tanimlar };
    expect(eylemDenetimi(eski, yeni, izin(["gider_edit"]), "user").ok).toBe(true);
  });
  it("tedarikçi ekle/sil kendi izinleriyle; tanım, tür ve standart gider gider_tanim ile", () => {
    expect(eylemDenetimi({ tedarikciler: [] }, { tedarikciler: [{ id: 5, ad: "A" }] }, izin(["gider_add"]), "user").gerekli).toBe("tedarikci_add");
    expect(eylemDenetimi({ tedarikciler: [{ id: 5 }] }, { tedarikciler: [] }, izin(["tedarikci_add"]), "user").gerekli).toBe("tedarikci_delete");
    for (const b of ["giderTanimlari", "giderTurleri", "standartGiderler"]) {
      expect(eylemDenetimi({ [b]: [] }, { [b]: [{ id: 7 }] }, izin(["gider_add"]), "user").gerekli).toBe("gider_tanim");
      expect(eylemDenetimi({ [b]: [] }, { [b]: [{ id: 7 }] }, izin(["gider_tanim"]), "user").ok).toBe(true);
    }
  });
});

// ── Triyaj bulgusu 1, 2, 7 ──────────────────────────────────────────────────────
describe("gider: Ayarlar'ı açık ama Giderler sekmesi olmayan kullanıcı (bulgu 1)", () => {
  const ayarci = JSON.stringify({ tabs: ["settings"] }); // UserManager özelleştirilmemiş: giderActions yok = tam
  const eski = { giderler: [{ id: 1, tarih: "2026-09-01", turId: 4, tutar: 100, odendi: false, modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 10, adet: 2 }] }] };
  const dene = (yeni) => yazmaYetkisiVar(ayarci, "user", degisenBolumler(eski, yeni), eski, yeni);
  it("kalem ekleyemez, silemez, ödendi değiştiremez", () => {
    // Spec 0024: odendi artık doğruluk kaynağı değil; ama zincir dışı her kalem değişikliği Ayarlar kullanıcısına kapalı kalır.
    expect(dene({ giderler: [...eski.giderler, { id: 2, tarih: "2026-09-02", turId: 4, tutar: 99999, odendi: true, modelSatirlari: [] }] }).ok).toBe(false);
    expect(dene({ giderler: [] }).ok).toBe(false);
    expect(dene({ giderler: [{ ...eski.giderler[0], deletedAt: "x" }] }).ok).toBe(false);
    expect(dene({ giderler: [{ ...eski.giderler[0], odendi: true }] }).ok).toBe(false);
    expect(dene({ giderler: [{ ...eski.giderler[0], tutar: 1 }] }).ok).toBe(false);
  });
  it("model yeniden adlandırma zinciri (yalnız modelSatirlari[].modelAd) geçer", () => {
    const yeni = { giderler: [{ ...eski.giderler[0], modelSatirlari: [{ modelAd: "AK100_YENI", birimMaliyet: 10, adet: 2 }] }] };
    expect(dene(yeni).ok).toBe(true);
    expect(dene({ giderler: [{ ...eski.giderler[0], modelSatirlari: [{ modelAd: "AK100_YENI", birimMaliyet: 999, adet: 2 }] }] }).ok).toBe(false);
  });
  it("çalışan silmede tanım kapatma zinciri (bitisAy + kapatildi) geçer; başka alan değişirse geçmez", () => {
    const e = { giderTanimlari: [{ id: 7, turId: 3, calisanId: 21, baslangicAy: "2026-01", bitisAy: null, uretilenAylar: ["2026-08"], modelSatirlari: [] }] };
    const kapat = { giderTanimlari: [{ ...e.giderTanimlari[0], bitisAy: "2026-08", kapatildi: true }] };
    expect(yazmaYetkisiVar(ayarci, "user", ["giderTanimlari"], e, kapat).ok).toBe(true);
    const bozuk = { giderTanimlari: [{ ...e.giderTanimlari[0], bitisAy: "2026-08", kapatildi: true, tutar: 5 }] };
    expect(yazmaYetkisiVar(ayarci, "user", ["giderTanimlari"], e, bozuk).ok).toBe(false);
    const acmaDeg = { giderTanimlari: [{ ...e.giderTanimlari[0], bitisAy: "2027-12" }] }; // kapatildi yok → zincir değil
    expect(yazmaYetkisiVar(ayarci, "user", ["giderTanimlari"], e, acmaDeg).ok).toBe(false);
  });
  it("zincir de Ayarlar sekmesi ister", () => {
    const yeni = { giderler: [{ ...eski.giderler[0], modelSatirlari: [{ modelAd: "X", birimMaliyet: 10, adet: 2 }] }] };
    expect(yazmaYetkisiVar(JSON.stringify({ tabs: ["customers"] }), "user", ["giderler"], eski, yeni).ok).toBe(false);
  });
  it("Giderler sekmesi olan kullanıcı normal kurallarla yazar (zincir istisnası ona uygulanmaz)", () => {
    const gider = JSON.stringify({ tabs: ["gider"] });
    expect(yazmaYetkisiVar(gider, "user", ["giderler"], eski, { giderler: [{ ...eski.giderler[0], odendi: true }] }).ok).toBe(true);
  });
});

describe("gider: sekme listesi tanımsız kullanıcıda Ayarlar zinciri (bulgu 2)", () => {
  const eski = { giderler: [{ id: 1, turId: 4, modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 10, adet: 2 }] }], giderTanimlari: [{ id: 7, bitisAy: null, modelSatirlari: [] }] };
  it("model adı taşıma ve tanım kapatma K6 aynasına takılmaz (izin null ve tabs'sız gövde)", () => {
    const yeni = { giderler: [{ ...eski.giderler[0], modelSatirlari: [{ modelAd: "AK100_YENI", birimMaliyet: 10, adet: 2 }] }], giderTanimlari: [{ id: 7, bitisAy: "2026-08", kapatildi: true, modelSatirlari: [] }] };
    for (const p of [null, JSON.stringify({ customerActions: ["cust_add"] })]) {
      expect(giderAynaEngeli(p, "user", ["giderler", "giderTanimlari"], eski, yeni)).toBeNull();
      expect(yazmaYetkisiVar(p, "user", ["giderler", "giderTanimlari"], eski, yeni).ok).toBe(true);
    }
  });
  it("zincir olmayan değişiklik yine reddedilir", () => {
    expect(giderAynaEngeli(null, "user", ["giderler"], eski, { giderler: [{ ...eski.giderler[0], tutar: 5 }] })).toBe("giderler");
  });
});

describe("gider: tanımdan üretim izni serbest kalem için atlatılamaz (bulgu 7)", () => {
  const uretici = JSON.stringify({ tabs: ["gider"], giderActions: ["gider_tekrar_uret"] });
  const tanimlar = [{ id: 9, turId: 4, baslangicAy: "2026-06", bitisAy: "2026-12", uretilenAylar: ["2026-09"] }];
  const ekle = (k) => eylemDenetimi({ giderler: [], giderTanimlari: tanimlar }, { giderler: [k], giderTanimlari: tanimlar }, uretici, "user");
  it("gerçek tanım + uygun dönem → gider_tekrar_uret yeterli", () => {
    expect(ekle({ id: 1, tanimId: 9, donem: "2026-09", tarih: "2026-09-01", turId: 4 }).ok).toBe(true);
  });
  it("olmayan tanım, yanlış tür, aralık dışı dönem veya tarihle uyuşmayan dönem → gider_add ister", () => {
    expect(ekle({ id: 1, tanimId: 999, donem: "2026-09", tarih: "2026-09-01", turId: 4 }).gerekli).toBe("gider_add");
    expect(ekle({ id: 1, tanimId: 9, donem: "2026-09", tarih: "2026-09-01", turId: 5 }).gerekli).toBe("gider_add");
    expect(ekle({ id: 1, tanimId: 9, donem: "2027-01", tarih: "2027-01-01", turId: 4 }).gerekli).toBe("gider_add");
    expect(ekle({ id: 1, tanimId: 9, donem: "2026-09", tarih: "2026-10-15", turId: 4 }).gerekli).toBe("gider_add");
  });
});

// Spec 0022 C5: üretim partileri gider bölümüdür (gider_tanim); makinayı partiye bağlamak stok yazımıdır.
describe("spec 0022: üretim partileri bölümü", () => {
  it("bölüm eşlemesi: giderActions, BOLUM_SEKMELERI yalnız gider (triyaj bulgu 3: stok bağı stock bölümünde), gider bölümleri listesinde", () => {
    expect(SECTION_GROUP.uretimPartileri).toBe("giderActions");
    expect(BOLUM_SEKMELERI.uretimPartileri).toEqual(["gider"]);
    expect(GIDER_BOLUMLERI.has("uretimPartileri")).toBe(true);
  });
  it("parti eklemek/silmek gider_tanim ister", () => {
    const izin = (ids) => JSON.stringify({ tabs: ["gider"], giderActions: ids });
    const p = { id: 1, ad: "P", baslangicAy: "2026-01" };
    expect(eylemDenetimi({ uretimPartileri: [] }, { uretimPartileri: [p] }, izin(["gider_add"]), "user")).toMatchObject({ ok: false, gerekli: "gider_tanim" });
    expect(eylemDenetimi({ uretimPartileri: [] }, { uretimPartileri: [p] }, izin(["gider_tanim"]), "user").ok).toBe(true);
    expect(eylemDenetimi({ uretimPartileri: [p] }, { uretimPartileri: [] }, izin(["gider_add"]), "user").ok).toBe(false);
  });
  it("sekme listesi tanımsız kullanıcı parti yazamaz (K6); yalnız stok sekmeli kullanıcı partileri değiştiremez ama makinayı bağlar", () => {
    expect(yazmaYetkisiVar(JSON.stringify({ customerActions: ["cust_add"] }), "user", ["uretimPartileri"], {}, {}).ok).toBe(false);
    const stokcu = JSON.stringify({ tabs: ["stock"], stockActions: ["stock_makina_add", "stock_makina_edit"] });
    expect(yazmaYetkisiVar(stokcu, "user", ["uretimPartileri"], {}, {}).ok).toBe(false);
    const eski = { stock: [{ id: 4, model: "AK100" }], uretimPartileri: [{ id: 1, ad: "P", baslangicAy: "2026-01" }] };
    const yeni = { ...eski, stock: [{ id: 4, model: "AK100", partiId: 1 }] };
    expect(yazmaYetkisiVar(stokcu, "user", degisenBolumler(eski, yeni), eski, yeni).ok).toBe(true);
  });
});

// ── Spec 0040: çek portföyü (C11, Q6; AC-20, AC-33, AC-34) ────────────────────────
describe("spec 0040: çek bölümü yetkisi", () => {
  const cek = (o = {}) => ({ id: 200, paymentId: 100, no: "1", banka: "Z", tur: "hamiline", durum: "portfoy", gecmis: [], ...o });
  const odeme = { id: 100, customerId: 1, tutar: 1000, yontem: "Çek" };
  it("C11: bölüm müşteri grubunda, sekmeler customers/gider/settings, gider bölümü değil", () => {
    expect(SECTION_GROUP.cekler).toBe("customerActions");
    expect(BOLUM_SEKMELERI.cekler).toEqual(["customers", "gider", "settings"]);
    expect(GIDER_BOLUMLERI.has("cekler")).toBe(false);
  });
  it("AC-33: yalnız Müşteriler sekmeli tahsilatçı çekle tahsilat (tahsilat + çek) kaydeder", () => {
    const p = JSON.stringify({ tabs: ["customers"], customerActions: ["cust_payment_add"] });
    const eski = { payments: [], cekler: [] }, yeni = { payments: [odeme], cekler: [cek()] };
    expect(yazmaYetkisiVar(p, "user", degisenBolumler(eski, yeni), eski, yeni).ok).toBe(true);
    expect(eylemDenetimi(eski, yeni, p, "user").ok).toBe(true);
  });
  it("AC-20: çek eklemek cust_payment_add ister; Müşteriler sekmesi olmayan (ve Giderler de olmayan) kullanıcı yazamaz", () => {
    const eski = { cekler: [] }, yeni = { cekler: [cek()] };
    expect(eylemDenetimi(eski, yeni, JSON.stringify({ tabs: ["customers"], customerActions: ["cust_payment_edit"] }), "user")).toMatchObject({ ok: false, gerekli: "cust_payment_add" });
    expect(yazmaYetkisiVar(JSON.stringify({ tabs: ["dashboard"] }), "user", ["cekler"], eski, yeni).ok).toBe(false);
  });
  const ciroHareketi = { id: 300, tur: "odeme", tarih: "2026-10-02", tutar: 1000, yontem: "Çek (ciro)", giderId: 5, cekId: 200 };
  it("AC-34 / Q6: ciroya giriş ve ciro iptali gider_odeme ister; diğer durumlar cust_payment_edit", () => {
    const eski = { cekler: [cek()], hesapHareketleri: [] };
    const ciro = { cekler: [cek({ durum: "ciro", gecmis: [{ tarih: "2026-10-02", durum: "ciro", not: "Ciro: X" }] })], hesapHareketleri: [ciroHareketi] };
    expect(eylemDenetimi(eski, ciro, JSON.stringify({ tabs: ["gider"], giderActions: ["gider_edit"] }), "user")).toMatchObject({ ok: false, gerekli: "gider_odeme" });
    expect(eylemDenetimi(eski, ciro, JSON.stringify({ tabs: ["gider"], giderActions: ["gider_odeme"] }), "user").ok).toBe(true);
    expect(eylemDenetimi(ciro, eski, JSON.stringify({ tabs: ["gider"], giderActions: ["gider_edit"] }), "user").gerekli).toBe("gider_odeme");
    const tahsil = { cekler: [cek({ durum: "tahsil" })] };
    expect(eylemDenetimi(eski, tahsil, JSON.stringify({ tabs: ["customers"], customerActions: ["cust_payment_add"] }), "user").gerekli).toBe("cust_payment_edit");
    expect(eylemDenetimi(eski, tahsil, JSON.stringify({ tabs: ["customers"], customerActions: ["cust_payment_edit"] }), "user").ok).toBe(true);
    // Ciro edilmiş çek karşılıksız: iki izin birlikte.
    const karsiliksiz = { cekler: [cek({ durum: "karsiliksiz" })] };
    expect(eylemDenetimi(ciro, karsiliksiz, JSON.stringify({ tabs: ["gider"], giderActions: ["gider_odeme"], customerActions: [] }), "user").gerekli).toBe("cust_payment_edit");
  });
  it("triyaj: 'ciro edildi'ye geçiş aynı yazımda o çeke bağlı yeni bir ödeme hareketi ister (hareketsiz ciro reddedilir)", () => {
    const p = JSON.stringify({ tabs: ["gider"], giderActions: ["gider_odeme"] });
    const ciroCek = cek({ durum: "ciro", gecmis: [{ tarih: "2026-10-02", durum: "ciro", not: "Ciro: X" }] });
    const eski = { cekler: [cek()], hesapHareketleri: [] };
    // Hareketsiz ciro
    expect(eylemDenetimi(eski, { cekler: [ciroCek], hesapHareketleri: [] }, p, "user")).toMatchObject({ ok: false, reddedilenBolum: "cekler", gerekli: "ciro_hareketi" });
    // Hareket bölümü hiç gönderilmemiş
    expect(eylemDenetimi(eski, { cekler: [ciroCek] }, p, "user").gerekli).toBe("ciro_hareketi");
    // Başka çeke bağlı hareket yetmez
    expect(eylemDenetimi(eski, { cekler: [ciroCek], hesapHareketleri: [{ ...ciroHareketi, cekId: 999 }] }, p, "user").gerekli).toBe("ciro_hareketi");
    // Eskiden kalan (yeni olmayan) hareket yetmez
    const eskiHareketli = { ...eski, hesapHareketleri: [ciroHareketi] };
    expect(eylemDenetimi(eskiHareketli, { cekler: [ciroCek], hesapHareketleri: [ciroHareketi] }, p, "user").gerekli).toBe("ciro_hareketi");
    // Ciro edilmiş doğan yeni çek de aynı şartı taşır
    const ekleP = JSON.stringify({ tabs: ["customers", "gider"], customerActions: ["cust_payment_add"], giderActions: ["gider_odeme"] });
    expect(eylemDenetimi({ cekler: [], hesapHareketleri: [] }, { cekler: [ciroCek], hesapHareketleri: [] }, ekleP, "user")).toMatchObject({ ok: false, islem: "ekle", gerekli: "ciro_hareketi" });
    // Doğru ciro geçer; zaten ciro edilmiş çekin başka alanının değişmesi hareket istemez
    expect(eylemDenetimi(eski, { cekler: [ciroCek], hesapHareketleri: [ciroHareketi] }, p, "user").ok).toBe(true);
    const kesideci = JSON.stringify({ tabs: ["customers"], customerActions: ["cust_payment_edit"] });
    expect(eylemDenetimi({ cekler: [ciroCek] }, { cekler: [{ ...ciroCek, kesideci: "Y" }] }, kesideci, "user").ok).toBe(true);
  });
  it("Q6: müşteri grubu kısıtlı Giderler kullanıcısı gider_odeme ile ciro yazabilir (yalnız ciroya giriş/çıkış); başka çek değişikliği yazamaz", () => {
    const p = JSON.stringify({ tabs: ["gider", "finance"], giderActions: ["gider_odeme"], customerActions: [] });
    const eski = { cekler: [cek()] };
    const ciro = { cekler: [cek({ durum: "ciro", gecmis: [{ tarih: "2026-10-02", durum: "ciro", not: "Ciro: X" }] })] };
    expect(cekYalnizCiroMu(eski, ciro)).toBe(true);
    expect(yazmaYetkisiVar(p, "user", ["cekler"], eski, ciro).ok).toBe(true);
    const numara = { cekler: [cek({ no: "2" })] };
    expect(yazmaYetkisiVar(p, "user", ["cekler"], eski, numara).ok).toBe(false);
    expect(yazmaYetkisiVar(JSON.stringify({ tabs: ["gider"], giderActions: ["gider_edit"], customerActions: [] }), "user", ["cekler"], eski, ciro).ok).toBe(false);
  });
});

// ── Spec 0049: bağsız alınan çek ve verilen çek (R15, Q8; AC-22, AC-23) ─────────────────
describe("spec 0049: bağsız çek yetkisi", () => {
  const bagsiz = (o = {}) => ({ id: 400, yon: "alinan", paymentId: null, no: "7", banka: "İş", tur: "hamiline", durum: "portfoy", tutar: 5000, currency: "TRY", vadeTarihi: "2026-11-01", tarih: "2026-09-01", kimden: "X", gecmis: [], ...o });
  const verilen = (o = {}) => ({ id: 500, yon: "verilen", paymentId: null, no: "A1", banka: "Ziraat", tur: "hamiline", durum: "yazildi", tutar: 3000, vadeTarihi: "2026-10-15", tarih: "2026-09-02", hesapId: 97, alacakliTur: "tedarikci", alacakliId: 11, alacakliAd: "Demir", gecmis: [], ...o });
  const hareket = { id: 600, tur: "odeme", tarih: "2026-09-02", tutar: 3000, yontem: "Çek (kendi)", giderId: 5, cekId: 500, hesapId: null };
  const kasaci = JSON.stringify({ tabs: ["gider", "finance", "kasa"], giderActions: ["gider_odeme"], customerActions: [] }); // spec 0052: verilen çek Kasa sekmesi ister
  const odemesiz = JSON.stringify({ tabs: ["gider", "finance", "customers"], giderActions: ["gider_edit"], customerActions: ["cust_payment_add", "cust_payment_edit"] });
  it("AC-23: bağsız çek ekleme, silme ve durum değişikliği gider_odeme ister; tahsilat izinleri yetmez", () => {
    const bos = { cekler: [] }, ekli = { cekler: [bagsiz()] }, tahsil = { cekler: [bagsiz({ durum: "tahsil" })] };
    expect(eylemDenetimi(bos, ekli, odemesiz, "user")).toMatchObject({ ok: false, islem: "ekle", gerekli: "gider_odeme" });
    expect(eylemDenetimi(ekli, bos, odemesiz, "user")).toMatchObject({ ok: false, islem: "sil", gerekli: "gider_odeme" });
    expect(eylemDenetimi(ekli, tahsil, odemesiz, "user")).toMatchObject({ ok: false, islem: "duzenle", gerekli: "gider_odeme" });
    expect(eylemDenetimi(ekli, { cekler: [bagsiz({ tutar: 1 })] }, odemesiz, "user").gerekli).toBe("gider_odeme");
    for (const [a, b] of [[bos, ekli], [ekli, bos], [ekli, tahsil]]) expect(eylemDenetimi(a, b, kasaci, "user").ok).toBe(true);
  });
  it("Q8: müşteri grubu kısıtlı Kasa kullanıcısı yalnız bağsız çek yazabilir; bağlı çeke dokunan yazım reddedilir", () => {
    const bagli = { id: 200, paymentId: 100, no: "1", banka: "Z", tur: "hamiline", durum: "portfoy", gecmis: [] };
    const eski = { cekler: [bagli] }, yeni = { cekler: [bagli, bagsiz()] };
    expect(cekYalnizBagsizMi(eski, yeni)).toBe(true);
    expect(yazmaYetkisiVar(kasaci, "user", ["cekler"], eski, yeni).ok).toBe(true);
    expect(cekYalnizBagsizMi(eski, { cekler: [{ ...bagli, no: "2" }, bagsiz()] })).toBe(false);
    expect(yazmaYetkisiVar(kasaci, "user", ["cekler"], eski, { cekler: [{ ...bagli, no: "2" }, bagsiz()] }).ok).toBe(false);
    expect(yazmaYetkisiVar(JSON.stringify({ tabs: ["gider", "finance"], giderActions: ["gider_edit"], customerActions: [] }), "user", ["cekler"], eski, yeni).ok).toBe(false);
  });
  it("Q8: yeni verilen çek aynı yazımda ona bağlı yeni bir ödeme hareketi ister", () => {
    const eski = { cekler: [], hesapHareketleri: [] };
    expect(eylemDenetimi(eski, { cekler: [verilen()], hesapHareketleri: [] }, kasaci, "user")).toMatchObject({ ok: false, gerekli: "cek_hareketi" });
    expect(eylemDenetimi(eski, { cekler: [verilen()], hesapHareketleri: [{ ...hareket, cekId: 999 }] }, kasaci, "user").gerekli).toBe("cek_hareketi");
    expect(eylemDenetimi(eski, { cekler: [verilen()], hesapHareketleri: [hareket] }, kasaci, "user").ok).toBe(true);
  });
  it("triyaj: bağlı çeki bağsıza çeviren (paymentId boşaltan) yazım gider_odeme ile birlikte cust_payment_edit de ister", () => {
    const bagli = { id: 200, paymentId: 100, no: "1", banka: "Z", tur: "hamiline", durum: "portfoy", gecmis: [] };
    const bosaltilmis = { cekler: [{ ...bagli, paymentId: null, durum: "tahsil" }] };
    const kismi = JSON.stringify({ tabs: ["gider", "customers"], giderActions: ["gider_odeme"], customerActions: ["cust_payment_add"] });
    expect(eylemDenetimi({ cekler: [bagli] }, bosaltilmis, kismi, "user")).toMatchObject({ ok: false, gerekli: "cust_payment_edit" });
    expect(eylemDenetimi({ cekler: [{ ...bagli, paymentId: null }] }, { cekler: [bagli] }, kismi, "user").gerekli).toBe("cust_payment_edit"); // tersi de
    const ikisi = JSON.stringify({ tabs: ["gider", "customers"], giderActions: ["gider_odeme"], customerActions: ["cust_payment_add", "cust_payment_edit"] });
    expect(eylemDenetimi({ cekler: [bagli] }, bosaltilmis, ikisi, "user").ok).toBe(true);
    expect(eylemDenetimi({ cekler: [bagli] }, bosaltilmis, JSON.stringify({ tabs: ["customers"], customerActions: ["cust_payment_edit"], giderActions: [] }), "user").gerekli).toBe("gider_odeme");
  });
  it("AC-9: bağlı çekte 0040 kuralı aynen (durum cust_payment_edit)", () => {
    const bagli = { id: 200, paymentId: 100, no: "1", banka: "Z", tur: "hamiline", durum: "portfoy", gecmis: [] };
    expect(eylemDenetimi({ cekler: [bagli] }, { cekler: [{ ...bagli, durum: "tahsil" }] }, JSON.stringify({ tabs: ["customers"], customerActions: ["cust_payment_add"] }), "user").gerekli).toBe("cust_payment_edit");
  });
});

// ── Spec 0044 Q5: Kasa'dan tahsilat hesabı atama ────────────────────────────────────────
describe("spec 0044: yalnız hesapId değiştiren tahsilat yazımı", () => {
  const sv = (o = {}) => ({ id: 1, customerId: 5, odendi: true, servisUcreti: 100, ...o });
  const kasaci = JSON.stringify({ tabs: ["gider", "finance"], customerActions: [], stockActions: [], giderActions: ["gider_odeme"] });
  it("Q5: Giderler + Finans sekmeli kullanıcı servis, kalıp ve yedek parçaya yalnız hesap atayabilir", () => {
    for (const [bolum, kayit] of [["services", sv()], ["partSales", { id: 1, customerId: 5, tur: "Kalıp", odendi: true }], ["yedekParcaSatislar", { id: 1, aliciTipi: "bayi", dealerId: 2, odendi: true, tahsisler: [] }]]) {
      const eski = { [bolum]: [kayit] }, yeni = { [bolum]: [{ ...kayit, hesapId: 97 }] };
      expect(tahsilatHesabiYalnizMi(bolum, eski, yeni)).toBe(true);
      expect(yazmaYetkisiVar(kasaci, "user", degisenBolumler(eski, yeni), eski, yeni).ok).toBe(true);
      expect(eylemDenetimi(eski, yeni, kasaci, "user").ok).toBe(true);
    }
  });
  it("Q5: hesapla birlikte başka alan değişirse, kayıt eklenirse ya da kullanıcı Kasa'yı görmüyorsa reddedilir", () => {
    const eski = { services: [sv()] };
    expect(yazmaYetkisiVar(kasaci, "user", ["services"], eski, { services: [sv({ hesapId: 97, servisUcreti: 1 })] }).ok).toBe(false);
    expect(yazmaYetkisiVar(kasaci, "user", ["services"], eski, { services: [sv({ hesapId: 97 }), sv({ id: 2 })] }).ok).toBe(false);
    const yalnizGider = JSON.stringify({ tabs: ["gider"], customerActions: [] });
    expect(yazmaYetkisiVar(yalnizGider, "user", ["services"], eski, { services: [sv({ hesapId: 97 })] }).ok).toBe(false);
    // Spec 0056 R20 ile güncellendi: makina tahsilatı (payments) ve çek de istisnada; listede olmayan bölüm hâlâ değil.
    expect(tahsilatHesabiYalnizMi("payments", { payments: [{ id: 1 }] }, { payments: [{ id: 1, hesapId: 2 }] })).toBe(true);
    expect(tahsilatHesabiYalnizMi("customers", { customers: [{ id: 1 }] }, { customers: [{ id: 1, hesapId: 2 }] })).toBe(false);
  });
});

// ── Spec 0063 AC-20: yeni giriş noktalarının hesap alanı yeni bir 403 doğurmaz ─────────────────────
describe("spec 0063: ilk ödeme ve bayi satışlarında hesapId", () => {
  const dene = (perm, eski, yeni) => {
    const y = yazmaYetkisiVar(perm, "user", degisenBolumler(eski, yeni), eski, yeni);
    const e = eylemDenetimi(eski, yeni, perm, "user");
    return y.ok && e.ok;
  };
  const hesapsiz = (blob) => JSON.parse(JSON.stringify(blob, (k, v) => (k === "hesapId" ? undefined : v)));
  it("AC-20: hesapId ALAN_IZINLERI'nde yok (alan düzeyinde denetlenmez)", () => {
    for (const kurallar of Object.values(ALAN_IZINLERI)) expect(kurallar.map(k => k.alan)).not.toContain("hesapId");
  });
  it("AC-20: müşteri ekleme + tahsilat izinli kullanıcı hesaplı ilk ödemeli yeni müşteri yazar; hesapsızıyla aynı sonuç", () => {
    const perm = JSON.stringify({ tabs: ["customers"], customerActions: ["cust_add", "cust_payment_add"] });
    const eski = { customers: [], payments: [] };
    const yeni = {
      customers: [{ id: 10, name: "Yeni AŞ", model: "AK100", serialNo: "S1", currency: "TRY" }],
      payments: [{ id: 11, customerId: 10, tutar: 30000, currency: "TRY", tarih: "2026-10-01", yontem: "Nakit", hesapId: 53 },
        { id: 12, customerId: 10, tutar: 70000, currency: "TRY", tarih: "2026-10-01", yontem: "Nakit", hesapId: 51 }],
    };
    expect(dene(perm, eski, yeni)).toBe(true);
    expect(dene(perm, eski, hesapsiz(yeni))).toBe(true);
  });
  it("AC-20: bayi yedek parça satışı (dealer_yedek_parca_add) ve bayi aracılı kalıp (cust_kalip_add) hesapla yazılır", () => {
    const bayici = JSON.stringify({ tabs: ["dealers"], dealerActions: ["dealer_yedek_parca_add"] });
    const eskiYp = { yedekParcaSatislar: [], partStock: [{ partId: 7, miktar: 10 }], partStockLog: [] };
    const yeniYp = {
      yedekParcaSatislar: [1, 2].map(i => ({ id: 20 + i, batchId: 20, aliciTipi: "bayi", dealerId: 3, partId: 7, miktar: 1, birimFiyat: 100, currency: "TRY", tarih: "2026-10-01", odendi: true, hesapId: 51, tahsisler: [] })),
      partStock: [{ partId: 7, miktar: 8 }], partStockLog: [{ id: 30, partId: 7, tip: "bayi_satis", miktar: -2 }],
    };
    expect(dene(bayici, eskiYp, yeniYp)).toBe(true);
    expect(dene(bayici, eskiYp, hesapsiz(yeniYp))).toBe(true);
    const kalipci = JSON.stringify({ tabs: ["dealers"], customerActions: ["cust_kalip_add"] });
    const eskiK = { partSales: [], customers: [{ id: 500, name: "Kutu", kaliplar: [] }] };
    const yeniK = {
      partSales: [{ id: 40, customerId: 500, tur: "Kalıp", ad: "Hamburger", ucret: 2000, currency: "TRY", satisFirma: "Ege Bayi", odendi: true, hesapId: 51 }],
      customers: [{ id: 500, name: "Kutu", kaliplar: [{ ad: "Hamburger", partSaleId: 40 }] }],
    };
    expect(dene(kalipci, eskiK, yeniK)).toBe(dene(kalipci, eskiK, hesapsiz(yeniK)));
    expect(dene(kalipci, eskiK, yeniK)).toBe(true);
  });
});

describe("spec 0046: gider formundan ciro tek yazımda", () => {
  const cek = (o = {}) => ({ id: 200, paymentId: 100, no: "1", banka: "Z", tur: "hamiline", durum: "portfoy", gecmis: [], ...o });
  const eski = { giderler: [], hesapHareketleri: [], cekler: [cek()] };
  const yeni = {
    giderler: [{ id: 5, tarih: "2026-10-01", turId: 1, tutar: 1000, kdvOrani: 0, odendi: false, modelSatirlari: [] }],
    hesapHareketleri: [{ id: 300, tur: "odeme", tarih: "2026-10-01", tutar: 1000, yontem: "Çek (ciro)", giderId: 5, taksitId: null, hesapId: null, cekId: 200 }],
    cekler: [cek({ durum: "ciro", gecmis: [{ tarih: "2026-10-01", durum: "ciro", not: "Ciro: Usta" }] })],
  };
  it("AC-22: gider_add + gider_odeme'li, müşteri grubu kısıtlı kullanıcı yeni kalem + ciro hareketi + çek durumunu birlikte yazar", () => {
    const p = JSON.stringify({ tabs: ["gider", "finance"], giderActions: ["gider_add", "gider_odeme"], customerActions: [] });
    expect(yazmaYetkisiVar(p, "user", degisenBolumler(eski, yeni), eski, yeni).ok).toBe(true);
    expect(eylemDenetimi(eski, yeni, p, "user").ok).toBe(true);
  });
  it("AC-22: aynı yazımda gider_add yoksa kalem eklenemez; gider_odeme yoksa ciro hareketi ve çek durumu reddedilir", () => {
    expect(eylemDenetimi(eski, yeni, JSON.stringify({ tabs: ["gider", "finance"], giderActions: ["gider_odeme"], customerActions: [] }), "user")).toMatchObject({ ok: false, gerekli: "gider_add" });
    expect(eylemDenetimi(eski, yeni, JSON.stringify({ tabs: ["gider", "finance"], giderActions: ["gider_add"], customerActions: [] }), "user").ok).toBe(false);
  });
});

// ── Spec 0052 triyaj bulgu 1: virman, avans ve verilen çek Kasa sekmesi ister ─────────────────────────────
describe("spec 0052: bakiyeyi Kasa ekranından değiştiren kayıtlar Kasa sekmesi (+ Giderler + Finans) ister", () => {
  const tum = ["gider_add", "gider_edit", "gider_odeme", "kasa_hesap", "virman", "avans"];
  const izin = (tabs) => JSON.stringify({ tabs, giderActions: tum, customerActions: [] });
  const KASASIZ = izin(["dashboard", "gider", "finance"]), KASALI = izin(["dashboard", "gider", "finance", "kasa"]), FINANSSIZ = izin(["gider", "kasa"]);
  const hr = (id, tur, o = {}) => ({ id, tur, tarih: "2026-09-10", tutar: 100, hesapId: 51, ...o });
  const virman = hr(1, "virman", { karsiHesapId: 52 }), avans = hr(2, "avans", { calisanId: 9 });
  const verilen = { id: 30, yon: "verilen", no: "A-1", banka: "Z", tutar: 500, currency: "TRY", durum: "yazildi", hesapId: 51, gecmis: [] };
  const durumlar = (bolum, kayit) => [
    ["ekleme", { [bolum]: [] }, { [bolum]: [kayit] }],
    ["düzenleme", { [bolum]: [kayit] }, { [bolum]: [{ ...kayit, tutar: 999 }] }],
    ["silme", { [bolum]: [kayit] }, { [bolum]: [] }],
  ];
  const sonuc = (p, eski, yeni) => eylemDenetimi(eski, yeni, p, "user");
  it("Kasa'sız kullanıcı virman ve avansı ekleyemez, düzenleyemez, silemez (eylem izni olsa da)", () => {
    for (const k of [virman, avans]) for (const [ad, eski, yeni] of durumlar("hesapHareketleri", k)) {
      const r = sonuc(KASASIZ, eski, yeni);
      expect(r.ok, `${k.tur} ${ad}`).toBe(false);
      expect(r).toMatchObject({ reddedilenBolum: "hesapHareketleri", gerekli: "kasa_sekmesi" });
      expect(sonuc(FINANSSIZ, eski, yeni).ok, `${k.tur} ${ad} finanssız`).toBe(false);
      expect(sonuc(KASALI, eski, yeni).ok, `${k.tur} ${ad} kasalı`).toBe(true);
    }
  });
  it("Kasa'sız kullanıcı verilen (kendi) çeki yazamaz, ödendi işaretleyemez, silemez", () => {
    const hareket = { id: 70, tur: "odeme", tarih: "2026-09-10", tutar: 500, yontem: "Çek (kendi)", giderId: 5, hesapId: null, cekId: 30 };
    const ekle = [{ cekler: [], hesapHareketleri: [] }, { cekler: [verilen], hesapHareketleri: [hareket] }];
    expect(sonuc(KASASIZ, ...ekle)).toMatchObject({ ok: false, reddedilenBolum: "cekler", gerekli: "kasa_sekmesi" });
    expect(sonuc(KASALI, ...ekle).ok).toBe(true);
    const odendi = [{ cekler: [verilen] }, { cekler: [{ ...verilen, durum: "odendi", gecmis: [{ tarih: "2026-09-20", durum: "odendi" }] }] }];
    expect(sonuc(KASASIZ, ...odendi).ok).toBe(false);
    expect(sonuc(KASALI, ...odendi).ok).toBe(true);
    expect(sonuc(KASASIZ, { cekler: [verilen] }, { cekler: [] }).ok).toBe(false);
  });
  it("R8 korunur: Kasa'sız gider kullanıcısı ödeme ve mahsup yazar; alınan (bağsız) çek eklemek de etkilenmez", () => {
    for (const k of [hr(3, "odeme", { giderId: 5, hesapId: null }), hr(4, "mahsup", { giderId: 5, calisanId: 9, hesapId: null })])
      for (const [ad, eski, yeni] of durumlar("hesapHareketleri", k)) expect(sonuc(KASASIZ, eski, yeni).ok, `${k.tur} ${ad}`).toBe(true);
    const alinan = { id: 31, paymentId: null, no: "B-1", banka: "Z", tutar: 200, currency: "TRY", durum: "portfoy", kimden: "X", gecmis: [] };
    expect(sonuc(KASASIZ, { cekler: [] }, { cekler: [alinan] }).ok).toBe(true);
  });
  it("değişmeden duran virman, avans ve verilen çek başka bir yazımı engellemez", () => {
    const eski = { hesapHareketleri: [virman, avans], cekler: [verilen] };
    const yeni = { hesapHareketleri: [virman, avans, hr(5, "odeme", { giderId: 5 })], cekler: [verilen] };
    expect(sonuc(KASASIZ, eski, yeni).ok).toBe(true);
  });
});

// ── Spec 0058: kasa iş listesinden kapsam dışı bırakma (R9, R12, R20; AC-12, AC-19) ─────────────────────
describe("spec 0058: kasaKapsamDisi bölümü Kasa sekmesi + kasa_hesap ister; temizlik silmesi serbest", () => {
  const izin = (tabs, giderActions = ["gider_odeme", "kasa_hesap"]) => JSON.stringify({ tabs, giderActions, customerActions: [] });
  const KASALI = izin(["gider", "finance", "kasa"]), KASASIZ = izin(["gider", "finance"]), FINANSSIZ = izin(["gider", "kasa"]),
    IZINSIZ = izin(["gider", "finance", "kasa"], ["gider_odeme"]);
  const g = { id: 801, tur: "tahsilat", kaynak: "servis", kayitId: 11, zaman: "2026-10-01T10:00:00.000Z" };
  const sv = (o = {}) => ({ id: 11, customerId: 1, odendi: true, servisUcreti: 1000, hesapId: null, ...o });
  const HES = [{ id: 51, ad: "Ziraat", paraBirimi: "TRY" }];
  const yetki = (p, eski, yeni) => {
    const bolumler = degisenBolumler(eski, yeni);
    const a = yazmaYetkisiVar(p, "user", bolumler, eski, yeni), b = eylemDenetimi(eski, yeni, p, "user"), c = giderAynaEngeli(p, "user", bolumler, eski, yeni);
    return a.ok && b.ok && !c;
  };
  it("eşlemeler R12'deki gibi", () => {
    expect(BLOB_SECTIONS).toContain("kasaKapsamDisi");
    expect(SECTION_GROUP.kasaKapsamDisi).toBe("giderActions");
    expect(BOLUM_SEKMELERI.kasaKapsamDisi).toEqual(["kasa"]);
    expect(GIDER_BOLUMLERI.has("kasaKapsamDisi")).toBe(true);
    expect(EYLEM_IDLERI.kasaKapsamDisi).toEqual({ ekle: "kasa_hesap", sil: "kasa_hesap" });
  });
  it("AC-19 / AC-12: Kasa'lı ve kasa_hesap'lı kullanıcı ekler ve siler; Kasa'sız, Finans'sız ya da izinsiz kullanıcı 403", () => {
    const ekle = [{ kasaKapsamDisi: [], services: [sv()] }, { kasaKapsamDisi: [g], services: [sv()] }];
    const sil = [{ kasaKapsamDisi: [g], services: [sv()] }, { kasaKapsamDisi: [], services: [sv()] }];
    for (const [e, y] of [ekle, sil]) {
      expect(yetki(KASALI, e, y)).toBe(true);
      expect(yetki(KASASIZ, e, y)).toBe(false);
      expect(yetki(FINANSSIZ, e, y)).toBe(false);
      expect(yetki(IZINSIZ, e, y)).toBe(false);
      expect(yetki(JSON.stringify({ giderActions: ["kasa_hesap"] }), e, y)).toBe(false); // sekme listesi tanımsız (K6)
    }
    expect(eylemDenetimi(...ekle, IZINSIZ, "user")).toMatchObject({ ok: false, gerekli: "kasa_hesap" });
    expect(eylemDenetimi(...ekle, KASASIZ, "user")).toMatchObject({ ok: false, gerekli: "kasa_sekmesi" });
  });
  it("R20: hesap atanan kaydın girişinin silinmesi temizliktir; Kasa'sız ve kasa_hesap'sız kullanıcının kaydı 403 almaz", () => {
    const eski = { kasaKapsamDisi: [g], services: [sv()], kasaHesaplari: HES };
    const yeni = { kasaKapsamDisi: [], services: [sv({ hesapId: 51 })], kasaHesaplari: HES };
    const tahsilatci = JSON.stringify({ tabs: ["gider", "finance", "customers"], giderActions: ["gider_odeme"], customerActions: ["cust_service_edit"] });
    expect(yetki(tahsilatci, eski, yeni)).toBe(true);
    expect(yetki(KASASIZ, eski, yeni)).toBe(true);
    // Kayıt daha önce kalıcı silinmiş (çöp boşaltıldı) ya da hareket hesaba bağlanmış: temizlik sonraki yazımda gelir.
    expect(yetki(KASASIZ, { kasaKapsamDisi: [g], services: [] }, { kasaKapsamDisi: [], services: [] })).toBe(true);
    const gh = { id: 802, tur: "hareket", kaynak: null, kayitId: 70 };
    expect(yetki(KASASIZ, { kasaKapsamDisi: [gh], hesapHareketleri: [] }, { kasaKapsamDisi: [], hesapHareketleri: [] })).toBe(true);
  });
  it("R20: kaydı hâlâ hesapsızken silme, ekleme ile karışık yazım ya da var olan girişi değiştirme temizlik değildir", () => {
    expect(yetki(KASASIZ, { kasaKapsamDisi: [g], services: [sv()] }, { kasaKapsamDisi: [], services: [sv()] })).toBe(false);
    expect(yetki(KASASIZ, { kasaKapsamDisi: [g], services: [sv()], kasaHesaplari: HES }, { kasaKapsamDisi: [], services: [sv({ hesapId: 999 })], kasaHesaplari: HES })).toBe(false); // silinmiş hesap: hâlâ hesapsız
    const yeniGiris = { ...g, id: 803, kayitId: 12 };
    expect(yetki(KASASIZ, { kasaKapsamDisi: [g], services: [sv()], kasaHesaplari: HES }, { kasaKapsamDisi: [yeniGiris], services: [sv({ hesapId: 51 })], kasaHesaplari: HES })).toBe(false);
    expect(yetki(KASASIZ, { kasaKapsamDisi: [g, { ...g, id: 804, kayitId: 13 }], services: [sv()] }, { kasaKapsamDisi: [{ ...g, zaman: "x" }], services: [] })).toBe(false);
  });
});

// ── Spec 0056 R20, R25 (AC-23): hesap taşıma yazımı yalnız kasa_hesap + Kasa sekmesiyle ─────────────────────────
describe("spec 0056: hesabı silip bağlarını taşıyan yazım", () => {
  const TASIYICI = JSON.stringify({ tabs: ["gider", "finance", "kasa"], giderActions: ["kasa_hesap"], customerActions: [] });
  const KASASIZ = JSON.stringify({ tabs: ["gider", "finance"], giderActions: ["kasa_hesap"], customerActions: [] });
  const IZINSIZ = JSON.stringify({ tabs: ["gider", "finance", "kasa"], giderActions: ["gider_odeme"], customerActions: [] });
  const H = (id, o = {}) => ({ id, ad: `H${id}`, tur: "banka", paraBirimi: "TRY", kapali: false, ...o });
  // Dönem kayıtlı ayardan; testler gerçek tarihten bağımsız olsun diye açık uçlu tarih.
  const eski = {
    appSettings: { giderAyarlari: { denemeDonemiBitis: "2099-01-01" } },
    kasaHesaplari: [H(51), H(52)],
    hesapHareketleri: [{ id: 1, tur: "odeme", tutar: 10, hesapId: 51, giderId: 5 }, { id: 2, tur: "avans", tutar: 5, hesapId: 51, calisanId: 7 },
      { id: 3, tur: "virman", tutar: 3, hesapId: 51, karsiHesapId: 9 }],
    payments: [{ id: 10, customerId: 1, tutar: 100, hesapId: 51 }], services: [{ id: 20, customerId: 1, odendi: true, hesapId: 51 }],
    cekler: [{ id: 30, yon: "verilen", paymentId: null, no: "K", tutar: 50, durum: "yazildi", hesapId: 51, gecmis: [] }],
  };
  const tasi = (hedef) => {
    const m = (r) => (r.hesapId === 51 ? { ...r, hesapId: hedef } : r);
    return { kasaHesaplari: [H(52), ...(hedef === 9 ? [H(9)] : [])], hesapHareketleri: eski.hesapHareketleri.map(m), payments: eski.payments.map(m), services: eski.services.map(m), cekler: eski.cekler.map(m) };
  };
  const yetki = (p, e, y) => {
    const b = degisenBolumler(e, y);
    return yazmaYetkisiVar(p, "user", b, e, y).ok && eylemDenetimi(e, y, p, "user").ok && !giderAynaEngeli(p, "user", b, e, y);
  };
  it("AC-23: yalnız kasa_hesap'lı Kasa kullanıcısı taşır (avans/virman/gider_odeme ve müşteri izni olmadan); hesapsız bırakma da", () => {
    expect(hesapTasimaYazimiMi(eski, tasi(52))).toBe(true);
    expect(yetki(TASIYICI, eski, tasi(52))).toBe(true);
    expect(yetki(TASIYICI, eski, tasi(null))).toBe(true);
    expect(yetki(KASASIZ, eski, tasi(52))).toBe(false);
    expect(yetki(IZINSIZ, eski, tasi(52))).toBe(false);
  });
  it("R25 sınırları: hesap silinmiyorsa, başka alan değişirse, kayıt eklenirse ya da hedef kapalı/yoksa taşıma yazımı değildir", () => {
    const y = tasi(52);
    expect(hesapTasimaYazimiMi(eski, { ...y, kasaHesaplari: eski.kasaHesaplari })).toBe(false); // hesap silinmedi
    expect(hesapTasimaYazimiMi(eski, { ...y, payments: y.payments.map(p => ({ ...p, tutar: 1 })) })).toBe(false);
    expect(hesapTasimaYazimiMi(eski, { ...y, payments: [...y.payments, { id: 11, hesapId: 52 }] })).toBe(false);
    expect(hesapTasimaYazimiMi(eski, { ...y, kasaHesaplari: [H(52, { kapali: true })] })).toBe(false);
    expect(hesapTasimaYazimiMi(eski, tasi(77))).toBe(false); // var olmayan hedef
    // Silinmeyen bir hesaptan alınan kayıt (52 → 53) taşıma değildir.
    const e2 = { ...eski, kasaHesaplari: [H(51), H(52), H(53)], payments: [{ id: 10, customerId: 1, tutar: 100, hesapId: 52 }] };
    expect(hesapTasimaYazimiMi(e2, { kasaHesaplari: [H(52), H(53)], payments: [{ id: 10, customerId: 1, tutar: 100, hesapId: 52 }] })).toBe(false);
    expect(hesapTasimaYazimiMi(e2, { kasaHesaplari: [H(52), H(53)], payments: [{ id: 10, customerId: 1, tutar: 100, hesapId: 53 }] })).toBe(false);
    expect(yetki(TASIYICI, eski, { ...y, payments: y.payments.map(p => ({ ...p, tutar: 1 })) })).toBe(false);
  });
});

// Triyaj bulgu 2 (0056 R4, C4): taşıma istisnası sunucuda da deneme dönemine bağlı; dönem kayıtlı ayardan okunur.
describe("spec 0056 triyaj: sunucudaki taşıma istisnası dönem bitince kapanır", () => {
  const TASIYICI = JSON.stringify({ tabs: ["gider", "finance", "kasa"], giderActions: ["kasa_hesap"], customerActions: [] });
  const H = (id) => ({ id, ad: `H${id}`, tur: "banka", paraBirimi: "TRY", kapali: false });
  const blob = (ayar, hesapId = 51, hesaplar = [H(51), H(52)]) => ({ appSettings: { giderAyarlari: ayar }, kasaHesaplari: hesaplar,
    hesapHareketleri: [{ id: 2, tur: "avans", tutar: 5, hesapId, calisanId: 7 }] });
  const tasi = (ayar) => [blob(ayar), { ...blob(ayar, 52, [H(52)]) }];
  it("kapı istemcidekiyle aynı: alan yok → 2027-01-01, boş → kapalı, bitiş günü dahil değil", () => {
    expect(denemeDonemiAcikSunucu({}, "2026-12-31")).toBe(true);
    expect(denemeDonemiAcikSunucu({}, "2027-01-01")).toBe(false);
    expect(denemeDonemiAcikSunucu({ denemeDonemiBitis: "" }, "2026-10-01")).toBe(false);
    expect(denemeDonemiAcikSunucu(undefined, "2026-10-01")).toBe(true);
  });
  it("dönem kapalıyken (geçmiş tarih ya da boş) taşıma yazımı tanınmaz ve avans taşıması 403'e düşer", () => {
    expect(hesapTasimaYazimiMi(...tasi({ denemeDonemiBitis: "2099-01-01" }))).toBe(true);
    expect(hesapTasimaYazimiMi(...tasi({}), "2027-01-01")).toBe(false);
    expect(hesapTasimaYazimiMi(...tasi({ denemeDonemiBitis: "2026-01-01" }))).toBe(false);
    const [e, y] = tasi({ denemeDonemiBitis: "" });
    expect(hesapTasimaYazimiMi(e, y)).toBe(false);
    expect(eylemDenetimi(e, y, TASIYICI, "user").ok).toBe(false); // avansın hesabı değişti: avans izni ister
    // Dönem aynı yazımda açılamaz: kayıtlı ayar kapalıyken yeni blob'da tarih ileri alınsa da tanınmaz.
    expect(hesapTasimaYazimiMi(e, { ...y, appSettings: { giderAyarlari: { denemeDonemiBitis: "2099-01-01" } } })).toBe(false);
  });
});

// Spec 0068 R15, R16, C4 (AC-22, AC-24, AC-26): tedarikçi ve üretim partisi çöp kutusuna gider; sunucu değişmedi.
describe("Spec 0068: tedarikçi ve üretim partisinde çöpe atma, geri alma ve kalıcı silme", () => {
  const ZAMAN = "2026-10-01T09:00:00.000Z";
  const giderAyarci = JSON.stringify({ tabs: ["gider", "settings"] });
  const yalnizAyarci = JSON.stringify({ tabs: ["settings"] });
  it("AC-22: gider + ayarlar sekmeli kullanıcı Çöp Kutusu'ndan geri alır (403 yok); yalnız ayarlar sekmeli kullanıcı yazamaz", () => {
    for (const [b, k] of [["tedarikciler", { id: 5, ad: "A" }], ["uretimPartileri", { id: 6, ad: "P", baslangicAy: "2026-07" }]]) {
      const eski = { [b]: [{ ...k, deletedAt: ZAMAN }] }, yeni = { [b]: [{ ...k }] };
      expect(yazmaYetkisiVar(giderAyarci, "user", [b], eski, yeni).ok, b).toBe(true);
      expect(eylemDenetimi(eski, yeni, giderAyarci, "user").ok, b).toBe(true);
      expect(yazmaYetkisiVar(yalnizAyarci, "user", [b], eski, yeni).ok, b).toBe(false);
    }
  });
  it("AC-24 / R16: çöpe atma (deletedAt damgası) sunucuda silme sayılır ve silme iznini ister; yeni izin kimliği yok (giderler ile aynı)", () => {
    const p = (g) => JSON.stringify({ tabs: ["gider"], giderActions: g });
    expect(eylemDenetimi({ tedarikciler: [{ id: 5, ad: "A" }] }, { tedarikciler: [{ id: 5, ad: "A", deletedAt: ZAMAN }] }, p(["tedarikci_edit"]), "user").gerekli).toBe("tedarikci_delete");
    expect(eylemDenetimi({ tedarikciler: [{ id: 5, ad: "A" }] }, { tedarikciler: [{ id: 5, ad: "A", deletedAt: ZAMAN }] }, p(["tedarikci_delete"]), "user").ok).toBe(true);
    expect(eylemDenetimi({ uretimPartileri: [{ id: 6 }] }, { uretimPartileri: [{ id: 6, deletedAt: ZAMAN }] }, p(["gider_edit"]), "user").gerekli).toBe("gider_tanim");
  });
  it("AC-26 / R16: geri alma ve çöpteki kaydın kalıcı silinmesi bölüm düzeyinde geçer (giderler ile aynı kabul edilen sınır; arayüz silme izniyle kapılar)", () => {
    const p = JSON.stringify({ tabs: ["gider"], giderActions: ["gider_add"] });
    expect(eylemDenetimi({ tedarikciler: [{ id: 5, ad: "A", deletedAt: ZAMAN }] }, { tedarikciler: [{ id: 5, ad: "A" }] }, p, "user").ok).toBe(true);
    expect(eylemDenetimi({ tedarikciler: [{ id: 5, ad: "A", deletedAt: ZAMAN }] }, { tedarikciler: [] }, p, "user").ok).toBe(true);
    expect(eylemDenetimi({ uretimPartileri: [{ id: 6, deletedAt: ZAMAN }] }, { uretimPartileri: [] }, p, "user").ok).toBe(true);
});
});
