// Spec 0152: döviz hesaptan gider ödemesi ve bozdurma. Saf motor (kur ayrıştırıcısı, öneri, çevrim, iki okuma, doğrulayıcılar,
// taşıma, çöp etiketi, rapor) ve kaynak taramaları. Veri `0059-veri.js` (USD hesap 53, EUR hesap 56, açık kalem K7 = 3000 TL).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as D from "../src/lib/doviz";
import * as K from "../src/lib/kasa";
import { hareketCopEtiketi } from "../src/lib/copKutusu";
import { giderKasaRaporu, buildGiderKasaRaporuHtml } from "../src/lib/giderRaporu";
import { odemeleriUygula, borcOzeti, hesaplaGiderRaporu, odemeHedefKalaniK } from "../src/lib/gider";
import { odemeGirisiHazirla, hepsiniOde, formOdemeHedefleri } from "../src/lib/formOdemesi";
import { kurOnerisi as malzemeKurOnerisi, KUR_ALINMADI as M_KUR_ALINMADI } from "../src/lib/malzeme";
import { fmtCur, fmtTR } from "../src/lib/utils";
import { girdi, H, HESAPLAR, PAYMENTS, SERVICES, PART_SALES, CEKLER, GIDERLER, turler, turMap, tedarikciler } from "./fixtures/0059-veri";

const veri = { payments: PAYMENTS, services: SERVICES, partSales: PART_SALES, yedekParcaSatislar: [], customers: [{ id: 1, name: "Kutu Gıda" }], dealers: [],
  factory: { name: "Altuntaş Makina" }, cekler: CEKLER, bugun: "2026-09-30" };
const zengin = (hareketler = H) => odemeleriUygula(GIDERLER, hareketler, turMap);
const K7 = () => zengin().find(k => k.id === 7);
const bakiye = (id, hareketler = H) => K.hesapBakiyeleri(HESAPLAR, hareketler, veri).get(String(id)).bakiyeK;
const dovizOdeme = (o = {}) => K.odemeDogrula({ tarih: "2026-09-25", tutar: "1.775", yontem: "Havale", hesapId: 53, kur: "35,5", ...o }, { kalem: K7(), turMap, hesaplar: HESAPLAR });
const ekle = (kayit, l = H, id = 900) => [...l, { ...kayit, id }];
const yorumsuz = (f) => fs.readFileSync(f, "utf8").split("\n").filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).map(l => l.replace(/\s\/\/.*$/, "")).join("\n");
const dosyalar = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? dosyalar(path.join(d, e.name)) : /\.(jsx?|cjs|mjs)$/.test(e.name) ? [path.join(d, e.name)] : []));

describe("Spec 0152: kur ayrıştırıcısı ve öneri", () => {
  it("AC-37 / R5/2: '35.5' 35,5 okunur; dörtten fazla elle ondalık, sıfır, negatif ve metin reddedilir; öneri ve türetilen kur altı ondalık (P3)", () => {
    expect(D.kurCoz("35.5").deger).toBe(35.5);
    expect(D.kurCoz("35,5").deger).toBe(35.5);
    expect(D.kurCoz("35,1234").deger).toBe(35.1234);
    expect(D.kurCoz("35,12345").hata).toBe(D.kurOndalikHatasi(4));
    expect(D.kurCoz("0,028169", { kaynak: D.KUR_KAYNAK.ONERI }).deger).toBe(0.028169);
    expect(D.kurCoz("0").hata).toBe(D.KUR_POZITIF_HATASI);
    expect(D.kurCoz("-3").hata).toBe(D.KUR_POZITIF_HATASI);
    expect(D.kurCoz("abc").hata).toBe(D.KUR_SAYI_HATASI);
    expect(D.kurCoz("1.234,5").hata).toBe(D.KUR_SAYI_HATASI); // binlik ayracı yok: kur tutar değildir
    expect(D.kurCoz("").hata).toBe(D.KUR_BOS_HATASI);
  });
  it("AC-44 / R4/3 / P9: üç 'yok' hâli aynı sonucu verir (alan boş, neden yazar); öneri bugünün kurudur", () => {
    expect(D.kurOnerisi("USD", { usd: 35.5, eur: 38 }, false)).toEqual({ deger: 35.5, neden: null });
    expect(D.kurOnerisi("USD", null, false)).toEqual({ deger: null, neden: D.KUR_ALINMADI });
    expect(D.kurOnerisi("USD", null, true)).toEqual({ deger: null, neden: D.KUR_CEVRIMDISI });
    expect(D.kurOnerisi("EUR", { usd: 35.5, eur: null }, false)).toEqual({ deger: null, neden: D.KUR_ALINMADI });
    // 0132'nin adları malzeme.js'ten aynı kalır (yeniden dışa verilir).
    expect(malzemeKurOnerisi).toBe(D.kurOnerisi);
    expect(M_KUR_ALINMADI).toBe(D.KUR_ALINMADI);
  });
  it("AC-35 / AC-36 / R10/3: bozdurma önerisi yöne göre; USD ile EUR arasında öneri yok ve nedeni yazar", () => {
    const r = { usd: 35.5, eur: 38 };
    expect(D.bozdurmaKurOnerisi("USD", "TRY", r, false).deger).toBe(35.5);
    expect(D.bozdurmaKurOnerisi("TRY", "USD", r, false).deger).toBe(0.028169);
    expect(D.bozdurmaKurOnerisi("USD", "EUR", r, false)).toEqual({ deger: null, neden: D.IKI_DOVIZ_NEDENI });
    expect(D.bozdurmaKurOnerisi("TRY", "TRY", r, false)).toEqual({ deger: null, neden: null });
  });
});

