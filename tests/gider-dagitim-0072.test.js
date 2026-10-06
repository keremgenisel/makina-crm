// Spec 0072: peşin ödenen giderin makina maliyetine aylara dağıtılması, saf motor (gider.dagitimPaylari ve ilgili
// yardımcılar, makinaMaliyeti ortak payı, gelecek ay ve yürürlük süzgeci) ve kaynak taramaları. Test adları AC-<n> taşır.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  dagitimPaylari, dagitimAySayisiCoz, dagitimAyOf, dagitimAraligi, dagitimRozetMetni, dagitimSecilebilirMi, esitBol,
  giderKalemDogrula, tekrarlayanUret, turHaritasi, kalemKovalariKurus, hesaplaGiderRaporu, borcOzeti, canliModelSeti,
  DAGITIM_AY_HATASI, DAVRANIS, ATAMA,
} from "../src/lib/gider";
import { hesaplaMakinaMaliyetleri, makinaKarlilik, karlilikOzeti, dagitimPayKapsami, ORTAK_KAYNAK } from "../src/lib/makinaMaliyeti";
import { odemeHatirlatmalari } from "../src/lib/odemeHatirlatma";

const MOD = [{ model: "AK100" }, { model: "AK200" }];
const TUR = [{ id: 1, ad: "Genel", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }];
const turMap = turHaritasi(TUR);
const BUGUN = "2026-09-24";
const veri = (o = {}) => ({
  customers: [], stock: [], partStockLog: [], giderler: [], giderTurleri: TUR, standartGiderler: [],
  standardModels: MOD, customModels: [], giderAyarlari: { yururlukAy: "2026-01" }, ...o,
});
const hesapla = (o, bugun = BUGUN) => hesaplaMakinaMaliyetleri(veri(o), { bugun });
const mus = (id, uretim, o = {}) => ({ id, name: `Firma ${id}`, model: "AK100", serialNo: `S${id}`, installDate: uretim, fabrikaSatisBedeli: 500000, currency: "TRY", uretimTarihi: uretim, ...o });
const gid = (id, o = {}) => ({ id, tarih: "2026-03-15", turId: 1, tutar: 1000, kdvOrani: 20, ...o });
const kar = (s, id) => makinaKarlilik(s, `musteri:${id}`);
// İnternet aboneliği: 12.000 TL, 12 aya, Mart 2026.
const INTERNET = gid(10, { tarih: "2026-03-30", tutar: 12000, aciklama: "İnternet aboneliği", dagitimAy: 12 });
const dagitimsiz = (g) => g.map(({ dagitimAy, ...k }) => k);
const json = (x) => JSON.stringify(x, (k, v) => (k === "dagitimAy" ? undefined : v));

