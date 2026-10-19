// İstemci ↔ sunucu uçtan uca: gerçek istemci IPC kodu (electron/ipc/data.cjs) gerçek gömülü sunucuya karşı, Electron altında
// (better-sqlite3 Electron ABI'siyle derli). Kapsam ve gerekçe scripts/tests/istemci-sunucu.cjs'in başında.
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.join(__dirname, "..");

describe("İstemci ↔ sunucu (Electron altında)", () => {
  it("giriş ve sertifika güveni, veri yükleme/kaydetme/çakışma, kilitler, dosya köprüsü, kullanıcı yönetimi, oturum", () => {
    const electronBin = require(path.join(root, "node_modules", "electron"));
    const r = spawnSync(electronBin, [path.join(root, "scripts", "tests", "istemci-sunucu.cjs")], { encoding: "utf-8", timeout: 120000 });
    if (r.status !== 0) {
      console.error("STDOUT:\n" + r.stdout);
      console.error("STDERR:\n" + r.stderr);
    }
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("TUM KONTROLLER GECTI");
  }, 150000);
});
