// Spec 0138 ile: spec 0137'nin bu dosyaya eklediği dış işlem iddiaları kaldırıldı, dosya 0136 hâline döndü (C7, AC-41, AC-42).
// Spec 0132: malzeme kataloğu ve malzemeden türeyen parça maliyeti. Saf motor (lib/malzeme.js), tek okuma yolunun dördüncü kaynağı
// (urunAgaci), Excel kuralı (parcaAktarma), model maliyeti (makinaStandartMaliyet), birleştirme ve kaynak taramaları.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import * as M from "../src/lib/malzeme";
import { parcaMaliyetKurus, parcaMaliyetiVar, maliyetKaynagi, maliyetGecmisiYaz, gecmisliKayit, setKatalogu, setOzeti, maliyetGirildiMi, gecerliGunMu, gecerlilikTarihiDogrula, KALEM_EXCEL_HATASI } from "../src/lib/urunAgaci";
import * as G from "../src/lib/gecerlilik";
import { parcaDisaAktarmaSatiri, parcaSatirlariniCoz, PARCA_AKTARMA_BASLIKLARI } from "../src/lib/parcaAktarma";
import { modelMaliyetleri } from "../src/lib/makinaStandartMaliyet";
import { buildMergePlan, MERGE_KEYS } from "../src/lib/merge";
import { uid } from "../src/lib/utils";
import { BLOB_SECTIONS, SECTION_GROUP, BOLUM_SEKMELERI } from "../electron/serverAuth.cjs";

const P304 = { id: 1, ad: "304 Paslanmaz", alasim: "AISI 304", ozgulAgirlik: 7.9, kiloFiyati: 2.95, paraBirimi: "USD", kur: 50 };
const C8620 = { id: 2, ad: "8620", ozgulAgirlik: 7.85, kiloFiyati: 100 };
const kat = (...m) => M.malzemeKatalogu(m.length ? m : [P304, C8620]);
const oz = (s, k = kat()) => M.malzemeOzeti(s, k);
const MIL = { malzemeId: 1, bicim: "mil", cap: 140, boy: 78 };
const kod = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const dosyalar = (dir) => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? (f === "map" ? [] : dosyalar(p)) : /\.(js|jsx)$/.test(f) ? [p] : []; });

describe("Spec 0132: malzeme kartı", () => {
  it("AC-2: temiz kurulumda malzeme listesi boştur; program hazır ad, özgül ağırlık ya da fiyat yazmaz", () => {
    const app = readFileSync("src/App.jsx", "utf8");
    expect(app).toMatch(/const \[malzemeler,\s+setMalzemeler\]\s+= useState\(\[\]\);/);
    expect(readFileSync("src/lib/constants.js", "utf8")).not.toMatch(/malzeme/i);
    expect(kod("src/lib/malzeme.js")).not.toMatch(/7[.,]85|7[.,]9\b|Paslanmaz/);
  });
  it("AC-3: adı boş malzeme kaydedilmez, nedeni alanda", () => {
    const v = M.malzemeDogrula({ ad: "  " }, []);
    expect(v.gecerli).toBe(false); expect(v.hatalar.ad).toBe(M.AD_BOS_HATASI);
  });
  it("AC-4: aynı adda ikinci canlı malzeme kaydedilmez; kendisi ve çöpteki aynı ad engel değil", () => {
    expect(M.malzemeDogrula({ ad: "8620" }, [C8620]).hatalar.ad).toBe(M.AD_AYNI_HATASI);
    expect(M.malzemeDogrula({ ad: "8620" }, [C8620], 2).gecerli).toBe(true);
    expect(M.malzemeDogrula({ ad: "8620" }, [{ ...C8620, deletedAt: "2026-10-01" }]).gecerli).toBe(true);
  });
  it("AC-5: özgül ağırlığı boş malzeme kaydedilir ve eksik sayılır", () => {
    const v = M.malzemeDogrula({ ad: "Alüminyum", kiloFiyati: "5" }, []);
    expect(v.gecerli).toBe(true);
    expect(M.malzemeEksikleri(v.kayit)).toContain(M.EKSIK_OZGUL);
    expect(M.eksikMalzemeSayisi([v.kayit, P304, { ...v.kayit, id: 9, deletedAt: "x" }])).toBe(1);
  });
  it("AC-6: özgül ağırlık sıfır, negatif ya da sayı değilse reddedilir", () => {
    for (const ham of ["0", "-1", "abc"]) expect(M.malzemeDogrula({ ad: "X", ozgulAgirlik: ham }, []).hatalar.ozgulAgirlik).toBeTruthy();
    expect(M.malzemeDogrula({ ad: "X", ozgulAgirlik: "7,85" }, []).kayit.ozgulAgirlik).toBe(7.85);
  });
  it("AC-7: kilo fiyatı TL, USD ve EUR olabilir; tanınmayan para birimi reddedilir", () => {
    for (const pb of ["TRY", "USD", "EUR"]) expect(M.malzemeDogrula({ ad: "X", paraBirimi: pb }, []).gecerli).toBe(true);
    expect(M.malzemeDogrula({ ad: "X", paraBirimi: "GBP" }, []).hatalar.paraBirimi).toBe(M.PARA_HATASI);
    // TL kayda yazılmaz (varsayılan), döviz yazılır.
    expect(M.malzemeDogrula({ ad: "X", paraBirimi: "TRY" }, []).kayit).not.toHaveProperty("paraBirimi");
  });
  it("AC-11: bant alt sınır ve fiyat taşır; en üst bant açık uçlu okunur", () => {
    const b = M.bantlarDogrula([{ alt: "0", fiyat: "2,85" }, { alt: "151", fiyat: "3,10" }]).kayit;
    expect(b).toEqual([{ alt: 0, fiyat: 2.85 }, { alt: 151, fiyat: 3.1 }]);
    expect(M.bantMetni(b, 1)).toBe("Ø151 ve üstü");
    expect(M.bantMetni(b, 0)).toBe("Ø0 – Ø151 altı");
  });
  it("AC-12: artan sırada olmayan ya da çakışan bantlar reddedilir; ilk bandın alt sınırı 0'a sabit (Karar 26)", () => {
    expect(M.bantlarDogrula([{ alt: "0", fiyat: "1" }, { alt: "100", fiyat: "2" }, { alt: "80", fiyat: "3" }]).hata).toBe(M.BANT_SIRA_HATASI);
    expect(M.bantlarDogrula([{ alt: "0", fiyat: "1" }, { alt: "100", fiyat: "2" }, { alt: "100", fiyat: "3" }]).hata).toBe(M.BANT_SIRA_HATASI);
    expect(M.bantlarDogrula([{ alt: "50", fiyat: "1" }]).kayit).toEqual([{ alt: 0, fiyat: 1 }]);
    expect(M.bantlarDogrula([{ alt: "0", fiyat: "" }]).hata).toBe(M.BANT_FIYAT_HATASI);
  });
  it("AC-13: bandı olmayan malzemede çap ne olursa olsun tek kilo fiyatı", () => {
    const k = kat({ ...C8620 });
    const a = oz({ malzemeId: 2, bicim: "mil", cap: 20, boy: 100 }, k); const b = oz({ malzemeId: 2, bicim: "mil", cap: 300, boy: 100 }, k);
    expect(a.fiyat).toBe(100); expect(b.fiyat).toBe(100);
  });
  it("AC-16 / AC-84 / R13/2: fire 0 ile 100 arası; kart ve parça satırı aynı doğrulayıcıdan", () => {
    for (const ham of ["-1", "101"]) {
      expect(M.malzemeDogrula({ ad: "X", fire: ham }, []).hatalar.fire).toBe(M.FIRE_HATASI);
      expect(M.malzemeSatiriDogrula({ malzemeId: 1, bicim: "mil", cap: "10", boy: "10", fire: ham }).hatalar.fire).toBe(M.FIRE_HATASI);
    }
    expect(M.fireDogrula("100").deger).toBe(100);
    expect(kod("src/lib/malzeme.js").match(/FIRE_HATASI/g).length).toBeGreaterThan(1);
    expect(kod("src/lib/malzeme.js")).toMatch(/const f = fireDogrula\(form\.fire\);/);
  });
  it("AC-91 / R7/2: kayıtta tanınmayan para birimi eksik sayılır ve bağlı parça girilmedi döner (TL'ye katlanmaz)", () => {
    const g = { ...C8620, id: 3, paraBirimi: "GBP" };
    expect(M.malzemeEksikleri(g)).toContain(M.EKSIK_PARA);
    expect(oz({ malzemeId: 3, bicim: "mil", cap: 10, boy: 10 }, kat(g)).maliyetK).toBeNull();
  });
  it("AC-93 / C7/2: ad karşılaştırması trLower ile, kayıtta yazılan biçim korunur", () => {
    expect(M.adCakisiyorMu("304 paslanmaz", [P304])).toBe(true);
    expect(M.adCakisiyorMu("İNOX", [{ id: 5, ad: "inox" }])).toBe(true);
    expect(M.malzemeDogrula({ ad: " 304 Paslanmaz " }, []).kayit.ad).toBe("304 Paslanmaz");
    expect(kod("src/components/settings/SettingsTrash.jsx")).toMatch(/geriAlmaAdCakismasi\(m, rawMalzemeler, "malzeme"\)/);
  });
  it("AC-94: çöp etiketi tek yardımcıdan; alaşımsız malzemede yalnız ad", () => {
    expect(M.malzemeCopEtiketi(P304)).toBe("304 Paslanmaz · AISI 304");
    expect(M.malzemeCopEtiketi(C8620)).toBe("8620");
  });
  it("AC-92 / R2/2: asgari sipariş ve geldiği boy kilo yöntemli maliyeti değiştirmez", () => {
    const a = oz(MIL).maliyetK;
    expect(oz(MIL, kat({ ...P304, asgariSiparis: 500, geldigiBoy: 6 })).maliyetK).toBe(a);
  });
});

