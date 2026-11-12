// Spec 0144 A, B (motor) ve taramalar: parça payı, malzeme satırları ve fiyatlı nüshanın tutarları motorda (C1); yeni alanlar yalnız
// `tedarikciBolumleri.belge` satırlarında (C2/2). Veri `fixtures/0144-veri.js`.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import * as S from "../src/lib/siparisIhtiyaci";
import * as M from "../src/lib/malzeme";
import { veri, SENARYOLAR, K, PARCALAR, MALZEMELER } from "./fixtures/0144-veri.js";

const calis = (ad) => { const [v, sec] = SENARYOLAR()[ad]; return S.siparisIhtiyaci(v, sec); };
const bolum = (r, ad) => r.tedarikciBolumleri.belge.find(b => b.ad === ad);
const satir = (r, b, ad) => bolum(r, b).satirlar.find(x => x.ad === ad);
const toplam = (r, b, anahtar) => bolum(r, b).toplam.find(k => k.anahtar === anahtar);
const kesit = (r, anahtar) => r.kesitler.find(k => k.anahtar === anahtar);
const e = (r, b, ad, i = 0) => satir(r, b, ad).malzemeSatirlari[i];
const yakin = (a, b) => expect(Math.abs(a - b)).toBeLessThan(1e-9);
const kodSatirlari = (dosya) => fs.readFileSync(dosya, "utf8").split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).map(l => l.replace(/\s\/\/.*$/, "")).join("\n");

