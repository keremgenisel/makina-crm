// Spec 0096 (AC-30, AC-19, AC-18; plan adım 0): kırılımı olmayan parçalarda dışa aktarma satırı, "maliyeti girilmiş mi"
// ölçütü ve model maliyeti hesabı spec öncesi kodla birebir aynı. "Önce" dosyası spec 0096'dan ÖNCEKİ kodla YAZ_0096=1 ile
// üretildi (tests/fixtures/0096-kiyas-once.json); veri değişirse altın geçersizdir.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { parcaDisaAktarmaSatiri } from "../src/lib/parcaAktarma";
import { maliyetGirildiMi } from "../src/lib/urunAgaci";
import { modelMaliyetleri } from "../src/lib/makinaStandartMaliyet";

const ONCE = "tests/fixtures/0096-kiyas-once.json";
export const PARCALAR = [
  { id: 1, ad: "Rulman", kod: "R1", tip: "Standart", fiyatTRY: "450", maliyet: 120.5 },
  { id: 2, ad: "Hediye vida", maliyet: 0 },
  { id: 3, ad: "Pul", maliyet: 7.5 },
  { id: 4, ad: "Maliyetsiz" },
  { id: 5, ad: "Dişli", maliyet: 1234.56, adEN: "Gear" },
  { id: 6, ad: "Boş metin", maliyet: "" },
  { id: 7, ad: "Çöpte", maliyet: 99, deletedAt: "2026-10-01T10:00:00.000Z" },
];
const MODELLER = {
  standardModels: [{ model: "AK100", defaultParcalar: [{ partId: "1", miktar: 2 }, { partId: "2", miktar: 4 }, { partId: "3", miktar: 3 }, { partId: "4", miktar: 1 }, { partId: "7", miktar: 1 }],
    ekMaliyetler: [{ ad: "Büküm", tutar: 90 }], karKatsayisi: 1.4 }],
  customModels: [{ model: "OZEL", defaultParcalar: [{ partId: "5", miktar: 1 }, { partId: "6", miktar: 2 }, { partId: "99", miktar: 1 }] }],
  parts: PARCALAR,
};
const simdi = () => JSON.parse(JSON.stringify({
  disaAktarma: PARCALAR.map(parcaDisaAktarmaSatiri),
  girildiMi: PARCALAR.map(p => maliyetGirildiMi(p)),
  modeller: modelMaliyetleri(MODELLER, 12345),
}));

describe("Spec 0096: kırılımsız parçada çıktılar spec öncesiyle aynı", () => {
  it("AC-30 / AC-19 / AC-18: dışa aktarma satırı, maliyet girildi ölçütü ve model maliyeti hesabı birebir", () => {
    const s = simdi();
    if (process.env.YAZ_0096 === "1") { fs.writeFileSync(ONCE, JSON.stringify(s, null, 1)); return; }
    expect(s).toEqual(JSON.parse(fs.readFileSync(ONCE, "utf8")));
  });
});
