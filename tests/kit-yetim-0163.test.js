// Spec 0163: kitte yetim kalan parça satırı. Tek çözücü `urunAgaci.kitCozucuKur` (C1, C1/2, P1–P4); model maliyeti ve sipariş
// ihtiyacı onu okur, ekranlar karar yazmaz (C2). Canlı veriye bağlanmaz (AC-17): kimlikler fikstürde temsil edilir.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { kitCozucuKur, parcaKitAdetleri } from "../src/lib/urunAgaci";
import { modelMaliyetleri, partiGenelPaylari, partiHesabi, partiKapanisGoruntusu } from "../src/lib/makinaStandartMaliyet";
import { siparisIhtiyaci } from "../src/lib/siparisIhtiyaci";
import * as F from "./fixtures/0163-veri.js";
import * as V from "./fixtures/0136-veri";
import { PARCALAR as P0138 } from "./fixtures/0138-veri.js";

const harita = (parts = F.CANLI) => new Map(parts.filter(p => !p.deletedAt).map(p => [String(p.id), p]));
const coz = (kit, parts) => kitCozucuKur(harita(parts))(kit).map(x => [x.kaynak, String(x.partId), x.parca?.ad ?? null, x.satir.miktar]);
const r = (partId, ad, miktar = 1) => ({ partId, ad, miktar });
const mm = (modeller, payK = 1000) => modelMaliyetleri({ standardModels: [], customModels: modeller, parts: F.PARCALAR, malzemeler: F.MALZEMELER }, payK);
const tek = (model) => mm([model])[0];
const sip = (modeller, adet = "10", o = {}) => siparisIhtiyaci(F.SIPARIS({ modeller, satirlar: modeller.map(m => ({ model: m.model, adet })), ...o }), { tedarikciOdakli: true });
const parca = (s, id) => s.parcalar.find(p => String(p.partId) === String(id));
const oku = (p) => fs.readFileSync(p, "utf8");
const kodsuz = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n");

describe("Spec 0163: çözüm kuralı", () => {
  it("AC-1 / R1/5: kimlik canlı katalogda varsa ad eşleşmesi aranmaz (ad farklı olsa da)", () => {
    expect(coz([r("201", "Somun")])).toEqual([["kimlik", "201", "Rulman Yatağı", 1]]);
  });
  it("AC-2 / AC-4: kimliği yoksa ad kopyası kırpma + trLower ile tek canlı parçaya çözülür", () => {
    expect(coz([r("9001", "  rulman yatağı ", 1.5)])).toEqual([["ad", "201", "Rulman Yatağı", 1.5]]);
    expect(coz([r("9001", "RULMAN YATAĞI")])).toEqual([["ad", "201", "Rulman Yatağı", 1]]);
  });
  it("AC-3 / AC-40 / R1/6: çöpteki parçanın kimliği çözülmez; aynı adda canlı karşılığı yoksa R4", () => {
    expect(coz([r("208", "Eski parça")], F.PARCALAR)).toEqual([["yok", "208", null, 1]]);
  });
  it("AC-5 / AC-6 / AC-7: aksan katlaması, kısmi eşleşme, adEN ve kod yok", () => {
    expect(coz(F.AK_YOK.defaultParcalar).map(x => x[0])).toEqual(["yok", "yok", "yok", "yok"]);
  });
  it("R1/2: iç boşluk normalleştirilmez", () => {
    expect(coz([r("9", "Rulman  Yatağı")])[0][0]).toBe("yok");
  });
  it("AC-8 / R1/3: aynı katlanmış ada inen iki canlı parça varsa çözülmez", () => {
    expect(coz([r("9003", "ÇİFT")])[0][0]).toBe("yok");
  });
  it("AC-9 / R1/4: boş ya da yalnız boşluk ad çözülmez; R1: partId boş/null satır ad eşleşmesine düşer", () => {
    expect(coz([r("9004", "  "), r("9005", "")]).map(x => x[0])).toEqual(["yok", "yok"]);
    expect(coz([r(null, "Somun"), r("", "Somun"), r(undefined, "Vida")]).map(x => x.slice(0, 2))).toEqual([["ad", "210"], ["ad", "213"]]);
  });
  it("AC-41 / R2/5: aynı parçaya çözülen iki yetimden ilki kalır", () => {
    expect(coz(F.AK_IKI.defaultParcalar)).toEqual([["ad", "210", "Somun", 3], ["kimlik", "213", "Vida", 1]]);
  });
  it("R2 / P3: kimlikle çözülmüş kardeş yetimden SONRA gelse de yetim düşer", () => {
    expect(coz(F.AK_SET.defaultParcalar).map(x => x.slice(0, 2))).toEqual([["kimlik", "211"], ["ad", "212"], ["kimlik", "213"]]);
  });
  it("AC-38 / R2/4 / AC-46: adedi sıfır kardeş de düşürür; kimliği sayı olarak duran kardeş (String karşılaştırması)", () => {
    expect(coz(F.AK_SIFIR.defaultParcalar)).toEqual([["kimlik", "202", "Keçe 40", 0], ["kimlik", "205", "Pim", 3]]);
  });
  it("P2: kimlikle çözülen satır ham partId'yi (sayı dahil) aynen taşır; adla çözülen String(p.id)", () => {
    const x = kitCozucuKur(harita())([r(205, "Pim"), r("9001", "Rulman Yatağı")]);
    expect([x[0].partId, x[1].partId, x[1].hamPartId]).toEqual([205, "201", "9001"]);
  });
  it("P1 / C5: aynı katalog haritası için çözücü bir kez kurulur (WeakMap)", () => {
    const h = harita();
    expect(kitCozucuKur(h)).toBe(kitCozucuKur(h));
    expect(kitCozucuKur(harita())).not.toBe(kitCozucuKur(h));
  });
});

