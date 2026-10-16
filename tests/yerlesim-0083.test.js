// Spec 0083: Giderler görünüm sırası ve Kasa şeritlerinin sayfa sonuna inmesi. Kaynak taramaları (R4, R5, R14, R16, C1, C2;
// AC-6, AC-7, AC-18, AC-23, AC-24, AC-25) ve AC adı kapsamı.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { HESAPSIZ_NOTU } from "../src/lib/kasa";

const kok = resolve(__dirname, "..");
const oku = (f) => readFileSync(resolve(kok, f), "utf8");
const gez = (d) => readdirSync(resolve(kok, d)).flatMap(ad => {
  const f = `${d}/${ad}`;
  return statSync(resolve(kok, f)).isDirectory() ? gez(f) : /\.(jsx?|cjs|mjs)$/.test(ad) ? [f] : [];
});
// Spec 0088 ile: Üretim Partileri Makina Maliyeti ekranına taşındı (R23/2); Giderler dört görünüm.
const ETIKETLER = ["Dönem Raporu", "Tedarikler ve Ekstre", "Makina Kârlılığı", "Makina ve Model"];
// P5: sıra, beş etiketi TEK bir dizi değişmezinde birlikte taşıyan yerde yazılıdır. İç içe köşeli parantezi olmayan her dizi
// parçası taranır (GORUNUMLER nesne dizisi süslü parantez taşır, köşeli değil).
const siraDizisiVarMi = (metin) => [...metin.matchAll(/\[[^[\]]*\]/g)].some(m => ETIKETLER.every(e => m[0].includes(`"${e}"`)));
// Gerekçeli istisnalar: sıranın kendisini sınayan iki test (0082 C4 ile ters çevrilen kriter ve bu işin AC-1'i) ve bu taramanın
// kendi beklenen sırası (ETIKETLER).
const ISTISNA = ["tests/ui/standart-kalkar-0082.test.jsx", "tests/ui/yerlesim-0083.test.jsx", "tests/yerlesim-0083.test.js"];

