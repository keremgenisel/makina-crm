// Spec 0042: personel kaleminin iki ödeme hedefi (resmi = ANA, elden = ELDEN). Saf motor: gider.js hedef yolu (0021),
// ödeme hareketi (0024), çok satırlı ödeme (0041), borç özeti, hatırlatıcı, çalışan ekstresi.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  giderKalemDogrula, turHaritasi, odemeleriUygula, odemeHedefleri, odemeDurumu, borcOzeti, kalemTutari, odenecekTutar,
  personelHedefKurus, tekrarlayanUret, DAVRANIS, HEDEF,
} from "../src/lib/gider";
import { cokluOdemeDogrula, calisanEkstresi } from "../src/lib/kasa";
import { odemeGirisiHazirla, formOdemeHedefleri, hepsiniOde } from "../src/lib/formOdemesi";
import { odemeHatirlatmalari } from "../src/lib/odemeHatirlatma";
import { hesaplaMakinaMaliyetleri } from "../src/lib/makinaMaliyeti";

const TUR = [{ id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }];
const turMap = turHaritasi(TUR);
let n = 7000;
const uid = () => ++n;
const kayit = (form) => { const r = giderKalemDogrula(form, { turMap, uid }); expect(r.hatalar).toEqual([]); return r.kayit; };
const per = (o = {}) => ({ id: 5, tarih: "2026-09-01", turId: 3, calisanId: 7, calisanAd: "Hasan", resmiTutar: 30000, eldenTutar: 20000, sonOdemeTarihi: "2026-09-30", ...o });
const uygula = (k, h = []) => odemeleriUygula([k], h, turMap)[0];
const hedefler = (k, h = []) => odemeHedefleri(uygula(k, h), DAVRANIS.PERSONEL);
const sat = (k, hedef) => k.taksitler.filter(r => r.hedef === hedef);
const od = (id, tutar, o = {}) => ({ id, tur: "odeme", tarih: "2026-09-30", tutar, giderId: 5, hesapId: null, ...o });

describe("Spec 0042: iki hedef (R1–R4, C1)", () => {
  it("AC-1: resmi ve elden tutarı olan personel kalemi iki hedefle satırlı doğar", () => {
    const k = kayit(per());
    expect(k.taksitler.map(r => [r.hedef, r.tutar, r.vade])).toEqual([["ana", 30000, "2026-09-30"], ["elden", 20000, "2026-09-30"]]);
    expect(hedefler(k).map(h => [h.hedef, h.toplamK])).toEqual([["ana", 3000000], ["elden", 2000000]]);
  });
  it("AC-2: yalnız resmi tutarı olan kalemde tek hedef, kalem satırsız", () => {
    const k = kayit(per({ eldenTutar: "" }));
    expect(k.taksitler).toEqual([]);
    expect(hedefler(k).map(h => h.hedef)).toEqual(["ana"]);
  });
  it("AC-6 / AC-7: iki hedefin toplamı ödenecek tutara tam eşit; ek ödemenin resmi kısmı resmiye, elden kısmı eldene", () => {
    const k = kayit(per({ resmiTutar: "30.000,01", eldenTutar: "19.999,99", ekOdemeler: [{ tur: "prim", resmiTutar: "1.000", eldenTutar: "" }, { tur: "ikramiye", resmiTutar: "", eldenTutar: "500" }] }));
    expect(personelHedefKurus(k)).toEqual({ resmiK: 3100001, eldenK: 2049999 });
    const top = hedefler(k).reduce((a, h) => a + h.toplamK, 0);
    expect(top).toBe(Math.round(odenecekTutar(k, DAVRANIS.PERSONEL) * 100));
    expect(top).toBe(Math.round(kalemTutari(k, DAVRANIS.PERSONEL) * 100));
  });
  it("AC-26: iki tutarı da sıfır olan personel kalemi kaydedilemez", () => {
    expect(giderKalemDogrula(per({ resmiTutar: "", eldenTutar: "" }), { turMap, uid }).hatalar.length).toBeGreaterThan(0);
  });
  it("AC-23 / AC-24 / Q5: resmi taksitlenince elden tek satır kalır; elden vadesi ayrı girilir, boşsa resmi vadesi", () => {
    const k = kayit(per({ taksitSayisi: 3 }));
    expect(sat(k, HEDEF.ANA).map(r => r.tutar)).toEqual([10000, 10000, 10000]);
    expect(sat(k, HEDEF.ELDEN).map(r => [r.tutar, r.vade])).toEqual([[20000, "2026-09-30"]]);
    const v = kayit(per({ eldenVade: "2026-09-25" }));
    expect(sat(v, HEDEF.ELDEN)[0].vade).toBe("2026-09-25");
    expect(giderKalemDogrula(per({ eldenVade: "2026-08-01" }), { turMap, uid }).hatalar.map(h => h.alan)).toContain("eldenVade");
  });
  it("AC-25: hedef vadeleri satırda; giderler tablosuna vade sütunu eklenmedi, elden vadesi kayda alan olarak yazılmaz", () => {
    expect(kayit(per({ eldenVade: "2026-09-25" })).eldenVade).toBeUndefined();
    const db = readFileSync("electron/db.cjs", "utf-8");
    expect(db).not.toMatch(/eldenVade/);
  });
});

