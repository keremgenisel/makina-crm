// Spec 0143: boy fiyatı yöntemi kalkar, yerine boydan sipariş işareti gelir. Motor (malzeme.js, siparisIhtiyaci.js), belge ve kaynak
// taramaları. Rakamlar spec'in Context ölçümlerinden (Ø35 dayama 70 × 45,71 mm / 400 mm; Ø16 kestamit 70 × 14,29 mm / 1000 mm).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as M from "../src/lib/malzeme";
import * as S from "../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml } from "../src/lib/siparisRaporu";

const KART = { id: 501, ad: "Paslanmaz", ozgulAgirlik: 7.9, kiloFiyati: 200, paraBirimi: "TRY", fire: 0, tedarikciId: 11 };
const TED = [{ id: 11, ad: "Alfa Çelik", hammadde: true }];
const kalem = (o) => ({ tur: "malzeme", malzemeId: 501, bicim: "mil", cap: 35, boy: 45.71, adet: 1, ...o });
const parca = (id, ad, k) => ({ id, ad, maliyetKalemleri: Array.isArray(k) ? k : [k] });
const hesap = (parts, { adet = 70, malzemeler = [KART], kit = null, sec } = {}) => S.siparisIhtiyaci({
  modeller: [{ model: "M1", defaultParcalar: (kit || parts.map(p => [p.id, 1])).map(([partId, miktar]) => ({ partId: String(partId), miktar })) }],
  satirlar: [{ model: "M1", adet: String(adet) }], parts, partStock: [], malzemeler, tedarikciler: TED,
}, sec);
const isaretli = (o) => kalem({ boydanSiparis: true, cubukBoyu: 400, ...o });
const oz = (k, m = KART) => M.malzemeOzeti(k, M.malzemeKatalogu([m]));

describe("Spec 0143 B: işaret ve çubuk boyu (doğrulama)", () => {
  const form = (o) => ({ ...M.malzemeSatiriFormu({ malzemeId: 501, bicim: "mil", cap: 35, boy: 45.71 }), ...o });
  it("AC-9: işaretli ve çubuk boyu boşken kayıt reddedilir, hata çubuk boyu alanında", () => {
    const v = M.malzemeSatiriDogrula(form({ boydanSiparis: true, cubukBoyu: "" }));
    expect(v.gecerli).toBe(false); expect(v.hatalar.cubukBoyu).toBe(M.CUBUK_BOYU_HATASI);
    expect(M.malzemeSatiriDogrula(form({ boydanSiparis: true, cubukBoyu: "0" })).hatalar.cubukBoyu).toBe(M.CUBUK_BOYU_HATASI);
  });
  it("AC-10 / AC-25 / AC-26: işaretsizken çubuk boyu yazılmaz; işaretliyken iki alan yazılır; yontem anahtarı hiç yok", () => {
    const yok = M.malzemeSatiriDogrula(form({ boydanSiparis: false, cubukBoyu: "400" }));
    expect(yok.kayit).not.toHaveProperty("cubukBoyu"); expect(yok.kayit).not.toHaveProperty("boydanSiparis");
    const var_ = M.malzemeSatiriDogrula(form({ boydanSiparis: true, cubukBoyu: "400" }));
    expect(var_.kayit).toMatchObject({ boydanSiparis: true, cubukBoyu: 400 });
    expect(var_.kayit).not.toHaveProperty("yontem");
    expect(M.malzemeSatiriDogrula({ ...form({}), yontem: "boy" }).kayit).not.toHaveProperty("yontem");
  });
  it("AC-44: çubuk boyu belirsiz yazılmış sayıyı ve negatifi reddeder, üç ondalık kabul eder", () => {
    expect(M.malzemeSatiriDogrula(form({ boydanSiparis: true, cubukBoyu: "6.000" })).hatalar.cubukBoyu).toBe(M.BELIRSIZ_HATASI);
    expect(M.malzemeSatiriDogrula(form({ boydanSiparis: true, cubukBoyu: "-400" })).hatalar.cubukBoyu).toBe(M.CUBUK_BOYU_HATASI);
    expect(M.malzemeSatiriDogrula(form({ boydanSiparis: true, cubukBoyu: "abc" })).hatalar.cubukBoyu).toBe(M.SAYI_HATASI);
    expect(M.malzemeSatiriDogrula(form({ boydanSiparis: true, cubukBoyu: "399,125" })).kayit.cubukBoyu).toBe(399.125);
  });
  it("AC-45 (motor): parça çubuktan uzunken kayıt geçer ve uyarı ölçütü doğar", () => {
    const v = M.malzemeSatiriDogrula(form({ boydanSiparis: true, cubukBoyu: "40" }));
    expect(v.gecerli).toBe(true);
    expect(M.cubukKisaMi(v.kayit)).toBe(true);
    expect(M.cubukKisaMi({ ...v.kayit, cubukBoyu: 400 })).toBe(false);
    expect(M.cubukKisaMi({ ...v.kayit, boydanSiparis: false })).toBe(false);
  });
  it("AC-11: işaretli kalemin maliyeti işaretsiz hâliyle birebir aynı", () => {
    expect(oz(isaretli())).toEqual(oz(kalem()));
    expect(oz(isaretli()).maliyetK).toBeGreaterThan(0);
  });
});