describe("Spec 0072 A: dağıtım payları", () => {
  it("AC-1 / AC-37: boş ya da bir dağıtım yok; dağıtımsız kalem kendi ayında tek giriş, ortak kovası sıfırsa boş liste", () => {
    expect(dagitimPaylari(gid(1, { tutar: 500 }), DAVRANIS.NORMAL)).toEqual([{ ay: "2026-03", payK: 50000 }]);
    expect(dagitimPaylari(gid(1, { tutar: 500, dagitimAy: 1 }), DAVRANIS.NORMAL)).toEqual([{ ay: "2026-03", payK: 50000 }]);
    expect(dagitimPaylari(gid(1, { tutar: 500, dagitimAy: "" }), DAVRANIS.NORMAL)).toEqual([{ ay: "2026-03", payK: 50000 }]);
    expect(dagitimPaylari(gid(1, { atamaTur: ATAMA.DAGITMA, dagitimAy: 12 }), DAVRANIS.NORMAL)).toEqual([]);
    // Çözülen makina ataması ortak kovası sıfır: boş (R17 savunması).
    const coz = () => ({ tur: "musteri", id: 1 });
    expect(dagitimPaylari(gid(1, { atamaTur: ATAMA.MAKINA, makinaTur: "musteri", makinaId: 1, dagitimAy: 12 }), DAVRANIS.NORMAL, { makinaCoz: coz })).toEqual([]);
  });
  it("AC-2: dağıtım gider tarihinin ayından başlar; ayın 30'unda ödenen kalem o ayın tam payını alır", () => {
    const p = dagitimPaylari(INTERNET, DAVRANIS.NORMAL);
    expect(p).toHaveLength(12);
    expect(p[0]).toEqual({ ay: "2026-03", payK: 100000 });
    expect(p[11].ay).toBe("2027-02");
  });
  it("AC-3 / AC-4: payların toplamı tutara kuruşu kuruşuna eşit; artık son aya, bölme esitBol ile", () => {
    const p = dagitimPaylari(gid(1, { tutar: 1000, dagitimAy: 7 }), DAVRANIS.NORMAL);
    expect(p.reduce((a, x) => a + x.payK, 0)).toBe(100000);
    expect(p.map(x => x.payK)).toEqual(esitBol(100000, 7));
    expect(p[6].payK).toBe(100000 - 14285 * 6);
    expect(p.slice(0, 6).every(x => x.payK === 14285)).toBe(true);
  });
  it("AC-6: 60'ın üstü, sıfır, negatif ve tam sayı olmayan ay sayısı tek hata metniyle reddedilir", () => {
    for (const v of ["61", "0", "-1", "1,5", "1.5", "abc"]) expect(dagitimAySayisiCoz(v)).toEqual({ hata: DAGITIM_AY_HATASI });
    expect(DAGITIM_AY_HATASI).toBe("Dağıtım ay sayısı 1 ile 60 arasında tam sayı olmalı.");
    expect(dagitimAySayisiCoz("")).toEqual({ deger: 1 });
    expect(dagitimAySayisiCoz("60")).toEqual({ deger: 60 });
  });
  it("AC-36: bir ya da boş değer saklanmaz; makina ve 'dağıtılmasın' atamasında alan temizlenir", () => {
    const d = (o) => giderKalemDogrula({ tarih: "2026-03-15", turId: 1, tutar: "1000", kdvOrani: "20", ...o }, { turMap });
    expect(d({ dagitimAy: "12" }).kayit.dagitimAy).toBe(12);
    expect("dagitimAy" in d({ dagitimAy: "1" }).kayit).toBe(false);
    expect("dagitimAy" in d({ dagitimAy: "" }).kayit).toBe(false);
    expect("dagitimAy" in d({ dagitimAy: "12", atamaTur: ATAMA.DAGITMA }).kayit).toBe(false);
    expect("dagitimAy" in d({ dagitimAy: "12", atamaTur: ATAMA.MAKINA, makinaTur: "stok", makinaId: 4 }).kayit).toBe(false);
    // Makina atamasında geçersiz değer hata değil (alan pasif, temizlenir).
    expect(d({ dagitimAy: "99", atamaTur: ATAMA.MAKINA, makinaTur: "stok", makinaId: 4 }).hatalar).toEqual([]);
    expect(d({ dagitimAy: "99" }).hatalar).toEqual([{ alan: "dagitimAy", mesaj: DAGITIM_AY_HATASI }]);
    // Kira ve personel de dağıtılabilir (S3).
    const kira = giderKalemDogrula({ tarih: "2026-03-15", turId: 2, tutar: "20000", kdvOrani: "20", stopajOrani: "20", girisYonu: "brut", dagitimAy: "12" }, { turMap });
    expect(kira.kayit.dagitimAy).toBe(12);
  });
  it("AC-5: tekrarlayan tanımdaki dağıtım üretilen kaleme taşınır; makina atamalı tanımda taşınmaz", () => {
    const t = [{ id: 9, turId: 1, ad: "Yazılım", tutar: 1200, kdvOrani: 20, baslangicAy: "2026-03", uretilenAylar: [], dagitimAy: 12 },
      { id: 8, turId: 1, ad: "Bakım", tutar: 100, kdvOrani: 20, baslangicAy: "2026-03", uretilenAylar: [], dagitimAy: 12, atamaTur: ATAMA.MAKINA, makinaTur: "stok", makinaId: 1 }];
    let n = 100;
    const u = tekrarlayanUret(t, [], "2026-03", { turMap, uid: () => ++n });
    expect(u.yeniKalemler.find(k => k.tanimId === 9).dagitimAy).toBe(12);
    expect("dagitimAy" in u.yeniKalemler.find(k => k.tanimId === 8)).toBe(false);
  });
  it("AC-15: rozet kapsam aralığını yazar, kaçıncı ay yazmaz", () => {
    expect(dagitimRozetMetni(INTERNET)).toBe("12 aya dağıtılmış · 03.2026 – 02.2027");
    expect(dagitimRozetMetni(gid(1))).toBe("");
    expect(dagitimAraligi(INTERNET)).toEqual({ aySayisi: 12, ilkAy: "2026-03", sonAy: "2027-02" });
    expect(dagitimSecilebilirMi(ATAMA.MODEL)).toBe(true);
    expect(dagitimAyOf({ dagitimAy: 12, atamaTur: ATAMA.MAKINA })).toBe(1);
  });
});

