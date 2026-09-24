// Spec 0007 AC-19 / AC-20: bayi detay modalı eylem satırı gerçek tarayıcı motorunda (Electron) ölçülür. Sayfa vite ile
// paketlenir (gerçek SimpleDealers + ui.css), Electron farklı pencere genişliklerinde buton kırpılmasını ölçer.
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

describe("Bayi detay modalı eylem satırı (Electron altında gerçek yerleşim)", () => {
  it("AC-19 / AC-20: dört ve üç butonla geniş ve dar pencerede kırpılma yok", async () => {
    const outDir = mkdtempSync(path.join(os.tmpdir(), "bayi-modal-"));
    await build({
      configFile: false, logLevel: "error", root: path.join(root, "scripts", "tests", "layout"), base: "./", plugins: [react()],
      build: { outDir, emptyOutDir: true, rollupOptions: { input: path.join(root, "scripts", "tests", "layout", "bayi-modal.html") } },
    });
    const electronBin = require(path.join(root, "node_modules", "electron"));
    const r = spawnSync(electronBin, [path.join(root, "scripts", "tests", "bayi-modal-layout.cjs"), path.join(outDir, "bayi-modal.html")], { encoding: "utf-8", timeout: 120000 });
    if (r.status !== 0) { console.error("STDOUT:\n" + r.stdout); console.error("STDERR:\n" + r.stderr); }
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("TUM KONTROLLER GECTI");
  }, 180000);
});
