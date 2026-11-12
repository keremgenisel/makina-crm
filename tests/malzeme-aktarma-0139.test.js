// Spec 0139 B: malzeme listesinden parça içe aktarmanın saf modülü (`lib/malzemeListesiAktarma.js`). Sentetik kaynak (karar 45).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import * as XLSX from "xlsx";
import * as A from "../src/lib/malzemeListesiAktarma";
import { agirlikKg, malzemeKatalogu } from "../src/lib/malzeme";
import { parcaMaliyetKurus, setKatalogu } from "../src/lib/urunAgaci";
import { kurus } from "../src/lib/gider";
import { kaynakSayfalar, kaynakSatirlari, kaynakKitap, KARTLAR, MODELLER, OZEL_MODELLER, SAYFA_ADLARI } from "./fixtures/0139-kaynak";

const kimlik = () => { let n = 1000; return () => ++n; };
const plan = (o = {}) => A.aktarmaPlani({ sayfalar: kaynakSayfalar(), malzemeler: KARTLAR, parts: [], standardModels: MODELLER, customModels: OZEL_MODELLER, yeniId: kimlik(), ...o });
const parca = (p, ad) => p.parcalar.find(x => x.ad === ad);
const kalem = (p, ad) => parca(p, ad)?.maliyetKalemleri[0];
const kit = (p, ad) => p.kitler.find(k => k.ad === ad)?.adetler || {};
const DORT = ["AK100_DS", "AK100_DSC", "AK120_DS", "AK120_DSC"];
const IKI_140 = ["AK140_DSC", "SWP140_DSC"];
const girdi = (modelAdet) => ({ ...A.varsayilanGirdiler(), modelAdet: { ...A.varsayilanGirdiler().modelAdet, ...modelAdet } });

describe("Spec 0139 B: ayrıştırma ve biçim (Ek 3, karar 30)", () => {
  it("AC-23: paslanmazda G = Ø, H = 60, K = 175 olan satır yuvarlak mil, çap 60, boy 175", () => {
    expect(kalem(plan(), "UZUN MİL A")).toMatchObject({ bicim: "mil", cap: 60, boy: 175 });
  });
  it("AC-24: plastikte DELRİN LEVHA, K = 70, J = 390, O = 390 olan satır sac: kalınlık 70, en 390, boy 390", () => {
    expect(kalem(plan(), "LEVHA PARÇA")).toMatchObject({ bicim: "sac", kalinlik: 70, en: 390, boy: 390 });
  });
  it("AC-25: plastikte POM DELRİN, J = 150, O = 42 olan satır yuvarlak mil, çap 150, boy 42", () => {
    expect(kalem(plan(), "DELRİN MERDANE")).toMatchObject({ bicim: "mil", cap: 150, boy: 42 });
  });
  it("AC-26: plastikte DELRİN LEVHA sac, diğer plastikler yuvarlak mil (L boş olsa da biçim E'den)", () => {
    const p = plan({ girdiler: girdi({ SWP140: "10" }) });
    expect(kalem(p, "KESTAMİT KAM").bicim).toBe("mil");
    expect(kalem(p, "TEFLON YATAK").bicim).toBe("mil");
    expect(kalem(p, "DAYAMA")).toMatchObject({ bicim: "sac", kalinlik: 30, en: 20, boy: 135 });
  });
  it("AC-27 / X2: oluşan parçanın işleme payı alanları boştur; kalem 0135 biçiminde tek malzeme kalemi, adet 1", () => {
    const p = plan();
    for (const x of p.parcalar) {
      expect(x.maliyetKalemleri).toHaveLength(1);
      const k = x.maliyetKalemleri[0];
      expect(k).toMatchObject({ tur: "malzeme", adet: 1 });
      expect(k).not.toHaveProperty("yontem"); // spec 0143 ile (A-R6, AC-51): aktarma aracı yöntem yazmaz
      for (const a of ["payCap", "payKalinlik", "payGenislik", "payEn", "payBoy", "fire"]) expect(k).not.toHaveProperty(a);
      expect(x).not.toHaveProperty("malzemeSatiri");
    }
  });
  it("AC-41: ölçüsü okunamayan ve tutarsız satır atlanır, nedeni raporda; kalan satırlar yazılır", () => {
    const p = plan();
    const neden = (ad) => p.rapor.atlanan.find(a => a.ad === ad)?.neden;
    expect(neden("OKUNAMAZ")).toBe(A.N.OLCU_OKUNAMADI);
    expect(neden("TUTARSIZ")).toBe(A.N.OLCU_TUTARSIZ);
    expect(parca(p, "UZUN MİL A")).toBeTruthy();
  });
  it("karar 32: adedi sıfır satır atlanır, nedeni raporda; adı boş şablon satırı hiç okunmaz", () => {
    const p = plan();
    expect(p.rapor.atlanan.find(a => a.ad.startsWith("SIFIR ADET")).neden).toBe(A.N.ADET_SIFIR);
    expect(p.rapor.kaynakSatir).toBe(31); // adı dolu satırlar: 17 + 5 + 7 + 2
  });
  it("karar 39: hücre sayısı tek ayırıcıyla ondalık, başka biçim okunamaz", () => {
    expect(A.hucreSayisi("29.0")).toBe(29);
    expect(A.hucreSayisi("11,5")).toBe(11.5);
    expect(A.hucreSayisi("1.600.000")).toBeNull();
    expect(A.hucreSayisi("10x")).toBeNull();
  });
});

