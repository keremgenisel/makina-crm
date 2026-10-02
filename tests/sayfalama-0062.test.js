// @vitest-environment jsdom
// Spec 0062: paylaşılan sayfalama kancası (R27) ve kaynak taramaları (R11, R12, R15, R21, R26).
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { usePagination } from "../src/hooks/usePagination";
import { giderKalemDogrula } from "../src/lib/gider";
import { giderKasaRaporu, buildGiderKasaRaporuHtml } from "../src/lib/giderRaporu";
import { girdi, GIDERLER, turMap, tedarikciler } from "./fixtures/0059-veri";

afterEach(cleanup);
// jsdom ortamında new URL(…, import.meta.url) dosya yolunu çözmüyor; kök dizinden okunur.
const kok = resolve(__dirname, "..");
const oku = (f) => readFileSync(resolve(kok, f), "utf-8");
const dizi = (n) => Array.from({ length: n }, (_, i) => i + 1);

describe("Spec 0062 R27: usePagination", () => {
  it("AC-40: sıfırlama anahtarı değişince sayfa 1'e döner; anahtar aynı kaldıkça sayfa korunur", () => {
    const { result, rerender } = renderHook(({ items, anahtar }) => usePagination(items, 10, anahtar), { initialProps: { items: dizi(35), anahtar: "a" } });
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
    expect(result.current.paged).toEqual(dizi(35).slice(20, 30));
    rerender({ items: dizi(35), anahtar: "a" });
    expect(result.current.page).toBe(3);
    rerender({ items: dizi(35), anahtar: "b" });
    expect(result.current.page).toBe(1);
    expect(result.current.paged).toEqual(dizi(10));
  });
  it("AC-30 / AC-40: liste küçülünce sayfa kırpılır (boş sayfa yok); \"‹ Önceki\" kırpılmış sayfadan bir öncekine gider", () => {
    const { result, rerender } = renderHook(({ items }) => usePagination(items, 10), { initialProps: { items: dizi(50) } });
    act(() => result.current.setPage(5));
    rerender({ items: dizi(25) });
    expect(result.current.page).toBe(3);
    expect(result.current.paged).toEqual([21, 22, 23, 24, 25]);
    act(() => result.current.setPage(p => Math.max(1, p - 1))); // Pagination'ın "‹ Önceki" düğmesinin çağrısı
    expect(result.current.page).toBe(2);
    act(() => result.current.setPage(p => p + 5)); // sınırın ötesi kırpılır
    expect(result.current.page).toBe(3);
  });
  it("triyaj: liste küçülüp yeniden büyüyünce eski sayfaya kendiliğinden atlanmaz (kırpılan sayfa saklanır)", () => {
    const { result, rerender } = renderHook(({ items }) => usePagination(items, 10), { initialProps: { items: dizi(30) } });
    act(() => result.current.setPage(3));
    rerender({ items: [] });
    expect(result.current.page).toBe(1);
    rerender({ items: dizi(30) });
    expect(result.current.page).toBe(1);
    expect(result.current.paged).toEqual(dizi(10));
    rerender({ items: dizi(15) }); // kısmi küçülmede de kırpılan sayfada kalır
    act(() => result.current.setPage(2));
    rerender({ items: dizi(8) });
    rerender({ items: dizi(30) });
    expect(result.current.page).toBe(1);
  });
  it("anahtarsız eski çağrı bugünkü gibi çalışır (geriye dönük uyum; Finans, Stok)", () => {
    const { result } = renderHook(() => usePagination(dizi(12)));
    expect(result.current).toMatchObject({ page: 1, perPage: 10 });
    act(() => result.current.setPage(2));
    expect(result.current.paged).toEqual([11, 12]);
  });
});

// Hangi liste hangi dosyada, hangi boyutla (R11, R12, R26; plan §3).
const LISTELER = [
  ["src/components/Kasa.jsx", 10, 4],
  ["src/components/cek/CekPortfoyu.jsx", 10, 2],
  ["src/components/gider/DonemRaporu.jsx", 10, 1],
  ["src/components/gider/MakinaKarliligi.jsx", 10, 1],
  ["src/components/gider/MakinaModelGorunumu.jsx", 10, 1],
  ["src/components/gider/Tedarikciler.jsx", 10, 1],
  ["src/components/gider/AcikKalemler.jsx", 10, 1],
  ["src/components/gider/EkstrePenceresi.jsx", 5, 1],
  ["src/components/gider/OdemeHatirlatma.jsx", 5, 1],
];
const KLASORLER = ["src/components/gider", "src/components/kasa", "src/components/cek"];