describe("Spec 0152: döviz ödeme (A)", () => {
  it("AC-25 / R2/2: kayıt TL tutar, döviz tutar, kur ve para birimi taşır", () => {
    const r = dovizOdeme();
    expect(r.kayit).toMatchObject({ tur: "odeme", tutar: 1775, dovizTutar: 50, kur: 35.5, paraBirimi: "USD", hesapId: 53, giderId: 7 });
  });
  it("AC-7 / AC-8 / AC-9 / AC-29: kalemin kalanı TL tutar kadar, döviz hesabın bakiyesi döviz tutar kadar azalır; TL hesaplar değişmez", () => {
    const l = ekle(dovizOdeme().kayit);
    const kalan = (x) => odemeHedefKalaniK(zengin(x).find(k => k.id === 7), "normal", null);
    expect(kalan(H) - kalan(l)).toBe(177500); // kalem TL tutar kadar kapanır (döviz tutar değil)
    expect(bakiye(53, l)).toBe(bakiye(53) - 5000);
    for (const id of [51, 52, 55, 56]) expect(bakiye(id, l)).toBe(bakiye(id));
    const borc = (x) => borcOzeti(zengin(x), { turler, tedarikciler, yururlukAy: "2026-01" }, "2026-09-30").toplam;
    expect(Math.round((borc(H) - borc(l)) * 100)).toBe(177500);
  });
  it("AC-10: kalandan fazla TL tutar reddedilir (TL üzerinden)", () => {
    expect(dovizOdeme({ tutar: "3.001" }).hatalar.tutar).toMatch(/Kalandan fazla/);
    expect(dovizOdeme({ tutar: "3.000" }).kayit).toBeTruthy();
  });
  it("AC-4 / AC-5 / R5: kur boş, sıfır, negatif ya da metinse kayıt yok ve neden kur alanında", () => {
    for (const [kur, h] of [["", D.KUR_BOS_HATASI], ["0", D.KUR_POZITIF_HATASI], ["-1", D.KUR_POZITIF_HATASI], ["kur", D.KUR_SAYI_HATASI]]) {
      const r = dovizOdeme({ kur });
      expect(r.kayit, kur).toBeNull();
      expect(r.hatalar.kur, kur).toBe(h);
    }
  });
  it("AC-34 / R3/2 / P2: döviz tutar yazılırsa o kaydedilir ve kur türetilir; kaydedilen rakamlar ekrandakiyle aynı", () => {
    const y = D.dovizSatirYamasi({ tutar: "1775", kur: "35,5", kurKaynak: "elle", dovizTutar: "50" }, "dovizTutar", "49,9");
    expect(y).toEqual({ dovizTutar: "49,9", kur: "35,571142", kurKaynak: D.KUR_KAYNAK.TURETILEN });
    const r = dovizOdeme({ ...y });
    expect(r.kayit).toMatchObject({ tutar: 1775, dovizTutar: 49.9, kur: 35.571142 });
    expect(D.dovizSatirYamasi({ tutar: "1775", kur: "" }, "kur", "35,5")).toEqual({ kur: "35,5", kurKaynak: "elle", dovizTutar: "50" });
    expect(D.dovizSatirYamasi({ tutar: "1775", kur: "35,5", kurKaynak: "elle" }, "tutar", "3550")).toEqual({ tutar: "3550", dovizTutar: "100" });
  });
  it("AC-38 / C4/2: kuruşta sıfıra inen döviz tutar reddedilir ve nedeni yazar", () => {
    const r = K.odemeDogrula({ tarih: "2026-09-25", tutar: "0,01", hesapId: 53, kur: "100" }, { kalem: K7(), turMap, hesaplar: HESAPLAR });
    expect(r.kayit).toBeNull();
    expect(r.hatalar.dovizTutar).toBe(D.DOVIZ_SIFIR_HATASI);
  });
  it("AC-38 / triyaj: eksi döviz tutar ve eksi karşı tutar kendi nedeniyle reddedilir (sıfıra inme metni değil)", () => {
    const r = K.odemeDogrula({ tarih: "2026-09-25", tutar: "1.775", hesapId: 53, kur: "35,5", dovizTutar: "-5" }, { kalem: K7(), turMap, hesaplar: HESAPLAR });
    expect(r.kayit).toBeNull();
    expect(r.hatalar.dovizTutar).toBe(D.DOVIZ_EKSI_HATASI);
    const b = K.virmanDogrula({ hesapId: 53, karsiHesapId: 51, tarih: "2026-09-25", tutar: "100", kur: "35,5", karsiTutar: "-5" }, HESAPLAR);
    expect(b.kayit).toBeNull();
    expect(b.hatalar.karsiTutar).toBe(D.KARSI_EKSI_HATASI);
    expect(D.cevrimOku({ kur: "35,5", ham: "-5" }, 177500, "bol").hata).toEqual({ dovizTutar: D.DOVIZ_EKSI_HATASI });
  });
  it("AC-39 / R1/3 / AC-11: hesapsız ve TL hesaplı ödemede döviz alanı yok (kur verilse de)", () => {
    const a = DOVIZ_ANAHTAR;
    const hesapsiz = dovizOdeme({ hesapId: "" }).kayit, tl = dovizOdeme({ hesapId: 51 }).kayit;
    for (const k of [hesapsiz, tl]) for (const x of a) expect(k, x).not.toHaveProperty(x);
  });
  it("AC-20: kapalı hesaba döviz ödeme ya da bozdurma kaydedilemez", () => {
    const kapali = [...HESAPLAR, { id: 60, ad: "Kapalı USD", tur: "banka", paraBirimi: "USD", kapali: true }];
    expect(K.odemeDogrula({ tarih: "2026-09-25", tutar: "100", hesapId: 60, kur: "35" }, { kalem: K7(), turMap, hesaplar: kapali }).hatalar.hesapId).toMatch(/Kapatılmış/);
    expect(K.virmanDogrula({ hesapId: 60, karsiHesapId: 51, tarih: "2026-09-25", tutar: "10", kur: "35" }, kapali).hatalar.hesapId).toMatch(/Kapatılmış/);
  });
  it("AC-12 / AC-13 / R14: silinen döviz ödeme kalem ve bakiyeyi geri getirir; kayıtlı kur okunur, günün kuru okunmaz", () => {
    const l = ekle(dovizOdeme().kayit);
    const sil = l.filter(m => m.id !== 900);
    expect(bakiye(53, sil)).toBe(bakiye(53));
    expect(zengin(sil)).toEqual(zengin());
    // Bakiye kayıttaki döviz tutarı okur; motorlar günün kurunu hiç okumaz (kur önerisi yalnız doviz.js'te, ekrandan).
    for (const f of ["src/lib/kasa.js", "src/lib/gider.js", "src/lib/giderRaporu.js", "src/lib/formOdemesi.js"]) expect(yorumsuz(f), f).not.toMatch(/\brates\b/);
  });
  it("AC-43 / R7/3: bakiye yetmese de döviz ödeme kaydedilir (bakiye eksiye düşebilir)", () => {
    const r = dovizOdeme({ tutar: "3.000", kur: "1" }); // 3000 USD çıkar, hesapta 1000 USD var
    expect(r.kayit).toBeTruthy();
    expect(bakiye(53, ekle(r.kayit))).toBeLessThan(0);
  });
  it("AC-46 / R8/2: döviz hesapta çek yöntemleri reddedilir; çok kalemli dağıtım (stopaj, çek) yalnız TL hesap kabul eder (P5)", () => {
    expect(dovizOdeme({ yontem: "Çek (kendi)" }).hatalar.yontem).toBeTruthy();
    expect(K.odemeDogrula({ tarih: "2026-09-25", tutar: "100", hesapId: 53, kur: "35", yontem: "Çek (ciro)" }, { kalem: K7(), turMap, hesaplar: HESAPLAR, ciro: true }).hatalar.yontem).toBe(D.CEK_DOVIZ_NEDENI);
    const r = K.cokKalemOdemeleri({ satirlar: [{ anahtar: "a", tutarK: 10000 }], adaylar: [{ anahtar: "a", kalem: K7(), taksitId: null }], tarih: "2026-09-25", hesapId: 53, hesaplar: HESAPLAR, yontem: "Havale", turMap });
    expect(r.hatalar).toEqual([D.YALNIZ_TL_NEDENI]);
  });
  it("AC-47 / C6/2: avans hâlâ yalnız TL hesaptan", () => {
    const r = K.avansDogrula({ calisanId: 21, tarih: "2026-09-25", tutar: "100", hesapId: 53 }, { calisanlar: [{ id: 21, ad: "A" }], hesaplar: HESAPLAR });
    expect(r.hatalar.hesapId).toBe("Avans yalnız TL hesaptan verilir.");
  });
});

