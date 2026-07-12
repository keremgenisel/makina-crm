// @vitest-environment jsdom
// Regresyon: 2FA + TLS parmak izi güveni birlikte çalışmalı. Bug'da kullanıcı parmak izini
// onayladıktan sonra login 2FA istiyor (pin kaydedilmiyor); ardından 2FA'yı form "Giriş Yap"
// ile gönderince o çağrı trust bayrağı taşımadığından sunucu yine needTrust dönüyor ve güven
// ekranı sonsuz döngüye giriyordu. Fix: onaylanan güven (trustMode) bu akıştaki tüm denemelerde sürer.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";

afterEach(() => { cleanup(); delete window.appServer; });
import { ServerLogin } from "../../src/components/ServerLogin";

describe("ServerLogin — 2FA + parmak izi güven döngüsü", () => {
  it("parmak izi onaylandıktan sonra 2FA sonrası giriş güveni korur (döngüye girmez)", async () => {
    // Herhangi bir güvensiz (trust'sız) çağrı needTrust döner; güvenli ama 2FA'sız çağrı requires2fa;
    // güvenli + 2FA'lı çağrı başarılı. Fix yoksa 3. çağrı trust taşımaz → tekrar needTrust (döngü).
    const login = vi.fn(async (params) => {
      if (!params.trust && !params.force) return { needTrust: true, fp: "AA:BB:CC:DD" };
      if (!params.totpCode) return { requires2fa: true };
      return { ok: true, user: { username: "kerem" } };
    });
    window.appServer = { login, clearConfig: vi.fn() };
    const onLogin = vi.fn();
    const { container } = render(<ServerLogin onLogin={onLogin} />);

    fireEvent.change(screen.getByPlaceholderText("http://192.168.1.10:3000"), { target: { value: "http://100.93.92.108:3000" } });
    fireEvent.change(container.querySelector('input[autocomplete="username"]'), { target: { value: "kerem" } });
    fireEvent.change(container.querySelector('input[type="password"]'), { target: { value: "sifre1" } });
    fireEvent.click(screen.getByText("Giriş Yap"));

    // 1) needTrust → güven ekranı
    await waitFor(() => expect(screen.getByText("Güven ve Bağlan")).toBeTruthy());
    fireEvent.click(container.querySelector('input[type="checkbox"]'));
    fireEvent.click(screen.getByText("Güven ve Bağlan"));

    // 2) trust ama 2FA yok → requires2fa → 2FA alanı görünür, güven ekranı kapanır
    await waitFor(() => expect(screen.getByPlaceholderText("6 haneli kod")).toBeTruthy());
    expect(screen.queryByText("Güven ve Bağlan")).toBeNull();

    // 3) 2FA gir + form "Giriş Yap" → fix ile trust korunur → başarılı (döngü yok)
    fireEvent.change(screen.getByPlaceholderText("6 haneli kod"), { target: { value: "521505" } });
    fireEvent.click(screen.getByText("Giriş Yap"));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith({ username: "kerem" }));
    // Güven ekranı tekrar ÇIKMAMALI (döngü yok)
    expect(screen.queryByText("Güven ve Bağlan")).toBeNull();
    // Son login çağrısı trust bayrağı taşımalı
    expect(login.mock.calls.at(-1)[0]).toMatchObject({ trust: true, totpCode: "521505" });
  });
});
