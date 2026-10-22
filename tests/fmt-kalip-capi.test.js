// Spec 0101 C9, AC-38 (önkoşul): çapın metne çevrilmesinin tek yolu ve "çap dolu mu" sorusunun tek ölçütü
// (spec 0101 R3). Spec'ten önce, bugünkü kodla yazılıp yeşil görüldü.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fmtKalipCapi } from "../src/lib/utils";

describe("Spec 0101 AC-38: fmtKalipCapi", () => {
  it("AC-38: undefined ve null boş dize verir", () => {
    expect(fmtKalipCapi(undefined)).toBe("");
    expect(fmtKalipCapi(null)).toBe("");
  });
  it("AC-38: nesne olmayan değer boş dize verir", () => {
    expect(fmtKalipCapi("50 x 80")).toBe("");
    expect(fmtKalipCapi(50)).toBe("");
    expect(fmtKalipCapi(true)).toBe("");
  });
  it("AC-38: boş nesne ve parçaları boş dize olan nesne boş dize verir", () => {
    expect(fmtKalipCapi({})).toBe("");
    expect(fmtKalipCapi({ en: "", yukseklik: "", boy: "" })).toBe("");
  });
  it("AC-38: üç parçası yalnız boşluk olan nesne boş sayılır", () => {
    expect(fmtKalipCapi({ en: "  ", yukseklik: " ", boy: "\t" })).toBe("");
  });
  // Önkoşul testinin bulgusu (spec 0101 Karar 36): boş parçalar ATLANMAZ, yeri boş kalır (yorumdaki "atlanır" yanlış);
  // parçalar yalnız kırpılır. Davranış yedi çağrıda (müşteri tablosu, yazdırma, dışa aktarma) yaşadığı için değiştirilmedi.
  it("AC-38: tek parçası dolu nesne parçaları kırpar, boş parçaların yerini korur", () => {
    expect(fmtKalipCapi({ en: " 50 ", yukseklik: "  ", boy: "" })).toBe("50 x  x ");
    expect(fmtKalipCapi({ boy: "115" })).toBe(" x  x 115");
  });
  it("AC-38: üç parçası dolu nesne 'Çap x Arka Ölçü x Boy' sırasıyla yazar", () => {
    expect(fmtKalipCapi({ en: "50", yukseklik: "80", boy: "115" })).toBe("50 x 80 x 115");
    expect(fmtKalipCapi({ en: 50, yukseklik: 80, boy: 115 })).toBe("50 x 80 x 115");
  });
});

// Triyaj (spec 0101, bulgu 1): yanlış yorum ("boş parçalar atlanır") spec 0101'in ölçüm hatasının kaynağıydı.
describe("Spec 0101 triyaj: fmtKalipCapi'nin yorumu davranışını doğru anlatır", () => {
  it("yorum boş parçaların atlandığını söylemez, yerinin korunduğunu söyler", () => {
    const k = fs.readFileSync(path.resolve(__dirname, "../src/lib/utils.js"), "utf-8");
    const yorum = k.split("\n").find((l, i, a) => a[i + 1]?.startsWith("export const fmtKalipCapi"));
    expect(yorum).toMatch(/^\/\//);
    expect(yorum).not.toMatch(/atlanır/);
    expect(yorum).toMatch(/yeri korunur/);
    expect(fmtKalipCapi({ en: "50" })).toBe("50 x  x "); // yorumdaki örnek
  });
});
