// Teklif/proforma yeni belge varsayılanları — özellikle Model Yılı (modelYiliDegeri)
// için Ayarlar'dan girilen TR/EN varsayılanın yeni belgeye dolması.
import { describe, it, expect } from "vitest";
import { makeEmpty } from "../src/components/Documents";

const cfg = (fieldDefaults) => ({ teklif: { fieldDefaults }, proforma: { fieldDefaults } });

describe("makeEmpty — Model Yılı varsayılanı", () => {
  it("yapılandırılmış TR varsayılanı yeni teklife dolar", () => {
    const f = makeEmpty("teklif", [], null, "TR", cfg({ modelYiliDegeri: { TR: "2026 — Yeni ve Kullanılmamıştır", EN: "2026 — New and Unused" } }));
    expect(f.modelYiliDegeri).toBe("2026 — Yeni ve Kullanılmamıştır");
  });

  it("İngilizce belgede EN varsayılanı dolar", () => {
    const f = makeEmpty("proforma", [], null, "EN", cfg({ modelYiliDegeri: { TR: "2026 — Yeni ve Kullanılmamıştır", EN: "2026 — New and Unused" } }));
    expect(f.modelYiliDegeri).toBe("2026 — New and Unused");
  });

  it("varsayılan yapılandırılmamışsa boş kalır (geriye dönük uyumlu)", () => {
    const f = makeEmpty("teklif", [], null, "TR", null);
    expect(f.modelYiliDegeri).toBe("");
  });
});
