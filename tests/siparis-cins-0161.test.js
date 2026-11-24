// Spec 0161: sipariş listesinde parçalar cinse göre bloklanır. Saf motor (pencerenin iki parça tablosu ve belgenin grupları), ayarın
// tek okuma yolu ve doğrulayıcı, pencere ile belgenin çapraz ölçümü, sunucu ve kaynak taramaları. Test adları AC-<n> taşır.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { siparisIhtiyaci, cinseGoreSirala, cinsSirasiOf, cinsSirasiDogrula, GRUP_TURU, CINS_SIRA_SATIR_HATASI, CINS_SIRA_KARAKTER_HATASI } from "../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml } from "../src/lib/siparisRaporu";
import { trLower } from "../src/lib/utils";
import { veri, PARCALAR } from "./fixtures/0161-veri";

const require = createRequire(import.meta.url);
const ham = (f) => readFileSync(f, "utf8");
const kod = (f) => ham(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const dosyalar = (kok) => readdirSync(kok).flatMap(f => { const y = path.join(kok, f); return statSync(y).isDirectory() ? dosyalar(y) : /\.(jsx?|cjs|mjs)$/.test(f) ? [y] : []; });
const kos = (cinsSirasi, o = {}) => siparisIhtiyaci(veri(o), { tedarikciOdakli: true, cinsSirasi, ...(o.secenek || {}) });
const tb = (cs, o) => kos(cs, o).tedarikciBolumleri;
const pencere = (cs, o) => tb(cs, o).bolumler.find(b => b.tedarikciId === "22").hazirParcalar;
const idler = (l) => l.map(x => x.partId);
const grup = (cs, tid, tur, o) => tb(cs, o).belge.find(b => b.tedarikciId === tid).gruplar.find(g => g.tur === tur).satirlar;
const ONCELIK = ["Rulman", "Keçe"];

describe("Spec 0161: blok sırası (R1, R1/2)", () => {
  it("AC-1: öncelik listesinde 'Rulman' varken Rulman cinsliler hazır parçalar tablosunun başında ve ard arda", () => {
    expect(idler(grup(["Rulman"], "22", GRUP_TURU.HAZIR)).slice(0, 3)).toEqual(["103", "105", "108"]);
    expect(idler(pencere(["Rulman"])).slice(0, 3)).toEqual(["103", "105", "108"]);
  });
  it("AC-2: iki cinsli öncelikte bloklar listedeki sırayla (Rulman, sonra Keçe)", () => {
    expect(idler(grup(ONCELIK, "22", GRUP_TURU.HAZIR)).slice(0, 5)).toEqual(["103", "105", "108", "102", "109"]);
    expect(idler(grup(["Keçe", "Rulman"], "22", GRUP_TURU.HAZIR)).slice(0, 5)).toEqual(["102", "109", "103", "105", "108"]);
  });
  it("AC-3: öncelikte olmayan dolu cinsler öncelikli bloklardan sonra alfabetik", () => {
    expect(idler(grup(ONCELIK, "22", GRUP_TURU.HAZIR)).slice(5, 7)).toEqual(["107", "104"]); // Rulmanlar, Vida
  });
  it("AC-4: cinsi boş parçalar en sonda, aralarında bugünkü (kit) sırası", () => {
    expect(idler(grup(ONCELIK, "22", GRUP_TURU.HAZIR)).slice(-2)).toEqual(["101", "106"]);
  });
  it("AC-5 / AC-6: 'RULMAN', 'Rulman' ve boşluklu ' rulman ' aynı blokta; satırlar kendi yazımını taşır", () => {
    const s = pencere(ONCELIK).slice(0, 3);
    expect(s.map(x => x.cins)).toEqual(["Rulman", "RULMAN", "rulman"]); // motor baştaki ve sondaki boşluğu 0158'in yazıcısıyla kırpar
  });
  it("AC-7 / AC-31: blok içinde pencere ekleme (kit) sırasını korur; pencere satırı kitSira taşımaz", () => {
    const rul = pencere(ONCELIK).filter(x => trLower(x.cins || "") === "rulman").map(x => x.partId);
    expect(rul).toEqual(["103", "105", "108"]);
    expect(pencere(ONCELIK).every(x => !("kitSira" in x))).toBe(true);
  });
  it("AC-8 / AC-38: hammadde tablosunda cins kesidin üstünde; blok içi sıra kesit sonra ad", () => {
    const once = idler(grup([], "21", GRUP_TURU.HAMMADDE, { parts: PARCALAR.map(({ cins: _c, ...p }) => p) }));
    expect(once).toEqual(["110", "112", "111"]); // cinssiz: Ø30 (Mil A, Mil B), Ø50
    expect(idler(grup([], "21", GRUP_TURU.HAMMADDE))).toEqual(["112", "110", "111"]); // Aks, Mil aynı kesitte ayrı bloklar
    // Aks bloğu iki kesit taşır (Ø30, Ø50) ve kesit sırasıyla gelir; aynı kesitteki Mil B ayrı blokta sonra.
    const iki = PARCALAR.map(p => (p.id === 111 || p.id === 110 ? { ...p, cins: "Aks" } : p.id === 112 ? { ...p, cins: "Mil" } : p));
    expect(idler(grup([], "21", GRUP_TURU.HAMMADDE, { parts: iki }))).toEqual(["110", "111", "112"]);
  });
  it("AC-10 / AC-32: öncelik listesi boşken de sıralama çalışır (alfabetik bloklar, boşlar sonda)", () => {
    expect(pencere([]).map(x => x.cins || "-")).toEqual(["Aks", "Keçe", "keçe", "Mil", "Rulman", "RULMAN", "rulman", "Rulmanlar", "Vida", "-", "-", "-"]);
    expect(idler(tb(undefined).bolumler[0].hazirParcalar)).toEqual(idler(pencere([])));
  });
  it("AC-40: karşılaştırma katlanmış anahtar üzerinde; 'Rulmanlar' ile 'rulman' ayrı bloklar", () => {
    const s = pencere(["rulmanlar"]);
    expect(s[0].cins).toBe("Rulmanlar");
    expect(s.slice(1).some(x => x.cins === "Rulmanlar")).toBe(false);
    expect(cinseGoreSirala([{ cins: "rulmanlar" }, { cins: "RULMAN" }, { cins: "Çivi" }, { cins: "cıvata" }]).map(x => x.cins)).toEqual(["cıvata", "Çivi", "RULMAN", "rulmanlar"]);
  });
  it("AC-52: öncelik listesine 'RULMAN' yazılması 'rulman' cinslileri de öne alır", () => {
    expect(idler(pencere(["RULMAN"])).slice(0, 3)).toEqual(["103", "105", "108"]);
    expect(idler(pencere(["  rulman  "])).slice(0, 3)).toEqual(["103", "105", "108"]);
  });
  it("AC-19: katalogda bulunmayan cins listede durabilir, hata yok ve sıra etkilenmez", () => {
    expect(idler(pencere(["Zımba", "Rulman"]))).toEqual(idler(pencere(["Rulman"])));
  });
  it("AC-36: 'Tedarikçi belirtilmemiş' kutusunun parça tablosu da bloklanır", () => {
    expect(idler(tb([]).belirtilmemis.parcalar)).toEqual(["114", "113"]);
  });
  it("AC-39: pencerede cinsi boş malzemeli parça, cinsi dolu hazır parçanın altına iner", () => {
    const s = pencere([]);
    expect(s.findIndex(x => x.partId === "111")).toBeGreaterThan(s.findIndex(x => x.partId === "104"));
    expect(s.find(x => x.partId === "111").malzemeli).toBe(true);
  });
});

describe("Spec 0161: rakamlar ve öteki listeler değişmez (C4, X8)", () => {
  const sirali = (o) => JSON.parse(JSON.stringify(o, (k, v) => (Array.isArray(v) && v.length && v[0] && typeof v[0] === "object" && "partId" in v[0]
    ? [...v].sort((a, b) => String(a.partId).localeCompare(String(b.partId))) : v)));
  it("AC-24 / AC-26: satır sırası dışında bütün tutarlar, adetler, kilogramlar ve toplamlar aynı; kapalı ve hatalı satır aynı kurala girer", () => {
    const d = { parca: { 106: { kapali: true }, 103: { adet: "x" } }, kesit: {} };
    const a = kos([], { secenek: { duzenleme: d } }), b = kos(ONCELIK, { secenek: { duzenleme: d } });
    expect(sirali(a)).toEqual(sirali(b));
    const p = pencere(ONCELIK, { secenek: { duzenleme: d } });
    expect(p.find(x => x.partId === "106").kapali).toBe(true);
    expect(p.find(x => x.partId === "103").hata).toBeTruthy();
    expect(p[0].partId).toBe("103"); // hatalı satır da kendi bloğunda
    expect(idler(p.slice(-3))).toEqual(["101", "106", "111"]); // kapalı satır cinssiz blokta, kit sırasıyla
  });
  it("AC-35: işlemler tablosu ve çizilmeyen düz listeler (parcalar, kesitler, kalemler) sıralanmaz", () => {
    const a = kos([]), b = kos(ONCELIK);
    for (const k of ["parcalar", "kesitler"]) expect(JSON.stringify(b[k]), k).toBe(JSON.stringify(a[k]));
    expect(JSON.stringify(b.tedarikciBolumleri.bolumler.map(x => x.islemler))).toBe(JSON.stringify(a.tedarikciBolumleri.bolumler.map(x => x.islemler)));
    const ham = siparisIhtiyaci(veri({ parts: PARCALAR.map(({ cins: _c, ...p }) => p) }), { tedarikciOdakli: true });
    expect(idler(ham.parcalar)).toEqual(idler(a.parcalar));
  });
  it("AC-37 / AC-12: belgede sıralama grubun içinde; düz liste gruplardan türer, grup sırası, başlık ve sütun kümesi aynı", () => {
    const a = tb([]).belge, b = tb(ONCELIK).belge;
    for (const [x, y] of a.map((x, i) => [x, b[i]])) {
      expect(y.gruplar.map(g => [g.tur, g.baslik, g.sutunlar])).toEqual(x.gruplar.map(g => [g.tur, g.baslik, g.sutunlar]));
      expect(idler(y.satirlar)).toEqual(y.gruplar.flatMap(g => idler(g.satirlar)));
      expect(y.toplamlar).toEqual(x.toplamlar);
    }
  });
  it("AC-13: belgede cins bloğu için başlık ya da ayraç satırı basılmaz", () => {
    const htmlA = siparisRaporuHtml(kos([]), { bugun: "2026-11-24", factory: { name: "A" } });
    const htmlB = siparisRaporuHtml(kos(ONCELIK), { bugun: "2026-11-24", factory: { name: "A" } });
    const satir = (h) => (h.match(/<tr/g) || []).length;
    expect(satir(htmlB)).toBe(satir(htmlA));
    expect(htmlB).not.toMatch(/>\s*(Rulman|Keçe)\s*<\/(th|h\d|caption)/);
  });
});

describe("Spec 0161: pencere ile belge aynı kural (R2, P3)", () => {
  const bloklar = (l) => l.map(x => trLower(String(x.cins || "").trim())).filter(Boolean).filter((k, i, a) => i === 0 || a[i - 1] !== k);
  it("AC-11: bir tablonun içindeki dolu cins bloklarının sırası pencere ile belgede aynı (ortak parçalar üzerinde)", () => {
    for (const cs of [[], ONCELIK, ["Vida", "keçe"]]) {
      const t = tb(cs);
      const p = t.bolumler.find(b => b.tedarikciId === "22").hazirParcalar;
      const g = t.belge.find(b => b.tedarikciId === "22").gruplar.find(x => x.tur === GRUP_TURU.HAZIR).satirlar;
      const ortak = new Set(idler(g));
      expect(bloklar(p.filter(x => ortak.has(x.partId))), JSON.stringify(cs)).toEqual(bloklar(g));
    }
  });
});

describe("Spec 0161: ayarın okuma yolu ve doğrulayıcı (R3, C2)", () => {
  it("cinsSirasiOf: dizi değilse aynı boş dizi; okuma kırpmaz", () => {
    expect(cinsSirasiOf({})).toBe(cinsSirasiOf(undefined));
    const uzun = Array.from({ length: 150 }, (_, i) => `c${i}`);
    expect(cinsSirasiOf({ cinsSirasi: uzun })).toHaveLength(150);
  });
  it("AC-17 / AC-18 / AC-50: boş satır yazılmaz, kırpılır, yinelenen cins tek satır (ilk yazım)", () => {
    expect(cinsSirasiDogrula(["  Rulman ", "", "   ", "rulman", "RULMAN", "Keçe"])).toEqual({ liste: ["Rulman", "Keçe"] });
  });
  it("AC-43: 100 satırdan uzun liste ve 100 karakterden uzun satır reddedilir; saklı uzun liste sıralamayı çalıştırır", () => {
    expect(cinsSirasiDogrula(Array.from({ length: 101 }, (_, i) => `c${i}`))).toEqual({ hata: CINS_SIRA_SATIR_HATASI });
    expect(cinsSirasiDogrula(Array.from({ length: 100 }, (_, i) => `c${i}`)).liste).toHaveLength(100);
    expect(cinsSirasiDogrula(["x".repeat(101)])).toEqual({ hata: CINS_SIRA_KARAKTER_HATASI });
    const uzun = [...Array.from({ length: 150 }, (_, i) => `c${i}`), "Keçe"];
    expect(idler(pencere(uzun))[0]).toBe("102");
  });
});

describe("Spec 0161: sunucu (C6, P2)", () => {
  const { ayarAlanEngelli, AYAR_ALAN_SEKMELERI } = require("../electron/serverAuth.cjs");
  it("AC-22 / AC-29: alan Ayarlar sekmesine ait; sekmesi olmayan kullanıcının yazımı reddedilir, yeni eylem izni yok", () => {
    expect(AYAR_ALAN_SEKMELERI.cinsSirasi).toEqual(["settings"]);
    expect(ayarAlanEngelli({ tabs: ["stock"] }, {}, { cinsSirasi: ["Rulman"] })).toBe("cinsSirasi");
    expect(ayarAlanEngelli({ tabs: ["settings"] }, {}, { cinsSirasi: ["Rulman"] })).toBeNull();
    for (const f of ["src/components/settings/serverPermissionDefs.js", "src/lib/permissions.js"]) expect(ham(f), f).not.toMatch(/cinsSira|cinssira/);
  });
  it("AC-53 / P2: alanı tanımayan (eski) sunucuda yazım Ayarlar sekmesiyle 403 almaz, başka alan etkilenmez; db INSERT sütunları sayar", () => {
    const yedek = AYAR_ALAN_SEKMELERI.cinsSirasi;
    delete AYAR_ALAN_SEKMELERI.cinsSirasi;
    try {
      expect(ayarAlanEngelli({ tabs: ["settings"] }, { kdvRate: 20 }, { kdvRate: 20, cinsSirasi: ["Rulman"] })).toBeNull();
      expect(ayarAlanEngelli({ tabs: ["stock"] }, { kdvRate: 20 }, { kdvRate: 20, cinsSirasi: ["Rulman"] })).toBe("cinsSirasi");
    } finally { AYAR_ALAN_SEKMELERI.cinsSirasi = yedek; }
    // Liste düşer: app_settings INSERT'i sütunları tek tek sayar (bilinmeyen anahtar yazılmaz); App yükleme yolu alanı açıkça okur.
    expect(kod("electron/db.cjs")).toMatch(/INSERT INTO app_settings \([^)]*\bcinsSirasi\)/);
    expect(kod("src/App.jsx")).toMatch(/cinsSirasi: data\.appSettings\.cinsSirasi/);
  });
});

