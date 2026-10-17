// Spec 0081: stopaj kartı kalkar, yan kutular kapalı başlar. Kaynak taramaları ve yazdırma tarafının değişmediği (R2, R3,
// R15, R16, C2, C4, C5).
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { giderKasaRaporu, buildGiderKasaRaporuHtml } from "../src/lib/giderRaporu";
import { girdi } from "./fixtures/0059-veri";

const kok = resolve(__dirname, "..");
const oku = (f) => readFileSync(resolve(kok, f), "utf8");
const BES = [
  ["src/components/gider/DonemRaporu.jsx", "KovaKarti", "{ rapor, turMap, katlanir = false }"], // spec 0089 ile (triyaj): sayı satırı tür haritası ister
  ["src/components/gider/DonemRaporu.jsx", "TurKirilimi", "{ rapor, katlanir = false }"],
  ["src/components/gider/DonemRaporu.jsx", "TedarikciKirilimi", "{ rapor, katlanir = false }"],
  ["src/components/gider/DonemRaporu.jsx", "YontemKirilimi", "{ kirilim, katlanir = false }"],
];
// Kutu içeriğini okuyan, gerçek Giderler'i çizen UI testleri (revizyon 2 P2; uygulamada ölçülen yedi dosya, plan §6).
const ICERIK_OKUYAN = ["giderler", "gider-coklu-odeme", "gider-ek-odeme", "kisitli-gider-0076", "satis-tevkifat-0079", "sgk-turu-0074", "calisan-sgk-0070"];

describe("Spec 0081: stopaj rakamı raporda kalır (R2, R3, C5, C6)", () => {
  it("AC-4: Aylık Gider ve Kasa Raporu'nda stopaj özeti ve 'GİDER · STOPAJ' kutusu bugünkü rakamlarla basılır", () => {
    const r = giderKasaRaporu(girdi(), "2026-09");
    expect(r.gider.ozet.stopaj).toBe(4000);
    // Spec 0084 ile güncellendi (R21/1): üç rakam aynen; nesne beyan dönemi tablosunu (`donemler`) de taşır.
    expect({ ...r.gider.stopaj, donemler: undefined }).toEqual({ kesilen: 4000, odenen: 4000, acik: 0, donemler: undefined });
    expect(buildGiderKasaRaporuHtml(r)).toMatch(/GİDER · STOPAJ[\s\S]*Kesilen stopaj[\s\S]*Ödenen[\s\S]*Ay sonunda açık/);
  });
  it("AC-5: motorun stopaj alanları duruyor; ekranda okuyan satır kaldırıldı", () => {
    const g = oku("src/lib/gider.js");
    expect(g).toMatch(/stopajToplam/);
    expect(g).toMatch(/stopajSatirlari/);
    const ekran = oku("src/components/Giderler.jsx");
    expect(ekran).not.toMatch(/stopajToplam|stopajSatirlari/);
    expect(ekran).not.toMatch(/Kesilen kira stopajı/);
  });
});