describe("Spec 0132: fiyat geçmişi", () => {
  const B = "2026-11-05";
  it("AC-21: geçerlilik tarihi bugünden sonra olamaz", () => {
    expect(M.fiyatGecmisiYaz(P304, { ...P304, kiloFiyati: 3.15 }, { tarih: "2026-11-06", bugun: B }).hata).toBe(G.TARIH_GELECEK_HATASI);
  });
  it("AC-22: geçmişi olmayan malzemede ilk fiyat girişi kayıt doğurmaz", () => {
    const bos = { id: 7, ad: "Yeni" };
    expect(M.fiyatGecmisiYaz(bos, { ...bos, kiloFiyati: 10 }, { tarih: B, bugun: B }).gecmis).toEqual([]);
  });
  it("AC-23: aynı güne ikinci kayıt yazılmaz, son kaydın üstüne yazar", () => {
    const r1 = M.fiyatGecmisiYaz(P304, { ...P304, kiloFiyati: 3 }, { tarih: B, bugun: B });
    const m1 = { ...P304, kiloFiyati: 3, fiyatGecmisi: r1.gecmis };
    const r2 = M.fiyatGecmisiYaz(m1, { ...m1, kiloFiyati: 3.2 }, { tarih: B, bugun: B });
    expect(r2.gecmis.map(x => x.gecerli)).toEqual(["", B]);
    expect(r2.gecmis[1].kiloFiyati).toBe(3.2);
  });
  const Z = (() => {
    const m0 = { ...P304, kiloFiyati: 2.85 };
    const r = M.fiyatGecmisiYaz(m0, { ...m0, kiloFiyati: 3.15 }, { tarih: "2026-06-01", bugun: B });
    // İlk kayıt başlangıçtan beri; 01.03'ü ifade etmek için ilk kaydı tarihli kuralım.
    return { ...m0, kiloFiyati: 3.15, fiyatGecmisi: [{ ...r.gecmis[0], gecerli: "2026-03-01" }, r.gecmis[1]] };
  })();
  it("AC-24: 01.03'te 2,85 $, 01.06'da 3,15 $ → 15.04 sorgusu 2,85 $", () => {
    expect(M.fiyatKumesiTarihte(Z, "2026-04-15").kiloFiyati).toBe(2.85);
    expect(M.malzemeOzeti(MIL, kat(Z), "2026-04-15").fiyat).toBe(2.85);
  });
  it("AC-25: son kaydın aralığındaki sorgu bugünkü çözülmüş değeri verir", () => {
    const bugunkuDegisti = { ...Z, kiloFiyati: 3.4 }; // karışık sürüm: son kayıt saklı 3,15, bugünkü 3,40
    expect(M.fiyatKumesiTarihte(bugunkuDegisti, "2026-07-15").kiloFiyati).toBe(3.4);
  });
  it("AC-26: malzeme satırı olmayan parçada tarihsiz sorgu spec öncesiyle aynı; malzeme kaynaklıda bugünkü fiyat", () => {
    const p = { id: 1, maliyet: 12, maliyetGecmisi: [{ gecerli: "", kurus: 500 }, { gecerli: "2026-06-01", kurus: 1200 }] };
    expect(parcaMaliyetKurus(p)).toBe(1200);
    expect(parcaMaliyetKurus(p, undefined, undefined, kat())).toBe(1200);
    const mp = { id: 2, malzemeSatiri: MIL };
    expect(parcaMaliyetKurus(mp, undefined, undefined, kat(Z))).toBe(M.malzemeOzeti(MIL, kat(Z)).maliyetK);
    expect(M.malzemeOzeti(MIL, kat(Z)).fiyat).toBe(3.15);
  });
  it("AC-51: geçmişe verilen zam o tarihten önceki sorguları değiştirmez", () => {
    const once = M.malzemeOzeti(MIL, kat(Z), "2026-05-01").maliyetK;
    const r = M.fiyatGecmisiYaz(Z, { ...Z, kiloFiyati: 4 }, { tarih: "2026-09-01", bugun: B });
    const z2 = { ...Z, kiloFiyati: 4, fiyatGecmisi: r.gecmis };
    expect(M.malzemeOzeti(MIL, kat(z2), "2026-05-01").maliyetK).toBe(once);
    expect(M.malzemeOzeti(MIL, kat(z2), "2026-10-01").fiyat).toBe(4);
  });
  it("AC-79: yalnız kur değişince yeni satır doğar", () => {
    const r = M.fiyatGecmisiYaz(P304, { ...P304, kur: 51 }, { tarih: B, bugun: B });
    expect(r.gecmis).toHaveLength(2); expect(r.gecmis[1].kur).toBe(51); expect(r.gecmis[0].kur).toBe(50);
  });
  it("AC-80: yalnız bir bandın fiyatı değişince yeni satır doğar (Karar 25: boy fiyatı da kümede)", () => {
    const b = { ...P304, bantlar: [{ alt: 0, fiyat: 2.9 }, { alt: 151, fiyat: 3.1 }] };
    const r = M.fiyatGecmisiYaz(b, { ...b, bantlar: [{ alt: 0, fiyat: 2.9 }, { alt: 151, fiyat: 3.3 }] }, { tarih: B, bugun: B });
    expect(r.gecmis).toHaveLength(2); expect(r.gecmis[1].bantlar[1].fiyat).toBe(3.3);
    expect(M.fiyatGecmisiYaz(b, { ...b, boyFiyati: 900 }, { tarih: B, bugun: B }).gecmis).toHaveLength(2);
    // Fiyatla ilgisiz alan (ad, özgül ağırlık) geçmiş doğurmaz.
    expect(M.fiyatGecmisiYaz(b, { ...b, ad: "Yeni ad", ozgulAgirlik: 8 }, { tarih: B, bugun: B }).gecmis).toEqual([]);
  });
  it("Karar 24 / C3: tarih kuralları tek modülde; urunAgaci aynı adlarla yeniden dışa verir", () => {
    expect(gecerliGunMu).toBe(G.gecerliGunMu);
    expect(gecerlilikTarihiDogrula).toBe(G.gecerlilikTarihiDogrula);
    expect(kod("src/lib/urunAgaci.js")).not.toMatch(/const GUN_DESEN/);
    expect(G.tarihteGecerliIndeks([{ gecerli: "" }, { gecerli: "2026-06-01" }], "2026-05-01")).toBe(0);
    expect(G.tarihteGecerliIndeks([{ gecerli: "" }, { gecerli: "2026-06-01" }], "2026-07-01")).toBe(-1);
  });
});

