// Triyaj (bulgu 4): altın yalnız karşılaştırılan iki anahtarı taşır (R3 hâli AC-44'te birim testte ölçülür).
// Spec 0163 AC-35 (C4): yetimli kendi fikstüründe motor çıktıları spec öncesi koddan üretilmiş altınla karşılaştırılır; yalnız eksik
// sayısı, çizilen kit satırı kümesi ve kardeşsiz yetim satırın (R3, R7/2) getirdiği alanlar değişir. Altın `YAZ_0163=1` ile.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { modelMaliyetleri } from "../src/lib/makinaStandartMaliyet";
import { siparisIhtiyaci } from "../src/lib/siparisIhtiyaci";
import { SIPARIS, SWP_DSC, SWP_DS, CANLI, MALZEMELER } from "./fixtures/0163-veri.js";

const DOSYA = "tests/fixtures/0163-once.json";
const uret = () => ({
  olcum2: modelMaliyetleri({ standardModels: [SWP_DSC], customModels: [SWP_DS], parts: CANLI, malzemeler: MALZEMELER }, 1000),
  siparisOlcum2: siparisIhtiyaci(SIPARIS({ modeller: [SWP_DSC, SWP_DS], satirlar: [{ model: "SWP140_DSC", adet: "10" }, { model: "SWP140_DS", adet: "6" }] }), { tedarikciOdakli: true }),
});

describe("Spec 0163 kıyas (AC-35)", () => {
  it("altın", () => {
    const s = JSON.parse(JSON.stringify(uret()));
    if (process.env.YAZ_0163 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(s, null, 1) + "\n"); return; }
    const a = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    // Ölçüm 2 şekli (R2 hâli): para ve adet alanları birebir; yalnız eksik sayısı ve çizilen satır kümesi değişir.
    const para = (m) => ({ model: m.model, direktK: m.direktK, toplamK: m.toplamK, oneriK: m.oneriK, kit: m.kit.filter(r => !r.eksik).map(r => [String(r.partId), r.adet, r.birimK, r.satirK]) });
    expect(s.olcum2.map(para)).toEqual(a.olcum2.map(para));
    expect(a.olcum2.map(m => m.eksikSayisi)).toEqual([1, 1]);
    expect(s.olcum2.map(m => m.eksikSayisi)).toEqual([0, 0]);
    expect(s.olcum2.map(m => m.kit.length)).toEqual(a.olcum2.map(m => m.kit.length - 1));
    // Sipariş: eksik parça sayacı tam bir azalır (tek ölü kimlik), başka hiçbir şey değişmez (AC-14, AC-43).
    const { eksik: eY, ...yeni } = s.siparisOlcum2; const { eksik: eE, ...eski } = a.siparisOlcum2;
    const kalemsiz = (o) => ({ ...o, parcalar: o.parcalar.filter(p => !p.silinmis) });
    expect(kalemsiz(yeni)).toEqual(kalemsiz(eski));
    expect([eE.parca - eY.parca, eY.malzeme]).toEqual([1, eE.malzeme]);
  });
});
