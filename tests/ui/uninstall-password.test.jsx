// @vitest-environment jsdom
// "Uygulamayı Kaldır > Evet, Kaldır" sonrası, uygulama kilidi açıksa önce şifre sorulmalı;
// yanlış şifre kaldırmamalı, doğru şifre kaldırmalı. Kilit yoksa doğrudan kaldırmalı.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, waitFor } from "@testing-library/react";

afterEach(() => { cleanup(); delete window.appLock; delete window.appControl; });
import { SettingsDanger } from "../../src/components/settings/SettingsDanger";

const uninstall = vi.fn(() => Promise.resolve(true));

const acEvetKaldir = async () => {
  render(<SettingsDanger flash={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Uygulamayı Kaldır/ }));
  fireEvent.click(screen.getByRole("button", { name: /Evet, Kaldır/ }));
};

describe("Uygulamayı Kaldır — şifre doğrulaması", () => {
  beforeEach(() => { uninstall.mockClear(); window.appControl = { uninstall }; });

  it("kilit açıkken önce şifre sorar; hemen kaldırmaz", async () => {
    window.appLock = { getStatus: () => Promise.resolve({ enabled: true }), verify: vi.fn() };
    await acEvetKaldir();
    expect(await screen.findByPlaceholderText("Uygulama şifresi")).toBeTruthy();
    expect(uninstall).not.toHaveBeenCalled();
  });

  it("yanlış şifre kaldırmaz, hata gösterir", async () => {
    window.appLock = { getStatus: () => Promise.resolve({ enabled: true }), verify: () => Promise.resolve({ ok: false, error: "Şifre yanlış." }) };
    await acEvetKaldir();
    fireEvent.change(await screen.findByPlaceholderText("Uygulama şifresi"), { target: { value: "0000" } });
    fireEvent.click(screen.getByRole("button", { name: /^Kaldır$/ }));
    await waitFor(() => expect(screen.getByText(/Şifre yanlış/)).toBeTruthy());
    expect(uninstall).not.toHaveBeenCalled();
  });

  it("doğru şifre kaldırır", async () => {
    window.appLock = { getStatus: () => Promise.resolve({ enabled: true }), verify: (pw) => Promise.resolve({ ok: pw === "1234" }) };
    await acEvetKaldir();
    fireEvent.change(await screen.findByPlaceholderText("Uygulama şifresi"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /^Kaldır$/ }));
    await waitFor(() => expect(uninstall).toHaveBeenCalled());
  });

  it("kilit kapalıysa şifre sormadan doğrudan kaldırır", async () => {
    window.appLock = { getStatus: () => Promise.resolve({ enabled: false }) };
    await acEvetKaldir();
    await waitFor(() => expect(uninstall).toHaveBeenCalled());
    expect(screen.queryByPlaceholderText("Uygulama şifresi")).toBeNull();
  });
});
