// Spec 0159 C7, C7/2, P3 (AC-16): aynı kalemlerle kurulmuş parçaların maliyeti, tarihli maliyeti, maliyet geçmişi (karar motoru ve
// liste satırları), kalem özeti ve sipariş motorunun çıktısı spec öncesiyle birebir; belge fiyatsız nüshada adlar ayıklanarak birebir,
// fiyatlı nüshada R6/2'den etkilenen bölümler dışında birebir. Altın `tests/fixtures/0159-once.json` spec ÖNCESİ koddan `YAZ_0159=1`
// ile; ayıklama `tests/fixtures/0159-ayikla.js`. R6/2'nin yeni değerleri `alim-kalemi-0159.test.js`'te ölçülür.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import * as U from "../src/lib/urunAgaci";
import { malzemeKatalogu } from "../src/lib/malzeme";
import { maliyetKalemleriOf } from "../src/lib/maliyetKalemleri";
import * as S from "../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml as _siparisRaporuHtml } from "../src/lib/siparisRaporu";
import { sayfaStiliniAyikla } from "./fixtures/sayfa-stil-ayikla";
const siparisRaporuHtml = (...a) => sayfaStiliniAyikla(_siparisRaporuHtml(...a)); // 2026-11-25: @page satırı ayıklanır
import { PARCALAR, MALZEMELER, BUGUN, FACTORY, R62_PARCALAR, veri } from "./fixtures/0159-veri.js";
import { cinsSirasiUygula } from "./fixtures/0161-ayikla.js";
import { ayiklaMotor0159, ayiklaBelge0159, ayiklaAd0159 } from "./fixtures/0159-ayikla.js";

const DOSYA = "tests/fixtures/0159-once.json";
const js = (x) => JSON.parse(JSON.stringify(x === undefined ? null : x));
const TARIHLER = [undefined, "2026-01-15", "2026-06-01", "2026-11-23"];

const uret = () => {
  const kat = U.setKatalogu(PARCALAR); const mk = malzemeKatalogu(MALZEMELER);
  const parca = PARCALAR.map(p => ({ id: p.id, kurus: TARIHLER.map(t => U.parcaMaliyetKurus(p, t, kat, mk)), metin: U.parcaMaliyetMetni(p, undefined, kat, mk),
    kalemler: maliyetKalemleriOf(p).length ? U.maliyetKalemleriOzeti(maliyetKalemleriOf(p), mk) : null, gecmis: U.maliyetGecmisiSatirlari(p) }));
  const g = PARCALAR.find(p => p.id === 52);
  const yeni = { ...g, maliyetKalemleri: [{ ...g.maliyetKalemleri[0], tutar: 30 }] };
  const gecmisKarari = [
    U.maliyetGecmisiYaz(g, U.parcaMaliyetKurus(yeni), { tarih: "2026-11-01", bugun: BUGUN, yeniKayit: yeni }),
    U.maliyetGecmisiYaz(g, U.parcaMaliyetKurus(g), { tarih: "2026-07-01", bugun: BUGUN, tarihElle: true, yeniKayit: g }),
  ];
  const s = S.siparisIhtiyaci(veri(), { tedarikciOdakli: true });
  const belge = { fiyatsiz: siparisRaporuHtml(s, { bugun: BUGUN, factory: FACTORY }), fiyatli: siparisRaporuHtml(s, { bugun: BUGUN, factory: FACTORY, fiyatli: true }) };
  return js({ parca, gecmisKarari, siparis: s, belge });
};
const R62_ADLARI = PARCALAR.filter(p => R62_PARCALAR.includes(p.id)).map(p => p.ad);

describe("Spec 0159 kıyas", () => {
  it("AC-16 / C7 / C7/2 / P3: maliyet, geçmiş ve kalem özeti birebir; sipariş ve belge R6/2'nin listeli farkı dışında birebir", () => {
    const s = uret();
    if (process.env.YAZ_0159 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(s) + "\n"); return; }
    const a = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    expect(s.parca).toEqual(a.parca);
    expect(s.gecmisKarari).toEqual(a.gecmisKarari);
    // Spec 0161 ile (P11, AC-34): bu veri 0157 üzerinden 0158'in dolu verisinden türer (cins dolu); pencerenin bilinçli sıra farkı eski
    // altına yeni kural uygulanarak ayıklanır, altın yenilenmedi.
    expect(ayiklaMotor0159(s.siparis, R62_PARCALAR)).toEqual(ayiklaMotor0159(cinsSirasiUygula(a.siparis), R62_PARCALAR));
    expect(ayiklaAd0159(s.belge.fiyatsiz)).toBe(ayiklaAd0159(a.belge.fiyatsiz));
    expect(ayiklaBelge0159(s.belge.fiyatli, R62_ADLARI)).toBe(ayiklaBelge0159(a.belge.fiyatli, R62_ADLARI));
    // Ayıklama boş değil: fiyatlı belgede en az bir bölüm karşılaştırılıyor ve etkilenen parçalar gerçekten var.
    expect(R62_PARCALAR.length).toBeGreaterThan(0);
    // Triyaj (bulgu 2): etkilenen bölüm de karşılaştırılır; yalnız etkilenen satırların tutar hücresi ve iki toplam satırı nötrlenir,
    // aynı bölümdeki etkilenmeyen parçaların (Cıvata M8, İthal rulman…) tutar hücreleri birebir.
    const ay = ayiklaBelge0159(s.belge.fiyatli, R62_ADLARI);
    const aksu = ay.split('<div class="siparis-bolum"').find(b => b.includes("Aksu CNC · "));
    expect(aksu).toBeTruthy();
    expect((aksu.match(/§tutar/g) || []).length).toBe(PARCALAR.filter(p => R62_PARCALAR.includes(p.id) && aksu.split("data-islemler")[0].includes(`>${p.ad}`)).length);
    expect(aksu).toContain("§bolum-toplami"); expect(aksu).toContain("§genel-toplam");
    for (const ad of ["Cıvata M8", "İthal rulman", "Rulman"]) expect(aksu, ad).toMatch(new RegExp(`>${ad}<[\\s\\S]*?(₺|\\$)`));
  });
});
