// Sunucu tarafı yazma yetkisi (electron/serverAuth.cjs) — saf mantık testleri.
// Regresyon: salt-okunur/kısıtlı bir kullanıcı, izin sistemi yalnızca arayüzde
// çalıştığı için elle HTTP isteğiyle tüm veriyi ezebiliyordu; sunucu artık
// değişen bölümleri kullanıcının iznine göre denetliyor.
import { describe, it, expect } from "vitest";
import {
  BLOB_SECTIONS, SECTION_GROUP, BOLUM_SEKMELERI, AYAR_ALAN_SEKMELERI,
  degisenBolumler, kisitliMi, yazmaYetkisiVar, eylemDenetimi, EYLEM_IDLERI, ALAN_IZINLERI, dosyaIslemYetkisi, dosyaSilmeYetkisi, sonAdminiDusururMu,
  GIDER_BOLUMLERI, giderAynaEngeli,
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
  const izin = (ids) => JSON.stringify({ tabs: ["gider"], giderActions: ids });
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
  it("ödeme durumu (odendi) gider_odeme ister; diğer alan düzenlemesi istemez", () => {
    const eski = { giderler: [{ id: 1, odendi: false, aciklama: "a" }] };
    expect(eylemDenetimi(eski, { giderler: [{ id: 1, odendi: true, aciklama: "a" }] }, izin(["gider_edit"]), "user").gerekli).toBe("gider_odeme");
    expect(eylemDenetimi(eski, { giderler: [{ id: 1, odendi: false, aciklama: "b" }] }, izin(["gider_edit"]), "user").ok).toBe(true);
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
