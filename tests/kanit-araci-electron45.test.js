// Electron 45 (PR #54): kanıt aracı gizli pencerede son kareyi beklemeden görüntü alıyordu (kaydırma ve CSS geçişleri bazen
// yansımıyor, aynı ekran çekimden çekime farklı). Kanıt sayfası geçişleri çizmez, çekimden önce bekleme var; ikisi sabitlenir.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const oku = (f) => readFileSync(f, "utf-8");

describe("Kanıt aracı: Electron 45 kararlılığı", () => {
  it("kanıt sayfası CSS geçişlerini kapatır (animasyonlara dokunmaz); 0099'un textarea kuralı yerinde", () => {
    const h = oku("scripts/evidence/0009-sayfa.html");
    expect(h).toContain("*, *::before, *::after { transition: none !important; }");
    expect(h).toContain("textarea { resize: none !important; }");
    expect(h).not.toMatch(/animation:\s*none/);
  });
  it("ekran aracı capturePage'den hemen önce bekler", () => {
    const e = oku("scripts/evidence/0009-ekran.cjs");
    expect(e).toMatch(/await bekle\(\d+\);\n\s*const img = await win\.webContents\.capturePage\(\);/);
  });
  it("CLAUDE.md iki etkiyi (renk profili, bayat kare) ve düzeltmeyi anlatır", () => {
    expect(oku("CLAUDE.md")).toMatch(/Electron 45\.1\.0 \(PR #54[^\n]*Display P3[^\n]*capturePage[^\n]*transition: none !important/);
  });
});