describe("Spec 0144 A: parça payı (motor)", () => {
  const r = calis("odakli");
  it("AC-1: kesidi tek parça kullanıyorsa pay toplam satırının miktarı (kilo ve boy)", () => {
    const lama = e(r, "Alfa Çelik", "Lama");
    expect(lama.tek).toBe(true); expect(lama.payKg).toBe(toplam(r, "Alfa Çelik", lama.anahtar).siparisKg);
    const tekCubuk = e(r, "Gama Boru", "Tek çubuk");
    expect(tekCubuk.kesirliBoy).toBe(toplam(r, "Gama Boru", K.cubuk40).boyAdedi); expect(tekCubuk.kesirliBoy).toBe(21);
    expect(tekCubuk.payKg).toBe(toplam(r, "Gama Boru", K.cubuk40).siparisKg);
  });
  it("AC-2 / C3 çapraz: paylaşılan kilo kesidinde payların toplamı toplamın kilosuna eşit (asgari yokken)", () => {
    const a = e(r, "Alfa Çelik", "İnce mil"); const b = e(r, "Alfa Çelik", "İnce pul");
    expect(a.tek).toBe(false); expect(b.tek).toBe(false);
    yakin(a.payKg + b.payKg, toplam(r, "Alfa Çelik", K.ince).siparisKg);
    yakin(e(r, "Alfa Çelik", "Kalın mil").payKg + e(r, "Alfa Çelik", "Aynı kesit farklı boy").payKg, toplam(r, "Alfa Çelik", K.kalin).siparisKg);
  });
  it("AC-3: paylaşılan boy kesidinde kesirli boy ve karşılığı kilogram", () => {
    const u = e(r, "Gama Boru", "Uzun çubuk"); const k = e(r, "Gama Boru", "Kısa çubuk");
    expect(u.kesirliBoy).toBe(26.25); expect(k.kesirliBoy).toBe(17.5);
    expect(S.payMiktarMetni(u)).toBe(`26,25 boy · ${S.kgMetni(u.payKg)}`);
    expect(toplam(r, "Gama Boru", K.cubuk30).boyAdedi).toBe(44);
  });
  it("AC-4 / C3 çapraz: boy yolunda payın kilosu kesirli boy × tam çubuk ağırlığı, fire yok", () => {
    const u = e(r, "Gama Boru", "Uzun çubuk"); const t = toplam(r, "Gama Boru", K.cubuk30);
    yakin(u.payKg, u.kesirliBoy * t.tamKg);
    const g = kesit(r, K.cubuk30).parcalar.find(p => p.partId === "24");
    expect(g.fireliKg).toBeGreaterThan(g.hamKg); // malzemenin firesi var
    expect(u.payKg).toBeLessThan(g.adet * g.fireliKg * (u.kesirliBoy * 400 / (g.adet * 150))); // fire eklenmedi
  });
  it("AC-5: kilo yolunda pay fire dâhil (Σ adet × fireliKg)", () => {
    const a = e(r, "Alfa Çelik", "İnce mil");
    const gir = kesit(r, K.ince).parcalar.filter(p => p.partId === "2");
    yakin(a.payKg, gir.reduce((t, p) => t + p.adet * p.fireliKg, 0));
    expect(a.payKg).toBeGreaterThan(gir.reduce((t, p) => t + p.adet * p.hamKg, 0));
  });
  it("AC-6: asgari sipariş toplamı büyütünce paylar büyümez", () => {
    const t = toplam(r, "Alfa Çelik", K.pirinc);
    expect(t.siparisKg).toBe(50);
    expect(e(r, "Alfa Çelik", "Pirinç burç").payKg + e(r, "Alfa Çelik", "Pirinç pim").payKg).toBeLessThan(5);
  });
  it("AC-7: elle değer; paylaşılan kesitte paylar hesaplanan, tek parçalıda parçanın altı elle değer", () => {
    const d = calis("duzenleme");
    expect(toplam(d, "Alfa Çelik", K.ince).siparisKg).toBe(50);
    expect(e(d, "Alfa Çelik", "İnce mil").payKg).toBeGreaterThan(100); expect(e(d, "Alfa Çelik", "İnce mil").elle).toBe(false);
    const y = e(d, "Alfa Çelik", "Yatak"); expect(y.payKg).toBe(100); expect(y.elle).toBe(true);
  });
  it("AC-8 / AC-9 / AC-52 (motor) / A-R6/3: fark yalnız toplam paylardan büyükken; eşik 0,001 kg", () => {
    expect(S.PAY_FARK_ESIGI_KG).toBe(0.001);
    expect(bolum(r, "Alfa Çelik").payFarkVar).toBe(true); // pirinç asgari
    expect(bolum(r, "Beta Plastik").payFarkVar).toBe(false);
    const d = calis("duzenleme"); // elle 50 kg paylardan küçük: o satır not doğurmaz, fark yine yalnız pirinçten
    yakin(bolum(d, "Alfa Çelik").payFarkKg, bolum(r, "Alfa Çelik").payFarkKg);
    const pay = e(r, "Alfa Çelik", "Pirinç burç").payKg + e(r, "Alfa Çelik", "Pirinç pim").payKg;
    const ile = (asgari) => S.siparisIhtiyaci(veri({ malzemeler: MALZEMELER.map(m => (m.id === 509 ? { ...m, asgariSiparis: asgari } : m)),
      parts: PARCALAR.filter(p => p.id !== 30) }), { tedarikciOdakli: true });
    expect(bolum(ile(pay + 0.0005), "Alfa Çelik").payFarkVar).toBe(false);
    expect(bolum(ile(pay + 0.002), "Alfa Çelik").payFarkVar).toBe(true);
  });
  it("AC-10: bütün parçaları kapatılmış kesit yalnız toplamda", () => {
    const d = S.siparisIhtiyaci(veri(), { tedarikciOdakli: true, duzenleme: { parca: { 12: { kapali: true } }, kesit: { "501|kilo||mil|25.5": { deger: "10" } } } });
    expect(toplam(d, "Alfa Çelik", "501|kilo||mil|25.5").siparisKg).toBe(10);
    for (const b of d.tedarikciBolumleri.belge) for (const x of b.satirlar) expect(x.malzemeSatirlari.some(m => m.anahtar === "501|kilo||mil|25.5")).toBe(false);
  });
  it("AC-11: hazır parçada malzeme satırı yok", () => { expect(satir(r, "Delta Hırdavat", "Elle").malzemeSatirlari).toEqual([]); });
  it("AC-13: iki firmalı parça her bölümde yalnız o firmanın satırıyla", () => {
    expect(satir(r, "Alfa Çelik", "Çift malzemeli").malzemeSatirlari.map(m => m.malzemeAd)).toEqual(["304 Çubuk"]);
    expect(satir(r, "Beta Plastik", "Çift malzemeli").malzemeSatirlari.map(m => m.malzemeAd)).toEqual(["Delrin levha"]);
  });
  it("AC-14 / AC-47 / AC-48: aynı parçanın aynı kesitteki kalemleri tek satırda, adetleri toplanmış", () => {
    const ay = satir(r, "Alfa Çelik", "Aynı ölçülü").malzemeSatirlari;
    expect(ay).toHaveLength(1); expect(ay[0].tek).toBe(true);
    expect(ay[0].payKg).toBe(toplam(r, "Alfa Çelik", ay[0].anahtar).siparisKg); // AC-48: toplamın rakamı bir kez
    expect(kesit(r, ay[0].anahtar).parcalar.reduce((t, p) => t + p.adet, 0)).toBe(140);
    // AC-48 (mutasyonla ölçüldü): iki farklı boylu kalemle tek parça kullanan kesit; giriş iki, farklı parça bir → toplamın rakamı.
    const parts = [...PARCALAR, { id: 41, ad: "İki boylu", maliyetKalemleri: [{ tur: "malzeme", adet: 1, malzemeId: 501, bicim: "mil", cap: 33, boy: 10 }, { tur: "malzeme", adet: 1, malzemeId: 501, bicim: "mil", cap: 33, boy: 25 }] }];
    const d = S.siparisIhtiyaci(veri({ parts, modeller: [{ model: "AK100_DS", defaultParcalar: parts.map(p => ({ partId: String(p.id), miktar: 1 })) }] }), { tedarikciOdakli: true });
    const ib = satir(d, "Alfa Çelik", "İki boylu").malzemeSatirlari;
    expect(kesit(d, ib[0].anahtar).parcalar).toHaveLength(2);
    expect(ib).toHaveLength(1); expect(ib[0].tek).toBe(true); expect(ib[0].payKg).toBe(toplam(d, "Alfa Çelik", ib[0].anahtar).siparisKg);
    const fb = satir(r, "Alfa Çelik", "Aynı kesit farklı boy").malzemeSatirlari;
    expect(fb).toHaveLength(1);
    yakin(fb[0].payKg, kesit(r, K.kalin).parcalar.filter(p => p.partId === "13").reduce((t, p) => t + p.adet * p.fireliKg, 0));
  });
  it("AC-54: tedarikçisiz malzeme payla, toplama ve farka girmez", () => {
    const b = e(r, "Delta Hırdavat", "Bronz burç");
    expect(b.tedarikcisiz).toBe(true); expect(b.payKg).toBeGreaterThan(0);
    expect(bolum(r, "Delta Hırdavat").toplam).toEqual([]); expect(bolum(r, "Delta Hırdavat").payFarkKg).toBe(0);
  });
  it("AC-53 (motor) / A-R9/3: kapalı kesitin satırı miktarsız ve tutarsız; sayaca girmez", () => {
    const d = calis("duzenleme");
    const c = e(d, "Beta Plastik", "Çift malzemeli");
    expect(c.kapali).toBe(true); expect(c.payKg).toBeNull(); expect(c.tutarK).toBeNull(); expect(S.payMiktarMetni(c)).toBe("");
    expect(bolum(d, "Beta Plastik").kapaliKesitVar).toBe(true);
    expect(bolum(d, "Beta Plastik").tutarsizSayi).toBe(1); // yalnız GBP
  });
  it("AC-56: payı olmayan satır malzeme adı dizisinden", () => {
    const x = satir(r, "Alfa Çelik", "Boyu eksik");
    expect(x.malzemeSatirlari).toEqual([{ malzemeAd: x.malzemeAdlari[0], payYok: true }]);
  });
  it("AC-57: malzeme satırları kalem sırasıyla", () => {
    expect(satir(r, "Alfa Çelik", "İki paralı").malzemeSatirlari.map(m => m.malzemeAd)).toEqual(["304 Çubuk", "EUR pirinç"]);
  });
});

