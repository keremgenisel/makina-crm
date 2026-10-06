// Spec 0070: çalışan maliyetinde yol parası ve SGK (motor). Saat dilimi sabit (CI UTC'de koşar).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  giderKalemDogrula, tekrarlayanUret, turHaritasi, kalemTutari, odenecekTutar, odemeHedefleri, odemeleriUygula, borcOzeti,
  hesaplaGiderRaporu, personelHedefTutarlari, tutarGirilmediMi, sgkOzeti, kurus, HEDEF, PERSONEL_HEDEFLERI, DAVRANIS, SGK,
} from "../src/lib/gider";
import { hedefAdi, hedefBasligi } from "../src/lib/odemeYontemi";
import { acikKalemler } from "../src/lib/acikKalemler";
import { odemeHatirlatmalari } from "../src/lib/odemeHatirlatma";
import { mahsupDogrula, hesapBakiyeleri, calisanEkstresi, SGK_MAHSUP_HATASI } from "../src/lib/kasa";
import { sgkAylari, sgkToplamOdeme, SGK_SATIRSIZ_HATASI } from "../src/lib/sgkOdeme";

const kok = path.join(__dirname, "..");
const kod = (f) => readFileSync(path.join(kok, f), "utf-8").split("\n").filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*")).join("\n");

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Elektrik", davranis: "normal" }];
const turMap = turHaritasi(TURLER);
const CAL = [{ id: 21, ad: "Hasan Çelik", resmiMaliyet: 30000, sgkMaliyet: 9000, eldenMaliyet: 10000, yolParasiMaliyet: 1000 }, { id: 22, ad: "Zeynep Arslan", resmiMaliyet: 25000, eldenMaliyet: 5000 }];
let n = 1000;
const uid = () => ++n;
const dogrula = (f) => giderKalemDogrula(f, { turMap, tedarikciler: [], uid });
const kayit = (f) => { const r = dogrula(f); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
const per = (o = {}) => ({ id: 1, tarih: "2026-09-30", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: "30000", sgkTutar: "9000", eldenTutar: "10000", yolParasi: "1000",
  sonOdemeTarihi: "2026-10-05", sgkVade: "2026-10-15", ...o });
const hedefMap = (k) => Object.fromEntries(odemeHedefleri(k, DAVRANIS.PERSONEL).map(h => [h.hedef, h.toplamK]));
const AYAR = { turler: TURLER, tedarikciler: [], yururlukAy: "2026-01" };
const ctx = { turMap, calisanlar: CAL, giderAyarlari: {}, uid };

describe("spec 0070 B: kalem ve toplam", () => {
  it("AC-6: tekrarlayan üretim dört bileşeni çalışan kartından yazar", () => {
    const k = tekrarlayanUret([{ id: 50, turId: 3, ad: "Hasan", calisanId: 21, baslangicAy: "2026-06", uretilenAylar: [] }], [], "2026-09", ctx).yeniKalemler[0];
    expect(k).toMatchObject({ resmiTutar: 30000, sgkTutar: 9000, eldenTutar: 10000, yolParasi: 1000 });
  });
  it("AC-2: yeni alanları boş çalışanın kalemi bugünkü gibi üretilir (SGK ve yol parası yok, SGK hedefi yok)", () => {
    const k = tekrarlayanUret([{ id: 51, turId: 3, ad: "Zeynep", calisanId: 22, baslangicAy: "2026-06", uretilenAylar: [] }], [], "2026-09", ctx).yeniKalemler[0];
    expect([k.sgkTutar, k.yolParasi]).toEqual([null, null]);
    expect(odemeHedefleri(k, DAVRANIS.PERSONEL).map(h => h.hedef)).not.toContain(HEDEF.SGK);
  });
  it("AC-7, AC-10: toplam dört bileşen; çalışana ödenecek = toplam − SGK; SGK yalnız kendi hedefinde, yol parası eldende", () => {
    const k = kayit(per());
    expect(kalemTutari(k, DAVRANIS.PERSONEL)).toBe(50000);
    expect(odenecekTutar(k, DAVRANIS.PERSONEL)).toBe(41000);
    expect(hedefMap(k)).toEqual({ ana: 3000000, elden: 1100000, sgk: 900000 });
    const top = Object.values(hedefMap(k)).reduce((a, b) => a + b, 0);
    expect(top).toBe(kurus(kalemTutari(k, DAVRANIS.PERSONEL)));
  });
  it("AC-8, AC-36: gider raporu ve kova toplamı dört bileşeni okur; SGK ödemesi toplamı artırmaz", () => {
    const k = kayit(per());
    const aralik = { baslangic: "2026-09-01", bitis: "2026-09-30" };
    const once = hesaplaGiderRaporu({ giderler: [k], ...AYAR }, aralik, { bugun: "2026-10-02" });
    expect(once.toplam).toBe(50000);
    expect(once.kovalar.ortak).toBe(50000);
    const sgkSatir = k.taksitler.find(t => t.hedef === HEDEF.SGK);
    const odenmis = odemeleriUygula([k], [{ id: 1, tur: "odeme", tarih: "2026-10-10", tutar: 9000, giderId: k.id, taksitId: sgkSatir.id, hesapId: null, yontem: "Havale" }], turMap);
    expect(hesaplaGiderRaporu({ giderler: odenmis, ...AYAR }, aralik, { bugun: "2026-10-12" }).toplam).toBe(50000);
  });
  it("AC-9: yeni alanı olmayan eski kalemin tutarı, hedefleri ve ödeme durumu değişmez", () => {
    const eski = kayit({ id: 2, tarih: "2026-09-30", turId: 3, calisanId: 22, resmiTutar: "25000", eldenTutar: "5000", sonOdemeTarihi: "2026-10-05" });
    expect([eski.sgkTutar, eski.yolParasi]).toEqual([null, null]);
    expect(kalemTutari(eski, DAVRANIS.PERSONEL)).toBe(30000);
    expect(odenecekTutar(eski, DAVRANIS.PERSONEL)).toBe(30000);
    expect(hedefMap(eski)).toEqual({ ana: 2500000, elden: 500000 });
    // DB'den gelen alansız eski kalem (taksit satırları 0042 düzeninde).
    const db = { id: 3, tarih: "2026-08-31", turId: 3, calisanId: 22, resmiTutar: 25000, eldenTutar: 5000, ekOdemeler: [], taksitler: [] };
    expect(odemeHedefleri(db, DAVRANIS.PERSONEL).map(h => [h.hedef, h.toplamK])).toEqual([["ana", 2500000], ["elden", 500000]]);
  });
  it("AC-30: SGK hedefi PERSONEL_HEDEFLERI'nde yok; personelHedefTutarlari eski kalemde aynı", () => {
    expect(PERSONEL_HEDEFLERI).not.toContain(HEDEF.SGK);
    expect(kod("src/lib/gider.js")).toMatch(/export const PERSONEL_HEDEFLERI = \[HEDEF\.ANA, HEDEF\.ELDEN, HEDEF\.EK_RESMI, HEDEF\.EK_ELDEN\];/);
    expect(personelHedefTutarlari({ resmiTutar: 25000, eldenTutar: 5000, ekOdemeler: [{ resmiTutar: 1000, eldenTutar: 0 }] })).toEqual({ ana: 2500000, elden: 500000, ekResmi: 100000, ekElden: 0 });
  });
});

describe("spec 0070 C: SGK hedefi", () => {
  it("AC-11, AC-29: SGK'sı olan kalemde ayrı SGK hedefi; sıfır olanda hiç doğmaz ve hedef sayısı değişmez", () => {
    expect(odemeHedefleri(kayit(per()), DAVRANIS.PERSONEL).some(h => h.hedef === HEDEF.SGK)).toBe(true);
    const sifir = kayit(per({ sgkTutar: "" }));
    const eski = kayit(per({ sgkTutar: "", yolParasi: "" }));
    expect(odemeHedefleri(sifir, DAVRANIS.PERSONEL).map(h => h.hedef)).toEqual(["ana", "elden"]);
    expect(odemeHedefleri(eski, DAVRANIS.PERSONEL).length).toBe(2);
    // Tek bileşenli kalem bugünkü gibi satırsız ve tek hedefli kalır.
    const tek = kayit(per({ sgkTutar: "", eldenTutar: "", yolParasi: "" }));
    expect(tek.taksitler).toEqual([]);
  });
  it("AC-12: SGK kendi vadesini taşır (boşsa kalemin vadesi); kalem SGK ödenmeden 'Ödendi' olmaz", () => {
    const k = kayit(per());
    expect(k.taksitler.find(t => t.hedef === HEDEF.SGK).vade).toBe("2026-10-15");
    const vadesiz = kayit(per({ sgkVade: "" }));
    expect(vadesiz.taksitler.find(t => t.hedef === HEDEF.SGK).vade).toBe("2026-10-05");
    const ana = k.taksitler.find(t => t.hedef === HEDEF.ANA), eld = k.taksitler.find(t => t.hedef === HEDEF.ELDEN);
    const h = [{ id: 1, tur: "odeme", tarih: "2026-10-05", tutar: 30000, giderId: 1, taksitId: ana.id }, { id: 2, tur: "odeme", tarih: "2026-10-05", tutar: 11000, giderId: 1, taksitId: eld.id }];
    const z = odemeleriUygula([k], h, turMap)[0];
    expect(z.odendi).toBe(false);
    expect(odemeHedefleri(z, DAVRANIS.PERSONEL).find(x => x.hedef === HEDEF.SGK).kalanK).toBe(900000);
  });
  it("AC-13: SGK taksitlenmez; plan yeniden bölünürken ödenmiş SGK satırı korunur", () => {
    const k = kayit(per({ taksitSayisi: "3" }));
    expect(k.taksitler.filter(t => t.hedef === HEDEF.SGK)).toHaveLength(1);
    const sgk = k.taksitler.find(t => t.hedef === HEDEF.SGK);
    const z = odemeleriUygula([k], [{ id: 5, tur: "odeme", tarih: "2026-10-10", tutar: 9000, giderId: k.id, taksitId: sgk.id }], turMap)[0];
    const yeni = kayit({ ...per({ resmiTutar: "36000", taksitSayisi: "4" }), id: k.id, taksitler: z.taksitler });
    const yeniSgk = yeni.taksitler.filter(t => t.hedef === HEDEF.SGK);
    expect(yeniSgk.map(t => [t.id, t.tutar])).toEqual([[sgk.id, 9000]]);
  });
  it("AC-15: ad tek tablodan; yalnız SGK'lı kalemde de 'SGK'ya' (Çalışana değil)", () => {
    expect(hedefAdi(HEDEF.SGK, DAVRANIS.PERSONEL, false)).toBe("SGK'ya");
    expect(hedefAdi(HEDEF.SGK, DAVRANIS.PERSONEL, true)).toBe("SGK'ya");
    expect(hedefBasligi(HEDEF.SGK, DAVRANIS.PERSONEL, true)).toBe("SGK");
  });
  it("AC-41: yalnız SGK'lı kalem 'Tutar girilmedi' sayılmaz; tutarı tamamen sıfır kalem sayılır", () => {
    const yalnizSgk = kayit(per({ resmiTutar: "", eldenTutar: "", yolParasi: "" }));
    expect(odenecekTutar(yalnizSgk, DAVRANIS.PERSONEL)).toBe(0);
    expect(tutarGirilmediMi(yalnizSgk, DAVRANIS.PERSONEL)).toBe(false);
    expect(tutarGirilmediMi({ tutar: 0 }, DAVRANIS.NORMAL)).toBe(true);
    expect(odemeHedefleri(yalnizSgk, DAVRANIS.PERSONEL).map(h => h.hedef)).toEqual(["sgk"]);
  });
  it("AC-26 (motor) / R16: dört bileşeni sıfır personel kalemi reddedilir; negatif SGK reddedilir", () => {
    expect(dogrula(per({ resmiTutar: "", sgkTutar: "", eldenTutar: "", yolParasi: "" })).hatalar).toContainEqual({ alan: "resmiTutar", mesaj: "Tutar sıfırdan büyük olmalı." });
    expect(dogrula(per({ sgkTutar: "-5" })).hatalar.map(h => h.alan)).toContain("sgkTutar");
  });
});

describe("spec 0070 D: borç zinciri ve toplu ödeme", () => {
  const A = kayit(per());
  const B = kayit(per({ id: 2, calisanId: 22, calisanAd: "Zeynep Arslan", resmiTutar: "25000", sgkTutar: "7000", eldenTutar: "5000", yolParasi: "" }));
  const C = kayit(per({ id: 3, tarih: "2026-08-31", calisanId: 22, calisanAd: "Zeynep Arslan", resmiTutar: "25000", sgkTutar: "7000", eldenTutar: "", yolParasi: "", sonOdemeTarihi: "2026-09-05", sgkVade: "2026-09-15" }));
  const G = odemeleriUygula([A, B, C], [], turMap);
  it("AC-16: borç özetinde SGK tek taraf satırı, ad tek sabitten; çalışan adı taşımaz", () => {
    const b = borcOzeti(G, AYAR, "2026-10-02");
    const s = b.satirlar.find(x => x.tur === "sgk");
    expect(s.ad).toBe(SGK);
    expect(s.tutar).toBe(23000);
    expect(JSON.stringify({ ad: s.ad, tur: s.tur })).not.toMatch(/Hasan|Zeynep/);
    expect(b.satirlar.find(x => x.tur === "calisanlar").tutar).toBe(41000 + 30000 + 25000);
  });
  it("AC-32, AC-17: açık kalemler ve hatırlatıcı aynı SGK taraf adıyla; hatırlatıcı kartı kalem sayar", () => {
    const a = acikKalemler(G, AYAR, "2026-10-02");
    const sgkSat = a.satirlar.filter(x => x.hedef === HEDEF.SGK);
    expect(sgkSat.every(x => x.tarafAd === SGK && x.tarafTur === "sgk" && !x.personel && !x.calisanAd)).toBe(true);
    const h = odemeHatirlatmalari(G, { ...AYAR, esikGun: 30 }, "2026-10-02");
    const sgkOge = [...h.gecmis, ...h.yaklasan].filter(o => o.hedef === HEDEF.SGK);
    expect(sgkOge.length).toBe(3);
    expect(sgkOge.every(o => o.taraf === SGK && o.personel === false && o.vadeEtiketi === "SGK vadesi")).toBe(true);
    expect(h.sayilar.gecmis + h.sayilar.yaklasan).toBe(3); // üç kalem; SGK satırı kalemi ikinci kez saymaz
  });
  it("AC-33: açık SGK ayları kişi sayısı ve toplamıyla, eski aydan yeniye", () => {
    const aylar = sgkAylari(G, { turMap, yururlukAy: "2026-01", bugun: "2026-10-02" });
    expect(aylar.map(a => [a.ay, a.kisi, a.toplamK, a.kalemler.length])).toEqual([["2026-08", 1, 700000, 1], ["2026-09", 2, 1600000, 2]]);
  });
  it("AC-18, AC-20: seçilen ayın SGK'sı tek işlemde; kalem başına bir hareket, SGK hedefleri kapanır, hesap toplam kadar düşer", () => {
    const ay = sgkAylari(G, { turMap, yururlukAy: "2026-01", bugun: "2026-10-02" }).find(a => a.ay === "2026-09");
    const hesaplar = [{ id: 501, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, acilisTarihi: "2026-01-01" }];
    const r = sgkToplamOdeme(ay, { turMap, hesaplar, tarih: "2026-10-10", hesapId: 501, yontem: "Havale" });
    expect(r.hatalar).toEqual([]);
    expect(r.hareketler).toHaveLength(2);
    expect(r.hareketler.every(h => h.tur === "odeme" && h.hesapId === 501 && [A.id, B.id].includes(h.giderId))).toBe(true);
    const hs = r.hareketler.map((h, i) => ({ ...h, id: 900 + i }));
    const z = odemeleriUygula([A, B, C], hs, turMap);
    for (const k of z.filter(x => x.id !== C.id)) expect(odemeHedefleri(k, DAVRANIS.PERSONEL).find(h => h.hedef === HEDEF.SGK).odendi).toBe(true);
    expect(hesapBakiyeleri(hesaplar, hs, { bugun: "2026-10-12" }).get("501").bakiye).toBe(100000 - 16000);
  });
  it("AC-19: bir kalemde hata varsa hiçbir hareket dönmez; hata kalemin gizlilik adıyla", () => {
    const ay = sgkAylari(G, { turMap, yururlukAy: "2026-01", bugun: "2026-10-02" }).find(a => a.ay === "2026-09");
    const r = sgkToplamOdeme(ay, { turMap, hesaplar: [{ id: 502, ad: "Eski", tur: "kasa", paraBirimi: "TRY", kapali: true }], tarih: "2026-10-10", hesapId: 502 });
    expect(r.hareketler).toBeNull();
    expect(r.hatalar).toHaveLength(2);
    expect(r.hatalar[0]).toMatch(/^Personel gideri · 30\/09\/2026: .*Kapatılmış hesaba hareket girilemez/);
    expect(r.hatalar.join(" ")).not.toMatch(/Hasan|Zeynep/);
  });
  it("AC-42: SGK satırına avans mahsubu motorda reddedilir", () => {
    const sgk = A.taksitler.find(t => t.hedef === HEDEF.SGK);
    const r = mahsupDogrula({ tarih: "2026-10-10", tutar: "100", taksitId: sgk.id }, { kalem: A, turMap, hareketler: [{ id: 1, tur: "avans", calisanId: 21, tutar: 5000, tarih: "2026-09-01" }], giderler: [A], bugun: "2026-10-12" });
    expect(r.hatalar.hedef).toBe(SGK_MAHSUP_HATASI);
  });
  it("AC-31: çalışan ekstresi SGK'yı dışlar; son bakiye çalışan borcuyla eşit", () => {
    const sgk = A.taksitler.find(t => t.hedef === HEDEF.SGK), ana = A.taksitler.find(t => t.hedef === HEDEF.ANA);
    const hs = [{ id: 1, tur: "odeme", tarih: "2026-10-03", tutar: 9000, giderId: A.id, taksitId: sgk.id }, { id: 2, tur: "odeme", tarih: "2026-10-04", tutar: 10000, giderId: A.id, taksitId: ana.id }];
    const e = calisanEkstresi(21, { giderler: [A], hareketler: hs, turler: TURLER, yururlukAy: "2026-01", bugun: "2026-10-12" });
    expect(e.satirlar.filter(s => s.tur === "odeme")).toHaveLength(1);
    expect(e.bakiye).toBe(41000 - 10000);
    const b = borcOzeti(odemeleriUygula([A], hs, turMap), AYAR, "2026-10-12").satirlar.find(x => x.tur === "calisanlar");
    expect(b.tutar).toBe(e.bakiye);
  });
  it("R18: sgkOzeti toplam = ödenen + açık; kişi bilgisi yok", () => {
    const sgk = A.taksitler.find(t => t.hedef === HEDEF.SGK);
    const z = odemeleriUygula([A, B], [{ id: 1, tur: "odeme", tarih: "2026-10-03", tutar: 9000, giderId: A.id, taksitId: sgk.id }], turMap);
    expect(sgkOzeti(z, turMap)).toEqual({ toplamK: 1600000, odenenK: 900000, acikK: 700000 });
  });
});

// Triyaj: SGK satırı olmayan kalem (güncellenmemiş istemciden ya da yedekten). Satırsız dağıtım ödemeyi önce çalışan
// hedeflerine yazdığı için "SGK" ödemesi ya da mahsup oraya düşerdi.
describe("spec 0070 (triyaj): satırsız SGK kalemi", () => {
  const SATIRSIZ = { id: 90, tarih: "2026-09-30", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, sgkTutar: 9000, ekOdemeler: [], taksitler: [], sonOdemeTarihi: "2026-10-05" };
  it("toplu ödeme satırsız kalemi listeler ama ödemez; hata kalemi açıp kaydetmeyi söyler, hiçbir hareket yazılmaz", () => {
    const ay = sgkAylari([SATIRSIZ], { turMap, yururlukAy: "2026-01", bugun: "2026-10-02" })[0];
    expect([ay.toplamK, ay.satirsiz]).toEqual([900000, 1]);
    const r = sgkToplamOdeme(ay, { turMap, tarih: "2026-10-10" });
    expect(r.hareketler).toBeNull();
    expect(r.hatalar).toEqual([`Personel gideri · 30/09/2026: ${SGK_SATIRSIZ_HATASI}`]);
  });
  it("kalem formdan kaydedilince SGK satırı kurulur ve toplu ödeme yalnız SGK hedefini kapatır", () => {
    const kaydedilmis = kayit({ ...per({ id: 90, eldenTutar: "", yolParasi: "", sgkVade: "" }) });
    const ay = sgkAylari([kaydedilmis], { turMap, yururlukAy: "2026-01", bugun: "2026-10-02" })[0];
    expect(ay.satirsiz).toBe(0);
    const r = sgkToplamOdeme(ay, { turMap, tarih: "2026-10-10" });
    const z = odemeleriUygula([kaydedilmis], r.hareketler.map((h, i) => ({ ...h, id: 1 + i })), turMap)[0];
    const h = Object.fromEntries(odemeHedefleri(z, DAVRANIS.PERSONEL).map(x => [x.hedef, x.kalanK]));
    expect(h).toEqual({ ana: 3000000, sgk: 0 });
  });
  it("satırsız kalemde mahsup sınırı SGK'yı dışarıda bırakır; mahsup SGK'ya taşmaz", () => {
    const avans = [{ id: 1, tur: "avans", calisanId: 21, tutar: 50000, tarih: "2026-09-01" }];
    const opt = { kalem: SATIRSIZ, turMap, hareketler: avans, giderler: [SATIRSIZ], bugun: "2026-10-12" };
    expect(mahsupDogrula({ tarih: "2026-10-10", tutar: "35000" }, opt).hatalar.tutar).toMatch(/Kalandan fazla mahsup edilemez \(kalan 30\.000,00 ₺\)/);
    const ok = mahsupDogrula({ tarih: "2026-10-10", tutar: "30000" }, opt);
    expect(ok.kayit).toBeTruthy();
    const z = odemeleriUygula([SATIRSIZ], [{ ...ok.kayit, id: 2 }], turMap)[0];
    expect(odemeHedefleri(z, DAVRANIS.PERSONEL).find(x => x.hedef === HEDEF.SGK).kalanK).toBe(900000);
  });
  it("karışık sürüm sürüm notu planda ve CLAUDE.md'de: önce sunucu, sonra istemciler; o süre SGK ve yol parası girilmez", () => {
    const plan = readFileSync(path.join(kok, "specs/done/0070-uygulama-plani.md"), "utf-8");
    const not = plan.slice(plan.indexOf("## 7. Sürüm notu metni"));
    expect(not).toMatch(/önce sunucu bilgisayarı, sonra bütün istemciler güncellenmelidir/);
    expect(not).toMatch(/güncelleme\s+bitene kadar SGK ve yol parası girmeyin/);
    expect(readFileSync(path.join(kok, "CLAUDE.md"), "utf-8")).toMatch(/güncelleme bitene kadar SGK ve yol parası girilmez/);
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
