// Arşiv resmi optimize (nativeImage) Electron altında koşar — bu sarmalayıcı scripti başlatır.
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.join(__dirname, "..");

describe("Arşiv resmi yükleme-anı optimize (Electron altında)", () => {
  it("büyük resmi küçültür, belge/bozuk baytlara dokunmaz", () => {
    const electronBin = require(path.join(root, "node_modules", "electron"));
    const r = spawnSync(electronBin, [path.join(root, "scripts", "tests", "image-optimize.cjs")], { encoding: "utf-8", timeout: 120000 });
    if (r.status !== 0) { console.error("STDOUT:\n" + r.stdout); console.error("STDERR:\n" + r.stderr); }
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("TUM KONTROLLER GECTI");
  }, 150000);
});
