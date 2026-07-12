// Sunucu kurulum (server:setupAdmin) yolu kademeli giriş kilidine takılır — Electron altında
// koşar (better-sqlite3 ABI + gerçek IPC handler). Bu sarmalayıcı scripts/tests/setup-admin-lockout.cjs'yi
// başlatır ve çıkış koduna bakar. REGRESYON: setupAdmin start()→pruneRateBuckets nedeniyle kilit
// devreye girmiyordu, admin şifresi sınırsız denenebiliyordu.
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.join(__dirname, "..");

describe("Sunucu kurulum kademeli kilidi (Electron altında)", () => {
  it("setupAdmin arka arkaya yanlış şifrede kilitlenir, kayıt tutar, süre sonrası doğru şifre çalışır", () => {
    const electronBin = require(path.join(root, "node_modules", "electron"));
    const r = spawnSync(electronBin, [path.join(root, "scripts", "tests", "setup-admin-lockout.cjs")], {
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
