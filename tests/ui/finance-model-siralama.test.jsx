// @vitest-environment jsdom
// Model Bazlı Satış kutusu ADET bazlı sıralanır: en çok satılan model en üstte
// (gelire göre değil). Eşitlikte gelire göre.
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { Finance } from "../../src/components/Finance";

// Model B: 3 adet düşük gelir; Model A: 1 adet yüksek gelir.
// Gelire göre A üstte olurdu; ADET'e göre B üstte olmalı.
const customers = [
  { id: 1, name: "M1", model: "A", currency: "TRY", fabrikaSatisBedeli: "1000000", installDate: "2026-01-10" },
  { id: 2, name: "M2", model: "B", currency: "TRY", fabrikaSatisBedeli: "100", installDate: "2026-01-11" },
  { id: 3, name: "M3", model: "B", currency: "TRY", fabrikaSatisBedeli: "100", installDate: "2026-01-12" },
  { id: 4, name: "M4", model: "B", currency: "TRY", fabrikaSatisBedeli: "100", installDate: "2026-01-13" },
];

describe("Finance — Model Bazlı Satış adet sıralaması", () => {
  it("en çok adetli model en üstte (gelir değil, adet bazlı)", () => {
    render(
      <Finance customers={customers} services={[]} dealers={[]} partSales={[]}
        yedekParcaSatislar={[]} factory={{ name: "Altuntaş Makina" }}
        rates={{}} payments={[]} teklifler={[]} serverPermissions={null} />
    );
    const modelHucreleri = screen.getAllByRole("cell")
      .filter((td) => td.textContent === "A" || td.textContent === "B");
    expect(modelHucreleri[0].textContent).toBe("B"); // 3 adet → en üstte
    expect(modelHucreleri[1].textContent).toBe("A"); // 1 adet → altta
  });
});

// Satıcı S1: 1 adet yüksek gelir; S2: 3 adet düşük gelir → adete göre S2 üstte.
const satisMusterileri = [
  { id: 1, name: "M1", model: "A", currency: "TRY", satisYapan: "S1", fabrikaSatisBedeli: "1000000", installDate: "2026-01-10" },
  { id: 2, name: "M2", model: "A", currency: "TRY", satisYapan: "S2", fabrikaSatisBedeli: "100", installDate: "2026-01-11" },
  { id: 3, name: "M3", model: "A", currency: "TRY", satisYapan: "S2", fabrikaSatisBedeli: "100", installDate: "2026-01-12" },
  { id: 4, name: "M4", model: "A", currency: "TRY", satisYapan: "S2", fabrikaSatisBedeli: "100", installDate: "2026-01-13" },
];

describe("Finance — Satış Yapan Bazlı adet sıralaması", () => {
  it("en çok adetli satıcı en üstte (gelir değil, adet bazlı)", () => {
    render(
      <Finance customers={satisMusterileri} services={[]} dealers={[]} partSales={[]}
        yedekParcaSatislar={[]} factory={{ name: "Altuntaş Makina" }}
        rates={{}} payments={[]} teklifler={[]} serverPermissions={null} />
    );
    const satisHucreleri = screen.getAllByRole("cell")
      .filter((td) => td.textContent === "S1" || td.textContent === "S2");
    expect(satisHucreleri[0].textContent).toBe("S2"); // 3 adet → en üstte
    expect(satisHucreleri[1].textContent).toBe("S1"); // 1 adet → altta
  });
});