describe("Spec 0143 C: boy adedi", () => {
  it("AC-12: 70 × 45,71 mm ÷ 400 mm → 8 boy (tüketim oranı; yerleşim 9 derdi)", () => {
    expect(hesap([parca(1, "Dayama", isaretli())]).kesitler[0].boyAdedi).toBe(8);
  });
  it("AC-13 / AC-37: 70 × 14,29 mm ÷ 1000 mm = 1,0003 → üç ondalıkta 1,000 → 1 boy; yuvarlama toplamda bir kez", () => {
    const k = hesap([parca(1, "Sıyırıcı", isaretli({ cap: 16, boy: 14.29, cubukBoyu: 1000 }))]).kesitler[0];
    expect(k.boyAdedi).toBe(1);
    // İki parça (35 + 35 adet) tek satırda: toplam 70 × 14,29 = 1000,3 → 1 boy; parça başına yuvarlansaydı 1 + 1 = 2 olurdu.
    const iki = hesap([parca(1, "A", isaretli({ cap: 16, boy: 14.29, cubukBoyu: 1000 })), parca(2, "B", isaretli({ cap: 16, boy: 14.29, cubukBoyu: 1000 }))], { adet: 35 }).kesitler;
    expect(iki).toHaveLength(1); expect(iki[0].boyAdedi).toBe(1);
  });
  it("AC-14: fire yüzdesi %10 da sonucu değiştirmez (1 boy)", () => {
    expect(hesap([parca(1, "Sıyırıcı", isaretli({ cap: 16, boy: 14.29, cubukBoyu: 1000, fire: 10 }))]).kesitler[0].boyAdedi).toBe(1);
  });
  it("AC-15: çap bandından kilogram firesi gelen parçada boy sayısı değişmez", () => {
    const tablolu = { ...KART, fireBantlari: [{ alt: 0, kg: 2 }] };
    const a = hesap([parca(1, "D", isaretli())]).kesitler[0]; const b = hesap([parca(1, "D", isaretli())], { malzemeler: [tablolu] }).kesitler[0];
    expect(b.boyAdedi).toBe(a.boyAdedi); expect(b.siparisKg).toBe(a.siparisKg); expect(b.fireKg).toBeGreaterThan(a.fireKg);
  });
  it("AC-16: aynı kesit ve aynı çubuk boyuyla işaretli iki parçanın uzunlukları toplanır, tek satır tek boy adedi", () => {
    const r = hesap([parca(1, "A", isaretli({ boy: 100 })), parca(2, "B", isaretli({ boy: 200 }))], { adet: 10 });
    expect(r.kesitler).toHaveLength(1); expect(r.kesitler[0].boyAdedi).toBe(8); // (10 × 100 + 10 × 200) ÷ 400 = 7,5 → 8
  });
  it("AC-17 / C1: aynı kesitin işaretli ve işaretsiz kalemleri iki ayrı satır", () => {
    const r = hesap([parca(1, "A", isaretli()), parca(2, "B", kalem())]);
    expect(r.kesitler.map(k => k.boydanSiparis).sort()).toEqual([false, true]);
  });
  it("AC-18 / AC-61: parça çubuktan uzunsa boy adedi yok, neden çubuk boyuna atıf yapar, sipariş kilogramla (net artı fire)", () => {
    const k = hesap([parca(1, "Uzun", isaretli({ boy: 500 }))], { malzemeler: [{ ...KART, fire: 10 }] }).kesitler[0];
    expect(k.boyAdedi).toBeNull(); expect(k.boyNeden).toBe(S.NEDEN_KESIM_BUYUK); expect(S.NEDEN_KESIM_BUYUK).toMatch(/çubuk boyu/);
    expect(k.siparisKg).toBeCloseTo(k.netKg + k.fireKg, 9); expect(S.boyCinsindenMi(k)).toBe(false);
    const r = hesap([parca(1, "Uzun", isaretli({ boy: 500 }))], { sec: { tedarikciOdakli: true } });
    const html = siparisRaporuHtml(r, { bugun: "2026-11-12" });
    expect(html).toContain(`>${S.kgMetni(r.kesitler[0].siparisKg)}<`); expect(html).not.toMatch(/\d+ boy</); // belgede kilogramla
  });
  it("AC-19 / AC-38: işaretsiz satırda boy adedi yok, sipariş kilosu net artı fire, artan kilo alanı yok", () => {
    const k = hesap([parca(1, "A", kalem())], { malzemeler: [{ ...KART, fire: 8 }] }).kesitler[0];
    expect(k.boyAdedi).toBeNull(); expect(k.boyNeden).toBeNull();
    expect(k.siparisKg).toBeCloseTo(k.netKg + k.fireKg, 9); expect(k).not.toHaveProperty("artanKg");
  });
  it("AC-20 / B-R9: asgari 100 kg; hesaplanan boyun kilosu altındaysa boy adedi asgariyi karşılayacak sayıya çıkar", () => {
    const k0 = hesap([parca(1, "D", isaretli())]).kesitler[0];
    const k = hesap([parca(1, "D", isaretli())], { malzemeler: [{ ...KART, asgariSiparis: 100 }] }).kesitler[0];
    expect(k0.siparisKg).toBeLessThan(100);
    expect(k.boyAdedi).toBe(Math.ceil(100 / k0.tamKg)); expect(k.siparisKg).toBeGreaterThanOrEqual(100);
    expect(k.asgariFark).toBeCloseTo(k.siparisKg - k0.siparisKg, 9);
  });
  it("AC-35 / AC-36 / AC-62: aynı kesit iki farklı çubuk boyuyla iki satır, her biri kendi çubuğuyla; anahtar biçimi", () => {
    const r = hesap([parca(1, "A", isaretli({ boy: 100 })), parca(2, "B", isaretli({ boy: 100, cubukBoyu: 3000.0004 }))], { adet: 30 });
    expect(r.kesitler).toHaveLength(2);
    const a = r.kesitler.find(k => k.cubukBoyu === 400); const b = r.kesitler.find(k => k.cubukBoyu === 3000);
    expect(a.boyAdedi).toBe(8); expect(b.boyAdedi).toBe(1); // 3000 ÷ 400 = 7,5 → 8; 3000 ÷ 3000 = 1
    expect(a.anahtar).toBe("501|boy|400|mil|35"); expect(b.anahtar).toBe("501|boy|3000|mil|35");
    expect(S.kesitAnahtari(501, false, null, "mil", [35])).toBe("501|kilo||mil|35");
    // 0142'nin parça ölçüleri aynı anahtarı taşır.
    expect(r.parcalar.find(p => p.ad === "A").olculer[0].anahtar).toBe(a.anahtar);
  });
  it("AC-39 / AC-42: işaretli satırın sipariş kilosu boy adedi × tam çubuk ağırlığı; çubuk ağırlığı kalemin çubuk boyundan", () => {
    const k = hesap([parca(1, "D", isaretli())]).kesitler[0];
    const tam = M.agirlikKg("mil", { cap: 35, boy: 400 }, 7.9);
    expect(k.tamKg).toBeCloseTo(tam, 12); expect(k.siparisKg).toBeCloseTo(8 * tam, 9);
    expect(M.tamBoyKg({ bicim: "mil", cap: 35, boy: 1, cubukBoyu: 400 }, { ozgulAgirlik: 7.9, geldigiBoy: 99 })).toBeCloseTo(tam, 12);
    expect(M.tamBoyKg({ bicim: "mil", cap: 35, boy: 1 }, { ozgulAgirlik: 7.9, geldigiBoy: 6 })).toBeNull(); // kart okunmaz
  });
  it("AC-40: tutar sipariş kilosu × kilo fiyatı × kur; boy fiyatı hiçbir yerde okunmaz", () => {
    const dov = { ...KART, paraBirimi: "USD", kur: 40, kiloFiyati: 5, boyFiyati: 9999 };
    const k = hesap([parca(1, "D", isaretli())], { malzemeler: [dov] }).kesitler[0];
    expect(k.tutarTLK).toBe(Math.round(Number((k.siparisKg * 5 * 40 * 100).toFixed(6))));
  });
  it("AC-41 / AC-22 (motor): elle düzenlenen boy satırının kilosu ve tutarı aynı yoldan; doğrulayıcı boy adedidir", () => {
    const parts = [parca(1, "D", isaretli())];
    const an = hesap(parts).kesitler[0].anahtar;
    const k = hesap(parts, { sec: { duzenleme: { parca: {}, kesit: { [an]: { deger: "12" } } } } }).kesitler[0];
    expect(k.elle).toBe(true); expect(k.boyAdedi).toBe(12); expect(k.siparisKg).toBeCloseTo(12 * k.tamKg, 9);
    expect(k.tutarTLK).toBe(Math.round(Number((k.siparisKg * 200 * 100).toFixed(6))));
    // "8,5" boy adedi değildir (kilogram doğrulayıcısı uygulanmaz, C-R1/2).
    expect(hesap(parts, { sec: { duzenleme: { parca: {}, kesit: { [an]: { deger: "8,5" } } } } }).kesitler[0].hata).toBe(S.ELLE_BOY_HATASI);
  });
  it("AC-43 (motor): lama kaleminde de boy adedi hesaplanır", () => {
    const k = hesap([parca(1, "Lama", { tur: "malzeme", malzemeId: 501, bicim: "lama", kalinlik: 10, genislik: 20, boy: 250, adet: 1, boydanSiparis: true, cubukBoyu: 6000 })]).kesitler[0];
    expect(k.boyAdedi).toBe(3); // 70 × 250 ÷ 6000 = 2,92 → 3
  });
  it("AC-47: işaretli satırda 0139'un fire uyarısı yazar; işaretsizde yazmaz", () => {
    const m = { ...KART, fire: 5 };
    expect(hesap([parca(1, "D", isaretli())], { malzemeler: [m] }).kesitler[0].fireUyarisi).toBe(S.FIRE_BOY_UYARISI);
    expect(hesap([parca(1, "D", kalem())], { malzemeler: [m] }).kesitler[0].fireUyarisi).toBeNull();
  });
  it("AC-63: işaretli satırın kesit metni çubuk boyunu yazar; pencere ve belge aynı metni basar", () => {
    const r = hesap([parca(1, "D", isaretli())], { sec: { tedarikciOdakli: true } });
    expect(r.kesitler[0].kesitMetni).toBe("Ø35 · 400 mm çubuk");
    expect(siparisRaporuHtml(r, { bugun: "2026-11-12" })).toContain("Ø35 · 400 mm çubuk");
  });
  it("AC-24: belgenin malzeme toplamında işaretli malzeme N boy, işaretsiz kilogram", () => {
    const r = hesap([parca(1, "A", isaretli()), parca(2, "B", kalem({ cap: 40 }))], { sec: { tedarikciOdakli: true } });
    const h = siparisRaporuHtml(r, { bugun: "2026-11-12" });
    expect(h).toMatch(/Ø35 · 400 mm çubuk<\/td><td[^>]*>8 boy</);
    const kilo = r.kesitler.find(k => !k.boydanSiparis);
    expect(h).toContain(`Ø40</td><td style="text-align:right;padding:3px 8px 3px 0;font-size:10.5px;border-bottom:1px solid #f1f5f9;">${S.kgMetni(kilo.siparisKg)}`);
  });
});

