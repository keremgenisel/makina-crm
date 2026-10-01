// Spec 0059: Aylık Gider ve Kasa Raporu, Aylık Faaliyet Raporu'nun sunum diliyle (ortak modül src/lib/raporSunumu.js),
// geçen ay karşılaştırması ve detay tabloları. Altın çıktılar (tests/fixtures/0059-*) değişiklikten önceki kodla üretildi.
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor";
import { buildAylikRaporHtml } from "../src/lib/printTemplates";
import { faaliyetVeri, faaliyetSecenek } from "./fixtures/0059-veri";

afterEach(() => { vi.useRealTimers(); });

const faaliyetHtml = () => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-15T09:00:00Z"));
  const r = hesaplaAylikRapor(faaliyetVeri, "2026-06", faaliyetSecenek);
  r.onceki = hesaplaAylikRapor(faaliyetVeri, "2026-05", faaliyetSecenek);
  const bos = hesaplaAylikRapor({ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }, "2026-06", faaliyetSecenek);
  const html = [buildAylikRaporHtml(r, { name: "Altuntaş <Makina>", adres: "OSB", city: "Konya", country: "Türkiye", phone: "0332", email: "a@b.c", web: "x.com" }),
    buildAylikRaporHtml(bos, { name: "Altuntaş Makina" })].join("\n<!-- ===== -->\n");
  vi.useRealTimers();
  return html;
};

describe("Spec 0059: Aylık Faaliyet Raporu değişmez (R4, R23)", () => {
  it("AC-5: aynı girdiyle faaliyet raporunun çıktısı bu işten önceki altın dizeyle birebir aynı", () => {
    expect(faaliyetHtml()).toBe(readFileSync("tests/fixtures/0059-aylik-faaliyet.html", "utf-8"));
  });
});

// ── Gider ve Kasa Raporu ────────────────────────────────────────────────────────────────
import { giderKasaRaporu, buildGiderKasaRaporuHtml, GUN_NOTU } from "../src/lib/giderRaporu";
import { hareketOzeti, hesapBakiyeleri } from "../src/lib/kasa";
import { cekAyOzeti } from "../src/lib/cek";
import * as odemeYontemi from "../src/lib/odemeYontemi";
import * as giderAlanlari from "../src/components/gider/GiderAlanlari";
import { girdi, H, HESAPLAR, PAYMENTS, CEKLER, CUSTOMERS, SERVICES, PART_SALES, K2, GIDERLER, tedarikciler, ana, stopaj } from "./fixtures/0059-veri";
import { SATIS_KAYNAK_AD } from "../src/lib/satisTahsilat";

const R = (o, ay = "2026-09") => giderKasaRaporu(girdi(o), ay);
const HTML = (o, ay) => buildGiderKasaRaporuHtml(R(o, ay));
const oku = (f) => readFileSync(f, "utf-8");
const KOD = (f) => oku(f).split("\n").filter(l => !l.trim().startsWith("//")).join("\n");

