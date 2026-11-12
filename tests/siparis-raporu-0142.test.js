// Spec 0142 A, B, F: belgenin yeni düzeni (`lib/siparisRaporu.js`). Belge HTML'i kıyasa girmez (C6), burada kendi kriterleriyle ölçülür.
import { describe, it, expect } from "vitest";
import * as S from "../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml, BELGE_SUTUNLARI, TOPLAM_BASLIGI, MALZEME_ETIKETI, ELLE_ISARETI } from "../src/lib/siparisRaporu";
import { veri, PARCALAR } from "./fixtures/0142-veri.js";

const sonuc = (o = {}, sec = {}) => S.siparisIhtiyaci(veri(o), { tedarikciOdakli: true, ...sec });
const html = (r, o = {}) => siparisRaporuHtml(r, { bugun: "2026-11-11", factory: { name: "Altuntaş Makina" }, partiAd: "Güz", ...o });
// Bölümler sayfa sonuyla ayrılır; adı verilen tedarikçinin bölümünün HTML'i.
const bolumHtml = (h, ad) => h.split('<div class="siparis-bolum"').find(p => p.includes(`${ad} · `)) || "";
const tablolar = (h) => [...h.matchAll(/<table>([\s\S]*?)<\/table>/g)].map(m => m[1]);
const basliklar = (t) => [...t.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map(m => m[1]);
const satirlar = (t) => [...t.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => c[1])).filter(r => r.length);
const parcaTablosu = (h, ad) => tablolar(bolumHtml(h, ad)).find(t => basliklar(t)[0] === "Parça");
const toplamTablosu = (h, ad) => tablolar(bolumHtml(h, ad)).find(t => basliklar(t)[0] === "Malzeme");
const satirAdi = (r) => r[0].replace(/<div[\s\S]*$/, "");
const parcaSatiri = (h, bolum, ad) => { const s = satirlar(parcaTablosu(h, bolum)); const i = s.findIndex(r => satirAdi(r) === ad); return { r: s[i], alt: s[i + 1] }; };

describe("Spec 0142 A: belgeden kalkanlar", () => {
  const h = html(sonuc());
  it("AC-1 / AC-2: İhtiyaç ve Stok başlıkları yok", () => { expect(h).not.toContain("İhtiyaç"); expect(h).not.toContain(">Stok<"); });
  it("AC-3: parça tablosunda Kesit başlığı yok; başlıklar birebir Parça · Ölçü · Sipariş adedi", () => {
    for (const ad of ["Alfa Çelik", "Beta Plastik", "Gama Boru", "Delta Hırdavat"]) expect(basliklar(parcaTablosu(h, ad))).toEqual(["Parça", "Ölçü", "Sipariş adedi"]);
  });
  it("AC-4 / AC-6: para başlığı ve bölüm başlığında tutar yok", () => {
    for (const s of ["Birim maliyet", "Tutar", "Birim fiyat", "KDV"]) expect(h, s).not.toContain(s);
    expect(h).not.toMatch(/\d,\d{2} (TL|\$|€|₺)/);
    expect(h).not.toMatch(/\d (TL|\$|€|₺)</);
  });
});

