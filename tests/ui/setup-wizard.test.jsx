// @vitest-environment jsdom
// Sunucu kurulum sihirbazı (SetupWizard): mevcut admini DOĞRULAMA modunda (hasAdmin=true)
// "Şifre Tekrar" istemez ve YANLIŞ şifreyi bile sunucuya gönderir — böylece kademeli kilit +
// güvenlik kaydı devreye girer. REGRESYON: eski form her durumda "Şifre Tekrar" isteyip
// eşleşmezse isteği sunucuya HİÇ göndermiyordu; kullanıcı şifreyi sınırsız deneyebiliyor ve
// hiçbir deneme Kullanıcı Geçmişi'ne yansımıyordu. İlk kurulumda (hasAdmin=false) ise
// "Şifre Tekrar" istenir ve eşleşmezse istek gönderilmez.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";

afterEach(() => { cleanup(); delete window.appServer; });
import { SetupWizard } from "../../src/components/settings/SettingsServer";

const pwInputs = (c) => c.querySelectorAll('input[type="password"]');

describe("SetupWizard", () => {
  let setupAdmin, getServerStatus;
  beforeEach(() => {
    setupAdmin = vi.fn(async () => ({ ok: true, port: 3000 }));
    getServerStatus = vi.fn(async () => ({ hasAdmin: true }));
    window.appServer = { setupAdmin, getServerStatus };
  });

  it("mevcut admin varsa 'Şifre Tekrar' göstermez, yanlış şifreyi bile sunucuya gönderir", async () => {
    setupAdmin.mockResolvedValueOnce({ error: "Kullanıcı adı veya şifre hatalı" }); // yanlış şifre
    const { container } = render(<SetupWizard onDone={vi.fn()} flash={vi.fn()} />);
    await waitFor(() => expect(getServerStatus).toHaveBeenCalled());
    // Doğrulama modunda tek şifre alanı olmalı, "Şifre Tekrar" olmamalı
    await waitFor(() => expect(pwInputs(container).length).toBe(1));
    expect(screen.queryByText("Şifre Tekrar")).toBeNull();
    fireEvent.change(pwInputs(container)[0], { target: { value: "yanlissifre" } });
    fireEvent.click(screen.getByText("Sunucuyu Başlat"));
    // Eşleşme kontrolüne takılmadan sunucuya gitmeli (kilit + kayıt sunucuda işlesin)
    await waitFor(() => expect(setupAdmin).toHaveBeenCalledWith(expect.objectContaining({ username: "admin", password: "yanlissifre" })));
  });

  it("2FA gerekince kod alanı çıkar ve ikinci gönderimde koda eklenir", async () => {
    setupAdmin
      .mockResolvedValueOnce({ requires2fa: true })
      .mockResolvedValueOnce({ ok: true, port: 3000 });
    const { container } = render(<SetupWizard onDone={vi.fn()} flash={vi.fn()} />);
    await waitFor(() => expect(getServerStatus).toHaveBeenCalled());
    await waitFor(() => expect(pwInputs(container).length).toBe(1));
    fireEvent.change(pwInputs(container)[0], { target: { value: "dogrusifre" } });
    fireEvent.click(screen.getByText("Sunucuyu Başlat"));
    // Kod alanı belirir
    const kod = await screen.findByPlaceholderText("6 haneli kod");
    fireEvent.change(kod, { target: { value: "123456" } });
    fireEvent.click(screen.getByText("Sunucuyu Başlat"));
    await waitFor(() => expect(setupAdmin).toHaveBeenLastCalledWith(expect.objectContaining({ password: "dogrusifre", totpCode: "123456" })));
  });

  it("kademeli kilit gelince geri sayım gösterir ve butonu kilitler", async () => {
    setupAdmin.mockResolvedValueOnce({ error: "Çok fazla başarısız deneme.", retryAfterSec: 5 });
    const { container } = render(<SetupWizard onDone={vi.fn()} flash={vi.fn()} />);
    await waitFor(() => expect(pwInputs(container).length).toBe(1));
    fireEvent.change(pwInputs(container)[0], { target: { value: "yanlissifre" } });
    fireEvent.click(screen.getByText("Sunucuyu Başlat"));
    // Geri sayım mesajı ve buton "N sn bekleyin" (disabled) olmalı
    await waitFor(() => expect(screen.getByText(/sn sonra tekrar deneyin/)).toBeTruthy());
    const btn = screen.getByText(/sn bekleyin/);
    expect(btn.closest("button").disabled).toBe(true);
  });

  it("ilk kurulumda (admin yok) 'Şifre Tekrar' ister ve eşleşmezse sunucuya göndermez", async () => {
    getServerStatus.mockResolvedValueOnce({ hasAdmin: false });
    const flash = vi.fn();
    const { container } = render(<SetupWizard onDone={vi.fn()} flash={flash} />);
    await waitFor(() => expect(screen.getByText("Şifre Tekrar")).toBeTruthy());
    const inputs = pwInputs(container);
    expect(inputs.length).toBe(2);
    fireEvent.change(inputs[0], { target: { value: "sifre123" } });
    fireEvent.change(inputs[1], { target: { value: "baskasifre" } });
    fireEvent.click(screen.getByText("Sunucuyu Başlat"));
    await waitFor(() => expect(flash).toHaveBeenCalledWith("err", "Şifreler eşleşmiyor"));
    expect(setupAdmin).not.toHaveBeenCalled();
  });
});