describe("Spec 0083: kaynak taramaları", () => {
  it("AC-6: dört görünüm etiketini (spec 0088 ile) tek dizide birlikte taşıyan tek kaynak dosya Giderler.jsx; görüntü aracı adları ayrı adımlarda taşır", () => {
    const dosyalar = ["src", "scripts/evidence", "tests"].flatMap(gez);
    const bulunan = dosyalar.filter(f => siraDizisiVarMi(oku(f)));
    expect(bulunan.filter(f => !ISTISNA.includes(f))).toEqual(["src/components/Giderler.jsx"]);
    for (const f of ISTISNA) expect(siraDizisiVarMi(oku(f)), `eskimiş istisna: ${f}`).toBe(true);
    const arac = oku("scripts/evidence/0009-sayfa.jsx");
    expect(ETIKETLER.every(e => arac.includes(e))).toBe(true); // hepsini taşır (dosya düzeyinde tarama burada kırılırdı)
    expect(siraDizisiVarMi(arac)).toBe(false);
  });
  it("AC-24 / C2: GORUNUMLER tek satır ve yeni sırada; sözlüğün üç Giderler.jsx atfı tasarim-kaynak ile denetlenir", () => {
    const g = oku("src/components/Giderler.jsx");
    const satir = g.split("\n").find(l => l.startsWith("const GORUNUMLER = ["));
    expect(satir).toMatch(/\];$/);
    expect([...satir.matchAll(/label: "([^"]+)"/g)].map(m => m[1])).toEqual(ETIKETLER);
    expect([...satir.matchAll(/value: "([^"]+)"/g)].map(m => m[1])).toEqual(["rapor", "tedarikci", "karlilik", "makina"]);
    expect(g).toMatch(/const DONEMSIZ = new Set\(\);/); // spec 0088 AC-42/2: dönemsiz görünüm kalmadı
    expect(g).toMatch(/GORUNUMLER\.some\(x => x\.value === g\) \? g : "rapor"/); // açılış dizinin sırasından değil (R2)
  });
  it("AC-7 (kaynak): çubuğun kabı flex 0 0 auto; sağ grup kendi kabında bütün olarak", () => {
    const g = oku("src/components/Giderler.jsx");
    expect(g).toMatch(/<div style=\{\{ minWidth: 0, flex: "0 0 auto", maxWidth: "100%" \}\}><Segment ariaLabel="Görünüm" options=\{GORUNUMLER\}/);
    const i = g.indexOf('<Segment ariaLabel="Görünüm"');
    expect(g.slice(i, i + 400)).toMatch(/<div style=\{\{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" \}\}>/);
  });
  it("AC-18 / C1: metinler değişmedi: HESAPSIZ_NOTU ve deneme şeridi metni bugünkü hâliyle", () => {
    expect(HESAPSIZ_NOTU).toBe("Bakiye, hesabı belirtilmiş hareket ve tahsilatları sayar. Hesabı belirtilmemiş kayıtlar aşağıda ayrıca listelenir.");
    expect(oku("src/components/Kasa.jsx")).toMatch(/export const denemeDonemiMetni = \(bitis\) => `Deneme dönemi \$\{bitis\.split\("-"\)\.reverse\(\)\.join\("\."\)\}'de biter\. O tarihten sonra hareketi olan hesap silinemez, yalnız kapatılabilir\.`;/);
  });
  it("R6, R7, C3: Kasa'da blok Çalışan avanslarından sonra, görünüm dalının içinde; sekiz parçanın iç sırası aynen", () => {
    const k = oku("src/components/Kasa.jsx");
    const ca = k.indexOf("<CalisanAvanslari ");
    const sira = ['testId="deneme-donemi"', 'testId="hesapsiz-notu"', 'data-testid="hesapsiz-esik-satiri"', 'data-testid="hesapsiz-sayilar"',
      'data-testid="kapsam-disi-aciklama"', 'testId="hesapsiz-odemeler"', 'testId="hesapsiz-tahsilatlar"', 'testId="kapsam-disi-listesi"'].map(x => {
      const i = k.indexOf(x); expect(i, x).toBeGreaterThan(-1); return i;
    });
    expect(sira[0]).toBeGreaterThan(ca);
    expect([...sira].sort((a, b) => a - b)).toEqual(sira);
    const dalSonu = k.indexOf("</>)}", ca);
    expect(sira[sira.length - 1]).toBeLessThan(dalSonu);
    expect(k.indexOf('testId="hesap-listesi"') < 0 || k.indexOf('data-testid="hesap-listesi"') < ca).toBe(true);
  });
  it("AC-23: sözlüğün UyariSeridi bölümünde istisna maddesi ve Kasa örneği", () => {
    const s = oku("docs/tasarim-sozlugu.md");
    const b = s.slice(s.indexOf("## UyariSeridi"), s.indexOf("\n## ", s.indexOf("## UyariSeridi") + 5));
    expect(b).toMatch(/\*\*İstisna, sayfa sonundaki şerit \(spec 0083 R16\):\*\*/);
    expect(b).toMatch(/\*\*Örnek:\*\* `src\/components\/Kasa\.jsx:\d+` \(sayfa sonundaki şerit, spec 0083\)/);
  });
  // Spec 0084 ile güncellendi (D1): SHA sabitlemesi yalnız 0083'ün kendi kanıt turu içindi; 0084 araca yeni ekran ekledi.
  // Kalan iddia: 0083 raporunun ekranlarının hepsi araçta durur (bu işin kanıtı yeniden üretilebilir).
  it("AC-25: 0083 raporundaki her ekran görüntü aracında tanımlı", () => {
    const arac = oku("scripts/evidence/0009-sayfa.jsx");
    const ekranlar = new Set(JSON.parse(oku("docs/evidence/0083-piksel-raporu.json")).map(x => x.ad.replace(/-(aydinlik|karanlik)\.png$/, "")));
    // Spec 0088 ile (R23/4): Giderler › Üretim Partileri ekranları Makina Maliyeti'ne taşındı ve araçta yeni adlarıyla durur.
    const TASINAN = { "giderler-uretim-partileri": "maliyet-uretim-partileri", "giderler-uretim-partisi-formu": "maliyet-uretim-partisi-formu" };
    const eksik = [...ekranlar].map(e => TASINAN[e] || e).filter(e => !arac.includes(`"${e}"`) && !arac.includes(`"${e.split("-").pop()}"`));
    expect(eksik).toEqual([]);
  });
  it("AC-20 / R14 (git farkının taramayla desteklenen yarısı): motor, sunucu, veritabanı, birleştirme ve yazdırma bu spec'i bilmez", () => {
    for (const f of ["src/lib/kasa.js", "src/lib/gider.js", "src/lib/merge.js", "src/lib/printTemplates.js", "src/lib/giderRaporu.js", "electron/db.cjs", "electron/serverAuth.cjs", "electron/server.cjs"])
      expect(oku(f), f).not.toMatch(/0083/);
  });
  it("AC-21: değişen küme rapordan; 14 Çek Portföyü ekranı ve giderler-mahsup 0; değişen ekranın kaydı olan her dosyada 'degisti' (uygulamada) ya da taban raporunda 'ayni' (done)", () => {
    const rapor = JSON.parse(oku("docs/evidence/0083-piksel-raporu.json"));
    const piksel = {};
    for (const x of rapor) { const [, ekran, tema] = x.ad.match(/^(.+)-(aydinlik|karanlik)\.png$/); (piksel[ekran] ||= {})[tema] = x.piksel || 0; }
    const degisen = new Set(Object.keys(piksel).filter(e => piksel[e].aydinlik > 0 || piksel[e].karanlik > 0));
    // Yarım değişen ekran yok: bir temada değişen öbüründe de değişir (gürültü iki ağaç aynı turda çekilerek elendi, C7).
    for (const e of degisen) expect(piksel[e].aydinlik > 0 && piksel[e].karanlik > 0, e).toBe(true);
    const cekEkranlari = Object.keys(piksel).filter(e => /^kasa-(cek-|0062-cek-)/.test(e));
    expect(cekEkranlari).toHaveLength(14);
    for (const e of [...cekEkranlari, "giderler-mahsup"]) expect(degisen.has(e), e).toBe(false);
    // Bilinçli değişen küme: Kasa'nın Hesaplar ekranları ve çubuğun göründüğü Giderler ekranları; başka sekme değişmez.
    expect(Object.keys(piksel).filter(e => e.startsWith("kasa-") && !cekEkranlari.includes(e)).every(e => degisen.has(e))).toBe(true);
    expect([...degisen].filter(e => e.startsWith("kasa-"))).toHaveLength(35);
    for (const e of degisen) expect(e, e).toMatch(/^(giderler-|kasa-|gider-formu|kilit-gider-formu|kilit-odeme-penceresi|kayit-perdesi|uygulama-menu-)/);
    const { dosyalar } = JSON.parse(oku("docs/evidence/kanit-eslemesi.json"));
    let dosyaSayisi = 0;
    for (const [dosya, kayitlar] of Object.entries(dosyalar)) {
      const ekranlar = new Set(kayitlar.filter(k => degisen.has(k.ekran) && !/0083-/.test(k.rapor)).map(k => k.ekran));
      if (!ekranlar.size) continue;
      dosyaSayisi++;
      for (const ekran of ekranlar) {
        const k = kayitlar.find(x => /docs\/evidence\/0083-(taban-)?piksel-raporu\.json/.test(x.rapor) && x.ekran === ekran);
        expect(k, `${dosya} · ${ekran}`).toBeTruthy();
        if (k.rapor === "docs/evidence/0083-piksel-raporu.json") { expect(k.beklenen).toBe("degisti"); expect(k.onay).toMatch(/spec 0083/); }
        else expect(k.beklenen ?? "ayni").toBe("ayni");
      }
    }
    expect(dosyaSayisi).toBe(19); // spec'in 18'i + GiderForm.jsx (formun arkasındaki çubuk; C5/3 gereği rapor karar verir)
  });
  it("DoD: AC-1…AC-25'in her biri bir test adında (0083 dosyalarında 'AC-n', başka dosyalarda 'spec 0083 AC-n')", () => {
    const bulunan = new Set();
    for (const f of gez("tests").filter(f => /\.test\.jsx?$/.test(f))) {
      const kendi = f.includes("0083");
      for (const [, baslik] of oku(f).matchAll(/(?:\bit\(|\]\)\()\s*"([^"]+)"/g)) {
        if (kendi) for (const [, n] of baslik.matchAll(/AC-(\d+)/g)) bulunan.add(Number(n));
        else for (const [, grup] of baslik.matchAll(/spec 0083 ((?:AC-\d+(?: \/ )?)+)/g)) for (const [, n] of grup.matchAll(/AC-(\d+)/g)) bulunan.add(Number(n));
      }
    }
    expect(Array.from({ length: 25 }, (_, i) => i + 1).filter(n => !bulunan.has(n))).toEqual([]);
  });
});
