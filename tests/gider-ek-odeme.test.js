// Spec 0023: çalışan ek ödemeleri (fazla mesai, prim, ikramiye), saf motor (src/lib/gider.js).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  giderKalemDogrula, turHaritasi, kalemTutari, odenecekTutar, hesaplaGiderRaporu, tekrarlayanUret, kovaDagilimi, borcOzeti,
  odemeHedefleri, odemeleriUygula, EK_ODEME_TURLERI, DAVRANIS, HEDEF,
} from "../src/lib/gider";
import { odemeHatirlatmalari } from "../src/lib/odemeHatirlatma";
import { hesaplaMakinaMaliyetleri } from "../src/lib/makinaMaliyeti";

const TUR = [{ id: 1, ad: "Genel", davranis: "normal" }, { id: 3, ad: "Personel", davranis: "personel" }];
const turMap = turHaritasi(TUR);
let n = 7000;
const uid = () => ++n;
const dogrula = (form) => giderKalemDogrula(form, { turMap, uid });
const kayit = (form) => { const r = dogrula(form); expect(r.hatalar).toEqual([]); return r.kayit; };
const per = (o = {}) => ({ tarih: "2026-09-01", turId: 3, calisanId: 7, calisanAd: "Hasan", resmiTutar: 30000, eldenTutar: 20000, ...o });
const ek = (tur, resmiTutar, eldenTutar = "", aciklama = "") => ({ tur, resmiTutar, eldenTutar, aciklama });
const rapor = (giderler, o = {}) => hesaplaGiderRaporu({ giderler, turler: TUR, tedarikciler: [], yururlukAy: "2026-01", ...o },
  { baslangic: "2026-09-01", bitis: "2026-09-30" }, { bugun: "2026-09-28" });

