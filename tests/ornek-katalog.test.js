// Örnek katalog verileri (2026-11-09): kayıtlar kartın doğrulayıcısından geçer, kendiliğinden yazılmaz, uydurma kur yok.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ornekMalzemeler, ornekDisIslemler, ORNEK_ONEKI } from "../src/lib/ornekKatalog";
import { malzemeDogrula, malzemeFormu, malzemeEksikleri, malzemeKatalogu } from "../src/lib/malzeme";
import { disIslemDogrula, disIslemFormu } from "../src/lib/disIslem";

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
  it("örneklerde eksik bilgi yok (eksik rozeti çıkmaz) ve bantlı, boy fiyatlı, dövizli örnek var", () => {
    const m = ornekMalzemeler({ rates: RATES, yeniId: sayac() });
    for (const k of m) expect(malzemeEksikleri(k)).toEqual([]);
    expect(m.some(k => k.bantlar?.length === 3)).toBe(true);
    expect(m.some(k => k.boyFiyati > 0)).toBe(true);
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

describe("Örnek dış işlemler", () => {
  it("adet ve kilo birimli örnekler, dövizlide günün kuru; hepsi doğrulayıcıdan aynen geçer", () => {
    const d = ornekDisIslemler({ rates: RATES, yeniId: sayac() });
    expect(d).toHaveLength(4);
    expect(new Set(d.map(k => k.birim))).toEqual(new Set(["adet", "kilo"]));
    expect(d.find(k => k.paraBirimi === "EUR").kur).toBe(48.9);
    for (const k of d) {
      expect(k.ad.startsWith(ORNEK_ONEKI)).toBe(true);
      const { id, ...govde } = k;
      const v = disIslemDogrula(disIslemFormu(govde), []);
      expect(v.gecerli).toBe(true);
      expect(v.kayit).toEqual(govde);
    }
  });
  it("kur yoksa dövizli örnek eklenmez", () => {
    expect(ornekDisIslemler({ rates: null, yeniId: sayac() }).some(k => k.paraBirimi)).toBe(false);
  });
});

describe("Kendiliğinden yazılmaz", () => {
  it("örnek kitaplığı yalnız iki panelden çağrılır; App, db ve göç onu bilmez", () => {
    for (const f of ["src/App.jsx", "electron/db.cjs"]) expect(readFileSync(f, "utf8")).not.toMatch(/ornekKatalog|ornekMalzemeler|ornekDisIslemler/);
  });
});
