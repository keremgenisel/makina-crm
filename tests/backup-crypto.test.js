// Şifreli yedek: doğru parolayla geri açılır, yanlış parola/bozulma reddedilir.
import { describe, it, expect } from "vitest";
import { encryptBackup, decryptBackup, isEncryptedBackup, MARKER } from "../electron/backupCrypto.cjs";

const veri = { app: "altunmak-crm", customers: [{ id: 1, name: "Acar" }], toplam: 12345 };

describe("backupCrypto", () => {
  it("şifreleyip aynı parolayla geri açar (roundtrip)", () => {
    const env = encryptBackup(veri, "gizli123");
    expect(env.format).toBe(MARKER);
    expect(env.data).not.toContain("Acar"); // ciphertext düz metin sızdırmaz
    expect(decryptBackup(env, "gizli123")).toEqual(veri);
  });

  it("yanlış parola çözemez (GCM doğrulama hatası)", () => {
    const env = encryptBackup(veri, "dogru");
    expect(() => decryptBackup(env, "yanlis")).toThrow();
  });

  it("bozulmuş veri çözemez", () => {
    const env = encryptBackup(veri, "p");
    const bozuk = { ...env, data: Buffer.from("bozuk").toString("base64") };
    expect(() => decryptBackup(bozuk, "p")).toThrow();
  });

  it("isEncryptedBackup: zarfı tanır, düz yedeği tanımaz", () => {
    expect(isEncryptedBackup(encryptBackup(veri, "p"))).toBe(true);
    expect(isEncryptedBackup(veri)).toBe(false);
    expect(isEncryptedBackup(null)).toBe(false);
  });

  it("parolasız şifreleme/çözme hata verir", () => {
    expect(() => encryptBackup(veri, "")).toThrow();
    expect(() => decryptBackup(encryptBackup(veri, "p"), "")).toThrow();
  });
});
