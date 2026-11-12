// Spec 0144: belgenin parça altı malzeme satırları ve fiyatlı nüshası (`lib/siparisRaporu.js`). Veri `fixtures/0144-veri.js`.
import { describe, it, expect } from "vitest";
import * as S from "../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml, belgeSutunlari, BELGE_SUTUNLARI, TOPLAM_BASLIGI, MALZEME_ETIKETI, ELLE_ISARETI, PAY_FARK_NOTU, FIYATLI_NUSHA } from "../src/lib/siparisRaporu";
import { SENARYOLAR, BUGUN, FACTORY, K, PARCALAR, veri } from "./fixtures/0144-veri.js";

const calis = (ad) => { const [v, sec] = SENARYOLAR()[ad]; return S.siparisIhtiyaci(v, sec); };
const html = (r, o = {}) => siparisRaporuHtml(r, { bugun: BUGUN, factory: FACTORY, partiAd: "Güz", ...o });
const bolumHtml = (h, ad) => h.split('<div class="siparis-bolum"').find(p => p.includes(`${ad} · `)) || "";
const tablolar = (h) => [...h.matchAll(/<table>([\s\S]*?)<\/table>/g)].map(m => m[1]);
const basliklar = (t) => [...t.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map(m => m[1]);
const satirlar = (t) => [...t.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => c[1])).filter(r => r.length);
const parcaTablosu = (h, ad) => tablolar(bolumHtml(h, ad)).find(t => basliklar(t)[0] === "Parça");
const toplamTablosu = (h, ad) => tablolar(bolumHtml(h, ad)).find(t => basliklar(t)[0] === "Malzeme");
const satirAdi = (r) => r[0].replace(/<div[\s\S]*$/, "");
const duz = (c) => c.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const altlar = (h, b, ad) => { const s = satirlar(parcaTablosu(h, b)); const i = s.findIndex(r => satirAdi(r) === ad); const out = []; for (let j = i + 1; j < s.length && !satirAdi(s[j]); j++) out.push(s[j]); return { r: s[i], alt: out }; };

const r = calis("odakli");
const fsz = html(r);
const fli = html(r, { fiyatli: true });

