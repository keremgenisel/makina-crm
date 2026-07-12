// Şifreli yedek: doğru parolayla geri açılır, yanlış parola/bozulma reddedilir.
import { describe, it, expect } from "vitest";
import { encryptBackup, decryptBackup, isEncryptedBackup, MARKER, encryptFileBuffer, decryptFileBuffer, isEncryptedFileBuffer } from "../electron/backupCrypto.cjs";

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

  it("kısaltılmış (4 baytlık) GCM tag'i reddedilir — zayıf doğrulama engellenir", () => {
    // GCM kısa tag'i tam tag'in ilk N baytıdır; budanmış tag doğru parolayla
    // yine doğrulanır. authTagLength sabitlenmezse saldırgan 16→4 bayta düşürüp
    // sahtecilik zorluğunu 2^128'den 2^32'ye indirebilir. Bu reddedilmeli.
    const env = encryptBackup(veri, "gizli123");
    const kisaTag = Buffer.from(env.tag, "base64").subarray(0, 4).toString("base64");
    const budali = { ...env, tag: kisaTag };
    expect(() => decryptBackup(budali, "gizli123")).toThrow();
  });
});

describe("encryptFileBuffer / decryptFileBuffer (yedekteki -dosyalar)", () => {
  const dosya = Buffer.from("Belge içeriği — ÇĞİÖŞÜ ve \x00\x01\x02 binary baytlar", "utf-8");

  it("binary dosyayı şifreler → çözer, baytlar birebir döner", () => {
    const enc = encryptFileBuffer(dosya, "parola123");
    expect(isEncryptedFileBuffer(enc)).toBe(true);
    expect(enc.toString("latin1")).not.toContain("Belge içeriği"); // düz metin sızmaz
    expect(decryptFileBuffer(enc, "parola123").equals(dosya)).toBe(true);
  });

  it("yanlış parola çözemez", () => {
    expect(() => decryptFileBuffer(encryptFileBuffer(dosya, "dogru"), "yanlis")).toThrow();
  });

  it("aynı içerik her seferinde farklı çıktı (rastgele salt/iv)", () => {
    expect(encryptFileBuffer(dosya, "p").equals(encryptFileBuffer(dosya, "p"))).toBe(false);
  });

  it("isEncryptedFileBuffer düz dosyayı/boşu şifreli sanmaz", () => {
    expect(isEncryptedFileBuffer(dosya)).toBe(false);
    expect(isEncryptedFileBuffer(Buffer.alloc(0))).toBe(false);
  });

  it("baştan budanmış dosya (kısa/eksik tag) reddedilir", () => {
    // Dosya düzeni sabit-konumlu (MAGIC(8)+salt(16)+iv(12)+tag(16)+ct), yani
    // decryptBackup'taki gibi ayrı bir kısa-tag sömürüsü yok; buradaki
    // authTagLength/uzunluk kontrolü savunma-derinliğidir. Bu test budanmış
    // dosyanın (MAGIC doğru olsa da) net biçimde reddedildiğini garanti eder.
    const enc = encryptFileBuffer(dosya, "parola123");
    const budali = enc.subarray(0, 44); // tag bölgesinin ortası
    expect(isEncryptedFileBuffer(budali)).toBe(true); // MAGIC hâlâ tanınıyor
    expect(() => decryptFileBuffer(budali, "parola123")).toThrow();
  });
});