describe("Spec 0139 B: kit adedi ve model eşlemesi", () => {
  it("AC-28: 70 makinalık sayfada 70 adet olan satırın kit adedi 1", () => {
    const k = kit(plan(), "UZUN MİL A");
    for (const m of DORT) expect(k[m]).toBe(1);
  });
  it("AC-29: 70 makinalık sayfada 2 adet olan satırın kit adedi 0,029; MAKİNALIK notlu olduğu için kesirli listesine girmez", () => {
    const p = plan();
    expect(kit(p, "İNCE ÇUBUK").AK100_DS).toBe(0.029);
    expect(p.rapor.kesirli.map(r => r.ad)).not.toContain("İNCE ÇUBUK");
  });
  it("AC-30 / AC-61 / AC-63: 100_ önekli satır yalnız AK100 ile başlayan canlı modellere girer; model adedi girilince kit 1", () => {
    const p = plan({ girdiler: girdi({ AK100: "40" }) });
    expect(Object.keys(kit(p, "ÖZEL MİL")).sort()).toEqual(["AK100_DS", "AK100_DSC"]);
    expect(kit(p, "ÖZEL MİL").AK100_DS).toBe(1);
    expect(parca(p, "ÖZEL MİL").models.sort()).toEqual(["AK100_DS", "AK100_DSC"]);
  });
  it("AC-31: (120 İÇİN) ibareli satır yalnız AK120 önekli modellere girer", () => {
    const p = plan({ girdiler: girdi({ AK120: "30" }) });
    expect(Object.keys(kit(p, "ÖZEL YATAK")).sort()).toEqual(["AK120_DS", "AK120_DSC"]);
  });
  it("AC-32 / AC-64: öneksiz satır sayfanın bütün öneklerinin bütün canlı varyantlarına aynı adetle girer (çöpteki model hariç)", () => {
    const k = kit(plan(), "UZUN MİL A");
    expect(Object.keys(k).sort()).toEqual(DORT);
    expect(new Set(Object.values(k))).toEqual(new Set([1]));
    expect(k).not.toHaveProperty("AK100_ESKI");
  });
  it("AC-62: önekli satırın modeli için makina adedi girilmemişse parça kitsiz oluşur ve 'adedi doğrulanmalı' listesindedir", () => {
    const p = plan();
    // Triyaj (bulgu 2): kitsiz parça yine de hedef modellerin uyumluluk işaretini taşır (kit Makina Modelleri'nden girilebilsin).
    expect(parca(p, "ÖZEL MİL").models.sort()).toEqual(["AK100_DS", "AK100_DSC"]);
    expect(kit(p, "ÖZEL MİL")).toEqual({});
    expect(A.kitleriUygula(MODELLER, p.kitler).find(m => m.model === "AK100_DS").defaultParcalar.some(r => r.ad === "ÖZEL MİL")).toBe(false);
    expect(p.rapor.dogrulanmali.map(r => r.ad)).toContain("100_ÖZEL MİL");
  });
  it("karar 33: teyit #1'in öneksiz iki satırı AK100 önekli sayılır (0,571 yazılmaz)", () => {
    const p = plan();
    expect(kit(p, "PASLANMAZ KALIP MİLİ")).toEqual({});
    expect(p.rapor.dogrulanmali.map(r => r.ad)).toEqual(expect.arrayContaining(["PASLANMAZ KALIP MİLİ", "YAN SIYIRICI GRAMAJ İÇİN"]));
    const q = plan({ girdiler: girdi({ AK100: "40" }) });
    expect(kit(q, "PASLANMAZ KALIP MİLİ")).toEqual({ AK100_DS: 1, AK100_DSC: 1 });
  });
  it("AC-38 / B-R14: modeli belirlenemeyen satırın parçası kitsiz oluşur ve raporda listelenir", () => {
    const p = plan();
    expect(parca(p, "YANLIŞ SAYFA").models).toEqual([]); // hedef model yok: işaret de yok
    expect(p.rapor.modelsiz.map(r => r.ad)).toContain("140_YANLIŞ SAYFA");
    const r = plan({ standardModels: MODELLER.filter(m => !m.model.startsWith("AK1")) });
    expect(r.rapor.modelsiz.map(x => x.ad)).toContain("UZUN MİL A");
  });
  it("karar 35: kesirli kit (notsuz, tam sayı değil) yazılır ve listelenir", () => {
    const p = plan();
    expect(kit(p, "KESİRLİ PARÇA").AK100_DS).toBe(1.429);
    expect(p.rapor.kesirli).toEqual([expect.objectContaining({ ad: "KESİRLİ PARÇA", kit: 1.429 })]);
  });
});