describe("Spec 0042: ödeme ve durum (R4, R5, AC-3–AC-5, AC-20, AC-21)", () => {
  const k = () => kayit(per());
  it("AC-3 / AC-21: resmi havale, elden nakit, tek pencerede iki satırla; iki hareket ayrı yöntemle", () => {
    const kk = k();
    const r = cokluOdemeDogrula({ tarih: "2026-09-30", satirlar: [
      { taksitId: sat(kk, HEDEF.ANA)[0].id, tutar: "30.000", yontem: "Havale" },
      { taksitId: sat(kk, HEDEF.ELDEN)[0].id, tutar: "20.000", yontem: "Nakit" },
    ] }, { kalem: uygula(kk), turMap });
    expect(r.kayitlar.map(x => [x.yontem, x.tutar])).toEqual([["Havale", 30000], ["Nakit", 20000]]);
    expect(odemeDurumu(uygula(kk, r.kayitlar.map((x, i) => ({ ...x, id: i + 1 }))))).toBe("odendi");
  });
  it("AC-20: tutar o hedefin kalanını aşamaz (hedef başına sınır)", () => {
    const kk = k();
    const r = cokluOdemeDogrula({ tarih: "2026-09-30", satirlar: [{ taksitId: sat(kk, HEDEF.ELDEN)[0].id, tutar: "20.000,01", yontem: "Nakit" }] }, { kalem: uygula(kk), turMap });
    expect(r.hatalar.satirlar[0].tutar).toMatch(/Kalandan fazla ödeme kaydedilemez \(kalan 20\.000,00 ₺\)/);
  });
  it("AC-4 / AC-5: yalnız resmi ödenince kısmen ve kalan elden; ikisi ödenince ödendi", () => {
    const kk = k();
    const resmi = od(1, 30000, { taksitId: sat(kk, HEDEF.ANA)[0].id });
    expect(odemeDurumu(uygula(kk, [resmi]))).toBe("kismen");
    expect(hedefler(kk, [resmi]).map(h => [h.hedef, h.kalanK])).toEqual([["ana", 0], ["elden", 2000000]]);
    expect(odemeDurumu(uygula(kk, [resmi, od(2, 20000, { taksitId: sat(kk, HEDEF.ELDEN)[0].id })]))).toBe("odendi");
  });
  it("AC-15: 'ödendi olarak kaydet' kısayolu her hedefe bir hareket yazar; aynı kalem iki kez kaydedilince satır kimlikleri aynı kalır", () => {
    const kk = k();
    // Spec 0046 C2: kısayol artık formun "Hepsini ödendi" yolu (tamOdemeHareketleri kaldırıldı); sonuç aynı.
    const satirlar = hepsiniOde([], formOdemeHedefleri(kk, turMap), { yontem: "Havale" }); // spec 0053 R25 imzası
    expect(odemeGirisiHazirla(kk, { turMap, tarih: "2026-09-30", satirlar }).hareketler.map(h => [h.taksitId, h.tutar])).toEqual(kk.taksitler.map(r => [r.id, r.tutar]));
    const ikinci = kayit({ ...uygula(kk), taksitSayisi: 1, sonOdemeTarihi: "2026-09-30" });
    expect(ikinci.taksitler.map(r => r.id)).toEqual(kk.taksitler.map(r => r.id));
  });
});

