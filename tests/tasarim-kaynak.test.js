// Spec 0009: tasarım sözlüğünün kaynak düzeyindeki kuralları. Tek tanım (AC-1, AC-4, AC-9, AC-10), sabit renk yok
// (AC-7), sabit kimlik yok (AC-17), yeni stil sistemi yok (AC-14), sözlük belgesi ve örneklerinin doğruluğu (AC-13, AC-20),
// bilinen borç listesi (AC-18).
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { regexKacis } from "./yardimci/regexKacis.js";

const kok = path.join(__dirname, "..");
const oku = (f) => readFileSync(path.join(kok, f), "utf-8");
const tumDosyalar = (dir) => readdirSync(dir).flatMap(ad => {
  const p = path.join(dir, ad);
  return statSync(p).isDirectory() ? tumDosyalar(p) : [p];
});
const SRC = tumDosyalar(path.join(kok, "src")).filter(f => /\.(js|jsx)$/.test(f)).map(f => path.relative(kok, f).split(path.sep).join("/"));
const TASARIM = "src/components/tasarim.jsx";
const ALTI = ["Segment", "KartBolum", "BosDurum", "UyariSeridi", "HataMetni", "Ipucu"];

// Kapsam içi dosyalar (AC-10): Giderler ve alt görünümleri, gider formları ve ayarları, Evrak (alıcı bölümü), Ayarlar bölüm bileşeni.
const KAPSAM = [
  "src/components/Giderler.jsx", "src/components/GiderForm.jsx", "src/components/CalisanManager.jsx", "src/components/Documents.jsx", "src/components/Settings.jsx",
  ...SRC.filter(f => f.startsWith("src/components/gider/")),
  ...SRC.filter(f => f.startsWith("src/components/settings/")),
];

describe("tek tanım", () => {
  it.each(ALTI)("AC-1 / AC-4 / AC-9: %s yalnız tasarim.jsx'te tanımlı", (ad) => {
    const tanimlayan = SRC.filter(f => new RegExp(`(?:export\\s+)?(?:const|function)\\s+${regexKacis(ad)}\\b\\s*=?`).test(oku(f)));
    expect(tanimlayan).toEqual([TASARIM]);
  });
  it("AC-9: Ayarlar'ın eski bölüm bileşeni kalmadı; ikinci bir kart bileşeni yok", () => {
    expect(existsSync(path.join(kok, "src/components/settings/Section.jsx"))).toBe(false);
    expect(SRC.filter(f => /import\s*\{[^}]*\bSection\b[^}]*\}/.test(oku(f)))).toEqual([]);
    expect(SRC.filter(f => /(?:const|function)\s+Section\b/.test(oku(f)))).toEqual([]);
  });
  it("AC-1: Giderler ve Evrak segmentli seçiciyi tasarim.jsx'ten alır; Evrak'ta elle yazılmış aria-pressed düğmesi kalmadı", () => {
    expect(oku("src/components/Giderler.jsx")).toMatch(/import \{[^}]*\bSegment\b[^}]*\} from "\.\/tasarim"/);
    expect(oku("src/components/Documents.jsx")).toMatch(/import \{[^}]*\bSegment\b[^}]*\} from "\.\/tasarim"/);
    expect(oku("src/components/Documents.jsx")).not.toMatch(/aria-pressed=/);
    expect(oku("src/components/Documents.jsx")).toMatch(/<Segment kip="dugme" gorunum="cerceve" ariaLabel="Alıcı tipi"/);
  });
});

