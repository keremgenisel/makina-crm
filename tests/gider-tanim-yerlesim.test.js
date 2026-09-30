// Spec 0030 AC-13 / AC-14 (plan B8): Tekrarlayan Giderler tablosu gerçek tarayıcı motorunda (Electron), uygulama kabuğunun
// genişlikleri içinde ölçülür. Kabuk sabitleri düzenek sayfasına kopyalandığı için kaynaktan kopmadıkları ayrıca denetlenir.
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
const oku = (f) => readFileSync(path.join(root, f), "utf-8");

describe("Tekrarlayan giderler tablosu (Electron altında gerçek yerleşim)", () => {
  it("kabuk sabitleri kaynakla aynı: kenar çubuğu 236, ana dolgu 28, Ayarlar menüsü 220 + boşluk 24", () => {
    expect(oku("src/App.jsx")).toContain("width: sidebarDar ? 66 : 236");
    expect(oku("src/App.jsx")).toContain('<div style={{ flex: 1, overflow: "auto", padding: 28 }}>');
    expect(oku("src/components/Settings.jsx")).toContain("width: 220, flexShrink: 0, minWidth: 200");
    expect(oku("src/components/Settings.jsx")).toContain('display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap"');
    expect(oku("src/components/Settings.jsx")).toMatch(/settingsTab === "gidertanim"\) \? 1200 : 760/); // kart sağa büyür
    const sayfa = oku("scripts/tests/layout/gider-tanim.jsx");
    expect(sayfa).toContain("width: 236");
    expect(sayfa).toContain('overflow: "auto", padding: 28');
  });
  it("AC-13 / AC-14: 1280 px pencerede yatay kaydırma yok, bütün sütunlar görünür; 1024 px'te tablo bozulmaz; düğmeler yan yana; geniş pencerede kart büyür", async () => {
    const outDir = mkdtempSync(path.join(os.tmpdir(), "gider-tanim-"));
    await build({
      configFile: false, logLevel: "error", root: path.join(root, "scripts", "tests", "layout"), base: "./", plugins: [react()],
      build: { outDir, emptyOutDir: true, rollupOptions: { input: path.join(root, "scripts", "tests", "layout", "gider-tanim.html") } },
    });
    const electronBin = require(path.join(root, "node_modules", "electron"));
    const r = spawnSync(electronBin, [path.join(root, "scripts", "tests", "gider-tanim-yerlesim.cjs"), path.join(outDir, "gider-tanim.html")], { encoding: "utf-8", timeout: 120000 });
    if (r.status !== 0) { console.error("STDOUT:\n" + r.stdout); console.error("STDERR:\n" + r.stderr); }
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("TUM KONTROLLER GECTI");
  }, 180000);
});
