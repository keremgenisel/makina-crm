// Ayarlar › Firma › Firma Çalışanları (kullanıcı isteği 2026-10-09): ekleme satırı ve "Ekle" düğmesi alta geçmez, ₺ işareti
// kendi alanında kalır, geniş pencerede kart büyür. Gerçek yerleşim Electron'da ölçülür (jsdom yerleşim yapmaz); düzenek
// scripts/tests/layout/calisan.*, ölçüm scripts/tests/calisan-yerlesim.cjs.
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { build } from "vite";
import react from "@vitejs/plugin-react";

const require = createRequire(import.meta.url);
const root = path.join(__dirname, "..");

describe("Firma Çalışanları ekleme satırı (Electron altında gerçek yerleşim)", () => {
  it("Ayarlar içerik sütunu bu bölümde 760 değil 1200 px'e kadar büyür (kaynak)", () => {
    expect(readFileSync(path.join(root, "src/components/Settings.jsx"), "utf-8")).toMatch(/settingsTab === "calisanlar" \|\|/);
  });
  it("1280, 1440 ve 1920 px pencerede beş alan ve Ekle tek sırada, taşma yok, ₺ alanın içinde; 1920'de kart 760 px'i aşar", async () => {
    const outDir = mkdtempSync(path.join(os.tmpdir(), "calisan-"));
    await build({
      configFile: false, logLevel: "error", root: path.join(root, "scripts", "tests", "layout"), base: "./", plugins: [react()],
      build: { outDir, emptyOutDir: true, rollupOptions: { input: path.join(root, "scripts", "tests", "layout", "calisan.html") } },
    });
    const electronBin = require(path.join(root, "node_modules", "electron"));
    const r = spawnSync(electronBin, [path.join(root, "scripts", "tests", "calisan-yerlesim.cjs"), path.join(outDir, "calisan.html"), ...(process.env.CALISAN_OLC ? ["--yalniz-olc"] : [])], { encoding: "utf-8", timeout: 120000 });
    if (process.env.CALISAN_OLC) require("node:fs").writeFileSync(process.env.CALISAN_OLC, r.stdout + "\n" + r.stderr);
    if (r.status !== 0) { console.error("STDOUT:\n" + r.stdout); console.error("STDERR:\n" + r.stderr.split("\n").filter(l => !/mojo|Widget/.test(l)).join("\n")); }
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("TUM KONTROLLER GECTI");
  }, 180000);
});