describe("Spec 0139 B: ad, çakışma ve var olan parça", () => {
  it("AC-65: 100_, 120_, 140_, SWP önekleri ve (… İÇİN) ibaresi adından temizlenir", () => {
    expect(A.adTemizle("100_KALIP DİŞİ")).toEqual({ ad: "KALIP DİŞİ", onek: "AK100" });
    expect(A.adTemizle("120_YAN SIYIRICI")).toEqual({ ad: "YAN SIYIRICI", onek: "AK120" });
    expect(A.adTemizle("140_KALIP T Sİ")).toEqual({ ad: "KALIP T Sİ", onek: "AK140" });
    expect(A.adTemizle("SWP_RULMANLI MİL")).toEqual({ ad: "RULMANLI MİL", onek: "SWP140" });
    expect(A.adTemizle("SWP STEP DİŞLİ")).toEqual({ ad: "STEP DİŞLİ", onek: "SWP140" });
    expect(A.adTemizle("(120 İÇİN) 120 KALIP YATAK MİLİ")).toEqual({ ad: "KALIP YATAK MİLİ", onek: "AK120" });
    expect(A.adTemizle("M12 BAKALİT ")).toEqual({ ad: "M12 BAKALİT", onek: null });
  });
  it("AC-34 / AC-66: aynı ad ve aynı ölçü iki sayfada tek parça olur ve iki sayfanın modellerinin kitine girer", () => {
    const p = plan();
    expect(p.parcalar.filter(x => x.ad.startsWith("ORTAK MİL"))).toHaveLength(1);
    expect(Object.keys(kit(p, "ORTAK MİL")).sort()).toEqual([...DORT, ...IKI_140].sort());
  });
  it("AC-33 / AC-66: aynı ad farklı ölçüde ayrı parça; her ikisinin adına model grubu yazılır", () => {
    const p = plan();
    expect(parca(p, "FARKLI MİL (AK100-AK120)").maliyetKalemleri[0].boy).toBe(100);
    expect(parca(p, "FARKLI MİL (AK140-SWP140)").maliyetKalemleri[0].boy).toBe(150);
    expect(parca(p, "FARKLI MİL")).toBeUndefined();
  });
  it("AC-66 / B-R8/3: aynı sayfada iki öneksiz satır farklı ölçüdeyse ada ölçü yazılır", () => {
    const p = plan();
    expect(parca(p, "ÇİFT AD (Ø25×100)")).toBeTruthy();
    expect(parca(p, "ÇİFT AD (Ø25×200)")).toBeTruthy();
  });
  it("karar 34: önekli satırın eki model öneki", () => {
    const p = plan({ girdiler: girdi({ AK100: "40", AK120: "30" }) });
    const s = kaynakSayfalar();
    s[SAYFA_ADLARI.P100][24] = s[SAYFA_ADLARI.P100][8].map((v, i) => (i === 2 ? "120_ÖZEL MİL" : i === 10 ? "150" : v));
    const q = A.aktarmaPlani({ sayfalar: s, malzemeler: KARTLAR, standardModels: MODELLER, yeniId: kimlik(), girdiler: girdi({ AK100: "40", AK120: "30" }) });
    expect(parca(q, "ÖZEL MİL (AK100)")).toBeTruthy();
    expect(parca(q, "ÖZEL MİL (AK120)")).toBeTruthy();
    expect(parca(p, "ÖZEL MİL")).toBeTruthy();
  });
  it("AC-35 / AC-67: kataloğunda aynı adlı canlı parça olan satır atlanır, kit satırı da yazılmaz ve rapor ayrı sayar", () => {
    const p = plan({ parts: [{ id: 5, ad: "mevcut parça", models: [] }, { id: 6, ad: "UZUN MİL A", deletedAt: "2026-01-01" }] });
    expect(parca(p, "MEVCUT PARÇA")).toBeUndefined();
    expect(p.kitler.find(k => k.ad === "MEVCUT PARÇA")).toBeUndefined();
    expect(p.rapor.ayniAd).toEqual([{ ad: "MEVCUT PARÇA", satirlar: 1 }]);
    expect(p.rapor.atlananKit).toBe(4);
    expect(parca(p, "UZUN MİL A")).toBeTruthy(); // çöpteki aynı ad engel değil
  });
  it("AC-39 / B-R13: araç ikinci kez çalıştırılınca hiçbir parça ikinci kez oluşmaz", () => {
    const ilk = plan({ girdiler: girdi({ AK100: "40", AK120: "30", SWP140: "10" }) });
    const ikinci = plan({ parts: ilk.parcalar, girdiler: girdi({ AK100: "40", AK120: "30", SWP140: "10" }) });
    expect(ikinci.parcalar).toEqual([]);
    expect(ikinci.kitler).toEqual([]);
    expect(ikinci.rapor.ayniAd.length).toBe(ilk.parcalar.length);
  });
});