const DOVIZ_ANAHTAR = ["dovizTutar", "kur", "paraBirimi", "karsiTutar", "karsiParaBirimi"];

describe("Spec 0152: ödeme girişi (formOdemesi)", () => {
  it("AC-33 / R2/3: bir girişte bir satır TL, bir satır döviz; yalnız döviz satırı kur ister, toplam TL ile denetlenir", () => {
    const k = K7();
    const hazirla = (satirlar) => odemeGirisiHazirla(k, { turMap, tarih: "2026-09-25", satirlar, hesaplar: HESAPLAR, hareketler: H, giderler: GIDERLER });
    const tl = { anahtar: "a", hedef: "ana", tutar: "1.000", yontem: "Havale", hesapId: 51 };
    const doviz = { anahtar: "b", hedef: "ana", tutar: "1.775", yontem: "Havale", hesapId: 53, kur: "35,5", kurKaynak: "elle", dovizTutar: "50" };
    const r = hazirla([tl, doviz]);
    expect(r.hareketler.map(h => [h.tutar, h.hesapId, h.dovizTutar ?? null])).toEqual([[1000, 51, null], [1775, 53, 50]]);
    expect(hazirla([tl, { ...doviz, kur: "", dovizTutar: "" }]).hatalar.satirlar.b.kur).toBe(D.KUR_BOS_HATASI);
    expect(hazirla([tl, { ...doviz, tutar: "2.500" }]).hatalar.hedefler[0]).toMatch(/kalan/);
  });
  it("AC-45 / R4/4 / P1: 'Hepsini ödendi işaretle' döviz satırda kuru öneriyle doldurur; öneri yoksa kur boş kalır ve kayıt kur hatasıyla durur", () => {
    const h = formOdemeHedefleri(K7(), turMap);
    const satir = [{ anahtar: "a", hedef: "ana", tutar: "", yontem: "Havale", hesapId: 53, aciklama: "" }];
    const dolu = hepsiniOde(satir, h, { yontem: "Havale", hesapId: 51, hesaplar: HESAPLAR, kurOner: (pb) => D.kurOnerisi(pb, { usd: 30, eur: 32 }, false) });
    expect(dolu[0]).toMatchObject({ tutar: "3000", hesapId: 53, kur: "30", kurKaynak: "oneri", dovizTutar: "100" });
    const bos = hepsiniOde(satir, h, { yontem: "Havale", hesapId: 51, hesaplar: HESAPLAR, kurOner: (pb) => D.kurOnerisi(pb, null, true) });
    expect(bos[0].kur).toBe("");
    const r = odemeGirisiHazirla(K7(), { turMap, tarih: "2026-09-25", satirlar: bos, hesaplar: HESAPLAR, hareketler: H, giderler: GIDERLER });
    expect(r.hatalar.satirlar.a.kur).toBe(D.KUR_BOS_HATASI);
    // P1: TL ön seçimli yeni satırda döviz anahtarı yok.
    for (const x of DOVIZ_ANAHTAR) expect(hepsiniOde([], h, { yontem: "Havale", hesapId: 51, hesaplar: HESAPLAR })[0]).not.toHaveProperty(x);
    expect(K.sonKullanilanHesap(ekle(dovizOdeme().kayit, H), HESAPLAR)).toBe(51);
  });
  it("AC-41 / R14/2: döviz ödemenin hesabı TL'ye çevrilince alanlar silinir; TL ödeme döviz hesaba çevrilince kur ister", () => {
    const m = { ...dovizOdeme().kayit, id: 900 };
    const l = ekle(dovizOdeme().kayit);
    const k = zengin(l).find(x => x.id === 7);
    const duz = (satir) => odemeGirisiHazirla(k, { turMap, kip: "duzenle", tarih: "2026-09-26", satirlar: [{ anahtar: "a", hedef: "ana", ...satir }], hesaplar: HESAPLAR, hareketler: l, giderler: GIDERLER, duzenlenen: m });
    const tl = duz({ tutar: "1.775", yontem: "Havale", hesapId: 51 }).guncellenen;
    for (const x of DOVIZ_ANAHTAR) expect(tl, x).not.toHaveProperty(x);
    const tlOdeme = { id: 901, tur: "odeme", tarih: "2026-09-25", tutar: 500, yontem: "Havale", hesapId: 51, giderId: 7, taksitId: null };
    const l2 = [...H, tlOdeme];
    const k2 = zengin(l2).find(x => x.id === 7);
    const d2 = odemeGirisiHazirla(k2, { turMap, kip: "duzenle", tarih: "2026-09-26", satirlar: [{ anahtar: "a", hedef: "ana", tutar: "500", hesapId: 53 }], hesaplar: HESAPLAR, hareketler: l2, giderler: GIDERLER, duzenlenen: tlOdeme });
    expect(d2.guncellenen).toBeNull();
    expect(d2.hatalar.satirlar.a.kur).toBe(D.KUR_BOS_HATASI);
    const d3 = odemeGirisiHazirla(k2, { turMap, kip: "duzenle", tarih: "2026-09-26", satirlar: [{ anahtar: "a", hedef: "ana", tutar: "500", hesapId: 53, kur: "25" }], hesaplar: HESAPLAR, hareketler: l2, giderler: GIDERLER, duzenlenen: tlOdeme });
    expect(d3.guncellenen).toMatchObject({ id: 901, tutar: 500, dovizTutar: 20, kur: 25, paraBirimi: "USD" });
  });
});

