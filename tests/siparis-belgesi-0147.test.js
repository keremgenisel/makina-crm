// Spec 0147: sipariş belgesinde hammadde gruplaması ve ölçü birimi. Gruplama, sıra ve satırın hammaddeye bölünmesi motorda
// (`siparisIhtiyaci.js` `belgeBolumleriKur`, bölümün `gruplar` alanı), belge yalnız gösterir (`siparisRaporu.js`, C1). Veri 0144'ün
// kıyas verisi (dört tedarikçi, on bir hammadde); bölünmeye özgü parçalar testin içinde eklenir.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import * as S from "../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml, belgeDurumu, ELLE_NOTU, GRUP_TABLO_STILI } from "../src/lib/siparisRaporu";
import { veri, PARCALAR, SENARYOLAR, BUGUN, FACTORY, K } from "./fixtures/0144-veri.js";

const mk = (o) => ({ tur: "malzeme", adet: 1, ...o });
const kit = (parts) => [{ model: "AK100_DS", defaultParcalar: parts.map(p => ({ partId: String(p.id), miktar: p.id === 2 ? 2 : 1 })) }];
const ekle = (ek, sec = {}, o = {}) => { const parts = [...PARCALAR, ...ek]; return S.siparisIhtiyaci(veri({ parts, modeller: kit(parts), ...o }), { tedarikciOdakli: true, ...sec }); };
const calis = (ad) => { const [v, s] = SENARYOLAR()[ad]; return S.siparisIhtiyaci(v, s); };
const bolum = (r, ad) => r.tedarikciBolumleri.belge.find(b => b.ad === ad);
const html = (r, o = {}) => siparisRaporuHtml(r, { bugun: BUGUN, factory: FACTORY, ...o });
const bolumHtml = (h, ad) => h.split('<div class="siparis-bolum"').find(p => p.includes(`${ad} · `)) || "";
// Grup başlığı `detayTablo`'nun başlık satırı; ardından gelen tablo o grubun parça tablosu.
const GRUP = /<div style="font-size:10px;font-weight:700;color:#94a3b8;margin-top:8px;">([^<]*)<\/div><table><thead><tr><th[^>]*>Parça<\/th>[\s\S]*?<\/table>/g;
const gruplar = (h, ad) => [...bolumHtml(h, ad).matchAll(GRUP)].map(m => ({ baslik: m[1], tablo: m[0] }));
const satirlar = (t) => [...t.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => c[1])).filter(x => x.length);
const satirAdi = (x) => x[0].replace(/<div[\s\S]*$/, "");
const adlar = (t) => satirlar(t).map(satirAdi);
const kodSatirlari = (dosya) => fs.readFileSync(dosya, "utf8").split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).map(l => l.replace(/\s\/\/.*$/, "")).join("\n");

const r = calis("odakli");
const h = html(r);
const fli = html(r, { fiyatli: true });

