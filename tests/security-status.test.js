// Disk şifreleme durumu ayrıştırıcısı: manage-bde (Windows, TR/EN yerelleştirme) ve fdesetup
// (macOS) çıktısından on/off/unknown çıkarır. Yanlış "kapalı" göstermemek için tanınmayan
// çıktı ve desteklenmeyen platform "unknown" döner.
import { describe, it, expect } from "vitest";
import { parseDiskEncryption } from "../electron/securityStatus.cjs";

describe("parseDiskEncryption", () => {
  it("macOS FileVault açık/kapalı", () => {
    expect(parseDiskEncryption("darwin", "FileVault is On.")).toBe("on");
    expect(parseDiskEncryption("darwin", "FileVault is Off.")).toBe("off");
    expect(parseDiskEncryption("darwin", "beklenmeyen çıktı")).toBe("unknown");
  });

  it("Windows BitLocker İngilizce çıktı", () => {
    expect(parseDiskEncryption("win32", "Conversion Status: Fully Encrypted\nProtection Status: Protection On")).toBe("on");
    expect(parseDiskEncryption("win32", "Conversion Status: Fully Decrypted\nProtection Status: Protection Off")).toBe("off");
  });

  it("Windows BitLocker Türkçe çıktı", () => {
    expect(parseDiskEncryption("win32", "Koruma Durumu: Koruma Açık")).toBe("on");
    expect(parseDiskEncryption("win32", "Koruma Durumu: Koruma Kapalı")).toBe("off");
  });

  it("tanınmayan Windows çıktısı ve desteklenmeyen platform → unknown", () => {
    expect(parseDiskEncryption("win32", "erişim reddedildi")).toBe("unknown");
    expect(parseDiskEncryption("linux", "her neyse")).toBe("unknown");
    expect(parseDiskEncryption("win32", "")).toBe("unknown");
  });
});
