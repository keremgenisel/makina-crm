// SettingsServer'dan ayrılan izin tanımları — saf parse yardımcıları (serverPermissionDefs.js).
import { describe, it, expect } from "vitest";
import {
  parseTabPerms, parseSettingsPerms, parseCustomerActionsPerms, parseFinanceActionsPerms,
  ALL_TABS, DEFAULT_USER_TABS, CUSTOMER_ACTION_GROUPS, DEALER_ACTION_GROUPS,
} from "../src/components/settings/serverPermissionDefs.js";

describe("parse* — permissions JSON'undan bölüm çıkarma", () => {
  it("ilgili bölümü döner, yoksa/bozuksa null", () => {
    const perms = JSON.stringify({ tabs: ["dashboard", "customers"], settings: ["server"], customerActions: ["cust_add"] });
    expect(parseTabPerms(perms)).toEqual(["dashboard", "customers"]);
    expect(parseSettingsPerms(perms)).toEqual(["server"]);
    expect(parseCustomerActionsPerms(perms)).toEqual(["cust_add"]);
    expect(parseFinanceActionsPerms(perms)).toBeNull(); // o bölüm yok
  });
  it("null/boş/bozuk girdide null döner (varsayılan = tümü açık)", () => {
    expect(parseTabPerms(null)).toBeNull();
    expect(parseTabPerms("")).toBeNull();
    expect(parseTabPerms("{bozuk")).toBeNull();
  });
});

describe("izin tanım verisi tutarlılığı", () => {
  it("ALL_TABS ve DEFAULT_USER_TABS geçerli id'ler içerir", () => {
    const ids = ALL_TABS.map(t => t.id);
    expect(ids).toContain("dashboard");
    expect(ids).toContain("settings");
    // varsayılan kullanıcı sekmeleri ALL_TABS içindeki gerçek id'ler olmalı
    for (const id of DEFAULT_USER_TABS) expect(ids).toContain(id);
  });
  it("CUSTOMER_ACTION_GROUPS her item benzersiz id taşır", () => {
    const allIds = CUSTOMER_ACTION_GROUPS.flatMap(g => g.items.map(i => i.id));
    expect(new Set(allIds).size).toBe(allIds.length);
  });
  // UserManager, Servis Panosu izinlerini ayrı akordeona `servisPano:true` bayrağıyla süzüyor
  // (eski tek "Makina Geçmişi — Servisler" grubu alt başlıklara bölündü). Bayrak kaybolursa
  // o izinler ya Müşteri akordeonuna sızar ya da Servis akordeonu boşalır.
  it("servis pano izinleri servisPano:true gruplarında, alt başlıklara bölünmüş ve tam", () => {
    const servisGruplar = CUSTOMER_ACTION_GROUPS.filter(g => g.servisPano === true);
    // Beklenen alt başlıklar (UserManager bunları başlık başlık gösterir)
    expect(servisGruplar.map(g => g.grup)).toEqual(["Servis Kaydı", "Servis Kartı (Pano)", "Kargo Panosu", "Extra Kalıp Kargo Panosu"]);
    // Tüm servis-pano id'leri (sıra: gruplar + grup içi) — eskiden tek grupta olan 11 iznin tamamı
    const ids = servisGruplar.flatMap(g => g.items.map(i => i.id));
    expect(ids).toEqual(["cust_service_add", "cust_service_edit", "cust_service_payment", "cust_service_delete", "cust_service_pano_kaldir", "cust_service_pano_arsiv", "servis_yedek_parca_add", "kargo_pano_kaldir", "kargo_pano_arsiv", "kalip_pano_kaldir", "kalip_pano_arsiv"]);
  });

  it("servisPano grupları Müşteri işlemleri akordeonuna sızmaz (ayrım net)", () => {
    // Müşteri akordeonu servisPano OLMAYAN gruplar; hiçbir cust_service_*/kargo_pano_*/kalip_pano_* içermez
    const musteriIds = CUSTOMER_ACTION_GROUPS.filter(g => !g.servisPano).flatMap(g => g.items.map(i => i.id));
    for (const id of ["cust_service_add", "cust_service_edit", "cust_service_pano_kaldir", "servis_yedek_parca_add", "kargo_pano_kaldir", "kalip_pano_arsiv"]) {
      expect(musteriIds, id).not.toContain(id);
    }
    // Ama gerçek müşteri izinleri orada durur
    expect(musteriIds).toContain("cust_add");
    expect(musteriIds).toContain("cust_yedek_parca_add");
  });

  it("yedek parça satışı EKLE izinleri üç arayüz için üç ayrı boyutta tanımlı", () => {
    const custIds = CUSTOMER_ACTION_GROUPS.flatMap(g => g.items.map(i => i.id));
    expect(custIds).toContain("cust_yedek_parca_add");    // müşteri detayı butonu
    expect(custIds).toContain("servis_yedek_parca_add");  // pano butonu
    const dealerIds = DEALER_ACTION_GROUPS.flatMap(g => g.items.map(i => i.id));
    expect(dealerIds).toContain("dealer_yedek_parca_add"); // bayi butonu
  });

  it("yedek parça (müşteri) düzenle/ödeme/sil izinleri tanımlı", () => {
    const custIds = CUSTOMER_ACTION_GROUPS.flatMap(g => g.items.map(i => i.id));
    expect(custIds).toContain("cust_yedek_parca_edit");
    expect(custIds).toContain("cust_yedek_parca_payment");
    expect(custIds).toContain("cust_yedek_parca_delete");
  });
});

