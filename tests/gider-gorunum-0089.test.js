// Spec 0089: Giderler'deki iki maliyet görünümü kalkar. Kaynak taramaları ve kayıtlar (AC-5, AC-6, AC-7, AC-8 kaynak yarısı,
// AC-20, AC-22, AC-23, AC-26, AC-28 kaydı, AC-29, AC-30) ve AC adı kapsamı. Ekran kriterleri tests/ui/gider-gorunum-0089*.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { KILITSIZ_DOSYALAR } from "../src/lib/kilitAlanlari";

const kok = resolve(__dirname, "..");
const oku = (f) => readFileSync(resolve(kok, f), "utf8");
const gez = (d) => readdirSync(resolve(kok, d)).flatMap(ad => {
  const f = `${d}/${ad}`;
  return statSync(resolve(kok, f)).isDirectory() ? gez(f) : /\.(jsx?|cjs|mjs)$/.test(ad) ? [f] : [];
});
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const KALKAN = ["MakinaKarliligi", "MakinaModelGorunumu", "MakinaMaliyetDetay", "FiyatOnerisi"];
const KALKAN_DOSYA = KALKAN.map(a => `src/components/gider/${a}.jsx`);
// R10: görüntü aracından düşen on sekiz ekran adı (tam liste; C9: önekle toplu silme yok).
const KALKAN_EKRANLAR = ["giderler-model", "giderler-karlilik", "giderler-model-personel", "maliyet-detay-personel", "giderler-karlilik-parti",
  "giderler-model-parti-degisim", "maliyet-detay-parti-acik", "maliyet-detay-parti-kapali", "giderler-0072-model", "giderler-0072-karlilik",
  "giderler-0072-detay", "giderler-0062-karlilik", "giderler-0062-karlilik-sayfa2", "giderler-0062-makina-model", "giderler-0062-makina-model-sayfa2",
  "giderler-0076-karlilik", "maliyet-detay-0076", "giderler-0068-parti-sil"];