const boz = (o = {}) => K.virmanDogrula({ hesapId: 53, karsiHesapId: 51, tarih: "2026-09-25", tutar: "100", kur: "35,5", ...o }, HESAPLAR);
describe("Spec 0152: hesap değişiminde kur (triyaj)", () => {
  it("AC-41 / AC-13 / R14: aynı para birimindeki başka hesaba geçişte kayıtlı kur ve döviz tutar korunur (günün kuru da, çevrimdışı da)", () => {
    const usd1 = { id: 53, paraBirimi: "USD" }, usd2 = { id: 57, paraBirimi: "USD" }, eur = { id: 56, paraBirimi: "EUR" };
    const r = { tutar: "1.775", kur: "35,478713", kurKaynak: D.KUR_KAYNAK.TURETILEN, dovizTutar: "50,03" };
    expect(D.dovizHesapYamasi(r, usd2, { deger: 42 }, usd1)).toEqual({});
    expect(D.dovizHesapYamasi(r, usd2, { deger: null, neden: D.KUR_CEVRIMDISI }, usd1)).toEqual({});
    // Para birimi değişince öneri gelir; eski hesap verilmeyen çağrı (yeni satır) da öneriyle.
    expect(D.dovizHesapYamasi(r, eur, { deger: 38 }, usd1)).toMatchObject({ kur: "38", kurKaynak: D.KUR_KAYNAK.ONERI });
    expect(D.dovizHesapYamasi(r, usd2, { deger: 42 })).toMatchObject({ kur: "42", kurKaynak: D.KUR_KAYNAK.ONERI });
    // Kuru boş satırda aynı cinse geçiş öneriyi getirir (korunacak kur yok).
    expect(D.dovizHesapYamasi({ tutar: "1.775", kur: "", dovizTutar: "" }, usd2, { deger: 42 }, usd1)).toMatchObject({ kur: "42" });
    expect(D.dovizHesapYamasi(r, { id: 51, paraBirimi: "TRY" }, null, usd1)).toEqual({ kur: "", kurKaynak: null, dovizTutar: "" });
  });
});