describe("Spec 0142 B: belgenin yeni düzeni", () => {
  const h = html(sonuc());
  it("AC-7: tedarikçi başına tek parça tablosu", () => {
    for (const ad of ["Alfa Çelik", "Beta Plastik", "Gama Boru", "Delta Hırdavat"]) expect(tablolar(bolumHtml(h, ad)).filter(t => basliklar(t)[0] === "Parça")).toHaveLength(1);
    expect(BELGE_SUTUNLARI.parca).toEqual(["Parça", "Ölçü", "Sipariş adedi"]);
    expect(h).not.toContain("Hazır parçalar");
  });
  it("AC-8: malzemeden kesilen parçanın hemen altında malzemenin adı; malzeme satırı ölçü ve adet yazmaz", () => {
    const { r, alt } = parcaSatiri(h, "Alfa Çelik", "Kalın mil");
    expect(r[1]).toBe("Ø62 × 178"); expect(r[2]).toBe("70");
    expect(alt[0]).toContain(`${MALZEME_ETIKETI} · 304 Çubuk`); expect(alt[1]).toBe(""); expect(alt[2]).toBe("");
  });
  it("AC-9 / AC-10: hazır parçanın ölçü hücresi boş, altında malzeme satırı yok", () => {
    const { r, alt } = parcaSatiri(h, "Delta Hırdavat", "Elle");
    expect(r[1]).toBe(""); expect(alt?.[0] || "").not.toContain(`${MALZEME_ETIKETI} · `);
  });
  it("AC-11 / AC-12: aynı çubuktan kesilenler yan yana, hazır parçalar sonda", () => {
    const ad = satirlar(parcaTablosu(h, "Alfa Çelik")).map(satirAdi).filter(Boolean); // malzeme satırlarının adı boş
    expect(ad.indexOf("Kalın mil") - ad.indexOf("Aynı kesit farklı boy")).toBe(1);
    const parts = PARCALAR.map(p => (p.id === 9 ? { ...p, tedarikciId: 13 } : p));
    const g = satirlar(parcaTablosu(html(sonuc({ parts })), "Gama Boru")).map(satirAdi).filter(Boolean); // malzeme satırlarının adı boş
    expect(g.at(-1)).toBe("Elle");
  });
  it("AC-13 / AC-48: bölüm sonunda 'Alınacak malzeme toplamı' kendi tablosu, malzeme ve kesit başına sipariş kilosu", () => {
    const t = toplamTablosu(h, "Alfa Çelik");
    expect(bolumHtml(h, "Alfa Çelik")).toContain(TOPLAM_BASLIGI);
    expect(basliklar(t)).toEqual(["Malzeme", "Kesit", "Alınacak"]);
    const r = sonuc().tedarikciBolumleri.belge.find(b => b.ad === "Alfa Çelik").toplam.find(k => k.kesitMetni === "Ø62");
    expect(satirlar(t)).toContainEqual(["304 Çubuk", "Ø62", S.kgMetni(r.siparisKg)]);
    expect(bolumHtml(h, "Alfa Çelik").indexOf(TOPLAM_BASLIGI)).toBeGreaterThan(bolumHtml(h, "Alfa Çelik").indexOf("Kalın mil"));
    for (const r2 of satirlar(parcaTablosu(h, "Alfa Çelik"))) expect(r2[2]).not.toMatch(/kg|boy/);
  });
  // Spec 0143 ile: boy fiyatı yöntemi kalktı; işaretli (boydan sipariş) kalemin toplamı boy adedi ve çubuk boyunu yazar (0143 C-R2, C-R4).
  it("AC-14 (spec 0143 ile): boydan sipariş edilen malzemenin toplamı boy adedi yazar", () => {
    const parts = PARCALAR.map(p => (p.id === 7 ? { ...p, maliyetKalemleri: p.maliyetKalemleri.map(k => ({ ...k, boydanSiparis: true, cubukBoyu: 6000 })) } : p));
    expect(satirlar(toplamTablosu(html(sonuc({ parts })), "Gama Boru"))).toContainEqual(["St37 mil", "Ø30 · 6.000 mm çubuk", "5 boy"]);
  });
  it("AC-15: malzeme satırı olmayan tedarikçide toplam tablosu çizilmez", () => {
    expect(bolumHtml(h, "Delta Hırdavat")).not.toContain(TOPLAM_BASLIGI);
  });
  it("AC-51: MODELLER tablosu model adı ve makina adediyle", () => {
    expect(h).toContain("MODELLER"); expect(h).toContain("AK100_DS"); expect(h).toMatch(/AK100_DS<\/td><td[^>]*>70</);
  });
});

