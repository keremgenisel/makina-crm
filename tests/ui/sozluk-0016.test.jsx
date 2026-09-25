// @vitest-environment jsdom
// Spec 0016 sözlük ekleri (plan G1, G4): BosDurum'un açıklama satırı isteğe bağlı; UyariSeridi'nin hata ailesi.
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { BosDurum, UyariSeridi } from "../../src/components/tasarim";

afterEach(cleanup);

// Değişiklikten önceki çıktı (Giderler bugün hep açıklamayla çağırıyor; görünümü değişmemeli).
const ONCE = '<div style="border:1.5px dashed var(--n300, #cbd5e1);border-radius:12px;padding:32px 20px;text-align:center;background:var(--surface, #ffffff)">'
  + '<div style="font-size:16px;font-weight:800;margin-bottom:6px">Kayıt yok</div>'
  + '<div style="font-size:13px;color:var(--n600, #475569);max-width:460px;margin:0 auto;line-height:1.55">Açıklama</div></div>';

describe("BosDurum (spec 0016 G1)", () => {
  it("açıklamalı çıktı değişiklik öncesiyle birebir aynı", () => {
    expect(renderToStaticMarkup(<BosDurum baslik="Kayıt yok" metin="Açıklama" />)).toBe(ONCE);
  });
  it("açıklama yoksa açıklama satırı ve başlık alt boşluğu çizilmez", () => {
    const html = renderToStaticMarkup(<BosDurum baslik="Kayıt yok" />);
    expect(html).toBe('<div style="border:1.5px dashed var(--n300, #cbd5e1);border-radius:12px;padding:32px 20px;text-align:center;background:var(--surface, #ffffff)">'
      + '<div style="font-size:16px;font-weight:800;margin-bottom:0">Kayıt yok</div></div>');
  });
  it("AC-4: eylem verilmezse kutuda düğme yok", () => {
    render(<BosDurum baslik="Kayıt yok" testId="b" />);
    expect(screen.getByTestId("b").querySelectorAll("button").length).toBe(0);
  });
});

describe("UyariSeridi hata ailesi (spec 0016 G4)", () => {
  it("kırmızı tema değişkenleriyle çizilir, role=status taşır", () => {
    render(<UyariSeridi aile="hata" baslik="3 parça tükendi" testId="h" />);
    const s = screen.getByTestId("h");
    expect(s.getAttribute("role")).toBe("status");
    expect(s.style.background).toBe("var(--redBg, #fef2f2)");
    expect(s.style.border).toBe("1px solid var(--redBr, #fecaca)");
    expect(screen.getByText("3 parça tükendi").style.color).toBe("var(--red700, #b91c1c)");
  });
  it("serbest içerikte metin rengi ailenin 800 tonu", () => {
    render(<UyariSeridi aile="hata" testId="h2">Borç <b>var</b></UyariSeridi>);
    expect(screen.getByTestId("h2").style.color).toBe("var(--red800, #991b1b)");
  });
});
