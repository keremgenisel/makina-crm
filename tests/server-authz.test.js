// Sunucu tarafı yazma yetkisi (electron/serverAuth.cjs) — saf mantık testleri.
// Regresyon: salt-okunur/kısıtlı bir kullanıcı, izin sistemi yalnızca arayüzde
// çalıştığı için elle HTTP isteğiyle tüm veriyi ezebiliyordu; sunucu artık
// değişen bölümleri kullanıcının iznine göre denetliyor.
import { describe, it, expect } from "vitest";
import {
  BLOB_SECTIONS, SECTION_GROUP, BOLUM_SEKMELERI, AYAR_ALAN_SEKMELERI,
  degisenBolumler, kisitliMi, yazmaYetkisiVar, eylemDenetimi, EYLEM_IDLERI, dosyaIslemYetkisi, dosyaSilmeYetkisi, sonAdminiDusururMu,
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
