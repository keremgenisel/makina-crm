// Spec 0067 R2 (AC-4, AC-23): Dönem Raporu'nun yeni kutu sırası gerçek tarayıcı motorunda (Electron) ölçülür; jsdom yerleşim
// hesaplamadığı için burada sahte yeşil verirdi. Sayfa gerçek Giderler bileşenini vite ile paketler.
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

describe("Dönem Raporu kutu düzeni (Electron altında gerçek yerleşim)", () => {
  it("AC-4 / AC-23: borç özeti kalem listesinin altında tam genişlik; iki kartlı satırlarda 1280 ve 1024 px'te üst üste binme ve taşma yok; spec 0080 AC-19: yetmiş kalem tek sayfada, belge taşmıyor, kabın yatay kayması ölçülür; spec 0081 AC-22 / AC-23 / AC-28: kutular kapalı, tür açık + KDV kapalı ve hepsi açık hâlde aynı kurallar; spec 0083 AC-7: görünüm çubuğu 1280'de tek satır, 1024'te pencere içinde; spec 0084 AC-38: stopajlı kira kalemiyle başlık düğmesi çizilir, başlık taşmaz", async () => {
    const outDir = mkdtempSync(path.join(os.tmpdir(), "donem-raporu-"));
    await build({
      configFile: false, logLevel: "error", root: path.join(root, "scripts", "tests", "layout"), base: "./", plugins: [react()],
      build: { outDir, emptyOutDir: true, rollupOptions: { input: path.join(root, "scripts", "tests", "layout", "donem-raporu.html") } },
    });
    const electronBin = require(path.join(root, "node_modules", "electron"));
    const r = spawnSync(electronBin, [path.join(root, "scripts", "tests", "donem-raporu-yerlesim.cjs"), path.join(outDir, "donem-raporu.html")], { encoding: "utf-8", timeout: 120000 });
    if (r.status !== 0) { console.error("STDOUT:\n" + r.stdout); console.error("STDERR:\n" + r.stderr); }
    console.log(r.stdout.split("\n").filter(l => l.startsWith("BILGI")).join("\n"));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("TUM KONTROLLER GECTI");
  }, 180000);
});
