// @vitest-environment jsdom
// Spec 0128 AC-25 (triyaj bulgu 3): aktifKullanici zinciri gerçek App'te. Bayiler sekmesinde kullanıcının KENDİ kilidi silmeyi
// engellemez, başkasının kilidi engeller (prop ulaşmasaydı kendi kilidi de reddederdi; 0121'in "prop zinciri gerçek App" dersi).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent, within, act } from "@testing-library/react";

const { default: App } = await import("../../src/App");
afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; delete window.crmLocks; vi.unstubAllGlobals(); localStorage.clear(); });

const baslat = async (sahip) => {
  const veri = { dealers: [{ id: 3, name: "Ege Bayi", bayiMi: true }], customers: [], dataVersion: 1 };
  window.crmStorage = { load: vi.fn(async () => structuredClone(veri)), save: vi.fn(async () => true), getVersion: vi.fn(async () => 1) };
  const t = { getConfig: async () => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role: "user", permissions: JSON.stringify({ tabs: ["dashboard", "dealers"] }), username: "u" }) };
  window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  window.crmLocks = { list: vi.fn(async () => [{ entity_type: "dealer", entity_id: "3", locked_by: sahip }]), acquire: vi.fn(async () => ({ ok: true })), release: vi.fn(async () => ({})) };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  fireEvent.click(screen.getAllByText("Bayiler").find(e => e.closest("nav")));
  await waitFor(() => expect(screen.getByText("Ege Bayi")).toBeTruthy());
  await act(async () => {});
  const tr = screen.getByText("Ege Bayi").closest("tr");
  const b = within(tr).getAllByRole("button");
  fireEvent.click(b[b.length - 1]);
  fireEvent.click(screen.getByText("Evet, Sil"));
};

describe("Spec 0128 AC-25: aktifKullanici zinciri (gerçek App, Bayiler)", () => {
  it("AC-25: kilit kullanıcının kendisindeyse bayi silinir", async () => {
    await baslat("u");
    await waitFor(() => expect(screen.queryByText("Ege Bayi")).toBeNull());
  });
  it("AC-25 (karşıt): kilit başkasındaysa bayi silinmez ve neden bildirilir", async () => {
    await baslat("ofis");
    expect(screen.getByText("Ege Bayi")).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/Bayi · Ege Bayi şu an "ofis" tarafından düzenleniyor/)).toBeTruthy());
  });
});
