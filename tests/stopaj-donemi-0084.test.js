// Spec 0084: kira stopajı üç aylık beyan dönemiyle ödenir. Motor (dönem, ödeme tarihi, adlandırıcılar, dönem satırları,
// adaylar, toplu ödeme çekirdeği), değişmeyen katmanlar (AC-35 önce/sonra) ve kaynak taramaları. Saat dilimi sabit.
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import { resolve } from "node:path";
import { hesaplaGiderRaporu, kovaDagilimi, davranisOf, canliModelSeti, odemeleriUygula, giderKalemDogrula, stopajOzeti, borcKapsamindaMi, borcOzeti, odemeHedefleri, tekrarlayanUret, HEDEF } from "../src/lib/gider";
import { hesaplaMakinaMaliyetleri } from "../src/lib/makinaMaliyeti";
import { cokKalemOdemeleri, hesapBakiyeleri, tedarikciEkstresi } from "../src/lib/kasa";
import { odemeHatirlatmalari } from "../src/lib/odemeHatirlatma";
import { stopajBeyanAyari, stopajBeyanDogrula, stopajDonemi, stopajOdemeTarihi, stopajDonemleri, stopajAdaylari, BEYAN_DONEMI } from "../src/lib/stopajDonemi";
import { bosAtamaAyikla } from "./fixtures/0090-bos-atama";
import { GIDERLER, TURLER, TEDARIKCILER, HAREKETLER, HESAPLAR, BUGUN, turMap, uid, K2, K3, K5, stopajSatirlari, ana } from "./fixtures/0084-veri";

beforeAll(() => { process.env.TZ = "Europe/Istanbul"; });
const kok = resolve(__dirname, "..");
const oku = (f) => fs.readFileSync(resolve(kok, f), "utf8");
const duz = (x) => JSON.parse(JSON.stringify(x, (k, v) => (v instanceof Map ? [...v.entries()] : v instanceof Set ? [...v] : v)));

const CUSTOMERS = [{ id: 601, name: "Firma A", model: "AK100", serialNo: "S601", installDate: "2026-03-20", fabrikaSatisBedeli: 500000, currency: "TRY", uretimTarihi: "2026-03-05" }];
const MODELLER = [{ model: "AK100" }];
export const motorCiktisi = () => {
  const giderler = odemeleriUygula(GIDERLER, HAREKETLER, turMap);
  const canliModeller = canliModelSeti(MODELLER, []);
  const rapor = (bas, bit) => hesaplaGiderRaporu({ giderler, turler: TURLER, tedarikciler: TEDARIKCILER, stock: [], customers: CUSTOMERS, canliModeller, yururlukAy: "2026-01" },
    { baslangic: bas, bitis: bit }, { bugun: BUGUN });
  return duz({
    raporYil: rapor("2026-01-01", "2026-12-31"), raporSubat: rapor("2026-02-01", "2026-02-28"),
    kovalar: giderler.map(k => kovaDagilimi(k, { davranis: davranisOf(k, turMap), stock: [], customers: CUSTOMERS, canliModeller })),
    maliyet: hesaplaMakinaMaliyetleri({ customers: CUSTOMERS, giderler, giderTurleri: TURLER, standardModels: MODELLER, giderAyarlari: { yururlukAy: "2026-01" } }, { bugun: BUGUN }),
  });
};

const DOSYA = "tests/fixtures/0084-stopaj-once.json";
describe("Spec 0084: değişmeyen katmanlar (R23, C1)", () => {
  it("AC-35: stopajlı veride dönem raporu, kova dağılımı ve makina maliyeti bu spec'ten önceki kodla birebir aynı", () => {
    const simdi = motorCiktisi();
    if (process.env.YAZ_0084 === "1") { fs.writeFileSync(resolve(kok, DOSYA), JSON.stringify(simdi, null, 1)); return; }
    // Spec 0090 ile (R5/2): altın yenilenmez; spec öncesi kalemlerin boş atama anahtarları karşılaştırmadan önce ayıklanır.
    expect(simdi).toEqual(bosAtamaAyikla(JSON.parse(oku(DOSYA))));
  });
});

