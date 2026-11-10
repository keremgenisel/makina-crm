// Spec 0141 D-R3–D-R4, A-R1/2, A-R1/3, A-R2/2 (karar 31, 33, 37): işleme payının TEK katlama kuralı ve göç planı (saf çekirdek,
// `electron/islemePayiGocuSaf.mjs`). Gerçek veritabanı yazımı, yedek ve ikinci açılış Electron betiğinde
// (`scripts/tests/isleme-payi-gocu.cjs`, `tests/db-electron.test.js`).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { islemePayiKatla, islemePayiParcaKatla, islemePayiGocPlani, PAY_ESLEME } from "../electron/islemePayiGocuSaf.mjs";
import { malzemeOzeti, malzemeKatalogu } from "../src/lib/malzeme";
import { parcaMaliyetKurus, setKatalogu } from "../src/lib/urunAgaci";

const P304 = { id: 501, ad: "304", ozgulAgirlik: 7.9, kiloFiyati: 2.95, paraBirimi: "USD", kur: 50, fire: 8 };
const MK = malzemeKatalogu([P304]);
const kalem = (o) => ({ tur: "malzeme", malzemeId: 501, yontem: "kilo", adet: 1, ...o });

describe("Spec 0141: katlama kuralı", () => {
  it("AC-33 / AC-53: pay ölçüye eklenir, pay anahtarı silinir; iki alan (kalem listesi ve eski malzemeSatiri) birlikte", () => {
    const p = { id: 1, maliyetKalemleri: [kalem({ bicim: "mil", cap: 96, payCap: 4, boy: 100, payBoy: 2 }), { tur: "islem", ad: "Torna", tutar: 5 }],
      malzemeSatiri: { malzemeId: 501, bicim: "lama", kalinlik: 10, payKalinlik: 1, genislik: 20, payGenislik: 2, boy: 125, payBoy: 3 } };
    const k = islemePayiParcaKatla(p);
    expect(k.maliyetKalemleri[0]).toEqual(kalem({ bicim: "mil", cap: 100, boy: 102 }));
    expect(k.maliyetKalemleri[1]).toBe(p.maliyetKalemleri[1]);
    expect(k.malzemeSatiri).toEqual({ malzemeId: 501, bicim: "lama", kalinlik: 11, genislik: 22, boy: 128 });
    expect(islemePayiKatla({ bicim: "sac", kalinlik: 2, payKalinlik: 1, en: 100, payEn: 5, boy: 250 })).toEqual({ bicim: "sac", kalinlik: 3, en: 105, boy: 250 });
    // Boruda et kalınlığının payı hiç yoktu; boş ve sıfır pay ölçüyü değiştirmez ama anahtar silinir.
    expect(islemePayiKatla({ bicim: "boru", cap: 19, et: 1.5, boy: 173, payCap: 0, payBoy: "" })).toEqual({ bicim: "boru", cap: 19, et: 1.5, boy: 173 });
  });
  // Triyaj (bulgu 2): yuvarlama yalnız kayan nokta artığını siler; hane sayısı ölçü ile payın büyüğü (sabit üç ondalık değil).
  it("AC-44 / A-R2/2: kayan nokta artığı silinir (10,1 + 0,2 = 10,3); hassas ölçü kesilmez (99,9996 + 4 = 103,9996); form metni de çözülür", () => {
    expect(islemePayiKatla({ cap: 99.9996, payCap: 4 }).cap).toBe(103.9996);
    expect(islemePayiKatla({ cap: 139.99951, payCap: 4, boy: 5999.9995, payBoy: 5 })).toEqual({ cap: 143.99951, boy: 6004.9995 });
    expect(islemePayiKatla({ cap: 0.1, payCap: 0.2 }).cap).toBe(0.3);
    expect(islemePayiKatla({ cap: 10.1, payCap: 0.2 }).cap).toBe(10.3);
    expect(10.1 + 0.2).not.toBe(10.3);
    expect(islemePayiKatla({ cap: "10,1", payCap: "0,2" }).cap).toBe(10.3);
    expect(islemePayiKatla({ cap: "10.1", payCap: "0.2" }).cap).toBe(10.3);
  });
  it("AC-36 / değişmezlik: pay taşımayan nesne aynı nesne döner; iki kez katlamak bir kez katlamakla aynı", () => {
    const s = { cap: 100, boy: 50 };
    expect(islemePayiKatla(s)).toBe(s);
    const p = { id: 1, maliyetKalemleri: [kalem({ bicim: "mil", cap: 100, boy: 50 })] };
    expect(islemePayiParcaKatla(p)).toBe(p);
    const bir = islemePayiParcaKatla({ id: 2, maliyetKalemleri: [kalem({ bicim: "mil", cap: 96, payCap: 4, boy: 50 })] });
    expect(islemePayiParcaKatla(bir)).toBe(bir);
  });
  it("AC-34: katlamadan önce ve sonra maliyet kuruşuna kadar aynı (paylı satırın eski hesabı ham ölçüyü yuvarlamadan topluyordu)", () => {
    // Spec öncesi `hamOlculer` = ölçü + pay (yuvarlanmadan). Eski hesabın girdisi aynı toplamla verilir.
    const eski = (s) => ({ ...s, cap: s.cap + (s.payCap || 0), boy: s.boy + (s.payBoy || 0), payCap: undefined, payBoy: undefined });
    for (const s of [kalem({ bicim: "mil", cap: 140, payCap: 4, boy: 78, payBoy: 5 }), kalem({ bicim: "mil", cap: 50, payCap: 2, boy: 120, payBoy: 3 })]) {
      expect(malzemeOzeti(islemePayiKatla(s), MK).maliyetK).toBe(malzemeOzeti(eski(s), MK).maliyetK);
    }
  });
});

