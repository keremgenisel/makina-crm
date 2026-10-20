// İki adımlı doğrulama: TOTP kod doğrulama + kurtarma kodu üret/eşleştir.
import { describe, it, expect } from "vitest";
import { generateSecret, keyuri, verifyToken, currentToken, generateRecoveryCodes, hashRecovery, matchRecovery } from "../electron/totp.cjs";

describe("TOTP", () => {
  it("secret için o anki kod doğrulanır, yanlış kod reddedilir", () => {
    const secret = generateSecret();
    const code = currentToken(secret);
    expect(verifyToken(code, secret)).toBe(true);
    expect(verifyToken("000000", secret)).toBe(false);
    expect(verifyToken("", secret)).toBe(false);
    expect(verifyToken(code, "")).toBe(false);
  });

  it("keyuri otpauth:// URI'si üretir (QR için)", () => {
    const uri = keyuri("admin", generateSecret());
    expect(uri.startsWith("otpauth://totp/")).toBe(true);
    expect(uri).toContain("Altunmak%20CRM");
  });
});

// otplib 13 geçişi: 12'nin ürettiği 10 baytlık anahtarlar veritabanında duruyor. 13 bunları varsayılan
// olarak reddeder (SecretTooShortError); kodlar 12.0.1 ile bu anlarda üretildi (referans, elle yazılmadı).
describe("otplib 12 ile kurulmuş 2FA (13'e geçiş)", () => {
  const ESKI = "JBSWY3DPEHPK3PXP"; // 16 Base32 hane = 10 bayt, 12'nin generateSecret() biçimi
  const V12 = { 1700000000: "324550", 1750000015: "509970", 1792476960: "524799", 2000000029: "620710" };
  it("eski anahtarda 12'nin ürettiği kod aynı anda doğrulanır ve aynısı üretilir", () => {
    for (const [an, kod] of Object.entries(V12)) {
      expect(verifyToken(kod, ESKI, Number(an)), an).toBe(true);
      expect(currentToken(ESKI, Number(an)), an).toBe(kod);
    }
  });
  it("tolerans 12'deki window: 1 ile aynı: ±1 adım kabul, ±2 adım red", () => {
    const an = 1792476960; // adım başı
    const kod = V12[an];
    expect(verifyToken(kod, ESKI, an + 30)).toBe(true);
    expect(verifyToken(kod, ESKI, an - 30)).toBe(true);
    expect(verifyToken(kod, ESKI, an + 60)).toBe(false);
    expect(verifyToken(kod, ESKI, an - 60)).toBe(false);
  });
  it("boşluklu kod kabul, biçimsiz kod hata fırlatmadan reddedilir", () => {
    expect(verifyToken("524 799", ESKI, 1792476960)).toBe(true);
    expect(verifyToken("abcdef", ESKI, 1792476960)).toBe(false);
    expect(verifyToken("12345", ESKI, 1792476960)).toBe(false);
  });
  it("yeni anahtar 20 bayt (32 Base32 hane) ve QR adresi aynı biçimde", () => {
    const s = generateSecret();
    expect(s).toMatch(/^[A-Z2-7]{32}$/);
    expect(keyuri("admin", ESKI)).toMatch(/^otpauth:\/\/totp\/Altunmak%20CRM:admin\?/);
    expect(keyuri("admin", ESKI)).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(keyuri("admin", ESKI)).toContain("issuer=Altunmak%20CRM");
  });
});

describe("Kurtarma kodları", () => {
  it("istenen sayıda, XXXXX-XXXXX biçiminde üretir", () => {
    const codes = generateRecoveryCodes(8);
    expect(codes).toHaveLength(8);
    codes.forEach(c => expect(c).toMatch(/^[0-9A-F]{5}-[0-9A-F]{5}$/));
    expect(new Set(codes).size).toBe(8); // tekrarsız
  });

  it("hash deterministik, büyük/küçük ve boşluk duyarsız", () => {
    expect(hashRecovery("abcde-12345")).toBe(hashRecovery("ABCDE-12345"));
    expect(hashRecovery(" abcde-12345 ")).toBe(hashRecovery("ABCDE-12345"));
  });

  it("matchRecovery: listede varsa hash döner, yoksa null", () => {
    const codes = generateRecoveryCodes(3);
    const hashes = codes.map(hashRecovery);
    expect(matchRecovery(codes[1], hashes)).toBe(hashRecovery(codes[1]));
    expect(matchRecovery("ZZZZZ-ZZZZZ", hashes)).toBeNull();
    expect(matchRecovery("", hashes)).toBeNull();
  });
});
