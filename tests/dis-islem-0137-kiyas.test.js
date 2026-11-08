// Spec 0137 C9, R25, AC-80, AC-110, AC-125: katalog bağlı işlem kalemi OLMAYAN veride maliyet zinciri (bugünkü ve tarihli), maliyet
// var mı, satış fiyatı, Model Maliyetleri, Parti Hesabı, Excel (dışa ve içe), sipariş ihtiyacı, zam etki önizlemesi (seçenekli ve
// seçeneksiz), setin özeti, maliyet geçmişi listesi ve kaynak ibaresi spec öncesi kodla birebir aynıdır. Altın
// `tests/fixtures/0137-once.json` spec öncesi koddan `YAZ_0137=1` ile üretildi; burada yalnız karşılaştırılır. Çıktıda bugünün
// tarihi yoktur (0127 dersi): içe aktarma kimliği ve günü sabit verilir.
import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { parcaMaliyetKurus, parcaMaliyetiVar, setKatalogu, setOzeti, maliyetKaynagi, kalemKaynakMetni, maliyetGecmisiSatirlari, maliyetGecmisiYaz } from "../src/lib/urunAgaci";
import { malzemeKatalogu, fiyatEtkisi } from "../src/lib/malzeme";
import { siparisIhtiyaci } from "../src/lib/siparisIhtiyaci";
import { modelMaliyetleri, partiGenelPaylari, partiHesabi } from "../src/lib/makinaStandartMaliyet";
import { parcaSatisFiyati, fiyatBaglamiKur } from "../src/lib/parcaFiyati";
import { parcaDisaAktarmaSatiri, parcaSatirlariniCoz } from "../src/lib/parcaAktarma";
import { PARCALAR, MALZEMELER, TEDARIKCILER, MODELLER, PART_STOCK, FIYAT_AYARLARI, M304 } from "./fixtures/0137-veri.js";
import * as V36 from "./fixtures/0136-veri.js";

const ALTIN = "tests/fixtures/0137-once.json";
const TARIHLER = [undefined, "2026-01-15", "2026-04-15", "2026-06-15"];
const uret = () => {
  const katalog = setKatalogu(PARCALAR); const mk = malzemeKatalogu(MALZEMELER);
  const baglam = fiyatBaglamiKur({ parts: PARCALAR, malzemeler: MALZEMELER, fiyatAyarlari: FIYAT_AYARLARI });
  const zamli = { ...M304, kiloFiyati: 3.4, boyFiyati: 900 };
  const sip = siparisIhtiyaci({ modeller: [...MODELLER.standardModels], satirlar: [{ model: "AK100", adet: "10" }], parts: PARCALAR, partStock: PART_STOCK, malzemeler: MALZEMELER, tedarikciler: TEDARIKCILER });
  const pkat = { parts: PARCALAR, malzemeler: MALZEMELER, standardModels: MODELLER.standardModels, customModels: V36.OZEL };
  const v = V36.veri({ parts: PARCALAR, malzemeler: MALZEMELER });
  const pay = partiGenelPaylari(v, V36.BUGUN);
  const modeller = modelMaliyetleri({ ...pkat }, 65000);
  const satirlar = [["Ad", "", "", "", "", "", "", "", "", "Maliyet"], ...PARCALAR.map(p => [p.ad, "", p.kod, "", "", "", "", "", "", 1])];
  const p81 = PARCALAR.find(p => p.id === 81);
  return {
    zincir: PARCALAR.map(p => ({ id: p.id, k: TARIHLER.map(t => parcaMaliyetKurus(p, t, katalog, mk)), var: parcaMaliyetiVar(p, undefined, katalog, mk), listesiz: parcaMaliyetKurus(p) })),
    fiyat: PARCALAR.map(p => ({ id: p.id, f: parcaSatisFiyati(p, "TRY", baglam) })),
    excel: PARCALAR.map(p => parcaDisaAktarmaSatiri(p, katalog, mk, FIYAT_AYARLARI)),
    iceAktarma: parcaSatirlariniCoz(satirlar, PARCALAR, 900000, "2026-06-15", MALZEMELER, FIYAT_AYARLARI),
    model: modelMaliyetleri({ ...MODELLER, parts: PARCALAR, malzemeler: MALZEMELER }, 5000),
    parti: V36.PARTILER.map(p => partiHesabi(p, v, { payK: 65000, modeller, bugun: V36.BUGUN, katalog: pkat, partiPay: pay.partiler.find(x => x.id === p.id) })),
    siparis: { parcalar: sip.parcalar, kesitler: sip.kesitler, malzemeGruplari: sip.malzemeGruplari, eksik: sip.eksik, hazirSayi: sip.hazirSayi, toplamTLK: sip.toplamTLK },
    etki: fiyatEtkisi(M304, zamli, PARCALAR, MALZEMELER, { fiyatAyarlari: FIYAT_AYARLARI }),
    etkiSecenekiz: fiyatEtkisi(M304, zamli, PARCALAR, MALZEMELER),
    set: setOzeti(PARCALAR.find(p => p.id === 85).setIcerigi, katalog, "2026-02-01", mk),
    gecmisListesi: PARCALAR.map(p => maliyetGecmisiSatirlari(p)),
    gecmisKarari: maliyetGecmisiYaz(p81, 5000, { tarih: "2026-06-10", bugun: "2026-06-15" }),
    kaynak: PARCALAR.map(p => { const k = maliyetKaynagi(p, undefined, katalog, mk); return k?.tur === "kalem" ? kalemKaynakMetni(k) : k; }),
  };
};
const temiz = (x) => JSON.parse(JSON.stringify(x));

describe("Spec 0137 kıyas (C9)", () => {
  it("AC-80 / AC-110 / AC-125: katalog bağlı işlem kalemi olmayan veride bütün çıktılar spec öncesi altınla birebir aynıdır", () => {
    const sonuc = temiz(uret());
    if (process.env.YAZ_0137 === "1") { writeFileSync(ALTIN, JSON.stringify(sonuc, null, 1)); return; }
    expect(sonuc).toEqual(JSON.parse(readFileSync(ALTIN, "utf8")));
  });
});
