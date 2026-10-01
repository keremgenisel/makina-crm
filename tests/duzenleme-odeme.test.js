// Spec 0048: düzenleme formundaki ödeme kutusunun motoru (formOdemeHedefleri genişlemesi, duzenlemeOdemeDurumu).
import { describe, it, expect } from "vitest";
import fs from "fs";
import { formOdemeHedefleri, duzenlemeOdemeDurumu, PASIF_TAKSIT_NEDENI } from "../src/lib/formOdemesi";
import { odemeleriUygula, turHaritasi, personelHedefKirilimi, personelHedefKurus, PERSONEL_BOLUNMEZ_NEDENI, HEDEF } from "../src/lib/gider";

const turMap = turHaritasi([{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Hammadde", davranis: "normal" }]);
const zengin = (k, h = []) => odemeleriUygula([k], h, turMap)[0];
const PERS = { id: 10, tarih: "2026-09-01", turId: 3, calisanId: 21, resmiTutar: 30000, eldenTutar: 0, ekOdemeler: [], sonOdemeTarihi: "2026-09-30" };
const NORMAL = { id: 20, tarih: "2026-09-01", turId: 4, tutar: 40000, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-09-30" };
const od = (tutar, giderId, extra = {}) => ({ id: 900 + tutar, tur: "odeme", tarih: "2026-09-15", tutar, hesapId: 51, giderId, taksitId: null, ...extra });
const taksitler = (id, hedefTutar) => hedefTutar.map(([hedef, tutar], i) => ({ id: id * 100 + i + 1, hedef, sira: i + 1, vade: "2026-09-30", tutar, odendi: false, odemeTarihi: null }));
const durum = (kayit, canli, h = [], opts = {}) => duzenlemeOdemeDurumu({ kayitliKalem: zengin(kayit, h), canliKalem: canli ? zengin(canli, h) : null, turMap, ...opts });

describe("Spec 0048: hedef nesnesinin genişlemesi (R12, R13, C2)", () => {
  it("AC-28: mevcut alanlar değişmedi; yeni alanlar eklendi", () => {
    const [h] = formOdemeHedefleri(zengin(NORMAL, [od(10000, 20)]), turMap);
    expect(h).toMatchObject({ hedef: "ana", taksitId: null, toplamK: 4000000, kalanK: 3000000, odendi: false, pasif: false, neden: null, ciroOlur: true });
    expect(h).toMatchObject({ odenenK: 1000000, satirSayisi: 0, maasK: null, ekOdemeK: null });
    const T = formOdemeHedefleri({ ...NORMAL, taksitler: taksitler(20, [["ana", 20000], ["ana", 20000]]) }, turMap)[0];
    // Spec 0057 R1, R21 ile güncellendi: pasif kararı çağıranda; hedef "taksitli" alanını taşır.
    expect(T).toMatchObject({ pasif: false, neden: null, taksitli: true, satirSayisi: 2, taksitId: null });
  });
  it("AC-11 / AC-23: personelde maaş ve ek ödeme kırılımı hedef başına; toplamı hedef toplamı; kirada ve normalde null", () => {
    const k = { ...PERS, eldenTutar: 10000, ekOdemeler: [{ tur: "prim", resmiTutar: 5000, eldenTutar: 0 }, { tur: "fazlaCalisma", resmiTutar: 0, eldenTutar: 2500 }] };
    // Spec 0054 R1, R18 ile güncellendi: ek ödeme kendi hedefidir; maaş hedeflerinde ek ödeme kırılımı sıfırdır.
    const [r, e, er, ee] = formOdemeHedefleri(k, turMap);
    expect(r).toMatchObject({ hedef: "ana", maasK: 3000000, ekOdemeK: 0, toplamK: 3000000 });
    expect(e).toMatchObject({ hedef: "elden", maasK: 1000000, ekOdemeK: 0, toplamK: 1000000 });
    expect(er).toMatchObject({ hedef: "ekResmi", maasK: 0, ekOdemeK: 500000, toplamK: 500000 });
    expect(ee).toMatchObject({ hedef: "ekElden", maasK: 0, ekOdemeK: 250000, toplamK: 250000 });
    const p = personelHedefKurus(k);
    expect(personelHedefKirilimi(k, HEDEF.ANA, true).maasK + personelHedefKirilimi(k, HEDEF.EK_RESMI, true).ekOdemeK).toBe(p.resmiK);
    // Tek hedefli: hepsi ANA'da.
    expect(personelHedefKirilimi(k, HEDEF.ANA, false)).toEqual({ maasK: 4000000, ekOdemeK: 750000 });
    const kira = { id: 30, tarih: "2026-09-01", turId: 1, tutar: 25000, kdvOrani: 0, stopajOrani: 20 };
    expect(formOdemeHedefleri(kira, turMap).map(h => [h.maasK, h.ekOdemeK])).toEqual([[null, null], [null, null]]);
  });
  it("R12: ödenen tutar ham (satırsızda _odenen, satırda _odenenK)", () => {
    expect(formOdemeHedefleri(zengin(PERS, [od(12000, 10)]), turMap)[0].odenenK).toBe(1200000);
    const s = zengin({ ...NORMAL, taksitler: taksitler(20, [["ana", 20000], ["ana", 20000]]) }, [od(5000, 20, { taksitId: 2001 })]);
    expect(formOdemeHedefleri(s, turMap)[0].odenenK).toBe(500000);
  });
});

describe("Spec 0048: düzenleme kararları (duzenlemeOdemeDurumu)", () => {
  it("AC-1 / AC-19: ek ödemeyle yeni doğan elden hedefi görünür; düğme yok, 'Kaydedince ödenebilir'", () => {
    const canli = { ...PERS, ekOdemeler: [{ tur: "prim", resmiTutar: 0, eldenTutar: 9500 }], taksitler: taksitler(10, [["ana", 30000], ["elden", 9500]]).map((r, i) => ({ ...r, id: `onizleme-${i + 1}` })) };
    const d = durum(PERS, canli);
    expect(d.hedefler.map(h => h.hedef)).toEqual(["ana", "elden"]);
    const e = d.hedefler[1];
    expect([e.dugme, e.kaydedinceOdenir]).toEqual([false, true]);
    // Satırsız ANA tek satırlıya geçti: taksit sayısı aynı (1), düğme durur (triyaj).
    expect(d.hedefler[0].dugme).toBe(true);
  });
  it("AC-5 / AC-17 (Q1): satırsız kısmen ödenmiş kalem satırlıya geçince ödenen, kaydın motoruyla yeni satırlara dağılır", () => {
    const h = [od(12000, 10)];
    const canli = { ...PERS, ekOdemeler: [{ tur: "prim", resmiTutar: 0, eldenTutar: 9500 }], taksitler: taksitler(10, [["ana", 30000], ["elden", 9500]]).map((r, i) => ({ ...r, id: `onizleme-${i + 1}` })) };
    const d = durum(PERS, canli, h);
    expect(d.hedefler[0]).toMatchObject({ toplamK: 3000000, kalanK: 1800000 }); // önce resmi (0042 Q3)
    expect(d.hedefler[1]).toMatchObject({ toplamK: 950000, kalanK: 950000 });
  });
  it("AC-3 (Q1): tamamen ödenmiş satırsız kaleme ek ödeme eklenince kalan artar (saklı odendi taşınmaz)", () => {
    const h = [od(30000, 10)];
    expect(zengin(PERS, h).odendi).toBe(true);
    const d = durum(PERS, { ...PERS, ekOdemeler: [{ tur: "prim", resmiTutar: 4000, eldenTutar: 0 }] }, h);
    // Spec 0054 R4 ile güncellendi (Intent): maaş "Ödendi" kalır, prim kendi hedefinde açık doğar.
    expect(d.hedefler[0]).toMatchObject({ hedef: "ana", toplamK: 3000000, kalanK: 0 });
    expect(d.hedefler[1]).toMatchObject({ hedef: "ekResmi", toplamK: 400000, kalanK: 400000 });
  });
  it("AC-18: satırlı kalemde gerçek kimlikli satır ödenenini korur, yeni satır sıfır ödenmiş doğar", () => {
    const kayit = { ...NORMAL, taksitler: taksitler(20, [["ana", 20000], ["ana", 20000]]) };
    const h = [od(20000, 20, { taksitId: 2001 })];
    const canli = { ...kayit, tutar: 60000, taksitler: [...kayit.taksitler, { id: "onizleme-1", hedef: "ana", sira: 3, vade: "2026-11-30", tutar: 20000, odendi: false, odemeTarihi: null }] };
    const c = zengin(canli, h);
    expect(c.taksitler.map(r => r._odenenK)).toEqual([2000000, 0, 0]);
    const d = durum(kayit, canli, h);
    expect(d.hedefler[0]).toMatchObject({ toplamK: 6000000, kalanK: 4000000, satirSayisi: 3 });
  });
  it("AC-7 / AC-20 (Q3) / AC-21: kalan sıfırsa düğme yok; yapısı aynı taksitli hedefte düğme var; yapı değişince yok", () => {
    const kayit = { ...NORMAL, taksitler: taksitler(20, [["ana", 20000], ["ana", 20000]]) };
    // Spec 0057 R1, R7 ile güncellendi: yapısı aynı taksitli hedef pasif değil; taksit sayısı değişince pasif ve nedenli.
    expect(durum(kayit, kayit).hedefler[0]).toMatchObject({ pasif: false, dugme: true, kaydedinceOdenir: false });
    const tam = [od(40000, 20)];
    expect(durum(NORMAL, NORMAL, tam).hedefler[0]).toMatchObject({ kalanK: 0, dugme: false, kaydedinceOdenir: false });
    const iki = { ...NORMAL, taksitler: taksitler(20, [["ana", 20000], ["ana", 20000]]).map((r, i) => ({ ...r, id: `onizleme-${i + 1}` })) };
    expect(durum(NORMAL, iki).hedefler[0]).toMatchObject({ dugme: false, kaydedinceOdenir: true, pasif: true, neden: PASIF_TAKSIT_NEDENI });
  });
  it("triyaj: göçsüz eski satırsız kalemler (iki hedefli personel, stopajlı kira) değiştirilmeden açılınca düğme durur", () => {
    const pers = { ...PERS, resmiTutar: 1000, eldenTutar: 500 };
    const persCanli = { ...pers, taksitler: taksitler(10, [["ana", 1000], ["elden", 500]]).map((r, i) => ({ ...r, id: `onizleme-${i + 1}` })) };
    expect(durum(pers, persCanli).hedefler.map(h => [h.hedef, h.dugme, h.kaydedinceOdenir])).toEqual([["ana", true, false], ["elden", true, false]]);
    const kira = { id: 30, tarih: "2026-09-01", turId: 1, tutar: 10000, kdvOrani: 0, stopajOrani: 20, tedarikciId: 11 };
    const kiraCanli = { ...kira, taksitler: taksitler(30, [["ana", 8000], ["stopaj", 2000]]).map((r, i) => ({ ...r, id: `onizleme-${i + 1}` })) };
    expect(durum(kira, kiraCanli).hedefler.map(h => [h.hedef, h.dugme, h.kaydedinceOdenir])).toEqual([["ana", true, false], ["stopaj", true, false]]);
  });
  it("AC-6 / AC-22 (Q2, Q4): tutar ödenenin altına düşünce kalan 0, aşım kayıtlı ham ödenenle", () => {
    const h = [od(39500, 20)];
    const d = durum({ ...NORMAL, tutar: 39500 }, { ...NORMAL, tutar: 30000 }, h);
    expect(d.hedefler[0]).toMatchObject({ toplamK: 3000000, kalanK: 0, asimK: 950000, kayitliOdenenK: 3950000 });
  });
  it("AC-26 (Q5): toplamı sıfırlanan hedefin satırı kalkar; kayıtlı ödemesi varsa kaybolan satırı görünür", () => {
    const kayit = { ...PERS, ekOdemeler: [{ tur: "prim", resmiTutar: 0, eldenTutar: 9500 }], taksitler: taksitler(10, [["ana", 30000], ["elden", 9500]]) };
    const h = [od(9500, 10, { taksitId: 1002 })];
    const d = durum(kayit, { ...PERS }, h);
    expect(d.hedefler.map(x => x.hedef)).toEqual(["ana"]);
    expect(d.kaybolanlar).toEqual([{ hedef: "elden", odenenK: 950000, toplamK: 0 }]);
    expect(durum(kayit, { ...PERS }, []).kaybolanlar).toEqual([]);
  });
  it("AC-24: plan hatasında kutu kayıtlı hâli gösterir; taksitli kalem tek hedefe düşmez", () => {
    const kayit = { ...NORMAL, taksitler: taksitler(20, [["ana", 20000], ["ana", 20000]]) };
    const d = durum(kayit, null, [od(20000, 20, { taksitId: 2001 })], { planHatasi: true });
    expect(d.planHatasi).toBe(true);
    expect(d.hedefler).toHaveLength(1);
    expect(d.hedefler[0]).toMatchObject({ toplamK: 4000000, kalanK: 2000000, satirSayisi: 2, dugme: true });
  });
  it("AC-25 (Q6): davranış değişince ve kayıtlı ödeme varken uyarı; ödeme yoksa ya da davranış aynıysa yok", () => {
    const h = [od(10000, 20)];
    const personele = { ...NORMAL, turId: 3, resmiTutar: 40000, eldenTutar: 0 };
    expect(durum(NORMAL, personele, h).turDegisti).toBe(true);
    expect(durum(NORMAL, personele, []).turDegisti).toBe(false);
    expect(durum(NORMAL, { ...NORMAL, tutar: 50000 }, h).turDegisti).toBe(false);
  });
  // Spec 0054 R7 ile güncellendi: ek ödemeler resmi/elden bileşeni başına tek hedefte toplanır (satır başına değil).
  it("AC-10: ek ödeme başına ayrı hedef oluşmaz (en çok dört hedef)", () => {
    const k = { ...PERS, eldenTutar: 5000, ekOdemeler: [1, 2, 3].map(() => ({ tur: "prim", resmiTutar: 1000, eldenTutar: 1000 })) };
    expect(formOdemeHedefleri(k, turMap).map(h => [h.hedef, h.toplamK])).toEqual([["ana", 3000000], ["elden", 500000], ["ekResmi", 300000], ["ekElden", 300000]]);
  });
  it("AC-27 / R7: bölünmezlik nedeni tek sabitte; form ve ödeme kutusu onu okur, metin başka yerde yazılmaz", () => {
    const kayit = { ...PERS, eldenTutar: 10000, taksitler: taksitler(10, [["ana", 20000], ["ana", 20000]]) };
    expect(durum(kayit, kayit, [od(20000, 10, { taksitId: 1001 })]).bolunmez).toBe(true);
    const metin = PERSONEL_BOLUNMEZ_NEDENI;
    for (const f of ["src/components/GiderForm.jsx", "src/components/gider/OdemeGirisi.jsx"]) { // spec 0053: tek ödeme editörü
      const src = fs.readFileSync(f, "utf-8");
      expect(src).toContain("PERSONEL_BOLUNMEZ_NEDENI");
      expect(src).not.toContain(metin);
    }
  });
});