describe("Spec 0062: kaynak taramaları", () => {
  it("AC-12 / AC-26 / AC-39: listeler paylaşılan kanca ve Pagination ile sayfalanır; useFilteredList yok (R26)", () => {
    for (const [f, , adet] of LISTELER) {
      const s = oku(f);
      expect(s, f).toMatch(/import \{ usePagination \} from "\.\.\/(\.\.\/)?hooks\/usePagination"/);
      expect((s.match(/usePagination\(/g) || []).length, f).toBe(adet);
      expect((s.match(/<Pagination /g) || []).length, f).toBe(adet);
      expect(s, f).not.toMatch(/useFilteredList/);
    }
  });
  it("AC-12: gider, kasa ve çek klasörlerinde elle yazılmış pager yok (sayfa dilimi, kendi önceki/sonraki düğmesi)", () => {
    const dosyalar = KLASORLER.flatMap(d => readdirSync(resolve(kok, d)).filter(f => f.endsWith(".jsx")).map(f => `${d}/${f}`));
    for (const f of [...dosyalar, "src/components/Kasa.jsx"]) {
      const s = oku(f);
      expect(s, f).not.toMatch(/\.slice\(\s*\(\s*(page|sayfa)/i);
      expect(s, f).not.toMatch(/Sonraki ›|‹ Önceki/);
    }
  });
  it("AC-13: tam sayfa listeler 10, pencere içi listeler 5; 15 hiçbir yerde yok", () => {
    for (const [f, boyut, adet] of LISTELER) {
      const cagri = oku(f).match(/usePagination\([^;]*?,\s*(\d+)/g) || [];
      expect(cagri.length, f).toBe(adet);
      for (const c of cagri) expect(Number(c.match(/,\s*(\d+)$/)[1]), `${f}: ${c}`).toBe(boyut);
    }
  });
  it("AC-16 / AC-36: tek sayfalık listede çubuğu Pagination'ın kendisi gizler; ekranlarda ek koşul yok (R15)", () => {
    expect(oku("src/components/ui.jsx")).toMatch(/if \(pages <= 1\) return null;/);
    for (const [f] of LISTELER) {
      const s = oku(f);
      expect(s, f).not.toMatch(/(length|total)\s*>\s*(perPage|\w*Per\b|10|5)\s*&&\s*<Pagination/);
      expect(s, f).not.toMatch(/(pages|totalPages)\s*(<=|>)\s*1/);
    }
  });
  it("AC-25: rapor kurucusu, sunum modülü ve dışa aktarma sayfalamayı görmez (page / paged okunmaz)", () => {
    for (const f of ["src/lib/giderRaporu.js", "src/lib/raporSunumu.js", "src/components/settings/SettingsExport.jsx"]) {
      expect(oku(f), f).not.toMatch(/\bpaged?\b|usePagination|<Pagination/);
    }
  });
  it("AC-24: Aylık Gider ve Kasa Raporu'nun kalem listesi tam basılır (sayfa boyutunun çok üstünde kalem)", () => {
    let id = 900;
    const ek = Array.from({ length: 27 }, (_, i) => {
      const r = giderKalemDogrula({ id: ++id, tarih: `2026-09-${String(1 + (i % 28)).padStart(2, "0")}`, turId: 1, tutar: 100 + i, kdvOrani: 0, tedarikciId: 11,
        aciklama: `Sayfalama kalemi ${i + 1}` }, { turMap, tedarikciler, uid: () => ++id });
      return r.kayit;
    });
    const html = buildGiderKasaRaporuHtml(giderKasaRaporu(girdi({ giderler: [...GIDERLER, ...ek] }), "2026-09"));
    for (let i = 1; i <= 27; i++) expect(html).toContain(`Sayfalama kalemi ${i}<`);
  });
});
