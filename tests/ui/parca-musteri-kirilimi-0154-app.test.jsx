// @vitest-environment jsdom
// Spec 0154 (gerçek App, P9): App Analiz'e canlı bayileri verir (C3, AC-13 App yolu); sekmeden çıkıp dönünce görünüm Model'e
// döner ve seçili parça sıfırlanır (R3/2, AC-55).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";
import { CUSTOMERS, SERVICES, YEDEK, PARTS, DEALERS } from "../fixtures/0154-veri";

const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; vi.unstubAllGlobals(); localStorage.clear(); });

const baslat = async () => {
  const veri = { customers: CUSTOMERS, services: SERVICES, yedekParcaSatislar: YEDEK, parts: PARTS,
    dealers: [...DEALERS, { id: 52, name: "Silinmiş Bayi", deletedAt: "2026-01-01T00:00:00Z" }], partSales: [], dataVersion: 1 };
  window.crmStorage = { load: vi.fn(async () => structuredClone(veri)), save: vi.fn(async () => true), getVersion: vi.fn(async () => 1) };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const kutu = () => [...document.querySelectorAll("section")].find(s => s.textContent.includes("Parça Kırılımı"));
const gorunum = () => within(within(kutu()).getByRole("group", { name: "Parça kırılımı görünümü" })).getAllByRole("button").find(b => b.getAttribute("aria-pressed") === "true").textContent;

describe("Spec 0154: gerçek App", () => {
  it("AC-13 / C3: bayi alıcının adı App'in canlı bayilerinden gelir", async () => {
    await baslat();
    menu("Analiz");
    fireEvent.click(within(kutu()).getByRole("button", { name: "Müşteri" }));
    const s = within(kutu()).getAllByTestId("musteri-satiri").find(x => x.dataset.anahtar === "t:bayi:50");
    expect(s.textContent).toMatch(/^Kuzey Bayi/);
  });
  it("AC-55 / R3/2: sekmeden çıkıp dönünce görünüm Model, seçili parça ilk parça", async () => {
    await baslat();
    menu("Analiz");
    fireEvent.click(within(kutu()).getByRole("button", { name: "Müşteri" }));
    fireEvent.click(within(kutu()).getByLabelText("Parça seç"));
    fireEvent.click(within(kutu()).getAllByRole("button").find(b => b.querySelector("span")?.textContent === "Kayış"));
    expect(within(kutu()).getByLabelText("Parça seç").textContent).toMatch(/^Kayış/);
    menu("Anasayfa");
    menu("Analiz");
    expect(gorunum()).toBe("Model");
    expect(within(kutu()).getByLabelText("Parça seç").textContent).toMatch(/^RULMAN \?/);
  });
});