describe("Spec 0144 B: tutarlar (motor)", () => {
  const r = calis("odakli");
  it("AC-23 / AC-68 / AC-22: birim fiyat ham çapın bandından; bant fiyatsızsa kilo fiyatı", () => {
    expect(e(r, "Alfa Çelik", "Yatak").fiyat).toBe(2.95); expect(e(r, "Alfa Çelik", "İnce mil").fiyat).toBe(2.85);
    expect(e(r, "Gama Boru", "Bantlı parça").fiyat).toBe(3.5);
  });
  it("AC-24 / AC-25: satır tutarı miktar × birim fiyat; toplam satırı motorun tutarı", () => {
    const a = e(r, "Alfa Çelik", "İnce mil");
    expect(a.tutarK).toBe(Math.round(a.payKg * a.fiyat * 100));
    const t = toplam(r, "Alfa Çelik", K.ince); expect(t.tutarK).toBe(Math.round(Number((t.siparisKg * t.fiyat * 100).toFixed(6))));
  });
  it("AC-26 / AC-61: parça satırının tutarı malzeme satırlarının para birimi başına toplamı", () => {
    expect(satir(r, "Alfa Çelik", "İnce mil").parcaTutarlari).toEqual([{ pb: "USD", k: e(r, "Alfa Çelik", "İnce mil").tutarK }]);
    expect(satir(r, "Alfa Çelik", "İki paralı").parcaTutarlari.map(t => t.pb)).toEqual(["USD", "EUR"]);
  });
  it("AC-62: bir satırın tutarı yoksa çözülen satırların toplamı", () => {
    const parts = [...PARCALAR, { id: 40, ad: "Yarım fiyatlı", maliyetKalemleri: [{ tur: "malzeme", adet: 1, malzemeId: 507, bicim: "mil", cap: 33, boy: 10 }, { tur: "malzeme", adet: 1, malzemeId: 501, bicim: "mil", cap: 33, boy: 10 }] }];
    const v = veri({ parts, modeller: [{ model: "AK100_DS", defaultParcalar: parts.map(p => ({ partId: String(p.id), miktar: 1 })) }] });
    const d = S.siparisIhtiyaci(v, { tedarikciOdakli: true });
    const x = satir(d, "Alfa Çelik", "Yarım fiyatlı");
    expect(x.malzemeSatirlari.map(m => m.tutarK == null)).toEqual([true, false]);
    expect(x.parcaTutarlari).toEqual([{ pb: "USD", k: x.malzemeSatirlari[1].tutarK }]);
  });
  it("Triyaj bulgu 2 / B-R5/7: pay taşıyan satırın yanında ölçüsüz kalem parça satırına neden yazar ve sayaca girer", () => {
    const parts = [...PARCALAR, { id: 42, ad: "Yarım ölçülü", maliyetKalemleri: [{ tur: "malzeme", adet: 1, malzemeId: 501, bicim: "mil", cap: 34, boy: 10 }, { tur: "malzeme", adet: 1, malzemeId: 509, bicim: "mil", cap: 34 }] }];
    const v = veri({ parts, modeller: [{ model: "AK100_DS", defaultParcalar: parts.map(p => ({ partId: String(p.id), miktar: 1 })) }] });
    const once = bolum(S.siparisIhtiyaci(veri({ modeller: v.modeller, parts: PARCALAR }), { tedarikciOdakli: true }), "Alfa Çelik").tutarsizSayi;
    const d = S.siparisIhtiyaci(v, { tedarikciOdakli: true });
    const x = satir(d, "Alfa Çelik", "Yarım ölçülü");
    expect(x.parcaTutarlari).toHaveLength(1); expect(x.tutarNeden).toBe(S.KALEM_TUTARA_GIRMEDI);
    // Ölçüsüz kalemin kendi satırı ve tutarı yok; tutarsız sayısı ölçülü kalemin tutarsız toplam satırı olmadığı için yalnız bir artar.
    expect(bolum(d, "Alfa Çelik").tutarsizSayi).toBe(once + 1);
    expect(satir(r, "Alfa Çelik", "İnce mil").tutarNeden).toBeNull(); // payYok satırı olmayan parça neden almaz
  });
  it("AC-27 / AC-28: hazır parça maliyetle (TL), maliyetsizde neden", () => {
    const el = satir(r, "Delta Hırdavat", "Elle");
    expect(el.birimK).toBe(1500); expect(el.tutarK).toBe(1500 * el.siparis);
    expect(satir(r, "Delta Hırdavat", "Maliyetsiz hazır").tutarNeden).toBe(S.MALIYET_YOK);
  });
  it("AC-59 / AC-60: kalemi çözülemeyen malzemeli parça neden ve sayaç; maliyet birim fiyatı basılmaz", () => {
    const c = satir(r, "Delta Hırdavat", "Çöpteki malzemeli");
    expect(c.malzemeli).toBe(false); expect(c.malzemeKalemli).toBe(true);
    expect(c.birimK).toBeNull(); expect(c.tutarNeden).toBe(S.MALZEME_COZULEMEDI);
  });
  it("AC-29 / AC-30 / AC-58 / AC-72: bölüm toplamı toplam tablosu + hazır parçalar; paylar girmez; TL karşılığı", () => {
    const g = bolum(r, "Gama Boru");
    const pb = (p) => g.toplam.filter(k => k.paraBirimi === p && k.tutarK != null).reduce((t, k) => t + k.tutarK, 0);
    expect(g.toplamlar).toEqual([{ pb: "TRY", k: pb("TRY") }, { pb: "USD", k: pb("USD") }]);
    expect(g.toplamTLK).toBe(g.toplam.reduce((t, k) => t + k.tutarTLK, 0));
    expect(g.dovizVar).toBe(true);
    const d = bolum(r, "Delta Hırdavat");
    expect(d.toplamlar).toEqual([{ pb: "TRY", k: satir(r, "Delta Hırdavat", "Elle").tutarK }]); // bronz payı girmez
    expect(d.dovizVar).toBe(false);
  });
  it("AC-31 / AC-32 / AC-33 / AC-34 / AC-71: tutarsız satırlar nedenli ve sayılır (kesit + hazır + çözülemeyen)", () => {
    expect(e(r, "Alfa Çelik", "Fiyatsız parça").tutarNeden).toBe(S.NEDEN_FIYAT_YOK);
    expect(e(r, "Alfa Çelik", "Kursuz parça").tutarNeden).toBe(S.NEDEN_KUR_YOK);
    expect(e(r, "Beta Plastik", "GBP parça").tutarNeden).toBe(S.NEDEN_PARA_BIRIMI);
    expect(bolum(r, "Alfa Çelik").tutarsizSayi).toBe(3); // fiyatsız + kursuz kesit + ölçüsü eksik parça
    expect(bolum(r, "Delta Hırdavat").tutarsizSayi).toBe(2); // maliyetsiz hazır + çöpteki malzemeli
    expect(bolum(r, "Gama Boru").tutarsizSayi).toBe(0);
  });
});