// Spec 0066: Kasa işlemleri izin ekranında Gider'den ayrı akordeonda; aynı GIDER_ACTION_GROUPS'un iki görünümü.
import * as Defs from "../src/components/settings/serverPermissionDefs.js";
import { readFileSync, readdirSync } from "node:fs";
describe("Spec 0066: Gider ve Kasa akordeonlarının ayrımı (R4, R10, R14, R15)", () => {
  const ids = (gruplar) => gruplar.flatMap(g => g.items.map(i => i.id));
  it("AC-12: Kasa akordeonunun kimlikleri KASA_EYLEM_IDLERI ile birebir eşit", () => {
    expect(new Set(ids(Defs.KASA_AKORDEON_GRUPLARI))).toEqual(Defs.KASA_EYLEM_IDLERI);
    expect(ids(Defs.KASA_AKORDEON_GRUPLARI)).toHaveLength(Defs.KASA_EYLEM_IDLERI.size);
  });
  it("AC-13: Gider akordeonuna hiçbir kasa kimliği sızmaz", () => {
    expect(ids(Defs.GIDER_AKORDEON_GRUPLARI).filter(id => Defs.KASA_EYLEM_IDLERI.has(id))).toEqual([]);
  });
  it("AC-14 / AC-23: iki görünümün birleşimi GIDER_ACTION_GROUPS'un tamamı; ikisi de aynı diziden süzülür (kasaGrubuMu)", () => {
    expect([...Defs.GIDER_AKORDEON_GRUPLARI, ...Defs.KASA_AKORDEON_GRUPLARI].map(g => g.grup).sort())
      .toEqual(Defs.GIDER_ACTION_GROUPS.map(g => g.grup).sort());
    expect(new Set([...ids(Defs.GIDER_AKORDEON_GRUPLARI), ...ids(Defs.KASA_AKORDEON_GRUPLARI)])).toEqual(new Set(ids(Defs.GIDER_ACTION_GROUPS)));
    for (const g of Defs.KASA_AKORDEON_GRUPLARI) expect(Defs.GIDER_ACTION_GROUPS).toContain(g);
    expect(Defs.GIDER_ACTION_GROUPS.filter(Defs.kasaGrubuMu)).toEqual(Defs.KASA_AKORDEON_GRUPLARI);
  });
  it("AC-20: gider ve kasa akordeonlarının grup adları birebir (R1: \"Kasa ve hesaplar\" → \"Hesaplar ve hareketler\")", () => {
    expect(Defs.GIDER_AKORDEON_GRUPLARI.map(g => g.grup)).toEqual(["Kalem işlemleri", "Tanım yönetimi", "Tedarikçi yönetimi"]);
    expect(Defs.KASA_AKORDEON_GRUPLARI.map(g => g.grup)).toEqual(["Hesaplar ve hareketler"]);
  });
  it("AC-21: kutu etiketleri ve kimlikleri bu işten önceki hâliyle birebir aynı", () => {
    expect(Defs.GIDER_ACTION_GROUPS.flatMap(g => g.items)).toEqual([
      { id: "gider_add", label: "Gider ekle" },
      { id: "gider_edit", label: "Gider düzenle" },
      { id: "gider_delete", label: "Gider sil (çöp kutusuna)" },
      { id: "gider_odeme", label: "Ödeme kaydet ve sil" },
      { id: "gider_tekrar_uret", label: "Tekrarlayan kalemleri oluştur" },
      { id: "gider_tanim", label: "Gider türleri, tekrarlayan tanımlar, gider ayarları, standart genel giderler ve çalışan maliyetleri" },
      { id: "tedarikci_add", label: "Tedarikçi ekle" },
      { id: "tedarikci_edit", label: "Tedarikçi düzenle" },
      { id: "tedarikci_delete", label: "Tedarikçi sil" },
      { id: "kasa_hesap", label: "Hesap ekle, düzenle, kapat ve sil ve kasa iş listesini düzenleme" },
      { id: "virman", label: "Hesaplar arası virman" },
      { id: "avans", label: "Çalışana avans ver ve sil" },
    ]);
  });
  it("AC-8 / AC-11: tek tanım; ad eşleşmesi ve yeni bayrak yok", () => {
    const kaynak = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf-8");
    const defs = kaynak("src/components/settings/serverPermissionDefs.js");
    expect(defs.match(/export const GIDER_ACTION_GROUPS = /g)).toHaveLength(1);
    expect(defs).not.toMatch(/\bkasa:\s*true/);
    const um = kaynak("src/components/settings/UserManager.jsx");
    expect(um.match(/const allGiderActionIds = /g)).toHaveLength(1);
    expect(um).not.toMatch(/Hesaplar ve hareketler|Kasa ve hesaplar|g\.grup ===|\.kasa === true/);
    // Listeyi tanımlayan tek dosya defs'tir; başka hiçbir kaynak gider/kasa izin listesini kopyalamaz.
    const tara = (d) => readdirSync(new URL(`../${d}`, import.meta.url), { withFileTypes: true })
      .flatMap(e => (e.isDirectory() ? tara(`${d}/${e.name}`) : /\.(jsx?|cjs)$/.test(e.name) ? [`${d}/${e.name}`] : []));
    const kopyalar = tara("src").filter(f => /"kasa_hesap"/.test(kaynak(f)) && /"gider_add"/.test(kaynak(f)) && /label:/.test(kaynak(f)));
    expect(kopyalar).toEqual(["src/components/settings/serverPermissionDefs.js"]);
  });
});
