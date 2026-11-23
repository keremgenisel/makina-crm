// Spec 0155 AC-43, AC-44, C8 (AC-31–AC-33, AC-35): tedarikçi avansı OLMAYAN veride bakiyeler, borç özeti, iki ekstre,
// hatırlatıcı, açık kalemler, hesapsız listeler, hareket özeti, çalışan açık avansı, hesap taşıma, çöp etiketleri ve aylık
// gider ve kasa raporu spec öncesi altınla birebir. Altın `tests/fixtures/0155-once.json` spec ÖNCESİ koddan `YAZ_0155=1` ile.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import * as K from "../src/lib/kasa";
import { borcOzeti } from "../src/lib/gider";
import { odemeHatirlatmalari } from "../src/lib/odemeHatirlatma";
import { acikKalemler } from "../src/lib/acikKalemler";
import { hareketCopEtiketi } from "../src/lib/copKutusu";
import { giderKasaRaporu, buildGiderKasaRaporuHtml } from "../src/lib/giderRaporu";
import { HAREKETLER, HESAPLAR, GIDERLER, ZENGIN, AYAR, BUGUN, VERI, turler, girdi } from "./fixtures/0155-veri.js";

const DOSYA = "tests/fixtures/0155-once.json";
const js = (x) => JSON.parse(JSON.stringify(x, (k, v) => (v instanceof Map ? Object.fromEntries(v) : v)));
const uret = () => {
  const ek = { giderler: ZENGIN, hareketler: HAREKETLER, turler, yururlukAy: "2026-01", bugun: BUGUN };
  const r = giderKasaRaporu(girdi(), "2026-09");
  return js({
    bakiye: K.hesapBakiyeleri(HESAPLAR, HAREKETLER, VERI),
    bakiyeAralik: K.hesapBakiyeleri(HESAPLAR, HAREKETLER, VERI, { aralik: { baslangic: "2026-09-01", bitis: "2026-09-30" } }),
    borc: borcOzeti(ZENGIN, AYAR, BUGUN),
    ekstreT: K.tedarikciEkstresi(11, ek), ekstreC: K.calisanEkstresi(21, ek),
    hatirlatma: odemeHatirlatmalari(ZENGIN, { ...AYAR, esikGun: 7 }, BUGUN),
    acik: acikKalemler(ZENGIN, AYAR, BUGUN),
    hesapsiz: K.hesapsizOdemeler(HAREKETLER, { baslangic: "2026-01-01", bitis: "2026-12-31" }, null, HESAPLAR),
    hesapsizOzet: K.hesapsizOzeti(HAREKETLER, VERI, HESAPLAR, null, []),
    ozet: K.hareketOzeti(HAREKETLER, { baslangic: "2026-09-01", bitis: "2026-09-30" }, null, { liste: true }),
    avansBorclari: K.avansBorclari(HAREKETLER, GIDERLER),
    tasima: HESAPLAR.map(h => K.hesapTasimaPlani(h, HAREKETLER, VERI, HESAPLAR).nedenler),
    cop: HAREKETLER.map(h => hareketCopEtiketi(h)),
    rapor: r, html: buildGiderKasaRaporuHtml(r),
  });
};

describe("Spec 0155 kıyas (tedarikçi avansı olmayan veri)", () => {
  it("AC-43 / AC-44 / C8: bütün çıktılar spec öncesi altınla birebir", () => {
    const s = uret();
    if (process.env.YAZ_0155 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(s) + "\n"); return; }
    const a = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    for (const k of Object.keys(a)) expect(s[k], k).toEqual(a[k]);
    expect(Object.keys(s)).toEqual(Object.keys(a));
    // Altın boş değil: çalışan avansı, mahsup, hesapsız avans ve döviz ödeme veride.
    expect(a.ekstreC.satirlar.map(x => x.tur)).toEqual(expect.arrayContaining(["maas", "avans", "mahsup"]));
    expect(a.html).toContain("AÇIK ÇALIŞAN AVANSI");
  });
});
