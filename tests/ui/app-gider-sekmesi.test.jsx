// @vitest-environment jsdom
// Spec 0001 C6 kural 3 (AC-18 arayüz): Giderler sekmesi, bu uygulamanın "sekme listesi tanımsız =
// tüm sekmeler" kuralının TEK istisnasıdır. Yerel modda ve sunucu PC'sinde her zaman açık; LAN'da
// user rolüne yalnız açıkça verildiğinde görünür.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen } from "@testing-library/react";
import App from "../../src/App";
import { gorunurSekmeler } from "../../src/lib/permissions";

afterEach(() => { cleanup(); delete window.crmStorage; vi.unstubAllGlobals(); localStorage.clear(); });

const TABS = [{ id: "dashboard" }, { id: "finance" }, { id: "gider" }, { id: "settings" }];
const ids = (l) => l.map(t => t.id);
const user = (perms) => ({ role: "user", permissions: perms === undefined ? null : JSON.stringify(perms) });

describe("AC-18 (arayüz): gider sekmesi görünürlüğü", () => {
  it("yerel mod ve sunucu PC'sinde her zaman görünür", () => {
    expect(ids(gorunurSekmeler(TABS, "none", null))).toContain("gider");
    expect(ids(gorunurSekmeler(TABS, null, user({ tabs: ["dashboard"] })))).toContain("gider");
  });
  it("admin her zaman görür", () => {
    expect(ids(gorunurSekmeler(TABS, "active", { role: "admin", permissions: null }))).toContain("gider");
  });
  it("sekme listesi tanımsız user rolü görmez; diğer sekmeler açık kalır (istisna yalnız gider)", () => {
    for (const p of [user(), user({}), user({ customerActions: ["cust_add"] })]) {
      expect(ids(gorunurSekmeler(TABS, "active", p))).toEqual(["dashboard", "finance", "settings"]);
    }
  });
  it("sekme listesinde yoksa görmez, açıkça verilince görür", () => {
    expect(ids(gorunurSekmeler(TABS, "active", user({ tabs: ["dashboard", "finance"] })))).not.toContain("gider");
    expect(ids(gorunurSekmeler(TABS, "active", user({ tabs: ["dashboard", "gider"] })))).toEqual(["dashboard", "gider"]);
  });
  it("bozuk izin gövdesinde de kapalı kalır", () => {
    expect(ids(gorunurSekmeler(TABS, "active", { role: "user", permissions: "{bozuk" }))).not.toContain("gider");
  });
  it("yerel modda kenar menüde 'Giderler' sekmesi çizilir", async () => {
    window.crmStorage = {
      load: vi.fn(async () => ({ customers: [], appSettings: {}, dataVersion: 1 })),
      save: vi.fn(async () => true),
      getVersion: vi.fn(async () => 1),
    };
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
    render(<App />);
    await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByText("Giderler").length).toBeGreaterThan(0));
  });
});