describe("Spec 0152: bozdurma (B)", () => {
  it("AC-14 / AC-27 / R10/2 / P4: farklı para biriminde virman kaydedilir; çıkan, giren, kur ve iki para birimi kayıtta", () => {
    expect(boz().kayit).toMatchObject({ tur: "virman", tutar: 100, karsiTutar: 3550, kur: 35.5, paraBirimi: "USD", karsiParaBirimi: "TRY", hesapId: 53, karsiHesapId: 51 });
  });
  it("AC-17 / AC-27 / R12: aynı para birimindeki virmanda karşı bacak ve kur alanları hiç yazılmaz (kur verilse de)", () => {
    const k = K.virmanDogrula({ hesapId: 51, karsiHesapId: 52, tarih: "2026-09-25", tutar: "100", kur: "35" }, HESAPLAR).kayit;
    for (const x of DOVIZ_ANAHTAR) expect(k, x).not.toHaveProperty(x);
  });
  it("AC-15 / AC-28 / AC-19: çıkan hesap kendi para biriminde azalır, giren kendi para biriminde artar; silinince ikisi geri döner", () => {
    const l = ekle(boz().kayit);
    expect(bakiye(53, l)).toBe(bakiye(53) - 10000);
    expect(bakiye(51, l)).toBe(bakiye(51) + 355000);
    expect([53, 51].map(id => bakiye(id, l.filter(m => m.id !== 900)))).toEqual([bakiye(53), bakiye(51)]);
  });
  it("AC-16 / R11: kur değişince karşı tutar, karşı tutar değişince kur güncellenir", () => {
    expect(D.bozdurmaYamasi({ tutar: "100", kur: "" }, "kur", "36")).toEqual({ kur: "36", kurKaynak: "elle", karsiTutar: "3600" });
    expect(D.bozdurmaYamasi({ tutar: "100", kur: "36" }, "karsiTutar", "3550")).toEqual({ karsiTutar: "3550", kur: "35,5", kurKaynak: "turetilen" });
  });
  it("AC-36 / R10/3: USD ile EUR arasında kur girilmeden kayıt yok; kurla kaydedilir", () => {
    expect(K.virmanDogrula({ hesapId: 53, karsiHesapId: 56, tarih: "2026-09-25", tutar: "100" }, HESAPLAR).hatalar.kur).toBe(D.KUR_BOS_HATASI);
    expect(K.virmanDogrula({ hesapId: 53, karsiHesapId: 56, tarih: "2026-09-25", tutar: "100", kur: "0,92" }, HESAPLAR).kayit.karsiTutar).toBe(92);
  });
  it("AC-18 / R13: bozdurma hiçbir gider kalemini kapatmaz, gider ve gelir toplamlarına girmez", () => {
    const l = ekle(boz().kayit);
    expect(zengin(l)).toEqual(zengin());
    const rapor = (x) => hesaplaGiderRaporu(GIDERLER, { turler, baslangic: "2026-09-01", bitis: "2026-09-30" });
    expect(rapor(l)).toEqual(rapor(H));
    expect(giderKasaRaporu(girdi({ hareketler: l }), "2026-09").gider).toEqual(giderKasaRaporu(girdi(), "2026-09").gider);
  });
});

