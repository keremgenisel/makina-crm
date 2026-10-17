// Spec 0080: Gider Kalemleri ve Tedarikçiler listelerinde sayfalama kalkar. Kaynak taramaları (R9, R10, R11, AC-20, plan P4).
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const kok = resolve(__dirname, "..");
const oku = (f) => readFileSync(resolve(kok, f), "utf8");
const IKI = ["src/components/gider/DonemRaporu.jsx", "src/components/gider/Tedarikciler.jsx"];

describe("Spec 0080: kaynak taramaları", () => {
  it("AC-12: iki dosyada sayfalama kancası, çubuk, ikisinin import satırları ve useFilteredList yok (R9/2)", () => {
    for (const f of IKI) {
      const s = oku(f);
      expect(s, f).not.toMatch(/usePagination/);
      expect(s, f).not.toMatch(/<Pagination\b/);
      expect(s, f).not.toMatch(/import[^;]*\bPagination\b[^;]*from/);
      expect(s, f).not.toMatch(/hooks\/usePagination/);
      expect(s, f).not.toMatch(/useFilteredList/);
    }
  });
  it("AC-13: iki dosyada elle yazılmış pager yok (sayfa dilimi, kendi önceki/sonraki düğmesi)", () => {
    for (const f of IKI) {
      const s = oku(f);
      expect(s, f).not.toMatch(/\.slice\(\s*\(?\s*(page|sayfa)/i);
      expect(s, f).not.toMatch(/perPage|sayfaBoyu/);
      expect(s, f).not.toMatch(/‹ Önceki|Sonraki ›/);
    }
  });
  // Spec 0090 ile (R10, R40): atama sütunu kalktığı için kalem listesi makina çözmez; satır başına çözüm de yok.
  it("AC-16 (spec 0090 ile): kalem listesi makina çözmez (atama sütunu yok); satır başına makinaGideriCoz çağrısı yok (R10)", () => {
    const s = oku("src/components/gider/DonemRaporu.jsx");
    expect(s).not.toMatch(/makinaGideriCoz\(|makinaCozucuOlustur|makinaCoz\(/);
  });
  // Spec 0089 ile (C7 0080 AC-17; 0089 R2, AC-7): tek tüketicisi Makina ve Model kalktığı için donemAnahtari de kalktı.
  it("AC-17 (spec 0089 ile): donemAnahtari KalemListesi'ne geçmez ve Giderler'de hiç yok (R11)", () => {
    const g = oku("src/components/Giderler.jsx");
    const cagrilar = g.split("<KalemListesi ").slice(1).map(p => p.slice(0, p.indexOf("/>")));
    expect(cagrilar).toHaveLength(2);
    for (const c of cagrilar) expect(c).not.toMatch(/donemAnahtari/);
    expect(g).not.toMatch(/donemAnahtari|MakinaModelGorunumu/);
    expect(oku("src/components/gider/DonemRaporu.jsx")).not.toMatch(/donemAnahtari/);
  });
  it("AC-20: görüntü aracında iki -sayfa2 ekranı yok, dört 0080 ekranı var", () => {
    const s = oku("scripts/evidence/0009-sayfa.jsx");
    expect(s).not.toMatch(/"giderler-0062-kalemler-sayfa2"/);
    expect(s).not.toMatch(/"giderler-0062-tedarikciler-sayfa2"/);
    for (const e of ["giderler-0080-kalemler-tam", "giderler-0080-tedarikciler-tam", "giderler-0080-kalemler-suzgec-bos", "giderler-0080-tedarikciler-bos"])
      expect(s, e).toMatch(new RegExp(`"${e}":`));
  });
  // Triyaj (bulgu 2): DoD her kabul kriteri için AC adlı test ister. 0080 dosyalarında "AC-n", başka dosyalarda
  // "spec 0080 AC-n" test adında (it başlığında) geçmeli.
  it("DoD: AC-1…AC-20'nin her biri bir test adında", () => {
    const gez = (d) => readdirSync(resolve(kok, d)).flatMap(ad => {
      const f = `${d}/${ad}`;
      return statSync(resolve(kok, f)).isDirectory() ? gez(f) : /\.test\.jsx?$/.test(ad) ? [f] : [];
    });
    const bulunan = new Set();
    for (const f of gez("tests")) {
      const kendi = f.includes("0080");
      for (const [, baslik] of oku(f).matchAll(/\bit\(\s*"([^"]+)"/g)) {
        const re = kendi ? /AC-(\d+)/g : /spec 0080 AC-(\d+)/g;
        for (const [, n] of baslik.matchAll(re)) bulunan.add(Number(n));
      }
    }
    const eksik = Array.from({ length: 20 }, (_, i) => i + 1).filter(n => !bulunan.has(n));
    expect(eksik).toEqual([]);
  });
  it("DoD (plan P4): motor, sunucu, izin, veritabanı, birleştirme ve sayfalama kancası bu spec'i bilmez", () => {
    for (const f of ["src/lib/gider.js", "electron/serverAuth.cjs", "electron/server.cjs", "electron/db.cjs", "src/lib/merge.js",
      "src/lib/permissions.js", "src/hooks/usePagination.js"]) expect(oku(f), f).not.toMatch(/0080/);
  });
});
