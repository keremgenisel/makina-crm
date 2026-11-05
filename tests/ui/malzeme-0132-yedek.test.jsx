// @vitest-environment jsdom
// Spec 0132 R22, C5/3 (AC-87, AC-88): yedek dosyası malzeme listesini taşır; tam geri yükleme ve yalnız "Tanımlar" paketi listeyi
// yazar; paketin cümlesi malzemeleri sayar; malzemesi olmayan eski yedek listeye dokunmaz.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { SettingsBackup } from "../../src/components/settings/SettingsBackup";

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appMail; });
const MALZEME = [{ id: 501, ad: "304 Paslanmaz", ozgulAgirlik: 7.9, kiloFiyati: 2.95, paraBirimi: "USD", kur: 50 }, { id: 502, ad: "Eski", deletedAt: "2026-10-01T09:00:00.000Z" }];
const temel = () => ({
  customers: [], services: [], dealers: [], stock: [], customModels: [], standardModels: [], factory: {}, kalipDefs: [], notes: [], parts: [], partSales: [],
  payments: [], teklifler: [], faturalar: [], partStock: [], partStockLog: [], uretimFormlari: [], gorusmeler: [],
  setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(), setStock: vi.fn(), setCustomModels: vi.fn(), setStandardModels: vi.fn(), setFactory: vi.fn(),
  setKalipDefs: vi.fn(), setNotes: vi.fn(), setParts: vi.fn(), setPartSales: vi.fn(), setPayments: vi.fn(),
  malzemeler: MALZEME, setMalzemeler: vi.fn(),
  version: "3.56.0", appSettings: {}, setAppSettings: vi.fn(), flash: vi.fn(),
});
const backup = vi.fn(() => Promise.resolve(true));
const depoKur = () => {
  backup.mockClear();
  window.appMail = { getConfigForBackup: () => Promise.resolve(null), getAllLog: () => Promise.resolve([]) };
  window.crmStorage = { backup, autoBackupPasswordStatus: () => Promise.resolve({ set: false, canEncrypt: true }) };
};
const geriYukleAc = async (yedek) => {
  window.crmStorage.restore = () => Promise.resolve(structuredClone(yedek));
  fireEvent.click(screen.getByRole("button", { name: /Yedekten Geri Yükle/ }));
  return (await screen.findByText(/Geri yüklenecek bölümler/)).closest("div").parentElement;
};

describe("Spec 0132: malzeme listesi yedekte", () => {
  it("AC-87: elle alınan yedek malzeme listesini ham hâliyle (çöptekiler dahil) taşır", async () => {
    depoKur();
    render(<SettingsBackup {...temel()} />);
    fireEvent.click(screen.getByRole("button", { name: /Yedek Al/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Şifresiz Kaydet/ }));
    await waitFor(() => expect(backup).toHaveBeenCalled());
    expect(backup.mock.calls.at(-1)[0].malzemeler).toEqual(MALZEME);
  });
  it.each([["tam", null], ["yalnız Tanımlar paketi", "Tanımlar"]])("AC-87: %s geri yükleme listeyi yazar", async (_, paket) => {
    depoKur();
    const p = temel();
    render(<SettingsBackup {...p} />);
    const yedekteki = [{ id: 601, ad: "Yedekteki 8620", ozgulAgirlik: 7.85 }];
    const panel = await geriYukleAc({ app: "altunmak-crm", schemaVersion: 3, customers: [{ id: 5, name: "Eski" }], parts: [], malzemeler: yedekteki });
    expect(panel.textContent).toContain("malzemeler");
    if (paket) for (const k of [...within(panel).getAllByRole("checkbox")]) if (k.checked && !k.closest("label")?.textContent.includes(paket)) fireEvent.click(k);
    fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
    await waitFor(() => expect(p.setMalzemeler).toHaveBeenCalledWith(yedekteki));
    if (paket) expect(p.setCustomers).not.toHaveBeenCalled();
  });
  it("AC-87: malzeme bölümü olmayan (spec öncesi) yedek listeye dokunmaz", async () => {
    depoKur();
    const p = temel();
    render(<SettingsBackup {...p} />);
    await geriYukleAc({ app: "altunmak-crm", schemaVersion: 3, customers: [{ id: 5, name: "Eski" }], parts: [] });
    fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
    await waitFor(() => expect(p.setCustomers).toHaveBeenCalled());
    expect(p.setMalzemeler).not.toHaveBeenCalled();
  });
});