describe("Spec 0132: malzemeden ağırlık ve maliyet", () => {
  it("AC-29: biçim istediği ölçüleri bilir", () => {
    expect(M.BICIMLER.mil.olculer).toEqual(["cap", "boy"]);
    expect(M.BICIMLER.lama.olculer).toEqual(["kalinlik", "genislik", "boy"]);
    expect(M.BICIMLER.boru.olculer).toEqual(["cap", "et", "boy"]);
    expect(M.BICIMLER.sac.olculer).toEqual(["kalinlik", "en", "boy"]);
  });
  it("AC-30: yuvarlak mil Ø140 × 78, ρ 7,90 → 9,486 kg", () => { expect(M.ucOndalik(oz(MIL).hamKg)).toBe(9.486); });
  it("AC-31: lama 10 × 20 × 125, ρ 7,85 → 0,196 kg (mil formülü değil)", () => {
    expect(M.ucOndalik(oz({ malzemeId: 2, bicim: "lama", kalinlik: 10, genislik: 20, boy: 125 }).hamKg)).toBe(0.196);
  });
  it("AC-32: boru Ø19, et 1,5, boy 173, ρ 7,85 → 0,112 kg (dolu mil değil)", () => {
    expect(M.ucOndalik(oz({ malzemeId: 2, bicim: "boru", cap: 19, et: 1.5, boy: 173 }).hamKg)).toBe(0.112);
  });
  it("AC-33 / AC-90: sac 2 × 100 × 250, ρ 7,85 → 0,393 kg (tam yarım yukarı)", () => {
    const kg = oz({ malzemeId: 2, bicim: "sac", kalinlik: 2, en: 100, boy: 250 }).hamKg;
    expect(M.ucOndalik(kg)).toBe(0.393);
    expect(M.kgMetni(0.3925)).toBe("0,393 kg");
  });
  it("AC-34: işleme payı çapa ve boya ayrı eklenir → 144 × 83, 10,679 kg", () => {
    const s = { ...MIL, payCap: 4, payBoy: 5 };
    expect(M.hamOlculer(s)).toEqual({ cap: 144, boy: 83 });
    expect(M.ucOndalik(oz(s).hamKg)).toBe(10.679);
  });
  it("AC-35 / AC-83: fire pay dahil ağırlığa eklenir → 11,533 kg; fire payın altına uygulanan rakam reddedilir", () => {
    const s = { ...MIL, payCap: 4, payBoy: 5, fire: 8 };
    expect(M.ucOndalik(oz(s).fireliKg)).toBe(11.533);
    const yanlis = oz(MIL).hamKg * 1.08 + (oz({ ...MIL, payCap: 4, payBoy: 5 }).hamKg - oz(MIL).hamKg);
    expect(M.ucOndalik(yanlis)).not.toBe(11.533);
  });
  it("AC-36: satırda fire boşsa malzeme kartındaki varsayılan", () => {
    expect(oz(MIL, kat({ ...P304, fire: 10 })).fire).toBe(10);
  });
  it("AC-37: iki fire de boşsa fire sıfır, hesap çalışır", () => {
    const o = oz(MIL); expect(o.fire).toBe(0); expect(o.fireliKg).toBe(o.hamKg); expect(o.maliyetK).toBeGreaterThan(0);
  });
  it("AC-38: ρ 7,90, Ø144 × 83, %8 fire, 2,95 $, kur 50 → 1.701,12 ₺", () => {
    expect(oz({ ...MIL, payCap: 4, payBoy: 5, fire: 8 }).maliyetK).toBe(170112);
  });
  it("AC-39: ara değer yuvarlanmaz; yuvarlanmış ağırlıkla çıkan rakam reddedilir, yuvarlama yalnız kuruşa", () => {
    // AC-38'in girdilerinde iki yol tesadüfen aynı kuruşa düşer (1.701,1235 ve 1.701,1175); fark kilo fiyatı büyüyünce görünür.
    const o = oz({ ...MIL, payCap: 4, payBoy: 5, fire: 8 });
    expect(o.fireliKg).not.toBe(M.ucOndalik(o.fireliKg));
    expect(o.maliyetK).toBe(Math.round(o.fireliKg * 2.95 * 50 * 100));
    const k = kat({ id: 9, ad: "Pahalı", ozgulAgirlik: 7.9, kiloFiyati: 1000 });
    const p = oz({ ...MIL, malzemeId: 9, payCap: 4, payBoy: 5, fire: 8 }, k);
    expect(p.maliyetK).toBe(1153304);
    expect(Math.round(M.ucOndalik(p.fireliKg) * 1000 * 100)).not.toBe(p.maliyetK);
  });
  it("AC-40: TL malzemede kur hesaba girmez", () => {
    const o = oz({ malzemeId: 2, bicim: "mil", cap: 50, boy: 100 }, kat({ ...C8620, kur: 99 }));
    expect(o.kur).toBe(1); expect(o.maliyetK).toBe(Math.round(o.fireliKg * 100 * 100));
  });
  it("AC-41: kilo yönteminde özgül ağırlığı boş malzeme → girilmedi (sıfır değil)", () => {
    expect(oz(MIL, kat({ ...P304, ozgulAgirlik: undefined })).maliyetK).toBeNull();
  });
  it("AC-42: kilo fiyatı boş → girilmedi", () => {
    expect(oz(MIL, kat({ ...P304, kiloFiyati: undefined })).maliyetK).toBeNull();
  });
  it("AC-43: çöpteki malzemeye bağlı parça girilmedi ve sayımda kalır", () => {
    const k = M.malzemeKatalogu([{ ...P304, deletedAt: "2026-10-01" }]);
    const p = { id: 1, malzemeSatiri: MIL, maliyet: 50 };
    expect(parcaMaliyetKurus(p, undefined, undefined, k)).toBeNull();
    expect(maliyetGirildiMi(p, undefined, undefined, k)).toBe(false);
  });
  it("AC-44: boy yönteminde maliyet boy fiyatı ve uzunluktan; kilo hesabı yapılmaz", () => {
    const m = { id: 4, ad: "Boru", paraBirimi: "TRY", boyFiyati: 600, geldigiBoy: 6 };
    const o = oz({ malzemeId: 4, bicim: "boru", cap: 19, et: 1.5, boy: 173, payBoy: 7, yontem: "boy" }, kat(m));
    expect(o.hamKg).toBeNull();
    expect(o.maliyetK).toBe(Math.round((180 / 6000) * 600 * 100)); // 18,00 ₺
  });
  it("AC-45: ölçüsü eksik satır kaydedilir ama girilmedi döner", () => {
    const v = M.malzemeSatiriDogrula({ malzemeId: "1", bicim: "mil", cap: "140", boy: "" });
    expect(v.gecerli).toBe(true); expect(v.kayit).toEqual({ malzemeId: 1, bicim: "mil", cap: 140 });
    expect(oz(v.kayit).maliyetK).toBeNull();
  });
  it("AC-46: sıfır ya da negatif ölçü reddedilir", () => {
    expect(M.malzemeSatiriDogrula({ malzemeId: 1, bicim: "mil", cap: "0", boy: "10" }).hatalar.cap).toBe(M.OLCU_HATASI);
    expect(M.malzemeSatiriDogrula({ malzemeId: 1, bicim: "mil", cap: "-3", boy: "10" }).hatalar.cap).toBe(M.OLCU_HATASI);
    expect(M.malzemeSatiriDogrula({ malzemeId: 1, bicim: "mil", cap: "5", boy: "10", payCap: "-1" }).hatalar.payCap).toBe(M.PAY_HATASI);
  });
  it("AC-67: boy yönteminde özgül ağırlık istenmez", () => {
    const m = { id: 4, ad: "Boru", boyFiyati: 600, geldigiBoy: 6 };
    expect(oz({ malzemeId: 4, bicim: "boru", cap: 19, et: 1.5, boy: 180, yontem: "boy" }, kat(m)).maliyetK).toBe(1800);
  });
  it("AC-68: boy yönteminde geldiği boy ya da boy fiyatı boşsa girilmedi", () => {
    const s = { malzemeId: 4, bicim: "boru", cap: 19, et: 1.5, boy: 180, yontem: "boy" };
    expect(oz(s, kat({ id: 4, ad: "B", boyFiyati: 600 })).maliyetK).toBeNull();
    expect(oz(s, kat({ id: 4, ad: "B", geldigiBoy: 6 })).maliyetK).toBeNull();
  });
  it("AC-69: boy yönteminde fire uzunluk oranına aynı yüzdeyle uygulanır", () => {
    const m = { id: 4, ad: "Boru", boyFiyati: 600, geldigiBoy: 6, fire: 10 };
    expect(oz({ malzemeId: 4, bicim: "boru", cap: 19, et: 1.5, boy: 180, yontem: "boy" }, kat(m)).maliyetK).toBe(1980);
  });
  it("AC-70: bandı ham çap seçer (140 + 4 → 144'ün bandı)", () => {
    const b = { ...P304, bantlar: [{ alt: 0, fiyat: 2.5 }, { alt: 142, fiyat: 3 }] };
    expect(oz({ ...MIL, payCap: 4 }, kat(b)).fiyat).toBe(3);
    expect(oz(MIL, kat(b)).fiyat).toBe(2.5);
  });
  it("AC-71: lama ve sacda bant uygulanmaz, tek kilo fiyatı", () => {
    const b = { ...C8620, bantlar: [{ alt: 0, fiyat: 1 }, { alt: 5, fiyat: 2 }] };
    expect(oz({ malzemeId: 2, bicim: "lama", kalinlik: 10, genislik: 20, boy: 125 }, kat(b)).fiyat).toBe(100);
    expect(oz({ malzemeId: 2, bicim: "sac", kalinlik: 10, en: 20, boy: 125 }, kat(b)).fiyat).toBe(100);
  });
  it("AC-81: lamada pay kalınlığa, genişliğe ve boya ayrı eklenir", () => {
    expect(M.hamOlculer({ bicim: "lama", kalinlik: 10, genislik: 20, boy: 125, payKalinlik: 1, payGenislik: 2, payBoy: 3 })).toEqual({ kalinlik: 11, genislik: 22, boy: 128 });
  });
  it("AC-82: boruda pay çapa ve boya eklenir, et kalınlığına eklenmez", () => {
    expect(M.hamOlculer({ bicim: "boru", cap: 19, et: 1.5, boy: 173, payCap: 1, payBoy: 2, payKalinlik: 9 })).toEqual({ cap: 20, et: 1.5, boy: 175 });
    expect(M.malzemeSatiriDogrula({ malzemeId: 1, bicim: "boru", cap: "19", et: "1,5", boy: "173", payKalinlik: "9" }).kayit).not.toHaveProperty("payKalinlik");
  });
  it("Karar 27: döviz fiyatlı ve kuru boş malzeme eksik, nedeni kur girilmedi; kayıt engellenmez", () => {
    const m = { ...P304, kur: undefined };
    expect(M.malzemeEksikleri(m)).toEqual([M.EKSIK_KUR]);
    expect(M.malzemeDogrula(M.malzemeFormu(m), []).gecerli).toBe(true);
    expect(oz(MIL, kat(m)).maliyetK).toBeNull();
  });
});

