// Spec 0006: Evrak → CRM kayıt üretimi, saf plan (src/lib/evrakUretim.js) ve makina dışı yazma adımları
// (src/lib/evrakUygula.js).
import { describe, it, expect, vi } from "vitest";
import {
  teklifUretimPlani, iskontoDagit, teklifUretimDurumu, teklifKaydedildiMi, uretilenKalemBirlesimi, kalipRolu, altKalemler,
  bekleyenIsYokkenMakinaKalemleri,
} from "../src/lib/evrakUretim";
import { evrakAdimlariniYaz } from "../src/lib/evrakUygula";
import { yedekParcaRec } from "../src/lib/yedekParcaSatis";

const PARTS = [{ id: 7, ad: "Bant Motoru" }, { id: 8, ad: "Rulman" }];
const CUST = [{ id: 500, name: "Kutu Gıda", model: "AK100" }];
const DEALERS = [{ id: 3, name: "Ege Bayi" }];
let seq = 0;
const alt = (type, o = {}) => ({ id: o.id || `k${++seq}`, type, kod: "", makinaAdi: o.ad || "", miktar: String(o.miktar ?? 1), birimFiyat: String(o.fiyat ?? 0) });
const makinaSatiri = (o = {}) => ({ rowId: `r${++seq}`, pickTip: "makina", selectedModel: o.model ?? "AK100", subItems: [alt("makina", { ad: "AK100", fiyat: 60000, ...o })] });
const kalipSatiri = (o = {}) => ({ rowId: `r${++seq}`, pickTip: "kalip", selectedKalip: o.kalip ?? "Hamburger", ...(o.rol ? { kalipRolu: o.rol } : {}), subItems: [alt("kalip", { ad: o.kalip ?? "Hamburger", fiyat: 10000, ...o })] });
const parcaSatiri = (o = {}) => ({ rowId: `r${++seq}`, pickTip: "parca", selectedPart: o.partId === undefined ? "7" : o.partId, subItems: [alt("parca", { ad: "Bant Motoru", fiyat: 1000, ...o })] });
const teklif = (satirlar, o = {}) => ({ id: 900, no: "2026-00001", type: "teklif", durum: "onaylandi", currency: "TRY", iskonto: "", tarih: "2026-09-24", firma: "Kutu Gıda", customerId: 500, satirlar, ...o });
const plan = (t, o = {}) => teklifUretimPlani(t, { parts: PARTS, customers: CUST, dealers: DEALERS, factoryName: "Altuntaş", ...o });

