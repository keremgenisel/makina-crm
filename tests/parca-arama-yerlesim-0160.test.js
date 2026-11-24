// Spec 0160 AC-32 (R2/5, P10): uzun adlı parçada alt satır adın altına iner ve arama paneli yatay kaymaz. Gerçek yerleşim Electron'da
// ölçülür (jsdom yerleşim yapmaz); düzenek scripts/tests/layout/parca-arama.*, ölçüm scripts/tests/parca-arama-yerlesim.cjs.
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { build } from "vite";
import react from "@vitejs/plugin-react";

const require = createRequire(import.meta.url);
const root = path.join(__dirname, "..");

describe("Spec 0160: parça arama paneli (Electron altında gerçek yerleşim)", () => {
  it("AC-32: 1280 ve 1024 px'te 139 karakterlik adın alt satırı adın altında, iki panel yatay kaymaz", async () => {
    const outDir = mkdtempSync(path.join(os.tmpdir(), "parca-arama-"));
    await build({
      configFile: false, logLevel: "error", root: path.join(root, "scripts", "tests", "layout"), base: "./", plugins: [react()],
      build: { outDir, emptyOutDir: true, rollupOptions: { input: path.join(root, "scripts", "tests", "layout", "parca-arama.html") } },
    });
    const electronBin = require(path.join(root, "node_modules", "electron"));
    const r = spawnSync(electronBin, [path.join(root, "scripts", "tests", "parca-arama-yerlesim.cjs"), path.join(outDir, "parca-arama.html")], { encoding: "utf-8", timeout: 120000 });
    if (r.status !== 0) { console.error("STDOUT:\n" + r.stdout); console.error("STDERR:\n" + r.stderr.split("\n").filter(l => !/mojo|Widget/.test(l)).join("\n")); }
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("TUM KONTROLLER GECTI");
  }, 180000);
});
