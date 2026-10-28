// Spec 0009 AC-8 (plan T8): karanlık temada altı yapı taşının metni okunabilir, kenarlıkları görünür.
// Renkler src/lib/theme.js TOKENS tablosundan ([ad, aydınlık, karanlık]) okunur; jsdom renk hesaplamadığı için
// ölçü WCAG bağıl parlaklık kontrastıdır. Eşik (spec R3): karanlık metin kontrastı ya WCAG AA'yı (4.5) karşılar ya da,
// bugün aydınlıkta da AA altında olan çiftlerde, aydınlıktakinin en az %95'idir (bugünkü görünüm taban). Yalnız "%95"
// kuralı çok yüksek kontrastlı çiftleri (ör. 17.9 → 13.9) okunaklı oldukları hâlde düşürüyordu. Kenarlık/zemin
// oranı iki temada ≥ 1.15.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TOKENS } from "../src/lib/theme";

const T = Object.fromEntries(TOKENS.map(([ad, acik, koyu]) => [ad, { acik, koyu }]));
const parlaklik = (hex) => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const oran = (a, b) => { const [x, y] = [parlaklik(a), parlaklik(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// Spec R3 eşiği (triyaj bulgu 2): aydınlıkta AA'yı (4.5) karşılayan çift karanlıkta da AA'yı karşılar; aydınlıkta zaten
// AA altında kalan çift karanlıkta aydınlıktakinin en az %95'i olur. (Eski min(4.5, %95) formülü aydınlığı 4.5–4.74
// arasındaki bir çiftin karanlıkta 4.5 altına düşmesine izin veriyordu.)
const esik = (acik) => (acik >= 4.5 ? 4.5 : acik * 0.95);

// [bileşen, parça, ön plan token, zemin token]
const METIN = [
  ["Segment (hap)", "aktif", "orTx", "surface"], ["Segment (hap)", "pasif", "n500", "n150"],
  ["Segment (cerceve)", "seçili", "n900", "ambBg3"], ["Segment (cerceve)", "seçili değil", "n900", "surface"],
  ["KartBolum (ayar)", "başlık", "n900", "surface"], ["KartBolum (kart)", "etiket başlık", "n400", "surface"],
  ["KartBolum (kart)", "başlık", "n900", "surface"], ["KartBolum (kart)", "alt başlık", "n500", "surface"],
  ["BosDurum", "metin", "n600", "surface"],
  ["UyariSeridi (bilgi)", "başlık", "blu700", "bluBg"], ["UyariSeridi (bilgi)", "metin", "n700", "bluBg"],
  ["UyariSeridi (uyari)", "başlık", "amb700", "ambBg"], ["UyariSeridi (uyari)", "metin", "n700", "ambBg"],
  ["UyariSeridi (basari)", "başlık", "grn700", "grnBg"], ["UyariSeridi (basari)", "metin", "n700", "grnBg"],
  ["HataMetni", "metin", "red700", "surface"], ["Ipucu", "metin", "n500", "surface"],
];
const KENAR = [
  ["Segment (hap)", "n200", "surface"], ["Segment (cerceve)", "brand", "ambBg3"], ["Segment (cerceve)", "n200", "surface"],
  ["KartBolum (kart)", "n200", "surface"], ["BosDurum", "n300", "surface"],
  ["UyariSeridi (bilgi)", "bluBr", "bluBg"], ["UyariSeridi (uyari)", "ambBr", "ambBg"], ["UyariSeridi (basari)", "grnBr", "grnBg"],
];

describe("AC-8: Karanlık temada altı bileşenin de metni okunabilir ve kenarlıkları görünür", () => {
  it("kullanılan her token temada tanımlı (tanımsızsa karanlıkta aydınlık yedek renge düşerdi)", () => {
    for (const [, , a, b] of METIN) for (const t of [a, b]) expect(T[t], t).toBeTruthy();
    for (const [, a, b] of KENAR) for (const t of [a, b]) expect(T[t], t).toBeTruthy();
  });
  it.each(METIN)("%s %s: karanlıkta WCAG AA ya da aydınlıktakinin en az yüzde 95'i", (_b, _p, on, zemin) => {
    const acik = oran(T[on].acik, T[zemin].acik), koyu = oran(T[on].koyu, T[zemin].koyu);
    expect(koyu).toBeGreaterThanOrEqual(esik(acik));
  });
  it("eşik sınırları: aydınlıkta AA karşılanıyorsa karanlıkta 4.5 zorunlu; AA altındaysa aydınlığın yüzde 95'i", () => {
    expect(esik(4.74)).toBe(4.5);
    expect(esik(4.6)).toBe(4.5); // eski min(4.5, 0.95 × 4.6) = 4.37 idi
    expect(4.4 >= esik(4.6)).toBe(false); // aydınlık 4.6, karanlık 4.4 → artık başarısız
    expect(esik(4.5)).toBe(4.5);
    expect(esik(4.34)).toBeCloseTo(4.123, 3);
    expect(esik(2.56)).toBeCloseTo(2.432, 3);
  });
  it.each(KENAR)("%s kenarlığı (%s) iki temada zeminden ayırt edilir", (_b, kenar, zemin) => {
    expect(oran(T[kenar].acik, T[zemin].acik)).toBeGreaterThanOrEqual(1.15);
    expect(oran(T[kenar].koyu, T[zemin].koyu)).toBeGreaterThanOrEqual(1.15);
  });
  it("ölçülen token çiftleri bileşen kaynağında gerçekten kullanılıyor (tablo kaynaktan kopmasın)", () => {
    const kaynak = readFileSync(path.join(__dirname, "..", "src", "components", "tasarim.jsx"), "utf-8");
    for (const t of new Set([...METIN.flatMap(([, , a, b]) => [a, b]), ...KENAR.flatMap(([, a, b]) => [a, b])])) expect(kaynak, t).toContain(`var(--${t},`);
  });
});

// Spec 0030 R2 (plan B5): sözlük dışı ekran renkleri. Bu blok yalnız eklendi, yukarıdaki tablolar değişmedi. Renkler
// sözlükte olmadığı için "kaynakta kullanılıyor" denetimi tasarim.jsx'e değil ilgili ekran dosyalarına bakar.
// Metin eşiği yukarıdakiyle aynı; kenarlıkta karanlık oran aydınlıktakinden düşük olmaz (aydınlık görünüm değişmediği için
// bugünkü değer taban: çalışan kutusunun kenarlığı aydınlıkta 1.12).
describe("Spec 0030: sözlük dışı ekran renkleri karanlıkta okunur", () => {
  // [yer, ön plan, zemin, kullanıldığı dosya]
  const METIN_0030 = [
    // Spec 0100 AC-49, R14/2, C7: Makina Stoğu'nun üç rozet çifti (Montajda, Satışa hazır, Önceki partiden kaldı).
    ["Stok 'Montajda' rozeti", "pur700", "purBg", "src/components/stock/MakinaStokTab.jsx"],
    ["Stok 'Satışa hazır' rozeti", "grn700", "grnBg", "src/components/stock/MakinaStokTab.jsx"],
    ["Stok 'Önceki partiden kaldı' rozeti", "blu700", "bluBg", "src/components/stock/MakinaStokTab.jsx"],
    // Spec 0114 R26/3 (Karar 23): ihraç kayıtlı rozeti teal; tevkifat rozetinden (mavi) ayrı, yeni token yok.
    ["İhraç kayıtlı rozeti", "teal2", "tealBg", "src/components/IhracKayitliAlani.jsx"],
    ["Anasayfa kredi kartı rozeti", "purTx", "purBg2", "src/components/Dashboard.jsx"],
    ["Tahsis/Stok 'anlaşmasız servis' rozeti", "pur700", "purBg2", "src/components/stock/TahsisModal.jsx"],
    ["Pano KALIP rozeti", "purTx", "purBg", "src/components/KargoPanosu.jsx"],
    ["Gider personel rozeti", "pur700", "purBg", "src/components/gider/GiderAlanlari.jsx"],
    ["Gider formu personel notu", "pur900", "purBg", "src/components/GiderForm.jsx"],
    ["Gider formu kalem tutarı kutusu", "n600", "purBg3", "src/components/GiderForm.jsx"],
    ["Farklı teslimat adresi vurgusu", "brand", "ambBg3", "src/components/KargoPanosu.jsx"],
    // Spec 0106 AC-24, R22/3: müşteri satırının yedi durum pili; renkler kütüphanede durduğu için kayıtların dosyası kütüphanedir.
    ["Müşteri pili 'ÖDEME BEKLİYOR'", "red700", "redBg2", "src/lib/musteriDurumu.js"],
    ["Müşteri pili 'MONTAJ YAPILIYOR'", "pur700", "purBg", "src/lib/musteriDurumu.js"],
    ["Müşteri pili 'MAKİNA HAZIR'", "grn700", "grnBg", "src/lib/musteriDurumu.js"],
    ["Müşteri pili 'KALIP SİPARİŞİ BEKLİYOR'", "amb700", "ambBg2", "src/lib/musteriDurumu.js"],
    ["Müşteri pili 'KALIP SİPARİŞ VERİLDİ'", "n600", "n150", "src/lib/musteriDurumu.js"],
    ["Müşteri pili 'KALIP ÜRETİMDE'", "blu700", "bluBg", "src/lib/musteriDurumu.js"],
    ["Müşteri pili 'KALIP HAZIR · TESLİM BEKLİYOR'", "teal2", "tealBg", "src/lib/musteriDurumu.js"],
    // Spec 0115 Karar 55: tamir rozeti (pano kartı ve Makina Geçmişi) ve üretim formunun Tamir hücresi amber.
    ["Tamir rozeti 'KALIP ATÖLYEDE'", "amb700", "ambBg", "src/components/TamirRozeti.jsx"],
    ["Üretim formu Tamir hücresi", "amb700", "ambBg", "src/components/stock/UretimFormu.jsx"],
  ];
  const KENAR_0030 = [
    ["Pano KALIP / personel rozeti", "purBr", "purBg", "src/components/gider/GiderAlanlari.jsx"],
    ["Çalışan ve gider formu kutusu", "purBg2", "purBg3", "src/components/CalisanManager.jsx"],
    ["Müşteri pili 'ÖDEME BEKLİYOR' (triyaj bulgu 4)", "redBr", "redBg2", "src/lib/musteriDurumu.js"],
    ["Müşteri pili 'KALIP SİPARİŞ VERİLDİ'", "n200", "n150", "src/lib/musteriDurumu.js"],
    ["Müşteri pili 'KALIP HAZIR · TESLİM BEKLİYOR'", "tealBr", "tealBg", "src/lib/musteriDurumu.js"],
    ["Tamir rozeti 'KALIP ATÖLYEDE' (spec 0115)", "ambBr", "ambBg", "src/components/TamirRozeti.jsx"],
  ];
  it.each(METIN_0030)("%s: karanlıkta WCAG AA ya da aydınlıktakinin en az yüzde 95'i", (_y, on, zemin) => {
    expect(T[on], on).toBeTruthy();
    expect(T[zemin], zemin).toBeTruthy();
    expect(oran(T[on].koyu, T[zemin].koyu)).toBeGreaterThanOrEqual(esik(oran(T[on].acik, T[zemin].acik)));
  });
  it.each(KENAR_0030)("%s kenarlığı: karanlıkta aydınlıktakinden az ayırt edilir değil", (_y, kenar, zemin) => {
    expect(oran(T[kenar].koyu, T[zemin].koyu)).toBeGreaterThanOrEqual(oran(T[kenar].acik, T[zemin].acik));
  });
  it("ölçülen çiftler ilgili ekran dosyasında gerçekten kullanılıyor", () => {
    for (const [y, a, b, f] of [...METIN_0030, ...KENAR_0030]) {
      const s = readFileSync(path.join(__dirname, "..", f), "utf-8");
      for (const t of [a, b]) expect(s, `${y}: ${t}`).toContain(`var(--${t},`);
    }
  });
});

// Spec 0106 AC-24, R18/2, Karar 35: renkli altı pilin metin tonları iki temada birbirinden en az 26 derece ayrılır (turuncu ile
// amber 9 derecede ayırt edilemiyordu) ve hiçbir pil ikinci bir pille aynı token çiftini kullanmaz. Değerler kütüphanenin pil
// tablosundan okunur; kütüphane bir rengi değiştirirse ölçüm de değişir.
describe("Spec 0106 AC-24: müşteri durum pillerinin ton ayrımı", () => {
  const ton = (hex) => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (!d) return 0;
    const x = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (x * 60 + 360) % 360;
  };
  const tokenAdi = (v) => /var\(--([A-Za-z0-9]+),/.exec(v)[1];
  it("altı renkli pil iki temada en az 26 derece ayrık; token çiftleri benzersiz", async () => {
    const { PILLER } = await import("../src/lib/musteriDurumu");
    const ciftler = Object.values(PILLER).map(p => [tokenAdi(p.renk), tokenAdi(p.zemin)]);
    expect(new Set(ciftler.map(c => c.join("/"))).size).toBe(ciftler.length);
    const renkli = ciftler.map(c => c[0]).filter(t => !/^n\d/.test(t));
    expect(renkli).toHaveLength(6);
    for (const tema of ["acik", "koyu"]) {
      for (let i = 0; i < renkli.length; i++) for (let j = i + 1; j < renkli.length; j++) {
        const fark = Math.abs(ton(T[renkli[i]][tema]) - ton(T[renkli[j]][tema]));
        // Takım Yöneticisi 2026-10-24 (Karar 41): spec'in ölçüm hassasiyeti tam derece; kırmızı/amber aydınlıkta 25,96 → 26.
        expect(Math.round(Math.min(fark, 360 - fark)), `${tema}: ${renkli[i]} / ${renkli[j]}`).toBeGreaterThanOrEqual(26);
      }
    }
  });
});

describe("Spec 0077 AC-29: kayıt perdesi iki temada okunur, karanlıkta beyaz değil", () => {
  // Perde yarı saydamdır; altındaki ekran en kötü durumda en açık (aydınlık) ya da en koyu (karanlık) olabilir.
  // Zemin, perde rengi alttaki iki uç renk (beyaz ve siyah) üstüne bindirilerek hesaplanır; metin (n900) iki uçta da AA.
  const rgba = (s) => { const m = s.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/); return m.slice(1).map(Number); };
  const bindir = ([r, g, b, a], alt) => "#" + [r, g, b].map((c, i) => Math.round(c * a + parseInt(alt.slice(1 + i * 2, 3 + i * 2), 16) * (1 - a))
    .toString(16).padStart(2, "0")).join("");
  it.each([["acik"], ["koyu"]])("%s tema: n900 metni perde zemininde WCAG AA", (tema) => {
    expect(T.perdeBg, "perdeBg TOKENS'ta").toBeTruthy();
    for (const alt of ["#ffffff", "#000000", T.surface[tema]]) {
      const zemin = bindir(rgba(T.perdeBg[tema]), alt);
      expect(oran(T.n900[tema], zemin), `${tema} / ${alt}`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("karanlık temada perde zemini beyaz değil; bileşen token'ı okur", () => {
    const [r, g, b] = rgba(T.perdeBg.koyu);
    expect(Math.max(r, g, b)).toBeLessThan(80);
    const s = readFileSync(path.join(__dirname, "..", "src/components/KayitPerdesi.jsx"), "utf-8");
    expect(s).toContain("var(--perdeBg,");
    expect(s).toContain("var(--n900,");
  });
});
