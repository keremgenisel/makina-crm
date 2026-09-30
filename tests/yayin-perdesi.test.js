// Spec 0008: gider modülü yayın perdesi (GEÇİCİ). İşaret, dev/üretim ayrımı, tek kapı ve kaldırma talimatı.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { GIDER_PERDESI, giderPerdesiIndi } from "../src/lib/yayinPerdesi";

const kok = path.join(__dirname, "..");
const oku = (f) => readFileSync(path.join(kok, f), "utf-8");
const dosyalar = (dir) => readdirSync(dir).flatMap(ad => {
  const p = path.join(dir, ad);
  return statSync(p).isDirectory() ? dosyalar(p) : /\.(js|jsx)$/.test(ad) ? [p] : [];
});

describe("yayın perdesi işareti", () => {
  it("R3 / R9: işaret kodda tanımlı; 2026-09-30'dan beri kapalı (perde kaldırıldı, modül kullanıcıya açık)", () => {
    expect(GIDER_PERDESI).toBe(false);
  });
  it("perde kaldırıldı: üretim derlemesinde (kurulu sürüm) de perde inmez", () => {
    expect(giderPerdesiIndi({ PROD: true, DEV: false })).toBe(false);
  });
  it("R1: işaret açılırsa üretim derlemesinde perde yine iner (mekanizma korunur)", () => {
    expect(giderPerdesiIndi({ PROD: true, DEV: false }, true)).toBe(true);
  });
  it("AC-10: Geliştirme modunda modülün tamamı bugünkü gibi çalışır; perde hiçbir yerde görünmez", () => {
    expect(giderPerdesiIndi({ PROD: false, DEV: true })).toBe(false);
    expect(giderPerdesiIndi()).toBe(false); // test ortamı = geliştirme (vitest: PROD false)
    expect(giderPerdesiIndi(undefined)).toBe(false);
  });
  it("AC-13: Perde işareti kaldırıldığında modül, perde öncesi davranışına birebir döner (üretimde de)", () => {
    expect(giderPerdesiIndi({ PROD: true }, false)).toBe(false);
  });
});

describe("C3: tek kapı (kaynak taraması)", () => {
  it("işaret yalnız lib/yayinPerdesi.js ve App.jsx'te geçer; ekran ekran koşul yazılmadı", () => {
    const kullananlar = dosyalar(path.join(kok, "src"))
      .filter(f => /GIDER_PERDESI|giderPerdesiIndi|from "[^"]*yayinPerdesi"/.test(readFileSync(f, "utf-8")))
      .map(f => path.relative(kok, f).split(path.sep).join("/")).sort();
    expect(kullananlar).toEqual(["src/App.jsx", "src/lib/yayinPerdesi.js"]);
  });
  it("App'te izin ile perde ayrı: giderYetki = giderSekmesi && !giderPerdesiIndi()", () => {
    expect(oku("src/App.jsx")).toMatch(/const giderYetki = giderSekmesi && !giderPerdesiIndi\(\);/);
  });
});

describe("R9: geçici etiketi ve kaldırma talimatı yazılı", () => {
  it("işaret dosyası GEÇİCİ etiketli ve nasıl kaldırılacağını söyler", () => {
    const s = oku("src/lib/yayinPerdesi.js");
    expect(s).toMatch(/GEÇİCİ/);
    expect(s).toMatch(/KALDIRMA \(tek adım\): aşağıdaki GIDER_PERDESI'ni false yapın/);
  });
  it("CLAUDE.md perdenin varlığını, kapsamını ve kaldırılışını anlatır", () => {
    const s = oku("CLAUDE.md");
    expect(s).toMatch(/yayın perdesi/i);
    expect(s).toMatch(/GIDER_PERDESI = false/);
  });
});
