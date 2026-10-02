// Spec 0001 AC-56 / C7b / X14 / X16: çalışan bazlı personel tutarı ve elden bileşen hiçbir yazdırma
// çıktısına ve hiçbir CSV/XLSX dışa aktarma dosyasına girmez. Yazdırma şablonları ve dışa aktarma
// üreticileri gider/personel alanlarını HİÇ okumamalı; biri ileride eklerse bu test kırılır.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..");
const oku = (p) => readFileSync(path.join(root, p), "utf-8");
// Spec 0023: çalışan ek ödemeleri (alan, tablo ve tür kodu) de listede; listeye eklenmeyen ad testi yeşil bırakıp sızabilirdi.
const YASAKLI = /resmiTutar|eldenTutar|resmiMaliyet|eldenMaliyet|calisanAd|giderler|giderTanimlari|standartGiderler|tedarikciler|ekOdemeler|gider_ek_odemeleri|EK_ODEME_TUR|fazlaCalisma/;

// Spec 0060 R28: Aylık Gider ve Kasa Raporu'nun tür bazında ek ödeme kutusu (yorum işaretleriyle sınırlı) ve onun dışı.
const EK_KUTU = /<!--ek-odeme-->[\s\S]*?<!--\/ek-odeme-->/;
const ekKutusuz = (h) => h.replace(EK_KUTU, "");
const ekKutusu = (h) => (h.match(EK_KUTU) || [""])[0];

describe("AC-56 / spec 0047 AC-25: personel tutarı yazdırma ve dışa aktarmaya girmez (müşteri şablonları, aylık rapor ve dışa aktarma gider alanlarını okumamaya devam eder)", () => {
  it("yazdırma şablonları (printTemplates.js) gider/personel alanlarını okumaz", () => {
    expect(oku("src/lib/printTemplates.js")).not.toMatch(YASAKLI);
  });
  // Spec 0059 R19, R32 (AC-4): iki raporun ortak sunum modülü hiçbir veri alanı adı bilmez; printTemplates.js ile aynı denetim.
  it("ortak sunum modülü (raporSunumu.js) gider/personel alanlarını okumaz", () => {
    expect(oku("src/lib/raporSunumu.js")).not.toMatch(YASAKLI);
  });
  it("aylık rapor motoru gider verisi almaz (X14: rapor şablonu 0002 ile birlikte değişecek)", () => {
    expect(oku("src/lib/aylikRapor.js")).not.toMatch(YASAKLI);
  });
  it("CSV/XLSX dışa aktarma (SettingsExport.jsx) gider/personel alanlarını okumaz", () => {
    expect(oku("src/components/settings/SettingsExport.jsx")).not.toMatch(YASAKLI);
  });
  it("gider bileşenleri yazdırma API'sini çağırmaz", () => {
    const dosyalar = ["src/components/Giderler.jsx", "src/components/GiderForm.jsx",
      ...readdirSync(path.join(root, "src/components/gider")).map(f => `src/components/gider/${f}`)];
    for (const f of dosyalar) expect(oku(f), f).not.toMatch(/appPrint|printHtml|downloadCSV|XLSX|writeFile/);
  });
});

