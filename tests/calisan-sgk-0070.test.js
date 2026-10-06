// Spec 0070: çalışan maliyetinde yol parası (motor). Saat dilimi sabit (CI UTC'de koşar).
// Spec 0074 R18 (S10) ile güncellendi: 0070'in SGK yarısı geri alındı. SGK blokları (SGK hedefi, toplu ödeme, satırsız SGK,
// SGK mahsubu, ekstre dışlaması, sgkOzeti) silindi; yeni davranış `sgk-turu-0074.test.js` ve `gider-kasa-raporu-0074.test.js`'te
// sınanır (karşılıkları: AC-11/12/13 → 0074 AC-10, AC-17, AC-19; AC-15 → 0074 AC-16; AC-16/17/32 → 0074 AC-22, AC-23, AC-24;
// AC-18/19/20/33 → 0074 AC-20; AC-31 → 0074 AC-21; AC-42 → 0074 AC-28; R18 → 0074 AC-25). Yol parası blokları aynen.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  giderKalemDogrula, tekrarlayanUret, turHaritasi, kalemTutari, odenecekTutar, odemeHedefleri, hesaplaGiderRaporu,
  personelHedefTutarlari, kurus, PERSONEL_HEDEFLERI, DAVRANIS,
} from "../src/lib/gider";

