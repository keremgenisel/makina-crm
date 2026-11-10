// Spec 0141: işleme payı ve emniyet payı kalkar (motor, doğrulama, kalanlar, tek türetme, taramalar). Ekran kriterleri
// tests/ui/isleme-payi-0141.test.jsx'te, göçün saf çekirdeği tests/isleme-payi-gocu-0141.test.js'te, kıyas
// tests/isleme-payi-0141-kiyas.test.js'te, veritabanı scripts/tests/db-roundtrip.cjs, db-clean-install.cjs ve isleme-payi-gocu.cjs'te.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as M from "../src/lib/malzeme";
import * as S from "../src/lib/siparisIhtiyaci";
import { parcaMaliyetKurus, setKatalogu, kalemlerDogrula, kalemFormu } from "../src/lib/urunAgaci";
import { maliyetKalemleriOf } from "../src/lib/maliyetKalemleri";
import { parcaSatisFiyati, fiyatBaglamiKur } from "../src/lib/parcaFiyati";
import { parcaDisaAktarmaSatiri } from "../src/lib/parcaAktarma";
import { islemePayiParcaKatla } from "../electron/islemePayiGocuSaf.mjs";
import * as F from "./fixtures/0134-veri";

const TABLO = [{ alt: 0, kg: 0 }, { alt: 21, kg: 0.05 }, { alt: 36, kg: 0.3 }, { alt: 91, kg: 0.35 }, { alt: 101, kg: 1 }, { alt: 141, kg: 1.75 }];
const oz = (satir, m) => M.malzemeOzeti({ malzemeId: m.id, yontem: "kilo", ...satir }, M.malzemeKatalogu([m]));
const sip = (o) => S.siparisIhtiyaci(F.veri(o));
const satir = (r, ad) => r.parcalar.find(p => p.ad === ad);

describe("Spec 0141 A: işleme payı", () => {
  // Plan §6: spec'in "%0,001 içinde" iddiası ölçülen değerle tutmuyor (6,695928 ile 6,696 farkı %0,00108); Excel'in 6,696'sı üç
  // ondalığa yuvarlanmış gösterimdir. Ölçüm: beş ondalıkta 6,69593 ve üç ondalıkta Excel'in değeri.
  it("AC-5: Ø100 × 108 paslanmaz, ρ 7,894 → 6,69593 kg (üç ondalıkta Excel'in 6,696'sı)", () => {
    const r = oz({ bicim: "mil", cap: 100, boy: 108 }, { id: 1, ad: "P", ozgulAgirlik: 7.894, kiloFiyati: 1 });
    expect(r.hamKg).toBeCloseTo(6.69593, 5);
    expect(M.ucOndalik(r.hamKg)).toBe(6.696);
  });
  it("AC-8 / AC-29: fire kilogram bandı girilen çaptan seçilir; altı bantlı tabloda çap 100 → 0,35 kg", () => {
    const r = oz({ bicim: "mil", cap: 100, boy: 108 }, { id: 1, ad: "P", ozgulAgirlik: 7.894, kiloFiyati: 1, fireBantlari: TABLO });
    expect(r.ekFireKg).toBe(0.35);
    expect(r.fireliKg).toBeCloseTo(r.hamKg + 0.35, 9);
  });
  it("AC-9 / A-R4: boruda et kalınlığı çapın yarısına eşit ya da büyükse reddedilir, hata et alanında", () => {
    expect(M.malzemeSatiriDogrula({ malzemeId: 1, bicim: "boru", cap: "20", et: "10", boy: "100" }).hatalar.et).toBe(M.ET_HATASI);
    expect(M.malzemeSatiriDogrula({ malzemeId: 1, bicim: "boru", cap: "20", et: "9", boy: "100" }).gecerli).toBe(true);
  });
  it("AC-10 / A-R5: kaydedilen kalemde beş pay anahtarı yok; forma verilmiş pay yok sayılır (doğrulama ve hata metni kalktı)", () => {
    const ad = ["payCap", "payKalinlik", "payGenislik", "payEn", "payBoy"];
    const v = M.malzemeSatiriDogrula({ malzemeId: 1, bicim: "lama", kalinlik: "10", genislik: "20", boy: "125", payKalinlik: "-1", payGenislik: "x", payBoy: "3" });
    expect(v.gecerli).toBe(true);
    for (const a of ad) expect(v.kayit).not.toHaveProperty(a);
    const k = kalemlerDogrula([{ tur: "malzeme", malzemeId: "1", bicim: "mil", cap: "50", boy: "100", payCap: "4", adet: "1" }]).kayit[0];
    for (const a of ad) expect(k).not.toHaveProperty(a);
    expect(M.PAY_HATASI).toBeUndefined();
    expect(M.PAY_ALANI).toBeUndefined();
  });
  it("AC-11 / AC-42 (saf): eski pay taşıyan kalem forma açılışta katlanır; formda pay alanı yok, ölçü payı kadar büyük", () => {
    const f = kalemFormu({ tur: "malzeme", malzemeId: 501, bicim: "mil", cap: 140, payCap: 4, boy: 78, payBoy: 5, adet: 1 });
    expect(f.cap).toBe("144"); expect(f.boy).toBe("83");
    for (const a of ["payCap", "payBoy"]) expect(f).not.toHaveProperty(a);
    expect(kalemlerDogrula([f]).kayit[0]).toEqual({ tur: "malzeme", malzemeId: 501, bicim: "mil", cap: 144, boy: 83, adet: 1 });
  });
  it("AC-47 / A-R6: sipariş penceresinin Net kg'si kalemin ham ağırlığı × adettir (ham ağırlık = girilen ölçünün ağırlığı); adlar aynı", () => {
    const r = sip();
    const k = r.kesitler[0];
    expect(k.netKg).toBeCloseTo(k.parcalar.reduce((a, p) => a + p.hamKg * p.adet, 0), 9);
    expect(k.parcalar[0].hamKg).toBe(oz({ bicim: "mil", cap: 144, boy: 83 }, F.P304).hamKg);
    for (const ad of ["hamOlculer", "hamKesit", "tamBoyKg"]) expect(typeof M[ad]).toBe("function");
  });
});

