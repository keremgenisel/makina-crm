// Spec 0097 (C4, AC-4, AC-25, AC-31, AC-32; plan adım 0): maliyet geçmişi olmayan veride tarihsiz bütün çağıranlar spec
// öncesi kodla birebir aynı: dışa aktarma satırı, liste hücresi metni, "girildi mi" ölçütü ve sayaç, Model Maliyetleri'nin
// seçeneksiz ve seçenekli çıktısı, değeri değişmeyen içe aktarma. "Önce" dosyası spec 0097'den ÖNCEKİ kodla YAZ_0097=1 ile
// üretildi (tests/fixtures/0097-kiyas-once.json); veri değişirse altın geçersizdir.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { parcaDisaAktarmaSatiri, parcaSatirlariniCoz, PARCA_AKTARMA_BASLIKLARI } from "../src/lib/parcaAktarma";
import { maliyetGirildiMi, parcaMaliyetMetni, parcaMaliyetKurus } from "../src/lib/urunAgaci";
import { modelMaliyetleri } from "../src/lib/makinaStandartMaliyet";

const ONCE = "tests/fixtures/0097-kiyas-once.json";
const PARCALAR = [
  { id: 1, ad: "Rulman", kod: "R1", tip: "Standart", fiyatTRY: "450", maliyet: 120.5 },
  { id: 2, ad: "Hediye vida", maliyet: 0 },
  { id: 3, ad: "Pul", maliyet: 7.5 },
  { id: 4, ad: "Maliyetsiz" },
  { id: 5, ad: "Dişli", maliyet: 1234.56, adEN: "Gear" },
  { id: 6, ad: "Boş metin", maliyet: "" },
  { id: 7, ad: "Çöpte", maliyet: 99, deletedAt: "2026-10-01T10:00:00.000Z" },
  { id: 8, ad: "Ayna", hammaddeler: [{ tedarikciId: 31, tutar: 170 }, { tedarikciId: 32, tutar: 12.25 }] },
  { id: 9, ad: "Tutarsız kırılım", maliyet: 40, hammaddeler: [{ tedarikciId: 31, tutar: null }] },
];
const MODELLER = {
  standardModels: [{ model: "AK100", defaultParcalar: [{ partId: "1", miktar: 2 }, { partId: "2", miktar: 4 }, { partId: "3", miktar: 3 }, { partId: "4", miktar: 1 }, { partId: "7", miktar: 1 }, { partId: "8", miktar: 2 }],
    ekMaliyetler: [{ ad: "Büküm", tutar: 90 }], karKatsayisi: 1.4 }],
  customModels: [{ model: "OZEL", defaultParcalar: [{ partId: "5", miktar: 1 }, { partId: "6", miktar: 2 }, { partId: "9", miktar: 3 }, { partId: "99", miktar: 1 }] }],
  parts: PARCALAR,
};
const canli = PARCALAR.filter(p => !p.deletedAt);
// İçe aktarma: bugünkü değerleri aynen yazan dosya (dışa aktarmanın kendisi) + yeni bir parça.
const satirlar = [PARCA_AKTARMA_BASLIKLARI, ...canli.map(parcaDisaAktarmaSatiri), ["Yeni parça", "", "", "", "", "", "", "", "", "15"]];
const simdi = () => JSON.parse(JSON.stringify({
  disaAktarma: PARCALAR.map(parcaDisaAktarmaSatiri),
  listeHucresi: PARCALAR.map(parcaMaliyetMetni),
  kurus: PARCALAR.map(p => parcaMaliyetKurus(p)),
  girildiMi: PARCALAR.map(p => maliyetGirildiMi(p)),
  sayac: canli.filter(p => !maliyetGirildiMi(p)).length,
  modeller: modelMaliyetleri(MODELLER, 12345),
  modellerSecenekli: modelMaliyetleri(MODELLER, 12345, { uretimdeDisi: ["OZEL"], uretim: { modelAdetleri: { ak100: 3 } } }),
  iceAktarma: parcaSatirlariniCoz(satirlar, PARCALAR, 1000, "2026-10-20"),
}));

describe("Spec 0097: geçmişi olmayan veride tarihsiz çağıranlar spec öncesiyle aynı", () => {
  it("C4 / AC-4 / AC-25 / AC-31 / AC-32: dışa aktarma, liste hücresi, sayaç, model maliyetleri, değeri değişmeyen içe aktarma", () => {
    const s = simdi();
    if (process.env.YAZ_0097 === "1") { fs.writeFileSync(ONCE, JSON.stringify(s, null, 1)); return; }
    expect(s).toEqual(JSON.parse(fs.readFileSync(ONCE, "utf8")));
  });
});