describe("Spec 0139 B: malzeme eşlemesi ve Ek 1", () => {
  it("AC-60 / karar 31: malzeme E sütunundan; E boşsa metin anahtar sözcüğü; eşlenemeyen satır atlanır ve sayılır", () => {
    const p = plan();
    expect(kalem(p, "KESTAMİT KAM").malzemeId).toBe(905);
    expect(kalem(p, "TEFLON YATAK").malzemeId).toBe(906);
    expect(kalem(p, "UZUN MİL A").malzemeId).toBe(901);
    expect(p.rapor.atlanan.find(a => a.ad === "GARİP PARÇA").neden).toMatch(new RegExp(`^${A.N.MALZEME_YOK}`));
  });
  it("AC-36 / AC-68 / AC-70: Ek 1 satırları notundaki gerçek biçimle; borular boru kartından ve kitsiz, kazan iç çubukları lama ve kit 2", () => {
    const p = plan();
    const b1 = kalem(p, "KONVEYÖR BORUSU (AK100-AK120)");
    expect(b1).toMatchObject({ bicim: "boru", cap: 19, et: 1.5, boy: 173, malzemeId: 902 });
    expect(kalem(p, "KONVEYÖR BORUSU (AK140-SWP140)")).toMatchObject({ bicim: "boru", cap: 19, et: 1.5, boy: 222, malzemeId: 902 });
    expect(kit(p, "KONVEYÖR BORUSU (AK100-AK120)")).toEqual({});
    expect(parca(p, "KONVEYÖR BORUSU (AK100-AK120)").models.sort()).toEqual(DORT); // triyaj (bulgu 2): işaret kitsiz de yazılır
    expect(p.rapor.dogrulanmali.filter(r => r.ad.startsWith("KONVEYÖR BORUSU"))).toHaveLength(2);
    expect(kalem(p, "KAZAN İÇ ÇUBUKLARI (AK100-AK120)")).toMatchObject({ bicim: "lama", kalinlik: 10, genislik: 20, boy: 125, malzemeId: 901 });
    expect(kalem(p, "KAZAN İÇ ÇUBUKLARI (AK140-SWP140)")).toMatchObject({ bicim: "lama", kalinlik: 12, genislik: 20, boy: 155 });
    expect(kit(p, "KAZAN İÇ ÇUBUKLARI (AK100-AK120)").AK100_DS).toBe(2);
    expect(kit(p, "KAZAN İÇ ÇUBUKLARI (AK140-SWP140)").SWP140_DSC).toBe(2);
  });
  it("AC-68: üç ölçülü satırın varsayılanı sac, yalnız Ek 1'in iki kazan iç çubuğu lama", () => {
    const p = plan();
    expect(p.parcalar.filter(x => x.maliyetKalemleri[0].bicim === "lama").map(x => x.ad).sort()).toEqual(["KAZAN İÇ ÇUBUKLARI (AK100-AK120)", "KAZAN İÇ ÇUBUKLARI (AK140-SWP140)"]);
  });
  it("AC-69 / X10: oluşan parça uyumluluk işaretini taşır; fiyat kipi, kod ve tip yazılmaz", () => {
    const p = plan();
    expect(parca(p, "UZUN MİL A").models.sort()).toEqual(DORT);
    for (const x of p.parcalar) for (const a of ["fiyatKipi", "kod", "tip", "karKati", "fiyatTRY"]) expect(x).not.toHaveProperty(a);
  });
  it("B-R2/2: malzeme kartları kurulmadan ön koşul listesi döner (eksik kartlar adıyla)", () => {
    const p = plan({ malzemeler: KARTLAR.filter(k => k.id !== 902 && k.id !== 906) });
    expect(p.onKosul.sort()).toEqual(["PASLANMAZ 304 BORU", "POM TEFLON"]);
  });
  it("AC-37 / B-R11: malzemesinin fiyatı girilmemiş parça oluşur, maliyeti girilmedi, rapor sayar", () => {
    const fiyatsiz = KARTLAR.map(k => (k.id === 903 ? { id: 903, ad: k.ad, ozgulAgirlik: 1.42 } : k));
    const p = plan({ malzemeler: fiyatsiz });
    const x = parca(p, "DELRİN MERDANE");
    expect(x).toBeTruthy();
    expect(parcaMaliyetKurus(x, undefined, setKatalogu(p.parcalar), malzemeKatalogu(fiyatsiz))).toBeNull();
    expect(p.rapor.maliyetsiz).toBe(p.parcalar.filter(q => q.maliyetKalemleri[0].malzemeId === 903).length);
    expect(p.rapor.maliyetsiz).toBeGreaterThan(0);
  });
  it("AC-43: fiyatı girilmiş malzemeden parçanın maliyeti kaynağın formülüyle kabul edilen sapma içinde (mil %0,1, levha %0,01)", () => {
    const p = plan();
    const mk = malzemeKatalogu(KARTLAR); const sk = setKatalogu(p.parcalar);
    const app = (ad) => parcaMaliyetKurus(parca(p, ad), undefined, sk, mk) / 100;
    // Paslanmaz: kg = d² × L × 0,0000062 (ρ 7,894 gömülü), fire bandı Ø36 → 0,30 kg, fiyat Ø0 bandı 2,85 $, kur 50.
    const kaynakMil = (60 * 60 * 175 * 0.0000062 + 0.3) * 2.85 * 50;
    expect(Math.abs(app("UZUN MİL A") / kaynakMil - 1)).toBeLessThan(0.001);
    // Plastik yuvarlak: d² × L × 0,785 × ρ / 1e6 × 1,10; Ø150 → 175 TL.
    const kaynakDelrin = 150 * 150 * 42 * 0.785 * 1.42 / 1e6 * 1.1 * 175;
    expect(Math.abs(app("DELRİN MERDANE") / kaynakDelrin - 1)).toBeLessThan(0.001);
    // Levha: kalınlık × en × boy × ρ / 1e6 × 1,10 × 190 TL.
    const kaynakLevha = 70 * 390 * 390 * 1.42 / 1e6 * 1.1 * 190;
    expect(Math.abs(app("LEVHA PARÇA") / kaynakLevha - 1)).toBeLessThan(0.0001);
    // Kestamid Ø130 → Ø80 bandı 330 TL.
    const kaynakKam = 130 * 130 * 23 * 0.785 * 1.15 / 1e6 * 1.1 * 330;
    expect(Math.abs(app("KESTAMİT KAM") / kaynakKam - 1)).toBeLessThan(0.001);
    expect(kurus(agirlikKg("mil", { cap: 60, boy: 175 }, 7.9))).toBeGreaterThan(0);
  });
  it("AC-43 (triyaj, bulgu 3): eşik '%0,1 artı 1 kuruş'; küçük millerde kuruş yuvarlaması geometri sapmasının üstüne biner", () => {
    const mil = (cap, boy) => { const p = { id: 1, ad: "Küçük mil", maliyetKalemleri: [{ tur: "malzeme", malzemeId: 901, bicim: "mil", yontem: "kilo", cap, boy, adet: 1 }] };
      return parcaMaliyetKurus(p, undefined, setKatalogu([p]), malzemeKatalogu(KARTLAR)) / 100; };
    // Ölçümde eşiği aşan iki küçük milin ölçüleri (Ø10×103 ve Ø16×45; fire bandı Ø0 → 0 kg, fiyat 2,85 $ × 50).
    for (const [cap, boy] of [[10, 103], [16, 45]]) {
      const kaynak = cap * cap * boy * 0.0000062 * 2.85 * 50;
      const fark = Math.abs(mil(cap, boy) - kaynak);
      expect(fark, `Ø${cap}×${boy}`).toBeGreaterThan(0.001 * kaynak); // yalnız yüzde eşiği bu satırı reddederdi
      expect(fark, `Ø${cap}×${boy}`).toBeLessThanOrEqual(0.001 * kaynak + 0.01);
    }
  });
});

