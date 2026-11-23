// @vitest-environment jsdom
// Spec 0150 A: sipariş listesinde işlem kalemleri. Motor (seçim, yerleşim, adet, tutar, sıralama, sınırlar), belge (sütunlar, yer,
// toplam, kaçışlama, basılabilirlik) ve kaynak taramaları (C1, R4/2). Veri `fixtures/0150-veri.js`.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import * as S from "../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml, basilacakBolumler, belgeDurumu, BELGE_SUTUNLARI, belgeSutunlari, ELLE_NOTU } from "../src/lib/siparisRaporu";
import { veri, TEDARIKCILER, PARCALAR } from "./fixtures/0150-veri.js";

const odakli = (o = {}, sec = {}) => S.siparisIhtiyaci(veri(o), { tedarikciOdakli: true, ...sec });
const pencere = (r, ad) => r.tedarikciBolumleri.bolumler.find(b => b.ad === ad);
const belge = (r, ad) => r.tedarikciBolumleri.belge.find(b => b.ad === ad);
const satirlar = (b) => (b?.islemler || []).map(x => `${x.ad}/${x.parca}/${x.siparis}`);
const html = (r, fiyatli = false) => siparisRaporuHtml(r, { bugun: "2026-11-20", factory: { name: "Altuntaş" }, partiAd: "Güz", fiyatli });
const dom = (h) => new DOMParser().parseFromString(h, "text/html");
const bolumDom = (h, ad) => [...dom(h).querySelectorAll(".siparis-bolum")].find(e => e.textContent.includes(`${ad} · `));
const islemTablosu = (h, ad) => bolumDom(h, ad)?.querySelector("[data-islemler] table");
const basliklar = (t) => [...t.querySelectorAll("th")].map(x => x.textContent);
const hucreler = (t) => [...t.querySelectorAll("tbody tr")].map(tr => [...tr.querySelectorAll("td")].map(td => td.textContent));
const yorumsuz = (f) => fs.readFileSync(f, "utf8").split("\n").filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).map(l => l.replace(/\s\/\/.*$/, "")).join("\n");

