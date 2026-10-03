// nodemailer 10 yükseltmesi (npm audit, GHSA-6vj9-mwq6-2f5v ve diğerleri): uygulamanın gerçek e-posta yolu
// (electron/mail.cjs: kimlik kaydı → testConnection → ekli sendMail → gönderim kaydı) yerel sahte bir SMTP sunucusuna
// karşı uçtan uca çalışır. "electron" modülü require önbelleğinde sahte nesneyle değiştirilir (app.getPath geçici
// klasör, safeStorage tersinir); nodemailer gerçektir.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRequire } from "node:module";
import net from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const gecici = fs.mkdtempSync(path.join(os.tmpdir(), "eposta-smtp-"));
const sahteElectron = {
  app: { getPath: () => gecici },
  BrowserWindow: function () { throw new Error("PDF bu testte kullanılmaz"); },
  safeStorage: { isEncryptionAvailable: () => true, encryptString: (s) => Buffer.from(`x${s}`), decryptString: (b) => b.toString().slice(1) },
};
require.cache[require.resolve("electron")] = { id: "electron", filename: "electron", loaded: true, exports: sahteElectron };
const mail = require("../electron/mail.cjs");

// En küçük SMTP sunucusu: EHLO (AUTH PLAIN), AUTH, MAIL/RCPT, DATA, QUIT. Gelen kimlik ve mesajlar kaydedilir.
const kayit = { auth: [], zarf: [], mesajlar: [] };
let sunucu;
let port;
beforeAll(async () => {
  sunucu = net.createServer(sock => {
    sock.setEncoding("utf8");
    let tampon = "", veri = false, mesaj = "";
    sock.write("220 test ESMTP\r\n");
    sock.on("data", parca => {
      tampon += parca;
      let i;
      while ((i = tampon.indexOf("\r\n")) >= 0) {
        const satir = tampon.slice(0, i);
        tampon = tampon.slice(i + 2);
        if (veri) {
          if (satir === ".") { veri = false; kayit.mesajlar.push(mesaj); mesaj = ""; sock.write("250 ok\r\n"); } else mesaj += `${satir}\n`;
          continue;
        }
        const k = satir.slice(0, 4).toUpperCase();
        if (k === "EHLO") sock.write("250-test\r\n250-AUTH PLAIN\r\n250 8BITMIME\r\n");
        else if (k === "HELO") sock.write("250 test\r\n");
        else if (k === "AUTH") { kayit.auth.push(Buffer.from(satir.split(" ")[2] || "", "base64").toString()); sock.write("235 ok\r\n"); }
        else if (k === "MAIL" || k === "RCPT") { kayit.zarf.push(satir); sock.write("250 ok\r\n"); }
        else if (k === "RSET" || k === "NOOP") sock.write("250 ok\r\n");
        else if (k === "DATA") { veri = true; sock.write("354 devam\r\n"); }
        else if (k === "QUIT") sock.end("221 hosca kal\r\n");
        else sock.write("502 bilinmiyor\r\n");
      }
    });
  });
  await new Promise(r => sunucu.listen(0, "127.0.0.1", r));
  port = sunucu.address().port;
});
afterAll(async () => { await new Promise(r => sunucu.close(r)); fs.rmSync(gecici, { recursive: true, force: true }); });

describe("e-posta gönderimi nodemailer 10 ile (electron/mail.cjs)", () => {
  it("yüklü nodemailer 10.x", () => {
    expect(require("nodemailer/package.json").version).toMatch(/^10\./);
  });
  it("kimlik kaydı, bağlantı denemesi ve ekli gönderim uçtan uca çalışır; kayıt yazılır", async () => {
    expect(mail.saveCredentials({ email: "fabrika@ornek.com", appPassword: "uygulama-sifresi", host: "127.0.0.1", port, secure: false })).toEqual({ ok: true });
    expect(await mail.testConnection()).toEqual({ ok: true });
    expect(kayit.auth.at(-1)).toBe("\0fabrika@ornek.com\0uygulama-sifresi");

    const sonuc = await mail.sendMail({
      to: "musteri@ornek.com", subject: "Teklif T-2026-00012", text: "Merhaba, teklif ektedir.", type: "musteri",
      attachments: [{ filename: "teklif.csv", mimeType: "text/csv", contentBase64: Buffer.from("No;Tutar\nT-1;1000").toString("base64") }],
    });
    expect(sonuc).toEqual({ ok: true });
    expect(kayit.zarf).toEqual(expect.arrayContaining(["MAIL FROM:<fabrika@ornek.com>", "RCPT TO:<musteri@ornek.com>"]));
    const m = kayit.mesajlar.at(-1);
    expect(m).toMatch(/Subject: Teklif T-2026-00012/);
    expect(m).toMatch(/Merhaba, teklif ektedir\./);
    expect(m).toMatch(/filename=teklif\.csv/);
    expect(m).toContain(Buffer.from("No;Tutar\nT-1;1000").toString("base64"));
    const log = mail.getSentLog();
    expect(log.at(-1)).toMatchObject({ to: "musteri@ornek.com", subject: "Teklif T-2026-00012", success: true, attachments: [{ filename: "teklif.csv", mimeType: "text/csv" }] });
  });
  it("sunucuya ulaşılamazsa hata döner, uygulama çökmez", async () => {
    const kapali = net.createServer();
    await new Promise(r => kapali.listen(0, "127.0.0.1", r));
    const bosPort = kapali.address().port;
    await new Promise(r => kapali.close(r));
    mail.saveCredentials({ email: "fabrika@ornek.com", appPassword: "x", host: "127.0.0.1", port: bosPort, secure: false });
    const r = await mail.testConnection();
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });
});