describe("Spec 0141 B: emniyet payı", () => {
  it("AC-17: kit adedi 1, stok 0, 10 makina → ihtiyaç 10 (eskiden %10 paylı malzemeyle 11)", () => {
    const r = sip({ modeller: [F.model("M1", [[41, 1]])], satirlar: [{ model: "M1", adet: "10" }], malzemeler: [{ ...F.P304, emniyetPayi: 10 }] });
    expect(satir(r, "Kesme mili")).toMatchObject({ ham: 10, ihtiyac: 10, siparis: 10 });
  });
  it("AC-18 / AC-25: setten patlatılan bileşen paysız yukarı yuvarlanır; bileşen miktarı 1,5 olan setten 3 adet → ham 4,5, ihtiyaç 5", () => {
    const set = { id: 50, ad: "Mil seti", models: [], setIcerigi: [{ partId: 42, miktar: 1.5 }] };
    const r = sip({ modeller: [F.model("M1", [[50, 1]])], satirlar: [{ model: "M1", adet: "3" }], parts: [{ ...F.PUL, emniyetPayi: 10 }, set] });
    expect(satir(r, "Pul")).toMatchObject({ ham: 4.5, ihtiyac: 5, siparis: 5 });
    expect(satir(r, "Pul")).not.toHaveProperty("pay");
  });
  it("AC-19 / B-R7: öneri adedinin iki yolu da paysız (satırın oneri alanı ve parçaları kapatılan kesitin öneri kaynağı)", () => {
    const v = F.veri({ modeller: [F.model("M1", [[41, 1]])], satirlar: [{ model: "M1", adet: "10" }], malzemeler: [{ ...F.P304, emniyetPayi: 10, tedarikciId: 12 }],
      parts: [{ ...F.KESME, emniyetPayi: 10 }] });
    const an = S.siparisIhtiyaci(v).kesitler[0].anahtar;
    const r = S.siparisIhtiyaci(v, { tedarikciOdakli: true, duzenleme: { parca: { 41: { kapali: true } }, kesit: { [an]: { deger: "50" } } } });
    expect(r.tedarikciBolumleri.parcaDurumu["41"].oneri).toBe(10);
    const k = r.kesitler.find(x => x.anahtar === an);
    expect(k.parcalarKapali).toBe(true);
    // Öneri kaynağının adedi yalnız parçaları kapatılan kesitin VARLIĞINI belirler (satır parçasız kurulur), adedi gözlenemez;
    // bu yüzden ikinci yolun paysızlığı kaynakta ölçülür: motorda yüzde çarpımı kalmadı.
    expect(fs.readFileSync("src/lib/siparisIhtiyaci.js", "utf8")).not.toMatch(/\(1 \+ [a-zA-Z.]*pay \/ 100\)/);
  });
  it("AC-22: emniyetPayi dolu eski parça ve malzeme pay uygulanmamış değeri verir", () => {
    const yalin = sip();
    const eski = sip({ parts: F.veri().parts.map(p => ({ ...p, emniyetPayi: 25 })), malzemeler: [{ ...F.P304, emniyetPayi: 40 }] });
    expect(eski.parcalar.map(p => p.ihtiyac)).toEqual(yalin.parcalar.map(p => p.ihtiyac));
  });
  it("AC-24 / B-R5: yalnız kitten beslenen parçada Ham ihtiyaç ile İhtiyaç aynı (3,571 × 70 → 250 ve 250)", () => {
    const r = sip({ modeller: [F.model("M1", [[42, 3.571]])], satirlar: [{ model: "M1", adet: "70" }] });
    expect(satir(r, "Pul")).toMatchObject({ ham: 250, ihtiyac: 250 });
  });
  it("AC-52 / C8: parça satırında pay alanı yok; tedarikçi bölümünün hazır satırı önce de sonra da pay taşımaz", () => {
    const r = S.siparisIhtiyaci(F.veri({ parts: [F.KESME, { ...F.PUL, tedarikciId: 13 }, F.SOMUN, F.SET] }), { tedarikciOdakli: true });
    for (const p of r.parcalar) expect(p).not.toHaveProperty("pay");
    for (const b of r.tedarikciBolumleri.bolumler) for (const x of b.hazirParcalar) expect(x).not.toHaveProperty("pay");
    expect(S.HAM_IHTIYAC_IBARESI).toBe("Ham ihtiyaç ile İhtiyaç yalnız setten patlatılan parçalarda ayrışır; başka hiçbir pay uygulanmaz.");
  });
  it("AC-20: malzeme kartının doğrulaması emniyet payını kayda yazmaz", () => {
    const v = M.malzemeDogrula({ ...M.malzemeFormu({ ad: "X", ozgulAgirlik: 7.9 }), emniyetPayi: "12" }, []);
    expect(v.gecerli).toBe(true);
    expect(v.kayit).not.toHaveProperty("emniyetPayi");
    expect(M.malzemeFormu({ ad: "X", emniyetPayi: 5 })).not.toHaveProperty("emniyetPayi");
  });
});