describe("Spec 0163: model maliyeti", () => {
  it("AC-10 / AC-11 / AC-12 / AC-13 / AC-17: Ölçüm 2 şekli; yetim satır çizilmez, eksik sayılmaz, rakam yetimsiz eşiyle birebir", () => {
    for (const m of [F.SWP_DSC, F.SWP_DS]) {
      const a = tek(m), b = tek(F.OLUSUZ(m));
      expect(a.eksikSayisi).toBe(0);
      expect(a.kit).toEqual(b.kit);
      expect([a.direktK, a.toplamK, a.oneriK]).toEqual([b.direktK, b.toplamK, b.oneriK]);
      expect(a.kit.find(x => String(x.partId) === "1784817123366").adet).toBe(1);
    }
  });
  it("AC-18 / AC-19 / AC-20: kardeşsiz yetim satır çözülen parçanın maliyetiyle, kendi (ondalık) adediyle, katalog adıyla", () => {
    const k = tek(F.AK_TEK).kit.find(x => x.partId === "201");
    expect(k).toEqual({ partId: "201", ad: "Rulman Yatağı", adet: 1.5, birimK: 4000, satirK: 6000, eksik: false, neden: null });
  });
  it("AC-22: çözülen parçanın maliyeti yoksa 'maliyetYok' dalı ('silinmiş ya da yok' değil)", () => {
    expect(tek({ model: "X", defaultParcalar: [r("9", "maliyetsiz")] }).kit[0]).toMatchObject({ partId: "209", neden: "maliyetYok", eksik: true });
  });
  it("AC-24: ne kimliği ne adı çözülen satır parcaYok, eksik, katkı 0 (kendi ad kopyasıyla)", () => {
    const m = tek(F.AK_TEK);
    expect(m.kit.filter(x => x.neden === "parcaYok").map(x => [x.ad, x.satirK])).toEqual([["Yok böyle parça", 0], ["Eski parça", 0], ["ÇİFT", 0], ["  ", 0]]);
    expect(m.eksikSayisi).toBe(4);
  });
  it("AC-37 / R3/2 / R9: set ile bileşenine adla çözülen kardeşsiz yetim satır kesişim uyarısı verir; düşen satırın kimliği kümede değil", () => {
    expect(tek(F.AK_SET).setKesisimleri).toEqual([{ setAd: "Burç seti", bilesenAd: "Burç" }]);
    expect(sip([F.AK_SET]).kesisimler).toEqual([{ setAd: "Burç seti", bilesenAd: "Burç", partId: "212" }]);
  });
  // Triyaj (bulgu 1): R3/2'nin ikinci yarısı. Setin içeriğinde silinmiş bir bileşen kimliği ("999") var; kitte o kimliği taşıyan satır
  // kardeşi (212) yüzünden düşer. Düşen satırın ham kimliği kümeye girseydi iki motor "999" adıyla sahte kesişim uyarısı verirdi.
  it("AC-37 / R3/2: R2 ile düşen satırın ham kimliği kitin kimlik kümesine girmez (iki motorda kesişim yok)", () => {
    const parts = [...F.PARCALAR, { id: 220, ad: "Ölü set", tedarikciId: 22, setIcerigi: [{ partId: "999", miktar: 1 }] }];
    const model = { model: "S999", defaultParcalar: [r("220", "Ölü set"), r("999", "Burç"), r("212", "Burç")] };
    const m = modelMaliyetleri({ standardModels: [], customModels: [model], parts, malzemeler: F.MALZEMELER }, 0)[0];
    expect(m.kit.map(x => String(x.partId))).toEqual(["220", "212"]);
    expect(m.setKesisimleri).toBeUndefined();
    const canli = parts.filter(p => !p.deletedAt);
    expect(siparisIhtiyaci(F.SIPARIS({ modeller: [model], satirlar: [{ model: "S999", adet: "10" }], parts: canli, hamParts: parts }), { tedarikciOdakli: true }).kesisimler).toEqual([]);
  });
  it("R2/4: adedi sıfır kardeş model maliyetinde çizilir (bugünkü gibi), yetim düşer", () => {
    expect(tek(F.AK_SIFIR).kit.map(x => [String(x.partId), x.adet])).toEqual([["202", 0], ["205", 3]]);
  });
  // Triyaj (bulgu 3): `Function.length` varsayılanlı parametreden sonrasını saymaz; imza kaynaktan okunur.
  it("AC-39 / C1/2: modelMaliyeti imzası kaynakta beş parametre (ad haritası parametre olarak eklenmedi)", () => {
    const imza = oku("src/lib/makinaStandartMaliyet.js").match(/export const modelMaliyeti = \(([^)]*)\) =>/)[1];
    expect(imza.split(",").map(x => x.trim().split(/\s|=/)[0])).toEqual(["model", "partMap", "payK", "tarih", "malzemeKat"]);
  });
});