describe("Spec 0042: eski veri, göç yok (R8, AC-13, AC-14, Q1, Q3, Q4)", () => {
  const eski = per(); // satırsız eski kalem (kayıttan geçmemiş)
  it("AC-14 / Q1: satırsız eski kalem okuma anında iki hedef; kısmi ödeme önce resmiye, artanı eldene", () => {
    expect(hedefler(eski, [od(1, 35000)]).map(h => [h.hedef, h.kalanK, h.vade])).toEqual([["ana", 0, "2026-09-30"], ["elden", 1500000, "2026-09-30"]]);
    expect(odemeDurumu(uygula(eski, [od(1, 35000)]))).toBe("kismen");
  });
  it("AC-13: ödenmiş (göç hareketi tamKapatir) eski kalem kaydedilince iki hedefi de ödenmiş doğar", () => {
    const h = [od(1, null, { tamKapatir: true, kaynak: "goc" })];
    const y = kayit({ ...uygula(eski, h), taksitSayisi: 1 });
    expect(y.taksitler.map(r => r.hedef)).toEqual(["ana", "elden"]);
    expect(hedefler(y, h).every(x => x.odendi)).toBe(true);
  });
  it("Q3: kısmi ödemeli eski kalem kaydedilince hedef bakiyeleri değişmez (elden vadesi daha erken olsa da önce resmi)", () => {
    const h = [od(1, 35000)];
    const once = hedefler(eski, h).map(x => [x.hedef, x.kalanK]);
    const y = kayit({ ...uygula(eski, h), taksitSayisi: 1, eldenVade: "2026-09-10" });
    expect(hedefler(y, h).map(x => [x.hedef, x.kalanK])).toEqual(once);
  });
  it("Q4: elden satırı olmayan, ana satırı ödeme almış eski taksitli kalem bölünmez", () => {
    const taksitli = kayit({ ...per({ eldenTutar: "" }), taksitSayisi: 2 }); // yalnız resmi, 2 taksit
    const eskiTaksitli = { ...taksitli, eldenTutar: 20000 }; // eski sürümde maaşın tamamı ana taksitlerindeydi
    const h = [od(1, 15000, { taksitId: taksitli.taksitler[0].id })];
    const y = kayit({ ...uygula(eskiTaksitli, h), taksitSayisi: 2, sonOdemeTarihi: "2026-09-30" });
    expect(y.taksitler.every(r => r.hedef === "ana")).toBe(true);
    expect(y.taksitler.reduce((a, r) => a + r.tutar, 0)).toBe(50000);
  });
  it("R8: veri göçü yazılmadı (db.cjs'te personel hedef göçü yok)", () => {
    const db = readFileSync("electron/db.cjs", "utf-8");
    expect(db).not.toMatch(/personelHedef|elden.*goc|gocu0042/i);
  });
});