describe("Spec 0142 F: bölümleme, süzgeç ve ölçü hücresi (belge)", () => {
  const h = html(sonuc());
  it("AC-34 / AC-35 / AC-37: parça malzemesinin firmasında; Ana'sız malzemeli de basılır; hazır parça kendi firmasında", () => {
    expect(parcaSatiri(h, "Alfa Çelik", "Kalın mil").r).toBeTruthy();
    expect(satirlar(parcaTablosu(h, "Beta Plastik")).map(satirAdi)).not.toContain("Kalın mil");
    expect(parcaSatiri(h, "Alfa Çelik", "Yatak").r).toBeTruthy();
    expect(parcaSatiri(h, "Delta Hırdavat", "Elle").r).toBeTruthy();
  });
  it("AC-36 / AC-58: iki firmalı parça iki bölümde, yalnız o firmanın malzemesiyle ve aynı adetle; çift sayım cümlesi yok", () => {
    const a = parcaSatiri(h, "Alfa Çelik", "Çift malzemeli"); const b = parcaSatiri(h, "Beta Plastik", "Çift malzemeli");
    expect([a.r[1], a.r[2]]).toEqual(["Ø40 × 90", "70"]); expect(a.alt[0]).toContain("304 Çubuk"); expect(a.alt[0]).not.toContain("Delrin");
    expect([b.r[1], b.r[2]]).toEqual(["10 × 100 × 200", "70"]); expect(b.alt[0]).toContain("Delrin levha");
    expect(h).not.toContain(S.CIFT_SAYIM_DEGIL);
  });
  it("AC-38: kapatılmış ya da hatalı parça ve altındaki malzeme satırı basılmaz", () => {
    const d = html(sonuc({}, { duzenleme: { parca: { 6: { kapali: true }, 9: { adet: "x" } }, kesit: {} } }));
    expect(d).not.toContain(">Levha<"); expect(d).not.toMatch(/>Elle</);
    expect(satirlar(parcaTablosu(d, "Beta Plastik")).filter(r => r[0].includes("Delrin levha"))).toHaveLength(1); // yalnız Çift malzemeli'nin
  });
  it("AC-39 / AC-49: kapatılmış ve hatalı kesit toplama girmez; parçası açıksa uyarı yazar", () => {
    const d = html(sonuc({}, { duzenleme: { parca: {}, kesit: { "501|kilo||mil|50": { kapali: true }, "501|kilo||mil|40": { deger: "abc" } } } }));
    const t = satirlar(toplamTablosu(d, "Alfa Çelik")).map(r => r[1]);
    expect(t).not.toContain("Ø50"); expect(t).not.toContain("Ø40"); expect(t).toContain("Ø62");
    expect(bolumHtml(d, "Alfa Çelik")).toContain(S.KESIT_KAPALI_UYARISI.replace(/"/g, "&quot;"));
    expect(h).not.toContain("sipariş etme&quot; işaretli");
  });
  it("AC-41: boyu girilmemiş kalemli parçanın ölçü hücresi boş, adının altında ibare, satır düşmez", () => {
    const { r } = parcaSatiri(h, "Alfa Çelik", "Boyu eksik");
    expect(r[1]).toBe(""); expect(r[0]).toContain(S.OLCU_GIRILMEMIS);
  });
  it("AC-42: patlatılmayan setin satırında ölçü boş, altında malzeme satırı yok", () => {
    const set = { id: 20, ad: "Boş set", tedarikciId: 14, setIcerigi: [{ partId: 9999, miktar: 1 }] };
    const parts = [...PARCALAR, set];
    const modeller = [{ model: "AK100_DS", defaultParcalar: parts.map(p => ({ partId: String(p.id), miktar: 1 })) }];
    const d = html(sonuc({ parts, modeller }));
    const { r, alt } = parcaSatiri(d, "Delta Hırdavat", "Boş set");
    expect(r[1]).toBe(""); expect(alt?.[0] || "").not.toContain(`${MALZEME_ETIKETI} · `);
  });
  it("AC-43: iki ölçülü parçada ölçüler alt alta (`<br>`), aralarında noktalama yok", () => {
    expect(parcaSatiri(h, "Alfa Çelik", "Aynı kesit farklı boy").r[1]).toBe("Ø62 × 50<br>Ø62 × 75");
  });
  it("AC-55 (belge): kalem adedi ölçü satırının sonunda", () => {
    expect(parcaSatiri(h, "Alfa Çelik", "Lama").r[1]).toBe("10 × 20 × 125 · parça başına 2");
  });
  it("AC-56: parçaları kapatılmış ama kesidine elle kilo yazılmış bölüm toplamıyla basılır", () => {
    const d = html(sonuc({ parts: PARCALAR.map(p => (p.id === 1 ? { ...p, tedarikciId: 11 } : p)) }, { duzenleme: { parca: { 6: { kapali: true }, 11: { kapali: true } }, kesit: { "502|kilo||sac|30|60": { deger: "40" } } } }));
    const b = bolumHtml(d, "Beta Plastik");
    expect(b).toContain(TOPLAM_BASLIGI); expect(parcaTablosu(d, "Beta Plastik")).toBeUndefined();
    expect(satirlar(toplamTablosu(d, "Beta Plastik"))).toEqual([["Delrin levha", "30 × 60", `40,000 kg${ELLE_ISARETI}`]]);
  });
  it("AC-57: malzemesi çöpte olan parça Ana tedarikçisinde; malzemesi bulunamayan Ana'sız parça basılmaz", () => {
    expect(parcaSatiri(h, "Delta Hırdavat", "Çöpteki malzemeli").r[1]).toBe("Ø20 × 40");
    expect(h).not.toContain("Malzemesi yok");
  });
  it("kullanıcı metinleri kaçışlanır (0140 AC-50 korunur)", () => {
    const parts = PARCALAR.map(p => (p.id === 1 ? { ...p, ad: "Mil <b>" } : p));
    const d = html(sonuc({ parts }), { partiAd: "<script>" });
    expect(d).toContain("Mil &lt;b&gt;"); expect(d).not.toContain("<script>");
  });
});

// Triyaj (2026-11-11): bulgu 1 (pencere ve belge aynı parçayı farklı bölümlere koyar, ekranda ibare) ve bulgu 2 (seçim dışındaki
// hatalı adet belgede yarım satır bırakıyordu).
import { belgeDurumu } from "../src/lib/siparisRaporu";
describe("Spec 0142 triyaj", () => {
  const beta = (r) => r.tedarikciBolumleri.bolumler.find(b => b.ad === "Beta Plastik");
  it("bulgu 1: Ana tedarikçisinin bölümünde duran ama belgede malzemesinin firmasında basılan satır nerede basıldığını söyler", () => {
    const r = sonuc();
    expect(beta(r).hazirParcalar.find(x => x.ad === "Kalın mil").belgeYeri).toBe(S.belgeYeriMetni(["Alfa Çelik"], false));
    expect(S.belgeYeriMetni(["Alfa Çelik"], false)).toBe("Belgede Alfa Çelik bölümünde basılır.");
    // Kendi bölümünde basılan satırda ibare yok.
    for (const b of r.tedarikciBolumleri.bolumler) for (const x of b.hazirParcalar) if (x.ad !== "Kalın mil") expect(x.belgeYeri, x.ad).toBeUndefined();
  });
  it("bulgu 1: o firma seçimde değilse ibare parçanın belgeye girmediğini de söyler", () => {
    const r = sonuc({}, { secilenTedarikciler: ["12"] });
    expect(beta(r).hazirParcalar.find(x => x.ad === "Kalın mil").belgeYeri).toBe(S.belgeYeriMetni(["Alfa Çelik"], true));
    expect(S.belgeYeriMetni(["Alfa Çelik"], true)).toMatch(/seçimde olmadığı için belgeye girmez/);
    expect(html(r)).not.toContain("Kalın mil");
  });
  it("bulgu 2: basılacak bölüme düşen hatalı adetli parça belgeyi kilitler (seçim dışı pencere bölümünde dursa da)", () => {
    const d = { parca: { 1: { adet: "x" } }, kesit: {} };
    expect(belgeDurumu(sonuc({}, { secilenTedarikciler: ["11"] }), { hata: "H", bos: "B" })).toEqual({ etkin: true, neden: null });
    const r = sonuc({}, { secilenTedarikciler: ["11"], duzenleme: d });
    expect(r.tedarikciBolumleri.duzen.gorunenHata).toBe(0); // pencerenin görünen bölümlerinde hata yok (Kalın mil Beta'da)
    expect(belgeDurumu(r, { hata: "H", bos: "B" }).neden).toBe("H");
    expect(r.tedarikciBolumleri.belge.find(b => b.ad === "Alfa Çelik").hataSayisi).toBe(1);
    // Hatalı parçanın düşmediği bölüm seçiliyse kilit yok.
    expect(belgeDurumu(sonuc({}, { secilenTedarikciler: ["13"], duzenleme: d }), { hata: "H", bos: "B" })).toEqual({ etkin: true, neden: null });
  });
});