describe("Spec 0132: tek okuma yolu ve öncelik", () => {
  const p = { id: 10, ad: "Mil", malzemeSatiri: MIL, maliyet: 999, hammaddeler: [{ tedarikciId: 1, tutar: 50 }], maliyetGecmisi: [{ gecerli: "", kurus: 1 }, { gecerli: "2026-06-01", kurus: 2 }] };
  it("AC-62: liste verilmeyen çağrıda malzeme kaynaklı parça girilmedi; elle değer okunmaz", () => {
    expect(parcaMaliyetKurus(p)).toBeNull();
    expect(parcaMaliyetiVar(p)).toBe(false);
  });
  it("AC-65: kaynak saklanmaz; malzeme satırı ve kırılım birlikteyse maliyet malzemeden", () => {
    expect(parcaMaliyetKurus(p, undefined, undefined, kat())).toBe(oz(MIL).maliyetK);
    // Spec 0135 ile (R39, plan turu Karar 31): kaynak kalem türüdür; malzeme satırı varken kırılım kaleme türetilmez.
    expect(maliyetKaynagi(p, undefined, undefined, kat())).toEqual({ tur: "kalem", malzeme: 1, islem: 0 });
    expect(kod("src/lib/malzeme.js")).not.toMatch(/maliyetKaynak\s*:/);
  });
  it("AC-78: malzeme kaynaklı parçada tarihli sorgu malzemenin geçmişinden; parçanın kendi geçmişi okunmaz", () => {
    expect(parcaMaliyetKurus(p, "2026-01-01", undefined, kat())).toBe(oz(MIL).maliyetK);
  });
  it("AC-63: malzeme kaynaklı kayıtta geçmiş motoru çalışmaz; saklı geçmiş silinmez", () => {
    const r = maliyetGecmisiYaz(p, 5, { tarih: "2026-11-05", bugun: "2026-11-05", malzeme: true });
    expect(r).toEqual({ gecmis: p.maliyetGecmisi, hata: null });
    const k = gecmisliKayit({ ...p, maliyet: 1234 }, p, { tarih: "2026-11-05", bugun: "2026-11-05" });
    expect(k.maliyetGecmisi).toEqual(p.maliyetGecmisi);
  });
  it("AC-64 / AC-58: setin bileşeni malzemeden; liste setin bileşen hesabına iner", () => {
    const set = { id: 20, ad: "Set", setIcerigi: [{ partId: 10, miktar: 2 }] };
    const sk = setKatalogu([p, set]);
    expect(parcaMaliyetKurus(set, undefined, sk, kat())).toBe(2 * oz(MIL).maliyetK);
    expect(parcaMaliyetKurus(set, undefined, sk)).toBeNull();
    expect(setOzeti(set.setIcerigi, sk, undefined, kat()).maliyetK).toBe(2 * oz(MIL).maliyetK);
  });
  it("AC-66: set içeriği dolu parçada malzeme satırı okunmaz", () => {
    const b = { id: 30, ad: "B", maliyet: 7 };
    const sp = { id: 31, ad: "S", setIcerigi: [{ partId: 30, miktar: 1 }], malzemeSatiri: MIL };
    expect(parcaMaliyetKurus(sp, undefined, setKatalogu([b, sp]), kat())).toBe(700);
    expect(maliyetKaynagi(sp, undefined, setKatalogu([b, sp]), kat()).tur).toBe("icerik");
  });
  it("AC-85 / AC-53: sayaç malzeme listesini alır; malzemesi tam parça sayılmaz, eksik ya da çöpteki sayılır; kit bağına bakılmaz", () => {
    const pm = kod("src/components/PartManager.jsx");
    expect(pm).toMatch(/const maliyetsizSayi = parts\.filter\(p => !maliyetGirildiMi\(p, undefined, katalog, malzemeKat\)\)\.length;/);
    expect(pm).not.toMatch(/maliyetsizSayi[^\n]*defaultParcalar/);
    const say = (parcalar, k) => parcalar.filter(x => !maliyetGirildiMi(x, undefined, setKatalogu(parcalar), k)).length;
    expect(say([{ id: 1, malzemeSatiri: MIL }], kat())).toBe(0);
    expect(say([{ id: 1, malzemeSatiri: MIL }], kat({ ...P304, ozgulAgirlik: undefined }))).toBe(1);
    expect(say([{ id: 1, malzemeSatiri: MIL }], M.malzemeKatalogu([{ ...P304, deletedAt: "x" }]))).toBe(1);
  });
  it("C1: malzemeden ağırlık ve tutar türeten çarpımlar yalnız malzeme motorunda", () => {
    const desen = /ozgulAgirlik\s*[*/]|\*\s*[a-zA-Z.]*ozgulAgirlik|Math\.PI/;
    // Harita geometrisi (mapStats, Math.PI ile izdüşüm) malzeme kavramı değildir; tek gerekçeli istisna.
    const bulunan = dosyalar("src").filter(f => desen.test(kod(f)) && !f.includes("/map/") && !f.endsWith("mapStats.js")).map(f => f.replace(/\\/g, "/"));
    expect(bulunan).toEqual(["src/lib/malzeme.js"]);
  });
  it("C1/2: on üç çağrı yeri malzeme listesini ya da kapısını geçirir", () => {
    const u = kod("src/lib/urunAgaci.js");
    expect(u).toMatch(/setOzeti\(p\.setIcerigi, katalog, tarih, malzemeKat\)/);
    expect(u).toMatch(/tekilMaliyetKurus\(p, tarih, malzemeKat\)/);
    expect(u).toMatch(/tekilMaliyetKurus\(b, tarih, malzemeKat\)/);
    // Spec 0135 ile (R35, tuzak 5): geçmiş kapısı "en az bir malzeme kalemi var mı"; desen yeni kapıyı arar, iddia aynı.
    expect(u).toMatch(/malzeme: malzemeKalemiVarMiYerel\(temel\)/);
    const pm = kod("src/components/PartManager.jsx");
    expect(pm).toMatch(/malzeme: maliyetKalemleriOf\(temel\)\.some\(x => x\.tur === KALEM_TUR\.MALZEME\) \}\)\.hata/);
    expect(pm).toMatch(/parcaMaliyetMetni\(k, undefined, katalog, malzemeKat\)/);
    expect(pm).toMatch(/maliyetKaynagi\(p, undefined, katalog, malzemeKat\)/);
    expect(kod("src/lib/makinaStandartMaliyet.js")).toMatch(/parcaMaliyetKurus\(p, tarih, partMap, malzemeKat\)/);
    const a = kod("src/lib/parcaAktarma.js");
    expect(a).toMatch(/parcaMaliyetKurus\(p, undefined, katalog, malzemeKat\)/);
    expect(a).toMatch(/set: setOlacak, malzeme: malzemeKalemiVarMi\(mevcut\)/); // spec 0135 ile
    // Spec 0133 ile: dördüncü parametre fiyat ayarları (maliyete bağlı parçanın TL hücresi türetilmiş fiyat, R16).
    expect(kod("src/components/settings/SettingsExport.jsx")).toMatch(/parcaDisaAktarmaSatiri\(p, katalog, malzemeKat, appSettings\?\.fiyatAyarlari\)/);
  });
  it("C2: malzeme motoru saat okumaz, React almaz", () => {
    const m = kod("src/lib/malzeme.js");
    expect(m).not.toMatch(/Date\.now|new Date\(\)|yerelBugun|today\(|from "react"/);
  });
});

