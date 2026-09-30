// Spec 0050 R13 (AC-3, AC-7, AC-19): Sınıf 1 form pencereleri gerçek tarayıcı motorunda (Electron) ölçülür; jsdom yerleşim
// hesaplamadığı için burada sahte yeşil verirdi. Sayfa gerçek bileşenleri vite ile paketler.
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

describe("Form pencereleri (Electron altında gerçek yerleşim)", () => {
  it("AC-3 / AC-7 / AC-19: gider formu, Çek Ekle, Ödeme Kaydet, Ekstre ve Ciro/Çek Yaz; 1280 ve 1024 px'te pencere 900 px'i aşmaz, ekrana sığar, yatay kaydırma yok; alt düğmeler yerinde; on satırlı ödeme içeride kayar", async () => {
    const outDir = mkdtempSync(path.join(os.tmpdir(), "form-pencere-"));
    await build({
      configFile: false, logLevel: "error", root: path.join(root, "scripts", "tests", "layout"), base: "./", plugins: [react()],
      build: { outDir, emptyOutDir: true, rollupOptions: { input: path.join(root, "scripts", "tests", "layout", "form-pencere.html") } },
    });
    const electronBin = require(path.join(root, "node_modules", "electron"));
    const r = spawnSync(electronBin, [path.join(root, "scripts", "tests", "form-pencere-yerlesim.cjs"), path.join(outDir, "form-pencere.html")], { encoding: "utf-8", timeout: 120000 });
    if (r.status !== 0) { console.error("STDOUT:\n" + r.stdout); console.error("STDERR:\n" + r.stderr); }
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("TUM KONTROLLER GECTI");
  }, 180000);
});