describe("alt kalem sınıflaması (R1–R6, R18)", () => {
  it("AC-1: makina + yedek parça belgesi: makina adımı ve yedek parça kaydı birlikte; hiçbir kalem sessizce atlanmaz", () => {
    const p = plan(teklif([makinaSatiri(), parcaSatiri()]));
    expect(p.makina).toMatchObject({ model: "AK100", hedef: { tip: "mevcut", musteriId: 500 } });
    expect(p.yedekParcaKayitlari).toHaveLength(1);
    expect(p.atlananlar).toEqual([]);
  });
  it("AC-2: makinayla verilen kalıp makinanın kalıp listesine gider, Extra Kalıp üretmez; tutarı makina bedeline katılır (E8)", () => {
    const p = plan(teklif([makinaSatiri(), kalipSatiri()]));
    expect(p.kalipKayitlari).toEqual([]);
    expect(p.makina.kaliplar.map(k => k.ad)).toEqual(["Hamburger"]);
    expect(p.makina.bedel).toBe(70000);
  });
  it("AC-3: makinasız belgede kalıp Extra Kalıp satışı olur", () => {
    const p = plan(teklif([kalipSatiri()]));
    expect(p.kalipKayitlari).toEqual([expect.objectContaining({ ad: "Hamburger", ucret: 10000, satisFirma: "Altuntaş" })]);
  });
  it("AC-4: aynı belgede makinayla verilen ve Extra Kalıp ayrı ayrı; ayrım satır sırasından bağımsız (E1)", () => {
    const k1 = kalipSatiri({ kalip: "Hamburger" }), k2 = kalipSatiri({ kalip: "Köfte", rol: "extra" });
    for (const satirlar of [[makinaSatiri(), k1, k2], [k2, k1, makinaSatiri()]]) {
      const p = plan(teklif(satirlar));
      expect(p.makina.kaliplar.map(k => k.ad)).toEqual(["Hamburger"]);
      expect(p.kalipKayitlari.map(k => k.ad)).toEqual(["Köfte"]);
    }
  });
  it("E1: eski gruplu satırda makinayla aynı satırdaki kalıp zorunlu olarak 'makinayla'", () => {
    const row = { rowId: "g", selectedModel: "AK100", selectedKalip: "Hamburger", kalipRolu: "extra", subItems: [alt("makina", { fiyat: 1 }), alt("kalip", { fiyat: 1 })] };
    expect(kalipRolu(row, true)).toBe("makinayla");
    expect(kalipRolu({ subItems: [] }, false)).toBe("extra");
    expect(kalipRolu({ subItems: [] }, true)).toBe("makinayla");
  });
  it("AC-5 / AC-31: katalog parçası gerçek yedek parça kaydı; makina satırındaki parça da (özette belirtilir)", () => {
    const grup = { rowId: "g", selectedModel: "AK100", selectedPart: "8", subItems: [alt("makina", { fiyat: 50000 }), alt("parca", { ad: "Rulman", fiyat: 300, miktar: 2 })] };
    const p = plan(teklif([grup]));
    expect(p.yedekParcaKayitlari).toEqual([expect.objectContaining({ partId: "8", miktar: 2, makinaSatirindan: true, aliciTipi: "musteri", musteriId: 500 })]);
  });
  it("AC-8: serbest metin parça kayıt üretmez, adı ve nedeni atlananlarda", () => {
    const p = plan(teklif([parcaSatiri({ partId: "", ad: "Özel conta" })]));
    expect(p.yedekParcaKayitlari).toEqual([]);
    expect(p.atlananlar).toEqual([expect.objectContaining({ ad: "Özel conta", neden: expect.stringMatching(/Katalogda karşılığı olmayan/) })]);
  });
  it("AC-21 / AC-26: türü belirsiz kalem (modelsiz makina, tanımsız tür) kayda dönüşmez; yalnız belirsizse üretilecek yok", () => {
    const p = plan(teklif([makinaSatiri({ model: "" }), { rowId: "x", subItems: [{ id: "d1", type: "", makinaAdi: "Nakliye", miktar: "1", birimFiyat: "500" }] }]));
    expect(p.uretilecekVar).toBe(false);
    expect(p.atlananlar.map(a => a.neden)).toEqual([expect.stringMatching(/Türü belirsiz: makina modeli/), expect.stringMatching(/Türü belirsiz alt kalem/)]);
  });
  it("AC-32: bant alt kalemi kayıt üretmez, özet belirtir", () => {
    const p = plan(teklif([{ rowId: "b", subItems: [alt("bant", { ad: "Konveyör bandı", fiyat: 200 })] }]));
    expect(p.atlananlar).toEqual([expect.objectContaining({ ad: "Konveyör bandı", neden: expect.stringMatching(/Bant/) })]);
  });
  it("AC-27: hiç satırı olmayan belge hata vermez, 'boş' döner", () => {
    expect(plan(teklif([])).bos).toBe(true);
  });
  it("AC-20: üretilen yedek parça panoya düşmez (kargoDurum boş)", () => {
    const sets = fakeSetters();
    evrakAdimlariniYaz(teklif([parcaSatiri()]), plan(teklif([parcaSatiri()])), null, sets.deps);
    expect(sets.durum.yedekParcaSatislar[0].kargoDurum).toBe("");
  });
  it("AC-44: USD belge → USD ve 'Faturalı Yurtdışı'", () => {
    const p = plan(teklif([parcaSatiri()], { currency: "USD" }));
    expect(p).toMatchObject({ currency: "USD", faturaTipi: "Faturalı Yurtdışı" });
  });
});