describe("Spec 0132: Excel, model maliyeti ve etki", () => {
  const PM = { id: 10, ad: "Mil", malzemeSatiri: MIL, maliyet: 999 };
  it("AC-72: dışa aktarma malzeme kaynaklı parçanın çözülmüş maliyetini yazar", () => {
    expect(parcaDisaAktarmaSatiri(PM, setKatalogu([PM]), kat())[9]).toBe(oz(MIL).maliyetK / 100);
    expect(parcaDisaAktarmaSatiri(PM, setKatalogu([PM]))[9]).toBe("");
  });
  it("AC-73: içe aktarma malzeme kaynaklı parçanın hücresini almaz, nedenini satır numarasıyla yazar; öteki hücreler yazılır", () => {
    const rows = [PARCA_AKTARMA_BASLIKLARI, ["Mil", "Shaft", "K-9", "", "", "", "450", "", "", "1234,56", ""]];
    const r = parcaSatirlariniCoz(rows, [PM], 1000, "2026-11-05", [P304, C8620]);
    expect(r.errors).toEqual([`Satır 2: ${KALEM_EXCEL_HATASI}`]); // spec 0135 ile (R37/2): tek bildirim metni
    expect(r.parts[0]).not.toHaveProperty("maliyet");
    expect(r.parts[0].adEN).toBe("Shaft"); expect(r.parts[0].fiyatTRY).toBe("450");
    // Dışa aktarılan rakam geri yüklenirse bildirim yok.
    const ayni = [PARCA_AKTARMA_BASLIKLARI, ["Mil", "", "", "", "", "", "", "", "", oz(MIL).maliyetK / 100, ""]];
    expect(parcaSatirlariniCoz(ayni, [PM], 1000, "2026-11-05", [P304, C8620]).errors).toEqual([]);
  });
  it("AC-74: şablonun sütun sayısı değişmez", () => {
    expect(PARCA_AKTARMA_BASLIKLARI).toHaveLength(11);
    expect(PARCA_AKTARMA_BASLIKLARI.join(" ")).not.toMatch(/malzeme/i);
  });
  it("R16/4: model maliyeti motorunun veri nesnesi malzemeleri taşır", () => {
    const modeller = { standardModels: [{ model: "AK", defaultParcalar: [{ partId: "10", miktar: 2 }] }], parts: [PM] };
    expect(modelMaliyetleri({ ...modeller, malzemeler: [P304] }, 0)[0].direktK).toBe(2 * oz(MIL).maliyetK);
    expect(modelMaliyetleri(modeller, 0)[0].eksikSayisi).toBe(1);
  });
  it("AC-47 / AC-48 / AC-49 / AC-50: zam parçaya dokunmadan okunur; etki sayısı ve örnek satır; bağlı parça yoksa sıfır", () => {
    const yeni = { ...P304, kiloFiyati: 3.5 };
    const e = M.fiyatEtkisi(P304, yeni, [PM, { id: 11, ad: "Başka", maliyet: 5 }], [P304, C8620]);
    expect(e).toEqual({ bagli: 1, degisen: 1, satirlar: [{ id: 10, ad: "Mil", once: oz(MIL).maliyetK, sonra: oz(MIL, kat(yeni)).maliyetK }] });
    expect(parcaMaliyetKurus(PM, undefined, undefined, kat(yeni))).toBe(e.satirlar[0].sonra);
    const bos = M.fiyatEtkisi(C8620, { ...C8620, kiloFiyati: 200 }, [PM], [P304, C8620]);
    expect(bos.degisen).toBe(0); expect(M.etkiMetni(bos)).toBe(M.BAGLI_PARCA_YOK);
  });
  it("AC-95 / R5/2: kur bilinmiyorsa iki ayrı neden", () => {
    expect(M.kurOnerisi("USD", null, false)).toEqual({ deger: null, neden: M.KUR_ALINMADI });
    expect(M.kurOnerisi("USD", null, true)).toEqual({ deger: null, neden: M.KUR_CEVRIMDISI });
    expect(M.kurOnerisi("EUR", { usd: 40, eur: 45 }, false)).toEqual({ deger: 45, neden: null });
    expect(M.KUR_ALINMADI).not.toBe(M.KUR_CEVRIMDISI);
  });
});

