// CSV dışa aktarımda formül enjeksiyonu koruması: = + - @ ile başlayan hücreler Excel'de
// formül olarak çalışmasın diye metne zorlanır; düz sayılar korunur.
import { describe, it, expect } from "vitest";
import { csvSafeCell, buildCSV } from "../src/components/settings/csvUtils";

describe("csvSafeCell — formül enjeksiyonu koruması", () => {
  it("formül tetikleyici hücreleri ' ile metne zorlar", () => {
    expect(csvSafeCell("=1+1")).toBe("'=1+1");
    expect(csvSafeCell("=cmd|'/c calc'!A1")).toBe("'=cmd|'/c calc'!A1");
    expect(csvSafeCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvSafeCell("+cmd")).toBe("'+cmd");
    expect(csvSafeCell("-cmd")).toBe("'-cmd");
    expect(csvSafeCell("\t=x")).toBe("'\t=x");
  });

  it("normal metni ve düz sayıları (finans/telefon) değiştirmez", () => {
    expect(csvSafeCell("Acar Metal")).toBe("Acar Metal");
    expect(csvSafeCell("-5000")).toBe("-5000");       // negatif tutar
    expect(csvSafeCell("+905551234567")).toBe("+905551234567"); // telefon
    expect(csvSafeCell("1.234,56")).toBe("1.234,56");
    expect(csvSafeCell("")).toBe("");
    expect(csvSafeCell(null)).toBe("");
  });

  it("buildCSV zararlı hücreyi kaçışlar (çıktıda '=... görünür)", () => {
    const csv = buildCSV([["Ad", "Not"], ["Acar", "=HYPERLINK(0)"]]);
    expect(csv).toContain('"\'=HYPERLINK(0)"'); // ' ön eki + tırnak kaçışı
    expect(csv).not.toContain('"=HYPERLINK(0)"'); // korumasız hali olmamalı
  });
});
