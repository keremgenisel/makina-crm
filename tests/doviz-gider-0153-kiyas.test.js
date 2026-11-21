// Spec 0153 AC-32, C7: döviz alanı taşımayan (TL) kalemlerden oluşan veride gider ve kasa tarafının bütün çıktıları spec
// öncesiyle birebir. Altın `tests/fixtures/0153-once.json` spec ÖNCESİ koddan `YAZ_0153=1` ile; veri `0059-veri.js`.
// Kayıt gövdesinin kıyası (AC-33) `scripts/tests/db-roundtrip.cjs`'te.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import * as K from "../src/lib/kasa";
import { giderKasaRaporu, buildGiderKasaRaporuHtml } from "../src/lib/giderRaporu";
import { odemeleriUygula, borcOzeti, giderKalemDogrula, hesaplaGiderRaporu } from "../src/lib/gider";
import { acikKalemler } from "../src/lib/acikKalemler";
import { odemeHatirlatmalari } from "../src/lib/odemeHatirlatma";
import { aramaSorgusu, kalemEslesmesi, kalemMeta } from "../src/lib/aramaGider";
import { ciroAdaylari } from "../src/lib/cek";
import { odemeGirisiHazirla, hepsiniOde, formOdemeHedefleri } from "../src/lib/formOdemesi";
import { girdi, H, HESAPLAR, GIDERLER, turler, turMap, tedarikciler } from "./fixtures/0059-veri";

const DOSYA = "tests/fixtures/0153-once.json";
const json = (x) => JSON.parse(JSON.stringify(x));
const FORMLAR = [
  { id: 901, tarih: "2026-09-05", turId: 1, tutar: "12.000", kdvOrani: 20, tedarikciId: 11, aciklama: "Normal" },
  { id: 902, tarih: "2026-09-05", turId: 1, tutar: "12.000", kdvOrani: 20, kdvYonu: "dahil", tedarikciId: 11, aciklama: "Dâhil" },
  { id: 903, tarih: "2026-09-05", turId: 1, tutar: "1.000", kdvOrani: 20, tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10, tedarikciId: 11 },
  { id: 904, tarih: "2026-09-05", turId: 1, tutar: "3.000", kdvOrani: 20, taksitSayisi: 3, ilkVade: "2026-10-01", tedarikciId: 11 },
  { id: 905, tarih: "2026-09-05", turId: 1, tutar: "1.000", kdvOrani: 20, kisitliGider: true, indirilebilirOran: 70 },
  { id: 906, tarih: "2026-09-05", turId: 1, tutar: "", kdvOrani: 20, tanimId: 3 },
  { id: 907, tarih: "2026-09-05", turId: 2, girisYonu: "brut", tutar: "10.000", stopajOrani: 20, kdvOrani: 0 },
];
const uret = () => {
  const zengin = odemeleriUygula(GIDERLER, H, turMap);
  const k3 = zengin.find(k => k.id === 7);
  const o = { turler, tedarikciler, yururlukAy: "2026-01" };
  const sorgu = (q) => { const s = aramaSorgusu(q); const tedMap = new Map(tedarikciler.map(t => [String(t.id), t])); return zengin.map(k => [k.id, kalemEslesmesi(k, s, { turMap, tedMap, yururlukAy: "2026-01" }), kalemMeta(k, { turMap, tedMap })]); };
  return {
    formlar: json(FORMLAR.map(f => giderKalemDogrula(f, { turMap, tedarikciler, uid: (() => { let n = 5000; return () => ++n; })() }))),
    borc: json(borcOzeti(zengin, o, "2026-09-30")),
    acik: json(acikKalemler(zengin, o, "2026-09-30")),
    hatirlatma: json(odemeHatirlatmalari(zengin, o, "2026-09-30")),
    ekstre: json(K.tedarikciEkstresi(11, { giderler: GIDERLER, hareketler: H, turler, yururlukAy: "2026-01", bugun: "2026-09-30" })),
    rapor: json(hesaplaGiderRaporu({ giderler: zengin, turler, tedarikciler, yururlukAy: "2026-01" }, { baslangic: "2026-09-01", bitis: "2026-09-30" }, { bugun: "2026-09-30" })),
    arama: json([sorgu("3.000"), sorgu("Vida"), sorgu("12.000")]),
    ciro: json(ciroAdaylari(zengin, { tur: "tedarikci", id: 13 }, turMap)),
    cokKalem: json(K.cokKalemOdemeleri({ satirlar: [{ anahtar: "a", tutarK: 100000 }], adaylar: [{ anahtar: "a", kalem: k3, taksitId: null }], tarih: "2026-09-25", hesapId: 51, hesaplar: HESAPLAR, yontem: "Havale", aciklama: "x", turMap })),
    odeme: json([K.odemeDogrula({ tarih: "2026-09-25", tutar: "500", yontem: "Havale", hesapId: 51 }, { kalem: k3, turMap, hesaplar: HESAPLAR }),
      K.odemeDogrula({ tarih: "2026-09-25", tutar: "500", hesapId: 53, kur: "40" }, { kalem: k3, turMap, hesaplar: HESAPLAR }),
      K.cokluOdemeDogrula({ tarih: "2026-09-25", satirlar: [{ tutar: "1.000", hesapId: 51 }, { tutar: "2.000", hesapId: "" }] }, { kalem: k3, turMap, hesaplar: HESAPLAR })]),
    sonHesap: K.sonKullanilanHesap(H, HESAPLAR),
    hedefler: json(zengin.map(k => formOdemeHedefleri(k, turMap))),
    hepsi: json(hepsiniOde([], formOdemeHedefleri(k3, turMap), { yontem: "Havale", hesapId: 53, yeniAnahtar: () => "a", hesaplar: HESAPLAR, kurOner: () => ({ deger: 40 }) })),
    hazirla: json(odemeGirisiHazirla(k3, { turMap, tarih: "2026-09-25", satirlar: [{ anahtar: "a", hedef: "ana", tutar: "1.000", yontem: "Havale", hesapId: 51 }], hesaplar: HESAPLAR, hareketler: H, giderler: GIDERLER })),
    raporHtml: buildGiderKasaRaporuHtml(giderKasaRaporu(girdi(), "2026-09")),
  };
};

describe("Spec 0153 kıyas (TL kalemler)", () => {
  it("AC-32 / C7: doğrulayıcı gövdeleri, borç, açık kalemler, hatırlatıcı, ekstre, rapor, arama, çek, ödeme ve toplu işaretleme spec öncesi altınla birebir", () => {
    const s = uret();
    if (process.env.YAZ_0153 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(s, null, 1) + "\n"); return; }
    const a = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    for (const k of Object.keys(a)) expect(s[k], k).toEqual(a[k]);
    expect(Object.keys(s)).toEqual(Object.keys(a));
  });
});
