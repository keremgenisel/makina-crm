// Ülke/şehir verisi — KKTC eklendi mi ve statik şehir listesi doğru mu.
import { describe, it, expect } from "vitest";
import { COUNTRIES, COUNTRY_EN, CITIES_KKTC, staticCities } from "../src/lib/constants";

describe("Kuzey Kıbrıs Türk Cumhuriyeti", () => {
  it("ülke listesinde ve İngilizce eşlemesinde var", () => {
    expect(COUNTRIES).toContain("Kuzey Kıbrıs Türk Cumhuriyeti");
    expect(COUNTRY_EN["Kuzey Kıbrıs Türk Cumhuriyeti"]).toBe("Northern Cyprus");
  });

  it("KKTC şehir listesi ilçeleri içerir", () => {
    expect(CITIES_KKTC).toContain("Lefkoşa");
    expect(CITIES_KKTC).toContain("Girne");
    expect(CITIES_KKTC).toContain("Gazimağusa");
    expect(CITIES_KKTC.length).toBe(6);
  });
});

describe("staticCities", () => {
  it("Türkiye ve KKTC için statik liste döner, diğerleri boş", () => {
    expect(staticCities("Türkiye")).toContain("İstanbul");
    expect(staticCities("Kuzey Kıbrıs Türk Cumhuriyeti")).toContain("Girne");
    expect(staticCities("Almanya")).toEqual([]);
    expect(staticCities("")).toEqual([]);
  });
});