describe("Spec 0163: sipariş ihtiyacı", () => {
  it("AC-14 / AC-15: yetim satır kalem üretmez, eksik sayacı yetim başına bir azalır, kardeşin alanları yetimsiz eşiyle birebir", () => {
    const a = sip([F.SWP_DSC, F.SWP_DS]), b = sip([F.OLUSUZ(F.SWP_DSC), F.OLUSUZ(F.SWP_DS)]);
    expect(a.eksik).toEqual({ parca: 0, malzeme: 0 });
    expect({ ...a, eksik: null }).toEqual({ ...b, eksik: null });
  });
  it("AC-21: kardeşsiz yetim satır çözülen parçanın ihtiyacını üretir; malzemeliyse kesit ondan", () => {
    const a = sip([F.AK_TEK]);
    expect(parca(a, "201")).toMatchObject({ ihtiyac: 15, silinmis: false });
    const m = sip([{ model: "M", defaultParcalar: [r("9", "kalıp mili", 2)] }]);
    expect(parca(m, "1784817123366")).toMatchObject({ ihtiyac: 20, malzemeli: true });
    expect(m.kesitler.length).toBe(1);
  });
  it("AC-23: çözülen parça setse patlatılır", () => {
    const s = sip([{ model: "S", defaultParcalar: [r("9", "burç seti")] }]);
    expect(parca(s, "211")).toMatchObject({ set: true, patlatildi: true });
    expect(parca(s, "212")).toMatchObject({ ihtiyac: 20 });
  });
  it("AC-25: çözülemeyen satır bugünkü silinmiş kalem davranışını sürdürür", () => {
    const s = sip([F.AK_TEK]);
    expect(parca(s, "9002")).toMatchObject({ silinmis: true, ihtiyac: null, siparis: null });
    expect(s.eksik.parca).toBe(4);
  });
  it("AC-38: adedi sıfır kardeş yetimi düşürür; o parça listede yok ve eksik sayılmaz", () => {
    const s = sip([F.AK_SIFIR]);
    expect(parca(s, "202")).toBeUndefined();
    expect(s.eksik.parca).toBe(0);
  });
  it("AC-44 / R7/2: R3 hâlinde beş türev değişir (kalem sayısı, hazirSayi, stok uyarısı, tedarikçi bölümü, seçici)", () => {
    const kardessiz = { model: "K", defaultParcalar: [r("9", "Rulman Yatağı"), r("213", "Vida")] };
    const once = { model: "K", defaultParcalar: [r("213", "Vida")] };
    const a = sip([kardessiz]), b = sip([once]);
    expect(a.parcalar.filter(p => !p.silinmis).length).toBe(b.parcalar.filter(p => !p.silinmis).length + 1);
    expect(a.hazirSayi).toBe(b.hazirSayi + 1);
    const satir = (x) => x.tedarikciBolumleri.bolumler.flatMap(bl => bl.hazirParcalar.map(h => String(h.partId)));
    expect(satir(a)).toContain("201");
    expect(satir(b)).not.toContain("201");
  });
});

