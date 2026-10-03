// Spec 0069 (R4, R5): yerel modül denetimi şifreli sürücünün Electron altında GERÇEKTEN yüklendiğini kanıtlar.
// Eskiden deneme bellek içi veritabanında `PRAGMA key` kullandığı için sürücü anahtarı reddediyor ve şifreli sürücü
// her çalışmada sağlıksız sayılıyordu (denetim hiçbir zaman kanıt üretmedi). Electron ikilisi gerektirdiği için Electron
// test listesinde (vite.config.js ELECTRON_TESTLERI).
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

describe("ensure-native --denetle (spec 0069)", () => {
  it("iki sürücü de Electron altında SAĞLAM; şifreli sürücü PRAGMA key ile şifreli dosya yazar", () => {
    const r = spawnSync(process.execPath, ["scripts/ensure-native.cjs", "--denetle"], { encoding: "utf-8", timeout: 120000 });
    expect(r.stdout).toMatch(/better-sqlite3-multiple-ciphers \d+\.\d+\.\d+ \(şifreli: PRAGMA key \+ şifreli dosya\): SAĞLAM/);
    expect(r.stdout).toMatch(/\] better-sqlite3 \d+\.\d+\.\d+: SAĞLAM/);
    expect(r.status).toBe(0);
  });
  it("şifreli deneme bellek içi veritabanında yapılmaz (sürücü orada anahtarı reddeder)", () => {
    const kod = readFileSync("scripts/ensure-native.cjs", "utf-8");
    expect(kod).not.toMatch(/new D\(":memory:"\); d\.pragma\("key/);
    expect(kod).toMatch(/mkdtempSync/);
  });
});
