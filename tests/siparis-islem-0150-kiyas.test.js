// @vitest-environment jsdom
// Spec 0150 AC-8, AC-19: altın `tests/fixtures/0150-once.json` spec ÖNCESİ koddan `YAZ_0150=1` ile, veri `0150-veri.js`.
// (a) "tam" senaryo (işlem kalemli katalog): bölümlerin malzeme ve hazır parça toplamları, tutarsız sayaçları ve "Bölüm toplamı"
// satırı spec öncesiyle aynı (AC-8; işlem tutarları bölüm toplamına girmez, X3). (b) yalnız tedarikçisiz işlem kalemi taşıyan
// katalogda iki nüshanın belge HTML'i birebir aynı (AC-19 b; R6: tedarikçisiz işlem basılmaz). İşlem kalemsiz veride birebir
// aynılık (AC-19 a) var olan 0140, 0142, 0144, 0147 kıyaslarıyla ölçülür (yalnız `0150-ayikla.js`).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import * as S from "../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml } from "../src/lib/siparisRaporu";
import { veri, islemsiz, PARCALAR } from "./fixtures/0150-veri.js";

const DOSYA = "tests/fixtures/0150-once.json";
const html = (r, fiyatli) => siparisRaporuHtml(r, { bugun: "2026-11-20", factory: { name: "Altuntaş" }, partiAd: "Güz", fiyatli });
const toplamSatiri = (h, ad) => [...new DOMParser().parseFromString(h, "text/html").querySelectorAll(".siparis-bolum")]
  .find(e => e.textContent.includes(`${ad} · `))?.querySelector("[data-bolum-toplami]")?.outerHTML ?? null;
const tedarikcisizVeri = () => veri({ parts: PARCALAR.filter(p => !p.deletedAt).map(p => (p.id === 4 ? p : islemsiz([p])[0])), hamParts: PARCALAR.map(p => (p.id === 4 ? p : islemsiz([p])[0])) });
const uret = () => {
  const tam = S.siparisIhtiyaci(veri(), { tedarikciOdakli: true });
  const fli = html(tam, true);
  const bolumler = Object.fromEntries(tam.tedarikciBolumleri.belge.filter(b => b.satirlar.length).map(b => [b.ad,
    { toplamlar: b.toplamlar, toplamTLK: b.toplamTLK, tutarsizSayi: b.tutarsizSayi, toplamSatiri: toplamSatiri(fli, b.ad) }]));
  const ted = S.siparisIhtiyaci(tedarikcisizVeri(), { tedarikciOdakli: true });
  return { bolumler, tedarikcisiz: { fiyatsiz: html(ted, false), fiyatli: html(ted, true) } };
};

describe("Spec 0150 kıyas", () => {
  it("AC-8: işlem kalemli katalogda bölümlerin toplamı, tutarsız sayacı ve 'Bölüm toplamı' satırı spec öncesiyle aynı", () => {
    const s = uret();
    if (process.env.YAZ_0150 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(s, null, 1) + "\n"); return; }
    const a = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    expect(Object.keys(a.bolumler).length).toBeGreaterThan(1);
    expect(s.bolumler).toEqual(a.bolumler);
  });
  it("AC-19 (b): yalnız tedarikçisiz işlem kalemi taşıyan veride iki nüshanın belgesi spec öncesiyle birebir", () => {
    const s = uret();
    if (process.env.YAZ_0150 === "1") return;
    const a = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    expect(s.tedarikcisiz.fiyatsiz).toBe(a.tedarikcisiz.fiyatsiz);
    expect(s.tedarikcisiz.fiyatli).toBe(a.tedarikcisiz.fiyatli);
    expect(a.tedarikcisiz.fiyatsiz).toContain("Tedarikçisiz işlemli"); // boş geçmez
  });
});