describe("Spec 0141 C: kalanlar", () => {
  const PLASTIK = { id: 7, ad: "Teflon", ozgulAgirlik: 2.2, kiloFiyati: 550, fire: 10 };
  it("AC-28: varsayılan fire %10 → plastik kalemin fireli ağırlığı ham ağırlığın 1,1 katı", () => {
    const r = oz({ bicim: "sac", kalinlik: 30, en: 60, boy: 130 }, PLASTIK);
    expect(r.fireliKg).toBeCloseTo(r.hamKg * 1.1, 9);
  });
  it("AC-30: kalemin fire alanı malzemedeki varsayılanı ezer", () => {
    const r = oz({ bicim: "sac", kalinlik: 30, en: 60, boy: 130, fire: 5 }, PLASTIK);
    expect(r.fire).toBe(5); expect(r.fireliKg).toBeCloseTo(r.hamKg * 1.05, 9);
  });
  it("AC-31: asgari sipariş durur; kilo asgarinin altındaysa asgariye yükselir, fark yazılır", () => {
    const sac = { tur: "malzeme", malzemeId: 7, bicim: "sac", yontem: "kilo", kalinlik: 2, en: 100, boy: 250, adet: 1 };
    const r = sip({ modeller: [F.model("M1", [[60, 1]])], satirlar: [{ model: "M1", adet: "1" }], parts: [{ id: 60, ad: "Plaka", models: [], maliyetKalemleri: [sac] }], malzemeler: [{ ...PLASTIK, asgariSiparis: 20 }] });
    expect(r.kesitler[0].siparisKg).toBe(20);
    expect(r.kesitler[0].asgariFark).toBeGreaterThan(0);
  });
  it("AC-32: boy yöntemli kalemin oranı ve boy fiyatı davranışı değişmez (180 / 6000 × 600 TL)", () => {
    const r = oz({ bicim: "boru", cap: 19, et: 1.5, boy: 180, yontem: "boy" }, { id: 4, ad: "Boru", boyFiyati: 600, geldigiBoy: 6 });
    expect(r.maliyetK).toBe(1800);
    expect(r.hamKg).toBeNull();
  });
});

