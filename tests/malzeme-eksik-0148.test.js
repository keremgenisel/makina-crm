// Spec 0148: fiyatı hiç girilmemiş malzeme Malzemeler listesinde eksik sayılmaz. Kural tek yerde (`malzeme.js` `malzemeEksikleri`);
// parça maliyeti ve sipariş tarafı `kumeEksikleri`'ni okur ve değişmez (C1).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as M from "../src/lib/malzeme";
import { parcaMaliyetKurus, setKatalogu } from "../src/lib/urunAgaci";
import * as S from "../src/lib/siparisIhtiyaci";
import { SENARYOLAR } from "./fixtures/0144-veri.js";

import { FIYATSIZ, FIYATSIZ_OZGULSUZ, DOVIZ_FIYATSIZ, BANT_LAMASIZ, KURSUZ, GBP, TAM } from "./fixtures/0148-veri.js";

const kodSatirlari = (dosya) => fs.readFileSync(dosya, "utf8").split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).map(l => l.replace(/\s\/\/.*$/, "")).join("\n");
const dosyalar = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => (d.isDirectory() ? dosyalar(path.join(dir, d.name)) : /\.(js|jsx)$/.test(d.name) ? [path.join(dir, d.name)] : []));

describe("Spec 0148: listenin eksiklik kuralı (motor)", () => {
  it("AC-1 / AC-2 / AC-3: fiyatı hiç girilmemiş, özgül ağırlığı girilmiş malzemede neden yok ve sayıya girmez", () => {
    expect(M.malzemeEksikleri(FIYATSIZ)).toEqual([]);
    expect(M.malzemeEksikMi(FIYATSIZ)).toBe(false);
    expect(M.eksikMalzemeSayisi([FIYATSIZ, TAM])).toBe(0);
    expect(M.fiyatGirilmemisMi(M.fiyatKumesi(FIYATSIZ))).toBe(true);
  });
  it("AC-4: bütün eksiklikler bu türdense eksik sayısı sıfır", () => {
    expect(M.eksikMalzemeSayisi([FIYATSIZ, { ...FIYATSIZ, id: 9 }, DOVIZ_FIYATSIZ])).toBe(0);
  });
  it("AC-5: özgül ağırlığı ve fiyatı girilmemiş malzemede yalnız özgül ağırlık nedeni", () => {
    expect(M.malzemeEksikleri(FIYATSIZ_OZGULSUZ)).toEqual([M.EKSIK_OZGUL]);
    expect(M.eksikMalzemeSayisi([FIYATSIZ_OZGULSUZ])).toBe(1);
  });
  it("AC-6: bantlı ama lama ve sac için tek kilo fiyatı girilmemiş malzeme bugünkü nedeni korur", () => {
    expect(M.malzemeEksikleri(BANT_LAMASIZ)).toEqual([M.EKSIK_KILO_LAMA]);
    expect(M.fiyatGirilmemisMi(M.fiyatKumesi(BANT_LAMASIZ))).toBe(false);
  });
  it("AC-7: kilo fiyatı girilmiş dövizli kursuz malzeme bugünkü nedeni korur", () => {
    expect(M.malzemeEksikleri(KURSUZ)).toEqual([M.EKSIK_KUR]);
  });
  it("AC-8: dövizli ama ne kilo fiyatı ne bandı ne kuru girilmiş malzeme rozet almaz", () => {
    expect(M.malzemeEksikleri(DOVIZ_FIYATSIZ)).toEqual([]);
  });
  it("AC-9: para birimi tanınmayan malzeme (fiyatsız olsa da) bugünkü nedeni korur", () => {
    expect(M.malzemeEksikleri(GBP)).toEqual([M.EKSIK_PARA]);
    expect(M.malzemeEksikleri({ ...GBP, kiloFiyati: 10 })).toEqual([M.EKSIK_PARA]);
  });
  it("AC-10 (motor): fiyatsız malzemenin Fiyat hücresi metni değişmedi", () => {
    expect(M.kumeOzeti(M.fiyatKumesi(FIYATSIZ))).toBe("fiyat girilmedi");
  });
  it("AC-14: çöpteki malzeme eksik sayısına girmez", () => {
    expect(M.eksikMalzemeSayisi([{ ...FIYATSIZ_OZGULSUZ, deletedAt: "2026-11-01" }, KURSUZ])).toBe(1);
  });
  it("tam malzeme bugünkü gibi eksiksiz; kayıtsız çağrı eski cevabı verir", () => {
    expect(M.malzemeEksikleri(TAM)).toEqual([]);
    expect(M.malzemeEksikleri(null)).toEqual([M.EKSIK_KILO]);
  });
});

describe("Spec 0148 C1: hesap tarafı değişmez (çapraz ölçüm)", () => {
  it("AC-11: fiyatsız malzemeden yapılan parçanın maliyeti 'girilmedi' (null), kalemin nedeni kilo fiyatı", () => {
    const parca = { id: 40, ad: "Burç", maliyetKalemleri: [{ tur: "malzeme", adet: 1, malzemeId: 1, bicim: "mil", cap: 70, boy: 170 }] };
    const mk = M.malzemeKatalogu([FIYATSIZ]);
    expect(parcaMaliyetKurus(parca, undefined, setKatalogu([parca]), mk)).toBeNull();
    expect(M.malzemeOzeti({ malzemeId: 1, bicim: "mil", cap: 70, boy: 170 }, mk).eksik).toEqual([M.EKSIK_KILO]);
  });
  it("AC-12: sipariş fiyatlı nüshasında fiyatsız malzemenin satırı nedenini yazar ve tutarsız sayısı spec öncesiyle aynı", () => {
    const [v, s] = SENARYOLAR().odakli;
    const r = S.siparisIhtiyaci(v, s);
    const alfa = r.tedarikciBolumleri.belge.find(b => b.ad === "Alfa Çelik");
    expect(alfa.satirlar.find(x => x.ad === "Fiyatsız parça").tutarNeden).toBe(S.NEDEN_FIYAT_YOK);
    expect(alfa.tutarsizSayi).toBe(3); // 0147 altınıyla aynı (tests/fixtures/0147-toplam-once.json: "3 satırın tutarı hesaplanamadı")
    const altin = JSON.parse(fs.readFileSync("tests/fixtures/0147-toplam-once.json", "utf8"));
    expect(altin.odakli.dip.join("")).toContain("3 satırın tutarı hesaplanamadı");
    // Fiyatsız malzeme listede eksik değil ama sipariş tarafı aynı kaydı tutarsız sayıyor.
    expect(M.malzemeEksikMi(v.malzemeler.find(m => m.id === 507))).toBe(false);
  });
});

describe("Spec 0148 C2: kural tek yerde (tarama)", () => {
  it("eksiklik ölçütünü yalnız malzeme.js yazar; liste motoru çağırır", () => {
    const yazanlar = dosyalar("src").filter(f => /fiyatGirilmemisMi\s*=|malzemeEksikleri\s*=|EKSIK_KILO\b(?!_)/.test(kodSatirlari(f)) && !f.endsWith(path.join("lib", "malzeme.js")));
    expect(yazanlar).toEqual([]);
    const liste = kodSatirlari("src/components/MalzemeManager.jsx");
    expect(liste).toMatch(/malzemeEksikleri\(m\)/); expect(liste).toMatch(/eksikMalzemeSayisi\(malzemeler\)/);
    expect(liste).not.toMatch(/kiloFiyati\s*==\s*null|fiyatGirilmemisMi|EKSIK_OZGUL/);
  });
});