describe("AC-10: Kapsam içindeki ekranlarda aynı yapı taşının ikinci bir birebir tanımı kalmaz", () => {
  const YASAK = [
    [/role="radiogroup"/, "segment kabı"],
    [/const (kart|kutu) = \{/, "yerel kart sabiti"],
    [/const baslik = \(t, alt\)/, "kart başlık yardımcısı"],
    [/const bosDurum\b|bosDurum\(/, "boş durum fonksiyonu"],
    [/const uyari = |\buyari\("/, "uyarı şeridi fonksiyonu"],
    [/1\.5px dashed var\(--n300, #cbd5e1\)", borderRadius: 12/, "boş durum kutusu stili"],
    [/borderRadius: 12, border: "1px solid var\(--n200, #e2e8f0\)", padding: 18 \}\}>\s*<div style=\{\{ fontSize: 12, fontWeight: 800, color: "var\(--n400, #94a3b8\)", textTransform: "uppercase", letterSpacing: \.6, marginBottom: 14 \}\}>Alıcı Bilgileri/, "Evrak alıcı kartı"],
    [/role="alert" style=\{\{ fontSize: 12, color: "var\(--red700/, "hata metni"],
  ];
  it.each(KAPSAM)("%s", (f) => {
    const s = oku(f);
    for (const [re, ad] of YASAK) expect(re.test(s), `${f}: ${ad}`).toBe(false);
  });
  it("role=\"status\" yalnız bilinen borçtaki yakın kopyalarda kalır (sözlükte listeli)", () => {
    const kalan = KAPSAM.flatMap(f => (oku(f).match(/role="status"/g) || []).map(() => f)).sort();
    expect(kalan).toEqual(["src/components/GiderForm.jsx", "src/components/gider/GiderAlanlari.jsx"]);
  });
});

describe("tasarim.jsx kuralları", () => {
  const s = oku(TASARIM);
  it("AC-7: yedeksiz sabit renk kodu yok; rgba yalnız gölgelerde", () => {
    const yedeksiz = s.replace(/var\(--[\w-]+, #[0-9a-fA-F]{3,8}\)/g, "");
    expect(yedeksiz.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
    const rgbaSatirlari = s.split("\n").filter(l => /rgba\(/.test(l));
    expect(rgbaSatirlari.length).toBeGreaterThan(0);
    for (const l of rgbaSatirlari) for (const m of l.matchAll(/(\w+):\s*[^,]*?rgba\(/g)) expect(m[1], l).toBe("boxShadow");
  });
  it("AC-17: bileşenlerin içinde sabit data-testid yok", () => {
    expect(s).not.toMatch(/data-testid="/);
    expect(s.match(/data-testid=\{testId\}/g)?.length).toBe(4); // KartBolum (iki varyant), BosDurum, UyariSeridi
  });
  it("AC-14: yeni stil sistemi yok (CSS module, styled-components, Tailwind, Emotion)", () => {
    const pkg = JSON.parse(oku("package.json"));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    for (const yasak of ["styled-components", "tailwindcss", "@emotion/react", "@emotion/styled", "sass", "less"]) expect(deps).not.toContain(yasak);
    expect(tumDosyalar(path.join(kok, "src")).filter(f => /\.module\.(css|scss)$/.test(f))).toEqual([]);
  });
});

describe("sözlük belgesi", () => {
  const doc = oku("docs/tasarim-sozlugu.md");
  const bolum = (ad) => {
    const i = doc.indexOf(`\n## ${ad}\n`);
    if (i < 0) return null;
    const j = doc.indexOf("\n## ", i + 4);
    return doc.slice(i, j < 0 ? undefined : j);
  };
  it.each(ALTI)("AC-13: %s için ad, ne zaman kullanılır, ne zaman kullanılmaz ve gerçek örnek var", (ad) => {
    const b = bolum(ad);
    expect(b, ad).toBeTruthy();
    expect(b).toContain("**Ne zaman kullanılır:**");
    expect(b).toContain("**Ne zaman kullanılmaz:**");
    expect(b).toMatch(/\*\*Örnek:\*\* `src\/[^`]+:\d+`/);
  });
  it.each(ALTI)("AC-20: %s örneklerinin dosya:satır gösterdiği satırda bileşen geçiyor", (ad) => {
    const ornekler = [...bolum(ad).matchAll(/\*\*Örnek:\*\* `(src\/[^`:]+):(\d+)`/g)];
    expect(ornekler.length).toBeGreaterThan(0);
    for (const [, dosya, satir] of ornekler) {
      expect(existsSync(path.join(kok, dosya)), dosya).toBe(true);
      const l = oku(dosya).split("\n")[Number(satir) - 1] || "";
      expect(l, `${dosya}:${satir}`).toContain(`<${ad}`);
    }
  });
  it("AC-18: bilinen borç listesi kapsam dışı ve yakın kopyaları adıyla sayar; kapsam dışı kopyalar yerinde", () => {
    const borc = doc.slice(doc.indexOf("## Bilinen borç"));
    for (const ad of ["Analiz.jsx", "Chip", "Finance.jsx", "Customers.jsx", "YedekParcaSatisTab.jsx", "ui.jsx", "Warn", "Belge Detayları", "FaturaFormModal.jsx",
      "GiderForm.jsx", "SettingsGider.jsx", "GiderAlanlari.jsx", "KdvKarsilastirmaKarti.jsx", "MakinaMaliyetDetay.jsx", "MakinaKarliligi.jsx", "Hatırlatma kapsamı", "2.56"]) {
      expect(borc, ad).toContain(ad);
    }
    // Spec 0014 R4 (C3 istisnası): Analiz'in Chip kopyası 0014'te ödendi; artık sözlüğün "Ödenen borç" bölümünde durur.
    expect(doc).toMatch(/### Ödenen borç[\s\S]*Analiz\.jsx[\s\S]*Chip/);
    // Spec 0015 F2 (C3 istisnası): Warn 0015'te kaldırıldı; artık sözlüğün "Ödenen borç" bölümünde durur.
    expect(doc).toMatch(/### Ödenen borç[\s\S]*ui\.jsx[\s\S]*Warn/);
  });
  it("CLAUDE.md sözlüğe atıf yapar", () => {
    expect(oku("CLAUDE.md")).toContain("docs/tasarim-sozlugu.md");
  });
});

// Triyaj bulgu 1 ve 3 (AC-12): tasarim.jsx'i kullanan her dosya en az bir kanıt ekranına bağlıdır. O ekran kendi piksel
// raporunda iki temada çizim hatasız ve 0 farkla durur, yan yana JPEG'i depodadır. Karşılaştırma tam çözünürlüklü PNG'lerle
// yapılır (depoya konmaz); doğrulamak için: node scripts/evidence/0009-calistir.mjs <sonra> <once>.
// Spec 0011 R2 (AC-11): eşleme test dosyasında değil, docs/evidence/kanit-eslemesi.json'da. Sonraki ekran dönüşümleri kendi
// raporunu üretir ve kaydını oraya ekler; bu test dosyasına dokunmaz. Kural aynıdır.
describe("AC-12: Dönüşümden etkilenen her ekranın önce/sonra kanıtı", () => {
  const { dosyalar: ESLEME } = JSON.parse(oku("docs/evidence/kanit-eslemesi.json"));
  const raporlar = {};
  const rapor = (yol) => (raporlar[yol] ??= Object.fromEntries(JSON.parse(oku(yol)).map(r => [r.ad, r])));

  it("tasarim.jsx'i kullanan her dosyanın kanıt kaydı var (yeni kullanan dosya kayıt olmadan eklenemez)", () => {
    const kullananlar = SRC.filter(f => f !== TASARIM && /from "[./]*tasarim"/.test(oku(f))).sort();
    expect(kullananlar).toEqual(Object.keys(ESLEME).sort());
  });
  it.each(Object.entries(ESLEME))("%s: ekranları iki temada çizim hatasız, beklenene uygun (aynı → 0 piksel fark; değişti → onaylı), JPEG depoda", (_f, kayitlar) => {
    expect(kayitlar.length).toBeGreaterThan(0);
    for (const { rapor: yol, ekran, beklenen = "ayni", onay } of kayitlar) {
      const onek = path.basename(yol).replace(/-piksel-raporu\.json$/, "");
      expect(["ayni", "degisti"], `${ekran}: beklenen`).toContain(beklenen);
      // "degisti": bilinçli görünüm değişikliği (ör. ekranın yeni tasarıma dönüşümü); farkın kimin kararıyla kabul
      // edildiği kayıtta yazılı olmalı. "ayni" (varsayılan): görünüm değişmemeli, 0 piksel fark.
      if (beklenen === "degisti") expect(typeof onay === "string" && onay.trim().length > 10, `${ekran}: onay gerekçesi`).toBe(true);
      for (const tema of ["aydinlik", "karanlik"]) {
        const ad = `${ekran}-${tema}.png`;
        const r = rapor(yol)[ad];
        expect(r, `${yol}: ${ad}`).toBeTruthy();
        expect(r.cizimHatasi, ad).toBeUndefined();
        if (beklenen === "ayni") expect(r.piksel, ad).toBe(0);
        expect(existsSync(path.join(kok, path.dirname(yol), `${onek}-${ekran}-${tema}.jpg`)), ad).toBe(true);
      }
    }
  });
  it("0009 piksel raporundaki hiçbir ekranda fark ya da çizim hatası yok", () => {
    const r0009 = JSON.parse(oku("docs/evidence/0009-piksel-raporu.json"));
    expect(r0009.filter(r => r.piksel !== 0 || r.cizimHatasi)).toEqual([]);
  });
});