describe("Spec 0150: motor", () => {
  it("AC-2 / AC-12 / AC-13 / AC-37 (sıra): satır parça adı, işlem adı ve parçanın sipariş adedi; iki kalem iki satır, aynı işlem üç parçada üç satır; işlem adı sonra parça adı", () => {
    expect(satirlar(pencere(odakli(), "Kaplamacı"))).toEqual(["Kaplama/Boydan/10", "Kaplama/Mil A/10", "Kaplama/Mil B/10", "Nikel <kaplama> & cila/Özel/10", "Taşlama/Mil A/10"]);
    expect(satirlar(belge(odakli(), "Kaplamacı"))).toEqual(satirlar(pencere(odakli(), "Kaplamacı")));
  });
  it("AC-9: stoktan karşılanan parçanın işlemi hiçbir yerde yok", () => {
    const r = odakli();
    const hepsi = [...r.tedarikciBolumleri.bolumler, ...r.tedarikciBolumleri.belge].flatMap(b => b.islemler);
    expect(hepsi.some(x => x.parca === "Stokta yeten")).toBe(false);
    expect(r.tedarikciBolumleri.belirtilmemis.islemler.some(x => x.parca === "Stokta yeten")).toBe(false);
  });
  it("AC-10: kapatılan parçanın işlem satırı düşer", () => {
    const r = odakli({}, { duzenleme: { parca: { 3: { kapali: true } }, kesit: {} } });
    expect(satirlar(pencere(r, "Isıl İşlem"))).toEqual(["Hammadde alımı/Kırılımlı/10"]);
    expect(satirlar(belge(r, "Isıl İşlem"))).toEqual(["Hammadde alımı/Kırılımlı/10"]);
  });
  it("AC-11 / AC-30: hatalı adetli parçanın işlemi basılmaz, düştüğü bölümün hata sayacını artırır, belge kilitlenir; pencerede de çizilmez (R10/2)", () => {
    const r = odakli({}, { duzenleme: { parca: { 2: { adet: "x" } }, kesit: {} } });
    expect(satirlar(belge(r, "Kaplamacı")).some(x => x.includes("Mil B"))).toBe(false);
    expect(satirlar(pencere(r, "Kaplamacı")).some(x => x.includes("Mil B"))).toBe(false);
    expect(belge(r, "Kaplamacı").hataSayisi).toBe(1);
    expect(belgeDurumu(r).etkin).toBe(false);
  });
  it("R10/3 (triyaj bulgu 1): seçim yalnız fason firmadayken hatalı parça belgeyi kilitler ve motor onu adı ve satırının kartıyla döndürür", () => {
    const r = odakli({}, { secilenTedarikciler: ["22"], duzenleme: { parca: { 2: { adet: "abc" } }, kesit: {} } });
    expect(r.tedarikciBolumleri.duzen.gorunenHata).toBe(0); // satır seçim dışındaki Alfa Çelik kartında
    expect(belgeDurumu(r).etkin).toBe(false);
    expect(r.tedarikciBolumleri.gizliHatalar).toEqual([{ partId: "2", ad: "Mil B", yer: "Alfa Çelik", metin: S.gizliHataMetni("Mil B", "Alfa Çelik") }]);
    // Seçim yokken satır görünür: ibare yok.
    expect(odakli({}, { duzenleme: { parca: { 2: { adet: "abc" } }, kesit: {} } }).tedarikciBolumleri.gizliHatalar).toEqual([]);
    // Hatalı parçanın işlemi seçili bölümde değilse (yalnız Isıl İşlem seçili) kilit ve ibare yok.
    const r2 = odakli({}, { secilenTedarikciler: ["23"], duzenleme: { parca: { 2: { adet: "abc" } }, kesit: {} } });
    expect(r2.tedarikciBolumleri.gizliHatalar).toEqual([]);
    expect(belgeDurumu(r2).etkin).toBe(true);
  });
  it("R10/3: 0142'nin malzeme firması sınıfı da kapanır (parçanın satırı Ana tedarikçide, belgesi malzemenin firmasında)", () => {
    // Hazır C'nin Ana tedarikçisi Hazırcı; Mil A'nın malzemesi Alfa Çelik'te ama Mil A'nın Ana tedarikçisi yok: satırı pencerede hiç
    // yok, düzenlenemez, listeye girmez. Mil B: satırı Alfa Çelik kartında, belgesi de Alfa Çelik'te; Hazırcı seçiliyken gizli değil
    // çünkü Alfa Çelik bölümü seçim dışında basılmaz.
    const r = odakli({}, { secilenTedarikciler: ["21"], duzenleme: { parca: { 3: { adet: "x" } }, kesit: {} } });
    expect(r.tedarikciBolumleri.gizliHatalar).toEqual([]); // Hazır C'nin belgesi Hazırcı'da, seçim dışında
    const r2 = odakli({ parts: PARCALAR.filter(p => !p.deletedAt).map(p => (p.id === 11 ? { ...p, tedarikciId: 25 } : p)) },
      { secilenTedarikciler: ["21"], duzenleme: { parca: { 11: { adet: "x" } }, kesit: {} } });
    expect(r2.tedarikciBolumleri.gizliHatalar.map(g => [g.ad, g.yer])).toEqual([["Boydan", "Hazırcı"]]); // belge Alfa Çelik'te, satır Hazırcı'da
    expect(belgeDurumu(r2).etkin).toBe(false);
  });
  it("AC-14: işlem kalemi parçanın Ana tedarikçisinden farklı firmadaysa satır işlem firmasının bölümünde", () => {
    const r = odakli();
    expect(satirlar(pencere(r, "Isıl İşlem"))).toContain("Isıl işlem/Hazır C/20"); // Ana tedarikçi Hazırcı
    expect(pencere(r, "Hazırcı").islemler).toEqual([]);
  });
  it("AC-15 / AC-16 (motor): tedarikçisiz işlem belgeye girmez, belirtilmemiş kutusunun işlem listesinde", () => {
    const r = odakli();
    expect(r.tedarikciBolumleri.belirtilmemis.islemler.map(x => x.ad)).toEqual(["Torna"]);
    expect(r.tedarikciBolumleri.belge.flatMap(b => b.islemler).some(x => x.ad === "Torna")).toBe(false);
  });
  it("AC-17 / AC-18 / AC-28: yalnız işlem satırı olan tedarikçi pencerede bölüm, belgede bölüm; basilacakBolumler onu döndürür", () => {
    const r = odakli();
    expect(pencere(r, "Kaplamacı").hazirParcalar).toEqual([]);
    expect(belge(r, "Kaplamacı").satirlar).toEqual([]);
    expect(basilacakBolumler(r).map(b => b.ad)).toContain("Kaplamacı");
    expect(bolumDom(html(r), "Kaplamacı")).toBeTruthy();
  });
  it("AC-25 / AC-26: yalnız işlem kaleminde geçen firma seçicide; seçilince kartı ve belge bölümü kalır; ibare fason firmayı söyler", () => {
    expect(S.tedarikciSecenekleri({ tedarikciler: TEDARIKCILER, parts: PARCALAR }).map(t => t.ad)).toEqual(["Alfa Çelik", "Hazırcı", "Isıl İşlem", "Kaplamacı"]);
    const r = odakli({}, { secilenTedarikciler: ["22"] });
    expect(r.tedarikciBolumleri.bolumler.map(b => b.ad)).toEqual(["Kaplamacı"]);
    expect(basilacakBolumler(r).map(b => b.ad)).toEqual(["Kaplamacı"]);
    expect(S.HAMMADDE_SUZGEC_NEDENI).toMatch(/işlem kaleminde geçen/);
  });
  it("R5/3 (P4): set ve çöpteki parçanın işlem tedarikçisi seçiciye girmez", () => {
    const adlar = S.tedarikciSecenekleri({ tedarikciler: TEDARIKCILER, parts: PARCALAR }).map(t => t.ad);
    expect(adlar).not.toContain("Yalnız setin işlemcisi");
    expect(adlar).not.toContain("Yalnız çöpteki parçanın işlemcisi");
  });
  it("AC-27: eski kırılımdan türeyen 'Hammadde alımı' kalemi tedarikçisinin bölümünde satır üretir", () => {
    expect(satirlar(pencere(odakli(), "Isıl İşlem"))).toContain("Hammadde alımı/Kırılımlı/10");
  });
  it("AC-29: düzenlenen adet işlem satırına geçer, işaret taşır ve işlemin basıldığı başka bölümde elle notu doğar", () => {
    const r = odakli({}, { duzenleme: { parca: { 1: { adet: "20" } }, kesit: {} } });
    const x = belge(r, "Kaplamacı").islemler.find(i => i.parca === "Mil A" && i.ad === "Kaplama");
    expect(x.siparis).toBe(20); expect(x.duzenlendi).toBe(true);
    const k = bolumDom(html(r), "Kaplamacı");
    expect(k.textContent).toContain(ELLE_NOTU);
    expect(hucreler(islemTablosu(html(r), "Kaplamacı")).find(h => h[0].startsWith("Mil A") && h[1] === "Kaplama")[0]).toBe("Mil A (elle)");
    expect(bolumDom(html(odakli()), "Kaplamacı").textContent).not.toContain(ELLE_NOTU);
  });
  it("AC-31: boydan sipariş edilen parçanın işlem adedi parça adedi, 'boy' biçimi yok", () => {
    const h = html(odakli());
    const satir = hucreler(islemTablosu(h, "Kaplamacı")).find(x => x[0] === "Boydan");
    expect(satir[2]).toBe("10");
    expect(satir.join(" ")).not.toMatch(/boy/);
  });
  it("AC-32 / R3/5: çöpteki parça ve iki set (patlatılan ve patlatılmayan) satır üretmez; Ana tedarikçisiz malzemeli parçanın işlemi kendi firmasında", () => {
    const r = odakli();
    const hepsi = [...r.tedarikciBolumleri.bolumler.flatMap(b => b.islemler), ...r.tedarikciBolumleri.belirtilmemis.islemler];
    for (const p of ["Çöpteki parça", "Patlatılan set", "Patlatılmayan set"]) expect(hepsi.some(x => x.parca === p), p).toBe(false);
    expect(r.tedarikciBolumleri.belirtilmemis.anasizMalzemeli).toBe(1); // Mil A'nın kendi satırı pencerede yok
    expect(satirlar(pencere(r, "Kaplamacı"))).toContain("Kaplama/Mil A/10");
  });
  it("AC-33: islemId taşıyan eski katalog kalemi hiçbir yerde satır üretmez", () => {
    const r = odakli();
    const hepsi = [...r.tedarikciBolumleri.bolumler.flatMap(b => b.islemler), ...r.tedarikciBolumleri.belge.flatMap(b => b.islemler), ...r.tedarikciBolumleri.belirtilmemis.islemler];
    expect(hepsi.some(x => x.parca === "Eski katalog")).toBe(false);
  });
  it("AC-5 / AC-6 / AC-34 (motor): tutar birim × adet; tutarsız kalem nedenli, işlem toplamına ve bölümün tutarsız sayacına girmez", () => {
    const b = belge(odakli(), "Kaplamacı");
    expect(b.islemler.find(x => x.parca === "Mil A" && x.ad === "Kaplama").tutarK).toBe(15000);
    const t = b.islemler.find(x => x.ad === "Taşlama");
    expect(t.tutarK).toBeNull(); expect(t.tutarNeden).toBe(S.ISLEM_TUTAR_YOK);
    expect(b.islemToplamK).toBe(31000); expect(b.islemTutarsizSayi).toBe(1);
    expect(b.tutarsizSayi).toBe(0);
  });
  it("Çöpteki fason firma: pencerede silinmiş kartı, belgede basılmaz", () => {
    const r = odakli();
    expect(r.tedarikciBolumleri.bolumler.find(b => b.silinmis)?.islemler.map(x => x.ad)).toEqual(["Krom"]);
    expect(basilacakBolumler(r).some(b => b.silinmis)).toBe(false);
  });
});