describe("Spec 0141 A-R1/3: tek türetme katlar (karar 31)", () => {
  const PAYLI = { id: 41, ad: "Kesme mili", models: [], fiyatKipi: "maliyet", malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 140, boy: 78, payCap: 4, payBoy: 5 } };
  const KATLI = islemePayiParcaKatla(PAYLI);
  it("AC-64: göçten geçmemiş paylı parçanın maliyeti, sipariş ihtiyacı, satış fiyatı ve Excel satırı katlanmış hâliyle aynı", () => {
    const mk = M.malzemeKatalogu([F.P304]);
    expect(maliyetKalemleriOf(PAYLI)[0]).toEqual(maliyetKalemleriOf(KATLI)[0]);
    expect(parcaMaliyetKurus(PAYLI, undefined, setKatalogu([PAYLI]), mk)).toBe(parcaMaliyetKurus(KATLI, undefined, setKatalogu([KATLI]), mk));
    const s = (p) => sip({ parts: [p, F.PUL, F.SOMUN, F.SET] }).kesitler;
    expect(s(PAYLI)).toEqual(s(KATLI));
    const baglam = (p) => fiyatBaglamiKur({ parts: [p], malzemeler: [F.P304], fiyatAyarlari: { varsayilanKat: 2 } });
    expect(parcaSatisFiyati(PAYLI, "TRY", baglam(PAYLI))).toEqual(parcaSatisFiyati(KATLI, "TRY", baglam(KATLI)));
    expect(parcaDisaAktarmaSatiri(PAYLI, setKatalogu([PAYLI]), mk)).toEqual(parcaDisaAktarmaSatiri(KATLI, setKatalogu([KATLI]), mk));
  });
  it("AC-64 (kalem listesi kolu): kalem listesinde pay taşıyan parça da katlanır; maliyet ve sipariş kesiti katlanmış hâliyle aynı", () => {
    const mk = M.malzemeKatalogu([F.P304]);
    const paylı = { id: 45, ad: "Kalemli", models: [], maliyetKalemleri: [{ tur: "malzeme", malzemeId: 501, bicim: "mil", yontem: "kilo", cap: 140, payCap: 4, boy: 78, payBoy: 5, adet: 1 }, { tur: "islem", ad: "Torna", tutar: 40 }] };
    const katli = islemePayiParcaKatla(paylı);
    expect(maliyetKalemleriOf(paylı)).toEqual(katli.maliyetKalemleri);
    expect(parcaMaliyetKurus(paylı, undefined, setKatalogu([paylı]), mk)).toBe(parcaMaliyetKurus(katli, undefined, setKatalogu([katli]), mk));
    const kesit = (p) => sip({ modeller: [F.model("M1", [[45, 1]])], satirlar: [{ model: "M1", adet: "10" }], parts: [p] }).kesitler;
    expect(kesit(paylı)).toEqual(kesit(katli));
    expect(kesit(paylı)[0].kesit).toEqual([144]);
  });
  it("AC-65 / karar 32: katlama beş kıyas fikstürünün spec öncesi bütün paylı malzeme kalemlerinde ve rastgele ondalık paylarda maliyeti kuruşuna korur", () => {
    const mk = M.malzemeKatalogu([F.P304]);
    const eskiHesap = (s) => M.malzemeOzeti({ ...s, cap: s.cap + (s.payCap || 0), boy: s.boy + (s.payBoy || 0) }, mk).maliyetK; // spec öncesi ham ölçü
    const fikstur = [ // 0133, 0134, 0135, 0137, 0139 fikstürlerinin spec öncesi paylı kalemleri
      { cap: 140, boy: 78, payCap: 4, payBoy: 5, fire: 8 }, { cap: 140, boy: 78, payCap: 4, payBoy: 5 }, { cap: 50, boy: 120, payCap: 2, payBoy: 3 },
      { cap: 60, boy: 175, payCap: 2, payBoy: 3 }, { cap: 140, boy: 78, payCap: 4, fire: 2 },
      // Triyaj (bulgu 2): üç ondalıktan hassas girilmiş ölçüler; sabit üç ondalık yuvarlama burada +8 ve +82 kuruş fark veriyordu.
      { cap: 99.9996, boy: 1000.0004, payCap: 4, payBoy: 5 }, { cap: 139.99951, boy: 5999.9995, payCap: 4, payBoy: 5 },
    ];
    let n = 0, seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // Bir ve dört/beş ondalıklı rastgele ölçüler (triyaj bulgu 2: dört ondalıklı ölçü de kapsamda).
    const rastgele = Array.from({ length: 500 }, (_, i) => {
      const b = i % 2 ? 10000 : 10;
      return { cap: Math.round(rnd() * 200 * b) / b + 1, boy: Math.round(rnd() * 500 * b) / b + 1, payCap: Math.round(rnd() * 50) / 10, payBoy: Math.round(rnd() * 5 * b) / b };
    });
    for (const o of [...fikstur, ...rastgele]) {
      const s = { malzemeId: 501, bicim: "mil", yontem: "kilo", ...o };
      const yeni = parcaMaliyetKurus({ id: 1, malzemeSatiri: s }, undefined, new Map(), mk);
      expect(yeni, JSON.stringify(o)).toBe(eskiHesap(s)); n++;
    }
    expect(n).toBe(507);
  });
});

