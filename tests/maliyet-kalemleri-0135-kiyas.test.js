// Spec 0135 C8, AC-41, AC-42, AC-80: kalem alanı olmayan veride maliyet zinciri (bugünkü ve tarihli), maliyet var mı, sipariş
// ihtiyacı, model maliyetleri, türetilmiş satış fiyatı, Excel çıktısı ve zam etki önizlemesi spec öncesi kodla birebir aynıdır.
// Altın `tests/fixtures/0135-once.json` spec öncesi koddan `YAZ_0135=1` ile üretildi; burada yalnız karşılaştırılır.
import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { parcaMaliyetKurus, parcaMaliyetiVar, setKatalogu } from "../src/lib/urunAgaci";
import { malzemeKatalogu, fiyatEtkisi } from "../src/lib/malzeme";
import { siparisIhtiyaci } from "../src/lib/siparisIhtiyaci";
import { modelMaliyetleri } from "../src/lib/makinaStandartMaliyet";
import { parcaSatisFiyati, fiyatBaglamiKur } from "../src/lib/parcaFiyati";
import { parcaDisaAktarmaSatiri } from "../src/lib/parcaAktarma";
import { ayikla0139 } from "./fixtures/0139-ayikla.js"; // spec 0139 ile: uyarı metni ve yeni ekFireKg alanı
import { ayikla0141 } from "./fixtures/0141-ayikla.js"; // spec 0141 ile: sipariş satırının `pay` anahtarı ve kayıt gövdesinin katlaması
import { ayikla0142 } from "./fixtures/0142-ayikla.js"; // spec 0142 ile: parça satırının `olculer` alanı ve tedarikçi bölümlerinin `belge` alanı
import { ayikla0143 } from "./fixtures/0143-ayikla.js"; // spec 0143 ile (C2/3): kalkan ve adı değişen alanlar normalleşir, sayılar dokunulmaz
import { PARCALAR, MALZEMELER, TEDARIKCILER, MODELLER, PART_STOCK, FIYAT_AYARLARI, M304 } from "./fixtures/0135-veri.js";
const ayikla0142v0143 = (x) => ayikla0143(ayikla0142(x));

const ALTIN = "tests/fixtures/0135-once.json";
const TARIHLER = [undefined, "2026-01-15", "2026-04-15", "2026-06-15"];
export const uret = () => {
  const katalog = setKatalogu(PARCALAR); const mk = malzemeKatalogu(MALZEMELER);
  const baglam = fiyatBaglamiKur({ parts: PARCALAR, malzemeler: MALZEMELER, fiyatAyarlari: FIYAT_AYARLARI });
  const zamli = { ...M304, kiloFiyati: 3.4, boyFiyati: 900 };
  const sip = siparisIhtiyaci({ modeller: [...MODELLER.standardModels], satirlar: [{ model: "AK100", adet: "10" }], parts: PARCALAR, partStock: PART_STOCK, malzemeler: MALZEMELER, tedarikciler: TEDARIKCILER });
  return {
    zincir: PARCALAR.map(p => ({ id: p.id, k: TARIHLER.map(t => parcaMaliyetKurus(p, t, katalog, mk)), var: parcaMaliyetiVar(p, undefined, katalog, mk), listesiz: parcaMaliyetKurus(p) })),
    fiyat: PARCALAR.map(p => ({ id: p.id, f: parcaSatisFiyati(p, "TRY", baglam) })),
    excel: PARCALAR.map(p => parcaDisaAktarmaSatiri(p, katalog, mk, FIYAT_AYARLARI)),
    model: modelMaliyetleri({ ...MODELLER, parts: PARCALAR, malzemeler: MALZEMELER }, 5000),
    siparis: { parcalar: sip.parcalar, kesitler: sip.kesitler, malzemeGruplari: sip.malzemeGruplari, eksik: sip.eksik, hazirSayi: sip.hazirSayi, toplamTLK: sip.toplamTLK },
    etki: fiyatEtkisi(M304, zamli, PARCALAR, MALZEMELER, { fiyatAyarlari: FIYAT_AYARLARI }),
  };
};
const temiz = (x) => JSON.parse(JSON.stringify(x));

describe("Spec 0135 kıyas (C8)", () => {
  it("AC-41, AC-42, AC-80: kalem alanı olmayan veride yedi kalem spec öncesi altınla birebir aynıdır", () => {
    const sonuc = temiz(uret());
    if (process.env.YAZ_0135 === "1") { writeFileSync(ALTIN, JSON.stringify(sonuc, null, 1)); return; }
    expect(ayikla0142v0143(ayikla0141(ayikla0139(sonuc)))).toEqual(ayikla0142v0143(ayikla0141(ayikla0139(JSON.parse(readFileSync(ALTIN, "utf8")))))); // spec 0139 ve 0141 ile ayıklandı
  });
});
