// Spec 0020: personel giderinin makinaya ve modele atanabilmesi (motor ve makina maliyeti). Kova kuralı 0001'in
// motorunda tek yerde değişir (C1): yalnız kira ortağa zorlanır, personel normal kalemlerle aynı yolu izler.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  giderKalemDogrula, kovaDagilimi, hesaplaGiderRaporu, tekrarlayanUret, turHaritasi, canliModelSeti, kalemGorunenAd,
  PERSONEL_ETIKETI, DAVRANIS,
} from "../src/lib/gider";
import { hesaplaMakinaMaliyetleri, makinaKarlilik } from "../src/lib/makinaMaliyeti";

const TUR = [{ id: 1, ad: "Genel", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }];
const turMap = turHaritasi(TUR);
const modeller = canliModelSeti([{ model: "AK100" }, { model: "AK200" }], []);
const per = (o = {}) => ({ id: 1, tarih: "2026-03-15", turId: 3, calisanId: 7, calisanAd: "Hasan Yılmaz", aciklama: "Hasan Yılmaz", resmiTutar: 30000, eldenTutar: 20000, tutar: null, kdvOrani: 0, ...o });
const MAKINA = { atamaTur: "makina", makinaTur: "musteri", makinaId: 1 };

// Makina maliyeti yardımcıları (tests/makina-maliyeti.test.js ile aynı biçim).
const mus = (id, o = {}) => ({ id, name: `Firma ${id}`, model: "AK100", serialNo: `S${id}`, installDate: "2026-03-20", fabrikaSatisBedeli: 500000, currency: "TRY", uretimTarihi: "2026-03-05", ...o });
const hesapla = (o) => hesaplaMakinaMaliyetleri({
  customers: [], stock: [], partStockLog: [], giderler: [], giderTurleri: TUR, standartGiderler: [],
  standardModels: [{ model: "AK100" }, { model: "AK200" }], customModels: [], giderAyarlari: { yururlukAy: "2026-01" }, ...o,
}, { bugun: "2026-09-24" });
const kar = (s, id) => makinaKarlilik(s, `musteri:${id}`);
const rapor = (giderler, o = {}) => hesaplaGiderRaporu({ giderler, turler: TUR, tedarikciler: [], canliModeller: modeller, yururlukAy: "2026-01", ...o },
  { baslangic: "2026-03-01", bitis: "2026-03-31" }, { bugun: "2026-09-24" });

