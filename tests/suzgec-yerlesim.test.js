// Spec 0014 AC-17: süzgeç çubuğu gerçek tarayıcı motorunda (Electron) farklı pencere genişliklerinde ölçülür. Sayfa vite ile
// paketlenir (gerçek Customers + ui.css).
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

describe("Süzgeç çubuğu (Electron altında gerçek yerleşim)", () => {
  it("AC-17: Çok seçenekli süzgeç çubukları içerik genişliğiyle çizilir ve dar pencerede satır sarar; düğmeler tam genişliğe yayılmaz", async () => {
    const outDir = mkdtempSync(path.join(os.tmpdir(), "suzgec-"));
    await build({
      configFile: false, logLevel: "error", root: path.join(root, "scripts", "tests", "layout"), base: "./", plugins: [react()],
      build: { outDir, emptyOutDir: true, rollupOptions: { input: path.join(root, "scripts", "tests", "layout", "suzgec.html") } },
    });
    const electronBin = require(path.join(root, "node_modules", "electron"));
    const r = spawnSync(electronBin, [path.join(root, "scripts", "tests", "suzgec-yerlesim.cjs"), path.join(outDir, "suzgec.html")], { encoding: "utf-8", timeout: 120000 });
    if (r.status !== 0) { console.error("STDOUT:\n" + r.stdout); console.error("STDERR:\n" + r.stderr); }
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("TUM KONTROLLER GECTI");
  }, 180000);
});
