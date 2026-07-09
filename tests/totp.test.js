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