describe("Spec 0139 B: kaynağın okunması ve savunma (C5)", () => {
  it("AC-58: hesap yapmayan üç sayfa okunmaz ve raporda sayılır", () => {
    const p = plan();
    expect(p.rapor.kapsamDisi).toEqual(A.KAPSAM_DISI_SAYFALAR);
    expect(p.parcalar.find(x => x.ad === "ALT PLAKA")).toBeUndefined();
  });
  it("AC-40: beklenen sayfa yoksa plan hata döner ve hiçbir parça üretmez; sayfa adı trLower ile eşlenir", () => {
    const s = kaynakSayfalar(); delete s[SAYFA_ADLARI.PL140];
    const p = A.aktarmaPlani({ sayfalar: s, malzemeler: KARTLAR, standardModels: MODELLER, yeniId: kimlik() });
    expect(p.hata).toBe(A.SAYFA_YOK([SAYFA_ADLARI.PL140]));
    expect(p.parcalar).toBeUndefined();
    const k = kaynakSayfalar(); k["ak140_swp plastikler"] = k[SAYFA_ADLARI.PL140]; delete k[SAYFA_ADLARI.PL140];
    expect(A.sayfaEsle(k).eksik).toEqual([]);
  });
  it("AC-74: formül hücresi önbellekli değeriyle okunur; __proto__ adlı sayfa ve anahtar yok sayılır", () => {
    const satirlar = kaynakSatirlari();
    const wb = XLSX.utils.book_new();
    for (const [ad, s] of Object.entries(satirlar)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s), ad);
    const ws = wb.Sheets[SAYFA_ADLARI.P100];
    ws.Q7 = { t: "n", v: 70, f: "SUM(1,69)" }; // formül: önbellekli değer 70
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["x"]]), "__proto__");
    const veri = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
    const r = A.calismaKitabiniOku(XLSX, veri, { boyut: veri.length });
    expect(Object.getPrototypeOf(r.sayfalar)).toBeNull();
    expect(Object.keys(r.sayfalar)).not.toContain("__proto__");
    expect(r.sayfalar[SAYFA_ADLARI.P100][6][16]).toBe("70");
    const p = A.aktarmaPlani({ sayfalar: r.sayfalar, malzemeler: KARTLAR, standardModels: MODELLER, yeniId: kimlik() });
    expect(kit(p, "UZUN MİL A").AK100_DS).toBe(1);
  });
  it("AC-73: 20 MB'den büyük dosya okunmaz; 50.000 satırdan fazlası okunmaz", () => {
    expect(A.calismaKitabiniOku(XLSX, new Uint8Array(1), { boyut: 21 * 1024 * 1024 }).hata).toBe(A.DOSYA_BUYUK(20));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(Array.from({ length: 50001 }, (_, i) => [i])), SAYFA_ADLARI.P100);
    const veri = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
    expect(A.calismaKitabiniOku(XLSX, veri, { boyut: veri.length }).hata).toBe(A.SATIR_COK(50000));
  });
  // Triyaj (bulgu 1): sınır çevirmeden önce, sayfanın bildirdiği aralıkla uygulanır; tek hücreli ama dev aralıklı dosya hızla reddedilir.
  it("AC-73 (triyaj): tek hücreli, A1:CV1048576 aralıklı küçük dosya çevrilmeden ve hızla reddedilir", () => {
    // Fikstür bir kez üretildi (tek hücre, `!ref` A1:CV1048576, sayfa adı eşlenen paslanmaz sayfası); yazımı 30 sn sürdüğü için saklı.
    const veri = new Uint8Array(fs.readFileSync("tests/fixtures/0139-dev-aralik.xlsx"));
    expect(veri.length).toBeLessThan(50 * 1024);
    const bas = performance.now();
    expect(A.calismaKitabiniOku(XLSX, veri, { boyut: veri.length }).hata).toBe(A.SATIR_COK(50000));
    expect(performance.now() - bas).toBeLessThan(3000);
  });
  it("AC-73 (triyaj): ilgisiz ve kapsam dışı sayfalar çevrilmez, satır sınırını tüketmez", () => {
    const satirlar = kaynakSatirlari();
    satirlar["İLGİSİZ"] = Array.from({ length: 50001 }, (_, i) => [i]);
    const veri = kaynakKitap(XLSX, satirlar);
    const r = A.calismaKitabiniOku(XLSX, veri, { boyut: veri.length });
    expect(r.hata).toBeUndefined();
    expect(r.sayfalar["İLGİSİZ"]).toEqual([]);
    expect(r.sayfalar["ALÜMİNYUM"]).toEqual([]);
    expect(r.sayfalar[SAYFA_ADLARI.P100].length).toBeGreaterThan(30);
    expect(A.aktarmaPlani({ sayfalar: r.sayfalar, malzemeler: KARTLAR, standardModels: MODELLER, yeniId: kimlik() }).rapor.kapsamDisi).toEqual(A.KAPSAM_DISI_SAYFALAR);
  });
  it("AC-40: bozuk dosya okunamaz", () => {
    // xlsx paketi bozuk baytları çoğu zaman hata vermeden tek sayfalı kitap olarak okur; o zaman reddi sayfa eşlemesi yapar.
    const r = A.calismaKitabiniOku(XLSX, new Uint8Array([1, 2, 3, 4]), { boyut: 4 });
    const hata = r.hata || A.aktarmaPlani({ sayfalar: r.sayfalar, malzemeler: KARTLAR, standardModels: MODELLER, yeniId: kimlik() }).hata;
    expect(hata).toBeTruthy();
  });
  it("kitap okuyucusu ile sentetik kitap satır dizisiyle aynı planı verir", () => {
    const veri = kaynakKitap(XLSX);
    const r = A.calismaKitabiniOku(XLSX, veri, { boyut: veri.length });
    const a = A.aktarmaPlani({ sayfalar: r.sayfalar, malzemeler: KARTLAR, standardModels: MODELLER, yeniId: kimlik() });
    expect(a.parcalar).toEqual(plan({ customModels: [] }).parcalar);
  });
});

