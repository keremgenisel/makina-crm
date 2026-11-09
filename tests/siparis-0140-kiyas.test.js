// Spec 0140 C2, C-R11 (AC-51, AC-52, AC-93, AC-94): düzenleme girdisi ve `tedarikciOdakli` seçeneği verilmeyen motor çağrısı spec
// öncesi altınla birebir; opt-in çağrıda bugünkü alanlar ve TEDARIKCISIZ metni değişmez. Altın YAZ_0140=1 ile spec ÖNCESİ koddan.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import * as S from "../src/lib/siparisIhtiyaci";
import * as F34 from "./fixtures/0134-veri";
import * as V139 from "./fixtures/0139-veri";

const DOSYA = "tests/fixtures/0140-once.json";
const SENARYOLAR = () => ({
  temel: F34.veri(),
  stoklu: F34.veri({ partStock: [{ id: 1, partId: 42, miktar: 300 }, { id: 2, partId: 44, miktar: 20 }] }),
  ikiModel: F34.veri({ modeller: [F34.AK100, F34.model("AK120_DS", [[41, 2], [43, 4]])], satirlar: [{ model: "AK100_DS", adet: "40" }, { model: "AK120_DS", adet: "30" }] }),
  tedarikcisiz: F34.veri({ malzemeler: [{ ...F34.P304, tedarikciId: undefined }] }),
  hatali: F34.veri({ satirlar: [{ model: "", adet: "x" }, { model: "AK100_DS", adet: "5" }] }),
  kalemli: { modeller: V139.MODELLER.standardModels, satirlar: [{ model: "AK100_DS", adet: "70" }], parts: V139.PARCALAR, partStock: [], malzemeler: V139.MALZEMELER, tedarikciler: [] },
});
const temiz = (x) => JSON.parse(JSON.stringify(x));
const uret = (secenek) => Object.fromEntries(Object.entries(SENARYOLAR()).map(([ad, v]) => {
  const r = temiz(secenek === undefined ? S.siparisIhtiyaci(v) : S.siparisIhtiyaci(v, secenek));
  delete r.tedarikciBolumleri;
  return [ad, r];
}));

describe("Spec 0140 kıyas (C2, C-R11)", () => {
  it("AC-51 / AC-52: parametresiz çağrı spec öncesi altınla birebir; TEDARIKCISIZ metni aynı", () => {
    const s = uret();
    if (process.env.YAZ_0140 === "1") { fs.writeFileSync(DOSYA, JSON.stringify({ sonuc: s, TEDARIKCISIZ: S.TEDARIKCISIZ }, null, 1) + "\n"); return; }
    const altin = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    expect(s).toEqual(altin.sonuc);
    expect(S.TEDARIKCISIZ).toBe(altin.TEDARIKCISIZ);
  });
  it("AC-93: tedarikciOdakli verilmeyen çağrıda tedarikciBolumleri alanı hiç yoktur", () => {
    if (process.env.YAZ_0140 === "1") return;
    for (const v of Object.values(SENARYOLAR())) expect(S.siparisIhtiyaci(v)).not.toHaveProperty("tedarikciBolumleri");
  });
  it("AC-94: opt-in çağrıda bugünkü alanlar ve metin değişmez", () => {
    if (process.env.YAZ_0140 === "1") return;
    const altin = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    expect(uret({ tedarikciOdakli: true })).toEqual(altin.sonuc);
    for (const v of Object.values(SENARYOLAR())) expect(S.siparisIhtiyaci(v, { tedarikciOdakli: true })).toHaveProperty("tedarikciBolumleri");
  });
});