describe("Spec 0163: değişmeyenler", () => {
  it("P9 (TY kararı): 0138 kıyasının verisindeki kazara yetim satır (0097 OZ kiti, 0135 kataloğu) artık 74 numaralı Rulman'a bağlanır", () => {
    const m = modelMaliyetleri({ standardModels: [], customModels: V.OZEL, parts: P0138, malzemeler: [] }, 0)[0];
    expect(m.kit.map(x => [String(x.partId), x.ad, x.eksik])).toEqual([["74", "Rulman", false]]);
  });
  it("AC-27: parça kartının adet satırı kimlikle arar (yetim satırı görmez)", () => {
    expect(parcaKitAdetleri(1784817123366, [[F.SWP_DSC, F.SWP_DS]])).toEqual({ SWP140_DSC: 1, SWP140_DS: 1 });
    expect(parcaKitAdetleri(201, [[F.AK_TEK]])).toEqual({});
  });
  it("AC-28 / AC-42 / R8 / R8/2: donmuş partinin kayıtlı eksik sayısı okunur; yeniden kapatınca yeni kural uygulanır", () => {
    const B = V.BUGUN;
    const yetimli = V.STANDART.map(m => ({ ...m, defaultParcalar: [{ partId: "999", ad: m.defaultParcalar[0].ad, miktar: 1 }, ...m.defaultParcalar] }));
    const kat = { parts: V.PARCALAR, malzemeler: [], standardModels: yetimli, customModels: V.OZEL };
    const modeller = modelMaliyetleri({ ...kat }, 65000, {});
    const veri = V.veri();
    const parti = V.PARTILER[0];
    const pay = partiGenelPaylari(veri, B).partiler.find(x => String(x.id) === String(parti.id));
    const goruntu = partiKapanisGoruntusu(veri, parti, B, { katalog: kat, modeller, partiPay: pay });
    expect(Object.values(goruntu.makinalar).every(x => x.eksikSayisi === 0)).toBe(true); // yeniden kapatma: yetim sayılmaz
    // Kural öncesi kaydedilmiş görüntü: eksik sayısı 1. Okuma kayıttan, değişmez (rozet kalır).
    const eski = { ...goruntu, makinalar: Object.fromEntries(Object.entries(goruntu.makinalar).map(([k, v]) => [k, { ...v, eksikSayisi: 1 }])) };
    const h = partiHesabi({ ...parti, kapanisMaliyeti: eski }, veri, { payK: 65000, modeller, bugun: B, katalog: kat, partiPay: pay });
    expect(h.satirlar.filter(s => !s.dondurulmadi && !s.planlanan).every(s => s.eksikSayisi === 1)).toBe(true);
  });
  it("AC-30 / C3: girdiler değişmez (hiçbir kayıt yazılmaz)", () => {
    const once = structuredClone({ m: F.MODELLER, p: F.PARCALAR });
    mm(F.MODELLER); sip(F.MODELLER);
    expect({ m: F.MODELLER, p: F.PARCALAR }).toEqual(once);
  });
});

describe("Spec 0163: tek kaynak (taramalar)", () => {
  const src = (d) => fs.readdirSync(d, { recursive: true }).filter(f => /\.(js|jsx)$/.test(f)).map(f => `${d}/${f}`);
  it("AC-31 / C1: kit satırını adla çözen ikinci kopya yok (kitAdAnahtari ve ad haritası yalnız urunAgaci.js'te)", () => {
    const disarida = src("src").filter(f => f !== "src/lib/urunAgaci.js" && /kitAdAnahtari|KIT_COZUCU_ONBELLEK/.test(oku(f)));
    expect(disarida).toEqual([]);
    const tuketiciler = src("src").filter(f => /kitCozucuKur\(/.test(kodsuz(oku(f)))).sort();
    expect(tuketiciler).toEqual(["src/components/stock/MakinaStokTab.jsx", "src/lib/makinaStandartMaliyet.js", "src/lib/siparisIhtiyaci.js"]);
  });
  it("AC-32 / C2: components altında kit satırı için ad eşleştirme yazılmaz (defaultParcalar ile trLower aynı dosyada yok)", () => {
    const kotu = src("src/components").filter(f => { const t = kodsuz(oku(f)); return /defaultParcalar/.test(t) && /trLower\([^)]*\.ad\b/.test(t); });
    expect(kotu).toEqual([]);
  });
  it("AC-29: Analiz, aylık rapor, Finans ve yazdırma çözücüyü kullanmaz", () => {
    for (const f of ["src/lib/analiz.js", "src/lib/aylikRapor.js", "src/lib/printTemplates.js", "src/components/Finance.jsx"]) expect(oku(f)).not.toMatch(/kitCozucuKur/);
  });
  it("AC-27: parça kartı adedi ve malzeme listesinden aktarma çözücüyü kullanmaz", () => {
    expect(oku("src/lib/malzemeListesiAktarma.js")).not.toMatch(/kitCozucuKur/);
    expect(kodsuz(oku("src/lib/urunAgaci.js")).match(/export const parcaKitAdetleri[\s\S]*?\n};/)[0]).not.toMatch(/kitCozucuKur/);
  });
  it("R1/6: sipariş motoru çözücüyü canlı katalogla kurar (hamParca değil)", () => {
    expect(oku("src/lib/siparisIhtiyaci.js")).toMatch(/kitCozucuKur\(canliParca\)/);
  });
});
