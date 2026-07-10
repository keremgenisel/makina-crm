// İstemci app-lock kuyruğu → sunucu security_log gönderimi (flushSecurityQueue) Electron
// altında koşar (better-sqlite3 ABI + gerçek gömülü sunucu). Bu sarmalayıcı
// scripts/tests/security-flush.cjs'yi başlatır ve çıkış koduna bakar.
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.join(__dirname, "..");

describe("Güvenlik kuyruğu gönderimi (Electron altında)", () => {
  it("login olmadan flushSecurityQueue app-lock kayıtlarını sunucuya işler, sahteyi reddeder", () => {
    const electronBin = require(path.join(root, "node_modules", "electron"));
    const r = spawnSync(electronBin, [path.join(root, "scripts", "tests", "security-flush.cjs")], {
      encoding: "utf-8",
      timeout: 120000,
    });
    if (r.status !== 0) {
      console.error("STDOUT:\n" + r.stdout);
      console.error("STDERR:\n" + r.stderr);
    }
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("TUM KONTROLLER GECTI");
  }, 150000);
});