describe("iskonto dağıtımı (R11, E7)", () => {
  const k = (id, fiyat, miktar = 1) => ({ kalemId: id, item: { birimFiyat: String(fiyat), miktar: String(miktar) } });
  it("AC-13: 60.000 + 40.000, iskonto 10.000 → 54.000 ve 36.000", () => {
    const r = iskontoDagit([k("a", 60000), k("b", 40000)], "10000");
    expect(r.kalemler.get("a").netK / 100).toBe(54000);
    expect(r.kalemler.get("b").netK / 100).toBe(36000);
  });
  it("AC-14: kuruş artığı miktarı 1 olan en büyük kaleme; toplam iskontolu toplama tam eşit", () => {
    const r = iskontoDagit([k("a", 100), k("b", 100), k("c", 100)], "100");
    const toplam = [...r.kalemler.values()].reduce((s, v) => s + v.birimK * v.miktar, 0);
    expect(toplam).toBe(20000);
    expect(r.yuvarlamaFarki).toBe(0);
  });
  it("AC-37: 2 × 30.000 kalemine 6.000 iskonto payı → birim 27.000, toplam 54.000", () => {
    const r = iskontoDagit([k("a", 30000, 2), k("b", 40000)], "10000");
    expect(r.kalemler.get("a")).toMatchObject({ birimK: 2700000, miktar: 2 });
    expect(r.kalemler.get("a").birimK * 2 / 100).toBe(54000);
  });
  it("E7: miktarı > 1 kalemde bölünmeyen kuruşlar miktarı 1 olan kaleme yazılır; yoksa yuvarlama farkı", () => {
    const r = iskontoDagit([k("a", 100, 3), k("b", 50)], "1");
    const toplam = [...r.kalemler.values()].reduce((s, v) => s + v.birimK * v.miktar, 0);
    expect(toplam).toBe(34900);
    const r2 = iskontoDagit([k("a", 100, 3)], "1");
    expect(r2.yuvarlamaFarki).toBeGreaterThan(0);
  });
});

describe("bayi alıcı (R12–R14)", () => {
  const bayiT = (satirlar, o = {}) => teklif(satirlar, { aliciTipi: "bayi", dealerId: 3, customerId: null, ...o });
  it("AC-15: bayi belgesinde parça, alıcısı o bayi olan yedek parça kaydı", () => {
    expect(plan(bayiT([parcaSatiri()])).yedekParcaKayitlari[0]).toMatchObject({ aliciTipi: "bayi", dealerId: 3 });
  });
  it("AC-16: nihai müşteri yoksa kalıp ve makina üretilmez, nedeni söylenir", () => {
    const p = plan(bayiT([kalipSatiri(), makinaSatiri()]));
    expect(p.kalipKayitlari).toEqual([]);
    expect(p.makina).toBeNull();
    expect(p.atlananlar.every(a => /nihai müşteri seçilmemiş/.test(a.neden))).toBe(true);
  });
  it("AC-17: nihai müşteri seçili → Extra Kalıp o müşteriye, satış yapan firma bayi", () => {
    const p = plan(bayiT([kalipSatiri({ rol: "extra" })], { nihaiMusteriId: 500 }));
    expect(p.kalipKayitlari[0]).toMatchObject({ satisFirma: "Ege Bayi" });
    expect(p.hedefMusteriId).toBe(500);
  });
  it("AC-40 (plan): bayi belgesinde makina adımı satış yapan firma olarak bayiyi taşır", () => {
    expect(plan(bayiT([makinaSatiri()], { nihaiMusteriId: 500 })).makina.satisYapan).toBe("Ege Bayi");
  });
});

describe("izinler, ya hep ya hiç (R8, E12)", () => {
  it("AC-9 / AC-34: eksik izinler adıyla listelenir", () => {
    const p = plan(teklif([parcaSatiri(), kalipSatiri(), makinaSatiri()]), { canDo: (id) => id !== "yedek_parca_add", musterilerSekmesi: false });
    expect(p.eksikIzinler.map(e => e.id).sort()).toEqual(["musteriler_sekmesi", "yedek_parca_add"]);
  });
  it("AC-9 (yazma): geçersiz tek kalem varsa hiçbir kayıt ve stok hareketi yazılmaz", () => {
    const sets = fakeSetters();
    const t = teklif([parcaSatiri(), kalipSatiri({ rol: "extra" })]);
    const p = plan(t);
    p.yedekParcaKayitlari[0].partId = null; // doğrulamada düşecek
    const r = evrakAdimlariniYaz(t, p, null, sets.deps);
    expect(r.hata).toBeTruthy();
    expect(sets.durum.yedekParcaSatislar).toEqual([]);
    expect(sets.durum.partSales).toEqual([]);
    expect(sets.durum.partStockLog).toEqual([]);
  });
});