describe("Spec 0072 B: makina maliyeti", () => {
  it("AC-7 / AC-8: dağıtımın ikinci ayında üretilen makina aylık payı alır; kapsam dışı ay pay almaz", () => {
    const s = hesapla({ customers: [mus(1, "2026-04-10"), mus(2, "2027-05-10")], giderler: [INTERNET] }, "2027-06-01");
    expect(kar(s, 1).ortakPay).toBe(1000);
    expect(kar(s, 2).ortakPay).toBe(0);
  });
  it("AC-24: model havuzu ve doğrudan atanmış kalemin payları dağıtımdan önce ve sonra aynıdır", () => {
    const g = [gid(1, { atamaTur: ATAMA.MODEL, tutar: 3000, modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 1000, adet: 2 }], dagitimAy: 12 }),
      gid(2, { atamaTur: ATAMA.MAKINA, makinaTur: "musteri", makinaId: 1, tutar: 700, dagitimAy: 12 })];
    const c = [mus(1, "2026-03-20"), mus(2, "2026-05-02")];
    const once = hesapla({ customers: c, giderler: dagitimsiz(g) }), sonra = hesapla({ customers: c, giderler: g });
    for (const id of [1, 2]) {
      expect(kar(sonra, id).malzeme).toBe(kar(once, id).malzeme);
      expect(kar(sonra, id).dogrudan).toBe(kar(once, id).dogrudan);
    }
    // Model kaleminin ortak kalanı (1.000) dağıtılır: Mart'ta 1.000 değil 1.000/12.
    expect(sonra.aylar.get("2026-03").ortakGercek).toBe(8333);
    expect(once.aylar.get("2026-03").ortakGercek).toBe(100000);
  });
  it("AC-25: ortak gider kaynağı standart iken dağıtımın etkisi yoktur", () => {
    const std = { giderAyarlari: { yururlukAy: "2026-01", ortakGiderKaynagi: ORTAK_KAYNAK.STANDART }, standartGiderler: [{ id: 1, grupId: 1, ad: "Enerji", tutar: 500, baslangicAy: "2026-01" }] };
    const c = [mus(1, "2026-04-10")];
    const a = hesapla({ ...std, customers: c, giderler: [INTERNET] }), b = hesapla({ ...std, customers: c, giderler: dagitimsiz([INTERNET]) });
    expect(kar(a, 1).ortakPay).toBe(kar(b, 1).ortakPay);
    expect(kar(a, 1).dagitimlar).toEqual([]);
  });
  it("AC-26: gelecek aylara düşen paylar bugün hesaba girmez, o aylar ay tablosuna eklenmez, 'dağıtılmamış' şişmez", () => {
    const s = hesapla({ giderler: [INTERNET] });
    expect(s.aylar.has("2026-10")).toBe(false);
    expect([...s.aylar.keys()].pop()).toBe("2026-09");
    const ozet = karlilikOzeti(s, { baslangic: "2026-03-01", bitis: "2026-09-30" });
    expect(ozet.dagitilmamis.tutar).toBe(7000); // Mart–Eylül yedi ay, üretim yok
    // Ay gelince kendiliğinden girer.
    expect(hesapla({ giderler: [INTERNET] }, "2026-12-05").aylar.get("2026-12").ortakGercek).toBe(100000);
  });
  it("AC-13 / AC-37: süzgeç tek saf yardımcıdır; yürürlük öncesi ay ve gelecek ay elenir, kalemin kendi ayı kalır", () => {
    const p = [{ ay: "2025-12", payK: 1 }, { ay: "2026-01", payK: 2 }, { ay: "2026-10", payK: 3 }];
    expect(dagitimPayKapsami(p, { buAy: "2026-09", yururlukAy: "2026-01" })).toEqual([{ ay: "2026-01", payK: 2 }]);
    expect(dagitimPayKapsami([{ ay: "2026-11", payK: 5 }, { ay: "2026-12", payK: 5 }], { buAy: "2026-09" })).toEqual([{ ay: "2026-11", payK: 5 }]);
    // Bugünkü veride erişilemez: dağıtım hiçbir zaman kalemin ayından önceye pay yazmaz.
    for (const n of [2, 12, 60]) expect(dagitimPaylari(gid(1, { dagitimAy: n }), DAVRANIS.NORMAL).every(x => x.ay >= "2026-03")).toBe(true);
  });
  it("AC-12: kalemin kovası değişmez (dört kova aynı)", () => {
    const k = gid(1, { atamaTur: ATAMA.MODEL, tutar: 3000, modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 1000, adet: 2 }] });
    const m = canliModelSeti(MOD, []);
    const { makinaCozum: a, ...ka } = kalemKovalariKurus(k, { canliModeller: m });
    const { makinaCozum: b, ...kb } = kalemKovalariKurus({ ...k, dagitimAy: 12 }, { canliModeller: m });
    expect(kb).toEqual(ka);
  });
  it("AC-27: dağıtım sayısı 12'den 6'ya düşünce geçmiş ayların makina maliyeti değişir", () => {
    const c = [mus(1, "2026-08-10")];
    expect(kar(hesapla({ customers: c, giderler: [INTERNET] }), 1).ortakPay).toBe(1000);
    expect(kar(hesapla({ customers: c, giderler: [{ ...INTERNET, dagitimAy: 6 }] }), 1).ortakPay).toBe(2000);
  });
  it("AC-28: çöpteki kalemin bütün ayları çıkar, geri alınınca döner; tutar değişince bütün aylar yeniden bölünür", () => {
    const c = [mus(1, "2026-08-10")];
    expect(kar(hesapla({ customers: c, giderler: [{ ...INTERNET, deletedAt: "x" }] }), 1).ortakPay).toBe(0);
    expect(kar(hesapla({ customers: c, giderler: [INTERNET] }), 1).ortakPay).toBe(1000);
    expect(kar(hesapla({ customers: c, giderler: [{ ...INTERNET, tutar: 24000 }] }), 1).ortakPay).toBe(2000);
  });
  it("AC-33: kapanmış partinin ayında ortak gider dağıtım yüzünden de değişebilir (bilinçli)", () => {
    const parti = { id: 60, ad: "P1", baslangicAy: "2026-04", bitisAy: "2026-05", kapanisOrtaklari: { "2026-04": 0, "2026-05": 0 } };
    const s = hesapla({ uretimPartileri: [parti], customers: [mus(1, "2026-04-10", { partiId: 60 })], giderler: [INTERNET] });
    const p = s.partiler.find(x => String(x.id) === "60");
    expect(p.degisimler.map(d => [d.ay, d.bugun])).toEqual([["2026-04", 1000], ["2026-05", 1000]]);
  });
  it("AC-14: dağıtımsız veride ay tablosu, makina payları ve özet birebir aynı (motorun tek yolu)", () => {
    const c = [mus(1, "2026-03-20"), mus(2, "2026-05-02")];
    const g = [gid(1, { tutar: 300000 }), gid(2, { tarih: "2026-05-01", tutar: 1234.56 }), gid(3, { tarih: "2026-04-01", atamaTur: ATAMA.DAGITMA })];
    const a = hesapla({ customers: c, giderler: g }), b = hesapla({ customers: c, giderler: g.map(k => ({ ...k, dagitimAy: 1 })) });
    expect(json([...a.aylar])).toBe(json([...b.aylar]));
    expect(kar(a, 1)).toEqual(kar(b, 1));
    expect(a.dagitimVar).toBe(false);
  });
  it("AC-16 (motor): makinanın detayı aylık paylı dağıtılmış kalemi taşır; personel kalemi 'Personel gideri'", () => {
    const pers = { id: 11, tarih: "2026-03-05", turId: 3, calisanId: 7, calisanAd: "Hasan", resmiTutar: 1200, eldenTutar: 0, aciklama: "Hasan", dagitimAy: 12 };
    const s = hesapla({ customers: [mus(1, "2026-04-10")], giderler: [INTERNET, pers] });
    const d = kar(s, 1).dagitimlar;
    expect(d.map(x => [x.aciklama, x.aySayisi, x.pay])).toEqual([["İnternet aboneliği", 12, 1000], ["Personel gideri", 12, 100]]);
    expect(JSON.stringify(d)).not.toMatch(/Hasan/);
  });
  it("AC-29: dağıtımlı veriyle de C9 süre eşiği korunur", () => {
    const customers = Array.from({ length: 4000 }, (_, i) => mus(i + 1, `2026-0${1 + (i % 9)}-1${i % 9}`, { model: MOD[i % 2].model }));
    const giderler = Array.from({ length: 20000 }, (_, i) => gid(i + 1, { tarih: `2026-0${1 + (i % 9)}-0${1 + (i % 9)}`, tutar: 1000 + i, ...(i % 5 === 0 ? { dagitimAy: 60 } : {}) }));
    const t0 = performance.now();
    const s = hesapla({ customers, giderler });
    const o = karlilikOzeti(s, { baslangic: "2026-01-01", bitis: "2026-09-30" });
    const sure = performance.now() - t0;
    console.log(`[0072 C9] 4.000 makina / 20.000 kalem (dağıtımlı): ${sure.toFixed(0)} ms`);
    expect(o.satirlar.length).toBeGreaterThan(0);
    expect(sure).toBeLessThan(3000);
  });
});