describe("Spec 0042: tüketiciler (R6, R12, AC-8–AC-10, AC-19)", () => {
  const k = () => ({ ...kayit(per()), id: 5 });
  it("AC-8: borç özetinde personel tek satır; çalışan başına resmi/elden kırılımı ayrıntıda, kalem tekil", () => {
    const b = borcOzeti([k()], { turler: TUR }, "2026-09-28");
    const c = b.satirlar.find(s => s.tur === "calisanlar");
    expect(c.tutar).toBe(50000);
    expect(c.ayrinti[0]).toMatchObject({ ad: "Hasan", tutar: 50000, resmi: 30000, elden: 20000 });
    expect(c.ayrinti[0].kalemler).toHaveLength(1);
  });
  it("AC-9: hatırlatıcıda personel bölüm başına tek satır; tutar iki hedefin açık toplamı, vade en erken; sayı kalem sayar", () => {
    const kk = { ...kayit(per({ eldenVade: "2026-09-29" })), id: 5 };
    const r = odemeHatirlatmalari([kk], { turler: TUR, yururlukAy: "2026-01" }, "2026-09-28");
    const p = r.yaklasanSatirlar.filter(s => s.tur === "personel");
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ adet: 1, odenecek: 50000, vade: "2026-09-29" });
    expect(p[0].kalemler[0].hedefler.map(h => [h.hedef, h.odenecek])).toEqual([["elden", 20000], ["ana", 30000]]);
    expect(r.sayilar.yaklasan).toBe(1);
  });
  it("AC-9 (triyaj): resmi vadesi geçmiş, elden yaklaşan: kalem bütün olarak vadesi geçmiş grubunda, tutar iki hedefin toplamı", () => {
    const kk = { ...kayit(per({ resmiTutar: 1000, eldenTutar: 500, sonOdemeTarihi: "2026-09-02", eldenVade: "2026-09-06", tarih: "2026-09-01" })), id: 5 };
    const r = odemeHatirlatmalari([kk], { turler: TUR, yururlukAy: "2026-01", esikGun: 7 }, "2026-09-04");
    expect(r.sayilar).toEqual({ gecmis: 1, yaklasan: 0 });
    expect(r.gecmisSatirlar.filter(s => s.tur === "personel").map(s => [s.adet, s.odenecek, s.vade])).toEqual([[1, 1500, "2026-09-02"]]);
    expect(r.yaklasanSatirlar.filter(s => s.tur === "personel")).toEqual([]);
    // Elden vadesi eşik dışında olsa da kalem gecikmişse elden açık tutarı gecikmiş satırda sayılır.
    const uzak = { ...kayit(per({ resmiTutar: 1000, eldenTutar: 500, sonOdemeTarihi: "2026-09-02", eldenVade: "2026-10-30", tarih: "2026-09-01" })), id: 6 };
    expect(odemeHatirlatmalari([uzak], { turler: TUR, yururlukAy: "2026-01", esikGun: 7 }, "2026-09-04").gecmisSatirlar.find(s => s.tur === "personel").odenecek).toBe(1500);
  });
  it("AC-10: çalışan ekstresi iki hedefi okur; her ödeme hedefini taşır, borç toplamı iki hedef", () => {
    const kk = k();
    const h = [od(1, 30000, { taksitId: sat(kk, HEDEF.ANA)[0].id }), od(2, 5000, { taksitId: sat(kk, HEDEF.ELDEN)[0].id, tarih: "2026-09-30" })];
    const e = calisanEkstresi(7, { giderler: [kk], hareketler: h, turler: TUR, yururlukAy: "2026-01", bugun: "2026-09-30" });
    expect(e.satirlar.map(s => [s.tur, s.tutarK / 100, s.hedef || null])).toEqual([["maas", 50000, null], ["odeme", 30000, "ana"], ["odeme", 5000, "elden"]]);
    expect(e.bakiye).toBe(15000);
  });
  it("AC-19: makina maliyeti hedef ayrımından etkilenmez", () => {
    const hesap = (g) => hesaplaMakinaMaliyetleri({ customers: [{ id: 1, name: "F", model: "AK100", serialNo: "S", installDate: "2026-09-20", uretimTarihi: "2026-09-05", fabrikaSatisBedeli: 1, currency: "TRY" }],
      stock: [], partStockLog: [], giderler: [g], giderTurleri: TUR, standartGiderler: [], standardModels: [{ model: "AK100" }], customModels: [], giderAyarlari: { yururlukAy: "2026-01" } }, { bugun: "2026-09-28" }).makinalar.get("musteri:1");
    const a = hesap({ ...per(), id: 5 }), b = hesap(k());
    expect(b.uretimMaliyeti).toBe(a.uretimMaliyeti);
    expect(b.ortakPay).toBe(a.ortakPay);
  });
  it("tekrarlayan üretim iki tutarlı personeli iki hedefle (vadesiz) üretir", () => {
    const r = tekrarlayanUret([{ id: 1, turId: 3, calisanId: 7, ad: "Hasan", baslangicAy: "2026-01" }], [], "2026-09",
      { turMap, calisanlar: [{ id: 7, ad: "Hasan", resmiMaliyet: 30000, eldenMaliyet: 20000 }], uid });
    expect(r.yeniKalemler[0].taksitler.map(x => [x.hedef, x.tutar, x.vade])).toEqual([["ana", 30000, null], ["elden", 20000, null]]);
  });
});