describe("Spec 0143 triyaj", () => {
  // Bulgu 1: yuvarlama oranda değil uzunlukta (parça başına 0,005 mm giriş toleransı); uzun çubukta eksik sipariş çıkmaz.
  it("bulgu 1: 70 × 85,74 = 6001,8 mm ÷ 6000 → 2 boy; 70 × 171,47 = 12.002,9 mm ÷ 12.000 → 2 boy; 1000,3 ÷ 1000 yine 1 boy", () => {
    const tek = (boy, cubukBoyu) => hesap([parca(1, "P", isaretli({ boy, cubukBoyu }))]).kesitler[0].boyAdedi;
    expect(tek(85.74, 6000)).toBe(2);
    expect(tek(171.47, 12000)).toBe(2);
    expect(tek(14.29, 1000)).toBe(1); // spec'in türetilmiş boy örneği (70 × 0,005 = 0,35 mm tolerans)
    expect(tek(14.2857, 1000)).toBe(1);
    expect(tek(0.001, 1000)).toBe(1); // tolerans hiçbir zaman sıfır boy vermez
    expect(S.UZUNLUK_TOLERANSI_MM).toBe(0.005);
  });
  // Bulgu 2: elle boy adedinin kilosu asgari siparişin altındaysa elle kilo dalıyla aynı uyarı.
  it("bulgu 2: elle girilen boy adedinin kilosu asgarinin altındaysa uyarı yazar", () => {
    const parts = [parca(1, "D", isaretli())];
    const m = { ...KART, asgariSiparis: 100 };
    const an = hesap(parts, { malzemeler: [m] }).kesitler[0].anahtar;
    const k = hesap(parts, { malzemeler: [m], sec: { duzenleme: { parca: {}, kesit: { [an]: { deger: "2" } } } } }).kesitler[0];
    expect(k.boyAdedi).toBe(2); expect(k.siparisKg).toBeLessThan(100);
    expect(k.asgariUyari).toBe(S.asgariAltiMetni(100));
    const cok = hesap(parts, { malzemeler: [m], sec: { duzenleme: { parca: {}, kesit: { [an]: { deger: "40" } } } } }).kesitler[0];
    expect(cok.siparisKg).toBeGreaterThan(100); expect(cok.asgariUyari).toBeNull();
  });
});

