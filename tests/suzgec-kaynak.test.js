// Spec 0014 AC-1: yedi ekranda (ve Stok'un yedek parça süzgecinde) sekme ve süzgeç çubuğu sözlükteki segmentli
// seçiciden gelir; ekranda yerel pil ya da alt çizgili sekme stili kalmaz. İki istisna adıyla (R3, Z6): Müşteriler'in
// "Firmaya Göre Grupla" aç/kapası ve Finans'ın tutar göster/gizle düğmesi (ikisi de süzgeç değil, sözlükte bilinen borç).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const oku = (f) => readFileSync(path.join(__dirname, "..", f), "utf-8");
const EKRANLAR = ["Customers", "SimpleDealers", "Stock", "Finance", "Notes", "Analiz", "Documents"].map(a => `src/components/${a}.jsx`)
  .concat("src/components/stock/YedekParcaSatisTab.jsx");

describe("AC-1: Yedi ekranın hepsinde sekme ve süzgeç çubuğu aynı bileşenden gelir (kaynak taraması)", () => {
  it.each(EKRANLAR)("%s segmentli seçiciyi sözlükten alıyor", (f) => {
    expect(oku(f)).toMatch(/import \{[^}]*\bSegment\b[^}]*\} from "\.\.?\/(\.\.\/)?tasarim"|import \{[^}]*\bSegment\b[^}]*\} from "\.\.\/tasarim"/);
    expect(oku(f)).toMatch(/<Segment\b/);
  });
  it.each(EKRANLAR)("%s içinde yerel alt çizgili sekme ya da pil çubuğu stili yok", (f) => {
    const s = oku(f);
    expect(s, "alt çizgili sekme").not.toMatch(/borderBottom: subTab ===/);
    expect(s, "Analiz'in yerel Chip'i").not.toMatch(/const Chip\b/);
    // Pil: 20/999 köşeli, aktifte marka rengine dolan düğme. İstisnalar adıyla ayıklanır.
    const piller = [...s.matchAll(/<button[\s\S]{0,400}?borderRadius: (20|999)[\s\S]{0,600}?<\/button>/g)].map(m => m[0])
      .filter(b => /var\(--brand, #e85d1a\)|var\(--blu500/.test(b))
      .filter(b => !/Firmaya Göre Grupla/.test(b) && !/moneyVisible/.test(b));
    expect(piller, "yerel süzgeç pili").toEqual([]);
  });
  it("istisnalar yerinde ve adıyla: Grupla aç/kapası ve Finans tutar düğmesi", () => {
    expect(oku("src/components/Customers.jsx")).toMatch(/Firmaya Göre Grupla/);
    expect(oku("src/components/Finance.jsx")).toMatch(/moneyVisible/);
  });
});
