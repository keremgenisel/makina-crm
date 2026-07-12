// @vitest-environment jsdom
// useMailSender (ortak e-posta hook'u): geçersiz e-posta → hata (gönderim yok); geçerli → gönderilir
// ve başarıda taslak kapanır; hata dönerse hata durumu yazılır. 5 bileşen bu davranışı paylaşır.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";

afterEach(() => { cleanup(); delete window.appMail; delete window.appServer; });
import { useMailSender } from "../../src/components/MailCompose";

beforeEach(() => { window.appServer = { apiRequest: vi.fn(() => Promise.resolve({ ok: true })) }; });

describe("useMailSender", () => {
  it("geçersiz e-posta → hata durumu, gönderim yapılmaz", async () => {
    window.appMail = { send: vi.fn(() => Promise.resolve({ ok: true })) };
    const { result } = renderHook(() => useMailSender({ role: "user" }));
    act(() => result.current.setMailDraft({ to: "bozuk", subject: "", text: "" }));
    await act(async () => { await result.current.sendMail({ to: "bozuk", subject: "", text: "" }); });
    expect(result.current.mailSendState.state).toBe("error");
    expect(window.appMail.send).not.toHaveBeenCalled();
    expect(result.current.mailDraft).not.toBe(null); // taslak açık kalır
  });

  it("geçerli gönderim başarılı → taslak kapanır, durum idle", async () => {
    window.appMail = { send: vi.fn(() => Promise.resolve({ ok: true })) };
    const { result } = renderHook(() => useMailSender({ role: "user" }));
    act(() => result.current.setMailDraft({ to: "a@b.com", subject: "S", text: "M" }));
    await act(async () => { await result.current.sendMail({ to: "a@b.com", subject: "S", text: "M", type: "musteri" }); });
    expect(window.appMail.send).toHaveBeenCalledTimes(1);
    expect(result.current.mailDraft).toBe(null);
    expect(result.current.mailSendState.state).toBe("idle");
  });

  it("gönderim hata dönerse hata durumu yazılır, taslak açık kalır", async () => {
    window.appMail = { send: vi.fn(() => Promise.resolve({ ok: false, error: "SMTP hatası" })) };
    const { result } = renderHook(() => useMailSender({ role: "user" }));
    act(() => result.current.setMailDraft({ to: "a@b.com", subject: "S", text: "M" }));
    await act(async () => { await result.current.sendMail({ to: "a@b.com", subject: "S", text: "M", type: "bayi" }); });
    expect(result.current.mailSendState.state).toBe("error");
    expect(result.current.mailSendState.error).toBe("SMTP hatası");
    expect(result.current.mailDraft).not.toBe(null);
  });
});