describe("Spec 0143 A: fiyat kümesi", () => {
  it("AC-52 / AC-53: küme boy fiyatını taşımaz; yalnız boy fiyatı girili kartta geçmiş kaydı doğmaz; özet metninde boy yok", () => {
    expect(M.FIYAT_ALANLARI).not.toContain("boyFiyati");
    expect(M.fiyatKumesi({ boyFiyati: 900, kiloFiyati: 10 })).not.toHaveProperty("boyFiyati");
    const yalniz = { id: 9, ad: "B", boyFiyati: 900 };
    expect(M.fiyatGecmisiYaz(yalniz, { ...yalniz, boyFiyati: 1200 }, { tarih: "2026-11-12", bugun: "2026-11-12" }).gecmis).toEqual([]);
    expect(M.fiyatGecmisiYaz(yalniz, { ...yalniz, kiloFiyati: 50 }, { tarih: "2026-11-12", bugun: "2026-11-12" }).gecmis).toEqual([]); // eski küme boş sayılır
    expect(M.kumeOzeti({ kiloFiyati: 10, boyFiyati: 900, paraBirimi: "TRY" })).not.toMatch(/boy/);
    expect(fs.readFileSync("src/components/MalzemeFiyatPenceresi.jsx", "utf8")).toMatch(/const FIYAT_ANAHTARLARI = \["kiloFiyati", "paraBirimi", "kur", "bantlar"\];/);
  });
  it("AC-6 / AC-48 (motor): malzemeOzeti dönüşünde yontem ve oran yok", () => {
    for (const k of [kalem(), isaretli(), { ...kalem(), yontem: "boy" }]) { expect(oz(k)).not.toHaveProperty("yontem"); expect(oz(k)).not.toHaveProperty("oran"); }
  });
});

