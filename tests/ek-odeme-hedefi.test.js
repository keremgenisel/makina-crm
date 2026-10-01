// Spec 0054: ek ödeme maaştan ayrı bir ödeme hedefi. Saf motor: gider.js hedef yolu (0021/0042), ödeme hareketi (0024),
// çok satırlı ödeme (0041/0053), borç özeti, hatırlatıcı, çalışan ekstresi, 0051 hareket etiketi.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  giderKalemDogrula, turHaritasi, odemeleriUygula, odemeHedefleri, odemeDurumu, borcOzeti, kalemTutari, odenecekTutar,
  personelHedefKurus, personelHedefKirilimi, personelHedefTutarlari, personelCokHedef, personelIkiHedef, personelEkBolunmezMi,
  kalemKovalariKurus, DAVRANIS, HEDEF, HEDEF_SIRASI, PERSONEL_EK_BOLUNMEZ_NEDENI,
} from "../src/lib/gider";
import { cokluOdemeDogrula, calisanEkstresi } from "../src/lib/kasa";
import { formOdemeHedefleri, duzenlemeOdemeDurumu, CIRO_YALNIZ_ANA_NEDENI } from "../src/lib/formOdemesi";
import { odemeHatirlatmalari } from "../src/lib/odemeHatirlatma";
import { hareketHedefPaylari } from "../src/lib/odemeYontemi";
import { hedefAdi, hedefEtiketi, cokHedefliMi } from "../src/components/gider/GiderAlanlari";
import { hesaplaMakinaMaliyetleri } from "../src/lib/makinaMaliyeti";

const TUR = [{ id: 3, ad: "Personel", davranis: "personel" }];
const turMap = turHaritasi(TUR);
const P = DAVRANIS.PERSONEL;
let n = 54000;
const uid = () => ++n;
const kayit = (form) => { const r = giderKalemDogrula(form, { turMap, uid }); expect(r.hatalar).toEqual([]); return r.kayit; };
const per = (o = {}) => ({ id: 5, tarih: "2026-09-01", turId: 3, calisanId: 7, calisanAd: "Hasan", resmiTutar: 30000, eldenTutar: 20000, sonOdemeTarihi: "2026-09-30", ...o });
const prim = (resmiTutar, eldenTutar = "", tur = "prim") => ({ tur, aciklama: "", resmiTutar, eldenTutar });
const uygula = (k, h = []) => odemeleriUygula([k], h, turMap)[0];
const hedefler = (k, h = []) => odemeHedefleri(uygula(k, h), P);
const sat = (k, hedef) => k.taksitler.filter(r => r.hedef === hedef);
const od = (id, tutar, o = {}) => ({ id, tur: "odeme", tarih: "2026-09-30", tutar, giderId: 5, hesapId: null, yontem: "Nakit", ...o });
// Kayıtlı kalemi düzenleyip yeniden kaydetmek: formun yaptığı gibi zenginleştirilmiş kalem + yeni alanlar.
const duzenle = (k, h, alanlar) => kayit({ ...uygula(k, h), ...alanlar, taksitSayisi: 1 });