describe("Spec 0144 kıyas ve taramalar", () => {
  const r = calis("odakli");
  it("AC-74 / C2/2: kesit satırları ve parcalar girişleri yeni alan almaz; pencerenin bölümleri değişmez", () => {
    expect(Object.keys(r.kesitler[0]).sort()).toEqual(["anahtar", "asgariFark", "bant", "bicim", "boyAdedi", "boyNeden", "boydanSiparis", "cubukBoyu",
      "fireKg", "fireUyarisi", "fiyat", "kesit", "kesitMetni", "kur", "malzemeAd", "malzemeId", "netKg", "paraBirimi", "parcalar", "siparisKg",
      "tamKg", "tedarikciId", "tutar", "tutarK", "tutarNeden", "tutarTLK"]);
    expect(Object.keys(r.kesitler[0].parcalar[0]).sort()).toEqual(["ad", "adet", "ekFireKg", "fire", "fireliKg", "hamKg", "kesimBoyu", "partId"]);
    for (const b of r.tedarikciBolumleri.bolumler) for (const x of b.hazirParcalar) expect(x).not.toHaveProperty("malzemeSatirlari");
  });
  it("AC-44 / AC-46: belge kurucusu ve pencere dosyalarında pay, tutar ya da eşleştirme aritmetiği yok", () => {
    for (const f of ["src/lib/siparisRaporu.js", "src/components/rapor/SiparisRaporuDugmesi.jsx", "src/components/rapor/NushaSecPenceresi.jsx", "src/components/stock/SiparisPenceresi.jsx"]) {
      const k = kodSatirlari(f).replace(/>[^<>{}]*</g, "><").replace(/"[^"\n]*"|'[^'\n]*'/g, '""').replace(/\/\*[\s\S]*?\*\//g, ""); // düz dizgiler (içe aktarma yolları) ve blok yorumlar sayılmaz // JSX metni ("Sipariş kg / boy" başlığı) aritmetik değildir
      expect(k, f).not.toMatch(/\breduce\(/); expect(k, f).not.toMatch(/[\w)\]]\s*\*\s*[\w(]/); expect(k, f).not.toMatch(/[\w)\]]\s*\/\s*[\w(]/); // triyaj (bulgu 4): boşluksuz yazım da
      expect(k, f).not.toMatch(/\bMath\./);
      // Eşleştirme yalnız belge dosyalarında yasak; pencere düzenlemeyi kesit anahtarıyla tutar (0140 D-R1, değişmedi).
      if (!f.includes("SiparisPenceresi")) expect(k, f).not.toMatch(/kesitMap|\.parcalar\b|\.anahtar\b/);
    }
  });
  it("AC-45 / AC-64 / C5: para metni tek yerden; belge kendi biçimini yazmaz; /kg eki tek yardımcıda", () => {
    const k = kodSatirlari("src/lib/siparisRaporu.js");
    for (const yasak of ["Intl.NumberFormat", "toLocaleString(", "toFixed", "fmtCur", "PARA_SIMGE", "ikiHane", "₺", "€", "/kg", "/adet"]) expect(k, yasak).not.toContain(yasak);
    for (const ad of ["pbTutarMetni", "pbToplamMetni", "tlMetni", "kiloFiyatMetni", "adetFiyatMetni"]) expect(k).toContain(ad);
    expect((kodSatirlari("src/lib/malzeme.js").match(/\/kg`/g) || []).length).toBe(1);
    expect(M.kiloFiyatMetni(2.8534, "USD")).toBe("2,8534 $/kg"); expect(M.kiloFiyatMetni(null, "USD")).toBe("");
    expect(S.adetFiyatMetni(1500)).toBe("15,00 ₺/adet");
    expect(S.pbToplamMetni([{ pb: "USD", k: 4453 }, { pb: "EUR", k: 11224 }])).toBe("44,53 $ + 112,24 €");
  });
  it("AC-73: soru penceresi rapor/ altında kendi sabitleriyle; yazdırma API'sini çağırmaz; durum sipariş penceresinde", () => {
    const p = kodSatirlari("src/components/rapor/NushaSecPenceresi.jsx");
    expect(p).not.toMatch(/printHtml|appPrint/);
    for (const ad of ["NUSHA_BASLIGI", "NUSHA_FIYATSIZ", "NUSHA_FIYATLI", "NUSHA_TESTID"]) expect(p).toContain(`export const ${ad}`);
    expect(p).toMatch(/maxWidth=\{300\}/);
    const sp = kodSatirlari("src/components/stock/SiparisPenceresi.jsx");
    expect(sp).toMatch(/useState\(false\)/); expect(sp).toMatch(/onClose=\{soruAcik \? NOOP : onClose\}/); expect(sp).toMatch(/const soruAcik = nushaSoru && belgeEtkin/); // triyaj bulgu 1
    expect(kodSatirlari("src/components/rapor/SiparisRaporuDugmesi.jsx")).not.toMatch(/useState/);
  });
});
