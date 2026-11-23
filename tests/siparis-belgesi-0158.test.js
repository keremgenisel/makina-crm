// Spec 0158 B, C, D, E: belgenin parça sütunları, kesilecek adet ve genel toplam (motor ve belge). Test adları AC-<n> taşır.
// Veri `tests/fixtures/0158-dolu.js`; kıyas `tests/ui/siparis-belgesi-0158-kiyas.test.jsx`'te.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import * as S from "../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml, BELGE_SUTUNLARI, parcaSutunlari, sutunSinifi, GENIS_STIL, GENIS_ESIK, GRUP_TABLO_STILI } from "../src/lib/siparisRaporu";
import { belgeAcilis } from "../src/lib/raporSunumu";
import { veri, PARCALAR, FIYATSIZ_PARCA, BUGUN, FACTORY } from "./fixtures/0158-dolu.js";
import { birlesikSatirlar } from "./fixtures/0158-alt-satir.js";

const sonuc = (o = {}, sec = {}) => S.siparisIhtiyaci(veri(o), { tedarikciOdakli: true, ...sec });
const html = (r, o = {}) => siparisRaporuHtml(r, { bugun: BUGUN, factory: FACTORY, partiAd: "Güz", ...o });
const bolumHtml = (h, ad) => h.split('<div class="siparis-bolum"').find(p => p.includes(`${ad} · `)) || "";
const tablolar = (h) => [...h.matchAll(/<div class="(sk-[A-Z]+(?: siparis-genis)?(?: siparis-ust)?)">[\s\S]*?<table>([\s\S]*?)<\/table><\/div>/g)].map(m => ({ sinif: m[1], t: m[2] }));
const basliklar = (t) => [...t.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map(m => m[1]);
const hizalar = (t) => [...t.matchAll(/<th style="text-align:(\w+)/g)].map(m => m[1]);
const satirlar = birlesikSatirlar; // triyaj (bulgu 1): rowspan'lı alt satırlar tek mantıksal satır
const duz = (c) => String(c).replace(/<br>/g, " | ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
// Bölümün, başlığı verilen grup tablosu ve satırı (sütun adına göre hücre).
const grup = (h, b, baslik) => {
  const parca = bolumHtml(h, b);
  const i = parca.indexOf(`>${baslik}</div><table>`);
  return tablolar(parca.slice(parca.lastIndexOf('<div class="sk-', i))).at(0);
};
const hucre = (h, b, g, ad, sutun) => { const t = grup(h, b, g); const bs = basliklar(t.t); const r = satirlar(t.t).find(x => x[0].replace(/<div[\s\S]*$/, "").replace(" (elle)", "") === ad); return r ? r[bs.indexOf(sutun)] : undefined; };
const kodSatirlari = (dosya) => fs.readFileSync(dosya, "utf8").split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).map(l => l.replace(/\s\/\/.*$/, "")).join("\n");
const fonksiyon = (kod, ad) => { const i = kod.indexOf(`const ${ad} = `); return kod.slice(i, kod.indexOf("\n};", i) + 3); };

const r = sonuc();
const fsz = html(r);
const fli = html(r, { fiyatli: true });

describe("Spec 0158 B: belgenin parça sütunları", () => {
  it("AC-57 / AC-76: sütun sırası Parça · Kod · Ölçü · Hammadde · Cins · Sipariş adedi, fiyatlıda Tutar sonda; başlık işlem tablosuyla aynı", () => {
    expect(BELGE_SUTUNLARI.parca).toEqual(["Parça", "Kod", "Ölçü", "Hammadde", "Cins", "Sipariş adedi"]);
    expect(basliklar(grup(fli, "Aksu CNC", "Hazır parçalar").t)).toEqual(["Parça", "Kod", "Ölçü", "Hammadde", "Cins", "Sipariş adedi", "Tutar"]);
    expect(BELGE_SUTUNLARI.parca.at(-1)).toBe(BELGE_SUTUNLARI.islem.at(-1));
  });
  it("AC-11 / AC-14 / AC-15: kodu, hammaddesi ve cinsi girilmiş parçanın hücreleri dolu", () => {
    expect(hucre(fsz, "Aksu CNC", "Hazır parçalar", "Cıvata M8", "Kod")).toBe("CV-8");
    expect(hucre(fsz, "Aksu CNC", "Hazır parçalar", "Cıvata M8", "Hammadde")).toBe("Paslanmaz A2");
    expect(hucre(fsz, "Aksu CNC", "Hazır parçalar", "Cıvata M8", "Cins")).toBe("DIN 933");
    expect(hucre(fsz, "İkizler Paslanmaz", "Paslanmaz", "100_AYNA MAHRUTİ DİŞLİSİ TAKIM", "Kod")).toBe("AYN-100");
  });
  it("AC-12: malzeme kalemi olmayan, ölçüsü girilmiş parçanın Ölçü hücresi kendi ölçüsünü yazar", () => {
    expect(hucre(fsz, "Aksu CNC", "Hazır parçalar", "Cıvata M8", "Ölçü")).toBe("M8 × 40");
  });
  it("AC-13: malzeme kalemi olan parçanın Ölçü hücresi kesit metnini yazar, kendi ölçüsü dolu olsa da", () => {
    expect(hucre(fsz, "İkizler Paslanmaz", "Paslanmaz", "100_AYNA MAHRUTİ DİŞLİSİ TAKIM", "Ölçü")).toBe("Ø65 × 27 mm · parça başına 2");
    expect(fsz).not.toContain("elle yazılmış eski ölçü");
  });
  it("AC-16 / AC-17 / AC-18: dolu olmayan sütun o tabloda çizilmez; başka tabloda doluysa orada çizilir; dört sütun ayrı ayrı", () => {
    expect(basliklar(grup(fsz, "İkizler Paslanmaz", "Pirinç").t)).toEqual(["Parça", "Ölçü", "Sipariş adedi"]);
    expect(basliklar(grup(fsz, "İkizler Paslanmaz", "Paslanmaz").t)).toEqual(["Parça", "Kod", "Ölçü", "Hammadde", "Sipariş adedi"]);
    const yalniz = html(sonuc({ parts: PARCALAR.filter(p => [5, 8].includes(p.id)) }));
    expect(basliklar(grup(yalniz, "Aksu CNC", "Hazır parçalar").t)).toEqual(["Parça", "Sipariş adedi"]);
    expect(r.tedarikciBolumleri.belge.find(b => b.ad === "Aksu CNC").gruplar.find(g => g.baslik === "Hazır parçalar").sutunlar).toEqual({ kod: true, olcu: true, hammaddeAdi: true, cins: true });
  });
  it("AC-19: dört alanı da boş parçanın satırı yazılır ve sipariş adedi görünür", () => {
    expect(hucre(fsz, "Aksu CNC", "Hazır parçalar", "Rulman", "Sipariş adedi")).toBe("70");
    expect(hucre(fsz, "Aksu CNC", "Hazır parçalar", "Rulman", "Kod")).toBe("");
  });
  it("AC-20 / AC-67: gizlenen sütun hizayı kaydırmaz; hiza sütun adından (Sipariş adedi ve Tutar sağda)", () => {
    for (const { t } of tablolar(fli)) {
      const bs = basliklar(t); const hz = hizalar(t);
      bs.forEach((b, i) => expect(hz[i], b).toBe(["Sipariş adedi", "Tutar"].includes(b) ? "right" : "left"));
      for (const s of satirlar(t)) expect(s).toHaveLength(bs.length);
    }
  });
  it("AC-66: sütun kümesi farklı tablolar kendi sınıfı ve genişliğiyle; kümesi aynı tablolar aynı sınıfta", () => {
    const tl = tablolar(fsz);
    const kume = (t) => basliklar(t).join("|");
    const k1 = (x) => x.sinif.split(" ")[0]; // genişlik sınıfı (hiza ve punto sınıfları ayrı)
    for (const a of tl) for (const b of tl) expect(k1(a) === k1(b)).toBe(kume(a.t) === kume(b.t));
    const stil = fsz.match(/<style>([\s\S]*?)<\/style>/)[1];
    for (const { t } of tl) expect(stil).toContain(`.siparis-bolum .${sutunSinifi(basliklar(t))} th:nth-child(1){width:`);
    expect(GRUP_TABLO_STILI(false)).toBe(".siparis-bolum table{table-layout:fixed;}.siparis-bolum .sk-POS th:nth-child(1){width:34%;}.siparis-bolum .sk-POS th:nth-child(2){width:38%;}.siparis-bolum .sk-POS th:nth-child(3){width:28%;}");
  });
  it("AC-21 / AC-59 (belge): altı ve üstü sütunlu tablo küçük punto sınıfını alır ve gövde genişler; dar belgede ikisi de yok", () => {
    expect(grup(fli, "Aksu CNC", "Hazır parçalar").sinif).toMatch(/siparis-genis$/);
    expect(fli).toContain(GENIS_STIL);
    expect(GENIS_STIL).toContain("body{max-width:748px;}"); // P1: dolgu 2 × 16 ile 780
    expect(GENIS_STIL).toMatch(/font-size:9\.5px !important/); expect(GENIS_STIL).toContain("overflow-wrap:anywhere");
    const dar = html(sonuc({ parts: PARCALAR.filter(p => [2, 11].includes(p.id)) }));
    expect(dar).not.toContain("siparis-genis"); expect(dar).not.toContain("748px");
    expect(GENIS_ESIK).toBe(6);
  });
  it("AC-22: paylaşılan rapor açılışı değişmedi; öteki raporların gövdesi 720 piksel", () => {
    const a = belgeAcilis({ title: "x", baslik: "X", ust: "", donem: "", factory: null });
    expect(a).toContain("max-width:720px"); expect(a).not.toContain("max-width:748px");
    expect(kodSatirlari("src/lib/raporSunumu.js")).not.toMatch(/max-width:7[48][08]px|siparis/);
  });
  it("AC-23: işlem tablosunda yeni sütunlar çizilmez", () => {
    const t = [...bolumHtml(fsz, "İkizler Paslanmaz").matchAll(/<div data-islemler>[\s\S]*?<table>([\s\S]*?)<\/table>/g)].map(m => m[1]);
    expect(t).toHaveLength(1); expect(basliklar(t[0])).toEqual(BELGE_SUTUNLARI.islem);
  });
  it("AC-52: fiyatsız nüshada tutar ve toplam satırı yok; sütun kuralları aynı", () => {
    expect(fsz).not.toContain("data-genel-toplam"); expect(fsz).not.toContain("data-bolum-toplami"); expect(fsz).not.toContain(">Tutar<");
    expect(basliklar(grup(fsz, "Aksu CNC", "Hazır parçalar").t)).toEqual(BELGE_SUTUNLARI.parca);
  });
  it("AC-64 / AC-65: belgenin Ölçü hücresi motorun tek alanından; serbest ölçü `olculer` dizisine girmez ve hammadde grubuna düşürmez", () => {
    const x = r.tedarikciBolumleri.belge.find(b => b.ad === "Aksu CNC").satirlar.find(s => s.ad === "Cıvata M8");
    expect(x.olcuSatirlari).toEqual(["M8 × 40"]); expect(x.olculer).toEqual([]); expect(x.grup.tur).toBe(S.GRUP_TURU.HAZIR);
    expect(r.tedarikciBolumleri.bolumler.find(b => b.ad === "Aksu CNC").hazirParcalar.find(s => s.ad === "Cıvata M8").olcuSatirlari).toEqual(["M8 × 40"]);
  });
});

describe("Spec 0158 C: kesilecek adet", () => {
  it("AC-25 / AC-26: kalem adedi 2, sipariş 70: hücre 140, altında parça adedi ile kalem adedi", () => {
    expect(duz(hucre(fsz, "İkizler Paslanmaz", "Paslanmaz", "100_AYNA MAHRUTİ DİŞLİSİ TAKIM", "Sipariş adedi"))).toBe("140 70 parça × 2");
  });
  it("AC-27: kalem adedi 1 olan satır parça adedini yazar, açıklama yok", () => {
    expect(hucre(fsz, "İkizler Paslanmaz", "Paslanmaz", "Tek ölçülü", "Sipariş adedi")).toBe("70");
  });
  it("AC-28 / AC-61: iki ölçülü parçada her ölçünün satırı ölçü satırıyla hizalı; ölçüsü eksik kalem iki hücrede de satır doğurmaz", () => {
    const o = hucre(fsz, "İkizler Paslanmaz", "Paslanmaz", "İki ölçülü", "Ölçü").split("<br>");
    const sp = hucre(fsz, "İkizler Paslanmaz", "Paslanmaz", "İki ölçülü", "Sipariş adedi").replace(/<div[\s\S]*$/, "").split("<br>");
    expect(o).toEqual(["Ø40 × 50 mm · parça başına 2", "Ø40 × 80 mm"]); expect(sp).toEqual(["140", "70"]);
    const e = r.tedarikciBolumleri.belge.flatMap(b => b.satirlar).find(x => x.ad === "Eksikli");
    expect(e.olcuSatirlari).toHaveLength(1); expect(e.siparisSatirlari).toHaveLength(1);
  });
  it("AC-28 / AC-61 / R19 (triyaj bulgu 1): iki ölçülü parça ölçü başına bir tablo satırına bölünür; ölçü ve adedi aynı satırda, öteki hücreler rowspan", () => {
    const t = grup(fsz, "İkizler Paslanmaz", "Paslanmaz").t;
    const trs = [...t.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m => m[1]);
    const i = trs.findIndex(x => x.includes(">İki ölçülü<"));
    const hucreler = (x) => [...x.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)].map(c => ({ rs: c[1].match(/rowspan="(\d+)"/)?.[1], h: c[2] }));
    const bir = hucreler(trs[i]); const iki = hucreler(trs[i + 1]);
    expect(bir.filter(c => c.rs === "2").map(c => c.h)).toContain("İki ölçülü");
    expect(bir.filter(c => !c.rs).map(c => c.h)).toEqual(["Ø40 × 50 mm · parça başına 2", "140"]);
    expect(iki.map(c => c.h.replace(/<div[\s\S]*$/, ""))).toEqual(["Ø40 × 80 mm", "70"]);
    expect(iki[1].h).toContain("70 parça × 2"); // açıklama son satırın sipariş hücresinde
    expect(trs[i]).toContain("border-bottom:1px solid transparent"); // iç satırda alt çizgi yok
    // Tek ölçülü parça bölünmez (rowspan yok).
    expect(trs.find(x => x.includes(">Tek ölçülü<"))).not.toContain("rowspan");
  });
  it("AC-28 / R19 (hiza): kesim satırı olan grup tablosunda hücreler üste hizalanır; olmayanda bugünkü gibi", () => {
    expect(grup(fsz, "İkizler Paslanmaz", "Paslanmaz").sinif).toContain("siparis-ust");
    expect(grup(fsz, "İkizler Paslanmaz", "Pirinç").sinif).not.toContain("siparis-ust");
    expect(fsz).toContain(".siparis-bolum .siparis-ust td{vertical-align:top;}");
    const dar = html(sonuc({ parts: PARCALAR.filter(p => [5, 11].includes(p.id)) }));
    expect(dar).not.toContain("siparis-ust");
  });
  it("AC-29: yalnız boydan sipariş edilen satırın hücresi ve alt satırı bugünkü biçimde", () => {
    expect(duz(hucre(fsz, "İkizler Paslanmaz", "Çubuk çelik", "Boy çubuk", "Sipariş adedi"))).toMatch(/^\d+ boy \(1\.000 mm\) 70 parça$/);
    expect(r.tedarikciBolumleri.belge.flatMap(b => b.satirlar).find(x => x.ad === "Boy çubuk")).not.toHaveProperty("siparisSatirlari");
  });
  it("AC-60: boydan ve kilo ölçüsü olan satır her ölçü için kendi satırını yazar; boy satırı bugünkü biçiminde", () => {
    expect(duz(hucre(fsz, "İkizler Paslanmaz", "Çubuk çelik", "Karışık", "Sipariş adedi"))).toMatch(/^\d+ boy \(1\.000 mm\) \| 140 70 parça$/);
  });
  it("AC-30: ölçüsü olmayan hazır parça parça adedini yazar", () => {
    expect(hucre(fsz, "Aksu CNC", "Hazır parçalar", "Rulman", "Sipariş adedi")).toBe("70");
  });
  it("AC-31: kesidi 'sipariş etme' işaretli parçanın hücresi parça adedini yazar", () => {
    const k = sonuc({}, { duzenleme: { parca: {}, kesit: { "601|kilo||mil|65": { kapali: true } } } });
    expect(hucre(html(k), "İkizler Paslanmaz", "Paslanmaz", "100_AYNA MAHRUTİ DİŞLİSİ TAKIM", "Sipariş adedi")).toBe("70");
  });
  it("AC-32: malzemesi çözülemeyen satırın hücresi parça adedini yazar", () => {
    expect(hucre(fsz, "Aksu CNC", "Malzemesi belirtilmemiş", "Malzemesiz", "Sipariş adedi")).toBe("70");
  });
  it("AC-33: Ölçü hücresindeki 'parça başına 2' eki yerinde", () => {
    expect(hucre(fsz, "İkizler Paslanmaz", "Paslanmaz", "100_AYNA MAHRUTİ DİŞLİSİ TAKIM", "Ölçü")).toContain(" · parça başına 2");
  });
  it("AC-34 / R24: adında TAKIM geçmeyen ama kalem adedi 3 olan parça da çarpılır", () => {
    expect(duz(hucre(fsz, "İkizler Paslanmaz", "Paslanmaz", "Ara mil", "Sipariş adedi"))).toBe("210 70 parça × 3");
  });
  it("AC-36 (motor): elle düzenlenen parça adedi belgeye çarpılarak yansır (35 takım → 70)", () => {
    const d = sonuc({}, { duzenleme: { parca: { 1: { adet: "35" } }, kesit: {} } });
    expect(duz(hucre(html(d), "İkizler Paslanmaz", "Paslanmaz", "100_AYNA MAHRUTİ DİŞLİSİ TAKIM", "Sipariş adedi"))).toBe("70 35 parça × 2");
  });
  it("AC-38 / C8 (tarama): kesilecek adet kuralı kilogram, tutar ve toplama dokunmaz; sayısal kıyas 0158 kıyas testinde (altın)", () => {
    const kod = kodSatirlari("src/lib/siparisIhtiyaci.js");
    expect(fonksiyon(kod, "kesimSatirlariKur")).not.toMatch(/siparisKg|tutarK|toplam|payKg/);
  });
  it("AC-62 / R19/3: kesilecek adet ölçü nesnelerine yazılmaz; pencerenin satırı etkilenmez", () => {
    for (const b of r.tedarikciBolumleri.belge) for (const x of b.satirlar) for (const o of x.olculer) expect(Object.keys(o).sort()).toEqual(["adet", "anahtar", "bicim", "boy", "eksik", "kesit", "malzemeAd", "malzemeId", "metin", "tedarikciId"]);
    const p = r.tedarikciBolumleri.bolumler.find(b => b.ad === "Aksu CNC").hazirParcalar.find(x => x.ad === "100_AYNA MAHRUTİ DİŞLİSİ TAKIM");
    expect(p.siparis).toBe(70); expect(p).not.toHaveProperty("siparisSatirlari");
  });
  it("AC-37 (motor): belgede kesim satırı varken `kesimVar`, yokken anahtar yok", () => {
    expect(r.tedarikciBolumleri.kesimVar).toBe(true);
    expect(sonuc({ parts: PARCALAR.filter(p => [5, 11].includes(p.id)) }).tedarikciBolumleri).not.toHaveProperty("kesimVar");
  });
});

describe("Spec 0158 D: genel toplam", () => {
  const b = (ad, rr = r) => rr.tedarikciBolumleri.belge.find(x => x.ad === ad);
  const genel = (h, ad) => bolumHtml(h, ad).match(/<div data-genel-toplam[^>]*>([\s\S]*?)<\/div>/)?.[1];
  it("AC-39 / AC-45 / R31: dolar, euro ve lira malzemeli, lira işlemli bölümde genel toplam ikisinin lira toplamı, tek rakam", () => {
    const x = b("İkizler Paslanmaz");
    expect(x.toplamlar.map(t => t.pb)).toEqual(["TRY", "USD", "EUR"]);
    expect(x.genelToplamK).toBe(x.toplamTLK + x.islemToplamK);
    expect(duz(genel(fli, "İkizler Paslanmaz"))).toContain(`${S.GENEL_TOPLAM}: ${S.tlMetni(x.toplamTLK + x.islemToplamK)}`);
  });
  it("AC-40 / AC-41 / AC-42: işlemler toplamı ve bölüm toplamı satırları aynen; kapsam cümlesi değişmez; genel toplam ikisinin altında", () => {
    const g = bolumHtml(fli, "İkizler Paslanmaz"); const x = b("İkizler Paslanmaz");
    expect(g).toContain(`<b>${S.ISLEMLER_TOPLAMI}:</b> ${S.tlMetni(x.islemToplamK)}`);
    expect(g).toContain(`${S.pbToplamMetni(x.toplamlar)} · kayıtlı kurla ${S.tlMetni(x.toplamTLK)}`);
    expect(g).toContain(S.TOPLAM_KAPSAM_CUMLESI);
    expect(g.indexOf("data-genel-toplam")).toBeGreaterThan(g.indexOf("data-bolum-toplami"));
    expect(g.indexOf("data-genel-toplam")).toBeGreaterThan(g.indexOf("data-islem-toplami"));
  });
  it("AC-43 / R29: işlem kalemi olmayan bölümde genel toplam yazılmaz", () => {
    expect(b("Aksu CNC").genelToplamK).toBeNull(); expect(genel(fli, "Aksu CNC")).toBeUndefined();
  });
  it("AC-44 / AC-74 / R26/2: yalnız işlem kalemi olan bölümde genel toplam işlemler toplamına eşit ve bölümün sonunda kendi satırı", () => {
    const x = b("Fason Kaplama");
    expect(x.satirlar).toHaveLength(0); expect(x.genelToplamK).toBe(x.islemToplamK);
    expect(duz(genel(fli, "Fason Kaplama"))).toBe(`${S.GENEL_TOPLAM}: ${S.tlMetni(x.islemToplamK)}`);
    expect(bolumHtml(fli, "Fason Kaplama")).not.toContain("data-bolum-toplami");
  });
  it("AC-46 / R30: bölümün lira karşılığı hesaplanamıyorsa genel toplam yazılmaz", () => {
    expect(b("Kursuz Çelik").toplamTLK).toBeNull(); expect(b("Kursuz Çelik").genelToplamK).toBeNull();
    expect(genel(fli, "Kursuz Çelik")).toBeUndefined();
  });
  it("AC-73 / R30/2: lira karşılığı kısmen hesaplanan bölümde genel toplam basılır ve yanında iki sayacın toplamı", () => {
    const tutarsizIslem = { ...FIYATSIZ_PARCA, maliyetKalemleri: [...FIYATSIZ_PARCA.maliyetKalemleri, { tur: "islem", ad: "Polisaj", tedarikciId: 21, tutar: null }] };
    const k = sonuc({ parts: [...PARCALAR.filter(p => p.id === 6), tutarsizIslem] });
    const x = b("İkizler Paslanmaz", k);
    expect(x.tutarsizSayi).toBeGreaterThan(0); expect(x.islemTutarsizSayi).toBeGreaterThan(0); expect(x.toplamTLK).not.toBeNull();
    expect(x.genelTutarsizSayi).toBe(x.tutarsizSayi + x.islemTutarsizSayi);
    expect(duz(genel(html(k, { fiyatli: true }), "İkizler Paslanmaz"))).toBe(`${S.GENEL_TOPLAM}: ${S.tlMetni(x.genelToplamK)} · ${S.tutarsizMetni(x.genelTutarsizSayi)}`);
  });
  it("AC-47 / C7: genel toplam kayıtlı kurdan; günün kuru okunmaz (tarama)", () => {
    const kod = kodSatirlari("src/lib/siparisIhtiyaci.js");
    expect(fonksiyon(kod, "genelToplamKur")).not.toMatch(/rates|kurOnerisi|\.kur\b|\*/);
    expect(kodSatirlari("src/lib/siparisRaporu.js")).not.toMatch(/rates|kurOnerisi/);
  });
});

describe("Spec 0158 E: tarama", () => {
  it("AC-54 / C1: belge kurucusunda toplama, satır tarama ve karar yok; sütun kararı ve genişlikler motordan", () => {
    const k = kodSatirlari("src/lib/siparisRaporu.js");
    expect(k).not.toMatch(/\.sort\(|localeCompare|reduce\(/);
    expect(k).not.toMatch(/\.some\(x => !!x\.(kod|hammaddeAdi|cins)|olcuSatirlari\.length/);
    expect(k).not.toMatch(/genelToplamK\s*[+*-]|toplamTLK\s*\+|islemToplamK\s*\+/);
    expect(k).toMatch(/g\.sutunlar/); expect(k).toMatch(/b\.genelToplamK/);
    expect(parcaSutunlari({ kod: false, olcu: false, hammaddeAdi: false, cins: false }, true)).toEqual(["Parça", "Sipariş adedi", "Tutar"]);
  });
  it("AC-81 / C11/2: üç yeni metin motorun sabitleri arasında tek yerde", () => {
    const yerler = (metin) => ["src/lib", "src/components"].flatMap(d => fs.readdirSync(d, { recursive: true }).filter(f => /\.jsx?$/.test(f)).map(f => `${d}/${f}`))
      .filter(f => fs.readFileSync(f, "utf8").includes(metin));
    expect(yerler("Genel toplam (TL)")).toEqual(["src/lib/siparisIhtiyaci.js"]);
    expect(yerler("kesilecek adet olarak")).toEqual(["src/lib/siparisIhtiyaci.js"]);
    expect(S.kesimAciklamaMetni(70, 2)).toBe("70 parça × 2");
  });
});
