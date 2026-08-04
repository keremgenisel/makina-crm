// @vitest-environment jsdom
// API (countriesnow.space) bazı şehirleri döndürmüyor; liste dolunca alan <Select> olduğu için o
// şehirler hiç seçilemiyordu (ör. Suudi Arabistan-Unaizah, Kosova-Peje). CITY_SUPPLEMENT bunları
// API listesine ekliyor. Bu test o iki şehrin açılır listede seçenek olarak çıktığını doğrular.
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, within } from "@testing-library/react";
import { CountryCityFields } from "../../src/components/ui";

afterEach(cleanup);

const sehirSecenekleri = (container) => {
  const selects = container.querySelectorAll("select");
  // İlk select Ülke, ikinci Şehir.
  const sehir = selects[1];
  return [...sehir.querySelectorAll("option")].map(o => o.textContent);
};

describe("CountryCityFields — API'nin döndürmediği şehirler (CITY_SUPPLEMENT)", () => {
  it("Suudi Arabistan'da Unaizah, API listesinde olmasa bile seçenek olarak çıkar", () => {
    const geoData = { "Saudi Arabia": ["Riyadh", "Jeddah", "Mecca"] }; // Unaizah yok
    const { container } = render(
      <CountryCityFields country="Suudi Arabistan" city="" onCountry={() => {}} onCity={() => {}} geoData={geoData} />
    );
    expect(sehirSecenekleri(container)).toContain("Unaizah");
  });

  it("Kosova'da Peje seçenek olarak çıkar (API listesi boş olsa da)", () => {
    const { container } = render(
      <CountryCityFields country="Kosova" city="" onCountry={() => {}} onCity={() => {}} geoData={{}} />
    );
    expect(sehirSecenekleri(container)).toContain("Peje");
  });

  it("supplement olmayan ülkede davranış değişmez (yalnız API şehirleri)", () => {
    const geoData = { "Germany": ["Berlin", "Munich"] };
    const { container } = render(
      <CountryCityFields country="Almanya" city="" onCountry={() => {}} onCity={() => {}} geoData={geoData} />
    );
    const secenekler = sehirSecenekleri(container);
    expect(secenekler).toContain("Berlin");
    expect(secenekler).toContain("Munich");
  });
});