describe("mükerrer koruma ve durum (R10, E3, E10)", () => {
  const t = teklif([makinaSatiri({ id: "m" }), parcaSatiri({ id: "p" }), kalipSatiri({ id: "k", rol: "extra" })]);
  it("AC-11 / AC-12: kısmen kaydedilen belge yeniden kaydedilince yalnız eksikler", () => {
    const kismen = { ...t, uretilenKalemler: ["p", "k"] };
    expect(teklifUretimDurumu(kismen, { parts: PARTS })).toBe("kismen");
    const p = plan(kismen);
    expect(p.yedekParcaKayitlari).toEqual([]);
    expect(p.kalipKayitlari).toEqual([]);
    expect(p.makina?.kalemId).toBe("m");
    expect(teklifUretimDurumu({ ...t, uretilenKalemler: ["p", "k", "m"] }, { parts: PARTS })).toBe("kaydedildi");
  });
  it("AC-30: tamamı üretilmiş belgede plan hiçbir adım üretmez (stok ikinci kez düşmez)", () => {
    const p = plan({ ...t, uretilenKalemler: ["m", "p", "k"] });
    expect(p.uretilecekVar).toBe(false);
  });
  it("AC-35: iki istemcinin listeleri birleşir; değişiklik yoksa aynı referans", () => {
    const a = ["p"];
    expect(uretilenKalemBirlesimi(a, ["k", "p"])).toEqual(["p", "k"]);
    expect(uretilenKalemBirlesimi(a, ["p"])).toBe(a);
    expect(uretilenKalemBirlesimi(undefined, [])).toBeUndefined();
  });
  it("AC-36: belgeden silinmiş üretilmiş kalem uyarıda; kayıt otomatik silinmez", () => {
    const p = plan({ ...teklif([parcaSatiri({ id: "p" })]), uretilenKalemler: ["p", "eski"] });
    expect(p.silinmisUretilenler).toEqual(["eski"]);
  });
  it("E10: eski belge (liste yok) satisTamam ile kaydedilmiş sayılır ve yeniden üretmez", () => {
    expect(plan({ ...t, satisTamam: true }).eskiKaydedildi).toBe(true);
    expect(teklifKaydedildiMi({ ...t, satisTamam: true })).toBe(true);
  });
  it("DoD: kullanıldı kontrolü yedek parça teklifId bağını görür; kısmen belge kullanılmamış sayılır", () => {
    const eski = teklif([parcaSatiri()], { id: 777 });
    expect(teklifKaydedildiMi(eski, { yedekParcaSatislar: [{ id: 1, teklifId: 777 }] })).toBe(true);
    expect(teklifKaydedildiMi({ ...t, uretilenKalemler: ["p"] }, { parts: PARTS })).toBe(false);
  });
});