describe("Spec 0023: ek ödeme satırları ve tek toplam (R1–R3, C5)", () => {
  it("AC-1 / AC-2 / AC-3 / AC-6: fazla mesai ve prim resmi/elden ayrı girilir; kalem ve ödenecek tutar = maaş + ekler", () => {
    const k = kayit(per({ id: 1, ekOdemeler: [ek("fazlaCalisma", "4.000", "1.000", "Eylül yoğunluğu"), ek("prim", "", "2.500")] }));
    expect(k.ekOdemeler).toEqual([
      { tur: "fazlaCalisma", aciklama: "Eylül yoğunluğu", resmiTutar: 4000, eldenTutar: 1000 },
      { tur: "prim", aciklama: "", resmiTutar: null, eldenTutar: 2500 },
    ]);
    expect(kalemTutari(k, DAVRANIS.PERSONEL)).toBe(57500);
    expect(odenecekTutar(k, DAVRANIS.PERSONEL)).toBe(57500);
    expect(EK_ODEME_TURLERI.map(t => t.label)).toEqual(["Fazla mesai", "Prim", "İkramiye"]);
  });
  it("AC-4 / AC-17: aynı türden iki satır (iki prim) girilebilir; ikisi de toplamda ve raporda ayrı ayrı", () => {
    const k = kayit(per({ id: 2, ekOdemeler: [ek("prim", "1.000", "", "Teslim primi"), ek("prim", "500", "", "Kalite primi")] }));
    expect(kalemTutari(k, DAVRANIS.PERSONEL)).toBe(51500);
    const c = rapor([k]).turKirilimi.find(t => t.davranis === "personel").calisanlar[0];
    expect(c).toMatchObject({ resmi: 30000, elden: 20000, ek: 1500, toplam: 51500 });
    expect(c.ekSatirlari.map(x => [x.tur, x.aciklama, x.tutar])).toEqual([["prim", "Teslim primi", 1000], ["prim", "Kalite primi", 500]]);
  });
  it("AC-15: maaşı sıfır, yalnız 5.000 ikramiyesi olan kalem kaydedilir (şart genel toplama)", () => {
    const k = kayit(per({ resmiTutar: "", eldenTutar: "", ekOdemeler: [ek("ikramiye", "5.000")] }));
    expect(kalemTutari(k, DAVRANIS.PERSONEL)).toBe(5000);
    expect(dogrula(per({ resmiTutar: "", eldenTutar: "", ekOdemeler: [] })).hatalar).toEqual([{ alan: "resmiTutar", mesaj: "Tutar sıfırdan büyük olmalı." }]);
  });
  it("AC-16: negatif tutar kaydı engeller, nedeni ve satırı söylenir; tamamen boş satır sessizce atılır; açıklamalı sıfır satır hata", () => {
    expect(dogrula(per({ ekOdemeler: [ek("prim", "1.000"), ek("prim", "-5")] })).hatalar)
      .toEqual([{ alan: "ekOdemeler", satir: 1, mesaj: "Ek ödeme satırında tutar negatif olamaz (2. satır)." }]);
    expect(kayit(per({ ekOdemeler: [ek("prim", "", "", ""), ek("ikramiye", "300")] })).ekOdemeler).toEqual([{ tur: "ikramiye", aciklama: "", resmiTutar: 300, eldenTutar: null }]);
    expect(dogrula(per({ ekOdemeler: [ek("prim", "", "", "Unutulmuş prim")] })).hatalar)
      .toEqual([{ alan: "ekOdemeler", satir: 0, mesaj: "Ek ödeme satırında tutar sıfırdan büyük olmalı (1. satır)." }]);
  });
  it("R3 / AC-20: borç özeti ve hatırlatıcı aynı toplamı kullanır; ek ödemeler kalemin tek vadesini ve ödeme durumunu paylaşır", () => {
    // Spec 0042: resmi ve eldeni olan maaş iki hedefle (satırlı) doğar; vade satırlardadır, hatırlatıcı personeli tek
    // alt satırda (iki hedefin toplamı) gösterir.
    const k = { id: 5, ...kayit(per({ ekOdemeler: [ek("prim", "2.000")], sonOdemeTarihi: "2026-09-30" })) };
    expect(Object.keys(k.ekOdemeler[0]).sort()).toEqual(["aciklama", "eldenTutar", "resmiTutar", "tur"]);
    const b = borcOzeti([k], { turler: TUR }, "2026-09-28");
    expect(b.satirlar).toEqual([expect.objectContaining({ tur: "calisanlar", tutar: 52000 })]);
    const h = odemeHatirlatmalari([k], { turler: TUR, yururlukAy: "2026-01" }, "2026-09-28");
    expect(h.yaklasanSatirlar.filter(s => s.tur === "personel").map(s => [s.odenecek, s.vade])).toEqual([[52000, "2026-09-30"]]);
    expect(borcOzeti([{ ...k, odendi: true }], { turler: TUR }, "2026-09-28").satirlar).toEqual([]);
  });
  it("R12 (P6): taksitli personel kaleminde ek ödeme eklenince fark yalnız ödenmemiş taksitlere bölünür", () => {
    // Spec 0024 (Q1): ödeme hareketle; satır bayrak saklamaz, durum hareketten türer.
    // Spec 0042: taksit resmi hedefe (30.000 → 2 × 15.000) uygulanır, elden (20.000) tek satırdır; resmi ikramiye
    // eklenince fark yalnız resmi hedefin ödenmemiş taksitine bölünür, elden değişmez.
    const k = kayit(per({ id: 6, taksitSayisi: 2, sonOdemeTarihi: "2026-09-30" }));
    const h = [{ id: 1, tur: "odeme", giderId: 6, taksitId: k.taksitler[0].id, tutar: 15000, tarih: "2026-09-30" }];
    const odenmis = odemeleriUygula([k], h, turMap)[0];
    const y = kayit({ ...odenmis, taksitSayisi: 2, sonOdemeTarihi: "2026-09-30", ekOdemeler: [ek("ikramiye", "10.000")] });
    const z = odemeleriUygula([y], h, turMap)[0];
    expect(z.taksitler.map(r => [r.hedef, r.tutar, r.odendi])).toEqual([["ana", 15000, true], ["ana", 25000, false], ["elden", 20000, false]]);
    expect(odemeHedefleri(z, DAVRANIS.PERSONEL).find(x => x.hedef === HEDEF.ANA).kalanK).toBe(2500000);
  });
});