describe("Spec 0059: ortak sunum dili (R1–R3)", () => {
  const h = HTML();
  it("AC-1: gider ve kasa bölümleri faaliyet raporunun koyu şeritli kutusuyla çizilir; eski düz başlıklar yok", () => {
    // Triyaj ile sıkılaştırıldı: her şeridin başlığı tam liste olarak ve sırasıyla denetlenir.
    const basliklar = [...h.matchAll(/<div style="background:#211d19;color:#fff;padding:7px 12px;[^"]*">\s*<span style="font-weight:700;font-size:11.5px;letter-spacing:.4px;">([^<]*)<\/span>/g)].map(m => m[1]);
    expect(basliklar).toEqual(["GİDER · ÖZET", "GİDER · TÜR KIRILIMI", "GİDER · TEDARİKÇİ KIRILIMI", "GİDER · ÖDEME DURUMU", "GİDER · MALİYET DAĞILIMI",
      "GİDER · KDV KARŞILAŞTIRMASI", "GİDER · ÖDEME YÖNTEMİ KIRILIMI", "GİDER · KALEM LİSTESİ", "KASA · ÖZET", "KASA · HESAPLAR", "KASA · HAREKET ÖZETİ",
      "KASA · AYIN ÖDEME HAREKETLERİ", "KASA · AYIN TAHSİLAT HAREKETLERİ", "KASA · ÖDEME YÖNTEMİ KIRILIMI", "KASA · HESABI BELİRTİLMEMİŞ HAREKETLER",
      "KASA · ÇEK PORTFÖYÜ", "KASA · AÇIK ÇALIŞAN AVANSI"]);
    expect(h).not.toMatch(/<h[1-4][ >]/);
  });
  it("AC-2: iki belge aynı tablo ve alt başlık işaretlemesini kullanır; para gösterimi her belgede bugünkü gibi", () => {
    const th = '<th style="text-align:left;padding:4px 8px 4px 0;font-size:9px;color:#94a3b8;font-weight:700;border-bottom:1px solid #cbd5e1;">';
    const alt = '<div style="font-size:10px;font-weight:700;color:#94a3b8;margin-top:8px;">';
    const f = oku("tests/fixtures/0059-aylik-faaliyet.html");
    for (const x of [th, alt]) { expect(h).toContain(x); expect(f).toContain(x); }
    expect(h).toContain("₺12.000"); // fmtCur, simge önde
    expect(f).toMatch(/\d TL<\/span>/); // faaliyet "150.875 TL"
  });
  it("AC-3: ortak yardımcılar tek modülde; iki belge de oradan besleniyor, yerel kopya yok", () => {
    for (const f of ["src/lib/printTemplates.js", "src/lib/giderRaporu.js"]) {
      expect(oku(f), f).toMatch(/from "\.\/raporSunumu"/);
      expect(KOD(f), f).not.toMatch(/const (bolum|kutu|st|altBaslik|detayTablo|rozet|rozetSatiri|gun|belgeAcilis) = /);
    }
    expect(KOD("src/lib/giderRaporu.js")).not.toMatch(/<h[1-4]>|<style>/);
  });
});

describe("Spec 0059: geçen ay karşılaştırması (R5–R7)", () => {
  const r = R();
  it("AC-6 / AC-7: özet rakamlarının yanında geçen ay; aynı motordan ve ay sonu kilidiyle", () => {
    const agu = giderKasaRaporu(girdi(), "2026-08");
    expect(r.onceki).toMatchObject({ ay: "2026-08", yururlukOncesi: false });
    expect(r.onceki.gider).toEqual(agu.gider.ozet);
    expect(r.onceki.kasa.TRY).toEqual({ girenK: agu.kasa.bloklar.find(b => b.paraBirimi === "TRY").toplam.girenK, cikanK: agu.kasa.bloklar.find(b => b.paraBirimi === "TRY").toplam.cikanK, kapanisK: agu.kasa.bloklar.find(b => b.paraBirimi === "TRY").toplam.kapanisK });
    // Eylül raporunun önceki ayı: ağustos kalemi 4.000 (KDV hariç toplam), %20 KDV; 20 ağustos ödemesiyle kapandı.
    expect(r.onceki.gider).toMatchObject({ toplam: 4000, odenen: 4000, odenmeyen: 0, indirilecekKdv: 800 });
    const h = buildGiderKasaRaporuHtml(r);
    for (const sat of ["Toplam gider", "Ödenen", "Ödenmeyen", "İndirilecek KDV", "Kesilen stopaj", "Kasaya giren", "Kasadan çıkan", "Ay sonu toplam bakiye"]) {
      expect(h, sat).toMatch(new RegExp(`${sat}</td><td[^>]*>[^<]*<span[^>]*> · geçen ay: `));
    }
    expect(h).toContain("geçen ay: ₺4.000");
  });
  it("AC-21: geçen ayın hesabı giderKasaRaporu içinde (düğme ikinci çağrı yapmaz)", () => {
    expect(KOD("src/components/rapor/GiderKasaRaporuDugmesi.jsx")).not.toMatch(/oncekiAyStr|\.onceki\b/);
    expect(oku("src/lib/giderRaporu.js")).toMatch(/giderKasaRaporu\(girdi, oAy, \{ _onceki: false \}\)/);
  });
  it("AC-8 / AC-22: önceki ay yürürlük öncesiyse ek yok; yürürlükte ama kayıtsızsa sıfırla; hata yok", () => {
    const once = R({ yururlukAy: "2026-09" });
    expect(once.onceki).toEqual({ ay: "2026-08", yururlukOncesi: true });
    expect(buildGiderKasaRaporuHtml(once)).not.toContain("geçen ay");
    const bos = R({}, "2026-03");
    expect(bos.onceki.gider).toMatchObject({ toplam: 0, odenen: 0, odenmeyen: 0 });
    expect(() => HTML({}, "2026-03")).not.toThrow();
    expect(HTML({ giderler: [], hareketler: [] }, "2026-09")).toContain("geçen ay: ₺0");
  });
});

describe("Spec 0059: detay tabloları (R8–R13, R21)", () => {
  const r = R();
  const h = buildGiderKasaRaporuHtml(r);
  it("AC-9 / AC-31: geciken ve yaklaşan kalemler tek tek; tür turMap'ten; gün ay sonuna göre ve belgede yazılı", () => {
    expect(r.gider.vadeler.gecmis).toEqual(expect.arrayContaining([
      { tarih: "2026-09-03", tur: "Hammadde", tedarikci: "A<B Ticaret", kalanK: 300000, vade: "2026-09-12", gun: -18 },
      { tarih: "2026-09-01", tur: "Kira", tedarikci: "Yıldız Gayrimenkul", kalanK: 1600000, vade: "2026-09-10", gun: -20 },
    ]));
    // Temizlik (tedarikçisiz) hesapsız ödemeyle kapanmış; ödemesi yokken yaklaşan listesine "Tedarikçi seçilmemiş" ile girer.
    expect(R({ hareketler: H.filter(x => x.id !== 104) }).gider.vadeler.yaklasan.find(v => v.tur === "Hammadde"))
      .toEqual({ tarih: "2026-09-15", tur: "Hammadde", tedarikci: "Tedarikçi seçilmemiş", kalanK: 100000, vade: "2026-10-03", gun: 3 });
    expect(r.gider.vadeler.yaklasan.find(v => v.personel)).toEqual({ personel: true, tarih: null, tur: "Personel gideri", tedarikci: "", adet: 1, kalanK: expect.any(Number), vade: "2026-10-05", gun: 5 });
    // Stopaj satırına vade verilmiş kira (vadesiz stopaj hatırlatıcıya girmez, 0021 R13), vergi dairesine ödenmemiş.
    const K2v = { ...K2, taksitler: K2.taksitler.map(t => (t.hedef === "stopaj" ? { ...t, vade: "2026-09-15" } : t)) };
    const stopaj = R({ giderler: GIDERLER.map(k => (k.id === 2 ? K2v : k)), hareketler: H.filter(x => x.id !== 112) }).gider.vadeler.gecmis.find(v => v.tedarikci === "Vergi dairesi");
    expect(stopaj).toMatchObject({ tur: "Kira", kalanK: 400000 });
    expect(h).toContain("VADESİ GEÇMİŞ KALEMLER");
    expect(h).toContain("18 gün geçti");
    expect(h).toContain(GUN_NOTU("2026-09-30"));
  });
  it("AC-10 / AC-27: tedarikçi altındaki kalemler kalem listesinin aynı satırlarıdır (yeni hesap yok)", () => {
    const genel = r.gider.kalemler.filter(k => !k.personel);
    expect(r.gider.tedarikciKalemleri.flatMap(t => t.kalemler)).toHaveLength(genel.length);
    for (const t of r.gider.tedarikciKalemleri) for (const k of t.kalemler) expect(genel).toContain(k);
    expect(r.gider.tedarikciKalemleri.find(t => t.ad === "Demir Bant").kalemler.map(k => k.aciklama)).toEqual(["Sac levha", "Bant"]);
    expect(r.gider.tedarikciKalemleri.at(-1).ad).toBe("Tedarikçi seçilmemiş");
    expect(h).toContain("Demir Bant · bu ayın kalemleri");
  });
  it("AC-11 / AC-29: ödeme tablosunda yalnız 'odeme' satır satır; avans ve mahsup toplu; virman ayrı tabloda", () => {
    const satir = r.kasa.odemeler.filter(m => !m.toplu);
    expect(satir.map(m => [m.tarih, m.hesap, m.yontem, m.kalem, m.hedef, m.tutarK])).toEqual([
      ["2026-09-11", "Ziraat", "Havale", "Eylül kirası", "Vergi dairesine (stopaj)", 400000],
      ["2026-09-18", "Ziraat", "Havale", "Sac levha", "", 1200000],
      ["2026-09-20", "Hesapsız", "Belirtilmemiş", "Temizlik", "", 100000],
      ["2026-09-22", "Çek (ciro)", "Çek (ciro)", "Bant", "", 200000], // triyaj: hesap sütunu yöntemin kendisi (R36)
    ]);
    expect(r.kasa.odemeler.filter(m => m.toplu).map(m => m.kalem)).toEqual(["Personel ödemeleri · 1 adet", "Çalışan avansları · 2 adet", "Avanstan mahsup · 1 adet"]);
    expect(r.kasa.virmanlar).toEqual([{ tarih: "2026-09-12", kaynak: "Ziraat", hedef: "Kasa", tutarK: 500000, paraBirimi: "TRY" }]);
    expect(h).toContain("ÖDEME HAREKETLERİ");
    expect(h).toContain("VİRMANLAR");
  });
  it("AC-12: tahsilat satırları hesap, kaynak, firma ve para birimiyle; hesapsız tahsilat bu tabloda yok", () => {
    // Triyaj ile sıkılaştırıldı: satırlar tam eşitlikle (kaynak ve tutar dahil).
    expect(r.kasa.tahsilatlar).toEqual([
      { tarih: "2026-09-14", hesap: "Ziraat", kaynak: "Makina tahsilatı", firma: "Kutu Gıda", tutarK: 700000, paraBirimi: "TRY" },
      { tarih: "2026-09-16", hesap: "Ziraat", kaynak: SATIS_KAYNAK_AD.servis, firma: "Kutu Gıda", tutarK: 120000, paraBirimi: "TRY" },
      { tarih: "2026-09-17", hesap: "Euro Hesap", kaynak: "Makina tahsilatı", firma: "Kutu Gıda", tutarK: 150000, paraBirimi: "EUR" },
    ]); // C-205'in tahsilatı çek kaydıyla zenginleştirilmeden (cekleriUygula) verildiği için hesaba girmiş sayılmaz
    expect(r.kasa.tahsilatlar).toHaveLength(r.kasa.ozet.tahsilat.adet);
    expect(r.kasa.hesapsiz.tahsilatlar.length).toBeGreaterThan(0);
    expect(h).toContain("€1.500");
  });
  it("AC-13 / AC-26: ay içindeki çekler tek tek; liste motordan; aynı ay iptal edilen ciro yok", () => {
    const c = r.kasa.cek;
    expect(c.tahsil.liste.map(x => x.no)).toEqual(["C-205"]);
    expect(c.ciro.liste.map(x => x.no)).toEqual(["C-200"]);
    expect(c.karsiliksiz.liste.map(x => x.no)).toEqual(["C-203"]);
    expect(c.karsiliksiz.liste[0]).toEqual({ id: 203, no: "C-203", banka: "Halkbank", tutarK: 300000, currency: "TRY", vade: "2026-09-24", tarih: "2026-09-25" });
    expect(KOD("src/lib/giderRaporu.js")).not.toMatch(/\b(c|cek|x)\.gecmis\b/);
    expect(h).toContain("AY İÇİNDE KARŞILIKSIZ ÇIKAN ÇEKLER");
    expect(h).not.toContain("C-204");
  });
  it("AC-14 / AC-19: rapor nesnesi (yeni alanlar hariç) bu işten önceki altın çıktıyla birebir aynı; hesapsız listeler değişmedi", () => {
    const altin = JSON.parse(oku("tests/fixtures/0059-gider-rapor-once.json"));
    const ayikla = (x) => {
      const y = JSON.parse(JSON.stringify(x));
      delete y.onceki; delete y.firma;
      if (y.gider && !y.gider.yururlukOncesi) { delete y.gider.vadeler; delete y.gider.tedarikciKalemleri; }
      delete y.kasa.odemeler; delete y.kasa.virmanlar; delete y.kasa.tahsilatlar;
      for (const k of ["elde", "tahsil", "ciro", "karsiliksiz"]) delete y.kasa.cek[k].liste;
      return y;
    };
    for (const ay of Object.keys(altin)) expect(ayikla(giderKasaRaporu(girdi(), ay)), ay).toEqual(altin[ay]);
  });
  it("AC-15 / AC-30: boş yeni tablolar basılmaz; eski boş durum satırları ve çek portföyünün dört satırı durur", () => {
    const bos = HTML({ hareketler: [], payments: [], cekler: [], services: [], partSales: [] });
    for (const t of ["ÖDEME HAREKETLERİ", "VİRMANLAR", ">TAHSİLATLAR<", "AY İÇİNDE TAHSİL EDİLEN ÇEKLER", "AYIN TAHSİLAT HAREKETLERİ"]) expect(bos, t).not.toContain(t);
    expect(bos).toContain("Hesabı belirtilmemiş ödeme ya da avans yok.");
    expect(bos).toContain("Hesabı belirtilmemiş tahsilat yok.");
    for (const s of ["Ay sonunda elde", "Ay içinde tahsil edilen", "Ay içinde ciro edilen", "Ay içinde karşılıksız çıkan"]) expect(bos, s).toContain(s);
  });
  it("AC-28: adında '<' olan tedarikçi bir kez kaçışlanır; bozulmaz, iki kez kaçışlanmaz", () => {
    expect(h).toContain("A&lt;B Ticaret");
    expect(h).not.toContain("A<B Ticaret");
    expect(h).not.toContain("&amp;lt;");
  });
});

describe("Spec 0059: motor genişlemeleri ve etiket zinciri (R20, R21, R24)", () => {
  const veri = { payments: PAYMENTS, services: SERVICES, partSales: PART_SALES, customers: CUSTOMERS, factory: { name: "Altuntaş Makina" }, bugun: "2026-09-30" };
  const aralik = { baslangic: "2026-09-01", bitis: "2026-09-30" };
  it("AC-25: hareketOzeti ve cekAyOzeti parametresiz çağrıda bugünkü çıktıyı verir; liste yalnız istenince", () => {
    const b = hesapBakiyeleri(HESAPLAR, H, veri, { aralik });
    const yalin = hareketOzeti(H, aralik, b), listeli = hareketOzeti(H, aralik, b, { liste: true });
    for (const t of ["odeme", "virman", "avans", "mahsup"]) { expect(yalin[t]).not.toHaveProperty("liste"); const { liste, ...geri } = listeli[t]; expect(geri).toEqual(yalin[t]); expect(liste).toHaveLength(yalin[t].adet); }
    const { liste: tl, ...tahGeri } = listeli.tahsilat;
    expect(tahGeri).toEqual(yalin.tahsilat);
    expect(tl).toHaveLength(yalin.tahsilat.adet);
    const cy = cekAyOzeti(CEKLER, PAYMENTS, "2026-09"), cl = cekAyOzeti(CEKLER, PAYMENTS, "2026-09", { liste: true });
    for (const k of ["tahsil", "ciro", "karsiliksiz"]) { expect(cy[k]).not.toHaveProperty("liste"); const { liste, ...geri } = cl[k]; expect(geri).toEqual(cy[k]); expect(liste).toHaveLength(cy[k].adet); }
    expect(cl.elde).toEqual(cy.elde); // triyaj: elde kovası listesiz (raporda basılmaz)
    // Triyaj: tahsilat satırı ham kaydı ve hesap nesnesini taşımaz.
    for (const t of tl) { expect(t).not.toHaveProperty("tahsilat"); expect(t).not.toHaveProperty("hesap"); expect(Object.keys(t).sort()).toEqual(["firma", "hesapAd", "hesapId", "kaynak", "paraBirimi", "tarih", "turAdi", "tutarK"]); }
  });
  it("AC-23 / AC-24: hedef ad zinciri saf kitaplıkta; GiderAlanlari aynı işlevleri yeniden dışa verir; rapor bileşen modülü almaz", () => {
    for (const ad of ["hedefEtiketi", "cokHedefliMi", "hedefAdi", "cokHedefliSatirlar", "HEDEF_AD", "tl2"]) expect(giderAlanlari[ad], ad).toBe(odemeYontemi[ad]);
    for (const f of ["src/lib/giderRaporu.js", "src/lib/raporSunumu.js", "src/lib/printTemplates.js", "src/lib/odemeYontemi.js"]) {
      expect(KOD(f), f).not.toMatch(/from ["'][^"']*components\//);
      expect(KOD(f), f).not.toMatch(/from ["']react["']|\.jsx["']/);
    }
  });
  it("AC-20: iki farklı sistem saatinde aynı girdi birebir aynı HTML; belge zaman okumaz", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-02T08:00:00Z")); const a = HTML();
    vi.setSystemTime(new Date("2027-03-15T23:30:00Z")); const b = HTML();
    vi.useRealTimers();
    expect(a).toBe(b);
    expect(HTML()).toBe(HTML());
    for (const f of ["src/lib/giderRaporu.js", "src/lib/raporSunumu.js"]) expect(KOD(f), f).not.toMatch(/new Date\(\)|Date\.now|yerelBugun|today\(/);
  });
});

describe("Spec 0059 triyaj", () => {
  it("bulgu 2: aynı adlı iki tedarikçinin kalemleri kimliğe göre ayrı gruplanır; her kalem bir kez basılır", () => {
    const ted2 = [...tedarikciler, { id: 14, ad: "Demir Bant" }];
    const giderler = GIDERLER.map(k => (k.id === 6 ? { ...k, tedarikciId: 14 } : k));
    const r = R({ tedarikciler: ted2, giderler });
    const grup = r.gider.tedarikciKalemleri.filter(t => t.ad === "Demir Bant");
    expect(grup.map(t => t.kalemler.map(k => k.aciklama))).toEqual(expect.arrayContaining([["Sac levha"], ["Bant"]]));
    expect(grup).toHaveLength(2);
    const genel = r.gider.kalemler.filter(k => !k.personel);
    expect(r.gider.tedarikciKalemleri.flatMap(t => t.kalemler)).toHaveLength(genel.length);
    const h = buildGiderKasaRaporuHtml(r);
    // Kalem listesi + kendi tedarikçisinin tablosu + ödeme hareketi: 3 (hatalı gruplamada iki tablo da ikisini içerirdi: 4).
    expect(h.split("Sac levha").length - 1).toBe(3);
    expect(h.split(">Bant<").length - 1).toBe(3);
  });
  it("bulgu 3: bölünmüş hedef etiketi belgenin para biçimiyle (fmtCur, kuruşsuz); ekran tl2'yi korur", () => {
    const hareketler = [...H.filter(x => x.id !== 112), { id: 130, tur: "odeme", tarih: "2026-09-11", tutar: 20000, yontem: "Havale", hesapId: 51, giderId: 2, taksitId: null }];
    const m = R({ hareketler }).kasa.odemeler.find(x => x.tarih === "2026-09-11");
    expect(m.hedef).toBe("Kiraya verene ₺16.000 + Vergi dairesine (stopaj) ₺4.000");
    expect(odemeYontemi.hedefEtiketi(K2, "kira", [{ hedef: "ana", payK: 1600050 }, { hedef: "stopaj", payK: 400000 }])).toBe("Kiraya verene 16.000,5 ₺ + Vergi dairesine (stopaj) 4.000 ₺");
    expect(ana(K2) && stopaj(K2)).toBeTruthy();
  });
  it("bulgu 4: önceki ay iç çağrısı detay listesi kurmaz", () => {
    const ic = giderKasaRaporu(girdi(), "2026-08", { _onceki: false });
    expect(ic.onceki).toBeNull();
    expect(ic.gider.vadeler).toEqual({ gecmis: [], yaklasan: [] });
    expect(ic.gider.tedarikciKalemleri).toEqual([]);
    expect(ic.kasa.odemeler).toEqual([]);
    expect(ic.kasa.tahsilatlar).toEqual([]);
    expect(ic.kasa.virmanlar).toEqual([]);
    for (const k of ["tahsil", "ciro", "karsiliksiz"]) expect(ic.kasa.cek[k]).not.toHaveProperty("liste");
    // Özet rakamları dış çağrının taşıdığıyla aynı.
    expect(R().onceki.gider).toEqual(ic.gider.ozet);
  });
});
