// Spec 0142: motorun ölçü metni ve parça satırının ölçüleri (C3, C4, D-R1–D-R5, B-R5–B-R5/3), belgenin bölümleri (B-R1/2–B-R1/6,
// B-R2/2, B-R6–B-R6/3, B-R7/2) ve kaynak taramaları (C3, A-R6/2, E-R2/2, E-R3, C7).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as S from "../src/lib/siparisIhtiyaci";
import { veri, PARCALAR } from "./fixtures/0142-veri.js";

const odakli = (o = {}, sec = {}) => S.siparisIhtiyaci(veri(o), { tedarikciOdakli: true, ...sec });
const belge = (r) => r.tedarikciBolumleri.belge;
const bolumu = (r, ad) => belge(r).find(b => b.ad === ad);
const satiri = (b, ad) => b?.satirlar.find(x => x.ad === ad);
const parca = (r, ad) => r.parcalar.find(p => p.ad === ad);
const metinler = (x) => x.olculer.filter(o => !o.eksik).map(o => o.metin);
const kodSatirlari = (dosya) => fs.readFileSync(dosya, "utf8").split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).map(l => l.replace(/\s\/\/.*$/, "")).join("\n");

describe("Spec 0142 C: ölçü metni", () => {
  it("AC-16: yuvarlak mil Ø100 × 108", () => { expect(S.olcuMetni("mil", [100], 108)).toBe("Ø100 × 108"); });
  it("AC-17: boru Ø19 × 1,5 et × 173", () => {
    expect(S.olcuMetni("boru", [19, 1.5], 173)).toBe("Ø19 × 1,5 et × 173");
    expect(metinler(parca(odakli(), "Boru"))).toEqual(["Ø19 × 1,5 et × 173"]);
  });
  it("AC-18: lama 10 × 20 × 125", () => { expect(S.olcuMetni("lama", [10, 20], 125)).toBe("10 × 20 × 125"); });
  it("AC-19: sac kalınlık, en, boy sırasıyla 10 × 100 × 200", () => {
    expect(S.olcuMetni("sac", [10, 100], 200)).toBe("10 × 100 × 200");
    expect(metinler(parca(odakli(), "Çift malzemeli"))).toContain("10 × 100 × 200");
  });
  it("AC-20: iki ayrı ölçüde malzeme kalemi olan parçada iki ölçü", () => {
    expect(metinler(parca(odakli(), "Çift malzemeli"))).toEqual(["Ø40 × 90", "10 × 100 × 200"]);
  });
  it("AC-21 / AC-55: birebir aynı iki kalem bir kez yazılır ve adetleri toplanır", () => {
    const r = odakli();
    expect(metinler(parca(r, "Aynı ölçülü"))).toEqual(["Ø25,5 × 60 · parça başına 2"]);
    expect(metinler(parca(r, "Lama"))).toEqual(["10 × 20 × 125 · parça başına 2"]); // kalem adedi 2
    expect(metinler(parca(r, "İnce mil"))).toEqual(["Ø16 × 235 · parça başına 3"]);
    expect(metinler(parca(r, "Kalın mil"))).toEqual(["Ø62 × 178"]); // adet 1: ek yok
    expect(S.parcaBasinaMetni(2)).toBe(" · parça başına 2");
  });
  it("AC-22: kesiti aynı boyu farklı iki kalem ayrı ayrı yazılır", () => {
    expect(metinler(parca(odakli(), "Aynı kesit farklı boy"))).toEqual(["Ø62 × 50", "Ø62 × 75"]);
  });
  it("AC-23 (motor) / D-R4: stokta yeten parçanın ölçüsü sipariş adedinden bağımsız okunur", () => {
    const r = odakli({ partStock: [{ id: 1, partId: 1, miktar: 500 }] });
    expect(parca(r, "Kalın mil").siparis).toBe(0);
    expect(metinler(parca(r, "Kalın mil"))).toEqual(["Ø62 × 178"]);
  });
  it("AC-41 (motor): boyu girilmemiş kalem eksik işaretli, metni boş", () => {
    const o = parca(odakli(), "Boyu eksik").olculer;
    expect(o).toHaveLength(1); expect(o[0].eksik).toBe(true); expect(o[0].metin).toBe("");
  });
  it("AC-42 (motor): set ve hazır parça ölçü taşımaz", () => {
    const r = odakli();
    expect(parca(r, "Bağlantı seti").olculer).toEqual([]);
    expect(parca(r, "Elle").olculer).toEqual([]);
  });
  it("AC-44: ondalıklı ölçü kesitMetni'nin biçimiyle (virgül, en çok üç ondalık)", () => {
    expect(S.olcuMetni("mil", [25.5], 60.1234)).toBe("Ø25,5 × 60,123");
    expect(S.olcuMetni("mil", [25.5], 60).startsWith(S.kesitMetni("mil", [25.5]))).toBe(true);
  });
});

