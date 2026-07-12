// sendMailLogged: başarılı e-posta gönderiminde İşlem Geçmişi'ne (audit) "eposta_gonderildi" yazar.
// İstemci modunda /api/audit'e (sunucuya), yerel/sunucu PC modunda auditLog.log'a gider.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendMailLogged } from "../src/lib/audit";

describe("sendMailLogged — e-posta gönderimini audit'e yazar", () => {
  beforeEach(() => { global.window = {}; });
  afterEach(() => { delete global.window; });

  it("başarılı gönderimde istemci modunda /api/audit'e eposta_gonderildi yazar", async () => {
    const apiRequest = vi.fn(() => Promise.resolve({ ok: true }));
    global.window.appMail = { send: vi.fn(() => Promise.resolve({ ok: true })) };
    global.window.appServer = { apiRequest };
    const res = await sendMailLogged({ to: "a@b.com", subject: "Teklif", type: "musteri" }, { role: "user" });
    expect(res.ok).toBe(true);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    const body = apiRequest.mock.calls[0][0].body;
    expect(apiRequest.mock.calls[0][0].path).toBe("/api/audit");
    expect(body.action).toBe("eposta_gonderildi");
    expect(body.entity).toBe("eposta");
    expect(body.entity_name).toBe("a@b.com");
    expect(JSON.parse(body.detail).tur).toBe("musteri");
  });

  it("yerel/sunucu PC modunda auditLog.log'a yazar", async () => {
    const log = vi.fn();
    global.window.appMail = { send: vi.fn(() => Promise.resolve({ ok: true })) };
    global.window.auditLog = { log };
    await sendMailLogged({ to: "x@y.com", subject: "S", type: "uretim" }, null);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0].action).toBe("eposta_gonderildi");
    expect(log.mock.calls[0][0].entity).toBe("eposta");
  });

  it("başarısız gönderimde audit yazılmaz", async () => {
    const apiRequest = vi.fn();
    const log = vi.fn();
    global.window.appMail = { send: vi.fn(() => Promise.resolve({ ok: false, error: "SMTP" })) };
    global.window.appServer = { apiRequest };
    global.window.auditLog = { log };
    const res = await sendMailLogged({ to: "a@b.com" }, { role: "user" });
    expect(res.ok).toBe(false);
    expect(apiRequest).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
});