describe("Spec 0072 C: dokunulmayanlar", () => {
  const AYAR = { turler: TUR, tedarikciler: [], yururlukAy: "2026-01" };
  const G = [INTERNET, gid(2, { tarih: "2026-04-02", tutar: 500, sonOdemeTarihi: "2026-09-28" })];
  it("AC-9 / AC-10: dönem raporu (tutarlar, KDV, kovalar) dağıtımdan önce ve sonra aynı; kalem gider tarihinin ayında tam tutarla", () => {
    for (const [bas, bit] of [["2026-03-01", "2026-03-31"], ["2026-04-01", "2026-04-30"]]) {
      const a = hesaplaGiderRaporu({ giderler: G, ...AYAR }, { baslangic: bas, bitis: bit }, { bugun: BUGUN });
      const b = hesaplaGiderRaporu({ giderler: dagitimsiz(G), ...AYAR }, { baslangic: bas, bitis: bit }, { bugun: BUGUN });
      expect(json(a)).toBe(json(b));
    }
    const mart = hesaplaGiderRaporu({ giderler: G, ...AYAR }, { baslangic: "2026-03-01", bitis: "2026-03-31" }, { bugun: BUGUN });
    expect(mart.toplam).toBe(12000);
  });
  it("AC-11: borç özeti ve hatırlatıcı tek seferlik ödemeyi görür", () => {
    expect(json(borcOzeti(G, AYAR, BUGUN))).toBe(json(borcOzeti(dagitimsiz(G), AYAR, BUGUN)));
    expect(json(odemeHatirlatmalari(G, { ...AYAR, esikGun: 7 }, BUGUN))).toBe(json(odemeHatirlatmalari(dagitimsiz(G), { ...AYAR, esikGun: 7 }, BUGUN)));
  });
});