describe("Spec 0142 F: belgenin bölümleri", () => {
  it("AC-34: malzemesinin tedarikçisi Alfa, Ana tedarikçisi Beta olan parça Alfa'nın bölümünde", () => {
    const r = odakli();
    expect(satiri(bolumu(r, "Alfa Çelik"), "Kalın mil")).toBeTruthy();
    expect(satiri(bolumu(r, "Beta Plastik"), "Kalın mil")).toBeUndefined();
    // Pencerenin bölümlemesi değişmez (C-R3): Kalın mil pencerede Ana tedarikçisinin (Beta) tablosunda.
    expect(r.tedarikciBolumleri.bolumler.find(b => b.ad === "Beta Plastik").hazirParcalar.map(x => x.ad)).toContain("Kalın mil");
  });
  it("AC-35: Ana tedarikçisi girilmemiş malzemeli parça malzemesinin tedarikçisinin bölümünde", () => {
    const r = odakli();
    expect(PARCALAR.find(p => p.ad === "Yatak").tedarikciId).toBeUndefined();
    expect(satiri(bolumu(r, "Alfa Çelik"), "Yatak")).toBeTruthy();
    expect(r.tedarikciBolumleri.belirtilmemis.anasizMalzemeli).toBeGreaterThan(0); // pencerede sayaç kalır
  });
  it("AC-36 / AC-58: iki firmalı parça iki bölümde de, her birinde yalnız o firmanın ölçüsü ve tam sipariş adediyle", () => {
    const r = odakli();
    const a = satiri(bolumu(r, "Alfa Çelik"), "Çift malzemeli"); const b = satiri(bolumu(r, "Beta Plastik"), "Çift malzemeli");
    expect(metinler(a)).toEqual(["Ø40 × 90"]); expect(a.malzemeAdlari).toEqual(["304 Çubuk"]);
    expect(metinler(b)).toEqual(["10 × 100 × 200"]); expect(b.malzemeAdlari).toEqual(["Delrin levha"]);
    expect(a.siparis).toBe(70); expect(b.siparis).toBe(70);
  });
  it("AC-37: hazır parça kendi Ana tedarikçisinin bölümünde, malzeme adı yok", () => {
    const x = satiri(bolumu(odakli(), "Delta Hırdavat"), "Elle");
    expect(x).toBeTruthy(); expect(x.olculer).toEqual([]); expect(x.malzemeAdlari).toEqual([]);
  });
  it("AC-38 (motor): kapatılmış ya da hatalı parça satırı belgeye girmez", () => {
    const r = odakli({}, { duzenleme: { parca: { 6: { kapali: true }, 9: { adet: "x" } }, kesit: {} } });
    expect(belge(r).flatMap(b => b.satirlar.map(x => x.ad))).not.toContain("Levha");
    expect(belge(r).flatMap(b => b.satirlar.map(x => x.ad))).not.toContain("Elle");
  });
  it("AC-39 / AC-49 (motor): kapatılmış ya da hatalı kesit toplama girmez; parçası açıksa uyarı işareti", () => {
    const r = odakli({}, { duzenleme: { parca: {}, kesit: { "501|kilo||mil|50": { kapali: true }, "501|kilo||mil|40": { deger: "abc" } } } });
    const alfa = bolumu(r, "Alfa Çelik");
    expect(alfa.toplam.map(k => k.kesitMetni)).not.toContain("Ø50");
    expect(alfa.toplam.map(k => k.kesitMetni)).not.toContain("Ø40");
    expect(alfa.kapaliKesitVar).toBe(true);
    expect(satiri(alfa, "Karma")).toBeTruthy(); // parça satırı düşmez
    expect(bolumu(odakli(), "Alfa Çelik").kapaliKesitVar).toBe(false);
  });
  it("AC-40: pencerenin 'Ana tedarikçisi yok' sayacı yalnız hazır parçaları sayar", () => {
    const tb = odakli({ parts: PARCALAR.map(p => (p.id === 9 ? { ...p, tedarikciId: undefined } : p)) }).tedarikciBolumleri;
    expect(tb.belirtilmemis.parcalar.length).toBeGreaterThan(0);
    expect(tb.belirtilmemis.parcalar.every(x => !x.malzemeli)).toBe(true);
  });
  it("AC-11 / AC-46 / AC-59: malzeme adı, kesit, parça adı sırası; aynı çubuktan kesilenler yan yana; çok kalemli parça bir kez", () => {
    const alfa = bolumu(odakli(), "Alfa Çelik");
    expect(alfa.satirlar.map(x => x.ad)).toEqual(["Lama", "İnce mil", "Aynı ölçülü", "Çift malzemeli", "Karma", "Aynı kesit farklı boy", "Kalın mil", "Yatak", "Boyu eksik"]);
    expect(alfa.satirlar.filter(x => x.ad === "Aynı kesit farklı boy")).toHaveLength(1);
  });
  it("AC-12 / AC-59: hazır parçalar bölümün sonunda ve kit sırasında", () => {
    const parts = PARCALAR.map(p => (p.id === 9 ? { ...p, tedarikciId: 13 } : p.id === 15 ? { ...p, tedarikciId: 13 } : p));
    const gama = bolumu(odakli({ parts }), "Gama Boru");
    expect(gama.satirlar.map(x => x.ad)).toEqual(["Boru", "Boy mil", "Elle", "Çöpteki malzemeli"]);
  });
  it("AC-56: bütün parçaları kapatılmış, kesidine elle kilo yazılmış bölüm toplamıyla kalır", () => {
    const r = odakli({}, { duzenleme: { parca: { 6: { kapali: true }, 11: { kapali: true } }, kesit: { "502|kilo||sac|30|60": { deger: "40" } } } });
    const beta = bolumu(r, "Beta Plastik");
    expect(beta.satirlar.filter(x => x.ad !== "Kalın mil")).toEqual([]);
    expect(beta.toplam.map(k => [k.kesitMetni, k.siparisKg, k.elle])).toEqual([["30 × 60", 40, true]]);
  });
  it("AC-57: malzemesi çöpte olan tek kalemli parça Ana tedarikçisinde; malzemesi bulunamayan ve Ana'sız parça hiç girmez", () => {
    const r = odakli();
    const x = satiri(bolumu(r, "Delta Hırdavat"), "Çöpteki malzemeli");
    expect(x).toBeTruthy(); expect(x.malzemeAdlari).toEqual([]);
    expect(belge(r).flatMap(b => b.satirlar.map(s => s.ad))).not.toContain("Malzemesi yok");
  });
  // Spec 0143 ile: boy fiyatı yöntemi kalktı; boy adedi "Sipariş boydan verilir" işaretli kalemden (çubuk 6000 mm: 70 × 400 ÷ 6000 = 4,67 → 5).
  it("AC-13 / AC-14 / AC-15 (motor, spec 0143 ile): toplam bölümün kesit satırlarından; işaretli kalemde boy adedi; malzeme satırı yoksa toplam yok", () => {
    const r = odakli({ parts: PARCALAR.map(p => (p.id === 7 ? { ...p, maliyetKalemleri: p.maliyetKalemleri.map(k => ({ ...k, boydanSiparis: true, cubukBoyu: 6000 })) } : p)) });
    expect(bolumu(r, "Alfa Çelik").toplam.length).toBe(7);
    const boy = bolumu(r, "Gama Boru").toplam.find(k => k.boydanSiparis);
    expect(boy.boyAdedi).toBe(5); expect(boy.siparisKg).toBeCloseTo(5 * boy.tamKg, 9);
    expect(bolumu(r, "Delta Hırdavat").toplam).toEqual([]);
  });
  it("seçim belgeye de uygulanır", () => {
    expect(belge(odakli({}, { secilenTedarikciler: ["11"] })).map(b => b.ad)).toEqual(["Alfa Çelik"]);
  });
});

