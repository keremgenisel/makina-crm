// @vitest-environment jsdom
// Spec 0015 R4 / plan F4, AC-6: kartsız bölüm başlığı BolumBasligi. KartBolum'un etiket başlığı artık onunla çizilir
// (tek tanım); KartBolum'un çıktısı değişiklik öncesi HTML'le birebir aynı kalmalı. Beklenen HTML değişiklikten ÖNCE
// bugünkü koddan alındı.
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { KartBolum, BolumBasligi } from "../../src/components/tasarim";

const KAP = '<div style="background:var(--surface, #ffffff);border:1px solid var(--n200, #e2e8f0);border-radius:12px;padding:18px">';
const BASLIK = (mb) => `<div style="font-size:12px;font-weight:800;color:var(--n400, #94a3b8);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:${mb}px">Başlık</div>`;

describe("BolumBasligi", () => {
  it("AC-6: KartBolum'un etiket başlıklı çıktısı değişiklik öncesiyle birebir aynı", () => {
    expect(renderToStaticMarkup(<KartBolum varyant="kart" title="Başlık">i</KartBolum>)).toBe(`${KAP}${BASLIK(14)}i</div>`);
    expect(renderToStaticMarkup(<KartBolum varyant="kart" title="Başlık" baslikBosluk={8}>i</KartBolum>)).toBe(`${KAP}${BASLIK(8)}i</div>`);
  });
  it("AC-6: BolumBasligi kartsızdır: yalnız başlık öğesi, kenarlık, zemin ve dolgu yok", () => {
    const html = renderToStaticMarkup(<BolumBasligi>Başlık</BolumBasligi>);
    expect(html).toBe(BASLIK(14));
    expect(html).not.toMatch(/border|background|padding/);
  });
  it("BolumBasligi üst ve alt boşluk alır", () => {
    const html = renderToStaticMarkup(<BolumBasligi ust={28} bosluk={0}>Başlık</BolumBasligi>);
    expect(html).toContain("margin-top:28px");
    expect(html).toContain("margin-bottom:0");
  });
});
