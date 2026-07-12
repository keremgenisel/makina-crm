// SQLite katmanı testleri Electron altında koşmak zorunda (better-sqlite3 Electron
// ABI'siyle derli) — bu sarmalayıcı, scripts/tests/db-roundtrip.cjs'yi Electron ile
// başlatır ve çıkış koduna bakar. Detaylı PASS/FAIL çıktısı hata durumunda gösterilir.
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.join(__dirname, "..");

const runElectron = (script) => {
  const electronBin = require(path.join(root, "node_modules", "electron"));
  const r = spawnSync(electronBin, [path.join(root, "scripts", "tests", script)], {
    encoding: "utf-8",
    timeout: 120000,
  });
  if (r.status !== 0) {
    console.error("STDOUT:\n" + r.stdout);
    console.error("STDERR:\n" + r.stderr);
  }
  return r;
};

describe("SQLite katmanı (Electron altında)", () => {
  it("tam tur + migration + tablo atlama + audit temizliği", () => {
    const r = runElectron("db-roundtrip.cjs");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("TUM KONTROLLER GECTI");
  }, 150000);

  it("temiz kurulumda şema tam (ilk oturumda yeni sütunlara yazma çökmez)", () => {
    const r = runElectron("db-clean-install.cjs");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("TUM KONTROLLER GECTI");
  }, 150000);

  it("at-rest şifreleme: düz DB yerinde şifrelenir, veri korunur, anahtarsız açılmaz", () => {
    const r = runElectron("db-encryption.cjs");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("TUM KONTROLLER GECTI");
  }, 150000);
});
