// Spec 0132 C8 (AC-56, AC-57, AC-58): malzeme satırı olmayan veride parça maliyeti, liste metni, kaynak, dışa aktarma satırı ve
// model maliyeti spec öncesi kodla birebir aynı. Altın YAZ_0132=1 ile spec ÖNCESİ koddan üretildi (tests/fixtures/0132-once.json).
// Çağrılar dördüncü parametreyi (malzeme haritası) ve veri nesnesinin `malzemeler` anahtarını şimdiden geçirir; spec öncesi kod
// ikisini yok sayar, spec sonrası kod okur ve malzemesiz parçada rakam değişmemelidir.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { parcaDisaAktarmaSatiri } from "../src/lib/parcaAktarma";
import { parcaMaliyetKurus, parcaMaliyetMetni, maliyetKaynagi, maliyetGirildiMi, setKatalogu } from "../src/lib/urunAgaci";
import { modelMaliyetleri } from "../src/lib/makinaStandartMaliyet";
import { MALZEMELER, PARCALAR, MODELLER, TARIHLER } from "./fixtures/0132-veri";

const DOSYA = "tests/fixtures/0132-once.json";
const malzemeHaritasi = new Map(MALZEMELER.map(m => [String(m.id), m]));
const simdi = () => {
  const kat = setKatalogu(PARCALAR);
  return JSON.parse(JSON.stringify({
    maliyet: PARCALAR.map(p => TARIHLER.map(t => parcaMaliyetKurus(p, t, kat, malzemeHaritasi))),
    metin: PARCALAR.map(p => parcaMaliyetMetni(p, undefined, kat, malzemeHaritasi)),
    kaynak: PARCALAR.map(p => maliyetKaynagi(p, undefined, kat, malzemeHaritasi)),
    girildi: PARCALAR.map(p => maliyetGirildiMi(p, undefined, kat, malzemeHaritasi)),
    disa: PARCALAR.map(p => parcaDisaAktarmaSatiri(p, kat, malzemeHaritasi)),
    modeller: modelMaliyetleri({ ...MODELLER, parts: PARCALAR, malzemeler: MALZEMELER }, 12345),
  }));
};

describe("Spec 0132 C8: malzemesiz veride çıktılar spec öncesiyle aynı", () => {
  it("AC-56 / AC-57 / AC-58: maliyet (tarihli), metin, kaynak, dışa aktarma, model maliyeti birebir", () => {
    const s = simdi();
    if (process.env.YAZ_0132 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(s, null, 1) + "\n"); return; }
    expect(s).toEqual(JSON.parse(fs.readFileSync(DOSYA, "utf8")));
  });
});