// ── Taramalar ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const kod = (f) => fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
const tara = (d) => fs.readdirSync(d).flatMap(e => { const p = `${d}/${e}`; return fs.statSync(p).isDirectory() ? (p === "src/lib/map" ? [] : tara(p)) : /\.(jsx?|cjs|mjs)$/.test(e) ? [p] : []; });
const say = (desen, kokler) => Object.fromEntries(kokler.flatMap(tara).map(f => [f, kod(f).split("\n").filter(l => desen.test(l)).length]).filter(([, n]) => n > 0));

describe("Spec 0141: kaynak taramaları", () => {
  it("AC-12: pay kimlikleri ve 'işleme payı' etiketi kaynakta yok; istisnalar tam yollu ve sayılı", () => {
    // İstisnalar: göçün saf çekirdeğinin tek eşleme satırı (C5) ve FIRE_BOY_UYARISI'nın "talaş işleme payında" ifadesi (C7).
    expect(say(/PAY_ALANI|payCap|payBoy|payKalinlik|payGenislik|payEn\b/, ["src", "electron", "scripts/evidence"])).toEqual({ "electron/islemePayiGocuSaf.mjs": 1 });
    expect(say(/işleme payı/i, ["src", "electron", "scripts/evidence"])).toEqual({ "src/lib/siparisIhtiyaci.js": 1 });
    expect(kod("src/lib/siparisIhtiyaci.js")).toMatch(/talaş işleme payında/);
  });
  // db.cjs'in beş satırı: iki CREATE TABLE (şema dokunulmaz, D-R1), ölü sütun sabiti (ensureColumns kaydı kalır, D-R1/3) ve iki okuma
  // ayıklaması (parts ve malzemeler, AC-58).
  it("AC-26: emniyet payı kimlikleri kaynakta yok; tek istisna db.cjs'in şeması, ölü sütun sabiti ve okuma ayıklaması (C13: ustHata yerinde)", () => {
    expect(say(/emniyetPayi|emniyetPayiOf|EMNIYET_PAYI_ETIKETI|EMNIYET_PAYI_IPUCU|EMNIYET_PAYI_HATASI|emniyetPayiDogrula/, ["src", "electron", "scripts/evidence"]))
      .toEqual({ "electron/db.cjs": 5 });
    expect(kod("src/lib/malzeme.js")).toMatch(/ustHata/);
  });
  it("AC-49 / AC-50: PartManager'da pay hata anahtarı, MaliyetKalemleriAlani'da emniyet fieldset'i, MalzemeSatiriAlani'da PAY_ALANI yok", () => {
    expect(kod("src/components/PartManager.jsx")).not.toMatch(/\bpay:|hatalar\.pay\b|payHata/);
    const mk = kod("src/components/MaliyetKalemleriAlani.jsx");
    expect(mk).not.toMatch(/PayAlani|setEmniyetPayi/);
    expect((mk.match(/<fieldset/g) || []).length).toBe(1); // yalnız kalem listesinin kabı
    expect(kod("src/components/MalzemeSatiriAlani.jsx")).not.toMatch(/PAY_ALANI|Pay dahil/);
  });
  it("AC-59 / C10 (karar 34): emniyet payı test dosyası silindi; ters çevrilen testler 'spec 0141 ile' notu taşır", () => {
    expect(fs.existsSync("tests/ui/emniyet-payi-0134.test.jsx")).toBe(false);
    const notlu = ["tests/malzeme-0132.test.js", "tests/siparis-0134.test.js", "tests/maliyet-kalemleri-0135.test.js", "tests/fire-kg-0139.test.js",
      "tests/ui/maliyet-kalemleri-0135.test.jsx", "tests/ui/maliyet-kalemleri-0135-app.test.jsx", "tests/ui/malzeme-0132-parca.test.jsx",
      "tests/ui/siparis-0134.test.jsx", "tests/ui/siparis-0134-app.test.jsx", "tests/ui/siparis-0140.test.jsx",
      "tests/maliyet-kalemleri-0135-kiyas.test.js", "tests/fire-kg-0139-kiyas.test.js", "tests/siparis-0140-kiyas.test.js", "tests/dis-islem-kalkar-0138-kiyas.test.js",
      "scripts/tests/db-roundtrip.cjs", "scripts/tests/db-clean-install.cjs", "scripts/tests/dis-islem-gocu.cjs"];
    for (const f of notlu) expect(fs.readFileSync(f, "utf8"), f).toMatch(/spec 0141 ile/i);
  });
  it("AC-60 / C12: kanıt aracının fikstürü katlandı (Ø144 × 83, pay yok)", () => {
    const k = fs.readFileSync(path.join("scripts", "evidence", "0009-sayfa.jsx"), "utf8");
    expect(k).toMatch(/malzemeSatiri: \{ malzemeId: 501, bicim: "mil", cap: 144, boy: 83 \}/);
  });
});

