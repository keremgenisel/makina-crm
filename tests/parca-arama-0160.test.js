// Spec 0160: parça aramasının tek alan listesi (saf yardımcılar), analiz motorunun `partId`'si, genel aramanın birebir çıktısı ve
// kaynak taramaları. Test adları AC-<n> taşır.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parcaAramaDegerleri, parcaAramaSatiri, parcaBilgiDegerleri, parcaNedenBasliklari, parcaNedenAlanlari, PARCA_BILGI_ALANLARI } from "../src/lib/parcaBilgi";
import { aramaKelimeleri, kelimelerEslesir, nedenAlani } from "../src/lib/utils";
import { hesaplaAnaliz } from "../src/lib/analiz";
import { genelAramaSonuclari, parcaEslesmeNedeni } from "../src/components/GlobalSearch";
import { PARCALAR, canli, ANALIZ_VERI, UZUN_AD } from "./fixtures/0160-veri";

const P = Object.fromEntries(PARCALAR.map(p => [p.ad, p]));
const esles = (q, p) => kelimelerEslesir(aramaKelimeleri(q), parcaAramaDegerleri(p));
const ham = (f) => readFileSync(f, "utf8");
const kod = (f) => ham(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const dosyalar = (kok) => readdirSync(kok).flatMap(f => { const y = path.join(kok, f); return statSync(y).isDirectory() ? dosyalar(y) : /\.(jsx?|cjs|mjs)$/.test(f) ? [y] : []; });

describe("Spec 0160: saf yardımcılar", () => {
  it("AC-22: alt satır kod, ölçü, hammadde, cins sırasıyla, nokta ayracıyla", () => {
    expect(parcaAramaSatiri(P["Rulman 6204"])).toBe("625 · 5x16 · Krom çelik · Bilyalı");
  });
  it("AC-23: bilgi alanlarının hiçbiri dolu değilse alt satır boş (çizilmez)", () => {
    expect(parcaAramaSatiri(P.Pim)).toBe("");
    expect(parcaAramaSatiri({ ad: "X", kod: "  ", olcu: "", cins: null })).toBe("");
  });
  it("AC-24: yalnız bir alanı dolu parçada tek değer, ayraç yok", () => {
    expect(parcaAramaSatiri(P["Cıvata"])).toBe("DIN 933");
    expect(parcaAramaSatiri(P.Kayış)).toBe("KY-12");
  });
  it("AC-25: başında ve sonunda boşluk olan kod kırpılmış yazılır ve kodla arama çalışır", () => {
    expect(parcaAramaSatiri(P.Somun)).toBe("SM-8");
    expect(parcaAramaDegerleri(P.Somun)).toContain("SM-8");
    expect(esles("sm-8", P.Somun)).toBe(true);
  });
  it("R1: arama değerleri ad, İngilizce ad, kod, ölçü, hammadde, cins (yalnız dolular)", () => {
    expect(parcaAramaDegerleri(P["Rulman 6204"])).toEqual(["Rulman 6204", "Bearing", "625", "5x16", "Krom çelik", "Bilyalı"]);
    expect(parcaAramaDegerleri(P.Pim)).toEqual(["Pim"]);
  });
  it("AC-7 / AC-8 / R1/3: kelimeler ayrı alanlardan eşleşir; bir kelime hiçbir alanda yoksa eşleşmez", () => {
    expect(esles("625 5x16", P["Rulman 6204"])).toBe(true);
    expect(esles("rulman 625", P["Rulman 6204"])).toBe(true);
    expect(esles("rulman yok", P["Rulman 6204"])).toBe(false);
  });
  it("AC-46: İngilizce adıyla eşleşir ama alt satır İngilizce adı yazmaz (bilinen sınır)", () => {
    expect(esles("bearing", P["Rulman 6204"])).toBe(true);
    expect(parcaAramaSatiri(P["Rulman 6204"])).not.toMatch(/Bearing/);
  });
  it("AC-47: ölçüsü '×' ile girilmiş parça 'x' yazılan sorguyla bulunmaz (eşleştirici simge katlamaz, X9)", () => {
    expect(esles("m8 x 40", P.Saplama)).toBe(false);
    expect(esles("m8 × 40", P.Saplama)).toBe(true);
  });
  it("AC-50: üç bilgi satırı biçimi ayrı: katalog listesi üç alan (kodsuz), arama sonucu dört alan (kod önde)", () => {
    expect(parcaBilgiDegerleri(P["Rulman 6204"]).join(" · ")).toBe("5x16 · Krom çelik · Bilyalı");
    expect(parcaAramaSatiri(P["Rulman 6204"]).startsWith("625 · ")).toBe(true);
    const sp = kod("src/components/stock/SiparisPenceresi.jsx");
    expect(sp).not.toMatch(/parcaAramaSatiri|parcaAramaDegerleri/);
  });
  it("R2/3 / C7: ad hiçbir yolla değişmez; uzun ad olduğu gibi döner", () => {
    expect(parcaAramaDegerleri(P[UZUN_AD])[0]).toBe(UZUN_AD);
    expect(UZUN_AD.length).toBe(139);
  });
});

describe("Spec 0160: analiz motoru (C5, R4/5)", () => {
  const v = hesaplaAnaliz({ ...ANALIZ_VERI, parts: canli(PARCALAR) }, {});
  const satir = (ad) => v.parcalar.find(p => p.ad === ad);
  it("AC-54: parça satırı partId taşır: kimliği olanda kayıttan geldiği ham değer, kimliksizde null", () => {
    expect(satir("Rulman 6204").partId).toBe(1);
    expect(satir("Eski Cıvata Adı").partId).toBe("4");
    expect(satir("Serbest conta").partId).toBeNull();
    expect(satir("Eski Mil").partId).toBe(9);
    for (const p of v.parcalar) expect(Object.prototype.hasOwnProperty.call(p, "partId")).toBe(true);
    expect(v.ozet.enCokParca).toBe(v.parcalar[0]);
  });
  it("AC-36 / C5: motor bilgi alanlarını okumaz; partId dışında satırın alanları spec öncesiyle aynı", () => {
    expect(Object.keys(satir("Rulman 6204")).sort()).toEqual(["ad", "kargo", "key", "modeller", "musteriler", "partId", "servis", "toplam"]);
    expect(kod("src/lib/analiz.js")).not.toMatch(/parcaBilgi|hammaddeAdi|\.cins\b|PARCA_BILGI_ALANLARI/);
  });
});

describe("Spec 0160: genel arama birebir (R1/5, AC-35)", () => {
  const kapi = { izinli: () => true, onGoKatalog: () => {} };
  const eskiFiltre = (q) => { const k = aramaKelimeleri(q); return canli(PARCALAR).filter(p => kelimelerEslesir(k, [p.ad, p.adEN, p.kod, ...PARCA_BILGI_ALANLARI.map(a => p[a.alan])])).map(p => p.id); };
  const eskiNedenAlani = (p, k) => nedenAlani(k, [p.ad, p.adEN, p.kod], PARCA_BILGI_ALANLARI.map(a => [a.arama, p[a.alan]]));
  it("AC-35: parça sonucu ve neden satırı spec öncesi formülle birebir", () => {
    for (const q of ["rulman", "625", "5x16", "krom", "bilyalı", "bearing", "din 933", "sm-8", "rulman 5x16", "ø30", "yok"]) {
      const s = genelAramaSonuclari(q, { parts: PARCALAR }, kapi);
      expect(s.parcaTanimlari.map(p => p.id), q).toEqual(eskiFiltre(q));
      for (const p of canli(PARCALAR)) expect(nedenAlani(aramaKelimeleri(q), parcaNedenBasliklari(p), parcaNedenAlanlari(p)), q).toEqual(eskiNedenAlani(p, aramaKelimeleri(q)));
    }
    expect(parcaEslesmeNedeni(P["Rulman 6204"], aramaKelimeleri("5x16"))).toMatch(/5x16/);
  });
});

describe("Spec 0160: kaynak taramaları", () => {
  // On kutunun dosyaları (PartManager iki kutu, PartStokTab iki kutu, YedekParcaSatisForm iki kutu) ve genel arama.
  const KUTULAR = ["src/components/PartManager.jsx", "src/components/stock/PartStokTab.jsx", "src/components/ServiceForm.jsx",
    "src/components/YedekParcaSatisForm.jsx", "src/components/Documents.jsx", "src/components/ModelsManager.jsx", "src/components/Analiz.jsx"];
  const ARAMA_SATIRI = /kelimelerEslesir\(|\besles\(|aramaDegerleri=|getAlt=|\bara: |\balt: /;
  const ALAN_OKUMA = /\.adEN\b|\.kod\b|\.olcu\b|\.hammaddeAdi\b|\.cins\b|PARCA_BILGI_ALANLARI/;
  it("AC-37 / P1: kutuların dosyaları yardımcıyı çağırır; arama ifadeleri alan adını doğrudan okumaz", () => {
    for (const f of KUTULAR) {
      const s = kod(f);
      expect(s, f).toMatch(/parcaAramaDegerleri/);
      expect(s, f).toMatch(/parcaAramaSatiri/);
      const satirlar = s.split("\n").filter(l => ARAMA_SATIRI.test(l));
      for (const l of satirlar) expect(l, f).not.toMatch(ALAN_OKUMA);
    }
    // Gerekçeli tek istisna (P1, R4/3): Analiz'in arama değerleri motor satırının kendi adıyla başlar.
    expect(kod("src/components/Analiz.jsx")).toContain("kelimelerEslesir(kelimeler, [p.ad, ...(k ? parcaAramaDegerleri(k) : [])])");
    // Altı alanın listesi yalnız parcaBilgi.js'te: yardımcı orada üç alanı ve PARCA_BILGI_ALANLARI'nı birlikte okur.
    expect(kod("src/lib/parcaBilgi.js")).toMatch(/export const parcaAramaDegerleri = \(p\) => \[p\?\.ad, p\?\.adEN, p\?\.kod, \.\.\.AL\.map/);
  });
  it("AC-48 / P2: genel arama alan listesini kendi içinde yazmaz, yardımcıları çağırır", () => {
    const gs = kod("src/components/GlobalSearch.jsx");
    expect(gs).not.toMatch(/\.adEN\b|PARCA_BILGI_ALANLARI/);
    expect(gs).toMatch(/esles\(\.\.\.parcaAramaDegerleri\(p\)\)/);
    expect(gs).toMatch(/nedenAlani\(kelimeler, parcaNedenBasliklari\(p\), parcaNedenAlanlari\(p\)\)/);
  });
  it("AC-38: parcaBilgi.js eşleştirme yazmaz (kelimelere bölmez, normalleştirip includes aramaz)", () => {
    const s = kod("src/lib/parcaBilgi.js");
    expect(s).not.toMatch(/aramaKelimeleri|aramaNormalize|\.includes\(|split\(/);
    expect(s).not.toMatch(/^import /m);
  });
  it("AC-39: yardımcılar 0158'in yasaklı dosyalarına girmez", () => {
    const yasak = ["urunAgaci.js", "maliyetKalemleri.js", "malzeme.js", "parcaFiyati.js", "stokHareketi.js", "setUretimi.js", "servisStok.js",
      "yedekParcaStok.js", "makinaStandartMaliyet.js", "siparisIhtiyaci.js"].map(f => `src/lib/${f}`);
    for (const f of [...yasak, "electron/server.cjs", "electron/serverAuth.cjs", "electron/db.cjs"]) expect(kod(f), f).not.toMatch(/parcaArama|parcaNeden/);
  });
  it("AC-40: yeni kalıcı alan, veri bölümü, izin ve sunucu kuralı yok", () => {
    for (const f of ["electron/db.cjs", "electron/serverAuth.cjs", "electron/server.cjs", "src/lib/merge.js", "src/components/settings/serverPermissionDefs.js", "src/lib/permissions.js"])
      expect(ham(f), f).not.toMatch(/spec 0160|parcaArama|aramaDegerleri|AramaAltSatir/);
  });
  it("AC-57 / C9: liste kancası searchFields'a fonksiyon kabul etmez; katalog listesi searchFn kullanır", () => {
    expect(kod("src/hooks/useFilteredList.js")).not.toMatch(/typeof\s+\w+\s*===\s*"function"/);
    const pm = kod("src/components/PartManager.jsx");
    expect(pm).not.toMatch(/searchFields: \["ad"\]/);
    expect(pm).toContain("searchFn: (p, sorgu) => kelimelerEslesir(sorgu.kelimeler, parcaAramaDegerleri(p))");
  });
  it("AC-62 / C1/4: yardımcıların adları; parcaBilgisi src'de yalnız sipariş motorunda", () => {
    const gecen = dosyalar("src").filter(f => /\bparcaBilgisi\b/.test(kod(f))).map(f => f.split(path.sep).join("/"));
    expect(gecen).toEqual(["src/lib/siparisIhtiyaci.js"]);
  });
  it("AC-49 / P3: alt satır biçimi tek yerde (ui.jsx AramaAltSatir: punto 11, n500, üst boşluk 2); kimlik başka dosyada tanımlanmaz", () => {
    const ui = kod("src/components/ui.jsx");
    expect(ui).toMatch(/export const AramaAltSatir = .*data-testid="arama-alt-satir" style=\{\{ fontSize: 11, fontWeight: 400, color: "var\(--n500, #64748b\)", marginTop: 2/s);
    const tanimlayan = dosyalar("src").filter(f => ham(f).includes('"arama-alt-satir"')).map(f => f.split(path.sep).join("/"));
    expect(tanimlayan).toEqual(["src/components/ui.jsx"]);
    for (const f of ["src/components/stock/PartStokTab.jsx", "src/components/Analiz.jsx"]) expect(kod(f), f).toMatch(/<AramaAltSatir/);
  });
  // Triyaj (bulgu 1): README'nin açık bulguları spec'in son hâliyle tutarlı: X1 yalnız iki klasik açılır listedir ("Stoğa Parça
  // Ekle" onuncu kutu olarak kapsamda, "Düzelt"te seçici yok, P13); her kapsam dışı bulgu tek kez yazılır.
  it("README açık bulguları: X1 iki açılır liste, 'Stoğa Parça Ekle' bulgu değil; X1, X4, X8 birer kez", () => {
    const r = ham("specs/README.md");
    const bulgular = r.slice(r.indexOf("## Açık bulgular"), r.indexOf("## Bu projede tek gerçek kaynaklar")).split("\n").filter(l => l.startsWith("|"));
    for (const x of ["0160 X1", "0160 X4", "0160 X8"]) expect(bulgular.filter(l => l.includes(x)), x).toHaveLength(1);
    const x1 = bulgular.find(l => l.includes("0160 X1"));
    expect(x1).toMatch(/iki klasik açılır liste/);
    expect(x1).not.toMatch(/Stoğa Parça Ekle|Düzelt/);
    expect(bulgular.some(l => /üç açılır liste/.test(l))).toBe(false);
  });
});
