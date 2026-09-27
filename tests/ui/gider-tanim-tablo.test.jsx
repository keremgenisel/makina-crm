// @vitest-environment jsdom
// Spec 0030 AC-15 / AC-22 (R10): Tekrarlayan Giderler tablosu sığdırılırken hiçbir bilgi kaybolmaz. Tanım, tür, tedarikçi,
// tutar, başlangıç, bitiş, atama ve üretilen aylar ya doğrudan ya da ipucunda erişilebilir; "üretilen aylar" sayıya iner.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { SettingsGiderTanimlari } from "../../src/components/settings/SettingsGiderTanimlari";
import { TANIM_UZUN, TANIM_TURLERI, TANIM_TEDARIKCI, TANIM_CALISAN } from "../../scripts/tests/layout/gider-tanim-veri.js";

afterEach(cleanup);
const ciz = () => render(<SettingsGiderTanimlari giderTanimlari={TANIM_UZUN} setGiderTanimlari={vi.fn()} giderTurleri={TANIM_TURLERI}
  tedarikciler={TANIM_TEDARIKCI} calisanlar={TANIM_CALISAN} showToast={vi.fn()} giderAyarlari={{ yururlukAy: "2025-06" }} />);
const satir = (ad) => screen.getByText(ad).closest("tr");

describe("Tekrarlayan giderler tablosu: bilgi kaybı yok", () => {
  it("AC-15: sütun başlıkları; başlangıç ve bitiş birleşik sütunda", () => {
    ciz();
    const b = [...document.querySelectorAll("thead th")].map(th => th.textContent.trim());
    expect(b).toEqual(["Tanım", "Tür", "Tedarikçi", "Tutar", "Başlangıç – Bitiş", "Atama", "Üretilen aylar", ""]);
  });
  it("AC-15: her satırda tanım, tür, tedarikçi, tutar, başlangıç, bitiş ve atama doğrudan görünür", () => {
    ciz();
    const kira = within(satir("Fabrika binası kirası (Organize Sanayi Bölgesi)"));
    expect(kira.getByText("Fabrika kirası")).toBeTruthy();
    expect(kira.getByText("Yıldız Gayrimenkul Yatırım A.Ş.")).toBeTruthy();
    expect(kira.getByText("125.000 ₺")).toBeTruthy();
    expect(kira.getByText(/2025-06/)).toBeTruthy();
    expect(kira.getByText(/– 2027-05/)).toBeTruthy();
    expect(kira.getByText("Ortak")).toBeTruthy();
    const model = within(satir("Sac levha tedarik sözleşmesi"));
    expect(model.getByText("AK120_DSC")).toBeTruthy();
    expect(model.getByText(/– —/)).toBeTruthy(); // bitişsiz tanım
  });
  it("AC-22: üretilen aylar sayı olarak görünür, tam liste ipucunda; hiç üretilmemişse bugünkü metin", () => {
    ciz();
    const kira = within(satir("Fabrika binası kirası (Organize Sanayi Bölgesi)")).getByText("14 ay");
    const liste = kira.getAttribute("title").split(", ");
    expect(liste).toHaveLength(14);
    expect(liste[0]).toBe("2025-06");
    expect(liste[13]).toBe("2026-07");
    expect(within(satir("Elektrik (fabrika)")).getByText("Henüz üretilmedi")).toBeTruthy();
  });
});