// Spec 0020 AC-10 / R6: personel kalemi artık makinaya ve modele atanabilir; atama ve makina maliyeti çıktısı da
// hiçbir yazdırma, e-posta veya dışa aktarma üreticisine girmez. Maliyet yalnız ekranda (MakinaMaliyetDetay) çizilir.
describe("Spec 0020 AC-10: atanmış personel kalemi ve makina maliyeti çıktılara girmez", () => {
  const MALIYET = /makinaMaliyet|hesaplaMakinaMaliyetleri|makinaKarlilik|karlilikOzeti|dogrudanKalemler|malzemePaylari|kalemGorunenAd|PERSONEL_ETIKETI|Personel gideri|atamaTur|modelSatirlari|kovaDagilimi|kalemKovalariKurus/;
  it.each(["src/lib/printTemplates.js", "src/lib/raporSunumu.js", "src/lib/aylikRapor.js", "src/lib/mailTemplates.js", "src/components/settings/SettingsExport.jsx",
    "src/components/settings/csvUtils.js", "src/components/Finance.jsx", "src/components/Documents.jsx", "src/components/stock/UretimFormu.jsx"])(
    "%s atama ve makina maliyeti alanlarını okumaz", (f) => {
      expect(oku(f)).not.toMatch(MALIYET);
    });
  it("müşteri detayında makina maliyeti yalnız ekrandaki maliyet kutusuna verilir, yazdırma yollarına girmez", () => {
    const satirlar = oku("src/components/customers/CustomerDetailModal.jsx").split("\n").filter(l => /makinaKarlilik\(/.test(l));
    expect(satirlar).toHaveLength(1);
    expect(satirlar[0]).toContain("<MakinaMaliyetDetay detay={makinaKarlilik(");
  });
});

// Spec 0041 AC-27 (X6): gider ödemelerinin yöntem kırılımı Aylık Faaliyet Raporu'na ve CSV/XLSX dışa aktarmaya girmez.
describe("Spec 0041 AC-27: yöntem kırılımı yazdırma ve dışa aktarmaya girmez", () => {
  it("AC-27: çıktı dosyaları yöntem motorunu ve gider ödeme hareketlerini okumaz", () => {
    const YONTEM = /odemeYontemi|yontemKirilimi|donemYontemKirilimi|hareketPaylari|hesapHareketleri/;
    for (const f of ["src/lib/printTemplates.js", "src/lib/raporSunumu.js", "src/lib/aylikRapor.js", "src/components/settings/SettingsExport.jsx"]) {
      expect(oku(f)).not.toMatch(YONTEM);
    }
  });
});

// Spec 0042 AC-11 (C6, R15): personelin resmi/elden hedef adları ve tutarları yazdırma ve dışa aktarmaya girmez.
describe("Spec 0042 AC-11: personel hedefleri çıktılara girmez", () => {
  it("AC-11: çıktı dosyaları HEDEF.ELDEN değerini, hedef adlarını ve personel hedef hesabını okumaz", () => {
    const HEDEF_DESEN = /HEDEF\.ELDEN|["']elden["']|hedefAdi|personelHedefKurus|HEDEF_AD\b/;
    for (const f of ["src/lib/printTemplates.js", "src/lib/raporSunumu.js", "src/lib/aylikRapor.js", "src/components/settings/SettingsExport.jsx"]) {
      expect(oku(f)).not.toMatch(HEDEF_DESEN);
    }
  });
});

// Spec 0054 R12, R19 (AC-19, AC-31): ek ödeme hedeflerinin değerleri, adları ve hedef hesabı hiçbir yazdırma ve dışa aktarma
// çıktısına girmez. 0042'nin kayıtları (yukarıda) aynen kalır.
describe("Spec 0054 AC-19 / AC-31: ek ödeme hedefleri çıktılara girmez", () => {
  it("AC-31: çıktı dosyaları ek hedef değerlerini, adlarını ve personelHedefKirilimi'ni okumaz", () => {
    const DESEN = /["']ekResmi["']|["']ekElden["']|HEDEF\.EK_RESMI|HEDEF\.EK_ELDEN|Ek ödeme \(resmi\)|Ek ödeme \(elden\)|Maaş \(resmi\)|Maaş \(elden\)|personelHedefKirilimi|personelHedefTutarlari|PERSONEL_HEDEFLERI/;
    for (const f of ["src/lib/printTemplates.js", "src/lib/raporSunumu.js", "src/lib/aylikRapor.js", "src/components/settings/SettingsExport.jsx", "src/lib/giderRaporu.js"]) {
      expect(oku(f), f).not.toMatch(DESEN);
    }
  });
  it("AC-19: dört hedefli, ek ödemesi kısmen ödenmiş personelle üretilen aylık rapor hedef adı ve ek ödeme tutarı basmaz", async () => {
    const { giderKasaRaporu, buildGiderKasaRaporuHtml } = await import("../src/lib/giderRaporu");
    const { giderKalemDogrula, turHaritasi, HEDEF } = await import("../src/lib/gider");
    const turler = [{ id: 3, ad: "Maaşlar", davranis: "personel" }];
    let n = 1;
    const k = giderKalemDogrula({ id: 9, tarih: "2026-09-30", turId: 3, calisanId: 7, calisanAd: "Behiye Sarıkamışlıoğlu", resmiTutar: 43219, eldenTutar: 18765,
      ekOdemeler: [{ tur: "prim", aciklama: "Yıl sonu primi", resmiTutar: 1357, eldenTutar: 2468 }], sonOdemeTarihi: "2026-10-05" }, { turMap: turHaritasi(turler), uid: () => ++n }).kayit;
    expect(k.taksitler.map(t => t.hedef)).toEqual([HEDEF.ANA, HEDEF.ELDEN, HEDEF.EK_RESMI, HEDEF.EK_ELDEN]);
    const id = (h) => k.taksitler.find(t => t.hedef === h).id;
    const hareketler = [{ id: 1, tur: "odeme", tarih: "2026-09-30", tutar: 1357, yontem: "Nakit", hesapId: null, giderId: 9, taksitId: id(HEDEF.EK_RESMI) },
      { id: 2, tur: "odeme", tarih: "2026-09-30", tutar: 43219, yontem: "Nakit", hesapId: null, giderId: 9, taksitId: id(HEDEF.ANA) }];
    // Ay toplamı (44.576) yazılabilir; ek hedefin tutarı ayrı satır olarak yazılmaz.
    const html = buildGiderKasaRaporuHtml(giderKasaRaporu({ giderler: [k], hareketler, turler, yururlukAy: "2026-01", hesaplar: [] }, "2026-09"));
    for (const yasak of ["Behiye", "Ek ödeme (resmi)", "Ek ödeme (elden)", "Maaş (resmi)", "Maaş (elden)", "ekResmi", "ekElden", "1.357", "2.468", "Yıl sonu"]) {
      expect(html, yasak).not.toContain(yasak);
    }
    expect(html).toContain("Personel gideri");
  });
});

// Spec 0047 (R22, R35, R36, C8): gider verisinin yazdırılması artık bir yerde serbest: Aylık Gider ve Kasa Raporu. Sınır
// "toplam yazdırılır, çalışan bazlı tutar yazdırılmaz"dır ve kaynak taramasıyla ifade edilemez; koruma çıktı temellidir.
// Yukarıdaki dört denetim GEVŞETİLMEDİ: rapor kurucusu printTemplates.js dışında, düğme gider/ klasörünün dışında.
describe("Spec 0047: Aylık Gider ve Kasa Raporu gizliliği", () => {
  it("AC-41 / AC-42: rapor kurucusu printTemplates.js dışında, düğme gider/ klasörünün dışında; Giderler.jsx yazdırma çağırmaz", () => {
    expect(readdirSync(path.join(root, "src/components/gider"))).not.toContain("GiderKasaRaporuDugmesi.jsx");
    expect(oku("src/components/rapor/GiderKasaRaporuDugmesi.jsx")).toMatch(/printHtml/);
    expect(oku("src/lib/printTemplates.js")).not.toMatch(/giderKasaRaporu|GiderKasa/);
    expect(oku("src/lib/raporSunumu.js")).not.toMatch(/giderKasaRaporu|GiderKasa/); // spec 0059 R19
    expect(oku("src/components/Giderler.jsx")).toMatch(/GiderKasaRaporuDugmesi/);
  });
  it("AC-24: ayırt edici çalışan verisiyle üretilen raporun çıktısında ad, resmi/elden tutarı, ek ödeme, tek tek hesapsız ödeme ve avans yok", async () => {
    const { giderKasaRaporu, buildGiderKasaRaporuHtml } = await import("../src/lib/giderRaporu");
    const { giderKalemDogrula, turHaritasi, HEDEF } = await import("../src/lib/gider");
    const turler = [{ id: 3, ad: "Maaşlar", davranis: "personel" }];
    let n = 1;
    const kayit = (f) => giderKalemDogrula(f, { turMap: turHaritasi(turler), uid: () => ++n }).kayit;
    const behiye = kayit({ id: 9, tarih: "2026-09-30", turId: 3, calisanId: 7, calisanAd: "Behiye Sarıkamışlıoğlu", resmiTutar: 43219, eldenTutar: 18765,
      ekOdemeler: [{ tur: "fazlaCalisma", aciklama: "Cumartesi mesaisi", resmiTutar: 1357, eldenTutar: 2468 }], sonOdemeTarihi: "2026-10-05" });
    const yusuf = kayit({ id: 10, tarih: "2026-09-30", turId: 3, calisanId: 8, calisanAd: "Yusuf Demirkazık", resmiTutar: 25000, eldenTutar: 6543, sonOdemeTarihi: "2026-10-05" });
    const elden = (k) => k.taksitler.find(t => t.hedef === HEDEF.ELDEN).id;
    // Triyaj bulgu 1: elden kısımları hesap seçilmeden ödendi, avanslar hesapsız verildi. Tek tek kâğıda düşmemeli.
    const hareketler = [
      { id: 1, tur: "avans", tarih: "2026-09-10", tutar: 4321, calisanId: 7, hesapId: null },
      { id: 2, tur: "avans", tarih: "2026-09-11", tutar: 1200, calisanId: 8, hesapId: null },
      { id: 3, tur: "odeme", tarih: "2026-09-30", tutar: 21233, yontem: "", hesapId: null, giderId: 9, taksitId: elden(behiye) },
      { id: 4, tur: "odeme", tarih: "2026-09-30", tutar: 6543, yontem: "", hesapId: null, giderId: 10, taksitId: elden(yusuf) },
    ];
    const html = buildGiderKasaRaporuHtml(giderKasaRaporu({ giderler: [behiye, yusuf], hareketler, turler, yururlukAy: "2026-01", hesaplar: [] }, "2026-09"));
    for (const yasak of ["Behiye", "Sarıkamışlıoğlu", "Yusuf", "Demirkazık", "43.219", "18.765", "21.233", "6.543", "1.357", "2.468", "4.321", "1.200", "Cumartesi", "Cumartesi mesaisi", "Resmi", "Elden"]) {
      // Spec 0060 R21 (AC-32) ile daraltıldı: "mesai" → "Cumartesi mesaisi" (tür adı "Fazla mesai" serbest; açıklama yasak).
      // R28 (AC-39): eski yasaklar ek ödeme kutusu DIŞINDAKİ belgeye aynen uygulanır.
      expect(ekKutusuz(html), yasak).not.toContain(yasak);
    }
    expect(html).toContain("Personel gideri");
    expect(html).toContain("Personel ödemeleri · 2 adet");
    expect(html).toContain("Çalışan avansları · 2 adet");
  });
});

// Spec 0059 R8, R10, R15, R16 (AC-16, AC-17, AC-18, AC-32): yeni detay tablolarında (vadesi geçmiş / yaklaşan kalemler, ödeme
// hareketleri, virman, tahsilat, çek, tedarikçi kalemleri) çalışan adı ve kişi bazlı tutar yok; personel, avans ve mahsup
// birer toplu satır ve personel satırının hedef hücresi boş. Koruma çıktı temellidir, kaynak taraması destektir.
describe("Spec 0059: yeni detay tabloları gizliliği", () => {
  it("AC-16 / AC-17 / AC-18: ayırt edici çalışanla üretilen belgede ad, maaş ve prim tutarı, hedef adı yok; personel toplu satır", async () => {
    const { giderKasaRaporu, buildGiderKasaRaporuHtml } = await import("../src/lib/giderRaporu");
    const { girdi, GIDERLER, H, AD } = await import("./fixtures/0059-veri");
    // Personel kalemi vadesi geçmiş olsun ki vadesi geçmiş tablosuna da girsin.
    const giderler = GIDERLER.map(k => (k.id === 4 ? { ...k, sonOdemeTarihi: "2026-09-25", taksitler: k.taksitler.map(t => ({ ...t, vade: "2026-09-25" })) } : k));
    const r = giderKasaRaporu(girdi({ giderler }), "2026-09");
    const html = buildGiderKasaRaporuHtml(r);
    // Spec 0060 R28 (AC-39): eski yasaklar ek ödeme kutusu dışındaki belgeye aynen; kutu ayrıca sınanır (yalnız tür + toplam).
    for (const yasak of [AD, "Zümrüt", "Kaplanoğlu", "31.111", "17.777", "2.345", "Eylül primi", "Resmi", "Elden", "Maaş (", "Ek ödeme ("]) expect(ekKutusuz(html), yasak).not.toContain(yasak);
    for (const yasak of [AD, "Zümrüt", "31.111", "17.777", "Eylül primi", "Resmi", "Elden", "Maaş (", "Ek ödeme ("]) expect(ekKutusu(html), yasak).not.toContain(yasak);
    const personelVade = r.gider.vadeler.gecmis.find(v => v.personel);
    expect(personelVade).toMatchObject({ tur: "Personel gideri", tedarikci: "", tarih: null });
    for (const kisim of [r.gider.vadeler, r.kasa.odemeler, r.gider.tedarikciKalemleri]) expect(JSON.stringify(kisim)).not.toContain("Zümrüt");
    const toplu = r.kasa.odemeler.filter(m => m.toplu);
    expect(toplu.map(m => m.kalem)).toEqual(["Personel ödemeleri · 1 adet", "Çalışan avansları · 2 adet", "Avanstan mahsup · 1 adet"]);
    expect(toplu.every(m => !m.hedef && m.tarih === null)).toBe(true);
    expect(html).toMatch(/Ay geneli<\/td><td[^>]*><\/td><td[^>]*><\/td><td[^>]*>Personel ödemeleri · 1 adet<\/td><td[^>]*><\/td>/);
  });
  it("AC-16: rapor kurucusu hatırlatıcının kalem nesnesini okumaz; taraf adı yalnız personel dışı satırda", () => {
    const kod = oku("src/lib/giderRaporu.js").split("\n").filter(l => !l.trim().startsWith("//")).join("\n");
    expect(kod).not.toMatch(/\b(v|oge|o)\.kalem\b/);
    const taraf = kod.split("\n").filter(l => /\.taraf\b/.test(l));
    expect(taraf).toHaveLength(1);
    expect(taraf[0]).toContain("tedarikci: v.taraf");
    expect(kod).toMatch(/if \(v\.tur === "personel"\) return \{ personel: true, [^}]*tedarikci: ""/);
  });
  it("AC-32: dört hedefli, ek ödemesi kısmen ödenmiş personelle yeni tablolar da hedef adı ve ek tutar basmaz", async () => {
    const { giderKasaRaporu, buildGiderKasaRaporuHtml } = await import("../src/lib/giderRaporu");
    const { giderKalemDogrula, turHaritasi, HEDEF } = await import("../src/lib/gider");
    const turler = [{ id: 3, ad: "Maaşlar", davranis: "personel" }];
    let n = 1;
    const k = giderKalemDogrula({ id: 9, tarih: "2026-09-30", turId: 3, calisanId: 7, calisanAd: "Behiye Sarıkamışlıoğlu", resmiTutar: 43219, eldenTutar: 18765,
      ekOdemeler: [{ tur: "prim", aciklama: "Yıl sonu primi", resmiTutar: 1357, eldenTutar: 2468 }], sonOdemeTarihi: "2026-09-30" }, { turMap: turHaritasi(turler), uid: () => ++n }).kayit;
    const id = (h) => k.taksitler.find(t => t.hedef === h).id;
    const hareketler = [{ id: 1, tur: "odeme", tarih: "2026-09-30", tutar: 1357, yontem: "Nakit", hesapId: 5, giderId: 9, taksitId: id(HEDEF.EK_RESMI) },
      { id: 2, tur: "odeme", tarih: "2026-09-30", tutar: 43219, yontem: "Nakit", hesapId: 5, giderId: 9, taksitId: id(HEDEF.ANA) }];
    const hesaplar = [{ id: 5, ad: "Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2026-01-01" }];
    const html = buildGiderKasaRaporuHtml(giderKasaRaporu({ giderler: [k], hareketler, turler, yururlukAy: "2026-01", hesaplar }, "2026-09"));
    for (const yasak of ["Behiye", "Ek ödeme (resmi)", "Ek ödeme (elden)", "Maaş (resmi)", "Maaş (elden)", "ekResmi", "ekElden", "1.357", "2.468", "43.219", "Yıl sonu"]) {
      expect(html, yasak).not.toContain(yasak);
    }
    expect(html).toContain("Personel ödemeleri · 2 adet");
  });
});

// Spec 0059 triyaj bulgu 1: kalemi kalıcı silinmiş ödeme (çöpten kalıcı silinen personel kalemi dahil) tarihli satır olarak
// basılmaz; "Silinmiş kalem ödemeleri" toplu satırına iner, kişinin tutarı kâğıda düşmez.
describe("Spec 0059 triyaj: silinmiş kalemin ödemesi", () => {
  it("AC-17: personel kalemi kalıcı silinince ödemesi ödeme tablosunda tek satır ve tutarıyla basılmaz", async () => {
    const { giderKasaRaporu, buildGiderKasaRaporuHtml } = await import("../src/lib/giderRaporu");
    const { girdi, GIDERLER } = await import("./fixtures/0059-veri");
    const r = giderKasaRaporu(girdi({ giderler: GIDERLER.filter(k => k.id !== 4) }), "2026-09");
    expect(r.kasa.odemeler.filter(m => !m.toplu).some(m => m.kalem === "Silinmiş gider")).toBe(false);
    expect(r.kasa.odemeler.find(m => m.toplu && m.kalem.startsWith("Silinmiş kalem ödemeleri"))).toMatchObject({ tarih: null, kalem: "Silinmiş kalem ödemeleri · 1 adet" });
    const html = buildGiderKasaRaporuHtml(r);
    expect(html).not.toMatch(/30\/09\/2026<\/td><td[^>]*>Kasa<\/td><td[^>]*>Nakit<\/td>/);
    expect(html).toMatch(/Ay geneli<\/td><td[^>]*><\/td><td[^>]*><\/td><td[^>]*>Silinmiş kalem ödemeleri · 1 adet<\/td>/);
  });
});
