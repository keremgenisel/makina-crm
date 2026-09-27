// Spec 0030 R1–R3 (plan B11, AC-1, AC-2, AC-20, AC-21): kaynakta statik yazılmış her `var(--ad)` temada tanımlıdır.
// `var(--ad, #açık)` yazımı ad tanımsızken hata vermez, sessizce yedek açık renge düşer ve karanlık temada kutuyu beyaz
// bırakır; bu test o sınıfı kalıcı olarak kapatır. Kurallar:
// - `src/lib/theme.js` taranmaz (paletin kendi tanımı; yorumunda örnek yazım `var(--token, #hex)` geçer).
// - Yorumlar (`//`, `/* */`, JSX `{/* */}`) taranmaz.
// - Çalışma anında kurulan adlar (`var(--hk${n})` gibi) aşağıdaki DINAMIK listede adıyla durur; açılımları temada
//   tanımlı olmalıdır. Listede olmayan yeni bir dinamik ad testi kırar (sessiz atlama yok).
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { TOKENS } from "../src/lib/theme";

const KOK = path.join(__dirname, "..");
const TANIMLI = new Map(TOKENS.map(([ad, acik, koyu]) => [ad, { acik, koyu }]));
const DINAMIK = {
  hk: { neden: "Faaliyet Haritası yoğunluk kovası (Harita.jsx, var(--hk${kova + 1}))", acilim: ["hk1", "hk2", "hk3", "hk4", "hk5"] },
};

const gez = (d) => readdirSync(path.join(KOK, d)).flatMap(ad => {
  const f = path.join(d, ad);
  return statSync(path.join(KOK, f)).isDirectory() ? gez(f) : /\.(jsx?|cjs|mjs|css)$/.test(ad) ? [f] : [];
});
const yorumsuz = (s) => s
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")      // JSX yorumu
  .replace(/\/\*[\s\S]*?\*\//g, "")          // blok yorum
  .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1"); // satır yorumu (URL'deki "://" hariç)
const DOSYALAR = gez("src").filter(f => !f.endsWith(path.join("lib", "theme.js")));

const kullanimlar = () => {
  const statik = new Map(), dinamik = new Map();
  for (const f of DOSYALAR) {
    const s = yorumsuz(readFileSync(path.join(KOK, f), "utf-8"));
    for (const m of s.matchAll(/var\(--([A-Za-z0-9_-]+)(\$\{)?/g)) {
      const hedef = m[2] ? dinamik : statik;
      if (!hedef.has(m[1])) hedef.set(m[1], new Set());
      hedef.get(m[1]).add(f);
    }
  }
  return { statik, dinamik };
};

describe("Tema değişkeni koruması (spec 0030 R3)", () => {
  const { statik, dinamik } = kullanimlar();
  it("AC-1 / AC-20: kaynakta statik yazılmış her var(--ad) temada tanımlı", () => {
    const eksik = [...statik].filter(([ad]) => !TANIMLI.has(ad)).map(([ad, f]) => `${ad} (${[...f].join(", ")})`);
    expect(eksik).toEqual([]);
  });
  it("AC-2: dinamik adlar testte adıyla listeli; listede olmayan dinamik ad yok; açılımları temada tanımlı", () => {
    expect([...dinamik.keys()].sort()).toEqual(Object.keys(DINAMIK).sort());
    for (const [ad, { acilim }] of Object.entries(DINAMIK)) for (const a of acilim) expect(TANIMLI.has(a), `${ad} → ${a}`).toBe(true);
  });
  it("AC-20: tarama theme.js'i ve yorumları dışarıda bırakır (yanlış alarm yok)", () => {
    expect(DOSYALAR.some(f => f.endsWith("theme.js"))).toBe(false);
    expect(statik.has("token")).toBe(false); // theme.js yorumundaki örnek yazım
    expect(yorumsuz('a // var(--yok, #fff)\n{/* var(--yok2) */}b /* var(--yok3) */ "http://x"')).not.toMatch(/var\(--yok/);
  });
  it("AC-21: temaya eklenen adların aydınlık değeri bugünkü yedek değeridir; eşlenen adların hedefi aynı değerde", () => {
    const acik = (ad) => TANIMLI.get(ad)?.acik;
    expect(acik("purBg2")).toBe("#ede9fe");
    expect(acik("purBr")).toBe("#ddd6fe");
    expect(acik("pur700")).toBe("#6d28d9");
    expect(acik("purBg3")).toBe("#faf7ff"); // B2
    expect(acik("pur900")).toBe("#3b0764"); // B3
    expect(acik("n100")).toBe("#f8fafc");   // n050 → n100
    expect(acik("brand")).toBe("#e85d1a");  // acc → brand
    for (const ad of ["n050", "acc"]) expect(statik.has(ad), ad).toBe(false);
  });
});

describe("R2: gider tarafındaki üç yer çıplak renk taşımaz", () => {
  const oku = (f) => readFileSync(path.join(KOK, f), "utf-8");
  const CIPLAK = /(?<!var\(--[A-Za-z0-9]+, )#[0-9a-fA-F]{6}\b/;
  it("GiderAlanlari personel rozeti tema değişkeninde", () => {
    const satir = oku("src/components/gider/GiderAlanlari.jsx").split("\n").find(l => l.includes("personel: ["));
    expect(satir).toBeTruthy();
    expect(satir.slice(satir.indexOf("personel: ["), satir.indexOf("]", satir.indexOf("personel: [")))).not.toMatch(CIPLAK);
  });
  it("CalisanManager ve GiderForm'un mor kutuları tema değişkeninde (B3: GiderForm'daki iki kutu)", () => {
    for (const f of ["src/components/CalisanManager.jsx", "src/components/GiderForm.jsx"]) {
      const s = oku(f);
      for (const hex of ["#faf7ff", "#ede9fe", "#f5f3ff", "#ddd6fe", "#3b0764"]) {
        const ciplak = s.split("\n").filter(l => l.includes(hex) && !l.includes(`, ${hex})`));
        expect(ciplak, `${f}: ${hex}`).toEqual([]);
      }
    }
  });
});
