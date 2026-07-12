// Sunucu tarafı yazma yetkisi (electron/serverAuth.cjs) — saf mantık testleri.
// Regresyon: salt-okunur/kısıtlı bir kullanıcı, izin sistemi yalnızca arayüzde
// çalıştığı için elle HTTP isteğiyle tüm veriyi ezebiliyordu; sunucu artık
// değişen bölümleri kullanıcının iznine göre denetliyor.
import { describe, it, expect } from "vitest";
import {
  BLOB_SECTIONS, SECTION_GROUP,
  degisenBolumler, kisitliMi, yazmaYetkisiVar, eylemDenetimi, EYLEM_IDLERI, dosyaIslemYetkisi, sonAdminiDusururMu,
} from "../electron/serverAuth.cjs";
import { READONLY_SERVER_PERMISSIONS } from "../src/lib/permissions.js";

const READONLY = READONLY_SERVER_PERMISSIONS.permissions;

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