const AYLIK = { donem: BEYAN_DONEMI.AYLIK, gun: 26 };
const UC = stopajBeyanAyari(null);
const zengin = (hareketler = HAREKETLER, giderler = GIDERLER) => odemeleriUygula(giderler, hareketler, turMap);
const donemler = (ayar = UC, g = zengin(), bugun = BUGUN) => stopajDonemleri(g, { turler: TURLER, yururlukAy: "2026-01", ayar }, bugun);

describe("Spec 0084: ayar ve dönem hesabı (R1–R6)", () => {
  it("AC-3: ayar yokken ve bozukken okuma yolu üç aylık + 26 verir; geçerli değer okunur", () => {
    for (const x of [undefined, null, {}, { stopajBeyanDonemi: "yillik", stopajOdemeGunu: 0 }, { stopajOdemeGunu: "abc" }, { stopajOdemeGunu: 32 }, { stopajOdemeGunu: 2.5 }])
      expect(stopajBeyanAyari(x), JSON.stringify(x)).toEqual({ donem: "ucAylik", gun: 26 });
    expect(stopajBeyanAyari({ stopajBeyanDonemi: "aylik", stopajOdemeGunu: 15 })).toEqual({ donem: "aylik", gun: 15 });
    expect(stopajBeyanDogrula({ donem: "aylik", gun: "31" })).toEqual({ deger: { donem: "aylik", gun: 31 } });
    for (const g of ["0", "32", "abc", "12,5", "12.5", ""]) expect(stopajBeyanDogrula({ donem: "ucAylik", gun: g }).hata, g).toMatch(/1 ile 31/);
    expect(stopajBeyanDogrula({ donem: "x", gun: "5" }).hata).toMatch(/Aylık ya da Üç aylık/);
  });
  it("AC-5: üç aylık kipte Şubat kalemi 1. dönem, ödeme 2026-04-26; Kasım kalemi 4. dönem, ödeme 2027-01-26", () => {
    expect(stopajDonemi("2026-02-10", UC)).toMatchObject({ anahtar: "2026-Q1", donemAdi: "2026 1. dönem (Ocak-Mart)", odemeTarihi: "2026-04-26", bitis: "2026-03-31" });
    expect(stopajDonemi("2026-11-05", UC)).toMatchObject({ anahtar: "2026-Q4", donemAdi: "2026 4. dönem (Ekim-Aralık)", odemeTarihi: "2027-01-26" });
  });
  it("AC-6: aylık kipte 2026-03-31 kalemi 'Mart 2026', ödeme 2026-04-26", () => {
    expect(stopajDonemi("2026-03-31", AYLIK)).toMatchObject({ anahtar: "2026-03", donemAdi: "Mart 2026", odemeTarihi: "2026-04-26" });
  });
  it("AC-7: gün 31'de Ocak-Mart ödemesi 2026-04-30'a, Şubat'a düşen aylık dönem 28'e (artık yılda 29'a) kırpılır; hesap ayEkleGun ile", () => {
    const g31 = { donem: BEYAN_DONEMI.UC_AYLIK, gun: 31 };
    expect(stopajOdemeTarihi("2026-01-15", g31)).toBe("2026-04-30");
    expect(stopajOdemeTarihi("2026-01-15", { ...AYLIK, gun: 31 })).toBe("2026-02-28");
    expect(stopajOdemeTarihi("2028-01-15", { ...AYLIK, gun: 31 })).toBe("2028-02-29");
    expect(stopajOdemeTarihi("2026-07-01", g31)).toBe("2026-10-31");
    const kod = oku("src/lib/stopajDonemi.js");
    expect(kod).toMatch(/ayEkleGun\(`\$\{y\}-\$\{iki\(sonAy\)\}-\$\{iki\(a\.gun\)\}`, 1\)/);
  });
  it("AC-8: dönem anahtarı, üç adlandırıcı ve ödeme tarihi yalnız stopajDonemi.js'te; gunSayisi dışa verilmemiş, ikinci kırpma yok", () => {
    expect(oku("src/lib/gider.js")).toMatch(/^const gunSayisi = /m);
    expect(oku("src/lib/gider.js")).not.toMatch(/export const gunSayisi|export \{[^}]*gunSayisi/);
    const kod = oku("src/lib/stopajDonemi.js").split("\n").filter(l => !l.trim().startsWith("//")).join("\n");
    expect(kod).not.toMatch(/getDate|new Date|gunSayisi/);
    const gez = (d) => fs.readdirSync(resolve(kok, d), { withFileTypes: true }).flatMap(e => (e.isDirectory() ? gez(`${d}/${e.name}`) : /\.jsx?$/.test(e.name) ? [`${d}/${e.name}`] : []));
    for (const f of gez("src").filter(f => f !== "src/lib/stopajDonemi.js")) {
      const t = oku(f);
      expect(t, f).not.toMatch(/\. dönem|-Q\$\{|kira stopajı`|Math\.floor\(\(m - 1\) \/ 3\)/);
    }
  });
  it("AC-9: üç adlandırıcı R6'nın metinleri; pencere açıklamayı, hatırlatıcı satır adını bu değerlerden alır", () => {
    expect(stopajDonemi("2026-02-10", UC)).toMatchObject({ donemAdi: "2026 1. dönem (Ocak-Mart)", odemeAciklamasi: "2026 1. dönem kira stopajı", hatirlatmaAdi: "2026 1. dönem kira stopajı" });
    expect(stopajDonemi("2026-03-31", AYLIK)).toMatchObject({ donemAdi: "Mart 2026", odemeAciklamasi: "Mart 2026 kira stopajı" });
    expect(oku("src/components/gider/StopajDonemleri.jsx")).toMatch(/donem\.odemeAciklamasi/);
    expect(oku("src/lib/odemeHatirlatma.js")).toMatch(/donemAdi: g\.donem\.hatirlatmaAdi/);
  });
});

describe("Spec 0084: vade (R7–R11)", () => {
  it("AC-13: ayar değişince kalem vadeleri değişmez; dönem gruplaması yeniden kurulur, toplam açık aynı kalır", () => {
    const g = zengin();
    const vadeler = g.map(k => (k.taksitler || []).map(t => t.vade));
    const uc = donemler(UC, g), ay = donemler(AYLIK, g);
    expect(g.map(k => (k.taksitler || []).map(t => t.vade))).toEqual(vadeler);
    expect(uc.donemler.map(d => d.anahtar)).toEqual(["2026-Q1"]);
    expect(ay.donemler.map(d => d.anahtar)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(ay.toplam.acikK).toBe(uc.toplam.acikK);
    expect(ay.toplam.kesilenK).toBe(uc.toplam.kesilenK);
  });
  // Üçüncü yarı (stopaj sıfıra çekilince ödenmiş satırın korunması) 0021'in gider-taksit testlerinde, dokunulmadan yeşil.
  it("AC-14: vade gider tarihinden önce olamaz, taksitli stopajda ilk vade zorunlu (0021 kuralları bozulmaz)", () => {
    const d = (f) => giderKalemDogrula({ id: 50, tarih: "2026-03-05", turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 12, aciklama: "x", ...f }, { turMap, tedarikciler: TEDARIKCILER, uid });
    expect(d({ stopajVade: "2026-03-01" }).hatalar.map(h => h.mesaj)).toContain("Stopaj vadesi gider tarihinden önce olamaz.");
    expect(d({ stopajTaksitSayisi: "2" }).hatalar.map(h => h.mesaj)).toContain("İlk stopaj taksitinin vadesi girilmedi.");
    expect(d({ stopajVade: "2026-04-26" }).hatalar).toEqual([]);
  });
});

describe("Spec 0084: dönem satırları ve toplu ödeme (R12–R17)", () => {
  it("AC-16: satırlar ödeme tarihine göre; her satırda kesilen = ödenen + açık; açık toplam stopajOzeti(borç kapsamı) ile, kesilen tam ödenmiş kalemler dahil dönem toplamıyla aynı (revizyon 4)", () => {
    const g = zengin(), r = donemler(UC, g, "2027-02-01");
    expect(r.donemler.map(d => d.odemeTarihi)).toEqual([...r.donemler.map(d => d.odemeTarihi)].sort());
    for (const d of r.donemler) expect(d.odenenK + d.acikK).toBe(d.kesilenK);
    const kapsam = g.filter(k => borcKapsamindaMi(k, { esik: "2026-01-01", bugun: "2027-02-01" }));
    expect(r.toplam.acikK).toBe(stopajOzeti(kapsam, turMap).acikK);
    // Revizyon 4: kesilen, tam ödenmiş kalemler dahil dönem kalemlerinin stopajOzeti'si (K1 burada, borç kapsamında değil).
    const donemKalemleri = g.filter(k => borcKapsamindaMi({ ...k, odendi: false }, { esik: "2026-01-01", bugun: "2027-02-01" }));
    expect(r.toplam.kesilenK).toBe(stopajOzeti(donemKalemleri, turMap).kesilenK);
    expect(kapsam.some(k => k.id === 1)).toBe(false);
    expect(r.donemler.map(d => d.anahtar)).toEqual(["2026-Q1", "2026-Q4"]);
  });
  it("AC-17: dönem satırı hesaplanan tarihi gösterir; farklı kalem vadesi işaretlenir; 'vadesi geçti' satırın kendi vadesinden", () => {
    const q1 = donemler(UC, zengin(), "2026-04-22").donemler[0];
    expect(q1.odemeTarihi).toBe("2026-04-26");
    expect(q1.vadeFarkli).toBe(true); // K3'ün stopaj vadeleri 2026-04-20 ve 2026-05-20
    expect(q1.durum).toBe("gecti"); // K3'ün ilk stopaj taksiti 2026-04-20'de, kendi vadesi geçti
    const q1Once = donemler(UC, zengin(), "2026-04-19").donemler[0];
    expect(q1Once.durum).toBe("kismen"); // hiçbir satırın vadesi (ya da dönem tarihi) geçmedi; K1 ve K3 kısmen ödendi
  });
  it("AC-18: içinde bulunulan, kapanmamış dönem listelenir, işaretlidir ve ödenebilir satırı vardır", () => {
    const r = donemler(UC, zengin(), "2026-03-10");
    const q1 = r.donemler.find(d => d.anahtar === "2026-Q1");
    expect(q1.kapanmadi).toBe(true);
    expect(q1.satirlar.some(s => !s.satirsiz)).toBe(true);
  });
  it("AC-20: toplu ödeme satır başına bir hareket yazar; tur odeme, kendi taksitId'si, aynı tarih ve hesap", () => {
    const q1 = donemler().donemler[0];
    const satirlar = q1.satirlar.filter(s => !s.satirsiz);
    const r = cokKalemOdemeleri({ satirlar: satirlar.map(s => ({ anahtar: s.anahtar, tutarK: s.kalanK })), adaylar: satirlar, tarih: "2026-04-26", hesapId: 51, hesaplar: HESAPLAR, yontem: "Havale", aciklama: "2026 1. dönem kira stopajı", turMap });
    expect(r.hareketler).toHaveLength(satirlar.length);
    expect(r.hareketler.map(h => h.taksitId)).toEqual(satirlar.map(s => s.taksitId));
    expect(new Set(r.hareketler.map(h => `${h.tur}|${h.tarih}|${h.hesapId}`))).toEqual(new Set(["odeme|2026-04-26|51"]));
    expect(r.hareketler.every(h => !("hedef" in h))).toBe(true);
  });
  it("AC-21: bir satırın tutarı kalanı aşarsa hiçbir hareket yoktur, hata o satırda", () => {
    const satirlar = donemler().donemler[0].satirlar.filter(s => !s.satirsiz);
    const fazla = satirlar[0].anahtar;
    const r = cokKalemOdemeleri({ satirlar: satirlar.map(s => ({ anahtar: s.anahtar, tutarK: s.kalanK + (s.anahtar === fazla ? 100 : 0) })), adaylar: satirlar, tarih: "2026-04-26", hesapId: 51, hesaplar: HESAPLAR, yontem: "Havale", turMap });
    expect(r.hareketler).toBeUndefined();
    expect(Object.keys(r.satirHatalari)).toEqual([fazla]);
    expect(r.satirHatalari[fazla][0]).toMatch(/Kalandan fazla ödeme/);
  });
  it("AC-22 / AC-23: satırsız kalemin stopajı salt okunur satırdır, aday değildir; kalem bir kez kaydedilip satırlanınca ödenebilir", () => {
    const q1 = donemler().donemler[0];
    expect(q1.satirlar.find(s => s.giderId === 5)).toMatchObject({ satirsiz: true, taksitId: null });
    expect(stopajAdaylari(zengin(), turMap, UC).some(a => a.giderId === 5)).toBe(false);
    const kayitli = giderKalemDogrula({ ...K5, stopajTaksitSayisi: "1" }, { turMap, tedarikciler: TEDARIKCILER, uid }).kayit;
    const g = zengin(HAREKETLER, GIDERLER.map(k => (k.id === 5 ? kayitli : k)));
    const aday = stopajAdaylari(g, turMap, UC).find(a => a.giderId === 5);
    expect(aday).toBeTruthy();
    const r = cokKalemOdemeleri({ satirlar: [{ anahtar: aday.anahtar, tutarK: aday.kalanK }], adaylar: [aday], tarih: "2026-04-26", hesapId: 51, hesaplar: HESAPLAR, yontem: "Havale", turMap });
    expect(r.hareketler).toHaveLength(1);
  });
  it("triyaj bulgu 4: dönemin ödenebilir satırları stopajAdaylari'nın o döneme düşen adaylarıdır (tek aday üreticisi); satır sayısı ödenmişleri de sayar", () => {
    const g = zengin(), q1 = donemler(UC, g).donemler[0];
    const anahtarlar = (l) => l.map(x => x.anahtar).sort();
    expect(anahtarlar(q1.satirlar.filter(x => !x.satirsiz))).toEqual(anahtarlar(stopajAdaylari(g.filter(k => !k.deletedAt && k.tarih >= "2026-01-01"), turMap, UC).filter(a => a.donemAnahtari === "2026-Q1")));
    expect(q1.satirSayisi).toBe(5);
    const kod = oku("src/lib/stopajDonemi.js");
    expect(kod.match(/kalanOf\(t\)/g)).toHaveLength(1); // kalan yalnız aday üreticisinde hesaplanır
  });
  it("AC-25: ödemeden sonra stopaj hedefleri ödendi, vergi dairesi borcu o kadar düşer, hesap bakiyesi toplam kadar azalır", () => {
    const g0 = zengin();
    const satirlar = donemler(UC, g0).donemler[0].satirlar.filter(s => !s.satirsiz);
    const toplamK = satirlar.reduce((a, s) => a + s.kalanK, 0);
    const yeni = cokKalemOdemeleri({ satirlar: satirlar.map(s => ({ anahtar: s.anahtar, tutarK: s.kalanK })), adaylar: satirlar, tarih: "2026-04-26", hesapId: 51, hesaplar: HESAPLAR, yontem: "Havale", turMap })
      .hareketler.map((h, i) => ({ ...h, id: 990 + i }));
    const g1 = zengin([...HAREKETLER, ...yeni]);
    for (const id of new Set(satirlar.map(s => s.giderId))) expect(odemeHedefleri(g1.find(k => k.id === id), "kira").find(h => h.hedef === HEDEF.STOPAJ).odendi).toBe(true);
    const vd = (g) => borcOzeti(g, { turler: TURLER, tedarikciler: TEDARIKCILER, yururlukAy: "2026-01" }, BUGUN).satirlar.find(x => x.tur === "vergiDairesi")?.tutar || 0;
    expect(Math.round((vd(g0) - vd(g1)) * 100)).toBe(toplamK);
    const bak = (h) => hesapBakiyeleri(HESAPLAR, h, { bugun: "2026-05-10" }).get("51").bakiyeK;
    expect(bak(HAREKETLER) - bak([...HAREKETLER, ...yeni])).toBe(toplamK);
  });
  it("AC-26: çöpteki, yürürlük öncesi ve gelecek tarihli kalem hiçbir dönemde sayılmaz", () => {
    const r = donemler();
    const idler = r.donemler.flatMap(d => d.satirlar.map(s => s.giderId));
    for (const id of [9, 10, 4]) expect(idler, String(id)).not.toContain(id);
    expect(r.donemler.find(d => d.anahtar === "2026-Q4")).toBeUndefined(); // K4 (Kasım) bugünden sonra
    expect(r.donemler[0].kesilenK).toBe(400000 + 400000 + 600000 + 200000); // K1, K2, K3, K5 (K6 stopajsız)
  });
});

describe("Spec 0084: hatırlatıcı (R20)", () => {
  const kira = (o) => giderKalemDogrula({ turId: 2, girisYonu: "brut", tutar: 10000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 12, ...o }, { turMap, tedarikciler: TEDARIKCILER, uid }).kayit;
  const VERI = [
    kira({ id: 61, tarih: "2026-01-05", aciklama: "Ocak", sonOdemeTarihi: "2026-04-26", stopajVade: "2026-04-26" }),
    kira({ id: 62, tarih: "2026-02-05", aciklama: "Şubat", sonOdemeTarihi: "2026-04-24", stopajVade: "2026-04-26" }),
    kira({ id: 63, tarih: "2026-03-05", aciklama: "Mart", sonOdemeTarihi: "2026-04-25", stopajVade: "2026-04-26" }),
    kira({ id: 64, tarih: "2026-04-02", aciklama: "Nisan", sonOdemeTarihi: "2026-04-27", stopajVade: "2026-04-27" }),
  ];
  const h = (beyanAyari) => odemeHatirlatmalari(odemeleriUygula(VERI, [], turMap), { turler: TURLER, tedarikciler: TEDARIKCILER, yururlukAy: "2026-01", esikGun: 10, beyanAyari }, "2026-04-20");
  it("AC-30: aynı vade ve dönemdeki üç stopaj hedefi tek satır ('… · 3 kalem'); ANA hedefler ayrı; kart sayıları kalem sayar", () => {
    const r = h(UC);
    const stp = r.yaklasanSatirlar.filter(s => s.tur === "stopaj");
    expect(stp).toHaveLength(1);
    expect(stp[0]).toMatchObject({ adet: 3, donemAdi: "2026 1. dönem kira stopajı", vade: "2026-04-26", odenecek: 6000 });
    expect(r.yaklasanSatirlar.filter(s => s.tur === "kalem" && s.hedef === HEDEF.ANA)).toHaveLength(4);
    expect(r.yaklasanSatirlar.filter(s => s.tur === "kalem" && s.hedef === HEDEF.STOPAJ).map(s => s.id)).toEqual([64]); // tek hedef gruplanmaz (P3)
    expect(r.sayilar).toEqual({ gecmis: 0, yaklasan: 4 });
  });
  it("P3: aylık kipte farklı dönemler gruplanmaz; ayar verilmezse varsayılan (üç aylık) uygulanır", () => {
    expect(h(AYLIK).yaklasanSatirlar.filter(s => s.tur === "stopaj")).toHaveLength(0);
    expect(odemeHatirlatmalari(odemeleriUygula(VERI, [], turMap), { turler: TURLER, tedarikciler: TEDARIKCILER, yururlukAy: "2026-01", esikGun: 10 }, "2026-04-20")
      .yaklasanSatirlar.filter(s => s.tur === "stopaj")).toHaveLength(1);
  });
});

describe("Spec 0084: değişmeyenler ve taramalar", () => {
  it("AC-32: dağıtım çekirdeği kasa.js'te; cek.js'in iki plan fonksiyonu onu çağırır, odemeDogrula'yı doğrudan çağırmaz", () => {
    expect(oku("src/lib/kasa.js")).toMatch(/export const cokKalemOdemeleri = /);
    const cek = oku("src/lib/cek.js");
    expect(cek).toMatch(/import \{ cokKalemOdemeleri \} from "\.\/kasa";/);
    expect(cek).not.toMatch(/odemeDogrula\(/);
    expect(cek.match(/dagitimHareketleri\(\{/g)).toHaveLength(2); // ciroPlani + kendiCekPlani
    expect(cek).toMatch(/const dagitimHareketleri = \([^)]*\) => \{\n  const d = cokKalemOdemeleri\(/);
  });
  it("AC-36: tedarikçi ekstresi stopajı içermez (yalnız ANA hedef)", () => {
    const g = zengin();
    const e = tedarikciEkstresi(12, { giderler: g, hareketler: HAREKETLER, turler: TURLER, yururlukAy: "2026-01", bugun: BUGUN });
    const borcK = e.satirlar.filter(x => x.tur === "borc").reduce((a, x) => a + x.etkiK, 0);
    const anaK = g.filter(k => k.tedarikciId === 12 && !k.deletedAt && k.tarih >= "2026-01-01" && k.tarih <= BUGUN)
      .reduce((a, k) => a + odemeHedefleri(k, "kira").filter(x => x.hedef === HEDEF.ANA).reduce((t, x) => t + x.toplamK, 0), 0);
    expect(borcK).toBe(anaK);
  });
  it("AC-39: electron/, merge.js ve veritabanı şeması bu spec'i bilmez", () => {
    const dosyalar = ["src/lib/merge.js", ...fs.readdirSync(resolve(kok, "electron")).filter(f => /\.(c?js|mjs)$/.test(f)).map(f => `electron/${f}`)];
    for (const f of dosyalar) expect(oku(f), f).not.toMatch(/stopajBeyan|stopajOdemeGunu|stopajDonemi|0084/);
  });
  it("AC-12 (motor yarısı): üretilen kira kaleminin stopaj satırı vadeli doğar ve hatırlatıcıya girer; seçenek yoksa bugünkü gibi vadesiz", () => {
    const t = [{ id: 1, turId: 2, ad: "Kira", tutar: 20000, girisYonu: "brut", baslangicAy: "2026-03", tedarikciId: 12, uretilenAylar: [] }];
    const ctx = { turMap, giderAyarlari: { stopajOrani: 20 }, uid };
    const vadeli = tekrarlayanUret(t, [], "2026-03", { ...ctx, stopajVadeOf: (tarih) => stopajOdemeTarihi(tarih, UC) }).yeniKalemler[0];
    expect(stopajSatirlari(vadeli).map(x => x.vade)).toEqual(["2026-04-26"]);
    expect(vadeli.taksitler.map(x => x.hedef).sort()).toEqual(["ana", "stopaj"]);
    expect(stopajSatirlari(tekrarlayanUret(t, [], "2026-03", ctx).yeniKalemler[0]).map(x => x.vade)).toEqual([null]);
    const h = odemeHatirlatmalari(odemeleriUygula([vadeli], [], turMap), { turler: TURLER, tedarikciler: TEDARIKCILER, esikGun: 7 }, "2026-04-22");
    expect(h.yaklasan.some(o => o.hedef === HEDEF.STOPAJ)).toBe(true);
  });
});

describe("Spec 0084: kayıt listeleri ve kriter kapsamı", () => {
  it("AC-37: yeni pencere KILITSIZ_DOSYALAR'da gerekçesiyle ve SINIF1'de; yalnız wide geçer", async () => {
    const { KILITSIZ_DOSYALAR } = await import("../src/lib/kilitAlanlari.js");
    expect(KILITSIZ_DOSYALAR["src/components/gider/StopajDonemleri.jsx"]).toMatch(/anlık/);
    expect(oku("tests/ui/form-pencere-boyutu.test.jsx")).toContain(`["src/components/gider/StopajDonemleri.jsx", 'title="Kira stopajı beyan dönemleri"']`);
    const p = oku("src/components/gider/StopajDonemleri.jsx");
    expect(p).toMatch(/<Modal title="Kira stopajı beyan dönemleri" onClose=\{onClose\} wide\b/);
    expect(p).not.toMatch(/maxWidth|maxHeight|usePagination|Pagination/);
  });
  it("DoD: AC-1…AC-39'un her biri bir test adında (0084 dosyalarında 'AC-n', başka dosyalarda 'spec 0084 AC-n')", () => {
    const bulunan = new Set();
    const gez = (d) => fs.readdirSync(resolve(kok, d), { withFileTypes: true }).flatMap(e => (e.isDirectory() ? gez(`${d}/${e.name}`) : /\.test\.jsx?$/.test(e.name) ? [`${d}/${e.name}`] : []));
    for (const f of gez("tests")) {
      const kendi = f.includes("0084");
      for (const [, baslik] of oku(f).matchAll(/\bit\(\s*"([^"]+)"/g)) {
        if (kendi) for (const [, n] of baslik.matchAll(/AC-(\d+)/g)) bulunan.add(Number(n));
        else for (const [, grup] of baslik.matchAll(/spec 0084 ((?:AC-\d+(?: \/ )?)+)/g)) for (const [, n] of grup.matchAll(/AC-(\d+)/g)) bulunan.add(Number(n));
      }
    }
    expect(Array.from({ length: 39 }, (_, i) => i + 1).filter(n => !bulunan.has(n))).toEqual([]);
  });
});