describe("Spec 0141: göç planı", () => {
  it("AC-33 / AC-37 / AC-53: plan yalnız değişecek parçaları ve değişen sütunları döndürür; çöptekiler de girer, JSON metin kabul edilir", () => {
    const satirlar = [
      { id: 1, maliyetKalemleri: JSON.stringify([kalem({ bicim: "mil", cap: 96, payCap: 4, boy: 100 })]), malzemeSatiri: null },
      { id: 2, maliyetKalemleri: null, malzemeSatiri: JSON.stringify({ malzemeId: 501, bicim: "mil", cap: 140, payCap: 4, boy: 78, payBoy: 5 }) },
      { id: 3, maliyetKalemleri: JSON.stringify([kalem({ bicim: "mil", cap: 100, boy: 100 })]), malzemeSatiri: null },
      { id: 4, maliyetKalemleri: null, malzemeSatiri: null },
      { id: 5, deletedAt: "2026-10-01", maliyetKalemleri: JSON.stringify([kalem({ bicim: "mil", cap: 10.1, payCap: 0.2, boy: 50 })]), malzemeSatiri: "bozuk{" },
    ];
    const plan = islemePayiGocPlani(satirlar);
    expect(plan.map(p => p.id)).toEqual([1, 2, 5]);
    expect(JSON.parse(plan[0].maliyetKalemleri)).toEqual([kalem({ bicim: "mil", cap: 100, boy: 100 })]);
    expect(plan[0].malzemeSatiri).toBeUndefined();
    expect(plan[1].maliyetKalemleri).toBeUndefined();
    expect(JSON.parse(plan[1].malzemeSatiri)).toEqual({ malzemeId: 501, bicim: "mil", cap: 144, boy: 83 });
    expect(JSON.parse(plan[2].maliyetKalemleri)[0].cap).toBe(10.3);
    expect(islemePayiGocPlani(plan.map(p => ({ id: p.id, maliyetKalemleri: p.maliyetKalemleri ?? null, malzemeSatiri: p.malzemeSatiri ?? null })))).toEqual([]); // AC-36
  });
  it("AC-34 / AC-53: göçten önceki (paylı, tek türetmeden okunan) ve sonraki parçanın maliyeti kuruşuna kadar aynı", () => {
    const once = { id: 1, ad: "A", malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 140, payCap: 4, boy: 78, payBoy: 5 } };
    const plan = islemePayiGocPlani([{ id: 1, maliyetKalemleri: null, malzemeSatiri: JSON.stringify(once.malzemeSatiri) }]);
    const sonra = { ...once, malzemeSatiri: JSON.parse(plan[0].malzemeSatiri) };
    expect(parcaMaliyetKurus(sonra, undefined, setKatalogu([sonra]), MK)).toBe(parcaMaliyetKurus(once, undefined, setKatalogu([once]), MK));
    expect(parcaMaliyetKurus(sonra, undefined, setKatalogu([sonra]), MK)).toBe(170112);
  });
  it("R7 / karar 37: 5.000 parçalı plan kaba süre eşiğinin altında", () => {
    const satirlar = Array.from({ length: 5000 }, (_, i) => ({ id: i, maliyetKalemleri: JSON.stringify([kalem({ bicim: "mil", cap: 50, boy: 100, ...(i % 2 ? { payCap: 1 } : {}) })]), malzemeSatiri: null }));
    const t = performance.now();
    expect(islemePayiGocPlani(satirlar)).toHaveLength(2500);
    expect(performance.now() - t).toBeLessThan(2000);
  });
});

describe("Spec 0141: tek fonksiyon (AC-45, C5)", () => {
  const kod = (f) => fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
  it("AC-45: göç, tek türetme, form ve dokunulmamış kayıt aynı çekirdeği çağırır; çekirdek hiçbir şey içe almaz", () => {
    expect(kod("electron/islemePayiGocuSaf.mjs")).not.toMatch(/^import /m);
    expect(kod("electron/db.cjs")).toMatch(/require\("\.\/islemePayiGocuSaf\.mjs"\)/);
    expect(kod("src/lib/maliyetKalemleri.js")).toMatch(/islemePayiKatla\(/);
    expect(kod("src/lib/malzeme.js")).toMatch(/const s = islemePayiKatla\(s0\)/);
    expect(kod("src/components/PartManager.jsx")).toMatch(/islemePayiParcaKatla\(eski\)/);
    // C5: eşleme çekirdeğin kendi sabitidir; src'de pay anahtarı adı yok (AC-12).
    expect(PAY_ESLEME).toEqual({ cap: "payCap", kalinlik: "payKalinlik", genislik: "payGenislik", en: "payEn", boy: "payBoy" });
  });
});