// Triyaj (bulgu 1), AC-61 / C11: kanıt raporları var. Spec done'a taşındığı için eşlemede `degisti` kaydı kalmaz (AC-11c); değişim
// raporun kendisinden okunur: ekranın 0141 farkı, aynı kodun tekrar çekimindeki farkı (taban raporu) gürültü payından fazla aşıyorsa
// değişmiştir. Kanıt aracı bazı pencerelerde aynı kodda da 96–480 piksel oynuyor; değişmeyen ekranların farkı bu oynamayı aşmaz.
// 0 fark veren değişmeyen ekranlar taban raporuna "ayni" ile bağlıdır.
describe("Spec 0141 AC-61: kanıt eşlemesi", () => {
  const oku = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
  const P = "docs/evidence/0141-piksel-raporu.json", T = "docs/evidence/0141-taban-piksel-raporu.json";
  const rP = Object.fromEntries(oku(P).map(r => [r.ad, r])), rT = Object.fromEntries(oku(T).map(r => [r.ad, r]));
  const ekranlar = [...new Set(Object.keys(rP).map(a => a.replace(/-(aydinlik|karanlik)\.png$/, "")))];
  const degisti = (e) => ["aydinlik", "karanlik"].some(t => (rP[`${e}-${t}.png`]?.piksel ?? 0) > (rT[`${e}-${t}.png`]?.piksel ?? 0) + 300);
  it("AC-61: değişen ekranlar raporda (parça kartı iki kip, malzeme kartı iki kip, sipariş tablosu); spec done olduğu için degisti kaydı yok", () => {
    for (const e of ["katalog-parca-0135-elle", "katalog-parca-0135-hesapla-bos", "katalog-malzeme-yeni", "katalog-malzeme-duzenle", "siparis-0140-parca-ihtiyaci"]) expect(degisti(e), e).toBe(true);
    expect(ekranlar.filter(degisti).length).toBe(45);
    const { dosyalar } = oku("docs/evidence/kanit-eslemesi.json");
    expect(Object.values(dosyalar).flat().filter(k => k.rapor === P)).toEqual([]);
  });
  it("AC-61: değişmeyen ekranların farkı aynı kodun kendi tekrar çekimindeki farkı aşmaz; 0 farklı olanlar ayni kaydıyla", () => {
    const degismeyen = ekranlar.filter(e => !degisti(e));
    expect(degismeyen.length).toBeGreaterThan(0);
    for (const e of degismeyen) for (const t of ["aydinlik", "karanlik"]) {
      const a = `${e}-${t}.png`;
      expect(rP[a]?.piksel ?? 0, a).toBeLessThanOrEqual(rT[a]?.piksel ?? 0);
    }
    const { dosyalar } = oku("docs/evidence/kanit-eslemesi.json");
    const tabanKayitlari = Object.values(dosyalar).flat().filter(k => k.rapor === T);
    expect(tabanKayitlari.length).toBeGreaterThan(0);
    for (const k of tabanKayitlari) expect(k.beklenen, k.ekran).toBe("ayni");
  });
});