describe("Spec 0054: hedefler (R1, R14, R15, R18, AC-1–AC-4, AC-22, AC-24, AC-29)", () => {
  it("AC-1 / AC-2: maaş ve ek ödeme ayrı hedefler, resmi/elden ayrımı ikisinde de; en çok dört satır", () => {
    const k = kayit(per({ ekOdemeler: [prim(5000, 4500)] }));
    expect(k.taksitler.map(r => [r.hedef, r.tutar])).toEqual([["ana", 30000], ["elden", 20000], ["ekResmi", 5000], ["ekElden", 4500]]);
    expect(hedefler(k).map(h => [h.hedef, h.toplamK])).toEqual([["ana", 3000000], ["elden", 2000000], ["ekResmi", 500000], ["ekElden", 450000]]);
  });
  it("AC-3 / AC-24: tutarı sıfır hedef çizilmez; yalnız resmi maaş + resmi prim satırlı doğar ve ödeme hedefe bağlanır", () => {
    const k = kayit(per({ eldenTutar: "", ekOdemeler: [prim(5000)] }));
    expect(personelIkiHedef(k, P)).toBe(false);
    expect(personelCokHedef(k, P)).toBe(true);
    expect(k.taksitler.map(r => [r.hedef, r.tutar])).toEqual([["ana", 30000], ["ekResmi", 5000]]);
    const h = [od(1, 5000, { taksitId: sat(k, HEDEF.EK_RESMI)[0].id })];
    expect(hedefler(k, h).map(x => [x.hedef, x.kalanK])).toEqual([["ana", 3000000], ["ekResmi", 0]]);
  });
  it("AC-4 / AC-29: dört hedefin toplamı ödenecek tutara tam eşit; tutarlar personelHedefKirilimi'nden", () => {
    const k = kayit(per({ resmiTutar: "30.000,01", eldenTutar: "19.999,99", ekOdemeler: [prim("1.000,03", ""), prim("", "500,07", "ikramiye")] }));
    const top = hedefler(k).reduce((a, h) => a + h.toplamK, 0);
    expect(top).toBe(Math.round(odenecekTutar(k, P) * 100));
    expect(top).toBe(Math.round(kalemTutari(k, P) * 100));
    const t = personelHedefTutarlari(k);
    expect(hedefler(k).map(h => h.toplamK)).toEqual(HEDEF_SIRASI.filter(x => t[x] > 0).map(x => t[x]));
    expect(personelHedefKirilimi(k, HEDEF.EK_RESMI)).toEqual({ maasK: 0, ekOdemeK: 100003 });
    const p = personelHedefKurus(k);
    expect(t.ana + t.ekResmi).toBe(p.resmiK);
    expect(t.elden + t.ekElden).toBe(p.eldenK);
  });
  it("AC-29: hedef tutarını okuyan ikinci bir toplama yazılmadı (ekOdemeler toplamı gider.js'te kırılım ve 0023 toplamıyla sınırlı)", () => {
    const g = readFileSync("src/lib/gider.js", "utf-8");
    const fo = readFileSync("src/lib/formOdemesi.js", "utf-8");
    expect(fo).not.toMatch(/ekOdemeler\s*\.\s*reduce/);
    expect(fo).toMatch(/personelHedefKirilimi\(/);
    // Hedef tutarı yalnız personelHedefTutarlari (kırılımın üstünde) ile okunur.
    expect(g).toMatch(/personelHedefTutarlari\(k, ayrim\)\[hedef\]/);
  });
  it("AC-22: hedef sırası maaş resmi → maaş elden → ek resmi → ek elden → stopaj", () => {
    expect(HEDEF_SIRASI).toEqual(["ana", "elden", "ekResmi", "ekElden", "stopaj"]);
  });
  it("AC-30: yalnız ek ödemesi olan (maaşı sıfır) kalem tek hedefli, satırsız", () => {
    const k = kayit(per({ resmiTutar: "", eldenTutar: "", ekOdemeler: [prim(2000)] }));
    expect(k.taksitler).toEqual([]);
    expect(hedefler(k).map(h => [h.hedef, h.toplamK])).toEqual([["ana", 200000]]);
    expect(cokHedefliMi(k, P)).toBe(false);
  });
});

describe("Spec 0054: asıl senaryo (R2–R7, AC-7, AC-8, AC-10, AC-12)", () => {
  it("AC-7 / AC-8 (Intent): maaşı ödenmiş satırlı kaleme prim eklenip kaydedilince maaş 'Ödendi' kalır, prim kendi tutarıyla açık doğar", () => {
    const k = kayit(per());
    const h = [od(1, 30000, { taksitId: sat(k, HEDEF.ANA)[0].id }), od(2, 20000, { taksitId: sat(k, HEDEF.ELDEN)[0].id })];
    expect(odemeDurumu(uygula(k, h))).toBe("odendi");
    const y = duzenle(k, h, { ekOdemeler: [prim(9500)] });
    expect(y.taksitler.map(r => [r.hedef, r.tutar])).toEqual([["ana", 30000], ["elden", 20000], ["ekResmi", 9500]]);
    expect(sat(y, HEDEF.ANA)[0].id).toBe(sat(k, HEDEF.ANA)[0].id);
    const d = hedefler(y, h);
    expect(d.map(x => [x.hedef, x.odendi, x.kalanK])).toEqual([["ana", true, 0], ["elden", true, 0], ["ekResmi", false, 950000]]);
    expect(personelEkBolunmezMi(y, k.taksitler, P)).toBe(false);
  });
  it("AC-10 / AC-11: ek hedef tek başına ödenir, maaş hareketine dokunulmaz; sonra kalem 'Ödendi'", () => {
    const k = kayit(per({ ekOdemeler: [prim(9500)] }));
    const h = [od(1, 30000, { taksitId: sat(k, HEDEF.ANA)[0].id }), od(2, 20000, { taksitId: sat(k, HEDEF.ELDEN)[0].id })];
    const r = cokluOdemeDogrula({ tarih: "2026-09-30", satirlar: [{ taksitId: sat(k, HEDEF.EK_RESMI)[0].id, tutar: "9.500", yontem: "Havale" }] }, { kalem: uygula(k, h), turMap });
    expect(r.hatalar.hedefler).toEqual([]);
    expect(r.kayitlar).toHaveLength(1);
    expect(r.kayitlar[0]).toMatchObject({ taksitId: sat(k, HEDEF.EK_RESMI)[0].id, tutar: 9500, yontem: "Havale" });
    expect(odemeDurumu(uygula(k, [...h, { ...r.kayitlar[0], id: 3 }]))).toBe("odendi");
  });
  it("AC-12 / R7: prim ve fazla mesai tek ek hedefte toplanır; iki ödeme satırıyla ayrı ayrı ödenir", () => {
    const k = kayit(per({ ekOdemeler: [prim(5000), prim(2000, "", "fazlaCalisma")] }));
    expect(sat(k, HEDEF.EK_RESMI).map(r => r.tutar)).toEqual([7000]);
    const id = sat(k, HEDEF.EK_RESMI)[0].id;
    const r = cokluOdemeDogrula({ tarih: "2026-09-30", satirlar: [{ taksitId: id, tutar: "5.000", yontem: "Havale" }, { taksitId: id, tutar: "2.000", yontem: "Nakit" }] }, { kalem: uygula(k), turMap });
    expect(r.kayitlar.map(x => [x.yontem, x.tutar])).toEqual([["Havale", 5000], ["Nakit", 2000]]);
    expect(hedefler(k, r.kayitlar.map((x, i) => ({ ...x, id: i + 1 }))).find(x => x.hedef === HEDEF.EK_RESMI).odendi).toBe(true);
  });
  it("R6 / AC-28: resmi maaş taksitliyken ek hedefler tek satır; formda ek hedef ödenebilir", () => {
    const k = kayit(per({ taksitSayisi: 3, ekOdemeler: [prim(6000, 1500)] }));
    expect(sat(k, HEDEF.ANA)).toHaveLength(3);
    expect(sat(k, HEDEF.EK_RESMI).map(r => [r.tutar, r.vade])).toEqual([[6000, "2026-09-30"]]);
    expect(sat(k, HEDEF.EK_ELDEN).map(r => [r.tutar, r.vade])).toEqual([[1500, "2026-09-30"]]);
    const fh = formOdemeHedefleri(uygula(k), turMap);
    expect(fh.find(h => h.hedef === HEDEF.ANA).satirSayisi).toBe(3);
    expect(fh.filter(h => h.hedef === HEDEF.EK_RESMI || h.hedef === HEDEF.EK_ELDEN).map(h => h.satirSayisi)).toEqual([1, 1]);
  });
  it("AC-27 / R17: ek hedeflerin vadesi ilk vadedir; elden vadesi ek elden hedefini etkilemez", () => {
    const k = kayit(per({ eldenVade: "2026-09-20", ekOdemeler: [prim(1000, 800)] }));
    expect(sat(k, HEDEF.ELDEN)[0].vade).toBe("2026-09-20");
    expect(sat(k, HEDEF.EK_RESMI)[0].vade).toBe("2026-09-30");
    expect(sat(k, HEDEF.EK_ELDEN)[0].vade).toBe("2026-09-30");
  });
  it("R22: ek ödeme hedefinde çek yok, neden tek sabitten", () => {
    expect(CIRO_YALNIZ_ANA_NEDENI[HEDEF.EK_RESMI]).toBe(CIRO_YALNIZ_ANA_NEDENI[HEDEF.EK_ELDEN]);
    expect(CIRO_YALNIZ_ANA_NEDENI[HEDEF.EK_RESMI]).toMatch(/Ek ödeme çekle yapılmaz/);
  });
});

describe("Spec 0054: koruma (R9, R10, R21, AC-13–AC-15, AC-23, AC-26)", () => {
  it("AC-13: tamamen ödenmiş satırsız kalem okuma anında dört hedefle 'Ödendi'", () => {
    const eski = per({ ekOdemeler: [prim(5000, 4500)] });
    const h = [od(1, null, { tamKapatir: true, kaynak: "goc" })];
    const d = hedefler(eski, h);
    expect(d.map(x => x.hedef)).toEqual(["ana", "elden", "ekResmi", "ekElden"]);
    expect(d.every(x => x.odendi)).toBe(true);
    expect(odemeDurumu(uygula(eski, h))).toBe("odendi");
  });
  it("AC-14 / AC-23: kısmen ödenmiş satırsız kalemde ödeme R14 sırasıyla dağılır, toplam kalan değişmez; maaş ödenmişse ek hedef açık", () => {
    const eski = per({ ekOdemeler: [prim(5000, 4500)] });
    const d = hedefler(eski, [od(1, 50000)]);
    expect(d.map(x => [x.hedef, x.kalanK])).toEqual([["ana", 0], ["elden", 0], ["ekResmi", 500000], ["ekElden", 450000]]);
    expect(d.reduce((a, x) => a + x.kalanK, 0)).toBe(950000);
    const kismi = hedefler(eski, [od(1, 35000)]);
    expect(kismi.map(x => [x.hedef, x.kalanK])).toEqual([["ana", 0], ["elden", 1500000], ["ekResmi", 500000], ["ekElden", 450000]]);
  });
  it("AC-14: eski satırlı (ana+elden) kalem ilk kaydedilince dört satıra geçer, ödenmiş satır tutarı ve kimliği korunur", () => {
    const k = kayit(per());
    const eskiSatirli = { ...k, ekOdemeler: [prim(5000, 4500)] }; // satırları yalnız ana/elden (0054 öncesi)
    const h = [od(1, 30000, { taksitId: sat(k, HEDEF.ANA)[0].id })];
    expect(hedefler(eskiSatirli, h).map(x => x.hedef)).toEqual(["ana", "elden"]);
    const y = kayit({ ...uygula(eskiSatirli, h), taksitSayisi: 1 });
    expect(y.taksitler.map(r => [r.hedef, r.tutar])).toEqual([["ana", 30000], ["elden", 20000], ["ekResmi", 5000], ["ekElden", 4500]]);
    expect(sat(y, HEDEF.ANA)[0].id).toBe(sat(k, HEDEF.ANA)[0].id);
    expect(hedefler(y, h).find(x => x.hedef === HEDEF.ANA).odendi).toBe(true);
  });
  it("AC-15 / AC-26 / R21: 39.500 ödenmiş ana satırı primi içeriyor: personelEkBolunmezMi true, ana satır bütün kalır, ek hedef yok", () => {
    const k = kayit(per({ resmiTutar: 39500, eldenTutar: "", ekOdemeler: [prim(1000)] })); // satırlı (ana + ekResmi)
    const satirli = { ...k, taksitler: [{ ...sat(k, HEDEF.ANA)[0], tutar: 39500 }] }; // eski plan: ana 39.500 tek satır
    const h = [od(1, 39500, { taksitId: satirli.taksitler[0].id })];
    const z = uygula(satirli, h);
    const form = { ...z, resmiTutar: 30000, ekOdemeler: [prim(9500)], taksitSayisi: 1 };
    expect(personelEkBolunmezMi(form, z.taksitler, P)).toBe(true);
    const r = giderKalemDogrula(form, { turMap, uid });
    expect(r.hatalar).toEqual([]);
    expect(r.kayit.taksitler.map(x => [x.hedef, x.tutar])).toEqual([["ana", 39500]]);
    expect(hedefler(r.kayit, h).every(x => x.odendi)).toBe(true);
    expect(PERSONEL_EK_BOLUNMEZ_NEDENI).toMatch(/ek ödeme ayrı bir bölüm olarak ödenmez/);
    const durum = duzenlemeOdemeDurumu({ canliKalem: uygula(r.kayit, h), kayitliKalem: z, turMap });
    expect(durum.ekBolunmez).toBe(true);
  });
  it("R21: elden tarafı ayrı değerlendirilir; ödenmiş elden satırı yeni elden maaşını aşmıyorsa ek elden ayrılır", () => {
    const k = kayit(per());
    const h = [od(1, 20000, { taksitId: sat(k, HEDEF.ELDEN)[0].id })];
    const y = duzenle(k, h, { ekOdemeler: [prim("", 3000)] });
    expect(y.taksitler.map(r => [r.hedef, r.tutar])).toEqual([["ana", 30000], ["elden", 20000], ["ekElden", 3000]]);
  });
});

describe("Spec 0054: tüketiciler (R11, R13, R20, AC-16–AC-18, AC-20, AC-32, AC-33)", () => {
  const k = () => ({ ...kayit(per({ ekOdemeler: [prim(5000, 4500)] })), id: 5 });
  it("AC-16: borç özetinde personel kalemi tekil; hedef kırılımı ayrıntıda dört hedef", () => {
    const b = borcOzeti([k()], { turler: TUR }, "2026-09-28");
    const c = b.satirlar.find(s => s.tur === "calisanlar");
    expect(c.tutar).toBe(59500);
    expect(c.ayrinti[0].kalemler).toHaveLength(1);
    expect(c.ayrinti[0]).toMatchObject({ resmi: 35000, elden: 24500 });
    expect(c.ayrinti[0].hedefler).toMatchObject({ ana: 30000, elden: 20000, ekResmi: 5000, ekElden: 4500 });
  });
  it("AC-17: hatırlatıcı personeli kalem başına birleştirir; sayı kalem sayar", () => {
    const r = odemeHatirlatmalari([k()], { turler: TUR, yururlukAy: "2026-01" }, "2026-09-28");
    const p = r.yaklasanSatirlar.filter(s => s.tur === "personel");
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ adet: 1, odenecek: 59500 });
    expect(p[0].kalemler[0].hedefler.map(h => h.hedef).sort()).toEqual(["ana", "ekElden", "ekResmi", "elden"]);
    expect(r.sayilar.yaklasan).toBe(1);
  });
  it("AC-18 / AC-32: çalışan ekstresi yeni hedefleri ayrı okur, ödeme satırı hedefini taşır; bakiye değişmez", () => {
    const kk = k();
    const h = [od(1, 30000, { taksitId: sat(kk, HEDEF.ANA)[0].id }), od(2, 4500, { taksitId: sat(kk, HEDEF.EK_ELDEN)[0].id })];
    const e = calisanEkstresi(7, { giderler: [kk], hareketler: h, turler: TUR, yururlukAy: "2026-01", bugun: "2026-09-30" });
    expect(e.satirlar.map(s => [s.tur, s.tutarK / 100, s.hedef || null])).toEqual([["maas", 59500, null], ["odeme", 30000, "ana"], ["odeme", 4500, "ekElden"]]);
    expect(e.bakiye).toBe(25000);
    const once = calisanEkstresi(7, { giderler: [kk], hareketler: h, turler: TUR, yururlukAy: "2026-01", bugun: "2026-10-31", aralik: { bas: "2026-10-01" } });
    expect(once.devirK / 100).toBe(25000);
  });
  it("AC-33 / AC-6 / AC-5: 0051 hareket etiketi ve adlar hedef kimliğinden; tek hedefte 'Çalışana'", () => {
    const kk = k();
    const h = [od(1, 30000, { taksitId: sat(kk, HEDEF.ANA)[0].id }), od(2, 5000, { taksitId: sat(kk, HEDEF.EK_RESMI)[0].id })];
    const paylar = hareketHedefPaylari(kk, h, turMap);
    expect(hedefEtiketi(kk, P, paylar.get("1"))).toBe("Maaş (resmi)");
    expect(hedefEtiketi(kk, P, paylar.get("2"))).toBe("Ek ödeme (resmi)");
    expect([HEDEF.ANA, HEDEF.ELDEN, HEDEF.EK_RESMI, HEDEF.EK_ELDEN].map(x => hedefAdi(x, P, true))).toEqual(["Maaş (resmi)", "Maaş (elden)", "Ek ödeme (resmi)", "Ek ödeme (elden)"]);
    expect(hedefAdi(HEDEF.ANA, P, false)).toBe("Çalışana");
    // Ek ödemesi olan ama eldeni olmayan kalem çok hedeflidir (eski eldenHedefliMi || personelIkiHedef bunu kaçırıyordu).
    const resmiPrim = { ...kayit(per({ eldenTutar: "", ekOdemeler: [prim(1000)] })), id: 5 };
    expect(cokHedefliMi(resmiPrim, P)).toBe(true);
    const tek = { ...kayit(per({ eldenTutar: "" })), id: 5 };
    expect(cokHedefliMi(tek, P)).toBe(false);
    expect(hedefEtiketi(tek, P, [{ hedef: "ana", payK: 3000000 }])).toBeNull();
  });
  it("AC-18: satırsız kalemde bölünmüş tek hareket iki hedefin tutarlarıyla etiketlenir", () => {
    const eski = { ...per({ ekOdemeler: [prim(5000)] }), id: 5 };
    const h = [od(1, 52000)];
    const p = hareketHedefPaylari(eski, h, turMap).get("1");
    expect(p.map(x => [x.hedef, x.payK])).toEqual([["ana", 3000000], ["elden", 2000000], ["ekResmi", 200000]]);
  });
  it("AC-20 / R13: kalemin toplamı, KDV'si, kova dağılımı ve makina maliyeti hedef ayrımından etkilenmez", () => {
    const satirsiz = { ...per({ ekOdemeler: [prim(5000, 4500)] }), id: 5 };
    const satirli = k();
    expect(kalemTutari(satirli, P)).toBe(kalemTutari(satirsiz, P));
    expect(kalemKovalariKurus(satirli, P)).toEqual(kalemKovalariKurus(satirsiz, P));
    const hesap = (g) => hesaplaMakinaMaliyetleri({ customers: [{ id: 1, name: "F", model: "AK100", serialNo: "S", installDate: "2026-09-20", uretimTarihi: "2026-09-05", fabrikaSatisBedeli: 1, currency: "TRY" }],
      stock: [], partStockLog: [], giderler: [g], giderTurleri: TUR, standartGiderler: [], standardModels: [{ model: "AK100" }], customModels: [], giderAyarlari: { yururlukAy: "2026-01" } }, { bugun: "2026-09-28" }).makinalar.get("musteri:1");
    const a = hesap(satirsiz), b = hesap(satirli);
    expect(b.uretimMaliyeti).toBe(a.uretimMaliyeti);
    expect(b.ortakPay).toBe(a.ortakPay);
  });
  it("AC-21 / C3: veritabanına yeni sütun yok, göç yok", () => {
    const db = readFileSync("electron/db.cjs", "utf-8");
    expect(db).not.toMatch(/ekResmi|ekElden|EK_RESMI|gocu0054/);
  });
});