describe("Spec 0152: taşıma, çöp, rapor ve ekstre", () => {
  it("AC-40 / R7/2: döviz ödeme ve bozdurma varken hesapsız bırakma nedenli engellenir; taşıma hedefi yalnız aynı para birimi", () => {
    const usd2 = { id: 61, ad: "USD 2", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 0, kapali: false };
    const hs = [...HESAPLAR, usd2];
    const l = ekle(boz().kayit, ekle(dovizOdeme().kayit), 901);
    const p = K.hesapTasimaPlani(HESAPLAR.find(h => h.id === 53), l, veri, hs, { tarihYaz: fmtTR });
    expect(p.uygunHedefler.map(h => h.id)).toEqual([61]);
    expect(p.nedenler.hesapsiz.some(n => n.startsWith(`${fmtTR("2026-09-25")} döviz ödeme (${fmtCur(50, "USD")})`))).toBe(true);
    expect(p.nedenler.hesapsiz.some(n => /virman hesapsız bırakılamaz/.test(n))).toBe(true);
    const tasindi = p.guncelle(61).hesapHareketleri(l);
    expect(tasindi.find(m => m.id === 900)).toMatchObject({ hesapId: 61, dovizTutar: 50, paraBirimi: "USD" });
  });
  it("AC-48 / R15/2: çöp satırında döviz ödeme döviz tutarla, bozdurma çıkan bacakla ve kendi sembolüyle; öteki hareketler eski", () => {
    expect(hareketCopEtiketi({ ...dovizOdeme().kayit, tarih: "2026-09-25" })).toBe(`${fmtTR("2026-09-25")} · ${fmtCur(50, "USD")}`);
    expect(hareketCopEtiketi(boz().kayit)).toBe(`${fmtTR("2026-09-25")} · ${fmtCur(100, "USD")}`);
    expect(hareketCopEtiketi(H[0])).toBe(`${fmtTR(H[0].tarih)} · ${fmtCur(H[0].tutar, "TRY")}`);
  });
  it("AC-42 / R14/3 / P7: hesabı kalıcı silinmiş döviz ödeme kayıttaki para birimiyle okunur", () => {
    const m = dovizOdeme().kayit;
    expect(K.hareketParaBirimi(m, null)).toBe("USD");
    expect(K.hareketParaBirimi({ tur: "odeme", tutar: 5 }, null)).toBe("TRY");
    const l = ekle(m);
    const r = giderKasaRaporu(girdi({ hareketler: l, hesaplar: HESAPLAR.filter(h => h.id !== 53) }), "2026-09");
    const satir = r.kasa.hesapsiz.liste.find(x => x.doviz);
    expect(satir.doviz).toEqual({ tutarK: 5000, paraBirimi: "USD", kur: 35.5 });
  });
  it("AC-22 / AC-50 / R15/4: raporda döviz ödeme TL tutarın altında döviz tutar ve kur; bozdurma iki bacak; gider toplamları TL", () => {
    const l = ekle(boz().kayit, ekle(dovizOdeme().kayit), 901);
    const r = giderKasaRaporu(girdi({ hareketler: l }), "2026-09");
    expect(r.kasa.odemeler.find(o => o.doviz)).toMatchObject({ tutarK: 177500, doviz: { tutarK: 5000, paraBirimi: "USD", kur: 35.5 } });
    expect(r.kasa.virmanlar.find(v => v.karsi)).toMatchObject({ tutarK: 10000, paraBirimi: "USD", karsi: { tutarK: 355000, paraBirimi: "TRY", kur: 35.5 } });
    const html = buildGiderKasaRaporuHtml(r);
    expect(html).toContain("kur 35,5");
    expect(html).toMatch(/\$50(,00)? · kur 35,5/);
    expect(r.gider.toplam).toBe(giderKasaRaporu(girdi(), "2026-09").gider.toplam);
  });
  it("AC-23 / X8: tedarikçi ekstresi döviz ödemeyi TL tutarıyla okur; son bakiye borç özetiyle tutar", () => {
    const l = ekle(dovizOdeme().kayit);
    const e = K.tedarikciEkstresi(13, { giderler: GIDERLER, hareketler: l, turler, yururlukAy: "2026-01", bugun: "2026-09-30" });
    const satir = e.satirlar.find(s => s.hareket?.id === 900);
    expect([satir.tutarK, satir.etkiK]).toEqual([177500, -177500]); // döviz tutar (50 USD) değil, TL
    const borc = borcOzeti(zengin(l), { turler, tedarikciler, yururlukAy: "2026-01" }, "2026-09-30");
    expect(e.bakiye).toBe(borc.satirlar.find(x => x.tur === "tedarikci" && x.ad === "A<B Ticaret").tutar); // 0024 B6 çapraz ölçüsü
  });
  it("AC-52 / R14/4: iz ayrıntısı döviz ödemede kur, döviz tutar, para birimi; bozdurmada karşı bacak", () => {
    expect(D.dovizIzAyrintisi(dovizOdeme().kayit)).toEqual({ dovizTutar: 50, kur: 35.5, paraBirimi: "USD" });
    expect(D.dovizIzAyrintisi(boz().kayit)).toEqual({ karsiTutar: 3550, kur: 35.5, paraBirimi: "USD", karsiParaBirimi: "TRY" });
    expect(D.dovizIzAyrintisi(H[0])).toEqual({});
  });
});