describe("Spec 0147 A: hammadde başlıkları", () => {
  it("AC-1: iki ayrı hammaddeden kesilen parçalar her hammadde için ayrı başlık ve ayrı tablo", () => {
    const g = gruplar(h, "Alfa Çelik");
    expect(g.map(x => x.baslik)).toEqual(["304 Çubuk", "EUR pirinç", "Fiyatsız alüminyum", "Kursuz EUR çelik"]);
    expect(bolumHtml(h, "Alfa Çelik").match(/<table>/g)).toHaveLength(4);
    expect(adlar(g[1].tablo)).toEqual(["Pirinç burç", "Pirinç pim", "İki paralı"]);
  });
  it("AC-1: grup tabloları alt alta hizalı (sabit sütun genişliği, iki nüshada toplam %100; yalnız tedarikçi bölümleri)", () => {
    for (const f of [false, true]) {
      const st = GRUP_TABLO_STILI(f);
      expect(st).toContain(".siparis-bolum table{table-layout:fixed;}");
      const w = [...st.matchAll(/width:(\d+)%/g)].map(m => Number(m[1]));
      expect(w).toHaveLength(f ? 4 : 3); expect(w.reduce((a, b) => a + b, 0)).toBe(100);
      expect(html(r, { fiyatli: f })).toContain(st);
    }
  });
  it("AC-2: başlık yalnız hammaddenin adı (sayı, ölçü, tutar yok)", () => {
    for (const ad of ["Alfa Çelik", "Beta Plastik", "Gama Boru"]) {
      for (const { baslik } of gruplar(fli, ad)) expect(bolum(r, ad).gruplar.map(x => x.baslik)).toContain(baslik);
    }
    expect(bolum(r, "Gama Boru").gruplar.map(g => g.baslik)).toEqual(["Bantlı fiyatsız", "Boru 304", "St37 mil"]);
  });
  it("AC-3: başlıklar Türkçe alfabe sırasıyla (İ, Ç, Ş harfleri doğru yerde)", () => {
    const ek = [
      { id: 60, ad: "Ç parça", maliyetKalemleri: [mk({ malzemeId: 601, bicim: "mil", cap: 10, boy: 10 })] },
      { id: 61, ad: "C parça", maliyetKalemleri: [mk({ malzemeId: 602, bicim: "mil", cap: 10, boy: 10 })] },
      { id: 62, ad: "D parça", maliyetKalemleri: [mk({ malzemeId: 603, bicim: "mil", cap: 10, boy: 10 })] },
    ];
    const malz = [{ id: 601, ad: "Çelik", ozgulAgirlik: 7.85, kiloFiyati: 1, tedarikciId: 14 }, { id: 602, ad: "Cıvata çeliği", ozgulAgirlik: 7.85, kiloFiyati: 1, tedarikciId: 14 },
      { id: 603, ad: "Dökme", ozgulAgirlik: 7.85, kiloFiyati: 1, tedarikciId: 14 }];
    const d = ekle(ek, {}, { malzemeler: [...veri().malzemeler, ...malz] });
    const basliklar = bolum(d, "Delta Hırdavat").gruplar.map(g => g.baslik);
    expect(basliklar.slice(0, 4)).toEqual(["Cıvata çeliği", "Çelik", "Dökme", "Tedarikçisiz bronz"]);
    expect(gruplar(html(d), "Delta Hırdavat").map(g => g.baslik)).toEqual(basliklar);
  });
  it("AC-4: başlık altındaki sıra bugünkü kural (önce kesit, sonra parça adı)", () => {
    expect(adlar(gruplar(h, "Gama Boru")[2].tablo)).toEqual(["Boy mil", "Kısa çubuk", "Uzun çubuk", "Tek çubuk"]);
    const a = adlar(gruplar(h, "Alfa Çelik")[0].tablo);
    expect(a.indexOf("İnce mil")).toBeLessThan(a.indexOf("İnce pul")); // aynı kesit (Ø16): ada göre
    expect(a.indexOf("İnce pul")).toBeLessThan(a.indexOf("Kalın mil")); // Ø16 < Ø62
  });
  it("AC-5: aynı hammadde altında aynı ölçülü iki parça iki satır, adetler toplanmaz", () => {
    const d = ekle([{ id: 63, ad: "İnce pul eş", maliyetKalemleri: [mk({ malzemeId: 501, bicim: "mil", cap: 16, boy: 12 })] }]);
    const t = gruplar(html(d), "Alfa Çelik")[0].tablo;
    const s = satirlar(t).filter(x => ["İnce pul", "İnce pul eş"].includes(satirAdi(x)));
    expect(s.map(x => [satirAdi(x), x[1], x[2]])).toEqual([["İnce pul", "Ø16 × 12 mm", "70"], ["İnce pul eş", "Ø16 × 12 mm", "70"]]);
  });
  it("AC-6: iki hammaddeli parça iki başlık altında birer kez, yalnız o hammaddenin ölçüsü ve tam sipariş adedi", () => {
    const g = gruplar(h, "Alfa Çelik");
    const bul = (t) => satirlar(t).filter(x => satirAdi(x) === "İki paralı").map(x => [x[1], x[2]]);
    expect(bul(g[0].tablo)).toEqual([["Ø22 × 40 mm", "70"]]);
    expect(bul(g[1].tablo)).toEqual([["Ø22 × 40 mm", "70"]]);
    expect(bul(g[2].tablo).concat(bul(g[3].tablo))).toEqual([]);
    const satir = bolum(r, "Alfa Çelik").satirlar.filter(x => x.ad === "İki paralı");
    expect(satir.map(x => x.olculer.map(o => o.malzemeAd))).toEqual([["304 Çubuk"], ["EUR pirinç"]]);
  });
});

