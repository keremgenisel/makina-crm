// Spec 0138 R15–R15/4, C4, Karar 29, 31, 32: göçün saf çekirdeği (electron/disIslemGocuSaf.mjs). Adet birimli satır tutarı
// altında 0137 motorunun spec öncesi çıktısıyla sabitlenir (`tests/fixtures/0138-goc-altin.json`, `disIslem.islemKalemiOzeti`
// silinmeden önce üretildi). Uçtan uca göç (üç açılış dalı, bayrak, yedek) Electron'da: scripts/tests/dis-islem-gocu.cjs.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { disIslemGocPlani, kalemiCevir, YER_TUTUCU_AD } from "../electron/disIslemGocuSaf.mjs";
import { kalemlerDogrula, kalemleriFormu } from "../src/lib/urunAgaci";
import { ISLEMLER, ADET_KALEMLERI, PARCALAR } from "./fixtures/0138-goc-veri.js";

const ALTIN = JSON.parse(readFileSync("tests/fixtures/0138-goc-altin.json", "utf8"));
const isler = new Map(ISLEMLER.map(m => [String(m.id), m]));
const plan = disIslemGocPlani(PARCALAR, ISLEMLER);
const parca = (id) => plan.degisen.find(p => p.id === id);

describe("Spec 0138 göç çekirdeği", () => {
  it("AC-23 / AC-44: adet birimli kalemin tutarı 0137 motorunun satır tutarıdır, TL'ye çevrilir ve iki ondalıktır", () => {
    ADET_KALEMLERI.forEach((k, i) => {
      const r = kalemiCevir(k, isler);
      expect(ALTIN[i].cozuldu).toBe(true);
      expect(r.tutar).toBe(ALTIN[i].tutarK / 100);
      expect(Number(r.tutar.toFixed(2))).toBe(r.tutar);
      expect(r).not.toHaveProperty("islemId");
      expect(r).not.toHaveProperty("miktar");
    });
    expect(kalemiCevir({ tur: "islem", islemId: 703, miktar: 1 }, isler)).toEqual({ tur: "islem", ad: "Helis dişli açımı", tutar: 187.5 });
    expect(parca(1).maliyetKalemleri[1]).toEqual({ tur: "islem", ad: "Ayna mahruti dişli takımı", tedarikciId: 801, tutar: 4930 });
  });
  it("AC-44: kuruş değeri TL alanına yazılmaz", () => {
    expect(kalemiCevir({ tur: "islem", islemId: 701, miktar: 2 }, isler).tutar).not.toBe(493000);
  });
  it("AC-24: çöpteki, fiyatsız ve kursuz işleme bağlı kalem tutarsız serbest kaleme çevrilir, ad ve tedarikçi korunur", () => {
    expect(parca(3).maliyetKalemleri).toEqual([
      { tur: "islem", ad: "Çöpteki işlem", tedarikciId: 801, tutar: null },
      { tur: "islem", ad: "Tel erezyon", tedarikciId: 802, tutar: null },
      { tur: "islem", ad: "Euro kursuz", tutar: null },
    ]);
  });
  it("AC-25: kilo birimli kalem miktarı girilmiş olsa da her zaman tutarsız çevrilir (Karar 31)", () => {
    expect(parca(2).maliyetKalemleri).toEqual([
      { tur: "islem", ad: "Isıl işlem", tedarikciId: 803, tutar: null },
      { tur: "islem", ad: "Isıl işlem", tedarikciId: 803, tutar: null },
    ]);
  });
  it("Karar 32: kaydedilmiş adedi geçersiz (0, ondalık) adet kalemi tutarsız çevrilir", () => {
    expect(parca(6).maliyetKalemleri.slice(1)).toEqual([
      { tur: "islem", ad: "Kaplama USD", tedarikciId: 802, tutar: null },
      { tur: "islem", ad: "Kaplama USD", tedarikciId: 802, tutar: null },
    ]);
  });
  it("AC-43: kaydı hiç bulunamayan işlemin kalemi yer tutucu adla tutarsız çevrilir ve parça doğrulamadan geçer", () => {
    expect(parca(4).maliyetKalemleri).toEqual([{ tur: "islem", ad: YER_TUTUCU_AD, tutar: null }]);
    expect(YER_TUTUCU_AD).toBe("Dış işlem");
    const d = kalemlerDogrula(kalemleriFormu(parca(4).maliyetKalemleri));
    expect(d.gecerli).toBe(true);
  });
  it("AC-26 / C4: kalem sırası ve öteki kalemler aynen; katalog kalemi olmayan parça plana girmez", () => {
    const eski = PARCALAR.find(p => p.id === 1).maliyetKalemleri;
    expect(parca(1).maliyetKalemleri[0]).toBe(eski[0]);
    expect(parca(1).maliyetKalemleri[2]).toBe(eski[2]);
    expect(parca(1).maliyetKalemleri.length).toBe(3);
    expect(parca(5)).toBeUndefined();
    expect(Object.keys(parca(1)).sort()).toEqual(["id", "maliyetKalemleri"]);
  });
  it("Karar 29: çöpteki parça da göçe girer", () => {
    expect(parca(6).maliyetKalemleri[0]).toEqual({ tur: "islem", ad: "Helis dişli açımı", tutar: 187.5 });
  });
  it("AC-22: katalog kalemi olmayan veride plan boştur", () => {
    expect(disIslemGocPlani([{ id: 1, maliyetKalemleri: [{ tur: "islem", ad: "X", tutar: 1 }] }, { id: 2 }], ISLEMLER).degisen).toEqual([]);
    expect(disIslemGocPlani([], []).degisen).toEqual([]);
  });
});
