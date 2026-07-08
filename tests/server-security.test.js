// Sunucu güvenlik testleri Electron altında koşmak zorunda (better-sqlite3 Electron ABI'siyle
// derli) — bu sarmalayıcı scripts/tests/server-security.cjs'yi Electron ile başlatır ve çıkış
// koduna bakar. Kapsam: kimlik doğrulama (401), yetki (salt-okunur/kısmi yazma 403),
// admin-gating (403), şifre uzunluğu, refresh-internal loopback, kaba kuvvet (429).
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.join(__dirname, "..");

describe("Gömülü sunucu güvenliği (Electron altında)", () => {
  it("kimlik doğrulama + yetki + admin-gating + kaba kuvvet", () => {
    const electronBin = require(path.join(root, "node_modules", "electron"));
    const r = spawnSync(electronBin, [path.join(root, "scripts", "tests", "server-security.cjs")], {
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
