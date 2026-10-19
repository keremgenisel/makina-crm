// Makina Maliyeti (kullanıcı isteği 2026-10-18): Parti Hesabı'nda "Üretim partisi" ile "Planlanan adetler", Hesap Ayarları'nda
// dönem bitişi ile varsayılan adet alanı aynı hizada. Gerçek yerleşim Electron'da ölçülür (jsdom yerleşim yapmaz); düzenek
// scripts/tests/layout/maliyet.*, ölçüm scripts/tests/maliyet-yerlesim.cjs.
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

describe("Makina Maliyeti alan hizası (Electron altında gerçek yerleşim)", () => {
  it("1920, 1440 ve 1280 px: Parti Hesabı'nın seçicisi ile düğmesi, Hesap Ayarları'nın üç alanı ve etiketi aynı hizada", async () => {
    const outDir = mkdtempSync(path.join(os.tmpdir(), "maliyet-"));
    await build({
      configFile: false, logLevel: "error", root: path.join(root, "scripts", "tests", "layout"), base: "./", plugins: [react()],
      build: { outDir, emptyOutDir: true, rollupOptions: { input: path.join(root, "scripts", "tests", "layout", "maliyet.html") } },
    });
    const electronBin = require(path.join(root, "node_modules", "electron"));
    const r = spawnSync(electronBin, [path.join(root, "scripts", "tests", "maliyet-yerlesim.cjs"), path.join(outDir, "maliyet.html")], { encoding: "utf-8", timeout: 120000 });
    if (r.status !== 0) { console.error("STDOUT:\n" + r.stdout); console.error("STDERR:\n" + r.stderr.split("\n").filter(l => !/mojo|Widget/.test(l)).join("\n")); }
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("TUM KONTROLLER GECTI");
  }, 180000);
});
