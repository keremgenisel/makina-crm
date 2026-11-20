// Spec 0144: belgenin parça altı malzeme satırları ve fiyatlı nüshası (`lib/siparisRaporu.js`). Veri `fixtures/0144-veri.js`.
import { describe, it, expect } from "vitest";
import * as S from "../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml, belgeSutunlari, BELGE_SUTUNLARI, TOPLAM_BASLIGI, MALZEME_ETIKETI, ELLE_NOTU, ELLE_ISARETI, PAY_FARK_NOTU, FIYATLI_NUSHA } from "../src/lib/siparisRaporu";
import { SENARYOLAR, BUGUN, FACTORY, PARCALAR, veri } from "./fixtures/0144-veri.js";

const calis = (ad) => { const [v, sec] = SENARYOLAR()[ad]; return S.siparisIhtiyaci(v, sec); };
const html = (r, o = {}) => siparisRaporuHtml(r, { bugun: BUGUN, factory: FACTORY, partiAd: "Güz", ...o });
const bolumHtml = (h, ad) => h.split('<div class="siparis-bolum"').find(p => p.includes(`${ad} · `)) || "";
const tablolar = (h) => [...h.matchAll(/<table>([\s\S]*?)<\/table>/g)].map(m => m[1]);
const basliklar = (t) => [...t.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map(m => m[1]);
const satirlar = (t) => [...t.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => c[1])).filter(r => r.length);
// Spec 0147 ile (R1): bölümde grup (hammadde) başına bir parça tablosu var; yardımcı bölümün bütün parça tablolarını sırasıyla birleştirir.
const parcaTablosu = (h, ad) => { const t = tablolar(bolumHtml(h, ad)).filter(x => basliklar(x)[0] === "Parça"); return t.length ? t.join("") : undefined; };
const toplamTablosu = (h, ad) => tablolar(bolumHtml(h, ad)).find(t => basliklar(t)[0] === "Malzeme");
const satirAdi = (r) => r[0].replace(/<div[\s\S]*$/, "");
// Spec 0147 ile (R4): iki hammaddeli parçanın bölünmüş satırlarının hepsi (grup sırasıyla).
const adliSatirlar = (h, b, ad) => satirlar(parcaTablosu(h, b)).filter(x => satirAdi(x) === ad);
const duz = (c) => c.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const altlar = (h, b, ad) => { const s = satirlar(parcaTablosu(h, b)); const i = s.findIndex(r => satirAdi(r) === ad); const out = []; for (let j = i + 1; j < s.length && !satirAdi(s[j]); j++) out.push(s[j]); return { r: s[i], alt: out }; };

const r = calis("odakli");
const fsz = html(r);
const fli = html(r, { fiyatli: true });