describe("Spec 0132: veri bölümü ve birleştirme", () => {
  it("AC-77 (harita) / C5/2: bölüm malzemeler, grup settings, sekme yalnız settings", () => {
    expect(BLOB_SECTIONS).toContain("malzemeler");
    expect(SECTION_GROUP.malzemeler).toBe("settings");
    expect(BOLUM_SEKMELERI.malzemeler).toEqual(["settings"]);
    expect(MERGE_KEYS).toContain("malzemeler");
  });
  it("AC-59 / AC-60: bu PC'de eklenen malzeme birleştirmede korunur; parçanın malzeme bağı yeni kimliği izler", () => {
    const mid = uid(), pid = uid(), yerel = uid();
    const sunucu = { malzemeler: [{ id: mid, ad: "Sunucudaki" }], parts: [] };
    const benim = { malzemeler: [{ id: mid, ad: "Benim" }, { id: yerel, ad: "Yalnız bu PC'de" }], parts: [{ id: pid, ad: "P", malzemeSatiri: { malzemeId: mid, bicim: "mil" } }] };
    const plan = buildMergePlan(benim, sunucu);
    expect(plan.adds.malzemeler.map(m => m.ad).sort()).toEqual(["Benim", "Yalnız bu PC'de"]);
    const yeniId = plan.maps.malzemeler.get(mid);
    expect(yeniId).not.toBe(mid);
    expect(plan.adds.parts[0].malzemeSatiri.malzemeId).toBe(yeniId);
  });
  it("C9: malzemenin ana tedarikçisi yeniden atanan tedarikçi kimliğini izler", () => {
    const tid = uid(), mid = uid();
    const sunucu = { tedarikciler: [{ id: tid, ad: "S" }], malzemeler: [] };
    const benim = { tedarikciler: [{ id: tid, ad: "B" }], malzemeler: [{ id: mid, ad: "M", tedarikciId: tid }] };
    const plan = buildMergePlan(benim, sunucu);
    expect(plan.adds.malzemeler[0].tedarikciId).toBe(plan.adds.tedarikciler[0].id);
  });
});

