// Sunucu tarafı yazma yetkisi (electron/serverAuth.cjs) — saf mantık testleri.
// Regresyon: salt-okunur/kısıtlı bir kullanıcı, izin sistemi yalnızca arayüzde
// çalıştığı için elle HTTP isteğiyle tüm veriyi ezebiliyordu; sunucu artık
// değişen bölümleri kullanıcının iznine göre denetliyor.
import { describe, it, expect } from "vitest";
import {
  BLOB_SECTIONS, SECTION_GROUP,
  degisenBolumler, kisitliMi, yazmaYetkisiVar,
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