describe("Spec 0144 A: parça altı malzeme satırı (belge)", () => {
  it("AC-49 / AC-50: kesit Ölçü'de, miktar Sipariş adedi'nde; başlıklar değişmez; ön ek `malzeme · `", () => {
    const { alt } = altlar(fsz, "Alfa Çelik", "Lama");
    expect(alt[0][0]).toContain(`${MALZEME_ETIKETI} · 304 Çubuk`);
    expect(alt[0][1]).toBe("10 × 20"); expect(alt[0][2]).toBe("74,655 kg");
    expect(basliklar(parcaTablosu(fsz, "Alfa Çelik"))).toEqual(["Parça", "Ölçü", "Sipariş adedi"]);
  });
  it("AC-1 (belge): tek parçalı kesitte parçanın altı toplam satırıyla aynı rakam", () => {
    const { alt } = altlar(fsz, "Gama Boru", "Tek çubuk");
    expect(alt[0][2]).toBe("21 boy");
    expect(satirlar(toplamTablosu(fsz, "Gama Boru")).find(x => x[1].startsWith("Ø40"))[2]).toBe("21 boy");
  });
  it("AC-3 / AC-51: paylaşılan boy kesidi kesirli boy ve kilogram, üç ondalık", () => {
    expect(altlar(fsz, "Gama Boru", "Uzun çubuk").alt[0][2]).toMatch(/^26,25 boy · \d+,\d{3} kg$/);
    expect(altlar(fsz, "Gama Boru", "Kısa çubuk").alt[0][2]).toMatch(/^17,5 boy · /);
  });
  it("AC-15: boydan siparişte kesit çubuk boyunu yazar, kilogramlıda yazmaz", () => {
    expect(altlar(fsz, "Gama Boru", "Uzun çubuk").alt[0][1]).toBe("Ø30 · 400 mm çubuk");
    expect(altlar(fsz, "Gama Boru", "Boy mil").alt[0][1]).toBe("Ø30");
  });
  it("AC-8 / AC-9 / AC-52: fark notu payların toplamı küçükken toplamın altında, kapalı uyarısının önünde; fark yoksa yok", () => {
    const a = bolumHtml(fsz, "Alfa Çelik");
    expect(a).toContain(PAY_FARK_NOTU);
    expect(a.indexOf(PAY_FARK_NOTU)).toBeGreaterThan(a.indexOf(TOPLAM_BASLIGI));
    expect(bolumHtml(fsz, "Beta Plastik")).not.toContain(PAY_FARK_NOTU);
    const [v] = SENARYOLAR().odakli;
    const k = bolumHtml(html(S.siparisIhtiyaci(v, { tedarikciOdakli: true, duzenleme: { parca: {}, kesit: { [K.ince]: { kapali: true } } } })), "Alfa Çelik");
    const uyari = k.indexOf(S.KESIT_KAPALI_UYARISI.replace(/"/g, "&quot;"));
    expect(uyari).toBeGreaterThan(k.indexOf(PAY_FARK_NOTU)); expect(k.indexOf(PAY_FARK_NOTU)).toBeGreaterThan(k.indexOf(TOPLAM_BASLIGI));
  });
  it("AC-53: kapalı kesitin satırı basılır, miktar boş, ibare satırda; bölüm uyarısı yerinde", () => {
    const d = html(calis("duzenleme"));
    const { alt } = altlar(d, "Beta Plastik", "Çift malzemeli");
    expect(duz(alt[0][0])).toContain(`Delrin levha ${S.KESIT_KAPALI_IBARESI.replace(/"/g, "&quot;")}`);
    expect(alt[0][1]).toBe("10 × 100"); expect(alt[0][2]).toBe("");
    expect(bolumHtml(d, "Beta Plastik")).toContain(S.KESIT_KAPALI_UYARISI.replace(/"/g, "&quot;"));
  });
  it("AC-54 (belge): tedarikçisiz malzeme satırı payla ve ibareyle", () => {
    const { alt } = altlar(fsz, "Delta Hırdavat", "Bronz burç");
    expect(duz(alt[0][0])).toContain(S.TEDARIKCISIZ_IBARESI); expect(alt[0][2]).toMatch(/kg$/);
  });
  it("AC-12 / AC-55: ölçüsü girilmemiş kalem pay üretmez; ad satırı durur, hücreler boş (tire yok); ibare yerinde", () => {
    const { r: p, alt } = altlar(fsz, "Alfa Çelik", "Boyu eksik");
    expect(p[0]).toContain(S.OLCU_GIRILMEMIS);
    expect(alt).toHaveLength(1); expect(alt[0][1]).toBe(""); expect(alt[0][2]).toBe("");
  });
  it("AC-11 (belge): hazır parçanın altında malzeme satırı yok", () => {
    expect(altlar(fsz, "Delta Hırdavat", "Elle").alt).toHaveLength(0);
  });
  it("AC-7 (belge): tek parçalı elle kesitte parçanın altı elle değer ve işaret", () => {
    const d = html(calis("duzenleme"));
    expect(altlar(d, "Alfa Çelik", "Yatak").alt[0][2]).toBe(`100,000 kg${ELLE_ISARETI}`);
  });
  it("AC-16: toplam tablosu bölümün sonunda; belgenin sonunda birleşik toplam yok", () => {
    expect(fsz.split(TOPLAM_BASLIGI).length - 1).toBe(calis("odakli").tedarikciBolumleri.belge.filter(b => b.toplam.length).length);
    expect(fsz).not.toMatch(/Genel toplam|Tüm tedarikçiler/i);
  });
});

describe("Spec 0144 B: fiyatlı ve fiyatsız nüsha", () => {
  it("AC-20 / AC-65: fiyatsız nüsha (ve seçeneksiz çağrı) para, simge ve ibare yazmaz", () => {
    for (const h of [fsz, siparisRaporuHtml(r, { bugun: BUGUN })]) {
      for (const s of ["Tutar", "Birim fiyat", FIYATLI_NUSHA, "₺", "€", "$"]) expect(h, s).not.toContain(s);
    }
  });
  it("AC-21 / AC-43 / AC-70: iki sütun yalnız fiyatlıda, tek yerden; MODELLER iki sütun", () => {
    expect(basliklar(parcaTablosu(fli, "Alfa Çelik"))).toEqual(["Parça", "Ölçü", "Sipariş adedi", "Birim fiyat", "Tutar"]);
    expect(basliklar(toplamTablosu(fli, "Alfa Çelik"))).toEqual(["Malzeme", "Kesit", "Alınacak", "Birim fiyat", "Tutar"]);
    expect(belgeSutunlari({ fiyatli: true }).parca).toEqual([...BELGE_SUTUNLARI.parca, ...BELGE_SUTUNLARI.fiyat]);
    expect(belgeSutunlari()).toEqual({ parca: BELGE_SUTUNLARI.parca, toplam: BELGE_SUTUNLARI.toplam });
    expect(basliklar(tablolar(fli)[0])).toEqual(["Model", "Makina adedi"]);
  });
  it("AC-22 / AC-23 / AC-24 / AC-64: malzeme satırında kilo fiyatı kendi para biriminde ve bandından, tutar çarpım", () => {
    const { alt } = altlar(fli, "Alfa Çelik", "Yatak");
    expect(alt[0][3]).toBe("2,95 $/kg");
    const e = r.tedarikciBolumleri.belge.find(b => b.ad === "Alfa Çelik").satirlar.find(x => x.ad === "Yatak").malzemeSatirlari[0];
    expect(alt[0][4]).toBe(S.pbTutarMetni(e.tutarK, "USD"));
    expect(alt[0][4]).toMatch(/^\d{1,3}(\.\d{3})*,\d{2} \$$/);
  });
  it("AC-25 / AC-63 / B-R4/4: toplam satırı motorun tutarı; boy satırı fiyatlıda kilogramı da yazar", () => {
    const t = satirlar(toplamTablosu(fli, "Gama Boru")).find(x => x[1] === "Ø30 · 400 mm çubuk");
    const k = r.tedarikciBolumleri.belge.find(b => b.ad === "Gama Boru").toplam.find(x => x.anahtar === K.cubuk30);
    expect(t[2]).toBe(`44 boy · ${S.kgMetni(k.siparisKg)}`); expect(t[4]).toBe(S.pbTutarMetni(k.tutarK, "TRY"));
    expect(satirlar(toplamTablosu(fsz, "Gama Boru")).find(x => x[1] === "Ø30 · 400 mm çubuk")[2]).toBe("44 boy");
    expect(altlar(fli, "Gama Boru", "Tek çubuk").alt[0][2]).toMatch(/^21 boy · .* kg$/);
    expect(altlar(fsz, "Gama Boru", "Tek çubuk").alt[0][2]).toBe("21 boy");
  });
  it("AC-26 / AC-61: parça satırı tutarı malzeme satırlarının toplamı, birim boş; iki para birimi ayrı", () => {
    const { r: p } = altlar(fli, "Alfa Çelik", "İki paralı");
    expect(p[3]).toBe(""); expect(p[4]).toMatch(/^[\d.,]+ \$ \+ [\d.,]+ €$/);
  });
  it("AC-27 / AC-28 / AC-69: hazır parça ₺/adet ve tutar; maliyetsizde neden", () => {
    const { r: p } = altlar(fli, "Delta Hırdavat", "Elle");
    expect(p[3]).toBe("15,00 ₺/adet"); expect(p[4]).toBe("3.150,00 ₺");
    expect(duz(altlar(fli, "Delta Hırdavat", "Maliyetsiz hazır").r[4])).toBe(S.MALIYET_YOK);
  });
  it("AC-59 / AC-60: kalemi çözülemeyen malzemeli parçada birim boş, neden; maliyet basılmaz", () => {
    const { r: p } = altlar(fli, "Delta Hırdavat", "Çöpteki malzemeli");
    expect(p[3]).toBe(""); expect(duz(p[4])).toBe(S.MALZEME_COZULEMEDI);
  });
  it("AC-29 / AC-30 / AC-58 / AC-34: bölüm toplamı para birimi başına + kayıtlı kurla TL; kapsam cümlesi; tutarsız sayısı", () => {
    const b = r.tedarikciBolumleri.belge.find(x => x.ad === "Gama Boru");
    const g = bolumHtml(fli, "Gama Boru");
    expect(g).toContain(`${S.pbToplamMetni(b.toplamlar)} · kayıtlı kurla ${S.tlMetni(b.toplamTLK)}`);
    expect(g).toContain(S.TOPLAM_KAPSAM_CUMLESI);
    expect(g).not.toContain("hesaplanamadı"); // AC-34: tutarsız yoksa ek yok
    expect(bolumHtml(fli, "Alfa Çelik")).toContain(S.tutarsizMetni(3));
  });
  it("AC-31 / AC-32 / AC-33: fiyatsız, kursuz, tanınmayan para biriminde tutar yerine neden", () => {
    expect(duz(altlar(fli, "Alfa Çelik", "Fiyatsız parça").alt[0][4])).toBe(S.NEDEN_FIYAT_YOK);
    expect(duz(altlar(fli, "Alfa Çelik", "Kursuz parça").alt[0][4])).toBe(S.NEDEN_KUR_YOK);
    expect(duz(altlar(fli, "Beta Plastik", "GBP parça").alt[0][4])).toBe(S.NEDEN_PARA_BIRIMI);
  });
  it("AC-62: bir satırın tutarı yoksa parça satırı çözülenlerin toplamını yazar", () => {
    const parts = [...PARCALAR, { id: 40, ad: "Yarım fiyatlı", maliyetKalemleri: [{ tur: "malzeme", adet: 1, malzemeId: 507, bicim: "mil", cap: 33, boy: 10 }, { tur: "malzeme", adet: 1, malzemeId: 501, bicim: "mil", cap: 33, boy: 10 }] }];
    const d = S.siparisIhtiyaci(veri({ parts, modeller: [{ model: "AK100_DS", defaultParcalar: parts.map(p => ({ partId: String(p.id), miktar: 1 })) }] }), { tedarikciOdakli: true });
    const { r: p, alt } = altlar(html(d, { fiyatli: true }), "Alfa Çelik", "Yarım fiyatlı");
    expect(duz(alt[0][4])).toBe(S.NEDEN_FIYAT_YOK);
    expect(p[4]).toBe(alt[1][4]); // çözülen tek satırın tutarı
    expect(duz(altlar(fli, "Alfa Çelik", "Fiyatsız parça").r[4])).toBe(""); // hiçbiri çözülmezse boş, eksiklik sayaçta
  });
  it("Triyaj bulgu 2 / B-R5/7: ölçüsüz kalemli parça satırı çözülen toplamı ve altında nedeni yazar", () => {
    const parts = [...PARCALAR, { id: 42, ad: "Yarım ölçülü", maliyetKalemleri: [{ tur: "malzeme", adet: 1, malzemeId: 501, bicim: "mil", cap: 34, boy: 10 }, { tur: "malzeme", adet: 1, malzemeId: 509, bicim: "mil", cap: 34 }] }];
    const d = S.siparisIhtiyaci(veri({ parts, modeller: [{ model: "AK100_DS", defaultParcalar: parts.map(p => ({ partId: String(p.id), miktar: 1 })) }] }), { tedarikciOdakli: true });
    const { r: p } = altlar(html(d, { fiyatli: true }), "Alfa Çelik", "Yarım ölçülü");
    expect(duz(p[4])).toMatch(new RegExp(`^[\\d.,]+ \\$ ${S.KALEM_TUTARA_GIRMEDI}$`));
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
  it("A-R9/3: kapalı kesitin fiyatlı satırında birim ve tutar boş", () => {
    const { alt } = altlar(html(calis("duzenleme"), { fiyatli: true }), "Beta Plastik", "Çift malzemeli");
    expect(alt[0][3]).toBe(""); expect(alt[0][4]).toBe("");
  });
  it("AC-40: belge Türkçe; para Türkçe ayraçlı ve simge sonda", () => {
    expect(fli).toContain('lang="tr"');
    expect(fli).not.toMatch(/[$€₺]\s?\d/);
    expect(fli).toMatch(/\d{1,3}(\.\d{3})*,\d{2} ₺/);
  });
});
