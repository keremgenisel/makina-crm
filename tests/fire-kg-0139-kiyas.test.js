// Spec 0139 C1 (AC-1, AC-18, AC-50): kilogram fire tablosu olmayan veride parça maliyeti, satış fiyatı, model maliyetleri, parti
// hesabı, sipariş ihtiyacı ve Excel dışa aktarması spec öncesiyle birebir. Altın YAZ_0139=1 ile spec ÖNCESİ koddan üretildi.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { malzemeOzeti, malzemeKatalogu } from "../src/lib/malzeme";
import { parcaMaliyetKurus, setKatalogu } from "../src/lib/urunAgaci";
import { parcaDisaAktarmaSatiri } from "../src/lib/parcaAktarma";
import { parcaSatisFiyati, fiyatBaglamiKur } from "../src/lib/parcaFiyati";
import { modelMaliyetleri, partiHesabi } from "../src/lib/makinaStandartMaliyet";
import { siparisIhtiyaci } from "../src/lib/siparisIhtiyaci";
import { ayikla0139 as ayikla } from "./fixtures/0139-ayikla.js";
import { ayikla0141 } from "./fixtures/0141-ayikla.js"; // spec 0141 ile: sipariş satırının `pay` anahtarı ve kayıt gövdesinin katlaması
import { ayikla0142 } from "./fixtures/0142-ayikla.js"; // spec 0142 ile: parça satırının `olculer` alanı ve tedarikçi bölümlerinin `belge` alanı
import { ayikla0143 } from "./fixtures/0143-ayikla.js"; // spec 0143 ile (C2/3): kalkan ve adı değişen alanlar normalleşir, sayılar dokunulmaz
import { MALZEMELER, TABLOLU_MALZEMELER, PARCALAR, MODELLER, TARIHLER, FIYAT_AYARLARI } from "./fixtures/0139-veri";
const ayikla0142v0143 = (x) => ayikla0143(ayikla0142(x));

const DOSYA = "tests/fixtures/0139-once.json";
const siparis = (malzemeler) => siparisIhtiyaci({ modeller: MODELLER.standardModels, satirlar: [{ model: "AK100_DS", adet: "70" }],
  parts: PARCALAR, partStock: [], malzemeler, tedarikciler: [] });
const ciktilar = (malzemeler) => {
  const mk = malzemeKatalogu(malzemeler);
  const kat = setKatalogu(PARCALAR);
  const baglam = fiyatBaglamiKur({ parts: PARCALAR, malzemeler, fiyatAyarlari: FIYAT_AYARLARI });
  const parti = { id: 1, ad: "P1", baslangicAy: "2026-01", bitisAy: null, planlananAdetler: { AK100_DS: 10 } };
  const mm = modelMaliyetleri({ ...MODELLER, parts: PARCALAR, malzemeler }, 12345);
  // Makina partisi: bir stok makinası (üretim tarihli) türetilen satır üretir, planlanan adet açık partide bugünkü maliyetle.
  const stock = [{ id: 71, model: "AK100_DS", seriNo: "S1", tarih: "2026-02-10", partiId: 1 }];
  return JSON.parse(JSON.stringify({
    ozet: PARCALAR.flatMap(p => (p.maliyetKalemleri || []).filter(k => k.tur === "malzeme").map(k => malzemeOzeti(k, mk))),
    maliyet: PARCALAR.map(p => TARIHLER.map(t => parcaMaliyetKurus(p, t, kat, mk))),
    fiyat: PARCALAR.map(p => parcaSatisFiyati(p, "TRY", baglam)),
    disa: PARCALAR.map(p => parcaDisaAktarmaSatiri(p, kat, mk, FIYAT_AYARLARI)),
    modeller: mm,
    parti: partiHesabi(parti, { stock, customers: [] },
      { payK: 1000, modeller: mm, bugun: "2026-11-09", katalog: { ...MODELLER, parts: PARCALAR, malzemeler } }),
    siparis: siparis(malzemeler),
  }));
};

describe("Spec 0139 C1: tablosuz veride çıktılar spec öncesiyle aynı", () => {
  it("AC-1 / AC-18: ağırlık, maliyet, fiyat, dışa aktarma, model maliyeti, parti hesabı, sipariş birebir", () => {
    const s = ciktilar(MALZEMELER);
    if (process.env.YAZ_0139 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(s, null, 1) + "\n"); return; }
    expect(ayikla0142v0143(ayikla0141(ayikla(s)))).toEqual(ayikla0142v0143(ayikla0141(ayikla(JSON.parse(fs.readFileSync(DOSYA, "utf8")))))); // spec 0141 ile
  });
  // Spec 0143 ile (Risk 6): işaretsiz satırda boy adedi artık yok; iddia işaretli (boydan sipariş) kaleme taşındı. Kilogram fire
  // (çap bandı tablosu) işaretli satırın boy adedini ve sipariş kilosunu değiştirmez (0143 B-R4, AC-15).
  it("AC-50 (spec 0143 ile): işaretli çaplı kesitte boy adedi ve sipariş kilosu tablolu veride de aynı", () => {
    if (process.env.YAZ_0139 === "1") return;
    const isaretli = PARCALAR.map(p => ({ ...p, maliyetKalemleri: (p.maliyetKalemleri || []).map(k => (k.tur === "malzeme" && (k.bicim === "mil" || k.bicim === "boru") ? { ...k, boydanSiparis: true, cubukBoyu: 6000 } : k)) }));
    const sip = (malzemeler) => siparisIhtiyaci({ modeller: MODELLER.standardModels, satirlar: [{ model: "AK100_DS", adet: "70" }], parts: isaretli, partStock: [], malzemeler, tedarikciler: [] });
    const once = sip(MALZEMELER).kesitler.filter(k => k.boydanSiparis && k.boyAdedi != null);
    const sonra = sip(TABLOLU_MALZEMELER).kesitler;
    expect(once.length).toBeGreaterThan(2);
    for (const k of once) {
      const y = sonra.find(x => x.anahtar === k.anahtar);
      expect(y.boyAdedi).toBe(k.boyAdedi);
      expect(y.siparisKg).toBe(k.siparisKg);
      expect(y.fireKg).toBeGreaterThanOrEqual(k.fireKg); // fire kilosu bilgi olarak büyür
    }
  });
});
