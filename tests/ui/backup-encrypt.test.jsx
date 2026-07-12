// @vitest-environment jsdom
// Şifreli yedek UI akışı: "Yedek Al" şifre sorar ve şifreli kaydeder; şifreli yedeği geri
// yüklerken parola sorulur, doğru parola geri yükleme onayına geçirir.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, waitFor } from "@testing-library/react";

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appMail; });
import { SettingsBackup } from "../../src/components/settings/SettingsBackup";

const props = {
  customers: [], services: [], dealers: [], stock: [], customModels: [], standardModels: [], factory: {},
  kalipDefs: [], notes: [], parts: [], partSales: [], payments: [], teklifler: [], faturalar: [],
  partStock: [], partStockLog: [], uretimFormlari: [], gorusmeler: [],
  setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(), setStock: vi.fn(), setCustomModels: vi.fn(),
  setStandardModels: vi.fn(), setFactory: vi.fn(), setKalipDefs: vi.fn(), setNotes: vi.fn(), setParts: vi.fn(),
  setPartSales: vi.fn(), setPayments: vi.fn(),
  version: "2.73.0", appSettings: {}, setAppSettings: vi.fn(), flash: vi.fn(),
};

const backup = vi.fn(() => Promise.resolve(true));

beforeEach(() => {
  backup.mockClear();
  window.appMail = { getConfigForBackup: () => Promise.resolve(null), getAllLog: () => Promise.resolve([]) };
  window.crmStorage = {
    backup,
    autoBackupPasswordStatus: () => Promise.resolve({ set: false, canEncrypt: true }),
  };
});

describe("Şifreli yedek — al", () => {
  it("Yedek Al şifre modalı açar ve doğru parolayla şifreli kaydeder", async () => {
    render(<SettingsBackup {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /Yedek Al/ }));
    const pw = await screen.findAllByPlaceholderText(/Parola/);
    fireEvent.change(pw[0], { target: { value: "1234" } });
    fireEvent.change(pw[1], { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /Şifreli Kaydet/ }));
    await waitFor(() => expect(backup).toHaveBeenCalled());
    expect(backup.mock.calls[0][1]).toBe("1234"); // password argümanı geçti
  });

  it("parolalar eşleşmezse kaydetmez", async () => {
    render(<SettingsBackup {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /Yedek Al/ }));
    const pw = await screen.findAllByPlaceholderText(/Parola/);
    fireEvent.change(pw[0], { target: { value: "1234" } });
    fireEvent.change(pw[1], { target: { value: "9999" } });
    fireEvent.click(screen.getByRole("button", { name: /Şifreli Kaydet/ }));
    await waitFor(() => expect(screen.getByText(/eşleşmiyor/)).toBeTruthy());
    expect(backup).not.toHaveBeenCalled();
  });
});

describe("Dosya arşivi — yedek/geri yükle", () => {
  it("yedek içeriğine müşteri ve bayi dosyalarını (dosya arşivi) dahil eder", async () => {
    const rawDosyalar = [{ id: 1, customerId: 5, refType: "servis", refId: 7, ad: "s.pdf" }, { id: 2, dealerId: 9, refType: "bayi", ad: "b.pdf" }];
    render(<SettingsBackup {...props} rawDosyalar={rawDosyalar} setDosyalar={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Yedek Al/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Şifresiz Kaydet/ }));
    await waitFor(() => expect(backup).toHaveBeenCalled());
    expect(backup.mock.calls[0][0].dosyalar).toEqual(rawDosyalar);
  });

  it("geri yükleme bölümlerinde 'Dosyalar' vardır ve seçiliyken setDosyalar çağrılır", async () => {
    const setDosyalar = vi.fn();
    const dosyalar = [{ id: 1, customerId: 5, refType: "servis", refId: 7, ad: "s.pdf" }];
    window.crmStorage.restore = () => Promise.resolve({ app: "altunmak-crm", schemaVersion: 2, customers: [], dosyalar });
    render(<SettingsBackup {...props} setDosyalar={setDosyalar} />);
    fireEvent.click(screen.getByRole("button", { name: /Geri Yükle/ }));
    await screen.findByText(/Geri yüklenecek bölümler/);
    expect(screen.getByText("Dosyalar")).toBeTruthy(); // paket listede görünür
    fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
    await waitFor(() => expect(setDosyalar).toHaveBeenCalledWith(dosyalar));
  });
});

describe("Şifreli yedek — geri yükle", () => {
  it("şifreli yedek parola sorar; yanlış parola hata, doğru parola devam eder", async () => {
    window.crmStorage.restore = () => Promise.resolve({ format: "altunmak-crm-encrypted", data: "x", salt: "s", iv: "i", tag: "t" });
    window.crmStorage.decryptBackup = (env, pw) => Promise.resolve(
      pw === "1234" ? { ok: true, data: { app: "altunmak-crm", schemaVersion: 2, customers: [] } } : { ok: false, error: "Parola yanlış veya dosya bozuk." }
    );
    render(<SettingsBackup {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /Geri Yükle/ }));
    const input = await screen.findByPlaceholderText("Yedek parolası");
    fireEvent.change(input, { target: { value: "0000" } });
    fireEvent.click(screen.getByRole("button", { name: /Aç ve Devam Et/ }));
    await waitFor(() => expect(screen.getByText(/Parola yanlış/)).toBeTruthy());

    fireEvent.change(screen.getByPlaceholderText("Yedek parolası"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /Aç ve Devam Et/ }));
    await waitFor(() => expect(screen.getByText(/Geri yüklenecek bölümler/)).toBeTruthy()); // restore onay modalı açıldı
  });
});