describe("Spec 0161: kaynak taramaları (C1, C2, C2/2, C11)", () => {
  const BILESENLER = dosyalar("src/components").map(f => f.split(path.sep).join("/"));
  it("AC-27 / AC-48 / AC-49: sıralamayı motor çağırır; bileşenlerde ikinci cins karşılaştırması yok, gösterim serbest", () => {
    for (const f of BILESENLER) {
      const s = kod(f);
      expect(s, f).not.toMatch(/cinseGoreSirala\(/);
      const satirlar = s.split("\n").filter(l => /\bcins\b/.test(l));
      for (const l of satirlar) expect(l, f).not.toMatch(/localeCompare|trLower|toLocaleLowerCase|\.sort\(/);
    }
    expect(kod("src/components/stock/SiparisPenceresi.jsx")).toMatch(/cins/); // gösterim duruyor
    expect(kod("src/lib/siparisIhtiyaci.js").match(/cinseGoreSirala\(/g)).toHaveLength(3); // üç çağrı: iki pencere tablosu, belge grubu
  });
  // Triyaj (bulgu 4): aynı tarama AC-25'i de ölçer: ayar yalnız App'te ve motorda okunur, yani maliyet, fiyat, stok, arama ve Excel
  // yolları onu hiç görmez.
  it("AC-25 / AC-28: motor ayarı okumaz; liste seçenekten, tek okuma yolu cinsSirasiOf; ayar başka hiçbir hesaba sızmaz", () => {
    const m = kod("src/lib/siparisIhtiyaci.js");
    expect(m.match(/appSettings/g)).toHaveLength(3); // yalnız cinsSirasiOf'un imzası ve gövdesi
    expect(m.split("\n").filter(l => /appSettings/.test(l)).every(l => /cinsSirasiOf/.test(l))).toBe(true);
    expect(m).toMatch(/cinsSirasi = \[\] \} = secenek/);
    const gecen = dosyalar("src").filter(f => /\.cinsSirasi\b/.test(kod(f))).map(f => f.split(path.sep).join("/")).sort();
    expect(gecen).toEqual(["src/App.jsx", "src/lib/siparisIhtiyaci.js"]);
  });
  it("AC-55 / P8: sıralama satırın cins değerini okur; parcaBilgi.js'e import girmez, 0158 sayıları aynı", () => {
    const m = kod("src/lib/siparisIhtiyaci.js");
    expect(m).not.toMatch(/\bp\.cins\b/);
    expect(kod("src/lib/parcaBilgi.js")).not.toMatch(/^import /m);
    expect(m.match(/PARCA_BILGI_ALANLARI/g)).toHaveLength(2);
    expect(m.match(/parcaBilgisi\(/g)).toHaveLength(1);
  });
  // Triyaj (bulgu 1): AC-33 on altındır ve ayıklamasız kalır; cinsi dolu veriden türeyen iki kıyas (0157, 0159) AC-34'ün dar
  // ayıklamasını (eski altına yeni kural) kullanır, altınları yenilenmez.
  it("AC-33 / AC-34: on kıyas dosyası ayıklama almaz; yalnız 0157 ve 0159 kıyası 0161 ayıklamasıyla karşılaştırır, altınlar yenilenmedi", () => {
    const ON = ["tests/maliyet-kalemleri-0135-kiyas.test.js", "tests/dis-islem-kalkar-0138-kiyas.test.js", "tests/fire-kg-0139-kiyas.test.js",
      "tests/siparis-0140-kiyas.test.js", "tests/isleme-payi-0141-kiyas.test.js", "tests/siparis-0142-kiyas.test.js", "tests/boydan-siparis-0143-kiyas.test.js",
      "tests/siparis-0144-kiyas.test.js", "tests/siparis-belgesi-0147.test.js", "tests/ui/siparis-belgesi-0147.test.jsx", "tests/siparis-islem-0150-kiyas.test.js"];
    const kiyaslar = dosyalar("tests").map(f => f.split(path.sep).join("/")).filter(f => /0161-ayikla/.test(ham(f)) && !/0161/.test(path.basename(f))).sort();
    expect(kiyaslar).toEqual(["tests/alim-kalemi-0159-kiyas.test.js", "tests/ui/doviz-parca-0157-kiyas.test.jsx"]);
    for (const f of ON) expect(ham(f), f).not.toMatch(/0161-ayikla|cinsSirasiUygula/);
    const yol = ["specs/0161-siparis-listesinde-cins-sirasi.md", "specs/done/0161-siparis-listesinde-cins-sirasi.md"].find(f => { try { ham(f); return true; } catch { return false; } });
    const spec = ham(yol);
    expect(spec).toMatch(/\*\*AC-33\.\*\* Cinsi hiç dolu olmayan on kıyas altını \(0135, 0138, 0139, 0140, 0141, 0142, 0143, 0144, 0147, 0150\)/);
    expect(spec).toMatch(/\*\*AC-34\.\*\*[^\n]*doviz-parca-0157-kiyas[^\n]*alim-kalemi-0159-kiyas[^\n]*altınlarını yenilemez/);
  });
});
