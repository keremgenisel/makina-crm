// Spec 0152 AC-24, AC-11, AC-17, C2: döviz hareketi olmayan veride kasa ve gider tarafının bütün çıktıları spec öncesiyle
// birebir. Altın `tests/fixtures/0152-once.json` spec ÖNCESİ koddan `YAZ_0152=1` ile; veri `0059-veri.js` (çok hesaplı, EUR ve
// USD, hesapsız ödeme ve avans, ciro, çek). Kayıt gövdesinin kıyası (AC-26) `scripts/tests/db-roundtrip.cjs`'te.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect } from "vitest";
import { ayiklaEkstre0156 } from "./fixtures/0156-ayikla.js";
import fs from "node:fs";
import * as K from "../src/lib/kasa";
import { hareketCopEtiketi } from "../src/lib/copKutusu";
import { giderKasaRaporu, buildGiderKasaRaporuHtml } from "../src/lib/giderRaporu";
import { odemeleriUygula, borcOzeti } from "../src/lib/gider";
import { acikKalemler } from "../src/lib/acikKalemler";
import { yontemKirilimlari } from "../src/lib/odemeYontemi";
import { odemeGirisiHazirla, hepsiniOde, formOdemeHedefleri } from "../src/lib/formOdemesi";
import { girdi, H, HESAPLAR, PAYMENTS, SERVICES, PART_SALES, CEKLER, GIDERLER, K1, turler, turMap, tedarikciler } from "./fixtures/0059-veri";

const DOSYA = "tests/fixtures/0152-once.json";
const veri = { payments: PAYMENTS, services: SERVICES, partSales: PART_SALES, yedekParcaSatislar: [], customers: [{ id: 1, name: "Kutu Gıda" }], dealers: [],
  factory: { name: "Altuntaş Makina" }, cekler: CEKLER, bugun: "2026-09-30" };
const bakiyeOzeti = (m) => [...m.values()].map(x => ({ id: x.hesap.id, girenK: x.girenK, cikanK: x.cikanK, bakiyeK: x.bakiyeK, borc: x.borc,
  satirlar: x.satirlar.map(s => [s.tarih, s.tur, s.girenK, s.cikanK, s.bakiyeK]) }));
const json = (x) => JSON.parse(JSON.stringify(x));
const uret = () => {
  const zengin = odemeleriUygula(GIDERLER, H, turMap);
  const k1 = zengin.find(k => k.id === 1);
  const k3 = zengin.find(k => k.id === 7); // açık kalem (3000 TL)
  const k5 = zengin.find(k => k.id === 5);
  const o = { giderler: GIDERLER, hareketler: H, turler, yururlukAy: "2026-01", bugun: "2026-09-30" };
  const hazirla = (kalem, satirlar) => json(odemeGirisiHazirla(kalem, { turMap, tarih: "2026-09-25", satirlar, hesaplar: HESAPLAR, hareketler: H, giderler: GIDERLER }));
  return {
    bakiyeler: bakiyeOzeti(K.hesapBakiyeleri(HESAPLAR, H, veri)),
    zengin: json(zengin),
    borc: json(borcOzeti(zengin, { turler, tedarikciler, yururlukAy: "2026-01" }, "2026-09-30")),
    acik: json(acikKalemler(zengin, { turler, tedarikciler, yururlukAy: "2026-01" }, "2026-09-30")),
    // Spec 0156 ile (C2/2): ekstrenin koşulsuz yeni alanları ayıklanır (tests/fixtures/0156-ayikla.js); altın yenilenmedi.
    ekstreT: json(ayiklaEkstre0156(K.tedarikciEkstresi(11, o))),
    ekstreC: json(ayiklaEkstre0156(K.calisanEkstresi(21, o))),
    yontem: json([...yontemKirilimlari(zengin, H, turMap).entries()]),
    tasima: HESAPLAR.map(h => { const p = K.hesapTasimaPlani(h, H, veri, HESAPLAR); return [h.id, p.detay, p.uygunHedefler.map(x => x.id), p.nedenler]; }),
    cop: H.map(m => [m.id, hareketCopEtiketi(m)]),
    odemeTl: json(K.odemeDogrula({ tarih: "2026-09-25", tutar: "500", yontem: "Havale", hesapId: 51 }, { kalem: k3, turMap, hesaplar: HESAPLAR })),
    odemeHesapsiz: json(K.odemeDogrula({ tarih: "2026-09-25", tutar: "500", yontem: "", hesapId: "" }, { kalem: k3, turMap, hesaplar: HESAPLAR })),
    odemeFazla: json(K.odemeDogrula({ tarih: "2026-09-25", tutar: "99999", hesapId: 51 }, { kalem: k3, turMap, hesaplar: HESAPLAR })),
    virmanTl: json(K.virmanDogrula({ hesapId: 51, karsiHesapId: 52, tarih: "2026-09-25", tutar: "1.000", aciklama: " x " }, HESAPLAR)),
    avans: json(K.avansDogrula({ calisanId: 21, tarih: "2026-09-25", tutar: "100", hesapId: 52 }, { calisanlar: [{ id: 21, ad: "A" }], hesaplar: HESAPLAR })),
    sonHesap: K.sonKullanilanHesap(H, HESAPLAR),
    hepsi: hepsiniOde([], formOdemeHedefleri(k3, turMap), { yontem: "Havale", hesapId: 51, yeniAnahtar: () => "a" }),
    hazirlaTl: hazirla(k3, [{ anahtar: "a", hedef: "ana", tutar: "1.000", yontem: "Havale", hesapId: 51 }, { anahtar: "b", hedef: "ana", tutar: "200", yontem: "Nakit", hesapId: 52 }]),
    hazirlaFazla: hazirla(k5, [{ anahtar: "a", hedef: "ana", tutar: "5.000", yontem: "Havale", hesapId: 51 }]),
    duzenle: json(odemeGirisiHazirla(k1, { turMap, kip: "duzenle", tarih: "2026-09-26", satirlar: [{ anahtar: "a", hedef: "ana", tutar: "11.000", yontem: "Nakit", hesapId: 52 }], hesaplar: HESAPLAR, hareketler: H, giderler: GIDERLER, duzenlenen: H[0] })),
    rapor: json(giderKasaRaporu(girdi(), "2026-09")),
    raporHtml: buildGiderKasaRaporuHtml(giderKasaRaporu(girdi(), "2026-09")),
    k1Id: K1.id,
  };
};

describe("Spec 0152 kıyas (döviz hareketsiz veri)", () => {
  it("AC-24 / AC-11 / AC-17: bakiye, borç, açık kalemler, ekstre, yöntem, taşıma, doğrulayıcılar ve rapor spec öncesi altınla birebir", () => {
    const s = uret();
    if (process.env.YAZ_0152 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(s, null, 1) + "\n"); return; }
    const a = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    for (const k of Object.keys(a)) expect(s[k], k).toEqual(a[k]);
    expect(Object.keys(s)).toEqual(Object.keys(a));
  });
});
