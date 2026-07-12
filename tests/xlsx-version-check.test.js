// xlsx sürüm-güncelliği denetiminin saf yardımcıları (scripts/check-xlsx-version.cjs).
// Ağ çağrısı (fetchLatestVersion) burada test edilmez — parse + karşılaştırma mantığı test edilir.
import { describe, it, expect } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { parsePinnedVersion, compareVersions } = require("../scripts/check-xlsx-version.cjs");

describe("parsePinnedVersion — CDN URL'inden sürüm çıkarma", () => {
  it("dependencies içindeki xlsx CDN URL'inden sürümü çıkarır", () => {
    const pkg = { dependencies: { xlsx: "https://cdn.sheetjs.com/xlsx-0.20.2/xlsx-0.20.2.tgz" } };
    expect(parsePinnedVersion(pkg)).toBe("0.20.2");
  });
  it("devDependencies'ten de çıkarır", () => {
    const pkg = { devDependencies: { xlsx: "https://cdn.sheetjs.com/xlsx-0.21.0/xlsx-0.21.0.tgz" } };
    expect(parsePinnedVersion(pkg)).toBe("0.21.0");
  });
  it("xlsx yoksa veya biçim beklenmedikse null döner", () => {
    expect(parsePinnedVersion({ dependencies: {} })).toBeNull();
    expect(parsePinnedVersion({ dependencies: { xlsx: "^0.18.5" } })).toBeNull();
    expect(parsePinnedVersion({})).toBeNull();
  });
});

describe("compareVersions — düz x.y.z karşılaştırması", () => {
  it("geride olanı -1, ilerdekini 1, eşiti 0 döner", () => {
    expect(compareVersions("0.20.2", "0.20.3")).toBe(-1);
    expect(compareVersions("0.20.3", "0.20.2")).toBe(1);
    expect(compareVersions("0.20.2", "0.20.2")).toBe(0);
  });
  it("minor ve major farklarını da yakalar", () => {
    expect(compareVersions("0.19.9", "0.20.0")).toBe(-1);
    expect(compareVersions("1.0.0", "0.99.99")).toBe(1);
  });
  it("eksik parçaları 0 sayar", () => {
    expect(compareVersions("0.20", "0.20.0")).toBe(0);
    expect(compareVersions("0.20", "0.20.1")).toBe(-1);
  });
});
