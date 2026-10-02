// Spec 0060 C bölümü: Aylık Gider ve Kasa Raporu'nda tür bazında ek ödeme, stopaj ve ay içi avans. Ortak veri 0059'unki
// (K2 stopajlı kira 20.000 × %20 = 4.000, vergi dairesine 4.000 ödendi; K4 personel, yalnız resmi prim 2.345; avans 3.000 +
// 500, mahsup 1.000). Gizlilik ek blokları tests/gider-gizlilik.test.js ve tests/gider-kasa-raporu.test.js'te.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { giderKasaRaporu, buildGiderKasaRaporuHtml, NOT_EK_ODEME } from "../src/lib/giderRaporu";
import { ekOdemeTurToplamlari, stopajOzeti, giderKalemDogrula, turHaritasi } from "../src/lib/gider";
import { girdi, GIDERLER, H, K2, turMap, AD } from "./fixtures/0059-veri";

const R = (o, ay = "2026-09") => giderKasaRaporu(girdi(o), ay);
const HTML = (o, ay) => buildGiderKasaRaporuHtml(R(o, ay));
const EK_KUTU = /<!--ek-odeme-->[\s\S]*?<!--\/ek-odeme-->/;
const kod = () => readFileSync("src/lib/giderRaporu.js", "utf8").split("\n").filter(l => !l.trim().startsWith("//")).join("\n");

describe("Spec 0060 R11, R28: ek ödemeler tür bazında", () => {
  it("AC-13 / AC-35: ek ödemeler tür bazında tek toplamla basılır; yalnız resmi primli ayda tutar tür toplamıdır", () => {
    const r = R();
    expect(r.gider.ekOdemeTurleri).toEqual([{ ad: "Prim", tutar: 2345 }]);
    const kutu = HTML().match(EK_KUTU)[0];
    expect(kutu).toContain("GİDER · EK ÖDEMELER (TÜR BAZINDA)");
    expect(kutu).toMatch(/Prim<\/td><td[^>]*>₺2\.345</);
    expect(kutu).toContain(NOT_EK_ODEME);
  });
  it("AC-13: resmi ve elden birlikte tek tutardır; 'Fazla mesai' etiketi belgede geçebilir", () => {
    const turler = [{ id: 3, ad: "Maaşlar", davranis: "personel" }];
    let n = 50;
    const k = giderKalemDogrula({ id: 9, tarih: "2026-09-30", turId: 3, calisanId: 7, calisanAd: "X", resmiTutar: 1000, eldenTutar: 500,
      ekOdemeler: [{ tur: "fazlaCalisma", aciklama: "", resmiTutar: 1357, eldenTutar: 2468 }, { tur: "ikramiye", aciklama: "", resmiTutar: 0, eldenTutar: 700 }] },
      { turMap: turHaritasi(turler), uid: () => ++n }).kayit;
    expect(ekOdemeTurToplamlari([k])).toEqual([{ tur: "fazlaCalisma", ad: "Fazla mesai", toplamK: 382500 }, { tur: "ikramiye", ad: "İkramiye", toplamK: 70000 }]);
    const h = buildGiderKasaRaporuHtml(giderKasaRaporu({ giderler: [k], hareketler: [], turler, yururlukAy: "2026-01", hesaplar: [] }, "2026-09"));
    const kutu = h.match(EK_KUTU)[0];
    expect(kutu).toMatch(/Fazla mesai<\/td><td[^>]*>₺3\.825</);
    expect(kutu).toMatch(/İkramiye<\/td><td[^>]*>₺700</);
    for (const yasak of ["1.357", "2.468", "Resmi", "Elden"]) expect(kutu, yasak).not.toContain(yasak);
  });
  it("AC-17: o ay ek ödeme yoksa kutu hiç basılmaz", () => {
    const giderler = GIDERLER.map(k => (k.id === 4 ? { ...k, ekOdemeler: [] } : k));
    expect(R({ giderler }).gider.ekOdemeTurleri).toEqual([]);
    expect(HTML({ giderler })).not.toContain("EK ÖDEMELER");
  });
  it("AC-22 / AC-34: rapor kurucusu kişi bazlı alan adlarını okumaz; tür toplamı saf motordan", () => {
    expect(kod()).not.toMatch(/calisanlar\b|calisanAd|resmiTutar|eldenTutar|ekOdemeler/);
    expect(kod()).toContain("ekOdemeTurToplamlari(personel)");
  });
});