describe("Spec 0089: kaldırılan yüzey (R2, R2/2, R4, R5)", () => {
  it("AC-5: dört dosya yok ve hiçbir yerden içe aktarılmaz; UretimPartileri yerinde ve Makina Maliyeti ekranından içe aktarılır", () => {
    for (const f of KALKAN_DOSYA) expect(existsSync(resolve(kok, f)), f).toBe(false);
    const dosyalar = ["src", "scripts", "tests"].flatMap(gez);
    const ice = new RegExp(`from\\s+["'][^"']*/(${KALKAN.join("|")})["']|\\b(MaliyetNotlari)\\b`);
    expect(dosyalar.filter(f => f !== "tests/gider-gorunum-0089.test.js" && ice.test(yorumsuz(oku(f))))).toEqual([]);
    expect(existsSync(resolve(kok, "src/components/gider/UretimPartileri.jsx"))).toBe(true);
    expect(oku("src/components/MakinaMaliyeti.jsx")).toMatch(/import \{ UretimPartileri \} from "\.\/gider\/UretimPartileri";/);
  });
  it("AC-6: src'de hesaplaMakinaMaliyetleri yalnız App'te; karlilikOzeti, makinaKarlilik, fiyatOnerisi hiç çağrılmaz; scripts'te iki gerekçeli istisna (C10)", () => {
    const src = gez("src").filter(f => f !== "src/lib/makinaMaliyeti.js");
    // Spec 0090 ile (C7 0089 AC-6; 0090 R27, AC-46): motor src'de hiç çağrılmaz (App'teki memo da kalktı).
    expect(src.filter(f => /hesaplaMakinaMaliyetleri\(/.test(yorumsuz(oku(f))))).toEqual([]);
    expect(src.filter(f => /\b(karlilikOzeti|makinaKarlilik|fiyatOnerisi)\(/.test(yorumsuz(oku(f))))).toEqual([]);
    // R5, X1: motorun dosyası ve testleri yerinde (motor testleri bu işte dokunulmadı).
    for (const f of ["src/lib/makinaMaliyeti.js", "tests/makina-maliyeti.test.js", "tests/uretim-partisi.test.js"]) expect(existsSync(resolve(kok, f)), f).toBe(true);
    expect(oku("src/lib/makinaMaliyeti.js")).toMatch(/export const (hesaplaMakinaMaliyetleri|karlilikOzeti|makinaKarlilik|fiyatOnerisi) =/);
    // C10: scripts altında motoru çağıran yalnız iki dosya (0088'in AC-42 kıyas üreticisi ve görüntü aracının düzenekleri).
    const ISTISNA = ["scripts/evidence/0009-sayfa.jsx", "scripts/tests/0088-kiyas-fikstur.mjs"];
    expect(gez("scripts").filter(f => /hesaplaMakinaMaliyetleri|karlilikOzeti|makinaKarlilik\(|fiyatOnerisi\(/.test(oku(f))).sort()).toEqual(ISTISNA);
  });
  // Spec 0090 ile (C7 0089 AC-7, AC-8; 0090 R27, R28, AC-47): App'te maliyet memosu ve `makinaMaliyet` prop'u hiç yok; Makina
  // Maliyeti parti payını yeni motordan kendi kurar. 0089'un "Giderler almaz" yarısı aynen.
  it("AC-7 (spec 0090 ile): Giderler makinaMaliyet prop'unu almaz, donemAnahtari kaynakta yok; App hiçbir ekrana makinaMaliyet vermez", () => {
    const g = yorumsuz(oku("src/components/Giderler.jsx"));
    expect(g).not.toMatch(/\bmakinaMaliyet\b/);
    expect(g).not.toMatch(/donemAnahtari/);
    const app = oku("src/App.jsx");
    expect(app).not.toMatch(/makinaMaliyet=\{makinaMaliyet\}/);
    const maliyetCagri = app.slice(app.indexOf("<MakinaMaliyeti "), app.indexOf("/>", app.indexOf("<MakinaMaliyeti ")));
    expect(maliyetCagri).toMatch(/tumMusteriler=\{customers\}/);
  });
  it("AC-8 (kaynak, spec 0090 ile): App'te maliyet memosu yok; motor hiçbir kullanıcıda App tarafından çalıştırılmaz", () => {
    const app = oku("src/App.jsx");
    expect(app).not.toMatch(/const makinaMaliyet = useMemo/);
    expect(app).not.toMatch(/from "\.\/lib\/makinaMaliyeti"/);
    expect(app).toMatch(/const maliyetYetki = useMemo\(\(\) => giderYetki && visibleTabs\.some\(t => t\.id === "maliyet"\)/);
  });
  it("AC-20: sunucu, izin, birleştirme ve veritabanı bu spec'i bilmez; maliyet sekmesinin önkoşulu aynen (R8)", () => {
    for (const f of ["electron/serverAuth.cjs", "electron/server.cjs", "electron/db.cjs", "src/lib/merge.js", "src/components/settings/serverPermissionDefs.js", "src/lib/permissions.js"])
      expect(oku(f), f).not.toMatch(/0089/);
    expect(oku("electron/serverAuth.cjs")).toMatch(/SEKME_ON_KOSULLARI = \{ maliyet: \["gider"\] \}/);
  });
  it("AC-22: ekran kaynağında (src/components) fiyat önerisinin marj ve ekle yöntemleri yok; KAT doğrulaması yerinde", () => {
    const ekran = gez("src/components");
    expect(ekran.filter(f => /FIYAT_YONTEM|fiyatOnerisi|yontem: "(marj|ekle)"|sonOnIkiAy|marjBicim|carpanBicim/.test(yorumsuz(oku(f))))).toEqual([]);
    expect(oku("src/lib/makinaStandartMaliyet.js")).toMatch(/katDegeriDogrula/);
  });
  it("AC-23: kilit kapsam listesinde kaldırılan dört dosyanın girdisi yok", () => {
    for (const f of KALKAN_DOSYA) expect(Object.keys(KILITSIZ_DOSYALAR)).not.toContain(f);
    expect(oku("src/lib/kilitAlanlari.js")).not.toMatch(new RegExp(KALKAN.join("|")));
  });
  it("AC-26: sayfalanan liste tablosu beş dosya, dokuz çağrı (tests/sayfalama-0062.test.js)", () => {
    const t = oku("tests/sayfalama-0062.test.js");
    expect(t).toMatch(/expect\(LISTELER\)\.toHaveLength\(5\);/);
    expect(t).not.toMatch(/"src\/components\/gider\/(MakinaKarliligi|MakinaModelGorunumu)\.jsx", 10/);
  });
});

describe("Spec 0089: kanıt ve kayıtlar (R10, R14, R15, C9)", () => {
  it("AC-29: on sekiz ekran adı araçta yok; 0088'in maliyet-* adları yerinde; kaldırılan dosyaların kanıt kaydı yok", () => {
    const arac = oku("scripts/evidence/0009-sayfa.jsx");
    expect(KALKAN_EKRANLAR).toHaveLength(18);
    for (const e of KALKAN_EKRANLAR) expect(arac.includes(`"${e}"`), e).toBe(false);
    for (const e of ["maliyet-modeller", "maliyet-parti", "maliyet-ayarlar", "maliyet-uretim-partileri"]) expect(arac).toContain(`"${e}":`);
    expect(arac).not.toMatch(/MakinaMaliyetDetay/);
    const { dosyalar } = JSON.parse(oku("docs/evidence/kanit-eslemesi.json"));
    for (const f of [...KALKAN_DOSYA]) expect(dosyalar[f], f).toBeUndefined();
    // C9: 0088'in yeni ekranının kayıtları duruyor (önekle silinmedi).
    const maliyetKayitlari = Object.values(dosyalar).flat().filter(k => /^maliyet-(modeller|parti|ayarlar|uretim-partileri)/.test(k.ekran));
    expect(maliyetKayitlari.length).toBeGreaterThan(0);
  });
  it("AC-24: sözlükte kaldırılan iki dosyanın örnekleri 'Ödenen borç (spec 0089)'a taşındı; yakın kopya listesinde yoklar (tasarim-kaynak denetler)", () => {
    const doc = oku("docs/tasarim-sozlugu.md");
    expect(doc).toMatch(/### Ödenen borç \(spec 0089\)/);
    const yakin = doc.slice(doc.indexOf("### Kapsam içindeki yakın kopyalar"), doc.indexOf("### Erişilebilirlik borcu"));
    expect(yakin).not.toMatch(/MakinaMaliyetDetay|MakinaKarliligi/);
    // Sözlüğün dosya:satır atıfları silinen dosyaya gitmez.
    for (const [, f] of doc.matchAll(/`(src\/[^`:]+\.jsx?):\d+`/g)) expect(existsSync(resolve(kok, f)), f).toBe(true);
  });
  it("AC-25: Electron yerleşim betiği iki sekmeli çubuğu ve iki genişlikte tek satırı ölçer; stopaj düğmesi iddiası yerinde", () => {
    const b = oku("scripts/tests/donem-raporu-yerlesim.cjs");
    expect(b).toContain('=== "Dönem Raporu|Tedarikler ve Ekstre"');
    expect(b).not.toMatch(/Makina Kârlılığı|Makina ve Model/);
    expect(b).toMatch(/check\(`\$\{ad0\}: görünüm çubuğu tek satır \(spec 0083 AC-7, spec 0089 AC-25\)`/);
    expect(b).not.toMatch(/if \(genislik === 1280\) check\(`\$\{ad0\}: görünüm çubuğu tek satır/);
    expect(b).toMatch(/Kira stopajı \(1 dönem açık\)/);
    expect(oku("tests/donem-raporu-yerlesim.test.js")).toMatch(/donem-raporu-yerlesim\.cjs/);
  });
  it("AC-30: C7'deki ters çevrilen kriterlerin test dosyaları 'spec 0089 ile' notunu taşır", () => {
    const NOTLU = ["tests/yerlesim-0083.test.js", "tests/ui/yerlesim-0083.test.jsx", "tests/ui/standart-kalkar-0082.test.jsx", "tests/ui/uretim-partisi.test.jsx",
      "tests/ui/gider-dagitim-0072.test.jsx", "tests/gider-dagitim-0072.test.js", "tests/ui/personel-atama.test.jsx", "tests/ui/kisitli-gider-0076.test.jsx",
      "tests/ui/kutu-duzeni-0067.test.jsx", "tests/ui/kutular-kapali-0081.test.jsx", "tests/ui/stopaj-donemi-0084.test.jsx", "tests/sayfalama-0062.test.js",
      "tests/ui/sayfalama-0062.test.jsx", "tests/sayfalama-kalkar-0080.test.js", "tests/ui/gider-perdesi.test.jsx", "tests/ui/makina-maliyeti-0088-app.test.jsx",
      "scripts/tests/donem-raporu-yerlesim.cjs"];
    for (const f of NOTLU) expect(oku(f), f).toMatch(/spec 0089 ile/i);
    expect(existsSync(resolve(kok, "tests/ui/makina-karliligi.test.jsx"))).toBe(false);
  });
  it("triyaj (bulgu 2): README satırı 'iki' görünüm der; CLAUDE.md'nin 0083 maddesi iki sırayı ayrı ayrı yazar", () => {
    const satir = oku("specs/README.md").split("\n").find(l => l.startsWith("| **0089** |"));
    expect(satir).toMatch(/^\| \*\*0089\*\* \| Giderler'deki iki maliyet görünümü kalkar( \(Tamamlandı\))? \|/);
    const madde = oku("CLAUDE.md").split("\n").find(l => l.startsWith("- **Giderler çubuğu"));
    expect(madde).toMatch(/^- \*\*Giderler çubuğu:\*\* 0083'te Dönem Raporu · Tedarikler ve Ekstre · Üretim Partileri · Makina Kârlılığı · Makina ve Model \(0088 ile/);
    expect(madde).toMatch(/spec 0089'dan beri yalnız Dönem Raporu · Tedarikler ve Ekstre\)/);
  });
  it("AC-28 (kayıt): rehberin el ölçümü plan dosyasında yazılı (rehber analistin dosyası, commit dışı; spec revizyon 3 K1)", () => {
    const plan = existsSync(resolve(kok, "specs/done/0089-uygulama-plani.md")) ? oku("specs/done/0089-uygulama-plani.md") : oku("specs/0089-uygulama-plani.md");
    expect(plan).toMatch(/AC-28 el ölçümü: rehberde kaldırılan ekran adı kalmadı/);
  });
});

describe("Spec 0089 DoD: her kabul kriteri bir test adında", () => {
  it("AC-1…AC-30'un her biri 0089 test dosyalarında 'AC-n' olarak geçer", () => {
    const bulunan = new Set();
    for (const f of gez("tests").filter(f => /gider-gorunum-0089.*\.test\.jsx?$/.test(f))) {
      for (const [, baslik] of oku(f).matchAll(/\bit\(\s*"([^"]+)"/g)) for (const [, n] of baslik.matchAll(/AC-(\d+)/g)) bulunan.add(Number(n));
    }
    expect(Array.from({ length: 30 }, (_, i) => i + 1).filter(n => !bulunan.has(n))).toEqual([]);
  });
});