// 2026-11-15 isteğiyle 0144 A ters çevrildi: belgede parçanın altında malzeme satırı ve "Alınacak malzeme toplamı" tablosu yok (fiyatlı ve
// fiyatsız). Pay ve tutar motorda kalır (parça satırının tutarı ve bölüm toplamı onlardan); A'nın motor kriterleri siparis-0144'te.
describe("2026-11-15 isteğiyle: malzeme satırı ve malzeme toplamı basılmaz", () => {
  it("iki nüshada da `malzeme · ` satırı, toplam tablosu ve fark notu yok", () => {
    for (const h of [fsz, fli, html(calis("duzenleme")), html(calis("duzenleme"), { fiyatli: true })]) {
      expect(h).not.toContain(`${MALZEME_ETIKETI} · `); expect(h).not.toContain(TOPLAM_BASLIGI); expect(h).not.toContain(PAY_FARK_NOTU);
      expect(tablolar(h).filter(t => basliklar(t)[0] === "Malzeme")).toHaveLength(0);
    }
  });
  it("parça satırı ölçü ve sipariş adediyle kalır; ölçüsü girilmemiş ibaresi yerinde (AC-12)", () => {
    const s = satirlar(parcaTablosu(fsz, "Gama Boru"));
    expect(s.find(x => satirAdi(x) === "Boy mil").slice(1)).toEqual(["Ø30 × 400 mm", "70"]); // işaretsiz (kilo) kalem: parça adedi
    expect(s.every(x => satirAdi(x))).toBe(true); // alt satır yok
    expect(altlar(fsz, "Alfa Çelik", "Boyu eksik").r[0]).toContain(S.OLCU_GIRILMEMIS);
  });
  it("kapalı kesit uyarısı yerinde; elle notu yalnız parça adedi düzenlenince (AC-53)", () => {
    const d = html(calis("duzenleme"));
    expect(bolumHtml(d, "Beta Plastik")).toContain(S.KESIT_KAPALI_UYARISI.replace(/"/g, "&quot;"));
    const elle = ELLE_NOTU.replace(/"/g, "&quot;");
    expect(bolumHtml(d, "Alfa Çelik")).toContain(elle); // İnce mil adedi 100'e düzenlendi
    expect(bolumHtml(d, "Gama Boru")).not.toContain(elle); // Gama'da yalnız kesit elle değil, parça düzenlemesi yok
  });
  it("AC-54 (2026-11-15 isteğiyle): tedarikçisiz malzemeli parçanın tutarı parça satırında, altında toplama girmediği yazar", () => {
    const { r: p } = altlar(fli, "Delta Hırdavat", "Bronz burç");
    expect(duz(p[3])).toMatch(new RegExp(`^[\\d.,]+ ₺ ${S.TEDARIKCISIZ_IBARESI}$`));
    expect(altlar(fsz, "Delta Hırdavat", "Bronz burç").r).toHaveLength(3); // fiyatsızda tutar yok, ibare de yok
  });
  it("AC-16: belgenin sonunda birleşik toplam yok", () => { expect(fsz).not.toMatch(/Genel toplam|Tüm tedarikçiler/i); });
});

// 2026-11-15 isteği (boydan sipariş): işaretli kesidin parçası sipariş adedi yerine boy yazar, kesit başına satır, altında parça adedi;
// tek parçalı kesitte toplamın boy adedi, paylaşılan kesitte yuvarlanmamış kesirli pay. Fiyatlı ve fiyatsız aynı; ekran değişmez.
describe("2026-11-15: boydan sipariş edilen parçanın sipariş adedi boy yazar", () => {
  const hucre = (h, b, ad) => duz(altlar(h, b, ad).r[2]);
  it("tek parçalı kesit toplamın boy adedini, paylaşılan kesit kesirli payı yazar; altında parça adedi", () => {
    for (const h of [fsz, fli]) {
      expect(hucre(h, "Gama Boru", "Tek çubuk")).toBe("21 boy (1.000 mm) 70 parça");
      expect(hucre(h, "Gama Boru", "Uzun çubuk")).toBe("26,25 boy (400 mm) 70 parça");
      expect(hucre(h, "Gama Boru", "Kısa çubuk")).toBe("17,5 boy (400 mm) 70 parça");
      expect(hucre(h, "Gama Boru", "Boy mil")).toBe("70"); // işaretsiz kalem
    }
    expect(S.boySiparisMetni({ boy: 4.5, cubukBoyu: 400 })).toBe("4,5 boy (400 mm)");
    expect(S.boySiparisMetni({ boy: 1 / 3, cubukBoyu: 6000 })).toBe("0,333 boy (6.000 mm)");
  });
  it("tek parçalı kesitte asgari ya da elle boy adedi; elle işaretli", () => {
    const [v] = SENARYOLAR().odakli;
    const d = S.siparisIhtiyaci(v, { tedarikciOdakli: true, duzenleme: { parca: {}, kesit: { "504|boy|1000|mil|40": { deger: "25" } } } });
    expect(hucre(html(d), "Gama Boru", "Tek çubuk")).toBe(`25 boy (1.000 mm)${ELLE_ISARETI} 70 parça`);
    // Triyaj (qa2 bulgu 2): hücredeki elle değer elle notunu doğurur (eskiden toplam tablosunun elle satırı doğuruyordu).
    expect(bolumHtml(html(d), "Gama Boru")).toContain(ELLE_NOTU.replace(/"/g, "&quot;"));
  });
  it("\"sipariş etme\" işaretli boy kesidi boy yazmaz, parça adedi kalır", () => {
    const [v] = SENARYOLAR().odakli;
    const d = S.siparisIhtiyaci(v, { tedarikciOdakli: true, duzenleme: { parca: {}, kesit: { "504|boy|400|mil|30": { kapali: true } } } });
    expect(hucre(html(d), "Gama Boru", "Uzun çubuk")).toBe("70 parça"); // triyaj (qa2 bulgu 3): birimli
  });
  it("Karar (qa2 bulgu 1): parça satırlarından farklı sipariş edilen kesit bölüm sonunda yazar (yuvarlama, asgari, elle); fark yoksa yok", () => {
    const not = (h, bolumAd) => (bolumHtml(h, bolumAd).match(/<div data-siparis-farki[^>]*>([\s\S]*?)<\/div><\/div>/) || [])[1];
    for (const h of [fsz, fli]) {
      expect(duz(not(h, "Gama Boru"))).toBe(`${S.SIPARIS_FARK_BASLIGI} St37 mil · Ø30 · 400 mm çubuk: 44 boy sipariş edilir`); // 26,25 + 17,5 → 44
      expect(duz(not(h, "Alfa Çelik"))).toContain("EUR pirinç · Ø10: 50,000 kg sipariş edilir"); // asgari
      expect(not(h, "Beta Plastik")).toBeUndefined(); expect(not(h, "Delta Hırdavat")).toBeUndefined();
    }
    const [v] = SENARYOLAR().odakli;
    const d = html(S.siparisIhtiyaci(v, { tedarikciOdakli: true, duzenleme: { parca: {}, kesit: { "504|boy|400|mil|30": { deger: "60" }, "504|boy|1000|mil|40": { deger: "25" }, "501|kilo||mil|16": { deger: "50" } } } }));
    expect(duz(not(d, "Gama Boru"))).toBe(`${S.SIPARIS_FARK_BASLIGI} St37 mil · Ø30 · 400 mm çubuk: 60 boy sipariş edilir (elle)`); // tek parçalı Ø40 hücrede, notta yok
    expect(duz(not(d, "Alfa Çelik"))).toContain("304 Çubuk · Ø16: 50,000 kg sipariş edilir (elle)");
    // Triyaj (qa2): yalnız kesit elle (parça düzenlenmemiş) olan bölümde de elle notu basılır; boy ve kilo kesidi.
    const yalniz = (k) => html(S.siparisIhtiyaci(v, { tedarikciOdakli: true, duzenleme: { parca: {}, kesit: k } }));
    expect(bolumHtml(yalniz({ "504|boy|400|mil|30": { deger: "60" } }), "Gama Boru")).toContain(ELLE_NOTU.replace(/"/g, "&quot;"));
    expect(bolumHtml(yalniz({ "501|kilo||mil|16": { deger: "50" } }), "Alfa Çelik")).toContain(ELLE_NOTU.replace(/"/g, "&quot;"));
    expect(bolumHtml(fsz, "Gama Boru")).not.toContain(ELLE_NOTU.replace(/"/g, "&quot;"));
  });
  it("Triyaj (qa2 bulgu 3): kesidi çözülemeyen boydan parça çıplak adet değil \"N parça\" yazar", () => {
    const [v] = SENARYOLAR().odakli;
    const d = S.siparisIhtiyaci({ ...v, malzemeler: v.malzemeler.map(m => (m.id === 504 ? { ...m, ozgulAgirlik: undefined } : m)) }, { tedarikciOdakli: true });
    const h = html(d);
    for (const ad of ["Uzun çubuk", "Kısa çubuk", "Tek çubuk"]) expect(hucre(h, "Gama Boru", ad), ad).toBe("70 parça");
    expect(hucre(h, "Gama Boru", "Boy mil")).toBe("70"); // işaretsiz kalem birimsiz kalır (bugünkü)
  });
  it("Triyaj (qa2): parçası çubuktan uzun boydan kesit (kilogramla sipariş) de çıplak adet değil \"N parça\" yazar", () => {
    const parts = [...PARCALAR, { id: 53, ad: "Uzun dayama", maliyetKalemleri: [{ tur: "malzeme", adet: 1, malzemeId: 504, bicim: "mil", cap: 50, boy: 500, boydanSiparis: true, cubukBoyu: 400 }] }];
    const d = S.siparisIhtiyaci(veri({ parts, modeller: [{ model: "AK100_DS", defaultParcalar: parts.map(p => ({ partId: String(p.id), miktar: 1 })) }] }), { tedarikciOdakli: true });
    expect(d.kesitler.find(k => k.boyNeden === S.NEDEN_KESIM_BUYUK)).toBeTruthy();
    expect(hucre(html(d), "Gama Boru", "Uzun dayama")).toBe("70 parça");
  });
  it("iki boy kesidi kesit başına satır; boy ve kilo kalemi karışıksa boy satırı ve parça adedi", () => {
    const boy = (o) => ({ tur: "malzeme", adet: 1, malzemeId: 504, bicim: "mil", boydanSiparis: true, ...o });
    const parts = [...PARCALAR,
      { id: 50, ad: "İki çubuklu", maliyetKalemleri: [boy({ cap: 50, boy: 200, cubukBoyu: 1000 }), boy({ cap: 60, boy: 250, cubukBoyu: 3000 })] },
      { id: 51, ad: "Karışık", maliyetKalemleri: [boy({ cap: 70, boy: 500, cubukBoyu: 2000 }), { tur: "malzeme", adet: 1, malzemeId: 504, bicim: "mil", cap: 80, boy: 50 }] }];
    const d = S.siparisIhtiyaci(veri({ parts, modeller: [{ model: "AK100_DS", defaultParcalar: parts.map(p => ({ partId: String(p.id), miktar: 1 })) }] }), { tedarikciOdakli: true });
    const h = html(d);
    expect(altlar(h, "Gama Boru", "İki çubuklu").r[2]).toMatch(/^14 boy \(1\.000 mm\)<br>6 boy \(3\.000 mm\)<div[^>]*>70 parça<\/div>$/);
    expect(hucre(h, "Gama Boru", "Karışık")).toBe("18 boy (2.000 mm) 70 parça");
  });
  it("tedarikçisiz boy kesidi de boy yazar; motor alanı yalnız belge satırında", () => {
    const parts = [...PARCALAR, { id: 52, ad: "Bronz çubuk", tedarikciId: 14, maliyetKalemleri: [{ tur: "malzeme", adet: 1, malzemeId: 510, bicim: "mil", cap: 25, boy: 100, boydanSiparis: true, cubukBoyu: 1000 }] }];
    const d = S.siparisIhtiyaci(veri({ parts, modeller: [{ model: "AK100_DS", defaultParcalar: parts.map(p => ({ partId: String(p.id), miktar: 1 })) }] }), { tedarikciOdakli: true });
    expect(hucre(html(d), "Delta Hırdavat", "Bronz çubuk")).toBe("7 boy (1.000 mm) 70 parça");
    for (const k of d.kesitler) expect(k).not.toHaveProperty("boySiparisleri");
  });
});

describe("Spec 0144 B: fiyatlı ve fiyatsız nüsha", () => {
  it("AC-20 / AC-65: fiyatsız nüsha (ve seçeneksiz çağrı) para, simge ve ibare yazmaz", () => {
    for (const h of [fsz, siparisRaporuHtml(r, { bugun: BUGUN })]) {
      for (const s of ["Tutar", "Birim fiyat", FIYATLI_NUSHA, "₺", "€", "$"]) expect(h, s).not.toContain(s);
    }
  });
  it("AC-21 / AC-43 / AC-70: iki sütun yalnız fiyatlıda, tek yerden; MODELLER iki sütun", () => {
    // 2026-11-15 isteğiyle: fiyatlı nüshada "Birim fiyat" sütunu yok, yalnız Tutar.
    // Spec 0147 ile: bölümde grup başına bir tablo; her birinin başlıkları aynı.
    for (const t of tablolar(bolumHtml(fli, "Alfa Çelik")).filter(x => basliklar(x)[0] === "Parça")) expect(basliklar(t)).toEqual(["Parça", "Ölçü", "Sipariş adedi", "Tutar"]);
    expect(fli).not.toContain("Birim fiyat");
    expect(toplamTablosu(fli, "Alfa Çelik")).toBeUndefined(); // 2026-11-15 isteğiyle
    expect(belgeSutunlari({ fiyatli: true }).parca).toEqual([...BELGE_SUTUNLARI.parca, ...BELGE_SUTUNLARI.fiyat]);
    // Spec 0150 ile (R2/2): işlemler tablosunun sütunları da aynı tek yerden.
    expect(belgeSutunlari()).toEqual({ parca: BELGE_SUTUNLARI.parca, toplam: BELGE_SUTUNLARI.toplam, islem: BELGE_SUTUNLARI.islem });
    expect(basliklar(tablolar(fli)[0])).toEqual(["Model", "Makina adedi"]);
  });
  it("AC-24 / AC-64 (2026-11-15 isteğiyle): parça satırının tutarı malzeme payının tutarı, kendi para biriminde", () => {
    const { r: p } = altlar(fli, "Alfa Çelik", "Yatak");
    const x = r.tedarikciBolumleri.belge.find(b => b.ad === "Alfa Çelik").satirlar.find(y => y.ad === "Yatak");
    expect(p[3]).toBe(S.pbToplamMetni(x.parcaTutarlari)); expect(p[3]).toMatch(/^\d{1,3}(\.\d{3})*,\d{2} \$$/);
  });
  it("AC-25 (2026-11-15 isteğiyle): toplam tablosu yok", () => { expect(toplamTablosu(fli, "Gama Boru")).toBeUndefined(); });
  it("AC-26 / AC-61: parça satırı tutarı malzeme satırlarının toplamı, birim boş; iki para birimi ayrı", () => {
    // Spec 0147 ile (R8, AC-18, AC-19): iki hammaddeli parça iki satırda, her satır yalnız kendi hammaddesinin tutarını kendi para biriminde.
    expect(adliSatirlar(fli, "Alfa Çelik", "İki paralı").map(x => x[3])).toEqual([expect.stringMatching(/^[\d.,]+ \$$/), expect.stringMatching(/^[\d.,]+ €$/)]);
  });
  it("AC-27 / AC-28 / AC-69 (2026-11-15 isteğiyle): hazır parça tutarı (birim fiyat basılmaz); maliyetsizde neden", () => {
    const { r: p } = altlar(fli, "Delta Hırdavat", "Elle");
    expect(p).toHaveLength(4); expect(p[3]).toBe("3.150,00 ₺"); expect(fli).not.toContain("/adet");
    expect(duz(altlar(fli, "Delta Hırdavat", "Maliyetsiz hazır").r[3])).toBe(S.MALIYET_YOK);
  });
  it("AC-59 / AC-60: kalemi çözülemeyen malzemeli parçada birim boş, neden; maliyet basılmaz", () => {
    const { r: p } = altlar(fli, "Delta Hırdavat", "Çöpteki malzemeli");
    expect(duz(p[3])).toBe(S.MALZEME_COZULEMEDI);
  });
  it("AC-29 / AC-30 / AC-58 / AC-34: bölüm toplamı para birimi başına + kayıtlı kurla TL; kapsam cümlesi; tutarsız sayısı", () => {
    const b = r.tedarikciBolumleri.belge.find(x => x.ad === "Gama Boru");
    const g = bolumHtml(fli, "Gama Boru");
    expect(g).toContain(`${S.pbToplamMetni(b.toplamlar)} · kayıtlı kurla ${S.tlMetni(b.toplamTLK)}`);
    expect(g).toContain(S.TOPLAM_KAPSAM_CUMLESI);
    expect(g).not.toContain("hesaplanamadı"); // AC-34: tutarsız yoksa ek yok
    expect(bolumHtml(fli, "Alfa Çelik")).toContain(S.tutarsizMetni(3));
  });
  it("AC-31 / AC-32 / AC-33 (2026-11-15 isteğiyle): fiyatsız, kursuz, tanınmayan para biriminde neden parça satırında", () => {
    expect(duz(altlar(fli, "Alfa Çelik", "Fiyatsız parça").r[3])).toBe(S.NEDEN_FIYAT_YOK);
    expect(duz(altlar(fli, "Alfa Çelik", "Kursuz parça").r[3])).toBe(S.NEDEN_KUR_YOK);
    expect(duz(altlar(fli, "Beta Plastik", "GBP parça").r[3])).toBe(S.NEDEN_PARA_BIRIMI);
  });
  it("AC-62: bir satırın tutarı yoksa parça satırı çözülenlerin toplamını yazar", () => {
    const parts = [...PARCALAR, { id: 40, ad: "Yarım fiyatlı", maliyetKalemleri: [{ tur: "malzeme", adet: 1, malzemeId: 507, bicim: "mil", cap: 33, boy: 10 }, { tur: "malzeme", adet: 1, malzemeId: 501, bicim: "mil", cap: 33, boy: 10 }] }];
    const d = S.siparisIhtiyaci(veri({ parts, modeller: [{ model: "AK100_DS", defaultParcalar: parts.map(p => ({ partId: String(p.id), miktar: 1 })) }] }), { tedarikciOdakli: true });
    // 2026-11-15 isteğiyle: malzeme satırı yok; parça satırı çözülen tutarı ve altında "tutar eksik" nedenini yazar.
    // Spec 0147 ile (R8, AC-21): satır hammaddeye bölünür; fiyatlı hammaddenin satırı tam tutarı nedensiz, fiyatsızınki yalnız nedenini yazar.
    const xs = d.tedarikciBolumleri.belge.find(b => b.ad === "Alfa Çelik").satirlar.filter(y => y.ad === "Yarım fiyatlı");
    const hucreler = adliSatirlar(html(d, { fiyatli: true }), "Alfa Çelik", "Yarım fiyatlı").map(x => duz(x[3]));
    expect(hucreler).toHaveLength(2);
    const fiyatli = xs.find(y => y.parcaTutarlari.length); const fiyatsiz = xs.find(y => !y.parcaTutarlari.length);
    expect(hucreler).toContain(S.pbToplamMetni(fiyatli.parcaTutarlari)); expect(hucreler).toContain(fiyatsiz.tutarNeden);
  });
  it("Triyaj bulgu 2 / B-R5/7: ölçüsüz kalemli parça satırı çözülen toplamı ve altında nedeni yazar", () => {
    const parts = [...PARCALAR, { id: 42, ad: "Yarım ölçülü", maliyetKalemleri: [{ tur: "malzeme", adet: 1, malzemeId: 501, bicim: "mil", cap: 34, boy: 10 }, { tur: "malzeme", adet: 1, malzemeId: 509, bicim: "mil", cap: 34 }] }];
    const d = S.siparisIhtiyaci(veri({ parts, modeller: [{ model: "AK100_DS", defaultParcalar: parts.map(p => ({ partId: String(p.id), miktar: 1 })) }] }), { tedarikciOdakli: true });
    // Spec 0147 ile (R4, AC-21): ölçüsüz kalem başka hammaddede, kendi satırında; ölçülü satır tam tutarlı ve nedensiz.
    const hucreler = adliSatirlar(html(d, { fiyatli: true }), "Alfa Çelik", "Yarım ölçülü").map(x => duz(x[3]));
    expect(hucreler).toHaveLength(2);
    expect(hucreler.some(c => /^[\d.,]+ \$$/.test(c))).toBe(true); expect(hucreler).toContain(S.MALZEME_COZULEMEDI);
  });
  it("AC-72: döviz olmayan bölümde TL karşılığı eki yok", () => {
    expect(bolumHtml(fli, "Delta Hırdavat")).not.toContain("kayıtlı kurla");
    expect(bolumHtml(fli, "Beta Plastik")).not.toContain("kayıtlı kurla");
  });
  it("AC-35 / AC-67: \"Fiyatlı nüsha\" başlık bandında bir kez, bölüm başlıklarında yok", () => {
    expect(fli.split(FIYATLI_NUSHA).length - 1).toBe(1);
    expect(fli).toContain(`Üretim partisi: Güz · ${FIYATLI_NUSHA}`);
    expect(bolumHtml(fli, "Alfa Çelik")).not.toContain(FIYATLI_NUSHA);
  });
  it("A-R9/3 (2026-11-15 isteğiyle): yalnız kapalı kesitli parçanın tutarı boş ve nedensiz", () => {
    expect(altlar(html(calis("duzenleme"), { fiyatli: true }), "Beta Plastik", "Çift malzemeli").r[3]).toBe("");
  });
  it("AC-40: belge Türkçe; para Türkçe ayraçlı ve simge sonda", () => {
    expect(fli).toContain('lang="tr"');
    expect(fli).not.toMatch(/[$€₺]\s?\d/);
    expect(fli).toMatch(/\d{1,3}(\.\d{3})*,\d{2} ₺/);
  });
});
