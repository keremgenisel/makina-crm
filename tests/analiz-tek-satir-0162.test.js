// Spec 0162: Analiz'de aynı parça tek satırda. Saf motor (anahtar, partId, ad), getter casusu (C5) ve kaynak taramaları.
// Test adları AC-<n> taşır. Adetler fikstüre özgüdür; canlı veri rakamlarına bağlanmaz (Context, AC-2).
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { hesaplaAnaliz } from "../src/lib/analiz";
import { VERI, PARTS, SERVICES, YEDEK, CUSTOMERS, ADSIZ_KIMLIKLI } from "./fixtures/0162-veri";

const ham = (f) => readFileSync(f, "utf8");
const kod = (f) => ham(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const dosyalar = (kok) => readdirSync(kok).flatMap(f => { const y = path.join(kok, f); return statSync(y).isDirectory() ? dosyalar(y) : /\.(jsx?|cjs|mjs)$/.test(f) ? [y] : []; });
const v = hesaplaAnaliz(VERI, {});
const satir = (key) => v.parcalar.find(p => p.key === key);
const anahtarlar = (x) => x.parcalar.map(p => p.key);
const kos = (o) => hesaplaAnaliz({ ...VERI, ...o }, {});
const sv = (id, parcalar, customerId = 1) => ({ id, customerId, date: "2026-03-01", repairPlace: "Yerinde Onarım", degisenParcalar: parcalar });

describe("Spec 0162: birleşme (R1, R1/2, R3)", () => {
  it("AC-1 / AC-7: kimliksiz satırın adı (büyük küçük harf ve boşluk farkıyla) katalogda varsa parçanın satırına katılır, tek satır", () => {
    expect(anahtarlar(v).filter(k => /kestamid/i.test(k))).toEqual([]);
    expect(v.parcalar.filter(p => /KESTAMİD/.test(p.ad))).toHaveLength(1);
  });
  it("AC-2: birleşen satırın adedi kovaların toplamı (fikstür: 5 + 2 + 1 + 1 + 1 servis, 4 kargo)", () => {
    expect([satir("p:10").servis, satir("p:10").kargo, satir("p:10").toplam]).toEqual([10, 4, 14]);
  });
  it("AC-3: kimliği katalogda bulunamayan hareket, adı katalogda varsa aynı kuralla birleşir", () => {
    expect(satir("p:999")).toBeUndefined();
  });
  it("AC-4: adı katalogda bulunmayan kimliksiz hareket kendi satırında, adı değişmez", () => {
    expect(satir("n:serbest conta")).toMatchObject({ ad: "Serbest conta", partId: null, toplam: 3 });
  });
  it("AC-5 / AC-26: aynı ada sahip iki canlı parça birleştirmeyi durdurur; satır kendi adıyla, uyarı alanı yok", () => {
    expect(satir("n:çift ad")).toMatchObject({ ad: "Çift Ad", partId: null });
    expect(satir("p:14")).toBeUndefined();
    expect(satir("p:15")).toBeUndefined();
    expect(Object.keys(v).some(k => /uyari|belirsiz/i.test(k))).toBe(false);
  });
  it("AC-6: benzer ad birleşmez ('Rulman' ile 'Rulman 6204')", () => {
    expect(satir("n:rulman")).toBeTruthy();
    expect(satir("p:11").toplam).toBe(1); // yalnız kendi kimlikli satırı (AC-30)
  });
  it("AC-8: çöpteki parçanın adıyla eşleşme yok; süzmeyi motor yapar (çöpteki parça motora doğrudan verildi)", () => {
    expect(PARTS.find(p => p.id === 18).deletedAt).toBeTruthy();
    expect(satir("n:eski kasnak")).toMatchObject({ ad: "Eski Kasnak", partId: null });
  });
  it("AC-38: çöpteki parçanın kimliğini taşıyan hareket gösterimde onun adını okur, o ad eşleştirmeye girmez", () => {
    expect(satir("p:18")).toMatchObject({ ad: "Eski Kasnak", partId: 18 });
  });
  it("AC-9: kimliği çözülen kargo satırı parçanın satırına girer", () => {
    expect(satir("p:10").kargo).toBe(4);
  });
  it("AC-10 / AC-20: ada göre birleşen satırın adı katalog adı; girişi kimliksiz hareket oluştursa da partId doğru", () => {
    const yalniz = kos({ services: [sv(1, [{ ad: "100_ön kestamid kam", miktar: 2 }]), sv(2, [{ partId: 10, ad: "100_ÖN KESTAMİD KAM", miktar: 1 }])], yedekParcaSatislar: [] });
    expect(yalniz.parcalar).toHaveLength(1);
    expect(yalniz.parcalar[0]).toMatchObject({ key: "p:10", partId: 10, ad: "100_ÖN KESTAMİD KAM", toplam: 3 });
    const yalnizAd = kos({ services: [sv(1, [{ ad: "kayış", miktar: 1 }])], yedekParcaSatislar: [] });
    expect(yalnizAd.parcalar[0]).toMatchObject({ key: "p:20", partId: 20, ad: "Kayış" });
  });
  it("AC-20 / P1: satırın adı ve partId hareketlerin sırasından bağımsız", () => {
    const a = [{ partId: 10, ad: "Kam (servis adı)", miktar: 1 }], b = [{ ad: "100_ÖN KESTAMİD KAM", miktar: 1 }];
    const x = kos({ services: [sv(1, a), sv(2, b)], yedekParcaSatislar: [] }).parcalar;
    const y = kos({ services: [sv(2, b), sv(1, a)], yedekParcaSatislar: [] }).parcalar;
    expect(x.map(p => [p.key, p.partId, p.ad, p.toplam])).toEqual([["p:10", 10, "Kam (servis adı)", 2]]);
    expect(y.map(p => [p.key, p.partId, p.ad, p.toplam])).toEqual([["p:10", 10, "Kam (servis adı)", 2]]);
  });
  // Triyaj (bulgu 1, P1/2): satırı kimlik yolu açtıysa (ilk satır adsız, gösterim katalog adı) sonra gelen eski adlı kimlikli satır
  // adı ezmez; spec öncesinde de ilk görülen ad kalıyordu. Ezme yetkisi yalnız ada göre birleşmeyle açılmış satırdadır.
  it("AC-14 / R3/2 (triyaj bulgu 1): kimlik yoluyla açılmış adsız satırın adı sonraki adlı kimlikli hareketle ezilmez", () => {
    const r = kos({ services: ADSIZ_KIMLIKLI.slice(0, 2), yedekParcaSatislar: [] }).parcalar;
    expect(r.map(p => [p.key, p.ad, p.toplam])).toEqual([["p:20", "Kayış", 3]]);
    const ters = kos({ services: [ADSIZ_KIMLIKLI[1], ADSIZ_KIMLIKLI[0]], yedekParcaSatislar: [] }).parcalar;
    expect(ters.map(p => [p.key, p.ad])).toEqual([["p:20", "Eski Kayış Adı"]]); // spec öncesiyle aynı: ilk görülen ad
    const birlesen = kos({ services: [sv(1, [{ ad: "kayış", miktar: 1 }]), ADSIZ_KIMLIKLI[1]], yedekParcaSatislar: [] }).parcalar;
    expect(birlesen.map(p => [p.key, p.ad])).toEqual([["p:20", "Eski Kayış Adı"]]); // ada göre açılan satırı kimlikli ad ezer (AC-20)
  });
  it("AC-19: birleşen satırın partId'si katalog kaydının ham id'si, anahtarı p:<id>", () => {
    expect(satir("p:10").partId).toBe(10);
    expect(satir("p:20")).toMatchObject({ partId: 20, ad: "Kayış" });
  });
  it("AC-21: kimliği çözülen ama adı katalogdakinden farklı satırın adı değişmez", () => {
    expect(satir("p:11")).toMatchObject({ ad: "Kayış", partId: 11 }); // katalogdaki adı "Rulman 6204"
  });
  it("AC-22: yer tutucu ad eşleşmeye girmez; katalogda 'Parça' varken adsız satır onun satırına katılmaz", () => {
    expect(satir("n:parça")).toMatchObject({ ad: "Parça", partId: null, toplam: 1 });
    expect(satir("p:16")).toBeUndefined();
  });
  it("AC-23: kargoda yer tutucu eşleşmeye girmez; ölü kimlikli kargo satırı 'Yedek parça' kaydına katılmaz", () => {
    expect(satir("p:777")).toMatchObject({ ad: "Yedek parça", partId: 777, kargo: 2 });
    expect(satir("p:17")).toBeUndefined();
  });
  it("AC-24 / AC-25: eşleşmeyen ölü kimlikte anahtar, partId ve ad değişmez; aynı adlı iki ölü kimlik ayrı satırda", () => {
    expect(satir("p:900")).toMatchObject({ ad: "Sökülmüş Mil", partId: 900 });
    expect(satir("p:901")).toMatchObject({ ad: "Sökülmüş Mil", partId: 901 });
  });
  it("AC-27: düz metin satırın adı metnin kendisi, kuraldan geçer; yer tutucu 'Parça' satırında birikmez", () => {
    expect(satir("p:20").toplam).toBe(1); // "Kayış" metni katalogdaki Kayış'a katıldı
    expect(satir("n:pim seti")).toMatchObject({ ad: "Pim seti", partId: null });
    expect(satir("n:parça").toplam).toBe(1); // yalnız gerçekten adsız satır
  });
  it("AC-28: silinen parçanın ölü kimliğini taşıyan hareketler aynı adla yeniden tanımlanan kaydın satırına akar", () => {
    expect(satir("p:90")).toBeUndefined();
    expect(satir("p:19")).toMatchObject({ partId: 19, ad: "Yeni Burç", toplam: 2 });
  });
  it("AC-29: aynı servisin kimlikli ve kimliksiz satırı birleşince müşteri kırılımında tek hareket, adetler toplanır", () => {
    const m = satir("p:10").musteriler.find(x => x.anahtar === "m:2");
    expect(m.hareketler.filter(h => h.kayitId === 117)).toEqual([expect.objectContaining({ adet: 2 })]);
  });
  it("AC-30: kimlik çözülüyorsa ad eşleşmesi aranmaz", () => {
    expect(SERVICES.find(s => s.id === 118).degisenParcalar[0]).toMatchObject({ partId: 11, ad: "Kayış" });
    expect(satir("p:11").toplam).toBe(1);
    expect(satir("p:20").toplam).toBe(1);
  });
  it("AC-31: katlama trLower; aksan katlanmaz ('isik' ile 'Işık' eşleşmez)", () => {
    expect(satir("n:isik")).toBeTruthy();
    expect(satir("p:13")).toBeUndefined();
  });
  it("AC-32: katalog kaydının adındaki baştaki ve sondaki boşluk da yok sayılır", () => {
    expect(satir("p:12")).toMatchObject({ partId: 12, toplam: 1 });
  });
  it("AC-33: adEN eşleşmeye girmez", () => {
    expect(satir("n:seal kit")).toMatchObject({ partId: null });
  });
  it("AC-11: bütün satırların adet toplamı spec öncesiyle aynı (fikstürde 34)", () => {
    const beklenen = SERVICES.reduce((a, s) => a + s.degisenParcalar.reduce((b, p) => b + (Number(p?.miktar) > 0 ? Number(p.miktar) : 1), 0), 0) + YEDEK.reduce((a, s) => a + s.miktar, 0);
    expect(v.parcalar.reduce((a, p) => a + p.toplam, 0)).toBe(beklenen);
    expect(beklenen).toBe(34);
  });
  it("AC-12: Model kırılımı birleşen satırda iki kaynağın modellerini birlikte gösterir", () => {
    expect(Object.fromEntries(satir("p:10").modeller.map(m => [m.model, m.adet]))).toEqual({ AK100: 6, AK120: 8 }); // AK100: 5 + 1 (ölü kimlik); AK120: 2 + 2 servis, 4 kargo tahsisi
  });
  it("AC-13: Müşteri kırılımı birleşen satırda iki kaynağın makinalarını birlikte gösterir", () => {
    expect(satir("p:10").musteriler.map(m => m.anahtar).sort()).toEqual(["m:1", "m:2"]);
  });
  it("AC-34: eşit toplamlı satırların sırası ekleme sırasında; ikincil ölçüt yok", () => {
    const birler = v.parcalar.filter(p => p.toplam === 1).map(p => p.key);
    expect(birler).toEqual(["p:900", "p:901", "n:rulman", "n:isik", "p:12", "n:seal kit", "n:çift ad", "n:parça", "p:20", "n:pim seti", "n:eski kasnak", "p:18", "p:11"]);
    expect(kod("src/lib/analiz.js")).toMatch(/\.sort\(\(a, b\) => b\.toplam - a\.toplam\);/);
  });
  it("AC-35: katalog boşken hiçbir birleşme olmaz", () => {
    const bos = hesaplaAnaliz({ ...VERI, parts: [] }, {});
    expect(bos.parcalar.some(p => p.key === "n:100_ön kestamid kam")).toBe(true);
    expect(bos.parcalar.find(p => p.key === "p:10").toplam).toBe(10); // yalnız kimlikliler (5 + 1 servis, 4 kargo)
  });
});

describe("Spec 0162: getter casusu (C5, P2)", () => {
  it("AC-15: her katalog kaydının ad alanı tam bir kez okunur (hareket başına katalog taranmaz)", () => {
    const sayac = new Map();
    const casus = PARTS.map(p => { const o = { ...p }; delete o.ad; let ad = p.ad; Object.defineProperty(o, "ad", { enumerable: true, get() { sayac.set(p.id, (sayac.get(p.id) || 0) + 1); return ad; }, set(x) { ad = x; } }); return o; });
    const cok = Array.from({ length: 200 }, (_, i) => sv(1000 + i, [{ partId: 10, miktar: 1 }, { ad: "kayış", miktar: 1 }, { partId: 18, miktar: 1 }]));
    hesaplaAnaliz({ customers: CUSTOMERS, services: [...SERVICES, ...cok], partSales: [], yedekParcaSatislar: YEDEK, parts: casus }, {});
    for (const p of PARTS) expect(sayac.get(p.id), String(p.id)).toBe(1);
  });
});

describe("Spec 0162: kaynak taramaları", () => {
  it("AC-16: motorun tek tüketicisi Analiz.jsx", () => {
    const gecen = dosyalar("src").filter(f => /from\s+"[./]*\/?lib\/analiz"|from\s+"\.\/analiz"/.test(ham(f))).map(f => f.split(path.sep).join("/"));
    expect(gecen).toEqual(["src/components/Analiz.jsx"]);
  });
  it("AC-17: motor hiçbir yere yazmaz; Analiz yazıcı prop'u almaz", () => {
    expect(kod("src/lib/analiz.js")).not.toMatch(/\bset[A-Z]\w*\(|crmStorage|logAction|writeFile/);
    expect(kod("src/components/Analiz.jsx")).toMatch(/export const Analiz = \(\{ customers = \[\], services = \[\], partSales = \[\], yedekParcaSatislar = \[\], parts = \[\], dealers = \[\], appSettings = \{\} \}\)/);
  });
  it("AC-18: yeni alan, veri bölümü, izin ve sunucu kuralı yok", () => {
    for (const f of ["electron/db.cjs", "electron/serverAuth.cjs", "electron/server.cjs", "src/lib/merge.js", "src/components/settings/serverPermissionDefs.js", "src/lib/permissions.js"])
      expect(ham(f), f).not.toMatch(/spec 0162|parcaCoz|adHaritasi/);
  });
  it("C1 / C3 / AC-31: karar tek yerde; aramaNormalize motorda kullanılmaz, ekran anahtar ayrıştırmaz", () => {
    const m = kod("src/lib/analiz.js");
    expect(m.match(/const parcaCoz = /g)).toHaveLength(1);
    expect(m).not.toMatch(/aramaNormalize/);
    expect(kod("src/components/Analiz.jsx")).not.toMatch(/\.key\.(slice|split|startsWith|replace)|parcaCoz|adHaritasi/);
  });
});
