// @vitest-environment jsdom
// Spec 0162 (gerçek Analiz bileşeni): birleşen parça seçicide tek satır, koduyla bulunur ve alt satırı dolu çizilir (0160 zinciri,
// AC-19); Parça Kırılımı'nın Model ve Müşteri görünümleri iki kaynağı birlikte gösterir (AC-12, AC-13). App'teki gibi canlı parçalar.
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { Analiz } from "../../src/components/Analiz";
import { VERI, PARTS } from "../fixtures/0162-veri";

afterEach(cleanup);
const canli = PARTS.filter(p => !p.deletedAt);
const ciz = () => render(<Analiz {...VERI} parts={canli} appSettings={{}} />);
const kutu = () => [...document.querySelectorAll("section")].find(s => s.textContent.includes("Parça Kırılımı"));
const panelSatirlari = () => [...screen.getByPlaceholderText("Parça ara...").parentElement.parentElement.children[1].querySelectorAll("button")];
const ara = (q) => { fireEvent.change(screen.getByPlaceholderText("Parça ara..."), { target: { value: q } }); return panelSatirlari().map(b => b.querySelector("span").textContent); };

describe("Spec 0162: gerçek Analiz", () => {
  it("AC-1 / AC-19: seçicide birleşen parça tek satır; koduyla ve ölçüsüyle bulunur, alt satırı dolu", () => {
    ciz();
    fireEvent.click(screen.getByLabelText("Parça seç"));
    expect(ara("kestamid")).toEqual(["100_ÖN KESTAMİD KAM"]);
    expect(ara("kam-1")).toEqual(["100_ÖN KESTAMİD KAM"]);
    expect(ara("ø40")).toEqual(["100_ÖN KESTAMİD KAM"]);
    expect(panelSatirlari()[0].querySelector('[data-testid="arama-alt-satir"]').textContent).toBe("KAM-1 · Ø40");
    expect(panelSatirlari()[0].textContent).toMatch(/14$/);
  });
  // Triyaj (bulgu 2): adetlere bakar; birleşmeden önce p:10 satırı AK100 5, AK120 5 taşıyordu (kimliksiz ve ölü kimlikli hareketler
  // ayrı satırlardaydı), birleşince AK100 6, AK120 8.
  it("AC-12: Model görünümü birleşen satırda iki kaynağın modellerini birlikte gösterir (adetlerle)", () => {
    ciz();
    const adet = (m) => kutu().querySelector(`span[title="${m}"]`).nextElementSibling.textContent;
    expect([adet("AK100"), adet("AK120")]).toEqual(["6", "8"]);
  });
  it("AC-13: Müşteri görünümü birleşen satırda iki kaynağın makinalarını birlikte gösterir", () => {
    ciz();
    fireEvent.click(within(within(kutu()).getByRole("group", { name: "Parça kırılımı görünümü" })).getByRole("button", { name: "Müşteri" }));
    const satirlar = within(kutu()).getAllByTestId("musteri-satiri").map(s => s.dataset.anahtar).sort();
    expect(satirlar).toEqual(["m:1", "m:2"]);
  });
});
