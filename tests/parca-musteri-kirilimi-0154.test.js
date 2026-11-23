// Spec 0154: parçanın müşteri (makina) kırılımı, saf motor ve kaynak taramaları. Ekran `ui/parca-musteri-kirilimi-0154*`,
// spec öncesi kıyas `ui/parca-musteri-kirilimi-0154-kiyas`. Test adları AC-<n> taşır.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { hesaplaAnaliz, MUSTERI_SATIR_TUR as T, MUSTERI_IBARE, HAREKET_KAYNAK, BILINMEYEN_MODEL } from "../src/lib/analiz";
import { VERI, DEALERS, ARALIK } from "./fixtures/0154-veri";

const yorumsuz = (f) => fs.readFileSync(path.resolve(f), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const tam = (o = {}, aralik = {}) => hesaplaAnaliz({ ...VERI, dealers: DEALERS, ...o }, aralik);
const parca = (v, key = "p:7") => v.parcalar.find(p => p.key === key);
const satir = (v, anahtar, key) => parca(v, key).musteriler.find(m => m.anahtar === anahtar);
const parcaVeri = (services = [], yedek = [], customers = VERI.customers, dealers = DEALERS) =>
  hesaplaAnaliz({ customers, services, yedekParcaSatislar: yedek, parts: VERI.parts, dealers }, {});

describe("Spec 0154: müşteri kırılımı motoru", () => {
  it("C1/3 / AC-34 / P2: satır şekli ve dört anahtar biçimi motorun çıktısında", () => {
    const m = parca(tam()).musteriler;
    for (const x of m) expect(Object.keys(x).sort()).toEqual(["ad", "adet", "anahtar", "hareketler", "model", "serialNo", "tur"]);
    expect(m.map(x => x.anahtar)).toEqual(["m:1", "m:3", "t:musteri:2", "m:2", "t:bayi:50", "m:5", "s:eski lokanta · s-9 (silinen müşteri)", "t:bayi:99", "m:4", "t:dis:usta servis", "x"]);
    expect(new Set(m.map(x => x.anahtar.split(":")[0]))).toEqual(new Set(["m", "t", "s", "x"]));
  });
  it("AC-6: serviste bir adet parça değişen makinanın satırı firma, model ve seri yazar, adet 1", () => {
    const v = parcaVeri([{ id: 1, customerId: 3, date: "2026-06-15", degisenParcalar: [{ partId: 7, ad: "R", miktar: 1 }] }]);
    expect(parca(v).musteriler).toEqual([{ anahtar: "m:3", ad: "BİRTAT KÖFTE", model: "AK100", serialNo: "S-101", adet: 1, tur: T.MAKINA,
      hareketler: [{ anahtar: "servis:1", kaynak: HAREKET_KAYNAK.SERVIS, kayitId: 1, tarih: "2026-06-15", adet: 1 }] }]);
  });
  it("AC-7: aynı firmanın iki makinası iki ayrı satır", () => {
    const v = tam();
    expect(satir(v, "m:1").ad).toBe("EGE ÇİFTLİK ET");
    expect(satir(v, "m:2").ad).toBe("EGE ÇİFTLİK ET");
  });
  it("AC-8 / AC-48 / R7/2: aynı makinaya iki servis tek satır, iki hareket; aynı servisin iki satırı tek hareket", () => {
    const s = satir(tam(), "m:1");
    expect(s.adet).toBe(4);
    expect(s.hareketler.map(h => [h.anahtar, h.adet])).toEqual([["servis:102", 1], ["servis:101", 3]]);
  });
  it("AC-9: miktarı boş ya da sıfır servis satırı bir sayılır", () => {
    expect(satir(tam(), "m:1").hareketler.find(h => h.kayitId === 102).adet).toBe(1);
    expect(satir(tam(), "m:2").hareketler.find(h => h.kayitId === 103).adet).toBe(1);
  });
  it("AC-10: tahsis edilen kargo miktarı tahsisin makinasına", () => {
    expect(satir(tam(), "m:3").hareketler.map(h => [h.anahtar, h.adet])).toEqual([["servis:104", 1], ["kargo:201", 2]]);
  });
  it("AC-11 / AC-37: kimliği boş ya da bulunamayan tahsis seri numarasından çözülür; model kırılımı aynı makinanın modelini alır", () => {
    const v = parcaVeri([], [{ id: 1, aliciTipi: "bayi", dealerId: 50, partId: 7, miktar: 2, tarih: "2026-06-01", tahsisler: [{ miktar: 1, customerId: null, serialNo: "S-200" }, { miktar: 1, customerId: 777, serialNo: "S-200" }] }]);
    expect(parca(v).musteriler.map(m => [m.anahtar, m.adet])).toEqual([["m:5", 2]]);
    expect(parca(v).modeller).toEqual([{ model: "AK200", adet: 2, bilinmeyen: false }]);
  });
  it("AC-12 / AC-13 / AC-33: tahsis edilmemiş miktar bayinin adıyla kendi satırında; model ve seri yok", () => {
    const s = satir(tam(), "t:bayi:50");
    expect(s).toMatchObject({ ad: "Kuzey Bayi", model: null, serialNo: null, tur: T.TAHSISSIZ, adet: 3 });
    expect(MUSTERI_IBARE.tahsissiz).toBe("Tahsis edilmedi");
  });
  it("P1: aynı alıcının iki satışı tek satır, satışlar hareket listesinde ayrı", () => {
    expect(satir(tam(), "t:bayi:50").hareketler.map(h => [h.anahtar, h.adet])).toEqual([["kargo:206", 2], ["kargo:201", 1]]);
  });
  it("AC-14: dış firma alıcının adı", () => expect(satir(tam(), "t:dis:usta servis").ad).toBe("Usta Servis"));
  it("AC-15 / AC-28: bayi kaydı bulunamayınca ya da dealers verilmeyince aliciAd'ın yedeği; motor çalışır", () => {
    expect(satir(tam(), "t:bayi:99").ad).toBe("(bayi yok)");
    const v = hesaplaAnaliz(VERI, {});
    expect(satir(v, "t:bayi:50").ad).toBe("(bayi yok)");
    expect(parca(v).musteriler.reduce((a, m) => a + m.adet, 0)).toBe(26);
  });
  it("AC-16 / AC-44 / R5/3: müşterisi çözülemeyen hareketler tek satır ve en sonda; tahsis edilmemiş satır normal sırada", () => {
    const m = parca(tam()).musteriler;
    expect(m.at(-1)).toMatchObject({ anahtar: "x", ad: MUSTERI_IBARE.cozulemeyen, tur: T.COZULEMEYEN, adet: 3 });
    expect(m.at(-1).hareketler.map(h => h.anahtar)).toEqual(["servis:106", "kargo:202"]);
    expect(m.findIndex(x => x.anahtar === "t:musteri:2")).toBe(2);
  });
  it("AC-17: satırların adet toplamı parçanın toplam adedine eşit (aşırı tahsis yokken), her parçada ve aralıkta", () => {
    for (const v of [tam(), tam({}, ARALIK), hesaplaAnaliz(VERI, ARALIK)])
      for (const p of v.parcalar.filter(p => p.key !== "p:8")) expect(p.musteriler.reduce((a, m) => a + m.adet, 0), p.key).toBe(p.toplam);
  });
  it("AC-46 / R14: aşırı tahsiste kırpma yok; müşteri toplamı model toplamıyla aynı", () => {
    const p = parca(tam(), "p:8");
    const t = (l) => l.reduce((a, m) => a + m.adet, 0);
    expect(t(p.musteriler)).toBe(t(p.modeller));
    expect(t(p.musteriler)).toBe(3);
    expect(p.toplam).toBe(2);
  });
  it("AC-18 / AC-43 / R5/2: adet azalan; eşitte firma, model, seri, anahtar (Türkçe)", () => {
    const c = [{ id: 11, name: "Çam", model: "B", serialNo: "2" }, { id: 12, name: "Çam", model: "B", serialNo: "1" }, { id: 13, name: "Çam", model: "A", serialNo: "9" }, { id: 14, name: "Cam", model: "Z", serialNo: "1" }, { id: 15, name: "Zeytin", model: "A", serialNo: "1" }];
    const sv = c.map((x, i) => ({ id: 300 + i, customerId: x.id, date: "2026-01-01", degisenParcalar: [{ partId: 7, ad: "R", miktar: x.id === 15 ? 2 : 1 }] }));
    expect(parca(parcaVeri(sv, [], c)).musteriler.map(m => m.anahtar)).toEqual(["m:15", "m:14", "m:13", "m:12", "m:11"]);
    const ikiz = [{ id: 21, name: "Aynı", model: "A", serialNo: "1" }, { id: 20, name: "Aynı", model: "A", serialNo: "1" }];
    expect(parca(parcaVeri(ikiz.map((x, i) => ({ id: 400 + i, customerId: x.id, date: "2026-01-01", degisenParcalar: [{ partId: 7, ad: "R", miktar: 1 }] })), [], ikiz)).musteriler.map(m => m.anahtar)).toEqual(["m:20", "m:21"]);
  });
  it("AC-21 / AC-49 / R7/3 / P5: hareketler tarih azalan, eşit tarihte servis önce, tarihsiz sonda", () => {
    const v = parcaVeri([{ id: 9, customerId: 3, date: "2026-05-02", degisenParcalar: [{ partId: 7, ad: "R", miktar: 1 }] },
      { id: 8, customerId: 3, date: "", degisenParcalar: [{ partId: 7, ad: "R", miktar: 1 }] }],
    [{ id: 5, aliciTipi: "bayi", dealerId: 50, partId: 7, miktar: 1, tarih: "2026-05-02", tahsisler: [{ miktar: 1, customerId: 3 }] },
      { id: 6, aliciTipi: "bayi", dealerId: 50, partId: 7, miktar: 1, tarih: "2026-06-01", tahsisler: [{ miktar: 1, customerId: 3 }] }]);
    expect(satir(v, "m:3").hareketler.map(h => h.anahtar)).toEqual(["kargo:6", "servis:9", "kargo:5", "servis:8"]);
  });
  it("AC-22 / AC-47 / R15/2: kargo hareketinin tarihi satışın tarihidir (tahsis tarihi okunmaz)", () => {
    const v = parcaVeri([], [{ id: 5, aliciTipi: "bayi", dealerId: 50, partId: 7, miktar: 1, tarih: "2026-05-02", tahsisler: [{ miktar: 1, customerId: 3, tarih: "2026-09-09" }] }]);
    expect(satir(v, "m:3").hareketler[0]).toMatchObject({ kaynak: "kargo", tarih: "2026-05-02" });
    expect(JSON.stringify(parca(v).musteriler)).not.toMatch(/2026-09-09/);
  });
  it("AC-23 / AC-24: aralık dışı ve tarihsiz kayıt aralık verildiğinde hiçbir satıra girmez; aralıksız girer", () => {
    const a = parca(tam({}, ARALIK));
    const tarihler = a.musteriler.flatMap(m => m.hareketler.map(h => h.tarih));
    expect(tarihler.every(t => t >= ARALIK.baslangic && t <= ARALIK.bitis)).toBe(true);
    expect(a.musteriler.some(m => m.anahtar === "t:bayi:99")).toBe(false);
    expect(satir(tam(), "m:5").hareketler.some(h => h.tarih === "")).toBe(true);
    expect(satir(tam({}, ARALIK), "m:5").hareketler.some(h => h.tarih === "")).toBe(false);
  });
  it("AC-25 / R16: onarım yeri Kargo olan servis müşteri kırılımına girmez", () => {
    expect(JSON.stringify(parca(tam()).musteriler)).not.toMatch(/servis:107/);
  });
  it("AC-32: alıcı müşteri ve kendi makinasına kısmi tahsiste iki satır", () => {
    expect(satir(tam(), "m:2").hareketler.map(h => [h.anahtar, h.adet])).toEqual([["kargo:203", 2], ["servis:103", 1]]);
    expect(satir(tam(), "t:musteri:2")).toMatchObject({ ad: "EGE ÇİFTLİK ET", adet: 3, tur: T.TAHSISSIZ, model: null });
  });
  it("AC-38 / AC-39 / R11/2: serbest metinli tahsis kendi satırı; metin de boşsa çözülemeyen satır", () => {
    expect(satir(tam(), "s:eski lokanta · s-9 (silinen müşteri)")).toMatchObject({ ad: "ESKİ LOKANTA · S-9 (silinen müşteri)", tur: T.SERBEST, adet: 2, model: null });
    expect(MUSTERI_IBARE.serbest).toBe("Sistemde olmayan makina");
    expect(satir(tam(), "x").hareketler.find(h => h.anahtar === "kargo:202").adet).toBe(1);
  });
  it("AC-54 / P3: boş model ve seri makina satırında '—'", () => {
    expect(satir(tam(), "m:4")).toMatchObject({ ad: "METRO MARKET", model: "—", serialNo: "—" });
  });
  it("AC-60 / C7/4: aliciAd'ın '(müşteri yok)' yedeği ile çözülemeyen satır ibaresi ayrı", () => {
    const v = parcaVeri([{ id: 1, customerId: 999, date: "2026-01-01", degisenParcalar: [{ partId: 7, ad: "R", miktar: 1 }] }],
      [{ id: 2, aliciTipi: "musteri", musteriId: 888, partId: 7, miktar: 1, tarih: "2026-01-02", tahsisler: [] }]);
    expect(parca(v).musteriler.map(m => m.ad)).toEqual(["(müşteri yok)", "Müşterisi bulunamayan hareketler"]);
  });
  it("AC-27 / AC-56: çıktıda para alanı yok", () => {
    const anahtarlar = new Set(parca(tam()).musteriler.flatMap(m => [...Object.keys(m), ...m.hareketler.flatMap(h => Object.keys(h))]));
    expect(anahtarlar).toEqual(new Set(["ad", "adet", "anahtar", "hareketler", "kaynak", "kayitId", "model", "serialNo", "tarih", "tur"]));
    expect(BILINMEYEN_MODEL).toBe("Modeli bilinmeyen");
  });
});

describe("Spec 0154: kaynak taramaları", () => {
  const motor = yorumsuz("src/lib/analiz.js"), ekran = yorumsuz("src/components/Analiz.jsx");
  it("AC-30 / AC-56 / C2: alıcı adı yalnız aliciAd'dan; motor onu yedekParcaSatis'ten alır; ikinci çözüm ve döngü yok", () => {
    expect(motor).toMatch(/import \{ aliciAd \} from "\.\/yedekParcaSatis";/);
    expect(motor).not.toMatch(/dealers\.find|disFirmaAd \|\| "\(dış firma\)"/);
    expect(ekran).not.toMatch(/aliciAd|dealers\.find/);
    const ysp = yorumsuz("src/lib/yedekParcaSatis.js");
    for (const [, yol] of ysp.matchAll(/from "\.\/([^"]+)"/g)) expect(yorumsuz(`src/lib/${yol}.js`), yol).not.toMatch(/from "\.\/analiz"/);
    expect(ysp).not.toMatch(/from "\.\/analiz"/);
  });
  it("AC-30 / AC-34: ekran satır anahtarı üretmez, sıralamaz, toplamaz; yalnız motorun alanlarını okur", () => {
    expect(ekran).not.toMatch(/`[mtsx]:\$\{/);
    expect(ekran).not.toMatch(/musteriler\.(sort|reduce|filter)\(/);
    expect(ekran).toMatch(/key=\{m\.anahtar\}/);
  });
  it("AC-35: müşteri kırılımı seçeneksiz; imzada bayrak yok", () => {
    expect(motor).toMatch(/\{ baslangic = null, bitis = null, trendModu = "ay" \} = \{\}/);
    expect(motor).not.toMatch(/musteriKirilimi|musteriler:\s*(true|false)/);
  });
  it("AC-45 / C7/2 / R7/4: ibareler motorun tek kümesinden, kaynak adları lejantın tek sabitinden", () => {
    expect(ekran).toMatch(/MUSTERI_IBARE/);
    for (const metin of ["Tahsis edilmedi", "Müşterisi bulunamayan hareketler", "Sistemde olmayan makina"]) expect(ekran).not.toContain(metin);
    expect((ekran.match(/"Serviste değişen"/g) || []).length).toBe(1);
    expect((ekran.match(/"Kargo satışı"/g) || []).length).toBe(1);
    expect(ekran).toMatch(/KAYNAK_AD\[h\.kaynak\]/);
  });
  it("AC-53 / R6/4: sekiz yalnız limit tablosunda", () => {
    expect(ekran).toMatch(/const LIMIT = \{[^}]*musteri: 8[^}]*\}/);
    expect(ekran).not.toMatch(/slice\(0,\s*8\)|limit=\{8\}/);
  });
  it("AC-31 / C5: yeni veritabanı sütunu, izin kimliği, sunucu kuralı yok", () => {
    // Kırılımın adları (musteriler, MUSTERI_SATIR_TUR, hareket kaynağı) kalıcı katmana, izin tanımına ve sunucuya girmez.
    for (const f of ["electron/db.cjs", "electron/serverAuth.cjs", "src/components/settings/serverPermissionDefs.js", "electron/server.cjs"])
      expect(fs.readFileSync(f, "utf-8"), f).not.toMatch(/MUSTERI_SATIR_TUR|MUSTERI_IBARE|HAREKET_KAYNAK|0154/);
  });
});

// Triyaj (performans): müşteri kırılımı her parça için sıralanır (C1). Karşılaştırıcı her karşılaştırmada yeniden kurulunca
// (localeCompare(…, "tr", …)) motor büyük veride 16 kat yavaşlıyordu. Karşılaştırıcı modül düzeyinde bir kez kurulur; motor
// sıralamada localeCompare çağırmaz (süreden bağımsız, deterministik ölçüm) ve büyük veride süre sınırın altındadır.
describe("Spec 0154 triyaj: müşteri kırılımının sıralama maliyeti", () => {
  const buyuk = () => {
    const customers = Array.from({ length: 3000 }, (_, i) => ({ id: i + 1, name: `Firma ${i % 700}`, model: `AK${100 + (i % 9) * 10}`, serialNo: `S-${i}` }));
    const parts = Array.from({ length: 380 }, (_, i) => ({ id: i + 1, ad: `Parça ${i}` }));
    const services = Array.from({ length: 6000 }, (_, i) => ({ id: 10000 + i, customerId: (i * 7) % 3100 + 1, date: `202${4 + (i % 3)}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
      repairPlace: "Yerinde Onarım", degisenParcalar: [{ partId: (i % 380) + 1, miktar: 1 }, { partId: ((i * 3) % 380) + 1, miktar: 2 }] }));
    const yedek = Array.from({ length: 4000 }, (_, i) => ({ id: 50000 + i, aliciTipi: i % 3 ? "bayi" : "musteri", dealerId: 50 + (i % 2), musteriId: (i % 3000) + 1,
      partId: (i % 380) + 1, miktar: 3, tarih: `2025-${String((i % 12) + 1).padStart(2, "0")}-10`, tahsisler: [{ miktar: 1, customerId: (i * 11) % 3000 + 1 }] }));
    return { customers, parts, services, yedekParcaSatislar: yedek, partSales: [], dealers: DEALERS };
  };
  it("sıralamada localeCompare çağrılmaz; karşılaştırıcı modül düzeyinde tek Intl.Collator", () => {
    const v = buyuk();
    const asil = String.prototype.localeCompare;
    let n = 0;
    String.prototype.localeCompare = function (...a) { n++; return asil.apply(this, a); };
    try { hesaplaAnaliz(v, {}); } finally { String.prototype.localeCompare = asil; }
    expect(n).toBe(0);
    expect(motorKodu()).toMatch(/^const KARSILASTIR = new Intl\.Collator\("tr", \{ numeric: true \}\);$/m);
  });
  it("3.000 makina, 6.000 servis, 4.000 kargo, 380 parça: beş çağrının ortalaması 300 ms altında", () => {
    const v = buyuk();
    hesaplaAnaliz(v, {});
    const t0 = performance.now();
    for (let i = 0; i < 5; i++) hesaplaAnaliz(v, {});
    const ort = (performance.now() - t0) / 5;
    console.log(`0154 triyaj: hesaplaAnaliz ortalaması ${Math.round(ort)} ms`);
    expect(ort).toBeLessThan(300);
  });
});
const motorKodu = () => fs.readFileSync(path.resolve("src/lib/analiz.js"), "utf-8");