const SRC = "src";
const tumDosyalar = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? (e.name === "map" ? [] : tumDosyalar(path.join(d, e.name))) : /\.(js|jsx|mjs)$/.test(e.name) ? [path.join(d, e.name)] : []));

describe("Spec 0142 taramalar", () => {
  it("AC-24 / AC-47: `Ø` yalnız kesitMetni'nin iki dalında üretilir; olcuMetni kesitMetni'yi çağırır; sipariş dosyalarında başka Ø yok", () => {
    const sayim = {};
    for (const f of tumDosyalar(SRC)) { const n = (kodSatirlari(f).match(/Ø/g) || []).length; if (n) sayim[f] = n; }
    // Gerekçeli istisnalar: sipariş zincirinin dışında, kendi alanlarının etiketleri (kalıp çapı, bant etiketi, aktarmanın ad grubu).
    expect(sayim).toEqual({
      "src/components/ModelsManager.jsx": 1, "src/components/MalzemeManager.jsx": 1, "src/components/customers/CustomerAddEditForm.jsx": 1,
      "src/lib/siparisIhtiyaci.js": 2, "src/lib/malzemeListesiAktarma.js": 3, "src/lib/malzeme.js": 4,
    });
    const motor = kodSatirlari("src/lib/siparisIhtiyaci.js");
    expect(motor.slice(motor.indexOf("export const olcuMetni"), motor.indexOf("export { kgMetni }"))).toMatch(/kesitMetni\(bicim, kesit\)/);
  });
  it("AC-31 / AC-53: pencere giderYetki okumaz, çağıranlar geçirmez; PartManager'ın kendi giderYetki'si yerinde", () => {
    expect(kodSatirlari("src/components/stock/SiparisPenceresi.jsx")).not.toMatch(/giderYetki/);
    expect(kodSatirlari("src/components/rapor/SiparisRaporuDugmesi.jsx")).not.toMatch(/giderYetki|paraGoster/);
    expect(fs.readFileSync("src/components/stock/PartStokTab.jsx", "utf8")).not.toMatch(/giderYetki/);
    const stock = fs.readFileSync("src/components/Stock.jsx", "utf8");
    const partStok = stock.slice(stock.indexOf("<PartStokTab"), stock.indexOf("/>", stock.indexOf("<PartStokTab")));
    expect(partStok).not.toMatch(/giderYetki/);
    expect(stock).toMatch(/giderYetki/); // MakinaStokTab ve pano kullanmaya devam eder
    const pm = fs.readFileSync("src/components/PartManager.jsx", "utf8");
    expect(pm.slice(pm.indexOf("<SiparisPenceresi"), pm.indexOf("/>", pm.indexOf("<SiparisPenceresi")))).not.toMatch(/giderYetki/);
    expect((kodSatirlari("src/components/PartManager.jsx").match(/giderYetki/g) || []).length).toBeGreaterThanOrEqual(10);
  });
  it("AC-50: belge modülünde para iskeleti yok", () => {
    const k = kodSatirlari("src/lib/siparisRaporu.js");
    // Spec 0144 ile (B-R3, Karar 35): fiyatlı nüsha motorun `tutarK` ve `birimK` alanlarını okur; 0140 iskeleti yine yok.
    for (const ad of ["paraGoster", "hazirPara", "malzemePara", "tutarPb", "birimPb", "tutarTLK"]) expect(k, ad).not.toContain(ad);
    expect(k).not.toMatch(/const tl\b/);
  });
  it("AC-52 / AC-60 (kaynak): para neden sabitleri motorda durur ama ekranda ve belgede okunmaz", () => {
    for (const ad of ["MALZEMESI_ASAGIDA", "MALIYET_YOK", "NEDEN_FIYAT_YOK", "NEDEN_KUR_YOK", "NEDEN_PARA_BIRIMI"]) expect(typeof S[ad], ad).toBe("string");
    const ekran = [...tumDosyalar("src/components"), "src/lib/siparisRaporu.js"].map(kodSatirlari).join("\n");
    for (const ad of ["MALZEMESI_ASAGIDA", "MALIYET_YOK", "NEDEN_FIYAT_YOK", "NEDEN_KUR_YOK", "NEDEN_PARA_BIRIMI"]) expect(ekran, ad).not.toContain(ad);
    // Spec 0144 ile (B-R8): fiyatlı nüsha tutarı yazılamayan hücreye motorun nedenini basar; ekran yine okumaz.
    expect(tumDosyalar("src/components").map(kodSatirlari).join("\n")).not.toContain("tutarNeden");
  });
  it("AC-54: ters çevrilen 0140 kriterleri 'spec 0142 ile' notu taşır", () => {
    const rapor = fs.readFileSync("tests/siparis-raporu-0140.test.js", "utf8").split("\n");
    expect(rapor.find(l => l.includes('it("AC-44 / AC-45 / AC-90 / AC-16'))).toMatch(/spec 0142 ile/);
    const ui = fs.readFileSync("tests/ui/siparis-0140.test.jsx", "utf8").split("\n");
    for (const on of ['it("AC-15 / AC-71', 'it("AC-73 / AC-74']) expect(ui.find(l => l.includes(on)), on).toMatch(/spec 0142 ile/);
  });
});