describe("Spec 0147 B: hazır ve çözülemeyen parçalar", () => {
  it("AC-7: hazır parçalar sonda, 'Hazır parçalar' başlığı altında, kit sırasıyla", () => {
    const g = gruplar(h, "Delta Hırdavat");
    expect(g.at(-1).baslik).toBe(S.HAZIR_PARCALAR_BASLIGI);
    expect(S.HAZIR_PARCALAR_BASLIGI).toBe("Hazır parçalar");
    expect(adlar(g.at(-1).tablo)).toEqual(["Elle", "Maliyetsiz hazır"]); // kit sırası: 9, 33
  });
  it("AC-8: hazır parçası olmayan bölümde başlık ve tablosu yok", () => {
    for (const ad of ["Alfa Çelik", "Beta Plastik", "Gama Boru"]) expect(bolumHtml(h, ad)).not.toContain(S.HAZIR_PARCALAR_BASLIGI);
  });
  it("AC-9: yalnız hazır parçalı bölümde yalnız o başlık", () => {
    const parts = PARCALAR.filter(p => [9, 1].includes(p.id)).concat({ id: 33, ad: "Maliyetsiz hazır", tedarikciId: 14 });
    const d = S.siparisIhtiyaci(veri({ parts, modeller: kit(parts) }), { tedarikciOdakli: true });
    expect(bolum(d, "Delta Hırdavat").gruplar.map(g => g.tur)).toEqual([S.GRUP_TURU.HAZIR]);
    expect(gruplar(html(d), "Delta Hırdavat").map(g => g.baslik)).toEqual([S.HAZIR_PARCALAR_BASLIGI]);
  });
  it("AC-10: malzemesi çözülemeyen parça 'Malzemesi belirtilmemiş' altında, hammaddelerden sonra hazırdan önce", () => {
    expect(S.MALZEMESI_BELIRTILMEMIS_BASLIGI).toBe("Malzemesi belirtilmemiş");
    const g = gruplar(h, "Delta Hırdavat");
    expect(g.map(x => x.baslik)).toEqual(["Tedarikçisiz bronz", S.MALZEMESI_BELIRTILMEMIS_BASLIGI, S.HAZIR_PARCALAR_BASLIGI]);
    expect(adlar(g[1].tablo)).toEqual(["Çöpteki malzemeli"]);
  });
  it("AC-11: hammadde başlığı sayfa sonu açmaz; sayfa sonu bölüm sayısının bir eksiği kadar", () => {
    expect((h.match(/page-break-before:always/g) || []).length).toBe(r.tedarikciBolumleri.belge.length - 1);
    for (const ad of ["Alfa Çelik", "Delta Hırdavat"]) expect(bolumHtml(h, ad).match(/page-break-before/g) || []).toHaveLength(ad === "Alfa Çelik" ? 0 : 1);
  });
  it("AC-12: sipariş farkı, kapalı kesit uyarısı ve elle notu grupların altında bir kez", () => {
    const d = html(calis("duzenleme"));
    const a = bolumHtml(d, "Alfa Çelik");
    const sonTablo = a.lastIndexOf("</table>");
    for (const metin of [S.SIPARIS_FARK_BASLIGI, ELLE_NOTU.replace(/"/g, "&quot;")]) {
      expect(a.split(metin).length - 1, metin).toBe(1); expect(a.indexOf(metin)).toBeGreaterThan(sonTablo);
    }
    const b = bolumHtml(d, "Beta Plastik"); const uyari = S.KESIT_KAPALI_UYARISI.replace(/"/g, "&quot;");
    expect(b.split(uyari).length - 1).toBe(1); expect(b.indexOf(uyari)).toBeGreaterThan(b.lastIndexOf("</table>"));
  });
});

describe("Spec 0147 C: ölçü birimi", () => {
  it("AC-13: ölçü metni sonuna mm yazar", () => {
    expect(S.olcuMetni("mil", [30], 40)).toBe("Ø30 × 40 mm");
    expect(S.olcuMetni("boru", [19, 2], 173)).toBe("Ø19 × 2 et × 173 mm");
    expect(S.olcuMetni("lama", [30, 60], 130)).toBe("30 × 60 × 130 mm");
    expect(S.olcuMetni("sac", [30, 60], 130)).toBe("30 × 60 × 130 mm");
  });
  it("AC-14: kalem adedi birden büyükken mm 'parça başına' ibaresinin önünde", () => {
    expect(S.olcuMetni("mil", [30], 40, 2)).toBe("Ø30 × 40 mm · parça başına 2");
    expect(satirlar(gruplar(h, "Alfa Çelik")[0].tablo).find(x => satirAdi(x) === "Lama")[1]).toBe("10 × 20 × 125 mm · parça başına 2");
  });
  it("AC-15: ölçüsü girilmemiş kalemde hücre boş (mm de yok), ibare adın altında", () => {
    const x = satirlar(gruplar(h, "Alfa Çelik")[0].tablo).find(y => satirAdi(y) === "Boyu eksik");
    expect(x[1]).toBe(""); expect(x[0]).toContain(S.OLCU_GIRILMEMIS);
    expect(bolum(r, "Alfa Çelik").satirlar.find(y => y.ad === "Boyu eksik").olculer.map(o => o.metin)).toEqual([""]);
  });
  it("AC-17: sipariş farkı satırı ve çubuk eki kesit metnini değiştirmez", () => {
    expect(S.siparisFarkMetni({ malzemeAd: "Kestamid", kesitMetni: S.kesitSatirMetni("mil", [30], 400), boydanSiparis: true, tamKg: 1, boyAdedi: 7 }))
      .toBe("Kestamid · Ø30 · 400 mm çubuk: 7 boy sipariş edilir");
    expect(S.kesitMetni("mil", [30])).toBe("Ø30"); expect(S.kesitMetni("boru", [19, 2])).toBe("Ø19 × 2 et");
    const d = html(calis("odakli"));
    expect(d).not.toMatch(/mm mm/);
  });
});

describe("Spec 0147 D: fiyatlı nüsha", () => {
  it("AC-18: bölünen parçanın her satırı yalnız o hammaddeye düşen tutarı yazar", () => {
    const [a, b] = bolum(r, "Alfa Çelik").satirlar.filter(x => x.ad === "İki paralı");
    expect(a.parcaTutarlari).toEqual([{ pb: "USD", k: a.malzemeSatirlari[0].tutarK }]);
    expect(b.parcaTutarlari).toEqual([{ pb: "EUR", k: b.malzemeSatirlari[0].tutarK }]);
  });
  it("AC-19: biri USD öteki TL fiyatlı parçada her satır kendi para birimi; tanınmayan para birimi tutara girmez ve satırda neden", () => {
    const d = ekle([
      { id: 64, ad: "USD-TL parça", maliyetKalemleri: [mk({ malzemeId: 501, bicim: "mil", cap: 18, boy: 20 }), mk({ malzemeId: 502, bicim: "sac", kalinlik: 5, en: 20, boy: 20 })] },
      { id: 65, ad: "USD-GBP parça", tedarikciId: 11, maliyetKalemleri: [mk({ malzemeId: 501, bicim: "mil", cap: 18, boy: 30 }), mk({ malzemeId: 508, bicim: "mil", cap: 18, boy: 30 })] },
    ]);
    expect(bolum(d, "Alfa Çelik").satirlar.find(x => x.ad === "USD-TL parça").parcaTutarlari.map(t => t.pb)).toEqual(["USD"]);
    expect(bolum(d, "Beta Plastik").satirlar.find(x => x.ad === "USD-TL parça").parcaTutarlari.map(t => t.pb)).toEqual(["TRY"]);
    const gbp = bolum(d, "Beta Plastik").satirlar.find(x => x.ad === "USD-GBP parça");
    expect(gbp.parcaTutarlari).toEqual([]); expect(gbp.tutarNeden).toBeTruthy();
    const usd = bolum(d, "Alfa Çelik").satirlar.find(x => x.ad === "USD-GBP parça");
    expect(usd.parcaTutarlari.map(t => t.pb)).toEqual(["USD"]); expect(usd.tutarNeden).toBeNull();
    const h2 = html(d, { fiyatli: true });
    const gbpHucre = satirlar(gruplar(h2, "Beta Plastik").find(g => g.baslik === "GBP çelik").tablo).find(x => satirAdi(x) === "USD-GBP parça")[3];
    expect(gbpHucre).toContain(gbp.tutarNeden);
  });
  it("AC-20: bölüm toplamı, kapsam cümlesi ve TL karşılığı bölünmeden önceki rakamla aynı (spec öncesi altın)", () => {
    const altin = JSON.parse(fs.readFileSync("tests/fixtures/0147-toplam-once.json", "utf8"));
    for (const [ad, [v, s, o]] of Object.entries(SENARYOLAR())) {
      const d = S.siparisIhtiyaci(v, s);
      expect(d.tedarikciBolumleri.belge.map(b => ({ ad: b.ad, toplamlar: b.toplamlar, toplamTLK: b.toplamTLK, dovizVar: b.dovizVar, hataSayisi: b.hataSayisi, kapaliKesitVar: !!b.kapaliKesitVar })), ad)
        .toEqual(altin[ad].bolumler);
      expect(html(d, { fiyatli: true, ...o }).match(/<div data-bolum-toplami[\s\S]*?<\/div>/g), ad).toEqual(altin[ad].dip);
    }
    expect(fli).toContain(S.TOPLAM_KAPSAM_CUMLESI);
  });
  it("AC-21: bölünmüş satırlar sayaca ayrı girer; çözülen hammaddenin satırı tam ve nedensiz", () => {
    const once = bolum(r, "Alfa Çelik").tutarsizSayi;
    const d = ekle([{ id: 66, ad: "Yarı fiyatlı", maliyetKalemleri: [mk({ malzemeId: 501, bicim: "mil", cap: 18, boy: 20 }), mk({ malzemeId: 507, bicim: "mil", cap: 18, boy: 20 })] }]);
    const xs = bolum(d, "Alfa Çelik").satirlar.filter(x => x.ad === "Yarı fiyatlı");
    expect(xs).toHaveLength(2);
    const tam = xs.find(x => x.olculer[0].malzemeAd === "304 Çubuk"); const eksik = xs.find(x => x.olculer[0].malzemeAd === "Fiyatsız alüminyum");
    expect(tam.parcaTutarlari).toHaveLength(1); expect(tam.tutarNeden).toBeNull();
    expect(eksik.parcaTutarlari).toEqual([]); expect(eksik.tutarNeden).toBeTruthy();
    expect(bolum(d, "Alfa Çelik").tutarsizSayi).toBe(once + 1);
  });
  it("AC-22: boydan hammaddenin bölünmüş satırında yalnız o hammaddenin boyu", () => {
    const d = ekle([{ id: 67, ad: "Boru ve çubuk", maliyetKalemleri: [mk({ malzemeId: 504, bicim: "mil", cap: 30, boy: 200, boydanSiparis: true, cubukBoyu: 400 }),
      mk({ malzemeId: 503, bicim: "boru", cap: 19, et: 1.5, boy: 50 })] }]);
    const g = gruplar(html(d), "Gama Boru");
    const st = satirlar(g.find(x => x.baslik === "St37 mil").tablo).find(x => satirAdi(x) === "Boru ve çubuk");
    const boru = satirlar(g.find(x => x.baslik === "Boru 304").tablo).find(x => satirAdi(x) === "Boru ve çubuk");
    expect(st[2]).toMatch(/boy \(400 mm\)/); expect(st[2]).toContain("70 parça");
    expect(boru[2]).not.toContain("boy ("); expect(boru[2]).toBe("70");
  });
});

describe("Spec 0147 E: değişmeyenler", () => {
  it("AC-23: tek hammaddeli tek tedarikçili veride yalnız başlık satırı ve mm farkı", () => {
    const parts = PARCALAR.filter(p => [2, 3].includes(p.id));
    const d = S.siparisIhtiyaci(veri({ parts, modeller: kit(parts) }), { tedarikciOdakli: true });
    const b = d.tedarikciBolumleri.belge;
    expect(b.map(x => x.ad)).toEqual(["Alfa Çelik"]);
    expect(b[0].gruplar.map(g => g.baslik)).toEqual(["304 Çubuk"]);
    const t = gruplar(html(d), "Alfa Çelik");
    expect(t).toHaveLength(1);
    // Spec 0158 ile (R16, R17): kalem adedi 3 olan "İnce mil" kesilecek adedi (140 × 3) yazar, altında hesabın açıklaması.
    const duz = (c) => c.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    expect(satirlar(t[0].tablo).map(x => [satirAdi(x), x[1].replace(/ mm(?= ·|$)/, ""), duz(x[2])])).toEqual([["İnce mil", "Ø16 × 235 · parça başına 3", "420 140 parça × 3"], ["Yatak", "Ø144 × 78", "70"]]);
  });
  it("AC-24: basılacak satırı olmayan bölüm basılmaz", () => {
    const d = calis("odakli");
    const kapali = Object.fromEntries(bolum(d, "Beta Plastik").satirlar.map(x => [x.partId, { kapali: true }]));
    const e = S.siparisIhtiyaci(veri(), { tedarikciOdakli: true, duzenleme: { parca: kapali, kesit: {} } });
    expect(bolumHtml(html(e), "Beta Plastik")).toBe("");
  });
  it("AC-25: hatalı adetli parça bulunan bölüm belgeyi kilitler (bölünmüş parçada da)", () => {
    const e = S.siparisIhtiyaci(veri(), { tedarikciOdakli: true, duzenleme: { parca: { 30: { adet: "x" } }, kesit: {} } });
    expect(bolum(e, "Alfa Çelik").hataSayisi).toBe(1);
    expect(belgeDurumu(e, { hata: "H", bos: "B" }).neden).toBe("H");
    expect(belgeDurumu(calis("odakli"), { hata: "H", bos: "B" })).toEqual({ etkin: true, neden: null });
  });
  it("pencerenin bölümlemesi değişmez (C2): bölünmüş parça pencerede Ana tedarikçisinde tek satır", () => {
    const d = ekle([{ id: 68, ad: "Anası Beta", tedarikciId: 12, maliyetKalemleri: [mk({ malzemeId: 501, bicim: "mil", cap: 18, boy: 20 }), mk({ malzemeId: 509, bicim: "mil", cap: 18, boy: 20 })] }]);
    const pen = d.tedarikciBolumleri.bolumler.flatMap(b => b.hazirParcalar.filter(x => x.ad === "Anası Beta").map(x => b.ad));
    expect(pen).toEqual(["Beta Plastik"]);
    expect(bolum(d, "Alfa Çelik").satirlar.filter(x => x.ad === "Anası Beta")).toHaveLength(2);
  });
});

describe("Spec 0147 taramalar (C1, C4)", () => {
  const belge = kodSatirlari("src/lib/siparisRaporu.js");
  it("C1: belge kurucusu gruplamaz, sıralamaz, aritmetik yapmaz", () => {
    expect(belge).not.toMatch(/\.sort\(|localeCompare|reduce\(/);
    expect(belge).not.toMatch(/malzemeId/);
    expect(belge).toMatch(/b\.gruplar/);
  });
  it("C4: ölçü metni tek yerde; belge ve pencere 'mm' yazmaz", () => {
    expect(belge).not.toMatch(/" mm|mm"|`[^`]* mm`/);
    const pencere = kodSatirlari("src/components/stock/SiparisPenceresi.jsx");
    expect(pencere).not.toMatch(/ mm["`]/);
    const motor = kodSatirlari("src/lib/siparisIhtiyaci.js");
    expect((motor.match(/× \$\{sayiHane\.format\(boy\)\} mm/g) || [])).toHaveLength(1);
  });
  it("K (kesit anahtarı) fikstürü kullanılabilir", () => { expect(K.cubuk30).toBe("504|boy|400|mil|30"); });
});