describe("Spec 0023: üretim, rapor ve maliyet (R4–R7)", () => {
  it("AC-5: tekrarlayan üretim ek ödemeleri boş üretir; önceki ayın primi taşınmaz", () => {
    const onceki = { id: 9, tarih: "2026-08-01", turId: 3, calisanId: 7, tanimId: 1, donem: "2026-08", resmiTutar: 30000, eldenTutar: 20000, ekOdemeler: [{ tur: "prim", resmiTutar: 3000 }] };
    const u = tekrarlayanUret([{ id: 1, turId: 3, ad: "Hasan", calisanId: 7, baslangicAy: "2026-01", uretilenAylar: ["2026-08"] }], [onceki], "2026-09",
      { turMap, calisanlar: [{ id: 7, ad: "Hasan", resmiMaliyet: 30000, eldenMaliyet: 20000 }], uid });
    expect(u.yeniKalemler[0]).toMatchObject({ resmiTutar: 30000, eldenTutar: 20000, ekOdemeler: [] });
  });
  it("AC-7 / AC-10: geçmiş aya ek ödeme girilince o ayın personel gideri ve dönem toplamı artar", () => {
    const k = kayit(per({ id: 3 }));
    const once = rapor([k]);
    const sonra = rapor([{ ...k, ekOdemeler: [{ tur: "fazlaCalisma", resmiTutar: 7000, eldenTutar: null }] }]);
    expect(sonra.toplam - once.toplam).toBe(7000);
    expect(sonra.turKirilimi.find(t => t.davranis === "personel").toplam).toBe(57000);
  });
  it("AC-8: geçmiş aya ek ödeme girilince o ay üretilen makinanın maliyeti artar", () => {
    const hesap = (giderler) => hesaplaMakinaMaliyetleri({ customers: [{ id: 1, name: "F", model: "AK100", serialNo: "S1", installDate: "2026-09-20", uretimTarihi: "2026-09-05", fabrikaSatisBedeli: 1, currency: "TRY" }],
      stock: [], partStockLog: [], giderler, giderTurleri: TUR, standartGiderler: [], standardModels: [{ model: "AK100" }], customModels: [], giderAyarlari: { yururlukAy: "2026-01" } }, { bugun: "2026-09-28" });
    const k = { id: 4, ...kayit(per()) };
    const a = hesap([k]).makinalar.get("musteri:1").ortakPay;
    const b = hesap([{ ...k, ekOdemeler: [{ tur: "prim", resmiTutar: 4000 }] }]).makinalar.get("musteri:1").ortakPay;
    expect(b - a).toBe(400000);
  });
  it("AC-9: makinaya atanmış kalemde ek tutar aynı makinaya, ortakta ortağa gider", () => {
    const customers = [{ id: 1, model: "AK100" }];
    const atanmis = kayit(per({ atamaTur: "makina", makinaTur: "musteri", makinaId: 1, ekOdemeler: [ek("prim", "5.000")] }));
    expect(kovaDagilimi(atanmis, { davranis: DAVRANIS.PERSONEL, customers })).toMatchObject({ makina: 55000, ortak: 0 });
    const ortak = kayit(per({ ekOdemeler: [ek("prim", "5.000")] }));
    expect(kovaDagilimi(ortak, { davranis: DAVRANIS.PERSONEL, customers })).toMatchObject({ makina: 0, ortak: 55000 });
  });
});

describe("Spec 0023: adaş ayrımı (R10, AC-14, AC-18)", () => {
  it("AC-18: yeni alanların, satır alanlarının, tür kodlarının ve tablonun adı 'mesai' içermez", () => {
    const k = kayit(per({ ekOdemeler: [ek("fazlaCalisma", "1")] }));
    const adlar = [...Object.keys(k), ...Object.keys(k.ekOdemeler[0]), ...EK_ODEME_TURLERI.map(t => t.value), "gider_ek_odemeleri"];
    expect(adlar.filter(a => /mesai/i.test(a))).toEqual([]);
    const db = readFileSync(path.join(__dirname, "../electron/db.cjs"), "utf-8");
    expect(db).toMatch(/CREATE TABLE IF NOT EXISTS gider_ek_odemeleri/);
  });
  it("AC-14: gider motoru ve formu servis işçilik altyapısını (mesaiDk, calismaSaatleri) kullanmaz", () => {
    for (const f of ["src/lib/gider.js", "src/components/GiderForm.jsx"]) {
      const s = readFileSync(path.join(__dirname, "..", f), "utf-8").replace(/\/\/[^\n]*/g, "");
      expect(s, f).not.toMatch(/mesaiDk|calismaSaatleri/);
    }
  });
});