describe("Spec 0060 R12, R31: stopaj", () => {
  it("AC-14 / AC-41: ayın kesilen, ödenen ve açık stopajı kira toplamından ayrı; kesilen = ödenen + açık", () => {
    const r = R();
    expect(r.gider.stopaj).toEqual({ kesilen: 4000, odenen: 4000, acik: 0 });
    expect(r.gider.stopaj.kesilen).toBe(r.gider.ozet.stopaj);
    const odenmemis = R({ hareketler: H.filter(h => h.id !== 112) }).gider.stopaj;
    expect(odenmemis).toEqual({ kesilen: 4000, odenen: 0, acik: 4000 });
    expect(HTML()).toMatch(/GİDER · STOPAJ[\s\S]*Kesilen stopaj[\s\S]*Ödenen[\s\S]*Ay sonunda açık/);
  });
  it("AC-30: stopaj özeti saf motorda tek fonksiyondan; rapor kendi döngüsünü yazmaz", () => {
    expect(stopajOzeti([K2], turMap)).toMatchObject({ kesilenK: 400000 });
    expect(kod()).toContain("stopajOzeti(gr.kalemler, turMap)");
    expect(kod()).not.toMatch(/HEDEF\.STOPAJ/);
  });
  it("AC-17: o ay stopaj yoksa kutu hiç basılmaz", () => {
    const giderler = GIDERLER.filter(k => k.id !== 2);
    expect(R({ giderler }).gider.stopaj).toBeNull();
    expect(HTML({ giderler })).not.toContain("GİDER · STOPAJ");
  });
});

describe("Spec 0060 R13, R33: avans", () => {
  it("AC-15 / AC-42: ay içinde verilen ve mahsup edilen avans eklenir; başlık ve 'Açık avans toplamı' satırı korunur", () => {
    const r = R();
    expect(r.kasa.avansAy).toEqual({ verilenK: 350000, mahsupK: 100000 });
    expect(HTML()).toMatch(/KASA · AÇIK ÇALIŞAN AVANSI[\s\S]*Ay içinde verilen[\s\S]*3\.500[\s\S]*Ay içinde mahsup edilen[\s\S]*1\.000[\s\S]*Açık avans toplamı/);
  });
  it("AC-15 / AC-17: avans hiç yokken kutu ve 'Açık avans toplamı' sıfırla basılır", () => {
    const h = HTML({ hareketler: H.filter(m => m.tur !== "avans" && m.tur !== "mahsup") });
    expect(h).toMatch(/KASA · AÇIK ÇALIŞAN AVANSI[\s\S]*Açık avans toplamı/);
  });
});

describe("Spec 0060 R3 revizyonu: personel yöntem kırılımı rapora girmez", () => {
  it("AC-16 / AC-31: rapor nesnesi personel yöntem kırılımı taşımaz; toplu 'Personel ödemeleri' satırı korunur; maaş tutarı yöntem tablosunda yok", () => {
    const r = R();
    expect(r.gider.yontem).not.toHaveProperty("personelSatirlar");
    const h = HTML();
    expect(h).toMatch(/Personel ödemeleri<\/td><td[^>]*>/);
    expect(h).not.toContain("PERSONEL ÖDEMELERİ · YÖNTEM");
    expect(h).not.toContain("31.111");
  });
});

describe("Spec 0060: toplamlar, determinizm, bölümler", () => {
  it("AC-18: raporun bugünkü toplamları değişmedi (gider özeti, KDV, kasa bakiyeleri)", () => {
    const altin = JSON.parse(readFileSync("tests/fixtures/0059-gider-rapor-once.json", "utf8"))["2026-09"];
    const r = R();
    expect(r.gider.ozet).toEqual(altin.gider.ozet);
    expect(r.gider.kdv).toEqual(altin.gider.kdv);
    expect(r.kasa.bloklar).toEqual(altin.kasa.bloklar);
    expect(r.kasa.avansK).toBe(altin.kasa.avansK);
  });
  it("AC-19: aynı girdiyle iki çağrı birebir aynı HTML; kurucu zaman okumaz", () => {
    expect(HTML()).toBe(HTML());
    // Ay adı için ayın 1'inden kurulan tarih (new Date(y, m − 1, 1)) deterministiktir; şimdiki zaman okunmaz.
    expect(kod()).not.toMatch(/new Date\(\)|Date\.now|yerelBugun/);
  });
  it("AC-33 / AC-37: toplu satır metinleri ve 'Ay geneli' kalıbı korunur; yeni kutular eklemedir", () => {
    const r = R();
    expect(r.kasa.odemeler.filter(m => m.toplu).map(m => m.kalem)).toEqual(["Personel ödemeleri · 1 adet", "Çalışan avansları · 2 adet", "Avanstan mahsup · 1 adet"]);
    expect(HTML()).toMatch(/Ay geneli<\/td><td[^>]*><\/td><td[^>]*><\/td><td[^>]*>Personel ödemeleri · 1 adet<\/td>/);
  });
  it("AC-20 / AC-21: ayırt edici çalışan adı ve bileşen tutarı belgede yok (kutu dahil)", () => {
    const h = HTML();
    for (const yasak of [AD, "Zümrüt", "31.111", "17.777", "Eylül primi", "Resmi", "Elden"]) expect(h, yasak).not.toContain(yasak);
  });
});
