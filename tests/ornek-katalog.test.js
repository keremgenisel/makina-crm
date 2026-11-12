// Örnek katalog verileri (2026-11-09): kayıtlar kartın doğrulayıcısından geçer, kendiliğinden yazılmaz, uydurma kur yok.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ornekMalzemeler, ORNEK_ONEKI, ORNEK_DUGMESI, ORNEK_IPUCU } from "../src/lib/ornekKatalog";
import * as ornek from "../src/lib/ornekKatalog";
import { malzemeDogrula, malzemeFormu, malzemeEksikleri, malzemeKatalogu } from "../src/lib/malzeme";

const sayac = () => { let n = 9000; return () => ++n; };
const RATES = { usd: 42.15, eur: 48.9 };

describe("Örnek malzemeler", () => {
  it("dört örnek, hepsi 'Örnek:' önekli, kimlikli ve kartın doğrulayıcısından aynen geçer", () => {
    const m = ornekMalzemeler({ rates: RATES, yeniId: sayac() });
    expect(m).toHaveLength(4);
    for (const k of m) {
      expect(k.ad.startsWith(ORNEK_ONEKI)).toBe(true);
      expect(k.id).toBeGreaterThan(9000);
      const { id, ...govde } = k;
      const v = malzemeDogrula(malzemeFormu(govde), []);
      expect(v.gecerli).toBe(true);
      expect(v.kayit).toEqual(govde);
    }
  });
  // Spec 0143 ile (A-R5, AC-50): "boy fiyatlı örnek var" iddiası ters çevrildi; hiçbir örnek geldiği boy ya da boy fiyatı taşımaz.
  it("AC-50 (spec 0143 ile): örneklerde eksik bilgi yok, bantlı ve dövizli örnek var; geldiği boy ve boy fiyatı yok", () => {
    const m = ornekMalzemeler({ rates: RATES, yeniId: sayac() });
    for (const k of m) expect(malzemeEksikleri(k)).toEqual([]);
    expect(m.some(k => k.bantlar?.length === 3)).toBe(true);
    for (const k of m) { expect(k).not.toHaveProperty("boyFiyati"); expect(k).not.toHaveProperty("geldigiBoy"); }
    const usd = m.find(k => k.paraBirimi === "USD");
    expect(usd.kur).toBe(42.15);
    expect(malzemeKatalogu(m).size).toBe(4);
  });
  it("kur alınamamışsa dövizli örnek eklenmez (uydurma kur yazılmaz)", () => {
    const m = ornekMalzemeler({ rates: null, ratesErr: true, yeniId: sayac() });
    expect(m).toHaveLength(3);
    expect(m.some(k => k.paraBirimi)).toBe(false);
  });
  it("aynı adda canlı kayıt varsa o örnek atlanır", () => {
    const m = ornekMalzemeler({ mevcut: [{ id: 1, ad: `${ORNEK_ONEKI}St37 lama` }], rates: RATES, yeniId: sayac() });
    expect(m.map(k => k.ad)).not.toContain(`${ORNEK_ONEKI}St37 lama`);
    expect(m).toHaveLength(3);
  });
});

// Spec 0138 R9, R9/2 (AC-48): dış işlem örnekleri katalogla birlikte kalktı; malzeme yarısı ve üç sabit aynen kalır.
describe("Spec 0138: dış işlem örnekleri kalktı", () => {
  it("AC-48: kitaplıkta yalnız malzeme yarısı ve üç sabit var; dış işlem örnekleri kaynakta yok", () => {
    expect(Object.keys(ornek).sort()).toEqual(["ORNEK_DUGMESI", "ORNEK_IPUCU", "ORNEK_ONEKI", "ornekMalzemeler"]);
    expect(ORNEK_DUGMESI).toBe("Örnek verileri ekle");
    expect(ORNEK_IPUCU.length).toBeGreaterThan(0);
    const src = readFileSync("src/lib/ornekKatalog.js", "utf8");
    expect(src).not.toMatch(/ISLEM_FORMLARI|ornekDisIslemler|disIslem/);
  });
});

describe("Kendiliğinden yazılmaz", () => {
  it("örnek kitaplığı yalnız malzeme panelinden çağrılır; App, db ve göç onu bilmez", () => {
    for (const f of ["src/App.jsx", "electron/db.cjs"]) expect(readFileSync(f, "utf8")).not.toMatch(/ornekKatalog|ornekMalzemeler/);
  });
});