describe("Spec 0152: kaynak taramaları", () => {
  it("P7 / triyaj: 'kayıt, hesap, TL' okuma sırası tek yerde (kasa.hareketParaBirimi); Kasa, rapor ve çöp onu çağırır, yerel kopya yok", () => {
    const kasa = yorumsuz("src/components/Kasa.jsx"), rapor = yorumsuz("src/lib/giderRaporu.js"), cop = yorumsuz("src/lib/copKutusu.js");
    expect(kasa).not.toMatch(/const hareketParaBirimi\s*=/);
    for (const s of [kasa, rapor, cop]) expect(s).toMatch(/hareketParaBirimi\(/);
    expect(rapor).not.toMatch(/m\.(karsiP|p)araBirimi \|\|/);
    expect(cop).not.toMatch(/h\.paraBirimi \?/);
    expect(D).not.toHaveProperty("dovizHareketiMi"); // kullanılmayan ayraç silindi
  });
  it("AC-25 / AC-29 / C1: döviz tutarı ve karşı bacağı kuruşa çeviren (bakiyeyi okuyan) tek yer kasa.js'in iki okuyucusu", () => {
    const yerler = dosyalar("src").filter(f => /kurus\((\w+)\.(dovizTutar|karsiTutar)/.test(yorumsuz(f)) || /kurus\(m\?\.(dovizTutar|karsiTutar)/.test(yorumsuz(f)));
    expect(yerler.sort()).toEqual([path.join("src", "lib", "giderRaporu.js"), path.join("src", "lib", "kasa.js")].sort());
    const k = yorumsuz("src/lib/kasa.js");
    expect(k.match(/kurus\(m\?\.dovizTutar/g)).toHaveLength(1);
    expect(k.match(/kurus\(m\?\.karsiTutar/g)).toHaveLength(1);
  });
  it("DoD: ekranlar kur çarpımı ve bölmesi yazmaz; kur önerisi tek yardımcıdan (ekranlar rates.usd / rates.eur okumaz)", () => {
    for (const f of ["src/components/gider/OdemeGirisi.jsx", "src/components/Kasa.jsx", "src/components/gider/OdemeKayitPenceresi.jsx", "src/components/GiderForm.jsx", "src/components/Giderler.jsx"]) {
      const s = yorumsuz(f);
      expect(s, f).not.toMatch(/rates\??\.(usd|eur)/);
      expect(s, f).not.toMatch(/\bkur\b\s*[*/]|[*/]\s*\bkur\b/);
    }
  });
  it("DoD: kur için tutar ayrıştırıcısı kullanılmaz; döviz alanlarını yazan tek yol (tarama)", () => {
    expect(yorumsuz("src/lib/doviz.js")).toMatch(/export const kurCoz/);
    for (const f of dosyalar("src")) expect(yorumsuz(f), f).not.toMatch(/(tutarCoz|parseMoney|tutarOku)\([^)]*\.kur\b/);
    // Döviz alanları kayda yalnız doğrulayıcıların döndürdüğü nesneyle ve tek yazıcıdan girer.
    const yazanlar = dosyalar("src").filter(f => /\b(dovizTutar|karsiTutar): tl\(/.test(yorumsuz(f)));
    expect(yazanlar).toEqual([path.join("src", "lib", "kasa.js")]);
    const kasa = yorumsuz("src/lib/kasa.js");
    expect(kasa).toMatch(/kayit: dovizAlanlariYaz\(\{\s*tur: "odeme"/);
    expect(kasa).toMatch(/kayit: dovizAlanlariYaz\(\{ tur: "virman"/);
  });
  it("C6 / DoD: yeni izin ve yeni hareket türü yok; sunucu kuralı değişmedi", () => {
    const s = fs.readFileSync("electron/serverAuth.cjs", "utf8");
    expect(s).not.toMatch(/bozdurma|doviz/i);
    expect(yorumsuz("src/lib/doviz.js")).not.toMatch(/tur: "bozdurma"/);
  });
});
