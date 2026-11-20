// Spec 0151 AC-22, AC-24, AC-46 (C4/2): düzeltme hareketi olmayan veride kasa motoru, rapor ve yardımcılar spec öncesiyle
// birebir. Altın `tests/fixtures/0151-once.json` spec ÖNCESİ koddan `YAZ_0151=1` ile; veri `0059-veri.js` (çok hesaplı, EUR ve
// USD, hesapsız ödeme ve avans, ciro, çek). Ekranın kıyası `ui/kasa-duzeltme-0151` içindeki AC-22 testinde.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import * as K from "../src/lib/kasa";
import { hareketCopEtiketi } from "../src/lib/copKutusu";
import { kasaHareketiMi } from "../src/lib/yedekKasa";
import { giderKasaRaporu, buildGiderKasaRaporuHtml } from "../src/lib/giderRaporu";
import { girdi, H, HESAPLAR, PAYMENTS, SERVICES, PART_SALES, CEKLER } from "./fixtures/0059-veri";

const DOSYA = "tests/fixtures/0151-once.json";
const veri = { payments: PAYMENTS, services: SERVICES, partSales: PART_SALES, yedekParcaSatislar: [], customers: [{ id: 1, name: "Kutu Gıda" }], dealers: [],
  factory: { name: "Altuntaş Makina" }, cekler: CEKLER, bugun: "2026-09-30" };
const bakiyeOzeti = (m) => [...m.values()].map(x => ({ id: x.hesap.id, acilisK: x.acilisK, girenK: x.girenK, cikanK: x.cikanK, bakiyeK: x.bakiyeK, borc: x.borc,
  satirlar: x.satirlar.map(s => [s.tarih, s.tur, s.girenK, s.cikanK, s.bakiyeK]), aralik: x.aralik ? { ...x.aralik, satirlar: x.aralik.satirlar.length } : null }));
const uret = () => {
  const aralik = { baslangic: "2026-09-01", bitis: "2026-09-30" };
  const b = K.hesapBakiyeleri(HESAPLAR, H, veri, { aralik });
  const ozetL = K.hareketOzeti(H, aralik, b, { liste: true });
  return {
    bakiyeler: bakiyeOzeti(K.hesapBakiyeleri(HESAPLAR, H, veri)),
    aralikli: bakiyeOzeti(b),
    hareketOzeti: K.hareketOzeti(H, aralik, b),
    hareketOzetiListe: JSON.parse(JSON.stringify(ozetL)),
    hesapsizParametresiz: K.hesapsizOdemeler(H),
    hesapsizHesapli: K.hesapsizOdemeler(H, { baslangic: "", tarihsizDahil: true }, null, HESAPLAR.filter(h => h.id !== 52)),
    hesapsizOzeti: JSON.parse(JSON.stringify(K.hesapsizOzeti(H, veri, HESAPLAR, "2026-09-10", []))),
    kullanim: HESAPLAR.map(h => [h.id, K.hesapKullanimi(h.id, H, veri), K.hesapKullanimDetayi(h.id, H, veri)]),
    tasima: HESAPLAR.map(h => { const p = K.hesapTasimaPlani(h, H, veri, HESAPLAR); return [h.id, p.detay, p.uygunHedefler.map(x => x.id), p.nedenler]; }),
    durum: H.map(m => [m.id, K.hareketDuzenlemeDurumu(m)]),
    cop: H.map(m => [m.id, hareketCopEtiketi(m)]),
    yedek: H.map(m => [m.id, kasaHareketiMi(m)]),
    rapor: JSON.parse(JSON.stringify(giderKasaRaporu(girdi(), "2026-09"))),
    raporHtml: buildGiderKasaRaporuHtml(giderKasaRaporu(girdi(), "2026-09")),
  };
};

describe("Spec 0151 kıyas (düzeltmesiz veri)", () => {
  it("AC-22 / AC-46: kasa motoru, rapor, çöp etiketi ve yedek yardımcısı spec öncesi altınla birebir", () => {
    const s = uret();
    if (process.env.YAZ_0151 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(s, null, 1) + "\n"); return; }
    const a = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    for (const k of Object.keys(a)) expect(s[k], k).toEqual(a[k]);
    expect(Object.keys(s)).toEqual(Object.keys(a));
  });
});