describe("Spec 0139 B: girdilerin doğrulaması (triyaj bulgu 4)", () => {
  it("parti adedi boş, ondalıklı ya da sıfırsa o sayfa için neden döner; geçerli girdide hata yok", () => {
    expect(A.partiGirdiHatalari(A.varsayilanGirdiler())).toEqual({});
    for (const v of ["", "70,5", "0", "abc"]) {
      const g = { ...A.varsayilanGirdiler(), parti: { ...A.varsayilanGirdiler().parti, [SAYFA_ADLARI.PL100]: v } };
      expect(A.partiGirdiHatalari(g), v).toEqual({ [SAYFA_ADLARI.PL100]: A.PARTI_HATASI });
    }
  });
});

describe("Spec 0139 B: kitlerin yazılması ve doğrulama turu", () => {
  it("B-R3/4: kitleriUygula kitleri kitleriGuncelle ile yazar; doğrulama turu beklenen ve bulunanı karşılaştırır (AC-72)", () => {
    const p = plan();
    const yeni = A.kitleriUygula(MODELLER, p.kitler);
    expect(yeni.find(m => m.model === "AK100_DS").defaultParcalar.find(r => r.ad === "UZUN MİL A")).toMatchObject({ miktar: 1 });
    const d = A.dogrulamaTuru(p.kitler, yeni, []);
    expect(d).toEqual({ beklenen: p.rapor.kit, bulunan: p.rapor.kit, eksik: [] });
    const kayip = yeni.map(m => (m.model === "AK140_DSC" ? { ...m, defaultParcalar: [] } : m));
    const e = A.dogrulamaTuru(p.kitler, kayip, []);
    expect(e.bulunan).toBeLessThan(e.beklenen);
    expect(e.eksik.every(x => x.model === "AK140_DSC")).toBe(true);
    expect(A.kitleriUygula(MODELLER, [])).toBe(MODELLER);
  });
});

