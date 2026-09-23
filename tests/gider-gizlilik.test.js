// Spec 0001 AC-56 / C7b / X14 / X16: çalışan bazlı personel tutarı ve elden bileşen hiçbir yazdırma
// çıktısına ve hiçbir CSV/XLSX dışa aktarma dosyasına girmez. Yazdırma şablonları ve dışa aktarma
// üreticileri gider/personel alanlarını HİÇ okumamalı; biri ileride eklerse bu test kırılır.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..");
const oku = (p) => readFileSync(path.join(root, p), "utf-8");
const YASAKLI = /resmiTutar|eldenTutar|resmiMaliyet|eldenMaliyet|calisanAd|giderler|giderTanimlari|standartGiderler|tedarikciler/;

describe("AC-56: personel tutarı yazdırma ve dışa aktarmaya girmez", () => {
  it("yazdırma şablonları (printTemplates.js) gider/personel alanlarını okumaz", () => {
    expect(oku("src/lib/printTemplates.js")).not.toMatch(YASAKLI);
  });
  it("aylık rapor motoru gider verisi almaz (X14: rapor şablonu 0002 ile birlikte değişecek)", () => {
    expect(oku("src/lib/aylikRapor.js")).not.toMatch(YASAKLI);
  });
  it("CSV/XLSX dışa aktarma (SettingsExport.jsx) gider/personel alanlarını okumaz", () => {
    expect(oku("src/components/settings/SettingsExport.jsx")).not.toMatch(YASAKLI);
  });
  it("gider bileşenleri yazdırma API'sini çağırmaz", () => {
    const dosyalar = ["src/components/Giderler.jsx", "src/components/GiderForm.jsx",
      ...readdirSync(path.join(root, "src/components/gider")).map(f => `src/components/gider/${f}`)];
    for (const f of dosyalar) expect(oku(f), f).not.toMatch(/appPrint|printHtml|downloadCSV|XLSX|writeFile/);
  });
});