describe("Spec 0081: tek katlama mekanizması (R15, C1, C2)", () => {
  it("AC-29: beş bileşen katlanir prop'unu alır ve KartBolum'un collapsible'ına geçirir; Dönem Raporu beşine geçirir, Finans geçirmez", () => {
    const d = oku("src/components/gider/DonemRaporu.jsx");
    for (const [, ad, imza] of BES) expect(d, ad).toContain(`export const ${ad} = (${imza}) => {`);
    expect((d.match(/collapsible=\{katlanir\}/g) || []).length).toBe(4);
    const kdv = oku("src/components/gider/KdvKarsilastirmaKarti.jsx");
    expect(kdv).toMatch(/kisitli = null, katlanir = false \}\) => \{/);
    expect((kdv.match(/collapsible=\{katlanir\}/g) || []).length).toBe(1); // yalnız normal dal (R4/2)
    const g = oku("src/components/Giderler.jsx");
    for (const c of ["<KovaKarti rapor={rapor} turMap={turMap} katlanir />", "<TurKirilimi rapor={rapor} katlanir />", "<KdvKarsilastirmaKarti katlanir ",
      "<TedarikciKirilimi rapor={rapor} katlanir />", "<YontemKirilimi kirilim={donemKirilimi} katlanir />"]) expect(g, c).toContain(c);
    const f = oku("src/components/Finance.jsx");
    expect(f).toMatch(/<KdvKarsilastirmaKarti /);
    expect(f).not.toMatch(/katlanir/);
    for (const s of [d, kdv, g]) {
      expect(s).not.toMatch(/onAcikDegis=/); // denetimli katlama yok (yorumdaki adı sayılmaz)
      expect(s).not.toMatch(/<(KovaKarti|TurKirilimi|TedarikciKirilimi|YontemKirilimi|KdvKarsilastirmaKarti)\b[^>]*\bacik=/);
    }
  });
  it("R14: katlanan başlığın erişilebilirliği iki başlık yolunda tek yardımcıdan", () => {
    const t = oku("src/components/tasarim.jsx");
    expect(t).toMatch(/const katlanirBaslik = \(acikMi, degis\) => \(\{/);
    expect((t.match(/katlanirBaslik\(/g) || []).length).toBe(2); // kart + ayar başlık yolu
  });
  it("AC-11 (plan P6): App Giderler'i yalnız gider sekmesi açıkken çizer (sekmeden çıkınca bileşen kalkar, durum kaybolur)", () => {
    expect(oku("src/App.jsx")).toMatch(/\{activeTab === "gider"\s+&& giderYetki && <Giderler /);
  });
});

describe("Spec 0081 R16, C7: kutu içeriğini okuyan testler önce kutuyu açar", () => {
  it("AC-30: içerik okuyan yedi UI dosyası kutuAc'ı içe alır ve kullanır", () => {
    for (const f of ICERIK_OKUYAN) {
      const s = oku(`tests/ui/${f}.test.jsx`);
      expect(s, f).toContain('import { kutuAc } from "./kutuAc";');
      expect((s.match(/kutuAc\("/g) || []).length, f).toBeGreaterThan(0);
    }
    expect(oku("tests/ui/kutuAc.js")).toMatch(/expect\(dugme\.getAttribute\("aria-expanded"\)/);
  });
  it("AC-30 / C7: bilinen yokluk iddiaları kutu açıldıktan hemen sonra ölçülür", () => {
    const once = (f, iddia) => {
      const satirlar = oku(`tests/ui/${f}.test.jsx`).split("\n");
      const i = satirlar.findIndex(l => l.includes(iddia));
      expect(i, `${f}: ${iddia}`).toBeGreaterThan(0);
      expect(satirlar[i - 1], `${f}: ${iddia} öncesi`).toMatch(/kutuAc\("KDV Karşılaştırması"\)/);
    };
    once("satis-tevkifat-0079", 'expect(screen.getByTestId("kdv-karsilastirma")).toBeTruthy();');
    once("kisitli-gider-0076", 'expect(screen.queryByTestId("kisit-kdv-bilgi")).toBeNull();');
  });
  // Triyaj (genel kural): kutuların İÇİNDEKİ test kimlikleri kaynaktan çıkarılır; Giderler'i çizen her UI test dosyasında bu
  // kimliklerden birine giden yokluk iddiası (queryBy…toBeNull), aynı it bloğunda kendisinden önce bir kutuAc ister. İleride
  // eklenecek saf bir yokluk testi de böylece yakalanır (C7).
  it("AC-30 / C7: kutu içindeki kimliklere giden her yokluk iddiasından önce aynı testte kutuAc var", () => {
    // Her bileşenin gövdesi kendi kapanışına (satır başı "};") kadar; aradaki başka yardımcılar (ör. kalem listesinin
    // yöntem özeti) kutu içi sayılmaz.
    const govde = (dosya, ad) => { const k = oku(dosya); const i = k.indexOf(`export const ${ad} = `); expect(i, ad).toBeGreaterThan(-1); return k.slice(i, k.indexOf("\n};", i)); };
    const D = "src/components/gider/DonemRaporu.jsx";
    const kaynaklar = [govde(D, "KovaKarti"), govde(D, "TurKirilimi"), govde(D, "TedarikciKirilimi"), govde(D, "YontemKirilimi"),
      oku("src/components/gider/KdvKarsilastirmaKarti.jsx")];
    // Kimlikler doğrudan (data-testid="…") ya da satır yardımcısına argüman olarak ("yontem-kirilimi-personel" gibi) geçer; çok
    // kelimeli her dize literali aday sayılır (stil değerleri de girer, zararsız: testlerde kimlik olarak aranmazlar).
    const ic = new Set(kaynaklar.flatMap(k => [...k.matchAll(/"([a-z0-9]+(?:-[a-z0-9]+)+)"/g)].map(m => m[1]))
      .filter(id => !["kova-karti", "tur-kirilimi", "kdv-karsilastirma", "tedarikci-kirilimi", "yontem-kirilimi"].includes(id)));
    expect(ic.size).toBeGreaterThan(5);
    for (const id of ["personel-ayrinti", "satis-tevkifat-bilgi", "kisit-kdv-bilgi", "yontem-kirilimi-personel"]) expect(ic.has(id), id).toBe(true);
    const dosyalar = readdirSync(resolve(kok, "tests/ui")).filter(f => f.endsWith(".test.jsx")).map(f => `tests/ui/${f}`)
      .filter(f => /<Giderler\b/.test(oku(f)));
    const ihlal = [];
    for (const f of dosyalar) {
      const bloklar = oku(f).split(/\n\s*it\(/).slice(1);
      for (const b of bloklar) {
        const satirlar = b.split("\n");
        satirlar.forEach((l, i) => {
          const m = /queryBy(?:TestId|AllByTestId)\("([a-z0-9-]+)"\)\)\.(toBeNull\(\)|toEqual\(\[\]\))/.exec(l);
          if (m && ic.has(m[1]) && !satirlar.slice(0, i).some(x => /kutuAc\(/.test(x))) ihlal.push(`${f}: ${b.slice(0, 50)} → ${m[1]}`);
        });
      }
    }
    expect(ihlal).toEqual([]);
  });
  // Triyaj: kriterin kendi metni uygulanan sayıyla aynı kalmalı (spec AC-30 ve DoD eskiden "sekiz" diyordu, test yediyi uyguluyor).
  it("AC-30: spec'in AC-30 ve DoD satırları taramanın dosya sayısını (yedi) yazar", () => {
    const SAYI = { 7: "yedi" }[ICERIK_OKUYAN.length];
    expect(SAYI).toBe("yedi");
    const yol = ["specs/0081-donem-raporu-kutulari-kapali-baslar.md", "specs/done/0081-donem-raporu-kutulari-kapali-baslar.md"]
      .find(f => { try { oku(f); return true; } catch { return false; } });
    const satirlar = oku(yol).split("\n");
    const ac30 = satirlar.find(l => l.startsWith("- **AC-30.**"));
    const dod = satirlar.find(l => /^- \[[ x]\] \*\*Kutu içeriğini okuyan/.test(l));
    expect(ac30).toContain(`**${SAYI}** UI test dosyası`);
    expect(dod).toContain(`okuyan ${SAYI} UI test dosyası`);
    expect(`${ac30}\n${dod}`).not.toMatch(/\b(sekiz|on) UI test/);
  });
  it("AC-32: görüntü aracının üç içerik ekranı kutuyu açar", () => {
    const s = oku("scripts/evidence/0009-sayfa.jsx");
    // Uygulamada bulunan üç ekran daha (plan §6): Gider Türü Kırılımı'nın içindeki personel ayrıntısını çekiyorlar.
    for (const [e, b] of [["giderler-yontem-kirilimi", "Ödeme Yöntemi Kırılımı"], ["giderler-0076-kdv", "KDV Karşılaştırması"], ["giderler-0079-kdv", "KDV Karşılaştırması"],
      ["giderler-personel-ayrinti-kapali", "Gider Türü Kırılımı"], ["giderler-personel-ayrinti-acik", "Gider Türü Kırılımı"], ["giderler-0070-personel-ayrinti", "Gider Türü Kırılımı"]]) {
      const satir = s.split("\n").find(l => l.includes(`"${e}":`));
      expect(satir, e).toContain(`"tikla:${b}"`);
    }
    // Genel kural: kutunun içindeki personel aç/kapasına ("▸ Aç") giden her adımdan önce kutu açılır.
    for (const satir of s.split("\n").filter(l => /"~?(dugme:)?▸ Aç"/.test(l))) {
      expect(satir.indexOf('"tikla:Gider Türü Kırılımı"'), satir.trim().slice(0, 60)).toBeGreaterThan(-1);
      expect(satir.indexOf('"tikla:Gider Türü Kırılımı"')).toBeLessThan(satir.search(/"~?(dugme:)?▸ Aç"/));
    }
  });
  it("DoD: AC-1…AC-33'ün her biri bir test adında (0081 dosyalarında 'AC-n', başka dosyalarda 'spec 0081 AC-n')", () => {
    const gez = (d) => readdirSync(resolve(kok, d)).flatMap(ad => {
      const f = `${d}/${ad}`;
      return statSync(resolve(kok, f)).isDirectory() ? gez(f) : /\.test\.jsx?$/.test(ad) ? [f] : [];
    });
    const bulunan = new Set();
    for (const f of gez("tests")) {
      const kendi = f.includes("0081");
      for (const [, baslik] of oku(f).matchAll(/\bit\(\s*"([^"]+)"/g)) {
        if (kendi) for (const [, n] of baslik.matchAll(/AC-(\d+)/g)) bulunan.add(Number(n));
        else for (const [, grup] of baslik.matchAll(/spec 0081 ((?:AC-\d+(?: \/ )?)+)/g)) for (const [, n] of grup.matchAll(/AC-(\d+)/g)) bulunan.add(Number(n));
      }
    }
    expect(Array.from({ length: 33 }, (_, i) => i + 1).filter(n => !bulunan.has(n))).toEqual([]);
  });
  it("DoD (C4): motor, sunucu, izin, veritabanı ve birleştirme bu spec'i bilmez", () => {
    for (const f of ["src/lib/gider.js", "src/lib/giderRaporu.js", "electron/serverAuth.cjs", "electron/server.cjs", "electron/db.cjs", "src/lib/merge.js",
      "src/lib/permissions.js"]) expect(oku(f), f).not.toMatch(/0081/);
  });
});