const yorumsuz = (k) => k.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
const tum = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? (e.name === "map" ? [] : tum(path.join(d, e.name))) : /\.(js|jsx|mjs|cjs)$/.test(e.name) ? [path.join(d, e.name)] : []));
const kaynak = () => [...tum("src"), ...tum("electron")];
describe("Spec 0143 taramalar", () => {
  it("AC-5: boyFiyati, geldigiBoy ve (malzeme) YONTEMLER kimlikleri kaynakta yalnız göç modülünde, ölü sütun tanımında ve iki ayıklamada", () => {
    const bulunan = {};
    for (const f of kaynak()) { const n = (yorumsuz(fs.readFileSync(f, "utf8")).match(/\bboyFiyati\b|\bgeldigiBoy\b/g) || []).length; if (n) bulunan[f] = n; }
    expect(bulunan).toEqual({
      "electron/boyGocuSaf.mjs": 3, // harita kurucusu (yedek ve JSON gövdesi)
      "electron/db.cjs": 9, // şema (ölü sütun), okuma ayıklaması, göçün haritası (SQL ve JSON gövdesi)
      "src/components/MalzemeFiyatPenceresi.jsx": 2, // eski kartın ölü alanları kayda taşınmaz
    });
    expect(yorumsuz(fs.readFileSync("src/lib/malzeme.js", "utf8"))).not.toMatch(/\bYONTEMLER\b/);
    // StopajDonemleri.jsx'in YONTEMLER'i ödeme yöntemleridir (ayrı kavram); başka dosyada bu ad yok.
    const yontemler = kaynak().filter(f => /\bYONTEMLER\b/.test(yorumsuz(fs.readFileSync(f, "utf8"))));
    expect(yontemler).toEqual(["src/components/gider/StopajDonemleri.jsx"]);
  });
  it("AC-48: 'Maliyet yöntemi' erişilebilir adı kaynakta yok", () => {
    for (const f of tum("src")) expect(yorumsuz(fs.readFileSync(f, "utf8")), f).not.toMatch(/Maliyet yöntemi/);
  });
  it("AC-49: kalkan neden metinleri kaynakta yok", () => {
    const k = tum("src").map(f => fs.readFileSync(f, "utf8")).join("\n");
    expect(k).not.toMatch(/geldiği boy girilmedi/i); expect(k).not.toMatch(/Lama ve sacda boy adedi hesaplanmaz/);
    expect(k).not.toMatch(/NEDEN_BOY_YOK|NEDEN_IKI_BOYUT|NEDEN_BOY_YONTEMI|FIRE_BOY_YONTEMI_UYARISI|FIRE_KG_BOY_NEDENI|EKSIK_BOY_FIYATI/);
  });
  it("AC-60: ters çevrilen kriterlerin testleri 'spec 0143 ile' notu taşır", () => {
    const dosyalar = ["tests/malzeme-0132.test.js", "tests/maliyet-kalemleri-0135.test.js", "tests/fire-kg-0139.test.js", "tests/isleme-payi-0141.test.js",
      "tests/siparis-0134.test.js", "tests/siparis-0140.test.js", "tests/dis-islem-kalkar-0138-kiyas.test.js", "tests/ornek-katalog.test.js",
      "tests/isleme-payi-0141-kiyas.test.js", "tests/fire-kg-0139-kiyas.test.js", "tests/ui/fire-kg-0139.test.jsx", "tests/ui/malzeme-0132.test.jsx",
      "tests/ui/siparis-0134.test.jsx", "tests/siparis-0142.test.js", "tests/siparis-raporu-0142.test.js", "scripts/tests/db-roundtrip.cjs"];
    for (const f of dosyalar) expect(fs.readFileSync(f, "utf8"), f).toMatch(/spec 0143 ile/i);
  });
});
