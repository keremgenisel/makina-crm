// @vitest-environment jsdom
// Spec 0150 AC-8, AC-19: altın `tests/fixtures/0150-once.json` spec ÖNCESİ koddan `YAZ_0150=1` ile, veri `0150-veri.js`.
// (a) "tam" senaryo (işlem kalemli katalog): bölümlerin malzeme ve hazır parça toplamları, tutarsız sayaçları ve "Bölüm toplamı"
// satırı spec öncesiyle aynı (AC-8; işlem tutarları bölüm toplamına girmez, X3). (b) yalnız tedarikçisiz işlem kalemi taşıyan
// katalogda iki nüshanın belge HTML'i birebir aynı (AC-19 b; R6: tedarikçisiz işlem basılmaz). İşlem kalemsiz veride birebir
// aynılık (AC-19 a) var olan 0140, 0142, 0144, 0147 kıyaslarıyla ölçülür (yalnız `0150-ayikla.js`).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import * as S from "../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml as _siparisRaporuHtml } from "../src/lib/siparisRaporu";
import { sayfaStiliniAyikla } from "./fixtures/sayfa-stil-ayikla";
const siparisRaporuHtml = (...a) => sayfaStiliniAyikla(_siparisRaporuHtml(...a)); // 2026-11-25: @page satırı ayıklanır
import { veri, islemsiz, PARCALAR } from "./fixtures/0150-veri.js";
import { ayiklaBelge0158 } from "./fixtures/0158-ayikla.js"; // spec 0158 ile (C9/3, P10)
import { ayiklaAd0159, ayiklaBelge0159 } from "./fixtures/0159-ayikla.js"; // spec 0159 ile (R6/2, R6/3, P3, P4)

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
// Spec 0159 ile (R6/2, R6/3, P3, P4): maliyeti yalnız alım ve işlem kalemlerinden gelen parçanın hazır satırı artık tutar taşımaz
// (bedel bir kez sayılır). Bu verideki bilinçli fark yalnız o satırları taşıyan bölümlerdedir; ölçülür, listelenir ve karşılaştırmadan
// düşülür. Etkilenmeyen bölümler birebir; etkilenenlerin yeni değeri ayrıca iddia edilir.
const r62 = (r) => r.tedarikciBolumleri.belge.filter(b => b.satirlar.some(x => x.bedelKalemde));
const r62Adlari = (r) => [...new Set(r62(r).flatMap(b => b.satirlar.filter(x => x.bedelKalemde).map(x => x.ad)))];

describe("Spec 0150 kıyas", () => {
  it("AC-8: işlem kalemli katalogda bölümlerin toplamı, tutarsız sayacı ve 'Bölüm toplamı' satırı spec öncesiyle aynı", () => {
    const s = uret();
    if (process.env.YAZ_0150 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(s, null, 1) + "\n"); return; }
    const a = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    expect(Object.keys(a.bolumler).length).toBeGreaterThan(1);
    const etkilenen = r62(S.siparisIhtiyaci(veri(), { tedarikciOdakli: true }));
    expect(etkilenen.map(b => b.ad)).toEqual(["Hazırcı"]); // spec 0159 P4: ölçülen tek bilinçli fark
    const dus = (o) => Object.fromEntries(Object.entries(o).filter(([ad]) => !etkilenen.some(b => b.ad === ad)));
    expect(dus(s.bolumler)).toEqual(dus(a.bolumler));
    expect(Object.keys(dus(a.bolumler)).length).toBeGreaterThan(0);
    // Etkilenen bölümde hazır parça tutarı kalmadı (bedeli kalemlerde ya da maliyeti girilmemiş): toplam yok; tutarsız sayacı aynı.
    expect(s.bolumler.Hazırcı.toplamlar).toEqual([]); expect(s.bolumler.Hazırcı.tutarsizSayi).toBe(a.bolumler.Hazırcı.tutarsizSayi);
  });
  it("AC-19 (b): yalnız tedarikçisiz işlem kalemi taşıyan veride iki nüshanın belgesi spec öncesiyle birebir", () => {
    const s = uret();
    if (process.env.YAZ_0150 === "1") return;
    const a = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    // Spec 0159 ile: adlar iki taraftan eski biçime, fiyatlı nüshada R6/2'nin bölümleri karşılaştırmadan düşer (P3, P4).
    const adlar = r62Adlari(S.siparisIhtiyaci(tedarikcisizVeri(), { tedarikciOdakli: true }));
    expect(ayiklaAd0159(ayiklaBelge0158(s.tedarikcisiz.fiyatsiz))).toBe(ayiklaAd0159(a.tedarikcisiz.fiyatsiz));
    expect(ayiklaBelge0159(ayiklaBelge0158(s.tedarikcisiz.fiyatli), adlar)).toBe(ayiklaBelge0159(a.tedarikcisiz.fiyatli, adlar));
    expect(a.tedarikcisiz.fiyatsiz).toContain("Tedarikçisiz işlemli"); // boş geçmez
  });
});