const kok = path.join(__dirname, "..");
const kod = (f) => readFileSync(path.join(kok, f), "utf-8").split("\n").filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*")).join("\n");

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Elektrik", davranis: "normal" }];
const turMap = turHaritasi(TURLER);
const CAL = [{ id: 21, ad: "Hasan Çelik", resmiMaliyet: 30000, sgkMaliyet: 9000, eldenMaliyet: 10000, yolParasiMaliyet: 1000 }, { id: 22, ad: "Zeynep Arslan", resmiMaliyet: 25000, eldenMaliyet: 5000 }];
let n = 1000;
const uid = () => ++n;
const dogrula = (f) => giderKalemDogrula(f, { turMap, tedarikciler: [], uid });
const kayit = (f) => { const r = dogrula(f); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
const per = (o = {}) => ({ id: 1, tarih: "2026-09-30", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: "30000", eldenTutar: "10000", yolParasi: "1000",
  sonOdemeTarihi: "2026-10-05", ...o });
const hedefMap = (k) => Object.fromEntries(odemeHedefleri(k, DAVRANIS.PERSONEL).map(h => [h.hedef, h.toplamK]));
const AYAR = { turler: TURLER, tedarikciler: [], yururlukAy: "2026-01" };
const ctx = { turMap, calisanlar: CAL, giderAyarlari: {}, uid };

describe("spec 0070 B: kalem ve toplam (yol parası)", () => {
  it("AC-6: tekrarlayan üretim yol parasını çalışan kartından yazar (spec 0074 R34: SGK kopyalanmaz)", () => {
    const k = tekrarlayanUret([{ id: 50, turId: 3, ad: "Hasan", calisanId: 21, baslangicAy: "2026-06", uretilenAylar: [] }], [], "2026-09", ctx).yeniKalemler[0];
    expect(k).toMatchObject({ resmiTutar: 30000, eldenTutar: 10000, yolParasi: 1000 });
    expect("sgkTutar" in k).toBe(false);
  });
  it("AC-2: yol parası boş çalışanın kalemi bugünkü gibi üretilir", () => {
    const k = tekrarlayanUret([{ id: 51, turId: 3, ad: "Zeynep", calisanId: 22, baslangicAy: "2026-06", uretilenAylar: [] }], [], "2026-09", ctx).yeniKalemler[0];
    expect(k.yolParasi).toBe(null);
  });
  it("AC-7, AC-10: toplam resmi + elden + yol parası; yol parası elden hedefinde (spec 0074 R16: SGK yok)", () => {
    const k = kayit(per());
    expect(kalemTutari(k, DAVRANIS.PERSONEL)).toBe(41000);
    expect(odenecekTutar(k, DAVRANIS.PERSONEL)).toBe(41000);
    expect(hedefMap(k)).toEqual({ ana: 3000000, elden: 1100000 });
    const top = Object.values(hedefMap(k)).reduce((a, b) => a + b, 0);
    expect(top).toBe(kurus(kalemTutari(k, DAVRANIS.PERSONEL)));
  });
  it("AC-8: gider raporu ve kova toplamı yol parasını okur", () => {
    const k = kayit(per());
    const r = hesaplaGiderRaporu({ giderler: [k], ...AYAR }, { baslangic: "2026-09-01", bitis: "2026-09-30" }, { bugun: "2026-10-02" });
    expect(r.toplam).toBe(41000);
    expect(r.kovalar.ortak).toBe(41000);
  });
  it("AC-9: yeni alanı olmayan eski kalemin tutarı, hedefleri ve ödeme durumu değişmez", () => {
    const eski = kayit({ id: 2, tarih: "2026-09-30", turId: 3, calisanId: 22, resmiTutar: "25000", eldenTutar: "5000", sonOdemeTarihi: "2026-10-05" });
    expect(eski.yolParasi).toBe(null);
    expect(kalemTutari(eski, DAVRANIS.PERSONEL)).toBe(30000);
    expect(odenecekTutar(eski, DAVRANIS.PERSONEL)).toBe(30000);
    expect(hedefMap(eski)).toEqual({ ana: 2500000, elden: 500000 });
    const db = { id: 3, tarih: "2026-08-31", turId: 3, calisanId: 22, resmiTutar: 25000, eldenTutar: 5000, ekOdemeler: [], taksitler: [] };
    expect(odemeHedefleri(db, DAVRANIS.PERSONEL).map(h => [h.hedef, h.toplamK])).toEqual([["ana", 2500000], ["elden", 500000]]);
  });
  it("AC-30: PERSONEL_HEDEFLERI dört maaş/ek ödeme hedefidir; personelHedefTutarlari eski kalemde aynı", () => {
    expect(kod("src/lib/gider.js")).toMatch(/export const PERSONEL_HEDEFLERI = \[HEDEF\.ANA, HEDEF\.ELDEN, HEDEF\.EK_RESMI, HEDEF\.EK_ELDEN\];/);
    expect(PERSONEL_HEDEFLERI).toHaveLength(4);
    expect(personelHedefTutarlari({ resmiTutar: 25000, eldenTutar: 5000, ekOdemeler: [{ resmiTutar: 1000, eldenTutar: 0 }] })).toEqual({ ana: 2500000, elden: 500000, ekResmi: 100000, ekElden: 0 });
  });
  it("AC-26 (motor) / R16: bileşenleri sıfır personel kalemi reddedilir; negatif yol parası reddedilir", () => {
    expect(dogrula(per({ resmiTutar: "", eldenTutar: "", yolParasi: "" })).hatalar).toContainEqual({ alan: "resmiTutar", mesaj: "Tutar sıfırdan büyük olmalı." });
    expect(dogrula(per({ yolParasi: "-5" })).hatalar.map(h => h.alan)).toContain("yolParasi");
  });
});

describe("spec 0070: değişmeyenler", () => {
  it("AC-35: ödeme doğrulamasının üç imzası değişmedi", () => {
    const kasa = kod("src/lib/kasa.js"), fo = kod("src/lib/formOdemesi.js");
    expect(kasa).toContain("export const odemeDogrula = (form, { kalem, turMap, hesaplar = [], ciro = false, kendiCek = false } = {}) => {");
    expect(kasa).toContain("export const cokluOdemeDogrula = (form, { kalem, turMap, hesaplar = [], hedefAdi = (id) => (id == null ? \"Kalem\" : \"Taksit\") } = {}) => {");
    expect(fo).toMatch(/export const odemeGirisiHazirla = \(kalem, \{\n/);
  });
  it("AC-39: izin, sunucu ve birleştirme dosyalarında yeni alan yok", () => {
    for (const f of ["electron/serverAuth.cjs", "src/lib/merge.js", "src/components/settings/serverPermissionDefs.js"]) {
      expect(kod(f), f).not.toMatch(/sgkTutar|yolParasi|sgkMaliyet|yolParasiMaliyet|HEDEF\.SGK/);
    }
  });
});