// Triyaj (2026-11-05): her bulgunun bekçisi. Bulgu 1 ve 8 ekranda (`ui/malzeme-0132.test.jsx`), bulgu 6'nın kart kolu
// `ui/malzeme-0132-parca.test.jsx`'te.
describe("Spec 0132 triyaj", () => {
  it("Bulgu 2: noktayla yazılan üç ondalık belirsizdir ve reddedilir; virgüllü ya da iki ondalıklı nokta kabul", () => {
    const v = M.malzemeDogrula({ ad: "X", kiloFiyati: "2.955", ozgulAgirlik: "7.850" }, []);
    expect(v.gecerli).toBe(false);
    expect(v.hatalar).toMatchObject({ kiloFiyati: M.BELIRSIZ_HATASI, ozgulAgirlik: M.BELIRSIZ_HATASI });
    expect(M.malzemeDogrula({ ad: "X", kiloFiyati: "2,955", ozgulAgirlik: "7,85" }, []).kayit).toMatchObject({ kiloFiyati: 2.955, ozgulAgirlik: 7.85 });
    expect(M.malzemeDogrula({ ad: "X", kiloFiyati: "2.95" }, []).kayit.kiloFiyati).toBe(2.95);
    expect(M.malzemeDogrula({ ad: "X", kiloFiyati: "1.250.000" }, []).kayit.kiloFiyati).toBe(1250000);
    expect(M.bantlarDogrula([{ alt: "0", fiyat: "3.125" }]).hata).toBe(M.BELIRSIZ_HATASI);
    expect(M.malzemeSatiriDogrula({ malzemeId: 1, bicim: "mil", cap: "140.000", boy: "78" }).hatalar.cap).toBe(M.BELIRSIZ_HATASI);
  });
  it("Bulgu 3: etki önizlemesi tek okuma yolundan; setli parça sayılmaz, bileşeni bu malzemeden olan set sayılır", () => {
    const bilesen = { id: 10, ad: "Bilesen", malzemeSatiri: MIL };
    const set = { id: 20, ad: "Set", setIcerigi: [{ partId: 10, miktar: 2 }] };
    const pul = { id: 30, ad: "Pul", maliyet: 4 };
    const setVeMalzemeli = { id: 40, ad: "SetVeMalzemeli", setIcerigi: [{ partId: 30, miktar: 1 }], malzemeSatiri: MIL };
    const yeni = { ...P304, kiloFiyati: 3.5 };
    const e = M.fiyatEtkisi(P304, yeni, [bilesen, set, pul, setVeMalzemeli], [P304, C8620]);
    expect(e.satirlar.map(s => s.ad)).toEqual(["Bilesen", "Set"]);
    expect(e.satirlar[1]).toMatchObject({ once: 2 * oz(MIL).maliyetK, sonra: 2 * oz(MIL, kat(yeni)).maliyetK });
    expect(e.bagli).toBe(2); // malzeme satırında bu malzeme geçen canlı parça (setli olan dahil)
    expect(e.degisen).toBe(2);
  });
  it("Bulgu 4: bantlı malzemede çaplı biçim tek kilo fiyatı istemez; lama ve sac ister, rozet dar metni yazar", () => {
    const B = { id: 7, ad: "Bantlı", ozgulAgirlik: 7.85, bantlar: [{ alt: 0, fiyat: 90 }, { alt: 100, fiyat: 95 }] };
    const k = kat(B);
    expect(M.malzemeOzeti({ malzemeId: 7, bicim: "mil", cap: 140, boy: 78 }, k).maliyetK).not.toBeNull();
    expect(M.malzemeOzeti({ malzemeId: 7, bicim: "boru", cap: 40, et: 3, boy: 78 }, k).maliyetK).not.toBeNull();
    const lama = M.malzemeOzeti({ malzemeId: 7, bicim: "lama", kalinlik: 10, genislik: 20, boy: 125 }, k);
    expect(lama.maliyetK).toBeNull(); expect(lama.eksik).toEqual([M.EKSIK_KILO_LAMA]);
    expect(M.malzemeEksikleri(B)).toEqual([M.EKSIK_KILO_LAMA]);
    // Bantsız malzemede eski metin aynen.
    expect(M.malzemeEksikleri({ id: 8, ad: "Y", ozgulAgirlik: 7.85 })).toEqual([M.EKSIK_KILO]);
  });
  it("Bulgu 5: bileşeni malzemeden hesaplanan set dışa aktarılıp aynen geri yüklenince bildirim yok", () => {
    const b = { id: 10, ad: "Bilesen", malzemeSatiri: MIL };
    const s = { id: 20, ad: "Set", setIcerigi: [{ partId: 10, miktar: 2 }] };
    const satir = parcaDisaAktarmaSatiri(s, setKatalogu([b, s]), kat());
    expect(satir[9]).toBe(2 * oz(MIL).maliyetK / 100);
    const rows = [PARCA_AKTARMA_BASLIKLARI, parcaDisaAktarmaSatiri(b, setKatalogu([b, s]), kat()), satir];
    expect(parcaSatirlariniCoz(rows, [b, s], 1000, "2026-11-05", [P304, C8620]).errors).toEqual([]);
    // Farklı rakamda neden yine yazılır.
    const farkli = [PARCA_AKTARMA_BASLIKLARI, [...satir.slice(0, 9), 1, ...satir.slice(10)]];
    expect(parcaSatirlariniCoz(farkli, [b, s], 1000, "2026-11-05", [P304, C8620]).errors).toHaveLength(1);
  });
  it("Bulgu 6 (Karar 45): malzeme satırı kaldırılınca geçmişe malzeme maliyeti yazılır; eski tarihli sorgu onu verir", () => {
    const eski = { id: 10, ad: "Mil", malzemeSatiri: MIL, maliyet: 10 };
    const yeni = { id: 10, ad: "Mil", maliyet: 10 };
    const k = gecmisliKayit(yeni, eski, { tarih: "2026-11-05", bugun: "2026-11-05", malzemeKat: kat() });
    expect(k.maliyetGecmisi).toEqual([{ gecerli: "", kurus: oz(MIL).maliyetK }, { gecerli: "2026-11-05", kurus: 1000 }]);
    expect(parcaMaliyetKurus(k, "2026-01-01")).toBe(oz(MIL).maliyetK);
    expect(parcaMaliyetKurus(k)).toBe(1000);
    // Liste verilmezse eski değer bilinmez, kayıt yazılmaz (bilinen sınır).
    expect(gecmisliKayit(yeni, eski, { tarih: "2026-11-05", bugun: "2026-11-05" })).not.toHaveProperty("maliyetGecmisi");
  });
  it("Bulgu 7: boruda et kalınlığı çapın yarısından küçük olmalı", () => {
    expect(M.malzemeSatiriDogrula({ malzemeId: 1, bicim: "boru", cap: "20", et: "15", boy: "100" }).hatalar.et).toBe(M.ET_HATASI);
    expect(M.malzemeSatiriDogrula({ malzemeId: 1, bicim: "boru", cap: "20", et: "10", boy: "100" }).hatalar.et).toBe(M.ET_HATASI);
    expect(M.malzemeSatiriDogrula({ malzemeId: 1, bicim: "boru", cap: "20", et: "9,9", boy: "100" }).gecerli).toBe(true);
  });
});