describe("yazma adımları ortak yollarla (C3, C4)", () => {
  it("AC-6 / AC-7: üretilen yedek parça elle girilenle aynı alanlar (yedekParcaRec) + stok düşümü ve hareket", () => {
    const sets = fakeSetters({ partStock: [{ id: 1, partId: "7", miktar: 10 }] });
    const t = teklif([parcaSatiri({ miktar: 3, fiyat: 1000 })]);
    const r = evrakAdimlariniYaz(t, plan(t), null, sets.deps);
    expect(r.ids).toHaveLength(1);
    const kayit = sets.durum.yedekParcaSatislar[0];
    const elle = yedekParcaRec({ aliciTipi: "musteri", musteriId: 500, partId: "7", miktar: 3, birimFiyat: 1000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-09-24" }).rec;
    for (const alan of Object.keys(elle)) expect(kayit, alan).toHaveProperty(alan);
    expect(kayit).toMatchObject({ aliciTipi: "musteri", musteriId: 500, partId: "7", miktar: 3, birimFiyat: 1000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-09-24", teklifId: 900 });
    expect(sets.durum.partStock[0].miktar).toBe(7);
    expect(sets.durum.partStockLog[0]).toMatchObject({ tip: "bayi_satis", miktar: -3 });
  });
  it("AC-3 (yazma) / AC-23: Extra Kalıp partSales 'Kalıp' + müşteri kalıp listesine extra; hiçbir yol 'Parça' türü üretmez", () => {
    const sets = fakeSetters();
    const t = teklif([kalipSatiri({ rol: "extra", id: "kx" }), parcaSatiri()]);
    evrakAdimlariniYaz(t, plan(t), null, sets.deps);
    expect(sets.durum.partSales).toEqual([expect.objectContaining({ tur: "Kalıp", ad: "Hamburger", customerId: 500, teklifId: 900, teklifKalemId: "kx", ucret: 10000 })]);
    expect(sets.durum.partSales.some(p => p.tur === "Parça")).toBe(false);
    expect(sets.durum.customers[0].kaliplar).toEqual([{ ad: "Hamburger", olcu: "", partSaleId: sets.durum.partSales[0].id }]);
  });
  it("AC-10 (yazma): müşteri formundan gelen yeni müşteri kimliğiyle kalan adımlar ona bağlanır", () => {
    const sets = fakeSetters({ customers: [...CUST, { id: 501, name: "Yeni" }] });
    const t = teklif([makinaSatiri({ id: "m" }), parcaSatiri()], { customerId: null });
    const p = plan({ ...t, uretilenKalemler: ["m"] }, { musteriId: 501 });
    evrakAdimlariniYaz(t, { ...p, makina: null }, 501, sets.deps);
    expect(sets.durum.yedekParcaSatislar[0]).toMatchObject({ aliciTipi: "musteri", musteriId: 501 });
  });
});

describe("triyaj düzeltmeleri (0006)", () => {
  it("bulgu 1: belgeye fromTeklifId ile bağlı canlı makina kaydı, listede olmayan makinanın üretildiğinin kanıtıdır; form ikinci kez açılmaz", () => {
    const t = teklif([makinaSatiri({ id: "m" }), kalipSatiri({ id: "k" }), parcaSatiri({ id: "p" })]);
    const bagli = [...CUST, { id: 501, name: "Kutu Gıda", model: "AK100", fromTeklifId: 900 }];
    const p = plan(t, { customers: bagli });
    expect(p.makina).toBeNull();
    expect(p.kanitlaUretilen.sort()).toEqual(["k", "m"]);
    expect(p.yedekParcaKayitlari.map(r => r.kalemId)).toEqual(["p"]);
    expect(teklifUretimDurumu(t, { parts: PARTS, customers: bagli })).toBe("kismen");
    expect(teklifKaydedildiMi(t, { parts: PARTS, customers: bagli })).toBe(false);
  });
  it("bulgu 1: çöpteki bağlı kayıt kanıt sayılmaz; listedeki makinalar kanıtı tüketir (iki makinalı belge)", () => {
    const t = teklif([makinaSatiri({ id: "m1" }), makinaSatiri({ id: "m2" })]);
    expect(plan(t, { customers: [...CUST, { id: 9, fromTeklifId: 900, deletedAt: "x" }] }).makina.kalemId).toBe("m1");
    const birUretildi = { ...t, uretilenKalemler: ["m1"] };
    expect(plan(birUretildi, { customers: [...CUST, { id: 9, fromTeklifId: 900 }] }).makina.kalemId).toBe("m2");
    expect(plan(birUretildi, { customers: [...CUST, { id: 9, fromTeklifId: 900 }, { id: 10, fromTeklifId: 900 }] }).kanitlaUretilen).toEqual(["m2"]);
  });
  it("bulgu 1: bekleyen iş yokken form kaydı ilk bekleyen makinayı ve onunla giden kalıbı işaretler", () => {
    const t = teklif([makinaSatiri({ id: "m" }), kalipSatiri({ id: "k", miktar: 2 }), parcaSatiri({ id: "p" })]);
    expect(bekleyenIsYokkenMakinaKalemleri(t, { parts: PARTS, customers: CUST }).sort()).toEqual(["k", "m"]);
  });
  it("bulgu 2: 1.000 × 3 kalıp → 3 ayrı Extra Kalıp kaydı birim fiyatla; makinayla kalıp miktar kadar listeye", () => {
    const p = plan(teklif([kalipSatiri({ id: "k", fiyat: 1000, miktar: 3, rol: "extra" })]));
    expect(p.kalipKayitlari.map(k => k.ucret)).toEqual([1000, 1000, 1000]);
    const m = plan(teklif([makinaSatiri(), kalipSatiri({ id: "k2", miktar: 2 })]));
    expect(m.makina.kaliplar).toHaveLength(2);
    expect(m.makina.bedel).toBe(80000);
    expect(plan(teklif([kalipSatiri({ miktar: 1.5 })])).atlananlar[0].neden).toMatch(/Kalıp miktarı/);
  });
  it("bulgu 2 (yazma): 3 adet → 3 partSales ve müşterinin kalıp listesinde 3 giriş; alt kalem kimliği bir kez işaretlenir", () => {
    const sets = fakeSetters();
    const t = teklif([kalipSatiri({ id: "k", fiyat: 1000, miktar: 3, rol: "extra" })]);
    const r = evrakAdimlariniYaz(t, plan(t), null, sets.deps);
    expect(sets.durum.partSales).toHaveLength(3);
    expect(sets.durum.customers[0].kaliplar).toHaveLength(3);
    expect(sets.durum.customers[0].kalipSayisi).toBe(3);
    expect(r.ids).toEqual(["k"]);
  });
  it("bulgu 3: yalnız bant / belirsiz / boş belge 'gerekmiyor'; bekleyen sayılmaz", () => {
    const bant = teklif([{ rowId: "b", subItems: [alt("bant", { fiyat: 100 })] }]);
    expect(teklifUretimDurumu(bant, { parts: PARTS })).toBe("gerekmiyor");
    expect(teklifKaydedildiMi(bant, { parts: PARTS })).toBe(true);
    expect(teklifUretimDurumu(teklif([]), {})).toBe("gerekmiyor");
    expect(teklifUretimDurumu(teklif([parcaSatiri()]), { parts: PARTS })).toBe("kaydedilmedi");
  });
  it("bulgu 4: artık kuruş kayıt üretmeyen kaleme yazılmaz; uygun kalem yoksa yuvarlama farkı olarak görünür", () => {
    const t = teklif([{ rowId: "b", subItems: [alt("bant", { id: "b1", fiyat: 100.01 })] }, parcaSatiri({ id: "p", fiyat: 33.33, miktar: 3 })], { iskonto: "10" });
    const p = plan(t);
    const parca = p.yedekParcaKayitlari[0];
    const r = iskontoDagit(altKalemler(t).map(k => ({ kalemId: k.kalemId, item: k.item })), "10", new Set(["p"]));
    const netP = r.kalemler.get("p").netK;
    expect(Math.round(parca.birimFiyat * 100) * 3 + Math.round(p.yuvarlamaFarki * 100)).toBe(netP);
    expect(p.yuvarlamaFarki).toBeGreaterThan(0);
  });
});

describe("altKalemler", () => {
  it("alt kalem kimliği kalıcıdır (satır kimliğine göre değil)", () => {
    expect(altKalemler(teklif([parcaSatiri({ id: "sabit" })])).map(k => k.kalemId)).toEqual(["sabit"]);
  });
});

function fakeSetters(ilk = {}) {
  const durum = { yedekParcaSatislar: [], partStock: [], partStockLog: [], partSales: [], customers: CUST.map(c => ({ ...c })), ...ilk };
  const set = (k) => vi.fn(u => { durum[k] = typeof u === "function" ? u(durum[k]) : u; });
  return {
    durum,
    deps: {
      setYedekParcaSatislar: set("yedekParcaSatislar"), setPartStock: set("partStock"), setPartStockLog: set("partStockLog"),
      get partStock() { return durum.partStock; }, setPartSales: set("partSales"), setCustomers: set("customers"), bugun: "2026-09-24",
    },
  };
}

describe("AC-23 / C2: partSales üzerinde yedek parça türü hiçbir yoldan üretilmez", () => {
  it("kaynakta 'Parça' türlü partSales üretimi yok", async () => {
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const path = await import("node:path");
    const kok = path.join(__dirname, "..", "src");
    const dosyalar = [];
    const gez = (d) => { for (const f of readdirSync(d)) { const p = path.join(d, f); if (statSync(p).isDirectory()) gez(p); else if (/\.(js|jsx)$/.test(f)) dosyalar.push(p); } };
    gez(kok);
    for (const f of dosyalar) expect(readFileSync(f, "utf-8"), f).not.toMatch(/tur:\s*["']Parça["']/);
  });
});