describe("Spec 0020: personel kaleminin kovaları (R1, R4, R5, C1)", () => {
  it("AC-2: makinaya atanan personel kaleminin tamamı o makinanın doğrudan gideri olur", () => {
    expect(kovaDagilimi(per(MAKINA), { davranis: DAVRANIS.PERSONEL, customers: [mus(1)] })).toEqual({ makina: 50000, model: 0, dagitma: 0, ortak: 0 });
    const s = hesapla({ customers: [mus(1), mus(2)], giderler: [per(MAKINA)] });
    expect(kar(s, 1)).toMatchObject({ dogrudan: 50000, ortakPay: 0 });
    expect(kar(s, 2)).toMatchObject({ dogrudan: 0, ortakPay: 0 });
  });
  it("AC-4: modellere dağıtılan personel kaleminde her model satırı kendi havuzunu kurar; kalan ortak kovaya düşer", () => {
    // Havuz kalem tarihinden sonra (dahil) üretilen makinalara pay verir (0002 M13).
    const k = per({ tarih: "2026-03-01", atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 10000, adet: 2 }, { modelAd: "AK200", birimMaliyet: 5000, adet: 2 }] });
    expect(kovaDagilimi(k, { davranis: DAVRANIS.PERSONEL, canliModeller: modeller })).toEqual({ makina: 0, model: 30000, dagitma: 0, ortak: 20000 });
    const s = hesapla({ customers: [mus(1), mus(2), mus(3, { model: "AK200" })], giderler: [k] });
    // Ortak kalan 20.000 ayın üç makinasına eşit; havuzlar kendi modellerine.
    expect(kar(s, 1).malzeme).toBe(10000);
    expect(kar(s, 2).malzeme).toBe(10000);
    expect(kar(s, 3).malzeme).toBe(5000);
    expect(Math.round([1, 2, 3].reduce((a, i) => a + kar(s, i).ortakPay, 0) * 100)).toBe(2000000);
  });
  it("AC-5: ataması olmayan personel kalemi ortak kovada kalır ve ayın üretilen makinalarına eşit dağılır", () => {
    expect(kovaDagilimi(per(), { davranis: DAVRANIS.PERSONEL })).toEqual({ makina: 0, model: 0, dagitma: 0, ortak: 50000 });
    const s = hesapla({ customers: [mus(1), mus(2)], giderler: [per()] });
    expect(kar(s, 1)).toMatchObject({ dogrudan: 0, ortakPay: 25000 });
    expect(kar(s, 2)).toMatchObject({ dogrudan: 0, ortakPay: 25000 });
  });
  it("AC-6: kira davranışlı kalem atama taşısa bile ortak kalır (regresyon koruması)", () => {
    const kira = { id: 2, tarih: "2026-03-15", turId: 2, tutar: 30000, kdvOrani: 20, stopajOrani: 20, girisYonu: "brut", ...MAKINA };
    expect(kovaDagilimi(kira, { davranis: DAVRANIS.KIRA, customers: [mus(1)] })).toMatchObject({ makina: 0, ortak: 30000 });
    expect(kar(hesapla({ customers: [mus(1)], giderler: [kira] }), 1)).toMatchObject({ dogrudan: 0, ortakPay: 30000 });
    const { kayit } = giderKalemDogrula({ ...kira, atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 1, adet: 1 }] }, { turMap });
    expect(kayit).toMatchObject({ atamaTur: "", makinaId: null, modelSatirlari: [] });
  });
  it("AC-11: personel kalemi makinaya atanmışken makina silinirse kalem ortak gidere döner", () => {
    expect(kovaDagilimi(per(MAKINA), { davranis: DAVRANIS.PERSONEL, customers: [mus(1, { deletedAt: "2026-04-01" })] })).toMatchObject({ makina: 0, ortak: 50000 });
    const s = hesapla({ customers: [mus(1, { deletedAt: "2026-04-01" }), mus(2)], giderler: [per(MAKINA)] });
    expect(kar(s, 2).ortakPay).toBe(50000);
  });
  it("AC-12: 'dağıtılmasın' işaretli personel kalemi hiçbir makinanın maliyetine girmez", () => {
    const k = per({ atamaTur: "dagitma" });
    expect(kovaDagilimi(k, { davranis: DAVRANIS.PERSONEL })).toEqual({ makina: 0, model: 0, dagitma: 50000, ortak: 0 });
    const s = hesapla({ customers: [mus(1), mus(2)], giderler: [k] });
    for (const i of [1, 2]) expect(kar(s, i)).toMatchObject({ dogrudan: 0, malzeme: 0, ortakPay: 0 });
  });
});

describe("Spec 0020: doğrulama (R2, R5, X5)", () => {
  const form = (birim, o = {}) => ({ tarih: "2026-03-15", turId: 3, calisanId: 7, resmiTutar: "30.000", eldenTutar: "20.000",
    atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: birim, adet: 1 }], ...o });
  it("AC-13: personelde model dağılımının tabanı resmi + elden; 50.000'e kadar hata yok, üstü hata, eksik kısım bilgisi", () => {
    const tam = giderKalemDogrula(form("50.000"), { turMap });
    expect(tam.hatalar).toEqual([]);
    expect(tam.kayit).toMatchObject({ atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 50000, adet: 1 }] });
    expect(giderKalemDogrula(form("50.000,01"), { turMap }).hatalar.some(h => h.alan === "modelSatirlari" && /aşıyor/.test(h.mesaj))).toBe(true);
    const eksik = giderKalemDogrula(form("40.000"), { turMap });
    expect(eksik.hatalar).toEqual([]);
    expect(eksik.uyarilar.map(u => u.mesaj)).toContain("Dağıtılmayan 10.000 ₺ ortak gidere yazılacak.");
  });
  it("AC-2 / AC-3: personel kaleminde makina ataması kaydedilir (uyarı engel değildir); makina seçilmezse hata", () => {
    const g = giderKalemDogrula({ tarih: "2026-03-15", turId: 3, calisanId: 7, resmiTutar: 30000, eldenTutar: 20000, ...MAKINA }, { turMap });
    expect(g.hatalar).toEqual([]);
    expect(g.kayit).toMatchObject({ atamaTur: "makina", makinaTur: "musteri", makinaId: 1, tutar: null });
    expect(giderKalemDogrula({ tarih: "2026-03-15", turId: 3, calisanId: 7, resmiTutar: 30000, atamaTur: "makina" }, { turMap }).hatalar.map(h => h.alan)).toContain("makinaId");
  });
  it("AC-16: tekrarlayan personel tanımı atama taşısa bile üretilen kalem ortak gider olarak oluşur", () => {
    let n = 500;
    const u = tekrarlayanUret([{ id: 9, turId: 3, ad: "Hasan", calisanId: 7, baslangicAy: "2026-01", uretilenAylar: [], ...MAKINA }], [], "2026-03",
      { turMap, calisanlar: [{ id: 7, ad: "Hasan", resmiMaliyet: 30000, eldenMaliyet: 20000 }], uid: () => ++n });
    expect(u.yeniKalemler).toHaveLength(1);
    expect(u.yeniKalemler[0]).toMatchObject({ atamaTur: "", makinaId: null, modelSatirlari: [] });
  });
});