describe("Spec 0042: kira değişmedi (R7, AC-12, AC-27)", () => {
  it("AC-12 (triyaj): satırsız eski kirada kiraya veren ödenmiş, stopaj açık: ana hedef 'ödendi', stopaj açık, kalem kısmen", () => {
    const eskiKira = { id: 20, tarih: "2026-09-02", turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, sonOdemeTarihi: "2026-09-05" };
    const k = odemeleriUygula([eskiKira], [{ id: 1, tur: "odeme", tarih: "2026-09-05", tutar: 16000, giderId: 20 }], turMap)[0];
    expect(odemeHedefleri(k, DAVRANIS.KIRA).map(h => [h.hedef, h.odendi, h.kalanK])).toEqual([["ana", true, 0], ["stopaj", false, 400000]]);
    expect(odemeDurumu(k)).toBe("kismen");
  });
  it("AC-12 / AC-27: stopajlı kira ana ve stopaj satırlarıyla aynı kimliklerle doğar ve aynı dağıtılır", () => {
    const kira = kayit({ id: 9, tarih: "2026-09-02", turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, sonOdemeTarihi: "2026-09-05", stopajVade: "2026-09-04" });
    expect(kira.taksitler.map(r => [r.hedef, r.tutar])).toEqual([["ana", 16000], ["stopaj", 4000]]);
    // kaleme bağlı (taksitsiz) hareket kirada vade sırasıyla dağılır: stopaj vadesi önce (bugünkü davranış)
    const h = [{ id: 1, tur: "odeme", tarih: "2026-09-05", tutar: 5000, giderId: 9 }];
    expect(odemeHedefleri(odemeleriUygula([kira], h, turMap)[0], DAVRANIS.KIRA).map(x => [x.hedef, x.kalanK])).toEqual([["ana", 1500000], ["stopaj", 0]]);
  });
});

describe("Spec 0042: sözlük kuralı (R10, AC-29)", () => {
  // Spec 0053 R1 ile güncellendi (0020'deki AC-70 ters çevirme deseni): kalem ve tanım formundaki "Varsayılan ödeme yöntemi"
  // kalktı; kuralın kalan örneği ödeme satırının yöntemidir (OdemeGirisi.jsx). Test kural metnini ve kalan örneği denetler,
  // kaldırılan dosyalara bağlı kalmaz.
  it("AC-29: tasarım sözlüğünde segment / açılır liste kuralı ölçüsüyle yazılı ve ödeme yöntemine atıf yapıyor", () => {
    const md = readFileSync("docs/tasarim-sozlugu.md", "utf-8");
    const bolum = md.slice(md.indexOf("### Ne zaman açılır liste? (spec 0042 R10)"));
    expect(bolum).toMatch(/Beş ve üstü seçenek/);
    expect(bolum).toMatch(/Üç ve altı/);
    expect(bolum).toMatch(/Sekme ve süzgeç çubukları her zaman segmenttir/);
    expect(bolum).toMatch(/İlk uygulaması ödeme yöntemidir/);
    expect(bolum).toMatch(/src\/components\/gider\/OdemeGirisi\.jsx/);
    // Atıf yapılan dosya gerçekten ödeme yöntemini açılır listeyle (Select) çiziyor.
    expect(readFileSync("src/components/gider/OdemeGirisi.jsx", "utf-8")).toMatch(/<Select aria-label=\{lbl\(h\.hedef, "ödeme yöntemi"/);
  });
});
