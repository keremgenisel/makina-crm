// @vitest-environment jsdom
// Spec 0064 R13, R24, R32 (AC-16, AC-32, AC-33): yedekten geri yüklemede kilit ön denetimi ve devralma döngüsü.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, waitFor } from "@testing-library/react";
import { SettingsBackup } from "../../src/components/settings/SettingsBackup";
import { baskaKilitler, kilitleriDevral, kilitleriBirak, DEVRALMA_SINIRI, DEVRALMA_SINIR_MESAJI, devralmaHataMesaji } from "../../src/lib/kilitDevralma";
import { BACKUP_APP_TAG, BACKUP_SCHEMA_VERSION } from "../../src/lib/constants";

afterEach(() => { cleanup(); delete window.crmStorage; delete window.crmLocks; delete window.appMail; });

const YEDEK = { app: BACKUP_APP_TAG, schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt: "2026-09-20T10:00:00Z", customers: [{ id: 1, name: "Kutu" }], services: [], dealers: [], stock: [] };
const temel = () => ({
  customers: [], services: [], dealers: [], stock: [], customModels: [], standardModels: [], factory: {}, kalipDefs: [], notes: [], parts: [], partSales: [], payments: [],
  teklifler: [], faturalar: [], partStock: [], partStockLog: [], uretimFormlari: [], gorusmeler: [],
  setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(), setStock: vi.fn(), setCustomModels: vi.fn(), setStandardModels: vi.fn(), setFactory: vi.fn(),
  setKalipDefs: vi.fn(), setNotes: vi.fn(), setParts: vi.fn(), setPartSales: vi.fn(), setPayments: vi.fn(),
  version: "3.41.0", appSettings: {}, setAppSettings: vi.fn(), flash: vi.fn(), aktifKullanici: "kerem",
});
const kilitler = (liste, { basarisiz = [] } = {}) => {
  const cagri = [];
  window.crmLocks = {
    list: vi.fn(async () => liste),
    acquire: vi.fn(async (t, id, force) => { cagri.push(["acquire", t, id, force]); return basarisiz.includes(`${t}:${id}`) ? { error: "Çok fazla istek" } : { ok: true }; }),
    release: vi.fn(async (t, id) => { cagri.push(["release", t, id]); }),
    releaseAll: vi.fn(),
  };
  return cagri;
};
beforeEach(() => {
  window.appMail = { getConfigForBackup: () => Promise.resolve(null), getAllLog: () => Promise.resolve([]) };
  window.crmStorage = { restore: vi.fn(async () => structuredClone(YEDEK)), autoBackupPasswordStatus: () => Promise.resolve({ set: false, canEncrypt: true }) };
});
const geriYuklemeyiAc = async (props) => {
  render(<SettingsBackup {...temel()} {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /Yedekten Geri Yükle/ }));
  await screen.findByText("Yedeği Geri Yükle");
};

describe("Spec 0064: geri yükleme ön denetimi (R13)", () => {
  it("AC-16 / AC-32: başkasının kilidi varken sahibi ve insan okunur etiket yazılır, geri yükleme yapılmaz; ham entity_type görünmez", async () => {
    const p = temel();
    kilitler([{ entity_type: "customer", entity_id: "412", locked_by: "ayse" }, { entity_type: "ayar", entity_id: "trash", locked_by: "mehmet" }, { entity_type: "ayar", entity_id: "backup", locked_by: "kerem" }]);
    await geriYuklemeyiAc(p);
    fireEvent.click(screen.getByText("Evet, Geri Yükle"));
    const kutu = await screen.findByTestId("geri-yukleme-kilitleri");
    expect(kutu.textContent).toContain("Müşteri · 412");
    expect(kutu.textContent).toContain("ayse");
    expect(kutu.textContent).toContain("Ayarlar paneli · Çöp Kutusu");
    expect(kutu.textContent).not.toMatch(/customer|kerem/);
    expect(p.setCustomers).not.toHaveBeenCalled();
  });
  it("AC-16: devralma her kilit için sırayla acquire(force) çağırır, geri yüklemeyi yapar ve kilitleri bırakır", async () => {
    const p = temel();
    const c = kilitler([{ entity_type: "customer", entity_id: "412", locked_by: "ayse" }, { entity_type: "gider", entity_id: "5", locked_by: "mehmet" }]);
    await geriYuklemeyiAc(p);
    fireEvent.click(screen.getByText("Evet, Geri Yükle"));
    fireEvent.click(await screen.findByText("Devralarak Devam Et"));
    await waitFor(() => expect(p.setCustomers).toHaveBeenCalled());
    await waitFor(() => expect(c.filter(x => x[0] === "release")).toHaveLength(2));
    expect(c.filter(x => x[0] === "acquire")).toEqual([["acquire", "customer", "412", true], ["acquire", "gider", "5", true]]);
  });
  it("AC-33: bir kilit devralınamazsa (ör. 429) kullanıcı bilgilendirilir, geri yükleme yapılmaz, alınanlar bırakılır", async () => {
    const p = temel();
    const c = kilitler([{ entity_type: "customer", entity_id: "412", locked_by: "ayse" }, { entity_type: "gider", entity_id: "5", locked_by: "mehmet" }], { basarisiz: ["gider:5"] });
    await geriYuklemeyiAc(p);
    fireEvent.click(screen.getByText("Evet, Geri Yükle"));
    fireEvent.click(await screen.findByText("Devralarak Devam Et"));
    expect(await screen.findByText(devralmaHataMesaji(1))).toBeTruthy();
    expect(p.setCustomers).not.toHaveBeenCalled();
    expect(c.filter(x => x[0] === "release")).toEqual([["release", "customer", "412"]]);
  });
  it("AC-21: kilit servisi yoksa ön denetim atlanır, geri yükleme olur", async () => {
    const p = temel();
    await geriYuklemeyiAc(p);
    fireEvent.click(screen.getByText("Evet, Geri Yükle"));
    await waitFor(() => expect(p.setCustomers).toHaveBeenCalled());
  });
});

describe("Spec 0064: devralma yardımcıları (R24, R32)", () => {
  it("baskaKilitler kendi kilidini ayıklar ve etiketler", () => {
    expect(baskaKilitler([{ entity_type: "cek", entity_id: 7, locked_by: "a" }, { entity_type: "cek", entity_id: 8, locked_by: "ben" }], "ben"))
      .toEqual([{ alan: "cek", id: "7", sahip: "a", etiket: "Çek · 7" }]);
  });
  it("AC-33: sınırın üstünde hiç denemez", async () => {
    const acquire = vi.fn();
    const liste = Array.from({ length: DEVRALMA_SINIRI + 1 }, (_, i) => ({ alan: "gider", id: String(i) }));
    expect(await kilitleriDevral(liste, { acquire })).toEqual({ alinan: [], basarisiz: 0, sinirAsildi: true });
    expect(acquire).not.toHaveBeenCalled();
    expect(DEVRALMA_SINIR_MESAJI).toMatch(String(DEVRALMA_SINIRI));
  });
  it("kilitleriBirak hata verse de devam eder (fail-open)", async () => {
    const release = vi.fn(async () => { throw new Error("x"); });
    await kilitleriBirak([{ alan: "a", id: "1" }, { alan: "b", id: "2" }], { release });
    expect(release).toHaveBeenCalledTimes(2);
  });
});