describe("Spec 0020: rapor ve etiket (R8, R9)", () => {
  it("R8: personel kalemi makina bazlı çıktılarda her zaman 'Personel gideri'; diğerleri açıklamasıyla", () => {
    expect(PERSONEL_ETIKETI).toBe("Personel gideri");
    expect(kalemGorunenAd(per(), DAVRANIS.PERSONEL)).toBe("Personel gideri");
    expect(kalemGorunenAd(per({ aciklama: "" }), DAVRANIS.PERSONEL)).toBe("Personel gideri");
    expect(kalemGorunenAd({ aciklama: "Elektrik" }, DAVRANIS.NORMAL)).toBe("Elektrik");
    expect(kalemGorunenAd({ aciklama: "" }, DAVRANIS.NORMAL)).toBe("");
  });
  it("AC-8 / AC-9: maliyet motoru doğrudan kalem ve havuz satırlarına çalışan adını değil etiketi yazar", () => {
    const s = hesapla({ customers: [mus(1), mus(2)], giderler: [per(MAKINA), per({ id: 2, tarih: "2026-03-01", atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 10000, adet: 2 }] })] });
    const d = kar(s, 1);
    expect(d.dogrudanKalemler).toEqual([{ kalemId: 1, tarih: "2026-03-15", aciklama: "Personel gideri", tutar: 50000 }]);
    expect(d.malzemePaylari.map(p => p.aciklama)).toEqual(["Personel gideri"]);
    expect(JSON.stringify(d)).not.toMatch(/Hasan|resmi|elden/i);
  });
  it("AC-14: makinası silinmiş personel kalemi 'düşen atamalar'da görünür; ölü modele yazılmış satırı da", () => {
    const r = rapor([per(MAKINA), per({ id: 2, atamaTur: "model", modelSatirlari: [{ modelAd: "AK999", birimMaliyet: 1000, adet: 3 }] })], { customers: [mus(1, { deletedAt: "x" })] });
    expect(r.dusenAtamalar.map(d => [d.kalem.id, d.neden])).toEqual([[1, "makina"], [2, "model"]]);
    expect(r.kovalar.ortak).toBe(100000);
  });
  it("AC-15: model kırılımında personel satırının açıklaması etiket; makina kırılımında kalem makinaya bağlı", () => {
    const r = rapor([per(MAKINA), per({ id: 2, atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 10000, adet: 2 }] })], { customers: [mus(1)] });
    expect(r.makinaBazli).toHaveLength(1);
    expect(r.makinaBazli[0]).toMatchObject({ toplam: 50000 });
    expect(r.modelBazli[0].satirlar.map(x => x.aciklama)).toEqual(["Personel gideri"]);
    expect(r.kismiOrtak.map(x => x.tutar)).toEqual([30000]);
  });
});

describe("Spec 0020 X5: tanım formunun atama kapısı bilinçli olarak yalnız normal", () => {
  it("AC-16: SettingsGiderTanimlari iki kapısı da 'DAVRANIS.NORMAL' ve gerekçe yorumu taşıyor; atanabilirMi kullanılmıyor", () => {
    const s = readFileSync(path.join(__dirname, "../src/components/settings/SettingsGiderTanimlari.jsx"), "utf-8");
    const satirlar = s.split("\n");
    const kapilar = satirlar.map((l, i) => [l, i]).filter(([l]) => /dav === DAVRANIS\.NORMAL/.test(l));
    expect(kapilar).toHaveLength(2);
    for (const [, i] of kapilar) expect(satirlar.slice(Math.max(0, i - 2), i).join("\n"), `satır ${i + 1}`).toMatch(/spec 0020 X5/);
    expect(s).not.toMatch(/atanabilirMi\(|import[^;]*atanabilirMi/);
  });
});