describe("Spec 0150: belge", () => {
  // AC-8 ve AC-19 spec öncesi altınla `siparis-islem-0150-kiyas.test.js`'te.
  it("AC-4 / AC-36: fiyatsız belgede üç sütun, başlıklar BELGE_SUTUNLARI.islem'den", () => {
    expect(BELGE_SUTUNLARI.islem).toEqual(["Parça", "Alım / işlem", "Sipariş adedi"]); // spec 0159 ile (R1/2, AC-12): sütun adı satın almayı kapsar
    expect(belgeSutunlari().islem).toEqual(BELGE_SUTUNLARI.islem);
    const t = islemTablosu(html(odakli()), "Kaplamacı");
    expect(basliklar(t)).toEqual(BELGE_SUTUNLARI.islem);
    expect(bolumDom(html(odakli()), "Kaplamacı").querySelector("[data-islemler]").textContent).toContain(S.ISLEMLER_BASLIGI);
  });
  it("AC-5 / AC-6 / AC-7 / AC-36: fiyatlı belgede dördüncü sütun tutar; tutarsız satırda neden; tablonun altında kendi toplamı", () => {
    const h = html(odakli(), true);
    const t = islemTablosu(h, "Kaplamacı");
    expect(basliklar(t)).toEqual([...BELGE_SUTUNLARI.islem, ...BELGE_SUTUNLARI.fiyat]);
    const satir = hucreler(t);
    expect(satir.find(x => x[0] === "Mil A" && x[1] === "Kaplama")[3]).toBe(S.pbTutarMetni(15000, "TRY"));
    expect(satir.find(x => x[1] === "Taşlama")[3]).toBe(S.ISLEM_TUTAR_YOK);
    const toplam = bolumDom(h, "Kaplamacı").querySelector("[data-islem-toplami]").textContent;
    expect(toplam).toContain(`${S.ISLEMLER_TOPLAMI}: ${S.tlMetni(31000)}`);
    expect(toplam).toContain(S.tutarsizMetni(1)); // AC-34: kendi sayacı
  });
  it("AC-3 / R2/4: fiyatsız belgede işlem tutarı yok", () => {
    const k = bolumDom(html(odakli()), "Kaplamacı");
    expect(k.querySelector("[data-islem-toplami]")).toBeNull();
    expect(k.textContent).not.toContain(S.tlMetni(15000));
  });
  it("AC-37: işlemler tablosu grup tablolarından sonra, sipariş farkı notundan önce; bölüm toplamı en sonda", () => {
    const k = bolumDom(html(odakli(), true), "Alfa Çelik");
    const tablolar = [...k.querySelectorAll("table")];
    const islemler = k.querySelector("[data-islemler]"); const fark = k.querySelector("[data-siparis-farki]"); const toplam = k.querySelector("[data-bolum-toplami]");
    expect(fark).toBeTruthy();
    const once = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(tablolar.filter(t => !islemler.contains(t)).every(t => once(t, islemler))).toBe(true);
    expect(once(islemler, fark)).toBe(true);
    expect(once(fark, toplam)).toBe(true);
  });
  it("AC-38 / R9/4: parça satırı olmayan bölümde bölüm toplamı ve kapsam cümlesi yok, yalnız işlemler toplamı", () => {
    const k = bolumDom(html(odakli(), true), "Kaplamacı");
    expect(k.querySelector("[data-bolum-toplami]")).toBeNull();
    expect(k.textContent).not.toContain(S.TOPLAM_KAPSAM_CUMLESI);
    expect(k.querySelector("[data-islem-toplami]")).toBeTruthy();
  });
  it("AC-40: işlem adı kaçışlanır", () => {
    const h = html(odakli());
    expect(h).toContain("Nikel &lt;kaplama&gt; &amp; cila");
    expect(h).not.toContain("Nikel <kaplama>");
  });
  it("AC-35: tutar nedeni tek sabit; pencere ve belge kendi metnini yazmaz", () => {
    for (const f of ["src/lib/siparisRaporu.js", "src/components/stock/SiparisPenceresi.jsx"]) expect(yorumsuz(f)).not.toMatch(/tutar girilmedi/);
    expect(fs.readFileSync("src/lib/siparisIhtiyaci.js", "utf8").match(/"tutar girilmedi"/g)).toHaveLength(1);
  });
  it("C1: belge kurucusu işlem satırında aritmetik ve sıralama yapmaz; pencere de başlıkları tek yerden okur", () => {
    const r = yorumsuz("src/lib/siparisRaporu.js");
    const i = r.indexOf("const islemTablosu"); const g = r.slice(i, r.indexOf("\n};", i));
    expect(g).not.toMatch(/\.sort\(|\.reduce\(|\*/);
    const p = yorumsuz("src/components/stock/SiparisPenceresi.jsx");
    expect(p).toMatch(/BELGE_SUTUNLARI\.islem/);
    expect(p).not.toMatch(/"İşlem"/);
  });
  it("Ekran ve belge aynı motor sonucunu okur: işlem listesi yalnız motorda kurulur", () => {
    for (const f of ["src/lib/siparisRaporu.js", "src/components/stock/SiparisPenceresi.jsx"]) expect(yorumsuz(f)).not.toMatch(/islemKalemleri/);
    // Spec 0159 ile (R6/2): hazır parça satırının bedel düşümü aynı tek türetme kümesini okur (iki çağrı, ikisi de motorda).
    expect(yorumsuz("src/lib/siparisIhtiyaci.js").match(/islemKalemleri\(p\)/g)).toHaveLength(2);
  });
});