describe("Spec 0139 C3, C4, B-R16: kaynak taramaları", () => {
  const yorumsuz = (k) => k.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  it("AC-75: saf modülde uid() ve saat okuması yok; React ve xlsx içe alınmaz", () => {
    const k = yorumsuz(fs.readFileSync("src/lib/malzemeListesiAktarma.js", "utf8"));
    expect(k).not.toMatch(/\buid\s*\(/);
    expect(k).not.toMatch(/\bDate\b|yerelBugun|today\s*\(/);
    expect(k).not.toMatch(/from\s+["'](react|xlsx)["']/);
  });
  it("C3: panel karar vermez (ayrıştırma, eşleme, kit adedi yalnız modülde)", () => {
    const k = yorumsuz(fs.readFileSync("src/components/settings/SettingsMalzemeAktar.jsx", "utf8"));
    for (const d of [/trLower\s*\(/, /partiAdediCevir/, /kitleriGuncelle/, /hucreSayisi/, /adTemizle/, /\.split\(/]) expect(k).not.toMatch(d);
  });
  it("C4: 0124'ün parça Excel şablonu ve İçe Aktar paneli bu işte değişmedi", () => {
    expect(fs.readFileSync("src/components/settings/SettingsImport.jsx", "utf8")).not.toMatch(/malzemeListesiAktarma/);
    expect(fs.readFileSync("src/lib/parcaAktarma.js", "utf8")).not.toMatch(/malzemeListesiAktarma|fireBantlari/);
  });
  it("AC-42: rapor ve önizleme ham HTML yazmaz, yazdırma yolu yok", () => {
    const k = fs.readFileSync("src/components/settings/SettingsMalzemeAktar.jsx", "utf8");
    expect(k).not.toMatch(/dangerouslySetInnerHTML|innerHTML|printHtml|appPrint/);
  });
  it("C6: yeni eylem izni ve sunucu kuralı yok", () => {
    const sa = fs.readFileSync("electron/serverAuth.cjs", "utf8");
    expect(sa).not.toMatch(/malzemeaktar|ice_aktarildi|fireBantlari/);
    expect(fs.readFileSync("src/components/settings/serverPermissionDefs.js", "utf8")).not.toMatch(/malzemeaktar/);
  });
});