describe("Spec 0072 D: tek hesap ve kapsam (kaynak taraması)", () => {
  it("AC-19: aylık pay tek fonksiyondan; motor onu çağırır, ekranlar bölme yapmaz", () => {
    const motor = readFileSync("src/lib/makinaMaliyeti.js", "utf8");
    expect(motor).toMatch(/dagitimPaylari\(k, dav,/);
    expect(motor).not.toMatch(/esitBol/);
    for (const f of ["src/components/gider/MakinaModelGorunumu.jsx", "src/components/gider/MakinaMaliyetDetay.jsx", "src/components/gider/DonemRaporu.jsx",
      "src/components/GiderForm.jsx", "src/components/gider/GiderAlanlari.jsx", "src/components/settings/SettingsGiderTanimlari.jsx"]) {
      const s = readFileSync(f, "utf8");
      expect(s, f).not.toMatch(/esitBol|\/\s*\(?\s*(k|x|form)\.dagitimAy|dagitimPaylari\(/);
    }
  });
  it("AC-20: yeni izin ve sunucu denetimi yok; merge değişmedi", () => {
    for (const f of ["electron/serverAuth.cjs", "src/lib/merge.js", "src/components/settings/serverPermissionDefs.js"]) expect(readFileSync(f, "utf8"), f).not.toMatch(/dagitim/i);
  });
  it("AC-34: esitBol, kalemKovalariKurus ve kiraHesapla imzaları değişmedi", () => {
    const s = readFileSync("src/lib/gider.js", "utf8");
    expect(s).toContain("export const esitBol = (toplamKurus, adet) => {");
    expect(s).toContain("export const kalemKovalariKurus = (k, { davranis = DAVRANIS.NORMAL, makinaCoz, canliModeller = new Set() } = {}) => {");
    expect(s).toContain("export const kiraHesapla = ({ girisYonu = \"brut\", tutar, netTutar, stopajOrani = 0, kdvOrani = 0 }) => {");
  });
});

// Triyaj bulgu 2: yeni ayın dağıtım payı ay dönümünde girer. Motorun "bugün"ü yerel gündür; today() UTC olduğu için
// Türkiye'de ayın 1'inde 00:00–03:00 arası önceki ayı verir. CI UTC'de çalıştığı için blok TZ'yi kendisi sabitler (0003 emsali).
import { beforeAll, afterAll, afterEach as sonra, vi } from "vitest";
import { yerelBugun, today } from "../src/lib/utils";
describe("Spec 0072 triyaj: ay dönümü yerel gündür (TZ=Europe/Istanbul)", () => {
  let eskiTZ;
  beforeAll(() => { eskiTZ = process.env.TZ; process.env.TZ = "Europe/Istanbul"; });
  afterAll(() => { if (eskiTZ === undefined) delete process.env.TZ; else process.env.TZ = eskiTZ; });
  sonra(() => { vi.useRealTimers(); });
  it("AC-26: ayın 1'i 00:30'da yeni ayın payı girer; UTC 'bugün' girmezdi (ön koşul ölçülür)", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T00:30:00+03:00"));
    expect(yerelBugun()).toBe("2026-10-01");
    expect(today()).toBe("2026-09-30"); // ön koşul: UTC bir gün geride
    const g = [gid(10, { tarih: "2026-09-02", tutar: 12000, dagitimAy: 12 })];
    expect(hesaplaMakinaMaliyetleri(veri({ giderler: g }), { bugun: yerelBugun() }).aylar.get("2026-10")?.ortakGercek).toBe(100000);
    expect(hesaplaMakinaMaliyetleri(veri({ giderler: g }), { bugun: today() }).aylar.has("2026-10")).toBe(false);
    // Motorun yedek "bugün"ü de yereldir.
    expect(hesaplaMakinaMaliyetleri(veri({ giderler: g })).aylar.get("2026-10")?.ortakGercek).toBe(100000);
  });
  it("App maliyet memosu useBugun'un yerel gününü verir ve ona bağlıdır (today() kullanılmaz)", () => {
    const s = readFileSync("src/App.jsx", "utf8");
    const memo = s.slice(s.indexOf("const makinaMaliyet = useMemo"), s.indexOf("const makinaMaliyet = useMemo") + 700);
    expect(s).toMatch(/const maliyetBugun = useBugun\(\);/);
    expect(memo).toMatch(/\{ bugun: maliyetBugun \}/);
    expect(memo).toMatch(/appSettings\.giderAyarlari, maliyetBugun\]\)/);
    expect(memo).not.toMatch(/today\(\)/);
  });
});
