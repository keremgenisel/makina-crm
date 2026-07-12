// SettingsServer'dan ayrılan izin tanımları — saf parse yardımcıları (serverPermissionDefs.js).
import { describe, it, expect } from "vitest";
import {
  parseTabPerms, parseSettingsPerms, parseCustomerActionsPerms, parseFinanceActionsPerms,
  ALL_TABS, DEFAULT_USER_TABS, CUSTOMER_ACTION_GROUPS,
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
});
